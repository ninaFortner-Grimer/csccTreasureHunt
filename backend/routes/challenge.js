const express = require('express');
const store = require('../db/store');
const auth = require('../middleware/auth');

const router = express.Router();


function questionResponse(player) {
  const q = store.getQuestionById(player.currentQuestionId);
  return {
    state: 'waiting_answer',
    questionId: q.id,
    text: q.text,
    choices: store.shuffle(q.choices),
  };
}

router.get('/', auth, (req, res) => {
  const player = req.player;


  if (player.state === 'finished') {
    return res.json({ finished: true, score: player.score });
  }


  if (player.state === 'waiting_scan') {
    const qr = store.getQrById(player.currentQrId);
    return res.json({ state: 'waiting_scan', clue: qr.clue });
  }


  if (player.currentQuestionId) {
    return res.json(questionResponse(player));
  }


  const availableQrs = store
    .getQrCodes()
    .filter((qr) => !player.scannedQrs.includes(qr.id));

  if (availableQrs.length === 0) {
    return res.status(500).json({ error: 'No QR codes available' });
  }

  const questions = store.getQuestions();
  const qr = availableQrs[Math.floor(Math.random() * availableQrs.length)];
  const question = questions[Math.floor(Math.random() * questions.length)];

  player.currentQuestionId = question.id;
  player.currentQrId = qr.id;
  store.save();

  res.json(questionResponse(player));
});

router.post('/answer', auth, (req, res) => {
  const player = req.player;


  if (player.state !== 'waiting_answer' || !player.currentQuestionId) {
    return res.status(400).json({ error: 'No active question' });
  }

  
  const answer = (req.body.answer || '').toString();
  if (!answer.trim()) {
    return res.status(400).json({ error: 'Answer is required' });
  }


  const question = store.getQuestionById(player.currentQuestionId);

  
  if (answer === question.answer) {

    player.state = 'waiting_scan';
    store.save();
    const qr = store.getQrById(player.currentQrId);
    return res.json({ correct: true, clue: qr.clue });
  }

  player.currentQuestionId = null;
  store.save();
  res.json({ correct: false });
});

module.exports = router;