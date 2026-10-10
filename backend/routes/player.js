const express = require('express');
const store = require('../db/store');
const auth = require('../middleware/auth');

const router = express.Router();

// Allowed nickname: 2-30 chars, alphanumeric + spaces/hyphens/underscores/apostrophes
const NICKNAME_REGEX = /^[A-Za-z0-9 \-_'.]{2,30}$/;

router.post('/', (req, res) => {
  const rawName = (req.body.name || '').toString();
  const name = rawName.trim();

  if (!name || !NICKNAME_REGEX.test(name)) {
    return res.status(400).json({
      error: 'Nickname must be 2–30 characters long and contain only letters, numbers, spaces, hyphens, or underscores.'
    });
  }

  const player = store.createPlayer(name);

  const currentCpId = player.assignedCheckpointIds[player.currentRoundIndex];
  const cp = store.getQrById(currentCpId);

  res.status(201).json({
    token: player.token,
    name: player.name,
    player: {
      id: player.id,
      name: player.name,
      state: player.state,
      score: player.score,
      currentRoundIndex: player.currentRoundIndex,
      totalRounds: 5,
      checkpoint: cp ? { id: cp.id, clue: cp.clue } : null,
    }
  });
});

router.get('/me', auth, (req, res) => {
  const player = req.player;
  const currentCpId = player.assignedCheckpointIds[player.currentRoundIndex];
  const cp = store.getQrById(currentCpId);

  res.json({
    id: player.id,
    name: player.name,
    state: player.state,
    score: player.score,
    currentRoundIndex: player.currentRoundIndex,
    totalRounds: 5,
    assignedCheckpointId: currentCpId,
    checkpoint: cp ? { id: cp.id, clue: cp.clue } : null,
    finishedAt: player.finishedAt,
    startedAt: player.startedAt,
  });
});

module.exports = router;
