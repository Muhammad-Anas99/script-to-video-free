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
  logoData: null, musicData: null,
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

const TABS = ['create', 'library', 'guide'];

function route() {
  let tab = location.hash.replace('#', '');
  if (!TABS.includes(tab)) tab = 'create';
  TABS.forEach((t) => { $(`#view-${t}`).hidden = t !== tab; });
  $$('.tabs a').forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (tab === 'library') loadLibrary();
  clearTimeout(state.libTimer);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
function go(tab) { if (location.hash === `#${tab}`) route(); else location.hash = tab; }

// ---------- Dropdowns ----------
const dropdowns = [];

function makeDropdown({ id, groups, onChange }) {
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
        menu.append(h('div', {
          class: 'dd-opt', role: 'option', id: `${id}-opt-${i}`, 'data-i': i, 'aria-selected': 'false',
          onclick: () => { set(flat[i].value); close(true); },
          onmousemove: () => setActive(i, false),
        }, nm, h('span', { class: 'dd-meta' }, it.meta || ''), icon('check', 16)));
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

document.addEventListener('click', (e) => {
  dropdowns.forEach((d) => { if (!d.contains(e.target)) d.close(); });
});

// ---------- Settings ----------
const radio = (name) => (($(`input[name="${name}"]:checked`) || {}).value);
const setRadio = (name, v) => { const r = $(`input[name="${name}"][value="${v}"]`); if (r) r.checked = true; };

const persist = debounce(() => store.set('settings', JSON.stringify(getSettings())), 250);

const voiceDd = makeDropdown({ id: 'voice', groups: VOICE_GROUPS('Default voice'), onChange: () => persist() });
const charDd = makeDropdown({ id: 'charVoice', groups: VOICE_GROUPS('Default voice'), onChange: () => persist() });
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
  el.count.textContent = msg;
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
async function generate() {
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
el.go.addEventListener('click', generate);

async function poll(id, failures = 0) {
  if (state.activeId !== id) return;
  try {
    const v = await api('GET', `/api/videos/${id}`);
    renderJob(v);
    el.rec.hidden = false;
    if (v.status === 'done') {
      finishJob(); showVideo(v); toast('Your video is ready.'); loadLibrary(true);
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

  const q = state.query.trim().toLowerCase();
  const rows = all.filter((v) => matchesFilter(v) && (!q || v.script.toLowerCase().includes(q)));
  const list = $('#reels');
  list.replaceChildren();

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
    const isDone = v.status === 'done' && v.videoFile;
    const url = `/output/${v.videoFile}`;
    const thumb = h('div', { class: 'thumb' });
    if (isDone && v.posterFile) thumb.append(h('img', { src: `/output/${v.posterFile}`, alt: '', loading: 'lazy' }));
    else if (isDone) thumb.append(h('video', { src: `${url}#t=0.6`, preload: 'metadata', muted: true, playsinline: true, tabindex: '-1' }));
    else thumb.append(icon('film', 28));

    const label = { done: 'Ready', error: 'Failed', queued: 'In progress', processing: 'In progress' }[v.status] || v.status;
    const kind = v.status === 'processing' || v.status === 'queued' ? 'working' : v.status;
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

// ---------- Boot ----------
async function boot() {
  hydrateIcons();
  $('#year').textContent = new Date().getFullYear();

  let saved = null;
  try { saved = JSON.parse(store.get('settings') || 'null'); } catch (e) {}
  applySettings(saved || {});
  selectPane('voice');

  el.script.value = store.get('draft') || '';
  updateCount();
  renderSteps(null);

  route();
  loadLibrary(true);

  // Resume a render that was running when the page was closed.
  const active = store.get('activeJob');
  if (active) {
    try {
      const v = await api('GET', `/api/videos/${active}`);
      renderJob(v);
      if (v.status === 'done') { showVideo(v); store.del('activeJob'); }
      else if (v.status === 'error') store.del('activeJob');
      else { state.activeId = active; setBusy(true); poll(active); }
    } catch (e) { store.del('activeJob'); }
  }
}
boot();
