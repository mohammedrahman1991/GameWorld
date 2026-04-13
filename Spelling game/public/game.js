// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  level: 'easy',            // 'easy' | 'medium' | 'hard'
  wordList: [],             // shuffled array of { word, hint } for this session
  roundIndex: 0,            // 0–9
  score: 0,
  heartsMax: 5,
  hearts: 5,
  currentEntry: null,       // { word, hint }
  guessedLetters: new Set(),
  timerInterval: null,
  timerMs: 30000,
  timerRemaining: 30000,
  hintShown: false,
};

const HEARTS_BY_LEVEL = { easy: 5, medium: 4, hard: 3 };
const ROUNDS = 10;

// ─── SCREEN MANAGER ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── STARS ───────────────────────────────────────────────────────────────────
function buildStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 150; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      top:${Math.random() * 100}%;
      left:${Math.random() * 100}%;
      --dur:${2 + Math.random() * 3}s;
      --delay:${Math.random() * 3}s;
    `;
    container.appendChild(s);
  }
}

// ─── AUDIO — ElevenLabs via /api/spelling-voice, fallback to Web Speech ──────
let _speechVoice = null;
let _currentAudio = null;

function _loadFallbackVoice() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return;
  _speechVoice =
    voices.find(v => v.name === 'Google US English') ||
    voices.find(v => v.name === 'Samantha') ||
    voices.find(v => /en/i.test(v.lang)) ||
    voices[0];
}
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = _loadFallbackVoice;
  _loadFallbackVoice();
}

function _fallbackSpeak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate  = 0.88;
  utt.pitch = 1.0;
  utt.volume = 1.0;
  if (_speechVoice) utt.voice = _speechVoice;
  window.speechSynthesis.speak(utt);
}

async function speak(text) {
  // Stop any audio already playing
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }

  try {
    const res = await fetch('/api/spelling-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('api');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    _currentAudio = new Audio(url);
    _currentAudio.play();
    _currentAudio.onended = () => { URL.revokeObjectURL(url); _currentAudio = null; };
  } catch {
    // No API key or network error — use Web Speech as fallback
    _fallbackSpeak(text);
  }
}

// ─── DIFFICULTY CARD LISTENERS ────────────────────────────────────────────────
document.querySelectorAll('.diff-card').forEach(card => {
  card.addEventListener('click', () => {
    startGame(card.dataset.level);
  });
});

// ─── SCORE / GAMEOVER BUTTONS ────────────────────────────────────────────────
document.getElementById('btn-play-again').addEventListener('click', () => startGame(state.level));
document.getElementById('btn-change-level').addEventListener('click', () => showScreen('screen-home'));
document.getElementById('btn-try-again').addEventListener('click', () => startGame(state.level));
document.getElementById('btn-go-home').addEventListener('click', () => showScreen('screen-home'));

// ─── KEYBOARD LAYOUT ─────────────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M']
];

function buildKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = '';
  KEYBOARD_ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'key-row';
    row.forEach(letter => {
      const btn = document.createElement('button');
      btn.className = 'key';
      btn.id = `key-${letter}`;
      btn.textContent = letter;
      btn.addEventListener('click', () => handleGuess(letter));
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function updateHeader() {
  document.getElementById('round-num').textContent = state.roundIndex + 1;
  document.getElementById('score').textContent = state.score;
  const badge = document.getElementById('diff-badge');
  badge.textContent = state.level.toUpperCase();
  badge.className = `diff-badge ${state.level}`;
}

// ─── HEARTS ──────────────────────────────────────────────────────────────────
function renderHearts() {
  const row = document.getElementById('hearts-row');
  row.innerHTML = '';
  for (let i = 0; i < state.heartsMax; i++) {
    row.innerHTML += i < state.hearts ? '❤️' : '🖤';
  }
}

// ─── WORD TILES ──────────────────────────────────────────────────────────────
function buildTiles(word) {
  const wrap = document.getElementById('tiles-wrap');
  wrap.innerHTML = '';
  word.split('').forEach((_, i) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.id = `tile-${i}`;
    wrap.appendChild(tile);
  });
}

// ─── GAME START ──────────────────────────────────────────────────────────────
function startGame(level) {
  state.level = level;
  state.heartsMax = HEARTS_BY_LEVEL[level];
  state.hearts = state.heartsMax;
  state.score = 0;
  state.roundIndex = 0;

  // Shuffle and pick 10 words
  const pool = [...WORDS[level]].sort(() => Math.random() - 0.5);
  state.wordList = pool.slice(0, ROUNDS);

  buildKeyboard();
  showScreen('screen-game');
  startRound();
}

// ─── ROUND START ─────────────────────────────────────────────────────────────
function startRound() {
  state.currentEntry = state.wordList[state.roundIndex];
  state.guessedLetters = new Set();
  state.hintShown = false;

  updateHeader();
  renderHearts();
  buildTiles(state.currentEntry.word);

  // Show hint immediately so the player knows what to spell
  document.getElementById('hint-text').textContent = state.currentEntry.hint;
  document.getElementById('hint-area').classList.remove('hidden');
  document.getElementById('round-overlay').classList.add('hidden');

  // Re-enable all keys
  document.querySelectorAll('.key').forEach(k => {
    k.disabled = false;
    k.className = 'key';
  });

  // Speak the word clearly — repeat it twice so kids catch it
  const word = state.currentEntry.word;
  speak(`Round ${state.roundIndex + 1}. Spell the word: ${word}.`);

  startTimer();
}

// ─── TIMER ───────────────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  state.timerRemaining = 30000;
  const bar = document.getElementById('timer-bar');
  bar.style.width = '100%';
  bar.classList.remove('urgent');

  state.timerInterval = setInterval(() => {
    state.timerRemaining -= 100;
    const pct = Math.max(0, (state.timerRemaining / 30000) * 100);
    bar.style.width = `${pct}%`;

    if (state.timerRemaining <= 10000) bar.classList.add('urgent');

    if (state.timerRemaining <= 0) {
      stopTimer();
      onTimerExpired();
    }
  }, 100);
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function onTimerExpired() {
  if (state.hintShown) return;
  state.hintShown = true;

  // Reveal first letter in tile
  const word = state.currentEntry.word;
  const firstLetter = word[0].toUpperCase();
  state.guessedLetters.add(firstLetter);

  const tile = document.getElementById('tile-0');
  if (!tile.textContent) {
    tile.textContent = firstLetter;
    tile.classList.add('hint-revealed');
  }

  // Mark key as correct
  const key = document.getElementById(`key-${firstLetter}`);
  if (key) { key.classList.add('correct'); key.disabled = true; }

  // Hint area is already visible — just remind them of the word
  speak(`The word is: ${state.currentEntry.word}.`);

  // Check if word was already complete after hint
  checkWordComplete();
}

// ─── GUESS HANDLING ──────────────────────────────────────────────────────────
function handleGuess(letter) {
  if (state.guessedLetters.has(letter)) return;
  state.guessedLetters.add(letter);

  const key = document.getElementById(`key-${letter}`);
  const word = state.currentEntry.word.toUpperCase();
  const isCorrect = word.includes(letter);

  if (isCorrect) {
    key.classList.add('correct');
    // Reveal all matching tiles
    word.split('').forEach((char, i) => {
      if (char === letter) {
        const tile = document.getElementById(`tile-${i}`);
        tile.textContent = letter;
        tile.classList.add('revealed');
      }
    });
    checkWordComplete();
  } else {
    key.classList.add('wrong');
    key.disabled = true;
    loseHeart();
  }
}

function checkWordComplete() {
  const word = state.currentEntry.word.toUpperCase();
  const complete = word.split('').every(char => state.guessedLetters.has(char));
  if (complete) onRoundWin();
}

// ─── HEART LOSS ──────────────────────────────────────────────────────────────
function loseHeart() {
  state.hearts--;
  renderHearts();

  // Shake alien
  const alien = document.getElementById('alien');
  alien.classList.add('shake');
  setTimeout(() => alien.classList.remove('shake'), 400);

  if (state.hearts <= 0) onGameOver();
}

// ─── ROUND WIN ───────────────────────────────────────────────────────────────
function onRoundWin() {
  stopTimer();
  state.score++;
  updateHeader();

  showRoundResult('⭐ GREAT JOB! ⭐');
  speak('Correct! Great job!');

  setTimeout(() => {
    document.getElementById('round-overlay').classList.add('hidden');
    nextRound();
  }, 1500);
}

function showRoundResult(html) {
  document.getElementById('overlay-content').innerHTML = html;
  document.getElementById('round-overlay').classList.remove('hidden');
}

// ─── NEXT ROUND ──────────────────────────────────────────────────────────────
function nextRound() {
  state.roundIndex++;
  if (state.roundIndex >= ROUNDS) {
    endGame();
  } else {
    startRound();
  }
}

// ─── GAME OVER (hearts gone) ─────────────────────────────────────────────────
function onGameOver() {
  stopTimer();
  speak('Oh no! Your alien ran out of hearts!');

  // Reveal the full word in tiles
  const word = state.currentEntry.word.toUpperCase();
  word.split('').forEach((char, i) => {
    const tile = document.getElementById(`tile-${i}`);
    if (!tile.textContent) {
      tile.textContent = char;
      tile.style.opacity = '0.5';
    }
  });

  // Disable all keys
  document.querySelectorAll('.key').forEach(k => { k.disabled = true; });

  document.getElementById('gameover-score').textContent = state.score;
  setTimeout(() => showScreen('screen-gameover'), 2000);
}

// ─── END GAME (10 rounds done) ───────────────────────────────────────────────
function endGame() {
  speak(`Mission complete! You spelled ${state.score} out of 10 words!`);

  document.getElementById('final-score').textContent = state.score;

  let stars = '';
  if (state.score === 10) stars = '⭐⭐⭐';
  else if (state.score >= 7) stars = '⭐⭐';
  else if (state.score >= 4) stars = '⭐';
  else stars = '💫';
  document.getElementById('score-stars').textContent = stars;

  showScreen('screen-score');
}

// ─── INIT ────────────────────────────────────────────────────────────────────
buildStars();
showScreen('screen-home');

document.addEventListener('keydown', e => {
  const letter = e.key.toUpperCase();
  if (letter.length === 1 && letter >= 'A' && letter <= 'Z') handleGuess(letter);
});
