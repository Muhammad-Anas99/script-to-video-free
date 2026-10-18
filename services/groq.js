const Groq = require('groq-sdk');
const { cleanScript, chunkScript, fallbackScenes } = require('./script');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SCENE_PROMPT = `You turn ANY text into a list of video scenes. The text may be plain narration, an article, a story, bullet points, a numbered list, a storyboard with Visual / SFX / Narrator / character lines, or a mix. Never complain about the format. Always produce scenes.

Return ONLY JSON in this shape:
{"style":"film","scenes":[{"narration":"...","speaker":"narrator","visual":"...","keywords":["...","...","..."]}]}

Rules:
- "narration" is ONLY the words spoken aloud. Remove headings, markdown, bullet markers, labels such as "Narrator:", sound effects, music cues, stage directions and tone notes. Keep the spoken words unchanged apart from fixing obvious typos. Use an empty string if a scene has no spoken line. Keep the original language of the spoken words.
- "speaker" is "narrator" for narration and plain text, and "character" for lines spoken by a character inside a story.
- Plain text: group it into scenes of 1-3 sentences (roughly 12-40 words each). For bullet or numbered lists, make one scene per item. Do not drop or invent content.
- If one block has several spoken lines, make one scene per spoken line and repeat the visual and keywords.
- "visual" is one short sentence in English describing a filmable image that matches what is being said.
- "keywords" are 3 or 4 English stock-footage search phrases that match the MEANING of the narration, even when the narration is in another language. Most specific first (1-3 words each), then broader ones. Use concrete things a camera can film: people, places, objects, actions, weather, nature. For abstract ideas use a concrete visual metaphor (for example "success" becomes "person climbing mountain", "growth" becomes "plant growing"). No character names, brand names or style words.
- If a scene already has a "Keywords:" line, use those first.
- "style" is "animation" if the text mentions cartoon, animated, 3D or Pixar, otherwise "film".`;

function writerPrompt({ tone, seconds, style, language }) {
  const scenes = Math.max(4, Math.min(14, Math.round(seconds / 7)));
  const words = Math.round(seconds * 2.4);
  return `You write short video scripts. Reply with ONLY the script. No introduction, no notes, no code fences.

Use exactly this format, scene by scene:

Style: ${style === 'animation' ? 'cartoon animation' : 'realistic footage'}

Scene 1: <short title>
Visual: <one sentence describing a filmable image>
Keywords: <3 stock footage search phrases in English, separated by commas>
Narrator: <one or two spoken sentences>

Scene 2: <short title>
Visual: ...
Keywords: ...
Narrator: ...

Rules:
- Exactly ${scenes} scenes and about ${words} spoken words in total.
- Tone: ${tone}.
- The spoken lines are written in ${language}. The Visual and Keywords lines are always in English.
- Spoken lines contain only words to be read aloud: no stage directions, sound effects, emojis or brackets.
- Visual and Keywords describe things a camera can film (people, places, objects, actions, weather, nature). Never use character names or abstract ideas.
- The first scene hooks the viewer. The last scene ends with a clear closing line.`;
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Groq did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

async function complete(model, system, user, { jsonMode = false, maxTokens = 4000 } = {}) {
  const params = {
    model,
    temperature: 0.2,
    max_tokens: maxTokens, // keeps the request under the free-tier tokens-per-minute limit
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (/gpt-oss/i.test(model)) params.reasoning_effort = 'low';
  if (jsonMode) params.response_format = { type: 'json_object' };
  const res = await groq.chat.completions.create(params);
  return res.choices[0].message.content || '';
}

let workingModel = null;

async function candidateModels() {
  const list = [workingModel, process.env.GROQ_MODEL, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'].filter(Boolean);
  try {
    const res = await groq.models.list();
    const extra = res.data
      .map((m) => m.id)
      .filter((id) => /llama|gpt-oss|qwen/i.test(id) && !/guard|whisper|tts|orpheus|safeguard/i.test(id));
    list.push(...extra);
  } catch (e) {
    // ignore, use the fixed list
  }
  return [...new Set(list)];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseScenes(text) {
  const data = extractJson(text);
  const scenes = (data.scenes || []).filter(
    (s) => s && ((s.narration && s.narration.trim()) || (s.visual && s.visual.trim()))
  );
  if (!scenes.length) throw new Error('Groq returned no scenes');
  return {
    style: data.style === 'animation' ? 'animation' : 'film',
    scenes: scenes.map((s) => ({
      text: (s.narration || '').trim(),
      speaker: s.speaker === 'character' ? 'character' : 'narrator',
      visual: (s.visual || '').trim(),
      keywords: (Array.isArray(s.keywords) ? s.keywords : []).map((k) => String(k).trim()).filter(Boolean).slice(0, 4),
    })).map((s) => ({ ...s, keywords: s.keywords.length ? s.keywords : ['nature'] })),
  };
}

async function tryModel(model, system, user, parse, opts) {
  let lastErr;
  for (const jsonMode of opts.jsonModes) {
    for (let retry = 0; retry < 2; retry++) {
      try {
        return parse(await complete(model, system, user, { jsonMode, maxTokens: opts.maxTokens }));
      } catch (err) {
        lastErr = err;
        if (err.status === 401) throw err;
        if (err.status === 429 && retry === 0) {
          const wait = Math.min(parseFloat(err.headers?.['retry-after']) || 20, 60);
          console.log(`Groq rate limit, waiting ${wait}s...`);
          await sleep(wait * 1000);
          continue;
        }
        break;
      }
    }
  }
  throw lastErr;
}

// Tries each available model until one gives a usable answer.
async function ask(system, user, parse, opts = {}) {
  const options = { jsonModes: [false, true], maxTokens: 4000, ...opts };
  let lastErr;
  for (const model of await candidateModels()) {
    try {
      const result = await tryModel(model, system, user, parse, options);
      workingModel = model;
      return result;
    } catch (err) {
      console.error(`Groq model ${model} failed:`, err.message);
      lastErr = err;
      if (err.status === 401) throw err;
    }
  }
  throw lastErr || new Error('No usable Groq model found');
}

// Long scripts are analysed in pieces. If the AI is unavailable the text is split locally.
async function analyzeScript(raw) {
  const script = cleanScript(raw);
  if (!script) throw new Error('The script has no readable text.');
  const chunks = chunkScript(script, 320);

  let style = 'film';
  const scenes = [];
  let warning = null;

  for (let i = 0; i < chunks.length; i++) {
    try {
      const r = await ask(SCENE_PROMPT, chunks[i], parseScenes);
      if (i === 0) style = r.style;
      scenes.push(...r.scenes);
    } catch (err) {
      if (err.status === 401) throw err;
      console.error('AI analysis failed, using the built-in splitter:', err.message);
      warning = 'The scene planner was unavailable, so parts of the script were split automatically. Footage may be less accurate.';
      const fb = fallbackScenes(chunks[i]);
      if (i === 0) style = fb.style;
      scenes.push(...fb.scenes);
    }
  }
  if (!scenes.length) throw new Error('No scenes could be made from this script.');
  return { style, scenes, warning };
}

// Writes a whole script from a topic.
async function writeScript({ topic, tone = 'informative', seconds = 60, style = 'film', language = 'English' }) {
  const parse = (text) => {
    const t = text.trim().replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
    if (!/scene\s*1/i.test(t) || !/narrator\s*:/i.test(t)) throw new Error('The writer did not return a script');
    return t;
  };
  return ask(writerPrompt({ tone, seconds, style, language }), `Topic: ${topic}`, parse, { jsonModes: [false], maxTokens: 4000 });
}

module.exports = { analyzeScript, writeScript };
