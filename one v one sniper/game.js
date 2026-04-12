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

// Level — ROOFTOP city map (world coords)
const GROUND_Y = 580; // ground/bottom fallback (should never be reached)

// Building rooftops — CS sniper map style
// P1 spawns far left, P2 spawns far right, long sniping lane across
const PLATFORMS = [
  // === LEFT SIDE (P1 territory) ===
  // Main spawn roof (tall building, P1 spawns here)
  { x: 0,    y: 300, w: 320, h: 16 },
  // Lower ledge on left building
  { x: 60,   y: 380, w: 120, h: 16 },
  // Left mid building (lower)
  { x: 380,  y: 380, w: 260, h: 16 },
  // Left mid building upper floor
  { x: 420,  y: 270, w: 160, h: 16 },

  // === CENTER ===
  // Center bridge / connecting roof
  { x: 700,  y: 340, w: 200, h: 16 },
  // Center upper platform
  { x: 750,  y: 230, w: 100, h: 16 },
  // Center lower gap platform
  { x: 680,  y: 430, w: 80,  h: 16 },

  // === RIGHT SIDE (P2 territory, mirror of left) ===
  // Right mid building lower
  { x: 1160, y: 380, w: 260, h: 16 },
  // Right mid building upper
  { x: 1220, y: 270, w: 160, h: 16 },
  // Right building lower ledge
  { x: 1620, y: 380, w: 120, h: 16 },
  // Main spawn roof right (P2 spawns here)
  { x: 1480, y: 300, w: 320, h: 16 },

  // === FAR EDGES (safety floor) ===
  { x: 0,    y: GROUND_Y, w: WORLD_W, h: 20 },
];

// Cover objects on rooftops: chimneys, AC units, water towers, vents
const COVERS = [
  // === LEFT ROOF covers ===
  { x: 30,   y: 272, w: 28, h: 28 },  // chimney
  { x: 100,  y: 272, w: 44, h: 28 },  // AC unit (wide)
  { x: 220,  y: 272, w: 28, h: 28 },  // chimney
  { x: 280,  y: 260, w: 22, h: 40 },  // water tower base

  // === LEFT MID ROOF covers ===
  { x: 400,  y: 352, w: 30, h: 28 },  // vent
  { x: 480,  y: 352, w: 44, h: 28 },  // AC unit
  { x: 580,  y: 352, w: 24, h: 28 },  // chimney

  // === CENTER covers ===
  { x: 720,  y: 312, w: 30, h: 28 },  // vent
  { x: 820,  y: 312, w: 30, h: 28 },  // vent
  { x: 765,  y: 202, w: 24, h: 28 },  // chimney on upper

  // === RIGHT MID ROOF covers (mirror) ===
  { x: 1200, y: 352, w: 24, h: 28 },  // chimney
  { x: 1276, y: 352, w: 44, h: 28 },  // AC unit
  { x: 1370, y: 352, w: 30, h: 28 },  // vent

  // === RIGHT ROOF covers ===
  { x: 1500, y: 272, w: 28, h: 28 },  // chimney
  { x: 1636, y: 272, w: 44, h: 28 },  // AC unit
  { x: 1750, y: 272, w: 28, h: 28 },  // chimney
];

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
    createPlayer(0, 60,   300 - PLAYER_H * 3),    // P1 on left rooftop
    createPlayer(1, 1680, 300 - PLAYER_H * 3),    // P2 on right rooftop
  ];
  _navPressed[0] = false;
  _navPressed[1] = false;
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
    scopeCharge: 0,
    dead: false,
    facing: index === 0 ? 1 : -1,
    animState: 'idle',
    animFrame: 0,
    animTimer: 0,
    hitFlash: 0,
    muzzleFlash: 0,
    _assistOffset: 0,
  };
}

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
function navUp(p)      { return p.index === 0 ? keys['KeyW']   : keys['ArrowUp'];   }
function navDown(p)    { return p.index === 0 ? keys['KeyS']   : keys['ArrowDown']; }
function confirmKey(p) { return p.index === 0 ? keys['KeyF']   : keys['KeyL'];      }
function clearKeys() { Object.keys(keys).forEach(k => { keys[k] = false; }); }

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
    if (isLeft(p))       { p.vx = -MOVE_SPEED; p.facing = -1; }
    else if (isRight(p)) { p.vx = MOVE_SPEED;  p.facing =  1; }
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
      const prevBottom = p.y + ph - p.vy * dt;
      if (prevBottom <= tile.y + 2 && p.vy >= 0) {
        p.y = tile.y - ph;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
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
  if (p.dead || currentScreen !== SCREEN.BATTLE) {
    p.scoping = false;
    p.scopeCharge = Math.max(p.scopeCharge - dt * 6, 0);
    return;
  }
  if (isScope(p)) {
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
      if (p.ammo === 0) p.ammo = 1;
    }
  }
}

function updateHitFlash(p, dt) {
  if (p.hitFlash > 0) p.hitFlash -= dt;
}

function updateAnimation(p, dt) {
  p.animTimer += dt;
  if (p.muzzleFlash > 0) p.muzzleFlash -= dt;

  if (p.dead)    { p.animState = 'dead';  return; }
  if (p.scoping) { p.animState = 'scope'; return; }
  if (!p.onGround) { p.animState = 'jump'; return; }
  if (p.vx !== 0) {
    p.animState = 'run';
    if (p.animTimer > 0.12) { p.animFrame++; p.animTimer = 0; }
    return;
  }
  p.animState = 'idle';
  p.animFrame = 0;
}

function updateAimAssist(p, enemy) {
  p._assistOffset = 0;
  if (!p.scoping || p.scopeCharge < 0.8) return;
  if (enemy.dead) return;

  const r = p.weapon.assistRadius;
  if (r === 0) return;

  const S = 3;
  const ex = enemy.x + PLAYER_W * S / 2;
  const px = p.x + PLAYER_W * S / 2;
  const rawOffset = ex - px;
  const dist = Math.abs(rawOffset);

  if (dist < r * 8) {
    const t = Math.max(0, 1 - dist / (r * 8));
    p._assistOffset = rawOffset * t * 0.7;
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

function tryFire(shooter, target) {
  if (shooter.dead) return;
  if (shooter.ammo <= 0) return;
  if (shooter.reloadTimer > 0) return;

  shooter.ammo--;
  shooter.reloadTimer = shooter.weapon.reloadTime;
  shooter.scoping = false;
  shooter.scopeCharge = 0;
  shooter.muzzleFlash = 0.08;

  const S = 3;
  const bx = shooter.x + PLAYER_W * S / 2 + shooter.facing * PLAYER_W * S * 0.6;
  const by = shooter.y + PLAYER_H * S * 0.35;

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
    life: 2,
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
        checkSimultaneousDeath();
        b.life = 0;
      }
    }

    // Bullet blocked by cover/platform
    for (const tile of [...PLATFORMS, ...COVERS]) {
      if (rectOverlap(b.x - 2, b.y - 2, 4, 4, tile.x, tile.y, tile.w, tile.h)) {
        b.life = 0;
      }
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].life <= 0) bullets.splice(i, 1);
  }
}
function onPlayerDied(deadPlayer) {
  const winnerIndex = 1 - deadPlayer.index;
  roundWins[winnerIndex]++;
  roundMsg = `P${winnerIndex + 1} WINS ROUND ${currentRound}!`;
  roundMsgTimer = 2.0;
  currentRound++;

  if (roundWins[winnerIndex] >= 3) {
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
  currentScreen = SCREEN.WEAPON_SELECT;
}

function checkSimultaneousDeath() {
  if (!players.every(p => p.dead)) return;
  // Undo the round win just awarded
  const lastWinner = roundWins[0] > roundWins[1] ? 0 : 1;
  roundWins[lastWinner]--;
  currentRound--;
  roundMsg = 'DRAW — REPLAY ROUND';
  roundMsgTimer = 2.0;
  winner = -1;
}
function updateWeaponSelect(_dt) {
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
    clearKeys();
    initRound();
    currentScreen = SCREEN.BATTLE;
  }
}
function updateWin(_dt) {
  if (keys['Enter']) {
    roundWins[0] = 0;
    roundWins[1] = 0;
    currentRound = 1;
    winner = -1;
    currentScreen = SCREEN.WEAPON_SELECT;
    initRound();
    clearKeys();
  }
  if (keys['Escape']) {
    roundWins[0] = 0;
    roundWins[1] = 0;
    currentRound = 1;
    winner = -1;
    currentScreen = SCREEN.WEAPON_SELECT;
    initRound();
    clearKeys();
  }
}

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
  const p = players[playerIndex];
  const zoomFactor = 1 + p.scopeCharge * 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);
  ctx.clip();

  if (zoomFactor > 1) {
    ctx.translate(offsetX + HALF_W / 2, H / 2);
    ctx.scale(zoomFactor, zoomFactor);
    ctx.translate(-(offsetX + HALF_W / 2), -H / 2);
  }

  ctx.translate(offsetX - camX, 0);

  // Night sky
  const sky = ctx.createLinearGradient(camX, 0, camX, H);
  sky.addColorStop(0, '#050810');
  sky.addColorStop(1, '#0d1525');
  ctx.fillStyle = sky;
  ctx.fillRect(camX, 0, HALF_W, H);

  // Distant city skyline (background buildings, decorative)
  ctx.fillStyle = '#0d1820';
  const bgBuildings = [
    { x: 100, w: 80,  h: 200 },
    { x: 250, w: 60,  h: 280 },
    { x: 380, w: 100, h: 220 },
    { x: 540, w: 70,  h: 310 },
    { x: 680, w: 90,  h: 180 },
    { x: 820, w: 120, h: 260 },
    { x: 1000,w: 80,  h: 300 },
    { x: 1150,w: 60,  h: 200 },
    { x: 1280,w: 100, h: 240 },
    { x: 1450,w: 70,  h: 280 },
    { x: 1600,w: 90,  h: 210 },
    { x: 1760,w: 80,  h: 260 },
    { x: 1900,w: 110, h: 290 },
    { x: 2080,w: 70,  h: 200 },
    { x: 2200,w: 80,  h: 250 },
  ];
  for (const b of bgBuildings) {
    ctx.fillRect(b.x, H - b.h, b.w, b.h);
    // Building windows (dots)
    ctx.fillStyle = 'rgba(255,220,80,0.15)';
    for (let wy = H - b.h + 20; wy < H - 10; wy += 20) {
      for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 14) {
        if (Math.random() > 0.4) ctx.fillRect(wx, wy, 6, 8);
      }
    }
    ctx.fillStyle = '#0d1820';
  }
  ctx.fillStyle = '#0d1820';

  // Bottom fallback ground (very dark, rarely seen)
  ctx.fillStyle = '#080c10';
  ctx.fillRect(0, GROUND_Y, WORLD_W, H - GROUND_Y);

  // Rooftop buildings — main platforms
  for (const plat of PLATFORMS) {
    if (plat.y >= GROUND_Y) continue; // skip fallback ground
    // Building face (below rooftop going to bottom)
    ctx.fillStyle = '#151e2a';
    ctx.fillRect(plat.x, plat.y + plat.h, plat.w, H - plat.y - plat.h);
    // Rooftop surface
    ctx.fillStyle = '#1e2d3d';
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    // Rooftop edge highlight
    ctx.fillStyle = '#2a3f55';
    ctx.fillRect(plat.x, plat.y, plat.w, 3);
    // Building windows (on face below rooftop)
    ctx.fillStyle = 'rgba(255,200,80,0.12)';
    for (let wy = plat.y + plat.h + 15; wy < H - 30; wy += 24) {
      for (let wx = plat.x + 10; wx < plat.x + plat.w - 10; wx += 18) {
        ctx.fillRect(wx, wy, 8, 10);
      }
    }
  }

  // Cover objects — chimneys, AC units, vents
  for (const c of COVERS) {
    // Main body
    ctx.fillStyle = '#263545';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    // Top highlight
    ctx.fillStyle = '#344a60';
    ctx.fillRect(c.x, c.y, c.w, 4);
    // Side shadow
    ctx.fillStyle = '#1a2535';
    ctx.fillRect(c.x + c.w - 4, c.y + 4, 4, c.h - 4);
    // Detail: ventilation slats or cap
    if (c.w > 35) {
      // AC unit: add fan grill detail
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let sx = c.x + 4; sx < c.x + c.w - 4; sx += 8) {
        ctx.fillRect(sx, c.y + 6, 3, c.h - 10);
      }
    } else {
      // Chimney cap
      ctx.fillStyle = '#1a2535';
      ctx.fillRect(c.x - 2, c.y - 3, c.w + 4, 5);
    }
  }

  ctx.restore();
}

function drawBullet(b) {
  ctx.fillStyle = b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 8;
  ctx.fillRect(b.x - 3, b.y - 2, 6, 4);
  ctx.shadowBlur = 0;
}
function drawPlayer(p, _viewportIndex) {
  const S = 3;
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const flash = p.hitFlash > 0;

  const P1_PALETTE = {
    head:   flash ? '#ff6666' : '#c8a060',
    helmet: flash ? '#ff3333' : '#2a4a2a',
    body:   flash ? '#ff5555' : '#2a7a2a',
    legs:   flash ? '#ff4444' : '#1a4a1a',
    boots:  '#111',
    gun:    '#3a3a3a',
    scope:  '#1a1a1a',
  };
  const P2_PALETTE = {
    head:   flash ? '#ff6666' : '#c8a060',
    helmet: flash ? '#ff3333' : '#1a3a5a',
    body:   flash ? '#ff5555' : '#1a4a9a',
    legs:   flash ? '#ff4444' : '#0a2a6a',
    boots:  '#111',
    gun:    '#3a3a3a',
    scope:  '#1a1a1a',
  };

  const pal = p.index === 0 ? P1_PALETTE : P2_PALETTE;

  // Helper: draw a logical-pixel rect, flipped based on facing direction
  function px(lx, ly, lw, lh, color) {
    ctx.fillStyle = color;
    const rx = p.facing === 1 ? lx : (PLAYER_W - lx - lw);
    ctx.fillRect(x + rx * S, y + ly * S, lw * S, lh * S);
  }

  // Dead — flat on ground
  if (p.dead) {
    ctx.fillStyle = pal.body;
    ctx.fillRect(x, y + PLAYER_H * S - S * 6, PLAYER_W * S, S * 6);
    ctx.fillStyle = pal.head;
    const hx = p.facing === 1 ? x + PLAYER_W * S - S * 5 : x;
    ctx.fillRect(hx, y + PLAYER_H * S - S * 6, S * 5, S * 5);
    return;
  }

  // Scoping — crouched pose
  if (p.animState === 'scope') {
    px(4, 10, 8, 6, pal.head);
    px(3,  7, 10, 5, pal.helmet);
    px(3, 16, 10, 10, pal.body);
    // Gun extended in facing direction
    ctx.fillStyle = pal.gun;
    ctx.fillRect(x + (p.facing === 1 ? 10 * S : (PLAYER_W - 10 - 14) * S), y + 14 * S, 14 * S, 3 * S);
    ctx.fillStyle = pal.scope;
    ctx.fillRect(x + (p.facing === 1 ? 21 * S : (PLAYER_W - 21 - 4) * S), y + 13 * S, 4 * S, 5 * S);
    px(3, 26, 4, 6, pal.legs);
    px(9, 26, 4, 6, pal.legs);
    px(2, 30, 5, 2, pal.boots);
    px(9, 30, 5, 2, pal.boots);
    return;
  }

  // Standing / running / jumping
  const bob = (p.animState === 'run') ? (p.animFrame % 2 === 0 ? 0 : 1) : 0;

  px(4, 0 + bob, 8, 6, pal.head);
  px(3, bob - 2, 10, 4, pal.helmet);
  px(3, 6 + bob, 10, 12, pal.body);

  // Gun
  ctx.fillStyle = pal.gun;
  ctx.fillRect(x + (p.facing === 1 ? 11 * S : (PLAYER_W - 11 - 10) * S), y + (8 + bob) * S, 10 * S, 3 * S);
  ctx.fillStyle = pal.scope;
  ctx.fillRect(x + (p.facing === 1 ? 19 * S : (PLAYER_W - 19 - 3) * S), y + (7 + bob) * S, 3 * S, 5 * S);

  // Legs
  if (p.animState === 'jump') {
    px(3, 18 + bob, 4, 10, pal.legs);
    px(9, 20 + bob, 4, 8,  pal.legs);
  } else if (p.animState === 'run' && p.animFrame % 2 === 0) {
    px(3, 18, 4, 8,  pal.legs);
    px(9, 20, 4, 10, pal.legs);
  } else {
    px(3, 18 + bob, 4, 10, pal.legs);
    px(9, 18 + bob, 4, 10, pal.legs);
  }

  // Boots
  px(2, 28 + bob, 5, 4, pal.boots);
  px(9, 28 + bob, 5, 4, pal.boots);

  // Muzzle flash
  if (p.muzzleFlash > 0) {
    const gx = x + (p.facing === 1 ? PLAYER_W * S + 4 : -10);
    const gy = y + PLAYER_H * S * 0.33;
    ctx.fillStyle = `rgba(255,220,50,${p.muzzleFlash / 0.08})`;
    ctx.beginPath();
    ctx.arc(gx, gy, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}
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
    ? `RELOADING ${p.reloadTimer.toFixed(1)}s`
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
    const p1x = vcx - 8 - (3 - i) * (sq + gap);
    ctx.fillStyle = i < roundWins[0] ? '#4aff4a' : '#222';
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.fillRect(p1x, 22, sq, sq);
    ctx.strokeRect(p1x, 22, sq, sq);

    const p2x = vcx + 8 + i * (sq + gap);
    ctx.fillStyle = i < roundWins[1] ? '#4aaaff' : '#222';
    ctx.fillRect(p2x, 22, sq, sq);
    ctx.strokeRect(p2x, 22, sq, sq);
  }

  ctx.restore();
}
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

  // Draw black OUTSIDE the circle using evenodd — world stays visible inside
  ctx.fillStyle = `rgba(0,0,0,${0.92 * charge})`;
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);           // outer rectangle
  ctx.arc(cx, cy, r, 0, Math.PI * 2, true);  // circle (counterclockwise = hole)
  ctx.fill('evenodd');

  // Scope border ring
  ctx.strokeStyle = `rgba(180,180,180,${charge})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Mil-dot reticle (only when mostly charged)
  if (charge > 0.8) {
    const alpha = (charge - 0.8) / 0.2;
    ctx.strokeStyle = `rgba(220,50,50,${alpha})`;
    ctx.lineWidth = 1;

    // Crosshair lines (clipped to circle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Mil dots
    ctx.fillStyle = `rgba(220,50,50,${alpha})`;
    for (const [dx, dy] of [[-r * 0.4, 0], [r * 0.4, 0], [0, -r * 0.4], [0, r * 0.4]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center gap
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(cx - 5, cy - 1, 10, 2);
    ctx.fillRect(cx - 1, cy - 5, 2, 10);

    ctx.restore();
  }

  ctx.restore();
}

function drawGunBarrel(p, offsetX, cam) {
  if (p.dead) return;
  ctx.save();
  ctx.translate(cam - offsetX, 0); // undo world translate to get back to screen space
  const bx = offsetX + HALF_W / 2;
  const gunColor = p.scoping ? '#555' : '#3a3a3a';
  const barrelH = p.scoping ? H * 0.18 : H * 0.25;
  const barrelW = p.scoping ? 8 : 12;

  ctx.fillStyle = gunColor;
  ctx.fillRect(bx - barrelW / 2, H - barrelH, barrelW, barrelH);

  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(bx - 20, H - barrelH * 0.6, 40, barrelH * 0.5);

  if (p.scoping || p.scopeCharge > 0) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx - 8, H - barrelH * 0.75, 16, 8);
  }

  if (p.muzzleFlash > 0) {
    ctx.fillStyle = `rgba(255,220,50,${p.muzzleFlash / 0.08})`;
    ctx.beginPath();
    ctx.arc(bx, H - barrelH, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function renderWeaponSelect() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

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

    ctx.strokeStyle = confirmed[i] ? color : '#333';
    ctx.lineWidth = confirmed[i] ? 2 : 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PLAYER ${i + 1}`, panelX + 12, panelY + 24);

    ctx.fillStyle = '#444';
    ctx.font = '10px monospace';
    ctx.fillText(controls, panelX + 12, panelY + 42);

    WEAPON_KEYS.forEach((key, idx) => {
      const w = WEAPONS[key];
      const wy = panelY + 65 + idx * 65;
      const selected = selection[i] === idx;

      ctx.fillStyle = selected ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.3)';
      ctx.fillRect(panelX + 8, wy - 2, panelW - 16, 56);

      if (selected) {
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX + 8, wy - 2, panelW - 16, 56);
      }

      ctx.fillStyle = w.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText((key === 'DEADEYE' ? '💀 ' : '🔫 ') + w.name, panelX + 18, wy + 18);

      const barW = 100;
      const speedFrac = 1 - (w.reloadTime / 5.0);
      const dmgFrac = w.damage / 100;
      const assistFrac = w.assistRadius / 30;

      drawStatBar(panelX + 18, wy + 28, barW, 'SPD', speedFrac, '#88ff88');
      drawStatBar(panelX + 18 + barW + 20, wy + 28, barW, 'DMG', dmgFrac, '#ff8888');
      drawStatBar(panelX + 18 + (barW + 20) * 2, wy + 28, barW, 'AIM', assistFrac, '#88aaff');
    });

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

  // Round win tracker
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

function drawStatBar(x, y, w, label, frac, color) {
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
function renderWinScreen() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);

  const winnerColor = winner === 0 ? '#4aff4a' : '#4aaaff';

  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`PLAYER ${winner + 1}`, W / 2, H / 2 - 40);

  ctx.fillStyle = winnerColor;
  ctx.font = 'bold 28px monospace';
  ctx.fillText('WINS THE MATCH', W / 2, H / 2 + 10);

  ctx.fillStyle = '#555';
  ctx.font = '14px monospace';
  ctx.fillText(`${roundWins[0]} — ${roundWins[1]}`, W / 2, H / 2 + 50);

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

  // Draw players and bullets in each viewport
  for (let vp = 0; vp < 2; vp++) {
    const cam = vp === 0 ? cam0 : cam1;
    const offsetX = vp * HALF_W;
    ctx.save();
    ctx.beginPath();
    ctx.rect(offsetX, 0, HALF_W, H);
    ctx.clip();
    ctx.translate(offsetX - cam, 0);
    for (const p of players) {
      if (p.index === vp) continue; // first-person: don't draw yourself
      drawPlayer(p, vp);
    }
    for (const b of bullets) {
      drawBullet(b);
    }
    // First-person gun barrel
    drawGunBarrel(players[vp], offsetX, cam);
    ctx.restore();
  }

  // HUD (screen-space, after world)
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

  // Divider line
  ctx.fillStyle = '#222';
  ctx.fillRect(HALF_W - 1, 0, 2, H);
}

// ============================================================
// SECTION 7: GAME LOOP
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

initRound();
requestAnimationFrame(loop);
