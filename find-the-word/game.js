'use strict';

// ─────────────────────── WORD DATABASE ───────────────────────
// 30 words per level, each { w: 'word', d: 'definition' }

const WORD_DB = {
  1: [ // Easy
    {w:'apple',    d:'A round red or green fruit that grows on trees'},
    {w:'bridge',   d:'A structure built over a river or road to allow crossing'},
    {w:'clock',    d:'A device used to measure and display the time'},
    {w:'desert',   d:'A dry, sandy region with very little rainfall'},
    {w:'elbow',    d:'The joint in the middle of your arm'},
    {w:'frog',     d:'A small green amphibian that hops and lives near water'},
    {w:'globe',    d:'A round model of the Earth'},
    {w:'honey',    d:'A sweet, sticky liquid made by bees'},
    {w:'island',   d:'A piece of land completely surrounded by water'},
    {w:'jacket',   d:'A short coat worn over your clothes for warmth'},
    {w:'kite',     d:'A toy flown in the wind on the end of a long string'},
    {w:'ladder',   d:'A frame of steps used for climbing up or down'},
    {w:'mirror',   d:'A smooth surface that reflects your image'},
    {w:'needle',   d:'A thin sharp tool used for sewing thread through cloth'},
    {w:'ocean',    d:'A very large body of salt water covering most of the Earth'},
    {w:'pencil',   d:'A thin stick of wood with graphite inside used for writing'},
    {w:'queen',    d:'A woman who rules a kingdom or the wife of a king'},
    {w:'river',    d:'A large natural stream of fresh water flowing to the sea'},
    {w:'shadow',   d:'A dark shape made when an object blocks the light'},
    {w:'table',    d:'A piece of furniture with a flat top and legs'},
    {w:'umbrella', d:'A folding device held above your head to keep off rain'},
    {w:'village',  d:'A small settlement of houses in the countryside'},
    {w:'window',   d:'An opening in a wall filled with glass to let in light'},
    {w:'yarn',     d:'Thick thread used for knitting or weaving'},
    {w:'zebra',    d:'A wild African animal with black and white stripes'},
    {w:'blanket',  d:'A warm covering used on a bed or for wrapping around you'},
    {w:'candle',   d:'A stick of wax with a wick that is burned to give light'},
    {w:'drawer',   d:'A sliding box-shaped compartment in a piece of furniture'},
    {w:'feather',  d:'One of the light flat growths that cover a bird\'s body'},
    {w:'garden',   d:'A piece of ground where flowers or vegetables are grown'},
  ],
  2: [ // Beginner
    {w:'anchor',    d:'A heavy device lowered from a boat to keep it in place'},
    {w:'ballot',    d:'A piece of paper used to cast a vote in an election'},
    {w:'canyon',    d:'A deep gorge carved by a river between steep rocky walls'},
    {w:'debris',    d:'Scattered fragments or rubbish left after destruction'},
    {w:'eclipse',   d:'When one celestial body moves into the shadow of another'},
    {w:'famine',    d:'A severe shortage of food affecting a large population'},
    {w:'glacier',   d:'A slowly moving mass of ice formed from compacted snow'},
    {w:'harbor',    d:'A sheltered body of water where ships can anchor safely'},
    {w:'invoice',   d:'A list of goods or services with the amount owed'},
    {w:'jungle',    d:'Dense tropical forest with thick tangled vegetation'},
    {w:'kernel',    d:'The inner seed of a nut, fruit stone, or grain of corn'},
    {w:'lagoon',    d:'A shallow body of water separated from the sea by a reef'},
    {w:'mural',     d:'A large painting applied directly onto a wall or ceiling'},
    {w:'nozzle',    d:'A short tube that controls the flow of liquid from a hose'},
    {w:'oasis',     d:'A fertile spot in a desert where water is found'},
    {w:'pledge',    d:'A solemn promise or commitment to do something'},
    {w:'quartz',    d:'A hard mineral found in many rocks, often transparent'},
    {w:'rapids',    d:'A section of a river where the current flows very fast'},
    {w:'sibling',   d:'A brother or sister in the same family'},
    {w:'tundra',    d:'A vast flat treeless Arctic region with frozen subsoil'},
    {w:'ulcer',     d:'A painful sore on the skin or inside the body'},
    {w:'venom',     d:'Poisonous fluid injected by a snake or spider bite'},
    {w:'walrus',    d:'A large Arctic marine mammal with long tusks and whiskers'},
    {w:'xylophone', d:'A musical instrument played by hitting wooden bars'},
    {w:'yolk',      d:'The yellow part inside an egg'},
    {w:'zenith',    d:'The highest point in the sky directly above the observer'},
    {w:'archive',   d:'A collection of historical documents or records'},
    {w:'blizzard',  d:'A severe snowstorm with strong winds and low visibility'},
    {w:'crevice',   d:'A narrow opening or crack in a rock or wall'},
    {w:'dagger',    d:'A short knife with a pointed blade used as a weapon'},
  ],
  3: [ // Normal
    {w:'abacus',      d:'An ancient calculating tool using beads on rods'},
    {w:'buoyant',     d:'Able to float or stay afloat in a liquid or gas'},
    {w:'census',      d:'An official count of a country\'s population'},
    {w:'dormant',     d:'In a state of inactivity, like a sleeping volcano'},
    {w:'emission',    d:'The production and discharge of gas into the atmosphere'},
    {w:'fjord',       d:'A long narrow sea inlet between steep cliffs'},
    {w:'gravity',     d:'The force that attracts objects toward the center of Earth'},
    {w:'habitat',     d:'The natural home or environment of an animal or plant'},
    {w:'immunity',    d:'The ability of the body to resist disease or infection'},
    {w:'javelin',     d:'A light spear thrown as an athletic event'},
    {w:'kinetic',     d:'Relating to or resulting from motion'},
    {w:'latitude',    d:'The distance north or south of the equator in degrees'},
    {w:'migrant',     d:'A person who moves from one place to another to find work'},
    {w:'nocturnal',   d:'Active during the night rather than the day'},
    {w:'osmosis',     d:'Movement of water through a membrane toward a stronger solution'},
    {w:'perimeter',   d:'The total length of the boundary of a shape'},
    {w:'quicksand',   d:'Loose wet sand that sucks in anything resting on it'},
    {w:'reservoir',   d:'A large natural or artificial lake used as a water supply'},
    {w:'solstice',    d:'Either of the two times each year when the sun is farthest from equator'},
    {w:'tremor',      d:'A slight earthquake or involuntary shaking of the body'},
    {w:'ultraviolet', d:'Electromagnetic radiation beyond violet light, invisible to human eyes'},
    {w:'viaduct',     d:'A long bridge-like structure carrying a road or railway over a valley'},
    {w:'watershed',   d:'A ridge of land dividing rivers flowing into different seas'},
    {w:'xenon',       d:'A heavy colorless inert gas used in specialized lamps'},
    {w:'yearning',    d:'A strong feeling of longing or desire for something'},
    {w:'zeppelin',    d:'A large rigid airship of the type designed by Count von Zeppelin'},
    {w:'alluvial',    d:'Relating to sediment deposited by flowing water'},
    {w:'biome',       d:'A large naturally occurring community of flora and fauna'},
    {w:'carnivore',   d:'An animal that feeds on other animals'},
    {w:'delta',       d:'A flat area of land where a river splits into smaller channels near the sea'},
  ],
  4: [ // Hard
    {w:'abscond',      d:'To leave hurriedly and secretly to escape from justice'},
    {w:'benevolent',   d:'Well-meaning and kind; charitable toward others'},
    {w:'circumvent',   d:'To find a way around an obstacle or rule'},
    {w:'dilapidated',  d:'In a state of disrepair due to age or neglect'},
    {w:'equivocate',   d:'To use ambiguous language to avoid committing to a clear answer'},
    {w:'fallacious',   d:'Based on a mistaken belief; logically incorrect'},
    {w:'gregarious',   d:'Fond of company; sociable and outgoing'},
    {w:'hegemony',     d:'Leadership or dominance of one country over others'},
    {w:'insolvent',    d:'Unable to pay debts when they are due; bankrupt'},
    {w:'juxtapose',    d:'To place two things side by side to highlight contrast'},
    {w:'laconic',      d:'Using very few words; brief and concise in speech'},
    {w:'malevolent',   d:'Having or showing a wish to do evil to others'},
    {w:'nefarious',    d:'Wicked, criminal, or villainous in nature'},
    {w:'obfuscate',    d:'To make something unclear or difficult to understand'},
    {w:'pernicious',   d:'Having a harmful effect, especially in a gradual or subtle way'},
    {w:'quandary',     d:'A state of uncertainty about what to do; a dilemma'},
    {w:'recalcitrant', d:'Having an obstinately uncooperative attitude toward authority'},
    {w:'sycophant',    d:'A person who flatters important people to gain favor'},
    {w:'tenacious',    d:'Holding firmly to something; not giving up easily'},
    {w:'ubiquitous',   d:'Present, appearing, or found everywhere simultaneously'},
    {w:'vacillate',    d:'To waver between different opinions or actions; be indecisive'},
    {w:'wanton',       d:'Deliberate and unprovoked; done without care for consequences'},
    {w:'xenophobia',   d:'Dislike of or prejudice against people from other countries'},
    {w:'zealot',       d:'A person who is fanatically devoted to a cause'},
    {w:'acrimony',     d:'Bitterness or ill-feeling expressed in speech or manner'},
    {w:'banal',        d:'So lacking in originality as to be obvious and boring'},
    {w:'clandestine',  d:'Kept secret or done secretively, especially something illicit'},
    {w:'duplicity',    d:'Deceitfulness; saying one thing while meaning another'},
    {w:'ephemeral',    d:'Lasting for a very short time; transitory'},
    {w:'fiasco',       d:'A complete and humiliating failure; a total mess'},
  ],
  5: [ // Expert
    {w:'acephalous',    d:'Lacking a leader or having no clear head of authority'},
    {w:'bathypelagic',  d:'Relating to the deep ocean zone between 1000 and 4000 meters'},
    {w:'crepuscular',   d:'Relating to or resembling twilight; active at dawn or dusk'},
    {w:'disquisition',  d:'A long or elaborate essay or discussion on a particular subject'},
    {w:'encomium',      d:'A speech or piece of writing expressing high praise'},
    {w:'fugacious',     d:'Tending to disappear quickly; fleeting or transient'},
    {w:'gasconade',     d:'Extravagant boasting; bragging about one\'s own achievements'},
    {w:'hapax',         d:'A word or expression recorded only once in a written text'},
    {w:'iatrogenic',    d:'Relating to illness caused unintentionally by medical treatment'},
    {w:'jejune',        d:'Lacking interest or significance; naively simplistic'},
    {w:'kakistocracy',  d:'Government by the worst or least qualified citizens'},
    {w:'limerence',     d:'An involuntary state of intense romantic attraction and obsession'},
    {w:'mnemonic',      d:'A pattern or device that aids memory retention'},
    {w:'noctilucent',   d:'Relating to high-altitude clouds that glow at night'},
    {w:'onomastics',    d:'The study of the history and origin of proper names'},
    {w:'palimpsest',    d:'A manuscript where old writing has been erased and written over'},
    {w:'quixotic',      d:'Extremely idealistic, unrealistic, and impractical'},
    {w:'recondite',     d:'Not known by many people; abstruse or obscure'},
    {w:'soporific',     d:'Tending to induce drowsiness or sleep'},
    {w:'tergiversate',  d:'To make conflicting statements; to equivocate or desert a cause'},
    {w:'ullage',        d:'The amount a container lacks of being full'},
    {w:'vellichor',     d:'The strange wistfulness of used bookstores'},
    {w:'weltanschauung',d:'A comprehensive conception of the world from a specific viewpoint'},
    {w:'xenolith',      d:'A piece of rock embedded in another rock of different origin'},
    {w:'yclept',        d:'Archaic past tense of "call" — named or called by a certain name'},
    {w:'zugzwang',      d:'A situation in chess where any move a player makes will worsen their position'},
    {w:'apricity',      d:'The warmth of the sun in winter'},
    {w:'brontide',      d:'A low muffled sound like distant thunder heard in certain regions'},
    {w:'callipygian',   d:'Having well-shaped buttocks; regarded as beautiful'},
    {w:'dactylonomy',   d:'The practice of counting or calculating using the fingers'},
  ],
};

// ─────────────────────── LEVEL CONFIG ───────────────────────
const LEVELS = {
  1: {name:'Easy',    wordCount:6,  timer:30, pts:10},
  2: {name:'Beginner',wordCount:7,  timer:30, pts:15},
  3: {name:'Normal',  wordCount:8,  timer:28, pts:20},
  4: {name:'Hard',    wordCount:8,  timer:25, pts:25},
  5: {name:'Expert',  wordCount:10, timer:22, pts:30},
};

// ─────────────────────── STATE ───────────────────────
let selectedLevel   = 1;
let players         = [];           // [{name}]
let playerResults   = [];           // [{name,correct,wrong,score,attempts}]
let currentPlayerIdx= 0;
let sessionUsed     = new Set();    // words used this session

let roundWords      = [];           // [{w,d}] current round word pool
let defQueue        = [];           // shuffled indices into roundWords
let currentDefIdx   = 0;           // index into defQueue
let answered        = {};           // tile index → 'correct'|'wrong'
let timerSec        = 30;
let timerMax        = 30;
let timerInterval   = null;
let roundScore      = 0;
let roundCorrect    = 0;
let roundWrong      = 0;

// ─────────────────────── AUDIO ───────────────────────
const AC = typeof AudioContext !== 'undefined'
  ? new AudioContext()
  : (typeof webkitAudioContext !== 'undefined' ? new webkitAudioContext() : null);

function tone(freq, dur, type='sine', vol=0.25, ramp=true) {
  if (!AC) return;
  const osc  = AC.createOscillator();
  const gain = AC.createGain();
  osc.connect(gain); gain.connect(AC.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, AC.currentTime);
  gain.gain.setValueAtTime(vol, AC.currentTime);
  if (ramp) gain.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
  osc.start(AC.currentTime);
  osc.stop(AC.currentTime + dur);
}

function playBell() {
  tone(880, 0.6, 'sine', 0.3);
  setTimeout(() => tone(1100, 0.5, 'sine', 0.2), 150);
}
function playTick()    { tone(800, 0.07, 'square', 0.08) }
function playCorrect() { tone(660, 0.12, 'sine', 0.22); setTimeout(() => tone(880, 0.2, 'sine', 0.18), 90) }
function playWrong()   { tone(220, 0.25, 'sawtooth', 0.18) }
function playTimeUp()  {
  if (!AC) return;
  const osc = AC.createOscillator(), g = AC.createGain();
  osc.connect(g); g.connect(AC.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, AC.currentTime);
  osc.frequency.linearRampToValueAtTime(80, AC.currentTime + 0.7);
  g.gain.setValueAtTime(0.25, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.8);
  osc.start(); osc.stop(AC.currentTime + 0.8);
}

// ─────────────────────── UTILITIES ───────────────────────
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pct(n, d) { return d === 0 ? '0%' : Math.round((n / d) * 100) + '%' }

// ─────────────────────── DIFFICULTY BUTTONS ───────────────────────
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedLevel = +btn.dataset.level;
  });
});

// ─────────────────────── SETUP OVERLAY ───────────────────────
$('open-setup-btn').addEventListener('click', () => {
  $('setup-overlay').classList.add('active');
  renderNameInputs(1);
});

let playerCount = 1;
document.querySelectorAll('.pc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pc-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    playerCount = +btn.dataset.count;
    renderNameInputs(playerCount);
  });
});

function renderNameInputs(n) {
  const wrap = $('name-inputs');
  wrap.innerHTML = '';
  for (let i = 1; i <= n; i++) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = `Player ${i} name`;
    inp.maxLength = 20;
    inp.id = `pname-${i}`;
    wrap.appendChild(inp);
  }
}

$('start-game-btn').addEventListener('click', () => {
  players = [];
  for (let i = 1; i <= playerCount; i++) {
    const val = ($(`pname-${i}`)?.value || '').trim() || `Player ${i}`;
    players.push({name: val});
  }
  playerResults = players.map(p => ({name:p.name, correct:0, wrong:0, score:0, attempts:0}));
  currentPlayerIdx = 0;
  sessionUsed.clear();
  $('setup-overlay').classList.remove('active');
  if (players.length > 1) {
    showHandoff(0);
  } else {
    startRound();
  }
});

// ─────────────────────── HANDOFF ───────────────────────
function showHandoff(idx) {
  $('handoff-name').textContent = players[idx].name;
  $('handoff-overlay').classList.add('active');
}

$('handoff-go-btn').addEventListener('click', () => {
  $('handoff-overlay').classList.remove('active');
  startRound();
});

// ─────────────────────── ROUND START ───────────────────────
function startRound() {
  if (AC && AC.state === 'suspended') AC.resume();

  const cfg = LEVELS[selectedLevel];
  timerMax = cfg.timer;
  timerSec = cfg.timer;
  roundScore = 0;
  roundCorrect = 0;
  roundWrong = 0;
  answered = {};

  // Pick words, avoiding session repeats
  const pool = WORD_DB[selectedLevel].filter(w => !sessionUsed.has(w.w));
  const available = pool.length >= cfg.wordCount ? pool : WORD_DB[selectedLevel]; // reset if exhausted
  roundWords = shuffle(available).slice(0, cfg.wordCount);
  roundWords.forEach(w => sessionUsed.add(w.w));

  // Definition queue = shuffled indices
  defQueue = shuffle(roundWords.map((_, i) => i));
  currentDefIdx = 0;

  // UI
  $('game-player-badge').textContent = players[currentPlayerIdx].name;
  $('game-score').textContent = '0';

  showScreen('screen-game');
  renderTiles();
  showDefinition();
  startTimer();
  playBell();
}

// ─────────────────────── TILES ───────────────────────
function renderTiles() {
  const wrap = $('tiles-wrap');
  wrap.innerHTML = '';
  roundWords.forEach((item, i) => {
    const tile = document.createElement('button');
    tile.className = 'word-tile';
    tile.textContent = item.w;
    tile.dataset.idx = i;
    tile.addEventListener('click', () => onTileClick(i));
    wrap.appendChild(tile);
  });
}

function getTile(idx) {
  return $('tiles-wrap').querySelector(`[data-idx="${idx}"]`);
}

// ─────────────────────── DEFINITIONS ───────────────────────
function showDefinition() {
  const targetIdx = defQueue[currentDefIdx];
  $('def-text').textContent = roundWords[targetIdx].d;
  $('game-progress').textContent = `${currentDefIdx + 1} / ${defQueue.length}`;
}

function onTileClick(tileIdx) {
  const tile = getTile(tileIdx);
  if (!tile || tile.classList.contains('locked') || tile.classList.contains('target-used')) return;

  const targetIdx = defQueue[currentDefIdx];
  const correct   = tileIdx === targetIdx;

  if (correct) {
    tile.classList.add('correct', 'locked');
    roundCorrect++;
    roundScore += LEVELS[selectedLevel].pts;
    $('game-score').textContent = roundScore;
    playCorrect();

    // move to next definition
    currentDefIdx++;
    if (currentDefIdx < defQueue.length) {
      showDefinition();
    } else {
      // all matched — end round early
      endRound();
    }
  } else {
    tile.classList.add('wrong');
    setTimeout(() => tile.classList.remove('wrong'), 600);
    roundWrong++;
    playWrong();
  }
  playerResults[currentPlayerIdx].attempts++;
}

// ─────────────────────── TIMER ───────────────────────
function startTimer() {
  clearInterval(timerInterval);
  updateTimerUI();
  timerInterval = setInterval(() => {
    timerSec--;
    updateTimerUI();
    if (timerSec <= 10) playTick();
    if (timerSec <= 0) {
      playTimeUp();
      endRound();
    }
  }, 1000);
}

function updateTimerUI() {
  const pct = Math.max(0, timerSec / timerMax);
  const bar = $('timer-bar');
  bar.style.width = (pct * 100) + '%';
  bar.classList.toggle('warn',   timerSec <= 15 && timerSec > 7);
  bar.classList.toggle('danger', timerSec <= 7);
  $('timer-num').textContent = timerSec + 's';
}

// ─────────────────────── END ROUND ───────────────────────
function endRound() {
  clearInterval(timerInterval);

  // Save results
  const pr = playerResults[currentPlayerIdx];
  pr.correct += roundCorrect;
  pr.wrong   += roundWrong;
  pr.score   += roundScore;

  showResults();
}

// ─────────────────────── RESULTS SCREEN ───────────────────────
function showResults() {
  const pr = playerResults[currentPlayerIdx];

  $('res-correct').textContent = roundCorrect;
  $('res-wrong').textContent   = roundWrong;
  $('res-score').textContent   = roundScore;
  $('res-acc').textContent     = pct(roundCorrect, roundCorrect + roundWrong);

  // Word-by-word summary
  const list = $('results-list');
  list.innerHTML = '';
  roundWords.forEach((item, i) => {
    const answered = getTile(i)?.classList.contains('correct');
    const row = document.createElement('div');
    row.className = 'results-row';
    row.innerHTML = `
      <span class="rn">${item.w}</span>
      <span style="color:var(--muted);font-size:.82rem;flex:1;padding:0 12px;text-align:left">${item.d.slice(0,50)}…</span>
      <span class="rs">${answered ? '✅ +' + LEVELS[selectedLevel].pts : '❌'}</span>
    `;
    list.appendChild(row);
  });

  // Next button label
  const isLast = currentPlayerIdx >= players.length - 1;
  $('results-next-btn').textContent = isLast ? 'View Leaderboard →' : `Hand to ${players[currentPlayerIdx + 1].name} →`;

  showScreen('screen-results');
}

$('results-next-btn').addEventListener('click', () => {
  currentPlayerIdx++;
  if (currentPlayerIdx < players.length) {
    showHandoff(currentPlayerIdx);
  } else {
    showLeaderboard();
  }
});

// ─────────────────────── LEADERBOARD ───────────────────────
function showLeaderboard() {
  // Sort players by score
  const sorted = [...playerResults].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];

  // subtitle
  const winner = sorted[0];
  $('lb-sub').textContent = players.length === 1
    ? `You scored ${winner.score} points! Great job!`
    : `${winner.name} wins with ${winner.score} points! 🎉`;

  // podium
  const podium = $('lb-podium');
  podium.innerHTML = '';
  sorted.slice(0, 3).forEach((p, i) => {
    const pod = document.createElement('div');
    pod.className = 'lb-pod' + (i === 0 ? ' first' : '');
    pod.innerHTML = `
      <div class="medal">${medals[i] || '🎖️'}</div>
      <div class="pname">${p.name}</div>
      <div class="pscore">${p.score} pts</div>
    `;
    podium.appendChild(pod);
  });

  // bar chart
  const bars = $('lb-bars');
  bars.innerHTML = '';
  const maxScore = Math.max(...sorted.map(p => p.score), 1);
  sorted.forEach(p => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const widthPct = Math.round((p.score / maxScore) * 100);
    row.innerHTML = `
      <div class="bar-name">${p.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:0%" data-target="${widthPct}%"></div>
      </div>
      <div class="bar-val">${p.score}</div>
    `;
    bars.appendChild(row);
  });

  showScreen('screen-leaderboard');

  // animate bars
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar-fill').forEach(el => {
        el.style.width = el.dataset.target;
      });
    });
  });
}

$('lb-home-btn').addEventListener('click', goHome);
$('lb-play-btn').addEventListener('click', () => {
  sessionUsed.clear();
  players = [];
  playerResults = [];
  currentPlayerIdx = 0;
  showScreen('screen-start');
});

function goHome() {
  sessionUsed.clear();
  window.location.href = '/';
}
