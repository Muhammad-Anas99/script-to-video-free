// Builds caption cues, ASS subtitle files (burned into the video) and SRT files.

const pad2 = (n) => String(n).padStart(2, '0');

function assColor(hex, alpha = 0) {
  const r = hex.slice(1, 3), g = hex.slice(3, 5), b = hex.slice(5, 7);
  return `&H${pad2(alpha.toString(16).toUpperCase())}${b}${g}${r}`.toUpperCase();
}

function assTime(sec) {
  const cs = Math.round(Math.max(0, sec) * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${pad2(m)}:${pad2(s)}.${pad2(cs % 100)}`;
}

function srtTime(sec) {
  const ms = Math.round(Math.max(0, sec) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms % 1000).padStart(3, '0')}`;
}

function cleanText(t) {
  return String(t).replace(/[{}\\]/g, '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

// Splits spoken text into short caption cues timed across the speech.
function buildCues(text, speechSeconds, wordsPerCue = 4, startAt = 0.05) {
  const words = cleanText(text).split(' ').filter(Boolean);
  if (!words.length) return [];

  const chunks = [];
  let cur = [];
  words.forEach((w) => {
    cur.push(w);
    const sentenceEnd = /[.!?]["'”’)]*$/.test(w);
    const softBreak = /[,;:—–]$/.test(w) && cur.length >= Math.ceil(wordsPerCue / 2);
    if (cur.length >= wordsPerCue || sentenceEnd || softBreak) {
      chunks.push(cur.join(' '));
      cur = [];
    }
  });
  if (cur.length) chunks.push(cur.join(' '));

  const total = chunks.reduce((a, c) => a + c.length + 2, 0);
  const span = Math.max(speechSeconds - 0.1, 0.6);
  let t = startAt;
  return chunks.map((c) => {
    const d = ((c.length + 2) / total) * span;
    const cue = { start: t, end: t + d, text: c };
    t += d;
    return cue;
  });
}

const SIZE = { s: 0.05, m: 0.065, l: 0.085 };

function header(width, height) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
`;
}

const WM_ALIGN = { tl: 7, tr: 9, bl: 1, br: 3, center: 5 };

// Captions plus an optional text watermark for one scene.
function buildSceneAss({ width, height, cues, captions, watermark, duration }) {
  const minSide = Math.min(width, height);
  const portrait = height > width;
  const c = captions;
  const fs = Math.round(minSide * SIZE[c.size]);
  const align = { top: 8, middle: 5, bottom: 2 }[c.position];
  const marginV = c.position === 'middle' ? 0 : Math.round(height * (portrait && c.position === 'bottom' ? 0.16 : 0.07));
  const marginLR = Math.round(width * 0.07);

  const border = c.box ? 3 : 1;
  const outline = c.box ? Math.round(fs * 0.22) : Math.max(2, Math.round(fs * 0.08));
  const shadow = c.box ? 0 : 1;
  const outlineColour = c.box ? assColor(c.outline, 0x30) : assColor(c.outline, 0);

  let out = header(width, height);
  out += `Style: Cap,${c.font},${fs},${assColor(c.color)},&H000000FF,${outlineColour},&H80000000,-1,0,0,0,100,100,0,0,${border},${outline},${shadow},${align},${marginLR},${marginLR},${marginV},1\n`;

  const useWm = watermark && watermark.type === 'text' && watermark.text;
  const wmSize = Math.max(14, Math.round(minSide * (watermark ? watermark.size : 10) / 100 * 0.55));
  const wmAlpha = Math.round(255 * (1 - (watermark ? watermark.opacity : 70) / 100));
  const wmMargin = Math.round(minSide * 0.03);
  out += `Style: WM,${c.font},${wmSize},${assColor('#FFFFFF', wmAlpha)},&H000000FF,${assColor('#000000', Math.min(255, wmAlpha + 40))},&H00000000,-1,0,0,0,100,100,0,0,1,2,0,${useWm ? WM_ALIGN[watermark.position] : 3},${wmMargin},${wmMargin},${wmMargin},1\n`;

  out += `\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

  const anim = { none: '', fade: '{\\fad(120,120)}', pop: '{\\fscx82\\fscy82\\t(0,140,\\fscx100\\fscy100)}' }[c.anim];
  (cues || []).forEach((cue) => {
    const txt = c.upper ? cue.text.toUpperCase() : cue.text;
    out += `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Cap,,0,0,0,,${anim}${txt}\n`;
  });
  if (useWm) {
    out += `Dialogue: 1,${assTime(0)},${assTime(duration + 1)},WM,,0,0,0,,${cleanText(watermark.text)}\n`;
  }
  return out;
}

// Title / outro card.
function buildCardAss({ width, height, title, subtitle, font = 'Arial', duration }) {
  const minSide = Math.min(width, height);
  const big = Math.round(minSide * 0.085);
  const small = Math.round(minSide * 0.042);
  const lr = Math.round(width * 0.1);
  let out = header(width, height);
  out += `Style: Title,${font},${big},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,0,5,${lr},${lr},0,1\n`;
  out += `Style: Sub,${font},${small},&H00D6D9F2,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,5,${lr},${lr},0,1\n`;
  out += `\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const cx = Math.round(width / 2);
  const end = assTime(duration + 1);
  if (subtitle) {
    out += `Dialogue: 0,${assTime(0)},${end},Title,,0,0,0,,{\\an5\\pos(${cx},${Math.round(height * 0.46)})\\fad(350,350)}${cleanText(title)}\n`;
    out += `Dialogue: 0,${assTime(0)},${end},Sub,,0,0,0,,{\\an5\\pos(${cx},${Math.round(height * 0.58)})\\fad(500,350)}${cleanText(subtitle)}\n`;
  } else {
    out += `Dialogue: 0,${assTime(0)},${end},Title,,0,0,0,,{\\an5\\pos(${cx},${Math.round(height * 0.5)})\\fad(350,350)}${cleanText(title)}\n`;
  }
  return out;
}

function toSrt(cues) {
  return cues
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${cleanText(c.text)}\n`)
    .join('\n');
}

module.exports = { buildCues, buildSceneAss, buildCardAss, toSrt };
