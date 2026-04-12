import * as THREE from 'three';
import { createEnvironment, getTerrainHeight } from './environment.js';
import { createDrone }        from './drone.js';
import { createCharacter }    from './character.js';
import { Controls }           from './controls.js';
import { HUD }                from './hud.js';
import { createNPCs }         from './npcs.js';
import { createEventManager } from './events.js';
import { audio }              from './audio.js';
import { showLobby }          from './lobby.js';

// ── Renderer ──────────────────────────────────────────────────
const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// ── Scene & Camera ────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 15, -20);
const clock  = new THREE.Clock();

// ── Build world (runs before lobby so it renders in background)
const { terrain, ocean, oceanMat, vegetation, update: envUpdate } = createEnvironment(scene);

const CHAR_X = 90, CHAR_Z = -20;
const charH  = getTerrainHeight(CHAR_X, CHAR_Z);
const character = createCharacter(scene, new THREE.Vector3(CHAR_X, charH, CHAR_Z));
const npcs      = createNPCs(scene);

// Camera smoothing
const camSmoothPos  = new THREE.Vector3();
const camSmoothLook = new THREE.Vector3();
let camInitialized  = false;

const controls = new Controls();
const hud      = new HUD();
const HOME     = new THREE.Vector3(CHAR_X, charH, CHAR_Z);

// ── Drone state ───────────────────────────────────────────────
const state = {
  pos:      new THREE.Vector3(CHAR_X, charH + 10, CHAR_Z),
  vel:      new THREE.Vector3(),
  yaw:      0,
  pitch:    0,
  roll:     0,
  battery:  100,
  mode:     'normal',
  camMode:  'third',
  shake:    0,
  captured: false,
  gameOver: false,
};

// Physics presets (overwritten by lobby selection)
let CFG_NORMAL = { hz: 8,  vz: 5,   yaw: 1.4, drag: 0.88 };
let CFG_SPORT  = { hz: 14, vz: 8,   yaw: 2.2, drag: 0.84 };

// ── Spin up a background render loop so the world shows while
//    the lobby is open ─────────────────────────────────────────
let lobbyRafId = requestAnimationFrame(function bgRender() {
  lobbyRafId = requestAnimationFrame(bgRender);
  const dt = Math.min(clock.getDelta(), 0.05);
  envUpdate(dt);
  camera.position.set(0, 30, -60);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
});

// ── Lobby ─────────────────────────────────────────────────────
showLobby().then(selectedDrone => {
  cancelAnimationFrame(lobbyRafId);

  // Scale physics from selected drone
  const p      = selectedDrone.physics;
  CFG_NORMAL   = { hz: p.hz,         vz: p.vz,       yaw: p.yaw,       drag: p.drag };
  CFG_SPORT    = { hz: p.hz * 1.75,  vz: p.vz * 1.7, yaw: p.yaw * 1.5, drag: Math.max(0.80, p.drag - 0.04) };

  // Create the chosen drone model
  const drone  = createDrone(scene, selectedDrone.id);

  // Event manager
  const eventManager = createEventManager(scene, state, terrain, ocean, oceanMat, vegetation, drone.group);

  // Keyboard listener
  document.addEventListener('keydown', e => {
    if (state.gameOver) return;
    audio.init();
    audio.startMusic();
    if (e.code === 'KeyC') {
      state.camMode = state.camMode === 'third' ? 'fpv' : 'third';
      const badge = document.getElementById('cam-badge');
      const cross = document.getElementById('crosshair');
      badge.textContent   = state.camMode === 'fpv' ? '🎥 FPV MODE' : '📷 3RD PERSON';
      cross.style.display = state.camMode === 'fpv' ? 'block' : 'none';
      badge.style.opacity = '1';
      setTimeout(() => { badge.style.opacity = '0.6'; }, 1500);
    }
    if (e.code === 'KeyM') toggleMode();
  });

  document.getElementById('mode-btn').addEventListener('click', () => {
    audio.init();
    audio.startMusic();
    toggleMode();
  });

  // Update HUD title to show drone name
  const logoEl = document.querySelector('.dji-logo');
  if (logoEl) logoEl.textContent = selectedDrone.name;

  // ── Game loop ────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    envUpdate(dt);
    updateDrone(dt, drone);
    updateCamera(dt);
    updateCharacter();
    npcs.update(dt);
    eventManager.update(dt);
    updateHUD();
    drone.update(dt, true);
    renderer.render(scene, camera);
  }
  animate();
});

// ── Drone physics ─────────────────────────────────────────────
function updateDrone(dt, drone) {
  if (state.gameOver) return;
  if (!state.captured) {
    const cfg = state.mode === 'sport' ? CFG_SPORT : CFG_NORMAL;
    const k   = controls.keys;

    if (k['KeyQ']) state.yaw += cfg.yaw * dt;
    if (k['KeyE']) state.yaw -= cfg.yaw * dt;

    const fwd = new THREE.Vector3(Math.sin(state.yaw), 0,  Math.cos(state.yaw));
    const rgt = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    let moveH = 0;

    if (k['KeyW']) { state.vel.addScaledVector(fwd,  cfg.hz * dt); moveH =  1; }
    if (k['KeyS']) { state.vel.addScaledVector(fwd, -cfg.hz * dt); moveH = -1; }
    if (k['KeyD']) { state.vel.addScaledVector(rgt,  cfg.hz * dt); }
    if (k['KeyA']) { state.vel.addScaledVector(rgt, -cfg.hz * dt); }
    if (k['Space'])                                { state.vel.y += cfg.vz * dt; }
    if (k['ShiftLeft'] || k['ShiftRight'])         { state.vel.y -= cfg.vz * dt; }

    state.vel.multiplyScalar(cfg.drag);
    state.vel.y *= 0.94;

    const targetPitch  = -moveH * 0.28;
    const lateralInput = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);
    state.pitch = THREE.MathUtils.lerp(state.pitch, targetPitch, 8 * dt);
    state.roll  = THREE.MathUtils.lerp(state.roll, -lateralInput * 0.22, 8 * dt);
  }

  state.pos.add(state.vel);

  const groundH = getTerrainHeight(state.pos.x, state.pos.z);
  const minY    = Math.max(-0.3, groundH + 0.5);
  if (state.pos.y < minY) { state.pos.y = minY; state.vel.y = 0; }

  state.pos.x = THREE.MathUtils.clamp(state.pos.x, -145, 145);
  state.pos.z = THREE.MathUtils.clamp(state.pos.z, -145, 145);
  state.pos.y = Math.min(state.pos.y, 220);

  drone.group.position.copy(state.pos);
  drone.group.rotation.order = 'YXZ';
  drone.group.rotation.y = state.yaw;
  drone.group.rotation.x = state.pitch;
  drone.group.rotation.z = state.roll;

  const moving = state.vel.lengthSq() > 0.005;
  state.battery = Math.max(0, state.battery - dt * (moving ? 0.055 : 0.022));
}

// ── Camera ────────────────────────────────────────────────────
function updateCamera(dt) {
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake * 0.4 : 0;

  if (state.camMode === 'third') {
    const offset   = new THREE.Vector3(-Math.sin(state.yaw) * 7, 3.5 + Math.abs(state.vel.y) * 0.5, -Math.cos(state.yaw) * 7);
    const wantPos  = state.pos.clone().add(offset);
    const wantLook = state.pos.clone().add(new THREE.Vector3(0, 0.5, 0));
    if (!camInitialized) { camSmoothPos.copy(wantPos); camSmoothLook.copy(wantLook); camInitialized = true; }
    camSmoothPos.lerp(wantPos,   Math.min(1, 6 * dt));
    camSmoothLook.lerp(wantLook, Math.min(1, 9 * dt));
    camera.position.copy(camSmoothPos);
    camera.position.x += shakeX;
    camera.position.y += shakeY;
    camera.lookAt(camSmoothLook);
  } else {
    camera.position.copy(state.pos);
    camera.position.y -= 0.12;
    camera.lookAt(state.pos.clone().add(
      new THREE.Vector3(Math.sin(state.yaw), state.pitch * 2, Math.cos(state.yaw))
    ));
  }
}

// ── Mode toggle ───────────────────────────────────────────────
function toggleMode() {
  state.mode = state.mode === 'sport' ? 'normal' : 'sport';
  const isSport = state.mode === 'sport';
  document.getElementById('flight-mode').textContent = isSport ? 'SPORT MODE' : 'NORMAL MODE';
  const btn = document.getElementById('mode-btn');
  btn.textContent = isSport ? 'SPORT MODE' : 'NORMAL MODE';
  btn.classList.toggle('sport', isSport);
}

// ── Character ─────────────────────────────────────────────────
function updateCharacter() {
  const dx = state.pos.x - character.position.x;
  const dz = state.pos.z - character.position.z;
  if (Math.abs(dx) > 0.5 || Math.abs(dz) > 0.5) character.rotation.y = Math.atan2(dx, dz);
}

// ── HUD ───────────────────────────────────────────────────────
function updateHUD() {
  if (state.gameOver) return;
  hud.update({
    altitude: state.pos.y,
    hspeed:   new THREE.Vector3(state.vel.x, 0, state.vel.z).length() * 12,
    vspeed:   state.vel.y * 12,
    battery:  state.battery,
    distance: state.pos.distanceTo(HOME),
    yaw:      state.yaw,
    pitch:    state.pitch,
    x:        state.pos.x,
    z:        state.pos.z,
  });
}

// ── Resize ────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
