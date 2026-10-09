const express = require('express');
const store = require('../db/store');

const router = express.Router();

router.get('/', (req, res) => {
  const sorted = [...store.getAllPlayers()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = a.finishedAt ?? Infinity;
    const bTime = b.finishedAt ?? Infinity;
    return aTime - bTime;
  });

  const leaderboard = sorted.slice(0, 20).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    score: p.score,
    finished: p.state === 'finished',
  }));

  res.json(leaderboard);
});

module.exports = router;