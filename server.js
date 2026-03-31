import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Fix __dirname (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Serve frontend folder
app.use(express.static(path.join(__dirname, "frontend")));

// ✅ When opening root → show index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
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
  "-headers", "User-Agent: Mozilla/5.0\r\n",
  "-headers", "Referer: https://google.com\r\n",
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
