const express = require('express');
const store = require('../db/store');
const auth = require('../middleware/auth');

const router = express.Router();

// After a wrong answer the player must wait before getting a new question
const FREEZE_MS = 30 * 1000;

function freezeSecondsLeft(player) {
  const ms = (player.frozenUntil || 0) - Date.now();
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

router.get('/', auth, (req, res) => {
  const player = req.player;

  if (player.state === 'finished' || player.currentRoundIndex >= 5) {
    player.state = 'finished';
    if (!player.finishedAt) player.finishedAt = Date.now();
    store.save(player);
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

  // Frozen after a wrong answer: no question until the wait is over
  const waitSeconds = freezeSecondsLeft(player);
  if (waitSeconds > 0) {
    return res.json({
      state: 'frozen',
      waitSeconds,
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

  const waitSeconds = freezeSecondsLeft(player);
  if (waitSeconds > 0) {
    return res.status(429).json({ error: `Please wait ${waitSeconds} seconds.`, waitSeconds });
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
    store.save(player);

    const currentCpId = player.assignedCheckpointIds[player.currentRoundIndex];
    const cp = store.getQrById(currentCpId);

    return res.json({
      correct: true,
      state: 'waiting_scan',
      clue: cp ? cp.clue : 'Find your assigned checkpoint.',
      checkpoint: cp ? { id: cp.id, clue: cp.clue } : null,
    });
  }

  // Incorrect answer — lose 1 point (never below 0) and wait before the next question
  player.score = Math.max(0, player.score - 1);
  player.frozenUntil = Date.now() + FREEZE_MS;

  // ...and swap in a different random question for this round
  const usedIds = player.usedQuestionIds || [];
  usedIds.push(questionId);
  player.usedQuestionIds = usedIds;

  const excluded = new Set([...player.assignedQuestionIds, ...usedIds]);
  let candidates = store.getQuestions().filter((item) => !excluded.has(item.id));
  if (candidates.length === 0) {
    // Question bank exhausted: allow repeats, but never the same question twice in a row
    candidates = store.getQuestions().filter((item) => item.id !== questionId);
  }
  if (candidates.length > 0) {
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    player.assignedQuestionIds[player.currentRoundIndex] = next.id;
  }
  store.save(player);

  return res.json({
    correct: false,
    message: 'Incorrect answer. Here is a new question!',
    state: 'waiting_answer',
    score: player.score,
    waitSeconds: FREEZE_MS / 1000,
  });
});

module.exports = router;