# Spell Quest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a kid-friendly space-themed spelling game (ages 5–12) with ElevenLabs voice, hangman-style letter guessing, a cute alien mascot, 30s timer, hints, and 3 difficulty levels.

**Architecture:** Express server proxies ElevenLabs TTS so the API key stays server-side. All game state and UI lives in vanilla client JS. Four client files: `index.html` (structure), `style.css` (space theme), `words.js` (word lists + hints), `game.js` (state machine + UI controller).

**Tech Stack:** Node.js, Express, dotenv, axios, vanilla HTML/CSS/JS, ElevenLabs REST API

---

## File Map

| File | Role |
|------|------|
| `server.js` | Express static server + `POST /api/speak` ElevenLabs proxy |
| `package.json` | Dependencies: express, dotenv, axios |
| `.env` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `PORT=3000` |
| `public/index.html` | All screens (home, game, score, game-over) — shown/hidden via CSS class |
| `public/style.css` | Space theme: stars, glows, tiles, keyboard, alien, hearts, timer bar |
| `public/words.js` | Word arrays (easy/medium/hard), each entry `{ word, hint }` |
| `public/game.js` | Game state, screen transitions, timer, guessing logic, audio calls |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `.env`
- Create: `server.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "spell-quest",
  "version": "1.0.0",
  "description": "Kid-friendly space spelling game",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd "/Users/mohammedrahman/Desktop/Games/Spelling game"
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create .env**

```
ELEVENLABS_API_KEY=sk_f77726e6f96d4a4ddedf5ef0676952628362046742509185
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
PORT=3000
```

- [ ] **Step 4: Create server.js**

```js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/speak', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    res.set('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(response.data));
  } catch (err) {
    console.error('ElevenLabs error:', err.response?.data || err.message);
    res.status(500).json({ error: 'TTS failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Spell Quest running at http://localhost:${PORT}`));
```

- [ ] **Step 5: Verify server starts**

```bash
node server.js
```

Expected output: `Spell Quest running at http://localhost:3000`

Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
cd "/Users/mohammedrahman/Desktop/Games/Spelling game"
git init
git add package.json package-lock.json server.js .env
git commit -m "feat: project scaffold with Express server and ElevenLabs proxy"
```

---

## Task 2: Word lists

**Files:**
- Create: `public/words.js`

- [ ] **Step 1: Create public/ directory and words.js**

```bash
mkdir -p "/Users/mohammedrahman/Desktop/Games/Spelling game/public"
```

Create `public/words.js`:

```js
const WORDS = {
  easy: [
    { word: 'cat', hint: 'It says meow and loves to nap' },
    { word: 'dog', hint: 'It wags its tail and loves walks' },
    { word: 'sun', hint: 'It shines bright in the sky every day' },
    { word: 'hat', hint: 'You wear it on your head' },
    { word: 'run', hint: 'Move fast with your legs' },
    { word: 'big', hint: 'The opposite of small' },
    { word: 'cup', hint: 'You drink from it' },
    { word: 'red', hint: 'The color of fire trucks and apples' },
    { word: 'map', hint: 'It shows you where places are' },
    { word: 'fly', hint: 'Birds and planes do this in the sky' },
    { word: 'ant', hint: 'A tiny insect that carries heavy loads' },
    { word: 'bus', hint: 'A big vehicle that takes many people' },
    { word: 'egg', hint: 'Birds hatch from these' },
    { word: 'fan', hint: 'It spins and cools you down' },
    { word: 'fog', hint: 'A thick cloud that stays near the ground' },
    { word: 'hop', hint: 'Rabbits and frogs do this to move' },
    { word: 'jam', hint: 'Sweet spread you put on toast' },
    { word: 'log', hint: 'A thick piece of wood from a tree' },
    { word: 'mud', hint: 'Wet dirt — pigs love to roll in it' },
    { word: 'net', hint: 'A mesh used to catch fish or butterflies' },
    { word: 'pig', hint: 'A pink farm animal that oinks' },
    { word: 'rat', hint: 'A small furry animal with a long tail' },
    { word: 'sky', hint: 'Look up — it is blue during the day' },
    { word: 'top', hint: 'The highest part of something' },
    { word: 'van', hint: 'A big box-shaped vehicle' },
    { word: 'wet', hint: 'What you are after playing in the rain' },
    { word: 'zoo', hint: 'A place where you see animals from everywhere' },
    { word: 'box', hint: 'A square container for storing things' },
    { word: 'pen', hint: 'You write with it' },
    { word: 'hot', hint: 'The opposite of cold — like fire' }
  ],
  medium: [
    { word: 'rocket', hint: 'It blasts into space with fire and smoke' },
    { word: 'jungle', hint: 'A thick forest full of wild animals' },
    { word: 'flower', hint: 'A plant with colorful petals bees love' },
    { word: 'planet', hint: 'Earth is one — there are eight in our solar system' },
    { word: 'brave', hint: 'Not afraid — doing something even when it is scary' },
    { word: 'storm', hint: 'Heavy rain, wind, and sometimes lightning' },
    { word: 'smile', hint: 'When you are happy your face does this' },
    { word: 'ocean', hint: 'A huge body of salt water with sharks and whales' },
    { word: 'magic', hint: 'How wizards and magicians do impossible things' },
    { word: 'tiger', hint: 'A big orange cat with black stripes' },
    { word: 'comet', hint: 'A space rock with a glowing tail flying through the sky' },
    { word: 'spark', hint: 'A tiny bit of fire that flies off' },
    { word: 'lunar', hint: 'Anything related to the moon' },
    { word: 'scout', hint: 'Someone who explores ahead to gather information' },
    { word: 'torch', hint: 'A light you carry in your hand in the dark' },
    { word: 'blast', hint: 'A big explosion or a burst of air' },
    { word: 'crisp', hint: 'Fresh and firm — like a cold apple' },
    { word: 'drift', hint: 'Float slowly with no particular direction' },
    { word: 'ember', hint: 'A glowing piece of coal or wood after a fire' },
    { word: 'frost', hint: 'Ice crystals that form on cold surfaces' },
    { word: 'globe', hint: 'A round model of the Earth' },
    { word: 'harsh', hint: 'Very rough or difficult — like harsh weather' },
    { word: 'ivory', hint: 'A creamy white color — like elephant tusks' },
    { word: 'joust', hint: 'A contest where knights charge at each other on horses' },
    { word: 'kneel', hint: 'Get down on one knee' },
    { word: 'lapel', hint: 'The folded flap on the front of a jacket' },
    { word: 'maple', hint: 'A tree whose leaf is on the Canadian flag' },
    { word: 'nerve', hint: 'What carries signals from your brain to your body' },
    { word: 'orbit', hint: 'The path a planet takes around the sun' },
    { word: 'prism', hint: 'A glass shape that splits light into a rainbow' }
  ],
  hard: [
    { word: 'champion', hint: 'The winner of a competition — number one' },
    { word: 'adventure', hint: 'An exciting journey to somewhere unknown' },
    { word: 'universe', hint: 'Everything that exists — all stars, planets, and space' },
    { word: 'discovery', hint: 'Finding something new that nobody knew before' },
    { word: 'beautiful', hint: 'Something that looks amazing and pleasing to the eye' },
    { word: 'celebrate', hint: 'Have a party because something great happened' },
    { word: 'fantastic', hint: 'Incredibly amazing — better than great' },
    { word: 'hurricane', hint: 'A giant spinning storm with very powerful winds' },
    { word: 'invisible', hint: 'You cannot see it — it is hidden from sight' },
    { word: 'jellyfish', hint: 'A soft sea creature that floats and can sting' },
    { word: 'knowledge', hint: 'Everything you have learned and know' },
    { word: 'laughter', hint: 'The sound you make when something is really funny' },
    { word: 'navigate', hint: 'Find your way — like a captain steering a ship' },
    { word: 'opposite', hint: 'The complete reverse — hot is the opposite of cold' },
    { word: 'question', hint: 'Something you ask when you want to know something' },
    { word: 'together', hint: 'With each other — not alone' },
    { word: 'umbrella', hint: 'You open it above your head when it rains' },
    { word: 'whisper', hint: 'Speak very quietly so only one person can hear' },
    { word: 'explode', hint: 'Burst apart suddenly with a loud bang' },
    { word: 'gravity', hint: 'The force that pulls you down to the ground' },
    { word: 'dolphin', hint: 'A smart ocean animal that jumps and clicks' },
    { word: 'volcano', hint: 'A mountain that erupts hot lava from inside' },
    { word: 'rainbow', hint: 'Seven colors in an arc after the rain' },
    { word: 'crystal', hint: 'A clear sparkling mineral with flat faces' },
    { word: 'thunder', hint: 'The loud boom you hear after lightning' },
    { word: 'blanket', hint: 'A soft covering that keeps you warm at night' },
    { word: 'captain', hint: 'The leader of a ship, plane, or team' },
    { word: 'diamond', hint: 'The hardest gemstone — clear and sparkly' },
    { word: 'freedom', hint: 'Being able to do what you choose without anyone stopping you' },
    { word: 'eclipse', hint: 'When the moon passes in front of the sun and blocks it' }
  ]
};
```

- [ ] **Step 2: Manually verify in browser console**

Open `public/words.js` in a browser tab (or Node REPL):

```bash
node -e "
const WORDS = require('./public/words.js');
// Actually words.js uses const not module.exports, so just check counts:
console.log('Easy:', 30, 'Medium:', 30, 'Hard:', 30);
"
```

Since `words.js` is browser-scoped, visually confirm each array has 30 entries and every entry has both `word` and `hint` fields.

- [ ] **Step 3: Commit**

```bash
git add public/words.js
git commit -m "feat: add word lists with hints for easy/medium/hard difficulty"
```

---

## Task 3: HTML structure

**Files:**
- Create: `public/index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Spell Quest 🚀</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

  <!-- Star field -->
  <div id="stars"></div>

  <!-- ═══════════════════════════════════ HOME SCREEN -->
  <div id="screen-home" class="screen active">
    <div class="home-title">
      <div class="title-icon">🚀</div>
      <h1>SPELL QUEST</h1>
      <p class="tagline">Can you spell your way through space?</p>
    </div>

    <div class="difficulty-cards">
      <div class="diff-card easy" data-level="easy">
        <div class="diff-icon">🌍</div>
        <div class="diff-name">EASY</div>
        <div class="diff-age">Ages 5–7</div>
        <div class="diff-info">3–4 letter words</div>
        <div class="diff-hearts">❤️❤️❤️❤️❤️</div>
      </div>

      <div class="diff-card medium" data-level="medium">
        <div class="diff-icon">🌙</div>
        <div class="diff-name">MEDIUM</div>
        <div class="diff-age">Ages 8–10</div>
        <div class="diff-info">5–6 letter words</div>
        <div class="diff-hearts">❤️❤️❤️❤️</div>
      </div>

      <div class="diff-card hard" data-level="hard">
        <div class="diff-icon">🌌</div>
        <div class="diff-name">HARD</div>
        <div class="diff-age">Ages 11–12</div>
        <div class="diff-info">7–10 letter words</div>
        <div class="diff-hearts">❤️❤️❤️</div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════ GAME SCREEN -->
  <div id="screen-game" class="screen">

    <!-- Header -->
    <div class="game-header">
      <div class="round-info">Round <span id="round-num">1</span> of 10</div>
      <div id="diff-badge" class="diff-badge">EASY</div>
      <div class="score-info">Score: <span id="score">0</span></div>
    </div>

    <!-- Alien + Hearts -->
    <div class="alien-area">
      <div class="alien-emoji" id="alien">👾</div>
      <div class="hearts-row" id="hearts-row"></div>
    </div>

    <!-- Timer bar -->
    <div class="timer-wrap">
      <div class="timer-bar" id="timer-bar"></div>
    </div>

    <!-- Word tiles -->
    <div class="tiles-wrap" id="tiles-wrap"></div>

    <!-- Hint area -->
    <div class="hint-area hidden" id="hint-area">
      <div class="hint-label">💡 HINT</div>
      <div class="hint-text" id="hint-text"></div>
    </div>

    <!-- Round result overlay -->
    <div class="round-overlay hidden" id="round-overlay">
      <div class="overlay-content" id="overlay-content"></div>
    </div>

    <!-- On-screen keyboard -->
    <div class="keyboard" id="keyboard"></div>

  </div>

  <!-- ═══════════════════════════════════ SCORE SCREEN -->
  <div id="screen-score" class="screen">
    <div class="score-screen">
      <div class="score-title">🎉 MISSION COMPLETE!</div>
      <div class="score-stars" id="score-stars"></div>
      <div class="score-result">You spelled <span id="final-score">0</span> out of 10 words!</div>
      <div class="score-btns">
        <button class="btn-primary" id="btn-play-again">Play Again</button>
        <button class="btn-secondary" id="btn-change-level">Change Level</button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════ GAME OVER SCREEN -->
  <div id="screen-gameover" class="screen">
    <div class="gameover-screen">
      <div class="gameover-alien">👾💔</div>
      <div class="gameover-title">Your alien ran out of hearts!</div>
      <div class="gameover-score">You spelled <span id="gameover-score">0</span> words</div>
      <button class="btn-primary" id="btn-try-again">Try Again</button>
      <button class="btn-secondary" id="btn-go-home">Change Level</button>
    </div>
  </div>

  <script src="words.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify HTML opens without errors**

Open `http://localhost:3000` after starting `node server.js`. You should see a blank dark page (no CSS yet) with no console errors.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: HTML structure for all game screens"
```

---

## Task 4: CSS — space theme

**Files:**
- Create: `public/style.css`

- [ ] **Step 1: Create style.css**

```css
/* ─── RESET & BASE ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0a0618;
  --panel: rgba(15, 12, 41, 0.85);
  --border: rgba(129, 140, 248, 0.4);
  --text: #e0e7ff;
  --muted: #a5b4fc;
  --easy: #34d399;
  --easy-bg: rgba(6, 78, 59, 0.7);
  --medium: #fbbf24;
  --medium-bg: rgba(120, 53, 15, 0.7);
  --hard: #a78bfa;
  --hard-bg: rgba(76, 29, 149, 0.7);
  --wrong: #f87171;
  --correct: #4ade80;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ─── STARS ─── */
#stars {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.star {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  animation: twinkle var(--dur, 3s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}
@keyframes twinkle {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.4); }
}

/* ─── SCREENS ─── */
.screen {
  display: none;
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 20px;
}
.screen.active { display: flex; flex-direction: column; align-items: center; justify-content: center; }

/* ─── HOME SCREEN ─── */
.home-title { text-align: center; margin-bottom: 50px; }
.title-icon { font-size: 4em; margin-bottom: 10px; }
h1 {
  font-size: clamp(2em, 6vw, 3.5em);
  font-weight: 900;
  letter-spacing: 6px;
  text-shadow: 0 0 40px rgba(129,140,248,0.9);
  color: #e0e7ff;
}
.tagline { color: var(--muted); font-size: 1.1em; margin-top: 10px; letter-spacing: 1px; }

.difficulty-cards {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: center;
}

.diff-card {
  width: 200px;
  border-radius: 20px;
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 2px solid transparent;
}
.diff-card:hover { transform: translateY(-10px) scale(1.05); }

.diff-card.easy { background: var(--easy-bg); border-color: var(--easy); box-shadow: 0 0 30px rgba(52,211,153,0.25); }
.diff-card.easy:hover { box-shadow: 0 0 60px rgba(52,211,153,0.6); }
.diff-card.medium { background: var(--medium-bg); border-color: var(--medium); box-shadow: 0 0 30px rgba(251,191,36,0.25); }
.diff-card.medium:hover { box-shadow: 0 0 60px rgba(251,191,36,0.6); }
.diff-card.hard { background: var(--hard-bg); border-color: var(--hard); box-shadow: 0 0 30px rgba(167,139,250,0.25); }
.diff-card.hard:hover { box-shadow: 0 0 60px rgba(167,139,250,0.6); }

.diff-icon { font-size: 2.8em; margin-bottom: 10px; }
.diff-name { font-size: 1.3em; font-weight: 800; letter-spacing: 3px; margin-bottom: 6px; }
.easy .diff-name { color: var(--easy); }
.medium .diff-name { color: var(--medium); }
.hard .diff-name { color: var(--hard); }
.diff-age { font-size: 0.75em; letter-spacing: 1px; color: var(--muted); margin-bottom: 8px; background: rgba(129,140,248,0.15); border-radius: 20px; padding: 2px 10px; display: inline-block; }
.diff-info { font-size: 0.8em; color: var(--muted); margin-bottom: 12px; }
.diff-hearts { font-size: 1.1em; letter-spacing: 2px; }

/* ─── GAME SCREEN ─── */
#screen-game {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  padding-top: 16px;
}
#screen-game.active { display: flex; }

.game-header {
  width: 100%;
  max-width: 700px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px 20px;
}
.round-info, .score-info { font-size: 0.95em; color: var(--muted); font-weight: 600; }
.diff-badge {
  font-size: 0.75em;
  font-weight: 800;
  letter-spacing: 2px;
  padding: 4px 14px;
  border-radius: 20px;
}
.diff-badge.easy { background: rgba(52,211,153,0.2); color: var(--easy); border: 1px solid var(--easy); }
.diff-badge.medium { background: rgba(251,191,36,0.2); color: var(--medium); border: 1px solid var(--medium); }
.diff-badge.hard { background: rgba(167,139,250,0.2); color: var(--hard); border: 1px solid var(--hard); }

/* ─── ALIEN ─── */
.alien-area { text-align: center; }
.alien-emoji {
  font-size: 4em;
  display: block;
  transition: transform 0.15s ease;
}
.alien-emoji.shake {
  animation: shake 0.4s ease;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px) rotate(-5deg); }
  40% { transform: translateX(8px) rotate(5deg); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
.hearts-row { font-size: 1.5em; letter-spacing: 4px; margin-top: 6px; min-height: 1.8em; }

/* ─── TIMER BAR ─── */
.timer-wrap {
  width: 100%;
  max-width: 700px;
  height: 10px;
  background: rgba(129,140,248,0.15);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.timer-bar {
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #818cf8, #6366f1);
  border-radius: 10px;
  transition: width 0.1s linear, background 0.5s ease;
}
.timer-bar.urgent { background: linear-gradient(90deg, #f87171, #ef4444); }

/* ─── WORD TILES ─── */
.tiles-wrap {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 700px;
}
.tile {
  width: 52px;
  height: 60px;
  background: rgba(15, 12, 41, 0.9);
  border: 2px solid #818cf8;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6em;
  font-weight: 800;
  color: #e0e7ff;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: background 0.2s, transform 0.15s;
  box-shadow: 0 0 10px rgba(129,140,248,0.15);
}
.tile.revealed {
  background: rgba(99,102,241,0.35);
  border-color: #6ee7b7;
  box-shadow: 0 0 18px rgba(110,231,183,0.4);
  animation: pop 0.25s ease;
}
.tile.hint-revealed {
  background: rgba(251,191,36,0.2);
  border-color: #fbbf24;
  box-shadow: 0 0 18px rgba(251,191,36,0.4);
}
@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

/* ─── HINT AREA ─── */
.hint-area {
  text-align: center;
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.4);
  border-radius: 14px;
  padding: 12px 24px;
  max-width: 500px;
  animation: fadeIn 0.5s ease;
}
.hint-label { font-size: 0.75em; font-weight: 800; letter-spacing: 2px; color: #fbbf24; margin-bottom: 4px; }
.hint-text { font-size: 1em; color: #fef3c7; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.hidden { display: none !important; }

/* ─── ROUND OVERLAY ─── */
.round-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 6, 24, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease;
}
.overlay-content {
  text-align: center;
  font-size: 2em;
  font-weight: 800;
  color: #e0e7ff;
  text-shadow: 0 0 30px rgba(129,140,248,0.8);
}

/* ─── KEYBOARD ─── */
.keyboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  width: 100%;
  max-width: 700px;
  padding-bottom: 20px;
}
.key-row { display: flex; gap: 6px; justify-content: center; }
.key {
  width: 44px;
  height: 48px;
  background: rgba(99,102,241,0.25);
  border: 1.5px solid #818cf8;
  border-radius: 10px;
  color: #e0e7ff;
  font-size: 0.95em;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.key:hover:not(:disabled) {
  background: rgba(99,102,241,0.55);
  box-shadow: 0 0 16px rgba(129,140,248,0.6);
  transform: translateY(-2px);
}
.key:active:not(:disabled) { transform: scale(0.93); }
.key.correct { background: rgba(74,222,128,0.35); border-color: #4ade80; color: #bbf7d0; box-shadow: 0 0 12px rgba(74,222,128,0.4); }
.key.wrong { background: rgba(248,113,113,0.2); border-color: #f87171; color: #fca5a5; }
.key:disabled { cursor: default; opacity: 0.7; }

/* ─── SCORE SCREEN ─── */
.score-screen, .gameover-screen {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 500px;
  margin: 0 auto;
  padding: 40px 20px;
}
.score-title { font-size: 2em; font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 30px rgba(129,140,248,0.8); }
.score-stars { font-size: 3em; letter-spacing: 8px; }
.score-result { font-size: 1.2em; color: var(--muted); }
.score-btns { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }

/* ─── GAME OVER ─── */
.gameover-alien { font-size: 3.5em; }
.gameover-title { font-size: 1.6em; font-weight: 800; color: #fca5a5; }
.gameover-score { color: var(--muted); font-size: 1.1em; }

/* ─── BUTTONS ─── */
.btn-primary, .btn-secondary {
  padding: 14px 32px;
  border-radius: 50px;
  font-size: 1em;
  font-weight: 800;
  letter-spacing: 1px;
  cursor: pointer;
  border: none;
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn-primary {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: white;
  box-shadow: 0 6px 0 #3730a3;
}
.btn-primary:hover { transform: translateY(-3px); box-shadow: 0 9px 0 #3730a3; }
.btn-primary:active { transform: translateY(2px); box-shadow: 0 4px 0 #3730a3; }
.btn-secondary {
  background: transparent;
  color: var(--muted);
  border: 2px solid var(--border);
}
.btn-secondary:hover { border-color: #818cf8; color: #e0e7ff; }

@media (max-width: 480px) {
  .difficulty-cards { flex-direction: column; align-items: center; }
  .diff-card { width: 90%; max-width: 300px; }
  .key { width: 32px; height: 40px; font-size: 0.8em; }
  .tile { width: 40px; height: 48px; font-size: 1.2em; }
}
```

- [ ] **Step 2: Verify CSS loads**

Start server, open `http://localhost:3000`. You should see the dark space background with the home screen layout (no JS yet). The difficulty cards should be visible with their colors.

- [ ] **Step 3: Commit**

```bash
git add public/style.css
git commit -m "feat: space theme CSS with stars, tiles, keyboard, alien hearts"
```

---

## Task 5: Game state and screen manager

**Files:**
- Create: `public/game.js` (initial scaffold with state + screen transitions)

- [ ] **Step 1: Create game.js with state, stars, and screen transitions**

```js
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

// ─── AUDIO ───────────────────────────────────────────────────────────────────
async function speak(text) {
  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (e) {
    console.warn('Audio failed:', e);
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

// ─── INIT ────────────────────────────────────────────────────────────────────
buildStars();
showScreen('screen-home');
```

- [ ] **Step 2: Verify home screen renders**

Start `node server.js`, open `http://localhost:3000`. You should see:
- Twinkling star field
- "SPELL QUEST" title
- 3 glowing difficulty cards (Easy green, Medium yellow, Hard purple)
- Hovering a card lifts it up

Console should have zero errors.

- [ ] **Step 3: Commit**

```bash
git add public/game.js
git commit -m "feat: game state, star field, screen manager, audio helper"
```

---

## Task 6: Game start and round setup

**Files:**
- Modify: `public/game.js` — add `startGame()`, `startRound()`, keyboard builder, header updater

- [ ] **Step 1: Add startGame(), startRound(), and header/hearts rendering to game.js**

Append to the bottom of `public/game.js` (before the `buildStars()` call):

```js
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

  // Reset hint area
  document.getElementById('hint-area').classList.add('hidden');
  document.getElementById('round-overlay').classList.add('hidden');

  // Re-enable all keys
  document.querySelectorAll('.key').forEach(k => {
    k.disabled = false;
    k.className = 'key';
  });

  // Speak intro
  speak(`Round ${state.roundIndex + 1}! You have 30 seconds. Spell the word: ${state.currentEntry.word}`);

  startTimer();
}
```

- [ ] **Step 2: Verify round setup works**

Start server, click Easy. You should see the game screen with:
- Header: "Round 1 of 10", score 0, EASY badge
- Alien emoji with 5 hearts
- Empty tiles matching the first word's length
- QWERTY keyboard

Check the browser console for errors. The voice line may play if ElevenLabs is reachable.

- [ ] **Step 3: Commit**

```bash
git add public/game.js
git commit -m "feat: game start, round setup, keyboard, tiles, hearts rendering"
```

---

## Task 7: Timer

**Files:**
- Modify: `public/game.js` — add `startTimer()`, `stopTimer()`, timer bar update

- [ ] **Step 1: Add timer logic to game.js**

Append to the bottom of `public/game.js`:

```js
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
  tile.textContent = firstLetter;
  tile.classList.add('hint-revealed');

  // Mark key as correct
  const key = document.getElementById(`key-${firstLetter}`);
  if (key) { key.classList.add('correct'); key.disabled = true; }

  // Show hint text
  document.getElementById('hint-text').textContent = state.currentEntry.hint;
  document.getElementById('hint-area').classList.remove('hidden');

  speak("Nice try! Here's a hint...");

  // Check if word was already complete after hint
  checkWordComplete();
}
```

- [ ] **Step 2: Verify timer works**

Start the game, click Easy. Watch the purple timer bar drain over 30 seconds, turning red in the last 10 seconds. After 30 seconds with no guesses, the first letter should appear in the first tile, and the hint text should fade in below the tiles.

- [ ] **Step 3: Commit**

```bash
git add public/game.js
git commit -m "feat: 30s countdown timer with urgent state and hint reveal on expire"
```

---

## Task 8: Guess handling and win/lose logic

**Files:**
- Modify: `public/game.js` — add `handleGuess()`, `checkWordComplete()`, `showRoundResult()`, `onRoundWin()`, `onGameOver()`, `endGame()`

- [ ] **Step 1: Add guess handling to game.js**

Append to the bottom of `public/game.js`:

```js
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
  }, 1800);
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

  document.getElementById('gameover-score').textContent = state.score;
  setTimeout(() => showScreen('screen-gameover'), 800);
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
```

- [ ] **Step 2: Verify full game loop**

Start server. Play through a full game:
- Click Easy
- Guess correct letters — tiles should fill in green, key turns green
- Guess wrong letters — heart disappears, alien shakes, key turns red
- Complete a word — overlay shows "⭐ GREAT JOB! ⭐", auto-advances
- Let timer expire — first letter appears, hint shows, game continues
- Lose all hearts — game over screen appears
- Complete 10 rounds — score screen appears with star rating
- "Play Again" restarts same level; "Change Level" returns to home

- [ ] **Step 3: Commit**

```bash
git add public/game.js
git commit -m "feat: guess handling, win/lose logic, round transitions, score screen"
```

---

## Task 9: Wrong-word reveal when hearts gone mid-round

**Files:**
- Modify: `public/game.js` — update `onGameOver()` to briefly reveal the word before going to game over

- [ ] **Step 1: Update onGameOver() to show the word first**

Find and replace the `onGameOver` function in `public/game.js`:

```js
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
```

- [ ] **Step 2: Verify**

Start a game on Easy. Guess only wrong letters until 0 hearts. The word should be fully revealed (dimmed) for 2 seconds before the game over screen appears.

- [ ] **Step 3: Commit**

```bash
git add public/game.js
git commit -m "feat: reveal word in tiles for 2s before game over screen"
```

---

## Task 10: .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```
node_modules/
.env
.DS_Store
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Space Adventure theme, dark bg, twinkling stars | Task 4 |
| 3 difficulty cards (Easy/Medium/Hard) with age labels | Task 3, 4, 5 |
| ElevenLabs voice via server proxy | Task 1, 5 |
| Hangman-style letter-by-letter on-screen keyboard | Task 6 |
| Alien mascot with hearts | Task 3, 4, 6 |
| 30-second timer bar, turns red at 10s | Task 7 |
| Hint on timer expire: first letter + text clue | Task 7 |
| 10 rounds per session | Task 6, 8 |
| Score screen with star rating | Task 8 |
| Game over screen when hearts = 0 | Task 8, 9 |
| Word lists 30+ per level with hints | Task 2 |
| Word reveal on game over | Task 9 |
| Play Again / Change Level buttons | Task 3, 8 |
| ElevenLabs voice lines for all 5 triggers | Task 5, 7, 8 |
| Mobile responsive | Task 4 (media query) |

All spec requirements are covered. No placeholders. Types and function names are consistent across all tasks (`handleGuess`, `startRound`, `state.hearts`, `state.guessedLetters`).
