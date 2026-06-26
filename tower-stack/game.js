'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=360,H=600;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

let clickFrame=false;
window.addEventListener('keydown',e=>{if(e.key===' ')e.preventDefault();});
window.addEventListener('keyup',e=>{if(e.code==='Space')clickFrame=true;});
canvas.addEventListener('click',()=>clickFrame=true);
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxPlace(){tone(440,0.06,'sine',0.07);}
function sfxPerfect(){tone(660,0.05,'sine',0.07);tone(880,0.08,'sine',0.07);}
function sfxFail(){tone(200,0.15,'sawtooth',0.08);}

const BLOCK_H=24,BASE_W=200,COLORS=['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bce','#ff922b','#63e6be'];
let STATE='TITLE',blocks,mover,score,best=+(localStorage.getItem('ts_best')||0),frame,tf=0;

function startGame(){
  blocks=[{x:W/2-BASE_W/2,w:BASE_W,y:H-BLOCK_H,col:COLORS[0]}];
  mover={x:0,w:BASE_W*0.9,dir:1,spd:3};
  score=0;frame=0;STATE='GAME';
}

function dropBlock(){
  const top=blocks[blocks.length-1];
  const mx=mover.x,mw=mover.w;
  const bx=top.x,bw=top.w;
  const ox=Math.max(mx,bx),ox2=Math.min(mx+mw,bx+bw);
  const overlap=ox2-ox;
  if(overlap<=2){sfxFail();STATE='GAMEOVER';return;}
  const perfect=Math.abs(overlap-bw)<4&&Math.abs(overlap-mw)<4;
  if(perfect){sfxPerfect();}else sfxPlace();
  const newW=perfect?bw:overlap;
  const newX=ox;
  blocks.push({x:newX,w:newW,y:top.y-BLOCK_H,col:COLORS[score%COLORS.length]});
  score++;
  if(score>best){best=score;localStorage.setItem('ts_best',String(best));}
  const spd=Math.min(6,3+score*0.15);
  mover={x:0,w:Math.max(30,newW*0.95),dir:1,spd};
}

function update(){
  frame++;
  mover.x+=mover.dir*mover.spd;
  if(mover.x+mover.w>W){mover.x=W-mover.w;mover.dir=-1;}
  if(mover.x<0){mover.x=0;mover.dir=1;}
  // Scroll down when tower gets tall
  if(blocks.length>10){const shift=4;blocks.forEach(b=>b.y+=shift);}
}

function drawBlock(b,alpha){
  ctx.globalAlpha=alpha||1;
  ctx.fillStyle=b.col;ctx.fillRect(b.x,b.y,b.w,BLOCK_H);
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.fillRect(b.x,b.y,b.w,6);
  ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(b.x,b.y+BLOCK_H-5,b.w,5);
  ctx.globalAlpha=1;
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1a1a2e');bg.addColorStop(1,'#16213e');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W/2-155,H/2-110,310,230);
    ctx.fillStyle='#ff6b6b';ctx.font='bold 18px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('TOWER STACK',W/2,H/2-62);
    ctx.fillStyle='#333';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK TO DROP EACH BLOCK',W/2,H/2-30);
    ctx.fillText('STACK THEM PERFECTLY!',W/2,H/2-10);ctx.fillText('MISS = BLOCK GETS SMALLER',W/2,H/2+10);
    if(best>0){ctx.fillStyle='#ff6b6b';ctx.fillText('BEST: '+best,W/2,H/2+38);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('CLICK / SPACE to start',W/2,H/2+70);
    if(click)startGame();
  } else if(STATE==='GAME'){
    blocks.forEach(b=>drawBlock(b));
    // Moving block
    ctx.fillStyle=COLORS[(score+1)%COLORS.length];
    ctx.fillRect(mover.x,blocks[blocks.length-1].y-BLOCK_H,mover.w,BLOCK_H);
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(mover.x,blocks[blocks.length-1].y-BLOCK_H,mover.w,6);
    // Shadow
    ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fillRect(mover.x,0,mover.w,blocks[blocks.length-1].y-BLOCK_H);
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('HEIGHT: '+score,W/2,22);
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    if(click)dropBlock();
    update();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff6b6b';ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('TOWER FELL!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click)startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
