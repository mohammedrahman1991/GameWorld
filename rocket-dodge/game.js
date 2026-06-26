'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=380,H=600;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let mX=W/2,clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();mX=(e.clientX-r.left)*(W/r.width);clickFrame=true;});
canvas.addEventListener('touchmove',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();mX=(e.touches[0].clientX-r.left)*(W/r.width);},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();clickFrame=true;},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxDie(){tone(150,0.2,'sawtooth',0.1);}
function sfxStar(){tone(880,0.04,'sine',0.05);}

const STARS_BG=[];for(let i=0;i<80;i++)STARS_BG.push({x:Math.random()*W,y:Math.random()*H,s:0.5+Math.random()*2,spd:0.5+Math.random()*1.5});
let STATE='TITLE',rocket,rocks,stars,particles,score,best=+(localStorage.getItem('rd_best')||0),frame,tf=0;

function startGame(){
  rocket={x:W/2,y:H-80,w:22,h:36,invT:0};rocks=[];stars=[];particles=[];score=0;frame=0;STATE='GAME';
}

function spawnPfx(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col,r:3+Math.random()*4,life:20});}}

function update(){
  frame++;const spd=Math.min(8,2.5+frame/300);
  // Scroll stars bg
  STARS_BG.forEach(s=>{s.y+=s.spd;if(s.y>H)s.y=-2;});
  // Move rocket
  const SPD=5;
  if(keys['ArrowLeft']||keys['KeyA'])rocket.x-=SPD;
  if(keys['ArrowRight']||keys['KeyD'])rocket.x+=SPD;
  rocket.x+=(mX-rocket.x)*0.1;
  rocket.x=Math.max(rocket.w/2,Math.min(W-rocket.w/2,rocket.x));

  // Spawn rocks
  if(frame%Math.max(18,50-Math.floor(frame/80))===0){
    const w=20+Math.random()*30,type=Math.random()<0.15?'big':Math.random()<0.3?'fast':'normal';
    const rw=type==='big'?40:w,rh=type==='big'?40:w;
    rocks.push({x:rw/2+Math.random()*(W-rw),y:-rh,w:rw,h:rh,vy:spd*(type==='fast'?2.2:1),rot:Math.random()*Math.PI*2,rspd:(Math.random()-0.5)*0.08,col:type==='big'?'#88aacc':type==='fast'?'#ff8844':'#aabbcc'});
  }
  // Spawn stars
  if(Math.random()<0.02)stars.push({x:20+Math.random()*(W-40),y:-12,vy:spd*0.7});

  rocks=rocks.filter(r=>{r.y+=r.vy;r.rot+=r.rspd;if(r.y>H+30)return false;
    if(rocket.invT<=0&&Math.abs(r.x-rocket.x)<(r.w/2+rocket.w/2)-4&&Math.abs(r.y-rocket.y)<(r.h/2+rocket.h/2)-4){
      sfxDie();STATE='GAMEOVER';
    }
    return true;
  });
  stars=stars.filter(s=>{s.y+=s.vy;
    if(Math.hypot(s.x-rocket.x,s.y-rocket.y)<22){score+=20;sfxStar();spawnPfx(s.x,s.y,'#ffd700',6);if(score>best){best=score;localStorage.setItem('rd_best',String(best));}return false;}
    return s.y<H+10;
  });
  if(rocket.invT>0)rocket.invT--;
  score++;if(score>best){best=score;localStorage.setItem('rd_best',String(best));}
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;return --p.life>0;});
}

function drawRocket(x,y,w,h,inv){
  if(inv&&Math.floor(inv/6)%2===1)return;
  ctx.fillStyle='#ff6644';ctx.beginPath();ctx.moveTo(x,y-h/2);ctx.lineTo(x+w/2,y+h/4);ctx.lineTo(x-w/2,y+h/4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#cc3322';ctx.fillRect(x-w/2,y+h/4-4,w,h/2);
  ctx.fillStyle='#44aaff';ctx.beginPath();ctx.ellipse(x,y-h/4,w*0.28,h*0.18,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff8800';ctx.fillRect(x-w*0.3,y+h/2-4,w*0.24,h*0.3+4);ctx.fillRect(x+w*0.06,y+h/2-4,w*0.24,h*0.3+4);
  // Flame
  const fl=8+Math.sin(frame*0.4)*4;
  const fg=ctx.createLinearGradient(x,y+h/2,x,y+h/2+fl+8);fg.addColorStop(0,'#ff8800');fg.addColorStop(1,'rgba(255,100,0,0)');
  ctx.fillStyle=fg;ctx.beginPath();ctx.moveTo(x-w*0.3,y+h/2);ctx.lineTo(x,y+h/2+fl+8);ctx.lineTo(x+w*0.3,y+h/2);ctx.closePath();ctx.fill();
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#05050f';ctx.fillRect(0,0,W,H);
  STARS_BG.forEach(s=>{ctx.fillStyle=`rgba(255,255,255,${0.3+Math.random()*0.4})`;ctx.beginPath();ctx.arc(s.x,s.y,s.s,0,Math.PI*2);ctx.fill();});
  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W/2-160,H/2-100,320,220);
    ctx.fillStyle='#ff6644';ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('ROCKET DODGE',W/2,H/2-54);
    ctx.fillStyle='#333';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('DODGE THE ASTEROIDS!',W/2,H/2-22);ctx.fillText('COLLECT STARS FOR BONUS!',W/2,H/2-2);
    if(best>0){ctx.fillStyle='#ff6644';ctx.fillText('BEST: '+best,W/2,H/2+24);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('MOUSE or ARROWS to move',W/2,H/2+56);ctx.fillText('CLICK to start',W/2,H/2+78);
    if(click||keys['Space'])startGame();
  } else if(STATE==='GAME'){
    rocks.forEach(r=>{
      ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.rot);
      ctx.fillStyle=r.col;ctx.beginPath();
      for(let i=0;i<7;i++){const a=i*Math.PI*2/7,ra=r.w/2*(0.7+Math.random()*0.3*0.3+0.7);ctx.lineTo(Math.cos(a)*ra,Math.sin(a)*ra);}
      ctx.closePath();ctx.fill();ctx.restore();
    });
    stars.forEach(s=>{
      ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=8;
      ctx.beginPath();const pts=5,r1=10,r2=4;
      for(let i=0;i<pts*2;i++){const a=i*Math.PI/pts-Math.PI/2,r=i%2===0?r1:r2;ctx.lineTo(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r);}
      ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    });
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/20);ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    drawRocket(rocket.x,rocket.y,rocket.w,rocket.h,rocket.invT);
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    update();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ff6644';ctx.font='bold 14px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('ROCKET DESTROYED!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
