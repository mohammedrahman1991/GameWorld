'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=400,H=560;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',e=>{clickFrame=true;});
let tx=0,ty=0;
canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  const r=canvas.getBoundingClientRect();
  if(Math.abs(dx)<20&&Math.abs(dy)<20){keys['ArrowUp']=true;setTimeout(()=>keys['ArrowUp']=false,80);return;}
  if(Math.abs(dx)>Math.abs(dy)){if(dx>0){keys['ArrowRight']=true;setTimeout(()=>keys['ArrowRight']=false,80);}else{keys['ArrowLeft']=true;setTimeout(()=>keys['ArrowLeft']=false,80);}}
  else{if(dy<0){keys['ArrowUp']=true;setTimeout(()=>keys['ArrowUp']=false,80);}else{keys['ArrowDown']=true;setTimeout(()=>keys['ArrowDown']=false,80);}}
  e.preventDefault();
},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxHop(){tone(440,0.05,'sine',0.06);}
function sfxDie(){tone(200,0.15,'sawtooth',0.1);}
function sfxScore(){tone(660,0.06,'sine',0.06);tone(880,0.06,'sine',0.06);}

const CELL=40,COLS=W/CELL,ROWS=H/CELL;
const SAFE_ROWS=[0,ROWS-1];
let STATE='TITLE',frog,lanes,score,best=+(localStorage.getItem('cf_best')||0),frame,moveCD=0,tf=0;

function makeLanes(){
  const ls=[];
  for(let r=0;r<ROWS;r++){
    if(r===0||r===ROWS-1||r===Math.floor(ROWS/2)){ls.push({type:'safe',cars:[]});}
    else if(r<Math.floor(ROWS/2)){
      const spd=(0.8+Math.random()*1.4)*(Math.random()<0.5?1:-1);
      const cars=[];const gap=3+Math.random()*3;
      for(let i=0;i<3;i++)cars.push({x:i*gap*CELL+Math.random()*CELL,w:CELL*1.4,col:['#ff4444','#44ff88','#ffcc00','#ff88ff'][Math.floor(Math.random()*4)]});
      ls.push({type:'road',spd,cars});
    } else {
      const spd=(0.6+Math.random()*1.0)*(Math.random()<0.5?1:-1);
      const logs=[];const gap=2+Math.random()*3;
      for(let i=0;i<2;i++)logs.push({x:i*gap*CELL+Math.random()*CELL,w:CELL*(1.8+Math.random())});
      ls.push({type:'water',spd,logs});
    }
  }
  return ls;
}

function startGame(){frog={c:Math.floor(COLS/2),r:ROWS-1,px:0,py:0,hop:0};lanes=makeLanes();score=0;frame=0;moveCD=0;STATE='GAME';}

const kDown={};
function update(){
  frame++;moveCD=Math.max(0,moveCD-1);
  let dc=0,dr=0;
  if((keys['ArrowUp']||keys['KeyW'])&&!kDown['U']){dr=-1;kDown['U']=true;}else if(!keys['ArrowUp']&&!keys['KeyW'])kDown['U']=false;
  if((keys['ArrowDown']||keys['KeyS'])&&!kDown['D']){dr=1;kDown['D']=true;}else if(!keys['ArrowDown']&&!keys['KeyS'])kDown['D']=false;
  if((keys['ArrowLeft']||keys['KeyA'])&&!kDown['L']){dc=-1;kDown['L']=true;}else if(!keys['ArrowLeft']&&!keys['KeyA'])kDown['L']=false;
  if((keys['ArrowRight']||keys['KeyD'])&&!kDown['R']){dc=1;kDown['R']=true;}else if(!keys['ArrowRight']&&!keys['KeyD'])kDown['R']=false;
  if((dr||dc)&&moveCD===0){
    const nr=frog.r+dr,nc=Math.max(0,Math.min(COLS-1,frog.c+dc));
    if(nr>=0&&nr<ROWS){frog.r=nr;frog.c=nc;frog.hop=8;sfxHop();moveCD=8;}
    if(frog.r===0){score++;if(score>best){best=score;localStorage.setItem('cf_best',String(best));}sfxScore();frog.r=ROWS-1;frog.c=Math.floor(COLS/2);}
  }
  if(frog.hop>0)frog.hop--;
  frog.px=frog.c*CELL+CELL/2;frog.py=frog.r*CELL+CELL/2;

  // Move cars/logs
  lanes.forEach((ln,ri)=>{
    if(ln.type==='road')ln.cars.forEach(c=>{c.x+=ln.spd;if(c.x>W+c.w)c.x=-c.w;if(c.x<-c.w)c.x=W+c.w;});
    if(ln.type==='water')ln.logs.forEach(l=>{l.x+=ln.spd;if(l.x>W+l.w)l.x=-l.w;if(l.x<-l.w)l.x=W+l.w;});
  });

  // Collision
  const ln=lanes[frog.r];
  if(ln.type==='road'){
    for(const c of ln.cars){
      if(frog.px>c.x+6&&frog.px<c.x+c.w-6){sfxDie();STATE='GAMEOVER';return;}
    }
  }
  if(ln.type==='water'){
    let onLog=false;
    for(const l of ln.logs){if(frog.px>l.x+6&&frog.px<l.x+l.w-6)onLog=true;}
    if(!onLog){sfxDie();STATE='GAMEOVER';}
  }
}

function drawLanes(){
  lanes.forEach((ln,ri)=>{
    const y=ri*CELL;
    if(ln.type==='safe'){ctx.fillStyle=ri===ROWS-1?'#338833':'#226622';ctx.fillRect(0,y,W,CELL);}
    else if(ln.type==='road'){
      ctx.fillStyle='#555';ctx.fillRect(0,y,W,CELL);
      ctx.strokeStyle='#888';ctx.setLineDash([10,10]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y+CELL/2);ctx.lineTo(W,y+CELL/2);ctx.stroke();ctx.setLineDash([]);
      ln.cars.forEach(c=>{
        ctx.fillStyle=c.col;ctx.fillRect(c.x,y+4,c.w,CELL-8);
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillRect(c.x+4,y+6,c.w*0.4,8);
      });
    } else {
      ctx.fillStyle='#1a5faa';ctx.fillRect(0,y,W,CELL);
      ln.logs.forEach(l=>{ctx.fillStyle='#8B5E3C';ctx.fillRect(l.x,y+6,l.w,CELL-12);ctx.fillStyle='#a06832';ctx.fillRect(l.x+2,y+7,l.w-4,4);});
    }
  });
}

function drawFrog(){
  const x=frog.px,y=frog.py-(frog.hop>0?frog.hop*2:0),r=14;
  ctx.fillStyle='#44cc44';ctx.shadowColor='#44cc44';ctx.shadowBlur=6;
  ctx.beginPath();ctx.ellipse(x,y,r,r*0.8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#66ee66';ctx.beginPath();ctx.arc(x-r*0.4,y-r*0.3,r*0.38,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#66ee66';ctx.beginPath();ctx.arc(x+r*0.4,y-r*0.3,r*0.38,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffff00';ctx.beginPath();ctx.arc(x-r*0.3,y-r*0.1,r*0.22,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffff00';ctx.beginPath();ctx.arc(x+r*0.3,y-r*0.1,r*0.22,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-r*0.28,y-r*0.1,r*0.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x+r*0.3,y-r*0.1,r*0.1,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='#226622';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(W/2-170,H/2-100,340,210);
    ctx.fillStyle='#44ff88';ctx.font='bold 20px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('CROSSY FROG',W/2,H/2-52);
    ctx.fillStyle='#fff';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('HOP ACROSS ROADS & RIVERS',W/2,H/2-20);
    ctx.fillText('REACH THE TOP TO SCORE!',W/2,H/2+2);
    if(best>0){ctx.fillStyle='#44ff88';ctx.fillText('BEST: '+best,W/2,H/2+28);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillText('ARROWS or SWIPE to hop',W/2,H/2+56);
    ctx.fillText('CLICK to start',W/2,H/2+76);
    if(click||keys['Space']||keys['ArrowUp'])startGame();
  } else if(STATE==='GAME'){
    drawLanes();drawFrog();
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,32);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('SCORE: '+score,W/2,22);
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    update();
  } else {
    ctx.fillStyle='#226622';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff4444';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('SQUASHED!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#44ff88';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space']||keys['ArrowUp'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
