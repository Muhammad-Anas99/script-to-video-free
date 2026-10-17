require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Video = require('./models/Video');
const { analyzeScript } = require('./services/groq');
const { findMedia, downloadFile } = require('./services/pixabay');
const { synthesize } = require('./services/tts');
const { sanitizeOptions } = require('./services/options');
const { buildCues, buildSceneAss, buildCardAss, toSrt } = require('./services/captions');
const R = require('./services/render');

const OUTPUT_DIR = path.join(__dirname, 'output');
const TEMP_DIR = path.join(__dirname, 'temp');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '30mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(OUTPUT_DIR));

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

async function setProgress(id, progress, extra = {}) {
  await Video.findByIdAndUpdate(id, { status: 'processing', progress, ...extra });
}

function removeFiles(video) {
  if (!video) return;
  [video.videoFile, video.posterFile, video.srtFile].filter(Boolean).forEach((f) => {
    fs.rmSync(path.join(OUTPUT_DIR, f), { force: true });
  });
}

// Reads a data URL sent by the browser (logo or music) and checks type and size.
function readUpload(dataUrl, typeRe, maxBytes, label) {
  if (!dataUrl) return null;
  const m = /^data:([\w/+.-]+);base64,(.*)$/s.exec(dataUrl);
  if (!m || !typeRe.test(m[1])) {
    const e = new Error(`The ${label} file type is not supported.`);
    e.status = 400;
    throw e;
  }
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > maxBytes) {
    const e = new Error(`The ${label} file is too large.`);
    e.status = 400;
    throw e;
  }
  return buf;
}

const rotate = (arr, n) => arr.slice(n % arr.length).concat(arr.slice(0, n % arr.length));

async function processJob(id) {
  const job = await Video.findById(id);
  if (!job) return;
  const o = sanitizeOptions(job.options);
  const workDir = path.join(TEMP_DIR, String(id));
  fs.mkdirSync(workDir, { recursive: true });

  const SILENT = parseFloat(process.env.SILENT_SCENE_SECONDS || '4');
  const MIN_SCENE = parseFloat(process.env.MIN_SCENE_SECONDS || '3');
  const portrait = o.format === 'portrait';
  const W = portrait ? (o.quality === 1080 ? 1080 : 720) : o.quality === 1080 ? 1920 : 1280;
  const H = portrait ? (o.quality === 1080 ? 1920 : 1280) : o.quality === 1080 ? 1080 : 720;
  const crf = o.quality === 1080 ? 19 : 21;

  const wmFile = path.join(workDir, 'wm.img');
  const musicFile = path.join(workDir, 'music.bin');
  const hasLogo = o.watermark.type === 'image' && fs.existsSync(wmFile);
  const hasMusic = o.music.on && fs.existsSync(musicFile);
  const wmText = o.watermark.type === 'text' && o.watermark.text.trim() ? o.watermark : null;

  const warnings = [];
  const warn = (msg) => { if (!warnings.includes(msg)) warnings.push(msg); };
  const caps = await R.getCaps();
  if (!caps.ass && (o.captions.on || wmText)) warn('Captions and text watermarks were skipped because subtitle support is missing on this computer.');
  const useAss = caps.ass;

  try {
    await setProgress(id, 'Reading your script...', { step: 'analyze' });
    const { style, scenes, warning } = await analyzeScript(job.script);
    if (warning) warn(warning);
    await Video.findByIdAndUpdate(id, { scenes, total: scenes.length, current: 0, step: 'scenes' });

    R.writeSolidPng(path.join(workDir, 'bg.png'), [13, 16, 34]);
    const bgPng = path.join(workDir, 'bg.png');

    const used = new Set();
    const segments = [];
    const allCues = [];
    let timeline = 0;

    // ----- intro card -----
    if (o.intro.title.trim()) {
      const out = path.join(workDir, 'intro.mp4');
      const dur = 3;
      let assFile = null;
      if (useAss) {
        assFile = path.join(workDir, 'intro.ass');
        fs.writeFileSync(assFile, buildCardAss({ width: W, height: H, title: o.intro.title, subtitle: o.intro.subtitle, font: o.captions.font, duration: dur }));
      }
      await R.renderScene({ parts: [{ file: bgPng, kind: 'still', dur }], audio: null, duration: dur, out, width: W, height: H, crf, fade: true, assFile });
      segments.push(out);
      timeline += dur;
    }

    // ----- scenes -----
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      await setProgress(id, `Scene ${i + 1} of ${scenes.length}: voiceover and footage...`, { step: 'scenes', current: i });

      let audio = null;
      let speech = 0;
      let duration = SILENT;
      if (s.text) {
        audio = path.join(workDir, `a${i}.mp3`);
        await synthesize(s.text, audio, s.speaker, {
          voice: o.voice, characterVoice: o.characterVoice, rate: o.rate,
          onRetry: () => setProgress(id, `Scene ${i + 1} of ${scenes.length}: the voice service is busy, trying again...`, { step: 'scenes', current: i }).catch(() => {}),
        });
        speech = await R.getDuration(audio);
        duration = Math.max(speech + 0.4, MIN_SCENE);
      }

      // several shots for longer scenes
      const shots = Math.max(1, Math.min(6, Math.round(duration / o.cut)));
      const shotDur = duration / shots;
      const found = [];
      for (let j = 0; j < shots; j++) {
        const kws = rotate(s.keywords && s.keywords.length ? s.keywords : ['nature'], j);
        const media = await findMedia(kws, {
          used, style, quality: o.quality, photos: o.source === 'mixed', orientation: portrait ? 'vertical' : 'horizontal',
        });
        if (media) {
          const file = path.join(workDir, `m${i}_${j}.${media.kind === 'image' ? 'jpg' : 'mp4'}`);
          await downloadFile(media.url, file);
          found.push({ file, kind: media.kind, dur: shotDur, thumb: media.thumb, url: media.url });
        } else {
          found.push(null);
        }
      }
      const firstFound = found.find(Boolean);
      const parts = found.map((m) => m || (firstFound ? { ...firstFound } : { file: bgPng, kind: 'still' })).map((m) => ({ ...m, dur: shotDur }));

      // captions and text watermark
      let cues = [];
      let assFile = null;
      if (useAss && ((o.captions.on && s.text) || wmText)) {
        if (o.captions.on && s.text) cues = buildCues(s.text, speech, o.captions.words);
        assFile = path.join(workDir, `s${i}.ass`);
        fs.writeFileSync(assFile, buildSceneAss({ width: W, height: H, cues, captions: o.captions, watermark: wmText ? o.watermark : null, duration }));
      }

      await setProgress(id, `Scene ${i + 1} of ${scenes.length}: rendering...`, { step: 'scenes', current: i });
      const seg = path.join(workDir, `s${i}.mp4`);
      const base = { parts, audio, duration, out: seg, width: W, height: H, crf };
      const full = {
        ...base, look: o.look, fade: o.transition === 'fade', assFile,
        watermark: hasLogo ? { file: wmFile, position: o.watermark.position, size: o.watermark.size, opacity: o.watermark.opacity } : null,
      };
      try {
        await R.renderScene(full);
      } catch (e1) {
        console.error('Render with all effects failed, retrying without captions:', e1.message);
        try {
          await R.renderScene({ ...full, assFile: null });
          if (assFile) warn('Captions could not be added on this computer, so the video was made without them.');
        } catch (e2) {
          console.error('Render without captions failed, retrying with basics only:', e2.message);
          await R.renderScene({ ...base, parts: parts.map((p) => (p.kind === 'image' ? { ...p, kind: 'still' } : p)) });
          warn('Some visual effects could not be applied on this computer.');
        }
      }
      segments.push(seg);

      cues.forEach((c) => allCues.push({ start: c.start + timeline, end: c.end + timeline, text: c.text }));
      timeline += duration;

      s.clipUrl = firstFound ? firstFound.url : null;
      s.thumb = firstFound ? firstFound.thumb : null;
      s.mediaKind = firstFound ? firstFound.kind : null;
      s.duration = duration;
      await Video.findByIdAndUpdate(id, { current: i + 1, [`scenes.${i}.thumb`]: s.thumb, [`scenes.${i}.mediaKind`]: s.mediaKind, [`scenes.${i}.duration`]: duration });
    }

    // ----- outro card -----
    if (o.outro.text.trim()) {
      const out = path.join(workDir, 'outro.mp4');
      const dur = 3;
      let assFile = null;
      if (useAss) {
        assFile = path.join(workDir, 'outro.ass');
        fs.writeFileSync(assFile, buildCardAss({ width: W, height: H, title: o.outro.text, subtitle: '', font: o.captions.font, duration: dur }));
      }
      await R.renderScene({ parts: [{ file: bgPng, kind: 'still', dur }], audio: null, duration: dur, out, width: W, height: H, crf, fade: true, assFile });
      segments.push(out);
    }

    await setProgress(id, 'Joining scenes into the final video...', { step: 'join', current: scenes.length });
    const joined = path.join(workDir, 'joined.mp4');
    await R.concatSegments(segments, path.join(workDir, 'list.txt'), joined);

    const fileName = `${id}.mp4`;
    const finalPath = path.join(OUTPUT_DIR, fileName);
    if (hasMusic) {
      await setProgress(id, 'Adding background music...', { step: 'join' });
      try {
        await R.mixMusic({ video: joined, music: musicFile, out: finalPath, volume: o.music.volume });
      } catch (e) {
        console.error('Music mix failed:', e.message);
        warn('The background music could not be added.');
        fs.copyFileSync(joined, finalPath);
      }
    } else {
      fs.copyFileSync(joined, finalPath);
    }

    let posterFile = null;
    try {
      posterFile = `${id}.jpg`;
      await R.makePoster(finalPath, path.join(OUTPUT_DIR, posterFile));
    } catch (e) { posterFile = null; }

    let srtFile = null;
    if (o.captions.on && allCues.length && useAss) {
      srtFile = `${id}.srt`;
      fs.writeFileSync(path.join(OUTPUT_DIR, srtFile), toSrt(allCues));
    }

    // The user may have deleted this job while it was rendering.
    if (!(await Video.exists({ _id: id }))) {
      [fileName, posterFile, srtFile].filter(Boolean).forEach((f) => fs.rmSync(path.join(OUTPUT_DIR, f), { force: true }));
      return;
    }

    await Video.findByIdAndUpdate(id, {
      status: 'done', progress: 'Done', step: 'done', videoFile: fileName, posterFile, srtFile, warnings,
    });
  } catch (err) {
    console.error(err);
    await Video.findByIdAndUpdate(id, { status: 'error', progress: 'Failed', error: err.message, warnings });
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

// ---- API ----

app.post('/api/videos', wrap(async (req, res) => {
  try {
    const script = (req.body.script || '').trim();
    if (!script) return res.status(400).json({ error: 'Script is required' });
    if (script.length > 20000) return res.status(400).json({ error: 'Script is too long (max 20,000 characters)' });

    const options = sanitizeOptions(req.body);
    const logo = readUpload(req.body.watermarkImage, /^image\/(png|jpeg|webp)$/, 3 * 1024 * 1024, 'logo');
    const music = options.music.on ? readUpload(req.body.musicFile, /^audio\//, 15 * 1024 * 1024, 'music') : null;
    if (options.watermark.type === 'image' && !logo) options.watermark.type = 'none';
    if (options.music.on && !music) options.music.on = false;

    const video = await Video.create({ script, options });
    const dir = path.join(TEMP_DIR, String(video._id));
    fs.mkdirSync(dir, { recursive: true });
    if (logo) fs.writeFileSync(path.join(dir, 'wm.img'), logo);
    if (music) fs.writeFileSync(path.join(dir, 'music.bin'), music);

    processJob(video._id); // runs in the background; the client polls for status
    res.status(202).json({ id: video._id });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    throw err;
  }
}));

app.get('/api/videos', wrap(async (req, res) => {
  res.json(await Video.find().sort({ createdAt: -1 }).limit(100));
}));

app.get('/api/videos/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Not found' });
  res.json(video);
}));

app.delete('/api/videos/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const video = await Video.findByIdAndDelete(req.params.id);
  if (!video) return res.status(404).json({ error: 'Not found' });
  removeFiles(video);
  res.json({ deleted: 1 });
}));

app.delete('/api/videos', wrap(async (req, res) => {
  const all = await Video.find().select('videoFile posterFile srtFile');
  all.forEach(removeFiles);
  const result = await Video.deleteMany({});
  res.json({ deleted: result.deletedCount });
}));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => { console.log(`Running at http://localhost:${port}`); R.checkTools(); });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.error('If you use Atlas, add your IP under Network Access.');
    process.exit(1);
  });
