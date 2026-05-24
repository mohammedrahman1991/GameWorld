'use strict';

// ── Constants ────────────────────────────────────────────────────────────────
const WORLD    = 9000;
const FOOD_MAX = 6000;
const BOT_COUNT= 1000;
const MAX_NUM  = 1e12;
const EAT_RATIO= 1.12;
const EAT_GAIN = 0.75;
const CELL     = 350;

// ── Colors (12) ──────────────────────────────────────────────────────────────
const COLORS = [
  {name:'Red',    fill:'#FF4455', rim:'#CC1122'},
  {name:'Orange', fill:'#FF8C22', rim:'#CC5500'},
  {name:'Gold',   fill:'#FFD700', rim:'#BB9900'},
  {name:'Green',  fill:'#44CC44', rim:'#228822'},
  {name:'Cyan',   fill:'#22DDDD', rim:'#008888'},
  {name:'Blue',   fill:'#4488FF', rim:'#1144CC'},
  {name:'Purple', fill:'#AA44FF', rim:'#6600CC'},
  {name:'Pink',   fill:'#FF66CC', rim:'#CC2288'},
  {name:'Coral',  fill:'#FF7766', rim:'#CC2211'},
  {name:'Mint',   fill:'#66FFAA', rim:'#22BB66'},
  {name:'Rose',   fill:'#FF8899', rim:'#CC3355'},
  {name:'Sky',    fill:'#88CCFF', rim:'#3377CC'},
];

const FACE_NAMES = ['Happy 😊','Cool 😎','Angry 😠','Surprised 😮',
                    'Wink 😉','Sad 😢','Goofy 🤪','Sleepy 😴'];

const BOT_NAMES = [
  'Alex','Sam','Jordan','Riley','Casey','Morgan','Taylor','Drew','Quinn','Avery',
  'Blake','Cameron','Dana','Elliot','Finley','Harley','Hunter','Jamie','Jesse','Kai',
  'Logan','Luca','Max','Mickey','Noel','Parker','Peyton','Phoenix','Remy','Robin',
  'Rowan','Ryan','Sage','Skylar','Spencer','Sterling','Sydney','Terry','Tyler','Val',
  'Wesley','Wren','Zion','Ace','Ash','August','Bay','Brett','Chase','Clay',
  'Cole','Cruz','Dale','Dash','Dean','Devon','Dex','Drake','Duke','Dylan',
  'Eli','Emery','Erin','Evan','Fern','Flynn','Ford','Gage','Glen','Gray',
  'Gus','Hal','Hale','Hank','Haven','Heath','Hiro','Hugh','Hugo','Ivan',
  'Jade','Jalen','Jay','Jeff','Jon','Kirk','Knox','Lane','Link','Levi',
  'Mace','Mare','Mars','Mel','Nash','Nate','Neil','Nick','Noah','Nox',
  'Obi','Orion','Owen','Pax','Pierce','Pine','Pixel','Puck','Rad','Rae',
  'Rain','Ram','Rand','Reef','Rex','Rio','Rook','Rush','Rust','Ryder',
  'Sable','Scar','Scout','Sel','Seth','Shade','Shark','Shaw','Shea','Shin',
  'Silo','Sim','Skye','Slate','Sol','Spark','Star','Stone','Storm','Sven',
];

const FOOD_COLORS = ['#FF4466','#FF8844','#FFDD00','#44FF88','#44DDFF',
                     '#8844FF','#FF44DD','#AAFFAA','#FF9944','#44AAFF'];

// ── State ─────────────────────────────────────────────────────────────────────
let canvas, ctx, W, H;
let gameMode = 1;
let running  = false;
let animId   = null;

let players = [];
let bots    = [];
let foods   = [];
let grid    = {};
let king    = null;
let kills   = [0, 0];
let frame   = 0;

let skinColor = [0, 3];
let skinFace  = [0, 2];

let mouseX = 0, mouseY = 0;
const ARROW = {ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false};

let camX = WORLD/2, camY = WORLD/2, camZoom = 1;

// ── Boot ──────────────────────────────────────────────────────────────────────
window.onload = () => {
  canvas = document.getElementById('c');
  ctx    = canvas.getContext('2d');
  resize();
  window.addEventListener('resize',    resize);
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('keydown',   e => { if (ARROW[e.code] !== undefined) { ARROW[e.code] = true; e.preventDefault(); } });
  window.addEventListener('keyup',     e => { if (ARROW[e.code] !== undefined) { ARROW[e.code] = false; } });
  drawPreview(0);
  drawPreview(1);
};

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ── Public UI ─────────────────────────────────────────────────────────────────
function selectMode(n) {
  gameMode = n;
  document.getElementById('start-overlay').style.display = 'none';
  document.getElementById('skin-overlay').style.display  = '';
  document.getElementById('skin-p2').style.display = n === 2 ? '' : 'none';
}

function cycleColor(pidx, dir) {
  skinColor[pidx] = (skinColor[pidx] + dir + COLORS.length) % COLORS.length;
  document.getElementById('cname'+pidx).textContent = COLORS[skinColor[pidx]].name;
  drawPreview(pidx);
}

function cycleFace(pidx, dir) {
  skinFace[pidx] = (skinFace[pidx] + dir + 8) % 8;
  document.getElementById('fname'+pidx).textContent = FACE_NAMES[skinFace[pidx]];
  drawPreview(pidx);
}

function startGame() {
  document.getElementById('skin-overlay').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  initGame();
}

function restartGame() {
  document.getElementById('over-overlay').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  initGame();
}

function goHome() {
  document.getElementById('over-overlay').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  running = false;
  document.getElementById('start-overlay').style.display = '';
}

// ── Skin preview ──────────────────────────────────────────────────────────────
function drawPreview(pidx) {
  const pc = document.getElementById('prev'+pidx);
  if (!pc) return;
  const px = pc.getContext('2d');
  const sz = 130, cx = 65, cy = 65, r = 48;
  px.clearRect(0, 0, sz, sz);
  const ci = skinColor[pidx];
  drawBlobAt(px, cx, cy, r, ci, skinFace[pidx], false, false, '');
}

// ── Math utils ────────────────────────────────────────────────────────────────
function numToR(n)   { return Math.max(15, Math.min(500, Math.sqrt(Math.min(n, MAX_NUM)) * 2.4)); }
function calcZoom(n) { return Math.max(0.12, Math.min(1.3, 130 / Math.sqrt(Math.min(n, MAX_NUM)))); }

function fmt(n) {
  if (n >= 1e12) return '1.0T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3)  return (n/1e3).toFixed(1)+'K';
  return Math.round(n)+'';
}

function lighten(hex, a) {
  const v = parseInt(hex.replace('#',''),16);
  let r=(v>>16)&255, g=(v>>8)&255, b=v&255;
  r = Math.min(255, r + Math.round((255-r)*a));
  g = Math.min(255, g + Math.round((255-g)*a));
  b = Math.min(255, b + Math.round((255-b)*a));
  return `rgb(${r},${g},${b})`;
}

function rnd(lo, hi) { return lo + Math.random()*(hi-lo); }
function d2(a, b)    { return (a.x-b.x)**2 + (a.y-b.y)**2; }

// ── Spatial grid ──────────────────────────────────────────────────────────────
function gkey(x, y) {
  return `${Math.floor(x/CELL)},${Math.floor(y/CELL)}`;
}

function rebuildGrid() {
  grid = {};
  const all = [...bots, ...players, ...foods];
  for (const e of all) {
    if (e.dead) continue;
    const k = gkey(e.x, e.y);
    if (!grid[k]) grid[k] = [];
    grid[k].push(e);
  }
}

function nearby(x, y, r) {
  const out = [];
  const cx0 = Math.floor((x-r)/CELL)-1, cx1 = Math.floor((x+r)/CELL)+1;
  const cy0 = Math.floor((y-r)/CELL)-1, cy1 = Math.floor((y+r)/CELL)+1;
  for (let gx = cx0; gx <= cx1; gx++)
    for (let gy = cy0; gy <= cy1; gy++) {
      const bucket = grid[`${gx},${gy}`];
      if (bucket) for (const e of bucket) out.push(e);
    }
  return out;
}

// ── Factories ─────────────────────────────────────────────────────────────────
function makeFood() {
  return {
    type:'food',
    x: rnd(80, WORLD-80), y: rnd(80, WORLD-80),
    r: 6,
    color: FOOD_COLORS[Math.floor(Math.random()*FOOD_COLORS.length)],
    value: 10,
    dead: false, respawnT: 0,
  };
}

function makeBlob(x, y, num, ci, fi, name, isBot, pidx) {
  return {
    type:'blob', x, y, num, ci, fi, name, isBot, pidx,
    dead:false, respawnT:0,
    targetX:x, targetY:y, aiCountdown:0,
  };
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initGame() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  kills = [0, 0];
  frame = 0;
  king  = null;

  players = [];
  for (let i = 0; i < gameMode; i++) {
    players.push(makeBlob(
      rnd(800, WORLD-800), rnd(800, WORLD-800),
      100, skinColor[i], skinFace[i],
      i === 0 ? 'You' : 'P2', false, i
    ));
  }

  bots = [];
  for (let i = 0; i < BOT_COUNT; i++) {
    bots.push(makeBlob(
      rnd(80, WORLD-80), rnd(80, WORLD-80),
      Math.floor(rnd(80, 500)),
      Math.floor(Math.random()*COLORS.length),
      Math.floor(Math.random()*8),
      BOT_NAMES[i % BOT_NAMES.length], true, -1
    ));
  }

  foods = [];
  for (let i = 0; i < FOOD_MAX; i++) foods.push(makeFood());

  const p0 = players[0];
  camX = p0.x; camY = p0.y; camZoom = 1;
  running = true;
  loop();
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop() {
  animId = requestAnimationFrame(loop);
  if (!running) return;
  update();
  render();
  frame++;
}

// ── Update ────────────────────────────────────────────────────────────────────
const DT = 1/60;

function update() {
  const now = Date.now();

  // Respawn food
  for (const f of foods) {
    if (f.dead && now >= f.respawnT) {
      f.dead = false;
      f.x = rnd(80, WORLD-80);
      f.y = rnd(80, WORLD-80);
      f.color = FOOD_COLORS[Math.floor(Math.random()*FOOD_COLORS.length)];
    }
  }

  // Respawn dead bots
  for (const b of bots) {
    if (b.dead && now >= b.respawnT) {
      b.dead = false;
      b.x = rnd(80, WORLD-80);
      b.y = rnd(80, WORLD-80);
      b.num = Math.floor(rnd(80, 250));
    }
  }

  // Move players
  for (const p of players) {
    if (p.dead) continue;
    const r   = numToR(p.num);
    const spd = Math.max(40, 230 / Math.sqrt(r));
    if (p.pidx === 0) {
      const wx = camX + (mouseX - W/2) / camZoom;
      const wy = camY + (mouseY - H/2) / camZoom;
      const dx = wx - p.x, dy = wy - p.y;
      const d  = Math.sqrt(dx*dx+dy*dy) || 1;
      if (d > 3) { p.x += (dx/d)*spd*DT; p.y += (dy/d)*spd*DT; }
    } else {
      let dx = 0, dy = 0;
      if (ARROW.ArrowLeft)  dx -= 1;
      if (ARROW.ArrowRight) dx += 1;
      if (ARROW.ArrowUp)    dy -= 1;
      if (ARROW.ArrowDown)  dy += 1;
      if (dx || dy) {
        const d = Math.sqrt(dx*dx+dy*dy);
        p.x += (dx/d)*spd*DT;
        p.y += (dy/d)*spd*DT;
      }
    }
    p.x = Math.max(r, Math.min(WORLD-r, p.x));
    p.y = Math.max(r, Math.min(WORLD-r, p.y));
  }

  // Bot AI (batch 60/frame)
  rebuildGrid();
  const bs = (frame * 60) % BOT_COUNT;
  for (let i = 0; i < 60; i++) {
    const b = bots[(bs+i) % BOT_COUNT];
    if (!b.dead) aiBot(b);
  }

  // Move bots
  for (const b of bots) {
    if (b.dead) continue;
    const r   = numToR(b.num);
    const spd = Math.max(40, 230 / Math.sqrt(r));
    const dx  = b.targetX - b.x, dy = b.targetY - b.y;
    const d   = Math.sqrt(dx*dx+dy*dy) || 1;
    if (d > 6) { b.x += (dx/d)*spd*DT; b.y += (dy/d)*spd*DT; }
    b.x = Math.max(r, Math.min(WORLD-r, b.x));
    b.y = Math.max(r, Math.min(WORLD-r, b.y));
  }

  // Collisions
  rebuildGrid();
  const allBlobs = [...players, ...bots].filter(e => !e.dead);
  for (const a of allBlobs) {
    const ra   = numToR(a.num);
    const near = nearby(a.x, a.y, ra * 2.5);
    for (const b of near) {
      if (b === a || b.dead) continue;

      if (b.type === 'food') {
        const dd = Math.sqrt(d2(a, b));
        if (dd < ra + b.r) {
          a.num = Math.min(MAX_NUM, a.num + b.value);
          b.dead = true;
          b.respawnT = now + rnd(2000, 3500);
        }
        continue;
      }

      if (b.type !== 'blob') continue;
      const rb = numToR(b.num);
      if (a.num < b.num * EAT_RATIO) continue; // a is not big enough
      const dd = Math.sqrt(d2(a, b));
      if (dd > ra * 0.9) continue; // centers not close enough

      // a eats b
      a.num = Math.min(MAX_NUM, a.num + b.num * EAT_GAIN);
      b.dead = true;
      b.respawnT = now + rnd(3000, 6000);

      if (!a.isBot) kills[a.pidx]++;

      // Player got eaten
      if (!b.isBot) {
        if (b.pidx === 0) { gameOver(0); return; }
        if (b.pidx === 1) { kills[0] = kills[0]; } // P1 gets credit if P1 ate P2
      }
    }
  }

  // King update
  if (frame % 8 === 0) updateKing();

  // Camera
  if (gameMode === 2 && !players[1]?.dead) {
    const tx = (players[0].x + players[1].x) / 2;
    const ty = (players[0].y + players[1].y) / 2;
    const avgNum = (players[0].num + players[1].num) / 2;
    camX += (tx - camX) * 0.08;
    camY += (ty - camY) * 0.08;
    camZoom += (calcZoom(avgNum) * 0.72 - camZoom) * 0.05;
  } else if (!players[0].dead) {
    camX    += (players[0].x   - camX)    * 0.08;
    camY    += (players[0].y   - camY)    * 0.08;
    camZoom += (calcZoom(players[0].num) - camZoom) * 0.05;
  }

  // Cursor
  const cur = document.getElementById('cursor');
  if (cur) { cur.style.left = mouseX+'px'; cur.style.top = mouseY+'px'; }
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
function aiBot(b) {
  const r     = numToR(b.num);
  const lookR = Math.min(r * 10 + 400, 1800);
  const near  = nearby(b.x, b.y, lookR);

  let bestFood = null, bfD = Infinity;
  let bestPrey = null, bpD = Infinity;
  let threat   = null, tD  = Infinity;

  for (const n of near) {
    if (n === b || n.dead) continue;
    const dd = d2(b, n);

    if (n.type === 'food') {
      if (dd < bfD) { bestFood = n; bfD = dd; }
      continue;
    }
    if (n.type !== 'blob') continue;

    const rn = numToR(n.num);
    if (rn * EAT_RATIO <= r && dd < bpD) { bestPrey = n; bpD = dd; }
    if (rn >= r * EAT_RATIO && dd < tD)  { threat   = n; tD  = dd; }
  }

  if (threat) {
    b.targetX = b.x + (b.x - threat.x) * 2.5;
    b.targetY = b.y + (b.y - threat.y) * 2.5;
  } else if (bestPrey) {
    b.targetX = bestPrey.x; b.targetY = bestPrey.y;
  } else if (bestFood) {
    b.targetX = bestFood.x; b.targetY = bestFood.y;
  } else {
    b.aiCountdown--;
    if (b.aiCountdown <= 0) {
      b.targetX = rnd(120, WORLD-120);
      b.targetY = rnd(120, WORLD-120);
      b.aiCountdown = Math.floor(rnd(60, 180));
    }
  }

  b.targetX = Math.max(80, Math.min(WORLD-80, b.targetX));
  b.targetY = Math.max(80, Math.min(WORLD-80, b.targetY));
}

function updateKing() {
  let top = null, topN = 0;
  for (const e of [...bots, ...players]) {
    if (!e.dead && e.num > topN) { top = e; topN = e.num; }
  }
  king = top;
}

// ── Game over ─────────────────────────────────────────────────────────────────
function gameOver(pidx) {
  running = false;
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  document.getElementById('hud').style.display = 'none';
  document.getElementById('over-score').textContent = fmt(players[pidx].num);
  document.getElementById('over-kills').textContent = kills[pidx];
  const ov = document.getElementById('over-overlay');
  ov.style.display = '';
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W/2, H/2);
  ctx.scale(camZoom, camZoom);
  ctx.translate(-camX, -camY);

  drawBg();

  // Food
  for (const f of foods) if (!f.dead) drawFood(f);

  // Bots sorted small→big so big blobs render on top
  const liveBots = bots.filter(b=>!b.dead).sort((a,b)=>a.num-b.num);
  for (const b of liveBots) drawBlobAt(ctx, b.x, b.y, numToR(b.num), b.ci, b.fi, b === king, true, b.name, b.num);

  // Players on top
  for (const p of players) {
    if (!p.dead) drawBlobAt(ctx, p.x, p.y, numToR(p.num), p.ci, p.fi, p === king, true, p.name, p.num);
  }

  ctx.restore();

  drawHUD();
}

// ── Background ────────────────────────────────────────────────────────────────
function drawBg() {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, WORLD, WORLD);

  // Dot grid
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  const sp = 120;
  const vp = {
    x0: Math.max(0, Math.floor((camX - W/2/camZoom)/sp)*sp),
    y0: Math.max(0, Math.floor((camY - H/2/camZoom)/sp)*sp),
    x1: Math.min(WORLD, Math.ceil((camX + W/2/camZoom)/sp)*sp),
    y1: Math.min(WORLD, Math.ceil((camY + H/2/camZoom)/sp)*sp),
  };
  for (let gx = vp.x0; gx <= vp.x1; gx += sp)
    for (let gy = vp.y0; gy <= vp.y1; gy += sp) {
      ctx.beginPath(); ctx.arc(gx, gy, 2.5, 0, Math.PI*2); ctx.fill();
    }

  // Border
  ctx.strokeStyle = '#FF3333';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, WORLD-10, WORLD-10);
}

// ── Food ──────────────────────────────────────────────────────────────────────
function drawFood(f) {
  ctx.save();
  ctx.shadowColor = f.color;
  ctx.shadowBlur  = 10;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
  ctx.fillStyle = f.color; ctx.fill();
  ctx.restore();
  // shine dot
  ctx.beginPath(); ctx.arc(f.x - f.r*0.3, f.y - f.r*0.35, f.r*0.32, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
}

// ── Blob renderer (shared between preview & main canvas) ──────────────────────
function drawBlobAt(cx, bx, by, r, ci, fi, isKing, showLabel, name, num) {
  const col = COLORS[ci];

  // Drop shadow
  cx.save();
  cx.shadowColor  = 'rgba(0,0,0,0.55)';
  cx.shadowBlur   = r * 0.55;
  cx.shadowOffsetY= r * 0.18;

  // Body gradient
  const g = cx.createRadialGradient(bx-r*0.3, by-r*0.3, r*0.05, bx, by, r);
  g.addColorStop(0, lighten(col.fill, 0.28));
  g.addColorStop(1, col.fill);
  cx.beginPath(); cx.arc(bx, by, r, 0, Math.PI*2);
  cx.fillStyle = g; cx.fill();

  // Rim
  cx.lineWidth = Math.max(2, r*0.055);
  cx.strokeStyle = col.rim; cx.stroke();
  cx.restore();

  // Shine
  cx.beginPath();
  cx.ellipse(bx-r*0.27, by-r*0.33, r*0.27, r*0.15, -0.5, 0, Math.PI*2);
  cx.fillStyle = 'rgba(255,255,255,0.38)'; cx.fill();

  // Face
  drawFace(cx, bx, by, r, fi);

  if (showLabel) {
    // Number
    if (r > 16 && num !== undefined) {
      const fs = Math.min(r*0.43, 56);
      cx.font = `bold ${Math.max(10,fs)}px monospace`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = 'rgba(0,0,0,0.4)';
      cx.fillText(fmt(num), bx+1, by+1);
      cx.fillStyle = '#fff';
      cx.fillText(fmt(num), bx, by);
    }

    // Name
    if (r > 28 && name) {
      const nfs = Math.min(r*0.22, 20);
      cx.font = `${Math.max(9,nfs)}px monospace`;
      cx.textAlign = 'center'; cx.textBaseline = 'bottom';
      cx.fillStyle = 'rgba(0,0,0,0.5)';
      cx.fillText(name, bx+1, by-r-2);
      cx.fillStyle = '#fff';
      cx.fillText(name, bx, by-r-3);
    }
  }

  // Crown
  if (isKing) drawCrown(cx, bx, by, r);
}

// ── Face ──────────────────────────────────────────────────────────────────────
function drawFace(cx, bx, by, r, fi) {
  if (r < 12) return;
  const s = r * 0.38;
  cx.save();
  cx.translate(bx, by);

  switch (fi) {
    case 0: { // Happy
      cx.fillStyle = '#111';
      cx.beginPath(); cx.arc(-s*0.5, -s*0.3, s*0.18, 0, Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc( s*0.5, -s*0.3, s*0.18, 0, Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc(0, s*0.18, s*0.58, 0.12, Math.PI-0.12);
      cx.strokeStyle='#111'; cx.lineWidth=s*0.14; cx.stroke();
      break;
    }
    case 1: { // Cool
      cx.fillStyle = '#111';
      roundedRect(cx, -s*0.92, -s*0.48, s*0.76, s*0.31, 4); cx.fill();
      roundedRect(cx,  s*0.16, -s*0.48, s*0.76, s*0.31, 4); cx.fill();
      cx.strokeStyle = '#777'; cx.lineWidth = 1.5;
      roundedRect(cx, -s*0.92, -s*0.48, s*0.76, s*0.31, 4); cx.stroke();
      roundedRect(cx,  s*0.16, -s*0.48, s*0.76, s*0.31, 4); cx.stroke();
      cx.fillStyle = '#33aaff';
      cx.fillRect(-s*0.56, -s*0.28, s*0.18, s*0.12);
      cx.fillRect( s*0.28, -s*0.28, s*0.18, s*0.12);
      cx.beginPath(); cx.moveTo(-s*0.3, s*0.32); cx.lineTo(s*0.3, s*0.18);
      cx.strokeStyle='#111'; cx.lineWidth=s*0.13; cx.stroke();
      break;
    }
    case 2: { // Angry
      cx.fillStyle = '#111';
      cx.beginPath(); cx.arc(-s*0.5, -s*0.25, s*0.18, 0, Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc( s*0.5, -s*0.25, s*0.18, 0, Math.PI*2); cx.fill();
      cx.strokeStyle='#111'; cx.lineWidth=s*0.15;
      cx.beginPath(); cx.moveTo(-s*0.85,-s*0.55); cx.lineTo(-s*0.1,-s*0.35); cx.stroke();
      cx.beginPath(); cx.moveTo( s*0.85,-s*0.55); cx.lineTo( s*0.1,-s*0.35); cx.stroke();
      cx.beginPath(); cx.arc(0, s*0.32, s*0.44, Math.PI+0.18, Math.PI*2-0.18);
      cx.stroke();
      break;
    }
    case 3: { // Surprised
      cx.fillStyle = '#111';
      cx.beginPath(); cx.arc(-s*0.5,-s*0.3,s*0.23,0,Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc( s*0.5,-s*0.3,s*0.23,0,Math.PI*2); cx.fill();
      cx.fillStyle='#fff';
      cx.beginPath(); cx.arc(-s*0.5,-s*0.3,s*0.1,0,Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc( s*0.5,-s*0.3,s*0.1,0,Math.PI*2); cx.fill();
      cx.beginPath(); cx.ellipse(0, s*0.28, s*0.26, s*0.38, 0, 0, Math.PI*2);
      cx.fillStyle='#333'; cx.fill();
      break;
    }
    case 4: { // Wink
      cx.fillStyle = '#111';
      cx.beginPath(); cx.arc(-s*0.5,-s*0.3,s*0.18,0,Math.PI*2); cx.fill();
      cx.strokeStyle='#111'; cx.lineWidth=s*0.14;
      cx.beginPath(); cx.moveTo(s*0.22,-s*0.3); cx.lineTo(s*0.78,-s*0.3); cx.stroke();
      cx.beginPath(); cx.arc(0, s*0.18, s*0.58, 0.12, Math.PI-0.12); cx.stroke();
      break;
    }
    case 5: { // Sad
      cx.fillStyle = '#111';
      cx.beginPath(); cx.arc(-s*0.5,-s*0.3,s*0.18,0,Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc( s*0.5,-s*0.3,s*0.18,0,Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc(0, s*0.68, s*0.52, Math.PI+0.22, Math.PI*2-0.22);
      cx.strokeStyle='#111'; cx.lineWidth=s*0.13; cx.stroke();
      cx.beginPath(); cx.ellipse(-s*0.48, s*0.02, s*0.08, s*0.16, 0, 0, Math.PI*2);
      cx.fillStyle='rgba(90,180,255,0.85)'; cx.fill();
      break;
    }
    case 6: { // Goofy
      cx.strokeStyle='#111'; cx.lineWidth=s*0.14;
      cx.beginPath();
      for (let xi=-s*0.5; xi<=s*0.5; xi+=1) {
        const yi = -s*0.3 + Math.sin(xi*4/s)*s*0.1;
        if (xi===-s*0.5) cx.moveTo(xi,yi); else cx.lineTo(xi,yi);
      }
      cx.stroke();
      cx.fillStyle='#111';
      cx.beginPath(); cx.arc(s*0.5,-s*0.3,s*0.18,0,Math.PI*2); cx.fill();
      cx.beginPath(); cx.arc(0,s*0.22,s*0.56,0.1,Math.PI-0.1);
      cx.strokeStyle='#111'; cx.lineWidth=s*0.13; cx.stroke();
      cx.fillStyle='#fff';
      cx.fillRect(-s*0.12, s*0.22, s*0.24, s*0.34);
      cx.strokeStyle='#111'; cx.lineWidth=1.5;
      cx.strokeRect(-s*0.12, s*0.22, s*0.24, s*0.34);
      break;
    }
    case 7: { // Sleepy
      cx.strokeStyle='#111'; cx.lineWidth=s*0.13;
      cx.beginPath(); cx.arc(-s*0.5,-s*0.22,s*0.2,Math.PI,Math.PI*2); cx.stroke();
      cx.beginPath(); cx.arc( s*0.5,-s*0.22,s*0.2,Math.PI,Math.PI*2); cx.stroke();
      cx.beginPath(); cx.arc(0,s*0.3,s*0.45,0.1,Math.PI-0.1);
      cx.strokeStyle='#111'; cx.lineWidth=s*0.12; cx.stroke();
      cx.fillStyle='rgba(180,180,255,0.9)';
      cx.font=`bold ${s*0.44}px monospace`; cx.textAlign='left'; cx.textBaseline='middle';
      cx.fillText('z', s*0.65,-s*0.52);
      cx.font=`bold ${s*0.28}px monospace`;
      cx.fillText('z', s*0.94,-s*0.8);
      break;
    }
  }
  cx.restore();
}

function roundedRect(cx, x, y, w, h, r2) {
  cx.beginPath();
  cx.moveTo(x+r2,y);
  cx.lineTo(x+w-r2,y); cx.arcTo(x+w,y,x+w,y+r2,r2);
  cx.lineTo(x+w,y+h-r2); cx.arcTo(x+w,y+h,x+w-r2,y+h,r2);
  cx.lineTo(x+r2,y+h); cx.arcTo(x,y+h,x,y+h-r2,r2);
  cx.lineTo(x,y+r2); cx.arcTo(x,y,x+r2,y,r2);
  cx.closePath();
}

// ── Crown ─────────────────────────────────────────────────────────────────────
function drawCrown(cx, bx, by, r) {
  const cw = r * 0.88, ch = r * 0.44;
  const ox = bx - cw/2, oy = by - r - ch - r*0.12;
  cx.save();
  cx.beginPath();
  cx.moveTo(ox, oy+ch);
  cx.lineTo(ox, oy+ch*0.28);
  cx.lineTo(ox+cw*0.25, oy+ch*0.62);
  cx.lineTo(ox+cw*0.5,  oy);
  cx.lineTo(ox+cw*0.75, oy+ch*0.62);
  cx.lineTo(ox+cw,      oy+ch*0.28);
  cx.lineTo(ox+cw,      oy+ch);
  cx.closePath();
  cx.fillStyle = '#FFD700'; cx.fill();
  cx.strokeStyle = '#AA7700'; cx.lineWidth = Math.max(1.5, r*0.03); cx.stroke();
  // jewels
  cx.fillStyle = '#FF2222';
  cx.beginPath(); cx.arc(ox+cw*0.5, oy+ch*0.22, r*0.09, 0, Math.PI*2); cx.fill();
  cx.fillStyle = '#EE44EE';
  cx.beginPath(); cx.arc(ox+cw*0.12, oy+ch*0.72, r*0.07, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.arc(ox+cw*0.88, oy+ch*0.72, r*0.07, 0, Math.PI*2); cx.fill();
  cx.restore();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD() {
  // Kills — top left
  const killH = gameMode === 2 ? 64 : 40;
  hudBox(14, 14, 170, killH, 10);
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`☠ Kills: ${kills[0]}`, 24, 22);
  if (gameMode === 2) ctx.fillText(`☠ P2 Kills: ${kills[1]}`, 24, 44);

  // Leaderboard — top right
  const allB = [...players, ...bots].filter(e=>!e.dead).sort((a,b)=>b.num-a.num);
  const top  = allB.slice(0, 10);
  const lbW  = 210, lbH = 24 + top.length * 22 + 4;
  const lbX  = W - lbW - 14;
  hudBox(lbX, 14, lbW, lbH, 10);
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFD700'; ctx.textBaseline = 'top';
  ctx.fillText('🏆 TOP', lbX + lbW/2, 20);
  ctx.font = '12px monospace';
  for (let i = 0; i < top.length; i++) {
    const e  = top[i];
    const iy = 40 + i*22;
    ctx.fillStyle = !e.isBot ? '#88FF88' : '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(`${i+1}. ${e.name}`, lbX+8, iy);
    ctx.textAlign = 'right';
    ctx.fillText(fmt(e.num), lbX+lbW-8, iy);
  }

  // Score — bottom center
  if (!players[0].dead) {
    const sc  = '💰 '+fmt(players[0].num);
    ctx.font  = 'bold 20px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const tw  = ctx.measureText(sc).width + 28;
    hudBox(W/2-tw/2, H-58, tw, 42, 12);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(sc, W/2, H-20);
  }
}

function hudBox(x, y, w, h, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
