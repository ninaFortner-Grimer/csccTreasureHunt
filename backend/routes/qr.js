const express = require('express');
const store = require('../db/store');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/scan', auth, (req, res) => {
  const player = req.player;

  if (player.state === 'finished' || player.currentRoundIndex >= 5) {
    return res.json({ success: true, score: player.score, finished: true, state: 'finished' });
  }

  if (player.state !== 'waiting_scan') {
    return res.status(400).json({ error: 'You must answer the current question correctly before scanning a checkpoint.' });
  }

  let code = (req.body.code || '').toString().trim();
  let secret = (req.body.secret || '').toString().trim();
  const payload = (req.body.payload || '').toString().trim();

  // Handle CSCC:<id>:<secret> payload format from camera scanner
  if (payload) {
    const parts = payload.split(':');
    if (parts.length === 3 && parts[0] === 'CSCC') {
      code = parts[1];
      secret = parts[2];
    } else {
      return res.status(400).json({ error: 'Invalid QR payload format. Expected format CSCC:ID:SECRET' });
    }
  }

  if (!code || !secret) {
    return res.status(400).json({ error: 'Missing checkpoint code or secret' });
  }

  const expectedCpId = player.assignedCheckpointIds[player.currentRoundIndex];
  if (code !== expectedCpId) {
    return res.status(400).json({ error: `Wrong checkpoint! You need to scan ${expectedCpId}.` });
  }

  const qr = store.getQrById(code);
  if (!qr || qr.secret !== secret) {
    return res.status(400).json({ error: 'Invalid QR code secret' });
  }

  if (player.scannedQrs.includes(code)) {
    return res.status(409).json({ error: 'You have already scanned this checkpoint.' });
  }

  player.scannedQrs.push(code);
  player.score += 1;
  player.currentRoundIndex += 1;

  const finished = (player.currentRoundIndex >= 5 || player.scannedQrs.length >= 5);
  if (finished) {
    player.state = 'finished';
    player.finishedAt = Date.now();
  } else {
    player.state = 'waiting_answer';
  }

  store.save();

  return res.json({
    success: true,
    score: player.score,
    finished,
    state: player.state,
    scannedCheckpoint: code,
  });
});

module.exports = router;