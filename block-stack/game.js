'use strict';
// ================================================================
// BLOCK STACK — Drop the block. Build the tower. How high can you go?
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 480, H = 700;
canvas.width = W; canvas.height = H;

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width  = Math.floor(W * s) + 'px';
  canvas.style.height = Math.floor(H * s) + 'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
let clickFrame = false;
let mX = W/2, mY = H/2;
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  mX = (e.clientX - r.left) * (W / r.width);
  mY = (e.clientY - r.top)  * (H / r.height);
  clickFrame = true;
});
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mX = (e.clientX - r.left) * (W / r.width);
  mY = (e.clientY - r.top)  * (H / r.height);
});
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') { clickFrame = true; e.preventDefault(); }
});
function hovBtn(x, y, w, h) { return mX > x && mX < x+w && mY > y && mY < y+h; }

// ---------------------------------------------------------------- Audio
let AC = null;
function getAC() { if (!AC) AC = new (window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f, d, type='square', vol=0.07, delay=0) {
  try {
    const a = getAC(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.type = type; o.frequency.value = f;
    const t = a.currentTime + delay;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.start(t); o.stop(t + d + 0.02);
  } catch(e) {}
}
function sfxDrop()    { tone(180, 0.06, 'square', 0.09); tone(240, 0.05, 'square', 0.07, 0.05); }
function sfxPerfect() { tone(523,0.07,'triangle',0.10); tone(659,0.07,'triangle',0.10,0.08); tone(784,0.10,'triangle',0.12,0.16); tone(1046,0.14,'triangle',0.10,0.26); }
function sfxFail()    { tone(200,0.1,'sawtooth',0.12); tone(130,0.2,'sawtooth',0.14,0.12); tone(80,0.4,'sawtooth',0.16,0.3); }
function sfxCombo()   { tone(880,0.06,'square',0.08); tone(1100,0.08,'square',0.08,0.07); }

// ---------------------------------------------------------------- Constants
const BH          = 28;   // block height px
const START_W     = 200;  // starting block width
const PERFECT_PX  = 5;    // pixels tolerance for "perfect"
const GROUND_Y    = 620;  // world y of the ground surface
const BLOCK_COLS  = ['#ff4466','#ff8833','#ffcc22','#77dd22','#22cc88','#33aaff','#9944ff','#ff44cc','#ff6655','#44ffbb'];

// ---------------------------------------------------------------- State
let STATE = 'TITLE';
let tower, curW, curCol, colIdx;
let swingT, swingSpd, swingAmp;
let dropping, dropX, dropY, dropVY;
let camY, camTargetY;
let score, best = +(localStorage.getItem('bstack_best') || 0);
let perfCount, perfFlash;
let floats, fallers;
let frame = 0;

function darken(hex, f) {
  const r = parseInt(hex.slice(1,3),16), g2 = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgb(${Math.floor(r*f)},${Math.floor(g2*f)},${Math.floor(b*f)})`;
}

// ---------------------------------------------------------------- Init
function startGame() {
  tower   = [{ x: W/2 - START_W/2, y: GROUND_Y - BH, w: START_W, col: '#55556a' }];
  colIdx  = 0; curW = START_W; curCol = BLOCK_COLS[0];
  swingT  = 0; swingSpd = 0.038; swingAmp = 160;
  dropping = false; dropX = 0; dropY = 0; dropVY = 0;
  camY = 0; camTargetY = 0;
  score = 0; perfCount = 0; perfFlash = 0;
  floats = []; fallers = [];
  frame = 0;
}

function topBlock() { return tower[tower.length - 1]; }

function swingBlockX() { return W/2 + Math.sin(swingT) * swingAmp; }
function swingBlockY() { return topBlock().y - BH * 2.5; }

// ---------------------------------------------------------------- Drop logic
function triggerDrop() {
  if (dropping) return;
  dropping = true;
  dropX    = swingBlockX() - curW / 2;
  dropY    = swingBlockY();
  dropVY   = 0;
}

function landBlock() {
  const top  = topBlock();
  const left  = Math.max(dropX, top.x);
  const right = Math.min(dropX + curW, top.x + top.w);
  const overlap = right - left;

  if (overlap <= 0) {
    sfxFail();
    if (score > best) { best = score; localStorage.setItem('bstack_best', String(best)); }
    STATE = 'GAMEOVER';
    return;
  }

  const isPerfect = Math.abs(dropX - top.x) <= PERFECT_PX;
  let newX, newW;

  if (isPerfect) {
    newX = top.x; newW = top.w;
    perfCount++;
    perfFlash = 50;
    sfxPerfect();
    const bonus = perfCount >= 3 ? 3 : 2;
    score += bonus;
    if (perfCount >= 3) sfxCombo();
    floats.push({ x: W/2, y: top.y - 20, txt: 'PERFECT!', col: '#ffd700', life: 60 });
    if (perfCount >= 3) floats.push({ x: W/2, y: top.y - 45, txt: perfCount + '× COMBO', col: '#ff8833', life: 60 });
  } else {
    newX = left; newW = overlap;
    perfCount = 0;
    sfxDrop();
    score++;
    // off-cut falls away
    const cutW = curW - overlap;
    if (cutW > 2) {
      const cutX = dropX < top.x ? dropX : dropX + overlap;
      fallers.push({ x: cutX, y: dropY, w: cutW, h: BH, col: curCol, vy: 1, vx: cutX < top.x ? -1.5 : 1.5, life: 55 });
    }
  }

  tower.push({ x: newX, y: top.y - BH, w: newW, col: curCol });

  curW      = newW;
  colIdx    = (colIdx + 1) % BLOCK_COLS.length;
  curCol    = BLOCK_COLS[colIdx];
  swingSpd  = Math.min(0.12, 0.038 + score * 0.0022);
  swingAmp  = Math.max(55, 160 - score * 1.8);

  // Camera target: keep top block at ~35% from top of screen
  camTargetY = Math.max(0, topBlock().y - H * 0.38);

  dropping = false;
}

// ---------------------------------------------------------------- Update
function update() {
  frame++;
  if (perfFlash > 0) perfFlash--;

  if (!dropping) {
    swingT += swingSpd;
  } else {
    dropVY += 0.75;
    dropY  += dropVY;
    const top = topBlock();
    if (dropY + BH >= top.y) {
      dropY = top.y - BH;
      landBlock();
    }
  }

  camY += (camTargetY - camY) * 0.07;

  fallers = fallers.filter(f => {
    f.x += f.vx; f.y += f.vy; f.vy += 0.45; return --f.life > 0;
  });
  floats = floats.filter(f => { f.y -= 0.9; return --f.life > 0; });
}

// ---------------------------------------------------------------- Draw helpers
function drawBlock(x, y, w, col, shine) {
  if (w <= 0) return;
  const g = ctx.createLinearGradient(x, y, x, y + BH);
  g.addColorStop(0, col);
  g.addColorStop(1, darken(col, 0.72));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, BH);
  // top shine
  ctx.fillStyle = shine || 'rgba(255,255,255,0.22)';
  ctx.fillRect(x, y, w, 3);
  // bottom shadow line
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x, y + BH - 3, w, 3);
}

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------- Draw background
function drawBg(camY2) {
  // Sky gradient follows camera
  const g = ctx.createLinearGradient(0, camY2, 0, camY2 + H);
  g.addColorStop(0, '#080818');
  g.addColorStop(1, '#101028');
  ctx.fillStyle = g;
  ctx.fillRect(0, camY2, W, H);

  // Stars (in world coords, tiled every 700px vertically)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 60; i++) {
    const sx = (i * 83.7 + 17) % W;
    const sy = camY2 - 200 + ((i * 73.1 + 31) % (H + 400));
    ctx.globalAlpha = 0.3 + (i % 5) * 0.14;
    ctx.beginPath(); ctx.arc(sx, sy, i % 7 === 0 ? 1.4 : 0.7, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Ground platform
  const g2 = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 80);
  g2.addColorStop(0, '#2a2a40');
  g2.addColorStop(1, '#181826');
  ctx.fillStyle = g2;
  ctx.fillRect(0, GROUND_Y, W, 120);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(0, GROUND_Y, W, 3);
}

// ---------------------------------------------------------------- Draw tower
function drawTower() {
  // Drop shadow under each block
  tower.forEach(b => {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 5, b.y + 5, b.w, BH);
  });
  // Blocks
  tower.forEach((b, i) => {
    if (i === 0) {
      drawBlock(b.x, b.y, b.w, b.col, 'rgba(255,255,255,0.1)');
    } else {
      drawBlock(b.x, b.y, b.w, b.col);
    }
  });
}

// ---------------------------------------------------------------- Draw current swinging block + guide line
function drawSwing() {
  if (dropping) return;
  const bx = swingBlockX() - curW / 2;
  const by = swingBlockY();
  const top = topBlock();

  // Landing zone hint on top of tower
  const lx = Math.max(top.x, bx);
  const lw = Math.min(bx + curW, top.x + top.w) - lx;
  if (lw > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(lx, top.y - 2, lw, 4);
  }

  // Rope
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(W/2, by - 60); ctx.lineTo(bx + curW/2, by); ctx.stroke();

  // Block shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(bx + 5, by + 5, curW, BH);

  drawBlock(bx, by, curW, curCol);
}

// ---------------------------------------------------------------- Draw falling block
function drawDrop() {
  if (!dropping) return;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(dropX + 5, dropY + 5, curW, BH);
  drawBlock(dropX, dropY, curW, curCol);
}

// ---------------------------------------------------------------- Fallers & floats
function drawFallers() {
  fallers.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.life / 40);
    drawBlock(f.x, f.y, f.w, f.col);
  });
  ctx.globalAlpha = 1;
}

function drawFloats() {
  floats.forEach(f => {
    ctx.globalAlpha = Math.min(1, f.life / 25);
    ctx.font = 'bold 13px "Press Start 2P",monospace';
    ctx.textAlign = 'center'; ctx.fillStyle = f.col;
    ctx.fillText(f.txt, f.x, f.y);
  });
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- HUD
function drawHUD() {
  // Score
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(255,255,255,0.4)'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 34px "Press Start 2P",monospace';
  ctx.fillText(score, W/2, 46);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px "Press Start 2P",monospace';
  ctx.fillText('HEIGHT', W/2, 62);

  // Best
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 9px "Press Start 2P",monospace';
  ctx.fillText('BEST ' + best, W - 10, 22);

  // Perfect streak dots
  if (perfCount > 0 || perfFlash > 0) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < perfCount ? '#ffd700' : 'rgba(255,215,0,0.18)';
      ctx.beginPath(); ctx.arc(W/2 - 20 + i*20, 76, 5, 0, Math.PI*2); ctx.fill();
    }
  }

  // Controls hint
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '8px monospace'; ctx.fillText('CLICK  or  SPACE  to  drop', W/2, H - 10);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- Title
let titleFrame = 0;
function drawTitle() {
  titleFrame++;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#080818'); g.addColorStop(1, '#101028');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 60; i++) {
    const sx = (i*83)%W, sy = (i*67+11)%H;
    ctx.globalAlpha = 0.3+(i%5)*0.13;
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx,sy,i%7?0.7:1.4,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Demo mini-tower (right side)
  const demoBlocks = [
    {w:160,col:'#55556a'},{w:150,col:'#ff4466'},{w:135,col:'#ff8833'},
    {w:118,col:'#ffcc22'},{w:104,col:'#77dd22'},{w:88,col:'#22cc88'},
    {w:72, col:'#33aaff'},{w:60, col:'#9944ff'},
  ];
  const demoBase = 580;
  demoBlocks.forEach((b,i)=>{
    drawBlock(W/2 - b.w/2, demoBase - i*BH, b.w, b.col);
  });
  // Swinging demo block
  const dsx = W/2 + Math.sin(titleFrame*0.038)*130;
  drawBlock(dsx - 50, demoBase - demoBlocks.length*BH - 40, 100, BLOCK_COLS[(titleFrame>>4)%BLOCK_COLS.length]);

  // Ground
  ctx.fillStyle = '#2a2a40'; ctx.fillRect(0, demoBase + BH, W, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, demoBase + BH, W, 3);

  // Title text
  ctx.textAlign = 'center';
  ctx.shadowColor = '#33aaff'; ctx.shadowBlur = 28;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 58px "Press Start 2P",monospace'; ctx.fillText('BLOCK', W/2, 145);
  ctx.shadowColor = '#ff4466'; ctx.shadowBlur = 28;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 58px "Press Start 2P",monospace'; ctx.fillText('STACK', W/2, 213);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '7px "Press Start 2P",monospace';
  ctx.fillText('DROP THE BLOCK. BUILD THE TOWER.', W/2, 240);
  if (best > 0) {
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 9px "Press Start 2P",monospace';
    ctx.fillText('BEST: ' + best, W/2, 265);
  }

  // Play button
  const ph = hovBtn(W/2-110, 285, 220, 54);
  ctx.fillStyle = ph ? '#44bbff' : '#33aaff';
  rr(W/2-110, 285, 220, 54, 12); ctx.fill();
  ctx.shadowColor = '#33aaff'; ctx.shadowBlur = ph ? 22 : 8;
  rr(W/2-110, 285, 220, 54, 12); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Press Start 2P",monospace'; ctx.fillText('PLAY', W/2, 321);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '8px monospace'; ctx.fillText('[CLICK or SPACE]', W/2, 340);
  ctx.textAlign = 'left';
  canvas.style.cursor = ph ? 'pointer' : 'default';

  if (clickFrame && hovBtn(W/2-110, 285, 220, 54)) { startGame(); STATE = 'GAME'; }
}

// ---------------------------------------------------------------- Game Over
function drawGameOver() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,'#080818'); g.addColorStop(1,'#101028');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Mini final tower centered
  const visibleBlocks = tower.slice(-10);
  const base = H - 80;
  visibleBlocks.forEach((b, i) => {
    const by = base - i * BH;
    if (by < -BH) return;
    drawBlock(b.x, by, b.w, b.col);
  });
  ctx.fillStyle = '#2a2a40'; ctx.fillRect(0, base + BH, W, 80);

  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff3355'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff3355'; ctx.font = 'bold 34px "Press Start 2P",monospace'; ctx.fillText('GAME OVER', W/2, 165);
  ctx.shadowBlur = 0;
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 52px "Press Start 2P",monospace'; ctx.fillText(score, W/2, 248);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '8px "Press Start 2P",monospace'; ctx.fillText('HEIGHT', W/2, 265);
  if (score >= best && score > 0) {
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦', W/2, 296);
  } else {
    ctx.fillStyle = '#ffd700'; ctx.font = '9px "Press Start 2P",monospace'; ctx.fillText('BEST: ' + best, W/2, 296);
  }

  const ph = hovBtn(W/2-120, 325, 240, 52);
  ctx.fillStyle = ph ? '#44bbff' : '#33aaff';
  rr(W/2-120, 325, 240, 52, 12); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN', W/2, 358);

  const mh = hovBtn(W/2-95, 393, 190, 44);
  ctx.fillStyle = mh ? '#2a2a45' : '#1c1c38';
  rr(W/2-95, 393, 190, 44, 10); ctx.fill();
  ctx.strokeStyle = '#3a3a55'; ctx.lineWidth = 1.5;
  rr(W/2-95, 393, 190, 44, 10); ctx.stroke();
  ctx.fillStyle = '#aaa'; ctx.font = 'bold 9px "Press Start 2P",monospace'; ctx.fillText('MENU', W/2, 421);
  ctx.textAlign = 'left';
  canvas.style.cursor = (ph || mh) ? 'pointer' : 'default';

  if (clickFrame && hovBtn(W/2-120, 325, 240, 52)) { startGame(); STATE = 'GAME'; }
  if (clickFrame && hovBtn(W/2-95,  393, 190, 44)) { STATE = 'TITLE'; }
}

// ---------------------------------------------------------------- Main loop
function loop() {
  const click = clickFrame;
  clickFrame = false;

  ctx.clearRect(0, 0, W, H);

  if (STATE === 'TITLE') {
    clickFrame = click; // title needs it for button
    drawTitle();
    clickFrame = false;

  } else if (STATE === 'GAME') {
    // World drawing with camera offset
    ctx.save();
    ctx.translate(0, -camY);
    drawBg(camY);
    drawTower();
    drawFallers();
    drawDrop();
    drawSwing();
    ctx.restore();

    // Screen-space drawing (not affected by camera)
    drawFloats();
    drawHUD();

    if (click) triggerDrop();
    update();

  } else if (STATE === 'GAMEOVER') {
    clickFrame = click;
    drawGameOver();
    clickFrame = false;
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
