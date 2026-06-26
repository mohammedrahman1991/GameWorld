'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=480,H=520;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

let mX=W/2,mY=H/2,clickFrame=false;
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);mY=(e.clientY-r.top)*(H/r.height);});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);mY=(e.clientY-r.top)*(H/r.height);clickFrame=true;});
canvas.addEventListener('touchend',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mX=(e.changedTouches[0].clientX-r.left)*(W/r.width);mY=(e.changedTouches[0].clientY-r.top)*(H/r.height);clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxDive(){tone(440,0.05,'sine',0.05);}
function sfxCatch(){tone(880,0.06,'sine',0.06);}

const WATER_Y=220,NUM_LANES=5,LANE_W=W/NUM_LANES;
let STATE='TITLE',penguins,fish,score,best=+(localStorage.getItem('pw_best')||0),lives,frame,spawnT=0,tf=0;

function startGame(){
  penguins=[];fish=[];score=0;lives=5;frame=0;spawnT=0;
  for(let i=0;i<NUM_LANES;i++)penguins.push({lane:i,x:LANE_W/2+i*LANE_W,y:WATER_Y-36,diving:false,returning:false,hasFish:false,bobFrame:i*12});
  STATE='GAME';
}

function update(){
  frame++;
  if(--spawnT<=0){
    spawnT=Math.max(20,80-frame/40);
    const lane=Math.floor(Math.random()*NUM_LANES);
    if(!fish.some(f=>f.lane===lane))fish.push({lane,x:LANE_W/2+lane*LANE_W,y:WATER_Y+30+Math.random()*80,life:220+Math.random()*100});
  }
  fish=fish.filter(f=>{
    f.life--;
    if(f.life<=0){lives--;if(lives<=0)STATE='GAMEOVER';return false;}
    return true;
  });
  penguins.forEach((p,i)=>{
    p.bobFrame++;
    if(p.diving&&!p.returning){
      p.y+=5;
      for(let fi=fish.length-1;fi>=0;fi--){
        const f=fish[fi];if(f.lane===i&&Math.abs(p.y-f.y)<18){fish.splice(fi,1);p.hasFish=true;p.returning=true;sfxCatch();score+=10;if(score>best){best=score;localStorage.setItem('pw_best',String(best));}}
      }
      if(p.y>H)p.returning=true;
    } else if(p.returning){
      p.y-=5;if(p.y<=WATER_Y-36){p.y=WATER_Y-36;p.diving=false;p.returning=false;p.hasFish=false;}
    }
  });
}

function drawPenguin(p){
  const x=p.x,bob=p.diving?0:Math.sin(p.bobFrame*0.07)*2,y=p.y+bob;
  const tilt=p.diving&&!p.returning?0.5:p.returning?-0.4:0;
  ctx.save();ctx.translate(x,y);ctx.rotate(tilt);
  ctx.fillStyle='#222';ctx.beginPath();ctx.ellipse(0,0,12,17,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,3,7,12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.arc(0,-13,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(3,-14,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(4,-14,1.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff8800';ctx.beginPath();ctx.moveTo(7,-12);ctx.lineTo(14,-10);ctx.lineTo(7,-8);ctx.closePath();ctx.fill();
  if(p.hasFish){ctx.fillStyle='#ffd700';ctx.beginPath();ctx.ellipse(14,-10,8,5,0.3,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  const skyG=ctx.createLinearGradient(0,0,0,WATER_Y);skyG.addColorStop(0,'#87ceeb');skyG.addColorStop(1,'#c8e8ff');
  ctx.fillStyle=skyG;ctx.fillRect(0,0,W,WATER_Y);
  ctx.fillStyle='#d0eefa';ctx.fillRect(0,WATER_Y-40,W,40);ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillRect(0,WATER_Y-40,W,8);
  const wG=ctx.createLinearGradient(0,WATER_Y,0,H);wG.addColorStop(0,'#1a7abf');wG.addColorStop(1,'#0d3d6b');
  ctx.fillStyle=wG;ctx.fillRect(0,WATER_Y,W,H-WATER_Y);
  ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=2;ctx.beginPath();
  for(let x=0;x<W;x+=4)ctx.lineTo(x,WATER_Y+Math.sin(x*0.04+frame*0.04)*4);ctx.stroke();
  for(let i=1;i<NUM_LANES;i++){ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(i*LANE_W,WATER_Y);ctx.lineTo(i*LANE_W,H);ctx.stroke();}

  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='rgba(0,0,30,0.65)';ctx.fillRect(W/2-185,H/2-100,370,220);
    ctx.fillStyle='#44ddff';ctx.font='bold 14px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('PENGUIN WAVE',W/2,H/2-54);
    ctx.fillStyle='#fff';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK A LANE TO DIVE!',W/2,H/2-22);ctx.fillText('CATCH FISH BEFORE THEY ESCAPE!',W/2,H/2-2);
    if(best>0){ctx.fillStyle='#44ddff';ctx.fillText('BEST: '+best,W/2,H/2+24);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillText('CLICK to start',W/2,H/2+68);
    if(click)startGame();
  } else if(STATE==='GAME'){
    fish.forEach(f=>{
      ctx.globalAlpha=Math.min(1,f.life/60);
      ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=5;
      ctx.beginPath();ctx.ellipse(f.x,f.y,11,7,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(f.x-9,f.y-4);ctx.lineTo(f.x-16,f.y-8);ctx.lineTo(f.x-16,f.y+2);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.globalAlpha=1;
    });
    penguins.forEach(p=>drawPenguin(p));
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='left';for(let i=0;i<lives;i++){ctx.fillStyle='#44ddff';ctx.beginPath();ctx.arc(10+i*20,22,6,0,Math.PI*2);ctx.fill();}
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    if(click){const pi=Math.floor(mX/LANE_W);if(pi>=0&&pi<NUM_LANES&&!penguins[pi].diving&&!penguins[pi].returning){penguins[pi].diving=true;sfxDive();}}
    update();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#44ddff';ctx.font='bold 14px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('FISH GOT AWAY!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click)startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
