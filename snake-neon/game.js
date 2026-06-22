'use strict';
// ================================================================
// SNAKE NEON — Classic snake with neon visuals & special food
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 900, H = 600;
canvas.width = W; canvas.height = H;

function resize() {
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width  = Math.floor(W*s)+'px';
  canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Grid
const CELL  = 30;
const COLS  = 30;   // 900 / 30
const ROWS  = 18;   // 540 / 30
const GX    = 0;    // grid origin x
const GY    = 60;   // grid origin y (below HUD)

// ---------------------------------------------------------------- Input
let mX=W/2, mY=H/2, clickFrame=false;
canvas.addEventListener('mousemove', e => {
  const r=canvas.getBoundingClientRect();
  mX=(e.clientX-r.left)*(W/r.width); mY=(e.clientY-r.top)*(H/r.height);
});
canvas.addEventListener('click', e => {
  const r=canvas.getBoundingClientRect();
  mX=(e.clientX-r.left)*(W/r.width); mY=(e.clientY-r.top)*(H/r.height);
  clickFrame=true;
});
function hover(x,y,w,h){ return mX>x&&mX<x+w&&mY>y&&mY<y+h; }

let inputQueue=[];
window.addEventListener('keydown', e => {
  const map={'ArrowUp':{x:0,y:-1},'KeyW':{x:0,y:-1},'ArrowDown':{x:0,y:1},'KeyS':{x:0,y:1},'ArrowLeft':{x:-1,y:0},'KeyA':{x:-1,y:0},'ArrowRight':{x:1,y:0},'KeyD':{x:1,y:0}};
  if(map[e.code]){ inputQueue.push(map[e.code]); e.preventDefault(); }
  if(e.code==='Space'||e.code==='Enter') clickFrame=true;
});

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='square',vol=0.07,delay=0){
  try{
    const a=getAC(),o=a.createOscillator(),g=a.createGain();
    o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f;
    const t=a.currentTime+delay;
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d);
    o.start(t); o.stop(t+d+0.02);
  }catch(e){}
}
function sfxEat()   { tone(440,0.05,'square',0.08); tone(550,0.05,'square',0.06,0.05); }
function sfxGold()  { tone(660,0.06,'triangle',0.1); tone(880,0.07,'triangle',0.1,0.07); tone(1100,0.09,'triangle',0.09,0.15); }
function sfxDie()   { tone(300,0.08,'sawtooth',0.12); tone(180,0.15,'sawtooth',0.14,0.1); tone(90,0.4,'sawtooth',0.16,0.25); }
function sfxMile()  { tone(523,0.07,'triangle',0.1); tone(784,0.08,'triangle',0.1,0.09); tone(1047,0.12,'triangle',0.12,0.18); }

// ---------------------------------------------------------------- State
let STATE='TITLE';
let snake, dir, nextDir, foods, particles, floats;
let score, best=+(localStorage.getItem('sn_best')||0);
let tick, tickInterval, frame=0, milestones;
let paused=false;

// Food types
// normal: #44ff88, +1
// gold:   #ffd700, +5, rare
// blue:   #44aaff, +3, uncommon
// bomb:   #ff3355, -3 (DON'T eat!) — appears after score 10

const FOOD_TYPES=[
  {type:'normal',col:'#44ff88',pts:1,glow:'#44ff88',weight:60},
  {type:'gold',  col:'#ffd700',pts:5,glow:'#ffd700',weight:12},
  {type:'blue',  col:'#44aaff',pts:3,glow:'#44aaff',weight:22},
  {type:'bomb',  col:'#ff3355',pts:-3,glow:'#ff4466',weight:6},
];

function pickFoodType(){
  const total=FOOD_TYPES.filter(f=>f.type!=='bomb'||score>=10).reduce((s,f)=>s+f.weight,0);
  let r=Math.random()*total;
  for(const ft of FOOD_TYPES){
    if(ft.type==='bomb'&&score<10) continue;
    r-=ft.weight; if(r<=0) return ft;
  }
  return FOOD_TYPES[0];
}

// ---------------------------------------------------------------- Init
function startGame(){
  const sx=Math.floor(COLS/2), sy=Math.floor(ROWS/2);
  snake=[{x:sx,y:sy},{x:sx-1,y:sy},{x:sx-2,y:sy}];
  dir={x:1,y:0}; nextDir={x:1,y:0};
  foods=[]; inputQueue=[]; particles=[]; floats=[];
  score=0; tick=0; tickInterval=9; frame=0; milestones=new Set(); paused=false;
  spawnFood(); spawnFood();
}

function onGrid(x,y){ return snake.some(s=>s.x===x&&s.y===y)||foods.some(f=>f.x===x&&f.y===y); }

function spawnFood(){
  if(foods.length>=3) return;
  let fx,fy, tries=0;
  do { fx=Math.floor(Math.random()*COLS); fy=Math.floor(Math.random()*ROWS); tries++; }
  while(onGrid(fx,fy)&&tries<200);
  const ft=pickFoodType();
  foods.push({x:fx,y:fy,...ft,bob:Math.random()*Math.PI*2,pulse:0});
}

// ---------------------------------------------------------------- Particles
function spawnPfx(wx,wy,col,n){
  const sx=GX+wx*CELL+CELL/2, sy=GY+wy*CELL+CELL/2;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, spd=2+Math.random()*4;
    particles.push({x:sx,y:sy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,col,r:2+Math.random()*3,life:22+Math.random()*14});
  }
}
function addFloat(wx,wy,txt,col){
  floats.push({x:GX+wx*CELL+CELL/2,y:GY+wy*CELL,txt,col,life:50});
}

// ---------------------------------------------------------------- Update
function update(){
  frame++;

  // Process input queue
  while(inputQueue.length){
    const nd=inputQueue.shift();
    if(nd.x!==-dir.x||nd.y!==-dir.y){ nextDir=nd; break; }
  }

  tick++;
  if(tick<tickInterval) return;
  tick=0;

  dir={...nextDir};
  const head={x:snake[0].x+dir.x, y:snake[0].y+dir.y};

  // Wall wrap (or death — let's do death for challenge)
  if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){
    sfxDie(); spawnPfx(snake[0].x,snake[0].y,'#44ff88',20);
    if(score>best){ best=score; localStorage.setItem('sn_best',String(best)); }
    STATE='GAMEOVER'; return;
  }
  // Self collision
  if(snake.some(s=>s.x===head.x&&s.y===head.y)){
    sfxDie(); spawnPfx(snake[0].x,snake[0].y,'#44ff88',20);
    if(score>best){ best=score; localStorage.setItem('sn_best',String(best)); }
    STATE='GAMEOVER'; return;
  }

  snake.unshift(head);
  let ate=false;

  // Check food
  foods=foods.filter(f=>{
    if(f.x===head.x&&f.y===head.y){
      ate=true;
      const gained=f.pts;
      score=Math.max(0,score+gained);
      if(gained<0){
        spawnPfx(f.x,f.y,'#ff3355',16);
        addFloat(f.x,f.y,gained+'!','#ff3355');
        sfxDie();
        // Shrink snake (remove 3 from tail)
        for(let i=0;i<3&&snake.length>2;i++) snake.pop();
      } else if(f.type==='gold'){
        spawnPfx(f.x,f.y,'#ffd700',20); addFloat(f.x,f.y,'+'+gained,'#ffd700'); sfxGold();
      } else {
        spawnPfx(f.x,f.y,f.col,10); addFloat(f.x,f.y,'+'+gained,f.col); sfxEat();
      }
      if(score>best){ best=score; localStorage.setItem('sn_best',String(best)); }
      // Speed up
      tickInterval=Math.max(4, 9-Math.floor(score/8));
      // Milestone
      const m=Math.floor(score/20)*20;
      if(m>0&&!milestones.has(m)){ milestones.add(m); sfxMile(); addFloat(COLS/2,ROWS/2,''+m+' pts!','#fff'); }
      return false;
    }
    return true;
  });

  if(!ate) snake.pop();

  // Keep 2 foods on board
  if(foods.length<2) spawnFood();

  // Particles & floats
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;return --p.life>0;});
  floats=floats.filter(f=>{f.y-=0.9;return --f.life>0;});
  foods.forEach(f=>{f.bob+=0.07;f.pulse=(f.pulse+0.12)%(Math.PI*2);});
}

// ---------------------------------------------------------------- Draw BG
function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#04040e'); g.addColorStop(1,'#080818');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // Grid lines
  ctx.strokeStyle='rgba(50,180,255,0.07)'; ctx.lineWidth=0.5;
  for(let c=0;c<=COLS;c++){ ctx.beginPath(); ctx.moveTo(GX+c*CELL,GY); ctx.lineTo(GX+c*CELL,GY+ROWS*CELL); ctx.stroke(); }
  for(let r=0;r<=ROWS;r++){ ctx.beginPath(); ctx.moveTo(GX,GY+r*CELL); ctx.lineTo(GX+COLS*CELL,GY+r*CELL); ctx.stroke(); }

  // Grid border glow
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=10;
  ctx.strokeStyle='rgba(50,160,255,0.35)'; ctx.lineWidth=2;
  ctx.strokeRect(GX,GY,COLS*CELL,ROWS*CELL);
  ctx.shadowBlur=0;
}

// ---------------------------------------------------------------- Draw snake
function drawSnake(){
  const len=snake.length;
  snake.forEach((s,i)=>{
    const x=GX+s.x*CELL, y=GY+s.y*CELL;
    const t=i/len;
    // Colour shifts head→tail: cyan → green → teal
    const hue=160+t*40;
    const lum=60-t*20;
    const col=`hsl(${hue},80%,${lum}%)`;

    if(i===0){
      ctx.shadowColor='#33ffaa'; ctx.shadowBlur=18;
    } else {
      ctx.shadowColor=col; ctx.shadowBlur=8*(1-t);
    }
    ctx.fillStyle=col;
    ctx.fillRect(x+2,y+2,CELL-4,CELL-4);
    ctx.shadowBlur=0;

    // Shine on each segment
    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.fillRect(x+3,y+3,CELL-16,4);

    // Eyes on head
    if(i===0){
      ctx.fillStyle='#000';
      const ex1={x:0,y:0}, ex2={x:0,y:0};
      if(dir.x===1){  ex1.x=x+19; ex1.y=y+7;  ex2.x=x+19; ex2.y=y+18; }
      else if(dir.x===-1){ ex1.x=x+7;  ex1.y=y+7;  ex2.x=x+7;  ex2.y=y+18; }
      else if(dir.y===-1){ ex1.x=x+7;  ex1.y=y+7;  ex2.x=x+18; ex2.y=y+7; }
      else {                ex1.x=x+7;  ex1.y=y+18; ex2.x=x+18; ex2.y=y+18; }
      ctx.beginPath(); ctx.arc(ex1.x,ex1.y,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2.x,ex2.y,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#33ffaa';
      ctx.beginPath(); ctx.arc(ex1.x,ex1.y,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2.x,ex2.y,1.5,0,Math.PI*2); ctx.fill();
    }
  });
}

// ---------------------------------------------------------------- Draw food
function drawFood(){
  foods.forEach(f=>{
    const fx=GX+f.x*CELL+CELL/2;
    const fy=GY+f.y*CELL+CELL/2+Math.sin(f.bob)*3;
    const pr=CELL*0.36+Math.sin(f.pulse)*2;

    ctx.shadowColor=f.glow; ctx.shadowBlur=18;
    ctx.fillStyle=f.col;
    ctx.beginPath(); ctx.arc(fx,fy,pr,0,Math.PI*2); ctx.fill();

    // Inner shine
    ctx.fillStyle='rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(fx-pr*0.28,fy-pr*0.28,pr*0.28,0,Math.PI*2); ctx.fill();

    ctx.shadowBlur=0;

    // Bomb has an X
    if(f.type==='bomb'){
      ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(fx-7,fy-7); ctx.lineTo(fx+7,fy+7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx+7,fy-7); ctx.lineTo(fx-7,fy+7); ctx.stroke();
    }
    // Gold has a star dot
    if(f.type==='gold'){
      ctx.fillStyle='rgba(255,255,200,0.5)';
      ctx.beginPath(); ctx.arc(fx,fy,pr*0.4,0,Math.PI*2); ctx.fill();
    }

    // Label below
    ctx.fillStyle=f.col; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.fillText(f.type==='bomb'?'✕':'+'+f.pts, fx, GY+f.y*CELL+CELL+11);
    ctx.textAlign='left';
  });
}

// ---------------------------------------------------------------- Draw FX
function drawFX(){
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(0,p.life/32);
    ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
  floats.forEach(f=>{
    ctx.globalAlpha=Math.min(1,f.life/18);
    ctx.font='bold 12px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col;
    ctx.fillText(f.txt,f.x,f.y);
  });
  ctx.globalAlpha=1; ctx.textAlign='left';
}

// ---------------------------------------------------------------- HUD
function drawHUD(){
  // Background bar
  const g=ctx.createLinearGradient(0,0,0,GY);
  g.addColorStop(0,'#050510'); g.addColorStop(1,'#0a0a1e');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,GY);
  ctx.strokeStyle='rgba(50,180,255,0.25)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(0,GY); ctx.lineTo(W,GY); ctx.stroke();

  // Score
  ctx.textAlign='center';
  ctx.shadowColor='rgba(255,255,255,0.4)'; ctx.shadowBlur=10;
  ctx.fillStyle='#fff'; ctx.font='bold 26px "Press Start 2P",monospace'; ctx.fillText(score,W/2,40);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,52);

  // Length
  ctx.textAlign='left'; ctx.fillStyle='#44ff88';
  ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('LEN '+snake.length,12,26);
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px monospace'; ctx.fillText('length',12,40);

  // Speed
  const spd=Math.floor(10-tickInterval+1);
  ctx.textAlign='left'; ctx.fillStyle=`hsl(${120-spd*12},80%,60%)`;
  ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('SPD '+spd,110,26);

  // Best
  ctx.textAlign='right'; ctx.fillStyle='#ffd700';
  ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-10,24);
  ctx.fillStyle='rgba(255,215,0,0.4)'; ctx.font='7px monospace'; ctx.fillText('high score',W-10,38);

  // Legend
  ctx.textAlign='right'; ctx.font='7px monospace';
  ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillText('WASD / ↑↓←→ to move  |  ESC for menu',W-10,56);
  ctx.textAlign='left';

  // Food legend tiny icons
  ctx.fillStyle='#44ff88'; ctx.font='7px monospace'; ctx.fillText('+1',12,52);
  ctx.fillStyle='#44aaff'; ctx.fillText('+3',38,52);
  ctx.fillStyle='#ffd700'; ctx.fillText('+5★',62,52);
  ctx.fillStyle='#ff3355'; ctx.fillText('✕-3',95,52);
}

// ---------------------------------------------------------------- Round rect
function rr(x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

// ---------------------------------------------------------------- Title screen
let tf=0;
function drawTitle(){
  tf++;
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#04040e'); g.addColorStop(1,'#080818');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

  // Grid ghost
  ctx.strokeStyle='rgba(50,180,255,0.06)'; ctx.lineWidth=0.5;
  for(let c=0;c<=COLS;c++){ ctx.beginPath(); ctx.moveTo(GX+c*CELL,GY); ctx.lineTo(GX+c*CELL,GY+ROWS*CELL); ctx.stroke(); }
  for(let r=0;r<=ROWS;r++){ ctx.beginPath(); ctx.moveTo(GX,GY+r*CELL); ctx.lineTo(GX+COLS*CELL,GY+r*CELL); ctx.stroke(); }

  // Demo snake (animated)
  const demo=[];
  for(let i=0;i<12;i++){
    const a=(tf*0.025-i*0.25);
    demo.push({x:Math.floor(15+Math.sin(a)*7), y:Math.floor(9+Math.cos(a*0.7)*4)});
  }
  demo.forEach((s,i)=>{
    const x=GX+s.x*CELL, y=GY+s.y*CELL;
    const col=`hsl(${160+i*3},80%,${55-i*2}%)`;
    ctx.shadowColor=col; ctx.shadowBlur=i===0?18:6;
    ctx.fillStyle=col; ctx.fillRect(x+2,y+2,CELL-4,CELL-4);
    ctx.shadowBlur=0;
  });

  // Demo food items
  [[8,5,'#44ff88'],[22,14,'#ffd700'],[25,5,'#44aaff']].forEach(([fx,fy,col])=>{
    const px=GX+fx*CELL+CELL/2, py=GY+fy*CELL+CELL/2+Math.sin(tf*0.07+fx)*3;
    ctx.shadowColor=col; ctx.shadowBlur=14;
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(px,py,10,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  });

  // Overlay for readability
  ctx.fillStyle='rgba(4,4,14,0.55)'; ctx.fillRect(0,0,W,H);

  // Title
  ctx.textAlign='center';
  ctx.shadowColor='#44ff88'; ctx.shadowBlur=30;
  ctx.fillStyle='#44ff88'; ctx.font='bold 62px "Press Start 2P",monospace'; ctx.fillText('SNAKE',W/2,185);
  ctx.shadowColor='#33aaff'; ctx.shadowBlur=30;
  ctx.fillStyle='#33aaff'; ctx.font='bold 62px "Press Start 2P",monospace'; ctx.fillText('NEON',W/2,258);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='8px "Press Start 2P",monospace';
  ctx.fillText('EAT. GROW. SURVIVE.',W/2,290);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,316); }

  // Food legend
  const items=[['#44ff88','+1 normal'],['#44aaff','+3 blue'],['#ffd700','+5 gold'],['#ff3355','-3 bomb!']];
  items.forEach(([col,lbl],i)=>{
    const lx=W/2-205+i*138, ly=340;
    ctx.fillStyle=col+'22'; ctx.beginPath(); ctx.arc(lx,ly,18,0,Math.PI*2); ctx.fill();
    ctx.shadowColor=col; ctx.shadowBlur=10;
    ctx.strokeStyle=col; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(lx,ly,18,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.fillStyle=col; ctx.font='7px monospace'; ctx.fillText(lbl,lx,ly+30);
  });

  // Play button
  const ph=hover(W/2-115,370,230,54);
  ctx.fillStyle=ph?'#55ff99':'#44ff88'; rr(W/2-115,370,230,54,12); ctx.fill();
  ctx.shadowColor='#44ff88'; ctx.shadowBlur=ph?22:8; rr(W/2-115,370,230,54,12); ctx.stroke(); ctx.shadowBlur=0;
  ctx.fillStyle='#041408'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,405);
  ctx.fillStyle='rgba(0,30,10,0.8)'; ctx.font='8px monospace'; ctx.fillText('[CLICK, ENTER or WASD]',W/2,422);
  ctx.textAlign='left';
  canvas.style.cursor=ph?'pointer':'default';

  if(clickFrame&&hover(W/2-115,370,230,54)){ startGame(); STATE='GAME'; }
  if(inputQueue.length>0){ startGame(); STATE='GAME'; }
}

// ---------------------------------------------------------------- Game Over
function drawGameOver(){
  drawBg(); drawSnake(); drawFood(); drawFX();
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff3355'; ctx.shadowBlur=22;
  ctx.fillStyle='#ff3355'; ctx.font='bold 38px "Press Start 2P",monospace'; ctx.fillText('GAME OVER',W/2,185);
  ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12;
  ctx.fillStyle='#fff'; ctx.font='bold 52px "Press Start 2P",monospace'; ctx.fillText(score,W/2,258);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,276);
  ctx.fillStyle='#44ff88'; ctx.font='9px monospace'; ctx.fillText('length: '+snake.length,W/2,302);
  if(score>=best&&score>0){
    ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,330);
  } else {
    ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,330);
  }
  const ph=hover(W/2-130,352,260,52);
  ctx.fillStyle=ph?'#55ff99':'#44ff88'; rr(W/2-130,352,260,52,12); ctx.fill();
  ctx.fillStyle='#041408'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,385);
  const mh=hover(W/2-100,420,200,44);
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; rr(W/2-100,420,200,44,10); ctx.fill();
  ctx.strokeStyle='#3a3a55'; ctx.lineWidth=1.5; rr(W/2-100,420,200,44,10); ctx.stroke();
  ctx.fillStyle='#aaa'; ctx.font='bold 9px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,448);
  ctx.textAlign='left';
  canvas.style.cursor=(ph||mh)?'pointer':'default';
  if(clickFrame&&hover(W/2-130,352,260,52)){ startGame(); STATE='GAME'; }
  if(clickFrame&&hover(W/2-100,420,200,44)){ STATE='TITLE'; }
}

// ---------------------------------------------------------------- Main loop
function loop(){
  const click=clickFrame; clickFrame=false;

  ctx.clearRect(0,0,W,H);

  if(STATE==='TITLE'){
    clickFrame=click; drawTitle(); clickFrame=false;
  } else if(STATE==='GAME'){
    drawBg(); drawFood(); drawFX(); drawSnake(); drawHUD();
    if(keys['Escape']) STATE='TITLE';
    update();
  } else if(STATE==='GAMEOVER'){
    clickFrame=click; drawGameOver(); clickFrame=false;
  }

  requestAnimationFrame(loop);
}

// ESC key
const keys={};
window.addEventListener('keydown',e=>{ keys[e.code]=true; if(e.code==='Escape'&&STATE==='GAME') STATE='TITLE'; });
window.addEventListener('keyup',e=>{ keys[e.code]=false; });

requestAnimationFrame(loop);
