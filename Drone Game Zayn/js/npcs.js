import * as THREE from 'three';
import { getTerrainHeight } from './environment.js';

const rng = mulberry32(1337);
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mat = c => new THREE.MeshLambertMaterial({ color: c });

// ── Build a named NPC ──────────────────────────────────────────
function makeNPC(type) {
  const g = new THREE.Group();

  if (type === 'dancer') {
    // Disco dancer — bright colours, arms out
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.5,0.22), mat(0xee44cc));
    body.position.y = 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32,0.32,0.32), mat(0xf4a460));
    head.position.y = 1.56; g.add(head);
    // Afro
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.24,8,7), mat(0x111111));
    afro.position.y = 1.74; g.add(afro);
    // Arms raised & spread
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.46,0.14), mat(0xee44cc));
    armL.position.set(-0.35,1.35,0); armL.rotation.z = Math.PI/2.5; g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.46,0.14), mat(0xee44cc));
    armR.position.set(0.35,1.35,0); armR.rotation.z = -Math.PI/2.5; g.add(armR);
    // Legs
    [-0.12,0.12].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.5,0.16), mat(0x2222ff));
      leg.position.set(x, 0.62, 0); g.add(leg);
    });
    g.userData = { type:'dancer', animPhase: rng()*Math.PI*2, speed: 4 };

  } else if (type === 'fisher') {
    // Person fishing at the beach — leaning forward
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38,0.52,0.22), mat(0x886622));
    body.position.y = 1.1; body.rotation.x = 0.25; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), mat(0xf4a460));
    head.position.y = 1.52; g.add(head);
    // Hat
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.05,10), mat(0x885522));
    brim.position.y = 1.66; g.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.18,10), mat(0x885522));
    top.position.y = 1.79; g.add(top);
    // Arms forward holding rod
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12), mat(0x886622));
    armL.position.set(-0.18,1.18,0.3); armL.rotation.x = -Math.PI/3; g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12), mat(0x886622));
    armR.position.set(0.18,1.18,0.3); armR.rotation.x = -Math.PI/3; g.add(armR);
    // Fishing rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.012,2.2,6), mat(0x664411));
    rod.position.set(0.2, 1.5, 0.7); rod.rotation.x = -0.5; rod.rotation.z = 0.1; g.add(rod);
    // Line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,-1.4,1.2)]);
    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.6}));
    line.position.set(0.2,2.3,0.7); g.add(line);
    // Legs
    [-0.1,0.1].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.5,0.15), mat(0x4455aa));
      leg.position.set(x,0.62,0); g.add(leg);
    });
    g.userData = { type:'fisher', animPhase: rng()*Math.PI*2, speed: 0.5 };

  } else if (type === 'runner') {
    // Frantic running person
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.5,0.2), mat(0xff6633));
    body.position.y = 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.28,0.28), mat(0xf0b070));
    head.position.y = 1.52; g.add(head);
    // Arms swinging wild
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12), mat(0xff6633));
    armL.position.set(-0.3,1.1,0.15); armL.rotation.z = 0.6; armL.rotation.x = -0.8; g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12), mat(0xff6633));
    armR.position.set(0.3,1.1,-0.15); armR.rotation.z = -0.6; armR.rotation.x = 0.8; g.add(armR);
    [-0.1,0.1].forEach((x,i) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.5,0.14), mat(0x223366));
      leg.position.set(x,0.6,i===0?0.1:-0.1); leg.rotation.x = i===0?-0.4:0.4; g.add(leg);
    });
    g.userData = { type:'runner', animPhase: rng()*Math.PI*2, speed: 3, moveAngle: rng()*Math.PI*2 };

  } else if (type === 'yoga') {
    // Doing yoga (tree pose)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.52,0.2), mat(0x88aaff));
    body.position.y = 1.0; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.28,0.28), mat(0xf4c090));
    head.position.y = 1.45; g.add(head);
    // Arms up in prayer
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12), mat(0x88aaff));
    armL.position.set(-0.22,1.35,0); armL.rotation.z = Math.PI/4; g.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12), mat(0x88aaff));
    armR.position.set(0.22,1.35,0); armR.rotation.z = -Math.PI/4; g.add(armR);
    // One leg up
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.5,0.14), mat(0x88aaff));
    legR.position.set(0.08,0.62,0); g.add(legR);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.44,0.14), mat(0x88aaff));
    legL.position.set(-0.14,0.7,0.2); legL.rotation.x = -0.8; legL.rotation.z = 0.5; g.add(legL);
    g.userData = { type:'yoga', animPhase: rng()*Math.PI*2, speed: 0.3 };

  } else if (type === 'waver') {
    // Waving wildly at drone
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.5,0.2), mat(0x33cc66));
    body.position.y = 1.1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.3), mat(0xf4a460));
    head.position.y = 1.54; g.add(head);
    // One arm waving
    const armWave = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.48,0.12), mat(0x33cc66));
    armWave.position.set(0.32,1.38,0); armWave.rotation.z = -Math.PI/1.5;
    armWave.name = 'waveArm'; g.add(armWave);
    const armStill = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.44,0.12), mat(0x33cc66));
    armStill.position.set(-0.28,1.05,0); g.add(armStill);
    [-0.1,0.1].forEach(x => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.5,0.14), mat(0x334488));
      leg.position.set(x,0.62,0); g.add(leg);
    });
    g.userData = { type:'waver', animPhase: rng()*Math.PI*2, speed: 2 };

  } else if (type === 'sunbather') {
    // Lying flat on the beach
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36,0.18,0.9), mat(0xff8844));
    body.position.y = 0.1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.18,0.28), mat(0xf4c090));
    head.position.set(0,0.1,0.62); g.add(head);
    // Sunglasses
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.26,0.06,0.04), mat(0x111111));
    glasses.position.set(0,0.15,0.78); g.add(glasses);
    g.userData = { type:'sunbather', animPhase: rng()*Math.PI*2, speed: 0 };
  }

  return g;
}

// ── Place NPCs around the map ──────────────────────────────────
export function createNPCs(scene) {
  const npcs = [];

  const placements = [
    // Dancers near center beach
    { type:'dancer',     x:  70, z:  30 },
    { type:'dancer',     x:  65, z:  45 },
    // Fishers at shoreline
    { type:'fisher',     x: 115, z:  10 },
    { type:'fisher',     x: 108, z: -35 },
    { type:'fisher',     x: -110,z:  20 },
    // Runners
    { type:'runner',     x:  40, z:  60 },
    { type:'runner',     x: -30, z: -50 },
    { type:'runner',     x:  20, z: -70 },
    // Yoga
    { type:'yoga',       x:  55, z: -55 },
    { type:'yoga',       x: -45, z:  30 },
    // Wavers
    { type:'waver',      x:  80, z: -10 },
    { type:'waver',      x: -60, z: -40 },
    { type:'waver',      x:  30, z:  80 },
    // Sunbathers
    { type:'sunbather',  x: 105, z:  50 },
    { type:'sunbather',  x:  95, z: -55 },
    { type:'sunbather',  x:-100, z: -30 },
  ];

  placements.forEach(({ type, x, z }) => {
    const h = getTerrainHeight(x, z);
    if (h < 0) return;
    const npc = makeNPC(type);
    npc.position.set(x, h, z);
    npc.rotation.y = rng() * Math.PI * 2;
    scene.add(npc);
    npcs.push(npc);
  });

  return {
    list: npcs,
    update(dt, elapsed) {
      npcs.forEach(npc => {
        const d = npc.userData;
        d.animPhase += dt * d.speed;

        if (d.type === 'dancer') {
          npc.rotation.y += dt * 2.5;
          npc.position.y = getTerrainHeight(npc.position.x, npc.position.z)
            + Math.abs(Math.sin(d.animPhase)) * 0.35;

        } else if (d.type === 'waver') {
          const arm = npc.getObjectByName('waveArm');
          if (arm) arm.rotation.z = -Math.PI/1.5 + Math.sin(d.animPhase * 3) * 0.6;

        } else if (d.type === 'runner') {
          const spd = 3.5;
          npc.position.x += Math.sin(d.moveAngle) * spd * dt;
          npc.position.z += Math.cos(d.moveAngle) * spd * dt;
          // Bounce off island edge
          if (Math.sqrt(npc.position.x**2 + npc.position.z**2) > 120) {
            d.moveAngle += Math.PI + (rng()-0.5);
          }
          const gh = getTerrainHeight(npc.position.x, npc.position.z);
          npc.position.y = gh;
          npc.rotation.y = d.moveAngle;
          // Leg bob
          npc.children.forEach((c,i) => {
            if (i > 3) c.rotation.x = Math.sin(d.animPhase*8 + i) * 0.5;
          });

        } else if (d.type === 'fisher') {
          // Bob rod tip
          const rod = npc.children.find(c => c instanceof THREE.Mesh && c.geometry.type === 'CylinderGeometry' && c.geometry.parameters?.radiusTop < 0.02);
          if (rod) rod.rotation.x = -0.5 + Math.sin(d.animPhase * 0.8) * 0.1;

        } else if (d.type === 'yoga') {
          npc.rotation.y += dt * 0.15;
        }
      });
    },
  };
}
