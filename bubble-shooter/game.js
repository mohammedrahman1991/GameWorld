'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=480,H=660;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

let clickFrame=false,mX=W/2,mY=H;
function getPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
canvas.addEventListener('mousemove',e=>{const p=getPos(e);mX=p.x;mY=p.y;});
canvas.addEventListener('click',e=>{const p=getPos(e);mX=p.x;mY=p.y;clickFrame=true;});
canvas.addEventListener('touchend',e=>{e.preventDefault();const p=getPos(e.changedTouches[0]);mX=p.x;mY=p.y;clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='sine',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxShoot(){tone(440,0.05,'square',0.05);}
function sfxPop(n){[440,550,660].slice(0,Math.min(n,3)).forEach((f,i)=>tone(f,0.07,'triangle',0.08,i*0.05));}
function sfxDrop(){tone(220,0.1,'sine',0.06);}

const COLS=10,BR=22,COLORS=['#ff4455','#4488ff','#44cc66','#ffd700','#cc44ff','#ff8833'];
const BW=BR*2,ROW_H=BR*1.72;
let STATE='TITLE',grid,bullet,nextColor,score,best=+(localStorage.getItem('bbs_best')||0),frame,particles=[],floats=[];

function randColor(){return COLORS[Math.floor(Math.random()*COLORS.length)];}

function startGame(){
  grid=[];
  for(let r=0;r<8;r++){
    const row=[];
    for(let c=0;c<COLS-(r%2===0?0:0);c++) row.push(randColor());
    grid.push(row);
  }
  bullet=null;nextColor=randColor();score=0;frame=0;particles=[];floats=[];
}

function bx(col,row){return (row%2===0?0:BR)+BR+col*BW;}
function by(row){return 50+row*ROW_H;}

function shoot(){
  if(bullet) return;
  const angle=Math.atan2(mY-(H-70),mX-W/2);
  const spd=12;
  bullet={x:W/2,y:H-70,vx:Math.cos(angle)*spd,vy:Math.sin(angle)*spd,color:nextColor};
  nextColor=randColor();sfxShoot();
}

function popGroup(startR,startC){
  const col=grid[startR][startC];
  const visited=new Set();
  const stack=[[startR,startC]];
  while(stack.length){
    const [r,c]=stack.pop();
    const key=r+','+c;
    if(visited.has(key)) continue;
    if(r<0||r>=grid.length||c<0||c>=grid[r].length) continue;
    if(grid[r][c]!==col) continue;
    visited.add(key);
    const off=r%2===0?[[0,1],[0,-1],[1,0],[-1,0],[1,-1],[1,1],[-1,-1],[-1,1]]:[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    off.forEach(([dr,dc])=>stack.push([r+dr,c+dc]));
  }
  return [...visited].map(k=>k.split(',').map(Number));
}

function dropFloating(){
  // Remove bubbles not connected to top row
  const connected=new Set();
  const queue=grid[0]?.map((_,c)=>[0,c]).filter(([,c])=>grid[0][c]) || [];
  queue.forEach(([r,c])=>connected.add(r+','+c));
  let qi=0;
  while(qi<queue.length){
    const [r,c]=queue[qi++];
    const off=r%2===0?[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[1,1],[-1,-1],[-1,1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    off.forEach(([dr,dc])=>{const nr=r+dr,nc=c+dc,k=nr+','+nc;if(!connected.has(k)&&nr>=0&&nr<grid.length&&nc>=0&&nr<grid[nr]?.length&&grid[nr]?.[nc]){connected.add(k);queue.push([nr,nc]);}});
  }
  let dropped=0;
  grid.forEach((row,r)=>row.forEach((col,c)=>{if(col&&!connected.has(r+','+c)){spawnPfx(bx(c,r),by(r),col,6);score+=5;dropped++;grid[r][c]=null;}}));
  if(dropped>0) sfxDrop();
}

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*6;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:3+Math.random()*4,life:18+Math.random()*12});}}
function addFloat(x,y,t,col){floats.push({x,y,txt:t,col,life:48});}

function update(){
  frame++;
  if(!bullet) return;
  bullet.x+=bullet.vx;bullet.y+=bullet.vy;
  // Wall bounce
  if(bullet.x<BR){bullet.x=BR;bullet.vx=Math.abs(bullet.vx);}
  if(bullet.x>W-BR){bullet.x=W-BR;bullet.vx=-Math.abs(bullet.vx);}
  if(bullet.y<50){bullet.y=50;bullet.vy=0;placeBullet(0,0);return;}
  // Check grid collision
  let placed=false;
  for(let r=0;r<grid.length&&!placed;r++){
    for(let c=0;c<grid[r].length&&!placed;c++){
      if(!grid[r][c]) continue;
      if(Math.hypot(bullet.x-bx(c,r),bullet.y-by(r))<BR*1.85){
        // Find nearest empty slot near impact
        placeBullet(r,c);placed=true;
      }
    }
  }
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;return --p.life>0;});
  floats=floats.filter(f=>{f.y-=0.8;return --f.life>0;});
}

function placeBullet(nr,nc){
  // Find best slot near hit
  let bestSlot=null,bestDist=Infinity;
  for(let r=0;r<Math.min(grid.length+1,12);r++){
    const cols=grid[r]?.length||COLS;
    for(let c=0;c<cols;c++){
      if(grid[r]&&grid[r][c]) continue;
      const d=Math.hypot(bullet.x-bx(c,r),bullet.y-by(r));
      if(d<bestDist){bestDist=d;bestSlot=[r,c];}
    }
  }
  if(!bestSlot){bullet=null;return;}
  const [r,c]=bestSlot;
  if(!grid[r]) grid[r]=Array(COLS).fill(null);
  grid[r][c]=bullet.color;
  // Check matches
  const group=popGroup(r,c);
  if(group.length>=3){
    sfxPop(group.length);
    const pts=group.length*10;score+=pts;addFloat(bx(c,r),by(r),'+'+pts,'#ffd700');
    group.forEach(([gr,gc])=>{spawnPfx(bx(gc,gr),by(gr),grid[gr][gc],8);grid[gr][gc]=null;});
    if(score>best){best=score;localStorage.setItem('bbs_best',String(best));}
    dropFloating();
  }
  bullet=null;
  // Check game over — bubbles too low
  if(grid.length>14||grid.some((row,r)=>r>11&&row.some(c=>c))){STATE='GAMEOVER';}
}

function drawBubble(x,y,col,r2){
  r2=r2||BR;
  ctx.shadowColor=col;ctx.shadowBlur=10;
  const g=ctx.createRadialGradient(x-r2*0.35,y-r2*0.35,r2*0.1,x,y,r2);
  g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.4,col);g.addColorStop(1,'rgba(0,0,0,0.4)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#080820');g.addColorStop(1,'#12123a');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

function drawAimLine(){
  if(bullet) return;
  const ax=W/2,ay=H-70;
  const angle=Math.atan2(mY-ay,mX-ax);
  ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1.5;ctx.setLineDash([8,10]);
  ctx.beginPath();let cx=ax,cy=ay,dx=Math.cos(angle)*8,dy=Math.sin(angle)*8;
  for(let i=0;i<30;i++){cx+=dx;cy+=dy;if(cx<BR){dx=Math.abs(dx);}if(cx>W-BR){dx=-Math.abs(dx);}if(cy<50)break;ctx.lineTo(cx,cy);}
  ctx.stroke();ctx.setLineDash([]);
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,46);ctx.fillRect(0,H-90,W,90);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,30);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,42);
  ctx.textAlign='right';ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST '+best,W-10,30);
  // Launcher
  ctx.fillStyle='#333';ctx.beginPath();ctx.roundRect(W/2-18,H-52,36,30,6);ctx.fill();
  drawBubble(W/2,H-70,nextColor,BR*0.7);
  ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='6px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('NEXT:',W/2-50,H-62);
  drawBubble(W/2-50,H-44,nextColor,BR*0.55);
  ctx.textAlign='left';
}

function drawFX(){
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/24);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  floats.forEach(f=>{ctx.globalAlpha=Math.min(1,f.life/14);ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x,f.y);});ctx.globalAlpha=1;ctx.textAlign='left';
}

function drawTitle(){
  drawBg();
  COLORS.forEach((col,i)=>{const x=60+i*65,y=300+Math.sin(Date.now()*0.002+i)*20;drawBubble(x,y,col);});
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ff8833';ctx.shadowColor='#ff8833';ctx.shadowBlur=24;ctx.font='bold 28px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('BUBBLE',W/2,195);ctx.shadowBlur=0;
  ctx.fillStyle='#44aaff';ctx.shadowColor='#44aaff';ctx.shadowBlur=20;ctx.font='bold 28px "Press Start 2P",monospace';ctx.fillText('SHOOTER',W/2,250);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('AIM & SHOOT — MATCH 3+ COLORS!',W/2,278);
  if(best>0){ctx.fillStyle='#ffd700';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,302);}
  const ph=mX>W/2-100&&mX<W/2+100&&mY>336&&mY<390;
  ctx.fillStyle=ph?'#55bbff':'#44aaff';ctx.beginPath();ctx.roundRect(W/2-100,336,200,54,10);ctx.fill();
  ctx.fillStyle='#020210';ctx.font='bold 14px "Press Start 2P",monospace';ctx.fillText('PLAY',W/2,372);
  if(clickFrame&&ph){startGame();STATE='GAME';}
}

function drawGameOver(){
  drawBg();ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ff4455';ctx.shadowColor='#ff4455';ctx.shadowBlur=18;ctx.font='bold 26px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,195);ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.shadowBlur=12;ctx.font='bold 44px "Press Start 2P",monospace';ctx.fillText(score,W/2,260);ctx.shadowBlur=0;
  if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,294);}
  else{ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,294);}
  const ph=mX>W/2-110&&mX<W/2+110&&mY>326&&mY<380;
  ctx.fillStyle=ph?'#55bbff':'#44aaff';ctx.beginPath();ctx.roundRect(W/2-110,326,220,54,10);ctx.fill();
  ctx.fillStyle='#020210';ctx.font='bold 11px "Press Start 2P",monospace';ctx.fillText('PLAY AGAIN',W/2,360);
  if(clickFrame&&ph){startGame();STATE='GAME';}
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){clickFrame=click;drawTitle();clickFrame=false;}
  else if(STATE==='GAME'){
    drawBg();
    grid.forEach((row,r)=>row.forEach((col,c)=>{if(col)drawBubble(bx(c,r),by(r),col);}));
    if(bullet)drawBubble(bullet.x,bullet.y,bullet.color);
    drawAimLine();drawFX();drawHUD();
    clickFrame=click;if(clickFrame&&!bullet&&mY<H-90){shoot();}update();clickFrame=false;
  }
  else if(STATE==='GAMEOVER'){clickFrame=click;drawGameOver();clickFrame=false;}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
