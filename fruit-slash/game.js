'use strict';
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(typeof r==='object'?r[0]:r,w/2,h/2);this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath();};}
// ================================================================
// FRUIT SLASH — Swipe to slash fruit, dodge bombs!
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
let blade=[], mouse={x:W/2,y:H/2,down:false};
let clickFrame=false, mX=W/2, mY=H/2;
function getPos(e,r){ const rect=canvas.getBoundingClientRect(); return {x:(e.clientX-rect.left)*(W/rect.width),y:(e.clientY-rect.top)*(H/rect.height)}; }
canvas.addEventListener('mousedown',e=>{ const p=getPos(e); mouse={...p,down:true}; blade=[p]; });
canvas.addEventListener('mousemove',e=>{ const p=getPos(e); mX=p.x; mY=p.y; if(mouse.down){ blade.push(p); if(blade.length>18) blade.shift(); } });
canvas.addEventListener('mouseup',e=>{ mouse.down=false; blade=[]; });
canvas.addEventListener('click',e=>{ const p=getPos(e); mX=p.x; mY=p.y; clickFrame=true; });
// Touch
canvas.addEventListener('touchstart',e=>{ e.preventDefault(); const p=getPos(e.touches[0]); mouse={...p,down:true}; blade=[p]; },{passive:false});
canvas.addEventListener('touchmove',e=>{ e.preventDefault(); const p=getPos(e.touches[0]); mX=p.x; mY=p.y; if(mouse.down){ blade.push(p); if(blade.length>18) blade.shift(); } },{passive:false});
canvas.addEventListener('touchend',e=>{ mouse.down=false; blade=[]; });

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='sine',vol=0.08,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxSlice(){ tone(600+Math.random()*200,0.06,'sawtooth',0.09); tone(900,0.04,'sawtooth',0.06,0.03); }
function sfxCombo(n){ [523,659,784,1047].slice(0,n).forEach((f,i)=>tone(f,0.07,'triangle',0.1,i*0.05)); }
function sfxBomb(){ tone(80,0.5,'sawtooth',0.18); tone(60,0.6,'sawtooth',0.15,0.1); }
function sfxMiss(){ tone(220,0.15,'sine',0.08); }

// ---------------------------------------------------------------- Fruit types
const FRUITS=[
  {type:'watermelon',emoji:'🍉',pts:1,r:30,col:'#44cc44',launch:10},
  {type:'orange',    emoji:'🍊',pts:2,r:26,col:'#ff8833',launch:11},
  {type:'pineapple', emoji:'🍍',pts:3,r:28,col:'#ffd700',launch:12},
  {type:'strawberry',emoji:'🍓',pts:2,r:22,col:'#ff4466',launch:13},
  {type:'grapes',    emoji:'🍇',pts:4,r:24,col:'#cc44ff',launch:11},
  {type:'star',      emoji:'⭐',pts:5,r:24,col:'#ffd700',launch:14},
  {type:'bomb',      emoji:'💣',pts:-1,r:26,col:'#333',launch:10},
];
const FRUIT_ONLY=FRUITS.slice(0,-1);

// ---------------------------------------------------------------- State
let STATE='TITLE';
let fruits, halves, particles, floats;
let score, best=+(localStorage.getItem('fsl_best')||0), misses, frame, spawnTimer, combo, comboT;
let tf=0, shakeT=0;

function lineHitsCircle(x1,y1,x2,y2,cx,cy,r){
  const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy;
  if(len2===0) return Math.hypot(cx-x1,cy-y1)<r;
  const t=Math.max(0,Math.min(1,((cx-x1)*dx+(cy-y1)*dy)/len2));
  return Math.hypot(cx-(x1+t*dx),cy-(y1+t*dy))<r;
}

function startGame(){
  fruits=[]; halves=[]; particles=[]; floats=[];
  score=0; misses=0; frame=0; spawnTimer=0; combo=0; comboT=0;
}

function spawnFruit(){
  // Mostly fruit, occasional bomb
  const isBomb=frame>120&&Math.random()<0.12;
  const t=isBomb?FRUITS[6]:FRUIT_ONLY[Math.floor(Math.random()*FRUIT_ONLY.length)];
  const fromLeft=Math.random()<0.5;
  const x=fromLeft?-t.r:W+t.r;
  const y=H*0.5+Math.random()*(H*0.4);
  const speed=t.launch*(0.85+Math.random()*0.3);
  const angle=fromLeft?(Math.PI*(-0.18-Math.random()*0.2)):(Math.PI*(-0.82+Math.random()*0.2));
  fruits.push({...t,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,rot:Math.random()*Math.PI*2,spin:(Math.random()-0.5)*0.15,sliced:false});
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=3+Math.random()*7; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:3+Math.random()*4,life:20+Math.random()*16}); }
}

function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:50}); }

// ---------------------------------------------------------------- Slash detection
function checkSlash(){
  if(blade.length<3) return;
  let slicedThisSwipe=0;
  for(let i=0;i<fruits.length;i++){
    const f=fruits[i];
    if(f.sliced) continue;
    for(let b=1;b<blade.length;b++){
      if(lineHitsCircle(blade[b-1].x,blade[b-1].y,blade[b].x,blade[b].y,f.x,f.y,f.r)){
        f.sliced=true;
        if(f.type==='bomb'){
          sfxBomb(); shakeT=20;
          spawnPfx(f.x,f.y,'#ff3355',20);
          addFloat(f.x,f.y,'BOOM!','#ff3355');
          if(score>best){best=score;localStorage.setItem('fsl_best',String(best));}
          STATE='GAMEOVER';
          return;
        }
        sfxSlice(); slicedThisSwipe++;
        spawnPfx(f.x,f.y,f.col,12);
        // two halves
        const dx=(blade[b].x-blade[b-1].x),dy=(blade[b].y-blade[b-1].y),len=Math.hypot(dx,dy)||1;
        const nx=-dy/len,ny=dx/len;
        halves.push({x:f.x,y:f.y,vx:f.vx+nx*3,vy:f.vy+ny*3,r:f.r,col:f.col,emoji:f.emoji,rot:f.rot,spin:f.spin+0.2,life:40,half:0});
        halves.push({x:f.x,y:f.y,vx:f.vx-nx*3,vy:f.vy-ny*3,r:f.r,col:f.col,emoji:f.emoji,rot:f.rot,spin:f.spin-0.2,life:40,half:1});
        combo++;
        comboT=18;
        const gained=f.pts*(combo>=3?2:1);
        score+=gained;
        if(score>best){best=score;localStorage.setItem('fsl_best',String(best));}
        addFloat(f.x,f.y-10,'+'+(gained>f.pts?gained+'×':gained),f.col);
        break;
      }
    }
  }
  if(slicedThisSwipe>=2) sfxCombo(Math.min(slicedThisSwipe,4));
  fruits=fruits.filter(f=>!f.sliced);
}

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  const interval=Math.max(22,60-frame/50);
  if(++spawnTimer>=interval){ spawnTimer=0; spawnFruit(); if(frame>200&&Math.random()<0.4) spawnFruit(); }

  if(comboT>0){ comboT--; } else { combo=0; }
  if(shakeT>0) shakeT--;

  checkSlash();

  fruits=fruits.filter(f=>{
    f.x+=f.vx; f.y+=f.vy; f.vy+=0.28; f.rot+=f.spin;
    if(f.y>H+60||f.x<-80||f.x>W+80){
      if(f.type!=='bomb'){ misses++; sfxMiss(); addFloat(f.x<0?30:W-30,H-80,'-MISS','#ff4444'); if(misses>=3){ if(score>best){best=score;localStorage.setItem('fsl_best',String(best));} STATE='GAMEOVER'; } }
      return false;
    }
    return true;
  });

  halves=halves.filter(h=>{ h.x+=h.vx; h.y+=h.vy; h.vy+=0.3; h.rot+=h.spin; return --h.life>0; });
  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=1; return --f.life>0; });
}

// ---------------------------------------------------------------- Draw helpers
function drawFruitEmoji(f, alpha){
  ctx.save(); ctx.globalAlpha=alpha||1; ctx.translate(f.x,f.y); ctx.rotate(f.rot);
  ctx.font=`${f.r*1.5}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(f.emoji,0,0);
  ctx.restore();
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0a0015'); g.addColorStop(1,'#180030');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // subtle grid
  ctx.strokeStyle='rgba(150,80,255,0.04)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=50){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=50){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function drawBlade(){
  if(blade.length<2) return;
  for(let i=1;i<blade.length;i++){
    const t=i/blade.length;
    ctx.globalAlpha=t*0.9;
    ctx.strokeStyle=`hsl(${180+t*60},100%,${70+t*20}%)`;
    ctx.lineWidth=3+t*3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(blade[i-1].x,blade[i-1].y); ctx.lineTo(blade[i].x,blade[i].y); ctx.stroke();
  }
  ctx.globalAlpha=1;
  // bright tip
  if(blade.length>0){
    const tip=blade[blade.length-1];
    ctx.shadowColor='#fff'; ctx.shadowBlur=16;
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(tip.x,tip.y,4,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,52);
  ctx.strokeStyle='rgba(200,100,255,0.2)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,52); ctx.lineTo(W,52); ctx.stroke();
  ctx.textAlign='center'; ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 22px "Press Start 2P",monospace'; ctx.fillText(score,W/2,34); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,46);
  // Misses hearts
  ctx.font='18px monospace'; ctx.textAlign='left';
  for(let i=0;i<3;i++) ctx.fillText(i<(3-misses)?'❤️':'🖤',10+i*26,32);
  // Best
  ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-8,24);
  // Combo
  if(combo>=2){ ctx.textAlign='right'; ctx.fillStyle=`hsl(${frame*8%360},90%,65%)`; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText(combo+'× COMBO!',W-8,40); }
  ctx.textAlign='left';
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/28); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/14); ctx.font='bold 11px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  drawBg();
  // Animated fruits
  [[80,250,'🍉'],[180,380,'🍊'],[320,200,'🍇'],[460,340,'🍍'],[540,220,'⭐']].forEach(([sx,sy,em],i)=>{
    const oy=Math.sin(tf*0.04+i)*20;
    ctx.save(); ctx.font='52px serif'; ctx.textAlign='center'; ctx.globalAlpha=0.7+Math.sin(tf*0.06+i)*0.3;
    ctx.translate(sx,sy+oy); ctx.rotate(Math.sin(tf*0.03+i)*0.3); ctx.fillText(em,0,0); ctx.restore();
  });
  ctx.globalAlpha=1;
  ctx.textAlign='center';
  ctx.shadowColor='#ff8833'; ctx.shadowBlur=28; ctx.fillStyle='#ff8833'; ctx.font='bold 52px "Press Start 2P",monospace'; ctx.fillText('FRUIT',W/2,210); ctx.shadowBlur=0;
  ctx.shadowColor='#44cc44'; ctx.shadowBlur=22; ctx.fillStyle='#44cc44'; ctx.font='bold 52px "Press Start 2P",monospace'; ctx.fillText('SLASH',W/2,276); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('SWIPE TO SLASH FRUIT — DODGE BOMBS',W/2,308);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,332); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY>365&&mY<420;
  ctx.shadowColor='#ff8833'; ctx.shadowBlur=ph?20:8;
  ctx.fillStyle=ph?'#ff9944':'#ff7722'; ctx.beginPath(); ctx.roundRect(W/2-110,365,220,55,10); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='#fff'; ctx.font='bold 16px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,400);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(tf>60&&(document.activeElement!==canvas)&&(window.gameStart)) { startGame(); STATE='GAME'; }
}

function drawGameOver(){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff4444'; ctx.shadowBlur=20; ctx.fillStyle='#ff4444'; ctx.font='bold 32px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,175); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 48px "Press Start 2P",monospace'; ctx.fillText(score,W/2,252); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,268);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,296); }
  else { ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,296); }
  const ph=mX>W/2-115&&mX<W/2+115&&mY>326&&mY<380;
  ctx.fillStyle=ph?'#ff9944':'#ff7722'; ctx.beginPath(); ctx.roundRect(W/2-115,326,230,54,10); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 13px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,360);
  const mh=mX>W/2-90&&mX<W/2+90&&mY>394&&mY<438;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; ctx.beginPath(); ctx.roundRect(W/2-90,394,180,44,8); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,421);
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
    if(doShake){ ctx.save(); const s=shakeT*1.2; ctx.translate(Math.random()*s-s/2,Math.random()*s-s/2); }
    drawBg();
    halves.forEach(h=>drawFruitEmoji({...h,r:h.r,emoji:h.emoji,rot:h.rot},Math.max(0,h.life/40)));
    fruits.forEach(f=>drawFruitEmoji(f,1));
    drawFX(); drawBlade(); drawHUD();
    if(doShake) ctx.restore();
    update();
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
