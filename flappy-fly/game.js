'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=480,H=620;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};
let mX=W/2,clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if([' ','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);clickFrame=true;});
canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mX=(e.touches[0].clientX-r.left)*(W/r.width);},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(AudioContext||webkitAudioContext)();return AC;}
function tone(f,d,type='sine',vol=0.07,delay=0){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type;o.frequency.value=f;const t=a.currentTime+delay;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxBrick(hard){tone(hard?330:440,0.05,'square',0.06);}
function sfxPad(){tone(300,0.04,'sine',0.07);}
function sfxWall(){tone(260,0.03,'sine',0.05);}
function sfxLose(){tone(180,0.15,'sawtooth',0.1);tone(100,0.3,'sawtooth',0.1,0.12);}
function sfxPowerup(){tone(660,0.06,'triangle',0.09);tone(880,0.06,'triangle',0.08,0.07);}
function sfxClear(){[523,659,784,1047].forEach((f,i)=>tone(f,0.1,'triangle',0.09,i*0.08));}

// Brick layout constants
const COLS=9,ROWS=7,BW=46,BH=18,BPX=9,BPY=70,BGAP=4;
const BRICK_TYPES=[
  {hp:1,pts:10,col:'#44aaff',dark:'#2266aa'},
  {hp:1,pts:15,col:'#44ff88',dark:'#228844'},
  {hp:1,pts:20,col:'#ffd700',dark:'#aa8800'},
  {hp:2,pts:30,col:'#ff8833',dark:'#aa4400'},
  {hp:2,pts:40,col:'#cc44ff',dark:'#7700cc'},
  {hp:3,pts:60,col:'#ff4444',dark:'#aa0000'},
];
const PWUP_TYPES=['wide','multi','slow'];

const PAD_H=12,BALL_R=9;
let STATE='TITLE',pad,balls,bricks,score,lives,best=+(localStorage.getItem('bb2_best')||0),frame,pwups,particles=[],level,launched;

function makeBricks(){
  bricks=[];
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const t=BRICK_TYPES[Math.min(r,BRICK_TYPES.length-1)];
      bricks.push({x:BPX+c*(BW+BGAP),y:BPY+r*(BH+BGAP),hp:t.hp,maxHp:t.hp,pts:t.pts,col:t.col,dark:t.dark,hit:0});
    }
  }
}

function startGame(){
  pad={x:W/2,w:80};balls=[];pwups=[];score=0;lives=3;frame=0;level=1;launched=false;particles=[];
  makeBricks();
  spawnBall();
}

function spawnBall(x,y,vx,vy){
  const bx=x||W/2,by=y||(H-60);
  const angle=vx!=null?Math.atan2(vy,vx):(-Math.PI/2+(-0.4+Math.random()*0.8));
  const sp=5.5;
  balls.push({x:bx,y:by,vx:Math.cos(angle)*sp,vy:Math.sin(angle)*sp,trail:[]});
}

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=3+Math.random()*6;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:2+Math.random()*4,life:16+Math.random()*12});}}

function update(){
  frame++;

  // Paddle movement
  const spd=7;
  if(keys['ArrowLeft']||keys['KeyA'])pad.x=Math.max(pad.w/2,pad.x-spd);
  if(keys['ArrowRight']||keys['KeyD'])pad.x=Math.min(W-pad.w/2,pad.x+spd);
  pad.x+=(mX-pad.x)*0.18;
  pad.x=Math.max(pad.w/2,Math.min(W-pad.w/2,pad.x));

  // Ball not launched yet — sit on paddle
  if(!launched){balls.forEach(b=>{b.x=pad.x;b.y=H-50-BALL_R;});return;}

  // Move balls
  balls=balls.filter(b=>{
    b.trail.push({x:b.x,y:b.y});if(b.trail.length>8)b.trail.shift();
    b.x+=b.vx;b.y+=b.vy;
    // Wall bounce
    if(b.x<BALL_R){b.x=BALL_R;b.vx=Math.abs(b.vx);sfxWall();}
    if(b.x>W-BALL_R){b.x=W-BALL_R;b.vx=-Math.abs(b.vx);sfxWall();}
    if(b.y<BALL_R){b.y=BALL_R;b.vy=Math.abs(b.vy);sfxWall();}
    // Paddle
    const py=H-50;
    if(b.vy>0&&b.y+BALL_R>py&&b.y+BALL_R<py+PAD_H+8&&b.x>pad.x-pad.w/2-BALL_R&&b.x<pad.x+pad.w/2+BALL_R){
      b.vy=-Math.abs(b.vy);
      b.vx=((b.x-(pad.x))/(pad.w/2))*5.5;
      const sp=Math.hypot(b.vx,b.vy);const cap=7;if(sp>cap){b.vx=b.vx/sp*cap;b.vy=b.vy/sp*cap;}
      b.vy=Math.min(-3,b.vy);
      sfxPad();
    }
    // Bricks
    for(let i=bricks.length-1;i>=0;i--){
      const br=bricks[i];
      if(b.x+BALL_R>br.x&&b.x-BALL_R<br.x+BW&&b.y+BALL_R>br.y&&b.y-BALL_R<br.y+BH){
        // Which face?
        const overlapL=b.x+BALL_R-br.x,overlapR=br.x+BW-(b.x-BALL_R);
        const overlapT=b.y+BALL_R-br.y,overlapB=br.y+BH-(b.y-BALL_R);
        const minH=Math.min(overlapL,overlapR),minV=Math.min(overlapT,overlapB);
        if(minH<minV)b.vx*=-1;else b.vy*=-1;
        br.hit=8;br.hp--;
        sfxBrick(br.hp>0);
        if(br.hp<=0){
          score+=br.pts;if(score>best){best=score;localStorage.setItem('bb2_best',String(best));}
          spawnPfx(br.x+BW/2,br.y+BH/2,br.col,8);
          if(Math.random()<0.18)pwups.push({x:br.x+BW/2,y:br.y+BH/2,vy:2,type:PWUP_TYPES[Math.floor(Math.random()*PWUP_TYPES.length)]});
          bricks.splice(i,1);
        }
        break;
      }
    }
    // Lost
    if(b.y>H+20)return false;
    return true;
  });

  // Power-ups
  pwups=pwups.filter(p=>{
    p.y+=p.vy;
    const py=H-50;
    if(p.y+12>py&&p.y-12<py+PAD_H&&p.x>pad.x-pad.w/2-16&&p.x<pad.x+pad.w/2+16){
      sfxPowerup();
      if(p.type==='wide'){pad.w=Math.min(130,pad.w+30);}
      else if(p.type==='multi'){const b=balls[0];if(b)spawnBall(b.x,b.y,-b.vx,b.vy);}
      else if(p.type==='slow'){balls.forEach(b=>{const s=Math.hypot(b.vx,b.vy);b.vx=b.vx/s*4;b.vy=b.vy/s*4;});}
      return false;
    }
    return p.y<H+20;
  });

  if(balls.length===0){lives--;if(lives<=0){sfxLose();STATE='GAMEOVER';}else{sfxLose();launched=false;spawnBall();}}
  if(bricks.length===0){sfxClear();level++;score+=500;makeBricks();launched=false;spawnBall();}
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;return --p.life>0;});
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#080818');g.addColorStop(1,'#12123a');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}

function drawBricks(){
  bricks.forEach(b=>{
    const shake=b.hit>0?(Math.random()-0.5)*b.hit*0.8:0;if(b.hit>0)b.hit--;
    ctx.save();ctx.translate(shake,shake);
    ctx.shadowColor=b.col;ctx.shadowBlur=b.hp>1?10:5;
    const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+BH);g.addColorStop(0,b.col);g.addColorStop(1,b.dark);
    ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(b.x,b.y,BW,BH,3);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(b.x+2,b.y+2,BW-4,5);
    ctx.shadowBlur=0;ctx.restore();
  });
}

function drawPaddle(){
  const x=pad.x-pad.w/2,y=H-50;
  ctx.shadowColor='#44aaff';ctx.shadowBlur=14;
  const g=ctx.createLinearGradient(x,y,x+pad.w,y+PAD_H);g.addColorStop(0,'#66ccff');g.addColorStop(1,'#2266aa');
  ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(x,y,pad.w,PAD_H,6);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(x+4,y+2,pad.w-8,4);
  ctx.shadowBlur=0;
}

function drawBalls(){
  balls.forEach(b=>{
    b.trail.forEach((t,i)=>{ctx.globalAlpha=0.08*(i+1);ctx.fillStyle='#88ddff';ctx.beginPath();ctx.arc(t.x,t.y,BALL_R*(0.5+i*0.07),0,Math.PI*2);ctx.fill();});
    ctx.globalAlpha=1;
    ctx.shadowColor='#88ddff';ctx.shadowBlur=16;
    const g=ctx.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,BALL_R);g.addColorStop(0,'#fff');g.addColorStop(1,'rgba(68,170,255,0.6)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,BALL_R,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  });
}

function drawPwups(){
  const PC={'wide':'#44aaff','multi':'#ff8833','slow':'#44ff88'};
  const PL={'wide':'WIDE','multi':'x2','slow':'SLOW'};
  pwups.forEach(p=>{
    ctx.shadowColor=PC[p.type];ctx.shadowBlur=10;
    ctx.fillStyle=PC[p.type];ctx.beginPath();ctx.roundRect(p.x-16,p.y-10,32,20,5);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.6)';ctx.font='bold 6px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(PL[p.type],p.x,p.y+3);ctx.shadowBlur=0;
  });ctx.textAlign='left';
}

function drawFX(){
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/20);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
}

function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(0,0,W,48);
  ctx.fillStyle='#fff';ctx.shadowBlur=8;ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,30);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,42);
  ctx.textAlign='left';ctx.fillStyle='#ff4444';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('❤'.repeat(lives),10,28);
  ctx.textAlign='right';ctx.fillStyle='#ffd700';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-10,28);
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('LVL '+level,W-10,40);ctx.textAlign='left';
  if(!launched&&STATE==='GAME'){ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='7px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('CLICK / SPACE to launch',W/2,H-20);ctx.textAlign='left';}
}

function drawOverlay(title,sc,nb){
  ctx.fillStyle='rgba(0,0,0,0.78)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#44aaff';ctx.shadowColor='#44aaff';ctx.shadowBlur=22;ctx.font='bold 24px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(title,W/2,H/2-90);ctx.shadowBlur=0;
  if(sc!==undefined){ctx.fillStyle='#fff';ctx.shadowBlur=12;ctx.font='bold 40px "Press Start 2P",monospace';ctx.fillText(sc,W/2,H/2-20);ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='6px "Press Start 2P",monospace';ctx.fillText('SCORE',W/2,H/2);}
  if(nb){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('✦ NEW BEST! ✦',W/2,H/2+26);}
  else if(best>0&&sc!==undefined){ctx.fillStyle='rgba(255,215,0,0.6)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+26);}
  if(sc===undefined){ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('SMASH ALL THE BRICKS!',W/2,H/2+10);ctx.fillText('GRAB POWER-UPS: WIDE · x2 · SLOW',W/2,H/2+28);ctx.fillText('3 LIVES — DONT LET BALL DROP!',W/2,H/2+46);}
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('CLICK / SPACE to '+(title==='GAME OVER'?'restart':'play'),W/2,H/2+76);
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){drawBg();drawOverlay('BRICK BREAKER',undefined,false);if(click||keys['Space']){startGame();STATE='GAME';}}
  else if(STATE==='GAME'){
    drawBg();drawBricks();drawPaddle();drawBalls();drawPwups();drawFX();drawHUD();
    if((click||keys['Space'])&&!launched){launched=true;}
    update();
  }
  else if(STATE==='GAMEOVER'){drawBg();drawBricks();drawOverlay('GAME OVER',score,score>=best&&score>0);if(click||keys['Space']){startGame();STATE='GAME';}}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
