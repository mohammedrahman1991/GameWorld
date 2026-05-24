'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const WORLD    = 9000;
const FOOD_MAX = 5000;
const BOT_COUNT= 800;
const MAX_NUM  = 1e12;
const EAT_RATIO= 1.12;
const EAT_GAIN = 0.75;
const CELL     = 350;

// 3D camera
const FL       = 480;   // focal length (controls field of view)
let dynCamH    = 200;   // camera height (grows with player size)
let dynCamBack = 520;   // camera distance behind player (grows with player size)
const MAX_VIEW = 3400;  // max render distance
const TILE_SZ  = 130;   // world units per floor tile

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = [
  {name:'Red',    fill:'#FF4455', rim:'#BB1122'},
  {name:'Orange', fill:'#FF8C22', rim:'#BB5500'},
  {name:'Gold',   fill:'#FFD700', rim:'#AA9900'},
  {name:'Green',  fill:'#44CC44', rim:'#228822'},
  {name:'Cyan',   fill:'#22DDDD', rim:'#008888'},
  {name:'Blue',   fill:'#4488FF', rim:'#1144CC'},
  {name:'Purple', fill:'#AA44FF', rim:'#6600CC'},
  {name:'Pink',   fill:'#FF66CC', rim:'#CC2288'},
  {name:'Coral',  fill:'#FF7766', rim:'#CC2211'},
  {name:'Mint',   fill:'#66FFAA', rim:'#22BB66'},
  {name:'Rose',   fill:'#FF8899', rim:'#CC3355'},
  {name:'Sky',    fill:'#88CCFF', rim:'#3377CC'},
];

const FACE_NAMES = ['Happy 😊','Cool 😎','Angry 😠','Surprised 😮',
                    'Wink 😉','Sad 😢','Goofy 🤪','Sleepy 😴'];

const BOT_NAMES = [
  'Alex','Sam','Jordan','Riley','Casey','Morgan','Taylor','Drew','Quinn','Avery',
  'Blake','Cameron','Dana','Elliot','Finley','Harley','Hunter','Jamie','Jesse','Kai',
  'Logan','Luca','Max','Mickey','Noel','Parker','Peyton','Phoenix','Remy','Robin',
  'Rowan','Ryan','Sage','Skylar','Spencer','Sterling','Sydney','Terry','Tyler','Val',
  'Wesley','Wren','Zion','Ace','Ash','August','Bay','Brett','Chase','Clay',
  'Cole','Cruz','Dale','Dash','Dean','Devon','Dex','Drake','Duke','Dylan',
  'Eli','Emery','Erin','Evan','Fern','Flynn','Ford','Gage','Glen','Gray',
  'Gus','Hal','Hale','Hank','Haven','Heath','Hiro','Hugh','Hugo','Ivan',
  'Jade','Jalen','Jay','Jeff','Jon','Kirk','Knox','Lane','Link','Levi',
  'Mace','Mare','Mars','Mel','Nash','Nate','Neil','Nick','Noah','Nox',
  'Obi','Orion','Owen','Pax','Pierce','Pine','Pixel','Puck','Rad','Rae',
  'Rain','Ram','Rand','Reef','Rex','Rio','Rook','Rush','Rust','Ryder',
];

const FOOD_COLORS = ['#FF4466','#FF8833','#FFDD00','#44FF88','#44DDFF',
                     '#8844FF','#FF44CC','#AAFFAA','#FF9944','#44AAFF',
                     '#FF6644','#88FF44','#DD44FF','#FFAA22'];

// ── State ─────────────────────────────────────────────────────────────────────
let canvas, ctx, W, H;
let HORIZON = 300;       // screen Y of the horizon (updated on resize)

let gameMode = 1;
let running  = false;
let animId   = null;

let players = [], bots = [], foods = [];
let grid = {}, king = null;
let kills = [0, 0], frame = 0;

let skinColor = [0, 3];
let skinFace  = [0, 2];

let mouseX = 0, mouseY = 0;
const ARROW = {ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false};
const DPAD  = {up:false, down:false, left:false, right:false};

// Camera world position (x=lateral, y=depth/forward)
let camX = WORLD/2, camY = WORLD/2;

// ── D-pad ─────────────────────────────────────────────────────────────────────
function dpadPress(dir)   { DPAD[dir] = true; }
function dpadRelease(dir) { DPAD[dir] = false; }

// ── Boot ──────────────────────────────────────────────────────────────────────
window.onload = () => {
  canvas = document.getElementById('c');
  ctx    = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);

  // Mouse
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  // Touch — moves P1 via touch position on screen
  canvas.addEventListener('touchstart', handleTouch, {passive:false});
  canvas.addEventListener('touchmove',  handleTouch, {passive:false});

  // Keyboard
  window.addEventListener('keydown', e => {
    if (ARROW[e.code]!==undefined){ ARROW[e.code]=true; e.preventDefault(); }
    if ((e.key==='r'||e.key==='R'||e.code==='Enter') && !running) restartGame();
  });
  window.addEventListener('keyup', e => { if (ARROW[e.code]!==undefined){ ARROW[e.code]=false; } });

  drawPreview(0);
  drawPreview(1);
};

function handleTouch(e) {
  e.preventDefault();
  const t = e.touches[0];
  mouseX = t.clientX;
  mouseY = t.clientY;
}

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  HORIZON = Math.round(H * 0.38);
}

// ── 3D projection ─────────────────────────────────────────────────────────────
// world (wx, wy) on ground plane → screen (sx, sy)
// wh = object height above floor (center of sphere = its radius)
function project(wx, wy, wh) {
  const dx = wx - camX;
  const dy = wy - camY;   // forward depth (+ = in front of camera)
  if (dy < 2) return null;
  const s  = FL / dy;
  const h  = wh || 0;
  return {
    sx:    W/2 + dx * s,
    sy:    HORIZON + (dynCamH - h) * s,
    scale: s,
    depth: dy,
  };
}

// Screen point → world floor position (for mouse aiming)
function unproject(mx, my) {
  const screenDY = my - HORIZON;
  if (screenDY <= 2) return null;
  const dy = dynCamH * FL / screenDY;
  const dx = (mx - W/2) * dy / FL;
  return { x: camX + dx, y: camY + dy };
}

// ── Math utils ────────────────────────────────────────────────────────────────
function numToR(n)   { return Math.max(18, Math.min(500, Math.sqrt(Math.min(n, MAX_NUM)) * 2.4)); }

function fmt(n) {
  if (n >= 1e12) return '1.0T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)+'M';
  if (n >= 1e3)  return (n/1e3).toFixed(1)+'K';
  return Math.round(n)+'';
}

function lighten(hex, a) {
  const v=parseInt(hex.replace('#',''),16);
  let r=(v>>16)&255, g=(v>>8)&255, b=v&255;
  r=Math.min(255,r+Math.round((255-r)*a));
  g=Math.min(255,g+Math.round((255-g)*a));
  b=Math.min(255,b+Math.round((255-b)*a));
  return `rgb(${r},${g},${b})`;
}

function darken(hex, a) {
  const v=parseInt(hex.replace('#',''),16);
  let r=(v>>16)&255, g=(v>>8)&255, b=v&255;
  r=Math.max(0,Math.round(r*(1-a)));
  g=Math.max(0,Math.round(g*(1-a)));
  b=Math.max(0,Math.round(b*(1-a)));
  return `rgb(${r},${g},${b})`;
}

function rnd(lo, hi) { return lo + Math.random()*(hi-lo); }
function d2(a, b)    { return (a.x-b.x)**2+(a.y-b.y)**2; }

// ── Spatial grid ──────────────────────────────────────────────────────────────
function gkey(x,y){ return `${Math.floor(x/CELL)},${Math.floor(y/CELL)}`; }

function rebuildGrid() {
  grid = {};
  for (const e of [...bots,...players,...foods]) {
    if (e.dead) continue;
    const k = gkey(e.x, e.y);
    if (!grid[k]) grid[k] = [];
    grid[k].push(e);
  }
}

function nearby(x, y, r) {
  const out=[];
  const cx0=Math.floor((x-r)/CELL)-1, cx1=Math.floor((x+r)/CELL)+1;
  const cy0=Math.floor((y-r)/CELL)-1, cy1=Math.floor((y+r)/CELL)+1;
  for (let gx=cx0;gx<=cx1;gx++)
    for (let gy=cy0;gy<=cy1;gy++){
      const b=grid[`${gx},${gy}`];
      if(b) for(const e of b) out.push(e);
    }
  return out;
}

// ── Factories ─────────────────────────────────────────────────────────────────
function makeFood() {
  return {
    type:'food',
    x:rnd(100,WORLD-100), y:rnd(100,WORLD-100),
    r:7, color:FOOD_COLORS[Math.floor(Math.random()*FOOD_COLORS.length)],
    value:10, dead:false, respawnT:0,
  };
}

function makeBlob(x,y,num,ci,fi,name,isBot,pidx) {
  return {
    type:'blob', x, y, num, ci, fi, name, isBot, pidx,
    dead:false, respawnT:0, targetX:x, targetY:y, aiCountdown:0, wobbleSeed:Math.random()*1000,
  };
}

// ── UI (skin select) ──────────────────────────────────────────────────────────
function selectMode(n) {
  gameMode = n;
  document.getElementById('start-overlay').style.display = 'none';
  document.getElementById('skin-overlay').style.display  = '';
  document.getElementById('skin-p2').style.display = n===2?'':'none';
}

function cycleColor(pidx,dir) {
  skinColor[pidx]=(skinColor[pidx]+dir+COLORS.length)%COLORS.length;
  document.getElementById('cname'+pidx).textContent=COLORS[skinColor[pidx]].name;
  drawPreview(pidx);
}

function cycleFace(pidx,dir) {
  skinFace[pidx]=(skinFace[pidx]+dir+8)%8;
  document.getElementById('fname'+pidx).textContent=FACE_NAMES[skinFace[pidx]];
  drawPreview(pidx);
}

function startGame() {
  document.getElementById('skin-overlay').style.display='none';
  document.getElementById('hud').style.display='block';
  document.getElementById('dpad').style.display='block';
  initGame();
}

function restartGame() {
  document.getElementById('over-overlay').style.display='none';
  document.getElementById('hud').style.display='block';
  document.getElementById('dpad').style.display='block';
  initGame();
}

function goHome() {
  document.getElementById('over-overlay').style.display='none';
  document.getElementById('hud').style.display='none';
  document.getElementById('dpad').style.display='none';
  if(animId){cancelAnimationFrame(animId);animId=null;}
  running=false;
  document.getElementById('start-overlay').style.display='';
}

// ── Skin preview (top-down circle, for the select screen) ─────────────────────
function drawPreview(pidx) {
  const pc=document.getElementById('prev'+pidx);
  if(!pc) return;
  const px=pc.getContext('2d');
  const sz=130,cx=65,cy=65,r=46;
  px.clearRect(0,0,sz,sz);
  const ci=skinColor[pidx], fi=skinFace[pidx];
  const col=COLORS[ci];
  // sphere preview (top-down)
  const g=px.createRadialGradient(cx-r*0.32,cy-r*0.36,0,cx,cy,r);
  g.addColorStop(0,'rgba(255,255,255,0.85)');
  g.addColorStop(0.2,lighten(col.fill,0.5));
  g.addColorStop(0.5,col.fill);
  g.addColorStop(1,darken(col.fill,0.6));
  px.beginPath(); px.arc(cx,cy,r,0,Math.PI*2);
  px.fillStyle=g; px.fill();
  const sg=px.createRadialGradient(cx-r*0.3,cy-r*0.35,0,cx-r*0.3,cy-r*0.35,r*0.48);
  sg.addColorStop(0,'rgba(255,255,255,0.9)'); sg.addColorStop(1,'rgba(255,255,255,0)');
  px.beginPath(); px.arc(cx,cy,r,0,Math.PI*2); px.fillStyle=sg; px.fill();
  drawFace(px,cx,cy,r,fi);
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initGame() {
  if(animId){cancelAnimationFrame(animId);animId=null;}
  kills=[0,0]; frame=0; king=null;

  players=[];
  for(let i=0;i<gameMode;i++){
    players.push(makeBlob(
      rnd(1200,WORLD-1200), rnd(1200,WORLD-1200),
      100, skinColor[i], skinFace[i], i===0?'You':'P2', false, i
    ));
  }

  bots=[];
  for(let i=0;i<BOT_COUNT;i++){
    bots.push(makeBlob(
      rnd(100,WORLD-100), rnd(100,WORLD-100),
      Math.floor(rnd(80,600)),
      Math.floor(Math.random()*COLORS.length),
      Math.floor(Math.random()*8),
      BOT_NAMES[i%BOT_NAMES.length], true, -1
    ));
  }

  foods=[];
  for(let i=0;i<FOOD_MAX;i++) foods.push(makeFood());

  // Anchor camera directly behind player
  const p0=players[0];
  camX=p0.x; camY=p0.y-dynCamBack;
  // Anchor mouse to screen-center so blob doesn't drift
  mouseX=W/2; mouseY=HORIZON+Math.round(dynCamH*FL/dynCamBack);
  running=true;
  loop();
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function loop() {
  animId=requestAnimationFrame(loop);
  if(!running) return;
  update(); render(); frame++;
}

// ── Update ────────────────────────────────────────────────────────────────────
const DT=1/60;

function update() {
  const now=Date.now();

  // Respawn food
  for(const f of foods)
    if(f.dead&&now>=f.respawnT){ f.dead=false; f.x=rnd(100,WORLD-100); f.y=rnd(100,WORLD-100); }

  // Respawn bots
  for(const b of bots)
    if(b.dead&&now>=b.respawnT){ b.dead=false; b.x=rnd(100,WORLD-100); b.y=rnd(100,WORLD-100); b.num=Math.floor(rnd(80,250)); }

  // Move players
  for(const p of players){
    if(p.dead) continue;
    const r  =numToR(p.num);
    const spd=Math.max(55,170/Math.sqrt(r));

    if(p.pidx===0){
      const dp=DPAD.up||DPAD.down||DPAD.left||DPAD.right;
      if(dp){
        let ddx=(DPAD.right?1:0)-(DPAD.left?1:0);
        let ddy=(DPAD.up?1:0)-(DPAD.down?1:0);
        if(ddx||ddy){ const dl=Math.sqrt(ddx*ddx+ddy*ddy); p.x+=(ddx/dl)*spd*DT; p.y+=(ddy/dl)*spd*DT; }
      } else {
        // Screen-direction controls: mouse relative to player's screen position
        const pScreenY=HORIZON+dynCamH*FL/dynCamBack;
        const sdx=mouseX-W/2, sdy=-(mouseY-pScreenY);
        const sd=Math.sqrt(sdx*sdx+sdy*sdy);
        if(sd>20){ p.x+=(sdx/sd)*spd*DT; p.y+=(sdy/sd)*spd*DT; }
      }
    } else {
      // P2: arrow keys or d-pad
      let dx=(ARROW.ArrowRight||DPAD.right?1:0)-(ARROW.ArrowLeft||DPAD.left?1:0);
      let dy=(ARROW.ArrowUp||DPAD.up?1:0)-(ARROW.ArrowDown||DPAD.down?1:0);
      if(dx||dy){ const d=Math.sqrt(dx*dx+dy*dy); p.x+=(dx/d)*spd*DT; p.y+=(dy/d)*spd*DT; }
    }
    p.x=Math.max(r,Math.min(WORLD-r,p.x));
    p.y=Math.max(r,Math.min(WORLD-r,p.y));
  }

  // Bot AI (28/frame batch — dumb bots update slowly)
  rebuildGrid();
  const bs=(frame*28)%BOT_COUNT;
  for(let i=0;i<28;i++){ const b=bots[(bs+i)%BOT_COUNT]; if(!b.dead) aiBot(b); }

  // Move bots
  for(const b of bots){
    if(b.dead) continue;
    const r  =numToR(b.num);
    const spd=Math.max(42,135/Math.sqrt(r));
    const dx =b.targetX-b.x, dy=b.targetY-b.y;
    const d  =Math.sqrt(dx*dx+dy*dy)||1;
    if(d>6){ b.x+=(dx/d)*spd*DT; b.y+=(dy/d)*spd*DT; }
    b.x=Math.max(r,Math.min(WORLD-r,b.x));
    b.y=Math.max(r,Math.min(WORLD-r,b.y));
  }

  // Eating collisions
  rebuildGrid();
  const allBlobs=[...players,...bots].filter(e=>!e.dead);
  for(const a of allBlobs){
    const ra=numToR(a.num);
    for(const b of nearby(a.x,a.y,ra*2.5)){
      if(b===a||b.dead) continue;
      if(b.type==='food'){
        if(Math.sqrt(d2(a,b))<ra+b.r){
          a.num=Math.min(MAX_NUM,a.num+b.value);
          b.dead=true; b.respawnT=Date.now()+rnd(2000,3500);
        }
        continue;
      }
      if(b.type!=='blob') continue;
      if(a.num<b.num*EAT_RATIO) continue;
      if(Math.sqrt(d2(a,b))>ra*0.88) continue;
      a.num=Math.min(MAX_NUM,a.num+b.num*EAT_GAIN);
      b.dead=true; b.respawnT=Date.now()+rnd(3000,6000);
      if(!a.isBot) kills[a.pidx]++;
      if(!b.isBot&&b.pidx===0){ gameOver(0); return; }
    }
  }

  // King
  if(frame%8===0){ let t=null,n=0; for(const e of[...bots,...players]) if(!e.dead&&e.num>n){t=e;n=e.num;} king=t; }

  // Update dynamic camera based on player size
  const r0=!players[0].dead?numToR(players[0].num):25;
  dynCamH  =Math.max(200,r0*2.2);
  dynCamBack=Math.max(520,r0*3.8);

  // Camera smoothly follows player
  if(!players[0].dead){
    camX+=(players[0].x-camX)*0.1;
    camY+=((players[0].y-dynCamBack)-camY)*0.1;
  }
}

// ── Bot AI ────────────────────────────────────────────────────────────────────
function aiBot(b) {
  if(Math.random()<0.28) return; // bots are lazy — skip update 28% of the time
  const r=numToR(b.num), lookR=Math.min(r*5+180,900); // shorter sight range
  const near=nearby(b.x,b.y,lookR);
  let bf=null,bfD=Infinity,bp=null,bpD=Infinity,th=null,thD=Infinity;
  for(const n of near){
    if(n===b||n.dead) continue;
    const dd=d2(b,n);
    if(n.type==='food'){ if(dd<bfD){bf=n;bfD=dd;} continue; }
    if(n.type!=='blob') continue;
    const rn=numToR(n.num);
    if(rn*EAT_RATIO<=r&&dd<bpD){bp=n;bpD=dd;}
    if(rn>=r*EAT_RATIO&&dd<thD){th=n;thD=dd;}
  }
  const jitter=()=>rnd(-80,80); // imprecise targeting
  if(th){ b.targetX=b.x+(b.x-th.x)*1.8; b.targetY=b.y+(b.y-th.y)*1.8; } // flee less aggressively
  else if(bp&&Math.random()>0.2){ b.targetX=bp.x+jitter(); b.targetY=bp.y+jitter(); } // miss sometimes
  else if(bf){ b.targetX=bf.x+jitter()*0.5; b.targetY=bf.y+jitter()*0.5; }
  else{
    b.aiCountdown--;
    if(b.aiCountdown<=0){ b.targetX=rnd(120,WORLD-120); b.targetY=rnd(120,WORLD-120); b.aiCountdown=Math.floor(rnd(40,140)); }
  }
  b.targetX=Math.max(80,Math.min(WORLD-80,b.targetX));
  b.targetY=Math.max(80,Math.min(WORLD-80,b.targetY));
}

// ── Game over ─────────────────────────────────────────────────────────────────
function gameOver(pidx) {
  running=false;
  if(animId){cancelAnimationFrame(animId);animId=null;}
  document.getElementById('hud').style.display='none';
  document.getElementById('dpad').style.display='none';
  document.getElementById('over-score').textContent=fmt(players[pidx].num);
  document.getElementById('over-kills').textContent=kills[pidx];
  document.getElementById('over-overlay').style.display='flex';
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0,0,W,H);
  drawSky();
  drawFloor();

  // Collect visible objects
  const vis=[];
  for(const f of foods){
    if(f.dead) continue;
    const dy=f.y-camY;
    if(dy<5||dy>MAX_VIEW) continue;
    vis.push({kind:'food',e:f,depth:dy});
  }
  for(const b of bots){
    if(b.dead) continue;
    const dy=b.y-camY;
    if(dy<-numToR(b.num)||dy>MAX_VIEW) continue;
    vis.push({kind:'blob',e:b,depth:dy});
  }
  for(const p of players){
    if(p.dead) continue;
    const dy=p.y-camY;
    if(dy<-100||dy>MAX_VIEW) continue;
    vis.push({kind:'blob',e:p,depth:dy});
  }

  // Farthest first (painter's algorithm)
  vis.sort((a,b)=>b.depth-a.depth);

  for(const item of vis){
    if(item.kind==='food'){
      drawFood3D(item.e);
    } else {
      const e=item.e;
      const r=numToR(e.num);
      const p=project(e.x,e.y,r);
      if(!p) continue;
      const sr=r*p.scale;
      if(sr<2) continue;
      if(p.sx<-sr*3||p.sx>W+sr*3) continue;
      drawDome(p.sx,p.sy,sr,e.ci,e.fi,e===king,e.name,e.num,!e.isBot||e.pidx>=0,frame*0.05+(e.wobbleSeed||0));
    }
  }

  drawHUD();
}

// ── Sky ───────────────────────────────────────────────────────────────────────
function drawSky() {
  const g=ctx.createLinearGradient(0,0,0,HORIZON);
  g.addColorStop(0,'#1155AA');
  g.addColorStop(0.65,'#3388CC');
  g.addColorStop(1,'#88BBDD');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,HORIZON);

  // Simple horizon haze
  const hz=ctx.createLinearGradient(0,HORIZON-30,0,HORIZON);
  hz.addColorStop(0,'rgba(180,220,180,0)');
  hz.addColorStop(1,'rgba(150,220,100,0.55)');
  ctx.fillStyle=hz; ctx.fillRect(0,HORIZON-30,W,30);
}

// ── Floor ─────────────────────────────────────────────────────────────────────
function drawFloor() {
  // Base green gradient
  const g=ctx.createLinearGradient(0,HORIZON,0,H);
  g.addColorStop(0,'#77EE44');
  g.addColorStop(0.5,'#55CC33');
  g.addColorStop(1,'#44AA22');
  ctx.fillStyle=g; ctx.fillRect(0,HORIZON,W,H-HORIZON);

  // ── Horizontal lines (same world-y → same screen-y) ─────────────────────
  const nearY=camY+20, farY=camY+MAX_VIEW;
  const ty0=Math.ceil(nearY/TILE_SZ)*TILE_SZ;
  for(let wy=ty0;wy<farY;wy+=TILE_SZ){
    const dy=wy-camY; if(dy<1) continue;
    const sy=HORIZON+dynCamH*FL/dy;
    if(sy>H+2) continue;
    if(sy<=HORIZON) break;
    const t=(sy-HORIZON)/(H-HORIZON);  // 0=far,1=near
    ctx.strokeStyle=`rgba(255,255,255,${(0.04+t*0.28).toFixed(2)})`;
    ctx.lineWidth=0.6+t*1.8;
    ctx.beginPath(); ctx.moveTo(0,sy); ctx.lineTo(W,sy); ctx.stroke();
  }

  // ── Vertical lines (converge to vanishing point W/2, HORIZON) ───────────
  const nearDy=20;
  const wx0=Math.floor((camX-2200)/TILE_SZ)*TILE_SZ;
  const wx1=Math.ceil((camX+2200)/TILE_SZ)*TILE_SZ;
  ctx.lineWidth=0.7;
  for(let wx=wx0;wx<=wx1;wx+=TILE_SZ){
    const sxN=W/2+(wx-camX)*FL/nearDy;
    const syN=Math.min(H+60,HORIZON+dynCamH*FL/nearDy);
    // Fade lateral lines that are far off-center
    const lateralOffset=Math.abs(wx-camX);
    const alpha=Math.max(0,0.22-lateralOffset/18000);
    if(alpha<=0) continue;
    ctx.strokeStyle=`rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.beginPath(); ctx.moveTo(sxN,syN); ctx.lineTo(W/2,HORIZON); ctx.stroke();
  }

  // World border walls
  drawWalls();
}

function drawWalls() {
  const WH=420; // wall height in world units
  function sc(wx,wy,wh){ const p=project(wx,wy,wh); return p?[p.sx,p.sy]:null; }
  function wallFace(bl,br,tr,tl,topC,botC) {
    if(!bl||!br||!tr||!tl) return;
    const allY=[bl[1],br[1],tr[1],tl[1]];
    const minY=Math.min(...allY), maxY=Math.max(...allY);
    if(maxY<HORIZON) return;
    const g=ctx.createLinearGradient(0,Math.max(HORIZON,minY),0,Math.min(H+200,maxY));
    g.addColorStop(0,topC); g.addColorStop(1,botC);
    ctx.beginPath();
    ctx.moveTo(bl[0],bl[1]); ctx.lineTo(br[0],br[1]);
    ctx.lineTo(tr[0],tr[1]); ctx.lineTo(tl[0],tl[1]);
    ctx.closePath(); ctx.fillStyle=g; ctx.fill();
    ctx.strokeStyle='rgba(255,80,80,0.8)'; ctx.lineWidth=3; ctx.stroke();
  }
  const ny=camY+3, fy=Math.min(WORLD,camY+MAX_VIEW);
  // Far wall (y = WORLD)
  if(WORLD-camY>0&&WORLD-camY<MAX_VIEW)
    wallFace(sc(0,WORLD,0),sc(WORLD,WORLD,0),sc(WORLD,WORLD,WH),sc(0,WORLD,WH),'#DD5555','#881111');
  // Left wall (x = 0)
  wallFace(sc(0,ny,0),sc(0,fy,0),sc(0,fy,WH),sc(0,ny,WH),'#CC4444','#771111');
  // Right wall (x = WORLD)
  wallFace(sc(WORLD,ny,0),sc(WORLD,fy,0),sc(WORLD,fy,WH),sc(WORLD,ny,WH),'#CC4444','#771111');
}

// ── Food (3D glowing sphere) ─────────────────────────────────────────────────
function drawFood3D(f) {
  const p=project(f.x,f.y,f.r);
  if(!p) return;
  const sr=f.r*p.scale;
  if(sr<1.5) return;
  if(p.sx<-sr*2||p.sx>W+sr*2||p.sy<HORIZON) return;

  // Shadow
  ctx.save(); ctx.scale(1,0.3);
  ctx.beginPath(); ctx.arc(p.sx,(p.sy+sr*0.12)/0.3,sr*0.7,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fill(); ctx.restore();

  // Sphere with glow
  const g=ctx.createRadialGradient(p.sx-sr*0.3,p.sy-sr*0.36,0,p.sx,p.sy,sr);
  g.addColorStop(0,'rgba(255,255,255,0.9)');
  g.addColorStop(0.22,lighten(f.color,0.55));
  g.addColorStop(0.6,f.color);
  g.addColorStop(1,darken(f.color,0.5));
  ctx.save();
  ctx.shadowColor=f.color; ctx.shadowBlur=sr*2.5;
  ctx.beginPath(); ctx.arc(p.sx,p.sy,sr,0,Math.PI*2);
  ctx.fillStyle=g; ctx.fill(); ctx.restore();

  // Specular
  const sg=ctx.createRadialGradient(p.sx-sr*0.28,p.sy-sr*0.34,0,p.sx-sr*0.28,p.sy-sr*0.34,sr*0.45);
  sg.addColorStop(0,'rgba(255,255,255,0.88)'); sg.addColorStop(1,'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(p.sx,p.sy,sr,0,Math.PI*2); ctx.fillStyle=sg; ctx.fill();
}

// ── Wobbly slime path ─────────────────────────────────────────────────────────
function blobPath(sx, sy, srx, sry, phase) {
  const N=20;
  ctx.beginPath();
  for(let i=0;i<=N;i++){
    const a=(i/N)*Math.PI*2;
    const w=1+Math.sin(a*3+phase)*0.12
              +Math.cos(a*2-phase*0.6)*0.08
              +Math.sin(a*4+phase*1.4)*0.04
              +Math.cos(a*6-phase*0.9)*0.025;
    const px=sx+Math.cos(a)*srx*w;
    const py=sy+Math.sin(a)*sry*w;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath();
}

// ── Dome (3D slime blob in perspective) ──────────────────────────────────────
function drawDome(sx, sy, sr, ci, fi, isKing, name, num, showLabel, phase) {
  const col=COLORS[ci];
  if(sr<3) return;
  const p=phase||0;
  const srx=sr*1.52, sry=sr*0.60; // very wide and flat — proper slime puddle shape

  // Ground oval shadow (wide flat)
  ctx.save(); ctx.scale(1,0.18);
  ctx.beginPath(); ctx.ellipse(sx,(sy+sry*0.95)/0.18,srx*0.9,srx*0.22,0,0,Math.PI*2);
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fill(); ctx.restore();

  // Slime drip at bottom
  if(sr>12){
    const dripX=sx+Math.sin(p*0.4)*srx*0.18;
    const dripW=srx*0.18, dripH=sry*0.55;
    const dg=ctx.createLinearGradient(dripX,sy+sry*0.5,dripX,sy+sry+dripH);
    dg.addColorStop(0,col.fill); dg.addColorStop(1,darken(col.fill,0.28));
    ctx.beginPath();
    ctx.moveTo(dripX-dripW,sy+sry*0.6);
    ctx.lineTo(dripX+dripW,sy+sry*0.6);
    ctx.quadraticCurveTo(dripX+dripW*0.7,sy+sry+dripH,dripX,sy+sry+dripH);
    ctx.quadraticCurveTo(dripX-dripW*0.7,sy+sry+dripH,dripX-dripW,sy+sry*0.6);
    ctx.closePath(); ctx.fillStyle=dg; ctx.fill();
  }

  // Phong diffuse — directional light top-left
  const lx=sx-srx*0.36, ly=sy-sry*0.5;
  const gr=ctx.createRadialGradient(lx,ly,0,sx,sy-sry*0.08,Math.max(srx,sry)*1.05);
  gr.addColorStop(0,   'rgba(255,255,255,0.88)');
  gr.addColorStop(0.16,lighten(col.fill,0.58));
  gr.addColorStop(0.44,col.fill);
  gr.addColorStop(0.76,darken(col.fill,0.46));
  gr.addColorStop(1,   darken(col.fill,0.72));
  blobPath(sx,sy,srx,sry,p); ctx.fillStyle=gr; ctx.fill();

  // Dark rim
  ctx.lineWidth=Math.max(1.5,sr*0.04);
  ctx.strokeStyle=darken(col.fill,0.55); ctx.stroke();

  // Specular bloom
  const sg=ctx.createRadialGradient(sx-srx*0.32,sy-sry*0.44,0,sx-srx*0.32,sy-sry*0.44,Math.max(srx,sry)*0.62);
  sg.addColorStop(0,  'rgba(255,255,255,0.85)');
  sg.addColorStop(0.4,'rgba(255,255,255,0.3)');
  sg.addColorStop(1,  'rgba(255,255,255,0)');
  blobPath(sx,sy,srx,sry,p); ctx.fillStyle=sg; ctx.fill();

  // Specular point
  if(sr>8){ ctx.beginPath(); ctx.arc(sx-srx*0.26,sy-sry*0.38,sr*0.14,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.fill(); }

  // Bounce light (cool tint bottom)
  const bl=ctx.createRadialGradient(sx,sy,Math.max(srx,sry)*0.68,sx,sy,Math.max(srx,sry));
  bl.addColorStop(0,'rgba(100,200,255,0)'); bl.addColorStop(1,'rgba(100,200,255,0.2)');
  blobPath(sx,sy,srx,sry,p); ctx.fillStyle=bl; ctx.fill();

  // Face
  if(sr>22){
    ctx.save(); blobPath(sx,sy,srx*0.97,sry*0.97,p); ctx.clip();
    drawFace(ctx,sx,sy-sry*0.06,Math.min(srx,sry)*0.9,fi); ctx.restore();
  }

  // Power number above head (ALL blobs)
  if(sr>9){
    const powerText=fmt(num);
    const fs=Math.max(9,Math.min(sr*0.34,38));
    ctx.font=`bold ${fs}px monospace`;
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    const ty=sy-sry-5;
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillText(powerText,sx+1.5,ty+1.5);
    ctx.fillStyle='#FFD700'; ctx.fillText(powerText,sx,ty);
  }

  // Name above power (player blobs only)
  if(showLabel&&sr>16){
    const nfs=Math.max(9,Math.min(sr*0.24,17));
    const powerH=Math.max(9,Math.min(sr*0.34,38));
    ctx.font=`bold ${nfs}px monospace`;
    ctx.textBaseline='bottom';
    const ty=sy-sry-5-powerH-2;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillText(name,sx+1,ty+1);
    ctx.fillStyle='#fff'; ctx.fillText(name,sx,ty);
  }

  if(isKing) drawCrown(ctx,sx,sy,sr);
}

// ── Face ──────────────────────────────────────────────────────────────────────
function drawFace(cx,bx,by,r,fi) {
  if(r<12) return;
  const s=r*0.38;
  cx.save(); cx.translate(bx,by);
  switch(fi){
    case 0:
      cx.fillStyle='#111';
      cx.beginPath();cx.arc(-s*0.5,-s*0.3,s*0.18,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc( s*0.5,-s*0.3,s*0.18,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc(0,s*0.18,s*0.58,0.12,Math.PI-0.12);
      cx.strokeStyle='#111';cx.lineWidth=s*0.14;cx.stroke();
      break;
    case 1:
      cx.fillStyle='#111';
      rrect(cx,-s*0.92,-s*0.48,s*0.76,s*0.31,4);cx.fill();
      rrect(cx, s*0.16,-s*0.48,s*0.76,s*0.31,4);cx.fill();
      cx.strokeStyle='#777';cx.lineWidth=1.5;
      rrect(cx,-s*0.92,-s*0.48,s*0.76,s*0.31,4);cx.stroke();
      rrect(cx, s*0.16,-s*0.48,s*0.76,s*0.31,4);cx.stroke();
      cx.beginPath();cx.moveTo(-s*0.3,s*0.32);cx.lineTo(s*0.3,s*0.18);
      cx.strokeStyle='#111';cx.lineWidth=s*0.13;cx.stroke();
      break;
    case 2:
      cx.fillStyle='#111';
      cx.beginPath();cx.arc(-s*0.5,-s*0.25,s*0.18,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc( s*0.5,-s*0.25,s*0.18,0,Math.PI*2);cx.fill();
      cx.strokeStyle='#111';cx.lineWidth=s*0.15;
      cx.beginPath();cx.moveTo(-s*0.85,-s*0.55);cx.lineTo(-s*0.1,-s*0.35);cx.stroke();
      cx.beginPath();cx.moveTo( s*0.85,-s*0.55);cx.lineTo( s*0.1,-s*0.35);cx.stroke();
      cx.beginPath();cx.arc(0,s*0.32,s*0.44,Math.PI+0.18,Math.PI*2-0.18);cx.stroke();
      break;
    case 3:
      cx.fillStyle='#111';
      cx.beginPath();cx.arc(-s*0.5,-s*0.3,s*0.23,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc( s*0.5,-s*0.3,s*0.23,0,Math.PI*2);cx.fill();
      cx.fillStyle='#fff';
      cx.beginPath();cx.arc(-s*0.5,-s*0.3,s*0.1,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc( s*0.5,-s*0.3,s*0.1,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.ellipse(0,s*0.28,s*0.26,s*0.38,0,0,Math.PI*2);
      cx.fillStyle='#333';cx.fill();
      break;
    case 4:
      cx.fillStyle='#111';
      cx.beginPath();cx.arc(-s*0.5,-s*0.3,s*0.18,0,Math.PI*2);cx.fill();
      cx.strokeStyle='#111';cx.lineWidth=s*0.14;
      cx.beginPath();cx.moveTo(s*0.22,-s*0.3);cx.lineTo(s*0.78,-s*0.3);cx.stroke();
      cx.beginPath();cx.arc(0,s*0.18,s*0.58,0.12,Math.PI-0.12);cx.stroke();
      break;
    case 5:
      cx.fillStyle='#111';
      cx.beginPath();cx.arc(-s*0.5,-s*0.3,s*0.18,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc( s*0.5,-s*0.3,s*0.18,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc(0,s*0.68,s*0.52,Math.PI+0.22,Math.PI*2-0.22);
      cx.strokeStyle='#111';cx.lineWidth=s*0.13;cx.stroke();
      cx.beginPath();cx.ellipse(-s*0.48,s*0.02,s*0.08,s*0.16,0,0,Math.PI*2);
      cx.fillStyle='rgba(90,180,255,0.85)';cx.fill();
      break;
    case 6:
      cx.strokeStyle='#111';cx.lineWidth=s*0.14;
      cx.beginPath();
      for(let xi=-s*0.5;xi<=s*0.5;xi+=1){
        const yi=-s*0.3+Math.sin(xi*4/s)*s*0.1;
        if(xi===-s*0.5)cx.moveTo(xi,yi);else cx.lineTo(xi,yi);
      }
      cx.stroke();
      cx.fillStyle='#111';cx.beginPath();cx.arc(s*0.5,-s*0.3,s*0.18,0,Math.PI*2);cx.fill();
      cx.beginPath();cx.arc(0,s*0.22,s*0.56,0.1,Math.PI-0.1);
      cx.strokeStyle='#111';cx.lineWidth=s*0.13;cx.stroke();
      cx.fillStyle='#fff';cx.fillRect(-s*0.12,s*0.22,s*0.24,s*0.34);
      cx.strokeStyle='#111';cx.lineWidth=1.5;cx.strokeRect(-s*0.12,s*0.22,s*0.24,s*0.34);
      break;
    case 7:
      cx.strokeStyle='#111';cx.lineWidth=s*0.13;
      cx.beginPath();cx.arc(-s*0.5,-s*0.22,s*0.2,Math.PI,Math.PI*2);cx.stroke();
      cx.beginPath();cx.arc( s*0.5,-s*0.22,s*0.2,Math.PI,Math.PI*2);cx.stroke();
      cx.beginPath();cx.arc(0,s*0.3,s*0.45,0.1,Math.PI-0.1);cx.stroke();
      cx.fillStyle='rgba(180,180,255,0.9)';
      cx.font=`bold ${s*0.44}px monospace`;cx.textAlign='left';cx.textBaseline='middle';
      cx.fillText('z',s*0.65,-s*0.52);
      cx.font=`bold ${s*0.28}px monospace`;cx.fillText('z',s*0.94,-s*0.8);
      break;
  }
  cx.restore();
}

function rrect(cx,x,y,w,h,r){
  cx.beginPath();cx.moveTo(x+r,y);
  cx.lineTo(x+w-r,y);cx.arcTo(x+w,y,x+w,y+r,r);
  cx.lineTo(x+w,y+h-r);cx.arcTo(x+w,y+h,x+w-r,y+h,r);
  cx.lineTo(x+r,y+h);cx.arcTo(x,y+h,x,y+h-r,r);
  cx.lineTo(x,y+r);cx.arcTo(x,y,x+r,y,r);cx.closePath();
}

// ── Crown ─────────────────────────────────────────────────────────────────────
function drawCrown(cx,bx,by,r) {
  const cw=r*0.92, ch=r*0.46;
  const ox=bx-cw/2, oy=by-r-ch-r*0.08;
  cx.save();
  cx.beginPath();
  cx.moveTo(ox,oy+ch); cx.lineTo(ox,oy+ch*0.26);
  cx.lineTo(ox+cw*0.25,oy+ch*0.6);
  cx.lineTo(ox+cw*0.5,oy);
  cx.lineTo(ox+cw*0.75,oy+ch*0.6);
  cx.lineTo(ox+cw,oy+ch*0.26); cx.lineTo(ox+cw,oy+ch);
  cx.closePath();
  const cg=cx.createLinearGradient(ox,oy,ox+cw,oy+ch);
  cg.addColorStop(0,'#FFEE88');cg.addColorStop(0.35,'#FFD700');
  cg.addColorStop(0.65,'#CC9900');cg.addColorStop(1,'#886600');
  cx.fillStyle=cg; cx.fill();
  cx.strokeStyle='#7A5500'; cx.lineWidth=Math.max(1.5,r*0.03); cx.stroke();
  gem3d(cx,ox+cw*0.5,oy+ch*0.2,r*0.1,'#FF2222','#FF9999');
  gem3d(cx,ox+cw*0.12,oy+ch*0.72,r*0.08,'#BB22EE','#EE88FF');
  gem3d(cx,ox+cw*0.88,oy+ch*0.72,r*0.08,'#2244EE','#88AAFF');
  cx.restore();
}

function gem3d(cx,gx,gy,gr,base,hi) {
  const g=cx.createRadialGradient(gx-gr*0.3,gy-gr*0.35,0,gx,gy,gr);
  g.addColorStop(0,hi); g.addColorStop(0.5,base); g.addColorStop(1,darken(base,0.55));
  cx.beginPath(); cx.arc(gx,gy,gr,0,Math.PI*2); cx.fillStyle=g; cx.fill();
  cx.beginPath(); cx.arc(gx-gr*0.25,gy-gr*0.3,gr*0.35,0,Math.PI*2);
  cx.fillStyle='rgba(255,255,255,0.7)'; cx.fill();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function hudBox(x,y,w,h,r){
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill();
}

function drawHUD() {
  // Kills
  const kh=gameMode===2?64:40;
  hudBox(14,14,175,kh,10);
  ctx.font='bold 17px monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillStyle='#FFD700';
  ctx.fillText(`☠ Kills: ${kills[0]}`,22,20);
  if(gameMode===2) ctx.fillText(`☠ P2 Kills: ${kills[1]}`,22,44);

  // Leaderboard
  const allB=[...players,...bots].filter(e=>!e.dead).sort((a,b)=>b.num-a.num).slice(0,10);
  const lbW=215, lbH=26+allB.length*22;
  const lbX=W-lbW-14;
  hudBox(lbX,14,lbW,lbH,10);
  ctx.font='bold 13px monospace'; ctx.textAlign='center'; ctx.fillStyle='#FFD700'; ctx.textBaseline='top';
  ctx.fillText('🏆 TOP',lbX+lbW/2,20);
  ctx.font='12px monospace';
  for(let i=0;i<allB.length;i++){
    const e=allB[i];
    ctx.fillStyle=!e.isBot?'#88FF88':'#ccc';
    ctx.textAlign='left';  ctx.fillText(`${i+1}. ${e.name}`,lbX+8,42+i*22);
    ctx.textAlign='right'; ctx.fillText(fmt(e.num),lbX+lbW-8,42+i*22);
  }

  // Score
  if(!players[0].dead){
    const sc='💰 '+fmt(players[0].num);
    ctx.font='bold 20px monospace'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    const tw=ctx.measureText(sc).width+28;
    hudBox(W/2-tw/2,H-58,tw,42,12);
    ctx.fillStyle='#FFD700'; ctx.fillText(sc,W/2,H-20);
  }
}
