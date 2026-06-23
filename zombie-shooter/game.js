'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=700,H=560;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};
let clickFrame=false,mX=W/2,mY=H/2;
function getPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
window.addEventListener('keydown',e=>{keys[e.code]=true;if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('mousemove',e=>{const p=getPos(e);mX=p.x;mY=p.y;});
canvas.addEventListener('click',e=>{const p=getPos(e);mX=p.x;mY=p.y;clickFrame=true;});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='square',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxShoot(){tone(660,0.04,'square',0.05);}
function sfxHit(){tone(220,0.05,'sawtooth',0.06);}
function sfxDie(){tone(100,0.3,'sawtooth',0.12);}
function sfxWave(){tone(440,0.1,'triangle',0.1);tone(550,0.08,'triangle',0.08,0.1);}

const WALL=30,PLAYER_SPD=3.8,BULLET_SPD=10,FIRE_RATE=12,Z_TYPES=[
  {hp:1,spd:1.5,r:14,col:'#44cc44',score:10,col2:'#226622'},
  {hp:3,spd:0.9,r:20,col:'#88aa22',score:25,col2:'#445511'},
  {hp:2,spd:2.4,r:11,col:'#ccaa00',score:20,col2:'#665500'},
  {hp:6,spd:0.5,r:28,col:'#cc4444',score:50,col2:'#661111'},
];

let STATE='TITLE',player,zombies,bullets,score,best=+(localStorage.getItem('zs_best')||0),frame,wave,waveCD,hp,maxHp,fireCD,particles=[],floats=[],shake=0,tf=0;

function startGame(){
  player={x:W/2,y:H/2,angle:0};zombies=[];bullets=[];score=0;frame=0;wave=0;waveCD=0;hp=5;maxHp=5;fireCD=0;particles=[];floats=[];shake=0;
  spawnWave();
}

function spawnWave(){
  wave++;sfxWave();
  const n=5+wave*3,types=wave>=3?4:wave>=2?3:2;
  for(let i=0;i<n;i++){
    const side=Math.floor(Math.random()*4);
    let x,y;
    if(side===0){x=Math.random()*W;y=WALL;}
    else if(side===1){x=Math.random()*W;y=H-WALL;}
    else if(side===2){x=WALL;y=Math.random()*H;}
    else{x=W-WALL;y=Math.random()*H;}
    const t=Z_TYPES[Math.min(Math.floor(Math.random()*types),types-1)];
    zombies.push({x,y,hp:t.hp+Math.floor(wave/3),maxHp:t.hp+Math.floor(wave/3),spd:t.spd,r:t.r,col:t.col,col2:t.col2,sc:t.score,wobble:Math.random()*Math.PI*2});
  }
}

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*7;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:3+Math.random()*5,life:16+Math.random()*12});}}
function addFloat(x,y,t,col){floats.push({x,y,txt:t,col,life:44});}

function autoShoot(){
  if(fireCD>0){fireCD--;return;}
  if(!zombies.length)return;
  // Find nearest zombie
  let nearest=null,nearD=Infinity;
  zombies.forEach(z=>{const d=Math.hypot(z.x-player.x,z.y-player.y);if(d<nearD){nearD=d;nearest=z;}});
  if(!nearest||nearD>350)return;
  const a=Math.atan2(nearest.y-player.y,nearest.x-player.x);
  bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*BULLET_SPD,vy:Math.sin(a)*BULLET_SPD});
  sfxShoot();fireCD=FIRE_RATE;player.angle=a;
}

function update(){
  frame++;waveCD=Math.max(0,waveCD-1);
  // Player movement
  const mv=PLAYER_SPD;
  if(keys['ArrowLeft']||keys['KeyA'])player.x=Math.max(WALL+14,player.x-mv);
  if(keys['ArrowRight']||keys['KeyD'])player.x=Math.min(W-WALL-14,player.x+mv);
  if(keys['ArrowUp']||keys['KeyW'])player.y=Math.max(WALL+14,player.y-mv);
  if(keys['ArrowDown']||keys['KeyS'])player.y=Math.min(H-WALL-14,player.y+mv);

  autoShoot();

  // Bullets
  bullets=bullets.filter(b=>{
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<WALL||b.x>W-WALL||b.y<WALL||b.y>H-WALL)return false;
    for(let i=zombies.length-1;i>=0;i--){
      const z=zombies[i];
      if(Math.hypot(b.x-z.x,b.y-z.y)<z.r){
        z.hp--;sfxHit();spawnPfx(z.x,z.y,z.col,3);
        if(z.hp<=0){score+=z.sc;addFloat(z.x,z.y,'+'+z.sc,'#ffd700');spawnPfx(z.x,z.y,z.col,10);if(score>best){best=score;localStorage.setItem('zs_best',String(best));}zombies.splice(i,1);}
        return false;
      }
    }
    return true;
  });

  // Zombies
  zombies.forEach(z=>{
    z.wobble+=0.08;
    const a=Math.atan2(player.y-z.y,player.x-z.x);
    z.x+=Math.cos(a)*z.spd;z.y+=Math.sin(a)*z.spd;
    z.x=Math.max(WALL+z.r,Math.min(W-WALL-z.r,z.x));
    z.y=Math.max(WALL+z.r,Math.min(H-WALL-z.r,z.y));
    if(Math.hypot(z.x-player.x,z.y-player.y)<z.r+14){
      hp--;shake=8;sfxDie();spawnPfx(player.x,player.y,'#ff4444',6);
      zombies=zombies.filter(zz=>zz!==z);
      if(hp<=0){if(score>best){best=score;localStorage.setItem('zs_best',String(best));}STATE='GAMEOVER';}
    }
  });

  if(!zombies.length&&!waveCD){waveCD=120;setTimeout(()=>{if(STATE==='GAME')spawnWave();},600);}

  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;return --p.life>0;});
  floats=floats.filter(f=>{f.y-=0.8;return --f.life>0;});
  if(shake>0)shake--;
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#0a1a08');g.addColorStop(1,'#121a10');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Grid floor
  ctx.strokeStyle='rgba(255,255,255,0.025)';ctx.lineWidth=1;
  for(let x=WALL;x<=W-WALL;x+=40){ctx.beginPath();ctx.moveTo(x,WALL);ctx.lineTo(x,H-WALL);ctx.stroke();}
  for(let y=WALL;y<=H-WALL;y+=40){ctx.beginPath();ctx.moveTo(WALL,y);ctx.lineTo(W-WALL,y);ctx.stroke();}
  // Walls
  ctx.fillStyle='#1e2e1a';ctx.fillRect(0,0,W,WALL);ctx.fillRect(0,H-WALL,W,WALL);ctx.fillRect(0,0,WALL,H);ctx.fillRect(W-WALL,0,WALL,H);
  ctx.strokeStyle='#44cc44';ctx.lineWidth=2;ctx.strokeRect(WALL,WALL,W-WALL*2,H-WALL*2);
}

function drawZombie(z){
  const wobX=Math.sin(z.wobble)*3;
  ctx.save();ctx.translate(z.x+wobX,z.y);
  // Body
  ctx.shadowColor=z.col;ctx.shadowBlur=8;
  const g=ctx.createRadialGradient(0,-z.r*0.3,z.r*0.1,0,0,z.r);g.addColorStop(0,z.col);g.addColorStop(1,z.col2);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,z.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  // Eyes
  ctx.fillStyle='#ff4444';ctx.beginPath();ctx.arc(-z.r*0.3,-z.r*0.2,z.r*0.18,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(z.r*0.3,-z.r*0.2,z.r*0.18,0,Math.PI*2);ctx.fill();
  // HP bar
  if(z.hp<z.maxHp){const bw=z.r*2,bh=4;ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(-bw/2,z.r+3,bw,bh);ctx.fillStyle='#ff4444';ctx.fillRect(-bw/2,z.r+3,bw*(z.hp/z.maxHp),bh);}
  ctx.restore();
}

function drawPlayer(){
  ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.angle+Math.PI/2);
  ctx.shadowColor='#44aaff';ctx.shadowBlur=14;
  ctx.fillStyle='#44aaff';ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.beginPath();ctx.arc(-3,-3,5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#88ddff';ctx.fillRect(-4,8,8,14);
  ctx.shadowBlur=0;ctx.restore();
}

function drawFX(){
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/20);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  bullets.forEach(b=>{ctx.shadowColor='#ffdd44';ctx.shadowBlur=8;ctx.fillStyle='#ffdd44';ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();});ctx.shadowBlur=0;
  floats.forEach(f=>{ctx.globalAlpha=Math.min(1,f.life/14);ctx.font='bold 9px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x,f.y);});ctx.globalAlpha=1;ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,44);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,28);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,40);
  ctx.textAlign='left';ctx.fillStyle='#44cc44';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('WAVE '+wave,10,28);
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('ZOMBIES: '+zombies.length,10,40);
  // HP
  ctx.textAlign='right';ctx.fillStyle='#ff4444';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('HP:',W-90,28);
  for(let i=0;i<maxHp;i++){ctx.fillStyle=i<hp?'#ff4444':'rgba(255,68,68,0.2)';ctx.fillRect(W-78+i*14,18,10,12);}
  ctx.textAlign='left';
  ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.textAlign='right';ctx.fillText('BEST: '+best,W-10,40);ctx.textAlign='left';
}

function drawOverlay(title,sc,nb){
  ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#44cc44';ctx.shadowColor='#44cc44';ctx.shadowBlur=22;ctx.font='bold 26px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-80);ctx.shadowBlur=0;
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.shadowBlur=12;ctx.font='bold 40px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2-10);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,H/2+10);}
  if(nb){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+36);}
  else if(best>0&&sc!==undefined){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
  if(sc===undefined){ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('WASD / ARROWS to move',W/2,H/2+20);ctx.fillText('AUTO-AIM — SURVIVE THE WAVES!',W/2,H/2+38);}
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('CLICK to '+(title==='GAME OVER'?'restart':'play'),W/2,H/2+72);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  const sx=shake?(Math.random()-0.5)*shake:0,sy=shake?(Math.random()-0.5)*shake:0;
  ctx.save();if(shake)ctx.translate(sx,sy);
  ctx.clearRect(-10,-10,W+20,H+20);
  if(STATE==='TITLE'){drawBg();drawOverlay('ZOMBIE SHOOTER',undefined,false);if(click||keys['Space']||keys['Enter']){startGame();STATE='GAME';}}
  else if(STATE==='GAME'){drawBg();zombies.forEach(drawZombie);drawPlayer();drawFX();drawHUD();update();}
  else if(STATE==='GAMEOVER'){drawBg();zombies.forEach(drawZombie);drawFX();drawHUD();drawOverlay('GAME OVER',score,score>=best&&score>0);if(click||keys['Space']||keys['Enter']){startGame();STATE='GAME';}}
  ctx.restore();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
