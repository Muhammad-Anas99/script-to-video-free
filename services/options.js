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

module.exports = { sanitizeOptions, VOICE_RE, FONTS, LOOKS };
