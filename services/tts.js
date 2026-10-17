const fs = require('fs');
const { EdgeTTS } = require('node-edge-tts');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCALE = Number(process.env.TTS_RETRY_SCALE) || 1; // only changed in tests

// Microsoft's free voice service refuses requests that come too quickly (error 429),
// so calls are spaced out and retried with longer and longer pauses.
const MIN_GAP = 1200 * SCALE;
const RETRY_WAITS = [3000, 6000, 12000, 20000, 30000].map((ms) => ms * SCALE);
let lastCall = 0;

function voiceFor(speaker, opts = {}) {
  if (speaker === 'character') return opts.characterVoice || process.env.TTS_VOICE_CHARACTER || 'en-US-AnaNeural';
  return opts.voice || process.env.TTS_VOICE || 'en-US-GuyNeural';
}

function isRetryable(err) {
  return /429|502|503|timeout|timed out|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket|closed|Unexpected server response|empty audio/i.test(String((err && err.message) || err));
}

async function synthesize(text, outPath, speaker = 'narrator', opts = {}) {
  const voice = voiceFor(speaker, opts);
  const config = {
    voice,
    lang: voice.split('-').slice(0, 2).join('-'), // en-US-GuyNeural -> en-US
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    timeout: 60000,
  };
  const rate = Number(opts.rate) || 0;
  if (rate) config.rate = `${rate > 0 ? '+' : ''}${rate}%`;

  for (let attempt = 0; ; attempt++) {
    const gap = lastCall + MIN_GAP - Date.now();
    if (gap > 0) await sleep(gap);
    lastCall = Date.now();
    try {
      await new EdgeTTS(config).ttsPromise(text, outPath);
      if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) throw new Error('empty audio');
      return;
    } catch (err) {
      if (attempt >= RETRY_WAITS.length || !isRetryable(err)) throw err;
      const wait = RETRY_WAITS[attempt];
      console.log(`Voice service busy (${String(err.message).slice(0, 60)}). Retrying in ${Math.round(wait / 1000)}s...`);
      if (opts.onRetry) opts.onRetry(Math.round(wait / 1000));
      await sleep(wait);
      lastCall = Date.now();
    }
  }
}

module.exports = { synthesize };
