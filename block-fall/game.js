'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=380,H=680;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false,mX=W/2,mY=H/2;
window.addEventListener('keydown',e=>{keys[e.code]=true;if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);mY=(e.clientY-r.top)*(H/r.height);clickFrame=true;});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='square',vol=0.06,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxLand(){tone(200,0.04,'sine',0.05);}
function sfxLine(n){[440,550,660,880].slice(0,n).forEach((f,i)=>tone(f,0.08,'triangle',0.09,i*0.06));}
function sfxGameOver(){tone(180,0.2,'sawtooth',0.12);tone(90,0.4,'sawtooth',0.14,0.15);}

const GCOLS=10,GROWS=20,CS=30,GX=(W-GCOLS*CS)/2,GY=50;
const PIECES=[
  {shape:[[1,1,1,1]],col:'#44ddff'},      // I
  {shape:[[1,1],[1,1]],col:'#ffd700'},     // O
  {shape:[[0,1,0],[1,1,1]],col:'#cc44ff'},// T
  {shape:[[0,1,1],[1,1,0]],col:'#44cc66'},// S
  {shape:[[1,1,0],[0,1,1]],col:'#ff4455'},// Z
  {shape:[[1,0,0],[1,1,1]],col:'#ff8833'},// L
  {shape:[[0,0,1],[1,1,1]],col:'#4488ff'},// J
];

let STATE='TITLE',board,piece,score,lines,level,best=+(localStorage.getItem('bf_best')||0);
let dropT,dropInterval,frame,prevKeys={},tf=0,particles=[];

function newBoard(){return Array.from({length:GROWS},()=>Array(GCOLS).fill(null));}
function randPiece(){const p=PIECES[Math.floor(Math.random()*PIECES.length)];return{shape:p.shape.map(r=>[...r]),col:p.col,x:Math.floor(GCOLS/2)-Math.floor(p.shape[0].length/2),y:0};}

function startGame(){board=newBoard();piece=randPiece();score=0;lines=0;level=1;dropT=0;dropInterval=48;frame=0;particles=[];}

function rotate(sh){const R=sh[0].length,C=sh.length;return Array.from({length:R},(_,r)=>Array.from({length:C},(_,c)=>sh[C-1-c][r]));}

function valid(sh,x,y){return sh.every((row,dr)=>row.every((v,dc)=>!v||((y+dr<GROWS)&&(x+dc>=0)&&(x+dc<GCOLS)&&(!board[y+dr]||!board[y+dr][x+dc]))));}

function lock(){
  piece.shape.forEach((row,dr)=>row.forEach((v,dc)=>{if(v&&piece.y+dr>=0)board[piece.y+dr][piece.x+dc]=piece.col;}));
  sfxLand();
  // Clear lines
  const full=[];
  board=board.filter((row,i)=>{if(row.every(c=>c)){full.push(i);return false;}return true;});
  if(full.length){
    sfxLine(full.length);
    const pts=[0,100,300,500,800][full.length]*level;score+=pts;lines+=full.length;level=Math.floor(lines/10)+1;
    dropInterval=Math.max(8,48-level*4);
    if(score>best){best=score;localStorage.setItem('bf_best',String(best));}
    // Pad top
    while(board.length<GROWS)board.unshift(Array(GCOLS).fill(null));
    // Particles for cleared rows
    full.forEach(r=>{for(let c=0;c<GCOLS;c++){const a=Math.random()*Math.PI*2,s=3+Math.random()*6;particles.push({x:GX+c*CS+CS/2,y:GY+r*CS+CS/2,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,col:['#ffd700','#44ff88','#44aaff'][Math.floor(Math.random()*3)],r:3+Math.random()*4,life:24+Math.random()*14});}});
  }
  piece=randPiece();
  if(!valid(piece.shape,piece.x,piece.y)){sfxGameOver();if(score>best){best=score;localStorage.setItem('bf_best',String(best));}STATE='GAMEOVER';}
}

function update(){
  frame++;
  const jl=keys['ArrowLeft']||keys['KeyA'],jr=keys['ArrowRight']||keys['KeyD'],ju=keys['ArrowUp']||keys['KeyW'],jd=keys['ArrowDown']||keys['KeyS'],sp=keys['Space'];
  if(jl&&!prevKeys.jl&&valid(piece.shape,piece.x-1,piece.y))piece.x--;
  if(jr&&!prevKeys.jr&&valid(piece.shape,piece.x+1,piece.y))piece.x++;
  if(ju&&!prevKeys.ju){const r=rotate(piece.shape);if(valid(r,piece.x,piece.y))piece.shape=r;}
  if(sp&&!prevKeys.sp){while(valid(piece.shape,piece.x,piece.y+1))piece.y++;lock();}
  prevKeys={jl,jr,ju,jd,sp};
  const spd=jd?4:dropInterval;
  if(++dropT>=spd){dropT=0;if(valid(piece.shape,piece.x,piece.y+1))piece.y++;else lock();}
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;return --p.life>0;});
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#080818');g.addColorStop(1,'#12123a');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

function drawBlock(x,y,col){
  const px=GX+x*CS,py=GY+y*CS;
  ctx.shadowColor=col;ctx.shadowBlur=6;
  const g=ctx.createLinearGradient(px,py,px+CS,py+CS);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle=g;ctx.fillRect(px+1,py+1,CS-2,CS-2);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(px+2,py+2,CS-4,6);
  ctx.shadowBlur=0;
}

function drawGhost(){
  let gy=piece.y;while(valid(piece.shape,piece.x,gy+1))gy++;
  piece.shape.forEach((row,dr)=>row.forEach((v,dc)=>{if(v&&gy+dr>=0){const px=GX+(piece.x+dc)*CS,py=GY+(gy+dr)*CS;ctx.globalAlpha=0.15;ctx.fillStyle=piece.col;ctx.fillRect(px+1,py+1,CS-2,CS-2);ctx.globalAlpha=1;}}));
}

function drawBoard(){
  ctx.fillStyle='rgba(255,255,255,0.03)';ctx.fillRect(GX,GY,GCOLS*CS,GROWS*CS);
  ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.5;
  for(let r=0;r<=GROWS;r++){ctx.beginPath();ctx.moveTo(GX,GY+r*CS);ctx.lineTo(GX+GCOLS*CS,GY+r*CS);ctx.stroke();}
  for(let c=0;c<=GCOLS;c++){ctx.beginPath();ctx.moveTo(GX+c*CS,GY);ctx.lineTo(GX+c*CS,GY+GROWS*CS);ctx.stroke();}
  board.forEach((row,r)=>row.forEach((col,c)=>{if(col)drawBlock(c,r,col);}));
  drawGhost();
  piece.shape.forEach((row,dr)=>row.forEach((v,dc)=>{if(v)drawBlock(piece.x+dc,piece.y+dr,piece.col);}));
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/28);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,46);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,30);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,42);
  ctx.textAlign='left';ctx.fillStyle='#44aaff';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('LVL '+level,8,28);ctx.fillText('LINES '+lines,8,40);
  ctx.textAlign='right';ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST '+best,W-8,28);
  ctx.textAlign='left';
}

function drawOverlay(title,sc,nb){
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#44aaff';ctx.shadowColor='#44aaff';ctx.shadowBlur=20;ctx.font='bold 22px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-90);ctx.shadowBlur=0;
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.font='bold 36px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2-20);ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,H/2+2);}
  if(nb){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+28);}
  else if(best>0&&sc!==undefined){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+28);}
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('← → MOVE   ↑ ROTATE   ↓ SOFT DROP',W/2,H/2+56);
  ctx.fillText('SPACE = HARD DROP',W/2,H/2+72);
  ctx.fillText('CLICK / ENTER to '+(title==='GAME OVER'?'restart':'play'),W/2,H/2+96);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){drawBg();drawOverlay('BLOCK FALL',undefined,false);if(click||keys['Enter']||keys['Space']){startGame();STATE='GAME';}}
  else if(STATE==='GAME'){drawBg();drawBoard();drawHUD();update();}
  else if(STATE==='GAMEOVER'){drawBg();drawBoard();drawHUD();drawOverlay('GAME OVER',score,score>=best&&score>0);if(click||keys['Enter']||keys['Space']){startGame();STATE='GAME';}}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
