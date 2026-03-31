import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Fix __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// 🎬 STREAM WITH yt-dlp + ffmpeg
app.get("/stream", (req, res) => {
  const url = req.query.url;

  if (!url) return res.status(400).send("Missing URL");

  console.log("Streaming:", url);

  res.writeHead(200, {
    "Content-Type": "video/mp4",
    "Transfer-Encoding": "chunked"
  });

  // 🔥 STEP 1: yt-dlp extracts stream
  const ytdlp = spawn("yt-dlp", [
    "-f", "bestvideo+bestaudio/best",
    "-o", "-",
    url
  ]);

  // 🔥 STEP 2: ffmpeg converts stream
  const ffmpeg = spawn("ffmpeg", [
    "-i", "pipe:0",
    "-vcodec", "libx264",
    "-preset", "veryfast",
    "-crf", "28",
    "-acodec", "aac",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov",
    "pipe:1"
  ]);

  // Pipe yt-dlp → ffmpeg
  ytdlp.stdout.pipe(ffmpeg.stdin);

  let started = false;

  ffmpeg.stdout.on("data", (chunk) => {
    started = true;
    res.write(chunk);
  });

  ffmpeg.stdout.on("end", () => res.end());

  ffmpeg.stderr.on("data", (data) => {
    console.log("ffmpeg:", data.toString());
  });

  ytdlp.stderr.on("data", (data) => {
    console.log("yt-dlp:", data.toString());
  });

  ffmpeg.on("close", (code) => {
    console.log("FFmpeg exited:", code);
    if (!started) {
      res.status(500).send("Stream failed");
    }
  });

  ytdlp.on("close", (code) => {
    console.log("yt-dlp exited:", code);
  });

  ffmpeg.on("error", (err) => {
    console.error(err);
    res.status(500).send("FFmpeg error");
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
