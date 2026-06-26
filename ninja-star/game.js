'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=520,H=520;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

let mX=W/2,mY=H/2,clickFrame=false;
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);mY=(e.clientY-r.top)*(H/r.height);});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);mY=(e.clientY-r.top)*(H/r.height);clickFrame=true;});
canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mX=(e.touches[0].clientX-r.left)*(W/r.width);mY=(e.touches[0].clientY-r.top)*(H/r.height);},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mX=(e.changedTouches[0].clientX-r.left)*(W/r.width);mY=(e.changedTouches[0].clientY-r.top)*(H/r.height);clickFrame=true;},{passive:false});
canvas.style.cursor='none';

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxThrow(){tone(660,0.04,'square',0.05);}
function sfxHit(){tone(440,0.05,'sine',0.06);tone(220,0.08,'sine',0.05);}
function sfxMiss(){tone(180,0.1,'sawtooth',0.07);}

const TARGET_TYPES=[
  {r:32,pts:10,col:'#ff4444',spd:1.2},
  {r:24,pts:20,col:'#ff8800',spd:1.8},
  {r:18,pts:30,col:'#ffd700',spd:2.4},
  {r:14,pts:50,col:'#44ffaa',spd:3.0},
];
let STATE='TITLE',stars,targets,score,best=+(localStorage.getItem('ns_best')||0),lives,frame,spawnT=0,tf=0,combo=0;

function startGame(){stars=[];targets=[];score=0;lives=5;frame=0;spawnT=0;combo=0;STATE='GAME';}

function spawnTarget(){
  const t=TARGET_TYPES[Math.min(3,Math.floor(Math.random()*(1+frame/300)))];
  const edge=Math.floor(Math.random()*4);
  let x,y,vx,vy;
  if(edge===0){x=Math.random()*W;y=-t.r;vx=(Math.random()-0.5)*2;vy=t.spd;}
  else if(edge===1){x=W+t.r;y=Math.random()*H;vx=-t.spd;vy=(Math.random()-0.5)*2;}
  else if(edge===2){x=Math.random()*W;y=H+t.r;vx=(Math.random()-0.5)*2;vy=-t.spd;}
  else{x=-t.r;y=Math.random()*H;vx=t.spd;vy=(Math.random()-0.5)*2;}
  targets.push({x,y,vx,vy,r:t.r,pts:t.pts,col:t.col,rot:0,hp:1});
}

function update(){
  frame++;
  if(--spawnT<=0){spawnTarget();spawnT=Math.max(20,60-frame/40);}
  stars=stars.filter(s=>{s.x+=s.vx;s.y+=s.vy;s.rot+=0.3;
    for(let i=targets.length-1;i>=0;i--){
      const t=targets[i];
      if(Math.hypot(s.x-t.x,s.y-t.y)<t.r+6){
        sfxHit();combo++;score+=t.pts*(combo>2?2:1);if(score>best){best=score;localStorage.setItem('ns_best',String(best));}
        targets.splice(i,1);return false;
      }
    }
    return s.x>-20&&s.x<W+20&&s.y>-20&&s.y<H+20;
  });
  targets=targets.filter(t=>{
    t.x+=t.vx;t.y+=t.vy;t.rot+=0.05;
    if(t.x<-t.r||t.x>W+t.r||t.y<-t.r||t.y>H+t.r){
      lives--;combo=0;if(lives<=0)STATE='GAMEOVER';return false;
    }
    return true;
  });
}

function drawStar(x,y,r,rot,col){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=col;
  ctx.beginPath();
  for(let i=0;i<8;i++){const a=i*Math.PI/4,ra=i%2===0?r:r*0.45;ctx.lineTo(Math.cos(a)*ra,Math.sin(a)*ra);}
  ctx.closePath();ctx.fill();ctx.restore();
}

function drawCrosshair(){
  ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(mX-14,mY);ctx.lineTo(mX+14,mY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(mX,mY-14);ctx.lineTo(mX,mY+14);ctx.stroke();
  ctx.beginPath();ctx.arc(mX,mY,8,0,Math.PI*2);ctx.stroke();
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0a0a1a');bg.addColorStop(1,'#1a0a2a');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W/2-180,H/2-100,360,220);
    ctx.fillStyle='#333';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('NINJA STARS',W/2,H/2-54);
    ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK TO THROW STARS!',W/2,H/2-20);ctx.fillText('HIT TARGETS FOR POINTS',W/2,H/2,0);
    ctx.fillText('MISS = LOSE A LIFE',W/2,H/2+20);
    if(best>0){ctx.fillStyle='#666';ctx.fillText('BEST: '+best,W/2,H/2+46);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('CLICK to start',W/2,H/2+78);
    drawStar(W/2-60,H/2-60,18,tf*0.04,'#ffd700');drawStar(W/2+60,H/2-60,14,tf*0.06,'#ff8800');
    if(click)startGame();
  } else if(STATE==='GAME'){
    targets.forEach(t=>{
      ctx.shadowColor=t.col;ctx.shadowBlur=12;
      ctx.fillStyle=t.col;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.25)';ctx.beginPath();ctx.arc(t.x,t.y,t.r*0.6,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.15)';ctx.beginPath();ctx.arc(t.x,t.y,t.r*0.3,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
    });
    stars.forEach(s=>{ctx.shadowColor='#ccc';ctx.shadowBlur=6;drawStar(s.x,s.y,8,s.rot,'#e0e0e0');ctx.shadowBlur=0;});
    drawCrosshair();
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='left';for(let i=0;i<lives;i++){ctx.fillStyle='#ff4444';drawStar(12+i*22,22,7,0,'#ff4444');}
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    if(combo>1){ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('COMBO x'+combo,W/2,H-12);ctx.textAlign='left';}
    if(click){const dx=mX-W/2,dy=mY-H/2,d=Math.hypot(dx,dy)||1;const spd=14;stars.push({x:W/2,y:H/2,vx:dx/d*spd,vy:dy/d*spd,rot:0});sfxThrow();}
    update();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff4444';ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('TARGETS ESCAPED!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click)startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
