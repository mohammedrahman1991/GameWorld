'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=600,H=520;canvas.width=W;canvas.height=H;
canvas.style.cursor='none';
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

let mX=W/2,mY=H/2,clickFrame=false;
function getPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
canvas.addEventListener('mousemove',e=>{const p=getPos(e);mX=p.x;mY=p.y;});
canvas.addEventListener('click',e=>{const p=getPos(e);mX=p.x;mY=p.y;clickFrame=true;});
canvas.addEventListener('touchmove',e=>{e.preventDefault();const p=getPos(e.touches[0]);mX=p.x;mY=p.y;},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();const p=getPos(e.changedTouches[0]);mX=p.x;mY=p.y;clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='square',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxShoot(){tone(900,0.04,'square',0.07);tone(400,0.06,'sawtooth',0.05,0.02);}
function sfxHit(big){tone(big?660:880,0.07,'triangle',0.09);tone(big?440:660,0.06,'sine',0.07,0.06);}
function sfxMiss(){tone(200,0.08,'sawtooth',0.06);}
function sfxTick(){tone(440,0.03,'square',0.04);}

// Target types: {col, r, pts, speed, wobble, label}
const T_TYPES=[
  {col:'#ff4444',r:28,pts:10,spd:0,label:''},           // big red — easy
  {col:'#ffd700',r:20,pts:25,spd:1.5,label:''},         // gold — moving
  {col:'#44aaff',r:16,pts:40,spd:2.5,label:''},         // blue small — fast
  {col:'#44ff88',r:12,pts:60,spd:0,label:'★'},          // tiny green — bonus
  {col:'#cc44ff',r:22,pts:30,spd:2,label:''},           // purple — moving
  {col:'#ff8833',r:18,pts:20,spd:3,label:''},           // orange — fast mover
];

const ROWS=[120,200,290,380];
const TIME_LIMIT=60;

let STATE='TITLE',targets,shots,score,best=+(localStorage.getItem('sg_best')||0),timeLeft,frame,misses,combo,maxCombo,particles=[],floats=[],ripples=[],tf=0;

function startGame(){
  targets=[];shots=[];score=0;frame=0;timeLeft=TIME_LIMIT;misses=0;combo=0;maxCombo=0;particles=[];floats=[];ripples=[];
  spawnTarget();spawnTarget();spawnTarget();
}

function randRow(){return ROWS[Math.floor(Math.random()*ROWS.length)];}

function spawnTarget(){
  const t=T_TYPES[Math.floor(Math.random()*T_TYPES.length)];
  const margin=t.r+30;
  const x=margin+Math.random()*(W-margin*2);
  const y=randRow();
  const dir=(Math.random()<0.5?1:-1);
  const life=Math.floor(90+Math.random()*80);
  targets.push({x,y,r:t.r,col:t.col,pts:t.pts,spd:t.spd,dir,label:t.label,life,maxLife:life,appear:12,hit:false,hitAnim:0});
}

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=4+Math.random()*8;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:3+Math.random()*5,life:18+Math.random()*14});}}
function addFloat(x,y,t,col){floats.push({x,y,txt:t,col,life:44});}

function tryShoot(){
  sfxShoot();
  ripples.push({x:mX,y:mY,r:0,life:14});
  let hit=false;
  // Check in reverse order (top targets first)
  for(let i=targets.length-1;i>=0;i--){
    const t=targets[i];
    if(t.hit||t.appear>0) continue;
    if(Math.hypot(mX-t.x,mY-t.y)<t.r+4){
      t.hit=true;t.hitAnim=16;
      combo++;if(combo>maxCombo)maxCombo=combo;
      const pts=t.pts*(combo>=5?3:combo>=3?2:1);
      score+=pts;
      if(score>best){best=score;localStorage.setItem('sg_best',String(best));}
      sfxHit(t.r>20);spawnPfx(t.x,t.y,t.col,10);
      const label=combo>=5?'+'+pts+' x3!':combo>=3?'+'+pts+' x2':'+'+pts;
      addFloat(t.x,t.y-t.r,label,combo>=3?'#ffd700':t.col);
      hit=true;break;
    }
  }
  if(!hit){combo=0;sfxMiss();addFloat(mX,mY,'MISS','#ff4444');}
}

function update(){
  frame++;
  timeLeft=Math.max(0,timeLeft-1/60);
  if(timeLeft<=0){if(score>best){best=score;localStorage.setItem('sg_best',String(best));}STATE='GAMEOVER';return;}
  if(frame%30===0)sfxTick();

  // Spawn more targets over time
  const maxT=Math.min(6,3+Math.floor((TIME_LIMIT-timeLeft)/12));
  const alive=targets.filter(t=>!t.hit).length;
  if(alive<maxT&&Math.random()<0.06)spawnTarget();

  targets.forEach(t=>{
    if(t.appear>0){t.appear--;return;}
    if(t.hit){t.hitAnim=Math.max(0,t.hitAnim-1);return;}
    t.x+=t.spd*t.dir;
    if(t.x<t.r+20||t.x>W-t.r-20){t.dir*=-1;}
    t.life--;
    if(t.life<=0){combo=0;spawnTarget();}
  });
  targets=targets.filter(t=>!(t.hit&&t.hitAnim<=0)&&!(t.life<=0));

  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.3;return --p.life>0;});
  floats=floats.filter(f=>{f.y-=1;return --f.life>0;});
  ripples=ripples.filter(r=>{r.r+=5;return --r.life>0;});
}

function drawBg(){
  // Curtain/stage background
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a0a2a');g.addColorStop(1,'#0a0a18');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Stage floor bands
  ROWS.forEach((y,i)=>{
    ctx.fillStyle=i%2===0?'rgba(255,255,255,0.025)':'rgba(255,255,255,0.012)';
    ctx.fillRect(0,y-40,W,80);
  });
  // Side curtains
  const cl=ctx.createLinearGradient(0,0,60,0);cl.addColorStop(0,'#4a0a0a');cl.addColorStop(1,'transparent');
  ctx.fillStyle=cl;ctx.fillRect(0,0,60,H);
  const cr=ctx.createLinearGradient(W-60,0,W,0);cr.addColorStop(0,'transparent');cr.addColorStop(1,'#4a0a0a');
  ctx.fillStyle=cr;ctx.fillRect(W-60,0,60,H);
  // Stage line
  ctx.strokeStyle='rgba(255,200,100,0.15)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,H-60);ctx.lineTo(W,H-60);ctx.stroke();
}

function drawTarget(t){
  if(t.hit) return;
  const scale=t.appear>0?(1-t.appear/12)*1.2:1;
  const alpha=t.appear>0?1-t.appear/12:Math.min(1,t.life/20);
  ctx.save();ctx.translate(t.x,t.y);ctx.scale(scale,scale);ctx.globalAlpha=alpha;
  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(4,t.r*0.8,t.r*0.8,t.r*0.25,0,0,Math.PI*2);ctx.fill();
  // Outer ring
  ctx.shadowColor=t.col;ctx.shadowBlur=14;
  ctx.strokeStyle=t.col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,t.r,0,Math.PI*2);ctx.stroke();
  // Inner rings
  ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,t.r*0.65,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=t.col;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,t.r*0.35,0,Math.PI*2);ctx.stroke();
  // Bullseye
  const cg=ctx.createRadialGradient(0,0,0,0,0,t.r*0.25);cg.addColorStop(0,'rgba(255,255,255,0.9)');cg.addColorStop(1,t.col);
  ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,t.r*0.22,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
  if(t.label){ctx.fillStyle='#fff';ctx.font='bold 11px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(t.label,0,t.r+16);}
  ctx.restore();ctx.globalAlpha=1;
}

function drawCrosshair(){
  const x=mX,y=mY,s=18,g=6;
  ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.lineWidth=1.5;ctx.shadowColor='#fff';ctx.shadowBlur=6;
  ctx.beginPath();ctx.moveTo(x-s,y);ctx.lineTo(x-g,y);ctx.moveTo(x+g,y);ctx.lineTo(x+s,y);
  ctx.moveTo(x,y-s);ctx.lineTo(x,y-g);ctx.moveTo(x,y+g);ctx.lineTo(x,y+s);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,g,0,Math.PI*2);ctx.stroke();
  ctx.shadowBlur=0;
}

function drawFX(){
  ripples.forEach(r=>{ctx.globalAlpha=Math.max(0,r.life/14)*0.5;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.stroke();});ctx.globalAlpha=1;
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/22);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  floats.forEach(f=>{ctx.globalAlpha=Math.min(1,f.life/14);ctx.font='bold 9px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x,f.y);});ctx.globalAlpha=1;ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.45)';ctx.fillRect(0,0,W,48);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,30);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,42);
  // Timer
  const tFrac=timeLeft/TIME_LIMIT;const tc=tFrac>0.4?'#44ff88':tFrac>0.2?'#ffd700':'#ff4444';
  ctx.textAlign='left';ctx.fillStyle=tc;ctx.shadowColor=tc;ctx.shadowBlur=8;ctx.font='bold 14px "Press Start 2P",monospace';ctx.fillText(Math.ceil(timeLeft)+'s',14,28);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('TIME',14,40);
  // Combo
  if(combo>=2){ctx.textAlign='right';ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=10;ctx.font='bold 11px "Press Start 2P",monospace';ctx.fillText('COMBO x'+combo,W-14,22);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,215,0,0.4)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('KEEP SHOOTING!',W-14,34);}
  else{ctx.textAlign='right';ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-14,28);}
  ctx.textAlign='left';
  // Timer bar
  ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(0,H-6,W,6);
  ctx.fillStyle=tc;ctx.fillRect(0,H-6,W*tFrac,6);
}

function drawOverlay(title,sc,nb){
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=24;ctx.font='bold 26px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-90);ctx.shadowBlur=0;
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.shadowBlur=12;ctx.font='bold 44px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2-20);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,H/2+2);}
  if(nb){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+28);}
  else if(best>0&&sc!==undefined){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+28);}
  if(sc!==undefined){ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('MAX COMBO: x'+maxCombo,W/2,H/2+54);}
  if(sc===undefined){ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('CLICK THE TARGETS! 60 SECONDS!',W/2,H/2+16);ctx.fillText('COMBOS MULTIPLY YOUR SCORE!',W/2,H/2+34);}
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('CLICK to '+(title==='TIME\'S UP!'?'restart':'play'),W/2,H/2+76);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){drawBg();drawOverlay('SHOOTING GALLERY',undefined,false);if(click){startGame();STATE='GAME';}}
  else if(STATE==='GAME'){
    drawBg();
    targets.forEach(drawTarget);
    drawFX();drawHUD();drawCrosshair();
    if(click)tryShoot();
    update();
  }
  else if(STATE==='GAMEOVER'){
    drawBg();targets.forEach(drawTarget);drawFX();
    drawOverlay('TIME\'S UP!',score,score>=best&&score>0);
    if(click){startGame();STATE='GAME';}
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
