'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=560,H=560;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false,lastKey='';
window.addEventListener('keydown',e=>{keys[e.code]=true;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
  if(e.code==='ArrowLeft')lastKey='L';else if(e.code==='ArrowRight')lastKey='R';
  else if(e.code==='ArrowUp')lastKey='U';else if(e.code==='ArrowDown')lastKey='D';
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();clickFrame=true;});

// Swipe support
let tx=0,ty=0;
canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>Math.abs(dy)){lastKey=dx>0?'R':'L';}else{lastKey=dy>0?'D':'U';}
  clickFrame=true;e.preventDefault();
},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxEat(){tone(660,0.04,'square',0.05);}
function sfxPower(){tone(440,0.12,'sine',0.08);}
function sfxDie(){tone(200,0.08,'sawtooth',0.1);tone(120,0.2,'sawtooth',0.1);}
function sfxWin(){tone(523,0.08,'sine',0.07);tone(659,0.08,'sine',0.07);tone(784,0.15,'sine',0.07);}

// 19x19 maze: 1=wall, 0=dot, 2=power, 3=empty(ghost house)
const MAZE_W=19,MAZE_H=19,CS=28,OX=(W-MAZE_W*CS)/2,OY=(H-MAZE_H*CS)/2;
const TMAZE=[
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,3,1,3,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,1,1,3,1,1,3,1,0,1,1,1,1],
  [0,0,0,0,0,3,3,1,3,3,3,1,3,3,0,0,0,0,0],
  [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,2,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,2,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  // extra rows to fill H
].concat([[1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],[1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1]]);

// Use a clean 21x21 maze instead
const RAW=[
  '1111111111111111111',
  '1p00000001000000p1',
  '101110101010101011',  // fix
  '100000000100000001',
  '101011111011101011',
  '100010000000010001',
  '111010111111010111',
  '000010133331010000',
  '111010131031010111',
  '000010333033010000',
  '111010131031010111',
  '000010133331010000',
  '111010111111010111',
  '100010000000010001',
  '101011111011101011',
  '100000000100000001',
  '101110101010101011',
  '1p00000001000000p1',
  '1111111111111111',
];

// Build maze grid properly
function buildMaze(){
  const g=[];
  for(let r=0;r<MAZE_H;r++){
    g.push([]);
    for(let c=0;c<MAZE_W;c++){
      const row=RAW[r]||'';
      const ch=row[c]||'1';
      if(ch==='1')g[r].push(1);
      else if(ch==='p')g[r].push(2);
      else if(ch==='3')g[r].push(3);
      else g[r].push(0);
    }
  }
  return g;
}

// Simple clean maze
const MAZE=[
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,3,3,3,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,1,0,1,1,1,1],
  [0,0,0,0,0,1,3,1,3,3,3,1,3,1,0,0,0,0,0],
  [1,1,1,1,0,1,3,3,3,3,3,3,3,1,0,1,1,1,1],
  [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
  [1,1,1,1,0,3,3,3,3,3,3,3,3,3,0,1,1,1,1],
  [1,0,0,0,0,1,0,1,1,1,1,1,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,0,0,0,1,0,0,0,1,0,1,1,0,1],
  [1,2,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,2,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

let grid,totalDots,STATE='TITLE',player,ghosts,score,best=+(localStorage.getItem('pm_best')||0),lives,powerTimer,frame,tf=0;

function countDots(g){let n=0;for(let r=0;r<MAZE_H;r++)for(let c=0;c<MAZE_W;c++)if(g[r][c]===0||g[r][c]===2)n++;return n;}

function cellWalkable(g,r,c){if(r<0||r>=MAZE_H||c<0||c>=MAZE_W)return false;return g[r][c]!==1;}
function ghostWalkable(g,r,c){if(r<0||r>=MAZE_H||c<0||c>=MAZE_W)return false;return g[r][c]!==1;}

function startGame(){
  grid=MAZE.map(r=>[...r]);
  totalDots=countDots(grid);
  score=0;lives=3;frame=0;powerTimer=0;lastKey='';
  player={r:16,c:9,tr:16,tc:9,px:9*CS+OX+CS/2,py:16*CS+OY+CS/2,dir:'',nextDir:''};
  ghosts=[
    {r:9,c:8,tr:9,tc:8,dir:'U',col:'#ff4444',scared:false,eyes:false,spawnT:0},
    {r:9,c:9,tr:9,tc:9,dir:'U',col:'#ffb8ff',scared:false,eyes:false,spawnT:30},
    {r:9,c:10,tr:9,tc:10,dir:'U',col:'#00ffff',scared:false,eyes:false,spawnT:60},
    {r:10,c:9,tr:10,tc:9,dir:'L',col:'#ffb852',scared:false,eyes:false,spawnT:90},
  ];
  STATE='GAME';
}

function dirToVec(d){return d==='U'?[-1,0]:d==='D'?[1,0]:d==='L'?[0,-1]:d==='R'?[0,1]:[0,0];}

function movePlayer(){
  const DM={'U':[-1,0],'D':[1,0],'L':[0,-1],'R':[0,1]};
  // Read held keys OR swipe as wanted direction
  let want=lastKey||'';lastKey='';
  if(!want){
    if(keys['ArrowUp']||keys['KeyW'])want='U';
    else if(keys['ArrowDown']||keys['KeyS'])want='D';
    else if(keys['ArrowLeft']||keys['KeyA'])want='L';
    else if(keys['ArrowRight']||keys['KeyD'])want='R';
  }
  // Queue wanted direction if it's not immediately walkable
  if(want)player.nextDir=want;
  // Try to switch to queued direction
  if(player.nextDir){
    const m=DM[player.nextDir];
    if(m){const nr=(player.r+m[0]+MAZE_H)%MAZE_H,nc=(player.c+m[1]+MAZE_W)%MAZE_W;
      if(cellWalkable(grid,nr,nc)){player.dir=player.nextDir;player.nextDir='';}}
  }
  // Move in current direction
  if(player.dir){
    const m=DM[player.dir];
    const nr=(player.r+m[0]+MAZE_H)%MAZE_H,nc=(player.c+m[1]+MAZE_W)%MAZE_W;
    if(cellWalkable(grid,nr,nc)){player.r=nr;player.c=nc;}
    else{player.dir='';}
  }
  player.px=player.c*CS+OX+CS/2;
  player.py=player.r*CS+OY+CS/2;
  // Eat
  const cell=grid[player.r][player.c];
  if(cell===0){grid[player.r][player.c]=3;score+=10;sfxEat();if(score>best){best=score;localStorage.setItem('pm_best',String(best));}}
  if(cell===2){grid[player.r][player.c]=3;score+=50;sfxPower();powerTimer=300;ghosts.forEach(g=>{g.scared=true;});}
}

function moveGhost(g){
  if(g.spawnT>0){g.spawnT--;return;}
  const dirs=['U','D','L','R'];
  const opp={'U':'D','D':'U','L':'R','R':'L'};
  const [dr,dc]={'U':[-1,0],'D':[1,0],'L':[0,-1],'R':[0,1]}[g.dir]||[0,0];
  const nr=(g.r+dr+MAZE_H)%MAZE_H,nc=(g.c+dc+MAZE_W)%MAZE_W;
  if(ghostWalkable(grid,nr,nc)){g.r=nr;g.c=nc;}
  // Pick new direction occasionally or when hitting wall
  const canContinue=ghostWalkable(grid,nr,nc);
  if(!canContinue||Math.random()<0.25){
    const valid=dirs.filter(d=>{
      if(d===opp[g.dir]&&canContinue)return false;
      const [er,ec]={'U':[-1,0],'D':[1,0],'L':[0,-1],'R':[0,1]}[d];
      return ghostWalkable(grid,(g.r+er+MAZE_H)%MAZE_H,(g.c+ec+MAZE_W)%MAZE_W);
    });
    if(valid.length>0){
      if(!g.scared&&Math.random()<0.5){
        // Chase player
        const pr=player.r,pc=player.c;
        valid.sort((a,b)=>{
          const [ar,ac]={'U':[-1,0],'D':[1,0],'L':[0,-1],'R':[0,1]}[a];
          const [br,bc]={'U':[-1,0],'D':[1,0],'L':[0,-1],'R':[0,1]}[b];
          const da=Math.abs(g.r+ar-pr)+Math.abs(g.c+ac-pc);
          const db=Math.abs(g.r+br-pr)+Math.abs(g.c+bc-pc);
          return da-db;
        });
        g.dir=valid[0];
      } else {
        g.dir=valid[Math.floor(Math.random()*valid.length)];
      }
    }
  }
  g.px=g.c*CS+OX+CS/2;g.py=g.r*CS+OY+CS/2;
}

function update(){
  frame++;
  if(powerTimer>0)powerTimer--;
  if(powerTimer===0)ghosts.forEach(g=>{g.scared=false;});
  // Move player every 6 frames
  if(frame%6===0)movePlayer();
  // Move ghosts every 8 frames (10 when scared)
  const ghostRate=powerTimer>0?10:8;
  if(frame%ghostRate===0)ghosts.forEach(g=>moveGhost(g));
  // Collide
  ghosts.forEach(g=>{
    if(Math.abs(g.r-player.r)<=0&&Math.abs(g.c-player.c)<=0){
      if(g.scared){g.scared=false;g.r=9;g.c=9;g.spawnT=60;score+=200;sfxWin();}
      else{sfxDie();lives--;if(lives<=0){STATE='GAMEOVER';}else{player.r=16;player.c=9;player.dir='';player.nextDir='';}}
    }
  });
  // Win
  const remaining=countDots(grid);
  if(remaining===0){sfxWin();STATE='WIN';}
}

function drawMaze(){
  for(let r=0;r<MAZE_H;r++){
    for(let c=0;c<MAZE_W;c++){
      const x=OX+c*CS,y=OY+r*CS,cell=grid[r][c];
      if(cell===1){ctx.fillStyle='#1a1aff';ctx.fillRect(x,y,CS,CS);ctx.strokeStyle='#4444ff';ctx.lineWidth=1;ctx.strokeRect(x+1,y+1,CS-2,CS-2);}
      else if(cell===0){ctx.fillStyle='#ffdd44';ctx.beginPath();ctx.arc(x+CS/2,y+CS/2,3,0,Math.PI*2);ctx.fill();}
      else if(cell===2){ctx.fillStyle='#ffdd44';ctx.shadowColor='#ffdd44';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x+CS/2,y+CS/2,7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    }
  }
}

function drawPlayer(){
  const x=player.px,y=player.py,r=CS*0.42;
  const mouthAngle=0.25;
  const angles={'R':[mouthAngle,2*Math.PI-mouthAngle],'L':[Math.PI+mouthAngle,Math.PI+2*Math.PI-mouthAngle],'U':[-Math.PI/2+mouthAngle,-Math.PI/2+2*Math.PI-mouthAngle],'D':[Math.PI/2+mouthAngle,Math.PI/2+2*Math.PI-mouthAngle],'':  [0.25,2*Math.PI-0.25]}[player.dir||''];
  ctx.fillStyle='#ffff00';ctx.shadowColor='#ffff00';ctx.shadowBlur=8;
  ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,angles[0],angles[1]);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
}

function drawGhosts(){
  ghosts.forEach(g=>{
    const x=g.px||g.c*CS+OX+CS/2,y=g.py||g.r*CS+OY+CS/2,r=CS*0.42;
    const col=g.scared?(frame%20<10?'#2222ff':'#ffffff'):g.col;
    ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=6;
    ctx.beginPath();ctx.arc(x,y-r*0.1,r,Math.PI,0);
    ctx.lineTo(x+r,y+r*0.7);
    for(let i=0;i<3;i++){ctx.quadraticCurveTo(x+r-(i*2+1)*r/3,y+r*0.3,x+r-(i+1)*r/1.5,y+r*0.7);}
    ctx.lineTo(x-r,y+r*0.7);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;
    // Eyes
    if(!g.scared){
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-r*0.28,y-r*0.15,r*0.22,r*0.28,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x+r*0.28,y-r*0.15,r*0.22,r*0.28,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#00f';ctx.beginPath();ctx.arc(x-r*0.22,y-r*0.12,r*0.12,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#00f';ctx.beginPath();ctx.arc(x+r*0.32,y-r*0.12,r*0.12,0,Math.PI*2);ctx.fill();
    }
  });
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,OY);
  ctx.fillStyle='#ffff00';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='left';ctx.fillText('SCORE: '+score,8,18);
  ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.fillText('BEST: '+best,W-8,18);
  ctx.textAlign='left';
  for(let i=0;i<lives;i++){ctx.fillStyle='#ffff00';ctx.beginPath();ctx.arc(8+i*20,OY-10,7,0.3,2*Math.PI-0.3);ctx.lineTo(8+i*20,OY-10);ctx.closePath();ctx.fill();}
}

function drawOverlay(title,sub,col){
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle=col||'#ffff00';ctx.font='bold 24px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-40);
  if(sub){ctx.fillStyle='#fff';ctx.font='9px "Press Start 2P",monospace';ctx.fillText(sub,W/2,H/2);}
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('SCORE: '+score,W/2,H/2+30);
  ctx.fillText('CLICK or SPACE to play',W/2,H/2+55);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffff00';ctx.font='bold 26px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('PAC MAN',W/2,H/2-60);
    ctx.fillStyle='#fff';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('EAT ALL THE DOTS!',W/2,H/2-20);
    ctx.fillStyle='#aaa';ctx.fillText('ARROW KEYS or SWIPE to move',W/2,H/2+10);
    if(best>0){ctx.fillStyle='#ffff00';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+40);}
    ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK or SPACE to start',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  } else if(STATE==='GAME'){
    drawMaze();drawPlayer();drawGhosts();drawHUD();update();
    if(powerTimer>0&&powerTimer<100&&frame%10<5){ctx.fillStyle='rgba(0,0,255,0.15)';ctx.fillRect(0,0,W,H);}
  } else if(STATE==='GAMEOVER'){
    drawMaze();drawPlayer();drawGhosts();drawHUD();
    drawOverlay('GAME OVER','YOU GOT EATEN!','#ff4444');
    if(click||keys['Space'])startGame();
  } else if(STATE==='WIN'){
    drawMaze();drawHUD();
    drawOverlay('YOU WIN!','ALL DOTS EATEN!','#ffff00');
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
