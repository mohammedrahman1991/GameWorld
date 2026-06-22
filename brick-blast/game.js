'use strict';
// ================================================================
// BRICK BLAST — Classic Breakout / Arkanoid with power-ups
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 600, H = 700;
canvas.width = W; canvas.height = H;

function resize(){
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width = Math.floor(W*s)+'px'; canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
const keys={};
let mX=W/2, clickFrame=false;
window.addEventListener('keydown',e=>{ keys[e.code]=true; if(['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup',e=>{ keys[e.code]=false; });
canvas.addEventListener('mousemove',e=>{ const r=canvas.getBoundingClientRect(); mX=(e.clientX-r.left)*(W/r.width); });
canvas.addEventListener('click',e=>{ const r=canvas.getBoundingClientRect(); mX=(e.clientX-r.left)*(W/r.width); clickFrame=true; });

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='square',vol=0.07,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxBrick(hard){ tone(hard?280:440,0.04,'square',0.06); }
function sfxPowerup(){ [523,659,784].forEach((f,i)=>tone(f,0.06,'triangle',0.08,i*0.06)); }
function sfxLose(){ tone(220,0.15,'sawtooth',0.14); tone(110,0.5,'sawtooth',0.18,0.18); }
function sfxLevelUp(){ [523,587,659,784].forEach((f,i)=>tone(f,0.08,'triangle',0.1,i*0.08)); }
function sfxPaddle(){ tone(320,0.03,'sine',0.05); }

// ---------------------------------------------------------------- Constants
const PADDLE_W=100, PADDLE_H=14, PADDLE_Y=H-55, PADDLE_SPD=12;
const BALL_R=7;
const ROWS=7, COLS=10, BRICK_W=54, BRICK_H=20, BRICK_GAP=2;
const BRICK_AREA_X=(W-(COLS*BRICK_W+(COLS-1)*BRICK_GAP))/2;
const BRICK_AREA_Y=80;
const BALL_BASE_SPD=5.2;

// Brick types: [hp, col, pts, label]
const BRICK_TYPES=[
  {hp:1, col:'#44ccff', pts:10, label:''},
  {hp:1, col:'#44ff88', pts:15, label:''},
  {hp:2, col:'#ff8833', pts:30, label:''},
  {hp:2, col:'#ff44aa', pts:30, label:''},
  {hp:3, col:'#cc44ff', pts:50, label:''},
  {hp:3, col:'#ff3355', pts:50, label:''},
  {hp:-1,col:'#888', pts:0, label:'⬛'}, // steel (indestructible in level 1-3)
  {hp:1, col:'#ffd700', pts:100, label:'★'},// gold bonus
];

// Power-up types
const PU_TYPES=[
  {type:'wide',   col:'#44ccff', sym:'↔', label:'WIDE PAD'},
  {type:'slow',   col:'#44ff88', sym:'⬇', label:'SLOW BALL'},
  {type:'multi',  col:'#ff8833', sym:'✶', label:'MULTI-BALL'},
  {type:'laser',  col:'#ff44aa', sym:'↑', label:'LASER'},
  {type:'life',   col:'#ff4466', sym:'♥', label:'+LIFE'},
];

// ---------------------------------------------------------------- State
let STATE='TITLE';
let paddle, balls, bricks, powerups, lasers, particles, floats;
let score, best=+(localStorage.getItem('bb_best')||0), lives, level, frame;
let wideT=0, slowT=0, laserAmmo=0;
let tf=0;
let shakeT=0;
let pux=W/2, pwx=PADDLE_W; // paddle x, paddle current width

function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }

function mkBricks(lvl){
  const rows=[], steelOdds=Math.min(0.08+lvl*0.04,0.2);
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const x=BRICK_AREA_X+c*(BRICK_W+BRICK_GAP), y=BRICK_AREA_Y+r*(BRICK_H+BRICK_GAP);
      let t;
      if(Math.random()<0.04) t=7; // gold
      else if(Math.random()<steelOdds&&lvl>=2) t=6; // steel
      else {
        const tier=Math.min(Math.floor(r/2.4+(lvl-1)*0.5),5);
        t=tier;
      }
      const bt=BRICK_TYPES[t];
      rows.push({x,y,w:BRICK_W,h:BRICK_H,hp:bt.hp,maxHp:bt.hp,col:bt.col,pts:bt.pts,label:bt.label,t});
    }
  }
  return rows;
}

function mkBall(spd){
  const angle=-Math.PI/2+(Math.random()-0.5)*0.7;
  return {x:W/2,y:PADDLE_Y-BALL_R-2,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,trail:[]};
}

function startGame(lvl){
  level=lvl||1; score=lvl?score:0; lives=3; frame=0;
  pux=W/2-PADDLE_W/2; pwx=PADDLE_W; wideT=0; slowT=0; laserAmmo=0;
  balls=[mkBall(BALL_BASE_SPD)]; bricks=mkBricks(level); powerups=[]; lasers=[]; particles=[]; floats=[];
}

function nextLevel(){
  level++; frame=0; wideT=0; slowT=0; laserAmmo=0;
  balls=[mkBall(BALL_BASE_SPD+level*0.35)]; bricks=mkBricks(level); powerups=[]; lasers=[];
}

function spawnPu(x,y){
  if(Math.random()>0.25) return;
  const t=PU_TYPES[Math.floor(Math.random()*PU_TYPES.length)];
  powerups.push({x,y,vy:1.6,...t,r:12});
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=2+Math.random()*6; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1.5,col,r:2+Math.random()*3,life:22+Math.random()*14}); }
}

function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:48}); }

// ---------------------------------------------------------------- Ball physics
function ballRect(b,bk){ // collide ball against brick, return true if hit
  const ex=BALL_R, bx=bk.x-ex, by=bk.y-ex, bw=bk.w+ex*2, bh=bk.h+ex*2;
  if(b.x<bx||b.x>bx+bw||b.y<by||b.y>by+bh) return false;
  // Which side?
  const dl=b.x-(bx), dr=(bx+bw)-b.x, dt=b.y-(by), db=(by+bh)-b.y;
  const minD=Math.min(dl,dr,dt,db);
  if(minD===dl||minD===dr) b.vx=-b.vx;
  else b.vy=-b.vy;
  return true;
}

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  if(wideT>0){ wideT--; pwx+=(PADDLE_W*1.7-pwx)*0.07; } else { pwx+=(PADDLE_W-pwx)*0.07; }
  if(slowT>0) slowT--;

  // Paddle movement
  if(keys['ArrowLeft']||keys['KeyA']) pux=Math.max(0,pux-PADDLE_SPD);
  if(keys['ArrowRight']||keys['KeyD']) pux=Math.min(W-pwx,pux+PADDLE_SPD);
  // Mouse: snap directly to cursor
  if(!keys['ArrowLeft']&&!keys['ArrowRight']&&!keys['KeyA']&&!keys['KeyD']) pux=mX-pwx/2;
  pux=Math.max(0,Math.min(W-pwx,pux));

  // Lasers
  if(laserAmmo>0&&keys['Space']&&frame%16===0){
    laserAmmo--; lasers.push({x:pux+pwx*0.3,y:PADDLE_Y-PADDLE_H/2,vy:-12});
    lasers.push({x:pux+pwx*0.7,y:PADDLE_Y-PADDLE_H/2,vy:-12});
  }
  lasers=lasers.filter(l=>{ l.y+=l.vy; if(l.y<0) return false;
    for(let i=bricks.length-1;i>=0;i--){ const bk=bricks[i]; if(l.x>bk.x&&l.x<bk.x+bk.w&&l.y>bk.y&&l.y<bk.y+bk.h){
      if(bk.hp>0){ bk.hp--; spawnPfx(bk.x+bk.w/2,bk.y+bk.h/2,bk.col,5); if(bk.hp<=0){ score+=bk.pts; spawnPu(bk.x+bk.w/2,bk.y+bk.h); addFloat(bk.x+bk.w/2,bk.y,'+'+(bk.pts),bk.col); bricks.splice(i,1); if(score>best){best=score;localStorage.setItem('bb_best',String(best));} } } return false; } } return true; });

  const spd=slowT>0?BALL_BASE_SPD*0.6:BALL_BASE_SPD+level*0.35;

  // Balls
  balls=balls.filter(b=>{
    b.trail.push({x:b.x,y:b.y}); if(b.trail.length>7) b.trail.shift();
    // Enforce speed
    const cs=Math.hypot(b.vx,b.vy); b.vx=b.vx/cs*spd; b.vy=b.vy/cs*spd;
    b.x+=b.vx; b.y+=b.vy;
    // Walls
    if(b.x-BALL_R<0){b.x=BALL_R; b.vx=Math.abs(b.vx);}
    if(b.x+BALL_R>W){b.x=W-BALL_R; b.vx=-Math.abs(b.vx);}
    if(b.y-BALL_R<45){b.y=BALL_R+45; b.vy=Math.abs(b.vy);}
    // Paddle
    if(b.vy>0&&b.y+BALL_R>=PADDLE_Y&&b.y-BALL_R<=PADDLE_Y+PADDLE_H&&b.x>=pux-BALL_R&&b.x<=pux+pwx+BALL_R){
      sfxPaddle(); b.vy=-Math.abs(b.vy);
      const rel=((b.x-(pux+pwx/2))/(pwx/2));
      b.vx=rel*spd*1.1;
    }
    // Bricks
    let hitAny=false;
    for(let i=bricks.length-1;i>=0;i--){
      const bk=bricks[i];
      if(ballRect(b,bk)){
        if(bk.hp<0){ /* steel */ sfxBrick(true); }
        else { bk.hp--; sfxBrick(bk.hp>0); spawnPfx(bk.x+bk.w/2,bk.y+bk.h/2,bk.col,7);
          if(bk.hp<=0){ score+=bk.pts; addFloat(bk.x+bk.w/2,bk.y,'+'+(bk.pts),bk.col); spawnPu(bk.x+bk.w/2,bk.y+bk.h/2); bricks.splice(i,1); if(score>best){best=score;localStorage.setItem('bb_best',String(best));} }
        }
        hitAny=true; break;
      }
    }
    // Lost ball
    if(b.y-BALL_R>H){ shakeT=12; return false; }
    return true;
  });

  // No balls left
  if(balls.length===0){
    sfxLose(); lives--;
    if(lives<=0){ if(score>best){best=score;localStorage.setItem('bb_best',String(best));} STATE='GAMEOVER'; return; }
    balls=[mkBall(spd)];
  }

  // Level clear
  const destroyable=bricks.filter(bk=>bk.hp>0&&bk.t!==6);
  if(destroyable.length===0){ sfxLevelUp(); nextLevel(); }

  // Power-ups
  powerups=powerups.filter(pu=>{ pu.y+=pu.vy;
    if(pu.y+pu.r>PADDLE_Y&&pu.y-pu.r<PADDLE_Y+PADDLE_H&&pu.x>pux&&pu.x<pux+pwx){
      sfxPowerup(); addFloat(pu.x,PADDLE_Y-20,pu.label,pu.col);
      if(pu.type==='wide') wideT=420;
      if(pu.type==='slow') slowT=360;
      if(pu.type==='multi'){ const b2=mkBall(spd); b2.vx*=-1; balls.push(b2); }
      if(pu.type==='laser') laserAmmo+=8;
      if(pu.type==='life') lives=Math.min(5,lives+1);
      return false;
    }
    return pu.y<H+20;
  });

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.14; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.8; return --f.life>0; });
  if(shakeT>0) shakeT--;
}

// ---------------------------------------------------------------- Draw
function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#050510'); g.addColorStop(1,'#0c0c22');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(80,80,255,0.05)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function drawBricks(){
  bricks.forEach(bk=>{
    const frac=bk.hp<0?1:(bk.hp/bk.maxHp);
    const base=bk.col;
    const dmgAlpha=bk.hp<0?1:frac;
    ctx.globalAlpha=0.4+dmgAlpha*0.6;
    // crack pattern for damaged bricks
    ctx.shadowColor=bk.col; ctx.shadowBlur=bk.t===7?14:7;
    const g=ctx.createLinearGradient(bk.x,bk.y,bk.x,bk.y+bk.h);
    g.addColorStop(0,base); g.addColorStop(1,'rgba(0,0,0,0.5)');
    ctx.fillStyle=g; rr(bk.x,bk.y,bk.w,bk.h,3); ctx.fill();
    ctx.shadowBlur=0;
    // Shine
    ctx.fillStyle='rgba(255,255,255,0.18)'; rr(bk.x+2,bk.y+2,bk.w-4,5,2); ctx.fill();
    ctx.globalAlpha=1;
    if(bk.label){ ctx.fillStyle='#fff'; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText(bk.label,bk.x+bk.w/2,bk.y+bk.h/2+4); ctx.textAlign='left'; }
    // HP dots for 2-3hp bricks
    if(bk.hp>1){ for(let i=0;i<bk.hp;i++){ ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(bk.x+4+i*6,bk.y+bk.h-5,2,0,Math.PI*2); ctx.fill(); } }
  });
}

function drawBalls(){
  balls.forEach(b=>{
    // Trail
    b.trail.forEach((pt,i)=>{ ctx.globalAlpha=(i/b.trail.length)*0.4; ctx.fillStyle='#88ddff'; ctx.beginPath(); ctx.arc(pt.x,pt.y,BALL_R*(i/b.trail.length),0,Math.PI*2); ctx.fill(); });
    ctx.globalAlpha=1;
    ctx.shadowColor='#88eeff'; ctx.shadowBlur=16;
    const g=ctx.createRadialGradient(b.x-2,b.y-2,1,b.x,b.y,BALL_R);
    g.addColorStop(0,'#fff'); g.addColorStop(0.4,'#88ddff'); g.addColorStop(1,'#2255aa');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(b.x,b.y,BALL_R,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  });
}

function drawPaddle(){
  const bx=pux, bw=pwx;
  const col=wideT>0?`hsl(${frame*5%360},80%,60%)`:'#44aaff';
  ctx.shadowColor=col; ctx.shadowBlur=16;
  const g=ctx.createLinearGradient(bx,PADDLE_Y,bx,PADDLE_Y+PADDLE_H);
  g.addColorStop(0,col); g.addColorStop(1,'rgba(20,80,160,0.9)');
  ctx.fillStyle=g; rr(bx,PADDLE_Y,bw,PADDLE_H,7); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; rr(bx+4,PADDLE_Y+2,bw-8,5,3); ctx.fill();
  if(laserAmmo>0){
    ctx.shadowColor='#ff44aa'; ctx.shadowBlur=12;
    ctx.strokeStyle='rgba(255,68,170,0.6)'; ctx.lineWidth=2;
    ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(bx+bw*0.3,PADDLE_Y); ctx.lineTo(bx+bw*0.3,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx+bw*0.7,PADDLE_Y); ctx.lineTo(bx+bw*0.7,0); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur=0;
  }
}

function drawLasers(){
  lasers.forEach(l=>{
    ctx.shadowColor='#ff44aa'; ctx.shadowBlur=14;
    ctx.fillStyle='#ff44aa'; rr(l.x-2,l.y-12,4,12,2); ctx.fill();
    ctx.fillStyle='#fff'; rr(l.x-1,l.y-12,2,4,1); ctx.fill();
    ctx.shadowBlur=0;
  });
}

function drawPowerups(){
  powerups.forEach(pu=>{
    ctx.shadowColor=pu.col; ctx.shadowBlur=12;
    ctx.fillStyle=pu.col; ctx.beginPath(); ctx.arc(pu.x,pu.y,pu.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText(pu.sym,pu.x,pu.y+4); ctx.textAlign='left';
    ctx.shadowBlur=0;
  });
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/28); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/16); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawHUD(){
  const hh=50;
  const g=ctx.createLinearGradient(0,0,0,hh); g.addColorStop(0,'#050510'); g.addColorStop(1,'rgba(5,5,16,0.9)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,hh);
  ctx.strokeStyle='rgba(100,100,255,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,hh); ctx.lineTo(W,hh); ctx.stroke();
  // Lives
  ctx.font='16px monospace'; ctx.textAlign='left';
  for(let i=0;i<lives;i++) { ctx.fillStyle='#ff4466'; ctx.fillText('♥',8+i*22,32); }
  // Score
  ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 20px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText(score,W/2,32); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,44);
  // Level + best
  ctx.textAlign='right'; ctx.fillStyle='#44aaff'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('LVL '+level,W-8,22);
  ctx.fillStyle='#ffd700'; ctx.fillText('BEST '+best,W-8,36);
  // Power-up indicators
  ctx.textAlign='left';
  if(wideT>0){ ctx.fillStyle='#44ccff'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('↔ '+Math.ceil(wideT/60)+'s',8,46); }
  if(slowT>0){ ctx.fillStyle='#44ff88'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('⬇ '+Math.ceil(slowT/60)+'s',60,46); }
  if(laserAmmo>0){ ctx.fillStyle='#ff44aa'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('↑×'+laserAmmo,110,46); }
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#050510'); g.addColorStop(1,'#0c0c22');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Animated sample bricks
  const sampleCols=['#44ccff','#ff8833','#cc44ff','#ffd700','#ff3355'];
  for(let r=0;r<3;r++) for(let c=0;c<5;c++){
    const bx=75+c*92,by=60+r*30; const col=sampleCols[(r+c)%5];
    ctx.shadowColor=col; ctx.shadowBlur=10; const g2=ctx.createLinearGradient(bx,by,bx,by+22);
    g2.addColorStop(0,col); g2.addColorStop(1,'rgba(0,0,0,0.6)');
    ctx.fillStyle=g2; rr(bx,by,84,22,4); ctx.fill(); ctx.shadowBlur=0;
  }
  // Ball
  ctx.shadowColor='#88eeff'; ctx.shadowBlur=18;
  ctx.fillStyle='#88ddff'; ctx.beginPath(); ctx.arc(W/2,160+Math.sin(tf*0.06)*12,10,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.textAlign='center';
  ctx.shadowColor='#4466ff'; ctx.shadowBlur=30; ctx.fillStyle='#44aaff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText('BRICK',W/2,238); ctx.shadowBlur=0;
  ctx.shadowColor='#ff8833'; ctx.shadowBlur=22; ctx.fillStyle='#ff8833'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText('BLAST',W/2,296); ctx.shadowBlur=0;
  // Instructions
  const ins=[['←→ / MOUSE','Move Paddle'],['SPACE','Fire Laser (when armed)']];
  ins.forEach(([k,v],i)=>{ ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText(k+' — '+v,W/2,340+i*18); });
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,390); }
  // Play button
  const ph=mX>W/2-100&&mX<W/2+100;
  ctx.fillStyle=ph?'#5599ff':'#44aaff'; rr(W/2-100,415,200,52,10); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,447);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(keys['Space']||keys['Enter']){ startGame(); STATE='GAME'; }
}

let mY=H/2;
canvas.addEventListener('click',e=>{ const r=canvas.getBoundingClientRect(); mY=(e.clientY-r.top)*(H/r.height); });

function drawGameOver(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#050510'); g.addColorStop(1,'#0c0c22');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff3355'; ctx.shadowBlur=20; ctx.fillStyle='#ff3355'; ctx.font='bold 32px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,180); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=14; ctx.fillStyle='#fff'; ctx.font='bold 46px "Press Start 2P",monospace'; ctx.fillText(score,W/2,256); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,272);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,300); }
  else { ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,300); }
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('LEVEL REACHED: '+level,W/2,322);
  const ph=mX>W/2-110&&mX<W/2+110;
  ctx.fillStyle=ph?'#5599ff':'#44aaff'; rr(W/2-110,345,220,50,10); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,377);
  const mh=mX>W/2-90&&mX<W/2+90&&mY>408&&mY<450;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; rr(W/2-90,408,180,42,10); ctx.fill();
  ctx.strokeStyle='#3a3a55'; ctx.lineWidth=1; rr(W/2-90,408,180,42,10); ctx.stroke();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,434);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(clickFrame&&mh) STATE='TITLE';
}

// ---------------------------------------------------------------- Main loop
function loop(){
  const click=clickFrame; clickFrame=false;
  ctx.clearRect(0,0,W,H);

  if(STATE==='TITLE'){ clickFrame=click; drawTitle(); clickFrame=false; }
  else if(STATE==='GAME'){
    const doShake=shakeT>0;
    if(doShake){ ctx.save(); const s=shakeT*1.1; ctx.translate(Math.random()*s-s/2,Math.random()*s-s/2); }
    drawBg(); drawBricks(); drawLasers(); drawBalls(); drawPowerups(); drawFX(); drawPaddle(); drawHUD();
    if(doShake) ctx.restore();
    update();
    if(keys['Escape']){ STATE='TITLE'; }
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
