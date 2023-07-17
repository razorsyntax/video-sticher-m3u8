const express = require("express");
const { createFinalVideo } = require("../controllers/videoController.js");

const router = express.Router();

router.get("/createfinalvideo", createFinalVideo);

module.exports = router;
