import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────
function mat(color, specular = 0x444444, shininess = 60) {
  return new THREE.MeshPhongMaterial({ color, specular, shininess });
}
function sphere(r, col) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8),
    new THREE.MeshBasicMaterial({ color: col }));
}

// ─────────────────────────────────────────────────────────────
//  Propeller group (reused by all drones)
// ─────────────────────────────────────────────────────────────
function makePropGroup(bladeColor = 0x111111, bladeLen = 0.42, spinDir = 1) {
  const g = new THREE.Group();
  g.userData.spinDir = spinDir;
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(bladeLen, 0.008, 0.065),
      new THREE.MeshPhongMaterial({ color: bladeColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    blade.rotation.y = (i * Math.PI) / 2;
    blade.rotation.z = 0.07;
    g.add(blade);
  }
  return g;
}

// ─────────────────────────────────────────────────────────────
//  Status lights (shared)
// ─────────────────────────────────────────────────────────────
function addStatusLights(drone, leftPos, rightPos) {
  const redMesh  = sphere(0.025, 0xff2200); redMesh.position.copy(leftPos);  drone.add(redMesh);
  const grnMesh  = sphere(0.025, 0x00ff44); grnMesh.position.copy(rightPos); drone.add(grnMesh);
  const redPL    = new THREE.PointLight(0xff2200, 0.5, 1.5); redPL.position.copy(leftPos);  drone.add(redPL);
  const grnPL    = new THREE.PointLight(0x00ff44, 0.5, 1.5); grnPL.position.copy(rightPos); drone.add(grnPL);
  return { redMesh, grnMesh, redPL };
}

// ─────────────────────────────────────────────────────────────
//  1. MAVIC PRO — sleek folding drone (original, slightly enhanced)
// ─────────────────────────────────────────────────────────────
function buildMavic(drone) {
  const bodyMat   = mat(0x222222, 0x555555, 60);
  const armMat    = mat(0x1a1a1a, 0x333333, 40);
  const accentMat = mat(0x00ffaa, 0x00ffaa, 120);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.55), bodyMat);
  drone.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.24), bodyMat);
  nose.position.set(0, -0.01, 0.32); drone.add(nose);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.1), accentMat);
  ridge.position.y = 0.1; drone.add(ridge);
  // Bottom accent stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.08), accentMat);
  stripe.position.y = -0.09; drone.add(stripe);

  const propellers = [];
  [{ x: 1, z: 1, s: 1 }, { x: -1, z: 1, s: -1 }, { x: 1, z: -1, s: -1 }, { x: -1, z: -1, s: 1 }]
    .forEach(({ x, z, s }) => {
      const ex = x * 0.65, ez = z * 0.65;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.72, 8), armMat);
      const dir = new THREE.Vector3(ex, 0, ez).normalize();
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      arm.position.set(ex * 0.5, 0, ez * 0.5); drone.add(arm);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.055, 12), bodyMat);
      motor.position.set(ex, 0.03, ez); drone.add(motor);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 16), accentMat);
      ring.rotation.x = Math.PI / 2; ring.position.set(ex, 0.055, ez); drone.add(ring);
      const pg = makePropGroup(0x111111, 0.42, s);
      pg.position.set(ex, 0.065, ez); drone.add(pg); propellers.push(pg);
    });

  // Gimbal
  const gim = new THREE.Group(); gim.position.set(0, -0.12, 0.25); drone.add(gim);
  gim.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), bodyMat));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 12),
    new THREE.MeshPhongMaterial({ color: 0x111133, specular: 0x8888ff, shininess: 200 }));
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.05; gim.add(lens);

  const lights = addStatusLights(drone, new THREE.Vector3(-0.42, 0, 0), new THREE.Vector3(0.42, 0, 0));
  return { propellers, lights };
}

// ─────────────────────────────────────────────────────────────
//  2. STORM RACER — compact X-frame, orange/neon
// ─────────────────────────────────────────────────────────────
function buildRacer(drone) {
  const frameMat  = mat(0x1a0a00, 0x444444, 80);
  const accentMat = mat(0xff4400, 0xff6600, 120);
  const neonMat   = mat(0xffcc00, 0xffee00, 180);

  // Compact cross frame
  [[1.0, 0, 0], [-1.0, 0, 0], [0, 0, 1.0], [0, 0, -1.0]].forEach(([x, y, z]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(
      x !== 0 ? 1.0 : 0.08, 0.055, z !== 0 ? 1.0 : 0.08), frameMat);
    bar.position.set(x * 0.3, y, z * 0.3); drone.add(bar);
  });
  const centerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.3), accentMat);
  drone.add(centerBlock);
  // Orange accent wedge on top
  const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.22), neonMat);
  wedge.position.y = 0.1; drone.add(wedge);

  const propellers = [];
  [{ x: 1, z: 1, s: 1 }, { x: -1, z: 1, s: -1 }, { x: 1, z: -1, s: -1 }, { x: -1, z: -1, s: 1 }]
    .forEach(({ x, z, s }) => {
      const ex = x * 0.5, ez = z * 0.5;
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 10), accentMat);
      motor.position.set(ex, 0.04, ez); drone.add(motor);
      // Motor guard ring
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 6, 18), frameMat);
      guard.rotation.x = Math.PI / 2; guard.position.set(ex, 0.055, ez); drone.add(guard);
      const pg = makePropGroup(0xff4400, 0.34, s);
      pg.position.set(ex, 0.07, ez); drone.add(pg); propellers.push(pg);
    });

  // FPV camera — aggressive angle
  const cam = new THREE.Group(); cam.position.set(0, 0.08, 0.17); cam.rotation.x = -0.4; drone.add(cam);
  cam.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.045), frameMat));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.025, 0.035, 10),
    new THREE.MeshPhongMaterial({ color: 0x111133, specular: 0x8888ff, shininess: 200 }));
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.04; cam.add(lens);

  const lights = addStatusLights(drone, new THREE.Vector3(-0.38, 0.04, 0), new THREE.Vector3(0.38, 0.04, 0));
  return { propellers, lights };
}

// ─────────────────────────────────────────────────────────────
//  3. MINI FLYER — tiny, round, pastel pink/white
// ─────────────────────────────────────────────────────────────
function buildMini(drone) {
  const bodyMat   = mat(0xffd0e8, 0xffffff, 100);
  const accentMat = mat(0xff88cc, 0xffbbdd, 140);
  const whiteMat  = mat(0xffffff, 0xffffff, 120);

  // Rounded body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), bodyMat);
  body.scale.y = 0.55; drone.add(body);
  // Top bump
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), whiteMat);
  top.scale.y = 0.6; top.position.y = 0.1; drone.add(top);
  // Little logo star
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), new THREE.MeshBasicMaterial({ color: 0xff88cc }));
  star.position.y = 0.17; drone.add(star);

  const propellers = [];
  [{ x: 1, z: 1, s: 1 }, { x: -1, z: 1, s: -1 }, { x: 1, z: -1, s: -1 }, { x: -1, z: -1, s: 1 }]
    .forEach(({ x, z, s }) => {
      const ex = x * 0.38, ez = z * 0.38;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 6), accentMat);
      const dir = new THREE.Vector3(ex, 0, ez).normalize();
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      arm.position.set(ex * 0.5, 0, ez * 0.5); drone.add(arm);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), whiteMat);
      motor.position.set(ex, 0.025, ez); drone.add(motor);
      const pg = makePropGroup(0xff88cc, 0.28, s);
      pg.position.set(ex, 0.04, ez); drone.add(pg); propellers.push(pg);
    });

  // Tiny camera
  const cam = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshPhongMaterial({ color: 0x111133, specular: 0x8888ff, shininess: 200 }));
  cam.position.set(0, -0.1, 0.22); drone.add(cam);

  const lights = addStatusLights(drone, new THREE.Vector3(-0.3, 0, 0), new THREE.Vector3(0.3, 0, 0));
  return { propellers, lights };
}

// ─────────────────────────────────────────────────────────────
//  4. CARGO MAX — wide hexagonal frame, yellow/black
// ─────────────────────────────────────────────────────────────
function buildCargo(drone) {
  const frameMat  = mat(0x1a1400, 0x333333, 40);
  const accentMat = mat(0xf5a623, 0xffd060, 80);
  const boxMat    = mat(0x333333, 0x555555, 30);

  // Wide flat platform
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.9), frameMat);
  drone.add(platform);
  // Yellow warning stripes on platform
  for (let i = -1; i <= 1; i += 2) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.9), accentMat);
    stripe.position.x = i * 0.38; drone.add(stripe);
  }
  // Central hub raised block
  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.36), accentMat);
  hub.position.y = 0.13; drone.add(hub);

  // 6 arms arranged in hex pattern
  const propellers = [];
  const hexAngles = [0, Math.PI / 3, 2 * Math.PI / 3, Math.PI, 4 * Math.PI / 3, 5 * Math.PI / 3];
  hexAngles.forEach((angle, i) => {
    const ex = Math.cos(angle) * 0.72, ez = Math.sin(angle) * 0.72;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.75, 8), frameMat);
    const dir = new THREE.Vector3(ex, 0, ez).normalize();
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    arm.position.set(ex * 0.5, 0.09, ez * 0.5); drone.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), accentMat);
    motor.position.set(ex, 0.12, ez); drone.add(motor);
    const pg = makePropGroup(0x1a1400, 0.38, i % 2 === 0 ? 1 : -1);
    pg.position.set(ex, 0.15, ez); drone.add(pg); propellers.push(pg);
  });

  // Cargo box hanging below (with strap lines)
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), boxMat);
  box.position.y = -0.32; drone.add(box);
  // Strap
  [-0.15, 0.15].forEach(x => {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.03), accentMat);
    strap.position.set(x, -0.19, 0); drone.add(strap);
  });
  // Warning label on box
  const label = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.01), accentMat);
  label.position.set(0, -0.32, 0.21); drone.add(label);

  const lights = addStatusLights(drone, new THREE.Vector3(-0.58, 0.1, 0), new THREE.Vector3(0.58, 0.1, 0));
  return { propellers, lights };
}

// ─────────────────────────────────────────────────────────────
//  5. SHADOW X — angular military stealth, dark green/grey
// ─────────────────────────────────────────────────────────────
function buildStealth(drone) {
  const bodyMat   = mat(0x151f15, 0x222a22, 20);
  const armorMat  = mat(0x1e2b1e, 0x2a3a2a, 30);
  const accentMat = mat(0x44ff44, 0x66ff66, 160);

  // Angular wedge body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.6), bodyMat);
  drone.add(body);
  // Angled nose wedge
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.18, 0.5, 4), armorMat);
  nose.rotation.x = Math.PI / 2; nose.rotation.y = Math.PI / 4;
  nose.position.set(0, 0, 0.36); drone.add(nose);
  // Armored top plate
  const topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.5), armorMat);
  topPlate.position.y = 0.09; drone.add(topPlate);
  // Green accent lines
  [[0.3, 0], [-0.3, 0]].forEach(([x, z]) => {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.5), accentMat);
    line.position.set(x, 0.12, z); drone.add(line);
  });
  // Swept-back arms
  const propellers = [];
  const armConfig = [
    { ox: 0.5, oz: 0.3, sx: 0.58, sz: 0.48, s: 1 },
    { ox: -0.5, oz: 0.3, sx: -0.58, sz: 0.48, s: -1 },
    { ox: 0.5, oz: -0.3, sx: 0.58, sz: -0.48, s: -1 },
    { ox: -0.5, oz: -0.3, sx: -0.58, sz: -0.48, s: 1 },
  ];
  armConfig.forEach(({ ox, oz, sx, sz, s }) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.18), armorMat);
    arm.position.set((ox + sx) * 0.5, 0, (oz + sz) * 0.5);
    arm.rotation.y = Math.atan2(sx - ox, sz - oz); drone.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 8), armorMat);
    motor.position.set(sx, 0.03, sz); drone.add(motor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.01, 6, 14), accentMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(sx, 0.05, sz); drone.add(ring);
    const pg = makePropGroup(0x1e2b1e, 0.4, s);
    pg.position.set(sx, 0.062, sz); drone.add(pg); propellers.push(pg);
  });

  // Sensor pod
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.1), bodyMat);
  sensor.position.set(0, -0.1, 0.28); drone.add(sensor);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.04, 8),
    new THREE.MeshPhongMaterial({ color: 0x111133, specular: 0x44ff44, shininess: 200 }));
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.05; sensor.add(lens);

  const lights = addStatusLights(drone, new THREE.Vector3(-0.52, 0, 0), new THREE.Vector3(0.52, 0, 0));
  return { propellers, lights };
}

// ─────────────────────────────────────────────────────────────
//  Main factory
// ─────────────────────────────────────────────────────────────
export function createDrone(scene, type = 'mavic') {
  const drone = new THREE.Group();
  drone.rotation.order = 'YXZ';

  let propellers, lights;
  switch (type) {
    case 'racer':   ({ propellers, lights } = buildRacer(drone));   break;
    case 'mini':    ({ propellers, lights } = buildMini(drone));    break;
    case 'cargo':   ({ propellers, lights } = buildCargo(drone));   break;
    case 'stealth': ({ propellers, lights } = buildStealth(drone)); break;
    default:        ({ propellers, lights } = buildMavic(drone));   break;
  }

  drone.traverse(m => { if (m.isMesh) m.castShadow = true; });
  scene.add(drone);

  let blinkTimer = 0;
  return {
    group: drone,
    update(delta, isFlying) {
      const spinSpeed = isFlying ? 22 : 3;
      propellers.forEach(p => { p.rotation.y += p.userData.spinDir * spinSpeed * delta; });
      blinkTimer += delta;
      if (blinkTimer > 0.8) blinkTimer = 0;
      const on = blinkTimer < 0.4;
      lights.redMesh.visible    = on;
      lights.redPL.intensity    = on ? 0.5 : 0;
    },
  };
}
