'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=560,H=480;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',()=>clickFrame=true);
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxShoot(){tone(330,0.05,'square',0.06);}
function sfxExplode(){tone(100,0.2,'sawtooth',0.12);}
function sfxHit(){tone(220,0.08,'sawtooth',0.08);}

const WALL=24,TANK_R=18,BULLET_SPD=8,FIRE_CD=20;
let STATE='TITLE',player,enemies,bullets,eBullets,particles,score,best=+(localStorage.getItem('tb_best')||0),frame,fireT=0,wave=0,tf=0;

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*6;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:3+Math.random()*5,life:18+Math.random()*12});}}

function spawnWave(){
  wave++;const count=2+wave;
  for(let i=0;i<count;i++){
    let x,y;
    do{x=WALL+Math.random()*(W-2*WALL);y=WALL+Math.random()*(H/2);}while(Math.hypot(x-player.x,y-player.y)<120);
    enemies.push({x,y,angle:Math.PI/2,hp:wave>3?2:1,maxHp:wave>3?2:1,col:wave>5?'#ff4444':wave>2?'#ff8844':'#ffcc44',fireT:60+Math.random()*80});
  }
}

function startGame(){
  player={x:W/2,y:H-80,angle:-Math.PI/2,hp:5,maxHp:5};
  enemies=[];bullets=[];eBullets=[];particles=[];score=0;frame=0;fireT=0;wave=0;
  spawnWave();STATE='GAME';
}

function update(){
  frame++;fireT=Math.max(0,fireT-1);
  const SPD=3,ROT=0.055;
  if(keys['ArrowLeft']||keys['KeyA'])player.angle-=ROT;
  if(keys['ArrowRight']||keys['KeyD'])player.angle+=ROT;
  if(keys['ArrowUp']||keys['KeyW']){player.x+=Math.cos(player.angle)*SPD;player.y+=Math.sin(player.angle)*SPD;}
  if(keys['ArrowDown']||keys['KeyS']){player.x-=Math.cos(player.angle)*SPD;player.y-=Math.sin(player.angle)*SPD;}
  player.x=Math.max(WALL+TANK_R,Math.min(W-WALL-TANK_R,player.x));
  player.y=Math.max(WALL+TANK_R,Math.min(H-WALL-TANK_R,player.y));

  if((keys['Space']||keys['KeyZ'])&&fireT===0){
    fireT=FIRE_CD;sfxShoot();
    bullets.push({x:player.x+Math.cos(player.angle)*TANK_R,y:player.y+Math.sin(player.angle)*TANK_R,vx:Math.cos(player.angle)*BULLET_SPD,vy:Math.sin(player.angle)*BULLET_SPD});
  }

  bullets=bullets.filter(b=>{
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<WALL||b.x>W-WALL||b.y<WALL||b.y>H-WALL)return false;
    for(let i=enemies.length-1;i>=0;i--){
      if(Math.hypot(b.x-enemies[i].x,b.y-enemies[i].y)<TANK_R+4){
        sfxHit();enemies[i].hp--;spawnPfx(b.x,b.y,'#ffcc44',6);
        if(enemies[i].hp<=0){sfxExplode();score+=10*wave;spawnPfx(enemies[i].x,enemies[i].y,'#ff8844',14);enemies.splice(i,1);if(score>best){best=score;localStorage.setItem('tb_best',String(best));}}
        return false;
      }
    }
    return true;
  });

  enemies.forEach(e=>{
    const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy);
    e.angle=Math.atan2(dy,dx);
    if(dist>TANK_R*2.5){e.x+=dx/dist*1.2;e.y+=dy/dist*1.2;}
    e.x=Math.max(WALL+TANK_R,Math.min(W-WALL-TANK_R,e.x));e.y=Math.max(WALL+TANK_R,Math.min(H-WALL-TANK_R,e.y));
    e.fireT--;
    if(e.fireT<=0){e.fireT=80+Math.random()*60;eBullets.push({x:e.x+Math.cos(e.angle)*TANK_R,y:e.y+Math.sin(e.angle)*TANK_R,vx:Math.cos(e.angle)*5,vy:Math.sin(e.angle)*5});}
  });

  eBullets=eBullets.filter(b=>{
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<WALL||b.x>W-WALL||b.y<WALL||b.y>H-WALL)return false;
    if(Math.hypot(b.x-player.x,b.y-player.y)<TANK_R+4){
      sfxHit();player.hp--;spawnPfx(b.x,b.y,'#ff4444',6);if(player.hp<=0){sfxExplode();STATE='GAMEOVER';}return false;
    }
    return true;
  });

  if(enemies.length===0)spawnWave();
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;return --p.life>0;});
}

function drawTank(x,y,angle,col,hp,maxHp){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(0,0,TANK_R,TANK_R*0.72,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(-TANK_R,-4,TANK_R*2,8);
  ctx.fillStyle=col;ctx.fillRect(-TANK_R*0.28,-4,TANK_R*1.0,8);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(TANK_R*0.2,-TANK_R*0.18,TANK_R*0.8,TANK_R*0.36);
  ctx.restore();
  // HP bar
  if(maxHp>1){const bw=32;ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(x-bw/2,y-TANK_R-10,bw,5);ctx.fillStyle='#44ff88';ctx.fillRect(x-bw/2,y-TANK_R-10,bw*(hp/maxHp),5);}
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#2a4a2a';ctx.fillRect(0,0,W,H);
  // Grid
  ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // Walls
  ctx.fillStyle='#556644';ctx.fillRect(0,0,W,WALL);ctx.fillRect(0,H-WALL,W,WALL);ctx.fillRect(0,0,WALL,H);ctx.fillRect(W-WALL,0,WALL,H);
  ctx.strokeStyle='#778855';ctx.lineWidth=2;ctx.strokeRect(WALL,WALL,W-2*WALL,H-2*WALL);
  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(W/2-180,H/2-100,360,220);
    ctx.fillStyle='#88cc44';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('TANK BATTLE',W/2,H/2-54);
    ctx.fillStyle='#fff';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('DESTROY ALL ENEMY TANKS!',W/2,H/2-22);ctx.fillText('ARROWS to move & rotate',W/2,H/2-2);ctx.fillText('SPACE to shoot',W/2,H/2+18);
    if(best>0){ctx.fillStyle='#88cc44';ctx.fillText('BEST: '+best,W/2,H/2+44);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillText('CLICK to start',W/2,H/2+76);
    if(click||keys['Space'])startGame();
  } else if(STATE==='GAME'){
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/20);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    enemies.forEach(e=>drawTank(e.x,e.y,e.angle,e.col,e.hp,e.maxHp));
    drawTank(player.x,player.y,player.angle,'#44aaff',player.hp,player.maxHp);
    bullets.forEach(b=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();});
    eBullets.forEach(b=>{ctx.fillStyle='#ff6600';ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='left';for(let i=0;i<player.hp;i++){ctx.fillStyle='#44ff88';ctx.fillRect(8+i*16,10,12,14);}
    ctx.textAlign='right';ctx.fillStyle='#88cc44';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('WAVE '+wave,W-8,22);ctx.textAlign='left';
    if(click&&fireT===0){fireT=FIRE_CD;sfxShoot();bullets.push({x:player.x+Math.cos(player.angle)*TANK_R,y:player.y+Math.sin(player.angle)*TANK_R,vx:Math.cos(player.angle)*BULLET_SPD,vy:Math.sin(player.angle)*BULLET_SPD});}
    update();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff4444';ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('TANK DESTROYED!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
