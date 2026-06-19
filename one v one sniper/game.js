// ============================================================
// SECTION 1: CANVAS SETUP
// ============================================================
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = 1200;
const H = 600;
const HALF_W = W / 2;   // 600px per viewport
canvas.width  = W;
canvas.height = H;

// ============================================================
// SECTION 2: CONSTANTS
// ============================================================

const GRAVITY      = 900;
const JUMP_VEL     = -420;
const MOVE_SPEED   = 200;
const WORLD_W      = 620;   // narrow — entire building always visible
const WORLD_H      = H;
const PLAYER_W     = 16;
const PLAYER_H     = 32;

const WEAPONS = {
  SCOUT:   { name:'SCOUT',   damage:34,  reloadTime:0.8, ammo:10, assistRadius:30, color:'#88ff88' },
  KRIEG:   { name:'KRIEG',   damage:55,  reloadTime:1.5, ammo:6,  assistRadius:18, color:'#ffaa44' },
  AWP:     { name:'AWP',     damage:85,  reloadTime:3.0, ammo:4,  assistRadius:8,  color:'#ff8888' },
  DEADEYE: { name:'DEADEYE', damage:100, reloadTime:5.0, ammo:2,  assistRadius:0,  color:'#ff4444' },
};
const WEAPON_KEYS = ['SCOUT','KRIEG','AWP','DEADEYE'];
const SCREEN = { WEAPON_SELECT:'WEAPON_SELECT', BATTLE:'BATTLE', WIN:'WIN' };

// ── Building layout (620 px wide) ────────────────────────────
const TOP_Y   = 190;   // top floor surface y
const BOT_Y   = 420;   // bottom floor surface y
const FLOOR_H = 16;
const ATR_X   = 248;   // atrium gap start  (248 → 372 = 124 px gap)
const ATR_W   = 124;

// Platforms: two floors, each split by the atrium gap
const PLATFORMS = [
  { x:0,         y:TOP_Y, w:ATR_X,          h:FLOOR_H },  // top-left
  { x:ATR_X+ATR_W, y:TOP_Y, w:WORLD_W-ATR_X-ATR_W, h:FLOOR_H }, // top-right
  { x:0,         y:BOT_Y, w:ATR_X,          h:FLOOR_H },  // bot-left
  { x:ATR_X+ATR_W, y:BOT_Y, w:WORLD_W-ATR_X-ATR_W, h:FLOOR_H }, // bot-right
  { x:0,         y:572,   w:WORLD_W,         h:28 },       // safety ground
];

// Crates — players can take cover or jump on top of them
const COVERS = [
  // top floor · left
  { x:36,  y:TOP_Y-30, w:46, h:30 },
  { x:148, y:TOP_Y-30, w:46, h:30 },
  { x:198, y:TOP_Y-30, w:42, h:30 },   // near atrium edge
  // top floor · right
  { x:ATR_X+ATR_W+10, y:TOP_Y-30, w:42, h:30 }, // near atrium edge
  { x:ATR_X+ATR_W+108, y:TOP_Y-30, w:46, h:30 },
  { x:ATR_X+ATR_W+216, y:TOP_Y-30, w:46, h:30 },
  // bot floor · left (mirrors top)
  { x:36,  y:BOT_Y-30, w:46, h:30 },
  { x:148, y:BOT_Y-30, w:46, h:30 },
  { x:198, y:BOT_Y-30, w:42, h:30 },
  // bot floor · right
  { x:ATR_X+ATR_W+10,  y:BOT_Y-30, w:42, h:30 },
  { x:ATR_X+ATR_W+108, y:BOT_Y-30, w:46, h:30 },
  { x:ATR_X+ATR_W+216, y:BOT_Y-30, w:46, h:30 },
];

// ============================================================
// SECTION 3: STATE
// ============================================================

function wbLoad(defaults) {
  try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem('wb_save_sniper')) || {}); }
  catch (e) { return defaults; }
}
function wbSave(data) {
  try { localStorage.setItem('wb_save_sniper', JSON.stringify(data)); } catch (e) {}
}
const wbSaved = wbLoad({ matchWins: [0,0], lastSelection: [0,0] });
const matchWins = wbSaved.matchWins;

const roundWins = [0,0];
let currentRound  = 1;
let currentScreen = SCREEN.WEAPON_SELECT;
let winner = -1;
const selection   = [wbSaved.lastSelection[0]||0, wbSaved.lastSelection[1]||0];
const confirmed   = [false,false];
let players       = [];
let bullets       = [];
let roundMsg      = '';
let roundMsgTimer = 0;
let floorLabel    = ['',''];

function initRound() {
  confirmed[0] = false; confirmed[1] = false;
  bullets       = [];
  roundMsg      = '';
  roundMsgTimer = 0;

  // Random floor assignment each round
  const p1OnTop = Math.random() < 0.5;
  const p0y = (p1OnTop ? TOP_Y : BOT_Y) - PLAYER_H * 3;
  const p1y = (p1OnTop ? BOT_Y : TOP_Y) - PLAYER_H * 3;

  floorLabel[0] = p1OnTop ? '2F — TOP'    : '1F — BOTTOM';
  floorLabel[1] = p1OnTop ? '1F — BOTTOM' : '2F — TOP';

  players = [
    createPlayer(0, 90,          p0y),   // P1: left side
    createPlayer(1, WORLD_W-138, p1y),   // P2: right side (620-138=482)
  ];
  _navPressed[0] = false;
  _navPressed[1] = false;
}

function createPlayer(idx, x, y) {
  const wk  = WEAPON_KEYS[selection[idx]];
  const wpn = WEAPONS[wk];
  return {
    index:idx, x, y, vx:0, vy:0, onGround:false,
    hp:100, maxHp:100,
    weapon:{...wpn, key:wk},
    ammo:wpn.ammo, reloadTimer:0,
    scoping:false, scopeCharge:0,
    dead:false, facing:idx===0?1:-1,
    animState:'idle', animFrame:0, animTimer:0,
    hitFlash:0, muzzleFlash:0, _assistOffset:0,
  };
}

// ============================================================
// SECTION 4: HIT SPEECH
// ============================================================

const HIT_QUIPS = ['Ouch!','Uff!','Whoopsie!','Got em!','Headshot!','Yeow!','Take that!'];
let _hitVoice = null;

function _loadHitVoice() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  if (!voices.length) return;
  _hitVoice = voices.find(v=>v.name==='Google US English') ||
              voices.find(v=>v.name==='Samantha') ||
              voices.find(v=>v.name==='Alex') ||
              voices.find(v=>/en/i.test(v.lang)) || voices[0];
}
if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = _loadHitVoice;
  _loadHitVoice();
}

function speakHit() {
  if (!window.speechSynthesis) return;
  if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(HIT_QUIPS[Math.floor(Math.random()*HIT_QUIPS.length)]);
  utt.pitch  = 0.95 + Math.random()*0.4;
  utt.rate   = 1.05 + Math.random()*0.25;
  utt.volume = 1.0;
  if (_hitVoice) utt.voice = _hitVoice;
  window.speechSynthesis.speak(utt);
}

// ============================================================
// SECTION 5: INPUT
// ============================================================

const keys = {};
window.addEventListener('keydown', e => { keys[e.code]=true;  e.preventDefault(); });
window.addEventListener('keyup',   e => {
  keys[e.code]=false;
  if (e.code==='KeyF'   && players[0]&&players[0].scoping&&!players[0].dead) tryFire(players[0],players[1]);
  if (e.code==='KeyL'   && players[1]&&players[1].scoping&&!players[1].dead) tryFire(players[1],players[0]);
  if (e.code==='Space'  && players[0]&&players[0].scoping&&!players[0].dead) tryFire(players[0],players[1]);
  if (e.code==='Slash'  && players[1]&&players[1].scoping&&!players[1].dead) tryFire(players[1],players[0]);
});

function isLeft(p)  { return p.index===0 ? keys['KeyA']      : keys['ArrowLeft'];  }
function isRight(p) { return p.index===0 ? keys['KeyD']      : keys['ArrowRight']; }
function isJump(p)  { return p.index===0 ? keys['KeyW']||keys['Space'] : keys['ArrowUp']; }
function isScope(p) { return p.index===0 ? keys['KeyF']||keys['Space'] : keys['KeyL']||keys['Slash']; }

const _navPressed = [false,false];
function navUp(p)      { return p.index===0 ? keys['KeyW']   : keys['ArrowUp'];   }
function navDown(p)    { return p.index===0 ? keys['KeyS']   : keys['ArrowDown']; }
function confirmKey(p) { return p.index===0 ? keys['KeyF']   : keys['KeyL'];      }
function clearKeys()   { Object.keys(keys).forEach(k=>{keys[k]=false;}); }

// ============================================================
// SECTION 6: PHYSICS
// ============================================================

function rectOverlap(ax,ay,aw,ah,bx,by,bw,bh) {
  return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
}

function applyPhysics(p, dt) {
  if (p.dead) return;
  const pw=PLAYER_W*3, ph=PLAYER_H*3;

  if (!p.scoping) {
    if      (isLeft(p))  { p.vx=-MOVE_SPEED; p.facing=-1; }
    else if (isRight(p)) { p.vx= MOVE_SPEED; p.facing= 1; }
    else p.vx=0;
  } else p.vx=0;

  p.vy += GRAVITY*dt;
  p.x  += p.vx*dt;
  p.x   = Math.max(0, Math.min(WORLD_W-pw, p.x));
  p.y  += p.vy*dt;

  p.onGround=false;
  for (const tile of [...PLATFORMS,...COVERS]) {
    if (rectOverlap(p.x,p.y,pw,ph,tile.x,tile.y,tile.w,tile.h)) {
      const prevBottom = p.y+ph - p.vy*dt;
      if (prevBottom <= tile.y+2 && p.vy>=0) { p.y=tile.y-ph; p.vy=0; p.onGround=true; }
      else if (p.vy<0)                        { p.y=tile.y+tile.h; p.vy=0; }
    }
  }

  if (isJump(p) && p.onGround) { p.vy=JUMP_VEL; p.onGround=false; }
  if (p.y+ph > WORLD_H)        { p.y=WORLD_H-ph; p.vy=0; p.onGround=true; }
}

function updateScoping(p, dt) {
  if (p.dead||currentScreen!==SCREEN.BATTLE) { p.scoping=false; p.scopeCharge=Math.max(p.scopeCharge-dt*6,0); return; }
  if (isScope(p)) { p.scoping=true;  p.scopeCharge=Math.min(p.scopeCharge+dt*3,1); }
  else            { p.scoping=false; p.scopeCharge=Math.max(p.scopeCharge-dt*6,0); }
}

function updateReload(p,dt) {
  if (p.reloadTimer>0) { p.reloadTimer-=dt; if(p.reloadTimer<=0){p.reloadTimer=0;if(p.ammo===0)p.ammo=1;} }
}

function updateHitFlash(p,dt)    { if(p.hitFlash>0) p.hitFlash-=dt; }

function updateAnimation(p,dt) {
  p.animTimer+=dt;
  if (p.muzzleFlash>0) p.muzzleFlash-=dt;
  if (p.dead)      { p.animState='dead';  return; }
  if (p.scoping)   { p.animState='scope'; return; }
  if (!p.onGround) { p.animState='jump';  return; }
  if (p.vx!==0)    { p.animState='run'; if(p.animTimer>0.12){p.animFrame++;p.animTimer=0;} return; }
  p.animState='idle'; p.animFrame=0;
}

function updateAimAssist(p, enemy) {
  p._assistOffset=0;
  if (!p.scoping||p.scopeCharge<0.8||enemy.dead) return;
  const r=p.weapon.assistRadius; if(r===0) return;
  const S=3;
  const raw=(enemy.x+PLAYER_W*S/2)-(p.x+PLAYER_W*S/2);
  const d=Math.abs(raw);
  if (d<r*8) { const t=Math.max(0,1-d/(r*8)); p._assistOffset=raw*t*0.7; }
}

function applyDamage(p,dmg) {
  if (p.dead) return;
  p.hp-=dmg; p.hitFlash=0.2;
  speakHit();
  if (p.hp<=0) { p.hp=0; p.dead=true; p.animState='dead'; onPlayerDied(p); }
}

function tryFire(shooter,target) {
  if (shooter.dead||shooter.ammo<=0||shooter.reloadTimer>0) return;
  shooter.ammo--; shooter.reloadTimer=shooter.weapon.reloadTime;
  shooter.scoping=false; shooter.scopeCharge=0; shooter.muzzleFlash=0.08;
  const S=3;
  const bx=shooter.x+PLAYER_W*S/2+shooter.facing*PLAYER_W*S*0.6;
  const by=shooter.y+PLAYER_H*S*0.35;
  const tx=target.x+PLAYER_W*S/2+shooter._assistOffset;
  const ty=target.y+PLAYER_H*S/2;
  const dx=tx-bx, dy=ty-by;
  const len=Math.sqrt(dx*dx+dy*dy)||1;
  bullets.push({ x:bx,y:by, vx:(dx/len)*1800, vy:(dy/len)*1800,
                 owner:shooter.index, damage:shooter.weapon.damage,
                 color:shooter.index===0?'#aaff44':'#44aaff', life:2 });
}

function updateBullets(dt) {
  for (const b of bullets) {
    b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt;
    const target=players[1-b.owner];
    if (!target.dead) {
      const S=3;
      if (rectOverlap(b.x-4,b.y-4,8,8,target.x,target.y,PLAYER_W*S,PLAYER_H*S)) {
        applyDamage(target,b.damage); checkSimultaneousDeath(); b.life=0;
      }
    }
    for (const tile of [...PLATFORMS,...COVERS]) {
      if (rectOverlap(b.x-2,b.y-2,4,4,tile.x,tile.y,tile.w,tile.h)) b.life=0;
    }
  }
  for (let i=bullets.length-1;i>=0;i--) { if(bullets[i].life<=0) bullets.splice(i,1); }
}

function onPlayerDied(dead) {
  const wi=1-dead.index; roundWins[wi]++;
  roundMsg=`P${wi+1} WINS ROUND ${currentRound}!`; roundMsgTimer=2.0; currentRound++;
  if (roundWins[wi]>=3) {
    roundMsg=`P${wi+1} WINS THE MATCH!`; roundMsgTimer=2.5; winner=wi;
    matchWins[wi]++;
    wbSave({ matchWins: matchWins, lastSelection: selection });
  }
}

function endRoundTransition() {
  if (winner>=0) { currentScreen=SCREEN.WIN; return; }
  currentScreen=SCREEN.WEAPON_SELECT;
}

function checkSimultaneousDeath() {
  if (!players.every(p=>p.dead)) return;
  const lw=roundWins[0]>roundWins[1]?0:1;
  roundWins[lw]--; currentRound--;
  roundMsg='DRAW — REPLAY ROUND'; roundMsgTimer=2.0; winner=-1;
}

function updateWeaponSelect(_dt) {
  for (let i=0;i<2;i++) {
    if (confirmed[i]) continue;
    const fp={index:i};
    if      (navUp(fp)&&!_navPressed[i])   { selection[i]=(selection[i]-1+WEAPON_KEYS.length)%WEAPON_KEYS.length; _navPressed[i]=true; }
    else if (navDown(fp)&&!_navPressed[i]) { selection[i]=(selection[i]+1)%WEAPON_KEYS.length;                    _navPressed[i]=true; }
    else if (!navUp(fp)&&!navDown(fp))     { _navPressed[i]=false; }
    if (confirmKey(fp) && !confirmed[i]) { confirmed[i]=true; wbSave({ matchWins: matchWins, lastSelection: selection }); }
  }
  if (confirmed[0]&&confirmed[1]) { clearKeys(); initRound(); currentScreen=SCREEN.BATTLE; }
}

function updateWin(_dt) {
  // Show share button when win screen is active
  const _sb = document.getElementById('wb-sniper-share');
  if(_sb && _sb.style.display==='none') { _sb.style.display='block'; _sb.onclick=()=>WackyShare.show('1v1 Sniper',`Player ${winner+1} wins ${roundWins[winner]}-${roundWins[1-winner]} in 1v1 Sniper!`,'https://wackybrains.com/one%20v%20one%20sniper/'); }
  if (keys['Enter']||keys['Escape']) {
    if(_sb) _sb.style.display='none';
    roundWins[0]=0;roundWins[1]=0;currentRound=1;winner=-1;
    currentScreen=SCREEN.WEAPON_SELECT; initRound(); clearKeys();
  }
}

// ============================================================
// SECTION 7: RENDERING
// ============================================================

function getCameraX(p) {
  const pw=PLAYER_W*3;
  let cx=p.x+pw/2-HALF_W/2;
  return Math.max(0, Math.min(WORLD_W-HALF_W, cx));
}

// ── Building interior background ─────────────────────────────
function renderBuilding(camX) {
  // Stone wall background
  ctx.fillStyle='#15151e';
  ctx.fillRect(camX,0,HALF_W+1,H);

  // Brick texture
  ctx.strokeStyle='rgba(255,255,255,0.022)';
  ctx.lineWidth=1;
  for (let wy=10;wy<H;wy+=22) {
    const off=(Math.floor(wy/22)%2)*28;
    for (let wx=camX-30+off;wx<camX+HALF_W+60;wx+=56) ctx.strokeRect(wx,wy,54,20);
  }

  // Ceiling slab
  ctx.fillStyle='#0d0d14';
  ctx.fillRect(camX,0,HALF_W+1,52);
  ctx.fillStyle='#1c1c28';
  ctx.fillRect(camX,50,HALF_W+1,4);

  // Ceiling lights
  for (let lx=110;lx<WORLD_W;lx+=160) {
    if (lx<camX-50||lx>camX+HALF_W+50) continue;
    ctx.fillStyle='#252535'; ctx.fillRect(lx-16,46,32,8);
    ctx.fillStyle='rgba(255,235,150,0.9)'; ctx.fillRect(lx-10,52,20,4);
    const lg=ctx.createRadialGradient(lx,58,0,lx,58,80);
    lg.addColorStop(0,'rgba(255,230,140,0.13)'); lg.addColorStop(1,'rgba(255,230,140,0)');
    ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(lx,58,80,0,Math.PI*2); ctx.fill();
  }

  // Basement (below bottom floor)
  ctx.fillStyle='#0c0c10';
  ctx.fillRect(camX,BOT_Y+FLOOR_H,HALF_W+1,H-BOT_Y-FLOOR_H);
  ctx.fillStyle='#181820'; ctx.fillRect(camX,570,HALF_W+1,4);

  // Inter-floor wall (solid sections left and right of atrium)
  ctx.fillStyle='#111118';
  ctx.fillRect(0,          TOP_Y+FLOOR_H, ATR_X,              BOT_Y-TOP_Y-FLOOR_H);
  ctx.fillRect(ATR_X+ATR_W,TOP_Y+FLOOR_H, WORLD_W-ATR_X-ATR_W, BOT_Y-TOP_Y-FLOOR_H);
  // Wall brick detail
  ctx.strokeStyle='rgba(255,255,255,0.018)';
  for (let wy=TOP_Y+FLOOR_H+8;wy<BOT_Y-6;wy+=22) {
    const off=(Math.floor(wy/22)%2)*22;
    for (let wx=off;wx<ATR_X;wx+=44)       ctx.strokeRect(wx,wy,42,20);
    for (let wx=ATR_X+ATR_W+off;wx<WORLD_W;wx+=44) ctx.strokeRect(wx,wy,42,20);
  }

  // Atrium shaft — open air glow
  const ag=ctx.createLinearGradient(ATR_X,TOP_Y+FLOOR_H,ATR_X,BOT_Y);
  ag.addColorStop(0,'rgba(255,210,90,0.08)'); ag.addColorStop(0.5,'rgba(255,185,60,0.04)'); ag.addColorStop(1,'rgba(255,210,90,0.08)');
  ctx.fillStyle=ag; ctx.fillRect(ATR_X,TOP_Y+FLOOR_H,ATR_W,BOT_Y-TOP_Y-FLOOR_H);
  // Shaft edge lines
  ctx.strokeStyle='rgba(200,160,40,0.22)'; ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(ATR_X,       TOP_Y+FLOOR_H); ctx.lineTo(ATR_X,       BOT_Y);
  ctx.moveTo(ATR_X+ATR_W, TOP_Y+FLOOR_H); ctx.lineTo(ATR_X+ATR_W, BOT_Y);
  ctx.stroke();

  // ── Floor slabs ──
  for (const fy of [TOP_Y, BOT_Y]) {
    // Left section planks
    ctx.fillStyle='#2e2010'; ctx.fillRect(0,fy,ATR_X,FLOOR_H);
    ctx.fillStyle='#3e2c16'; ctx.fillRect(0,fy,ATR_X,3);
    ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=1;
    for (let px=0;px<ATR_X;px+=32) { ctx.beginPath(); ctx.moveTo(px,fy); ctx.lineTo(px,fy+FLOOR_H); ctx.stroke(); }

    // Right section planks
    const rx=ATR_X+ATR_W;
    ctx.fillStyle='#2e2010'; ctx.fillRect(rx,fy,WORLD_W-rx,FLOOR_H);
    ctx.fillStyle='#3e2c16'; ctx.fillRect(rx,fy,WORLD_W-rx,3);
    for (let px=rx;px<WORLD_W;px+=32) { ctx.beginPath(); ctx.moveTo(px,fy); ctx.lineTo(px,fy+FLOOR_H); ctx.stroke(); }

    // Railing posts at atrium edges
    ctx.fillStyle='#8b6a14';
    ctx.fillRect(ATR_X-5,  fy-22, 6, 26);
    ctx.fillRect(ATR_X+ATR_W-1, fy-22, 6, 26);
    ctx.fillStyle='#a07c20';
    ctx.fillRect(ATR_X-8,       fy-25, 12, 5);
    ctx.fillRect(ATR_X+ATR_W-4, fy-25, 12, 5);
    // Chain
    ctx.strokeStyle='rgba(160,120,30,0.45)'; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(ATR_X,ATR_X+ATR_W>0?fy-14:fy-14);
    ctx.quadraticCurveTo(ATR_X+ATR_W/2, fy-6, ATR_X+ATR_W+2, fy-14);
    ctx.stroke();

    // Floor label
    ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.font='bold 11px monospace'; ctx.textAlign='left';
    ctx.fillText(fy===TOP_Y?'2F':'1F', 5, fy-26);
  }

  // ── Crates ──
  for (const c of COVERS) {
    ctx.fillStyle='#4a3820'; ctx.fillRect(c.x,c.y,c.w,c.h);
    ctx.strokeStyle='#3a2810'; ctx.lineWidth=1;
    for (let gy=c.y+7;gy<c.y+c.h-4;gy+=8) { ctx.beginPath(); ctx.moveTo(c.x+2,gy); ctx.lineTo(c.x+c.w-2,gy); ctx.stroke(); }
    ctx.fillStyle='#6a5030'; ctx.fillRect(c.x,c.y,c.w,4);
    ctx.strokeStyle='rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.moveTo(c.x+4,c.y+4); ctx.lineTo(c.x+c.w-4,c.y+c.h-2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x+c.w-4,c.y+4); ctx.lineTo(c.x+4,c.y+c.h-2); ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(c.x+c.w-5,c.y+4,5,c.h-4);
  }

  // Outer walls
  ctx.fillStyle='#0b0b12';
  ctx.fillRect(0,0,16,H); ctx.fillRect(WORLD_W-16,0,16,H);
}

// ── Aim line (trajectory preview when scoping) ───────────────
function drawAimLine(shooter, target, offsetX, cam) {
  if (!shooter.scoping || shooter.scopeCharge < 0.3 || shooter.dead || target.dead) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(offsetX,0,HALF_W,H); ctx.clip();
  ctx.translate(offsetX-cam, 0);

  const alpha = Math.min((shooter.scopeCharge-0.3)/0.7, 1);
  const S=3;
  const bx=shooter.x+PLAYER_W*S/2;
  const by=shooter.y+PLAYER_H*S*0.35;
  const tx=target.x+PLAYER_W*S/2;
  const ty=target.y+PLAYER_H*S/2;

  // Dotted trajectory line
  ctx.strokeStyle=`rgba(255,60,60,${alpha*0.45})`;
  ctx.lineWidth=1; ctx.setLineDash([5,7]);
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx,ty); ctx.stroke();
  ctx.setLineDash([]);

  // Target reticle (shrinks as charge increases = "lock on" feel)
  const reticleR = 24 - shooter.scopeCharge*16;
  ctx.strokeStyle=`rgba(255,80,80,${alpha})`;
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(tx,ty,reticleR,0,Math.PI*2); ctx.stroke();
  // Crosshair ticks
  ctx.beginPath();
  ctx.moveTo(tx-reticleR-5,ty); ctx.lineTo(tx-reticleR+4,ty);
  ctx.moveTo(tx+reticleR-4,ty); ctx.lineTo(tx+reticleR+5,ty);
  ctx.moveTo(tx,ty-reticleR-5); ctx.lineTo(tx,ty-reticleR+4);
  ctx.moveTo(tx,ty+reticleR-4); ctx.lineTo(tx,ty+reticleR+5);
  ctx.stroke();

  ctx.restore();
}

function drawBullet(b) {
  ctx.fillStyle=b.color; ctx.shadowColor=b.color; ctx.shadowBlur=10;
  ctx.fillRect(b.x-4,b.y-2,8,4); ctx.shadowBlur=0;
}

function drawPlayer(p) {
  const S=3, x=Math.round(p.x), y=Math.round(p.y), flash=p.hitFlash>0;
  const P1={ head:flash?'#ff6666':'#c8a060', helmet:flash?'#ff3333':'#2a4a2a', body:flash?'#ff5555':'#2a7a2a', legs:flash?'#ff4444':'#1a4a1a', boots:'#111', gun:'#3a3a3a', scope:'#1a1a1a' };
  const P2={ head:flash?'#ff6666':'#c8a060', helmet:flash?'#ff3333':'#1a3a5a', body:flash?'#ff5555':'#1a4a9a', legs:flash?'#ff4444':'#0a2a6a', boots:'#111', gun:'#3a3a3a', scope:'#1a1a1a' };
  const pal=p.index===0?P1:P2;
  function px(lx,ly,lw,lh,color) {
    ctx.fillStyle=color;
    ctx.fillRect(x+(p.facing===1?lx:PLAYER_W-lx-lw)*S, y+ly*S, lw*S, lh*S);
  }
  if (p.dead) {
    ctx.fillStyle=pal.body; ctx.fillRect(x,y+PLAYER_H*S-S*6,PLAYER_W*S,S*6);
    ctx.fillStyle=pal.head;
    ctx.fillRect(p.facing===1?x+PLAYER_W*S-S*5:x, y+PLAYER_H*S-S*6, S*5, S*5);
    return;
  }
  if (p.animState==='scope') {
    px(4,10,8,6,pal.head); px(3,7,10,5,pal.helmet); px(3,16,10,10,pal.body);
    ctx.fillStyle=pal.gun; ctx.fillRect(x+(p.facing===1?10*S:(PLAYER_W-10-14)*S),y+14*S,14*S,3*S);
    ctx.fillStyle=pal.scope; ctx.fillRect(x+(p.facing===1?21*S:(PLAYER_W-21-4)*S),y+13*S,4*S,5*S);
    px(3,26,4,6,pal.legs); px(9,26,4,6,pal.legs); px(2,30,5,2,pal.boots); px(9,30,5,2,pal.boots);
    return;
  }
  const bob=(p.animState==='run')?(p.animFrame%2===0?0:1):0;
  px(4,0+bob,8,6,pal.head); px(3,bob-2,10,4,pal.helmet); px(3,6+bob,10,12,pal.body);
  ctx.fillStyle=pal.gun; ctx.fillRect(x+(p.facing===1?11*S:(PLAYER_W-11-10)*S),y+(8+bob)*S,10*S,3*S);
  ctx.fillStyle=pal.scope; ctx.fillRect(x+(p.facing===1?19*S:(PLAYER_W-19-3)*S),y+(7+bob)*S,3*S,5*S);
  if (p.animState==='jump')            { px(3,18+bob,4,10,pal.legs); px(9,20+bob,4,8,pal.legs); }
  else if (p.animState==='run'&&p.animFrame%2===0) { px(3,18,4,8,pal.legs); px(9,20,4,10,pal.legs); }
  else                                 { px(3,18+bob,4,10,pal.legs); px(9,18+bob,4,10,pal.legs); }
  px(2,28+bob,5,4,pal.boots); px(9,28+bob,5,4,pal.boots);
  if (p.muzzleFlash>0) {
    const gx=x+(p.facing===1?PLAYER_W*S+4:-10), gy=y+PLAYER_H*S*0.33;
    ctx.fillStyle=`rgba(255,220,50,${p.muzzleFlash/0.08})`;
    ctx.beginPath(); ctx.arc(gx,gy,8,0,Math.PI*2); ctx.fill();
  }
}

function drawHUD(p, offsetX) {
  ctx.save();
  ctx.beginPath(); ctx.rect(offsetX,0,HALF_W,H); ctx.clip();

  const color  = p.index===0?'#4aff4a':'#4aaaff';
  const align  = p.index===0?'left':'right';
  const tx     = p.index===0?offsetX+10:offsetX+HALF_W-10;

  ctx.font='bold 13px monospace'; ctx.fillStyle=color; ctx.textAlign=align;
  ctx.fillText(`P${p.index+1}`, tx, 22);
  ctx.font='9px monospace'; ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.fillText(floorLabel[p.index]||'', tx, 35);

  // Hearts
  const filled=Math.ceil(Math.max(0,p.hp/p.maxHp)*3);
  for (let i=0;i<3;i++) {
    const hx=p.index===0?offsetX+10+i*22:offsetX+HALF_W-10-(3-i)*22;
    ctx.font='16px serif'; ctx.fillStyle=i<filled?'#ff4466':'#442233';
    ctx.textAlign='left'; ctx.fillText('♥',hx,52);
  }

  // Weapon / ammo
  ctx.font='10px monospace'; ctx.textAlign=align;
  ctx.fillStyle=p.weapon.color; ctx.fillText(p.weapon.name, tx, H-30);
  ctx.fillStyle=p.ammo===0?'#ff4444':'#aaaaaa';
  ctx.fillText(p.reloadTimer>0?`RELOAD ${p.reloadTimer.toFixed(1)}s`:`${p.ammo} ammo`, tx, H-14);

  // Round win dots (center top)
  const vcx=offsetX+HALF_W/2;
  ctx.font='10px monospace'; ctx.fillStyle='#888'; ctx.textAlign='center';
  ctx.fillText('ROUND '+currentRound, vcx, 16);
  for (let i=0;i<3;i++) {
    const sq=10,gap=4;
    const p1x=vcx-8-(3-i)*(sq+gap);
    ctx.fillStyle=i<roundWins[0]?'#4aff4a':'#222'; ctx.strokeStyle='#444'; ctx.lineWidth=1;
    ctx.fillRect(p1x,22,sq,sq); ctx.strokeRect(p1x,22,sq,sq);
    const p2x=vcx+8+i*(sq+gap);
    ctx.fillStyle=i<roundWins[1]?'#4aaaff':'#222';
    ctx.fillRect(p2x,22,sq,sq); ctx.strokeRect(p2x,22,sq,sq);
  }

  // Controls reminder (faint, bottom-center)
  ctx.font='8px monospace'; ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.textAlign='center';
  const ctrl=p.index===0?'A/D move  W jump  hold F scope  release F fire':'←/→ move  ↑ jump  hold L scope  release L fire';
  ctx.fillText(ctrl, vcx, H-2);

  ctx.restore();
}

function drawScopeOverlay(p, offsetX) {
  const charge=p.scopeCharge; if(charge<=0) return;
  const cx=offsetX+HALF_W/2, cy=H/2, r=130*charge;
  ctx.save();
  ctx.beginPath(); ctx.rect(offsetX,0,HALF_W,H); ctx.clip();
  ctx.fillStyle=`rgba(0,0,0,${0.88*charge})`;
  ctx.beginPath(); ctx.rect(offsetX,0,HALF_W,H); ctx.arc(cx,cy,r,0,Math.PI*2,true); ctx.fill('evenodd');
  ctx.strokeStyle=`rgba(180,180,180,${charge})`; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
  if (charge>0.8) {
    const a=(charge-0.8)/0.2;
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
    ctx.strokeStyle=`rgba(220,50,50,${a})`; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-r,cy); ctx.lineTo(cx+r,cy); ctx.moveTo(cx,cy-r); ctx.lineTo(cx,cy+r); ctx.stroke();
    ctx.fillStyle=`rgba(220,50,50,${a})`;
    for (const [dx,dy] of [[-r*.4,0],[r*.4,0],[0,-r*.4],[0,r*.4]]) { ctx.beginPath(); ctx.arc(cx+dx,cy+dy,3,0,Math.PI*2); ctx.fill(); }
    ctx.fillStyle=`rgba(0,0,0,${a})`; ctx.fillRect(cx-5,cy-1,10,2); ctx.fillRect(cx-1,cy-5,2,10);
    ctx.restore();
  }
  ctx.restore();
}

// ── Weapon select screen ─────────────────────────────────────
function renderWeaponSelect() {
  ctx.fillStyle='#0d0d1a'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffcc00'; ctx.font='bold 28px monospace'; ctx.textAlign='center';
  ctx.fillText('★  SNIPER DUEL  ★', W/2, 60);
  ctx.font='13px monospace'; ctx.fillStyle='#555';
  ctx.fillText(`ROUND ${currentRound}  —  First to 3`, W/2, 85);

  const panelW=420, panelH=340, panelY=110;
  for (let i=0;i<2;i++) {
    const px=i===0?60:W-60-panelW, color=i===0?'#4aff4a':'#4aaaff';
    ctx.strokeStyle=confirmed[i]?color:'#333'; ctx.lineWidth=confirmed[i]?2:1;
    ctx.strokeRect(px,panelY,panelW,panelH);
    ctx.fillStyle=color; ctx.font='bold 14px monospace'; ctx.textAlign='left';
    ctx.fillText(`PLAYER ${i+1}`, px+12, panelY+24);
    ctx.fillStyle='#555'; ctx.font='10px monospace';
    ctx.fillText(i===0?'A/D move  W jump  F scope+fire':'← → move  ↑ jump  L scope+fire', px+12, panelY+42);
    WEAPON_KEYS.forEach((key,idx)=>{
      const w=WEAPONS[key], wy=panelY+65+idx*65, sel=selection[i]===idx;
      ctx.fillStyle=sel?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.3)'; ctx.fillRect(px+8,wy-2,panelW-16,56);
      if (sel){ctx.strokeStyle=w.color;ctx.lineWidth=1;ctx.strokeRect(px+8,wy-2,panelW-16,56);}
      ctx.fillStyle=w.color; ctx.font='bold 14px monospace'; ctx.textAlign='left';
      ctx.fillText((key==='DEADEYE'?'💀 ':'🔫 ')+w.name, px+18, wy+18);
      const bw=100;
      drawStatBar(px+18,      wy+28,bw,'SPD',1-w.reloadTime/5,'#88ff88');
      drawStatBar(px+18+bw+20,wy+28,bw,'DMG',w.damage/100,    '#ff8888');
      drawStatBar(px+18+(bw+20)*2,wy+28,bw,'AIM',w.assistRadius/30,'#88aaff');
    });
    ctx.fillStyle=confirmed[i]?color:'#333'; ctx.font=confirmed[i]?'bold 13px monospace':'11px monospace'; ctx.textAlign='center';
    ctx.fillText(confirmed[i]?'READY ✓':'press confirm to lock in', px+panelW/2, panelY+panelH-12);
  }
  ctx.textAlign='center';
  for (let i=0;i<3;i++) {
    const sq=14,gap=6;
    ctx.fillStyle=i<roundWins[0]?'#4aff4a':'#222'; ctx.strokeStyle='#444'; ctx.lineWidth=1;
    const p1x=W/2-10-(3-i)*(sq+gap); ctx.fillRect(p1x,H-60,sq,sq); ctx.strokeRect(p1x,H-60,sq,sq);
    const p2x=W/2+10+i*(sq+gap); ctx.fillStyle=i<roundWins[1]?'#4aaaff':'#222';
    ctx.fillRect(p2x,H-60,sq,sq); ctx.strokeRect(p2x,H-60,sq,sq);
  }
  ctx.fillStyle='#555'; ctx.font='10px monospace';
  ctx.fillText('P1',W/2-10-3*(14+6)-16,H-49); ctx.fillText('P2',W/2+10+3*(14+6)+6,H-49);
}

function drawStatBar(x,y,w,label,frac,color) {
  ctx.fillStyle='#111'; ctx.fillRect(x,y,w,6);
  ctx.fillStyle=color; ctx.fillRect(x,y,Math.round(frac*w),6);
  ctx.fillStyle='#555'; ctx.font='8px monospace'; ctx.textAlign='left'; ctx.fillText(label,x,y+16);
}

function renderWinScreen() {
  ctx.fillStyle='#0d0d1a'; ctx.fillRect(0,0,W,H);
  const wc=winner===0?'#4aff4a':'#4aaaff';
  ctx.fillStyle='#ffcc00'; ctx.font='bold 52px monospace'; ctx.textAlign='center';
  ctx.fillText(`PLAYER ${winner+1}`,W/2,H/2-40);
  ctx.fillStyle=wc; ctx.font='bold 28px monospace'; ctx.fillText('WINS THE MATCH',W/2,H/2+10);
  ctx.fillStyle='#555'; ctx.font='14px monospace'; ctx.fillText(`${roundWins[0]} — ${roundWins[1]}`,W/2,H/2+50);
  ctx.fillStyle='#444'; ctx.font='11px monospace'; ctx.fillText(`Lifetime Matches Won — P1: ${matchWins[0]}  P2: ${matchWins[1]}`,W/2,H/2+68);
  ctx.strokeStyle=wc; ctx.lineWidth=1; ctx.strokeRect(W/2-160,H/2+80,140,36);
  ctx.fillStyle=wc; ctx.font='13px monospace'; ctx.fillText('REMATCH [ENTER]',W/2-90,H/2+104);
  ctx.strokeStyle='#444'; ctx.strokeRect(W/2+20,H/2+80,140,36);
  ctx.fillStyle='#555'; ctx.fillText('MENU [ESC]',W/2+90,H/2+104);
}

function render() {
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);
  if (currentScreen===SCREEN.WEAPON_SELECT) { renderWeaponSelect(); return; }
  if (currentScreen===SCREEN.WIN)           { renderWinScreen();    return; }

  const cam0=getCameraX(players[0]);
  const cam1=getCameraX(players[1]);

  // Render each split-screen viewport
  for (let vp=0;vp<2;vp++) {
    const cam=vp===0?cam0:cam1, offX=vp*HALF_W;
    ctx.save();
    ctx.beginPath(); ctx.rect(offX,0,HALF_W,H); ctx.clip();
    ctx.translate(offX-cam,0);

    renderBuilding(cam);  // background, floors, crates

    // Draw BOTH players (visible to both viewports)
    for (const p of players) drawPlayer(p);
    for (const b of bullets)  drawBullet(b);

    ctx.restore();

    // Aim trajectory line (after world translate)
    drawAimLine(players[vp], players[1-vp], offX, cam);
  }

  // HUD (screen-space)
  for (let i=0;i<2;i++) drawHUD(players[i], i*HALF_W);

  // Scope overlay
  for (let i=0;i<2;i++) {
    if (players[i].scoping||players[i].scopeCharge>0)
      drawScopeOverlay(players[i], i*HALF_W);
  }

  // Round message
  if (roundMsgTimer>0) {
    ctx.save(); ctx.globalAlpha=Math.min(roundMsgTimer,1);
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffcc00'; ctx.font='bold 48px monospace'; ctx.textAlign='center';
    ctx.fillText(roundMsg,W/2,H/2); ctx.restore();
  }

  // Divider line
  ctx.fillStyle='#1a1a2a'; ctx.fillRect(HALF_W-1,0,2,H);
}

// ============================================================
// SECTION 8: GAME LOOP
// ============================================================
let lastTime=0;
function loop(ts) {
  const dt=Math.min((ts-lastTime)/1000,0.05); lastTime=ts;
  update(dt); render(); requestAnimationFrame(loop);
}
function update(dt) {
  if (currentScreen===SCREEN.WEAPON_SELECT) { updateWeaponSelect(dt); return; }
  if (currentScreen===SCREEN.WIN)           { updateWin(dt);          return; }
  for (const p of players) {
    applyPhysics(p,dt); updateScoping(p,dt); updateReload(p,dt);
    updateHitFlash(p,dt); updateAimAssist(p,players[1-p.index]); updateAnimation(p,dt);
  }
  updateBullets(dt);
  if (roundMsgTimer>0) { roundMsgTimer-=dt; if(roundMsgTimer<=0) endRoundTransition(); }
}

initRound();
requestAnimationFrame(loop);
