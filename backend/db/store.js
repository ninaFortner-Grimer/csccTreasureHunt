const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');

let questions = [];
let qrCodes = [];
let players = [];

function load() {
  try {
    questions = JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8'));
  } catch (e) {
    console.error('Error loading questions.json:', e.message);
    questions = [];
  }
  try {
    qrCodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'qrcodes.json'), 'utf8'));
  } catch (e) {
    console.error('Error loading qrcodes.json:', e.message);
    qrCodes = [];
  }
  try {
    if (fs.existsSync(path.join(dataDir, 'players.json'))) {
      players = JSON.parse(fs.readFileSync(path.join(dataDir, 'players.json'), 'utf8'));
    } else {
      players = [];
    }
  } catch (e) {
    console.error('Error loading players.json:', e.message);
    players = [];
  }
}

function save() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dataDir, 'players.json'), JSON.stringify(players, null, 2));
  } catch (e) {
    console.error('Error saving players.json:', e.message);
  }
}

function getQuestions() {
  return questions;
}

function getQrCodes() {
  return qrCodes;
}

function getPlayerByToken(token) {
  if (!token) return null;
  return players.find((p) => p.token === token);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createPlayer(name) {
  // Select 5 distinct random questions from the question bank
  const shuffledQuestions = shuffle(questions);
  const selectedQuestions = shuffledQuestions.slice(0, 5).map((q) => q.id);

  const checkpointIds = qrCodes.map((qr) => qr.id);

  const player = {
    id: crypto.randomUUID(),
    name,
    token: crypto.randomUUID(),
    score: 0,
    state: 'waiting_answer',
    assignedQuestionIds: selectedQuestions,
    assignedCheckpointIds: checkpointIds,
    currentRoundIndex: 0,
    scannedQrs: [],
    startedAt: Date.now(),
    finishedAt: null,
  };

  players.push(player);
  save();
  return player;
}

function getQuestionById(id) {
  return questions.find((q) => q.id === id);
}

function getQrById(id) {
  return qrCodes.find((q) => q.id === id);
}

function getAllPlayers() {
  return players;
}

module.exports = {
  load,
  save,
  getQuestions,
  getQrCodes,
  getPlayerByToken,
  createPlayer,
  getQuestionById,
  getQrById,
  shuffle,
  getAllPlayers,
};