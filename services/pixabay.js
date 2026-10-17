const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'into', 'over', 'near', 'close', 'view', 'shot']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastCall = 0;
async function getJson(url) {
  // Pixabay allows about 100 requests per minute, so calls are spaced out.
  const wait = lastCall + 650 - Date.now();
  if (wait > 0) await sleep(wait);
  for (let attempt = 0; attempt < 2; attempt++) {
    lastCall = Date.now();
    const res = await fetch(url);
    if (res.status === 429 && attempt === 0) { await sleep(15000); continue; }
    if (!res.ok) throw new Error(`Pixabay error ${res.status}`);
    return res.json();
  }
  throw new Error('Pixabay is busy, please try again in a minute.');
}

const tokens = (q) => q.toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 3 && !STOP.has(t));

// How well a result's tags match what we searched for.
function relevance(tagString, query) {
  const tags = (tagString || '').toLowerCase().split(',').map((t) => t.trim());
  const joined = tags.join(' ');
  let score = 0;
  if (tags.includes(query.toLowerCase())) score += 3;
  tokens(query).forEach((t) => { if (joined.includes(t)) score += 2; });
  return score;
}

function bestOf(hits, query, used, prefix) {
  const scored = hits
    .filter((h) => !used.has(prefix + h.id))
    .map((h) => ({ h, score: relevance(h.tags, query) }))
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  const top = scored.filter((s) => s.score === scored[0].score).slice(0, 3);
  return top[Math.floor(Math.random() * top.length)];
}

function videoUrl(hit, quality) {
  const order = quality >= 1080 ? ['large', 'medium', 'small'] : ['medium', 'large', 'small'];
  for (const k of order) {
    const v = hit.videos && hit.videos[k];
    if (v && v.url) return v.url;
  }
  return null;
}

async function searchVideo(q, type) {
  const url = 'https://pixabay.com/api/videos/?' + new URLSearchParams({
    key: process.env.PIXABAY_API_KEY, q: q.slice(0, 100), video_type: type,
    min_width: '1280', per_page: '20', safesearch: 'true',
  });
  return (await getJson(url)).hits || [];
}

async function searchImage(q, type, orientation) {
  const url = 'https://pixabay.com/api/?' + new URLSearchParams({
    key: process.env.PIXABAY_API_KEY, q: q.slice(0, 100), image_type: type, orientation,
    min_width: orientation === 'vertical' ? '720' : '1280', per_page: '20', safesearch: 'true',
  });
  return (await getJson(url)).hits || [];
}

// Finds the best footage for one shot. Returns { kind, url, thumb, tags, score } or null.
async function findMedia(keywords, { used, style = 'film', quality = 720, photos = true, orientation = 'horizontal' }) {
  const kws = keywords.slice(0, 3);
  const videoTypes = style === 'animation' ? ['animation', 'all'] : ['all'];
  let best = null;

  for (const q of kws) {
    for (const type of videoTypes) {
      const hits = (await searchVideo(q, type)).filter((h) => videoUrl(h, quality));
      const pick = bestOf(hits, q, used, 'v');
      if (pick && (!best || pick.score > best.score)) {
        best = {
          kind: 'video', id: 'v' + pick.h.id, url: videoUrl(pick.h, quality), score: pick.score, tags: pick.h.tags,
          thumb: pick.h.picture_id ? `https://i.vimeocdn.com/video/${pick.h.picture_id}_640x360.jpg` : null,
        };
      }
    }
    if (best && best.score >= 4) break;
  }

  if ((!best || best.score < 2) && photos) {
    const imgTypes = style === 'animation' ? ['illustration', 'photo'] : ['photo'];
    let bestImg = null;
    for (const q of kws) {
      for (const type of imgTypes) {
        const pick = bestOf(await searchImage(q, type, orientation), q, used, 'i');
        if (pick && (!bestImg || pick.score > bestImg.score)) {
          bestImg = {
            kind: 'image', id: 'i' + pick.h.id, url: pick.h.largeImageURL || pick.h.webformatURL, score: pick.score,
            tags: pick.h.tags, thumb: pick.h.webformatURL,
          };
        }
      }
      if (bestImg && bestImg.score >= 4) break;
    }
    if (bestImg && (!best || bestImg.score > best.score)) best = bestImg;
  }

  if (best) used.add(best.id);
  return best;
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
}

module.exports = { findMedia, downloadFile, relevance };
