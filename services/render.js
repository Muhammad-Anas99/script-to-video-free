// All FFmpeg work. FFmpeg is started directly (no wrapper library), which keeps
// filters and paths predictable on every operating system.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FPS = 30;
const even = (n) => Math.round(n / 2) * 2;

function run(bin, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd: opts.cwd, windowsHide: true });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; if (err.length > 20000) err = err.slice(-10000); });
    p.on('error', (e) => reject(new Error(`Could not start ${path.basename(bin)}: ${e.message}`)));
    p.on('close', (code) => {
      if (code === 0) return resolve(out);
      const tail = err.trim().split('\n').slice(-6).join(' | ');
      reject(new Error(`${path.basename(bin)} failed (code ${code}): ${tail}`));
    });
  });
}

// ---- finding FFmpeg ----
// Looks at the path set in .env, then the system PATH, then the usual install folders,
// so it still works when a terminal was opened before FFmpeg was installed.
const IS_WIN = process.platform === 'win32';
const exe = (n) => (IS_WIN ? `${n}.exe` : n);
const resolved = {};
const pending = {};

const cleanSetting = (v) => String(v || '').trim().replace(/^["']+|["']+$/g, '');

function fromSetting(name, setting) {
  let p = cleanSetting(setting);
  if (!p) return { path: null };
  try { if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, exe(name)); } catch (e) { /* ignore */ }
  if (fs.existsSync(p)) return { path: p };
  return { path: null, problem: `${name.toUpperCase()}_PATH in .env is "${setting}", but no file exists there.` };
}

function commonLocations(name) {
  const e = exe(name);
  const list = [];
  const home = process.env.USERPROFILE || process.env.HOME || '';
  if (IS_WIN) {
    const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    list.push(path.join(local, 'Microsoft', 'WinGet', 'Links', e));
    const pk = path.join(local, 'Microsoft', 'WinGet', 'Packages');
    try {
      fs.readdirSync(pk).filter((d) => /ffmpeg/i.test(d)).forEach((d) => {
        const base = path.join(pk, d);
        list.push(path.join(base, 'bin', e));
        try { fs.readdirSync(base).forEach((s) => list.push(path.join(base, s, 'bin', e))); } catch (err) { /* ignore */ }
      });
    } catch (err) { /* no winget folder */ }
    ['C:\\ffmpeg\\bin', 'C:\\Program Files\\ffmpeg\\bin', 'C:\\Program Files (x86)\\ffmpeg\\bin', 'C:\\ProgramData\\chocolatey\\bin',
      path.join(home, 'scoop', 'shims'), path.join(home, 'Downloads', 'ffmpeg', 'bin')].forEach((d) => list.push(path.join(d, e)));
  } else {
    ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/snap/bin'].forEach((d) => list.push(path.join(d, e)));
  }
  return list;
}

async function works(bin) {
  try { await run(bin, ['-version']); return true; } catch (e) { return false; }
}

async function locate(name) {
  const s = fromSetting(name, process.env[`${name.toUpperCase()}_PATH`]);
  if (s.path && (await works(s.path))) return { path: s.path };
  const problem = s.problem || (s.path ? `${s.path} could not be started.` : null);

  if (await works(name)) return { path: name, problem };

  if (name === 'ffprobe') {
    const ff = await bin('ffmpeg');
    if (path.isAbsolute(ff)) {
      const beside = path.join(path.dirname(ff), exe('ffprobe'));
      if (fs.existsSync(beside) && (await works(beside))) return { path: beside, problem };
    }
  }
  for (const c of commonLocations(name)) {
    if (fs.existsSync(c) && (await works(c))) return { path: c, problem };
  }
  return { path: null, problem };
}

// Returns the command to run for "ffmpeg" or "ffprobe".
function bin(name) {
  if (!pending[name]) {
    pending[name] = locate(name).then((r) => { resolved[name] = r; return r.path || name; });
  }
  return pending[name];
}

async function getDuration(file) {
  const out = await run(await bin('ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(out) || 0;
}

// ---- generated files (no lavfi needed) ----
function writeSilentWav(file, seconds) {
  const sr = 44100;
  const dataSize = Math.ceil(seconds * sr) * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(file, buf);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function writeSolidPng(file, [r, g, b] = [0, 0, 0]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(Buffer.from([0, r, g, b]))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]));
}

// ---- looks ----
const LOOKS = {
  natural: '',
  warm: 'eq=saturation=1.08:contrast=1.03,colorbalance=rs=.06:gs=.01:bs=-.07:rm=.04:bm=-.04',
  cool: 'eq=saturation=1.03,colorbalance=rs=-.05:bs=.08:rm=-.03:bm=.05',
  cinematic: 'eq=contrast=1.12:saturation=0.92:brightness=-0.02,vignette=PI/5',
  mono: 'hue=s=0,eq=contrast=1.08',
};

const WM_POS = (m) => ({
  tl: `x=${m}:y=${m}`,
  tr: `x=main_w-overlay_w-${m}:y=${m}`,
  bl: `x=${m}:y=main_h-overlay_h-${m}`,
  br: `x=main_w-overlay_w-${m}:y=main_h-overlay_h-${m}`,
  center: 'x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2',
});

// Renders one scene (or card) to an MP4.
// parts: [{ file, kind: 'video' | 'image' | 'still', dur }]  (several parts = several shots)
async function renderScene(o) {
  const { parts, audio, duration: D, out, width: W, height: H } = o;
  const crf = o.crf || 21;
  const n = parts.length;
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];

  parts.forEach((p) => {
    if (p.kind === 'video') args.push('-stream_loop', '-1', '-i', p.file);
    else if (p.kind === 'still') args.push('-loop', '1', '-framerate', String(FPS), '-t', p.dur.toFixed(3), '-i', p.file);
    else args.push('-i', p.file);
  });

  let audioFile = audio;
  if (!audioFile) {
    audioFile = path.join(path.dirname(out), `silence-${path.basename(out)}.wav`);
    writeSilentWav(audioFile, D + 0.5);
  }
  args.push('-i', audioFile);
  const audioIdx = n;

  let wmIdx = -1;
  if (o.watermark && o.watermark.file) {
    wmIdx = n + 1;
    args.push('-loop', '1', '-i', o.watermark.file);
  }

  const f = [];
  parts.forEach((p, i) => {
    if (p.kind === 'image') {
      const bw = even(W * 1.5), bh = even(H * 1.5);
      const frames = Math.max(2, Math.ceil(p.dur * FPS));
      const step = (0.22 / frames).toFixed(6);
      const z = i % 2 === 0 ? `1+${step}*on` : `max(1.22-${step}*on,1)`;
      f.push(`[${i}:v]scale=${bw}:${bh}:force_original_aspect_ratio=increase,crop=${bw}:${bh},zoompan=z='${z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},setsar=1,format=yuv420p[v${i}]`);
    } else {
      f.push(`[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${FPS},trim=duration=${p.dur.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[v${i}]`);
    }
  });

  f.push(n > 1
    ? `${parts.map((_, i) => `[v${i}]`).join('')}concat=n=${n}:v=1:a=0[vc]`
    : '[v0]null[vc]');

  const post = [];
  if (o.look && LOOKS[o.look]) post.push(LOOKS[o.look]);
  if (o.fade && D > 1.2) post.push(`fade=t=in:st=0:d=0.3,fade=t=out:st=${(D - 0.3).toFixed(3)}:d=0.3`);
  if (o.assFile) post.push(`ass=${path.basename(o.assFile)}`);
  let last = 'vc';
  if (post.length) { f.push(`[vc]${post.join(',')}[vp]`); last = 'vp'; }

  if (wmIdx > -1) {
    const w = o.watermark;
    const minSide = Math.min(W, H);
    const ww = even(minSide * (w.size / 100) * 1.6);
    const margin = Math.round(minSide * 0.03);
    f.push(`[${wmIdx}:v]scale=${ww}:-2,format=rgba,colorchannelmixer=aa=${(w.opacity / 100).toFixed(2)}[wm]`);
    f.push(`[${last}][wm]overlay=${WM_POS(margin)[w.position] || WM_POS(margin).br}:format=auto,format=yuv420p[vout]`);
  } else {
    f.push(`[${last}]format=yuv420p[vout]`);
  }

  const dEnd = Math.max(D - 0.06, 0).toFixed(3);
  f.push(`[${audioIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,apad,atrim=duration=${D.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.02,afade=t=out:st=${dEnd}:d=0.05[aout]`);

  args.push(
    '-filter_complex', f.join(';'),
    '-map', '[vout]', '-map', '[aout]',
    '-t', D.toFixed(3), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2',
    out
  );
  await run(await bin('ffmpeg'), args, { cwd: path.dirname(out) });
}

async function concatSegments(segments, listFile, out) {
  const list = segments
    .map((s) => `file '${path.resolve(s).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(listFile, list);
  await run(await bin('ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', out]);
}

// Mixes a looping music track quietly under the voiceover.
async function mixMusic({ video, music, out, volume }) {
  const dur = await getDuration(video);
  const v = (volume / 100).toFixed(2);
  const fadeOut = Math.max(dur - 2, 0).toFixed(2);
  const base = `[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=${v},afade=t=in:st=0:d=1.5,afade=t=out:st=${fadeOut}:d=2[m];[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];[a0][m]`;
  const variants = [
    `${base}amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`,
    `${base}amix=inputs=2:duration=first:dropout_transition=0,volume=2[a]`, // older FFmpeg without "normalize"
  ];
  let lastErr;
  for (const fc of variants) {
    try {
      await run(await bin('ffmpeg'), [
        '-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-stream_loop', '-1', '-i', music,
        '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-t', dur.toFixed(3),
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out,
      ]);
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function makePoster(video, out) {
  const dur = await getDuration(video);
  const at = Math.min(1.2, Math.max(dur / 3, 0)).toFixed(2);
  await run(await bin('ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error', '-ss', at, '-i', video, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', out]);
}

let capsCache = null;
async function getCaps() {
  if (capsCache) return capsCache;
  try {
    const out = await run(await bin('ffmpeg'), ['-hide_banner', '-filters']);
    const has = (name) => new RegExp(`\\s${name}\\s`).test(out);
    capsCache = { ass: has('ass'), zoompan: has('zoompan'), overlay: has('overlay') };
  } catch (e) {
    capsCache = { ass: false, zoompan: false, overlay: true };
  }
  return capsCache;
}

async function checkTools() {
  for (const name of ['ffmpeg', 'ffprobe']) {
    await bin(name);
    const res = resolved[name] || {};
    if (res.path) {
      console.log(`${name} found${res.path === name ? '' : ` at ${res.path}`}${res.problem ? ` (note: ${res.problem} Using this one instead.)` : ''}`);
    } else {
      console.error(`WARNING: ${name} was not found. ${res.problem || ''}`);
      console.error(`  Fix: install FFmpeg (winget install Gyan.FFmpeg), then close ALL terminals and open a new one.`);
      console.error(`  Or set ${name.toUpperCase()}_PATH in .env to the full path of the file, for example C:\\ffmpeg\\bin\\${exe(name)}`);
    }
  }
  const c = await getCaps();
  if (!c.ass) console.warn('NOTE: this FFmpeg build has no subtitle filter ("ass"), so captions and text watermarks will be skipped.');
}

module.exports = {
  getDuration, renderScene, concatSegments, mixMusic, makePoster,
  writeSilentWav, writeSolidPng, getCaps, checkTools,
};
