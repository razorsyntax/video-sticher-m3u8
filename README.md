# m3u8 Video Stitcher

Video Stitcher m3u8 is a Node.js project designed to simplify the process of downloading and stitching together video segments that are streamed using [*.m3u8](https://docs.fileformat.com/audio/m3u8/) manifest files. These manifest files, commonly used by many websites for video streaming, break down video content into smaller, manageable chunks for easier delivery. However, this segmentation can make it challenging to download and store these videos locally. This project addresses this challenge by providing a streamlined way to download these segmented videos and combine them into a single, continuous mp4 file.

### Install

Ensure ffmpeg is installed and can be accessed via the terminal.

Run `npm install`, then follow the usage instructions.

### How to Use this Project

Modify `header.js` in the project's root directory to configure the REST API.

1) Place your \*.m3u8 file content into `file.m3u8` in the root directory.

2) Start the application with `node app.js`.

3) Use a tool like Postman, Insomnia, or Thunder Client to send a request to:

    `http://localhost:3000/api/createfinalvideo?video_name={{Your Video Name}}`

The application will download the video segments to `video_shards` and then merge them into a single \*.mp4 file.

### How it Works

Upon receiving a request, the server extracts HTTP URLs from your \*.m3u8 file, generating a `links.js` file with these URLs. It then downloads the segments to `video_shards`. Utilizing ffmpeg, it combines about 200 video chunks at a time to avoid potential crashes due to large numbers of files, eventually resulting in your final video file.

### Notes

By default, the project stitches \*.mp4 videos. It can be modified for other formats and audio.
