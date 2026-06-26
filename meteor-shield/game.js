'use strict';
// ICE DASH — penguin slides on ice collecting fish, dodge polar bears
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=480,H=560;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',e=>{clickFrame=true;});
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxFish(){tone(880,0.05,'sine',0.06);}
function sfxDie(){tone(150,0.2,'sawtooth',0.1);}
function sfxJump(){tone(440,0.08,'sine',0.06);}

const GROUND=H-70,GRAV=0.55,JUMP=-13;
let STATE='TITLE',player,platforms,bears,fish,particles,score,best=+(localStorage.getItem('id_best')||0),frame,speed,tf=0;

function startGame(){
  player={x:W/2,y:GROUND-40,vy:0,w:36,h:44,onGround:true,invT:0};
  platforms=[];bears=[];fish=[];particles=[];
  score=0;frame=0;speed=3.5;
  for(let i=0;i<5;i++){
    platforms.push({x:40+Math.random()*(W-120),y:GROUND-100-i*90,w:90+Math.random()*60});
  }
  STATE='GAME';
}

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:3+Math.random()*4,life:22});}}

function update(){
  frame++;speed=Math.min(7,3.5+frame/700);
  const scroll=speed*0.45;
  platforms.forEach(p=>p.y+=scroll);
  bears.forEach(b=>{b.y+=scroll;b.x+=b.vx;if(b.x<18||b.x>W-18)b.vx*=-1;});
  fish.forEach(f=>f.y+=scroll);

  if(frame%55===0){
    const x=30+Math.random()*(W-130);
    const topY=platforms.length?Math.min(...platforms.map(p=>p.y))-80:-60;
    const pw=85+Math.random()*65;
    platforms.push({x,y:topY,w:pw});
    if(Math.random()<0.65)fish.push({x:x+15+Math.random()*(pw-30),y:topY-22,collected:false});
    if(Math.random()<0.25+frame/4000)bears.push({x:x+Math.random()*30,y:topY-34,w:38,h:40,vx:(Math.random()<0.5?1:-1)*1.4});
  }

  const SPD=5;
  if(keys['ArrowLeft']||keys['KeyA'])player.x=Math.max(18,player.x-SPD);
  if(keys['ArrowRight']||keys['KeyD'])player.x=Math.min(W-18,player.x+SPD);
  if((keys['Space']||keys['ArrowUp']||keys['KeyW'])&&player.onGround){player.vy=JUMP;player.onGround=false;sfxJump();}
  player.vy+=GRAV;player.y+=player.vy;player.onGround=false;

  platforms.forEach(p=>{
    if(player.vy>=0&&player.x+14>p.x&&player.x-14<p.x+p.w&&player.y+player.h>=p.y&&player.y+player.h<=p.y+14+player.vy+2){
      player.y=p.y-player.h;player.vy=0;player.onGround=true;
    }
  });
  if(player.y+player.h>=GROUND){player.y=GROUND-player.h;player.vy=0;player.onGround=true;}
  if(player.x<-10)player.x=W+10;if(player.x>W+10)player.x=-10;

  fish=fish.filter(f=>{
    if(!f.collected&&Math.abs(player.x-f.x)<26&&Math.abs(player.y+player.h/2-f.y)<26){
      f.collected=true;score+=10;sfxFish();spawnPfx(f.x,f.y,'#ffd700',6);
      if(score>best){best=score;localStorage.setItem('id_best',String(best));}
    }
    return !f.collected&&f.y<H+30;
  });

  if(player.invT<=0){
    for(const b of bears){
      if(Math.abs(player.x-b.x)<(18+b.w/2)-4&&Math.abs((player.y+player.h/2)-(b.y+b.h/2))<(player.h/2+b.h/2)-8){
        sfxDie();STATE='GAMEOVER';break;
      }
    }
  }
  if(player.invT>0)player.invT--;
  if(player.y>H+60)STATE='GAMEOVER';

  platforms=platforms.filter(p=>p.y<H+20&&p.y>-220);
  bears=bears.filter(b=>b.y<H+50&&b.y>-120);
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;return --p.life>0;});
  score++;
  if(score>best){best=score;localStorage.setItem('id_best',String(best));}
}

function drawBg(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#aaddf5');g.addColorStop(1,'#ddf0fa');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#c8eef8';ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillRect(0,GROUND,W,5);
  ctx.fillStyle='rgba(255,255,255,0.4)';
  for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(40+i*80,(frame*0.25+i*80)%GROUND,4,0,Math.PI*2);ctx.fill();}
}

function drawPlatforms(){
  platforms.forEach(p=>{
    ctx.fillStyle='#90d0ee';ctx.fillRect(p.x,p.y,p.w,14);
    ctx.fillStyle='rgba(255,255,255,0.75)';ctx.fillRect(p.x,p.y,p.w,4);
  });
}

function drawPenguin(x,y,w,h,inv){
  if(inv&&Math.floor(inv/6)%2===1)return;
  ctx.fillStyle='#222';ctx.beginPath();ctx.ellipse(x,y+h*0.3,w*0.42,h*0.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y+h*0.38,w*0.26,h*0.36,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.arc(x,y-h*0.08,w*0.34,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+w*0.14,y-h*0.12,w*0.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x+w*0.17,y-h*0.12,w*0.05,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff8800';ctx.beginPath();ctx.moveTo(x+w*0.24,y-h*0.05);ctx.lineTo(x+w*0.42,y-h*0.01);ctx.lineTo(x+w*0.24,y+h*0.04);ctx.closePath();ctx.fill();
  ctx.fillRect(x-w*0.26,y+h*0.78,w*0.22,5);ctx.fillRect(x+w*0.04,y+h*0.78,w*0.22,5);
}

function drawBear(b){
  const x=b.x,y=b.y,w=b.w,h=b.h;
  ctx.fillStyle='#e8e8e8';ctx.beginPath();ctx.ellipse(x,y+h*0.35,w*0.44,h*0.46,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ddd';ctx.beginPath();ctx.arc(x,y-h*0.05,w*0.34,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x-w*0.3,y-h*0.2,w*0.16,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+w*0.3,y-h*0.2,w*0.16,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-w*0.1,y-h*0.05,w*0.07,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+w*0.1,y-h*0.05,w*0.07,0,Math.PI*2);ctx.fill();
}

function drawFishItem(f){
  if(f.collected)return;
  ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=5;
  ctx.beginPath();ctx.ellipse(f.x,f.y,11,7,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(f.x-9,f.y-5);ctx.lineTo(f.x-16,f.y-9);ctx.lineTo(f.x-16,f.y+1);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  if(STATE==='TITLE'){
    tf++;drawBg();
    ctx.fillStyle='rgba(255,255,255,0.92)';ctx.fillRect(W/2-185,H/2-110,370,230);
    ctx.fillStyle='#0066aa';ctx.font='bold 20px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('ICE DASH',W/2,H/2-60);
    ctx.fillStyle='#333';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('JUMP & COLLECT FISH!',W/2,H/2-28);
    ctx.fillText('AVOID POLAR BEARS!',W/2,H/2-8);
    ctx.fillText('ARROWS / SPACE to jump',W/2,H/2+20);
    if(best>0){ctx.fillStyle='#0066aa';ctx.fillText('BEST: '+best,W/2,H/2+46);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('CLICK to start',W/2,H/2+78);
    drawPenguin(W/2,H*0.72,36,44,0);
    if(click||keys['Space'])startGame();
  } else if(STATE==='GAME'){
    drawBg();drawPlatforms();
    fish.forEach(f=>drawFishItem(f));
    bears.forEach(b=>drawBear(b));
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/22);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    drawPenguin(player.x,player.y,player.w,player.h,player.invT);
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,36);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,24);
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,24);ctx.textAlign='left';
    update();
  } else {
    drawBg();
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff';ctx.font='bold 20px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,H/2-50);
    ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
