'use strict';
/* ── OBSTACLE GAME ── Three.js 3D obstacle course ─────────────── */

// ── Physics constants ─────────────────────────────────────────────
const GRAVITY    = 30;
const JUMP_VEL   = 13;
const WALK_SPD   = 8;
const SPRINT_SPD = 18;
const PW = 0.4;   // player half-width / half-depth (collision)
const PH = 1.8;   // player height

// ── Three.js setup ────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 60, 220);

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera  = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 400);
const camera2 = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 400);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const a1 = gameMode===2 ? (window.innerWidth*0.5)/window.innerHeight : window.innerWidth/window.innerHeight;
  camera.aspect = a1; camera.updateProjectionMatrix();
  camera2.aspect = (window.innerWidth*0.5)/window.innerHeight; camera2.updateProjectionMatrix();
});

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xFFFADD, 1.1);
sun.position.set(60, 120, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera, {near:1, far:500, left:-200, right:200, top:200, bottom:-200});
scene.add(sun);

// ── Background music (Web Audio API) ─────────────────────────────
function startMusic() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value=0.22; master.connect(ctx.destination);

  function osc(freq, t, dur, type='square', vol=0.15) {
    if (!freq) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(master);
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.start(t); o.stop(t+dur+0.05);
  }
  function drum(t,vol=0.35,decay=400) {
    const buf=ctx.createBuffer(1,ctx.sampleRate*0.15,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i*decay/ctx.sampleRate);
    const s=ctx.createBufferSource(), g=ctx.createGain();
    s.buffer=buf; s.connect(g); g.connect(master);
    g.gain.value=vol; s.start(t);
  }

  const B=60/148; // beat at 148 BPM
  const mel=[523,659,784,659,523,0,440,523,587,740,880,740,587,523,0,494];
  const bas=[131,131,165,165,196,196,165,165,131,131,165,165,196,220,196,165];

  function bar(t) {
    mel.forEach((f,i)=>osc(f,t+i*B,B*0.75));
    bas.forEach((f,i)=>osc(f,t+i*B,B*1.7,'sine',0.12));
    for (let i=0;i<16;i++) {
      if (i%4===0) drum(t+i*B,0.4,350);        // kick
      else if (i%4===2) drum(t+i*B,0.25,900);  // snare
      drum(t+i*B*0.5,0.08,3000);               // hi-hat
    }
    setTimeout(()=>bar(ctx.currentTime+0.05),(16*B-0.3)*1000);
  }
  bar(ctx.currentTime+0.1);
}

// ── Sound FX ──────────────────────────────────────────────────────
let _ac = null;
function getAC() { if (!_ac) _ac = new (window.AudioContext||window.webkitAudioContext)(); return _ac; }
function sfx(freq, dur, type='sine', vol=0.18) {
  try {
    const c=getAC(), o=c.createOscillator(), g=c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol,c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);
    o.start(); o.stop(c.currentTime+dur+0.05);
  } catch(e){}
}
function sfxJump()       { sfx(440,0.15,'square',0.12); }
function sfxCheckpoint() { sfx(880,0.08); setTimeout(()=>sfx(1046,0.15),100); }
function sfxDie()        { sfx(220,0.3,'sawtooth',0.2); }
function sfxWin()        { [523,659,784,1046].forEach((f,i)=>setTimeout(()=>sfx(f,0.4),i*140)); }

// ── Game state ────────────────────────────────────────────────────
const player = {x:0, y:1, z:-10, vx:0, vy:0, vz:0, onGround:false, onIce:false};
let spawnPos = {x:0, y:1, z:-10};
let cpCount   = 0;
let coinCount = 0;
let isDead    = false;
let deadTimer = 0;
let chestOpened = false;
let gameWon   = false;
let gameOver  = false;
let startTime = null;
let elapsed   = 0;
let curSecIdx = -1;
const touch  = {up:false,down:false,left:false,right:false,jump:false,sprint:false};

// ── Game mode (set by mode select screen) ─────────────────────────
let gameMode = 0; // 0=waiting, 1=1P, 2=2P

// ── Player 2 state ────────────────────────────────────────────────
const player2 = {x:3, y:1, z:-10, vx:0, vy:0, vz:0, onGround:false, onIce:false};
let spawnPos2  = {x:3, y:1, z:-10};
let isDead2    = false, deadTimer2 = 0;
let jumpsLeft2 = 2, jumpConsumed2 = false;
let camYaw2    = 0;
let legT2      = 0;
let coinCount2 = 0, cpCount2 = 0;
let curSecIdx2 = -1;

// Section definitions (by min Z threshold descending)
const SECTIONS=[
  {zMin: 0,    name:'GREEN PLAINS'},
  {zMin:-205,  name:'FIRST GAPS'},
  {zMin:-355,  name:'LAVA FIELDS 🔥'},
  {zMin:-500,  name:'LASER HALL ⚡'},
  {zMin:-650,  name:'SKY BRIDGES ☁️'},
  {zMin:-810,  name:'CHAOS ZONE 💥'},
  {zMin:-958,  name:'FINAL SPRINT 🏃'},
  {zMin:-1025, name:'FROZEN PEAKS 🧊'},
  {zMin:-1185, name:'DARK DUNGEON 💀'},
  {zMin:-1355, name:'ICE ROAD ❄️'},
  {zMin:-1485, name:'GRAND FINISH 🏆'},
];

// ── Object lists ──────────────────────────────────────────────────
const platforms   = [];
const laserPivots = [];
const cpList      = [];
const coinMeshes  = [];
const bouncePads  = [];
const pitBalls    = [];
const snowballs   = [];
let soccerBall    = null;
const sbv         = {x:4.5, y:0, z:3.5}; // soccer ball velocity (fast)

// ── Platform builder ──────────────────────────────────────────────
function P(x,cy,z,w,h,d,col,deadly=false,mov=null) {
  const mat = new THREE.MeshLambertMaterial({
    color:col,
    emissive: deadly ? new THREE.Color(0xFF3300).multiplyScalar(0.35) : new THREE.Color(0),
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
  mesh.position.set(x,cy,z);
  mesh.castShadow=true; mesh.receiveShadow=true;
  scene.add(mesh);
  const obj = {x,y:cy,z,w,h,d,deadly,mesh,
    mov: mov ? {...mov,t:mov.phase||0, bx:x,by:cy,bz:z} : null};
  platforms.push(obj);
  return obj;
}

// Shorthand: platform at given TOP-surface Y
function T(x,topY,z,w,h,d,col,deadly=false,mov=null) {
  return P(x, topY-h/2, z, w, h, d, col, deadly, mov);
}

// ── Bounce pad builder ────────────────────────────────────────────
function BOUNCE(x,topY,z) {
  // Base
  const base=new THREE.Mesh(new THREE.BoxGeometry(3,0.3,3),
    new THREE.MeshLambertMaterial({color:0x33CC33}));
  base.position.set(x,topY-0.15,z); scene.add(base);
  // Spring coils
  for (let i=0;i<3;i++){
    const coil=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.12,6,10),
      new THREE.MeshLambertMaterial({color:0xFFDD00,emissive:new THREE.Color(0xFFAA00).multiplyScalar(0.4)}));
    coil.rotation.x=Math.PI/2;
    coil.position.set(x+(i-1)*0.8, topY+0.18, z); scene.add(coil);
  }
  // Top pad
  const pad=new THREE.Mesh(new THREE.BoxGeometry(3,0.18,3),
    new THREE.MeshLambertMaterial({color:0xFFDD00,emissive:new THREE.Color(0xFFAA00).multiplyScalar(0.5)}));
  pad.position.set(x,topY+0.36,z); scene.add(pad);
  // Invisible solid platform underneath
  T(x,topY,z,3,0.55,3,0x33CC33);
  bouncePads.push({x,y:topY+0.36,z,w:3,d:3});
}

// ── Laser builder ─────────────────────────────────────────────────
function L(x,y,z,spd,armLen,initAng=0) {
  const piv = new THREE.Group();
  piv.position.set(x,y,z);
  piv.rotation.y = initAng;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14,0.14,armLen*2,8),
    new THREE.MeshLambertMaterial({color:0xFF0000, emissive:new THREE.Color(0xFF0000).multiplyScalar(0.9)})
  );
  beam.rotation.z = Math.PI/2;
  piv.add(beam);
  // Glow sphere at pivot
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),
    new THREE.MeshLambertMaterial({color:0xFF4400, emissive:new THREE.Color(0xFF2200).multiplyScalar(0.8)}));
  piv.add(glow);
  scene.add(piv);
  laserPivots.push({piv,spd,armLen,x,y,z});
}

// ── Checkpoint builder ────────────────────────────────────────────
function CP(x,topY,z,idx) {
  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1,0.1,5,7),
    new THREE.MeshLambertMaterial({color:0xFFD700})
  );
  pole.position.set(x, topY+2.5, z);
  scene.add(pole);
  // Banner
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(2.2,0.8,0.1),
    new THREE.MeshLambertMaterial({color:0xFFAA00})
  );
  banner.position.set(x, topY+5.2, z);
  scene.add(banner);
  // Spinning coin
  const coin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55,0.55,0.12,14),
    new THREE.MeshLambertMaterial({color:0xFFD700, emissive:new THREE.Color(0xFFAA00).multiplyScalar(0.6)})
  );
  coin.position.set(x, topY+4, z);
  coin.rotation.x = Math.PI/2;
  scene.add(coin);
  const obj={x,y:topY,z,idx,collected:false,coin};
  cpList.push(obj);
  return obj;
}

// ── Floating coin ─────────────────────────────────────────────────
function CO(x,y,z) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32,0.32,0.1,12),
    new THREE.MeshLambertMaterial({color:0xFFD700,emissive:new THREE.Color(0xFFAA00).multiplyScalar(0.5)})
  );
  m.position.set(x,y,z);
  m.rotation.x=Math.PI/2;
  scene.add(m);
  coinMeshes.push({x,y,z,mesh:m,collected:false});
}

// ── Sky decoration ────────────────────────────────────────────────
function cloud(x,y,z) {
  const cm = new THREE.MeshLambertMaterial({color:0xffffff});
  for (let i=0;i<4;i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.5+Math.random(),7,7),cm);
    c.position.set(x+i*2.2,y+Math.random()*0.8,z);
    scene.add(c);
  }
}
for (let i=0;i<18;i++) cloud((Math.random()-0.5)*300,25,-100-Math.random()*700);

// ──────────────────────────────────────────────────────────────────
// ── THE COURSE ────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────

// SECTION 0 — GREEN PLAINS — nearly touching, no height changes
T(0,  0, -30,  22, 1, 62, 0x66CC44);   // z=0 to -61
CO(3,1.8,-20); CO(-3,1.8,-42); CO(0,1.8,-55);
T(0,  0, -83,  22, 1, 42, 0x55BB44);   // gap 0 (touching), z=-62 to -104
CO(2,1.8,-76); CO(-2,1.8,-92);
T(0,  0,-124,  22, 1, 36, 0x66CC44);   // gap 2, z=-106 to -142
CO(0,1.8,-120); CO(2,1.8,-135);
T(0,  0,-162,  22, 1, 36, 0x77DD55);   // gap 2, z=-144 to -180
CO(0,1.8,-158); CO(-2,1.8,-170);
T(0,  0,-200,  22, 1, 36, 0x66CC44);   // gap 2, z=-182 to -218
CO(0,1.8,-196); CO(3,1.8,-208);
CP(0, 0,-224, 0);

// SECTION 1 — FIRST GAPS — very small gaps, wide platforms
T(0,  0,-240,  18, 1, 22, 0x55BB44);   // z=-229 to -251, gap ~3
CO(0,1.8,-240);
T(0,  0,-260,  18, 1, 22, 0x55BB44);   // gap 1
CO(0,1.8,-260);
T(0,  0,-280,  18, 1, 22, 0x55BB44);   // gap 1
CO(0,1.8,-280);
T(0,  0,-300,  18, 1, 22, 0x55BB44);   // gap 1
CO(0,1.8,-300);
T(0,  0,-320,  18, 1, 22, 0x55BB44);   // gap 1
CO(0,1.8,-317); CO(3,1.8,-325);
CP(0,  0,-338, 1);
T(0,  0,-350, 18, 1, 24, 0x55BB44);  // bridge straight into lava section, no gap

// SECTION 2 — LAVA FIELDS (z=-355 to z=-490)
// Lava floor
P(0, -1.5, -425, 80, 1, 140, 0xFF4400, true);
// Lava glow plane
const lavaGlow = new THREE.Mesh(new THREE.PlaneGeometry(80,140),
  new THREE.MeshLambertMaterial({color:0xFF6600,emissive:new THREE.Color(0xFF4400).multiplyScalar(0.6)}));
lavaGlow.rotation.x=-Math.PI/2; lavaGlow.position.set(0,-0.99,-425); scene.add(lavaGlow);
// Platforms over lava — ground level (y=0), super close together
T(0,  0,-358, 16, 0.8, 18, 0xAA6633);  // entry, gap ~2 from section 1
T(0,  0,-379, 16, 0.8, 20, 0xBB7744);  // gap 1
CO(0,1.8,-370); CO(3,1.8,-382);
T(0,  0,-401, 16, 0.8, 20, 0xAA6633);  // gap 0
CO(0,1.8,-401);
T(0,  0,-423, 14, 0.8, 20, 0xBB7744, false, {axis:'x',range:1,spd:0.35}); // barely drifts
CO(0,1.8,-423);
T(0,  0,-445, 16, 0.8, 20, 0xAA6633);  // gap 1
CO(0,1.8,-445);
T(0,  0,-467, 14, 0.8, 20, 0xBB7744, false, {axis:'y',range:0.4,spd:0.3}); // barely bobs
T(0,  0,-488, 18, 0.8, 22, 0xAA6633);  // big landing
CO(0,1.8,-467); CO(0,1.8,-482);
CP(0, 0,-496, 2);

// SECTION 3 — LASER HALL (z=-500 to z=-640)
// Hall floor + walls
T(0,  0,-570,  12, 1, 140, 0x223366);
P(-7, 3,-570, 1, 8, 140, 0x112244); // left wall
P( 7, 3,-570, 1, 8, 140, 0x112244); // right wall
// Ceiling glow strips
for (let i=0;i<7;i++) {
  const strip=new THREE.Mesh(new THREE.BoxGeometry(12,0.1,2),
    new THREE.MeshLambertMaterial({color:0x4466FF,emissive:new THREE.Color(0x2244CC).multiplyScalar(0.7)}));
  strip.position.set(0,6.8,-510-i*18); scene.add(strip);
}
// Rotating lasers — slower speed, shorter arms, easier to dodge
L(0, 1.8,-515, 0.55, 3.8, 0);
L(0, 1.8,-533,-0.6,  3.8, Math.PI/3);
L(0, 1.8,-550, 0.5,  3.8, Math.PI*0.7);
L(0, 1.8,-568,-0.55, 3.8, Math.PI/5);
L(0, 1.8,-586, 0.65, 3.8, Math.PI*1.4);
L(0, 1.8,-604,-0.5,  3.8, Math.PI*0.9);
// 30 coins scattered across the laser hall floor
CO(-4,1.5,-508); CO(0,1.5,-508); CO(4,1.5,-508);
CO(-4,1.5,-519); CO(0,1.5,-519); CO(4,1.5,-519);
CO(-4,1.5,-530); CO(0,1.5,-530); CO(4,1.5,-530);
CO(-4,1.5,-542); CO(0,1.5,-542); CO(4,1.5,-542);
CO(-4,1.5,-554); CO(0,1.5,-554); CO(4,1.5,-554);
CO(-4,1.5,-566); CO(0,1.5,-566); CO(4,1.5,-566);
CO(-4,1.5,-578); CO(0,1.5,-578); CO(4,1.5,-578);
CO(-4,1.5,-590); CO(0,1.5,-590); CO(4,1.5,-590);
CO(-4,1.5,-602); CO(0,1.5,-602); CO(4,1.5,-602);
CO(-4,1.5,-614); CO(0,1.5,-614); CO(4,1.5,-614);
CP(0, 0,-635, 3);

// SECTION 4 — SKY BRIDGES — all y=0, near-touching, wide platforms
P(0,-18,-720, 120, 1, 160, 0x220011, true); // deep void below
// Bridge from laser hall directly into cloud section (no gap, no height change)
T(0,  0,-648, 16, 0.8, 22, 0xAABBFF);   // front=-637, back=-659
T(0,  0,-671, 16, 0.8, 22, 0xAABBFF);   // gap 0 (touching)
CO(3,1.8,-660); CO(-3,1.8,-672);
T(0,  0,-693, 16, 0.8, 22, 0x99AAEE);   // gap 0
T(0,  0,-715, 16, 0.8, 22, 0xAABBFF);   // gap 0
CO(0,1.8,-694); CO(0,1.8,-716);
T(0,  0,-737, 16, 0.8, 22, 0x99AAEE);   // gap 0
T(0,  0,-759, 16, 0.8, 22, 0xAABBFF);   // gap 0
CO(0,1.8,-738); CO(0,1.8,-760);
T(0,  0,-781, 16, 0.8, 22, 0x8899EE);   // gap 0
CP(0,  0,-792, 4);

// SECTION 5 — CHAOS ZONE — wide floor connected directly from cloud CP
T(0,  0,-887,  18, 1, 190, 0x442255);   // front=-792, covers all the way through
CO(0,1.8,-830); CO(3,1.8,-855); CO(-3,1.8,-880); CO(0,1.8,-905);
CP(0, 0,-945, 5);

// FINAL SPRINT — connected directly, no gap
T(0,  0,-985,  18, 1,  90, 0x44AA44);   // covers -940 to -1030, no gap after CP
CO(2,1.8,-960); CO(-2,1.8,-978); CO(0,1.8,-998);

// ── SECTION 6: FROZEN PEAKS — entry bridge, no gap ────────────────
T(0,  0,-1040,  16, 1, 20, 0xCCEEFF);   // overlaps final sprint, no gap
// Death floor below (void)
P(0,-18,-1090, 120, 1, 180, 0x112233, true);
// Ice platforms (light blue, narrow)
T(0,  2,-1030,  8,0.6,12,0xAADDFF);
BOUNCE(4, 2, -1048);
T(-3, 4,-1062,  4,0.6, 8,0x99CCEE);
T(3,  2,-1078,  4,0.6, 8,0xAADDFF);
T(-2, 5,-1094,  3,0.6, 7,0x99CCEE);
T(2,  2,-1110,  3,0.6, 7,0xAADDFF);
BOUNCE(0, 2, -1120);
T(0,  6,-1132,  5,0.6,10,0x99CCEE);
T(-3, 3,-1148,  4,0.6, 8,0xAADDFF);
T(0,  2,-1162,  9,0.6,12,0xCCEEFF);
CO(0,3.8,-1030); CO(-3,5.8,-1062); CO(2,3.8,-1110); CO(0,7.8,-1132);
// Icicles decoration
for(let i=0;i<8;i++){
  const ic=new THREE.Mesh(new THREE.ConeGeometry(0.2,1.5+Math.random(),5),
    new THREE.MeshLambertMaterial({color:0xAADDFF,transparent:true,opacity:0.8}));
  ic.rotation.x=Math.PI; ic.position.set((Math.random()-0.5)*18, 8+Math.random()*2, -1040-i*15); scene.add(ic);
}
CP(0, 2,-1170, 6);

// ── SECTION 7: DARK DUNGEON — easy, wide floor, slow lasers ──────
T(0,  0,-1260, 14, 1, 160, 0x443322);  // wide solid floor the whole way
P(-8, 4,-1260,  1,10,160, 0x332211);   // keep walls for atmosphere
P( 8, 4,-1260,  1,10,160, 0x332211);
// Torch lights
for(let i=0;i<6;i++){
  const torch=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.8,0.3),
    new THREE.MeshLambertMaterial({color:0x884400}));
  torch.position.set(i%2===0?-7.5:7.5, 4, -1210-i*20); scene.add(torch);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.6,6),
    new THREE.MeshLambertMaterial({color:0xFF6600,emissive:new THREE.Color(0xFF4400).multiplyScalar(0.9)}));
  flame.position.set(i%2===0?-7.5:7.5, 4.7, -1210-i*20); scene.add(flame);
}
// Two slow lasers only — easy to walk past
L(0, 2.5,-1240, 0.45, 3.5, 0);
L(0, 2.5,-1290,-0.45, 3.5, Math.PI/2);
CO(0,1.8,-1220); CO(0,1.8,-1250); CO(0,1.8,-1280); CO(0,1.8,-1310);
CP(0, 0,-1320, 7);

// ── SECTION 8: ICE ROAD (z=-1335 to z=-1518) ─────────────────────
// Snow & ice platforms — slippery! Rolling snowballs = instant death

// Helper: rolling snowball hazard
function SNOWBALL(cx, topY, cz, speed, rangeX) {
  const r=0.55+Math.random()*0.2;
  const sx=cx+(Math.random()-0.5)*rangeX*0.6;
  const mat=new THREE.MeshLambertMaterial({
    color:0xCCEEFF, emissive:new THREE.Color(0x6699FF).multiplyScalar(0.12)});
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),mat);
  mesh.castShadow=true; mesh.position.set(sx,topY+r+0.05,cz); scene.add(mesh);
  snowballs.push({mesh,x:sx,y:topY+r+0.05,z:cz,vx:speed*(Math.random()>0.5?1:-1),r,cx,rangeX});
}
// Helper: snow pile decoration
function SNOWPILE(x,topY,cz,s=1) {
  const m=new THREE.MeshLambertMaterial({color:0xEEEEFF});
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.5*s,6,4),m);
  b.scale.y=0.45; b.position.set(x,topY+0.22*s,cz); scene.add(b);
  const t=new THREE.Mesh(new THREE.SphereGeometry(0.3*s,6,4),m);
  t.scale.y=0.45; t.position.set(x,topY+0.42*s,cz); scene.add(t);
}
// Helper: hanging icicle
function ICICLE(x,topY,cz) {
  const m=new THREE.MeshLambertMaterial({color:0xAADDFF,transparent:true,opacity:0.85});
  const ic=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.8+Math.random()*0.6,5),m);
  ic.position.set(x,topY-0.5,cz); ic.rotation.z=Math.PI; scene.add(ic);
}

P(0,-20,-1405,120,1,160,0x001020,true); // icy void below

// Ice entry ramp
const ie0=T(0,0,-1340,12,1,16,0xAADDFF); ie0.icy=true;
SNOWPILE(-3,0,-1337,0.8); SNOWPILE(3,0,-1342,0.8);

// Platform 1 — ice blue, 1 snowball
const ie1=T(0,0,-1362,14,0.8,18,0x88CCFF); ie1.icy=true;
SNOWBALL(0,0,-1362,2.8,5); CO(0,1.8,-1362);
SNOWPILE(-5,0,-1360,0.7); SNOWPILE(5,0,-1364,0.65);
ICICLE(-4,-0.4,-1368); ICICLE(4,-0.4,-1356);

// Platform 2 — snow white, 1 snowball
const ie2=T(0,0,-1383,14,0.8,18,0xDDEEFF); ie2.icy=true;
SNOWBALL(0,0,-1383,3.2,5); CO(0,1.8,-1383);
SNOWPILE(-4,0,-1382,0.9); SNOWPILE(4,0,-1385,1.0);

// Platform 3 — deep ice, 2 snowballs
const ie3=T(0,0,-1404,15,0.8,18,0x77BBEE); ie3.icy=true;
SNOWBALL(-2,0,-1404,2.5,5); SNOWBALL(3,0,-1404,3.8,5); CO(0,1.8,-1404);
ICICLE(-5,-0.4,-1410); ICICLE(5,-0.4,-1398);

// Platform 4 — snowy, wide, 1 snowball + piles
const ie4=T(0,0,-1425,16,0.8,18,0xEEFFFF); ie4.icy=true;
SNOWBALL(0,0,-1425,3.5,6); CO(0,1.8,-1425);
SNOWPILE(-6,0,-1423,1.1); SNOWPILE(0,0,-1425,1.2); SNOWPILE(6,0,-1427,0.9);

// Platform 5 — narrow ice, fast snowball
const ie5=T(0,0,-1446,13,0.8,18,0x55AADD); ie5.icy=true;
SNOWBALL(0,0,-1446,5.0,4); CO(0,1.8,-1446);
SNOWPILE(-3,0,-1444,0.8); SNOWPILE(3,0,-1448,0.75);
ICICLE(-4,-0.4,-1452); ICICLE(3,-0.4,-1440);

// Platform 6 — snow, 2 snowballs
const ie6=T(0,0,-1467,15,0.8,18,0xDDEEFF); ie6.icy=true;
SNOWBALL(-2,0,-1467,4.0,5); SNOWBALL(3,0,-1467,2.8,5); CO(0,1.8,-1467);
SNOWPILE(5,0,-1465,1.0);

// Platform 7 — pure ice, fast + narrow
const ie7=T(0,0,-1488,14,0.8,18,0x88DDFF); ie7.icy=true;
SNOWBALL(0,0,-1488,5.5,5); CO(0,1.8,-1488);
SNOWPILE(-4,0,-1486,0.85); ICICLE(4,-0.4,-1494);

// Final ice landing pad
const ieFin=T(0,0,-1508,16,1,20,0xCCEEFF); ieFin.icy=true;
SNOWPILE(-5,0,-1506,1.1); SNOWPILE(5,0,-1510,1.0); SNOWPILE(0,0,-1508,1.3);
CO(3,1.8,-1502); CO(-3,1.8,-1512);
CP(0,0,-1518,8);

// ── FINAL RUSH to END ─────────────────────────────────────────────
T(0, 0,-1490, 14, 1, 30, 0x44BB55);
CO(2,1.8,-1485); CO(-2,1.8,-1495); CO(0,1.8,-1505);

// ──────────────────────────────────────────────────────────────────
// ── GRAND FINISH ISLAND ───────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────
const END_Z = -1590;

// Giant finish platform
T(0,   0, END_Z, 100, 1,  90, 0x44AA55);
// Back wall
P(0, 14, END_Z-45, 100, 28, 2, 0x336633);
// Side walls
P(-50, 8, END_Z, 2, 16, 90, 0x336633);
P( 50, 8, END_Z, 2, 16, 90, 0x336633);

// Entrance platform (connects last rush to end island)
T(0,   0, END_Z+52, 12, 1, 24, 0x44BB44);

// ── Ball Pit ──────────────────────────────────────────────────────
const PIT_X=-28, PIT_Z=END_Z;
P(PIT_X, -1.5, PIT_Z, 22, 2, 22, 0x222222);        // pit floor
P(PIT_X-11, 1.5, PIT_Z, 1, 4, 22, 0xDD4466);       // left wall
P(PIT_X+11, 1.5, PIT_Z, 1, 4, 22, 0xDD4466);       // right wall
P(PIT_X, 1.5, PIT_Z-11, 20, 4, 1, 0xDD4466);       // back wall
P(PIT_X, 1.5, PIT_Z+11, 20, 4, 1, 0xEE5577);       // front wall
// Balls
const BALL_COLS=[0xFF4444,0xFF8844,0xFFFF44,0x44FF44,0x44FFFF,0x4488FF,0xFF44FF,0xFF8888,0xFFFFAA,0xAAFFAA];
for (let i=0;i<55;i++) {
  const r=0.55+Math.random()*0.25;
  const b=new THREE.Mesh(
    new THREE.SphereGeometry(r,8,8),
    new THREE.MeshLambertMaterial({color:BALL_COLS[i%BALL_COLS.length]})
  );
  const bx=PIT_X+(Math.random()-0.5)*16;
  const bz=PIT_Z+(Math.random()-0.5)*16;
  const by=0.5+Math.random()*1.5;
  b.position.set(bx, by, bz);
  scene.add(b);
  pitBalls.push({mesh:b, r, x:bx, y:by, z:bz,
    vx:(Math.random()-0.5)*4, vy:1+Math.random()*3, vz:(Math.random()-0.5)*4});
}
// "BALL PIT" sign
{
  const sm=new THREE.Mesh(new THREE.BoxGeometry(10,1.5,0.2), new THREE.MeshLambertMaterial({color:0xDD4466}));
  sm.position.set(PIT_X,4.5,PIT_Z+11.2); scene.add(sm);
}

// ── Soccer Field ──────────────────────────────────────────────────
const SOC_X=28, SOC_Z=END_Z;
const fieldMesh=new THREE.Mesh(new THREE.PlaneGeometry(26,18),new THREE.MeshLambertMaterial({color:0x22AA44}));
fieldMesh.rotation.x=-Math.PI/2; fieldMesh.position.set(SOC_X,0.01,SOC_Z); scene.add(fieldMesh);
// Lines
[[SOC_X,SOC_Z,26,0.15],[SOC_X,SOC_Z,0.15,18]].forEach(([x,z,w,d2])=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d2),new THREE.MeshLambertMaterial({color:0xffffff}));
  m.rotation.x=-Math.PI/2; m.position.set(x,0.02,z); scene.add(m);
});
const ring=new THREE.Mesh(new THREE.RingGeometry(1.8,2.1,24),new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide}));
ring.rotation.x=-Math.PI/2; ring.position.set(SOC_X,0.02,SOC_Z); scene.add(ring);
// Goals
function mkGoal(gx,gz) {
  const gm=new THREE.MeshLambertMaterial({color:0xffffff});
  const p1=new THREE.Mesh(new THREE.BoxGeometry(0.15,2.2,0.15),gm); p1.position.set(gx,1.1,gz-2.4); scene.add(p1);
  const p2=p1.clone(); p2.position.set(gx,1.1,gz+2.4); scene.add(p2);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.15,4.8),gm); bar.position.set(gx,2.2,gz); scene.add(bar);
  const net=new THREE.Mesh(new THREE.BoxGeometry(0.5,2.2,4.8),
    new THREE.MeshLambertMaterial({color:0xffffff,wireframe:true,opacity:0.6,transparent:true}));
  net.position.set(gx-0.25,1.1,gz); scene.add(net);
}
mkGoal(SOC_X-13,SOC_Z); mkGoal(SOC_X+13,SOC_Z);
const sball=new THREE.Mesh(new THREE.SphereGeometry(0.55,12,12),new THREE.MeshLambertMaterial({color:0xffffff}));
sball.position.set(SOC_X,0.55,SOC_Z); scene.add(sball);
soccerBall = sball;
// Scoreboard
const sbp=new THREE.Mesh(new THREE.BoxGeometry(0.22,6.5,0.22),new THREE.MeshLambertMaterial({color:0x885533}));
sbp.position.set(SOC_X,3.25,SOC_Z-12); scene.add(sbp);
const sbb=new THREE.Mesh(new THREE.BoxGeometry(8,3,0.18),new THREE.MeshLambertMaterial({color:0x001133}));
sbb.position.set(SOC_X,6.5,SOC_Z-12); scene.add(sbb);
const sbscore=new THREE.Mesh(new THREE.BoxGeometry(6,1.8,0.1),new THREE.MeshLambertMaterial({color:0x0044AA}));
sbscore.position.set(SOC_X,6.6,SOC_Z-12.1); scene.add(sbscore);

// ── Chest ─────────────────────────────────────────────────────────
const CHEST_X=0, CHEST_Z=END_Z-30;
let chestLidMesh=null;
{
  const bm=new THREE.MeshLambertMaterial({color:0x8B5A2B});
  const lm=new THREE.MeshLambertMaterial({color:0x6B4020});
  const gm=new THREE.MeshLambertMaterial({color:0xFFD700});
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.4,1.8),bm);
  base.position.set(CHEST_X,0.7,CHEST_Z); scene.add(base);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(2.6,0.6,1.8),lm);
  lid.position.set(CHEST_X,1.7,CHEST_Z); scene.add(lid);
  chestLidMesh=lid;
  // Gold trim
  const trim=new THREE.Mesh(new THREE.BoxGeometry(2.65,0.15,1.85),gm);
  trim.position.set(CHEST_X,1.4,CHEST_Z); scene.add(trim);
  // Lock
  const lock=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.45,0.18),gm);
  lock.position.set(CHEST_X,0.9,CHEST_Z+0.92); scene.add(lock);
  // Glow ring
  const gring=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.1,8,24),
    new THREE.MeshLambertMaterial({color:0xFFD700,emissive:new THREE.Color(0xFFD700).multiplyScalar(0.5)}));
  gring.rotation.x=Math.PI/2; gring.position.set(CHEST_X,0.05,CHEST_Z); scene.add(gring);
}
// "FINISH" banner above chest
{
  const bp=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,8,6),new THREE.MeshLambertMaterial({color:0xDDCC99}));
  bp.position.set(CHEST_X,4,CHEST_Z); scene.add(bp);
  const bb=new THREE.Mesh(new THREE.BoxGeometry(8,1.4,0.12),new THREE.MeshLambertMaterial({color:0xFFAA00}));
  bb.position.set(CHEST_X,8.2,CHEST_Z); scene.add(bb);
}

// ── Player character ──────────────────────────────────────────────
const playerMesh = (function(){
  const g=new THREE.Group();
  const skin =new THREE.MeshLambertMaterial({color:0xFFCC99});
  const shirt=new THREE.MeshLambertMaterial({color:0xCC2222});
  const pants=new THREE.MeshLambertMaterial({color:0x222288});
  const boot =new THREE.MeshLambertMaterial({color:0x553311});
  const wht  =new THREE.MeshLambertMaterial({color:0xDDDDDD});

  // Boots
  const lb=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.22,0.34),boot); lb.position.set(-0.16,0.11,0.04); g.add(lb);
  const rb=lb.clone(); rb.position.x=0.16; g.add(rb);
  // Legs
  const ll=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.55,0.24),pants); ll.position.set(-0.16,0.49,0); g.add(ll);
  const rl=ll.clone(); rl.position.x=0.16; g.add(rl);
  // Body
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.75,0.36),shirt); body.position.y=0.98; g.add(body);
  // Arms
  const la=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.5,0.2),shirt); la.position.set(-0.42,0.92,0); g.add(la);
  const ra=la.clone(); ra.position.x=0.42; g.add(ra);
  // Head
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),skin); head.position.y=1.63; g.add(head);
  // Eyes
  const eye=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.05),new THREE.MeshLambertMaterial({color:0x111111}));
  eye.position.set(-0.12,1.68,0.26); g.add(eye);
  const eye2=eye.clone(); eye2.position.x=0.12; g.add(eye2);
  // Hair
  const hair=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.18,0.52),new THREE.MeshLambertMaterial({color:0x442200}));
  hair.position.y=1.97; g.add(hair);

  g.userData.ll=ll; g.userData.rl=rl; g.userData.la=la; g.userData.ra=ra;
  scene.add(g);
  return g;
})();

// Player 2 mesh — blue shirt, green pants, blonde hair
const playerMesh2 = (function(){
  const g=new THREE.Group();
  const skin =new THREE.MeshLambertMaterial({color:0xFFCC99});
  const shirt=new THREE.MeshLambertMaterial({color:0x1144CC}); // blue
  const pants=new THREE.MeshLambertMaterial({color:0x226622}); // green
  const boot =new THREE.MeshLambertMaterial({color:0x553311});
  const lb=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.22,0.34),boot); lb.position.set(-0.16,0.11,0.04); g.add(lb);
  const rb=lb.clone(); rb.position.x=0.16; g.add(rb);
  const ll=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.55,0.24),pants); ll.position.set(-0.16,0.49,0); g.add(ll);
  const rl=ll.clone(); rl.position.x=0.16; g.add(rl);
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.75,0.36),shirt); body.position.y=0.98; g.add(body);
  const la=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.5,0.2),shirt); la.position.set(-0.42,0.92,0); g.add(la);
  const ra=la.clone(); ra.position.x=0.42; g.add(ra);
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),skin); head.position.y=1.63; g.add(head);
  const eye=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.05),new THREE.MeshLambertMaterial({color:0x111111}));
  eye.position.set(-0.12,1.68,0.26); g.add(eye);
  const eye2=eye.clone(); eye2.position.x=0.12; g.add(eye2);
  const hair=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.18,0.52),new THREE.MeshLambertMaterial({color:0xFFCC00}));
  hair.position.y=1.97; g.add(hair);
  g.userData.ll=ll; g.userData.rl=rl; g.userData.la=la; g.userData.ra=ra;
  g.visible=false; // hidden until 2P mode
  scene.add(g);
  return g;
})();

// ── Bot AI helpers ────────────────────────────────────────────────
function getBotGround(bx, bz) {
  let best = -999;
  for (const p of platforms) {
    if (p.deadly) continue;
    const mx=p.mesh.position.x, my=p.mesh.position.y, mz=p.mesh.position.z;
    if (bx>mx-p.w/2-0.25 && bx<mx+p.w/2+0.25 && bz>mz-p.d/2-0.25 && bz<mz+p.d/2+0.25) {
      const top=my+p.h/2; if (top>best) best=top;
    }
  }
  return best;
}
function botOnDeadly(bx, by, bz) {
  for (const p of platforms) {
    if (!p.deadly) continue;
    const mx=p.mesh.position.x, my=p.mesh.position.y, mz=p.mesh.position.z;
    if (bx>mx-p.w/2 && bx<mx+p.w/2 && bz>mz-p.d/2 && bz<mz+p.d/2 && Math.abs(by-(my+p.h/2))<0.3) return true;
  }
  return false;
}
function botLaserDanger(bx, bz) {
  for (const lz of laserPivots) {
    if (Math.abs(bz-lz.z)>12) continue;
    const ang=lz.piv.rotation.y;
    const toBotAng=Math.atan2(-(bz-lz.z), bx-lz.x);
    const diff=Math.abs(((toBotAng-ang+Math.PI*3)%(Math.PI*2))-Math.PI);
    if (diff<0.35 && Math.sqrt((bx-lz.x)**2+(bz-lz.z)**2)<lz.armLen+0.6) return true;
  }
  return false;
}

// ── Bots ──────────────────────────────────────────────────────────
const BOT_COLS=[
  0xFF4444,0xFF8844,0xFFDD00,0x44FF44,0x44FFFF,0x4488FF,0xFF44FF,0xFFAA44,
  0xAAFF44,0x44FFAA,0xFF4488,0x88FF44,0xFF6644,0x44AAFF,0xFFAA88,0x88AAFF,
  0xFF88AA,0xAAFF88,0xFF4466,0x66FF44,0xCC44FF,0xFF44CC,0x44CCFF,0xFFCC44,
  0x44FFCC,0xCC88FF,0xFF8844,0x44FF88,0x8844FF,0xFF4422
];

function mkBotMesh(col) {
  const g=new THREE.Group();
  const bm=new THREE.MeshLambertMaterial({color:col});
  const dm=new THREE.MeshLambertMaterial({color:new THREE.Color(col).multiplyScalar(0.55)});
  const sk=new THREE.MeshLambertMaterial({color:0xFFCC99});
  // Boots
  const bk=new THREE.MeshLambertMaterial({color:0x553311});
  const lb=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.18,0.3),bk); lb.position.set(-0.14,0.09,0.04); g.add(lb);
  const rb=lb.clone(); rb.position.x=0.14; g.add(rb);
  // Legs
  const lg=new THREE.BoxGeometry(0.22,0.52,0.22);
  const ll=new THREE.Mesh(lg,dm); ll.position.set(-0.14,0.46,0);
  const rl=new THREE.Mesh(lg,dm); rl.position.set(0.14,0.46,0);
  g.add(ll,rl);
  // Body
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.72,0.34),bm); body.position.y=0.97; g.add(body);
  // Arms
  const ag=new THREE.BoxGeometry(0.2,0.5,0.2);
  const la=new THREE.Mesh(ag,bm); la.position.set(-0.42,0.9,0);
  const ra=new THREE.Mesh(ag,bm); ra.position.set(0.42,0.9,0);
  g.add(la,ra);
  // Hands
  const hg=new THREE.BoxGeometry(0.22,0.22,0.22);
  const lh=new THREE.Mesh(hg,sk); lh.position.set(-0.42,0.62,0);
  const rh=new THREE.Mesh(hg,sk); rh.position.set(0.42,0.62,0);
  g.add(lh,rh);
  // Head
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.44,0.44,0.44),sk); head.position.y=1.6; g.add(head);
  // Eyes
  const em=new THREE.MeshLambertMaterial({color:0x111111});
  const le=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.09,0.05),em); le.position.set(-0.11,1.65,0.23); g.add(le);
  const re=le.clone(); re.position.x=0.11; g.add(re);
  g.userData.ll=ll; g.userData.rl=rl; g.userData.la=la; g.userData.ra=ra;
  g.userData.lh=lh; g.userData.rh=rh;
  scene.add(g);
  return g;
}

// Waypoints guide bots through the centre of each section
const BOT_WPS=[
  {z:0,x:0},{z:-100,x:0},{z:-220,x:0},{z:-340,x:0},{z:-430,x:0},
  {z:-500,x:0},{z:-640,x:0},{z:-660,x:0},{z:-720,x:0},{z:-790,x:0},
  {z:-870,x:0},{z:-950,x:0},{z:-1040,x:0},{z:-1120,x:0},{z:-1170,x:0},
  {z:-1200,x:0},{z:-1265,x:0},{z:-1320,x:0},{z:-1355,x:0},{z:-1450,x:0},
  {z:-1520,x:0},{z:-1590,x:0},
];

const bots=[];
for(let i=0;i<30;i++){
  const spd=10+Math.random()*8;
  const lane=(Math.random()-0.5)*8;    // each bot picks its own x lane -4 to +4
  const oz=-(Math.random()*120);       // stagger start
  const mesh=mkBotMesh(BOT_COLS[i%BOT_COLS.length]);
  mesh.position.set(lane,0,oz);
  // First 10 = soccer players, next 10 = ball pit players, last 10 = wanderers
  const role = i<10 ? 'soccer' : i<20 ? 'ballpit' : 'wander';
  const team = i<5 ? 'A' : 'B'; // soccer teams (attack opposite goals)
  bots.push({mesh, spd, x:lane, z:oz, y:0, vy:0, lane, role, team,
    legT:Math.random()*Math.PI*2, wpIdx:0, wobble:Math.random()*Math.PI*2,
    onGround:true, dead:false, deadTimer:0, jumpTimer:2+Math.random()*4,
    finished:false, wanderTX:0, wanderTZ:-1590, wanderTimer:0});
}

// Sprint trail particles
const trailParts = [];
function spawnTrail() {
  const g=new THREE.Mesh(new THREE.SphereGeometry(0.12,5,5),
    new THREE.MeshLambertMaterial({color:0xFF8800,emissive:new THREE.Color(0xFF5500).multiplyScalar(0.7),transparent:true,opacity:0.8}));
  g.position.set(player.x+(Math.random()-0.5)*0.3, player.y+0.9, player.z+(Math.random()-0.5)*0.3);
  scene.add(g);
  trailParts.push({mesh:g, life:0.4, age:0});
}

// ── Input ─────────────────────────────────────────────────────────
const keys={};
document.addEventListener('keydown', e=>{
  keys[e.code]=true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e=>{ keys[e.code]=false; });

// Mobile buttons
[['b-up','up'],['b-down','down'],['b-left','left'],['b-right','right']].forEach(([id,dir])=>{
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('pointerdown',e=>{touch[dir]=true;e.preventDefault();});
  el.addEventListener('pointerup',()=>touch[dir]=false);
  el.addEventListener('pointercancel',()=>touch[dir]=false);
});
const jBtn=document.getElementById('b-jump');
if(jBtn){
  jBtn.addEventListener('pointerdown',e=>{touch.jump=true;e.preventDefault();});
  jBtn.addEventListener('pointerup',()=>touch.jump=false);
}
const sBtn=document.getElementById('b-sprint');
if(sBtn){
  sBtn.addEventListener('pointerdown',e=>{touch.sprint=true;e.preventDefault();});
  sBtn.addEventListener('pointerup',()=>touch.sprint=false);
}
let jumpConsumed=false;
let jumpsLeft=2;
let camYaw=0; // camera starts behind player

// Mouse drag to rotate camera
let mouseDragging=false, lastMX=0;
canvas.addEventListener('mousedown', e=>{ if(e.button===0||e.button===2){ mouseDragging=true; lastMX=e.clientX; } });
window.addEventListener('mouseup',   ()=>{ mouseDragging=false; });
window.addEventListener('mousemove', e=>{
  if (!mouseDragging) return;
  const dx=e.clientX-lastMX; lastMX=e.clientX;
  if (gameMode===2 && e.clientX > window.innerWidth/2) camYaw2 += dx*0.005;
  else camYaw += dx*0.005;
});
// Touch drag (right side) for mobile camera rotate
let camTouchId=null, camTouchLastX=0;
canvas.addEventListener('touchstart', e=>{
  for (const t of e.changedTouches) {
    const rx=(t.clientX/window.innerWidth);
    if (rx>0.5 && !camTouchId) { camTouchId=t.identifier; camTouchLastX=t.clientX; }
  }
});
canvas.addEventListener('touchmove', e=>{
  for (const t of e.changedTouches) {
    if (t.identifier===camTouchId) {
      camYaw+=(t.clientX-camTouchLastX)*0.006;
      camTouchLastX=t.clientX;
    }
  }
}, {passive:true});
canvas.addEventListener('touchend', e=>{
  for (const t of e.changedTouches) if (t.identifier===camTouchId) camTouchId=null;
});

// ── UI helpers ────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('coins-hud').textContent=`💰 ${coinCount}`;
  document.getElementById('cp-hud').textContent=`CP: ${cpCount}/9`;
  if (gameMode===2) {
    const el=document.getElementById('p2-coins');
    if (el) el.textContent=`💰 ${coinCount2}`;
  }
}
function flashRed() {
  const f=document.getElementById('flash'); f.style.opacity='1';
  setTimeout(()=>{f.style.opacity='0';},300);
}
function showCPPop() {
  const el=document.getElementById('cp-pop'); el.style.opacity='1';
  setTimeout(()=>{el.style.opacity='0';},1600);
}
function setHint(txt) { document.getElementById('hint-hud').textContent=txt; }
function showSecAnnounce(name) {
  const el=document.getElementById('sec-announce');
  el.textContent=name; el.style.opacity='1';
  setTimeout(()=>{ el.style.opacity='0'; },2000);
}
function openWin() {
  const secs=Math.floor(elapsed);
  const m=String(Math.floor(secs/60)).padStart(2,'0'), s=String(secs%60).padStart(2,'0');
  document.getElementById('win-modal').classList.add('open');
  document.getElementById('win-sub').textContent=`Time: ${m}:${s}  •  Coins: ${coinCount}`;
  sfxWin();
}
function openGameOver() {
  document.getElementById('over-modal').classList.add('open');
  document.getElementById('over-sub').textContent=`You got ${cpCount}/9 checkpoints`;
  sfxDie();
}
window.stayAtEnd = function() { document.getElementById('win-modal').classList.remove('open'); };
window.restartGame = function() {
  document.getElementById('win-modal').classList.remove('open');
  document.getElementById('over-modal').classList.remove('open');
  gameWon=false; gameOver=false; chestOpened=false; coinCount=0; cpCount=0;
  elapsed=0; startTime=null; curSecIdx=-1;
  if(chestLidMesh) chestLidMesh.rotation.x=0;
  cpList.forEach(c=>{c.collected=false; c.collectedP2=false;});
  coinMeshes.forEach(c=>{c.collected=false; c.collectedP2=false; c.mesh.visible=true;});
  player.x=0; player.y=1; player.z=-10;
  player.vx=0; player.vy=0; player.vz=0;
  spawnPos={x:0,y:1,z:-10}; isDead=false;
  // Reset P2
  coinCount2=0; cpCount2=0; curSecIdx2=-1;
  player2.x=3; player2.y=1; player2.z=-10;
  player2.vx=0; player2.vy=0; player2.vz=0;
  spawnPos2={x:3,y:1,z:-10}; isDead2=false;
  updateHUD();
};

// ── Respawn ───────────────────────────────────────────────────────
function respawn() {
  if (isDead) return;
  isDead=true; deadTimer=0.9;
  sfxDie(); flashRed();
  player.vx=0; player.vy=0; player.vz=0;
}
function doRespawn() {
  player.x=spawnPos.x; player.y=spawnPos.y; player.z=spawnPos.z;
  player.vx=0; player.vy=0; player.vz=0;
  jumpsLeft=2; isDead=false;
}
function respawn2() {
  if (isDead2) return;
  isDead2=true; deadTimer2=0.9;
  player2.vx=0; player2.vy=0; player2.vz=0;
}
function doRespawn2() {
  player2.x=spawnPos2.x; player2.y=spawnPos2.y; player2.z=spawnPos2.z;
  player2.vx=0; player2.vy=0; player2.vz=0;
  jumpsLeft2=2; isDead2=false;
}

// ── Collision (AABB) ──────────────────────────────────────────────
function resolveCollisions2() {
  player2.onGround=false; player2.onIce=false;
  for (const plat of platforms) {
    const {w,h,d}=plat;
    const px=plat.mesh.position.x, py=plat.mesh.position.y, pz=plat.mesh.position.z;
    const pl=px-w/2, pr=px+w/2, pb=py-h/2, pt=py+h/2, pf=pz-d/2, pk=pz+d/2;
    const pl2=player2.x-PW, pr2=player2.x+PW;
    const pb2=player2.y,    pt2=player2.y+PH;
    const pf2=player2.z-PW, pk2=player2.z+PW;
    if (pr2<=pl||pl2>=pr||pk2<=pf||pf2>=pk||pt2<=pb||pb2>=pt) continue;
    const ovT=pt-pb2, ovB=pt2-pb, ovL=pr2-pl, ovR=pr-pl2, ovF=pk2-pf, ovK=pk-pf2;
    const minY=Math.min(ovT,ovB), minX=Math.min(ovL,ovR), minZ=Math.min(ovF,ovK);
    if (minY<=minX && minY<=minZ) {
      if (ovT<ovB) { player2.y=pt; if(player2.vy<0) player2.vy=0; player2.onGround=true; jumpsLeft2=2; if(plat.deadly) respawn2(); if(plat.icy) player2.onIce=true; }
      else { player2.y=pb-PH; if(player2.vy>0) player2.vy=0; }
    } else if (minX<=minZ) { if(ovL<ovR) player2.x=pl-PW; else player2.x=pr+PW; player2.vx=0; }
    else { if(ovF<ovK) player2.z=pf-PW; else player2.z=pk+PW; player2.vz=0; }
  }
}
function resolveCollisions() {
  player.onGround=false; player.onIce=false;
  for (const plat of platforms) {
    const {w,h,d} = plat;
    // Get actual center (moving platforms update plat.x/y/z)
    const px=plat.mesh.position.x, py=plat.mesh.position.y, pz=plat.mesh.position.z;
    const pl=px-w/2, pr=px+w/2;
    const pb=py-h/2, pt=py+h/2;
    const pf=pz-d/2, pk=pz+d/2;

    const pl2=player.x-PW, pr2=player.x+PW;
    const pb2=player.y,    pt2=player.y+PH;
    const pf2=player.z-PW, pk2=player.z+PW;

    if (pr2<=pl||pl2>=pr||pk2<=pf||pf2>=pk||pt2<=pb||pb2>=pt) continue;

    const ovT=pt-pb2, ovB=pt2-pb;
    const ovL=pr2-pl, ovR=pr-pl2;
    const ovF=pk2-pf, ovK=pk-pf2;
    const minY=Math.min(ovT,ovB), minX=Math.min(ovL,ovR), minZ=Math.min(ovF,ovK);

    if (minY<=minX && minY<=minZ) {
      if (ovT<ovB) {
        // Standing on top
        player.y=pt; if(player.vy<0) player.vy=0;
        player.onGround=true;
        jumpsLeft=2;
        if (plat.deadly) respawn();
        if (plat.icy) player.onIce=true;
      } else {
        // Ceiling
        player.y=pb-PH; if(player.vy>0) player.vy=0;
      }
    } else if (minX<=minZ) {
      if(ovL<ovR) player.x=pl-PW; else player.x=pr+PW;
      player.vx=0;
    } else {
      if(ovF<ovK) player.z=pf-PW; else player.z=pk+PW;
      player.vz=0;
    }
  }
}

// ── Laser hit test (player or bot) ───────────────────────────────
function laserHitsPos(lz, px, py, pz) {
  const dy=py+0.9-lz.y;
  if (Math.abs(dy)>1.5) return false;
  const ang=lz.piv.rotation.y;
  const dx_=Math.cos(ang), dz_=-Math.sin(ang);
  const vx=px-lz.x, vz=pz-lz.z;
  const along=vx*dx_+vz*dz_;
  if (Math.abs(along)>lz.armLen) return false;
  const perpX=vx-along*dx_, perpZ=vz-along*dz_;
  return Math.sqrt(perpX*perpX+perpZ*perpZ)<0.7;
}
function laserHits(lz) { return laserHitsPos(lz,player.x,player.y,player.z); }

// ── Sky color per section ─────────────────────────────────────────
const SKIES=[
  {sky:0x87CEEB,fog:0x87CEEB},  // 0 plains
  {sky:0x442200,fog:0x331100},  // 1 lava
  {sky:0x0a1428,fog:0x0a1428},  // 2 lasers
  {sky:0xCCE8FF,fog:0xAAD4F5},  // 3 sky bridges
  {sky:0x1a0a2e,fog:0x1a0a2e},  // 4 chaos
  {sky:0x336622,fog:0x224411},  // 5 final sprint
  {sky:0xCCEEFF,fog:0xAADDEE},  // 6 ice world
  {sky:0x110a05,fog:0x110a05},  // 7 dark dungeon
  {sky:0xBBDDFF,fog:0xAADDFF},  // 8 ice road
  {sky:0x336622,fog:0x224411},  // 9 end island
];
function getSkyIdx(z) {
  if (z>-355)  return 0;
  if (z>-500)  return 1;
  if (z>-650)  return 2;
  if (z>-810)  return 3;
  if (z>-958)  return 4;
  if (z>-1025) return 5;
  if (z>-1185) return 6;
  if (z>-1355) return 7;
  if (z>-1485) return 8;
  return 9;
}
let lastSkyIdx=-1;

// ── Mode start ────────────────────────────────────────────────────
window.startGame = function(mode) {
  gameMode = mode;
  document.getElementById('mode-modal').style.display='none';
  if (mode===2) {
    playerMesh2.visible=true;
    ['splitline','p1-badge','p2-badge','p2-coins','ctrl-hint'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.style.display='block';
    });
  }
  startTime=Date.now();
  try { startMusic(); } catch(e) {}
};

// ── Main loop ─────────────────────────────────────────────────────
const clock = new THREE.Clock();
let legT=0;
let musicStarted=false;

// ── Split-screen render helper ────────────────────────────────────
function doRender() {
  if (gameMode===2) {
    const W=renderer.domElement.clientWidth, H=renderer.domElement.clientHeight, hw=Math.floor(W/2);
    const asp=hw/H;
    camera.aspect=asp;  camera.updateProjectionMatrix();
    camera2.aspect=asp; camera2.updateProjectionMatrix();
    renderer.setScissorTest(true);
    renderer.setViewport(0,0,hw,H);  renderer.setScissor(0,0,hw,H);  renderer.render(scene,camera);
    renderer.setViewport(hw,0,hw,H); renderer.setScissor(hw,0,hw,H); renderer.render(scene,camera2);
    renderer.setScissorTest(false);
  } else {
    renderer.render(scene,camera);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), 0.05);

  // Waiting for mode selection
  if (gameMode===0) { renderer.render(scene,camera); return; }

  // Game over — freeze
  if (gameOver) { doRender(); return; }

  // Timer
  if (!gameWon && !gameOver) { elapsed=(Date.now()-startTime)/1000; updateHUD(); }

  // Dead countdowns
  if (isDead)  { deadTimer -=dt; if(deadTimer <=0) doRespawn();  }
  if (isDead2) { deadTimer2-=dt; if(deadTimer2<=0) doRespawn2(); }

  // Update moving platforms (shared)
  for (const plat of platforms) {
    if (!plat.mov) continue;
    plat.mov.t+=dt;
    const off=Math.sin(plat.mov.t*plat.mov.spd)*plat.mov.range;
    if (plat.mov.axis==='x') plat.mesh.position.x=plat.mov.bx+off;
    if (plat.mov.axis==='y') plat.mesh.position.y=plat.mov.by+off;
    if (plat.mov.axis==='z') plat.mesh.position.z=plat.mov.bz+off;
  }

  // Rotate lasers (shared)
  for (const lz of laserPivots) lz.piv.rotation.y+=lz.spd*dt;

  // ── Player 1 ─────────────────────────────────────────────────────
  if (!isDead) {
    const sprinting=keys['ShiftLeft']||(gameMode===1&&keys['ShiftRight'])||touch.sprint;
    const spd=sprinting?SPRINT_SPD:WALK_SPD;
    const fwdX=-Math.sin(camYaw), fwdZ=-Math.cos(camYaw);
    const rgtX= Math.cos(camYaw), rgtZ=-Math.sin(camYaw);
    let mvx=0, mvz=0;
    const useArrows = gameMode===1; // 1P mode: arrow keys also move P1
    if (keys['KeyW']||(useArrows&&keys['ArrowUp'])   ||touch.up)    { mvx+=fwdX; mvz+=fwdZ; }
    if (keys['KeyS']||(useArrows&&keys['ArrowDown']) ||touch.down)  { mvx-=fwdX; mvz-=fwdZ; }
    if (keys['KeyA']||(useArrows&&keys['ArrowLeft']) ||touch.left)  { mvx-=rgtX; mvz-=rgtZ; }
    if (keys['KeyD']||(useArrows&&keys['ArrowRight'])||touch.right) { mvx+=rgtX; mvz+=rgtZ; }
    const ml=Math.sqrt(mvx*mvx+mvz*mvz); if(ml>0){mvx/=ml;mvz/=ml;}
    if (player.onIce) {
      // Slippery: slowly drift toward target velocity
      player.vx+=(mvx*spd*0.65-player.vx)*0.07;
      player.vz+=(mvz*spd*0.65-player.vz)*0.07;
    } else {
      player.vx=mvx*spd; player.vz=mvz*spd;
    }

    const jumpHeld=keys['Space']||touch.jump;
    if (jumpHeld&&!jumpConsumed&&jumpsLeft>0) {
      const isDouble=!player.onGround;
      player.vy=isDouble?JUMP_VEL*0.88:JUMP_VEL;
      player.onGround=false; jumpConsumed=true; jumpsLeft--;
      if(isDouble){sfx(550,0.1,'square',0.1);sfx(770,0.12,'sine',0.08);}else sfxJump();
    }
    if (!jumpHeld) jumpConsumed=false;

    player.vy-=GRAVITY*dt; player.x+=player.vx*dt; player.y+=player.vy*dt; player.z+=player.vz*dt;
    resolveCollisions();
    if (player.y<-12) respawn();
    for (const lz of laserPivots) if (laserHits(lz)) respawn();

    for (const cp of cpList) {
      if (cp.collected) continue;
      const dx=player.x-cp.x, dz=player.z-cp.z;
      if (Math.sqrt(dx*dx+dz*dz)<3) {
        cp.collected=true; cpCount++; spawnPos={x:cp.x,y:cp.y+1,z:cp.z+8};
        cp.coin.visible=false; showCPPop(); sfxCheckpoint(); updateHUD();
      }
    }

    if (player.onGround) {
      for (const bp of bouncePads) {
        if (Math.abs(player.x-bp.x)<bp.w/2+PW&&Math.abs(player.z-bp.z)<bp.d/2+PW) {
          player.vy=JUMP_VEL*2.1; player.onGround=false;
          sfx(660,0.15,'square',0.15); sfx(880,0.1,'sine',0.1); break;
        }
      }
    }

    let sIdx=0; for(let i=SECTIONS.length-1;i>=0;i--){if(player.z<=SECTIONS[i].zMin){sIdx=i;break;}}
    if (sIdx!==curSecIdx) {
      curSecIdx=sIdx;
      const nm=SECTIONS[Math.max(0,sIdx)]?.name||'';
      document.getElementById('section-hud').textContent=nm;
      if (sIdx>0) showSecAnnounce(nm);
    }

    for (const co of coinMeshes) {
      if (co.collected) continue;
      const dx=player.x-co.x, dy=player.y+0.9-co.y, dz=player.z-co.z;
      if (Math.sqrt(dx*dx+dy*dy+dz*dz)<1.4) {
        co.collected=true; co.mesh.visible=false; coinCount++;
        sfx(880,0.08,'sine',0.1); updateHUD();
      }
    }

    if (!chestOpened&&!gameWon) {
      const dx=player.x-CHEST_X, dz=player.z-CHEST_Z;
      if (Math.sqrt(dx*dx+dz*dz)<4) {
        chestOpened=true; gameWon=true;
        if(chestLidMesh) chestLidMesh.rotation.x=-Math.PI*0.7;
        coinCount+=50; updateHUD(); setTimeout(openWin,600);
      }
    }

    if (sprinting&&(mvx||mvz)&&Math.random()<0.35) spawnTrail();
    document.getElementById('sprint-hud').style.display=sprinting&&(mvx||mvz)?'block':'none';
    if (!gameWon) {
      const dx=player.x-CHEST_X, dz=player.z-CHEST_Z;
      setHint(Math.sqrt(dx*dx+dz*dz)<8?'Walk to the chest to claim your reward! 💰💎':'');
    }

    playerMesh.position.set(player.x,player.y,player.z);
    if (mvx||mvz) playerMesh.rotation.y=Math.atan2(mvx,mvz);
    if (mvx!==0||mvz!==0) {
      legT+=dt*8;
      playerMesh.userData.ll.rotation.x= Math.sin(legT)*0.55;
      playerMesh.userData.rl.rotation.x=-Math.sin(legT)*0.55;
      playerMesh.userData.la.rotation.x=-Math.sin(legT)*0.45;
      playerMesh.userData.ra.rotation.x= Math.sin(legT)*0.45;
      playerMesh.position.y+=Math.abs(Math.sin(legT))*0.04;
    } else {
      playerMesh.userData.ll.rotation.x*=0.8; playerMesh.userData.rl.rotation.x*=0.8;
      playerMesh.userData.la.rotation.x*=0.8; playerMesh.userData.ra.rotation.x*=0.8;
    }
  } // end P1

  // ── Player 2 (2P mode only) ───────────────────────────────────────
  if (gameMode===2 && !isDead2) {
    const spd2=keys['ShiftRight']?SPRINT_SPD:WALK_SPD;
    const fwdX2=-Math.sin(camYaw2), fwdZ2=-Math.cos(camYaw2);
    const rgtX2= Math.cos(camYaw2), rgtZ2=-Math.sin(camYaw2);
    let mvx2=0, mvz2=0;
    if (keys['ArrowUp'])    { mvx2+=fwdX2; mvz2+=fwdZ2; }
    if (keys['ArrowDown'])  { mvx2-=fwdX2; mvz2-=fwdZ2; }
    if (keys['ArrowLeft'])  { mvx2-=rgtX2; mvz2-=rgtZ2; }
    if (keys['ArrowRight']) { mvx2+=rgtX2; mvz2+=rgtZ2; }
    const ml2=Math.sqrt(mvx2*mvx2+mvz2*mvz2); if(ml2>0){mvx2/=ml2;mvz2/=ml2;}
    if (player2.onIce) {
      player2.vx+=(mvx2*spd2*0.65-player2.vx)*0.07;
      player2.vz+=(mvz2*spd2*0.65-player2.vz)*0.07;
    } else {
      player2.vx=mvx2*spd2; player2.vz=mvz2*spd2;
    }

    const jh2=keys['Enter']||keys['NumpadEnter'];
    if (jh2&&!jumpConsumed2&&jumpsLeft2>0) {
      player2.vy=player2.onGround?JUMP_VEL:JUMP_VEL*0.88;
      player2.onGround=false; jumpConsumed2=true; jumpsLeft2--;
    }
    if (!jh2) jumpConsumed2=false;

    player2.vy-=GRAVITY*dt; player2.x+=player2.vx*dt; player2.y+=player2.vy*dt; player2.z+=player2.vz*dt;
    resolveCollisions2();
    if (player2.y<-12) respawn2();
    for (const lz of laserPivots) if (laserHitsPos(lz,player2.x,player2.y,player2.z)) respawn2();

    if (player2.onGround) {
      for (const bp of bouncePads) {
        if (Math.abs(player2.x-bp.x)<bp.w/2+PW&&Math.abs(player2.z-bp.z)<bp.d/2+PW) {
          player2.vy=JUMP_VEL*2.1; player2.onGround=false; break;
        }
      }
    }

    for (const cp of cpList) {
      if (cp.collectedP2) continue;
      const dx2=player2.x-cp.x, dz2=player2.z-cp.z;
      if (Math.sqrt(dx2*dx2+dz2*dz2)<3) {
        cp.collectedP2=true; cpCount2++; spawnPos2={x:cp.x,y:cp.y+1,z:cp.z+8};
      }
    }

    for (const co of coinMeshes) {
      if (co.collectedP2||co.collected) continue;
      const dx2=player2.x-co.x, dy2=player2.y+0.9-co.y, dz2=player2.z-co.z;
      if (Math.sqrt(dx2*dx2+dy2*dy2+dz2*dz2)<1.4) {
        co.collectedP2=true; coinCount2++; sfx(990,0.08,'sine',0.1); updateHUD();
      }
    }

    playerMesh2.position.set(player2.x,player2.y,player2.z);
    if (mvx2||mvz2) playerMesh2.rotation.y=Math.atan2(mvx2,mvz2);
    if (mvx2!==0||mvz2!==0) {
      legT2+=dt*8;
      playerMesh2.userData.ll.rotation.x= Math.sin(legT2)*0.55;
      playerMesh2.userData.rl.rotation.x=-Math.sin(legT2)*0.55;
      playerMesh2.userData.la.rotation.x=-Math.sin(legT2)*0.45;
      playerMesh2.userData.ra.rotation.x= Math.sin(legT2)*0.45;
      playerMesh2.position.y+=Math.abs(Math.sin(legT2))*0.04;
    } else {
      playerMesh2.userData.ll.rotation.x*=0.8; playerMesh2.userData.rl.rotation.x*=0.8;
      playerMesh2.userData.la.rotation.x*=0.8; playerMesh2.userData.ra.rotation.x*=0.8;
    }
  } // end P2

  // ── Bots (shared) ────────────────────────────────────────────────
  for (const b of bots) {
    if (b.dead) {
      b.deadTimer-=dt; b.mesh.visible=Math.floor(b.deadTimer*6)%2===0;
      if (b.deadTimer<=0) {
        b.dead=false; b.mesh.visible=true; b.y=0; b.vy=0;
        if (b.finished) { b.x=(Math.random()-0.5)*50; b.z=-1570+(Math.random()-0.5)*40; b.wanderTimer=0; }
        else { b.z=-(Math.random()*100); b.wpIdx=0; b.lane=(Math.random()-0.5)*8; }
      }
      continue;
    }
    while (b.wpIdx<BOT_WPS.length-1&&b.z<=BOT_WPS[b.wpIdx].z) b.wpIdx++;
    const nearWP=Math.abs(b.z-BOT_WPS[b.wpIdx].z)<20;
    const curSpd=nearWP?b.spd*0.88:b.spd;
    b.wobble+=dt*1.2;
    const targetX=b.lane+Math.sin(b.wobble)*0.6;
    b.x+=(targetX-b.x)*Math.min(dt*3,1);
    if (!b.finished) { const lp=botLaserDanger(b.x,b.z-1); if(!lp) b.z-=curSpd*dt; }
    const gY=getBotGround(b.x,b.z); const hasGround=gY>-100;
    b.vy-=GRAVITY*dt; b.y+=b.vy*dt;
    if (hasGround&&b.y<=gY) {b.y=gY;b.vy=0;b.onGround=true;}
    else if (!hasGround&&b.y<=0) {b.y=0;b.vy=0;b.onGround=true;}
    else b.onGround=false;
    if (b.onGround) for (const bp of bouncePads) { if(Math.abs(b.x-bp.x)<bp.w/2&&Math.abs(b.z-bp.z)<bp.d/2){b.vy=JUMP_VEL*2.0;b.onGround=false;break;} }
    if (b.onGround&&botOnDeadly(b.x,b.y,b.z)) {b.dead=true;b.deadTimer=1.5+Math.random()*0.5;b.mesh.visible=false;continue;}
    if (b.onGround&&b.vy<=0) { const ag=getBotGround(b.x,b.z-3); if(ag<-50){b.vy=JUMP_VEL*0.95;b.onGround=false;} }
    const danger=botLaserDanger(b.x,b.z); if(danger) b.x+=Math.sign(b.x||1)*b.spd*dt*0.4;
    for (const p of platforms) { if(!p.deadly)continue; const mx=p.mesh.position.x,mz=p.mesh.position.z; if(Math.abs(b.z-mz)<p.d/2+1.5&&Math.abs(b.x-mx)<p.w/2+1.5) b.x+=(b.x>mx?1:-1)*b.spd*dt*2; }
    b.jumpTimer-=dt; if(b.jumpTimer<=0&&b.onGround){b.vy=JUMP_VEL*(0.6+Math.random()*0.4);b.onGround=false;b.jumpTimer=3+Math.random()*6;}
    const deathY=(b.z<-640&&b.z>-810)||(b.z<-1015&&b.z>-1175)?-2:-12;
    if (b.y<deathY){b.dead=true;b.deadTimer=1.8+Math.random();b.mesh.visible=false;continue;}
    b.x=Math.max(-6,Math.min(6,b.x));
    if (!b.finished&&b.z<-1545) {b.finished=true;b.wanderTimer=0;}
    if (b.finished) {
      b.wanderTimer-=dt;
      if (b.role==='soccer'&&soccerBall) {
        const goalX=b.team==='A'?SOC_X+11:SOC_X-11;
        const bDX=soccerBall.position.x-b.x, bDZ=soccerBall.position.z-b.z;
        const bDist=Math.sqrt(bDX*bDX+bDZ*bDZ);
        if (bDist>1.5) {b.wanderTX=soccerBall.position.x+(Math.random()-0.5)*1.5;b.wanderTZ=soccerBall.position.z+(Math.random()-0.5)*1.5;}
        else { const gX=goalX-b.x,gZ=SOC_Z-b.z,gD=Math.sqrt(gX*gX+gZ*gZ); sbv.x+=(gX/gD)*14;sbv.z+=(gZ/gD)*14;sbv.y+=3; b.wanderTX=b.x-gX*0.5;b.wanderTZ=b.z-gZ*0.5; }
        b.wanderTX=Math.max(SOC_X-12,Math.min(SOC_X+12,b.wanderTX)); b.wanderTZ=Math.max(SOC_Z-8,Math.min(SOC_Z+8,b.wanderTZ));
      } else if (b.role==='ballpit') {
        if (b.wanderTimer<=0) {b.wanderTX=PIT_X+(Math.random()-0.5)*14;b.wanderTZ=PIT_Z+(Math.random()-0.5)*14;b.wanderTimer=1+Math.random()*2;}
        b.wanderTX=Math.max(PIT_X-8,Math.min(PIT_X+8,b.wanderTX)); b.wanderTZ=Math.max(PIT_Z-8,Math.min(PIT_Z+8,b.wanderTZ));
      } else {
        if (b.wanderTimer<=0) {b.wanderTX=(Math.random()-0.5)*44;b.wanderTZ=-1590+(Math.random()-0.5)*44;b.wanderTimer=2+Math.random()*4;}
        b.wanderTX=Math.max(-44,Math.min(44,b.wanderTX)); b.wanderTZ=Math.max(-1630,Math.min(-1552,b.wanderTZ));
      }
      const dxw=b.wanderTX-b.x, dzw=b.wanderTZ-b.z, distW=Math.sqrt(dxw*dxw+dzw*dzw);
      const wandSpd=b.role==='soccer'?Math.min(b.spd*0.7,8):Math.min(b.spd*0.5,6);
      if (distW>0.4) {b.x+=(dxw/distW)*wandSpd*dt;b.z+=(dzw/distW)*wandSpd*dt;b.mesh.rotation.y=Math.atan2(dxw,dzw)+Math.PI;}
      b.x=Math.max(-44,Math.min(44,b.x)); b.z=Math.max(-1630,Math.min(-1552,b.z));
      b.legT+=dt*wandSpd*1.6; b.mesh.position.set(b.x,b.y,b.z);
      b.mesh.userData.ll.rotation.x=Math.sin(b.legT)*0.55; b.mesh.userData.rl.rotation.x=-Math.sin(b.legT)*0.55;
      b.mesh.userData.la.rotation.x=-Math.sin(b.legT)*0.5; b.mesh.userData.ra.rotation.x=Math.sin(b.legT)*0.5;
      continue;
    }
    for (const lz of laserPivots) { if(laserHitsPos(lz,b.x,b.y,b.z)){b.dead=true;b.deadTimer=1.5+Math.random();b.mesh.visible=false;break;} }
    if (b.dead) continue;
    b.legT+=dt*curSpd*1.6; b.mesh.position.set(b.x,b.y,b.z); b.mesh.rotation.y=Math.PI;
    b.mesh.userData.ll.rotation.x=Math.sin(b.legT)*0.55; b.mesh.userData.rl.rotation.x=-Math.sin(b.legT)*0.55;
    b.mesh.userData.la.rotation.x=-Math.sin(b.legT)*0.5; b.mesh.userData.ra.rotation.x=Math.sin(b.legT)*0.5;
  }

  // ── Ball pit physics (shared) ─────────────────────────────────────
  const PIT_GRAV=18, PIT_DAMP=0.62;
  const PX1=PIT_X-9.5, PX2=PIT_X+9.5, PZ1=PIT_Z-9.5, PZ2=PIT_Z+9.5, PY0=-0.5, PY1=3.4;
  for (const b of pitBalls) {
    b.vy-=PIT_GRAV*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
    if(b.y<PY0+b.r){b.y=PY0+b.r;b.vy=Math.abs(b.vy)*PIT_DAMP;b.vx*=0.96;b.vz*=0.96;}
    if(b.y>PY1-b.r){b.y=PY1-b.r;b.vy=-Math.abs(b.vy)*PIT_DAMP;}
    if(b.x<PX1+b.r){b.x=PX1+b.r;b.vx=Math.abs(b.vx)*PIT_DAMP;}
    if(b.x>PX2-b.r){b.x=PX2-b.r;b.vx=-Math.abs(b.vx)*PIT_DAMP;}
    if(b.z<PZ1+b.r){b.z=PZ1+b.r;b.vz=Math.abs(b.vz)*PIT_DAMP;}
    if(b.z>PZ2-b.r){b.z=PZ2-b.r;b.vz=-Math.abs(b.vz)*PIT_DAMP;}
    b.mesh.position.set(b.x,b.y,b.z);
    const minD=0.5+b.r;
    for (const pp of [player, ...(gameMode===2?[player2]:[])]) {
      const pdx=b.x-pp.x,pdy=b.y-(pp.y+0.9),pdz=b.z-pp.z,pd=Math.sqrt(pdx*pdx+pdy*pdy+pdz*pdz);
      if(pd<minD&&pd>0.01){const f=(minD-pd)/pd;b.vx+=pdx*f*10;b.vy+=Math.abs(pdy)*f*10+4;b.vz+=pdz*f*10;b.x+=pdx*f;b.y+=pdy*f;b.z+=pdz*f;}
    }
    for (const bot of bots) {
      if(!bot.finished)continue;
      const bdx=b.x-bot.x,bdy=b.y-(bot.y+0.9),bdz=b.z-bot.z,bd=Math.sqrt(bdx*bdx+bdy*bdy+bdz*bdz);
      if(bd<minD&&bd>0.01){const f=(minD-bd)/bd;b.vx+=bdx*f*8;b.vy+=Math.abs(bdy)*f*8+3;b.vz+=bdz*f*8;b.x+=bdx*f;b.y+=bdy*f;b.z+=bdz*f;}
    }
  }

  // ── Soccer ball (shared) ──────────────────────────────────────────
  if (soccerBall) {
    sbv.y-=18*dt; soccerBall.position.x+=sbv.x*dt; soccerBall.position.y+=sbv.y*dt; soccerBall.position.z+=sbv.z*dt;
    const sx=soccerBall.position.x, sz=soccerBall.position.z;
    if(soccerBall.position.y<0.55){soccerBall.position.y=0.55;sbv.y=Math.abs(sbv.y)*0.75;}
    if(sx<SOC_X-12){soccerBall.position.x=SOC_X-12;sbv.x=Math.abs(sbv.x)*0.9;}
    if(sx>SOC_X+12){soccerBall.position.x=SOC_X+12;sbv.x=-Math.abs(sbv.x)*0.9;}
    if(sz<SOC_Z-8) {soccerBall.position.z=SOC_Z-8; sbv.z=Math.abs(sbv.z)*0.9;}
    if(sz>SOC_Z+8) {soccerBall.position.z=SOC_Z+8; sbv.z=-Math.abs(sbv.z)*0.9;}
    soccerBall.rotation.x+=sbv.z*dt*2; soccerBall.rotation.z-=sbv.x*dt*2;
    for (const bot of bots) {
      if(!bot.finished)continue;
      const sdx=soccerBall.position.x-bot.x,sdz=soccerBall.position.z-bot.z,sd=Math.sqrt(sdx*sdx+sdz*sdz);
      if(sd<1.3&&sd>0.01){const f=(1.3-sd)/sd;sbv.x+=sdx*f*18;sbv.z+=sdz*f*18;sbv.y+=4;}
    }
  }

  // ── Snowballs ─────────────────────────────────────────────────────
  for (const sb of snowballs) {
    sb.x += sb.vx * dt;
    if (sb.x > sb.cx + sb.rangeX || sb.x < sb.cx - sb.rangeX) {
      sb.vx = -sb.vx;
      sb.x = Math.max(sb.cx-sb.rangeX, Math.min(sb.cx+sb.rangeX, sb.x));
    }
    sb.mesh.position.x = sb.x;
    sb.mesh.rotation.z += sb.vx * dt * 2.5;
    // P1 collision
    if (!isDead) {
      const dx=player.x-sb.x, dz=player.z-sb.z, dy=player.y+0.9-sb.y;
      if (Math.sqrt(dx*dx+dz*dz+dy*dy) < sb.r+0.55) respawn();
    }
    // P2 collision
    if (gameMode===2 && !isDead2) {
      const dx=player2.x-sb.x, dz=player2.z-sb.z, dy=player2.y+0.9-sb.y;
      if (Math.sqrt(dx*dx+dz*dz+dy*dy) < sb.r+0.55) respawn2();
    }
  }

  // Coin & CP spins
  for (const co of coinMeshes) if(!co.collected) co.mesh.rotation.z+=dt*2;
  for (const cp of cpList) if(!cp.collected){cp.coin.rotation.y+=dt*2;cp.coin.position.y+=Math.sin(Date.now()/600)*0.003;}

  // Sprint trail P1
  for (let i=trailParts.length-1;i>=0;i--) {
    const tp=trailParts[i]; tp.age+=dt; tp.mesh.material.opacity=1-tp.age/tp.life; tp.mesh.position.y+=dt*0.5;
    if(tp.age>=tp.life){scene.remove(tp.mesh);trailParts.splice(i,1);}
  }

  // Sky/fog (P1 zone)
  const si=getSkyIdx(player.z);
  if(si!==lastSkyIdx){scene.background=new THREE.Color(SKIES[si].sky);scene.fog.color=new THREE.Color(SKIES[si].fog);lastSkyIdx=si;}

  // Cameras
  const CAM_DIST=11, CAM_H=6;
  camera.position.lerp(new THREE.Vector3(player.x+Math.sin(camYaw)*CAM_DIST, player.y+CAM_H, player.z+Math.cos(camYaw)*CAM_DIST), 0.1);
  camera.lookAt(player.x, player.y+1, player.z);
  if (gameMode===2) {
    camera2.position.lerp(new THREE.Vector3(player2.x+Math.sin(camYaw2)*CAM_DIST, player2.y+CAM_H, player2.z+Math.cos(camYaw2)*CAM_DIST), 0.1);
    camera2.lookAt(player2.x, player2.y+1, player2.z);
  }

  doRender();
}

// Initial render (before mode is chosen — shows world behind mode modal)
camera.position.set(0, 7, 11);
camera.lookAt(0, 1, 0);
camera2.position.set(3, 7, 11);
camera2.lookAt(3, 1, 0);
renderer.render(scene, camera);

updateHUD();
animate();
