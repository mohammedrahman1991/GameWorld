'use strict';
// ================================================================
// SPACE BLASTER — Top-down shooter, waves, bosses, power-ups
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 700, H = 620;
canvas.width = W; canvas.height = H;

function resize(){
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width = Math.floor(W*s)+'px'; canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
const keys={};
let mX=W/2, mY=H/2, clickFrame=false;
window.addEventListener('keydown',e=>{ keys[e.code]=true; if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault(); });
window.addEventListener('keyup',e=>{ keys[e.code]=false; });
canvas.addEventListener('mousemove',e=>{ const r=canvas.getBoundingClientRect(); mX=(e.clientX-r.left)*(W/r.width); mY=(e.clientY-r.top)*(H/r.height); });
canvas.addEventListener('click',e=>{ const r=canvas.getBoundingClientRect(); mX=(e.clientX-r.left)*(W/r.width); mY=(e.clientY-r.top)*(H/r.height); clickFrame=true; });

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='square',vol=0.07,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxShoot(){ tone(660,0.04,'square',0.05); }
function sfxSpread(){ [660,720,600].forEach((f,i)=>tone(f,0.04,'square',0.04,i*0.02)); }
function sfxHit(){ tone(300,0.06,'sawtooth',0.07); }
function sfxExplode(){ tone(120,0.3,'sawtooth',0.13); tone(80,0.4,'sawtooth',0.1,0.08); }
function sfxPowerup(){ [523,659,784,1047].forEach((f,i)=>tone(f,0.07,'triangle',0.09,i*0.07)); }
function sfxDie(){ tone(180,0.2,'sawtooth',0.15); tone(90,0.5,'sawtooth',0.18,0.1); }
function sfxLevelUp(){ [440,550,660,880].forEach((f,i)=>tone(f,0.09,'triangle',0.11,i*0.08)); }

// ---------------------------------------------------------------- Constants
const PLAYER_SPD=5.5, PLAYER_R=14, SHOOT_CD=14, BULLET_SPD=13;
const STARS=[];
for(let i=0;i<120;i++) STARS.push({x:Math.random()*W,y:Math.random()*H,s:0.5+Math.random()*2,speed:0.3+Math.random()*0.8,bright:Math.random()});

// ---------------------------------------------------------------- State
let STATE='TITLE';
let player, bullets, enemies, enemyBullets, particles, floats, powerups;
let score, best=+(localStorage.getItem('sbl_best')||0), lives, wave, frame;
let waveState, waveTimer, shootTimer, spreadT=0, shieldT=0, rapidT=0;
let bossHp=0, bossMaxHp=0;
let tf=0, shakeT=0;

function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }

function startGame(){
  player={x:W/2,y:H-70,r:PLAYER_R,invT:0};
  bullets=[]; enemies=[]; enemyBullets=[]; particles=[]; floats=[]; powerups=[];
  score=0; lives=3; wave=0; frame=0; waveState='between'; waveTimer=60;
  shootTimer=0; spreadT=0; shieldT=0; rapidT=0;
}

function spawnPfx(x,y,col,n,spd){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=(spd||4)+Math.random()*6; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:2+Math.random()*4,life:18+Math.random()*16}); }
}

function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:48}); }

function spawnWave(){
  wave++;
  const isBoss=wave%5===0;
  if(isBoss){
    bossMaxHp=20+wave*5; bossHp=bossMaxHp;
    enemies.push({x:W/2,y:-60,vx:1.5,vy:0.7,r:44,hp:bossMaxHp,maxHp:bossMaxHp,type:'boss',shootT:0,phase:0,pts:200+wave*50});
  } else {
    const count=4+wave*2;
    const types=['drone','zigzag','tank','kamikaze'];
    for(let i=0;i<count;i++){
      const t=types[Math.min(Math.floor(wave/2),types.length-1)<=1?Math.floor(Math.random()*(Math.floor(wave/2)+1)):Math.floor(Math.random()*Math.min(wave,types.length))];
      enemies.push({x:30+Math.random()*(W-60),y:-40-i*45,vx:(Math.random()-0.5)*2.5,vy:1.2+Math.random()*1+wave*0.15,r:18,hp:t==='tank'?3:1,maxHp:t==='tank'?3:1,type:t,shootT:Math.random()*80,pts:10+wave*5,wobble:0,wobbleSpd:0.04+Math.random()*0.04});
    }
  }
  waveState='fighting';
}

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  if(spreadT>0) spreadT--;
  if(shieldT>0) shieldT--;
  if(rapidT>0) rapidT--;
  if(player.invT>0) player.invT--;
  if(shakeT>0) shakeT--;

  // Scroll stars
  STARS.forEach(s=>{ s.y+=s.speed; if(s.y>H) s.y=-2; });

  // Wave logic
  if(waveState==='between'){ if(--waveTimer<=0) spawnWave(); return; }

  // Autofire
  const cd=rapidT>0?6:SHOOT_CD;
  if(++shootTimer>=cd||(keys['Space']&&shootTimer>=cd/2)){
    shootTimer=0; sfxShoot();
    if(spreadT>0){ sfxSpread(); [-0.25,0,0.25].forEach(a=>bullets.push({x:player.x,y:player.y-PLAYER_R,vx:Math.sin(a)*BULLET_SPD,vy:-Math.cos(a)*BULLET_SPD,r:4,col:'#44ddff'})); }
    else bullets.push({x:player.x,y:player.y-PLAYER_R,vx:0,vy:-BULLET_SPD,r:4,col:'#44ddff'});
  }

  // Player movement
  const spd=PLAYER_SPD;
  if(keys['ArrowLeft']||keys['KeyA']) player.x=Math.max(PLAYER_R,player.x-spd);
  if(keys['ArrowRight']||keys['KeyD']) player.x=Math.min(W-PLAYER_R,player.x+spd);
  if(keys['ArrowUp']||keys['KeyW']) player.y=Math.max(H/2,player.y-spd);
  if(keys['ArrowDown']||keys['KeyS']) player.y=Math.min(H-PLAYER_R,player.y+spd);

  // Bullets
  bullets=bullets.filter(b=>{ b.x+=b.vx; b.y+=b.vy; if(b.y<-10||b.x<-10||b.x>W+10) return false;
    for(let i=enemies.length-1;i>=0;i--){
      const e=enemies[i]; if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+b.r){
        e.hp--; sfxHit(); spawnPfx(b.x,b.y,'#44ddff',5);
        if(e.hp<=0){ sfxExplode(); spawnPfx(e.x,e.y,'#ff8833',18,6); addFloat(e.x,e.y,'+'+e.pts,'#ffd700'); score+=e.pts; if(score>best){best=score;localStorage.setItem('sbl_best',String(best));} tryDropPowerup(e.x,e.y); enemies.splice(i,1); shakeT=4; }
        return false;
      }
    } return true;
  });

  // Enemies
  enemies.forEach(e=>{
    if(e.type==='drone'){ e.y+=e.vy; e.x+=e.vx; if(e.x<e.r||e.x>W-e.r) e.vx*=-1; }
    else if(e.type==='zigzag'){ e.wobble+=e.wobbleSpd; e.y+=e.vy; e.x+=Math.sin(e.wobble)*4; }
    else if(e.type==='tank'){ e.y+=e.vy*0.5; e.x+=e.vx*0.5; if(e.x<e.r||e.x>W-e.r) e.vx*=-1; }
    else if(e.type==='kamikaze'){ const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1; e.x+=dx/d*3.5; e.y+=dy/d*3.5; }
    else if(e.type==='boss'){
      e.x+=e.vx; e.y+=Math.min(0.5,e.vy); if(e.y>90) e.vy*=-1; if(e.y<30) e.vy=Math.abs(e.vy);
      if(e.x<e.r||e.x>W-e.r) e.vx*=-1;
      if(++e.shootT>25){ e.shootT=0; const angles=e.phase===0?[Math.PI/2]:[-Math.PI/4,Math.PI/2,Math.PI*5/4].map(a=>a+e.phase*0.3); angles.forEach(a=>enemyBullets.push({x:e.x,y:e.y+e.r,vx:Math.cos(a)*3.5,vy:Math.sin(a)*3.5,r:5,col:'#ff4444'})); e.phase=(e.phase+1)%6; }
    }
    // shoot (non-boss)
    if(e.type!=='boss'&&e.type!=='kamikaze'){
      if(--e.shootT<0){ e.shootT=50+Math.random()*60; const dy=player.y-e.y,dx=player.x-e.x,d=Math.hypot(dx,dy)||1; enemyBullets.push({x:e.x,y:e.y,vx:dx/d*3,vy:dy/d*3,r:4,col:'#ff6644'}); }
    }
  });
  enemies=enemies.filter(e=>{
    if(e.y>H+80) return false;
    // Collide with player
    if(player.invT===0&&Math.hypot(e.x-player.x,e.y-player.y)<e.r+PLAYER_R){ hitPlayer(); return false; }
    return true;
  });

  // Enemy bullets
  enemyBullets=enemyBullets.filter(b=>{ b.x+=b.vx; b.y+=b.vy; if(b.y>H+10||b.x<-10||b.x>W+10||b.y<-10) return false;
    if(player.invT===0&&Math.hypot(b.x-player.x,b.y-player.y)<PLAYER_R+b.r){ hitPlayer(); return false; }
    return true;
  });

  // Power-ups
  powerups=powerups.filter(pu=>{ pu.y+=1.5; if(pu.y>H+20) return false;
    if(Math.hypot(pu.x-player.x,pu.y-player.y)<PLAYER_R+pu.r){ sfxPowerup(); addFloat(pu.x,pu.y,pu.label,pu.col);
      if(pu.type==='spread') spreadT=360;
      if(pu.type==='rapid') rapidT=360;
      if(pu.type==='shield') shieldT=360;
      if(pu.type==='nuke'){ enemies.forEach(e=>{ spawnPfx(e.x,e.y,'#ffaa00',12); score+=e.pts; }); enemies=[]; addFloat(W/2,H/2,'NUKE!','#ff8800'); shakeT=20; }
      if(pu.type==='life') lives=Math.min(5,lives+1);
      return false;
    }
    return true;
  });

  if(enemies.length===0&&waveState==='fighting'){ sfxLevelUp(); waveState='between'; waveTimer=90; }

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.1; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.9; return --f.life>0; });
}

function hitPlayer(){
  if(shieldT>0){ shieldT=0; sfxHit(); player.invT=80; addFloat(player.x,player.y-20,'SHIELD!','#44aaff'); shakeT=6; return; }
  sfxDie(); lives--; player.invT=120; shakeT=14; spawnPfx(player.x,player.y,'#ff4444',20);
  if(lives<=0){ if(score>best){best=score;localStorage.setItem('sbl_best',String(best));} STATE='GAMEOVER'; }
}

function tryDropPowerup(x,y){
  if(Math.random()>0.3) return;
  const pool=[{type:'spread',col:'#ff8833',sym:'✶',label:'SPREAD'},{type:'rapid',col:'#44ddff',sym:'⚡',label:'RAPID'},{type:'shield',col:'#44aaff',sym:'🛡',label:'SHIELD'},{type:'nuke',col:'#ff4400',sym:'💥',label:'NUKE!'},{type:'life',col:'#ff4466',sym:'♥',label:'+LIFE'}];
  const pu=pool[Math.floor(Math.random()*pool.length)];
  powerups.push({x,y,...pu,r:12});
}

// ---------------------------------------------------------------- Draw
function drawBg(){
  ctx.fillStyle='#020210'; ctx.fillRect(0,0,W,H);
  STARS.forEach(s=>{ ctx.globalAlpha=0.3+s.bright*0.6; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
}

function drawShip(x,y,alpha){
  ctx.save(); ctx.globalAlpha=alpha||1; ctx.translate(x,y);
  // Engine glow
  ctx.shadowColor='#44ddff'; ctx.shadowBlur=22;
  // Body
  ctx.fillStyle='#2277cc'; ctx.beginPath(); ctx.moveTo(0,-18); ctx.lineTo(12,10); ctx.lineTo(0,5); ctx.lineTo(-12,10); ctx.closePath(); ctx.fill();
  // Cockpit
  ctx.fillStyle='#88eeff'; ctx.beginPath(); ctx.arc(0,-5,6,0,Math.PI*2); ctx.fill();
  // Wings
  ctx.fillStyle='#114488'; ctx.beginPath(); ctx.moveTo(-12,10); ctx.lineTo(-22,16); ctx.lineTo(-8,10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(12,10); ctx.lineTo(22,16); ctx.lineTo(8,10); ctx.closePath(); ctx.fill();
  // Engine flame
  ctx.shadowColor='#ff8833'; ctx.shadowBlur=16;
  ctx.fillStyle='#ff8833'; ctx.beginPath(); ctx.moveTo(-5,10); ctx.lineTo(5,10); ctx.lineTo(0,10+8+Math.random()*6); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.restore();
}

function drawEnemies(){
  enemies.forEach(e=>{
    ctx.save(); ctx.translate(e.x,e.y);
    const frac=e.hp/e.maxHp;
    if(e.type==='boss'){
      ctx.shadowColor='#ff4444'; ctx.shadowBlur=24;
      // body
      ctx.fillStyle='#881122'; ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff2244'; ctx.beginPath(); ctx.arc(0,0,e.r*0.6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff6600'; ctx.beginPath(); ctx.arc(0,0,e.r*0.25,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      // hp bar above
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(-e.r,-e.r-14,e.r*2,8);
      ctx.fillStyle='#ff4444'; ctx.fillRect(-e.r,-e.r-14,e.r*2*frac,8);
    } else if(e.type==='tank'){
      ctx.shadowColor='#aa44ff'; ctx.shadowBlur=14;
      ctx.fillStyle='#441166'; ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill();
      for(let i=0;i<frac*3;i++){ ctx.fillStyle='#cc55ff'; ctx.beginPath(); ctx.arc(0,0,e.r*(0.3+i*0.2),0,Math.PI*2); ctx.fill(); }
      ctx.shadowBlur=0;
    } else if(e.type==='kamikaze'){
      ctx.shadowColor='#ff8833'; ctx.shadowBlur=12;
      ctx.fillStyle='#cc4400'; ctx.beginPath(); ctx.moveTo(0,-e.r); ctx.lineTo(e.r*0.8,e.r*0.7); ctx.lineTo(-e.r*0.8,e.r*0.7); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    } else {
      ctx.shadowColor='#44ff88'; ctx.shadowBlur=12;
      ctx.fillStyle='#116622'; ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#44ff88'; ctx.beginPath(); ctx.arc(0,0,e.r*0.5,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
    ctx.restore();
  });
}

function drawBullets(){
  bullets.forEach(b=>{ ctx.shadowColor=b.col; ctx.shadowBlur=10; ctx.fillStyle=b.col; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); });
  enemyBullets.forEach(b=>{ ctx.shadowColor=b.col; ctx.shadowBlur=10; ctx.fillStyle=b.col; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); });
  ctx.shadowBlur=0;
}

function drawPowerups(){
  powerups.forEach(pu=>{ ctx.shadowColor=pu.col; ctx.shadowBlur=12; ctx.fillStyle=pu.col; ctx.beginPath(); ctx.arc(pu.x,pu.y,pu.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.fillText(pu.sym,pu.x,pu.y+4); ctx.textAlign='left'; ctx.shadowBlur=0; });
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/28); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/16); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(2,2,16,0.75)'; ctx.fillRect(0,0,W,50);
  ctx.strokeStyle='rgba(100,180,255,0.15)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,50); ctx.lineTo(W,50); ctx.stroke();
  // lives
  ctx.font='16px monospace'; ctx.textAlign='left';
  for(let i=0;i<lives;i++) ctx.fillText('❤️',10+i*24,32);
  // score
  ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillText(score,W/2,32); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,44);
  // wave + best
  ctx.textAlign='right'; ctx.fillStyle='#44ddff'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('WAVE '+wave,W-8,22);
  ctx.fillStyle='#ffd700'; ctx.fillText('BEST '+best,W-8,36);
  // power indicators
  ctx.textAlign='left';
  if(spreadT>0){ ctx.fillStyle='#ff8833'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('✶ '+Math.ceil(spreadT/60)+'s',10,46); }
  if(rapidT>0){ ctx.fillStyle='#44ddff'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('⚡ '+Math.ceil(rapidT/60)+'s',60,46); }
  if(shieldT>0){ ctx.fillStyle='#44aaff'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('🛡 '+Math.ceil(shieldT/60)+'s',110,46); }
  // Between waves message
  if(waveState==='between'){ ctx.textAlign='center'; ctx.fillStyle='#44ddff'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('WAVE '+(wave+1)+' INCOMING...',W/2,H/2); ctx.textAlign='left'; }
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  drawBg();
  // Decorative enemies
  [[120,200,'#44ff88'],[350,280,'#aa44ff'],[580,200,'#ff4444']].forEach(([ex,ey,col],i)=>{
    const oy=Math.sin(tf*0.04+i*1.2)*15;
    ctx.save(); ctx.translate(ex,ey+oy); ctx.shadowColor=col; ctx.shadowBlur=16;
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.restore();
  });
  drawShip(W/2,360);
  ctx.textAlign='center';
  ctx.shadowColor='#44ddff'; ctx.shadowBlur=28; ctx.fillStyle='#44ddff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText('SPACE',W/2,200); ctx.shadowBlur=0;
  ctx.shadowColor='#ff8833'; ctx.shadowBlur=22; ctx.fillStyle='#ff8833'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText('BLASTER',W/2,258); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('SHOOT WAVES OF ALIENS — SURVIVE THE BOSS',W/2,288);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,314); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY>420&&mY<476;
  ctx.shadowColor='#44ddff'; ctx.shadowBlur=ph?20:8;
  ctx.fillStyle=ph?'#55eeff':'#44bbcc'; rr(W/2-110,420,220,56,10); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='#020210'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,456);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(keys['Space']||keys['Enter']){ startGame(); STATE='GAME'; }
}

function drawGameOver(){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff4444'; ctx.shadowBlur=20; ctx.fillStyle='#ff4444'; ctx.font='bold 30px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,175); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText(score,W/2,250); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,268);
  ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('REACHED WAVE '+wave,W/2,290);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,318); }
  else { ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,318); }
  const ph=mX>W/2-115&&mX<W/2+115&&mY>345&&mY<398;
  ctx.fillStyle=ph?'#55eeff':'#44bbcc'; rr(W/2-115,345,230,53,10); ctx.fill();
  ctx.fillStyle='#020210'; ctx.font='bold 11px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,379);
  const mh=mX>W/2-90&&mX<W/2+90&&mY>412&&mY<455;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; rr(W/2-90,412,180,43,8); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,438);
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
    if(doShake){ ctx.save(); const s=shakeT; ctx.translate(Math.random()*s-s/2,Math.random()*s-s/2); }
    drawBg(); drawEnemies(); drawPowerups(); drawBullets(); drawFX();
    // Shield ring
    if(shieldT>0){ ctx.shadowColor='#44aaff'; ctx.shadowBlur=18; ctx.strokeStyle=`rgba(68,170,255,${0.3+Math.sin(frame*0.15)*0.2})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(player.x,player.y,PLAYER_R+10,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0; }
    if(player.invT===0||Math.floor(player.invT/6)%2===0) drawShip(player.x,player.y,1);
    drawHUD();
    if(doShake) ctx.restore();
    update();
    if(keys['Escape']){ STATE='TITLE'; }
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
