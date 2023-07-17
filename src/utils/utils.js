const { exec, spawn } = require("child_process");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const url = require("url");
const util = require("util");
const header = require("../../header.js");

const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);

const deleteFilesInFolder = async (folderPath) => {
  const files = await readdir(folderPath);

  const unlinkPromises = files.map((filename) =>
    unlink(path.join(folderPath, filename))
  );
  return Promise.all(unlinkPromises);
};

async function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running command: ${error.message}`);
        reject(error);
      } else {
        console.log(`Command executed successfully: ${command}`);
        resolve(stdout);
      }
    });
  });
}

function execPromiseBatches(command) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");
    const child = spawn(cmd, args, { shell: true });

    child.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    child.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error("Command exited with an error code"));
      }
      resolve();
    });
  });
}

async function downloadFile(urlToDownload, index, maxRetries = 6) {
  console.log(urlToDownload);
  try {
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Request timeout after 10 seconds"));
      }, 10000); // start a 10 seconds timeout

      axios
        .get(urlToDownload, {
          responseType: "stream",
          headers: header
        })
        .then((response) => {
          clearTimeout(timeout); // clear the timeout when the response is received
          resolve(response);
        })
        .catch(reject); // pass the error to the outer Promise if the request fails
    });

    const urlPath = url.parse(urlToDownload).pathname;
    const fileExt = path.extname(urlPath);
    const fileName = `${index + 1}${fileExt}`; // array indices are 0-based, so we add 1

    const downloadPath = path.join(
      __dirname,
      "..",
      "..",
      "video_shards",
      fileName
    );

    // Check if the response is a stream
    if (response.data && typeof response.data.pipe === "function") {
      const writer = fs.createWriteStream(downloadPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          console.log(`File ${index + 1} written successfully.`);
        });
        writer.on("error", reject);
        response.data.on("close", resolve);
      });
    } else {
      console.error(`The server response is not a stream.`, response.data);
      throw new Error("Server response is not a stream.");
    }
  } catch (error) {
    console.error(`Failed to download file from ${urlToDownload}`, error);
    if (maxRetries > 0) {
      console.log(`Retry download: ${maxRetries - 1} retries left`);
      return downloadFile(urlToDownload, index, maxRetries - 1); // keep the same index
    } else {
      throw error;
    }
  }
}

module.exports = {
  execPromise,
  execPromiseBatches,
  downloadFile,
  deleteFilesInFolder
};
