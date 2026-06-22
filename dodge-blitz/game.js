'use strict';
// ================================================================
// DODGE BLITZ — Solo survival. Dodge the ball storm!
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = 900, H = 600;
canvas.width = W; canvas.height = H;

function resize() {
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width  = Math.floor(W*s)+'px';
  canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
let clickX=W/2, clickY=H/2, clickFrame=false;
canvas.addEventListener('mousedown', e => {
  const r=canvas.getBoundingClientRect();
  clickX=(e.clientX-r.left)*(W/r.width);
  clickY=(e.clientY-r.top)*(H/r.height);
  clickFrame=true;
});
function hov(x,y,w,h){ return clickX>x&&clickX<x+w&&clickY>y&&clickY<y+h; }
function hovM(x,y,w,h){
  const r=canvas.getBoundingClientRect();
  const mx=clickX, my=clickY;
  return mx>x&&mx<x+w&&my>y&&my<y+h;
}

// Mouse move for hover
let mX=W/2, mY=H/2;
canvas.addEventListener('mousemove', e => {
  const r=canvas.getBoundingClientRect();
  mX=(e.clientX-r.left)*(W/r.width);
  mY=(e.clientY-r.top)*(H/r.height);
});
function hover(x,y,w,h){ return mX>x&&mX<x+w&&mY>y&&mY<y+h; }

// ---------------------------------------------------------------- Audio
let AC=null;
function ac(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='square',vol=0.07,delay=0){
  try{
    const a=ac(),o=a.createOscillator(),g=a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type=type; o.frequency.value=f;
    const t=a.currentTime+delay;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
    o.start(t); o.stop(t+d+0.02);
  }catch(e){}
}
function sfxDie(){ tone(120,0.5,'sawtooth',0.18); tone(80,0.6,'sawtooth',0.12,0.15); }
function sfxPickup(){ tone(660,0.06,'square',0.08); tone(880,0.1,'square',0.08,0.07); tone(1100,0.08,'square',0.06,0.15); }
function sfxShield(){ tone(440,0.08,'square',0.06); tone(330,0.06,'square',0.04,0.1); }
function sfxMilestone(){ tone(523,0.08,'triangle',0.1); tone(659,0.08,'triangle',0.1,0.1); tone(784,0.12,'triangle',0.12,0.2); }

// ---------------------------------------------------------------- Helpers
function rr(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

// ---------------------------------------------------------------- Constants
const PR = 16;   // player radius
const PSPD = 5;  // player speed
const BALL_COLS = ['#ff4466','#ff8822','#ffcc22','#44ff88','#44ccff','#cc44ff','#ff44cc','#88ff44'];
const PWUP_DATA = {
  shield: { col:'#ffd700', label:'SHIELD!',   icon:'⬡', dur:360 },
  slow:   { col:'#44aaff', label:'SLOW MO!',  icon:'❄', dur:300 },
  multi:  { col:'#66ff88', label:'2× SCORE!', icon:'★', dur:400 },
  magnet: { col:'#ff88ff', label:'MAGNET!',   icon:'⊕', dur:280 },
};

// ---------------------------------------------------------------- State
let STATE = 'TITLE';
let player, balls, pwups, particles, floats;
let score, best = parseInt(localStorage.getItem('db_best')||'0');
let timer, spawnTimer, pwupTimer, difficulty;
let shakeT = 0, flashCol = null, flashT = 0;
let milestones = new Set();

// ---------------------------------------------------------------- Init
function mkPlayer() {
  return {
    x:W/2, y:H/2, vx:0, vy:0,
    trail:[],
    shieldT:0, slowT:0, multiT:0, magnetT:0,
  };
}

function startGame() {
  player = mkPlayer();
  balls=[]; pwups=[]; particles=[]; floats=[];
  score=0; timer=0; spawnTimer=0; pwupTimer=0; difficulty=0;
  milestones.clear();
  for(let i=0;i<4;i++) spawnBall();
}

// ---------------------------------------------------------------- Ball factory
function spawnBall() {
  const edge = Math.floor(Math.random()*4);
  const diff = difficulty;
  const fast = diff>6 && Math.random()<0.28;
  const big  = diff>4 && Math.random()<0.18;
  const r    = fast ? 8 : big ? 26 : 13;
  const baseSpd = 2.8 + diff*0.2;
  const spd  = fast ? baseSpd*1.9 : big ? baseSpd*0.55 : baseSpd*(0.85+Math.random()*0.4);
  const col  = fast ? '#ff2233' : big ? '#9933ff' : BALL_COLS[Math.floor(Math.random()*BALL_COLS.length)];
  let x, y, vx, vy;
  if(edge===0){ x=Math.random()*W; y=-r; vx=0; vy=spd; }
  else if(edge===1){ x=W+r; y=Math.random()*H; vx=-spd; vy=0; }
  else if(edge===2){ x=Math.random()*W; y=H+r; vx=0; vy=-spd; }
  else { x=-r; y=Math.random()*H; vx=spd; vy=0; }
  // Add aiming variance toward player
  const dx=player.x-x, dy=player.y-y, dist=Math.sqrt(dx*dx+dy*dy)||1;
  const aim=0.5+Math.random()*0.35;
  vx = vx*(1-aim)+(dx/dist*spd)*aim + (Math.random()-0.5)*0.8;
  vy = vy*(1-aim)+(dy/dist*spd)*aim + (Math.random()-0.5)*0.8;
  balls.push({x,y,vx,vy,r,col,trail:[]});
}

function spawnPwup() {
  const keys2 = Object.keys(PWUP_DATA);
  const type  = keys2[Math.floor(Math.random()*keys2.length)];
  const mg = 80;
  pwups.push({
    x: mg+Math.random()*(W-mg*2),
    y: mg+Math.random()*(H-mg*2),
    type, bob:Math.random()*Math.PI*2, life:500,
  });
}

// ---------------------------------------------------------------- Particles
function spawnPfx(x,y,col,n,spd=5) {
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;
    particles.push({x,y,vx:Math.cos(a)*(spd*0.4+Math.random()*spd),vy:Math.sin(a)*(spd*0.4+Math.random()*spd),col,r:2+Math.random()*3,life:25+Math.random()*20});
  }
}
function addFloat(x,y,txt,col) { floats.push({x,y,txt,col,life:70}); }

// ---------------------------------------------------------------- Update
function updateGame() {
  timer++;
  difficulty = Math.min(22, timer/280);

  // Player movement
  let dx=0, dy=0;
  if(keys['KeyA']||keys['ArrowLeft'])  dx-=1;
  if(keys['KeyD']||keys['ArrowRight']) dx+=1;
  if(keys['KeyW']||keys['ArrowUp'])    dy-=1;
  if(keys['KeyS']||keys['ArrowDown'])  dy+=1;
  if(dx&&dy){ dx*=0.707; dy*=0.707; }
  player.x = Math.max(PR, Math.min(W-PR, player.x + dx*PSPD));
  player.y = Math.max(PR, Math.min(H-PR, player.y + dy*PSPD));
  player.trail.unshift({x:player.x, y:player.y});
  if(player.trail.length>14) player.trail.pop();

  // Power-up timers
  if(player.shieldT>0) player.shieldT--;
  if(player.slowT>0)   player.slowT--;
  if(player.multiT>0)  player.multiT--;
  if(player.magnetT>0) player.magnetT--;

  // Magnet: pull power-ups toward player
  if(player.magnetT>0) {
    pwups.forEach(p=>{
      const dx2=player.x-p.x, dy2=player.y-p.y;
      const dist=Math.sqrt(dx2*dx2+dy2*dy2)||1;
      p.x+=dx2/dist*3.5; p.y+=dy2/dist*3.5;
    });
  }

  // Spawn balls
  const interval = Math.max(15, 52-difficulty*2.5);
  if(++spawnTimer>=interval){ spawnTimer=0; spawnBall(); if(difficulty>8) spawnBall(); }

  // Spawn power-ups
  if(++pwupTimer>=400){ pwupTimer=0; spawnPwup(); }

  const slow = player.slowT>0 ? 0.35 : 1;

  // Move & cull balls
  balls = balls.filter(b=>{
    b.trail.unshift({x:b.x,y:b.y});
    if(b.trail.length>7) b.trail.pop();
    b.x += b.vx*slow;
    b.y += b.vy*slow;
    return b.x>-120 && b.x<W+120 && b.y>-120 && b.y<H+120;
  });

  // Ball-player collision
  for(const b of balls){
    const dx2=player.x-b.x, dy2=player.y-b.y;
    if(dx2*dx2+dy2*dy2 < (PR+b.r-3)*(PR+b.r-3)){
      if(player.shieldT>0){
        player.shieldT=0;
        spawnPfx(player.x,player.y,'#ffd700',18,7);
        balls=balls.filter(bb=>bb!==b);
        sfxShield(); shakeT=0;
        addFloat(player.x,player.y-30,'SHIELD BROKE!','#ffd700');
      } else {
        spawnPfx(player.x,player.y,'#ff4444',28,8);
        spawnPfx(player.x,player.y,'#ffaa22',14,5);
        sfxDie(); shakeT=18;
        flashCol='#ff0000'; flashT=12;
        const final=Math.floor(score);
        if(final>best){ best=final; localStorage.setItem('db_best',String(best)); }
        STATE='GAMEOVER';
        return;
      }
    }
  }

  // Power-up collection
  pwups = pwups.filter(p=>{
    p.bob+=0.06; p.life--;
    const dx2=player.x-p.x, dy2=player.y-p.y;
    if(dx2*dx2+dy2*dy2 < (PR+24)*(PR+24)){
      const d=PWUP_DATA[p.type];
      if(p.type==='shield') player.shieldT=d.dur;
      else if(p.type==='slow') player.slowT=d.dur;
      else if(p.type==='multi') player.multiT=d.dur;
      else if(p.type==='magnet') player.magnetT=d.dur;
      spawnPfx(p.x,p.y,d.col,22,6);
      sfxPickup();
      addFloat(p.x,p.y-20,d.label,d.col);
      return false;
    }
    return p.life>0;
  });

  // Score
  const mult = player.multiT>0 ? 2 : 1;
  score += 0.055*mult*(1+difficulty*0.12);

  // Milestone SFX every 100 pts
  const s100=Math.floor(score/100)*100;
  if(s100>0&&!milestones.has(s100)){ milestones.add(s100); sfxMilestone(); addFloat(W/2,H/2-40,s100+' PTS!','#ffd700'); }

  // Particles / floats
  particles = particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vx*=0.91; p.vy*=0.91; return --p.life>0; });
  floats    = floats.filter(f=>{ f.y-=0.9; return --f.life>0; });
  if(shakeT>0) shakeT--;
  if(flashT>0) flashT--;
}

// ---------------------------------------------------------------- Background
function drawBg() {
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#05050f'); g.addColorStop(1,'#0a0a1e');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,0.035)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=55){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=55){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.9);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,20,0.75)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
}

// ---------------------------------------------------------------- Draw player
function drawPlayer() {
  const p=player;
  // Trail
  p.trail.forEach((t,i)=>{
    const a=(1-i/p.trail.length)*0.22;
    const col = p.shieldT>0?`rgba(255,215,0,${a})`:p.multiT>0?`rgba(100,255,140,${a})`:`rgba(200,220,255,${a})`;
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(t.x,t.y,PR*(1-i/p.trail.length*0.55),0,Math.PI*2); ctx.fill();
  });
  // Shield ring
  if(p.shieldT>0){
    const pulse=Math.sin(timer*0.18)*4;
    const a2=0.5+Math.sin(timer*0.22)*0.3;
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=20;
    ctx.strokeStyle=`rgba(255,215,0,${a2})`; ctx.lineWidth=3.5;
    ctx.beginPath(); ctx.arc(p.x,p.y,PR+10+pulse,0,Math.PI*2); ctx.stroke();
    ctx.lineWidth=1.5; ctx.strokeStyle=`rgba(255,215,0,${a2*0.5})`;
    ctx.beginPath(); ctx.arc(p.x,p.y,PR+18+pulse,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
  }
  // Body glow
  const gc=p.shieldT>0?'#ffd700':p.multiT>0?'#66ff88':p.magnetT>0?'#ff88ff':'#ffffff';
  ctx.shadowColor=gc; ctx.shadowBlur=22;
  ctx.fillStyle=gc; ctx.beginPath(); ctx.arc(p.x,p.y,PR,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  // Face
  ctx.fillStyle='#05050f';
  ctx.beginPath(); ctx.arc(p.x-6,p.y-4,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x+6,p.y-4,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=gc;
  ctx.beginPath(); ctx.arc(p.x-6,p.y-4,2.2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x+6,p.y-4,2.2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#05050f'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(p.x,p.y+3,5,0.2,Math.PI-0.2); ctx.stroke();
}

// ---------------------------------------------------------------- Draw balls
function drawBalls() {
  balls.forEach(b=>{
    b.trail.forEach((t,i)=>{
      ctx.globalAlpha=(1-i/b.trail.length)*0.28;
      ctx.fillStyle=b.col;
      ctx.beginPath(); ctx.arc(t.x,t.y,b.r*(0.85-i*0.1),0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1;
    ctx.shadowColor=b.col; ctx.shadowBlur=14;
    ctx.fillStyle=b.col; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(b.x-b.r*0.32,b.y-b.r*0.32,b.r*0.32,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  });
  ctx.globalAlpha=1;
}

// ---------------------------------------------------------------- Draw power-ups
function drawPwups() {
  pwups.forEach(p=>{
    const bob=Math.sin(p.bob)*6;
    const d=PWUP_DATA[p.type];
    const fa=Math.min(1,p.life/60);
    ctx.globalAlpha=fa;
    ctx.shadowColor=d.col; ctx.shadowBlur=20;
    ctx.fillStyle=d.col+'28';
    ctx.beginPath(); ctx.arc(p.x,p.y+bob,24,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=d.col; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(p.x,p.y+bob,24,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.font='bold 18px monospace'; ctx.textAlign='center';
    ctx.fillStyle=d.col; ctx.fillText(d.icon,p.x,p.y+bob+7);
    ctx.font='bold 7px monospace';
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText(p.type.toUpperCase(),p.x,p.y+bob+22);
    ctx.globalAlpha=1;
  });
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Draw FX
function drawFX() {
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(0,p.life/38);
    ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
  floats.forEach(f=>{
    ctx.globalAlpha=Math.min(1,f.life/22);
    ctx.font='bold 12px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y);
  });
  ctx.globalAlpha=1; ctx.textAlign='left';
  if(player.slowT>0){
    ctx.fillStyle=`rgba(30,80,180,${Math.min(0.1,player.slowT/300*0.1)})`;
    ctx.fillRect(0,0,W,H);
  }
  if(flashT>0){
    ctx.fillStyle=`rgba(255,0,0,${flashT/22*0.35})`;
    ctx.fillRect(0,0,W,H);
  }
}

// ---------------------------------------------------------------- HUD
function drawHUD() {
  // Score center top
  ctx.textAlign='center'; ctx.fillStyle='#fff';
  ctx.shadowColor='rgba(255,255,255,0.4)'; ctx.shadowBlur=10;
  ctx.font='bold 30px "Press Start 2P",monospace'; ctx.fillText(Math.floor(score),W/2,44);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,60);

  // Best top right
  ctx.textAlign='right'; ctx.fillStyle='#ffd700';
  ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-12,22);

  // Time + level top left
  ctx.textAlign='left'; ctx.fillStyle='rgba(255,255,255,0.55)';
  ctx.font='9px monospace'; ctx.fillText(Math.floor(timer/60)+'s',12,22);
  ctx.fillStyle=`hsl(${120-difficulty*5},90%,60%)`;
  ctx.font='bold 9px monospace'; ctx.fillText('LV '+(Math.floor(difficulty)+1),12,36);

  // Active power-up icons bottom-left
  let py=H-14;
  const actives=[
    player.shieldT>0&&{col:'#ffd700',icon:'⬡',t:player.shieldT,label:'SHIELD'},
    player.slowT>0  &&{col:'#44aaff',icon:'❄',t:player.slowT,  label:'SLOW'},
    player.multiT>0 &&{col:'#66ff88',icon:'★',t:player.multiT, label:'2×'},
    player.magnetT>0&&{col:'#ff88ff',icon:'⊕',t:player.magnetT,label:'MAG'},
  ].filter(Boolean);
  actives.forEach(a=>{
    ctx.fillStyle='rgba(0,0,0,0.5)'; rr(10,py-16,86,18,5); ctx.fill();
    ctx.fillStyle=a.col; ctx.font='bold 9px monospace'; ctx.textAlign='left';
    ctx.fillText(`${a.icon} ${a.label} ${Math.ceil(a.t/60)}s`,14,py);
    py-=22;
  });

  // Controls hint bottom right
  ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.18)';
  ctx.font='8px monospace'; ctx.fillText('WASD / ↑↓←→ — move  |  ESC — menu',W-8,H-8);
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Title screen
let decorBalls=null;
function ensureDecorators(){
  if(decorBalls) return;
  decorBalls=Array.from({length:9},(_,i)=>({
    x:80+Math.random()*(W-160), y:80+Math.random()*(H-160),
    vx:(Math.random()-0.5)*1.2, vy:(Math.random()-0.5)*1.2,
    r:10+Math.random()*8, col:BALL_COLS[i%BALL_COLS.length],
    t:Math.random()*Math.PI*2,
  }));
}
function updateDecorators(){
  decorBalls.forEach(b=>{
    b.t+=0.015; b.x+=b.vx; b.y+=b.vy;
    if(b.x<b.r||b.x>W-b.r) b.vx*=-1;
    if(b.y<b.r||b.y>H-b.r) b.vy*=-1;
  });
}

function drawTitle() {
  ensureDecorators(); updateDecorators();
  drawBg();
  decorBalls.forEach(b=>{
    ctx.shadowColor=b.col; ctx.shadowBlur=12;
    ctx.fillStyle=b.col; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  });
  // Title text
  ctx.textAlign='center';
  ctx.shadowColor='#ff3355'; ctx.shadowBlur=35;
  ctx.fillStyle='#ff3355'; ctx.font='bold 62px "Press Start 2P",monospace'; ctx.fillText('DODGE',W/2,185);
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=35;
  ctx.fillStyle='#44aaff'; ctx.font='bold 62px "Press Start 2P",monospace'; ctx.fillText('BLITZ',W/2,262);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('SURVIVE THE BALL STORM',W/2,296);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,328); }
  // Power-up legend
  const legend=[
    {type:'shield',x:W/2-240},
    {type:'slow',  x:W/2-80},
    {type:'multi', x:W/2+80},
    {type:'magnet',x:W/2+240},
  ];
  legend.forEach(l=>{
    const d=PWUP_DATA[l.type];
    ctx.fillStyle=d.col+'22'; ctx.beginPath(); ctx.arc(l.x,385,26,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=d.col; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(l.x,385,26,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=d.col; ctx.font='bold 17px monospace'; ctx.fillText(d.icon,l.x,392);
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='7px monospace'; ctx.fillText(l.type.toUpperCase(),l.x,415);
  });
  // Play button
  const ph=hover(W/2-115,440,230,58);
  ctx.fillStyle=ph?'#ff5577':'#ff3355';
  rr(W/2-115,440,230,58,12); ctx.fill();
  ctx.shadowColor='#ff3355'; ctx.shadowBlur=ph?25:8; ctx.beginPath(); rr(W/2-115,440,230,58,12); ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,478);
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='8px monospace'; ctx.fillText('[ENTER or SPACE]',W/2,500);
  ctx.textAlign='left';
  canvas.style.cursor=ph?'pointer':'default';
  if((clickFrame&&hover(W/2-115,440,230,58))||keys['Enter']||keys['Space']){ startGame(); STATE='GAME'; }
}

// ---------------------------------------------------------------- Game Over
function drawGameOver() {
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff3355'; ctx.shadowBlur=20;
  ctx.fillStyle='#ff3355'; ctx.font='bold 38px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,175);
  ctx.shadowBlur=0;
  const s=Math.floor(score);
  ctx.shadowColor='#fff'; ctx.shadowBlur=10;
  ctx.fillStyle='#fff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText(s,W/2,248);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,268);
  if(s>=best&&s>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 11px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,300); }
  else{ ctx.fillStyle='#ffd700'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,300); }
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='8px monospace';
  ctx.fillText('Survived '+Math.floor(timer/60)+'s  |  Level '+(Math.floor(difficulty)+1),W/2,325);
  // Play again
  const ph=hover(W/2-135,355,270,54);
  ctx.fillStyle=ph?'#ff5577':'#ff3355'; rr(W/2-135,355,270,54,12); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,390);
  // Menu
  const mh=hover(W/2-100,425,200,44);
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; rr(W/2-100,425,200,44,10); ctx.fill();
  ctx.strokeStyle='#444466'; ctx.lineWidth=1.5; ctx.beginPath(); rr(W/2-100,425,200,44,10); ctx.stroke();
  ctx.fillStyle='#aaa'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,452);
  ctx.textAlign='left';
  canvas.style.cursor=(ph||mh)?'pointer':'default';
  if((clickFrame&&hover(W/2-135,355,270,54))||keys['Enter']||keys['Space']){ startGame(); STATE='GAME'; }
  if(clickFrame&&hover(W/2-100,425,200,44)){ STATE='TITLE'; }
}

// ---------------------------------------------------------------- Main loop
let frame=0;
function loop(){
  frame++;
  const doShake = shakeT>0 && STATE!=='TITLE';
  if(doShake){
    ctx.save();
    const s=shakeT*0.9;
    ctx.translate(Math.random()*s-s/2, Math.random()*s-s/2);
  }
  ctx.clearRect(-20,-20,W+40,H+40);

  if(STATE==='TITLE'){
    shakeT=0;
    drawTitle();
  } else if(STATE==='GAME'){
    drawBg(); drawPwups(); drawBalls(); drawFX(); drawPlayer(); drawHUD();
    updateGame();
    if(keys['Escape']){ shakeT=0; STATE='TITLE'; }
  } else if(STATE==='GAMEOVER'){
    drawGameOver();
  }

  if(doShake) ctx.restore();
  clickFrame=false;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
