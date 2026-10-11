const express = require('express');
const crypto = require('crypto');
const store = require('../db/store');

const router = express.Router();

// No default password: organizer login is disabled until ORGANIZER_PASSWORD is set
const ORGANIZER_PASSWORD = process.env.ORGANIZER_PASSWORD || '';
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

  if (!ORGANIZER_PASSWORD) {
    return res.status(503).json({ error: 'Organizer login is not configured on the server.' });
  }

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

  const playerDetails = players
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score || 0,
      state: p.state,
      isFinished: p.state === 'finished',
      currentRoundIndex: p.currentRoundIndex || 0,
      scannedQrsCount: (p.scannedQrs || []).length,
      startedAt: p.startedAt,
      finishedAt: p.finishedAt,
    }))
    // Same ranking as the public leaderboard
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.isFinished !== b.isFinished) return a.isFinished ? -1 : 1;
      if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
      return a.startedAt - b.startedAt;
    });

  res.json({
    totalPlayers,
    finishedPlayers,
    playingPlayers,
    players: playerDetails,
  });
});

module.exports = router;
