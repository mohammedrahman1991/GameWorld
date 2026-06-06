'use strict';

// ================================================================
// CANVAS SETUP
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const CW = 900, CH = 700;
canvas.width = CW; canvas.height = CH;

function resizeCanvas() {
  const s = Math.min(window.innerWidth / CW, window.innerHeight / CH);
  canvas.style.width  = CW * s + 'px';
  canvas.style.height = CH * s + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ================================================================
// CONSTANTS
// ================================================================
const BALL_R    = 22;
const BALL_DX   = 48;   // horizontal center-to-center
const BALL_DY   = 42;   // vertical (hex grid)
const COLS_EVEN = 17;
const COLS_ODD  = 16;
const MAX_ROWS  = 9;
// First ball x in even rows, centered in canvas
const GRID_LX   = (CW - (COLS_EVEN - 1) * BALL_DX) / 2;  // = 66
const GRID_Y    = 52;   // y of first row
const WALL_L    = 10;
const WALL_R    = CW - 10;
const LAUNCH_X  = CW / 2;
const LAUNCH_Y  = CH - 95;
const PROJ_SPD  = 12;
const EXTRA_SHOTS = 18; // shots beyond grid count per level

// ================================================================
// 12-COLOR PALETTE
// ================================================================
const PAL = [
  { fill:'#ff2244', dark:'#aa0018', hi:'#ff99aa' }, // 0  Red
  { fill:'#ff6600', dark:'#993300', hi:'#ffbb88' }, // 1  Orange
  { fill:'#ffcc00', dark:'#997700', hi:'#ffee99' }, // 2  Yellow
  { fill:'#88dd00', dark:'#446600', hi:'#ccff88' }, // 3  Lime
  { fill:'#00bb44', dark:'#006622', hi:'#88ffaa' }, // 4  Green
  { fill:'#00ccaa', dark:'#007766', hi:'#88ffee' }, // 5  Teal
  { fill:'#00aaee', dark:'#005588', hi:'#88ddff' }, // 6  Cyan
  { fill:'#3355ff', dark:'#112299', hi:'#aabbff' }, // 7  Blue
  { fill:'#7722ee', dark:'#440088', hi:'#cc99ff' }, // 8  Indigo
  { fill:'#cc22ee', dark:'#770099', hi:'#ee99ff' }, // 9  Purple
  { fill:'#ff3399', dark:'#990055', hi:'#ff99cc' }, // 10 Pink
  { fill:'#eeeeff', dark:'#8899aa', hi:'#ffffff' }, // 11 White
];
const PAL_NAMES = ['Red','Orange','Yellow','Lime','Green','Teal','Cyan','Blue','Indigo','Purple','Pink','White'];

// ================================================================
// INPUT
// ================================================================
let mx = CW / 2, my = CH / 2, mclick = false;

function cxy(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (CW / r.width), y: (e.clientY - r.top) * (CH / r.height) };
}
canvas.addEventListener('mousemove', e => { const p = cxy(e); mx = p.x; my = p.y; });
canvas.addEventListener('click',     e => { const p = cxy(e); mx = p.x; my = p.y; mclick = true; });
canvas.addEventListener('touchstart', e => { e.preventDefault(); const p = cxy(e.touches[0]); mx=p.x; my=p.y; mclick=true; }, {passive:false});
canvas.addEventListener('touchmove',  e => { e.preventDefault(); const p = cxy(e.touches[0]); mx=p.x; my=p.y; }, {passive:false});

// ================================================================
// DRAW UTILITIES
// ================================================================
function fillR(x,y,w,h,c) { ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
function fillT(s,x,y,sz,c,a) { ctx.fillStyle=c; ctx.font=`bold ${sz}px monospace`; ctx.textAlign=a||'center'; ctx.fillText(s,x,y); }
function strokeR(x,y,w,h,c,lw) { ctx.strokeStyle=c; ctx.lineWidth=lw||1; ctx.strokeRect(x,y,w,h); }
function hov(x,y,w,h) { return mx>=x&&mx<=x+w&&my>=y&&my<=y+h; }
function drawBtn(label,x,y,w,h,on) {
  ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=8;
  fillR(x,y,w,h, on?'#2a4488':'#0d1a44');
  ctx.shadowBlur=0;
  strokeR(x,y,w,h, on?'#6699ff':'#334477', 2);
  fillT(label, x+w/2, y+h/2+7, 17, '#ffffff');
}

function drawBall(x, y, r, ci, alpha) {
  if (alpha === undefined) alpha = 1;
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;

  const p = PAL[ci];

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur  = 7; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
  ctx.fillStyle   = p.fill;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

  // Shiny gradient
  const g = ctx.createRadialGradient(x-r*0.3, y-r*0.36, r*0.04, x+r*0.08, y+r*0.1, r);
  g.addColorStop(0,    'rgba(255,255,255,0.72)');
  g.addColorStop(0.3,  'rgba(255,255,255,0.18)');
  g.addColorStop(0.65, 'rgba(0,0,0,0.04)');
  g.addColorStop(1,    'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();

  // Color ring outline
  ctx.strokeStyle = p.dark; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.stroke();

  ctx.globalAlpha = 1;
}

// ================================================================
// GAME STATE
// ================================================================
let gameState = 'title';
let level     = 1;
let score     = 0;
let hiScore   = +(localStorage.getItem('pbHi') || 0);
let shotsLeft = 0;
let levelBalls = 0;

// Projectile
let proj    = null;
let curCI   = 0;
let nxtCI   = 0;
let canFire = true;

// Grid: grid[row][col] = {ci} or null
let grid = [];

// Animations
let pops  = [];   // { x, y, ci, r, life, max }
let falls = [];   // { x, y, vx, vy, ci, life }
let sparks = [];  // { x, y, vx, vy, ci, life }

let bgHue   = 220;
let lastTime = 0;

// ================================================================
// GRID FUNCTIONS
// ================================================================
function initGrid() {
  grid = [];
  for (let r = 0; r < MAX_ROWS; r++)
    grid.push(new Array(r % 2 === 0 ? COLS_EVEN : COLS_ODD).fill(null));
}

function gXY(r, c) {
  return {
    x: GRID_LX + c * BALL_DX + (r % 2 === 1 ? BALL_DX / 2 : 0),
    y: GRID_Y  + r * BALL_DY,
  };
}

function nbrs(r, c) {
  const odd = r % 2 === 1;
  const raw = odd
    ? [[r,c-1],[r,c+1],[r-1,c],[r-1,c+1],[r+1,c],[r+1,c+1]]
    : [[r,c-1],[r,c+1],[r-1,c-1],[r-1,c],[r+1,c-1],[r+1,c]];
  return raw.filter(([nr,nc]) => nr>=0 && nr<MAX_ROWS && nc>=0 && nc<(nr%2===0?COLS_EVEN:COLS_ODD));
}

function flood(r, c, ci) {
  const vis = new Set(), q = [[r,c]], res = [];
  while (q.length) {
    const [cr,cc] = q.pop();
    const k = cr*200+cc;
    if (vis.has(k)) continue; vis.add(k);
    if (!grid[cr]?.[cc] || grid[cr][cc].ci !== ci) continue;
    res.push([cr,cc]);
    for (const n of nbrs(cr,cc)) q.push(n);
  }
  return res;
}

function reachable() {
  const vis = new Set(), q = [];
  for (let c = 0; c < COLS_EVEN; c++) if (grid[0][c]) q.push([0,c]);
  while (q.length) {
    const [r,c] = q.pop(); const k = r*200+c;
    if (vis.has(k)) continue; vis.add(k);
    for (const [nr,nc] of nbrs(r,c)) if (grid[nr]?.[nc]) q.push([nr,nc]);
  }
  return vis;
}

function countGrid() {
  let n = 0;
  for (const row of grid) for (const b of row) if (b) n++;
  return n;
}

// ================================================================
// LEVEL GENERATION
// ================================================================
function lvlColors(lv) {
  const cnt = Math.min(Math.ceil(2 + lv * 0.2), 12);
  const step = PAL.length / cnt;
  return Array.from({length: cnt}, (_, i) => Math.round(i * step) % PAL.length);
}

function lvlRows(lv) {
  if (lv <= 5)  return 2;
  if (lv <= 10) return 3;
  if (lv <= 20) return 4;
  if (lv <= 30) return 5;
  if (lv <= 40) return 6;
  return 7;
}

function seededRnd(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function loadLevel(lv) {
  initGrid();
  pops = []; falls = []; sparks = []; proj = null; canFire = true;
  bgHue = (lv * 17) % 360;

  const colors = lvlColors(lv);
  const rows   = lvlRows(lv);
  const rnd    = seededRnd(lv * 137 + 42);

  for (let r = 0; r < rows; r++) {
    const len = r % 2 === 0 ? COLS_EVEN : COLS_ODD;
    for (let c = 0; c < len; c++)
      grid[r][c] = { ci: colors[Math.floor(rnd() * colors.length)] };
  }

  levelBalls = countGrid();
  curCI = colors[Math.floor(Math.random() * colors.length)];
  nxtCI = colors[Math.floor(Math.random() * colors.length)];
  shotsLeft = levelBalls + EXTRA_SHOTS;
}

// ================================================================
// PLACE + MATCH
// ================================================================
function placeBall(r, c, ci) {
  grid[r][c] = { ci };

  const chain = flood(r, c, ci);

  if (chain.length >= 2) {
    for (const [pr, pc] of chain) {
      const pos = gXY(pr, pc);
      pops.push({ x:pos.x, y:pos.y, ci:grid[pr][pc].ci, r:BALL_R, life:440, max:440 });
      // sparks
      for (let s = 0; s < 6; s++) {
        const ang = (s/6)*Math.PI*2, spd = 2+Math.random()*3;
        sparks.push({ x:pos.x, y:pos.y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd, ci, life:350 });
      }
      grid[pr][pc] = null;
    }
    score += chain.length * 10 * level;

    // Drop detached balls
    const reach = reachable();
    for (let dr = 0; dr < MAX_ROWS; dr++) {
      const len = dr%2===0?COLS_EVEN:COLS_ODD;
      for (let dc = 0; dc < len; dc++) {
        if (grid[dr]?.[dc] && !reach.has(dr*200+dc)) {
          const pos = gXY(dr, dc);
          falls.push({ x:pos.x, y:pos.y, vx:(Math.random()-.5)*4, vy:-2, ci:grid[dr][dc].ci, life:800 });
          grid[dr][dc] = null;
          score += 5 * level;
        }
      }
    }
  }
}

// ================================================================
// PROJECTILE
// ================================================================
function fireAt(tx, ty) {
  if (!canFire || gameState !== 'playing') return;
  let ang = Math.atan2(ty - LAUNCH_Y, tx - LAUNCH_X);
  // Constrain: must go upward, not too horizontal
  ang = Math.max(-Math.PI + 0.18, Math.min(-0.18, ang));

  proj = { x:LAUNCH_X, y:LAUNCH_Y, vx:Math.cos(ang)*PROJ_SPD, vy:Math.sin(ang)*PROJ_SPD, ci:curCI };
  canFire = false;
  shotsLeft--;

  const colors = lvlColors(level);
  curCI = nxtCI;
  nxtCI = colors[Math.floor(Math.random() * colors.length)];
}

function updateProj() {
  if (!proj) return;
  proj.x += proj.vx; proj.y += proj.vy;

  // Wall bounces
  if (proj.x - BALL_R <= WALL_L)  { proj.x = WALL_L  + BALL_R; proj.vx =  Math.abs(proj.vx); }
  if (proj.x + BALL_R >= WALL_R)  { proj.x = WALL_R  - BALL_R; proj.vx = -Math.abs(proj.vx); }

  // Hit ceiling
  if (proj.y - BALL_R <= GRID_Y - BALL_DY / 2) { landProj(); return; }

  // Hit any grid ball
  for (let r = 0; r < MAX_ROWS; r++) {
    const len = r%2===0?COLS_EVEN:COLS_ODD;
    for (let c = 0; c < len; c++) {
      if (!grid[r][c]) continue;
      const {x,y} = gXY(r,c);
      if ((proj.x-x)**2 + (proj.y-y)**2 < (BALL_R*1.88)**2) { landProj(); return; }
    }
  }

  // Out of bounds
  if (proj.y > CH + 60) { proj = null; canFire = true; }
}

function landProj() {
  const ci = proj.ci;

  // Find nearest empty adjacent slot
  let best = null, bestD = Infinity;
  for (let r = 0; r < MAX_ROWS; r++) {
    const len = r%2===0?COLS_EVEN:COLS_ODD;
    for (let c = 0; c < len; c++) {
      if (grid[r][c] !== null) continue;
      let ok = r === 0;
      if (!ok) for (const [nr,nc] of nbrs(r,c)) { if (grid[nr]?.[nc]) { ok=true; break; } }
      if (!ok) continue;
      const {x,y} = gXY(r,c);
      const d = Math.hypot(proj.x-x, proj.y-y);
      if (d < bestD) { bestD=d; best={r,c}; }
    }
  }

  if (best) placeBall(best.r, best.c, ci);
  proj = null;

  const rem = countGrid();
  if (rem === 0) {
    score += level * 500;
    if (score > hiScore) { hiScore = score; localStorage.setItem('pbHi', hiScore); }
    gameState = level >= 50 ? 'victory' : 'levelcomplete';
  } else if (shotsLeft <= 0) {
    gameState = 'gameover';
  } else {
    canFire = true;
  }
}

// ================================================================
// AIM GUIDE
// ================================================================
function drawAimGuide() {
  if (!canFire) return;
  let ang = Math.atan2(my - LAUNCH_Y, mx - LAUNCH_X);
  ang = Math.max(-Math.PI+0.18, Math.min(-0.18, ang));
  let ax = LAUNCH_X, ay = LAUNCH_Y;
  let vx = Math.cos(ang), vy = Math.sin(ang);

  ctx.save();
  ctx.setLineDash([5, 9]);
  ctx.strokeStyle = `hsla(${bgHue},80%,75%,0.5)`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax, ay);
  for (let i = 0; i < 240; i++) {
    ax += vx * 3; ay += vy * 3;
    if (ax - BALL_R <= WALL_L)  { ax = WALL_L  + BALL_R; vx =  Math.abs(vx); }
    if (ax + BALL_R >= WALL_R)  { ax = WALL_R  - BALL_R; vx = -Math.abs(vx); }
    if (ay <= GRID_Y + BALL_DY) break;
    ctx.lineTo(ax, ay);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ================================================================
// BACKGROUND
// ================================================================
function drawBG() {
  const h1 = bgHue, h2 = (bgHue + 45) % 360;
  const g = ctx.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, `hsl(${h1},55%,7%)`);
  g.addColorStop(1, `hsl(${h2},45%,13%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);

  // Soft glow orbs
  [[180,220,h1],[720,380,(h1+130)%360],[460,100,(h1+250)%360]].forEach(([ox,oy,oh]) => {
    const og = ctx.createRadialGradient(ox,oy,5,ox,oy,210);
    og.addColorStop(0, `hsla(${oh},85%,65%,0.1)`);
    og.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = og; ctx.fillRect(0,0,CW,CH);
  });

  // Ceiling bar
  fillR(0, GRID_Y - 8, CW, 8, `hsl(${h1},75%,40%)`);

  // Launch zone separator
  fillR(0, LAUNCH_Y - 65, CW, 2, `rgba(255,255,255,0.08)`);
}

// ================================================================
// RENDER: GRID + ANIMATIONS
// ================================================================
function drawGrid() {
  for (let r = 0; r < MAX_ROWS; r++) {
    const len = r%2===0?COLS_EVEN:COLS_ODD;
    for (let c = 0; c < len; c++) {
      if (!grid[r][c]) continue;
      const {x,y} = gXY(r,c);
      drawBall(x, y, BALL_R, grid[r][c].ci);
    }
  }

  // Pop animations (expanding + fading rings)
  for (const p of pops) {
    const a = p.life / p.max;
    drawBall(p.x, p.y, p.r * (1 + (1-a)*0.8), p.ci, a * 0.9);
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.6})`;
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + (1-a)*1.6), 0, Math.PI*2); ctx.stroke();
  }

  // Falling balls
  for (const f of falls) {
    drawBall(f.x, f.y, BALL_R - 2, f.ci, f.life / 800);
  }

  // Spark particles
  for (const s of sparks) {
    const a = s.life / 350;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, 3 * a, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = PAL[s.ci].fill.replace(')', `,${a})`).replace('rgb', 'rgba');
    ctx.beginPath(); ctx.arc(s.x, s.y, 2 * a, 0, Math.PI*2); ctx.fill();
  }

  // Live projectile
  if (proj) drawBall(proj.x, proj.y, BALL_R, proj.ci);
}

// ================================================================
// RENDER: PLAYING UI
// ================================================================
function drawPlayUI() {
  // Top bar
  fillR(0, 0, CW, 46, 'rgba(0,0,0,0.65)');
  fillT(`LEVEL  ${level} / 50`, CW/2, 30, 18, '#ffffff');
  fillT(`SCORE: ${score}`, 120, 30, 15, '#ffdd88', 'center');
  fillT(`SHOTS: ${shotsLeft}`, CW-120, 30, 15, shotsLeft <= 5 ? '#ff6655' : '#88ddff', 'center');
  fillT(`BALLS: ${countGrid()}`, CW-320, 30, 14, '#aaccff', 'center');

  // Level progress bar
  const pct = Math.max(0, 1 - countGrid() / Math.max(levelBalls, 1));
  fillR(0, 44, CW, 5, '#182030');
  fillR(0, 44, CW * pct, 5, `hsl(${bgHue},85%,60%)`);

  // Launch zone
  drawAimGuide();

  // Current ball (launcher)
  ctx.shadowColor = PAL[curCI].fill; ctx.shadowBlur = 18;
  drawBall(LAUNCH_X, LAUNCH_Y, BALL_R + 5, curCI);
  ctx.shadowBlur = 0;
  fillT('SHOOT', LAUNCH_X, LAUNCH_Y + BALL_R + 20, 11, '#889999');

  // Next ball
  drawBall(LAUNCH_X + 95, LAUNCH_Y + 18, BALL_R - 6, nxtCI);
  fillT('NEXT', LAUNCH_X + 95, LAUNCH_Y + 28, 10, '#667788');

  // Color dots legend
  const colors = lvlColors(level);
  const dotR   = 9;
  const totalW = colors.length * (dotR*2 + 5) - 5;
  colors.forEach((ci, i) => {
    const dx = LAUNCH_X - totalW/2 + i*(dotR*2+5) + dotR;
    drawBall(dx, LAUNCH_Y + 55, dotR, ci);
  });
  fillT('COLORS IN PLAY', LAUNCH_X, LAUNCH_Y + 73, 10, '#556677');
}

// ================================================================
// TITLE SCREEN
// ================================================================
function renderTitle() {
  drawBG();

  // Animated balls arc
  const arcR = 150;
  PAL.forEach((_, i) => {
    const ang = (i / PAL.length) * Math.PI * 2 + Date.now() * 0.0005;
    const bx  = CW/2 + Math.cos(ang) * arcR;
    const by  = 310  + Math.sin(ang) * arcR * 0.45;
    const bob = Math.sin(Date.now()*0.002 + i*0.7) * 5;
    drawBall(bx, by + bob, BALL_R + 1, i);
  });

  // Title
  const pulse = 0.5 + Math.sin(Date.now()*0.003)*0.08;
  ctx.shadowColor = `hsl(${bgHue},90%,60%)`; ctx.shadowBlur = 30;
  fillT('PAINT BALL', CW/2, 140, 72, `hsl(${(bgHue+Date.now()*0.02)%360},90%,70%)`);
  ctx.shadowBlur = 0;
  fillT('Match the colors · Clear the grid · 50 Levels', CW/2, 185, 15, '#7788aa');

  const pyH = hov(CW/2-110, 470, 220, 58);
  drawBtn('▶  PLAY NOW', CW/2-110, 470, 220, 58, pyH);

  fillT(`HIGH SCORE:  ${hiScore}`, CW/2, 555, 15, '#ffdd88');
  fillT('Click to aim & shoot · Match 2+ same color to pop', CW/2, 582, 13, '#445566');

  if (mclick && pyH) { level=1; score=0; loadLevel(1); gameState='playing'; }
}

// ================================================================
// PLAYING SCREEN
// ================================================================
function renderPlaying() {
  drawBG();
  drawGrid();
  drawPlayUI();
  if (mclick && canFire) fireAt(mx, my);
}

// ================================================================
// LEVEL COMPLETE SCREEN
// ================================================================
function renderLevelComplete() {
  drawBG();
  drawGrid();
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0,0,CW,CH);

  // Confetti balls
  PAL.forEach((_, i) => {
    const t  = Date.now()*0.001;
    const bx = 60 + (i * 72) % (CW-60);
    const by = CH - 80 + Math.sin(t*1.8 + i*0.9)*55;
    drawBall(bx, by, BALL_R-3, i);
  });

  ctx.shadowColor = `hsl(${bgHue},90%,60%)`; ctx.shadowBlur = 25;
  fillT(`LEVEL ${level} CLEARED!`, CW/2, 210, 46, `hsl(${bgHue},90%,65%)`);
  ctx.shadowBlur = 0;
  fillT(`+${level * 500} BONUS`, CW/2, 268, 24, '#ffdd88');
  fillT(`TOTAL SCORE:  ${score}`, CW/2, 310, 20, '#ffffff');

  const nxtH = hov(CW/2-115,365,230,58);
  drawBtn(`▶  LEVEL ${level+1}`, CW/2-115,365,230,58, nxtH);
  const mnuH = hov(CW/2-115,440,230,52);
  drawBtn('⌂  MAIN MENU', CW/2-115,440,230,52, mnuH);

  if (mclick) {
    if (nxtH) { level++; loadLevel(level); gameState='playing'; }
    if (mnuH) gameState='title';
  }
}

// ================================================================
// GAME OVER SCREEN
// ================================================================
function renderGameOver() {
  drawBG();
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0,0,CW,CH);

  ctx.shadowColor='#ff2244'; ctx.shadowBlur=30;
  fillT('GAME OVER', CW/2, 220, 58, '#ff4455');
  ctx.shadowBlur=0;
  fillT(`Level ${level}  ·  Score: ${score}`, CW/2, 285, 22, '#ffffff');
  fillT(`High Score:  ${hiScore}`, CW/2, 325, 17, '#ffdd88');
  fillT(`${countGrid()} balls remaining — you needed ${shotsLeft} more shots`, CW/2, 358, 14, '#556677');

  const retH = hov(CW/2-115,400,230,56);
  drawBtn('↺  TRY AGAIN', CW/2-115,400,230,56, retH);
  const mnuH = hov(CW/2-115,475,230,52);
  drawBtn('⌂  MAIN MENU', CW/2-115,475,230,52, mnuH);

  if (mclick) {
    if (retH) { loadLevel(level); gameState='playing'; document.getElementById('wb-share-btn').style.display='none'; }
    if (mnuH) { gameState='title'; document.getElementById('wb-share-btn').style.display='none'; }
  }
  const sb=document.getElementById('wb-share-btn'); if(sb){sb.style.display='block';sb.onclick=()=>WackyShare.show('Color Ball Launcher',`I scored ${score} on level ${level} in Color Ball Launcher!`,'https://wackybrains.com/color-ball-launcher/');}
}

// ================================================================
// VICTORY SCREEN
// ================================================================
function renderVictory() {
  drawBG();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0,0,CW,CH);

  // All 12 balls orbiting
  PAL.forEach((_, i) => {
    const t  = Date.now()*0.0008;
    const a1 = (i/PAL.length)*Math.PI*2 + t;
    const a2 = a1 * 0.7 + 1.2;
    const bx = CW/2 + Math.cos(a1)*190;
    const by = 360  + Math.sin(a2)*80;
    drawBall(bx, by, BALL_R+2, i);
  });

  ctx.shadowColor='#ffdd00'; ctx.shadowBlur=35;
  fillT('YOU WIN!', CW/2, 190, 72, '#ffee44');
  ctx.shadowBlur=0;
  fillT('ALL 50 LEVELS CLEARED!', CW/2, 250, 26, '#ffffff');
  fillT(`FINAL SCORE:  ${score}`, CW/2, 295, 22, '#ffdd88');
  fillT(`HIGH SCORE:   ${hiScore}`, CW/2, 325, 18, '#88ddff');

  const pyH = hov(CW/2-115,390,230,58);
  drawBtn('▶  PLAY AGAIN', CW/2-115,390,230,58, pyH);

  if (mclick && pyH) { level=1; score=0; loadLevel(1); gameState='playing'; document.getElementById('wb-share-btn').style.display='none'; }
  const sb=document.getElementById('wb-share-btn'); if(sb){sb.style.display='block';sb.onclick=()=>WackyShare.show('Color Ball Launcher',`I cleared all 50 levels with score ${score} in Color Ball Launcher!`,'https://wackybrains.com/color-ball-launcher/');}
}

// ================================================================
// ANIMATION UPDATES
// ================================================================
function updateAnims(dt) {
  for (let i = pops.length-1;   i>=0; i--) { pops[i].life-=dt;   pops[i].r+=dt*0.025; if(pops[i].life<=0)   pops.splice(i,1); }
  for (let i = falls.length-1;  i>=0; i--) { const f=falls[i]; f.x+=f.vx; f.y+=f.vy; f.vy+=0.22; f.life-=dt; if(f.life<=0||f.y>CH+60) falls.splice(i,1); }
  for (let i = sparks.length-1; i>=0; i--) { const s=sparks[i]; s.x+=s.vx; s.y+=s.vy; s.vy+=0.12; s.vx*=0.97; s.life-=dt; if(s.life<=0) sparks.splice(i,1); }
}

// ================================================================
// MAIN LOOP
// ================================================================
function loop(ts) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  if (gameState === 'playing') {
    updateProj();
    updateAnims(dt);
  }

  ctx.clearRect(0, 0, CW, CH);
  switch (gameState) {
    case 'title':         renderTitle();        break;
    case 'playing':       renderPlaying();      break;
    case 'levelcomplete': renderLevelComplete(); break;
    case 'gameover':      renderGameOver();     break;
    case 'victory':       renderVictory();      break;
  }

  mclick = false;
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
