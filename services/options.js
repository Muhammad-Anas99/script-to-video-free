// Validates and normalises every setting that comes from the browser.

const VOICE_RE = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/;
const FONTS = ['Arial', 'Impact', 'Verdana', 'Georgia', 'Trebuchet MS', 'Tahoma', 'Segoe UI', 'Courier New'];
const LOOKS = ['natural', 'warm', 'cool', 'cinematic', 'mono'];

const hex = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v.toUpperCase() : d);
const pick = (v, list, d) => (list.includes(v) ? v : d);
const num = (v, min, max, d) => {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
};

function sanitizeOptions(b = {}) {
  const c = b.captions || {};
  const w = b.watermark || {};
  const i = b.intro || {};
  const o = b.outro || {};
  const m = b.music || {};
  return {
    voice: VOICE_RE.test(b.voice || '') ? b.voice : '',
    characterVoice: VOICE_RE.test(b.characterVoice || '') ? b.characterVoice : '',
    rate: num(b.rate, -25, 35, 0),
    format: pick(b.format, ['landscape', 'portrait'], 'landscape'),
    quality: pick(Number(b.quality), [720, 1080], 720),
    source: pick(b.source, ['mixed', 'video'], 'mixed'),
    cut: pick(Number(b.cut), [3, 5, 8], 5),
    look: pick(b.look, LOOKS, 'natural'),
    transition: pick(b.transition, ['none', 'fade'], 'fade'),
    captions: {
      on: !!c.on,
      position: pick(c.position, ['top', 'middle', 'bottom'], 'bottom'),
      size: pick(c.size, ['s', 'm', 'l'], 'm'),
      font: pick(c.font, FONTS, 'Arial'),
      color: hex(c.color, '#FFFFFF'),
      outline: hex(c.outline, '#000000'),
      box: !!c.box,
      words: pick(Number(c.words), [2, 4, 8], 4),
      anim: pick(c.anim, ['none', 'fade', 'pop'], 'none'),
      upper: !!c.upper,
    },
    watermark: {
      type: pick(w.type, ['none', 'text', 'image'], 'none'),
      text: String(w.text || '').slice(0, 60),
      position: pick(w.position, ['tl', 'tr', 'bl', 'br', 'center'], 'br'),
      size: num(w.size, 5, 40, 15),
      opacity: num(w.opacity, 20, 100, 70),
    },
    intro: { title: String(i.title || '').slice(0, 80), subtitle: String(i.subtitle || '').slice(0, 100) },
    outro: { text: String(o.text || '').slice(0, 100) },
    music: { on: !!m.on, volume: num(m.volume, 5, 60, 18) },
  };
}

// ---- scenes edited in the browser ----
const cleanMedia = (m) => {
  if (!m || typeof m !== 'object') return null;
  try {
    const u = new URL(String(m.url));
    if (u.protocol !== 'https:' || !(u.hostname === 'pixabay.com' || u.hostname.endsWith('.pixabay.com'))) return null;
    const thumb = (() => { try { const t = new URL(String(m.thumb)); return t.protocol === 'https:' ? t.href : null; } catch (e) { return null; } })();
    return { kind: m.kind === 'image' ? 'image' : 'video', url: u.href, id: String(m.id || '').slice(0, 40), thumb };
  } catch (e) { return null; }
};

function sanitizePlan(p) {
  if (!p || !Array.isArray(p.scenes)) return null;
  const scenes = p.scenes.slice(0, 80).map((s) => ({
    text: String((s && s.text) || '').slice(0, 800).trim(),
    speaker: s && s.speaker === 'character' ? 'character' : 'narrator',
    visual: String((s && s.visual) || '').slice(0, 240).trim(),
    keywords: (Array.isArray(s && s.keywords) ? s.keywords : []).map((k) => String(k).trim().slice(0, 60)).filter(Boolean).slice(0, 4),
    media: cleanMedia(s && s.media),
  })).filter((s) => s.text || s.visual || s.media);
  if (!scenes.length) return null;
  scenes.forEach((s) => {
    if (!s.keywords.length) s.keywords = [s.visual || s.text.split(/\s+/).slice(0, 3).join(' ') || 'nature'];
  });
  return { style: p.style === 'animation' ? 'animation' : 'film', scenes };
}

const TONES = ['informative', 'friendly', 'dramatic', 'funny', 'motivational'];
const LANGUAGES = ['English', 'Urdu', 'Hindi', 'Arabic', 'Spanish', 'French', 'German', 'Portuguese', 'Turkish'];

module.exports = { sanitizeOptions, sanitizePlan, VOICE_RE, FONTS, LOOKS, TONES, LANGUAGES };
