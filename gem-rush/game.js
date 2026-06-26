'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=480,H=520;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',()=>clickFrame=true);
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});
let tx=0;
canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx;
  if(Math.abs(dx)>20){if(dx>0){keys['ArrowRight']=true;setTimeout(()=>keys['ArrowRight']=false,100);}else{keys['ArrowLeft']=true;setTimeout(()=>keys['ArrowLeft']=false,100);}}
},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxGem(){tone(880,0.05,'sine',0.06);}
function sfxBomb(){tone(150,0.2,'sawtooth',0.1);}
function sfxJump(){tone(440,0.06,'sine',0.06);}

const GROUND=H-60,GRAV=0.45,JUMP=-14,SCROLL=1.4;
const COLS=['#ff4488','#44ffaa','#ffcc00','#44aaff','#ff8844','#cc44ff'];
let STATE='TITLE',player,plats,gems,bombs,particles,score,best=+(localStorage.getItem('gr_best')||0),frame,tf=0;

function startGame(){
  player={x:80,y:GROUND-32,vy:0,w:22,h:32,onGround:true};
  plats=[];gems=[];bombs=[];particles=[];score=0;frame=0;
  // Initial platforms
  for(let i=0;i<6;i++){const x=i*90;plats.push({x,y:GROUND,w:100,col:'#445566'});}
  STATE='GAME';
}

function spawnPfx(x,y,col){for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:4+Math.random()*3,life:22});}}

function update(){
  frame++;const spd=SCROLL+frame/1000;
  plats.forEach(p=>{p.x-=spd;});gems.forEach(g=>{g.x-=spd;});bombs.forEach(b=>{b.x-=spd;});

  // Spawn new platform
  const maxX=plats.length?Math.max(...plats.map(p=>p.x+p.w)):-1;
  if(maxX<W+20){
    const gap=30+Math.random()*40;const pw=70+Math.random()*60;
    const py=GROUND-Math.floor(Math.random()*3)*55;
    plats.push({x:maxX+gap,y:py,w:pw,col:COLS[Math.floor(Math.random()*COLS.length)]+'88'});
    const gx=maxX+gap+Math.random()*pw;
    if(Math.random()<0.7)gems.push({x:gx,y:py-22,r:10,col:COLS[Math.floor(Math.random()*COLS.length)],rot:0});
    if(Math.random()<0.12+frame/6000)bombs.push({x:gx+20,y:py-22,r:12});
  }
  plats=plats.filter(p=>p.x+p.w>-20);
  gems=gems.filter(g=>g.x>-20);bombs=bombs.filter(b=>b.x>-20);

  const SPD=4.5;
  if(keys['ArrowLeft']||keys['KeyA'])player.x-=SPD;
  if(keys['ArrowRight']||keys['KeyD'])player.x+=SPD;
  if((keys['Space']||keys['ArrowUp']||keys['KeyW'])&&player.onGround){player.vy=JUMP;player.onGround=false;sfxJump();}
  player.vy+=GRAV;player.y+=player.vy;player.onGround=false;

  plats.forEach(p=>{
    if(player.vy>=0&&player.x+player.w/2-4>p.x&&player.x-player.w/2+4<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h<=p.y+14+player.vy){
      player.y=p.y-player.h;player.vy=0;player.onGround=true;
    }
  });
  if(player.y+player.h>=GROUND){player.y=GROUND-player.h;player.vy=0;player.onGround=true;}
  player.x=Math.max(player.w/2,Math.min(W-player.w/2,player.x));

  // Collect gems
  gems=gems.filter(g=>{
    g.rot+=0.06;
    if(Math.hypot(player.x-g.x,player.y+player.h/2-g.y)<g.r+12){
      score+=10;sfxGem();spawnPfx(g.x,g.y,g.col);if(score>best){best=score;localStorage.setItem('gr_best',String(best));}return false;
    }
    return true;
  });
  // Bombs
  for(const b of bombs){if(Math.hypot(player.x-b.x,player.y+player.h/2-b.y)<b.r+10){sfxBomb();STATE='GAMEOVER';return;}}
  // Fall off
  if(player.y>H+40)STATE='GAMEOVER';
  score++;if(score>best){best=score;localStorage.setItem('gr_best',String(best));}
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;return --p.life>0;});
}

function drawHero(x,y,w,h){
  ctx.fillStyle='#ff8844';ctx.fillRect(x-w/2,y,w,h*0.6);
  ctx.fillStyle='#ffaa66';ctx.beginPath();ctx.arc(x,y+4,w*0.52,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-4,y+2,3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+4,y+2,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#cc6622';ctx.fillRect(x-w/2,y+h*0.6,w*0.38,h*0.4);ctx.fillRect(x+w*0.12,y+h*0.6,w*0.38,h*0.4);
}

function drawGem(x,y,r,rot,col){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*0.6,-r*0.3);ctx.lineTo(r*0.6,r*0.3);ctx.lineTo(0,r);ctx.lineTo(-r*0.6,r*0.3);ctx.lineTo(-r*0.6,-r*0.3);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*0.6,-r*0.3);ctx.lineTo(0,-r*0.1);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.restore();
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0d1b2a');bg.addColorStop(1,'#1a2a1a');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W/2-175,H/2-100,350,220);
    ctx.fillStyle='#cc44ff';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('GEM RUSH',W/2,H/2-54);
    ctx.fillStyle='#333';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('COLLECT GEMS FOR POINTS!',W/2,H/2-22);ctx.fillText('AVOID THE BOMBS!',W/2,H/2-2);
    if(best>0){ctx.fillStyle='#cc44ff';ctx.fillText('BEST: '+best,W/2,H/2+24);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('ARROWS/SPACE to run & jump',W/2,H/2+56);ctx.fillText('CLICK to start',W/2,H/2+78);
    for(let i=0;i<4;i++)drawGem(W/2-60+i*40,H/2+20,10,tf*0.04+i,COLS[i]);
    if(click||keys['Space'])startGame();
  } else if(STATE==='GAME'){
    plats.forEach(p=>{ctx.fillStyle='#334455';ctx.fillRect(p.x,p.y,p.w,14);ctx.fillStyle='rgba(255,255,255,0.15)';ctx.fillRect(p.x,p.y,p.w,4);});
    ctx.fillStyle='#334455';ctx.fillRect(0,GROUND,W,H-GROUND);ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(0,GROUND,W,4);
    gems.forEach(g=>drawGem(g.x,g.y,g.r,g.rot,g.col));
    bombs.forEach(b=>{
      ctx.fillStyle='#222';ctx.shadowColor='#ff4400';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ff4400';ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;
      ctx.fillStyle='#ff8800';ctx.fillRect(b.x-2,b.y-b.r-6,4,7);
    });
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/22);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    drawHero(player.x,player.y,player.w,player.h);
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    update();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#cc44ff';ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
