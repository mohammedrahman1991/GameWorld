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
let gameMode   = 1;       // 1 or 2
let mapName    = 'snow';  // 'snow' | 'desert' | 'jungle'
let running    = false;
let animId     = null;
let score      = [0, 0];  // [p1, p2/bot]
const WIN_SCORE = 5;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  e.preventDefault();
  if ((e.key === 'r' || e.key === 'R') && !running) restartGame();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

// Track W/Up as single-fire (not hold-to-spam)
const fired = { KeyW: false, ArrowUp: false };
window.addEventListener('keydown', e => {
  if (e.code === 'KeyW' && !fired.KeyW) {
    fired.KeyW = true;
    if (running) tryShoot(0);
  }
  if (e.code === 'ArrowUp' && !fired.ArrowUp) {
    fired.ArrowUp = true;
    if (running && gameMode === 2) tryShoot(1);
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'KeyW')    fired.KeyW    = false;
  if (e.code === 'ArrowUp') fired.ArrowUp = false;
});

// ── Map configs ───────────────────────────────────────────────────────────────
const MAPS = {
  snow: {
    skyTop:    '#5b8fa8',
    skyBot:    '#c9e8f5',
    groundTop: '#e8f4f8',
    groundBot: '#b0d4e8',
    groundH:   0.22,
    particles: 'snow',
    accent:    '#aad4ee',
  },
  desert: {
    skyTop:    '#e8822a',
    skyBot:    '#f7d08a',
    groundTop: '#d4a052',
    groundBot: '#a0742a',
    groundH:   0.20,
    particles: 'none',
    accent:    '#f5b84a',
  },
  jungle: {
    skyTop:    '#0a2a0a',
    skyBot:    '#1e5a1e',
    groundTop: '#2a5a18',
    groundBot: '#1a3a0a',
    groundH:   0.22,
    particles: 'leaves',
    accent:    '#4aaa28',
  },
};

// ── Entities ──────────────────────────────────────────────────────────────────
let archers   = [];   // [{x,y,vx,vy,dead,deadTimer,pidx,score}]
let arrows    = [];   // [{x,y,vx,vy,owner,redirected,age}]
let birds     = [];   // [{x,y,vx,vy,alive}]
let particles = [];   // snow / leaf particles

const GROUND_Y   = () => H * (1 - MAPS[mapName].groundH);
const ARCHER_W   = 28;
const ARCHER_H   = 52;
const ARROW_SPD  = 620;
const GRAVITY    = 560;
const BOT_DELAY  = 1.4;  // seconds between bot shots
let   botTimer   = 0;
let   birdTimer  = 0;
let   lastTime   = 0;

// ── UI helpers ────────────────────────────────────────────────────────────────
function show(id)  { document.getElementById(id).style.display = 'flex'; }
function hide(id)  { document.getElementById(id).style.display = 'none'; }

// ── Mode / map selection (called from HTML) ───────────────────────────────────
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
  hide('over-overlay');
  show('start-overlay');
}

// ── Round init ────────────────────────────────────────────────────────────────
function initRound() {
  const gy = GROUND_Y();
  archers = [
    makeArcher(0, W * 0.18, gy - ARCHER_H),
    makeArcher(1, W * 0.82, gy - ARCHER_H),
  ];
  arrows  = [];
  birds   = [];
  botTimer = BOT_DELAY;
  birdTimer = 3;
  initParticles();
}

function makeArcher(pidx, x, y) {
  return { pidx, x, y, dead: false, deadTimer: 0, bowAngle: -0.4, respawnDelay: 0 };
}

// ── Shooting ──────────────────────────────────────────────────────────────────
function tryShoot(pidx) {
  const a = archers[pidx];
  if (!a || a.dead) return;
  const enemy = archers[1 - pidx];
  const dir   = (enemy.x > a.x) ? 1 : -1;

  // Aim slightly upward so arrow arcs toward enemy
  const dx = enemy.x - a.x;
  const dy = enemy.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const t = dist / ARROW_SPD;              // rough flight time
  const launchVY = (dy - 0.5 * GRAVITY * t * t) / t;

  arrows.push({
    x:    a.x + dir * (ARCHER_W * 0.6),
    y:    a.y + ARCHER_H * 0.35,
    vx:   dir * ARROW_SPD * 0.82,
    vy:   Math.max(launchVY, -ARROW_SPD * 0.9),
    owner: pidx,
    redirected: false,
    age: 0,
  });
}

// ── Birds ─────────────────────────────────────────────────────────────────────
function spawnBird() {
  const fromLeft = Math.random() < 0.5;
  const gy = GROUND_Y();
  birds.push({
    x:    fromLeft ? -40 : W + 40,
    y:    gy * (0.2 + Math.random() * 0.45),
    vx:   fromLeft ? 110 + Math.random() * 60 : -(110 + Math.random() * 60),
    alive: true,
    wing: 0,
  });
}

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
  particles = [];
  const type = MAPS[mapName].particles;
  if (type === 'snow') {
    for (let i = 0; i < 80; i++) {
      particles.push({ x: Math.random() * 2000, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 18, vy: 28 + Math.random() * 40,
        r: 1.5 + Math.random() * 2.5, type: 'snow' });
    }
  } else if (type === 'leaves') {
    for (let i = 0; i < 40; i++) {
      particles.push({ x: Math.random() * 2000, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 30, vy: 20 + Math.random() * 30,
        r: 4 + Math.random() * 4, rot: Math.random() * Math.PI * 2, type: 'leaf' });
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  if (running) {
    update(dt);
    render();
  }
  animId = requestAnimationFrame(loop);
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  const gy = GROUND_Y();

  // Bot shoot
  if (gameMode === 1 && !archers[1].dead) {
    botTimer -= dt;
    if (botTimer <= 0) {
      botShoot();
      botTimer = BOT_DELAY + (Math.random() * 0.6 - 0.3);
    }
  }

  // Spawn birds
  birdTimer -= dt;
  if (birdTimer <= 0) {
    spawnBird();
    birdTimer = 3;
  }

  // Update birds
  for (const b of birds) {
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.wing += 8 * dt;
    if (b.x < -80 || b.x > W + 80) b.alive = false;
  }

  // Update arrows
  for (let i = arrows.length - 1; i >= 0; i--) {
    const ar = arrows[i];
    ar.x  += ar.vx * dt;
    ar.vy += GRAVITY * dt;
    ar.y  += ar.vy * dt;
    ar.age += dt;

    // Hit ground or out of bounds
    if (ar.y > gy + 20 || ar.x < -50 || ar.x > W + 50 || ar.age > 4.5) {
      arrows.splice(i, 1); continue;
    }

    // Check bird collision
    let hitBird = false;
    for (const b of birds) {
      if (!b.alive) continue;
      const dx = ar.x - b.x, dy = ar.y - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < 26) {
        b.alive = false;
        // Redirect arrow toward enemy
        const enemy = archers[1 - ar.owner];
        if (!enemy.dead) {
          const rdx = enemy.x - ar.x;
          const rdy = enemy.y + ARCHER_H * 0.35 - ar.y;
          const rd  = Math.sqrt(rdx * rdx + rdy * rdy);
          const spd = ARROW_SPD * 0.9;
          ar.vx = (rdx / rd) * spd;
          ar.vy = (rdy / rd) * spd;
          ar.redirected = true;
        }
        hitBird = true;
        break;
      }
    }
    if (hitBird) continue;

    // Check archer collision
    for (let p = 0; p < 2; p++) {
      if (p === ar.owner && !ar.redirected) continue;  // can't self-hit unless redirected
      const a = archers[p];
      if (a.dead) continue;
      const dx = ar.x - (a.x + ARCHER_W * 0.5);
      const dy = ar.y - (a.y + ARCHER_H * 0.5);
      if (Math.abs(dx) < ARCHER_W * 0.7 && Math.abs(dy) < ARCHER_H * 0.7) {
        // Hit!
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

  // Update particles
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'leaf') p.rot += dt * 2;
    if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
    if (p.x > W + 20) p.x = -20;
    if (p.x < -20)    p.x = W + 20;
  }
}

function botShoot() {
  const bot    = archers[1];
  const player = archers[0];
  if (!player.dead) {
    const jitter = (Math.random() - 0.5) * 60;
    const fakeEnemy = { x: player.x + jitter, y: player.y };
    const dir = (fakeEnemy.x > bot.x) ? 1 : -1;
    const dx  = fakeEnemy.x - bot.x;
    const dy  = fakeEnemy.y - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t    = dist / ARROW_SPD;
    const launchVY = (dy - 0.5 * GRAVITY * t * t) / t;
    arrows.push({
      x:    bot.x + dir * (ARCHER_W * 0.6),
      y:    bot.y + ARCHER_H * 0.35,
      vx:   dir * ARROW_SPD * 0.82,
      vy:   Math.max(launchVY, -ARROW_SPD * 0.9),
      owner: 1,
      redirected: false,
      age: 0,
    });
  }
}

function addKill(pidx) {
  score[pidx]++;
  if (score[pidx] >= WIN_SCORE) {
    setTimeout(() => endGame(pidx), 400);
  } else {
    // Short pause then new round
    setTimeout(initRound, 1200);
  }
}

function endGame(winner) {
  running = false;
  const names = (gameMode === 2) ? ['Player 1', 'Player 2'] : ['Player 1', 'Bot'];
  document.getElementById('over-emoji').textContent   = winner === 0 ? '🏆' : (gameMode === 1 ? '🤖' : '🏆');
  document.getElementById('over-title').textContent   = 'WINNER!';
  document.getElementById('over-winner').textContent  = names[winner] + ' wins!';
  document.getElementById('over-overlay').style.display = 'flex';
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const map = MAPS[mapName];
  const gy  = GROUND_Y();

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, gy);
  skyGrad.addColorStop(0, map.skyTop);
  skyGrad.addColorStop(1, map.skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, gy);

  // Map decorations
  drawMapDecor(map, gy);

  // Ground
  const gGrad = ctx.createLinearGradient(0, gy, 0, H);
  gGrad.addColorStop(0, map.groundTop);
  gGrad.addColorStop(1, map.groundBot);
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, gy, W, H - gy);

  // Ground line
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();

  // Particles
  drawParticles();

  // Birds
  drawBirds();

  // Arrows
  drawArrows();

  // Archers
  for (const a of archers) drawArcher(a);

  // HUD
  drawHUD();
}

function drawMapDecor(map, gy) {
  if (mapName === 'snow') {
    // Mountains
    ctx.fillStyle = 'rgba(200,230,245,0.5)';
    for (const [mx, mw, mh] of [[W*0.1,160,120],[W*0.35,120,90],[W*0.7,180,140],[W*0.88,100,80]]) {
      ctx.beginPath();
      ctx.moveTo(mx - mw/2, gy);
      ctx.lineTo(mx, gy - mh);
      ctx.lineTo(mx + mw/2, gy);
      ctx.closePath(); ctx.fill();
    }
    // Snow caps
    ctx.fillStyle = '#fff';
    for (const [mx, mw, mh] of [[W*0.1,160,120],[W*0.35,120,90],[W*0.7,180,140],[W*0.88,100,80]]) {
      ctx.beginPath();
      ctx.moveTo(mx - mw*0.22, gy - mh*0.6);
      ctx.lineTo(mx, gy - mh);
      ctx.lineTo(mx + mw*0.22, gy - mh*0.6);
      ctx.closePath(); ctx.fill();
    }
  } else if (mapName === 'desert') {
    // Sun
    ctx.fillStyle = '#FFE060';
    ctx.shadowBlur = 40; ctx.shadowColor = '#FFB000';
    ctx.beginPath(); ctx.arc(W*0.85, H*0.15, 44, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Cacti
    drawCactus(W*0.12, gy);
    drawCactus(W*0.62, gy);
    drawCactus(W*0.9,  gy);
  } else if (mapName === 'jungle') {
    // Trees
    drawTree(W*0.05, gy, 70);
    drawTree(W*0.2,  gy, 90);
    drawTree(W*0.78, gy, 80);
    drawTree(W*0.94, gy, 65);
  }
}

function drawCactus(x, gy) {
  ctx.fillStyle = '#3a8a3a';
  // Body
  ctx.fillRect(x - 8, gy - 70, 16, 70);
  // Arms
  ctx.fillRect(x - 28, gy - 52, 20, 10);
  ctx.fillRect(x + 8,  gy - 46, 20, 10);
  ctx.fillRect(x - 28, gy - 52, 10, -20);
  ctx.fillRect(x + 18, gy - 46, 10, -20);
}

function drawTree(x, gy, h) {
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x - 6, gy - h * 0.45, 12, h * 0.45);
  ctx.fillStyle = '#1a6a10';
  ctx.beginPath(); ctx.arc(x, gy - h * 0.6, h * 0.38, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2a8a18';
  ctx.beginPath(); ctx.arc(x - h*0.1, gy - h*0.72, h*0.28, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + h*0.12, gy - h*0.68, h*0.26, 0, Math.PI*2); ctx.fill();
}

function drawParticles() {
  for (const p of particles) {
    if (p.type === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    } else if (p.type === 'leaf') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = '#5aaa28';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawBirds() {
  for (const b of birds) {
    if (!b.alive) continue;
    const wf = Math.sin(b.wing) * 8; // wing flap
    ctx.fillStyle = '#2a2a2a';
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2.5;
    // Body
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 12, 7, 0, 0, Math.PI*2); ctx.fill();
    // Wings
    ctx.beginPath();
    ctx.moveTo(b.x - 6, b.y);
    ctx.quadraticCurveTo(b.x - 18, b.y - 6 - wf, b.x - 22, b.y + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x + 6, b.y);
    ctx.quadraticCurveTo(b.x + 18, b.y - 6 - wf, b.x + 22, b.y + 4);
    ctx.stroke();
    // Beak
    const beakDir = b.vx > 0 ? 1 : -1;
    ctx.fillStyle = '#FFB800';
    ctx.beginPath();
    ctx.moveTo(b.x + beakDir * 12, b.y - 2);
    ctx.lineTo(b.x + beakDir * 20, b.y);
    ctx.lineTo(b.x + beakDir * 12, b.y + 3);
    ctx.closePath(); ctx.fill();
  }
}

function drawArrows(){
  for (const ar of arrows) {
    const angle = Math.atan2(ar.vy, ar.vx);
    ctx.save();
    ctx.translate(ar.x, ar.y);
    ctx.rotate(angle);
    // Shaft
    ctx.strokeStyle = ar.redirected ? '#FF6600' : '#8B5A00';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(12, 0); ctx.stroke();
    // Head
    ctx.fillStyle = '#888';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(20, -3); ctx.lineTo(20, 3); ctx.closePath(); ctx.fill();
    // Fletching
    ctx.fillStyle = ar.redirected ? '#FF4400' : '#cc3333';
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-16, -6); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-16, 6); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawArcher(a) {
  if (a.dead) {
    // Ghost / dying indicator
    ctx.globalAlpha = 0.35;
    drawArcherShape(a);
    ctx.globalAlpha = 1;
    // Respawn timer
    const secs = Math.ceil(a.deadTimer);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('💀 ' + secs, a.x + ARCHER_W/2, a.y - 10);
    return;
  }
  drawArcherShape(a);
}

function drawArcherShape(a) {
  const x  = a.x;
  const y  = a.y;
  const bw = ARCHER_W;
  const bh = ARCHER_H;
  const facingRight = (a.pidx === 0) ? (archers[1].x > a.x) : (archers[0].x > a.x);
  const dir = facingRight ? 1 : -1;

  // Colors per player
  const bodyCol = a.pidx === 0 ? '#e04444' : '#4488ee';
  const skinCol = '#f5c9a0';

  // Legs
  ctx.strokeStyle = bodyCol; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + bw*0.5, y + bh*0.62);
  ctx.lineTo(x + bw*0.25, y + bh);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + bw*0.5, y + bh*0.62);
  ctx.lineTo(x + bw*0.75, y + bh);
  ctx.stroke();

  // Body
  ctx.fillStyle = bodyCol;
  ctx.beginPath();
  ctx.roundRect(x + bw*0.12, y + bh*0.28, bw*0.76, bh*0.40, 6);
  ctx.fill();

  // Bow arm
  ctx.strokeStyle = skinCol; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + bw*0.5, y + bh*0.35);
  ctx.lineTo(x + bw*0.5 + dir*bw*0.9, y + bh*0.32);
  ctx.stroke();

  // Bow
  const bowX = x + bw*0.5 + dir*bw*0.9;
  const bowY = y + bh*0.32;
  ctx.strokeStyle = '#8B5A00'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(bowX - dir*4, bowY, 14, dir > 0 ? -Math.PI*0.55 : Math.PI*0.45,
          dir > 0 ? Math.PI*0.55 : -Math.PI*0.45 + Math.PI*2);
  ctx.stroke();
  // Bowstring
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bowX - dir*4, bowY - 14);
  ctx.lineTo(bowX - dir*4, bowY + 14);
  ctx.stroke();

  // Draw-back arm
  ctx.strokeStyle = skinCol; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + bw*0.5, y + bh*0.35);
  ctx.lineTo(x + bw*0.5 - dir*bw*0.5, y + bh*0.38);
  ctx.stroke();

  // Head
  ctx.fillStyle = skinCol;
  ctx.beginPath(); ctx.arc(x + bw*0.5, y + bh*0.15, bw*0.38, 0, Math.PI*2); ctx.fill();

  // Eyes
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x + bw*0.5 + dir*6, y + bh*0.13, 3, 0, Math.PI*2); ctx.fill();

  // Hat (P1 = red cap, P2/bot = blue helmet)
  ctx.fillStyle = a.pidx === 0 ? '#cc2222' : '#2244aa';
  ctx.beginPath();
  ctx.ellipse(x + bw*0.5, y + bh*0.08, bw*0.44, bh*0.08, 0, Math.PI, 0);
  ctx.fill();

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  const label = a.pidx === 0 ? 'P1' : (gameMode === 1 ? 'BOT' : 'P2');
  ctx.fillText(label, x + bw*0.5, y - 6);
}

function drawHUD() {
  const p1Name  = 'P1';
  const p2Name  = gameMode === 1 ? 'BOT' : 'P2';

  // Background bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 54);

  // P1 score (left)
  ctx.fillStyle = '#e04444';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(p1Name, 18, 34);
  ctx.fillStyle = '#fff';
  ctx.fillText(score[0], 60, 34);
  // Pips
  for (let i = 0; i < WIN_SCORE; i++) {
    ctx.fillStyle = i < score[0] ? '#e04444' : 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(90 + i * 20, 44, 6, 0, Math.PI*2); ctx.fill();
  }

  // P2/Bot score (right)
  ctx.fillStyle = '#4488ee';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(p2Name, W - 18, 34);
  ctx.fillStyle = '#fff';
  ctx.fillText(score[1], W - 60, 34);
  // Pips
  for (let i = 0; i < WIN_SCORE; i++) {
    ctx.fillStyle = i < score[1] ? '#4488ee' : 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(W - 90 - i * 20, 44, 6, 0, Math.PI*2); ctx.fill();
  }

  // Title
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔ FIGHT ARROWS ⚔', W/2, 30);
  ctx.fillStyle = '#aaa';
  ctx.font = '11px monospace';
  ctx.fillText('First to ' + WIN_SCORE + ' wins', W/2, 46);

  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('[W] shoot', 14, H - 10);
  if (gameMode === 2) {
    ctx.textAlign = 'right';
    ctx.fillText('[↑] shoot', W - 14, H - 10);
  }

  // Map name
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(mapName.toUpperCase() + ' MAP', W/2, H - 10);
}
