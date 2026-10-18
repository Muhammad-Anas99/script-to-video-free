/* ScriptReel front end. No build step, no dependencies. */

// ---------- Helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return el;
}

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
  wand: '<path d="M15 4l5 5L9 20H4v-5z"/><path d="M13 6l5 5"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  reuse: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  loader: '<path d="M12 3a9 9 0 1 0 9 9"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 22a10 10 0 1 1 10-10c0 2.5-2 3-3.5 3H16a2 2 0 0 0-1.4 3.4c.6.6.4 1.6-.2 2.2-.7.9-1.4 1.4-2.4 1.4z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
};

function icon(name, size = 18) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}

function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => {
    const svg = icon(el.dataset.icon, +el.dataset.size || 18);
    if (el.className) svg.setAttribute('class', el.className);
    el.replaceWith(svg);
  });
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

function toast(msg, type = 'info') {
  $$('.toast').forEach((x) => x.remove());
  const t = h('div', { class: `toast ${type}` }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3400);
}

function confirmDialog(title, text, okLabel = 'Delete') {
  const dlg = $('#confirm');
  if (!dlg.showModal) return Promise.resolve(window.confirm(`${title}\n\n${text}`));
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  $('#confirmOk').textContent = okLabel;
  return new Promise((resolve) => {
    dlg.returnValue = '';
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.showModal();
  });
}

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/api/auth/')) handleSignedOut();
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function deepMerge(base, extra) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  Object.entries(extra || {}).forEach(([k, v]) => {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base && typeof base[k] === 'object' ? deepMerge(base[k], v) : v;
  });
  return out;
}

function fmtDur(sec) {
  sec = Math.round(sec || 0);
  if (!sec) return '0s';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

const fmtDate = (d) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function titleOf(script) {
  const lines = script.split('\n').map((l) => l.trim()).filter(Boolean);
  const named = lines.find((l) => /^(cartoon\s+|video\s+)?title\s*:/i.test(l));
  const t = named
    ? named.replace(/^(cartoon\s+|video\s+)?title\s*:\s*/i, '')
    : lines.find((l) => !/^style\s*:/i.test(l)) || 'Untitled';
  return t.length > 110 ? t.slice(0, 107) + '...' : t;
}

const videoDuration = (v) => (v.scenes || []).reduce((a, s) => a + (s.duration || 0), 0);
const hexToRgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`;
};

// ---------- Content ----------
const SAMPLES = [
  { title: 'Morning routine', text: `Style: realistic footage

Scene 1: Before sunrise
Visual: City skyline at dawn with soft orange light
Keywords: city skyline sunrise, quiet street
Narrator: Every great day starts before anyone else is awake.

Scene 2: The first cup
Visual: Steam rising from a fresh cup of coffee
Keywords: coffee cup steam, morning kitchen
Narrator: A slow cup of coffee, and a few minutes with nothing to prove.

Scene 3: On the move
Visual: Person jogging along a river path
Keywords: jogging river, morning run
Narrator: Then a short run, because the best ideas show up when you are moving.

Scene 4: Ready
Visual: Laptop open on a desk by a bright window
Keywords: laptop desk window, working morning
Narrator: By the time the city wakes up, you are already ahead.` },

  { title: 'Barnaby the bulldog', text: `Cartoon Title: Barnaby's Big Bounce
Style: bright cartoon animation

Scene 1: The dream
Visual: A bulldog puppy staring at a big trampoline in a sunny garden
Keywords: bulldog puppy, trampoline, garden
Narrator: Every dog has a dream. For Barnaby, that dream was exactly six feet in the air.

Scene 2: The warning
Visual: A small bluebird sitting on a fence
Keywords: bluebird fence, small bird
Pip: If you eat dirt again, I am not digging you out.

Scene 3: The leap
Visual: A puppy jumping high in the air
Keywords: dog jumping, puppy running grass
Narrator: Pure majesty. A triumph of canine engineering!

Scene 4: Gravity
Visual: Mud splashing in a flower bed
Keywords: mud splash, flower bed
Narrator: Until physics remembered he was a bulldog.` },

  { title: 'Ocean facts', text: `The ocean covers more than seventy percent of our planet, yet most of it has never been explored. Beneath the waves lie mountain ranges taller than anything on land and trenches so deep that sunlight never reaches the bottom. Coral reefs take up less than one percent of the seafloor, but they are home to a quarter of all marine life. Every second breath you take comes from tiny plants floating in the sea. Protecting the ocean means protecting ourselves.` },

  { title: 'Five focus tips', text: `Five ways to focus better today

1. Start with the hardest task while your mind is fresh.
2. Put your phone in another room for one hour.
3. Work in short sprints of twenty five minutes, then take a five minute break.
4. Keep a glass of water on your desk and sip it often.
5. End the day by writing tomorrow's top three priorities.` },

  { title: 'Journey to Mars', text: `Style: realistic footage

Scene 1: Looking up
Visual: Night sky full of stars over a quiet desert
Keywords: night sky stars, desert night
Narrator: For thousands of years, people have looked up and wondered what is out there.

Scene 2: Launch
Visual: A rocket lifting off with smoke and fire
Keywords: rocket launch, space rocket
Narrator: Today, rockets carry our questions beyond the clouds.

Scene 3: The red planet
Visual: Red rocky landscape with dust
Keywords: red desert, rocky planet
Narrator: Mars is cold, dusty and silent, yet it may hold the secret to life beyond Earth.

Scene 4: Home
Visual: Planet Earth seen from space
Keywords: earth from space, planet earth
Narrator: And every journey outward teaches us to care more about home.` },

  { title: 'Easy pasta dinner', text: `Dinner in fifteen minutes is easier than you think. Boil a pot of salted water and cook your pasta until it is just tender. While it cooks, warm olive oil in a pan and add chopped garlic and fresh tomatoes. Drain the pasta, toss it in the pan, and finish with basil and a little parmesan. Serve it hot, with a squeeze of lemon, and enjoy a meal that feels like a restaurant at home.` },

  { title: 'A day in Tokyo', text: `Style: realistic footage

Scene 1: Neon nights
Visual: Busy crossing with glowing neon signs at night
Keywords: tokyo night street, neon city
Narrator: Tokyo never really sleeps. Its streets glow long after midnight.

Scene 2: Quiet temples
Visual: Peaceful temple with trees and stone lanterns
Keywords: japanese temple, stone lantern
Narrator: Yet a few steps away, ancient temples keep the city calm.

Scene 3: Street food
Visual: Cook preparing food at a night market stall
Keywords: street food, market stall cooking
Narrator: Every corner hides a tiny stall with the best meal of your trip.

Scene 4: Fast trains
Visual: A high speed train passing a station
Keywords: bullet train, train station
Narrator: And the trains are so fast and punctual that you will never miss a moment.` },

  { title: 'Rainforest', text: `Rainforests cover only a small part of the Earth, but they hold more than half of all plant and animal species. Tall trees form a thick green roof, and below it the air is warm, wet and full of sound. Frogs, birds and insects fill the day and the night. These forests also clean the air and store huge amounts of carbon. When a rainforest disappears, we lose far more than trees.` },
];

const PROMPT = `Write a short video script about: [YOUR TOPIC HERE]

Use exactly this format, scene by scene:

Style: [cartoon animation OR realistic footage]

Scene 1: [short title]
Visual: [one sentence describing real stock footage, using simple concrete things]
Keywords: [2-3 stock video search terms, 1-3 words each]
Narrator: [one or two spoken sentences]

Scene 2: [short title]
Visual: ...
Keywords: ...
Narrator: ...

Rules:
- 8 to 12 scenes, 60 to 90 seconds in total, under 500 words.
- Every scene has exactly one spoken line, either "Narrator:" or "[Character name]:". Keep each spoken line to 1-2 short sentences.
- Spoken lines contain only the words to be read aloud. No stage directions, no tone notes in brackets, no sound effects, no music cues.
- The Visual and Keywords must describe things that exist as real stock videos, such as "bulldog puppy running in a backyard", "trampoline", "mud splash", "blue sky with clouds", "city skyline at night". Never use character names, made-up objects or abstract ideas in Visual or Keywords.
- Write everything in English.
- Do not add titles, notes or explanations before or after the script.`;

const CAP_STYLES = {
  classic: { color: '#FFFFFF', outline: '#000000', box: false, upper: false, font: 'Arial', anim: 'none' },
  bold: { color: '#FFE600', outline: '#000000', box: false, upper: true, font: 'Impact', anim: 'pop' },
  boxed: { color: '#FFFFFF', outline: '#111111', box: true, upper: false, font: 'Segoe UI', anim: 'fade' },
  soft: { color: '#F7F2E8', outline: '#2A2A2A', box: false, upper: false, font: 'Georgia', anim: 'fade' },
  neon: { color: '#7CFFEA', outline: '#0A2540', box: false, upper: true, font: 'Verdana', anim: 'pop' },
};

const DEFAULTS = {
  voice: '', characterVoice: '', rate: 0,
  format: 'landscape', quality: 720, source: 'mixed', cut: 5, look: 'natural', transition: 'fade',
  captions: { on: true, position: 'bottom', size: 'm', words: 4, ...CAP_STYLES.classic },
  watermark: { type: 'none', text: '', position: 'br', size: 15, opacity: 70 },
  intro: { title: '', subtitle: '' }, outro: { text: '' },
  music: { on: false, volume: 18 },
};

const PRESETS = {
  youtube: { format: 'landscape', quality: 1080, source: 'mixed', cut: 5, look: 'natural', transition: 'fade', captions: { on: true, position: 'bottom', size: 'm', words: 4, ...CAP_STYLES.classic } },
  shorts: { format: 'portrait', quality: 1080, source: 'mixed', cut: 3, look: 'natural', transition: 'none', captions: { on: true, position: 'middle', size: 'l', words: 2, ...CAP_STYLES.bold } },
  cinematic: { format: 'landscape', quality: 1080, source: 'mixed', cut: 8, look: 'cinematic', transition: 'fade', captions: { on: true, position: 'bottom', size: 'm', words: 8, ...CAP_STYLES.soft } },
  clean: { format: 'landscape', quality: 720, cut: 5, look: 'natural', transition: 'fade', captions: { on: false }, watermark: { type: 'none' }, intro: { title: '', subtitle: '' }, outro: { text: '' } },
};

const VOICE_GROUPS = (defaultName) => [
  { group: null, items: [{ value: '', name: defaultName, meta: 'Recommended' }] },
  { group: 'United States', items: [
    { value: 'en-US-GuyNeural', name: 'Guy', meta: 'Male' },
    { value: 'en-US-ChristopherNeural', name: 'Christopher', meta: 'Male' },
    { value: 'en-US-EricNeural', name: 'Eric', meta: 'Male' },
    { value: 'en-US-AriaNeural', name: 'Aria', meta: 'Female' },
    { value: 'en-US-JennyNeural', name: 'Jenny', meta: 'Female' },
    { value: 'en-US-MichelleNeural', name: 'Michelle', meta: 'Female' },
    { value: 'en-US-AnaNeural', name: 'Ana', meta: 'Young female' },
  ] },
  { group: 'United Kingdom', items: [
    { value: 'en-GB-RyanNeural', name: 'Ryan', meta: 'Male' },
    { value: 'en-GB-SoniaNeural', name: 'Sonia', meta: 'Female' },
  ] },
  { group: 'Australia', items: [
    { value: 'en-AU-WilliamNeural', name: 'William', meta: 'Male' },
    { value: 'en-AU-NatashaNeural', name: 'Natasha', meta: 'Female' },
  ] },
  { group: 'India', items: [
    { value: 'en-IN-PrabhatNeural', name: 'Prabhat', meta: 'Male' },
    { value: 'en-IN-NeerjaNeural', name: 'Neerja', meta: 'Female' },
  ] },
  { group: 'Urdu', items: [
    { value: 'ur-PK-AsadNeural', name: 'Asad', meta: 'Male' },
    { value: 'ur-PK-UzmaNeural', name: 'Uzma', meta: 'Female' },
  ] },
  { group: 'Hindi', items: [
    { value: 'hi-IN-MadhurNeural', name: 'Madhur', meta: 'Male' },
    { value: 'hi-IN-SwaraNeural', name: 'Swara', meta: 'Female' },
  ] },
  { group: 'Arabic', items: [
    { value: 'ar-SA-HamedNeural', name: 'Hamed', meta: 'Male' },
    { value: 'ar-SA-ZariyahNeural', name: 'Zariyah', meta: 'Female' },
  ] },
  { group: 'Spanish', items: [
    { value: 'es-ES-AlvaroNeural', name: 'Alvaro', meta: 'Male' },
    { value: 'es-ES-ElviraNeural', name: 'Elvira', meta: 'Female' },
  ] },
  { group: 'French', items: [
    { value: 'fr-FR-HenriNeural', name: 'Henri', meta: 'Male' },
    { value: 'fr-FR-DeniseNeural', name: 'Denise', meta: 'Female' },
  ] },
  { group: 'German', items: [
    { value: 'de-DE-ConradNeural', name: 'Conrad', meta: 'Male' },
    { value: 'de-DE-KatjaNeural', name: 'Katja', meta: 'Female' },
  ] },
  { group: 'Portuguese', items: [
    { value: 'pt-BR-AntonioNeural', name: 'Antonio', meta: 'Male' },
    { value: 'pt-BR-FranciscaNeural', name: 'Francisca', meta: 'Female' },
  ] },
  { group: 'Turkish', items: [
    { value: 'tr-TR-AhmetNeural', name: 'Ahmet', meta: 'Male' },
    { value: 'tr-TR-EmelNeural', name: 'Emel', meta: 'Female' },
  ] },
];

const FONT_GROUPS = [{
  group: null,
  items: ['Arial', 'Impact', 'Verdana', 'Georgia', 'Trebuchet MS', 'Tahoma', 'Segoe UI', 'Courier New']
    .map((f) => ({ value: f, name: f, meta: '', font: true })),
}];

// ---------- State ----------
const state = {
  current: null, activeId: null, busy: false,
  lib: [], filter: 'all', query: '', libTimer: null,
  user: null, config: {}, signupAvatar: null, googleLoading: false,
  logoData: null, musicData: null, view: store.get('libView') || 'list', sort: store.get('libSort') || 'new',
  sampleQueue: [], lastSample: -1,
};

const el = {
  script: $('#script'), count: $('#count'), go: $('#go'), goLabel: $('#goLabel'),
  monitor: $('#monitor'), idle: $('#idle'), player: $('#player'), rec: $('#rec'),
  resultBar: $('#resultBar'), status: $('#status'), timeline: $('#timeline'),
  breakdown: $('#breakdown'), sceneList: $('#sceneList'), steps: $('#steps'), warnings: $('#warnings'),
};

// ---------- Theme and router ----------
$('#themeBtn').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
});

const TABS = ['create', 'library', 'guide', 'privacy'];

function route() {
  let tab = location.hash.replace('#', '');
  if (!TABS.includes(tab)) tab = 'create';
  TABS.forEach((t) => { $(`#view-${t}`).hidden = t !== tab; });
  $$('.tabs a').forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (tab === 'library' && state.user) loadLibrary();
  clearTimeout(state.libTimer);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
function go(tab) { if (location.hash === `#${tab}`) route(); else location.hash = tab; }

// ---------- Dropdowns ----------
const dropdowns = [];

function makeDropdown({ id, groups, onChange, speaker = null }) {
  const root = $(`#${id}Dd`), input = $(`#${id}`), btn = $(`#${id}Btn`), menu = $(`#${id}Menu`);
  const nameEl = $(`#${id}Name`), metaEl = $(`#${id}Meta`);
  const flat = groups.flatMap((g) => g.items);
  let active = 0;

  function build() {
    menu.replaceChildren();
    let idx = 0;
    groups.forEach((g) => {
      if (g.group) menu.append(h('div', { class: 'dd-group', role: 'presentation' }, g.group));
      g.items.forEach((it) => {
        const i = idx++;
        const nm = h('span', { class: 'dd-name' }, it.name);
        if (it.font) nm.style.fontFamily = `"${it.value}", sans-serif`;
        const play = speaker ? h('button', {
          type: 'button', class: 'dd-play', tabindex: '-1', title: 'Hear this voice',
          'aria-label': `Hear the voice ${it.name}`,
          onclick: (e) => { e.stopPropagation(); previewVoice(it.value, speaker, e.currentTarget); },
        }, icon('play', 14)) : null;
        const chk = icon('check', 16);
        chk.setAttribute('class', 'dd-check');
        menu.append(h('div', {
          class: 'dd-opt', role: 'option', id: `${id}-opt-${i}`, 'data-i': i, 'aria-selected': 'false',
          onclick: () => { set(flat[i].value); close(true); },
          onmousemove: () => setActive(i, false),
        }, play, nm, h('span', { class: 'dd-meta' }, it.meta || ''), chk));
      });
    });
  }

  function set(value, silent = false) {
    let i = flat.findIndex((v) => v.value === value);
    if (i < 0) i = 0;
    const it = flat[i];
    input.value = it.value;
    nameEl.textContent = it.name;
    metaEl.textContent = it.meta || '';
    if (it.font) nameEl.style.fontFamily = `"${it.value}", sans-serif`;
    $$('.dd-opt', menu).forEach((o) => o.setAttribute('aria-selected', String(+o.dataset.i === i)));
    active = i;
    if (!silent && onChange) onChange(it.value);
  }

  function setActive(i, scroll = true) {
    active = Math.max(0, Math.min(flat.length - 1, i));
    $$('.dd-opt', menu).forEach((o) => o.classList.toggle('active', +o.dataset.i === active));
    menu.setAttribute('aria-activedescendant', `${id}-opt-${active}`);
    if (scroll) $(`#${id}-opt-${active}`).scrollIntoView({ block: 'nearest' });
  }

  function open() {
    dropdowns.forEach((d) => d.close());
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    setActive(flat.findIndex((v) => v.value === input.value));
    menu.focus({ preventScroll: true });
  }

  function close(returnFocus = false) {
    if (menu.hidden && !returnFocus) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus();
  }

  btn.addEventListener('click', () => (menu.hidden ? open() : close()));
  btn.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); }
  });
  menu.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (k === 'Home') { e.preventDefault(); setActive(0); }
    else if (k === 'End') { e.preventDefault(); setActive(flat.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); set(flat[active].value); close(true); }
    else if (k === 'ArrowRight' && speaker) { e.preventDefault(); previewVoice(flat[active].value, speaker, $(`#${id}-opt-${active} .dd-play`)); }
    else if (k === 'Escape') { e.preventDefault(); close(true); }
    else if (k === 'Tab') close();
    else if (k.length === 1) {
      const low = k.toLowerCase();
      const next = flat.findIndex((v, i) => i > active && v.name.toLowerCase().startsWith(low));
      const first = next >= 0 ? next : flat.findIndex((v) => v.name.toLowerCase().startsWith(low));
      if (first >= 0) setActive(first);
    }
  });

  build();
  set(flat[0].value, true);
  const api = { set, get: () => input.value, close, contains: (t) => root.contains(t) };
  dropdowns.push(api);
  return api;
}

// ---- hear a voice ----
const previewState = { audio: null, btn: null };

function setPlayIcon(btn, name) {
  btn.replaceChildren(icon(name, 14));
  btn.classList.toggle('loading', name === 'loader');
  btn.classList.toggle('playing', name === 'stop');
}

function stopPreview() {
  if (previewState.audio) {
    previewState.audio.pause();
    previewState.audio.onended = null;
    previewState.audio.onerror = null;
    previewState.audio = null;
  }
  if (previewState.btn) { setPlayIcon(previewState.btn, 'play'); previewState.btn = null; }
}

function previewVoice(value, speaker, btn) {
  if (!btn) return;
  const same = previewState.btn === btn;
  stopPreview();
  if (same) return; // second click on the same button stops it
  previewState.btn = btn;
  setPlayIcon(btn, 'loader');
  const audio = new Audio(`/api/voice-preview?voice=${encodeURIComponent(value)}&speaker=${speaker}`);
  previewState.audio = audio;
  const fail = () => {
    if (previewState.audio !== audio) return;
    stopPreview();
    toast('Could not play that voice sample. Please try again.', 'error');
  };
  audio.onended = () => { if (previewState.audio === audio) stopPreview(); };
  audio.onerror = fail;
  audio.play().then(() => { if (previewState.audio === audio) setPlayIcon(btn, 'stop'); }).catch(fail);
}

document.addEventListener('click', (e) => {
  dropdowns.forEach((d) => { if (!d.contains(e.target)) d.close(); });
});

// ---------- Settings ----------
const radio = (name) => (($(`input[name="${name}"]:checked`) || {}).value);
const setRadio = (name, v) => { const r = $(`input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };

const persist = debounce(() => store.set('settings', JSON.stringify(getSettings())), 250);

const voiceDd = makeDropdown({ id: 'voice', groups: VOICE_GROUPS('Default voice'), speaker: 'narrator', onChange: () => persist() });
const charDd = makeDropdown({ id: 'charVoice', groups: VOICE_GROUPS('Default voice'), speaker: 'character', onChange: () => persist() });
const fontDd = makeDropdown({ id: 'capFont', groups: FONT_GROUPS, onChange: () => { syncUI(); persist(); } });

function getSettings() {
  return {
    voice: voiceDd.get(), characterVoice: charDd.get(), rate: +$('#rate').value,
    format: radio('format'), quality: +radio('quality'), source: radio('source'),
    cut: +radio('cut'), look: radio('look'), transition: radio('transition'),
    captions: {
      on: $('#capOn').checked, position: radio('capPos'), size: radio('capSize'), font: fontDd.get(),
      color: $('#capColor').value.toUpperCase(), outline: $('#capOutline').value.toUpperCase(),
      box: $('#capBox').checked, words: +radio('capWords'), anim: radio('capAnim'), upper: $('#capUpper').checked,
    },
    watermark: { type: radio('wmType'), text: $('#wmText').value, position: radio('wmPos'), size: +$('#wmSize').value, opacity: +$('#wmOpacity').value },
    intro: { title: $('#introTitle').value, subtitle: $('#introSub').value },
    outro: { text: $('#outroText').value },
    music: { on: !!state.musicData, volume: +$('#musicVol').value },
  };
}

function applySettings(s) {
  s = deepMerge(DEFAULTS, s || {});
  voiceDd.set(s.voice, true);
  charDd.set(s.characterVoice, true);
  $('#rate').value = s.rate;
  setRadio('format', s.format);
  setRadio('quality', String(s.quality));
  setRadio('source', s.source);
  setRadio('cut', String(s.cut));
  setRadio('look', s.look);
  setRadio('transition', s.transition);
  const c = s.captions;
  $('#capOn').checked = !!c.on;
  setRadio('capPos', c.position);
  setRadio('capSize', c.size);
  setRadio('capWords', String(c.words));
  setRadio('capAnim', c.anim);
  fontDd.set(c.font, true);
  $('#capColor').value = c.color.toLowerCase();
  $('#capOutline').value = c.outline.toLowerCase();
  $('#capBox').checked = !!c.box;
  $('#capUpper').checked = !!c.upper;
  const w = s.watermark;
  setRadio('wmType', w.type);
  $('#wmText').value = w.text || '';
  setRadio('wmPos', w.position);
  $('#wmSize').value = w.size;
  $('#wmOpacity').value = w.opacity;
  $('#introTitle').value = s.intro.title || '';
  $('#introSub').value = s.intro.subtitle || '';
  $('#outroText').value = s.outro.text || '';
  $('#musicVol').value = s.music.volume;
  syncUI();
}

function syncUI() {
  const s = getSettings();
  const r = s.rate;
  $('#rateVal').textContent = r === 0 ? 'Normal' : `${r > 0 ? '+' : ''}${r}%`;
  $('#musicVolVal').textContent = `${s.music.volume}%`;
  $('#wmSizeVal').textContent = `${s.watermark.size}%`;
  $('#wmOpacityVal').textContent = `${s.watermark.opacity}%`;

  $('#capFields').classList.toggle('off', !s.captions.on);

  const t = s.watermark.type;
  $('#wmTextWrap').hidden = t !== 'text';
  $('#wmLogoWrap').hidden = t !== 'image';
  $('#wmOptions').hidden = t === 'none';

  $('#musicVolWrap').hidden = !state.musicData;

  if (!state.current) el.monitor.dataset.format = s.format;
  updateCapPreview(s.captions);
}

function updateCapPreview(c) {
  const prev = $('#capPreview');
  const t = $('#capText');
  prev.dataset.pos = c.position;
  prev.dataset.size = c.size;
  const sample = 'Every great day starts before sunrise'.split(' ');
  const txt = sample.slice(0, c.words === 2 ? 2 : c.words === 4 ? 4 : 6).join(' ');
  t.textContent = c.upper ? txt.toUpperCase() : txt;
  t.style.fontFamily = `"${c.font}", sans-serif`;
  t.style.color = c.color;
  t.classList.toggle('box', c.box);
  if (c.box) {
    t.style.background = hexToRgba(c.outline, 0.85);
    t.style.setProperty('-webkit-text-stroke', '0');
  } else {
    t.style.background = 'transparent';
    t.style.setProperty('-webkit-text-stroke', `0.5cqw ${c.outline}`);
  }
}

function applyCapStyle(name) {
  const st = CAP_STYLES[name];
  if (!st) return;
  $('#capColor').value = st.color.toLowerCase();
  $('#capOutline').value = st.outline.toLowerCase();
  $('#capBox').checked = st.box;
  $('#capUpper').checked = st.upper;
  fontDd.set(st.font, true);
  setRadio('capAnim', st.anim);
  syncUI();
  persist();
}

$$('[data-capstyle]').forEach((b) => b.addEventListener('click', () => applyCapStyle(b.dataset.capstyle)));

$$('[data-preset]').forEach((b) =>
  b.addEventListener('click', () => {
    applySettings(deepMerge(getSettings(), PRESETS[b.dataset.preset]));
    persist();
    toast(`${b.textContent} settings applied`);
  })
);

// settings tabs
function selectPane(name, focus = false) {
  $$('.tabbar [role="tab"]').forEach((t) => {
    const on = t.dataset.pane === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  });
  $$('.pane').forEach((p) => { p.hidden = p.id !== `pane-${name}`; });
}
$$('.tabbar [role="tab"]').forEach((t, i, all) => {
  t.addEventListener('click', () => selectPane(t.dataset.pane));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); selectPane(all[(i + 1) % all.length].dataset.pane, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); selectPane(all[(i - 1 + all.length) % all.length].dataset.pane, true); }
  });
});

$('.settings').addEventListener('input', () => { syncUI(); persist(); });
$('.settings').addEventListener('change', () => { syncUI(); persist(); });

// music upload
$('#musicPick').addEventListener('click', () => $('#musicFile').click());
$('#musicFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (f.size > 15 * 1024 * 1024) { toast('That music file is larger than 15 MB.', 'error'); return; }
  const fr = new FileReader();
  fr.onload = () => {
    state.musicData = fr.result;
    $('#musicName').textContent = f.name;
    $('#musicClear').hidden = false;
    syncUI();
  };
  fr.readAsDataURL(f);
});
$('#musicClear').addEventListener('click', () => {
  state.musicData = null;
  $('#musicName').textContent = 'No file chosen';
  $('#musicClear').hidden = true;
  syncUI();
});

// logo upload (resized in the browser so the upload stays small)
$('#wmPick').addEventListener('click', () => $('#wmFile').click());
$('#wmFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const img = new Image();
  const url = URL.createObjectURL(f);
  img.onload = () => {
    const scale = Math.min(1, 600 / img.width);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    state.logoData = c.toDataURL('image/png');
    URL.revokeObjectURL(url);
    $('#wmPreview').src = state.logoData;
    $('#wmPreview').hidden = false;
    $('#wmName').textContent = f.name;
    $('#wmClear').hidden = false;
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('That image could not be read.', 'error'); };
  img.src = url;
});
$('#wmClear').addEventListener('click', () => {
  state.logoData = null;
  $('#wmPreview').hidden = true;
  $('#wmName').textContent = 'No file chosen';
  $('#wmClear').hidden = true;
});

// ---------- Editor ----------
function spokenWords(text) {
  const skip = /^\s*(visual|keywords?|style|scene|sfx|music|title|cartoon title|characters?|setting|note)\b/i;
  const spoken = text.split('\n').filter((l) => !skip.test(l) && /^\s*[A-Za-z][\w'’ ()-]{0,28}:\s*\S/.test(l));
  if (spoken.length >= 2) return spoken.reduce((a, l) => a + l.replace(/^[^:]*:/, '').trim().split(/\s+/).length, 0);
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function updateCount() {
  const text = el.script.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const scenes = (text.match(/^\s*scene\s*\d+/gim) || []).length;
  const secs = Math.round(spokenWords(text) / 2.5);
  let msg = `${words} ${words === 1 ? 'word' : 'words'}`;
  if (scenes) msg += `, ${scenes} scenes`;
  if (secs) msg += `, about ${fmtDur(secs)} of video`;
  if (text.length > 18000) msg += ', close to the 20,000 character limit';
  el.count.textContent = msg;
  el.count.classList.toggle('warn', text.length > 18000);
  store.set('draft', text);
}
el.script.addEventListener('input', updateCount);
el.script.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generate(); }
});

function nextSample() {
  if (!state.sampleQueue.length) {
    const q = SAMPLES.map((_, i) => i);
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    if (q[0] === state.lastSample) q.push(q.shift());
    state.sampleQueue = q;
  }
  state.lastSample = state.sampleQueue.shift();
  return SAMPLES[state.lastSample];
}

$('#btnSample').addEventListener('click', () => {
  const s = nextSample();
  el.script.value = s.text;
  updateCount();
  toast(`Sample loaded: ${s.title}`);
});

$('#btnPaste').addEventListener('click', async () => {
  try {
    el.script.value = await navigator.clipboard.readText();
    updateCount();
  } catch (e) {
    toast('Your browser blocked clipboard access. Paste with Ctrl + V instead.', 'error');
    el.script.focus();
  }
});

$('#btnOpenFile').addEventListener('click', () => $('#scriptFile').click());
$('#scriptFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (f.size > 500 * 1024) { toast('That file is too large for a script.', 'error'); return; }
  const fr = new FileReader();
  fr.onload = () => { el.script.value = String(fr.result); updateCount(); toast(`Opened ${f.name}`); };
  fr.readAsText(f);
});

$('#btnClear').addEventListener('click', () => {
  el.script.value = '';
  updateCount();
  el.script.focus();
});

function newScript() {
  if (state.busy) { toast('A video is still rendering. Wait for it to finish.', 'error'); return; }
  el.script.value = '';
  updateCount();
  resetStage();
  go('create');
  el.script.focus();
}
$('#newBtn').addEventListener('click', newScript);
$('#libNew').addEventListener('click', newScript);

// ---------- Stage ----------
const STEP_ORDER = ['analyze', 'scenes', 'join', 'done'];

function renderSteps(v) {
  const items = $$('li', el.steps);
  items.forEach((li) => li.classList.remove('done', 'active'));
  if (!v) return;
  if (v.status === 'done') { items.forEach((li) => li.classList.add('done')); return; }
  const idx = STEP_ORDER.indexOf(v.step || 'analyze');
  items.forEach((li, i) => {
    if (i < idx) li.classList.add('done');
    else if (i === idx && v.status !== 'error') li.classList.add('active');
  });
}

function renderTimeline(v) {
  const scenes = (v && v.scenes) || [];
  el.timeline.replaceChildren();
  if (!scenes.length) {
    el.timeline.append(h('p', { class: 'timeline-empty' }, 'Scenes appear here as a timeline once your script is read.'));
    return;
  }
  scenes.forEach((s, i) => {
    const finished = v.status === 'done' || i < (v.current || 0);
    const active = v.status === 'processing' && v.step === 'scenes' && i === (v.current || 0);
    const cls = ['seg-clip', finished ? 'done' : '', active ? 'active' : '', s.text ? '' : 'silent'].join(' ').trim();
    el.timeline.append(h('div', {
      class: cls, role: 'listitem',
      title: `Scene ${i + 1}: ${s.text || s.visual || 'silent scene'}`,
      style: `flex: ${Math.max(s.duration || 3, 1)} 1 0`,
    }, h('span', {}, String(i + 1))));
  });
}

function renderBreakdown(v) {
  const scenes = (v && v.scenes) || [];
  el.breakdown.hidden = !scenes.length;
  el.sceneList.replaceChildren();
  scenes.forEach((s, i) => {
    let thumb;
    if (s.thumb) {
      thumb = h('img', { class: 'scene-thumb', src: s.thumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', onerror: (e) => { e.target.style.visibility = 'hidden'; } });
    } else {
      thumb = h('div', { class: 'scene-thumb empty' }, icon('film', 20));
    }
    el.sceneList.append(
      h('li', {},
        h('div', { class: 'scene-n' }, `Scene ${i + 1}`),
        thumb,
        h('div', {},
          h('div', { class: `scene-text ${s.text ? '' : 'none'}` },
            s.text ? `${s.speaker === 'character' ? 'Character: ' : 'Narrator: '}${s.text}` : 'No spoken line, plays silently'),
          s.visual ? h('div', { class: 'scene-vis' }, s.visual) : null,
          h('div', { class: 'scene-kw' }, (s.keywords || []).map((k) => h('span', { class: 'kw' }, k)))
        )
      )
    );
  });
}

function renderWarnings(v) {
  const list = v && v.status !== 'processing' ? v.warnings || [] : [];
  el.warnings.replaceChildren(...list.map((w) => h('li', {}, w)));
  el.warnings.hidden = !list.length;
}

function setStatus(text, kind = '') {
  el.status.textContent = text;
  el.status.className = `status ${kind}`.trim();
}

function setBusy(busy) {
  state.busy = busy;
  el.go.disabled = busy;
  el.goLabel.textContent = busy ? 'Rendering...' : 'Generate video';
  el.rec.hidden = !busy;
}

function resetStage() {
  state.current = null;
  el.player.pause();
  el.player.removeAttribute('src');
  el.player.removeAttribute('poster');
  el.player.load();
  el.player.hidden = true;
  el.idle.hidden = false;
  el.resultBar.hidden = true;
  el.monitor.dataset.format = radio('format');
  renderSteps(null);
  renderTimeline(null);
  renderBreakdown(null);
  renderWarnings(null);
  setStatus('Waiting for a script.');
}

function showVideo(v) {
  state.current = v;
  const url = `/output/${v.videoFile}`;
  el.player.poster = v.posterFile ? `/output/${v.posterFile}` : '';
  el.player.src = url;
  el.player.hidden = false;
  el.idle.hidden = true;
  el.monitor.dataset.format = (v.options && v.options.format) || 'landscape';
  el.resultBar.hidden = false;
  const dl = $('#btnDownload');
  dl.href = url;
  dl.setAttribute('download', `scriptreel-${String(v._id).slice(-6)}.mp4`);
  $('#btnOpen').href = url;
  const srt = $('#btnSrt');
  srt.hidden = !v.srtFile;
  if (v.srtFile) { srt.href = `/output/${v.srtFile}`; srt.setAttribute('download', `scriptreel-${String(v._id).slice(-6)}.srt`); }
}

function renderJob(v) {
  renderSteps(v);
  renderTimeline(v);
  renderBreakdown(v);
  renderWarnings(v);
  if (v.status === 'error') { console.error('Render failed:', v.error); setStatus('Something went wrong while making this video. Please try again.', 'error'); }
  else if (v.status === 'done') setStatus(`Ready. ${(v.scenes || []).length} scenes, ${fmtDur(videoDuration(v))} long.`, 'ok');
  else setStatus(v.progress);
}

// ---------- Generate and poll ----------
async function generate(plan = null) {
  if (state.busy) return;
  const script = el.script.value.trim();
  if (!script) { toast('Write or paste a script first.', 'error'); el.script.focus(); return; }

  const settings = getSettings();
  if (settings.watermark.type === 'image' && !state.logoData) { toast('Choose a logo image in the Brand tab, or switch the watermark off.', 'error'); selectPane('brand'); return; }
  if (settings.watermark.type === 'text' && !settings.watermark.text.trim()) { toast('Type your watermark text in the Brand tab, or switch the watermark off.', 'error'); selectPane('brand'); return; }

  setBusy(true);
  resetStage();
  el.idle.querySelector('p').textContent = 'Rendering. This usually takes a minute or two.';
  setStatus('Starting...');
  try {
    const body = { script, ...settings };
    if (plan) body.plan = plan;
    if (settings.watermark.type === 'image') body.watermarkImage = state.logoData;
    if (state.musicData) body.musicFile = state.musicData;
    const { id } = await api('POST', '/api/videos', body);
    state.activeId = id;
    store.set('activeJob', id);
    poll(id);
  } catch (e) {
    setBusy(false);
    setStatus(e.message, 'error');
    toast(e.message, 'error');
  }
}
el.go.addEventListener('click', () => generate());

async function poll(id, failures = 0) {
  if (state.activeId !== id) return;
  try {
    const v = await api('GET', `/api/videos/${id}`);
    renderJob(v);
    el.rec.hidden = false;
    if (v.status === 'done') {
      finishJob(); showVideo(v); toast('Your video is ready.'); loadLibrary(true);
      store.set('welcomeSeen', '1'); syncWelcome();
    } else if (v.status === 'error') {
      finishJob(); toast('The video could not be finished.', 'error'); loadLibrary(true);
    } else {
      setBusy(true);
      setTimeout(() => poll(id), 1500);
    }
  } catch (e) {
    if (e.status === 404) { finishJob(); resetStage(); return; }
    if (failures >= 4) {
      finishJob();
      setStatus('Lost connection to the server. Please refresh the page and try again.', 'error');
      return;
    }
    setTimeout(() => poll(id, failures + 1), 2000);
  }
}

function finishJob() {
  state.activeId = null;
  store.del('activeJob');
  setBusy(false);
  el.idle.querySelector('p').textContent = 'Your video appears here when it is ready.';
}

// ---------- Result actions ----------
$('#btnCopyScript').addEventListener('click', async () => {
  if (!state.current) return;
  try { await navigator.clipboard.writeText(state.current.script); toast('Script copied'); }
  catch (e) { toast('Could not copy. Select the text and copy it manually.', 'error'); }
});

$('#btnDeleteCurrent').addEventListener('click', async () => {
  if (!state.current) return;
  const ok = await confirmDialog('Delete this video?', 'The video file and its saved script will be removed. This cannot be undone.');
  if (!ok) return;
  try {
    await api('DELETE', `/api/videos/${state.current._id}`);
    resetStage();
    toast('Video deleted');
    loadLibrary(true);
  } catch (e) { toast(e.message, 'error'); }
});

// ---------- Library ----------
async function loadLibrary(silent = false) {
  try {
    state.lib = await api('GET', '/api/videos');
  } catch (e) {
    if (!silent) $('#libStats').textContent = 'Could not load your library.';
    return;
  }
  const pill = $('#libCount');
  pill.textContent = state.lib.length;
  pill.hidden = !state.lib.length;
  renderLibrary();
  renderRecent();

  clearTimeout(state.libTimer);
  const working = state.lib.some((v) => v.status === 'queued' || v.status === 'processing');
  if (working && !$('#view-library').hidden) state.libTimer = setTimeout(() => loadLibrary(true), 3000);
}

function matchesFilter(v) {
  if (state.filter === 'done') return v.status === 'done';
  if (state.filter === 'error') return v.status === 'error';
  if (state.filter === 'working') return v.status === 'queued' || v.status === 'processing';
  return true;
}

function renderLibrary() {
  const all = state.lib;
  const totalSec = all.reduce((a, v) => a + videoDuration(v), 0);
  $('#libStats').textContent = all.length
    ? `${all.length} ${all.length === 1 ? 'video' : 'videos'}, ${fmtDur(totalSec)} of footage in total`
    : 'Everything you generate is saved here.';
  $('#libClear').hidden = !all.length;
  renderTiles(all);

  const q = state.query.trim().toLowerCase();
  const rows = sortRows(all.filter((v) => matchesFilter(v) && (!q || v.script.toLowerCase().includes(q))));
  const list = $('#reels');
  list.replaceChildren();
  list.classList.toggle('grid', state.view === 'grid');

  if (!rows.length) {
    list.append(
      h('li', { class: 'empty' },
        h('p', {}, all.length ? 'No videos match your search or filter.' : 'No videos yet. Your first one takes about a minute.'),
        all.length ? null : h('button', { class: 'btn primary', type: 'button', onclick: newScript }, 'Create your first video')
      )
    );
    return;
  }

  rows.forEach((v) => {
    const isDone = v.status === 'done' && v.videoFile && !v.fileMissing;
    const url = `/output/${v.videoFile}`;
    const thumb = h('div', { class: 'thumb' });
    if (isDone && v.posterFile) thumb.append(h('img', { src: `/output/${v.posterFile}`, alt: '', loading: 'lazy' }));
    else if (isDone) thumb.append(h('video', { src: `${url}#t=0.6`, preload: 'metadata', muted: true, playsinline: true, tabindex: '-1' }));
    else thumb.append(icon('film', 28));

    const label = v.fileMissing ? 'Expired' : { done: 'Ready', error: 'Failed', queued: 'In progress', processing: 'In progress' }[v.status] || v.status;
    const kind = v.fileMissing ? 'error' : v.status === 'processing' || v.status === 'queued' ? 'working' : v.status;
    const opts = v.options || {};

    const actions = h('div', { class: 'reel-actions' },
      isDone ? h('button', { class: 'btn primary sm', type: 'button', onclick: () => { showVideo(v); renderJob(v); go('create'); } }, icon('play', 16), 'Watch') : null,
      isDone ? h('a', { class: 'btn ghost sm', href: url, download: `scriptreel-${String(v._id).slice(-6)}.mp4` }, icon('download', 16), 'Download') : null,
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => reuse(v) }, icon('reuse', 16), 'Reuse'),
      h('button', { class: 'btn danger sm', type: 'button', 'aria-label': 'Delete this video', onclick: () => deleteOne(v) }, icon('trash', 16), 'Delete')
    );

    list.append(
      h('li', { class: 'reel' },
        thumb,
        h('div', {},
          h('div', { class: 'reel-title' }, titleOf(v.script)),
          h('div', { class: 'reel-meta' },
            h('span', { class: `tag ${kind}` }, label),
            (v.scenes || []).length ? h('span', {}, `${v.scenes.length} scenes`) : null,
            isDone ? h('span', {}, fmtDur(videoDuration(v))) : null,
            opts.format === 'portrait' ? h('span', {}, 'Vertical') : null,
            h('span', {}, fmtDate(v.createdAt))
          )
        ),
        actions
      )
    );
  });
}

function reuse(v) {
  if (state.busy) { toast('A video is still rendering. Wait for it to finish.', 'error'); return; }
  resetStage();
  el.script.value = v.script;
  applySettings(v.options || {});
  const needsLogo = v.options && v.options.watermark && v.options.watermark.type === 'image' && !state.logoData;
  if (needsLogo) setRadio('wmType', 'none');
  syncUI();
  persist();
  updateCount();
  go('create');
  toast(needsLogo ? 'Script and settings loaded. Add your logo again if you want it.' : 'Script and settings loaded');
}

async function deleteOne(v) {
  const ok = await confirmDialog('Delete this video?', `"${titleOf(v.script)}" and its video file will be removed. This cannot be undone.`);
  if (!ok) return;
  try {
    await api('DELETE', `/api/videos/${v._id}`);
    if (state.current && state.current._id === v._id) resetStage();
    toast('Video deleted');
    loadLibrary(true);
  } catch (e) { toast(e.message, 'error'); }
}

$('#libClear').addEventListener('click', async () => {
  const n = state.lib.length;
  if (!n) return;
  const ok = await confirmDialog('Delete everything?', `All ${n} ${n === 1 ? 'video' : 'videos'} and their scripts will be removed. This cannot be undone.`, 'Delete all');
  if (!ok) return;
  try {
    await api('DELETE', '/api/videos');
    resetStage();
    toast('Library cleared');
    loadLibrary(true);
  } catch (e) { toast(e.message, 'error'); }
});

$('#libRefresh').addEventListener('click', () => loadLibrary());
$('#libSearch').addEventListener('input', (e) => { state.query = e.target.value; renderLibrary(); });
$$('.chip[data-filter]').forEach((c) =>
  c.addEventListener('click', () => {
    state.filter = c.dataset.filter;
    $$('.chip[data-filter]').forEach((x) => x.classList.toggle('on', x === c));
    renderLibrary();
  })
);

// ---------- Guide ----------
$('#promptText').textContent = PROMPT;
$('#exampleText').textContent = SAMPLES[0].text;
$('#btnCopyPrompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(PROMPT); toast('Prompt copied. Paste it into ChatGPT.'); }
  catch (e) { toast('Could not copy. Open "Show the prompt" and copy it by hand.', 'error'); }
});
$('#btnUseExample').addEventListener('click', () => {
  el.script.value = SAMPLES[0].text;
  updateCount();
  go('create');
  toast('Example loaded. Press Generate video.');
});

// ---------- Accent colour ----------
function setAccent(name) {
  if (name === 'blue') delete document.documentElement.dataset.accent;
  else document.documentElement.dataset.accent = name;
  store.set('accent', name);
  $$('.swatch').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.accent === name)));
}
function closeAccentMenu() {
  $('#accentMenu').hidden = true;
  $('#accentBtn').setAttribute('aria-expanded', 'false');
}
$('#accentBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const menu = $('#accentMenu');
  menu.hidden = !menu.hidden;
  $('#accentBtn').setAttribute('aria-expanded', String(!menu.hidden));
});
$$('.swatch').forEach((b) => b.addEventListener('click', () => { setAccent(b.dataset.accent); closeAccentMenu(); }));
document.addEventListener('click', (e) => { if (!$('#accentMenu').hidden && !e.target.closest('.pal-wrap')) closeAccentMenu(); });

// ---------- Welcome tip ----------
function syncWelcome() { $('#welcome').hidden = !!store.get('welcomeSeen'); }
$('#welcomeClose').addEventListener('click', () => { store.set('welcomeSeen', '1'); syncWelcome(); });
$('#welcomeTry').addEventListener('click', () => {
  $('#btnSample').click();
  el.script.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// ---------- Write with AI ----------
const LANG_VOICES = {
  Urdu: ['ur-PK-AsadNeural', 'ur-PK-UzmaNeural'], Hindi: ['hi-IN-MadhurNeural', 'hi-IN-SwaraNeural'],
  Arabic: ['ar-SA-HamedNeural', 'ar-SA-ZariyahNeural'], Spanish: ['es-ES-AlvaroNeural', 'es-ES-ElviraNeural'],
  French: ['fr-FR-HenriNeural', 'fr-FR-DeniseNeural'], German: ['de-DE-ConradNeural', 'de-DE-KatjaNeural'],
  Portuguese: ['pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural'], Turkish: ['tr-TR-AhmetNeural', 'tr-TR-EmelNeural'],
};

$('#btnWrite').addEventListener('click', () => {
  const d = $('#writer');
  if (!d.showModal) { toast('Please update your browser to use this feature.', 'error'); return; }
  d.showModal();
  $('#wTopic').focus();
});
$('#wCancel').addEventListener('click', () => $('#writer').close());
$('#wGo').addEventListener('click', async () => {
  const topic = $('#wTopic').value.trim();
  if (topic.length < 3) { toast('Tell me what the video is about first.', 'error'); $('#wTopic').focus(); return; }
  const lang = radio('wLang');
  const btn = $('#wGo');
  btn.disabled = true;
  $('#wGoLabel').textContent = 'Writing...';
  try {
    const { script } = await api('POST', '/api/write', {
      topic, tone: radio('wTone'), seconds: +radio('wLen'), style: radio('wStyle'), language: lang,
    });
    el.script.value = script;
    updateCount();
    const pair = LANG_VOICES[lang];
    if (pair) { voiceDd.set(pair[0]); charDd.set(pair[1]); }
    $('#writer').close();
    toast(pair ? `Script written. The voices were switched to ${lang}.` : 'Script written. Press Generate video, or Review scenes first.');
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.disabled = false;
    $('#wGoLabel').textContent = 'Write script';
  }
});

// ---------- Saved settings ----------
function myPresets() { try { return JSON.parse(store.get('presets') || '[]'); } catch (e) { return []; } }

function renderMyPresets() {
  const list = myPresets();
  const wrap = $('#myPresets');
  wrap.hidden = !list.length;
  wrap.replaceChildren(...list.map((p, i) => h('span', { class: 'chip-group' },
    h('button', { class: 'chip', type: 'button', onclick: () => { applySettings(deepMerge(getSettings(), p.settings)); persist(); toast(`${p.name} applied`); } }, p.name),
    h('button', {
      class: 'chip-x', type: 'button', 'aria-label': `Delete the saved settings ${p.name}`,
      onclick: () => { const l = myPresets(); l.splice(i, 1); store.set('presets', JSON.stringify(l)); renderMyPresets(); },
    }, icon('x', 12)))));
}

$('#savePreset').addEventListener('click', () => {
  $('#presetName').value = '';
  $('#nameDlg').returnValue = '';
  $('#nameDlg').showModal();
  $('#presetName').focus();
});
$('#presetName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#presetOk').click(); } });
$('#nameDlg').addEventListener('close', () => {
  if ($('#nameDlg').returnValue !== 'ok') return;
  const name = $('#presetName').value.trim().slice(0, 30);
  if (!name) return;
  const s = getSettings();
  s.music.on = false;
  const list = myPresets().filter((p) => p.name !== name);
  list.push({ name, settings: s });
  store.set('presets', JSON.stringify(list.slice(-8)));
  renderMyPresets();
  toast(`Saved "${name}"`);
});

// ---------- Shortcuts ----------
$('#btnShortcuts').addEventListener('click', () => $('#shortcuts').showModal());
document.addEventListener('keydown', (e) => {
  if (e.key === '?' && !e.target.closest('input, textarea, select') && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    $('#shortcuts').showModal();
  }
});

// ---------- Drop a text file onto the script box ----------
['dragenter', 'dragover'].forEach((ev) => el.script.addEventListener(ev, (e) => { e.preventDefault(); el.script.classList.add('drop'); }));
['dragleave', 'drop'].forEach((ev) => el.script.addEventListener(ev, () => el.script.classList.remove('drop')));
el.script.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files[0];
  if (!f) return;
  if (f.size > 500 * 1024) { toast('That file is too large for a script.', 'error'); return; }
  const fr = new FileReader();
  fr.onload = () => { el.script.value = String(fr.result); updateCount(); toast(`Opened ${f.name}`); };
  fr.readAsText(f);
});

// ---------- Recent videos ----------
function renderRecent() {
  const recent = state.lib.filter((v) => v.status === 'done' && v.videoFile && !v.fileMissing).slice(0, 4);
  $('#recent').hidden = !recent.length;
  $('#recentRow').replaceChildren(...recent.map((v) => h('button', {
    class: 'recent-item', type: 'button', title: 'Watch this video',
    onclick: () => {
      if (state.busy) { toast('A video is still rendering. Wait for it to finish.', 'error'); return; }
      showVideo(v); renderJob(v); window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  }, h('span', { class: 'rimg' }, v.posterFile ? h('img', { src: `/output/${v.posterFile}`, alt: '', loading: 'lazy' }) : icon('film', 24)),
  h('span', { class: 't' }, titleOf(v.script)))));
}

// ---------- Library: sort and view ----------
function sortRows(rows) {
  const r = [...rows];
  if (state.sort === 'old') r.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  else if (state.sort === 'long') r.sort((a, b) => videoDuration(b) - videoDuration(a));
  else r.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return r;
}

function renderTiles(all) {
  const box = $('#libTiles');
  box.hidden = !all.length;
  if (!all.length) return;
  const done = all.filter((v) => v.status === 'done').length;
  const tiles = [
    [all.length, all.length === 1 ? 'Video made' : 'Videos made'],
    [fmtDur(all.reduce((a, v) => a + videoDuration(v), 0)), 'Total length'],
    [all.reduce((a, v) => a + (v.scenes || []).length, 0), 'Scenes'],
    [`${Math.round((done / all.length) * 100)}%`, 'Finished without errors'],
  ];
  box.replaceChildren(...tiles.map(([n, label]) => h('div', { class: 'tile' }, h('b', {}, String(n)), h('span', {}, label))));
}

function syncLibControls() {
  $$('.chip[data-sort]').forEach((x) => x.classList.toggle('on', x.dataset.sort === state.sort));
  [['viewList', 'list'], ['viewGrid', 'grid']].forEach(([id, v]) => {
    const b = $(`#${id}`);
    b.classList.toggle('on', state.view === v);
    b.setAttribute('aria-pressed', String(state.view === v));
  });
}
$$('.chip[data-sort]').forEach((c) => c.addEventListener('click', () => {
  state.sort = c.dataset.sort; store.set('libSort', state.sort); syncLibControls(); renderLibrary();
}));
$('#viewList').addEventListener('click', () => { state.view = 'list'; store.set('libView', 'list'); syncLibControls(); renderLibrary(); });
$('#viewGrid').addEventListener('click', () => { state.view = 'grid'; store.set('libView', 'grid'); syncLibControls(); renderLibrary(); });

// ---------- Scene editor ----------
const studio = { scenes: [], style: 'film', snapshot: '', warning: null, loading: false };
let studioSeq = 0;
const newScene = (o = {}) => ({
  id: ++studioSeq, text: '', speaker: 'narrator', visual: '', keywords: [], media: null,
  picker: false, results: null, searching: false, query: '', pickError: '', ...o,
});
const wordsOf = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

function updateStudioSum() {
  const n = studio.scenes.length;
  const secs = studio.scenes.reduce((a, s) => a + (s.text.trim() ? Math.max(3, wordsOf(s.text) / 2.5 + 0.4) : 4), 0);
  $('#studioSum').textContent = `${n} ${n === 1 ? 'scene' : 'scenes'}, about ${fmtDur(secs)} of video`;
}

function iconBtn(name, label, disabled, onclick) {
  return h('button', { type: 'button', class: 'icon-btn sm', title: label, 'aria-label': label, disabled: !!disabled, onclick }, icon(name, 16));
}

function autosize(t) { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight + 2, 260)}px`; }

function sceneCard(s, i) {
  const total = studio.scenes.length;
  const speakerBtn = (value, label) => h('button', {
    type: 'button', 'aria-pressed': String(s.speaker === value),
    onclick: () => { s.speaker = value; refreshCard(s); },
  }, label);

  const text = h('textarea', {
    class: 'input sc-text', rows: '2', 'aria-label': `Words spoken in scene ${i + 1}`,
    placeholder: 'What the voice says. Leave this empty for a silent scene.',
    oninput: (e) => { s.text = e.target.value; autosize(e.target); updateStudioSum(); },
  });
  text.value = s.text;

  const kw = h('input', {
    class: 'input', type: 'text', 'aria-label': `Search words for scene ${i + 1}`,
    placeholder: 'dog, park, sunny day',
    oninput: (e) => { s.keywords = e.target.value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4); },
  });
  kw.value = s.keywords.join(', ');

  const vis = h('input', {
    class: 'input', type: 'text', 'aria-label': `What is on screen in scene ${i + 1}`,
    placeholder: 'A dog running in a park',
    oninput: (e) => { s.visual = e.target.value; },
  });
  vis.value = s.visual;

  const m = s.media;
  const foot = h('div', { class: 'sc-foot' },
    m && m.thumb
      ? h('img', { class: 'sc-thumb', src: m.thumb, alt: 'Chosen footage', referrerpolicy: 'no-referrer' })
      : h('div', { class: 'sc-thumb' }, icon(m ? 'film' : 'wand', 20)),
    h('div', { class: 'sc-foot-text' },
      h('strong', {}, m ? `You chose a ${m.kind === 'image' ? 'photo' : 'video'}` : 'Footage is picked automatically'),
      h('span', {}, m ? 'It is used for the first shot of this scene.' : 'The best match for the search words is used.')),
    h('div', { class: 'sc-foot-actions' },
      h('button', { class: 'btn ghost sm', type: 'button', onclick: () => togglePicker(s) }, icon('image', 16), s.picker ? 'Hide footage' : 'Choose footage'),
      m ? h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { s.media = null; refreshCard(s); } }, 'Use automatic') : null));

  const card = h('article', { class: 'scene-card', 'data-id': String(s.id) },
    h('div', { class: 'sc-head' },
      h('strong', {}, `Scene ${i + 1}`),
      h('div', { class: 'sc-speaker', role: 'group', 'aria-label': 'Who speaks' }, speakerBtn('narrator', 'Narrator'), speakerBtn('character', 'Character')),
      h('div', { class: 'sc-tools' },
        iconBtn('up', 'Move up', i === 0, () => moveScene(s.id, -1)),
        iconBtn('chevron', 'Move down', i === total - 1, () => moveScene(s.id, 1)),
        iconBtn('copy', 'Duplicate scene', false, () => dupScene(s.id)),
        iconBtn('trash', 'Delete scene', total <= 1, () => delScene(s.id)))),
    text,
    h('div', { class: 'sc-grid' },
      h('label', {}, h('span', { class: 'sc-label' }, 'Search words (English)'), kw),
      h('label', {}, h('span', { class: 'sc-label' }, 'What is on screen'), vis)),
    foot,
    s.picker ? pickerBlock(s) : null);
  requestAnimationFrame(() => autosize(text));
  return card;
}

function pickerBlock(s) {
  const input = h('input', {
    class: 'input', type: 'text', 'aria-label': 'Search for footage', placeholder: 'What should we look for? (in English)',
    onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); searchFootage(s, e.target.value); } },
  });
  input.value = s.query;
  let content = null;
  if (s.searching) content = h('p', { class: 'picker-msg' }, 'Searching...');
  else if (s.pickError) content = h('p', { class: 'picker-msg' }, s.pickError);
  else if (s.results && !s.results.length) content = h('p', { class: 'picker-msg' }, 'Nothing found. Try different words.');
  else if (s.results) {
    content = h('div', { class: 'pick-grid' }, s.results.map((r) => h('button', {
      type: 'button', class: `pick${s.media && s.media.id === r.id ? ' sel' : ''}`, title: r.tags || '',
      'aria-label': `Use this ${r.kind === 'image' ? 'photo' : 'video'}${r.tags ? `: ${r.tags}` : ''}`,
      onclick: () => { s.media = { kind: r.kind, url: r.url, id: r.id, thumb: r.thumb }; s.picker = false; refreshCard(s); },
    }, r.thumb ? h('img', { src: r.thumb, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : null,
    h('span', { class: 'badge' }, r.kind === 'image' ? 'Photo' : 'Video'))));
  }
  return h('div', { class: 'picker' },
    h('div', { class: 'picker-search' }, input,
      h('button', { class: 'btn primary sm', type: 'button', onclick: () => searchFootage(s, input.value) }, icon('search', 16), 'Search')),
    content);
}

function refreshCard(s) {
  const old = $(`#studioBody [data-id="${s.id}"]`);
  if (!old) return;
  old.replaceWith(sceneCard(s, studio.scenes.findIndex((x) => x.id === s.id)));
}

async function searchFootage(s, q) {
  q = String(q || '').trim();
  if (!q) return;
  s.query = q; s.searching = true; s.pickError = '';
  refreshCard(s);
  try {
    const st = getSettings();
    const params = new URLSearchParams({
      q, style: studio.style, source: st.source, orientation: st.format === 'portrait' ? 'vertical' : 'horizontal',
    });
    s.results = (await api('GET', `/api/footage?${params}`)).items;
  } catch (e) {
    s.pickError = e.message;
  }
  s.searching = false;
  refreshCard(s);
}

function togglePicker(s) {
  s.picker = !s.picker;
  refreshCard(s);
  if (s.picker && !s.results) {
    const q = s.keywords[0] || s.visual || s.text.split(/\s+/).slice(0, 3).join(' ');
    if (q) searchFootage(s, q);
  }
}

function moveScene(id, dir) {
  const i = studio.scenes.findIndex((x) => x.id === id);
  const j = i + dir;
  if (j < 0 || j >= studio.scenes.length) return;
  [studio.scenes[i], studio.scenes[j]] = [studio.scenes[j], studio.scenes[i]];
  renderStudio(true);
}
function dupScene(id) {
  const i = studio.scenes.findIndex((x) => x.id === id);
  const c = studio.scenes[i];
  studio.scenes.splice(i + 1, 0, newScene({ text: c.text, speaker: c.speaker, visual: c.visual, keywords: [...c.keywords], media: c.media ? { ...c.media } : null }));
  renderStudio(true);
}
function delScene(id) {
  if (studio.scenes.length <= 1) return;
  studio.scenes = studio.scenes.filter((x) => x.id !== id);
  renderStudio(true);
}

function renderStudio(keepScroll = false) {
  const body = $('#studioBody');
  const top = body.scrollTop;
  body.replaceChildren();
  if (studio.loading) {
    body.append(h('p', { class: 'picker-msg' }, 'Reading your script and planning the scenes...'));
    for (let i = 0; i < 3; i++) body.append(h('div', { class: 'scene-card' }, h('div', { class: 'sk-line' }), h('div', { class: 'sk-line' }), h('div', { class: 'sk-line short' })));
    $('#studioSum').textContent = '';
    $('#studioGo').disabled = true;
    $('#studioAdd').disabled = true;
    return;
  }
  $('#studioGo').disabled = false;
  $('#studioAdd').disabled = false;
  if (studio.warning) body.append(h('p', { class: 'studio-note' }, studio.warning));
  studio.scenes.forEach((s, i) => body.append(sceneCard(s, i)));
  updateStudioSum();
  if (keepScroll) body.scrollTop = top;
}

async function openStudio(force = false) {
  const script = el.script.value.trim();
  if (!script) { toast('Write or paste a script first.', 'error'); el.script.focus(); return; }
  if (state.busy) { toast('A video is still rendering. Wait for it to finish.', 'error'); return; }
  const dlg = $('#studio');
  if (!dlg.showModal) { toast('Please update your browser to use this feature.', 'error'); return; }
  const reuseOld = !force && studio.snapshot === script && studio.scenes.length;
  if (!dlg.open) dlg.showModal();
  if (reuseOld) { studio.loading = false; renderStudio(); return; }
  studio.loading = true;
  renderStudio();
  try {
    const plan = await api('POST', '/api/plan', { script });
    studio.style = plan.style;
    studio.warning = plan.warning || null;
    studio.scenes = plan.scenes.map((s) => newScene({ text: s.text, speaker: s.speaker, visual: s.visual, keywords: s.keywords }));
    studio.snapshot = script;
    studio.loading = false;
    renderStudio();
  } catch (e) {
    studio.loading = false;
    dlg.close();
    toast(e.message, 'error');
  }
}

$('#btnReview').addEventListener('click', () => openStudio());
$('#studioReread').addEventListener('click', () => openStudio(true));
$('#studioClose').addEventListener('click', () => $('#studio').close());
$('#studioAdd').addEventListener('click', () => {
  const s = newScene();
  studio.scenes.push(s);
  renderStudio(true);
  const body = $('#studioBody');
  body.scrollTop = body.scrollHeight;
  const ta = $(`#studioBody [data-id="${s.id}"] textarea`);
  if (ta) ta.focus();
});
$('#studioGo').addEventListener('click', () => {
  const scenes = studio.scenes
    .map((s) => ({ text: s.text.trim(), speaker: s.speaker, visual: s.visual.trim(), keywords: s.keywords, media: s.media }))
    .filter((s) => s.text || s.visual || s.media);
  if (!scenes.length) { toast('Add some words or a picture idea to at least one scene.', 'error'); return; }
  $('#studio').close();
  generate({ style: studio.style, scenes });
});

// ---------- Accounts ----------
function initialsOf(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function colorFor(text) {
  let n = 0;
  for (const ch of String(text)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${n % 360} 55% 42%)`;
}

function avatarEl(user, extra = '') {
  if (user && user.avatar) {
    return h('img', { class: `avatar ${extra}`.trim(), src: user.avatar, alt: '', referrerpolicy: 'no-referrer' });
  }
  const s = h('span', { class: `avatar initials ${extra}`.trim() }, initialsOf(user && (user.name || user.email)));
  s.style.background = colorFor((user && (user.email || user.name)) || '?');
  return s;
}

function closeAccountMenu() {
  $('#accountMenu').hidden = true;
  $('#accountBtn').setAttribute('aria-expanded', 'false');
}

function renderAccount() {
  const u = state.user;
  $('#acctWrap').hidden = !u;
  if (!u) { closeAccountMenu(); return; }
  $('#accountBtn').replaceChildren(avatarEl(u));
  $('#accountBtn').setAttribute('aria-label', `Your account, ${u.name}`);
  $('#acctAvatarBig').replaceChildren(avatarEl(u, 'big'));
  $('#acctName').textContent = u.name;
  $('#acctEmail').textContent = u.email;
  $('#acctRemove').hidden = !u.avatar;
  $('#acctChange').textContent = u.avatar ? 'Change profile photo' : 'Add a profile photo';
}

$('#accountBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const menu = $('#accountMenu');
  menu.hidden = !menu.hidden;
  $('#accountBtn').setAttribute('aria-expanded', String(!menu.hidden));
});
document.addEventListener('click', (e) => { if (!$('#accountMenu').hidden && !e.target.closest('.acct-wrap')) closeAccountMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#accountMenu').hidden) { closeAccountMenu(); $('#accountBtn').focus(); } });

// pictures are cropped to a small square in the browser before they are uploaded
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 160;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const side = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')); };
    img.src = url;
  });
}

$('#acctChange').addEventListener('click', () => { closeAccountMenu(); $('#acctFile').click(); });
$('#acctFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const { user } = await api('POST', '/api/auth/avatar', { avatar: await fileToAvatar(f) });
    state.user = user;
    renderAccount();
    toast('Profile photo updated');
  } catch (err) { toast(err.message, 'error'); }
});
$('#acctRemove').addEventListener('click', async () => {
  closeAccountMenu();
  try {
    const { user } = await api('POST', '/api/auth/avatar', { avatar: null });
    state.user = user;
    renderAccount();
    toast('Profile photo removed');
  } catch (err) { toast(err.message, 'error'); }
});
$('#acctPrivacy').addEventListener('click', () => { closeAccountMenu(); go('privacy'); });
$('#acctSignout').addEventListener('click', () => { closeAccountMenu(); signOut(); });

// ---------- Sign in / create account card ----------
function gateError(msg) {
  const e = $('#gateError');
  e.textContent = msg || '';
  e.hidden = !msg;
}

function setGateTab(which) {
  const signin = which === 'signin';
  $('#gtSignin').setAttribute('aria-selected', String(signin));
  $('#gtSignup').setAttribute('aria-selected', String(!signin));
  $('#signinForm').hidden = !signin;
  $('#signupForm').hidden = signin;
  $('#gateTitle').textContent = signin ? 'Welcome back' : 'Create your account';
  $('#gateSub').textContent = signin
    ? 'Sign in to continue to your private library.'
    : 'It takes a few seconds. Your scripts and videos stay private to you.';
  gateError('');
}

function showGate(message) {
  document.body.classList.add('gated');
  const d = $('#gate');
  const returning = !!store.get('hasAccount');
  setGateTab(returning ? 'signin' : 'signup');
  if (message) gateError(message);
  if (!d.open && d.showModal) d.showModal();
  loadGoogle();
  setTimeout(() => { const f = $(returning ? '#siEmail' : '#suName'); if (f) f.focus(); }, 60);
}

// the card cannot be closed without signing in
$('#gate').addEventListener('cancel', (e) => e.preventDefault());
$('#gtSignin').addEventListener('click', () => setGateTab('signin'));
$('#gtSignup').addEventListener('click', () => setGateTab('signup'));
['#signinForm', '#signupForm'].forEach((s) => $(s).addEventListener('input', () => gateError('')));
$('#siShow').addEventListener('change', (e) => { $('#siPass').type = e.target.checked ? 'text' : 'password'; });
$('#suShow').addEventListener('change', (e) => { $('#suPass').type = e.target.checked ? 'text' : 'password'; });

function handleSignedOut() {
  if (!state.user && $('#gate').open) return;
  state.user = null;
  renderAccount();
  showGate('Your session ended. Please sign in again.');
}

async function submitAuth(btn, busyText, idleText, request) {
  btn.disabled = true;
  btn.textContent = busyText;
  gateError('');
  try {
    const { user } = await request();
    onSignedIn(user, true);
  } catch (e) {
    gateError(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = idleText;
  }
}

$('#signinForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#siEmail').value.trim();
  const password = $('#siPass').value;
  if (!email || !password) { gateError('Enter your email and password.'); return; }
  submitAuth($('#siGo'), 'Signing in...', 'Sign in', () => api('POST', '/api/auth/login', { email, password }));
});

$('#signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#suName').value.trim();
  const email = $('#suEmail').value.trim();
  const password = $('#suPass').value;
  if (!name) { gateError('Please enter your name.'); $('#suName').focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { gateError('Please enter a valid email address.'); $('#suEmail').focus(); return; }
  if (password.length < 8) { gateError('Your password needs at least 8 characters.'); $('#suPass').focus(); return; }
  if (!$('#suAgree').checked) { gateError('Please accept the Privacy Policy to create an account.'); return; }
  submitAuth($('#suGo'), 'Creating your account...', 'Create my account',
    () => api('POST', '/api/auth/signup', { name, email, password, acceptPrivacy: true, avatar: state.signupAvatar }));
});

// profile photo while signing up
function renderSignupAvatar() {
  const prev = $('#suAvatarPrev');
  if (state.signupAvatar) {
    prev.replaceChildren(h('img', { class: 'avatar', src: state.signupAvatar, alt: 'Your profile photo' }));
  } else {
    prev.replaceChildren(icon('image', 24));
  }
  $('#suAvatarClear').hidden = !state.signupAvatar;
}
$('#suAvatarBtn').addEventListener('click', () => $('#suAvatarFile').click());
$('#suAvatarFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try { state.signupAvatar = await fileToAvatar(f); renderSignupAvatar(); }
  catch (err) { gateError(err.message); }
});
$('#suAvatarClear').addEventListener('click', () => { state.signupAvatar = null; renderSignupAvatar(); });

// Google sign-in (only appears when the site owner has set GOOGLE_CLIENT_ID)
function loadGoogle() {
  const id = state.config && state.config.googleClientId;
  if (!id || state.googleLoading) return;
  state.googleLoading = true;
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.onload = () => {
    try {
      window.google.accounts.id.initialize({ client_id: id, callback: onGoogleCredential });
      window.google.accounts.id.renderButton($('#googleBtn'), {
        theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large', shape: 'pill', text: 'continue_with', width: 340,
      });
      $('#googleWrap').hidden = false;
    } catch (e) { /* keep the email form only */ }
  };
  document.head.append(s);
}

async function onGoogleCredential(response) {
  gateError('');
  try {
    const { user } = await api('POST', '/api/auth/google', { credential: response.credential });
    onSignedIn(user, true);
  } catch (e) { gateError(e.message); }
}

function onSignedIn(user, fresh) {
  state.user = user;
  store.set('hasAccount', '1');
  renderAccount();
  const d = $('#gate');
  if (d.open) d.close();
  document.body.classList.remove('gated');
  $('#siPass').value = '';
  $('#suPass').value = '';
  if (fresh) toast(`Welcome, ${user.name.split(' ')[0]}`);
  afterAuth();
}

// everything that needs the person's own data
async function afterAuth() {
  loadLibrary(true);
  const active = store.get('activeJob');
  if (!active) return;
  try {
    const v = await api('GET', `/api/videos/${active}`);
    renderJob(v);
    if (v.status === 'done') { showVideo(v); store.del('activeJob'); }
    else if (v.status === 'error') store.del('activeJob');
    else { state.activeId = active; setBusy(true); poll(active); }
  } catch (e) { store.del('activeJob'); }
}

// forget the previous person's work on this screen
function clearLocalSession() {
  state.user = null;
  state.lib = [];
  state.activeId = null;
  setBusy(false);
  store.del('activeJob');
  store.del('draft');
  el.script.value = '';
  updateCount();
  resetStage();
  renderLibrary();
  renderRecent();
  renderAccount();
}

async function signOut() {
  try { await api('POST', '/api/auth/logout', {}); } catch (e) { /* the cookie is cleared by the next request anyway */ }
  clearLocalSession();
  showGate();
}

// ---------- Delete my account ----------
$('#acctDelete').addEventListener('click', () => {
  closeAccountMenu();
  $('#delPw').value = '';
  $('#delErr').hidden = true;
  $('#delPwWrap').hidden = !(state.user && state.user.hasPassword);
  $('#delAcct').showModal();
});
$('#delCancel').addEventListener('click', () => $('#delAcct').close());
$('#delGo').addEventListener('click', async () => {
  const btn = $('#delGo');
  btn.disabled = true;
  $('#delErr').hidden = true;
  try {
    await api('DELETE', '/api/auth/account', { password: $('#delPw').value });
    $('#delAcct').close();
    clearLocalSession();
    toast('Your account and everything in it was deleted.');
    showGate();
  } catch (e) {
    $('#delErr').textContent = e.message;
    $('#delErr').hidden = false;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Privacy Policy ----------
function applyContact() {
  const email = state.config && state.config.contactEmail;
  $$('[data-contact]').forEach((p) => {
    p.replaceChildren();
    if (email) p.append('You can contact the site owner, Anas Khalid, at ', h('a', { href: `mailto:${email}` }, email), '.');
    else p.append('You can contact the site owner, Anas Khalid, through the website where you found this service.');
  });
}

function fillPolicy() {
  const tpl = $('#policyTpl');
  ['#policyBody', '#policyDlgBody'].forEach((sel) => $(sel).replaceChildren(tpl.content.cloneNode(true)));
  applyContact();
}

function openPolicy() {
  const d = $('#policyDlg');
  if (d.showModal) { if (!d.open) d.showModal(); } else go('privacy');
}
$$('[data-open-policy]').forEach((b) => b.addEventListener('click', openPolicy));
$('#policyClose').addEventListener('click', () => $('#policyDlg').close());

async function initAuth() {
  try { state.config = await api('GET', '/api/config'); } catch (e) { state.config = {}; }
  applyContact();
  try {
    const { user } = await api('GET', '/api/auth/me');
    onSignedIn(user, false);
  } catch (e) {
    if (e.status === 401) showGate();
    else { document.body.classList.remove('gated'); toast('Could not reach the server. Please refresh the page.', 'error'); }
  }
}

// ---------- Boot ----------
async function boot() {
  hydrateIcons();
  $('#year').textContent = new Date().getFullYear();

  let saved = null;
  try { saved = JSON.parse(store.get('settings') || 'null'); } catch (e) {}
  applySettings(saved || {});
  selectPane('voice');
  setAccent(store.get('accent') || 'blue');
  syncWelcome();
  renderMyPresets();
  syncLibControls();

  el.script.value = store.get('draft') || '';
  updateCount();
  renderSteps(null);

  renderSignupAvatar();
  fillPolicy();
  route();
  await initAuth();
}
boot();
