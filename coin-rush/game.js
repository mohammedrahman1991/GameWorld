'use strict';
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(typeof r==='object'?r[0]:r,w/2,h/2);this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath();};}
// ================================================================
// COIN RUSH — 3-lane auto-runner: switch lanes, collect coins!
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 700, H = 500;
canvas.width = W; canvas.height = H;

function resize(){
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width = Math.floor(W*s)+'px'; canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
const keys={};
let clickFrame=false, mX=W/2, mY=H/2;
let swipeStartX=null;
window.addEventListener('keydown',e=>{ keys[e.code]=true; if(['ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup',e=>{ keys[e.code]=false; });
canvas.addEventListener('click',e=>{ const r=canvas.getBoundingClientRect(); mX=(e.clientX-r.left)*(W/r.width); mY=(e.clientY-r.top)*(H/r.height); clickFrame=true; });
canvas.addEventListener('touchstart',e=>{ swipeStartX=e.touches[0].clientX; },{passive:true});
canvas.addEventListener('touchend',e=>{
  if(swipeStartX!==null){ const dx=e.changedTouches[0].clientX-swipeStartX;
    if(dx>30) keys['ArrowRight']=true;
    else if(dx<-30) keys['ArrowLeft']=true;
    setTimeout(()=>{ keys['ArrowRight']=false; keys['ArrowLeft']=false; },80);
    swipeStartX=null; }
},{passive:true});

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='sine',vol=0.07,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxCoin(v){ tone(440+v*110,0.05,'triangle',0.08); tone(660+v*110,0.04,'triangle',0.06,0.04); }
function sfxHit(){ tone(180,0.25,'sawtooth',0.13); tone(100,0.35,'sawtooth',0.11,0.1); }
function sfxShield(){ tone(550,0.08,'triangle',0.08); }
function sfxMagnet(){ [440,550,660].forEach((f,i)=>tone(f,0.06,'triangle',0.08,i*0.06)); }

// ---------------------------------------------------------------- Layout
const LANES=[170,350,530]; // x positions of 3 lanes
const PLAYER_Y=H-110, PLAYER_W=36, PLAYER_H=48;
const GROUND_Y=H-75;
const SEGMENT_LEN=180;

// ---------------------------------------------------------------- State
let STATE='TITLE';
let playerLane, targetLane, playerX, laneT;
let obstacles, coins, powerups, particles, floats;
let score, best=+(localStorage.getItem('cr_best')||0), lives, frame, speed, dist;
let magnetT=0, shieldT=0, shakeT=0;
let prevLeft=false, prevRight=false;
let tf=0;

function startGame(){
  playerLane=1; targetLane=1; playerX=LANES[1]; laneT=0;
  obstacles=[]; coins=[]; powerups=[]; particles=[]; floats=[];
  score=0; lives=5; frame=0; speed=3; dist=0; magnetT=0; shieldT=0; shakeT=0;
}

function spawnSegment(baseX){
  // Random lane obstacle pattern
  const patterns=[
    [0,0,1,0], [1,0,0,0], [0,1,0,0], [0,0,0,1],
    [0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0], // mostly empty
  ];
  const pat=patterns[Math.floor(Math.random()*patterns.length)];
  [0,1,2].forEach(l=>{ if(Math.random()<0.08+pat[l]*0.4) obstacles.push({x:LANES[l],y:-40-baseX,w:40,h:44,type:'box',lane:l}); });
  // Coins
  const coinLane=Math.floor(Math.random()*3);
  for(let i=0;i<3;i++) coins.push({x:LANES[coinLane],y:-20-baseX-i*26,r:10,val:1,collected:false});
  // Occasionally gold coin in random lane
  if(Math.random()<0.18) coins.push({x:LANES[Math.floor(Math.random()*3)],y:-60-baseX,r:13,val:3,collected:false,gold:true});
  // Powerup (rare)
  if(Math.random()<0.1){ const t=Math.random()<0.5?'magnet':'shield'; powerups.push({x:LANES[Math.floor(Math.random()*3)],y:-50-baseX,r:13,type:t,collected:false}); }
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=2+Math.random()*5; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:2+Math.random()*3,life:16+Math.random()*12}); }
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:46}); }

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  speed=Math.min(10,3+frame/700);
  dist+=speed;
  if(shakeT>0) shakeT--;
  if(magnetT>0) magnetT--;
  if(shieldT>0) shieldT--;

  // Lane switch (debounced)
  const left=keys['ArrowLeft']||keys['KeyA'];
  const right=keys['ArrowRight']||keys['KeyD'];
  if(left&&!prevLeft&&targetLane>0) targetLane--;
  if(right&&!prevRight&&targetLane<2) targetLane++;
  prevLeft=left; prevRight=right;

  // Smooth lane slide
  playerX+=(LANES[targetLane]-playerX)*0.22;
  playerLane=targetLane;

  // Scroll everything
  obstacles.forEach(o=>o.y+=speed);
  coins.forEach(c=>c.y+=speed);
  powerups.forEach(p=>p.y+=speed);

  // Spawn new segment
  if(frame%Math.floor(SEGMENT_LEN/speed)===0) spawnSegment(0);

  // Obstacle collision
  obstacles=obstacles.filter(o=>{
    if(o.y>H+50) return false;
    if(!o.collected&&Math.abs(playerX-o.x)<PLAYER_W*0.85&&o.y>PLAYER_Y-PLAYER_H&&o.y<PLAYER_Y+8){
      if(shieldT>0){ shieldT=0; sfxShield(); addFloat(playerX,PLAYER_Y-20,'SHIELD!','#44aaff'); spawnPfx(playerX,PLAYER_Y,'#44aaff',10); o.collected=true; shakeT=6; return false; }
      sfxHit(); lives--; shakeT=14; addFloat(playerX,PLAYER_Y-20,'OUCH!','#ff4444'); spawnPfx(playerX,PLAYER_Y,'#ff4444',12);
      if(lives<=0){ if(score>best){best=score;localStorage.setItem('cr_best',String(score));} STATE='GAMEOVER'; }
      o.collected=true; return false;
    }
    return true;
  });

  // Coin collection
  coins=coins.filter(c=>{
    if(c.collected) return false;
    if(c.y>H+20) return false;
    const attracted=magnetT>0&&Math.abs(c.x-playerX)<200;
    if(attracted){ c.x+=(playerX-c.x)*0.12; c.y+=(PLAYER_Y-c.y)*0.10; }
    if(Math.hypot(c.x-playerX,c.y-PLAYER_Y)<PLAYER_W+c.r){
      c.collected=true; sfxCoin(c.val); score+=c.val; if(score>best){best=score;localStorage.setItem('cr_best',String(score));} spawnPfx(c.x,c.y,c.gold?'#ffd700':'#ffcc44',6); addFloat(c.x,c.y,'+'+c.val,c.gold?'#ffd700':'#ffcc44'); return false;
    }
    return true;
  });

  // Power-up collection
  powerups=powerups.filter(p=>{
    if(p.y>H+20||p.collected) return false;
    if(Math.hypot(p.x-playerX,p.y-PLAYER_Y)<PLAYER_W+p.r){
      p.collected=true; if(p.type==='magnet'){ magnetT=300; sfxMagnet(); addFloat(playerX,PLAYER_Y-20,'MAGNET!','#ff8833'); }
      else{ shieldT=300; sfxShield(); addFloat(playerX,PLAYER_Y-20,'SHIELD!','#44aaff'); }
      return false;
    }
    return true;
  });

  // Score = distance
  score=Math.max(score,Math.floor(dist/60));

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.14; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.9; return --f.life>0; });
}

// ---------------------------------------------------------------- Draw
const BG_LINES=Array.from({length:20},(_,i)=>({x:50+i*34,speed:0.2+Math.random()*0.5,y:Math.random()*H}));

function drawBg(){
  // Road
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0d0d22'); g.addColorStop(1,'#181830');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Streaking lines (speed feel)
  BG_LINES.forEach(l=>{ l.y=(l.y+speed*l.speed)%H; ctx.globalAlpha=0.08+l.speed*0.1; ctx.strokeStyle='#6666ff'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(l.x,l.y); ctx.lineTo(l.x,l.y-40); ctx.stroke(); });
  ctx.globalAlpha=1;
  // Lane dividers
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=2; ctx.setLineDash([20,18]);
  const lineDashOff=(frame*speed*0.5)%38;
  ctx.lineDashOffset=-lineDashOff;
  [261,440].forEach(lx=>{ ctx.beginPath(); ctx.moveTo(lx,0); ctx.lineTo(lx,H); ctx.stroke(); });
  ctx.setLineDash([]);
  // Ground
  const grd=ctx.createLinearGradient(0,GROUND_Y,0,H); grd.addColorStop(0,'#223355'); grd.addColorStop(1,'#111a2a');
  ctx.fillStyle=grd; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
  ctx.strokeStyle='rgba(100,180,255,0.3)'; ctx.lineWidth=1.5; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(W,GROUND_Y); ctx.stroke();
}

function drawPlayer(){
  const px=playerX, py=PLAYER_Y;
  // Shadow
  ctx.globalAlpha=0.2; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(px,GROUND_Y+5,18,6,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  // Shield ring
  if(shieldT>0){ ctx.shadowColor='#44aaff'; ctx.shadowBlur=16; ctx.strokeStyle=`rgba(68,170,255,${0.4+Math.sin(frame*0.2)*0.3})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(px,py,28,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0; }
  // Magnet aura
  if(magnetT>0){ ctx.strokeStyle=`rgba(255,140,0,${0.2+Math.sin(frame*0.15)*0.15})`; ctx.lineWidth=20; ctx.beginPath(); ctx.arc(px,py,60,0,Math.PI*2); ctx.stroke(); }
  // Runner body
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=14;
  ctx.fillStyle='#2266cc'; ctx.beginPath(); ctx.roundRect(px-PLAYER_W/2,py-PLAYER_H+8,PLAYER_W,PLAYER_H-8,8); ctx.fill();
  // Head
  ctx.fillStyle='#ffcc99'; ctx.beginPath(); ctx.arc(px,py-PLAYER_H+4,14,0,Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(px-5,py-PLAYER_H+3,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(px+5,py-PLAYER_H+3,3,0,Math.PI*2); ctx.fill();
  // Legs (animated)
  const leg=Math.sin(frame*0.25)*8;
  ctx.strokeStyle='#1a55aa'; ctx.lineWidth=8; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(px-8,py); ctx.lineTo(px-8,py+14+leg); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px+8,py); ctx.lineTo(px+8,py+14-leg); ctx.stroke();
  ctx.shadowBlur=0;
}

function drawObstacles(){
  obstacles.forEach(o=>{
    if(o.collected||o.y<-50) return;
    ctx.shadowColor='#ff4444'; ctx.shadowBlur=10;
    const g=ctx.createLinearGradient(o.x-o.w/2,o.y-o.h,o.x+o.w/2,o.y);
    g.addColorStop(0,'#ff6655'); g.addColorStop(1,'#881122');
    ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(o.x-o.w/2,o.y-o.h,o.w,o.h,6); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.roundRect(o.x-o.w/2+4,o.y-o.h+4,o.w-8,8,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='bold 18px monospace'; ctx.textAlign='center'; ctx.fillText('⚠',o.x,o.y-o.h/2+6); ctx.textAlign='left';
    ctx.shadowBlur=0;
  });
}

function drawCoins(){
  coins.forEach(c=>{
    if(c.collected) return;
    const col=c.gold?'#ffd700':'#ffcc44';
    ctx.shadowColor=col; ctx.shadowBlur=12;
    const g=ctx.createRadialGradient(c.x-2,c.y-2,1,c.x,c.y,c.r);
    g.addColorStop(0,'#fff'); g.addColorStop(0.4,col); g.addColorStop(1,'#aa7700');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  });
}

function drawPowerups(){
  powerups.forEach(p=>{
    if(p.collected) return;
    const col=p.type==='magnet'?'#ff8833':'#44aaff';
    ctx.shadowColor=col; ctx.shadowBlur=14; ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 12px monospace'; ctx.textAlign='center'; ctx.fillText(p.type==='magnet'?'🧲':'🛡',p.x,p.y+4); ctx.textAlign='left';
    ctx.shadowBlur=0;
  });
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/22); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/14); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,50);
  ctx.strokeStyle='rgba(100,180,255,0.15)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,50); ctx.lineTo(W,50); ctx.stroke();
  ctx.font='16px monospace'; ctx.textAlign='left';
  for(let i=0;i<3;i++) ctx.fillText(i<lives?'❤️':'🖤',10+i*26,32);
  ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText(score,W/2,32); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('COINS',W/2,44);
  ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-10,24);
  const spStr=speed.toFixed(1)+'x';
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('SPD '+spStr,W-10,40);
  ctx.textAlign='left';
  if(magnetT>0){ ctx.fillStyle='#ff8833'; ctx.font='7px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText('🧲 '+Math.ceil(magnetT/60)+'s',W/2-60,46); }
  if(shieldT>0){ ctx.fillStyle='#44aaff'; ctx.font='7px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText('🛡 '+Math.ceil(shieldT/60)+'s',W/2+40,46); }
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  drawBg();
  ctx.textAlign='center';
  ctx.shadowColor='#ffd700'; ctx.shadowBlur=30; ctx.fillStyle='#ffd700'; ctx.font='bold 48px "Press Start 2P",monospace'; ctx.fillText('COIN',W/2,200); ctx.shadowBlur=0;
  ctx.shadowColor='#ff8833'; ctx.shadowBlur=24; ctx.fillStyle='#ff8833'; ctx.font='bold 48px "Press Start 2P",monospace'; ctx.fillText('RUSH',W/2,264); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('SWITCH LANES — COLLECT COINS — DODGE BOXES',W/2,292);
  ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('← → ARROWS or SWIPE to change lane',W/2,312);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,338); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY>360&&mY<416;
  ctx.fillStyle=ph?'#ffe033':'#ffd700'; ctx.beginPath(); ctx.roundRect(W/2-110,360,220,56,10); ctx.fill();
  ctx.fillStyle='#030310'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,398);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(keys['Space']||keys['Enter']){ startGame(); STATE='GAME'; }
}

function drawGameOver(){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff4444'; ctx.shadowBlur=20; ctx.fillStyle='#ff4444'; ctx.font='bold 30px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,175); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText(score,W/2,252); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('COINS',W/2,268);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,296); }
  else{ ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,296); }
  const ph=mX>W/2-115&&mX<W/2+115&&mY>324&&mY<378;
  ctx.fillStyle=ph?'#ffe033':'#ffd700'; ctx.beginPath(); ctx.roundRect(W/2-115,324,230,54,10); ctx.fill();
  ctx.fillStyle='#030310'; ctx.font='bold 11px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,358);
  const mh=mX>W/2-90&&mX<W/2+90&&mY>392&&mY<434;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; ctx.beginPath(); ctx.roundRect(W/2-90,392,180,42,8); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,418);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(clickFrame&&mh) STATE='TITLE';
}

function loop(){
  const click=clickFrame; clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){ clickFrame=click; drawTitle(); clickFrame=false; }
  else if(STATE==='GAME'){
    const doShake=shakeT>0;
    if(doShake){ ctx.save(); const s=shakeT; ctx.translate(Math.random()*s-s/2,Math.random()*s-s/2); }
    drawBg(); drawObstacles(); drawCoins(); drawPowerups(); drawFX(); drawPlayer(); drawHUD();
    if(doShake) ctx.restore();
    update();
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
