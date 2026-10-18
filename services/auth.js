// Accounts: password hashing, signed session cookies, profile pictures and Google sign-in.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COOKIE = 'sr_session';
const SESSION_DAYS = 90;

// ---- passwords (scrypt is built into Node, so no extra package is needed) ----
const scrypt = (pw, salt, len, opts) => new Promise((resolve, reject) => {
  crypto.scrypt(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key)));
});
const N = 16384;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  try {
    const [alg, n, saltB64, keyB64] = String(stored || '').split('$');
    if (alg !== 'scrypt') return false;
    const key = Buffer.from(keyB64, 'base64');
    const test = await scrypt(password, Buffer.from(saltB64, 'base64'), key.length, { N: Number(n), r: 8, p: 1 });
    return test.length === key.length && crypto.timingSafeEqual(test, key);
  } catch (e) {
    return false;
  }
}

// ---- signed sessions ----
let secret = null;
function getSecret() {
  if (secret) return secret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    secret = process.env.SESSION_SECRET;
    return secret;
  }
  const dir = path.join(__dirname, '..', 'data');
  const file = path.join(dir, 'session-secret.txt');
  try {
    const saved = fs.readFileSync(file, 'utf8').trim();
    if (saved.length >= 32) { secret = saved; return secret; }
  } catch (e) { /* first run */ }
  secret = crypto.randomBytes(48).toString('hex');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
  } catch (e) { /* read-only disk: sessions then end on restart */ }
  return secret;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

function createToken(userId, days = SESSION_DAYS) {
  const payload = b64url(JSON.stringify({ u: String(userId), e: Date.now() + days * 86400000 }));
  return `${payload}.${sign(payload)}`;
}

function readToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const good = sign(payload);
  const a = Buffer.from(sig || '');
  const b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.u || !(data.e > Date.now())) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  String(header || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function isSecure(req) {
  return !!req.secure || (!!process.env.TRUST_PROXY && req.headers && req.headers['x-forwarded-proto'] === 'https');
}

function setSessionCookie(req, res, userId) {
  const parts = [`${COOKIE}=${createToken(userId)}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${SESSION_DAYS * 86400}`];
  if (isSecure(req)) parts.push('Secure');
  res.set('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.set('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

// ---- profile pictures ----
function cleanAvatar(v) {
  if (!v || typeof v !== 'string') return null;
  if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 120000) return v;
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' && (u.hostname === 'googleusercontent.com' || u.hostname.endsWith('.googleusercontent.com'))) return u.href;
  } catch (e) { /* not a link */ }
  return null;
}

// ---- Google sign-in ----
async function verifyGoogleToken(credential, clientId, fetchImpl = fetch) {
  if (!clientId) throw new Error('Google sign-in is not set up.');
  const res = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!res.ok) throw new Error('Google did not accept this sign-in.');
  const t = await res.json();
  const issuerOk = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
  const verified = t.email_verified === true || t.email_verified === 'true';
  if (t.aud !== clientId || !issuerOk || !verified || !(Number(t.exp) * 1000 > Date.now()) || !t.email || !t.sub) {
    throw new Error('Google did not accept this sign-in.');
  }
  return { sub: t.sub, email: String(t.email).toLowerCase(), name: t.name || String(t.email).split('@')[0], picture: t.picture || null };
}

module.exports = {
  COOKIE, hashPassword, verifyPassword, createToken, readToken, parseCookies,
  setSessionCookie, clearSessionCookie, cleanAvatar, verifyGoogleToken,
};
