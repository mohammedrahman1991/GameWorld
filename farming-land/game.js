'use strict';
/* ── Farming Land ── Three.js 3D farming game ───────────────────── */

// ── Seed types ────────────────────────────────────────────────────
const SEEDS = {
  carrot:    {name:'Carrot Seeds',    emoji:'🥕', cost:50,   growTime:8,  harvest:1000,  stCol:0x33AA22, crCol:0xFF6622},
  potato:    {name:'Potato Seeds',    emoji:'🥔', cost:150,  growTime:15, harvest:2000,  stCol:0x44BB33, crCol:0xBB8844},
  sunflower: {name:'Sunflower Seeds', emoji:'🌻', cost:300,  growTime:25, harvest:4000,  stCol:0x55CC44, crCol:0xFFDD00},
  legendary: {name:'Legendary Seeds', emoji:'✨', cost:500,  growTime:40, harvest:8000,  stCol:0x9944FF, crCol:0xDD66FF},
  og:        {name:'OG Seeds',        emoji:'👑', cost:2000, growTime:90, harvest:50000, stCol:0xFFAA00, crCol:0xFFDD44},
};

// ── Game state ────────────────────────────────────────────────────
let coins = 50;
const inventory = {carrot:0, potato:0, sunflower:0, legendary:0, og:0};
let selectedSeed = null;
let shopOpen = false;
let nearPlot  = null;
const touch = {up:false, down:false, left:false, right:false};

// ── Three.js core ─────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.014);

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'), antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 200);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── Lighting ──────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xFFFADD, 1.3);
sun.position.set(20, 30, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {near:1, far:100, left:-35, right:35, top:35, bottom:-35});
scene.add(sun);
scene.add(new THREE.AmbientLight(0xAABBFF, 0.7));

// ── Ground ────────────────────────────────────────────────────────
const gnd = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshLambertMaterial({color:0x55AA44})
);
gnd.rotation.x = -Math.PI/2;
gnd.receiveShadow = true;
scene.add(gnd);

// Dirt path from start to farm entrance
const path = new THREE.Mesh(
  new THREE.PlaneGeometry(2.6, 16),
  new THREE.MeshLambertMaterial({color:0xCCAA77})
);
path.rotation.x = -Math.PI/2;
path.position.set(0, 0.01, -3);
scene.add(path);

// ── Trees ─────────────────────────────────────────────────────────
function addTree(x, z) {
  const h = 1.8 + Math.random()*0.8;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, h, 6),
    new THREE.MeshLambertMaterial({color:0x8B5E3C})
  );
  trunk.position.set(x, h/2, z);
  trunk.castShadow = true;
  scene.add(trunk);
  const r = 1.5 + Math.random()*0.7;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(r, r*2, 7),
    new THREE.MeshLambertMaterial({color: Math.random()>0.3 ? 0x228833 : 0x33AA44})
  );
  leaves.position.set(x, h + r*0.65, z);
  leaves.castShadow = true;
  scene.add(leaves);
}
for (let i=0; i<22; i++) {
  const a = (i/22)*Math.PI*2, d = 23 + Math.random()*6;
  addTree(Math.cos(a)*d + (Math.random()-0.5)*4, Math.sin(a)*d + (Math.random()-0.5)*4);
}
[[-14,8],[14,8],[-15,-7],[15,-6],[-12,-18],[12,-18],[-7,13],[7,13],[-18,0],[18,0]].forEach(([x,z])=>addTree(x,z));

// ── Barn ──────────────────────────────────────────────────────────
(function() {
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(6,4,5),
    new THREE.MeshLambertMaterial({color:0xCC4422})
  );
  walls.position.set(17,2,-4); walls.castShadow=true; scene.add(walls);
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 4.6, 3, 4),
    new THREE.MeshLambertMaterial({color:0x993311})
  );
  roof.rotation.y = Math.PI/4; roof.position.set(17,5.5,-4); scene.add(roof);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.4,2.5,0.12),
    new THREE.MeshLambertMaterial({color:0x885533})
  );
  door.position.set(17,1.25,-1.5); scene.add(door);
  // Window
  const win = new THREE.Mesh(
    new THREE.BoxGeometry(0.9,0.9,0.1),
    new THREE.MeshLambertMaterial({color:0xAADDFF})
  );
  win.position.set(15.2,3,-1.45); scene.add(win);
})();

// ── Well ──────────────────────────────────────────────────────────
(function() {
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2,1.3,0.6,10),
    new THREE.MeshLambertMaterial({color:0x999999})
  );
  base.position.set(-13,0.3,-5); scene.add(base);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75,0.75,0.65,10,1,true),
    new THREE.MeshLambertMaterial({color:0x777777, side:THREE.DoubleSide})
  );
  wall.position.set(-13,0.62,-5); scene.add(wall);
  const roof1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.12,2,0.12),
    new THREE.MeshLambertMaterial({color:0xDDCC99})
  );
  roof1.position.set(-12.5,1.2,-5); scene.add(roof1);
  const roof2 = roof1.clone(); roof2.position.set(-13.5,1.2,-5); scene.add(roof2);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(1.1,0.8,6),
    new THREE.MeshLambertMaterial({color:0xCC7722})
  );
  cap.position.set(-13,2.2,-5); scene.add(cap);
})();

// ── Fence ─────────────────────────────────────────────────────────
const wMat = new THREE.MeshLambertMaterial({color:0xDDCC99});
function fPost(x,z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.18,1.4,0.18), wMat);
  m.position.set(x,0.7,z); m.castShadow=true; scene.add(m);
}
function fRail(x1,z1,x2,z2,y) {
  const dx=x2-x1, dz=z2-z1, len=Math.sqrt(dx*dx+dz*dz);
  const r = new THREE.Mesh(new THREE.BoxGeometry(len,0.09,0.09), wMat);
  r.position.set((x1+x2)/2, y, (z1+z2)/2);
  r.rotation.y = Math.atan2(dz, dx);
  scene.add(r);
}
const FX1=-8.5, FX2=8.5, FZ1=-16, FZ2=2.2;
for (let x=FX1; x<=FX2; x+=2) { fPost(x,FZ1); fPost(x,FZ2); }
for (let z=FZ1+2; z<FZ2; z+=2) { fPost(FX1,z); fPost(FX2,z); }
fRail(FX1,FZ1,FX2,FZ1,0.6); fRail(FX1,FZ1,FX2,FZ1,0.95);
fRail(FX1,FZ2,FX2,FZ2,0.6); fRail(FX1,FZ2,FX2,FZ2,0.95);
fRail(FX1,FZ1,FX1,FZ2,0.6); fRail(FX1,FZ1,FX1,FZ2,0.95);
fRail(FX2,FZ1,FX2,FZ2,0.6); fRail(FX2,FZ1,FX2,FZ2,0.95);

// Farm sign at entrance
(function() {
  const sm = new THREE.MeshLambertMaterial({color:0xCC9944});
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.15,2.4,0.15), wMat);
  p1.position.set(-1.1,1.2,2.4); scene.add(p1);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.15,2.4,0.15), wMat);
  p2.position.set(1.1,1.2,2.4); scene.add(p2);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.8,0.72,0.13), sm);
  sign.position.set(0,2.2,2.4); scene.add(sign);
})();

// ── Farmer ────────────────────────────────────────────────────────
function mkFarmer() {
  const g = new THREE.Group();
  const skin  = new THREE.MeshLambertMaterial({color:0xFFCC99});
  const blue  = new THREE.MeshLambertMaterial({color:0x3355CC});
  const white = new THREE.MeshLambertMaterial({color:0xEEEEEE});
  const straw = new THREE.MeshLambertMaterial({color:0xDDAA33});
  const boot  = new THREE.MeshLambertMaterial({color:0x553311});

  // Boots
  const bGeo = new THREE.BoxGeometry(0.25,0.2,0.32);
  const lBoot = new THREE.Mesh(bGeo,boot); lBoot.position.set(-0.15,0.1,0.06); g.add(lBoot);
  const rBoot = new THREE.Mesh(bGeo,boot); rBoot.position.set(0.15,0.1,0.06);  g.add(rBoot);

  // Legs
  const lGeo = new THREE.BoxGeometry(0.22,0.52,0.22);
  const lLeg = new THREE.Mesh(lGeo,blue); lLeg.position.set(-0.15,0.46,0); g.add(lLeg);
  const rLeg = new THREE.Mesh(lGeo,blue); rLeg.position.set(0.15,0.46,0);  g.add(rLeg);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56,0.72,0.35),blue);
  body.position.y=0.98; g.add(body);
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.35,0.37),white);
  shirt.position.set(0,1.0,0); g.add(shirt);

  // Arms
  const aGeo = new THREE.BoxGeometry(0.19,0.48,0.19);
  const lArm = new THREE.Mesh(aGeo,blue); lArm.position.set(-0.38,0.9,0); g.add(lArm);
  const rArm = new THREE.Mesh(aGeo,blue); rArm.position.set(0.38,0.9,0);  g.add(rArm);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.46,0.46),skin);
  head.position.y=1.62; g.add(head);

  // Hat brim
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.37,0.37,0.07,8),straw);
  brim.position.y=1.88; g.add(brim);
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,0.28,8),straw);
  hatTop.position.y=2.07; g.add(hatTop);

  g.userData.lLeg=lLeg; g.userData.rLeg=rLeg;
  g.userData.lArm=lArm; g.userData.rArm=rArm;
  return g;
}
const farmer = mkFarmer();
farmer.position.set(0,0,5);
scene.add(farmer);

// ── Farm plots (3 × 3) ────────────────────────────────────────────
const PSTEP = 4.0;
const plots  = [];

function spawnPlantMesh(plot) {
  if (plot.userData.plantMesh) {
    plot.remove(plot.userData.plantMesh);
    plot.userData.plantMesh = null;
    plot.userData.crownMesh = null;
  }
  const sk = plot.userData.seedKey;
  if (!sk) return;

  const prog  = plot.userData.growProgress;
  const stage = prog < 0.3 ? 1 : prog < 0.7 ? 2 : 3;
  plot.userData.stage = stage;

  const grp = new THREE.Group();
  const s   = SEEDS[sk];
  const sh  = 0.12 + stage * 0.28;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04,0.07,sh,6),
    new THREE.MeshLambertMaterial({color:s.stCol})
  );
  stem.position.y = sh/2 + 0.06;
  grp.add(stem);

  if (stage >= 2) {
    const isRdy = stage === 3;
    const crMat = new THREE.MeshLambertMaterial({
      color: s.crCol,
      emissive: isRdy ? new THREE.Color(s.crCol).multiplyScalar(0.25) : new THREE.Color(0),
    });
    const topY = sh + 0.1;
    let crown;
    switch (sk) {
      case 'carrot':
        crown = new THREE.Mesh(new THREE.ConeGeometry(0.18,0.4,6), crMat);
        crown.position.y = topY + 0.22;
        break;
      case 'sunflower': {
        crown = new THREE.Group();
        const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.08,12), crMat);
        const ctr  = new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),
          new THREE.MeshLambertMaterial({color:0x663300}));
        ctr.position.y = 0.07;
        crown.add(disk, ctr);
        crown.position.y = topY + 0.06;
        break;
      }
      case 'legendary':
        crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22,0), crMat);
        crown.position.y = topY + 0.22;
        break;
      case 'og':
        crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), crMat);
        crown.position.y = topY + 0.26;
        break;
      default: // potato
        crown = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8), crMat);
        crown.position.y = topY + 0.2;
    }
    grp.add(crown);
    plot.userData.crownMesh = crown;

    if (isRdy) {
      // Ring of small orbs for ready glow
      for (let i=0; i<4; i++) {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.06,6,6),
          new THREE.MeshLambertMaterial({color:s.crCol, emissive:new THREE.Color(s.crCol).multiplyScalar(0.8)})
        );
        const a = (i/4)*Math.PI*2;
        orb.position.set(Math.cos(a)*0.4, topY+0.4, Math.sin(a)*0.4);
        orb.userData.orbAngle = a;
        grp.add(orb);
      }
    }
  }

  grp.position.set(0, 0.07, 0);
  plot.add(grp);
  plot.userData.plantMesh = grp;
}

for (let row=0; row<3; row++) {
  for (let col=0; col<3; col++) {
    const px = -PSTEP + col*PSTEP;
    const pz = -13   + row*PSTEP;

    const plotGrp = new THREE.Group();
    plotGrp.position.set(px, 0, pz);

    const soilMat = new THREE.MeshLambertMaterial({color:0x8B5E3C});
    const soil = new THREE.Mesh(new THREE.BoxGeometry(PSTEP*0.86, 0.13, PSTEP*0.86), soilMat);
    soil.position.y = 0.065;
    soil.receiveShadow = true;
    plotGrp.add(soil);

    // Border edging
    const edgeMat = new THREE.MeshLambertMaterial({color:0x6B4E2C});
    const hw = PSTEP*0.86/2;
    [[0,-hw,0],[0,hw,0],[-hw,0,1],[hw,0,1]].forEach(([ex,ez,rot]) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(rot ? 0.1 : PSTEP*0.86, 0.19, rot ? PSTEP*0.86 : 0.1), edgeMat);
      e.position.set(ex,0.095,ez); plotGrp.add(e);
    });

    plotGrp.userData.soilMat     = soilMat;
    plotGrp.userData.state       = 'empty';
    plotGrp.userData.seedKey     = null;
    plotGrp.userData.growProgress= 0;
    plotGrp.userData.stage       = 0;
    plotGrp.userData.plantMesh   = null;
    plotGrp.userData.crownMesh   = null;

    scene.add(plotGrp);
    plots.push(plotGrp);
  }
}

// ── Input ─────────────────────────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (e.code==='KeyE')   tryInteract();
  if (e.code==='KeyQ')   shopOpen ? closeShop() : openShop();
  if (e.code==='Escape') closeShop();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// Mobile d-pad
['up','down','left','right'].forEach(dir => {
  const el = document.getElementById('btn-'+dir);
  if (!el) return;
  el.addEventListener('pointerdown',   e => { touch[dir]=true;  e.preventDefault(); });
  el.addEventListener('pointerup',     () => { touch[dir]=false; });
  el.addEventListener('pointercancel', () => { touch[dir]=false; });
});
const actBtn = document.getElementById('btn-interact');
if (actBtn) {
  actBtn.addEventListener('pointerdown', e => { tryInteract(); e.preventDefault(); });
}

// ── UI ────────────────────────────────────────────────────────────
function updateUI() {
  document.getElementById('coins').textContent = `💰 ${coins.toLocaleString()}`;
  // Auto-pick a seed if current is empty
  if (!selectedSeed || inventory[selectedSeed] === 0) {
    selectedSeed = null;
    for (const [k,v] of Object.entries(inventory)) { if (v>0) { selectedSeed=k; break; } }
  }
  if (selectedSeed) {
    const s = SEEDS[selectedSeed];
    document.getElementById('inv-display').textContent =
      `${s.emoji} ${s.name} ×${inventory[selectedSeed]}`;
  } else {
    document.getElementById('inv-display').textContent = 'No seeds — open Shop';
  }
}

function openShop() {
  shopOpen = true;
  document.getElementById('shop-modal').classList.add('open');
  buildShopCards();
}
function closeShop() {
  shopOpen = false;
  document.getElementById('shop-modal').classList.remove('open');
}
window.openShop  = openShop;
window.closeShop = closeShop;

function buildShopCards() {
  const grid = document.getElementById('seed-grid');
  grid.innerHTML = '';
  for (const [key, s] of Object.entries(SEEDS)) {
    const can = coins >= s.cost;
    const card = document.createElement('div');
    card.className = 'seed-card' + (key==='legendary'?' legendary':key==='og'?' og':'');
    card.innerHTML = `
      <div class="emoji">${s.emoji}</div>
      <div class="name">${s.name}</div>
      <div class="cost">💰 ${s.cost.toLocaleString()} coins</div>
      <div class="info">⏱ ${s.growTime}s grow</div>
      <div class="reward">🌾 +${s.harvest.toLocaleString()} harvest</div>
      <div class="inv">In bag: ${inventory[key]}</div>
      <button onclick="buySeed('${key}')" ${can?'':'disabled'}>${can?'BUY':'Need '+s.cost.toLocaleString()}</button>`;
    grid.appendChild(card);
  }
}

function buySeed(key) {
  const s = SEEDS[key];
  if (coins < s.cost) return;
  coins -= s.cost;
  inventory[key]++;
  selectedSeed = key;
  updateUI();
  buildShopCards();
  const msg = document.getElementById('buy-msg');
  msg.textContent = `✓ Bought ${s.name}!`;
  msg.style.opacity = '1';
  setTimeout(() => { msg.style.opacity='0'; }, 1600);
}
window.buySeed = buySeed;

// ── Interaction ───────────────────────────────────────────────────
function tryInteract() {
  if (shopOpen || !nearPlot) return;
  const p = nearPlot;
  if (p.userData.state === 'ready') {
    const reward = SEEDS[p.userData.seedKey].harvest;
    coins += reward;
    if (p.userData.plantMesh) { p.remove(p.userData.plantMesh); p.userData.plantMesh=null; p.userData.crownMesh=null; }
    p.userData.state='empty'; p.userData.seedKey=null;
    p.userData.growProgress=0; p.userData.stage=0;
    p.userData.soilMat.color.set(0x8B5E3C);
    floatText(`+${reward.toLocaleString()} 💰`, farmer.position.clone().add(new THREE.Vector3(0,2.8,0)));
    updateUI();
  } else if (p.userData.state === 'empty') {
    if (!selectedSeed || inventory[selectedSeed] <= 0) { openShop(); return; }
    inventory[selectedSeed]--;
    p.userData.seedKey = selectedSeed;
    p.userData.state = 'planted';
    p.userData.growProgress = 0;
    p.userData.stage = 0;
    p.userData.soilMat.color.set(0x6B4520);
    spawnPlantMesh(p);
    updateUI();
  }
}

// ── Floating text labels ──────────────────────────────────────────
const floats = [];
function floatText(txt, wPos) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;font:bold 22px monospace;color:#FFD700;'
    + 'text-shadow:0 1px 4px #000;pointer-events:none;z-index:200;transition:opacity 0.4s;';
  div.textContent = txt;
  document.body.appendChild(div);
  floats.push({div, pos: wPos.clone(), age:0, life:1.6});
}
function updateFloats(dt) {
  for (let i=floats.length-1; i>=0; i--) {
    const f = floats[i];
    f.age += dt;
    f.pos.y += dt*2.2;
    const p = f.pos.clone().project(camera);
    f.div.style.left = ((p.x+1)/2*window.innerWidth - 50)+'px';
    f.div.style.top  = ((-p.y+1)/2*window.innerHeight)+'px';
    f.div.style.opacity = Math.max(0, 1 - f.age/f.life);
    if (f.age >= f.life) { f.div.remove(); floats.splice(i,1); }
  }
}

// ── Game loop ─────────────────────────────────────────────────────
const clock = new THREE.Clock();
let legT = 0;
const SPEED = 5;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (!shopOpen) {
    // ── Movement ──
    const mv = new THREE.Vector3();
    if (keys['KeyW']||keys['ArrowUp']   ||touch.up)    mv.z -= 1;
    if (keys['KeyS']||keys['ArrowDown'] ||touch.down)  mv.z += 1;
    if (keys['KeyA']||keys['ArrowLeft'] ||touch.left)  mv.x -= 1;
    if (keys['KeyD']||keys['ArrowRight']||touch.right) mv.x += 1;
    const moving = mv.lengthSq() > 0;
    if (moving) {
      mv.normalize().multiplyScalar(SPEED*dt);
      farmer.position.add(mv);
      farmer.position.x = Math.max(-20, Math.min(20, farmer.position.x));
      farmer.position.z = Math.max(-20, Math.min(15, farmer.position.z));
      farmer.rotation.y = Math.atan2(mv.x, mv.z);
    }

    // ── Leg animation ──
    if (moving) {
      legT += dt*8;
      farmer.userData.lLeg.rotation.x = Math.sin(legT)*0.5;
      farmer.userData.rLeg.rotation.x = -Math.sin(legT)*0.5;
      farmer.userData.lArm.rotation.x = -Math.sin(legT)*0.4;
      farmer.userData.rArm.rotation.x = Math.sin(legT)*0.4;
      farmer.position.y = Math.abs(Math.sin(legT))*0.05;
    } else {
      farmer.userData.lLeg.rotation.x *= 0.75;
      farmer.userData.rLeg.rotation.x *= 0.75;
      farmer.userData.lArm.rotation.x *= 0.75;
      farmer.userData.rArm.rotation.x *= 0.75;
      farmer.position.y *= 0.75;
    }

    // ── Plot growth + animation ──
    for (const p of plots) {
      if (p.userData.state === 'planted' || p.userData.state === 'growing') {
        p.userData.growProgress += dt / SEEDS[p.userData.seedKey].growTime;
        if (p.userData.growProgress >= 1) {
          p.userData.growProgress = 1;
          p.userData.state = 'ready';
          p.userData.soilMat.color.set(0x9B6E4C);
        } else {
          p.userData.state = 'growing';
        }
        const newStage = p.userData.growProgress < 0.3 ? 1 : p.userData.growProgress < 0.7 ? 2 : 3;
        if (newStage !== p.userData.stage) spawnPlantMesh(p);
      }
      // Spin ready crop crowns
      if (p.userData.state === 'ready' && p.userData.crownMesh) {
        p.userData.crownMesh.rotation.y += dt*1.8;
      }
    }

    // ── Nearest plot detection ──
    const fp = farmer.position;
    let best = null, bestD = Infinity;
    for (const p of plots) {
      const dx = fp.x-p.position.x, dz = fp.z-p.position.z;
      const d  = Math.sqrt(dx*dx+dz*dz);
      if (d < 2.6 && d < bestD) { bestD=d; best=p; }
    }
    nearPlot = best;
    const hint = document.getElementById('hint');
    if (best) {
      hint.style.display = 'block';
      const st = best.userData.state;
      if (st==='ready')   hint.textContent = 'Press E to Harvest 🌾';
      else if (st==='empty') {
        hint.textContent = (selectedSeed && inventory[selectedSeed]>0)
          ? `Press E to Plant ${SEEDS[selectedSeed].emoji}`
          : 'Press E → open Shop 🛒';
      } else hint.textContent = `Growing… ${Math.round(best.userData.growProgress*100)}%`;
    } else {
      hint.style.display = 'none';
    }
  }

  // ── Camera follow ──
  const target = farmer.position.clone().add(new THREE.Vector3(0, 14, 11));
  camera.position.lerp(target, 0.08);
  camera.lookAt(farmer.position.x, farmer.position.y+1, farmer.position.z);

  updateFloats(dt);
  renderer.render(scene, camera);
}

updateUI();
animate();
