// ─────────────────────────────────────────────────────────────────────────────
//  SWING HERO  —  Complete Game
// ─────────────────────────────────────────────────────────────────────────────

// ─── CANVAS SETUP ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 900, H = 506;
canvas.width = W;
canvas.height = H;

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CFG = {
  gravity:      0.28,   // lower = floatier, easier to swing
  ropeMaxLen:   300,
  playerR:      18,
  groundY:      H - 70,
  anchorSnapR:  420,    // very generous snap radius
  swingDamp:    0.999,  // near 1 = almost no energy loss
  levelLen:     7000,
  scrollLead:   220,
  momentumPush: 0.18,   // auto-pump forward while swinging
};

// ─── SAVE / RESUME ──────────────────────────────────────────────────────────────
function wbLoad(defaults) {
  try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem('wb_save_swing-man')) || {}); }
  catch (e) { return defaults; }
}
function wbSave(data) {
  try { localStorage.setItem('wb_save_swing-man', JSON.stringify(data)); } catch (e) {}
}
const wbSaved = wbLoad({ bestLevel: 1, bestScore: 0 });
let bestLevel = wbSaved.bestLevel;
let bestScore = wbSaved.bestScore;

// ─── STATE ────────────────────────────────────────────────────────────────────
let gs = 'TITLE';   // TITLE | PLAYING | LEVEL_COMPLETE | BOSS | WIN | GAMEOVER
let level = 1;
let retryLevel = bestLevel;  // level to return to on game over (never goes below 1)
let score = 0;
let lives = 3;
let bossHP = 10;
let bossMaxHP = 10;
let webProjectiles = [];   // player-fired web shots at boss
let webShootCooldown = 0;  // frames until next shot allowed
let adTimer = 0;
let adDuration = 180; // frames to show ad/reward screen
let particles = [];
let voiceCache = {};

// ─── AUDIO ───────────────────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playBeep(freq = 440, dur = 0.1, type = 'square', vol = 0.3) {
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function playSfx(type) {
  switch(type) {
    case 'attach':  playBeep(600, 0.05, 'sine', 0.2); break;
    case 'release': playBeep(400, 0.08, 'sine', 0.2); break;
    case 'hit':     playBeep(180, 0.2, 'sawtooth', 0.3); break;
    case 'coin':    playBeep(880, 0.12, 'sine', 0.25);
                    setTimeout(() => playBeep(1100, 0.1, 'sine', 0.2), 80); break;
    case 'levelup': [660,880,1100,1320].forEach((f,i) =>
                      setTimeout(() => playBeep(f, 0.15, 'sine', 0.3), i*120)); break;
    case 'death':   playBeep(220, 0.3, 'sawtooth', 0.4); break;
    case 'bosshit': playBeep(120, 0.3, 'square', 0.4); break;
    case 'win':     [523,659,784,1047].forEach((f,i) =>
                      setTimeout(() => playBeep(f, 0.2, 'sine', 0.35), i*150)); break;
  }
}

async function playVoice(text) {
  ensureAudio();
  if (voiceCache[text]) {
    playAudioBuffer(voiceCache[text]);
    return;
  }
  try {
    const res = await fetch('/api/sound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return;
    const arrayBuf = await res.arrayBuffer();
    const buf = await audioCtx.decodeAudioData(arrayBuf);
    voiceCache[text] = buf;
    playAudioBuffer(buf);
  } catch(e) { /* voice unavailable — silent fallback */ }
}

function playAudioBuffer(buf) {
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start();
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
let input = { down: false, justDown: false, justUp: false, shoot: false, justShoot: false };
let _downPrev = false;
let _shootPrev = false;

// On-screen SHOOT button bounds (drawn during boss fight)
const SHOOT_BTN = { x: W - 110, y: H - 80, w: 95, h: 55 };

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
}

function isShootBtn(pos) {
  return pos.x >= SHOOT_BTN.x && pos.x <= SHOOT_BTN.x + SHOOT_BTN.w &&
         pos.y >= SHOOT_BTN.y && pos.y <= SHOOT_BTN.y + SHOOT_BTN.h;
}

canvas.addEventListener('mousedown', e => {
  ensureAudio();
  const pos = getCanvasPos(e);
  if (gs === 'BOSS' && isShootBtn(pos)) input.shoot = true;
  else input.down = true;
});
canvas.addEventListener('mouseup', e => { input.down = false; input.shoot = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault(); ensureAudio();
  for (const t of e.changedTouches) {
    const rect = canvas.getBoundingClientRect();
    const pos = { x: (t.clientX - rect.left) * W / rect.width,
                  y: (t.clientY - rect.top)  * H / rect.height };
    if (gs === 'BOSS' && isShootBtn(pos)) input.shoot = true;
    else input.down = true;
  }
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  // If all touches gone, release both
  if (e.touches.length === 0) { input.down = false; input.shoot = false; }
}, { passive: false });

// Spacebar = shoot during boss
window.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); ensureAudio(); input.shoot = true; }
});
window.addEventListener('keyup', e => {
  if (e.code === 'Space') input.shoot = false;
});

function tickInput() {
  input.justDown  = input.down  && !_downPrev;
  input.justUp    = !input.down && _downPrev;
  input.justShoot = input.shoot && !_shootPrev;
  _downPrev  = input.down;
  _shootPrev = input.shoot;
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
function spawnParticles(wx, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      wx, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 40 + Math.random() * 30,
      maxLife: 70,
      r: 3 + Math.random() * 4,
      color
    });
  }
}

function updateParticles() {
  particles = particles.filter(p => {
    p.wx += p.vx;
    p.y  += p.vy;
    p.vy += 0.15;
    p.life--;
    return p.life > 0;
  });
}

function drawParticles(camX) {
  particles.forEach(p => {
    const sx = p.wx - camX;
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ─── CAMERA ───────────────────────────────────────────────────────────────────
let camX = 0;

function updateCamera(targetWorldX) {
  const desired = targetWorldX - CFG.scrollLead;
  camX += (desired - camX) * 0.08;
  if (camX < 0) camX = 0;
}

// ─── PLAYER ───────────────────────────────────────────────────────────────────
const player = {
  wx: 150, y: 300,
  vx: 2, vy: 0,
  attached: false,
  anchor: null,
  ropeLen: 0,
  invincible: 0,
  alive: true,
  angle: 0,   // body lean

  reset(startX = 150) {
    this.wx = startX; this.y = 300;
    this.vx = 4; this.vy = -2;  // start with forward momentum
    this.attached = false; this.anchor = null; this.ropeLen = 0;
    this.invincible = 0; this.alive = true; this.angle = 0;
  },

  autoAttach(anchors) {
    // Called once at level start to grab nearest anchor automatically
    let best = null, bestDist = Infinity;
    for (const a of anchors) {
      const dx = a.wx - this.wx, dy = a.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < bestDist) { bestDist = d; best = a; }
    }
    if (best) this.attachTo(best);
  },

  attachTo(anchor) {
    const dx = anchor.wx - this.wx;
    const dy = anchor.y  - this.y;
    this.ropeLen = Math.min(Math.sqrt(dx*dx + dy*dy), CFG.ropeMaxLen);
    this.anchor = anchor;
    this.attached = true;
    playSfx('attach');
  },

  release() {
    if (!this.attached) return;
    this.attached = false;
    this.anchor = null;
    playSfx('release');
  },

  update(anchors) {
    if (!this.alive) return;

    if (this.attached && this.anchor) {
      // Pendulum: apply gravity then constrain to rope
      this.vy += CFG.gravity;
      this.wx += this.vx;
      this.y  += this.vy;

      const dx = this.wx - this.anchor.wx;
      const dy = this.y  - this.anchor.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist > this.ropeLen) {
        const nx = dx / dist, ny = dy / dist;
        this.wx = this.anchor.wx + nx * this.ropeLen;
        this.y  = this.anchor.y  + ny * this.ropeLen;
        // Remove radial velocity
        const radial = this.vx * nx + this.vy * ny;
        this.vx = (this.vx - radial * nx) * CFG.swingDamp;
        this.vy = (this.vy - radial * ny) * CFG.swingDamp;
      }

      // Auto-pump: constant gentle push forward to build momentum
      this.vx += CFG.momentumPush;
    } else {
      // Free flight
      this.vy += CFG.gravity;
      this.wx += this.vx;
      this.y  += this.vy;
    }

    // Lean angle
    this.angle = Math.atan2(this.vy, this.vx) * 0.3;

    // Try to auto-attach on press
    if (input.justDown && !this.attached) {
      const best = this._findAnchor(anchors);
      if (best) this.attachTo(best);
    }
    if (input.justUp && this.attached) {
      this.release();
    }

    // Floor = death (more forgiving buffer)
    if (this.y > CFG.groundY + 80) {
      this.alive = false;
    }

    if (this.invincible > 0) this.invincible--;
  },

  _findAnchor(anchors) {
    let best = null, bestDist = CFG.anchorSnapR;
    for (const a of anchors) {
      const dx = a.wx - this.wx;
      const dy = a.y  - this.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      // Attach to anything ahead (or slightly behind) and above player's waist
      if (dx > -80 && dy < 60 && d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return best;
  },

  getHit() {
    if (this.invincible > 0) return;
    lives--;
    this.invincible = 90;
    playSfx('hit');
    spawnParticles(this.wx, this.y, '#ff4444', 10);
    if (this.attached) this.release();
    this.vx = -3; this.vy = -5;
  },

  draw(camX) {
    const sx = this.wx - camX;
    const sy = this.y;

    // Draw rope
    if (this.attached && this.anchor) {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(this.anchor.wx - camX, this.anchor.y);
      ctx.strokeStyle = 'rgba(150,230,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    // Glow when invincible
    if (this.invincible > 0 && Math.floor(this.invincible / 6) % 2 === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, CFG.playerR + 6, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,100,100,0.4)';
      ctx.fill();
    }

    // Body
    ctx.beginPath();
    ctx.arc(0, 2, CFG.playerR, 0, Math.PI*2);
    ctx.fillStyle = '#1560e8';
    ctx.fill();
    ctx.strokeStyle = '#0a3aaa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Torso web lines
    ctx.beginPath();
    ctx.moveTo(-CFG.playerR, 2);
    ctx.lineTo(CFG.playerR, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Head / mask
    ctx.beginPath();
    ctx.arc(0, -8, 13, 0, Math.PI*2);
    ctx.fillStyle = '#e82020';
    ctx.fill();
    ctx.strokeStyle = '#991010';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eyes (white lenses)
    ctx.beginPath();
    ctx.ellipse(-4.5, -9, 4, 5.5, -0.25, 0, Math.PI*2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4.5, -9, 4, 5.5, 0.25, 0, Math.PI*2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Web pattern on mask
    ctx.beginPath();
    ctx.arc(0, -8, 13, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(100,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }
};

// ─── ANCHORS ─────────────────────────────────────────────────────────────────
class Anchor {
  constructor(wx, y) {
    this.wx = wx;
    this.y = y;
    this.r = 8;
    this.pulse = Math.random() * Math.PI * 2;
  }

  update() { this.pulse += 0.06; }

  draw(camX) {
    const sx = this.wx - camX;
    const glow = 0.6 + 0.4 * Math.sin(this.pulse);

    // Outer glow
    const grad = ctx.createRadialGradient(sx, this.y, 0, sx, this.y, 20);
    grad.addColorStop(0, `rgba(255,220,80,${glow * 0.7})`);
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(sx, this.y, 20, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(sx, this.y, this.r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,230,60,${glow})`;
    ctx.fill();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ─── OBSTACLES ────────────────────────────────────────────────────────────────
class TrashCan {
  constructor(wx) {
    this.wx = wx;
    this.y = CFG.groundY - 20;
    this.w = 30; this.h = 42;
    this.type = 'trash';
  }

  update() {}

  checkHit(px, py, pr) {
    const sx = this.wx, sy = this.y - this.h/2;
    return px + pr > sx - this.w/2 && px - pr < sx + this.w/2 &&
           py + pr > sy           && py - pr < sy + this.h;
  }

  draw(camX) {
    const sx = this.wx - camX;
    const by = this.y;

    // Body
    ctx.fillStyle = '#4a4a5a';
    ctx.beginPath();
    ctx.roundRect(sx - 14, by - this.h, 28, this.h, 4);
    ctx.fill();
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lid
    ctx.fillStyle = '#5a5a6a';
    ctx.beginPath();
    ctx.roundRect(sx - 16, by - this.h - 5, 32, 8, 3);
    ctx.fill();

    // Stripes
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(sx - 8 + i*8, by - this.h + 8);
      ctx.lineTo(sx - 8 + i*8, by - 6);
      ctx.stroke();
    }
  }
}

class GoofyEnemy {
  constructor(wx) {
    this.wx = wx;
    this.y = CFG.groundY - 22;
    this.r = 22;
    this.vx = -(1.2 + Math.random() * 0.8);
    this.phase = Math.random() * Math.PI * 2;
    this.type = 'enemy';
    this.alive = true;
  }

  update() {
    this.phase += 0.08;
    this.wx += this.vx;
    this.y = CFG.groundY - 22 + Math.sin(this.phase * 2) * 5;
  }

  checkHit(px, py, pr) {
    const dx = px - this.wx, dy = py - this.y;
    return Math.sqrt(dx*dx + dy*dy) < pr + this.r - 4;
  }

  draw(camX) {
    const sx = this.wx - camX;
    const sy = this.y;

    // Bounce shadow
    ctx.beginPath();
    ctx.ellipse(sx, CFG.groundY - 4, 20, 5, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Body blob
    ctx.beginPath();
    ctx.arc(sx, sy, this.r, 0, Math.PI*2);
    ctx.fillStyle = '#f07020';
    ctx.fill();
    ctx.strokeStyle = '#c04000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Big goofy eyes
    ctx.beginPath();
    ctx.arc(sx - 8, sy - 8, 7, 0, Math.PI*2);
    ctx.arc(sx + 8, sy - 8, 7, 0, Math.PI*2);
    ctx.fillStyle = 'white';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx - 7 + Math.sin(this.phase)*2, sy - 8, 4, 0, Math.PI*2);
    ctx.arc(sx + 9 + Math.sin(this.phase)*2, sy - 8, 4, 0, Math.PI*2);
    ctx.fillStyle = '#111';
    ctx.fill();

    // Goofy smile
    ctx.beginPath();
    ctx.arc(sx, sy + 4, 10, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = '#441100';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Little arms flailing
    ctx.beginPath();
    ctx.moveTo(sx - this.r, sy);
    ctx.quadraticCurveTo(sx - this.r - 12, sy - 8 + Math.sin(this.phase)*10, sx - this.r - 8, sy - 14 + Math.sin(this.phase)*12);
    ctx.moveTo(sx + this.r, sy);
    ctx.quadraticCurveTo(sx + this.r + 12, sy - 8 - Math.sin(this.phase)*10, sx + this.r + 8, sy - 14 - Math.sin(this.phase)*12);
    ctx.strokeStyle = '#f07020';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

class SlimeMonster {
  constructor(wx) {
    this.wx = wx;
    this.y = CFG.groundY - 150 - Math.random() * 100;
    this.baseY = this.y;
    this.r = 20;
    this.vx = -(0.8 + Math.random() * 0.5);
    this.phase = Math.random() * Math.PI * 2;
    this.type = 'slime';
    this.drip = 0;
    this.alive = true;
  }

  update() {
    this.phase += 0.04;
    this.wx += this.vx;
    this.y = this.baseY + Math.sin(this.phase) * 25;
    this.drip = (this.drip + 1) % 120;
  }

  checkHit(px, py, pr) {
    const dx = px - this.wx, dy = py - this.y;
    return Math.sqrt(dx*dx + dy*dy) < pr + this.r - 4;
  }

  draw(camX) {
    const sx = this.wx - camX;
    const sy = this.y;

    // Glow aura
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, this.r + 12);
    grad.addColorStop(0, 'rgba(60,220,60,0.35)');
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(sx, sy, this.r + 12, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Body — wobbly blob
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(1 + Math.sin(this.phase)*0.12, 1 - Math.sin(this.phase)*0.12);
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI*2);
    ctx.fillStyle = '#40e040';
    ctx.fill();
    ctx.strokeStyle = '#20a020';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Drip
    const dripLen = (this.drip / 120) * 30;
    ctx.beginPath();
    ctx.moveTo(sx, sy + this.r);
    ctx.lineTo(sx, sy + this.r + dripLen);
    ctx.strokeStyle = 'rgba(60,220,60,0.6)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Eyes (menacing)
    ctx.beginPath();
    ctx.ellipse(sx - 7, sy - 5, 5, 4, -0.3, 0, Math.PI*2);
    ctx.ellipse(sx + 7, sy - 5, 5, 4, 0.3, 0, Math.PI*2);
    ctx.fillStyle = 'red';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sx - 7, sy - 5, 2.5, 0, Math.PI*2);
    ctx.arc(sx + 7, sy - 5, 2.5, 0, Math.PI*2);
    ctx.fillStyle = '#200';
    ctx.fill();
  }
}

class Coin {
  constructor(wx, y) {
    this.wx = wx;
    this.y = y;
    this.r = 10;
    this.type = 'coin';
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
  }

  update() { this.phase += 0.07; }

  checkHit(px, py, pr) {
    const dx = px - this.wx, dy = py - this.y;
    return Math.sqrt(dx*dx + dy*dy) < pr + this.r + 4;
  }

  draw(camX) {
    if (this.collected) return;
    const sx = this.wx - camX;
    const sy = this.y + Math.sin(this.phase) * 4;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(Math.abs(Math.cos(this.phase * 0.5)), 1);

    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI*2);
    ctx.fillStyle = '#ffe030';
    ctx.fill();
    ctx.strokeStyle = '#cc9900';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#cc9900';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);

    ctx.restore();
  }
}

// ─── BOSS — DARK GOO MONSTER ──────────────────────────────────────────────────
const boss = {
  wx: 0, y: 0,
  hp: 10,
  phase: 0,
  attackTimer: 0,
  projectiles: [],
  hitFlash: 0,
  shakeX: 0,
  tentacles: [],
  dead: false,

  init(worldX) {
    this.wx = worldX;
    this.y = H * 0.5;
    this.hp = bossMaxHP;
    this.phase = 0;
    this.attackTimer = 0;
    this.projectiles = [];
    this.hitFlash = 0;
    this.dead = false;
    this.tentacles = Array.from({ length: 6 }, (_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      len: 60 + Math.random() * 40,
      wave: Math.random() * Math.PI * 2
    }));
    playVoice('Dark Goo Monster has appeared! Defeat it!');
  },

  update() {
    if (this.dead) return;
    this.phase += 0.025;
    this.hitFlash = Math.max(0, this.hitFlash - 1);
    this.shakeX = this.hitFlash > 0 ? (Math.random() - 0.5) * 8 : 0;

    // Float up/down
    this.y = H * 0.45 + Math.sin(this.phase) * 40;

    // Tentacles wave
    this.tentacles.forEach(t => t.wave += 0.05);

    // Attack: shoot black slime balls in spread pattern
    this.attackTimer--;
    if (this.attackTimer <= 0) {
      // Gets faster as hp drops; base interval 70 frames
      this.attackTimer = Math.max(30, 70 - (bossMaxHP - this.hp) * 4);
      const angle = Math.atan2(player.y - this.y, player.wx - this.wx);

      // Phase 1 (hp > 6): 3-shot spread
      // Phase 2 (hp 4-6): 5-shot spread + one random arc
      // Phase 3 (hp < 4): 5-shot spread + two lobs arcing over player
      const shots = this.hp > 6 ? 3 : 5;
      const spread = this.hp > 6 ? 0.28 : 0.22;
      const speed  = 4.5 + (bossMaxHP - this.hp) * 0.3;

      for (let i = -(shots-1)/2; i <= (shots-1)/2; i++) {
        const a = angle + i * spread;
        this.projectiles.push({
          wx: this.wx - 70, y: this.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          r: 11, life: 150, type: 'slime'
        });
      }

      // Phase 2+: lob a slow arcing blob over the player
      if (this.hp <= 6) {
        const lobCount = this.hp <= 3 ? 2 : 1;
        for (let l = 0; l < lobCount; l++) {
          const offsetX = (l === 0 ? 0 : 80) * (Math.random() < 0.5 ? 1 : -1);
          this.projectiles.push({
            wx: this.wx - 70, y: this.y,
            vx: -3 - Math.random() * 2 + offsetX * 0.05,
            vy: -8 - Math.random() * 3,
            r: 14, life: 200, type: 'lob'
          });
        }
      }
    }

    // Update projectiles
    this.projectiles = this.projectiles.filter(p => {
      p.wx += p.vx;
      p.y  += p.vy;
      // Lob blobs are affected by gravity
      if (p.type === 'lob') p.vy += 0.22;
      p.life--;

      if (!player.invincible) {
        const dx = player.wx - p.wx, dy = player.y - p.y;
        if (Math.sqrt(dx*dx + dy*dy) < CFG.playerR + p.r) {
          player.getHit();
          spawnParticles(p.wx, p.y, '#004400', 6);
          return false;
        }
      }
      // Remove if off-screen bottom
      if (p.y > H + 40) return false;
      return p.life > 0;
    });

    // Check player collision with boss body
    if (!player.invincible && player.alive) {
      const dx = player.wx - this.wx;
      const dy = player.y  - this.y;
      if (Math.sqrt(dx*dx + dy*dy) < CFG.playerR + 70) {
        // Player swinging fast = boss hit
        const speed = Math.sqrt(player.vx**2 + player.vy**2);
        if (speed > 6) {
          this.hp--;
          this.hitFlash = 20;
          player.invincible = 40;
          player.vx = -player.vx * 0.6;
          player.vy = -4;
          playSfx('bosshit');
          spawnParticles(this.wx, this.y, '#8800ff', 15);

          if (this.hp <= 0) {
            this.dead = true;
            playSfx('win');
            spawnParticles(this.wx, this.y, '#ff00ff', 40);
            setTimeout(() => playVoice('You defeated the Dark Goo Monster! You are the Swing Hero!'), 500);
            setTimeout(() => { gs = 'WIN'; }, 2000);
          }
        } else {
          player.getHit();
        }
      }
    }
  },

  draw(camX) {
    const sx = this.wx - camX + this.shakeX;
    const sy = this.y;
    const size = 75;

    // Tentacles
    this.tentacles.forEach(t => {
      const tx = sx + Math.cos(t.angle + this.phase) * (size + t.len * 0.6);
      const ty = sy + Math.sin(t.angle + this.phase * 0.7) * (size + t.len * 0.4);
      const wave = Math.sin(t.wave) * 15;

      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(t.angle) * size * 0.7,
                 sy + Math.sin(t.angle) * size * 0.7);
      ctx.quadraticCurveTo(
        sx + Math.cos(t.angle + 0.3) * (size + t.len * 0.3) + wave,
        sy + Math.sin(t.angle + 0.3) * (size + t.len * 0.3) - wave,
        tx, ty
      );
      ctx.strokeStyle = this.hitFlash > 0 ? '#cc44ff' : '#3d0066';
      ctx.lineWidth = 12 - (t.len / 40);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
    });

    // Outer glow
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, size + 30);
    grad.addColorStop(0, 'rgba(100,0,200,0.5)');
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(sx, sy, size + 30, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Body — pulsing mass
    ctx.save();
    ctx.translate(sx, sy);
    const blobScale = 1 + Math.sin(this.phase * 2) * 0.06;
    ctx.scale(blobScale, 1 / blobScale);

    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI*2);
    ctx.fillStyle = this.hitFlash > 0 ? '#9944ff' : '#1a0033';
    ctx.fill();
    ctx.strokeStyle = this.hitFlash > 0 ? '#ff88ff' : '#6600cc';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner blobs
    for (let i = 0; i < 4; i++) {
      const a = this.phase + i * Math.PI / 2;
      const r = 20 + Math.sin(this.phase * 2 + i) * 5;
      ctx.beginPath();
      ctx.arc(Math.cos(a)*25, Math.sin(a)*25, r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(80,0,140,0.5)';
      ctx.fill();
    }

    // Red eyes (glowing)
    const eyeGlow = 0.7 + 0.3 * Math.sin(this.phase * 3);
    ctx.beginPath();
    ctx.arc(-22, -15, 14, 0, Math.PI*2);
    ctx.arc(22, -15, 14, 0, Math.PI*2);
    ctx.fillStyle = `rgba(255,30,30,${eyeGlow})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-22, -15, 7, 0, Math.PI*2);
    ctx.arc(22, -15, 7, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Mouth — jagged
    ctx.beginPath();
    ctx.moveTo(-25, 20);
    for (let i = 0; i <= 5; i++) {
      const mx = -25 + i * 10;
      const my = 20 + (i % 2 === 0 ? 0 : 14);
      ctx.lineTo(mx, my);
    }
    ctx.strokeStyle = '#8800ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Black slime projectiles
    this.projectiles.forEach(p => {
      const psx = p.wx - camX;
      if (p.type === 'lob') {
        // Large arcing black blob with purple glow
        const g = ctx.createRadialGradient(psx, p.y, 0, psx, p.y, p.r + 6);
        g.addColorStop(0, 'rgba(80,0,120,0.6)');
        g.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(psx, p.y, p.r + 6, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();

        ctx.beginPath(); ctx.arc(psx, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = '#0a0010'; ctx.fill();
        ctx.strokeStyle = '#6600aa'; ctx.lineWidth = 3; ctx.stroke();

        // Drip trail
        ctx.beginPath();
        ctx.moveTo(psx, p.y - p.r);
        ctx.lineTo(psx + (Math.random()-0.5)*4, p.y - p.r - 8);
        ctx.strokeStyle = 'rgba(60,0,80,0.5)'; ctx.lineWidth = 4;
        ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
      } else {
        // Fast black slime shot
        ctx.beginPath(); ctx.arc(psx, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = '#111111'; ctx.fill();
        ctx.strokeStyle = '#550088'; ctx.lineWidth = 2; ctx.stroke();
        // Highlight
        ctx.beginPath(); ctx.arc(psx - 3, p.y - 3, 3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(120,0,200,0.5)'; ctx.fill();
      }
    });

    // HP bar above boss
    const barW = 160, barH = 14, barX = sx - barW/2, barY = sy - size - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
    ctx.fill();
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(barX, barY, barW * (this.hp / bossMaxHP), barH);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DARK GOO MONSTER', sx, barY + barH/2);
  }
};

// ─── LEVEL GENERATOR ─────────────────────────────────────────────────────────
let anchors = [];
let obstacles = [];
let coins = [];
let levelEndX = 0;
let portalPhase = 0;

function generateLevel(lvl) {
  anchors = [];
  obstacles = [];
  coins = [];

  const len = CFG.levelLen;
  levelEndX = len - 200;

  // Starting anchors (ensure player can start swinging)
  anchors.push(new Anchor(200, 80));
  anchors.push(new Anchor(450, 60));

  // Generate anchor points along the level
  const anchorSpacing = 280 - lvl * 20;
  for (let x = 600; x < len - 400; x += anchorSpacing + Math.random() * 120) {
    const y = 50 + Math.random() * 160;
    anchors.push(new Anchor(x, y));
  }

  // Final anchors near end
  anchors.push(new Anchor(len - 500, 70));
  anchors.push(new Anchor(len - 300, 90));

  // Obstacles — density increases per level
  const obstacleCount = 8 + lvl * 5;
  const sectionLen = (len - 600) / obstacleCount;

  for (let i = 0; i < obstacleCount; i++) {
    const x = 600 + i * sectionLen + Math.random() * (sectionLen * 0.6);
    const roll = Math.random();

    if (roll < 0.35) {
      obstacles.push(new TrashCan(x));
    } else if (roll < 0.7) {
      obstacles.push(new GoofyEnemy(x));
    } else {
      obstacles.push(new SlimeMonster(x));
    }

    // Coins near anchors
    if (Math.random() < 0.5) {
      const nearAnchor = anchors[Math.floor(Math.random() * anchors.length)];
      coins.push(new Coin(nearAnchor.wx + (Math.random()-0.5)*80, nearAnchor.y + 30 + Math.random()*40));
    }
  }
}

// ─── BACKGROUND ──────────────────────────────────────────────────────────────
let bgBuildings = [];

function generateBuildings() {
  bgBuildings = [];
  for (let x = 0; x < CFG.levelLen + 400; x += 60 + Math.random() * 80) {
    bgBuildings.push({
      wx: x,
      w: 50 + Math.random() * 80,
      h: 80 + Math.random() * 200,
      color: `hsl(${220 + Math.random()*30}, ${15 + Math.random()*15}%, ${10 + Math.random()*12}%)`
    });
  }
}

function drawBackground(camX) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#0a0020');
  skyGrad.addColorStop(0.6, '#1a0840');
  skyGrad.addColorStop(1, '#0d1a30');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Stars (parallax 0.1x)
  ctx.fillStyle = 'white';
  const starSeed = Math.floor(camX * 0.01);
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 173 + starSeed * 7) % W);
    const sy = (i * 97) % (H * 0.7);
    const alpha = 0.3 + ((i * 37) % 10) * 0.07;
    ctx.globalAlpha = alpha;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // Far buildings (parallax 0.3x)
  bgBuildings.forEach(b => {
    const sx = b.wx - camX * 0.3;
    if (sx < -b.w - 10 || sx > W + 10) return;
    ctx.fillStyle = b.color;
    ctx.fillRect(sx, H - b.h - 65, b.w, b.h);

    // Window lights
    for (let wy = H - b.h - 60; wy < H - 70; wy += 18) {
      for (let wx2 = sx + 5; wx2 < sx + b.w - 10; wx2 += 14) {
        if ((Math.floor(wx2 / 14) + Math.floor(wy / 18) + Math.floor(camX / 50)) % 3 !== 0) {
          ctx.fillStyle = 'rgba(255,240,160,0.35)';
          ctx.fillRect(wx2, wy, 8, 10);
        }
      }
    }
  });

  // Ground
  const groundGrad = ctx.createLinearGradient(0, CFG.groundY - 10, 0, H);
  groundGrad.addColorStop(0, '#1a1a2e');
  groundGrad.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, CFG.groundY, W, H - CFG.groundY);

  // Ground line
  ctx.beginPath();
  ctx.moveTo(0, CFG.groundY);
  ctx.lineTo(W, CFG.groundY);
  ctx.strokeStyle = '#2a2a4a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ground detail — tiles
  ctx.strokeStyle = 'rgba(60,60,90,0.3)';
  ctx.lineWidth = 1;
  const tileOffset = (camX * 0.7) % 60;
  for (let tx = -tileOffset; tx < W; tx += 60) {
    ctx.beginPath();
    ctx.moveTo(tx, CFG.groundY);
    ctx.lineTo(tx, H);
    ctx.stroke();
  }
}

// ─── PORTAL ───────────────────────────────────────────────────────────────────
function drawPortal(camX) {
  portalPhase += 0.04;
  const sx = levelEndX - camX;
  const sy = CFG.groundY;

  if (Math.abs(sx) > W + 100) return;

  for (let r = 50; r > 10; r -= 10) {
    const hue = (portalPhase * 60 + r * 3) % 360;
    ctx.beginPath();
    ctx.arc(sx, sy - 50, r, 0, Math.PI*2);
    ctx.strokeStyle = `hsla(${hue},100%,70%,${0.15 + (50-r)/80})`;
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT LEVEL', sx, sy - 115);
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawWebProjectiles(camX) {
  webProjectiles.forEach(w => {
    const sx = w.wx - camX;
    // Glow
    const g = ctx.createRadialGradient(sx, w.y, 0, sx, w.y, w.r + 6);
    g.addColorStop(0, 'rgba(150,230,255,0.7)');
    g.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(sx, w.y, w.r + 6, 0, Math.PI*2);
    ctx.fillStyle = g; ctx.fill();
    // Ball
    ctx.beginPath(); ctx.arc(sx, w.y, w.r, 0, Math.PI*2);
    ctx.fillStyle = '#c0f0ff'; ctx.fill();
    ctx.strokeStyle = '#40c0ff'; ctx.lineWidth = 2; ctx.stroke();
    // Web cross
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx - w.r + 2, w.y); ctx.lineTo(sx + w.r - 2, w.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, w.y - w.r + 2); ctx.lineTo(sx, w.y + w.r - 2); ctx.stroke();
  });
}

function drawShootButton() {
  const { x, y, w, h } = SHOOT_BTN;
  const ready = webShootCooldown === 0;
  const cx = x + w / 2, cy = y + h / 2;

  // Background
  ctx.fillStyle = ready ? 'rgba(0,180,255,0.25)' : 'rgba(0,80,120,0.2)';
  ctx.strokeStyle = ready ? '#00ccff' : '#006688';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();

  // Cooldown fill
  if (!ready) {
    const frac = 1 - webShootCooldown / 22;
    ctx.fillStyle = 'rgba(0,180,255,0.18)';
    ctx.beginPath(); ctx.roundRect(x, y + h * (1 - frac), w, h * frac, 12); ctx.fill();
  }

  // Icon + label
  ctx.fillStyle = ready ? '#ffffff' : 'rgba(255,255,255,0.4)';
  ctx.font = 'bold 13px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🕸 SHOOT', cx, cy - 6);
  ctx.font = '10px Arial';
  ctx.fillStyle = ready ? 'rgba(200,240,255,0.9)' : 'rgba(150,180,200,0.5)';
  ctx.fillText('SPACE / TAP', cx, cy + 10);
}

function drawHUD() {
  // Score
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.roundRect(10, 10, 160, 44, 8);
  ctx.fill();
  ctx.fillStyle = '#ffe040';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`SCORE: ${score}`, 20, 15);
  ctx.fillStyle = '#ccc';
  ctx.font = '12px Arial';
  ctx.fillText(`LEVEL ${level}`, 20, 34);

  // Lives
  for (let i = 0; i < 3; i++) {
    const sx = W - 30 - i * 32;
    ctx.beginPath();
    ctx.arc(sx, 26, 10, 0, Math.PI*2);
    ctx.fillStyle = i < lives ? '#ff3333' : '#333';
    ctx.fill();
    ctx.strokeStyle = i < lives ? '#ff8888' : '#555';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Controls hint (only shown briefly)
  if (hintTimer > 0) {
    hintTimer--;
    ctx.fillStyle = `rgba(255,255,255,${hintTimer/120 * 0.7})`;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('HOLD to swing · RELEASE to fly · Avoid obstacles!', W/2, H - 10);
  }
}

let hintTimer = 240;

// ─── TITLE SCREEN ─────────────────────────────────────────────────────────────
let titlePhase = 0;

function drawTitle() {
  titlePhase += 0.03;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#050010');
  grad.addColorStop(1, '#0a1530');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Stars
  ctx.fillStyle = 'white';
  for (let i = 0; i < 100; i++) {
    const x = (i * 173) % W;
    const y = (i * 97) % H;
    ctx.globalAlpha = 0.2 + ((i * 37) % 10) * 0.08;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // Logo glow
  const cx = W / 2;
  const logoGlow = ctx.createRadialGradient(cx, 160, 0, cx, 160, 200);
  logoGlow.addColorStop(0, 'rgba(30,100,255,0.4)');
  logoGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = logoGlow;
  ctx.fillRect(cx - 200, 0, 400, 320);

  // Title
  ctx.save();
  ctx.translate(cx, 140 + Math.sin(titlePhase) * 6);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  ctx.fillStyle = 'rgba(0,50,200,0.6)';
  ctx.font = 'bold 72px Arial Black, Arial';
  ctx.fillText('SWING', 3, -23);
  ctx.fillText('HERO', 3, 55);

  // Main text
  const titleGrad = ctx.createLinearGradient(-160, -60, 160, 60);
  titleGrad.addColorStop(0, '#60b0ff');
  titleGrad.addColorStop(0.5, '#ffffff');
  titleGrad.addColorStop(1, '#ff4040');
  ctx.fillStyle = titleGrad;
  ctx.font = 'bold 72px Arial Black, Arial';
  ctx.fillText('SWING', 0, -25);
  ctx.fillText('HERO', 0, 53);

  ctx.restore();

  // Animated web line from title
  ctx.strokeStyle = 'rgba(150,220,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const webX = cx + Math.sin(titlePhase * 1.2) * 30;
  ctx.moveTo(webX, 80);
  ctx.quadraticCurveTo(webX - 20, 130, webX + 10, 180);
  ctx.stroke();

  // Mini hero figure
  const heroX = cx + Math.sin(titlePhase) * 80;
  const heroY = 240 + Math.sin(titlePhase * 1.5) * 20;
  ctx.beginPath();
  ctx.arc(heroX, heroY, 16, 0, Math.PI*2);
  ctx.fillStyle = '#1560e8';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(heroX, heroY - 8, 11, 0, Math.PI*2);
  ctx.fillStyle = '#e82020';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(heroX - 3.5, heroY - 9, 3, 4, -0.25, 0, Math.PI*2);
  ctx.ellipse(heroX + 3.5, heroY - 9, 3, 4, 0.25, 0, Math.PI*2);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Start button
  const btnW = 220, btnH = 54;
  const btnX = cx - btnW/2, btnY = 310;
  const btnPulse = 0.85 + Math.sin(titlePhase * 3) * 0.15;

  ctx.save();
  ctx.translate(cx, btnY + btnH/2);
  ctx.scale(btnPulse, btnPulse);
  ctx.translate(-cx, -(btnY + btnH/2));

  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#3080ff');
  btnGrad.addColorStop(1, '#1040cc');
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 27);
  ctx.fillStyle = btnGrad;
  ctx.fill();
  ctx.strokeStyle = '#80c0ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = 'white';
  ctx.font = 'bold 22px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bestLevel > 1 ? `▶  CONTINUE — LV ${bestLevel}` : '▶  TAP TO PLAY', cx, btnY + btnH/2);
  ctx.restore();

  // Best stats
  if (bestLevel > 1 || bestScore > 0) {
    ctx.fillStyle = 'rgba(255,220,100,0.85)';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Best: Level ${bestLevel} · Score ${bestScore}`, cx, 365);
  }

  // Tagline
  ctx.fillStyle = 'rgba(180,200,255,0.7)';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Swing through the city · Avoid enemies · Defeat the Dark Goo Monster!', cx, 385);

  // Controls
  ctx.fillStyle = 'rgba(140,160,200,0.6)';
  ctx.font = '12px Arial';
  ctx.fillText('HOLD = swing longer  ·  RELEASE = fly  ·  DODGE = survive', cx, 410);
}

// ─── LEVEL COMPLETE SCREEN ────────────────────────────────────────────────────
let adPhase = 0;

function drawLevelComplete() {
  adPhase += 0.04;

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);

  const cx = W/2, cy = H/2;

  // Panel
  ctx.fillStyle = '#0d1a40';
  ctx.strokeStyle = '#3060cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - 200, cy - 160, 400, 320, 16);
  ctx.fill();
  ctx.stroke();

  // Level complete text
  const lcGrad = ctx.createLinearGradient(cx-150, cy-130, cx+150, cy-90);
  lcGrad.addColorStop(0, '#ffe040');
  lcGrad.addColorStop(1, '#ffaa00');
  ctx.fillStyle = lcGrad;
  ctx.font = 'bold 32px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEVEL COMPLETE!', cx, cy - 110);

  // Stars earned (1-3 based on score)
  const stars = lives >= 3 ? 3 : lives >= 2 ? 2 : 1;
  for (let i = 0; i < 3; i++) {
    const sx = cx - 50 + i * 50;
    const scale = i < stars ? 1.3 + Math.sin(adPhase * 3 + i) * 0.1 : 0.8;
    ctx.save();
    ctx.translate(sx, cy - 55);
    ctx.scale(scale, scale);
    drawStar(0, 0, 18, i < stars ? '#ffe040' : '#333', i < stars ? '#cc9900' : '#222');
    ctx.restore();
  }

  // Score
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(`Score: ${score}`, cx, cy + 5);

  // Ad placeholder (reward area)
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.roundRect(cx - 170, cy + 30, 340, 70, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(200,220,255,0.5)';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('🎁  REWARD — Watch ad for +1 life!', cx, cy + 55);
  ctx.font = '11px Arial';
  ctx.fillStyle = 'rgba(150,170,200,0.5)';
  ctx.fillText('(Ad slot — integrate your ad SDK here)', cx, cy + 74);

  // Continue button with countdown
  const remaining = Math.ceil((adDuration - adTimer) / 60);
  const canContinue = adTimer > adDuration * 0.4;
  const btnColor = canContinue ? '#22cc44' : '#446688';

  ctx.fillStyle = btnColor;
  ctx.beginPath();
  ctx.roundRect(cx - 100, cy + 115, 200, 46, 23);
  ctx.fill();

  ctx.fillStyle = canContinue ? 'white' : 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 18px Arial';
  ctx.textBaseline = 'middle';
  ctx.fillText(canContinue ? 'CONTINUE  ▶' : `Continue in ${remaining}...`, cx, cy + 138);
}

function drawStar(x, y, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    if (i === 0) ctx.moveTo(x + Math.cos(angle)*radius, y + Math.sin(angle)*radius);
    else ctx.lineTo(x + Math.cos(angle)*radius, y + Math.sin(angle)*radius);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ─── WIN SCREEN ────────────────────────────────────────────────────────────────
let winPhase = 0;

function drawWin() {
  winPhase += 0.03;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#050020');
  grad.addColorStop(1, '#100030');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Confetti
  for (let i = 0; i < 60; i++) {
    const x = (i * 173 + Math.floor(winPhase * 40)) % W;
    const y = ((i * 97 + Math.floor(winPhase * 20) * 7) % H);
    ctx.fillStyle = `hsl(${i*30},100%,65%)`;
    ctx.fillRect(x, y, 6, 6);
  }

  const cx = W/2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // YOU WIN
  ctx.save();
  ctx.translate(cx, 130 + Math.sin(winPhase) * 5);
  const wGrad = ctx.createLinearGradient(-180, -30, 180, 30);
  wGrad.addColorStop(0, '#ffe040');
  wGrad.addColorStop(0.5, '#ffffff');
  wGrad.addColorStop(1, '#ff4080');
  ctx.fillStyle = wGrad;
  ctx.font = 'bold 80px Arial Black, Arial';
  ctx.fillText('YOU WIN!', 0, 0);
  ctx.restore();

  ctx.fillStyle = 'rgba(200,220,255,0.9)';
  ctx.font = 'bold 24px Arial';
  ctx.fillText('The Dark Goo Monster is defeated!', cx, 210);

  ctx.fillStyle = '#ffe040';
  ctx.font = 'bold 28px Arial';
  ctx.fillText(`Final Score: ${score}`, cx, 270);

  // Trophy
  ctx.font = '70px serif';
  ctx.fillText('🏆', cx, 350);

  // Play again
  const bPulse = 0.9 + Math.sin(winPhase * 4) * 0.1;
  ctx.save();
  ctx.translate(cx, 430);
  ctx.scale(bPulse, bPulse);
  ctx.fillStyle = '#ffe040';
  ctx.beginPath();
  ctx.roundRect(-110, -26, 220, 52, 26);
  ctx.fill();
  ctx.fillStyle = '#330000';
  ctx.font = 'bold 20px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶  PLAY AGAIN', 0, 0);
  ctx.restore();
}

// ─── GAME OVER SCREEN ─────────────────────────────────────────────────────────
let goPhase = 0;

function drawGameOver() {
  goPhase += 0.03;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);

  const cx = W/2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.save();
  ctx.translate(cx, 160 + Math.sin(goPhase) * 4);
  ctx.fillStyle = '#ff3333';
  ctx.font = 'bold 70px Arial Black, Arial';
  ctx.fillText('GAME OVER', 0, 0);
  ctx.restore();

  ctx.fillStyle = 'rgba(200,200,220,0.8)';
  ctx.font = '22px Arial';
  ctx.fillText(`Score: ${score}`, cx, 260);

  // Retry button
  const bPulse = 0.9 + Math.sin(goPhase * 4) * 0.1;
  ctx.save();
  ctx.translate(cx, 340);
  ctx.scale(bPulse, bPulse);
  ctx.fillStyle = '#cc2222';
  ctx.beginPath();
  ctx.roundRect(-110, -26, 220, 52, 26);
  ctx.fill();
  ctx.strokeStyle = '#ff6666';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('▶  TRY AGAIN', 0, 0);
  ctx.restore();
}

// ─── GAME FLOW ────────────────────────────────────────────────────────────────
function startLevel(lvl) {
  level = lvl;
  generateLevel(lvl);
  generateBuildings();
  player.reset(100);
  player.autoAttach(anchors);  // grab first anchor automatically
  camX = 0;
  particles = [];
  portalPhase = 0;
  hintTimer = 240;
  gs = 'PLAYING';

  const msg = lvl === 1  ? 'Level 1! Swing through the city!'
            : lvl === 5  ? 'Level 5! Halfway there! Stay sharp!'
            : lvl === 9  ? 'Level 9! The Dark Goo Monster awaits!'
            : `Level ${lvl}! Keep swinging!`;
  setTimeout(() => playVoice(msg), 300);
}

function startBoss() {
  level = 10;
  generateBuildings();
  // More anchors so player can swing around the arena
  anchors = [
    new Anchor(250, 70),
    new Anchor(480, 55),
    new Anchor(700, 75),
    new Anchor(920, 60),
    new Anchor(1100, 80),
    new Anchor(350, 110),
    new Anchor(650, 100),
    new Anchor(850, 90),
  ];
  obstacles = [];
  coins = [];
  player.reset(100);
  player.autoAttach(anchors);
  camX = 0;
  particles = [];
  boss.init(750);
  webProjectiles = [];
  webShootCooldown = 0;
  levelEndX = 99999;
  gs = 'BOSS';
}

function resetGame() {
  score = 0;
  lives = 3;
  bossHP = 10;
  // retryLevel is already set when game over occurred — never goes back further
  if (retryLevel >= 10) {
    startBoss(); // level 10 = boss
  } else {
    startLevel(retryLevel);
  }
}

// ─── MAIN UPDATE ──────────────────────────────────────────────────────────────
function update() {
  tickInput();

  if (gs === 'TITLE') {
    if (input.justDown) {
      retryLevel = bestLevel; // resume from the highest level reached
      resetGame();
      playSfx('levelup');
    }
    return;
  }

  if (gs === 'WIN' || gs === 'GAMEOVER') {
    const _sb = document.getElementById('wb-sw-share');
    if(_sb && _sb.style.display==='none'){
      _sb.style.display='block';
      _sb.onclick=()=>{ if(window.WackyShare) WackyShare.show('Swing Man', gs==='WIN'?`I beat Swing Man with score ${score}!`:`I scored ${score} in Swing Man!`, 'https://wackybrains.com/Swing%20Man/'); };
    }
    if (input.justDown) { if(_sb)_sb.style.display='none'; resetGame(); }
    return;
  }

  if (gs === 'LEVEL_COMPLETE') {
    adTimer++;
    if (input.justDown && adTimer > adDuration * 0.4) {
      adTimer = 0;
      if (level < 9) {
        startLevel(level + 1);
        playSfx('levelup');
      } else {
        startBoss(); // level 10 = boss
      }
      if (level > bestLevel || score > bestScore) {
        bestLevel = Math.max(bestLevel, level);
        bestScore = Math.max(bestScore, score);
        wbSave({ bestLevel, bestScore });
      }
    }
    return;
  }

  if (gs === 'BOSS') {
    anchors.forEach(a => a.update());
    player.update(anchors);
    boss.update();
    updateParticles();
    updateCamera(player.wx);

    // ── Web shooting ──
    if (webShootCooldown > 0) webShootCooldown--;

    if (input.justShoot && webShootCooldown === 0 && player.alive && !boss.dead) {
      const dx = boss.wx - player.wx;
      const dy = boss.y  - player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      webProjectiles.push({
        wx: player.wx, y: player.y,
        vx: (dx / dist) * 14,
        vy: (dy / dist) * 14,
        life: 80, r: 7
      });
      playSfx('attach');
      webShootCooldown = 22; // ~0.37s between shots
    }

    // Move web shots, check boss hit
    webProjectiles = webProjectiles.filter(w => {
      w.wx += w.vx;
      w.y  += w.vy;
      w.life--;
      const dx = w.wx - boss.wx, dy = w.y - boss.y;
      if (Math.sqrt(dx*dx + dy*dy) < 80) {
        boss.hp--;
        boss.hitFlash = 20;
        playSfx('bosshit');
        spawnParticles(w.wx, w.y, '#aaffff', 8);
        if (boss.hp <= 0) {
          boss.dead = true;
          playSfx('win');
          spawnParticles(boss.wx, boss.y, '#ff00ff', 40);
          bestScore = Math.max(bestScore, score);
          bestLevel = 1; // game completed — start fresh next time
          wbSave({ bestLevel, bestScore });
          setTimeout(() => playVoice('You defeated the Dark Goo Monster! You are the Swing Hero!'), 500);
          setTimeout(() => { gs = 'WIN'; }, 2000);
        }
        return false; // remove projectile on hit
      }
      return w.life > 0;
    });

    if (!player.alive) {
      lives--;
      if (lives <= 0) {
        retryLevel = level;
        gs = 'GAMEOVER';
        if (score > bestScore) { bestScore = score; wbSave({ bestLevel, bestScore }); }
        playSfx('death');
        setTimeout(() => playVoice('Game over! Try again!'), 300);
      } else {
        player.reset(80);
        player.invincible = 120;
      }
    }
    return;
  }

  // ── PLAYING ──
  anchors.forEach(a => a.update());
  obstacles.forEach(o => o.update());
  coins.forEach(c => c.update());
  player.update(anchors);
  updateParticles();
  updateCamera(player.wx);

  // Obstacle collision
  if (player.invincible === 0) {
    for (const o of obstacles) {
      if (!o.alive) continue;
      if (o.checkHit(player.wx, player.y, CFG.playerR - 4)) {
        player.getHit();
        break;
      }
    }
  }

  // Coin collection
  coins.forEach(c => {
    if (!c.collected && c.checkHit(player.wx, player.y, CFG.playerR)) {
      c.collected = true;
      score += 50;
      playSfx('coin');
      spawnParticles(c.wx, c.y, '#ffe040', 6);
    }
  });

  // Progress score
  score += Math.floor(player.vx * 0.05);

  // Level end check
  if (player.wx > levelEndX) {
    gs = 'LEVEL_COMPLETE';
    adTimer = 0;
    score += 500 + lives * 100;
    playSfx('levelup');
    setTimeout(() => playVoice('Level complete! Amazing swinging!'), 200);
  }

  // Player death
  if (!player.alive) {
    lives--;
    playSfx('death');
    if (lives <= 0) {
      retryLevel = level; // always restart on the same level
      gs = 'GAMEOVER';
      if (score > bestScore) { bestScore = score; wbSave({ bestLevel, bestScore }); }
      setTimeout(() => playVoice('Game over! Try again!'), 300);
    } else {
      player.reset(Math.max(100, player.wx - 200));
      player.autoAttach(anchors);
      player.invincible = 120;
    }
  }
}

// ─── MAIN DRAW ────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  if (gs === 'TITLE') { drawTitle(); return; }
  if (gs === 'WIN')   { drawWin(); return; }
  if (gs === 'GAMEOVER') {
    // Draw playing world behind
    drawBackground(camX);
    drawParticles(camX);
    player.draw(camX);
    drawGameOver();
    return;
  }

  drawBackground(camX);

  if (gs !== 'BOSS') {
    drawPortal(camX);
    coins.filter(c => !c.collected).forEach(c => c.draw(camX));
    obstacles.forEach(o => o.draw(camX));
  }

  anchors.forEach(a => a.draw(camX));
  drawParticles(camX);
  player.draw(camX);

  if (gs === 'BOSS') {
    boss.draw(camX);
    drawWebProjectiles(camX);
    drawShootButton();
  }

  drawHUD();

  if (gs === 'LEVEL_COMPLETE') {
    drawLevelComplete();
  }
}

// ─── LOOP ─────────────────────────────────────────────────────────────────────
let lastTime = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 16.67, 3);
  lastTime = ts;
  update();
  draw();
  requestAnimationFrame(loop);
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────
requestAnimationFrame(loop);
