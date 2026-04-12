import * as THREE from 'three';

// ── Terrain constants ─────────────────────────────────────────
const ISLAND_RADIUS = 150;
const SEG = 120; // terrain grid segments

// ── Simple deterministic noise ─────────────────────────────────
function hash(n) { return ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1; }

function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix,        fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix      + iz      * 57);
  const b = hash(ix + 1  + iz      * 57);
  const c = hash(ix      + (iz + 1)* 57);
  const d = hash(ix + 1  + (iz + 1)* 57);
  return a + (b - a) * ux + (c - a) * uz + ((d - c) - (b - a)) * ux * uz;
}

function fbm(x, z, oct = 5) {
  let v = 0, a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { v += a * noise2(x * f, z * f); s += a; a *= 0.5; f *= 2.1; }
  return v / s;
}

// ── Public terrain height function ────────────────────────────
export function getTerrainHeight(x, z) {
  const r = ISLAND_RADIUS;
  const dist = Math.sqrt(x * x + z * z) / r;  // 0 = center, 1 = edge

  if (dist >= 1) return -3; // underwater

  // Smooth falloff profile — beach starts at dist ~0.75
  const beachMask  = Math.max(0, 1 - Math.pow(Math.max(0, dist - 0.72) / 0.28, 1.5));
  const islandMask = Math.max(0, 1 - Math.pow(dist, 2.5));

  // FBM base terrain
  const scale = 0.018;
  const n = fbm(x * scale, z * scale, 5);
  const n2 = fbm(x * scale * 2.5 + 17, z * scale * 2.5 + 5, 3);

  let height = (n * 0.7 + n2 * 0.3) * islandMask * 70 * beachMask;

  // Mountain peaks (Iceland-style off-center)
  const mtn = [
    { cx:  55, cz: -40, h: 62, r2: 900 },
    { cx: -45, cz:  55, h: 80, r2: 700 },
    { cx:  10, cz:  70, h: 48, r2: 600 },
    { cx: -60, cz: -25, h: 35, r2: 500 },
  ];
  mtn.forEach(m => {
    const d2 = (x - m.cx) ** 2 + (z - m.cz) ** 2;
    height += m.h * Math.exp(-d2 / m.r2) * islandMask;
  });

  return Math.max(0, height);
}

// ── Terrain vertex color ───────────────────────────────────────
function terrainColor(h, x, z) {
  const c = new THREE.Color();
  const jitter = (noise2(x * 0.3, z * 0.3) - 0.5) * 0.06;

  if (h < 0.3) {
    c.setRGB(0.92 + jitter, 0.82 + jitter, 0.52 + jitter); // wet sand
  } else if (h < 1.5) {
    c.lerpColors(new THREE.Color(0xe8c878), new THREE.Color(0xd4a84a), (h - 0.3) / 1.2);
  } else if (h < 5) {
    c.lerpColors(new THREE.Color(0xc8b044), new THREE.Color(0x6aaa3c), (h - 1.5) / 3.5);
  } else if (h < 22) {
    c.lerpColors(new THREE.Color(0x5a9a34), new THREE.Color(0x3a7a20), (h - 5) / 17);
    c.r += jitter; c.g += jitter;
  } else if (h < 45) {
    c.lerpColors(new THREE.Color(0x6a7a60), new THREE.Color(0x888878), (h - 22) / 23);
  } else {
    c.lerpColors(new THREE.Color(0xccccbb), new THREE.Color(0xffffff), Math.min(1, (h - 45) / 20));
  }
  return c;
}

// ── Main environment builder ───────────────────────────────────
export function createEnvironment(scene) {
  // Sky
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x9ad4ee, 0.0015);

  // ── Lighting ────────────────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xfff5e0, 0.45);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfffae0, 1.3);
  sun.position.set(120, 180, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 600;
  sun.shadow.camera.left   = -220;
  sun.shadow.camera.right  = 220;
  sun.shadow.camera.top    = 220;
  sun.shadow.camera.bottom = -220;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Sky hemisphere fill
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x5a8a30, 0.35);
  scene.add(hemi);

  // ── Sun sphere ──────────────────────────────────────────────
  const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(9, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfffce0 })
  );
  sunSphere.position.set(240, 360, 160);
  scene.add(sunSphere);

  // Sun glow halo
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.15, side: THREE.BackSide });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(22, 16, 16), haloMat);
  halo.position.copy(sunSphere.position);
  scene.add(halo);

  // ── Terrain ─────────────────────────────────────────────────
  const size = ISLAND_RADIUS * 2;
  const geo  = new THREE.PlaneGeometry(size, size, SEG, SEG);
  geo.rotateX(-Math.PI / 2);

  const pos  = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = getTerrainHeight(x, z);
    pos.setY(i, h);
    const c = terrainColor(h, x, z);
    cols[i * 3]     = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();

  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true })
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ── Ocean ───────────────────────────────────────────────────
  const oceanGeo = new THREE.PlaneGeometry(2400, 2400, 40, 40);
  oceanGeo.rotateX(-Math.PI / 2);

  const oceanMat = new THREE.MeshPhongMaterial({
    color: 0x006688,
    emissive: 0x001122,
    specular: 0x66ccff,
    shininess: 90,
    transparent: true,
    opacity: 0.88,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.y = -0.4;
  scene.add(ocean);

  // ── Trees ───────────────────────────────────────────────────
  const vegetation = [];
  plantTrees(scene, vegetation);

  // ── Rocks / basalt formations ───────────────────────────────
  addRocks(scene, vegetation);

  // ── Clouds ─────────────────────────────────────────────────
  const clouds = addClouds(scene);

  // ── Lava steam vents (Iceland) ──────────────────────────────
  addSteamVents(scene);

  // ── Animation ───────────────────────────────────────────────
  let time = 0;
  const oceanPos = oceanGeo.attributes.position;

  return {
    terrain,
    ocean,
    oceanMat,
    vegetation,
    update(delta) {
      time += delta;

      // Slow sky colour cycle — shifts through dawn/midday/dusk shades
      // Only drives the sky when no event has made it volcanic-red or frozen
      if (scene.background instanceof THREE.Color && scene.background.b > scene.background.r - 0.1) {
        const sp = time * 0.008;
        const targetR = 0.50 + 0.18 * Math.sin(sp);
        const targetG = 0.76 + 0.10 * Math.sin(sp + 1.8);
        const targetB = 0.90 + 0.08 * Math.cos(sp * 0.7 + 1.0);
        scene.background.r = THREE.MathUtils.lerp(scene.background.r, targetR, 0.004);
        scene.background.g = THREE.MathUtils.lerp(scene.background.g, targetG, 0.004);
        scene.background.b = THREE.MathUtils.lerp(scene.background.b, targetB, 0.004);
        scene.fog.color.copy(scene.background);
      }

      // Gentle ocean wave
      for (let i = 0; i < oceanPos.count; i++) {
        const x = oceanPos.getX(i), z = oceanPos.getZ(i);
        oceanPos.setY(i,
          Math.sin(x * 0.04 + time * 0.9) * 0.25 +
          Math.cos(z * 0.035 + time * 0.7) * 0.2
        );
      }
      oceanPos.needsUpdate = true;

      // Drift clouds
      clouds.forEach(c => {
        c.position.x += c.userData.speed * delta;
        if (c.position.x > 400) c.position.x = -400;
      });
    },
  };
}

// ── Tree placement ────────────────────────────────────────────
function plantTrees(scene, vegetation) {
  const rng = mulberry32(42);
  const count = 380;

  for (let i = 0; i < count; i++) {
    const angle  = rng() * Math.PI * 2;
    const radius = 12 + rng() * 130;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const h = getTerrainHeight(x, z);

    if (h < 1.2 || h > 68) continue;

    let tree;
    if (h < 4) {
      tree = palmTree(rng);
    } else if (h > 25) {
      tree = pineTree(rng, true);
    } else {
      tree = rng() > 0.45 ? pineTree(rng, false) : deciduousTree(rng);
    }

    tree.position.set(x, h, z);
    tree.rotation.y = rng() * Math.PI * 2;
    tree.userData.isVegetation = true;
    scene.add(tree);
    vegetation.push(tree);
  }
}

// Seeded RNG (Mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pineTree(rng, alpine) {
  const g = new THREE.Group();
  const s = 0.6 + rng() * 1.6;
  const trunkColor = alpine ? 0x3a1a05 : 0x4a2810;
  const foliColor  = alpine ? 0x0d3010 : 0x1a5020;
  const foliColor2 = alpine ? 0x152818 : 0x246030;

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09 * s, 0.14 * s, 1.4 * s, 7),
    new THREE.MeshLambertMaterial({ color: trunkColor })
  );
  trunk.position.y = 0.7 * s;
  g.add(trunk);

  const layers = alpine ? 4 : 3;
  for (let i = 0; i < layers; i++) {
    const r = (1.4 - i * 0.22) * s;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(r, 1.4 * s, 7),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? foliColor : foliColor2 })
    );
    cone.position.y = (1.5 + i * 0.85) * s;
    cone.castShadow = true;
    g.add(cone);
  }
  return g;
}

function palmTree(rng) {
  const g = new THREE.Group();
  const s = 0.7 + rng() * 0.9;
  const lean = (rng() - 0.5) * 0.35;
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });

  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09 * s * (1 - i * 0.04), 0.11 * s * (1 - i * 0.04), s, 7),
      trunkMat
    );
    seg.position.y = (i + 0.5) * s;
    seg.position.x = i * lean * s * 0.25;
    seg.rotation.z = lean * 0.12;
    g.add(seg);
  }

  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3d8a20, side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.28 * s, 1.6 * s), frondMat);
    frond.position.y  = 5 * s;
    frond.position.x  = lean * s * 0.25 * 5;
    frond.rotation.y  = a;
    frond.rotation.x  = -Math.PI / 5;
    frond.rotation.z  = Math.cos(a) * 0.2;
    g.add(frond);
  }
  return g;
}

function deciduousTree(rng) {
  const g = new THREE.Group();
  const s = 0.7 + rng() * 1.3;
  const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x3a7a28 });
  const canopy2Mat = new THREE.MeshLambertMaterial({ color: 0x4a9038 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.16 * s, 2 * s, 7), trunkMat);
  trunk.position.y = s;
  g.add(trunk);

  const main = new THREE.Mesh(new THREE.SphereGeometry(1.25 * s, 8, 7), canopyMat);
  main.position.y = 2.8 * s;
  main.castShadow = true;
  g.add(main);

  const side = new THREE.Mesh(new THREE.SphereGeometry(0.85 * s, 8, 7), canopy2Mat);
  side.position.set(0.6 * s, 2.5 * s, 0.3 * s);
  g.add(side);

  return g;
}

// ── Volcanic basalt rocks ──────────────────────────────────────
function addRocks(scene, vegetation) {
  const rng = mulberry32(99);
  const rockMat  = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const rockMat2 = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });

  for (let i = 0; i < 60; i++) {
    const angle = rng() * Math.PI * 2;
    const r = 15 + rng() * 120;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const h = getTerrainHeight(x, z);
    if (h < 2 || h > 80) continue;

    const s = 0.3 + rng() * 1.8;
    const geo = new THREE.DodecahedronGeometry(s * (0.5 + rng() * 0.5), 0);
    const rock = new THREE.Mesh(geo, rng() > 0.5 ? rockMat : rockMat2);
    rock.position.set(x, h + s * 0.3, z);
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    rock.castShadow = true;
    rock.userData.isVegetation = true;
    scene.add(rock);
    vegetation.push(rock);
  }
}

// ── Clouds ─────────────────────────────────────────────────────
function addClouds(scene) {
  const rng = mulberry32(7);
  const clouds = [];
  const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });

  for (let i = 0; i < 22; i++) {
    const c = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 4);
    for (let p = 0; p < puffs; p++) {
      const sz = 5 + rng() * 10;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(sz, 7, 6), mat);
      puff.position.set(p * 7 - puffs * 3, rng() * 4, rng() * 6);
      c.add(puff);
    }
    const angle = rng() * Math.PI * 2;
    const cr = 60 + rng() * 250;
    c.position.set(
      Math.cos(angle) * cr,
      60 + rng() * 50,
      Math.sin(angle) * cr
    );
    c.userData.speed = 1.5 + rng() * 3;
    c.rotation.y = rng() * Math.PI;
    scene.add(c);
    clouds.push(c);
  }
  return clouds;
}

// ── Geothermal steam vents ─────────────────────────────────────
function addSteamVents(scene) {
  // Basalt column clusters near mountain bases
  const ventPositions = [
    { x:  40, z: -30 },
    { x: -35, z:  45 },
    { x:  15, z:  55 },
  ];

  const rng = mulberry32(55);
  ventPositions.forEach(({ x: vx, z: vz }) => {
    for (let i = 0; i < 5; i++) {
      const ox = vx + (rng() - 0.5) * 20;
      const oz = vz + (rng() - 0.5) * 20;
      const h  = getTerrainHeight(ox, oz);
      if (h < 3) return;

      // Vent cone
      const vent = new THREE.Mesh(
        new THREE.ConeGeometry(0.4 + rng() * 0.3, 1 + rng() * 0.5, 8),
        new THREE.MeshLambertMaterial({ color: 0x2a2020 })
      );
      vent.position.set(ox, h + 0.3, oz);
      scene.add(vent);

      // Steam puff (semi-transparent sphere)
      const steam = new THREE.Mesh(
        new THREE.SphereGeometry(0.7 + rng() * 0.4, 7, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
      );
      steam.position.set(ox, h + 2.2 + rng() * 0.5, oz);
      scene.add(steam);
    }
  });
}
