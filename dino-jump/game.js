'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=800,H=320; canvas.width=W; canvas.height=H;
function resize(){ const s=Math.min(innerWidth/W,innerHeight/H); canvas.style.width=Math.floor(W*s)+'px'; canvas.style.height=Math.floor(H*s)+'px'; }
window.addEventListener('resize',resize); resize();

const keys={};
let mX=W/2,mY=H/2,clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if([' ','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);mY=(e.clientY-r.top)*(H/r.height);clickFrame=true;});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='square',vol=0.07){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxJump(){tone(440,0.1,'sine',0.07);}
function sfxDie(){tone(200,0.1,'sawtooth',0.1);tone(100,0.3,'sawtooth',0.12,0.1);}
function sfxPoint(){tone(660,0.04,'triangle',0.06);}

const GROUND=H-60,DINO_X=110,DINO_W=44,DINO_H=52;
let STATE='TITLE',dino,obs,clouds,score,best=+(localStorage.getItem('dj_best')||0),frame,speed,tf=0;

function startGame(){
  dino={y:GROUND-DINO_H,vy:0,duck:false,frame:0};
  obs=[];clouds=[{x:600,y:50,w:90},{x:900,y:30,w:120},{x:1100,y:65,w:80}];
  score=0;frame=0;speed=5;
}

function jump(){if(dino.y>=GROUND-DINO_H-2){dino.vy=-14;sfxJump();}}

function spawnObs(){
  const r=Math.random();
  if(r<0.55) obs.push({x:W+20,type:'cactus',w:24,h:48+Math.floor(Math.random()*3)*16,y:GROUND});
  else obs.push({x:W+20,type:'bird',w:40,h:28,y:GROUND-80-Math.floor(Math.random()*3)*40});
}

function update(){
  frame++;
  speed=Math.min(14,5+frame/400);
  if(frame%Math.max(35,80-Math.floor(frame/200)*5)===0&&Math.random()<0.8) spawnObs();
  if(frame%200===0) sfxPoint();

  // Dino
  const ducking=(keys['ArrowDown']||keys['KeyS'])&&dino.y>=GROUND-DINO_H-2;
  dino.duck=ducking;
  if((keys['Space']||keys['ArrowUp']||keys['KeyW'])) jump();
  dino.vy+=0.7; dino.y+=dino.vy;
  if(dino.y>=GROUND-DINO_H){dino.y=GROUND-DINO_H;dino.vy=0;}
  dino.frame++;

  // Clouds
  clouds.forEach(c=>{c.x-=speed*0.3;if(c.x<-150)c.x=W+80+Math.random()*200;});

  // Obstacles
  obs=obs.filter(o=>{
    o.x-=speed;
    const dh=ducking?DINO_H*0.5:DINO_H,dy=ducking?GROUND-dh:dino.y;
    if(o.x<DINO_X+DINO_W-8&&o.x+o.w>DINO_X+8&&GROUND-o.h<dy+dh-6&&dy<GROUND-o.h+o.h-6){
      sfxDie();if(score>best){best=score;localStorage.setItem('dj_best',String(best));}STATE='GAMEOVER';
    }
    return o.x>-60;
  });
  score=Math.floor(frame/5);
  if(score>best)best=score;
}

function drawDino(x,y,duck,fr){
  const h=duck?DINO_H*0.55:DINO_H,w=duck?DINO_W*1.3:DINO_W;
  ctx.shadowColor='#44ff88';ctx.shadowBlur=8;
  ctx.fillStyle='#44bb66';ctx.beginPath();ctx.roundRect(x,y+(DINO_H-h),w,h,6);ctx.fill();
  ctx.fillStyle='#88ffaa';ctx.beginPath();ctx.roundRect(x+w*0.55,y+(DINO_H-h),w*0.45,h*0.55,4);ctx.fill();
  if(!duck){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+w*0.8,y+(DINO_H-h)+8,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x+w*0.82,y+(DINO_H-h)+9,2.5,0,Math.PI*2);ctx.fill();}
  // Legs
  const lx=fr%16<8?[-6,8]:[-8,6];
  ctx.fillStyle='#338855';ctx.fillRect(x+10+lx[0],y+DINO_H-14,10,14);ctx.fillRect(x+26+lx[1],y+DINO_H-14,10,14);
  ctx.shadowBlur=0;
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#e8f4ff');g.addColorStop(1,'#c8e8ff');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  clouds.forEach(c=>{ctx.fillStyle='rgba(255,255,255,0.9)';ctx.beginPath();ctx.ellipse(c.x,c.y,c.w/2,20,0,0,Math.PI*2);ctx.fill();ctx.ellipse(c.x-20,c.y+5,c.w*0.3,15,0,0,Math.PI*2);ctx.fill();ctx.ellipse(c.x+24,c.y+5,c.w*0.28,14,0,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#88cc88';ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,GROUND);ctx.lineTo(W,GROUND);ctx.stroke();
}

function drawObs(){
  obs.forEach(o=>{
    if(o.type==='cactus'){
      ctx.shadowColor='#228822';ctx.shadowBlur=6;
      ctx.fillStyle='#228844';ctx.beginPath();ctx.roundRect(o.x+6,o.y-o.h,o.w-12,o.h,4);ctx.fill();
      ctx.fillRect(o.x,o.y-o.h*0.6,o.w,o.h*0.6);
      ctx.fillStyle='#33aa55';ctx.fillRect(o.x+2,o.y-o.h+2,6,o.h-4);
    } else {
      ctx.shadowColor='#ff8833';ctx.shadowBlur=8;
      ctx.fillStyle='#cc6622';ctx.beginPath();ctx.ellipse(o.x+o.w/2,o.y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#ff8833';ctx.fillRect(o.x-14,o.y+6,16,10);ctx.fillRect(o.x+o.w-2,o.y+6,16,10);
    }
    ctx.shadowBlur=0;
  });
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,0,W,38);
  ctx.fillStyle='#333';ctx.font='bold 14px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(String(score).padStart(5,'0'),W/2,26);
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.textAlign='right';ctx.fillText('HI '+String(best).padStart(5,'0'),W-12,26);
  ctx.textAlign='left';
}

function drawTitle(){
  tf++;drawBg();
  drawDino(DINO_X,GROUND-DINO_H,false,tf);
  ctx.fillStyle='rgba(255,255,255,0.85)';ctx.beginPath();ctx.roundRect(W/2-200,80,400,160,12);ctx.fill();
  ctx.fillStyle='#228844';ctx.font='bold 30px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('DINO JUMP',W/2,130);
  ctx.fillStyle='#555';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('JUMP OVER OBSTACLES!',W/2,158);
  if(best>0){ctx.fillStyle='#228844';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,178);}
  ctx.fillStyle='rgba(0,0,0,0.15)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('[SPACE / CLICK to start & jump]',W/2,210);
  if(clickFrame||keys['Space']||keys['ArrowUp']){startGame();STATE='GAME';}
}

function drawGameOver(){
  drawBg();obs.forEach(()=>{});drawObs();
  drawDino(DINO_X,GROUND-DINO_H,false,0);
  ctx.fillStyle='rgba(255,255,255,0.88)';ctx.beginPath();ctx.roundRect(W/2-200,80,400,170,12);ctx.fill();
  ctx.fillStyle='#cc3322';ctx.font='bold 22px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,120);
  ctx.fillStyle='#333';ctx.font='bold 18px "Press Start 2P",monospace';ctx.fillText(score,W/2,158);
  if(score>=best&&score>0){ctx.fillStyle='#228844';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,180);}
  else{ctx.fillStyle='#555';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,180);}
  ctx.fillStyle='rgba(0,0,0,0.2)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('[SPACE / CLICK to restart]',W/2,224);
  if(clickFrame||keys['Space']){startGame();STATE='GAME';}
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){clickFrame=click;drawTitle();clickFrame=false;}
  else if(STATE==='GAME'){drawBg();drawObs();drawDino(DINO_X,dino.y,dino.duck,dino.frame);drawHUD();clickFrame=click;if(clickFrame)jump();update();clickFrame=false;}
  else if(STATE==='GAMEOVER'){clickFrame=click;drawGameOver();clickFrame=false;}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
