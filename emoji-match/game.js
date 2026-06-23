'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=520,H=620;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

let clickFrame=false,mX=W/2,mY=H/2;
function getPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(W/r.width),y:(e.clientY-r.top)*(H/r.height)};}
canvas.addEventListener('click',e=>{const p=getPos(e);mX=p.x;mY=p.y;clickFrame=true;});
canvas.addEventListener('touchend',e=>{e.preventDefault();const p=getPos(e.changedTouches[0]);mX=p.x;mY=p.y;clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='triangle',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxFlip(){tone(440,0.06,'sine',0.07);}
function sfxMatch(){tone(523,0.07,'triangle',0.09);tone(659,0.07,'triangle',0.08,0.08);tone(784,0.08,'triangle',0.1,0.16);}
function sfxWrong(){tone(220,0.12,'sawtooth',0.07);}
function sfxWin(){[523,659,784,1047].forEach((f,i)=>tone(f,0.1,'triangle',0.1,i*0.1));}

const EMOJIS=['🐱','🐶','🐸','🦊','🐼','🐨','🐯','🦁','🐙','🦋','🌟','🍕','🎮','🚀','🌈','🎸'];
const COLS=4,ROWS=4,CARDS=COLS*ROWS,CW=96,CH=96,GRID_X=(W-COLS*CW)/2,GRID_Y=110,GAP=6;

let STATE='TITLE',cards,flipped,matchedPairs,flips,timeLeft,frame,bestScore=+(localStorage.getItem('em_best')||0),tf=0;
let lockT=0;

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function startGame(){
  const pool=shuffle([...EMOJIS]).slice(0,CARDS/2);
  const deck=shuffle([...pool,...pool]);
  cards=deck.map((e,i)=>({emoji:e,i,face:false,matched:false,flip:0,matchAnim:0}));
  flipped=[];matchedPairs=0;flips=0;timeLeft=60;frame=0;lockT=0;
}

function cardAt(cx,cy){
  const c=Math.floor((cx-GRID_X)/(CW+GAP)),r=Math.floor((cy-GRID_Y)/(CH+GAP));
  if(c<0||c>=COLS||r<0||r>=ROWS)return null;
  return cards[r*COLS+c];
}

function update(){
  frame++;
  timeLeft=Math.max(0,timeLeft-1/60);
  if(lockT>0){lockT--;return;}
  if(timeLeft<=0&&matchedPairs<CARDS/2){endGame();}

  if(clickFrame){
    const card=cardAt(mX,mY);
    if(card&&!card.face&&!card.matched&&flipped.length<2){
      card.face=true;card.flip=0;sfxFlip();
      flipped.push(card);
      if(flipped.length===2){
        flips++;
        if(flipped[0].emoji===flipped[1].emoji){
          flipped.forEach(c=>{c.matched=true;c.matchAnim=1;});
          sfxMatch();matchedPairs++;flipped=[];
          if(matchedPairs===CARDS/2){setTimeout(()=>{const sc=Math.max(0,Math.floor(timeLeft*10)-flips*2);if(sc>bestScore){bestScore=sc;localStorage.setItem('em_best',String(bestScore));}STATE='GAMEOVER';},600);sfxWin();}
        } else {
          sfxWrong();lockT=50;
          setTimeout(()=>{flipped.forEach(c=>c.face=false);flipped=[];},800);
        }
      }
    }
  }
  cards.forEach(c=>{if(c.face&&c.flip<1)c.flip=Math.min(1,c.flip+0.12);if(!c.face&&c.flip>0)c.flip=Math.max(0,c.flip-0.12);if(c.matchAnim>0)c.matchAnim=Math.max(0,c.matchAnim-0.04);});
}

function endGame(){const sc=Math.max(0,Math.floor(timeLeft*10)-flips*2);if(sc>bestScore){bestScore=sc;localStorage.setItem('em_best',String(bestScore));}STATE='GAMEOVER';}

function drawCard(card){
  const col=card.i%COLS,row=Math.floor(card.i/COLS);
  const x=GRID_X+col*(CW+GAP),y=GRID_Y+row*(CH+GAP);
  const f=card.flip,glow=card.matchAnim;
  ctx.save();ctx.translate(x+CW/2,y+CH/2);
  const scaleX=Math.abs(Math.cos(f*Math.PI));
  ctx.scale(scaleX,1);
  if(f<0.5){
    // Back
    ctx.fillStyle='#2244aa';ctx.shadowColor='#4466cc';ctx.shadowBlur=6;
    ctx.beginPath();ctx.roundRect(-CW/2,-CH/2,CW,CH,10);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.1)';ctx.beginPath();ctx.roundRect(-CW/2+4,-CH/2+4,CW-8,CH/2-8,6);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)';ctx.font='28px serif';ctx.textAlign='center';ctx.fillText('?',0,10);
  } else {
    // Front
    const mc=card.matched;const bc=mc?`hsl(${120+glow*40},70%,${40+glow*20}%)`:'#1a3060';
    ctx.fillStyle=bc;ctx.shadowColor=mc?'#44ff88':'rgba(0,0,0,0.3)';ctx.shadowBlur=mc?14+glow*10:4;
    ctx.beginPath();ctx.roundRect(-CW/2,-CH/2,CW,CH,10);ctx.fill();
    ctx.font='42px serif';ctx.textAlign='center';ctx.fillText(card.emoji,0,14);
  }
  ctx.shadowBlur=0;ctx.restore();
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#100025');g.addColorStop(1,'#200040');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,90);
  ctx.textAlign='center';ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.fillText(Math.ceil(timeLeft)+'s',W/2,36);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('TIME',W/2,48);
  // Timer bar
  const tFrac=timeLeft/60;ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(20,58,W-40,12);
  const tc=tFrac>0.4?'#44ff88':tFrac>0.2?'#ffd700':'#ff4444';ctx.fillStyle=tc;ctx.fillRect(20,58,(W-40)*tFrac,12);
  ctx.textAlign='left';ctx.fillStyle='#44aaff';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('PAIRS: '+matchedPairs+'/'+(CARDS/2),14,82);
  ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillText('FLIPS: '+flips,W-14,82);
  ctx.textAlign='left';
}

function drawTitle(){
  tf++;drawBg();
  ['🐱','🐶','🐸','🦊','🐼','🐨'].forEach((e,i)=>{const oy=Math.sin(tf*0.04+i)*12;ctx.font='44px serif';ctx.textAlign='center';ctx.fillText(e,60+i*80,H/2-30+oy);});
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffd700';ctx.shadowColor='#ffaa00';ctx.shadowBlur=22;ctx.font='bold 30px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('EMOJI MATCH',W/2,H/2-60);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('FLIP CARDS — FIND ALL PAIRS IN 60s!',W/2,H/2-26);
  if(bestScore>0){ctx.fillStyle='#ffd700';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+bestScore,W/2,H/2+4);}
  const ph=mX>W/2-100&&mX<W/2+100&&mY>H/2+40&&mY<H/2+94;
  ctx.fillStyle=ph?'#ffe033':'#ffd700';ctx.beginPath();ctx.roundRect(W/2-100,H/2+40,200,54,10);ctx.fill();
  ctx.fillStyle='#030318';ctx.font='bold 14px "Press Start 2P",monospace';ctx.fillText('PLAY',W/2,H/2+74);
  if(clickFrame&&ph){startGame();STATE='GAME';}
}

function drawGameOver(){
  drawBg();ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
  const allMatch=matchedPairs===CARDS/2;
  const sc=Math.max(0,Math.floor(timeLeft*10)-flips*2);
  ctx.fillStyle=allMatch?'#44ff88':'#ffd700';ctx.shadowColor=allMatch?'#44ff88':'#ffd700';ctx.shadowBlur=18;
  ctx.font='bold 22px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(allMatch?'ALL MATCHED!':'TIME\'S UP!',W/2,H/2-100);ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.font='bold 44px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2-30);
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('SCORE (time bonus - flip penalty)',W/2,H/2-6);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('PAIRS: '+matchedPairs+'/'+CARDS/2+'  FLIPS: '+flips,W/2,H/2+18);
  if(sc>=bestScore&&sc>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+44);}
  else if(bestScore>0){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+bestScore,W/2,H/2+44);}
  const ph=mX>W/2-110&&mX<W/2+110&&mY>H/2+76&&mY<H/2+130;
  ctx.fillStyle=ph?'#ffe033':'#ffd700';ctx.beginPath();ctx.roundRect(W/2-110,H/2+76,220,54,10);ctx.fill();
  ctx.fillStyle='#030318';ctx.font='bold 12px "Press Start 2P",monospace';ctx.fillText('PLAY AGAIN',W/2,H/2+110);
  if(clickFrame&&ph){startGame();STATE='GAME';}
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){clickFrame=click;drawTitle();clickFrame=false;}
  else if(STATE==='GAME'){drawBg();cards.forEach(drawCard);drawHUD();clickFrame=click;update();clickFrame=false;}
  else if(STATE==='GAMEOVER'){clickFrame=click;drawGameOver();clickFrame=false;}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
