'use strict';

// ── Canvas setup ──────────────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
let W, H;
function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// ── Game state ────────────────────────────────────────────────────────────────
let gameMode   = 1;
let mapName    = 'snow';
let running    = false;
let animId     = null;
let score      = [0, 0];
const WIN_SCORE = 5;

// ── Charge system ─────────────────────────────────────────────────────────────
// chargeStart[i] = ms timestamp when player i started holding, or -1 if not charging
const chargeStart = [-1, -1];
const MAX_CHARGE  = 1.6;   // seconds to reach full charge
const SPD_MIN     = 160;   // px/s at 0 charge
const SPD_MAX     = 900;   // px/s at full charge
const LAUNCH_ANG  = 36 * Math.PI / 180;  // fixed upward launch angle

function getCharge(pidx) {
  if (chargeStart[pidx] < 0) return 0;
  return Math.min(1, (performance.now() - chargeStart[pidx]) / 1000 / MAX_CHARGE);
}

// ── Input — single consolidated listener ──────────────────────────────────────
window.addEventListener('keydown', e => {
  // prevent arrow keys scrolling page during game
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW'].includes(e.code)) e.preventDefault();
  if ((e.key === 'r' || e.key === 'R') && !running) { restartGame(); return; }
  if (!running) return;

  // P1: hold W to charge
  if (e.code === 'KeyW' && chargeStart[0] < 0 && !archers[0]?.dead) {
    chargeStart[0] = performance.now();
  }
  // P2: hold Up to charge (2P only)
  if (e.code === 'ArrowUp' && gameMode === 2 && chargeStart[1] < 0 && !archers[1]?.dead) {
    chargeStart[1] = performance.now();
  }
});

window.addEventListener('keyup', e => {
  if (!running) { chargeStart[0] = chargeStart[1] = -1; return; }

  if (e.code === 'KeyW' && chargeStart[0] >= 0) {
    fireArrow(0, getCharge(0));
    chargeStart[0] = -1;
  }
  if (e.code === 'ArrowUp' && gameMode === 2 && chargeStart[1] >= 0) {
    fireArrow(1, getCharge(1));
    chargeStart[1] = -1;
  }
});

// ── Map configs ───────────────────────────────────────────────────────────────
const MAPS = {
  snow: {
    skyTop: '#5b8fa8', skyBot: '#c9e8f5',
    groundTop: '#e8f4f8', groundBot: '#b0d4e8',
    groundH: 0.22, particles: 'snow',
  },
  desert: {
    skyTop: '#e8822a', skyBot: '#f7d08a',
    groundTop: '#d4a052', groundBot: '#a0742a',
    groundH: 0.20, particles: 'none',
  },
  jungle: {
    skyTop: '#0a2a0a', skyBot: '#1e5a1e',
    groundTop: '#2a5a18', groundBot: '#1a3a0a',
    groundH: 0.22, particles: 'leaves',
  },
};

// ── Constants / state ─────────────────────────────────────────────────────────
let archers   = [];
let arrows    = [];
let birds     = [];
let particles = [];

const GROUND_Y  = () => H * (1 - MAPS[mapName].groundH);
const ARCHER_W  = 28;
const ARCHER_H  = 52;
const GRAVITY   = 520;
const BOT_DELAY = 1.3;
let   botTimer  = 0;
let   birdTimer = 0;
let   lastTime  = 0;
let   nowTs     = 0;  // current frame timestamp (ms)

// ── UI helpers ────────────────────────────────────────────────────────────────
function show(id) { document.getElementById(id).style.display = 'flex'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }

// ── Mode / map selection ──────────────────────────────────────────────────────
function selectMode(m) {
  gameMode = m;
  hide('start-overlay');
  show('map-overlay');
}

function selectMap(m) {
  mapName = m;
  document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('mc-' + m).classList.add('selected');
}

function startGame() {
  hide('map-overlay');
  hide('over-overlay');
  score = [0, 0];
  chargeStart[0] = chargeStart[1] = -1;
  initRound();
  running = true;
  lastTime = performance.now();
  if (animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function restartGame() {
  hide('over-overlay');
  startGame();
}

function goHome() {
  running = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  chargeStart[0] = chargeStart[1] = -1;
  hide('over-overlay');
  show('start-overlay');
}

// ── Round init ────────────────────────────────────────────────────────────────
function initRound() {
  const gy = GROUND_Y();
  archers = [
    { pidx: 0, x: W * 0.18, y: gy - ARCHER_H, dead: false, deadTimer: 0 },
    { pidx: 1, x: W * 0.82, y: gy - ARCHER_H, dead: false, deadTimer: 0 },
  ];
  arrows   = [];
  birds    = [];
  chargeStart[0] = chargeStart[1] = -1;
  botTimer  = BOT_DELAY;
  birdTimer = 2.5;
  initParticles();
}

// ── Fire arrow ────────────────────────────────────────────────────────────────
function fireArrow(pidx, charge) {
  const a = archers[pidx];
  if (!a || a.dead) return;

  const enemy = archers[1 - pidx];
  const dir   = (enemy.x >= a.x) ? 1 : -1;
  const spd   = SPD_MIN + charge * (SPD_MAX - SPD_MIN);

  arrows.push({
    x:          a.x + dir * ARCHER_W * 0.8,
    y:          a.y + ARCHER_H * 0.3,
    vx:         dir * spd * Math.cos(LAUNCH_ANG),
    vy:         -spd * Math.sin(LAUNCH_ANG),
    owner:      pidx,
    redirected: false,
    age:        0,
    charge,
  });
}

// ── Bot shoot ─────────────────────────────────────────────────────────────────
function botShoot() {
  const bot    = archers[1];
  const player = archers[0];
  if (!bot || bot.dead || !player || player.dead) return;

  const dist = Math.abs(player.x - bot.x);
  // Physics: range = v² * sin(2θ) / g  →  v = sqrt(range * g / sin(2θ))
  const exactSpd   = Math.sqrt(dist * GRAVITY / Math.sin(2 * LAUNCH_ANG));
  const exactCharge = (exactSpd - SPD_MIN) / (SPD_MAX - SPD_MIN);
  // Add random error (bot isn't perfect)
  const charge = Math.max(0.05, Math.min(1, exactCharge + (Math.random() - 0.5) * 0.28));

  fireArrow(1, charge);
}

// ── Birds ─────────────────────────────────────────────────────────────────────
function spawnBird() {
  const fromLeft = Math.random() < 0.5;
  const gy = GROUND_Y();
  birds.push({
    x:    fromLeft ? -40 : W + 40,
    y:    gy * (0.18 + Math.random() * 0.42),
    vx:   fromLeft ? 100 + Math.random() * 60 : -(100 + Math.random() * 60),
    alive: true,
    wing:  Math.random() * Math.PI * 2,
  });
}

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
  particles = [];
  const type = MAPS[mapName].particles;
  if (type === 'snow') {
    for (let i = 0; i < 80; i++)
      particles.push({ x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 18, vy: 28 + Math.random() * 40,
        r: 1.5 + Math.random() * 2.5, type: 'snow' });
  } else if (type === 'leaves') {
    for (let i = 0; i < 40; i++)
      particles.push({ x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 30,
        r: 4 + Math.random() * 4, rot: Math.random() * Math.PI * 2, type: 'leaf' });
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function loop(ts) {
  nowTs = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  if (running) { update(dt); render(); }
  animId = requestAnimationFrame(loop);
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  const gy = GROUND_Y();

  // Bot
  if (gameMode === 1 && archers[1] && !archers[1].dead) {
    botTimer -= dt;
    if (botTimer <= 0) {
      botShoot();
      botTimer = BOT_DELAY + (Math.random() * 0.8 - 0.4);
    }
  }

  // Birds
  birdTimer -= dt;
  if (birdTimer <= 0) { spawnBird(); birdTimer = 3; }
  for (const b of birds) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.wing += 9 * dt;
    if (b.x < -80 || b.x > W + 80) b.alive = false;
  }

  // Arrows
  for (let i = arrows.length - 1; i >= 0; i--) {
    const ar = arrows[i];
    ar.x   += ar.vx * dt;
    ar.vy  += GRAVITY * dt;
    ar.y   += ar.vy * dt;
    ar.age += dt;

    if (ar.y > gy + 20 || ar.x < -60 || ar.x > W + 60 || ar.age > 5) {
      arrows.splice(i, 1); continue;
    }

    // Bird collision → redirect
    let hitBird = false;
    for (const b of birds) {
      if (!b.alive) continue;
      const dx = ar.x - b.x, dy = ar.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < 28) {
        b.alive = false;
        const enemy = archers[1 - ar.owner];
        if (enemy && !enemy.dead) {
          const rdx = enemy.x - ar.x;
          const rdy = (enemy.y + ARCHER_H * 0.35) - ar.y;
          const rd  = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
          const spd = Math.sqrt(ar.vx * ar.vx + ar.vy * ar.vy);
          ar.vx = (rdx / rd) * spd;
          ar.vy = (rdy / rd) * spd;
          ar.redirected = true;
        }
        hitBird = true; break;
      }
    }
    if (hitBird) continue;

    // Archer collision
    for (let p = 0; p < 2; p++) {
      if (p === ar.owner && !ar.redirected) continue;
      const a = archers[p];
      if (!a || a.dead) continue;
      const dx = ar.x - (a.x + ARCHER_W * 0.5);
      const dy = ar.y - (a.y + ARCHER_H * 0.5);
      if (Math.abs(dx) < ARCHER_W * 0.75 && Math.abs(dy) < ARCHER_H * 0.7) {
        a.dead = true;
        a.deadTimer = 1.5;
        arrows.splice(i, 1);
        addKill(ar.owner);
        break;
      }
    }
  }

  // Revive archers
  for (const a of archers) {
    if (a.dead) {
      a.deadTimer -= dt;
      if (a.deadTimer <= 0) {
        a.dead = false;
        a.x = (a.pidx === 0) ? W * 0.18 : W * 0.82;
        a.y = gy - ARCHER_H;
      }
    }
  }

  // Particles
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'leaf') p.rot += dt * 2;
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
    if (p.x > W + 20)  p.x = -20;
    if (p.x < -20)     p.x = W + 20;
  }
}

function addKill(pidx) {
  score[pidx]++;
  chargeStart[0] = chargeStart[1] = -1;
  if (score[pidx] >= WIN_SCORE) {
    setTimeout(() => endGame(pidx), 500);
  } else {
    setTimeout(initRound, 1300);
  }
}

function endGame(winner) {
  running = false;
  const names = (gameMode === 2) ? ['Player 1', 'Player 2'] : ['Player 1', 'Bot'];
  document.getElementById('over-emoji').textContent  = winner === 0 ? '🏆' : (gameMode === 1 ? '🤖' : '🏆');
  document.getElementById('over-title').textContent  = 'WINNER!';
  document.getElementById('over-winner').textContent = names[winner] + ' wins!';
  document.getElementById('over-overlay').style.display = 'flex';
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const map = MAPS[mapName];
  const gy  = GROUND_Y();

  // Sky
  const sg = ctx.createLinearGradient(0, 0, 0, gy);
  sg.addColorStop(0, map.skyTop); sg.addColorStop(1, map.skyBot);
  ctx.fillStyle = sg; ctx.fillRect(0, 0, W, gy);

  drawMapDecor(gy);

  // Ground
  const gg = ctx.createLinearGradient(0, gy, 0, H);
  gg.addColorStop(0, map.groundTop); gg.addColorStop(1, map.groundBot);
  ctx.fillStyle = gg; ctx.fillRect(0, gy, W, H - gy);

  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();

  drawParticles();
  drawBirds();

  // Trajectory previews (drawn under arrows)
  for (let p = 0; p < 2; p++) {
    if (chargeStart[p] >= 0 && archers[p] && !archers[p].dead) {
      drawTrajectory(archers[p], getCharge(p));
    }
  }

  drawArrows();
  for (const a of archers) drawArcher(a);
  drawHUD();
}

// ── Trajectory preview ────────────────────────────────────────────────────────
function drawTrajectory(a, charge) {
  const enemy = archers[1 - a.pidx];
  if (!enemy) return;
  const dir  = (enemy.x >= a.x) ? 1 : -1;
  const spd  = SPD_MIN + charge * (SPD_MAX - SPD_MIN);
  const pvx  = dir * spd * Math.cos(LAUNCH_ANG);
  const pvy  = -spd * Math.sin(LAUNCH_ANG);
  const gy   = GROUND_Y();
  const ox   = a.x + dir * ARCHER_W * 0.8;
  const oy   = a.y + ARCHER_H * 0.3;

  // Color: green when aimed well, orange when too weak, red when overshot
  const approxRange = (spd * spd * Math.sin(2 * LAUNCH_ANG)) / GRAVITY;
  const dist        = Math.abs(enemy.x - a.x);
  const ratio       = approxRange / dist;
  let dotCol;
  if (ratio < 0.75)      dotCol = 'rgba(255,160,0,0.7)';   // too weak
  else if (ratio > 1.35) dotCol = 'rgba(255,60,60,0.7)';   // overshot
  else                   dotCol = 'rgba(100,255,80,0.7)';   // on target

  ctx.fillStyle = dotCol;
  const STEP = 0.045;
  for (let t = STEP; t < 4.0; t += STEP) {
    const nx = ox + pvx * t;
    const ny = oy + pvy * t + 0.5 * GRAVITY * t * t;
    if (ny > gy || nx < -10 || nx > W + 10) break;
    // fade dots further along
    const fade = Math.max(0.15, 1 - t * 0.22);
    ctx.globalAlpha = fade;
    ctx.beginPath(); ctx.arc(nx, ny, 2.8 - t * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Map decorations ───────────────────────────────────────────────────────────
function drawMapDecor(gy) {
  if (mapName === 'snow') {
    ctx.fillStyle = 'rgba(180,215,235,0.55)';
    for (const [mx,mw,mh] of [[W*.1,160,120],[W*.35,120,90],[W*.7,180,140],[W*.88,100,80]]) {
      ctx.beginPath(); ctx.moveTo(mx-mw/2,gy); ctx.lineTo(mx,gy-mh); ctx.lineTo(mx+mw/2,gy); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    for (const [mx,mw,mh] of [[W*.1,160,120],[W*.35,120,90],[W*.7,180,140],[W*.88,100,80]]) {
      ctx.beginPath(); ctx.moveTo(mx-mw*.22,gy-mh*.6); ctx.lineTo(mx,gy-mh); ctx.lineTo(mx+mw*.22,gy-mh*.6); ctx.closePath(); ctx.fill();
    }
  } else if (mapName === 'desert') {
    ctx.fillStyle = '#FFE060';
    ctx.shadowBlur = 40; ctx.shadowColor = '#FFB000';
    ctx.beginPath(); ctx.arc(W*.85, H*.15, 44, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    drawCactus(W*.12, gy); drawCactus(W*.62, gy); drawCactus(W*.9, gy);
  } else {
    drawTree(W*.05,gy,70); drawTree(W*.2,gy,90); drawTree(W*.78,gy,80); drawTree(W*.94,gy,65);
  }
}

function drawCactus(x, gy) {
  ctx.fillStyle = '#3a8a3a';
  ctx.fillRect(x-8, gy-70, 16, 70);
  ctx.fillRect(x-28, gy-52, 20, 10); ctx.fillRect(x+8, gy-46, 20, 10);
  ctx.fillRect(x-28, gy-52, 10, -20); ctx.fillRect(x+18, gy-46, 10, -20);
}

function drawTree(x, gy, h) {
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x-6, gy-h*.45, 12, h*.45);
  ctx.fillStyle = '#1a6a10'; ctx.beginPath(); ctx.arc(x, gy-h*.6, h*.38, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2a8a18';
  ctx.beginPath(); ctx.arc(x-h*.1, gy-h*.72, h*.28, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+h*.12, gy-h*.68, h*.26, 0, Math.PI*2); ctx.fill();
}

// ── Particles ─────────────────────────────────────────────────────────────────
function drawParticles() {
  for (const p of particles) {
    if (p.type === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = '#5aaa28';
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r*.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}

// ── Birds ─────────────────────────────────────────────────────────────────────
function drawBirds() {
  for (const b of birds) {
    if (!b.alive) continue;
    const wf = Math.sin(b.wing) * 9;
    ctx.fillStyle = '#222'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 12, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(b.x-6,b.y); ctx.quadraticCurveTo(b.x-18,b.y-6-wf,b.x-22,b.y+4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x+6,b.y); ctx.quadraticCurveTo(b.x+18,b.y-6-wf,b.x+22,b.y+4); ctx.stroke();
    const bd = b.vx > 0 ? 1 : -1;
    ctx.fillStyle = '#FFB800';
    ctx.beginPath(); ctx.moveTo(b.x+bd*12,b.y-2); ctx.lineTo(b.x+bd*20,b.y); ctx.lineTo(b.x+bd*12,b.y+3); ctx.closePath(); ctx.fill();
  }
}

// ── Arrows ────────────────────────────────────────────────────────────────────
function drawArrows() {
  for (const ar of arrows) {
    const angle = Math.atan2(ar.vy, ar.vx);
    ctx.save(); ctx.translate(ar.x, ar.y); ctx.rotate(angle);
    ctx.strokeStyle = ar.redirected ? '#FF6600' : '#8B5A00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(12, 0); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(20,-3); ctx.lineTo(20,3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ar.redirected ? '#FF4400' : '#cc3333';
    ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(-16,-6); ctx.lineTo(-14,0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(-16, 6); ctx.lineTo(-14,0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// ── Archers ───────────────────────────────────────────────────────────────────
function drawArcher(a) {
  if (a.dead) {
    ctx.globalAlpha = 0.3;
    drawArcherShape(a, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
    ctx.fillText('💀 ' + Math.ceil(a.deadTimer), a.x + ARCHER_W/2, a.y - 10);
    return;
  }
  const charge = chargeStart[a.pidx] >= 0 ? getCharge(a.pidx) : 0;
  drawArcherShape(a, charge);
  if (charge > 0) drawChargeBar(a, charge);
}

function drawArcherShape(a, charge) {
  const x   = a.x, y = a.y;
  const bw  = ARCHER_W, bh = ARCHER_H;
  const enemy = archers[1 - a.pidx];
  const facingRight = enemy ? (enemy.x >= a.x) : (a.pidx === 0);
  const dir = facingRight ? 1 : -1;
  const bodyCol = a.pidx === 0 ? '#e04444' : '#4488ee';
  const skinCol = '#f5c9a0';

  // Legs
  ctx.strokeStyle = bodyCol; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.62); ctx.lineTo(x+bw*.25,y+bh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.62); ctx.lineTo(x+bw*.75,y+bh); ctx.stroke();

  // Body
  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.roundRect(x+bw*.12,y+bh*.28,bw*.76,bh*.40,6); ctx.fill();

  // Bow arm (extends toward enemy)
  ctx.strokeStyle = skinCol; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x+bw*.5, y+bh*.35);
  ctx.lineTo(x+bw*.5+dir*bw*0.9, y+bh*.32);
  ctx.stroke();

  // Bow
  const bowX = x + bw*.5 + dir*bw*.9;
  const bowY = y + bh*.32;
  ctx.strokeStyle = '#8B5A00'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(bowX - dir*4, bowY, 14,
    dir > 0 ? -Math.PI*.55 : Math.PI*.45,
    dir > 0 ?  Math.PI*.55 : -Math.PI*.45 + Math.PI*2);
  ctx.stroke();

  // Bowstring — pulls back with charge
  const pullBack = charge * dir * 9;
  const midX = bowX - dir*4 - pullBack;
  const midY = bowY;
  ctx.strokeStyle = charge > 0 ? '#FFD700' : '#ccc'; ctx.lineWidth = charge > 0 ? 2 : 1.5;
  ctx.beginPath(); ctx.moveTo(bowX-dir*4, bowY-14); ctx.lineTo(midX, midY); ctx.lineTo(bowX-dir*4, bowY+14); ctx.stroke();

  // Arrow on string while charging
  if (charge > 0) {
    const aang = -LAUNCH_ANG * dir;  // visual only
    ctx.save(); ctx.translate(midX, midY); ctx.rotate(Math.atan2(0, dir));
    ctx.strokeStyle = '#8B5A00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(dir*18,0); ctx.stroke();
    ctx.restore();
  }

  // Draw-back arm
  ctx.strokeStyle = skinCol; ctx.lineWidth = 4;
  const pullArmX = x+bw*.5 - dir*bw*.5 - pullBack;
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.35); ctx.lineTo(pullArmX,y+bh*.38); ctx.stroke();

  // Head
  ctx.fillStyle = skinCol;
  ctx.beginPath(); ctx.arc(x+bw*.5,y+bh*.15,bw*.38,0,Math.PI*2); ctx.fill();

  // Eye
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x+bw*.5+dir*6,y+bh*.13,3,0,Math.PI*2); ctx.fill();

  // Hat
  ctx.fillStyle = a.pidx === 0 ? '#cc2222' : '#2244aa';
  ctx.beginPath(); ctx.ellipse(x+bw*.5,y+bh*.08,bw*.44,bh*.08,0,Math.PI,0); ctx.fill();

  // Label
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
  ctx.fillText(a.pidx === 0 ? 'P1' : (gameMode === 1 ? 'BOT' : 'P2'), x+bw*.5, y-6);
}

function drawChargeBar(a, charge) {
  const cx  = a.x + ARCHER_W / 2;
  const cy  = a.y - 22;
  const bw  = 46, bh = 8;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(cx - bw/2 - 1, cy - bh/2 - 1, bw + 2, bh + 2, 4); ctx.fill();

  // Fill — color changes from green → yellow → red as charge grows
  const r = Math.round(255 * Math.min(1, charge * 2));
  const g = Math.round(255 * Math.min(1, (1 - charge) * 2));
  ctx.fillStyle = `rgb(${r},${g},0)`;
  ctx.beginPath(); ctx.roundRect(cx - bw/2, cy - bh/2, bw * charge, bh, 3); ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx - bw/2, cy - bh/2, bw, bh, 3); ctx.stroke();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD() {
  // Bar
  ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(0, 0, W, 56);

  const p1Name = 'P1', p2Name = gameMode === 1 ? 'BOT' : 'P2';

  // P1
  ctx.fillStyle = '#e04444'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left';
  ctx.fillText(p1Name, 18, 34);
  ctx.fillStyle = '#fff'; ctx.fillText(score[0], 60, 34);
  for (let i = 0; i < WIN_SCORE; i++) {
    ctx.fillStyle = i < score[0] ? '#e04444' : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(92 + i*20, 44, 6, 0, Math.PI*2); ctx.fill();
  }

  // P2/Bot
  ctx.fillStyle = '#4488ee'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'right';
  ctx.fillText(p2Name, W-18, 34);
  ctx.fillStyle = '#fff'; ctx.fillText(score[1], W-60, 34);
  for (let i = 0; i < WIN_SCORE; i++) {
    ctx.fillStyle = i < score[1] ? '#4488ee' : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(W-92-i*20, 44, 6, 0, Math.PI*2); ctx.fill();
  }

  // Center title
  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  ctx.fillText('⚔ FIGHT ARROWS ⚔', W/2, 30);
  ctx.fillStyle = '#aaa'; ctx.font = '11px monospace';
  ctx.fillText('First to ' + WIN_SCORE + ' wins', W/2, 46);

  // Controls
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
  ctx.fillText('Hold [W] to charge, release to fire', 14, H - 10);
  if (gameMode === 2) {
    ctx.textAlign = 'right';
    ctx.fillText('Hold [↑] to charge, release to fire', W-14, H - 10);
  }

  // Map
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
  ctx.fillText(mapName.toUpperCase() + ' MAP', W/2, H - 10);
}
