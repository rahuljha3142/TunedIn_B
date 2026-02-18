require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();

// ✅ ALLOW REQUESTS FROM ANYWHERE (Crucial for Vercel/Localhost split)
app.use(cors());
app.use(express.json());

// Note: We removed app.use(express.static...) because Frontend is separate now!

const MONGODB_URI = process.env.MONGODB_URI;
const TELEGRAM_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    pollTelegram();
  })
  .catch(err => console.error('❌ DB Error:', err));

const Song = mongoose.model('Song', {
  file_id: String,
  thumb_id: String,
  title: String,
  performer: String,
  duration: Number,
});

// --- API ROUTES ---

app.get('/api/songs', async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// Audio Proxy (Hides your Token)
app.get('/telegram/audio/:file_id', async (req, res) => {
  try {
    const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${req.params.file_id}`);
    const filePath = fileInfo.data.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
    
    // Pipe the stream directly to frontend
    const response = await axios({ method: 'get', url: downloadUrl, responseType: 'stream' });
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Audio error' });
  }
});

// Thumbnail Proxy
app.get('/telegram/thumbnail/:thumb_id', async (req, res) => {
  try {
    const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${req.params.thumb_id}`);
    const filePath = fileInfo.data.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
    
    const response = await axios({ method: 'get', url: downloadUrl, responseType: 'stream' });
    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Thumbnail error' });
  }
});

// --- POLLING ---
let offset = 0;
async function pollTelegram() {
  if (!TELEGRAM_TOKEN) return;
  try {
    const res = await axios.get(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=60`);
    const updates = res.data.result;
    for (const update of updates) {
      offset = update.update_id + 1;
      const audio = update?.message?.audio;
      if (audio) {
        const exists = await Song.findOne({ file_id: audio.file_id });
        if (!exists) {
          await new Song({
            file_id: audio.file_id,
            thumb_id: audio.thumb?.file_id || '',
            title: audio.title || 'Unknown Title',
            performer: audio.performer || 'Unknown Artist',
            duration: audio.duration,
          }).save();
          console.log(`🎵 Saved: ${audio.title}`);
        }
      }
    }
  } catch (err) { console.log("Polling error (ignore if offline):", err.message); }
  setTimeout(pollTelegram, 2000);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));