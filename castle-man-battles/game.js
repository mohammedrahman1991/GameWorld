'use strict';

// ================================================================
// CANVAS SETUP
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CW = 1200;
const CH = 700;
canvas.width = CW;
canvas.height = CH;

// Scale canvas to fit window while maintaining aspect ratio
function resizeCanvas() {
  const scaleX = window.innerWidth / CW;
  const scaleY = window.innerHeight / CH;
  const scale = Math.min(scaleX, scaleY);
  canvas.style.width = CW * scale + 'px';
  canvas.style.height = CH * scale + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ================================================================
// CONSTANTS
// ================================================================
const GRAVITY    = 0.55;
const JUMP_FORCE = -13;
const MOVE_SPEED = 4.5;
const GROUND_Y   = 575;
const BLOCK_SZ   = 28;   // castle block size
const PLACE_SZ   = 56;   // player-placed block size (2× castle)

const WEAPONS = {
  sword:    { name:'Sword',    color:'#aaaaff', damage:25, range:65,  cooldown:500,  ammo:-1, type:'melee',    speed:0,  spread:0  },
  pistol:   { name:'Pistol',   color:'#888888', damage:22, range:420, cooldown:600,  ammo:30, type:'ranged',   speed:13, spread:0  },
  smg:      { name:'SMG',      color:'#555555', damage:10, range:320, cooldown:130,  ammo:90, type:'ranged',   speed:15, spread:0  },
  shotgun:  { name:'Shotgun',  color:'#664433', damage:35, range:220, cooldown:900,  ammo:24, type:'ranged',   speed:10, spread:5  },
  launcher: { name:'Launcher', color:'#445566', damage:85, range:520, cooldown:1500, ammo:5,  type:'explosive',speed:8,  spread:0  },
};

// ================================================================
// VOICE (Web Speech API — deep male voice)
// ================================================================
// VOICE — natural male, fun lines
// ================================================================
const DEATH_QUIPS = [
  "Oof. That one hurt.",
  "My castle! MY BEAUTIFUL CASTLE!",
  "You got me. Don't get cocky.",
  "I slipped on the snow. That's my excuse.",
  "This is fine. Everything is fine.",
  "I'll be back. Probably.",
  "Did you just use a sword? In this economy?",
  "Respawning... with REVENGE in my heart.",
];
const BLUE_WIN_LINES = [
  "Blue wins! Red never stood a chance!",
  "Blue team, let's gooo!",
  "Blue wins! Someone call Red a doctor.",
  "The blue side is victorious. As always.",
];
const RED_WIN_LINES = [
  "Red wins! Blue is going home crying!",
  "Red team dominates! Unstoppable!",
  "Red wins! That castle crumbled like a cookie.",
  "The red side wins. Better luck next time, Blue.",
];
const TIE_LINES = [
  "It's a tie! Nobody wins. Nobody loses. Everybody cries.",
  "A tie? Really? You two need to try harder.",
  "Tie game! Both of you go home and think about what you've done.",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u    = new SpeechSynthesisUtterance(text);
  u.volume   = 1;
  u.rate     = 1.05;   // slightly faster = more natural
  u.pitch    = 1.0;    // normal pitch — not robotic low
  // Pick the most natural-sounding English voice available
  const voices = window.speechSynthesis.getVoices();
  const pref = voices.find(v => /samantha|karen|daniel|moira|fiona|tom|reed|evan|aaron/i.test(v.name) && /en/i.test(v.lang))
            || voices.find(v => /en[-_]US|en[-_]GB|en[-_]AU/i.test(v.lang) && !v.name.includes('Google'))
            || voices.find(v => /en/i.test(v.lang));
  if (pref) u.voice = pref;
  window.speechSynthesis.speak(u);
}
// Pre-load voices
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices());
}

// ================================================================
// PIXEL ART — 10x14 character sprite (0 = transparent)
// 1=body 2=eye/face 3=dark
// ================================================================
const SPRITE = [
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,0],
  [0,1,2,1,1,1,1,2,1,0],
  [0,1,1,1,2,2,1,1,1,0],
  [0,0,1,1,1,1,1,1,0,0],
  [0,1,3,1,1,1,1,3,1,0],
  [1,1,1,1,1,1,1,1,1,1],
  [1,3,1,1,1,1,1,1,3,1],
  [0,1,1,1,1,1,1,1,1,0],
  [0,0,1,1,0,0,1,1,0,0],
  [0,0,1,1,0,0,1,1,0,0],
  [0,0,3,1,0,0,1,3,0,0],
  [0,0,3,3,0,0,3,3,0,0],
];

const PAL_BLUE   = { 1:'#4488ff', 2:'#ffffff', 3:'#2244bb' };
const PAL_RED    = { 1:'#ff4444', 2:'#ffffff', 3:'#bb2222' };
const PAL_ZOMBIE = { 1:'#44aa44', 2:'#ffff00', 3:'#226622' };

function drawSprite(px, py, scale, pal, flipX) {
  ctx.save();
  if (flipX) {
    ctx.translate(px + SPRITE[0].length * scale, 0);
    ctx.scale(-1, 1);
    px = 0;
  }
  for (let r = 0; r < SPRITE.length; r++) {
    for (let c = 0; c < SPRITE[r].length; c++) {
      const ci = SPRITE[r][c];
      if (!ci) continue;
      ctx.fillStyle = pal[ci];
      ctx.fillRect(px + c * scale, py + r * scale, scale, scale);
    }
  }
  ctx.restore();
}

// ================================================================
// UTILITY DRAW HELPERS
// ================================================================
function fillRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function strokeRect(x, y, w, h, color, lw) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw || 1;
  ctx.strokeRect(x, y, w, h);
}
function fillText(str, x, y, size, color, align) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align || 'center';
  ctx.fillText(str, x, y);
}
function btn(label, x, y, w, h, hovered) {
  fillRect(x, y, w, h, hovered ? '#223366' : '#111133');
  strokeRect(x, y, w, h, hovered ? '#6699ff' : '#334466', 2);
  fillText(label, x + w / 2, y + h / 2 + 7, 17, '#ffffff');
}
function hover(x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

// ================================================================
// INPUT
// ================================================================
const keys = {};
let mx = 0, my = 0, mclick = false, mrclick = false;

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  const scaleX = CW / r.width;
  const scaleY = CH / r.height;
  mx = (e.clientX - r.left) * scaleX;
  my = (e.clientY - r.top)  * scaleY;
});
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  const scaleX = CW / r.width;
  const scaleY = CH / r.height;
  mx = (e.clientX - r.left) * scaleX;
  my = (e.clientY - r.top)  * scaleY;
  mclick = true;
});
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  const scaleX = CW / r.width;
  const scaleY = CH / r.height;
  mx = (e.clientX - r.left) * scaleX;
  my = (e.clientY - r.top)  * scaleY;
  mrclick = true;
});
document.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    if (gameState === 'battle' || gameState === 'zombie') paused = !paused;
    if (gameState === 'zombie_select') gameState = 'title';
  }
});

// ================================================================
// GAME STATE
// ================================================================
let gameState  = 'title'; // title | zombie_select | battle | zombie
let gameMode   = null;
let paused     = false;
let gameOver   = false;
let goMessage  = '';
let lastTime   = 0;
let score      = { blue: 0, red: 0 };
let zombieKills = 0;

// Per-mode timers
let battleTimeLeft  = 15 * 60 * 1000; // ms
let zombieElapsed   = 0;

// Entity arrays (reset on new game)
let players      = [];
let projectiles  = [];
let zombies      = [];
let weaponDrops  = [];
let fallingCrates = [];
let chests       = [];
let blocks       = [];
let platforms    = [];
let poisonBalls  = [];
let explosions   = [];
let snowflakes   = [];
let leftCastleX  = 30;
let rightCastleX = CW - 30 - 10 * BLOCK_SZ;
let plane        = null;
let planeTimer   = 20000;
let zombieSpawnT = 3000;
let poisonT      = 30000;
let showPoisonWarn = false;

// ================================================================
// CASTLE BLOCK
// ================================================================
class Block {
  constructor(x, y, playerPlaced = false) {
    this.x = x; this.y = y;
    const sz = playerPlaced ? PLACE_SZ : BLOCK_SZ;
    this.w = sz; this.h = sz;
    this.hp = 100; this.maxHp = 100;
    this.dead = false;
    this.playerPlaced = playerPlaced;
  }
  damage(amt) {
    this.hp -= amt;
    if (this.hp <= 0) this.dead = true;
  }
  draw() {
    if (this.dead) return;
    const pct = this.hp / this.maxHp;

    // Stone base — warms to orange-red as damaged
    const stone  = this.playerPlaced
      ? (pct > 0.66 ? '#7a9a88' : pct > 0.33 ? '#88774a' : '#664433')
      : (pct > 0.66 ? '#6e7d8e' : pct > 0.33 ? '#886655' : '#664433');
    const mortar = pct > 0.66 ? '#4a5a6a' : '#3a2a18';
    const hilite = pct > 0.66 ? '#9aaabb' : '#998866';

    fillRect(this.x, this.y, this.w, this.h, stone);

    // Brick mortar grid — all positions proportional to block size
    const hw = this.w / 2, hh = this.h / 2;
    ctx.fillStyle = mortar;
    ctx.fillRect(this.x,           this.y + hh - 1, this.w, 2);  // horizontal mortar
    const row = Math.round(this.y / BLOCK_SZ);
    const vx  = (row % 2 === 0) ? this.x + hw : this.x + hw * 0.5;
    ctx.fillRect(vx, this.y,          2, hh - 1); // upper vertical mortar
    ctx.fillRect(vx, this.y + hh + 1, 2, hh - 1); // lower vertical mortar

    // Left + top edge highlight
    fillRect(this.x,     this.y + 5, 2, this.h - 5, hilite);
    fillRect(this.x + 2, this.y + 5, this.w - 4, 2, hilite);

    // Snow cap (top 5px, full width)
    fillRect(this.x,     this.y,     this.w,     5, '#cce4f8');
    fillRect(this.x + 1, this.y,     this.w - 2, 2, '#ffffff');
    // Snow drips at corners
    fillRect(this.x,              this.y + 5, 4, 3, '#ddf0ff');
    fillRect(this.x + this.w - 4, this.y + 5, 4, 3, '#ddf0ff');

    // Damage cracks — proportional to block size
    if (pct < 0.66) {
      ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + hw*0.4, this.y + hh*0.4);
      ctx.lineTo(this.x + hw*1.3, this.y + hh*1.8);
      ctx.stroke();
    }
    if (pct < 0.33) {
      ctx.beginPath();
      ctx.moveTo(this.x + hw*1.5, this.y + hh*0.3);
      ctx.lineTo(this.x + hw*0.6, this.y + hh*1.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x + 2,  this.y + 11); ctx.lineTo(this.x + 16, this.y + 9);
      ctx.stroke();
    }
  }
}

// ================================================================
// PLAYER
// ================================================================
const CTRL_P1 = { left:'KeyA', right:'KeyD', jump:'KeyW', attack:'KeyF', build:'KeyG' };
const CTRL_P2 = { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:'Slash', build:'Period' };

class Player {
  constructor(x, y, team, ctrl) {
    this.x = x; this.y = y;
    this.w = 30; this.h = 42;
    this.vx = 0; this.vy = 0;
    this.team = team;
    this.ctrl = ctrl;
    this.onGround = false;
    this.hp = 100; this.maxHp = 100;
    this.weapon = 'sword';
    this.ammo = { sword:-1, pistol:0, smg:0, shotgun:0, launcher:0 };
    this.atkCD = 0;
    this.blockCount = 40;
    this.buildCD = 0;
    this.facingR = team === 'red';
    this.alive = true;
    this.respawnT = 0;
    this.hitFlash = 0;
    this.kills = 0;
  }

  update(dt) {
    if (!this.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return;
    }

    const left   = keys[this.ctrl.left];
    const right  = keys[this.ctrl.right];
    const jump   = keys[this.ctrl.jump];
    const attack = keys[this.ctrl.attack];
    const build  = keys[this.ctrl.build];

    if (left)       { this.vx = -MOVE_SPEED; this.facingR = false; }
    else if (right) { this.vx =  MOVE_SPEED; this.facingR = true;  }
    else            { this.vx *= 0.75; }

    if (jump && this.onGround) { this.vy = JUMP_FORCE; this.onGround = false; }

    if (build && this.buildCD <= 0 && this.blockCount > 0) {
      this.quickPlaceBlock();
    }

    if (attack && this.atkCD <= 0) {
      this.doAttack();
      this.atkCD = WEAPONS[this.weapon].cooldown;
    }

    this.vy += GRAVITY;
    this.x  += this.vx;
    this.y  += this.vy;

    this.resolveCollisions();

    this.x = Math.max(0, Math.min(CW - this.w, this.x));
    if (this.atkCD   > 0) this.atkCD   -= dt;
    if (this.buildCD > 0) this.buildCD -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  resolveCollisions() {
    this.onGround = false;

    // Ground
    if (this.y + this.h >= GROUND_Y) {
      this.y = GROUND_Y - this.h;
      this.vy = 0; this.onGround = true;
    }

    // Platforms
    for (const p of platforms) {
      if (this.vy >= 0 &&
          this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h > p.y && this.y + this.h < p.y + p.h + 12) {
        this.y = p.y - this.h;
        this.vy = 0; this.onGround = true;
      }
    }

    // Blocks
    for (const b of blocks) {
      if (b.dead) continue;
      if (this.x + this.w > b.x && this.x < b.x + b.w &&
          this.y + this.h > b.y && this.y  < b.y + b.h) {
        const oL = (this.x + this.w) - b.x;
        const oR = (b.x + b.w) - this.x;
        const oT = (this.y + this.h) - b.y;
        const oB = (b.y + b.h) - this.y;
        const mn = Math.min(oL, oR, oT, oB);
        if (mn === oT && this.vy >= 0) { this.y = b.y - this.h; this.vy = 0; this.onGround = true; }
        else if (mn === oB && this.vy < 0) { this.y = b.y + b.h; this.vy = 0; }
        else if (mn === oL) { this.x = b.x - this.w; this.vx = 0; }
        else                { this.x = b.x + b.w;   this.vx = 0; }
      }
    }
  }

  doAttack() {
    const w = WEAPONS[this.weapon];
    if (w.type === 'melee') {
      const ax = this.facingR ? this.x + this.w : this.x - w.range;
      for (const p of players) {
        if (p === this || !p.alive) continue;
        if (p.x + p.w > ax && p.x < ax + w.range &&
            p.y + p.h > this.y - 10 && p.y < this.y + this.h + 10) {
          p.hurt(w.damage, this);
        }
      }
      if (gameMode === 'zombie') {
        for (const z of zombies) {
          if (!z.alive) continue;
          if (z.x + z.w > ax && z.x < ax + w.range &&
              z.y + z.h > this.y - 10 && z.y < this.y + this.h + 10) {
            z.hurt(w.damage, this);
          }
        }
      }
      // Melee damages blocks
      for (const b of blocks) {
        if (b.dead) continue;
        if (b.x + b.w > ax && b.x < ax + w.range &&
            b.y + b.h > this.y - 5 && b.y < this.y + this.h + 5) {
          b.damage(w.damage); // full melee damage to blocks
        }
      }
    } else {
      if (this.ammo[this.weapon] === 0) { this.weapon = 'sword'; return; }
      if (this.ammo[this.weapon] > 0) this.ammo[this.weapon]--;
      const dir = this.facingR ? 1 : -1;
      const px = this.facingR ? this.x + this.w + 2 : this.x - 2;
      const py = this.y + this.h * 0.45;
      if (w.spread > 0) {
        for (let i = -2; i <= 2; i++)
          projectiles.push(new Proj(px, py, dir * w.speed, i * 1.8, w, this));
      } else if (w.type === 'explosive') {
        projectiles.push(new Proj(px, py, dir * w.speed, -1.5, w, this, true));
      } else {
        projectiles.push(new Proj(px, py, dir * w.speed, 0, w, this));
      }
    }
  }

  hurt(amt, src) {
    this.hp -= amt;
    this.hitFlash = 220;
    if (this.hp <= 0) this.die(src);
  }

  die(killer) {
    this.alive = false;
    this.respawnT = 3000;
    this.weapon = 'sword';
    this.ammo = { sword:-1, pistol:0, smg:0, shotgun:0, launcher:0 };
    if (killer && killer.team !== this.team) {
      killer.kills++;
      score[killer.team] = (score[killer.team] || 0) + 100;
    }
    speak(pick(DEATH_QUIPS));
  }

  respawn() {
    this.alive = true;
    this.hp = this.maxHp;
    this.weapon = 'sword';
    this.ammo = { sword:-1, pistol:0, smg:0, shotgun:0, launcher:0 };
    if (gameMode === 'zombie') {
      this.x = this.team === 'blue' ? 60  : 110;
      this.y = GROUND_Y - 250;
    } else {
      this.x = this.team === 'blue' ? rightCastleX + BLOCK_SZ + 10 : leftCastleX + BLOCK_SZ + 10;
      this.y = GROUND_Y - 250;
    }
  }

  quickPlaceBlock() {
    if (this.onGround) return; // only usable while in the air
    // Center the big placed block under the player's feet
    const gx = Math.floor((this.x + this.w / 2 - PLACE_SZ / 2) / PLACE_SZ) * PLACE_SZ;
    const gy = Math.floor((this.y + this.h) / PLACE_SZ) * PLACE_SZ;
    if (placeBlockAt(gx, gy, true)) {
      this.blockCount--;
      this.buildCD = 280;
    }
  }

  pickup(weapon, ammo) {
    this.weapon = weapon;
    this.ammo[weapon] = ammo;
  }

  draw() {
    if (!this.alive) return;
    const pal = this.team === 'blue' ? PAL_BLUE : PAL_RED;
    const sc  = 3;

    if (this.hitFlash > 0 && Math.floor(this.hitFlash / 55) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    drawSprite(this.x, this.y, sc, pal, !this.facingR);

    // weapon icon
    this.drawWeapon(sc);

    ctx.globalAlpha = 1;

    // HP bar
    const hpPct = this.hp / this.maxHp;
    const bw = 40;
    fillRect(this.x - 5, this.y - 14, bw, 6, '#330000');
    fillRect(this.x - 5, this.y - 14, bw * hpPct, 6,
      hpPct > 0.5 ? '#00ee44' : hpPct > 0.25 ? '#ffaa00' : '#ff2200');
    strokeRect(this.x - 5, this.y - 14, bw, 6, '#ffffff', 1);

    // weapon name
    fillText(WEAPONS[this.weapon].name, this.x + this.w / 2, this.y - 18, 9, '#ddddff');

    // ammo
    if (this.ammo[this.weapon] >= 0) {
      fillText('x' + this.ammo[this.weapon], this.x + this.w / 2, this.y - 8, 9, '#ffdd88');
    }

    // block count remaining
    fillText(`■ ${this.blockCount}`, this.x + this.w / 2, this.y - 30, 9, '#88ddff');
  }

  drawWeapon(sc) {
    const wx = this.facingR ? this.x + this.w + 1 : this.x - 26;
    const wy = this.y + this.h * 0.45;
    const w  = WEAPONS[this.weapon];
    ctx.fillStyle = w.color;
    switch (this.weapon) {
      case 'sword':
        ctx.fillRect(wx, wy - 2, 22, 4);
        ctx.fillRect(wx + 19, wy - 7, 4, 14);
        ctx.fillStyle = '#ccccff';
        ctx.fillRect(wx + 3,  wy - 1, 16, 2);
        break;
      case 'pistol':
        ctx.fillRect(wx, wy - 3, 16, 6);
        ctx.fillRect(wx + 10, wy - 6, 6, 4);
        break;
      case 'smg':
        ctx.fillRect(wx, wy - 3, 22, 7);
        ctx.fillRect(wx + 14, wy - 7, 8, 4);
        ctx.fillRect(wx + 3,  wy + 4, 6, 9);
        break;
      case 'shotgun':
        ctx.fillRect(wx, wy - 3, 28, 7);
        ctx.fillRect(wx + 22, wy - 6, 6, 4);
        break;
      case 'launcher':
        ctx.fillRect(wx, wy - 5, 30, 10);
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(wx + 24, wy - 7, 6, 14);
        break;
    }
  }
}

// ================================================================
// PROJECTILE
// ================================================================
class Proj {
  constructor(x, y, vx, vy, wep, owner, explosive) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.wep = wep; this.owner = owner;
    this.explosive = !!explosive;
    this.active = true;
    this.dist = 0;
  }

  update(dt) {
    if (!this.active) return;
    if (this.explosive) this.vy += 0.12;
    this.x += this.vx; this.y += this.vy;
    this.dist += Math.abs(this.vx);
    if (this.dist > this.wep.range || this.y > GROUND_Y || this.x < 0 || this.x > CW) {
      if (this.explosive && this.y >= GROUND_Y) this.explode();
      this.active = false; return;
    }
    // players
    for (const p of players) {
      if (p === this.owner || !p.alive) continue;
      if (this.hits(p)) {
        p.hurt(this.wep.damage, this.owner);
        this.explosive ? this.explode() : (this.active = false); return;
      }
    }
    // zombies
    for (const z of zombies) {
      if (!z.alive) continue;
      if (this.hits(z)) {
        z.hurt(this.wep.damage, this.owner);
        this.explosive ? this.explode() : (this.active = false); return;
      }
    }
    // blocks
    for (const b of blocks) {
      if (b.dead) continue;
      if (this.hits(b)) {
        b.damage(this.wep.damage * (this.explosive ? 1.2 : 0.6));
        this.explosive ? this.explode() : (this.active = false); return;
      }
    }
  }

  hits(e) {
    const pw = this.explosive ? 10 : 6, ph = this.explosive ? 10 : 5;
    return this.x + pw > e.x && this.x < e.x + e.w &&
           this.y + ph > e.y && this.y < e.y + e.h;
  }

  explode() {
    explosions.push({ x: this.x, y: this.y, r: 80, life: 500 });
    this.active = false;
    const rad = 80;
    const damage = this.wep.damage;
    const src = this.owner;
    [...players, ...zombies].forEach(e => {
      if (!e.alive) return;
      const dx = e.x + e.w/2 - this.x, dy = e.y + e.h/2 - this.y;
      const d = Math.hypot(dx, dy);
      if (d < rad) e.hurt(damage * (1 - d/rad), src);
    });
    blocks.forEach(b => {
      if (b.dead) return;
      const dx = b.x + b.w/2 - this.x, dy = b.y + b.h/2 - this.y;
      const d = Math.hypot(dx, dy);
      if (d < rad) b.damage(damage * 0.9 * (1 - d/rad));
    });
  }

  draw() {
    if (!this.active) return;
    if (this.explosive) {
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.arc(this.x, this.y, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath(); ctx.arc(this.x - this.vx*2, this.y - this.vy*2, 3, 0, Math.PI*2); ctx.fill();
    } else {
      fillRect(this.x, this.y, 6, 4, this.wep.color);
    }
  }
}

// ================================================================
// ZOMBIE
// ================================================================
class Zombie {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 26; this.h = 40;
    this.vx = -1.6; this.vy = 0;
    this.hp = 65; this.maxHp = 65;
    this.alive = true;
    this.atkCD = 0;
    this.dropWeapon = null;
  }

  update(dt) {
    if (!this.alive) return;
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; }

    for (const b of blocks) {
      if (b.dead) continue;
      if (this.x + this.w > b.x && this.x < b.x + b.w &&
          this.y + this.h > b.y && this.y < b.y + b.h) {
        if (this.atkCD <= 0) { b.damage(8); this.atkCD = 900; }
        this.x = b.x + b.w + 1; this.vx = 0;
        break;
      }
    }

    for (const p of players) {
      if (!p.alive) continue;
      if (Math.abs(this.x - p.x) < 35 && Math.abs(this.y - p.y) < 40) {
        if (this.atkCD <= 0) { p.hurt(15, null); this.atkCD = 900; }
      }
    }

    if (this.atkCD > 0) this.atkCD -= dt;
  }

  hurt(amt, killer) {
    this.hp -= amt;
    if (this.hp <= 0) this.die(killer);
  }

  die(killer) {
    this.alive = false;
    const r = Math.random();
    if      (r < 0.28) this.dropWeapon = 'pistol';
    else if (r < 0.48) this.dropWeapon = 'smg';
    else if (r < 0.62) this.dropWeapon = 'shotgun';
    else if (r < 0.70) this.dropWeapon = 'launcher';
    if (killer) {
      killer.kills++;
      zombieKills++;
      score[killer.team] = (score[killer.team] || 0) + 50;
    }
  }

  draw() {
    if (!this.alive) return;
    const sc = 3;
    drawSprite(this.x, this.y, sc, PAL_ZOMBIE, false);
    const pct = this.hp / this.maxHp;
    fillRect(this.x,           this.y - 8, this.w, 5, '#220000');
    fillRect(this.x,           this.y - 8, this.w * pct, 5, '#00ee44');
    strokeRect(this.x, this.y - 8, this.w, 5, '#ffffff', 1);
  }
}

// ================================================================
// WEAPON DROP
// ================================================================
class WeaponDrop {
  constructor(x, y, weapon) {
    this.x = x - 10; this.y = y;
    this.w = 22; this.h = 22;
    this.weapon = weapon;
    this.vy = -3; this.onGround = false;
    this.bobT = 0; this.collected = false;
    this.ammo = Math.max(WEAPONS[weapon].ammo, 20);
  }

  update(dt, allPlayers) {
    if (this.collected) return;
    if (!this.onGround) {
      this.vy += GRAVITY;
      this.y  += this.vy;
      if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.vy = 0; this.onGround = true; }
    }
    this.bobT += dt;
    for (const p of allPlayers) {
      if (!p.alive) continue;
      if (Math.abs(p.x + p.w/2 - this.x) < 45 && Math.abs(p.y + p.h/2 - this.y) < 55) {
        p.pickup(this.weapon, this.ammo);
        this.collected = true; return;
      }
    }
  }

  draw() {
    if (this.collected) return;
    const bob = Math.sin(this.bobT * 0.004) * 4;
    fillRect(this.x, this.y + bob, this.w, this.h, '#8B6914');
    strokeRect(this.x, this.y + bob, this.w, this.h, '#FFD700', 2);
    fillText(WEAPONS[this.weapon].name.slice(0,3).toUpperCase(), this.x + this.w/2, this.y + bob + 14, 9, '#ffffff');
    ctx.fillStyle = 'rgba(255,215,0,0.18)';
    ctx.fillRect(this.x - 3, this.y + bob - 3, this.w + 6, this.h + 6);
  }
}

// ================================================================
// CHEST
// ================================================================
class Chest {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 28; this.h = 24;
    this.opened = false;
    const r = Math.random();
    if      (r < 0.30) this.contents = { weapon:'pistol',   ammo:30 };
    else if (r < 0.55) this.contents = { weapon:'smg',      ammo:90 };
    else if (r < 0.70) this.contents = { weapon:'shotgun',  ammo:24 };
    else if (r < 0.80) this.contents = { weapon:'launcher', ammo:5  };
    else               this.contents = { weapon:'sword',    ammo:-1 };
  }

  update(dt, allPlayers) {
    if (this.opened) return;
    for (const p of allPlayers) {
      if (!p.alive) continue;
      if (Math.abs(p.x + p.w/2 - (this.x + this.w/2)) < 45 &&
          Math.abs(p.y + p.h   - (this.y + this.h/2)) < 55) {
        p.pickup(this.contents.weapon, this.contents.ammo);
        this.opened = true; return;
      }
    }
  }

  draw() {
    if (this.opened) {
      strokeRect(this.x, this.y, this.w, this.h, '#8B6914', 2); return;
    }
    fillRect(this.x, this.y,          this.w, this.h,     '#8B4513');
    fillRect(this.x, this.y,          this.w, this.h / 2, '#A0622D');
    strokeRect(this.x, this.y,        this.w, this.h,     '#FFD700', 2);
    strokeRect(this.x, this.y + this.h/2 - 1, this.w, 2, '#FFD700', 1);
    fillRect(this.x + this.w/2 - 4, this.y + this.h/2 - 4, 8, 8, '#FFD700');
    const sp = Math.sin(Date.now() * 0.005) > 0.5;
    if (sp) { ctx.fillStyle = 'rgba(255,215,0,0.25)'; ctx.fillRect(this.x-3, this.y-3, this.w+6, this.h+6); }
  }
}

// ================================================================
// PLANE
// ================================================================
class Plane {
  constructor() {
    this.x = -210; this.y = 55;
    this.vx = 3.2; this.w = 110; this.h = 40;
    this.active = true; this.dropped = false;
  }

  update(dt) {
    this.x += this.vx;
    if (this.x > CW + 250) { this.active = false; return null; }
    if (!this.dropped && this.x + this.w/2 > CW/2 - 80) {
      this.dropped = true;
      return { x: this.x + this.w/2, y: this.y + this.h + 2 };
    }
    return null;
  }

  draw() {
    if (!this.active) return;
    // body
    fillRect(this.x, this.y + 12, this.w, 22, '#aaaaaa');
    // nose
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.moveTo(this.x + this.w, this.y + 12);
    ctx.lineTo(this.x + this.w + 28, this.y + 23);
    ctx.lineTo(this.x + this.w, this.y + 34);
    ctx.fill();
    // top wing
    ctx.fillStyle = '#999999';
    ctx.beginPath();
    ctx.moveTo(this.x + 25, this.y + 20);
    ctx.lineTo(this.x + 75, this.y + 20);
    ctx.lineTo(this.x + 55, this.y - 6);
    ctx.fill();
    // windows
    for (let i = 0; i < 4; i++) fillRect(this.x + 8 + i * 20, this.y + 16, 12, 8, '#aaddff');
    // engine
    fillRect(this.x + 38, this.y + 34, 22, 12, '#666666');
    strokeRect(this.x, this.y + 12, this.w, 22, '#333333', 2);
  }
}

// ================================================================
// FALLING CRATE
// ================================================================
class Crate {
  constructor(x, y) {
    this.x = x - 12; this.y = y;
    this.w = 24; this.h = 24;
    this.vy = 1.5; this.landed = false; this.collected = false;
    const ws = ['smg','shotgun','pistol','launcher','pistol','smg'];
    this.weapon = ws[Math.floor(Math.random() * ws.length)];
  }

  update(dt, allPlayers) {
    if (this.collected) return;
    if (!this.landed) {
      this.vy = Math.min(this.vy + 0.06, 5);
      this.y  += this.vy;
      if (this.y + this.h >= GROUND_Y) { this.y = GROUND_Y - this.h; this.landed = true; }
    }
    for (const p of allPlayers) {
      if (!p.alive) continue;
      if (Math.abs(p.x + p.w/2 - (this.x + this.w/2)) < 48 &&
          Math.abs(p.y + p.h/2 - (this.y + this.h/2)) < 55) {
        const ammo = WEAPONS[this.weapon].ammo;
        p.pickup(this.weapon, ammo > 0 ? ammo : 30);
        this.collected = true; return;
      }
    }
  }

  draw() {
    if (this.collected) return;
    if (!this.landed) {
      // parachute
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.x + this.w/2, this.y - 28, 26, Math.PI, 0); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.x + this.w/2 - 26, this.y - 28); ctx.lineTo(this.x + 2,        this.y);
      ctx.moveTo(this.x + this.w/2 + 26, this.y - 28); ctx.lineTo(this.x + this.w - 2, this.y);
      ctx.stroke();
    }
    fillRect(this.x, this.y, this.w, this.h, '#8B6914');
    strokeRect(this.x, this.y, this.w, this.h, '#FFD700', 2);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x+3, this.y+3); ctx.lineTo(this.x+this.w-3, this.y+this.h-3);
    ctx.moveTo(this.x+this.w-3, this.y+3); ctx.lineTo(this.x+3, this.y+this.h-3);
    ctx.stroke();
    fillText(this.weapon.slice(0,3).toUpperCase(), this.x + this.w/2, this.y + this.h + 11, 9, '#ffffff');
  }
}

// ================================================================
// POISON BALL
// ================================================================
class PoisonBall {
  constructor(x, y, tx, ty) {
    this.x = x; this.y = y;
    const spd = 3.5;
    const dist = Math.hypot(tx - x, ty - y);
    this.vx = (tx - x) / dist * spd;
    this.vy = (ty - y) / dist * spd - 5;
    this.active = true;
    this.w = 14; this.h = 14;
  }

  update(dt) {
    if (!this.active) return;
    this.vy += 0.1;
    this.x += this.vx; this.y += this.vy;
    if (this.y > GROUND_Y) { this.active = false; return; }
    for (const p of players) {
      if (!p.alive) continue;
      if (Math.hypot(p.x + p.w/2 - this.x, p.y + p.h/2 - this.y) < 28) {
        p.hurt(20, null); this.active = false; return;
      }
    }
    for (const b of blocks) {
      if (b.dead) continue;
      if (this.x + this.w > b.x && this.x < b.x + b.w &&
          this.y + this.h > b.y && this.y < b.y + b.h) {
        b.damage(28); this.active = false; return;
      }
    }
  }

  draw() {
    if (!this.active) return;
    ctx.fillStyle = 'rgba(0,255,0,0.25)';
    ctx.beginPath(); ctx.arc(this.x, this.y, 11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#44ff44';
    ctx.beginPath(); ctx.arc(this.x, this.y, 7, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#00aa00'; ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ================================================================
// MAP BUILDERS
// ================================================================
function makeBattleMap() {
  blocks = []; platforms = []; chests = [];

  const baseY    = GROUND_Y - BLOCK_SZ;
  const castleH  = 16;
  const castleW  = 10;
  leftCastleX  = 30;
  rightCastleX = CW - 30 - castleW * BLOCK_SZ; // 30 + 200 from right = 970

  function makeCastle(startX) {
    for (let r = 0; r < castleH; r++) {
      for (let c = 0; c < castleW; c++) {
        const isWall       = c === 0 || c === castleW - 1;
        const isRoof       = r === castleH - 1;
        const isBattlement = isRoof && c % 2 === 0; // alternating merlons on top
        if (isWall || isBattlement) {
          blocks.push(new Block(startX + c * BLOCK_SZ, baseY - r * BLOCK_SZ));
        }
      }
    }
  }

  makeCastle(leftCastleX);
  makeCastle(rightCastleX);

  // Interior parkour platforms (3 levels per castle)
  const iw = BLOCK_SZ; // inner offset
  [leftCastleX, rightCastleX].forEach(sx => {
    [4, 8, 12].forEach(lvl => {
      platforms.push({ x: sx + iw, y: baseY - lvl * BLOCK_SZ, w: (castleW - 2) * BLOCK_SZ, h: 10 });
    });
  });

  // Middle arena floating platforms
  platforms.push({ x: 370, y: GROUND_Y - 95,  w: 140, h: 10 });
  platforms.push({ x: 680, y: GROUND_Y - 95,  w: 140, h: 10 });
  platforms.push({ x: 480, y: GROUND_Y - 180, w: 240, h: 10 });
  platforms.push({ x: 520, y: GROUND_Y - 265, w: 160, h: 10 });

  // Chests (spread across map)
  [300, 580, 870, 160, 1000, 495].forEach((cx, i) => {
    chests.push(new Chest(cx, i % 2 === 0 ? GROUND_Y - 24 : GROUND_Y - 98));
  });
}

function makeZombieMap() {
  blocks = []; platforms = [];

  const baseY   = GROUND_Y - BLOCK_SZ;
  const castleH = 18;
  const castleW = 12;
  const startX  = 15;

  for (let r = 0; r < castleH; r++) {
    for (let c = 0; c < castleW; c++) {
      const isWall       = c === 0 || c === castleW - 1;
      const isRoof       = r === castleH - 1;
      const isBattlement = isRoof && c % 2 === 0;
      if (isWall || isBattlement) {
        blocks.push(new Block(startX + c * BLOCK_SZ, baseY - r * BLOCK_SZ));
      }
    }
  }

  // Interior parkour platforms
  const iw = BLOCK_SZ;
  [4, 8, 12, 16].forEach(lvl => {
    platforms.push({ x: startX + iw, y: baseY - lvl * BLOCK_SZ, w: (castleW - 2) * BLOCK_SZ, h: 10 });
  });

  // Outside platforms
  platforms.push({ x: 265, y: GROUND_Y - 95,  w: 120, h: 10 });
  platforms.push({ x: 430, y: GROUND_Y - 155, w: 110, h: 10 });
  platforms.push({ x: 580, y: GROUND_Y - 90,  w: 100, h: 10 });
}

// ================================================================
// INIT MODES
// ================================================================
function initBattle() {
  gameMode = 'battle'; gameState = 'battle';
  paused = false; gameOver = false;
  score = { blue:0, red:0 };
  battleTimeLeft = 15 * 60 * 1000;
  planeTimer = 20000;
  projectiles = []; weaponDrops = []; fallingCrates = [];
  poisonBalls = []; explosions = [];
  makeBattleMap();
  initSnowflakes();
  players = [
    new Player(rightCastleX + BLOCK_SZ + 10, GROUND_Y - 250, 'blue', CTRL_P1),
    new Player(leftCastleX  + BLOCK_SZ + 10, GROUND_Y - 250, 'red',  CTRL_P2),
  ];
}

function initZombie(numP) {
  gameMode = 'zombie'; gameState = 'zombie';
  paused = false; gameOver = false;
  score = { blue:0, red:0 };
  zombieKills = 0; zombieElapsed = 0;
  zombieSpawnT = 3000;
  poisonT = 30000; showPoisonWarn = false;
  projectiles = []; weaponDrops = []; fallingCrates = [];
  poisonBalls = []; explosions = []; chests = [];
  makeZombieMap();
  initSnowflakes();
  zombies = [0,1,2].map(i => new Zombie(CW - 40 - i * 60, GROUND_Y - 50));
  players = [new Player(60, GROUND_Y - 250, 'blue', CTRL_P1)];
  if (numP === 2) players.push(new Player(110, GROUND_Y - 250, 'red', CTRL_P2));
}

// ================================================================
// UPDATE
// ================================================================
function updateBattle(dt) {
  if (paused || gameOver) return;

  battleTimeLeft -= dt;
  if (battleTimeLeft <= 0) {
    gameOver = true;
    const w = score.blue > score.red ? 'BLUE' : score.red > score.blue ? 'RED' : null;
    goMessage = w ? `${w} WINS! (by score)` : "IT'S A TIE!";
    if (w === 'BLUE') speak(pick(BLUE_WIN_LINES));
    else if (w === 'RED') speak(pick(RED_WIN_LINES));
    else speak(pick(TIE_LINES));
    return;
  }

  players.forEach(p => p.update(dt));
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].update(dt);
    if (!projectiles[i].active) projectiles.splice(i, 1);
  }
  chests.forEach(c => c.update(dt, players));
  for (let i = fallingCrates.length - 1; i >= 0; i--) {
    fallingCrates[i].update(dt, players);
    if (fallingCrates[i].collected) fallingCrates.splice(i, 1);
  }
  for (let i = weaponDrops.length - 1; i >= 0; i--) {
    weaponDrops[i].update(dt, players);
    if (weaponDrops[i].collected) weaponDrops.splice(i, 1);
  }

  // Plane
  planeTimer -= dt;
  if (planeTimer <= 0 && !plane) { plane = new Plane(); planeTimer = 30000 + Math.random()*20000; }
  if (plane) {
    const drop = plane.update(dt);
    if (drop) fallingCrates.push(new Crate(drop.x, drop.y));
    if (!plane.active) plane = null;
  }

  // Explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life -= dt;
    if (explosions[i].life <= 0) explosions.splice(i, 1);
  }

  updateSnowflakes(dt);

  // Castle destroyed wins
  const lCastle = blocks.filter(b => b.x < CW/2 && !b.playerPlaced);
  const rCastle = blocks.filter(b => b.x >= CW/2 && !b.playerPlaced);
  if (lCastle.length > 0 && lCastle.every(b => b.dead)) { gameOver = true; goMessage = 'BLUE WINS! Red castle destroyed!'; speak(pick(BLUE_WIN_LINES)); }
  if (rCastle.length > 0 && rCastle.every(b => b.dead)) { gameOver = true; goMessage = 'RED WINS! Blue castle destroyed!'; speak(pick(RED_WIN_LINES)); }

  handleBlockPlacement();
}

function updateZombie(dt) {
  if (paused || gameOver) return;

  zombieElapsed += dt;

  players.forEach(p => p.update(dt));

  for (const z of zombies) {
    z.update(dt);
    if (!z.alive && z.dropWeapon) {
      weaponDrops.push(new WeaponDrop(z.x + z.w/2, z.y, z.dropWeapon));
      z.dropWeapon = null;
    }
  }

  // Spawn
  zombieSpawnT -= dt;
  if (zombieSpawnT <= 0) {
    zombieSpawnT = 3000;
    const dead = zombies.filter(z => !z.alive).length;
    const alive = zombies.filter(z => z.alive).length;
    const max = 10 + Math.floor(zombieElapsed / 60000) * 2;
    const toSpawn = Math.min(dead, 3, max - alive);
    for (let i = 0; i < toSpawn; i++)
      zombies.push(new Zombie(CW - 20 - Math.random() * 120, GROUND_Y - 50));
  }

  // Poison
  poisonT -= dt;
  if (poisonT <= 5000 && !showPoisonWarn) showPoisonWarn = true;
  if (poisonT <= 0) {
    showPoisonWarn = false; poisonT = 30000;
    const cx = 130, cy = GROUND_Y - 160;
    [-40, 0, 40].forEach((off, i) => {
      poisonBalls.push(new PoisonBall(CW - 30 + i*25, 180 + i*40, cx + off, cy));
    });
  }

  for (let i = poisonBalls.length - 1; i >= 0; i--) {
    poisonBalls[i].update(dt);
    if (!poisonBalls[i].active) poisonBalls.splice(i, 1);
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    projectiles[i].update(dt);
    if (!projectiles[i].active) projectiles.splice(i, 1);
  }
  for (let i = weaponDrops.length - 1; i >= 0; i--) {
    weaponDrops[i].update(dt, players);
    if (weaponDrops[i].collected) weaponDrops.splice(i, 1);
  }
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life -= dt;
    if (explosions[i].life <= 0) explosions.splice(i, 1);
  }

  updateSnowflakes(dt);

  // Game over checks
  const allDead = players.every(p => !p.alive && p.respawnT <= 0);
  if (allDead) {
    gameOver = true;
    const m = Math.floor(zombieElapsed/60000), s = Math.floor((zombieElapsed%60000)/1000);
    goMessage = `GAME OVER! Survived ${m}m ${s}s | Kills: ${zombieKills}`;
  }
  const castleBlocks = blocks.filter(b => !b.playerPlaced);
  if (castleBlocks.length > 0 && castleBlocks.every(b => b.dead)) {
    gameOver = true;
    const m = Math.floor(zombieElapsed/60000), s = Math.floor((zombieElapsed%60000)/1000);
    goMessage = `CASTLE FALLEN! Survived ${m}m ${s}s | Kills: ${zombieKills}`;
  }

  handleBlockPlacement();
}

// ================================================================
// SNOWFLAKE SYSTEM
// ================================================================
function initSnowflakes() {
  snowflakes = Array.from({ length: 160 }, () => ({
    x:     Math.random() * CW,
    y:     Math.random() * CH,
    spd:   0.7 + Math.random() * 1.8,
    sz:    1 + Math.floor(Math.random() * 3),
    drift: (Math.random() - 0.5) * 0.45,
    a:     0.4 + Math.random() * 0.55,
  }));
}

function updateSnowflakes(dt) {
  const t = dt / 16;
  for (const s of snowflakes) {
    s.y += s.spd * t;
    s.x += s.drift * t;
    if (s.y > CH)  { s.y = -4; s.x = Math.random() * CW; }
    if (s.x < -4)  s.x = CW + 4;
    if (s.x > CW + 4) s.x = -4;
  }
}

function drawSnowflakes() {
  for (const s of snowflakes) {
    ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
    ctx.fillRect(s.x, s.y, s.sz, s.sz);
  }
}

// ================================================================
// BLOCK PLACEMENT HELPERS
// ================================================================
function snapGrid(v) { return Math.floor(v / BLOCK_SZ) * BLOCK_SZ; }

function blockAt(gx, gy) {
  return blocks.find(b => !b.dead && b.x === gx && b.y === gy);
}

function placeBlockAt(gx, gy, playerPlaced = false) {
  const sz = playerPlaced ? PLACE_SZ : BLOCK_SZ;
  if (gx < 0 || gx + sz > CW || gy < 0 || gy + sz > GROUND_Y) return false;
  // Reject if this footprint overlaps any existing block
  const overlaps = blocks.some(b => !b.dead &&
    gx < b.x + b.w && gx + sz > b.x &&
    gy < b.y + b.h && gy + sz > b.y);
  if (overlaps) return false;
  blocks.push(new Block(gx, gy, playerPlaced));
  return true;
}

function removeBlockAt(px, py) {
  // Find whichever block the cursor actually overlaps (works for any block size)
  const b = blocks.find(b => !b.dead && px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h);
  if (b) { b.dead = true; return true; }
  return false;
}

function handleBlockPlacement() {
  if (paused || gameOver) return;
  // Only in gameplay screens
  if (gameState !== 'battle' && gameState !== 'zombie') return;

  if (mclick) {
    // Snap to PLACE_SZ grid, centered on cursor
    const gx = Math.floor((mx - PLACE_SZ / 2) / PLACE_SZ) * PLACE_SZ;
    const gy = Math.floor((my - PLACE_SZ / 2) / PLACE_SZ) * PLACE_SZ;
    if (gy < GROUND_Y) {
      let closest = null, bestDist = Infinity;
      for (const p of players) {
        if (!p.alive || p.blockCount <= 0) continue;
        const d = Math.hypot(p.x + p.w/2 - mx, p.y + p.h/2 - my);
        if (d < bestDist) { bestDist = d; closest = p; }
      }
      if (closest && placeBlockAt(gx, gy, true)) closest.blockCount--;
    }
  }

  if (mrclick) {
    removeBlockAt(mx, my); // overlap-based, works for any block size
  }
}

function drawGhostBlock() {
  if (paused || gameOver) return;
  const gx = Math.floor((mx - PLACE_SZ / 2) / PLACE_SZ) * PLACE_SZ;
  const gy = Math.floor((my - PLACE_SZ / 2) / PLACE_SZ) * PLACE_SZ;
  if (gy >= GROUND_Y || gy < 0) return;
  // Occupied if anything overlaps the placed footprint
  const occupied = blocks.some(b => !b.dead &&
    gx < b.x + b.w && gx + PLACE_SZ > b.x &&
    gy < b.y + b.h && gy + PLACE_SZ > b.y);
  ctx.fillStyle   = occupied ? 'rgba(255,60,60,0.3)' : 'rgba(100,210,255,0.3)';
  ctx.fillRect(gx, gy, PLACE_SZ, PLACE_SZ);
  ctx.strokeStyle = occupied ? 'rgba(255,60,60,0.9)' : 'rgba(100,210,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(gx, gy, PLACE_SZ, PLACE_SZ);
}

// ================================================================
// RENDER HELPERS
// ================================================================
function drawBG() {
  // Wintry daytime sky
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#8fb4d0'); g.addColorStop(0.55, '#c8dcea'); g.addColorStop(1, '#ddeaf4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);

  // Far snow mountains
  ctx.fillStyle = '#b8ccda';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  [[0,0],[60,180],[140,60],[240,200],[350,50],[450,170],[570,30],[680,190],[790,55],[910,175],[1020,40],[1130,165],[1200,90],[1200,0]].forEach(([x,h]) => ctx.lineTo(x, GROUND_Y - h));
  ctx.closePath(); ctx.fill();
  // Snow caps on mountains
  ctx.fillStyle = '#ffffff';
  [[60,180,28],[240,200,32],[570,30,7],[680,190,30],[1020,40,8],[1130,165,26]].forEach(([px,h,sz]) => {
    ctx.beginPath();
    ctx.moveTo(px - sz, GROUND_Y - h + sz * 0.5);
    ctx.lineTo(px, GROUND_Y - h - 3);
    ctx.lineTo(px + sz, GROUND_Y - h + sz * 0.5);
    ctx.closePath(); ctx.fill();
  });

  // Fluffy clouds
  [[110,70,62,22],[360,52,78,20],[620,65,72,22],[900,58,60,19],[1090,72,55,18]].forEach(([cx,cy,rw,rh]) => {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - rw*0.38, cy + 6, rw*0.65, rh*0.75, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + rw*0.4,  cy + 5, rw*0.60, rh*0.70, 0, 0, Math.PI*2); ctx.fill();
  });

  // Snowflakes
  drawSnowflakes();

  // Snowy ground
  fillRect(0, GROUND_Y, CW, CH - GROUND_Y, '#9ab8cc');
  fillRect(0, GROUND_Y, CW, 10, '#ddeefa');
  ctx.fillStyle = '#ffffff';
  for (let sx = 0; sx < CW; sx += 55) {
    ctx.beginPath(); ctx.ellipse(sx + 28, GROUND_Y, 34, 9, 0, Math.PI, 0); ctx.fill();
  }
}

function drawZombieBG() {
  // Deep winter night sky
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, '#040810'); g.addColorStop(0.6, '#0a1220'); g.addColorStop(1, '#101828');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);

  // Stars
  ctx.fillStyle = '#ffffff';
  [[55,28],[170,50],[300,16],[440,42],[595,20],[750,52],[895,28],[1055,46],[1165,18],[140,88],[410,78],[700,92],[1010,75]].forEach(([sx,sy]) => {
    ctx.fillRect(sx, sy, Math.random() < 0.3 ? 2 : 1, Math.random() < 0.3 ? 2 : 1);
  });

  // Glowing moon
  ctx.fillStyle = 'rgba(200,220,180,0.15)';
  ctx.beginPath(); ctx.arc(940, 80, 60, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ccddb8';
  ctx.beginPath(); ctx.arc(940, 80, 42, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#ddeec8';
  ctx.beginPath(); ctx.arc(936, 76, 36, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#0a1220'; // crescent shadow
  ctx.beginPath(); ctx.arc(952, 72, 33, 0, Math.PI*2); ctx.fill();

  // Dark snowy mountain silhouettes
  ctx.fillStyle = '#0c1824';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  [[0,0],[70,140],[160,45],[270,170],[380,55],[490,145],[600,35],[710,125],[830,65],[950,155],[1070,48],[1160,130],[1200,85],[1200,0]].forEach(([x,h]) => ctx.lineTo(x, GROUND_Y - h));
  ctx.closePath(); ctx.fill();
  // Snow on mountain tops
  ctx.fillStyle = 'rgba(180,210,230,0.4)';
  [[70,140,22],[270,170,27],[600,35,7],[830,65,11],[1070,48,9]].forEach(([px,h,sz]) => {
    ctx.beginPath();
    ctx.moveTo(px-sz, GROUND_Y-h+sz*0.5); ctx.lineTo(px, GROUND_Y-h-2); ctx.lineTo(px+sz, GROUND_Y-h+sz*0.5);
    ctx.closePath(); ctx.fill();
  });

  // Red danger zone (zombie spawn side)
  ctx.fillStyle = 'rgba(180,0,0,0.08)';
  ctx.fillRect(CW * 0.45, 0, CW * 0.55, CH);

  // Snowflakes
  drawSnowflakes();

  // Snowy ground (icy blue-gray)
  fillRect(0, GROUND_Y, CW, CH - GROUND_Y, '#14202c');
  fillRect(0, GROUND_Y, CW, 10, '#8aacc0');
  ctx.fillStyle = '#a8c8d8';
  for (let sx = 0; sx < CW; sx += 55) {
    ctx.beginPath(); ctx.ellipse(sx + 28, GROUND_Y, 34, 8, 0, Math.PI, 0); ctx.fill();
  }
}

function drawPlatforms() {
  for (const p of platforms) {
    // Wood planks (snow-covered)
    fillRect(p.x, p.y, p.w, p.h, '#6a4e30');
    // Plank lines
    ctx.strokeStyle = '#4a3218'; ctx.lineWidth = 1;
    for (let px = p.x + 22; px < p.x + p.w - 4; px += 22) {
      ctx.beginPath(); ctx.moveTo(px, p.y + 2); ctx.lineTo(px, p.y + p.h); ctx.stroke();
    }
    // Snow on top
    fillRect(p.x,     p.y,     p.w,     4, '#cce8f8');
    fillRect(p.x + 1, p.y,     p.w - 2, 2, '#ffffff');
    strokeRect(p.x, p.y, p.w, p.h, '#3a2210', 1);
  }
}

function drawExplosions() {
  for (const e of explosions) {
    const a = e.life / 500;
    ctx.fillStyle = `rgba(255,120,0,${a})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1 - a + 0.2), 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(255,220,0,${a * 0.6})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.45 * (1 - a + 0.2), 0, Math.PI*2); ctx.fill();
  }
}

// ================================================================
// UI RENDERING
// ================================================================
function drawBattleUI() {
  fillRect(0, 0, CW, 52, 'rgba(0,0,0,0.75)');
  strokeRect(0, 0, CW, 52, '#2a3a55', 2);

  // Timer
  const ms = Math.max(0, battleTimeLeft);
  const mn = Math.floor(ms/60000), sc2 = Math.floor((ms%60000)/1000);
  const tstr = `${String(mn).padStart(2,'0')}:${String(sc2).padStart(2,'0')}`;
  const tc = ms < 60000 ? '#ff2200' : ms < 180000 ? '#ffaa00' : '#ffffff';
  fillText(tstr, CW/2, 34, 28, tc);
  fillText('CASTLE MAN FIGHT', CW/2, 16, 13, '#ffee88');

  // Blue score
  fillRect(10, 6, 200, 40, 'rgba(0,40,140,0.85)');
  strokeRect(10, 6, 200, 40, '#4488ff', 2);
  fillText('BLUE', 55, 32, 15, '#4488ff', 'center');
  fillText(`${score.blue || 0} pts`, 155, 32, 15, '#ccddff', 'center');

  // Red score
  fillRect(CW - 210, 6, 200, 40, 'rgba(140,0,0,0.85)');
  strokeRect(CW - 210, 6, 200, 40, '#ff4444', 2);
  fillText('RED', CW - 160, 32, 15, '#ff4444', 'center');
  fillText(`${score.red || 0} pts`, CW - 60, 32, 15, '#ffcccc', 'center');

  // Pause button
  const ph = hover(CW/2 - 22, 56, 44, 30);
  fillRect(CW/2 - 22, 56, 44, 30, ph ? '#334466' : 'rgba(0,0,0,0.6)');
  strokeRect(CW/2 - 22, 56, 44, 30, '#445577', 1);
  fillText('II', CW/2, 77, 18, '#aaaaaa');
  if (mclick && ph) paused = true;

  drawControlsHUD();
}

function drawZombieUI() {
  fillRect(0, 0, CW, 52, 'rgba(0,0,0,0.8)');
  strokeRect(0, 0, CW, 52, '#1a2a1a', 2);

  const m = Math.floor(zombieElapsed/60000), s = Math.floor((zombieElapsed%60000)/1000);
  fillText(`SURVIVED  ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`, CW/2, 34, 24, '#44ee88');
  fillText('ZOMBIE DEFENSE', CW/2, 15, 12, '#66aa66');

  fillText(`KILLS: ${zombieKills}`, 130, 34, 16, '#ffaa44');

  // Blocks standing
  const aliveBlocks = blocks.filter(b => !b.dead).length;
  fillText(`BLOCKS: ${aliveBlocks}`, CW - 125, 28, 13, '#88ccff');

  // Poison bar
  const ppct = poisonT / 30000;
  fillRect(CW - 230, 34, 210, 10, '#001100');
  fillRect(CW - 230, 34, 210 * ppct, 10, '#00aa00');
  fillText('POISON TIMER', CW - 125, 54, 10, '#44aa44');

  // Pause
  const ph = hover(CW/2 - 22, 56, 44, 30);
  fillRect(CW/2 - 22, 56, 44, 30, ph ? '#334466' : 'rgba(0,0,0,0.6)');
  strokeRect(CW/2 - 22, 56, 44, 30, '#445577', 1);
  fillText('II', CW/2, 77, 18, '#aaaaaa');
  if (mclick && ph) paused = true;

  drawControlsHUD();
}

function drawControlsHUD() {
  const y = CH - 55;
  fillRect(8, y, 210, 50, 'rgba(0,0,80,0.75)');
  strokeRect(8, y, 210, 50, '#4488ff', 1);
  fillText('P1 BLUE', 58, y + 15, 11, '#4488ff', 'center');
  fillText('[W] Jump  [A][D] Move', 108, y + 30, 10, '#aabbff', 'center');
  fillText('[F] Attack  [G] Place Block', 108, y + 44, 10, '#aabbff', 'center');

  if (players.length > 1) {
    fillRect(CW - 218, y, 210, 50, 'rgba(80,0,0,0.75)');
    strokeRect(CW - 218, y, 210, 50, '#ff4444', 1);
    fillText('P2 RED', CW - 163, y + 15, 11, '#ff4444', 'center');
    fillText('[↑] Jump  [←][→] Move', CW - 113, y + 30, 10, '#ffaaaa', 'center');
    fillText('[/] Attack  [.] Place Block', CW - 113, y + 44, 10, '#ffaaaa', 'center');
  }
}

function drawPoisonWarning() {
  const a = 0.45 + Math.sin(Date.now() * 0.012) * 0.3;
  ctx.fillStyle = `rgba(0,180,0,${a})`;
  ctx.fillRect(0, 50, CW, 58);
  fillText('☠  POISON ATTACK INCOMING IN 5 SECONDS!  ☠', CW/2, 88, 26, '#ffffff');
}

function drawPauseMenu() {
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CW, CH);
  const bx = CW/2, by = CH/2;
  fillRect(bx - 160, by - 145, 320, 290, '#0d1122');
  strokeRect(bx - 160, by - 145, 320, 290, '#334466', 3);
  fillText('PAUSED', bx, by - 100, 36, '#ffffff');

  const rH = hover(bx-110, by-60,  220, 48); btn('▶  RESUME',    bx-110, by-60,  220, 48, rH);
  const stH = hover(bx-110, by+2,   220, 48); btn('↺  RESTART',   bx-110, by+2,   220, 48, stH);
  const mH  = hover(bx-110, by+64,  220, 48); btn('⌂  MAIN MENU', bx-110, by+64,  220, 48, mH);

  if (mclick) {
    if (rH)  paused = false;
    if (stH) gameMode === 'battle' ? initBattle() : initZombie(players.length);
    if (mH)  { gameState = 'title'; gameMode = null; }
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, CW, CH);
  const bx = CW/2, by = CH/2;
  fillRect(bx-260, by-155, 520, 310, '#0d1122');
  strokeRect(bx-260, by-155, 520, 310, '#ffaa00', 3);
  fillText('GAME OVER', bx, by-100, 42, '#ffaa00');
  fillText(goMessage, bx, by-46, 20, '#ffffff');
  if (gameMode === 'battle') {
    fillText(`Blue: ${score.blue||0} pts    Red: ${score.red||0} pts`, bx, by, 18, '#aabbff');
  } else {
    fillText(`Total zombie kills: ${zombieKills}`, bx, by, 18, '#44ff88');
  }

  const paH = hover(bx-110, by+38, 220, 48); btn('▶  PLAY AGAIN', bx-110, by+38,  220, 48, paH);
  const mH  = hover(bx-110, by+100, 220, 48); btn('⌂  MAIN MENU', bx-110, by+100, 220, 48, mH);

  if (mclick) {
    if (paH) gameMode === 'battle' ? initBattle() : initZombie(players.length);
    if (mH)  { gameState = 'title'; gameMode = null; }
  }
}

// ================================================================
// TITLE SCREEN
// ================================================================
function renderTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, '#08081e'); g.addColorStop(0.55, '#0d1b3e'); g.addColorStop(1, '#0d1a0d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);

  // Stars
  ctx.fillStyle = '#ffffff';
  [[100,42],[220,70],[370,28],[520,55],[700,35],[860,60],[1040,25],[1160,50],[160,115],[450,95],[660,120],[900,105]].forEach(([sx,sy]) => ctx.fillRect(sx,sy,2,2));

  // Title shadow
  fillText('CASTLE MAN', CW/2+4, 118, 72, '#000000');
  fillText('FIGHT',      CW/2+4, 202, 88, '#000000');
  // Title
  fillText('CASTLE MAN', CW/2, 114, 72, '#ffdd00');
  fillText('FIGHT',      CW/2, 198, 88, '#ffee44');
  fillText('B A T T L E S', CW/2, 248, 28, '#88aaff');

  // Characters
  const sc = 5;
  const bx = CW/2 + 145, ry = 295;
  drawSprite(bx, ry, sc, PAL_BLUE, false);
  fillText('PLAYER 1', bx + 25, ry + SPRITE.length * sc + 18, 13, '#4488ff');

  const rx = CW/2 - 200;
  drawSprite(rx, ry, sc, PAL_RED, true);
  fillText('PLAYER 2', rx + 25, ry + SPRITE.length * sc + 18, 13, '#ff4444');

  fillText('VS', CW/2, 390, 54, '#ffffff');

  // Battle button
  const bth = hover(CW/2 - 155, 438, 310, 65);
  fillRect(CW/2 - 155, 438, 310, 65, bth ? '#1a3a8a' : '#091a44');
  strokeRect(CW/2 - 155, 438, 310, 65, bth ? '#66aaff' : '#2a3a66', 3);
  fillText('⚔  BATTLE', CW/2, 480, 28, '#ffffff');

  // Zombie button
  const zh = hover(CW/2 - 155, 520, 310, 65);
  fillRect(CW/2 - 155, 520, 310, 65, zh ? '#0e3a0e' : '#051a05');
  strokeRect(CW/2 - 155, 520, 310, 65, zh ? '#44ff44' : '#224422', 3);
  fillText('☠  ZOMBIE MODE', CW/2, 562, 28, '#44ff44');

  // ground strip
  fillRect(0, CH - 55, CW, 55, '#080818');
  fillRect(0, CH - 55, CW, 6, '#1a2a1a');
  fillText('Press ESC to pause · Walk into chests/crates to pick up weapons', CW/2, CH - 22, 13, '#445566');

  if (mclick) {
    if (bth) initBattle();
    if (zh)  gameState = 'zombie_select';
  }
}

// ================================================================
// ZOMBIE SELECT SCREEN
// ================================================================
let zSelHover = 0;

function renderZombieSelect() {
  ctx.fillStyle = '#080814'; ctx.fillRect(0, 0, CW, CH);
  fillText('ZOMBIE MODE', CW/2, 170, 58, '#44ff44');
  fillText('— SELECT NUMBER OF PLAYERS —', CW/2, 228, 22, '#888888');

  const mx2 = CW/2;

  // 1P box
  const oh = hover(mx2 - 230, 280, 200, 120);
  fillRect(mx2 - 230, 280, 200, 120, oh ? '#0e3a0e' : '#051a05');
  strokeRect(mx2 - 230, 280, 200, 120, oh ? '#44ff44' : '#1a3a1a', 3);
  drawSprite(mx2 - 215, 296, 4, PAL_BLUE, false);
  fillText('1  PLAYER', mx2 - 130, 370, 18, '#44ff44');

  // 2P box
  const twh = hover(mx2 + 30, 280, 200, 120);
  fillRect(mx2 + 30, 280, 200, 120, twh ? '#0e3a0e' : '#051a05');
  strokeRect(mx2 + 30, 280, 200, 120, twh ? '#44ff44' : '#1a3a1a', 3);
  drawSprite(mx2 + 48, 296, 4, PAL_BLUE,  false);
  drawSprite(mx2 + 96, 296, 4, PAL_RED,   true);
  fillText('2  PLAYERS', mx2 + 130, 370, 18, '#44ff44');

  // Back
  const bh = hover(mx2 - 80, 440, 160, 50);
  btn('← BACK', mx2 - 80, 440, 160, 50, bh);

  fillText('Walk into weapon drops to pick them up', CW/2, 535, 15, '#445544');
  fillText('Survive as long as possible — poison attacks every 30 seconds!', CW/2, 558, 14, '#334433');

  if (mclick) {
    if (oh)  initZombie(1);
    if (twh) initZombie(2);
    if (bh)  gameState = 'title';
  }
}

// ================================================================
// MAIN RENDER
// ================================================================
function render() {
  ctx.clearRect(0, 0, CW, CH);

  switch (gameState) {
    case 'title':
      renderTitle(); break;

    case 'zombie_select':
      renderZombieSelect(); break;

    case 'battle':
      drawBG();
      drawPlatforms();
      drawGhostBlock();
      if (plane) plane.draw();
      blocks.forEach(b => b.draw());
      chests.forEach(c => c.draw());
      fallingCrates.forEach(c => c.draw());
      weaponDrops.forEach(w => w.draw());
      projectiles.forEach(p => p.draw());
      drawExplosions();
      players.forEach(p => p.draw());
      drawBattleUI();
      if (!paused && !gameOver) {
        fillText('Click = place block  |  Right-click = remove', CW/2, CH - 8, 11, '#556688');
      }
      if (paused)   drawPauseMenu();
      if (gameOver) drawGameOver();
      break;

    case 'zombie':
      drawZombieBG();
      drawPlatforms();
      drawGhostBlock();
      blocks.forEach(b => b.draw());
      weaponDrops.forEach(w => w.draw());
      projectiles.forEach(p => p.draw());
      poisonBalls.forEach(pb => pb.draw());
      drawExplosions();
      zombies.forEach(z => z.draw());
      players.forEach(p => p.draw());
      drawZombieUI();
      if (!paused && !gameOver) {
        fillText('Click = place block  |  Right-click = remove  |  [G]/[.] = quick stack above', CW/2, CH - 8, 11, '#335533');
      }
      if (showPoisonWarn) drawPoisonWarning();
      if (paused)   drawPauseMenu();
      if (gameOver) drawGameOver();
      break;
  }
}

// ================================================================
// MAIN LOOP
// ================================================================
function loop(ts) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  if (gameState === 'battle') updateBattle(dt);
  if (gameState === 'zombie') updateZombie(dt);

  render();
  mclick = false;
  mrclick = false;
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
