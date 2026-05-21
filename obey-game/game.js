'use strict';
/* ── OBEY GAME ── Three.js 3D obstacle course ──────────────────── */

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

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'), antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 400);
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
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
const player = {x:0, y:1, z:-10, vx:0, vy:0, vz:0, onGround:false};
let spawnPos = {x:0, y:1, z:-10};
let cpCount   = 0;
let coinCount = 0;
let lives     = 3;
let isDead    = false;
let deadTimer = 0;
let chestOpened = false;
let gameWon   = false;
let gameOver  = false;
let startTime = null;
let elapsed   = 0;
let curSecIdx = -1;
const touch  = {up:false,down:false,left:false,right:false,jump:false,sprint:false};

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
  {zMin:-1355, name:'RAINBOW ROAD 🌈'},
  {zMin:-1485, name:'GRAND FINISH 🏆'},
];

// ── Object lists ──────────────────────────────────────────────────
const platforms   = [];
const laserPivots = [];
const cpList      = [];
const coinMeshes  = [];
const bouncePads  = [];

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

// SECTION 0 — GREEN PLAINS (z=0 to z=-130)
T(0,   0, -30,  18, 1, 60, 0x66CC44);           // wide start
CO(3,1.8,-20); CO(-3,1.8,-30); CO(0,1.8,-50);
T(0,   0, -95,  14, 1, 30, 0x55BB44);
CO(2,1.8,-80); CO(-2,1.8,-95); CO(0,1.8,-108);
T(2,   0,-120,  10, 1, 14, 0x55BB44);
T(-2,  0,-137,   8, 1, 10, 0x55BB44);
// Low ledge to step up
T(0,  1.2,-152,  8, 1, 10, 0x77DD55);
T(0,  2.4,-167,  7, 1, 10, 0x88EE66);
T(0,  0,-182,    9, 1, 12, 0x66CC44);
CP(0, 0, -192, 0);

// SECTION 1 — FIRST GAPS (z=-205 to z=-330)
T(0,   0,-215,  8, 1, 16, 0x55BB44);
T(4,   0,-238,  5, 1,  8, 0x55BB44);
T(-3,  0,-255,  5, 1,  8, 0x55BB44);
CO(4,1.8,-238); CO(-3,1.8,-255);
T(2,   0,-272,  4, 1,  8, 0x55BB44);
T(-1,  0,-289,  4, 1,  8, 0x55BB44);
T(0,   0,-306,  7, 1, 12, 0x55BB44);
CO(0,1.8,-306);
// Jump pads (slightly raised to indicate trampoline/bounce)
T(0, 0.3,-318,  5, 0.6, 5, 0x44AACC);
T(0,   0,-332,  8, 1, 12, 0x55BB44);
CP(0,  0,-340, 1);

// SECTION 2 — LAVA FIELDS (z=-355 to z=-490)
// Lava floor
P(0, -1.5, -425, 80, 1, 140, 0xFF4400, true);
// Lava glow plane
const lavaGlow = new THREE.Mesh(new THREE.PlaneGeometry(80,140),
  new THREE.MeshLambertMaterial({color:0xFF6600,emissive:new THREE.Color(0xFF4400).multiplyScalar(0.6)}));
lavaGlow.rotation.x=-Math.PI/2; lavaGlow.position.set(0,-0.99,-425); scene.add(lavaGlow);
// Platforms over lava
T(0,  2,-360,  8, 0.8, 12, 0xAA6633);
T(5,  2,-380,  5, 0.8,  8, 0xBB7744);
T(-4, 3,-396,  5, 0.8,  8, 0xBB7744);
CO(5,3.8,-380); CO(-4,4.8,-396);
T(2,  2,-412,  4, 0.8,  7, 0xAA6633, false, {axis:'x',range:3,spd:1.2});
T(-3, 3,-428,  5, 0.8,  7, 0xAA6633, false, {axis:'y',range:1.5,spd:0.9});
T(0,  2,-444,  5, 0.8,  8, 0xBB7744);
CO(0,3.8,-444);
T(3,  2,-458,  4, 0.8,  6, 0xAA6633, false, {axis:'x',range:3.5,spd:1.4});
T(0,  2,-474,  8, 0.8, 12, 0xAA6633);
CP(0, 2,-484, 2);

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
// Rotating lasers (sweeping horizontally)
L(0, 1.8,-515, 1.4,  5.5, 0);
L(0, 1.8,-533,-1.8,  5.5, Math.PI/3);
L(0, 1.8,-550, 2.0,  5.5, Math.PI*0.7);
L(0, 1.8,-568,-1.5,  5.5, Math.PI/5);
L(0, 1.8,-586, 2.3,  5.5, Math.PI*1.4);
L(0, 1.8,-604,-1.9,  5.5, Math.PI*0.9);
L(0, 1.8,-622, 1.6,  5.5, Math.PI*1.8);
CO(4,1.5,-528); CO(-4,1.5,-558); CO(3,1.5,-590); CO(-3,1.5,-618);
CP(0, 0,-635, 3);

// SECTION 4 — SKY BRIDGES (z=-650 to z=-790)
// Platforms high in the sky (big drop below)
// Place a death floor far below
P(0,-18,-720, 120, 1, 160, 0x220011, true); // deep lava below
T(0,  5,-658,  6, 0.6, 12, 0xAABBFF);
T(4,  5,-676,  3.5,0.6,  8, 0xAABBFF);
CO(4,6.8,-676);
T(-3, 6,-692,  3, 0.6,  8, 0x99AAEE);
T(2,  5,-708,  3, 0.6,  7, 0xAABBFF, false, {axis:'x',range:3,spd:1.1});
CO(-3,7.8,-692);
T(-2, 6,-723,  3, 0.6,  7, 0x99AAEE);
T(3,  5,-738,  3, 0.6,  7, 0xAABBFF, false, {axis:'x',range:2.8,spd:1.4});
T(-1, 6,-753,  4, 0.6,  8, 0x99AAEE);
CO(0,7.8,-753);
T(0,  5,-768,  6, 0.6, 10, 0xAABBFF);
T(0,  5,-782,  8, 0.6, 12, 0x8899EE);
CP(0, 5,-792, 4);

// SECTION 5 — CHAOS ZONE (z=-810 to z=-950)
// Mixed floor with lava patches
T(0,  0,-840,  14, 1, 80, 0x442255);
// Lava patches on floor
T(-3, 0.15,-820, 4, 0.3, 5, 0xFF4400, true);
T(3,  0.15,-838, 4, 0.3, 5, 0xFF4400, true);
T(-2, 0.15,-858, 5, 0.3, 6, 0xFF4400, true);
T(2,  0.15,-878, 5, 0.3, 6, 0xFF4400, true);
T(0,  0.15,-898, 6, 0.3, 7, 0xFF4400, true);
// Moving platforms over chaos floor
T(0, 2,-816, 4, 0.8, 5, 0x8844BB, false, {axis:'x',range:4,spd:1.6});
T(0, 2,-836, 4, 0.8, 5, 0x9955CC, false, {axis:'x',range:4,spd:-1.4});
T(0, 3,-856, 4, 0.8, 5, 0x7733AA, false, {axis:'x',range:3.5,spd:1.8});
T(0, 2,-876, 4, 0.8, 5, 0x8844BB, false, {axis:'x',range:4,spd:-1.5});
T(0, 2,-896, 4, 0.8, 5, 0x9955CC, false, {axis:'y',range:2,spd:1.0});
// Chaos lasers
L(0, 3,-825, 2.2, 5.5, 0);
L(0, 3,-855,-2.8, 5.5, Math.PI/2);
L(0, 3,-885, 2.4, 5.5, Math.PI*1.3);
L(0, 3,-915,-2.0, 5.5, Math.PI*0.6);
CO(0,4,-840); CO(0,4,-868); CO(0,4,-896);
CP(0, 0,-940, 5);

// FINAL SPRINT (z=-958 to z=-1000)
T(0,  0,-970,  16, 1, 30, 0x44AA44);
CO(2,1.8,-965); CO(-2,1.8,-975); CO(0,1.8,-985);

// ── SECTION 6: FROZEN PEAKS (z=-1010 to z=-1170) ──────────────────
// Ice floor + platforms. Some bounce pads.
T(0,  0,-1015,  12, 1, 16, 0xCCEEFF);   // entry bridge
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

// ── SECTION 7: DARK DUNGEON (z=-1185 to z=-1330) ─────────────────
// Very dark, narrow, lasers + lava combo
T(0,  0,-1200,  10,1,20,0x443322);  // dungeon floor entry
P(0,-2,-1260,100,1,160,0xFF4400,true); // lava floor
P(-8, 4,-1260, 1,10,160,0x332211);  // dungeon walls
P( 8, 4,-1260, 1,10,160,0x332211);
// Dungeon ceiling
P(0, 9,-1260,18,1,160,0x221100);
// Torch lights on walls
for(let i=0;i<6;i++){
  const torch=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.8,0.3),
    new THREE.MeshLambertMaterial({color:0x884400}));
  torch.position.set(i%2===0?-7.5:7.5, 4, -1210-i*20); scene.add(torch);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.6,6),
    new THREE.MeshLambertMaterial({color:0xFF6600,emissive:new THREE.Color(0xFF4400).multiplyScalar(0.9)}));
  flame.position.set(i%2===0?-7.5:7.5, 4.7, -1210-i*20); scene.add(flame);
}
// Platforms over lava in dungeon
T(0, 2,-1215, 5,0.8, 7,0x664422);
T(4, 2,-1231, 4,0.8, 6,0x664422,false,{axis:'x',range:2.5,spd:1.3});
T(-3,2,-1247, 4,0.8, 6,0x775533,false,{axis:'x',range:2.5,spd:-1.5});
T(2, 2,-1263, 4,0.8, 6,0x664422,false,{axis:'x',range:3,  spd:1.8});
T(-2,3,-1279, 3,0.8, 6,0x775533,false,{axis:'y',range:2,  spd:1.2});
T(0, 2,-1295, 5,0.8, 7,0x664422);
T(0, 2,-1311, 7,0.8,10,0x775533);
// Dungeon lasers (fast)
L(0,3.5,-1225, 2.8, 5, 0);
L(0,3.5,-1250,-3.2, 5, Math.PI/2);
L(0,3.5,-1275, 2.5, 5, Math.PI);
L(0,3.5,-1300,-3.0, 5, Math.PI*1.5);
CO(0,3.8,-1215); CO(4,3.8,-1231); CO(0,4.8,-1279); CO(0,3.8,-1311);
CP(0, 2,-1320, 7);

// ── SECTION 8: RAINBOW ROAD (z=-1335 to z=-1475) ──────────────────
// Crazy colorful fast-moving platforms over void
P(0,-20,-1405,120,1,160,0x110022,true); // deep void
T(0, 0,-1340,  10,1,16,0xFF4466);  // rainbow entry
// Rainbow platforms (alternating colors)
const rainCols=[0xFF4444,0xFF8844,0xFFDD00,0x44CC44,0x44AAFF,0x8844FF,0xFF44CC];
let rainZ=-1360, rainY=0;
for(let i=0;i<14;i++){
  const col=rainCols[i%rainCols.length];
  const w=3+Math.random()*2, gap=3.5+Math.random()*2;
  const mov=i%2===0
    ? {axis:'x',range:2.5+Math.random()*2,spd:1.5+Math.random()*1.5}
    : {axis:'y',range:1.2,spd:1.2+Math.random()};
  T((Math.random()-0.5)*4, rainY, rainZ, w, 0.6, 6+Math.random()*4, col, false, mov);
  CO((Math.random()-0.5)*3, rainY+2.2, rainZ);
  rainZ -= gap+w*0.5;
  rainY += (Math.random()-0.4)*1.5;
  rainY = Math.max(-1, Math.min(4, rainY));
}
// Final rainbow landing
T(0, 0,-1463, 12, 1, 16, 0xFF44CC);
CO(3,1.8,-1455); CO(-3,1.8,-1463); CO(0,1.8,-1468);
CP(0, 0,-1473, 8);

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
  const b=new THREE.Mesh(
    new THREE.SphereGeometry(0.55+Math.random()*0.25,8,8),
    new THREE.MeshLambertMaterial({color:BALL_COLS[i%BALL_COLS.length]})
  );
  b.position.set(PIT_X+(Math.random()-0.5)*18, -0.3+Math.random()*1.8, PIT_Z+(Math.random()-0.5)*18);
  scene.add(b);
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

// ── UI helpers ────────────────────────────────────────────────────
function livesStr() { return '❤️'.repeat(Math.max(0,lives)); }
function updateHUD() {
  document.getElementById('coins-hud').textContent=`💰 ${coinCount}`;
  document.getElementById('cp-hud').textContent=`CP: ${cpCount}/9`;
  document.getElementById('lives-hud').textContent=livesStr()||'💔 GAME OVER';
  const secs=Math.floor(elapsed), m=String(Math.floor(secs/60)).padStart(2,'0'), s=String(secs%60).padStart(2,'0');
  document.getElementById('timer-hud').textContent=`⏱ ${m}:${s}`;
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
  gameWon=false; gameOver=false; chestOpened=false; coinCount=0; cpCount=0; lives=3;
  elapsed=0; startTime=null; curSecIdx=-1;
  if(chestLidMesh) chestLidMesh.rotation.x=0;
  cpList.forEach(c=>c.collected=false);
  coinMeshes.forEach(c=>{c.collected=false; c.mesh.visible=true;});
  player.x=0; player.y=1; player.z=-10;
  player.vx=0; player.vy=0; player.vz=0;
  spawnPos={x:0,y:1,z:-10};
  isDead=false;
  updateHUD();
};

// ── Respawn ───────────────────────────────────────────────────────
function respawn() {
  if (isDead || gameOver) return;
  isDead=true; deadTimer=0.9;
  lives=Math.max(0, lives-1);
  sfxDie(); flashRed();
  player.vx=0; player.vy=0; player.vz=0;
  updateHUD();
  if (lives<=0) { deadTimer=1.5; }
}
function doGameOver() {
  gameOver=true; isDead=false;
  openGameOver();
}
function doRespawn() {
  if (lives<=0) { doGameOver(); return; }
  player.x=spawnPos.x; player.y=spawnPos.y; player.z=spawnPos.z;
  player.vx=0; player.vy=0; player.vz=0;
  jumpsLeft=2; isDead=false;
}

// ── Collision (AABB) ──────────────────────────────────────────────
function resolveCollisions() {
  player.onGround=false;
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

// ── Laser hit test ────────────────────────────────────────────────
function laserHits(lz) {
  const dy=player.y+0.9-lz.y;
  if (Math.abs(dy)>1.5) return false;
  const ang=lz.piv.rotation.y;
  const dx_=Math.cos(ang), dz_=-Math.sin(ang);
  const vx=player.x-lz.x, vz=player.z-lz.z;
  const along=vx*dx_+vz*dz_;
  if (Math.abs(along)>lz.armLen) return false;
  const perpX=vx-along*dx_, perpZ=vz-along*dz_;
  return Math.sqrt(perpX*perpX+perpZ*perpZ)<0.7;
}

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
  {sky:0x221133,fog:0x110022},  // 8 rainbow road
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

// ── Main loop ─────────────────────────────────────────────────────
const clock = new THREE.Clock();
let legT=0;
let musicStarted=false;

function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), 0.05);

  // Start music on first frame
  if (!musicStarted) { musicStarted=true; startMusic(); }

  // Game over — freeze
  if (gameOver) { renderer.render(scene,camera); return; }

  // Timer
  if (!startTime) startTime=Date.now();
  if (!gameWon && !gameOver) { elapsed=(Date.now()-startTime)/1000; updateHUD(); }

  // Dead countdown
  if (isDead) {
    deadTimer-=dt;
    if (deadTimer<=0) doRespawn();
    renderer.render(scene,camera);
    return;
  }

  // ── Movement ──
  const sprinting = keys['ShiftLeft']||keys['ShiftRight']||touch.sprint;
  const spd = sprinting ? SPRINT_SPD : WALK_SPD;
  let mvx=0,mvz=0;
  if (keys['KeyW']||keys['ArrowUp']||touch.up)    mvz=-1;
  if (keys['KeyS']||keys['ArrowDown']||touch.down)  mvz=1;
  if (keys['KeyA']||keys['ArrowLeft']||touch.left)  mvx=-1;
  if (keys['KeyD']||keys['ArrowRight']||touch.right) mvx=1;
  const ml=Math.sqrt(mvx*mvx+mvz*mvz);
  if (ml>0){mvx/=ml;mvz/=ml;}
  player.vx=mvx*spd; player.vz=mvz*spd;

  // Jump
  const jumpHeld=keys['Space']||touch.jump;
  if (jumpHeld && !jumpConsumed && jumpsLeft>0) {
    const isDouble = !player.onGround;
    player.vy=isDouble ? JUMP_VEL*0.88 : JUMP_VEL;
    player.onGround=false; jumpConsumed=true; jumpsLeft--;
    if (isDouble) { sfx(550,0.1,'square',0.1); sfx(770,0.12,'sine',0.08); }
    else sfxJump();
  }
  if (!jumpHeld) jumpConsumed=false;

  player.vy-=GRAVITY*dt;
  player.x+=player.vx*dt;
  player.y+=player.vy*dt;
  player.z+=player.vz*dt;

  // Update moving platforms
  for (const plat of platforms) {
    if (!plat.mov) continue;
    plat.mov.t+=dt;
    const off=Math.sin(plat.mov.t*plat.mov.spd)*plat.mov.range;
    if (plat.mov.axis==='x') plat.mesh.position.x=plat.mov.bx+off;
    if (plat.mov.axis==='y') plat.mesh.position.y=plat.mov.by+off;
    if (plat.mov.axis==='z') plat.mesh.position.z=plat.mov.bz+off;
  }

  // Collision
  resolveCollisions();

  // Death: fell into void
  if (player.y<-12) respawn();

  // Update lasers
  for (const lz of laserPivots) {
    lz.piv.rotation.y+=lz.spd*dt;
    if (laserHits(lz)) respawn();
  }

  // Checkpoint collection
  for (const cp of cpList) {
    if (cp.collected) continue;
    const dx=player.x-cp.x, dz=player.z-cp.z;
    if (Math.sqrt(dx*dx+dz*dz)<3) {
      cp.collected=true; cpCount++;
      spawnPos={x:cp.x, y:cp.y+1, z:cp.z+8};
      cp.coin.visible=false;
      showCPPop(); sfxCheckpoint(); updateHUD();
    }
  }

  // Bounce pad check
  if (player.onGround) {
    for (const bp of bouncePads) {
      if (Math.abs(player.x-bp.x)<bp.w/2+PW && Math.abs(player.z-bp.z)<bp.d/2+PW) {
        player.vy=JUMP_VEL*2.1; player.onGround=false;
        sfx(660,0.15,'square',0.15); sfx(880,0.1,'sine',0.1);
        break;
      }
    }
  }

  // Section name tracking
  let si=0; for(let i=SECTIONS.length-1;i>=0;i--){if(player.z<=SECTIONS[i].zMin){si=i;break;}}
  if (si!==curSecIdx) {
    curSecIdx=si;
    const nm=SECTIONS[Math.max(0,si)]?.name||'';
    document.getElementById('section-hud').textContent=nm;
    if (si>0) showSecAnnounce(nm);
  }

  // Floating coin collection
  for (const co of coinMeshes) {
    if (co.collected) continue;
    const dx=player.x-co.x, dy=player.y+0.9-co.y, dz=player.z-co.z;
    if (Math.sqrt(dx*dx+dy*dy+dz*dz)<1.4) {
      co.collected=true; co.mesh.visible=false; coinCount++;
      sfx(880,0.08,'sine',0.1); updateHUD();
    }
  }
  // Spin coins
  for (const co of coinMeshes) if (!co.collected) co.mesh.rotation.z+=dt*2;
  // Spin checkpoint coins
  for (const cp of cpList) if (!cp.collected) { cp.coin.rotation.y+=dt*2; cp.coin.position.y+=Math.sin(Date.now()/600)*0.003; }

  // Chest interaction
  if (!chestOpened && !gameWon) {
    const dx=player.x-CHEST_X, dz=player.z-CHEST_Z;
    if (Math.sqrt(dx*dx+dz*dz)<4) {
      chestOpened=true; gameWon=true;
      // Open lid
      if (chestLidMesh) chestLidMesh.rotation.x=-Math.PI*0.7;
      coinCount+=50;
      updateHUD();
      setTimeout(openWin, 600);
    }
  }

  // Sprint trail
  if (sprinting && (mvx||mvz) && Math.random()<0.35) spawnTrail();
  for (let i=trailParts.length-1;i>=0;i--) {
    const tp=trailParts[i];
    tp.age+=dt; tp.mesh.material.opacity=1-tp.age/tp.life;
    tp.mesh.position.y+=dt*0.5;
    if (tp.age>=tp.life){scene.remove(tp.mesh);trailParts.splice(i,1);}
  }

  // Sky/fog transition
  const si=getSkyIdx(player.z);
  if (si!==lastSkyIdx) {
    scene.background=new THREE.Color(SKIES[si].sky);
    scene.fog.color=new THREE.Color(SKIES[si].fog);
    lastSkyIdx=si;
  }

  // Sprint HUD
  document.getElementById('sprint-hud').style.display=sprinting&&(mvx||mvz)?'block':'none';

  // Hint near chest
  if (!gameWon) {
    const dx=player.x-CHEST_X, dz=player.z-CHEST_Z;
    setHint(Math.sqrt(dx*dx+dz*dz)<8 ? 'Walk to the chest to claim your reward! 💰💎' : '');
  }

  // Player mesh
  playerMesh.position.set(player.x, player.y, player.z);
  if (mvx||mvz) playerMesh.rotation.y=Math.atan2(mvx,mvz);
  const moving=mvx!==0||mvz!==0;
  if (moving) {
    legT+=dt*8;
    playerMesh.userData.ll.rotation.x=Math.sin(legT)*0.55;
    playerMesh.userData.rl.rotation.x=-Math.sin(legT)*0.55;
    playerMesh.userData.la.rotation.x=-Math.sin(legT)*0.45;
    playerMesh.userData.ra.rotation.x=Math.sin(legT)*0.45;
    playerMesh.position.y+=Math.abs(Math.sin(legT))*0.04;
  } else {
    playerMesh.userData.ll.rotation.x*=0.8;
    playerMesh.userData.rl.rotation.x*=0.8;
    playerMesh.userData.la.rotation.x*=0.8;
    playerMesh.userData.ra.rotation.x*=0.8;
  }

  // Camera: follow from behind and above
  const camTarget = new THREE.Vector3(player.x, player.y+6, player.z+10);
  camera.position.lerp(camTarget, 0.1);
  camera.lookAt(player.x, player.y+1, player.z-5);

  renderer.render(scene, camera);
}

updateHUD();
animate();
