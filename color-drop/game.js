'use strict';
// ================================================================
// COLOR DROP — Drop colored balls, match 4 in a row to score!
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = 480, H = 660;
canvas.width = W; canvas.height = H;

function resize(){
  const s = Math.min(window.innerWidth/W, window.innerHeight/H);
  canvas.style.width = Math.floor(W*s)+'px'; canvas.style.height = Math.floor(H*s)+'px';
}
window.addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- Input
let mX=W/2, mY=H/2, clickFrame=false;
function getPos(e){ const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)}; }
canvas.addEventListener('mousemove',e=>{ const p=getPos(e); mX=p.x; mY=p.y; });
canvas.addEventListener('click',e=>{ const p=getPos(e); mX=p.x; mY=p.y; clickFrame=true; });
canvas.addEventListener('touchend',e=>{ e.preventDefault(); const p=getPos(e.changedTouches[0]); mX=p.x; mY=p.y; clickFrame=true; },{passive:false});

// ---------------------------------------------------------------- Audio
let AC=null;
function getAC(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); return AC; }
function tone(f,d,type='sine',vol=0.07,delay=0){
  try{ const a=getAC(),o=a.createOscillator(),g=a.createGain(); o.connect(g); g.connect(a.destination); o.type=type; o.frequency.value=f; const t=a.currentTime+delay; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+d); o.start(t); o.stop(t+d+0.02); }catch(e){}
}
function sfxDrop(){ tone(440,0.05,'sine',0.07); }
function sfxMatch(n){ const notes=[440,523,587,659,784]; notes.slice(0,Math.min(n,5)).forEach((f,i)=>tone(f,0.08,'triangle',0.1,i*0.06)); }
function sfxGameOver(){ tone(220,0.2,'sawtooth',0.12); tone(110,0.4,'sawtooth',0.15,0.15); }

// ---------------------------------------------------------------- Grid
const COLS=7, ROWS=10, CELL=50;
const GRID_X=(W-COLS*CELL)/2, GRID_Y=H-ROWS*CELL-40;
const COLORS=['#ff4455','#4488ff','#44cc66','#ffd700','#cc44ff','#ff8833'];
const MATCH_N=4; // match 4

// ---------------------------------------------------------------- State
let STATE='TITLE';
let grid, current, next, particles, floats;
let score, best=+(localStorage.getItem('cd_best')||0), frame, dropAnim, tf=0;
let shakeT=0, hoverCol=-1;

function mkGrid(){ return Array.from({length:ROWS},()=>Array(COLS).fill(null)); }

function randomColor(){ return COLORS[Math.floor(Math.random()*COLORS.length)]; }

function startGame(){
  grid=mkGrid(); current=randomColor(); next=randomColor();
  particles=[]; floats=[]; score=0; frame=0; dropAnim=null; shakeT=0;
}

function colX(c){ return GRID_X+c*CELL+CELL/2; }
function rowY(r){ return GRID_Y+r*CELL+CELL/2; }

function dropBall(col){
  // Find lowest empty row in column
  let row=-1;
  for(let r=ROWS-1;r>=0;r--){ if(!grid[r][col]){ row=r; break; } }
  if(row===-1) return false; // column full
  sfxDrop();
  dropAnim={col,row,y:GRID_Y-CELL,targetY:rowY(row),col2:col,color:current};
  return true;
}

function placeAndCheck(col,row,color){
  grid[row][col]=color;
  const matches=findMatches();
  if(matches.length>0){
    sfxMatch(matches.length);
    const pts=matches.length*10*(matches.length>=6?2:1);
    score+=pts; if(score>best){best=score;localStorage.setItem('cd_best',String(best));}
    const cx=colX(col),cy=rowY(row);
    addFloat(cx,cy-10,'+'+pts,'#ffd700');
    // Remove matched cells
    matches.forEach(([mr,mc])=>{ spawnPfx(colX(mc),rowY(mr),grid[mr][mc],8); grid[mr][mc]=null; });
    shakeT=Math.min(8,matches.length/2);
    // Gravity — collapse columns
    for(let c=0;c<COLS;c++){
      let write=ROWS-1;
      for(let r=ROWS-1;r>=0;r--){ if(grid[r][c]!==null){ grid[write][c]=grid[r][c]; if(write!==r) grid[r][c]=null; write--; } }
    }
  }
  // Advance next
  current=next; next=randomColor();
  // Check if any column is full (game over)
  for(let c=0;c<COLS;c++){ if(grid[0][c]!==null){ sfxGameOver(); STATE='GAMEOVER'; return; } }
}

// ---------------------------------------------------------------- Match finder (horizontal, vertical, diagonal)
function findMatches(){
  const matched=new Set();
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  dirs.forEach(([dr,dc])=>{
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      const col=grid[r][c]; if(!col) continue;
      const cells=[[r,c]];
      for(let k=1;k<MATCH_N;k++){ const nr=r+dr*k,nc=c+dc*k; if(nr<0||nr>=ROWS||nc<0||nc>=COLS||grid[nr][nc]!==col) break; cells.push([nr,nc]); }
      if(cells.length>=MATCH_N) cells.forEach(cell=>matched.add(cell[0]+','+cell[1]));
    }
  });
  return [...matched].map(s=>s.split(',').map(Number));
}

function spawnPfx(x,y,col,n){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2,s=3+Math.random()*6; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,col,r:2+Math.random()*4,life:18+Math.random()*14}); }
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:50}); }

// ---------------------------------------------------------------- Update
function update(){
  frame++;
  if(shakeT>0) shakeT--;

  // Hover column
  hoverCol=-1;
  if(mX>=GRID_X&&mX<GRID_X+COLS*CELL) hoverCol=Math.floor((mX-GRID_X)/CELL);

  // Drop animation
  if(dropAnim){
    dropAnim.y+=18;
    if(dropAnim.y>=dropAnim.targetY){ dropAnim.y=dropAnim.targetY; placeAndCheck(dropAnim.col,dropAnim.row,dropAnim.color); dropAnim=null; }
    return;
  }

  if(clickFrame&&hoverCol>=0) dropBall(hoverCol);

  particles=particles.filter(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; return --p.life>0; });
  floats=floats.filter(f=>{ f.y-=0.8; return --f.life>0; });
}

// ---------------------------------------------------------------- Draw
function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#080820'); g.addColorStop(1,'#12123a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}

function drawGrid(){
  // Background grid cells
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const x=GRID_X+c*CELL,y=GRID_Y+r*CELL;
    const hover=hoverCol===c;
    ctx.fillStyle=hover?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)';
    ctx.strokeStyle=hover?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.06)';
    ctx.lineWidth=1;
    ctx.fillRect(x,y,CELL,CELL); ctx.strokeRect(x,y,CELL,CELL);
  }
  // Balls
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const col=grid[r][c]; if(!col) continue;
    drawBall(colX(c),rowY(r),col,CELL*0.42);
  }
  // Drop animation ball
  if(dropAnim) drawBall(colX(dropAnim.col),dropAnim.y,dropAnim.color,CELL*0.42);
  // Column hover indicator arrow
  if(hoverCol>=0&&!dropAnim){
    const ax=colX(hoverCol);
    ctx.fillStyle=current; ctx.shadowColor=current; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.moveTo(ax,GRID_Y-12); ctx.lineTo(ax-8,GRID_Y-24); ctx.lineTo(ax+8,GRID_Y-24); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
  }
}

function drawBall(x,y,col,r){
  ctx.shadowColor=col; ctx.shadowBlur=12;
  const g=ctx.createRadialGradient(x-r*0.35,y-r*0.35,r*0.1,x,y,r);
  g.addColorStop(0,'rgba(255,255,255,0.85)'); g.addColorStop(0.35,col); g.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
}

function drawNext(){
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.roundRect(8,8,120,88,8); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(8,8,120,88,8); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='left'; ctx.fillText('CURRENT',14,24);
  drawBall(50,52,current,18);
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='6px "Press Start 2P",monospace'; ctx.fillText('NEXT',80,24);
  drawBall(108,52,next,14);
}

function drawFX(){
  particles.forEach(p=>{ ctx.globalAlpha=Math.max(0,p.life/24); ctx.fillStyle=p.col; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  floats.forEach(f=>{ ctx.globalAlpha=Math.min(1,f.life/16); ctx.font='bold 10px "Press Start 2P",monospace'; ctx.textAlign='center'; ctx.fillStyle=f.col; ctx.fillText(f.txt,f.x,f.y); });
  ctx.globalAlpha=1;
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(0,H-36,W,36);
  ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,H-36); ctx.lineTo(W,H-36); ctx.stroke();
  ctx.textAlign='center'; ctx.shadowColor='rgba(255,255,255,0.3)'; ctx.shadowBlur=8;
  ctx.fillStyle='#fff'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText(score,W/2,H-14); ctx.shadowBlur=0;
  ctx.textAlign='right'; ctx.fillStyle='#ffd700'; ctx.font='bold 7px "Press Start 2P",monospace'; ctx.fillText('BEST '+best,W-8,H-14);
  ctx.textAlign='left'; ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('MATCH '+MATCH_N+'!',10,H-14);
  ctx.textAlign='left';
}

// ---------------------------------------------------------------- Screens
function drawTitle(){
  tf++;
  drawBg();
  // Sample grid preview (small)
  const previewCols=['#ff4455','#4488ff','#44cc66','#ffd700','#cc44ff','#ff8833','#ff4455'];
  for(let c=0;c<COLS;c++) for(let r=0;r<3;r++){
    const px=GRID_X+c*CELL+CELL/2, py=290+r*50;
    const col=previewCols[(c+r)%COLORS.length];
    drawBall(px,py,col,CELL*0.38);
  }
  ctx.textAlign='center';
  ctx.shadowColor='#44cc66'; ctx.shadowBlur=26; ctx.fillStyle='#44cc66'; ctx.font='bold 40px "Press Start 2P",monospace'; ctx.fillText('COLOR',W/2,175); ctx.shadowBlur=0;
  ctx.shadowColor='#ffd700'; ctx.shadowBlur=22; ctx.fillStyle='#ffd700'; ctx.font='bold 40px "Press Start 2P",monospace'; ctx.fillText('DROP',W/2,232); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='7px "Press Start 2P",monospace'; ctx.fillText('DROP BALLS · MATCH '+MATCH_N+' IN A ROW TO SCORE!',W/2,260);
  if(best>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,450); }
  const ph=mX>W/2-100&&mX<W/2+100&&mY>474&&mY<528;
  ctx.fillStyle=ph?'#66ee55':'#44cc33'; ctx.beginPath(); ctx.roundRect(W/2-100,474,200,54,10); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 14px "Press Start 2P",monospace'; ctx.fillText('PLAY',W/2,510);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
}

function drawGameOver(){
  drawBg();
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.shadowColor='#ff4455'; ctx.shadowBlur=20; ctx.fillStyle='#ff4455'; ctx.font='bold 26px "Press Start 2P",monospace'; ctx.fillText('COLUMN FULL!',W/2,178); ctx.shadowBlur=0;
  ctx.shadowColor='#fff'; ctx.shadowBlur=12; ctx.fillStyle='#fff'; ctx.font='bold 44px "Press Start 2P",monospace'; ctx.fillText(score,W/2,254); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='8px "Press Start 2P",monospace'; ctx.fillText('SCORE',W/2,270);
  if(score>=best&&score>0){ ctx.fillStyle='#ffd700'; ctx.font='bold 10px "Press Start 2P",monospace'; ctx.fillText('✦ NEW BEST! ✦',W/2,298); }
  else{ ctx.fillStyle='rgba(255,215,0,0.7)'; ctx.font='9px "Press Start 2P",monospace'; ctx.fillText('BEST: '+best,W/2,298); }
  const ph=mX>W/2-110&&mX<W/2+110&&mY>326&&mY<380;
  ctx.fillStyle=ph?'#66ee55':'#44cc33'; ctx.beginPath(); ctx.roundRect(W/2-110,326,220,54,10); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.fillText('PLAY AGAIN',W/2,360);
  const mh=mX>W/2-90&&mX<W/2+90&&mY>394&&mY<436;
  ctx.fillStyle=mh?'#2a2a45':'#1c1c38'; ctx.beginPath(); ctx.roundRect(W/2-90,394,180,42,8); ctx.fill();
  ctx.fillStyle='#aaa'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.fillText('MENU',W/2,420);
  ctx.textAlign='left';
  if(clickFrame&&ph){ startGame(); STATE='GAME'; }
  if(clickFrame&&mh) STATE='TITLE';
}

function loop(){
  const click=clickFrame; clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){ clickFrame=click; drawTitle(); clickFrame=false; }
  else if(STATE==='GAME'){
    const doShake=shakeT>0;
    if(doShake){ ctx.save(); const s=shakeT; ctx.translate(Math.random()*s-s/2,Math.random()*s-s/2); }
    drawBg(); drawGrid(); drawNext(); drawFX(); drawHUD();
    if(doShake) ctx.restore();
    clickFrame=click; update(); clickFrame=false;
  }
  else if(STATE==='GAMEOVER'){ clickFrame=click; drawGameOver(); clickFrame=false; }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
