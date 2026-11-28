import * as THREE from 'three';
import {
  applyHumanPose,
  HumanPoseParams,
  HumanRig,
} from './humanCharacter';
import {
  createSharedWeaponMesh,
  getSharedWeaponSpec,
  SharedWeaponId,
} from './sharedWeapon';

export type BehaviorArchetype =
  | 'police'
  | 'mob'
  | 'undercover'
  | 'gang'
  | 'rebel_girl'
  | 'civilian';

export type GunHandlingState =
  | 'unarmed'
  | 'holstered'
  | 'draw'
  | 'carry'
  | 'aim'
  | 'fire'
  | 'low_ready'
  | 'holster'
  | 'reload'
  | 'kneel_roll'
  | 'sneak';

export type InteractionPoseAction =
  | 'none'
  | 'approach'
  | 'shoulder_tap'
  | 'shove'
  | 'shoved_recoil'
  | 'block'
  | 'point'
  | 'beckon'
  | 'hands_up'
  | 'talk_at'
  | 'comply_give'
  | 'freeze'
  | 'flee'
  | 'fight_back'
  | 'brawl_punch'
  | 'pepper_spray'
  | 'sprayed_stagger'
  | 'back_down'
  | 'scavenge_kneel'
  | 'witness_panic'
  | 'bag_over_head'
  | 'kidnap_carry'
  | 'kidnap_struggle'
  | 'thrown_in_van'
  | 'cover_wall'
  | 'cover_poster'
  | 'cover_phone'
  | 'cover_crouch'
  | 'mid_blend_catch'
  | 'slow_glance_back'
  | 'downed';

export type BenchWeaponKind = SharedWeaponId | 'pistol' | 'none';

export type NpcWeaponClass =
  | 'police_officer'
  | 'police_breacher'
  | 'mob_enforcer'
  | 'mob_muscle'
  | 'mob_boss'
  | 'gang_leader'
  | 'gang_robber'
  | 'gang_member'
  | 'gang_botherer'
  | 'undercover_sleuth'
  | 'rebel_girl'
  | 'armed_citizen'
  | 'strong_citizen'
  | 'civilian';

export interface ClassWeaponEntry {
  npcClass: NpcWeaponClass;
  archetype: BehaviorArchetype;
  weaponKind: BenchWeaponKind;
  spawnGunState: GunHandlingState;
  gripSummary: string;
}

/**
 * Canonical Class Weapon Table (derived from sharedWeapon.ts, pedestrianSystem.ts,
 * crimeDirector.ts, and the archetype/civilian design rules).
 */
export const CLASS_WEAPON_TABLE: Record<NpcWeaponClass, ClassWeaponEntry> = {
  police_officer: {
    npcClass: 'police_officer',
    archetype: 'police',
    weaponKind: 'service_carbine',
    spawnGunState: 'low_ready',
    gripSummary: 'Two-hand tactical',
  },
  police_breacher: {
    npcClass: 'police_breacher',
    archetype: 'police',
    weaponKind: 'pump_shotgun',
    spawnGunState: 'low_ready',
    gripSummary: 'Two-hand pump',
  },
  mob_enforcer: {
    npcClass: 'mob_enforcer',
    archetype: 'mob',
    weaponKind: 'service_carbine',
    spawnGunState: 'carry',
    gripSummary: 'Heavy angled shoulder',
  },
  mob_muscle: {
    npcClass: 'mob_muscle',
    archetype: 'mob',
    weaponKind: 'pump_shotgun',
    spawnGunState: 'carry',
    gripSummary: 'Heavy pump swagger',
  },
  mob_boss: {
    npcClass: 'mob_boss',
    archetype: 'mob',
    weaponKind: 'pistol',
    spawnGunState: 'holstered',
    gripSummary: 'One-hand contempt',
  },
  gang_leader: {
    npcClass: 'gang_leader',
    archetype: 'gang',
    weaponKind: 'full_auto_carbine',
    spawnGunState: 'carry',
    gripSummary: 'Lean-in spray',
  },
  gang_robber: {
    npcClass: 'gang_robber',
    archetype: 'gang',
    weaponKind: 'service_carbine',
    spawnGunState: 'holstered',
    gripSummary: 'Sloppy spray shoulder',
  },
  gang_member: {
    npcClass: 'gang_member',
    archetype: 'gang',
    weaponKind: 'pistol',
    spawnGunState: 'holstered',
    gripSummary: 'One-hand canted',
  },
  gang_botherer: {
    npcClass: 'gang_botherer',
    archetype: 'gang',
    weaponKind: 'pistol',
    spawnGunState: 'holstered',
    gripSummary: 'Concealed pistol',
  },
  undercover_sleuth: {
    npcClass: 'undercover_sleuth',
    archetype: 'undercover',
    weaponKind: 'pistol',
    spawnGunState: 'holstered',
    gripSummary: 'Snap two-hand',
  },
  rebel_girl: {
    npcClass: 'rebel_girl',
    archetype: 'rebel_girl',
    weaponKind: 'pistol',
    spawnGunState: 'holstered',
    gripSummary: 'Sharp one-hand',
  },
  armed_citizen: {
    npcClass: 'armed_citizen',
    archetype: 'civilian',
    weaponKind: 'pistol',
    spawnGunState: 'holstered',
    gripSummary: 'Defensive two-hand',
  },
  strong_citizen: {
    npcClass: 'strong_citizen',
    archetype: 'civilian',
    weaponKind: 'none',
    spawnGunState: 'unarmed',
    gripSummary: 'Unarmed physical',
  },
  civilian: {
    npcClass: 'civilian',
    archetype: 'civilian',
    weaponKind: 'none',
    spawnGunState: 'unarmed',
    gripSummary: 'Unarmed',
  },
};

export function resolveClassWeapon(npcClass: NpcWeaponClass): ClassWeaponEntry {
  return CLASS_WEAPON_TABLE[npcClass];
}

export function getWeaponDisplayLabel(weaponKind: BenchWeaponKind): string {
  if (weaponKind === 'none') return 'Unarmed';
  if (weaponKind === 'pistol') return 'Pistol';
  return getSharedWeaponSpec(weaponKind).label;
}

export function getGripDisplayLabel(
  archetype: BehaviorArchetype,
  weaponKind: BenchWeaponKind
): string {
  if (weaponKind === 'none') return 'Unarmed';
  const isLong = weaponKind !== 'pistol';
  if (archetype === 'police') return '2H Drilled';
  if (archetype === 'undercover') return '2H Snap';
  if (archetype === 'civilian') return '2H Defensive';
  if (archetype === 'mob') return isLong ? '2H Heavy' : '1H Contempt';
  if (archetype === 'gang') return isLong ? '2H Spray' : '1H Canted';
  return '1H Sharp';
}

export interface ArchetypeStyleProfile {
  id: BehaviorArchetype;
  label: string;
  instigatorTag: string;
  strideTempo: number;
  strideLength: number;
  hipSwagger: number;
  shoulderBounce: number;
  forwardLean: number;
  stanceWidth: number;
  twoHandAim: boolean;
  aimBodyYaw: number;
  recoilScale: number;
  drawSnapTime: number;
  pistolCantRad: number;
  elbowFlare: number;
  drawSpeedNote: string;
}

export const ARCHETYPE_PROFILES: Record<BehaviorArchetype, ArchetypeStyleProfile> = {
  police: {
    id: 'police',
    label: 'Police',
    instigatorTag: 'LAW · Procedural / Sector Scan',
    strideTempo: 6.4,
    strideLength: 0.96,
    hipSwagger: 0.35,
    shoulderBounce: 0.25,
    forwardLean: 0.03,
    stanceWidth: 1.15,
    twoHandAim: true,
    aimBodyYaw: 0.14,
    recoilScale: 0.52,
    drawSnapTime: 0.34,
    pistolCantRad: 0.0,
    elbowFlare: 0.38,
    drawSpeedNote: 'Drilled two-hand index',
  },
  mob: {
    id: 'mob',
    label: 'Mob',
    instigatorTag: 'TERRITORY · Heavy Swagger',
    strideTempo: 5.1,
    strideLength: 0.88,
    hipSwagger: 1.45,
    shoulderBounce: 0.65,
    forwardLean: -0.04,
    stanceWidth: 1.25,
    twoHandAim: false,
    aimBodyYaw: 0.44,
    recoilScale: 0.78,
    drawSnapTime: 0.46,
    pistolCantRad: 0.04,
    elbowFlare: 0.52,
    drawSpeedNote: 'Unhurried one-hand contempt',
  },
  undercover: {
    id: 'undercover',
    label: 'Undercover Sleuth',
    instigatorTag: 'SYSTEM · Civilian Camouflage',
    strideTempo: 6.5,
    strideLength: 0.94,
    hipSwagger: 0.55,
    shoulderBounce: 0.4,
    forwardLean: 0.01,
    stanceWidth: 0.95,
    twoHandAim: true,
    aimBodyYaw: 0.16,
    recoilScale: 0.42,
    drawSnapTime: 0.28,
    pistolCantRad: 0.0,
    elbowFlare: 0.34,
    drawSpeedNote: 'Snap draw from concealed coat',
  },
  gang: {
    id: 'gang',
    label: 'Street Gang',
    instigatorTag: 'OPPORTUNITY · Pack Restless',
    strideTempo: 7.4,
    strideLength: 1.06,
    hipSwagger: 0.9,
    shoulderBounce: 1.4,
    forwardLean: 0.09,
    stanceWidth: 1.1,
    twoHandAim: false,
    aimBodyYaw: 0.30,
    recoilScale: 1.25,
    drawSnapTime: 0.38,
    pistolCantRad: 0.38,
    elbowFlare: 0.78,
    drawSpeedNote: 'Sloppy flourish / canted lean-in',
  },
  rebel_girl: {
    id: 'rebel_girl',
    label: 'Rebel Girl',
    instigatorTag: 'REBEL · Leather & Pistol',
    strideTempo: 7.0,
    strideLength: 1.02,
    hipSwagger: 0.75,
    shoulderBounce: 0.6,
    forwardLean: 0.05,
    stanceWidth: 0.92,
    twoHandAim: false,
    aimBodyYaw: 0.24,
    recoilScale: 0.92,
    drawSnapTime: 0.32,
    pistolCantRad: 0.06,
    elbowFlare: 0.46,
    drawSpeedNote: 'Sharp pistol draw',
  },
  civilian: {
    id: 'civilian',
    label: 'Citizen',
    instigatorTag: 'CIVILIAN · Temperament Roll',
    strideTempo: 6.4,
    strideLength: 0.95,
    hipSwagger: 0.65,
    shoulderBounce: 0.5,
    forwardLean: 0.01,
    stanceWidth: 0.9,
    twoHandAim: true,
    aimBodyYaw: 0.12,
    recoilScale: 1.15,
    drawSnapTime: 0.42,
    pistolCantRad: 0.0,
    elbowFlare: 0.42,
    drawSpeedNote: 'Defensive concealed two-hand draw',
  },
};

export interface BenchActorAttachments {
  weaponKind: BenchWeaponKind;
  weaponScale: number;
  weaponMesh: THREE.Group | null;
  muzzleAnchor: THREE.Object3D | null;
  magMesh: THREE.Object3D | null;
  magRestPos: THREE.Vector3;
  pumpMesh: THREE.Object3D | null;
  pumpRestPos: THREE.Vector3;
  handMount: THREE.Group;
  holsterMount: THREE.Group;
  sprayCanMesh: THREE.Group | null;
  sprayNozzle: THREE.Object3D | null;
  cashPropMesh: THREE.Group | null;
  bagHoodMesh: THREE.Group;
  fedoraHatMesh: THREE.Group | null;
}

export function createBenchPistolMesh(scale = 1.0): THREE.Group {
  const g = new THREE.Group();
  g.name = 'BenchConcealedPistol';
  const slideMat = new THREE.MeshStandardMaterial({
    color: '#1b2028',
    roughness: 0.38,
    metalness: 0.82,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: '#121418',
    roughness: 0.78,
    metalness: 0.12,
  });

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.036, 0.18), slideMat);
  slide.position.set(0, 0.026, 0.055);
  g.add(slide);

  const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), slideMat);
  barrelTip.rotation.x = Math.PI * 0.5;
  barrelTip.position.set(0, 0.028, 0.148);
  g.add(barrelTip);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.088, 0.038), gripMat);
  grip.position.set(0, -0.028, -0.01);
  grip.rotation.x = 0.24;
  g.add(grip);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.078, 0.03), slideMat);
  mag.name = 'MagazineMesh';
  mag.position.set(0, -0.035, -0.012);
  mag.rotation.x = 0.24;
  g.add(mag);

  const muzzle = new THREE.Object3D();
  muzzle.name = 'MuzzleAnchor';
  muzzle.position.set(0, 0.028, 0.165);
  g.add(muzzle);

  if (scale !== 1.0) g.scale.setScalar(scale);
  return g;
}

function createPepperSprayCanMesh(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#c83428',
    roughness: 0.35,
    metalness: 0.45,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: '#11151b',
    roughness: 0.55,
    metalness: 0.25,
  });
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.105, 10), bodyMat);
  can.position.set(0, 0, 0);
  g.add(can);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.028, 10), capMat);
  cap.position.set(0, 0.062, 0);
  g.add(cap);
  const nozzle = new THREE.Object3D();
  nozzle.name = 'SprayNozzle';
  nozzle.position.set(0, 0.064, 0.022);
  g.add(nozzle);
  return g;
}

function createCashParcelMesh(): THREE.Group {
  const g = new THREE.Group();
  const billMat = new THREE.MeshStandardMaterial({
    color: '#5b7258',
    roughness: 0.85,
  });
  const bandMat = new THREE.MeshStandardMaterial({
    color: '#d6c69c',
    roughness: 0.75,
  });
  const stack = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.026, 0.065), billMat);
  g.add(stack);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.028, 0.067), bandMat);
  g.add(band);
  return g;
}

function createKidnapHoodMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'KidnapBlackHood';
  const clothMat = new THREE.MeshStandardMaterial({
    color: '#0d0f13',
    roughness: 0.94,
    metalness: 0.02,
  });
  const tieMat = new THREE.MeshStandardMaterial({
    color: '#20242c',
    roughness: 0.85,
  });
  const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.122, 0.255, 14), clothMat);
  sack.position.set(0, 0.095, 0.004);
  g.add(sack);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.114, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), clothMat);
  dome.position.set(0, 0.215, 0.004);
  g.add(dome);
  const neckCincher = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 6, 14), tieMat);
  neckCincher.rotation.x = Math.PI * 0.5;
  neckCincher.position.set(0, -0.022, 0.004);
  g.add(neckCincher);
  g.visible = false;
  return g;
}

function createBlackFedoraHatMesh(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'BenchBlackFedora';
  const feltMat = new THREE.MeshPhysicalMaterial({
    color: '#0e1015',
    roughness: 0.88,
    metalness: 0.04,
    sheen: 0.45,
    sheenColor: new THREE.Color('#2d3340'),
    sheenRoughness: 0.7,
    side: THREE.DoubleSide,
  });
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: '#181c24',
    roughness: 0.42,
    metalness: 0.12,
  });

  // Wide fedora brim with classic subtle downward front snap
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.184, 0.194, 0.009, 28),
    feltMat
  );
  brim.scale.set(0.95, 1.0, 1.08);
  brim.position.set(0, 0.002, 0.006);
  g.add(brim);

  // Tapered felt crown
  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.084, 0.106, 0.094, 24),
    feltMat
  );
  crown.scale.set(0.94, 1.0, 1.08);
  crown.position.set(0, 0.052, -0.002);
  g.add(crown);

  // Subtle pinched crown ridge / dome silhouette
  const topCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.084, 0.014, 20),
    feltMat
  );
  topCrown.scale.set(0.84, 1.0, 1.08);
  topCrown.position.set(0, 0.098, -0.002);
  g.add(topCrown);

  // Grosgrain hatband ribbon
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.103, 0.107, 0.022, 24),
    ribbonMat
  );
  band.scale.set(0.945, 1.0, 1.085);
  band.position.set(0, 0.018, -0.002);
  g.add(band);

  g.position.set(0, 0.142, 0.004);
  g.rotation.set(0.06, 0, 0);
  return g;
}

export function attachBenchActorGear(
  rig: HumanRig,
  weaponKind: BenchWeaponKind,
  opts?: { hasPepperSpray?: boolean; hasCashProp?: boolean; hasFedora?: boolean }
): BenchActorAttachments {
  const handMount = new THREE.Group();
  handMount.name = 'BenchWeaponHandMount';
  // Seated directly inside curled rightHandStrapMesh fist web (palm center at y=-0.074)
  handMount.position.set(-0.016, -0.074, 0.018);
  handMount.rotation.set(Math.PI * 0.5, 0, 0);
  rig.rightHandGrp.add(handMount);

  const isLongGun =
    weaponKind === 'service_carbine' ||
    weaponKind === 'full_auto_carbine' ||
    weaponKind === 'pump_shotgun';

  const holsterMount = new THREE.Group();
  holsterMount.name = 'BenchWeaponHolsterMount';
  if (isLongGun) {
    // Slung diagonally across back of chest
    holsterMount.position.set(0.04, 0.24, -0.155);
    holsterMount.rotation.set(Math.PI * 0.62, 0.18, -0.58);
    rig.chest.add(holsterMount);
  } else {
    // Hip / waistband concealed holster on right pelvis
    holsterMount.position.set(0.175, 0.02, 0.03);
    holsterMount.rotation.set(Math.PI * 0.45, 0.08, 0.06);
    rig.pelvis.add(holsterMount);
  }

  const weaponScale = weaponKind === 'pistol' ? 1.0 : 0.92;
  let weaponMesh: THREE.Group | null = null;
  let muzzleAnchor: THREE.Object3D | null = null;
  let magMesh: THREE.Object3D | null = null;
  const magRestPos = new THREE.Vector3();
  let pumpMesh: THREE.Object3D | null = null;
  const pumpRestPos = new THREE.Vector3();

  if (weaponKind !== 'none') {
    weaponMesh =
      weaponKind === 'pistol'
        ? createBenchPistolMesh(weaponScale)
        : createSharedWeaponMesh(weaponScale, weaponKind);
    holsterMount.add(weaponMesh);
    muzzleAnchor = weaponMesh.getObjectByName('MuzzleAnchor') ?? null;
    magMesh = weaponMesh.getObjectByName('MagazineMesh') ?? null;
    if (magMesh) magRestPos.copy(magMesh.position);
    pumpMesh = weaponMesh.getObjectByName('PumpForend') ?? null;
    if (pumpMesh) pumpRestPos.copy(pumpMesh.position);
  }

  let sprayCanMesh: THREE.Group | null = null;
  let sprayNozzle: THREE.Object3D | null = null;
  if (opts?.hasPepperSpray) {
    sprayCanMesh = createPepperSprayCanMesh();
    sprayCanMesh.position.set(-0.014, -0.082, 0.018);
    sprayCanMesh.rotation.set(Math.PI * 0.06, 0, 0);
    sprayCanMesh.visible = false;
    rig.rightHandGrp.add(sprayCanMesh);
    sprayNozzle = sprayCanMesh.getObjectByName('SprayNozzle') ?? null;
  }

  let cashPropMesh: THREE.Group | null = null;
  if (opts?.hasCashProp) {
    cashPropMesh = createCashParcelMesh();
    cashPropMesh.position.set(0.015, -0.085, 0.02);
    cashPropMesh.visible = false;
    rig.leftHandGrp.add(cashPropMesh);
  }

  const bagHoodMesh = createKidnapHoodMesh();
  rig.head.add(bagHoodMesh);

  let fedoraHatMesh: THREE.Group | null = null;
  if (opts?.hasFedora) {
    // Hide any underlying knit beanie / uniform cap mesh so the black fedora seats cleanly
    rig.head.traverse((child) => {
      const m = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
      if (
        (child as THREE.Mesh).isMesh &&
        m &&
        !m.map &&
        typeof m.roughness === 'number' &&
        m.roughness > 0.75
      ) {
        child.visible = false;
      }
    });
    fedoraHatMesh = createBlackFedoraHatMesh();
    rig.head.add(fedoraHatMesh);
  }

  return {
    weaponKind,
    weaponScale,
    weaponMesh,
    muzzleAnchor,
    magMesh,
    magRestPos,
    pumpMesh,
    pumpRestPos,
    handMount,
    holsterMount,
    sprayCanMesh,
    sprayNozzle,
    cashPropMesh,
    bagHoodMesh,
    fedoraHatMesh,
  };
}

export interface BehaviorPoseInput {
  archetype: BehaviorArchetype;
  baseMode: HumanPoseParams['mode'];
  elapsed: number;
  phase: number;
  walkSpeed?: number;
  gunState: GunHandlingState;
  gunStateProgress?: number;
  interaction: InteractionPoseAction;
  interactionProgress?: number;
  lookYaw?: number;
  lookPitch?: number;
  windStrength?: number;
  recoilKick?: number;
  handInPocket?: boolean;
  bagged?: boolean;
}

// Pre-allocated zero-GC scratch math for 2-bone analytical arm IK & chest weapon alignment
const _ikRel = new THREE.Vector3();
const _ikDir = new THREE.Vector3();
const _ikPole = new THREE.Vector3();
const _ikBendN = new THREE.Vector3();
const _ikElbowPos = new THREE.Vector3();
const _ikUpperDir = new THREE.Vector3();
const _ikUpperAxisX = new THREE.Vector3();
const _ikUpperAxisY = new THREE.Vector3();
const _ikUpperAxisZ = new THREE.Vector3();
const _ikUpperMat = new THREE.Matrix4();
const _ikUpperQ = new THREE.Quaternion();

const _wPosChest = new THREE.Vector3();
const _wQuatChest = new THREE.Quaternion();
const _wEuler = new THREE.Euler();
const _wTorsoCompQ = new THREE.Quaternion();
const _wTorsoCompE = new THREE.Euler();
const _wMountQ = new THREE.Quaternion();
const _wMountInvQ = new THREE.Quaternion();
const _wHandChestQ = new THREE.Quaternion();
const _wMountOff = new THREE.Vector3();
const _wWristChest = new THREE.Vector3();
const _wShQ = new THREE.Quaternion();
const _wElQ = new THREE.Quaternion();
const _wForearmQ = new THREE.Quaternion();
const _wHandLocalQ = new THREE.Quaternion();
const _wSupportOff = new THREE.Vector3();
const _wSupportChest = new THREE.Vector3();
const _wHolsterPos = new THREE.Vector3();
const _wHolsterQ = new THREE.Quaternion();
const _wHolsterE = new THREE.Euler();
const _wAimPos = new THREE.Vector3();
const _wAimQ = new THREE.Quaternion();

/**
 * Zero-GC 2-bone analytical IK in `rig.chest` local space.
 * Places wrist (`L2 = 0.252`) or closed fist palm (`L2 = 0.326`) at `targetChest`.
 */
function solveChestArmIK(
  rig: HumanRig,
  sideSign: -1 | 1,
  targetChest: THREE.Vector3,
  elbowLen2: number,
  elbowOutward = 0.55
): void {
  const shoulder = sideSign < 0 ? rig.leftShoulder : rig.rightShoulder;
  const elbow = sideSign < 0 ? rig.leftElbow : rig.rightElbow;

  _ikRel.copy(targetChest).sub(shoulder.position);
  const L1 = 0.275;
  const L2 = elbowLen2;
  const rawDist = _ikRel.length();
  const minDist = Math.abs(L1 - L2) + 0.04;
  const maxDist = L1 + L2 - 0.006;
  const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist < 1e-4) {
    _ikDir.set(0, -1, 0);
  } else {
    _ikDir.copy(_ikRel).multiplyScalar(1 / rawDist);
  }

  const cosA = THREE.MathUtils.clamp(
    (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist),
    -1,
    1
  );
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const cosC = THREE.MathUtils.clamp(
    (L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2),
    -1,
    1
  );
  const elbowBend = Math.PI - Math.acos(cosC);

  // Anatomical elbow pole: down (-Y), outward (+sideSign * X), slightly back (-Z)
  _ikPole.set(sideSign * elbowOutward, -0.85, -0.18).normalize();
  _ikBendN.copy(_ikPole).addScaledVector(_ikDir, -_ikPole.dot(_ikDir));
  if (_ikBendN.lengthSq() < 1e-5) {
    _ikBendN.set(sideSign * 0.7, -0.7, 0).normalize();
  } else {
    _ikBendN.normalize();
  }

  _ikElbowPos
    .copy(_ikDir)
    .multiplyScalar(L1 * cosA)
    .addScaledVector(_ikBendN, L1 * sinA);
  _ikUpperDir.copy(_ikElbowPos).normalize();

  _ikUpperAxisY.copy(_ikUpperDir).negate();
  _ikUpperAxisZ.copy(_ikDir).multiplyScalar(dist).sub(_ikElbowPos);
  _ikUpperAxisZ.addScaledVector(_ikUpperAxisY, -_ikUpperAxisZ.dot(_ikUpperAxisY));
  if (_ikUpperAxisZ.lengthSq() < 1e-6) {
    _ikUpperAxisZ.set(0, 0, 1);
  } else {
    _ikUpperAxisZ.normalize();
  }
  _ikUpperAxisX.crossVectors(_ikUpperAxisY, _ikUpperAxisZ).normalize();
  _ikUpperAxisZ.crossVectors(_ikUpperAxisX, _ikUpperAxisY).normalize();

  _ikUpperMat.makeBasis(_ikUpperAxisX, _ikUpperAxisY, _ikUpperAxisZ);
  _ikUpperQ.setFromRotationMatrix(_ikUpperMat);
  shoulder.rotation.setFromQuaternion(_ikUpperQ, 'XYZ');
  elbow.rotation.set(-elbowBend, 0, 0);
}

function setWeaponParent(
  gear: BenchActorAttachments | undefined,
  inHand: boolean
): void {
  if (!gear || !gear.weaponMesh) return;
  const target = inHand ? gear.handMount : gear.holsterMount;
  if (gear.weaponMesh.parent !== target) {
    target.add(gear.weaponMesh);
  }
}

function setHandGripMeshes(rig: HumanRig, rightGripped: boolean, leftGripped: boolean): void {
  rig.rightHandNormalMesh.visible = !rightGripped;
  rig.rightHandStrapMesh.visible = rightGripped;
  rig.leftHandNormalMesh.visible = !leftGripped;
  rig.leftHandStrapMesh.visible = leftGripped;
}

/**
 * Applies frozen base biomechanical pose (`applyHumanPose`) and layers
 * archetype identity, class-weapon grips via 2-bone arm IK, gun-handling chain,
 * and player/NPC interaction & van-kidnap beats.
 */
export function applyBehaviorPose(
  rig: HumanRig,
  input: BehaviorPoseInput,
  gear?: BenchActorAttachments
): void {
  const prof = ARCHETYPE_PROFILES[input.archetype];
  const elapsed = input.elapsed;
  const phase = input.phase;
  const walkSpeed = input.walkSpeed ?? 0;
  const isMoving = walkSpeed > 0.15;
  const gProg = THREE.MathUtils.clamp(input.gunStateProgress ?? 0, 0, 1);
  const iProg = THREE.MathUtils.clamp(input.interactionProgress ?? 0, 0, 1);

  // Restore weapon sub-part rest transforms deterministically for safe timeline scrubbing
  if (gear?.magMesh) {
    gear.magMesh.visible = true;
    gear.magMesh.position.copy(gear.magRestPos);
  }
  if (gear?.pumpMesh) {
    gear.pumpMesh.position.copy(gear.pumpRestPos);
  }
  if (gear?.bagHoodMesh) {
    gear.bagHoodMesh.visible = !!input.bagged;
  }
  if (gear?.fedoraHatMesh) {
    gear.fedoraHatMesh.visible = !input.bagged;
  }

  // 1. Base frozen rig pose
  const walkCycle = elapsed * prof.strideTempo * (0.75 + Math.min(1.5, walkSpeed * 0.25)) + phase;
  applyHumanPose(rig, {
    mode: isMoving ? 'walking' : input.baseMode,
    elapsed,
    phase,
    walkCycle,
    windStrength: input.windStrength ?? 0.35,
    variantStyle: Math.floor(phase * 10),
  });
  setHandGripMeshes(rig, false, false);

  // 2. Archetype locomotion & idle identity contrast (animation IS identity)
  if (isMoving) {
    const sinW = Math.tanh(Math.sin(walkCycle) * 1.15);
    const strideBoost = prof.strideLength;
    rig.leftHip.rotation.x *= strideBoost;
    rig.rightHip.rotation.x *= strideBoost;
    rig.pelvis.rotation.z += -sinW * 0.025 * prof.hipSwagger;
    rig.pelvis.rotation.y += sinW * 0.045 * prof.hipSwagger;
    rig.spine.rotation.x += prof.forwardLean;
    rig.chest.rotation.z += sinW * 0.03 * prof.shoulderBounce;

    if (input.archetype === 'police') {
      const sectorScan = Math.sin(elapsed * 1.45 + phase) * 0.32;
      rig.neck.rotation.y = sectorScan * 0.4;
      rig.head.rotation.y = sectorScan * 0.6;
      rig.chest.rotation.y *= 0.4;
    } else if (input.archetype === 'mob') {
      rig.head.rotation.x -= 0.07;
      rig.pelvis.position.y -= 0.008;
      rig.leftShoulder.rotation.z += 0.05;
      rig.rightShoulder.rotation.z -= 0.05;
    } else if (input.archetype === 'gang') {
      const bounce = Math.abs(Math.sin(walkCycle)) * 0.026;
      rig.pelvis.position.y += bounce;
      rig.spine.rotation.x += 0.07;
      rig.leftShoulder.rotation.x -= 0.14;
      rig.rightShoulder.rotation.x -= 0.14;
    } else if (input.archetype === 'undercover') {
      if (input.handInPocket !== false && input.gunState === 'holstered') {
        rig.leftShoulder.rotation.set(-0.22, 0.14, 0.04);
        rig.leftElbow.rotation.set(-0.62, 0, -0.18);
        rig.rightShoulder.rotation.set(-0.22, -0.14, -0.04);
        rig.rightElbow.rotation.set(-0.62, 0, 0.18);
      }
    }
  } else {
    if (input.archetype === 'police') {
      rig.leftHip.rotation.z -= 0.04;
      rig.rightHip.rotation.z += 0.04;
      rig.spine.rotation.set(0.01, 0, 0);
      rig.chest.rotation.set(0, 0, 0);
      const scan = Math.sin(elapsed * 1.2 + phase) * 0.34;
      rig.neck.rotation.y = scan * 0.35;
      rig.head.rotation.y = scan * 0.65;
    } else if (input.archetype === 'mob') {
      rig.spine.rotation.x -= 0.035;
      rig.head.rotation.x -= 0.08;
      rig.leftShoulder.rotation.set(-0.18, 0.12, 0.08);
      rig.leftElbow.rotation.set(-0.78, 0, -0.22);
    } else if (input.archetype === 'gang') {
      const fidget = Math.sin(elapsed * 3.1 + phase);
      rig.pelvis.position.x += fidget * 0.028;
      rig.spine.rotation.x += 0.05;
      rig.leftShoulder.rotation.z += 0.06;
      rig.rightShoulder.rotation.z -= 0.06;
      rig.head.rotation.y += Math.sin(elapsed * 2.2 + phase) * 0.18;
    } else if (input.archetype === 'undercover') {
      if (input.handInPocket !== false && input.gunState === 'holstered') {
        rig.leftShoulder.rotation.set(-0.20, 0.14, 0.03);
        rig.leftElbow.rotation.set(-0.56, 0, -0.16);
        rig.rightShoulder.rotation.set(-0.20, -0.14, -0.03);
        rig.rightElbow.rotation.set(-0.56, 0, 0.16);
      }
    }
  }

  // 3. Sneak / Kneel Roll / Tactical Cover-Crouch locomotion layers (before gun IK so weapon compensates torso pitch!)
  if (input.interaction === 'cover_crouch') {
    const isExposed = input.gunState === 'aim' || input.gunState === 'fire';
    const isReloadDuck = input.gunState === 'reload' || input.gunState === 'low_ready' || input.gunState === 'holster';
    const crouchY = isExposed ? 0.74 : isReloadDuck ? 0.48 : 0.58;
    const peekShift = isExposed ? Math.sin(clamp01(iProg) * Math.PI) * 0.06 : 0;
    rig.pelvis.position.y = crouchY;
    rig.pelvis.position.x += peekShift;
    rig.spine.rotation.x += isReloadDuck ? 0.28 : 0.12;
    rig.spine.rotation.z += isExposed ? 0.06 : 0;
    rig.leftHip.rotation.set(-1.12, 0.12, -0.06);
    rig.leftKnee.rotation.set(1.28, 0, 0);
    rig.rightHip.rotation.set(0.18, -0.08, 0.06);
    rig.rightKnee.rotation.set(1.48, 0, 0);
    rig.neck.rotation.x -= isReloadDuck ? 0.22 : 0.06;
    rig.head.rotation.x -= isReloadDuck ? 0.12 : 0.04;
  } else if (input.gunState === 'sneak') {
    const sneakCycle = elapsed * 4.8 + phase;
    const sSin = Math.sin(sneakCycle);
    rig.pelvis.position.y -= 0.24;
    rig.spine.rotation.x += 0.34;
    rig.chest.rotation.x += 0.12;
    rig.neck.rotation.x -= 0.28;
    rig.head.rotation.x -= 0.14;
    rig.leftHip.rotation.x = -0.68 + sSin * 0.32;
    rig.leftKnee.rotation.x = 1.15 - sSin * 0.22;
    rig.rightHip.rotation.x = -0.68 - sSin * 0.32;
    rig.rightKnee.rotation.x = 1.15 + sSin * 0.22;
  } else if (input.gunState === 'kneel_roll') {
    if (gProg < 0.55) {
      const rT = gProg / 0.55;
      rig.pelvis.position.y = THREE.MathUtils.lerp(
        rig.standingPelvisY,
        0.36,
        Math.sin(rT * Math.PI)
      );
      rig.pelvis.rotation.x += rT * Math.PI * 2;
      rig.spine.rotation.x += 0.62;
      rig.leftHip.rotation.x = -1.25;
      rig.leftKnee.rotation.x = 1.85;
      rig.rightHip.rotation.x = -1.25;
      rig.rightKnee.rotation.x = 1.85;
    } else {
      rig.pelvis.position.y = 0.54;
      rig.spine.rotation.x += 0.14;
      rig.leftHip.rotation.set(-1.18, 0.08, -0.05);
      rig.leftKnee.rotation.set(1.22, 0, 0);
      rig.rightHip.rotation.set(0.18, -0.06, 0.05);
      rig.rightKnee.rotation.set(1.42, 0, 0);
    }
  }

  // 4. Gun-Handling State Machine + Archetype Matrix Grips (with exact 2-bone Arm IK)
  const recoil = THREE.MathUtils.clamp(input.recoilKick ?? 0, 0, 1) * prof.recoilScale;
  const weaponKind: BenchWeaponKind = gear?.weaponKind ?? 'none';
  const isLongGun =
    weaponKind === 'service_carbine' ||
    weaponKind === 'full_auto_carbine' ||
    weaponKind === 'pump_shotgun';
  const usesTwoHandGrip = prof.twoHandAim || isLongGun;
  const handScale = rig.rightHandGrp.scale.x || 1;
  const wScale = gear?.weaponScale ?? 1;

  // Helper: place right weapon & (if two-handed or reloading) lock left fist cleanly onto weapon
  const solveWeaponPlacementIK = (
    posX: number,
    posY: number,
    posZ: number,
    pitch: number,
    yaw: number,
    roll: number,
    leftMode: 'support' | 'reload' | 'free',
    reloadPhase = 0
  ) => {
    if (!gear) return;

    // Compensate torso pitch/roll so aim direction stays level & true even in sneak / kneel_roll / gang lean
    const torsoPitch = rig.spine.rotation.x + rig.chest.rotation.x;
    const torsoYaw = rig.spine.rotation.y + rig.chest.rotation.y;
    _wTorsoCompE.set(-torsoPitch, -torsoYaw * 0.65, 0, 'YXZ');
    _wTorsoCompQ.setFromEuler(_wTorsoCompE);

    _wPosChest.set(posX, posY, posZ).applyQuaternion(_wTorsoCompQ);
    _wEuler.set(pitch, yaw, roll, 'YXZ');
    _wQuatChest.setFromEuler(_wEuler).premultiply(_wTorsoCompQ);

    _wMountQ.setFromEuler(gear.handMount.rotation);
    _wMountInvQ.copy(_wMountQ).invert();
    _wHandChestQ.copy(_wQuatChest).multiply(_wMountInvQ);

    _wMountOff
      .copy(gear.handMount.position)
      .multiplyScalar(handScale)
      .applyQuaternion(_wHandChestQ);
    _wWristChest.copy(_wPosChest).sub(_wMountOff);

    solveChestArmIK(rig, 1, _wWristChest, 0.252, prof.elbowFlare);

    _wShQ.setFromEuler(rig.rightShoulder.rotation);
    _wElQ.setFromEuler(rig.rightElbow.rotation);
    _wForearmQ.copy(_wShQ).multiply(_wElQ);
    _wHandLocalQ.copy(_wForearmQ).invert().multiply(_wHandChestQ);
    rig.rightHandGrp.rotation.setFromQuaternion(_wHandLocalQ, 'XYZ');

    const useLeftGrip = leftMode !== 'free';
    setHandGripMeshes(rig, true, useLeftGrip);

    if (leftMode === 'support') {
      if (weaponKind === 'pump_shotgun') {
        const pumpZ = gear.pumpMesh ? gear.pumpMesh.position.z : 0.31;
        _wSupportOff.set(0, 0.015, pumpZ);
      } else if (isLongGun) {
        _wSupportOff.set(-0.004, 0.022, weaponKind === 'full_auto_carbine' ? 0.295 : 0.285);
      } else {
        // Two-hand pistol grip: left palm wraps snugly under/around firing grip
        _wSupportOff.set(-0.024, -0.028, -0.008);
      }
      _wSupportOff.multiplyScalar(wScale).applyQuaternion(_wQuatChest);
      _wSupportChest.copy(_wPosChest).add(_wSupportOff);
      solveChestArmIK(rig, -1, _wSupportChest, 0.326, prof.elbowFlare * 0.9);
      rig.leftHandGrp.rotation.set(0.08, 0.22, -0.34);
    } else if (leftMode === 'reload') {
      // Track magazine drop & fresh mag insertion
      const dropY =
        reloadPhase < 0.16
          ? 0
          : reloadPhase < 0.48
          ? -((reloadPhase - 0.16) / 0.32) * 0.19
          : reloadPhase < 0.82
          ? -(1 - (reloadPhase - 0.48) / 0.34) * 0.19
          : 0;
      if (isLongGun) {
        _wSupportOff.set(
          -0.01,
          (weaponKind === 'pump_shotgun' ? -0.02 : -0.085) + dropY,
          weaponKind === 'pump_shotgun' ? 0.12 : 0.11
        );
      } else {
        _wSupportOff.set(-0.015, -0.045 + dropY, -0.01);
      }
      _wSupportOff.multiplyScalar(wScale).applyQuaternion(_wQuatChest);
      _wSupportChest.copy(_wPosChest).add(_wSupportOff);
      solveChestArmIK(rig, -1, _wSupportChest, 0.326, 0.45);
      rig.leftHandGrp.rotation.set(0.12, 0.28, -0.25);
    } else {
      // One-hand pistol free left arm per archetype style
      if (input.archetype === 'gang') {
        rig.leftShoulder.rotation.set(-0.36, 0.18, -0.38);
        rig.leftElbow.rotation.set(-0.88, 0, 0);
      } else if (input.archetype === 'rebel_girl') {
        rig.leftShoulder.rotation.set(0.16, 0.12, -0.22);
        rig.leftElbow.rotation.set(-0.72, 0, 0);
      } else {
        // Mob: relaxed coat-side / cigarette posture energy
        rig.leftShoulder.rotation.set(-0.14, 0.08, -0.10);
        rig.leftElbow.rotation.set(-0.46, 0, 0);
      }
    }
  };

  // Helper: compute target aim pose for current archetype + weapon
  const applyArchetypeAimPose = (isLowReady: boolean, isCarry: boolean) => {
    if (weaponKind === 'none') return;

    // Torso angle & shoulder pocket per archetype
    const bodyYaw = isLowReady || isCarry ? prof.aimBodyYaw * 0.4 : prof.aimBodyYaw;
    if (!usesTwoHandGrip || isLongGun) {
      rig.spine.rotation.y += bodyYaw;
      rig.chest.rotation.y += bodyYaw * 0.45;
      rig.neck.rotation.y -= bodyYaw * 0.42;
      rig.head.rotation.y -= bodyYaw * 0.52;
    }

    if (isCarry) {
      // Patrol carry across front torso (muzzle ~36° downward, angled left)
      const px = isLongGun ? 0.12 : 0.16;
      const py = isLongGun ? 0.15 : 0.12;
      const pz = isLongGun ? 0.26 : 0.22;
      solveWeaponPlacementIK(
        px,
        py,
        pz,
        0.58,
        isLongGun ? -0.46 : -0.18,
        0.16,
        isLongGun ? 'support' : 'free'
      );
      return;
    }

    if (isLowReady) {
      // Tactical low-ready: ~40° muzzle-down ready index
      const px = isLongGun ? 0.10 : usesTwoHandGrip ? 0.04 : 0.15;
      const py = isLongGun ? 0.18 : 0.17;
      const pz = isLongGun ? 0.30 : 0.29;
      solveWeaponPlacementIK(
        px,
        py,
        pz,
        0.68,
        isLongGun ? -0.24 : -0.06,
        0.08,
        usesTwoHandGrip ? 'support' : 'free'
      );
      return;
    }

    // Active AIM / FIRE pose
    if (isLongGun) {
      // Pump shotgun cycles forend back/forth right after recoil impulse
      if (weaponKind === 'pump_shotgun' && gear?.pumpMesh) {
        const pumpStroke =
          recoil > 0.05 && recoil < 0.72
            ? Math.sin(((0.72 - recoil) / 0.67) * Math.PI) * 0.11
            : 0;
        gear.pumpMesh.position.z = gear.pumpRestPos.z - pumpStroke;
      }
      // Buttstock tucked firmly into right pectoral/shoulder pocket
      const stockX = input.archetype === 'police' ? 0.095 : input.archetype === 'gang' ? 0.115 : 0.11;
      const stockY = input.archetype === 'mob' ? 0.28 : 0.325;
      const stockZ = input.archetype === 'gang' ? 0.35 : 0.325;
      const pitch = -recoil * 0.16;
      const yaw = input.archetype === 'mob' ? -0.12 : 0.02;
      const roll = input.archetype === 'gang' ? 0.10 : 0.0;
      solveWeaponPlacementIK(
        stockX,
        stockY + recoil * 0.025,
        stockZ - recoil * 0.03,
        pitch,
        yaw,
        roll,
        'support'
      );
      // Cheek-weld tilt for drilled police shouldered rifle
      if (input.archetype === 'police') {
        rig.head.rotation.z -= 0.08;
      }
    } else {
      // Pistol aim per archetype matrix
      const pX = usesTwoHandGrip ? 0.025 : 0.145;
      const pY = input.archetype === 'mob' ? 0.31 : 0.345;
      const pZ = usesTwoHandGrip ? 0.43 : 0.415;
      const pitch = -recoil * 0.26;
      const yaw = usesTwoHandGrip ? 0.0 : -0.06;
      const roll = prof.pistolCantRad + recoil * 0.08;
      solveWeaponPlacementIK(
        pX,
        pY + recoil * 0.03,
        pZ - recoil * 0.025,
        pitch,
        yaw,
        roll,
        usesTwoHandGrip ? 'support' : 'free'
      );
    }

    if (recoil > 0.02) {
      rig.chest.rotation.x -= recoil * 0.11;
      rig.head.rotation.x -= recoil * 0.07;
    }
  };

  switch (input.gunState) {
    case 'unarmed':
      setWeaponParent(gear, false);
      break;

    case 'holstered':
      setWeaponParent(gear, false);
      break;

    case 'draw': {
      const snapT = prof.drawSnapTime;
      const inHand = gProg >= snapT;
      setWeaponParent(gear, inHand);
      if (!inHand) {
        const reach = Math.sin((gProg / snapT) * Math.PI * 0.5);
        if (isLongGun) {
          // Reach up/back toward shoulder sling
          rig.rightShoulder.rotation.set(-0.48 * reach, -0.22 * reach, 0.25 * reach);
          rig.rightElbow.rotation.set(-1.35 * reach, 0, 0);
        } else {
          // Reach down to hip holster
          rig.rightShoulder.rotation.set(0.32 * reach, 0.14 * reach, -0.18 * reach);
          rig.rightElbow.rotation.set(-0.92 * reach, 0, 0);
        }
      } else {
        const lift = (gProg - snapT) / (1 - snapT);
        const ease = input.archetype === 'undercover'
          ? 1 - Math.pow(1 - lift, 4) // Snap tell
          : 1 - Math.pow(1 - lift, 2.6);
        const flourish = input.archetype === 'gang' ? Math.sin(lift * Math.PI) * 0.12 : 0;

        // Interpolate smoothly from holster exit coordinates to aim coordinates
        _wHolsterPos.set(isLongGun ? 0.16 : 0.22, isLongGun ? 0.34 : -0.02, isLongGun ? 0.02 : 0.08);
        _wHolsterE.set(isLongGun ? -0.95 : 1.05, 0.2, 0.1, 'YXZ');
        _wHolsterQ.setFromEuler(_wHolsterE);

        const targetX = isLongGun ? 0.105 : usesTwoHandGrip ? 0.025 : 0.145;
        const targetY = isLongGun ? 0.32 : 0.34;
        const targetZ = isLongGun ? 0.33 : usesTwoHandGrip ? 0.43 : 0.415;
        _wAimPos.set(targetX, targetY + flourish, targetZ);
        _wEuler.set(0, 0, prof.pistolCantRad, 'YXZ');
        _wAimQ.setFromEuler(_wEuler);

        _wHolsterPos.lerp(_wAimPos, ease);
        _wHolsterQ.slerp(_wAimQ, ease);
        _wEuler.setFromQuaternion(_wHolsterQ, 'YXZ');

        solveWeaponPlacementIK(
          _wHolsterPos.x,
          _wHolsterPos.y,
          _wHolsterPos.z,
          _wEuler.x,
          _wEuler.y,
          _wEuler.z,
          usesTwoHandGrip && lift > 0.42 ? 'support' : 'free'
        );
      }
      break;
    }

    case 'holster': {
      const inHand = gProg < 0.62;
      setWeaponParent(gear, inHand);
      if (inHand) {
        const drop = smoothstep(0, 0.62, gProg);
        const startX = isLongGun ? 0.10 : usesTwoHandGrip ? 0.04 : 0.15;
        const startY = 0.18;
        const startZ = 0.30;
        const endX = isLongGun ? 0.18 : 0.22;
        const endY = isLongGun ? 0.32 : -0.02;
        const endZ = isLongGun ? 0.0 : 0.06;
        solveWeaponPlacementIK(
          THREE.MathUtils.lerp(startX, endX, drop),
          THREE.MathUtils.lerp(startY, endY, drop),
          THREE.MathUtils.lerp(startZ, endZ, drop),
          THREE.MathUtils.lerp(0.68, isLongGun ? -0.95 : 1.1, drop),
          THREE.MathUtils.lerp(-0.14, 0.18, drop),
          0.1,
          'free'
        );
      } else {
        const ret = 1 - (gProg - 0.62) / 0.38;
        rig.rightShoulder.rotation.set(0.26 * ret, 0.12 * ret, -0.16 * ret);
        rig.rightElbow.rotation.set(-0.78 * ret, 0, 0);
      }
      break;
    }

    case 'carry':
      setWeaponParent(gear, true);
      applyArchetypeAimPose(false, true);
      break;

    case 'low_ready':
      setWeaponParent(gear, true);
      applyArchetypeAimPose(true, false);
      break;

    case 'aim':
    case 'fire':
    case 'sneak':
    case 'kneel_roll':
      setWeaponParent(gear, true);
      applyArchetypeAimPose(false, false);
      break;

    case 'reload': {
      setWeaponParent(gear, true);

      // Animate magazine ejection & fresh mag insertion on carbines & pistols
      if (gear?.magMesh) {
        if (gProg >= 0.18 && gProg < 0.48) {
          const outT = (gProg - 0.18) / 0.30;
          gear.magMesh.position.y = gear.magRestPos.y - outT * 0.22;
        } else if (gProg >= 0.48 && gProg < 0.56) {
          gear.magMesh.visible = false;
        } else if (gProg >= 0.56 && gProg < 0.86) {
          const inT = (gProg - 0.56) / 0.30;
          gear.magMesh.position.y = gear.magRestPos.y - (1 - inT) * 0.22;
        }
      }

      // Archetype reload posture variations
      if (input.archetype === 'undercover') {
        // Shielded reload turned away from street
        rig.spine.rotation.y -= 0.52;
        rig.chest.rotation.y -= 0.18;
        rig.head.rotation.y += 0.32;
      } else if (input.archetype === 'police') {
        // Eyes stay up scanning sectors
        rig.head.rotation.x -= 0.08;
        rig.head.rotation.y += Math.sin(elapsed * 2.2 + phase) * 0.24;
      } else if (input.archetype === 'mob') {
        // Unhurried, almost offended
        rig.head.rotation.x -= 0.06;
        rig.spine.rotation.x -= 0.03;
      } else if (input.archetype === 'gang') {
        // Frantic exposed fumble
        rig.chest.rotation.x += Math.sin(gProg * Math.PI * 6) * 0.04;
        rig.head.rotation.x += 0.22;
      } else {
        rig.head.rotation.x += 0.2;
      }

      const slapJolt = gProg > 0.84 ? Math.sin(((gProg - 0.84) / 0.16) * Math.PI) * 0.035 : 0;
      const rx = input.archetype === 'undercover' ? 0.03 : 0.07;
      const ry = (isLongGun ? 0.24 : 0.26) + slapJolt;
      const rz = input.archetype === 'undercover' ? 0.23 : 0.28;
      solveWeaponPlacementIK(
        rx,
        ry,
        rz,
        0.16,
        -0.52,
        input.archetype === 'mob' ? 0.42 : 0.30,
        'reload',
        gProg
      );
      break;
    }
  }

  // 5. Player-Interaction, Civilian Response & Drive-By Kidnapping Overlays
  if (gear?.sprayCanMesh) gear.sprayCanMesh.visible = false;
  if (gear?.cashPropMesh) gear.cashPropMesh.visible = false;

  switch (input.interaction) {
    case 'shoulder_tap': {
      const reach =
        iProg < 0.35
          ? iProg / 0.35
          : iProg < 0.8
          ? 1.0
          : 1.0 - (iProg - 0.8) / 0.2;
      const tapPulse =
        iProg > 0.35 && iProg < 0.78 ? Math.sin((iProg - 0.35) * 18) * 0.04 : 0;
      rig.spine.rotation.x += 0.08 * reach;
      rig.rightShoulder.rotation.x = THREE.MathUtils.lerp(
        rig.rightShoulder.rotation.x,
        -1.32 + tapPulse,
        reach
      );
      rig.rightShoulder.rotation.y = THREE.MathUtils.lerp(
        rig.rightShoulder.rotation.y,
        0.16,
        reach
      );
      rig.rightShoulder.rotation.z = THREE.MathUtils.lerp(
        rig.rightShoulder.rotation.z,
        -0.06,
        reach
      );
      rig.rightElbow.rotation.x = THREE.MathUtils.lerp(
        rig.rightElbow.rotation.x,
        -0.36 + tapPulse * 1.4,
        reach
      );
      rig.rightHandGrp.rotation.set(0.35 * reach, -0.18 * reach, 0);
      break;
    }
    case 'bag_over_head': {
      // Kidnapper stays at clean arm's reach (~0.72m) and sweeps black hood onto target's head via 2-bone IK
      setWeaponParent(gear, false);
      const reach = Math.sin(Math.min(1, iProg) * Math.PI * 0.85);
      rig.spine.rotation.x += 0.10 * reach;
      _wSupportChest.set(-0.14, 0.14 + 0.14 * reach, 0.24 + 0.30 * reach);
      solveChestArmIK(rig, -1, _wSupportChest, 0.326, 0.52);
      _wSupportChest.set(0.14, 0.14 + 0.14 * reach, 0.24 + 0.30 * reach);
      solveChestArmIK(rig, 1, _wSupportChest, 0.326, 0.52);
      rig.leftHandGrp.rotation.set(0.15, 0.28, -0.2);
      rig.rightHandGrp.rotation.set(0.15, -0.28, 0.2);
      setHandGripMeshes(rig, true, true);
      break;
    }
    case 'kidnap_carry': {
      // Clean 2-hand lapel / upper-arm haul at 0.72m separation — zero chest/knee meshing!
      setWeaponParent(gear, false);
      const heave = Math.sin(Math.min(1, iProg) * Math.PI);
      rig.pelvis.position.y -= 0.04;
      rig.spine.rotation.x -= 0.06 + heave * 0.06;
      rig.chest.rotation.x -= 0.04;
      _wSupportChest.set(-0.18, 0.05 + heave * 0.06, 0.50);
      solveChestArmIK(rig, -1, _wSupportChest, 0.326, 0.45);
      _wSupportChest.set(0.18, 0.05 + heave * 0.06, 0.50);
      solveChestArmIK(rig, 1, _wSupportChest, 0.326, 0.45);
      rig.leftHandGrp.rotation.set(0.08, 0.32, -0.25);
      rig.rightHandGrp.rotation.set(0.08, -0.32, 0.25);
      setHandGripMeshes(rig, true, true);
      break;
    }
    case 'kidnap_struggle': {
      // Bagged victim leans away / kicks & tries to pull wrists free without clipping into grabber
      const thrash = Math.sin(elapsed * 14 + phase);
      rig.spine.rotation.set(-0.16 + thrash * 0.10, thrash * 0.16, thrash * 0.08);
      rig.chest.rotation.set(-0.10, -thrash * 0.14, 0);
      rig.leftHip.rotation.x = -0.32 + thrash * 0.36;
      rig.leftKnee.rotation.x = 0.62 + Math.abs(thrash) * 0.38;
      rig.rightHip.rotation.x = -0.32 - thrash * 0.36;
      rig.rightKnee.rotation.x = 0.62 + Math.abs(-thrash) * 0.38;
      rig.leftShoulder.rotation.set(-0.78 + thrash * 0.22, 0.22, 0.28);
      rig.leftElbow.rotation.set(-1.18, 0, -0.18);
      rig.rightShoulder.rotation.set(-0.78 - thrash * 0.22, -0.22, -0.28);
      rig.rightElbow.rotation.set(-1.18, 0, 0.18);
      break;
    }
    case 'thrown_in_van': {
      // Victim pitched headfirst cleanly through open black van doorway
      const p = clamp01(iProg);
      rig.pelvis.position.set(0, 0.48, 0);
      rig.pelvis.rotation.set(0.68 + p * 0.55, 0, 0.14 * p);
      rig.spine.rotation.set(0.22, 0, 0.08);
      rig.leftHip.rotation.set(-0.24, 0.08, -0.06);
      rig.leftKnee.rotation.set(0.72, 0, 0);
      rig.rightHip.rotation.set(-0.10, -0.08, 0.06);
      rig.rightKnee.rotation.set(0.88, 0, 0);
      rig.leftShoulder.rotation.set(-1.38, 0.18, 0.16);
      rig.rightShoulder.rotation.set(-1.30, -0.18, -0.16);
      break;
    }
    case 'shove': {
      const thrust = Math.sin(Math.min(1, iProg) * Math.PI);
      rig.spine.rotation.x += 0.26 * thrust;
      rig.chest.rotation.x += 0.14 * thrust;
      rig.leftShoulder.rotation.set(-1.35 * thrust - 0.2, -0.18, 0.12);
      rig.leftElbow.rotation.set(-0.22 - (1 - thrust) * 0.9, 0, -0.1);
      rig.rightShoulder.rotation.set(-1.35 * thrust - 0.2, 0.18, -0.12);
      rig.rightElbow.rotation.set(-0.22 - (1 - thrust) * 0.9, 0, 0.1);
      break;
    }
    case 'shoved_recoil': {
      const env = Math.sin(Math.min(1, iProg) * Math.PI);
      rig.pelvis.position.z -= 0.16 * env;
      rig.spine.rotation.x -= 0.32 * env;
      rig.chest.rotation.x -= 0.18 * env;
      rig.head.rotation.x -= 0.16 * env;
      rig.leftShoulder.rotation.set(-0.55 * env, 0.1, 0.38 * env);
      rig.rightShoulder.rotation.set(-0.48 * env, -0.1, -0.38 * env);
      break;
    }
    case 'block': {
      rig.leftHip.rotation.z -= 0.07;
      rig.rightHip.rotation.z += 0.07;
      rig.leftShoulder.rotation.set(-0.18, 0.08, 0.24);
      rig.leftElbow.rotation.set(-0.48, 0, -0.14);
      rig.rightShoulder.rotation.set(-0.18, -0.08, -0.24);
      rig.rightElbow.rotation.set(-0.48, 0, 0.14);
      rig.head.rotation.x -= 0.06;
      break;
    }
    case 'point': {
      const pEnv = Math.sin(Math.min(1, iProg) * Math.PI * 0.85);
      rig.spine.rotation.y += 0.18 * pEnv;
      rig.rightShoulder.rotation.set(-1.42 * pEnv - 0.1, -0.04, -0.08);
      rig.rightElbow.rotation.set(-0.14, 0, 0);
      rig.leftShoulder.rotation.set(-0.15, 0.08, 0.12);
      rig.leftElbow.rotation.set(-0.42, 0, -0.08);
      break;
    }
    case 'beckon': {
      const wave = Math.sin(elapsed * 6.5) * 0.26;
      rig.rightShoulder.rotation.set(-1.12, -0.14, -0.18);
      rig.rightElbow.rotation.set(-1.15 + wave, 0, 0.12);
      break;
    }
    case 'hands_up': {
      const tremble = Math.sin(elapsed * 22 + phase) * 0.025;
      rig.spine.rotation.x -= 0.05;
      rig.leftShoulder.rotation.set(-1.85 + tremble, 0.12, 0.32);
      rig.leftElbow.rotation.set(-1.12, 0, -0.12);
      rig.leftHandGrp.rotation.set(-0.32, 0.2, 0);
      rig.rightShoulder.rotation.set(-1.85 - tremble, -0.12, -0.32);
      rig.rightElbow.rotation.set(-1.12, 0, 0.12);
      rig.rightHandGrp.rotation.set(-0.32, -0.2, 0);
      rig.browLeft.position.y += 0.003;
      rig.browRight.position.y += 0.003;
      break;
    }
    case 'comply_give': {
      if (gear?.cashPropMesh) gear.cashPropMesh.visible = iProg < 0.78;
      const ext = Math.sin(Math.min(1, iProg) * Math.PI);
      rig.leftShoulder.rotation.set(-1.15 * ext - 0.2, -0.14, 0.14);
      rig.leftElbow.rotation.set(-0.35, 0, -0.08);
      rig.rightShoulder.rotation.set(-1.45, -0.16, -0.26);
      rig.rightElbow.rotation.set(-1.15, 0, 0.12);
      break;
    }
    case 'talk_at': {
      const gest = Math.sin(elapsed * 4.2 + phase) * 0.16;
      rig.spine.rotation.x += 0.04;
      rig.leftShoulder.rotation.set(-0.42 + gest * 0.5, 0.16, 0.1);
      rig.leftElbow.rotation.set(-1.05 + gest, 0, -0.18);
      rig.rightShoulder.rotation.set(-0.34 - gest * 0.3, -0.12, -0.08);
      rig.rightElbow.rotation.set(-0.88 - gest * 0.6, 0, 0.16);
      break;
    }
    case 'freeze': {
      const shiver = Math.sin(elapsed * 32 + phase) * 0.018;
      rig.spine.rotation.set(0.08, shiver, shiver);
      rig.chest.rotation.set(0.05, -shiver, 0);
      rig.leftShoulder.rotation.set(-0.28, 0.18, 0.06);
      rig.leftElbow.rotation.set(-1.12 + shiver * 2, 0, -0.18);
      rig.rightShoulder.rotation.set(-0.28, -0.18, -0.06);
      rig.rightElbow.rotation.set(-1.12 - shiver * 2, 0, 0.18);
      rig.eyelidLeft.rotation.x = -0.42;
      rig.eyelidRight.rotation.x = -0.42;
      rig.browLeft.position.y += 0.0036;
      rig.browRight.position.y += 0.0036;
      break;
    }
    case 'flee': {
      const sprintW = elapsed * 13.5 + phase;
      const sSin = Math.sin(sprintW);
      const sCos = Math.cos(sprintW);
      rig.pelvis.position.y = rig.standingPelvisY - 0.04 + Math.abs(sCos) * 0.055;
      rig.spine.rotation.x = 0.28;
      rig.chest.rotation.x = 0.14;
      rig.leftHip.rotation.x = -sSin * 0.88;
      rig.leftKnee.rotation.x = Math.max(0.08, -sCos * 1.18 + 0.35);
      rig.rightHip.rotation.x = sSin * 0.88;
      rig.rightKnee.rotation.x = Math.max(0.08, sCos * 1.18 + 0.35);
      rig.leftShoulder.rotation.set(sSin * 0.92 - 0.35, 0.08, 0.12);
      rig.leftElbow.rotation.set(-1.35, 0, -0.1);
      rig.rightShoulder.rotation.set(-sSin * 0.92 - 0.35, -0.08, -0.12);
      rig.rightElbow.rotation.set(-1.35, 0, 0.1);
      break;
    }
    case 'fight_back': {
      const punch = Math.sin(Math.min(1, iProg) * Math.PI);
      rig.pelvis.position.y -= 0.04;
      rig.spine.rotation.set(0.18, -0.35 * punch, 0);
      rig.chest.rotation.y -= 0.28 * punch;
      rig.leftHip.rotation.x = -0.32;
      rig.leftKnee.rotation.x = 0.36;
      rig.rightHip.rotation.x = 0.26;
      rig.rightKnee.rotation.x = 0.24;
      rig.rightShoulder.rotation.set(-1.42 * punch - 0.45, 0.12, -0.18);
      rig.rightElbow.rotation.set(-0.22 - (1 - punch) * 0.95, 0, 0.08);
      rig.leftShoulder.rotation.set(-0.92, 0.24, 0.22);
      rig.leftElbow.rotation.set(-1.32, 0, -0.2);
      break;
    }
    case 'brawl_punch': {
      // Multi-beat boxing brawl: bob/weave footwork, chin guard up, alternating crisp left jab & right hook
      setWeaponParent(gear, false);
      setHandGripMeshes(rig, true, true);
      const combo = iProg * 2.0;
      const jab = combo < 1.0 ? Math.sin(combo * Math.PI) : 0;
      const cross = combo >= 1.0 ? Math.sin((combo - 1.0) * Math.PI) : 0;
      const weave = Math.sin(elapsed * 7.5 + phase) * 0.06;
      rig.pelvis.position.y -= 0.065;
      rig.pelvis.position.x += weave * 0.5;
      rig.spine.rotation.set(0.20, 0.26 * jab - 0.38 * cross, weave * 0.8);
      rig.chest.rotation.y += 0.22 * jab - 0.32 * cross;
      rig.leftHip.rotation.set(-0.36, 0.08, -0.06);
      rig.leftKnee.rotation.set(0.46, 0, 0);
      rig.rightHip.rotation.set(0.22, -0.08, 0.06);
      rig.rightKnee.rotation.set(0.32, 0, 0);
      // Left arm alternates jab extension & tight chin guard
      rig.leftShoulder.rotation.set(-1.05 - 0.46 * jab, 0.22 - 0.16 * jab, 0.22);
      rig.leftElbow.rotation.set(-1.42 + 1.18 * jab, 0, -0.18);
      // Right arm alternates tight cheek guard & snapping cross punch
      rig.rightShoulder.rotation.set(-1.02 - 0.50 * cross, -0.22 + 0.18 * cross, -0.22);
      rig.rightElbow.rotation.set(-1.46 + 1.24 * cross, 0, 0.18);
      break;
    }
    case 'pepper_spray': {
      if (gear?.sprayCanMesh) gear.sprayCanMesh.visible = true;
      const aimLift = THREE.MathUtils.clamp(iProg * 2.4, 0, 1);
      rig.spine.rotation.x -= 0.08 * aimLift;
      rig.rightShoulder.rotation.set(-1.44 * aimLift, -0.08, -0.08);
      rig.rightElbow.rotation.set(-0.18, 0, 0.04);
      rig.leftShoulder.rotation.set(-0.55 * aimLift, 0.24, 0.18);
      rig.leftElbow.rotation.set(-0.92, 0, -0.15);
      setHandGripMeshes(rig, true, false);
      break;
    }
    case 'sprayed_stagger': {
      setWeaponParent(gear, false);
      setHandGripMeshes(rig, false, false);
      const rub = Math.sin(elapsed * 14 + phase) * 0.12;
      rig.pelvis.position.y -= 0.07;
      rig.spine.rotation.set(0.32, Math.sin(elapsed * 4.5) * 0.14, 0);
      rig.chest.rotation.x += 0.18;
      rig.head.rotation.set(0.32, Math.sin(elapsed * 6.0) * 0.18, 0);
      rig.leftShoulder.rotation.set(-1.28, 0.34, 0.12);
      rig.leftElbow.rotation.set(-1.82 + rub, 0, -0.28);
      rig.rightShoulder.rotation.set(-1.28, -0.34, -0.12);
      rig.rightElbow.rotation.set(-1.82 - rub, 0, 0.28);
      rig.eyelidLeft.rotation.x = 0.32;
      rig.eyelidRight.rotation.x = 0.32;
      break;
    }
    case 'back_down': {
      rig.spine.rotation.x -= 0.06;
      rig.leftShoulder.rotation.set(-1.12, 0.18, 0.28);
      rig.leftElbow.rotation.set(-0.95, 0, -0.12);
      rig.leftHandGrp.rotation.set(-0.35, 0.25, 0);
      break;
    }
    case 'scavenge_kneel': {
      setWeaponParent(gear, false);
      setHandGripMeshes(rig, false, false);
      const rummageL = Math.sin(elapsed * 5.6 + phase) * 0.22;
      const rummageR = Math.cos(elapsed * 6.4 + phase) * 0.24;
      const glanceUp = Math.max(0, Math.sin(elapsed * 1.4 + phase) - 0.68) * 2.2;
      rig.pelvis.position.set(0, 0.44, 0.04);
      rig.pelvis.rotation.set(0.14, 0, 0);
      rig.spine.rotation.set(0.56, Math.sin(elapsed * 2.1 + phase) * 0.08, 0);
      rig.chest.rotation.set(0.24, 0, 0);
      rig.neck.rotation.set(0.18 - glanceUp * 0.28, glanceUp * 0.22, 0);
      rig.head.rotation.set(0.22 - glanceUp * 0.42, glanceUp * 0.38, 0);

      rig.leftHip.rotation.set(-1.32, 0.14, -0.06);
      rig.leftKnee.rotation.set(1.52, 0, 0);
      rig.rightHip.rotation.set(0.14, -0.08, 0.06);
      rig.rightKnee.rotation.set(1.58, 0, 0);

      rig.leftShoulder.rotation.set(-1.28 + rummageL * 0.5, 0.22, 0.08);
      rig.leftElbow.rotation.set(-0.62 + rummageL, 0, -0.14);
      rig.rightShoulder.rotation.set(-1.34 + rummageR * 0.5, -0.22, -0.08);
      rig.rightElbow.rotation.set(-0.56 + rummageR, 0, 0.14);
      break;
    }
    case 'witness_panic': {
      const tremor = Math.sin(elapsed * 19 + phase) * 0.025;
      rig.spine.rotation.set(-0.08, tremor, 0);
      rig.chest.rotation.set(-0.05, -tremor, 0);
      rig.leftShoulder.rotation.set(-1.25 + tremor, 0.26, 0.18);
      rig.leftElbow.rotation.set(-1.62, 0, -0.15);
      rig.rightShoulder.rotation.set(-1.12 - tremor, -0.18, -0.22);
      rig.rightElbow.rotation.set(-1.38, 0, 0.12);
      rig.eyelidLeft.rotation.x = -0.44;
      rig.eyelidRight.rotation.x = -0.44;
      rig.browLeft.position.y += 0.004;
      rig.browRight.position.y += 0.004;
      break;
    }
    case 'cover_wall': {
      // Sleuth hugs kiosk wall or poster pillar: shoulders & arms tucked tight, subtle head peek around edge
      const peek = Math.sin(elapsed * 1.45 + phase) * 0.14;
      rig.pelvis.position.y -= 0.03;
      rig.spine.rotation.set(0.05, -0.16, 0.04);
      rig.chest.rotation.set(0.03, -0.12, 0.02);
      rig.neck.rotation.set(-0.02, 0.18 + peek * 0.4, 0);
      rig.head.rotation.set(-0.03, 0.26 + peek * 0.6, 0);
      rig.leftShoulder.rotation.set(-0.24, 0.14, 0.02);
      rig.leftElbow.rotation.set(-0.68, 0, -0.14);
      rig.rightShoulder.rotation.set(-0.24, -0.14, -0.02);
      rig.rightElbow.rotation.set(-0.68, 0, 0.14);
      break;
    }
    case 'cover_poster': {
      // Watcher stopped studying poster pillar / shelter wall: relaxed hip weight shift, slight head tilt
      const sway = Math.sin(elapsed * 1.1 + phase) * 0.025;
      rig.pelvis.position.x += 0.018;
      rig.pelvis.rotation.z -= 0.03;
      rig.spine.rotation.set(0.03, sway, 0.02);
      rig.neck.rotation.set(-0.04, 0.04, 0);
      rig.head.rotation.set(-0.08, 0.08 + Math.sin(elapsed * 0.7 + phase) * 0.05, 0.03);
      rig.leftShoulder.rotation.set(-0.22, 0.14, 0.04);
      rig.leftElbow.rotation.set(-0.62, 0, -0.16);
      rig.rightShoulder.rotation.set(-0.32, -0.12, -0.06);
      rig.rightElbow.rotation.set(-1.05, 0, 0.14);
      break;
    }
    case 'cover_phone': {
      // Watcher stopped holding a pocket watch / phone gaze as camouflage
      rig.spine.rotation.x += 0.06;
      rig.neck.rotation.x += 0.14;
      rig.head.rotation.x += 0.22;
      rig.leftShoulder.rotation.set(-0.56, 0.18, 0.08);
      rig.leftElbow.rotation.set(-1.38, 0, -0.14);
      rig.leftHandGrp.rotation.set(-0.2, 0.3, 0);
      rig.rightShoulder.rotation.set(-0.20, -0.14, -0.04);
      rig.rightElbow.rotation.set(-0.56, 0, 0.16);
      break;
    }
    case 'mid_blend_catch': {
      // Quick-turn catch: caught looking directly at player's back before snapping head away into cover
      const snapAway = smoothstep(0.42, 0.88, iProg);
      rig.spine.rotation.set(0.02, THREE.MathUtils.lerp(0.0, -0.42, snapAway), 0);
      rig.neck.rotation.y = THREE.MathUtils.lerp(0.0, -0.35, snapAway);
      rig.head.rotation.y = THREE.MathUtils.lerp(0.0, -0.68, snapAway);
      rig.head.rotation.x = THREE.MathUtils.lerp(-0.04, 0.08, snapAway);
      rig.eyelidLeft.rotation.x = THREE.MathUtils.lerp(-0.36, 0.0, snapAway);
      rig.eyelidRight.rotation.x = THREE.MathUtils.lerp(-0.36, 0.0, snapAway);
      rig.leftShoulder.rotation.set(-0.24, 0.14, 0.04);
      rig.leftElbow.rotation.set(-0.62, 0, -0.16);
      rig.rightShoulder.rotation.set(
        THREE.MathUtils.lerp(-0.22, -0.45, snapAway),
        -0.14,
        -0.04
      );
      rig.rightElbow.rotation.set(THREE.MathUtils.lerp(-0.58, -1.25, snapAway), 0, 0.16);
      break;
    }
    case 'slow_glance_back': {
      // Smooth casual shoulder check backward & forward
      const glance = Math.sin(Math.min(1, iProg) * Math.PI);
      rig.spine.rotation.y += glance * 0.45;
      rig.chest.rotation.y += glance * 0.35;
      rig.neck.rotation.y += glance * 0.38;
      rig.head.rotation.y += glance * 0.55;
      break;
    }
    case 'downed': {
      setWeaponParent(gear, false);
      setHandGripMeshes(rig, false, false);
      rig.pelvis.position.set(0, 0.22, 0);
      rig.pelvis.rotation.set(Math.PI * 0.48, 0.2, 0.12);
      rig.spine.rotation.set(0.08, 0.1, 0);
      rig.leftHip.rotation.set(-0.18, 0.14, -0.18);
      rig.leftKnee.rotation.set(0.35, 0, 0);
      rig.rightHip.rotation.set(-0.08, -0.18, 0.16);
      rig.rightKnee.rotation.set(0.18, 0, 0);
      rig.leftShoulder.rotation.set(-0.24, 0.1, 0.55);
      rig.rightShoulder.rotation.set(0.12, -0.15, -0.48);
      break;
    }
    case 'none':
    case 'approach':
    default:
      break;
  }

  // 6. Subtle gaze/head lock toward partner if provided
  if (
    input.lookYaw !== undefined &&
    input.interaction !== 'sprayed_stagger' &&
    input.interaction !== 'downed' &&
    input.interaction !== 'thrown_in_van'
  ) {
    const yaw = THREE.MathUtils.clamp(input.lookYaw, -1.25, 1.25);
    rig.neck.rotation.y += yaw * 0.36;
    rig.head.rotation.y += yaw * 0.64;
  }
  if (
    input.lookPitch !== undefined &&
    input.interaction !== 'sprayed_stagger' &&
    input.interaction !== 'downed' &&
    input.interaction !== 'thrown_in_van'
  ) {
    const p = THREE.MathUtils.clamp(input.lookPitch, -0.5, 0.5);
    rig.neck.rotation.x += p * 0.35;
    rig.head.rotation.x += p * 0.65;
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / Math.max(1e-5, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp01(v: number): number {
  return THREE.MathUtils.clamp(v, 0, 1);
}
