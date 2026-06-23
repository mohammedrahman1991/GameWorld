'use strict';
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(typeof r==='object'?r[0]:r,w/2,h/2);this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath();};}
// ================================================================
// METEOR SHIELD — Missile Command style: defend 3 cities!
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 700, H = 600;
canvas.width = W; canvas.height = H;

function resize(){
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width = Math.floor(W*s)+'px'; canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
let mX=W/2, mY=H/2, clickFrame=false;
function getPos(e){ const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)}; }
canvas.addEventListener('mousemove',e=>{ const p=getPos(e); mX=p.x; mY=p.y; });
canvas.addEventListener('click',e=>{ const p=getPos(e); mX=p.x; mY=p.y; clickFrame=true; });
canvas.addEventListener('touchend',e=>{ e.preventDefault(); const p=getPos(e.changedTouches[0]); mX=p.x; mY=p.y; clickFrame=true; },{passive:false});

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='sine',vol=0.07,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxLaunch(){ tone(440,0.06,'square',0.05); tone(550,0.05,'square',0.04,0.04); }
function sfxBlast(r){ tone(180,0.25,'sawtooth',0.09+r*0.04); tone(100,0.35,'sawtooth',0.08,0.08); }
function sfxCityHit(){ tone(150,0.3,'sawtooth',0.14); tone(80,0.4,'sawtooth',0.12,0.1); }
function sfxWaveClear(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.09,'triangle',0.11,i*0.09)); }

// ---------------------------------------------------------------- Constants
const GROUND_Y=H-80;
const CITIES=[{x:120,hp:3,maxHp:3},{x:350,hp:3,maxHp:3},{x:580,hp:3,maxHp:3}];
const LAUNCHER={x:W/2,y:GROUND_Y-10};
const EXPL_RADIUS=60, MISSILE_SPD=5;
const STARS=[];
for(let i=0;i<140;i++) STARS.push({x:Math.random()*W,y:Math.random()*(H-100),s:0.5+Math.random()*2,b:Math.random()});

// ---------------------------------------------------------------- State
let STATE='TITLE';
let meteors, missiles, explosions, particles, floats;
let score, best=+(localStorage.getItem('ms_best')||0), wave, frame, waveTimer, waveState, cities;
let tf=0, shakeT=0;

function resetCities(){ return [{x:120,hp:3,maxHp:3},{x:350,hp:3,maxHp:3},{x:580,hp:3,maxHp:3}]; }

function startGame(){
  meteors=[]; missiles=[]; explosions=[]; particles=[]; floats=[];
  score=0; wave=0; frame=0; waveState='between'; waveTimer=80;
  cities=resetCities(); shakeT=0;
}

function spawnMeteors(){
  wave++;
  const count=4+wave*2;
  for(let i=0;i<count;i++){
    const target=cities[Math.floor(Math.random()*cities.length)];
    const sx=50+Math.random()*(W-100), sy=-20-i*30;
    const tx=target.x+(Math.random()-0.5)*30, ty=GROUND_Y-24;
    const dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy);
    const spd=1.2+wave*0.15+Math.random()*0.4;
    meteors.push({x:sx,y:sy,vx:dx/d*spd,vy:dy/d*spd,r:6+Math.floor(Math.random()*6),tx,ty,hp:wave>4?2:1,maxHp:wave>4?2:1,trail:[]});
  }
  waveState='fighting';
}

function launchMissile(tx,ty){
  sfxLaunch();
  const dx=tx-LAUNCHER.x,dy=ty-LAUNCHER.y,d=Math.hypot(dx,dy)||1;
  missiles.push({x:LAUNCHER.x,y:LAUNCHER.y,vx:dx/d*MISSILE_SPD,vy:dy/d*MISSILE_SPD,tx,ty,trail:[]});
}

function spawnPfx(x,y,col,n,spd){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=(spd||4)+Math.random()*6; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:2+Math.random()*4,life:16+Math.random()*14}); }
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:52}); }

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  if(shakeT>0) shakeT--;
  if(waveTimer>0) waveTimer--;

  if(waveState==='between'){ if(waveTimer<=0) spawnMeteors(); return; }

  // Launch missile on click
  if(clickFrame && mY<GROUND_Y-10) launchMissile(mX,mY);

  // Missiles
  missiles=missiles.filter(m=>{
    m.trail.push({x:m.x,y:m.y}); if(m.trail.length>10) m.trail.shift();
    m.x+=m.vx; m.y+=m.vy;
    if(Math.hypot(m.x-m.tx,m.y-m.ty)<8||m.y<0){
      explosions.push({x:m.x,y:m.y,r:0,maxR:EXPL_RADIUS,growing:true,life:40}); sfxBlast(1); spawnPfx(m.x,m.y,'#ff8833',14,8);
      return false;
    }
    return true;
  });

  // Explosions grow and destroy meteors
  explosions=explosions.filter(ex=>{
    if(ex.growing){ ex.r+=EXPL_RADIUS/10; if(ex.r>=ex.maxR) ex.growing=false; }
    else ex.r-=EXPL_RADIUS/20;
    // Destroy meteors in radius
    for(let i=meteors.length-1;i>=0;i--){
      const m=meteors[i];
      if(Math.hypot(m.x-ex.x,m.y-ex.y)<ex.r+m.r&&ex.growing){
        m.hp--;
        if(m.hp<=0){ spawnPfx(m.x,m.y,'#ff8833',12); addFloat(m.x,m.y-10,'+'+( (10+wave*5)),'#ffd700'); score+=10+wave*5; if(score>best){best=score;localStorage.setItem('ms_best',String(best));} meteors.splice(i,1); }
      }
    }
    return ex.r>0&&--ex.life>0;
  });

  // Meteors
  meteors=meteors.filter(m=>{
    m.trail.push({x:m.x,y:m.y}); if(m.trail.length>8) m.trail.shift();
    m.x+=m.vx; m.y+=m.vy;
    if(m.y>=GROUND_Y-m.r){
      // Hit nearest city
      sfxCityHit(); shakeT=12; spawnPfx(m.x,GROUND_Y,'#ff3344',20,7);
      let nearest=null,nearD=Infinity;
      cities.forEach(c=>{ const d=Math.abs(c.x-m.x); if(d<nearD){ nearD=d; nearest=c; } });
      if(nearest&&nearD<80){ nearest.hp--; addFloat(nearest.x,GROUND_Y-40,'HIT!','#ff3344'); if(nearest.hp<=0){ nearest.hp=0; addFloat(nearest.x,GROUND_Y-50,'DESTROYED','#ff3344'); } }
      return false;
    }
    return true;
  });

  if(cities.every(c=>c.hp<=0)){ if(score>best){best=score;localStorage.setItem('ms_best',String(best));} STATE='GAMEOVER'; }
  if(meteors.length===0&&waveState==='fighting'){ sfxWaveClear(); waveState='between'; waveTimer=100; addFloat(W/2,H/2-40,'WAVE '+wave+' CLEAR!','#44ff88'); score+=50*wave; }

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.8; return --f.life>0; });
}

// ---------------------------------------------------------------- Draw
function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#010108'); g.addColorStop(1,'#050520');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  STARS.forEach(s=>{ ctx.globalAlpha=0.25+s.b*0.6; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  // Ground
  const gg=ctx.createLinearGradient(0,GROUND_Y,0,H); gg.addColorStop(0,'#1a3a1a'); gg.addColorStop(1,'#0a1e0a');
  ctx.fillStyle=gg; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
  ctx.strokeStyle='rgba(80,200,80,0.3)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(W,GROUND_Y); ctx.stroke();
}

function drawCities(){
  cities.forEach(c=>{
    const alive=c.hp>0;
    ctx.globalAlpha=alive?1:0.25;
    // Building silhouette
    const bw=44,bh=40;
    ctx.fillStyle=alive?'#226622':'#442222';
    ctx.fillRect(c.x-bw/2,GROUND_Y-bh,bw,bh);
    ctx.fillRect(c.x-bw/2+6,GROUND_Y-bh-16,12,16);
    ctx.fillRect(c.x+bw/2-18,GROUND_Y-bh-22,12,22);
    // Windows
    if(alive){ ctx.fillStyle='#88ff88'; [[0,10],[0,24],[16,10],[16,24]].forEach(([wx,wy])=>{ ctx.fillRect(c.x-bw/2+4+wx,GROUND_Y-bh+wy,5,6); }); }
    // HP dots
    ctx.globalAlpha=1;
    for(let i=0;i<c.maxHp;i++){ ctx.fillStyle=i<c.hp?'#44ff44':'#333'; ctx.beginPath(); ctx.arc(c.x-8+i*9,GROUND_Y+14,4,0,Math.PI*2); ctx.fill(); }
  });
  ctx.globalAlpha=1;
  // Launcher
  ctx.fillStyle='#3399ff'; ctx.fillRect(LAUNCHER.x-10,GROUND_Y-24,20,24); ctx.fillStyle='#1166cc'; ctx.fillRect(LAUNCHER.x-4,GROUND_Y-36,8,16);
}

function drawMeteors(){
  meteors.forEach(m=>{
    // Trail
    m.trail.forEach((pt,i)=>{ ctx.globalAlpha=(i/m.trail.length)*0.5; ctx.fillStyle='#ff6622'; ctx.beginPath(); ctx.arc(pt.x,pt.y,m.r*(i/m.trail.length),0,Math.PI*2); ctx.fill(); });
    ctx.globalAlpha=1;
    ctx.shadowColor='#ff6622'; ctx.shadowBlur=14;
    const g=ctx.createRadialGradient(m.x-m.r*0.3,m.y-m.r*0.3,1,m.x,m.y,m.r);
    g.addColorStop(0,'#ffcc88'); g.addColorStop(0.5,'#ff6622'); g.addColorStop(1,'#882211');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2); ctx.fill();
    if(m.maxHp>1){ ctx.fillStyle='#fff'; ctx.font='7px monospace'; ctx.textAlign='center'; ctx.fillText(m.hp,m.x,m.y+3); ctx.textAlign='left'; }
    ctx.shadowBlur=0;
  });
}

function drawMissiles(){
  missiles.forEach(m=>{
    m.trail.forEach((pt,i)=>{ ctx.globalAlpha=(i/m.trail.length)*0.6; ctx.strokeStyle='rgba(100,200,255,0.8)'; ctx.lineWidth=2; if(i>0){ ctx.beginPath(); ctx.moveTo(m.trail[i-1].x,m.trail[i-1].y); ctx.lineTo(pt.x,pt.y); ctx.stroke(); } });
    ctx.globalAlpha=1;
    ctx.shadowColor='#44aaff'; ctx.shadowBlur=12; ctx.fillStyle='#88ddff'; ctx.beginPath(); ctx.arc(m.x,m.y,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  });
}

function drawExplosions(){
  explosions.forEach(ex=>{
    const a=Math.min(1,ex.life/20)*0.6;
    ctx.globalAlpha=a;
    const g=ctx.createRadialGradient(ex.x,ex.y,0,ex.x,ex.y,ex.r);
    g.addColorStop(0,'rgba(255,255,200,0.9)'); g.addColorStop(0.4,'rgba(255,140,0,0.7)'); g.addColorStop(1,'rgba(255,50,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ex.x,ex.y,ex.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=a*0.8; ctx.strokeStyle='rgba(255,200,50,0.9)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(ex.x,ex.y,ex.r,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=1;
  });
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/24); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/14); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
  // Crosshair
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(mX-10,mY); ctx.lineTo(mX+10,mY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mX,mY-10); ctx.lineTo(mX,mY+10); ctx.stroke();
  ctx.beginPath(); ctx.arc(mX,mY,6,0,Math.PI*2); ctx.stroke();
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,48);
  ctx.strokeStyle='rgba(100,200,100,0.15)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,48); ctx.lineTo(W,48); ctx.stroke();
  ctx.textAlign='center'; ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.fillText(score,W/2,32); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,44);
  ctx.textAlign='right'; ctx.fillStyle='#44ff88'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('WAVE '+wave,W-10,22);
  ctx.fillStyle='#ffd700'; ctx.fillText('BEST '+best,W-10,36);
  ctx.textAlign='left';
  if(waveState==='between'&&waveTimer>0){ ctx.textAlign='center'; ctx.fillStyle='#44ff88'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('WAVE '+(wave+1)+' INCOMING!',W/2,H-95); ctx.textAlign='left'; }
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  drawBg();
  // Animated meteors
  [[150,200],[350,120],[550,160]].forEach(([mx,my],i)=>{
    const oy=(tf*1.8+i*80)%250;
    ctx.save(); ctx.translate(mx,my+oy); ctx.shadowColor='#ff6622'; ctx.shadowBlur=12;
    const g=ctx.createRadialGradient(-4,-4,2,0,0,16); g.addColorStop(0,'#ffcc88'); g.addColorStop(1,'#882211');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.restore();
  });
  ctx.textAlign='center';
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=28; ctx.fillStyle='#44aaff'; ctx.font='bold 42px "Press Start 2P",monospace'; ctx.fillText('METEOR',W/2,210); ctx.shadowBlur=0;
  ctx.shadowColor='#44ff88'; ctx.shadowBlur=22; ctx.fillStyle='#44ff88'; ctx.font='bold 42px "Press Start 2P",monospace'; ctx.fillText('SHIELD',W/2,268); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('CLICK TO LAUNCH MISSILES — PROTECT THE CITIES!',W/2,296);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,320); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY>348&&mY<402;
  ctx.fillStyle=ph?'#55ff99':'#44cc77'; ctx.beginPath(); ctx.roundRect(W/2-110,348,220,54,10); ctx.fill();
  ctx.fillStyle='#020210'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,384);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
}

function drawGameOver(){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff3344'; ctx.shadowBlur=20; ctx.fillStyle='#ff3344'; ctx.font='bold 28px "Press Start 2P",monospace'; ctx.fillText('CITIES DESTROYED',W/2,175); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText(score,W/2,252); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE · WAVE '+wave,W/2,270);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,298); }
  else{ ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,298); }
  const ph=mX>W/2-115&&mX<W/2+115&&mY>326&&mY<380;
  ctx.fillStyle=ph?'#55ff99':'#44cc77'; ctx.beginPath(); ctx.roundRect(W/2-115,326,230,54,10); ctx.fill();
  ctx.fillStyle='#020210'; ctx.font='bold 11px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,360);
  const mh=mX>W/2-90&&mX<W/2+90&&mY>394&&mY<436;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; ctx.beginPath(); ctx.roundRect(W/2-90,394,180,42,8); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,420);
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
    drawBg(); drawCities(); drawExplosions(); drawMeteors(); drawMissiles(); drawFX(); drawHUD();
    if(doShake) ctx.restore();
    clickFrame=click; update(); clickFrame=false;
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
