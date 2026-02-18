# TunedIn - Backend API 🎵

The server-side engine for TunedIn. It polls Telegram for new audio files, stores metadata in MongoDB, and serves as a secure proxy for streaming media.

## 🚀 Features
- **Telegram Polling**: Automatically fetches new audio messages from a Telegram Bot every 2 seconds.
- **MongoDB Integration**: Stores song titles, artists, durations, and file IDs.
- **Secure Media Proxy**: Streams audio and thumbnails from Telegram servers without exposing your Bot Token to the frontend.
- **CORS Enabled**: Configured to allow cross-origin requests from your Vercel-hosted frontend.

## 🛠️ Tech Stack
- Node.js & Express
- MongoDB & Mongoose
- Axios (for Telegram API interaction)
- Dotenv (for environment variable management)

## 📋 Environment Variables
Create a `.env` file in the root of this folder:
```ini
MONGODB_URI=your_mongodb_connection_string
BOT_TOKEN=your_telegram_bot_token
PORT=5000