'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=480,H=540;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let mX=W/2,clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);clickFrame=true;});
canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mX=(e.touches[0].clientX-r.left)*(W/r.width);},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxCatch(){tone(660,0.05,'sine',0.06);}
function sfxMiss(){tone(200,0.1,'sawtooth',0.08);}
function sfxGold(){tone(880,0.04,'sine',0.07);tone(1100,0.07,'sine',0.07);}

const BASKET_W=80,BASKET_H=30,BASKET_Y=H-50;
const EGG_TYPES=[
  {col:'#fff8e0',pts:10,spd:2.5,r:12},
  {col:'#fff8e0',pts:10,spd:2.5,r:12},
  {col:'#fff8e0',pts:10,spd:2.5,r:12},
  {col:'#ffd700',pts:30,spd:3.5,r:10},
  {col:'#ff6666',pts:-20,spd:3.0,r:11},
];
const CHICKENS=[-1,-1,-1];
let STATE='TITLE',basket,eggs,chickens,score,best=+(localStorage.getItem('ec_best')||0),lives,frame,particles=[],tf=0;

function startGame(){
  basket={x:W/2};eggs=[];lives=5;score=0;frame=0;particles=[];
  chickens=[{x:80,dir:1},{x:W/2,dir:-1},{x:W-80,dir:1}];
  STATE='GAME';
}

function spawnPfx(x,y,col){for(let i=0;i<8;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*4;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:3+Math.random()*3,life:20});}}

function update(){
  frame++;
  // Basket
  const SPD=7;
  if(keys['ArrowLeft']||keys['KeyA'])basket.x=Math.max(BASKET_W/2,basket.x-SPD);
  if(keys['ArrowRight']||keys['KeyD'])basket.x=Math.min(W-BASKET_W/2,basket.x+SPD);
  basket.x+=(mX-basket.x)*0.2;basket.x=Math.max(BASKET_W/2,Math.min(W-BASKET_W/2,basket.x));

  // Chickens
  const speed=Math.min(3,1+frame/600);
  chickens.forEach(ch=>{ch.x+=ch.dir*speed;if(ch.x<40||ch.x>W-40)ch.dir*=-1;});
  // Spawn eggs
  chickens.forEach((ch,i)=>{if(Math.random()<0.015+frame/12000){const t=EGG_TYPES[Math.floor(Math.random()*EGG_TYPES.length)];eggs.push({x:ch.x,y:60,vy:t.spd+Math.random(),col:t.col,pts:t.pts,r:t.r});}});

  // Move eggs
  eggs=eggs.filter(e=>{
    e.y+=e.vy+(frame/400);
    if(e.y>BASKET_Y-BASKET_H/2&&e.y<BASKET_Y+BASKET_H/2&&Math.abs(e.x-basket.x)<BASKET_W/2+e.r){
      if(e.pts>0){score+=e.pts;if(e.pts>=30){sfxGold();}else sfxCatch();spawnPfx(e.x,e.y,e.col);}
      else{sfxMiss();lives--;if(lives<=0)STATE='GAMEOVER';}
      if(score>best){best=score;localStorage.setItem('ec_best',String(best));}
      return false;
    }
    if(e.y>H+20){if(e.pts>0){lives--;sfxMiss();if(lives<=0)STATE='GAMEOVER';}return false;}
    return true;
  });
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;return --p.life>0;});
}

function drawChicken(x,y){
  ctx.fillStyle='#fff8e0';ctx.beginPath();ctx.ellipse(x,y,18,14,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff8e0';ctx.beginPath();ctx.arc(x+14,y-8,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff6600';ctx.beginPath();ctx.moveTo(x+22,y-8);ctx.lineTo(x+30,y-6);ctx.lineTo(x+22,y-4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x+18,y-11,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff6600';ctx.fillRect(x-4,y+12,6,10);ctx.fillRect(x+4,y+12,6,10);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#87ceeb');g.addColorStop(1,'#c8f0a8');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W/2-175,H/2-100,350,220);
    ctx.fillStyle='#cc6600';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('EGG CATCHER',W/2,H/2-52);
    ctx.fillStyle='#333';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CATCH THE EGGS!',W/2,H/2-22);
    ctx.fillText('GOLD EGG = 30 PTS',W/2,H/2-2);ctx.fillText('RED EGG = LOSE A LIFE!',W/2,H/2+18);
    if(best>0){ctx.fillStyle='#cc6600';ctx.fillText('BEST: '+best,W/2,H/2+44);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('MOUSE/ARROWS to move basket',W/2,H/2+74);
    if(click||keys['Space'])startGame();
  } else if(STATE==='GAME'){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#87ceeb');g.addColorStop(1,'#c8f0a8');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // Ground
    ctx.fillStyle='#88cc44';ctx.fillRect(0,H-40,W,40);
    ctx.fillStyle='#aae055';ctx.fillRect(0,H-40,W,6);
    chickens.forEach(ch=>drawChicken(ch.x,50));
    eggs.forEach(e=>{
      ctx.fillStyle=e.col;ctx.shadowColor=e.col;ctx.shadowBlur=e.pts>=30?8:3;
      ctx.beginPath();ctx.ellipse(e.x,e.y,e.r,e.r*1.3,0,0,Math.PI*2);ctx.fill();
      if(e.pts<0){ctx.strokeStyle='#ff0000';ctx.lineWidth=2;ctx.stroke();}
      ctx.shadowBlur=0;
    });
    // Basket
    ctx.fillStyle='#8B5E3C';ctx.fillRect(basket.x-BASKET_W/2,BASKET_Y-BASKET_H,BASKET_W,BASKET_H);
    ctx.fillStyle='#a06832';ctx.fillRect(basket.x-BASKET_W/2,BASKET_Y-BASKET_H,BASKET_W,6);
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/20);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='left';for(let i=0;i<lives;i++){ctx.fillStyle='#ff6666';ctx.beginPath();ctx.arc(12+i*22,22,7,0,Math.PI*2);ctx.fill();}
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    update();
  } else {
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#87ceeb');g.addColorStop(1,'#c8f0a8');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,H/2-50);
    ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
