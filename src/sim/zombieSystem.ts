import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  CollisionWorld,
  getDistrictAt,
  getRoadElevationAt,
  getTerrainHeight,
} from './mapData';
import { FpsRayTarget } from './fpsBridge';
import { worldEventBus } from './worldEventBus';

export const ZOMBIE_STATES = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  ATTACK: 'attack',
  DEATH: 'death',
} as const;

export type ZombieState = (typeof ZOMBIE_STATES)[keyof typeof ZOMBIE_STATES];
export type ZombieClipKey = 'idle' | 'walk' | 'run' | 'attack' | 'biting' | 'death' | 'crawl';
export type ZombieZoneKind = 'forest' | 'ghetto' | 'city' | 'outbreak';

export interface ZombieEvalContext {
  alive: boolean;
  dying: boolean;
  distToTarget: number;
  detectRadius: number;
  attackState: 'none' | 'windup' | 'active' | 'recover' | 'execute';
  isSprinter: boolean;
  alerted: boolean;
}

export interface ZombieStateEvalResult {
  nextState: ZombieState;
  loop: boolean;
  changed: boolean;
  fireBloodSequence: boolean;
  crossfade: number;
}

/**
 * Pure zombie animation state evaluator (ported from Undead Transport pack).
 */
export function evaluateZombieState(
  currentState: ZombieState,
  ctx: ZombieEvalContext
): ZombieStateEvalResult {
  let nextState: ZombieState = ZOMBIE_STATES.IDLE;
  let loop = true;
  let fireBloodSequence = false;

  if (!ctx.alive || ctx.dying) {
    nextState = ZOMBIE_STATES.DEATH;
    loop = false;
  } else if (ctx.attackState === 'active' || ctx.attackState === 'windup') {
    nextState = ZOMBIE_STATES.ATTACK;
    loop = true;
    fireBloodSequence = ctx.attackState === 'active';
  } else if (ctx.distToTarget <= ctx.detectRadius || ctx.alerted) {
    nextState = ctx.isSprinter ? ZOMBIE_STATES.RUN : ZOMBIE_STATES.WALK;
    loop = true;
  }

  return {
    nextState,
    loop,
    changed: nextState !== currentState,
    fireBloodSequence,
    crossfade: nextState === ZOMBIE_STATES.DEATH ? 0.14 : 0.22,
  };
}

export interface ZombieAgent {
  id: number;
  faceId: string;
  fabricId: string;
  voiceSeed: number;
  zone: ZombieZoneKind;
  districtId: string;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeZ: number;
  yaw: number;
  state: ZombieState;
  clipKey: ZombieClipKey;
  hp: number;
  maxHp: number;
  alive: boolean;
  dying: boolean;
  deathTimer: number;
  isSprinter: boolean;
  isCrawler: boolean;
  detectRadius: number;
  suspicion: number;
  loseSightTimer: number;
  alertBannerTimer: number;
  lungeBoost: number;
  alerted: boolean;
  attackState: 'none' | 'windup' | 'active' | 'recover' | 'execute';
  attackTimer: number;
  swingDealt: boolean;
  wanderAngle: number;
  wanderTimer: number;
  dormant: boolean;
  lowHpPlayed: boolean;
  spotCooldown: number;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Partial<Record<ZombieClipKey, THREE.AnimationAction>>;
  activeAction: THREE.AnimationAction | null;
  suspicionSprite?: THREE.Sprite;
}

export interface ZombiePlayerContext {
  pos: THREE.Vector3;
  inVehicle: boolean;
  speedKmh: number;
  onPlayerHit?: (damage: number) => void;
}

export interface ZombieCivilianTarget {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface ZombieSystemHandles {
  root: THREE.Group;
  agents: ZombieAgent[];
  isReady: () => boolean;
  whenReady: () => Promise<void>;
  update: (
    dt: number,
    elapsed: number,
    playerCtx?: ZombiePlayerContext,
    civilians?: ZombieCivilianTarget[],
    onHitCivilian?: (pedId: string, damage: number, fromPos: THREE.Vector3) => void
  ) => void;
  getRayTargets: (origin: THREE.Vector3, radiusM: number) => FpsRayTarget[];
  applyDamage: (agentKey: string, damage: number, shooterPos?: THREE.Vector3) => boolean;
  getSummary: () => {
    ready: boolean;
    total: number;
    alive: number;
    byZone: Record<ZombieZoneKind, number>;
    activeOutbreakDistrict: string | null;
  };
  dispose: () => void;
}

const CLIP_FILES: Record<ZombieClipKey, string> = {
  idle: '/animations/zombie-idle.fbx',
  walk: '/animations/zombie-walk.fbx',
  run: '/animations/zombie-run.fbx',
  attack: '/animations/zombie-attack.fbx',
  biting: '/animations/zombie-biting.fbx',
  death: '/animations/zombie-death.fbx',
  crawl: '/animations/zombie-crawl.fbx',
};

const AUDIO_FILES = {
  spot: '/audio/zombies/zombie_spot_1.mp3',
  swarm: '/audio/zombies/zombie_swarm_1.mp3',
  hit: '/audio/zombies/zombie_hit_1.mp3',
  whiff: '/audio/zombies/zombie_whiff_1.mp3',
  down: '/audio/zombies/zombie_down_1.mp3',
  lowhp: '/audio/zombies/zombie_lowhp_1.mp3',
  pit: '/audio/zombies/zombie_pit_1.mp3',
  taunt: '/audio/zombies/zombie_better_than_that.mp3',
} as const;

type ZombieAudioKey = keyof typeof AUDIO_FILES;

function makePrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleGroundY(x: number, z: number): number {
  const th = getTerrainHeight(x, z);
  const rh = getRoadElevationAt(x, z);
  return Math.max(0.02, th, rh > 0.05 ? rh : 0.02);
}

function normalizeBoneKey(name: string): string {
  return name.replace(/^mixamorig:?/i, 'mixamorig').toLowerCase();
}

/**
 * Retargets Mixamo FBX clips to match the exact bone names present on zombie.glb
 * and strips position root-translation tracks so cm-vs-m scaling never offsets hips.
 */
function buildClipForModel(
  sourceClip: THREE.AnimationClip,
  boneMap: Map<string, string>,
  clipKey: ZombieClipKey
): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];
  for (const t of sourceClip.tracks) {
    const dot = t.name.indexOf('.');
    if (dot <= 0) continue;
    const rawNode = t.name.slice(0, dot);
    const prop = t.name.slice(dot + 1);
    if (prop === 'position' || prop === 'scale') continue;
    const matched = boneMap.get(normalizeBoneKey(rawNode)) ?? rawNode;
    const cloned = t.clone();
    cloned.name = `${matched}.${prop}`;
    tracks.push(cloned);
  }
  return new THREE.AnimationClip(`z_${clipKey}`, sourceClip.duration, tracks);
}

let _zQuestionTextures: THREE.CanvasTexture[] | null = null;
let _zAlertBangTexture: THREE.CanvasTexture | null = null;

function getZombieSuspicionTextures(): {
  questionSteps: THREE.CanvasTexture[];
  alertBang: THREE.CanvasTexture;
} {
  if (_zQuestionTextures && _zAlertBangTexture) {
    return { questionSteps: _zQuestionTextures, alertBang: _zAlertBangTexture };
  }
  const steps: THREE.CanvasTexture[] = [];
  for (let s = 0; s <= 10; s++) {
    const frac = s / 10;
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(12, 16, 20, 0.76)';
    ctx.beginPath();
    ctx.arc(48, 48, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = frac > 0.72 ? '#b91c1c' : frac > 0.35 ? '#d97706' : '#94a3b8';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
    ctx.fillText('?', 48, 50);

    if (frac > 0.01) {
      const topY = 80 - frac * 64;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, topY, 96, 96 - topY);
      ctx.clip();
      ctx.fillStyle = frac > 0.75 ? '#ef4444' : frac > 0.4 ? '#f59e0b' : '#fde047';
      ctx.fillText('?', 48, 50);
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    steps.push(tex);
  }

  const ac = document.createElement('canvas');
  ac.width = 96;
  ac.height = 96;
  const actx = ac.getContext('2d')!;
  actx.fillStyle = 'rgba(105, 16, 24, 0.92)';
  actx.beginPath();
  actx.arc(48, 48, 36, 0, Math.PI * 2);
  actx.fill();
  actx.strokeStyle = '#fca5a5';
  actx.lineWidth = 4;
  actx.stroke();
  actx.font = 'bold 56px sans-serif';
  actx.textAlign = 'center';
  actx.textBaseline = 'middle';
  actx.fillStyle = '#fef2f2';
  actx.fillText('!', 48, 50);
  const aTex = new THREE.CanvasTexture(ac);
  aTex.colorSpace = THREE.SRGBColorSpace;

  _zQuestionTextures = steps;
  _zAlertBangTexture = aTex;
  return { questionSteps: steps, alertBang: aTex };
}

export function buildZombieSystem(
  collisionWorld: CollisionWorld,
  seed = 71059
): ZombieSystemHandles {
  const rng = makePrng(seed);
  const root = new THREE.Group();
  root.name = 'ZombieSystem';

  const agents: ZombieAgent[] = [];
  const audioPools = new Map<ZombieAudioKey, HTMLAudioElement[]>();
  const lastAudioTime: Partial<Record<ZombieAudioKey, number>> = {};
  const { questionSteps: zQuestionSteps, alertBang: zAlertBang } = getZombieSuspicionTextures();

  // Pooled realistic dark-maroon blood bursts & persistent growing ground pools (zero-GC)
  const MAX_BLOOD_BURSTS = 128;
  const MAX_BLOOD_POOLS = 64;
  const bloodBurstGeo = new THREE.SphereGeometry(0.048, 6, 5);
  const bloodBurstMat = new THREE.MeshStandardMaterial({
    color: '#4a0810',
    roughness: 0.24,
    metalness: 0.08,
  });
  const bloodBurstInst = new THREE.InstancedMesh(bloodBurstGeo, bloodBurstMat, MAX_BLOOD_BURSTS);
  bloodBurstInst.frustumCulled = false;
  root.add(bloodBurstInst);

  const bloodPoolGeo = new THREE.CircleGeometry(1, 14);
  bloodPoolGeo.rotateX(-Math.PI * 0.5);
  const bloodPoolMat = new THREE.MeshStandardMaterial({
    color: '#3b060c',
    roughness: 0.14,
    metalness: 0.12,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const bloodPoolInst = new THREE.InstancedMesh(bloodPoolGeo, bloodPoolMat, MAX_BLOOD_POOLS);
  bloodPoolInst.frustumCulled = false;
  root.add(bloodPoolInst);

  const bPosX = new Float32Array(MAX_BLOOD_BURSTS);
  const bPosY = new Float32Array(MAX_BLOOD_BURSTS);
  const bPosZ = new Float32Array(MAX_BLOOD_BURSTS);
  const bVelX = new Float32Array(MAX_BLOOD_BURSTS);
  const bVelY = new Float32Array(MAX_BLOOD_BURSTS);
  const bVelZ = new Float32Array(MAX_BLOOD_BURSTS);
  const bLife = new Float32Array(MAX_BLOOD_BURSTS);
  const bMaxLife = new Float32Array(MAX_BLOOD_BURSTS);
  const bScale = new Float32Array(MAX_BLOOD_BURSTS);
  let burstCursor = 0;

  const pPosX = new Float32Array(MAX_BLOOD_POOLS);
  const pPosY = new Float32Array(MAX_BLOOD_POOLS);
  const pPosZ = new Float32Array(MAX_BLOOD_POOLS);
  const pAge = new Float32Array(MAX_BLOOD_POOLS);
  const pMaxRadius = new Float32Array(MAX_BLOOD_POOLS);
  const pYaw = new Float32Array(MAX_BLOOD_POOLS);
  let poolCursor = 0;
  let activeBursts = 0;
  let growingPools = 0;

  const _bloodDummy = new THREE.Object3D();
  _bloodDummy.position.set(0, -500, 0);
  _bloodDummy.scale.setScalar(0.0001);
  _bloodDummy.updateMatrix();
  for (let i = 0; i < MAX_BLOOD_BURSTS; i++) bloodBurstInst.setMatrixAt(i, _bloodDummy.matrix);
  for (let i = 0; i < MAX_BLOOD_POOLS; i++) bloodPoolInst.setMatrixAt(i, _bloodDummy.matrix);
  bloodBurstInst.instanceMatrix.needsUpdate = true;
  bloodPoolInst.instanceMatrix.needsUpdate = true;

  function spawnBloodBurst(x: number, y: number, z: number, count: number, dirX = 0, dirZ = 0) {
    for (let k = 0; k < count; k++) {
      const slot = burstCursor++ % MAX_BLOOD_BURSTS;
      const ang = (slot * 2.39996 + k * 0.8) % (Math.PI * 2);
      const spd = 1.4 + ((slot * 17) % 10) * 0.24;
      bPosX[slot] = x + Math.cos(ang) * 0.08;
      bPosY[slot] = y;
      bPosZ[slot] = z + Math.sin(ang) * 0.08;
      bVelX[slot] = Math.cos(ang) * spd + dirX * 1.9;
      bVelY[slot] = 1.2 + ((slot * 13) % 7) * 0.34;
      bVelZ[slot] = Math.sin(ang) * spd + dirZ * 1.9;
      bMaxLife[slot] = 0.42 + ((slot * 7) % 5) * 0.06;
      bLife[slot] = bMaxLife[slot];
      bScale[slot] = 0.75 + ((slot * 11) % 6) * 0.16;
    }
    activeBursts = MAX_BLOOD_BURSTS;
  }

  function spawnDeathBloodPool(x: number, y: number, z: number, radiusScale = 1.0) {
    const slot = poolCursor++ % MAX_BLOOD_POOLS;
    pPosX[slot] = x;
    pPosY[slot] = y + 0.025;
    pPosZ[slot] = z;
    pAge[slot] = 0.001;
    pMaxRadius[slot] = (0.64 + ((slot * 19) % 10) * 0.032) * radiusScale;
    pYaw[slot] = (slot * 1.73) % (Math.PI * 2);
    growingPools = MAX_BLOOD_POOLS;
  }

  function playZombieSound(key: ZombieAudioKey, distM: number, volumeScale = 1.0) {
    if (typeof Audio === 'undefined' || distM > 52) return;
    const now = performance.now();
    if (now - (lastAudioTime[key] ?? 0) < 420) return;
    lastAudioTime[key] = now;
    try {
      let pool = audioPools.get(key);
      if (!pool) {
        pool = [];
        audioPools.set(key, pool);
      }
      let el = pool.find((a) => a.paused || a.ended);
      if (!el && pool.length < 3) {
        el = new Audio(AUDIO_FILES[key]);
        pool.push(el);
      }
      if (!el) return;
      const atten = Math.max(0.05, Math.min(1, (1 / (1 + distM * 0.09)) * volumeScale));
      el.volume = atten * 0.45;
      el.currentTime = 0;
      void el.play().catch(() => {});
    } catch {
      // ignore autoplay blocks
    }
  }

  // Spawn helpers grounded on actual map districts (D5 forests, D7 ghettos, light city D1-D4)
  function pickValidPoint(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    districtPrefix: string | string[],
    minRoadMargin = false
  ): { x: number; y: number; z: number; districtId: string } | null {
    const prefixes = Array.isArray(districtPrefix) ? districtPrefix : [districtPrefix];
    for (let attempt = 0; attempt < 90; attempt++) {
      const x = minX + rng() * (maxX - minX);
      const z = minZ + rng() * (maxZ - minZ);
      const label = getDistrictAt(x, z);
      const dId = label.split(' ')[0].trim();
      if (!prefixes.some((p) => dId === p)) continue;
      if (collisionWorld.resolveCircle(x, z, 0.75).hit) continue;
      const th = getTerrainHeight(x, z);
      if (th < -0.45) continue; // skip marsh pits/water
      if (minRoadMargin && getRoadElevationAt(x, z) > 0.35 && dId === 'D5') {
        // Prefer deeper woods off steep road embankments when placing forest anchors
      }
      const y = sampleGroundY(x, z);
      return { x, y, z, districtId: dId };
    }
    return null;
  }

  interface PlannedSpawn {
    x: number;
    y: number;
    z: number;
    zone: ZombieZoneKind;
    districtId: string;
    isSprinter: boolean;
    dormant: boolean;
  }

  const planned: PlannedSpawn[] = [];

  // 1. D5 Sector 4 Forests — thick woodland presence (West Dark Pine + East Sector 4 woods)
  const forestRegions: Array<[number, number, number, number, number]> = [
    [540, 880, -520, -90, 12],   // East woodland / hill slopes
    [-1250, -680, 70, 480, 10],  // West Pine dark forest
  ];
  for (const [x0, x1, z0, z1, count] of forestRegions) {
    for (let i = 0; i < count; i++) {
      const pt = pickValidPoint(x0, x1, z0, z1, 'D5', true);
      if (pt) {
        planned.push({
          ...pt,
          zone: 'forest',
          isSprinter: rng() < 0.34,
          dormant: false,
        });
      }
    }
  }

  // 2. D7 Ghettos — thick urban ruin & alleyway presence
  for (let i = 0; i < 20; i++) {
    const pt = pickValidPoint(1035, 1480, -140, 195, 'D7');
    if (pt) {
      planned.push({
        ...pt,
        zone: 'ghetto',
        isSprinter: rng() < 0.4,
        dormant: false,
      });
    }
  }

  // 3. City D1-D4 — thin strays tucked in fringes
  const cityBoxes: Array<[number, number, number, number, string]> = [
    [-260, 260, -280, 180, 'D1'],
    [280, 560, -260, 160, 'D2'],
    [-580, -220, -480, -80, 'D3'],
    [-780, -260, -100, 260, 'D4'],
  ];
  for (const [x0, x1, z0, z1, dId] of cityBoxes) {
    for (let i = 0; i < 2; i++) {
      const pt = pickValidPoint(x0, x1, z0, z1, dId);
      if (pt) {
        planned.push({
          ...pt,
          zone: 'city',
          isSprinter: rng() < 0.25,
          dormant: false,
        });
      }
    }
  }

  // 4. Dormant Outbreak Horde (spawned around D7 & D5 edges when an outbreak event triggers)
  for (let i = 0; i < 8; i++) {
    const inGhetto = i < 5;
    const pt = inGhetto
      ? pickValidPoint(1120, 1380, -60, 120, 'D7')
      : pickValidPoint(600, 820, -420, -140, 'D5');
    if (pt) {
      planned.push({
        ...pt,
        zone: 'outbreak',
        isSprinter: true,
        dormant: true,
      });
    }
  }

  // Placeholder procedural silhouette group until GLB/FBX assets finish async load
  const fallbackGeo = new THREE.CapsuleGeometry(0.28, 1.05, 4, 8);
  const fallbackMat = new THREE.MeshStandardMaterial({
    color: '#465445',
    roughness: 0.88,
    metalness: 0.05,
  });

  for (let i = 0; i < planned.length; i++) {
    const sp = planned[i];
    const agRoot = new THREE.Group();
    agRoot.name = `Zombie_${i}`;
    agRoot.position.set(sp.x, sp.y, sp.z);
    agRoot.rotation.y = rng() * Math.PI * 2;
    agRoot.visible = !sp.dormant;

    // Permanent spawn identity — rolled once at spawn and retained for life
    let zHash = (seed ^ Math.imul(i + 1, 2654435761)) >>> 0;
    zHash = Math.imul(zHash ^ (zHash >>> 15), 2246822519) >>> 0;
    const voiceSeed = (zHash ^ Math.imul(i + 31, 3266489917)) >>> 0;
    const faceIdx = Math.floor(rng() * 12);
    const fabricIdx = Math.floor(rng() * 10);
    const faceId = `zf:${faceIdx}:${voiceSeed & 255}`;
    const fabricId = `zc:${sp.zone}:${fabricIdx}`;
    agRoot.userData.spawnIdentity = { faceId, fabricId, voiceSeed };

    const proxy = new THREE.Mesh(fallbackGeo, fallbackMat);
    proxy.position.y = 0.85;
    proxy.name = 'ZombieProxy';
    agRoot.add(proxy);

    const suspMat = new THREE.SpriteMaterial({
      map: zQuestionSteps[0],
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const suspicionSprite = new THREE.Sprite(suspMat);
    suspicionSprite.scale.set(0.58, 0.58, 1);
    suspicionSprite.position.set(0, 2.08, 0);
    suspicionSprite.visible = false;
    suspicionSprite.renderOrder = 10;
    agRoot.add(suspicionSprite);

    root.add(agRoot);

    agents.push({
      id: i,
      faceId,
      fabricId,
      voiceSeed,
      zone: sp.zone,
      districtId: sp.districtId,
      x: sp.x,
      y: sp.y,
      z: sp.z,
      homeX: sp.x,
      homeZ: sp.z,
      yaw: agRoot.rotation.y,
      state: ZOMBIE_STATES.IDLE,
      clipKey: 'idle',
      hp: sp.zone === 'outbreak' ? 95 : 80,
      maxHp: sp.zone === 'outbreak' ? 95 : 80,
      alive: true,
      dying: false,
      deathTimer: 0,
      isSprinter: sp.isSprinter,
      isCrawler: false,
      detectRadius: sp.zone === 'ghetto' || sp.zone === 'outbreak' ? 24 : 18,
      suspicion: sp.dormant ? 1 : 0,
      loseSightTimer: 0,
      alertBannerTimer: 0,
      lungeBoost: 0,
      alerted: false,
      attackState: 'none',
      attackTimer: 0,
      swingDealt: false,
      wanderAngle: rng() * Math.PI * 2,
      wanderTimer: 2 + rng() * 5,
      dormant: sp.dormant,
      lowHpPlayed: false,
      spotCooldown: 0,
      root: agRoot,
      mixer: null,
      actions: {},
      activeAction: null,
      suspicionSprite,
    });
  }

  let assetsReady = false;
  let disposed = false;

  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();

  const readyPromise = (async () => {
    try {
      const [gltf, ...fbxResults] = await Promise.all([
        gltfLoader.loadAsync('/models/zombie.glb'),
        ...(Object.entries(CLIP_FILES) as Array<[ZombieClipKey, string]>).map(
          async ([key, url]) => {
            const grp = await fbxLoader.loadAsync(url);
            return [key, grp.animations[0] ?? null] as const;
          }
        ),
      ]);

      if (disposed) return;

      const proto = gltf.scene;
      proto.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(proto);
      const rawHeight = Math.max(0.1, box.max.y - box.min.y);
      const normScale = 1.78 / rawHeight;

      const boneMap = new Map<string, string>();
      proto.traverse((obj) => {
        if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
          boneMap.set(normalizeBoneKey(obj.name), obj.name);
        }
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.frustumCulled = true;
        }
      });

      const clips: Partial<Record<ZombieClipKey, THREE.AnimationClip>> = {};
      for (const [key, rawClip] of fbxResults) {
        if (rawClip) {
          clips[key] = buildClipForModel(rawClip, boneMap, key);
        }
      }

      for (const ag of agents) {
        if (disposed) return;
        const proxy = ag.root.getObjectByName('ZombieProxy');
        if (proxy) ag.root.remove(proxy);

        const clone = SkeletonUtils.clone(proto) as THREE.Group;
        clone.scale.setScalar(normScale);
        // Align feet cleanly onto y = 0
        clone.position.set(0, -box.min.y * normScale, 0);
        ag.root.add(clone);

        const mixer = new THREE.AnimationMixer(clone);
        ag.mixer = mixer;
        for (const key of Object.keys(CLIP_FILES) as ZombieClipKey[]) {
          const c = clips[key];
          if (!c) continue;
          const act = mixer.clipAction(c);
          if (key === 'death') {
            act.setLoop(THREE.LoopOnce, 1);
            act.clampWhenFinished = true;
          }
          ag.actions[key] = act;
        }

        const startClip: ZombieClipKey = ag.isCrawler ? 'crawl' : 'idle';
        const initAct = ag.actions[startClip] ?? ag.actions.idle;
        if (initAct) {
          initAct.reset().play();
          ag.activeAction = initAct;
          ag.clipKey = startClip;
        }
        // Offset starting phase so groups don't animate in lockstep
        mixer.update((ag.id % 11) * 0.23);
      }

      assetsReady = true;
    } catch (err) {
      // Keep capsule proxy fallback visible if asset fetch fails in offline test
      console.warn('ZombieSystem asset load failed:', err);
      assetsReady = true;
    }
  })();

  function switchClip(ag: ZombieAgent, targetClip: ZombieClipKey, loop: boolean, crossfade: number) {
    if (!ag.mixer) return;
    const act = ag.actions[targetClip] ?? ag.actions.idle;
    if (!act || ag.activeAction === act) return;
    act.reset();
    act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    act.clampWhenFinished = !loop;
    act.enabled = true;
    act.play();
    if (ag.activeAction) {
      ag.activeAction.crossFadeTo(act, crossfade, false);
    }
    ag.activeAction = act;
    ag.clipKey = targetClip;
  }

  // Intensity Spread outbreak scheduler: rare initial trigger, long cooldown, never stacked
  let nextOutbreakAt = 105;
  let outbreakEndAt = -1;
  let activeOutbreakDistrict: string | null = null;
  let lastElapsedSeen = 0;
  let frameCounter = 0;
  const _tmpVec = new THREE.Vector3();

  // Never stack zombie outbreaks back-to-back with intense crew/heist world events
  const unsubWorldBus = worldEventBus.subscribe((ev) => {
    if (ev.type === 'crime' && ev.kind !== 'outbreak' && ev.severity >= 0.65) {
      nextOutbreakAt = Math.max(nextOutbreakAt, lastElapsedSeen + 95);
    }
  });

  function updateBloodPools(safeDt: number) {
    if (activeBursts > 0) {
      let aliveCount = 0;
      for (let i = 0; i < MAX_BLOOD_BURSTS; i++) {
        if (bLife[i] <= 0) continue;
        bLife[i] -= safeDt;
        if (bLife[i] <= 0) {
          _bloodDummy.position.set(0, -500, 0);
          _bloodDummy.scale.setScalar(0.0001);
          _bloodDummy.updateMatrix();
          bloodBurstInst.setMatrixAt(i, _bloodDummy.matrix);
          continue;
        }
        aliveCount++;
        bVelY[i] -= 13.5 * safeDt;
        bPosX[i] += bVelX[i] * safeDt;
        bPosY[i] += bVelY[i] * safeDt;
        bPosZ[i] += bVelZ[i] * safeDt;
        const ground = sampleGroundY(bPosX[i], bPosZ[i]);
        if (bPosY[i] < ground + 0.02) {
          bPosY[i] = ground + 0.02;
          bVelX[i] *= 0.35;
          bVelZ[i] *= 0.35;
          bVelY[i] = 0;
        }
        const t = Math.max(0.1, bLife[i] / bMaxLife[i]);
        _bloodDummy.position.set(bPosX[i], bPosY[i], bPosZ[i]);
        _bloodDummy.rotation.set(0, 0, 0);
        _bloodDummy.scale.set(bScale[i], bScale[i] * (0.7 + 0.5 * t), bScale[i]);
        _bloodDummy.updateMatrix();
        bloodBurstInst.setMatrixAt(i, _bloodDummy.matrix);
      }
      bloodBurstInst.instanceMatrix.needsUpdate = true;
      if (aliveCount === 0) activeBursts = 0;
    }

    if (growingPools > 0) {
      let stillGrowing = 0;
      for (let i = 0; i < MAX_BLOOD_POOLS; i++) {
        if (pAge[i] <= 0 || pAge[i] >= 2.8) continue;
        pAge[i] = Math.min(2.8, pAge[i] + safeDt);
        const u = pAge[i] / 2.8;
        const eased = 1 - Math.pow(1 - u, 2.5);
        const r = 0.16 + (pMaxRadius[i] - 0.16) * eased;
        _bloodDummy.position.set(pPosX[i], pPosY[i], pPosZ[i]);
        _bloodDummy.rotation.set(0, pYaw[i], 0);
        _bloodDummy.scale.set(r, 1, r * 0.84);
        _bloodDummy.updateMatrix();
        bloodPoolInst.setMatrixAt(i, _bloodDummy.matrix);
        if (pAge[i] < 2.8) stillGrowing++;
      }
      bloodPoolInst.instanceMatrix.needsUpdate = true;
      if (stillGrowing === 0) growingPools = 0;
    }
  }

  function update(
    dt: number,
    elapsed: number,
    playerCtx?: ZombiePlayerContext,
    civilians?: ZombieCivilianTarget[],
    onHitCivilian?: (pedId: string, damage: number, fromPos: THREE.Vector3) => void
  ) {
    const safeDt = Math.min(0.1, Math.max(0.001, dt));
    lastElapsedSeen = elapsed;
    frameCounter++;
    const px = playerCtx?.pos.x ?? 99999;
    const py = playerCtx?.pos.y ?? 0;
    const pz = playerCtx?.pos.z ?? 99999;

    updateBloodPools(safeDt);

    // Outbreak scheduler (Intensity Spread: occasional, non-overlapping)
    if (activeOutbreakDistrict === null && elapsed >= nextOutbreakAt) {
      // Pick outbreak center near player if player is in D7 or D5, otherwise D7 ghettos
      const pDist = playerCtx ? getDistrictAt(px, pz).split(' ')[0].trim() : 'D7';
      const targetZone = pDist === 'D5' ? 'D5' : 'D7';
      let centerAgent: ZombieAgent | null = null;
      for (const ag of agents) {
        if (ag.zone === 'outbreak' && ag.dormant && ag.districtId === targetZone) {
          ag.dormant = false;
          ag.alive = true;
          ag.dying = false;
          ag.hp = ag.maxHp;
          ag.suspicion = 1;
          ag.alerted = true;
          ag.loseSightTimer = 0;
          ag.alertBannerTimer = 2.2;
          ag.root.visible = true;
          centerAgent = ag;
        }
      }
      if (centerAgent) {
        activeOutbreakDistrict = targetZone;
        outbreakEndAt = elapsed + 52;
        worldEventBus.emit({
          type: 'crime',
          kind: 'outbreak',
          x: centerAgent.x,
          y: centerAgent.y,
          z: centerAgent.z,
          districtId: targetZone,
          severity: 0.72,
        });
        worldEventBus.emit({
          type: 'chase',
          kind: 'outbreak',
          x: centerAgent.x,
          y: centerAgent.y,
          z: centerAgent.z,
          dirX: 0,
          dirZ: 1,
          radius: 42,
        });
        const dPlayer = Math.hypot(centerAgent.x - px, centerAgent.z - pz);
        playZombieSound('swarm', dPlayer, 1.0);
      }
    } else if (activeOutbreakDistrict !== null && elapsed >= outbreakEndAt) {
      activeOutbreakDistrict = null;
      // Intense outbreak gets long quiet cooldown (145-195s)
      nextOutbreakAt = elapsed + 145 + rng() * 50;
      for (const ag of agents) {
        if (ag.zone === 'outbreak') {
          ag.dormant = true;
          ag.alerted = false;
          ag.suspicion = 0;
          ag.loseSightTimer = 0;
          ag.root.visible = false;
        }
      }
    }

    // Update each active zombie
    const agentCount = agents.length;
    for (let i = 0; i < agentCount; i++) {
      const ag = agents[i];
      if (ag.dormant) continue;

      if (ag.spotCooldown > 0) ag.spotCooldown -= safeDt;
      if (ag.alertBannerTimer > 0) ag.alertBannerTimer = Math.max(0, ag.alertBannerTimer - safeDt);

      // Distance to nearest visible living target (player or nearby civilian)
      const distPlayer = Math.hypot(ag.x - px, ag.z - pz);
      let targetX = px;
      let targetZ = pz;
      let targetDist = distPlayer;
      let targetCivId: string | null = null;

      if (civilians && civilians.length > 0 && distPlayer < 90) {
        for (let ci = 0; ci < civilians.length; ci++) {
          const c = civilians[ci];
          const dc = Math.hypot(ag.x - c.x, ag.z - c.z);
          if (dc < 19 && dc < targetDist - 1.5) {
            targetDist = dc;
            targetX = c.x;
            targetZ = c.z;
            targetCivId = c.id;
          }
        }
      }

      if (!ag.alive) {
        ag.deathTimer += safeDt;
        if (ag.suspicionSprite) ag.suspicionSprite.visible = false;
        if (ag.deathTimer < 4.0) {
          ag.mixer?.update(safeDt);
        }
        continue;
      }

      // Crawler transition if injured below 30% HP while alive
      if (!ag.isCrawler && ag.hp > 0 && ag.hp <= ag.maxHp * 0.3) {
        ag.isCrawler = true;
        if (!ag.lowHpPlayed) {
          ag.lowHpPlayed = true;
          playZombieSound('lowhp', distPlayer, 0.9);
        }
      }

      // Attack cycle progression with eased lunge boost
      if (ag.attackState !== 'none') {
        ag.attackTimer += safeDt;
        if (ag.attackState === 'windup') {
          const wFrac = Math.min(1, ag.attackTimer / 0.34);
          ag.lungeBoost = wFrac * wFrac * 1.4;
          if (ag.attackTimer >= 0.34) {
            ag.attackState = 'active';
            ag.attackTimer = 0;
            ag.swingDealt = false;
          }
        } else if (ag.attackState === 'active') {
          const aFrac = Math.min(1, ag.attackTimer / 0.28);
          ag.lungeBoost = (1 - aFrac) * 4.2;
          if (!ag.swingDealt && ag.attackTimer >= 0.12) {
            ag.swingDealt = true;
            if (targetDist <= 2.35) {
              const hitDirX = (targetX - ag.x) / Math.max(0.1, targetDist);
              const hitDirZ = (targetZ - ag.z) / Math.max(0.1, targetDist);
              spawnBloodBurst(
                targetX - hitDirX * 0.25,
                ag.y + 1.15,
                targetZ - hitDirZ * 0.25,
                8,
                hitDirX,
                hitDirZ
              );
              if (targetCivId && onHitCivilian) {
                _tmpVec.set(ag.x, ag.y + 1.0, ag.z);
                onHitCivilian(targetCivId, 24, _tmpVec);
              } else if (playerCtx?.onPlayerHit && !playerCtx.inVehicle) {
                playerCtx.onPlayerHit(14);
              }
              playZombieSound('hit', distPlayer, 1.0);
            } else {
              playZombieSound('whiff', distPlayer, 0.75);
            }
          }
          if (ag.attackTimer >= 0.28) {
            ag.attackState = 'recover';
            ag.attackTimer = 0;
            ag.lungeBoost = 0;
          }
        } else if (ag.attackState === 'recover') {
          ag.lungeBoost = 0;
          if (ag.attackTimer >= 0.48) {
            ag.attackState = 'none';
            ag.attackTimer = 0;
          }
        }
      } else {
        ag.lungeBoost = 0;
        if (targetDist <= 2.1 && Math.abs(ag.y - py) < 2.6 && (ag.alerted || targetCivId !== null)) {
          ag.attackState = 'windup';
          ag.attackTimer = 0;
          ag.swingDealt = false;
        }
      }

      // Gradual "?" detection law (builds in LOS/cone, drains on LOS break, chase cooldown)
      const toTx = targetX - ag.x;
      const toTz = targetZ - ag.z;
      const fwdX = Math.sin(ag.yaw);
      const fwdZ = Math.cos(ag.yaw);
      const dot = targetDist > 0.05 ? (toTx * fwdX + toTz * fwdZ) / targetDist : 1;
      const inCone = dot >= 0.24 || targetDist < 5.0 || ag.alerted;
      const hasTargetLos =
        targetDist <= ag.detectRadius &&
        inCone &&
        collisionWorld.hasLineOfSight(ag.x, ag.z, targetX, targetZ);

      if (hasTargetLos) {
        ag.loseSightTimer = 0;
        if (!ag.alerted) {
          const proxFactor = Math.max(0.28, 1.35 - targetDist / Math.max(1, ag.detectRadius));
          ag.suspicion = Math.min(1, ag.suspicion + safeDt * proxFactor * 0.85);
          if (ag.suspicion >= 1) {
            ag.alerted = true;
            ag.alertBannerTimer = 2.1;
            if (ag.spotCooldown <= 0) {
              ag.spotCooldown = 8;
              playZombieSound('spot', distPlayer, 0.9);
            }
          }
        }
      } else {
        if (!ag.alerted) {
          ag.suspicion = Math.max(0, ag.suspicion - safeDt * 0.34);
        } else if (targetDist > ag.detectRadius * 1.45 && ag.zone !== 'outbreak') {
          ag.loseSightTimer += safeDt;
          if (ag.loseSightTimer >= 4.5 && targetDist > ag.detectRadius * 1.65) {
            ag.alerted = false;
            ag.suspicion = 0.22;
            ag.loseSightTimer = 0;
          }
        }
      }

      // Update floating "?" / "!" sprite above zombie head
      if (ag.suspicionSprite) {
        if (ag.alertBannerTimer > 0 && ag.alerted) {
          ag.suspicionSprite.visible = true;
          (ag.suspicionSprite.material as THREE.SpriteMaterial).map = zAlertBang;
        } else if (!ag.alerted && ag.suspicion > 0.03 && distPlayer < 45) {
          ag.suspicionSprite.visible = true;
          const stepIdx = Math.min(
            zQuestionSteps.length - 1,
            Math.max(0, Math.round(ag.suspicion * (zQuestionSteps.length - 1)))
          );
          (ag.suspicionSprite.material as THREE.SpriteMaterial).map = zQuestionSteps[stepIdx];
        } else {
          ag.suspicionSprite.visible = false;
        }
      }

      const evalRes = evaluateZombieState(ag.state, {
        alive: ag.alive,
        dying: ag.dying,
        distToTarget: ag.alerted ? targetDist : ag.detectRadius + 10,
        detectRadius: ag.detectRadius,
        attackState: ag.attackState,
        isSprinter: ag.isSprinter && !ag.isCrawler,
        alerted: ag.alerted,
      });
      ag.state = evalRes.nextState;

      // Determine desired animation clip
      let desiredClip: ZombieClipKey = 'idle';
      if (evalRes.nextState === ZOMBIE_STATES.DEATH) {
        desiredClip = 'death';
      } else if (evalRes.nextState === ZOMBIE_STATES.ATTACK) {
        desiredClip = targetCivId && ((ag.voiceSeed & 3) === 0) ? 'biting' : 'attack';
      } else if (ag.isCrawler) {
        desiredClip = 'crawl';
      } else if (evalRes.nextState === ZOMBIE_STATES.RUN) {
        desiredClip = 'run';
      } else if (evalRes.nextState === ZOMBIE_STATES.WALK) {
        desiredClip = 'walk';
      } else {
        // Gentle idle vs slow loiter wander around home anchor
        ag.wanderTimer -= safeDt;
        if (ag.wanderTimer <= 0) {
          ag.wanderTimer = 3.5 + rng() * 4.5;
          ag.wanderAngle = Math.atan2(ag.homeZ - ag.z, ag.homeX - ag.x) + (rng() - 0.5) * 1.4;
        }
        desiredClip = ag.wanderTimer > 2.2 ? 'walk' : 'idle';
      }

      // Spatial movement with organic cadence + lunge forward impulse
      let speedMps = 0;
      let moveYaw = ag.yaw;
      if (evalRes.nextState === ZOMBIE_STATES.RUN) {
        speedMps = 4.6;
        moveYaw = Math.atan2(targetX - ag.x, targetZ - ag.z);
      } else if (evalRes.nextState === ZOMBIE_STATES.WALK) {
        speedMps = ag.isCrawler ? 1.05 : 1.75;
        moveYaw = Math.atan2(targetX - ag.x, targetZ - ag.z);
      } else if (desiredClip === 'walk') {
        speedMps = 0.85;
        moveYaw = ag.wanderAngle;
      } else if (evalRes.nextState === ZOMBIE_STATES.ATTACK) {
        moveYaw = Math.atan2(targetX - ag.x, targetZ - ag.z);
        speedMps = ag.lungeBoost;
      } else if (ag.suspicion > 0.15) {
        moveYaw = Math.atan2(targetX - ag.x, targetZ - ag.z);
      }

      // Smooth turn
      let dyaw = moveYaw - ag.yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      ag.yaw += dyaw * Math.min(1, safeDt * 6.5);

      if (speedMps > 0.01 && targetDist > 0.85) {
        const nx = ag.x + Math.sin(ag.yaw) * speedMps * safeDt;
        const nz = ag.z + Math.cos(ag.yaw) * speedMps * safeDt;
        if (!collisionWorld.resolveCircle(nx, nz, 0.45).hit) {
          ag.x = nx;
          ag.z = nz;
          ag.y = sampleGroundY(nx, nz);
        } else {
          ag.wanderAngle += Math.PI * 0.65;
        }
      }

      // Lightweight horde separation so pressing zombies fan around target
      if (distPlayer < 55) {
        for (let j = i + 1; j < agentCount; j++) {
          const other = agents[j];
          if (other.dormant || !other.alive) continue;
          const sdx = ag.x - other.x;
          const sdz = ag.z - other.z;
          const sd2 = sdx * sdx + sdz * sdz;
          if (sd2 < 0.78 * 0.78 && sd2 > 1e-5) {
            const sd = Math.sqrt(sd2);
            const push = (0.78 - sd) * 0.45;
            const pxStep = (sdx / sd) * push;
            const pzStep = (sdz / sd) * push;
            ag.x += pxStep;
            ag.z += pzStep;
            other.x -= pxStep;
            other.z -= pzStep;
          }
        }
      }

      ag.root.position.set(ag.x, ag.y, ag.z);
      ag.root.rotation.y = ag.yaw;

      if (evalRes.changed || desiredClip !== ag.clipKey) {
        switchClip(ag, desiredClip, evalRes.loop, evalRes.crossfade);
      }

      // Distance-tiered mixer update to preserve 60fps at full 314-agent city cap
      if (ag.mixer) {
        if (distPlayer < 65 || ag.alerted) {
          ag.mixer.update(safeDt);
        } else if (distPlayer < 120 && ((frameCounter + ag.id) & 1) === 0) {
          ag.mixer.update(safeDt * 2);
        }
      }
    }
  }

  function getRayTargets(origin: THREE.Vector3, radiusM: number): FpsRayTarget[] {
    const out: FpsRayTarget[] = [];
    const r2 = radiusM * radiusM;
    for (const ag of agents) {
      if (ag.dormant || !ag.alive) continue;
      const dx = ag.x - origin.x;
      const dz = ag.z - origin.z;
      if (dx * dx + dz * dz > r2) continue;
      const halfW = ag.isCrawler ? 0.5 : 0.42;
      const height = ag.isCrawler ? 0.85 : 1.75;
      const id = `zombie_${ag.id}`;
      out.push({
        id,
        kind: 'npc',
        agentId: id,
        bounds: new THREE.Box3(
          new THREE.Vector3(ag.x - halfW, ag.y, ag.z - halfW),
          new THREE.Vector3(ag.x + halfW, ag.y + height, ag.z + halfW)
        ),
      });
    }
    return out;
  }

  function applyDamage(agentKey: string, damage: number, shooterPos?: THREE.Vector3): boolean {
    if (!agentKey.startsWith('zombie_')) return false;
    const id = Number(agentKey.slice(7));
    const ag = agents[id];
    if (!ag || !ag.alive || ag.dormant) return false;

    ag.hp -= damage;
    ag.suspicion = 1;
    ag.alerted = true;
    ag.loseSightTimer = 0;
    ag.alertBannerTimer = 1.6;
    const d = shooterPos ? Math.hypot(ag.x - shooterPos.x, ag.z - shooterPos.z) : 12;
    const dirX = shooterPos ? (ag.x - shooterPos.x) / Math.max(0.1, d) : 0;
    const dirZ = shooterPos ? (ag.z - shooterPos.z) / Math.max(0.1, d) : 0;
    spawnBloodBurst(ag.x, ag.y + (ag.isCrawler ? 0.45 : 1.2), ag.z, 10, dirX, dirZ);

    if (ag.hp <= 0) {
      ag.hp = 0;
      ag.alive = false;
      ag.dying = true;
      ag.state = ZOMBIE_STATES.DEATH;
      if (ag.suspicionSprite) ag.suspicionSprite.visible = false;
      spawnDeathBloodPool(ag.x, ag.y, ag.z, ag.zone === 'outbreak' ? 1.15 : 1.0);
      switchClip(ag, 'death', false, 0.14);
      playZombieSound('down', d, 1.0);
    } else {
      playZombieSound('hit', d, 0.9);
      if (ag.hp <= ag.maxHp * 0.3 && !ag.isCrawler) {
        ag.isCrawler = true;
        playZombieSound('lowhp', d, 0.9);
      }
    }
    return true;
  }

  return {
    root,
    agents,
    isReady: () => assetsReady,
    whenReady: () => readyPromise,
    update,
    getRayTargets,
    applyDamage,
    getSummary: () => {
      const byZone: Record<ZombieZoneKind, number> = {
        forest: 0,
        ghetto: 0,
        city: 0,
        outbreak: 0,
      };
      let alive = 0;
      for (const ag of agents) {
        if (!ag.dormant && ag.alive) {
          alive++;
          byZone[ag.zone]++;
        }
      }
      return {
        ready: assetsReady,
        total: agents.length,
        alive,
        byZone,
        activeOutbreakDistrict,
      };
    },
    dispose: () => {
      disposed = true;
      unsubWorldBus();
      fallbackGeo.dispose();
      fallbackMat.dispose();
      bloodBurstGeo.dispose();
      bloodBurstMat.dispose();
      bloodPoolGeo.dispose();
      bloodPoolMat.dispose();
      for (const ag of agents) {
        if (ag.suspicionSprite) {
          (ag.suspicionSprite.material as THREE.SpriteMaterial).dispose();
        }
      }
    },
  };
}
