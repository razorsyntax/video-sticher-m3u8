const fs = require("fs");
const path = require("path");
const readline = require("readline");
const {
  execPromise,
  execPromiseBatches,
  downloadFile,
  deleteFilesInFolder
} = require("../utils/utils.js");

async function readAndFilterLinks() {
  const fileStream = fs.createReadStream("file.m3u8");
  const links = [];

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  rl.on("line", (line) => {
    if (!line.startsWith("#")) {
      links.push(`${line}`);
    }
  });

  return new Promise((resolve, reject) => {
    rl.on("close", () => {
      resolve(links);
    });
    rl.on("error", reject);
  });
}

async function downloadFiles(links) {
  for (let i = 0; i < links.length; i++) {
    try {
      await downloadFile(links[i], i);
      console.log(`File ${i + 1} downloaded successfully.`);
    } catch (error) {
      throw new Error(`Failed to download file ${i + 1}: ${error.message}`);
    }
  }
}

async function getVideoShards() {
  const folderPath = path.join(__dirname, "..", "..", "video_shards");

  const files = await fs.promises.readdir(folderPath);

  // Filter out only the .ts files
  const tsFiles = files.filter(
    (file) => path.extname(file).toLowerCase() === ".ts"
  );

  // Sort the .ts files in ascending order
  tsFiles.sort(
    (a, b) =>
      parseInt(path.basename(a, ".ts")) - parseInt(path.basename(b, ".ts"))
  );

  return { folderPath, tsFiles };
}

async function executeFFmpegCommands(tsFiles, folderPath) {
  const batchSize = 200;
  const numBatches = Math.ceil(tsFiles.length / batchSize);
  let promises = [];

  // Construct and execute the ffmpeg commands
  for (let i = 0; i < numBatches; i++) {
    const startIdx = i * batchSize;
    const endIdx = Math.min((i + 1) * batchSize, tsFiles.length);
    const batchFiles = tsFiles.slice(startIdx, endIdx);

    const outputFilePath = path.join(folderPath, `batch${i + 1}.mp4`);
    const command = `ffmpeg -i "concat:$(printf '%s|' ${batchFiles
      .map((file) => path.join(folderPath, file))
      .join(" ")})" -c copy "${outputFilePath}"`;

    promises.push(execPromise(command));
  }

  await Promise.all(promises);
}

async function assembleBatches(folderPath, video_name) {
  const files = await fs.promises.readdir(folderPath);

  // Filter out only the batch files
  const batchFiles = files.filter((file) => /^batch\d+\.mp4$/.test(file));

  if (batchFiles.length === 0) {
    throw new Error("No batch files found in the specified folder");
  }

  // Sort the batch files based on the number in their name
  batchFiles.sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)[0]);
    const numB = parseInt(b.match(/\d+/)[0]);
    return numA - numB;
  });

  // Construct the input options for the ffmpeg command
  const inputOptions = batchFiles
    .map((file) => `-i "${path.resolve(folderPath, file)}"`)
    .join(" ");

  // Construct the filter_complex option for the ffmpeg command
  const filterComplex = batchFiles
    .map((file, index) => `[${index}:v:0][${index}:a:0]`)
    .join("");

  // Construct the output file path for the final output
  const final_video_name = video_name.replace(/%20/g, " ");
  const outputFilePath = path.join(folderPath, `${final_video_name}.mp4`);

  // Check if the directory exists and is writable, not the file
  const outputDirectoryPath = path.dirname(outputFilePath);
  await fs.promises.access(outputDirectoryPath, fs.constants.W_OK);

  // Construct and execute the ffmpeg command
  const command = `ffmpeg ${inputOptions} -filter_complex "${filterComplex}concat=n=${batchFiles.length}:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" "${outputFilePath}"`;
  await execPromiseBatches(command);
}

async function createFinalVideo(req, res, next) {
  const video_name = req.query.video_name.replace(/ /g, "%20");

  // clear out previous files from the previous run
  await deleteFilesInFolder("./video_shards");

  // Check if "links.js" already exists
  if (fs.existsSync("links.js")) {
    // If it exists, delete it
    fs.unlinkSync("links.js");
  }

  try {
    const links = await readAndFilterLinks();

    const jsData = `const links = [ ${links.join(
      ", "
    )} ];\n\nmodule.exports = links;\n`;
    fs.writeFileSync("links.js", jsData);

    await downloadFiles(links);

    const { folderPath, tsFiles } = await getVideoShards();

    await executeFFmpegCommands(tsFiles, folderPath);

    await assembleBatches(folderPath, video_name);

    res.send("Created final video successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
}

module.exports = { createFinalVideo };
