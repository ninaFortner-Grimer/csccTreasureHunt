const store = require('../db/store');

function auth(req, res, next) {
  const token = req.get('x-player-token');

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const player = store.getPlayerByToken(token);

  if (!player) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.player = player;
  next();
}

module.exports = auth;