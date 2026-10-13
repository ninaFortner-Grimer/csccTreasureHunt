const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const dataDir = path.join(__dirname, '..', 'data');

// Players are stored in PostgreSQL (Neon) when DATABASE_URL is set,
// otherwise in data/players.json (local development without a database).
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Writes run one after another so a player's updates are saved in order
let writeQueue = Promise.resolve();

let questions = [];
let qrCodes = [];
let players = [];

async function load() {
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

  // QR secrets come from the QR_SECRETS environment variable, never from the repo
  // Format: QR-01=SECRET1,QR-02=SECRET2,...
  const secrets = parseQrSecrets(process.env.QR_SECRETS);
  qrCodes = qrCodes.map((qr) => ({ ...qr, secret: secrets[qr.id] || '' }));
  const missing = qrCodes.filter((qr) => !qr.secret).map((qr) => qr.id);
  if (missing.length > 0) {
    console.error(`Missing QR secrets for: ${missing.join(', ')}. Set QR_SECRETS.`);
  }

  if (pool) {
    // Fail fast: without the database, players would be lost
    await pool.query(
      'CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, data JSONB NOT NULL)'
    );
    const result = await pool.query(
      "SELECT data FROM players ORDER BY (data->>'startedAt')::bigint"
    );
    players = result.rows.map((row) => row.data);
    console.log(`Loaded ${players.length} players from the database`);
    return;
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

function parseQrSecrets(value) {
  const secrets = {};
  (value || '').split(',').forEach((pair) => {
    const [id, secret] = pair.split('=').map((part) => (part || '').trim());
    if (id && secret) secrets[id] = secret;
  });
  return secrets;
}

// save(player) stores one player; save() with no argument stores all players
function save(player) {
  if (pool) {
    const toSave = player ? [player] : players;
    toSave.forEach((p) => {
      writeQueue = writeQueue
        .then(() => pool.query(
          'INSERT INTO players (id, data) VALUES ($1, $2) ' +
          'ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
          [p.id, p]
        ))
        .catch((e) => console.error('Error saving player to database:', e.message));
    });
    return;
  }

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

  // Each player visits all checkpoints in their own random order
  const checkpointIds = shuffle(qrCodes.map((qr) => qr.id));

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
  save(player);
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