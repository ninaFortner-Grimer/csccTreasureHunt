require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

const store = require('./db/store');
store.load();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json());

const auth = require('./middleware/auth');



app.use('/api/player', require('./routes/player'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/challenge', require('./routes/challenge'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});