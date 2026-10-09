const express = require('express');
const store = require('../db/store');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/scan', auth, (req, res) => {
  const player = req.player;

 
  if (player.state !== 'waiting_scan') {
    return res.status(400).json({ error: 'Answer a question first' });
  }


  const code = (req.body.code || '').toString().trim();
  const secret = (req.body.secret || '').toString().trim();

  if (!code || !secret) {
    return res.status(400).json({ error: 'code and secret are required' });
  }


  const qr = store.getQrById(code);
  if (!qr || qr.secret !== secret) {
    return res.status(400).json({ error: 'Invalid QR' });
  }


  if (code !== player.currentQrId) {
    return res.status(400).json({ error: 'This is not your checkpoint' });
  }


  if (player.scannedQrs.includes(code)) {
    return res.status(409).json({ error: 'Already scanned' });
  }


  player.scannedQrs.push(code);
  player.score += 1;
  player.currentQuestionId = null;
  player.currentQrId = null;

  const finished = player.scannedQrs.length === store.getQrCodes().length;

  if (finished) {
    player.state = 'finished';
    player.finishedAt = Date.now();
  } else {
    player.state = 'waiting_answer';
  }

  store.save();

  res.json({ success: true, score: player.score, finished });
});

module.exports = router;