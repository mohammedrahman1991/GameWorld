'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=800,H=400;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};
let clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(e.key===' ')e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',e=>{clickFrame=true;});
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='sine',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxFlip(){tone(330,0.06,'square',0.06);tone(440,0.05,'square',0.05,0.05);}
function sfxDie(){tone(200,0.15,'sawtooth',0.12);tone(100,0.3,'sawtooth',0.1,0.12);}

const PH=22,PW=22,FLOOR_H=30,CEIL_H=30,GRAV=0.6;
let STATE='TITLE',player,spikes,score,best=+(localStorage.getItem('gfl_best')||0),frame,speed,flipped,tf=0;
const BGX=Array.from({length:8},(_,i)=>({x:i*120,h:20+Math.random()*60,speed:1.2+Math.random()*0.8}));

function startGame(){
  player={x:120,y:H/2,vy:0};spikes=[];score=0;frame=0;speed=4.5;flipped=false;
}

function flip(){
  flipped=!flipped;sfxFlip();
  player.vy=flipped?-8:8;
}

function update(){
  frame++;
  speed=Math.min(12,4.5+frame/500);
  score=Math.floor(frame/5);
  if(score>best){best=score;localStorage.setItem('gfl_best',String(best));}

  BGX.forEach(b=>{b.x-=b.speed;if(b.x<-80)b.x=W+50+Math.random()*100;});

  player.vy+=flipped?-GRAV:GRAV;
  player.y+=player.vy;

  // Clamp and die
  if(player.y>H-FLOOR_H-PH){player.y=H-FLOOR_H-PH;player.vy=0;}
  if(player.y<CEIL_H){player.y=CEIL_H;player.vy=0;}

  // Spawn spikes
  if(frame%Math.max(30,70-Math.floor(frame/300)*5)===0){
    const onFloor=Math.random()<0.5;
    spikes.push({x:W+10,floor:onFloor,h:16+Math.floor(Math.random()*3)*8,w:14});
  }
  // Occasional pair
  if(frame%200===0&&Math.random()<0.35){
    spikes.push({x:W+10,floor:true,h:20,w:14});
    spikes.push({x:W+10,floor:false,h:20,w:14});
  }

  spikes=spikes.filter(s=>{
    s.x-=speed;
    const sy=s.floor?H-FLOOR_H-s.h:CEIL_H;
    if(s.x<player.x+PW-4&&s.x+s.w>player.x+4&&player.y+PH>sy+4&&player.y<sy+s.h-4){
      sfxDie();STATE='GAMEOVER';
    }
    return s.x>-30;
  });
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);
  const c1=flipped?'#200040':'#001030'; const c2=flipped?'#400060':'#002050';
  g.addColorStop(0,c1);g.addColorStop(1,c2);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  BGX.forEach(b=>{ctx.globalAlpha=0.07;ctx.fillStyle='#8866ff';ctx.fillRect(b.x,H-FLOOR_H-b.h,60,b.h);});ctx.globalAlpha=1;
  // Floor & ceiling
  const fc=flipped?'#ff4488':'#44aaff';
  ctx.fillStyle='#1a1a3a';ctx.fillRect(0,0,W,CEIL_H);ctx.fillRect(0,H-FLOOR_H,W,FLOOR_H);
  ctx.strokeStyle=fc;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,CEIL_H);ctx.lineTo(W,CEIL_H);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,H-FLOOR_H);ctx.lineTo(W,H-FLOOR_H);ctx.stroke();
}

function drawSpikes(){
  spikes.forEach(s=>{
    const sy=s.floor?H-FLOOR_H-s.h:CEIL_H;
    const col=s.floor?'#ff4444':'#ff44aa';
    ctx.shadowColor=col;ctx.shadowBlur=10;ctx.fillStyle=col;
    // Triangle spike shape
    for(let i=0;i<Math.ceil(s.w/14);i++){
      const bx=s.x+i*14,bw=12;
      ctx.beginPath();
      if(s.floor){ctx.moveTo(bx,sy+s.h);ctx.lineTo(bx+bw/2,sy);ctx.lineTo(bx+bw,sy+s.h);}
      else{ctx.moveTo(bx,sy);ctx.lineTo(bx+bw/2,sy+s.h);ctx.lineTo(bx+bw,sy);}
      ctx.closePath();ctx.fill();
    }
    ctx.shadowBlur=0;
  });
}

function drawPlayer(){
  const col=flipped?'#ff44aa':'#44aaff';
  ctx.shadowColor=col;ctx.shadowBlur=14;
  ctx.save();ctx.translate(player.x+PW/2,player.y+PH/2);
  if(flipped)ctx.rotate(Math.PI);
  ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(-PW/2,-PH/2,PW,PH,6);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.beginPath();ctx.roundRect(-PW/2+3,-PH/2+3,PW-6,PH*0.4,3);ctx.fill();
  ctx.restore();ctx.shadowBlur=0;
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,W,40);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,28);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,38);
  ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST '+best,W-10,28);
  const fc=flipped?'#ff44aa':'#44aaff';ctx.textAlign='left';ctx.fillStyle=fc;ctx.font='7px "Press Start 2P",monospace';ctx.fillText(flipped?'↑ FLIPPED':'↓ NORMAL',10,28);
}

function drawOverlay(title,sc,newBest){
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#44aaff';ctx.shadowColor='#44aaff';ctx.shadowBlur=22;ctx.font='bold 36px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-70);ctx.shadowBlur=0;
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.font='bold 40px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2);ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,H/2+20);}
  if(newBest){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+46);}
  else if(best>0&&sc!==undefined){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+46);}
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('SPACE / CLICK / TAP to '+(title==='GAME OVER'?'restart':'play'),W/2,H/2+90);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){drawBg();drawOverlay('GRAVITY FLIP',undefined,false);ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('PRESS TO FLIP — AVOID SPIKES!',W/2,H/2+24);if(best>0){ctx.fillStyle='#ffd700';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+48);}if(click||keys['Space']){startGame();STATE='GAME';}}
  else if(STATE==='GAME'){drawBg();drawSpikes();drawPlayer();drawHUD();if(click||keys['Space']){flip();}update();}
  else if(STATE==='GAMEOVER'){drawBg();drawSpikes();drawPlayer();drawOverlay('GAME OVER',score,score>=best&&score>0);if(click||keys['Space']){startGame();STATE='GAME';}}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
