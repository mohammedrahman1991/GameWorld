'use strict';
// ================================================================
// STAR CATCHER — Catch falling stars, dodge bombs, survive!
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 900, H = 600;
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
function hover(x,y,w,h){ return mX>x&&mX<x+w; } // simplified for this game

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='square',vol=0.07,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxCatch(pts){ tone(440+pts*55,0.05,'triangle',0.09); tone(550+pts*55,0.06,'triangle',0.07,0.05); }
function sfxBomb(){ tone(120,0.4,'sawtooth',0.14); tone(80,0.5,'sawtooth',0.12,0.12); }
function sfxRainbow(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.08,'triangle',0.1,i*0.07)); }
function sfxDie(){ tone(200,0.1,'sawtooth',0.14); tone(100,0.4,'sawtooth',0.18,0.12); }

// ---------------------------------------------------------------- Constants
const BASKET_W=100, BASKET_H=30, BASKET_Y=H-60, BASKET_SPD=7;
const ITEM_TYPES=[
  {type:'star1', col:'#aaddff', pts:1,  r:14, weight:35},
  {type:'star2', col:'#44aaff', pts:2,  r:16, weight:25},
  {type:'star3', col:'#ff8833', pts:3,  r:18, weight:18},
  {type:'star4', col:'#ffd700', pts:5,  r:20, weight:10},
  {type:'rainbow',col:'#ff44ff',pts:10, r:22, weight:4},
  {type:'bomb',  col:'#ff3355', pts:-1, r:18, weight:8},
];

// ---------------------------------------------------------------- State
let STATE='TITLE';
let basketX, items, particles, floats;
let score, best=+(localStorage.getItem('sc_best')||0), lives, frame, spawnTimer;
let rainbowT=0, shieldT=0;
let mxPrev=W/2;

function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }

function pickType(){
  const pool=ITEM_TYPES; const total=pool.reduce((s,t)=>s+t.weight,0);
  let r=Math.random()*total; for(const t of pool){ r-=t.weight; if(r<=0) return t; } return pool[0];
}

function startGame(){
  basketX=W/2-BASKET_W/2; items=[]; particles=[]; floats=[];
  score=0; lives=3; frame=0; spawnTimer=0; rainbowT=0; shieldT=0;
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=2+Math.random()*5; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:2+Math.random()*4,life:24+Math.random()*16}); }
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:55}); }

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  const speed=Math.min(7, 2.2+frame/800);
  const spawnInterval=Math.max(28, 90-frame/60);

  // Move basket
  if(keys['ArrowLeft']||keys['KeyA']) basketX=Math.max(0,basketX-BASKET_SPD);
  if(keys['ArrowRight']||keys['KeyD']) basketX=Math.min(W-BASKET_W,basketX+BASKET_SPD);
  // Mouse control
  const targetX=mX-BASKET_W/2;
  basketX+=(targetX-basketX)*0.18;
  basketX=Math.max(0,Math.min(W-BASKET_W,basketX));

  if(rainbowT>0) rainbowT--;
  if(shieldT>0) shieldT--;

  // Spawn
  if(++spawnTimer>=spawnInterval){ spawnTimer=0; const t=pickType(); items.push({x:20+Math.random()*(W-40),y:-30,vy:speed*(0.8+Math.random()*0.5),...t,spin:Math.random()*Math.PI*2,bob:0}); }

  // Move items
  items=items.filter(item=>{
    item.y+=item.vy; item.spin+=0.08; item.bob+=0.1;
    const bx=basketX, bw=BASKET_W, by=BASKET_Y;
    // Caught
    if(item.y+item.r>by&&item.y-item.r<by+BASKET_H&&item.x>bx-item.r&&item.x<bx+bw+item.r){
      if(item.type==='bomb'){
        if(shieldT>0){ shieldT=0; spawnPfx(item.x,item.y,'#ffd700',14); addFloat(item.x,item.y,'SHIELD!','#ffd700'); sfxBomb(); }
        else { lives--; sfxBomb(); spawnPfx(item.x,item.y,'#ff3355',18); addFloat(item.x,item.y,'BOOM!','#ff3355'); if(lives<=0){ if(score>best){best=score;localStorage.setItem('sc_best',String(best));} STATE='GAMEOVER'; } }
      } else {
        const mul=rainbowT>0?3:1;
        const gained=item.pts*mul;
        score+=gained;
        if(item.type==='rainbow'){ rainbowT=220; sfxRainbow(); addFloat(item.x,item.y,'3× SCORE!','#ff44ff'); }
        else { sfxCatch(item.pts); addFloat(item.x,item.y,'+'+gained,item.col); }
        spawnPfx(item.x,item.y,item.col,10);
        if(score>best) best=score;
      }
      return false;
    }
    return item.y<H+40;
  });

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.9; return --f.life>0; });
}

// ---------------------------------------------------------------- Draw
function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#030318'); g.addColorStop(1,'#0a0a2a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Stars bg
  for(let i=0;i<90;i++){
    const sx=(i*137)%W, sy=(i*89+13)%(H-80);
    ctx.globalAlpha=0.2+(i%6)*0.1; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(sx,sy,i%9?0.7:1.3,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
  // Ground
  ctx.fillStyle='rgba(100,200,255,0.08)'; ctx.fillRect(0,BASKET_Y+BASKET_H,W,H-(BASKET_Y+BASKET_H));
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=8;
  ctx.strokeStyle='rgba(100,200,255,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,BASKET_Y+BASKET_H); ctx.lineTo(W,BASKET_Y+BASKET_H); ctx.stroke();
  ctx.shadowBlur=0;
}

function drawStars(){
  items.forEach(item=>{
    ctx.save(); ctx.translate(item.x,item.y); ctx.rotate(item.spin);
    if(item.type==='bomb'){
      ctx.shadowColor='#ff3355'; ctx.shadowBlur=16;
      ctx.fillStyle='#ff3355'; ctx.beginPath(); ctx.arc(0,0,item.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ff8899'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(-item.r*0.6,-item.r*0.6); ctx.lineTo(item.r*0.6,item.r*0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(item.r*0.6,-item.r*0.6); ctx.lineTo(-item.r*0.6,item.r*0.6); ctx.stroke();
      ctx.shadowBlur=0;
    } else {
      // Star shape
      const col=item.type==='rainbow'?`hsl(${frame*4%360},90%,65%)`:item.col;
      ctx.shadowColor=col; ctx.shadowBlur=18;
      ctx.fillStyle=col;
      ctx.beginPath();
      for(let p=0;p<5;p++){
        const outer=item.r, inner=item.r*0.42;
        const a1=(p*2*Math.PI/5)-Math.PI/2;
        const a2=(p*2*Math.PI/5+Math.PI/5)-Math.PI/2;
        if(p===0) ctx.moveTo(Math.cos(a1)*outer,Math.sin(a1)*outer);
        else ctx.lineTo(Math.cos(a1)*outer,Math.sin(a1)*outer);
        ctx.lineTo(Math.cos(a2)*inner,Math.sin(a2)*inner);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(-item.r*0.25,-item.r*0.25,item.r*0.22,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
    ctx.restore();

    // Pts label
    if(item.type!=='bomb'){
      ctx.fillStyle=item.col; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText('+'+item.pts,item.x,item.y+item.r+13);
    }
  });
  ctx.textAlign='left';
}

function drawBasket(){
  const bx=basketX, by=BASKET_Y;
  // Shield glow
  if(shieldT>0){
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=20;
    ctx.strokeStyle=`rgba(255,215,0,${0.4+Math.sin(frame*0.2)*0.3})`; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(bx+BASKET_W/2,by+BASKET_H/2,BASKET_W*0.7,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
  }
  // Rainbow shimmer
  const bc=rainbowT>0?`hsl(${frame*6%360},80%,60%)`:'#33aaff';
  ctx.shadowColor=bc; ctx.shadowBlur=14;
  // Basket body
  const g=ctx.createLinearGradient(bx,by,bx,by+BASKET_H);
  g.addColorStop(0,rainbowT>0?`hsl(${frame*6%360},70%,55%)`:'#2277cc');
  g.addColorStop(1,rainbowT>0?`hsl(${(frame*6+120)%360},70%,40%)`:'#114488');
  ctx.fillStyle=g;
  rr(bx,by,BASKET_W,BASKET_H,8); ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=2;
  rr(bx,by,BASKET_W,BASKET_H,8); ctx.stroke();
  // Shine
  ctx.fillStyle='rgba(255,255,255,0.15)'; rr(bx+4,by+3,BASKET_W-8,8,4); ctx.fill();
  // Custom cursor star on basket
  ctx.shadowColor='#ffd700'; ctx.shadowBlur=10;
  ctx.fillStyle='#ffd700'; ctx.font='16px monospace'; ctx.textAlign='center';
  ctx.fillText('⭐',bx+BASKET_W/2,by-8);
  ctx.shadowBlur=0; ctx.textAlign='left';
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/32); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/18); ctx.font='bold 11px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawHUD(){
  const g=ctx.createLinearGradient(0,0,0,54);
  g.addColorStop(0,'#030318'); g.addColorStop(1,'rgba(3,3,24,0.85)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,54);
  ctx.strokeStyle='rgba(100,200,255,0.15)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,54); ctx.lineTo(W,54); ctx.stroke();
  // Score
  ctx.textAlign='center'; ctx.shadowColor='rgba(255,255,255,0.4)'; ctx.shadowBlur=10;
  ctx.fillStyle='#fff'; ctx.font='bold 24px "Press Start 2P",monospace'; ctx.fillText(score,W/2,36);
  ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,48);
  // Lives
  ctx.textAlign='left'; ctx.font='18px monospace';
  for(let i=0;i<3;i++) ctx.fillText(i<lives?'❤️':'🖤',12+i*30,34);
  // Best
  ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-10,22);
  // Rainbow indicator
  if(rainbowT>0){ ctx.fillStyle=`hsl(${frame*5%360},90%,65%)`; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.textAlign='right'; ctx.fillText('3× SCORE! '+Math.ceil(rainbowT/60)+'s',W-10,38); }
  ctx.textAlign='left'; ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.font='8px monospace';
  ctx.fillText('← → or mouse to move',12,H-8);
}

// ---------------------------------------------------------------- Screens
let tf=0;
function drawTitle(){
  tf++;
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#030318'); g.addColorStop(1,'#0a0a2a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){ ctx.globalAlpha=0.2+(i%6)*0.1; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc((i*137)%W,(i*89+13)%(H-80),i%9?0.7:1.3,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1;
  // Animated falling stars
  [[180,200,'#ffd700'],[440,320,'#44aaff'],[700,180,'#ff8833'],[580,420,'#ff44ff'],[300,380,'#aaddff']].forEach(([sx,sy,col],i)=>{
    const oy=(tf*1.2+i*60)%H;
    ctx.save(); ctx.translate(sx,oy); ctx.rotate(tf*0.03+i);
    ctx.shadowColor=col; ctx.shadowBlur=14; ctx.fillStyle=col;
    ctx.beginPath(); for(let p=0;p<5;p++){ const a1=(p*2*Math.PI/5)-Math.PI/2,a2=(p*2*Math.PI/5+Math.PI/5)-Math.PI/2; if(p===0) ctx.moveTo(Math.cos(a1)*18,Math.sin(a1)*18); else ctx.lineTo(Math.cos(a1)*18,Math.sin(a1)*18); ctx.lineTo(Math.cos(a2)*8,Math.sin(a2)*8); } ctx.closePath(); ctx.fill(); ctx.shadowBlur=0; ctx.restore();
  });
  ctx.textAlign='center';
  ctx.shadowColor='#ffd700'; ctx.shadowBlur=30; ctx.fillStyle='#ffd700'; ctx.font='bold 58px "Press Start 2P",monospace'; ctx.fillText('STAR',W/2,175);
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=30; ctx.fillStyle='#44aaff'; ctx.font='bold 58px "Press Start 2P",monospace'; ctx.fillText('CATCHER',W/2,248);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('CATCH STARS. DODGE BOMBS.',W/2,278);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,304); }
  // Type legend
  [['#ffd700','+5','GOLD'],['#ff8833','+3','ORANGE'],['#44aaff','+2','BLUE'],['#ff44ff','+10','RAINBOW'],['#ff3355','💀','BOMB']].forEach(([col,pts,lbl],i)=>{
    const lx=W/2-240+i*120, ly=345;
    ctx.shadowColor=col; ctx.shadowBlur=10; ctx.strokeStyle=col; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(lx,ly,18,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle=col; ctx.font='bold 9px monospace'; ctx.fillText(pts,lx,ly+5); ctx.font='7px monospace'; ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillText(lbl,lx,ly+26);
  });
  const ph=hover(W/2-115,382,230,54)&&mX>W/2-115&&mX<W/2+115;
  ctx.fillStyle=ph?'#ffe033':'#ffd700'; rr(W/2-115,382,230,54,12); ctx.fill();
  ctx.shadowColor='#ffd700'; ctx.shadowBlur=ph?22:8; rr(W/2-115,382,230,54,12); ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle='#030318'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,418);
  ctx.fillStyle='rgba(3,3,24,0.6)'; ctx.font='8px monospace'; ctx.fillText('[CLICK or SPACE]',W/2,436);
  ctx.textAlign='left';
  if((clickFrame&&mX>W/2-115&&mX<W/2+115)||keys['Space']||keys['Enter']){ startGame(); STATE='GAME'; }
}

function drawGameOver(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#030318'); g.addColorStop(1,'#0a0a2a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff3355'; ctx.shadowBlur=22; ctx.fillStyle='#ff3355'; ctx.font='bold 38px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,170); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 52px "Press Start 2P",monospace'; ctx.fillText(score,W/2,248); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,265);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,295); }
  else { ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,295); }
  const ph=mX>W/2-130&&mX<W/2+130;
  ctx.fillStyle=ph?'#ffe033':'#ffd700'; rr(W/2-130,325,260,52,12); ctx.fill();
  ctx.fillStyle='#030318'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,358);
  const mh=mX>W/2-100&&mX<W/2+100;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; rr(W/2-100,393,200,44,10); ctx.fill();
  ctx.strokeStyle='#3a3a55'; ctx.lineWidth=1.5; rr(W/2-100,393,200,44,10); ctx.stroke();
  ctx.fillStyle='#aaa'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,421);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(clickFrame&&mh&&!(mX>W/2-130&&mX<W/2+130)) STATE='TITLE';
  if(clickFrame&&mX>W/2-100&&mX<W/2+100&&mY>393&&mY<437) STATE='TITLE';
}

let mY=H/2;
canvas.addEventListener('click',e=>{ const r=canvas.getBoundingClientRect(); mY=(e.clientY-r.top)*(H/r.height); });

function loop(){
  const click=clickFrame; clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){ clickFrame=click; drawTitle(); clickFrame=false; }
  else if(STATE==='GAME'){ drawBg(); drawStars(); drawFX(); drawBasket(); drawHUD(); update(); }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
