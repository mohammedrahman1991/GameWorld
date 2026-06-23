'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=540,H=680;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};
let clickFrame=false,mX=W/2;
window.addEventListener('keydown',e=>{keys[e.code]=true;if([' ','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);clickFrame=true;});
canvas.addEventListener('touchstart',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mX=(e.touches[0].clientX-r.left)*(W/r.width);},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='sine',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxChange(){tone(440,0.05,'square',0.05);}
function sfxPass(){tone(660,0.07,'triangle',0.08);tone(880,0.06,'triangle',0.07,0.07);}
function sfxDie(){tone(200,0.12,'sawtooth',0.1);tone(100,0.25,'sawtooth',0.1,0.1);}

const COLORS=['#ff4444','#44aaff','#44ff88','#ffd700','#cc44ff'];
const CNAMES=['RED','BLUE','GREEN','YELLOW','PURPLE'];
const LANE_W=100,LANES=4,LANE_X0=(W-LANES*LANE_W)/2;
const PLAYER_W=44,PLAYER_H=44,PLAYER_Y=H-120;
const GAP=140,WALL_H=40,SPEED_BASE=4;

let STATE='TITLE',playerX,playerLane,colorIdx,walls,score,best=+(localStorage.getItem('cr_best')||0),frame,speed,particles=[],shake=0,tf=0;

function laneX(l){return LANE_X0+l*LANE_W+LANE_W/2;}

function startGame(){
  playerLane=Math.floor(LANES/2);playerX=laneX(playerLane);colorIdx=0;walls=[];score=0;frame=0;speed=SPEED_BASE;particles=[];shake=0;
  // Seed initial walls
  for(let i=0;i<4;i++)spawnWall(-(i+1)*300-100);
}

function spawnWall(startY){
  const openLane=Math.floor(Math.random()*LANES);
  const ci=Math.floor(Math.random()*COLORS.length);
  walls.push({y:startY||-(WALL_H),openLane,ci,passed:false});
}

function update(){
  frame++;speed=Math.min(14,SPEED_BASE+frame/400);score=Math.floor(frame/30);
  if(score>best){best=score;localStorage.setItem('cr_best',String(best));}

  // Move player toward target lane
  const tx=laneX(playerLane);
  playerX+=(tx-playerX)*0.2;

  // Keyboard / click lane switching
  if((keys['ArrowLeft']||keys['KeyA'])&&!keys._prevL){playerLane=Math.max(0,playerLane-1);sfxChange();}
  if((keys['ArrowRight']||keys['KeyD'])&&!keys._prevR){playerLane=Math.min(LANES-1,playerLane+1);sfxChange();}
  keys._prevL=keys['ArrowLeft']||keys['KeyA'];keys._prevR=keys['ArrowRight']||keys['KeyD'];

  // Move walls
  walls.forEach(w=>{
    w.y+=speed;
    if(!w.passed&&w.y>PLAYER_Y+WALL_H){
      // Check collision
      const px=playerX,py=PLAYER_Y;
      const ly=w.y-WALL_H;
      if(py+PLAYER_H>ly&&py<w.y+WALL_H){
        const inOpen=Math.abs(px-laneX(w.openLane))<LANE_W*0.5-4;
        if(inOpen&&colorIdx===w.ci){sfxPass();score+=5;shake=0;}
        else{sfxDie();shake=10;if(score>best){best=score;localStorage.setItem('cr_best',String(best));}STATE='GAMEOVER';}
      }
      w.passed=true;
    }
  });
  walls=walls.filter(w=>w.y<H+80);
  // Spawn new walls
  const lastY=walls.length?Math.min(...walls.map(w=>w.y)):0;
  if(lastY>-(H*0.4))spawnWall();

  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;return --p.life>0;});
  if(shake>0)shake--;
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#080818');g.addColorStop(1,'#12123a');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Lane lines
  for(let i=0;i<=LANES;i++){ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(LANE_X0+i*LANE_W,0);ctx.lineTo(LANE_X0+i*LANE_W,H);ctx.stroke();}
}

function drawWalls(){
  walls.forEach(w=>{
    for(let l=0;l<LANES;l++){
      if(l===w.openLane) continue;
      const x=LANE_X0+l*LANE_W;
      ctx.shadowColor=COLORS[w.ci];ctx.shadowBlur=10;
      ctx.fillStyle=COLORS[w.ci];ctx.fillRect(x+2,w.y-WALL_H+2,LANE_W-4,WALL_H-4);
      ctx.shadowBlur=0;
      // Label
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.font='bold 6px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(CNAMES[w.ci],x+LANE_W/2,w.y-WALL_H/2+2);
    }
    // Open lane indicator
    const ox=LANE_X0+w.openLane*LANE_W;
    ctx.strokeStyle=COLORS[w.ci];ctx.lineWidth=2;ctx.setLineDash([6,6]);ctx.strokeRect(ox+2,w.y-WALL_H+2,LANE_W-4,WALL_H-4);ctx.setLineDash([]);
  });
  ctx.textAlign='left';
}

function drawPlayer(){
  const x=playerX-PLAYER_W/2,y=PLAYER_Y;
  const col=COLORS[colorIdx];
  ctx.shadowColor=col;ctx.shadowBlur=18;
  const g=ctx.createLinearGradient(x,y,x+PLAYER_W,y+PLAYER_H);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,PLAYER_W,PLAYER_H,10);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.beginPath();ctx.roundRect(x+4,y+4,PLAYER_W-8,PLAYER_H*0.4,5);ctx.fill();
  ctx.shadowBlur=0;
  // Color label on player
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.font='bold 5px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(CNAMES[colorIdx],playerX,y+PLAYER_H+12);ctx.textAlign='left';
}

function drawColorBar(){
  // Bottom color switcher
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,H-60,W,60);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='5px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('CLICK L/R SIDE TO CHANGE COLOR',W/2,H-44);
  const bw=36,gap=10,total=COLORS.length*(bw+gap)-gap,sx=(W-total)/2;
  COLORS.forEach((col,i)=>{
    const bx=sx+i*(bw+gap);
    if(i===colorIdx){ctx.shadowColor=col;ctx.shadowBlur=14;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(bx,H-34,bw,22,5);ctx.stroke();ctx.shadowBlur=0;}
    ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(bx+2,H-32,bw-4,18,4);ctx.fill();
  });
  ctx.textAlign='left';
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,44);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,28);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,40);
  ctx.textAlign='right';ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,28);ctx.textAlign='left';
}

function drawFX(){
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/20);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
}

function drawOverlay(title,sc,nb){
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#44aaff';ctx.shadowColor='#44aaff';ctx.shadowBlur=22;ctx.font='bold 24px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-80);ctx.shadowBlur=0;
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.shadowBlur=12;ctx.font='bold 40px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2-10);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,H/2+10);}
  if(nb){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+36);}
  else if(best>0&&sc!==undefined){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
  if(sc===undefined){ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('← → ARROWS to switch LANE',W/2,H/2+10);ctx.fillText('MATCH YOUR COLOR TO PASS!',W/2,H/2+28);ctx.fillText('CLICK L/R TO CHANGE COLOR',W/2,H/2+46);}
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('CLICK to '+(title==='GAME OVER'?'restart':'play'),W/2,H/2+76);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  const sx=shake?(Math.random()-0.5)*shake:0,sy=shake?(Math.random()-0.5)*shake:0;
  ctx.save();if(shake)ctx.translate(sx,sy);
  ctx.clearRect(-10,-10,W+20,H+20);
  if(STATE==='TITLE'){drawBg();drawOverlay('COLOR RUN',undefined,false);if(click||keys['Space']||keys['Enter']){startGame();STATE='GAME';}}
  else if(STATE==='GAME'){
    drawBg();drawWalls();drawPlayer();drawFX();drawColorBar();drawHUD();
    if(click){if(mX<W/2){colorIdx=(colorIdx-1+COLORS.length)%COLORS.length;}else{colorIdx=(colorIdx+1)%COLORS.length;}sfxChange();}
    update();
  }
  else if(STATE==='GAMEOVER'){drawBg();drawWalls();drawFX();drawHUD();drawOverlay('GAME OVER',score,score>=best&&score>0);if(click||keys['Space']||keys['Enter']){startGame();STATE='GAME';}}
  ctx.restore();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
