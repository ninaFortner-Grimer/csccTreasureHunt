const express = require('express');
const store = require('../db/store');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const player = req.player;

  if (player.state === 'finished' || player.currentRoundIndex >= 5) {
    player.state = 'finished';
    if (!player.finishedAt) player.finishedAt = Date.now();
    store.save();
    return res.json({ finished: true, score: player.score, total: 5 });
  }

  const currentCpId = player.assignedCheckpointIds[player.currentRoundIndex];
  const cp = store.getQrById(currentCpId);

  if (player.state === 'waiting_scan') {
    return res.json({
      state: 'waiting_scan',
      clue: cp ? cp.clue : 'Find your assigned checkpoint.',
      checkpoint: cp ? { id: cp.id, clue: cp.clue } : null,
      score: player.score,
      round: player.currentRoundIndex + 1,
      totalRounds: 5,
    });
  }

  const questionId = player.assignedQuestionIds[player.currentRoundIndex];
  const q = store.getQuestionById(questionId);

  if (!q) {
    return res.status(500).json({ error: 'Assigned question not found' });
  }

  const shuffledChoices = store.shuffle(q.choices);

  return res.json({
    state: 'waiting_answer',
    questionId: q.id,
    question: q.text,
    text: q.text,
    choices: shuffledChoices,
    options: shuffledChoices,
    answer: q.answer, // Note: answer included for dev/test verification if needed or omit for prod security
    category: q.category,
    score: player.score,
    round: player.currentRoundIndex + 1,
    totalRounds: 5,
    checkpoint: cp ? { id: cp.id, clue: cp.clue } : null,
  });
});

router.post('/answer', auth, (req, res) => {
  const player = req.player;

  if (player.state === 'finished' || player.currentRoundIndex >= 5) {
    return res.json({ finished: true, score: player.score });
  }

  if (player.state !== 'waiting_answer') {
    return res.status(400).json({ error: 'Not currently waiting for an answer' });
  }

  const rawAnswer = (req.body.answer || '').toString().trim();
  if (!rawAnswer) {
    return res.status(400).json({ error: 'Answer is required' });
  }

  const questionId = player.assignedQuestionIds[player.currentRoundIndex];
  const q = store.getQuestionById(questionId);

  if (!q) {
    return res.status(500).json({ error: 'Question data missing' });
  }

  const isCorrect = (rawAnswer === q.answer.trim());

  if (isCorrect) {
    player.state = 'waiting_scan';
    store.save();

    const currentCpId = player.assignedCheckpointIds[player.currentRoundIndex];
    const cp = store.getQrById(currentCpId);

    return res.json({
      correct: true,
      state: 'waiting_scan',
      clue: cp ? cp.clue : 'Find your assigned checkpoint.',
      checkpoint: cp ? { id: cp.id, clue: cp.clue } : null,
    });
  }

  // Incorrect answer — keep player in 'waiting_answer' state to retry
  return res.json({
    correct: false,
    message: 'Incorrect answer. Try again!',
    state: 'waiting_answer',
  });
});

module.exports = router;