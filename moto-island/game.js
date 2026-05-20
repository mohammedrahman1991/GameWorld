'use strict';

// ── Canvas ──────────────────────────────────────────────────────
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
const CW = 900, CH = 660;
canvas.width = CW; canvas.height = CH;

function resize() {
  const s = Math.min(window.innerWidth/CW, window.innerHeight/CH);
  canvas.style.width  = CW*s+'px';
  canvas.style.height = CH*s+'px';
}
resize();
window.addEventListener('resize', resize);

// ── Track constants ─────────────────────────────────────────────
const CX = 450, CY = 310;
const RX = 310, RY = 180;
const ROAD_W  = 82;
const OUT_RX  = RX + ROAD_W/2;   // 351
const OUT_RY  = RY + ROAD_W/2;   // 221
const INN_RX  = RX - ROAD_W/2;   // 269
const INN_RY  = RY - ROAD_W/2;   // 139
const NUM_WP  = 36;
const TOT_LAPS = 3;

// Oval waypoints (counterclockwise on screen: bottom→left→top→right→bottom)
const WP = Array.from({length: NUM_WP}, (_, i) => {
  const a = (i / NUM_WP) * Math.PI * 2 + Math.PI / 2;
  return { x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY };
});
// Starting angle = direction WP0 → WP1
const START_ANG = Math.atan2(WP[1].y - WP[0].y, WP[1].x - WP[0].x);

// ── Physics ─────────────────────────────────────────────────────
const ACCEL      = 0.18;
const MAX_SPD    = 5.8;
const FRICTION   = 0.93;
const BRAKE_F    = 0.18;
const TURN_R     = 0.11;
const GRASS_MULT = 0.68;

// ── Input ───────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

let mx = CW/2, my = CH/2, mclick = false;
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mx = (e.clientX - r.left) * (CW / r.width);
  my = (e.clientY - r.top)  * (CH / r.height);
});
canvas.addEventListener('click', e => {
  const r = canvas.getBoundingClientRect();
  mx = (e.clientX - r.left) * (CW / r.width);
  my = (e.clientY - r.top)  * (CH / r.height);
  mclick = true;
});

// ── Helpers ─────────────────────────────────────────────────────
function fR(x,y,w,h,c) { ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }
function fT(s,x,y,sz,c,a) { ctx.fillStyle=c; ctx.font=`bold ${sz}px monospace`; ctx.textAlign=a||'center'; ctx.fillText(s,x,y); }
function sT(s,x,y,sz,fc,sc) {
  ctx.font=`bold ${sz}px monospace`; ctx.textAlign='center';
  ctx.strokeStyle=sc||'#000'; ctx.lineWidth=4; ctx.strokeText(s,x,y);
  ctx.fillStyle=fc; ctx.fillText(s,x,y);
}
function hov(x,y,w,h) { return mx>=x&&mx<=x+w&&my>=y&&my<=y+h; }
function drawBtn(label,x,y,w,h,on) {
  fR(x,y,w,h, on?'#1a5a20':'#0d2a10');
  ctx.strokeStyle=on?'#44ff66':'#226633'; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h);
  fT(label, x+w/2, y+h/2+7, 19, '#ffffff');
}
function onRoad(x,y) {
  const dx=x-CX, dy=y-CY;
  return (dx/OUT_RX)**2+(dy/OUT_RY)**2<=1.0 && (dx/INN_RX)**2+(dy/INN_RY)**2>=1.0;
}
function ordinal(n) { return n + (['','ST','ND','RD'][n]||'TH'); }

// ── Bike class ──────────────────────────────────────────────────
class Bike {
  constructor(x, y, color, name, ctrl, botSpd) {
    this.x = x; this.y = y;
    this.angle  = START_ANG;
    this.color  = color;
    this.name   = name;
    this.ctrl   = ctrl;      // null = bot
    this.botSpd = botSpd||0;
    this.speed  = 0;
    this.nextWP = 1;
    this.totalWPs = 0;
    this.laps   = 0;
    this.finished    = false;
    this.finishRank  = 0;
    this.dust = [];
  }

  get isBot()        { return !this.ctrl; }
  get raceProgress() { return this.totalWPs; }

  update(dt) {
    if (this.finished) return;
    this.isBot ? this._bot() : this._player();
    this._constrain();
    this._advanceWP();
    // dust
    this.dust = this.dust.filter(d => { d.life -= dt; return d.life > 0; });
  }

  _player() {
    const k = this.ctrl;
    if (keys[k.up])   this.speed = Math.min(this.speed + ACCEL, MAX_SPD);
    else              this.speed *= FRICTION;
    if (keys[k.down]) this.speed = Math.max(this.speed - BRAKE_F, 0);
    if (this.speed > 0.1) {
      // Flat 80% turn rate + 20% speed bonus — turns sharply at any speed
      const t = TURN_R * (0.80 + 0.20 * (this.speed / MAX_SPD));
      if (keys[k.left])  this.angle -= t;
      if (keys[k.right]) this.angle += t;
    }
    const nx = this.x + Math.cos(this.angle) * this.speed;
    const ny = this.y + Math.sin(this.angle) * this.speed;
    const m  = onRoad(nx, ny) ? 1.0 : GRASS_MULT;
    this.x = Math.max(15, Math.min(CW-15, this.x + Math.cos(this.angle)*this.speed*m));
    this.y = Math.max(15, Math.min(CH-15, this.y + Math.sin(this.angle)*this.speed*m));
    if (!onRoad(this.x, this.y) && this.speed > 1)
      this.dust.push({ x:this.x+Math.random()*10-5, y:this.y+Math.random()*10-5, life:400 });
  }

  _bot() {
    const wp = WP[this.nextWP];
    const dx = wp.x - this.x, dy = wp.y - this.y;
    let d  = Math.atan2(dy, dx) - this.angle;
    while (d >  Math.PI) d -= Math.PI*2;
    while (d < -Math.PI) d += Math.PI*2;
    this.angle += Math.sign(d) * Math.min(Math.abs(d), 0.065);
    this.speed  = Math.min(this.speed + ACCEL*0.55, this.botSpd);
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

  // Invisible wall — clamp bike to road ellipse boundaries
  _constrain() {
    const dx = this.x - CX, dy = this.y - CY;

    // Hit outer wall
    const outerD = (dx / OUT_RX) ** 2 + (dy / OUT_RY) ** 2;
    if (outerD > 1.0) {
      const t = 1 / Math.sqrt(outerD);
      this.x   = CX + dx * t;
      this.y   = CY + dy * t;
      this.speed *= 0.18; // bounce kills speed
    }

    // Hit inner wall
    const innerD = (dx / INN_RX) ** 2 + (dy / INN_RY) ** 2;
    if (innerD < 1.0 && innerD > 0.001) {
      const t = 1 / Math.sqrt(innerD);
      this.x   = CX + dx * t;
      this.y   = CY + dy * t;
      this.speed *= 0.18;
    }
  }

  _advanceWP() {
    if (Math.hypot(this.x - WP[this.nextWP].x, this.y - WP[this.nextWP].y) < 42) {
      this.nextWP = (this.nextWP + 1) % NUM_WP;
      this.totalWPs++;
      this.laps = Math.floor(this.totalWPs / NUM_WP);
      if (this.laps >= TOT_LAPS && !this.finished) this.finished = true;
    }
  }

  draw(showName) {
    // Dust particles
    for (const d of this.dust) {
      ctx.fillStyle = `rgba(160,120,50,${(d.life/400)*0.35})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI*2); ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-14, 4, 28, 10);

    // Rear wheel
    ctx.fillStyle = '#111';
    ctx.fillRect(9, -4, 8, 8);
    // Body
    ctx.fillStyle = this.color;
    ctx.fillRect(-13, -5, 26, 10);
    // Front fairing (lighter)
    ctx.fillStyle = this._lite(this.color);
    ctx.fillRect(-13, -5, 10, 10);
    // Front wheel
    ctx.fillStyle = '#111';
    ctx.fillRect(-19, -4, 8, 8);
    // Exhaust pipe
    ctx.fillStyle = '#888';
    ctx.fillRect(10, 2, 9, 3);

    // Rider helmet
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.arc(0, -6, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(0, -6, 5.5, 0, Math.PI*2); ctx.fill();
    // Visor
    ctx.fillStyle = 'rgba(190,225,255,0.65)';
    ctx.beginPath(); ctx.arc(1.5, -7.5, 3, 0, Math.PI*2); ctx.fill();

    ctx.restore();

    // Name tag
    if (showName) {
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.strokeText(this.name, this.x, this.y - 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(this.name, this.x, this.y - 22);
    }
  }

  _lite(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n>>16)+50);
    const g = Math.min(255, ((n>>8)&0xff)+50);
    const b = Math.min(255, (n&0xff)+50);
    return `rgb(${r},${g},${b})`;
  }
}

// ── Track drawing ────────────────────────────────────────────────
function drawTrack() {
  // Ocean
  const og = ctx.createLinearGradient(0,0,0,CH);
  og.addColorStop(0,'#1a6aaa'); og.addColorStop(1,'#0d4477');
  ctx.fillStyle = og; ctx.fillRect(0,0,CW,CH);
  // Ocean sparkles
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  for (let i=0;i<70;i++) ctx.fillRect((i*137)%CW,(i*97)%CH,2,1);

  // Sandy beach
  ctx.fillStyle = '#c8a060';
  ctx.beginPath(); ctx.ellipse(CX,CY,OUT_RX+52,OUT_RY+52,0,0,Math.PI*2); ctx.fill();
  // Outer grass
  ctx.fillStyle = '#3aaa3a';
  ctx.beginPath(); ctx.ellipse(CX,CY,OUT_RX+26,OUT_RY+26,0,0,Math.PI*2); ctx.fill();

  // Road (asphalt)
  ctx.fillStyle = '#383838';
  ctx.beginPath(); ctx.ellipse(CX,CY,OUT_RX,OUT_RY,0,0,Math.PI*2); ctx.fill();

  // Subtle road bands
  for (let i=0;i<5;i++) {
    ctx.strokeStyle=`rgba(44,44,44,${0.3+i*0.05})`; ctx.lineWidth=10;
    const rx=INN_RX+(i+0.5)*ROAD_W/5, ry=INN_RY+(i+0.5)*ROAD_W/5;
    ctx.beginPath(); ctx.ellipse(CX,CY,rx,ry,0,0,Math.PI*2); ctx.stroke();
  }

  // Inner island
  ctx.fillStyle = '#33bb33';
  ctx.beginPath(); ctx.ellipse(CX,CY,INN_RX,INN_RY,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2aaa2a';
  ctx.beginPath(); ctx.ellipse(CX,CY,INN_RX-35,INN_RY-22,0,0,Math.PI*2); ctx.fill();

  // White edge lines
  ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.ellipse(CX,CY,OUT_RX,OUT_RY,0,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(CX,CY,INN_RX,INN_RY,0,0,Math.PI*2); ctx.stroke();

  // Yellow dashed center line
  ctx.strokeStyle='rgba(255,220,0,0.7)'; ctx.lineWidth=2;
  ctx.setLineDash([25,20]);
  ctx.beginPath(); ctx.ellipse(CX,CY,RX,RY,0,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);

  // Start/Finish checkered line (vertical at bottom of oval)
  const sfX = CX;
  const sfY1 = CY + INN_RY, sfY2 = CY + OUT_RY;
  const sfH = sfY2 - sfY1, rows = 8;
  for (let i=0;i<rows;i++) for (let j=0;j<2;j++) {
    ctx.fillStyle = (i+j)%2===0 ? '#ffffff' : '#000000';
    ctx.fillRect(sfX-4+j*4, sfY1+i*(sfH/rows), 4, sfH/rows);
  }
  ctx.font='bold 10px monospace'; ctx.textAlign='left';
  ctx.fillStyle='rgba(255,255,255,0.65)';
  ctx.fillText('START', sfX+8, sfY1+sfH/2+4);

  // Inner island palm trees
  for (let i=0;i<6;i++) {
    const a=(i/6)*Math.PI*2;
    palm(CX+Math.cos(a)*(INN_RX-48), CY+Math.sin(a)*(INN_RY-30));
  }
  // Center label
  ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='bold 14px monospace'; ctx.textAlign='center';
  ctx.fillText('MOTO',   CX, CY-6);
  ctx.fillText('ISLAND', CX, CY+12);

  // Outer beach palm trees
  for (let i=0;i<6;i++) {
    const a=(i/6)*Math.PI*2+Math.PI/6;
    palm(CX+Math.cos(a)*(OUT_RX+42), CY+Math.sin(a)*(OUT_RY+32));
  }
}

function palm(x, y) {
  ctx.fillStyle='#8B6914';
  ctx.fillRect(x-2, y-18, 4, 18);
  ctx.fillStyle='#1f8a1f';
  ctx.beginPath(); ctx.arc(x,   y-19, 10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#2da02d';
  ctx.beginPath(); ctx.arc(x-7, y-24,  7, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+7, y-24,  7, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x,   y-27,  7, 0, Math.PI*2); ctx.fill();
}

// ── HUD ─────────────────────────────────────────────────────────
function drawHUD(bikes, np) {
  fR(0,0,CW,52,'rgba(0,0,0,0.72)');
  sT('MOTO-ISLAND', CW/2, 32, 20, '#FFD700', '#000');

  const sorted = [...bikes].sort((a,b) => b.raceProgress - a.raceProgress);

  for (let pi=0; pi<np; pi++) {
    const b   = bikes[pi];
    const pos = sorted.indexOf(b)+1;
    const hx  = pi===0 ? 90 : CW-90;
    const tag = pi===0 ? (np>1?'P1':'YOU') : 'P2';
    fT(tag, hx, 18, 13, b.color);
    fT(`LAP ${Math.min(b.laps+1,TOT_LAPS)}/${TOT_LAPS}`, hx, 34, 12, '#ffffff');
    fT(ordinal(pos), hx+(pi===0?42:-42), 28, 15, '#ffdd44');
  }

  // Race order panel
  const px=CW-190, py=58;
  fR(px, py, 184, 16+sorted.length*17, 'rgba(0,0,0,0.62)');
  fT('RACE ORDER', px+92, py+13, 11, '#999999');
  sorted.forEach((b,i) => {
    ctx.font='11px monospace'; ctx.textAlign='left';
    ctx.fillStyle = b.color;
    ctx.fillText(`${i+1}. ${b.name}`, px+8, py+24+i*17);
    if (b.finished) { ctx.fillStyle='#44ff44'; ctx.fillText('✓', px+168, py+24+i*17); }
  });

  // Bottom controls bar
  fR(0,CH-30,CW,30,'rgba(0,0,0,0.6)');
  const ctrl = np===1 ? '↑ Accelerate  ↓ Brake  ← → Steer'
                      : 'P1: W A S D  ·  P2: ↑ ↓ ← →';
  fT(ctrl, CW/2, CH-10, 12, '#667788');
}

// ── Game state ───────────────────────────────────────────────────
let state        = 'title';
let numP         = 1;
let bikes        = [];
let cdVal        = 3;
let cdT          = 1100;
let endTimer     = -1;
let finishCount  = 0;
let lastTime     = 0;

const COLORS  = ['#3388ff','#ff3333','#ff9900','#ffee00','#aa44ff','#00ccaa'];
const BOT_SPD = [2.6, 2.3, 2.1, 2.5, 1.9, 2.2];

function initRace(np) {
  numP = np;
  finishCount = 0;
  endTimer    = -1;

  // Grid positions: to the right of WP0, staggered inner/outer
  const wp0 = WP[0]; // bottom of oval
  const offsets = [
    [52,-19],[52,+19],[96,-19],[96,+19],[140,-19],[140,+19]
  ];

  const names1 = ['YOU','BOT1','BOT2','BOT3','BOT4','BOT5'];
  const names2 = ['P1','P2','BOT1','BOT2','BOT3','BOT4'];
  const names  = np===1 ? names1 : names2;

  const ctrl1P = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};
  const ctrlP1 = {up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'};
  const ctrlP2 = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'};

  bikes = offsets.slice(0,6).map((off,i) => {
    const bx = wp0.x + off[0];
    const by = wp0.y + off[1];
    let ctrl = null;
    if (i===0) ctrl = np===1 ? ctrl1P : ctrlP1;
    if (i===1 && np===2) ctrl = ctrlP2;
    const bIdx = i - np;
    return new Bike(bx, by, COLORS[i], names[i], ctrl, ctrl ? 0 : BOT_SPD[Math.max(0,bIdx)]);
  });

  cdVal = 3; cdT = 1100;
  state = 'countdown';
}

// ── Update ───────────────────────────────────────────────────────
function updateRace(dt) {
  for (const b of bikes) {
    b.update(dt);
    if (b.finished && !b.finishRank) b.finishRank = ++finishCount;
  }
  if (endTimer < 0 && bikes.some(b => b.finished)) endTimer = 1800;
  if (endTimer >= 0) { endTimer -= dt; if (endTimer <= 0) state = 'finish'; }
}

// ── Render screens ───────────────────────────────────────────────
function renderTitle() {
  drawTrack();
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,CW,CH);
  sT('MOTO-ISLAND', CW/2, 140, 76, '#FFD700', '#000');
  sT('MOTORCYCLE RACING', CW/2, 196, 24, '#ffffff', '#000');

  const h1=hov(CW/2-135,268,270,64), h2=hov(CW/2-135,350,270,64);
  drawBtn('🏍  1 PLAYER',  CW/2-135,268,270,64, h1);
  drawBtn('🏍  2 PLAYERS', CW/2-135,350,270,64, h2);
  fT('Race 3 Laps · Beat the Bots · First Wins!', CW/2,440, 14,'#889aaa');
  if (mclick) {
    if (h1) initRace(1);
    if (h2) initRace(2);
  }
}

function renderCountdown() {
  drawTrack();
  [...bikes].sort((a,b)=>a.y-b.y).forEach(b=>b.draw(true));
  fR(0,0,CW,52,'rgba(0,0,0,0.72)');
  sT('MOTO-ISLAND', CW/2, 32, 20, '#FFD700','#000');

  const txt  = cdVal>0 ? String(cdVal) : 'GO!';
  const col  = cdVal>0 ? '#ff4444' : '#44ff44';
  ctx.fillStyle='rgba(0,0,0,0.42)';
  ctx.beginPath(); ctx.arc(CW/2,CH/2,68,0,Math.PI*2); ctx.fill();
  sT(txt, CW/2, CH/2+26, 90, col,'#000');
}

function renderRacing() {
  drawTrack();
  [...bikes].sort((a,b)=>a.y-b.y).forEach(b=>b.draw(true));
  drawHUD(bikes, numP);
}

function renderFinish() {
  drawTrack();
  [...bikes].sort((a,b)=>a.y-b.y).forEach(b=>b.draw(true));

  // Sort final standings
  const sorted = [...bikes].sort((a,b) => {
    if (a.finishRank && b.finishRank) return a.finishRank - b.finishRank;
    if (a.finishRank) return -1; if (b.finishRank) return 1;
    return b.raceProgress - a.raceProgress;
  });

  // Modal
  fR(CW/2-255,CH/2-165,510,330,'rgba(0,0,0,0.82)');
  ctx.strokeStyle='#FFD700'; ctx.lineWidth=3;
  ctx.strokeRect(CW/2-255,CH/2-165,510,330);

  const p1pos = sorted.indexOf(bikes[0])+1;

  if (numP===1) {
    sT(p1pos===1 ? 'YOU WIN! 🏆' : 'YOU LOSE', CW/2, CH/2-90, 52,
      p1pos===1 ? '#FFD700' : '#ff4444', '#000');
    sT(p1pos===1 ? '1st Place — Amazing!' : `${ordinal(p1pos)} Place`,
      CW/2, CH/2-38, 22, '#ffffff','#000');
  } else {
    const p2pos = sorted.indexOf(bikes[1])+1;
    const winner = p1pos<p2pos ? 'PLAYER 1' : 'PLAYER 2';
    const wCol   = p1pos<p2pos ? bikes[0].color : bikes[1].color;
    sT(`${winner} WINS!`, CW/2, CH/2-90, 46, wCol, '#000');
    sT(p1pos<p2pos ? 'Player 2: You Lose' : 'Player 1: You Lose',
      CW/2, CH/2-40, 20, '#cccccc','#000');
  }

  // Top-4 standings
  sorted.slice(0,4).forEach((b,i) => {
    const medal = ['🥇','🥈','🥉','  '][i];
    ctx.font='14px monospace'; ctx.textAlign='left';
    ctx.fillStyle=b.color;
    ctx.fillText(`${medal} ${b.name}`, CW/2-90, CH/2+10+i*24);
  });

  const tryH=hov(CW/2-218,CH/2+118,200,52), goH=hov(CW/2+18,CH/2+118,200,52);
  drawBtn('▶ TRY AGAIN', CW/2-218,CH/2+118,200,52, tryH);
  drawBtn('⌂ GO BACK',   CW/2+18, CH/2+118,200,52, goH);
  if (mclick) {
    if (tryH) initRace(numP);
    if (goH)  state = 'title';
  }
}

// ── Main loop ────────────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  if (state==='countdown') { cdT-=dt; if(cdT<=0){cdVal--;cdT=1100;if(cdVal<0)state='racing';} }
  if (state==='racing') updateRace(dt);

  ctx.clearRect(0,0,CW,CH);
  if (state==='title')     renderTitle();
  else if (state==='countdown') renderCountdown();
  else if (state==='racing')    renderRacing();
  else if (state==='finish')    renderFinish();

  mclick=false;
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime=ts; requestAnimationFrame(loop); });
