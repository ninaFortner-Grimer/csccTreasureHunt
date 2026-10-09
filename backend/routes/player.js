const express = require('express');
const store = require('../db/store');

const router = express.Router();

router.post('/', (req, res) => {
  const name = (req.body.name || '').toString().trim();

  if (name.length < 2 || name.length > 30) {
    return res.status(400).json({ error: 'Name must be between 2 and 30 characters' });
  }

  const player = store.createPlayer(name);

  res.status(201).json({ token: player.token, name: player.name });
});

module.exports = router;
