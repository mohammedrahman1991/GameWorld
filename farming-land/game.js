'use strict';
/* ── Farming Land ── Three.js 3D farming game ───────────────────── */

function wbLoad(d){try{return Object.assign({},d,JSON.parse(localStorage.getItem('wb_save_farming'))||{});}catch(e){return d;}}
function wbSave(d){try{localStorage.setItem('wb_save_farming',JSON.stringify(d));}catch(e){}}
const _wb=wbLoad({coins:50,fortLevel:0,inventory:{carrot:0,potato:0,sunflower:0,legendary:0,og:0}});

// ── Seed types ────────────────────────────────────────────────────
const SEEDS = {
  carrot:    {name:'Carrot Seeds',    emoji:'🥕', cost:50,   growTime:8,  harvest:1000,  stCol:0x33AA22, crCol:0xFF6622},
  potato:    {name:'Potato Seeds',    emoji:'🥔', cost:150,  growTime:15, harvest:2000,  stCol:0x44BB33, crCol:0xBB8844},
  sunflower: {name:'Sunflower Seeds', emoji:'🌻', cost:300,  growTime:25, harvest:4000,  stCol:0x55CC44, crCol:0xFFDD00},
  legendary: {name:'Legendary Seeds', emoji:'✨', cost:500,  growTime:40, harvest:8000,  stCol:0x9944FF, crCol:0xDD66FF},
  og:        {name:'OG Seeds',        emoji:'👑', cost:2000, growTime:90, harvest:50000, stCol:0xFFAA00, crCol:0xFFDD44},
};

// ── Fort upgrade levels ───────────────────────────────────────────
const FORT_LEVELS = [
  null,
  {cost:500,    label:'Stone Keep',     keepH:4,    towerH:5.2,   wallH:3.5, spread:4.5,  depth:3.5,  keepW:3.5, towerR:0.75, stoneCol:0x999999},
  {cost:3000,   label:'Small Fort',     keepH:6.5,  towerH:7.8,   wallH:5.2, spread:6,    depth:4.5,  keepW:4.5, towerR:0.95, stoneCol:0x888888},
  {cost:10000,  label:'Fort Castle',    keepH:9,    towerH:10.5,  wallH:7,   spread:7.5,  depth:5.5,  keepW:5.5, towerR:1.15, stoneCol:0x777777},
  {cost:30000,  label:'Grand Castle',   keepH:11.5, towerH:13.2,  wallH:8.8, spread:9,    depth:6.5,  keepW:6.5, towerR:1.38, stoneCol:0x666666},
  {cost:100000, label:'Royal Fortress', keepH:15,   towerH:17,    wallH:11,  spread:11,   depth:8,    keepW:8,   towerR:1.7,  stoneCol:0x555555},
];

// ── Game state ────────────────────────────────────────────────────
let coins = _wb.coins;
const inventory = Object.assign({carrot:0,potato:0,sunflower:0,legendary:0,og:0}, _wb.inventory);
let selectedSeed = null;
let shopOpen     = false;
let nearPlot     = null;
let nearFort     = false;
let fortLevel    = _wb.fortLevel;
const touch = {up:false, down:false, left:false, right:false};

// ── Three.js core ─────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.010);

const renderer = new THREE.WebGLRenderer({canvas:document.getElementById('c'), antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 250);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── Lighting ──────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xFFFADD, 1.3);
sun.position.set(20, 35, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {near:1, far:120, left:-50, right:50, top:50, bottom:-50});
scene.add(sun);
scene.add(new THREE.AmbientLight(0xAABBFF, 0.7));

// ── Ground ────────────────────────────────────────────────────────
const gnd = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshLambertMaterial({color:0x55AA44})
);
gnd.rotation.x = -Math.PI/2;
gnd.receiveShadow = true;
scene.add(gnd);

// Dirt path from start to farm entrance
const path = new THREE.Mesh(
  new THREE.PlaneGeometry(3, 16),
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
for (let i=0; i<24; i++) {
  const a = (i/24)*Math.PI*2, d = 30 + Math.random()*8;
  addTree(Math.cos(a)*d + (Math.random()-0.5)*4, Math.sin(a)*d + (Math.random()-0.5)*4);
}
[[-18,8],[18,8],[-20,-8],[20,-7],[-16,-22],[16,-22],[-9,14],[9,14],[-24,0],[24,0],
 [-20,-35],[20,-35],[0,-38],[10,-38],[-10,-38]].forEach(([x,z])=>addTree(x,z));

// ── Barn ──────────────────────────────────────────────────────────
(function() {
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6,4,5), new THREE.MeshLambertMaterial({color:0xCC4422}));
  walls.position.set(20,2,-4); walls.castShadow=true; scene.add(walls);
  const roof  = new THREE.Mesh(new THREE.CylinderGeometry(0.1,4.6,3,4), new THREE.MeshLambertMaterial({color:0x993311}));
  roof.rotation.y=Math.PI/4; roof.position.set(20,5.5,-4); scene.add(roof);
  const door  = new THREE.Mesh(new THREE.BoxGeometry(1.4,2.5,0.12), new THREE.MeshLambertMaterial({color:0x885533}));
  door.position.set(20,1.25,-1.5); scene.add(door);
  const win   = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.1), new THREE.MeshLambertMaterial({color:0xAADDFF}));
  win.position.set(18.2,3,-1.45); scene.add(win);
})();

// ── Well ──────────────────────────────────────────────────────────
(function() {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.3,0.6,10), new THREE.MeshLambertMaterial({color:0x999999}));
  base.position.set(-16,0.3,-5); scene.add(base);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.75,0.75,0.65,10,1,true), new THREE.MeshLambertMaterial({color:0x777777, side:THREE.DoubleSide}));
  wall.position.set(-16,0.62,-5); scene.add(wall);
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(0.12,2,0.12), new THREE.MeshLambertMaterial({color:0xDDCC99}));
  r1.position.set(-15.5,1.2,-5); scene.add(r1);
  const r2 = r1.clone(); r2.position.set(-16.5,1.2,-5); scene.add(r2);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1,0.8,6), new THREE.MeshLambertMaterial({color:0xCC7722}));
  cap.position.set(-16,2.2,-5); scene.add(cap);
})();

// ── Fence (expanded for big farm) ────────────────────────────────
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
// Outer fence encompassing 5×5 farm + fort area
const FX1=-13, FX2=13, FZ1=-26, FZ2=2.2;
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

  const bGeo = new THREE.BoxGeometry(0.25,0.2,0.32);
  const lBoot = new THREE.Mesh(bGeo,boot); lBoot.position.set(-0.15,0.1,0.06); g.add(lBoot);
  const rBoot = new THREE.Mesh(bGeo,boot); rBoot.position.set(0.15,0.1,0.06);  g.add(rBoot);

  const lGeo = new THREE.BoxGeometry(0.22,0.52,0.22);
  const lLeg = new THREE.Mesh(lGeo,blue); lLeg.position.set(-0.15,0.46,0); g.add(lLeg);
  const rLeg = new THREE.Mesh(lGeo,blue); rLeg.position.set(0.15,0.46,0);  g.add(rLeg);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56,0.72,0.35),blue);
  body.position.y=0.98; g.add(body);
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.35,0.37),white);
  shirt.position.set(0,1.0,0); g.add(shirt);

  const aGeo = new THREE.BoxGeometry(0.19,0.48,0.19);
  const lArm = new THREE.Mesh(aGeo,blue); lArm.position.set(-0.38,0.9,0); g.add(lArm);
  const rArm = new THREE.Mesh(aGeo,blue); rArm.position.set(0.38,0.9,0);  g.add(rArm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46,0.46,0.46),skin);
  head.position.y=1.62; g.add(head);
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

// ── Farm plots (5 × 5) ────────────────────────────────────────────
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
      default:
        crown = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8), crMat);
        crown.position.y = topY + 0.2;
    }
    grp.add(crown);
    plot.userData.crownMesh = crown;

    if (isRdy) {
      for (let i=0; i<4; i++) {
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.06,6,6),
          new THREE.MeshLambertMaterial({color:s.crCol, emissive:new THREE.Color(s.crCol).multiplyScalar(0.8)})
        );
        const a = (i/4)*Math.PI*2;
        orb.position.set(Math.cos(a)*0.4, topY+0.4, Math.sin(a)*0.4);
        grp.add(orb);
      }
    }
  }

  grp.position.set(0, 0.07, 0);
  plot.add(grp);
  plot.userData.plantMesh = grp;
}

// 5 rows × 5 cols = 25 plots
for (let row=0; row<5; row++) {
  for (let col=0; col<5; col++) {
    const px = -PSTEP*2 + col*PSTEP;
    const pz = -5       - (4-row)*PSTEP;  // row 4 = z=-5 (front), row 0 = z=-21 (back)

    const plotGrp = new THREE.Group();
    plotGrp.position.set(px, 0, pz);

    const soilMat = new THREE.MeshLambertMaterial({color:0x8B5E3C});
    const soil = new THREE.Mesh(new THREE.BoxGeometry(PSTEP*0.86, 0.13, PSTEP*0.86), soilMat);
    soil.position.y = 0.065;
    soil.receiveShadow = true;
    plotGrp.add(soil);

    const edgeMat = new THREE.MeshLambertMaterial({color:0x6B4E2C});
    const hw = PSTEP*0.86/2;
    [[0,-hw,0],[0,hw,0],[-hw,0,1],[hw,0,1]].forEach(([ex,ez,rot]) => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(rot?0.1:PSTEP*0.86, 0.19, rot?PSTEP*0.86:0.1), edgeMat);
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

// ── Fort Castle (behind farm at z = -32) ──────────────────────────
const FORT_Z = -32;
const fortGroup = new THREE.Group();
fortGroup.position.set(0, 0, FORT_Z);
scene.add(fortGroup);

function buildFort(level) {
  while (fortGroup.children.length > 0) fortGroup.remove(fortGroup.children[0]);
  if (level === 0) return;

  const lv   = FORT_LEVELS[level];
  const stone = new THREE.MeshLambertMaterial({color: lv.stoneCol});
  const dark  = new THREE.MeshLambertMaterial({color: 0x333333});
  const roofM = new THREE.MeshLambertMaterial({color: 0x4a2020});
  const woodM = new THREE.MeshLambertMaterial({color: 0xDDCC99});
  const sp = lv.spread, dp = lv.depth;

  // Stone courtyard / platform
  const court = new THREE.Mesh(
    new THREE.BoxGeometry(sp*2 + lv.towerR*2.5, 0.35, dp*2 + lv.towerR*2.5), stone);
  court.position.y = 0.18; fortGroup.add(court);

  // Inner dirt yard
  const yard = new THREE.Mesh(
    new THREE.PlaneGeometry(sp*2 - 0.5, dp*2 - 0.5),
    new THREE.MeshLambertMaterial({color:0x9B7050}));
  yard.rotation.x = -Math.PI/2;
  yard.position.y = 0.36; fortGroup.add(yard);

  // Main keep (central tower)
  const keep = new THREE.Mesh(new THREE.BoxGeometry(lv.keepW, lv.keepH, lv.keepW), stone);
  keep.position.y = lv.keepH/2 + 0.35;
  keep.castShadow = true; fortGroup.add(keep);

  // Keep windows (dark slots) on each face
  if (level >= 2) {
    const wFloors = Math.max(1, Math.floor(lv.keepH / 3.5));
    for (let fl=0; fl<wFloors; fl++) {
      const wy = 1.5 + fl * 3.2 + 0.35;
      [[0,lv.keepW/2+0.05,0],[0,-lv.keepW/2-0.05,Math.PI],
       [lv.keepW/2+0.05,0,Math.PI/2],[-lv.keepW/2-0.05,0,-Math.PI/2]].forEach(([wx,wz,wr]) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.45,0.8,0.1), dark);
        win.position.set(wx, wy, wz); win.rotation.y=wr; fortGroup.add(win);
      });
    }
  }

  // Keep battlements
  const merlonsPerSide = Math.max(3, Math.floor(lv.keepW / 1.1));
  for (let side=0; side<4; side++) {
    for (let i=0; i<merlonsPerSide; i++) {
      const t = (i + 0.5) / merlonsPerSide;
      const off = -lv.keepW/2 + t*lv.keepW;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.68, 0.44), stone);
      const my = lv.keepH + 0.35 + 0.34;
      if (side===0) m.position.set(off, my, -lv.keepW/2);
      if (side===1) m.position.set(off, my,  lv.keepW/2);
      if (side===2) m.position.set(-lv.keepW/2, my, off);
      if (side===3) m.position.set( lv.keepW/2, my, off);
      fortGroup.add(m);
    }
  }

  // Keep flag
  const kPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2.5,5), woodM);
  kPole.position.set(0, lv.keepH + 0.35 + 1.35, 0); fortGroup.add(kPole);
  const kFlag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.65),
    new THREE.MeshLambertMaterial({color:0xCC2222, side:THREE.DoubleSide}));
  kFlag.position.set(0.55, lv.keepH + 0.35 + 2.3, 0); fortGroup.add(kFlag);

  // 4 corner towers
  const corners = [[-sp,-dp],[sp,-dp],[-sp,dp],[sp,dp]];
  const flagColors = [0xCC2222, 0x2244CC, 0xCC2222, 0x2244CC];
  corners.forEach(([tx,tz], ci) => {
    const tow = new THREE.Mesh(
      new THREE.CylinderGeometry(lv.towerR, lv.towerR*1.12, lv.towerH, 8), stone);
    tow.position.set(tx, lv.towerH/2+0.35, tz);
    tow.castShadow = true; fortGroup.add(tow);

    // Arrow slits on tower
    if (level >= 2) {
      for (let sl=0; sl<2; sl++) {
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.55,lv.towerR*0.2), dark);
        slit.position.set(tx, lv.towerH*0.35 + sl*lv.towerH*0.25 + 0.35, tz + lv.towerR*1.02);
        fortGroup.add(slit);
      }
    }

    // Cone roof
    const tRoof = new THREE.Mesh(
      new THREE.ConeGeometry(lv.towerR*1.35, lv.towerH*0.28, 8), roofM);
    tRoof.position.set(tx, lv.towerH + 0.35 + lv.towerH*0.14, tz); fortGroup.add(tRoof);

    // Flag
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,2,5), woodM);
    pole.position.set(tx, lv.towerH + 0.35 + lv.towerH*0.28 + 1.1, tz); fortGroup.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55),
      new THREE.MeshLambertMaterial({color: flagColors[ci], side:THREE.DoubleSide}));
    fl.position.set(tx + 0.45, lv.towerH + 0.35 + lv.towerH*0.28 + 1.75, tz); fortGroup.add(fl);
  });

  // Curtain walls
  const wallThk = 0.7;
  const wLen = sp*2 - lv.towerR*2;  // side-to-side wall length
  const dLen = dp*2 - lv.towerR*2;  // front-to-back wall length

  // Back wall
  const bWall = new THREE.Mesh(new THREE.BoxGeometry(wLen, lv.wallH, wallThk), stone);
  bWall.position.set(0, lv.wallH/2+0.35, -dp); bWall.castShadow=true; fortGroup.add(bWall);

  // Side walls
  const lWall = new THREE.Mesh(new THREE.BoxGeometry(wallThk, lv.wallH, dLen), stone);
  lWall.position.set(-sp, lv.wallH/2+0.35, 0); lWall.castShadow=true; fortGroup.add(lWall);
  const rWall = lWall.clone(); rWall.position.x = sp; fortGroup.add(rWall);

  // Front wall (with gate)
  const gateW = Math.min(1.6 + level*0.15, 2.4);
  const gateH = lv.wallH * 0.72;
  const hg = gateW/2, hw2 = wLen/2;

  const fwL = new THREE.Mesh(new THREE.BoxGeometry(hw2-hg, lv.wallH, wallThk), stone);
  fwL.position.set(-(hg + (hw2-hg)/2), lv.wallH/2+0.35, dp); fortGroup.add(fwL);
  const fwR = fwL.clone(); fwR.position.x = hg + (hw2-hg)/2; fortGroup.add(fwR);

  const archH = lv.wallH - gateH;
  const arch = new THREE.Mesh(new THREE.BoxGeometry(gateW, archH, wallThk), stone);
  arch.position.set(0, gateH + archH/2 + 0.35, dp); fortGroup.add(arch);

  // Gate door (dark void)
  const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(gateW-0.1, gateH, 0.12), dark);
  gateMesh.position.set(0, gateH/2+0.35, dp + wallThk/2 + 0.06); fortGroup.add(gateMesh);

  // Portcullis bars (level 2+)
  if (level >= 2) {
    const barMat = new THREE.MeshLambertMaterial({color:0x555555});
    for (let bi=0; bi<3; bi++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, gateH, 0.1), barMat);
      bar.position.set(-gateW/2 + gateW/4 + bi*(gateW/4), gateH/2+0.35, dp+wallThk/2+0.1);
      fortGroup.add(bar);
    }
  }

  // Battlements on all walls
  function wallMerlons(cx, cz, len, isX) {
    const cnt = Math.floor(len / 1.15);
    for (let i=0; i<cnt; i++) {
      const t = (i+0.5)/cnt, offset = (t-0.5)*len;
      const m = new THREE.Mesh(new THREE.BoxGeometry(isX?0.44:0.5, 0.68, isX?0.44:0.5), stone);
      if (isX) m.position.set(cx+offset, lv.wallH+0.35+0.34, cz);
      else     m.position.set(cx, lv.wallH+0.35+0.34, cz+offset);
      fortGroup.add(m);
    }
  }
  wallMerlons(0, -dp, wLen, true);
  wallMerlons(0,  dp, wLen, true);
  wallMerlons(-sp, 0, dLen, false);
  wallMerlons( sp, 0, dLen, false);

  // Extra grand details at level 5
  if (level === 5) {
    // Second keep tower on top
    const topTow = new THREE.Mesh(new THREE.BoxGeometry(lv.keepW*0.55, lv.keepH*0.45, lv.keepW*0.55), stone);
    topTow.position.y = lv.keepH + 0.35 + lv.keepH*0.225; fortGroup.add(topTow);
    const topRoof = new THREE.Mesh(new THREE.ConeGeometry(lv.keepW*0.45, lv.keepH*0.2, 4), roofM);
    topRoof.rotation.y = Math.PI/4;
    topRoof.position.y = lv.keepH + 0.35 + lv.keepH*0.45 + lv.keepH*0.1; fortGroup.add(topRoof);
    // Gold crown on the very top
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 12),
      new THREE.MeshLambertMaterial({color:0xFFD700, emissive:new THREE.Color(0xFFD700).multiplyScalar(0.3)}));
    crown.position.y = lv.keepH + 0.35 + lv.keepH*0.45 + lv.keepH*0.2 + 0.6; fortGroup.add(crown);
  }
}

// Place an "UPGRADE" marker near the fort entrance
const upgradeMarker = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 0.8, 0.12, 12),
  new THREE.MeshLambertMaterial({color:0xFFD700, emissive:new THREE.Color(0xFFD700).multiplyScalar(0.4)})
);
upgradeMarker.position.set(0, 0.06, FORT_Z + 5);
scene.add(upgradeMarker);

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

['up','down','left','right'].forEach(dir => {
  const el = document.getElementById('btn-'+dir);
  if (!el) return;
  el.addEventListener('pointerdown',   e => { touch[dir]=true;  e.preventDefault(); });
  el.addEventListener('pointerup',     () => { touch[dir]=false; });
  el.addEventListener('pointercancel', () => { touch[dir]=false; });
});
const actBtn = document.getElementById('btn-interact');
if (actBtn) actBtn.addEventListener('pointerdown', e => { tryInteract(); e.preventDefault(); });

// ── UI ────────────────────────────────────────────────────────────
function updateUI() {
  document.getElementById('coins').textContent = `💰 ${coins.toLocaleString()}`;
  if (!selectedSeed || inventory[selectedSeed] === 0) {
    selectedSeed = null;
    for (const [k,v] of Object.entries(inventory)) { if (v>0) { selectedSeed=k; break; } }
  }
  if (selectedSeed) {
    const s = SEEDS[selectedSeed];
    document.getElementById('inv-display').textContent = `${s.emoji} ${s.name} ×${inventory[selectedSeed]}`;
  } else {
    document.getElementById('inv-display').textContent = 'No seeds — open Shop';
  }
  const fl = document.getElementById('fort-level');
  if (fl) {
    if (fortLevel === 0)  fl.textContent = '🏰 Fort: Not built';
    else if (fortLevel === 5) fl.textContent = `🏰 ${FORT_LEVELS[5].label} ⭐ MAX`;
    else fl.textContent = `🏰 ${FORT_LEVELS[fortLevel].label} (Lv ${fortLevel}/5)`;
  }
  wbSave({coins, fortLevel, inventory: Object.assign({}, inventory)});
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
window.openShop = openShop; window.closeShop = closeShop;

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
  msg.style.opacity='1';
  setTimeout(() => { msg.style.opacity='0'; }, 1600);
}
window.buySeed = buySeed;

// ── Interaction (farm plots + fort) ───────────────────────────────
function tryInteract() {
  if (shopOpen) return;

  // Fort upgrade takes priority when near
  if (nearFort) {
    if (fortLevel >= 5) return; // max
    const nextLv = FORT_LEVELS[fortLevel + 1];
    if (coins < nextLv.cost) {
      floatText(`Need 💰${nextLv.cost.toLocaleString()}`, farmer.position.clone().add(new THREE.Vector3(0,2.8,0)));
      return;
    }
    coins -= nextLv.cost;
    fortLevel++;
    buildFort(fortLevel);
    floatText(`🏰 ${nextLv.label}!`, farmer.position.clone().add(new THREE.Vector3(0,3.2,0)));
    updateUI();
    return;
  }

  if (!nearPlot) return;
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
  floats.push({div, pos: wPos.clone(), age:0, life:1.8});
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
const SPEED = 6;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (!shopOpen) {
    // Movement
    const mv = new THREE.Vector3();
    if (keys['KeyW']||keys['ArrowUp']   ||touch.up)    mv.z -= 1;
    if (keys['KeyS']||keys['ArrowDown'] ||touch.down)  mv.z += 1;
    if (keys['KeyA']||keys['ArrowLeft'] ||touch.left)  mv.x -= 1;
    if (keys['KeyD']||keys['ArrowRight']||touch.right) mv.x += 1;
    const moving = mv.lengthSq() > 0;
    if (moving) {
      mv.normalize().multiplyScalar(SPEED*dt);
      farmer.position.add(mv);
      farmer.position.x = Math.max(-25, Math.min(25, farmer.position.x));
      farmer.position.z = Math.max(-38, Math.min(15, farmer.position.z));
      farmer.rotation.y = Math.atan2(mv.x, mv.z);
    }

    // Leg animation
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

    // Plot growth + animation
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
      if (p.userData.state === 'ready' && p.userData.crownMesh) {
        p.userData.crownMesh.rotation.y += dt*1.8;
      }
    }

    // Upgrade marker pulse
    upgradeMarker.rotation.y += dt*1.5;
    upgradeMarker.position.y = 0.06 + Math.sin(Date.now()/600)*0.08;

    // Fort flags wave
    let flagT = Date.now()/800;
    fortGroup.children.forEach(c => {
      if (c.geometry && c.geometry.type === 'PlaneGeometry') {
        c.rotation.y = Math.sin(flagT)*0.25;
      }
    });

    // Nearest plot detection
    const fp = farmer.position;
    let best = null, bestD = Infinity;
    for (const p of plots) {
      const dx = fp.x-p.position.x, dz = fp.z-p.position.z;
      const d = Math.sqrt(dx*dx+dz*dz);
      if (d < 2.6 && d < bestD) { bestD=d; best=p; }
    }
    nearPlot = best;

    // Fort detection
    const dFort = Math.sqrt((fp.x)**2 + (fp.z - FORT_Z - 5)**2);
    nearFort = dFort < 5;

    // Hint display (fort takes priority over plot)
    const hint = document.getElementById('hint');
    if (nearFort) {
      hint.style.display = 'block';
      if (fortLevel >= 5) {
        hint.textContent = `🏰 Royal Fortress — MAX LEVEL 👑`;
      } else {
        const next = FORT_LEVELS[fortLevel + 1];
        const canAfford = coins >= next.cost;
        hint.textContent = canAfford
          ? `Press E to Build: ${next.label} (💰${next.cost.toLocaleString()})`
          : `🏰 Upgrade needs 💰${next.cost.toLocaleString()} — keep farming!`;
      }
    } else if (best) {
      hint.style.display = 'block';
      const st = best.userData.state;
      if (st==='ready') hint.textContent = 'Press E to Harvest 🌾';
      else if (st==='empty') {
        hint.textContent = (selectedSeed && inventory[selectedSeed]>0)
          ? `Press E to Plant ${SEEDS[selectedSeed].emoji}`
          : 'Press E → open Shop 🛒';
      } else hint.textContent = `Growing… ${Math.round(best.userData.growProgress*100)}%`;
    } else {
      hint.style.display = 'none';
    }
  }

  // Camera follow
  const target = farmer.position.clone().add(new THREE.Vector3(0, 15, 12));
  camera.position.lerp(target, 0.08);
  camera.lookAt(farmer.position.x, farmer.position.y+1, farmer.position.z);

  updateFloats(dt);
  renderer.render(scene, camera);
}

buildFort(fortLevel);
updateUI();
animate();
