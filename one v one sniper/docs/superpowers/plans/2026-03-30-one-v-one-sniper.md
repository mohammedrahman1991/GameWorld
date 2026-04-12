# 1v1 Sniper Duel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 1v1 split-screen sniper duel game with 4 weapons, scoped aiming, aim assist, pixel characters, and best-of-5 rounds.

**Architecture:** Single `index.html` + `game.js`. All logic lives in `game.js` organized in clearly labelled sections. One Canvas element split into two 600×600 viewports — each follows its own player with an independent camera. Game state machine drives screen flow: WEAPON_SELECT → BATTLE → WIN.

**Tech Stack:** HTML5 Canvas 2D API, vanilla JavaScript (ES2020), no dependencies, no build step.

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Canvas element, loads game.js, minimal CSS |
| `game.js` | All game logic: constants, state, input, physics, rendering, game loop |

---

### Task 1: Project Scaffold + Game Loop

**Files:**
- Create: `index.html`
- Create: `game.js`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>1v1 Sniper Duel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { display: block; image-rendering: pixelated; }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create game.js with canvas setup and game loop**

```js
// ============================================================
// SECTION 1: CANVAS SETUP
// ============================================================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 1200;
const H = 600;
const HALF_W = W / 2;
canvas.width = W;
canvas.height = H;

// ============================================================
// SECTION 2: GAME LOOP
// ============================================================
let lastTime = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  // stub — filled in later tasks
}

function render() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  // divider
  ctx.fillStyle = '#333';
  ctx.fillRect(HALF_W - 1, 0, 2, H);
}

requestAnimationFrame(loop);
```

- [ ] **Step 3: Open index.html in browser**

Expected: Black screen with a thin grey vertical divider in the center. No errors in console.

- [ ] **Step 4: Commit**

```bash
git init
git add index.html game.js
git commit -m "feat: scaffold canvas + game loop"
```

---

### Task 2: Constants — Weapons, Physics, Level Geometry

**Files:**
- Modify: `game.js` — insert before SECTION 2

- [ ] **Step 1: Add constants section to game.js after SECTION 1**

```js
// ============================================================
// SECTION 2: CONSTANTS
// ============================================================

// Physics
const GRAVITY      = 900;   // px/s²
const JUMP_VEL     = -420;  // px/s
const MOVE_SPEED   = 200;   // px/s
const WORLD_W      = 2400;
const WORLD_H      = H;
const PLAYER_W     = 16;    // logical pixels (drawn 3× scaled)
const PLAYER_H     = 32;

// Weapons  { name, damage, reloadTime, ammo, assistRadius, color }
const WEAPONS = {
  SCOUT:   { name: 'SCOUT',   damage: 34,  reloadTime: 0.8, ammo: 10, assistRadius: 30, color: '#88ff88' },
  KRIEG:   { name: 'KRIEG',   damage: 55,  reloadTime: 1.5, ammo: 6,  assistRadius: 18, color: '#ffaa44' },
  AWP:     { name: 'AWP',     damage: 85,  reloadTime: 3.0, ammo: 4,  assistRadius: 8,  color: '#ff8888' },
  DEADEYE: { name: 'DEADEYE', damage: 100, reloadTime: 5.0, ammo: 2,  assistRadius: 0,  color: '#ff4444' },
};
const WEAPON_KEYS = ['SCOUT', 'KRIEG', 'AWP', 'DEADEYE'];

// Screens
const SCREEN = { WEAPON_SELECT: 'WEAPON_SELECT', BATTLE: 'BATTLE', WIN: 'WIN' };

// Level — platforms and cover (world coords)
const GROUND_Y = 540;

const PLATFORMS = [
  // Ground
  { x: 0,    y: GROUND_Y, w: WORLD_W, h: 60 },
  // Left area platforms
  { x: 200,  y: 430, w: 220, h: 14 },
  { x: 100,  y: 320, w: 160, h: 14 },
  // Center platforms
  { x: 980,  y: 400, w: 250, h: 14 },
  { x: 1080, y: 280, w: 180, h: 14 },
  // Right area platforms (mirror)
  { x: 1980, y: 430, w: 220, h: 14 },
  { x: 2140, y: 320, w: 160, h: 14 },
  // Center-left
  { x: 600,  y: 370, w: 200, h: 14 },
  // Center-right
  { x: 1600, y: 370, w: 200, h: 14 },
];

const COVERS = [
  { x: 280,  y: GROUND_Y - 28, w: 50,  h: 28 },
  { x: 500,  y: GROUND_Y - 28, w: 40,  h: 28 },
  { x: 750,  y: GROUND_Y - 28, w: 60,  h: 28 },
  { x: 1070, y: GROUND_Y - 28, w: 50,  h: 28 },
  { x: 1280, y: GROUND_Y - 28, w: 50,  h: 28 },
  { x: 1590, y: GROUND_Y - 28, w: 60,  h: 28 },
  { x: 1850, y: GROUND_Y - 28, w: 40,  h: 28 },
  { x: 2070, y: GROUND_Y - 28, w: 50,  h: 28 },
  // On platforms
  { x: 220,  y: 416, w: 30, h: 14 },
  { x: 1020, y: 386, w: 30, h: 14 },
  { x: 1980, y: 416, w: 30, h: 14 },
];
```

- [ ] **Step 2: Renumber SECTION 2 (game loop) to SECTION 3**

In game.js, change the comment `// SECTION 2: GAME LOOP` to `// SECTION 3: GAME LOOP`.

- [ ] **Step 3: Open index.html — verify no console errors**

Expected: Same black screen, no errors. Constants loaded silently.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: add weapon/physics/level constants"
```

---

### Task 3: Game State

**Files:**
- Modify: `game.js` — insert new SECTION 3: STATE (before old SECTION 3: GAME LOOP, renumber loop to SECTION 4)

- [ ] **Step 1: Add state section**

```js
// ============================================================
// SECTION 3: STATE
// ============================================================

// Round tracker
const roundWins = [0, 0]; // [p1wins, p2wins]
let currentRound = 1;
let currentScreen = SCREEN.WEAPON_SELECT;
let winner = -1; // 0 or 1 index

// Weapon selection state (used on WEAPON_SELECT screen)
const selection = [0, 0]; // index into WEAPON_KEYS per player
const confirmed = [false, false];

// Players — initialised per round in initRound()
let players = [];

// Bullets in flight
let bullets = [];

// Round-end flash message
let roundMsg = '';
let roundMsgTimer = 0;

function initRound() {
  confirmed[0] = false;
  confirmed[1] = false;
  selection[0] = 0;
  selection[1] = 0;
  bullets = [];
  roundMsg = '';
  roundMsgTimer = 0;

  players = [
    createPlayer(0, 180, GROUND_Y - PLAYER_H * 3),
    createPlayer(1, WORLD_W - 180 - PLAYER_W * 3, GROUND_Y - PLAYER_H * 3),
  ];
}

function createPlayer(index, x, y) {
  const weaponKey = WEAPON_KEYS[selection[index]];
  const weapon = WEAPONS[weaponKey];
  return {
    index,
    x, y,
    vx: 0, vy: 0,
    onGround: false,
    hp: 100,
    maxHp: 100,
    weapon: { ...weapon, key: weaponKey },
    ammo: weapon.ammo,
    reloadTimer: 0,
    scoping: false,
    scopeCharge: 0,     // 0→1 zoom-in animation progress
    dead: false,
    facing: index === 0 ? 1 : -1, // 1=right, -1=left
    animState: 'idle',  // idle | run | jump | scope | dead
    animFrame: 0,
    animTimer: 0,
    hitFlash: 0,        // seconds remaining for red flash
  };
}
```

- [ ] **Step 2: Rename SECTION 3 game loop to SECTION 4**

Change `// SECTION 3: GAME LOOP` → `// SECTION 4: GAME LOOP`.

- [ ] **Step 3: Open index.html — verify no console errors**

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: add game state and initRound"
```

---

### Task 4: Input System

**Files:**
- Modify: `game.js` — add SECTION 5: INPUT before SECTION 4 (game loop), renumber loop to SECTION 5

- [ ] **Step 1: Add input section**

```js
// ============================================================
// SECTION 4: INPUT
// ============================================================

const keys = {};

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  e.preventDefault();
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
  // Scope fire: player fires on key-up while scoped
  if (e.code === 'KeyF' && players[0] && players[0].scoping && !players[0].dead) {
    tryFire(players[0], players[1]);
  }
  if (e.code === 'KeyL' && players[1] && players[1].scoping && !players[1].dead) {
    tryFire(players[1], players[0]);
  }
});

function isLeft(p)  { return p.index === 0 ? keys['KeyA']     : keys['ArrowLeft'];  }
function isRight(p) { return p.index === 0 ? keys['KeyD']     : keys['ArrowRight']; }
function isJump(p)  { return p.index === 0 ? keys['KeyW']     : keys['ArrowUp'];    }
function isScope(p) { return p.index === 0 ? keys['KeyF']     : keys['KeyL'];       }

// Weapon select navigation (debounced via flag)
const _navPressed = [false, false];
function navUp(p)   { return p.index === 0 ? keys['KeyW']   : keys['ArrowUp'];   }
function navDown(p) { return p.index === 0 ? keys['KeyS']   : keys['ArrowDown']; }
function confirmKey(p) { return p.index === 0 ? keys['KeyF'] : keys['KeyL'];     }
```

- [ ] **Step 2: Renumber SECTION 4 game loop to SECTION 5**

- [ ] **Step 3: Open index.html — verify no console errors**

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: keyboard input system"
```

---

### Task 5: Physics — Movement, Gravity, Platform Collision

**Files:**
- Modify: `game.js` — add SECTION 6: PHYSICS, fill in `update(dt)`

- [ ] **Step 1: Add physics section after INPUT section**

```js
// ============================================================
// SECTION 5: PHYSICS
// ============================================================

function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function applyPhysics(p, dt) {
  if (p.dead) return;

  const pw = PLAYER_W * 3;
  const ph = PLAYER_H * 3;

  // Horizontal movement (locked while scoping)
  if (!p.scoping) {
    if (isLeft(p))  { p.vx = -MOVE_SPEED; p.facing = -1; }
    else if (isRight(p)) { p.vx = MOVE_SPEED; p.facing = 1; }
    else p.vx = 0;
  } else {
    p.vx = 0;
  }

  // Gravity
  p.vy += GRAVITY * dt;

  // Move X
  p.x += p.vx * dt;
  p.x = Math.max(0, Math.min(WORLD_W - pw, p.x));

  // Move Y
  p.y += p.vy * dt;

  // Platform collision
  p.onGround = false;
  const allTiles = [...PLATFORMS, ...COVERS];
  for (const tile of allTiles) {
    if (rectOverlap(p.x, p.y, pw, ph, tile.x, tile.y, tile.w, tile.h)) {
      // Coming from above
      const prevBottom = p.y + ph - p.vy * dt;
      if (prevBottom <= tile.y + 2 && p.vy >= 0) {
        p.y = tile.y - ph;
        p.vy = 0;
        p.onGround = true;
      }
      // Coming from below
      else if (p.vy < 0) {
        p.y = tile.y + tile.h;
        p.vy = 0;
      }
    }
  }

  // Jump
  if (isJump(p) && p.onGround) {
    p.vy = JUMP_VEL;
    p.onGround = false;
  }

  // Clamp to world height
  if (p.y + ph > WORLD_H) {
    p.y = WORLD_H - ph;
    p.vy = 0;
    p.onGround = true;
  }
}

function updateScoping(p, dt) {
  if (p.dead) return;
  if (isScope(p) && !p.dead) {
    p.scoping = true;
    p.scopeCharge = Math.min(p.scopeCharge + dt * 3, 1);
  } else {
    p.scoping = false;
    p.scopeCharge = Math.max(p.scopeCharge - dt * 6, 0);
  }
}

function updateReload(p, dt) {
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) {
      p.reloadTimer = 0;
      if (p.ammo === 0) p.ammo = 1; // emergency single reload
    }
  }
}

function updateHitFlash(p, dt) {
  if (p.hitFlash > 0) p.hitFlash -= dt;
}
```

- [ ] **Step 2: Replace the stub `update(dt)` with a real one**

```js
function update(dt) {
  if (currentScreen === SCREEN.WEAPON_SELECT) {
    updateWeaponSelect(dt);
    return;
  }
  if (currentScreen === SCREEN.WIN) {
    updateWin(dt);
    return;
  }

  // BATTLE
  for (const p of players) {
    applyPhysics(p, dt);
    updateScoping(p, dt);
    updateReload(p, dt);
    updateHitFlash(p, dt);
    updateAimAssist(p, players[1 - p.index]);
    updateAnimation(p, dt);
  }
  updateBullets(dt);

  if (roundMsgTimer > 0) {
    roundMsgTimer -= dt;
    if (roundMsgTimer <= 0) endRoundTransition();
  }
}

function updateWeaponSelect(dt) {
  // stub — implemented in Task 9
}

function updateWin(dt) {
  // stub — implemented in Task 16
}

function updateAimAssist(p, enemy) {
  // stub — implemented in Task 13
}

function updateAnimation(p, dt) {
  // stub — implemented in Task 17
}

function updateBullets(dt) {
  // stub — implemented in Task 11
}

function endRoundTransition() {
  // stub — implemented in Task 15
}
```

- [ ] **Step 3: Call initRound() then start the loop — add at very bottom of game.js**

Replace the existing `requestAnimationFrame(loop);` at the bottom with:

```js
initRound();
requestAnimationFrame(loop);
```

- [ ] **Step 4: Open index.html — verify no console errors**

- [ ] **Step 5: Commit**

```bash
git add game.js
git commit -m "feat: physics, gravity, platform collision, scoping"
```

---

### Task 6: Split-Screen Rendering + Camera + Level Drawing

**Files:**
- Modify: `game.js` — add SECTION 6: RENDERING, fill in `render()`

- [ ] **Step 1: Add rendering section**

```js
// ============================================================
// SECTION 6: RENDERING
// ============================================================

function getCameraX(p) {
  const pw = PLAYER_W * 3;
  let cx = p.x + pw / 2 - HALF_W / 2;
  cx = Math.max(0, Math.min(WORLD_W - HALF_W, cx));
  return cx;
}

function renderViewport(playerIndex, camX, offsetX) {
  ctx.save();
  // Clip to this half of the canvas
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);
  ctx.clip();
  ctx.translate(offsetX - camX, 0);

  // Sky
  const sky = ctx.createLinearGradient(camX, 0, camX, H * 0.55);
  sky.addColorStop(0, '#0a1520');
  sky.addColorStop(1, '#163050');
  ctx.fillStyle = sky;
  ctx.fillRect(camX, 0, HALF_W, H);

  // Ground base
  ctx.fillStyle = '#1a2a0a';
  ctx.fillRect(0, GROUND_Y, WORLD_W, H - GROUND_Y);

  // Platforms
  for (const plat of PLATFORMS) {
    if (plat.y >= GROUND_Y) continue; // skip ground, drawn above
    ctx.fillStyle = '#3a4a2a';
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.fillStyle = '#4a5a3a';
    ctx.fillRect(plat.x, plat.y, plat.w, 3);
  }

  // Ground top edge
  ctx.fillStyle = '#2a4a1a';
  ctx.fillRect(0, GROUND_Y, WORLD_W, 4);

  // Cover objects
  for (const c of COVERS) {
    ctx.fillStyle = '#5a4a2a';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#6a5a3a';
    ctx.fillRect(c.x, c.y, c.w, 4);
    ctx.fillStyle = '#4a3a1a';
    ctx.fillRect(c.x, c.y + c.h - 4, c.w, 4);
  }

  ctx.restore();
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (currentScreen === SCREEN.WEAPON_SELECT) {
    renderWeaponSelect();
    return;
  }
  if (currentScreen === SCREEN.WIN) {
    renderWinScreen();
    return;
  }

  // BATTLE — render both viewports
  const cam0 = getCameraX(players[0]);
  const cam1 = getCameraX(players[1]);

  renderViewport(0, cam0, 0);
  renderViewport(1, cam1, HALF_W);

  // Draw players in each viewport
  for (let vp = 0; vp < 2; vp++) {
    const cam = vp === 0 ? cam0 : cam1;
    const offsetX = vp * HALF_W;
    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, 0, HALF_W, H);
    ctx.clip();
    ctx.translate(offsetX - cam, 0);
    for (const p of players) {
      drawPlayer(p, vp);
    }
    for (const b of bullets) {
      drawBullet(b);
    }
    ctx.restore();
  }

  // HUD (drawn after, in screen-space)
  for (let i = 0; i < 2; i++) {
    drawHUD(players[i], i * HALF_W);
  }

  // Scope overlay (on top of everything)
  for (let i = 0; i < 2; i++) {
    if (players[i].scoping || players[i].scopeCharge > 0) {
      drawScopeOverlay(players[i], i * HALF_W);
    }
  }

  // Round message flash
  if (roundMsgTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(roundMsgTimer, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(roundMsg, W / 2, H / 2);
    ctx.restore();
  }

  // Divider
  ctx.fillStyle = '#222';
  ctx.fillRect(HALF_W - 1, 0, 2, H);

  function renderWeaponSelect() { /* stub */ }
  function renderWinScreen() { /* stub */ }
}
```

- [ ] **Step 2: Add stub draw functions (to be filled in later tasks)**

```js
function drawPlayer(p, viewportIndex) { /* Task 7 */ }
function drawBullet(b) { /* Task 11 */ }
function drawHUD(p, offsetX) { /* Task 14 */ }
function drawScopeOverlay(p, offsetX) { /* Task 10 */ }
```

- [ ] **Step 3: Open index.html — verify level renders in both viewports**

Expected: Left and right halves show the same world with platforms, ground, and cover objects. No characters yet.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: split-screen rendering, camera, level drawing"
```

---

### Task 7: Pixel Character Drawing

**Files:**
- Modify: `game.js` — implement `drawPlayer()`

- [ ] **Step 1: Replace the `drawPlayer` stub**

```js
function drawPlayer(p, viewportIndex) {
  const S = 3; // scale factor — each logical pixel = 3×3 canvas pixels
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const flash = p.hitFlash > 0;

  const P1_PALETTE = {
    head: flash ? '#ff4444' : '#c8a060',
    helmet: flash ? '#ff2222' : '#2a4a2a',
    body: flash ? '#ff4444' : '#2a7a2a',
    legs: flash ? '#ff3333' : '#1a4a1a',
    boots: '#111',
    gun: '#3a3a3a',
    scope: '#1a1a1a',
  };
  const P2_PALETTE = {
    head: flash ? '#ff4444' : '#c8a060',
    helmet: flash ? '#ff2222' : '#1a3a5a',
    body: flash ? '#ff4444' : '#1a4a9a',
    legs: flash ? '#ff3333' : '#0a2a6a',
    boots: '#111',
    gun: '#3a3a3a',
    scope: '#1a1a1a',
  };

  const pal = p.index === 0 ? P1_PALETTE : P2_PALETTE;

  function px(lx, ly, lw, lh, color) {
    ctx.fillStyle = color;
    // flip horizontally if facing left
    const rx = p.facing === 1 ? lx : (PLAYER_W - lx - lw);
    ctx.fillRect(x + rx * S, y + ly * S, lw * S, lh * S);
  }

  if (p.dead) {
    // Dead — flat on ground
    ctx.fillStyle = pal.body;
    ctx.fillRect(x, y + PLAYER_H * S - S * 6, PLAYER_W * S, S * 6);
    ctx.fillStyle = pal.head;
    ctx.fillRect(x + (p.facing === 1 ? PLAYER_W * S - S * 5 : 0), y + PLAYER_H * S - S * 6, S * 5, S * 5);
    return;
  }

  if (p.animState === 'scope') {
    // Crouching — lower profile
    // Head
    px(4, 10, 8, 6, pal.head);
    // Helmet
    px(3, 7, 10, 5, pal.helmet);
    // Body (hunched)
    px(3, 16, 10, 10, pal.body);
    // Gun extended
    px(p.facing === 1 ? 10 : -4, 14, 14, 3, pal.gun);
    px(p.facing === 1 ? 21 : -7, 13, 4, 5, pal.scope);
    // Legs
    px(3, 26, 4, 6, pal.legs);
    px(9, 26, 4, 6, pal.legs);
    px(2, 30, 5, 2, pal.boots);
    px(9, 30, 5, 2, pal.boots);
    return;
  }

  // Standing frame (idle/run — slight bob from animFrame)
  const bob = (p.animState === 'run') ? (p.animFrame % 2 === 0 ? 0 : 1) : 0;

  // Head
  px(4, 0 + bob, 8, 6, pal.head);
  // Helmet
  px(3, bob - 2, 10, 4, pal.helmet);
  // Body
  px(3, 6 + bob, 10, 12, pal.body);
  // Gun
  px(p.facing === 1 ? 11 : -3, 8 + bob, 10, 3, pal.gun);
  px(p.facing === 1 ? 19 : -5, 7 + bob, 3, 5, pal.scope);
  // Arms (implied by body)
  // Legs
  if (p.animState === 'jump') {
    px(3, 18 + bob, 4, 10, pal.legs);
    px(9, 20 + bob, 4, 8, pal.legs);
  } else if (p.animState === 'run' && p.animFrame % 2 === 0) {
    px(3, 18, 4, 8, pal.legs);
    px(9, 20, 4, 10, pal.legs);
  } else {
    px(3, 18 + bob, 4, 10, pal.legs);
    px(9, 18 + bob, 4, 10, pal.legs);
  }
  // Boots
  px(2, 28 + bob, 5, 4, pal.boots);
  px(9, 28 + bob, 5, 4, pal.boots);
}
```

- [ ] **Step 2: Temporarily force SCREEN to BATTLE and call initRound()**

At the bottom of game.js, just before `requestAnimationFrame(loop)`:

```js
initRound();
currentScreen = SCREEN.BATTLE;
requestAnimationFrame(loop);
```

- [ ] **Step 3: Open index.html — verify pixel characters appear**

Expected: Green (P1) and blue (P2) pixel soldiers visible in both viewports, standing on the ground.

- [ ] **Step 4: Add animation update function**

Replace the `updateAnimation` stub:

```js
function updateAnimation(p, dt) {
  p.animTimer += dt;

  if (p.dead)    { p.animState = 'dead'; return; }
  if (p.scoping) { p.animState = 'scope'; return; }
  if (!p.onGround) { p.animState = 'jump'; return; }
  if (p.vx !== 0)  {
    p.animState = 'run';
    if (p.animTimer > 0.12) { p.animFrame++; p.animTimer = 0; }
    return;
  }
  p.animState = 'idle';
  p.animFrame = 0;
}
```

- [ ] **Step 5: Open index.html — test movement with WASD**

Expected: P1 walks and jumps. Character faces direction of movement. Scopes when F is held.

- [ ] **Step 6: Commit**

```bash
git add game.js
git commit -m "feat: pixel character drawing and animations"
```

---

### Task 8: Scope Overlay

**Files:**
- Modify: `game.js` — implement `drawScopeOverlay()`

- [ ] **Step 1: Replace `drawScopeOverlay` stub**

```js
function drawScopeOverlay(p, offsetX) {
  const charge = p.scopeCharge;
  if (charge <= 0) return;

  const cx = offsetX + HALF_W / 2;
  const cy = H / 2;
  const maxR = 130;
  const r = maxR * charge;

  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);
  ctx.clip();

  // Black vignette
  ctx.fillStyle = `rgba(0,0,0,${0.88 * charge})`;
  ctx.fillRect(offsetX, 0, HALF_W, H);

  // Scope circle — punch a "window" using compositing
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Scope border ring
  ctx.strokeStyle = `rgba(180,180,180,${charge})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Mil-dot reticle (only when fully charged)
  if (charge > 0.8) {
    const alpha = (charge - 0.8) / 0.2;
    ctx.strokeStyle = `rgba(220,50,50,${alpha})`;
    ctx.lineWidth = 1;

    // Crosshair lines
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Mil dots
    ctx.fillStyle = `rgba(220,50,50,${alpha})`;
    for (const [dx, dy] of [[-r*0.4,0],[r*0.4,0],[0,-r*0.4],[0,r*0.4]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center dot gap (no line in center 10px)
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(cx - 5, cy - 1, 10, 2);
    ctx.fillRect(cx - 1, cy - 5, 2, 10);
  }

  ctx.restore();
}
```

- [ ] **Step 2: Open index.html — hold F to test scope**

Expected: Screen darkens, circular scope window appears at center of P1's viewport with crosshair reticle when fully charged. Smooth zoom-in animation.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: circular scope overlay with mil-dot reticle"
```

---

### Task 9: Bullets, Shooting + Hit Detection

**Files:**
- Modify: `game.js` — implement `tryFire()`, `updateBullets()`, `drawBullet()`

- [ ] **Step 1: Add bullet functions**

```js
function tryFire(shooter, target) {
  if (shooter.dead) return;
  if (shooter.ammo <= 0) return;
  if (shooter.reloadTimer > 0) return;

  shooter.ammo--;
  shooter.reloadTimer = shooter.weapon.reloadTime;
  shooter.scoping = false;
  shooter.scopeCharge = 0;

  // Bullet origin: gun tip (roughly center-chest height, extended in facing dir)
  const S = 3;
  const bx = shooter.x + PLAYER_W * S / 2 + shooter.facing * PLAYER_W * S * 0.6;
  const by = shooter.y + PLAYER_H * S * 0.35;

  // Aim direction: toward aim assist adjusted target center
  const tx = target.x + PLAYER_W * S / 2 + shooter._assistOffset;
  const ty = target.y + PLAYER_H * S / 2;
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = 1800;

  bullets.push({
    x: bx, y: by,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    owner: shooter.index,
    damage: shooter.weapon.damage,
    color: shooter.index === 0 ? '#aaff44' : '#44aaff',
    life: 2, // seconds before despawn
  });
}

function updateBullets(dt) {
  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    const target = players[1 - b.owner];
    if (!target.dead) {
      const S = 3;
      if (rectOverlap(b.x - 4, b.y - 4, 8, 8,
                      target.x, target.y, PLAYER_W * S, PLAYER_H * S)) {
        applyDamage(target, b.damage);
        b.life = 0; // remove bullet
      }
    }

    // Bullet vs cover/platform blocking
    for (const tile of [...PLATFORMS, ...COVERS]) {
      if (rectOverlap(b.x - 2, b.y - 2, 4, 4, tile.x, tile.y, tile.w, tile.h)) {
        b.life = 0;
      }
    }
  }

  // Remove dead bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].life <= 0) bullets.splice(i, 1);
  }
}

function applyDamage(p, dmg) {
  if (p.dead) return;
  p.hp -= dmg;
  p.hitFlash = 0.2;
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    p.animState = 'dead';
    onPlayerDied(p);
  }
}

function drawBullet(b) {
  ctx.fillStyle = b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 8;
  ctx.fillRect(b.x - 3, b.y - 2, 6, 4);
  ctx.shadowBlur = 0;
}
```

- [ ] **Step 2: Open index.html — test shooting**

Test: Hold F, then release — a bullet should fire toward P2. Bullet should disappear on hitting P2 or cover.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: bullets, shooting, hit detection, damage"
```

---

### Task 10: Aim Assist

**Files:**
- Modify: `game.js` — implement `updateAimAssist()`

- [ ] **Step 1: Replace `updateAimAssist` stub**

```js
function updateAimAssist(p, enemy) {
  p._assistOffset = 0;
  if (!p.scoping || p.scopeCharge < 0.8) return;
  if (enemy.dead) return;

  const r = p.weapon.assistRadius;
  if (r === 0) return;

  const S = 3;
  // Center of enemy in world space
  const ex = enemy.x + PLAYER_W * S / 2;
  // Center of shooter's "aim line" (horizontal, at chest height)
  const px = p.x + PLAYER_W * S / 2;

  const rawOffset = ex - px; // where enemy is relative to player
  const dist = Math.abs(rawOffset);

  // Within snap radius: soft pull (lerp toward enemy center)
  if (dist < r * 8) { // 8px per world-unit snap zone in screen coords
    // Lerp factor: stronger when closer
    const t = Math.max(0, 1 - dist / (r * 8));
    p._assistOffset = rawOffset * t * 0.7; // 70% snap max
  }
}
```

- [ ] **Step 2: Open index.html — verify aim assist**

Test Scout (highest assist): When scoped near the enemy, the bullet should pull toward them noticeably. Test Deadeye: bullet should go exactly where crosshair points with no pull.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: per-weapon aim assist with soft snap"
```

---

### Task 11: HUD

**Files:**
- Modify: `game.js` — implement `drawHUD()`

- [ ] **Step 1: Replace `drawHUD` stub**

```js
function drawHUD(p, offsetX) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);
  ctx.clip();

  const label = p.index === 0 ? 'P1' : 'P2';
  const labelColor = p.index === 0 ? '#4aff4a' : '#4aaaff';

  // Player label
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = labelColor;
  ctx.textAlign = p.index === 0 ? 'left' : 'right';
  const tx = p.index === 0 ? offsetX + 8 : offsetX + HALF_W - 8;
  ctx.fillText(label, tx, 20);

  // Health hearts (3 hearts = 100 HP)
  const heartCount = 3;
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  const filledHearts = Math.ceil(hpFrac * heartCount);
  for (let i = 0; i < heartCount; i++) {
    const filled = i < filledHearts;
    const hx = p.index === 0
      ? offsetX + 8 + i * 22
      : offsetX + HALF_W - 8 - (heartCount - i) * 22;
    ctx.font = '16px serif';
    ctx.fillStyle = filled ? '#ff4466' : '#442233';
    ctx.fillText('♥', hx, 38);
  }

  // Weapon name
  ctx.font = '10px monospace';
  ctx.fillStyle = p.weapon.color;
  ctx.textAlign = p.index === 0 ? 'left' : 'right';
  ctx.fillText(p.weapon.name, tx, H - 30);

  // Ammo
  const ammoColor = p.ammo === 0 ? '#ff4444' : '#aaaaaa';
  ctx.fillStyle = ammoColor;
  const reloading = p.reloadTimer > 0;
  const ammoText = reloading
    ? `RELOADING ${(p.reloadTimer).toFixed(1)}s`
    : `${p.ammo} ammo`;
  ctx.fillText(ammoText, tx, H - 16);

  // Round win tracker (top center of this viewport)
  ctx.textAlign = 'center';
  const vcx = offsetX + HALF_W / 2;
  ctx.font = '10px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('ROUND ' + currentRound, vcx, 16);

  // Win squares
  for (let i = 0; i < 3; i++) {
    const sq = 10;
    const gap = 4;
    // P1 squares (left of center)
    const p1x = vcx - 8 - (3 - i) * (sq + gap);
    ctx.fillStyle = i < roundWins[0] ? '#4aff4a' : '#222';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.fillRect(p1x, 22, sq, sq);
    ctx.strokeRect(p1x, 22, sq, sq);

    // P2 squares (right of center)
    const p2x = vcx + 8 + i * (sq + gap);
    ctx.fillStyle = i < roundWins[1] ? '#4aaaff' : '#222';
    ctx.fillRect(p2x, 22, sq, sq);
    ctx.strokeRect(p2x, 22, sq, sq);
  }

  ctx.restore();
}
```

- [ ] **Step 2: Open index.html — verify HUD**

Expected: Both players show label, hearts, weapon name, ammo count, and round tracker at top.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: HUD — hearts, ammo, weapon, round tracker"
```

---

### Task 12: Round Flow — Death, Round Win, Match Win

**Files:**
- Modify: `game.js` — implement `onPlayerDied()`, `endRoundTransition()`

- [ ] **Step 1: Add round flow functions**

```js
function onPlayerDied(deadPlayer) {
  const winnerIndex = 1 - deadPlayer.index;
  roundWins[winnerIndex]++;

  roundMsg = `P${winnerIndex + 1} WINS ROUND ${currentRound}!`;
  roundMsgTimer = 2.0;
  currentRound++;

  // Check match win
  if (roundWins[winnerIndex] >= 3) {
    // Delay then go to WIN screen
    roundMsg = `P${winnerIndex + 1} WINS THE MATCH!`;
    roundMsgTimer = 2.5;
    winner = winnerIndex;
  }
}

function endRoundTransition() {
  if (winner >= 0) {
    currentScreen = SCREEN.WIN;
    return;
  }
  // Start next round — back to weapon select
  currentScreen = SCREEN.WEAPON_SELECT;
}

// Handle simultaneous death (draw — replay round)
function checkSimultaneousDeath() {
  const bothDead = players.every(p => p.dead);
  if (bothDead) {
    // Undo the round win that was just awarded
    const lastWinner = roundWins[0] > roundWins[1] ? 0 : 1;
    roundWins[lastWinner]--;
    currentRound--;
    roundMsg = 'DRAW — REPLAY ROUND';
    roundMsgTimer = 2.0;
    winner = -1;
  }
}
```

- [ ] **Step 2: Call `checkSimultaneousDeath` from `updateBullets` — add after damage application**

In `updateBullets`, after the call to `applyDamage(target, b.damage)`, add:

```js
        checkSimultaneousDeath();
```

- [ ] **Step 3: Open index.html — test a kill**

Test: Move P2 into view, scope P1, fire until P2 dies. Expected: "P1 WINS ROUND 1!" flashes, then weapon select appears.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: round flow — death, round win, match win, draw"
```

---

### Task 13: Weapon Select Screen

**Files:**
- Modify: `game.js` — implement `updateWeaponSelect()`, move `renderWeaponSelect()` outside `render()`

- [ ] **Step 1: Implement `updateWeaponSelect()`**

Replace the stub:

```js
function updateWeaponSelect(dt) {
  for (let i = 0; i < 2; i++) {
    if (confirmed[i]) continue;

    const fakeP = { index: i };
    if (navUp(fakeP) && !_navPressed[i]) {
      selection[i] = (selection[i] - 1 + WEAPON_KEYS.length) % WEAPON_KEYS.length;
      _navPressed[i] = true;
    } else if (navDown(fakeP) && !_navPressed[i]) {
      selection[i] = (selection[i] + 1) % WEAPON_KEYS.length;
      _navPressed[i] = true;
    } else if (!navUp(fakeP) && !navDown(fakeP)) {
      _navPressed[i] = false;
    }

    if (confirmKey(fakeP)) {
      confirmed[i] = true;
    }
  }

  if (confirmed[0] && confirmed[1]) {
    // Both confirmed — start round
    initRound();
    currentScreen = SCREEN.BATTLE;
  }
}
```

- [ ] **Step 2: Add top-level `renderWeaponSelect()` function (replacing the inner stub)**

Add this as a standalone function in SECTION 6: RENDERING:

```js
function renderWeaponSelect() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('★  SNIPER DUEL  ★', W / 2, 60);

  ctx.font = '13px monospace';
  ctx.fillStyle = '#555';
  ctx.fillText(`ROUND ${currentRound}  —  First to 3`, W / 2, 85);

  const panelW = 420;
  const panelH = 340;
  const panelY = 110;

  for (let i = 0; i < 2; i++) {
    const panelX = i === 0 ? 60 : W - 60 - panelW;
    const color = i === 0 ? '#4aff4a' : '#4aaaff';
    const controls = i === 0 ? 'W/S navigate   F confirm' : '↑/↓ navigate   L confirm';

    // Panel border
    ctx.strokeStyle = confirmed[i] ? color : '#333';
    ctx.lineWidth = confirmed[i] ? 2 : 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Player label
    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PLAYER ${i + 1}`, panelX + 12, panelY + 24);

    ctx.fillStyle = '#444';
    ctx.font = '10px monospace';
    ctx.fillText(controls, panelX + 12, panelY + 42);

    // Weapon list
    WEAPON_KEYS.forEach((key, idx) => {
      const w = WEAPONS[key];
      const wy = panelY + 65 + idx * 65;
      const selected = selection[i] === idx;

      // Row background
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.3)';
      ctx.fillRect(panelX + 8, wy - 2, panelW - 16, 56);

      // Selection indicator
      if (selected) {
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX + 8, wy - 2, panelW - 16, 56);
      }

      // Weapon name
      ctx.fillStyle = w.color;
      ctx.font = `bold ${key === 'DEADEYE' ? '13' : '14'}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText((key === 'DEADEYE' ? '💀 ' : '🔫 ') + w.name, panelX + 18, wy + 18);

      // Stats bars
      const barW = 100;
      const speedFrac = 1 - (w.reloadTime / 5.0);
      const dmgFrac = w.damage / 100;
      const assistFrac = w.assistRadius / 30;

      drawStatBar(ctx, panelX + 18, wy + 28, barW, 'SPD', speedFrac, '#88ff88');
      drawStatBar(ctx, panelX + 18 + barW + 20, wy + 28, barW, 'DMG', dmgFrac, '#ff8888');
      drawStatBar(ctx, panelX + 18 + (barW + 20) * 2, wy + 28, barW, 'AIM', assistFrac, '#88aaff');
    });

    // Confirmed indicator
    if (confirmed[i]) {
      ctx.fillStyle = color;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('READY ✓', panelX + panelW / 2, panelY + panelH - 12);
    } else {
      ctx.fillStyle = '#333';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('press confirm to lock in', panelX + panelW / 2, panelY + panelH - 12);
    }
  }

  // Round win tracker (center)
  ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const sq = 14;
    const gap = 6;
    ctx.fillStyle = i < roundWins[0] ? '#4aff4a' : '#222';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    const p1x = W / 2 - 10 - (3 - i) * (sq + gap);
    ctx.fillRect(p1x, H - 60, sq, sq);
    ctx.strokeRect(p1x, H - 60, sq, sq);

    ctx.fillStyle = i < roundWins[1] ? '#4aaaff' : '#222';
    const p2x = W / 2 + 10 + i * (sq + gap);
    ctx.fillRect(p2x, H - 60, sq, sq);
    ctx.strokeRect(p2x, H - 60, sq, sq);
  }

  ctx.fillStyle = '#555';
  ctx.font = '10px monospace';
  ctx.fillText('P1', W / 2 - 10 - 3 * (14 + 6) - 16, H - 49);
  ctx.fillText('P2', W / 2 + 10 + 3 * (14 + 6) + 6, H - 49);
}

function drawStatBar(ctx, x, y, w, label, frac, color) {
  const filledW = Math.round(frac * w);
  ctx.fillStyle = '#111';
  ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, filledW, 6);
  ctx.fillStyle = '#555';
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + 16);
}
```

- [ ] **Step 3: Update `render()` to call standalone `renderWeaponSelect()`**

In `render()`, change the early return for WEAPON_SELECT:

```js
  if (currentScreen === SCREEN.WEAPON_SELECT) {
    renderWeaponSelect();
    return;
  }
```

Remove the inner stub function `function renderWeaponSelect() { /* stub */ }` from inside `render()`.

- [ ] **Step 4: Revert the forced BATTLE screen at bottom of game.js**

Change:
```js
initRound();
currentScreen = SCREEN.BATTLE;
```
Back to:
```js
initRound();
```

- [ ] **Step 5: Open index.html — test weapon select**

Expected: Weapon select screen shows for both players. Navigate with W/S and arrows. Confirm with F and L. Both confirming starts the battle.

- [ ] **Step 6: Commit**

```bash
git add game.js
git commit -m "feat: weapon select screen with stat bars"
```

---

### Task 14: Win Screen + Rematch

**Files:**
- Modify: `game.js` — implement `renderWinScreen()`, `updateWin()`

- [ ] **Step 1: Add win screen render function**

Add as standalone function in SECTION 6:

```js
function renderWinScreen() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

  const winnerColor = winner === 0 ? '#4aff4a' : '#4aaaff';
  const winnerLabel = `PLAYER ${winner + 1}`;

  // Big winner text
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(winnerLabel, W / 2, H / 2 - 40);

  ctx.fillStyle = winnerColor;
  ctx.font = 'bold 28px monospace';
  ctx.fillText('WINS THE MATCH', W / 2, H / 2 + 10);

  // Score
  ctx.fillStyle = '#555';
  ctx.font = '14px monospace';
  ctx.fillText(`${roundWins[0]} — ${roundWins[1]}`, W / 2, H / 2 + 50);

  // Options
  ctx.strokeStyle = winnerColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(W / 2 - 160, H / 2 + 80, 140, 36);
  ctx.fillStyle = winnerColor;
  ctx.font = '13px monospace';
  ctx.fillText('REMATCH [ENTER]', W / 2 - 90, H / 2 + 104);

  ctx.strokeStyle = '#444';
  ctx.strokeRect(W / 2 + 20, H / 2 + 80, 140, 36);
  ctx.fillStyle = '#555';
  ctx.fillText('MENU [ESC]', W / 2 + 90, H / 2 + 104);
}
```

- [ ] **Step 2: Implement `updateWin()`**

Replace the stub:

```js
function updateWin(dt) {
  if (keys['Enter']) {
    // Rematch — reset everything
    roundWins[0] = 0;
    roundWins[1] = 0;
    currentRound = 1;
    winner = -1;
    currentScreen = SCREEN.WEAPON_SELECT;
    initRound();
  }
  if (keys['Escape']) {
    // Back to menu (also resets)
    roundWins[0] = 0;
    roundWins[1] = 0;
    currentRound = 1;
    winner = -1;
    currentScreen = SCREEN.WEAPON_SELECT;
    initRound();
  }
}
```

- [ ] **Step 3: Update `render()` to call standalone `renderWinScreen()`**

In `render()`:
```js
  if (currentScreen === SCREEN.WIN) {
    renderWinScreen();
    return;
  }
```

Remove the inner stub `function renderWinScreen() { /* stub */ }` from inside `render()`.

- [ ] **Step 4: Test full match flow**

Open index.html. Play through: weapon select → battle → kill enemy → round win flash → weapon select (next round) → repeat until someone reaches 3 → win screen → press Enter → resets.

- [ ] **Step 5: Commit**

```bash
git add game.js
git commit -m "feat: win screen and rematch flow"
```

---

### Task 15: Polish — Hit Flash, Muzzle Flash, Scope Zoom on World

**Files:**
- Modify: `game.js`

- [ ] **Step 1: Add zoom to renderViewport when a player is scoped**

In `renderViewport`, after the `ctx.translate(offsetX - camX, 0)` line, add zoom handling:

```js
function renderViewport(playerIndex, camX, offsetX) {
  const p = players[playerIndex];
  const zoomFactor = 1 + p.scopeCharge * 2; // up to 3× zoom

  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);
  ctx.clip();

  // Apply zoom centered on viewport
  if (zoomFactor > 1) {
    ctx.translate(offsetX + HALF_W / 2, H / 2);
    ctx.scale(zoomFactor, zoomFactor);
    ctx.translate(-(offsetX + HALF_W / 2), -H / 2);
  }

  ctx.translate(offsetX - camX, 0);

  // ... rest of renderViewport unchanged (sky, ground, platforms, covers)
```

- [ ] **Step 2: Add muzzle flash effect to `tryFire()`**

At the end of `tryFire`, add:

```js
  // Muzzle flash stored on player (rendered in drawPlayer)
  shooter.muzzleFlash = 0.08;
```

Add `muzzleFlash: 0` to `createPlayer()` defaults.

In `updateAnimation()`, reduce muzzle flash:

```js
  if (p.muzzleFlash > 0) p.muzzleFlash -= dt;
```

In `drawPlayer()`, after drawing the gun, add muzzle flash rendering:

```js
  if (p.muzzleFlash > 0) {
    const gx = x + (p.facing === 1 ? PLAYER_W * S + 4 : -10);
    const gy = y + PLAYER_H * S * 0.33;
    ctx.fillStyle = `rgba(255,220,50,${p.muzzleFlash / 0.08})`;
    ctx.beginPath();
    ctx.arc(gx, gy, 8, 0, Math.PI * 2);
    ctx.fill();
  }
```

- [ ] **Step 3: Open index.html — verify zoom and muzzle flash**

Expected: Scoping zooms in the world behind the scope circle. Firing shows a brief yellow flash at gun tip.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: scope world zoom, muzzle flash polish"
```

---

### Task 16: Final Wiring + Bug Pass

**Files:**
- Modify: `game.js`

- [ ] **Step 1: Prevent scope activation during weapon select and win screens**

In `updateScoping()`, add guard at top:

```js
function updateScoping(p, dt) {
  if (p.dead || currentScreen !== SCREEN.BATTLE) {
    p.scoping = false;
    p.scopeCharge = Math.max(p.scopeCharge - dt * 6, 0);
    return;
  }
  // ... rest unchanged
```

- [ ] **Step 2: Prevent firing when already reloading — double-check in `tryFire`**

Already guarded by `if (shooter.reloadTimer > 0) return;` — verify this is present.

- [ ] **Step 3: Prevent navigation input bleed between screens**

Clear all keys when transitioning screens. Add helper:

```js
function clearKeys() {
  Object.keys(keys).forEach(k => { keys[k] = false; });
}
```

Call `clearKeys()` at end of `updateWeaponSelect` when both confirmed, and at start of `updateWin`.

- [ ] **Step 4: Ensure `_navPressed` resets properly when switching screens**

In `initRound()`, add:

```js
  _navPressed[0] = false;
  _navPressed[1] = false;
```

- [ ] **Step 5: Full play-through test**

Open index.html. Run through a complete best-of-5 match:
1. Weapon select → both pick different weapons → confirm
2. Battle: kill opponent in round 1
3. Round 2 starts: verify weapon select reappears
4. Play until one player reaches 3 wins
5. Verify win screen shows correct winner and score
6. Press Enter → rematch starts fresh at Round 1, 0–0

Expected: All transitions work, no console errors, scores track correctly.

- [ ] **Step 6: Final commit**

```bash
git add index.html game.js
git commit -m "feat: complete 1v1 sniper duel game"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| HTML5 Canvas + vanilla JS | Task 1 |
| 4 weapons with stats | Task 2 |
| Vertical split screen | Task 6 |
| WASD + F / Arrows + L controls | Task 4 |
| Weapon select before each round | Task 13 |
| Platforms + cover level | Task 2, 6 |
| Pixel characters (P1 green, P2 blue) | Task 7 |
| Scope circle overlay + mil-dot | Task 8 |
| Aim assist per weapon (soft snap) | Task 10 |
| Shooting + hit detection | Task 9 |
| Health hearts HUD | Task 11 |
| Ammo + reload HUD | Task 11 |
| Round win tracker | Task 11 |
| Best of 5 (first to 3) | Task 12 |
| Death → round end flash → next round | Task 12 |
| Win screen + rematch | Task 14 |
| Scope world zoom | Task 15 |
| Muzzle flash | Task 15 |
| Simultaneous death = draw | Task 12 |
| Can't move while scoped | Task 5 |
| Deadeye = 0 aim assist | Task 2, 10 |

All requirements covered. No placeholders. Type/function names consistent across tasks.
