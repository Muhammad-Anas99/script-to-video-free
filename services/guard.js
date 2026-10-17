// Protection for a public website: optional password and simple usage limits.

const crypto = require('crypto');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

// If APP_PASSWORD is set, the whole site asks for it (the user name can be anything).
function basicAuth(password) {
  if (!password) return (req, res, next) => next();
  const expected = sha(password);
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    if (header.startsWith('Basic ')) {
      const decoded = Buffer.from(header.slice(6), 'base64').toString();
      const given = decoded.slice(decoded.indexOf(':') + 1);
      if (crypto.timingSafeEqual(sha(given), expected)) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="ScriptReel", charset="UTF-8"');
    res.status(401).send('Password required');
  };
}

// At most `max` requests per visitor in each time window. max = 0 turns it off.
function createLimiter({ max, windowMs = 60 * 60 * 1000, message }) {
  if (!max) return (req, res, next) => next();
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    hits.forEach((v, k) => { if (v.reset <= now) hits.delete(k); });
  }, windowMs).unref();
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset <= now) { h = { count: 0, reset: now + windowMs }; hits.set(key, h); }
    h.count += 1;
    if (h.count > max) {
      const mins = Math.max(1, Math.ceil((h.reset - now) / 60000));
      return res.status(429).json({ error: `${message || 'You have reached the limit.'} Please try again in about ${mins} minute${mins === 1 ? '' : 's'}.` });
    }
    next();
  };
}

module.exports = { basicAuth, createLimiter };
