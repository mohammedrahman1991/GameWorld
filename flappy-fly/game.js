'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=420,H=640;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};
let clickFrame=false,mX=W/2,mY=H/2;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(e.key===' ')e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
function getPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
canvas.addEventListener('click',e=>{const p=getPos(e);mX=p.x;mY=p.y;clickFrame=true;});
canvas.addEventListener('touchend',e=>{e.preventDefault();const p=getPos(e.changedTouches[0]);mX=p.x;mY=p.y;clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='sine',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxFlap(){tone(500,0.05,'sine',0.06);}
function sfxScore(){tone(660,0.05,'triangle',0.08);tone(880,0.05,'triangle',0.07,0.06);}
function sfxDie(){tone(200,0.15,'sawtooth',0.12);tone(100,0.3,'sawtooth',0.1,0.1);}

const BIRD_X=90,GAP=195,PIPE_W=58,GRAV=0.35,FLAP=-8;
let STATE='TITLE',bird,pipes,score,best=+(localStorage.getItem('ff_best')||0),frame,tf=0,bgX=0;

const BGSTARS=Array.from({length:60},()=>({x:Math.random()*W,y:Math.random()*H*0.7,s:0.5+Math.random()*2,sp:0.3+Math.random()*0.5}));

function startGame(){bird={y:H/2,vy:0,rot:0,wing:0};pipes=[];score=0;frame=0;}
function flap(){bird.vy=FLAP;sfxFlap();}

function update(){
  frame++;
  bgX=(bgX+0.8)%W;
  BGSTARS.forEach(s=>{s.x-=s.sp;if(s.x<0)s.x=W+2;});
  bird.vy+=GRAV;bird.y+=bird.vy;bird.rot=Math.max(-0.4,Math.min(1.2,bird.vy*0.08));bird.wing=(bird.wing+0.3)%Math.PI;

  if(frame%100===0){
    const top=80+Math.random()*(H-GAP-160);
    pipes.push({x:W+10,top,bot:top+GAP,scored:false});
  }

  pipes=pipes.filter(p=>{
    p.x-=2.4;
    if(!p.scored&&p.x+PIPE_W<BIRD_X){p.scored=true;score++;sfxScore();if(score>best){best=score;localStorage.setItem('ff_best',String(best));}}
    if(BIRD_X+14>p.x&&BIRD_X-14<p.x+PIPE_W&&(bird.y-14<p.top||bird.y+14>p.bot)){sfxDie();STATE='GAMEOVER';}
    return p.x>-PIPE_W-10;
  });
  if(bird.y>H-30||bird.y<0){sfxDie();STATE='GAMEOVER';}
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a0020');g.addColorStop(0.7,'#0a1840');g.addColorStop(1,'#1a3020');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  BGSTARS.forEach(s=>{ctx.globalAlpha=0.5+Math.random()*0.4;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.s,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;
  ctx.fillStyle='#1a4020';ctx.fillRect(0,H-30,W,30);
  ctx.strokeStyle='rgba(80,200,80,0.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,H-30);ctx.lineTo(W,H-30);ctx.stroke();
}

function drawPipe(x,top,bot){
  ctx.shadowColor='#44cc44';ctx.shadowBlur=10;
  const g1=ctx.createLinearGradient(x,0,x+PIPE_W,0);g1.addColorStop(0,'#2a8a2a');g1.addColorStop(0.4,'#44cc44');g1.addColorStop(1,'#1a5a1a');
  ctx.fillStyle=g1;ctx.fillRect(x,0,PIPE_W,top);ctx.fillRect(x,bot,PIPE_W,H-bot);
  ctx.fillStyle='#33aa33';ctx.fillRect(x-6,top-22,PIPE_W+12,22);ctx.fillRect(x-6,bot,PIPE_W+12,22);
  ctx.shadowBlur=0;
}

function drawBird(y,rot,wing){
  ctx.save();ctx.translate(BIRD_X,y);ctx.rotate(rot);
  ctx.shadowColor='#ffcc00';ctx.shadowBlur=16;
  ctx.fillStyle='#ffdd00';ctx.beginPath();ctx.ellipse(0,0,17,13,0,0,Math.PI*2);ctx.fill();
  const wingY=Math.sin(wing)*8;
  ctx.fillStyle='#ffaa00';ctx.beginPath();ctx.ellipse(-6,wingY,12,7,Math.PI*0.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,-3,6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.arc(7,-4,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(8,-5,1.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff8833';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(22,-3);ctx.lineTo(22,4);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;ctx.restore();
}

function drawHUD(sc){
  ctx.shadowColor='rgba(255,255,255,0.4)';ctx.shadowBlur=10;
  ctx.fillStyle='#fff';ctx.font='bold 32px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(sc,W/2,70);ctx.shadowBlur=0;
}

function drawScreen(title,sub,sc,showBest){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();ctx.roundRect(W/2-170,H/2-130,340,260,14);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.1)';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(W/2-170,H/2-130,340,260,14);ctx.stroke();
  ctx.fillStyle='#ffdd00';ctx.shadowColor='#ffaa00';ctx.shadowBlur=20;ctx.font='bold 28px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-80);ctx.shadowBlur=0;
  if(sub){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText(sub,W/2,H/2-48);}
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.shadowBlur=10;ctx.font='bold 40px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2+10);ctx.shadowBlur=0;}
  if(showBest&&best>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText((sc>=best&&sc>0?'✦ NEW BEST! ✦':'BEST: '+best),W/2,H/2+46);}
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('TAP / SPACE',W/2,H/2+90);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){
    drawScreen('FLAPPY FLY','TAP TO FLAP — DODGE THE PIPES!',undefined,false);
    if(best>0){ctx.fillStyle='#ffd700';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+50);}
    if(click||keys['Space']){startGame();STATE='GAME';}
  } else if(STATE==='GAME'){
    drawBg();pipes.forEach(p=>drawPipe(p.x,p.top,p.bot));drawBird(bird.y,bird.rot,bird.wing);drawHUD(score);
    if(click||keys['Space'])flap();
    update();
  } else if(STATE==='GAMEOVER'){
    drawScreen('GAME OVER','',score,true);
    if(click||keys['Space']){startGame();STATE='GAME';}
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
