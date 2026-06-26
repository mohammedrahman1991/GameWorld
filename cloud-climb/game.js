'use strict';
const canvas=document.getElementById('gameCanvas'),ctx=canvas.getContext('2d');
const W=360,H=600;canvas.width=W;canvas.height=H;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);canvas.style.width=Math.floor(W*s)+'px';canvas.style.height=Math.floor(H*s)+'px';}
window.addEventListener('resize',resize);resize();

const keys={};let clickFrame=false;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowLeft','ArrowRight','ArrowUp',' '].includes(e.key))e.preventDefault();});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
canvas.addEventListener('click',()=>clickFrame=true);
let tx=0;
canvas.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;e.preventDefault();},{passive:false});
canvas.addEventListener('touchend',e=>{
  const dx=e.changedTouches[0].clientX-tx;
  if(Math.abs(dx)<20){keys['ArrowUp']=true;setTimeout(()=>keys['ArrowUp']=false,80);}
  else if(dx>20){keys['ArrowRight']=true;setTimeout(()=>keys['ArrowRight']=false,100);}
  else{keys['ArrowLeft']=true;setTimeout(()=>keys['ArrowLeft']=false,100);}
  e.preventDefault();
},{passive:false});

let AC=null;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}
function tone(f,d,type,vol){try{const a=getAC(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.type=type||'sine';o.frequency.value=f;const t=a.currentTime;g.gain.setValueAtTime(vol||0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.start(t);o.stop(t+d+0.02);}catch(e){}}
function sfxJump(){tone(440,0.07,'sine',0.06);}
function sfxStar(){tone(880,0.05,'sine',0.06);}
function sfxDie(){tone(180,0.2,'sawtooth',0.1);}

const GRAV=0.25,JUMP=-14;
let STATE='TITLE',player,clouds=[],stars=[],score=0,best=+(localStorage.getItem('cc_best')||0),frame=0,height=0,tf=0;

function makeClouds(){
  const cs=[{x:W/2-90,y:H-106,w:180,moving:false,vx:0}];
  for(let i=1;i<10;i++)cs.push({x:Math.random()*(W-100),y:H-106-i*55,w:90+Math.random()*70,moving:Math.random()<0.15,vx:(Math.random()<0.5?1:-1)*(0.4+Math.random()*0.5)});
  return cs;
}

function startGame(){
  player={x:W/2,y:H-120,vy:0,onCloud:true};
  clouds=makeClouds();stars=[];score=0;frame=0;height=0;
  STATE='GAME';
}

function update(){
  frame++;
  const SPD=4.5;
  if(keys['ArrowLeft']||keys['KeyA'])player.x-=SPD;
  if(keys['ArrowRight']||keys['KeyD'])player.x+=SPD;
  if((keys['ArrowUp']||keys['KeyW']||keys['Space'])&&player.onCloud){player.vy=JUMP;player.onCloud=false;sfxJump();}
  player.vy+=GRAV;player.y+=player.vy;player.onCloud=false;
  // Wrap
  if(player.x<-12)player.x=W+12;if(player.x>W+12)player.x=-12;

  clouds.forEach(c=>{
    if(c.moving){c.x+=c.vx;if(c.x<0||c.x+c.w>W)c.vx*=-1;}
    if(player.vy>=0&&player.x>c.x+4&&player.x<c.x+c.w-4&&player.y+14>=c.y&&player.y+14<=c.y+14+player.vy){
      player.y=c.y-14;player.vy=0;player.onCloud=true;
    }
  });

  // Scroll up when player reaches top half
  if(player.y<H/2){
    const shift=H/2-player.y;player.y=H/2;
    clouds.forEach(c=>c.y+=shift);stars.forEach(s=>s.y+=shift);
    height+=shift;score=Math.floor(height/10);if(score>best){best=score;localStorage.setItem('cc_best',String(best));}
  }

  // Spawn clouds at top
  if(clouds.length===0||Math.min(...clouds.map(c=>c.y))>50){
    const topY=clouds.length?Math.min(...clouds.map(c=>c.y))-55:-30;
    clouds.push({x:Math.random()*(W-100),y:topY,w:90+Math.random()*70,moving:Math.random()<0.15,vx:(Math.random()<0.5?1:-1)*(0.4+Math.random()*0.5)});
    if(Math.random()<0.5)stars.push({x:Math.random()*(W-20)+10,y:topY-25,collected:false});
  }
  clouds=clouds.filter(c=>c.y<H+20);
  stars=stars.filter(s=>{
    if(!s.collected&&Math.abs(player.x-s.x)<16&&Math.abs(player.y-s.y)<16){s.collected=true;score+=20;sfxStar();if(score>best){best=score;localStorage.setItem('cc_best',String(best));}}
    return !s.collected&&s.y<H+20;
  });

  if(player.y>H+20){sfxDie();STATE='GAMEOVER';}
}

function loop(){
  const click=clickFrame;clickFrame=false;
  ctx.clearRect(0,0,W,H);
  const p=Math.min(1,height/2000);
  const r1=Math.floor(135-p*100),g1=Math.floor(206-p*80),b1=Math.floor(235-p*100);
  const r2=Math.floor(200-p*160),g2=Math.floor(230-p*100),b2=Math.floor(255-p*100);
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,`rgb(${r1},${g1},${b1})`);bg.addColorStop(1,`rgb(${r2},${g2},${b2})`);
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  if(STATE==='TITLE'){
    tf++;
    ctx.fillStyle='rgba(255,255,255,0.88)';ctx.fillRect(W/2-155,H/2-100,310,220);
    ctx.fillStyle='#4488ff';ctx.font='bold 16px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('CLOUD CLIMB',W/2,H/2-54);
    ctx.fillStyle='#333';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('JUMP UP THE CLOUDS!',W/2,H/2-22);ctx.fillText('COLLECT STARS FOR BONUS!',W/2,H/2-2);
    if(best>0){ctx.fillStyle='#4488ff';ctx.fillText('BEST: '+best,W/2,H/2+24);}
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillText('ARROWS to move & jump',W/2,H/2+56);ctx.fillText('CLICK to start',W/2,H/2+78);
    if(click||keys['Space']||keys['ArrowUp'])startGame();
  } else if(STATE==='GAME'){
    clouds.forEach(c=>{
      ctx.fillStyle='rgba(255,255,255,0.92)';ctx.shadowColor='#fff';ctx.shadowBlur=4;
      ctx.beginPath();ctx.ellipse(c.x+c.w/2,c.y+6,c.w/2,10,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(c.x+c.w*0.35,c.y,c.w*0.24,12,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(c.x+c.w*0.65,c.y+2,c.w*0.2,10,0,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
    });
    stars.forEach(s=>{
      if(!s.collected){
        ctx.fillStyle='#ffd700';ctx.shadowColor='#ffd700';ctx.shadowBlur=8;
        ctx.beginPath();const pts=5,r1=10,r2=5;
        for(let i=0;i<pts*2;i++){const a=i*Math.PI/pts-Math.PI/2,r=i%2===0?r1:r2;ctx.lineTo(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r);}
        ctx.closePath();ctx.fill();ctx.shadowBlur=0;
      }
    });
    // Player (little character)
    ctx.fillStyle='#ff8844';ctx.beginPath();ctx.arc(player.x,player.y,12,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ffaa66';ctx.beginPath();ctx.arc(player.x,player.y-2,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#111';ctx.beginPath();ctx.arc(player.x-3,player.y-2,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(player.x+3,player.y-2,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,W,34);
    ctx.fillStyle='#fff';ctx.font='bold 10px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText(score,W/2,22);
    ctx.textAlign='right';ctx.fillStyle='#aaa';ctx.font='7px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W-8,22);ctx.textAlign='left';
    update();
  } else {
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#4488ff';ctx.font='bold 14px "Press Start 2P",monospace';ctx.textAlign='center';ctx.fillText('FELL DOWN!',W/2,H/2-50);
    ctx.fillStyle='#fff';ctx.font='bold 26px "Press Start 2P",monospace';ctx.fillText(score,W/2,H/2+4);
    if(score>=best&&score>0){ctx.fillStyle='#ffd700';ctx.font='9px "Press Start 2P",monospace';ctx.fillText('NEW BEST!',W/2,H/2+36);}
    else{ctx.fillStyle='#aaa';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('BEST: '+best,W/2,H/2+36);}
    ctx.fillStyle='rgba(255,255,255,0.3)';ctx.font='8px "Press Start 2P",monospace';ctx.fillText('CLICK to restart',W/2,H/2+70);
    if(click||keys['Space'])startGame();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
