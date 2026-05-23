'use strict';
/* ── PACKAGING GAME ── 3D City Delivery ─────────────────────────── */

// ── Three.js setup ─────────────────────────────────────────────────
const canvas = document.getElementById('c');
const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0xAAD4FF, 130, 260);

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(62, window.innerWidth/window.innerHeight, 0.1, 300);
window.addEventListener('resize', ()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.58));
const sun = new THREE.DirectionalLight(0xFFFADD, 1.05);
sun.position.set(90, 160, 90);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {near:1, far:500, left:-250, right:250, top:250, bottom:-250});
scene.add(sun);

// ── City constants ──────────────────────────────────────────────────
const ROADS  = [-120, -60, 0, 60, 120];   // road centre lines (x and z)
const ROAD_W = 12;
const BLK_X  = [-90, -30, 30, 90];        // block centres
const BLK_Z  = [-90, -30, 30, 90];

// ── Orders / Locations ──────────────────────────────────────────────
const ORDERS = [
  {customer:'Jake',  face:'🧑', item:'📚 Books',    pay:25, locIdx:0},
  {customer:'Sarah', face:'👩', item:'🎮 Console',  pay:40, locIdx:1},
  {customer:'Mike',  face:'🧔', item:'🌸 Flowers',  pay:20, locIdx:2},
  {customer:'Emma',  face:'👧', item:'🍕 Pizza',    pay:15, locIdx:3},
  {customer:'Tom',   face:'👴', item:'💊 Medicine', pay:30, locIdx:4},
  {customer:'Lisa',  face:'👱‍♀️', item:'📱 Phone',   pay:50, locIdx:1},
  {customer:'Alex',  face:'🧒', item:'🧸 Toy Bear', pay:22, locIdx:2},
];

const LOCATIONS = [
  {name:"Blue House",   x:-90, z:-90, col:0x3366FF},
  {name:"Red Store",    x: 90, z:-90, col:0xFF3333},
  {name:"Green Villa",  x: 90, z: 90, col:0x33AA33},
  {name:"Yellow Café",  x:-90, z: 90, col:0xFFCC00},
  {name:"Purple Shop",  x: 30, z:-90, col:0xAA33FF},
];

// ── Game state ──────────────────────────────────────────────────────
let gameState = 'order';
let money = 0;
let currentOrder = null;
let orderIdx = 0;

// ── Ground ──────────────────────────────────────────────────────────
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(440, 440),
  new THREE.MeshLambertMaterial({color:0x70A050})
);
ground.rotation.x = -Math.PI/2;
ground.receiveShadow = true;
scene.add(ground);

// ── Roads ────────────────────────────────────────────────────────────
const roadMat = new THREE.MeshLambertMaterial({color:0x555555});
const lineMat = new THREE.MeshLambertMaterial({color:0xFFFF88});
ROADS.forEach(r => {
  const rh = new THREE.Mesh(new THREE.PlaneGeometry(400, ROAD_W), roadMat);
  rh.rotation.x = -Math.PI/2; rh.position.set(0, 0.01, r); scene.add(rh);
  const rv = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 400), roadMat);
  rv.rotation.x = -Math.PI/2; rv.position.set(r, 0.01, 0); scene.add(rv);
  // Centre lines
  const lh = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.35), lineMat);
  lh.rotation.x = -Math.PI/2; lh.position.set(0, 0.02, r); scene.add(lh);
  const lv = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 400), lineMat);
  lv.rotation.x = -Math.PI/2; lv.position.set(r, 0.02, 0); scene.add(lv);
});

// ── Buildings ────────────────────────────────────────────────────────
const BCOLS = [0x4488BB, 0xAA6633, 0x778899, 0x4A7744, 0xCC8833,
               0x9944CC, 0x336699, 0xAA4444, 0x44AAAA, 0x886644];
const rng = (a,b) => a + Math.random()*(b-a);

BLK_X.forEach(bx => {
  BLK_Z.forEach(bz => {
    const isDestBlock = LOCATIONS.some(l => Math.abs(l.x-bx)<5 && Math.abs(l.z-bz)<5);
    const count = isDestBlock ? 2 : Math.floor(rng(3, 6));
    for (let i = 0; i < count; i++) {
      if (isDestBlock && i === 0) continue; // leave space for house
      const ox = rng(-19, 19), oz = rng(-19, 19);
      const w = rng(6, 13), d = rng(6, 13);
      const h = i === 0 ? rng(16, 30) : rng(5, 16);
      const col = BCOLS[Math.floor(Math.random()*BCOLS.length)];
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({color:col}));
      m.position.set(bx+ox, h/2, bz+oz);
      m.castShadow = true; m.receiveShadow = true;
      scene.add(m);
      // Rooftop stripe
      const rt = new THREE.Mesh(new THREE.BoxGeometry(w+0.2, 0.35, d+0.2),
        new THREE.MeshLambertMaterial({color:0x222222}));
      rt.position.set(bx+ox, h+0.18, bz+oz);
      scene.add(rt);
    }
  });
});

// ── Trees ────────────────────────────────────────────────────────────
const treeMat  = new THREE.MeshLambertMaterial({color:0x228833});
const trunkMat = new THREE.MeshLambertMaterial({color:0x553311});
function addTree(x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.2, 6), trunkMat);
  trunk.position.set(x, 1.1, z); trunk.castShadow = true; scene.add(trunk);
  const top = new THREE.Mesh(new THREE.SphereGeometry(1.6+rng(0,.6), 7, 5), treeMat);
  top.position.set(x, 3.4+rng(0,.4), z); top.castShadow = true; scene.add(top);
}
BLK_X.forEach(bx => BLK_Z.forEach(bz => {
  [[-22,-22],[-22,22],[22,-22],[22,22]].forEach(([ox,oz])=>{
    if (Math.random()<0.65) addTree(bx+ox, bz+oz);
  });
}));

// ── Delivery houses ──────────────────────────────────────────────────
const destMarkers = [];
LOCATIONS.forEach((loc, i) => {
  const g = new THREE.Group();
  // House body
  const body = new THREE.Mesh(new THREE.BoxGeometry(11, 7, 11),
    new THREE.MeshLambertMaterial({color:loc.col}));
  body.position.y = 3.5; body.castShadow = true; g.add(body);
  // Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 5, 4),
    new THREE.MeshLambertMaterial({color:0x882211}));
  roof.position.y = 10.5; roof.rotation.y = Math.PI/4; g.add(roof);
  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.4, 0.2),
    new THREE.MeshLambertMaterial({color:0x553311}));
  door.position.set(0, 1.7, 5.6); g.add(door);
  // Windows
  [-2.8, 2.8].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.2),
      new THREE.MeshLambertMaterial({color:0x88CCFF, transparent:true, opacity:0.75}));
    win.position.set(wx, 4, 5.6); g.add(win);
  });
  g.position.set(loc.x, 0, loc.z); scene.add(g);

  // Beacon + star (shown when active destination)
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 26, 8),
    new THREE.MeshLambertMaterial({color:loc.col,
      emissive:new THREE.Color(loc.col).multiplyScalar(0.65),
      transparent:true, opacity:0.5})
  );
  beacon.position.set(loc.x, 13, loc.z); beacon.visible = false; scene.add(beacon);

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.8),
    new THREE.MeshLambertMaterial({color:0xFFFF44,
      emissive:new THREE.Color(0xFFDD00).multiplyScalar(0.85)}));
  star.position.set(loc.x, 27, loc.z); star.visible = false; scene.add(star);

  destMarkers.push({beacon, star, loc});
});

// ── Warehouse ────────────────────────────────────────────────────────
{
  const wh = new THREE.Mesh(new THREE.BoxGeometry(20, 11, 20),
    new THREE.MeshLambertMaterial({color:0xCC8833}));
  wh.position.set(0, 5.5, 14); wh.castShadow = true; scene.add(wh);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(20, 1.4, 20),
    new THREE.MeshLambertMaterial({color:0xFF8800,
      emissive:new THREE.Color(0xFF6600).multiplyScalar(0.3)}));
  sign.position.set(0, 11.7, 14); scene.add(sign);
}

// ── Van ──────────────────────────────────────────────────────────────
function buildVan() {
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(3, 2.1, 5.5),
    new THREE.MeshLambertMaterial({color:0xFFCC00}));
  body.position.y = 1.4; body.castShadow = true; g.add(body);
  // Cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 2.5),
    new THREE.MeshLambertMaterial({color:0xEEBB00}));
  cab.position.set(0, 2.6, -1.6); g.add(cab);
  // Windshield
  const ws = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 0.12),
    new THREE.MeshLambertMaterial({color:0x99DDFF, transparent:true, opacity:0.75}));
  ws.position.set(0, 2.58, -2.88); g.add(ws);
  // Wheels
  const wMat = new THREE.MeshLambertMaterial({color:0x1a1a1a});
  const wGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 10);
  [[1.6,0.52,1.9],[-1.6,0.52,1.9],[1.6,0.52,-1.9],[-1.6,0.52,-1.9]].forEach(p=>{
    const w = new THREE.Mesh(wGeo, wMat); w.rotation.z = Math.PI/2;
    w.position.set(...p); g.add(w);
  });
  // Headlights
  const hlM = new THREE.MeshLambertMaterial({color:0xFFFFAA,
    emissive:new THREE.Color(0xFFFF88).multiplyScalar(0.6)});
  [-1.1, 1.1].forEach(s => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.12), hlM);
    hl.position.set(s, 1.82, -2.95); g.add(hl);
  });
  return g;
}
const vanGroup = buildVan();
vanGroup.position.set(0, 0, -6);
scene.add(vanGroup);

const van = {x:0, z:-6, angle:0, speed:0, loaded:false};

// ── Character ────────────────────────────────────────────────────────
function buildChar() {
  const g = new THREE.Group();
  const skin  = new THREE.MeshLambertMaterial({color:0xFFCC99});
  const shirt = new THREE.MeshLambertMaterial({color:0x2244BB});
  const pants = new THREE.MeshLambertMaterial({color:0x222255});
  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.55), skin);
  head.position.y = 1.72; head.castShadow = true; g.add(head);
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.75,0.35), shirt);
  body.position.y = 1.07; g.add(body);
  // Arms
  [-0.48, 0.48].forEach(ax => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.55,0.2), shirt);
    arm.position.set(ax, 0.95, 0); g.add(arm);
  });
  // Legs (stored for animation)
  const legs = [];
  [-0.17, 0.17].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24,0.62,0.24), pants);
    leg.position.set(lx, 0.4, 0); g.add(leg);
    legs.push(leg);
  });
  g.userData.legs = legs;
  return g;
}
const charGroup = buildChar();
charGroup.visible = false; charGroup.castShadow = true;
scene.add(charGroup);

const char = {x:0, z:0, angle:0, inVan:true, hasBox:false, walkT:0};

// ── Package box ──────────────────────────────────────────────────────
const pkgGroup = new THREE.Group();
pkgGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.9),
  new THREE.MeshLambertMaterial({color:0xCC9944})));
pkgGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.92,0.2,0.92),
  new THREE.MeshLambertMaterial({color:0xFF8800})));
pkgGroup.visible = false; pkgGroup.castShadow = true;
scene.add(pkgGroup);

// ── Moving cars ──────────────────────────────────────────────────────
function buildCar(col) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2,0.9,4),
    new THREE.MeshLambertMaterial({color:col}));
  body.position.y = 0.65; body.castShadow = true; g.add(body);
  // Windows (dark top)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.62,2.4),
    new THREE.MeshLambertMaterial({color:0x223344, transparent:true, opacity:0.8}));
  top.position.set(0, 1.36, -0.2); g.add(top);
  const wm = new THREE.MeshLambertMaterial({color:0x111111});
  [[0.96,0.38,1.3],[-0.96,0.38,1.3],[0.96,0.38,-1.3],[-0.96,0.38,-1.3]].forEach(p=>{
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.28,8),wm);
    w.rotation.z = Math.PI/2; w.position.set(...p); g.add(w);
  });
  return g;
}

const CAR_COLS = [0xFF4444,0x4466FF,0x44AA44,0xFF8800,0xEEEEEE,0xFF44CC,0x884400,0x008888,0xAAAA00,0x880088];
const carMeshes = [], carStates = [];

ROADS.forEach((r,i) => {
  // Horizontal car (moves in x)
  const dir = i%2===0 ? 1 : -1;
  const cm = buildCar(CAR_COLS[i % CAR_COLS.length]);
  const sx = dir > 0 ? -170 : 170;
  cm.position.set(sx, 0, r + (Math.random()-0.5)*2);
  cm.rotation.y = dir > 0 ? Math.PI : 0;
  scene.add(cm); carMeshes.push(cm);
  carStates.push({x:sx, z:r, vx:dir*rng(16,24), vz:0, road:'h'});
  // Vertical car (moves in z)
  const vdir = i%2===0 ? 1 : -1;
  const vm = buildCar(CAR_COLS[(i+5) % CAR_COLS.length]);
  const sz = vdir > 0 ? -170 : 170;
  vm.position.set(r + (Math.random()-0.5)*2, 0, sz);
  vm.rotation.y = vdir > 0 ? -Math.PI/2 : Math.PI/2;
  scene.add(vm); carMeshes.push(vm);
  carStates.push({x:r, z:sz, vx:0, vz:vdir*rng(16,24), road:'v'});
});

// ── 3D route line ────────────────────────────────────────────────────
let routeLine = null;
function updateRoute() {
  if (routeLine) { scene.remove(routeLine); routeLine = null; }
  if (!currentOrder || gameState !== 'drive') return;
  const dest = LOCATIONS[currentOrder.locIdx];
  const pts = [new THREE.Vector3(van.x, 0.6, van.z), new THREE.Vector3(dest.x, 0.6, dest.z)];
  routeLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({color:0xFFFF44})
  );
  scene.add(routeLine);
}

// ── Input ────────────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ── Mini-map ─────────────────────────────────────────────────────────
const mm = document.getElementById('minimap');
const mmCtx = mm.getContext('2d');
const MMS = 80, MMSC = MMS / 300;
function toMM(x, z) { return {sx:(x+150)*MMSC, sz:(z+150)*MMSC}; }

function drawMiniMap() {
  mmCtx.clearRect(0, 0, MMS, MMS);
  // Background
  mmCtx.fillStyle = '#1a2a10'; mmCtx.fillRect(0, 0, MMS, MMS);
  // Roads
  ROADS.forEach(r => {
    const sr = (r+150)*MMSC;
    mmCtx.fillStyle = '#555';
    mmCtx.fillRect(0, sr-ROAD_W*MMSC/2, MMS, ROAD_W*MMSC);
    mmCtx.fillRect(sr-ROAD_W*MMSC/2, 0, ROAD_W*MMSC, MMS);
  });
  // Delivery markers
  LOCATIONS.forEach((l,i) => {
    const {sx,sz} = toMM(l.x, l.z);
    mmCtx.fillStyle = '#' + l.col.toString(16).padStart(6,'0');
    mmCtx.fillRect(sx-5, sz-5, 10, 10);
    if (currentOrder && currentOrder.locIdx === i) {
      mmCtx.strokeStyle = '#FFD700'; mmCtx.lineWidth = 2;
      mmCtx.strokeRect(sx-7, sz-7, 14, 14);
    }
  });
  // Warehouse
  const {sx:wx, sz:wz} = toMM(0, 14);
  mmCtx.fillStyle = '#FF8800'; mmCtx.fillRect(wx-5, wz-5, 10, 10);
  // Route line
  if (currentOrder && gameState === 'drive') {
    const d = LOCATIONS[currentOrder.locIdx];
    const vs = toMM(van.x, van.z), ds = toMM(d.x, d.z);
    mmCtx.strokeStyle = 'rgba(255,255,70,0.85)'; mmCtx.lineWidth = 2;
    mmCtx.setLineDash([5,4]);
    mmCtx.beginPath(); mmCtx.moveTo(vs.sx, vs.sz); mmCtx.lineTo(ds.sx, ds.sz); mmCtx.stroke();
    mmCtx.setLineDash([]);
  }
  // Van
  const {sx:vs, sz:vz} = toMM(van.x, van.z);
  mmCtx.save(); mmCtx.translate(vs, vz); mmCtx.rotate(van.angle);
  mmCtx.fillStyle = '#FFD700'; mmCtx.fillRect(-4,-7,8,14); mmCtx.restore();
  // Character on foot
  if (!char.inVan && gameState === 'deliver') {
    const {sx:cs, sz:cz} = toMM(char.x, char.z);
    mmCtx.fillStyle = '#FF88FF';
    mmCtx.beginPath(); mmCtx.arc(cs, cz, 4, 0, Math.PI*2); mmCtx.fill();
  }
}

// ── Distance display ─────────────────────────────────────────────────
function getDestDist() {
  if (!currentOrder) return 9999;
  const d = LOCATIONS[currentOrder.locIdx];
  return Math.sqrt((van.x-d.x)**2 + (van.z-d.z)**2);
}
function getCharDist() {
  if (!currentOrder) return 9999;
  const d = LOCATIONS[currentOrder.locIdx];
  return Math.sqrt((char.x-d.x)**2 + (char.z-d.z)**2);
}

// ── Phone content ────────────────────────────────────────────────────
function updatePhone() {
  if (!currentOrder) return;
  const loc = LOCATIONS[currentOrder.locIdx];
  const phase = gameState==='pack' ? '📦 Pack the item' :
                gameState==='drive' ? '🚐 Drive to destination' :
                gameState==='deliver' ? '🚶 Walk to the door' : '';
  document.getElementById('phone-content').innerHTML = `
    <div style="color:#88FFAA;font-weight:bold;font-size:11px;margin-bottom:4px;">ORDER #${orderIdx}</div>
    <div style="font-size:24px;margin:4px 0">${currentOrder.face}</div>
    <div style="color:#ccc;font-size:10px;">${currentOrder.customer}</div>
    <div style="font-size:15px;margin:5px 0">${currentOrder.item}</div>
    <div style="color:#FFD700;font-size:11px;">💰 $${currentOrder.pay}</div>
    <div style="color:#88AAFF;font-size:9px;margin-top:4px;">📍 ${loc.name}</div>
    <div style="color:#aaa;font-size:9px;margin-top:3px;">${phase}</div>
  `;
}

// ── Game flow functions ───────────────────────────────────────────────
function showOrderScreen() {
  currentOrder = ORDERS[orderIdx % ORDERS.length];
  const loc = LOCATIONS[currentOrder.locIdx];
  document.getElementById('order-face').textContent = currentOrder.face;
  document.getElementById('order-customer').textContent = currentOrder.customer + ' needs...';
  document.getElementById('order-item').textContent = 'Item: ' + currentOrder.item;
  document.getElementById('order-pay').textContent = 'Pay: $' + currentOrder.pay;
  document.getElementById('order-addr').textContent = '📍 Deliver to: ' + loc.name;
  document.getElementById('order-overlay').style.display = 'flex';
  document.getElementById('reward-overlay').style.display = 'none';
  document.getElementById('minimap').style.display = 'none';
  document.getElementById('map-label').style.display = 'none';
  document.getElementById('phone').style.display = 'none';
  document.getElementById('pack-btn').style.display = 'none';
  document.getElementById('deliver-btn').style.display = 'none';
  document.getElementById('exit-van-btn').style.display = 'none';
  document.getElementById('dist-hud').style.display = 'none';
  document.getElementById('state-label').textContent = '📱 NEW ORDER';
  document.getElementById('hint').textContent = 'Accept an order to begin!';
  gameState = 'order';
}

window.acceptOrder = function() {
  document.getElementById('order-overlay').style.display = 'none';
  gameState = 'pack';
  // Reset van + character to warehouse
  van.x=0; van.z=-6; van.angle=0; van.speed=0; van.loaded=false;
  char.inVan=true; char.hasBox=false;
  vanGroup.position.set(0,0,-6); vanGroup.rotation.y=0;
  charGroup.visible=false; pkgGroup.visible=false;
  destMarkers.forEach(m=>{m.beacon.visible=false; m.star.visible=false;});
  if (routeLine) { scene.remove(routeLine); routeLine=null; }
  document.getElementById('phone').style.display = 'block';
  document.getElementById('pack-btn').style.display = 'block';
  document.getElementById('state-label').textContent = '📦 PACK THE ITEM INTO THE BOX';
  document.getElementById('hint').textContent = 'Click PACK ITEM to load your van!';
  updatePhone();
};

window.skipOrder = function() { orderIdx++; showOrderScreen(); };

window.doPack = function() {
  document.getElementById('pack-btn').style.display = 'none';
  van.loaded = true;
  pkgGroup.visible = true;
  pkgGroup.position.set(0, 3.2, -6);
  setTimeout(() => {
    gameState = 'drive';
    const loc = LOCATIONS[currentOrder.locIdx];
    document.getElementById('minimap').style.display = 'block';
    document.getElementById('map-label').style.display = 'block';
    document.getElementById('dist-hud').style.display = 'block';
    document.getElementById('state-label').textContent = '🚐 DRIVE TO: ' + loc.name;
    document.getElementById('hint').textContent = 'W/S = gas/brake  ·  A/D = steer  ·  SHIFT = boost  ·  E near destination = exit van';
    destMarkers.forEach((m,i)=>{
      m.beacon.visible = (i===currentOrder.locIdx);
      m.star.visible   = (i===currentOrder.locIdx);
    });
    updateRoute(); updatePhone();
  }, 350);
};

function doExitVan() {
  if (!char.inVan || gameState !== 'drive') return;
  char.inVan = false; gameState = 'deliver';
  const sideAngle = van.angle + Math.PI/2;
  char.x = van.x + Math.sin(sideAngle)*3.2;
  char.z = van.z + Math.cos(sideAngle)*3.2;
  char.angle = van.angle; char.hasBox = true;
  charGroup.visible = true;
  charGroup.position.set(char.x, 0, char.z);
  pkgGroup.position.set(char.x, 0.9, char.z);
  document.getElementById('exit-van-btn').style.display = 'none';
  document.getElementById('state-label').textContent = '🚶 WALK TO THE FRONT DOOR';
  document.getElementById('hint').textContent = 'W/A/S/D to walk · press Deliver button at the door!';
  document.getElementById('dist-hud').style.display = 'none';
  updatePhone();
}
window.exitVan = doExitVan;

window.doDeliver = function() {
  if (gameState !== 'deliver') return;
  document.getElementById('deliver-btn').style.display = 'none';
  gameState = 'reward';
  money += currentOrder.pay;
  document.getElementById('money-hud').textContent = '💵 $' + money;
  pkgGroup.visible = false; char.hasBox = false;
  destMarkers.forEach(m=>{m.beacon.visible=false; m.star.visible=false;});
  if (routeLine) { scene.remove(routeLine); routeLine=null; }
  document.getElementById('dist-hud').style.display = 'none';
  document.getElementById('reward-overlay').style.display = 'flex';
  document.getElementById('reward-text').textContent = '+$' + currentOrder.pay + '  ' + currentOrder.item + ' delivered!';
  document.getElementById('total-text').textContent = 'Total earned: $' + money;
  orderIdx++;
};

window.nextOrder = function() {
  document.getElementById('reward-overlay').style.display = 'none';
  showOrderScreen();
};

// ── Main loop ─────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt  = Math.min(clock.getDelta(), 0.05);
  const now = Date.now() / 1000;

  // Animate beacons
  destMarkers.forEach(m => {
    if (m.beacon.visible) {
      m.beacon.material.opacity = 0.3 + Math.sin(now*3)*0.2;
      m.star.rotation.y = now * 2;
      m.star.rotation.x = now * 1.3;
    }
  });

  // Move traffic cars
  carStates.forEach((c,i) => {
    if (c.road==='h') {
      c.x += c.vx*dt;
      if (c.x >  175) c.x = -175;
      if (c.x < -175) c.x =  175;
      carMeshes[i].position.set(c.x, 0, c.z);
      carMeshes[i].rotation.y = c.vx > 0 ? Math.PI : 0;
    } else {
      c.z += c.vz*dt;
      if (c.z >  175) c.z = -175;
      if (c.z < -175) c.z =  175;
      carMeshes[i].position.set(c.x, 0, c.z);
      carMeshes[i].rotation.y = c.vz > 0 ? -Math.PI/2 : Math.PI/2;
    }
  });

  // ── DRIVE / DELIVER ───────────────────────────────────────────────
  if (gameState === 'drive' || gameState === 'deliver') {

    if (char.inVan) {
      // Van controls
      const acc = (keys['KeyW']||keys['ArrowUp']) ? 1 : (keys['KeyS']||keys['ArrowDown']) ? -1 : 0;
      const str = (keys['KeyA']||keys['ArrowLeft']) ? 1 : (keys['KeyD']||keys['ArrowRight']) ? -1 : 0;
      const maxSpd = keys['ShiftLeft'] ? 30 : 18;

      van.speed += acc * 20 * dt;                    // accelerate
      if (acc === 0) van.speed -= van.speed * 3 * dt; // coast friction (only when no input)
      van.speed = Math.max(-8, Math.min(maxSpd, van.speed));
      van.angle -= str * 1.6 * dt;                   // turn at any speed

      van.x += Math.sin(van.angle) * van.speed * dt;
      van.z += Math.cos(van.angle) * van.speed * dt;
      van.x  = Math.max(-170, Math.min(170, van.x));
      van.z  = Math.max(-170, Math.min(170, van.z));

      vanGroup.position.set(van.x, 0, van.z);
      vanGroup.rotation.y = van.angle;

      // Package rides on van roof
      if (van.loaded && pkgGroup.visible) {
        pkgGroup.position.set(van.x, 3.2, van.z);
        pkgGroup.rotation.y = van.angle;
      }

      // Distance HUD
      const dist = Math.round(getDestDist());
      document.getElementById('dist-hud').textContent = '📍 Destination: ' + dist + 'm';

      // Near destination — show exit button
      const nearDest = dist < 22;
      document.getElementById('exit-van-btn').style.display = (nearDest && gameState==='drive') ? 'block' : 'none';
      if (gameState==='drive') {
        document.getElementById('state-label').textContent = nearDest
          ? '🅿️ ARRIVED — GET OUT OF VAN!'
          : '🚐 DRIVE TO: ' + LOCATIONS[currentOrder.locIdx].name;
      }

      // Also allow E key to exit
      if (nearDest && keys['KeyE'] && gameState==='drive') doExitVan();

      updateRoute();

    } else {
      // Character walking
      const fwd = keys['KeyW'] || keys['ArrowUp'];
      const bwd = keys['KeyS'] || keys['ArrowDown'];
      const lft = keys['KeyA'] || keys['ArrowLeft'];
      const rgt = keys['KeyD'] || keys['ArrowRight'];

      if (lft) char.angle += 2.3 * dt;
      if (rgt) char.angle -= 2.3 * dt;
      const CSPD = 5.5;
      if (fwd) { char.x += Math.sin(char.angle)*CSPD*dt; char.z += Math.cos(char.angle)*CSPD*dt; }
      if (bwd) { char.x -= Math.sin(char.angle)*CSPD*dt; char.z -= Math.cos(char.angle)*CSPD*dt; }
      char.x = Math.max(-170, Math.min(170, char.x));
      char.z = Math.max(-170, Math.min(170, char.z));

      charGroup.position.set(char.x, 0, char.z);
      charGroup.rotation.y = char.angle;

      // Leg walk animation
      if (fwd || bwd) {
        char.walkT += dt*8;
        const legs = charGroup.userData.legs;
        legs[0].rotation.x =  Math.sin(char.walkT)*0.6;
        legs[1].rotation.x = -Math.sin(char.walkT)*0.6;
      }

      // Box in hands
      if (char.hasBox) {
        pkgGroup.position.set(char.x, 0.9, char.z);
        pkgGroup.rotation.y = char.angle;
      }

      // Near door?
      const atDoor = getCharDist() < 10;
      document.getElementById('deliver-btn').style.display = atDoor ? 'block' : 'none';
      if (atDoor) {
        document.getElementById('state-label').textContent = '🎁 PRESS DELIVER!';
        if (keys['KeyE']) doDeliver();
      } else {
        document.getElementById('state-label').textContent = '🚶 WALK TO THE FRONT DOOR';
      }
    }

    // Camera: smooth follow behind van / character
    const tx = char.inVan ? van.x : char.x;
    const tz = char.inVan ? van.z : char.z;
    const ta = char.inVan ? van.angle : char.angle;
    const camDist = char.inVan ? 20 : 10;
    const camH    = char.inVan ? 13 : 6;
    const camX = tx + Math.sin(ta) * camDist;
    const camZ = tz + Math.cos(ta) * camDist;
    camera.position.lerp(new THREE.Vector3(camX, camH, camZ), 0.07);
    camera.lookAt(tx, char.inVan ? 1 : 0.8, tz);

    drawMiniMap();
  }

  // Warehouse view during PACK
  if (gameState === 'pack') {
    camera.position.lerp(new THREE.Vector3(0, 9, 14), 0.05);
    camera.lookAt(0, 0, 0);
  }

  // Bird's eye for ORDER / REWARD screens
  if (gameState === 'order' || gameState === 'reward') {
    camera.position.lerp(new THREE.Vector3(0, 70, 90), 0.02);
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
}

// ── Init ──────────────────────────────────────────────────────────────
camera.position.set(0, 70, 90);
camera.lookAt(0, 0, 0);
renderer.render(scene, camera);
showOrderScreen();
animate();
