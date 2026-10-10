const express = require('express');
const store = require('../db/store');

const router = express.Router();

router.get('/', (req, res) => {
  const players = store.getAllPlayers();

  const leaderboard = players
    .map((p) => ({
      name: p.name,
      score: p.score || 0,
      state: p.state,
      startedAt: p.startedAt,
      finishedAt: p.finishedAt,
      isFinished: p.state === 'finished',
    }))
    .sort((a, b) => {
      // 1. Highest score first
      if (b.score !== a.score) return b.score - a.score;
      // 2. Finished players before unfinished players
      if (a.isFinished !== b.isFinished) return a.isFinished ? -1 : 1;
      // 3. Earliest completion time first
      if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
      // 4. Earliest start time first
      return a.startedAt - b.startedAt;
    });

  res.json(leaderboard);
});

module.exports = router;