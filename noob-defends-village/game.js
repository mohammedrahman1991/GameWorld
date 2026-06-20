'use strict';
// ================================================================
// NOOB DEFENDS THE VILLAGE
// ================================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 900;
canvas.height = 600;

function resize() {
  const s = Math.min(window.innerWidth / 900, window.innerHeight / 600);
  canvas.style.width  = Math.floor(900 * s) + 'px';
  canvas.style.height = Math.floor(600 * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

// ── Input ──────────────────────────────────────────────────────
const keys = {};
const mouse = { x: 450, y: 300, down: false, right: false };
let clickFrame = false, rClickFrame = false, eFrame = false;

window.addEventListener('keydown', e => {
  if (!keys[e.code]) { keys[e.code] = true; if (e.code === 'KeyE') eFrame = true; }
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (900 / r.width);
  mouse.y = (e.clientY - r.top)  * (600 / r.height);
});
canvas.addEventListener('mousedown', e => {
  if (e.button === 0) { mouse.down = true;  clickFrame  = true; }
  if (e.button === 2) { mouse.right = true; rClickFrame = true; }
});
canvas.addEventListener('mouseup', e => {
  if (e.button === 0) mouse.down  = false;
  if (e.button === 2) mouse.right = false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// Touch: two-finger tap = place block
let lastTouchCount = 0;
canvas.addEventListener('touchstart', e => {
  const r = canvas.getBoundingClientRect();
  if (e.touches.length >= 2) {
    const t = e.touches[0];
    mouse.x = (t.clientX - r.left) * (900 / r.width);
    mouse.y = (t.clientY - r.top)  * (600 / r.height);
    rClickFrame = true;
  } else if (e.touches.length === 1) {
    const t = e.touches[0];
    mouse.x = (t.clientX - r.left) * (900 / r.width);
    mouse.y = (t.clientY - r.top)  * (600 / r.height);
    clickFrame = true; mouse.down = true;
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', e => { mouse.down = false; }, { passive: false });

// ── Constants ──────────────────────────────────────────────────
const W = 900, H = 600, CX = 450, CY = 300;

const WEAPONS = [
  { id:'wood',    name:'Wood Sword',     cost:0, dmg:1,  range:50, color:'#c8a464', enc:false },
  { id:'stone',   name:'Stone Sword',    cost:1, dmg:3,  range:55, color:'#aaaaaa', enc:false },
  { id:'iron',    name:'Iron Sword',     cost:2, dmg:5,  range:58, color:'#d8d8d8', enc:false },
  { id:'gold',    name:'Golden Sword',   cost:3, dmg:7,  range:58, color:'#ffd700', enc:false },
  { id:'diamond', name:'Diamond Sword',  cost:5, dmg:10, range:62, color:'#4db8c4', enc:false },
  { id:'enchant', name:'Enchanted Sword',cost:8, dmg:15, range:68, color:'#c77dff', enc:true  },
];

const ARMOR_TIERS = [
  { id:'leather', name:'Leather', cost:1, def:1, color:'#8B5E3C' },
  { id:'iron',    name:'Iron',    cost:2, def:2, color:'#b0b0b0' },
  { id:'diamond', name:'Diamond', cost:4, def:4, color:'#3bcce0' },
];
const SLOTS = ['Helmet','Chestplate','Leggings','Boots'];

const SHOP_ITEMS = [];
WEAPONS.forEach((w,i) => SHOP_ITEMS.push({ type:'weapon', wi:i, ...w }));
ARMOR_TIERS.forEach(t => SLOTS.forEach((s,si) =>
  SHOP_ITEMS.push({ type:'armor', tier:t.id, slot:si, name:t.name+' '+s, cost:t.cost, def:t.def, color:t.color })
));

// Yellow carpets in hub room
const LCARPET = { x:230, y:310, w:85, h:60, label:'FIGHT!', color:'#f5d800' };
const RCARPET = { x:590, y:310, w:85, h:60, label:'SHOP',   color:'#f5d800' };

const VIL_SLOTS = [
  { x:280, y:200 }, { x:620, y:200 },
  { x:210, y:460 }, { x:690, y:460 },
];

// ── Pregenerate stars ──────────────────────────────────────────
const STARS = Array.from({ length:70 }, () => ({
  x: Math.floor(Math.random()*900),
  y: Math.floor(Math.random()*200),
  sz: Math.random() < 0.7 ? 1 : 2,
}));

// ── State ──────────────────────────────────────────────────────
let STATE = 'TITLE';
let frame = 0;
let loadPct = 0, loadTmr = 0, tipIdx = 0;
let shopSel = 0;
let clearTimer = 0;
let wave = 1;
let waveMobs = [], waveSpawnTimer = 0, waveState = 'idle';
let dayTimer = 0;
const DAY_LEN = 5400; // 90 s at 60 fps

const TIPS = [
  'Walk to the LEFT yellow carpet to start FIGHTING!',
  'Walk to the RIGHT yellow carpet to open the SHOP!',
  'Click anywhere to swing your sword at enemies!',
  'Gold coins drop from defeated mobs — walk over them!',
  'Press E to check your inventory!',
  'Creepers EXPLODE when they get close — run away!',
  'Villagers come back alive after each wave is cleared!',
  'Two-finger tap (mobile) or right-click to place blocks!',
];

// ── Player ──────────────────────────────────────────────────────
const player = {
  x: CX, y: 460,
  hp: 20, maxHp: 20,
  gold: 15,
  weaponIdx: 0,
  armor: [-1,-1,-1,-1],
  get defense() { return this.armor.reduce((s,a) => s+(a>=0?ARMOR_TIERS[a].def:0), 0); },
  attackCD: 0, attackAngle: 0, attackProg: 0, isAttacking: false,
  invincible: 0, facing: -Math.PI/2,
};

// ── Placed blocks ──────────────────────────────────────────────
const GRID = 32;
let placedBlocks = new Set(); // "gx,gy" strings → placed wood blocks

// ── Villagers ──────────────────────────────────────────────────
let villagers = [];
function initVillagers() {
  villagers = VIL_SLOTS.map((s,i) => ({
    x: s.x, y: s.y, ox: s.x, oy: s.y,
    alive: true, downTimer: 0,
    wanderAngle: (i/4)*Math.PI*2,
    wanderTimer: 80 + i*55,
    facing: 0,
  }));
}

// ── Enemies / drops / particles ────────────────────────────────
let enemies = [], coins = [], particles = [], floatTexts = [];

// ── Helpers ────────────────────────────────────────────────────
const rnd  = (a,b) => a + Math.random()*(b-a);
const rndI = (a,b) => Math.floor(a + Math.random()*(b-a+1));
const clamp= (v,lo,hi) => Math.max(lo, Math.min(hi, v));
const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const hovering = (x,y,w,h) => mouse.x>x && mouse.x<x+w && mouse.y>y && mouse.y<y+h;

function rr(x,y,w,h,r=4) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function heart(x,y,c) {
  ctx.fillStyle = c; ctx.beginPath();
  ctx.moveTo(x+8,y+4); ctx.bezierCurveTo(x+8,y+1,x+13,y-2,x+13,y+3);
  ctx.bezierCurveTo(x+13,y+8,x+8,y+12,x+8,y+12);
  ctx.bezierCurveTo(x+8,y+12,x+3,y+8,x+3,y+3); ctx.bezierCurveTo(x+3,y-2,x+8,y+1,x+8,y+4);
  ctx.closePath(); ctx.fill();
}

function spawnParts(x,y,color,n=5) {
  for(let i=0;i<n;i++){
    const a=rnd(0,Math.PI*2), s=rnd(1,4);
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rnd(15,35),maxLife:35,color,r:rnd(2,5)});
  }
}
function addFloat(x,y,txt,color='#fff') { floatTexts.push({x,y,txt,color,life:55,vy:-0.9}); }

// ── Day / Night ─────────────────────────────────────────────────
function getDark() {
  const t = (dayTimer % DAY_LEN) / DAY_LEN;
  return Math.max(0, Math.sin(t * Math.PI)); // 0=day peak, 1=night peak
}

// ── Wave helpers ────────────────────────────────────────────────
function buildWave(w) {
  const q = [];
  const z  = 3 + w*2;
  const sk = Math.max(0, (w-1)*2);
  const sp = Math.max(0, (w-2)*2);
  const cr = Math.max(0, (w-3));
  for(let i=0;i<z;i++)  q.push('zombie');
  for(let i=0;i<sk;i++) q.push('skeleton');
  for(let i=0;i<sp;i++) q.push('spider');
  for(let i=0;i<cr;i++) q.push('creeper');
  for(let i=q.length-1;i>0;i--){
    const j=rndI(0,i); [q[i],q[j]]=[q[j],q[i]];
  }
  return q;
}

function spawnEnemy(type) {
  const side = rndI(0,3);
  let x, y;
  switch(side) {
    case 0: x=rnd(50,W-50); y=-20; break;
    case 1: x=W+20;          y=rnd(50,H-50); break;
    case 2: x=rnd(50,W-50); y=H+20; break;
    default: x=-20;           y=rnd(50,H-50); break;
  }
  const T = {
    zombie:   { hp:8,  maxHp:8,  spd:1.0, dmg:1,  gold:2, sz:14, col:'#3a7a3a' },
    skeleton: { hp:12, maxHp:12, spd:1.3, dmg:2,  gold:3, sz:13, col:'#cccccc' },
    spider:   { hp:6,  maxHp:6,  spd:2.0, dmg:1,  gold:1, sz:11, col:'#1a1a1a' },
    creeper:  { hp:10, maxHp:10, spd:1.0, dmg:15, gold:5, sz:14, col:'#2d7a2d', exploding:false, explodeTimer:0 },
  };
  return { x, y, type, ...T[type], vx:0, vy:0, atkTimer:0, id:Math.random() };
}

// ── Start game ─────────────────────────────────────────────────
function startGame() {
  player.x = CX; player.y = 460;
  player.hp = 20; player.maxHp = 20;
  player.gold = 15; player.weaponIdx = 0;
  player.armor = [-1,-1,-1,-1];
  player.attackCD = 0; player.isAttacking = false; player.invincible = 0;
  enemies=[]; coins=[]; particles=[]; floatTexts=[];
  wave=1; waveMobs=[]; waveSpawnTimer=0; waveState='idle';
  shopSel=0; clearTimer=0; placedBlocks=new Set();
  initVillagers();
  STATE = 'HUB';
}

// ── UPDATE ──────────────────────────────────────────────────────
function update() {
  frame++;
  dayTimer++;

  if (STATE === 'HUB')        updateHub();
  if (STATE === 'BATTLE')     updateBattle();
  if (STATE === 'WAVE_CLEAR') { clearTimer++; if(clearTimer>180) returnToHub(); }

  updateParticles();
  updateFloats();
  if (STATE === 'BATTLE' || STATE === 'HUB') updateCoins();
}

function movePlayer(spd) {
  let vx=0, vy=0;
  if (keys['KeyW']||keys['ArrowUp'])    vy=-spd;
  if (keys['KeyS']||keys['ArrowDown'])  vy= spd;
  if (keys['KeyA']||keys['ArrowLeft'])  vx=-spd;
  if (keys['KeyD']||keys['ArrowRight']) vx= spd;
  if (vx && vy) { vx*=0.707; vy*=0.707; }
  player.x += vx; player.y += vy;
  player.facing = Math.atan2(mouse.y - player.y, mouse.x - player.x);
}

function updateHub() {
  movePlayer(3.0);
  player.x = clamp(player.x, 70, W-70);
  player.y = clamp(player.y, 250, H-40);

  villagers.forEach(v => {
    if (!v.alive) { v.downTimer--; if(v.downTimer<=0) v.alive=true; return; }
    v.wanderTimer--;
    if (v.wanderTimer <= 0) {
      v.wanderAngle += rnd(-0.8, 0.8);
      v.wanderTimer = rndI(80,220);
    }
    v.x = clamp(v.x + Math.cos(v.wanderAngle)*0.35, v.ox-45, v.ox+45);
    v.y = clamp(v.y + Math.sin(v.wanderAngle)*0.35, v.oy-35, v.oy+35);
    v.facing = v.wanderAngle;
  });

  if (eFrame || isOnCarpetCenter(LCARPET)) {
    if (isNearCarpet(LCARPET)) { startBattle(); return; }
  }
  if (eFrame || isOnCarpetCenter(RCARPET)) {
    if (isNearCarpet(RCARPET)) { STATE = 'SHOP'; return; }
  }
  if (eFrame && STATE === 'HUB') { STATE = 'INVENTORY'; eFrame = false; }
}

function isNearCarpet(c) {
  return Math.hypot(player.x-(c.x+c.w/2), player.y-(c.y+c.h/2)) < 80;
}
function isOnCarpetCenter(c) {
  return player.x>c.x+10 && player.x<c.x+c.w-10 && player.y>c.y+10 && player.y<c.y+c.h-10;
}

function startBattle() {
  player.x = CX; player.y = H - 80;
  enemies=[]; coins=[]; placedBlocks=new Set();
  waveMobs = buildWave(wave);
  waveSpawnTimer = 60;
  waveState = 'spawning';
  STATE = 'BATTLE';
}

function returnToHub() {
  STATE = 'HUB';
  player.x = CX; player.y = 460;
  villagers.forEach(v => { v.alive=true; v.downTimer=0; });
  wave++;
  clearTimer = 0;
  enemies = []; placedBlocks=new Set();
}

function updateBattle() {
  movePlayer(3.2);
  player.x = clamp(player.x, 20, W-20);
  player.y = clamp(player.y, 20, H-20);

  if (player.attackCD > 0) player.attackCD--;

  if (clickFrame && player.attackCD === 0) doAttack();
  if (player.isAttacking) { player.attackProg += 0.13; if(player.attackProg>=1) player.isAttacking=false; }
  if (player.invincible > 0) player.invincible--;

  // Block placement / removal (right click)
  if (rClickFrame) {
    const gx = Math.floor(mouse.x / GRID);
    const gy = Math.floor(mouse.y / GRID);
    const k = `${gx},${gy}`;
    if (placedBlocks.has(k)) placedBlocks.delete(k);
    else placedBlocks.add(k);
  }

  // Spawn enemies
  if (waveState === 'spawning') {
    waveSpawnTimer--;
    if (waveSpawnTimer <= 0 && waveMobs.length > 0) {
      enemies.push(spawnEnemy(waveMobs.shift()));
      waveSpawnTimer = Math.max(22, 65 - wave*4);
    }
    if (waveMobs.length === 0) waveState = 'fighting';
  }

  enemies = enemies.filter(e => e.hp > 0);
  enemies.forEach(updateEnemy);

  if (waveState === 'fighting' && enemies.length === 0 && waveMobs.length === 0) {
    villagers.forEach((v,i) => { if(i<2) { v.alive=false; v.downTimer=rndI(60,110); } });
    waveState = 'idle';
    STATE = 'WAVE_CLEAR';
    clearTimer = 0;
  }
}

function doAttack() {
  player.isAttacking = true;
  player.attackAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  player.attackProg = 0;
  player.attackCD = 16;
  const w = WEAPONS[player.weaponIdx];
  enemies.forEach(e => {
    const dx = e.x - player.x, dy = e.y - player.y;
    const d = Math.hypot(dx,dy);
    if (d > w.range + e.sz) return;
    let diff = Math.atan2(dy,dx) - player.attackAngle;
    while(diff >  Math.PI) diff -= Math.PI*2;
    while(diff < -Math.PI) diff += Math.PI*2;
    if (Math.abs(diff) < 1.05) {
      e.hp -= w.dmg;
      spawnParts(e.x, e.y, e.type==='skeleton'?'#ccc':'#f44', 4);
      addFloat(e.x, e.y-20, '-'+w.dmg, '#f00');
      if (e.hp <= 0) killEnemy(e);
    }
  });
}

function updateEnemy(e) {
  const dx = player.x - e.x, dy = player.y - e.y;
  const d  = Math.hypot(dx, dy);

  if (e.type === 'creeper') {
    if (d < 70 && !e.exploding) e.exploding = true;
    if (e.exploding) {
      e.explodeTimer++;
      if (e.explodeTimer > 45) {
        spawnParts(e.x, e.y, '#f80', 20);
        spawnParts(e.x, e.y, '#ff0', 12);
        addFloat(e.x, e.y-20, 'BOOM!', '#f80');
        if (d < 90) takeDmg(e.dmg);
        e.hp = 0; return;
      }
    }
  }

  if (d > (e.sz + 10)) {
    const nx = dx/d, ny = dy/d;
    let nvx = nx * e.spd, nvy = ny * e.spd;
    // Simple block collision
    const ngx = Math.floor((e.x + nvx*4) / GRID);
    const ngy = Math.floor((e.y + nvy*4) / GRID);
    if (!placedBlocks.has(`${ngx},${ngy}`)) {
      e.vx = nvx; e.vy = nvy;
    } else {
      // Try sliding
      const nx2 = Math.floor((e.x + nvx*4) / GRID);
      const ny2 = Math.floor(e.y / GRID);
      if (!placedBlocks.has(`${nx2},${ny2}`)) e.vx = nvx, e.vy = 0;
      else e.vx = 0, e.vy = nvy;
    }
    e.x += e.vx; e.y += e.vy;
  } else if (e.type !== 'creeper') {
    e.atkTimer++;
    if (e.atkTimer > 55) { e.atkTimer = 0; takeDmg(e.dmg); }
  } else {
    e.vx = 0; e.vy = 0;
  }
}

function takeDmg(raw) {
  if (player.invincible > 0) return;
  const dmg = Math.max(1, raw - player.defense);
  player.hp -= dmg;
  player.invincible = 50;
  spawnParts(player.x, player.y, '#f00', 6);
  addFloat(player.x, player.y-25, '-'+dmg, '#f44');
  if (player.hp <= 0) { player.hp=0; STATE='GAME_OVER'; }
}

function killEnemy(e) {
  spawnParts(e.x, e.y, '#f44', 8);
  coins.push({ x:e.x+rnd(-10,10), y:e.y+rnd(-10,10), value:e.gold, life:220, vy:rnd(-2,0), vx:rnd(-1,1) });
  addFloat(e.x, e.y-14, '+'+e.gold+'g', '#ffd700');
  e.hp = 0;
}

function updateCoins() {
  coins.forEach(c => {
    c.life--; c.vy = Math.min(c.vy+0.1, 0); c.x += c.vx; c.y += c.vy;
    if (dist(c, player) < 28) { player.gold += c.value; c.life=0; }
  });
  coins = coins.filter(c => c.life > 0);
}

function updateParticles() {
  particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.vx*=0.92; p.life--; });
  particles = particles.filter(p => p.life > 0);
}
function updateFloats() {
  floatTexts.forEach(t => { t.y+=t.vy; t.life--; });
  floatTexts = floatTexts.filter(t => t.life > 0);
}

// ── DRAW: Hub Room ──────────────────────────────────────────────
function drawHubRoom() {
  // Stone cobblestone floor
  for (let tx=0; tx<W; tx+=32) {
    for (let ty=0; ty<H; ty+=24) {
      ctx.fillStyle = ((Math.floor(tx/32)+Math.floor(ty/24))%2===0) ? '#888' : '#828282';
      ctx.fillRect(tx, ty, 32, 24);
    }
  }
  ctx.strokeStyle='#777'; ctx.lineWidth=1;
  for (let tx=0; tx<W; tx+=32) { ctx.beginPath(); ctx.moveTo(tx,0); ctx.lineTo(tx,H); ctx.stroke(); }
  for (let ty=0; ty<H; ty+=24) { ctx.beginPath(); ctx.moveTo(0,ty); ctx.lineTo(W,ty); ctx.stroke(); }

  // Left wooden wall
  ctx.fillStyle='#9b7040'; ctx.fillRect(0,0,62,H);
  ctx.strokeStyle='#7a5020'; ctx.lineWidth=1.5;
  for (let y=0;y<H;y+=18) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(62,y); ctx.stroke(); }
  ctx.fillStyle='#7a5020'; ctx.fillRect(58,0,6,H);

  // Right wooden wall
  ctx.fillStyle='#9b7040'; ctx.fillRect(W-62,0,62,H);
  for (let y=0;y<H;y+=18) { ctx.beginPath(); ctx.moveTo(W-62,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.fillStyle='#7a5020'; ctx.fillRect(W-64,0,6,H);

  // Back wooden counter (top portion of room)
  ctx.fillStyle='#c8a062'; ctx.fillRect(62,70,W-124,180);
  ctx.strokeStyle='#a07840'; ctx.lineWidth=1;
  for (let x=62;x<W-62;x+=32) { ctx.beginPath(); ctx.moveTo(x,70); ctx.lineTo(x,250); ctx.stroke(); }
  for (let y=70;y<250;y+=16)  { ctx.beginPath(); ctx.moveTo(62,y); ctx.lineTo(W-62,y); ctx.stroke(); }
  ctx.fillStyle='#8B6040'; ctx.fillRect(62,245,W-124,12);

  // Windows in back wall
  drawWindow(160, 80, 130, 100);
  drawWindow(610, 80, 130, 100);

  // SHOP sign on right window area
  ctx.fillStyle='#5a3010'; ctx.fillRect(660,192,50,22);
  ctx.fillStyle='#ffe'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
  ctx.fillText('SHOP',685,208); ctx.textAlign='left';

  // Yellow carpets
  drawCarpet(LCARPET);
  drawCarpet(RCARPET);

  // Prompts when near
  if (isNearCarpet(LCARPET)) drawPrompt(LCARPET.x+LCARPET.w/2, LCARPET.y-10, '[E] GO FIGHT');
  if (isNearCarpet(RCARPET)) drawPrompt(RCARPET.x+RCARPET.w/2, RCARPET.y-10, '[E] SHOP');
}

function drawWindow(x,y,w,h) {
  const sk = ctx.createLinearGradient(x,y,x,y+h);
  sk.addColorStop(0,'#7ec8e3'); sk.addColorStop(0.6,'#b8e0f0');
  sk.addColorStop(0.65,'#5a8a2c'); sk.addColorStop(1,'#4a7a1c');
  ctx.fillStyle=sk; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#ddd'; ctx.lineWidth=5; ctx.strokeRect(x,y,w,h);
  ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w/2,y+h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,y+h/2); ctx.lineTo(x+w,y+h/2); ctx.stroke();
}

function drawCarpet(c) {
  ctx.fillStyle=c.color; ctx.fillRect(c.x,c.y,c.w,c.h);
  ctx.strokeStyle='#c0a000'; ctx.lineWidth=2; ctx.strokeRect(c.x,c.y,c.w,c.h);
  // Pattern
  ctx.strokeStyle='#d8b800'; ctx.lineWidth=1;
  ctx.strokeRect(c.x+4,c.y+4,c.w-8,c.h-8);
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
  ctx.fillText(c.label, c.x+c.w/2, c.y+c.h/2+4); ctx.textAlign='left';
}

function drawPrompt(x,y,text) {
  const tw = ctx.measureText(text).width + 16;
  ctx.fillStyle='rgba(0,0,0,0.78)'; rr(x-tw/2,y-20,tw,22,5); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 11px monospace'; ctx.textAlign='center';
  ctx.fillText(text,x,y-4); ctx.textAlign='left';
}

// ── DRAW: Battle Arena ──────────────────────────────────────────
function drawBattleArena() {
  // Green grass
  ctx.fillStyle='#4a7c25'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#3d6a1f';
  for (let tx=0;tx<W;tx+=32) for (let ty=0;ty<H;ty+=32) {
    ctx.fillRect(tx+6,ty+8,4,4);
    ctx.fillRect(tx+18,ty+22,3,3);
    ctx.fillRect(tx+26,ty+4,3,3);
  }

  // Stone cobblestone path (vertical center)
  for (let ty=0;ty<H;ty+=20) {
    ctx.fillStyle = (Math.floor(ty/20)%2===0) ? '#888' : '#808080';
    ctx.fillRect(CX-22,ty,44,20);
    ctx.strokeStyle='#777'; ctx.lineWidth=1; ctx.strokeRect(CX-22,ty,44,20);
  }
  // Horizontal path
  for (let tx=0;tx<W;tx+=28) {
    ctx.fillStyle = (Math.floor(tx/28)%2===0) ? '#888' : '#808080';
    ctx.fillRect(tx,CY-18,28,36);
    ctx.strokeStyle='#777'; ctx.lineWidth=1; ctx.strokeRect(tx,CY-18,28,36);
  }

  // Left side houses
  drawHouseWoodStone(0, 30, 140, 180);
  drawHouseWoodStone(0, 370, 140, 200);

  // Right side houses
  drawHouseBigWood(W-150, 30, 150, 180);
  drawHouseStoneTower(W-150, 370, 150, 200);

  // Trees
  drawTree(100, 310);
  drawTree(800, 310);
  drawTree(160, 90);
  drawTree(740, 90);
}

// ── House drawing functions ─────────────────────────────────────
function drawHouseWoodStone(x,y,w,h) {
  // Foundation cobblestone
  ctx.fillStyle='#888'; ctx.fillRect(x,y,w,h);
  drawCobbleTexture(x,y,w,h);
  // Wood floor inside
  ctx.fillStyle='#c8a062'; ctx.fillRect(x+10,y+10,w-20,h-20);
  drawPlankTexture(x+10,y+10,w-20,h-20);
  // Dark oak log corners
  ctx.fillStyle='#5a3010';
  ctx.fillRect(x+2,y+2,15,15); ctx.fillRect(x+w-17,y+2,15,15);
  ctx.fillRect(x+2,y+h-17,15,15); ctx.fillRect(x+w-17,y+h-17,15,15);
  // Wall pillars (vertical)
  ctx.fillStyle='#5a3010';
  ctx.fillRect(x+2,y+2,8,h-4); ctx.fillRect(x+w-10,y+2,8,h-4);
  // Windows (top and bottom wall)
  ctx.fillStyle='#aae8ff';
  ctx.fillRect(x+w/2-14,y+2,28,8);  // top
  ctx.fillRect(x+w/2-14,y+h-10,28,8); // bottom
  ctx.strokeStyle='#ddd'; ctx.lineWidth=2;
  ctx.strokeRect(x+w/2-14,y+2,28,8);
  ctx.strokeRect(x+w/2-14,y+h-10,28,8);
}

function drawHouseBigWood(x,y,w,h) {
  ctx.fillStyle='#666'; ctx.fillRect(x,y,w,h);
  drawCobbleTexture(x,y,w,h);
  // Dark wood interior
  ctx.fillStyle='#7a4520'; ctx.fillRect(x+12,y+12,w-24,h-24);
  // Big glass window strip
  ctx.fillStyle='#c8f0ff'; ctx.fillRect(x+22,y+12,w-44,9);
  ctx.fillRect(x+22,y+h-21,w-44,9);
  ctx.strokeStyle='#fff'; ctx.lineWidth=1;
  ctx.strokeRect(x+22,y+12,w-44,9); ctx.strokeRect(x+22,y+h-21,w-44,9);
  // Log pillars
  ctx.fillStyle='#4a2010';
  ctx.fillRect(x+4,y+4,14,h-8); ctx.fillRect(x+w-18,y+4,14,h-8);
  ctx.fillRect(x+4,y+4,w-8,10); ctx.fillRect(x+4,y+h-14,w-8,10);
}

function drawHouseStoneTower(x,y,w,h) {
  ctx.fillStyle='#636363'; ctx.fillRect(x,y,w,h);
  drawCobbleTexture(x,y,w,h);
  // Interior slightly lighter
  ctx.fillStyle='#707070'; ctx.fillRect(x+10,y+10,w-20,h-20);
  drawCobbleTexture(x+10,y+10,w-20,h-20);
  // Battlements on top
  ctx.fillStyle='#555';
  for (let bx=x; bx<x+w; bx+=16) { ctx.fillRect(bx,y-10,12,12); }
  // Small arrow-slit windows
  ctx.fillStyle='#aac8c8';
  ctx.fillRect(x+w/2-4,y+15,8,12);
  ctx.fillRect(x+w/2-4,y+h-27,8,12);
  ctx.strokeStyle='#888'; ctx.lineWidth=1;
  ctx.strokeRect(x+w/2-4,y+15,8,12);
  ctx.strokeRect(x+w/2-4,y+h-27,8,12);
}

function drawCobbleTexture(x,y,w,h) {
  ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1;
  for (let tx=x; tx<x+w; tx+=16) for (let ty=y; ty<y+h; ty+=14) ctx.strokeRect(tx,ty,16,14);
}
function drawPlankTexture(x,y,w,h) {
  ctx.strokeStyle='rgba(100,60,0,0.3)'; ctx.lineWidth=1;
  for (let ty=y; ty<y+h; ty+=10) { ctx.beginPath(); ctx.moveTo(x,ty); ctx.lineTo(x+w,ty); ctx.stroke(); }
  for (let tx=x; tx<x+w; tx+=24) { ctx.beginPath(); ctx.moveTo(tx,y); ctx.lineTo(tx,y+h); ctx.stroke(); }
}

function drawTree(x,y) {
  ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x+4,y+4,22,18,0.2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#2d6b10'; ctx.beginPath(); ctx.arc(x,y,22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#3a8018'; ctx.beginPath(); ctx.arc(x-4,y-5,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#4a9020'; ctx.beginPath(); ctx.arc(x+2,y-9,10,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#5a3010'; ctx.fillRect(x-4,y-3,8,8);
}

// ── DRAW: Placed Blocks ─────────────────────────────────────────
function drawPlacedBlocks() {
  placedBlocks.forEach(key => {
    const [gx,gy] = key.split(',').map(Number);
    ctx.fillStyle='#c8a062'; ctx.fillRect(gx*GRID,gy*GRID,GRID,GRID);
    ctx.strokeStyle='#a07840'; ctx.lineWidth=1; ctx.strokeRect(gx*GRID,gy*GRID,GRID,GRID);
    drawPlankTexture(gx*GRID,gy*GRID,GRID,GRID);
  });
}

// ── DRAW: Villager ──────────────────────────────────────────────
function drawVillager(v) {
  const dark = getDark();
  // Warm glow at night (villagers stay lit)
  if (dark > 0.15) {
    const radius = 55;
    const g = ctx.createRadialGradient(v.x,v.y,4,v.x,v.y,radius);
    g.addColorStop(0,`rgba(255,220,100,${dark*0.45})`);
    g.addColorStop(1,'rgba(255,220,100,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(v.x,v.y,radius,0,Math.PI*2); ctx.fill();
  }

  if (!v.alive) {
    // Knocked down
    ctx.save(); ctx.translate(v.x,v.y); ctx.rotate(Math.PI/2); ctx.globalAlpha=0.55;
    ctx.fillStyle='#5a4535'; ctx.fillRect(-8,-5,16,14);
    ctx.fillStyle='#d4956a'; ctx.fillRect(-9,-20,18,15);
    ctx.globalAlpha=1; ctx.restore();
    return;
  }

  const {x,y}=v;
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x,y+12,10,4,0,0,Math.PI*2); ctx.fill();
  // Robe
  ctx.fillStyle='#5a4535'; ctx.fillRect(x-8,y-5,16,14);
  ctx.fillStyle='#4a3525'; ctx.fillRect(x-2,y-5,4,14);
  ctx.fillStyle='#5a4535'; ctx.fillRect(x-12,y-3,5,10); ctx.fillRect(x+7,y-3,5,10);
  // Big villager head
  ctx.fillStyle='#d4956a'; ctx.fillRect(x-9,y-22,18,17);
  // Big nose
  ctx.fillStyle='#c07a50'; ctx.fillRect(x-3,y-13,7,8);
  // Unibrow
  ctx.fillStyle='#3a2810'; ctx.fillRect(x-7,y-20,14,2);
  // Eyes (green irises)
  ctx.fillStyle='#111'; ctx.fillRect(x-7,y-17,4,4); ctx.fillRect(x+3,y-17,4,4);
  ctx.fillStyle='#2d8a2d'; ctx.fillRect(x-6,y-16,2,2); ctx.fillRect(x+4,y-16,2,2);
}

// ── DRAW: Player ────────────────────────────────────────────────
function drawPlayer() {
  const {x,y,isAttacking,attackAngle,attackProg,weaponIdx,facing,invincible}=player;
  const w=WEAPONS[weaponIdx];

  if (invincible>0 && Math.floor(invincible/4)%2===0) ctx.globalAlpha=0.4;

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x,y+12,10,5,0,0,Math.PI*2); ctx.fill();
  // Legs
  ctx.fillStyle='#555'; ctx.fillRect(x-7,y+6,6,10); ctx.fillRect(x+1,y+6,6,10);
  // Body (blue noob shirt)
  ctx.fillStyle='#3355bb'; ctx.fillRect(x-8,y-5,16,13);
  ctx.fillStyle='#2244aa'; ctx.fillRect(x-8,y-5,16,4);
  // Arms
  ctx.fillStyle='#3355bb'; ctx.fillRect(x-13,y-4,6,10); ctx.fillRect(x+7,y-4,6,10);
  // Head
  ctx.fillStyle='#f5c89a'; ctx.fillRect(x-8,y-20,16,16);
  // Hair
  ctx.fillStyle='#5a3010'; ctx.fillRect(x-8,y-20,16,5);
  // Eyes
  ctx.fillStyle='#222'; ctx.fillRect(x-5,y-13,3,3); ctx.fillRect(x+2,y-13,3,3);

  // Sword
  ctx.save(); ctx.translate(x,y);
  if (isAttacking) {
    const swing = (attackProg<0.5)
      ? attackAngle-0.6+attackProg*1.2
      : attackAngle+0.6-(attackProg-0.5)*1.2;
    ctx.rotate(swing);
  } else {
    ctx.rotate(facing+0.4);
  }
  if (w.enc) { ctx.fillStyle='rgba(200,100,255,0.35)'; ctx.fillRect(10,-5,34,10); }
  ctx.fillStyle=w.color; ctx.fillRect(10,-3,w.enc?32:26,6);
  ctx.fillStyle='#8B5E3C'; ctx.fillRect(5,-5,7,10);
  ctx.restore();

  // Attack arc flash
  if (isAttacking && attackProg<0.35) {
    ctx.globalAlpha=0.22; ctx.fillStyle=w.color;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.arc(x,y,w.range,attackAngle-0.95,attackAngle+0.95); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha=1;
}

// ── DRAW: Enemies ───────────────────────────────────────────────
function drawEnemy(e) {
  const {x,y,type,hp,maxHp,sz}=e;
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x,y+sz,sz*0.9,sz*0.3,0,0,Math.PI*2); ctx.fill();

  if (type==='zombie') {
    ctx.fillStyle='#1a3a1a'; ctx.fillRect(x-7,y+7,6,9); ctx.fillRect(x+1,y+7,6,9);
    ctx.fillStyle='#2d6b2d'; ctx.fillRect(x-7,y-4,14,13);
    ctx.fillStyle='#4a9b4a'; ctx.fillRect(x-7,y-18,14,14);
    ctx.fillStyle='#f00'; ctx.fillRect(x-5,y-14,3,3); ctx.fillRect(x+2,y-14,3,3);
    ctx.fillStyle='#1a3a1a'; ctx.fillRect(x-4,y-8,8,2);

  } else if (type==='skeleton') {
    ctx.fillStyle='#aaa'; ctx.fillRect(x-4,y+8,3,9); ctx.fillRect(x+1,y+8,3,9);
    ctx.fillStyle='#ccc'; ctx.fillRect(x-5,y-4,10,12);
    ctx.fillStyle='#aaa'; ctx.fillRect(x-5,y+1,10,2); ctx.fillRect(x-5,y+5,10,2);
    ctx.fillStyle='#ddd'; ctx.fillRect(x-6,y-16,12,12);
    ctx.fillStyle='#333'; ctx.fillRect(x-4,y-13,3,4); ctx.fillRect(x+1,y-13,3,4);
    ctx.strokeStyle='#8B5E3C'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x+10,y-3,9,-0.7,0.7); ctx.stroke();
    ctx.strokeStyle='#ddd'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x+10,y-8); ctx.lineTo(x+10,y+2); ctx.stroke();

  } else if (type==='spider') {
    ctx.strokeStyle='#333'; ctx.lineWidth=2;
    for (let i=0;i<4;i++) {
      const a=(i/4)*Math.PI;
      ctx.beginPath(); ctx.moveTo(x-6,y+2); ctx.lineTo(x+Math.cos(a-0.4)*18-6,y+Math.sin(a-0.4)*10+2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+6,y+2); ctx.lineTo(x+Math.cos(Math.PI-a+0.4)*18+6,y+Math.sin(Math.PI-a+0.4)*10+2); ctx.stroke();
    }
    ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.ellipse(x,y,10,7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.ellipse(x,y-7,6,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f00';
    ctx.beginPath(); ctx.arc(x-3,y-8,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+3,y-8,2,0,Math.PI*2); ctx.fill();

  } else if (type==='creeper') {
    ctx.fillStyle='#1a4a1a'; ctx.fillRect(x-7,y+7,6,8); ctx.fillRect(x+1,y+7,6,8);
    ctx.fillStyle='#2d7a2d'; ctx.fillRect(x-7,y-4,14,13);
    ctx.fillStyle='#1a4a1a'; ctx.fillRect(x-5,y,4,4); ctx.fillRect(x+1,y,4,4);
    ctx.fillStyle='#3a9a3a'; ctx.fillRect(x-8,y-20,16,16);
    ctx.fillStyle='#1a4a1a';
    ctx.fillRect(x-6,y-16,4,4); ctx.fillRect(x+2,y-16,4,4);
    ctx.fillRect(x-4,y-11,8,2); ctx.fillRect(x-5,y-9,2,4); ctx.fillRect(x+3,y-9,2,4);
    if (e.exploding) {
      ctx.globalAlpha=0.3+Math.sin(e.explodeTimer*0.5)*0.3;
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,e.explodeTimer*2.5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
  }

  if (hp < maxHp) {
    ctx.fillStyle='#500'; ctx.fillRect(x-sz,y-sz-7,sz*2,4);
    ctx.fillStyle='#0c0'; ctx.fillRect(x-sz,y-sz-7,sz*2*(hp/maxHp),4);
  }
}

// ── DRAW: Night overlay ─────────────────────────────────────────
function drawNightOverlay() {
  const dark = getDark();
  if (dark < 0.02) return;
  ctx.fillStyle=`rgba(0,0,30,${dark*0.75})`;
  ctx.fillRect(0,0,W,H);
  // Stars
  if (dark > 0.25) {
    ctx.fillStyle=`rgba(255,255,255,${(dark-0.25)*0.8})`;
    STARS.forEach(s => ctx.fillRect(s.x,s.y,s.sz,s.sz));
  }
}

// ── DRAW: Crosshair ─────────────────────────────────────────────
function drawCrosshair() {
  const cx=W/2, cy=H/2;
  ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=2;
  ctx.shadowColor='#000'; ctx.shadowBlur=3;
  ctx.beginPath(); ctx.moveTo(cx-10,cy); ctx.lineTo(cx-3,cy);
  ctx.moveTo(cx+3,cy);  ctx.lineTo(cx+10,cy);
  ctx.moveTo(cx,cy-10); ctx.lineTo(cx,cy-3);
  ctx.moveTo(cx,cy+3);  ctx.lineTo(cx,cy+10);
  ctx.stroke();
  ctx.shadowBlur=0;
}

// ── DRAW: HUD ────────────────────────────────────────────────────
function drawHUD() {
  const mh=player.maxHp/2, ch=player.hp/2;
  for (let i=0;i<mh;i++) heart(12+i*21, 10, i<ch ? '#e03030' : 'rgba(255,255,255,0.15)');
  // Armor row
  for (let i=0;i<4;i++) {
    const ax=14+i*21, ay=30;
    ctx.fillStyle=player.armor[i]>=0?ARMOR_TIERS[player.armor[i]].color:'rgba(255,255,255,0.1)';
    ctx.fillRect(ax,ay,16,13);
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.strokeRect(ax,ay,16,13);
  }

  // Wave badge
  ctx.fillStyle='rgba(0,0,0,0.68)'; rr(CX-62,6,124,30,7); ctx.fill();
  ctx.fillStyle='#ffd700'; ctx.font='bold 11px monospace'; ctx.textAlign='center';
  ctx.fillText('🏆 WAVE '+wave,CX,25); ctx.textAlign='left';

  // Gold
  ctx.fillStyle='rgba(0,0,0,0.68)'; rr(W-108,6,102,30,7); ctx.fill();
  ctx.fillStyle='#ffd700'; ctx.font='bold 13px monospace'; ctx.textAlign='center';
  ctx.fillText('⬤ '+player.gold,W-57,25); ctx.textAlign='left';

  // TAB badge
  ctx.fillStyle='#daa520'; rr(W-58,40,52,28,5); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
  ctx.fillText('TAB',W-32,58); ctx.textAlign='left';

  // Hotbar
  const slots=7, ss=44, hbX=(W-slots*ss)/2, hbY=H-ss-10;
  for (let i=0;i<slots;i++) {
    ctx.fillStyle='rgba(50,50,50,0.88)'; rr(hbX+i*ss,hbY,ss-2,ss-2,4); ctx.fill();
    ctx.strokeStyle=i===0?'#4d4':'#666'; ctx.lineWidth=i===0?3:1;
    rr(hbX+i*ss,hbY,ss-2,ss-2,4); ctx.stroke();
  }
  // Sword slot 0
  const sw=WEAPONS[player.weaponIdx];
  ctx.save(); ctx.translate(hbX+20,hbY+20); ctx.rotate(Math.PI/4);
  ctx.fillStyle=sw.color; ctx.fillRect(-3,-14,6,26);
  ctx.fillStyle='#8B5E3C'; ctx.fillRect(-6,-2,12,5);
  ctx.restore();
  ctx.fillStyle='#ccc'; ctx.font='9px monospace'; ctx.fillText('1',hbX+ss-14,hbY+ss-4);
  // Sand block slot 1
  ctx.fillStyle='#e8c87a'; ctx.fillRect(hbX+ss+6,hbY+6,30,30);
  ctx.strokeStyle='#c8a050'; ctx.lineWidth=2; ctx.strokeRect(hbX+ss+6,hbY+6,30,30);
  ctx.fillStyle='#ccc'; ctx.font='8px monospace'; ctx.fillText('1',hbX+ss+ss-14,hbY+ss-4);
  // Orange block last slot
  ctx.fillStyle='#d2691e'; ctx.fillRect(hbX+6*ss+5,hbY+6,32,30);
  ctx.strokeStyle='#a0522d'; ctx.lineWidth=2; ctx.strokeRect(hbX+6*ss+5,hbY+6,32,30);
  ctx.fillStyle='#ccc'; ctx.font='9px monospace'; ctx.fillText('E',hbX+7*ss-12,hbY+ss-4);

  // HP bar above hotbar
  const bw=slots*ss-2, bx=hbX, by=hbY-16;
  ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx,by,bw,10);
  ctx.fillStyle='#2d2'; ctx.fillRect(bx+1,by+1,(bw-2)*(player.hp/player.maxHp),8);
  ctx.strokeStyle='#555'; ctx.lineWidth=1; ctx.strokeRect(bx,by,bw,10);

  // Wave number label
  ctx.fillStyle='#ffd700'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
  ctx.fillText(wave,CX,by-4); ctx.textAlign='left';

  // Enemies left (battle)
  if (STATE==='BATTLE') {
    const tot=enemies.length+waveMobs.length;
    if (tot>0) {
      ctx.fillStyle='rgba(0,0,0,0.6)'; rr(bx,by-36,145,18,4); ctx.fill();
      ctx.fillStyle='#f44'; ctx.font='bold 10px monospace';
      ctx.fillText('ENEMIES: '+tot,bx+6,by-23);
    }
  }

  // Day/night indicator
  const dark=getDark();
  if (dark>0.1) {
    ctx.fillStyle='rgba(0,0,0,0.6)'; rr(CX-50,40,100,20,5); ctx.fill();
    ctx.fillStyle=dark>0.5?'#aaccff':'#ffcc44'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
    ctx.fillText(dark>0.5?'🌙 NIGHT':'🌅 SUNSET',CX,55); ctx.textAlign='left';
  }
}

// ── DRAW: Shop ──────────────────────────────────────────────────
function drawShop() {
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,W,H);
  const px=175,py=45,pw=550,ph=510;
  ctx.fillStyle='#9a9a9a'; rr(px,py,pw,ph,8); ctx.fill();
  ctx.strokeStyle='#666'; ctx.lineWidth=3; rr(px,py,pw,ph,8); ctx.stroke();

  ctx.fillStyle='#bbb'; rr(px+10,py+10,pw-130,42,6); ctx.fill();
  ctx.fillStyle='#222'; ctx.font='bold 20px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText('SHOP',px+pw/2-50,py+38); ctx.textAlign='left';

  ctx.fillStyle='#bbb'; rr(px+pw-118,py+10,108,42,6); ctx.fill();
  ctx.fillStyle='#ffd700'; ctx.font='bold 15px monospace'; ctx.textAlign='center';
  ctx.fillText('⬤ '+player.gold,px+pw-64,py+37); ctx.textAlign='left';

  // Close X
  ctx.fillStyle=hovering(px+pw-48,py-4,48,48)?'#ff4444':'#cc2222'; rr(px+pw-48,py-4,48,48,8); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 22px monospace'; ctx.textAlign='center';
  ctx.fillText('✕',px+pw-24,py+26); ctx.textAlign='left';

  // Item grid
  const gx=px+12,gy=py+64,cs=54,cols=5;
  SHOP_ITEMS.forEach((item,i)=>{
    const c=i%cols, r=Math.floor(i/cols);
    const ix=gx+c*cs, iy=gy+r*cs;
    ctx.fillStyle=i===shopSel?'#555':'#444'; rr(ix,iy,cs-4,cs-4,4); ctx.fill();
    if (i===shopSel) { ctx.strokeStyle='#8f8'; ctx.lineWidth=2; rr(ix,iy,cs-4,cs-4,4); ctx.stroke(); }
    if (item.type==='weapon') {
      ctx.save(); ctx.translate(ix+25,iy+25); ctx.rotate(Math.PI/4);
      ctx.fillStyle=item.color; ctx.fillRect(-2,-14,5,22);
      ctx.fillStyle='#8B5E3C'; ctx.fillRect(-5,-2,10,4);
      ctx.restore();
    } else {
      ctx.fillStyle=item.color;
      const s=item.slot;
      if(s===0){ ctx.fillRect(ix+11,iy+7,28,18); ctx.fillRect(ix+14,iy+5,8,7); ctx.fillRect(ix+28,iy+5,8,7); }
      else if(s===1){ ctx.fillRect(ix+8,iy+9,34,26); ctx.fillRect(ix+6,iy+15,8,18); ctx.fillRect(ix+36,iy+15,8,18); }
      else if(s===2){ ctx.fillRect(ix+10,iy+5,30,14); ctx.fillRect(ix+9,iy+17,13,22); ctx.fillRect(ix+28,iy+17,13,22); }
      else { ctx.fillRect(ix+9,iy+15,12,20); ctx.fillRect(ix+29,iy+15,12,20); }
    }
    ctx.fillStyle='#ffd700'; ctx.font='bold 8px monospace'; ctx.fillText(item.cost+'g',ix+2,iy+cs-9);
  });

  // Detail panel
  const dx=px+292,dy=py+64,dw=232,dh=310;
  ctx.fillStyle='#555'; rr(dx,dy,dw,dh,6); ctx.fill();
  const sel=SHOP_ITEMS[shopSel];
  if (sel) {
    ctx.save(); ctx.translate(dx+dw/2,dy+55);
    if (sel.type==='weapon') {
      ctx.rotate(Math.PI/4); ctx.fillStyle=sel.color; ctx.fillRect(-5,-28,10,46);
      ctx.fillStyle='#8B5E3C'; ctx.fillRect(-10,-5,20,10);
    } else {
      ctx.fillStyle=sel.color; ctx.fillRect(-26,-26,52,52);
    }
    ctx.restore();
    ctx.fillStyle='#fff'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
    sel.name.split(' ').forEach((wd,i)=>ctx.fillText(wd,dx+dw/2,dy+100+i*16));
    ctx.fillStyle='#ffd700'; ctx.font='bold 13px monospace';
    ctx.fillText('⬤ '+sel.cost+' GOLD',dx+dw/2,dy+155);
    ctx.fillStyle='#fff'; ctx.font='bold 12px monospace';
    ctx.fillText(sel.type==='weapon'?'DAMAGE: '+sel.dmg:'DEFENSE: +'+sel.def,dx+dw/2,dy+178);
    ctx.textAlign='left';
    const can=player.gold>=sel.cost;
    ctx.fillStyle=can?'#3c3':'#666'; rr(dx+20,dy+dh-64,dw-40,44,8); ctx.fill();
    ctx.fillStyle=can?'#fff':'#888'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.fillText('BUY',dx+dw/2,dy+dh-34); ctx.textAlign='left';
  }
}

function handleShopClick() {
  const px=175,py=45,pw=550;
  if (hovering(px+pw-48,py-4,48,48)) { STATE='HUB'; return; }
  const gx=px+12,gy=py+64,cs=54,cols=5;
  SHOP_ITEMS.forEach((item,i)=>{
    const c=i%cols,r=Math.floor(i/cols),ix=gx+c*cs,iy=gy+r*cs;
    if (hovering(ix,iy,cs-4,cs-4)) shopSel=i;
  });
  const dx=px+292,dy=py+64,dw=232,dh=310;
  if (hovering(dx+20,dy+dh-64,dw-40,44)) {
    const sel=SHOP_ITEMS[shopSel];
    if (sel && player.gold>=sel.cost) {
      player.gold-=sel.cost;
      if (sel.type==='weapon') player.weaponIdx=sel.wi;
      else {
        const ti=ARMOR_TIERS.findIndex(t=>t.id===sel.tier);
        if (ti>=0) player.armor[sel.slot]=ti;
      }
      addFloat(CX,CY-30,'Equipped!','#0f0');
    }
  }
}

// ── DRAW: Inventory ─────────────────────────────────────────────
function drawInventory() {
  ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,W,H);
  const px=230,py=80,pw=440,ph=440;
  ctx.fillStyle='#888'; rr(px,py,pw,ph,8); ctx.fill();
  ctx.strokeStyle='#666'; ctx.lineWidth=3; rr(px,py,pw,ph,8); ctx.stroke();

  ctx.fillStyle='#aaa'; rr(px+10,py+10,pw-20,40,6); ctx.fill();
  ctx.fillStyle='#222'; ctx.font='bold 16px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText('INVENTORY',px+pw/2,py+36); ctx.textAlign='left';

  // Close
  ctx.fillStyle=hovering(px+pw-44,py-4,44,44)?'#f44':'#c22'; rr(px+pw-44,py-4,44,44,8); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 20px monospace'; ctx.textAlign='center';
  ctx.fillText('✕',px+pw-22,py+24); ctx.textAlign='left';

  const sw=WEAPONS[player.weaponIdx];
  ctx.fillStyle='#555'; rr(px+20,py+65,pw-40,90,6); ctx.fill();
  ctx.fillStyle='#ffd700'; ctx.font='bold 11px monospace';
  ctx.fillText('WEAPON: '+sw.name,px+30,py+92);
  ctx.fillStyle=sw.color; ctx.fillText('DAMAGE: '+sw.dmg,px+30,py+112);
  ctx.fillStyle='#fff'; ctx.fillText('RANGE: '+sw.range+'px',px+30,py+132);

  ctx.fillStyle='#555'; rr(px+20,py+170,pw-40,140,6); ctx.fill();
  ctx.fillStyle='#ffd700'; ctx.font='bold 11px monospace';
  ctx.fillText('ARMOR:',px+30,py+196);
  SLOTS.forEach((s,i)=>{
    const a=player.armor[i];
    const name=a>=0?ARMOR_TIERS[a].name+' '+s:'None';
    const col=a>=0?ARMOR_TIERS[a].color:'#888';
    ctx.fillStyle=col; ctx.fillText(s+': '+name,px+30,py+218+i*22);
  });
  ctx.fillStyle='#fff'; ctx.font='bold 13px monospace';
  ctx.fillText('Total Defense: +'+player.defense,px+30,py+310);

  ctx.fillStyle='#555'; rr(px+20,py+325,pw-40,55,6); ctx.fill();
  ctx.fillStyle='#ffd700'; ctx.font='bold 13px monospace';
  ctx.fillText('Gold: ⬤ '+player.gold,px+30,py+353);
  ctx.fillStyle='#fff'; ctx.fillText('Wave: '+wave,px+180,py+353);

  // Press E to close
  ctx.fillStyle='#aaa'; ctx.font='10px monospace'; ctx.textAlign='center';
  ctx.fillText('Press E to close',px+pw/2,py+ph-15); ctx.textAlign='left';

  if (clickFrame && hovering(px+pw-44,py-4,44,44)) STATE='HUB';
  if (eFrame) STATE='HUB';
}

// ── DRAW: Title Screen ──────────────────────────────────────────
function drawTitle() {
  const sg=ctx.createLinearGradient(0,0,0,H*0.62);
  sg.addColorStop(0,'#7ec8e3'); sg.addColorStop(1,'#c5e8f5');
  ctx.fillStyle=sg; ctx.fillRect(0,0,W,H*0.62);

  ctx.fillStyle='rgba(255,255,255,0.88)';
  [[80,55,120,28],[295,38,95,24],[540,65,115,28],[775,42,105,25]].forEach(([cx,cy,cw,ch])=>{
    ctx.fillRect(cx,cy,cw,ch/2); ctx.fillRect(cx+10,cy-ch/3,cw-20,ch/2+5);
  });

  const gy=Math.floor(H*0.58);
  ctx.fillStyle='#5a8a2c'; ctx.fillRect(0,gy,W,22);
  ctx.fillStyle='#4a7a1c';
  for (let gx=0;gx<W;gx+=8) ctx.fillRect(gx,gy,4,6);
  ctx.fillStyle='#8B5E3C'; ctx.fillRect(0,gy+22,W,H-gy-22);
  ctx.fillStyle='#7a4e2c';
  for (let gx=0;gx<W;gx+=20) for (let gy2=gy+26;gy2<H;gy2+=20) ctx.fillRect(gx,gy2,16,16);

  [[75,gy],[185,gy-12],[715,gy],[835,gy-7]].forEach(([tx,ty])=>{
    ctx.fillStyle='#5a3010'; ctx.fillRect(tx-5,ty-52,10,52);
    ctx.fillStyle='#2d6b10'; ctx.fillRect(tx-22,ty-82,44,36);
    ctx.fillStyle='#3a8018'; ctx.fillRect(tx-15,ty-105,30,28);
  });
  [[260,gy-88,115,88],[368,gy-66,92,66],[456,gy-98,125,98],[572,gy-78,105,78]].forEach(([bx,by,bw,bh])=>{
    ctx.fillStyle='#9b7040'; ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle='#6b4020'; ctx.fillRect(bx-4,by-14,bw+8,18);
    ctx.fillStyle='rgba(255,220,150,0.5)'; ctx.fillRect(bx+bw/2-12,by+18,22,16);
  });

  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(CX-315,12,630,135);

  ctx.font='bold 54px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillStyle='#001a22'; ctx.fillText('NOOB DEFENDS',CX+3,88);
  const g1=ctx.createLinearGradient(CX-290,30,CX+290,90);
  g1.addColorStop(0,'#22ddff'); g1.addColorStop(0.5,'#88ffff'); g1.addColorStop(1,'#22ddff');
  ctx.fillStyle=g1; ctx.fillText('NOOB DEFENDS',CX,85);
  ctx.font='bold 44px "Press Start 2P",monospace';
  ctx.fillStyle='#220000'; ctx.fillText('THE VILLAGE',CX+3,137);
  const g2=ctx.createLinearGradient(CX-220,95,CX+220,140);
  g2.addColorStop(0,'#ff3333'); g2.addColorStop(0.5,'#ff8844'); g2.addColorStop(1,'#ff3333');
  ctx.fillStyle=g2; ctx.fillText('THE VILLAGE',CX,134);
  ctx.textAlign='left';

  ctx.fillStyle='#aaa'; rr(CX-215,178,430,220,14); ctx.fill();
  ctx.strokeStyle='#888'; ctx.lineWidth=3; rr(CX-215,178,430,220,14); ctx.stroke();

  const ph1=hovering(CX-195,196,390,70);
  ctx.fillStyle=ph1?'#5dd450':'#4bc942'; rr(CX-195,196,390,70,10); ctx.fill();
  ctx.strokeStyle='#2a9928'; ctx.lineWidth=3; rr(CX-195,196,390,70,10); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 20px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText('PLAY GAME',CX,240); ctx.textAlign='left';

  const ph2=hovering(CX-195,288,390,70);
  ctx.fillStyle=ph2?'#5bbfe8':'#4ab0e8'; rr(CX-195,288,390,70,10); ctx.fill();
  ctx.strokeStyle='#2880b8'; ctx.lineWidth=3; rr(CX-195,288,390,70,10); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='bold 18px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText('COMMUNITY ✈',CX,332); ctx.textAlign='left';

  canvas.style.cursor=(ph1||ph2)?'pointer':'default';
  if (clickFrame) {
    if (ph1) { STATE='LOADING'; loadPct=0; loadTmr=0; tipIdx=0; }
    if (ph2) window.open('https://t.me/wackybrains','_blank');
  }
}

// ── DRAW: Loading ───────────────────────────────────────────────
function drawLoading() {
  ctx.fillStyle='#1a0800'; ctx.fillRect(0,0,W,H);
  for (let x=0;x<W;x+=40) for (let y=0;y<H;y+=40) {
    ctx.fillStyle=((Math.floor(x/40)+Math.floor(y/40))%2===0)?'#3d1f0a':'#2d1200';
    ctx.fillRect(x,y,40,40);
    ctx.strokeStyle='#1a0800'; ctx.lineWidth=1; ctx.strokeRect(x,y,40,40);
  }
  ctx.font='bold 30px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillStyle='#001a22'; ctx.fillText('NOOB DEFENDS',CX+2,H/2-118);
  ctx.fillStyle='#22ddff'; ctx.fillText('NOOB DEFENDS',CX,H/2-120);
  ctx.font='bold 20px "Press Start 2P",monospace';
  ctx.fillStyle='#220000'; ctx.fillText('THE VILLAGE',CX+2,H/2-74);
  ctx.fillStyle='#ff6644'; ctx.fillText('THE VILLAGE',CX,H/2-76);

  const bx=CX-205,by=H/2+8,bw=410,bh=30;
  ctx.fillStyle='#333'; rr(bx,by,bw,bh,6); ctx.fill();
  ctx.strokeStyle='#555'; ctx.lineWidth=2; rr(bx,by,bw,bh,6); ctx.stroke();
  const fw=(bw-4)*loadPct;
  ctx.save(); ctx.beginPath(); rr(bx+2,by+2,Math.max(0,fw),bh-4,4); ctx.clip();
  ctx.fillStyle='#8B5E3C'; ctx.fillRect(bx+2,by+2,fw,bh-4);
  ctx.fillStyle='#7a4e2c';
  for (let px2=bx+2;px2<bx+2+fw;px2+=14) ctx.fillRect(px2,by+2,10,bh-4);
  ctx.restore();
  ctx.fillStyle='#fff'; ctx.font='bold 12px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillText('LOADING... '+Math.floor(loadPct*100)+'%',CX,by-8);
  ctx.fillStyle='#bbb'; ctx.font='11px monospace';
  ctx.fillText('TIP: '+TIPS[tipIdx],CX,H/2+70);
  ctx.textAlign='left';

  loadTmr++;
  if (loadTmr%22===0) tipIdx=(tipIdx+1)%TIPS.length;
  loadPct=Math.min(1,loadPct+0.007);
  if (loadPct>=1 && loadTmr>100) startGame();
}

// ── DRAW: Wave Clear ────────────────────────────────────────────
function drawWaveClear() {
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
  ctx.font='bold 32px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillStyle='#ffd700'; ctx.fillText('WAVE '+wave+' CLEAR!',CX,H/2-50);
  ctx.fillStyle='#4f4'; ctx.font='bold 14px monospace';
  ctx.fillText('All enemies defeated!',CX,H/2-2);
  ctx.fillStyle='#fff';
  ctx.fillText('Returning to village in '+Math.max(0,Math.ceil((180-clearTimer)/60))+'s...',CX,H/2+30);
  ctx.fillText('Your villagers are coming back!',CX,H/2+58);
  ctx.textAlign='left';
}

// ── DRAW: Game Over ─────────────────────────────────────────────
function drawGameOver() {
  ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,W,H);
  ctx.font='bold 44px "Press Start 2P",monospace'; ctx.textAlign='center';
  ctx.fillStyle='#f44'; ctx.fillText('GAME OVER',CX,H/2-70);
  ctx.fillStyle='#fff'; ctx.font='bold 14px monospace';
  ctx.fillText('Survived Wave '+wave,CX,H/2-20);
  ctx.fillText('Gold collected: ⬤ '+player.gold,CX,H/2+10);
  const ph=hovering(CX-145,H/2+55,290,55);
  ctx.fillStyle=ph?'#5dd450':'#4bc942'; rr(CX-145,H/2+55,290,55,8); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 16px "Press Start 2P",monospace';
  ctx.fillText('PLAY AGAIN',CX,H/2+90); ctx.textAlign='left';
  canvas.style.cursor=ph?'pointer':'default';
  if (clickFrame&&ph) { STATE='LOADING'; loadPct=0; loadTmr=0; }
}

// ── DRAW: Coins + Particles + Floats ───────────────────────────
function drawCoins() {
  coins.forEach(c=>{
    ctx.fillStyle='#ffd700'; ctx.beginPath(); ctx.arc(c.x,c.y,6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#b8970a'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle='#8a6000'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.fillText('G',c.x,c.y+3); ctx.textAlign='left';
  });
}
function drawParticles() {
  particles.forEach(p=>{
    ctx.globalAlpha=p.life/p.maxLife;
    ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
}
function drawFloats() {
  floatTexts.forEach(t=>{
    ctx.globalAlpha=t.life/55;
    ctx.strokeStyle='#000'; ctx.lineWidth=3;
    ctx.font='bold 14px monospace'; ctx.textAlign='center';
    ctx.strokeText(t.txt,t.x,t.y); ctx.fillStyle=t.color; ctx.fillText(t.txt,t.x,t.y);
    ctx.textAlign='left';
  });
  ctx.globalAlpha=1;
}

// ── MAIN LOOP ───────────────────────────────────────────────────
function gameLoop() {
  ctx.clearRect(0,0,W,H);
  update();

  switch(STATE) {
    case 'TITLE':
      drawTitle();
      break;
    case 'LOADING':
      drawLoading();
      break;
    case 'HUB':
      drawHubRoom();
      drawCoins(); drawParticles();
      villagers.forEach(drawVillager);
      drawPlayer(); drawFloats();
      drawNightOverlay();
      drawHUD(); drawCrosshair();
      break;
    case 'SHOP':
      drawHubRoom();
      villagers.forEach(drawVillager);
      drawNightOverlay();
      drawShop();
      if (clickFrame) handleShopClick();
      break;
    case 'INVENTORY':
      drawHubRoom();
      villagers.forEach(drawVillager);
      drawNightOverlay();
      drawInventory();
      break;
    case 'BATTLE':
      drawBattleArena();
      drawPlacedBlocks();
      drawCoins(); drawParticles();
      enemies.forEach(drawEnemy);
      drawPlayer(); drawFloats();
      drawNightOverlay();
      drawHUD(); drawCrosshair();
      break;
    case 'WAVE_CLEAR':
      drawBattleArena();
      drawParticles(); drawFloats();
      drawNightOverlay();
      drawHUD(); drawWaveClear();
      break;
    case 'GAME_OVER':
      drawBattleArena();
      enemies.forEach(drawEnemy);
      drawPlayer();
      drawNightOverlay();
      drawHUD(); drawGameOver();
      break;
  }

  clickFrame=false; rClickFrame=false; eFrame=false;
  requestAnimationFrame(gameLoop);
}

// Start
setTimeout(() => requestAnimationFrame(gameLoop), 350);
