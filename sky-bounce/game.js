'use strict';
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(typeof r==='object'?r[0]:r,w/2,h/2);this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath();};}
// ================================================================
// SKY BOUNCE — Doodle Jump style infinite climber
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 480, H = 700;
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
function tone(f,d,type='sine',vol=0.07,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxBounce(){ tone(330,0.06,'sine',0.07); tone(440,0.04,'sine',0.05,0.04); }
function sfxSpring(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.06,'triangle',0.09,i*0.04)); }
function sfxStar(){ [660,880,1100].forEach((f,i)=>tone(f,0.06,'triangle',0.08,i*0.05)); }
function sfxDie(){ tone(220,0.15,'sawtooth',0.12); tone(110,0.4,'sawtooth',0.15,0.12); }

// ---------------------------------------------------------------- Constants
const GRAVITY=0.45, BOUNCE_VY=-14, SPRING_VY=-22, PLAYER_W=28, PLAYER_H=28;
const PLAT_W_BASE=72, PLAT_H=14;

// Platform types
const PT={normal:0,moving:1,breaking:2,spring:3};
const PT_COL=['#44cc44','#44aaff','#ff8833','#ffd700'];

// ---------------------------------------------------------------- State
let STATE='TITLE';
let player, platforms, stars, particles, floats;
let camY, score, best=+(localStorage.getItem('sb_best')||0), frame, tf=0;
let highestY; // world-space Y of highest point reached (lower = higher)

function startGame(){
  camY=0; frame=0;
  highestY=H-100;
  // Player
  player={x:W/2-PLAYER_W/2,y:H-160,vx:0,vy:-8,alive:true,face:0};
  platforms=[]; stars=[]; particles=[]; floats=[];
  score=0;
  // Seed platforms
  platforms.push({x:W/2-PLAT_W_BASE/2,y:H-100,w:PLAT_W_BASE+40,type:PT.normal,vx:0,broken:false,breakT:0});
  for(let i=0;i<18;i++) spawnPlatform(H-120-i*60);
}

function spawnPlatform(worldY){
  const r=Math.random();
  let type=PT.normal;
  const d=Math.max(0,-worldY/500);
  if(r<0.05+d*0.08) type=PT.spring;
  else if(r<0.18+d*0.12) type=PT.breaking;
  else if(r<0.38+d*0.1) type=PT.moving;
  const pw=Math.max(44, PLAT_W_BASE - Math.max(0,-worldY/400));
  const vx=type===PT.moving?(1.5+Math.random()*1.5)*(Math.random()<0.5?1:-1):0;
  platforms.push({x:20+Math.random()*(W-40-pw),y:worldY,w:pw,type,vx,broken:false,breakT:0});
  // Occasional star collectible
  if(Math.random()<0.15) stars.push({x:20+Math.random()*(W-40),y:worldY-30,r:10,collected:false});
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=2+Math.random()*5; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:2+Math.random()*3,life:20+Math.random()*12}); }
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:44}); }

// ---------------------------------------------------------------- Update
function update(){
  frame++;

  // Movement
  const spd=4.5;
  if(keys['ArrowLeft']||keys['KeyA']) player.vx=-spd;
  else if(keys['ArrowRight']||keys['KeyD']) player.vx=spd;
  else player.vx+=(0-player.vx)*0.25;

  // Mouse: tilt towards cursor
  const mouseDir=(mX-(player.x+PLAYER_W/2));
  if(Math.abs(mouseDir)>20) player.vx+=mouseDir*0.015;
  player.vx=Math.max(-spd,Math.min(spd,player.vx));

  player.x+=player.vx;
  if(player.x<-PLAYER_W) player.x=W;
  if(player.x>W) player.x=-PLAYER_W;

  player.vy+=GRAVITY;
  player.y+=player.vy;

  // Platform collisions (only when falling down)
  if(player.vy>0){
    for(const p of platforms){
      if(p.broken) continue;
      const py=p.y-camY; // screen Y
      const px=player.y+PLAYER_H;
      // world space check
      if(player.y+PLAYER_H>p.y&&player.y+PLAYER_H<p.y+PLAT_H+16&&player.x+PLAYER_W>p.x&&player.x<p.x+p.w){
        if(p.type===PT.spring){ player.vy=SPRING_VY; sfxSpring(); spawnPfx(player.x+PLAYER_W/2,player.y+PLAYER_H,'#ffd700',8); }
        else { player.vy=BOUNCE_VY; sfxBounce(); spawnPfx(player.x+PLAYER_W/2,player.y+PLAYER_H,PT_COL[p.type],6); }
        if(p.type===PT.breaking){ p.broken=true; p.breakT=20; }
        break;
      }
    }
  }

  // Camera follows player up
  const threshold=H*0.38;
  if(player.y<camY+threshold) camY=player.y-threshold;

  // Track score
  const worldScore=Math.max(0,Math.floor(-(player.y)/40));
  if(worldScore>score) score=worldScore;
  if(score>best){ best=score; localStorage.setItem('sb_best',String(best)); }

  // Spawn new platforms above
  const topPlat=platforms.reduce((m,p)=>Math.min(m,p.y),Infinity);
  if(topPlat>camY-100) spawnPlatform(topPlat-55-Math.random()*30);

  // Remove platforms below camera
  platforms=platforms.filter(p=>p.y<camY+H+100);

  // Moving platforms
  platforms.forEach(p=>{ if(p.type===PT.moving){ p.x+=p.vx; if(p.x<0||p.x>W-p.w) p.vx*=-1; } if(p.broken&&--p.breakT<0) p.broken=true; });

  // Stars
  stars=stars.filter(s=>{ if(!s.collected&&Math.hypot(player.x+PLAYER_W/2-s.x,player.y+PLAYER_H/2-s.y)<s.r+12){ s.collected=true; sfxStar(); addFloat(s.x,s.y-camY-10,'+5','#ffd700'); score+=5; if(score>best){best=score;localStorage.setItem('sb_best',String(best));} spawnPfx(s.x,s.y-camY,'#ffd700',8); } return !s.collected&&s.y<camY+H+60; });

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.8; return --f.life>0; });

  // Death: fell off bottom
  if(player.y>camY+H+50){ sfxDie(); STATE='GAMEOVER'; }
}

// ---------------------------------------------------------------- Draw
function drawBg(){
  // Gradient sky that changes with height
  const alt=Math.max(0,Math.min(1,-camY/3000));
  const r1=Math.floor(20-alt*15),g1=Math.floor(20+alt*30),b1=Math.floor(60+alt*80);
  const r2=Math.floor(10-alt*5),g2=Math.floor(10+alt*10),b2=Math.floor(30+alt*40);
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,`rgb(${r1},${g1},${b1})`);
  g.addColorStop(1,`rgb(${r2},${g2},${b2})`);
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Cloud-like blobs (fixed positions in screen space shifted by camY mod)
  for(let i=0;i<6;i++){
    const cx=((i*137+50)%W), cy=((i*83+camY*0.08)%H+H)%H;
    ctx.globalAlpha=0.06+i%3*0.02; ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(cx,cy,40+i*8,18,0,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}

function drawPlatforms(){
  platforms.forEach(p=>{
    const sy=p.y-camY;
    if(sy>H+20||sy<-20) return;
    if(p.broken) return;
    const col=PT_COL[p.type];
    ctx.shadowColor=col; ctx.shadowBlur=p.type===PT.spring?16:8;
    const g=ctx.createLinearGradient(p.x,sy,p.x,sy+PLAT_H);
    g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0.4)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(p.x,sy,p.w,PLAT_H,5); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.roundRect(p.x+4,sy+2,p.w-8,4,2); ctx.fill();
    // Spring arrow
    if(p.type===PT.spring){ ctx.fillStyle='#fff'; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText('↑',p.x+p.w/2,sy+PLAT_H-2); ctx.textAlign='left'; }
  });
}

function drawStars(){
  stars.forEach(s=>{
    if(s.collected) return;
    const sy=s.y-camY;
    if(sy>H+20||sy<-20) return;
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=14;
    ctx.fillStyle='#ffd700'; ctx.font='16px serif'; ctx.textAlign='center'; ctx.fillText('⭐',s.x,sy); ctx.textAlign='left';
    ctx.shadowBlur=0;
  });
}

function drawPlayer(){
  const sx=player.x, sy=player.y-camY;
  if(sy>H+40) return;
  // Shadow
  ctx.globalAlpha=0.2; ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(sx+PLAYER_W/2,sy+PLAYER_H+4,PLAYER_W*0.4,5,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  // Body
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=14;
  ctx.fillStyle='#2277cc'; ctx.beginPath(); ctx.arc(sx+PLAYER_W/2,sy+PLAYER_H/2,PLAYER_W/2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#88ccff'; ctx.beginPath(); ctx.arc(sx+PLAYER_W/2,sy+PLAYER_H/2,PLAYER_W/2*0.6,0,Math.PI*2); ctx.fill();
  // Eyes
  const eyeX=sx+PLAYER_W/2+(player.vx>0?3:player.vx<0?-3:0);
  ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(eyeX-4,sy+PLAYER_H/2-2,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeX+4,sy+PLAYER_H/2-2,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(eyeX-3.5,sy+PLAYER_H/2-2,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(eyeX+4.5,sy+PLAYER_H/2-2,1.5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/24); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/14); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(0,0,W,48);
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,48); ctx.lineTo(W,48); ctx.stroke();
  ctx.textAlign='center'; ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.fillText(score,W/2,32); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('HEIGHT',W/2,44);
  ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-8,26);
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0a1428'); g.addColorStop(1,'#1a2850');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Sample platforms
  [[40,520,PT.normal],[200,440,PT.moving],[300,360,PT.breaking],[380,280,PT.spring]].forEach(([px,py,t])=>{
    const col=PT_COL[t]; ctx.shadowColor=col; ctx.shadowBlur=8;
    ctx.fillStyle=col; ctx.beginPath(); ctx.roundRect(px,py,80,PLAT_H,5); ctx.fill(); ctx.shadowBlur=0;
  });
  // Bouncing preview ball
  const by=360+Math.abs(Math.sin(tf*0.04))*160;
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=14;
  ctx.fillStyle='#2277cc'; ctx.beginPath(); ctx.arc(260,by,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#88ccff'; ctx.beginPath(); ctx.arc(260,by,8,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  ctx.textAlign='center';
  ctx.shadowColor='#44aaff'; ctx.shadowBlur=28; ctx.fillStyle='#44aaff'; ctx.font='bold 42px "Press Start 2P",monospace'; ctx.fillText('SKY',W/2,180); ctx.shadowBlur=0;
  ctx.shadowColor='#44ff88'; ctx.shadowBlur=22; ctx.fillStyle='#44ff88'; ctx.font='bold 42px "Press Start 2P",monospace'; ctx.fillText('BOUNCE',W/2,238); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('← → or MOUSE to guide — bounce UP forever!',W/2,266);
  // Platform legend
  ['NORMAL','MOVING','BREAKING','SPRING'].forEach((lbl,i)=>{ const col=PT_COL[i],lx=W/2-150+i*76,ly=290; ctx.fillStyle=col; ctx.beginPath(); ctx.roundRect(lx-22,ly,44,10,3); ctx.fill(); ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='6px monospace'; ctx.fillText(lbl,lx,ly+22); });
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,340); }
  const ph=mX>W/2-100&&mX<W/2+100&&tf>30;
  ctx.fillStyle=ph?'#55ff99':'#44cc77'; ctx.beginPath(); ctx.roundRect(W/2-100,366,200,52,10); ctx.fill();
  ctx.fillStyle='#020210'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,399);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(keys['Space']||keys['Enter']){ startGame(); STATE='GAME'; }
}

let mY2=H/2;
canvas.addEventListener('click',e=>{ const r=canvas.getBoundingClientRect(); mY2=(e.clientY-r.top)*(H/r.height); });

function drawGameOver(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0a1428'); g.addColorStop(1,'#1a2850');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff4444'; ctx.shadowBlur=18; ctx.fillStyle='#ff4444'; ctx.font='bold 28px "Press Start 2P",monospace'; ctx.fillText('FELL DOWN!',W/2,175); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText(score,W/2,252); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('HEIGHT',W/2,270);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,298); }
  else { ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,298); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY2>326&&mY2<378;
  ctx.fillStyle=ph?'#55ff99':'#44cc77'; ctx.beginPath(); ctx.roundRect(W/2-110,326,220,52,10); ctx.fill();
  ctx.fillStyle='#020210'; ctx.font='bold 11px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,358);
  const mh=mX>W/2-85&&mX<W/2+85&&mY2>392&&mY2<434;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; ctx.beginPath(); ctx.roundRect(W/2-85,392,170,42,8); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,418);
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
    drawBg(); drawPlatforms(); drawStars(); drawFX(); drawPlayer(); drawHUD();
    update();
    if(keys['Escape']) STATE='TITLE';
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
