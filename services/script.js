// Cleans any pasted text and, when the AI is unavailable, splits it into scenes locally.

const STOP = new Set(('a an the and or but if then so of to in on at by for with from as is are was were be been being it its this that these those i you he she we they me him her us them my your his our their ' +
  'not no yes do does did done have has had will would can could should may might must just very really also too than there here what which who whom when where why how about into over under up down out off again more most some any all each every ' +
  'one two three said says say get got make made go going went come came take took see saw know knew want like need every always never every let lets thing things way ways much many few lot lots ' +
  'because while during before after between through only own same other such even still ever yet').split(' '));

const LABEL_SKIP = /^(visual|visuals|sfx|sound|music|keywords?|style|scene|title|cartoon title|characters?|setting|note|notes|camera|shot|cut|fade|transition|b-?roll|on[- ]?screen|text)$/i;

function cleanScript(raw) {
  return String(raw)
    .replace(/\r/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\[[^\]]*\]/g, '') // [sound effects], [cues]
    .replace(/^\s{0,3}#{1,6}\s*/gm, '') // markdown headings
    .replace(/^\s*>\s?/gm, '') // quotes
    .replace(/(\*\*|__|`)/g, '') // bold, code
    .replace(/^\s*[-*•–]\s+/gm, '') // bullets
    .replace(/^\s*\d{1,2}[.)]\s+/gm, '') // 1. 2)
    .replace(/^\s*\(?\d{1,2}:\d{2}(\s*[-–]\s*\d{1,2}:\d{2})?\)?\s*[:\-–]?\s*/gm, '') // timestamps
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Splits the script into groups of paragraphs of about maxWords words each.
function chunkScript(script, maxWords = 320) {
  const blocks = script.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const chunks = [];
  let cur = [];
  let count = 0;
  blocks.forEach((b) => {
    const n = b.split(/\s+/).length;
    if (count + n > maxWords && cur.length) {
      chunks.push(cur.join('\n\n'));
      cur = [];
      count = 0;
    }
    cur.push(b);
    count += n;
  });
  if (cur.length) chunks.push(cur.join('\n\n'));
  // a single huge paragraph: split by sentences
  return chunks.flatMap((c) => {
    if (c.split(/\s+/).length <= maxWords * 1.6) return [c];
    const sentences = c.split(/(?<=[.!?])\s+/);
    const out = [];
    let buf = [];
    let n = 0;
    sentences.forEach((s) => {
      const w = s.split(/\s+/).length;
      if (n + w > maxWords && buf.length) { out.push(buf.join(' ')); buf = []; n = 0; }
      buf.push(s);
      n += w;
    });
    if (buf.length) out.push(buf.join(' '));
    return out;
  });
}

function extractKeywords(text) {
  const words = text.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));
  const seen = new Set();
  const uniq = words.filter((w) => (seen.has(w) ? false : seen.add(w)));
  if (!uniq.length) return ['nature', 'landscape'];
  const out = [];
  if (uniq.length >= 2) out.push(`${uniq[0]} ${uniq[1]}`);
  uniq.slice(0, 4).forEach((w) => out.push(w));
  return [...new Set(out)].slice(0, 4);
}

// Reads "Visual:/Keywords:/Narrator:/Name:" style scripts without the AI.
function parseLabelled(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const scenes = [];
  let visual = '';
  let keywords = null;
  let spoken = 0;
  lines.forEach((line) => {
    const m = /^([A-Za-z][A-Za-z0-9 '’()\-]{0,40}?)\s*(?:\([^)]*\))?\s*:\s*(.*)$/.exec(line);
    if (!m) return;
    const label = m[1].trim();
    const rest = m[2].trim();
    if (/^scene\b/i.test(label)) { visual = ''; keywords = null; return; }
    if (/^visuals?$/i.test(label)) { visual = rest; return; }
    if (/^keywords?$/i.test(label)) { keywords = rest.split(/[,;]/).map((k) => k.trim()).filter(Boolean); return; }
    if (LABEL_SKIP.test(label) || !rest) return;
    const speaker = /^(narrator|vo|voice[- ]?over|voiceover|host|announcer)$/i.test(label) ? 'narrator' : 'character';
    spoken += 1;
    scenes.push({ text: rest, speaker, visual, keywords: keywords && keywords.length ? keywords : extractKeywords(`${visual} ${rest}`) });
  });
  return spoken >= 2 ? scenes : null;
}

function fallbackScenes(script) {
  const style = /cartoon|animat|pixar|3d/i.test(script) ? 'animation' : 'film';
  const labelled = parseLabelled(script);
  if (labelled) return { style, scenes: labelled };

  const sentences = script.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const scenes = [];
  let buf = [];
  let words = 0;
  const flush = () => {
    if (!buf.length) return;
    const text = buf.join(' ');
    scenes.push({ text, speaker: 'narrator', visual: '', keywords: extractKeywords(text) });
    buf = [];
    words = 0;
  };
  sentences.forEach((s) => {
    const n = s.split(/\s+/).length;
    if (words + n > 36 && buf.length) flush();
    buf.push(s);
    words += n;
    if (words >= 18) flush();
  });
  flush();
  return { style, scenes };
}

module.exports = { cleanScript, chunkScript, fallbackScenes, extractKeywords };
