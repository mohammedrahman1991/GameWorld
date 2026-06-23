'use strict';
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(typeof r==='object'?r[0]:r,w/2,h/2);this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath();};}
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=700,H=500;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};
let clickFrame=false,mY=H/2;
window.addEventListener('keydown',e=>{keys[e.code]=true;if([' ','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mY=(e.clientY-r.top)*(H/r.height);});
canvas.addEventListener('click',e=>{clickFrame=true;});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='square',vol=0.08,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxHit(side){tone(side?400:300,0.04,'square',0.07);}
function sfxWall(){tone(220,0.04,'sine',0.05);}
function sfxScore(){tone(660,0.08,'triangle',0.1);tone(880,0.06,'triangle',0.08,0.08);}

const PH=88,PW=14,BALL_R=10,PAD_SPD=5;
let STATE='TITLE',ball,padL,padR,scoreL,scoreR,frame,aiSpeed,tf=0;

function startGame(){
  ball={x:W/2,y:H/2,vx:(Math.random()<0.5?1:-1)*5.5,vy:(Math.random()*6-3)};
  padL=H/2-PH/2;padR=H/2-PH/2;scoreL=0;scoreR=0;frame=0;aiSpeed=3.8;
}

function update(){
  frame++;
  aiSpeed=Math.min(6.5,3.8+frame/1200);

  // Player paddle (left) — keyboard or mouse
  if(keys['ArrowUp']||keys['KeyW'])padL=Math.max(0,padL-PAD_SPD);
  if(keys['ArrowDown']||keys['KeyS'])padL=Math.min(H-PH,padL+PAD_SPD);
  padL+=(mY-PH/2-padL)*0.18;
  padL=Math.max(0,Math.min(H-PH,padL));

  // AI paddle (right)
  const target=ball.y-PH/2;
  padR+=(target-padR)*0.045*aiSpeed;
  padR=Math.max(0,Math.min(H-PH,padR));

  // Ball movement
  ball.x+=ball.vx;ball.y+=ball.vy;

  // Wall bounce
  if(ball.y<BALL_R){ball.y=BALL_R;ball.vy=Math.abs(ball.vy);sfxWall();}
  if(ball.y>H-BALL_R){ball.y=H-BALL_R;ball.vy=-Math.abs(ball.vy);sfxWall();}

  // Paddle collisions
  // Left paddle
  if(ball.x-BALL_R<PW+16&&ball.y>padL&&ball.y<padL+PH&&ball.vx<0){
    ball.vx=Math.abs(ball.vx)*1.05;
    ball.vy=((ball.y-(padL+PH/2))/(PH/2))*7;
    sfxHit(false);
  }
  // Right paddle
  if(ball.x+BALL_R>W-PW-16&&ball.y>padR&&ball.y<padR+PH&&ball.vx>0){
    ball.vx=-Math.abs(ball.vx)*1.05;
    ball.vy=((ball.y-(padR+PH/2))/(PH/2))*7;
    sfxHit(true);
  }
  // Cap speed
  const sp=Math.hypot(ball.vx,ball.vy);if(sp>14){ball.vx=ball.vx/sp*14;ball.vy=ball.vy/sp*14;}

  // Score
  if(ball.x<0){scoreR++;sfxScore();resetBall(-1);}
  if(ball.x>W){scoreL++;sfxScore();resetBall(1);}
  if(scoreL>=7||scoreR>=7)STATE='GAMEOVER';
}

function resetBall(dir){
  ball={x:W/2,y:H/2,vx:dir*5.5,vy:(Math.random()*6-3)};
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#060618');g.addColorStop(1,'#0c1030');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.setLineDash([12,12]);ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(W/2,H/2,80,0,Math.PI*2);ctx.stroke();
}

function drawPaddle(x,y,col){
  ctx.shadowColor=col;ctx.shadowBlur=16;
  const g=ctx.createLinearGradient(x,y,x+PW,y);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0.5)');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,PW,PH,6);ctx.fill();ctx.shadowBlur=0;
}

function drawBall(){
  const trail=[{x:ball.x-ball.vx*0.5,y:ball.y-ball.vy*0.5},{x:ball.x-ball.vx,y:ball.y-ball.vy}];
  trail.forEach((t,i)=>{ctx.globalAlpha=0.25*(i+1)*0.5;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(t.x,t.y,BALL_R*(0.6+i*0.2),0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;
  ctx.shadowColor='#fff';ctx.shadowBlur=18;
  const g=ctx.createRadialGradient(ball.x-3,ball.y-3,1,ball.x,ball.y,BALL_R);g.addColorStop(0,'#fff');g.addColorStop(1,'rgba(150,150,255,0.6)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(0,0,W,50);
  ctx.fillStyle='#44aaff';ctx.font='bold 28px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(scoreL,W/2-80,36);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='12px "Press Start 2P",monospace';ctx.fillText(':',W/2,36);
  ctx.fillStyle='#ff4466';ctx.fillText(scoreR,W/2+80,36);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('YOU',W/2-80,46);ctx.fillText('AI',W/2+80,46);
}

function drawOverlay(title,sub){
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
  const won=scoreL>scoreR;
  ctx.fillStyle=won?'#44ff88':'#ff4466';ctx.shadowColor=won?'#44ff88':'#ff4466';ctx.shadowBlur=22;
  ctx.font='bold 32px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-60);ctx.shadowBlur=0;
  ctx.fillStyle='#44aaff';ctx.font='bold 44px "Press Start 2P",monospace';ctx.fillText(scoreL,W/2-60,H/2+10);
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='20px "Press Start 2P",monospace';ctx.fillText(':',W/2,H/2+10);
  ctx.fillStyle='#ff4466';ctx.font='bold 44px "Press Start 2P",monospace';ctx.fillText(scoreR,W/2+60,H/2+10);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText(sub,W/2,H/2+66);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){
    drawBg();
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#44aaff';ctx.shadowColor='#44aaff';ctx.shadowBlur=24;ctx.font='bold 40px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('PING PONG',W/2,H/2-60);ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('YOU (LEFT) vs AI (RIGHT) — FIRST TO 7 WINS!',W/2,H/2-18);
    ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('↑↓ ARROWS or MOUSE to move — CLICK to start',W/2,H/2+10);
    const ph=click;if(ph||keys['Space']||keys['Enter']){startGame();STATE='GAME';}
  } else if(STATE==='GAME'){
    drawBg();drawPaddle(16,padL,'#44aaff');drawPaddle(W-16-PW,padR,'#ff4466');drawBall();drawHUD();update();
  } else if(STATE==='GAMEOVER'){
    drawBg();drawPaddle(16,padL,'#44aaff');drawPaddle(W-16-PW,padR,'#ff4466');drawBall();drawHUD();
    drawOverlay(scoreL>scoreR?'YOU WIN!':'AI WINS','CLICK / SPACE to play again');
    if(click||keys['Space']||keys['Enter']){startGame();STATE='GAME';}
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
