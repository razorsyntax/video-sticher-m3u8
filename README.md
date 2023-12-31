# Video Stitcher m3u8

A nodejs library for video stitching using an [*.m3u8](https://docs.fileformat.com/audio/m3u8/) file.

### Install

You'll need to have ffmpeg installed and accessible through the terminal.

`npm install` then...

### How to Use this Project

There's a file called `header.js` in the root of the directory. It's used for the REST api. Modify the file to suit your needs.

1) Copy the contents of your *.m3u8 file into the `file.m3u8` in the root of the directory.

2) Run the project with `node app.js`

3) Using Postman/Insomia/Thunder Client/etc hit this endpoint:

    `http://localhost:3000/api/createfinalvideo?video_name={{Name of your video}}`

It'll download all the video chunks to the `video_shards` folder in sequence and then stitch them together into a single *.mp4 video.

### How it works

When you hit the endoint, the server scrapes all the http urls in your *.m3u8 file, creates a `links.js` file which holds an array of the links and then and downloads them to the `video_shards` folder. Once all the links are downloaded it uses `ffmpeg` to create a single video file. At the moment, it stitches together video chunks of ~200 videos. Depending on how many filmes need to be downloaded, it'll create several intermediate batch videos before stitching those into the final video. The reason for this is that ffmpeg can crash if the number of videos is too large.

### Notes

As is, it stitches *.mp4 videos together. This project can be modified to do different formats as well as audio.