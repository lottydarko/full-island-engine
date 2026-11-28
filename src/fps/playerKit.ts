import * as THREE from 'three';
import {
  buildPlainFlashlight,
  createSoftFlashlightCookieTexture,
  type PlainFlashlightRig,
} from './flashlight';
import {
  buildFuturisticGun,
  type FuturisticShotgunRig,
} from './futuristicGun';
import {
  buildRealisticHands,
  type HandStance,
  type RealisticHandsRig,
} from './hands';
import {
  createFirstPersonLegs,
  type FirstPersonLegsRig,
} from './legs';
import { buildPistol, type PistolRig } from './pistol';
import {
  DEFAULT_PLAYER_CONFIG,
  mergePlayerConfig,
  type PlayerKitConfig,
} from './playerConfig';
import {
  buildRetroSovietSmg,
  buildRusticRussianShotgun,
  buildRusticRussianSmg,
  type RetroWeaponRig,
} from './russianWeapons';
import {
  PLAYER_KIT_SOUND_EVENTS,
  type PlayerInputSource,
  type PlayerSoundEventListener,
  type PlayerSoundEventName,
  type PlayerSoundEventPayload,
} from './soundEvents';
import { buildTacticalSword, type TacticalSwordRig } from './sword';
import type { SkinToneId } from './textures';
import type {
  CourseBox,
  WallMaterialKind,
  WallRunCourseSpec,
} from '../lab/courseData';
import {
  detectLedgeGrabCandidate,
  integrateAndResolveCourseCollision,
  type ClimbCandidate,
} from '../lab/wallRunPhysics';

export {
  DEFAULT_PLAYER_CONFIG,
  mergePlayerConfig,
  PLAYER_KIT_SOUND_EVENTS,
  type PlayerKitConfig,
  type PlayerInputSource,
  type PlayerSoundEventListener,
  type PlayerSoundEventName,
  type PlayerSoundEventPayload,
};
export { CinematicPostProcessor, type CameraPostFrameParams } from './postProcess';

export type PlayerWeaponId =
  | 'pistol9mm'
  | 'futuristic'
  | 'rustSmg'
  | 'retroSmg'
  | 'rustShotgun'
  | 'sword'
  | 'flashlight'
  | 'unarmed';

export type ParkourState =
  | 'ground'
  | 'air'
  | 'slide'
  | 'wallRun'
  | 'wallRunUp'
  | 'wallSlide'
  | 'ledgeHang'
  | 'ledgeClimb'
  | 'armClimb';

export const WEAPON_LABELS: Record<PlayerWeaponId, string> = {
  pistol9mm: '9mm Tactical Pistol',
  futuristic: 'VX-9 Heavy Shotgun',
  rustSmg: 'PP-41 Rusted SMG',
  retroSmg: 'AK-74M Soviet Carbine',
  rustShotgun: 'KS-23 Vostok Shotgun',
  sword: 'Tactical Katana',
  flashlight: 'Utility Flashlight',
  unarmed: 'Bare Hands (Unarmed)',
};

export interface PlayerKitState {
  weaponId: PlayerWeaponId;
  weaponLabel: string;
  ammo: number;
  maxAmmo: number;
  isAds: boolean;
  adsBlend: number;
  isReloading: boolean;
  isSprinting: boolean;
  isCrouching: boolean;
  isSliding: boolean;
  isGrounded: boolean;
  isPointerLocked: boolean;
  flashlightOn: boolean;
  parkourState: ParkourState;
  wallRunTimer: number;
  wallRunMaxSec: number;
  wallSide: -1 | 0 | 1;
  wallMaterial: WallMaterialKind | null;
  wallSlideTimer: number;
  canPowerBounce: boolean;
  lastBounceUpVel: number;
  speedMps: number;
  gamepadConnected: boolean;
  checkpointLabel: string;
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  cameraMotionX: number;
  cameraMotionY: number;
  speedBlur: number;
  flashIntensity: number;
}

export interface PlayerKitOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  courseSpec: WallRunCourseSpec;
  maxAnisotropy?: number;
  skinTone?: SkinToneId;
  config?: Parameters<typeof mergePlayerConfig>[0];
  initialWeapon?: PlayerWeaponId;
  shootableMeshes?: THREE.Object3D[];
  onBulletHit?: (
    point: THREE.Vector3,
    normal: THREE.Vector3,
    hitObj: THREE.Object3D,
  ) => void;
  onWallSlideParticle?: (
    x: number,
    y: number,
    z: number,
    nx: number,
    nz: number,
    material: WallMaterialKind,
  ) => void;
  onSoundEvent?: PlayerSoundEventListener;
  onInteract?: (source: PlayerInputSource) => void;
  onStateChange?: (state: PlayerKitState) => void;
}

type WeaponHolsterZone = 'back' | 'hip' | 'chest' | 'none';

export const WEAPON_ORDER: PlayerWeaponId[] = [
  'pistol9mm',
  'futuristic',
  'rustSmg',
  'retroSmg',
  'rustShotgun',
  'sword',
  'flashlight',
  'unarmed',
];

const WEAPON_MAX_AMMO: Record<PlayerWeaponId, number> = {
  pistol9mm: 15,
  futuristic: 8,
  rustSmg: 71,
  retroSmg: 30,
  rustShotgun: 6,
  sword: 0,
  flashlight: 0,
  unarmed: 0,
};

function getWeaponHolsterZone(id: PlayerWeaponId): WeaponHolsterZone {
  if (
    id === 'futuristic' ||
    id === 'rustShotgun' ||
    id === 'rustSmg' ||
    id === 'retroSmg' ||
    id === 'sword'
  ) {
    return 'back';
  }
  if (id === 'pistol9mm') return 'hip';
  if (id === 'flashlight') return 'chest';
  return 'none';
}

// Pre-allocated scratch helpers — zero GC in per-frame update
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecD = new THREE.Vector3();
const _vecE = new THREE.Vector3();
const _vecF = new THREE.Vector3();
const _vecG = new THREE.Vector3();
const _posLTarget = new THREE.Vector3();
const _posRTarget = new THREE.Vector3();
const _quatB = new THREE.Quaternion();
const _quatC = new THREE.Quaternion();
const _quatD = new THREE.Quaternion();
const _quatLTarget = new THREE.Quaternion();
const _quatRTarget = new THREE.Quaternion();
const _matA = new THREE.Matrix4();
const _matB = new THREE.Matrix4();
const _eulerA = new THREE.Euler(0, 0, 0, 'YXZ');
const _hitNormal = new THREE.Vector3(0, 1, 0);

export class PlayerKit {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private config: PlayerKitConfig;
  private courseSpec: WallRunCourseSpec;
  private boxes: readonly CourseBox[];
  private shootableMeshes: THREE.Object3D[];
  private onBulletHit?: (
    point: THREE.Vector3,
    normal: THREE.Vector3,
    hitObj: THREE.Object3D,
  ) => void;
  private onWallSlideParticle?: (
    x: number,
    y: number,
    z: number,
    nx: number,
    nz: number,
    material: WallMaterialKind,
  ) => void;

  private soundListeners = new Set<PlayerSoundEventListener>();
  private interactListeners = new Set<(source: PlayerInputSource) => void>();
  private onStateChange?: (state: PlayerKitState) => void;
  private lastInputSource: PlayerInputSource = 'kbm';

  private weaponPivot: THREE.Group;
  private vmKeyLight: THREE.PointLight;
  private vmRimLight: THREE.PointLight;

  private pistol9mm: PistolRig;
  private futuristicGun: FuturisticShotgunRig;
  private rustSmg: RetroWeaponRig;
  private retroSmg: RetroWeaponRig;
  private rustShotgun: RetroWeaponRig;
  private sword: TacticalSwordRig;
  private plainFlashlight: PlainFlashlightRig;
  private hands: RealisticHandsRig;
  private legs: FirstPersonLegsRig;

  private flashlightSpot: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;
  private flashlightCookie: THREE.Texture;
  private flashlightOn = true;
  private flashlightClickTimer = 0;

  private activeWeaponId: PlayerWeaponId;
  private pendingWeaponId: PlayerWeaponId | null = null;
  private swapFromWeaponId: PlayerWeaponId;
  private swapTimer = 0;
  private swapDuration = 0.62;
  private swapCamRoll = 0;
  private swapCamPitch = 0;

  private ammoByWeapon: Record<PlayerWeaponId, number> = { ...WEAPON_MAX_AMMO };
  private fireCooldown = 0;
  private triggerPull = 0;
  private slidePos = 0;
  private slideHoldTimer = 0;
  private flashTimer = 0;
  private activeFlashIntensity = 0;
  private fireHeat = 0;
  private shotgunPumpTimer = -1;
  private shotgunPumpAudioPlayed = false;

  private yaw = 0;
  private pitch = 0;
  private prevYaw = 0;
  private prevPitch = 0;
  /** World coordinates of player's feet */
  private feetPos = new THREE.Vector3(0, 0, 2);
  /** World coordinates of player's camera eye */
  private playerPos = new THREE.Vector3(0, 1.66, 2);
  private playerEyeHeight = 1.66;
  private verticalVel = 0;
  private isGrounded = true;
  private landDipY = 0;
  /** Full 3D horizontal velocity vector (m/s); .y stays 0 */
  private moveVel = new THREE.Vector3();
  private walkPhase = 0;
  private footstepAccum = 0;

  // Ground Crouch & Slide state
  private isCrouching = false;
  private isSliding = false;
  private slideTimer = 0;
  private slideCooldown = 0;
  private slideDir = new THREE.Vector3(0, 0, -1);
  private slideSpeed = 0;
  private slideBlend = 0;
  private crouchBlend = 0;
  private slideLeanSign = -1;
  private sprintBlend = 0;
  private airSprintActive = false;
  private jumpLoadTimer = -1;
  private jumpLoadFromSlide = false;
  private jumpLoadSrc: PlayerInputSource = 'kbm';
  private jumpLoadCamDip = 0;
  private jumpLoadCamPitch = 0;
  private jumpLoadBlend = 0;
  private wallJumpLoadTimer = -1;
  private wallJumpLoadMode: 'none' | 'wallRun' | 'armClimb' = 'none';
  private wallJumpLoadSrc: PlayerInputSource = 'kbm';
  private airFallTimer = 0;
  private legsYaw = 0;
  private dynamicFovBonus = 0;
  private shotFovKick = 0;
  private strafeCamRoll = 0;
  private blurVelX = 0;
  private blurVelY = 0;

  // Wall-Run, Wall Run-Up & Wall-Slide state (Lotty's 4-Second Law + Power Bounce)
  private wallMode: 'none' | 'wallRun' | 'wallRunUp' | 'wallSlide' = 'none';
  private wallSide: -1 | 0 | 1 = 0;
  private wallFaceId = '';
  private wallNormalX = 0;
  private wallNormalZ = 0;
  private wallTangentX = 0;
  private wallTangentZ = -1;
  private wallMaterial: WallMaterialKind | null = null;
  private wallRunTimer = 0;
  private wallRunSpeed = 0;
  private wallSlideTimer = 0;
  private wallRunBlend = 0;
  private wallRunUpBlend = 0;
  private wallSlideBlend = 0;
  private wallCamRoll = 0;
  private wallContactPulse = 0;
  private wallStepAccum = 0;
  private wallParticleAccum = 0;
  private wallPullAwayTimer = 0;
  private wallSlideHeldCrouchEntry = false;
  private lastDismountFaceId = '';
  private sameWallCooldown = 0;
  private lastBounceUpVel = 0;
  private wallSurfaceDistM = 0.44;
  private wallBoxTop = 0;
  private wallIsClimbable = false;

  // Ledge Grab, Mantle Climb & Arm-Climb state
  private ledgeState: 'none' | 'hang' | 'climb' | 'armClimb' = 'none';
  private ledgeSavedWeaponId: PlayerWeaponId = 'pistol9mm';
  private ledgeHangTimer = 0;
  private ledgeClimbTimer = 0;
  private ledgeClimbDuration = 1.08;
  private ledgeCooldown = 0;
  private ledgeBlend = 0;
  private ledgeHangPos = new THREE.Vector3();
  private ledgeStandPos = new THREE.Vector3();
  private ledgeStartPos = new THREE.Vector3();
  private ledgeNormalX = 0;
  private ledgeNormalZ = 1;
  private ledgeContactX = 0;
  private ledgeContactZ = 0;
  private ledgeBoxTop = 0;

  // Hand-over-hand 4-beat Arm Climb state
  private armClimbBlend = 0;
  private armClimbPhase = 0;
  private armClimbStep = 0;
  private armClimbBaseStep = 0;
  private armClimbTime = 0;
  private armClimbEntryErrY = 0;
  private armClimbCamRoll = 0;
  private armClimbCamDip = 0;
  private armClimbCamPitch = 0;
  private armClimbStepRung = 0;
  private armClimbDir = 0;
  private armClimbBoxId = '';
  private armClimbFaceId = '';
  private armClimbLastFaceId = '';
  private armClimbCooldown = 0;
  private armClimbSameFaceCooldown = 0;
  private armClimbTangentX = 1;
  private armClimbTangentZ = 0;
  private armClimbContactX = 0;
  private armClimbContactZ = 0;
  private armClimbBoxBot = 0;
  private activeClimbCandidate: ClimbCandidate | null = null;

  // Checkpoint tracking
  private activeCheckpointIndex = 0;

  // Input states
  private keys = new Set<string>();
  private isPointerLocked = false;
  private prevCrouchHeld = false;
  private prevJumpHeld = false;
  private lmbHeld = false;
  private rtHeld = false;
  private adsHeld = false;
  private gpAdsHeld = false;
  private adsToggled = false;
  private adsBlend = 0;
  private prevWantsAds = false;

  private gpMoveFwd = 0;
  private gpMoveRight = 0;
  private gpSprint = false;
  private gpSprintLatched = false;
  private prevLsPressed = false;
  private gpCrouch = false;
  private gpJump = false;
  private gpConnected = false;
  private prevRtPressed = false;
  private prevXPressed = false;
  private prevYPressed = false;
  private prevLbPressed = false;
  private prevDpadPressed = false;

  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private swayX = 0;
  private swayY = 0;

  private recoilKickZ = 0;
  private recoilKickZVel = 0;
  private recoilPitch = 0;
  private recoilPitchVel = 0;
  private recoilRoll = 0;
  private recoilRollVel = 0;
  private cameraPitchKick = 0;
  private cameraPitchKickVel = 0;
  private cameraYawKick = 0;
  private cameraRollKick = 0;
  private cameraRollKickVel = 0;
  private cameraTrauma = 0;

  private isReloading = false;
  private reloadTime = 0;
  private reloadCamRoll = 0;
  private reloadCamPitch = 0;
  private leftHandRestPos = new THREE.Vector3();
  private leftHandRestQuat = new THREE.Quaternion();
  private reloadMagQuat = new THREE.Quaternion();
  private reloadOverhandQuat = new THREE.Quaternion();

  private swordSwingActive = false;
  private swordSwingTime = 0;
  private swordSwingDuration = 0.46;
  private swordComboStep = 0;
  private swordComboQueued = false;
  private swordComboResetTimer = 0;
  private swordHitChecked = false;
  private swordCamRoll = 0;
  private swordCamPitch = 0;

  private quickMeleeActive = false;
  private quickMeleeTime = 0;
  private quickMeleeReturnWeapon: PlayerWeaponId = 'pistol9mm';
  private quickMeleeHitChecked = false;

  private raycaster = new THREE.Raycaster();
  private screenCenter = new THREE.Vector2(0, 0);
  private elapsed = 0;
  private stateEmitAccum = 0;
  private disposed = false;

  constructor(options: PlayerKitOptions) {
    this.scene = options.scene;
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.courseSpec = options.courseSpec;
    this.boxes = options.courseSpec.boxes;
    this.config = mergePlayerConfig(options.config);
    this.shootableMeshes = options.shootableMeshes ?? [];
    this.onBulletHit = options.onBulletHit;
    this.onWallSlideParticle = options.onWallSlideParticle;
    this.onStateChange = options.onStateChange;

    if (options.onSoundEvent) this.soundListeners.add(options.onSoundEvent);
    if (options.onInteract) this.interactListeners.add(options.onInteract);

    this.playerEyeHeight = this.config.movement.standEyeHeight;
    this.feetPos.copy(this.courseSpec.spawnPosition);
    this.yaw = this.courseSpec.spawnYawRad;
    this.legsYaw = this.yaw;
    this.playerPos.set(
      this.feetPos.x,
      this.feetPos.y + this.playerEyeHeight,
      this.feetPos.z,
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.fov = this.config.camera.hipFov;
    this.camera.updateProjectionMatrix();
    if (!this.camera.parent) {
      this.scene.add(this.camera);
    }

    const maxAniso = options.maxAnisotropy ?? 4;
    const tone = options.skinTone ?? 'medium';

    this.flashlightCookie = createSoftFlashlightCookieTexture();
    this.flashlightSpot = new THREE.SpotLight(0xfff6e8, 0, 32, 0.78, 0.92, 1.15);
    this.flashlightSpot.map = this.flashlightCookie;
    this.flashlightSpot.castShadow = false;
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlightSpot);
    this.scene.add(this.flashlightTarget);
    this.flashlightSpot.target = this.flashlightTarget;

    this.weaponPivot = new THREE.Group();
    this.weaponPivot.name = 'PlayerKitWeaponPivot';
    this.camera.add(this.weaponPivot);

    this.vmKeyLight = new THREE.PointLight(0xfff4e4, 0.78, 1.4, 2);
    this.vmKeyLight.position.set(-0.26, 0.24, -0.06);
    this.camera.add(this.vmKeyLight);

    this.vmRimLight = new THREE.PointLight(0xcbe0ff, 0.56, 1.4, 2);
    this.vmRimLight.position.set(0.3, 0.16, -0.34);
    this.camera.add(this.vmRimLight);

    this.pistol9mm = buildPistol(maxAniso);
    this.futuristicGun = buildFuturisticGun(maxAniso);
    this.rustSmg = buildRusticRussianSmg(maxAniso);
    this.retroSmg = buildRetroSovietSmg(maxAniso);
    this.rustShotgun = buildRusticRussianShotgun(maxAniso);
    this.sword = buildTacticalSword(maxAniso);
    this.plainFlashlight = buildPlainFlashlight(maxAniso);
    this.hands = buildRealisticHands(tone, maxAniso);
    this.legs = createFirstPersonLegs(maxAniso);
    this.scene.add(this.legs.root);

    this.weaponPivot.add(
      this.pistol9mm.root,
      this.futuristicGun.root,
      this.rustSmg.root,
      this.retroSmg.root,
      this.rustShotgun.root,
      this.sword.root,
      this.plainFlashlight.root,
      this.hands.root,
    );

    this.activeWeaponId = options.initialWeapon ?? 'pistol9mm';
    this.swapFromWeaponId = this.activeWeaponId;
    this.applyVisibleWeaponRig(this.activeWeaponId);
    this.hands.getReloadHandQuat('magGrip', this.reloadMagQuat);
    this.hands.getReloadHandQuat('overhandPinch', this.reloadOverhandQuat);

    this.bindEvents();
  }

  private get ammo(): number {
    return this.ammoByWeapon[this.activeWeaponId];
  }
  private set ammo(val: number) {
    this.ammoByWeapon[this.activeWeaponId] = val;
  }
  private get maxAmmo(): number {
    return WEAPON_MAX_AMMO[this.activeWeaponId];
  }

  private getFirearmRig(): PistolRig | null {
    switch (this.activeWeaponId) {
      case 'pistol9mm':
        return this.pistol9mm;
      case 'futuristic':
        return this.futuristicGun;
      case 'rustSmg':
        return this.rustSmg;
      case 'retroSmg':
        return this.retroSmg;
      case 'rustShotgun':
        return this.rustShotgun;
      default:
        return null;
    }
  }

  private getStanceForWeapon(id: PlayerWeaponId): HandStance {
    if (id === 'unarmed') return 'unarmed';
    if (id === 'sword') return 'sword';
    if (id === 'flashlight') return 'flashlight';
    if (id === 'futuristic' || id === 'rustShotgun') return 'shotgun';
    if (id === 'rustSmg' || id === 'retroSmg') return 'smg';
    return 'pistol';
  }

  private applyVisibleWeaponRig(id: PlayerWeaponId) {
    this.pistol9mm.root.visible = id === 'pistol9mm';
    this.futuristicGun.root.visible = id === 'futuristic';
    this.rustSmg.root.visible = id === 'rustSmg';
    this.retroSmg.root.visible = id === 'retroSmg';
    this.rustShotgun.root.visible = id === 'rustShotgun';
    this.sword.root.visible = id === 'sword';
    this.plainFlashlight.root.visible = id === 'flashlight';

    this.pistol9mm.setMuzzleFlash(0);
    this.futuristicGun.setMuzzleFlash(0);
    this.rustSmg.setMuzzleFlash(0);
    this.retroSmg.setMuzzleFlash(0);
    this.rustShotgun.setMuzzleFlash(0);
    this.pistol9mm.setFlashlightOn(this.flashlightOn && id === 'pistol9mm');
    this.futuristicGun.setFlashlightOn(this.flashlightOn && id === 'futuristic');
    this.rustSmg.setFlashlightOn(this.flashlightOn && id === 'rustSmg');
    this.retroSmg.setFlashlightOn(this.flashlightOn && id === 'retroSmg');
    this.rustShotgun.setFlashlightOn(this.flashlightOn && id === 'rustShotgun');
    this.plainFlashlight.setOn(this.flashlightOn && id === 'flashlight');

    this.hands.setStance(this.getStanceForWeapon(id));
    this.hands.getLeftHandRestPose(this.leftHandRestPos, this.leftHandRestQuat);
    this.hands.leftHandGroup.position.copy(this.leftHandRestPos);
    this.hands.leftHandGroup.quaternion.copy(this.leftHandRestQuat);
    this.hands.resetLeftElbowPose();
    this.hands.resetRightElbowPose();
    this.hands.setLeftHandReloadPose(0, 0);
  }

  private emitSoundEvent(
    event: PlayerSoundEventName,
    source: PlayerInputSource = this.lastInputSource,
    intensity = 1,
  ) {
    if (this.soundListeners.size === 0) return;
    const payload: PlayerSoundEventPayload = {
      event,
      weaponId: this.activeWeaponId,
      source,
      intensity,
    };
    for (const cb of this.soundListeners) cb(payload);
  }

  private hasBoundKey(codes: readonly string[]): boolean {
    for (let i = 0; i < codes.length; i++) {
      if (this.keys.has(codes[i])) return true;
    }
    return false;
  }

  public getConfig(): PlayerKitConfig {
    return this.config;
  }

  public setShootableMeshes(meshes: THREE.Object3D[]) {
    this.shootableMeshes = meshes;
  }

  public requestPointerLock() {
    if (document.pointerLockElement !== this.domElement) {
      this.domElement.requestPointerLock?.();
    }
  }

  public respawnAtCheckpoint(index?: number) {
    const cpIdx =
      index !== undefined
        ? Math.max(0, Math.min(this.courseSpec.checkpoints.length - 1, index))
        : this.activeCheckpointIndex;
    this.activeCheckpointIndex = cpIdx;
    const cp = this.courseSpec.checkpoints[cpIdx];
    this.feetPos.copy(cp.position);
    this.yaw = cp.yawRad;
    this.legsYaw = this.yaw;
    this.pitch = 0;
    this.moveVel.set(0, 0, 0);
    this.verticalVel = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.isCrouching = false;
    this.gpSprintLatched = false;
    this.airSprintActive = false;
    this.jumpLoadTimer = -1;
    this.wallJumpLoadTimer = -1;
    this.wallJumpLoadMode = 'none';
    this.jumpLoadCamDip = 0;
    this.jumpLoadCamPitch = 0;
    this.jumpLoadBlend = 0;
    this.airFallTimer = 0;
    this.wallSlideHeldCrouchEntry = false;
    if (this.ledgeState !== 'none') {
      this.ledgeState = 'none';
      this.restoreWeaponAfterLedge(true);
    }
    this.ledgeBlend = 0;
    this.ledgeCooldown = 0;
    this.wallRunUpBlend = 0;
    this.armClimbBlend = 0;
    this.armClimbPhase = 0;
    this.armClimbStep = 0;
    this.armClimbBaseStep = 0;
    this.armClimbTime = 0;
    this.armClimbEntryErrY = 0;
    this.armClimbCamRoll = 0;
    this.armClimbCamDip = 0;
    this.armClimbCamPitch = 0;
    this.armClimbStepRung = 0;
    this.armClimbDir = 0;
    this.armClimbBoxId = '';
    this.armClimbFaceId = '';
    this.armClimbLastFaceId = '';
    this.armClimbCooldown = 0;
    this.armClimbSameFaceCooldown = 0;
    this.activeClimbCandidate = null;
    this.exitWallMode('none');
  }

  public onSoundEvent(listener: PlayerSoundEventListener) {
    this.soundListeners.add(listener);
  }

  public offSoundEvent(listener: PlayerSoundEventListener) {
    this.soundListeners.delete(listener);
  }

  public onInteract(listener: (source: PlayerInputSource) => void) {
    this.interactListeners.add(listener);
  }

  public offInteract(listener: (source: PlayerInputSource) => void) {
    this.interactListeners.delete(listener);
  }

  public getState(): PlayerKitState {
    const parkourState: ParkourState =
      this.ledgeState === 'hang'
        ? 'ledgeHang'
        : this.ledgeState === 'climb'
          ? 'ledgeClimb'
          : this.ledgeState === 'armClimb'
            ? 'armClimb'
            : this.wallMode === 'wallRun'
              ? 'wallRun'
              : this.wallMode === 'wallRunUp'
                ? 'wallRunUp'
                : this.wallMode === 'wallSlide'
                  ? 'wallSlide'
                  : this.isSliding
                    ? 'slide'
                    : this.isGrounded
                      ? 'ground'
                      : 'air';

    return {
      weaponId: this.activeWeaponId,
      weaponLabel: WEAPON_LABELS[this.activeWeaponId],
      ammo: this.ammo,
      maxAmmo: this.maxAmmo,
      isAds: this.adsBlend > 0.45,
      adsBlend: this.adsBlend,
      isReloading: this.isReloading,
      isSprinting: this.sprintBlend > 0.35,
      isCrouching: this.isCrouching,
      isSliding: this.isSliding,
      isGrounded: this.isGrounded,
      isPointerLocked: this.isPointerLocked,
      flashlightOn: this.flashlightOn,
      parkourState,
      wallRunTimer: this.wallRunTimer,
      wallRunMaxSec: this.config.wallRun.maxDurationSec,
      wallSide: this.wallSide,
      wallMaterial: this.wallMaterial,
      wallSlideTimer: this.wallSlideTimer,
      canPowerBounce: this.wallMode === 'wallSlide',
      lastBounceUpVel: this.lastBounceUpVel,
      speedMps: Math.hypot(this.moveVel.x, this.moveVel.z),
      gamepadConnected: this.gpConnected,
      checkpointLabel:
        this.courseSpec.checkpoints[this.activeCheckpointIndex]?.label ??
        '01 · Launch Deck',
      position: this.playerPos.clone(),
      yaw: this.yaw,
      pitch: this.pitch,
      cameraMotionX: this.blurVelX,
      cameraMotionY: this.blurVelY,
      speedBlur: THREE.MathUtils.clamp(
        this.slideBlend * 0.85 +
          this.sprintBlend * 0.25 +
          this.wallRunBlend * 0.48 +
          this.wallRunUpBlend * 0.35,
        0,
        1,
      ),
      flashIntensity: this.activeFlashIntensity,
    };
  }

  public triggerInteract(source: PlayerInputSource = this.lastInputSource) {
    this.lastInputSource = source;
    for (const cb of this.interactListeners) cb(source);
  }

  public toggleFlashlight(source: PlayerInputSource = this.lastInputSource) {
    this.lastInputSource = source;
    this.flashlightOn = !this.flashlightOn;
    this.flashlightClickTimer = 0.18;
    this.pistol9mm.setFlashlightOn(
      this.flashlightOn && this.activeWeaponId === 'pistol9mm',
    );
    this.futuristicGun.setFlashlightOn(
      this.flashlightOn && this.activeWeaponId === 'futuristic',
    );
    this.rustSmg.setFlashlightOn(
      this.flashlightOn && this.activeWeaponId === 'rustSmg',
    );
    this.retroSmg.setFlashlightOn(
      this.flashlightOn && this.activeWeaponId === 'retroSmg',
    );
    this.rustShotgun.setFlashlightOn(
      this.flashlightOn && this.activeWeaponId === 'rustShotgun',
    );
    this.plainFlashlight.setOn(
      this.flashlightOn && this.activeWeaponId === 'flashlight',
    );
    this.emitSoundEvent(
      this.flashlightOn ? 'flashlight_on' : 'flashlight_off',
      source,
    );
  }

  public switchWeapon(
    target?: PlayerWeaponId,
    source: PlayerInputSource = this.lastInputSource,
  ) {
    this.lastInputSource = source;
    if (this.quickMeleeActive || this.ledgeState !== 'none') return;
    const current = this.pendingWeaponId ?? this.activeWeaponId;
    const next: PlayerWeaponId =
      target ??
      WEAPON_ORDER[(WEAPON_ORDER.indexOf(current) + 1) % WEAPON_ORDER.length];
    if (next === this.activeWeaponId && !this.pendingWeaponId) return;

    this.isReloading = false;
    this.reloadTime = 0;
    this.shotgunPumpTimer = -1;
    this.swordSwingActive = false;
    this.swordComboQueued = false;
    this.adsToggled = false;
    this.lmbHeld = false;
    this.rtHeld = false;
    this.swapFromWeaponId = this.activeWeaponId;
    this.pendingWeaponId = next;
    this.swapTimer = 0.001;
    const fromBig = getWeaponHolsterZone(this.swapFromWeaponId) === 'back';
    const toBig = getWeaponHolsterZone(next) === 'back';
    this.swapDuration = fromBig || toBig ? 0.56 : 0.42;
    this.emitSoundEvent('weapon_lower', source);
  }

  public triggerQuickMelee(source: PlayerInputSource = this.lastInputSource) {
    this.lastInputSource = source;
    if (this.quickMeleeActive || this.pendingWeaponId || this.ledgeState !== 'none') return;
    if (this.activeWeaponId === 'sword') {
      this.fireShot(source);
      return;
    }
    this.isReloading = false;
    this.reloadTime = 0;
    this.shotgunPumpTimer = -1;
    this.adsToggled = false;
    this.lmbHeld = false;
    this.quickMeleeReturnWeapon = this.activeWeaponId;
    this.quickMeleeActive = true;
    this.quickMeleeTime = 0;
    this.quickMeleeHitChecked = false;
    this.activeWeaponId = 'sword';
    this.applyVisibleWeaponRig('sword');
    this.emitSoundEvent('swing', source, 1.0);
  }

  public triggerReload(source: PlayerInputSource = this.lastInputSource) {
    this.lastInputSource = source;
    if (this.isReloading || this.pendingWeaponId || this.quickMeleeActive || this.ledgeState !== 'none') return;
    if (this.activeWeaponId === 'unarmed') return;
    if (
      this.activeWeaponId !== 'sword' &&
      this.activeWeaponId !== 'flashlight' &&
      this.ammo >= this.maxAmmo
    ) {
      return;
    }
    this.isReloading = true;
    this.reloadTime = 0;
    this.adsToggled = false;
    this.shotgunPumpTimer = -1;
    if (this.activeWeaponId !== 'sword' && this.activeWeaponId !== 'flashlight') {
      this.emitSoundEvent('reload_start', source);
    }
  }

  private performBallisticRaycast() {
    if (this.shootableMeshes.length === 0) return;
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    this.raycaster.far = 90;
    const hits = this.raycaster.intersectObjects(this.shootableMeshes, false);
    if (hits.length > 0) {
      const h = hits[0];
      if (h.face) {
        _hitNormal
          .copy(h.face.normal)
          .transformDirection(h.object.matrixWorld)
          .normalize();
      } else {
        _hitNormal.set(0, 1, 0);
      }
      this.onBulletHit?.(h.point, _hitNormal, h.object);
    }
    this.raycaster.far = Infinity;
  }

  public fireShot(source: PlayerInputSource = this.lastInputSource) {
    this.lastInputSource = source;
    if (this.pendingWeaponId || this.quickMeleeActive || this.ledgeState !== 'none') return;
    if (this.activeWeaponId === 'unarmed') return;

    if (this.activeWeaponId === 'flashlight') {
      this.toggleFlashlight(source);
      return;
    }

    if (this.activeWeaponId === 'sword') {
      if (this.swordSwingActive) {
        if (this.swordSwingTime > this.swordSwingDuration * 0.34) {
          this.swordComboQueued = true;
        }
        return;
      }
      this.swordSwingActive = true;
      this.swordSwingTime = 0;
      this.swordHitChecked = false;
      this.swordComboStep =
        this.swordComboResetTimer > 0 ? (this.swordComboStep + 1) % 3 : 0;
      this.swordComboResetTimer = 0.85;
      this.swordSwingDuration = this.swordComboStep === 2 ? 0.5 : 0.42;
      this.emitSoundEvent('swing', source, this.swordComboStep === 2 ? 1.0 : 0.85);
      return;
    }

    if (this.isReloading || this.fireCooldown > 0) return;

    if (this.ammo <= 0) {
      this.triggerPull = 1;
      this.fireCooldown = 0.16;
      this.emitSoundEvent('dry_fire', source);
      return;
    }

    const isVx9 = this.activeWeaponId === 'futuristic';
    const isKs23 = this.activeWeaponId === 'rustShotgun';
    const isShotgun = isVx9 || isKs23;
    const isSmg =
      this.activeWeaponId === 'rustSmg' || this.activeWeaponId === 'retroSmg';
    const adsDamp = THREE.MathUtils.lerp(1.0, 0.62, this.adsBlend);

    this.ammo = Math.max(0, this.ammo - 1);
    this.triggerPull = 1;
    this.slidePos = 0.068;
    this.slideHoldTimer = isShotgun ? 0.05 : 0.03;

    if (isShotgun) {
      this.fireCooldown = isKs23 ? 0.7 : 0.62;
      this.flashTimer = isKs23 ? 0.092 : 0.082;
      this.fireHeat = Math.min(1, this.fireHeat + (isKs23 ? 0.78 : 0.72));
      this.shotgunPumpTimer = 0;
      this.shotgunPumpAudioPlayed = false;

      const kickMult = isKs23 ? 1.24 : 1.08;
      this.recoilKickZVel += 1.65 * adsDamp * kickMult;
      this.recoilPitchVel += 4.95 * adsDamp * kickMult;
      this.recoilRollVel += (Math.random() - 0.5) * 4.4 * adsDamp * kickMult;
      this.cameraPitchKickVel += (1.92 + Math.random() * 0.36) * adsDamp * kickMult;
      this.cameraYawKick += (Math.random() - 0.5) * 0.036 * adsDamp * kickMult;
      this.cameraRollKickVel +=
        (Math.random() < 0.5 ? -1 : 1) *
        (1.28 + Math.random() * 0.45) *
        adsDamp *
        kickMult;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.88 * kickMult);
      this.shotFovKick = Math.min(5.2, this.shotFovKick + 3.4 * kickMult);
    } else if (isSmg) {
      this.fireCooldown = this.activeWeaponId === 'rustSmg' ? 0.078 : 0.094;
      this.flashTimer = 0.056;
      this.fireHeat = Math.min(1, this.fireHeat + 0.24);
      this.recoilKickZVel += 0.82 * adsDamp;
      this.recoilPitchVel += 2.65 * adsDamp;
      this.recoilRollVel += (Math.random() - 0.5) * 3.0 * adsDamp;
      this.cameraPitchKickVel += (0.82 + Math.random() * 0.24) * adsDamp;
      this.cameraYawKick += (Math.random() - 0.5) * 0.022 * adsDamp;
      this.cameraRollKickVel += (Math.random() - 0.5) * 1.15 * adsDamp;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.46);
      this.shotFovKick = Math.min(3.8, this.shotFovKick + 1.38);
    } else {
      this.fireCooldown = 0.12;
      this.flashTimer = 0.06;
      this.recoilKickZVel += 1.08 * adsDamp;
      this.recoilPitchVel += 3.65 * adsDamp;
      this.recoilRollVel += (Math.random() - 0.5) * 3.2 * adsDamp;
      this.cameraPitchKickVel += (1.18 + Math.random() * 0.25) * adsDamp;
      this.cameraYawKick += (Math.random() - 0.5) * 0.02 * adsDamp;
      this.cameraRollKickVel +=
        (Math.random() < 0.5 ? -1 : 1) * (0.68 + Math.random() * 0.28) * adsDamp;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.54);
      this.shotFovKick = Math.min(3.6, this.shotFovKick + 1.65);
    }

    this.performBallisticRaycast();
    this.emitSoundEvent('fire', source, isShotgun ? 1.0 : 0.85);
  }

  private onPointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    if (!this.isPointerLocked) {
      this.adsHeld = false;
      this.lmbHeld = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked) return;
    this.lastInputSource = 'kbm';
    const sens = THREE.MathUtils.lerp(
      this.config.camera.mouseSensitivityHip,
      this.config.camera.mouseSensitivityAds,
      this.adsBlend,
    );
    this.yaw -= e.movementX * sens;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - e.movementY * sens,
      this.config.camera.pitchMin,
      this.config.camera.pitchMax,
    );
    this.mouseDeltaX += e.movementX;
    this.mouseDeltaY += e.movementY;
  };

  private onMouseDown = (e: MouseEvent) => {
    this.lastInputSource = 'kbm';
    if (!this.isPointerLocked) {
      this.requestPointerLock();
      return;
    }
    if (e.button === 0) {
      this.lmbHeld = true;
      this.fireShot('kbm');
    } else if (e.button === 2) {
      this.adsHeld = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.lmbHeld = false;
    else if (e.button === 2) this.adsHeld = false;
  };

  private onContextMenu = (e: MouseEvent) => e.preventDefault();

  private onKeyDown = (e: KeyboardEvent) => {
    this.lastInputSource = 'kbm';
    const kb = this.config.keybinds;
    this.keys.add(e.code);

    if (kb.reload.includes(e.code)) this.triggerReload('kbm');
    else if (kb.interact.includes(e.code)) this.triggerInteract('kbm');
    else if (kb.flashlight.includes(e.code)) this.toggleFlashlight('kbm');
    else if (kb.quickMelee.includes(e.code)) this.triggerQuickMelee('kbm');
    else if (kb.adsToggle.includes(e.code)) this.adsToggled = !this.adsToggled;
    else if (kb.switchWeapon.includes(e.code)) {
      e.preventDefault();
      this.switchWeapon(undefined, 'kbm');
    } else if (e.code === kb.slots.pistol9mm) this.switchWeapon('pistol9mm', 'kbm');
    else if (e.code === kb.slots.futuristic) this.switchWeapon('futuristic', 'kbm');
    else if (e.code === kb.slots.rustSmg) this.switchWeapon('rustSmg', 'kbm');
    else if (e.code === kb.slots.retroSmg) this.switchWeapon('retroSmg', 'kbm');
    else if (e.code === kb.slots.rustShotgun) this.switchWeapon('rustShotgun', 'kbm');
    else if (e.code === kb.slots.sword) this.switchWeapon('sword', 'kbm');
    else if (e.code === kb.slots.flashlight) this.switchWeapon('flashlight', 'kbm');
    else if (e.code === kb.slots.unarmed) this.switchWeapon('unarmed', 'kbm');
    else if (e.code === 'KeyG') this.respawnAtCheckpoint();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
    this.adsHeld = false;
    this.lmbHeld = false;
  };

  private bindEvents() {
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  private unbindEvents() {
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  private pollGamepad(dt: number) {
    const pads = navigator.getGamepads?.();
    if (!pads) {
      this.gpConnected = false;
      this.gpAdsHeld = false;
      this.rtHeld = false;
      return;
    }
    let pad: Gamepad | null = null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]?.connected) {
        pad = pads[i];
        break;
      }
    }
    if (!pad) {
      this.gpConnected = false;
      this.gpAdsHeld = false;
      this.rtHeld = false;
      return;
    }
    this.gpConnected = true;

    const gp = this.config.gamepad;
    const rawRx = pad.axes[gp.lookXAxis] ?? 0;
    const rawRy = pad.axes[gp.lookYAxis] ?? 0;
    const rDz = gp.rightDeadzone;
    const rx =
      Math.abs(rawRx) > rDz
        ? Math.sign(rawRx) * ((Math.abs(rawRx) - rDz) / (1 - rDz))
        : 0;
    const ry =
      Math.abs(rawRy) > rDz
        ? Math.sign(rawRy) * ((Math.abs(rawRy) - rDz) / (1 - rDz))
        : 0;

    if (rx !== 0 || ry !== 0) {
      this.lastInputSource = 'gamepad';
      const lookSpeed = THREE.MathUtils.lerp(
        this.config.camera.gamepadLookSpeedHip,
        this.config.camera.gamepadLookSpeedAds,
        this.adsBlend,
      );
      this.yaw -= rx * lookSpeed * dt;
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - ry * lookSpeed * dt,
        this.config.camera.pitchMin,
        this.config.camera.pitchMax,
      );
      this.mouseDeltaX += rx * 20;
      this.mouseDeltaY += ry * 20;
    }

    const rawLx = pad.axes[gp.moveXAxis] ?? 0;
    const rawLy = pad.axes[gp.moveYAxis] ?? 0;
    const lDz = gp.leftDeadzone;
    this.gpMoveRight =
      Math.abs(rawLx) > lDz
        ? Math.sign(rawLx) * ((Math.abs(rawLx) - lDz) / (1 - lDz))
        : 0;
    this.gpMoveFwd =
      Math.abs(rawLy) > lDz
        ? -Math.sign(rawLy) * ((Math.abs(rawLy) - lDz) / (1 - lDz))
        : 0;

    // Controller Sprint Latch: pressing LS down while pushing LS latches sprint ON;
    // stays latched as long as you hold any forward/angled direction with LS
    // (no need to keep holding LS down) or carry a sprint jump into a wall-run.
    const lsPressed = Boolean(pad.buttons[gp.sprintButton]?.pressed);
    const stickMag = Math.hypot(this.gpMoveFwd, this.gpMoveRight);
    const stickForwardOrDiag = stickMag > 0.15 && this.gpMoveFwd > -0.32;
    if (lsPressed && !this.prevLsPressed && stickForwardOrDiag) {
      this.gpSprintLatched = true;
    }
    if (this.gpAdsHeld) {
      this.gpSprintLatched = false;
    } else if (this.isGrounded && this.wallMode === 'none') {
      if (!stickForwardOrDiag && !lsPressed) {
        this.gpSprintLatched = false;
      }
    } else if (stickMag <= 0.10 && !lsPressed) {
      this.gpSprintLatched = false;
    }
    this.prevLsPressed = lsPressed;
    this.gpSprint = lsPressed || this.gpSprintLatched;

    const aPressed = Boolean(pad.buttons[gp.jumpButton]?.pressed);
    const bPressed = Boolean(pad.buttons[gp.crouchSlideButton]?.pressed);
    const xPressed = Boolean(pad.buttons[gp.reloadInteractButton]?.pressed);
    const yPressed = Boolean(pad.buttons[gp.switchWeaponButton]?.pressed);
    const lbPressed = Boolean(pad.buttons[gp.quickMeleeButton]?.pressed);
    const ltVal = pad.buttons[gp.adsTrigger]?.value ?? 0;
    const rtPressed =
      (pad.buttons[gp.fireTrigger]?.value ?? 0) > gp.triggerThreshold;

    let dpadPressed = false;
    for (let i = 0; i < gp.flashlightButtons.length; i++) {
      if (pad.buttons[gp.flashlightButtons[i]]?.pressed) {
        dpadPressed = true;
        break;
      }
    }

    this.gpJump = aPressed;
    this.gpCrouch = bPressed;
    this.gpAdsHeld = ltVal > gp.triggerThreshold;

    this.rtHeld = rtPressed;
    if (rtPressed && !this.prevRtPressed) this.fireShot('gamepad');
    this.prevRtPressed = rtPressed;

    if (dpadPressed && !this.prevDpadPressed) this.toggleFlashlight('gamepad');
    this.prevDpadPressed = dpadPressed;

    if (lbPressed && !this.prevLbPressed) this.triggerQuickMelee('gamepad');
    this.prevLbPressed = lbPressed;

    if (xPressed && !this.prevXPressed) {
      if (this.interactListeners.size > 0 && this.ammo >= this.maxAmmo) {
        this.triggerInteract('gamepad');
      } else {
        this.triggerReload('gamepad');
      }
    }
    this.prevXPressed = xPressed;

    if (yPressed && !this.prevYPressed) this.switchWeapon(undefined, 'gamepad');
    this.prevYPressed = yPressed;
  }

  private checkBladeHit(source: PlayerInputSource) {
    if (this.shootableMeshes.length === 0) return;
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    this.raycaster.far = 2.6;
    const hits = this.raycaster.intersectObjects(this.shootableMeshes, false);
    if (hits.length > 0) {
      const h = hits[0];
      if (h.face) {
        _hitNormal
          .copy(h.face.normal)
          .transformDirection(h.object.matrixWorld)
          .normalize();
      } else {
        _hitNormal.set(0, 1, 0);
      }
      this.onBulletHit?.(h.point, _hitNormal, h.object);
      this.emitSoundEvent('blade_hit', source, 1.0);
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.25);
    }
    this.raycaster.far = Infinity;
  }

  private exitWallMode(reason: 'none' | 'dismount' | 'slideStop' = 'none') {
    const prev = this.wallMode;
    if (prev === 'wallSlide' || reason === 'slideStop') {
      this.emitSoundEvent('wall_slide_stop', this.lastInputSource);
    } else if (prev === 'wallRun' && reason === 'dismount') {
      this.emitSoundEvent('wall_dismount', this.lastInputSource);
    }
    if (this.wallFaceId) {
      this.lastDismountFaceId = this.wallFaceId;
      this.sameWallCooldown = this.config.wallRun.sameWallCooldownSec;
    }
    this.wallMode = 'none';
    this.wallSide = 0;
    this.wallFaceId = '';
    this.wallMaterial = null;
    this.wallRunTimer = 0;
    this.wallSlideTimer = 0;
    this.wallPullAwayTimer = 0;
    this.wallSlideHeldCrouchEntry = false;
  }

  private stowWeaponForLedge() {
    const held = this.pendingWeaponId ?? this.activeWeaponId;
    this.ledgeSavedWeaponId = held;
    this.pendingWeaponId = null;
    this.swapTimer = 0;
    this.isReloading = false;
    this.reloadTime = 0;
    this.shotgunPumpTimer = -1;
    this.swordSwingActive = false;
    this.swordComboQueued = false;
    this.quickMeleeActive = false;
    this.adsToggled = false;
    this.lmbHeld = false;
    this.rtHeld = false;
    if (this.activeWeaponId !== 'unarmed') {
      this.activeWeaponId = 'unarmed';
      this.applyVisibleWeaponRig('unarmed');
      this.emitSoundEvent('weapon_lower', this.lastInputSource);
    }
  }

  private restoreWeaponAfterLedge(instant = false) {
    const target = this.ledgeSavedWeaponId;
    if (!target || target === 'unarmed') return;
    this.activeWeaponId = target;
    this.applyVisibleWeaponRig(target);
    this.slidePos = target === 'pistol9mm' && this.ammo === 0 ? 0.068 : 0;
    if (!instant) {
      const toBig = getWeaponHolsterZone(target) === 'back';
      this.swapDuration = toBig ? 0.56 : 0.42;
      this.swapTimer = this.swapDuration * 0.49;
      this.emitSoundEvent('weapon_raise', this.lastInputSource);
    }
  }

  public update(rawDt: number) {
    if (this.disposed) return;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    this.elapsed += dt;

    const mv = this.config.movement;
    const sl = this.config.slide;
    const wr = this.config.wallRun;
    const kb = this.config.keybinds;

    this.gpMoveFwd = 0;
    this.gpMoveRight = 0;
    this.gpSprint = false;
    this.gpCrouch = false;
    this.gpJump = false;
    this.pollGamepad(dt);

    let moveFwd = this.gpMoveFwd;
    let moveRight = this.gpMoveRight;
    if (this.hasBoundKey(kb.forward)) moveFwd += 1;
    if (this.hasBoundKey(kb.backward)) moveFwd -= 1;
    if (this.hasBoundKey(kb.right)) moveRight += 1;
    if (this.hasBoundKey(kb.left)) moveRight -= 1;
    moveFwd = THREE.MathUtils.clamp(moveFwd, -1, 1);
    moveRight = THREE.MathUtils.clamp(moveRight, -1, 1);

    const crouchHeld = this.hasBoundKey(kb.crouch) || this.gpCrouch;
    const crouchJustPressed = crouchHeld && !this.prevCrouchHeld;
    this.prevCrouchHeld = crouchHeld;

    const jumpHeld = this.hasBoundKey(kb.jump) || this.gpJump;
    const jumpJustPressed = jumpHeld && !this.prevJumpHeld;
    this.prevJumpHeld = jumpHeld;

    const moveSource: PlayerInputSource =
      this.gpCrouch ||
      this.gpJump ||
      this.gpSprint ||
      Math.abs(this.gpMoveFwd) > 0.01 ||
      Math.abs(this.gpMoveRight) > 0.01
        ? 'gamepad'
        : 'kbm';

    if (this.slideCooldown > 0) this.slideCooldown = Math.max(0, this.slideCooldown - dt);
    if (this.sameWallCooldown > 0) {
      this.sameWallCooldown = Math.max(0, this.sameWallCooldown - dt);
    }
    if (this.ledgeCooldown > 0) {
      this.ledgeCooldown = Math.max(0, this.ledgeCooldown - dt);
    }
    if (this.armClimbCooldown > 0) {
      this.armClimbCooldown = Math.max(0, this.armClimbCooldown - dt);
    }
    if (this.armClimbSameFaceCooldown > 0) {
      this.armClimbSameFaceCooldown = Math.max(0, this.armClimbSameFaceCooldown - dt);
    }
    if (this.wallContactPulse > 0) {
      this.wallContactPulse = Math.max(0, this.wallContactPulse - dt * 3.5);
    }

    // Forward (_vecA) and Right (_vecB) basis vectors in horizontal plane
    _vecA.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _vecB.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const horizSpeed = Math.hypot(this.moveVel.x, this.moveVel.z);
    const shiftHeld = this.hasBoundKey(kb.sprint) || this.gpSprint;
    const hasSprintDir =
      moveFwd > 0.1 ||
      (this.gpSprint && Math.hypot(moveFwd, moveRight) > 0.16 && moveFwd > -0.32);
    const isSprinting =
      shiftHeld &&
      this.adsBlend < 0.25 &&
      hasSprintDir &&
      !this.isCrouching &&
      !this.isSliding;

    if (this.isGrounded) {
      this.airSprintActive = isSprinting || (this.gpSprintLatched && hasSprintDir);
    } else if (!hasSprintDir && !shiftHeld) {
      this.airSprintActive = false;
    }

    const startGroundSlide = (entrySpeed: number, src: PlayerInputSource) => {
      this.isSliding = true;
      this.isCrouching = true;
      this.slideTimer = 0;
      if (entrySpeed > 0.4) {
        this.slideDir.set(this.moveVel.x / entrySpeed, 0, this.moveVel.z / entrySpeed);
        this.slideDir.addScaledVector(_vecA, 0.26).normalize();
      } else {
        this.slideDir.copy(_vecA);
      }
      this.slideSpeed = THREE.MathUtils.clamp(
        Math.max(entrySpeed * sl.boostMultiplier, sl.minBoostSpeed),
        sl.minBoostSpeed * 0.88,
        sl.maxSpeed,
      );
      this.slideLeanSign = moveRight > 0.15 ? 1 : moveRight < -0.15 ? -1 : -1;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.24);
      this.recoilRollVel += this.slideLeanSign * 1.4;
      this.emitSoundEvent('slide', src, 1.0);
    };

    // -----------------------------------------------------------------------
    // 1. STATE TRANSITIONS FOR GROUND SLIDE / NORMAL JUMP / WALL LEAP / BOUNCE
    // -----------------------------------------------------------------------
    if (
      this.wallMode === 'none' &&
      crouchJustPressed &&
      this.isGrounded &&
      !this.isSliding &&
      this.slideCooldown <= 0 &&
      (shiftHeld || horizSpeed >= mv.walkSpeed * 1.06) &&
      horizSpeed >= sl.minEntrySpeed
    ) {
      startGroundSlide(horizSpeed, this.gpCrouch ? 'gamepad' : 'kbm');
    }

    const executeGroundJumpLaunch = (fromSlide: boolean, src: PlayerInputSource) => {
      const lateralSign = Math.abs(moveRight) > 0.35 && !fromSlide ? Math.sign(moveRight) : 0;
      const springSprint = isSprinting || this.sprintBlend > 0.3 || this.gpSprintLatched;
      if (fromSlide) {
        this.isSliding = false;
        this.isCrouching = false;
        this.slideCooldown = sl.cooldown;
        const hopSpeed = THREE.MathUtils.clamp(
          this.slideSpeed * sl.hopSpeedRetention + 1.0,
          mv.sprintSpeed * 1.18,
          sl.maxSpeed * 1.04,
        );
        this.moveVel.x = this.slideDir.x * hopSpeed;
        this.moveVel.z = this.slideDir.z * hopSpeed;
      } else {
        if (springSprint && Math.abs(moveFwd) + Math.abs(moveRight) > 0.1) {
          // Superhero forward/directional velocity surge off ground spring
          _vecC.set(0, 0, 0).addScaledVector(_vecA, moveFwd).addScaledVector(_vecB, moveRight);
          if (_vecC.lengthSq() > 0.001) {
            _vecC.normalize();
            this.moveVel.x += _vecC.x * 2.4;
            this.moveVel.z += _vecC.z * 2.4;
          }
        }
        if (lateralSign !== 0) {
          // Extra sideways lateral burst across wide gaps
          this.moveVel.x += _vecB.x * lateralSign * 3.1;
          this.moveVel.z += _vecB.z * lateralSign * 3.1;
        }
      }
      if (fromSlide || springSprint || lateralSign !== 0) {
        this.airSprintActive = true;
      }
      this.isGrounded = false;
      this.airFallTimer = 0;
      this.jumpLoadTimer = -1;
      this.verticalVel = fromSlide
        ? sl.hopJumpVelocity
        : lateralSign !== 0
          ? mv.jumpVelocity * 1.07
          : mv.jumpVelocity;
      this.cameraPitchKick += fromSlide ? 0.022 : 0.026;
      if (lateralSign !== 0) {
        this.cameraRollKickVel -= lateralSign * 1.25;
      }
      this.shotFovKick = Math.min(4.8, this.shotFovKick + (lateralSign !== 0 ? 2.4 : 2.1));
      this.emitSoundEvent('jump', src, fromSlide ? 1.0 : 0.9);
    };

    const executeWallJumpLaunch = (
      mode: 'wallRun' | 'armClimb',
      src: PlayerInputSource,
    ) => {
      this.wallJumpLoadTimer = -1;
      this.wallJumpLoadMode = 'none';
      if (mode === 'wallRun' && this.wallMode === 'wallRun') {
        // WALL-RUN LATERAL SPRING LEAP -> momentary coil fires powerful outward + upward cross-gap surge!
        const boostSpeed = Math.max(this.wallRunSpeed, mv.sprintSpeed) + wr.leapForwardBoost;
        this.moveVel.x =
          this.wallTangentX * boostSpeed + this.wallNormalX * wr.leapOutwardSpeed;
        this.moveVel.z =
          this.wallTangentZ * boostSpeed + this.wallNormalZ * wr.leapOutwardSpeed;
        this.verticalVel = wr.leapUpVelocity;
        this.airFallTimer = 0;
        this.airSprintActive = true;
        this.isGrounded = false;
        this.cameraPitchKick += 0.024;
        this.cameraRollKickVel -= this.wallSide * 2.1;
        this.shotFovKick = Math.min(4.6, this.shotFovKick + 2.4);
        this.wallContactPulse = 1.0;
        this.exitWallMode('dismount');
        this.emitSoundEvent('wall_leap', src, 1.0);
      } else if (mode === 'armClimb' && this.ledgeState === 'armClimb') {
        // Powered spring jump off arm-climb wall (twin-wall lateral/back across gap)
        const awayLook = _vecA.x * this.ledgeNormalX + _vecA.z * this.ledgeNormalZ;
        const kickSpeed = wr.runUpKickBackSpeed + 2.8;
        const kickX =
          awayLook > 0.15
            ? _vecA.x * kickSpeed + this.ledgeNormalX * 3.1
            : this.ledgeNormalX * (wr.leapOutwardSpeed * 0.88) + _vecA.x * 1.5;
        const kickZ =
          awayLook > 0.15
            ? _vecA.z * kickSpeed + this.ledgeNormalZ * 3.1
            : this.ledgeNormalZ * (wr.leapOutwardSpeed * 0.88) + _vecA.z * 1.5;
        this.moveVel.set(kickX, 0, kickZ);
        this.verticalVel = wr.leapUpVelocity * 1.08;
        this.airFallTimer = 0;
        this.airSprintActive = true;
        this.isGrounded = false;
        this.ledgeState = 'none';
        this.armClimbLastFaceId = this.armClimbFaceId;
        this.armClimbSameFaceCooldown = 0.34;
        this.armClimbCooldown = 0.16;
        this.ledgeCooldown = 0.18;
        this.cameraPitchKick += 0.024;
        this.shotFovKick = Math.min(4.6, this.shotFovKick + 2.2);
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.18);
        this.restoreWeaponAfterLedge(false);
        this.emitSoundEvent('wall_leap', src, 1.0);
      }
    };

    if (jumpJustPressed) {
      const jumpSrc: PlayerInputSource = this.gpJump ? 'gamepad' : 'kbm';

      if (this.wallMode === 'wallRun') {
        if (this.wallJumpLoadTimer < 0 && wr.leapLoadDuration > 0.01) {
          this.wallJumpLoadTimer = 0;
          this.wallJumpLoadMode = 'wallRun';
          this.wallJumpLoadSrc = jumpSrc;
        } else {
          executeWallJumpLaunch('wallRun', jumpSrc);
        }
      } else if (this.wallMode === 'wallSlide') {
        // WALL SLIDE -> POWER BOUNCE! Converts downward slide momentum into EVEN HIGHER leap!
        const downSpeed = Math.max(0, -this.verticalVel);
        const bounceUp =
          wr.slideBounceUpBase + downSpeed * wr.slideBounceDownConversion;
        this.lastBounceUpVel = bounceUp;
        const launchFwd = Math.max(this.wallRunSpeed, wr.slideBounceForwardSpeed);
        this.moveVel.x =
          this.wallTangentX * launchFwd +
          this.wallNormalX * wr.slideBounceOutwardSpeed;
        this.moveVel.z =
          this.wallTangentZ * launchFwd +
          this.wallNormalZ * wr.slideBounceOutwardSpeed;
        this.verticalVel = bounceUp;
        this.airFallTimer = 0;
        this.airSprintActive = true;
        this.isGrounded = false;
        this.cameraPitchKick += 0.02;
        this.cameraRollKickVel -= this.wallSide * 2.4;
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.3);
        this.wallContactPulse = 1.0;
        this.exitWallMode('slideStop');
        this.emitSoundEvent('slide_bounce_jump', jumpSrc, 1.0);
      } else if (this.wallMode === 'wallRunUp') {
        // Kick back & up off vertical wall run-up
        this.moveVel.x = this.wallNormalX * wr.runUpKickBackSpeed + _vecA.x * 1.4;
        this.moveVel.z = this.wallNormalZ * wr.runUpKickBackSpeed + _vecA.z * 1.4;
        this.verticalVel = wr.leapUpVelocity * 0.94;
        this.airFallTimer = 0;
        this.isGrounded = false;
        this.cameraPitchKick -= 0.018;
        this.wallContactPulse = 1.0;
        this.exitWallMode('dismount');
        this.emitSoundEvent('wall_leap', jumpSrc, 0.95);
      } else if (this.ledgeState === 'armClimb') {
        if (this.wallJumpLoadTimer < 0 && wr.leapLoadDuration > 0.01) {
          this.wallJumpLoadTimer = 0;
          this.wallJumpLoadMode = 'armClimb';
          this.wallJumpLoadSrc = jumpSrc;
        } else {
          executeWallJumpLaunch('armClimb', jumpSrc);
        }
      } else if (this.ledgeState !== 'none') {
        // Jump button handled inside ledge hang/climb block below
      } else if (this.isGrounded) {
        if (this.jumpLoadTimer < 0 && mv.jumpLoadDuration > 0.01) {
          // Begin quick bend-down anticipation load before superhuman jump launch
          this.jumpLoadTimer = 0;
          this.jumpLoadFromSlide = this.isSliding;
          this.jumpLoadSrc = jumpSrc;
        } else {
          executeGroundJumpLaunch(this.isSliding, jumpSrc);
        }
      }
    }

    if (this.wallJumpLoadTimer >= 0) {
      if (
        (this.wallJumpLoadMode === 'wallRun' && this.wallMode !== 'wallRun') ||
        (this.wallJumpLoadMode === 'armClimb' && this.ledgeState !== 'armClimb') ||
        this.wallJumpLoadMode === 'none'
      ) {
        this.wallJumpLoadTimer = -1;
        this.wallJumpLoadMode = 'none';
      } else {
        this.wallJumpLoadTimer += dt;
        if (this.wallJumpLoadTimer >= wr.leapLoadDuration) {
          executeWallJumpLaunch(this.wallJumpLoadMode, this.wallJumpLoadSrc);
        }
      }
    }

    if (this.jumpLoadTimer >= 0) {
      if (this.wallMode !== 'none' || this.ledgeState !== 'none') {
        this.jumpLoadTimer = -1;
      } else if (!this.isGrounded) {
        // Player stepped off a ledge while loading jump -> launch cleanly instead of cancelling
        executeGroundJumpLaunch(this.jumpLoadFromSlide, this.jumpLoadSrc);
      } else {
        this.jumpLoadTimer += dt;
        if (this.jumpLoadTimer >= mv.jumpLoadDuration) {
          executeGroundJumpLaunch(this.jumpLoadFromSlide, this.jumpLoadSrc);
        }
      }
    }

    // -----------------------------------------------------------------------
    // 2. MOVEMENT VELOCITY INTEGRATION (GROUND / AIR / WALL-RUN / WALL-SLIDE)
    // -----------------------------------------------------------------------
    // -----------------------------------------------------------------------
    // 2B. LEDGE HANG & AUTOMATIC TOP-GRIP -> ELBOW-HOIST -> FLAT PALM MANTLE
    // -----------------------------------------------------------------------
    if (this.ledgeState === 'hang') {
      this.ledgeHangTimer += dt;
      this.isGrounded = false;
      this.isCrouching = false;
      this.isSliding = false;
      this.verticalVel = 0;
      this.moveVel.set(0, 0, 0);

      // Keep feet locked cleanly to hang anchor beneath edge lip
      this.feetPos.lerp(this.ledgeHangPos, 1 - Math.exp(-20 * dt));

      // Constrain head yaw gently within ±65 deg of facing into the ledge
      const inwardYaw = Math.atan2(this.ledgeNormalX, this.ledgeNormalZ);
      let relYaw = this.yaw - inwardYaw;
      while (relYaw > Math.PI) relYaw -= Math.PI * 2;
      while (relYaw < -Math.PI) relYaw += Math.PI * 2;
      if (Math.abs(relYaw) > 1.15) {
        this.yaw = inwardYaw + Math.sign(relYaw) * 1.15;
      }

      if (crouchJustPressed || moveFwd < -0.55) {
        // Explicit drop off ledge before automatic climb-up begins
        this.ledgeState = 'none';
        this.ledgeCooldown = 0.42;
        this.verticalVel = -1.8;
        this.airFallTimer = 0;
        this.feetPos.x += this.ledgeNormalX * 0.24;
        this.feetPos.z += this.ledgeNormalZ * 0.24;
        this.moveVel.set(this.ledgeNormalX * 1.6, 0, this.ledgeNormalZ * 1.6);
        this.emitSoundEvent('ledge_drop', moveSource, 0.8);
        this.restoreWeaponAfterLedge(false);
      } else if (
        this.ledgeHangTimer >= 0.14 ||
        jumpJustPressed ||
        moveFwd > 0.25
      ) {
        // Automatically transition from top-surface grip into 4-beat pull + flat palm mantle
        this.ledgeState = 'climb';
        this.ledgeClimbTimer = 0;
        this.ledgeStartPos.copy(this.feetPos);
        this.cameraPitchKick += 0.018;
        this.cameraRollKickVel += 0.55;
        this.emitSoundEvent('ledge_climb', moveSource, 1.0);
      }
    } else if (this.ledgeState === 'climb') {
      this.ledgeClimbTimer += dt;
      this.isGrounded = false;
      this.verticalVel = 0;
      this.moveVel.set(0, 0, 0);

      // Gently guide pitch down slightly if player was staring upward so flat-planted palms stay in view
      if (this.pitch > 0.02) {
        this.pitch = THREE.MathUtils.damp(this.pitch, 0.02, 7.5, dt);
      }

      const u = THREE.MathUtils.clamp(
        this.ledgeClimbTimer / this.ledgeClimbDuration,
        0,
        1,
      );
      // 4-Beat Ledge Climb & Mantle:
      // 0.00..0.24: REACH & WRAP edge lip (zero phantom upward drift; tiny weight dip as arms load)
      // 0.24..0.52: PULL torso upward strictly as elbows drive down & back
      // 0.52..0.82: MANTLE — palms plant FLAT on top of ledge, elbows press down & lock out, chest & knee come over
      // 0.82..1.00: STAND UP cleanly onto platform
      const fullClimbScale = THREE.MathUtils.clamp(
        (this.ledgeStandPos.y - this.ledgeStartPos.y - 0.55) / 0.95,
        0,
        1,
      );
      const loadDip =
        Math.sin(THREE.MathUtils.clamp(u / 0.24, 0, 1) * Math.PI) *
        -0.026 *
        fullClimbScale;
      const pullRise = THREE.MathUtils.smoothstep(u, 0.22, 0.54) * 0.54;
      const mantlePressRise = THREE.MathUtils.smoothstep(u, 0.54, 0.84) * 0.46;
      const riseU = pullRise + mantlePressRise;
      // Delay inward step slightly until chest clears and palms press flat on top
      const stepU = THREE.MathUtils.smoothstep(u, 0.62, 0.96);

      this.feetPos.x = THREE.MathUtils.lerp(
        this.ledgeStartPos.x,
        this.ledgeStandPos.x,
        stepU,
      );
      this.feetPos.z = THREE.MathUtils.lerp(
        this.ledgeStartPos.z,
        this.ledgeStandPos.z,
        stepU,
      );
      this.feetPos.y =
        THREE.MathUtils.lerp(
          this.ledgeStartPos.y,
          this.ledgeStandPos.y,
          riseU,
        ) + loadDip;

      if (u >= 1) {
        this.feetPos.copy(this.ledgeStandPos);
        this.isGrounded = true;
        this.verticalVel = 0;
        this.airFallTimer = 0;
        this.moveVel.set(0, 0, 0);
        this.landDipY = -0.05;
        this.ledgeState = 'none';
        this.ledgeCooldown = 0.28;
        this.emitSoundEvent('land', moveSource, 0.45);
        this.restoreWeaponAfterLedge(false);
      }
    } else if (this.ledgeState === 'armClimb') {
      // ---------------------------------------------------------------------
      // 2C. 4-BEAT HAND-OVER-HAND ARM CLIMB STATE MACHINE (REACH -> LOAD -> PULL -> PLANT)
      // Strict Law: ZERO vertical movement without a pulling arm driving it!
      // ---------------------------------------------------------------------
      this.isGrounded = false;
      this.isCrouching = false;
      this.isSliding = false;
      this.verticalVel = 0;
      this.moveVel.set(0, 0, 0);
      this.armClimbTime += dt;
      this.armClimbEntryErrY = THREE.MathUtils.damp(this.armClimbEntryErrY, 0, 14, dt);

      const RUNG_STEP = 0.62;
      const EYE_TO_HOLD = 1.52;
      const rungYAt = (k: number) =>
        Math.min(
          this.ledgeBoxTop - 0.015,
          this.armClimbBoxBot + 0.75 + Math.max(0, k) * RUNG_STEP,
        );

      // Compute camera-relative tangent sign so D always traverses right on screen
      const tanAlign =
        this.armClimbTangentX * _vecB.x + this.armClimbTangentZ * _vecB.z;
      const tanSign = tanAlign >= 0 ? 1 : -1;
      const latDelta = moveRight * tanSign * 2.55 * dt;
      this.feetPos.x += this.armClimbTangentX * latDelta;
      this.feetPos.z += this.armClimbTangentZ * latDelta;

      // Advance step strictly by player climbing input — idle = zero vertical motion
      if (Math.abs(moveFwd) > 0.04) {
        const prevFloor = Math.floor(this.armClimbStep);
        this.armClimbStep += moveFwd * 2.05 * dt;
        const minStep = -this.armClimbBaseStep - 0.18;
        if (this.armClimbStep < minStep) this.armClimbStep = minStep;
        const newFloor = Math.floor(this.armClimbStep);
        if (newFloor !== prevFloor) {
          this.cameraPitchKick += (moveFwd > 0 ? -1 : 1) * 0.008;
          this.emitSoundEvent('arm_climb_rung', moveSource, 0.85);
        }
      }
      this.armClimbDir = Math.abs(moveFwd) > 0.04 ? Math.sign(moveFwd) : 0;

      // 4-Beat Cycle inside each step [i, i + 1]:
      // f = 0.00..0.18 (LOAD): planted arm bends & takes weight -> camera dips & rolls toward loaded side, ZERO rise!
      // f = 0.18..0.86 (PULL): pulling elbow rows down & back -> body rises ONLY as fast as arm pulls; other hand reaches!
      // f = 0.86..1.00 (PLANT/SETTLE): reaching hand has planted & wraps next rung -> ZERO vertical drift!
      const stepAbs = this.armClimbBaseStep + this.armClimbStep;
      const stepIdx = Math.floor(stepAbs);
      const frac = stepAbs - stepIdx;
      const pullSide: -1 | 1 = ((stepIdx % 2) + 2) % 2 === 0 ? 1 : -1;

      const loadBell =
        frac < 0.18
          ? Math.sin((frac / 0.18) * Math.PI)
          : frac > 0.84
            ? Math.sin(((1 - frac) / 0.16) * Math.PI) * 0.25
            : 0;
      const pullFrac =
        frac <= 0.18
          ? 0
          : frac >= 0.86
            ? 1
            : THREE.MathUtils.smoothstep(frac, 0.18, 0.86);

      const startFeetY = rungYAt(stepIdx + 1) - EYE_TO_HOLD;
      const endFeetY = rungYAt(stepIdx + 2) - EYE_TO_HOLD;
      const maxClimbFeetY = this.ledgeBoxTop - 1.62;
      this.feetPos.y = Math.min(
        maxClimbFeetY,
        THREE.MathUtils.lerp(startFeetY, endFeetY, pullFrac) + this.armClimbEntryErrY,
      );

      // Sync continuous phase for legs.ts alternating climb stride
      this.armClimbPhase = (this.armClimbStep + pullFrac * 0.05) * Math.PI;
      const loadMotionScale = Math.min(1, this.armClimbTime * 5);
      this.armClimbCamDip = THREE.MathUtils.damp(
        this.armClimbCamDip,
        -0.028 * loadBell * loadMotionScale,
        18,
        dt,
      );
      this.armClimbCamRoll = THREE.MathUtils.damp(
        this.armClimbCamRoll,
        -pullSide * (0.034 * loadBell + 0.012 * Math.sin(pullFrac * Math.PI)) * loadMotionScale,
        16,
        dt,
      );
      this.armClimbCamPitch = THREE.MathUtils.damp(
        this.armClimbCamPitch,
        0.095 - 0.032 * loadBell,
        12,
        dt,
      );

      // Keep feet & capsule locked flush against exact oriented climbable box face bounds
      let matchedBox: CourseBox | null = null;
      for (let i = 0; i < this.boxes.length; i++) {
        if (this.boxes[i].id === this.armClimbBoxId) {
          matchedBox = this.boxes[i];
          break;
        }
      }
      if (matchedBox) {
        const dx = this.feetPos.x - matchedBox.center.x;
        const dz = this.feetPos.z - matchedBox.center.z;
        let lx = dx * matchedBox.cosYaw - dz * matchedBox.sinYaw;
        let lz = dx * matchedBox.sinYaw + dz * matchedBox.cosYaw;
        const hx = matchedBox.halfExtents.x;
        const hz = matchedBox.halfExtents.z;

        const lnX =
          this.ledgeNormalX * matchedBox.cosYaw -
          this.ledgeNormalZ * matchedBox.sinYaw;
        const lnZ =
          this.ledgeNormalX * matchedBox.sinYaw +
          this.ledgeNormalZ * matchedBox.cosYaw;
        const isXFace = Math.abs(lnX) >= Math.abs(lnZ);
        if (isXFace) {
          const s = lnX >= 0 ? 1 : -1;
          lx = s * hx;
          lz = THREE.MathUtils.clamp(lz, -hz + 0.34, hz - 0.34);
        } else {
          const s = lnZ >= 0 ? 1 : -1;
          lz = s * hz;
          lx = THREE.MathUtils.clamp(lx, -hx + 0.34, hx - 0.34);
        }
        const cx = matchedBox.center.x + lx * matchedBox.cosYaw + lz * matchedBox.sinYaw;
        const cz = matchedBox.center.z - lx * matchedBox.sinYaw + lz * matchedBox.cosYaw;
        this.armClimbContactX = cx;
        this.armClimbContactZ = cz;
        this.ledgeContactX = cx;
        this.ledgeContactZ = cz;
        this.feetPos.x = cx + this.ledgeNormalX * (wr.playerRadiusM + 0.05);
        this.feetPos.z = cz + this.ledgeNormalZ * (wr.playerRadiusM + 0.05);
      }

      // Check top lip auto-mantle onto summit platform
      if (this.feetPos.y >= this.ledgeBoxTop - 1.68 && moveFwd > 0.08) {
        const topLedge = detectLedgeGrabCandidate(
          this.feetPos,
          -this.ledgeNormalX,
          -this.ledgeNormalZ,
          wr.playerRadiusM,
          1.78,
          this.boxes,
        );
        if (topLedge) {
          this.ledgeState = 'climb';
          // Start smoothly from lip-grip / pull transition so summit hands plant flat on top without clipping!
          this.ledgeClimbTimer = this.ledgeClimbDuration * 0.22;
          this.ledgeStartPos.copy(this.feetPos);
          this.ledgeStandPos.copy(topLedge.standFeetPos);
          this.ledgeContactX = topLedge.contactX;
          this.ledgeContactZ = topLedge.contactZ;
          this.ledgeBoxTop = topLedge.ledgeY;
          this.armClimbCamRoll = 0;
          this.armClimbCamDip = 0;
          this.armClimbCamPitch = 0;
          this.cameraPitchKick += 0.014;
          this.cameraRollKickVel += 0.55;
          this.emitSoundEvent('ledge_climb', moveSource, 1.0);
        }
      } else if (
        crouchJustPressed ||
        ((this.feetPos.y <= this.armClimbBoxBot + 0.05 || this.armClimbStep < -this.armClimbBaseStep - 0.1) &&
          moveFwd < -0.1)
      ) {
        this.ledgeState = 'none';
        this.armClimbCamRoll = 0;
        this.armClimbCamDip = 0;
        this.armClimbCamPitch = 0;
        this.armClimbCooldown = 0.28;
        this.armClimbLastFaceId = this.armClimbFaceId;
        this.armClimbSameFaceCooldown = 0.28;
        this.feetPos.x += this.ledgeNormalX * 0.22;
        this.feetPos.z += this.ledgeNormalZ * 0.22;
        this.moveVel.set(this.ledgeNormalX * 1.4, 0, this.ledgeNormalZ * 1.4);
        this.verticalVel = -1.2;
        this.emitSoundEvent('ledge_drop', moveSource, 0.75);
        this.restoreWeaponAfterLedge(false);
      }
    } else if (this.wallMode === 'wallRunUp') {
      // Vertical scramble up shorter walls to reach ledges
      this.wallRunTimer += dt;
      const frac = THREE.MathUtils.clamp(
        this.wallRunTimer / wr.runUpDurationSec,
        0,
        1,
      );
      this.verticalVel =
        THREE.MathUtils.lerp(wr.runUpInitVel, 0.85, frac) -
        wr.wallGravity * 1.4 * dt;

      const latStrafe = moveRight * 2.2;
      this.moveVel.x =
        (_vecB.x * latStrafe) - this.wallNormalX * 1.85;
      this.moveVel.z =
        (_vecB.z * latStrafe) - this.wallNormalZ * 1.85;

      this.wallStepAccum += Math.max(2.0, this.verticalVel) * dt;
      if (this.wallStepAccum >= 0.95) {
        this.wallStepAccum -= 0.95;
        this.wallContactPulse = 0.72;
        this.emitSoundEvent('wall_run_up', moveSource, 0.85);
      }

      if (crouchJustPressed || moveFwd < -0.15) {
        this.exitWallMode('dismount');
      } else if (this.wallRunTimer >= wr.runUpDurationSec || this.verticalVel <= 0.35) {
        if (this.wallIsClimbable && this.activeClimbCandidate) {
          const cc = this.activeClimbCandidate;
          const RUNG_STEP = 0.62;
          const EYE_TO_HOLD = 1.52;
          const k0 = Math.max(
            0,
            Math.round((this.feetPos.y + EYE_TO_HOLD - (cc.boxBot + 0.75)) / RUNG_STEP) - 1,
          );
          const initRungY = Math.min(cc.boxTop - 0.015, cc.boxBot + 0.75 + (k0 + 1) * RUNG_STEP);
          this.exitWallMode('slideStop');
          this.stowWeaponForLedge();
          this.ledgeState = 'armClimb';
          this.armClimbBoxId = cc.boxId;
          this.armClimbFaceId = cc.faceId;
          this.ledgeNormalX = cc.normalX;
          this.ledgeNormalZ = cc.normalZ;
          this.armClimbTangentX = cc.tangentX;
          this.armClimbTangentZ = cc.tangentZ;
          this.armClimbContactX = cc.contactX;
          this.armClimbContactZ = cc.contactZ;
          this.ledgeContactX = cc.contactX;
          this.ledgeContactZ = cc.contactZ;
          this.armClimbBoxBot = cc.boxBot;
          this.ledgeBoxTop = cc.boxTop;
          this.armClimbBaseStep = k0;
          this.armClimbStep = 0;
          this.armClimbTime = 0;
          this.armClimbEntryErrY = this.feetPos.y - (initRungY - EYE_TO_HOLD);
          this.armClimbPhase = 0;
          this.moveVel.set(0, 0, 0);
          this.verticalVel = 0;
          this.emitSoundEvent('arm_climb_rung', moveSource, 0.9);
        } else {
          this.exitWallMode('dismount');
        }
      }
    } else if (this.wallMode === 'wallRun') {
      this.wallRunTimer += dt;
      this.wallRunSpeed = Math.max(4.8, this.wallRunSpeed - wr.speedDecayPerSec * dt);

      // Gentle upward/plateau arc early, subtle drop-off as 4.0s expires
      const frac = THREE.MathUtils.clamp(
        this.wallRunTimer / wr.maxDurationSec,
        0,
        1,
      );
      const gravScale = 0.65 + frac * 1.05;
      this.verticalVel -= wr.wallGravity * gravScale * dt;

      // Press gently into wall face so wall curvature stays locked
      this.moveVel.x = this.wallTangentX * this.wallRunSpeed - this.wallNormalX * 1.4;
      this.moveVel.z = this.wallTangentZ * this.wallRunSpeed - this.wallNormalZ * 1.4;

      // Wall-step cadence & sparks
      this.wallStepAccum += this.wallRunSpeed * dt;
      if (this.wallStepAccum >= 1.85) {
        this.wallStepAccum -= 1.85;
        this.wallContactPulse = 0.65;
        this.emitSoundEvent('wall_step', moveSource, 0.9);
      }

      // THE 4-SECOND LAW: At 4.0s, player didn't jump -> falls into WALL SLIDE!
      if (this.wallRunTimer >= wr.maxDurationSec) {
        this.wallMode = 'wallSlide';
        this.wallSlideTimer = 0;
        this.wallContactPulse = 0.95;
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.16);
        this.emitSoundEvent('wall_slide_start', moveSource, 0.45);
      } else if (crouchJustPressed) {
        // Explicit crouch/B lets player intentionally drop into wall slide early
        this.wallMode = 'wallSlide';
        this.wallSlideTimer = 0;
        this.emitSoundEvent('wall_slide_start', moveSource, 0.4);
      }
    } else if (this.wallMode === 'wallSlide') {
      this.wallSlideTimer += dt;
      this.wallRunSpeed = THREE.MathUtils.damp(
        this.wallRunSpeed,
        0.5,
        wr.slideTangentDrag,
        dt,
      );
      this.verticalVel = Math.max(
        -wr.slideTerminalSpeed,
        this.verticalVel - wr.slideGravity * dt,
      );
      this.moveVel.x = this.wallTangentX * this.wallRunSpeed - this.wallNormalX * 1.1;
      this.moveVel.z = this.wallTangentZ * this.wallRunSpeed - this.wallNormalZ * 1.1;

      // Continuous slide friction loop & wall-contact dust particles
      this.wallParticleAccum += dt;
      if (this.wallParticleAccum >= 0.065 && this.wallMaterial) {
        this.wallParticleAccum = 0;
        this.onWallSlideParticle?.(
          this.feetPos.x - this.wallNormalX * (wr.playerRadiusM * 0.85),
          this.feetPos.y + 0.65,
          this.feetPos.z - this.wallNormalZ * (wr.playerRadiusM * 0.85),
          this.wallNormalX,
          this.wallNormalZ,
          this.wallMaterial,
        );
      }

      // Escapable slide: pulling strongly away from wall or pressing Crouch (after entry press) drops cleanly off
      if (!crouchHeld) {
        this.wallSlideHeldCrouchEntry = false;
      }
      const wishAway =
        (moveFwd * _vecA.x + moveRight * _vecB.x) * this.wallNormalX +
        (moveFwd * _vecA.z + moveRight * _vecB.z) * this.wallNormalZ;
      if (wishAway > 0.55) {
        this.wallPullAwayTimer += dt;
      } else {
        this.wallPullAwayTimer = 0;
      }
      if ((crouchJustPressed && !this.wallSlideHeldCrouchEntry) || this.wallPullAwayTimer > 0.14) {
        this.moveVel.x += this.wallNormalX * 3.4;
        this.moveVel.z += this.wallNormalZ * 3.4;
        this.exitWallMode('slideStop');
      }
    } else if (this.isSliding) {
      this.slideTimer += dt;
      _vecC.copy(_vecA).multiplyScalar(0.85).addScaledVector(_vecB, moveRight * 0.55);
      if (_vecC.lengthSq() > 0.001) {
        _vecC.normalize();
        this.slideDir.lerp(_vecC, 1 - Math.exp(-sl.steerRate * dt)).normalize();
      }
      if (this.slideTimer < sl.surgeDuration) {
        this.slideSpeed = THREE.MathUtils.damp(this.slideSpeed, sl.surgeHoldSpeed, 5.5, dt);
      } else {
        this.slideSpeed = THREE.MathUtils.damp(this.slideSpeed, 1.45, sl.drag, dt);
      }
      this.moveVel.x = this.slideDir.x * this.slideSpeed;
      this.moveVel.z = this.slideDir.z * this.slideSpeed;
      const releasedEarly = !crouchHeld && this.slideTimer >= sl.minCommitTime;
      if (
        this.slideTimer >= sl.duration ||
        this.slideSpeed <= sl.minEndSpeed ||
        releasedEarly
      ) {
        this.isSliding = false;
        this.slideCooldown = sl.cooldown;
        this.isCrouching = crouchHeld;
      }
    } else {
      if (this.isGrounded) this.isCrouching = crouchHeld;
      const maxSpeed = this.isCrouching
        ? THREE.MathUtils.lerp(mv.crouchSpeed, mv.crouchAdsSpeed, this.adsBlend)
        : isSprinting
          ? mv.sprintSpeed
          : THREE.MathUtils.lerp(mv.walkSpeed, mv.adsSpeed, this.adsBlend);
      const hasInput = Math.abs(moveFwd) > 0.01 || Math.abs(moveRight) > 0.01;
      if (this.isGrounded) {
        _vecC.set(0, 0, 0);
        if (hasInput) {
          _vecC.addScaledVector(_vecA, moveFwd).addScaledVector(_vecB, moveRight);
          if (_vecC.lengthSq() > 1) _vecC.normalize();
          _vecC.multiplyScalar(maxSpeed);
        }
        const accel = hasInput ? mv.groundAccel : mv.groundDecel;
        this.moveVel.x = THREE.MathUtils.damp(this.moveVel.x, _vecC.x, accel, dt);
        this.moveVel.z = THREE.MathUtils.damp(this.moveVel.z, _vecC.z, accel, dt);
      } else if (hasInput) {
        // Air steering: preserve superhuman wall-leap / sprint-jump momentum across large gaps
        // instead of clamping high launch velocity down to sprintSpeed!
        _vecC.set(0, 0, 0).addScaledVector(_vecA, moveFwd).addScaledVector(_vecB, moveRight);
        if (_vecC.lengthSq() > 1) _vecC.normalize();
        const curSpeed = Math.hypot(this.moveVel.x, this.moveVel.z);
        const alignDot =
          curSpeed > 0.5
            ? (this.moveVel.x * _vecC.x + this.moveVel.z * _vecC.z) / curSpeed
            : 0;
        const targetAirSpeed =
          curSpeed > maxSpeed && alignDot > -0.25
            ? Math.max(maxSpeed, curSpeed * Math.exp(-mv.airDrag * dt))
            : maxSpeed;
        _vecC.multiplyScalar(targetAirSpeed);
        this.moveVel.x = THREE.MathUtils.damp(this.moveVel.x, _vecC.x, mv.airAccel, dt);
        this.moveVel.z = THREE.MathUtils.damp(this.moveVel.z, _vecC.z, mv.airAccel, dt);
      } else {
        this.moveVel.x = THREE.MathUtils.damp(this.moveVel.x, 0, mv.airDrag, dt);
        this.moveVel.z = THREE.MathUtils.damp(this.moveVel.z, 0, mv.airDrag, dt);
      }
    }

    // -----------------------------------------------------------------------
    // 3. INTEGRATE POSITION & RESOLVE 3D COURSE COLLISIONS + WALL / LEDGE
    // -----------------------------------------------------------------------
    const prevX = this.feetPos.x;
    const prevZ = this.feetPos.z;
    const prevGrounded = this.isGrounded;

    if (this.ledgeState === 'none') {
      if (this.wallMode === 'none' && !this.isGrounded) {
        if (this.verticalVel > 0.85) {
          this.airFallTimer = 0;
          this.verticalVel -= mv.gravity * dt;
        } else if (this.verticalVel >= -0.85) {
          // Clear apex peak hang before exponential downward snap
          this.airFallTimer += dt * 0.35;
          this.verticalVel -= mv.gravity * 0.72 * dt;
        } else {
          // Exponential gravity acceleration on descent until landing back at ground height
          this.airFallTimer += dt;
          const expMult = Math.min(
            mv.fallGravityMaxMult,
            Math.exp(mv.fallGravityExpRate * this.airFallTimer),
          );
          this.verticalVel -= mv.gravity * expMult * dt;
        }
      } else {
        this.airFallTimer = 0;
      }

      const prevFallVel = this.verticalVel;
      this.moveVel.y = this.verticalVel;
      const capsuleH = this.isCrouching ? 1.15 : 1.78;
      const col = integrateAndResolveCourseCollision(
        this.feetPos,
        this.moveVel,
        dt,
        wr.playerRadiusM,
        capsuleH,
        wr.mountReachM,
        this.boxes,
      );
      this.verticalVel = this.moveVel.y;
      this.moveVel.y = 0;
      this.activeClimbCandidate = col.climbCandidate;

      if (col.grounded) {
        if (!prevGrounded) {
          const fallSpeed = Math.abs(prevFallVel);
          const impact = Math.min(1, Math.max(0, (fallSpeed - 2.0) / 11.2));
          const heavyImpact = impact * (0.65 + 0.55 * impact);
          this.landDipY = -0.155 * Math.min(1.15, heavyImpact);
          this.cameraTrauma = Math.min(0.68, this.cameraTrauma + 0.44 * heavyImpact);
          this.recoilPitchVel -= 1.65 * heavyImpact;
          this.recoilKickZVel -= 0.16 * heavyImpact;
          this.cameraPitchKick -= 0.026 * heavyImpact;
          this.cameraRollKickVel += (Math.random() < 0.5 ? -1 : 1) * 0.6 * heavyImpact;
          this.emitSoundEvent('land', moveSource, Math.min(1, heavyImpact));
          if (this.wallMode !== 'none') {
            this.exitWallMode('slideStop');
          }
          const landSpeed = Math.hypot(this.moveVel.x, this.moveVel.z);
          if (crouchHeld && landSpeed >= mv.walkSpeed * 1.06 && this.slideCooldown <= 0) {
            startGroundSlide(landSpeed, this.gpCrouch ? 'gamepad' : 'kbm');
          }
        }
        this.isGrounded = true;
        this.verticalVel = 0;
        this.airFallTimer = 0;
      } else {
        this.isGrounded = false;
      }

      // Safety respawn if player falls below the Kaluga sky deck
      if (this.feetPos.y < this.courseSpec.fallRespawnY) {
        this.respawnAtCheckpoint();
      }

      // Auto-advance checkpoint based on nearest visited checkpoint
      for (let i = 0; i < this.courseSpec.checkpoints.length; i++) {
        const cp = this.courseSpec.checkpoints[i];
        if (this.feetPos.distanceToSquared(cp.position) < 42 && this.isGrounded) {
          this.activeCheckpointIndex = i;
        }
      }

      // ---------------------------------------------------------------------
      // 3B. LEDGE GRAB DETECTION (Disabled while wall-sliding or actively aiming/firing)
      // ---------------------------------------------------------------------
      const weaponCombatBusy =
        this.lmbHeld ||
        this.rtHeld ||
        this.adsHeld ||
        this.gpAdsHeld ||
        this.adsToggled;
      if (
        !this.isGrounded &&
        !this.isSliding &&
        this.wallMode !== 'wallSlide' &&
        !weaponCombatBusy &&
        this.ledgeCooldown <= 0 &&
        this.verticalVel <= (this.wallMode === 'wallRunUp' ? 8.8 : 5.8)
      ) {
        const wantsGrab =
          moveFwd > 0.08 ||
          jumpHeld ||
          jumpJustPressed ||
          this.wallMode === 'wallRun' ||
          this.wallMode === 'wallRunUp' ||
          this.verticalVel < 1.2;
        if (wantsGrab) {
          const ledge = detectLedgeGrabCandidate(
            this.feetPos,
            _vecA.x,
            _vecA.z,
            wr.playerRadiusM,
            1.78,
            this.boxes,
          );
          if (ledge) {
            if (this.wallMode !== 'none') {
              this.exitWallMode('slideStop');
            }
            this.stowWeaponForLedge();
            this.ledgeState = 'hang';
            this.ledgeHangTimer = 0;
            this.ledgeClimbTimer = 0;
            this.ledgeHangPos.copy(ledge.hangFeetPos);
            this.ledgeStandPos.copy(ledge.standFeetPos);
            this.ledgeNormalX = ledge.normalX;
            this.ledgeNormalZ = ledge.normalZ;
            this.ledgeContactX = ledge.contactX;
            this.ledgeContactZ = ledge.contactZ;
            this.ledgeBoxTop = ledge.ledgeY;
            this.moveVel.set(0, 0, 0);
            this.verticalVel = 0;
            this.airFallTimer = 0;
            this.cameraPitchKick += 0.032;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.16);
            this.emitSoundEvent('ledge_grab', moveSource, 1.0);

            // Softly turn player toward ledge if glancing sharply away
            const inwardYaw = Math.atan2(ledge.normalX, ledge.normalZ);
            let yDiff = inwardYaw - this.yaw;
            while (yDiff > Math.PI) yDiff -= Math.PI * 2;
            while (yDiff < -Math.PI) yDiff += Math.PI * 2;
            if (Math.abs(yDiff) > 0.45) {
              this.yaw += yDiff * 0.55;
            }
          }
        }
      }

      // ---------------------------------------------------------------------
      // 3C. ARM-CLIMB ENGAGEMENT (Walk straight into climb wall OR grab airborne)
      // ---------------------------------------------------------------------
      if (
        this.ledgeState === 'none' &&
        !this.isSliding &&
        this.wallMode !== 'wallSlide' &&
        !weaponCombatBusy &&
        this.armClimbCooldown <= 0 &&
        col.climbCandidate &&
        (this.wallMode !== 'wallRunUp' || this.verticalVel < 1.8)
      ) {
        const cc = col.climbCandidate;
        const sameClimbBlocked =
          cc.faceId === this.armClimbLastFaceId && this.armClimbSameFaceCooldown > 0;
        const facingClimbDot = -(_vecA.x * cc.normalX + _vecA.z * cc.normalZ);
        const wantsAirGrab =
          !this.isGrounded &&
          facingClimbDot > 0.48 &&
          (moveFwd > 0.1 || jumpHeld || this.wallMode === 'wallRunUp' || this.verticalVel < 2.2);
        const wantsGroundGrab =
          this.isGrounded &&
          !this.isCrouching &&
          facingClimbDot > 0.68 &&
          moveFwd > 0.45 &&
          cc.boxTop - this.feetPos.y > 2.2;
        if (!sameClimbBlocked && (wantsAirGrab || wantsGroundGrab)) {
          if (this.wallMode !== 'none') {
            this.exitWallMode('slideStop');
          }
          const RUNG_STEP = 0.62;
          const EYE_TO_HOLD = 1.52;
          const k0 = Math.max(
            0,
            Math.round((this.feetPos.y + EYE_TO_HOLD - (cc.boxBot + 0.75)) / RUNG_STEP) - 1,
          );
          const initRungY = Math.min(cc.boxTop - 0.015, cc.boxBot + 0.75 + (k0 + 1) * RUNG_STEP);
          this.stowWeaponForLedge();
          this.ledgeState = 'armClimb';
          this.armClimbBoxId = cc.boxId;
          this.armClimbFaceId = cc.faceId;
          this.ledgeNormalX = cc.normalX;
          this.ledgeNormalZ = cc.normalZ;
          this.armClimbTangentX = cc.tangentX;
          this.armClimbTangentZ = cc.tangentZ;
          this.armClimbContactX = cc.contactX;
          this.armClimbContactZ = cc.contactZ;
          this.ledgeContactX = cc.contactX;
          this.ledgeContactZ = cc.contactZ;
          this.armClimbBoxBot = cc.boxBot;
          this.ledgeBoxTop = cc.boxTop;
          this.feetPos.x = cc.contactX + cc.normalX * (wr.playerRadiusM + 0.05);
          this.feetPos.z = cc.contactZ + cc.normalZ * (wr.playerRadiusM + 0.05);
          this.moveVel.set(0, 0, 0);
          this.verticalVel = 0;
          this.isGrounded = false;
          this.airFallTimer = 0;
          this.armClimbBaseStep = k0;
          this.armClimbStep = 0;
          this.armClimbTime = 0;
          this.armClimbEntryErrY = this.feetPos.y - (initRungY - EYE_TO_HOLD);
          this.armClimbCamRoll = 0;
          this.armClimbCamDip = 0;
          this.armClimbCamPitch = 0.08;
          this.armClimbPhase = 0;
          this.armClimbStepRung = 0;
          this.cameraPitchKick += 0.018;
          this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.1);
          this.emitSoundEvent('arm_climb_rung', moveSource, 0.9);
        }
      }

      // ---------------------------------------------------------------------
      // 4. WALL MOUNT / RUN-UP / DIRECT WALL-SLIDE / MAINTAIN / RUN-OFF LOGIC
      // ---------------------------------------------------------------------
      const wc = this.ledgeState === 'none' ? col.wallCandidate : null;
      if (this.ledgeState !== 'none') {
        // Skip wall mount while hanging/climbing a ledge or wall
      } else if (this.wallMode === 'wallRunUp') {
        if (!wc || wc.boxTop < this.feetPos.y + 0.12) {
          this.exitWallMode('dismount');
        } else {
          this.wallNormalX = wc.normalX;
          this.wallNormalZ = wc.normalZ;
          this.wallMaterial = wc.materialKind;
          this.wallSurfaceDistM = wc.distance;
          this.wallBoxTop = wc.boxTop;
          this.wallIsClimbable = wc.climbable;
        }
      } else if (this.wallMode !== 'none') {
        if (!wc) {
          if (this.wallMode === 'wallRun' && this.wallJumpLoadTimer >= 0) {
            executeWallJumpLaunch('wallRun', this.wallJumpLoadSrc);
          } else {
            // Ran cleanly off end of wall -> carry full tangent momentum across gap!
            this.moveVel.x = this.wallTangentX * this.wallRunSpeed;
            this.moveVel.z = this.wallTangentZ * this.wallRunSpeed;
            this.exitWallMode('dismount');
          }
        } else {
          // Update normal/tangent dynamically for smooth angled-segment tracking
          this.wallNormalX = wc.normalX;
          this.wallNormalZ = wc.normalZ;
          this.wallMaterial = wc.materialKind;
          this.wallSurfaceDistM = wc.distance;
          this.wallBoxTop = wc.boxTop;
          this.wallIsClimbable = wc.climbable;
          const tAx = -wc.normalZ;
          const tAz = wc.normalX;
          const alignA = tAx * this.wallTangentX + tAz * this.wallTangentZ;
          if (alignA >= 0) {
            this.wallTangentX = tAx;
            this.wallTangentZ = tAz;
          } else {
            this.wallTangentX = -tAx;
            this.wallTangentZ = -tAz;
          }
          // Re-evaluate side relative to camera right (_vecB)
          const rightDot = wc.normalX * _vecB.x + wc.normalZ * _vecB.z;
          this.wallSide = rightDot >= 0 ? -1 : 1;
        }
      } else if (!this.isSliding && wc) {
        const sameWallBlocked =
          wc.faceId === this.lastDismountFaceId && this.sameWallCooldown > 0;
        const postSpeed = Math.hypot(this.moveVel.x, this.moveVel.z);
        const facingDot = -(_vecA.x * wc.normalX + _vecA.z * wc.normalZ);
        const heightAboveFeet = wc.boxTop - this.feetPos.y;
        const sprintIntent =
          shiftHeld || isSprinting || this.airSprintActive || this.gpSprintLatched;

        // Vertical Wall Run-Up: sprint or jump head-on into shorter runnable/climbable walls!
        const canRunUp =
          !this.isCrouching &&
          !crouchHeld &&
          facingDot > 0.52 &&
          moveFwd > 0.2 &&
          (heightAboveFeet <= wr.runUpMaxHeightM || wc.climbable) &&
          heightAboveFeet > 0.85 &&
          (sprintIntent || (!this.isGrounded && postSpeed >= 3.2));

        // Direct Wall-Slide: engage smoothly anytime airborne & pressing Crouch or descending alongside a wall
        const tAx = -wc.normalZ;
        const tAz = wc.normalX;
        const dirX = postSpeed > 0.5 ? this.moveVel.x / postSpeed : _vecA.x;
        const dirZ = postSpeed > 0.5 ? this.moveVel.z / postSpeed : _vecA.z;
        const dotA = dirX * tAx + dirZ * tAz;
        const dotLookA = _vecA.x * tAx + _vecA.z * tAz;
        const useA = Math.abs(dotA) > 0.12 ? dotA >= 0 : dotLookA >= 0;
        const tx = useA ? tAx : -tAx;
        const tz = useA ? tAz : -tAz;
        const cosAngle = Math.abs(dirX * tx + dirZ * tz);
        const angleDeg = THREE.MathUtils.radToDeg(
          Math.acos(THREE.MathUtils.clamp(cosAngle, 0, 1)),
        );

        if (!sameWallBlocked && canRunUp) {
          this.wallMode = 'wallRunUp';
          this.wallFaceId = wc.faceId;
          this.wallNormalX = wc.normalX;
          this.wallNormalZ = wc.normalZ;
          this.wallTangentX = -wc.normalZ;
          this.wallTangentZ = wc.normalX;
          this.wallMaterial = wc.materialKind;
          this.wallSide = 0;
          this.wallRunTimer = 0;
          this.wallSlideTimer = 0;
          this.wallStepAccum = 0;
          this.wallSurfaceDistM = wc.distance;
          this.wallBoxTop = wc.boxTop;
          this.wallIsClimbable = wc.climbable;
          this.isGrounded = false;
          this.airFallTimer = 0;
          this.feetPos.y += 0.06;
          this.verticalVel = Math.max(this.verticalVel * 0.35, wr.runUpInitVel);
          this.wallContactPulse = 1.0;
          this.cameraPitchKick += 0.024;
          this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.14);
          this.emitSoundEvent('wall_run_up', moveSource, 1.0);
        } else if (
          !this.isGrounded &&
          !this.isCrouching &&
          !crouchHeld &&
          sprintIntent &&
          !sameWallBlocked &&
          postSpeed >= wr.entryMinSpeed * 0.72 &&
          angleDeg <= wr.entryMaxAngleDeg
        ) {
          this.wallMode = 'wallRun';
          this.wallFaceId = wc.faceId;
          this.wallNormalX = wc.normalX;
          this.wallNormalZ = wc.normalZ;
          this.wallTangentX = tx;
          this.wallTangentZ = tz;
          this.wallMaterial = wc.materialKind;
          this.wallSurfaceDistM = wc.distance;
          this.wallBoxTop = wc.boxTop;
          this.wallIsClimbable = wc.climbable;
          const rightDot = wc.normalX * _vecB.x + wc.normalZ * _vecB.z;
          this.wallSide = rightDot >= 0 ? -1 : 1;
          this.wallRunTimer = 0;
          this.wallSlideTimer = 0;
          this.wallStepAccum = 0;
          this.wallRunSpeed = THREE.MathUtils.clamp(
            Math.max(wr.minRunSpeed, postSpeed * wr.mountSpeedBoost),
            wr.minRunSpeed,
            wr.maxRunSpeed,
          );
          // Heroic vertical arrest on wall mount
          this.verticalVel = Math.max(this.verticalVel * 0.25, wr.mountUpCarry);
          this.airFallTimer = 0;
          this.wallContactPulse = 1.0;
          this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.18);
          this.cameraRollKickVel += this.wallSide * 1.6;
          this.emitSoundEvent('wall_mount', moveSource, 1.0);
        } else if (
          !this.isGrounded &&
          !sameWallBlocked &&
          (crouchHeld || (this.verticalVel < -1.8 && (weaponCombatBusy || !sprintIntent)))
        ) {
          this.wallMode = 'wallSlide';
          this.wallFaceId = wc.faceId;
          this.wallNormalX = wc.normalX;
          this.wallNormalZ = wc.normalZ;
          this.wallTangentX = tx;
          this.wallTangentZ = tz;
          this.wallMaterial = wc.materialKind;
          this.wallSurfaceDistM = wc.distance;
          this.wallBoxTop = wc.boxTop;
          this.wallIsClimbable = wc.climbable;
          const rightDot = wc.normalX * _vecB.x + wc.normalZ * _vecB.z;
          this.wallSide = rightDot >= 0 ? -1 : 1;
          this.wallRunTimer = 0;
          this.wallSlideTimer = 0;
          this.wallPullAwayTimer = 0;
          this.wallSlideHeldCrouchEntry = crouchHeld;
          this.isCrouching = false;
          this.wallRunSpeed = Math.min(postSpeed, wr.minRunSpeed);
          this.verticalVel = Math.min(this.verticalVel, -1.1);
          this.airFallTimer = 0;
          this.wallContactPulse = 0.85;
          this.cameraRollKickVel += this.wallSide * 1.2;
          this.emitSoundEvent('wall_slide_start', moveSource, 0.55);
        }
      }
    } // end if (this.ledgeState === 'none')

    // Ground footsteps
    const frameDist = Math.hypot(this.feetPos.x - prevX, this.feetPos.z - prevZ);
    if (this.isGrounded && !this.isSliding && this.wallMode === 'none' && frameDist > 0.001) {
      const stride = isSprinting ? mv.footstepDistanceSprint : mv.footstepDistanceWalk;
      this.footstepAccum += frameDist;
      if (this.footstepAccum >= stride) {
        this.footstepAccum -= stride;
        this.emitSoundEvent(
          'footstep',
          moveSource,
          isSprinting ? 1.0 : this.isCrouching ? 0.35 : 0.68,
        );
      }
    } else if (!this.isGrounded || this.isSliding) {
      this.footstepAccum = 0;
    }

    // Eye height, jump-load camera crouch dip & mantle crouch-to-stand curve
    let targetEyeHeight = this.isSliding
      ? mv.slideEyeHeight
      : this.isCrouching
        ? mv.crouchEyeHeight
        : mv.standEyeHeight;
    if (this.ledgeState === 'climb') {
      const cu = THREE.MathUtils.clamp(
        this.ledgeClimbTimer / this.ledgeClimbDuration,
        0,
        1,
      );
      const crouchIn = THREE.MathUtils.smoothstep(cu, 0.24, 0.60);
      const standOut = THREE.MathUtils.smoothstep(cu, 0.72, 1.0);
      const climbDipFactor = crouchIn * (1 - standOut);
      targetEyeHeight = THREE.MathUtils.lerp(
        targetEyeHeight,
        0.84,
        climbDipFactor,
      );
    }
    if (this.ledgeState !== 'armClimb') {
      this.armClimbCamDip = THREE.MathUtils.damp(this.armClimbCamDip, 0, 14, dt);
      this.armClimbCamRoll = THREE.MathUtils.damp(this.armClimbCamRoll, 0, 14, dt);
      this.armClimbCamPitch = THREE.MathUtils.damp(this.armClimbCamPitch, 0, 14, dt);
    }
    this.playerEyeHeight = THREE.MathUtils.damp(
      this.playerEyeHeight,
      targetEyeHeight,
      this.ledgeState === 'climb' ? 14.5 : this.isSliding ? 15.5 : 10.5,
      dt,
    );
    const groundLoadActive = this.jumpLoadTimer >= 0 && mv.jumpLoadDuration > 0.005;
    const wallLoadActive = this.wallJumpLoadTimer >= 0 && wr.leapLoadDuration > 0.005;
    const jumpLoadActive = groundLoadActive || wallLoadActive;
    const jumpLoadFrac = groundLoadActive
      ? THREE.MathUtils.clamp(this.jumpLoadTimer / mv.jumpLoadDuration, 0, 1)
      : wallLoadActive
        ? THREE.MathUtils.clamp(this.wallJumpLoadTimer / wr.leapLoadDuration, 0, 1)
        : 0;
    const jumpLoadCurve = jumpLoadActive ? Math.sin(jumpLoadFrac * Math.PI * 0.68) : 0;
    this.jumpLoadBlend = THREE.MathUtils.damp(
      this.jumpLoadBlend,
      jumpLoadActive ? jumpLoadCurve : 0,
      jumpLoadActive ? 42 : 24,
      dt,
    );
    this.jumpLoadCamDip = THREE.MathUtils.damp(
      this.jumpLoadCamDip,
      jumpLoadActive ? -mv.jumpLoadEyeDip * jumpLoadCurve : 0,
      jumpLoadActive ? 42 : 22,
      dt,
    );
    this.jumpLoadCamPitch = THREE.MathUtils.damp(
      this.jumpLoadCamPitch,
      jumpLoadActive ? -0.036 * jumpLoadCurve : 0,
      jumpLoadActive ? 40 : 20,
      dt,
    );
    this.landDipY = THREE.MathUtils.damp(this.landDipY, 0, 12.5, dt);
    this.playerPos.set(
      this.feetPos.x,
      this.feetPos.y + this.playerEyeHeight + this.jumpLoadCamDip + this.armClimbCamDip,
      this.feetPos.z,
    );

    this.slideBlend = THREE.MathUtils.damp(
      this.slideBlend,
      this.isSliding ? 1 : 0,
      this.isSliding ? 14.0 : 8.5,
      dt,
    );
    this.crouchBlend = THREE.MathUtils.damp(
      this.crouchBlend,
      this.isCrouching ? 1 : 0,
      10,
      dt,
    );
    this.wallRunBlend = THREE.MathUtils.damp(
      this.wallRunBlend,
      this.wallMode === 'wallRun' ? 1 : 0,
      11.5,
      dt,
    );
    this.wallRunUpBlend = THREE.MathUtils.damp(
      this.wallRunUpBlend,
      this.wallMode === 'wallRunUp' ? 1 : 0,
      13.5,
      dt,
    );
    this.wallSlideBlend = THREE.MathUtils.damp(
      this.wallSlideBlend,
      this.wallMode === 'wallSlide' ? 1 : 0,
      11.5,
      dt,
    );
    this.ledgeBlend = THREE.MathUtils.damp(
      this.ledgeBlend,
      this.ledgeState === 'hang' || this.ledgeState === 'climb' ? 1 : 0,
      this.ledgeState === 'hang' || this.ledgeState === 'climb' ? 24 : 14,
      dt,
    );
    this.armClimbBlend = THREE.MathUtils.damp(
      this.armClimbBlend,
      this.ledgeState === 'armClimb' ? 1 : 0,
      this.ledgeState === 'armClimb' ? 24 : 14,
      dt,
    );
    const liveHorizSpeed = Math.hypot(this.moveVel.x, this.moveVel.z);
    this.sprintBlend = THREE.MathUtils.damp(
      this.sprintBlend,
      isSprinting &&
        (this.isGrounded || this.wallMode === 'wallRun' || this.wallMode === 'wallRunUp') &&
        (liveHorizSpeed > mv.walkSpeed * 1.02 || this.wallMode === 'wallRunUp')
        ? 1
        : 0,
      8.0,
      dt,
    );

    const speedRatio = Math.min(1.45, liveHorizSpeed / mv.walkSpeed);
    if (this.wallMode === 'wallRunUp') {
      this.walkPhase += dt * 14.5;
    } else if (
      (this.isGrounded || this.wallMode === 'wallRun') &&
      !this.isSliding &&
      speedRatio > 0.04
    ) {
      this.walkPhase += dt * (6.4 + speedRatio * 3.4);
    }

    // -----------------------------------------------------------------------
    // 5. FULL-AUTO FIRING & ADS / FOV / CAMERA DYNAMICS
    // -----------------------------------------------------------------------
    if (
      (this.lmbHeld || this.rtHeld) &&
      (this.activeWeaponId === 'rustSmg' || this.activeWeaponId === 'retroSmg') &&
      this.fireCooldown <= 0 &&
      !this.isReloading &&
      !this.quickMeleeActive &&
      !this.pendingWeaponId &&
      this.ammo > 0
    ) {
      this.fireShot(this.rtHeld ? 'gamepad' : 'kbm');
    }

    const isSword = this.activeWeaponId === 'sword';
    const isFlashlight = this.activeWeaponId === 'flashlight';
    const isUnarmed = this.activeWeaponId === 'unarmed';
    const isPistol = this.activeWeaponId === 'pistol9mm';
    const isVx9 = this.activeWeaponId === 'futuristic';
    const isKs23 = this.activeWeaponId === 'rustShotgun';
    const isShotgun = isVx9 || isKs23;
    const gunRig = this.getFirearmRig();

    const wantsAds =
      !isUnarmed &&
      !this.isReloading &&
      !this.pendingWeaponId &&
      !this.swordSwingActive &&
      !this.quickMeleeActive &&
      (this.adsHeld || this.gpAdsHeld || this.adsToggled);
    if (wantsAds !== this.prevWantsAds) {
      this.prevWantsAds = wantsAds;
      this.emitSoundEvent(
        wantsAds ? 'ads_in' : 'ads_out',
        this.gpAdsHeld ? 'gamepad' : 'kbm',
      );
    }
    this.adsBlend = THREE.MathUtils.damp(
      this.adsBlend,
      wantsAds ? 1 : 0,
      wantsAds ? 16.5 : 13.0,
      dt,
    );

    const zoomedFov = isSword
      ? this.config.camera.swordGuardFov
      : isFlashlight
        ? this.config.camera.flashlightFocusFov
        : this.config.camera.adsFov;
    const targetFovBonus =
      (this.slideBlend * sl.fovBonus +
        this.sprintBlend * sl.sprintFovBonus +
        this.wallRunBlend * wr.fovBonusDeg) *
      (1 - this.adsBlend * 0.78);
    this.dynamicFovBonus = THREE.MathUtils.damp(
      this.dynamicFovBonus,
      targetFovBonus,
      10,
      dt,
    );
    this.shotFovKick = THREE.MathUtils.damp(this.shotFovKick, 0, 26, dt);
    const targetFov =
      THREE.MathUtils.lerp(this.config.camera.hipFov, zoomedFov, this.adsBlend) +
      this.dynamicFovBonus +
      this.shotFovKick;
    if (Math.abs(this.camera.fov - targetFov) > 0.01) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    // Camera wall tilt: wall-run leans away from wall, wall-slide hangs off slightly softer
    const targetWallCamRoll =
      this.wallMode === 'wallRun'
        ? this.wallSide * wr.cameraRollRad
        : this.wallMode === 'wallSlide'
          ? this.wallSide * wr.slideCameraRollRad
          : 0;
    this.wallCamRoll = THREE.MathUtils.damp(this.wallCamRoll, targetWallCamRoll, 10.5, dt);

    // Recoil & handheld realism
    this.cameraPitchKickVel +=
      (-this.cameraPitchKick * 165 - this.cameraPitchKickVel * 22) * dt;
    this.cameraPitchKick = THREE.MathUtils.clamp(
      this.cameraPitchKick + this.cameraPitchKickVel * dt,
      -0.06,
      0.16,
    );
    this.cameraRollKickVel +=
      (-this.cameraRollKick * 175 - this.cameraRollKickVel * 23) * dt;
    this.cameraRollKick = THREE.MathUtils.clamp(
      this.cameraRollKick + this.cameraRollKickVel * dt,
      -0.14,
      0.14,
    );
    this.cameraYawKick = THREE.MathUtils.damp(this.cameraYawKick, 0, 13, dt);
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 4.4);
    const shakeMag = this.cameraTrauma * this.cameraTrauma;
    const traumaPitch =
      shakeMag * 0.026 * Math.sin(this.elapsed * 71.0) * (1 - this.adsBlend * 0.42);
    const traumaYaw =
      shakeMag * 0.018 * Math.cos(this.elapsed * 63.0) * (1 - this.adsBlend * 0.48);
    const traumaRoll = shakeMag * 0.04 * Math.sin(this.elapsed * 54.0 + 1.1);

    const camSwayMask = (1 - this.adsBlend * 0.75) * (1 - this.slideBlend * 0.4);
    const handheldPitch =
      (Math.sin(this.elapsed * 1.42) * 0.0026 +
        Math.sin(this.elapsed * 2.88 + 1.2) * 0.0011) *
      camSwayMask;
    const handheldYaw =
      (Math.cos(this.elapsed * 1.08 + 0.5) * 0.0021 +
        Math.sin(this.elapsed * 2.28) * 0.0009) *
      camSwayMask;
    const handheldRoll =
      (Math.sin(this.elapsed * 0.90 + 0.8) * 0.0052 +
        Math.cos(this.elapsed * 2.10) * 0.0019) *
      camSwayMask;

    const lateralSpeed = this.moveVel.x * _vecB.x + this.moveVel.z * _vecB.z;
    this.strafeCamRoll = THREE.MathUtils.damp(
      this.strafeCamRoll,
      THREE.MathUtils.clamp(-lateralSpeed * 0.0072, -0.026, 0.026) *
        (1 - this.adsBlend * 0.72) *
        (1 - this.slideBlend) *
        (1 - Math.max(this.wallRunBlend, this.wallSlideBlend)),
      11,
      dt,
    );

    // Realistic organic walking & running camera gait:
    // Asymmetric heel-strike/toe-off vertical bounce, pelvic lateral shift,
    // step-synced head roll + subtle nod pitch, and forward sprint lean.
    const stepBobMask =
      (this.isGrounded || this.wallMode === 'wallRun' ? 1 : 0) *
      (1 - this.slideBlend) *
      (1 - this.wallSlideBlend);
    const adsBobDamp = 1 - this.adsBlend * 0.78;
    const walkWeight = THREE.MathUtils.clamp(speedRatio, 0, 1.0);
    const sprintBoost = THREE.MathUtils.lerp(1.0, 1.52, this.sprintBlend);

    // Asymmetric dual-harmonic heel-strike dip + toe push-off lift
    const gaitDropWave =
      Math.sin(this.walkPhase * 2) * 0.72 +
      Math.sin(this.walkPhase * 4 - 0.65) * 0.28;
    const walkBobY =
      gaitDropWave * 0.025 * walkWeight * sprintBoost * stepBobMask * adsBobDamp;
    const walkBobX =
      Math.cos(this.walkPhase) *
      (0.014 + this.sprintBlend * 0.011) *
      walkWeight *
      stepBobMask *
      adsBobDamp;
    const walkBobRoll =
      Math.cos(this.walkPhase) *
      (0.0075 + this.sprintBlend * 0.0085) *
      walkWeight *
      stepBobMask *
      (1 - this.adsBlend * 0.82);
    const walkBobPitch =
      (-Math.abs(Math.sin(this.walkPhase)) * 0.0055 * (1 + this.sprintBlend * 0.75) +
        Math.sin(this.walkPhase * 2 - 0.4) * 0.0038) *
      walkWeight *
      stepBobMask *
      (1 - this.adsBlend * 0.82);
    const walkBobYaw =
      Math.sin(this.walkPhase) *
      (0.0032 + this.sprintBlend * 0.0042) *
      walkWeight *
      stepBobMask *
      (1 - this.adsBlend * 0.84);
    const sprintForwardPitch =
      -0.012 * this.sprintBlend * stepBobMask * (1 - this.adsBlend);

    const dYaw = this.yaw - this.prevYaw;
    const dPitch = this.pitch - this.prevPitch;
    this.prevYaw = this.yaw;
    this.prevPitch = this.pitch;
    this.blurVelX = THREE.MathUtils.damp(
      this.blurVelX,
      THREE.MathUtils.clamp(
        (dYaw / Math.max(0.006, dt)) * 0.00125 + lateralSpeed * 0.00035,
        -0.0115,
        0.0115,
      ),
      26,
      dt,
    );
    this.blurVelY = THREE.MathUtils.damp(
      this.blurVelY,
      THREE.MathUtils.clamp(
        (-dPitch / Math.max(0.006, dt)) * 0.00115 + this.recoilPitchVel * 0.00055,
        -0.0105,
        0.0105,
      ),
      26,
      dt,
    );

    // Slight outward hang-off offset when wall-running / wall-sliding
    const wallLeanCamX =
      -this.wallSide * (this.wallRunBlend * 0.07 + this.wallSlideBlend * 0.11);
    const camRightOff =
      walkBobX + wallLeanCamX + Math.cos(this.elapsed * 0.85) * 0.0022 * camSwayMask;
    const slideVibration =
      (this.slideBlend + this.wallSlideBlend * 0.8) * Math.sin(this.elapsed * 46) * 0.0032;

    this.camera.position.set(
      this.playerPos.x + _vecB.x * camRightOff,
      this.playerPos.y +
        walkBobY +
        slideVibration +
        this.landDipY +
        Math.sin(this.elapsed * 1.6) * 0.0036 * (1 - this.adsBlend * 0.55),
      this.playerPos.z + _vecB.z * camRightOff,
    );
    // Mantle camera pitch-down so player sees both palms flat-planted & pressing as chest/knee come over!
    const climbProg =
      this.ledgeState === 'climb'
        ? THREE.MathUtils.clamp(this.ledgeClimbTimer / this.ledgeClimbDuration, 0, 1)
        : 0;
    const mantleLookDown =
      this.ledgeState === 'climb'
        ? THREE.MathUtils.smoothstep(climbProg, 0.30, 0.62) *
          (1 - THREE.MathUtils.smoothstep(climbProg, 0.80, 1.0))
        : 0;
    const climbCamPitch =
      this.ledgeState === 'climb'
        ? -0.56 * mantleLookDown -
          0.035 * Math.sin(THREE.MathUtils.clamp(climbProg / 0.30, 0, 1) * Math.PI)
        : this.ledgeState === 'hang'
          ? -0.08
          : 0;
    const climbCamRoll =
      this.ledgeState === 'climb'
        ? Math.sin(THREE.MathUtils.clamp((climbProg - 0.18) / 0.56, 0, 1) * Math.PI * 2) *
          0.024
        : 0;

    this.camera.rotation.set(
      this.pitch +
        this.cameraPitchKick +
        traumaPitch +
        handheldPitch +
        walkBobPitch +
        sprintForwardPitch +
        this.jumpLoadCamPitch +
        climbCamPitch +
        this.armClimbCamPitch +
        this.wallRunUpBlend * 0.042 +
        this.reloadCamPitch +
        this.swapCamPitch +
        this.swordCamPitch +
        this.slideBlend * sl.cameraPitch * (1 - this.adsBlend * 0.7),
      this.yaw + this.cameraYawKick + traumaYaw + handheldYaw + walkBobYaw,
      -this.swayX * 0.11 +
        this.strafeCamRoll +
        this.wallCamRoll +
        walkBobRoll +
        handheldRoll +
        this.cameraRollKick +
        traumaRoll +
        climbCamRoll +
        this.armClimbCamRoll +
        this.reloadCamRoll +
        this.swapCamRoll +
        this.swordCamRoll +
        this.slideBlend * this.slideLeanSign * sl.cameraRoll * (1 - this.adsBlend * 0.65),
    );

    // -----------------------------------------------------------------------
    // 6. FIRST-PERSON LEGS UPDATE (LEG VISIBILITY LAW)
    // Keep lower-body yaw closely aligned with camera yaw (small ±0.15..0.32 rad
    // cant only) so legs always trail behind-below and stay OUT of level views.
    // -----------------------------------------------------------------------
    const wallCant =
      this.wallMode === 'wallRun'
        ? this.wallSide * 0.15
        : this.wallMode === 'wallSlide'
          ? this.wallSide * 0.18
          : 0;
    let desiredLegsYaw = this.yaw + wallCant;
    if (
      this.ledgeState === 'hang' ||
      this.ledgeState === 'climb' ||
      this.ledgeState === 'armClimb'
    ) {
      const wallYaw = Math.atan2(this.ledgeNormalX, this.ledgeNormalZ);
      let dWall = wallYaw - this.yaw;
      while (dWall > Math.PI) dWall -= Math.PI * 2;
      while (dWall < -Math.PI) dWall += Math.PI * 2;
      desiredLegsYaw = this.yaw + THREE.MathUtils.clamp(dWall, -0.32, 0.32);
    }
    let yawDiff = desiredLegsYaw - this.legsYaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    this.legsYaw +=
      yawDiff *
      (1 - Math.exp(-(this.wallMode !== 'none' || this.ledgeState !== 'none' ? 14 : 11) * dt));

    this.legs.root.position.copy(this.feetPos);
    this.legs.root.rotation.set(0, this.legsYaw, 0);
    this.legs.update({
      dt,
      elapsed: this.elapsed,
      horizSpeed: liveHorizSpeed,
      verticalVel: this.verticalVel,
      isGrounded: this.isGrounded,
      isSprinting,
      jumpLoad01: this.jumpLoadBlend,
      crouchBlend: this.crouchBlend,
      groundSlideBlend: this.slideBlend,
      wallRunBlend: this.wallRunBlend,
      wallRunUpBlend: this.wallRunUpBlend,
      wallSlideBlend: this.wallSlideBlend,
      wallSide: this.wallSide,
      ledgeBlend: this.ledgeBlend,
      ledgeClimbProgress: climbProg,
      armClimbBlend: this.armClimbBlend,
      armClimbPhase: this.armClimbPhase,
      stridePhase: this.walkPhase,
      eyeHeight: this.playerEyeHeight,
    });

    // -----------------------------------------------------------------------
    // 7. WEAPON VIEWMODEL + HANDS + WALL PARKOUR POSES
    // -----------------------------------------------------------------------
    const rawTurnActivity = Math.min(
      1,
      (Math.abs(this.mouseDeltaX) + Math.abs(this.mouseDeltaY)) * 0.018,
    );
    const targetSwayX = THREE.MathUtils.clamp(-this.mouseDeltaX * 0.0012, -0.042, 0.042);
    const targetSwayY = THREE.MathUtils.clamp(this.mouseDeltaY * 0.0012, -0.036, 0.036);
    this.mouseDeltaX = THREE.MathUtils.damp(this.mouseDeltaX, 0, 22, dt);
    this.mouseDeltaY = THREE.MathUtils.damp(this.mouseDeltaY, 0, 22, dt);

    const swayMult = THREE.MathUtils.lerp(1.0, 0.24, this.adsBlend);
    this.swayX = THREE.MathUtils.damp(this.swayX, targetSwayX * swayMult, 9.5, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, targetSwayY * swayMult, 9.5, dt);

    this.recoilKickZVel += (-310 * this.recoilKickZ - 26 * this.recoilKickZVel) * dt;
    this.recoilKickZ += this.recoilKickZVel * dt;
    this.recoilPitchVel += (-275 * this.recoilPitch - 22 * this.recoilPitchVel) * dt;
    this.recoilPitch += this.recoilPitchVel * dt;
    this.recoilRollVel += (-250 * this.recoilRoll - 20 * this.recoilRollVel) * dt;
    this.recoilRoll += this.recoilRollVel * dt;

    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.triggerPull = THREE.MathUtils.damp(this.triggerPull, 0, 18, dt);
    if (gunRig) gunRig.setTriggerPull(this.triggerPull);
    this.hands.setTriggerFingerCurl(gunRig ? this.triggerPull : 0);

    if (this.flashlightClickTimer > 0) {
      this.flashlightClickTimer = Math.max(0, this.flashlightClickTimer - dt);
      const clickBell = Math.sin((this.flashlightClickTimer / 0.18) * Math.PI);
      this.plainFlashlight.setSwitchPress(clickBell);
      this.hands.setFlashlightThumbPress(clickBell);
    } else {
      this.plainFlashlight.setSwitchPress(0);
      this.hands.setFlashlightThumbPress(0);
    }

    this.fireHeat = THREE.MathUtils.damp(this.fireHeat, 0, 1.5, dt);
    if (isVx9) this.futuristicGun.setFireGlow(this.fireHeat);
    else if (isKs23) this.rustShotgun.setFireGlow(this.fireHeat);
    else if (this.activeWeaponId === 'rustSmg') this.rustSmg.setFireGlow(this.fireHeat);
    else if (this.activeWeaponId === 'retroSmg') this.retroSmg.setFireGlow(this.fireHeat);

    // Weapon swap offsets
    let swapPosX = 0;
    let swapPosY = 0;
    let swapPosZ = 0;
    let swapRotX = 0;
    let swapRotY = 0;
    let swapRotZ = 0;
    let targetSwapCamRoll = 0;
    let targetSwapCamPitch = 0;

    if (this.pendingWeaponId || this.swapTimer > 0) {
      const prevT = this.swapTimer;
      this.swapTimer += dt;
      const split = this.swapDuration * 0.48;
      if (this.pendingWeaponId && prevT < split && this.swapTimer >= split) {
        this.activeWeaponId = this.pendingWeaponId;
        this.pendingWeaponId = null;
        this.applyVisibleWeaponRig(this.activeWeaponId);
        this.slidePos =
          this.activeWeaponId === 'pistol9mm' && this.ammo === 0 ? 0.068 : 0;
        this.emitSoundEvent('weapon_switch', this.lastInputSource);
        this.emitSoundEvent('weapon_raise', this.lastInputSource);
        if (getWeaponHolsterZone(this.activeWeaponId) === 'back') {
          this.recoilPitchVel -= 1.35;
          this.recoilRollVel += 1.25;
        }
      }

      if (this.swapTimer < split) {
        const u = Math.min(1, this.swapTimer / split);
        const e = u * u * (3 - 2 * u);
        const zone = getWeaponHolsterZone(this.swapFromWeaponId);
        if (zone === 'back') {
          swapPosX = e * 0.22;
          swapPosY = -e * 0.38;
          swapPosZ = e * 0.08;
          swapRotX = -e * 0.56;
          swapRotY = -e * 0.32;
          swapRotZ = -e * 0.36;
          targetSwapCamRoll = -e * 0.022;
          targetSwapCamPitch = -e * 0.014;
        } else if (zone === 'hip' || zone === 'chest') {
          swapPosX = e * 0.18;
          swapPosY = -e * 0.35;
          swapPosZ = e * 0.1;
          swapRotX = -e * 0.62;
          swapRotY = -e * 0.24;
          swapRotZ = -e * 0.32;
          targetSwapCamRoll = -e * 0.015;
        } else {
          swapPosY = -e * 0.22;
        }
      } else {
        const u = Math.min(
          1,
          (this.swapTimer - split) / (this.swapDuration - split),
        );
        const inv = 1 - (1 - Math.pow(1 - u, 3));
        const zone = getWeaponHolsterZone(this.activeWeaponId);
        if (zone === 'back') {
          swapPosX = inv * 0.22;
          swapPosY = -inv * 0.38;
          swapPosZ = inv * 0.08;
          swapRotX = -inv * 0.56;
          swapRotY = -inv * 0.32;
          swapRotZ = -inv * 0.36;
          targetSwapCamRoll = -inv * 0.022;
          targetSwapCamPitch = -inv * 0.014;
        } else if (zone === 'hip' || zone === 'chest') {
          swapPosX = inv * 0.18;
          swapPosY = -inv * 0.35;
          swapPosZ = inv * 0.1;
          swapRotX = -inv * 0.62;
          swapRotY = -inv * 0.24;
          swapRotZ = -inv * 0.32;
          targetSwapCamRoll = -inv * 0.015;
        } else {
          swapPosY = -inv * 0.22;
        }
      }

      if (this.swapTimer >= this.swapDuration) {
        this.swapTimer = 0;
        this.pendingWeaponId = null;
      }
    }
    this.swapCamRoll = THREE.MathUtils.damp(this.swapCamRoll, targetSwapCamRoll, 13, dt);
    this.swapCamPitch = THREE.MathUtils.damp(
      this.swapCamPitch,
      targetSwapCamPitch,
      13,
      dt,
    );

    if (gunRig) {
      if (this.slideHoldTimer > 0) {
        this.slideHoldTimer = Math.max(0, this.slideHoldTimer - dt);
      } else if (!this.isReloading) {
        const slideRest = isPistol && this.ammo === 0 ? 0.068 : 0;
        this.slidePos = THREE.MathUtils.damp(this.slidePos, slideRest, 19, dt);
      }
      gunRig.setSlideOffset(this.slidePos);
    }

    if (this.flashTimer > 0 && gunRig) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
      const denom = isShotgun ? 0.082 : 0.056;
      const intensity = Math.min(1, this.flashTimer / denom);
      this.activeFlashIntensity = intensity;
      gunRig.setMuzzleFlash(intensity);
    } else {
      this.activeFlashIntensity = 0;
      this.pistol9mm.setMuzzleFlash(0);
      this.futuristicGun.setMuzzleFlash(0);
      this.rustSmg.setMuzzleFlash(0);
      this.retroSmg.setMuzzleFlash(0);
      this.rustShotgun.setMuzzleFlash(0);
    }

    if (isShotgun && this.shotgunPumpTimer >= 0 && !this.isReloading) {
      this.shotgunPumpTimer += dt;
      let pumpAmt = 0;
      if (this.shotgunPumpTimer >= 0.14 && this.shotgunPumpTimer < 0.3) {
        pumpAmt = (this.shotgunPumpTimer - 0.14) / 0.16;
        if (!this.shotgunPumpAudioPlayed) {
          this.shotgunPumpAudioPlayed = true;
          this.emitSoundEvent('pump', this.lastInputSource, 1.0);
        }
      } else if (this.shotgunPumpTimer >= 0.3 && this.shotgunPumpTimer < 0.48) {
        pumpAmt = 1 - (this.shotgunPumpTimer - 0.3) / 0.18;
      } else if (this.shotgunPumpTimer >= 0.48) {
        this.shotgunPumpTimer = -1;
        pumpAmt = 0;
      }
      if (isVx9) this.futuristicGun.setPumpOffset(pumpAmt);
      else this.rustShotgun.setPumpOffset?.(pumpAmt);
      this.hands.leftHandGroup.position
        .copy(this.leftHandRestPos)
        .add(_vecB.set(0, 0, pumpAmt * 0.095));
      this.hands.leftHandGroup.quaternion.copy(this.leftHandRestQuat);
    }

    let reloadPosY = 0;
    let reloadRotX = 0;
    let reloadRotZ = 0;
    let targetReloadCamRoll = 0;
    let targetReloadCamPitch = 0;

    if (this.isReloading) {
      this.reloadTime += dt;
      const reloadDur = isShotgun ? 1.55 : isPistol ? 1.25 : 1.45;
      const p = Math.min(1, this.reloadTime / reloadDur);
      const bell = Math.sin(p * Math.PI);
      reloadPosY = -bell * 0.04;
      reloadRotX = bell * 0.24;
      reloadRotZ = -bell * 0.36;
      targetReloadCamRoll = -bell * 0.025;
      targetReloadCamPitch = bell * 0.018;

      if (p < 0.65) {
        this.hands.leftHandGroup.position
          .copy(this.leftHandRestPos)
          .add(_vecB.set(-0.02, -0.08 * bell, 0.04));
        this.hands.leftHandGroup.quaternion
          .copy(this.leftHandRestQuat)
          .slerp(this.reloadMagQuat, Math.min(1, bell * 1.4));
        this.hands.setLeftHandReloadPose(Math.min(1, bell * 1.2), 0);
      } else {
        const rack = Math.sin(((p - 0.65) / 0.35) * Math.PI);
        this.slidePos = rack * 0.068;
        this.hands.leftHandGroup.position
          .copy(this.leftHandRestPos)
          .add(_vecB.set(-0.01, 0.045 * rack, 0.05 * rack));
        this.hands.leftHandGroup.quaternion
          .copy(this.leftHandRestQuat)
          .slerp(this.reloadOverhandQuat, rack);
        this.hands.setLeftHandReloadPose(0.25, rack);
      }

      if (this.reloadTime >= reloadDur) {
        this.isReloading = false;
        this.reloadTime = 0;
        this.ammo = this.maxAmmo;
        this.hands.leftHandGroup.position.copy(this.leftHandRestPos);
        this.hands.leftHandGroup.quaternion.copy(this.leftHandRestQuat);
        this.hands.setLeftHandReloadPose(0, 0);
        if (!isSword && !isFlashlight && !isUnarmed) {
          this.emitSoundEvent('reload_end', this.lastInputSource);
        }
      }
    }
    this.reloadCamRoll = THREE.MathUtils.damp(
      this.reloadCamRoll,
      targetReloadCamRoll,
      11,
      dt,
    );
    this.reloadCamPitch = THREE.MathUtils.damp(
      this.reloadCamPitch,
      targetReloadCamPitch,
      11,
      dt,
    );

    let swordPosX = 0;
    let swordPosY = 0;
    let swordPosZ = 0;
    let swordRotX = 0;
    let swordRotY = 0;
    let swordRotZ = 0;
    let targetSwordCamRoll = 0;
    let targetSwordCamPitch = 0;

    if (this.swordComboResetTimer > 0 && !this.swordSwingActive) {
      this.swordComboResetTimer = Math.max(0, this.swordComboResetTimer - dt);
    }

    if (this.quickMeleeActive) {
      this.quickMeleeTime += dt;
      const p = Math.min(1, this.quickMeleeTime / 0.54);
      const slash = Math.sin(p * Math.PI);
      swordPosX = THREE.MathUtils.lerp(0.24, -0.26, p);
      swordPosY = -0.02 - slash * 0.04;
      swordPosZ = -slash * 0.18;
      swordRotX = -slash * 0.72;
      swordRotY = THREE.MathUtils.lerp(-0.45, 0.92, p);
      swordRotZ = slash * 0.85;
      targetSwordCamRoll = -slash * 0.055;
      targetSwordCamPitch = -slash * 0.035;
      if (!this.quickMeleeHitChecked && p >= 0.42) {
        this.quickMeleeHitChecked = true;
        this.checkBladeHit(this.lastInputSource);
      }
      if (p >= 1) {
        this.quickMeleeActive = false;
        this.activeWeaponId = this.quickMeleeReturnWeapon;
        this.applyVisibleWeaponRig(this.activeWeaponId);
      }
    } else if (this.swordSwingActive) {
      this.swordSwingTime += dt;
      const p = Math.min(1, this.swordSwingTime / this.swordSwingDuration);
      const slash = Math.sin(p * Math.PI);
      const dir = this.swordComboStep === 1 ? -1 : 1;
      swordPosX = dir * THREE.MathUtils.lerp(0.18, -0.22, p);
      swordPosY = -0.01 - slash * 0.05;
      swordPosZ = -slash * 0.16;
      swordRotX = -slash * 0.68;
      swordRotY = dir * THREE.MathUtils.lerp(-0.35, 0.82, p);
      swordRotZ = dir * slash * 0.78;
      targetSwordCamRoll = -dir * slash * 0.048;
      targetSwordCamPitch = -slash * 0.028;
      if (!this.swordHitChecked && p >= 0.42) {
        this.swordHitChecked = true;
        this.checkBladeHit(this.lastInputSource);
      }
      if (p >= 1) {
        this.swordSwingActive = false;
        if (this.swordComboQueued) {
          this.swordComboQueued = false;
          this.fireShot(this.lastInputSource);
        }
      }
    }
    this.swordCamRoll = THREE.MathUtils.damp(this.swordCamRoll, targetSwordCamRoll, 16, dt);
    this.swordCamPitch = THREE.MathUtils.damp(
      this.swordCamPitch,
      targetSwordCamPitch,
      16,
      dt,
    );

    if (isVx9) {
      this.futuristicGun.updateLeds(this.ammo, this.maxAmmo, this.isReloading, this.elapsed);
    } else if (this.activeWeaponId === 'rustSmg') {
      this.rustSmg.updateLeds(this.ammo, this.maxAmmo, this.isReloading, this.elapsed);
    } else if (this.activeWeaponId === 'retroSmg') {
      this.retroSmg.updateLeds(this.ammo, this.maxAmmo, this.isReloading, this.elapsed);
    } else if (isKs23) {
      this.rustShotgun.updateLeds(this.ammo, this.maxAmmo, this.isReloading, this.elapsed);
    } else if (isPistol) {
      this.pistol9mm.updateLeds?.(this.ammo, this.maxAmmo, this.isReloading, this.elapsed);
    }

    const parkourBlend = Math.max(
      this.wallRunBlend,
      this.wallRunUpBlend,
      this.wallSlideBlend,
    );
    const isLedgeActive =
      this.ledgeState === 'hang' ||
      this.ledgeState === 'climb' ||
      this.ledgeBlend > 0.02;
    const isArmClimbActive =
      this.ledgeState === 'armClimb' || this.armClimbBlend > 0.02;
    const busy =
      this.isReloading ||
      this.pendingWeaponId !== null ||
      this.swordSwingActive ||
      this.quickMeleeActive ||
      this.shotgunPumpTimer >= 0 ||
      isLedgeActive ||
      isArmClimbActive ||
      (isUnarmed && parkourBlend > 0.05);

    this.hands.updateAliveMotion(
      dt,
      this.elapsed,
      Math.min(1, Math.abs(this.recoilKickZ) * 14),
      this.adsBlend,
      busy,
      this.triggerPull,
      Math.min(1, speedRatio + rawTurnActivity + this.slideBlend + parkourBlend),
    );

    // Compute weaponPivot transform FIRST so camera.updateMatrixWorld(true) gives
    // exact world <-> weaponPivot local conversion for world-locked climbing hands!
    // TILT LAW (Lotty, Nov 27, 2026): Gun & hands tilt 1:1 with the camera
    // (wallPivotRoll = 0 so weaponPivot inherits camera.rotation.z directly).
    const adsSmooth =
      this.adsBlend * this.adsBlend * (3 - 2 * this.adsBlend);
    const hipX = isSword ? 0.145 : isFlashlight ? 0.132 : isUnarmed ? 0 : 0.112;
    const hipY = isSword ? -0.264 : isFlashlight ? -0.096 : isUnarmed ? -0.18 : -0.102;
    const hipZ = isSword ? -0.28 : isFlashlight ? -0.312 : isShotgun ? -0.34 : isPistol ? -0.275 : -0.31;
    const adsX = 0;
    const adsY = isSword
      ? -0.185
      : isFlashlight
        ? -0.055
        : gunRig
          ? -gunRig.sightLineY
          : -0.05;
    const adsZ = isPistol ? -0.22 : isShotgun ? -0.25 : -0.24;

    const weightLag = isShotgun ? 1.35 : isSword ? 0.9 : 1.0;
    const wallPivotX =
      (this.wallSlideBlend *
        (this.wallSide === 1 ? -0.042 : this.wallSide === -1 ? 0.022 : 0) +
        this.wallRunBlend *
          (this.wallSide === 1 ? -0.024 : this.wallSide === -1 ? 0.016 : 0)) *
      (1 - adsSmooth) *
      (isUnarmed ? 0 : 1);
    const wallPivotY =
      parkourBlend *
      (-0.014 * this.wallSlideBlend - Math.abs(Math.sin(this.walkPhase)) * 0.011 * this.wallRunBlend) *
      weightLag *
      (1 - adsSmooth);
    const wallPivotZ =
      -0.016 * this.wallSlideBlend * (1 - adsSmooth) * (isUnarmed ? 0 : 1);
    const wallPivotRoll = 0; // TILT LAW: Zero counter-roll vs camera
    const flashlightWallSweepYaw =
      isFlashlight && parkourBlend > 0.01 && this.wallSide !== 0
        ? parkourBlend * (this.wallSide * -0.32 + Math.sin(this.elapsed * 3.4) * 0.14)
        : 0;

    // Center weaponPivot cleanly when grabbing/climbing a ledge or climb wall so both hands grip straight ahead
    const ledgeCenterMask = 1 - Math.max(this.ledgeBlend, this.armClimbBlend);
    this.weaponPivot.position.set(
      (THREE.MathUtils.lerp(hipX, adsX, adsSmooth) +
        this.swayX +
        swapPosX +
        swordPosX +
        wallPivotX) *
        ledgeCenterMask,
      (THREE.MathUtils.lerp(hipY, adsY, adsSmooth) +
        this.swayY +
        reloadPosY +
        swapPosY +
        swordPosY +
        wallPivotY +
        Math.sin(this.elapsed * 1.8) * 0.0024 * (1 - adsSmooth * 0.72)) *
        ledgeCenterMask,
      (THREE.MathUtils.lerp(hipZ, adsZ, adsSmooth) +
        this.recoilKickZ +
        swapPosZ +
        swordPosZ +
        wallPivotZ) *
        ledgeCenterMask,
    );

    this.weaponPivot.rotation.order = 'YXZ';
    this.weaponPivot.rotation.set(
      (this.recoilPitch + this.swayY * 1.3 + reloadRotX + swapRotX + swordRotX) *
        ledgeCenterMask,
      (-this.swayX * 1.6 + swapRotY + swordRotY + flashlightWallSweepYaw) *
        ledgeCenterMask,
      (this.recoilRoll -
        this.swayX * 2.4 +
        reloadRotZ +
        swapRotZ +
        swordRotZ +
        wallPivotRoll) *
        ledgeCenterMask,
    );

    this.camera.updateMatrixWorld(true);

    const exactSurfaceDepthM = Math.max(
      0.26,
      (this.camera.position.x - this.ledgeContactX) * this.ledgeNormalX +
        (this.camera.position.z - this.ledgeContactZ) * this.ledgeNormalZ,
    );

    const convertWorldHandToPivotLocal = (
      worldPos: THREE.Vector3,
      worldFwd: THREE.Vector3,
      worldUpHint: THREE.Vector3,
      invPivotMat: THREE.Matrix4,
      invPivotQuat: THREE.Quaternion,
      outLocalPos: THREE.Vector3,
      outLocalQuat: THREE.Quaternion,
    ) => {
      outLocalPos.copy(worldPos).applyMatrix4(invPivotMat);
      _vecF.copy(worldFwd).normalize(); // +Z_local = fingers forward
      _vecE.crossVectors(worldUpHint, _vecF);
      if (_vecE.lengthSq() < 1e-6) _vecE.set(1, 0, 0);
      _vecE.normalize(); // +X_local
      _vecG.crossVectors(_vecF, _vecE).normalize(); // +Y_local = knuckles (palm = -Y_local)
      _matB.makeBasis(_vecE, _vecG, _vecF);
      _quatD.setFromRotationMatrix(_matB);
      outLocalQuat.multiplyQuaternions(invPivotQuat, _quatD);
    };

    if (isArmClimbActive && isUnarmed) {
      _matA.copy(this.weaponPivot.matrixWorld).invert();
      this.weaponPivot.getWorldQuaternion(_quatC).invert();

      const intoX = -this.ledgeNormalX;
      const intoZ = -this.ledgeNormalZ;
      const rightX = this.ledgeNormalZ;
      const rightZ = -this.ledgeNormalX;

      const RUNG_STEP = 0.62;
      const rungYAt = (k: number) =>
        Math.min(
          this.ledgeBoxTop - 0.015,
          this.armClimbBoxBot + 0.75 + Math.max(0, k) * RUNG_STEP,
        );

      const stepAbs = this.armClimbBaseStep + this.armClimbStep;
      const stepIdx = Math.floor(stepAbs);
      const frac = stepAbs - stepIdx;
      // pullSide = 1 -> Right pulls on rung(stepIdx + 1) while Left reaches rung(stepIdx) -> rung(stepIdx + 2)
      // pullSide = -1 -> Left pulls on rung(stepIdx + 1) while Right reaches rung(stepIdx) -> rung(stepIdx + 2)
      const pullSide: -1 | 1 = ((stepIdx % 2) + 2) % 2 === 0 ? 1 : -1;

      const solveArmClimbSide = (
        sideSign: -1 | 1,
        outLocalPos: THREE.Vector3,
        outLocalQuat: THREE.Quaternion,
      ): { curl: number; splay: number; pullLoad: number } => {
        const isPullingArm = sideSign === pullSide;
        let worldY: number;
        let outOff: number;
        let latOff: number;
        let fwdPitchBias = 0;
        let curl: number;
        let splay: number;
        let pullLoad = 0;

        if (isPullingArm) {
          // LOAD (0..0.18) -> PULL one-arm row (0.18..0.86) -> HOLD (0.86..1.00)
          worldY = rungYAt(stepIdx + 1) - 0.032;
          if (frac < 0.18) {
            const lT = THREE.MathUtils.smoothstep(frac, 0, 0.18);
            pullLoad = THREE.MathUtils.lerp(0.28, 0.62, lT);
            outOff = THREE.MathUtils.lerp(0.076, 0.084, lT);
            fwdPitchBias = lT * 0.16;
          } else if (frac < 0.86) {
            const pT = THREE.MathUtils.smoothstep(frac, 0.18, 0.86);
            pullLoad = 0.62 + Math.sin(pT * Math.PI * 0.78) * 0.38;
            outOff = 0.084 + Math.sin(pT * Math.PI) * 0.014;
            fwdPitchBias = 0.16 + pT * 0.38;
          } else {
            const hT = THREE.MathUtils.smoothstep(frac, 0.86, 1.0);
            pullLoad = THREE.MathUtils.lerp(0.55, 0.25, hT);
            outOff = THREE.MathUtils.lerp(0.084, 0.076, hT);
            fwdPitchBias = THREE.MathUtils.lerp(0.54, 0.24, hT);
          }
          latOff = sideSign * 0.19;
          curl = 0.94;
          splay = 0.24;
        } else {
          // OPPOSITE ARM: HOLD rung(i) during Load -> REACH visibly UP into center frame -> SPREAD & WRAP rung(i+2)
          const rStartY = rungYAt(stepIdx) - 0.032;
          const rEndY = rungYAt(stepIdx + 2) - 0.032;
          if (frac < 0.18) {
            worldY = rStartY;
            outOff = 0.076;
            latOff = sideSign * 0.19;
            curl = THREE.MathUtils.lerp(0.92, 0.68, frac / 0.18);
            splay = THREE.MathUtils.lerp(0.26, 0.50, frac / 0.18);
            pullLoad = 0.18 * (1 - frac / 0.18);
          } else if (frac < 0.76) {
            const rT = THREE.MathUtils.smoothstep(frac, 0.18, 0.76);
            const swingOut = Math.sin(rT * Math.PI);
            worldY = THREE.MathUtils.lerp(rStartY, rEndY, rT);
            // Swing hand outward toward camera & slightly inward so player clearly sees hand reaching up in frame!
            outOff = 0.078 + swingOut * 0.145;
            latOff = sideSign * (0.19 - swingOut * 0.055);
            fwdPitchBias = -swingOut * 0.12;
            curl = THREE.MathUtils.lerp(0.28, 0.08, Math.sin(rT * Math.PI * 0.65));
            splay = 0.96;
            pullLoad = 0.05;
          } else {
            // PLANT & WRAP on rung(i+2): 0.76..0.88 spread open contact, 0.88..1.00 wrap fingers around rung!
            const wT = THREE.MathUtils.smoothstep(frac, 0.76, 1.0);
            worldY = rEndY;
            outOff = THREE.MathUtils.lerp(0.088, 0.076, wT);
            latOff = sideSign * 0.19;
            const wrapT = THREE.MathUtils.smoothstep(frac, 0.86, 1.0);
            curl = THREE.MathUtils.lerp(0.10, 0.94, wrapT);
            splay = THREE.MathUtils.lerp(0.96, 0.24, wrapT);
            pullLoad = wrapT * 0.28;
          }
        }

        _vecC.set(
          this.armClimbContactX + rightX * latOff + this.ledgeNormalX * outOff,
          Math.min(worldY, this.ledgeBoxTop - 0.015),
          this.armClimbContactZ + rightZ * latOff + this.ledgeNormalZ * outOff,
        );

        // Near wall summit lip, tilt fingers smoothly over the top rim
        const topRimFrac = THREE.MathUtils.smoothstep(
          _vecC.y,
          this.ledgeBoxTop - 0.08,
          this.ledgeBoxTop - 0.015,
        );
        const intoAmt = THREE.MathUtils.clamp(0.42 + fwdPitchBias + topRimFrac * 0.28, 0.22, 0.92);
        const upAmt = THREE.MathUtils.clamp(0.88 - fwdPitchBias * 0.45 - topRimFrac * 0.30, 0.35, 0.96);
        _vecD.set(intoX * intoAmt + rightX * (-sideSign * 0.08), upAmt, intoZ * intoAmt + rightZ * (-sideSign * 0.08));
        _vecB.set(
          this.ledgeNormalX,
          0.16 + fwdPitchBias * 0.45 + topRimFrac * 0.45,
          this.ledgeNormalZ,
        );

        convertWorldHandToPivotLocal(
          _vecC,
          _vecD,
          _vecB,
          _matA,
          _quatC,
          outLocalPos,
          outLocalQuat,
        );
        return { curl, splay, pullLoad };
      };

      const lRes = solveArmClimbSide(-1, _posLTarget, _quatLTarget);
      const rRes = solveArmClimbSide(1, _posRTarget, _quatRTarget);

      this.hands.setArmClimbPose({
        blend: this.armClimbBlend,
        climbPhase: this.armClimbPhase,
        surfaceDepthM: exactSurfaceDepthM,
        climbDir: this.armClimbDir,
        elapsed: this.elapsed,
        dt,
        leftTargetPos: _posLTarget,
        leftTargetQuat: _quatLTarget,
        rightTargetPos: _posRTarget,
        rightTargetQuat: _quatRTarget,
        leftGripCurl: lRes.curl,
        rightGripCurl: rRes.curl,
        leftSplay: lRes.splay,
        rightSplay: rRes.splay,
        leftPullLoad: lRes.pullLoad,
        rightPullLoad: rRes.pullLoad,
      });
    } else if (isLedgeActive && isUnarmed) {
      _matA.copy(this.weaponPivot.matrixWorld).invert();
      this.weaponPivot.getWorldQuaternion(_quatC).invert();

      const intoX = -this.ledgeNormalX;
      const intoZ = -this.ledgeNormalZ;
      const rightX = this.ledgeNormalZ;
      const rightZ = -this.ledgeNormalX;
      const isHangPhase = this.ledgeState === 'hang';
      const uClimb = this.ledgeState === 'climb' ? climbProg : isHangPhase ? 0 : 1;
      const hangSway = isHangPhase ? Math.sin(this.elapsed * 2.3) * 0.004 : 0;

      const solveWorldLedgeHand = (
        armU: number,
        sideSign: -1 | 1,
        outLocalPos: THREE.Vector3,
        outLocalQuat: THREE.Quaternion,
      ): { curl: number; splay: number } => {
        let intoDist: number;
        let latDist: number;
        let worldY: number;
        let fwdX: number;
        let fwdY: number;
        let fwdZ: number;
        let upHintX = 0;
        const upHintY = 1;
        let upHintZ = 0;
        let curl: number;
        let splay: number;

        if (isHangPhase || armU < 0.24) {
          // BEAT 1 (REACH & WRAP LIP): wrist rests just above edge; curled fingers wrap OUTSIDE lip (intoDist = 0.015) so fingertips NEVER clip inside solid box!
          const t = isHangPhase ? 0 : THREE.MathUtils.smoothstep(armU, 0, 0.24);
          intoDist = THREE.MathUtils.lerp(0.015, 0.055, t);
          latDist = sideSign * THREE.MathUtils.lerp(0.21, 0.195, t) + hangSway;
          worldY = this.ledgeBoxTop + THREE.MathUtils.lerp(0.044, 0.042, t);
          const fwdBase = THREE.MathUtils.lerp(0.95, 0.90, t);
          const inSwing = -sideSign * (0.14 * t);
          fwdX = intoX * fwdBase + rightX * inSwing;
          fwdY = THREE.MathUtils.lerp(-0.18, -0.10, t);
          fwdZ = intoZ * fwdBase + rightZ * inSwing;
          curl = isHangPhase ? 0.92 : THREE.MathUtils.lerp(0.24, 0.92, t);
          splay = isHangPhase ? 0.34 : THREE.MathUtils.lerp(0.90, 0.32, t);
        } else if (armU < 0.52) {
          // BEAT 2 & 3 (LOAD & PULL ROW): uncurl onto ledge top as elbows drive down & chest rises above lip
          const t = THREE.MathUtils.smoothstep(armU, 0.24, 0.52);
          intoDist = THREE.MathUtils.lerp(0.055, 0.165, t);
          latDist = sideSign * THREE.MathUtils.lerp(0.195, 0.185, t);
          worldY = this.ledgeBoxTop + THREE.MathUtils.lerp(0.042, 0.044, t);
          const fwdBase = THREE.MathUtils.lerp(0.90, 0.96, t);
          const inSwing = -sideSign * THREE.MathUtils.lerp(0.14, 0.18, t);
          fwdX = intoX * fwdBase + rightX * inSwing;
          fwdY = THREE.MathUtils.lerp(-0.10, -0.14, t);
          fwdZ = intoZ * fwdBase + rightZ * inSwing;
          const openT = THREE.MathUtils.smoothstep(armU, 0.36, 0.52);
          curl = THREE.MathUtils.lerp(0.92, 0.05, openT);
          splay = THREE.MathUtils.lerp(0.32, 0.78, openT);
        } else {
          // BEAT 4 (FLAT PALM MANTLE & LOCKOUT PRESS -> PUSH-OFF):
          // Both palms sit FLUSH on top of ledge (worldY = ledgeBoxTop + 0.042, flat fingers curl=0.04) while elbows press down & lock out!
          const t = THREE.MathUtils.smoothstep(Math.min(armU, 0.82), 0.52, 0.82);
          intoDist = THREE.MathUtils.lerp(0.165, 0.255, t);
          latDist = sideSign * THREE.MathUtils.lerp(0.185, 0.215, t);
          worldY = this.ledgeBoxTop + 0.042;
          const fwdBase = THREE.MathUtils.lerp(0.96, 0.92, t);
          const inSwing = -sideSign * THREE.MathUtils.lerp(0.18, 0.08, t);
          fwdX = intoX * fwdBase + rightX * inSwing;
          // Angle fingers downward slightly against top surface as chest rises vertically over palms
          fwdY = THREE.MathUtils.lerp(-0.14, -0.32, t);
          fwdZ = intoZ * fwdBase + rightZ * inSwing;
          const subtleSup = sideSign * 0.14 * Math.sin(t * Math.PI);
          upHintX = rightX * subtleSup;
          upHintZ = rightZ * subtleSup;
          curl = 0.04;
          splay = 0.78;
        }

        _vecC.set(
          this.ledgeContactX + intoX * intoDist + rightX * latDist,
          worldY,
          this.ledgeContactZ + intoZ * intoDist + rightZ * latDist,
        );
        _vecD.set(fwdX, fwdY, fwdZ);
        _vecB.set(upHintX, upHintY, upHintZ);

        convertWorldHandToPivotLocal(
          _vecC,
          _vecD,
          _vecB,
          _matA,
          _quatC,
          outLocalPos,
          outLocalQuat,
        );
        return { curl, splay };
      };

      const uL = THREE.MathUtils.clamp((uClimb - 0.025) / 0.975, 0, 1);
      const uR = THREE.MathUtils.clamp(uClimb / 0.975, 0, 1);
      const lHand = solveWorldLedgeHand(uL, -1, _posLTarget, _quatLTarget);
      const rHand = solveWorldLedgeHand(uR, 1, _posRTarget, _quatRTarget);

      this.hands.setLedgeGrabPose({
        blend: this.ledgeBlend,
        phase: isHangPhase ? 'hang' : 'climb',
        climbProgress01: uClimb,
        surfaceDepthM: exactSurfaceDepthM,
        ledgeOffsetY: this.ledgeBoxTop - this.camera.position.y,
        elapsed: this.elapsed,
        dt,
        leftTargetPos: _posLTarget,
        leftTargetQuat: _quatLTarget,
        rightTargetPos: _posRTarget,
        rightTargetQuat: _quatRTarget,
        leftGripCurl: lHand.curl,
        rightGripCurl: rHand.curl,
        leftSplay: lHand.splay,
        rightSplay: rHand.splay,
      });
    } else if (
      parkourBlend > 0.01 &&
      (this.wallSide !== 0 || this.wallRunUpBlend > 0.01) &&
      !this.isReloading &&
      !this.pendingWeaponId &&
      !this.swordSwingActive &&
      !this.quickMeleeActive
    ) {
      this.hands.setWallParkourPose({
        blend: parkourBlend,
        mode:
          this.wallRunUpBlend > Math.max(this.wallRunBlend, this.wallSlideBlend)
            ? 'wallRunUp'
            : this.wallSlideBlend > this.wallRunBlend
              ? 'wallSlide'
              : 'wallRun',
        wallSide: this.wallSide,
        runProgress01: THREE.MathUtils.clamp(
          this.wallRunTimer / wr.maxDurationSec,
          0,
          1,
        ),
        slideSpeed01: THREE.MathUtils.clamp(
          Math.max(0, -this.verticalVel) / wr.slideTerminalSpeed,
          0,
          1,
        ),
        stridePhase: this.walkPhase,
        contactPulse: this.wallContactPulse,
        wallSurfaceDistM: this.wallSurfaceDistM,
        elapsed: this.elapsed,
        dt,
      });
    } else if (!busy && !this.isReloading && !this.pendingWeaponId) {
      // Smoothly return hands to rest pose after dismount
      this.hands.getLeftHandRestPose(this.leftHandRestPos, this.leftHandRestQuat);
      this.hands.leftHandGroup.position.lerp(this.leftHandRestPos, 1 - Math.exp(-14 * dt));
      this.hands.leftHandGroup.quaternion.slerp(this.leftHandRestQuat, 1 - Math.exp(-14 * dt));
      if (isUnarmed) {
        this.hands.getRightHandRestPose(_vecC, _quatB);
        this.hands.rightHandGroup.position.lerp(_vecC, 1 - Math.exp(-14 * dt));
        this.hands.rightHandGroup.quaternion.slerp(_quatB, 1 - Math.exp(-14 * dt));
      }
      this.hands.resetLeftElbowPose(dt);
      this.hands.resetRightElbowPose(dt);
    }

    // Sync dynamic flashlight SpotLight
    this.camera.updateMatrixWorld(true);
    const activeLens = isFlashlight
      ? this.plainFlashlight.lensAnchor
      : gunRig?.flashlightLens ?? null;
    if (
      this.flashlightOn &&
      activeLens &&
      !isSword &&
      !isUnarmed &&
      !this.quickMeleeActive
    ) {
      activeLens.getWorldPosition(_vecA);
      activeLens.getWorldQuaternion(_quatB);
      _vecB.set(0, 0, -1).applyQuaternion(_quatB).normalize();
      this.flashlightSpot.position.copy(_vecA);
      this.flashlightTarget.position.copy(_vecA).addScaledVector(_vecB, 8.0);
      this.flashlightTarget.updateMatrixWorld();
      this.flashlightSpot.intensity = isFlashlight ? 16.5 : 12.8;
      this.flashlightSpot.penumbra = isFlashlight ? 0.94 : 0.88;
      this.flashlightSpot.angle = isFlashlight
        ? THREE.MathUtils.lerp(0.78, 0.52, adsSmooth)
        : 0.66;
    } else {
      this.flashlightSpot.intensity = 0;
    }

    if (this.onStateChange) {
      this.stateEmitAccum += dt;
      if (this.stateEmitAccum >= 0.04) {
        this.stateEmitAccum = 0;
        this.onStateChange(this.getState());
      }
    }

    _eulerA.set(0, 0, 0);
  }

  public dispose() {
    this.disposed = true;
    this.unbindEvents();
    this.camera.remove(this.weaponPivot, this.vmKeyLight, this.vmRimLight);
    this.scene.remove(this.flashlightSpot, this.flashlightTarget, this.legs.root);
    this.flashlightCookie.dispose();
    this.pistol9mm.dispose();
    this.futuristicGun.dispose();
    this.rustSmg.dispose();
    this.retroSmg.dispose();
    this.rustShotgun.dispose();
    this.sword.dispose();
    this.plainFlashlight.dispose();
    this.hands.dispose();
    this.legs.dispose();
    this.soundListeners.clear();
    this.interactListeners.clear();
  }
}

export function createPlayerKit(options: PlayerKitOptions): PlayerKit {
  return new PlayerKit(options);
}
