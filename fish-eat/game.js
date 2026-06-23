'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=700,H=520;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};
let mX=null,mY=null,clickFrame=false;
function getPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
canvas.addEventListener('mousemove',e=>{const p=getPos(e);mX=p.x;mY=p.y;});
canvas.addEventListener('click',e=>{const p=getPos(e);mX=p.x;mY=p.y;clickFrame=true;});
canvas.addEventListener('touchmove',e=>{e.preventDefault();const p=getPos(e.touches[0]);mX=p.x;mY=p.y;},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();const p=getPos(e.changedTouches[0]);mX=p.x;mY=p.y;clickFrame=true;},{passive:false});
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='sine',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxEat(big){tone(big?440:330,0.06,'sine',0.08);}
function sfxDie(){tone(150,0.2,'sawtooth',0.12);tone(80,0.35,'sawtooth',0.1,0.18);}

const FISH_COLORS=['#ff6644','#44aaff','#44ff88','#ffd700','#cc44ff','#ff44aa','#44ffdd','#ffaa44'];
let STATE='TITLE',player,fish,score,best=+(localStorage.getItem('fe_best')||0),frame,particles=[],floats=[],tf=0;

function randFishColor(){return FISH_COLORS[Math.floor(Math.random()*FISH_COLORS.length)];}

function startGame(){
  player={x:W/2,y:H/2,size:28,vx:0,vy:0,color:'#44aaff',facing:1};
  fish=[];score=0;frame=0;particles=[];floats=[];
  for(let i=0;i<16;i++)spawnFish();
}

function spawnFish(){
  const side=Math.floor(Math.random()*4);
  let x,y;
  if(side===0){x=Math.random()*W;y=-40;}
  else if(side===1){x=Math.random()*W;y=H+40;}
  else if(side===2){x=-40;y=Math.random()*H;}
  else{x=W+40;y=Math.random()*H;}
  const minSize=8+Math.random()*20;
  const maxSize=player.size*0.7+Math.random()*player.size*1.6;
  const size=Math.min(maxSize,Math.max(minSize,player.size*(0.3+Math.random()*1.8)));
  const angle=Math.atan2(H/2-y,W/2-x)+(-0.4+Math.random()*0.8);
  const spd=1.5+Math.random()*2.5;
  fish.push({x,y,size,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,color:randFishColor(),facing:1,wobble:Math.random()*Math.PI*2});
}

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*6;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:3+Math.random()*5,life:20+Math.random()*14});}}
function addFloat(x,y,t){floats.push({x,y,txt:t,col:'#ffd700',life:44});}

function update(){
  frame++;
  const KSP=5;
  let usedKeys=false;
  if(keys['ArrowLeft']||keys['KeyA']){player.vx=Math.max(player.vx-1,-KSP);usedKeys=true;}
  else if(keys['ArrowRight']||keys['KeyD']){player.vx=Math.min(player.vx+1,KSP);usedKeys=true;}
  else player.vx*=0.82;
  if(keys['ArrowUp']||keys['KeyW']){player.vy=Math.max(player.vy-1,-KSP);usedKeys=true;}
  else if(keys['ArrowDown']||keys['KeyS']){player.vy=Math.min(player.vy+1,KSP);usedKeys=true;}
  else player.vy*=0.82;
  if(!usedKeys&&mX!==null){
    const dx=mX-player.x,dy=mY-player.y,d=Math.hypot(dx,dy);
    if(d>4){const spd=Math.min(d*0.1,6.5);player.vx=dx/d*spd;player.vy=dy/d*spd;}
    else{player.vx*=0.85;player.vy*=0.85;}
  }
  player.x=Math.max(player.size,Math.min(W-player.size,player.x+player.vx));
  player.y=Math.max(player.size,Math.min(H-player.size,player.y+player.vy));
  if(player.vx>0.2)player.facing=1;else if(player.vx<-0.2)player.facing=-1;

  fish.forEach(f=>{
    f.wobble+=0.07;
    f.x+=f.vx;f.y+=f.vy;
    if(f.x<-60||f.x>W+60||f.y<-60||f.y>H+60){f.x=Math.random()*W;f.y=-50;const a=Math.atan2(H/2-f.y,W/2-f.x)+(-0.4+Math.random()*0.8);f.vx=Math.cos(a)*2;f.vy=Math.sin(a)*2;}
    if(f.vx>0.1)f.facing=1;else if(f.vx<-0.1)f.facing=-1;
    const dist=Math.hypot(player.x-f.x,player.y-f.y);
    if(dist<player.size*0.8+f.size*0.8){
      if(f.size<=player.size*1.05){
        // Eat
        const gain=Math.ceil(f.size*0.4);score+=gain;addFloat(f.x,f.y,'+'+gain);spawnPfx(f.x,f.y,f.color,8);sfxEat(f.size>player.size*0.7);
        player.size=Math.min(140,player.size+f.size*0.06);
        if(score>best){best=score;localStorage.setItem('fe_best',String(best));}
        f.x=-999;// mark for removal
      } else {
        // Eaten
        sfxDie();spawnPfx(player.x,player.y,player.color,16);STATE='GAMEOVER';
      }
    }
  });
  fish=fish.filter(f=>f.x>-900);
  while(fish.length<16+Math.floor(player.size/20))spawnFish();
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;return --p.life>0;});
  floats=floats.filter(f=>{f.y-=0.8;return --f.life>0;});
}

function drawFish(x,y,size,color,facing,wobble,isPlayer){
  ctx.save();ctx.translate(x,y);ctx.scale(facing,1);
  const w=size,h=size*0.55;
  const tail=Math.sin(wobble)*0.3;
  // Tail
  ctx.fillStyle=color;ctx.globalAlpha=0.8;
  ctx.beginPath();ctx.moveTo(-w*0.4,0);ctx.lineTo(-w*0.9,-h*0.7+tail*h);ctx.lineTo(-w,0);ctx.lineTo(-w*0.9,h*0.7+tail*h);ctx.closePath();ctx.fill();
  ctx.globalAlpha=1;
  // Body
  ctx.shadowColor=color;ctx.shadowBlur=isPlayer?14:6;
  const g=ctx.createRadialGradient(-w*0.1,-h*0.2,h*0.1,0,0,w*0.7);
  g.addColorStop(0,'rgba(255,255,255,0.7)');g.addColorStop(0.5,color);g.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.ellipse(0,0,w*0.6,h*0.5,0,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  // Eye
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(w*0.28,-h*0.12,h*0.18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(w*0.3,-h*0.12,h*0.09,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#001030');g.addColorStop(1,'#003050');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Bubbles bg
  ctx.globalAlpha=0.04;
  for(let i=0;i<12;i++){ctx.fillStyle='#aaccff';ctx.beginPath();ctx.arc(60+i*55,100+i*30,8+i*3,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fillRect(0,0,W,44);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,28);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,40);
  ctx.textAlign='left';ctx.fillStyle='#44aaff';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('SIZE: '+Math.floor(player.size),10,28);
  ctx.textAlign='right';ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-10,28);ctx.textAlign='left';
}

function drawFX(){
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/24);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  floats.forEach(f=>{ctx.globalAlpha=Math.min(1,f.life/14);ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x,f.y);});ctx.globalAlpha=1;ctx.textAlign='left';
}

function drawOverlay(title,sc,nb){
  ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#44aaff';ctx.shadowColor='#44aaff';ctx.shadowBlur=22;ctx.font='bold 28px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-80);ctx.shadowBlur=0;
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.shadowBlur=12;ctx.font='bold 40px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2-10);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,H/2+10);}
  if(nb){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+36);}
  else if(best>0&&sc!==undefined){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
  if(sc===undefined){ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('EAT SMALLER FISH TO GROW!',W/2,H/2+20);ctx.fillText('AVOID BIGGER ONES!',W/2,H/2+38);}
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('WASD / ARROWS or MOUSE to move',W/2,H/2+60);ctx.fillText('CLICK to '+(title==='GAME OVER'?'restart':'play'),W/2,H/2+76);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){drawBg();drawOverlay('FISH EAT FISH',undefined,false);if(click){startGame();STATE='GAME';}}
  else if(STATE==='GAME'){drawBg();fish.sort((a,b)=>a.size-b.size);fish.forEach(f=>drawFish(f.x,f.y,f.size,f.color,f.facing,f.wobble,false));drawFish(player.x,player.y,player.size,player.color,player.facing,frame*0.08,true);drawFX();drawHUD();update();}
  else if(STATE==='GAMEOVER'){drawBg();fish.forEach(f=>drawFish(f.x,f.y,f.size,f.color,f.facing,f.wobble,false));drawFX();drawHUD();drawOverlay('GAME OVER',score,score>=best&&score>0);if(click){startGame();STATE='GAME';}}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
