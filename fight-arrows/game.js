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
let gameMode = 1;
let mapName  = 'snow';
let running  = false;
let animId   = null;
let score    = [0, 0];
const WIN_SCORE = 5;

// Win celebration
let winState  = null;  // { winner: 0|1, time: 0 }
let confetti  = [];

// ── Charge system ─────────────────────────────────────────────────────────────
const chargeStart = [-1, -1];
const MAX_CHARGE  = 1.6;
const SPD_MIN     = 160;
const SPD_MAX     = 900;
const LAUNCH_ANG  = 36 * Math.PI / 180;

function getCharge(pidx) {
  if (chargeStart[pidx] < 0) return 0;
  return Math.min(1, (performance.now() - chargeStart[pidx]) / 1000 / MAX_CHARGE);
}

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};

window.addEventListener('keydown', e => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyD'].includes(e.code))
    e.preventDefault();

  keys[e.code] = true;

  if ((e.key === 'r' || e.key === 'R') && !running) { restartGame(); return; }
  if (!running || winState) return;

  // P1 charge
  if (e.code === 'KeyW' && chargeStart[0] < 0 && !archers[0]?.dead)
    chargeStart[0] = performance.now();

  // P2 charge (2P only)
  if (e.code === 'ArrowUp' && gameMode === 2 && chargeStart[1] < 0 && !archers[1]?.dead)
    chargeStart[1] = performance.now();
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;

  if (!running) { chargeStart[0] = chargeStart[1] = -1; return; }

  if (e.code === 'KeyW' && chargeStart[0] >= 0) {
    if (!winState) fireArrow(0, getCharge(0));
    chargeStart[0] = -1;
  }
  if (e.code === 'ArrowUp' && gameMode === 2 && chargeStart[1] >= 0) {
    if (!winState) fireArrow(1, getCharge(1));
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

// ── Constants ─────────────────────────────────────────────────────────────────
let archers   = [];
let arrows    = [];
let birds     = [];
let particles = [];

const GROUND_Y     = () => H * (1 - MAPS[mapName].groundH);
const ARCHER_W     = 28;
const ARCHER_H     = 52;
const GRAVITY      = 520;
const ARCHER_SPEED = 190;  // px/s
const BOT_DELAY    = 1.3;
let   botTimer     = 0;
let   birdTimer    = 0;
let   lastTime     = 0;
let   nowTs        = 0;

// ── UI helpers ────────────────────────────────────────────────────────────────
function show(id) { document.getElementById(id).style.display = 'flex'; }
function hide(id) { document.getElementById(id).style.display = 'none'; }

// ── Mode / map selection ──────────────────────────────────────────────────────
function selectMode(m) { gameMode = m; hide('start-overlay'); show('map-overlay'); }

function selectMap(m) {
  mapName = m;
  document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('mc-' + m).classList.add('selected');
}

function startGame() {
  hide('map-overlay'); hide('over-overlay');
  score = [0, 0];
  winState = null; confetti = [];
  chargeStart[0] = chargeStart[1] = -1;
  initRound();
  running = true;
  lastTime = performance.now();
  if (animId) cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

function restartGame() { hide('over-overlay'); startGame(); }

function goHome() {
  running = false;
  winState = null; confetti = [];
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  chargeStart[0] = chargeStart[1] = -1;
  hide('over-overlay');
  show('start-overlay');
}

// ── Round init ────────────────────────────────────────────────────────────────
function initRound() {
  const gy = GROUND_Y();
  archers = [
    { pidx: 0, x: W * 0.18, y: gy - ARCHER_H, dead: false, deadTimer: 0, walkT: 0 },
    { pidx: 1, x: W * 0.82, y: gy - ARCHER_H, dead: false, deadTimer: 0, walkT: 0 },
  ];
  arrows   = [];
  birds    = [];
  confetti = [];
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
    x: a.x + dir * ARCHER_W * 0.8,
    y: a.y + ARCHER_H * 0.3,
    vx: dir * spd * Math.cos(LAUNCH_ANG),
    vy: -spd * Math.sin(LAUNCH_ANG),
    owner: pidx, redirected: false, age: 0, charge,
  });
}

// ── Bot shoot ─────────────────────────────────────────────────────────────────
function botShoot() {
  const bot = archers[1], player = archers[0];
  if (!bot || bot.dead || !player || player.dead) return;
  const dist = Math.abs(player.x - bot.x);
  const exactSpd    = Math.sqrt(dist * GRAVITY / Math.sin(2 * LAUNCH_ANG));
  const exactCharge = (exactSpd - SPD_MIN) / (SPD_MAX - SPD_MIN);
  const charge = Math.max(0.05, Math.min(1, exactCharge + (Math.random() - 0.5) * 0.3));
  fireArrow(1, charge);
}

// ── Bot movement ──────────────────────────────────────────────────────────────
function botMove(dt) {
  const bot = archers[1], player = archers[0];
  if (!bot || bot.dead || !player) return;
  const dist = Math.abs(player.x - bot.x);
  const IDEAL = W * 0.38;
  const speed = ARCHER_SPEED * 0.7;
  if (dist < IDEAL - 80) {
    bot.x += (bot.x > player.x ? 1 : -1) * speed * dt;
    bot.walkT += dt;
  } else if (dist > IDEAL + 100) {
    bot.x += (bot.x < player.x ? 1 : -1) * speed * dt;
    bot.walkT += dt;
  }
  bot.x = Math.max(20, Math.min(W - 60, bot.x));
}

// ── Birds ─────────────────────────────────────────────────────────────────────
function spawnBird() {
  const fromLeft = Math.random() < 0.5;
  const gy = GROUND_Y();
  birds.push({
    x: fromLeft ? -40 : W + 40,
    y: gy * (0.18 + Math.random() * 0.42),
    vx: fromLeft ? 100 + Math.random() * 60 : -(100 + Math.random() * 60),
    alive: true, wing: Math.random() * Math.PI * 2,
  });
}

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
  particles = [];
  const type = MAPS[mapName].particles;
  if (type === 'snow') {
    for (let i = 0; i < 80; i++)
      particles.push({ x: Math.random()*W, y: Math.random()*H,
        vx:(Math.random()-.5)*18, vy:28+Math.random()*40, r:1.5+Math.random()*2.5, type:'snow' });
  } else if (type === 'leaves') {
    for (let i = 0; i < 40; i++)
      particles.push({ x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-.5)*30, vy:20+Math.random()*30, r:4+Math.random()*4,
        rot:Math.random()*Math.PI*2, type:'leaf' });
  }
}

function spawnConfetti(cx, cy, colA, colB) {
  for (let i = 0; i < 120; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const spd   = 80 + Math.random() * 420;
    confetti.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 250,
      col: [colA, colB, '#FFD700', '#fff'][Math.floor(Math.random() * 4)],
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 14,
      alpha: 1,
    });
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

  // During win celebration: only update confetti & winState timer
  if (winState) {
    winState.time += dt;
    // bounce the winner archer's Y each frame
    for (const c of confetti) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 680 * dt;
      c.vx *= 0.992;
      c.rot += c.rotV * dt;
      c.alpha = Math.max(0, c.alpha - dt * 0.22);
    }
    return;
  }

  // ── Movement ─────────────────────────────────────────────────────────────
  const a0 = archers[0];
  if (a0 && !a0.dead) {
    let moved = false;
    if (keys['KeyA']) { a0.x -= ARCHER_SPEED * dt; moved = true; }
    if (keys['KeyD']) { a0.x += ARCHER_SPEED * dt; moved = true; }
    if (moved) a0.walkT += dt;
    a0.x = Math.max(20, Math.min(W - 60, a0.x));
  }

  if (gameMode === 2) {
    const a1 = archers[1];
    if (a1 && !a1.dead) {
      let moved = false;
      if (keys['ArrowLeft'])  { a1.x -= ARCHER_SPEED * dt; moved = true; }
      if (keys['ArrowRight']) { a1.x += ARCHER_SPEED * dt; moved = true; }
      if (moved) a1.walkT += dt;
      a1.x = Math.max(20, Math.min(W - 60, a1.x));
    }
  } else {
    botMove(dt);
  }

  // ── Bot shoot ─────────────────────────────────────────────────────────────
  if (gameMode === 1 && archers[1] && !archers[1].dead) {
    botTimer -= dt;
    if (botTimer <= 0) { botShoot(); botTimer = BOT_DELAY + (Math.random() * 0.8 - 0.4); }
  }

  // ── Birds ─────────────────────────────────────────────────────────────────
  birdTimer -= dt;
  if (birdTimer <= 0) { spawnBird(); birdTimer = 3; }
  for (const b of birds) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.wing += 9 * dt;
    if (b.x < -80 || b.x > W + 80) b.alive = false;
  }

  // ── Arrows ────────────────────────────────────────────────────────────────
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
      if (Math.sqrt(dx*dx + dy*dy) < 28) {
        b.alive = false;
        const enemy = archers[1 - ar.owner];
        if (enemy && !enemy.dead) {
          const rdx = enemy.x - ar.x;
          const rdy = (enemy.y + ARCHER_H * 0.35) - ar.y;
          const rd  = Math.sqrt(rdx*rdx + rdy*rdy) || 1;
          const spd = Math.sqrt(ar.vx*ar.vx + ar.vy*ar.vy);
          ar.vx = (rdx/rd)*spd; ar.vy = (rdy/rd)*spd;
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
      const dx = ar.x - (a.x + ARCHER_W*0.5);
      const dy = ar.y - (a.y + ARCHER_H*0.5);
      if (Math.abs(dx) < ARCHER_W*0.75 && Math.abs(dy) < ARCHER_H*0.7) {
        a.dead = true; a.deadTimer = 1.5;
        arrows.splice(i, 1);
        addKill(ar.owner); break;
      }
    }
  }

  // ── Revive ────────────────────────────────────────────────────────────────
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

  // ── Env particles ─────────────────────────────────────────────────────────
  for (const p of particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'leaf') p.rot += dt * 2;
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
    if (p.x > W + 20) p.x = -20;
    if (p.x < -20)    p.x = W + 20;
  }
}

// ── Kill / end ────────────────────────────────────────────────────────────────
function addKill(pidx) {
  score[pidx]++;
  chargeStart[0] = chargeStart[1] = -1;
  if (score[pidx] >= WIN_SCORE) {
    setTimeout(() => endGame(pidx), 400);
  } else {
    setTimeout(initRound, 1300);
  }
}

function endGame(winner) {
  winState = { winner, time: 0 };
  // Spawn confetti from winner
  const wx = archers[winner]?.x ?? W/2;
  const wy = archers[winner]?.y ?? H/2;
  spawnConfetti(wx + ARCHER_W/2, wy, winner === 0 ? '#e04444' : '#4488ee', '#FFD700');

  // Style and show the overlay
  const el = document.getElementById('over-overlay');
  el.style.background = 'rgba(0,0,0,0.45)';
  el.style.alignItems = 'flex-end';

  const isRed  = winner === 0;
  const col    = isRed ? '#e04444' : '#4488ee';
  const label  = isRed ? '🔴 RED WINS!' : '🔵 BLUE WINS!';
  const sub    = isRed
    ? (gameMode === 1 ? 'Player 1 wins!' : 'Player 1 wins!')
    : (gameMode === 1 ? 'Bot wins!'      : 'Player 2 wins!');

  document.getElementById('over-emoji').textContent  = '🏆';
  document.getElementById('over-title').style.color  = col;
  document.getElementById('over-title').textContent  = label;
  document.getElementById('over-winner').textContent = sub;
  el.style.display = 'flex';
  const sb = document.getElementById('wb-fa-share');
  if(sb) sb.onclick = ()=>WackyShare.show('Fight Arrows', `${sub} ${score[0]}-${score[1]} in Fight Arrows!`, 'https://wackybrains.com/fight-arrows/');
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
  ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();

  drawParticles();
  drawBirds();

  // Trajectory previews
  if (!winState) {
    for (let p = 0; p < 2; p++) {
      if (chargeStart[p] >= 0 && archers[p] && !archers[p].dead)
        drawTrajectory(archers[p], getCharge(p));
    }
  }

  drawArrows();

  // Archers
  if (winState) {
    drawWinCelebration(gy);
  } else {
    for (const a of archers) drawArcher(a, false);
  }

  // Confetti (drawn on top of everything)
  drawConfetti();

  drawHUD();
}

// ── Win celebration ───────────────────────────────────────────────────────────
function drawWinCelebration(gy) {
  const t = winState.time;
  const w = winState.winner;

  for (let p = 0; p < 2; p++) {
    const a = archers[p];
    if (!a) continue;
    if (p === w) {
      // Dancing winner: bounce up and down
      const bounce = Math.abs(Math.sin(t * 7)) * 26;
      drawCelebrationArcher(a, -bounce, t);
    } else {
      // Loser: fallen / faded
      ctx.globalAlpha = 0.4;
      drawFallenArcher(a);
      ctx.globalAlpha = 1;
    }
  }

  // Big winner text on canvas (on winner's side)
  const winner = archers[w];
  if (winner) {
    const tx     = w === 0 ? W * 0.27 : W * 0.73;
    const ty     = H * 0.38;
    const label  = w === 0 ? '🔴 RED WINS!' : '🔵 BLUE WINS!';
    const col    = w === 0 ? '#e04444' : '#4488ee';
    const pulse  = 1 + Math.sin(t * 5) * 0.08;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(pulse, pulse);
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(label, 3, 3);
    ctx.fillStyle = col;
    ctx.fillText(label, 0, 0);
    // Stars around text
    for (let i = 0; i < 5; i++) {
      const sa = i * (Math.PI * 2 / 5) + t * 2;
      const sr = 80 + Math.sin(t * 3 + i) * 10;
      ctx.fillStyle = '#FFD700';
      ctx.font = '18px monospace';
      ctx.fillText('★', Math.cos(sa)*sr, Math.sin(sa)*sr + 10);
    }
    ctx.restore();
  }
}

function drawCelebrationArcher(a, yOff, t) {
  const x  = a.x;
  const y  = a.y + yOff;
  const bw = ARCHER_W, bh = ARCHER_H;
  const bodyCol = a.pidx === 0 ? '#e04444' : '#4488ee';
  const skinCol = '#f5c9a0';

  // Legs — alternating step
  const legSwing = Math.sin(t * 9) * 14;
  ctx.strokeStyle = bodyCol; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x+bw*.5, y+bh*.62); ctx.lineTo(x+bw*.25+legSwing, y+bh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+bw*.5, y+bh*.62); ctx.lineTo(x+bw*.75-legSwing, y+bh); ctx.stroke();

  // Body
  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.roundRect(x+bw*.12,y+bh*.28,bw*.76,bh*.40,6); ctx.fill();

  // Arms raised in V shape
  const armWave = Math.sin(t * 8) * 8;
  ctx.strokeStyle = skinCol; ctx.lineWidth = 4;
  // Left arm up
  ctx.beginPath();
  ctx.moveTo(x+bw*.3, y+bh*.35);
  ctx.lineTo(x+bw*.3 - 20, y+bh*.35 - 28 + armWave);
  ctx.stroke();
  // Right arm up
  ctx.beginPath();
  ctx.moveTo(x+bw*.7, y+bh*.35);
  ctx.lineTo(x+bw*.7 + 20, y+bh*.35 - 28 - armWave);
  ctx.stroke();

  // Head
  ctx.fillStyle = skinCol;
  ctx.beginPath(); ctx.arc(x+bw*.5, y+bh*.15, bw*.38, 0, Math.PI*2); ctx.fill();

  // Big smile
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x+bw*.5, y+bh*.17, bw*.2, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Eyes happy
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(x+bw*.5-5, y+bh*.11, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+bw*.5+5, y+bh*.11, 2.5, 0, Math.PI*2); ctx.fill();

  // Hat
  ctx.fillStyle = a.pidx === 0 ? '#cc2222' : '#2244aa';
  ctx.beginPath(); ctx.ellipse(x+bw*.5,y+bh*.08,bw*.44,bh*.08,0,Math.PI,0); ctx.fill();

  // Floating stars
  for (let s = 0; s < 3; s++) {
    const sa = s * (Math.PI*2/3) + t * 3;
    const sr = bw * 1.2;
    ctx.fillStyle = '#FFD700';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('★', x+bw*.5 + Math.cos(sa)*sr, y + Math.sin(sa)*sr);
  }
}

function drawFallenArcher(a) {
  // Draw archer rotated 90° (fallen over)
  ctx.save();
  ctx.translate(a.x + ARCHER_W/2, a.y + ARCHER_H);
  ctx.rotate(Math.PI / 2);
  const x = -ARCHER_W/2, y = -ARCHER_H/2;
  const bw = ARCHER_W, bh = ARCHER_H;
  const bodyCol = a.pidx === 0 ? '#e04444' : '#4488ee';
  const skinCol = '#f5c9a0';
  ctx.strokeStyle = bodyCol; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.62); ctx.lineTo(x+bw*.25,y+bh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.62); ctx.lineTo(x+bw*.75,y+bh); ctx.stroke();
  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.roundRect(x+bw*.12,y+bh*.28,bw*.76,bh*.40,6); ctx.fill();
  ctx.fillStyle = skinCol;
  ctx.beginPath(); ctx.arc(x+bw*.5,y+bh*.15,bw*.38,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawConfetti() {
  for (const c of confetti) {
    if (c.alpha <= 0) continue;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = c.col;
    ctx.fillRect(-c.w/2, -c.h/2, c.w, c.h);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ── Trajectory preview ────────────────────────────────────────────────────────
function drawTrajectory(a, charge) {
  const enemy = archers[1 - a.pidx];
  if (!enemy) return;
  const dir = (enemy.x >= a.x) ? 1 : -1;
  const spd = SPD_MIN + charge * (SPD_MAX - SPD_MIN);
  const pvx = dir * spd * Math.cos(LAUNCH_ANG);
  const pvy = -spd * Math.sin(LAUNCH_ANG);
  const gy  = GROUND_Y();
  const ox  = a.x + dir * ARCHER_W * 0.8;
  const oy  = a.y + ARCHER_H * 0.3;
  const approxRange = (spd * spd * Math.sin(2 * LAUNCH_ANG)) / GRAVITY;
  const dist  = Math.abs(enemy.x - a.x);
  const ratio = approxRange / dist;
  const dotCol = ratio < 0.75 ? 'rgba(255,160,0,0.7)' : ratio > 1.35 ? 'rgba(255,60,60,0.7)' : 'rgba(100,255,80,0.7)';
  ctx.fillStyle = dotCol;
  for (let t = 0.045; t < 4.0; t += 0.045) {
    const nx = ox + pvx * t;
    const ny = oy + pvy * t + 0.5 * GRAVITY * t * t;
    if (ny > gy || nx < -10 || nx > W + 10) break;
    ctx.globalAlpha = Math.max(0.12, 1 - t * 0.22);
    ctx.beginPath(); ctx.arc(nx, ny, Math.max(1, 2.8 - t * 0.3), 0, Math.PI*2); ctx.fill();
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
    ctx.fillStyle = '#FFE060'; ctx.shadowBlur = 40; ctx.shadowColor = '#FFB000';
    ctx.beginPath(); ctx.arc(W*.85,H*.15,44,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    drawCactus(W*.12,gy); drawCactus(W*.62,gy); drawCactus(W*.9,gy);
  } else {
    drawTree(W*.05,gy,70); drawTree(W*.2,gy,90); drawTree(W*.78,gy,80); drawTree(W*.94,gy,65);
  }
}

function drawCactus(x, gy) {
  ctx.fillStyle = '#3a8a3a';
  ctx.fillRect(x-8,gy-70,16,70);
  ctx.fillRect(x-28,gy-52,20,10); ctx.fillRect(x+8,gy-46,20,10);
  ctx.fillRect(x-28,gy-52,10,-20); ctx.fillRect(x+18,gy-46,10,-20);
}

function drawTree(x, gy, h) {
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x-6,gy-h*.45,12,h*.45);
  ctx.fillStyle = '#1a6a10'; ctx.beginPath(); ctx.arc(x,gy-h*.6,h*.38,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2a8a18';
  ctx.beginPath(); ctx.arc(x-h*.1,gy-h*.72,h*.28,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+h*.12,gy-h*.68,h*.26,0,Math.PI*2); ctx.fill();
}

// ── Env particles ─────────────────────────────────────────────────────────────
function drawParticles() {
  for (const p of particles) {
    if (p.type === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    } else {
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle = '#5aaa28';
      ctx.beginPath(); ctx.ellipse(0,0,p.r,p.r*.5,0,0,Math.PI*2); ctx.fill();
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
    ctx.beginPath(); ctx.ellipse(b.x,b.y,12,7,0,0,Math.PI*2); ctx.fill();
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
    ctx.save(); ctx.translate(ar.x,ar.y); ctx.rotate(angle);
    ctx.strokeStyle = ar.redirected ? '#FF6600' : '#8B5A00'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(12,0); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(20,-3); ctx.lineTo(20,3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = ar.redirected ? '#FF4400' : '#cc3333';
    ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(-16,-6); ctx.lineTo(-14,0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(-16, 6); ctx.lineTo(-14,0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// ── Normal archer draw ────────────────────────────────────────────────────────
function drawArcher(a) {
  if (a.dead) {
    ctx.globalAlpha = 0.3; drawArcherShape(a, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
    ctx.fillText('💀 ' + Math.ceil(a.deadTimer), a.x + ARCHER_W/2, a.y - 10);
    return;
  }
  const charge = chargeStart[a.pidx] >= 0 ? getCharge(a.pidx) : 0;
  drawArcherShape(a, charge);
  if (charge > 0) drawChargeBar(a, charge);
}

function drawArcherShape(a, charge) {
  const x  = a.x, y = a.y;
  const bw = ARCHER_W, bh = ARCHER_H;
  const enemy = archers[1 - a.pidx];
  const facingRight = enemy ? (enemy.x >= a.x) : (a.pidx === 0);
  const dir = facingRight ? 1 : -1;
  const bodyCol = a.pidx === 0 ? '#e04444' : '#4488ee';
  const skinCol = '#f5c9a0';

  // Walking legs
  const isMoving = (a.pidx === 0 && (keys['KeyA'] || keys['KeyD'])) ||
                   (a.pidx === 1 && gameMode === 2 && (keys['ArrowLeft'] || keys['ArrowRight']));
  const legSwing = isMoving ? Math.sin((a.walkT || 0) * 9) * 12 : 0;

  ctx.strokeStyle = bodyCol; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.62); ctx.lineTo(x+bw*.25+legSwing,y+bh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.62); ctx.lineTo(x+bw*.75-legSwing,y+bh); ctx.stroke();

  ctx.fillStyle = bodyCol;
  ctx.beginPath(); ctx.roundRect(x+bw*.12,y+bh*.28,bw*.76,bh*.40,6); ctx.fill();

  // Bow arm
  ctx.strokeStyle = skinCol; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.35); ctx.lineTo(x+bw*.5+dir*bw*.9,y+bh*.32); ctx.stroke();

  // Bow
  const bowX = x + bw*.5 + dir*bw*.9, bowY = y + bh*.32;
  ctx.strokeStyle = '#8B5A00'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(bowX-dir*4, bowY, 14, dir>0 ? -Math.PI*.55 : Math.PI*.45, dir>0 ? Math.PI*.55 : -Math.PI*.45+Math.PI*2);
  ctx.stroke();

  // Bowstring (pulls back with charge)
  const pullBack = charge * dir * 9;
  const midX = bowX - dir*4 - pullBack;
  ctx.strokeStyle = charge > 0 ? '#FFD700' : '#ccc'; ctx.lineWidth = charge > 0 ? 2 : 1.5;
  ctx.beginPath(); ctx.moveTo(bowX-dir*4,bowY-14); ctx.lineTo(midX,bowY); ctx.lineTo(bowX-dir*4,bowY+14); ctx.stroke();

  // Draw-back arm
  ctx.strokeStyle = skinCol; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x+bw*.5,y+bh*.35); ctx.lineTo(x+bw*.5-dir*bw*.5-pullBack,y+bh*.38); ctx.stroke();

  ctx.fillStyle = skinCol;
  ctx.beginPath(); ctx.arc(x+bw*.5,y+bh*.15,bw*.38,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x+bw*.5+dir*6,y+bh*.13,3,0,Math.PI*2); ctx.fill();

  ctx.fillStyle = a.pidx === 0 ? '#cc2222' : '#2244aa';
  ctx.beginPath(); ctx.ellipse(x+bw*.5,y+bh*.08,bw*.44,bh*.08,0,Math.PI,0); ctx.fill();

  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
  ctx.fillText(a.pidx === 0 ? 'P1' : (gameMode === 1 ? 'BOT' : 'P2'), x+bw*.5, y-6);
}

function drawChargeBar(a, charge) {
  const cx = a.x + ARCHER_W/2, cy = a.y - 22;
  const bw = 46, bh = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(cx-bw/2-1,cy-bh/2-1,bw+2,bh+2,4); ctx.fill();
  const r = Math.round(255 * Math.min(1, charge*2));
  const g = Math.round(255 * Math.min(1, (1-charge)*2));
  ctx.fillStyle = `rgb(${r},${g},0)`;
  ctx.beginPath(); ctx.roundRect(cx-bw/2,cy-bh/2,bw*charge,bh,3); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx-bw/2,cy-bh/2,bw,bh,3); ctx.stroke();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.58)'; ctx.fillRect(0,0,W,56);
  const p1Name = 'P1', p2Name = gameMode===1 ? 'BOT' : 'P2';

  ctx.fillStyle = '#e04444'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left';
  ctx.fillText(p1Name, 18, 34);
  ctx.fillStyle = '#fff'; ctx.fillText(score[0], 60, 34);
  for (let i = 0; i < WIN_SCORE; i++) {
    ctx.fillStyle = i < score[0] ? '#e04444' : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(92+i*20,44,6,0,Math.PI*2); ctx.fill();
  }

  ctx.fillStyle = '#4488ee'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'right';
  ctx.fillText(p2Name, W-18, 34);
  ctx.fillStyle = '#fff'; ctx.fillText(score[1], W-60, 34);
  for (let i = 0; i < WIN_SCORE; i++) {
    ctx.fillStyle = i < score[1] ? '#4488ee' : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(W-92-i*20,44,6,0,Math.PI*2); ctx.fill();
  }

  ctx.fillStyle = '#FFD700'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
  ctx.fillText('⚔ FIGHT ARROWS ⚔', W/2, 30);
  ctx.fillStyle = '#aaa'; ctx.font = '11px monospace';
  ctx.fillText('First to '+WIN_SCORE+' wins', W/2, 46);

  if (!winState) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('[A/D] move  [W] hold+release to shoot', 14, H-10);
    if (gameMode === 2) {
      ctx.textAlign = 'right';
      ctx.fillText('[←/→] move  [↑] hold+release to shoot', W-14, H-10);
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
  ctx.fillText(mapName.toUpperCase()+' MAP', W/2, H-10);
}
