import * as THREE from 'three';

export function createCharacter(scene, position) {
  const root = new THREE.Group();

  const mat = color => new THREE.MeshPhongMaterial({ color });

  const SKIN     = 0xf4a460;
  const JACKET   = 0x2255cc;
  const PANTS    = 0x223344;
  const SHOE     = 0x222222;
  const HAIR     = 0x1a0a00;
  const RC_BODY  = 0x111111;
  const RC_SCREN = 0x0044ff;
  const RC_STICK = 0x555555;

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), mat(SKIN));
  head.position.y = 1.75;
  root.add(head);

  // Hair (cap on top of head)
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.42), mat(HAIR));
  hair.position.y = 1.97;
  root.add(hair);

  // Cap brim
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.18), mat(HAIR));
  brim.position.set(0, 1.9, 0.27);
  root.add(brim);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  [[-0.1, 0], [0.1, 0]].forEach(([ex]) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.02), eyeMat);
    eye.position.set(ex, 1.76, 0.2);
    root.add(eye);
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.6, 0.28), mat(JACKET));
  torso.position.y = 1.25;
  root.add(torso);

  // Jacket zipper strip
  const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.03), mat(0x4477ee));
  zipper.position.set(0, 1.25, 0.15);
  root.add(zipper);

  // Arms — raised at ~45° holding RC
  const armGeo = new THREE.BoxGeometry(0.18, 0.52, 0.18);
  const leftArm = new THREE.Mesh(armGeo, mat(JACKET));
  leftArm.position.set(-0.38, 1.3, 0.08);
  leftArm.rotation.z = Math.PI / 5;
  leftArm.rotation.x = -Math.PI / 6;
  root.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, mat(JACKET));
  rightArm.position.set(0.38, 1.3, 0.08);
  rightArm.rotation.z = -Math.PI / 5;
  rightArm.rotation.x = -Math.PI / 6;
  root.add(rightArm);

  // Hands
  const handGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  const leftHand = new THREE.Mesh(handGeo, mat(SKIN));
  leftHand.position.set(-0.52, 1.08, 0.22);
  root.add(leftHand);

  const rightHand = new THREE.Mesh(handGeo, mat(SKIN));
  rightHand.position.set(0.52, 1.08, 0.22);
  root.add(rightHand);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.2, 0.58, 0.2);
  const leftLeg = new THREE.Mesh(legGeo, mat(PANTS));
  leftLeg.position.set(-0.14, 0.65, 0);
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, mat(PANTS));
  rightLeg.position.set(0.14, 0.65, 0);
  root.add(rightLeg);

  // Feet / shoes
  const shoeGeo = new THREE.BoxGeometry(0.22, 0.1, 0.3);
  const leftShoe = new THREE.Mesh(shoeGeo, mat(SHOE));
  leftShoe.position.set(-0.14, 0.32, 0.05);
  root.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, mat(SHOE));
  rightShoe.position.set(0.14, 0.32, 0.05);
  root.add(rightShoe);

  // ── Remote Controller ──────────────────────────────────────
  const rc = new THREE.Group();

  const rcMain = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.07), mat(RC_BODY));
  rc.add(rcMain);

  // Screen (small tablet mounted on top)
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.015), mat(RC_SCREN));
  screen.position.set(0, 0.14, 0.01);
  rc.add(screen);

  // Screen glare
  const glare = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.016), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  glare.position.set(0.04, 0.16, 0.012);
  rc.add(glare);

  // Joystick left
  const joyGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8);
  const joyL = new THREE.Mesh(joyGeo, mat(RC_STICK));
  joyL.position.set(-0.1, 0.08, 0);
  rc.add(joyL);

  const joyR = new THREE.Mesh(joyGeo, mat(RC_STICK));
  joyR.position.set(0.1, 0.08, 0);
  rc.add(joyR);

  // Antenna L
  const antGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6);
  const antL = new THREE.Mesh(antGeo, mat(RC_BODY));
  antL.position.set(-0.17, 0.14, 0);
  antL.rotation.z = -0.3;
  rc.add(antL);

  const antR = new THREE.Mesh(antGeo, mat(RC_BODY));
  antR.position.set(0.17, 0.14, 0);
  antR.rotation.z = 0.3;
  rc.add(antR);

  rc.position.set(0, 1.12, 0.35);
  rc.rotation.x = -Math.PI / 7;
  root.add(rc);

  // ── Place on terrain ───────────────────────────────────────
  root.position.copy(position);
  root.castShadow = true;

  scene.add(root);
  return root;
}
