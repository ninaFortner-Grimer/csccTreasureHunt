const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');

let questions = [];
let qrCodes = [];
let players = [];

function load() {
  questions = JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8'));
  qrCodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'qrcodes.json'), 'utf8'));

  const playersPath = path.join(dataDir, 'players.json');
  if (fs.existsSync(playersPath)) {
    players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
  } else {
    players = [];
    fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
  }
}

function save() {
  fs.writeFileSync(path.join(dataDir, 'players.json'), JSON.stringify(players, null, 2));
}

function getQuestions() {
  return questions;
}

function getQrCodes() {
  return qrCodes;
}

function getPlayerByToken(token) {
  return players.find((p) => p.token === token);
}

function createPlayer(name) {
  const player = {
    id: crypto.randomUUID(),
    name,
    token: crypto.randomUUID(),
    score: 0,
    state: 'waiting_answer',
    currentQuestionId: null,
    currentQrId: null,
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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