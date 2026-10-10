
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const store = require('./db/store');

// Temporary setup for local testing.
// We'll restrict this to the deployed frontend before launch.
app.use(cors());
app.use(express.json());

// Load questions, QR checkpoints, and saved players.
store.load();

// Game API routes
app.use('/api/player', require('./routes/player'));
app.use('/api/challenge', require('./routes/challenge'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});