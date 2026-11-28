import * as THREE from 'three';
import { createBlackLeatherGloveTextures } from './textures';

export interface LegsAnimationState {
  dt: number;
  elapsed: number;
  /** Horizontal speed m/s */
  horizSpeed: number;
  /** Vertical velocity m/s */
  verticalVel: number;
  isGrounded: boolean;
  isSprinting: boolean;
  crouchBlend: number;
  groundSlideBlend: number;
  /** 0..1 active wall-run blend */
  wallRunBlend: number;
  /** 0..1 active vertical wall-run-up blend */
  wallRunUpBlend?: number;
  /** 0..1 active wall-slide blend */
  wallSlideBlend: number;
  /** -1 = wall on left, +1 = wall on right, 0 = none */
  wallSide: -1 | 0 | 1;
  /** 0..1 hanging/climbing on a building ledge */
  ledgeBlend?: number;
  /** 0..1 mantle pull-up progress (0 = hanging, >0 = climbing onto ledge) */
  ledgeClimbProgress?: number;
  /** 0..1 hand-over-hand arm climb blend */
  armClimbBlend?: number;
  /** Continuous phase for hand-over-hand climb stepping (radians) */
  armClimbPhase?: number;
  /** 0..1 pre-jump knee-bend compression load */
  jumpLoad01?: number;
  /** Stride cycle phase in radians */
  stridePhase: number;
  /** Player eye height above feet (meters) */
  eyeHeight: number;
}

export interface FirstPersonLegsRig {
  root: THREE.Group;
  update: (state: LegsAnimationState) => void;
  dispose: () => void;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createTacticalPantTexture(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
} {
  const size = 128;
  const cM = document.createElement('canvas');
  cM.width = size;
  cM.height = size;
  const ctxM = cM.getContext('2d')!;
  ctxM.fillStyle = '#1b2028';
  ctxM.fillRect(0, 0, size, size);

  const cR = document.createElement('canvas');
  cR.width = size;
  cR.height = size;
  const ctxR = cR.getContext('2d')!;
  ctxR.fillStyle = 'rgb(198,198,198)';
  ctxR.fillRect(0, 0, size, size);

  // Ripstop tactical weave micro-grid
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const shade = 24 + ((x * 7 + y * 13) % 10);
      ctxM.fillStyle = `rgb(${shade},${shade + 4},${shade + 10})`;
      ctxM.fillRect(x, y, 3, 3);
    }
  }

  const map = new THREE.CanvasTexture(cM);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(4, maxAnisotropy || 1);

  const roughnessMap = new THREE.CanvasTexture(cR);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);

  return {
    map,
    roughnessMap,
    dispose() {
      map.dispose();
      roughnessMap.dispose();
    },
  };
}

function createDetailedBootTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  soleMap: THREE.CanvasTexture;
  soleNormalMap: THREE.CanvasTexture;
  dispose: () => void;
} {
  const size = 256;
  const rng = mulberry32(84217);

  const cM = document.createElement('canvas');
  cM.width = size;
  cM.height = size;
  const ctxM = cM.getContext('2d')!;

  const cR = document.createElement('canvas');
  cR.width = size;
  cR.height = size;
  const ctxR = cR.getContext('2d')!;

  const heights = new Float32Array(size * size);

  // Full-grain dark charcoal oiled leather + ballistic Cordura panel base
  const grad = ctxM.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#23262d');
  grad.addColorStop(0.58, '#1a1d22');
  grad.addColorStop(1, '#2d2824'); // dusty concrete/mud lower foxing gradient
  ctxM.fillStyle = grad;
  ctxM.fillRect(0, 0, size, size);

  ctxR.fillStyle = 'rgb(138,138,138)';
  ctxR.fillRect(0, 0, size, size);

  // Matte Cordura quarter panel insert
  ctxM.fillStyle = '#181b20';
  ctxM.fillRect(28, 42, 200, 128);
  ctxR.fillStyle = 'rgb(198,198,198)';
  ctxR.fillRect(28, 42, 200, 128);
  for (let y = 44; y < 168; y += 4) {
    for (let x = 30; x < 226; x += 4) {
      if (((x + y) & 4) === 0) {
        ctxM.fillStyle = 'rgba(42,46,54,0.35)';
        ctxM.fillRect(x, y, 2, 2);
      }
      heights[y * size + x] += 0.14;
    }
  }

  // Oiled leather pebble grain + micro-creases
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain =
        Math.sin(x * 0.52 + y * 0.19) * Math.cos(y * 0.48 - x * 0.14) * 0.16 +
        (rng() - 0.5) * 0.18;
      heights[y * size + x] += grain;
    }
  }

  // Subtle scuff marks & concrete wear near lower toe/heel
  for (let i = 0; i < 420; i++) {
    const x = rng() * size;
    const y = 148 + rng() * 106;
    const w = 2 + rng() * 10;
    const h = 1 + rng() * 3;
    const dusty = rng() > 0.45;
    ctxM.fillStyle = dusty ? 'rgba(98,94,88,0.22)' : 'rgba(54,56,62,0.34)';
    ctxM.fillRect(x, y, w, h);
    ctxR.fillStyle = dusty ? 'rgb(212,212,212)' : 'rgb(96,96,96)';
    ctxR.fillRect(x, y, w, h);
  }

  // Contrast double-row reinforced stitching seams around quarter, heel cup, & vamp
  const drawDoubleStitch = (x1: number, y1: number, x2: number, y2: number) => {
    for (const off of [-3, 3]) {
      ctxM.save();
      ctxM.strokeStyle = '#9b7b56';
      ctxM.lineWidth = 1.6;
      ctxM.setLineDash([4, 3]);
      ctxM.beginPath();
      ctxM.moveTo(x1 + off, y1 + off * 0.4);
      ctxM.lineTo(x2 + off, y2 + off * 0.4);
      ctxM.stroke();
      ctxM.restore();
    }
  };
  drawDoubleStitch(28, 42, 228, 42);
  drawDoubleStitch(28, 170, 228, 170);
  drawDoubleStitch(28, 42, 28, 170);
  drawDoubleStitch(228, 42, 228, 170);
  drawDoubleStitch(12, 210, 244, 210);

  // Emboss stitch grooves into height map
  for (const sy of [39, 45, 167, 173, 207, 213]) {
    for (let x = 16; x < 240; x++) {
      if (x % 7 < 4) heights[sy * size + x] += 0.35;
    }
  }

  // Normal map from height buffer
  const cN = document.createElement('canvas');
  cN.width = size;
  cN.height = size;
  const ctxN = cN.getContext('2d')!;
  const imgN = ctxN.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heights[y * size + xp] - heights[y * size + xm]) * 2.1;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * 2.1;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const idx = (y * size + x) * 4;
      imgN.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      imgN.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      imgN.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      imgN.data[idx + 3] = 255;
    }
  }
  ctxN.putImageData(imgN, 0, 0);

  // Lugged Vibram-style rubber outsole texture + normal map
  const cSM = document.createElement('canvas');
  cSM.width = 128;
  cSM.height = 128;
  const ctxSM = cSM.getContext('2d')!;
  ctxSM.fillStyle = '#101215';
  ctxSM.fillRect(0, 0, 128, 128);
  const sH = new Float32Array(128 * 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const inLug = x % 24 >= 4 && x % 24 <= 20 && y % 18 >= 3 && y % 18 <= 14;
      sH[y * 128 + x] = inLug ? 0.6 : -0.35;
      if (inLug) {
        ctxSM.fillStyle = '#1b1f24';
        ctxSM.fillRect(x, y, 1, 1);
      }
    }
  }
  const cSN = document.createElement('canvas');
  cSN.width = 128;
  cSN.height = 128;
  const ctxSN = cSN.getContext('2d')!;
  const imgSN = ctxSN.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    const ym = (y - 1 + 128) % 128;
    const yp = (y + 1) % 128;
    for (let x = 0; x < 128; x++) {
      const xm = (x - 1 + 128) % 128;
      const xp = (x + 1) % 128;
      const dx = (sH[y * 128 + xp] - sH[y * 128 + xm]) * 2.4;
      const dy = (sH[yp * 128 + x] - sH[ym * 128 + x]) * 2.4;
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const idx = (y * 128 + x) * 4;
      imgSN.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      imgSN.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      imgSN.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      imgSN.data[idx + 3] = 255;
    }
  }
  ctxSN.putImageData(imgSN, 0, 0);

  const cfg = (c: HTMLCanvasElement, color: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, Math.max(1, maxAnisotropy || 1));
    t.needsUpdate = true;
    return t;
  };

  const map = cfg(cM, true);
  const normalMap = cfg(cN, false);
  const roughnessMap = cfg(cR, false);
  const soleMap = cfg(cSM, true);
  const soleNormalMap = cfg(cSN, false);

  return {
    map,
    normalMap,
    roughnessMap,
    soleMap,
    soleNormalMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      soleMap.dispose();
      soleNormalMap.dispose();
    },
  };
}

/**
 * First-person articulated tactical lower-body rig (pelvis, thighs, knees,
 * shins, detailed stitched/lugged boots).
 *
 * LEG VISIBILITY LAW (Lotty, Nov 27, 2026):
 * Body & legs sit slightly behind-below the camera (+Z rearward, +X subtle right trail)
 * so legs stay completely OUT of frame in normal/level/slight-down views and only
 * barely enter the bottom-right corner on a very steep down-look.
 */
export function createFirstPersonLegs(maxAnisotropy: number): FirstPersonLegsRig {
  const root = new THREE.Group();
  root.name = 'FirstPersonLegsRoot';

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const pantTex = createTacticalPantTexture(maxAnisotropy);
  const bootTex = createDetailedBootTextures(maxAnisotropy);
  const disposables: Array<{ dispose: () => void }> = [pantTex, bootTex];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const pantMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: pantTex.map,
    roughnessMap: pantTex.roughnessMap,
    roughness: 0.86,
    metalness: 0.06,
  });

  const kneePadMat = new THREE.MeshStandardMaterial({
    color: 0x12151a,
    roughness: 0.56,
    metalness: 0.22,
  });

  const bootMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: bootTex.map,
    normalMap: bootTex.normalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: bootTex.roughnessMap,
    roughness: 0.72,
    metalness: 0.14,
  });

  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    roughness: 0.84,
    metalness: 0.05,
  });

  const weltMat = new THREE.MeshStandardMaterial({
    color: 0x7a5c3c,
    roughness: 0.76,
    metalness: 0.08,
  });

  const laceMat = new THREE.MeshStandardMaterial({
    color: 0x22262d,
    roughness: 0.88,
    metalness: 0.04,
  });

  const eyeletMat = new THREE.MeshStandardMaterial({
    color: 0x8a795d,
    roughness: 0.34,
    metalness: 0.85,
  });

  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: bootTex.soleMap,
    normalMap: bootTex.soleNormalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.92,
    metalness: 0.04,
  });

  disposables.push(
    pantMat,
    kneePadMat,
    bootMat,
    collarMat,
    weltMat,
    laceMat,
    eyeletMat,
    soleMat,
  );

  // Subtle waist/belt pelvis block (kept safely rearward of camera plane)
  const pelvisMesh = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.11, 0.16, 4, 12)),
    pantMat,
  );
  pelvisMesh.rotation.z = Math.PI / 2;
  pelvisMesh.position.set(0, 0.02, 0.03);
  bodyPivot.add(pelvisMesh);

  // Shared boot sub-geometries across both feet for optimal draw-call & memory cost
  const bootShaftGeo = trackGeo(new THREE.CylinderGeometry(0.053, 0.057, 0.135, 14));
  const collarGeo = trackGeo(new THREE.TorusGeometry(0.052, 0.014, 8, 16));
  const vampGeo = trackGeo(new THREE.CapsuleGeometry(0.046, 0.115, 6, 12));
  const heelCupGeo = trackGeo(new THREE.CylinderGeometry(0.049, 0.053, 0.085, 12));
  const toeCapGeo = trackGeo(new THREE.SphereGeometry(0.049, 12, 10));
  const tongueGeo = trackGeo(new THREE.BoxGeometry(0.056, 0.095, 0.022));
  const eyeletGeo = trackGeo(new THREE.TorusGeometry(0.0046, 0.0018, 6, 10));
  const laceBarGeo = trackGeo(new THREE.CylinderGeometry(0.0028, 0.0028, 0.058, 6));
  const weltGeo = trackGeo(new THREE.BoxGeometry(0.101, 0.009, 0.252));
  const outsoleGeo = trackGeo(new THREE.BoxGeometry(0.104, 0.018, 0.256));
  const heelBlockGeo = trackGeo(new THREE.BoxGeometry(0.102, 0.016, 0.082));
  const lugBarGeo = trackGeo(new THREE.BoxGeometry(0.096, 0.008, 0.018));

  interface SingleLegRig {
    hipPivot: THREE.Group;
    kneePivot: THREE.Group;
    anklePivot: THREE.Group;
  }

  const buildLeg = (sideSign: -1 | 1): SingleLegRig => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(sideSign * 0.105, -0.02, 0);
    bodyPivot.add(hipPivot);

    // Thigh (0.42m drop from hip)
    const thigh = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.072, 0.29, 5, 14)),
      pantMat,
    );
    thigh.position.set(0, -0.21, 0);
    hipPivot.add(thigh);

    // Knee articulation
    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.43, 0);
    hipPivot.add(kneePivot);

    const kneePad = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.102, 0.095, 0.068)),
      kneePadMat,
    );
    kneePad.position.set(0, -0.01, -0.044);
    kneePivot.add(kneePad);

    // Shin (0.40m drop from knee)
    const shin = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.054, 0.28, 5, 14)),
      pantMat,
    );
    shin.position.set(0, -0.20, 0);
    kneePivot.add(shin);

    // Ankle + Multi-Part Sculpted Tactical Boot
    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -0.40, 0);
    kneePivot.add(anklePivot);

    const bootShaft = new THREE.Mesh(bootShaftGeo, bootMat);
    bootShaft.position.set(0, 0.024, 0.004);
    bootShaft.receiveShadow = true;
    anklePivot.add(bootShaft);

    const paddedCollar = new THREE.Mesh(collarGeo, collarMat);
    paddedCollar.rotation.x = Math.PI * 0.5;
    paddedCollar.position.set(0, 0.088, 0.005);
    anklePivot.add(paddedCollar);

    const heelCup = new THREE.Mesh(heelCupGeo, bootMat);
    heelCup.position.set(0, -0.022, 0.028);
    heelCup.receiveShadow = true;
    anklePivot.add(heelCup);

    const vamp = new THREE.Mesh(vampGeo, bootMat);
    vamp.rotation.x = Math.PI * 0.5;
    vamp.scale.set(1.06, 1.0, 0.72);
    vamp.position.set(0, -0.036, -0.058);
    vamp.receiveShadow = true;
    anklePivot.add(vamp);

    const toeCap = new THREE.Mesh(toeCapGeo, bootMat);
    toeCap.scale.set(1.02, 0.68, 1.18);
    toeCap.position.set(0, -0.044, -0.142);
    toeCap.receiveShadow = true;
    anklePivot.add(toeCap);

    // Gusseted tongue angled along instep
    const tongue = new THREE.Mesh(tongueGeo, collarMat);
    tongue.position.set(0, 0.015, -0.044);
    tongue.rotation.x = -0.52;
    anklePivot.add(tongue);

    // 4 pairs of brass grommet eyelets + criss-crossed laces
    for (let li = 0; li < 4; li++) {
      const ly = -0.012 + li * 0.021;
      const lz = -0.088 + li * 0.018;
      for (const sgn of [-1, 1]) {
        const eyelet = new THREE.Mesh(eyeletGeo, eyeletMat);
        eyelet.rotation.y = Math.PI * 0.5;
        eyelet.position.set(sgn * 0.029, ly, lz);
        anklePivot.add(eyelet);
      }
      const laceA = new THREE.Mesh(laceBarGeo, laceMat);
      laceA.position.set(0, ly + 0.004, lz - 0.002);
      laceA.rotation.set(0.28, 0.34, Math.PI * 0.5);
      anklePivot.add(laceA);

      const laceB = new THREE.Mesh(laceBarGeo, laceMat);
      laceB.position.set(0, ly + 0.004, lz - 0.002);
      laceB.rotation.set(0.28, -0.34, Math.PI * 0.5);
      anklePivot.add(laceB);
    }

    // Stitched leather welt trim + deep-lugged outsole + heel block
    const welt = new THREE.Mesh(weltGeo, weltMat);
    welt.position.set(0, -0.062, -0.056);
    anklePivot.add(welt);

    const outsole = new THREE.Mesh(outsoleGeo, soleMat);
    outsole.position.set(0, -0.075, -0.058);
    outsole.receiveShadow = true;
    anklePivot.add(outsole);

    const heelBlock = new THREE.Mesh(heelBlockGeo, soleMat);
    heelBlock.position.set(0, -0.084, 0.028);
    anklePivot.add(heelBlock);

    // Prominent forefoot tread lugs along sole bottom
    for (let ti = 0; ti < 4; ti++) {
      const lug = new THREE.Mesh(lugBarGeo, soleMat);
      lug.position.set(0, -0.086, -0.048 - ti * 0.036);
      anklePivot.add(lug);
    }

    return { hipPivot, kneePivot, anklePivot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  let smoothWallRoll = 0;
  let smoothLeanX = 0.075;
  let smoothBackZ = 0.32;
  let smoothHipY = 0.86;

  return {
    root,
    update(s: LegsAnimationState) {
      const dt = Math.min(s.dt, 0.05);
      const speed01 = THREE.MathUtils.clamp(s.horizSpeed / 9.5, 0, 1.35);
      const runUpB = s.wallRunUpBlend ?? 0;
      const climbWallB = s.armClimbBlend ?? 0;
      const wallBlend = Math.max(s.wallRunBlend, s.wallSlideBlend, runUpB);

      // LEG VISIBILITY LAW (Lotty, Nov 27, 2026):
      // Keep hips & legs positioned rearward (+Z ~ 0.31..0.37m) and trailing slightly right (+X)
      // so normal/level/slight-down views show ZERO legs; only steep down-looks barely reveal
      // the trailing right boot in the bottom-right corner of the frame.
      const ledgeB = s.ledgeBlend ?? 0;
      const climbP = s.ledgeClimbProgress ?? 0;
      const climbKneeClear =
        ledgeB * Math.sin(THREE.MathUtils.clamp((climbP - 0.30) / 0.56, 0, 1) * Math.PI);
      const targetBackZ =
        0.32 +
        s.wallRunBlend * 0.04 +
        s.wallSlideBlend * 0.03 +
        runUpB * 0.04 +
        climbWallB * 0.06 +
        climbKneeClear * 0.06 -
        s.groundSlideBlend * 0.24;
      const targetHipY =
        Math.max(0.40, s.eyeHeight - 0.80) -
        s.wallRunBlend * 0.04 -
        s.wallSlideBlend * 0.08 -
        s.groundSlideBlend * 0.24 -
        (s.jumpLoad01 ?? 0) * 0.11;

      // Subtle right-side framing bias when looking steeply down, plus subtle wall hang-off lean
      const targetLeanX =
        s.wallSide !== 0
          ? -s.wallSide * (s.wallRunBlend * 0.05 + s.wallSlideBlend * 0.08) + 0.075
          : 0.085 * (1 - climbWallB * 0.65);
      const targetWallRoll =
        s.wallSide !== 0
          ? s.wallSide * (s.wallRunBlend * 0.28 + s.wallSlideBlend * 0.22)
          : 0;

      smoothBackZ = THREE.MathUtils.damp(smoothBackZ, targetBackZ, 12, dt);
      smoothHipY = THREE.MathUtils.damp(smoothHipY, targetHipY, 14, dt);
      smoothLeanX = THREE.MathUtils.damp(smoothLeanX, targetLeanX, 11, dt);
      smoothWallRoll = THREE.MathUtils.damp(smoothWallRoll, targetWallRoll, 11, dt);

      bodyPivot.position.set(smoothLeanX, smoothHipY, smoothBackZ);
      bodyPivot.rotation.set(
        s.groundSlideBlend * -0.78 - s.wallRunBlend * 0.06 - runUpB * 0.08,
        0,
        smoothWallRoll,
      );

      // Base grounded idle / run gait (+hip.x = forward, -knee.x = backward bend)
      // Biased slightly rearward (-0.24 rad) so thighs/shins trail underneath & behind camera!
      const strideSin = Math.sin(s.stridePhase);
      const strideCos = Math.cos(s.stridePhase);

      const amp = s.isGrounded
        ? (0.08 + speed01 * 0.28) * (1 - s.groundSlideBlend)
        : 0.09;

      let lHipX = -0.26 + strideSin * amp;
      let rHipX = -0.20 - strideSin * amp;
      let lKneeX =
        -0.22 -
        Math.max(0, -strideSin) * (0.24 + speed01 * 0.48) -
        Math.max(0, strideCos) * 0.14 * speed01;
      let rKneeX =
        -0.22 -
        Math.max(0, strideSin) * (0.24 + speed01 * 0.48) -
        Math.max(0, -strideCos) * 0.14 * speed01;
      let lHipZ = -0.03;
      let rHipZ = 0.03;
      let lAnkleX = -0.08 - lHipX * 0.25;
      let rAnkleX = -0.08 - rHipX * 0.25;

      // Athletic knee-bend compression when loading into jump
      const jLoad = s.jumpLoad01 ?? 0;
      if (jLoad > 0.01) {
        lHipX = THREE.MathUtils.lerp(lHipX, 0.22, jLoad);
        rHipX = THREE.MathUtils.lerp(rHipX, 0.28, jLoad);
        lKneeX = THREE.MathUtils.lerp(lKneeX, -0.82, jLoad);
        rKneeX = THREE.MathUtils.lerp(rKneeX, -0.88, jLoad);
      }

      // Airborne tuck (trailing cleanly behind-below)
      if (!s.isGrounded && wallBlend < 0.05 && climbWallB < 0.05) {
        const fallTuck = THREE.MathUtils.clamp(-s.verticalVel * 0.035, -0.08, 0.22);
        lHipX = -0.18 + fallTuck * 0.25 + Math.sin(s.elapsed * 3.1) * 0.04;
        rHipX = -0.28 + fallTuck * 0.2 - Math.sin(s.elapsed * 3.1) * 0.04;
        lKneeX = -0.58;
        rKneeX = -0.44;
      }

      // Ground baseball slide
      if (s.groundSlideBlend > 0.02) {
        const gs = s.groundSlideBlend;
        lHipX = THREE.MathUtils.lerp(lHipX, 0.88, gs);
        lKneeX = THREE.MathUtils.lerp(lKneeX, -0.24, gs);
        rHipX = THREE.MathUtils.lerp(rHipX, 0.42, gs);
        rKneeX = THREE.MathUtils.lerp(rKneeX, -1.18, gs);
      }

      // Horizontal WALL-RUN GAIT: trailing slightly behind-below, inner leg lightly canted toward wall
      if (s.wallRunBlend > 0.01 && s.wallSide !== 0) {
        const wb = s.wallRunBlend;
        const wrStride = Math.sin(s.stridePhase * 1.15);
        const wrCos = Math.cos(s.stridePhase * 1.15);

        const innerHip = -0.16 + wrStride * 0.30;
        const outerHip = -0.28 - wrStride * 0.28;
        const innerKnee = -0.48 - Math.max(0, -wrStride) * 0.50 - Math.max(0, wrCos) * 0.14;
        const outerKnee = -0.36 - Math.max(0, wrStride) * 0.46 - Math.max(0, -wrCos) * 0.14;

        if (s.wallSide === -1) {
          lHipX = THREE.MathUtils.lerp(lHipX, innerHip, wb);
          lKneeX = THREE.MathUtils.lerp(lKneeX, innerKnee, wb);
          lHipZ = THREE.MathUtils.lerp(lHipZ, -0.24, wb);
          lAnkleX = THREE.MathUtils.lerp(lAnkleX, 0.16 - wrStride * 0.20, wb);
          rHipX = THREE.MathUtils.lerp(rHipX, outerHip, wb);
          rKneeX = THREE.MathUtils.lerp(rKneeX, outerKnee, wb);
          rHipZ = THREE.MathUtils.lerp(rHipZ, -0.02, wb);
          rAnkleX = THREE.MathUtils.lerp(rAnkleX, 0.08 + wrStride * 0.18, wb);
        } else {
          rHipX = THREE.MathUtils.lerp(rHipX, innerHip, wb);
          rKneeX = THREE.MathUtils.lerp(rKneeX, innerKnee, wb);
          rHipZ = THREE.MathUtils.lerp(rHipZ, 0.24, wb);
          rAnkleX = THREE.MathUtils.lerp(rAnkleX, 0.16 - wrStride * 0.20, wb);
          lHipX = THREE.MathUtils.lerp(lHipX, outerHip, wb);
          lKneeX = THREE.MathUtils.lerp(lKneeX, outerKnee, wb);
          lHipZ = THREE.MathUtils.lerp(lHipZ, 0.02, wb);
          lAnkleX = THREE.MathUtils.lerp(lAnkleX, 0.08 + wrStride * 0.18, wb);
        }
      }

      // VERTICAL WALL RUN-UP SCRAMBLE: rapid upward stepping trail behind hips
      if (runUpB > 0.01) {
        const scSin = Math.sin(s.stridePhase * 1.45);
        lHipX = THREE.MathUtils.lerp(lHipX, -0.14 + scSin * 0.34, runUpB);
        rHipX = THREE.MathUtils.lerp(rHipX, -0.14 - scSin * 0.34, runUpB);
        lKneeX = THREE.MathUtils.lerp(lKneeX, -0.58 - Math.max(0, scSin) * 0.42, runUpB);
        rKneeX = THREE.MathUtils.lerp(rKneeX, -0.58 - Math.max(0, -scSin) * 0.42, runUpB);
      }

      // WALL-SLIDE POSE: inner leg tucked, outer leg trailing below
      if (s.wallSlideBlend > 0.01 && s.wallSide !== 0) {
        const sb = s.wallSlideBlend;
        const jitter = Math.sin(s.elapsed * 26.0) * 0.02;
        const innerSlideHip = -0.04 + jitter;
        const innerSlideKnee = -0.84;
        const outerSlideHip = -0.24 - jitter * 0.5;
        const outerSlideKnee = -0.42;

        if (s.wallSide === -1) {
          lHipX = THREE.MathUtils.lerp(lHipX, innerSlideHip, sb);
          lKneeX = THREE.MathUtils.lerp(lKneeX, innerSlideKnee, sb);
          lHipZ = THREE.MathUtils.lerp(lHipZ, -0.24, sb);
          lAnkleX = THREE.MathUtils.lerp(lAnkleX, 0.22, sb);
          rHipX = THREE.MathUtils.lerp(rHipX, outerSlideHip, sb);
          rKneeX = THREE.MathUtils.lerp(rKneeX, outerSlideKnee, sb);
          rHipZ = THREE.MathUtils.lerp(rHipZ, 0.03, sb);
          rAnkleX = THREE.MathUtils.lerp(rAnkleX, -0.12, sb);
        } else {
          rHipX = THREE.MathUtils.lerp(rHipX, innerSlideHip, sb);
          rKneeX = THREE.MathUtils.lerp(rKneeX, innerSlideKnee, sb);
          rHipZ = THREE.MathUtils.lerp(rHipZ, 0.24, sb);
          rAnkleX = THREE.MathUtils.lerp(rAnkleX, 0.22, sb);
          lHipX = THREE.MathUtils.lerp(lHipX, outerSlideHip, sb);
          lKneeX = THREE.MathUtils.lerp(lKneeX, outerSlideKnee, sb);
          lHipZ = THREE.MathUtils.lerp(lHipZ, -0.03, sb);
          lAnkleX = THREE.MathUtils.lerp(lAnkleX, -0.12, sb);
        }
      }

      // HAND-OVER-HAND ARM CLIMB: alternating foot-brace steps synced to climbCyclePhase
      if (climbWallB > 0.01) {
        const cPhase = s.armClimbPhase ?? 0;
        const cSin = Math.sin(cPhase);
        lHipX = THREE.MathUtils.lerp(lHipX, -0.18 + cSin * 0.26, climbWallB);
        rHipX = THREE.MathUtils.lerp(rHipX, -0.18 - cSin * 0.26, climbWallB);
        lKneeX = THREE.MathUtils.lerp(lKneeX, -0.42 - Math.max(0, cSin) * 0.44, climbWallB);
        rKneeX = THREE.MathUtils.lerp(rKneeX, -0.42 - Math.max(0, -cSin) * 0.44, climbWallB);
      }

      // LEDGE HANG & MANTLE STEP-UP (chest comes over -> right knee drives up onto ledge -> stand)
      if (ledgeB > 0.01) {
        const hangSway = Math.sin(s.elapsed * 2.3) * 0.03;
        const pullTuck = THREE.MathUtils.smoothstep(climbP, 0.24, 0.48);
        const stepDrive = THREE.MathUtils.smoothstep(climbP, 0.48, 0.80);
        const stepSettle = THREE.MathUtils.smoothstep(climbP, 0.80, 1.0);
        const rDriveHip = THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(-0.18 + hangSway, 0.04, pullTuck),
          0.74,
          stepDrive,
        );
        const rGoalHip = THREE.MathUtils.lerp(rDriveHip, -0.16, stepSettle);
        const rDriveKnee = THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(-0.34, -0.68, pullTuck),
          -1.28,
          stepDrive,
        );
        const rGoalKnee = THREE.MathUtils.lerp(rDriveKnee, -0.22, stepSettle);

        const lDriveHip = THREE.MathUtils.lerp(-0.24 - hangSway, 0.22, stepDrive);
        const lGoalHip = THREE.MathUtils.lerp(lDriveHip, -0.18, stepSettle);
        const lDriveKnee = THREE.MathUtils.lerp(-0.30, -0.86, stepDrive);
        const lGoalKnee = THREE.MathUtils.lerp(lDriveKnee, -0.20, stepSettle);

        rHipX = THREE.MathUtils.lerp(rHipX, rGoalHip, ledgeB);
        rKneeX = THREE.MathUtils.lerp(rKneeX, rGoalKnee, ledgeB);
        lHipX = THREE.MathUtils.lerp(lHipX, lGoalHip, ledgeB);
        lKneeX = THREE.MathUtils.lerp(lKneeX, lGoalKnee, ledgeB);
      }

      leftLeg.hipPivot.rotation.set(lHipX, 0, lHipZ);
      leftLeg.kneePivot.rotation.set(lKneeX, 0, 0);
      leftLeg.anklePivot.rotation.set(lAnkleX, 0, 0);

      rightLeg.hipPivot.rotation.set(rHipX, 0, rHipZ);
      rightLeg.kneePivot.rotation.set(rKneeX, 0, 0);
      rightLeg.anklePivot.rotation.set(rAnkleX, 0, 0);
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
