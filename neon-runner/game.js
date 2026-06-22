'use strict';
// ================================================================
// NEON RUNNER — Jump, double-jump, dodge obstacles, collect coins!
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 900, H = 500;
canvas.width = W; canvas.height = H;

function resize() {
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width  = Math.floor(W*s)+'px';
  canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
let jumpPressed = false, clickFrame = false;
let mX = W/2, mY = H/2;
window.addEventListener('keydown', e => {
  if (e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW') { jumpPressed=true; e.preventDefault(); }
});
window.addEventListener('keyup', e => {
  if (e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW') jumpPressed=false;
});
canvas.addEventListener('click', e => {
  const r=canvas.getBoundingClientRect();
  mX=(e.clientX-r.left)*(W/r.width); mY=(e.clientY-r.top)*(H/r.height);
  clickFrame=true;
});
canvas.addEventListener('mousemove', e => {
  const r=canvas.getBoundingClientRect();
  mX=(e.clientX-r.left)*(W/r.width); mY=(e.clientY-r.top)*(H/r.height);
});
function hover(x,y,w,h){ return mX>x&&mX<x+w&&mY>y&&mY<y+h; }

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='square',vol=0.07,delay=0){
  try{
    const a=getAC(),o=a.createOscillator(),g=a.createGain();
    o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f;
    const t=a.currentTime+delay;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
    o.start(t); o.stop(t+d+0.02);
  }catch(e){}
}
function sfxJump()   { tone(440,0.06,'square',0.07); tone(550,0.05,'square',0.06,0.04); }
function sfxDouble() { tone(660,0.06,'square',0.08); tone(880,0.07,'square',0.07,0.05); }
function sfxCoin()   { tone(880,0.04,'triangle',0.09); tone(1100,0.05,'triangle',0.07,0.04); }
function sfxDie()    { tone(300,0.08,'sawtooth',0.12); tone(200,0.12,'sawtooth',0.14,0.1); tone(100,0.35,'sawtooth',0.16,0.22); }
function sfxMile()   { tone(523,0.07,'triangle',0.1); tone(659,0.07,'triangle',0.1,0.08); tone(784,0.1,'triangle',0.12,0.16); }

// ---------------------------------------------------------------- Constants
const GROUND    = 400;   // y of ground surface
const PW = 28, PH = 28;  // player size
const PX = 160;           // player fixed x
const GRAVITY   = 0.62;
const JUMP_VY   = -13.5;
const MAX_JUMPS = 2;

// ---------------------------------------------------------------- State
let STATE = 'TITLE';
let py, pvy, jumpsLeft, prevJump, onGround;
let trail;
let obstacles, coins, particles, floats;
let worldX, speed, spawnTimer, coinTimer;
let score, coinCount, best = +(localStorage.getItem('nr_best')||0);
let frame = 0, milestones;
let shielded, shieldT;

// ---------------------------------------------------------------- Init
function startGame() {
  py = GROUND - PH; pvy = 0; jumpsLeft = MAX_JUMPS; prevJump = false; onGround = true;
  trail = [];
  obstacles = []; coins = []; particles = []; floats = [];
  worldX = 0; speed = 4.5; spawnTimer = 0; coinTimer = 0;
  score = 0; coinCount = 0; frame = 0; milestones = new Set();
  shielded = false; shieldT = 0;
}

// ---------------------------------------------------------------- Spawn helpers
function spawnObstacle() {
  const x = W + 60;
  const type = Math.random();
  if (type < 0.45) {
    // Floor pillar
    const h = 60 + Math.random()*110;
    obstacles.push({ x, type:'floor', h, w:34 });
  } else if (type < 0.75) {
    // Ceiling hang
    const h = 55 + Math.random()*90;
    obstacles.push({ x, type:'ceil', h, w:34 });
  } else if (type < 0.90) {
    // Both — floor + ceiling with gap
    const fh = 55 + Math.random()*70;
    const ch = 55 + Math.random()*70;
    const gap = GROUND - fh - ch - 10;
    if (gap >= 90) {
      obstacles.push({ x, type:'floor', h:fh, w:34 });
      obstacles.push({ x, type:'ceil',  h:ch, w:34 });
    } else {
      obstacles.push({ x, type:'floor', h:fh, w:34 });
    }
  } else {
    // Wide low pillar
    const h = 40 + Math.random()*50;
    obstacles.push({ x, type:'floor', h, w:55 });
  }
}

function spawnCoins() {
  const x = W + 80;
  const pattern = Math.floor(Math.random()*4);
  if (pattern===0) {
    // Arc
    for(let i=0;i<6;i++) coins.push({x:x+i*36, y:GROUND-90-Math.sin(i/5*Math.PI)*110, collected:false, spin:0});
  } else if (pattern===1) {
    // Horizontal line mid-air
    for(let i=0;i<5;i++) coins.push({x:x+i*38, y:GROUND-140, collected:false, spin:0});
  } else if (pattern===2) {
    // Vertical line
    for(let i=0;i<4;i++) coins.push({x, y:GROUND-70-i*52, collected:false, spin:0});
  } else {
    // Single high coin
    coins.push({x:x+60, y:GROUND-200, collected:false, spin:0});
  }
}

function spawnPfx(x, y, col, n) {
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=2+Math.random()*4;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,col,r:2+Math.random()*3,life:25+Math.random()*15});
  }
}

// ---------------------------------------------------------------- Update
function update() {
  frame++;
  score = Math.floor(frame/6) + coinCount*8;

  // Speed ramp
  speed = Math.min(10.5, 4.5 + frame/1800);
  worldX += speed;

  // Milestone
  const m = Math.floor(frame/360)*100;
  if (m>0 && !milestones.has(m)) { milestones.add(m); sfxMile(); floats.push({x:W/2,y:180,txt:m+' PTS!',col:'#ffd700',life:55}); }

  // Jump input
  const jumpNow = jumpPressed || clickFrame;
  if (jumpNow && !prevJump && jumpsLeft>0) {
    if (jumpsLeft===MAX_JUMPS) sfxJump(); else sfxDouble();
    pvy = JUMP_VY - (jumpsLeft===1 ? 0.5 : 0); // double jump slightly weaker
    jumpsLeft--;
    onGround = false;
    spawnPfx(PX, py+PH, '#33aaff', 6);
  }
  prevJump = jumpNow;

  // Physics
  pvy = Math.min(pvy + GRAVITY, 18);
  py += pvy;

  // Ground collision
  if (py >= GROUND-PH) { py=GROUND-PH; pvy=0; jumpsLeft=MAX_JUMPS; onGround=true; }
  // Ceiling
  if (py < 0) { py=0; pvy=0; }

  // Trail
  trail.unshift({x:PX, y:py});
  if (trail.length > 18) trail.pop();

  // Shield timer
  if (shieldT>0) { shieldT--; if(shieldT===0) shielded=false; }

  // Spawn
  const spawnInterval = Math.max(68, 160 - frame/40);
  if (++spawnTimer >= spawnInterval) { spawnTimer=0; spawnObstacle(); }
  const coinInterval = Math.max(80, 200 - frame/50);
  if (++coinTimer >= coinInterval) { coinTimer=0; spawnCoins(); }

  // Move obstacles
  obstacles = obstacles.filter(o => { o.x -= speed; return o.x > -80; });
  // Move coins
  coins = coins.filter(c => { c.x -= speed; c.spin+=0.12; return c.x > -30; });

  // Collide obstacles
  for (const o of obstacles) {
    const oy = o.type==='floor' ? GROUND-o.h : 0;
    const oh = o.type==='floor' ? o.h : o.h;
    if (PX+PW-6 > o.x && PX+6 < o.x+o.w && py+PH-4 > oy && py+4 < oy+oh) {
      if (shielded) {
        shielded=false; shieldT=0;
        spawnPfx(PX,py,'#ffd700',20);
        floats.push({x:PX,y:py-30,txt:'SHIELD!',col:'#ffd700',life:50});
        obstacles = obstacles.filter(ob=>ob!==o);
      } else {
        sfxDie();
        if (score>best){ best=score; localStorage.setItem('nr_best',String(best)); }
        spawnPfx(PX,py,'#33aaff',25); spawnPfx(PX,py,'#ff4466',15);
        STATE='GAMEOVER';
        return;
      }
    }
  }

  // Collect coins
  coins.forEach(c => {
    if (c.collected) return;
    if (Math.abs((PX+PW/2)-(c.x)) < 28 && Math.abs((py+PH/2)-(c.y)) < 28) {
      c.collected=true; coinCount++; sfxCoin();
      spawnPfx(c.x,c.y,'#ffd700',8);
      floats.push({x:c.x,y:c.y-20,txt:'+8',col:'#ffd700',life:35});
    }
  });
  coins = coins.filter(c=>!c.collected);

  // Particles & floats
  particles = particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.18;return --p.life>0;});
  floats    = floats.filter(f=>{f.y-=0.9;return --f.life>0;});
}

// ---------------------------------------------------------------- Draw background
function drawBg() {
  // Deep dark sky
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#04040e'); g.addColorStop(0.7,'#080818'); g.addColorStop(1,'#0c0c22');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // Distant stars
  for(let i=0;i<55;i++){
    const sx=((i*137.5+worldX*0.05)%W+W)%W;
    const sy=(i*71.3)%(GROUND-20);
    ctx.globalAlpha=0.35+(i%5)*0.12;
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx,sy,i%8?0.7:1.3,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  // Mid parallax neon mountains
  ctx.fillStyle='rgba(30,10,60,0.7)';
  for(let i=0;i<8;i++){
    const mx=((i*160-worldX*0.18)%W+W)%W;
    const mh=60+Math.sin(i*1.7)*40;
    ctx.beginPath(); ctx.moveTo(mx,GROUND); ctx.lineTo(mx+80,GROUND-mh); ctx.lineTo(mx+160,GROUND); ctx.fill();
  }

  // Speed lines
  ctx.strokeStyle='rgba(50,180,255,0.07)'; ctx.lineWidth=1;
  for(let i=0;i<10;i++){
    const lx=((i*110-worldX*1.4)%W+W)%W;
    const ly=30+i*38;
    ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+60,ly); ctx.stroke();
  }

  // Neon ground
  const gg=ctx.createLinearGradient(0,GROUND,0,H);
  gg.addColorStop(0,'#0a0a20'); gg.addColorStop(1,'#060610');
  ctx.fillStyle=gg; ctx.fillRect(0,GROUND,W,H-GROUND);

  // Moving grid on ground
  ctx.strokeStyle='rgba(50,180,255,0.18)'; ctx.lineWidth=1;
  const gx=(worldX*0.8)%80;
  for(let x=-80+gx;x<W;x+=80){ ctx.beginPath(); ctx.moveTo(x,GROUND); ctx.lineTo(x+40,H); ctx.stroke(); }
  for(let d=0;d<5;d++){
    const gy=GROUND+d*22; const a=0.05+d*0.04;
    ctx.strokeStyle=`rgba(50,180,255,${a})`;
    ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
  }

  // Ground glow line
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=12;
  ctx.strokeStyle='rgba(100,200,255,0.6)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,GROUND); ctx.lineTo(W,GROUND); ctx.stroke();
  ctx.shadowBlur=0;
}

// ---------------------------------------------------------------- Draw obstacles
function drawObstacles() {
  obstacles.forEach(o => {
    const oy = o.type==='floor' ? GROUND-o.h : 0;
    const oh = o.type==='floor' ? o.h : o.h;

    // Glow
    ctx.shadowColor='#ff3366'; ctx.shadowBlur=16;
    const g=ctx.createLinearGradient(o.x,oy,o.x+o.w,oy);
    g.addColorStop(0,'#cc1133'); g.addColorStop(0.5,'#ff3366'); g.addColorStop(1,'#cc1133');
    ctx.fillStyle=g; ctx.fillRect(o.x,oy,o.w,oh);
    ctx.shadowBlur=0;

    // Highlight edge
    ctx.fillStyle='rgba(255,100,150,0.4)'; ctx.fillRect(o.x,oy,3,oh);
    ctx.fillStyle='rgba(255,100,150,0.2)'; ctx.fillRect(o.x+o.w-3,oy,3,oh);

    // Warning chevrons on tall pillars
    if (o.h > 80) {
      ctx.fillStyle='rgba(255,200,0,0.25)';
      for(let cy=oy+10;cy<oy+oh-15;cy+=30){
        ctx.beginPath(); ctx.moveTo(o.x+4,cy); ctx.lineTo(o.x+o.w/2,cy+12); ctx.lineTo(o.x+o.w-4,cy); ctx.fill();
      }
    }
  });
}

// ---------------------------------------------------------------- Draw coins
function drawCoins() {
  coins.forEach(c => {
    ctx.save(); ctx.translate(c.x, c.y);
    const squeeze = Math.cos(c.spin);
    ctx.scale(Math.max(0.15, squeeze), 1);
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=14;
    ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffaa00'; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,200,0.8)'; ctx.beginPath(); ctx.arc(-3,-3,3,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.restore();
  });
}

// ---------------------------------------------------------------- Draw player
function drawPlayer() {
  // Trail
  trail.forEach((t,i)=>{
    const a=(1-i/trail.length)*0.3;
    const s=PW*(1-i/trail.length*0.5);
    ctx.globalAlpha=a;
    ctx.fillStyle='#33aaff';
    ctx.fillRect(t.x-s/2+PW/2, t.y+(PH-s)/2, s, s);
  });
  ctx.globalAlpha=1;

  // Shield aura
  if (shielded) {
    const pulse=Math.sin(frame*0.2)*5;
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=22;
    ctx.strokeStyle=`rgba(255,215,0,${0.5+Math.sin(frame*0.25)*0.3})`; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(PX+PW/2,py+PH/2,PW/2+12+pulse,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
  }

  // Body glow
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=20;
  const pg=ctx.createLinearGradient(PX,py,PX+PW,py+PH);
  pg.addColorStop(0,'#66ddff'); pg.addColorStop(1,'#1188cc');
  ctx.fillStyle=pg; ctx.fillRect(PX,py,PW,PH);
  ctx.shadowBlur=0;

  // Shine
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(PX+3,py+3,10,5);

  // Running legs animation
  const legFrame=Math.floor(frame/5)%2;
  ctx.fillStyle='#1188cc';
  if (onGround) {
    ctx.fillRect(PX+5, py+PH, 7, legFrame?10:6);
    ctx.fillRect(PX+16, py+PH, 7, legFrame?6:10);
  } else {
    // Tuck legs when airborne
    ctx.fillRect(PX+5, py+PH, 7, 5);
    ctx.fillRect(PX+16, py+PH, 7, 5);
  }

  // Engine exhaust glow when jumping
  if (!onGround) {
    ctx.shadowColor='#33aaff'; ctx.shadowBlur=10;
    ctx.fillStyle='rgba(100,200,255,0.4)';
    ctx.fillRect(PX+6,py+PH+6,PW-12,4);
    ctx.shadowBlur=0;
  }
}

// ---------------------------------------------------------------- Draw FX
function drawFX() {
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(0,p.life/35);
    ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
  floats.forEach(f=>{
    ctx.globalAlpha=Math.min(1,f.life/20);
    ctx.font='bold 11px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col;
    ctx.fillText(f.txt,f.x,f.y);
  });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

// ---------------------------------------------------------------- HUD
function drawHUD() {
  // Score
  ctx.textAlign='center';
  ctx.shadowColor='rgba(255,255,255,0.4)'; ctx.shadowBlur=10;
  ctx.fillStyle='#fff'; ctx.font='bold 28px "Press Start 2P",monospace'; ctx.fillText(score,W/2,38);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,52);

  // Coins
  ctx.textAlign='left'; ctx.fillStyle='#ffd700';
  ctx.font='bold 11px "Press Start 2P",monospace'; ctx.fillText('⬟ '+coinCount,12,24);

  // Best
  ctx.textAlign='right'; ctx.fillStyle='#ffd700';
  ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-10,22);

  // Speed bar
  const spd=(speed-4.5)/6;
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(10,H-28,160,10);
  ctx.fillStyle=`hsl(${120-spd*120},90%,55%)`; ctx.fillRect(10,H-28,Math.floor(spd*160),10);
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.strokeRect(10,H-28,160,10);
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px monospace'; ctx.textAlign='left'; ctx.fillText('SPEED',12,H-32);

  // Controls
  ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font='8px monospace';
  ctx.fillText('CLICK  or  SPACE  to  jump  (×2)',W/2,H-8);
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Round rect helper
function rr(x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

// ---------------------------------------------------------------- Title
let tf = 0;
function drawTitle() {
  tf++;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#04040e'); g.addColorStop(1,'#0c0c22');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // Stars
  for(let i=0;i<60;i++){
    ctx.globalAlpha=0.25+(i%5)*0.12; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc((i*137)%W,(i*89)%(GROUND-30),i%8?0.7:1.3,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;

  // Animated demo player running
  const demoX=120+Math.sin(tf*0.04)*20;
  const demoY=GROUND-PH;
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=18;
  ctx.fillStyle='#33aaff'; ctx.fillRect(demoX,demoY,PW,PH);
  ctx.shadowBlur=0;

  // Demo obstacles
  [350,560,730].forEach((ox,i)=>{
    const oh=70+i*25;
    const g2=ctx.createLinearGradient(ox,GROUND-oh,ox+34,GROUND-oh);
    g2.addColorStop(0,'#cc1133'); g2.addColorStop(1,'#ff3366');
    ctx.fillStyle=g2; ctx.fillRect(ox,GROUND-oh,34,oh);
  });

  // Demo coins
  [280,460,620].forEach(cx=>{
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=12;
    ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(cx,GROUND-130,10,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  });

  // Ground
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=12;
  ctx.strokeStyle='rgba(100,200,255,0.6)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,GROUND); ctx.lineTo(W,GROUND); ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(30,180,255,0.06)'; ctx.fillRect(0,GROUND,W,H-GROUND);

  // Title
  ctx.textAlign='center';
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=30;
  ctx.fillStyle='#fff'; ctx.font='bold 62px "Press Start 2P",monospace'; ctx.fillText('NEON',W/2,155);
  ctx.shadowColor='#ff3366'; ctx.shadowBlur=30;
  ctx.fillStyle='#fff'; ctx.font='bold 62px "Press Start 2P",monospace'; ctx.fillText('RUNNER',W/2,230);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='8px "Press Start 2P",monospace';
  ctx.fillText('JUMP. DODGE. COLLECT. SURVIVE.',W/2,262);
  if (best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,286); }

  // Controls info
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='8px monospace';
  ctx.fillText('Double jump allowed!',W/2,308);

  // Play button
  const ph=hover(W/2-115,328,230,54);
  ctx.fillStyle=ph?'#44bbff':'#33aaff'; rr(W/2-115,328,230,54,12); ctx.fill();
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=ph?22:8; rr(W/2-115,328,230,54,12); ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,364);
  ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font='8px monospace'; ctx.fillText('[CLICK or SPACE]',W/2,382);
  ctx.textAlign='left';
  canvas.style.cursor=ph?'pointer':'default';

  if (clickFrame&&hover(W/2-115,328,230,54)) { startGame(); STATE='GAME'; }
  if (jumpPressed) { startGame(); STATE='GAME'; }
}

// ---------------------------------------------------------------- Game Over
function drawGameOver() {
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#04040e'); g.addColorStop(1,'#0c0c22');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);

  ctx.textAlign='center';
  ctx.shadowColor='#ff3366'; ctx.shadowBlur=22;
  ctx.fillStyle='#ff3366'; ctx.font='bold 38px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,155);
  ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=10;
  ctx.fillStyle='#fff'; ctx.font='bold 48px "Press Start 2P",monospace'; ctx.fillText(score,W/2,230);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,248);
  ctx.fillStyle='#ffd700'; ctx.font='9px monospace'; ctx.fillText('⬟ '+coinCount+' coins collected',W/2,272);
  if (score>=best&&score>0){
    ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,300);
  } else {
    ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,300);
  }

  const ph=hover(W/2-130,325,260,52);
  ctx.fillStyle=ph?'#44bbff':'#33aaff'; rr(W/2-130,325,260,52,12); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,358);

  const mh=hover(W/2-100,393,200,44);
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; rr(W/2-100,393,200,44,10); ctx.fill();
  ctx.strokeStyle='#3a3a55'; ctx.lineWidth=1.5; rr(W/2-100,393,200,44,10); ctx.stroke();
  ctx.fillStyle='#aaa'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,421);
  ctx.textAlign='left';
  canvas.style.cursor=(ph||mh)?'pointer':'default';

  if (clickFrame&&hover(W/2-130,325,260,52)) { startGame(); STATE='GAME'; }
  if (clickFrame&&hover(W/2-100,393,200,44)) { STATE='TITLE'; }
}

// ---------------------------------------------------------------- Main Loop
function loop() {
  const click = clickFrame;
  clickFrame = false;

  ctx.clearRect(0,0,W,H);

  if (STATE==='TITLE') {
    clickFrame = click;
    drawTitle();
    clickFrame = false;
  } else if (STATE==='GAME') {
    drawBg(); drawObstacles(); drawCoins(); drawFX(); drawPlayer(); drawHUD();
    clickFrame = click;
    update();
    clickFrame = false;
  } else if (STATE==='GAMEOVER') {
    drawBg();
    drawFX();
    clickFrame = click;
    drawGameOver();
    clickFrame = false;
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
