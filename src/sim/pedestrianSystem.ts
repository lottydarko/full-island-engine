import * as THREE from 'three';
import {
  BUS_STOPS,
  CollisionWorld,
  GANG_TERRITORIES,
  getDistrictAt,
  getRoadElevationAt,
  getTerrainHeight,
  METRO_DOOR_QUEUE_LANES,
  mulberry32,
  ROADS,
  SIGNALIZED_INTERSECTIONS,
} from './mapData';
import { FpsRayTarget } from './fpsBridge';
import { getIntersectionSignal } from './infrastructureSystem';
import { MetroStationRuntimeInfo } from './metroSystem';
import { TextureLibrary } from './textures';
import {
  BODY_MANIFEST_MAP,
  BODY_POOL_MANIFEST,
  BodyManifestEntry,
  HairStyleType,
  HumanDressingConfig,
  HumanPoseParams,
  HumanRig,
  OutfitStyleType,
  applyHumanPose,
  createRiggedHuman,
  preloadHumanBodyPool,
} from './humanCharacter';
import {
  createSharedWeaponMesh,
  fireSharedWeapon,
  SHARED_WEAPON_SPEC,
  SharedWeaponFxPool,
} from './sharedWeapon';
import { worldEventBus } from './worldEventBus';

const PED_CAPSULE_RADIUS = 0.34;
const PED_MIN_SEP = PED_CAPSULE_RADIUS * 2; // 0.68 m hard capsule separation
const PED_MIN_SEP2 = PED_MIN_SEP * PED_MIN_SEP;
const POLITE_PASS_DIST = 1.1;
const POLITE_PASS_DIST2 = POLITE_PASS_DIST * POLITE_PASS_DIST;
const HASH_SIZE = 2048;
const HASH_CELL_SIZE = 2.0;
const INV_CELL_SIZE = 1 / HASH_CELL_SIZE;

const MUTTER_LINES = [
  'Watch it!',
  'Mind the space!',
  'Hey, watch where you walk.',
  'Excuse you.',
  'Easy there!',
];

export type PedPersonality = 'polite' | 'rude';

export interface PedAgent {
  id: string;
  bodyId: string;
  outfitId: OutfitStyleType;
  heightM: number;
  eyeHeightM: number;
  faceId: string;
  fabricId: string;
  voiceSeed: number;
  role: PedRole;
  civClass: CivilianClass;
  personality: PedPersonality;
  rudeCooldown: number;
  upsetTimer: number;
  upsetLookYaw: number;
  sidestepYaw: number;
  targetSidestep: number;
  nodTimer: number;
  nodCooldown: number;
  impulseX: number;
  impulseZ: number;
  mutterText: string;
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevZ: number;
  vx: number;
  vz: number;
  baseX: number;
  baseZ: number;
  targetX: number;
  targetZ: number;
  heading: number;
  speed: number;
  stridePhase: number;
  idlePhase: number;
  heightScale: number;
  buildScale: number;
  hasProp: boolean;
  hasScarf: boolean;
  coatLenScale: number;
  hairFlowScale: number;
  usesCap: boolean;
  // Role-specific binding
  segIdx: number;
  segProgress: number;
  segDir: 1 | -1;
  ixIdx: number;
  crossAxis: 'ns' | 'ew'; // 'ns' crosses N-S road (walks E-W); 'ew' crosses E-W road (walks N-S)
  crossState: 'wait' | 'crossing';
  crossStartX: number;
  crossStartZ: number;
  crossEndX: number;
  crossEndZ: number;
  crossU: number;
  busStopIdx: number;
  metroStationIdx: number;
  stationYaw: number;
  // Gang & reaction state
  hp: number;
  alive: boolean;
  respawnTimer: number;
  fleeTimer: number;
  fleeDirX: number;
  fleeDirZ: number;
  crewIdx: number;
  memberSlot: number;
  formOffX: number;
  formOffZ: number;
  suspicion: number; // 0..1
  alertBannerTimer: number;
  burstCooldown: number;
  burstShotsLeft: number;
  burstShotTimer: number;
  aiming: boolean;
}

export interface PedPlayerContext {
  pos: THREE.Vector3;
  inVehicle: boolean;
  speedKmh: number;
  onPlayerHit?: (damage: number) => void;
  onGunshotSound?: (distM: number) => void;
}

export interface GangCrewDebugInfo {
  id: string;
  districtId: string;
  state: 'patrol' | 'alert' | 'search' | 'returning';
  anchorX: number;
  anchorZ: number;
  maxSuspicion: number;
  memberCount: number;
}

export interface PedestrianSystemHandles {
  root: THREE.Group;
  totalCount: number;
  readonly agents: readonly PedAgent[];
  update: (
    dt: number,
    elapsed: number,
    busStopArrivals?: boolean[],
    metroTrainFlags?: boolean[],
    playerPosOrCtx?: THREE.Vector3 | PedPlayerContext
  ) => void;
  reseed: (newSeed?: number) => void;
  getRayTargets: (origin: THREE.Vector3, radiusM: number) => FpsRayTarget[];
  getActiveSubtitle: (x: number, y: number, z: number) => string;
  applyDamageToAgent: (agentId: string, damage: number, attackerPos?: THREE.Vector3) => boolean;
  notifyPlayerGunshot: (x: number, y: number, z: number) => void;
  getHiddenHeat: () => number;
  getGangCrewStates: () => GangCrewDebugInfo[];
}

type CivilianClass =
  | 'executive'
  | 'commuter'
  | 'working_class'
  | 'streetwear_youth'
  | 'elder'
  | 'nightlife_patron'
  | 'student_runner'
  | 'transit_guard'
  | 'gang_member';

type PedRole = 'sidewalk' | 'crosswalk' | 'bus_wait' | 'metro_plat' | 'metro_street' | 'gang';

interface OutfitPalette {
  jacket: string[];
  pants: string[];
  boots: string[];
  hat: string[];
  prop: string[];
  hasPropChance: number;
  heightRange: [number, number];
  buildScale: number;
}

const CLASS_OUTFITS: Record<CivilianClass, OutfitPalette> = {
  executive: {
    jacket: ['#1a202c', '#262b36', '#2b2420', '#1c2a3a'],
    pants: ['#161a22', '#22262e', '#1e2028'],
    boots: ['#111316', '#281a14'],
    hat: ['#181c22', '#2d2622', '#3a2c24'],
    prop: ['#2a1d14', '#181a20', '#402c1e'], // leather briefcase
    hasPropChance: 0.85,
    heightRange: [0.97, 1.07],
    buildScale: 1.02,
  },
  commuter: {
    jacket: ['#3a4856', '#5c4b3b', '#2c3d35', '#463848', '#2a384a'],
    pants: ['#1f252e', '#2d333b', '#26242c'],
    boots: ['#1a1c20', '#302218'],
    hat: ['#242830', '#4a3a2e', '#2a3a44'],
    prop: ['#2c3540', '#543c2c', '#1e2832'], // messenger bag
    hasPropChance: 0.72,
    heightRange: [0.94, 1.05],
    buildScale: 0.98,
  },
  working_class: {
    jacket: ['#7c4a1c', '#3c4a38', '#444b52', '#9e5a18', '#2f3c48'],
    pants: ['#232a34', '#2d312c', '#1e242c'],
    boots: ['#2e2218', '#181a1c'],
    hat: ['#c89a22', '#2b3036', '#4a3626'], // knit beanie or hardhat
    prop: ['#4c483c', '#323840', '#6a4620'], // tool/duffel bag
    hasPropChance: 0.55,
    heightRange: [0.96, 1.08],
    buildScale: 1.08,
  },
  streetwear_youth: {
    jacket: ['#7a1e2e', '#1c5666', '#8a5e1c', '#46265c', '#265c42', '#38465e'],
    pants: ['#1a1e26', '#28303e', '#34302c', '#22262e'],
    boots: ['#cfd6de', '#2a2e36', '#8c2832'],
    hat: ['#181c24', '#7a202c', '#284a5a', '#4a3e32'],
    prop: ['#242a34', '#582230', '#204452'], // backpack
    hasPropChance: 0.68,
    heightRange: [0.91, 1.02],
    buildScale: 0.95,
  },
  elder: {
    jacket: ['#4a423a', '#3d3436', '#36403a', '#52483c'],
    pants: ['#242428', '#2e2a26', '#22282a'],
    boots: ['#1c1a18', '#2a201a'],
    hat: ['#483e36', '#645c54', '#2e2824'], // fur ushanka / wool hat
    prop: ['#5a4c3e', '#3e4a44', '#6a403a'], // shopping tote
    hasPropChance: 0.78,
    heightRange: [0.87, 0.95],
    buildScale: 0.96,
  },
  nightlife_patron: {
    jacket: ['#581834', '#182c42', '#3a1c4a', '#1e1c24', '#68242c'],
    pants: ['#14161c', '#1c1e26', '#261822'],
    boots: ['#141418', '#381822'],
    hat: ['#1a1820', '#5a2038', '#2e221e'],
    prop: ['#2a1824', '#1a1c24'],
    hasPropChance: 0.45,
    heightRange: [0.92, 1.04],
    buildScale: 0.94,
  },
  student_runner: {
    jacket: ['#284b6e', '#2e5c48', '#6e3438', '#4c4266', '#5c5234'],
    pants: ['#1d222b', '#262c36', '#2a2a30'],
    boots: ['#b8c2cc', '#34404e', '#6e2c2c'],
    hat: ['#2a2420', '#483424', '#1c2028', '#5c4632'],
    prop: ['#22384c', '#58282c', '#2a4034'], // backpack
    hasPropChance: 0.88,
    heightRange: [0.92, 1.03],
    buildScale: 0.94,
  },
  transit_guard: {
    jacket: ['#1c2c40', '#203044', '#263444'],
    pants: ['#141e2c', '#182230'],
    boots: ['#101216'],
    hat: ['#182436', '#202c3e'],
    prop: ['#242830', '#3c424c'],
    hasPropChance: 0.5,
    heightRange: [0.99, 1.08],
    buildScale: 1.07,
  },
  // 2059 Russia darker tactical trench & street cyber-coat silhouette
  gang_member: {
    jacket: ['#14171e', '#1e1418', '#171c22', '#21191d'],
    pants: ['#0e1015', '#15141a', '#12161c'],
    boots: ['#090a0d', '#181414'],
    hat: ['#101218', '#2a1218', '#1a1c22'],
    prop: ['#12141a'],
    hasPropChance: 0,
    heightRange: [0.98, 1.08],
    buildScale: 1.08,
  },
};

const SKIN_TONES = ['#e2bea6', '#d2a98e', '#be9174', '#eccab4', '#9e7256', '#d6ae94'];
const HAIR_TONES = ['#1c1816', '#36261c', '#563e2a', '#866b4c', '#68301e', '#7c7e84', '#241e1a'];
const SCARF_TONES = ['#a2343e', '#366e80', '#ba8c44', '#54704e', '#805a76', '#d8cec0'];
const ALL_CLASSES: CivilianClass[] = [
  'executive',
  'commuter',
  'working_class',
  'streetwear_youth',
  'elder',
  'nightlife_patron',
  'student_runner',
  'transit_guard',
];

const CLASS_OUTFIT_POOL: Record<CivilianClass, OutfitStyleType[]> = {
  executive: ['tailored_blazer', 'trench_coat'],
  commuter: ['trench_coat', 'cardigan_scarf', 'puffer_jacket', 'tailored_blazer'],
  working_class: ['metro_worker', 'rail_engineer', 'puffer_jacket', 'hoodie_parka'],
  streetwear_youth: ['hoodie_parka', 'leather_biker', 'puffer_jacket'],
  elder: ['cardigan_scarf', 'trench_coat'],
  nightlife_patron: ['leather_biker', 'tailored_blazer', 'trench_coat'],
  student_runner: ['hoodie_parka', 'puffer_jacket', 'cardigan_scarf'],
  transit_guard: ['transit_security'],
  gang_member: ['gang_2059'],
};

function assignBodyManifest(
  civClass: CivilianClass,
  districtId: string,
  rng: () => number
): BodyManifestEntry {
  let totalWeight = 0;
  const weights = new Float64Array(BODY_POOL_MANIFEST.length);
  for (let i = 0; i < BODY_POOL_MANIFEST.length; i++) {
    const entry = BODY_POOL_MANIFEST[i];
    const b = entry.build;
    let w = 1.0;

    if (civClass === 'elder') {
      w = entry.ageBand === 'elder' ? 14.0 : 0.08;
    } else {
      if (entry.ageBand === 'elder') w *= 0.12;
      if (civClass === 'working_class' || civClass === 'transit_guard' || civClass === 'gang_member') {
        if (/(broad|heavy|thick|muscular|sturdy)/i.test(b)) w *= 3.0;
        if (entry.ageBand === 'adult' || entry.ageBand === 'middle-aged') w *= 1.4;
      } else if (civClass === 'student_runner' || civClass === 'streetwear_youth') {
        if (entry.ageBand === 'young-adult') w *= 3.2;
        if (/(slim|lean|toned)/i.test(b)) w *= 2.4;
      } else if (civClass === 'nightlife_patron') {
        if (entry.ageBand === 'young-adult') w *= 2.4;
        if (/(toned|tall-lean|slim)/i.test(b)) w *= 2.2;
      } else if (civClass === 'executive') {
        if (entry.ageBand === 'middle-aged' || entry.ageBand === 'adult') w *= 2.0;
        if (/(trim|tall-lean|average|composed)/i.test(b)) w *= 1.8;
      }
    }

    // District character flavor (D8 dock/industrial -> sturdier builds; D1 nightlife -> leaner/taller)
    if (districtId === 'D8' && /(broad|heavy|thick|sturdy|muscular)/i.test(b)) {
      w *= 1.45;
    } else if (districtId === 'D1' && /(young-adult)/.test(entry.ageBand) && /(slim|lean|toned|tall)/i.test(b)) {
      w *= 1.35;
    }

    weights[i] = w;
    totalWeight += w;
  }

  let pickRoll = rng() * totalWeight;
  for (let i = 0; i < BODY_POOL_MANIFEST.length; i++) {
    pickRoll -= weights[i];
    if (pickRoll <= 0) return BODY_POOL_MANIFEST[i];
  }
  return BODY_POOL_MANIFEST[0];
}

function pickOutfitForClass(civClass: CivilianClass, rng: () => number): OutfitStyleType {
  const pool = CLASS_OUTFIT_POOL[civClass];
  return pool[Math.floor(rng() * pool.length)];
}

function pickHairStyleForAgent(
  gender: BodyManifestEntry['gender'],
  usesCap: boolean,
  voiceSeed: number
): HairStyleType {
  if (usesCap) {
    return (voiceSeed & 1) === 0 ? 'knit_beanie' : 'newsboy_cap';
  }
  if (gender === 'female') {
    const styles: HairStyleType[] = ['long_flowing', 'bob_cut', 'ponytail', 'side_part'];
    return styles[voiceSeed % styles.length];
  }
  const styles: HairStyleType[] = ['short_cropped', 'side_part', 'long_flowing', 'short_cropped'];
  return styles[voiceSeed % styles.length];
}

interface SidewalkSegment {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  len: number;
  dirX: number;
  dirZ: number;
  nextEnd: { segIdx: number; dir: 1 | -1 }[];
  nextStart: { segIdx: number; dir: 1 | -1 }[];
}

function buildSidewalkSegments(): SidewalkSegment[] {
  const segs: SidewalkSegment[] = [];
  for (let r = 0; r < ROADS.length; r++) {
    const road = ROADS[r];
    if (road.kind === 'ramp' || road.kind === 'bridge') continue;
    const pts = road.points;
    if (pts.length < 2) continue;
    // Place sidewalk neatly on the raised concrete sidewalk centerline (road.width * 0.5 + 1.68m)
    const offset = road.width * 0.5 + 1.68;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 16) continue;
      const dirX = dx / len;
      const dirZ = dz / len;
      const nx = -dirZ;
      const nz = dirX;
      // Add both left & right sidewalks (inset 6m from intersections so walkers stay clean)
      const inset = Math.min(6.5, len * 0.18);
      for (const side of [-1, 1]) {
        const sx0 = a.x + dirX * inset + nx * offset * side;
        const sz0 = a.z + dirZ * inset + nz * offset * side;
        const sx1 = b.x - dirX * inset + nx * offset * side;
        const sz1 = b.z - dirZ * inset + nz * offset * side;
        const slen = Math.hypot(sx1 - sx0, sz1 - sz0);
        if (slen > 10) {
          segs.push({
            x0: sx0,
            z0: sz0,
            x1: sx1,
            z1: sz1,
            len: slen,
            dirX,
            dirZ,
            nextEnd: [],
            nextStart: [],
          });
        }
      }
    }
  }

  // Build sidewalk corner & continuing connectivity graph so walkers transition seamlessly across blocks
  const linkRadius = 24;
  for (let i = 0; i < segs.length; i++) {
    const a = segs[i];
    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue;
      const b = segs[j];
      if (Math.hypot(b.x0 - a.x1, b.z0 - a.z1) < linkRadius) a.nextEnd.push({ segIdx: j, dir: 1 });
      if (Math.hypot(b.x1 - a.x1, b.z1 - a.z1) < linkRadius) a.nextEnd.push({ segIdx: j, dir: -1 });
      if (Math.hypot(b.x0 - a.x0, b.z0 - a.z0) < linkRadius) a.nextStart.push({ segIdx: j, dir: 1 });
      if (Math.hypot(b.x1 - a.x0, b.z1 - a.z0) < linkRadius) a.nextStart.push({ segIdx: j, dir: -1 });
    }
  }
  return segs;
}

interface GangCrewRuntime {
  id: string;
  districtId: 'D1' | 'D8';
  anchorX: number;
  anchorZ: number;
  homeAnchorX: number;
  homeAnchorZ: number;
  patrolPoints: { x: number; z: number }[];
  patrolIdx: number;
  patrolHoldTimer: number;
  state: 'patrol' | 'alert' | 'search' | 'returning';
  lastSeenX: number;
  lastSeenZ: number;
  searchTimer: number;
  escapeTimer: number;
  memberIndices: number[];
}

let _qMarkTextures: THREE.CanvasTexture[] | null = null;
let _alertBangTexture: THREE.CanvasTexture | null = null;

function getSuspicionTextures(): {
  questionSteps: THREE.CanvasTexture[];
  alertBang: THREE.CanvasTexture;
} {
  if (_qMarkTextures && _alertBangTexture) {
    return { questionSteps: _qMarkTextures, alertBang: _alertBangTexture };
  }

  const steps: THREE.CanvasTexture[] = [];
  const STEPS = 16;
  for (let s = 0; s <= STEPS; s++) {
    const frac = s / STEPS;
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 96, 96);

    // Subtle dark backing pill
    ctx.fillStyle = 'rgba(8, 12, 18, 0.72)';
    ctx.beginPath();
    ctx.arc(48, 48, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = frac > 0.7 ? '#f97316' : '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Base un-filled '?'
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
    ctx.fillText('?', 48, 50);

    // Bottom-to-top filling '?'
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
  actx.fillStyle = 'rgba(127, 29, 29, 0.9)';
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

  _qMarkTextures = steps;
  _alertBangTexture = aTex;
  return { questionSteps: steps, alertBang: aTex };
}

export function buildPedestrianSystem(
  textures: TextureLibrary,
  metroStations: MetroStationRuntimeInfo[],
  collisionWorld?: CollisionWorld
): PedestrianSystemHandles {
  const root = new THREE.Group();
  const sidewalkSegs = buildSidewalkSegments();
  let seed = (Date.now() ^ 0x4b2a19f3) >>> 0;
  let rng = mulberry32(seed);

  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  const agents: PedAgent[] = [];
  const crews: GangCrewRuntime[] = [];
  let hiddenHeat = 0; // 0..100 GTA-style hidden heat (NO HUD element!)

  const weaponFxPool = new SharedWeaponFxPool(24);
  root.add(weaponFxPool.root);
  const { questionSteps, alertBang } = getSuspicionTextures();
  const gangVisuals = new Map<
    number,
    { weapon: THREE.Group; suspicionSprite: THREE.Sprite }
  >();

  const spawnAgents = () => {
    agents.length = 0;
    let nextId = 0;

    const makeBaseAgent = (role: PedRole, civClass: CivilianClass): PedAgent => {
      const idx = nextId++;
      const id = `ped_${idx}`;
      const pal = CLASS_OUTFITS[civClass];
      const [hMin, hMax] = pal.heightRange;
      const isLongCoatClass =
        civClass === 'executive' ||
        civClass === 'elder' ||
        civClass === 'commuter' ||
        civClass === 'transit_guard' ||
        civClass === 'gang_member';
      const isRude = civClass !== 'transit_guard' && civClass !== 'gang_member' && rng() < 0.15;

      // Permanent spawn identity — rolled once at spawn and retained for life
      let hash = (seed ^ Math.imul(idx + 1, 2654435761)) >>> 0;
      hash = Math.imul(hash ^ (hash >>> 15), 2246822519) >>> 0;
      const voiceSeed = (hash ^ Math.imul(idx + 17, 3266489917)) >>> 0;
      const skinIdx = Math.floor(rng() * SKIN_TONES.length);
      const hairIdx = Math.floor(rng() * HAIR_TONES.length);
      const jacketIdx = Math.floor(rng() * pal.jacket.length);
      const pantsIdx = Math.floor(rng() * pal.pants.length);
      const bootsIdx = Math.floor(rng() * pal.boots.length);
      const scarfIdx = Math.floor(rng() * SCARF_TONES.length);
      const hatIdx = Math.floor(rng() * pal.hat.length);
      const propIdx = Math.floor(rng() * pal.prop.length);
      const faceId = `f:${skinIdx}:${hairIdx}:${(voiceSeed >>> 0) & 255}`;
      const fabricId = `c:${jacketIdx}:${pantsIdx}:${bootsIdx}:${scarfIdx}:${hatIdx}:${propIdx}`;
      const outfitId = pickOutfitForClass(civClass, rng);
      const placeholderBody = BODY_POOL_MANIFEST[0];

      return {
        id,
        bodyId: placeholderBody.bodyId,
        outfitId,
        heightM: placeholderBody.heightM,
        eyeHeightM: placeholderBody.heightM * 0.9126,
        faceId,
        fabricId,
        voiceSeed,
        role,
        civClass,
        personality: isRude ? 'rude' : 'polite',
        rudeCooldown: isRude ? rng() * 6.0 : 0,
        upsetTimer: 0,
        upsetLookYaw: 0,
        sidestepYaw: 0,
        targetSidestep: 0,
        nodTimer: 0,
        nodCooldown: 0,
        impulseX: 0,
        impulseZ: 0,
        mutterText: '',
        x: 0,
        y: 0.08,
        z: 0,
        prevX: 0,
        prevZ: 0,
        vx: 0,
        vz: 0,
        baseX: 0,
        baseZ: 0,
        targetX: 0,
        targetZ: 0,
        heading: rng() * Math.PI * 2,
        speed:
          civClass === 'elder'
            ? 0.92
            : civClass === 'student_runner'
            ? 1.85
            : civClass === 'gang_member'
            ? 1.45 + rng() * 0.25
            : 1.25 + rng() * 0.48,
        stridePhase: rng() * Math.PI * 2,
        idlePhase: rng() * Math.PI * 2,
        heightScale: hMin + rng() * (hMax - hMin),
        buildScale: pal.buildScale * (0.94 + rng() * 0.12),
        hasProp: rng() < pal.hasPropChance,
        hasScarf:
          civClass === 'gang_member'
            ? rng() < 0.72
            : civClass !== 'transit_guard' && rng() < 0.56,
        coatLenScale: isLongCoatClass ? 0.86 + rng() * 0.24 : 0.52 + rng() * 0.24,
        hairFlowScale: 0.85 + rng() * 0.45,
        usesCap:
          civClass === 'transit_guard' ||
          (civClass === 'gang_member' && rng() < 0.62) ||
          (civClass === 'working_class' && rng() < 0.42),
        segIdx: 0,
        segProgress: 0,
        segDir: rng() > 0.5 ? 1 : -1,
        ixIdx: -1,
        crossAxis: 'ns',
        crossState: 'wait',
        crossStartX: 0,
        crossStartZ: 0,
        crossEndX: 0,
        crossEndZ: 0,
        crossU: 0,
        busStopIdx: -1,
        metroStationIdx: -1,
        stationYaw: 0,
        hp: civClass === 'gang_member' ? 100 : 50,
        alive: true,
        respawnTimer: 0,
        fleeTimer: 0,
        fleeDirX: 0,
        fleeDirZ: 0,
        crewIdx: -1,
        memberSlot: 0,
        formOffX: 0,
        formOffZ: 0,
        suspicion: 0,
        alertBannerTimer: 0,
        burstCooldown: 0.35 + rng() * 0.65,
        burstShotsLeft: 0,
        burstShotTimer: 0,
        aiming: false,
      };
    };

    // 1. SIDEWALK WALKERS (104 civilians + 20 gang crew members = exact 314 existing cap!)
    const sidewalkCount = 104;
    for (let i = 0; i < sidewalkCount; i++) {
      const civClass = ALL_CLASSES[i % ALL_CLASSES.length];
      const ag = makeBaseAgent('sidewalk', civClass);
      const segIdx = Math.floor(rng() * Math.max(1, sidewalkSegs.length));
      const seg = sidewalkSegs[segIdx];
      if (seg) {
        ag.segIdx = segIdx;
        ag.segProgress = rng() * seg.len;
        ag.x = seg.x0 + seg.dirX * ag.segProgress;
        ag.z = seg.z0 + seg.dirZ * ag.segProgress;
        ag.prevX = ag.x;
        ag.prevZ = ag.z;
        ag.heading = Math.atan2(seg.dirX * ag.segDir, seg.dirZ * ag.segDir);
      }
      agents.push(ag);
    }

    // 2. CROSSWALK WAITERS & CROSSERS (72 civilians — 4 per each of the 18 Signalized Intersections)
    for (let ixIdx = 0; ixIdx < SIGNALIZED_INTERSECTIONS.length; ixIdx++) {
      const ix = SIGNALIZED_INTERSECTIONS[ixIdx];
      for (let k = 0; k < 4; k++) {
        const civClass = ALL_CLASSES[(ixIdx * 3 + k) % ALL_CLASSES.length];
        const ag = makeBaseAgent('crosswalk', civClass);
        ag.ixIdx = ixIdx;
        const isNS = k < 2;
        ag.crossAxis = isNS ? 'ns' : 'ew';
        const sideSign = k % 2 === 0 ? 1 : -1;
        const startSign = rng() > 0.5 ? 1 : -1;

        if (isNS) {
          const zLane = ix.z + sideSign * (ix.halfSpanEW + 1.8) + (k % 2 === 0 ? -0.45 : 0.45);
          const xSpan = ix.halfSpanNS + 1.6;
          ag.crossStartX = ix.x + startSign * xSpan;
          ag.crossStartZ = zLane;
          ag.crossEndX = ix.x - startSign * xSpan;
          ag.crossEndZ = zLane;
        } else {
          const xLane = ix.x + sideSign * (ix.halfSpanNS + 1.8) + (k % 2 === 0 ? -0.45 : 0.45);
          const zSpan = ix.halfSpanEW + 1.6;
          ag.crossStartX = xLane;
          ag.crossStartZ = ix.z + startSign * zSpan;
          ag.crossEndX = xLane;
          ag.crossEndZ = ix.z - startSign * zSpan;
        }
        ag.x = ag.crossStartX;
        ag.z = ag.crossStartZ;
        ag.prevX = ag.x;
        ag.prevZ = ag.z;
        ag.heading = Math.atan2(ag.crossEndX - ag.crossStartX, ag.crossEndZ - ag.crossStartZ);
        ag.crossState = 'wait';
        ag.crossU = 0;
        agents.push(ag);
      }
    }

    // 3. BUS STOP WAITERS (54 civilians — 3 per each of the 18 Bus Stops)
    for (let bIdx = 0; bIdx < BUS_STOPS.length; bIdx++) {
      const bs = BUS_STOPS[bIdx];
      const cosR = Math.cos(bs.rotY);
      const sinR = Math.sin(bs.rotY);
      for (let w = 0; w < 3; w++) {
        const civClass = ALL_CLASSES[(bIdx * 2 + w) % ALL_CLASSES.length];
        const ag = makeBaseAgent('bus_wait', civClass);
        ag.busStopIdx = bIdx;
        const lx = -1.6 + w * 1.55 + (rng() - 0.5) * 0.28;
        const lz = 0.25 + (w === 1 ? 0.34 : -0.15);
        ag.baseX = bs.x + lx * cosR + lz * sinR;
        ag.baseZ = bs.z - lx * sinR + lz * cosR;
        ag.x = ag.baseX;
        ag.z = ag.baseZ;
        ag.prevX = ag.x;
        ag.prevZ = ag.z;
        ag.heading = bs.rotY + (rng() - 0.5) * 0.45;
        ag.stationYaw = bs.rotY;
        agents.push(ag);
      }
    }

    // 4. METRO STATION COMMUTERS (aligned cleanly into Spec 5 platform queue lanes flanking train doors!)
    for (let sIdx = 0; sIdx < metroStations.length; sIdx++) {
      const st = metroStations[sIdx];
      const cosY = Math.cos(st.yaw);
      const sinY = Math.sin(st.yaw);
      const centerX = st.platWorldX - -4.8 * cosY; // station spline origin X
      const centerZ = st.platWorldZ + -4.8 * sinY; // station spline origin Z
      for (let p = 0; p < 8; p++) {
        const isElevated = p < 5;
        const civClass =
          p === 0
            ? 'transit_guard'
            : ALL_CLASSES[(sIdx * 3 + p) % ALL_CLASSES.length];
        const ag = makeBaseAgent(isElevated ? 'metro_plat' : 'metro_street', civClass);
        ag.metroStationIdx = sIdx;
        ag.stationYaw = st.yaw;

        if (isElevated) {
          if (p === 0) {
            // Guard stands clear between center doorways (x=-3.2, z=0)
            const acrossX = -3.2;
            const alongZ = 0.0;
            ag.baseX = centerX + acrossX * cosY + alongZ * sinY;
            ag.baseZ = centerZ - acrossX * sinY + alongZ * cosY;
          } else {
            // Queue cleanly inside flanking METRO_DOOR_QUEUE_LANES (leaving central door corridor open!)
            const slotIdx = (sIdx * 4 + (p - 1) * 3) % METRO_DOOR_QUEUE_LANES.length;
            const slot = METRO_DOOR_QUEUE_LANES[slotIdx];
            ag.baseX = centerX + slot.localX * cosY + slot.localZ * sinY;
            ag.baseZ = centerZ - slot.localX * sinY + slot.localZ * cosY;
          }
          ag.y = st.platWorldY;
          ag.heading = st.yaw + Math.PI * 0.5;
        } else {
          const alongZ = -3.8 + (p - 5) * 3.8 + (rng() - 0.5) * 0.8;
          const acrossX = (rng() - 0.5) * 1.4;
          ag.baseX = st.streetX + acrossX * cosY + alongZ * sinY;
          ag.baseZ = st.streetZ - acrossX * sinY + alongZ * cosY;
          ag.y = 0.08;
          ag.heading = st.yaw - Math.PI * 0.5 + (rng() - 0.5) * 0.9;
        }
        ag.x = ag.baseX;
        ag.z = ag.baseZ;
        ag.prevX = ag.x;
        ag.prevZ = ag.z;
        agents.push(ag);
      }
    }

    // 5. 2059 RUSSIA GANG CREWS (Crews of 3-5 in D8 Black Market Quay & D1 Nightlife)
    crews.length = 0;
    gangVisuals.forEach((v) => {
      v.weapon.parent?.remove(v.weapon);
      root.remove(v.suspicionSprite);
    });
    gangVisuals.clear();

    for (let cIdx = 0; cIdx < GANG_TERRITORIES.length; cIdx++) {
      const terr = GANG_TERRITORIES[cIdx];
      const memberIndices: number[] = [];
      for (let m = 0; m < terr.crewSize; m++) {
        const ag = makeBaseAgent('gang', 'gang_member');
        const angle = (m / terr.crewSize) * Math.PI * 2 + 0.4;
        const rad = 2.0 + (m % 2) * 1.4;
        ag.crewIdx = cIdx;
        ag.memberSlot = m;
        ag.formOffX = Math.cos(angle) * rad;
        ag.formOffZ = Math.sin(angle) * rad;
        ag.x = terr.anchorX + ag.formOffX;
        ag.z = terr.anchorZ + ag.formOffZ;
        const groundY = Math.max(0.08, getTerrainHeight(ag.x, ag.z));
        ag.y = terr.districtId === 'D8' && ag.x > 1560 ? Math.max(groundY, 1.52) : groundY;
        ag.baseX = ag.x;
        ag.baseZ = ag.z;
        ag.prevX = ag.x;
        ag.prevZ = ag.z;
        ag.heading = angle + Math.PI * 0.5;
        const idx = agents.length;
        agents.push(ag);
        memberIndices.push(idx);

        // Shared weapon in hand + filling "?" suspicion sprite above head
        const weapon = createSharedWeaponMesh(0.95);
        weapon.position.set(0.0, -0.055, 0.025);
        weapon.rotation.set(Math.PI * 0.5, 0, 0);
        const spriteMat = new THREE.SpriteMaterial({
          map: questionSteps[0],
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        const suspicionSprite = new THREE.Sprite(spriteMat);
        suspicionSprite.scale.set(0.62, 0.62, 1);
        suspicionSprite.visible = false;
        suspicionSprite.renderOrder = 10;
        root.add(suspicionSprite);
        gangVisuals.set(idx, { weapon, suspicionSprite });
      }
      crews.push({
        id: terr.id,
        districtId: terr.districtId,
        anchorX: terr.anchorX,
        anchorZ: terr.anchorZ,
        homeAnchorX: terr.anchorX,
        homeAnchorZ: terr.anchorZ,
        patrolPoints: terr.patrolPoints,
        patrolIdx: 0,
        patrolHoldTimer: 1.5,
        state: 'patrol',
        lastSeenX: terr.anchorX,
        lastSeenZ: terr.anchorZ,
        searchTimer: 0,
        escapeTimer: 0,
        memberIndices,
      });
    }

    // Assign real MakeHuman pool bodies weighted by class + spawn district (kept for life)
    for (let i = 0; i < agents.length; i++) {
      const ag = agents[i];
      const distId = getDistrictAt(ag.x, ag.z);
      const body = assignBodyManifest(ag.civClass, distId, rng);
      ag.bodyId = body.bodyId;
      ag.heightM = body.heightM;
      ag.eyeHeightM = body.heightM * 0.9126;
      ag.heightScale = body.heightM / 1.694;
    }
  };

  spawnAgents();
  const totalCount = agents.length;

  // Flat zero-GC spatial hash buffers
  const cellHead = new Int32Array(HASH_SIZE);
  const nextAgent = new Int32Array(Math.max(1, totalCount));

  const hashCoord = (gx: number, gz: number): number => {
    const h = (Math.imul(gx, 73856093) ^ Math.imul(gz, 19349663)) & (HASH_SIZE - 1);
    return h;
  };

  // Start async preloading of all 50 MakeHuman GLBs (load once, clone per agent)
  preloadHumanBodyPool();

  const pedRigsRoot = new THREE.Group();
  root.add(pedRigsRoot);
  const pedRigs: HumanRig[] = [];
  const pedPoseSynced = new Uint8Array(Math.max(1, totalCount));
  let frameCounter = 0;

  const buildAgentDressing = (ag: PedAgent, body: BodyManifestEntry): HumanDressingConfig => {
    const pal = CLASS_OUTFIT_POOL[ag.civClass];
    void pal;
    const outfitPal = CLASS_OUTFITS[ag.civClass];
    const fParts = ag.faceId.split(':');
    const cParts = ag.fabricId.split(':');
    const skinIdx = (Number(fParts[1]) || 0) % SKIN_TONES.length;
    const hairIdx = (Number(fParts[2]) || 0) % HAIR_TONES.length;
    const jacketIdx = (Number(cParts[1]) || 0) % outfitPal.jacket.length;
    const pantsIdx = (Number(cParts[2]) || 0) % outfitPal.pants.length;
    const bootsIdx = (Number(cParts[3]) || 0) % outfitPal.boots.length;
    const scarfIdx = (Number(cParts[4]) || 0) % SCARF_TONES.length;
    const hatIdx = (Number(cParts[5]) || 0) % outfitPal.hat.length;
    const propIdx = (Number(cParts[6]) || 0) % outfitPal.prop.length;

    const usesBriefcase =
      ag.hasProp &&
      ag.civClass !== 'streetwear_youth' &&
      ag.civClass !== 'student_runner' &&
      ag.civClass !== 'working_class';

    // Keep manifest ancestry tone dominant with subtle per-citizen skin variation
    const manifestCol = new THREE.Color(body.skinHex);
    const toneCol = new THREE.Color(SKIN_TONES[skinIdx]);
    manifestCol.lerp(toneCol, 0.25);

    const hairColor =
      body.ageBand === 'elder' && (ag.voiceSeed & 3) !== 0 ? '#9da0a6' : HAIR_TONES[hairIdx];

    return {
      faceId: ag.faceId,
      fabricId: ag.fabricId,
      outfitId: ag.outfitId,
      skinColor: `#${manifestCol.getHexString()}`,
      hairColor,
      jacketColor: outfitPal.jacket[jacketIdx],
      pantsColor: outfitPal.pants[pantsIdx],
      shoeColor: outfitPal.boots[bootsIdx],
      scarfColor: SCARF_TONES[scarfIdx],
      hatColor: outfitPal.hat[hatIdx],
      propColor: outfitPal.prop[propIdx],
      hasScarf: ag.hasScarf,
      usesCap: ag.usesCap,
      hasProp: ag.hasProp,
      propKind: usesBriefcase ? 'briefcase' : 'backpack',
      coatLenScale: ag.coatLenScale,
      hairStyle: pickHairStyleForAgent(body.gender, ag.usesCap, ag.voiceSeed),
      weatheredFace: body.ageBand === 'elder' || ag.role === 'gang',
    };
  };

  const buildPedRigs = () => {
    pedRigsRoot.clear();
    pedRigs.length = 0;
    pedPoseSynced.fill(0);
    for (let i = 0; i < agents.length; i++) {
      const ag = agents[i];
      const body = BODY_MANIFEST_MAP.get(ag.bodyId) ?? BODY_POOL_MANIFEST[0];
      const dressing = buildAgentDressing(ag, body);
      const rig = createRiggedHuman(
        (ag.voiceSeed ^ i) | 0,
        textures,
        ag.outfitId,
        'none',
        ag.bodyId,
        dressing
      );
      rig.root.position.set(ag.x, ag.y, ag.z);
      rig.root.rotation.set(0, ag.heading, 0);
      rig.root.visible = ag.alive;
      pedRigsRoot.add(rig.root);
      pedRigs.push(rig);

      if (ag.role === 'gang') {
        const gv = gangVisuals.get(i);
        if (gv) {
          rig.rightHandGrp.add(gv.weapon);
          gv.weapon.visible = ag.alive;
        }
      }
    }
  };

  buildPedRigs();

  const pedPoseParams: HumanPoseParams = {
    mode: 'standing_idle',
    elapsed: 0,
    phase: 0,
    walkCycle: 0,
    windStrength: 0.88,
    sidestepYaw: 0,
    nodPitch: 0,
    upsetProgress: 0,
    upsetLookYaw: 0,
    weaponPose: undefined,
  };

  const walkingFlags = new Uint8Array(Math.max(1, totalCount));

  const enforceStaticBounds = (ag: PedAgent) => {
    if (ag.role === 'metro_plat') {
      const st = metroStations[ag.metroStationIdx];
      if (!st) return;
      const cosY = Math.cos(st.yaw);
      const sinY = Math.sin(st.yaw);
      const centerX = st.platWorldX - -4.8 * cosY;
      const centerZ = st.platWorldZ + -4.8 * sinY;
      const dx = ag.x - centerX;
      const dz = ag.z - centerZ;
      // Convert to station local coords
      let lx = dx * cosY - dz * sinY;
      let lz = dx * sinY + dz * cosY;
      // Keep inside platform deck (away from track edge -2.25 and back glass -8.0)
      lx = THREE.MathUtils.clamp(lx, -7.85, -2.52);
      lz = THREE.MathUtils.clamp(lz, -24.8, 24.8);
      // Keep clear of station booth (-6.55, -2.0), half-extents (1.05, 1.7) + 0.34
      if (lx > -7.95 && lx < -5.15 && lz > -4.05 && lz < 0.05) {
        lx = -5.15;
      }
      // Keep clear of fluted columns at x=-7.4, z = -20..20 step 8 (radius 0.34 + 0.34 = 0.68)
      for (let cz = -20; cz <= 20; cz += 8) {
        const cdx = lx - -7.4;
        const cdz = lz - cz;
        const cd2 = cdx * cdx + cdz * cdz;
        if (cd2 < 0.68 * 0.68) {
          const cd = Math.max(0.001, Math.sqrt(cd2));
          lx = -7.4 + (cdx / cd) * 0.68;
          lz = cz + (cdz / cd) * 0.68;
        }
      }
      ag.x = centerX + lx * cosY + lz * sinY;
      ag.z = centerZ - lx * sinY + lz * cosY;
    } else if (collisionWorld) {
      const hit = collisionWorld.resolveCircle(ag.x, ag.z, PED_CAPSULE_RADIUS);
      if (hit.hit) {
        ag.x = hit.x;
        ag.z = hit.z;
      }
    }
  };

  const resolveSeparationAndSocial = (
    dt: number,
    passIdx: number,
    playerPos?: THREE.Vector3
  ) => {
    cellHead.fill(-1);
    for (let i = 0; i < totalCount; i++) {
      const ag = agents[i];
      const gx = Math.floor(ag.x * INV_CELL_SIZE);
      const gz = Math.floor(ag.z * INV_CELL_SIZE);
      const h = hashCoord(gx, gz);
      nextAgent[i] = cellHead[h];
      cellHead[h] = i;
    }

    for (let i = 0; i < totalCount; i++) {
      const a = agents[i];
      if (!a.alive) continue;
      const agx = Math.floor(a.x * INV_CELL_SIZE);
      const agz = Math.floor(a.z * INV_CELL_SIZE);

      for (let ox = -1; ox <= 1; ox++) {
        for (let oz = -1; oz <= 1; oz++) {
          let j = cellHead[hashCoord(agx + ox, agz + oz)];
          while (j !== -1) {
            if (j > i) {
              const b = agents[j];
              if (b.alive && Math.abs(a.y - b.y) < 1.2) {
                let dx = b.x - a.x;
                let dz = b.z - a.z;
                let d2 = dx * dx + dz * dz;

                if (d2 < POLITE_PASS_DIST2 && d2 > 1e-8) {
                  const d = Math.sqrt(d2);
                  const nx = dx / d;
                  const nz = dz / d;

                  // Social passing check once per frame (passIdx === 0)
                  if (passIdx === 0) {
                    const relSide =
                      nx * Math.cos(a.heading) - nz * Math.sin(a.heading);
                    const passSign = relSide >= 0 ? -1 : 1;

                    // Velocity-projected lateral avoidance when approaching
                    const rvx = b.vx - a.vx;
                    const rvz = b.vz - a.vz;
                    const closingSpeed = -(rvx * nx + rvz * nz);
                    if (closingSpeed > 0.15) {
                      const steerScale = Math.min(0.45, closingSpeed * dt * 0.42);
                      const tx = -nz * passSign;
                      const tz = nx * passSign;
                      a.x -= tx * steerScale;
                      a.z -= tz * steerScale;
                      b.x += tx * steerScale;
                      b.z += tz * steerScale;
                    }

                    // Polite passing vs Rude shoulder-bump
                    const aRudeReady = a.personality === 'rude' && a.rudeCooldown <= 0;
                    const bRudeReady = b.personality === 'rude' && b.rudeCooldown <= 0;

                    if (aRudeReady && !bRudeReady) {
                      a.rudeCooldown = 25.0;
                      a.targetSidestep = 0;
                      const latX = nx * 0.65 - nz * passSign * 0.76;
                      const latZ = nz * 0.65 + nx * passSign * 0.76;
                      b.impulseX += latX * 0.18;
                      b.impulseZ += latZ * 0.18;
                      b.upsetTimer = 2.5;
                      b.upsetLookYaw = Math.atan2(a.x - b.x, a.z - b.z);
                      b.mutterText = MUTTER_LINES[(i + j) % MUTTER_LINES.length];
                    } else if (bRudeReady && !aRudeReady) {
                      b.rudeCooldown = 25.0;
                      b.targetSidestep = 0;
                      const latX = -nx * 0.65 + nz * passSign * 0.76;
                      const latZ = -nz * 0.65 - nx * passSign * 0.76;
                      a.impulseX += latX * 0.18;
                      a.impulseZ += latZ * 0.18;
                      a.upsetTimer = 2.5;
                      a.upsetLookYaw = Math.atan2(b.x - a.x, b.z - a.z);
                      a.mutterText = MUTTER_LINES[(i + j) % MUTTER_LINES.length];
                    } else {
                      if (a.upsetTimer <= 0) {
                        a.targetSidestep = passSign * 0.65;
                        if (a.nodCooldown <= 0) {
                          a.nodTimer = 0.7;
                          a.nodCooldown = 3.6;
                        }
                      }
                      if (b.upsetTimer <= 0) {
                        b.targetSidestep = -passSign * 0.65;
                        if (b.nodCooldown <= 0) {
                          b.nodTimer = 0.7;
                          b.nodCooldown = 3.6;
                        }
                      }
                    }
                  }

                  // Hard capsule separation r = 0.34 m => minDist = 0.68 m
                  dx = b.x - a.x;
                  dz = b.z - a.z;
                  d2 = dx * dx + dz * dz;
                  if (d2 < PED_MIN_SEP2) {
                    const dist = Math.sqrt(Math.max(1e-8, d2));
                    const nxSep = dist > 1e-4 ? dx / dist : Math.cos(i * 1.7);
                    const nzSep = dist > 1e-4 ? dz / dist : Math.sin(i * 1.7);
                    const overlap = (PED_MIN_SEP - dist) * 0.505;
                    a.x -= nxSep * overlap;
                    a.z -= nzSep * overlap;
                    b.x += nxSep * overlap;
                    b.z += nzSep * overlap;
                  }
                } else if (d2 <= 1e-8 && Math.abs(a.y - b.y) < 1.2) {
                  // Deterministic zero-overlap break if two spawns coincided
                  const ang = ((i * 73 + j * 37) % 360) * (Math.PI / 180);
                  a.x -= Math.cos(ang) * 0.35;
                  a.z -= Math.sin(ang) * 0.35;
                  b.x += Math.cos(ang) * 0.35;
                  b.z += Math.sin(ang) * 0.35;
                }
              }
            }
            j = nextAgent[j];
          }
        }
      }

      // Hard capsule separation against on-foot player as well!
      if (playerPos && Math.abs(a.y - playerPos.y) < 1.3) {
        const pdx = a.x - playerPos.x;
        const pdz = a.z - playerPos.z;
        const pd2 = pdx * pdx + pdz * pdz;
        if (pd2 < POLITE_PASS_DIST2 && pd2 > 1e-6) {
          const pd = Math.sqrt(pd2);
          if (passIdx === 0 && a.upsetTimer <= 0) {
            const relSide =
              (pdx / pd) * Math.cos(a.heading) - (pdz / pd) * Math.sin(a.heading);
            a.targetSidestep = (relSide >= 0 ? 1 : -1) * 0.65;
            if (a.nodCooldown <= 0) {
              a.nodTimer = 0.7;
              a.nodCooldown = 3.2;
            }
          }
          if (pd < PED_MIN_SEP) {
            const push = PED_MIN_SEP - pd;
            a.x += (pdx / pd) * push;
            a.z += (pdz / pd) * push;
          }
        }
      }

      enforceStaticBounds(a);
    }
  };

  const _shotOrigin = new THREE.Vector3();
  const _shotMuzzle = new THREE.Vector3();
  const _shotDir = new THREE.Vector3();
  const _playerHitBox = new THREE.Box3();
  const _playerBoxMin = new THREE.Vector3();
  const _playerBoxMax = new THREE.Vector3();
  const _playerPosVec = new THREE.Vector3();

  const alertCrew = (crewIdx: number, px: number, pz: number, propagate: boolean) => {
    const crew = crews[crewIdx];
    if (!crew) return;
    const wasAlert = crew.state === 'alert';
    crew.state = 'alert';
    crew.lastSeenX = px;
    crew.lastSeenZ = pz;
    crew.escapeTimer = 0;
    crew.searchTimer = 0;
    for (let k = 0; k < crew.memberIndices.length; k++) {
      const m = agents[crew.memberIndices[k]];
      m.suspicion = 1;
      if (!wasAlert) m.alertBannerTimer = 2.6;
    }
    if (!wasAlert) {
      hiddenHeat = Math.min(100, hiddenHeat + 12);
      const terr = GANG_TERRITORIES[crewIdx];
      worldEventBus.emit({
        type: 'crime',
        kind: 'gang_firefight',
        x: px,
        y: 1,
        z: pz,
        districtId: terr?.districtId ?? 'D1',
        severity: 0.65,
      });
    }
    if (propagate) {
      const earshotR = 48 + hiddenHeat * 0.45;
      const earshotR2 = earshotR * earshotR;
      for (let j = 0; j < crews.length; j++) {
        if (j === crewIdx) continue;
        const other = crews[j];
        const dx = other.anchorX - crew.anchorX;
        const dz = other.anchorZ - crew.anchorZ;
        if (dx * dx + dz * dz <= earshotR2) {
          alertCrew(j, px, pz, false);
        }
      }
    }
  };

  const applyDamageToAgent = (
    agentId: string,
    damage: number,
    attackerPos?: THREE.Vector3
  ): boolean => {
    for (let i = 0; i < totalCount; i++) {
      const ag = agents[i];
      if (ag.id !== agentId || !ag.alive) continue;
      ag.hp -= damage;
      if (ag.role === 'gang' && attackerPos) {
        alertCrew(ag.crewIdx, attackerPos.x, attackerPos.z, true);
        hiddenHeat = Math.min(100, hiddenHeat + 16);
      } else if (ag.role !== 'gang') {
        hiddenHeat = Math.min(100, hiddenHeat + 20);
        if (attackerPos) {
          const fdx = ag.x - attackerPos.x;
          const fdz = ag.z - attackerPos.z;
          const fl = Math.max(0.01, Math.hypot(fdx, fdz));
          ag.fleeDirX = fdx / fl;
          ag.fleeDirZ = fdz / fl;
          ag.fleeTimer = 8.0;
        }
      }
      if (ag.hp <= 0) {
        ag.hp = 0;
        ag.alive = false;
        ag.respawnTimer = 24.0;
        if (ag.role === 'gang') {
          hiddenHeat = Math.min(100, hiddenHeat + 14);
        } else {
          hiddenHeat = Math.min(100, hiddenHeat + 24);
        }
      }
      return true;
    }
    return false;
  };

  const notifyPlayerGunshot = (x: number, y: number, z: number) => {
    let witnesses = 0;
    for (let i = 0; i < totalCount; i++) {
      const ag = agents[i];
      if (!ag.alive) continue;
      const dx = ag.x - x;
      const dz = ag.z - z;
      const d2 = dx * dx + dz * dz;
      if (ag.role !== 'gang' && d2 < 42 * 42) {
        witnesses++;
      }
      if (ag.role === 'gang' && d2 < 52 * 52) {
        alertCrew(ag.crewIdx, x, z, true);
      }
    }
    hiddenHeat = Math.min(100, hiddenHeat + 4 + Math.min(14, witnesses * 3));
    void y;
  };

  const update = (
    dt: number,
    elapsed: number,
    busStopArrivals?: boolean[],
    metroTrainFlags?: boolean[],
    playerPosOrCtx?: THREE.Vector3 | PedPlayerContext
  ) => {
    const safeDt = Math.min(0.05, Math.max(0.0005, dt));
    weaponFxPool.update(safeDt);

    const playerCtx: PedPlayerContext | undefined =
      playerPosOrCtx instanceof THREE.Vector3
        ? { pos: playerPosOrCtx, inVehicle: false, speedKmh: 0 }
        : playerPosOrCtx;
    const playerPos = playerCtx?.pos;
    if (playerPos) {
      _playerPosVec.copy(playerPos);
      _playerBoxMin.set(playerPos.x - 0.55, playerPos.y, playerPos.z - 0.55);
      _playerBoxMax.set(playerPos.x + 0.55, playerPos.y + 1.75, playerPos.z + 0.55);
      _playerHitBox.set(_playerBoxMin, _playerBoxMax);
    }

    // Drain world event bus -> civilians flee gunfire & scatter from chases (gang members never flee!)
    const events = worldEventBus.drainQueued();
    for (let e = 0; e < events.length; e++) {
      const ev = events[e];
      if (ev.type === 'gunfire') {
        const r2 = ev.loudRadius * ev.loudRadius;
        for (let i = 0; i < totalCount; i++) {
          const ag = agents[i];
          if (!ag.alive || ag.role === 'gang' || ag.role === 'metro_plat') continue;
          const dx = ag.x - ev.x;
          const dz = ag.z - ev.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < r2) {
            const d = Math.max(0.1, Math.sqrt(d2));
            ag.fleeDirX = dx / d;
            ag.fleeDirZ = dz / d;
            ag.fleeTimer = 6.5 + (i % 4) * 0.6;
          }
        }
        if (ev.shooterKind === 'player') {
          notifyPlayerGunshot(ev.x, ev.y, ev.z);
        }
      } else if (ev.type === 'chase') {
        const r2 = ev.radius * ev.radius;
        for (let i = 0; i < totalCount; i++) {
          const ag = agents[i];
          if (!ag.alive || ag.role === 'gang' || ag.role === 'metro_plat') continue;
          const dx = ag.x - ev.x;
          const dz = ag.z - ev.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < r2) {
            const d = Math.max(0.1, Math.sqrt(d2));
            // Scatter perpendicularly / away from chase vector
            const perpX = -ev.dirZ;
            const perpZ = ev.dirX;
            const side = dx * perpX + dz * perpZ >= 0 ? 1 : -1;
            const sx = (dx / d) * 0.5 + perpX * side * 0.85;
            const sz = (dz / d) * 0.5 + perpZ * side * 0.85;
            const sl = Math.max(0.01, Math.hypot(sx, sz));
            ag.fleeDirX = sx / sl;
            ag.fleeDirZ = sz / sl;
            ag.fleeTimer = Math.max(ag.fleeTimer, 3.6);
          }
        }
      }
    }

    // Update Gang Crews (territory patrol, suspicion 0->1 detection, alert/chase, search, return)
    let anyCrewAlert = false;
    for (let c = 0; c < crews.length; c++) {
      const crew = crews[c];
      let aliveCount = 0;
      let anySawPlayer = false;
      let minDistToPlayer = Infinity;

      for (let mIdx = 0; mIdx < crew.memberIndices.length; mIdx++) {
        const ag = agents[crew.memberIndices[mIdx]];
        if (!ag.alive) {
          ag.respawnTimer -= safeDt;
          if (ag.respawnTimer <= 0) {
            ag.alive = true;
            ag.hp = 100;
            ag.x = crew.homeAnchorX + ag.formOffX;
            ag.z = crew.homeAnchorZ + ag.formOffZ;
            ag.suspicion = 0;
            ag.alertBannerTimer = 0;
          }
          continue;
        }
        aliveCount++;
        ag.alertBannerTimer = Math.max(0, ag.alertBannerTimer - safeDt);

        if (playerPos) {
          const toPx = playerPos.x - ag.x;
          const toPz = playerPos.z - ag.z;
          const dist = Math.hypot(toPx, toPz);
          if (dist < minDistToPlayer) minDistToPlayer = dist;

          const detectRange = (crew.state === 'alert' ? 38 : 27) + hiddenHeat * 0.16;
          const fwdX = Math.sin(ag.heading);
          const fwdZ = Math.cos(ag.heading);
          const dot = dist > 0.05 ? (toPx * fwdX + toPz * fwdZ) / dist : 1;
          const inCone = dot >= 0.42 || dist < 5.5 || crew.state === 'alert';
          const hasLos =
            dist <= detectRange &&
            inCone &&
            (!collisionWorld || collisionWorld.hasLineOfSight(ag.x, ag.z, playerPos.x, playerPos.z));

          if (hasLos) {
            anySawPlayer = true;
            crew.lastSeenX = playerPos.x;
            crew.lastSeenZ = playerPos.z;
            if (crew.state !== 'alert') {
              const proxFactor = Math.max(0.22, 1.35 - dist / detectRange);
              const heatBoost = 1 + hiddenHeat * 0.012;
              const vehScale = playerCtx?.inVehicle && (playerCtx.speedKmh ?? 0) > 25 ? 0.65 : 1.0;
              ag.suspicion = Math.min(1, ag.suspicion + safeDt * proxFactor * heatBoost * vehScale * 0.95);
              if (ag.suspicion >= 1) {
                alertCrew(c, playerPos.x, playerPos.z, true);
              }
            }
          } else if (crew.state !== 'alert') {
            ag.suspicion = Math.max(0, ag.suspicion - safeDt * 0.28);
          }
        } else if (crew.state !== 'alert') {
          ag.suspicion = Math.max(0, ag.suspicion - safeDt * 0.28);
        }
      }

      if (crew.state === 'patrol') {
        const wp = crew.patrolPoints[crew.patrolIdx];
        const dx = wp.x - crew.anchorX;
        const dz = wp.z - crew.anchorZ;
        const d = Math.hypot(dx, dz);
        if (d < 1.2) {
          crew.patrolHoldTimer -= safeDt;
          if (crew.patrolHoldTimer <= 0) {
            crew.patrolIdx = (crew.patrolIdx + 1) % crew.patrolPoints.length;
            crew.patrolHoldTimer = 2.4;
          }
        } else {
          const step = Math.min(d, 1.35 * safeDt);
          crew.anchorX += (dx / d) * step;
          crew.anchorZ += (dz / d) * step;
        }
      } else if (crew.state === 'alert') {
        anyCrewAlert = true;
        if (playerPos) {
          // Move anchor toward player/lastSeen while chasing
          const tx = anySawPlayer ? playerPos.x : crew.lastSeenX;
          const tz = anySawPlayer ? playerPos.z : crew.lastSeenZ;
          const dx = tx - crew.anchorX;
          const dz = tz - crew.anchorZ;
          const d = Math.hypot(dx, dz);
          if (d > 2.5) {
            const chaseSpd = 5.4 + hiddenHeat * 0.012;
            const step = Math.min(d, chaseSpd * safeDt);
            crew.anchorX += (dx / d) * step;
            crew.anchorZ += (dz / d) * step;
          }
          if (Math.floor(elapsed * 3) !== Math.floor((elapsed - safeDt) * 3) && d > 0.1) {
            worldEventBus.emit({
              type: 'chase',
              x: crew.anchorX,
              y: 1,
              z: crew.anchorZ,
              dirX: dx / Math.max(0.1, d),
              dirZ: dz / Math.max(0.1, d),
              radius: 14,
              kind: 'gang',
            });
          }

          const escapeDist = 42 + hiddenHeat * 0.28;
          const escapeDuration = 4.5 + hiddenHeat * 0.06;
          if (!anySawPlayer && minDistToPlayer > escapeDist) {
            crew.escapeTimer += safeDt;
            if (crew.escapeTimer >= escapeDuration) {
              crew.state = 'search';
              crew.searchTimer = 6.5 + hiddenHeat * 0.05;
              crew.escapeTimer = 0;
            }
          } else {
            crew.escapeTimer = 0;
          }
        } else {
          crew.state = 'search';
          crew.searchTimer = 5.5;
        }
      } else if (crew.state === 'search') {
        const dx = crew.lastSeenX - crew.anchorX;
        const dz = crew.lastSeenZ - crew.anchorZ;
        const d = Math.hypot(dx, dz);
        if (d > 1.5) {
          const step = Math.min(d, 3.2 * safeDt);
          crew.anchorX += (dx / d) * step;
          crew.anchorZ += (dz / d) * step;
        } else {
          crew.searchTimer -= safeDt;
          if (crew.searchTimer <= 0) {
            crew.state = 'returning';
          }
        }
      } else if (crew.state === 'returning') {
        const dx = crew.homeAnchorX - crew.anchorX;
        const dz = crew.homeAnchorZ - crew.anchorZ;
        const d = Math.hypot(dx, dz);
        if (d < 1.5) {
          crew.anchorX = crew.homeAnchorX;
          crew.anchorZ = crew.homeAnchorZ;
          crew.state = 'patrol';
        } else {
          const step = Math.min(d, 2.4 * safeDt);
          crew.anchorX += (dx / d) * step;
          crew.anchorZ += (dz / d) * step;
        }
      }

      if (aliveCount === 0) {
        crew.state = 'returning';
      }
    }

    if (!anyCrewAlert && hiddenHeat > 0) {
      hiddenHeat = Math.max(0, hiddenHeat - safeDt * 2.2);
    }

    for (let i = 0; i < totalCount; i++) {
      const ag = agents[i];
      ag.prevX = ag.x;
      ag.prevZ = ag.z;
      ag.rudeCooldown = Math.max(0, ag.rudeCooldown - safeDt);
      ag.upsetTimer = Math.max(0, ag.upsetTimer - safeDt);
      if (ag.upsetTimer <= 0) ag.mutterText = '';
      ag.nodTimer = Math.max(0, ag.nodTimer - safeDt);
      ag.nodCooldown = Math.max(0, ag.nodCooldown - safeDt);
      ag.targetSidestep = 0;
      ag.aiming = false;

      if (!ag.alive) {
        if (ag.role !== 'gang') {
          ag.respawnTimer -= safeDt;
          if (ag.respawnTimer <= 0) {
            ag.alive = true;
            ag.hp = 50;
          }
        }
        walkingFlags[i] = 0;
        continue;
      }

      // Apply & decay bump impulse smoothly
      if (Math.abs(ag.impulseX) > 0.0005 || Math.abs(ag.impulseZ) > 0.0005) {
        const stepDecay = 1 - Math.exp(-7.5 * safeDt);
        ag.x += ag.impulseX * stepDecay;
        ag.z += ag.impulseZ * stepDecay;
        ag.impulseX *= Math.exp(-7.5 * safeDt);
        ag.impulseZ *= Math.exp(-7.5 * safeDt);
      }

      let isWalking = false;

      // Non-gang civilians flee/scatter when triggered by worldEventBus
      if (ag.fleeTimer > 0 && ag.role !== 'gang') {
        ag.fleeTimer = Math.max(0, ag.fleeTimer - safeDt);
        const fleeSpd = 4.8;
        ag.x += ag.fleeDirX * fleeSpd * safeDt;
        ag.z += ag.fleeDirZ * fleeSpd * safeDt;
        ag.heading = Math.atan2(ag.fleeDirX, ag.fleeDirZ);
        isWalking = true;
      } else if (ag.role === 'gang') {
        const crew = crews[ag.crewIdx];
        if (crew) {
          let targetX = crew.anchorX + ag.formOffX;
          let targetZ = crew.anchorZ + ag.formOffZ;
          let moveSpd = ag.speed;

          if (crew.state === 'alert' && playerPos) {
            // Converge loosely around the player / firing ring (7..14m)
            const ringAng = (ag.memberSlot / Math.max(1, crew.memberIndices.length)) * Math.PI * 2;
            const ringR = 7.5 + (ag.memberSlot % 2) * 3.0;
            targetX = playerPos.x + Math.cos(ringAng) * ringR;
            targetZ = playerPos.z + Math.sin(ringAng) * ringR;
            moveSpd = 5.2 + hiddenHeat * 0.012;
          } else if (crew.state === 'search') {
            targetX = crew.lastSeenX + ag.formOffX * 1.6;
            targetZ = crew.lastSeenZ + ag.formOffZ * 1.6;
            moveSpd = 3.1;
          }

          const dx = targetX - ag.x;
          const dz = targetZ - ag.z;
          const dist = Math.hypot(dx, dz);

          if (dist > 0.45) {
            const step = Math.min(dist, moveSpd * safeDt);
            ag.x += (dx / dist) * step;
            ag.z += (dz / dist) * step;
            ag.heading = Math.atan2(dx, dz);
            isWalking = true;
          }

          const groundY = Math.max(0.08, getTerrainHeight(ag.x, ag.z));
          ag.y = crew.districtId === 'D8' && ag.x > 1560 ? Math.max(groundY, 1.52) : groundY;

          // Face player & fire shared weapon during alert chase!
          if (crew.state === 'alert' && playerPos) {
            const toPx = playerPos.x - ag.x;
            const toPz = playerPos.z - ag.z;
            const pDist = Math.hypot(toPx, toPz);
            const hasLos =
              pDist < 32 &&
              (!collisionWorld || collisionWorld.hasLineOfSight(ag.x, ag.z, playerPos.x, playerPos.z));
            if (hasLos) {
              ag.heading = Math.atan2(toPx, toPz);
              ag.aiming = true;

              if (ag.burstShotsLeft > 0) {
                ag.burstShotTimer -= safeDt;
                if (ag.burstShotTimer <= 0) {
                  ag.burstShotsLeft--;
                  ag.burstShotTimer = 1 / SHARED_WEAPON_SPEC.fireRateHz;

                  const eyeY = ag.y + ag.eyeHeightM;
                  _shotOrigin.set(ag.x, eyeY, ag.z);
                  const sinH = Math.sin(ag.heading);
                  const cosH = Math.cos(ag.heading);
                  _shotMuzzle.set(
                    ag.x + sinH * 0.72 - cosH * 0.18,
                    ag.y + ag.eyeHeightM * 0.94,
                    ag.z + cosH * 0.72 + sinH * 0.18
                  );
                  _shotDir.set(
                    playerPos.x - ag.x,
                    playerPos.y + 1.15 - eyeY,
                    playerPos.z - ag.z
                  );

                  const hit = fireSharedWeapon({
                    origin: _shotOrigin,
                    muzzleWorld: _shotMuzzle,
                    dir: _shotDir,
                    shooterKind: 'gang',
                    shooterId: ag.id,
                    spreadRad: SHARED_WEAPON_SPEC.npcSpreadRad,
                    rayTargets: [],
                    collisionWorld,
                    playerHitBox: _playerHitBox,
                    fxPool: weaponFxPool,
                    districtId: crew.districtId,
                    onSound: playerCtx?.onGunshotSound,
                    listenerPos: _playerPosVec,
                  });
                  if (hit.hit && hit.kind === 'player' && playerCtx?.onPlayerHit) {
                    playerCtx.onPlayerHit(playerCtx.inVehicle ? hit.damage * 0.22 : hit.damage * 0.45);
                  }
                }
              } else {
                ag.burstCooldown -= safeDt;
                if (ag.burstCooldown <= 0) {
                  ag.burstShotsLeft = SHARED_WEAPON_SPEC.burstCount;
                  ag.burstShotTimer = 0;
                  ag.burstCooldown =
                    Math.max(0.45, SHARED_WEAPON_SPEC.burstCooldownSec - hiddenHeat * 0.004) +
                    (ag.memberSlot % 3) * 0.18;
                }
              }
            }
          } else if (ag.suspicion > 0.12 && playerPos) {
            // Glance toward player while suspicious
            ag.heading = Math.atan2(playerPos.x - ag.x, playerPos.z - ag.z);
            ag.aiming = ag.suspicion > 0.65;
          }
        }
      } else if (ag.role === 'sidewalk') {
        const seg = sidewalkSegs[ag.segIdx];
        if (ag.ixIdx >= 0) {
          // Sidewalk walker stepping onto a nearby intersection zebra crosswalk
          const ix = SIGNALIZED_INTERSECTIONS[ag.ixIdx];
          if (ix) {
            const sig = getIntersectionSignal(ix, elapsed);
            const hasWalk = ag.crossAxis === 'ns' ? sig.pedCrossNS : sig.pedCrossEW;
            if (ag.crossState === 'wait') {
              ag.heading = Math.atan2(
                ag.crossEndX - ag.crossStartX,
                ag.crossEndZ - ag.crossStartZ
              );
              if (hasWalk) ag.crossState = 'crossing';
            } else {
              isWalking = true;
              const totalDist = Math.hypot(
                ag.crossEndX - ag.crossStartX,
                ag.crossEndZ - ag.crossStartZ
              );
              const pace = hasWalk ? ag.speed * 1.2 : ag.speed * 1.7;
              ag.crossU += (pace * safeDt) / Math.max(1, totalDist);
              const targetX = ag.crossStartX + (ag.crossEndX - ag.crossStartX) * Math.min(1, ag.crossU);
              const targetZ = ag.crossStartZ + (ag.crossEndZ - ag.crossStartZ) * Math.min(1, ag.crossU);
              ag.x += (targetX - ag.x) * Math.min(1, safeDt * 7.5);
              ag.z += (targetZ - ag.z) * Math.min(1, safeDt * 7.5);
              const roadY = getRoadElevationAt(ag.x, ag.z);
              ag.y = Math.max(0.095, roadY + 0.015);
              ag.heading = Math.atan2(
                ag.crossEndX - ag.crossStartX,
                ag.crossEndZ - ag.crossStartZ
              );
              if (ag.crossU >= 1) {
                ag.crossU = 0;
                ag.crossState = 'wait';
                ag.ixIdx = -1;
                // Latch smoothly onto nearest far-side sidewalk segment
                let bestIdx = ag.segIdx;
                let bestD = Infinity;
                let bestDir: 1 | -1 = 1;
                let bestProg = 0;
                for (let si = 0; si < sidewalkSegs.length; si++) {
                  const cand = sidewalkSegs[si];
                  const d0 = Math.hypot(cand.x0 - ag.x, cand.z0 - ag.z);
                  const d1 = Math.hypot(cand.x1 - ag.x, cand.z1 - ag.z);
                  if (d0 < bestD) {
                    bestD = d0;
                    bestIdx = si;
                    bestDir = 1;
                    bestProg = 0.5;
                  }
                  if (d1 < bestD) {
                    bestD = d1;
                    bestIdx = si;
                    bestDir = -1;
                    bestProg = cand.len - 0.5;
                  }
                }
                ag.segIdx = bestIdx;
                ag.segDir = bestDir;
                ag.segProgress = bestProg;
              }
            }
          } else {
            ag.ixIdx = -1;
          }
        } else if (seg) {
          isWalking = true;
          ag.segProgress += ag.speed * ag.segDir * safeDt;
          const hitEnd = ag.segProgress >= seg.len;
          const hitStart = ag.segProgress <= 0;
          let enteredCrosswalk = false;
          if (hitEnd || hitStart) {
            const endX = hitEnd ? seg.x1 : seg.x0;
            const endZ = hitEnd ? seg.z1 : seg.z0;
            // Check if arriving at a signalized crosswalk corner to cross cleanly!
            for (let ixI = 0; ixI < SIGNALIZED_INTERSECTIONS.length; ixI++) {
              const ix = SIGNALIZED_INTERSECTIONS[ixI];
              if (Math.hypot(endX - ix.x, endZ - ix.z) < Math.max(ix.halfSpanNS, ix.halfSpanEW) + 12) {
                const crossNS = Math.abs(seg.dirX) > Math.abs(seg.dirZ);
                ag.ixIdx = ixI;
                ag.crossAxis = crossNS ? 'ns' : 'ew';
                ag.crossState = 'wait';
                ag.crossU = 0;
                if (crossNS) {
                  const signZ = endZ >= ix.z ? 1 : -1;
                  const startSignX = endX >= ix.x ? 1 : -1;
                  const zLane = ix.z + signZ * (ix.halfSpanEW + 1.8);
                  const xSpan = ix.halfSpanNS + 1.6;
                  ag.crossStartX = ix.x + startSignX * xSpan;
                  ag.crossStartZ = zLane;
                  ag.crossEndX = ix.x - startSignX * xSpan;
                  ag.crossEndZ = zLane;
                } else {
                  const signX = endX >= ix.x ? 1 : -1;
                  const startSignZ = endZ >= ix.z ? 1 : -1;
                  const xLane = ix.x + signX * (ix.halfSpanNS + 1.8);
                  const zSpan = ix.halfSpanEW + 1.6;
                  ag.crossStartX = xLane;
                  ag.crossStartZ = ix.z + startSignZ * zSpan;
                  ag.crossEndX = xLane;
                  ag.crossEndZ = ix.z - startSignZ * zSpan;
                }
                enteredCrosswalk = true;
                break;
              }
            }
            if (!enteredCrosswalk) {
              const links = hitEnd ? seg.nextEnd : seg.nextStart;
              if (links.length > 0) {
                const pick = links[(i + Math.floor(elapsed)) % links.length];
                ag.segIdx = pick.segIdx;
                ag.segDir = pick.dir;
                const nextS = sidewalkSegs[pick.segIdx];
                ag.segProgress = pick.dir === 1 ? 0.5 : Math.max(0, nextS.len - 0.5);
              } else if (hitEnd) {
                ag.segProgress = seg.len;
                ag.segDir = -1;
              } else {
                ag.segProgress = 0;
                ag.segDir = 1;
              }
            }
          }
          if (!enteredCrosswalk) {
            const curSeg = sidewalkSegs[ag.segIdx] ?? seg;
            const clampedP = Math.max(0, Math.min(curSeg.len, ag.segProgress));
            const targetX = curSeg.x0 + curSeg.dirX * clampedP;
            const targetZ = curSeg.z0 + curSeg.dirZ * clampedP;
            ag.x += (targetX - ag.x) * Math.min(1, safeDt * 6.5);
            ag.z += (targetZ - ag.z) * Math.min(1, safeDt * 6.5);
            const roadY = getRoadElevationAt(ag.x, ag.z);
            ag.y = Math.max(0.155, roadY + 0.075);
            ag.heading = Math.atan2(curSeg.dirX * ag.segDir, curSeg.dirZ * ag.segDir);
          } else {
            ag.x = ag.crossStartX;
            ag.z = ag.crossStartZ;
            ag.y = Math.max(0.155, getRoadElevationAt(ag.x, ag.z) + 0.075);
          }
        }
      } else if (ag.role === 'crosswalk') {
        const ix = SIGNALIZED_INTERSECTIONS[ag.ixIdx];
        if (ix) {
          const sig = getIntersectionSignal(ix, elapsed);
          const hasWalk = ag.crossAxis === 'ns' ? sig.pedCrossNS : sig.pedCrossEW;

          if (ag.crossState === 'wait') {
            const roadY = getRoadElevationAt(ag.x, ag.z);
            ag.y = Math.max(0.155, roadY + 0.075);
            if (hasWalk) {
              ag.crossState = 'crossing';
            }
          } else {
            isWalking = true;
            const totalDist = Math.hypot(
              ag.crossEndX - ag.crossStartX,
              ag.crossEndZ - ag.crossStartZ
            );
            const pace = hasWalk ? ag.speed * 1.2 : ag.speed * 1.75;
            ag.crossU += (pace * safeDt) / Math.max(1, totalDist);
            if (ag.crossU >= 1) {
              ag.crossU = 0;
              ag.crossState = 'wait';
              const tmpX = ag.crossStartX;
              const tmpZ = ag.crossStartZ;
              ag.crossStartX = ag.crossEndX;
              ag.crossStartZ = ag.crossEndZ;
              ag.crossEndX = tmpX;
              ag.crossEndZ = tmpZ;
            }
            const targetX = ag.crossStartX + (ag.crossEndX - ag.crossStartX) * ag.crossU;
            const targetZ = ag.crossStartZ + (ag.crossEndZ - ag.crossStartZ) * ag.crossU;
            ag.x += (targetX - ag.x) * Math.min(1, safeDt * 7.5);
            ag.z += (targetZ - ag.z) * Math.min(1, safeDt * 7.5);
            const roadY = getRoadElevationAt(ag.x, ag.z);
            ag.y = Math.max(0.095, roadY + 0.015);
            ag.heading = Math.atan2(
              ag.crossEndX - ag.crossStartX,
              ag.crossEndZ - ag.crossStartZ
            );
          }
        }
      } else if (ag.role === 'bus_wait') {
        const busHere = Boolean(busStopArrivals && busStopArrivals[ag.busStopIdx]);
        const stepFwd = busHere ? 1.05 : 0;
        const tx = ag.baseX + Math.sin(ag.stationYaw) * stepFwd;
        const tz = ag.baseZ + Math.cos(ag.stationYaw) * stepFwd;
        const dx = tx - ag.x;
        const dz = tz - ag.z;
        if (dx * dx + dz * dz > 0.01) {
          ag.x += dx * Math.min(1, safeDt * 3.0);
          ag.z += dz * Math.min(1, safeDt * 3.0);
          isWalking = true;
        }
      } else if (ag.role === 'metro_plat') {
        const trainHere = Boolean(metroTrainFlags && metroTrainFlags[ag.metroStationIdx]);
        const stepTowardTrack = trainHere ? 0.72 : 0;
        const tx = ag.baseX + Math.cos(ag.stationYaw) * stepTowardTrack;
        const tz = ag.baseZ - Math.sin(ag.stationYaw) * stepTowardTrack;
        const dx = tx - ag.x;
        const dz = tz - ag.z;
        if (dx * dx + dz * dz > 0.01) {
          ag.x += dx * Math.min(1, safeDt * 3.2);
          ag.z += dz * Math.min(1, safeDt * 3.2);
          isWalking = true;
        }
      } else if (ag.role === 'metro_street') {
        const paceOff = Math.sin(elapsed * 0.45 + ag.idlePhase) * 1.9;
        const tx = ag.baseX + Math.sin(ag.stationYaw) * paceOff;
        const tz = ag.baseZ + Math.cos(ag.stationYaw) * paceOff;
        const dx = tx - ag.x;
        const dz = tz - ag.z;
        if (Math.abs(dx) + Math.abs(dz) > 0.02) {
          ag.heading = Math.atan2(dx, dz);
          ag.x += dx * Math.min(1, safeDt * 6.0);
          ag.z += dz * Math.min(1, safeDt * 6.0);
          isWalking = true;
        }
      }

      ag.vx = (ag.x - ag.prevX) / safeDt;
      ag.vz = (ag.z - ag.prevZ) / safeDt;
      walkingFlags[i] = isWalking ? 1 : 0;
    }

    // Two fast separation & social-passing passes (zero clipping across all neighbors)
    resolveSeparationAndSocial(safeDt, 0, playerPos);
    resolveSeparationAndSocial(safeDt, 1, playerPos);

    frameCounter++;
    const hasPlayer = Boolean(playerPos);
    const px = playerPos ? playerPos.x : 0;
    const pz = playerPos ? playerPos.z : 0;

    for (let i = 0; i < totalCount; i++) {
      const ag = agents[i];
      const rig = pedRigs[i];
      if (!ag.alive) {
        if (rig) rig.root.visible = false;
        const gv = gangVisuals.get(i);
        if (gv) {
          gv.weapon.visible = false;
          gv.suspicionSprite.visible = false;
        }
        continue;
      }

      ag.sidestepYaw = THREE.MathUtils.damp(ag.sidestepYaw, ag.targetSidestep, 9.5, safeDt);
      const isWalking = walkingFlags[i] === 1;
      if (isWalking) {
        ag.stridePhase += safeDt * ag.speed * 5.2;
      }

      if (!rig) continue;
      rig.root.visible = true;
      rig.root.position.set(ag.x, ag.y, ag.z);
      rig.root.rotation.set(0, ag.heading, 0);

      const attachedNow = Boolean(rig.root.userData._mpfbAdapter);
      const needsInitPose = pedPoseSynced[i] === 0 || (attachedNow && pedPoseSynced[i] < 2);
      let shouldPose = needsInitPose || !hasPlayer;
      if (!shouldPose) {
        const dx = ag.x - px;
        const dz = ag.z - pz;
        const d2 = dx * dx + dz * dz;
        if (d2 < 52 * 52) {
          shouldPose = true;
        } else if (d2 < 115 * 115) {
          shouldPose = (frameCounter + i) % 3 === 0;
        } else {
          shouldPose = (frameCounter + i) % 8 === 0;
        }
      }

      const isGang = ag.role === 'gang';
      if (shouldPose) {
        pedPoseSynced[i] = attachedNow ? 2 : 1;
        const upsetFrac = ag.upsetTimer > 0 ? Math.sin(Math.min(1, ag.upsetTimer / 2.5) * Math.PI) : 0;
        let glareDelta = 0;
        if (ag.upsetTimer > 0) {
          glareDelta = ((ag.upsetLookYaw - ag.heading + Math.PI) % (Math.PI * 2)) - Math.PI;
          if (glareDelta < -Math.PI) glareDelta += Math.PI * 2;
        }
        const nodU = ag.nodTimer > 0 ? 1 - ag.nodTimer / 0.7 : 0;

        pedPoseParams.mode = isWalking ? 'walking' : 'standing_idle';
        pedPoseParams.elapsed = elapsed;
        pedPoseParams.phase = ag.idlePhase;
        pedPoseParams.walkCycle = ag.stridePhase;
        pedPoseParams.windStrength = 0.88;
        pedPoseParams.sidestepYaw = ag.sidestepYaw;
        pedPoseParams.nodPitch = ag.nodTimer > 0 ? Math.sin(nodU * Math.PI) * 0.24 : 0;
        pedPoseParams.upsetProgress = upsetFrac;
        pedPoseParams.upsetLookYaw = glareDelta;
        pedPoseParams.weaponPose = isGang ? (ag.aiming ? 'aim' : 'ready') : undefined;
        applyHumanPose(rig, pedPoseParams);
      }

      // Sync gang member's shared weapon & filling "?" suspicion sprite above head
      if (isGang) {
        const gv = gangVisuals.get(i);
        if (gv) {
          gv.weapon.visible = true;
          const crew = crews[ag.crewIdx];
          if (ag.alertBannerTimer > 0 && crew?.state === 'alert') {
            gv.suspicionSprite.visible = true;
            gv.suspicionSprite.position.set(ag.x, ag.y + ag.heightM + 0.34, ag.z);
            (gv.suspicionSprite.material as THREE.SpriteMaterial).map = alertBang;
          } else if (ag.suspicion > 0.02 && crew?.state !== 'alert') {
            gv.suspicionSprite.visible = true;
            gv.suspicionSprite.position.set(ag.x, ag.y + ag.heightM + 0.34, ag.z);
            const stepIdx = Math.min(
              questionSteps.length - 1,
              Math.max(0, Math.round(ag.suspicion * (questionSteps.length - 1)))
            );
            (gv.suspicionSprite.material as THREE.SpriteMaterial).map = questionSteps[stepIdx];
          } else {
            gv.suspicionSprite.visible = false;
          }
        }
      }
    }
  };

  const reseed = (newSeed?: number) => {
    seed =
      newSeed !== undefined
        ? newSeed >>> 0
        : ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    rng = mulberry32(seed);
    spawnAgents();
    buildPedRigs();
  };

  const getRayTargets = (origin: THREE.Vector3, radiusM: number): FpsRayTarget[] => {
    const out: FpsRayTarget[] = [];
    const r2 = radiusM * radiusM;
    for (let i = 0; i < totalCount; i++) {
      const ag = agents[i];
      if (!ag.alive) continue;
      const dx = ag.x - origin.x;
      const dy = ag.y + 0.9 - origin.y;
      const dz = ag.z - origin.z;
      if (dx * dx + dy * dy + dz * dz > r2) continue;
      const hr = PED_CAPSULE_RADIUS;
      const height = ag.heightM;
      const box = new THREE.Box3(
        new THREE.Vector3(ag.x - hr, ag.y, ag.z - hr),
        new THREE.Vector3(ag.x + hr, ag.y + height, ag.z + hr)
      );
      out.push({
        id: ag.id,
        bounds: box,
        kind: 'npc',
        agentId: ag.id,
      });
    }
    return out;
  };

  const getActiveSubtitle = (x: number, y: number, z: number): string => {
    let bestD2 = 8.5 * 8.5;
    let bestText = '';
    for (let i = 0; i < totalCount; i++) {
      const ag = agents[i];
      if (ag.upsetTimer <= 0 || !ag.mutterText) continue;
      const dy = ag.y - y;
      if (Math.abs(dy) > 3.5) continue;
      const d2 = (ag.x - x) ** 2 + (ag.z - z) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestText = ag.mutterText;
      }
    }
    return bestText;
  };

  return {
    root,
    totalCount,
    agents,
    update,
    reseed,
    getRayTargets,
    getActiveSubtitle,
    applyDamageToAgent,
    notifyPlayerGunshot,
    getHiddenHeat: () => hiddenHeat,
    getGangCrewStates: () =>
      crews.map((c) => {
        let maxSusp = 0;
        let aliveCount = 0;
        for (let k = 0; k < c.memberIndices.length; k++) {
          const m = agents[c.memberIndices[k]];
          if (m.alive) aliveCount++;
          if (m.suspicion > maxSusp) maxSusp = m.suspicion;
        }
        return {
          id: c.id,
          districtId: c.districtId,
          state: c.state,
          anchorX: c.anchorX,
          anchorZ: c.anchorZ,
          maxSuspicion: maxSusp,
          memberCount: aliveCount,
        };
      }),
  };
}

