'use strict';

// ── Item Pool ─────────────────────────────────────────────────────────────
const ALL_ITEMS = [
  // Electronics & Power
  {e:'🔋',n:'Battery'},    {e:'🔦',n:'Flashlight'},   {e:'💡',n:'Light Bulb'},
  {e:'📱',n:'Phone'},      {e:'📻',n:'Radio'},          {e:'🔌',n:'Charger'},
  {e:'⌚',n:'Watch'},      {e:'📷',n:'Camera'},
  // Tools & Hardware
  {e:'🔧',n:'Wrench'},     {e:'🔨',n:'Hammer'},         {e:'🪛',n:'Screwdriver'},
  {e:'✂️',n:'Scissors'},   {e:'📏',n:'Ruler'},           {e:'🧲',n:'Magnet'},
  {e:'🔩',n:'Bolt'},       {e:'🪜',n:'Ladder'},
  // Household Essentials
  {e:'🧼',n:'Soap'},       {e:'🪥',n:'Toothbrush'},     {e:'🕯️',n:'Candle'},
  {e:'🔑',n:'Key'},        {e:'🧹',n:'Broom'},           {e:'🧽',n:'Sponge'},
  {e:'🪣',n:'Bucket'},     {e:'🧯',n:'Fire Extinguisher'},
  // Gas & Chemicals
  {e:'⚗️',n:'Flask'},      {e:'🧪',n:'Test Tube'},      {e:'⛽',n:'Gas Canister'},
  {e:'🫙',n:'Spray Can'},  {e:'🔥',n:'Lighter'},         {e:'🛢️',n:'Propane Bottle'},
  // Medical & Safety
  {e:'🩹',n:'Bandage'},    {e:'💊',n:'Pill'},            {e:'🌡️',n:'Thermometer'},
  {e:'🩺',n:'Stethoscope'},{e:'⛑️',n:'Hard Hat'},        {e:'🦺',n:'Safety Vest'},
  {e:'💉',n:'Syringe'},
  // Stationery & Office
  {e:'✏️',n:'Pencil'},     {e:'🖊️',n:'Pen'},            {e:'📎',n:'Paper Clip'},
  {e:'📌',n:'Thumbtack'},  {e:'📓',n:'Notebook'},        {e:'📁',n:'Folder'},
  // Survival & Food
  {e:'🥫',n:'Canned Food'},{e:'🍫',n:'Chocolate Bar'},  {e:'🥜',n:'Peanuts'},
  {e:'🧃',n:'Juice Box'},  {e:'💧',n:'Water Bottle'},    {e:'🍬',n:'Candy'},
  {e:'🍪',n:'Cookies'},    {e:'🥨',n:'Crackers'},
  // Gear & Clothing
  {e:'🧤',n:'Gloves'},     {e:'🧣',n:'Scarf'},           {e:'🎒',n:'Backpack'},
  {e:'🧢',n:'Cap'},        {e:'👢',n:'Boot'},             {e:'🧳',n:'Suitcase'},
  // Extra
  {e:'🧰',n:'Toolbox'},    {e:'🔐',n:'Padlock'},         {e:'🪝',n:'Hook'},
  {e:'🗜️',n:'Clamp'},      {e:'📡',n:'Antenna'},         {e:'🔭',n:'Telescope'},
  {e:'🧊',n:'Ice Pack'},   {e:'🪢',n:'Rope'},            {e:'🧭',n:'Compass'},
  {e:'🔬',n:'Microscope'}, {e:'📯',n:'Horn'},            {e:'🎯',n:'Dart'},
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

let players           = [];  // [{name}]
let playerResults     = [];  // [{name, found:Set, score, accuracy, foundCount}]
let currentPlayerIdx  = 0;
let selectedCount     = 1;

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
  selectedCount = 1;
  highlightPcBtn(1);
  renderNameInputs(1);
  $('setup-overlay').classList.add('show');
}

function setPlayerCount(n) {
  selectedCount = n;
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
    card.innerHTML = `<span class="ie">${item.e}</span><span class="in">${item.n}</span>`;
    grid.appendChild(card);
  });

  const trFg     = $('tr-fg');
  const memText  = $('mem-timer');
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
    if (players.length > 1) {
      showHandoff(0);
    } else {
      startRecallPhase();
    }
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

  // Player indicator
  const indicator = $('player-indicator');
  if (players.length > 1) {
    indicator.style.display = 'flex';
    $('current-player-name').textContent = players[currentPlayerIdx].name;
  } else {
    indicator.style.display = 'none';
  }

  // Reset time bar
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
  const t = typed.toLowerCase().trim();
  if (t.length < 2) return null;
  const found = playerResults[currentPlayerIdx].found;
  const pool  = currentItems.filter(it => !found.has(it.n));

  for (const item of pool) {
    const name = item.n.toLowerCase();
    if (name === t)                                   return item;
    if (t.length >= 3 && name.startsWith(t))          return item;
    if (t.length >= 4 && name.includes(t))            return item;
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
  const log    = $('found-log');
  const ph     = $('log-placeholder');
  if (ph && log.contains(ph)) log.removeChild(ph);
  const chip = document.createElement('div');
  chip.className = 'found-chip';
  chip.innerHTML = `<span class="ce">${item.e}</span>${item.n}`;
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
  const r = playerResults[0];
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
    const div = document.createElement('div');
    div.className = `ri ${foundSet.has(item.n) ? 'found' : 'missed'}`;
    div.style.animationDelay = `${i * 0.025}s`;
    div.innerHTML = `<span class="ri-emoji">${item.e}</span>${item.n}`;
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
    const pct     = Math.round((p.score / maxScore) * 100);
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

  // Per-player breakdowns
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
