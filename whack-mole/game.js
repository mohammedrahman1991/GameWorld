'use strict';
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(typeof r==='object'?r[0]:r,w/2,h/2);this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath();};}
// ================================================================
// WHACK-A-MOLE — 3×3 grid, 60 seconds, whack for points!
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 600, H = 660;
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
function tone(f,d,type='sine',vol=0.08,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxWhack(pts){ tone(300+pts*30,0.06,'square',0.09); tone(200,0.04,'sine',0.06,0.04); }
function sfxBomb(){ tone(120,0.3,'sawtooth',0.13); tone(80,0.4,'sawtooth',0.11,0.1); }
function sfxGolden(){ [660,880,1100].forEach((f,i)=>tone(f,0.07,'triangle',0.1,i*0.06)); }
function sfxMiss(){ tone(220,0.08,'sine',0.05); }

// ---------------------------------------------------------------- Grid layout
const COLS=3, ROWS=3, HOLES=9;
const HOLE_R=52, MOLE_R=44;
const GRID_X=W/2-150, GRID_Y=130, CELL_W=150, CELL_H=150;

function holePos(i){ return {x:GRID_X+(i%COLS)*CELL_W+CELL_W/2, y:GRID_Y+Math.floor(i/COLS)*CELL_H+CELL_H/2+20}; }

const MOLE_TYPES=[
  {type:'normal', col:'#aa7744', hat:'#334488', pts:10, weight:60},
  {type:'speedy', col:'#44aa88', hat:'#884400', pts:15, weight:25},
  {type:'golden', col:'#ffd700', hat:'#ffaa00', pts:50, weight:10},
  {type:'bomb',   col:'#333',    hat:'#ff3344', pts:-20,weight:5},
];

// ---------------------------------------------------------------- State
let STATE='TITLE';
let holes, particles, floats;
let score, best=+(localStorage.getItem('wm_best')||0), timeLeft, frame, combo, comboT;
let tf=0, shakeT=0;

function pickType(){
  const total=MOLE_TYPES.reduce((s,t)=>s+t.weight,0);
  let r=Math.random()*total; for(const t of MOLE_TYPES){ r-=t.weight; if(r<=0) return t; } return MOLE_TYPES[0];
}

function startGame(){
  holes=Array.from({length:HOLES},(_,i)=>({i,mole:null,popT:0}));
  particles=[]; floats=[];
  score=0; timeLeft=60; frame=0; combo=0; comboT=0; shakeT=0;
}

function spawnMole(){
  const empty=holes.filter(h=>!h.mole);
  if(empty.length===0) return;
  const h=empty[Math.floor(Math.random()*empty.length)];
  const t=pickType();
  const visible=Math.floor(Math.random()*(t.type==='speedy'?50:80)+40);
  h.mole={...t,up:0,maxUp:visible,whacked:false,wackT:0};
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=3+Math.random()*6; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:2+Math.random()*4,life:18+Math.random()*14}); }
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:52}); }

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  if(timeLeft<=0){ if(score>best){best=score;localStorage.setItem('wm_best',String(best));} STATE='GAMEOVER'; return; }
  timeLeft-=1/60;
  if(comboT>0) comboT--; else combo=0;
  if(shakeT>0) shakeT--;

  // Spawn interval gets shorter over time
  const interval=Math.max(22,48-Math.floor((60-timeLeft)/8)*4);
  if(frame%interval===0) spawnMole();

  // Click detection
  if(clickFrame){
    let hit=false;
    holes.forEach(h=>{
      if(!h.mole||h.mole.whacked) return;
      const showFrac=h.mole.up/h.mole.maxUp;
      if(showFrac<0.18) return; // too low to hit
      const {x,y}=holePos(h.i);
      const offsetY=MOLE_R*(1-Math.min(1,showFrac*2));
      const mx=x,my=y-MOLE_R*0.5+offsetY;
      if(Math.hypot(mX-mx,mY-my)<MOLE_R+8&&!hit){
        hit=true; h.mole.whacked=true; h.mole.wackT=14;
        if(h.mole.type==='bomb'){ sfxBomb(); shakeT=12; spawnPfx(mx,my,'#ff3344',14); score=Math.max(0,score+h.mole.pts); addFloat(mx,my,'OUCH! '+h.mole.pts,'#ff4444'); }
        else if(h.mole.type==='golden'){ sfxGolden(); combo++; comboT=30; const g=h.mole.pts*(combo>=3?2:1); score+=g; spawnPfx(mx,my,'#ffd700',18); addFloat(mx,my-10,'+'+g+(combo>=3?' ×2':''),'#ffd700'); }
        else { sfxWhack(h.mole.pts); combo++; comboT=22; const mul=combo>=4?3:combo>=2?2:1; const g=h.mole.pts*mul; score+=g; spawnPfx(mx,my,h.mole.col,10); addFloat(mx,my,'+'+g,'#fff'); }
      }
    });
    if(!hit) sfxMiss();
  }

  // Update moles
  holes.forEach(h=>{
    if(!h.mole) return;
    if(h.mole.whacked){ h.mole.wackT--; h.mole.up=Math.max(0,h.mole.up-3); if(h.mole.up<=0) h.mole=null; return; }
    h.mole.up++;
    if(h.mole.up>=h.mole.maxUp){ h.mole.up=Math.max(0,h.mole.up-1); if(h.mole.up<=0) h.mole=null; }
  });

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.9; return --f.life>0; });
}

// ---------------------------------------------------------------- Draw
function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#1a2800'); g.addColorStop(1,'#0a1800');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Grass strips
  ctx.fillStyle='rgba(80,160,40,0.12)'; ctx.fillRect(0,100,W,H-100);
  for(let x=0;x<W;x+=30){ const h=8+Math.sin(x*0.2)*4; ctx.fillStyle='rgba(60,140,30,0.15)'; ctx.fillRect(x,H-h,14,h); }
}

function drawHoles(){
  holes.forEach(h=>{
    const {x,y}=holePos(h.i);
    // Dirt mound
    ctx.fillStyle='#5a3a1a'; ctx.beginPath(); ctx.ellipse(x,y+16,HOLE_R+8,20,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,200,100,0.08)'; ctx.beginPath(); ctx.ellipse(x,y+14,HOLE_R+4,16,0,0,Math.PI*2); ctx.fill();
    // Hole
    ctx.fillStyle='#1a0a00'; ctx.beginPath(); ctx.ellipse(x,y+8,HOLE_R,20,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#3a1a00'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x,y+8,HOLE_R,20,0,0,Math.PI*2); ctx.stroke();
    // Mole
    if(h.mole){
      const showFrac=Math.min(1,h.mole.up/30);
      const riseY=MOLE_R*(1.5-showFrac*1.5);
      ctx.save(); ctx.beginPath(); ctx.ellipse(x,y+8,HOLE_R-2,19,0,0,Math.PI*2); ctx.clip();
      drawMole(x,y-riseY+8,h.mole,showFrac);
      ctx.restore();
    }
  });
}

function drawMole(x,y,m,showFrac){
  if(showFrac<0.05) return;
  const col=m.col, wacked=m.whacked;
  ctx.save(); ctx.translate(x,y);
  if(wacked&&m.wackT>0) ctx.rotate((Math.random()-0.5)*0.3);
  ctx.globalAlpha=Math.min(1,showFrac*2);
  // Body
  ctx.shadowColor=col; ctx.shadowBlur=8;
  ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(0,10,MOLE_R-4,MOLE_R,0,0,Math.PI*2); ctx.fill();
  // Face
  ctx.fillStyle='#ffcc99'; ctx.beginPath(); ctx.ellipse(0,-MOLE_R*0.2,MOLE_R*0.65,MOLE_R*0.65,0,0,Math.PI*2); ctx.fill();
  // Eyes
  if(wacked){ ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-12,-MOLE_R*0.3); ctx.lineTo(-6,-MOLE_R*0.1); ctx.stroke(); ctx.beginPath(); ctx.moveTo(12,-MOLE_R*0.3); ctx.lineTo(6,-MOLE_R*0.1); ctx.stroke(); }
  else { ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-10,-MOLE_R*0.25,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10,-MOLE_R*0.25,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-8,-MOLE_R*0.3,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(12,-MOLE_R*0.3,1.5,0,Math.PI*2); ctx.fill(); }
  // Nose
  ctx.fillStyle='#ff8899'; ctx.beginPath(); ctx.ellipse(0,-MOLE_R*0.05,5,3,0,0,Math.PI*2); ctx.fill();
  // Hat
  ctx.fillStyle=m.hat;
  if(m.type==='bomb'){ ctx.beginPath(); ctx.arc(0,-MOLE_R*0.7,16,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#ff3344'; ctx.font='16px serif'; ctx.textAlign='center'; ctx.fillText('💣',0,-MOLE_R*0.65); }
  else if(m.type==='golden'){ ctx.beginPath(); ctx.moveTo(-18,-MOLE_R*0.5); ctx.lineTo(18,-MOLE_R*0.5); ctx.lineTo(12,-MOLE_R*1.1); ctx.lineTo(-12,-MOLE_R*1.1); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,-MOLE_R*1.15,5,0,Math.PI*2); ctx.fill(); }
  else { ctx.fillRect(-18,-MOLE_R*0.5,36,6); ctx.fillRect(-12,-MOLE_R*1.05,24,MOLE_R*0.55); }
  ctx.shadowBlur=0; ctx.restore();
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/24); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/14); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,56);
  ctx.strokeStyle='rgba(100,200,60,0.2)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,56); ctx.lineTo(W,56); ctx.stroke();
  // Timer bar
  const tFrac=Math.max(0,timeLeft/60);
  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(0,48,W,8);
  const tcol=tFrac>0.4?'#44ff88':tFrac>0.2?'#ffd700':'#ff4444';
  ctx.fillStyle=tcol; ctx.fillRect(0,48,W*tFrac,8);
  ctx.textAlign='center'; ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.fillText(score,W/2,32); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,44);
  // Time left
  ctx.textAlign='left'; ctx.fillStyle=tcol; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText(Math.ceil(Math.max(0,timeLeft))+'s',12,32);
  ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-10,24);
  if(combo>=2){ ctx.fillStyle=`hsl(${frame*7%360},90%,65%)`; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText(combo+'× COMBO',W-10,40); }
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  drawBg();
  // Sample moles bobbing
  [[150,330],[300,310],[450,330]].forEach(([mx,my],i)=>{
    const oy=Math.abs(Math.sin(tf*0.05+i))*12;
    ctx.save(); ctx.translate(mx,my+oy);
    const cols=['#aa7744','#ffd700','#44aa88']; const hats=['#334488','#ffaa00','#884400'];
    ctx.shadowColor=cols[i]; ctx.shadowBlur=10;
    ctx.fillStyle=cols[i]; ctx.beginPath(); ctx.ellipse(0,6,36,40,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffcc99'; ctx.beginPath(); ctx.ellipse(0,-8,24,24,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=hats[i]; ctx.fillRect(-14,-26,28,6); ctx.fillRect(-10,-44,20,20);
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-8,-14,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8,-14,3,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.restore();
  });
  ctx.textAlign='center';
  ctx.shadowColor='#aa7744'; ctx.shadowBlur=28; ctx.fillStyle='#aa7744'; ctx.font='bold 40px "Press Start 2P",monospace'; ctx.fillText('WHACK-A',W/2,190); ctx.shadowBlur=0;
  ctx.shadowColor='#44ff88'; ctx.shadowBlur=22; ctx.fillStyle='#44ff88'; ctx.font='bold 40px "Press Start 2P",monospace'; ctx.fillText('MOLE!',W/2,248); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('60 SECONDS — WHACK EVERY MOLE YOU SEE!',W/2,274);
  ctx.fillStyle='rgba(255,215,0,0.5)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('🥇 GOLDEN = +50   💣 BOMB = -20',W/2,294);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,318); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY>348&&mY<402;
  ctx.fillStyle=ph?'#66dd55':'#44bb33'; ctx.beginPath(); ctx.roundRect(W/2-110,348,220,54,10); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,384);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
}

function drawGameOver(){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#44ff88'; ctx.shadowBlur=18; ctx.fillStyle='#44ff88'; ctx.font='bold 28px "Press Start 2P",monospace'; ctx.fillText('TIME\'S UP!',W/2,178); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 46px "Press Start 2P",monospace'; ctx.fillText(score,W/2,254); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('FINAL SCORE',W/2,270);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,298); }
  else{ ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,298); }
  const ph=mX>W/2-115&&mX<W/2+115&&mY>328&&mY<382;
  ctx.fillStyle=ph?'#66dd55':'#44bb33'; ctx.beginPath(); ctx.roundRect(W/2-115,328,230,54,10); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,362);
  const mh=mX>W/2-90&&mX<W/2+90&&mY>396&&mY<438;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; ctx.beginPath(); ctx.roundRect(W/2-90,396,180,42,8); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,422);
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
    drawBg(); drawHoles(); drawFX(); drawHUD();
    if(doShake) ctx.restore();
    clickFrame=click; update(); clickFrame=false;
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
