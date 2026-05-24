'use strict';

// ── Fluent Emoji 3D image helper ──────────────────────────────────────────
const FLUENT = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets/';
function f3(folder, file) {
  const enc = s => s.replace(/ /g, '%20').replace(/'/g, '%27');
  return `${FLUENT}${enc(folder)}/3D/${enc(file)}_3d.png`;
}

// ── Item Pool (70 items with 3D image URLs) ───────────────────────────────
const ALL_ITEMS = [
  // Electronics & Power
  {e:'🔋',n:'Battery',           img:f3('Battery','battery')},
  {e:'🔦',n:'Flashlight',        img:f3('Flashlight','flashlight')},
  {e:'💡',n:'Light Bulb',        img:f3('Light Bulb','light_bulb')},
  {e:'📱',n:'Phone',             img:f3('Mobile Phone','mobile_phone')},
  {e:'📻',n:'Radio',             img:f3('Radio','radio')},
  {e:'🔌',n:'Charger',           img:f3('Electric Plug','electric_plug')},
  {e:'⌚',n:'Watch',             img:f3('Watch','watch')},
  {e:'📷',n:'Camera',            img:f3('Camera','camera')},
  // Tools & Hardware
  {e:'🔧',n:'Wrench',            img:f3('Wrench','wrench')},
  {e:'🔨',n:'Hammer',            img:f3('Hammer','hammer')},
  {e:'🪛',n:'Screwdriver',       img:f3('Screwdriver','screwdriver')},
  {e:'✂️',n:'Scissors',          img:f3('Scissors','scissors')},
  {e:'📏',n:'Ruler',             img:f3('Straight Ruler','straight_ruler')},
  {e:'🧲',n:'Magnet',            img:f3('Magnet','magnet')},
  {e:'🔩',n:'Bolt',              img:f3('Nut and Bolt','nut_and_bolt')},
  {e:'🪜',n:'Ladder',            img:f3('Ladder','ladder')},
  // Household Essentials
  {e:'🧼',n:'Soap',              img:f3('Soap','soap')},
  {e:'🪥',n:'Toothbrush',        img:f3('Toothbrush','toothbrush')},
  {e:'🕯️',n:'Candle',            img:f3('Candle','candle')},
  {e:'🔑',n:'Key',               img:f3('Key','key')},
  {e:'🧹',n:'Broom',             img:f3('Broom','broom')},
  {e:'🧽',n:'Sponge',            img:f3('Sponge','sponge')},
  {e:'🪣',n:'Bucket',            img:f3('Bucket','bucket')},
  {e:'🧯',n:'Fire Extinguisher', img:f3('Fire Extinguisher','fire_extinguisher')},
  // Gas & Chemicals
  {e:'⚗️',n:'Flask',             img:f3('Alembic','alembic')},
  {e:'🧪',n:'Test Tube',         img:f3('Test Tube','test_tube')},
  {e:'⛽',n:'Gas Canister',       img:f3('Fuel Pump','fuel_pump')},
  {e:'🫙',n:'Spray Can',         img:f3('Jar','jar')},
  {e:'🔥',n:'Lighter',           img:f3('Fire','fire')},
  {e:'🛢️',n:'Propane Bottle',    img:f3('Oil Drum','oil_drum')},
  // Medical & Safety
  {e:'🩹',n:'Bandage',           img:f3('Adhesive Bandage','adhesive_bandage')},
  {e:'💊',n:'Pill',              img:f3('Pill','pill')},
  {e:'🌡️',n:'Thermometer',       img:f3('Thermometer','thermometer')},
  {e:'🩺',n:'Stethoscope',       img:f3('Stethoscope','stethoscope')},
  {e:'⛑️',n:'Hard Hat',          img:f3("Rescue Worker's Helmet","rescue_worker's_helmet")},
  {e:'🦺',n:'Safety Vest',       img:f3('Safety Vest','safety_vest')},
  {e:'💉',n:'Syringe',           img:f3('Syringe','syringe')},
  // Stationery & Office
  {e:'✏️',n:'Pencil',            img:f3('Pencil','pencil')},
  {e:'🖊️',n:'Pen',               img:f3('Pen','pen')},
  {e:'📎',n:'Paper Clip',        img:f3('Paperclip','paperclip')},
  {e:'📌',n:'Thumbtack',         img:f3('Round Pushpin','round_pushpin')},
  {e:'📓',n:'Notebook',          img:f3('Notebook','notebook')},
  {e:'📁',n:'Folder',            img:f3('File Folder','file_folder')},
  // Survival & Food
  {e:'🥫',n:'Canned Food',       img:f3('Canned Food','canned_food')},
  {e:'🍫',n:'Chocolate Bar',     img:f3('Chocolate Bar','chocolate_bar')},
  {e:'🥜',n:'Peanuts',           img:f3('Peanuts','peanuts')},
  {e:'🧃',n:'Juice Box',         img:f3('Beverage Box','beverage_box')},
  {e:'💧',n:'Water Bottle',      img:f3('Droplet','droplet')},
  {e:'🍬',n:'Candy',             img:f3('Candy','candy')},
  {e:'🍪',n:'Cookies',           img:f3('Cookie','cookie')},
  {e:'🥨',n:'Crackers',          img:f3('Pretzel','pretzel')},
  // Gear & Clothing
  {e:'🧤',n:'Gloves',            img:f3('Gloves','gloves')},
  {e:'🧣',n:'Scarf',             img:f3('Scarf','scarf')},
  {e:'🎒',n:'Backpack',          img:f3('Backpack','backpack')},
  {e:'🧢',n:'Cap',               img:f3('Billed Cap','billed_cap')},
  {e:'👢',n:'Boot',              img:f3("Woman's Boot","woman's_boot")},
  {e:'🧳',n:'Suitcase',          img:f3('Luggage','luggage')},
  // Extra
  {e:'🧰',n:'Toolbox',           img:f3('Toolbox','toolbox')},
  {e:'🔐',n:'Padlock',           img:f3('Locked with Key','locked_with_key')},
  {e:'🪝',n:'Hook',              img:f3('Hook','hook')},
  {e:'🗜️',n:'Clamp',             img:f3('Clamp','clamp')},
  {e:'📡',n:'Antenna',           img:f3('Satellite Antenna','satellite_antenna')},
  {e:'🔭',n:'Telescope',         img:f3('Telescope','telescope')},
  {e:'🧊',n:'Ice Pack',          img:f3('Ice','ice')},
  {e:'🪢',n:'Rope',              img:f3('Knot','knot')},
  {e:'🧭',n:'Compass',           img:f3('Compass','compass')},
  {e:'🔬',n:'Microscope',        img:f3('Microscope','microscope')},
  {e:'📯',n:'Horn',              img:f3('Postal Horn','postal_horn')},
  {e:'🎯',n:'Dart',              img:f3('Bullseye','bullseye')},
  {e:'📐',n:'Set Square',        img:f3('Triangular Ruler','triangular_ruler')},
];

const LEVELS = [
  {items:10, time:30, label:'Starter'},
  {items:12, time:30, label:'Beginner'},
  {items:14, time:28, label:'Easy'},
  {items:16, time:26, label:'Normal'},
  {items:18, time:25, label:'Normal'},
  {items:20, time:24, label:'Normal'},
  {items:22, time:22, label:'Hard'},
  {items:25, time:20, label:'Hard'},
  {items:28, time:20, label:'Expert'},
  {items:30, time:18, label:'Master'},
];

const RECALL_TIME = 90;

// ── State ─────────────────────────────────────────────────────────────────
let levelIdx       = 0;
let currentItems   = [];
let memRemaining   = 30;
let recallRemaining= 90;
let memTimerId     = null;
let recallTimerId  = null;

let players           = [];
let playerResults     = [];
let currentPlayerIdx  = 0;

// ── Helpers ───────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

function $(id) { return document.getElementById(id); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build an <img> element for an item's 3D icon with emoji text fallback
function makeIcon(item, size = 60) {
  const wrap = document.createElement('span');
  const img  = document.createElement('img');
  img.src    = item.img;
  img.alt    = item.n;
  img.width  = size;
  img.height = size;
  img.style.cssText = `width:${size}px;height:${size}px;object-fit:contain;display:block;`;
  img.onerror = function () {
    // Fallback: show emoji text if 3D image fails
    wrap.style.fontSize = size * 0.6 + 'px';
    wrap.style.lineHeight = '1';
    wrap.textContent = item.e;
  };
  wrap.appendChild(img);
  return wrap;
}

// ── Init ─────────────────────────────────────────────────────────────────
function init() {
  buildLevelGrid();
  $('recall-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitRecall(); });
  $('recall-input').addEventListener('input', updateSuggestions);
}

function buildLevelGrid() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const btn = document.createElement('button');
    btn.className = 'lbtn';
    btn.innerHTML = `<div class="ln">${i+1}</div><div class="ll">${lv.label}</div><div class="li">${lv.items} items · ${lv.time}s</div>`;
    btn.onclick = () => showSetup(i);
    grid.appendChild(btn);
  });
}

// ── Player Setup ──────────────────────────────────────────────────────────
function startDiff(diff) {
  const map = {easy:0, medium:3, hard:6};
  showSetup(map[diff]);
}

function showSetup(idx) {
  levelIdx = idx;
  highlightPcBtn(1);
  renderNameInputs(1);
  $('setup-overlay').classList.add('show');
}

function setPlayerCount(n) {
  highlightPcBtn(n);
  renderNameInputs(n);
}

function highlightPcBtn(n) {
  document.querySelectorAll('.pc-btn').forEach((b, i) => {
    b.classList.toggle('pc-active', i + 1 === n);
  });
}

function renderNameInputs(n) {
  const container = $('name-inputs');
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'name-input';
    inp.placeholder = `Player ${i+1} name`;
    inp.value = n === 1 ? '' : `Player ${i+1}`;
    inp.maxLength = 18;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') startGame(); });
    container.appendChild(inp);
  }
  if (n === 1) setTimeout(() => container.querySelector('input')?.focus(), 80);
}

function startGame() {
  const inputs = document.querySelectorAll('.name-input');
  players = Array.from(inputs).map((inp, i) => ({
    name: inp.value.trim() || `Player ${i+1}`,
  }));
  playerResults = players.map(p => ({
    name: p.name, found: new Set(), score: 0, accuracy: 0, foundCount: 0,
  }));
  currentPlayerIdx = 0;
  $('setup-overlay').classList.remove('show');
  startLevel(levelIdx);
}

// ── Memorize Phase ────────────────────────────────────────────────────────
function startLevel(idx) {
  levelIdx = idx;
  const lv = LEVELS[idx];
  currentItems = shuffle(ALL_ITEMS).slice(0, lv.items);

  $('mem-level-tag').textContent = `Level ${idx+1} — ${lv.label}`;
  $('crate-count').textContent = `${lv.items} items`;

  const grid = $('items-grid');
  grid.innerHTML = '';
  currentItems.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.style.animationDelay = `${i * 0.03}s`;

    const ie = document.createElement('span');
    ie.className = 'ie';
    ie.appendChild(makeIcon(item, 60));

    const label = document.createElement('span');
    label.className = 'in';
    label.textContent = item.n;

    card.appendChild(ie);
    card.appendChild(label);
    grid.appendChild(card);
  });

  const trFg    = $('tr-fg');
  const memText = $('mem-timer');
  trFg.classList.remove('urgent');
  memText.classList.remove('urgent');
  trFg.style.strokeDashoffset = '0';
  memRemaining = lv.time;
  memText.textContent = memRemaining;

  showScreen('screen-memorize');

  clearInterval(memTimerId);
  memTimerId = setInterval(() => {
    memRemaining--;
    memText.textContent = memRemaining;
    const elapsed = lv.time - memRemaining;
    trFg.style.strokeDashoffset = String(283 * (elapsed / lv.time));
    if (memRemaining <= 8) {
      trFg.classList.add('urgent');
      memText.classList.add('urgent');
    }
    if (memRemaining <= 0) {
      clearInterval(memTimerId);
      boxClose();
    }
  }, 1000);
}

// ── Box Close ─────────────────────────────────────────────────────────────
function boxClose() {
  clearInterval(memTimerId);
  const ov = $('close-overlay');
  ov.classList.add('show');
  setTimeout(() => {
    ov.classList.remove('show');
    players.length > 1 ? showHandoff(0) : startRecallPhase();
  }, 1800);
}

// ── Player Handoff ────────────────────────────────────────────────────────
function showHandoff(playerIdx) {
  currentPlayerIdx = playerIdx;
  $('handoff-name').textContent = players[playerIdx].name;
  $('handoff-number').textContent = `Player ${playerIdx+1} of ${players.length}`;
  $('handoff-overlay').classList.add('show');
}

function beginPlayerRecall() {
  $('handoff-overlay').classList.remove('show');
  startRecallPhase();
}

// ── Recall Phase ──────────────────────────────────────────────────────────
function startRecallPhase() {
  const inp         = $('recall-input');
  const foundLog    = $('found-log');
  const placeholder = $('log-placeholder');
  const suggRow     = $('sugg-row');

  inp.value = '';
  foundLog.innerHTML = '';
  if (placeholder) foundLog.appendChild(placeholder);
  suggRow.innerHTML = '';

  $('recall-found').textContent = '0';
  $('recall-total').textContent = currentItems.length;

  const indicator = $('player-indicator');
  if (players.length > 1) {
    indicator.style.display = 'flex';
    $('current-player-name').textContent = players[currentPlayerIdx].name;
  } else {
    indicator.style.display = 'none';
  }

  const timeBar = $('time-bar');
  timeBar.style.transition = 'none';
  timeBar.style.width = '100%';
  timeBar.classList.remove('urgent');
  $('recall-secs').textContent = RECALL_TIME;
  $('recall-secs').classList.remove('urgent');

  recallRemaining = RECALL_TIME;
  playerResults[currentPlayerIdx].found = new Set();

  showScreen('screen-recall');

  requestAnimationFrame(() => {
    timeBar.style.transition = 'width 1s linear, background .3s';
    inp.focus();
  });

  clearInterval(recallTimerId);
  recallTimerId = setInterval(() => {
    recallRemaining--;
    $('recall-secs').textContent = recallRemaining;
    timeBar.style.width = ((recallRemaining / RECALL_TIME) * 100) + '%';
    if (recallRemaining <= 20) {
      timeBar.classList.add('urgent');
      $('recall-secs').classList.add('urgent');
    }
    if (recallRemaining <= 0) {
      clearInterval(recallTimerId);
      finishPlayerRecall();
    }
  }, 1000);
}

// ── Recall Logic ──────────────────────────────────────────────────────────
function matchItem(typed) {
  const t    = typed.toLowerCase().trim();
  if (t.length < 2) return null;
  const found = playerResults[currentPlayerIdx].found;
  const pool  = currentItems.filter(it => !found.has(it.n));

  for (const item of pool) {
    const name = item.n.toLowerCase();
    if (name === t)                                  return item;
    if (t.length >= 3 && name.startsWith(t))         return item;
    if (t.length >= 4 && name.includes(t))           return item;
    if (t.length >= 4 && name.split(' ')[0] === t)   return item;
  }
  return null;
}

function submitRecall() {
  const inp   = $('recall-input');
  const typed = inp.value.trim();
  if (!typed) return;

  const match  = matchItem(typed);
  const result = playerResults[currentPlayerIdx];

  if (match) {
    result.found.add(match.n);
    addFoundChip(match);
    $('recall-found').textContent = result.found.size;
    inp.value = '';
    inp.classList.remove('bad');
    inp.classList.add('ok');
    setTimeout(() => inp.classList.remove('ok'), 450);
    $('sugg-row').innerHTML = '';

    if (result.found.size === currentItems.length) {
      clearInterval(recallTimerId);
      setTimeout(finishPlayerRecall, 500);
    }
  } else {
    inp.classList.remove('ok');
    inp.classList.add('bad');
    setTimeout(() => inp.classList.remove('bad'), 400);
  }
}

function addFoundChip(item) {
  const log = $('found-log');
  const ph  = $('log-placeholder');
  if (ph && log.contains(ph)) log.removeChild(ph);

  const chip = document.createElement('div');
  chip.className = 'found-chip';

  const iconWrap = makeIcon(item, 20);
  iconWrap.style.cssText = 'display:inline-flex;align-items:center;flex-shrink:0;';
  chip.appendChild(iconWrap);

  const txt = document.createTextNode(item.n);
  chip.appendChild(txt);
  log.appendChild(chip);
}

function updateSuggestions() {
  const typed   = $('recall-input').value.trim().toLowerCase();
  const suggRow = $('sugg-row');
  suggRow.innerHTML = '';
  if (typed.length < 2) return;

  const found = playerResults[currentPlayerIdx]?.found || new Set();
  const hits  = ALL_ITEMS.filter(it => {
    if (found.has(it.n)) return false;
    const name = it.n.toLowerCase();
    return name.startsWith(typed) || name.includes(typed);
  }).slice(0, 6);

  hits.forEach(item => {
    const chip = document.createElement('button');
    chip.className = 'sugg-chip';
    chip.textContent = `${item.e} ${item.n}`;
    chip.onclick = () => { $('recall-input').value = item.n; submitRecall(); };
    suggRow.appendChild(chip);
  });
}

function finishRecall() {
  clearInterval(recallTimerId);
  finishPlayerRecall();
}

function finishPlayerRecall() {
  clearInterval(recallTimerId);
  const result  = playerResults[currentPlayerIdx];
  const found   = result.found.size;
  const total   = currentItems.length;
  result.foundCount = found;
  result.accuracy   = Math.round((found / total) * 100);
  result.score      = Math.round(found * 10 * (1 + (levelIdx + 1) * 0.1));

  const next = currentPlayerIdx + 1;
  if (next < players.length) {
    showHandoff(next);
  } else {
    players.length === 1 ? showResults() : showLeaderboard();
  }
}

// ── Single-Player Results ─────────────────────────────────────────────────
function showResults() {
  const r   = playerResults[0];
  const acc = r.accuracy;

  let stars = '';
  if      (acc >= 90) stars = '⭐⭐⭐';
  else if (acc >= 70) stars = '⭐⭐';
  else if (acc >= 50) stars = '⭐';

  let emoji = '💪', title = 'Keep Practicing!';
  if      (acc >= 90) { emoji = '🏆'; title = 'Perfect Memory!'; }
  else if (acc >= 70) { emoji = '🎉'; title = 'Great Job!'; }
  else if (acc >= 50) { emoji = '👍'; title = 'Not Bad!'; }
  else if (acc >= 30) { emoji = '😅'; title = 'Almost There!'; }

  $('res-emoji').textContent = emoji;
  $('res-title').textContent = title;
  $('res-stars').textContent = stars;
  $('sc-found').textContent  = r.foundCount;
  $('sc-total').textContent  = currentItems.length;
  $('sc-acc').textContent    = acc + '%';
  $('sc-score').textContent  = r.score;
  $('btn-next').style.display = levelIdx < LEVELS.length - 1 ? '' : 'none';

  buildResultGrid($('res-grid'), r.found);
  showScreen('screen-results');
}

function buildResultGrid(container, foundSet) {
  container.innerHTML = '';
  currentItems.forEach((item, i) => {
    const div   = document.createElement('div');
    const found = foundSet.has(item.n);
    div.className = `ri ${found ? 'found' : 'missed'}`;
    div.style.animationDelay = `${i * 0.025}s`;

    const iconWrap = makeIcon(item, 38);
    iconWrap.className = 'ri-emoji-wrap';
    iconWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;height:44px;margin-bottom:4px;';

    const label = document.createTextNode(item.n);
    div.appendChild(iconWrap);
    div.appendChild(label);
    container.appendChild(div);
  });
}

// ── Multiplayer Leaderboard ───────────────────────────────────────────────
function showLeaderboard() {
  const sorted   = [...playerResults].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...sorted.map(p => p.score), 1);
  const medals   = ['🥇','🥈','🥉','4️⃣'];

  $('lb-level').textContent = `Level ${levelIdx+1} — ${LEVELS[levelIdx].label} · ${currentItems.length} items`;

  $('lb-rows').innerHTML = sorted.map((p, rank) => {
    const pct    = Math.round((p.score / maxScore) * 100);
    const isFirst = rank === 0;
    const barClr  = isFirst
      ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
      : rank === 1
      ? 'linear-gradient(90deg,#94a3b8,#cbd5e1)'
      : 'linear-gradient(90deg,#7c3aed,#06b6d4)';
    return `
      <div class="lb-row ${isFirst ? 'lb-winner' : ''}">
        <div class="lb-medal">${medals[rank] || rank+1}</div>
        <div class="lb-info">
          <div class="lb-name">${p.name}</div>
          <div class="lb-stats">${p.foundCount} / ${currentItems.length} items · ${p.accuracy}% accuracy</div>
          <div class="lb-bar-wrap">
            <div class="lb-bar" style="width:${pct}%;background:${barClr}"></div>
          </div>
        </div>
        <div class="lb-score">${p.score}</div>
      </div>`;
  }).join('');

  const breakdown = $('lb-breakdown');
  breakdown.innerHTML = '';
  sorted.forEach(p => {
    const section = document.createElement('div');
    section.className = 'lb-player-section';
    const grid = document.createElement('div');
    grid.className = 'res-grid';
    grid.style.maxWidth = '100%';
    buildResultGrid(grid, p.found);
    section.innerHTML = `<div class="lb-player-header">${p.name}'s Answers — ${p.foundCount} found</div>`;
    section.appendChild(grid);
    breakdown.appendChild(section);
  });

  showScreen('screen-leaderboard');
}

// ── Navigation ────────────────────────────────────────────────────────────
function nextLevel() {
  if (levelIdx < LEVELS.length - 1) {
    playerResults = players.map(p => ({
      name: p.name, found: new Set(), score: 0, accuracy: 0, foundCount: 0,
    }));
    currentPlayerIdx = 0;
    startLevel(levelIdx + 1);
  }
}

function retryLevel() {
  playerResults = players.map(p => ({
    name: p.name, found: new Set(), score: 0, accuracy: 0, foundCount: 0,
  }));
  currentPlayerIdx = 0;
  startLevel(levelIdx);
}

function goHome() {
  clearInterval(memTimerId);
  clearInterval(recallTimerId);
  players = [];
  playerResults = [];
  currentPlayerIdx = 0;
  showScreen('screen-start');
}

// ── Boot ─────────────────────────────────────────────────────────────────
init();
