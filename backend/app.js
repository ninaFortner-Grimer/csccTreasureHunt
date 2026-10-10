require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const store = require('./db/store');

// CORS — allow deployed frontend and local dev
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? [process.env.FRONTEND_ORIGIN, 'http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000']
  : true;

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-player-token', 'x-organizer-token'],
}));

app.use(express.json({ limit: '16kb' }));

// Rate limiting — general API rate limit
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please wait a moment.' },
});
app.use('/api/', limiter);

// Player creation rate limit
const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts, please wait.' },
});
app.use('/api/player', createLimiter);

// Load data store (questions, QR codes, players)
store.load();

// Game API routes
const playerRouter = require('./routes/player');
const challengeRouter = require('./routes/challenge');
const qrRouter = require('./routes/qr');
const leaderboardRouter = require('./routes/leaderboard');
const organizerRouter = require('./routes/organizer');

app.use('/api/player', playerRouter);
app.use('/api/challenge', challengeRouter);
app.use('/api/qr', qrRouter);
app.use('/api/checkpoint', qrRouter); // Alias for /api/checkpoint/scan
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/organizer', organizerRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler — never expose internal stack traces to client
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`CSCC Treasure Hunt backend running on port ${PORT}`);
});