'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=520,H=400;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',()=>clickFrame=true);
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});
let tx=0,ty=0;
canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)<20&&Math.abs(dy)<20){keys['Space']=true;setTimeout(()=>{keys['Space']=false;},80);return;}
  if(dx>20){keys['ArrowRight']=true;setTimeout(()=>{keys['ArrowRight']=false;},80);}
  else if(dx<-20){keys['ArrowLeft']=true;setTimeout(()=>{keys['ArrowLeft']=false;},80);}
},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxJump(){tone(440,0.07,'sine',0.06);}
function sfxDie(){tone(180,0.2,'sawtooth',0.1);}

const GROUND=H-50,GRAV=0.4,JUMP=-14,SCROLL=0.8;
let STATE='TITLE',player,plats,score,best=+(localStorage.getItem('le_best')||0),lavaY,frame,tf=0;

function makePlats(){
  const ps=[];
  ps.push({x:0,y:GROUND,w:200,col:'#8B5E3C'});
  for(let i=1;i<10;i++)ps.push({x:i*85+Math.random()*15,y:GROUND-Math.floor(i/3)*50,w:100+Math.random()*50,col:'#8B5E3C'});
  return ps;
}

function startGame(){
  player={x:60,y:GROUND-36,vy:0,onGround:true,w:20,h:32,jumps:2};
  plats=makePlats();lavaY=H+200;score=0;frame=0;STATE='GAME';
}

function update(){
  frame++;
  // Scroll world left, raise lava
  plats.forEach(p=>p.x-=SCROLL+frame/2000);
  lavaY=Math.max(GROUND,lavaY-(0.4+frame/1000));

  // Spawn new platforms on right
  if(plats.length<10||Math.max(...plats.map(p=>p.x+p.w))<W+20){
    const lx=Math.max(...plats.map(p=>p.x+p.w));
    plats.push({x:lx+10+Math.random()*20,y:GROUND-Math.floor(Math.random()*3)*50-Math.random()*10,w:100+Math.random()*60,col:'#8B5E3C'});
  }
  plats=plats.filter(p=>p.x+p.w>-20);

  const SPD=4.5;
  if(keys['ArrowLeft']||keys['KeyA'])player.x-=SPD;
  if(keys['ArrowRight']||keys['KeyD'])player.x+=SPD;
  if((keys['Space']||keys['ArrowUp']||keys['KeyW'])&&player.jumps>0){player.vy=JUMP;player.onGround=false;player.jumps--;sfxJump();}
  player.vy+=GRAV;player.y+=player.vy;player.onGround=false;

  plats.forEach(p=>{
    if(player.vy>=0&&player.x+player.w/2-4>p.x&&player.x-player.w/2+4<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h<=p.y+14+player.vy){
      player.y=p.y-player.h;player.vy=0;player.onGround=true;player.jumps=2;
    }
  });
  if(player.y+player.h>=GROUND){player.y=GROUND-player.h;player.vy=0;player.onGround=true;player.jumps=2;}

  // Keep player on screen horizontally
  player.x=Math.max(player.w/2,Math.min(W-player.w/2,player.x));

  // Die from falling off left
  if(player.x<-20){sfxDie();STATE='GAMEOVER';}

  score=Math.floor(frame/4);
  if(score>best){best=score;localStorage.setItem('le_best',String(best));}
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a0a00');g.addColorStop(1,'#6a1a00');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

function drawLava(){
  // Glow
  ctx.shadowColor='#ff4400';ctx.shadowBlur=30;
  const g=ctx.createLinearGradient(0,lavaY,0,H);g.addColorStop(0,'#ff6600');g.addColorStop(0.4,'#ff2200');g.addColorStop(1,'#cc0000');
  ctx.fillStyle=g;ctx.fillRect(0,lavaY,W,H-lavaY);
  // Bubbles
  ctx.shadowBlur=0;
  ctx.fillStyle='#ff8800';
  for(let i=0;i<6;i++){const bx=(frame*1.5+i*80)%W;ctx.beginPath();ctx.arc(bx,lavaY+5,5+Math.sin(frame*0.1+i)*3,0,Math.PI*2);ctx.fill();}
  ctx.shadowBlur=0;
}

function drawPlayer(){
  const x=player.x,y=player.y,w=player.w,h=player.h;
  // Body
  ctx.fillStyle='#ff8844';ctx.fillRect(x-w/2,y,w,h*0.65);
  // Head
  ctx.fillStyle='#ffaa66';ctx.beginPath();ctx.arc(x,y+4,w*0.55,0,Math.PI*2);ctx.fill();
  // Eyes
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-5,y+2,3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+5,y+2,3,0,Math.PI*2);ctx.fill();
  // Legs
  ctx.fillStyle='#cc6622';ctx.fillRect(x-w/2,y+h*0.65,w*0.38,h*0.35);ctx.fillRect(x+w*0.12,y+h*0.65,w*0.38,h*0.35);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;drawBg();
    // Fake lava at bottom
    ctx.fillStyle='#ff4400';ctx.fillRect(0,H-30,W,30);
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W/2-180,H/2-90,360,210);
    ctx.fillStyle='#cc2200';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('LAVA ESCAPE',W/2,H/2-44);
    ctx.fillStyle='#333';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('THE LAVA IS RISING!',W/2,H/2-14);ctx.fillText('JUMP & RUN TO SURVIVE!',W/2,H/2+6);
    if(best>0){ctx.fillStyle='#cc2200';ctx.fillText('BEST: '+best,W/2,H/2+32);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('ARROWS / SPACE to jump',W/2,H/2+62);ctx.fillText('CLICK to start',W/2,H/2+82);
    if(click||keys['Space']||keys['ArrowUp'])startGame();
  } else if(STATE==='GAME'){
    drawBg();
    plats.forEach(p=>{ctx.fillStyle=p.col;ctx.fillRect(p.x,p.y,p.w,14);ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(p.x,p.y,p.w,4);});
    ctx.fillStyle='#6a3a00';ctx.fillRect(0,GROUND,W,H-GROUND);
    drawLava();drawPlayer();
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,32);
    ctx.fillStyle='#ff8800';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    update();
  } else {
    drawBg();drawLava();
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff6600';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('BURNED!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
