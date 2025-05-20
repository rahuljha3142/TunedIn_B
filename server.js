const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

// Replace with your actual values
const MONGODB_URI = 'mongodb+srv://rahulraaz3142:0Mathematics@cluster0.ibmzkvo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const TELEGRAM_TOKEN = '7816824188:AAFK-L3H4dn0wqdS4d4BjP0nxxrMlgIko4E';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    pollTelegram(); // Start polling only after DB is connected
  })
  .catch(err => console.error('❌ MongoDB connection failed:', err));

// Mongoose model
const Song = mongoose.model('Song', {
  file_id: String,
  thumb_id: String,
  title: String,
  performer: String,
  duration: Number,
});

// API to fetch songs
app.get('/api/songs', async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// Get streamable audio
app.get('/telegram/audio/:file_id', async (req, res) => {
  const { file_id } = req.params;
  try {
    const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${file_id}`);
    const filePath = fileInfo.data.result.file_path;
    res.redirect(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
});

// Get streamable thumbnail
app.get('/telegram/thumbnail/:thumb_id', async (req, res) => {
  const { thumb_id } = req.params;
  try {
    const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${thumb_id}`);
    const filePath = fileInfo.data.result.file_path;
    res.redirect(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch thumbnail' });
  }
});

// Poll Telegram for new audio messages
let offset = 0;
async function pollTelegram() {
  try {
    const res = await axios.get(`${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=60`);
    const updates = res.data.result;

    for (const update of updates) {
      offset = update.update_id + 1;

      const audio = update?.message?.audio;
      if (audio) {
        const exists = await Song.findOne({ file_id: audio.file_id });
        if (!exists) {
          const newSong = new Song({
            file_id: audio.file_id,
            thumb_id: audio.thumb?.file_id || '',
            title: audio.title || 'Unknown Title',
            performer: audio.performer || 'Unknown Artist',
            duration: audio.duration,
          });
          await newSong.save();
          console.log(`🎵 Saved to DB: ${newSong.title}`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error polling Telegram:", err.message);
  }
  setTimeout(pollTelegram, 2000); // Poll every 2s
}

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
