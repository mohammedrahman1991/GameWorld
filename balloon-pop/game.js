'use strict';
// ================================================================
// BALLOON POP — Click balloons before they escape, dodge bombs!
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
function sfxPop(pts){ tone(300+pts*60,0.05,'sine',0.1); tone(500+pts*60,0.04,'sine',0.07,0.03); }
function sfxBomb(){ tone(100,0.4,'sawtooth',0.15); tone(70,0.5,'sawtooth',0.12,0.1); }
function sfxEscape(){ tone(200,0.1,'sine',0.06); }
function sfxCombo(n){ [440,550,660,880].slice(0,Math.min(n,4)).forEach((f,i)=>tone(f,0.07,'triangle',0.1,i*0.06)); }

// ---------------------------------------------------------------- Balloon types
const BTYPES=[
  {type:'red',    col:'#ff4455', shine:'#ff9999', pts:1,  r:28, spd:0.9, weight:35},
  {type:'blue',   col:'#4488ff', shine:'#88bbff', pts:2,  r:26, spd:1.1, weight:25},
  {type:'green',  col:'#44cc66', shine:'#88ffaa', pts:2,  r:26, spd:1.2, weight:22},
  {type:'purple', col:'#aa44ff', shine:'#dd88ff', pts:3,  r:28, spd:1.0, weight:12},
  {type:'gold',   col:'#ffd700', shine:'#fffaaa', pts:5,  r:30, spd:0.8, weight:4},
  {type:'rainbow',col:'#ff44ff', shine:'#ffaaff', pts:10, r:32, spd:0.7, weight:2},
];
const BOMB={type:'bomb',col:'#222',shine:'#666',pts:-1,r:26,spd:1.3,weight:0};

// ---------------------------------------------------------------- State
let STATE='TITLE';
let balloons, particles, floats;
let score, best=+(localStorage.getItem('bp_best')||0), lives, frame, spawnTimer, combo, comboT;
let tf=0, shakeT=0;

function pickType(){
  const total=BTYPES.reduce((s,t)=>s+t.weight,0);
  let r=Math.random()*total;
  for(const t of BTYPES){ r-=t.weight; if(r<=0) return t; }
  return BTYPES[0];
}

function startGame(){
  balloons=[]; particles=[]; floats=[];
  score=0; lives=3; frame=0; spawnTimer=0; combo=0; comboT=0; shakeT=0;
}

function spawnBalloon(){
  const isBomb = frame>90 && Math.random()<0.10;
  const t = isBomb ? BOMB : pickType();
  const spd = (t.spd + frame/2000) * (0.85+Math.random()*0.3);
  balloons.push({
    ...t, x:30+Math.random()*(W-60), y:H+t.r+10,
    vy:-spd, vx:(Math.random()-0.5)*0.7,
    wobble:Math.random()*Math.PI*2, wobbleSpd:0.03+Math.random()*0.02,
    scale:0.1, growing:true,
  });
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=3+Math.random()*7; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,col,r:3+Math.random()*5,life:20+Math.random()*14}); }
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:52}); }

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  if(comboT>0) comboT--; else combo=0;
  if(shakeT>0) shakeT--;

  const interval=Math.max(18,55-frame/55);
  if(++spawnTimer>=interval){ spawnTimer=0; spawnBalloon(); if(frame>300&&Math.random()<0.35) spawnBalloon(); }

  // Click detection
  if(clickFrame){
    let hit=false;
    for(let i=balloons.length-1;i>=0;i--){
      const b=balloons[i];
      if(Math.hypot(mX-b.x,mY-b.y)<b.r*b.scale){
        if(b.type==='bomb'){ sfxBomb(); shakeT=18; spawnPfx(b.x,b.y,'#ff4444',20); addFloat(b.x,b.y,'BOOM!','#ff4444'); lives--; if(lives<=0){ if(score>best){best=score;localStorage.setItem('bp_best',String(best));} STATE='GAMEOVER'; } balloons.splice(i,1); hit=true; break; }
        else {
          combo++; comboT=22;
          const mul=combo>=4?3:combo>=2?2:1;
          const gained=b.pts*mul;
          score+=gained; if(score>best){best=score;localStorage.setItem('bp_best',String(best));}
          sfxPop(b.pts); if(combo>=2) sfxCombo(combo);
          spawnPfx(b.x,b.y,b.col,12+b.pts*2);
          addFloat(b.x,b.y-10,'+'+(gained>b.pts?gained+' ×'+mul:gained),(mul>1?'#ffd700':b.col));
          balloons.splice(i,1); hit=true; break;
        }
      }
    }
  }

  balloons=balloons.filter(b=>{
    if(b.growing){ b.scale=Math.min(1,b.scale+0.08); if(b.scale>=1) b.growing=false; }
    b.wobble+=b.wobbleSpd; b.x+=b.vx+Math.sin(b.wobble)*0.6; b.y+=b.vy;
    if(b.x<b.r) b.vx=Math.abs(b.vx); if(b.x>W-b.r) b.vx=-Math.abs(b.vx);
    if(b.y<-b.r-10){
      if(b.type!=='bomb'){ sfxEscape(); lives--; addFloat(b.x>W/2?b.x-60:b.x,'MISSED!','#ff4444'); if(lives<=0){ if(score>best){best=score;localStorage.setItem('bp_best',String(best));} STATE='GAMEOVER'; } }
      return false;
    }
    return true;
  });

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.22; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.9; return --f.life>0; });
}

// ---------------------------------------------------------------- Draw
function drawBalloon(b){
  ctx.save();
  ctx.translate(b.x,b.y);
  ctx.scale(b.scale,b.scale);
  const col=b.type==='rainbow'?`hsl(${frame*5%360},90%,65%)`:b.col;
  // Shadow under balloon
  ctx.globalAlpha=0.15; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(0,b.r+4,b.r*0.6,6,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  // Balloon body
  ctx.shadowColor=col; ctx.shadowBlur=14;
  const g=ctx.createRadialGradient(-b.r*0.3,-b.r*0.35,b.r*0.1,0,0,b.r);
  g.addColorStop(0,b.shine||'#fff'); g.addColorStop(0.4,col); g.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,b.r,b.r*1.2,0,0,Math.PI*2); ctx.fill();
  if(b.type==='bomb'){
    ctx.strokeStyle='#aaa'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-b.r*1.2); ctx.lineTo(0,-b.r*1.2-14); ctx.stroke();
    ctx.fillStyle='#ffaa00'; ctx.beginPath(); ctx.arc(3,-b.r*1.2-14,4,0,Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur=0;
  // String
  ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,b.r*1.2); ctx.quadraticCurveTo(4,b.r*1.5+12,0,b.r*1.2+24); ctx.stroke();
  ctx.restore();
  // Pts label
  if(b.type!=='bomb'){ ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText('+'+b.pts,b.x,b.y+4); }
  ctx.textAlign='left';
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0a0020'); g.addColorStop(1,'#1a003a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(let i=0;i<60;i++){ ctx.globalAlpha=0.15+i%5*0.05; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc((i*117+30)%W,(i*79+20)%(H-60),i%7?0.8:1.5,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1;
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/26); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/14); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,W,52);
  ctx.strokeStyle='rgba(200,100,255,0.2)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,52); ctx.lineTo(W,52); ctx.stroke();
  ctx.font='16px monospace'; ctx.textAlign='left';
  for(let i=0;i<3;i++) ctx.fillText(i<lives?'🎈':'💨',10+i*28,34);
  ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 20px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText(score,W/2,34); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,46);
  ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-10,24);
  if(combo>=2){ ctx.fillStyle=`hsl(${frame*8%360},90%,65%)`; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText(combo+'× COMBO!',W-10,40); }
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  drawBg();
  [[100,400,'#ff4455'],[230,350,'#4488ff'],[360,390,'#44cc66'],[490,360,'#ffd700']].forEach(([bx,by,col],i)=>{
    const oy=Math.sin(tf*0.04+i)*18;
    ctx.save(); ctx.translate(bx,by+oy); ctx.shadowColor=col; ctx.shadowBlur=16;
    const g=ctx.createRadialGradient(-8,-10,3,0,0,28); g.addColorStop(0,'#fff'); g.addColorStop(0.4,col); g.addColorStop(1,'rgba(0,0,0,0.3)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,28,33,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; ctx.restore();
  });
  ctx.textAlign='center';
  ctx.shadowColor='#ff4455'; ctx.shadowBlur=28; ctx.fillStyle='#ff4455'; ctx.font='bold 46px "Press Start 2P",monospace'; ctx.fillText('BALLOON',W/2,225); ctx.shadowBlur=0;
  ctx.shadowColor='#4488ff'; ctx.shadowBlur=22; ctx.fillStyle='#4488ff'; ctx.font='bold 46px "Press Start 2P",monospace'; ctx.fillText('POP!',W/2,288); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('CLICK BALLOONS BEFORE THEY ESCAPE!',W/2,318);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,342); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY>372&&mY<426;
  ctx.shadowColor='#ff4455'; ctx.shadowBlur=ph?22:8;
  ctx.fillStyle=ph?'#ff6677':'#ff4455'; ctx.beginPath(); ctx.roundRect(W/2-110,372,220,54,10); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='bold 16px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,408);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
}

function drawGameOver(){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff4455'; ctx.shadowBlur=20; ctx.fillStyle='#ff4455'; ctx.font='bold 30px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,178); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 46px "Press Start 2P",monospace'; ctx.fillText(score,W/2,254); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,270);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,298); }
  else{ ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,298); }
  const ph=mX>W/2-115&&mX<W/2+115&&mY>328&&mY<382;
  ctx.fillStyle=ph?'#ff6677':'#ff4455'; ctx.beginPath(); ctx.roundRect(W/2-115,328,230,54,10); ctx.fill();
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
    drawBg();
    balloons.forEach(drawBalloon);
    drawFX(); drawHUD();
    if(doShake) ctx.restore();
    clickFrame=click; update(); clickFrame=false;
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
