// =========================================================================
// ENEMY WEAPONS — NPC weapon states on the MakeHuman GLB bodies (PORT)
// =========================================================================
// Ported 2026-11-28 from branch muse/weapons-lab-trace (where this work was
// written against the OLD procedural bodies and never wired into its own
// pedestrianSystem) onto the combined package's new GLB body system.
// humanCharacter.ts is untouched: everything here consumes the HumanRig
// interface as an additive layer, exactly as the trace designed it.
//
// Contents:
//  - EnemyWeaponState chain: holstered -> draw -> patrol(carry) -> aim ->
//    fire -> low_ready -> reload (holstered is the port's extension for the
//    undercover/sleuth class, per the weapons-on-bodies brief)
//  - Class table: guards/soldiers/gang/bandits -> service carbine,
//    mob enforcers -> full-auto carbine, heavy/brute -> pump shotgun,
//    sleuths/undercover -> holstered pistol (FPS-kit buildPistol)
//  - Per-class handling profiles (stance, cant, sway, recoil, blend rates)
//  - Black-finish enemy weapon visuals with the red charging LED + pooled
//    muzzle-flash light spill (enemy-only red; player guns keep their glow)
//  - 2-bone-IK weapon-hold pose layer: call applyWeaponHoldPose() right
//    after applyHumanPose() for any armed rig. No tracer lines anywhere.
// =========================================================================

import * as THREE from 'three';
import {
  createSharedWeaponMesh,
  getSharedWeaponSpec,
  type SharedWeaponId,
} from './sharedWeapon';
import { buildPistol, type PistolRig } from '../fps/pistol';
import type { HumanRig } from './humanCharacter';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Scratch vectors for the chest-space arm IK (module-local copies; the
// identically named vars inside humanCharacter.ts are not exported).
const _ikRel = new THREE.Vector3();
const _ikDir = new THREE.Vector3();
const _ikPole = new THREE.Vector3();
const _ikBendN = new THREE.Vector3();
const _ikElbowPos = new THREE.Vector3();
const _ikUpperDir = new THREE.Vector3();

export type EnemyWeaponState =
  | 'holstered'
  | 'patrol'
  | 'draw'
  | 'aim'
  | 'fire'
  | 'low_ready'
  | 'reload';

export type EnemyWeaponClass =
  | 'guard'
  | 'soldier'
  | 'enforcer'
  | 'gang'
  | 'bandit'
  | 'heavy'
  | 'brute'
  | 'sleuth';

/** Class-table weapon ids: the shared arsenal plus the kit pistol. */
export type EnemyWeaponId = SharedWeaponId | 'pistol';

/**
 * Single data-driven enemy class -> canonical weapon assignment table:
 * - guards / soldiers / gang / bandits -> Service Carbine
 * - mob enforcers -> Full-Auto Carbine
 * - heavy / brute classes -> Pump Shotgun
 * - sleuths / undercover -> Pistol (spawns holstered; the draw is the tell)
 */
export const ENEMY_CLASS_WEAPON_TABLE: Record<EnemyWeaponClass, EnemyWeaponId> = {
  guard: 'service_carbine',
  soldier: 'service_carbine',
  gang: 'service_carbine',
  bandit: 'service_carbine',
  enforcer: 'full_auto_carbine',
  heavy: 'pump_shotgun',
  brute: 'pump_shotgun',
  sleuth: 'pistol',
};

export function getEnemyWeaponIdForClass(
  enemyClass: EnemyWeaponClass = 'gang'
): EnemyWeaponId {
  return ENEMY_CLASS_WEAPON_TABLE[enemyClass] ?? 'service_carbine';
}

export interface EnemyWeaponClassProfile {
  kind: EnemyWeaponClass;
  /** Torso blading yaw into rifle stance (rad) */
  stanceYaw: number;
  /** Blend responsiveness for draw/aim/low-ready transitions (1/s) */
  blendRate: number;
  /** Organic sway & tremor amplitude multiplier */
  swayAmp: number;
  /** Weapon roll cant in aim/fire (rad, visual swagger vs disciplined vertical) */
  weaponCant: number;
  /** Recoil kick amplitude multiplier (visual only) */
  recoilAmp: number;
  /** Recoil exponential recovery rate (1/s) */
  recoilDamp: number;
  /** Low-ready muzzle dip pitch (rad) */
  lowReadyPitch: number;
  /** Upper-body forward combat lean (rad) */
  combatLean: number;
}

const ENEMY_WEAPON_CLASS_PROFILES: Record<EnemyWeaponClass, EnemyWeaponClassProfile> = {
  guard: {
    kind: 'guard',
    stanceYaw: 0.34,
    blendRate: 10.5,
    swayAmp: 0.26,
    weaponCant: -0.015,
    recoilAmp: 0.85,
    recoilDamp: 16.5,
    lowReadyPitch: 0.36,
    combatLean: 0.055,
  },
  soldier: {
    kind: 'soldier',
    stanceYaw: 0.38,
    blendRate: 11.5,
    swayAmp: 0.22,
    weaponCant: -0.01,
    recoilAmp: 0.82,
    recoilDamp: 17.5,
    lowReadyPitch: 0.34,
    combatLean: 0.068,
  },
  enforcer: {
    kind: 'enforcer',
    stanceYaw: 0.26,
    blendRate: 6.4,
    swayAmp: 0.42,
    weaponCant: -0.045,
    recoilAmp: 1.12,
    recoilDamp: 10.8,
    lowReadyPitch: 0.42,
    combatLean: 0.075,
  },
  gang: {
    kind: 'gang',
    stanceYaw: 0.30,
    blendRate: 8.6,
    swayAmp: 0.82,
    weaponCant: -0.105,
    recoilAmp: 1.08,
    recoilDamp: 12.2,
    lowReadyPitch: 0.44,
    combatLean: 0.048,
  },
  bandit: {
    kind: 'bandit',
    stanceYaw: 0.28,
    blendRate: 7.8,
    swayAmp: 0.95,
    weaponCant: -0.135,
    recoilAmp: 1.15,
    recoilDamp: 11.4,
    lowReadyPitch: 0.48,
    combatLean: 0.042,
  },
  heavy: {
    kind: 'heavy',
    stanceYaw: 0.24,
    blendRate: 6.0,
    swayAmp: 0.34,
    weaponCant: -0.03,
    recoilAmp: 1.38,
    recoilDamp: 9.2,
    lowReadyPitch: 0.38,
    combatLean: 0.088,
  },
  brute: {
    kind: 'brute',
    stanceYaw: 0.22,
    blendRate: 5.6,
    swayAmp: 0.48,
    weaponCant: -0.055,
    recoilAmp: 1.46,
    recoilDamp: 8.6,
    lowReadyPitch: 0.40,
    combatLean: 0.095,
  },
  // Port addition for the undercover class: civilian stillness (lowest sway
  // of any class), then the fastest blend in the table — the snap from
  // bystander to perfect stance IS the tell.
  sleuth: {
    kind: 'sleuth',
    stanceYaw: 0.18,
    blendRate: 13.5,
    swayAmp: 0.12,
    weaponCant: 0.0,
    recoilAmp: 0.7,
    recoilDamp: 18.0,
    lowReadyPitch: 0.30,
    combatLean: 0.03,
  },
};

export function getEnemyWeaponClassProfile(
  enemyClass: EnemyWeaponClass = 'gang'
): EnemyWeaponClassProfile {
  return ENEMY_WEAPON_CLASS_PROFILES[enemyClass] ?? ENEMY_WEAPON_CLASS_PROFILES.gang;
}

// Cached procedural textures & geometries for enemy carbines (allocated ONCE, zero GC!)
let _npcBlackMaterials: {
  gunMetal: THREE.MeshStandardMaterial;
  polymer: THREE.MeshStandardMaterial;
  steel: THREE.MeshStandardMaterial;
} | null = null;

let _ledGlowTex: THREE.CanvasTexture | null = null;
let _flashFinTex: THREE.CanvasTexture | null = null;
let _flashHaloTex: THREE.CanvasTexture | null = null;
let _ledHousingGeo: THREE.BoxGeometry | null = null;
let _ledDiodeGeo: THREE.SphereGeometry | null = null;
let _flashFinGeo: THREE.PlaneGeometry | null = null;
let _flashConeGeo: THREE.ConeGeometry | null = null;

function getRedLedGlowTexture(): THREE.CanvasTexture {
  if (_ledGlowTex) return _ledGlowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0.0, 'rgba(255, 235, 235, 1.0)');
  g.addColorStop(0.16, 'rgba(255, 64, 48, 0.96)');
  g.addColorStop(0.42, 'rgba(235, 16, 16, 0.62)');
  g.addColorStop(0.72, 'rgba(175, 0, 8, 0.20)');
  g.addColorStop(1.0, 'rgba(120, 0, 0, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _ledGlowTex = tex;
  return tex;
}

function getMuzzleFlashFinTexture(): THREE.CanvasTexture {
  if (_flashFinTex) return _flashFinTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  // Forward-jetting hot muzzle flame plume (base at bottom y=124 -> tip at top y=4)
  const coreG = ctx.createRadialGradient(64, 102, 2, 64, 66, 60);
  coreG.addColorStop(0.0, 'rgba(255, 255, 245, 1.0)');
  coreG.addColorStop(0.24, 'rgba(255, 232, 130, 0.98)');
  coreG.addColorStop(0.55, 'rgba(255, 138, 28, 0.72)');
  coreG.addColorStop(0.84, 'rgba(220, 48, 6, 0.22)');
  coreG.addColorStop(1.0, 'rgba(160, 16, 0, 0.0)');

  ctx.fillStyle = coreG;
  ctx.beginPath();
  ctx.moveTo(64, 4);
  ctx.quadraticCurveTo(84, 48, 104, 86);
  ctx.quadraticCurveTo(84, 96, 94, 114);
  ctx.quadraticCurveTo(72, 122, 64, 124);
  ctx.quadraticCurveTo(56, 122, 34, 114);
  ctx.quadraticCurveTo(44, 96, 24, 86);
  ctx.quadraticCurveTo(44, 48, 64, 4);
  ctx.closePath();
  ctx.fill();

  // Blinding white-yellow inner hot jet
  const hotG = ctx.createRadialGradient(64, 98, 2, 64, 86, 30);
  hotG.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  hotG.addColorStop(0.55, 'rgba(255, 245, 196, 0.85)');
  hotG.addColorStop(1.0, 'rgba(255, 200, 90, 0.0)');
  ctx.fillStyle = hotG;
  ctx.beginPath();
  ctx.ellipse(64, 88, 16, 34, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _flashFinTex = tex;
  return tex;
}

function getMuzzleFlashHaloTexture(): THREE.CanvasTexture {
  if (_flashHaloTex) return _flashHaloTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  // Star-spiked radial flash so it reads cleanly even head-on in bright daylight
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  g.addColorStop(0.0, 'rgba(255, 255, 244, 1.0)');
  g.addColorStop(0.22, 'rgba(255, 232, 138, 0.96)');
  g.addColorStop(0.48, 'rgba(255, 146, 34, 0.65)');
  g.addColorStop(0.76, 'rgba(230, 62, 10, 0.22)');
  g.addColorStop(1.0, 'rgba(180, 20, 0, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  // Crisp 6-point muzzle brake gas spikes
  ctx.save();
  ctx.translate(64, 64);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    const sg = ctx.createLinearGradient(0, 0, 0, -58);
    sg.addColorStop(0, 'rgba(255, 252, 224, 0.95)');
    sg.addColorStop(0.45, 'rgba(255, 178, 56, 0.55)');
    sg.addColorStop(1, 'rgba(255, 80, 0, 0.0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(7, -8);
    ctx.lineTo(-7, -8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _flashHaloTex = tex;
  return tex;
}

/**
 * Pooled non-shadow PointLight manager for brief enemy muzzle flash light spill
 * illuminating the shooter's hands, weapon, torso, and nearby walls/ground at 60 fps.
 */
export class MuzzleFlashLightPool {
  public readonly root = new THREE.Group();
  private readonly lights: THREE.PointLight[] = [];
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly peakIntensity: Float32Array;
  private cursor = 0;

  constructor(poolSize = 4) {
    this.root.name = 'EnemyMuzzleFlashLightPool';
    this.life = new Float32Array(poolSize);
    this.maxLife = new Float32Array(poolSize);
    this.peakIntensity = new Float32Array(poolSize);

    for (let i = 0; i < poolSize; i++) {
      const pt = new THREE.PointLight(0xffb44c, 0, 7.5, 2.0);
      pt.castShadow = false;
      pt.visible = false;
      this.root.add(pt);
      this.lights.push(pt);
    }
  }

  public trigger(
    worldPos: THREE.Vector3,
    intensity = 8.2,
    duration = 0.072
  ): void {
    // Reuse an expired slot first; otherwise steal round-robin
    let idx = -1;
    for (let i = 0; i < this.lights.length; i++) {
      if (this.life[i] <= 0) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.lights.length;
    }
    const lt = this.lights[idx];
    lt.position.copy(worldPos);
    lt.intensity = intensity;
    lt.visible = true;
    this.life[idx] = duration;
    this.maxLife[idx] = duration;
    this.peakIntensity[idx] = intensity;
  }

  public update(dt: number): void {
    for (let i = 0; i < this.lights.length; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.life[i] = 0;
        this.lights[i].intensity = 0;
        this.lights[i].visible = false;
      } else {
        const frac = this.life[i] / Math.max(0.001, this.maxLife[i]);
        // Fast bright spike with warm falloff onto hands & nearby geometry
        this.lights[i].intensity = this.peakIntensity[i] * frac * frac;
      }
    }
  }

  public dispose(): void {
    for (let i = 0; i < this.lights.length; i++) {
      this.root.remove(this.lights[i]);
      this.lights[i].dispose();
    }
    this.lights.length = 0;
  }
}

export interface EnemyCarbineVisual {
  weaponId: SharedWeaponId;
  root: THREE.Group;
  muzzleAnchor: THREE.Object3D;
  muzzleLocalPos: THREE.Vector3;
  magazineMesh: THREE.Mesh | null;
  magazineRestPos: THREE.Vector3;
  magazineRestRot: THREE.Euler;
  pumpForend: THREE.Object3D | null;
  pumpForendRestZ: number;
  pumpTimer: number;
  pumpCycleSec: number;
  pumpStroke: number;
  ledMesh: THREE.Mesh;
  ledMat: THREE.MeshStandardMaterial;
  ledGlowSprite: THREE.Sprite;
  ledGlowMat: THREE.SpriteMaterial;
  flashGroup: THREE.Group;
  flashFinMat: THREE.MeshBasicMaterial;
  flashHaloMat: THREE.SpriteMaterial;
  flashCoreMat: THREE.SpriteMaterial;
  flashTimer: number;
  flashDuration: number;
  flashJustTriggered: boolean;
  ledIntensity: number;
  ledFirePulse: number;
}

const _ledOffColor = new THREE.Color('#190406');
const _ledKindleColor = new THREE.Color('#7f0a0e');
const _ledFullColor = new THREE.Color('#ff2218');
const _ledEmissiveColor = new THREE.Color('#ff1410');
const _flashWorldScratch = new THREE.Vector3();

/**
 * Builds an NPC enemy weapon strictly from createSharedWeaponMesh(scale, weaponId)
 * (Variation Law: same canonical mesh & stats as the player's arsenal),
 * cloning the shared materials to matte tactical black (player gun materials untouched),
 * attaching the detection-driven red LED + glow halo sprite, and mounting a daylight/night
 * multi-layer muzzle flash at the true MuzzleAnchor.
 */
export function createEnemyCarbineVisual(
  scale = 0.95,
  weaponId: SharedWeaponId = 'service_carbine'
): EnemyCarbineVisual {
  const spec = getSharedWeaponSpec(weaponId);
  const root = createSharedWeaponMesh(scale, weaponId);
  root.name =
    weaponId === 'full_auto_carbine'
      ? 'EnemyBlackFullAutoCarbine'
      : weaponId === 'pump_shotgun'
      ? 'EnemyBlackPumpShotgun'
      : 'EnemyBlackServiceCarbine';
  root.userData.isWeapon = true;
  root.userData.weaponId = weaponId;

  // Clone the shared materials ONCE for black NPC finish — never mutate sharedWeapon.ts materials!
  if (!_npcBlackMaterials) {
    let baseGun: THREE.MeshStandardMaterial | null = null;
    let basePoly: THREE.MeshStandardMaterial | null = null;
    let baseSteel: THREE.MeshStandardMaterial | null = null;
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh || !(m.material instanceof THREE.MeshStandardMaterial)) return;
      const mat = m.material;
      if (mat.metalness > 0.82 && !baseSteel) baseSteel = mat;
      else if (mat.metalness > 0.5 && !baseGun) baseGun = mat;
      else if (!basePoly) basePoly = mat;
    });
    const gunMetal = (baseGun ?? new THREE.MeshStandardMaterial()).clone();
    gunMetal.color.set('#0b0d11');
    gunMetal.roughness = 0.44;
    gunMetal.metalness = 0.72;

    const polymer = (basePoly ?? new THREE.MeshStandardMaterial()).clone();
    polymer.color.set('#07080b');
    polymer.roughness = 0.76;
    polymer.metalness = 0.14;

    const steel = (baseSteel ?? new THREE.MeshStandardMaterial()).clone();
    steel.color.set('#141820');
    steel.roughness = 0.34;
    steel.metalness = 0.84;

    _npcBlackMaterials = { gunMetal, polymer, steel };
  }

  let magazineMesh: THREE.Mesh | null = null;
  const magazineRestPos = new THREE.Vector3(0, -0.062, 0.105);
  const magazineRestRot = new THREE.Euler(-0.14, 0, 0);

  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const orig = m.material as THREE.MeshStandardMaterial;
    if (orig && orig.isMeshStandardMaterial) {
      if (orig.metalness > 0.82) m.material = _npcBlackMaterials!.steel;
      else if (orig.metalness > 0.5) m.material = _npcBlackMaterials!.gunMetal;
      else m.material = _npcBlackMaterials!.polymer;
    }
    if (
      !magazineMesh &&
      (m.name === 'MagazineMesh' || (weaponId !== 'pump_shotgun' && m.position.y < -0.05 && m.position.z > 0.05))
    ) {
      magazineMesh = m;
      magazineRestPos.copy(m.position);
      magazineRestRot.copy(m.rotation);
    }
  });

  const pumpForend = root.getObjectByName('PumpForend') ?? null;
  const pumpForendRestZ = pumpForend ? pumpForend.position.z : 0.31;

  // Ensure true MuzzleAnchor node exists
  let muzzleAnchor = root.getObjectByName('MuzzleAnchor');
  if (!muzzleAnchor) {
    muzzleAnchor = new THREE.Object3D();
    muzzleAnchor.name = 'MuzzleAnchor';
    muzzleAnchor.position.set(0, 0.042, 0.625);
    root.add(muzzleAnchor);
  }
  const muzzleLocalPos = muzzleAnchor.position.clone();

  // --- RED LED WARM-UP INDICATOR (sight/light housing on the gun + glow sprite) ---
  if (!_ledHousingGeo) {
    _ledHousingGeo = new THREE.BoxGeometry(0.032, 0.018, 0.036);
    _ledDiodeGeo = new THREE.SphereGeometry(0.0135, 10, 8);
  }
  const ledY = weaponId === 'pump_shotgun' ? 0.095 : 0.098;
  const ledHousing = new THREE.Mesh(_ledHousingGeo, _npcBlackMaterials.polymer);
  ledHousing.name = 'EnemyWeaponLedHousing';
  ledHousing.position.set(0, ledY, 0.042);
  root.add(ledHousing);

  // Per-instance LED material so each enemy's detection/aim ramp glows independently!
  const ledMat = new THREE.MeshStandardMaterial({
    color: _ledOffColor.clone(),
    emissive: _ledEmissiveColor.clone(),
    emissiveIntensity: 0.0,
    roughness: 0.18,
    metalness: 0.12,
    toneMapped: false,
  });
  const ledMesh = new THREE.Mesh(_ledDiodeGeo!, ledMat);
  ledMesh.name = 'EnemyWeaponRedLed';
  ledMesh.scale.set(1.15, 0.92, 1.35);
  ledMesh.position.set(0, ledY + 0.008, 0.054);
  root.add(ledMesh);

  const ledGlowMat = new THREE.SpriteMaterial({
    map: getRedLedGlowTexture(),
    color: '#ff241a',
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const ledGlowSprite = new THREE.Sprite(ledGlowMat);
  ledGlowSprite.name = 'EnemyWeaponLedGlow';
  ledGlowSprite.position.set(0, ledY + 0.010, 0.060);
  ledGlowSprite.scale.set(0.08, 0.08, 1);
  ledGlowSprite.visible = false;
  ledGlowSprite.renderOrder = 6;
  root.add(ledGlowSprite);

  // --- TRUE MUZZLE FLASH ASSEMBLY (daylight + night visible, per-round randomized) ---
  if (!_flashFinGeo) {
    _flashFinGeo = new THREE.PlaneGeometry(0.24, 0.34);
    _flashFinGeo.translate(0, 0.15, 0);
    _flashConeGeo = new THREE.ConeGeometry(0.072, 0.28, 6, 1, true);
    _flashConeGeo.rotateX(Math.PI * 0.5);
    _flashConeGeo.translate(0, 0, 0.14);
  }

  const flashGroup = new THREE.Group();
  flashGroup.name = 'EnemyMuzzleFlash';
  flashGroup.visible = false;
  muzzleAnchor.add(flashGroup);

  const flashFinMat = new THREE.MeshBasicMaterial({
    map: getMuzzleFlashFinTexture(),
    color: '#fff2cc',
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  // 3 crossed star-burst flame planes oriented along +Z barrel axis
  for (let k = 0; k < 3; k++) {
    const fin = new THREE.Mesh(_flashFinGeo, flashFinMat);
    fin.rotation.x = Math.PI * 0.5;
    fin.rotation.y = (k * Math.PI) / 3;
    fin.renderOrder = 7;
    flashGroup.add(fin);
  }

  // Forward gas-jet cone so flash reads unmistakably from side profiles too
  const cone = new THREE.Mesh(_flashConeGeo!, flashFinMat);
  cone.renderOrder = 7;
  flashGroup.add(cone);

  // Bright daylight-punch opaque-core + additive star-halo sprite at the muzzle brake
  const flashCoreMat = new THREE.SpriteMaterial({
    map: getMuzzleFlashHaloTexture(),
    color: '#fff9dc',
    transparent: true,
    opacity: 0.95,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const flashCore = new THREE.Sprite(flashCoreMat);
  flashCore.position.set(0, 0, 0.03);
  flashCore.scale.set(0.22, 0.22, 1);
  flashCore.renderOrder = 7;
  flashGroup.add(flashCore);

  const flashHaloMat = new THREE.SpriteMaterial({
    map: getMuzzleFlashHaloTexture(),
    color: '#ffaa28',
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const flashHalo = new THREE.Sprite(flashHaloMat);
  flashHalo.position.set(0, 0, 0.045);
  flashHalo.scale.set(0.42, 0.42, 1);
  flashHalo.renderOrder = 8;
  flashGroup.add(flashHalo);

  return {
    weaponId,
    root,
    muzzleAnchor,
    muzzleLocalPos,
    magazineMesh,
    magazineRestPos,
    magazineRestRot,
    pumpForend,
    pumpForendRestZ,
    pumpTimer: 0,
    pumpCycleSec: spec.pumpCycleSec,
    pumpStroke: 0,
    ledMesh,
    ledMat,
    ledGlowSprite,
    ledGlowMat,
    flashGroup,
    flashFinMat,
    flashHaloMat,
    flashCoreMat,
    flashTimer: 0,
    flashDuration: 0.068,
    flashJustTriggered: false,
    ledIntensity: 0,
    ledFirePulse: 0,
  };
}

/**
 * Evaluates normalized pump-shotgun forend stroke (0 = locked forward, 1 = pulled rearward)
 * across the 0.9 Hz shot cycle.
 */
export function evaluatePumpShotgunCycle(cycleU: number): number {
  if (cycleU <= 0.16 || cycleU >= 0.78) return 0;
  const p = (cycleU - 0.16) / 0.62;
  return Math.sin(p * Math.PI);
}

/**
 * Sets the sliding shotgun pump forend stroke directly (0 = forward, 1 = pulled back).
 */
export function setEnemyWeaponPumpStroke(visual: EnemyCarbineVisual, stroke01: number): void {
  const s = THREE.MathUtils.clamp(stroke01, 0, 1);
  visual.pumpStroke = s;
  if (visual.pumpForend) {
    visual.pumpForend.position.z = visual.pumpForendRestZ - s * 0.098;
  }
}

/**
 * Triggers a vivid per-round muzzle flash at the weapon's true MuzzleAnchor
 * plus a brief pooled PointLight spill onto the shooter's hands and nearby surfaces.
 * Also kicks off the coupled pump-forend cycle on pump_shotgun.
 */
export function triggerEnemyCarbineFlash(
  visual: EnemyCarbineVisual,
  lightPool?: MuzzleFlashLightPool,
  muzzleWorldOverride?: THREE.Vector3
): void {
  const isShotgun = visual.weaponId === 'pump_shotgun';
  const isFullAuto = visual.weaponId === 'full_auto_carbine';
  visual.flashDuration = isShotgun
    ? 0.082 + Math.random() * 0.016
    : isFullAuto
    ? 0.052 + Math.random() * 0.012
    : 0.062 + Math.random() * 0.014;
  visual.flashTimer = visual.flashDuration;
  visual.flashJustTriggered = true;
  visual.flashGroup.visible = true;
  visual.flashGroup.rotation.z = Math.random() * Math.PI * 2;
  const baseScale = isShotgun ? 1.28 : isFullAuto ? 0.92 : 1.0;
  const s = baseScale * (0.88 + Math.random() * 0.42);
  visual.flashGroup.scale.set(s, s, s * (0.92 + Math.random() * 0.35));
  visual.flashFinMat.opacity = 1.0;
  visual.flashCoreMat.opacity = 0.96;
  visual.flashHaloMat.opacity = 0.96;
  visual.ledFirePulse = 1.0;

  if (isShotgun && visual.pumpCycleSec > 0) {
    visual.pumpTimer = visual.pumpCycleSec;
  }

  if (lightPool) {
    if (muzzleWorldOverride) {
      _flashWorldScratch.copy(muzzleWorldOverride);
    } else {
      visual.root.updateMatrixWorld(true);
      visual.muzzleAnchor.getWorldPosition(_flashWorldScratch);
    }
    lightPool.trigger(_flashWorldScratch, isShotgun ? 11.2 : 8.6, isShotgun ? 0.095 : 0.075);
  }
}

/**
 * Animates the magazine mesh offset during reload (mag out -> mag in -> seated).
 */
export function setEnemyCarbineMagOffset(
  visual: EnemyCarbineVisual,
  ox: number,
  oy: number,
  oz: number,
  rotX = 0,
  rotZ = 0
): void {
  if (!visual.magazineMesh) return;
  visual.magazineMesh.position.set(
    visual.magazineRestPos.x + ox,
    visual.magazineRestPos.y + oy,
    visual.magazineRestPos.z + oz
  );
  visual.magazineMesh.rotation.set(
    visual.magazineRestRot.x + rotX,
    visual.magazineRestRot.y,
    visual.magazineRestRot.z + rotZ
  );
}

/**
 * Updates enemy weapon red LED power-up readout (0=dark patrol .. 1=full fire lock),
 * decays active muzzle flash cleanly, and advances coupled pump-shotgun forend cycle.
 * Zero per-frame allocations.
 */
export function updateEnemyCarbineVisual(
  visual: EnemyCarbineVisual,
  dt: number,
  elapsed: number,
  ledTarget: number,
  phase = 0
): void {
  const clampedTarget = THREE.MathUtils.clamp(ledTarget, 0, 1.2);
  // Power up crisply on detection/aim, decay organically on low-ready / lost LOS
  const rampRate = clampedTarget > visual.ledIntensity ? 7.5 : 3.4;
  visual.ledIntensity = THREE.MathUtils.damp(visual.ledIntensity, clampedTarget, rampRate, dt);
  visual.ledFirePulse = THREE.MathUtils.damp(visual.ledFirePulse, 0, 14.0, dt);

  const level = Math.min(1.25, visual.ledIntensity + visual.ledFirePulse * 0.35);

  if (level <= 0.015) {
    visual.ledMat.color.copy(_ledOffColor);
    visual.ledMat.emissiveIntensity = 0.0;
    visual.ledGlowSprite.visible = false;
  } else {
    // Smooth perceptual curve: faint crimson kindling -> bright warning red -> blazing fire lock
    const norm = Math.min(1, level);
    if (norm < 0.45) {
      visual.ledMat.color.copy(_ledOffColor).lerp(_ledKindleColor, norm / 0.45);
    } else {
      visual.ledMat.color.copy(_ledKindleColor).lerp(_ledFullColor, (norm - 0.45) / 0.55);
    }
    const microFlicker =
      norm > 0.65 ? 1.0 + Math.sin(elapsed * 22.0 + phase * 3.1) * 0.07 : 1.0;
    // Emissive ramps 0 -> ~0.9 (kindling) -> ~3.4 (aim) -> ~7.2 (fire) so it reads day & night!
    visual.ledMat.emissiveIntensity =
      (0.35 + Math.pow(level, 1.45) * 5.8) * microFlicker;

    visual.ledGlowSprite.visible = level > 0.05;
    const haloScale = (0.065 + Math.pow(norm, 1.15) * 0.26 + visual.ledFirePulse * 0.11) * microFlicker;
    visual.ledGlowSprite.scale.set(haloScale, haloScale, 1);
    visual.ledGlowMat.opacity = THREE.MathUtils.clamp(
      (0.14 + Math.pow(norm, 1.1) * 0.84) * microFlicker,
      0,
      1
    );
  }

  // Advance coupled pump-shotgun cycle if active
  if (visual.pumpForend) {
    if (visual.pumpTimer > 0 && visual.pumpCycleSec > 0) {
      visual.pumpTimer = Math.max(0, visual.pumpTimer - dt);
      const cycleU = 1.0 - visual.pumpTimer / visual.pumpCycleSec;
      setEnemyWeaponPumpStroke(visual, evaluatePumpShotgunCycle(cycleU));
    } else if (visual.pumpStroke > 0.001) {
      setEnemyWeaponPumpStroke(visual, THREE.MathUtils.damp(visual.pumpStroke, 0, 18.0, dt));
    }
  }

  // Decay active muzzle flash smoothly (guarantee full peak flash on its trigger frame)
  if (visual.flashJustTriggered) {
    visual.flashJustTriggered = false;
  } else if (visual.flashTimer > 0) {
    visual.flashTimer -= dt;
    if (visual.flashTimer <= 0) {
      visual.flashTimer = 0;
      visual.flashGroup.visible = false;
    } else {
      const f = visual.flashTimer / Math.max(0.001, visual.flashDuration);
      visual.flashFinMat.opacity = Math.min(1, f * 1.45);
      visual.flashCoreMat.opacity = Math.min(1, f * 1.35);
      visual.flashHaloMat.opacity = f;
      const shrink = 0.65 + f * 0.45;
      visual.flashGroup.scale.multiplyScalar(Math.pow(shrink, dt * 12));
    }
  }
}

export function disposeEnemyCarbineVisual(visual: EnemyCarbineVisual): void {
  visual.ledMat.dispose();
  visual.ledGlowMat.dispose();
  visual.flashFinMat.dispose();
  visual.flashHaloMat.dispose();
  visual.flashCoreMat.dispose();
}
// =========================================================================
// ADDITIVE WEAPON-HOLD POSE LAYER FOR HumanRig (FROZEN RIG COMPATIBLE!)
// =========================================================================

export interface NpcWeaponRig {
  visual: EnemyCarbineVisual;
  weaponId: SharedWeaponId;
  gripPivot: THREE.Group;
  enemyClass: EnemyWeaponClass;
  profile: EnemyWeaponClassProfile;
  state: EnemyWeaponState;
  drawWeight: number;
  aimWeight: number;
  lowReadyWeight: number;
  twoHandWeight: number;
  reloadWeight: number;
  recoilKick: number;
  ammoInMag: number;
  reloadTimer: number;
  lastShotElapsed: number;
}

export interface WeaponHoldPoseParams {
  dt: number;
  elapsed: number;
  phase: number;
  state: EnemyWeaponState;
  /** 0..1 detection / aim ramp (same fill driving "?" suspicion over enemies) */
  detectionRamp: number;
  /** Relative horizontal aim yaw in rig.root local space (rad, 0 = straight ahead) */
  aimYawOffset?: number;
  /** Vertical aim pitch toward target (rad, +up / -down) */
  aimPitch?: number;
  /** Normalized locomotion speed (0 = standing, 0.5 = walking, 1.0 = running) */
  moveSpeedNorm?: number;
  /** 0..1 normalized reload progress (if driven externally); otherwise uses weaponRig.reloadTimer */
  reloadProgress?: number;
  /** Set true on the frame a shot fires to trigger recoil impulse + muzzle flash + light spill */
  firedThisFrame?: boolean;
  /** Optional pooled PointLight manager for brief muzzle flash light spill */
  lightPool?: MuzzleFlashLightPool;
}

/**
 * Parents the class-assigned black enemy weapon (from ENEMY_CLASS_WEAPON_TABLE)
 * to rig.rightHandGrp without modifying HumanRig or createRiggedHuman.
 */
export function attachWeaponToHumanRig(
  rig: HumanRig,
  enemyClass: EnemyWeaponClass = 'gang',
  scale = 0.95,
  weaponIdOverride?: SharedWeaponId
): NpcWeaponRig {
  // The carbine attach serves the shared arsenal only; the 'pistol' class
  // uses attachPistolToHumanRig below. A pistol-class call here falls back
  // to the service carbine rather than building an invalid visual.
  const resolvedId = weaponIdOverride ?? getEnemyWeaponIdForClass(enemyClass);
  const weaponId: SharedWeaponId = resolvedId === 'pistol' ? 'service_carbine' : resolvedId;
  const spec = getSharedWeaponSpec(weaponId);

  const gripPivot = new THREE.Group();
  gripPivot.name = 'NpcWeaponGripPivot';
  // Seat pistol grip (0, -0.038, -0.016) directly inside the curled right palm
  gripPivot.position.set(0.0, -0.058, 0.016);
  rig.rightHandGrp.add(gripPivot);

  const visual = createEnemyCarbineVisual(scale, weaponId);
  gripPivot.add(visual.root);

  // Hide civilian hand props if this rigged human is armed
  if (rig.newspaperProp) rig.newspaperProp.visible = false;
  if (rig.phoneProp) rig.phoneProp.visible = false;
  if (rig.cigaretteProp) rig.cigaretteProp.visible = false;

  return {
    visual,
    weaponId,
    gripPivot,
    enemyClass,
    profile: getEnemyWeaponClassProfile(enemyClass),
    state: 'patrol',
    drawWeight: 0,
    aimWeight: 0,
    lowReadyWeight: 0,
    twoHandWeight: 0,
    reloadWeight: 0,
    recoilKick: 0,
    ammoInMag: spec.magazineSize,
    reloadTimer: 0,
    lastShotElapsed: -99,
  };
}

// Zero-GC scratch objects for additive weapon-hold pose & 2-bone IK
const _wpBaseRShQ = new THREE.Quaternion();
const _wpBaseRElQ = new THREE.Quaternion();
const _wpBaseRHdQ = new THREE.Quaternion();
const _wpSolveShQ = new THREE.Quaternion();
const _wpSolveElQ = new THREE.Quaternion();
const _wpSolveHdQ = new THREE.Quaternion();
const _wpGunChestQ = new THREE.Quaternion();
const _wpGunChestE = new THREE.Euler(0, 0, 0, 'YXZ');
const _wpGripChestPos = new THREE.Vector3();
const _wpTargetWrist = new THREE.Vector3();
const _wpSuppTarget = new THREE.Vector3();
const _wpAxisX = new THREE.Vector3();
const _wpAxisY = new THREE.Vector3();
const _wpAxisZ = new THREE.Vector3();
const _wpMat4 = new THREE.Matrix4();
const _wpTmpV = new THREE.Vector3();
const _wpElbInChestInvQ = new THREE.Quaternion();
const _wpHandLocalOffset = new THREE.Vector3(0, -0.058, 0.016);

/**
 * Solves 2-bone analytical arm IK in chest local space for either arm (-1 left, +1 right),
 * blending smoothly by `weight` over the base pose already written by applyHumanPose().
 */
function solveChestArmIKBlended(
  shoulder: THREE.Bone,
  elbow: THREE.Bone,
  handGrp: THREE.Group,
  sideSign: -1 | 1,
  wristTargetChest: THREE.Vector3,
  desiredHandInChestQ: THREE.Quaternion | null,
  poleChest: THREE.Vector3,
  weight: number
): void {
  if (weight <= 0.002) return;

  _wpBaseRShQ.setFromEuler(shoulder.rotation);
  _wpBaseRElQ.setFromEuler(elbow.rotation);
  _wpBaseRHdQ.setFromEuler(handGrp.rotation);

  const L1 = 0.275;
  const L2 = 0.252;
  _ikRel.copy(wristTargetChest).sub(shoulder.position);
  const rawDist = _ikRel.length();
  const minDist = Math.abs(L1 - L2) + 0.04;
  const maxDist = L1 + L2 - 0.008;
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

  _ikPole.copy(poleChest).normalize();
  _ikBendN.copy(_ikPole).addScaledVector(_ikDir, -_ikPole.dot(_ikDir));
  if (_ikBendN.lengthSq() < 1e-5) {
    _ikBendN.set(sideSign, -0.4, -0.3).normalize();
  } else {
    _ikBendN.normalize();
  }

  _ikElbowPos
    .copy(_ikDir)
    .multiplyScalar(L1 * cosA)
    .addScaledVector(_ikBendN, L1 * sinA);
  _ikUpperDir.copy(_ikElbowPos).normalize();

  _wpAxisY.copy(_ikUpperDir).negate();
  _wpAxisZ.copy(_ikDir).multiplyScalar(dist).sub(_ikElbowPos);
  _wpAxisZ.addScaledVector(_wpAxisY, -_wpAxisZ.dot(_wpAxisY));
  if (_wpAxisZ.lengthSq() < 1e-6) {
    _wpAxisZ.set(0, 0, 1);
  } else {
    _wpAxisZ.normalize();
  }
  _wpAxisX.crossVectors(_wpAxisY, _wpAxisZ).normalize();
  _wpAxisZ.crossVectors(_wpAxisX, _wpAxisY).normalize();

  _wpMat4.makeBasis(_wpAxisX, _wpAxisY, _wpAxisZ);
  _wpSolveShQ.setFromRotationMatrix(_wpMat4);
  _wpSolveElQ.setFromAxisAngle(_wpTmpV.set(1, 0, 0), -elbowBend);

  if (desiredHandInChestQ) {
    _wpElbInChestInvQ.copy(_wpSolveShQ).multiply(_wpSolveElQ).invert();
    _wpSolveHdQ.copy(desiredHandInChestQ).premultiply(_wpElbInChestInvQ);
  } else {
    _wpSolveHdQ.set(0, 0, 0, 1);
  }

  if (weight >= 0.998) {
    shoulder.rotation.setFromQuaternion(_wpSolveShQ, 'XYZ');
    elbow.rotation.set(-elbowBend, 0, 0);
    if (desiredHandInChestQ) {
      handGrp.rotation.setFromQuaternion(_wpSolveHdQ, 'XYZ');
    }
  } else {
    _wpBaseRShQ.slerp(_wpSolveShQ, weight);
    _wpBaseRElQ.slerp(_wpSolveElQ, weight);
    shoulder.rotation.setFromQuaternion(_wpBaseRShQ, 'XYZ');
    elbow.rotation.setFromQuaternion(_wpBaseRElQ, 'XYZ');
    if (desiredHandInChestQ) {
      _wpBaseRHdQ.slerp(_wpSolveHdQ, weight);
      handGrp.rotation.setFromQuaternion(_wpBaseRHdQ, 'XYZ');
    }
  }
}

/**
 * Evaluates weapon-specific reload trajectory in weapon-local space (duration = spec.reloadSec):
 * - Carbines (1.75s / 2.1s): tilt -> mag out -> mag in/tap -> rack charging handle -> handguard
 * - Pump Shotgun (3.2s): tilt -> 3 shell-load belt-to-loading-port strokes -> final pump rack
 */
export function evaluateReloadChoreography(
  u: number,
  outHandLocal: THREE.Vector3,
  outMagOffset: THREE.Vector3,
  outTilt: { roll: number; pitch: number; yaw: number; impulse: number; pumpStroke?: number },
  weaponId: SharedWeaponId = 'service_carbine'
): void {
  const t = THREE.MathUtils.clamp(u, 0, 1);
  const env = Math.sin(t * Math.PI);
  outTilt.roll = 0.54 * env; // tilt weapon ~31 deg inward so ejection port & loading port face support hand
  outTilt.pitch = -0.26 * env;
  outTilt.yaw = 0.24 * env;
  outTilt.impulse = 0;
  outTilt.pumpStroke = 0;
  outMagOffset.set(0, 0, 0);

  if (weaponId === 'pump_shotgun') {
    // Shotgun tube-feed reload: tilt underside toward support hand, feed shells into receiver port, then pump!
    outTilt.roll = 0.72 * env;
    if (t < 0.14) {
      const p = smoothstep(0.0, 0.14, t);
      outHandLocal.set(
        THREE.MathUtils.lerp(0.0, -0.08, p),
        THREE.MathUtils.lerp(0.0, -0.24, p),
        THREE.MathUtils.lerp(0.31, 0.04, p)
      );
    } else if (t < 0.76) {
      // Three crisp shell-feed strokes from belt pouch up into underside loading port (0, -0.02, 0.085)
      const cycle = ((t - 0.14) / 0.62) * 3.0;
      const frac = cycle - Math.floor(cycle);
      const lift = Math.sin(frac * Math.PI);
      outHandLocal.set(
        THREE.MathUtils.lerp(-0.085, 0.0, lift),
        THREE.MathUtils.lerp(-0.25, -0.025, lift),
        THREE.MathUtils.lerp(0.03, 0.088, lift)
      );
      if (frac > 0.42 && frac < 0.62) {
        outTilt.impulse = Math.sin(((frac - 0.42) / 0.20) * Math.PI) * 0.25;
      }
    } else if (t < 0.94) {
      // Grasp pump forend and rack back -> snap forward to chamber first shell
      const p = (t - 0.76) / 0.18;
      const stroke = p > 0.22 ? Math.sin(THREE.MathUtils.clamp((p - 0.22) / 0.78, 0, 1) * Math.PI) : 0;
      outTilt.pumpStroke = stroke;
      outHandLocal.set(0.0, 0.0, 0.31 - stroke * 0.098);
      outTilt.impulse = -stroke * 0.42;
    } else {
      outHandLocal.set(0.0, 0.0, 0.31);
    }
    return;
  }

  if (t < 0.20) {
    // Support hand moves from handguard (0, 0.002, 0.265) to magazine base (0, -0.10, 0.105)
    const p = smoothstep(0.0, 0.20, t);
    outHandLocal.set(0.0, THREE.MathUtils.lerp(0.002, -0.105, p), THREE.MathUtils.lerp(0.265, 0.105, p));
  } else if (t < 0.46) {
    // Pull magazine downward and back toward hip pouch
    const p = smoothstep(0.20, 0.46, t);
    const ox = -0.075 * p;
    const oy = -0.24 * p;
    const oz = -0.07 * p;
    outMagOffset.set(ox, oy, oz);
    outHandLocal.set(ox, -0.105 + oy, 0.105 + oz);
  } else if (t < 0.74) {
    // Bring fresh magazine up from pouch and seat firmly into mag well
    const p = smoothstep(0.46, 0.70, t);
    const inv = 1.0 - p;
    const ox = -0.075 * inv;
    const oy = -0.24 * inv;
    const oz = -0.07 * inv;
    outMagOffset.set(ox, oy, oz);
    outHandLocal.set(ox, -0.105 + oy, 0.105 + oz);
    // Crisp upward tap seating magazine home at t=0.68..0.74
    if (t > 0.66) {
      outTilt.impulse = Math.sin(((t - 0.66) / 0.08) * Math.PI) * 0.35;
    }
  } else if (t < 0.90) {
    // Work the action / charging handle along receiver side
    const reach = smoothstep(0.74, 0.80, t);
    const rack = t > 0.80 ? Math.sin(THREE.MathUtils.clamp((t - 0.80) / 0.10, 0, 1) * Math.PI) : 0;
    outHandLocal.set(
      THREE.MathUtils.lerp(0.0, -0.036, reach),
      THREE.MathUtils.lerp(-0.08, 0.064, reach),
      THREE.MathUtils.lerp(0.105, 0.085, reach) - rack * 0.095
    );
    outTilt.impulse = -rack * 0.48;
  } else {
    // Return support hand smoothly to handguard
    const p = smoothstep(0.90, 1.0, t);
    outHandLocal.set(
      THREE.MathUtils.lerp(-0.036, 0.0, p),
      THREE.MathUtils.lerp(0.064, 0.002, p),
      THREE.MathUtils.lerp(0.085, 0.265, p)
    );
  }
}

const _relHandLocal = new THREE.Vector3();
const _relMagOffset = new THREE.Vector3();
const _relTilt = { roll: 0, pitch: 0, yaw: 0, impulse: 0, pumpStroke: 0 };
const _wpPoleRight = new THREE.Vector3();
const _wpPoleLeft = new THREE.Vector3();

/**
 * ADDITIVE weapon-hold pose layer for HumanRig.
 * Call right after applyHumanPose(rig, baseParams) — preserves lower-body walk/run/idle/seated
 * poses completely while smoothly layering patrol-carry, draw, shouldered aim, recoil fire,
 * low-ready, and 4-phase reload with 2-bone IK on both arms.
 */
export function applyWeaponHoldPose(
  rig: HumanRig,
  weaponRig: NpcWeaponRig,
  params: WeaponHoldPoseParams
): void {
  const safeDt = Math.min(0.05, Math.max(0.001, params.dt));
  const { elapsed, phase, state } = params;
  const prof = weaponRig.profile;
  weaponRig.state = state;

  // Trigger recoil + muzzle flash + light spill on fired frame
  if (params.firedThisFrame) {
    weaponRig.recoilKick = Math.min(1.15, weaponRig.recoilKick + 0.72 * prof.recoilAmp);
    weaponRig.lastShotElapsed = elapsed;
    triggerEnemyCarbineFlash(weaponRig.visual, params.lightPool);
  }

  // Smooth exponential state transitions (150-250ms, zero pose pops!)
  const isPatrol = state === 'patrol';
  const isHolstered = state === 'holstered';
  const isDraw = state === 'draw';
  const isAim = state === 'aim' || state === 'fire';
  const isLowReady = state === 'low_ready';
  const isReload = state === 'reload';

  const targetDraw = isPatrol || isHolstered ? 0.0 : 1.0;
  const targetAim = isAim ? 1.0 : 0.0;
  const targetLowReady = isLowReady ? 1.0 : isDraw ? 0.65 : 0.0;
  const targetTwoHand = isPatrol ? 0.0 : 1.0;
  const targetReload = isReload ? 1.0 : 0.0;

  weaponRig.drawWeight = THREE.MathUtils.damp(
    weaponRig.drawWeight,
    targetDraw,
    isPatrol ? prof.blendRate * 0.85 : prof.blendRate,
    safeDt
  );
  weaponRig.aimWeight = THREE.MathUtils.damp(
    weaponRig.aimWeight,
    targetAim,
    prof.blendRate,
    safeDt
  );
  weaponRig.lowReadyWeight = THREE.MathUtils.damp(
    weaponRig.lowReadyWeight,
    targetLowReady,
    prof.blendRate * 0.9,
    safeDt
  );
  weaponRig.twoHandWeight = THREE.MathUtils.damp(
    weaponRig.twoHandWeight,
    targetTwoHand,
    prof.blendRate * 1.1,
    safeDt
  );
  weaponRig.reloadWeight = THREE.MathUtils.damp(
    weaponRig.reloadWeight,
    targetReload,
    10.0,
    safeDt
  );
  weaponRig.recoilKick = THREE.MathUtils.damp(
    weaponRig.recoilKick,
    0,
    prof.recoilDamp,
    safeDt
  );

  // Red LED warm-up target driven strictly by detection/aim/fire ramp
  let ledTarget = 0;
  if (state === 'holstered') {
    ledTarget = 0;
  } else if (state === 'fire') {
    ledTarget = 1.1;
  } else if (state === 'aim') {
    ledTarget = 0.74 + 0.22 * THREE.MathUtils.clamp(params.detectionRamp, 0, 1);
  } else if (state === 'reload') {
    ledTarget = 0.14;
  } else if (state === 'low_ready') {
    ledTarget = params.detectionRamp > 0.05 ? 0.22 * params.detectionRamp : 0.0;
  } else if (state === 'draw') {
    ledTarget = 0.24 + 0.42 * THREE.MathUtils.clamp(params.detectionRamp, 0, 1);
  } else {
    // patrol: dark unless detection ramp is actively kindling
    ledTarget =
      params.detectionRamp > 0.03 ? 0.12 + 0.44 * THREE.MathUtils.clamp(params.detectionRamp, 0, 1) : 0;
  }
  updateEnemyCarbineVisual(weaponRig.visual, safeDt, elapsed, ledTarget, phase);

  // Compute reload choreography if reloading (duration strictly matches weapon spec reloadSec!)
  const wSpec = getSharedWeaponSpec(weaponRig.weaponId);
  let reloadU = 0;
  if (isReload) {
    if (params.reloadProgress !== undefined) {
      reloadU = THREE.MathUtils.clamp(params.reloadProgress, 0, 1);
    } else if (weaponRig.reloadTimer > 0) {
      reloadU = 1.0 - weaponRig.reloadTimer / wSpec.reloadSec;
    }
    evaluateReloadChoreography(reloadU, _relHandLocal, _relMagOffset, _relTilt, weaponRig.weaponId);
    setEnemyCarbineMagOffset(
      weaponRig.visual,
      _relMagOffset.x,
      _relMagOffset.y,
      _relMagOffset.z,
      _relMagOffset.y * 1.4,
      _relMagOffset.x * 2.2
    );
    if (weaponRig.weaponId === 'pump_shotgun' && _relTilt.pumpStroke !== undefined) {
      setEnemyWeaponPumpStroke(weaponRig.visual, _relTilt.pumpStroke);
    }
  } else {
    setEnemyCarbineMagOffset(weaponRig.visual, 0, 0, 0, 0, 0);
    _relTilt.roll = 0;
    _relTilt.pitch = 0;
    _relTilt.yaw = 0;
    _relTilt.impulse = 0;
    _relTilt.pumpStroke = 0;
  }

  // Organic layered breathing + weapon-class sway + locomotion carry bob
  const moveNorm = THREE.MathUtils.clamp(params.moveSpeedNorm ?? 0, 0, 1.2);
  const swayX =
    Math.sin(elapsed * 2.1 + phase * 1.7) * 0.008 * prof.swayAmp +
    Math.sin(elapsed * 5.6 + phase) * 0.006 * moveNorm;
  const swayY =
    Math.cos(elapsed * 1.85 + phase) * 0.006 * prof.swayAmp -
    Math.abs(Math.sin(elapsed * 5.6 + phase)) * 0.010 * moveNorm;
  const aimYawOff = THREE.MathUtils.clamp(params.aimYawOffset ?? 0, -0.75, 0.75);
  const aimPitch = THREE.MathUtils.clamp(params.aimPitch ?? 0, -0.55, 0.55);

  const combatBlend = Math.max(weaponRig.aimWeight, weaponRig.lowReadyWeight, weaponRig.reloadWeight);
  const recoil = weaponRig.recoilKick;

  // 1. ADDITIVE UPPER-BODY STANCE & RECOIL (preserves lower-body walk/run completely!)
  // Blade torso into weaver/rifle stance so left shoulder advances comfortably toward handguard
  const stanceYaw = prof.stanceYaw * combatBlend;
  // Counter-stabilize walking torso twist during aim/fire so muzzle stays locked on target line
  const twistStabilize = weaponRig.aimWeight * 0.85;
  rig.spine.rotation.y =
    rig.spine.rotation.y * (1 - twistStabilize) + stanceYaw * 0.45 + aimYawOff * 0.35 * combatBlend;
  rig.chest.rotation.y =
    rig.chest.rotation.y * (1 - twistStabilize) + stanceYaw * 0.55 + aimYawOff * 0.65 * combatBlend;
  rig.spine.rotation.x += prof.combatLean * combatBlend - recoil * 0.045;
  rig.chest.rotation.x += -aimPitch * 0.25 * weaponRig.aimWeight - recoil * 0.065;

  // Head tracks target cleanly over the sights (compensating for torso blading)
  if (combatBlend > 0.02) {
    const targetHeadYaw = -stanceYaw + aimYawOff * 0.12;
    const targetHeadPitch = -aimPitch * 0.65 + 0.06 * weaponRig.aimWeight - recoil * 0.03;
    rig.neck.rotation.y = THREE.MathUtils.lerp(rig.neck.rotation.y, targetHeadYaw * 0.4, combatBlend);
    rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, targetHeadYaw * 0.6, combatBlend);
    rig.neck.rotation.x = THREE.MathUtils.lerp(rig.neck.rotation.x, targetHeadPitch * 0.35, combatBlend);
    rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, targetHeadPitch * 0.65, combatBlend);
    rig.head.rotation.z = THREE.MathUtils.lerp(
      rig.head.rotation.z,
      -0.08 * weaponRig.aimWeight,
      combatBlend
    );
  }

  // 2. COMPUTE TARGET WEAPON GRIP POSE IN CHEST LOCAL SPACE
  // Patrol (one-handed low-carry at right hip/thigh) -> Low-Ready -> Shouldered Aim/Fire
  const shX = rig.rightShoulder.position.x;
  const shY = rig.rightShoulder.position.y;
  const drawW = weaponRig.drawWeight;
  const aimW = weaponRig.aimWeight;
  const relW = weaponRig.reloadWeight;

  // Patrol one-handed low-carry (clears thigh/coat, barrel angled down-forward)
  const patX = shX + 0.032;
  const patY = shY - 0.385;
  const patZ = 0.135;

  // Low-ready two-handed across upper chest (barrel dipped safely down)
  const lrX = shX - 0.055;
  const lrY = shY - 0.165;
  const lrZ = 0.245;

  // Shouldered aim/fire (buttpad in right shoulder pocket, muzzle height = 1.38*heightScale!)
  const aimX = shX - 0.072;
  const aimY = shY - 0.082 + Math.sin(aimPitch) * 0.05;
  const aimZ = 0.235 - recoil * 0.042 + _relTilt.impulse * 0.018;

  // Blend smoothly patrol -> low-ready -> aim
  const baseGX = THREE.MathUtils.lerp(THREE.MathUtils.lerp(patX, lrX, drawW), aimX, aimW);
  const baseGY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(patY, lrY, drawW), aimY, aimW);
  const baseGZ = THREE.MathUtils.lerp(THREE.MathUtils.lerp(patZ, lrZ, drawW), aimZ, aimW);

  _wpGripChestPos.set(
    baseGX + swayX * (0.4 + 0.6 * drawW),
    baseGY + swayY + recoil * 0.016 - relW * 0.035,
    baseGZ + relW * 0.02
  );

  // Target gun orientation in chest local space (compensates torso stanceYaw so world barrel = target line!)
  const gunPitchPatrol = 0.78 + Math.sin(elapsed * 3.0 + phase) * 0.04 * moveNorm;
  const gunPitchLowReady = prof.lowReadyPitch + swayY * 1.4;
  const gunPitchAim = -aimPitch - recoil * 0.115 + swayY * 0.85;
  const gunPitch =
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(gunPitchPatrol, gunPitchLowReady, drawW), gunPitchAim, aimW) +
    _relTilt.pitch * relW;

  const gunYawPatrol = -0.14;
  const gunYawLowReady = -stanceYaw - 0.26;
  const gunYawAim = -stanceYaw + swayX * 1.2;
  const gunYaw =
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(gunYawPatrol, gunYawLowReady, drawW), gunYawAim, aimW) +
    _relTilt.yaw * relW;

  const gunRollPatrol = 0.16;
  const gunRollReady = prof.weaponCant - recoil * 0.045;
  const gunRoll =
    THREE.MathUtils.lerp(gunRollPatrol, gunRollReady, drawW) + _relTilt.roll * relW;

  _wpGunChestE.set(gunPitch, gunYaw, gunRoll, 'YXZ');
  _wpGunChestQ.setFromEuler(_wpGunChestE);

  // Compute right wrist target in chest space so weapon gripPivot sits exactly at _wpGripChestPos
  const rHandScale = rig.rightHandGrp.scale.x;
  _wpTmpV.copy(_wpHandLocalOffset).multiplyScalar(rHandScale).applyQuaternion(_wpGunChestQ);
  _wpTargetWrist.copy(_wpGripChestPos).sub(_wpTmpV);

  // Holstered (port extension): the weapon rides the hip under the caller's
  // holster parenting; arms stay fully civilian — restore the open hand
  // meshes and skip both IK solves.
  if (isHolstered) {
    rig.rightHandNormalMesh.visible = true;
    rig.rightHandStrapMesh.visible = false;
    rig.leftHandNormalMesh.visible = true;
    rig.leftHandStrapMesh.visible = false;
    return;
  }

  // 3. SOLVE RIGHT ARM IK (ALWAYS ACTIVE FOR ARMED HUMAN — GRIP NEVER FLOATS!)
  _wpPoleRight.set(0.65, -0.72, -0.24);
  solveChestArmIKBlended(
    rig.rightShoulder,
    rig.rightElbow,
    rig.rightHandGrp,
    1,
    _wpTargetWrist,
    _wpGunChestQ,
    _wpPoleRight,
    1.0
  );
  // Closed curled grip fist around pistol grip
  rig.rightHandNormalMesh.visible = false;
  rig.rightHandStrapMesh.visible = true;

  // 4. SOLVE LEFT (SUPPORT) ARM IK UNDER HANDGUARD, SHOTGUN PUMP FOREND, OR RELOAD TRAJECTORY
  const suppW = weaponRig.twoHandWeight;
  if (suppW > 0.01) {
    const gunScale = weaponRig.visual.root.scale.x;
    const baseHandguardZ =
      weaponRig.weaponId === 'pump_shotgun'
        ? weaponRig.visual.pumpForendRestZ - weaponRig.visual.pumpStroke * 0.098
        : 0.265;
    if (relW > 0.02) {
      // Blend smoothly from handguard/forend anchor into exact weapon reload trajectory
      _wpSuppTarget.set(
        THREE.MathUtils.lerp(0.0, _relHandLocal.x, relW),
        THREE.MathUtils.lerp(0.002, _relHandLocal.y, relW),
        THREE.MathUtils.lerp(baseHandguardZ, _relHandLocal.z, relW)
      );
    } else {
      // Directly under carbine handguard or live sliding shotgun pump forend!
      _wpSuppTarget.set(0.0, 0.002, baseHandguardZ);
    }
    _wpSuppTarget.multiplyScalar(gunScale).applyQuaternion(_wpGunChestQ).add(_wpGripChestPos);
    // Offset slightly back to wrist from left palm center
    const lHandScale = rig.leftHandGrp.scale.x;
    _wpTmpV.set(0, -0.052 * lHandScale, 0).applyQuaternion(_wpGunChestQ);
    _wpSuppTarget.sub(_wpTmpV);

    _wpPoleLeft.set(-0.62, -0.76, -0.18);
    solveChestArmIKBlended(
      rig.leftShoulder,
      rig.leftElbow,
      rig.leftHandGrp,
      -1,
      _wpSuppTarget,
      null,
      _wpPoleLeft,
      suppW
    );
    rig.leftHandGrp.rotation.set(0.18 * suppW, -0.35 * suppW, 0.24 * suppW);
    if (suppW > 0.45) {
      rig.leftHandNormalMesh.visible = false;
      rig.leftHandStrapMesh.visible = true;
    }
  }
}

/**
 * Returns the exact live world position of an armed HumanRig's visual carbine muzzle.
 */
export function getNpcWeaponMuzzleWorld(
  weaponRig: NpcWeaponRig,
  out = new THREE.Vector3()
): THREE.Vector3 {
  weaponRig.visual.root.updateMatrixWorld(true);
  return weaponRig.visual.muzzleAnchor.getWorldPosition(out);
}


// =========================================================================
// SLEUTH PISTOL — FPS-kit pistol as the undercover weapon (PORT EXTENSION)
// =========================================================================
// The class table's pistol has no SharedWeaponId, so its visual comes from
// the FPS kit's buildPistol (the design of record), finished with the same
// matte-black clone + red charging LED treatment as the carbines. Sleuths
// spawn HOLSTERED: the pistol rides a hip holster pivot, invisible to a
// casual glance; the draw re-parents it to the hand grip pivot and the
// one-handed snap to aim (fastest blendRate in the profile table, near-zero
// sway) is the tell. Ballistics for the pistol are NOT part of the shared
// arsenal specs and are not invented here — the sleuth system (combined
// brief step 6) owns if/when a drawn sleuth fires.

export interface EnemyPistolVisual {
  root: THREE.Group;
  rig: PistolRig;
  ledMesh: THREE.Mesh;
  ledMat: THREE.MeshStandardMaterial;
  ledGlowSprite: THREE.Sprite;
  ledGlowMat: THREE.SpriteMaterial;
  ledIntensity: number;
  ledFirePulse: number;
  flashTimer: number;
}

function ensureNpcBlackMaterials(): NonNullable<typeof _npcBlackMaterials> {
  if (!_npcBlackMaterials) {
    const gunMetal = new THREE.MeshStandardMaterial();
    gunMetal.color.set('#0b0d11');
    gunMetal.roughness = 0.44;
    gunMetal.metalness = 0.72;
    const polymer = new THREE.MeshStandardMaterial();
    polymer.color.set('#07080b');
    polymer.roughness = 0.76;
    polymer.metalness = 0.14;
    const steel = new THREE.MeshStandardMaterial();
    steel.color.set('#141820');
    steel.roughness = 0.34;
    steel.metalness = 0.84;
    _npcBlackMaterials = { gunMetal, polymer, steel };
  }
  return _npcBlackMaterials;
}

export function createEnemyPistolVisual(
  scale = 0.95,
  maxAnisotropy = 4
): EnemyPistolVisual {
  const rig = buildPistol(maxAnisotropy);
  const root = rig.root;
  root.name = 'EnemyBlackPistol';
  root.scale.setScalar(scale);
  root.userData.isWeapon = true;
  root.userData.weaponId = 'pistol';

  const blacks = ensureNpcBlackMaterials();
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (!m.isMesh) return;
    const orig = m.material as THREE.MeshStandardMaterial;
    if (orig && orig.isMeshStandardMaterial) {
      if (orig.metalness > 0.82) m.material = blacks.steel;
      else if (orig.metalness > 0.5) m.material = blacks.gunMetal;
      else m.material = blacks.polymer;
    }
  });

  // Red charging LED on the slide, same housing/diode/glow treatment as the
  // carbines (port note: pistol local space is -Z forward, sights on top).
  if (!_ledHousingGeo) {
    _ledHousingGeo = new THREE.BoxGeometry(0.032, 0.018, 0.036);
    _ledDiodeGeo = new THREE.SphereGeometry(0.0135, 10, 8);
  }
  const ledY = rig.sightLineY + 0.016;
  const ledHousing = new THREE.Mesh(_ledHousingGeo, blacks.polymer);
  ledHousing.name = 'EnemyWeaponLedHousing';
  ledHousing.position.set(0, ledY, -0.038);
  root.add(ledHousing);

  const ledMat = new THREE.MeshStandardMaterial({
    color: _ledOffColor.clone(),
    emissive: _ledEmissiveColor.clone(),
    emissiveIntensity: 0.0,
    roughness: 0.18,
    metalness: 0.12,
    toneMapped: false,
  });
  const ledMesh = new THREE.Mesh(_ledDiodeGeo!, ledMat);
  ledMesh.name = 'EnemyWeaponRedLed';
  ledMesh.scale.set(1.15, 0.92, 1.35);
  ledMesh.position.set(0, ledY + 0.008, -0.026);
  root.add(ledMesh);

  const ledGlowMat = new THREE.SpriteMaterial({
    map: getRedLedGlowTexture(),
    color: '#ff241a',
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const ledGlowSprite = new THREE.Sprite(ledGlowMat);
  ledGlowSprite.name = 'EnemyWeaponLedGlow';
  ledGlowSprite.position.set(0, ledY + 0.01, -0.02);
  ledGlowSprite.scale.set(0.08, 0.08, 1);
  ledGlowSprite.visible = false;
  ledGlowSprite.renderOrder = 6;
  root.add(ledGlowSprite);

  return {
    root,
    rig,
    ledMesh,
    ledMat,
    ledGlowSprite,
    ledGlowMat,
    ledIntensity: 0,
    ledFirePulse: 0,
    flashTimer: 0,
  };
}

export function triggerEnemyPistolFlash(
  visual: EnemyPistolVisual,
  lightPool?: MuzzleFlashLightPool
): void {
  visual.flashTimer = 0.055;
  visual.ledFirePulse = 1.0;
  visual.rig.setMuzzleFlash(1.0);
  visual.rig.setSlideOffset(-0.018);
  if (lightPool) {
    visual.root.updateMatrixWorld(true);
    visual.rig.muzzleTip.getWorldPosition(_flashWorldScratch);
    lightPool.trigger(_flashWorldScratch, 6.4, 0.06);
  }
}

export function updateEnemyPistolVisual(
  visual: EnemyPistolVisual,
  dt: number,
  elapsed: number,
  ledTarget: number,
  phase = 0
): void {
  const clampedTarget = THREE.MathUtils.clamp(ledTarget, 0, 1.2);
  const rampRate = clampedTarget > visual.ledIntensity ? 7.5 : 3.4;
  visual.ledIntensity = THREE.MathUtils.damp(visual.ledIntensity, clampedTarget, rampRate, dt);
  visual.ledFirePulse = THREE.MathUtils.damp(visual.ledFirePulse, 0, 14.0, dt);

  const level = Math.min(1.25, visual.ledIntensity + visual.ledFirePulse * 0.35);
  if (level <= 0.015) {
    visual.ledMat.color.copy(_ledOffColor);
    visual.ledMat.emissiveIntensity = 0.0;
    visual.ledGlowSprite.visible = false;
  } else {
    const norm = Math.min(1, level);
    if (norm < 0.45) {
      visual.ledMat.color.copy(_ledOffColor).lerp(_ledKindleColor, norm / 0.45);
    } else {
      visual.ledMat.color.copy(_ledKindleColor).lerp(_ledFullColor, (norm - 0.45) / 0.55);
    }
    const microFlicker =
      norm > 0.65 ? 1.0 + Math.sin(elapsed * 22.0 + phase * 3.1) * 0.07 : 1.0;
    visual.ledMat.emissiveIntensity = (0.35 + Math.pow(level, 1.45) * 5.8) * microFlicker;
    visual.ledGlowSprite.visible = level > 0.05;
    const haloScale = (0.065 + Math.pow(norm, 1.15) * 0.26 + visual.ledFirePulse * 0.11) * microFlicker;
    visual.ledGlowSprite.scale.set(haloScale, haloScale, 1);
    visual.ledGlowMat.opacity = THREE.MathUtils.clamp(
      (0.14 + Math.pow(norm, 1.1) * 0.84) * microFlicker,
      0,
      1
    );
  }

  if (visual.flashTimer > 0) {
    visual.flashTimer -= dt;
    if (visual.flashTimer <= 0) {
      visual.flashTimer = 0;
      visual.rig.setMuzzleFlash(0);
      visual.rig.setSlideOffset(0);
    } else {
      const f = visual.flashTimer / 0.055;
      visual.rig.setMuzzleFlash(f);
      visual.rig.setSlideOffset(-0.018 * f);
    }
  }
}

export interface NpcPistolRig {
  visual: EnemyPistolVisual;
  gripPivot: THREE.Group;
  holsterPivot: THREE.Group;
  profile: EnemyWeaponClassProfile;
  state: EnemyWeaponState;
  drawWeight: number;
  aimWeight: number;
  lowReadyWeight: number;
  recoilKick: number;
}

const _pistolHolsterPos = new THREE.Vector3(0, 0, 0);
const _pistolHolsterRot = new THREE.Euler(0.5, 0.12, -0.1);
const _pistolHandOffset = new THREE.Vector3(0, -0.05, 0.012);

/**
 * Attaches the sleuth pistol: grip pivot in the right palm (same seat as the
 * carbine layer) plus a holster pivot at the right hip on the rig root.
 * The visual starts HOLSTERED on the hip pivot.
 */
export function attachPistolToHumanRig(rig: HumanRig, scale = 0.95): NpcPistolRig {
  const gripPivot = new THREE.Group();
  gripPivot.name = 'NpcPistolGripPivot';
  gripPivot.position.set(0.0, -0.05, 0.012);
  rig.rightHandGrp.add(gripPivot);

  const holsterPivot = new THREE.Group();
  holsterPivot.name = 'NpcPistolHolsterPivot';
  // Right hip, just below pelvis height, in rig-root local space.
  holsterPivot.position.set(0.17, rig.standingPelvisY - 0.08, 0.02);
  rig.root.add(holsterPivot);

  const visual = createEnemyPistolVisual(scale);
  visual.root.position.copy(_pistolHolsterPos);
  visual.root.rotation.copy(_pistolHolsterRot);
  holsterPivot.add(visual.root);

  if (rig.newspaperProp) rig.newspaperProp.visible = false;
  if (rig.phoneProp) rig.phoneProp.visible = false;
  if (rig.cigaretteProp) rig.cigaretteProp.visible = false;

  return {
    visual,
    gripPivot,
    holsterPivot,
    profile: getEnemyWeaponClassProfile('sleuth'),
    state: 'holstered',
    drawWeight: 0,
    aimWeight: 0,
    lowReadyWeight: 0,
    recoilKick: 0,
  };
}

const _ppGunChestE = new THREE.Euler(0, 0, 0, 'YXZ');
const _ppGunChestQ = new THREE.Quaternion();
const _ppGripChestPos = new THREE.Vector3();
const _ppTargetWrist = new THREE.Vector3();
const _ppTmpV = new THREE.Vector3();
const _ppPoleRight = new THREE.Vector3();

/**
 * One-handed pistol hold layer for the sleuth class. Call right after
 * applyHumanPose(), mirroring applyWeaponHoldPose. The body stays civilian:
 * no torso blading, no support-hand solve — stillness, then the snap.
 */
export function applyPistolHoldPose(
  rig: HumanRig,
  pistolRig: NpcPistolRig,
  params: WeaponHoldPoseParams
): void {
  const safeDt = Math.min(0.05, Math.max(0.001, params.dt));
  const { elapsed, phase, state } = params;
  const prof = pistolRig.profile;
  pistolRig.state = state;

  if (params.firedThisFrame) {
    pistolRig.recoilKick = Math.min(1.15, pistolRig.recoilKick + 0.72 * prof.recoilAmp);
    triggerEnemyPistolFlash(pistolRig.visual, params.lightPool);
  }

  const isHolstered = state === 'holstered' || state === 'patrol';
  const isAim = state === 'aim' || state === 'fire';
  const isLowReady = state === 'low_ready';
  const isDraw = state === 'draw';

  pistolRig.drawWeight = THREE.MathUtils.damp(
    pistolRig.drawWeight,
    isHolstered ? 0.0 : 1.0,
    prof.blendRate,
    safeDt
  );
  pistolRig.aimWeight = THREE.MathUtils.damp(
    pistolRig.aimWeight,
    isAim ? 1.0 : 0.0,
    prof.blendRate,
    safeDt
  );
  pistolRig.lowReadyWeight = THREE.MathUtils.damp(
    pistolRig.lowReadyWeight,
    isLowReady ? 1.0 : isDraw ? 0.65 : 0.0,
    prof.blendRate * 0.9,
    safeDt
  );
  pistolRig.recoilKick = THREE.MathUtils.damp(pistolRig.recoilKick, 0, prof.recoilDamp, safeDt);

  let ledTarget = 0;
  if (state === 'fire') ledTarget = 1.1;
  else if (state === 'aim') ledTarget = 0.74 + 0.22 * THREE.MathUtils.clamp(params.detectionRamp, 0, 1);
  else if (state === 'low_ready') ledTarget = params.detectionRamp > 0.05 ? 0.22 * params.detectionRamp : 0;
  else if (state === 'draw') ledTarget = 0.24 + 0.42 * THREE.MathUtils.clamp(params.detectionRamp, 0, 1);
  updateEnemyPistolVisual(pistolRig.visual, safeDt, elapsed, ledTarget, phase);

  // Parenting: the pistol lives on the hip until the draw actually starts.
  const wantInHand = !isHolstered || pistolRig.drawWeight > 0.04;
  if (wantInHand && pistolRig.visual.root.parent !== pistolRig.gripPivot) {
    pistolRig.gripPivot.add(pistolRig.visual.root);
    pistolRig.visual.root.position.set(0, 0, 0);
    pistolRig.visual.root.rotation.set(0, 0, 0);
  } else if (!wantInHand && pistolRig.visual.root.parent !== pistolRig.holsterPivot) {
    pistolRig.holsterPivot.add(pistolRig.visual.root);
    pistolRig.visual.root.position.copy(_pistolHolsterPos);
    pistolRig.visual.root.rotation.copy(_pistolHolsterRot);
  }

  if (isHolstered && pistolRig.drawWeight <= 0.04) {
    rig.rightHandNormalMesh.visible = true;
    rig.rightHandStrapMesh.visible = false;
    return;
  }

  // One-handed grip targets in chest space: hip -> low-ready -> extended aim.
  const shX = rig.rightShoulder.position.x;
  const shY = rig.rightShoulder.position.y;
  const drawW = pistolRig.drawWeight;
  const aimW = pistolRig.aimWeight;
  const recoil = pistolRig.recoilKick;
  const aimPitch = THREE.MathUtils.clamp(params.aimPitch ?? 0, -0.55, 0.55);

  const hipX = shX + 0.055, hipY = shY - 0.44, hipZ = 0.09;
  const lrX = shX - 0.03, lrY = shY - 0.21, lrZ = 0.27;
  const aimX = shX - 0.045, aimY = shY - 0.075 + Math.sin(aimPitch) * 0.05, aimZ = 0.40 - recoil * 0.03;

  _ppGripChestPos.set(
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(hipX, lrX, drawW), aimX, aimW),
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(hipY, lrY, drawW), aimY, aimW),
    THREE.MathUtils.lerp(THREE.MathUtils.lerp(hipZ, lrZ, drawW), aimZ, aimW)
  );

  const gunPitch = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(0.72, prof.lowReadyPitch, drawW),
    -aimPitch - recoil * 0.1,
    aimW
  );
  _ppGunChestE.set(gunPitch, -prof.stanceYaw * Math.max(aimW, pistolRig.lowReadyWeight), prof.weaponCant, 'YXZ');
  _ppGunChestQ.setFromEuler(_ppGunChestE);

  const rHandScale = rig.rightHandGrp.scale.x;
  _ppTmpV.copy(_pistolHandOffset).multiplyScalar(rHandScale).applyQuaternion(_ppGunChestQ);
  _ppTargetWrist.copy(_ppGripChestPos).sub(_ppTmpV);

  _ppPoleRight.set(0.65, -0.72, -0.24);
  solveChestArmIKBlended(
    rig.rightShoulder,
    rig.rightElbow,
    rig.rightHandGrp,
    1,
    _ppTargetWrist,
    _ppGunChestQ,
    _ppPoleRight,
    1.0
  );
  rig.rightHandNormalMesh.visible = false;
  rig.rightHandStrapMesh.visible = true;
}

export function getNpcPistolMuzzleWorld(
  visual: EnemyPistolVisual,
  out = new THREE.Vector3()
): THREE.Vector3 {
  visual.root.updateMatrixWorld(true);
  return visual.rig.muzzleTip.getWorldPosition(out);
}
