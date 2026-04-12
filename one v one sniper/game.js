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

const GRAVITY      = 900;
const JUMP_VEL     = -420;
const MOVE_SPEED   = 200;
const WORLD_W      = 1100;
const WORLD_H      = H;
const PLAYER_W     = 16;
const PLAYER_H     = 32;

const WEAPONS = {
  SCOUT:   { name: 'SCOUT',   damage: 34,  reloadTime: 0.8, ammo: 10, assistRadius: 30, color: '#88ff88' },
  KRIEG:   { name: 'KRIEG',   damage: 55,  reloadTime: 1.5, ammo: 6,  assistRadius: 18, color: '#ffaa44' },
  AWP:     { name: 'AWP',     damage: 85,  reloadTime: 3.0, ammo: 4,  assistRadius: 8,  color: '#ff8888' },
  DEADEYE: { name: 'DEADEYE', damage: 100, reloadTime: 5.0, ammo: 2,  assistRadius: 0,  color: '#ff4444' },
};
const WEAPON_KEYS = ['SCOUT', 'KRIEG', 'AWP', 'DEADEYE'];

const SCREEN = { WEAPON_SELECT: 'WEAPON_SELECT', BATTLE: 'BATTLE', WIN: 'WIN' };

// ── Building layout ──────────────────────────────────────────
const TOP_Y    = 190;   // top floor surface y
const BOT_Y    = 420;   // bottom floor surface y
const ATR_X    = 460;   // atrium gap start x
const ATR_W    = 130;   // atrium gap width (460–590)
const FLOOR_H  = 16;    // floor slab thickness

// Two-floor building — each floor split left / right around the atrium
const PLATFORMS = [
  { x: 0,           y: TOP_Y, w: ATR_X,              h: FLOOR_H },  // top-left
  { x: ATR_X+ATR_W, y: TOP_Y, w: WORLD_W-ATR_X-ATR_W, h: FLOOR_H }, // top-right
  { x: 0,           y: BOT_Y, w: ATR_X,              h: FLOOR_H },  // bot-left
  { x: ATR_X+ATR_W, y: BOT_Y, w: WORLD_W-ATR_X-ATR_W, h: FLOOR_H }, // bot-right
  { x: 0,           y: 572,   w: WORLD_W,            h: 28 },       // safety ground
];

// Crates / boxes on each floor section
const COVERS = [
  // top-left
  { x: 50,  y: TOP_Y-32, w: 48, h: 32 },
  { x: 180, y: TOP_Y-32, w: 48, h: 32 },
  { x: 340, y: TOP_Y-32, w: 48, h: 32 },
  { x: 400, y: TOP_Y-32, w: 48, h: 32 },
  // top-right
  { x: ATR_X+ATR_W+10,  y: TOP_Y-32, w: 48, h: 32 },
  { x: ATR_X+ATR_W+120, y: TOP_Y-32, w: 48, h: 32 },
  { x: ATR_X+ATR_W+260, y: TOP_Y-32, w: 48, h: 32 },
  { x: ATR_X+ATR_W+390, y: TOP_Y-32, w: 48, h: 32 },
  // bot-left
  { x: 50,  y: BOT_Y-32, w: 48, h: 32 },
  { x: 180, y: BOT_Y-32, w: 48, h: 32 },
  { x: 340, y: BOT_Y-32, w: 48, h: 32 },
  { x: 400, y: BOT_Y-32, w: 48, h: 32 },
  // bot-right
  { x: ATR_X+ATR_W+10,  y: BOT_Y-32, w: 48, h: 32 },
  { x: ATR_X+ATR_W+120, y: BOT_Y-32, w: 48, h: 32 },
  { x: ATR_X+ATR_W+260, y: BOT_Y-32, w: 48, h: 32 },
  { x: ATR_X+ATR_W+390, y: BOT_Y-32, w: 48, h: 32 },
];

// ============================================================
// SECTION 3: STATE
// ============================================================

const roundWins = [0, 0];
let currentRound  = 1;
let currentScreen = SCREEN.WEAPON_SELECT;
let winner = -1;

const selection = [0, 0];
const confirmed = [false, false];

let players = [];
let bullets  = [];
let roundMsg      = '';
let roundMsgTimer = 0;

// Track which floor each player is on this round (for HUD label)
let floorLabel = ['', ''];

function initRound() {
  confirmed[0] = false;
  confirmed[1] = false;
  selection[0] = 0;
  selection[1] = 0;
  bullets       = [];
  roundMsg      = '';
  roundMsgTimer = 0;

  // Randomize: 50/50 who starts on top floor
  const p1OnTop = Math.random() < 0.5;
  const p0y = (p1OnTop ? TOP_Y : BOT_Y) - PLAYER_H * 3;
  const p1y = (p1OnTop ? BOT_Y : TOP_Y) - PLAYER_H * 3;

  floorLabel[0] = p1OnTop ? 'TOP FLOOR'    : 'BOTTOM FLOOR';
  floorLabel[1] = p1OnTop ? 'BOTTOM FLOOR' : 'TOP FLOOR';

  players = [
    createPlayer(0, 80,          p0y),
    createPlayer(1, WORLD_W-150, p1y),
  ];
  _navPressed[0] = false;
  _navPressed[1] = false;
}

function createPlayer(index, x, y) {
  const weaponKey = WEAPON_KEYS[selection[index]];
  const weapon    = WEAPONS[weaponKey];
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
// SECTION 4: HIT SPEECH
// ============================================================

const HIT_QUIPS = ['Ouch!', 'Uff!', 'Whoopsie!', 'Got em!', 'Headshot!', 'Yeow!', 'Take that!'];

let _hitVoice = null;
function _loadHitVoice() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return;
  _hitVoice =
    voices.find(v => v.name === 'Google US English') ||
    voices.find(v => v.name === 'Samantha') ||
    voices.find(v => v.name === 'Alex') ||
    voices.find(v => /en/i.test(v.lang)) ||
    voices[0];
}
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = _loadHitVoice;
  _loadHitVoice();
}

function speakHit() {
  if (!window.speechSynthesis) return;
  if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
  const text = HIT_QUIPS[Math.floor(Math.random() * HIT_QUIPS.length)];
  const utt  = new SpeechSynthesisUtterance(text);
  utt.pitch  = 0.95 + Math.random() * 0.4;
  utt.rate   = 1.05 + Math.random() * 0.25;
  utt.volume = 1.0;
  if (_hitVoice) utt.voice = _hitVoice;
  window.speechSynthesis.speak(utt);
}

// ============================================================
// SECTION 5: INPUT
// ============================================================

const keys = {};

window.addEventListener('keydown', e => { keys[e.code] = true;  e.preventDefault(); });
window.addEventListener('keyup',   e => {
  keys[e.code] = false;
  if (e.code === 'KeyF' && players[0] && players[0].scoping && !players[0].dead)
    tryFire(players[0], players[1]);
  if (e.code === 'KeyL' && players[1] && players[1].scoping && !players[1].dead)
    tryFire(players[1], players[0]);
});

function isLeft(p)  { return p.index === 0 ? keys['KeyA']   : keys['ArrowLeft'];  }
function isRight(p) { return p.index === 0 ? keys['KeyD']   : keys['ArrowRight']; }
function isJump(p)  { return p.index === 0 ? keys['KeyW']   : keys['ArrowUp'];    }
function isScope(p) { return p.index === 0 ? keys['KeyF']   : keys['KeyL'];       }

const _navPressed = [false, false];
function navUp(p)      { return p.index === 0 ? keys['KeyW'] : keys['ArrowUp'];   }
function navDown(p)    { return p.index === 0 ? keys['KeyS'] : keys['ArrowDown']; }
function confirmKey(p) { return p.index === 0 ? keys['KeyF'] : keys['KeyL'];      }
function clearKeys()   { Object.keys(keys).forEach(k => { keys[k] = false; }); }

// ============================================================
// SECTION 6: PHYSICS
// ============================================================

function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function applyPhysics(p, dt) {
  if (p.dead) return;
  const pw = PLAYER_W * 3;
  const ph = PLAYER_H * 3;

  if (!p.scoping) {
    if (isLeft(p))       { p.vx = -MOVE_SPEED; p.facing = -1; }
    else if (isRight(p)) { p.vx =  MOVE_SPEED; p.facing =  1; }
    else p.vx = 0;
  } else { p.vx = 0; }

  p.vy += GRAVITY * dt;
  p.x  += p.vx * dt;
  p.x   = Math.max(0, Math.min(WORLD_W - pw, p.x));
  p.y  += p.vy * dt;

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

  if (isJump(p) && p.onGround) { p.vy = JUMP_VEL; p.onGround = false; }
  if (p.y + ph > WORLD_H) { p.y = WORLD_H - ph; p.vy = 0; p.onGround = true; }
}

function updateScoping(p, dt) {
  if (p.dead || currentScreen !== SCREEN.BATTLE) {
    p.scoping = false;
    p.scopeCharge = Math.max(p.scopeCharge - dt * 6, 0);
    return;
  }
  if (isScope(p)) { p.scoping = true;  p.scopeCharge = Math.min(p.scopeCharge + dt * 3, 1); }
  else            { p.scoping = false; p.scopeCharge = Math.max(p.scopeCharge - dt * 6, 0); }
}

function updateReload(p, dt) {
  if (p.reloadTimer > 0) {
    p.reloadTimer -= dt;
    if (p.reloadTimer <= 0) { p.reloadTimer = 0; if (p.ammo === 0) p.ammo = 1; }
  }
}

function updateHitFlash(p, dt)    { if (p.hitFlash > 0) p.hitFlash -= dt; }

function updateAnimation(p, dt) {
  p.animTimer += dt;
  if (p.muzzleFlash > 0) p.muzzleFlash -= dt;
  if (p.dead)      { p.animState = 'dead';  return; }
  if (p.scoping)   { p.animState = 'scope'; return; }
  if (!p.onGround) { p.animState = 'jump';  return; }
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
  if (!p.scoping || p.scopeCharge < 0.8 || enemy.dead) return;
  const r = p.weapon.assistRadius;
  if (r === 0) return;
  const S = 3;
  const rawOffset = (enemy.x + PLAYER_W * S / 2) - (p.x + PLAYER_W * S / 2);
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
  speakHit();
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    p.animState = 'dead';
    onPlayerDied(p);
  }
}

function tryFire(shooter, target) {
  if (shooter.dead || shooter.ammo <= 0 || shooter.reloadTimer > 0) return;
  shooter.ammo--;
  shooter.reloadTimer  = shooter.weapon.reloadTime;
  shooter.scoping      = false;
  shooter.scopeCharge  = 0;
  shooter.muzzleFlash  = 0.08;

  const S  = 3;
  const bx = shooter.x + PLAYER_W * S / 2 + shooter.facing * PLAYER_W * S * 0.6;
  const by = shooter.y + PLAYER_H * S * 0.35;
  const tx = target.x  + PLAYER_W * S / 2 + shooter._assistOffset;
  const ty = target.y  + PLAYER_H * S / 2;
  const dx = tx - bx, dy = ty - by;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
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
      if (rectOverlap(b.x-4, b.y-4, 8, 8, target.x, target.y, PLAYER_W*S, PLAYER_H*S)) {
        applyDamage(target, b.damage);
        checkSimultaneousDeath();
        b.life = 0;
      }
    }
    for (const tile of [...PLATFORMS, ...COVERS]) {
      if (rectOverlap(b.x-2, b.y-2, 4, 4, tile.x, tile.y, tile.w, tile.h)) b.life = 0;
    }
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].life <= 0) bullets.splice(i, 1);
  }
}

function onPlayerDied(deadPlayer) {
  const wi = 1 - deadPlayer.index;
  roundWins[wi]++;
  roundMsg      = `P${wi+1} WINS ROUND ${currentRound}!`;
  roundMsgTimer = 2.0;
  currentRound++;
  if (roundWins[wi] >= 3) { roundMsg = `P${wi+1} WINS THE MATCH!`; roundMsgTimer = 2.5; winner = wi; }
}

function endRoundTransition() {
  if (winner >= 0) { currentScreen = SCREEN.WIN; return; }
  currentScreen = SCREEN.WEAPON_SELECT;
}

function checkSimultaneousDeath() {
  if (!players.every(p => p.dead)) return;
  const lw = roundWins[0] > roundWins[1] ? 0 : 1;
  roundWins[lw]--;
  currentRound--;
  roundMsg      = 'DRAW — REPLAY ROUND';
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
    if (confirmKey(fakeP)) confirmed[i] = true;
  }
  if (confirmed[0] && confirmed[1]) { clearKeys(); initRound(); currentScreen = SCREEN.BATTLE; }
}

function updateWin(_dt) {
  if (keys['Enter'] || keys['Escape']) {
    roundWins[0] = 0; roundWins[1] = 0;
    currentRound = 1; winner = -1;
    currentScreen = SCREEN.WEAPON_SELECT;
    initRound(); clearKeys();
  }
}

// ============================================================
// SECTION 7: RENDERING
// ============================================================

function getCameraX(p) {
  const pw = PLAYER_W * 3;
  let cx = p.x + pw / 2 - HALF_W / 2;
  return Math.max(0, Math.min(WORLD_W - HALF_W, cx));
}

// ── Building interior renderer ───────────────────────────────
function renderViewport(playerIndex, camX, offsetX) {
  const p          = players[playerIndex];
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

  // ── Background wall ──
  ctx.fillStyle = '#16161e';
  ctx.fillRect(camX, 0, HALF_W + 1, H);

  // Brick pattern on background wall
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let wy = 20; wy < H; wy += 24) {
    const offset = (Math.floor(wy / 24) % 2) * 30;
    for (let wx = camX - 30 + offset; wx < camX + HALF_W + 60; wx += 60) {
      ctx.strokeRect(wx, wy, 58, 22);
    }
  }

  // ── Ceiling ──
  ctx.fillStyle = '#0e0e14';
  ctx.fillRect(camX, 0, HALF_W + 1, 55);
  ctx.fillStyle = '#1e1e28';
  ctx.fillRect(camX, 53, HALF_W + 1, 4);

  // Ceiling light fixtures
  for (let lx = 100; lx < WORLD_W; lx += 180) {
    if (lx < camX - 60 || lx > camX + HALF_W + 60) continue;
    ctx.fillStyle = '#2a2a38';
    ctx.fillRect(lx - 18, 48, 36, 10);
    ctx.fillStyle = 'rgba(255,230,140,0.9)';
    ctx.fillRect(lx - 12, 55, 24, 5);
    // Light cone
    const lg = ctx.createRadialGradient(lx, 62, 0, lx, 62, 90);
    lg.addColorStop(0,   'rgba(255,230,140,0.12)');
    lg.addColorStop(1,   'rgba(255,230,140,0)');
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(lx, 62, 90, 0, Math.PI * 2); ctx.fill();
  }

  // ── Below bottom floor (basement / concrete) ──
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(camX, BOT_Y + FLOOR_H, HALF_W + 1, H - BOT_Y - FLOOR_H);
  ctx.fillStyle = '#181820';
  ctx.fillRect(camX, 570, HALF_W + 1, 4);

  // ── Inter-floor wall (left + right sections, not the atrium) ──
  // The wall area between TOP_Y+FLOOR_H and BOT_Y on the non-atrium columns
  ctx.fillStyle = '#13131a';
  ctx.fillRect(0,           TOP_Y + FLOOR_H, ATR_X,              BOT_Y - TOP_Y - FLOOR_H);
  ctx.fillRect(ATR_X+ATR_W, TOP_Y + FLOOR_H, WORLD_W-ATR_X-ATR_W, BOT_Y - TOP_Y - FLOOR_H);
  // Subtle brick in wall section
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  for (let wy = TOP_Y + FLOOR_H + 10; wy < BOT_Y - 10; wy += 22) {
    const off = (Math.floor(wy / 22) % 2) * 25;
    for (let wx = off; wx < ATR_X; wx += 50) ctx.strokeRect(wx, wy, 48, 20);
    for (let wx = ATR_X+ATR_W+off; wx < WORLD_W; wx += 50) ctx.strokeRect(wx, wy, 48, 20);
  }

  // ── Atrium shaft (open air between floors) ──
  const atrGrad = ctx.createLinearGradient(ATR_X, TOP_Y + FLOOR_H, ATR_X, BOT_Y);
  atrGrad.addColorStop(0,   'rgba(255,200,80,0.08)');
  atrGrad.addColorStop(0.5, 'rgba(255,180,60,0.04)');
  atrGrad.addColorStop(1,   'rgba(255,200,80,0.08)');
  ctx.fillStyle = atrGrad;
  ctx.fillRect(ATR_X, TOP_Y + FLOOR_H, ATR_W, BOT_Y - TOP_Y - FLOOR_H);

  // Atrium side shafts (faint vertical highlight)
  ctx.strokeStyle = 'rgba(200,160,40,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ATR_X,        TOP_Y + FLOOR_H); ctx.lineTo(ATR_X,        BOT_Y);
  ctx.moveTo(ATR_X+ATR_W,  TOP_Y + FLOOR_H); ctx.lineTo(ATR_X+ATR_W,  BOT_Y);
  ctx.stroke();

  // ── Floor slabs ──
  for (const fy of [TOP_Y, BOT_Y]) {
    // Left section
    ctx.fillStyle = '#2e2010';
    ctx.fillRect(0, fy, ATR_X, FLOOR_H);
    ctx.fillStyle = '#3e2e18';
    ctx.fillRect(0, fy, ATR_X, 3);           // highlight
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, fy + FLOOR_H - 2, ATR_X, 2); // shadow
    // Plank lines
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let px = 0; px < ATR_X; px += 36) {
      ctx.beginPath(); ctx.moveTo(px, fy); ctx.lineTo(px, fy + FLOOR_H); ctx.stroke();
    }

    // Right section
    const rx = ATR_X + ATR_W;
    ctx.fillStyle = '#2e2010';
    ctx.fillRect(rx, fy, WORLD_W - rx, FLOOR_H);
    ctx.fillStyle = '#3e2e18';
    ctx.fillRect(rx, fy, WORLD_W - rx, 3);
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(rx, fy + FLOOR_H - 2, WORLD_W - rx, 2);
    for (let px = rx; px < WORLD_W; px += 36) {
      ctx.beginPath(); ctx.moveTo(px, fy); ctx.lineTo(px, fy + FLOOR_H); ctx.stroke();
    }

    // Atrium railing posts at floor edges
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(ATR_X - 5, fy - 18, 6, 22);
    ctx.fillRect(ATR_X + ATR_W - 1, fy - 18, 6, 22);
    // Rail cap
    ctx.fillStyle = '#a07c20';
    ctx.fillRect(ATR_X - 8, fy - 20, 12, 4);
    ctx.fillRect(ATR_X + ATR_W - 4, fy - 20, 12, 4);
    // Chain / rope suggestion
    ctx.strokeStyle = 'rgba(160,120,30,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ATR_X - 2, fy - 10);
    ctx.quadraticCurveTo(ATR_X + ATR_W / 2, fy - 4, ATR_X + ATR_W + 2, fy - 10);
    ctx.stroke();

    // Floor labels on the wall above each floor
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(fy === TOP_Y ? '2F' : '1F', 6, fy - 22);
  }

  // ── Crates (cover objects) ──
  for (const c of COVERS) {
    // Crate body
    ctx.fillStyle = '#4a3820';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    // Face wood grain
    ctx.strokeStyle = '#3a2810';
    ctx.lineWidth = 1;
    for (let gy = c.y + 6; gy < c.y + c.h - 4; gy += 8) {
      ctx.beginPath(); ctx.moveTo(c.x + 2, gy); ctx.lineTo(c.x + c.w - 2, gy); ctx.stroke();
    }
    // Top highlight
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(c.x, c.y, c.w, 4);
    // Cross brace
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x + 4, c.y + 4); ctx.lineTo(c.x + c.w - 4, c.y + c.h - 2);
    ctx.moveTo(c.x + c.w - 4, c.y + 4); ctx.lineTo(c.x + 4, c.y + c.h - 2);
    ctx.stroke();
    // Right shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(c.x + c.w - 5, c.y + 4, 5, c.h - 4);
  }

  // ── Outer building walls ──
  ctx.fillStyle = '#0b0b12';
  ctx.fillRect(0,          0, 18, H);
  ctx.fillRect(WORLD_W-18, 0, 18, H);

  ctx.restore();
}

function drawBullet(b) {
  ctx.fillStyle = b.color;
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 10;
  ctx.fillRect(b.x - 4, b.y - 2, 8, 4);
  ctx.shadowBlur = 0;
}

function drawPlayer(p) {
  const S = 3;
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const flash = p.hitFlash > 0;

  const P1 = {
    head: flash?'#ff6666':'#c8a060', helmet:flash?'#ff3333':'#2a4a2a',
    body: flash?'#ff5555':'#2a7a2a', legs:  flash?'#ff4444':'#1a4a1a',
    boots:'#111', gun:'#3a3a3a', scope:'#1a1a1a',
  };
  const P2 = {
    head: flash?'#ff6666':'#c8a060', helmet:flash?'#ff3333':'#1a3a5a',
    body: flash?'#ff5555':'#1a4a9a', legs:  flash?'#ff4444':'#0a2a6a',
    boots:'#111', gun:'#3a3a3a', scope:'#1a1a1a',
  };
  const pal = p.index === 0 ? P1 : P2;

  function px(lx, ly, lw, lh, color) {
    ctx.fillStyle = color;
    const rx = p.facing === 1 ? lx : (PLAYER_W - lx - lw);
    ctx.fillRect(x + rx * S, y + ly * S, lw * S, lh * S);
  }

  if (p.dead) {
    ctx.fillStyle = pal.body;
    ctx.fillRect(x, y + PLAYER_H*S - S*6, PLAYER_W*S, S*6);
    ctx.fillStyle = pal.head;
    const hx = p.facing === 1 ? x + PLAYER_W*S - S*5 : x;
    ctx.fillRect(hx, y + PLAYER_H*S - S*6, S*5, S*5);
    return;
  }

  if (p.animState === 'scope') {
    px(4,10, 8, 6, pal.head);
    px(3, 7,10, 5, pal.helmet);
    px(3,16,10,10, pal.body);
    ctx.fillStyle = pal.gun;
    ctx.fillRect(x+(p.facing===1?10*S:(PLAYER_W-10-14)*S), y+14*S, 14*S, 3*S);
    ctx.fillStyle = pal.scope;
    ctx.fillRect(x+(p.facing===1?21*S:(PLAYER_W-21-4)*S), y+13*S, 4*S, 5*S);
    px(3,26, 4, 6, pal.legs);
    px(9,26, 4, 6, pal.legs);
    px(2,30, 5, 2, pal.boots);
    px(9,30, 5, 2, pal.boots);
    return;
  }

  const bob = (p.animState === 'run') ? (p.animFrame % 2 === 0 ? 0 : 1) : 0;
  px(4, 0+bob, 8, 6, pal.head);
  px(3,bob-2,10, 4, pal.helmet);
  px(3, 6+bob,10,12, pal.body);
  ctx.fillStyle = pal.gun;
  ctx.fillRect(x+(p.facing===1?11*S:(PLAYER_W-11-10)*S), y+(8+bob)*S, 10*S, 3*S);
  ctx.fillStyle = pal.scope;
  ctx.fillRect(x+(p.facing===1?19*S:(PLAYER_W-19-3)*S), y+(7+bob)*S, 3*S, 5*S);

  if (p.animState === 'jump') {
    px(3,18+bob,4,10,pal.legs); px(9,20+bob,4, 8,pal.legs);
  } else if (p.animState === 'run' && p.animFrame%2===0) {
    px(3,18,4, 8,pal.legs);    px(9,20,4,10,pal.legs);
  } else {
    px(3,18+bob,4,10,pal.legs); px(9,18+bob,4,10,pal.legs);
  }
  px(2,28+bob,5,4,pal.boots);
  px(9,28+bob,5,4,pal.boots);

  if (p.muzzleFlash > 0) {
    const gx = x + (p.facing===1 ? PLAYER_W*S+4 : -10);
    const gy = y + PLAYER_H*S*0.33;
    ctx.fillStyle = `rgba(255,220,50,${p.muzzleFlash/0.08})`;
    ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI*2); ctx.fill();
  }
}

function drawHUD(p, offsetX) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);
  ctx.clip();

  const label      = p.index === 0 ? 'P1' : 'P2';
  const labelColor = p.index === 0 ? '#4aff4a' : '#4aaaff';
  const tx         = p.index === 0 ? offsetX + 8 : offsetX + HALF_W - 8;
  const align      = p.index === 0 ? 'left' : 'right';

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = labelColor;
  ctx.textAlign = align;
  ctx.fillText(label, tx, 20);

  // Floor label
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(floorLabel[p.index] || '', tx, 34);

  // Hearts
  const hpFrac      = Math.max(0, p.hp / p.maxHp);
  const filledHearts = Math.ceil(hpFrac * 3);
  for (let i = 0; i < 3; i++) {
    const hx = p.index === 0
      ? offsetX + 8 + i * 22
      : offsetX + HALF_W - 8 - (3 - i) * 22;
    ctx.font = '16px serif';
    ctx.fillStyle = i < filledHearts ? '#ff4466' : '#442233';
    ctx.fillText('♥', hx, 50);
  }

  // Weapon + ammo
  ctx.font = '10px monospace';
  ctx.fillStyle = p.weapon.color;
  ctx.textAlign = align;
  ctx.fillText(p.weapon.name, tx, H - 30);
  ctx.fillStyle = p.ammo === 0 ? '#ff4444' : '#aaaaaa';
  ctx.fillText(p.reloadTimer > 0 ? `RELOADING ${p.reloadTimer.toFixed(1)}s` : `${p.ammo} ammo`, tx, H - 16);

  // Round win squares
  ctx.textAlign = 'center';
  const vcx = offsetX + HALF_W / 2;
  ctx.font = '10px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('ROUND ' + currentRound, vcx, 16);
  for (let i = 0; i < 3; i++) {
    const sq = 10, gap = 4;
    const p1x = vcx - 8 - (3-i)*(sq+gap);
    ctx.fillStyle = i < roundWins[0] ? '#4aff4a' : '#222';
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
    ctx.fillRect(p1x, 22, sq, sq); ctx.strokeRect(p1x, 22, sq, sq);
    const p2x = vcx + 8 + i*(sq+gap);
    ctx.fillStyle = i < roundWins[1] ? '#4aaaff' : '#222';
    ctx.fillRect(p2x, 22, sq, sq); ctx.strokeRect(p2x, 22, sq, sq);
  }

  ctx.restore();
}

function drawScopeOverlay(p, offsetX) {
  const charge = p.scopeCharge;
  if (charge <= 0) return;
  const cx = offsetX + HALF_W / 2, cy = H / 2;
  const r  = 130 * charge;

  ctx.save();
  ctx.beginPath(); ctx.rect(offsetX, 0, HALF_W, H); ctx.clip();

  ctx.fillStyle = `rgba(0,0,0,${0.92*charge})`;
  ctx.beginPath();
  ctx.rect(offsetX, 0, HALF_W, H);
  ctx.arc(cx, cy, r, 0, Math.PI*2, true);
  ctx.fill('evenodd');

  ctx.strokeStyle = `rgba(180,180,180,${charge})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();

  if (charge > 0.8) {
    const alpha = (charge - 0.8) / 0.2;
    ctx.strokeStyle = `rgba(220,50,50,${alpha})`;
    ctx.lineWidth = 1;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.clip();
    ctx.beginPath();
    ctx.moveTo(cx-r,cy); ctx.lineTo(cx+r,cy);
    ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r);
    ctx.stroke();
    ctx.fillStyle = `rgba(220,50,50,${alpha})`;
    for (const [dx,dy] of [[-r*.4,0],[r*.4,0],[0,-r*.4],[0,r*.4]]) {
      ctx.beginPath(); ctx.arc(cx+dx,cy+dy, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(cx-5,cy-1,10,2); ctx.fillRect(cx-1,cy-5,2,10);
    ctx.restore();
  }
  ctx.restore();
}

function drawGunBarrel(p, offsetX, cam) {
  if (p.dead) return;
  ctx.save();
  ctx.translate(cam - offsetX, 0);
  const bx     = offsetX + HALF_W / 2;
  const barrelH = p.scoping ? H * 0.18 : H * 0.25;
  const barrelW = p.scoping ? 8 : 12;

  ctx.fillStyle = p.scoping ? '#555' : '#3a3a3a';
  ctx.fillRect(bx - barrelW/2, H - barrelH, barrelW, barrelH);
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(bx - 20, H - barrelH*0.6, 40, barrelH*0.5);
  if (p.scoping || p.scopeCharge > 0) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx - 8, H - barrelH*0.75, 16, 8);
  }
  if (p.muzzleFlash > 0) {
    ctx.fillStyle = `rgba(255,220,50,${p.muzzleFlash/0.08})`;
    ctx.beginPath(); ctx.arc(bx, H - barrelH, 10, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ── Weapon select screen ─────────────────────────────────────
function renderWeaponSelect() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('★  SNIPER DUEL  ★', W/2, 60);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#555';
  ctx.fillText(`ROUND ${currentRound}  —  First to 3`, W/2, 85);

  const panelW = 420, panelH = 340, panelY = 110;
  for (let i = 0; i < 2; i++) {
    const panelX   = i === 0 ? 60 : W - 60 - panelW;
    const color    = i === 0 ? '#4aff4a' : '#4aaaff';
    const controls = i === 0 ? 'W/S navigate   F confirm' : '↑/↓ navigate   L confirm';

    ctx.strokeStyle = confirmed[i] ? color : '#333';
    ctx.lineWidth   = confirmed[i] ? 2 : 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    ctx.fillStyle = color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`PLAYER ${i+1}`, panelX+12, panelY+24);
    ctx.fillStyle = '#444';
    ctx.font = '10px monospace';
    ctx.fillText(controls, panelX+12, panelY+42);

    WEAPON_KEYS.forEach((key, idx) => {
      const w  = WEAPONS[key];
      const wy = panelY + 65 + idx * 65;
      const selected = selection[i] === idx;
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.3)';
      ctx.fillRect(panelX+8, wy-2, panelW-16, 56);
      if (selected) {
        ctx.strokeStyle = w.color; ctx.lineWidth = 1;
        ctx.strokeRect(panelX+8, wy-2, panelW-16, 56);
      }
      ctx.fillStyle = w.color;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText((key==='DEADEYE'?'💀 ':'🔫 ')+w.name, panelX+18, wy+18);
      const bw = 100;
      drawStatBar(panelX+18,        wy+28, bw, 'SPD', 1-(w.reloadTime/5), '#88ff88');
      drawStatBar(panelX+18+bw+20,  wy+28, bw, 'DMG', w.damage/100,      '#ff8888');
      drawStatBar(panelX+18+(bw+20)*2, wy+28, bw, 'AIM', w.assistRadius/30, '#88aaff');
    });

    ctx.fillStyle = confirmed[i] ? color : '#333';
    ctx.font = confirmed[i] ? 'bold 13px monospace' : '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(confirmed[i] ? 'READY ✓' : 'press confirm to lock in',
                 panelX + panelW/2, panelY + panelH - 12);
  }

  // Win tracker
  ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const sq = 14, gap = 6;
    ctx.fillStyle = i < roundWins[0] ? '#4aff4a' : '#222';
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
    const p1x = W/2 - 10 - (3-i)*(sq+gap);
    ctx.fillRect(p1x, H-60, sq, sq); ctx.strokeRect(p1x, H-60, sq, sq);
    const p2x = W/2 + 10 + i*(sq+gap);
    ctx.fillStyle = i < roundWins[1] ? '#4aaaff' : '#222';
    ctx.fillRect(p2x, H-60, sq, sq); ctx.strokeRect(p2x, H-60, sq, sq);
  }
  ctx.fillStyle = '#555'; ctx.font = '10px monospace';
  ctx.fillText('P1', W/2-10-3*(14+6)-16, H-49);
  ctx.fillText('P2', W/2+10+3*(14+6)+6,  H-49);
}

function drawStatBar(x, y, w, label, frac, color) {
  ctx.fillStyle = '#111'; ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = color;  ctx.fillRect(x, y, Math.round(frac*w), 6);
  ctx.fillStyle = '#555'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
  ctx.fillText(label, x, y+16);
}

function renderWinScreen() {
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(0, 0, W, H);
  const wc = winner === 0 ? '#4aff4a' : '#4aaaff';
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 52px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`PLAYER ${winner+1}`, W/2, H/2-40);
  ctx.fillStyle = wc;
  ctx.font = 'bold 28px monospace';
  ctx.fillText('WINS THE MATCH', W/2, H/2+10);
  ctx.fillStyle = '#555';
  ctx.font = '14px monospace';
  ctx.fillText(`${roundWins[0]} — ${roundWins[1]}`, W/2, H/2+50);
  ctx.strokeStyle = wc; ctx.lineWidth = 1;
  ctx.strokeRect(W/2-160, H/2+80, 140, 36);
  ctx.fillStyle = wc;
  ctx.font = '13px monospace';
  ctx.fillText('REMATCH [ENTER]', W/2-90, H/2+104);
  ctx.strokeStyle = '#444';
  ctx.strokeRect(W/2+20, H/2+80, 140, 36);
  ctx.fillStyle = '#555';
  ctx.fillText('MENU [ESC]', W/2+90, H/2+104);
}

function render() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (currentScreen === SCREEN.WEAPON_SELECT) { renderWeaponSelect(); return; }
  if (currentScreen === SCREEN.WIN)            { renderWinScreen();    return; }

  const cam0 = getCameraX(players[0]);
  const cam1 = getCameraX(players[1]);

  renderViewport(0, cam0, 0);
  renderViewport(1, cam1, HALF_W);

  for (let vp = 0; vp < 2; vp++) {
    const cam     = vp === 0 ? cam0 : cam1;
    const offsetX = vp * HALF_W;
    ctx.save();
    ctx.beginPath(); ctx.rect(offsetX, 0, HALF_W, H); ctx.clip();
    ctx.translate(offsetX - cam, 0);
    for (const p of players) {
      if (p.index === vp) continue; // don't draw self — first-person
      drawPlayer(p);
    }
    for (const b of bullets) drawBullet(b);
    drawGunBarrel(players[vp], offsetX, cam);
    ctx.restore();
  }

  for (let i = 0; i < 2; i++) drawHUD(players[i], i * HALF_W);
  for (let i = 0; i < 2; i++) {
    if (players[i].scoping || players[i].scopeCharge > 0)
      drawScopeOverlay(players[i], i * HALF_W);
  }

  if (roundMsgTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(roundMsgTimer, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(roundMsg, W/2, H/2);
    ctx.restore();
  }

  // Split divider
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(HALF_W - 1, 0, 2, H);
}

// ============================================================
// SECTION 8: GAME LOOP
// ============================================================
let lastTime = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (currentScreen === SCREEN.WEAPON_SELECT) { updateWeaponSelect(dt); return; }
  if (currentScreen === SCREEN.WIN)            { updateWin(dt);          return; }

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
