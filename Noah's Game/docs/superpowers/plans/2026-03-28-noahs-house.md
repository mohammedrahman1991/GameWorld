# Noah's House — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 1v1 browser basketball game (Curry vs Edwards on a beach court) served by Express on port 3021, using Phaser 3 for all game rendering and logic.

**Architecture:** Express serves `public/` as static files. Phaser 3 is loaded from CDN via script tag. All game JS files are plain ES5/ES6 classes loaded as classic scripts — no bundler required. Testable pure-logic modules export via `if (typeof module !== 'undefined') module.exports = ...` so Jest can import them without Phaser.

**Tech Stack:** Node.js, Express 4, Phaser 3.60 (CDN), Jest 29 (logic tests), ElevenLabs REST API (commentary), dotenv

---

## File Map

```
Noah's Game/
├── .env                              # PORT=3021, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
├── package.json
├── server.js                         # Express — serves public/ + /api/commentary POST endpoint
├── public/
│   ├── index.html                    # Loads Phaser CDN + all game scripts in order
│   └── js/
│       ├── config.js                 # Shared constants (canvas size, court coords, hoop pos, zones)
│       ├── systems/
│       │   ├── ScoreZone.js          # isThreePointer(px,py,hoop), isDunkZone(px,py,hoop) — pure, testable
│       │   ├── ShotAccuracy.js       # calcAccuracy(stat, zone, meterScore) — pure, testable
│       │   └── Commentary.js         # fetchCommentary(event) — calls /api/commentary, plays audio
│       ├── entities/
│       │   ├── Player.js             # Base Player class: movement, draw, state machine
│       │   ├── Curry.js              # extends Player — Curry stats + gold arc flag
│       │   ├── Edwards.js            # extends Player — Edwards stats + dunk zone flag
│       │   └── Ball.js               # Ball class: dribble follow, arc tween, net swish
│       ├── ui/
│       │   ├── HUD.js                # Score, shot clock, game timer, controls bar (bottom)
│       │   └── ScorePop.js           # Floating +2/+3 tween animation
│       └── scenes/
│           ├── TitleScene.js         # Title screen, PLAY button
│           ├── GameScene.js          # Main game loop — wires all systems together
│           └── GameOverScene.js      # Winner display, PLAY AGAIN button
├── tests/
│   ├── scoreZone.test.js
│   └── shotAccuracy.test.js
└── docs/
    └── superpowers/
        ├── specs/2026-03-28-noahs-house-design.md
        └── plans/2026-03-28-noahs-house.md
```

---

## Court Coordinate Reference (used in all tasks)

```
Canvas: 960 × 540

Court trapezoid (perspective):
  farLeft:   (210, 155)
  farRight:  (750, 155)
  nearRight: (870, 415)
  nearLeft:   (90, 415)

Left hoop:   (165, 285)
Right hoop:  (795, 285)

THREE_POINT_DIST = 135   (pixels from hoop center)
DUNK_ZONE_DIST   =  55   (pixels from hoop center)

Player Y range:  170 – 400  (top to bottom of court)
Player X range:  130 – 830
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `server.js`
- Create: `public/index.html`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "noahs-house",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "node-fetch": "^2.7.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd "/Users/mohammedrahman/Desktop/Claude Code/Noah's Game"
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create server.js**

```javascript
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ElevenLabs commentary endpoint
app.post('/api/commentary', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      }
    );
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}`);
    const audioBuffer = await response.buffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (err) {
    console.error('Commentary error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3021;
app.listen(PORT, () => console.log(`Noah's House running at http://localhost:${PORT}`));
```

- [ ] **Step 4: Create public/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Noah's House</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; overflow: hidden; }
  </style>
</head>
<body>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <script src="js/config.js"></script>
  <script src="js/systems/ScoreZone.js"></script>
  <script src="js/systems/ShotAccuracy.js"></script>
  <script src="js/systems/Commentary.js"></script>
  <script src="js/entities/Player.js"></script>
  <script src="js/entities/Curry.js"></script>
  <script src="js/entities/Edwards.js"></script>
  <script src="js/entities/Ball.js"></script>
  <script src="js/ui/HUD.js"></script>
  <script src="js/ui/ScorePop.js"></script>
  <script src="js/scenes/TitleScene.js"></script>
  <script src="js/scenes/GameScene.js"></script>
  <script src="js/scenes/GameOverScene.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: Verify server starts**

```bash
npm start
```

Expected: `Noah's House running at http://localhost:3021`. Visit http://localhost:3021 — blank black page (no game yet).

- [ ] **Step 6: Commit**

```bash
git init
git add package.json server.js public/index.html .env
git commit -m "feat: project bootstrap — Express server + HTML shell"
```

---

## Task 2: Shared Config + Phaser Init

**Files:**
- Create: `public/js/config.js`
- Create: `public/js/main.js`

- [ ] **Step 1: Create public/js/config.js**

```javascript
var GAME_CONFIG = {
  WIDTH: 960,
  HEIGHT: 540,

  // Court trapezoid vertices
  COURT: {
    farLeft:   { x: 210, y: 155 },
    farRight:  { x: 750, y: 155 },
    nearRight: { x: 870, y: 415 },
    nearLeft:  { x:  90, y: 415 }
  },

  // Hoop positions (center of rim)
  LEFT_HOOP:  { x: 165, y: 285 },
  RIGHT_HOOP: { x: 795, y: 285 },

  // Zone distances (pixels from hoop center)
  THREE_POINT_DIST: 135,
  DUNK_ZONE_DIST:    55,

  // Player movement speed
  PLAYER_SPEED: 220,

  // Shot meter timing (ms to fill full bar)
  SHOT_METER_FILL_TIME: 1000,

  // Shot clock (ms)
  SHOT_CLOCK_MS: 24000,

  // Win score
  WIN_SCORE: 21,

  // Ball arc height (negative = upward)
  BALL_ARC_HEIGHT: -180,
  BALL_ARC_DURATION: 750
};
```

- [ ] **Step 2: Create public/js/main.js**

```javascript
var game = new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: '#000000',
  scene: [TitleScene, GameScene, GameOverScene],
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});
```

- [ ] **Step 3: Create stub scenes so the page loads without errors**

Create `public/js/scenes/TitleScene.js`:
```javascript
class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }
  create() {
    this.add.text(480, 270, "NOAH'S HOUSE", { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
  }
}
```

Create `public/js/scenes/GameScene.js`:
```javascript
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }
  create() {}
  update() {}
}
```

Create `public/js/scenes/GameOverScene.js`:
```javascript
class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }
  create() {}
}
```

- [ ] **Step 4: Verify in browser**

```bash
npm start
```

Visit http://localhost:3021. Expected: black canvas with white "NOAH'S HOUSE" text centered.

- [ ] **Step 5: Commit**

```bash
git add public/js/config.js public/js/main.js public/js/scenes/
git commit -m "feat: Phaser init + shared config constants"
```

---

## Task 3: Score Zone + Shot Accuracy (Pure Logic + Tests)

**Files:**
- Create: `public/js/systems/ScoreZone.js`
- Create: `public/js/systems/ShotAccuracy.js`
- Create: `tests/scoreZone.test.js`
- Create: `tests/shotAccuracy.test.js`

- [ ] **Step 1: Write failing tests for ScoreZone**

Create `tests/scoreZone.test.js`:
```javascript
const { isThreePointer, isDunkZone } = require('../public/js/systems/ScoreZone.js');

const LEFT_HOOP  = { x: 165, y: 285 };
const RIGHT_HOOP = { x: 795, y: 285 };

describe('isThreePointer', () => {
  test('returns false when player is inside left arc', () => {
    expect(isThreePointer(220, 285, LEFT_HOOP)).toBe(false);
  });
  test('returns true when player is outside left arc', () => {
    expect(isThreePointer(400, 285, LEFT_HOOP)).toBe(true);
  });
  test('returns false when player is inside right arc', () => {
    expect(isThreePointer(730, 285, RIGHT_HOOP)).toBe(false);
  });
  test('returns true when player is outside right arc', () => {
    expect(isThreePointer(600, 285, RIGHT_HOOP)).toBe(true);
  });
});

describe('isDunkZone', () => {
  test('returns true when player is very close to hoop', () => {
    expect(isDunkZone(175, 285, LEFT_HOOP)).toBe(true);
  });
  test('returns false when player is far from hoop', () => {
    expect(isDunkZone(400, 285, LEFT_HOOP)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx jest tests/scoreZone.test.js
```

Expected: `Cannot find module '../public/js/systems/ScoreZone.js'`

- [ ] **Step 3: Write failing tests for ShotAccuracy**

Create `tests/shotAccuracy.test.js`:
```javascript
const { calcAccuracy } = require('../public/js/systems/ShotAccuracy.js');

describe('calcAccuracy', () => {
  test('perfect green release with high stat returns high accuracy', () => {
    const acc = calcAccuracy(99, 'three', 1.0); // stat=99, zone=three, meterScore=1.0 (perfect)
    expect(acc).toBeGreaterThan(0.9);
  });
  test('red release returns low accuracy regardless of stat', () => {
    const acc = calcAccuracy(99, 'three', 0.0);
    expect(acc).toBeLessThan(0.4);
  });
  test('curry three stat gives wider green (higher base)', () => {
    const curry = calcAccuracy(99, 'three', 0.8);
    const ant   = calcAccuracy(82, 'three', 0.8);
    expect(curry).toBeGreaterThan(ant);
  });
});
```

- [ ] **Step 4: Run tests — confirm they fail**

```bash
npx jest tests/shotAccuracy.test.js
```

Expected: `Cannot find module '../public/js/systems/ShotAccuracy.js'`

- [ ] **Step 5: Implement ScoreZone.js**

Create `public/js/systems/ScoreZone.js`:
```javascript
var ScoreZone = {
  isThreePointer: function(px, py, hoop) {
    var dx = px - hoop.x;
    var dy = py - hoop.y;
    return Math.sqrt(dx * dx + dy * dy) > 135;
  },
  isDunkZone: function(px, py, hoop) {
    var dx = px - hoop.x;
    var dy = py - hoop.y;
    return Math.sqrt(dx * dx + dy * dy) < 55;
  }
};

if (typeof module !== 'undefined') {
  module.exports = ScoreZone;
}
```

- [ ] **Step 6: Implement ShotAccuracy.js**

Create `public/js/systems/ShotAccuracy.js`:
```javascript
var ShotAccuracy = {
  // meterScore: 0.0 (red) to 1.0 (perfect green)
  // stat: 0-99 player rating for this shot type
  // Returns: 0.0 to 1.0 probability of making the shot
  calcAccuracy: function(stat, zone, meterScore) {
    var baseChance = stat / 99;         // 0.0 – 1.0 from stat
    var meterBonus = meterScore * 0.4;  // up to +0.4 for perfect timing
    var zonePenalty = (zone === 'three') ? 0.05 : 0; // slight penalty for 3s
    var raw = baseChance * 0.6 + meterBonus - zonePenalty;
    return Math.max(0, Math.min(1, raw));
  }
};

if (typeof module !== 'undefined') {
  module.exports = ShotAccuracy;
}
```

- [ ] **Step 7: Run all tests — confirm they pass**

```bash
npx jest
```

Expected: 7 tests pass.

- [ ] **Step 8: Commit**

```bash
git add public/js/systems/ScoreZone.js public/js/systems/ShotAccuracy.js tests/
git commit -m "feat: score zone detection + shot accuracy logic with tests"
```

---

## Task 4: Court & Beach Background

**Files:**
- Modify: `public/js/scenes/GameScene.js`

- [ ] **Step 1: Add `_drawBackground` method to GameScene**

Replace `public/js/scenes/GameScene.js` with:
```javascript
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  create() {
    this._drawBackground();
    this._drawCourt();
  }

  _drawBackground() {
    var g = this.add.graphics();
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

    // Sky gradient (top 50%)
    for (var i = 0; i < H * 0.5; i++) {
      var t = i / (H * 0.5);
      var r = Math.round(Phaser.Math.Linear(135, 255, t));
      var gr = Math.round(Phaser.Math.Linear(206, 230, t));
      var b = Math.round(Phaser.Math.Linear(235, 180, t));
      g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b));
      g.fillRect(0, i, W, 1);
    }

    // Sun
    g.fillStyle(0xfff176);
    g.fillCircle(820, 65, 38);
    g.fillStyle(0xf9ca24, 0.4);
    g.fillCircle(820, 65, 52);

    // Ocean strip
    g.fillStyle(0x4fc3f7, 0.55);
    g.fillRect(0, H * 0.44, W, 18);

    // Sand (bottom 50%)
    g.fillStyle(0xc4a070);
    g.fillRect(0, H * 0.5, W, H * 0.5);

    // Sand highlight
    g.fillStyle(0xd4b080, 0.5);
    g.fillRect(0, H * 0.5, W, 20);
  }

  _drawCourt() {
    var g = this.add.graphics();
    var C = GAME_CONFIG.COURT;

    // Court surface fill
    g.fillStyle(0xc8a85a);
    g.fillPoints([C.farLeft, C.farRight, C.nearRight, C.nearLeft], true);

    // Court surface darker stripe (wood grain effect)
    g.fillStyle(0xb89840, 0.4);
    for (var i = 0; i < 8; i++) {
      var t = i / 8;
      var x1 = Phaser.Math.Linear(C.farLeft.x, C.nearLeft.x, t);
      var y1 = Phaser.Math.Linear(C.farLeft.y, C.nearLeft.y, t);
      var x2 = Phaser.Math.Linear(C.farRight.x, C.nearRight.x, t);
      var y2 = Phaser.Math.Linear(C.farRight.y, C.nearRight.y, t);
      g.fillRect(x1, y1, x2 - x1, 3);
    }

    // Court outline
    g.lineStyle(2, 0x8B6914, 1);
    g.strokePoints([C.farLeft, C.farRight, C.nearRight, C.nearLeft], true);

    // Center line (vertical midpoint of court)
    var midFarX  = (C.farLeft.x  + C.farRight.x)  / 2;
    var midNearX = (C.nearLeft.x + C.nearRight.x) / 2;
    g.lineStyle(2, 0xffffff, 0.5);
    g.beginPath();
    g.moveTo(midFarX, C.farLeft.y);
    g.lineTo(midNearX, C.nearLeft.y);
    g.strokePath();

    // Center circle (approximate)
    var midX = (midFarX + midNearX) / 2;
    var midY = (C.farLeft.y + C.nearLeft.y) / 2;
    g.strokeCircle(midX, midY, 28);

    // "NOAH'S HOUSE" court logo at center
    this.add.text(midX, midY, "NOAH'S\nHOUSE", {
      fontSize: '11px', color: '#ffffff', alpha: 0.5,
      align: 'center', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.45);

    // Left key (paint area)
    var keyW = 55, keyH = 80;
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeRect(C.farLeft.x + 10, GAME_CONFIG.LEFT_HOOP.y - keyH / 2, keyW, keyH);

    // Right key
    g.strokeRect(C.farRight.x - 10 - keyW, GAME_CONFIG.RIGHT_HOOP.y - keyH / 2, keyW, keyH);
  }

  update() {}
}
```

- [ ] **Step 2: Verify in browser**

Visit http://localhost:3021, navigate to GameScene by temporarily changing TitleScene to `this.scene.start('GameScene')` in its create(). Expect: beach background (sky, sun, ocean, sand) with a trapezoid wooden court drawn on top.

- [ ] **Step 3: Revert TitleScene create() stub**

```javascript
// TitleScene.js — revert back to stub
create() {
  this.add.text(480, 270, "NOAH'S HOUSE", { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
}
```

- [ ] **Step 4: Commit**

```bash
git add public/js/scenes/GameScene.js
git commit -m "feat: beach background + isometric court drawing"
```

---

## Task 5: Hoops + 3PT Arcs + Graffiti Walls

**Files:**
- Modify: `public/js/scenes/GameScene.js` — add `_drawHoops`, `_drawZoneArcs`, `_drawWalls`

- [ ] **Step 1: Add hoop drawing**

Add these three methods to GameScene (inside the class, after `_drawCourt`):

```javascript
_drawHoops() {
  [
    { hoop: GAME_CONFIG.LEFT_HOOP,  side: 'left'  },
    { hoop: GAME_CONFIG.RIGHT_HOOP, side: 'right' }
  ].forEach(({ hoop, side }) => {
    var g = this.add.graphics();
    var x = hoop.x, y = hoop.y;
    var dir = (side === 'left') ? 1 : -1; // backboard direction

    // Pole
    g.fillStyle(0x999999);
    g.fillRect(x - 2, y, 4, 55);

    // Backboard
    g.fillStyle(0xe0e0e0);
    g.fillRect(x + dir * 6, y - 22, 6, 30);
    // Backboard inner box
    g.lineStyle(2, 0xe67e22);
    g.strokeRect(x + dir * 7, y - 16, 4, 18);

    // Rim (orange rectangle for isometric look)
    g.fillStyle(0xe67e22);
    g.fillRect(x - 12, y - 4, 24, 6);
    g.lineStyle(2, 0xc0392b);
    g.strokeRect(x - 12, y - 4, 24, 6);

    // Net (simple lines hanging from rim)
    g.lineStyle(1, 0xffffff, 0.8);
    for (var i = 0; i < 5; i++) {
      var nx = x - 10 + i * 5;
      g.beginPath();
      g.moveTo(nx, y + 2);
      g.lineTo(nx + 2, y + 16);
      g.strokePath();
    }
    // Net bottom
    g.beginPath();
    g.moveTo(x - 10, y + 16);
    g.lineTo(x + 12, y + 16);
    g.strokePath();
  });
},

_drawZoneArcs() {
  var g = this.add.graphics();

  [GAME_CONFIG.LEFT_HOOP, GAME_CONFIG.RIGHT_HOOP].forEach(function(hoop) {
    // 3PT arc painted on court
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeCircle(hoop.x, hoop.y, GAME_CONFIG.THREE_POINT_DIST);

    // Dunk zone fill (subtle red tint)
    g.fillStyle(0xe74c3c, 0.12);
    g.fillCircle(hoop.x, hoop.y, GAME_CONFIG.DUNK_ZONE_DIST);
  });
},

_drawWalls() {
  var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
  var wallTop = H * 0.12, wallH = H * 0.42;

  // Left wall
  var lg = this.add.graphics();
  lg.fillStyle(0x7f8c8d);
  lg.fillRect(0, wallTop, 78, wallH);
  lg.lineStyle(3, 0x555555);
  lg.strokeRect(0, wallTop, 78, wallH);

  // Left graffiti text
  var leftTags = [
    { text: "NOAH",    x: 39, y: wallTop + 22,  size: '18px', color: '#e74c3c', rot: -6 },
    { text: "🏀HOUSE", x: 39, y: wallTop + 54,  size: '13px', color: '#f9ca24', rot:  4 },
    { text: "#SPLASH", x: 39, y: wallTop + 82,  size: '11px', color: '#27ae60', rot: -3 },
    { text: "WARRIORS",x: 39, y: wallTop + 108, size: '10px', color: '#1d428a', rot:  2 },
    { text: "2K",      x: 39, y: wallTop + 130, size: '22px', color: '#9b59b6', rot: -5 }
  ];
  leftTags.forEach(tag => {
    this.add.text(tag.x, tag.y, tag.text, {
      fontSize: tag.size, color: tag.color,
      fontStyle: 'bold', fontFamily: 'Impact, Arial Black, sans-serif'
    }).setOrigin(0.5).setRotation(Phaser.Math.DegToRad(tag.rot));
  });

  // Right wall
  var rg = this.add.graphics();
  rg.fillStyle(0x7f8c8d);
  rg.fillRect(W - 78, wallTop, 78, wallH);
  rg.lineStyle(3, 0x555555);
  rg.strokeRect(W - 78, wallTop, 78, wallH);

  // Right graffiti text
  var rightTags = [
    { text: "STEPH",      x: W - 39, y: wallTop + 22,  size: '18px', color: '#3498db', rot:  5 },
    { text: "CURRY",      x: W - 39, y: wallTop + 52,  size: '17px', color: '#e74c3c', rot: -4 },
    { text: "BEACH CT",   x: W - 39, y: wallTop + 82,  size: '10px', color: '#f9ca24', rot:  3 },
    { text: "MVP",        x: W - 39, y: wallTop + 106, size: '16px', color: '#27ae60', rot: -2 },
    { text: "💪",         x: W - 39, y: wallTop + 132, size: '20px', color: '#fff',    rot:  4 }
  ];
  rightTags.forEach(tag => {
    this.add.text(tag.x, tag.y, tag.text, {
      fontSize: tag.size, color: tag.color,
      fontStyle: 'bold', fontFamily: 'Impact, Arial Black, sans-serif'
    }).setOrigin(0.5).setRotation(Phaser.Math.DegToRad(tag.rot));
  });
}
```

- [ ] **Step 2: Call new methods from `create()`**

Update GameScene `create()`:
```javascript
create() {
  this._drawBackground();
  this._drawWalls();
  this._drawCourt();
  this._drawZoneArcs();
  this._drawHoops();
}
```

- [ ] **Step 3: Verify in browser**

Expected: hoops with backboards, poles, nets on both ends. 3PT arc circles on the court. Graffiti walls on left and right with colored spray-paint style text.

- [ ] **Step 4: Commit**

```bash
git add public/js/scenes/GameScene.js
git commit -m "feat: hoops + 3PT arcs + graffiti walls"
```

---

## Task 6: Player Base Class + Movement

**Files:**
- Create: `public/js/entities/Player.js`

- [ ] **Step 1: Create Player.js**

```javascript
class Player {
  // scene: Phaser.Scene
  // x, y: starting screen position
  // controls: { up, down, left, right, shoot, dribble, pass, pumpfake }
  // stats: { speed, threePoint, midRange, dribble, steal, dunk }
  // team: 'curry' | 'edwards'
  constructor(scene, x, y, controls, stats, team) {
    this.scene    = scene;
    this.x        = x;
    this.y        = y;
    this.controls = controls;
    this.stats    = stats;
    this.team     = team;

    this.hasBall      = false;
    this.state        = 'idle'; // idle | running | shooting | dunking | layup
    this.facingRight  = (team === 'curry');
    this.shootPressed = false;
    this.shootHoldMs  = 0;
    this.isShooting   = false;

    // Phaser Graphics object used to draw this player each frame
    this.gfx = scene.add.graphics();
    // Name label
    this.label = scene.add.text(x, y - 52, '', {
      fontSize: '10px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    this._buildKeys();
  }

  _buildKeys() {
    this.keys = this.scene.input.keyboard.addKeys({
      up:       this.controls.up,
      down:     this.controls.down,
      left:     this.controls.left,
      right:    this.controls.right,
      shoot:    this.controls.shoot,
      dribble:  this.controls.dribble,
      pass:     this.controls.pass,
      pumpfake: this.controls.pumpfake
    });
  }

  // Call from GameScene.update() each frame, delta in ms
  update(delta, attackHoop) {
    if (this.isShooting) return; // no movement while shooting
    this._handleMovement(delta);
    this._handleShootHold(delta, attackHoop);
  }

  _handleMovement(delta) {
    var speed = GAME_CONFIG.PLAYER_SPEED * (delta / 1000);
    var moved = false;

    if (this.keys.left.isDown)  { this.x -= speed; this.facingRight = false; moved = true; }
    if (this.keys.right.isDown) { this.x += speed; this.facingRight = true;  moved = true; }
    if (this.keys.up.isDown)    { this.y -= speed * 0.6; moved = true; } // perspective scale
    if (this.keys.down.isDown)  { this.y += speed * 0.6; moved = true; }

    // Clamp to court bounds
    this.x = Phaser.Math.Clamp(this.x, 130, 830);
    this.y = Phaser.Math.Clamp(this.y, 170, 400);

    this.state = moved ? 'running' : 'idle';
  }

  _handleShootHold(delta, attackHoop) {
    // Handled externally by GameScene shoot mechanic (Task 9)
    // This method is a hook — override in subclass if needed
  }

  // Returns screen-space scale factor based on y position (perspective)
  _perspectiveScale() {
    var t = (this.y - 170) / (400 - 170); // 0 = far, 1 = near
    return Phaser.Math.Linear(0.72, 1.0, t);
  }

  // Draw the player — called every frame
  draw() {
    this.gfx.clear();
    var s = this._perspectiveScale();
    this._drawBody(this.x, this.y, s);
    this.label.setPosition(this.x, this.y - 52 * s);
    this.gfx.setDepth(this.y); // depth sort by y so near player is in front
    this.label.setDepth(this.y + 1);
  }

  // Override in subclass to draw player-specific appearance
  _drawBody(x, y, s) {
    var g = this.gfx;
    // Default: simple blue circle + rectangle
    g.fillStyle(0x1d428a);
    g.fillCircle(x, y - 36 * s, 14 * s);
    g.fillRect(x - 12 * s, y - 22 * s, 24 * s, 28 * s);
  }
}
```

- [ ] **Step 2: Verify file is parseable (no syntax errors)**

```bash
node -e "eval(require('fs').readFileSync('public/js/entities/Player.js','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add public/js/entities/Player.js
git commit -m "feat: base Player class with movement + perspective scaling"
```

---

## Task 7: Curry & Edwards Players

**Files:**
- Create: `public/js/entities/Curry.js`
- Create: `public/js/entities/Edwards.js`

- [ ] **Step 1: Create Curry.js**

```javascript
class Curry extends Player {
  constructor(scene, x, y) {
    super(
      scene, x, y,
      // Controls — WASD + G/F/T/R
      { up: 'W', down: 'S', left: 'A', right: 'D',
        shoot: 'G', dribble: 'T', pass: 'F', pumpfake: 'R' },
      // 2K22 stats
      { speed: 88, threePoint: 99, midRange: 92, dribble: 96, steal: 77, dunk: 45 },
      'curry'
    );
    this.label.setText('CURRY #30');
    this.label.setStyle({ fontSize: '10px', color: '#FFC72C', stroke: '#000', strokeThickness: 3 });
  }

  _drawBody(x, y, s) {
    var g = this.gfx;
    var dir = this.facingRight ? 1 : -1;

    // Head
    g.fillStyle(0xffe0b2);
    g.fillCircle(x, y - 42 * s, 13 * s);

    // Eyes
    g.fillStyle(0x333333);
    g.fillCircle(x + dir * 4 * s, y - 45 * s, 2 * s);

    // Jersey (Warriors blue)
    g.fillStyle(0x1d428a);
    g.fillRect(x - 13 * s, y - 29 * s, 26 * s, 28 * s);

    // Jersey number "30"
    g.fillStyle(0xFFC72C);
    g.fillRect(x - 5 * s, y - 26 * s, 10 * s, 12 * s);

    // Arms
    g.fillStyle(0xffe0b2);
    g.fillRect(x - 20 * s, y - 28 * s, 7 * s, 18 * s); // left arm
    g.fillRect(x + 13 * s, y - 28 * s, 7 * s, 18 * s); // right arm

    // Shorts (Warriors blue)
    g.fillStyle(0x1d428a);
    g.fillRect(x - 13 * s, y - 2 * s, 26 * s, 18 * s);

    // Legs
    g.fillStyle(0xffe0b2);
    g.fillRect(x - 12 * s, y + 16 * s, 10 * s, 20 * s);
    g.fillRect(x + 2 * s,  y + 16 * s, 10 * s, 20 * s);

    // Shoes (white)
    g.fillStyle(0xffffff);
    g.fillRect(x - 14 * s, y + 34 * s, 12 * s, 6 * s);
    g.fillRect(x + 2 * s,  y + 34 * s, 12 * s, 6 * s);

    // Outline
    g.lineStyle(1.5, 0x333333, 1);
    g.strokeCircle(x, y - 42 * s, 13 * s);
    g.strokeRect(x - 13 * s, y - 29 * s, 26 * s, 28 * s);
  }
}
```

- [ ] **Step 2: Create Edwards.js**

```javascript
class Edwards extends Player {
  constructor(scene, x, y) {
    super(
      scene, x, y,
      // Controls — Arrow keys + /,.,M
      { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
        shoot: 'FORWARD_SLASH', dribble: 'COMMA', pass: 'PERIOD', pumpfake: 'M' },
      // 2K26 stats
      { speed: 92, threePoint: 82, midRange: 88, dribble: 86, steal: 85, dunk: 95 },
      'edwards'
    );
    this.label.setText('ANT-MAN #5');
    this.label.setStyle({ fontSize: '10px', color: '#ffffff', stroke: '#c8102e', strokeThickness: 3 });
    this.facingRight = false;
  }

  _drawBody(x, y, s) {
    var g = this.gfx;
    var dir = this.facingRight ? 1 : -1;

    // Head (larger — Ant is bigger)
    g.fillStyle(0x8B5E3C);
    g.fillCircle(x, y - 46 * s, 15 * s);

    // Eyes
    g.fillStyle(0x222222);
    g.fillCircle(x + dir * 5 * s, y - 49 * s, 2.5 * s);

    // Jersey (Timberwolves red)
    g.fillStyle(0xc8102e);
    g.fillRect(x - 15 * s, y - 31 * s, 30 * s, 30 * s);

    // Jersey number "5"
    g.fillStyle(0xffffff);
    g.fillRect(x - 4 * s, y - 28 * s, 8 * s, 14 * s);

    // Arms
    g.fillStyle(0x8B5E3C);
    g.fillRect(x - 22 * s, y - 30 * s, 7 * s, 20 * s);
    g.fillRect(x + 15 * s, y - 30 * s, 7 * s, 20 * s);

    // Shorts
    g.fillStyle(0xc8102e);
    g.fillRect(x - 15 * s, y - 2 * s, 30 * s, 20 * s);

    // Legs
    g.fillStyle(0x8B5E3C);
    g.fillRect(x - 13 * s, y + 18 * s, 11 * s, 22 * s);
    g.fillRect(x + 2 * s,  y + 18 * s, 11 * s, 22 * s);

    // Shoes (black)
    g.fillStyle(0x111111);
    g.fillRect(x - 15 * s, y + 38 * s, 13 * s, 7 * s);
    g.fillRect(x + 2 * s,  y + 38 * s, 13 * s, 7 * s);

    // Outline
    g.lineStyle(1.5, 0x333333, 1);
    g.strokeCircle(x, y - 46 * s, 15 * s);
    g.strokeRect(x - 15 * s, y - 31 * s, 30 * s, 30 * s);
  }
}
```

- [ ] **Step 3: Instantiate both players in GameScene.create()**

Add to GameScene `create()` (after all draw calls):
```javascript
this.curry = new Curry(this, 300, 290);
this.curry.hasBall = true; // Curry starts with ball

this.edwards = new Edwards(this, 660, 290);
```

Add to GameScene `update(delta)`:
```javascript
update(time, delta) {
  this.curry.update(delta, GAME_CONFIG.RIGHT_HOOP);
  this.edwards.update(delta, GAME_CONFIG.LEFT_HOOP);
  this.curry.draw();
  this.edwards.draw();
}
```

- [ ] **Step 4: Verify in browser**

Expected: Curry (Warriors blue jersey, lighter skin, #30) on left side. Edwards (Timberwolves red jersey, darker skin, #5) on right. Both moveable with their respective keys. Near player appears larger (perspective scaling).

- [ ] **Step 5: Commit**

```bash
git add public/js/entities/Curry.js public/js/entities/Edwards.js public/js/scenes/GameScene.js
git commit -m "feat: Curry + Edwards cartoon players with WASD/arrow movement"
```

---

## Task 8: Ball Entity + Dribbling

**Files:**
- Create: `public/js/entities/Ball.js`

- [ ] **Step 1: Create Ball.js**

```javascript
class Ball {
  constructor(scene, x, y) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.inFlight = false;
    this.owner    = null; // Player reference

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(500); // always on top

    // Dribble bounce tween
    this._bounceY = 0;
    this._bounceDir = 1;
  }

  // Call each frame when held by a player
  update(delta) {
    if (this.inFlight) return;
    if (!this.owner) return;

    // Follow owner with slight offset in front
    var dir = this.owner.facingRight ? 1 : -1;
    var targetX = this.owner.x + dir * 18;
    var targetY = this.owner.y + 10;
    this.x = Phaser.Math.Linear(this.x, targetX, 0.3);
    this.y = Phaser.Math.Linear(this.y, targetY, 0.3);

    // Dribble bounce when running
    if (this.owner.state === 'running') {
      this._bounceY += this._bounceDir * 0.5;
      if (this._bounceY > 10 || this._bounceY < 0) this._bounceDir *= -1;
    } else {
      this._bounceY = Phaser.Math.Linear(this._bounceY, 0, 0.2);
    }

    this.draw();
  }

  draw() {
    this.gfx.clear();
    var by = this.y + this._bounceY;
    var s  = this.owner ? this.owner._perspectiveScale() : 1;

    // Ball shadow
    this.gfx.fillStyle(0x000000, 0.25);
    this.gfx.fillEllipse(this.x, this.owner ? this.owner.y + 36 * s : by + 8, 18 * s, 6 * s);

    // Ball body
    this.gfx.fillStyle(0xe67e22);
    this.gfx.fillCircle(this.x, by, 10 * s);

    // Ball seam lines
    this.gfx.lineStyle(1, 0x333333, 0.9);
    this.gfx.strokeCircle(this.x, by, 10 * s);
    this.gfx.beginPath();
    this.gfx.moveTo(this.x - 10 * s, by);
    this.gfx.lineTo(this.x + 10 * s, by);
    this.gfx.strokePath();
    this.gfx.beginPath();
    this.gfx.moveTo(this.x, by - 10 * s);
    this.gfx.lineTo(this.x, by + 10 * s);
    this.gfx.strokePath();
  }

  // Tween the ball in an arc from current position to hoop
  // onScore: callback(isThree) if it goes in
  // onMiss:  callback() if it misses
  shootTo(hoop, accuracy, isThree, onScore, onMiss) {
    this.inFlight = true;
    this.owner    = null;

    var fromX = this.x, fromY = this.y;
    var toX = hoop.x, toY = hoop.y;
    var arcH = GAME_CONFIG.BALL_ARC_HEIGHT;

    // Offset miss slightly
    var makes = Math.random() < accuracy;
    var missOffsetX = makes ? 0 : (Math.random() - 0.5) * 60;
    var missOffsetY = makes ? 0 : (Math.random() - 0.5) * 30;
    toX += missOffsetX;
    toY += missOffsetY;

    var progress = { t: 0 };
    this.scene.tweens.add({
      targets: progress,
      t: 1,
      duration: GAME_CONFIG.BALL_ARC_DURATION,
      ease: 'Linear',
      onUpdate: () => {
        var t = progress.t;
        this.x = Phaser.Math.Linear(fromX, toX, t);
        var straightY = Phaser.Math.Linear(fromY, toY, t);
        this.y = straightY + arcH * Math.sin(Math.PI * t);
        this.draw();
      },
      onComplete: () => {
        this.inFlight = false;
        if (makes) {
          this._playNetSwish();
          if (onScore) onScore(isThree);
        } else {
          if (onMiss) onMiss();
        }
      }
    });
  }

  _playNetSwish() {
    // Briefly animate the hoop nets — small white flash at ball position
    var flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.8);
    flash.fillCircle(this.x, this.y, 14);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });
  }

  reset(x, y, owner) {
    this.inFlight = false;
    this.x = x;
    this.y = y;
    this.owner = owner;
    if (owner) owner.hasBall = true;
    this._bounceY = 0;
  }
}
```

- [ ] **Step 2: Add Ball to GameScene.create()**

```javascript
// After player instantiation in create():
this.ball = new Ball(this, this.curry.x + 18, this.curry.y + 10);
this.ball.owner = this.curry;
```

Update GameScene `update()`:
```javascript
update(time, delta) {
  this.curry.update(delta, GAME_CONFIG.RIGHT_HOOP);
  this.edwards.update(delta, GAME_CONFIG.LEFT_HOOP);
  this.curry.draw();
  this.edwards.draw();
  this.ball.update(delta);
}
```

- [ ] **Step 3: Verify in browser**

Expected: orange basketball follows Curry around court. Ball bounces when Curry runs. Switching to Edwards (steal not wired yet — do in Task 10).

- [ ] **Step 4: Commit**

```bash
git add public/js/entities/Ball.js public/js/scenes/GameScene.js
git commit -m "feat: Ball entity with dribble bounce + arc shoot tween"
```

---

## Task 9: Shot Meter UI

**Files:**
- Create: `public/js/systems/ShotMeter.js`

- [ ] **Step 1: Create ShotMeter.js**

```javascript
class ShotMeter {
  constructor(scene) {
    this.scene    = scene;
    this.visible  = false;
    this.progress = 0; // 0.0 to 1.0
    this.active   = false;

    this.bg  = scene.add.graphics().setDepth(900);
    this.bar = scene.add.graphics().setDepth(901);
    this.hide();
  }

  // Call when player holds shoot key
  start(x, y) {
    this.visible  = true;
    this.active   = true;
    this.progress = 0;
    this._x = x - 22;
    this._y = y - 60;
    this.bg.setVisible(true);
    this.bar.setVisible(true);
  }

  // Call every frame while shoot key held, delta in ms
  update(delta) {
    if (!this.active) return;
    this.progress += delta / GAME_CONFIG.SHOT_METER_FILL_TIME;
    if (this.progress > 1) this.progress = 1;
    this._draw();
  }

  // Returns meterScore (0–1) and hides meter
  release() {
    this.active = false;
    var score = this.progress;
    this.hide();
    return score;
  }

  hide() {
    this.visible  = false;
    this.progress = 0;
    this.bg.setVisible(false);
    this.bar.setVisible(false);
  }

  _draw() {
    var x = this._x, y = this._y;
    var W = 10, H = 50;
    var filled = this.progress * H;

    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRect(x, y, W, H);
    this.bg.lineStyle(1, 0x555555);
    this.bg.strokeRect(x, y, W, H);

    this.bar.clear();
    // Color: red (bottom 30%) → yellow (30-70%) → green (70-100%)
    var green  = Math.max(0, (this.progress - 0.7) / 0.3);
    var yellow = Math.max(0, Math.min(1, (this.progress - 0.3) / 0.4));
    var r = Math.round(255 * (1 - green));
    var g2 = Math.round(255 * Math.min(1, yellow + green));
    var b  = 0;
    this.bar.fillStyle(Phaser.Display.Color.GetColor(r, g2, b));
    this.bar.fillRect(x + 1, y + H - filled, W - 2, filled);

    // Green zone marker
    this.bar.lineStyle(1, 0x00ff00, 0.8);
    this.bar.beginPath();
    this.bar.moveTo(x, y + H * 0.3);
    this.bar.lineTo(x + W, y + H * 0.3);
    this.bar.strokePath();
  }

  // Move meter position (when player moves while holding shoot)
  moveTo(x, y) {
    this._x = x - 22;
    this._y = y - 60;
    if (this.active) this._draw();
  }
}
```

- [ ] **Step 2: Verify file syntax**

```bash
node -e "eval(require('fs').readFileSync('public/js/systems/ShotMeter.js','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add public/js/systems/ShotMeter.js
git commit -m "feat: ShotMeter UI — vertical bar with red/yellow/green zones"
```

---

## Task 10: Shooting Mechanic + Scoring

**Files:**
- Modify: `public/js/scenes/GameScene.js` — add `_handleShooting`, `_onScore`, `_onMiss`, game state

- [ ] **Step 1: Add game state + ShotMeter to GameScene.create()**

Add at the top of `create()`:
```javascript
this.gameState = {
  curryScore:   0,
  edwardsScore: 0,
  possession:   'curry', // 'curry' | 'edwards'
  shotClock:    GAME_CONFIG.SHOT_CLOCK_MS,
  gameOver:     false
};
this.shotMeter = new ShotMeter(this);
this._shootingPlayer = null;
```

- [ ] **Step 2: Add `_handleShooting` method to GameScene**

```javascript
_handleShooting(delta) {
  var ball = this.ball;
  if (ball.inFlight) return;

  // Determine who has ball
  var attacker = this.gameState.possession === 'curry' ? this.curry : this.edwards;
  var attackHoop = this.gameState.possession === 'curry' ? GAME_CONFIG.RIGHT_HOOP : GAME_CONFIG.LEFT_HOOP;

  // Steal attempt: defender presses their shoot key near attacker
  var defender = attacker === this.curry ? this.edwards : this.curry;
  var stealKey = defender === this.curry
    ? Phaser.Input.Keyboard.JustDown(this.curry.keys.shoot)
    : Phaser.Input.Keyboard.JustDown(this.edwards.keys.shoot);
  var dist = Phaser.Math.Distance.Between(attacker.x, attacker.y, defender.x, defender.y);
  if (stealKey && dist < 55) {
    var stealChance = defender.stats.steal / 99 * 0.45;
    if (Math.random() < stealChance) {
      this._changePossession(defender);
      return;
    }
  }

  var shootKey = attacker === this.curry ? attacker.keys.shoot : attacker.keys.shoot;

  // DUNK ZONE: Edwards near hoop presses shoot
  if (attacker === this.edwards) {
    var dunkDist = Phaser.Math.Distance.Between(attacker.x, attacker.y, attackHoop.x, attackHoop.y);
    if (dunkDist < GAME_CONFIG.DUNK_ZONE_DIST && Phaser.Input.Keyboard.JustDown(attacker.keys.shoot)) {
      this._executeDunk(attacker, attackHoop);
      return;
    }
  }

  // LAYUP ZONE: any player very close to hoop (< DUNK_ZONE_DIST)
  var layupDist = Phaser.Math.Distance.Between(attacker.x, attacker.y, attackHoop.x, attackHoop.y);
  if (layupDist < GAME_CONFIG.DUNK_ZONE_DIST && Phaser.Input.Keyboard.JustDown(attacker.keys.shoot)) {
    this._executeLayup(attacker, attackHoop);
    return;
  }

  // NORMAL SHOT: hold shoot key to charge meter
  if (attacker.keys.shoot.isDown && !this._shootingPlayer) {
    this._shootingPlayer = attacker;
    this.shotMeter.start(attacker.x, attacker.y);
  }
  if (this._shootingPlayer === attacker) {
    if (attacker.keys.shoot.isDown) {
      this.shotMeter.update(delta);
      this.shotMeter.moveTo(attacker.x, attacker.y);
    } else {
      // Released — shoot
      var meterScore = this.shotMeter.release();
      var isThree    = ScoreZone.isThreePointer(attacker.x, attacker.y, attackHoop);
      var stat       = isThree ? attacker.stats.threePoint : attacker.stats.midRange;
      var accuracy   = ShotAccuracy.calcAccuracy(stat, isThree ? 'three' : 'mid', meterScore);

      // Gold arc for Curry 3PT
      if (attacker === this.curry && isThree) {
        this._showGoldArc(attacker, attackHoop);
      }

      this._shootingPlayer = null;
      attacker.state = 'shooting';
      ball.owner = null;
      ball.shootTo(
        attackHoop,
        accuracy,
        isThree,
        (isThree) => this._onScore(attacker, isThree ? 3 : 2, attackHoop),
        ()       => this._onMiss(attacker)
      );
    }
  }
},

_showGoldArc(player, hoop) {
  var g = this.add.graphics().setDepth(200);
  g.lineStyle(3, 0xFFD700, 0.7);
  g.beginPath();
  g.moveTo(player.x, player.y);
  // Simple bezier hint
  g.lineTo((player.x + hoop.x) / 2, Math.min(player.y, hoop.y) - 80);
  g.lineTo(hoop.x, hoop.y);
  g.strokePath();
  this.tweens.add({ targets: g, alpha: 0, duration: 600, onComplete: () => g.destroy() });
},

_executeDunk(player, hoop) {
  player.state = 'dunking';
  this.ball.owner = null;
  this.ball.inFlight = true;
  // Quick jump tween then score
  this.tweens.add({
    targets: player,
    y: player.y - 30,
    duration: 200,
    yoyo: true,
    onComplete: () => {
      player.state = 'idle';
      this.ball.inFlight = false;
      this._onScore(player, 2, hoop);
    }
  });
},

_executeLayup(player, hoop) {
  player.state = 'layup';
  this.ball.owner = null;
  var accuracy = ShotAccuracy.calcAccuracy(player.stats.midRange, 'mid', 0.8);
  this.ball.shootTo(
    hoop, accuracy, false,
    () => this._onScore(player, 2, hoop),
    () => this._onMiss(player)
  );
},

_onScore(scorer, points, hoop) {
  if (scorer === this.curry) {
    this.gameState.curryScore += points;
  } else {
    this.gameState.edwardsScore += points;
  }
  this.hud.updateScores(this.gameState.curryScore, this.gameState.edwardsScore);
  this.scorePop.show(hoop.x, hoop.y - 30, '+' + points);
  this.commentary.say(scorer === this.curry
    ? (points === 3 ? 'curry_three' : 'curry_two')
    : (points === 2 && scorer.state === 'dunking' ? 'edwards_dunk' : (points === 3 ? 'edwards_three' : 'edwards_two'))
  );

  // Reset ball to center after short delay
  this.gameState.shotClock = GAME_CONFIG.SHOT_CLOCK_MS;
  this.time.delayedCall(900, () => {
    var nextOwner = scorer === this.curry ? this.edwards : this.curry;
    this._changePossession(nextOwner);
  });

  if (this.gameState.curryScore   >= GAME_CONFIG.WIN_SCORE ||
      this.gameState.edwardsScore >= GAME_CONFIG.WIN_SCORE) {
    this.gameState.gameOver = true;
    this.time.delayedCall(1200, () => {
      this.scene.start('GameOverScene', {
        winner: this.gameState.curryScore >= GAME_CONFIG.WIN_SCORE ? 'curry' : 'edwards',
        curryScore: this.gameState.curryScore,
        edwardsScore: this.gameState.edwardsScore
      });
    });
  }
},

_onMiss(player) {
  player.state = 'idle';
  // Loose ball — nearest player grabs it
  var distCurry    = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.curry.x,   this.curry.y);
  var distEdwards  = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.edwards.x, this.edwards.y);
  var rebounder    = distCurry < distEdwards ? this.curry : this.edwards;
  this.time.delayedCall(400, () => {
    this._changePossession(rebounder);
  });
  this.commentary.say('miss');
},

_changePossession(newOwner) {
  var prevOwner = newOwner === this.curry ? this.edwards : this.curry;
  prevOwner.hasBall = false;
  newOwner.hasBall  = true;
  this.gameState.possession = newOwner === this.curry ? 'curry' : 'edwards';
  this.gameState.shotClock  = GAME_CONFIG.SHOT_CLOCK_MS;
  this.ball.reset(newOwner.x, newOwner.y, newOwner);
}
```

- [ ] **Step 3: Call `_handleShooting` from `update()`**

```javascript
update(time, delta) {
  if (this.gameState.gameOver) return;

  // Shot clock countdown
  this.gameState.shotClock -= delta;
  if (this.gameState.shotClock <= 0) {
    this._changePossession(
      this.gameState.possession === 'curry' ? this.edwards : this.curry
    );
  }

  this.curry.update(delta, GAME_CONFIG.RIGHT_HOOP);
  this.edwards.update(delta, GAME_CONFIG.LEFT_HOOP);
  this.ball.update(delta);
  this._handleShooting(delta);

  this.curry.draw();
  this.edwards.draw();
}
```

- [ ] **Step 4: Verify in browser**

Curry starts with ball. Hold G — shot meter charges. Release in green — ball arcs to right hoop. Score appears. Ball resets to Edwards. Outside the 3PT arc charges a 3, inside charges a 2.

- [ ] **Step 5: Commit**

```bash
git add public/js/scenes/GameScene.js
git commit -m "feat: shooting mechanic — shot meter, arc, 2PT/3PT, dunk, steal, possession"
```

---

## Task 11: HUD + Controls Bar

**Files:**
- Create: `public/js/ui/HUD.js`
- Create: `public/js/ui/ScorePop.js`

- [ ] **Step 1: Create HUD.js**

```javascript
class HUD {
  constructor(scene) {
    this.scene = scene;
    var W = GAME_CONFIG.WIDTH;

    // Top bar background
    var bar = scene.add.graphics().setDepth(800);
    bar.fillStyle(0x000000, 0.82);
    bar.fillRect(0, 0, W, 48);
    bar.lineStyle(2, 0xFFC72C);
    bar.strokeRect(0, 0, W, 48);

    // Curry avatar
    var cg = scene.add.graphics().setDepth(801);
    cg.fillStyle(0x1d428a); cg.fillCircle(28, 24, 18);
    cg.fillStyle(0xFFC72C); cg.fillCircle(28, 24, 10);
    scene.add.text(28, 24, '30', { fontSize: '9px', color: '#1d428a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(802);
    scene.add.text(52, 10, 'CURRY', { fontSize: '9px', color: '#FFC72C', fontStyle: 'bold' }).setDepth(801);

    this.curryScoreText = scene.add.text(52, 22, '0', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
    }).setDepth(801);

    // Ant avatar
    var ag = scene.add.graphics().setDepth(801);
    ag.fillStyle(0xc8102e); ag.fillCircle(W - 28, 24, 18);
    ag.fillStyle(0xffffff); ag.fillCircle(W - 28, 24, 10);
    scene.add.text(W - 28, 24, '5', { fontSize: '9px', color: '#c8102e', fontStyle: 'bold' }).setOrigin(0.5).setDepth(802);
    scene.add.text(W - 55, 10, 'ANT-MAN', { fontSize: '9px', color: '#ef5350', fontStyle: 'bold' }).setDepth(801);

    this.edwardsScoreText = scene.add.text(W - 55, 22, '0', {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
    }).setDepth(801);

    // Game title
    scene.add.text(W / 2, 8, "NOAH'S HOUSE", {
      fontSize: '10px', color: '#aaaaaa', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5).setDepth(801);

    // Timer
    this.timerText = scene.add.text(W / 2, 20, '0:00', {
      fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(801);

    // Shot clock
    this.shotClockText = scene.add.text(W / 2, 38, 'SHOT: 24', {
      fontSize: '10px', color: '#FFC72C', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(801);

    // Bottom controls bar
    var cb = scene.add.graphics().setDepth(800);
    cb.fillStyle(0x000000, 0.88);
    cb.fillRect(0, GAME_CONFIG.HEIGHT - 28, W, 28);
    cb.lineStyle(1, 0x333333);
    cb.strokeRect(0, GAME_CONFIG.HEIGHT - 28, W, 28);

    var p1Keys = 'P1: WASD move  G shoot  F pass  T dribble  R pump-fake';
    var p2Keys = 'P2: ↑↓←→ move  / shoot  . pass  , dribble  M pump-fake';
    scene.add.text(8, GAME_CONFIG.HEIGHT - 20, p1Keys, {
      fontSize: '9px', color: '#FFC72C', fontStyle: 'bold'
    }).setDepth(801);
    scene.add.text(W - 8, GAME_CONFIG.HEIGHT - 20, p2Keys, {
      fontSize: '9px', color: '#ef5350', fontStyle: 'bold', align: 'right'
    }).setOrigin(1, 0.5).setDepth(801);

    this._elapsed = 0;
  }

  updateScores(curry, edwards) {
    this.curryScoreText.setText(String(curry));
    this.edwardsScoreText.setText(String(edwards));
  }

  update(delta, shotClockMs) {
    this._elapsed += delta;
    var totalSec = Math.floor(this._elapsed / 1000);
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    this.timerText.setText(m + ':' + String(s).padStart(2, '0'));

    var sc = Math.ceil(shotClockMs / 1000);
    this.shotClockText.setText('SHOT: ' + sc);
    this.shotClockText.setColor(sc <= 5 ? '#ff4444' : '#FFC72C');
  }
}
```

- [ ] **Step 2: Create ScorePop.js**

```javascript
class ScorePop {
  constructor(scene) {
    this.scene = scene;
  }

  show(x, y, text) {
    var style = {
      fontSize: '28px', color: '#FFD700',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
    };
    var t = this.scene.add.text(x, y, text, style).setOrigin(0.5).setDepth(950);
    this.scene.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: () => t.destroy()
    });

    // Screen flash
    var flash = this.scene.add.graphics().setDepth(940);
    flash.fillStyle(0xffffff, 0.18);
    flash.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    this.scene.tweens.add({
      targets: flash, alpha: 0, duration: 250,
      onComplete: () => flash.destroy()
    });
  }
}
```

- [ ] **Step 3: Wire HUD + ScorePop into GameScene.create()**

After all other create() calls:
```javascript
this.hud       = new HUD(this);
this.scorePop  = new ScorePop(this);
```

Add HUD update to GameScene.update():
```javascript
this.hud.update(delta, this.gameState.shotClock);
```

- [ ] **Step 4: Verify in browser**

Expected: top bar shows CURRY 0 / NOAH'S HOUSE / ANT-MAN 0 with running timer and shot clock. Bottom bar shows all controls. Scoring a basket shows floating gold +2 or +3 with white screen flash.

- [ ] **Step 5: Commit**

```bash
git add public/js/ui/HUD.js public/js/ui/ScorePop.js public/js/scenes/GameScene.js
git commit -m "feat: HUD (score/timer/shot-clock/controls bar) + score pop animation"
```

---

## Task 12: Commentary (ElevenLabs)

**Files:**
- Create: `public/js/systems/Commentary.js`

- [ ] **Step 1: Create Commentary.js**

```javascript
var Commentary = (function() {
  var LINES = {
    curry_three:   "Splash! Steph Curry from way downtown! That's money!",
    curry_two:     "Curry with the mid-range — automatic!",
    edwards_dunk:  "ANT-MAN throws it DOWN! What an athlete!",
    edwards_three: "Edwards from three — he's got range tonight!",
    edwards_two:   "Anthony Edwards scores — Ant-Man is cooking!",
    steal:         "Picked his pocket! Turnover!",
    block:         "Rejection! Get that outta here!",
    miss:          "No good — but the crowd is loving this!"
  };

  var _isSpeaking = false;
  var _audio = null;

  function say(event) {
    if (_isSpeaking) return;
    var text = LINES[event];
    if (!text) return;

    _isSpeaking = true;
    fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('API error');
      return res.blob();
    })
    .then(function(blob) {
      var url = URL.createObjectURL(blob);
      _audio = new Audio(url);
      _audio.onended = function() {
        _isSpeaking = false;
        URL.revokeObjectURL(url);
      };
      _audio.onerror = function() { _isSpeaking = false; };
      _audio.play().catch(function() { _isSpeaking = false; });
    })
    .catch(function() { _isSpeaking = false; });
  }

  return { say: say };
})();
```

- [ ] **Step 2: Add `this.commentary = Commentary;` to GameScene.create()**

```javascript
// In create(), after hud and scorePop:
this.commentary = Commentary;
```

- [ ] **Step 3: Verify commentary fires**

Score a basket in-game. Expected: after ~1 second, ElevenLabs voice reads the commentary line (requires valid ELEVENLABS_API_KEY in .env). Console shows no errors.

If API key missing or rate-limited: no audio but game continues normally.

- [ ] **Step 4: Commit**

```bash
git add public/js/systems/Commentary.js public/js/scenes/GameScene.js
git commit -m "feat: ElevenLabs commentary on big plays"
```

---

## Task 13: Fans + TitleScene + GameOverScene

**Files:**
- Modify: `public/js/scenes/GameScene.js` — add `_drawFans`
- Modify: `public/js/scenes/TitleScene.js` — full title screen
- Modify: `public/js/scenes/GameOverScene.js` — full game over screen

- [ ] **Step 1: Add `_drawFans` to GameScene**

```javascript
_drawFans() {
  var fans = [
    // Left sideline fans
    { x: 88,  y: 180, shirt: 0x1d428a },
    { x: 108, y: 200, shirt: 0xFFC72C },
    { x: 128, y: 190, shirt: 0xc8102e },
    // Right sideline fans
    { x: 832, y: 190, shirt: 0x1d428a },
    { x: 852, y: 200, shirt: 0xc8102e },
    { x: 872, y: 185, shirt: 0xFFC72C }
  ];

  this._fanGraphics = [];
  fans.forEach(fan => {
    var g = this.add.graphics().setDepth(fan.y - 1);
    // Head
    g.fillStyle(0xffe0b2); g.fillCircle(fan.x, fan.y - 18, 8);
    // Body
    g.fillStyle(fan.shirt); g.fillRect(fan.x - 7, fan.y - 10, 14, 16);
    this._fanGraphics.push({ g, baseY: fan.y, x: fan.x, shirt: fan.shirt });
  });
},

_cheerFans() {
  if (!this._fanGraphics) return;
  this._fanGraphics.forEach(fan => {
    this.tweens.add({
      targets: { y: fan.baseY },
      y: fan.baseY - 12,
      duration: 180,
      yoyo: true,
      repeat: 2,
      onUpdate: (tween, target) => {
        fan.g.clear();
        fan.g.fillStyle(0xffe0b2); fan.g.fillCircle(fan.x, target.y - 18, 8);
        fan.g.fillStyle(fan.shirt); fan.g.fillRect(fan.x - 7, target.y - 10, 14, 16);
      }
    });
  });
}
```

Call `_drawFans()` from `create()`. Call `_cheerFans()` inside `_onScore()` before the delay.

- [ ] **Step 2: Write full TitleScene**

Replace `public/js/scenes/TitleScene.js`:
```javascript
class TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'TitleScene' }); }

  create() {
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;

    // Beach background
    var g = this.add.graphics();
    g.fillStyle(0x87CEEB); g.fillRect(0, 0, W, H * 0.55);
    g.fillStyle(0xf9ca24, 0.9); g.fillCircle(W - 80, 70, 44);
    g.fillStyle(0x4fc3f7, 0.5); g.fillRect(0, H * 0.5, W, 22);
    g.fillStyle(0xc4a070); g.fillRect(0, H * 0.55, W, H * 0.45);

    // Graffiti title
    this.add.text(W / 2, H * 0.22, "NOAH'S", {
      fontSize: '72px', color: '#e74c3c',
      fontStyle: 'bold', fontFamily: 'Impact, Arial Black',
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.38, 'HOUSE', {
      fontSize: '80px', color: '#f9ca24',
      fontStyle: 'bold', fontFamily: 'Impact, Arial Black',
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.52, '🏀  Curry  vs  Ant-Man  🏀', {
      fontSize: '20px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);

    // PLAY button
    var btn = this.add.text(W / 2, H * 0.72, '▶  PLAY', {
      fontSize: '32px', color: '#000000',
      backgroundColor: '#FFC72C', padding: { x: 24, y: 12 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setStyle({ color: '#1d428a' }));
    btn.on('pointerout',   () => btn.setStyle({ color: '#000000' }));
    btn.on('pointerdown',  () => this.scene.start('GameScene'));

    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));

    // Sub-title
    this.add.text(W / 2, H * 0.88, 'First to 21  •  P1: WASD  •  P2: Arrow Keys', {
      fontSize: '12px', color: '#cccccc'
    }).setOrigin(0.5);
  }
}
```

- [ ] **Step 3: Write full GameOverScene**

Replace `public/js/scenes/GameOverScene.js`:
```javascript
class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  create(data) {
    var W = GAME_CONFIG.WIDTH, H = GAME_CONFIG.HEIGHT;
    var winner = data.winner; // 'curry' | 'edwards'

    var bgColor = winner === 'curry' ? 0x1d428a : 0xc8102e;
    var g = this.add.graphics();
    g.fillStyle(bgColor, 0.92); g.fillRect(0, 0, W, H);

    // Winner name
    var winnerName = winner === 'curry' ? 'CURRY WINS!' : 'ANT-MAN WINS!';
    this.add.text(W / 2, H * 0.22, winnerName, {
      fontSize: '64px', color: '#ffffff',
      fontStyle: 'bold', fontFamily: 'Impact, Arial Black',
      stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);

    // Score
    this.add.text(W / 2, H * 0.44, data.curryScore + '  –  ' + data.edwardsScore, {
      fontSize: '48px', color: '#FFC72C', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.56, 'CURRY           ANT-MAN', {
      fontSize: '14px', color: '#cccccc'
    }).setOrigin(0.5);

    // Play Again button
    var btn = this.add.text(W / 2, H * 0.74, '↺  PLAY AGAIN', {
      fontSize: '30px', color: '#000000',
      backgroundColor: '#FFC72C', padding: { x: 20, y: 12 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover',  () => btn.setStyle({ color: '#1d428a' }));
    btn.on('pointerout',   () => btn.setStyle({ color: '#000000' }));
    btn.on('pointerdown',  () => this.scene.start('GameScene'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('GameScene'));
  }
}
```

- [ ] **Step 4: Verify full game flow in browser**

1. Load http://localhost:3021 → see Title Screen with beach background and PLAY button
2. Click PLAY → GameScene loads with all elements
3. Play to 21 → GameOverScene shows with winner, score, PLAY AGAIN button
4. Click PLAY AGAIN → GameScene restarts fresh

- [ ] **Step 5: Commit**

```bash
git add public/js/scenes/TitleScene.js public/js/scenes/GameOverScene.js public/js/scenes/GameScene.js
git commit -m "feat: fans + TitleScene + GameOverScene — full game loop complete"
```

---

## Task 14: Final Wiring + GameScene Reset

**Files:**
- Modify: `public/js/scenes/GameScene.js` — ensure clean restart on `create()` re-entry

- [ ] **Step 1: Guard GameScene.create() for clean restarts**

GameScene's `create()` is called each time the scene starts. Phaser automatically destroys all display objects when a scene restarts, so no manual cleanup needed. But game state must be freshly initialized. Verify `this.gameState` and all entities are declared inside `create()` (not the constructor). They are — this is already correct from Tasks 4–11.

- [ ] **Step 2: Ensure ShotMeter is hidden on scene restart**

ShotMeter stores Graphics refs — since Phaser recreates the scene, these are destroyed automatically. `create()` already does `this.shotMeter = new ShotMeter(this)`, so this is already correct.

- [ ] **Step 3: Run all tests one final time**

```bash
npx jest --verbose
```

Expected output:
```
PASS tests/scoreZone.test.js
  isThreePointer
    ✓ returns false when player is inside left arc
    ✓ returns true when player is outside left arc
    ✓ returns false when player is inside right arc
    ✓ returns true when player is outside right arc
  isDunkZone
    ✓ returns true when player is very close to hoop
    ✓ returns false when player is far from hoop

PASS tests/shotAccuracy.test.js
  calcAccuracy
    ✓ perfect green release with high stat returns high accuracy
    ✓ red release returns low accuracy regardless of stat
    ✓ curry three stat gives wider green (higher base)

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
```

- [ ] **Step 4: Smoke test checklist (manual)**

Open http://localhost:3021 and verify each item:

- [ ] Title screen loads with beach background
- [ ] PLAY button starts game
- [ ] Curry (Warriors blue) visible on left, can move with WASD
- [ ] Edwards (Wolves red) visible on right, can move with Arrows
- [ ] Ball follows the ball-carrier with bounce animation
- [ ] Holding G charges shot meter, releasing shoots arc to hoop
- [ ] Shot from outside arc scores 3, inside arc scores 2
- [ ] Curry 3PT shows gold arc
- [ ] Edwards in dunk zone pressing / triggers dunk + 2pts
- [ ] Score updates in top HUD
- [ ] Shot clock counts down (resets on score/possession change)
- [ ] Controls bar visible at bottom throughout
- [ ] First to 21 triggers GameOverScene
- [ ] PLAY AGAIN restarts clean

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Noah's House — complete 1v1 beach basketball game"
```

---

## Appendix: Running the Game

```bash
# Install
npm install

# Start
npm start
# → http://localhost:3021

# Tests
npm test
```
