// Short voice samples for the "hear this voice" buttons. Each sample is made once and kept.

const fs = require('fs');
const path = require('path');
const { synthesize } = require('./tts');
const { VOICE_RE } = require('./options');

const DIR = path.join(__dirname, '..', 'temp', 'voice-previews');
fs.mkdirSync(DIR, { recursive: true });

const TEXT = 'Hi, this is how I sound. Every great video starts with a single sentence.';
const jobs = new Map();

function resolveVoice(voice, speaker) {
  if (voice) return voice;
  return speaker === 'character'
    ? process.env.TTS_VOICE_CHARACTER || 'en-US-AnaNeural'
    : process.env.TTS_VOICE || 'en-US-GuyNeural';
}

async function getPreviewFile(voice, speaker = 'narrator') {
  if (voice && !VOICE_RE.test(voice)) {
    const e = new Error('Unknown voice');
    e.status = 400;
    throw e;
  }
  const resolved = resolveVoice(voice, speaker);
  const file = path.join(DIR, `${resolved}.mp3`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;

  let job = jobs.get(resolved);
  if (!job) {
    const tmp = `${file}.${Date.now()}.tmp`;
    job = synthesize(TEXT, tmp, 'narrator', { voice: resolved })
      .then(() => fs.renameSync(tmp, file))
      .catch((err) => { fs.rmSync(tmp, { force: true }); throw err; })
      .finally(() => jobs.delete(resolved));
    jobs.set(resolved, job);
  }
  await job;
  return file;
}

module.exports = { getPreviewFile };
