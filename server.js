import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (req, res) => {
  res.send("MKV Streaming Server Running");
});

// 🎬 STREAM ENDPOINT
app.get("/stream", (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing URL");
  }

  console.log("Streaming:", url);

  res.writeHead(200, {
    "Content-Type": "video/mp4",
    "Transfer-Encoding": "chunked"
  });

  const ffmpeg = spawn("ffmpeg", [
    "-i", url,
    "-vcodec", "libx264",
    "-preset", "veryfast",
    "-crf", "28",
    "-acodec", "aac",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov",
    "pipe:1"
  ]);

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on("data", (data) => {
    console.log(data.toString());
  });

  ffmpeg.on("close", () => {
    console.log("Stream ended");
    res.end();
  });

  ffmpeg.on("error", (err) => {
    console.error(err);
    res.status(500).send("FFmpeg error");
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
