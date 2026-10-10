const express = require('express');
const crypto = require('crypto');
const store = require('../db/store');

const router = express.Router();

const ORGANIZER_PASSWORD = process.env.ORGANIZER_PASSWORD || 'CSCC_WELCOME_2026_ADMIN';
const validTokens = new Set();

function authOrganizer(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const headerToken = req.headers['x-organizer-token'] || '';
  let token = headerToken;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing organizer token.' });
  }

  next();
}

router.post('/login', (req, res) => {
  const password = (req.body.password || '').toString();

  if (password !== ORGANIZER_PASSWORD) {
    return res.status(401).json({ error: 'Invalid organizer password.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  validTokens.add(token);

  res.json({ success: true, token });
});

router.get('/dashboard', authOrganizer, (req, res) => {
  const players = store.getAllPlayers();

  const totalPlayers = players.length;
  const finishedPlayers = players.filter((p) => p.state === 'finished').length;
  const playingPlayers = totalPlayers - finishedPlayers;

  const playerDetails = players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score || 0,
    state: p.state,
    currentRoundIndex: p.currentRoundIndex || 0,
    scannedQrsCount: (p.scannedQrs || []).length,
    startedAt: p.startedAt,
    finishedAt: p.finishedAt,
  }));

  res.json({
    totalPlayers,
    finishedPlayers,
    playingPlayers,
    players: playerDetails,
  });
});

module.exports = router;
