import * as THREE from 'three';
import { RacerPalette } from './courseData';
import { SUBJECT_COLORS } from './questions';
import {
  createFinishBannerTexture,
  createGateHeaderTexture,
  createQuizDoorTexture,
} from './textures';
import { QuizGateDef } from './types';

export interface CharacterVisualRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  headGroup: THREE.Object3D;
  shadowDisc: THREE.Mesh;
  hitMeshes: THREE.MeshStandardMaterial[];
  marker?: THREE.Mesh;
}

/**
 * Composite 11-part stylized Indonesian SD adventurer character (bottom-center pivot at y = 0).
 * Varies roughness & metalness across clothing, skin, cap visor, sneakers, and backpack clasp.
 */
export function createCharacterRig(
  palette: RacerPalette,
  isPlayer: boolean,
  shadowTex: THREE.CanvasTexture,
): CharacterVisualRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const hitMeshes: THREE.MeshStandardMaterial[] = [];
  const makeMat = (params: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial(params);
    hitMeshes.push(m);
    return m;
  };

  const shirtMat = makeMat({ color: palette.shirtHex, roughness: 0.72, metalness: 0.02 });
  const vestMat = makeMat({ color: palette.vestHex, roughness: 0.65, metalness: 0.05 });
  const skinMat = makeMat({ color: palette.skinHex, roughness: 0.68, metalness: 0.02 });
  const capMat = makeMat({ color: palette.capHex, roughness: 0.32, metalness: 0.1 });
  const visorMat = makeMat({ color: 0x1e293b, roughness: 0.2, metalness: 0.25 });
  const packMat = makeMat({ color: palette.backpackHex, roughness: 0.6, metalness: 0.06 });
  const claspMat = makeMat({ color: 0xfef08a, roughness: 0.22, metalness: 0.8 });
  const shoeMat = makeMat({ color: 0x1e293b, roughness: 0.35, metalness: 0.1 });
  const soleMat = makeMat({ color: 0xf8fafc, roughness: 0.75, metalness: 0.0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.12, metalness: 0.2 });

  // 1-2. Articulating Legs + Sneakers (grounded at y = 0)
  const makeLeg = (xOffset: number) => {
    const hip = new THREE.Group();
    hip.position.set(xOffset, 0.44, 0);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 6, 10), vestMat);
    upper.position.y = -0.15;
    upper.castShadow = true;
    hip.add(upper);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.36), shoeMat);
    shoe.position.set(0, -0.35, 0.06);
    shoe.castShadow = true;
    hip.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.38), soleMat);
    sole.position.set(0, -0.41, 0.06);
    hip.add(sole);

    return hip;
  };

  const leftLeg = makeLeg(-0.17);
  const rightLeg = makeLeg(0.17);
  bodyPivot.add(leftLeg, rightLeg);

  // 3. Primary Silhouette: Rounded Torso + Collar + Red SD Shorts Belt
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.32, 8, 14), shirtMat);
  torso.position.y = 0.74;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const vestBand = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.33, 0.28, 14), vestMat);
  vestBand.position.y = 0.62;
  vestBand.castShadow = true;
  bodyPivot.add(vestBand);

  // 4. School Backpack with Gold Clasp (Secondary Read)
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.24), packMat);
  backpack.position.set(0, 0.78, -0.34);
  backpack.castShadow = true;
  bodyPivot.add(backpack);

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.06), claspMat);
  clasp.position.set(0, 0.82, -0.47);
  bodyPivot.add(clasp);

  // 5-6. Articulating Arms + Hands
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.41, 0.9, 0);

    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.24, 6, 10), shirtMat);
    sleeve.position.y = -0.16;
    sleeve.rotation.z = side * 0.16;
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), skinMat);
    hand.position.set(side * 0.04, -0.34, 0);
    shoulder.add(hand);

    return shoulder;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  bodyPivot.add(leftArm, rightArm);

  // 7-10. Head, Glossy Eyes, Explorer Cap & Visor (Accent Details)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.24, 0);
  bodyPivot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), eyeMat);
  leftEye.position.set(-0.11, 0.03, 0.28);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), eyeMat);
  rightEye.position.set(0.11, 0.03, 0.28);
  headGroup.add(leftEye, rightEye);

  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.335, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    capMat,
  );
  capDome.position.y = 0.05;
  capDome.castShadow = true;
  headGroup.add(capDome);

  const capVisor = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.045, 14, 1, false, -0.8, 1.6), visorMat);
  capVisor.position.set(0, 0.08, 0.14);
  capVisor.rotation.x = 0.14;
  headGroup.add(capVisor);

  // 11. Subtle golden diamond indicator floating above Arham so kids always spot themselves in a crowd
  let marker: THREE.Mesh | undefined;
  if (isPlayer) {
    const markerGeo = new THREE.OctahedronGeometry(0.16, 0);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.7,
    });
    marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(0, 1.98, 0);
    root.add(marker);
  }

  // Contact shadow disc grounded just above surface
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.68, 20),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  root.add(shadowDisc);

  return {
    root,
    bodyPivot,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    headGroup,
    shadowDisc,
    hitMeshes,
    marker,
  };
}

/**
 * Giant Rotating Hexagonal Wooden Pencil Sweeper (7 composite parts, grounded at y = 0).
 */
export function createPencilSweeper(armLength: number, barHeight: number): {
  group: THREE.Group;
  rotor: THREE.Group;
} {
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.4 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.25 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.58, metalness: 0.05 });
  const rawWoodMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.8, metalness: 0.0 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.88 });
  const eraserMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.86, metalness: 0.02 });
  const leadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.35 });

  // Grounded hub pedestal
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 0.36, 16), baseMat);
  base.position.y = 0.18;
  base.receiveShadow = true;
  group.add(base);

  const hubCol = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, barHeight + 0.35, 16), ringMat);
  hubCol.position.y = (barHeight + 0.35) * 0.5;
  hubCol.castShadow = true;
  group.add(hubCol);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.56, 14, 10), metalMat);
  cap.position.y = barHeight + 0.32;
  group.add(cap);

  // Rotating giant double-ended school pencil
  const rotor = new THREE.Group();
  rotor.position.y = barHeight;
  group.add(rotor);

  const bodyLen = armLength * 1.62;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, bodyLen, 6), woodMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.castShadow = true;
  rotor.add(shaft);

  // Right end: sharpened cone + graphite tip
  const coneLen = armLength * 0.28;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, coneLen, 12), rawWoodMat);
  cone.rotation.z = -Math.PI / 2;
  cone.position.x = bodyLen * 0.5 + coneLen * 0.5;
  cone.castShadow = true;
  rotor.add(cone);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 10), leadMat);
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = bodyLen * 0.5 + coneLen + 0.12;
  rotor.add(tip);

  // Left end: metallic ferrule + pink rubber eraser
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.52, 14), metalMat);
  ferrule.rotation.z = Math.PI / 2;
  ferrule.position.x = -(bodyLen * 0.5 + 0.26);
  rotor.add(ferrule);

  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.72, 14), eraserMat);
  eraser.rotation.z = Math.PI / 2;
  eraser.position.x = -(bodyLen * 0.5 + 0.85);
  eraser.castShadow = true;
  rotor.add(eraser);

  return { group, rotor };
}

/**
 * Springy School Bumper (4 composite parts, grounded at y = 0).
 */
export function createEraserBumper(radius: number, colorHex: number): THREE.Group {
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.35 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.38, metalness: 0.08 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius * 0.96, 0.28, 18), baseMat);
  base.position.y = 0.14;
  group.add(base);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.46, radius * 0.52, 0.6, 14), trimMat);
  post.position.y = 0.52;
  group.add(post);

  const cushion = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, 0.64, 20), cushionMat);
  cushion.position.y = 0.96;
  cushion.castShadow = true;
  group.add(cushion);

  const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.72, 0.1, 10, 20), trimMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 1.29;
  group.add(topRing);

  return group;
}

/**
 * Composite Cyber Laser Barrier (twin trackside emitter pylons + glowing core beam + energy aura).
 */
export function createLaserBarrierVisual(width: number, barHeight: number, colorHex: number): THREE.Group {
  const group = new THREE.Group();

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.36,
    metalness: 0.55,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.2,
  });

  const halfW = width * 0.5;
  [-halfW, halfW].forEach((px) => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 0.95), housingMat);
    base.position.set(px, 0.14, 0);
    group.add(base);

    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, barHeight + 0.45, 12), housingMat);
    pylon.position.set(px, (barHeight + 0.45) * 0.5, 0);
    pylon.castShadow = true;
    group.add(pylon);

    const emitterRing = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.24, 12), collarMat);
    emitterRing.position.set(px, barHeight, 0);
    group.add(emitterRing);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), collarMat);
    cap.position.set(px, barHeight + 0.48, 0);
    group.add(cap);
  });

  // High-contrast bright inner laser core
  const coreBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, width, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  coreBeam.rotation.z = Math.PI / 2;
  coreBeam.position.y = barHeight;
  group.add(coreBeam);

  // Colored glowing outer energy sheath
  const outerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.21, width, 12),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.78,
    }),
  );
  outerBeam.rotation.z = Math.PI / 2;
  outerBeam.position.y = barHeight;
  group.add(outerBeam);

  return group;
}

/**
 * Beveled Golden 5-Pointed Star Collectible (ExtrudeGeometry + inner core).
 */
export function createStarPickup(): THREE.Group {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  const outer = 0.56;
  const inner = 0.25;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / 5 + Math.PI / 2;
    const sx = Math.cos(angle) * r;
    const sy = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geo.center();

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xb45309,
    emissiveIntensity: 0.32,
    roughness: 0.18,
    metalness: 0.85,
  });
  const starMesh = new THREE.Mesh(geo, goldMat);
  starMesh.castShadow = true;
  group.add(starMesh);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.04, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.5,
    }),
  );
  group.add(halo);

  return group;
}

export interface QuizGateVisual {
  group: THREE.Group;
  doorMeshes: [THREE.Mesh, THREE.Mesh, THREE.Mesh];
  doorNormalTextures: [THREE.CanvasTexture, THREE.CanvasTexture, THREE.CanvasTexture];
  doorWrongTextures: [THREE.CanvasTexture, THREE.CanvasTexture, THREE.CanvasTexture];
  doorOpenProgress: [number, number, number];
  doorWrongApplied: [boolean, boolean, boolean];
}

/**
 * Framed Quiz Gate Arch with Twin Masonry Pillars, Overhead Chalkboard Sign, and 3 Interactive Doors.
 */
export function createQuizGateVisual(gate: QuizGateDef, maxAniso: number): QuizGateVisual {
  const group = new THREE.Group();
  group.position.set(0, gate.y, gate.z);

  const subjInfo = SUBJECT_COLORS[gate.question.subject];
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.52, metalness: 0.08 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(subjInfo.bg),
    roughness: 0.32,
    metalness: 0.12,
  });
  const dividerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.25 });

  // Outer left & right pillars + 2 inner door jambs (so doors are framed properly, never freestanding!)
  const jambXs = [-7.1, -2.3, 2.3, 7.1];
  jambXs.forEach((jx, idx) => {
    const isOuter = idx === 0 || idx === 3;
    const w = isOuter ? 0.95 : 0.46;
    const h = isOuter ? 5.6 : 3.6;
    const col = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.9), isOuter ? pillarMat : dividerMat);
    col.position.set(jx, h * 0.5, 0);
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);

    if (isOuter) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.42, 1.15), accentMat);
      cap.position.set(jx, h + 0.15, 0);
      group.add(cap);
    }
  });

  // Overhead Chalkboard Lintel
  const headerTex = createGateHeaderTexture(
    gate.gateIndex + 1,
    subjInfo.label,
    subjInfo.accent,
    maxAniso,
    gate.question.grade,
  );
  const lintel = new THREE.Mesh(
    new THREE.BoxGeometry(15.2, 2.2, 0.82),
    [
      accentMat,
      accentMat,
      accentMat,
      accentMat,
      new THREE.MeshStandardMaterial({ map: headerTex, color: 0xffffff, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: headerTex, color: 0xffffff, roughness: 0.55 }),
    ],
  );
  lintel.position.set(0, 4.75, 0);
  lintel.castShadow = true;
  group.add(lintel);

  // 3 Framed Answer Doors (A, B, C)
  const letters: ['A', 'B', 'C'] = ['A', 'B', 'C'];
  const doorMeshes: THREE.Mesh[] = [];
  const doorNormalTextures: THREE.CanvasTexture[] = [];
  const doorWrongTextures: THREE.CanvasTexture[] = [];

  for (let i = 0; i < 3; i++) {
    const door = gate.doors[i];
    const normalTex = createQuizDoorTexture(letters[i], gate.question.options[i], 'normal', maxAniso);
    const wrongTex = createQuizDoorTexture(letters[i], gate.question.options[i], 'wrong', maxAniso);
    doorNormalTextures.push(normalTex);
    doorWrongTextures.push(wrongTex);

    const sideMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const faceMat = new THREE.MeshStandardMaterial({
      map: normalTex,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(door.width, 3.45, 0.34),
      [sideMat, sideMat, sideMat, sideMat, faceMat, faceMat],
    );
    mesh.position.set(door.x, 1.74, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    doorMeshes.push(mesh);
  }

  return {
    group,
    doorMeshes: doorMeshes as [THREE.Mesh, THREE.Mesh, THREE.Mesh],
    doorNormalTextures: doorNormalTextures as [THREE.CanvasTexture, THREE.CanvasTexture, THREE.CanvasTexture],
    doorWrongTextures: doorWrongTextures as [THREE.CanvasTexture, THREE.CanvasTexture, THREE.CanvasTexture],
    doorOpenProgress: [0, 0, 0],
    doorWrongApplied: [false, false, false],
  };
}

/**
 * Towering Sky-Academy Finish Arch + LatheGeometry Spinning Golden Trophy visible from spawn!
 */
export function createFinishArch(
  y: number,
  z: number,
  maxAniso: number,
): { group: THREE.Group; trophy: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(0, y, z);

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.1 });
  const blueTrim = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.28, metalness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xa16207,
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.9,
  });

  // Twin tall triumph pillars
  [-7.4, 7.4].forEach((px) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 9.6, 16), pillarMat);
    col.position.set(px, 4.8, 0);
    col.castShadow = true;
    group.add(col);

    const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.7, 16), blueTrim);
    ring1.position.set(px, 2.2, 0);
    group.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.7, 16), goldMat);
    ring2.position.set(px, 7.2, 0);
    group.add(ring2);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), goldMat);
    finial.position.set(px, 9.9, 0);
    group.add(finial);
  });

  // Checkered finish banner crossbar
  const bannerTex = createFinishBannerTexture(maxAniso);
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(15.2, 3.0, 0.85),
    [
      blueTrim,
      blueTrim,
      goldMat,
      goldMat,
      new THREE.MeshStandardMaterial({ map: bannerTex, color: 0xffffff, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ map: bannerTex, color: 0xffffff, roughness: 0.4 }),
    ],
  );
  banner.position.set(0, 8.2, 0);
  banner.castShadow = true;
  group.add(banner);

  // Spinning LatheGeometry Golden Trophy perched atop the arch
  const trophy = new THREE.Group();
  trophy.position.set(0, 10.2, 0);

  const cupPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.05, 0.0),
    new THREE.Vector2(0.85, 0.35),
    new THREE.Vector2(0.32, 0.65),
    new THREE.Vector2(0.28, 1.35),
    new THREE.Vector2(0.95, 1.8),
    new THREE.Vector2(1.38, 3.1),
    new THREE.Vector2(1.48, 3.4),
    new THREE.Vector2(1.22, 3.4),
  ];
  const cupGeo = new THREE.LatheGeometry(cupPoints, 20);
  const cup = new THREE.Mesh(cupGeo, goldMat);
  cup.castShadow = true;
  trophy.add(cup);

  [-1.25, 1.25].forEach((hx) => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 10, 18), goldMat);
    handle.position.set(hx, 2.45, 0);
    trophy.add(handle);
  });

  group.add(trophy);
  return { group, trophy };
}

/**
 * Natural sky-island environment decor (tapered rock islands, stylized trees, hot-air balloons, InstancedMesh clouds).
 * Extends far beyond playable lanes so the sky world feels joyful, deep, and never boxed in a void.
 */
export function createSkyWorldDecor(scene: THREE.Scene): {
  balloons: THREE.Group[];
  cloudsMesh: THREE.InstancedMesh;
} {
  const balloons: THREE.Group[] = [];

  // 1. Floating Background Islands with tapered rock undersides & grass crowns
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.78, metalness: 0.02 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88, metalness: 0.05 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
  const foliageMat1 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.75 });
  const foliageMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72 });

  const islandPositions: Array<[number, number, number, number]> = [
    [-26, -3, -16, 1.2],
    [28, -1, -24, 1.35],
    [-30, -2, -62, 1.15],
    [32, -4, -78, 1.4],
    [-25, 1, -112, 1.1],
    [27, -2, -126, 1.3],
    [-32, -1, -162, 1.25],
    [30, 1, -178, 1.2],
    [-26, 0, -218, 1.35],
    [26, 2, -230, 1.45],
    [0, -4, -278, 2.2], // Scenic landmark island behind Finish Arch
  ];

  islandPositions.forEach(([ix, iy, iz, scale], idx) => {
    const island = new THREE.Group();
    island.position.set(ix, iy, iz);
    island.scale.setScalar(scale);

    const grassCap = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.1, 1.4, 9), grassMat);
    grassCap.position.y = 0;
    island.add(grassCap);

    const rockSpike = new THREE.Mesh(new THREE.ConeGeometry(5.0, 9.5, 8), rockMat);
    rockSpike.rotation.x = Math.PI;
    rockSpike.position.y = -5.4;
    island.add(rockSpike);

    // Composite 3-part stylized pine trees grounded on the grass cap
    const treeCount = idx % 2 === 0 ? 2 : 3;
    for (let t = 0; t < treeCount; t++) {
      const tree = new THREE.Group();
      const angle = t * 2.2 + idx;
      const r = 1.6 + (t % 2) * 1.4;
      tree.position.set(Math.cos(angle) * r, 0.7, Math.sin(angle) * r);
      const tScale = 0.85 + ((idx + t) % 3) * 0.16;
      tree.scale.setScalar(tScale);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.5, 7), trunkMat);
      trunk.position.y = 0.75;
      tree.add(trunk);

      const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.2, 8), foliageMat1);
      tier1.position.y = 2.2;
      tree.add(tier1);

      const tier2 = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.8, 8), foliageMat2);
      tier2.position.y = 3.5;
      tree.add(tier2);

      island.add(tree);
    }

    scene.add(island);
  });

  // 2. Cheerful School-Themed Hot-Air Balloons drifting in the sky
  const balloonColors = [0xef4444, 0xfacc15, 0x3b82f6, 0xec4899, 0x10b981];
  const basketMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 });

  const balloonCoords: Array<[number, number, number]> = [
    [-22, 13, -34],
    [24, 15, -56],
    [-25, 16, -124],
    [25, 14, -168],
    [-19, 17, -238],
    [21, 18, -248],
  ];

  balloonCoords.forEach(([bx, by, bz], idx) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, by, bz);

    const envelope = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 16, 14),
      new THREE.MeshStandardMaterial({
        color: balloonColors[idx % balloonColors.length],
        roughness: 0.45,
        metalness: 0.05,
      }),
    );
    envelope.scale.set(1, 1.18, 1);
    bGroup.add(envelope);

    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(2.58, 0.2, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
    );
    belt.rotation.x = Math.PI / 2;
    bGroup.add(belt);

    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), basketMat);
    basket.position.y = -4.0;
    bGroup.add(basket);

    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 1.3, 6), ropeMat);
    rope.position.y = -3.1;
    bGroup.add(rope);

    scene.add(bGroup);
    balloons.push(bGroup);
  });

  // 3. InstancedMesh Fluffy Sky Clouds (56 puffs across the horizon)
  const puffCount = 56;
  const cloudGeo = new THREE.SphereGeometry(1, 10, 8);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
  });
  const cloudsMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, puffCount);
  cloudsMesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < puffCount; i++) {
    const cluster = Math.floor(i / 4);
    const sub = i % 4;
    const side = cluster % 2 === 0 ? -1 : 1;
    const cx = side * (22 + ((cluster * 13) % 34)) + (sub - 1.5) * 2.4;
    const cy = -8 + ((cluster * 7) % 24) + (sub % 2) * 1.1;
    const cz = 18 - cluster * 22 + ((sub * 1.9) - 2.5);
    const sx = 3.2 + (sub === 1 || sub === 2 ? 1.4 : 0.4);
    const sy = 2.0 + (sub === 1 ? 0.9 : 0.2);
    const sz = 2.8 + (sub % 2) * 0.8;

    dummy.position.set(cx, cy, cz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    cloudsMesh.setMatrixAt(i, dummy.matrix);
  }
  cloudsMesh.instanceMatrix.needsUpdate = true;
  cloudsMesh.computeBoundingSphere();
  scene.add(cloudsMesh);

  return { balloons, cloudsMesh };
}
