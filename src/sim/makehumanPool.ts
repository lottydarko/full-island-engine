import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { TextureLibrary } from './textures';
import type {
  CommuterActivityType,
  EnemyWeaponClass,
  HairStyleType,
  HumanBuildType,
  HumanPoseParams,
  HumanRig,
  OutfitStyleType,
  SharedHumanGeometries,
  WeaponHoldPoseParams,
} from './humanCharacter';

// =========================================================================
// MAKEHUMAN 50-BODY POOL LOADER & MANIFEST (filtered to verified on-disk GLBs)
// =========================================================================

export interface MakeHumanBodyEntry {
  bodyId: string;
  file: string;
  gender: 'male' | 'female' | 'androgynous';
  ageBand: 'young-adult' | 'adult' | 'middle-aged' | 'elder';
  ancestry: string;
  build: string;
  heightM: number;
  skinHex: string;
  /** Real anatomical eye height measured from GLB eye.L/eye.R (fallback ~0.92 * heightM) */
  eyeHeightM: number;
  /** Manifest sampling weight (adult balanced across archetypes) */
  weight: number;
}

/** Files verified present on disk in models/makehuman/ (44 of 50 manifest entries) */
const MISSING_GLB_FILES = new Set<string>([
  'citizen-004.glb',
  'citizen-011.glb',
  'citizen-015.glb',
  'citizen-018.glb',
  'citizen-039.glb',
  'citizen-041.glb',
]);

export interface MpfbBoneRecord {
  bone: THREE.Bone;
  restLocalPos: THREE.Vector3;
  restLocalQuat: THREE.Quaternion;
  restWorldPos: THREE.Vector3;
  restWorldQuat: THREE.Quaternion;
  restWorldQuatInv: THREE.Quaternion;
}

export interface MpfbBodyMeasurements {
  pelvisY: number;
  chestY: number;
  headY: number;
  eyeY: number;
  crownY: number;
  shoulderHalfW: number;
  hipHalfW: number;
  armL1: number;
  armL2: number;
  legL1: number;
  legL2: number;
  palmOffsetL: THREE.Vector3;
  palmOffsetR: THREE.Vector3;
  chestRx: number;
  chestRz: number;
  waistRx: number;
  waistRz: number;
  hipRx: number;
  hipRz: number;
}

export interface MpfbTemplate {
  entry: MakeHumanBodyEntry;
  scene: THREE.Group;
  skinMatBase: THREE.MeshPhysicalMaterial | null;
  jointIndices: Record<string, number>;
  bonePositions: Record<string, THREE.Vector3>;
  measurements: MpfbBodyMeasurements;
  garmentGeoCache: Map<string, { jacket: THREE.BufferGeometry; trousers: THREE.BufferGeometry }>;
}

export interface MpfbAdapter {
  bodyId: string;
  entry: MakeHumanBodyEntry;
  rigGroup: THREE.Object3D;
  skinMesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  measurements: MpfbBodyMeasurements;
  // Mapped core bones
  root: MpfbBoneRecord;
  spine05: MpfbBoneRecord;
  spine03: MpfbBoneRecord;
  spine01: MpfbBoneRecord;
  neck01: MpfbBoneRecord;
  head: MpfbBoneRecord;
  clavicleL: MpfbBoneRecord | null;
  upperArmL: MpfbBoneRecord;
  lowerArmL: MpfbBoneRecord;
  wristL: MpfbBoneRecord;
  clavicleR: MpfbBoneRecord | null;
  upperArmR: MpfbBoneRecord;
  lowerArmR: MpfbBoneRecord;
  wristR: MpfbBoneRecord;
  upperLegL: MpfbBoneRecord;
  lowerLegL: MpfbBoneRecord;
  footL: MpfbBoneRecord;
  upperLegR: MpfbBoneRecord;
  lowerLegR: MpfbBoneRecord;
  footR: MpfbBoneRecord;
  // Finger bones for natural relaxed vs firm weapon grip curling
  leftFingers: MpfbBoneRecord[];
  rightFingers: MpfbBoneRecord[];
  // Measured bind limb directions in character root space
  restUpperArmDirL: THREE.Vector3;
  restForearmDirL: THREE.Vector3;
  restHingeL: THREE.Vector3;
  restUpperArmDirR: THREE.Vector3;
  restForearmDirR: THREE.Vector3;
  restHingeR: THREE.Vector3;
  // Rest offset vectors from spine01 to shoulders (for analytical shoulder world pos)
  shoulderOffInChestL: THREE.Vector3;
  shoulderOffInChestR: THREE.Vector3;
  // Right hand weapon socket parented directly to wrist.R
  rightHandSocket: THREE.Group;
  leftHandSocket: THREE.Group;
  // Optional subtle mob cigarette smoke wisps (no visible cigarette!)
  cigWispSprites: THREE.Sprite[];
}

// =========================================================================
// ARCHETYPE ANIMATION STYLES AS PURE DATA (ARCHETYPE-ANIMATION-STYLES-2026-11-27.md)
// =========================================================================

export type ArchetypeStyleId = 'police' | 'mob' | 'undercover' | 'gang';

export interface ArchetypeAnimProfile {
  id: ArchetypeStyleId;
  label: string;
  // Locomotion parameters
  strideFreqMul: number;
  strideAmp: number;
  bounceAmp: number;
  pelvisSway: number;
  pelvisRoll: number; // swagger vs level pelvis
  shoulderSquare: number; // +squared back vs -hunched forward
  // Idle & head scanning parameters
  headScanMode: 'sector' | 'chin_up' | 'window_shopper' | 'crew_check';
  idleWeightShift: number;
  idleFidget: 'hand_signal' | 'cig_wisps' | 'phone_freeze' | 'restless_weight';
  // Transition & combat grip parameters
  drawBlendRate: number;
  twoHandFire: boolean; // false = MOB enforcer fires one-handed at walk pace!
  stanceYaw: number; // torso blading angle
  combatLean: number; // forward lean (+lean-in for GANG, upright/chin-up for MOB)
  cantRad: number; // weapon cant roll
  recoilScale: number;
  recoilShoulderAbsorb: number; // 0..1: high = clean shoulder absorption, low = visible kick
  // Firing-while-moving & tactical posture parameters
  moveFireAllowed: boolean;
  coverStepBetweenBursts: boolean;
  coverStepAmp: number;
  reloadStyle: 'cover_tuck' | 'offended_unhurried' | 'turned_shield' | 'frantic_fumble';
}

export const ARCHETYPE_ANIM_PROFILES: Record<ArchetypeStyleId, ArchetypeAnimProfile> = {
  police: {
    id: 'police',
    label: 'POLICE',
    strideFreqMul: 0.96,
    strideAmp: 0.45,
    bounceAmp: 0.016,
    pelvisSway: 0.008,
    pelvisRoll: 0.014,
    shoulderSquare: 0.055,
    headScanMode: 'sector',
    idleWeightShift: 0.14,
    idleFidget: 'hand_signal',
    drawBlendRate: 12.0,
    twoHandFire: true,
    stanceYaw: 0.36,
    combatLean: 0.05,
    cantRad: -0.012,
    recoilScale: 0.72,
    recoilShoulderAbsorb: 0.88,
    moveFireAllowed: true,
    coverStepBetweenBursts: true,
    coverStepAmp: 0.14,
    reloadStyle: 'cover_tuck',
  },
  mob: {
    id: 'mob',
    label: 'MOB',
    strideFreqMul: 0.82,
    strideAmp: 0.50,
    bounceAmp: 0.022,
    pelvisSway: 0.038,
    pelvisRoll: 0.095,
    shoulderSquare: -0.02,
    headScanMode: 'chin_up',
    idleWeightShift: 0.68,
    idleFidget: 'cig_wisps',
    drawBlendRate: 6.0,
    twoHandFire: false,
    stanceYaw: 0.58,
    combatLean: -0.035,
    cantRad: -0.19,
    recoilScale: 1.05,
    recoilShoulderAbsorb: 0.36,
    moveFireAllowed: true,
    coverStepBetweenBursts: false,
    coverStepAmp: 0,
    reloadStyle: 'offended_unhurried',
  },
  undercover: {
    id: 'undercover',
    label: 'UNDERCOVER',
    strideFreqMul: 1.0,
    strideAmp: 0.43,
    bounceAmp: 0.022,
    pelvisSway: 0.014,
    pelvisRoll: 0.022,
    shoulderSquare: 0.015,
    headScanMode: 'window_shopper',
    idleWeightShift: 0.38,
    idleFidget: 'phone_freeze',
    drawBlendRate: 28.0,
    twoHandFire: true,
    stanceYaw: 0.40,
    combatLean: 0.06,
    cantRad: -0.008,
    recoilScale: 0.68,
    recoilShoulderAbsorb: 0.92,
    moveFireAllowed: false,
    coverStepBetweenBursts: false,
    coverStepAmp: 0,
    reloadStyle: 'turned_shield',
  },
  gang: {
    id: 'gang',
    label: 'GANG',
    strideFreqMul: 1.22,
    strideAmp: 0.59,
    bounceAmp: 0.044,
    pelvisSway: 0.024,
    pelvisRoll: 0.048,
    shoulderSquare: -0.135,
    headScanMode: 'crew_check',
    idleWeightShift: 0.86,
    idleFidget: 'restless_weight',
    drawBlendRate: 9.4,
    twoHandFire: true,
    stanceYaw: 0.22,
    combatLean: 0.165,
    cantRad: -0.14,
    recoilScale: 1.28,
    recoilShoulderAbsorb: 0.24,
    moveFireAllowed: true,
    coverStepBetweenBursts: false,
    coverStepAmp: 0,
    reloadStyle: 'frantic_fumble',
  },
};

export function getArchetypeForClass(
  enemyClass: EnemyWeaponClass | string = 'gang',
  civClass?: string
): ArchetypeStyleId {
  if (enemyClass === 'police' || enemyClass === 'guard' || enemyClass === 'soldier') {
    return 'police';
  }
  if (
    enemyClass === 'enforcer' ||
    enemyClass === 'mob_enforcer' ||
    enemyClass === 'mob_boss' ||
    enemyClass === 'heavy'
  ) {
    return 'mob';
  }
  if (enemyClass === 'sleuth' || enemyClass === 'undercover' || civClass === 'sleuth') {
    return 'undercover';
  }
  return 'gang';
}

// =========================================================================
// POOL STATE & PRELOADER
// =========================================================================

let _manifestEntries: MakeHumanBodyEntry[] = [];
const _templateCache = new Map<string, MpfbTemplate>();
let _preloadPromise: Promise<MakeHumanBodyEntry[]> | null = null;
let _poolReady = false;

export function isMakeHumanPoolReady(): boolean {
  return _poolReady && _templateCache.size > 0;
}

export function getAvailableMakeHumanBodies(): readonly MakeHumanBodyEntry[] {
  return _manifestEntries;
}

function computeBodyWeight(e: Omit<MakeHumanBodyEntry, 'eyeHeightM' | 'weight'>): number {
  let w = 1.0;
  if (e.ageBand === 'adult' || e.ageBand === 'middle-aged') w *= 1.35;
  if (e.ageBand === 'elder') w *= 0.55;
  if (e.gender === 'male') w *= 1.15;
  return w;
}

export function pickMakeHumanBody(
  seedOrIdx: number,
  options?: {
    bodyId?: string;
    preferGender?: 'male' | 'female' | 'androgynous';
    preferSturdy?: boolean;
  }
): MakeHumanBodyEntry | null {
  if (_manifestEntries.length === 0) return null;
  if (options?.bodyId) {
    const exact = _manifestEntries.find((e) => e.bodyId === options.bodyId && _templateCache.has(e.bodyId));
    if (exact) return exact;
  }

  let candidates = _manifestEntries.filter((e) => _templateCache.has(e.bodyId));
  if (options?.preferGender) {
    const sub = candidates.filter((e) => e.gender === options.preferGender);
    if (sub.length > 0) candidates = sub;
  }
  if (options?.preferSturdy) {
    const sturdy = candidates.filter(
      (e) =>
        e.build.includes('sturdy') ||
        e.build.includes('heavy') ||
        e.build.includes('muscular') ||
        e.build.includes('thick') ||
        e.build.includes('broad')
    );
    if (sturdy.length > 0) candidates = sturdy;
  }
  if (candidates.length === 0) candidates = _manifestEntries;

  // Deterministic manifest-weighted selection from seed/index
  let totalW = 0;
  for (let i = 0; i < candidates.length; i++) totalW += candidates[i].weight;
  const hash = Math.abs(Math.imul(seedOrIdx + 17, 2654435761) >>> 0) / 4294967296;
  let target = hash * totalW;
  for (let i = 0; i < candidates.length; i++) {
    target -= candidates[i].weight;
    if (target <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function bakeMorphTargetsIntoGeometry(mesh: THREE.SkinnedMesh): void {
  const geo = mesh.geometry;
  const influences = mesh.morphTargetInfluences;
  const posMorphs = geo.morphAttributes?.position;
  if (!influences || !posMorphs || posMorphs.length === 0) return;

  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const posArr = posAttr.array as Float32Array;
  const normAttr = geo.attributes.normal as THREE.BufferAttribute | undefined;
  const normMorphs = geo.morphAttributes?.normal;
  const isRel = geo.morphTargetsRelative !== false;

  if (!isRel) {
    // Non-relative blend shapes
    const baseCopy = new Float32Array(posArr);
    let wSum = 0;
    for (let k = 0; k < posMorphs.length; k++) wSum += influences[k] || 0;
    const baseW = Math.max(0, 1 - wSum);
    for (let i = 0; i < posArr.length; i++) posArr[i] = baseCopy[i] * baseW;
    for (let k = 0; k < posMorphs.length; k++) {
      const w = influences[k] || 0;
      if (Math.abs(w) < 1e-5) continue;
      const dArr = posMorphs[k].array as Float32Array;
      for (let i = 0; i < posArr.length; i++) posArr[i] += dArr[i] * w;
    }
  } else {
    for (let k = 0; k < posMorphs.length; k++) {
      const w = influences[k] || 0;
      if (Math.abs(w) < 1e-5) continue;
      const dArr = posMorphs[k].array as Float32Array;
      for (let i = 0; i < posArr.length; i++) posArr[i] += dArr[i] * w;
    }
  }
  posAttr.needsUpdate = true;

  if (normAttr && normMorphs && normMorphs.length > 0 && isRel) {
    const nArr = normAttr.array as Float32Array;
    for (let k = 0; k < normMorphs.length; k++) {
      const w = influences[k] || 0;
      if (Math.abs(w) < 1e-5) continue;
      const dArr = normMorphs[k].array as Float32Array;
      for (let i = 0; i < nArr.length; i++) nArr[i] += dArr[i] * w;
    }
    normAttr.needsUpdate = true;
  }

  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  geo.morphAttributes = {};
  mesh.morphTargetInfluences = [];
  mesh.morphTargetDictionary = {};
}

function measureBodyFromTemplate(
  scene: THREE.Group,
  entry: MakeHumanBodyEntry,
  skinMesh: THREE.SkinnedMesh
): {
  jointIndices: Record<string, number>;
  bonePositions: Record<string, THREE.Vector3>;
  measurements: MpfbBodyMeasurements;
} {
  scene.updateMatrixWorld(true);
  const jointIndices: Record<string, number> = {};
  const bonePositions: Record<string, THREE.Vector3> = {};
  const skel = skinMesh.skeleton;
  const aliasDottedKey = (n: string): string =>
    n.length > 1 && (n.endsWith('L') || n.endsWith('R')) && n[n.length - 2] !== '.'
      ? `${n.slice(0, -1)}.${n.slice(-1)}`
      : n;

  for (let i = 0; i < skel.bones.length; i++) {
    const b = skel.bones[i];
    if (b.name) {
      const p = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
      jointIndices[b.name] = i;
      bonePositions[b.name] = p;
      const dotted = aliasDottedKey(b.name);
      if (dotted !== b.name) {
        jointIndices[dotted] = i;
        bonePositions[dotted] = p;
      }
    }
  }
  // Also record helper nodes like eye.L/eye.R (or eyeL/eyeR) if not in skin joints
  scene.traverse((obj) => {
    if (obj.name && !bonePositions[obj.name]) {
      const p = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
      bonePositions[obj.name] = p;
      const dotted = aliasDottedKey(obj.name);
      if (dotted !== obj.name && !bonePositions[dotted]) {
        bonePositions[dotted] = p;
      }
    }
  });

  const getP = (n: string, fb: [number, number, number]): THREE.Vector3 =>
    bonePositions[n] ?? bonePositions[n.replace(/\.(L|R)$/, '$1')] ?? new THREE.Vector3(...fb);

  const rootP = getP('root', [0, 0.9, 0]);
  const spine05 = getP('spine05', [0, 0.92, 0]);
  const spine03 = getP('spine03', [0, 1.1, 0]);
  const spine01 = getP('spine01', [0, 1.3, 0]);
  const headP = getP('head', [0, 1.54, 0.04]);
  const eyeLP = getP('eye.L', [0.03, entry.heightM * 0.92, 0.13]);
  const shL = getP('upperarm01.L', [0.17, 1.38, 0.02]);
  const elbL = getP('lowerarm01.L', [0.33, 1.18, 0.02]);
  const wrL = getP('wrist.L', [0.46, 1.04, 0.18]);
  const hipL = getP('upperleg01.L', [0.1, 0.9, 0]);
  const kneeL = getP('lowerleg01.L', [0.14, 0.48, 0.03]);
  const footL = getP('foot.L', [0.18, 0.07, 0.02]);

  // Measure actual torso/waist/hip cross-section radii from the morphed skin mesh vertices!
  const posAttr = skinMesh.geometry.attributes.position as THREE.BufferAttribute;
  let chestRx = 0.175;
  let chestRz = 0.125;
  let waistRx = 0.15;
  let waistRz = 0.115;
  let hipRx = 0.175;
  let hipRz = 0.125;
  let maxVertY = entry.heightM;

  if (posAttr) {
    let cMaxX = 0, cMaxZ = 0, cMinZ = 0;
    let wMaxX = 0, wMaxZ = 0, wMinZ = 0;
    let hMaxX = 0, hMaxZ = 0, hMinZ = 0;
    let topY = 0;
    const armCutX = Math.max(0.14, Math.abs(shL.x) * 0.96);

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      if (vy > topY) topY = vy;
      const ax = Math.abs(vx);
      if (ax > armCutX) continue;
      if (Math.abs(vy - spine01.y) < 0.055) {
        if (ax > cMaxX) cMaxX = ax;
        if (vz > cMaxZ) cMaxZ = vz;
        if (vz < cMinZ) cMinZ = vz;
      } else if (Math.abs(vy - spine03.y) < 0.045) {
        if (ax > wMaxX) wMaxX = ax;
        if (vz > wMaxZ) wMaxZ = vz;
        if (vz < wMinZ) wMinZ = vz;
      } else if (Math.abs(vy - spine05.y) < 0.045) {
        if (ax > hMaxX) hMaxX = ax;
        if (vz > hMaxZ) hMaxZ = vz;
        if (vz < hMinZ) hMinZ = vz;
      }
    }
    if (cMaxX > 0.1) {
      chestRx = Math.max(0.145, cMaxX);
      chestRz = Math.max(0.105, (cMaxZ - cMinZ) * 0.52);
    }
    if (wMaxX > 0.09) {
      waistRx = Math.max(0.125, wMaxX);
      waistRz = Math.max(0.095, (wMaxZ - wMinZ) * 0.52);
    }
    if (hMaxX > 0.1) {
      hipRx = Math.max(0.145, hMaxX);
      hipRz = Math.max(0.105, (hMaxZ - hMinZ) * 0.52);
    }
    if (topY > 1.3) maxVertY = topY;
  }

  return {
    jointIndices,
    bonePositions,
    measurements: {
      pelvisY: rootP.y,
      chestY: spine01.y,
      headY: headP.y,
      eyeY: eyeLP.y,
      crownY: maxVertY,
      shoulderHalfW: Math.abs(shL.x),
      hipHalfW: Math.abs(hipL.x),
      armL1: shL.distanceTo(elbL),
      armL2: elbL.distanceTo(wrL),
      legL1: hipL.distanceTo(kneeL),
      legL2: kneeL.distanceTo(footL),
      palmOffsetL: new THREE.Vector3(0, 0.064, 0),
      palmOffsetR: new THREE.Vector3(0, 0.064, 0),
      chestRx,
      chestRz,
      waistRx,
      waistRz,
      hipRx,
      hipRz,
    },
  };
}

export async function preloadMakeHumanPool(
  onProgress?: (loaded: number, total: number) => void
): Promise<MakeHumanBodyEntry[]> {
  if (_preloadPromise) return _preloadPromise;

  _preloadPromise = (async () => {
    const resp = await fetch('/models/makehuman/body-pool-manifest.json');
    if (!resp.ok) {
      throw new Error(`Failed to fetch MakeHuman manifest: ${resp.status}`);
    }
    const rawList = (await resp.json()) as Array<Omit<MakeHumanBodyEntry, 'eyeHeightM' | 'weight'>>;
    const available = rawList.filter((e) => !MISSING_GLB_FILES.has(e.file));

    const loader = new GLTFLoader();
    const entries: MakeHumanBodyEntry[] = [];
    let completed = 0;
    const total = available.length;

    const loadOne = async (raw: Omit<MakeHumanBodyEntry, 'eyeHeightM' | 'weight'>) => {
      try {
        const gltf = await loader.loadAsync(`/models/makehuman/${raw.file}`);
        const scene = gltf.scene as THREE.Group;
        let skinMesh: THREE.SkinnedMesh | null = null;
        scene.traverse((obj) => {
          const sm = obj as THREE.SkinnedMesh;
          if (sm.isSkinnedMesh && !skinMesh) skinMesh = sm;
        });
        if (!skinMesh) return;

        bakeMorphTargetsIntoGeometry(skinMesh);

        const entry: MakeHumanBodyEntry = {
          ...raw,
          eyeHeightM: raw.heightM * 0.92,
          weight: computeBodyWeight(raw),
        };
        const { jointIndices, bonePositions, measurements } = measureBodyFromTemplate(
          scene,
          entry,
          skinMesh
        );
        entry.eyeHeightM = measurements.eyeY > 1.0 ? measurements.eyeY : raw.heightM * 0.92;

        const baseMat = new THREE.MeshPhysicalMaterial({
          color: raw.skinHex,
          roughness: 0.56,
          metalness: 0.0,
          clearcoat: 0.08,
          clearcoatRoughness: 0.62,
          sheen: 0.32,
          sheenColor: new THREE.Color('#ffd8c4'),
          sheenRoughness: 0.72,
          side: THREE.DoubleSide,
        });

        _templateCache.set(entry.bodyId, {
          entry,
          scene,
          skinMatBase: baseMat,
          jointIndices,
          bonePositions,
          measurements,
          garmentGeoCache: new Map(),
        });
        entries.push(entry);
      } catch (err) {
        console.warn(`[MakeHumanPool] Skipped ${raw.file}:`, err);
      } finally {
        completed++;
        onProgress?.(completed, total);
      }
    };

    // Load in batches of 8 concurrent fetches so page starts crisp and fast
    const BATCH = 8;
    for (let i = 0; i < available.length; i += BATCH) {
      await Promise.all(available.slice(i, i + BATCH).map(loadOne));
    }

    entries.sort((a, b) => a.bodyId.localeCompare(b.bodyId));
    _manifestEntries = entries;
    _poolReady = entries.length > 0;
    return _manifestEntries;
  })();

  return _preloadPromise;
}

// =========================================================================
// MPFB-SKINNED GARMENT GENERATOR (ZERO CLAY MEN — FITTED TO LIVE BONES)
// =========================================================================

interface SkinnedTubeRing {
  center: THREE.Vector3;
  rx: number;
  rz: number;
  wind: number;
  boneA: number;
  boneB: number;
  wA: number;
  wB: number;
  basisFwd?: THREE.Vector3;
  foldAmp?: number;
}

function appendSkinnedTube(
  outPos: number[],
  outUv: number[],
  outWind: number[],
  outSkinIdx: number[],
  outSkinWt: number[],
  outIndices: number[],
  rings: SkinnedTubeRing[],
  radialSegs = 16
): void {
  const baseVtx = outPos.length / 3;
  const _tan = new THREE.Vector3();
  const _nrm = new THREE.Vector3();
  const _bin = new THREE.Vector3();
  const _fwd = new THREE.Vector3(0, 0, 1);

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const v = r / Math.max(1, rings.length - 1);
    if (r === 0) {
      _tan.copy(rings[1].center).sub(ring.center).normalize();
    } else if (r === rings.length - 1) {
      _tan.copy(ring.center).sub(rings[r - 1].center).normalize();
    } else {
      _tan.copy(rings[r + 1].center).sub(rings[r - 1].center).normalize();
    }
    if (_tan.lengthSq() < 1e-6) _tan.set(0, 1, 0);

    const fRef = ring.basisFwd ?? _fwd;
    _bin.crossVectors(_tan, fRef);
    if (_bin.lengthSq() < 1e-5) {
      _bin.set(1, 0, 0);
    } else {
      _bin.normalize();
    }
    _nrm.crossVectors(_bin, _tan).normalize(); // roughly forward +Z

    const foldAmp = ring.foldAmp ?? 0.03;

    for (let s = 0; s <= radialSegs; s++) {
      const u = s / radialSegs;
      const theta = (u - 0.5) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const fold = 1.0 + Math.sin(theta * 5 + v * 4.2) * foldAmp;
      const lx = sinT * ring.rx * fold;
      const lz = cosT * ring.rz * fold;

      outPos.push(
        ring.center.x + _bin.x * lx + _nrm.x * lz,
        ring.center.y + _bin.y * lx + _nrm.y * lz,
        ring.center.z + _bin.z * lx + _nrm.z * lz
      );
      outUv.push(u, 1 - v);
      outWind.push(ring.wind);
      outSkinIdx.push(ring.boneA, ring.boneB, 0, 0);
      outSkinWt.push(ring.wA, ring.wB, 0, 0);
    }
  }

  const stride = radialSegs + 1;
  for (let r = 0; r < rings.length - 1; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = baseVtx + r * stride + s;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      outIndices.push(a, b, d, a, d, c);
    }
  }
}

function finalizeSkinnedGeo(
  pos: number[],
  uv: number[],
  wind: number[],
  skinIdx: number[],
  skinWt: number[],
  indices: number[]
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aClothWind', new THREE.Float32BufferAttribute(wind, 1));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIdx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWt, 4));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function getOrBuildMpfbGarments(
  tpl: MpfbTemplate,
  outfit: OutfitStyleType
): { jacket: THREE.BufferGeometry; trousers: THREE.BufferGeometry } {
  const cached = tpl.garmentGeoCache.get(outfit);
  if (cached) return cached;

  const j = tpl.jointIndices;
  const bp = tpl.bonePositions;
  const m = tpl.measurements;

  const bPelvis = j['spine05'] ?? j['root'] ?? 0;
  const bSpine = j['spine03'] ?? bPelvis;
  const bChest = j['spine01'] ?? bSpine;
  const bNeck = j['neck01'] ?? bChest;
  const bShL = j['upperarm01.L'] ?? bChest;
  const bElbL = j['lowerarm01.L'] ?? bShL;
  const bWrL = j['wrist.L'] ?? bElbL;
  const bShR = j['upperarm01.R'] ?? bChest;
  const bElbR = j['lowerarm01.R'] ?? bShR;
  const bWrR = j['wrist.R'] ?? bElbR;
  const bHipL = j['upperleg01.L'] ?? bPelvis;
  const bKneeL = j['lowerleg01.L'] ?? bHipL;
  const bFootL = j['foot.L'] ?? bKneeL;
  const bHipR = j['upperleg01.R'] ?? bPelvis;
  const bKneeR = j['lowerleg01.R'] ?? bHipR;
  const bFootR = j['foot.R'] ?? bKneeR;

  const pPelvis = bp['spine05'] ?? bp['root'] ?? new THREE.Vector3(0, 0.9, 0);
  const pWaist = bp['spine03'] ?? new THREE.Vector3(0, 1.08, 0);
  const pChest = bp['spine01'] ?? new THREE.Vector3(0, 1.3, 0);
  const pNeck = bp['neck01'] ?? new THREE.Vector3(0, 1.48, 0);
  const pShL = bp['upperarm01.L']!;
  const pElbL = bp['lowerarm01.L']!;
  const pWrL = bp['wrist.L']!;
  const pShR = bp['upperarm01.R']!;
  const pElbR = bp['lowerarm01.R']!;
  const pWrR = bp['wrist.R']!;
  const pHipL = bp['upperleg01.L']!;
  const pKneeL = bp['lowerleg01.L']!;
  const pFootL = bp['foot.L']!;
  const pHipR = bp['upperleg01.R']!;
  const pKneeR = bp['lowerleg01.R']!;
  const pFootR = bp['foot.R']!;

  const isLongCoat =
    outfit === 'trench_coat' || outfit === 'gang_2059' || outfit === 'tailored_blazer';
  const isPuffer = outfit === 'puffer_jacket';
  const ease = isPuffer ? 0.032 : outfit === 'leather_biker' ? 0.018 : 0.024;
  const hemDrop = isLongCoat ? -0.26 : outfit === 'hoodie_parka' ? -0.14 : -0.08;

  // 1. CONTINUOUS JACKET + COAT HEM + DRAPED SLEEVES
  const jPos: number[] = [];
  const jUv: number[] = [];
  const jWind: number[] = [];
  const jSkinI: number[] = [];
  const jSkinW: number[] = [];
  const jIdx: number[] = [];

  const coatRings: SkinnedTubeRing[] = [
    {
      center: new THREE.Vector3(0, pPelvis.y + hemDrop, pPelvis.z - 0.008),
      rx: m.hipRx + ease + (isLongCoat ? 0.045 : 0.015),
      rz: m.hipRz + ease + (isLongCoat ? 0.038 : 0.015),
      wind: isLongCoat ? 0.95 : 0.45,
      boneA: bPelvis,
      boneB: bHipL,
      wA: 0.72,
      wB: 0.28,
      foldAmp: isLongCoat ? 0.075 : 0.03,
    },
    {
      center: new THREE.Vector3(0, pPelvis.y - 0.02, pPelvis.z),
      rx: m.hipRx + ease + 0.012,
      rz: m.hipRz + ease + 0.012,
      wind: 0.35,
      boneA: bPelvis,
      boneB: bSpine,
      wA: 0.85,
      wB: 0.15,
      foldAmp: 0.04,
    },
    {
      center: new THREE.Vector3(0, pWaist.y, pWaist.z),
      rx: m.waistRx + ease + (isPuffer ? 0.018 : 0.006),
      rz: m.waistRz + ease + (isPuffer ? 0.018 : 0.006),
      wind: 0.14,
      boneA: bSpine,
      boneB: bChest,
      wA: 0.75,
      wB: 0.25,
      foldAmp: isPuffer ? 0.055 : 0.025,
    },
    {
      center: new THREE.Vector3(0, THREE.MathUtils.lerp(pWaist.y, pChest.y, 0.55), THREE.MathUtils.lerp(pWaist.z, pChest.z, 0.55)),
      rx: THREE.MathUtils.lerp(m.waistRx, m.chestRx, 0.65) + ease + 0.01,
      rz: THREE.MathUtils.lerp(m.waistRz, m.chestRz, 0.65) + ease + 0.01,
      wind: 0.06,
      boneA: bChest,
      boneB: bSpine,
      wA: 0.72,
      wB: 0.28,
      foldAmp: 0.025,
    },
    {
      center: new THREE.Vector3(0, pChest.y + 0.04, pChest.z + 0.01),
      rx: m.chestRx + ease + 0.016,
      rz: m.chestRz + ease + 0.012,
      wind: 0.02,
      boneA: bChest,
      boneB: bSpine,
      wA: 0.92,
      wB: 0.08,
      foldAmp: 0.02,
    },
    {
      center: new THREE.Vector3(0, pNeck.y - 0.025, pNeck.z + 0.004),
      rx: Math.min(m.chestRx * 0.64, 0.125),
      rz: Math.min(m.chestRz * 0.78, 0.105),
      wind: 0.01,
      boneA: bChest,
      boneB: bNeck,
      wA: 0.78,
      wB: 0.22,
      foldAmp: 0.01,
    },
  ];
  appendSkinnedTube(jPos, jUv, jWind, jSkinI, jSkinW, jIdx, coatRings, 22);

  // Left & Right sleeves ending ~3cm before wrist so real sculpted MakeHuman hands emerge cleanly!
  const sleeveR = isPuffer ? 0.072 : 0.060;
  const addSleeve = (
    pSh: THREE.Vector3,
    pElb: THREE.Vector3,
    pWr: THREE.Vector3,
    bSh: number,
    bElb: number,
    bWr: number
  ) => {
    const shIn = pSh.clone().lerp(pChest, 0.18);
    const shMid = pSh.clone().lerp(pElb, 0.45);
    const elbMid = pElb.clone().lerp(pWr, 0.45);
    const cuff = pElb.clone().lerp(pWr, 0.89);
    const fwdArm = new THREE.Vector3(0, 0, 1);
    appendSkinnedTube(
      jPos,
      jUv,
      jWind,
      jSkinI,
      jSkinW,
      jIdx,
      [
        { center: shIn, rx: sleeveR * 1.18, rz: sleeveR * 1.18, wind: 0.04, boneA: bChest, boneB: bSh, wA: 0.55, wB: 0.45, basisFwd: fwdArm },
        { center: pSh, rx: sleeveR * 1.08, rz: sleeveR * 1.08, wind: 0.06, boneA: bSh, boneB: bChest, wA: 0.85, wB: 0.15, basisFwd: fwdArm },
        { center: shMid, rx: sleeveR * 0.96, rz: sleeveR * 0.96, wind: 0.10, boneA: bSh, boneB: bElb, wA: 0.88, wB: 0.12, basisFwd: fwdArm },
        { center: pElb, rx: sleeveR * 0.88, rz: sleeveR * 0.88, wind: 0.12, boneA: bElb, boneB: bSh, wA: 0.65, wB: 0.35, basisFwd: fwdArm },
        { center: elbMid, rx: sleeveR * 0.80, rz: sleeveR * 0.80, wind: 0.14, boneA: bElb, boneB: bWr, wA: 0.90, wB: 0.10, basisFwd: fwdArm },
        { center: cuff, rx: sleeveR * 0.72, rz: sleeveR * 0.72, wind: 0.16, boneA: bElb, boneB: bWr, wA: 0.72, wB: 0.28, basisFwd: fwdArm },
      ],
      14
    );
  };
  addSleeve(pShL, pElbL, pWrL, bShL, bElbL, bWrL);
  addSleeve(pShR, pElbR, pWrR, bShR, bElbR, bWrR);

  const jacket = finalizeSkinnedGeo(jPos, jUv, jWind, jSkinI, jSkinW, jIdx);

  // 2. CONTINUOUS TROUSERS (Pelvis + Left/Right Thigh -> Calf -> Ankle cuff)
  const pPos: number[] = [];
  const pUv: number[] = [];
  const pWind: number[] = [];
  const pSkinI: number[] = [];
  const pSkinW: number[] = [];
  const pIdx: number[] = [];

  appendSkinnedTube(
    pPos,
    pUv,
    pWind,
    pSkinI,
    pSkinW,
    pIdx,
    [
      { center: new THREE.Vector3(0, pPelvis.y - 0.05, pPelvis.z), rx: m.hipRx + 0.018, rz: m.hipRz + 0.018, wind: 0.04, boneA: bPelvis, boneB: bSpine, wA: 0.9, wB: 0.1, foldAmp: 0.02 },
      { center: new THREE.Vector3(0, pWaist.y - 0.01, pWaist.z), rx: m.waistRx + 0.016, rz: m.waistRz + 0.016, wind: 0.02, boneA: bPelvis, boneB: bSpine, wA: 0.6, wB: 0.4, foldAmp: 0.02 },
    ],
    18
  );

  const addTrouserLeg = (
    pHip: THREE.Vector3,
    pKnee: THREE.Vector3,
    pFoot: THREE.Vector3,
    bHip: number,
    bKnee: number
  ) => {
    const topHip = pHip.clone().add(new THREE.Vector3(0, 0.05, 0));
    const midThigh = pHip.clone().lerp(pKnee, 0.5);
    const midShin = pKnee.clone().lerp(pFoot, 0.52);
    const cuff = pKnee.clone().lerp(pFoot, 0.94);
    const legR = 0.092 * (m.hipRx / 0.175);
    appendSkinnedTube(
      pPos,
      pUv,
      pWind,
      pSkinI,
      pSkinW,
      pIdx,
      [
        { center: topHip, rx: legR * 1.12, rz: legR * 1.14, wind: 0.04, boneA: bPelvis, boneB: bHip, wA: 0.45, wB: 0.55, foldAmp: 0.02 },
        { center: pHip, rx: legR * 1.06, rz: legR * 1.08, wind: 0.06, boneA: bHip, boneB: bPelvis, wA: 0.85, wB: 0.15, foldAmp: 0.02 },
        { center: midThigh, rx: legR * 0.96, rz: legR * 0.96, wind: 0.08, boneA: bHip, boneB: bKnee, wA: 0.92, wB: 0.08, foldAmp: 0.025 },
        { center: pKnee, rx: legR * 0.82, rz: legR * 0.82, wind: 0.12, boneA: bKnee, boneB: bHip, wA: 0.6, wB: 0.4, foldAmp: 0.025 },
        { center: midShin, rx: legR * 0.76, rz: legR * 0.76, wind: 0.18, boneA: bKnee, boneB: bHip, wA: 0.95, wB: 0.05, foldAmp: 0.03 },
        { center: cuff, rx: legR * 0.72, rz: legR * 0.72, wind: 0.24, boneA: bKnee, boneB: bHip, wA: 0.98, wB: 0.02, foldAmp: 0.035 },
      ],
      14
    );
  };
  addTrouserLeg(pHipL, pKneeL, pFootL, bHipL, bKneeL);
  addTrouserLeg(pHipR, pKneeR, pFootR, bHipR, bKneeR);

  const trousers = finalizeSkinnedGeo(pPos, pUv, pWind, pSkinI, pSkinW, pIdx);
  const res = { jacket, trousers };
  tpl.garmentGeoCache.set(outfit, res);
  return res;
}

// =========================================================================
// MPFB BONE ADAPTER MATH (ZERO PER-FRAME ALLOCATIONS)
// =========================================================================

const _mQ1 = new THREE.Quaternion();
const _mQ2 = new THREE.Quaternion();
const _mQ3 = new THREE.Quaternion();
const _mQ4 = new THREE.Quaternion();
const _mQ5 = new THREE.Quaternion();
const _mQ6 = new THREE.Quaternion();
const _mQ7 = new THREE.Quaternion();
const _mQ8 = new THREE.Quaternion();
const _mQ9 = new THREE.Quaternion();
const _mQ10 = new THREE.Quaternion();
const _mQ11 = new THREE.Quaternion();
const _mQ12 = new THREE.Quaternion();
const _mV1 = new THREE.Vector3();
const _mV2 = new THREE.Vector3();
const _mV3 = new THREE.Vector3();
const _mV4 = new THREE.Vector3();
const _mV5 = new THREE.Vector3();
const _mV6 = new THREE.Vector3();
const _mV7 = new THREE.Vector3();
const _mV8 = new THREE.Vector3();
const _mV9 = new THREE.Vector3();
const _mV10 = new THREE.Vector3();
const _mMat1 = new THREE.Matrix4();
const _mMat2 = new THREE.Matrix4();
const _mEuler = new THREE.Euler(0, 0, 0, 'XYZ');

function applyMpfbJointDelta(rec: MpfbBoneRecord, deltaInCharFrame: THREE.Quaternion): void {
  // L_new = L_rest * (W_rest^-1 * deltaInCharFrame * W_rest)
  _mQ1.copy(rec.restWorldQuatInv).multiply(deltaInCharFrame).multiply(rec.restWorldQuat);
  rec.bone.quaternion.copy(rec.restLocalQuat).multiply(_mQ1);
}

function applyMpfbJointEuler(rec: MpfbBoneRecord, rx: number, ry: number, rz: number): void {
  _mEuler.set(rx, ry, rz, 'XYZ');
  _mQ2.setFromEuler(_mEuler);
  applyMpfbJointDelta(rec, _mQ2);
}

function solveMpfbArmIK(
  rig: HumanRig,
  sideSign: -1 | 1,
  wristTargetInRoot: THREE.Vector3,
  desiredHandWorldQ: THREE.Quaternion | null,
  poleHintInRoot: THREE.Vector3,
  weight: number
): void {
  const ad = rig.mpfb;
  if (!ad || weight <= 0.002) return;

  const upperRec = sideSign < 0 ? ad.upperArmR : ad.upperArmL;
  const lowerRec = sideSign < 0 ? ad.lowerArmR : ad.lowerArmL;
  const wristRec = sideSign < 0 ? ad.wristR : ad.wristL;
  const restUpperDir = sideSign < 0 ? ad.restUpperArmDirR : ad.restUpperArmDirL;
  const restForeDir = sideSign < 0 ? ad.restForearmDirR : ad.restForearmDirL;
  const restHinge = sideSign < 0 ? ad.restHingeR : ad.restHingeL;
  const shoulderOffChest = sideSign < 0 ? ad.shoulderOffInChestR : ad.shoulderOffInChestL;

  // Save current posed arm rotations in case weight < 1 (zero allocations)
  const needBlend = weight < 0.998;
  if (needBlend) {
    _mQ3.copy(upperRec.bone.quaternion);
    _mQ4.copy(lowerRec.bone.quaternion);
    _mQ5.copy(wristRec.bone.quaternion);
  }

  // Analytical chest transform in rig.root space (pelvis * spine * chest)
  _mQ6.setFromEuler(rig.pelvis.rotation);
  _mQ7.setFromEuler(rig.spine.rotation);
  _mQ8.setFromEuler(rig.chest.rotation);
  _mQ9.copy(_mQ6).multiply(_mQ7).multiply(_mQ8); // qTorso

  const pelvShiftY = rig.pelvis.position.y - rig.standingPelvisY;
  _mV1.set(
    rig.pelvis.position.x,
    ad.spine01.restWorldPos.y + pelvShiftY,
    rig.pelvis.position.z
  );

  // Exact world shoulder pivot in rig.root space
  _mV2.copy(shoulderOffChest).applyQuaternion(_mQ9).add(_mV1);

  // 2-bone IK triangle in rig.root space
  const L1 = ad.measurements.armL1;
  const L2 = ad.measurements.armL2;
  _mV3.copy(wristTargetInRoot).sub(_mV2);
  const rawDist = _mV3.length();
  const minDist = Math.abs(L1 - L2) + 0.035;
  const maxDist = L1 + L2 - 0.008;
  const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist < 1e-4) {
    _mV3.set(0, 0, 1);
  } else {
    _mV3.multiplyScalar(1 / rawDist);
  }

  const cosA = THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));

  // Elbow bend plane orthogonal to dir, leaning toward poleHintInRoot
  _mV4.copy(poleHintInRoot).addScaledVector(_mV3, -poleHintInRoot.dot(_mV3));
  if (_mV4.lengthSq() < 1e-5) {
    _mV4.set(sideSign * 0.6, -0.7, -0.2).normalize();
  } else {
    _mV4.normalize();
  }

  _mV5.copy(_mV3).multiplyScalar(L1 * cosA).addScaledVector(_mV4, L1 * sinA); // elbowPos
  _mV6.copy(_mV5).normalize(); // targetDir1
  _mV7.copy(_mV3).multiplyScalar(dist).sub(_mV5).normalize(); // targetDir2
  _mV8.crossVectors(_mV6, _mV7); // targetHinge
  if (_mV8.lengthSq() < 1e-6) {
    _mV8.crossVectors(_mV6, _mV4).normalize();
  } else {
    _mV8.normalize();
  }

  // Orthonormal basis mapping: rest frame -> target frame
  _mV9.crossVectors(restUpperDir, restHinge).normalize(); // restBin
  _mV10.crossVectors(_mV6, _mV8).normalize(); // tgtBin
  _mMat1.makeBasis(restUpperDir, restHinge, _mV9).transpose();
  _mMat2.makeBasis(_mV6, _mV8, _mV10).multiply(_mMat1);
  _mQ10.setFromRotationMatrix(_mMat2); // dUpperWorld

  // Upperarm world delta relative to parent chest/torso rotation
  _mQ11.copy(_mQ9).invert().multiply(_mQ10); // dUpperRelChest
  applyMpfbJointDelta(upperRec, _mQ11);

  // Forearm rotation in hinge plane to match targetDir2
  _mV9.copy(restForeDir).applyQuaternion(_mQ10).normalize(); // curForeDir
  _mQ11.setFromUnitVectors(_mV9, _mV7); // dForeStep
  _mQ12.copy(_mQ11).multiply(_mQ10); // dForeWorld
  _mQ11.copy(_mQ10).invert().multiply(_mQ12); // dForeRelUpper
  applyMpfbJointDelta(lowerRec, _mQ11);

  if (desiredHandWorldQ) {
    // dWristRelFore = dForeWorld^-1 * desiredHandWorldQ * W_wrist_rest^-1
    _mQ11.copy(_mQ12).invert().multiply(desiredHandWorldQ).multiply(wristRec.restWorldQuatInv);
    applyMpfbJointDelta(wristRec, _mQ11);
    if (needBlend) {
      _mQ5.slerp(wristRec.bone.quaternion, weight);
      wristRec.bone.quaternion.copy(_mQ5);
    }
  }

  if (needBlend) {
    _mQ3.slerp(upperRec.bone.quaternion, weight);
    upperRec.bone.quaternion.copy(_mQ3);
    _mQ4.slerp(lowerRec.bone.quaternion, weight);
    lowerRec.bone.quaternion.copy(_mQ4);
  }
}

export function setMpfbFingerGrip(bones: MpfbBoneRecord[], curl01: number): void {
  const c = THREE.MathUtils.clamp(curl01, 0, 1);
  for (let i = 0; i < bones.length; i++) {
    const b = bones[i];
    if (b.bone.name.startsWith('finger1-')) {
      // Thumb wraps gently across grip/handguard
      _mEuler.set(0.28 * c, -0.18 * c, 0.35 * c, 'XYZ');
    } else {
      _mEuler.set(0.95 * c, 0, 0, 'XYZ');
    }
    _mQ1.setFromEuler(_mEuler);
    b.bone.quaternion.copy(b.restLocalQuat).multiply(_mQ1);
  }
}

// =========================================================================
// CONSTANT RIGHT / LEFT HAND GRIP ORIENTATIONS IN WEAPON SPACE
// =========================================================================
// Gun space: +Z = barrel forward, +Y = top rail/sight up, -X = character right
// Right hand wrist axes: +X = back of hand (dorsal), +Y = wrist->knuckles, +Z = thumb side
const _handInGunMatR = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, -0.34, 0.94).normalize(),
  new THREE.Vector3(0, 0.94, 0.34).normalize()
);
export const MPFB_RHAND_IN_GUN_Q = new THREE.Quaternion().setFromRotationMatrix(_handInGunMatR);
export const MPFB_GUN_IN_RHAND_Q = MPFB_RHAND_IN_GUN_Q.clone().invert();

// Left hand cradling underside of handguard/pump:
// +X = palm normal (up+inward), +Y = knuckles wrapping under/right (-X), +Z = thumb forward (+Z)
const _handInGunMatL = new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0.28, 0.88, 0).normalize(),
  new THREE.Vector3(-0.88, 0.28, 0).normalize(),
  new THREE.Vector3(0, 0, 1)
);
export const MPFB_LHAND_IN_GUN_Q = new THREE.Quaternion().setFromRotationMatrix(_handInGunMatL);

// =========================================================================
// CREATE DRESSED MAKEHUMAN CITIZEN BEHIND HumanRig INTERFACE
// =========================================================================

const SKIN_COMPLEXION_VARIATIONS = ['#e8c3a8', '#d8ae92', '#c5977a', '#f0ceb8', '#9e6b48', '#b88360'];
const HAIR_PALETTE = ['#1d1916', '#38281e', '#5a412d', '#8c7150', '#6e3422', '#8a8b90', '#26201c'];
const CIVILIAN_JACKET_COLORS = [
  '#3e4f63',
  '#82664a',
  '#2f5448',
  '#7e313d',
  '#292b32',
  '#524e46',
  '#375476',
  '#6f4b64',
  '#905d3a',
  '#565f6c',
];
const PANTS_PALETTE = ['#242c38', '#323947', '#3d3832', '#263346', '#46413a', '#2c313c'];
const SHOE_PALETTE = ['#1e1b19', '#3f2c20', '#2a2e36', '#523a2c'];
const SCARF_PALETTE = ['#a0343e', '#387082', '#b98d46', '#587252', '#825c78', '#dcd2c4'];
const CIVILIAN_OUTFITS: OutfitStyleType[] = [
  'trench_coat',
  'puffer_jacket',
  'leather_biker',
  'hoodie_parka',
  'tailored_blazer',
  'cardigan_scarf',
];

export function buildMakeHumanCitizenRig(
  variantIdx: number,
  textures: TextureLibrary,
  geos: SharedHumanGeometries,
  applyClothWind: (mat: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial, u: { value: number }, tag: string) => void,
  applySkinSSS: (mat: THREE.MeshPhysicalMaterial, tag: string) => void,
  buildHairFn: (
    style: HairStyleType,
    outfit: OutfitStyleType,
    hairMat: THREE.Material,
    hatMat: THREE.Material
  ) => { group: THREE.Group; hairTailBone: THREE.Group | null },
  getEyeMatFn: (idx: number) => THREE.MeshPhysicalMaterial,
  forcedOutfit?: OutfitStyleType,
  forcedActivity?: CommuterActivityType,
  options?: {
    bodyId?: string;
    archetype?: ArchetypeStyleId;
  }
): HumanRig | null {
  if (!isMakeHumanPoolReady()) return null;

  const outfit: OutfitStyleType =
    forcedOutfit ??
    CIVILIAN_OUTFITS[(variantIdx * 5 + Math.floor(variantIdx / 3)) % CIVILIAN_OUTFITS.length];

  const isSecurityOrSoldier =
    outfit === 'transit_security' ||
    outfit === 'soviet_soldier' ||
    outfit === 'metro_worker' ||
    outfit === 'rail_engineer';

  const picked = pickMakeHumanBody(variantIdx + 101, {
    bodyId: options?.bodyId,
    preferGender: isSecurityOrSoldier ? 'male' : undefined,
    preferSturdy: outfit === 'soviet_soldier' || outfit === 'leather_biker',
  });
  if (!picked) return null;

  const tpl = _templateCache.get(picked.bodyId);
  if (!tpl) return null;

  // Clone MakeHuman scene cleanly with SkeletonUtils
  const cloned = SkeletonUtils.clone(tpl.scene) as THREE.Group;
  const root = new THREE.Group();
  root.name = `MakeHumanCitizen_${picked.bodyId}`;
  root.add(cloned);

  // Locate primary SkinnedMesh + bone records
  let skinMesh: THREE.SkinnedMesh | null = null;
  const boneByName = new Map<string, THREE.Bone>();
  cloned.traverse((obj) => {
    const sm = obj as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh && !skinMesh) skinMesh = sm;
    if ((obj as THREE.Bone).isBone && obj.name && !boneByName.has(obj.name)) {
      boneByName.set(obj.name, obj as THREE.Bone);
    }
  });
  if (!skinMesh || !skinMesh.skeleton) return null;
  const mpfbSkel = skinMesh.skeleton;

  // Update rest world matrices once to record exact rest bone transforms for THIS clone
  cloned.updateMatrixWorld(true);
  const findBone = (name: string): THREE.Bone | undefined =>
    boneByName.get(name) ??
    boneByName.get(name.replace(/\.(L|R)$/, '$1')) ??
    boneByName.get(name.replace(/\.(L|R)$/, '_$1'));

  const makeRec = (name: string): MpfbBoneRecord | null => {
    const b = findBone(name);
    if (!b) return null;
    const rwPos = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    const rwQuat = new THREE.Quaternion().setFromRotationMatrix(b.matrixWorld);
    return {
      bone: b,
      restLocalPos: b.position.clone(),
      restLocalQuat: b.quaternion.clone(),
      restWorldPos: rwPos,
      restWorldQuat: rwQuat,
      restWorldQuatInv: rwQuat.clone().invert(),
    };
  };

  const rRoot = makeRec('root');
  const rSp05 = makeRec('spine05') ?? rRoot;
  const rSp03 = makeRec('spine03') ?? rSp05;
  const rSp01 = makeRec('spine01') ?? rSp03;
  const rNeck = makeRec('neck01') ?? rSp01;
  const rHead = makeRec('head') ?? rNeck;
  const rUpL = makeRec('upperarm01.L');
  const rLoL = makeRec('lowerarm01.L');
  const rWrL = makeRec('wrist.L');
  const rUpR = makeRec('upperarm01.R');
  const rLoR = makeRec('lowerarm01.R');
  const rWrR = makeRec('wrist.R');
  const rLegUpL = makeRec('upperleg01.L');
  const rLegLoL = makeRec('lowerleg01.L');
  const rFootL = makeRec('foot.L');
  const rLegUpR = makeRec('upperleg01.R');
  const rLegLoR = makeRec('lowerleg01.R');
  const rFootR = makeRec('foot.R');

  if (
    !rRoot || !rSp05 || !rSp03 || !rSp01 || !rNeck || !rHead ||
    !rUpL || !rLoL || !rWrL || !rUpR || !rLoR || !rWrR ||
    !rLegUpL || !rLegLoL || !rFootL || !rLegUpR || !rLegLoR || !rFootR
  ) {
    return null;
  }

  // Collect finger bones for realistic relaxed / pistol-grip curling
  const collectFingers = (suffix: '.L' | '.R') => {
    const out: MpfbBoneRecord[] = [];
    for (let f = 1; f <= 5; f++) {
      for (let j = 1; j <= 3; j++) {
        const rec = makeRec(`finger${f}-${j}${suffix}`);
        if (rec) out.push(rec);
      }
    }
    return out;
  };
  const leftFingers = collectFingers('.L');
  const rightFingers = collectFingers('.R');

  // --- DRESSING STACK (faceId / outfitId / fabricId — ZERO CLAY BODIES!) ---
  const m = tpl.measurements;
  const isFemale = picked.gender === 'female';
  const build: HumanBuildType =
    picked.build.includes('heavy') || picked.build.includes('broad') || picked.build.includes('thick')
      ? 'stocky_heavy'
      : picked.build.includes('tall')
      ? 'tall_lean'
      : isFemale
      ? 'slender_female'
      : 'athletic_male';

  const faceId = `face_${picked.bodyId}_${variantIdx % 6}`;
  const skinColor = new THREE.Color(picked.skinHex).lerp(
    new THREE.Color(SKIN_COMPLEXION_VARIATIONS[variantIdx % SKIN_COMPLEXION_VARIATIONS.length]),
    0.16
  );

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: skinColor,
    roughness: 0.52,
    metalness: 0.0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.62,
    sheen: 0.34,
    sheenColor: new THREE.Color('#ffd8c4'),
    sheenRoughness: 0.72,
    side: THREE.DoubleSide,
  });
  applySkinSSS(skinMat, 'human-skin-sss-v1');
  skinMesh.material = skinMat;
  skinMesh.castShadow = true;
  skinMesh.receiveShadow = true;
  skinMesh.frustumCulled = false;

  const windUniform = { value: 0.35 };
  let jacketColor = CIVILIAN_JACKET_COLORS[(variantIdx * 7 + 1) % CIVILIAN_JACKET_COLORS.length];
  let pantsColor = PANTS_PALETTE[(variantIdx * 5 + 3) % PANTS_PALETTE.length];
  let hatColor = SCARF_PALETTE[(variantIdx * 11) % SCARF_PALETTE.length];
  const shoeColor = SHOE_PALETTE[(variantIdx * 3 + 2) % SHOE_PALETTE.length];
  const scarfColor = SCARF_PALETTE[(variantIdx * 13 + 2) % SCARF_PALETTE.length];
  const hairColor = HAIR_PALETTE[(variantIdx * 5 + 2) % HAIR_PALETTE.length];

  if (outfit === 'transit_security') {
    jacketColor = '#202b3a';
    pantsColor = '#161e29';
    hatColor = '#192230';
  } else if (outfit === 'soviet_soldier') {
    jacketColor = '#3c4934';
    pantsColor = '#2d3727';
    hatColor = '#384430';
  } else if (outfit === 'gang_2059') {
    jacketColor = variantIdx % 2 === 0 ? '#151820' : '#24171c';
    pantsColor = '#0f1218';
    hatColor = '#1c1f27';
  } else if (outfit === 'leather_biker') {
    jacketColor = variantIdx % 2 === 0 ? '#222429' : '#4a2b20';
    pantsColor = '#1a1c22';
  } else if (outfit === 'tailored_blazer') {
    jacketColor = variantIdx % 2 === 0 ? '#2c3543' : '#3d3430';
    pantsColor = '#1e222b';
  } else if (outfit === 'trench_coat') {
    jacketColor = variantIdx % 2 === 0 ? '#6e5840' : '#3a424d';
  }

  const isLeather = outfit === 'leather_biker' || outfit === 'gang_2059';
  const isPuffer = outfit === 'puffer_jacket';
  const isKnit = outfit === 'cardigan_scarf' || outfit === 'hoodie_parka';
  const fabricId: 'cloth' | 'leather' | 'knit' | 'denim' = isLeather
    ? 'leather'
    : isKnit
    ? 'knit'
    : 'cloth';

  const coatMat = new THREE.MeshPhysicalMaterial({
    color: jacketColor,
    map: isLeather
      ? textures.pedFabricLeatherMap
      : isKnit
      ? textures.pedFabricKnitMap
      : textures.pedClothingMap,
    roughnessMap: isLeather
      ? textures.pedFabricLeatherRoughness
      : isKnit
      ? textures.pedFabricKnitRoughness
      : textures.pedClothingRoughness,
    bumpMap: isLeather
      ? textures.pedFabricLeatherBump
      : isKnit
      ? textures.pedFabricKnitBump
      : textures.pedClothingBump,
    bumpScale: isLeather ? 0.024 : isKnit ? 0.044 : 0.032,
    roughness: isLeather ? 0.34 : isPuffer ? 0.38 : isKnit ? 0.94 : 0.86,
    metalness: isLeather ? 0.14 : 0.01,
    sheen: isLeather ? 0.22 : 0.90,
    sheenColor: new THREE.Color(jacketColor).lerp(new THREE.Color('#f4f8ff'), 0.45),
    sheenRoughness: 0.52,
    side: THREE.DoubleSide,
  });
  applyClothWind(coatMat, windUniform, 'cloth-wind-pbr-v3');

  const isTailored =
    outfit === 'trench_coat' || outfit === 'tailored_blazer' || outfit === 'transit_security';
  const pantsMat = new THREE.MeshPhysicalMaterial({
    color: pantsColor,
    map: isTailored ? textures.pedClothingMap : textures.pedFabricDenimMap,
    roughnessMap: isTailored ? textures.pedClothingRoughness : textures.pedFabricDenimRoughness,
    bumpMap: isTailored ? textures.pedClothingBump : textures.pedFabricDenimBump,
    bumpScale: isTailored ? 0.024 : 0.038,
    roughness: isTailored ? 0.82 : 0.92,
    metalness: 0.01,
    sheen: isTailored ? 0.52 : 0.82,
    side: THREE.DoubleSide,
  });
  applyClothWind(pantsMat, windUniform, 'cloth-wind-pbr-v3');

  const shoeMat = new THREE.MeshStandardMaterial({
    color: shoeColor,
    map: textures.pedFabricLeatherMap,
    bumpMap: textures.pedFabricLeatherBump,
    bumpScale: 0.016,
    roughness: 0.36,
    metalness: 0.16,
  });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: hairColor,
    map: textures.pedHairMap,
    bumpMap: textures.pedHairBump,
    bumpScale: 0.018,
    roughness: 0.42,
    metalness: 0.05,
    sheen: 0.76,
    sheenColor: new THREE.Color(hairColor).lerp(new THREE.Color('#f4e8dc'), 0.36),
    side: THREE.DoubleSide,
  });
  applyClothWind(hairMat, windUniform, 'cloth-wind-pbr-v3');
  const hatMat = new THREE.MeshPhysicalMaterial({
    color: hatColor,
    roughnessMap: textures.pedClothingRoughness,
    bumpMap: textures.pedClothingBump,
    bumpScale: 0.022,
    roughness: 0.90,
    metalness: 0.02,
    sheen: 0.72,
  });
  const scarfMat = new THREE.MeshPhysicalMaterial({
    color: scarfColor,
    map: textures.pedFabricKnitMap,
    roughnessMap: textures.pedFabricKnitRoughness,
    bumpMap: textures.pedFabricKnitBump,
    bumpScale: 0.044,
    roughness: 0.96,
    side: THREE.DoubleSide,
  });
  applyClothWind(scarfMat, windUniform, 'cloth-wind-pbr-v3');

  // Bind continuous fitted jacket & trousers directly to the MakeHuman MPFB skeleton!
  const garments = getOrBuildMpfbGarments(tpl, outfit);
  const rigParent = skinMesh.parent ?? cloned;

  const jacketSkinned = new THREE.SkinnedMesh(garments.jacket, coatMat);
  jacketSkinned.castShadow = true;
  jacketSkinned.receiveShadow = true;
  jacketSkinned.frustumCulled = false;
  rigParent.add(jacketSkinned);
  jacketSkinned.bind(mpfbSkel, skinMesh.bindMatrix);

  const trousersSkinned = new THREE.SkinnedMesh(garments.trousers, pantsMat);
  trousersSkinned.castShadow = true;
  trousersSkinned.receiveShadow = true;
  trousersSkinned.frustumCulled = false;
  rigParent.add(trousersSkinned);
  trousersSkinned.bind(mpfbSkel, skinMesh.bindMatrix);

  // Outfit-specific collar / badge / belt / scarf mounted in chest-aligned holder on spine01
  const chestMount = new THREE.Group();
  chestMount.quaternion.copy(rSp01.restWorldQuatInv);
  rSp01.bone.add(chestMount);
  const chestHeightSpan = Math.max(0.16, (tpl.bonePositions['neck01']?.y ?? m.chestY + 0.2) - m.chestY);
  let scarfTailBone: THREE.Group | null = null;
  let scarfSideTailBone: THREE.Group | null = null;

  if (outfit === 'transit_security') {
    const badgeMat = new THREE.MeshStandardMaterial({ color: '#d8e2ec', roughness: 0.22, metalness: 0.9 });
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.008, 10), badgeMat);
    badge.rotation.x = Math.PI * 0.5;
    badge.position.set(0.075, chestHeightSpan * 0.45, m.chestRz + 0.028);
    chestMount.add(badge);

    const beltMat = new THREE.MeshStandardMaterial({ color: '#14161a', roughness: 0.42, metalness: 0.28 });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(m.waistRx + 0.024, 0.016, 8, 20), beltMat);
    belt.rotation.x = Math.PI * 0.5;
    belt.scale.set(1.0, (m.waistRz + 0.024) / (m.waistRx + 0.024), 1);
    belt.position.set(0, -chestHeightSpan * 0.95, 0);
    chestMount.add(belt);
  } else if (outfit === 'soviet_soldier') {
    const beltMat = new THREE.MeshStandardMaterial({ color: '#2c1d12', roughness: 0.36, metalness: 0.22 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: '#cfa948', roughness: 0.26, metalness: 0.86 });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(m.waistRx + 0.026, 0.018, 8, 20), beltMat);
    belt.rotation.x = Math.PI * 0.5;
    belt.scale.set(1.0, (m.waistRz + 0.026) / (m.waistRx + 0.026), 1);
    belt.position.set(0, -chestHeightSpan * 0.95, 0);
    chestMount.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.02), buckleMat);
    buckle.position.set(0, -chestHeightSpan * 0.95, m.waistRz + 0.032);
    chestMount.add(buckle);
    const tabMat = new THREE.MeshStandardMaterial({ color: '#b42323', roughness: 0.72 });
    for (const sx of [-1, 1]) {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.016, 0.042), tabMat);
      ep.position.set(sx * (m.shoulderHalfW - 0.03), chestHeightSpan * 0.78, 0.01);
      chestMount.add(ep);
    }
  } else if (outfit === 'leather_biker' || outfit === 'gang_2059') {
    const zipMat = new THREE.MeshStandardMaterial({ color: '#c8d2dc', roughness: 0.22, metalness: 0.88 });
    const zip = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.30, 6), zipMat);
    zip.position.set(0.03, chestHeightSpan * 0.1, m.chestRz + 0.022);
    zip.rotation.z = -0.14;
    chestMount.add(zip);
  }

  if (outfit === 'cardigan_scarf' || outfit === 'gang_2059' || outfit === 'tailored_blazer') {
    const scarfWrap = new THREE.Mesh(geos.scarfWrap, scarfMat);
    scarfWrap.position.set(0, chestHeightSpan * 0.86, 0.012);
    scarfWrap.scale.setScalar(m.chestRx / 0.175);
    chestMount.add(scarfWrap);

    scarfTailBone = new THREE.Group();
    scarfTailBone.position.set(0.052, chestHeightSpan * 0.75, m.chestRz + 0.024);
    chestMount.add(scarfTailBone);
    scarfTailBone.add(new THREE.Mesh(geos.scarfTail, scarfMat));
  } else {
    const collar = new THREE.Mesh(geos.collarLapel, coatMat);
    collar.rotation.x = Math.PI * 0.5 + 0.22;
    collar.rotation.z = Math.PI * 0.8;
    collar.position.set(0, chestHeightSpan * 0.88, 0.005);
    chestMount.add(collar);
  }

  // Head-aligned mount on MPFB head bone for hair/hats + glossy 3D eyes/eyelids/brows
  const headMount = new THREE.Group();
  headMount.quaternion.copy(rHead.restWorldQuatInv);
  rHead.bone.add(headMount);

  const eyeOffY = Math.max(0.02, m.eyeY - m.headY);
  const eyeOffZ = (tpl.bonePositions['eye.L']?.z ?? 0.12) - rHead.restWorldPos.z;
  const eyeOffX = Math.abs(tpl.bonePositions['eye.L']?.x ?? 0.031);

  const eyeMat = getEyeMatFn(variantIdx);
  const lashMat = new THREE.MeshStandardMaterial({ color: '#120f0e', roughness: 0.72 });
  const browMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairColor).multiplyScalar(0.82),
    roughness: 0.74,
  });

  const buildMpfbEye = (sx: -1 | 1) => {
    const socket = new THREE.Group();
    socket.position.set(sx * eyeOffX, eyeOffY, eyeOffZ - 0.005);
    headMount.add(socket);
    const eyeballMesh = new THREE.Mesh(geos.eyeball, eyeMat);
    socket.add(eyeballMesh);
    const upperLidPivot = new THREE.Group();
    upperLidPivot.rotation.x = -0.24;
    socket.add(upperLidPivot);
    upperLidPivot.add(new THREE.Mesh(geos.upperEyelid, skinMat));
    const lash = new THREE.Mesh(geos.eyelashRim, lashMat);
    lash.position.set(0, 0.0025, 0.0012);
    lash.rotation.x = 0.22;
    upperLidPivot.add(lash);
    const browMesh = new THREE.Mesh(geos.eyebrowArch, browMat);
    browMesh.position.set(sx * eyeOffX, eyeOffY + 0.020, eyeOffZ + 0.005);
    browMesh.rotation.set(0, sx * -0.24, sx * -0.085);
    headMount.add(browMesh);
    return { upperLidPivot, eyeballMesh, browMesh };
  };
  const leftEye = buildMpfbEye(-1);
  const rightEye = buildMpfbEye(1);

  const hairStyles: HairStyleType[] = isFemale
    ? ['long_flowing', 'bob_cut', 'ponytail']
    : ['short_cropped', 'side_part', 'knit_beanie'];
  const hairStyle =
    outfit === 'gang_2059' && variantIdx % 2 === 0
      ? 'knit_beanie'
      : hairStyles[(variantIdx * 5 + 1) % hairStyles.length];
  const hairBuilt = buildHairFn(hairStyle, outfit, hairMat, hatMat);
  // Shift procedural hair/hat group so its eye/crown frame matches MakeHuman head landmark
  hairBuilt.group.position.set(0, eyeOffY - 0.090, 0.012);
  hairBuilt.group.scale.set(1.04, 1.02, 1.06);
  headMount.add(hairBuilt.group);

  // Sculpted shoes mounted cleanly onto foot.L / foot.R aligned to ground (+Z forward)
  const attachShoe = (rFoot: MpfbBoneRecord) => {
    const footMount = new THREE.Group();
    footMount.quaternion.copy(rFoot.restWorldQuatInv);
    rFoot.bone.add(footMount);
    const shoe = new THREE.Mesh(geos.shoe, shoeMat);
    shoe.position.set(0, -rFoot.restWorldPos.y + 0.004, 0.025);
    shoe.scale.setScalar(THREE.MathUtils.clamp(picked.heightM / 1.72, 0.9, 1.12));
    footMount.add(shoe);
  };
  attachShoe(rFootL);
  attachShoe(rFootR);

  // Right & Left hand sockets on MPFB wrist.R and wrist.L
  const rightHandSocket = new THREE.Group();
  rightHandSocket.name = 'MpfbRightHandSocket';
  rightHandSocket.position.copy(m.palmOffsetR);
  rWrR.bone.add(rightHandSocket);

  const leftHandSocket = new THREE.Group();
  leftHandSocket.name = 'MpfbLeftHandSocket';
  leftHandSocket.position.copy(m.palmOffsetL);
  rWrL.bone.add(leftHandSocket);

  // Subtle cigarette smoke wisps for MOB idle posture (wisps only — NO visible cigarette!)
  const cigWispSprites: THREE.Sprite[] = [];
  if (options?.archetype === 'mob') {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(220,228,238,0.28)');
    g.addColorStop(0.55, 'rgba(198,210,224,0.12)');
    g.addColorStop(1, 'rgba(180,196,212,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const wTex = new THREE.CanvasTexture(c);
    for (let s = 0; s < 3; s++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: wTex,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
        })
      );
      sp.visible = false;
      chestMount.add(sp);
      cigWispSprites.push(sp);
    }
  }

  // Compute MPFB bind limb directions & elbow hinge vectors in root space
  const restUpperDirL = new THREE.Vector3().subVectors(rLoL.restWorldPos, rUpL.restWorldPos).normalize();
  const restForeDirL = new THREE.Vector3().subVectors(rWrL.restWorldPos, rLoL.restWorldPos).normalize();
  const restHingeL = new THREE.Vector3().crossVectors(restUpperDirL, restForeDirL).normalize();

  const restUpperDirR = new THREE.Vector3().subVectors(rLoR.restWorldPos, rUpR.restWorldPos).normalize();
  const restForeDirR = new THREE.Vector3().subVectors(rWrR.restWorldPos, rLoR.restWorldPos).normalize();
  const restHingeR = new THREE.Vector3().crossVectors(restUpperDirR, restForeDirR).normalize();

  const shoulderOffInChestL = rUpL.restWorldPos.clone().sub(rSp01.restWorldPos);
  const shoulderOffInChestR = rUpR.restWorldPos.clone().sub(rSp01.restWorldPos);

  // Create lightweight compatibility HumanRig facade bones (never added to scene, driven cleanly by pose layer!)
  const pelvis = new THREE.Bone();
  pelvis.position.set(0, m.pelvisY, 0);
  const spine = new THREE.Bone();
  spine.position.set(0, Math.max(0.05, m.chestY - m.pelvisY), 0);
  const chest = new THREE.Bone();
  const coatTailBone = new THREE.Bone();
  const neck = new THREE.Group();
  const head = new THREE.Group();
  const leftShoulder = new THREE.Bone();
  leftShoulder.position.set(-m.shoulderHalfW, m.chestY - m.chestY + (rUpL.restWorldPos.y - m.chestY), 0.02);
  const leftElbow = new THREE.Bone();
  leftElbow.position.set(0, -m.armL1, 0);
  const rightShoulder = new THREE.Bone();
  rightShoulder.position.set(m.shoulderHalfW, rUpR.restWorldPos.y - m.chestY, 0.02);
  const rightElbow = new THREE.Bone();
  rightElbow.position.set(0, -m.armL1, 0);
  const leftHip = new THREE.Bone();
  const leftKnee = new THREE.Bone();
  const leftAnkle = new THREE.Group();
  const rightHip = new THREE.Bone();
  const rightKnee = new THREE.Bone();
  const rightAnkle = new THREE.Group();

  const emptyGroupL = new THREE.Group();
  const emptyGroupR = new THREE.Group();

  const mpfbAdapter: MpfbAdapter = {
    bodyId: picked.bodyId,
    entry: picked,
    rigGroup: cloned,
    skinMesh,
    skeleton: mpfbSkel,
    measurements: m,
    root: rRoot,
    spine05: rSp05,
    spine03: rSp03,
    spine01: rSp01,
    neck01: rNeck,
    head: rHead,
    clavicleL: makeRec('clavicle.L'),
    upperArmL: rUpL,
    lowerArmL: rLoL,
    wristL: rWrL,
    clavicleR: makeRec('clavicle.R'),
    upperArmR: rUpR,
    lowerArmR: rLoR,
    wristR: rWrR,
    upperLegL: rLegUpL,
    lowerLegL: rLegLoL,
    footL: rFootL,
    upperLegR: rLegUpR,
    lowerLegR: rLegLoR,
    footR: rFootR,
    leftFingers,
    rightFingers,
    restUpperArmDirL: restUpperDirL,
    restForearmDirL: restForeDirL,
    restHingeL: restHingeL,
    restUpperArmDirR: restUpperDirR,
    restForearmDirR: restForeDirR,
    restHingeR: restHingeR,
    shoulderOffInChestL,
    shoulderOffInChestR,
    rightHandSocket,
    leftHandSocket,
    cigWispSprites,
  };

  return {
    root,
    pelvis,
    spine,
    chest,
    neck,
    head,
    leftShoulder,
    leftElbow,
    leftHandGrp: leftHandSocket,
    leftHandNormalMesh: emptyGroupL,
    leftHandStrapMesh: new THREE.Group(),
    rightShoulder,
    rightElbow,
    rightHandGrp: rightHandSocket,
    rightHandNormalMesh: emptyGroupR,
    rightHandStrapMesh: new THREE.Group(),
    leftHip,
    leftKnee,
    leftAnkle,
    rightHip,
    rightKnee,
    rightAnkle,
    coatTailBone,
    scarfTailBone,
    scarfSideTailBone,
    hairTailBone: hairBuilt.hairTailBone,
    jacketFlapLeft: null,
    jacketFlapRight: null,
    eyelidLeft: leftEye.upperLidPivot,
    eyelidRight: rightEye.upperLidPivot,
    eyeballLeft: leftEye.eyeballMesh,
    eyeballRight: rightEye.eyeballMesh,
    browLeft: leftEye.browMesh,
    browRight: rightEye.browMesh,
    windUniform,
    activity: forcedActivity ?? 'none',
    newspaperProp: null,
    phoneProp: null,
    cigaretteProp: null,
    cigEmberMat: null,
    smokePuffs: [],
    ambientSmokeClouds: [],
    build,
    outfit,
    heightScale: picked.heightM / 1.72,
    standingPelvisY: m.pelvisY,
    seatedPelvisY: 0.54,
    mpfb: mpfbAdapter,
    bodyId: picked.bodyId,
    heightM: picked.heightM,
    eyeHeightM: picked.eyeHeightM,
    faceId,
    outfitId: outfit,
    fabricId,
    archetype: options?.archetype,
  };
}

// =========================================================================
// MPFB POSE & ARCHETYPE ANIMATION SYNCHRONIZATION
// =========================================================================

export function syncMpfbBasePose(rig: HumanRig, params: HumanPoseParams): void {
  const ad = rig.mpfb;
  if (!ad) return;
  const { mode, elapsed, phase } = params;
  const prof = params.archetype ? ARCHETYPE_ANIM_PROFILES[params.archetype] : null;
  const isWalking = mode === 'walking';

  const breath = (Math.sin(elapsed * 1.85 + phase) + Math.sin(elapsed * 3.7 + phase) * 0.16) * 0.012;
  const strideTempo = prof?.strideFreqMul ?? 1.0;
  const w = (params.walkCycle ?? elapsed * 6.8 + phase) * strideTempo;
  const sinW = isWalking ? Math.sin(w) : 0;
  const cosW = isWalking ? Math.cos(w) : 0;

  const strideAmp = prof?.strideAmp ?? 0.50;
  const bounceAmp = prof?.bounceAmp ?? 0.026;
  const pelvSway = prof?.pelvisSway ?? 0.016;
  const pelvRoll = prof?.pelvisRoll ?? 0.042;
  const shoulderSq = prof?.shoulderSquare ?? 0.0;
  const idleShiftScale = prof?.idleWeightShift ?? 0.45;

  // Pelvis drop/bounce + contrapposto / swagger
  let pelvX = 0;
  let pelvY = ad.root.restLocalPos.y;
  let pelvRx = 0;
  let pelvRy = 0;
  let pelvRz = 0;

  const idleWeight = isWalking
    ? 0
    : Math.tanh(Math.sin(elapsed * (prof?.id === 'gang' ? 0.95 : 0.28) + phase) * 1.9) * idleShiftScale;
  const lRelax = Math.max(0, idleWeight);
  const rRelax = Math.max(0, -idleWeight);

  if (isWalking) {
    pelvX = sinW * pelvSway;
    pelvY += -0.016 + Math.abs(cosW) * bounceAmp;
    pelvRx = 0.03 + (shoulderSq < 0 ? 0.04 : 0);
    pelvRy = sinW * (prof?.id === 'mob' ? 0.14 : 0.085);
    pelvRz = -sinW * pelvRoll;
  } else {
    pelvX = idleWeight * 0.028;
    pelvY += -Math.abs(idleWeight) * 0.016 + Math.sin(elapsed * 1.85 + phase) * 0.004;
    pelvRx = 0.01;
    pelvRy = -idleWeight * 0.06;
    pelvRz = -idleWeight * 0.055;
  }

  // Write root & spine compatibility values too so IK stays synced
  rig.pelvis.position.set(pelvX, rig.standingPelvisY + (pelvY - ad.root.restLocalPos.y), 0);
  rig.pelvis.rotation.set(pelvRx, pelvRy, pelvRz);
  ad.root.bone.position.set(
    ad.root.restLocalPos.x + pelvX,
    pelvY,
    ad.root.restLocalPos.z
  );
  applyMpfbJointEuler(ad.root, pelvRx, pelvRy, pelvRz);

  const spineRx = (isWalking ? 0.03 : 0.01) - shoulderSq * 0.65 + breath;
  const spineRy = isWalking ? -sinW * (prof?.id === 'mob' ? 0.14 : 0.095) : idleWeight * 0.04;
  const spineRz = isWalking ? sinW * (pelvRoll * 0.72) : idleWeight * 0.042;
  rig.spine.rotation.set(spineRx * 0.55, spineRy * 0.5, spineRz * 0.55);
  rig.chest.rotation.set(spineRx * 0.45 + breath * 0.6, spineRy * 0.5, spineRz * 0.45);
  applyMpfbJointEuler(ad.spine03, spineRx * 0.5, spineRy * 0.45, spineRz * 0.5);
  applyMpfbJointEuler(ad.spine01, spineRx * 0.5 - shoulderSq * 0.35, spineRy * 0.55, spineRz * 0.5);

  // Archetype head scanning mode (purely data-driven!)
  let headYaw = 0;
  let headPitch = 0;
  let headRoll = 0;
  const scanMode = prof?.headScanMode ?? 'sector';
  if (scanMode === 'sector') {
    // Crisp, methodical 3-sector tactical scan
    const step = Math.floor((elapsed * 0.55 + phase) % 3) - 1;
    headYaw = step * 0.24 + Math.sin(elapsed * 2.2 + phase) * 0.02;
    headPitch = -0.02;
  } else if (scanMode === 'chin_up') {
    // Mob boss / enforcer: chin up, unhurried arrogant sweep
    headYaw = Math.tanh(Math.sin(elapsed * 0.32 + phase) * 1.4) * 0.24;
    headPitch = -0.10 + Math.sin(elapsed * 0.8 + phase) * 0.02;
    headRoll = 0.04 * Math.sin(elapsed * 0.4 + phase);
  } else if (scanMode === 'window_shopper') {
    // Undercover: casual bystander window-shopper glance + subtle stillness
    const pause = Math.sin(elapsed * 0.28 + phase) > 0.35 ? 0 : 1;
    headYaw = pause * Math.tanh(Math.sin(elapsed * 0.48 + phase) * 2.1) * 0.28;
    headPitch = 0.06;
  } else {
    // Gang: quick anxious shoulder checks on crew
    headYaw = Math.tanh(Math.sin(elapsed * 1.35 + phase * 1.7) * 3.1) * 0.32;
    headPitch = 0.04;
  }
  rig.neck.rotation.set(headPitch * 0.35, headYaw * 0.35, 0);
  rig.head.rotation.set(headPitch * 0.65, headYaw * 0.65, headRoll);
  applyMpfbJointEuler(ad.neck01, headPitch * 0.35, headYaw * 0.35, 0);
  applyMpfbJointEuler(ad.head, headPitch * 0.65, headYaw * 0.65, headRoll);

  // Grounded legs (MPFB note: .R = -X, .L = +X; positive rotation around X swings leg forward?
  // Wait: in character space +Z is forward, +X is LEFT, +Y is UP -> right-hand rule around +X rotates +Y->+Z and -Y->-Z!
  // Wait: leg hangs straight DOWN (-Y), so rotating leg by NEGATIVE angle around +X (Rx(-a)) swings -Y leg FORWARD toward +Z!!)
  const lStride = isWalking ? sinW * strideAmp : 0;
  const rStride = isWalking ? -sinW * strideAmp : 0;
  const lKnee = isWalking ? Math.max(0.05, -cosW * 0.65 + 0.12) : 0.04 + lRelax * 0.24;
  const rKnee = isWalking ? Math.max(0.05, cosW * 0.65 + 0.12) : 0.04 + rRelax * 0.24;

  // MPFB rest legs already slant slightly outward (+X on .L, -X on .R), rotate gently inward to natural stance (-0.06 / +0.06)
  applyMpfbJointEuler(ad.upperLegL, isWalking ? -lStride : -0.02 - lRelax * 0.12, 0.02, -0.055 + idleWeight * 0.03);
  applyMpfbJointEuler(ad.lowerLegL, lKnee, 0, 0);
  applyMpfbJointEuler(ad.footL, isWalking ? lStride * 0.25 - Math.max(0, -cosW) * 0.12 : -lRelax * 0.1, 0, 0);

  applyMpfbJointEuler(ad.upperLegR, isWalking ? -rStride : -0.02 - rRelax * 0.12, -0.02, 0.055 + idleWeight * 0.03);
  applyMpfbJointEuler(ad.lowerLegR, rKnee, 0, 0);
  applyMpfbJointEuler(ad.footR, isWalking ? rStride * 0.25 - Math.max(0, cosW) * 0.12 : -rRelax * 0.1, 0, 0);

  // Relaxed arms out of A-pose! (Note MPFB upperarm01.L hangs ~42 deg out toward +X: negative Z rot brings it down toward torso!
  // MPFB upperarm01.R hangs ~42 deg out toward -X: positive Z rot brings it down toward torso!)
  const armSwing = prof?.id === 'undercover' ? 0.22 : prof?.id === 'mob' ? 0.36 : 0.42;
  const lArmX = isWalking ? sinW * armSwing : -0.06 + breath * 1.4;
  const rArmX = isWalking ? -sinW * armSwing : -0.08 - breath * 1.2;
  const lForeX = isWalking ? -0.22 - Math.max(0, -sinW) * 0.32 : -0.28;
  const rForeX = isWalking ? -0.22 - Math.max(0, sinW) * 0.32 : -0.30;

  // For undercover bystander stillness: slightly tucked hands-in-pocket posture
  const ucTuck = prof?.id === 'undercover' && !isWalking ? 0.18 : 0.0;
  applyMpfbJointEuler(ad.upperArmL, lArmX - ucTuck, 0.04, -0.52);
  applyMpfbJointEuler(ad.lowerArmL, lForeX - ucTuck * 1.4, 0, 0.06);
  applyMpfbJointEuler(ad.wristL, 0, 0, 0);

  applyMpfbJointEuler(ad.upperArmR, rArmX - ucTuck, -0.04, 0.52);
  applyMpfbJointEuler(ad.lowerArmR, rForeX - ucTuck * 1.4, 0, -0.06);
  applyMpfbJointEuler(ad.wristR, 0, 0, 0);

  setMpfbFingerGrip(ad.leftFingers, 0.22);
  setMpfbFingerGrip(ad.rightFingers, 0.22);

  // Subtle cigarette smoke wisps ONLY (zero visible cigarette!) for MOB idle
  if (ad.cigWispSprites.length > 0) {
    const showWisp = prof?.idleFidget === 'cig_wisps';
    for (let s = 0; s < ad.cigWispSprites.length; s++) {
      const sp = ad.cigWispSprites[s];
      sp.visible = showWisp;
      if (!showWisp) continue;
      const t = (((elapsed * 0.34 + s / ad.cigWispSprites.length + phase * 0.2) % 1) + 1) % 1;
      sp.position.set(
        0.12 + Math.sin(elapsed * 1.7 + s * 2.1 + t * 4) * (0.04 + t * 0.09),
        0.18 + t * 0.56,
        0.16 + t * 0.12
      );
      const sz = 0.06 + t * 0.28;
      sp.scale.set(sz, sz, 1);
      (sp.material as THREE.SpriteMaterial).opacity = Math.sin(t * Math.PI) * 0.22;
    }
  }
}

// Scratch math for syncMpfbWeaponHold
const _mwGunChestE = new THREE.Euler(0, 0, 0, 'YXZ');
const _mwGunChestQ = new THREE.Quaternion();
const _mwTorsoQ = new THREE.Quaternion();
const _mwGunWorldQ = new THREE.Quaternion();
const _mwHandWorldQ = new THREE.Quaternion();
const _mwGripPosRoot = new THREE.Vector3();
const _mwTargetWristR = new THREE.Vector3();
const _mwTargetWristL = new THREE.Vector3();
const _mwPoleR = new THREE.Vector3();
const _mwPoleL = new THREE.Vector3();
const _mwTmp = new THREE.Vector3();
const _mwPalmL = new THREE.Vector3();

export function syncMpfbWeaponHoldPose(
  rig: HumanRig,
  params: WeaponHoldPoseParams & {
    archetype: ArchetypeStyleId;
    drawWeight: number;
    aimWeight: number;
    lowReadyWeight: number;
    twoHandWeight: number;
    reloadWeight: number;
    recoilKick: number;
    weaponId: string;
    gunScale: number;
    pumpStroke: number;
    pumpForendRestZ: number;
    handguardLocalPos?: THREE.Vector3;
    relHandLocal: THREE.Vector3;
    relTilt: { roll: number; pitch: number; yaw: number; impulse: number };
    swayX: number;
    swayY: number;
    stanceYaw: number;
    aimYawOff: number;
    aimPitch: number;
    cantRad: number;
    lowReadyPitch: number;
    combatLean: number;
    gunGripForwardAxis?: boolean;
  }
): void {
  const ad = rig.mpfb;
  if (!ad) return;
  const prof = ARCHETYPE_ANIM_PROFILES[params.archetype];
  const m = ad.measurements;

  const combatBlend = Math.max(params.aimWeight, params.lowReadyWeight, params.reloadWeight);
  const drawW = params.drawWeight;
  const aimW = params.aimWeight;
  const relW = params.reloadWeight;
  const recoil = params.recoilKick;

  // Police subtle lateral cover-step displacement when standing/aiming/low-ready
  let coverStepX = 0;
  if (prof.coverStepAmp > 0 && (params.moveSpeedNorm ?? 0) < 0.15 && combatBlend > 0.25) {
    coverStepX = Math.sin(params.elapsed * 1.15 + params.phase) * prof.coverStepAmp * combatBlend;
  }

  // Apply additive combat torso rotation onto MPFB spine03 / spine01 / neck01 / head
  applyMpfbJointEuler(ad.spine03, rig.spine.rotation.x, rig.spine.rotation.y, rig.spine.rotation.z);
  applyMpfbJointEuler(ad.spine01, rig.chest.rotation.x, rig.chest.rotation.y, rig.chest.rotation.z);
  applyMpfbJointEuler(ad.neck01, rig.neck.rotation.x, rig.neck.rotation.y, rig.neck.rotation.z);
  applyMpfbJointEuler(ad.head, rig.head.rotation.x, rig.head.rotation.y, rig.head.rotation.z);

  const pelvShiftY = rig.pelvis.position.y - rig.standingPelvisY;
  // Right arm is on -X in MPFB! (-m.shoulderHalfW)
  const shXR = -m.shoulderHalfW;
  const shY = ad.upperArmR.restWorldPos.y + pelvShiftY;

  // Weapon target position in character root space:
  // Patrol carry (right hip/thigh) -> Low-ready (chest) -> Aim/fire (shoulder pocket)
  const patX = shXR - 0.035;
  const patY = shY - 0.34;
  const patZ = 0.14;

  const lrX = shXR + 0.055;
  const lrY = shY - 0.15;
  const lrZ = 0.26;

  // MOB fires one-handed extended slightly forward/side at cheek/chest level; others shoulder tightly
  const oneHandMob = !prof.twoHandFire;
  const aimX = oneHandMob ? shXR + 0.015 : shXR + 0.065;
  const aimY = shY - (oneHandMob ? 0.105 : 0.072) + Math.sin(params.aimPitch) * 0.05;
  const aimZ = (oneHandMob ? 0.30 : 0.24) - recoil * 0.042 + params.relTilt.impulse * 0.018;

  const baseGX = THREE.MathUtils.lerp(THREE.MathUtils.lerp(patX, lrX, drawW), aimX, aimW);
  const baseGY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(patY, lrY, drawW), aimY, aimW);
  const baseGZ = THREE.MathUtils.lerp(THREE.MathUtils.lerp(patZ, lrZ, drawW), aimZ, aimW);

  _mwGripPosRoot.set(
    rig.pelvis.position.x + coverStepX + baseGX + params.swayX * (0.4 + 0.6 * drawW),
    baseGY + params.swayY + recoil * 0.014 - relW * 0.035,
    rig.pelvis.position.z + baseGZ + relW * 0.02
  );

  // Reload posture adjustments per archetype profile
  let relExtraYaw = 0;
  let relExtraRoll = 0;
  let relExtraPitch = 0;
  if (relW > 0.01) {
    if (prof.reloadStyle === 'turned_shield') {
      // Undercover turns body away to shield reload from street
      relExtraYaw = -0.55 * relW;
      relExtraRoll = 0.25 * relW;
    } else if (prof.reloadStyle === 'frantic_fumble') {
      // Gang fumbles exposed and jerky
      relExtraRoll = Math.sin(params.elapsed * 19.0 + params.phase) * 0.14 * relW;
      relExtraPitch = -0.18 * relW;
    } else if (prof.reloadStyle === 'offended_unhurried') {
      // Mob unhurried low-dip reload
      relExtraPitch = 0.16 * relW;
    }
  }

  // Target gun orientation in chest/world space (aiming toward +Z_root)
  const gunPitchPat = 0.72 + Math.sin(params.elapsed * 3.0 + params.phase) * 0.04 * (params.moveSpeedNorm ?? 0);
  const gunPitchLR = params.lowReadyPitch + params.swayY * 1.4;
  const gunPitchAim =
    -params.aimPitch -
    recoil * (params.weaponId === 'pump_shotgun' ? 0.16 : 0.105) +
    params.swayY * 0.85;
  const gunPitch =
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(gunPitchPat, gunPitchLR, drawW), gunPitchAim, aimW) +
    params.relTilt.pitch * relW +
    relExtraPitch;

  const gunYawPat = 0.14;
  const gunYawLR = 0.26;
  const gunYawAim = params.aimYawOff + params.swayX * 1.1;
  const gunYaw =
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(gunYawPat, gunYawLR, drawW), gunYawAim, aimW) -
    params.relTilt.yaw * relW +
    relExtraYaw;

  const gunRollPat = -0.16;
  const gunRollReady = -params.cantRad + recoil * 0.04;
  const gunRoll =
    THREE.MathUtils.lerp(gunRollPat, gunRollReady, drawW) - params.relTilt.roll * relW + relExtraRoll;

  _mwGunChestE.set(gunPitch, gunYaw, gunRoll, 'YXZ');
  _mwGunWorldQ.setFromEuler(_mwGunChestE);

  // Desired MPFB right wrist orientation: W_wristR = W_gun * MPFB_RHAND_IN_GUN_Q
  _mwHandWorldQ.copy(_mwGunWorldQ).multiply(MPFB_RHAND_IN_GUN_Q);
  _mwTmp.copy(ad.measurements.palmOffsetR).applyQuaternion(_mwHandWorldQ);
  _mwTargetWristR.copy(_mwGripPosRoot).sub(_mwTmp);

  // Solve right arm 2-bone IK (sideSign = -1 because .R is at -X!)
  _mwPoleR.set(-0.68, -0.70, -0.22);
  solveMpfbArmIK(rig, -1, _mwTargetWristR, _mwHandWorldQ, _mwPoleR, 1.0);
  setMpfbFingerGrip(ad.rightFingers, 0.92);

  // Support (left) arm:
  // MOB enforcer fires ONE-HANDED (`prof.twoHandFire === false`) so uses left hand during reload only
  const effectiveTwoHand = prof.twoHandFire ? params.twoHandWeight : relW;
  if (effectiveTwoHand > 0.02) {
    const hgX = params.handguardLocalPos ? params.handguardLocalPos.x : 0.0;
    const hgY = params.handguardLocalPos ? params.handguardLocalPos.y : 0.002;
    const baseHgZ = params.handguardLocalPos
      ? params.handguardLocalPos.z - (params.weaponId === 'pump_shotgun' ? params.pumpStroke * 0.102 : 0)
      : params.weaponId === 'pump_shotgun'
        ? params.pumpForendRestZ - params.pumpStroke * 0.102
        : 0.258;

    if (relW > 0.02) {
      _mwTmp.set(
        THREE.MathUtils.lerp(hgX, -params.relHandLocal.x, relW),
        THREE.MathUtils.lerp(hgY, params.relHandLocal.y, relW),
        THREE.MathUtils.lerp(baseHgZ, params.relHandLocal.z, relW)
      );
    } else {
      _mwTmp.set(hgX, hgY, baseHgZ);
    }
    _mwTmp.multiplyScalar(params.gunScale).applyQuaternion(_mwGunWorldQ).add(_mwGripPosRoot);

    _mwTorsoQ.copy(_mwGunWorldQ).multiply(MPFB_LHAND_IN_GUN_Q);
    _mwPalmL.copy(ad.measurements.palmOffsetL).applyQuaternion(_mwTorsoQ);
    _mwTargetWristL.copy(_mwTmp).sub(_mwPalmL);

    _mwPoleL.set(0.65, -0.76, -0.18);
    solveMpfbArmIK(rig, 1, _mwTargetWristL, _mwTorsoQ, _mwPoleL, effectiveTwoHand);
    setMpfbFingerGrip(ad.leftFingers, 0.85 * effectiveTwoHand + 0.22 * (1 - effectiveTwoHand));
  } else if (oneHandMob && combatBlend > 0.1) {
    // MOB enforcer free left arm: loose swaggering counterbalance attitude
    applyMpfbJointEuler(ad.upperArmL, 0.08 + Math.sin(params.elapsed * 1.9 + params.phase) * 0.04, 0.08, -0.42);
    applyMpfbJointEuler(ad.lowerArmL, -0.45, 0, 0.12);
    setMpfbFingerGrip(ad.leftFingers, 0.35);
  }
}
