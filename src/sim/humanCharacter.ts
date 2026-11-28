import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLibrary } from './textures';

export type HumanBuildType = 'athletic_male' | 'slender_female' | 'stocky_heavy' | 'tall_lean';
export type HairStyleType =
  | 'short_cropped'
  | 'long_flowing'
  | 'bob_cut'
  | 'ponytail'
  | 'knit_beanie'
  | 'newsboy_cap'
  | 'side_part';

export type OutfitStyleType =
  // Varied Civilian Jackets & Streetwear
  | 'trench_coat'
  | 'puffer_jacket'
  | 'leather_biker'
  | 'hoodie_parka'
  | 'tailored_blazer'
  | 'cardigan_scarf'
  // Distinct Transit & Civic Uniforms
  | 'metro_worker'
  | 'transit_security'
  | 'rail_engineer'
  // Grand Archipelago Factions & Station Staff (reusing exact same HumanRig!)
  | 'soviet_soldier'
  | 'pow_prisoner'
  | 'station_barista'
  | 'gang_2059';

export type CommuterActivityType = 'none' | 'newspaper' | 'phone' | 'cigarette';

export interface BodyManifestEntry {
  bodyId: string;
  file: string;
  gender: 'male' | 'female' | 'androgynous';
  ageBand: 'young-adult' | 'adult' | 'middle-aged' | 'elder';
  ancestry: 'caucasian' | 'african' | 'asian' | 'mixed';
  build: string;
  heightM: number;
  skinHex: string;
}

/**
 * Embedded typed table from models/makehuman/body-pool-manifest.json (50 MakeHuman/MPFB bodies).
 */
export const BODY_POOL_MANIFEST: readonly BodyManifestEntry[] = [
  { bodyId: 'citizen-001', file: 'citizen-001-rigged.glb', gender: 'androgynous', ageBand: 'adult', ancestry: 'mixed', build: 'default-average', heightM: 1.694, skinHex: '#A67048' },
  { bodyId: 'citizen-002', file: 'citizen-002.glb', gender: 'male', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'broad-sturdy', heightM: 1.835, skinHex: '#8A5A3B' },
  { bodyId: 'citizen-003', file: 'citizen-003.glb', gender: 'female', ageBand: 'adult', ancestry: 'caucasian', build: 'sturdy', heightM: 1.73, skinHex: '#C89878' },
  { bodyId: 'citizen-004', file: 'citizen-004.glb', gender: 'male', ageBand: 'young-adult', ancestry: 'asian', build: 'slim', heightM: 1.783, skinHex: '#D9B48F' },
  { bodyId: 'citizen-005', file: 'citizen-005.glb', gender: 'female', ageBand: 'adult', ancestry: 'caucasian', build: 'average-soft', heightM: 1.674, skinHex: '#E8C39E' },
  { bodyId: 'citizen-006', file: 'citizen-006.glb', gender: 'female', ageBand: 'elder', ancestry: 'caucasian', build: 'stout-elder', heightM: 1.595, skinHex: '#DCB28C' },
  { bodyId: 'citizen-007', file: 'citizen-007.glb', gender: 'male', ageBand: 'adult', ancestry: 'african', build: 'average', heightM: 1.749, skinHex: '#6B4226' },
  { bodyId: 'citizen-008', file: 'citizen-008.glb', gender: 'male', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'broad-sturdy', heightM: 1.91, skinHex: '#7A4A28' },
  { bodyId: 'citizen-009', file: 'citizen-009.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'heavy-limbed', heightM: 1.773, skinHex: '#5C3A21' },
  { bodyId: 'citizen-010', file: 'citizen-010.glb', gender: 'female', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'sturdy', heightM: 1.747, skinHex: '#B07B54' },
  { bodyId: 'citizen-011', file: 'citizen-011.glb', gender: 'male', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'broad-sturdy', heightM: 1.871, skinHex: '#9C6B43' },
  { bodyId: 'citizen-012', file: 'citizen-012.glb', gender: 'male', ageBand: 'adult', ancestry: 'mixed', build: 'sturdy-average', heightM: 1.748, skinHex: '#C08A5E' },
  { bodyId: 'citizen-013', file: 'citizen-013.glb', gender: 'female', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'average', heightM: 1.651, skinHex: '#E0BFA0' },
  { bodyId: 'citizen-014', file: 'citizen-014.glb', gender: 'male', ageBand: 'adult', ancestry: 'african', build: 'lean-sturdy', heightM: 1.796, skinHex: '#4A2C17' },
  { bodyId: 'citizen-015', file: 'citizen-015.glb', gender: 'female', ageBand: 'young-adult', ancestry: 'caucasian', build: 'slim', heightM: 1.654, skinHex: '#EDD0AC' },
  { bodyId: 'citizen-016', file: 'citizen-016.glb', gender: 'male', ageBand: 'young-adult', ancestry: 'asian', build: 'slim-average', heightM: 1.815, skinHex: '#D9A066' },
  { bodyId: 'citizen-017', file: 'citizen-017.glb', gender: 'female', ageBand: 'young-adult', ancestry: 'mixed', build: 'slim', heightM: 1.687, skinHex: '#CFA06F' },
  { bodyId: 'citizen-018', file: 'citizen-018.glb', gender: 'male', ageBand: 'young-adult', ancestry: 'caucasian', build: 'slim', heightM: 1.741, skinHex: '#EAC9A8' },
  { bodyId: 'citizen-019', file: 'citizen-019.glb', gender: 'female', ageBand: 'young-adult', ancestry: 'african', build: 'average', heightM: 1.68, skinHex: '#86552E' },
  { bodyId: 'citizen-020', file: 'citizen-020.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'average-soft', heightM: 1.777, skinHex: '#E5C298' },
  { bodyId: 'citizen-021', file: 'citizen-021.glb', gender: 'female', ageBand: 'adult', ancestry: 'asian', build: 'lean', heightM: 1.64, skinHex: '#DDBB96' },
  { bodyId: 'citizen-022', file: 'citizen-022.glb', gender: 'male', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'soft', heightM: 1.741, skinHex: '#A9744F' },
  { bodyId: 'citizen-023', file: 'citizen-023.glb', gender: 'female', ageBand: 'adult', ancestry: 'caucasian', build: 'average', heightM: 1.712, skinHex: '#D3A679' },
  { bodyId: 'citizen-024', file: 'citizen-024.glb', gender: 'female', ageBand: 'adult', ancestry: 'caucasian', build: 'trim', heightM: 1.692, skinHex: '#F0D7B8' },
  { bodyId: 'citizen-025', file: 'citizen-025.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'average-trim', heightM: 1.841, skinHex: '#B98A5F' },
  { bodyId: 'citizen-026', file: 'citizen-026.glb', gender: 'female', ageBand: 'adult', ancestry: 'african', build: 'average', heightM: 1.621, skinHex: '#93603C' },
  { bodyId: 'citizen-027', file: 'citizen-027.glb', gender: 'female', ageBand: 'elder', ancestry: 'caucasian', build: 'compact-elder', heightM: 1.558, skinHex: '#E3C29B' },
  { bodyId: 'citizen-028', file: 'citizen-028.glb', gender: 'female', ageBand: 'elder', ancestry: 'caucasian', build: 'stout-elder', heightM: 1.628, skinHex: '#D8AC7E' },
  { bodyId: 'citizen-029', file: 'citizen-029.glb', gender: 'female', ageBand: 'elder', ancestry: 'caucasian', build: 'frail-elder', heightM: 1.595, skinHex: '#EBCCA5' },
  { bodyId: 'citizen-030', file: 'citizen-030.glb', gender: 'male', ageBand: 'elder', ancestry: 'caucasian', build: 'elder-average', heightM: 1.723, skinHex: '#CBA27A' },
  { bodyId: 'citizen-031', file: 'citizen-031.glb', gender: 'male', ageBand: 'elder', ancestry: 'caucasian', build: 'elder-sturdy', heightM: 1.738, skinHex: '#AE8055' },
  { bodyId: 'citizen-032', file: 'citizen-032.glb', gender: 'female', ageBand: 'adult', ancestry: 'caucasian', build: 'average', heightM: 1.669, skinHex: '#E1B992' },
  { bodyId: 'citizen-033', file: 'citizen-033.glb', gender: 'male', ageBand: 'adult', ancestry: 'asian', build: 'average', heightM: 1.763, skinHex: '#BE8F63' },
  { bodyId: 'citizen-034', file: 'citizen-034.glb', gender: 'female', ageBand: 'middle-aged', ancestry: 'mixed', build: 'average-soft', heightM: 1.631, skinHex: '#6E4525' },
  { bodyId: 'citizen-035', file: 'citizen-035.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'lean-average', heightM: 1.808, skinHex: '#EDD2B0' },
  { bodyId: 'citizen-036', file: 'citizen-036.glb', gender: 'female', ageBand: 'adult', ancestry: 'mixed', build: 'average', heightM: 1.72, skinHex: '#D7AE84' },
  { bodyId: 'citizen-037', file: 'citizen-037.glb', gender: 'female', ageBand: 'young-adult', ancestry: 'caucasian', build: 'slender-toned', heightM: 1.737, skinHex: '#E9C6A2' },
  { bodyId: 'citizen-038', file: 'citizen-038.glb', gender: 'female', ageBand: 'adult', ancestry: 'african', build: 'toned-athletic', heightM: 1.703, skinHex: '#5F3A20' },
  { bodyId: 'citizen-039', file: 'citizen-039.glb', gender: 'female', ageBand: 'adult', ancestry: 'caucasian', build: 'tall-lean', heightM: 1.882, skinHex: '#F2DCC0' },
  { bodyId: 'citizen-040', file: 'citizen-040.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'tall-lean', heightM: 1.884, skinHex: '#CEA06B' },
  { bodyId: 'citizen-041', file: 'citizen-041.glb', gender: 'female', ageBand: 'young-adult', ancestry: 'mixed', build: 'tall-lean', heightM: 1.812, skinHex: '#DBB98F' },
  { bodyId: 'citizen-042', file: 'citizen-042.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'average-unremarkable', heightM: 1.75, skinHex: '#D6B48C' },
  { bodyId: 'citizen-043', file: 'citizen-043.glb', gender: 'female', ageBand: 'adult', ancestry: 'caucasian', build: 'average-unremarkable', heightM: 1.698, skinHex: '#C9A06F' },
  { bodyId: 'citizen-044', file: 'citizen-044.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'lean-wiry', heightM: 1.792, skinHex: '#9E6E45' },
  { bodyId: 'citizen-045', file: 'citizen-045.glb', gender: 'male', ageBand: 'adult', ancestry: 'mixed', build: 'street-muscular', heightM: 1.705, skinHex: '#7C4E2A' },
  { bodyId: 'citizen-046', file: 'citizen-046.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'broad-heavy', heightM: 1.909, skinHex: '#B08256' },
  { bodyId: 'citizen-047', file: 'citizen-047.glb', gender: 'male', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'thick-set', heightM: 1.829, skinHex: '#75482A' },
  { bodyId: 'citizen-048', file: 'citizen-048.glb', gender: 'male', ageBand: 'middle-aged', ancestry: 'caucasian', build: 'solid-composed', heightM: 1.757, skinHex: '#C19A68' },
  { bodyId: 'citizen-049', file: 'citizen-049.glb', gender: 'male', ageBand: 'adult', ancestry: 'caucasian', build: 'fit-muscular', heightM: 1.855, skinHex: '#BB9066' },
  { bodyId: 'citizen-050', file: 'citizen-050.glb', gender: 'male', ageBand: 'adult', ancestry: 'african', build: 'tall-lean-athletic', heightM: 1.949, skinHex: '#54341C' },
];

export const BODY_MANIFEST_MAP: ReadonlyMap<string, BodyManifestEntry> = new Map(
  BODY_POOL_MANIFEST.map((e) => [e.bodyId, e])
);

export interface HumanDressingConfig {
  faceId?: string;
  fabricId?: string;
  outfitId?: OutfitStyleType;
  skinColor?: string;
  hairColor?: string;
  jacketColor?: string;
  pantsColor?: string;
  shoeColor?: string;
  scarfColor?: string;
  hatColor?: string;
  propColor?: string;
  irisColor?: string;
  hasScarf?: boolean;
  usesCap?: boolean;
  hasProp?: boolean;
  propKind?: 'backpack' | 'briefcase';
  coatLenScale?: number;
  hairStyle?: HairStyleType;
  weatheredFace?: boolean;
}

export interface HumanPoseParams {
  mode: 'seated' | 'standing_strap' | 'standing_idle' | 'walking' | 'worker_desk' | 'worker_guide';
  elapsed: number;
  phase: number;
  walkCycle?: number;
  railSway?: number;
  windStrength?: number; // 0.0 (still) .. 1.0+ (rainy outdoor gust)
  variantStyle?: number;
  // Optional exact overhead strap handle target in rig.root local space (pre-heightScale, meters)
  strapTargetLocal?: { x: number; y: number; z: number };
  // Spec 1: Polite aisle/queue passing & upset reaction overlays
  sidestepYaw?: number;
  nodPitch?: number;
  upsetProgress?: number; // 0..1 envelope
  upsetLookYaw?: number; // relative yaw toward bumper (rad)
  weaponPose?: 'ready' | 'aim';
}

export interface HumanRig {
  root: THREE.Group;
  pelvis: THREE.Bone;
  spine: THREE.Bone;
  chest: THREE.Bone;
  neck: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Bone;
  leftElbow: THREE.Bone;
  leftHandGrp: THREE.Group;
  leftHandNormalMesh: THREE.Group;
  leftHandStrapMesh: THREE.Group;
  rightShoulder: THREE.Bone;
  rightElbow: THREE.Bone;
  rightHandGrp: THREE.Group;
  rightHandNormalMesh: THREE.Group;
  rightHandStrapMesh: THREE.Group;
  leftHip: THREE.Bone;
  leftKnee: THREE.Bone;
  leftAnkle: THREE.Group;
  rightHip: THREE.Bone;
  rightKnee: THREE.Bone;
  rightAnkle: THREE.Group;
  // Wind-driven secondary cloth & hair bones
  coatTailBone: THREE.Bone;
  scarfTailBone: THREE.Group | null;
  scarfSideTailBone: THREE.Group | null;
  hairTailBone: THREE.Group | null;
  jacketFlapLeft: THREE.Group | null;
  jacketFlapRight: THREE.Group | null;
  // Articulated 3D eyes, eyelids & brows for natural blinking, saccades & micro-expressions
  eyelidLeft: THREE.Object3D;
  eyelidRight: THREE.Object3D;
  eyeballLeft: THREE.Object3D;
  eyeballRight: THREE.Object3D;
  browLeft: THREE.Object3D;
  browRight: THREE.Object3D;
  // Per-rig GPU wind cloth shader uniform (smoothly matches indoor cabin vs outdoor gusts!)
  windUniform: { value: number };
  // Lifelike commuter activity props (newspaper, glowing phone, strictly ONE cigarette + ember + rising smoke + ambient haze!)
  activity: CommuterActivityType;
  newspaperProp: THREE.Group | null;
  phoneProp: THREE.Group | null;
  cigaretteProp: THREE.Group | null;
  cigEmberMat: THREE.MeshStandardMaterial | null;
  smokePuffs: THREE.Sprite[];
  ambientSmokeClouds: THREE.Sprite[];
  build: HumanBuildType;
  outfit: OutfitStyleType;
  heightScale: number;
  standingPelvisY: number;
  seatedPelvisY: number;
}

// Soft billowing wispy tobacco smoke cloud texture (cached ONCE globally — zero per-rig allocations!)
let _sharedSmokeCloudTex: THREE.CanvasTexture | null = null;
function getSmokeCloudTexture(): THREE.CanvasTexture {
  if (_sharedSmokeCloudTex) return _sharedSmokeCloudTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);
  const lobes: [number, number, number, number][] = [
    [64, 64, 52, 0.34],
    [48, 56, 36, 0.24],
    [80, 60, 34, 0.22],
    [60, 44, 32, 0.20],
    [68, 78, 34, 0.18],
    [42, 72, 26, 0.14],
  ];
  for (const [lx, ly, r, a] of lobes) {
    const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, r);
    g.addColorStop(0, `rgba(218, 226, 236, ${a})`);
    g.addColorStop(0.45, `rgba(196, 208, 222, ${a * 0.58})`);
    g.addColorStop(0.78, `rgba(176, 190, 208, ${a * 0.16})`);
    g.addColorStop(1, 'rgba(170, 185, 205, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  _sharedSmokeCloudTex = tex;
  return tex;
}

// =========================================================================
// SHARED GPU WIND CLOTH SHADER (PBR-preserving travelling wind waves!)
// =========================================================================
export const CLOTH_WIND_TIME_UNIFORM = { value: 0 };

export function applyClothWindShader(
  mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
  windStrengthUniform: { value: number },
  cacheTag = 'cloth-wind-pbr-v4'
): void {
  mat.customProgramCacheKey = () => cacheTag;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uClothTime = CLOTH_WIND_TIME_UNIFORM;
    shader.uniforms.uClothWind = windStrengthUniform;

    shader.vertexShader =
      `attribute float aClothWind;\nuniform float uClothTime;\nuniform float uClothWind;\n` +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      {
        float cwN = aClothWind * max(uClothWind, 0.16);
        if (cwN > 0.0005) {
          #ifdef USE_INSTANCING
            vec3 wOrigN = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #else
            vec3 wOrigN = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
          #endif
          float wPhN = wOrigN.x * 0.37 + wOrigN.z * 0.53;
          float gustN = 0.62 + 0.38 * sin(uClothTime * 1.45 + wPhN);
          float ph1 = uClothTime * 5.2 - position.y * 11.2 + position.x * 7.2 + wPhN * 1.7;
          float ph2 = uClothTime * 8.6 - position.y * 16.5 - position.z * 8.8 + wPhN * 2.3;
          float ph3 = uClothTime * 3.4 + position.y * 6.8 + position.x * 11.0 + wPhN * 1.1;
          float dRippleDy = (-11.2 * cos(ph1) + 16.5 * 0.46 * sin(ph2) + 6.8 * 0.28 * cos(ph3)) * gustN;
          float dRippleDx = (7.2 * cos(ph1) + 11.0 * 0.28 * cos(ph3)) * gustN;
          float nAmp = cwN * 0.054;
          objectNormal = normalize(objectNormal + vec3(-dRippleDx * nAmp * 0.55, dRippleDy * nAmp * 0.42, dRippleDy * nAmp * 0.28));
        }
      }`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        float cw = aClothWind * max(uClothWind, 0.16);
        if (cw > 0.0005) {
          #ifdef USE_INSTANCING
            vec3 wOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          #else
            vec3 wOrigin = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
          #endif
          float wPhase = wOrigin.x * 0.37 + wOrigin.z * 0.53;
          float gustEnv = 0.62 + 0.38 * sin(uClothTime * 1.45 + wPhase);
          float w1 = sin(uClothTime * 5.2 - position.y * 11.2 + position.x * 7.2 + wPhase * 1.7);
          float w2 = cos(uClothTime * 8.6 - position.y * 16.5 - position.z * 8.8 + wPhase * 2.3) * 0.46;
          float w3 = sin(uClothTime * 3.4 + position.y * 6.8 + position.x * 11.0 + wPhase * 1.1) * 0.28;
          float wMacro = sin(uClothTime * 2.25 + position.x * 3.8 + wPhase) * 0.34;
          float ripple = (w1 + w2 + w3) * gustEnv;
          transformed.z -= cw * (0.044 * gustEnv * uClothWind + 0.048 * ripple);
          transformed.x += cw * (0.036 * ripple + 0.024 * wMacro);
          transformed.y += cw * abs(ripple) * 0.015;
        }
      }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      {
        vec3 cN = normalize(normal);
        vec3 cV = normalize(vViewPosition);
        float cNdotV = clamp(dot(cN, cV), 0.0, 1.0);
        float clothRim = pow(1.0 - cNdotV, 2.8);
        float luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor.rgb += gl_FragColor.rgb * clothRim * 0.22 + vec3(0.018, 0.022, 0.032) * (1.0 - smoothstep(0.05, 0.45, luma));
      }
      #include <dithering_fragment>`
    );
  };
}

function tagClothWindAttr(
  geo: THREE.BufferGeometry,
  weightFn: (x: number, y: number, z: number) => number
): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    arr[i] = weightFn(pos.getX(i), pos.getY(i), pos.getZ(i));
  }
  geo.setAttribute('aClothWind', new THREE.BufferAttribute(arr, 1));
  return geo;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// =========================================================================
// SHARED WARDROBE / PROP / HAIR GEOMETRY HELPERS (for dressed attachments)
// =========================================================================
interface LoftRing {
  y: number;
  rx: number;
  rz: number;
  xShift?: number;
  zShift?: number;
  frontBulge?: number;
  backBulge?: number;
  foldAmp?: number;
  foldFreq?: number;
  creaseAmp?: number;
  windWeight?: number;
}

function buildDrapedLoft(rings: LoftRing[], radialSegs = 24, foldPhase = 0): THREE.BufferGeometry {
  const numRings = rings.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const winds: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < numRings; r++) {
    const ring = rings[r];
    const v = r / Math.max(1, numRings - 1);
    const xShift = ring.xShift ?? 0;
    const zShift = ring.zShift ?? 0;
    const fBulge = ring.frontBulge ?? 0;
    const bBulge = ring.backBulge ?? 0;
    const foldAmp = ring.foldAmp ?? 0;
    const foldFreq = ring.foldFreq ?? 6;
    const creaseAmp = ring.creaseAmp ?? 0;
    const windW = ring.windWeight ?? 0;

    for (let s = 0; s <= radialSegs; s++) {
      const u = s / radialSegs;
      const theta = (u - 0.5) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      let foldScale = 1.0;
      if (foldAmp > 0) {
        const w1 = Math.sin(theta * foldFreq + v * 4.2 + foldPhase);
        const w2 = Math.sin(theta * (foldFreq * 1.5 - 1) - v * 6.5 + foldPhase * 1.7) * 0.45;
        const w3 = Math.cos(v * Math.PI * 5.0 + theta * 2.0 + foldPhase) * creaseAmp;
        foldScale += (w1 + w2) * foldAmp + w3;
      }

      const x = sinT * ring.rx * foldScale + xShift;
      let z = cosT * ring.rz * foldScale + zShift;

      if (cosT > 0 && fBulge !== 0) z += Math.pow(cosT, 1.8) * fBulge;
      if (cosT < 0 && bBulge !== 0) z -= Math.pow(-cosT, 1.8) * bBulge;

      positions.push(x, ring.y, z);
      uvs.push(u, 1 - v);
      winds.push(windW);
    }
  }

  const stride = radialSegs + 1;
  for (let r = 0; r < numRings - 1; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = (r + 1) * stride + s;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aClothWind', new THREE.Float32BufferAttribute(winds, 1));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function mergeStaticGeometries(geos: THREE.BufferGeometry[], includeWind = false): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;
  for (let g = 0; g < geos.length; g++) {
    totalVerts += geos[g].attributes.position.count;
    totalIndices += geos[g].index ? geos[g].index!.count : geos[g].attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const winds = includeWind ? new Float32Array(totalVerts) : null;
  const indices = new Uint32Array(totalIndices);

  let vOff = 0;
  let iOff = 0;
  for (let g = 0; g < geos.length; g++) {
    const geo = geos[g];
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const cw = geo.attributes.aClothWind;
    const count = pos.count;

    positions.set(pos.array as Float32Array, vOff * 3);
    normals.set(norm.array as Float32Array, vOff * 3);
    if (uv) {
      uvs.set(uv.array as Float32Array, vOff * 2);
    }
    if (winds) {
      if (cw) {
        winds.set(cw.array as Float32Array, vOff);
      } else {
        winds.fill(0, vOff, vOff + count);
      }
    }

    if (geo.index) {
      const idxArr = geo.index.array;
      for (let k = 0; k < idxArr.length; k++) {
        indices[iOff + k] = idxArr[k] + vOff;
      }
      iOff += idxArr.length;
    } else {
      for (let k = 0; k < count; k++) {
        indices[iOff + k] = vOff + k;
      }
      iOff += count;
    }
    vOff += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  if (winds) merged.setAttribute('aClothWind', new THREE.BufferAttribute(winds, 1));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

function createDrapedScarfWrapGeometry(): THREE.BufferGeometry {
  const rings: LoftRing[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = THREE.MathUtils.lerp(-0.105, 0.055, t);
    const ease = Math.sin(t * Math.PI);
    const rx = THREE.MathUtils.lerp(0.155, 0.092, Math.pow(t, 0.72)) + ease * 0.014;
    const rz = THREE.MathUtils.lerp(0.140, 0.090, Math.pow(t, 0.72)) + ease * 0.016;
    rings.push({
      y,
      rx,
      rz,
      xShift: Math.sin(t * Math.PI * 1.4) * 0.012 + (1 - t) * 0.012,
      zShift: 0.012 + (1 - t) * 0.02,
      frontBulge: Math.pow(1 - t, 1.25) * 0.042,
      backBulge: (1 - t) * 0.012,
      foldAmp: 0.055 + (1 - t) * 0.064,
      foldFreq: 7,
      creaseAmp: 0.03,
      windWeight: Math.pow(1 - t, 1.5) * 0.36,
    });
  }
  return buildDrapedLoft(rings, 24, 0.85);
}

function createSculptedBackpackGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bodyGeo = new THREE.SphereGeometry(1, 20, 12);
  const bPos = bodyGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const nx = bPos.getX(i);
    const ny = bPos.getY(i);
    const nz = bPos.getZ(i);
    const tUp = (ny + 1) * 0.5;
    const widthProfile = 0.144 * (1.06 - Math.pow(tUp, 1.55) * 0.28);
    const depthProfile = 0.092 * (1.12 - Math.pow(tUp, 1.4) * 0.34);
    const sqX = Math.sign(nx) * Math.pow(Math.abs(nx), 0.84);
    let sqZ = Math.sign(nz) * Math.pow(Math.abs(nz), 0.84);
    if (sqZ > 0) sqZ *= 0.42;
    bPos.setXYZ(i, sqX * widthProfile, ny * 0.19, sqZ * depthProfile);
  }
  bodyGeo.computeVertexNormals();
  parts.push(bodyGeo);

  const pocketGeo = new THREE.SphereGeometry(1, 16, 8);
  const pPos = pocketGeo.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const nx = pPos.getX(i);
    const ny = pPos.getY(i);
    const nz = pPos.getZ(i);
    pPos.setXYZ(i, nx * 0.11, ny * 0.08 - 0.07, (nz > 0 ? nz * 0.25 : nz) * 0.044 - 0.086);
  }
  pocketGeo.computeVertexNormals();
  parts.push(pocketGeo);

  for (const sx of [-1, 1]) {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.068, 0.165, 0.028),
      new THREE.Vector3(sx * 0.128, 0.185, 0.095),
      new THREE.Vector3(sx * 0.148, 0.105, 0.175),
      new THREE.Vector3(sx * 0.156, -0.055, 0.168),
      new THREE.Vector3(sx * 0.112, -0.148, 0.012),
    ]);
    parts.push(new THREE.TubeGeometry(strapCurve, 14, 0.015, 6, false));
  }
  return mergeStaticGeometries(parts, false);
}

function createCoatSkirtGeometry(length: number, widthScale: number): THREE.BufferGeometry {
  return buildDrapedLoft(
    [
      { y: -length, rx: 0.208 * widthScale, rz: 0.172 * widthScale, backBulge: 0.026, foldAmp: 0.068, foldFreq: 9, windWeight: 1.0 },
      { y: -length * 0.7, rx: 0.194 * widthScale, rz: 0.160 * widthScale, backBulge: 0.020, foldAmp: 0.052, foldFreq: 9, windWeight: 0.68 },
      { y: -length * 0.38, rx: 0.180 * widthScale, rz: 0.146 * widthScale, backBulge: 0.014, foldAmp: 0.036, foldFreq: 8, windWeight: 0.34 },
      { y: 0.06, rx: 0.165 * widthScale, rz: 0.130 * widthScale, foldAmp: 0.012, foldFreq: 6, windWeight: 0.0 },
    ],
    20,
    0.4
  );
}

function createJacketFlapGeometry(sideSign: -1 | 1): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.132, 0.44, 4, 10);
  const pos = geo.attributes.position;
  const winds = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const tDown = THREE.MathUtils.clamp(0.5 - y / 0.44, 0, 1);
    const curveZ = -Math.pow((x * sideSign + 0.055) * 4.2, 2) * 0.009;
    const rippleZ = Math.sin(tDown * Math.PI * 3.2 + sideSign) * 0.008 * tDown;
    pos.setXYZ(i, x, y - 0.22, curveZ + rippleZ);
    winds[i] = Math.pow(tDown, 1.2) * 0.95;
  }
  geo.setAttribute('aClothWind', new THREE.BufferAttribute(winds, 1));
  geo.computeVertexNormals();
  return geo;
}

function buildSmoothHairCrown(
  rxScale = 0.95,
  ryScale = 1.04,
  rzScale = 1.06,
  coverage = Math.PI * 0.58,
  partOffsetX = 0.018
): THREE.BufferGeometry {
  // Generous crown radius + rearward offset (-0.017 Z, +0.064 Y) so no MakeHuman occiput/crown pokes through
  const geo = new THREE.SphereGeometry(0.109, 24, 14, 0, Math.PI * 2, 0, coverage);
  const pos = geo.attributes.position;
  const winds = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const frontLift = z > 0.025 ? Math.pow(z / 0.109, 1.55) * 0.018 : 0;
    const templeCurve =
      z > 0.0 && Math.abs(x) > 0.04 ? Math.sin((Math.abs(x) / 0.109) * Math.PI) * 0.005 : 0;
    const partDip =
      y > 0.045
        ? Math.exp(-Math.pow((x - partOffsetX) * 44.0, 2)) * smoothstep(0.045, 0.088, y) * 0.0044
        : 0;
    const lowerT = THREE.MathUtils.clamp((0.03 - y) / 0.07, 0, 1);
    pos.setXYZ(
      i,
      x * rxScale * 1.03,
      y * ryScale * 1.09 + 0.064 + frontLift - templeCurve - partDip,
      z * rzScale * 1.08 - 0.017
    );
    winds[i] = lowerT * 0.06;
  }
  geo.setAttribute('aClothWind', new THREE.BufferAttribute(winds, 1));
  geo.computeVertexNormals();
  return geo;
}

function buildFlowingHairRibbon(
  length: number,
  topW: number,
  botW: number,
  archZ: number,
  sweepX: number,
  windMax: number,
  wavePhase = 0
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1, length, 6, 12);
  const pos = geo.attributes.position;
  const winds = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const y = pos.getY(i);
    const tDown = THREE.MathUtils.clamp(0.5 - y / length, 0, 1);
    const tipFeather = Math.pow(Math.max(0.04, 1.0 - Math.pow(tDown, 2.35)), 0.62);
    const w = THREE.MathUtils.lerp(topW, botW, Math.pow(tDown, 0.78)) * tipFeather;
    const sWaveX = Math.sin(tDown * Math.PI * 2.2 + wavePhase) * 0.007 * Math.pow(tDown, 1.15);
    const x = u * w + sweepX * Math.pow(tDown, 1.32) + sWaveX;
    const curveZ = -Math.pow(u * 2, 2) * (0.014 * (1 - tDown * 0.45)) + Math.sin(tDown * Math.PI) * archZ - tDown * 0.014;
    const softWave = Math.sin(tDown * Math.PI * 2.6 + u * 3.4 + wavePhase) * 0.0048 * Math.pow(tDown, 0.9);
    pos.setXYZ(i, x, -tDown * length, curveZ + softWave);
    winds[i] = Math.pow(tDown, 1.25) * windMax;
  }
  geo.setAttribute('aClothWind', new THREE.BufferAttribute(winds, 1));
  geo.computeVertexNormals();
  return geo;
}

function buildHeadwearGeometries(
  style: HairStyleType,
  outfit: OutfitStyleType
): { hairGeo: THREE.BufferGeometry | null; hatGeo: THREE.BufferGeometry | null; tailGeo: THREE.BufferGeometry | null } {
  // All coordinates are in MakeHuman `head` bone local space (head bone sits at base of skull, ~0.044m lower than old head group)
  if (outfit === 'rail_engineer') {
    const hairUnder = buildSmoothHairCrown(0.95, 1.01, 1.04, Math.PI * 0.56, 0.0);
    const helmet = new THREE.SphereGeometry(0.122, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.56);
    helmet.scale(1.01, 1.08, 1.16);
    helmet.translate(0, 0.082, -0.014);
    const brim = new THREE.TorusGeometry(0.114, 0.012, 8, 22);
    brim.rotateX(Math.PI * 0.5);
    brim.scale(1.01, 1.0, 1.15);
    brim.translate(0, 0.080, -0.004);
    const ridge = new THREE.CapsuleGeometry(0.016, 0.14, 6, 12);
    ridge.rotateX(Math.PI * 0.5);
    ridge.translate(0, 0.192, -0.014);
    return { hairGeo: hairUnder, hatGeo: mergeStaticGeometries([helmet, brim, ridge], false), tailGeo: null };
  }

  if (outfit === 'soviet_soldier') {
    const hairUnder = buildSmoothHairCrown(0.95, 1.01, 1.04, Math.PI * 0.56, 0.0);
    const crown = new THREE.CylinderGeometry(0.124, 0.114, 0.092, 18);
    crown.scale(1.02, 1, 1.14);
    crown.translate(0, 0.124, -0.016);
    const frontCuff = new THREE.BoxGeometry(0.168, 0.076, 0.042);
    frontCuff.translate(0, 0.122, 0.094);
    const parts: THREE.BufferGeometry[] = [crown, frontCuff];
    for (const sx of [-1, 1]) {
      const flap = new THREE.BoxGeometry(0.036, 0.096, 0.096);
      flap.translate(sx * 0.114, 0.096, -0.016);
      parts.push(flap);
    }
    return { hairGeo: hairUnder, hatGeo: mergeStaticGeometries(parts, false), tailGeo: null };
  }

  if (outfit === 'pow_prisoner') {
    const hairUnder = buildSmoothHairCrown(0.94, 0.99, 1.02, Math.PI * 0.55, 0.0);
    const cap = new THREE.SphereGeometry(0.116, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
    cap.scale(1.0, 1.05, 1.14);
    cap.translate(0, 0.084, -0.016);
    return { hairGeo: hairUnder, hatGeo: cap, tailGeo: null };
  }

  if (outfit === 'metro_worker' || outfit === 'transit_security') {
    const hairUnder = buildSmoothHairCrown(0.96, 1.02, 1.05, Math.PI * 0.58, 0.01);
    const crown = new THREE.CylinderGeometry(0.120, 0.106, 0.072, 20);
    crown.scale(1.01, 1, 1.14);
    crown.translate(0, 0.116, -0.016);
    const topDome = new THREE.SphereGeometry(0.118, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.36);
    topDome.scale(1.01, 0.58, 1.14);
    topDome.translate(0, 0.138, -0.016);
    const visor = new THREE.CylinderGeometry(0.096, 0.106, 0.012, 16, 1, false, -Math.PI * 0.38, Math.PI * 0.76);
    visor.rotateX(0.16);
    visor.translate(0, 0.084, 0.052);
    return { hairGeo: hairUnder, hatGeo: mergeStaticGeometries([crown, topDome, visor], false), tailGeo: null };
  }

  if (style === 'knit_beanie') {
    const dome = new THREE.SphereGeometry(0.114, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.58);
    dome.scale(0.99, 1.18, 1.14);
    dome.translate(0, 0.068, -0.016);
    const cuff = new THREE.TorusGeometry(0.103, 0.018, 10, 20);
    cuff.rotateX(Math.PI * 0.5 - 0.14);
    cuff.scale(0.98, 1.0, 1.12);
    cuff.translate(0, 0.088, -0.016);
    const underFlow = buildDrapedLoft(
      [
        { y: -0.160, rx: 0.106, rz: 0.058, zShift: -0.052, foldAmp: 0.09, foldFreq: 9, windWeight: 0.8 },
        { y: -0.085, rx: 0.108, rz: 0.072, zShift: -0.042, foldAmp: 0.06, foldFreq: 8, windWeight: 0.45 },
        { y: 0.020, rx: 0.096, rz: 0.088, zShift: -0.016, windWeight: 0.0 },
      ],
      18
    );
    return { hairGeo: null, hatGeo: mergeStaticGeometries([dome, cuff], false), tailGeo: underFlow };
  }

  if (style === 'newsboy_cap') {
    const crown = new THREE.SphereGeometry(0.118, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.57);
    crown.scale(1.04, 0.90, 1.16);
    crown.translate(0, 0.086, -0.016);
    const brim = new THREE.CylinderGeometry(0.092, 0.102, 0.010, 14, 1, false, -Math.PI * 0.36, Math.PI * 0.72);
    brim.rotateX(0.18);
    brim.translate(0, 0.084, 0.054);
    const hairCrown = buildSmoothHairCrown(0.96, 0.98, 1.04, Math.PI * 0.58, 0.01);
    return { hairGeo: hairCrown, hatGeo: mergeStaticGeometries([crown, brim], false), tailGeo: null };
  }

  if (style === 'short_cropped' || style === 'side_part') {
    const partX = style === 'side_part' ? -0.036 : 0.012;
    const crown = buildSmoothHairCrown(0.955, 1.04, 1.06, Math.PI * 0.58, partX);
    const fringe = buildFlowingHairRibbon(0.082, 0.118, 0.064, 0.018, style === 'side_part' ? 0.036 : 0.018, 0.45, 0.4);
    fringe.rotateZ(0.08);
    fringe.rotateY(style === 'side_part' ? 0.24 : 0.08);
    fringe.rotateX(-0.36);
    fringe.translate(style === 'side_part' ? 0.012 : 0.0, 0.136, 0.066);

    const napeFlow = buildDrapedLoft(
      [
        { y: -0.102, rx: 0.086, rz: 0.048, zShift: -0.048, foldAmp: 0.08, foldFreq: 10, windWeight: 0.54 },
        { y: -0.045, rx: 0.095, rz: 0.062, zShift: -0.036, foldAmp: 0.06, foldFreq: 9, windWeight: 0.32 },
        { y: 0.055, rx: 0.096, rz: 0.092, zShift: -0.014, windWeight: 0.0 },
      ],
      18
    );
    return { hairGeo: mergeStaticGeometries([crown, fringe], true), hatGeo: null, tailGeo: napeFlow };
  }

  if (style === 'long_flowing') {
    const crown = buildSmoothHairCrown(0.975, 1.055, 1.07, Math.PI * 0.6, 0.012);
    const hairParts: THREE.BufferGeometry[] = [crown];
    for (const sx of [-1, 1]) {
      const sideLock = buildFlowingHairRibbon(0.285, 0.068, 0.034, 0.018, sx * -0.016, 0.88, sx * 0.9);
      sideLock.rotateZ(sx * -0.05);
      sideLock.rotateY(sx * 1.24);
      sideLock.rotateX(0.06);
      sideLock.translate(sx * 0.086, 0.104, 0.016);
      hairParts.push(sideLock);

      const bang = buildFlowingHairRibbon(0.095, 0.068, 0.028, 0.018, sx * 0.028, 0.42, sx * 0.6);
      bang.rotateZ(sx * -0.16);
      bang.rotateY(sx * 0.36);
      bang.rotateX(-0.34);
      bang.translate(sx * 0.024, 0.136, 0.066);
      hairParts.push(bang);
    }
    const backCurtain = buildDrapedLoft(
      [
        { y: -0.35, rx: 0.110, rz: 0.040, zShift: -0.066, foldAmp: 0.13, foldFreq: 11, windWeight: 1.0 },
        { y: -0.24, rx: 0.128, rz: 0.056, zShift: -0.050, foldAmp: 0.09, foldFreq: 10, windWeight: 0.72 },
        { y: -0.11, rx: 0.114, rz: 0.072, zShift: -0.029, foldAmp: 0.05, foldFreq: 9, windWeight: 0.28 },
        { y: 0.015, rx: 0.095, rz: 0.086, zShift: -0.006, windWeight: 0.0 },
      ],
      22
    );
    return { hairGeo: mergeStaticGeometries(hairParts, true), hatGeo: null, tailGeo: backCurtain };
  }

  if (style === 'bob_cut') {
    const crown = buildSmoothHairCrown(0.97, 1.05, 1.065, Math.PI * 0.6, -0.016);
    const hairParts: THREE.BufferGeometry[] = [crown];
    for (const sx of [-1, 1]) {
      const sideFlow = buildFlowingHairRibbon(0.18, 0.066, 0.036, 0.018, sx * -0.012, 0.7, sx * 0.8);
      sideFlow.rotateZ(sx * -0.05);
      sideFlow.rotateY(sx * 1.24);
      sideFlow.rotateX(0.05);
      sideFlow.translate(sx * 0.088, 0.102, 0.018);
      hairParts.push(sideFlow);
    }
    const bobCurtain = buildDrapedLoft(
      [
        { y: -0.17, rx: 0.108, rz: 0.062, zShift: -0.042, foldAmp: 0.09, foldFreq: 11, windWeight: 0.8 },
        { y: -0.08, rx: 0.116, rz: 0.082, zShift: -0.026, foldAmp: 0.05, foldFreq: 10, windWeight: 0.34 },
        { y: 0.018, rx: 0.098, rz: 0.093, zShift: -0.008, windWeight: 0.0 },
      ],
      22
    );
    return { hairGeo: mergeStaticGeometries(hairParts, true), hatGeo: null, tailGeo: bobCurtain };
  }

  // ponytail
  const crown = buildSmoothHairCrown(0.955, 1.045, 1.06, Math.PI * 0.6, 0.0);
  const tail = buildDrapedLoft(
    [
      { y: -0.32, rx: 0.022, rz: 0.020, zShift: -0.066, foldAmp: 0.11, foldFreq: 8, windWeight: 1.0 },
      { y: -0.18, rx: 0.052, rz: 0.052, zShift: -0.042, foldAmp: 0.06, foldFreq: 8, windWeight: 0.5 },
      { y: 0.0, rx: 0.024, rz: 0.024, zShift: 0.0, windWeight: 0.0 },
    ],
    16
  );
  return { hairGeo: crown, hatGeo: null, tailGeo: tail };
}

export interface SharedHumanGeometries {
  jacketFlapLeft: THREE.BufferGeometry;
  jacketFlapRight: THREE.BufferGeometry;
  scarfWrap: THREE.BufferGeometry;
  scarfTail: THREE.BufferGeometry;
  scarfSideTail: THREE.BufferGeometry;
  coatSkirtMid: THREE.BufferGeometry;
  coatSkirtLong: THREE.BufferGeometry;
  collarLapel: THREE.BufferGeometry;
  hoodDrape: THREE.BufferGeometry;
  backpack: THREE.BufferGeometry;
  briefcase: THREE.BufferGeometry;
  newspaperSheet: THREE.BufferGeometry;
  phoneBody: THREE.BufferGeometry;
  phoneScreen: THREE.BufferGeometry;
  cigBody: THREE.BufferGeometry;
  cigFilter: THREE.BufferGeometry;
  cigEmber: THREE.BufferGeometry;
  headwearCache: Map<
    string,
    { hairGeo: THREE.BufferGeometry | null; hatGeo: THREE.BufferGeometry | null; tailGeo: THREE.BufferGeometry | null }
  >;
}

let cachedGeos: SharedHumanGeometries | null = null;

function createCurvedNewspaperGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.42, 0.31, 8, 5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const foldZ = Math.abs(x) * 0.24 - Math.pow(Math.abs(x), 2) * 0.35;
    const droopZ = Math.max(0, y) * 0.088 * (0.42 + Math.abs(x) * 2.1);
    pos.setZ(i, foldZ + droopZ);
  }
  geo.computeVertexNormals();
  return geo;
}

export function getSharedHumanGeometries(): SharedHumanGeometries {
  if (cachedGeos) return cachedGeos;

  const briefBody = new THREE.BoxGeometry(0.088, 0.28, 0.36);
  briefBody.translate(0, -0.21, 0);
  const briefHandleTop = new THREE.CylinderGeometry(0.011, 0.011, 0.13, 8);
  briefHandleTop.rotateX(Math.PI * 0.5);
  briefHandleTop.translate(0, -0.012, 0);
  const briefPostF = new THREE.CylinderGeometry(0.009, 0.009, 0.068, 6);
  briefPostF.translate(0, -0.044, 0.06);
  const briefPostB = new THREE.CylinderGeometry(0.009, 0.009, 0.068, 6);
  briefPostB.translate(0, -0.044, -0.06);
  const briefcase = mergeStaticGeometries([briefBody, briefHandleTop, briefPostF, briefPostB], false);

  const scarfWrap = createDrapedScarfWrapGeometry();
  const scarfTail = buildDrapedLoft(
    [
      { y: -0.40, rx: 0.062, rz: 0.013, foldAmp: 0.22, foldFreq: 7, creaseAmp: 0.032, windWeight: 1.0 },
      { y: -0.24, rx: 0.056, rz: 0.017, foldAmp: 0.15, foldFreq: 6, creaseAmp: 0.024, windWeight: 0.58 },
      { y: -0.08, rx: 0.048, rz: 0.021, foldAmp: 0.08, foldFreq: 5, windWeight: 0.18 },
      { y: 0.01, rx: 0.042, rz: 0.022, windWeight: 0.0 },
    ],
    18
  );
  const scarfSideTail = buildDrapedLoft(
    [
      { y: -0.26, rx: 0.050, rz: 0.012, foldAmp: 0.18, foldFreq: 6, creaseAmp: 0.028, windWeight: 0.92 },
      { y: -0.13, rx: 0.046, rz: 0.016, foldAmp: 0.12, foldFreq: 5, windWeight: 0.42 },
      { y: 0.01, rx: 0.040, rz: 0.020, windWeight: 0.0 },
    ],
    16
  );

  const collarLapel = tagClothWindAttr(
    new THREE.TorusGeometry(0.112, 0.028, 10, 22, Math.PI * 1.48),
    () => 0.04
  );
  const hoodDrape = tagClothWindAttr(
    new THREE.SphereGeometry(0.124, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    (_x, y, z) => (z < -0.02 ? THREE.MathUtils.clamp((0.06 - y) * 3.0, 0, 0.45) : 0.05)
  );

  cachedGeos = {
    jacketFlapLeft: createJacketFlapGeometry(-1),
    jacketFlapRight: createJacketFlapGeometry(1),
    scarfWrap,
    scarfTail,
    scarfSideTail,
    coatSkirtMid: createCoatSkirtGeometry(0.36, 1.02),
    coatSkirtLong: createCoatSkirtGeometry(0.54, 1.06),
    collarLapel,
    hoodDrape,
    backpack: createSculptedBackpackGeometry(),
    briefcase,
    newspaperSheet: createCurvedNewspaperGeometry(),
    phoneBody: new THREE.BoxGeometry(0.0085, 0.068, 0.136),
    phoneScreen: new THREE.PlaneGeometry(0.061, 0.124),
    cigBody: new THREE.CylinderGeometry(0.0036, 0.0036, 0.054, 8),
    cigFilter: new THREE.CylinderGeometry(0.0038, 0.0038, 0.022, 8),
    cigEmber: new THREE.SphereGeometry(0.0042, 8, 8),
    headwearCache: new Map(),
  };
  return cachedGeos;
}

function getCachedHeadwear(
  geos: SharedHumanGeometries,
  style: HairStyleType,
  outfit: OutfitStyleType
) {
  const key =
    outfit === 'rail_engineer' ||
    outfit === 'soviet_soldier' ||
    outfit === 'pow_prisoner' ||
    outfit === 'metro_worker' ||
    outfit === 'transit_security'
      ? `outfit:${outfit}`
      : `hair:${style}`;
  let entry = geos.headwearCache.get(key);
  if (!entry) {
    entry = buildHeadwearGeometries(style, outfit);
    geos.headwearCache.set(key, entry);
  }
  return entry;
}

// =========================================================================
// MAKEHUMAN 50-BODY GLB POOL + 19-BONE SKELETON COLLAPSER + DRESSING SHADER
// =========================================================================
const KEPT_BONE_NAMES = [
  'root',
  'spine05',
  'spine01',
  'neck01',
  'head',
  'clavicle.L',
  'upperarm01.L',
  'lowerarm01.L',
  'wrist.L',
  'clavicle.R',
  'upperarm01.R',
  'lowerarm01.R',
  'wrist.R',
  'upperleg01.L',
  'lowerleg01.L',
  'foot.L',
  'upperleg01.R',
  'lowerleg01.R',
  'foot.R',
] as const;

type KeptBoneName = (typeof KEPT_BONE_NAMES)[number];
const KEPT_BONE_SET = new Set<string>(KEPT_BONE_NAMES);
const KEPT_BY_SANITIZED = new Map<string, KeptBoneName>(
  KEPT_BONE_NAMES.map((nm) => [THREE.PropertyBinding.sanitizeNodeName(nm), nm])
);

function mapAnyBoneToKept(name: string, parentByBoneName: Map<string, string | null>): KeptBoneName {
  let cur: string | null = name;
  while (cur) {
    if (KEPT_BONE_SET.has(cur)) return cur as KeptBoneName;
    cur = parentByBoneName.get(cur) ?? null;
  }
  return 'root';
}

interface PoolBoneRest {
  name: KeptBoneName;
  parentIdx: number; // -1 for root
  restPos: THREE.Vector3;
  restQuat: THREE.Quaternion;
  restScale: THREE.Vector3;
  worldRestQuat: THREE.Quaternion;
  parentWorldRestQuat: THREE.Quaternion;
  d0Delta: THREE.Quaternion; // zero-pose character-space alignment delta
}

interface LoadedPoolBody {
  entry: BodyManifestEntry;
  geometry: THREE.BufferGeometry;
  boneInverses: THREE.Matrix4[];
  bindMatrix: THREE.Matrix4;
  bones: PoolBoneRest[];
  rootY: number;
  seatedRootY: number;
  chestOffsetInRoot: THREE.Vector3;
  headOffsetInNeck: THREE.Vector3;
  neckOffsetInChest: THREE.Vector3;
  lShoulderInChest: THREE.Vector3;
  lElbowOffset: THREE.Vector3;
  lWristOffset: THREE.Vector3;
  rShoulderInChest: THREE.Vector3;
  rElbowOffset: THREE.Vector3;
  rWristOffset: THREE.Vector3;
  lHipInPelvis: THREE.Vector3;
  lKneeOffset: THREE.Vector3;
  lAnkleOffset: THREE.Vector3;
  rHipInPelvis: THREE.Vector3;
  rKneeOffset: THREE.Vector3;
  rAnkleOffset: THREE.Vector3;
  upperArmLen: number;
  forearmLen: number;
}

const _qNegY = new THREE.Vector3(0, -1, 0);
const _tmpVecA = new THREE.Vector3();
const _tmpVecB = new THREE.Vector3();
const _tmpMatA = new THREE.Matrix4();
const _tmpMatB = new THREE.Matrix4();

function bakeMorphsAndProcessPoolBody(
  entry: BodyManifestEntry,
  gltfScene: THREE.Object3D
): LoadedPoolBody {
  let srcMesh: THREE.SkinnedMesh | null = null;
  gltfScene.traverse((obj) => {
    if (!srcMesh && (obj as THREE.SkinnedMesh).isSkinnedMesh) {
      srcMesh = obj as THREE.SkinnedMesh;
    }
  });
  if (!srcMesh) {
    throw new Error(`No SkinnedMesh found in ${entry.file}`);
  }
  const mesh = srcMesh as THREE.SkinnedMesh;
  const geo = mesh.geometry.clone();
  gltfScene.updateMatrixWorld(true);

  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const normAttr = geo.attributes.normal as THREE.BufferAttribute;
  const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
  const skinIdxAttr = geo.attributes.skinIndex as THREE.BufferAttribute;
  const skinWgtAttr = geo.attributes.skinWeight as THREE.BufferAttribute;
  const vertCount = posAttr.count;

  // 1. Save pre-morph canonical bind-pose positions (uniform ~1.694m frame across all 50 bodies)
  const canonPos = new Float32Array(posAttr.array as Float32Array);

  // Strip MakeHuman rig-joint gizmo cubes, eyelash/cornea blockers, and helper shells (helper-tights/skirt/shoes)
  const indexAttr = geo.getIndex();
  if (indexAttr) {
    const dsuParent = new Int32Array(vertCount);
    const dsuSize = new Int32Array(vertCount);
    for (let i = 0; i < vertCount; i++) {
      dsuParent[i] = i;
      dsuSize[i] = 1;
    }
    const findRoot = (x: number): number => {
      while (dsuParent[x] !== x) {
        dsuParent[x] = dsuParent[dsuParent[x]];
        x = dsuParent[x];
      }
      return x;
    };
    const unionVerts = (a: number, b: number) => {
      const ra = findRoot(a);
      const rb = findRoot(b);
      if (ra === rb) return;
      if (dsuSize[ra] < dsuSize[rb]) {
        dsuParent[ra] = rb;
        dsuSize[rb] += dsuSize[ra];
      } else {
        dsuParent[rb] = ra;
        dsuSize[ra] += dsuSize[rb];
      }
    };
    const idxCount = indexAttr.count;
    for (let t = 0; t < idxCount; t += 3) {
      const a = indexAttr.getX(t);
      const b = indexAttr.getX(t + 1);
      const c = indexAttr.getX(t + 2);
      unionVerts(a, b);
      unionVerts(a, c);
    }
    const rootMinU = new Float32Array(vertCount).fill(1);
    const rootMaxV = new Float32Array(vertCount).fill(0);
    for (let i = 0; i < vertCount; i++) {
      const r = findRoot(i);
      const u = uvAttr ? uvAttr.getX(i) : 0.5;
      const v = uvAttr ? uvAttr.getY(i) : 0.5;
      if (u < rootMinU[r]) rootMinU[r] = u;
      if (v > rootMaxV[r]) rootMaxV[r] = v;
    }
    const keepVert = new Uint8Array(vertCount);
    for (let i = 0; i < vertCount; i++) {
      const r = findRoot(i);
      const isHelperUvShell = rootMinU[r] >= 0.80 && rootMaxV[r] <= 0.14;
      if (dsuSize[r] >= 68 && !isHelperUvShell) {
        keepVert[i] = 1;
      }
    }
    const keptTris: number[] = [];
    for (let t = 0; t < idxCount; t += 3) {
      const a = indexAttr.getX(t);
      const b = indexAttr.getX(t + 1);
      const c = indexAttr.getX(t + 2);
      if (keepVert[a] && keepVert[b] && keepVert[c]) {
        keptTris.push(a, b, c);
      }
    }
    geo.setIndex(keptTris);
  }

  // 2. Bake static morphTargetInfluences into position & normal so unique builds/faces/heights stay exact without morph overhead
  const influences = mesh.morphTargetInfluences;
  const morphPos = geo.morphAttributes.position as THREE.BufferAttribute[] | undefined;
  const morphNorm = geo.morphAttributes.normal as THREE.BufferAttribute[] | undefined;
  if (influences && morphPos && morphPos.length > 0) {
    const posArr = posAttr.array as Float32Array;
    const normArr = normAttr ? (normAttr.array as Float32Array) : null;
    const relative = geo.morphTargetsRelative !== false;
    for (let t = 0; t < morphPos.length; t++) {
      const w = influences[t] ?? 0;
      if (Math.abs(w) < 1e-6) continue;
      const mP = morphPos[t].array as Float32Array;
      const mN = morphNorm?.[t]?.array as Float32Array | undefined;
      for (let i = 0; i < posArr.length; i++) {
        posArr[i] += relative ? w * mP[i] : w * (mP[i] - canonPos[i]);
      }
      if (normArr && mN) {
        for (let i = 0; i < normArr.length; i++) {
          normArr[i] += w * mN[i];
        }
      }
    }
    if (normAttr) {
      const na = normAttr.array as Float32Array;
      for (let i = 0; i < vertCount; i++) {
        const ix = i * 3;
        const l = Math.hypot(na[ix], na[ix + 1], na[ix + 2]) || 1;
        na[ix] /= l;
        na[ix + 1] /= l;
        na[ix + 2] /= l;
      }
      normAttr.needsUpdate = true;
    }
    posAttr.needsUpdate = true;
  }
  geo.morphAttributes = {};
  geo.setAttribute('aCanonPos', new THREE.BufferAttribute(canonPos, 3));

  // 3. Build parent map across all 163 source bones and collapse to the 19 active bones
  const srcSkel = mesh.skeleton;
  const srcBones = srcSkel.bones;
  const parentNameMap = new Map<string, string | null>();
  const srcBoneByName = new Map<string, THREE.Bone>();
  const srcBoneIndexByName = new Map<string, number>();

  for (let i = 0; i < srcBones.length; i++) {
    const b = srcBones[i];
    const canonName = KEPT_BY_SANITIZED.get(b.name) ?? b.name;
    srcBoneByName.set(canonName, b);
    srcBoneIndexByName.set(canonName, i);
    const pRaw = b.parent && (b.parent as THREE.Bone).isBone ? b.parent.name : null;
    const pCanon = pRaw ? (KEPT_BY_SANITIZED.get(pRaw) ?? pRaw) : null;
    parentNameMap.set(canonName, pCanon);
  }

  const keptIndexByName = new Map<KeptBoneName, number>();
  KEPT_BONE_NAMES.forEach((nm, idx) => keptIndexByName.set(nm, idx));

  const srcToKeptIdx = new Int16Array(srcBones.length);
  for (let i = 0; i < srcBones.length; i++) {
    const canonName = KEPT_BY_SANITIZED.get(srcBones[i].name) ?? srcBones[i].name;
    const keptName = mapAnyBoneToKept(canonName, parentNameMap);
    srcToKeptIdx[i] = keptIndexByName.get(keptName) ?? 0;
  }

  // 4. Tag garment zones (0=skin, 1=eyeball, 2=mouth, 3=jacket/sleeves, 4=trousers, 5=boots)
  const zoneArr = new Float32Array(vertCount);
  for (let i = 0; i < vertCount; i++) {
    const cx = canonPos[i * 3];
    const cy = canonPos[i * 3 + 1];
    const cz = canonPos[i * 3 + 2];
    const u = uvAttr ? uvAttr.getX(i) : 0.5;
    const v = uvAttr ? uvAttr.getY(i) : 0.5;

    // Dominant original bone name
    let bestSrcJ = skinIdxAttr.getX(i);
    let bestW = skinWgtAttr.getX(i);
    if (skinWgtAttr.getY(i) > bestW) {
      bestW = skinWgtAttr.getY(i);
      bestSrcJ = skinIdxAttr.getY(i);
    }
    if (skinWgtAttr.getZ(i) > bestW) {
      bestW = skinWgtAttr.getZ(i);
      bestSrcJ = skinIdxAttr.getZ(i);
    }
    if (skinWgtAttr.getW(i) > bestW) {
      bestSrcJ = skinIdxAttr.getW(i);
    }
    const bName = srcBones[bestSrcJ]?.name ?? 'root';

    const isEyeBallUv = u < 0.16 && v > 0.34 && v < 0.48 && cy > 1.50 && cy < 1.59 && cz < 0.145;
    const isMouthInnerUv =
      (u > 0.60 && u < 0.66 && v < 0.09 && cy > 1.43) ||
      (u > 0.74 && u < 0.94 && v > 0.84 && cy > 1.43);
    const isHandBone =
      bName.startsWith('wrist') ||
      bName.startsWith('finger') ||
      bName.startsWith('thumb') ||
      bName.startsWith('metacarpal');
    const isFootBone = bName.startsWith('foot') || bName.startsWith('toe');
    const isHeadNeckBone =
      bName === 'head' ||
      bName === 'jaw' ||
      bName.startsWith('neck') ||
      bName.startsWith('eye.') ||
      bName === 'eyeL' ||
      bName === 'eyeR' ||
      bName.startsWith('orbicularis') ||
      bName.startsWith('oris') ||
      bName.startsWith('levator') ||
      bName.startsWith('risorius') ||
      bName.startsWith('temporalis') ||
      bName.startsWith('tongue') ||
      bName.startsWith('special');

    // Ordered monotonically along connected skin->jacket->pants->boots (0,1,2,3);
    // negative isolated zones (-2 eyeball, -1 mouth) prevent linear interpolation across collars/cuffs
    if (isEyeBallUv) {
      zoneArr[i] = -2.0; // Eyeball
    } else if (isMouthInnerUv) {
      zoneArr[i] = -1.0; // Teeth / tongue / oral cavity
    } else if (isHandBone || (isHeadNeckBone && (cy >= 1.375 || (cz > 0.03 && cy >= 1.335)))) {
      zoneArr[i] = 0.0; // Skin (face, neck V-opening, hands)
    } else if (isFootBone || cy < 0.108) {
      zoneArr[i] = 3.0; // Boots / shoes (covers all toes completely!)
    } else if (cy < 0.915) {
      zoneArr[i] = 2.0; // Trousers
    } else {
      zoneArr[i] = 1.0; // Upper garment (jacket / coat / sleeves)
    }
  }
  geo.setAttribute('aGarmentZone', new THREE.BufferAttribute(zoneArr, 1));

  // 5. Remap skinIndex & merge duplicate weights targeting the same collapsed bone
  const newSkinIdx = new Uint16Array(vertCount * 4);
  const newSkinWgt = new Float32Array(vertCount * 4);
  for (let i = 0; i < vertCount; i++) {
    const sIdx = [skinIdxAttr.getX(i), skinIdxAttr.getY(i), skinIdxAttr.getZ(i), skinIdxAttr.getW(i)];
    const sWgt = [skinWgtAttr.getX(i), skinWgtAttr.getY(i), skinWgtAttr.getZ(i), skinWgtAttr.getW(i)];
    const outJ = [0, 0, 0, 0];
    const outW = [0, 0, 0, 0];
    let used = 0;
    for (let k = 0; k < 4; k++) {
      const w = sWgt[k];
      if (w <= 1e-6) continue;
      const kj = srcToKeptIdx[sIdx[k]] ?? 0;
      let found = -1;
      for (let m = 0; m < used; m++) {
        if (outJ[m] === kj) {
          found = m;
          break;
        }
      }
      if (found >= 0) {
        outW[found] += w;
      } else if (used < 4) {
        outJ[used] = kj;
        outW[used] = w;
        used++;
      }
    }
    const wSum = outW[0] + outW[1] + outW[2] + outW[3] || 1;
    for (let k = 0; k < 4; k++) {
      newSkinIdx[i * 4 + k] = outJ[k];
      newSkinWgt[i * 4 + k] = outW[k] / wSum;
    }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(newSkinIdx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(newSkinWgt, 4));

  // 6. Compute exact collapsed local transforms & kept boneInverses
  const keptParentName: Record<KeptBoneName, KeptBoneName | null> = {
    root: null,
    spine05: 'root',
    spine01: 'spine05',
    neck01: 'spine01',
    head: 'neck01',
    'clavicle.L': 'spine01',
    'upperarm01.L': 'clavicle.L',
    'lowerarm01.L': 'upperarm01.L',
    'wrist.L': 'lowerarm01.L',
    'clavicle.R': 'spine01',
    'upperarm01.R': 'clavicle.R',
    'lowerarm01.R': 'upperarm01.R',
    'wrist.R': 'lowerarm01.R',
    'upperleg01.L': 'root',
    'lowerleg01.L': 'upperleg01.L',
    'foot.L': 'lowerleg01.L',
    'upperleg01.R': 'root',
    'lowerleg01.R': 'upperleg01.R',
    'foot.R': 'lowerleg01.R',
  };

  // Root space (scene-root world space, since Human.rig is identity)
  const sceneWorldInv = new THREE.Matrix4().copy(gltfScene.matrixWorld).invert();
  const worldPosByKept = new Map<KeptBoneName, THREE.Vector3>();
  const worldQuatByKept = new Map<KeptBoneName, THREE.Quaternion>();
  const worldMatByKept = new Map<KeptBoneName, THREE.Matrix4>();
  const boneInverses: THREE.Matrix4[] = [];

  for (let i = 0; i < KEPT_BONE_NAMES.length; i++) {
    const kName = KEPT_BONE_NAMES[i];
    const srcBone = srcBoneByName.get(kName);
    const srcIdx = srcBoneIndexByName.get(kName);
    if (!srcBone || srcIdx === undefined) {
      throw new Error(`Missing kept bone '${kName}' in ${entry.file}`);
    }
    const wMat = new THREE.Matrix4().multiplyMatrices(sceneWorldInv, srcBone.matrixWorld);
    worldMatByKept.set(kName, wMat);

    const wp = new THREE.Vector3();
    const wq = new THREE.Quaternion();
    const ws = new THREE.Vector3();
    wMat.decompose(wp, wq, ws);
    worldPosByKept.set(kName, wp);
    worldQuatByKept.set(kName, wq);

    const inv = srcSkel.boneInverses[srcIdx]?.clone() ?? wMat.clone().invert();
    boneInverses.push(inv);
  }

  // Compute canonical zero-pose alignment deltas D0 so (0,0,0) Euler = straight-down arms & legs (NO A-pose leakage!)
  const d0ByKept = new Map<KeptBoneName, THREE.Quaternion>();
  for (const kName of KEPT_BONE_NAMES) {
    d0ByKept.set(kName, new THREE.Quaternion());
  }

  const computeLimbD0 = (upperName: KeptBoneName, lowerName: KeptBoneName, endName: KeptBoneName) => {
    const pUp = worldPosByKept.get(upperName)!;
    const pLo = worldPosByKept.get(lowerName)!;
    const pEnd = worldPosByKept.get(endName)!;

    _tmpVecA.subVectors(pLo, pUp).normalize();
    const d0Up = new THREE.Quaternion().setFromUnitVectors(_tmpVecA, _qNegY);
    d0ByKept.set(upperName, d0Up);

    _tmpVecB.subVectors(pEnd, pLo).applyQuaternion(d0Up).normalize();
    const d0Lo = new THREE.Quaternion().setFromUnitVectors(_tmpVecB, _qNegY);
    // Notice: lower bone's character-space target at zero pose needs d0Lo * d0Up!
    d0ByKept.set(lowerName, d0Lo.multiply(d0Up));
  };

  computeLimbD0('upperarm01.L', 'lowerarm01.L', 'wrist.L');
  computeLimbD0('upperarm01.R', 'lowerarm01.R', 'wrist.R');
  computeLimbD0('upperleg01.L', 'lowerleg01.L', 'foot.L');
  computeLimbD0('upperleg01.R', 'lowerleg01.R', 'foot.R');

  const findSrcBoneWorldPos = (rawName: string): THREE.Vector3 | null => {
    const san = THREE.PropertyBinding.sanitizeNodeName(rawName);
    const sb = srcBones.find((b) => b.name === rawName || b.name === san);
    if (!sb) return null;
    _tmpMatA.multiplyMatrices(sceneWorldInv, sb.matrixWorld);
    return new THREE.Vector3().setFromMatrixPosition(_tmpMatA);
  };
  const computeHandD0 = (side: 'L' | 'R') => {
    const wr = worldPosByKept.get(`wrist.${side}` as KeptBoneName);
    const fMid = findSrcBoneWorldPos(`finger2-3.${side}`);
    const fThumb = findSrcBoneWorldPos(`finger1-2.${side}`);
    const fPinky = findSrcBoneWorldPos(`finger5-1.${side}`);
    if (!wr || !fMid || !fThumb || !fPinky) {
      d0ByKept.set(`wrist.${side}` as KeptBoneName, d0ByKept.get(`lowerarm01.${side}` as KeptBoneName)!.clone());
      return;
    }
    const axisY = wr.clone().sub(fMid).normalize();
    const axisZ = fThumb.clone().sub(fPinky);
    axisZ.addScaledVector(axisY, -axisZ.dot(axisY));
    if (axisZ.lengthSq() < 1e-6) axisZ.set(0, 0, 1);
    else axisZ.normalize();
    const axisX = new THREE.Vector3().crossVectors(axisY, axisZ).normalize();
    axisZ.crossVectors(axisX, axisY).normalize();
    _tmpMatA.makeBasis(axisX, axisY, axisZ);
    d0ByKept.set(`wrist.${side}` as KeptBoneName, new THREE.Quaternion().setFromRotationMatrix(_tmpMatA).invert());
  };
  computeHandD0('L');
  computeHandD0('R');

  const bonesRest: PoolBoneRest[] = [];
  for (let i = 0; i < KEPT_BONE_NAMES.length; i++) {
    const kName = KEPT_BONE_NAMES[i];
    const pName = keptParentName[kName];
    const pIdx = pName ? (keptIndexByName.get(pName) ?? 0) : -1;
    const wMat = worldMatByKept.get(kName)!;
    const localMat = pName
      ? _tmpMatB.multiplyMatrices(_tmpMatA.copy(worldMatByKept.get(pName)!).invert(), wMat)
      : wMat;

    const restPos = new THREE.Vector3();
    const restQuat = new THREE.Quaternion();
    const restScale = new THREE.Vector3();
    localMat.decompose(restPos, restQuat, restScale);

    bonesRest.push({
      name: kName,
      parentIdx: pIdx,
      restPos,
      restQuat,
      restScale,
      worldRestQuat: worldQuatByKept.get(kName)!.clone(),
      parentWorldRestQuat: pName ? worldQuatByKept.get(pName)!.clone() : new THREE.Quaternion(),
      d0Delta: d0ByKept.get(kName)!.clone(),
    });
  }

  // Exact boundingSphere for accurate frustum culling on cloned SkinnedMeshes
  geo.boundingBox = new THREE.Box3(
    new THREE.Vector3(-0.55, -0.05, -0.45),
    new THREE.Vector3(0.55, entry.heightM + 0.25, 0.45)
  );
  geo.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, entry.heightM * 0.5, 0),
    Math.max(1.35, entry.heightM * 0.78)
  );

  const rootPos = worldPosByKept.get('root')!;
  const chestPos = worldPosByKept.get('spine01')!;
  const neckPos = worldPosByKept.get('neck01')!;
  const headPos = worldPosByKept.get('head')!;
  const lSh = worldPosByKept.get('upperarm01.L')!;
  const lElb = worldPosByKept.get('lowerarm01.L')!;
  const lWr = worldPosByKept.get('wrist.L')!;
  const rSh = worldPosByKept.get('upperarm01.R')!;
  const rElb = worldPosByKept.get('lowerarm01.R')!;
  const rWr = worldPosByKept.get('wrist.R')!;
  const lHip = worldPosByKept.get('upperleg01.L')!;
  const lKnee = worldPosByKept.get('lowerleg01.L')!;
  const lFt = worldPosByKept.get('foot.L')!;
  const rHip = worldPosByKept.get('upperleg01.R')!;
  const rKnee = worldPosByKept.get('lowerleg01.R')!;
  const rFt = worldPosByKept.get('foot.R')!;

  const uaLen = lSh.distanceTo(lElb);
  const faLen = lElb.distanceTo(lWr);
  const thLen = lHip.distanceTo(lKnee);
  const shLen = lKnee.distanceTo(lFt);

  return {
    entry,
    geometry: geo,
    boneInverses,
    bindMatrix: mesh.bindMatrix.clone(),
    bones: bonesRest,
    rootY: rootPos.y,
    seatedRootY: rootPos.y * (0.54 / 0.92),
    chestOffsetInRoot: new THREE.Vector3(chestPos.x - rootPos.x, chestPos.y - rootPos.y, chestPos.z),
    neckOffsetInChest: neckPos.clone().sub(chestPos),
    headOffsetInNeck: headPos.clone().sub(neckPos),
    lShoulderInChest: lSh.clone().sub(chestPos),
    lElbowOffset: new THREE.Vector3(0, -uaLen, 0),
    lWristOffset: new THREE.Vector3(0, -faLen, 0),
    rShoulderInChest: rSh.clone().sub(chestPos),
    rElbowOffset: new THREE.Vector3(0, -rSh.distanceTo(rElb), 0),
    rWristOffset: new THREE.Vector3(0, -rElb.distanceTo(rWr), 0),
    lHipInPelvis: new THREE.Vector3(lHip.x - rootPos.x, lHip.y - rootPos.y, lHip.z),
    lKneeOffset: new THREE.Vector3(0, -thLen, 0),
    lAnkleOffset: new THREE.Vector3(0, -shLen, 0),
    rHipInPelvis: new THREE.Vector3(rHip.x - rootPos.x, rHip.y - rootPos.y, rHip.z),
    rKneeOffset: new THREE.Vector3(0, -rHip.distanceTo(rKnee), 0),
    rAnkleOffset: new THREE.Vector3(0, -rKnee.distanceTo(rFt), 0),
    upperArmLen: uaLen,
    forearmLen: faLen,
  };
}

// Global GLB pool state (load once, clone per agent)
const poolCache = new Map<string, LoadedPoolBody>();
const poolFailed = new Set<string>();
const poolInflight = new Map<string, Promise<LoadedPoolBody | null>>();
const pendingUpgrades: Array<{ bodyId: string; onReady: (body: LoadedPoolBody) => void }> = [];
const sharedLoader = new GLTFLoader();
let poolPreloadPromise: Promise<void> | null = null;
let poolLoadStarted = false;

function getAnyLoadedPoolBody(preferredGender?: 'male' | 'female' | 'androgynous'): LoadedPoolBody | null {
  if (preferredGender) {
    for (const body of poolCache.values()) {
      if (body.entry.gender === preferredGender) return body;
    }
  }
  const first = poolCache.values().next();
  return first.done ? null : first.value;
}

function flushPendingUpgrades(): void {
  for (let i = pendingUpgrades.length - 1; i >= 0; i--) {
    const item = pendingUpgrades[i];
    const exact = poolCache.get(item.bodyId);
    if (exact) {
      pendingUpgrades.splice(i, 1);
      item.onReady(exact);
    } else if (poolFailed.has(item.bodyId)) {
      const targetEntry = BODY_MANIFEST_MAP.get(item.bodyId);
      const replacement = getAnyLoadedPoolBody(targetEntry?.gender);
      if (replacement) {
        pendingUpgrades.splice(i, 1);
        item.onReady(replacement);
      }
    }
  }
}

async function loadSingleBody(entry: BodyManifestEntry): Promise<LoadedPoolBody | null> {
  const existing = poolCache.get(entry.bodyId);
  if (existing) return existing;
  const inflight = poolInflight.get(entry.bodyId);
  if (inflight) return inflight;

  const p = sharedLoader
    .loadAsync(`/models/makehuman/${entry.file}`)
    .then((gltf) => {
      const processed = bakeMorphsAndProcessPoolBody(entry, gltf.scene);
      poolCache.set(entry.bodyId, processed);
      flushPendingUpgrades();
      return processed;
    })
    .catch((err) => {
      console.error(`[humanCharacter] Failed to load body GLB ${entry.bodyId} (${entry.file}):`, err);
      poolFailed.add(entry.bodyId);
      flushPendingUpgrades();
      return null;
    });

  poolInflight.set(entry.bodyId, p);
  return p;
}

export function preloadHumanBodyPool(
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  if (poolPreloadPromise) return poolPreloadPromise;
  poolLoadStarted = true;

  const queue = [...BODY_POOL_MANIFEST];
  const total = queue.length;
  let completed = 0;
  const CONCURRENCY = 6;

  const worker = async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      await loadSingleBody(next);
      completed++;
      onProgress?.(completed, total);
    }
  };

  poolPreloadPromise = Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker())
  ).then(() => {
    flushPendingUpgrades();
  });
  return poolPreloadPromise;
}

export function getHumanBodyPoolStatus(): {
  loaded: number;
  failed: number;
  total: number;
  ready: boolean;
} {
  return {
    loaded: poolCache.size,
    failed: poolFailed.size,
    total: BODY_POOL_MANIFEST.length,
    ready: poolCache.size + poolFailed.size >= BODY_POOL_MANIFEST.length && poolCache.size > 0,
  };
}

// =========================================================================
// DRESSED MAKEHUMAN SHADER MATERIAL (Face + Eyes + Lips + Brows + Clothing + Shoes!)
// =========================================================================
function createMakeHumanDressedMaterial(
  textures: TextureLibrary,
  cfg: Required<
    Pick<
      HumanDressingConfig,
      'skinColor' | 'hairColor' | 'irisColor' | 'jacketColor' | 'pantsColor' | 'shoeColor' | 'weatheredFace'
    >
  >,
  outfit: OutfitStyleType,
  windUniform: { value: number }
): THREE.MeshStandardMaterial {
  const isLeather = outfit === 'leather_biker' || outfit === 'gang_2059';
  const isPuffer = outfit === 'puffer_jacket';
  const isKnit = outfit === 'cardigan_scarf' || outfit === 'hoodie_parka' || outfit === 'pow_prisoner';
  const isTailored =
    outfit === 'trench_coat' || outfit === 'tailored_blazer' || outfit === 'transit_security';

  const clothMap = isLeather
    ? textures.pedFabricLeatherMap
    : isKnit
    ? textures.pedFabricKnitMap
    : textures.pedClothingMap;
  const pantsMap = isTailored ? textures.pedClothingMap : textures.pedFabricDenimMap;

  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: clothMap,
    bumpMap: textures.pedClothingBump,
    bumpScale: isLeather ? 0.02 : 0.028,
    roughness: isLeather ? 0.42 : isPuffer ? 0.44 : 0.84,
    metalness: isLeather ? 0.12 : 0.02,
    side: THREE.FrontSide,
  });

  const uSkin = new THREE.Color(cfg.skinColor);
  const uHair = new THREE.Color(cfg.hairColor);
  const uIris = new THREE.Color(cfg.irisColor);
  const uJacket = new THREE.Color(cfg.jacketColor);
  const uPants = new THREE.Color(cfg.pantsColor);
  const uShoe = new THREE.Color(cfg.shoeColor);
  const shirtCol =
    outfit === 'gang_2059'
      ? new THREE.Color('#1d2028')
      : outfit === 'soviet_soldier'
      ? new THREE.Color('#5a5640')
      : new THREE.Color('#dad6cc');

  mat.customProgramCacheKey = () => 'makehuman-wardrobe-pbr-v2';
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSkinColor = { value: uSkin };
    shader.uniforms.uHairColor = { value: uHair };
    shader.uniforms.uIrisColor = { value: uIris };
    shader.uniforms.uJacketColor = { value: uJacket };
    shader.uniforms.uPantsColor = { value: uPants };
    shader.uniforms.uShoeColor = { value: uShoe };
    shader.uniforms.uShirtColor = { value: shirtCol };
    shader.uniforms.uJacketThick = { value: isPuffer ? 0.0042 : 0.0018 };
    shader.uniforms.uWeathered = { value: cfg.weatheredFace ? 1.0 : 0.0 };
    shader.uniforms.uPantsTex = { value: pantsMap };
    shader.uniforms.uLeatherTex = { value: textures.pedFabricLeatherMap };
    shader.uniforms.uFaceSkinTex = { value: cfg.weatheredFace ? textures.pedFaceWeatheredMap : textures.pedFaceSkinMap };
    shader.uniforms.uClothTime = CLOTH_WIND_TIME_UNIFORM;
    shader.uniforms.uClothWind = windUniform;

    shader.vertexShader =
      `attribute vec3 aCanonPos;\nattribute float aGarmentZone;\nvarying vec3 vCanonPos;\nvarying float vGarmentZone;\nuniform float uJacketThick;\nuniform float uClothTime;\nuniform float uClothWind;\n` +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vCanonPos = aCanonPos;
      vGarmentZone = aGarmentZone;
      if (aGarmentZone > 0.5 && aGarmentZone < 1.5) {
        transformed += objectNormal * uJacketThick;
      } else if (aGarmentZone > 1.5 && aGarmentZone < 2.5) {
        transformed += objectNormal * 0.0012;
      } else if (aGarmentZone >= 2.5) {
        transformed += objectNormal * 0.0024;
      }`
    );

    shader.fragmentShader =
      `varying vec3 vCanonPos;
       varying float vGarmentZone;
       uniform vec3 uSkinColor;
       uniform vec3 uHairColor;
       uniform vec3 uIrisColor;
       uniform vec3 uJacketColor;
       uniform vec3 uPantsColor;
       uniform vec3 uShoeColor;
       uniform vec3 uShirtColor;
       uniform float uWeathered;
       uniform sampler2D uPantsTex;
       uniform sampler2D uLeatherTex;
       uniform sampler2D uFaceSkinTex;
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      vec3 baseAlbedo = vec3(1.0);
      float z = vGarmentZone;
      vec2 bodyClothUv = vec2(atan(vCanonPos.x, max(0.001, abs(vCanonPos.z)) * sign(vCanonPos.z + 1e-4)) * 0.45 + 0.5, vCanonPos.y * 1.85);

      if (z < -1.5) {
        // Eyeball (white sclera + iris ring + dark pupil!)
        vec2 eyeCenter = vMapUv.x > 0.08 ? vec2(0.1106, 0.3863) : vec2(0.0524, 0.3863);
        float dEye = length((vMapUv - eyeCenter) * vec2(1.0, 0.92));
        baseAlbedo = vec3(0.95, 0.94, 0.92);
        float irisMask = 1.0 - smoothstep(0.0095, 0.0115, dEye);
        float pupilMask = 1.0 - smoothstep(0.0042, 0.0054, dEye);
        baseAlbedo = mix(baseAlbedo, uIrisColor, irisMask);
        baseAlbedo = mix(baseAlbedo, vec3(0.03, 0.03, 0.04), pupilMask);
      } else if (z < -0.5) {
        // Mouth interior
        baseAlbedo = vec3(0.14, 0.06, 0.06);
      } else if (z < 0.5) {
        // Skin (face, neck V-opening, hands) with sculpted eyebrows, lashes, lips, cheek warmth & pores!
        vec2 faceTexUv = vec2(clamp(0.5 + atan(vCanonPos.x, max(0.01, vCanonPos.z)) / 3.14159, 0.02, 0.98), clamp((vCanonPos.y - 1.38) / 0.30, 0.05, 0.95));
        vec3 poreSample = texture2D(uFaceSkinTex, faceTexUv).rgb;
        baseAlbedo = uSkinColor * mix(vec3(1.0), poreSample * 1.08, 0.42);

        if (vCanonPos.y > 1.43 && vCanonPos.z > 0.095) {
          float ax = abs(vCanonPos.x);
          // Cheek & nose-bridge rosy subsurface warmth
          float cheekMask = exp(-pow((ax - 0.036) * 38.0, 2.0) - pow((vCanonPos.y - 1.515) * 44.0, 2.0));
          baseAlbedo = mix(baseAlbedo, uSkinColor * vec3(1.06, 0.78, 0.76), cheekMask * 0.32);

          // Sculpted eyebrow arches above eye sockets (|x| in 0.015..0.055, y ~ 1.573)
          float browCenterY = 1.572 + 0.006 * sin(clamp((ax - 0.014) / 0.042, 0.0, 1.0) * 3.14159);
          float browXMask = smoothstep(0.012, 0.018, ax) * (1.0 - smoothstep(0.048, 0.057, ax));
          float browYMask = exp(-pow((vCanonPos.y - browCenterY) * 210.0, 2.0));
          float browMask = browXMask * browYMask * smoothstep(0.132, 0.145, vCanonPos.z);
          baseAlbedo = mix(baseAlbedo, uHairColor * 0.85, browMask * 0.88);

          // Upper/lower eyelid lash contour
          float eyeXMask = smoothstep(0.015, 0.020, ax) * (1.0 - smoothstep(0.044, 0.049, ax));
          float upperLidMask = exp(-pow((vCanonPos.y - 1.556) * 260.0, 2.0));
          float lashMask = eyeXMask * upperLidMask * smoothstep(0.136, 0.148, vCanonPos.z);
          baseAlbedo = mix(baseAlbedo, vec3(0.06, 0.04, 0.04), lashMask * 0.65);

          // Warm anatomical lips + parting seam
          float lipX = 1.0 - smoothstep(0.014, 0.026, ax);
          float lipY = smoothstep(1.462, 1.468, vCanonPos.y) * (1.0 - smoothstep(1.491, 1.498, vCanonPos.y));
          float lipMask = lipX * lipY * smoothstep(0.134, 0.148, vCanonPos.z);
          vec3 lipTint = uSkinColor * vec3(0.76, 0.44, 0.44) + vec3(0.08, 0.01, 0.02);
          baseAlbedo = mix(baseAlbedo, lipTint, lipMask * 0.78);
          float mouthSeam = exp(-pow((vCanonPos.y - 1.479) * 380.0, 2.0)) * lipX * smoothstep(0.136, 0.148, vCanonPos.z);
          baseAlbedo = mix(baseAlbedo, vec3(0.12, 0.05, 0.05), mouthSeam * 0.65);

          // Subtle jaw stubble on weathered presets
          if (uWeathered > 0.5) {
            float stubMask = (1.0 - smoothstep(1.46, 1.50, vCanonPos.y)) * smoothstep(1.42, 1.44, vCanonPos.y) * smoothstep(0.06, 0.12, vCanonPos.z);
            baseAlbedo = mix(baseAlbedo, baseAlbedo * 0.84, stubMask * 0.35);
          }
        }
      } else if (z < 1.5) {
        // Upper Garment (Jacket / Coat / Inner V-Neck Shirt + Lapel + Waist Belt)
        vec3 clothSample = texture2D(map, bodyClothUv).rgb;
        float isVNeck = step(1.27, vCanonPos.y) * step(0.04, vCanonPos.z) * (1.0 - smoothstep(0.015, 0.075 * clamp((vCanonPos.y - 1.25) / 0.14, 0.0, 1.0) + 0.015, abs(vCanonPos.x)));
        vec3 coatCol = uJacketColor * mix(vec3(0.86), clothSample * 1.18, 0.72);
        // Subtle center zipper / button placket seam
        float placket = (1.0 - smoothstep(0.005, 0.013, abs(vCanonPos.x))) * step(0.05, vCanonPos.z) * step(vCanonPos.y, 1.29);
        coatCol *= mix(1.0, 0.76, placket * 0.55);
        // Subtle dark waist belt seam at bottom of jacket
        float beltBand = exp(-pow((vCanonPos.y - 0.945) * 75.0, 2.0));
        coatCol = mix(coatCol, uShoeColor * 0.65, beltBand * 0.65);
        baseAlbedo = mix(coatCol, uShirtColor, isVNeck * 0.92);
      } else if (z < 2.5) {
        // Trousers / Pants
        vec3 pantsSample = texture2D(uPantsTex, bodyClothUv * 1.15).rgb;
        baseAlbedo = uPantsColor * mix(vec3(0.86), pantsSample * 1.16, 0.72);
      } else {
        // Boots / Shoes + dark rubber sole
        vec3 shoeSample = texture2D(uLeatherTex, bodyClothUv * 1.4).rgb;
        baseAlbedo = uShoeColor * mix(vec3(0.88), shoeSample * 1.12, 0.65);
        float sole = 1.0 - smoothstep(0.015, 0.025, vCanonPos.y);
        baseAlbedo = mix(baseAlbedo, vec3(0.07, 0.07, 0.08), sole * 0.8);
      }
      diffuseColor.rgb *= baseAlbedo;
      `
    );

    // Warm SSS terminator glow on skin + velvety cloth rim on clothes
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      {
        vec3 wN = normalize(normal);
        vec3 wV = normalize(vViewPosition);
        float ndv = clamp(dot(wN, wV), 0.0, 1.0);
        float rim = pow(1.0 - ndv, 2.5);
        if (vGarmentZone < 0.5) {
          float luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
          float term = smoothstep(0.02, 0.36, luma) * (1.0 - smoothstep(0.34, 0.80, luma));
          gl_FragColor.rgb += vec3(0.16, 0.048, 0.028) * (term * 0.34 + rim * luma * 0.25);
        } else if (vGarmentZone > 2.5 && vGarmentZone < 4.5) {
          gl_FragColor.rgb += gl_FragColor.rgb * rim * 0.20;
        }
      }
      #include <dithering_fragment>`
    );
  };
  return mat;
}

// =========================================================================
// PALETTES & RIG ADAPTER STATE
// =========================================================================
const SKIN_PALETTE = ['#e5c0a8', '#d8ae92', '#c5977a', '#f0ceb8', '#a6765a', '#deb59b', '#bc8a6e'];
const HAIR_PALETTE = ['#1d1916', '#38281e', '#5a412d', '#8c7150', '#6e3422', '#8a8b90', '#26201c'];
const IRIS_PALETTE = ['#3a6486', '#4a3524', '#2e5846', '#665232', '#526872', '#2b2420'];
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
  '#2c4a62',
  '#683d35',
];
const PANTS_PALETTE = ['#242c38', '#323947', '#3d3832', '#263346', '#46413a', '#2c313c'];
const SHOE_PALETTE = ['#1e1b19', '#3f2c20', '#2a2e36', '#523a2c', '#4a4e54'];
const SCARF_PALETTE = ['#a0343e', '#387082', '#b98d46', '#587252', '#825c78', '#dcd2c4'];

const MALE_HAIRS: HairStyleType[] = ['side_part', 'newsboy_cap', 'short_cropped', 'long_flowing', 'knit_beanie'];
const FEMALE_HAIRS: HairStyleType[] = ['long_flowing', 'bob_cut', 'ponytail', 'long_flowing'];
const CIVILIAN_OUTFITS: OutfitStyleType[] = [
  'trench_coat',
  'puffer_jacket',
  'leather_biker',
  'hoodie_parka',
  'tailored_blazer',
  'cardigan_scarf',
];

interface RigAdapterState {
  pool: LoadedPoolBody;
  mpfbBones: THREE.Bone[]; // ordered matching KEPT_BONE_NAMES
  skinnedMesh: THREE.SkinnedMesh;
  lastPose: HumanPoseParams | null;
}

const _syncQPelvis = new THREE.Quaternion();
const _syncQSpine = new THREE.Quaternion();
const _syncQChest = new THREE.Quaternion();
const _syncQNeck = new THREE.Quaternion();
const _syncQHead = new THREE.Quaternion();
const _syncQParent = new THREE.Quaternion();
const _syncQChild = new THREE.Quaternion();
const _syncQRel = new THREE.Quaternion();
const _syncQTmp = new THREE.Quaternion();
const _syncEuler = new THREE.Euler(0, 0, 0, 'XYZ');

function writeMpfbBoneLocal(
  bone: THREE.Bone,
  rest: PoolBoneRest,
  rTargetParent: THREE.Quaternion,
  rTargetSelf: THREE.Quaternion
): void {
  // L(m) = W_rest(p)^-1 * (R_target(p)^-1 * R_target(m)) * W_rest(p) * L_rest(m)
  _syncQRel.copy(rTargetParent).invert().multiply(rTargetSelf);
  _syncQTmp.copy(rest.parentWorldRestQuat).invert().multiply(_syncQRel).multiply(rest.parentWorldRestQuat).multiply(rest.restQuat);
  bone.quaternion.copy(_syncQTmp);
}

function readLimbEuler(euler: THREE.Euler, _isIk: boolean, outQ: THREE.Quaternion): THREE.Quaternion {
  // HumanRig joints already use MakeHuman's +X=Left, -X=Right, +Z=Forward frame
  return outQ.setFromEuler(euler);
}

function syncMpfbsFromRig(rig: HumanRig): void {
  const adapter = rig.root.userData._mpfbAdapter as RigAdapterState | undefined;
  if (!adapter) return;
  const { pool, mpfbBones } = adapter;
  const br = pool.bones;
  const ud = rig.root.userData;
  const ikLeft = Boolean(ud.ikLeft);
  const ikRight = Boolean(ud.ikRight);

  // 0: root (pelvis position delta + rotation)
  const rootBone = mpfbBones[0];
  rootBone.position.set(
    br[0].restPos.x + rig.pelvis.position.x,
    br[0].restPos.y + (rig.pelvis.position.y - rig.standingPelvisY),
    br[0].restPos.z + rig.pelvis.position.z
  );
  _syncQPelvis.setFromEuler(rig.pelvis.rotation);
  rootBone.quaternion.copy(_syncQPelvis).multiply(br[0].restQuat);

  // 1: spine05 (uses rig.spine)
  _syncQTmp.setFromEuler(rig.spine.rotation);
  _syncQSpine.copy(_syncQPelvis).multiply(_syncQTmp);
  writeMpfbBoneLocal(mpfbBones[1], br[1], _syncQPelvis, _syncQSpine);

  // 2: spine01 (uses rig.chest)
  _syncQTmp.setFromEuler(rig.chest.rotation);
  _syncQChest.copy(_syncQSpine).multiply(_syncQTmp);
  writeMpfbBoneLocal(mpfbBones[2], br[2], _syncQSpine, _syncQChest);

  // 3: neck01 (uses rig.neck)
  _syncQTmp.setFromEuler(rig.neck.rotation);
  _syncQNeck.copy(_syncQChest).multiply(_syncQTmp);
  writeMpfbBoneLocal(mpfbBones[3], br[3], _syncQChest, _syncQNeck);

  // 4: head (uses rig.head)
  _syncQTmp.setFromEuler(rig.head.rotation);
  _syncQHead.copy(_syncQNeck).multiply(_syncQTmp);
  writeMpfbBoneLocal(mpfbBones[4], br[4], _syncQNeck, _syncQHead);

  // Left Arm chain: 5=clavicle.L, 6=upperarm01.L, 7=lowerarm01.L, 8=wrist.L
  writeMpfbBoneLocal(mpfbBones[5], br[5], _syncQChest, _syncQChest);
  readLimbEuler(rig.leftShoulder.rotation, ikLeft, _syncQTmp);
  _syncQParent.copy(_syncQChest).multiply(_syncQTmp);
  _syncQChild.copy(_syncQParent).multiply(br[6].d0Delta);
  writeMpfbBoneLocal(mpfbBones[6], br[6], _syncQChest, _syncQChild);

  readLimbEuler(rig.leftElbow.rotation, ikLeft, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQRel.copy(_syncQParent).multiply(br[7].d0Delta);
  writeMpfbBoneLocal(mpfbBones[7], br[7], _syncQChild, _syncQRel);

  readLimbEuler(rig.leftHandGrp.rotation, ikLeft, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQTmp.copy(_syncQParent).multiply(br[8].d0Delta);
  writeMpfbBoneLocal(mpfbBones[8], br[8], _syncQRel, _syncQTmp);

  // Right Arm chain: 9=clavicle.R, 10=upperarm01.R, 11=lowerarm01.R, 12=wrist.R
  writeMpfbBoneLocal(mpfbBones[9], br[9], _syncQChest, _syncQChest);
  readLimbEuler(rig.rightShoulder.rotation, ikRight, _syncQTmp);
  _syncQParent.copy(_syncQChest).multiply(_syncQTmp);
  _syncQChild.copy(_syncQParent).multiply(br[10].d0Delta);
  writeMpfbBoneLocal(mpfbBones[10], br[10], _syncQChest, _syncQChild);

  readLimbEuler(rig.rightElbow.rotation, ikRight, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQRel.copy(_syncQParent).multiply(br[11].d0Delta);
  writeMpfbBoneLocal(mpfbBones[11], br[11], _syncQChild, _syncQRel);

  readLimbEuler(rig.rightHandGrp.rotation, ikRight, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQTmp.copy(_syncQParent).multiply(br[12].d0Delta);
  writeMpfbBoneLocal(mpfbBones[12], br[12], _syncQRel, _syncQTmp);

  // Left Leg chain: 13=upperleg01.L, 14=lowerleg01.L, 15=foot.L
  readLimbEuler(rig.leftHip.rotation, false, _syncQTmp);
  _syncQParent.copy(_syncQPelvis).multiply(_syncQTmp);
  _syncQChild.copy(_syncQParent).multiply(br[13].d0Delta);
  writeMpfbBoneLocal(mpfbBones[13], br[13], _syncQPelvis, _syncQChild);

  readLimbEuler(rig.leftKnee.rotation, false, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQRel.copy(_syncQParent).multiply(br[14].d0Delta);
  writeMpfbBoneLocal(mpfbBones[14], br[14], _syncQChild, _syncQRel);

  readLimbEuler(rig.leftAnkle.rotation, false, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQTmp.copy(_syncQParent).multiply(br[14].d0Delta);
  writeMpfbBoneLocal(mpfbBones[15], br[15], _syncQRel, _syncQTmp);

  // Right Leg chain: 16=upperleg01.R, 17=lowerleg01.R, 18=foot.R
  readLimbEuler(rig.rightHip.rotation, false, _syncQTmp);
  _syncQParent.copy(_syncQPelvis).multiply(_syncQTmp);
  _syncQChild.copy(_syncQParent).multiply(br[16].d0Delta);
  writeMpfbBoneLocal(mpfbBones[16], br[16], _syncQPelvis, _syncQChild);

  readLimbEuler(rig.rightKnee.rotation, false, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQRel.copy(_syncQParent).multiply(br[17].d0Delta);
  writeMpfbBoneLocal(mpfbBones[17], br[17], _syncQChild, _syncQRel);

  readLimbEuler(rig.rightAnkle.rotation, false, _syncQTmp);
  _syncQParent.multiply(_syncQTmp);
  _syncQTmp.copy(_syncQParent).multiply(br[17].d0Delta);
  writeMpfbBoneLocal(mpfbBones[18], br[18], _syncQRel, _syncQTmp);
}

function selectManifestBodyForVariant(
  variantIdx: number,
  outfit: OutfitStyleType,
  forcedBodyId?: string
): BodyManifestEntry {
  if (forcedBodyId) {
    const exact = BODY_MANIFEST_MAP.get(forcedBodyId);
    if (exact) return exact;
  }
  const pool = BODY_POOL_MANIFEST;
  let candidates = pool;
  if (outfit === 'soviet_soldier' || outfit === 'transit_security' || outfit === 'rail_engineer') {
    candidates = pool.filter((b) => b.gender === 'male' && b.ageBand !== 'elder');
  } else if (outfit === 'gang_2059') {
    candidates = pool.filter(
      (b) =>
        b.build.includes('broad') ||
        b.build.includes('heavy') ||
        b.build.includes('muscular') ||
        b.build.includes('thick') ||
        b.build.includes('tall')
    );
  } else if (outfit === 'station_barista') {
    candidates = pool.filter((b) => b.ageBand === 'young-adult' || b.ageBand === 'adult');
  }
  if (candidates.length === 0) candidates = pool;
  const idx = Math.abs((variantIdx * 7 + 3) | 0) % candidates.length;
  return candidates[idx];
}

function attachPoolBodyToRig(
  rig: HumanRig,
  pool: LoadedPoolBody,
  textures: TextureLibrary,
  dressing: Required<
    Pick<
      HumanDressingConfig,
      'skinColor' | 'hairColor' | 'irisColor' | 'jacketColor' | 'pantsColor' | 'shoeColor' | 'weatheredFace'
    >
  >
): void {
  const { entry } = pool;
  // Sync canonical control rig bone positions to this GLB's real dimensions (so IK & props align!)
  rig.standingPelvisY = pool.rootY;
  rig.seatedPelvisY = pool.seatedRootY;
  rig.pelvis.position.set(0, pool.rootY, 0);
  rig.spine.position.set(0, 0, 0);
  rig.coatTailBone.position.set(0, 0.04 * (entry.heightM / 1.694), pool.bones[0].restPos.z);
  rig.chest.position.copy(pool.chestOffsetInRoot);
  rig.neck.position.copy(pool.neckOffsetInChest);
  rig.head.position.copy(pool.headOffsetInNeck);
  rig.leftShoulder.position.copy(pool.lShoulderInChest);
  rig.leftElbow.position.copy(pool.lElbowOffset);
  rig.leftHandGrp.position.copy(pool.lWristOffset);
  rig.rightShoulder.position.copy(pool.rShoulderInChest);
  rig.rightElbow.position.copy(pool.rElbowOffset);
  rig.rightHandGrp.position.copy(pool.rWristOffset);
  rig.leftHip.position.copy(pool.lHipInPelvis);
  rig.leftKnee.position.copy(pool.lKneeOffset);
  rig.leftAnkle.position.copy(pool.lAnkleOffset);
  rig.rightHip.position.copy(pool.rHipInPelvis);
  rig.rightKnee.position.copy(pool.rKneeOffset);
  rig.rightAnkle.position.copy(pool.rAnkleOffset);

  rig.build =
    entry.gender === 'female' && (entry.build.includes('slim') || entry.build.includes('lean'))
      ? 'slender_female'
      : entry.build.includes('broad') || entry.build.includes('heavy') || entry.build.includes('thick')
      ? 'stocky_heavy'
      : entry.build.includes('tall')
      ? 'tall_lean'
      : 'athletic_male';

  // Clone the 19-bone skeleton & bind SkinnedMesh (shared BufferGeometry!)
  const clonedBones: THREE.Bone[] = [];
  for (let i = 0; i < pool.bones.length; i++) {
    const br = pool.bones[i];
    const b = new THREE.Bone();
    b.name = br.name;
    b.position.copy(br.restPos);
    b.quaternion.copy(br.restQuat);
    b.scale.copy(br.restScale);
    if (br.parentIdx >= 0) {
      clonedBones[br.parentIdx].add(b);
    } else {
      rig.root.add(b);
    }
    clonedBones.push(b);
  }

  rig.root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(clonedBones, pool.boneInverses);
  const mat = createMakeHumanDressedMaterial(textures, dressing, rig.outfit, rig.windUniform);
  const skinnedMesh = new THREE.SkinnedMesh(pool.geometry, mat);
  skinnedMesh.frustumCulled = true;
  skinnedMesh.castShadow = false;
  skinnedMesh.receiveShadow = false;
  rig.root.add(skinnedMesh);
  skinnedMesh.bind(skeleton, pool.bindMatrix);

  const adapter: RigAdapterState = {
    pool,
    mpfbBones: clonedBones,
    skinnedMesh,
    lastPose: (rig.root.userData._lastPose as HumanPoseParams | undefined) ?? null,
  };
  rig.root.userData._mpfbAdapter = adapter;
  rig.root.userData.bodyId = entry.bodyId;
  rig.root.userData.heightM = entry.heightM;

  // Immediately apply last or neutral standing pose so there is ZERO A-pose / T-pose leakage!
  if (adapter.lastPose) {
    applyHumanPose(rig, adapter.lastPose);
  } else {
    applyHumanPose(rig, { mode: 'standing_idle', elapsed: 0, phase: 0 });
  }
}

/**
 * Create a dressed, GLB-backed SkinnedMesh human behind the canonical HumanRig interface.
 */
export function createRiggedHuman(
  variantIdx: number,
  textures: TextureLibrary,
  forcedOutfit?: OutfitStyleType,
  forcedActivity?: CommuterActivityType,
  forcedBodyId?: string,
  dressingOverride?: HumanDressingConfig
): HumanRig {
  const geos = getSharedHumanGeometries();
  const outfit: OutfitStyleType =
    dressingOverride?.outfitId ??
    forcedOutfit ??
    (variantIdx % 13 === 12
      ? 'metro_worker'
      : variantIdx % 19 === 18
      ? 'transit_security'
      : CIVILIAN_OUTFITS[(variantIdx * 5 + Math.floor(variantIdx / 3)) % CIVILIAN_OUTFITS.length]);

  const isUniform =
    outfit === 'metro_worker' ||
    outfit === 'transit_security' ||
    outfit === 'rail_engineer' ||
    outfit === 'soviet_soldier' ||
    outfit === 'pow_prisoner' ||
    outfit === 'station_barista' ||
    outfit === 'gang_2059';

  const rAct = Math.abs(variantIdx) % 10;
  const activity: CommuterActivityType =
    forcedActivity ??
    (isUniform
      ? 'none'
      : rAct === 0 || rAct === 1 || rAct === 3 || rAct === 6 || rAct === 9
      ? 'phone'
      : rAct === 2 || rAct === 8
      ? 'newspaper'
      : rAct === 4
      ? 'cigarette'
      : 'none');

  const manifestBody = selectManifestBodyForVariant(variantIdx, outfit, forcedBodyId);
  const isFemale = manifestBody.gender === 'female';
  const build: HumanBuildType =
    isFemale && (manifestBody.build.includes('slim') || manifestBody.build.includes('lean'))
      ? 'slender_female'
      : manifestBody.build.includes('broad') ||
        manifestBody.build.includes('heavy') ||
        manifestBody.build.includes('thick')
      ? 'stocky_heavy'
      : manifestBody.build.includes('tall')
      ? 'tall_lean'
      : 'athletic_male';

  const hairList = isFemale ? FEMALE_HAIRS : MALE_HAIRS;
  const hairStyle =
    dressingOverride?.hairStyle ??
    (dressingOverride?.usesCap
      ? 'newsboy_cap'
      : hairList[Math.abs(variantIdx * 5 + 1) % hairList.length]);

  // Height is natively encoded in the MakeHuman GLB in real meters (1.558..1.949m); keep root scale = 1.0!
  const heightScale = 1.0;

  const skinColor =
    dressingOverride?.skinColor ??
    manifestBody.skinHex ??
    SKIN_PALETTE[Math.abs(variantIdx * 3) % SKIN_PALETTE.length];
  const hairColor =
    dressingOverride?.hairColor ?? HAIR_PALETTE[Math.abs(variantIdx * 5 + 2) % HAIR_PALETTE.length];
  const irisColor =
    dressingOverride?.irisColor ?? IRIS_PALETTE[Math.abs(variantIdx * 7 + 1) % IRIS_PALETTE.length];
  let jacketColor =
    dressingOverride?.jacketColor ??
    CIVILIAN_JACKET_COLORS[Math.abs(variantIdx * 7 + 1) % CIVILIAN_JACKET_COLORS.length];
  let pantsColor =
    dressingOverride?.pantsColor ?? PANTS_PALETTE[Math.abs(variantIdx * 5 + 3) % PANTS_PALETTE.length];
  let hatColor =
    dressingOverride?.hatColor ?? SCARF_PALETTE[Math.abs(variantIdx * 11) % SCARF_PALETTE.length];
  const shoeColor =
    dressingOverride?.shoeColor ??
    (isUniform ? '#181a1f' : SHOE_PALETTE[Math.abs(variantIdx * 3 + 2) % SHOE_PALETTE.length]);
  const scarfColor =
    dressingOverride?.scarfColor ??
    SCARF_PALETTE[Math.abs(variantIdx * 13 + 2) % SCARF_PALETTE.length];
  const propColor = dressingOverride?.propColor ?? hatColor;

  if (!dressingOverride?.jacketColor) {
    if (outfit === 'metro_worker') {
      jacketColor = '#1e3554';
      pantsColor = '#16253b';
      hatColor = '#1c304c';
    } else if (outfit === 'transit_security') {
      jacketColor = '#222b36';
      pantsColor = '#192029';
      hatColor = '#1c2430';
    } else if (outfit === 'rail_engineer') {
      jacketColor = '#343c44';
      pantsColor = '#283038';
      hatColor = '#e2a820';
    } else if (outfit === 'soviet_soldier') {
      jacketColor = '#3d4a35';
      pantsColor = '#2e3828';
      hatColor = '#3a4632';
    } else if (outfit === 'pow_prisoner') {
      jacketColor = '#4c525c';
      pantsColor = '#383e47';
      hatColor = '#363b42';
    } else if (outfit === 'station_barista') {
      jacketColor = '#30241e';
      pantsColor = '#1c1b20';
      hatColor = '#5e3c28';
    } else if (outfit === 'gang_2059') {
      jacketColor = variantIdx % 2 === 0 ? '#14171e' : '#1f161a';
      pantsColor = '#0f1218';
      hatColor = variantIdx % 3 === 0 ? '#2b1218' : '#13161c';
    } else if (outfit === 'leather_biker') {
      jacketColor = variantIdx % 2 === 0 ? '#24252a' : '#4a2b20';
    }
  }

  const useWeatheredFace =
    dressingOverride?.weatheredFace ??
    (outfit === 'leather_biker' ||
      outfit === 'gang_2059' ||
      outfit === 'rail_engineer' ||
      Math.abs(variantIdx) % 2 === 1);

  const windUniform = { value: 0.35 };
  const bodyRatio = manifestBody.heightM / 1.694;

  // Canonical control skeleton (positions match MakeHuman proportions, updated cleanly when pool GLB attaches)
  const root = new THREE.Group();
  root.userData.bodyId = manifestBody.bodyId;
  root.userData.heightM = manifestBody.heightM;
  root.userData.spawnIdentity = {
    bodyId: manifestBody.bodyId,
    faceId:
      dressingOverride?.faceId ??
      `face_${useWeatheredFace ? 'w' : 'c'}_${Math.abs(variantIdx * 3) % SKIN_PALETTE.length}_${Math.abs(variantIdx) % 7}`,
    fabricId:
      dressingOverride?.fabricId ??
      `fab_${outfit}_${Math.abs(variantIdx * 7 + 1) % CIVILIAN_JACKET_COLORS.length}`,
    voiceSeed: ((Math.abs(variantIdx) + 1) * 2654435761) >>> 0,
  };

  const standingPelvisY = 0.87 * bodyRatio;
  const seatedPelvisY = 0.54 * bodyRatio;

  const pelvis = new THREE.Bone();
  pelvis.position.set(0, standingPelvisY, 0);
  root.add(pelvis);

  const spine = new THREE.Bone();
  pelvis.add(spine);

  const chest = new THREE.Bone();
  chest.position.set(0, 0.369 * bodyRatio, -0.019 * bodyRatio);
  spine.add(chest);

  const coatTailBone = new THREE.Bone();
  coatTailBone.position.set(0, 0.04 * bodyRatio, -0.065 * bodyRatio);
  pelvis.add(coatTailBone);

  // Note: MakeHuman faces +Z so .L is +X and .R is -X!
  const leftShoulder = new THREE.Bone();
  leftShoulder.position.set(0.17 * bodyRatio, 0.081 * bodyRatio, 0.038 * bodyRatio);
  chest.add(leftShoulder);

  const leftElbow = new THREE.Bone();
  leftElbow.position.set(0, -0.242 * bodyRatio, 0);
  leftShoulder.add(leftElbow);

  const rightShoulder = new THREE.Bone();
  rightShoulder.position.set(-0.17 * bodyRatio, 0.081 * bodyRatio, 0.038 * bodyRatio);
  chest.add(rightShoulder);

  const rightElbow = new THREE.Bone();
  rightElbow.position.set(0, -0.242 * bodyRatio, 0);
  rightShoulder.add(rightElbow);

  const leftHip = new THREE.Bone();
  leftHip.position.set(0.101 * bodyRatio, -0.004 * bodyRatio, 0.005 * bodyRatio);
  pelvis.add(leftHip);

  const leftKnee = new THREE.Bone();
  leftKnee.position.set(0, -0.395 * bodyRatio, 0);
  leftHip.add(leftKnee);

  const rightHip = new THREE.Bone();
  rightHip.position.set(-0.101 * bodyRatio, -0.004 * bodyRatio, 0.005 * bodyRatio);
  pelvis.add(rightHip);

  const rightKnee = new THREE.Bone();
  rightKnee.position.set(0, -0.395 * bodyRatio, 0);
  rightHip.add(rightKnee);

  const neck = new THREE.Group();
  neck.position.set(0, 0.175 * bodyRatio, 0.024 * bodyRatio);
  chest.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 0.101 * bodyRatio, 0.039 * bodyRatio);
  neck.add(head);

  const leftHandGrp = new THREE.Group();
  leftHandGrp.position.set(0, -0.238 * bodyRatio, 0);
  const leftHandNormalMesh = new THREE.Group();
  const leftHandStrapMesh = new THREE.Group();
  leftHandStrapMesh.visible = false;
  leftHandGrp.add(leftHandNormalMesh);
  leftHandGrp.add(leftHandStrapMesh);
  leftElbow.add(leftHandGrp);

  const rightHandGrp = new THREE.Group();
  rightHandGrp.position.set(0, -0.238 * bodyRatio, 0);
  const rightHandNormalMesh = new THREE.Group();
  const rightHandStrapMesh = new THREE.Group();
  rightHandStrapMesh.visible = false;
  rightHandGrp.add(rightHandNormalMesh);
  rightHandGrp.add(rightHandStrapMesh);
  rightElbow.add(rightHandGrp);

  const leftAnkle = new THREE.Group();
  leftAnkle.position.set(0, -0.407 * bodyRatio, 0);
  leftKnee.add(leftAnkle);

  const rightAnkle = new THREE.Group();
  rightAnkle.position.set(0, -0.407 * bodyRatio, 0);
  rightKnee.add(rightAnkle);

  // Dummy eye/brow proxy Object3Ds so applyHumanPose runs unchanged without errors
  const eyelidLeft = new THREE.Object3D();
  const eyelidRight = new THREE.Object3D();
  const eyeballLeft = new THREE.Object3D();
  const eyeballRight = new THREE.Object3D();
  const browLeft = new THREE.Object3D();
  const browRight = new THREE.Object3D();

  // =========================================================================
  // 3D DRESSING OVERLAYS (Hair, Hats, Scarves, Uniform Gear, Coat Skirts, Props)
  // =========================================================================
  const coatMat = new THREE.MeshStandardMaterial({
    color: jacketColor,
    map: textures.pedClothingMap,
    bumpMap: textures.pedClothingBump,
    bumpScale: 0.025,
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  applyClothWindShader(coatMat, windUniform, 'cloth-wind-pbr-v3');

  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    map: textures.pedHairMap,
    bumpMap: textures.pedHairBump,
    bumpScale: 0.016,
    roughness: 0.45,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  applyClothWindShader(hairMat, windUniform, 'cloth-wind-pbr-v3');

  const hatMat = new THREE.MeshStandardMaterial({
    color: hatColor,
    ...(outfit === 'rail_engineer'
      ? {}
      : { roughnessMap: textures.pedClothingRoughness, bumpMap: textures.pedClothingBump, bumpScale: 0.02 }),
    roughness: outfit === 'rail_engineer' ? 0.3 : 0.88,
    metalness: outfit === 'rail_engineer' ? 0.14 : 0.02,
  });

  const scarfMat = new THREE.MeshStandardMaterial({
    color: scarfColor,
    map: textures.pedFabricKnitMap,
    bumpMap: textures.pedFabricKnitBump,
    bumpScale: 0.036,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  applyClothWindShader(scarfMat, windUniform, 'cloth-wind-pbr-v3');

  // Hair & headwear mounted cleanly on head bone
  const hw = getCachedHeadwear(geos, hairStyle, outfit);
  let hairTailBone: THREE.Group | null = null;
  const headScale = Math.max(0.92, Math.min(1.16, bodyRatio * 1.02));
  if (hw.hairGeo) {
    const hm = new THREE.Mesh(hw.hairGeo, hairMat);
    hm.scale.setScalar(headScale);
    head.add(hm);
  }
  if (hw.hatGeo) {
    const htm = new THREE.Mesh(hw.hatGeo, hatMat);
    htm.scale.setScalar(headScale);
    head.add(htm);
  }
  if (hw.tailGeo) {
    hairTailBone = new THREE.Group();
    hairTailBone.position.set(0, 0.06 * headScale, -0.028 * headScale);
    hairTailBone.scale.setScalar(headScale);
    head.add(hairTailBone);
    hairTailBone.add(new THREE.Mesh(hw.tailGeo, hairMat));
  }

  // Flowing coat skirt ONLY on long coats (trench_coat / soviet_soldier / explicit long coat override)
  const coatLenScale = dressingOverride?.coatLenScale ?? 1.0;
  if (outfit === 'trench_coat' || outfit === 'soviet_soldier' || coatLenScale > 1.04) {
    const skirtGeo = outfit === 'trench_coat' || outfit === 'soviet_soldier' ? geos.coatSkirtLong : geos.coatSkirtMid;
    const skirtMesh = new THREE.Mesh(skirtGeo, coatMat);
    const wFit = build === 'stocky_heavy' ? 1.10 : build === 'slender_female' ? 0.92 : 1.0;
    skirtMesh.scale.set(wFit, bodyRatio, wFit);
    coatTailBone.add(skirtMesh);
  }

  // Flowing front jacket flaps on open-coat outfits
  let jacketFlapLeft: THREE.Group | null = null;
  let jacketFlapRight: THREE.Group | null = null;
  if (outfit === 'trench_coat' || outfit === 'tailored_blazer' || outfit === 'cardigan_scarf') {
    jacketFlapLeft = new THREE.Group();
    jacketFlapLeft.position.set(0.08 * bodyRatio, 0.04 * bodyRatio, 0.125 * bodyRatio);
    chest.add(jacketFlapLeft);
    jacketFlapLeft.add(new THREE.Mesh(geos.jacketFlapLeft, coatMat));

    jacketFlapRight = new THREE.Group();
    jacketFlapRight.position.set(-0.08 * bodyRatio, 0.04 * bodyRatio, 0.125 * bodyRatio);
    chest.add(jacketFlapRight);
    jacketFlapRight.add(new THREE.Mesh(geos.jacketFlapRight, coatMat));
  }

  // Uniform gear & accessories on chest
  if (outfit === 'metro_worker' || outfit === 'rail_engineer') {
    const vestMat = new THREE.MeshStandardMaterial({
      color: outfit === 'metro_worker' ? '#e67e12' : '#b8d91c',
      emissive: new THREE.Color(outfit === 'metro_worker' ? '#ff7b00' : '#94b810'),
      emissiveIntensity: 0.24,
      roughness: 0.56,
    });
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.175, 0.34, 16, 1, true), vestMat);
    vest.scale.set(build === 'stocky_heavy' ? 1.15 : 1.0, bodyRatio, 0.78);
    vest.position.set(0, -0.06 * bodyRatio, 0.02 * bodyRatio);
    chest.add(vest);
  } else if (outfit === 'soviet_soldier') {
    const beltMat = new THREE.MeshStandardMaterial({ color: '#2c1d12', roughness: 0.38, metalness: 0.22 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: '#cfa948', roughness: 0.28, metalness: 0.86 });
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.018, 8, 18), beltMat);
    belt.rotation.x = Math.PI * 0.5;
    belt.scale.set(build === 'stocky_heavy' ? 1.18 : 1.02, 0.82, 1);
    belt.position.set(0, -0.22 * bodyRatio, 0.02 * bodyRatio);
    chest.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.024), buckleMat);
    buckle.position.set(0, -0.22 * bodyRatio, 0.155 * bodyRatio);
    chest.add(buckle);
  } else if (outfit === 'station_barista') {
    const apronMat = new THREE.MeshStandardMaterial({
      color: '#6e452a',
      map: textures.pedClothingMap,
      roughness: 0.88,
    });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.46, 0.022), apronMat);
    apron.position.set(0, -0.18 * bodyRatio, 0.145 * bodyRatio);
    chest.add(apron);
  } else if (outfit === 'hoodie_parka') {
    const hood = new THREE.Mesh(geos.hoodDrape, coatMat);
    hood.position.set(0, 0.135 * bodyRatio, -0.05 * bodyRatio);
    hood.rotation.x = -0.75;
    hood.scale.set(1.16, 0.82, 1.06);
    chest.add(hood);
  }

  // Scarf wrap + tails
  let scarfTailBone: THREE.Group | null = null;
  let scarfSideTailBone: THREE.Group | null = null;
  const wantScarf =
    dressingOverride?.hasScarf ?? (outfit === 'cardigan_scarf' || (!isUniform && Math.abs(variantIdx) % 3 === 0));
  if (wantScarf) {
    const sw = new THREE.Mesh(geos.scarfWrap, scarfMat);
    sw.position.set(0, 0.155 * bodyRatio, 0.015 * bodyRatio);
    chest.add(sw);
    scarfTailBone = new THREE.Group();
    scarfTailBone.position.set(0.052 * bodyRatio, 0.12 * bodyRatio, 0.135 * bodyRatio);
    chest.add(scarfTailBone);
    scarfTailBone.add(new THREE.Mesh(geos.scarfTail, scarfMat));

    scarfSideTailBone = new THREE.Group();
    scarfSideTailBone.position.set(-0.068 * bodyRatio, 0.11 * bodyRatio, 0.128 * bodyRatio);
    chest.add(scarfSideTailBone);
    scarfSideTailBone.add(new THREE.Mesh(geos.scarfSideTail, scarfMat));
  }

  // Backpack or briefcase prop
  const wantProp =
    dressingOverride?.hasProp ?? (!isUniform && (Math.abs(variantIdx) % 5 === 1 || Math.abs(variantIdx) % 5 === 4));
  if (wantProp) {
    const propMat = new THREE.MeshStandardMaterial({
      color: propColor,
      bumpMap: textures.pedClothingBump,
      bumpScale: 0.016,
      roughness: 0.68,
    });
    if (dressingOverride?.propKind === 'briefcase') {
      const bc = new THREE.Mesh(geos.briefcase, propMat);
      rightHandGrp.add(bc);
    } else {
      const pack = new THREE.Mesh(geos.backpack, propMat);
      pack.position.set(0, -0.02 * bodyRatio, -0.145 * bodyRatio);
      chest.add(pack);
    }
  }

  // Activity props (newspaper, smartphone, cigarette + smoke puffs)
  let newspaperProp: THREE.Group | null = null;
  let phoneProp: THREE.Group | null = null;
  let cigaretteProp: THREE.Group | null = null;
  let cigEmberMat: THREE.MeshStandardMaterial | null = null;
  const smokePuffs: THREE.Sprite[] = [];
  const ambientSmokeClouds: THREE.Sprite[] = [];

  if (activity === 'newspaper') {
    newspaperProp = new THREE.Group();
    const newsMat = new THREE.MeshStandardMaterial({
      map: textures.newspaperMap,
      roughness: 0.92,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    newspaperProp.add(new THREE.Mesh(geos.newspaperSheet, newsMat));
    newspaperProp.position.set(0, 0.04 * bodyRatio, 0.36);
    newspaperProp.rotation.set(0.26, 0, 0);
    chest.add(newspaperProp);
  } else if (activity === 'phone') {
    phoneProp = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#141820', roughness: 0.25, metalness: 0.72 });
    const screenMat = new THREE.MeshStandardMaterial({
      map: textures.phoneScreenMap,
      emissiveMap: textures.phoneScreenMap,
      emissive: new THREE.Color('#bce4ff'),
      emissiveIntensity: 1.55,
      roughness: 0.14,
    });
    phoneProp.add(new THREE.Mesh(geos.phoneBody, bodyMat));
    const screen = new THREE.Mesh(geos.phoneScreen, screenMat);
    screen.position.set(0.0046, 0, 0);
    screen.rotation.set(0, Math.PI * 0.5, -Math.PI * 0.5, 'XYZ');
    phoneProp.add(screen);
    phoneProp.position.set(0.0205, -0.076, 0.016);
    rightHandGrp.add(phoneProp);
  } else if (activity === 'cigarette') {
    cigaretteProp = new THREE.Group();
    const paperMat = new THREE.MeshStandardMaterial({ color: '#ece9e1', roughness: 0.88 });
    const filterMat = new THREE.MeshStandardMaterial({ color: '#cf8942', roughness: 0.82 });
    const ashMat = new THREE.MeshStandardMaterial({ color: '#6b6e74', roughness: 0.96 });
    cigEmberMat = new THREE.MeshStandardMaterial({
      color: '#ff520a',
      emissive: new THREE.Color('#ff3e00'),
      emissiveIntensity: 2.4,
      roughness: 0.35,
    });
    const filter = new THREE.Mesh(geos.cigFilter, filterMat);
    filter.rotation.z = Math.PI * 0.5;
    filter.position.set(0.010, 0, 0);
    cigaretteProp.add(filter);
    const body = new THREE.Mesh(geos.cigBody, paperMat);
    body.rotation.z = Math.PI * 0.5;
    body.position.set(-0.028, 0, 0);
    cigaretteProp.add(body);
    const ash = new THREE.Mesh(geos.cigEmber, ashMat);
    ash.position.set(-0.0545, 0, 0);
    cigaretteProp.add(ash);
    const ember = new THREE.Mesh(geos.cigEmber, cigEmberMat);
    ember.position.set(-0.058, 0, 0);
    cigaretteProp.add(ember);

    cigaretteProp.position.set(0.002, -0.118, 0.017);
    cigaretteProp.rotation.set(0.0, 0.0, -0.04);
    rightHandGrp.add(cigaretteProp);

    const smokeTex = getSmokeCloudTexture();
    for (let s = 0; s < 5; s++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: smokeTex, color: '#d4dde8', transparent: true, opacity: 0.0, depthWrite: false })
      );
      sp.scale.set(0.08, 0.08, 1);
      chest.add(sp);
      smokePuffs.push(sp);
    }
    for (let a = 0; a < 4; a++) {
      const amb = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: smokeTex,
          color: a < 2 ? '#ccd6e2' : '#bcc8d8',
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
        })
      );
      amb.scale.set(1.2, 1.2, 1);
      root.add(amb);
      ambientSmokeClouds.push(amb);
    }
  }

  const rig: HumanRig = {
    root,
    pelvis,
    spine,
    chest,
    neck,
    head,
    leftShoulder,
    leftElbow,
    leftHandGrp,
    leftHandNormalMesh,
    leftHandStrapMesh,
    rightShoulder,
    rightElbow,
    rightHandGrp,
    rightHandNormalMesh,
    rightHandStrapMesh,
    leftHip,
    leftKnee,
    leftAnkle,
    rightHip,
    rightKnee,
    rightAnkle,
    coatTailBone,
    scarfTailBone,
    scarfSideTailBone,
    hairTailBone,
    jacketFlapLeft,
    jacketFlapRight,
    eyelidLeft,
    eyelidRight,
    eyeballLeft,
    eyeballRight,
    browLeft,
    browRight,
    windUniform,
    activity,
    newspaperProp,
    phoneProp,
    cigaretteProp,
    cigEmberMat,
    smokePuffs,
    ambientSmokeClouds,
    build,
    outfit,
    heightScale,
    standingPelvisY,
    seatedPelvisY,
  };

  const resolvedDressing = {
    skinColor,
    hairColor,
    irisColor,
    jacketColor,
    pantsColor,
    shoeColor,
    weatheredFace: useWeatheredFace,
  };

  // Start pool preloading automatically; attach body immediately if cached or upon resolve!
  if (!poolLoadStarted) {
    preloadHumanBodyPool();
  }
  const cached = poolCache.get(manifestBody.bodyId);
  if (cached) {
    attachPoolBodyToRig(rig, cached, textures, resolvedDressing);
  } else {
    const fallbackIfFailed = poolFailed.has(manifestBody.bodyId)
      ? getAnyLoadedPoolBody(manifestBody.gender)
      : null;
    if (fallbackIfFailed) {
      attachPoolBodyToRig(rig, fallbackIfFailed, textures, resolvedDressing);
    } else {
      pendingUpgrades.push({
        bodyId: manifestBody.bodyId,
        onReady: (loadedBody) => attachPoolBodyToRig(rig, loadedBody, textures, resolvedDressing),
      });
      loadSingleBody(manifestBody);
    }
  }

  return rig;
}

// =========================================================================
// ZERO-GC FK & 2-BONE ANALYTICAL STRAP / CIGARETTE IK
// =========================================================================
const _fkQ1 = new THREE.Quaternion();
const _fkQ2 = new THREE.Quaternion();
const _fkV1 = new THREE.Vector3();
const _fkV2 = new THREE.Vector3();
const _ikChestPos = new THREE.Vector3();
const _ikChestQ = new THREE.Quaternion();
const _ikChestInvQ = new THREE.Quaternion();
const _ikTargetChest = new THREE.Vector3();
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

function computeHandPalmInChest(
  shoulder: THREE.Bone,
  elbow: THREE.Bone,
  out: THREE.Vector3
): THREE.Vector3 {
  _fkQ1.setFromEuler(shoulder.rotation);
  _fkQ2.setFromEuler(elbow.rotation);
  _fkV1.copy(elbow.position).applyQuaternion(_fkQ1).add(shoulder.position);
  _fkV2.set(0, elbow.position.y - 0.03, 0).applyQuaternion(_fkQ2).applyQuaternion(_fkQ1);
  return out.copy(_fkV1).add(_fkV2);
}

function solveStrapArmIK(
  rig: HumanRig,
  sideSign: -1 | 1,
  targetRootLocal: { x: number; y: number; z: number }
): void {
  const shoulder = sideSign < 0 ? rig.leftShoulder : rig.rightShoulder;
  const elbow = sideSign < 0 ? rig.leftElbow : rig.rightElbow;
  const handGrp = sideSign < 0 ? rig.leftHandGrp : rig.rightHandGrp;
  if (sideSign < 0) rig.root.userData.ikLeft = true;
  else rig.root.userData.ikRight = true;

  _fkQ1.setFromEuler(rig.pelvis.rotation);
  _fkQ2.setFromEuler(rig.spine.rotation);
  _ikChestQ.copy(_fkQ1).multiply(_fkQ2);
  _fkQ2.setFromEuler(rig.chest.rotation);
  _ikChestQ.multiply(_fkQ2);

  _ikChestPos
    .copy(rig.chest.position)
    .applyQuaternion(_fkQ2.setFromEuler(rig.spine.rotation))
    .add(rig.spine.position)
    .applyQuaternion(_fkQ1)
    .add(rig.pelvis.position);
  _ikChestInvQ.copy(_ikChestQ).invert();
  _ikTargetChest
    .set(targetRootLocal.x, targetRootLocal.y, targetRootLocal.z)
    .sub(_ikChestPos)
    .applyQuaternion(_ikChestInvQ);

  _ikRel.copy(_ikTargetChest).sub(shoulder.position);
  const L1 = Math.max(0.18, Math.abs(elbow.position.y));
  const L2 = Math.max(0.18, Math.abs(handGrp.position.y) + 0.055);
  const rawDist = _ikRel.length();
  const minDist = Math.abs(L1 - L2) + 0.04;
  const maxDist = L1 + L2 - 0.008;
  const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist < 1e-4) _ikDir.set(0, 1, 0);
  else _ikDir.copy(_ikRel).multiplyScalar(1 / rawDist);

  const cosA = THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const cosC = THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), -1, 1);
  const elbowBend = Math.PI - Math.acos(cosC);

  // MakeHuman .L is +X, .R is -X
  _ikPole.set(-sideSign * 0.42, -0.38, 0.82).normalize();
  _ikBendN.copy(_ikPole).addScaledVector(_ikDir, -_ikPole.dot(_ikDir));
  if (_ikBendN.lengthSq() < 1e-5) _ikBendN.set(-sideSign, 0, 1).normalize();
  else _ikBendN.normalize();

  _ikElbowPos
    .copy(_ikDir)
    .multiplyScalar(L1 * cosA)
    .addScaledVector(_ikBendN, L1 * sinA);
  _ikUpperDir.copy(_ikElbowPos).normalize();

  _ikUpperAxisY.copy(_ikUpperDir).negate();
  _ikUpperAxisZ.copy(_ikDir).multiplyScalar(dist).sub(_ikElbowPos);
  _ikUpperAxisZ.addScaledVector(_ikUpperAxisY, -_ikUpperAxisZ.dot(_ikUpperAxisY));
  if (_ikUpperAxisZ.lengthSq() < 1e-6) _ikUpperAxisZ.set(0, 0, 1);
  else _ikUpperAxisZ.normalize();
  _ikUpperAxisX.crossVectors(_ikUpperAxisY, _ikUpperAxisZ).normalize();
  _ikUpperAxisZ.crossVectors(_ikUpperAxisX, _ikUpperAxisY).normalize();

  _ikUpperMat.makeBasis(_ikUpperAxisX, _ikUpperAxisY, _ikUpperAxisZ);
  _ikUpperQ.setFromRotationMatrix(_ikUpperMat);
  shoulder.rotation.setFromQuaternion(_ikUpperQ, 'XYZ');

  elbow.rotation.set(-elbowBend, 0, 0);
  handGrp.rotation.set(0.08, -sideSign * -0.18, 0);
}

const HEAD_LIP_LOCAL = new THREE.Vector3(0, -0.036, 0.112);
const MOUTH_TARGET_SURFACE_OFFSET = 0.02;
const CIG_FILTER_TIP_LOCAL = new THREE.Vector3(0.021, 0, 0);
const CIG_EMBER_LOCAL = new THREE.Vector3(-0.058, 0, 0);
const CIG_PROP_LOCAL_POS = new THREE.Vector3(0.002, -0.118, 0.017);
const CIG_PROP_LOCAL_EULER = new THREE.Euler(0, 0, -0.04, 'XYZ');
const _cigPropQ = new THREE.Quaternion().setFromEuler(CIG_PROP_LOCAL_EULER);
const _cigPropInvQ = _cigPropQ.clone().invert();
const _cigOutDir = new THREE.Vector3(-0.32, -0.06, 0.945).normalize();
const _cigAxisX = new THREE.Vector3();
const _cigAxisY = new THREE.Vector3();
const _cigAxisZ = new THREE.Vector3();
const _cigMat = new THREE.Matrix4();
const _cigTargetQ = new THREE.Quaternion();
const _cigTipOffsetInHand = new THREE.Vector3();
const _cigWristChest = new THREE.Vector3();
const _cigLipChest = new THREE.Vector3();
const _cigNeckQ = new THREE.Quaternion();
const _cigHeadQ = new THREE.Quaternion();
const _cigElbowQ = new THREE.Quaternion();
const _cigElbowInChestQ = new THREE.Quaternion();
const _cigHandQ = new THREE.Quaternion();
const _cigRestShQ = new THREE.Quaternion();
const _cigRestElQ = new THREE.Quaternion();
const _cigRestHdQ = new THREE.Quaternion();
const _cigRestShE = new THREE.Euler(-0.36, 0.14, 0.06, 'XYZ');
const _cigRestElE = new THREE.Euler(-1.02, 0, -0.18, 'XYZ');
const _cigRestHdE = new THREE.Euler(0.06, -0.28, -0.08, 'XYZ');
const _cigTmpV = new THREE.Vector3();

function computeMouthTargetInChest(rig: HumanRig, outLip: THREE.Vector3): THREE.Vector3 {
  _cigHeadQ.setFromEuler(rig.head.rotation);
  _cigNeckQ.setFromEuler(rig.neck.rotation);
  return outLip
    .copy(HEAD_LIP_LOCAL)
    .applyQuaternion(_cigHeadQ)
    .add(rig.head.position)
    .applyQuaternion(_cigNeckQ)
    .add(rig.neck.position);
}

function computeCigarettePointInChest(
  rig: HumanRig,
  cigLocalX: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const handScale = rig.rightHandGrp.scale.x;
  _fkQ1.setFromEuler(rig.rightShoulder.rotation);
  _fkQ2.setFromEuler(rig.rightElbow.rotation);
  _cigHandQ.setFromEuler(rig.rightHandGrp.rotation);

  out.set(cigLocalX, 0, 0).applyQuaternion(_cigPropQ).add(CIG_PROP_LOCAL_POS).multiplyScalar(handScale);
  out.applyQuaternion(_cigHandQ).add(rig.rightHandGrp.position);
  out.applyQuaternion(_fkQ2).add(rig.rightElbow.position);
  out.applyQuaternion(_fkQ1).add(rig.rightShoulder.position);
  return out;
}

export function getCigaretteTipAndLipInChest(rig: HumanRig): {
  tip: THREE.Vector3;
  lip: THREE.Vector3;
  mouthTarget: THREE.Vector3;
  distanceM: number;
} {
  const lip = computeMouthTargetInChest(rig, new THREE.Vector3());
  const mouthTarget = lip.clone().addScaledVector(_cigOutDir, MOUTH_TARGET_SURFACE_OFFSET);
  const tip = computeCigarettePointInChest(rig, CIG_FILTER_TIP_LOCAL.x, new THREE.Vector3());
  return {
    tip,
    lip,
    mouthTarget,
    distanceM: tip.distanceTo(lip),
  };
}

function solveCigaretteArmIK(rig: HumanRig, puffWeight: number): void {
  const shoulder = rig.rightShoulder;
  const elbow = rig.rightElbow;
  const handGrp = rig.rightHandGrp;
  const handScale = handGrp.scale.x;
  rig.root.userData.ikRight = true;

  computeMouthTargetInChest(rig, _cigLipChest);

  _cigAxisX.copy(_cigOutDir).negate();
  _cigTmpV.set(0, 1, 0);
  _cigAxisZ.crossVectors(_cigAxisX, _cigTmpV).normalize();
  _cigAxisY.crossVectors(_cigAxisZ, _cigAxisX).normalize();
  _cigMat.makeBasis(_cigAxisX, _cigAxisY, _cigAxisZ);
  _cigTargetQ.setFromRotationMatrix(_cigMat);
  _cigHandQ.copy(_cigTargetQ).multiply(_cigPropInvQ);

  _cigTipOffsetInHand
    .copy(CIG_FILTER_TIP_LOCAL)
    .applyQuaternion(_cigPropQ)
    .add(CIG_PROP_LOCAL_POS)
    .multiplyScalar(handScale)
    .applyQuaternion(_cigHandQ);

  _cigWristChest.copy(_cigLipChest).sub(_cigTipOffsetInHand);

  _ikRel.copy(_cigWristChest).sub(shoulder.position);
  const L1 = Math.max(0.18, Math.abs(elbow.position.y));
  const L2 = Math.max(0.18, Math.abs(handGrp.position.y));
  const rawDist = _ikRel.length();
  const minDist = Math.abs(L1 - L2) + 0.035;
  const maxDist = L1 + L2 - 0.008;
  const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist < 1e-4) _ikDir.set(0, 0, 1);
  else _ikDir.copy(_ikRel).multiplyScalar(1 / rawDist);

  const cosA = THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const cosC = THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2), -1, 1);
  const elbowBend = Math.PI - Math.acos(cosC);

  _ikPole.set(-0.68, -0.66, 0.32).normalize();
  _ikBendN.copy(_ikPole).addScaledVector(_ikDir, -_ikPole.dot(_ikDir));
  if (_ikBendN.lengthSq() < 1e-5) _ikBendN.set(-1, -1, 0).normalize();
  else _ikBendN.normalize();

  _ikElbowPos
    .copy(_ikDir)
    .multiplyScalar(L1 * cosA)
    .addScaledVector(_ikBendN, L1 * sinA);
  _ikUpperDir.copy(_ikElbowPos).normalize();

  _ikUpperAxisY.copy(_ikUpperDir).negate();
  _ikUpperAxisZ.copy(_ikDir).multiplyScalar(dist).sub(_ikElbowPos);
  _ikUpperAxisZ.addScaledVector(_ikUpperAxisY, -_ikUpperAxisZ.dot(_ikUpperAxisY));
  if (_ikUpperAxisZ.lengthSq() < 1e-6) _ikUpperAxisZ.set(0, 0, 1);
  else _ikUpperAxisZ.normalize();
  _ikUpperAxisX.crossVectors(_ikUpperAxisY, _ikUpperAxisZ).normalize();
  _ikUpperAxisZ.crossVectors(_ikUpperAxisX, _ikUpperAxisY).normalize();

  _ikUpperMat.makeBasis(_ikUpperAxisX, _ikUpperAxisY, _ikUpperAxisZ);
  _ikUpperQ.setFromRotationMatrix(_ikUpperMat);

  _cigElbowQ.setFromAxisAngle(_ikUpperAxisX.set(1, 0, 0), -elbowBend);
  _cigElbowInChestQ.copy(_ikUpperQ).multiply(_cigElbowQ).invert();
  _cigHandQ.premultiply(_cigElbowInChestQ);

  if (puffWeight >= 0.999) {
    shoulder.rotation.setFromQuaternion(_ikUpperQ, 'XYZ');
    elbow.rotation.set(-elbowBend, 0, 0);
    handGrp.rotation.setFromQuaternion(_cigHandQ, 'XYZ');
  } else {
    _cigRestShQ.setFromEuler(_cigRestShE);
    _cigRestElQ.setFromEuler(_cigRestElE);
    _cigRestHdQ.setFromEuler(_cigRestHdE);
    _cigRestShQ.slerp(_ikUpperQ, puffWeight);
    _cigRestElQ.slerp(_cigElbowQ, puffWeight);
    _cigRestHdQ.slerp(_cigHandQ, puffWeight);
    shoulder.rotation.setFromQuaternion(_cigRestShQ, 'XYZ');
    elbow.rotation.setFromQuaternion(_cigRestElQ, 'XYZ');
    handGrp.rotation.setFromQuaternion(_cigRestHdQ, 'XYZ');
  }
}

function naturalGazePlateau(t: number, sharpness = 2.2): number {
  return Math.tanh(Math.sin(t) * sharpness);
}

// =========================================================================
// BIOMECHANICAL POSE ANIMATOR (UNALTERED API — DRIVES MAKEHUMAN SKELETON)
// =========================================================================
export function applyHumanPose(rig: HumanRig, params: HumanPoseParams): void {
  rig.root.userData._lastPose = params;
  rig.root.userData.ikLeft = false;
  rig.root.userData.ikRight = false;

  const { mode, elapsed, phase } = params;
  const sway = params.railSway ?? 0;
  const wind = params.windStrength ?? 0.28;
  const vStyle = params.variantStyle ?? 0;
  const breath = (Math.sin(elapsed * 1.85 + phase) + Math.sin(elapsed * 3.7 + phase) * 0.16) * 0.013;

  CLOTH_WIND_TIME_UNIFORM.value = elapsed;
  rig.windUniform.value = mode === 'walking' ? Math.max(wind, 0.58) : wind;

  const windGust =
    (0.55 + 0.45 * Math.sin(elapsed * 1.45 + phase * 0.7)) *
    (Math.sin(elapsed * 4.6 + phase * 1.9) * 0.65 +
      Math.sin(elapsed * 9.8 + phase * 3.1) * 0.35);
  const windGust2 =
    (0.55 + 0.45 * Math.cos(elapsed * 1.32 + phase * 1.1)) *
    (Math.sin(elapsed * 5.2 + phase * 2.5 + 1.2) * 0.65 +
      Math.cos(elapsed * 10.4 + phase * 1.8) * 0.35);
  const clothFlutter = wind * windGust;
  const clothFlutter2 = wind * windGust2;

  if (rig.scarfTailBone) {
    rig.scarfTailBone.rotation.x = -0.12 - Math.abs(clothFlutter) * 0.44 - wind * 0.22;
    rig.scarfTailBone.rotation.z = -0.14 + clothFlutter * 0.56;
  }
  if (rig.scarfSideTailBone) {
    rig.scarfSideTailBone.rotation.x = -0.10 - Math.abs(clothFlutter2) * 0.38 - wind * 0.18;
    rig.scarfSideTailBone.rotation.z = 0.16 + clothFlutter2 * 0.48;
  }
  if (rig.hairTailBone) {
    rig.hairTailBone.rotation.x = 0.06 + Math.abs(clothFlutter) * 0.32 + wind * 0.14;
    rig.hairTailBone.rotation.z = clothFlutter * 0.38;
  }
  if (rig.jacketFlapLeft && rig.jacketFlapRight) {
    rig.jacketFlapLeft.rotation.y = 0.18 + wind * 0.26 + clothFlutter * 0.32;
    rig.jacketFlapLeft.rotation.x = -wind * 0.1 - Math.abs(clothFlutter) * 0.18;
    rig.jacketFlapRight.rotation.y = -0.18 - wind * 0.26 + clothFlutter * 0.32;
    rig.jacketFlapRight.rotation.x = -wind * 0.1 - Math.abs(clothFlutter) * 0.18;
  }

  const blinkPeriod = 3.9 + ((vStyle * 0.37) % 1.4);
  const blinkCycle = (((elapsed + phase * 1.37) % blinkPeriod) + blinkPeriod) % blinkPeriod;
  const blinkAmt = blinkCycle < 0.15 ? Math.sin((blinkCycle / 0.15) * Math.PI) : 0;

  const isReadingProp =
    (mode === 'seated' || mode === 'standing_idle' || mode === 'standing_strap') &&
    (rig.activity === 'phone' || rig.activity === 'newspaper');
  const saccadeYaw = isReadingProp
    ? Math.tanh(Math.sin(elapsed * 2.1 + phase * 1.7) * 3.2) * 0.11
    : Math.tanh(Math.sin(elapsed * 0.85 + phase * 1.9) * 3.8) * 0.21;
  const saccadePitch = isReadingProp
    ? 0.14 + Math.tanh(Math.sin(elapsed * 1.2 + phase) * 2.5) * 0.05
    : Math.tanh(Math.sin(elapsed * 0.58 + phase * 2.3) * 2.8) * 0.08;
  rig.eyeballLeft.rotation.set(saccadePitch, saccadeYaw, 0);
  rig.eyeballRight.rotation.set(saccadePitch, saccadeYaw, 0);
  rig.eyelidLeft.rotation.x = -0.24 + saccadePitch * 0.42 + blinkAmt * 0.58;
  rig.eyelidRight.rotation.x = rig.eyelidLeft.rotation.x;

  const showProps = mode === 'seated' || mode === 'standing_idle' || mode === 'standing_strap';
  if (rig.newspaperProp) rig.newspaperProp.visible = showProps && mode !== 'standing_strap';
  if (rig.phoneProp) rig.phoneProp.visible = showProps;
  if (rig.cigaretteProp) rig.cigaretteProp.visible = showProps;

  const cigCycle = (((elapsed / 4.8 + phase * 0.37) % 1) + 1) % 1;
  const cigSec = cigCycle * 4.8;
  const activeCig = rig.activity === 'cigarette' && showProps;
  let puffWeight = 0;
  let inhaleFactor = 0;
  if (activeCig) {
    if (cigSec < 0.65) {
      puffWeight = smoothstep(0, 0.65, cigSec);
    } else if (cigSec < 1.50) {
      puffWeight = 1.0;
      inhaleFactor = smoothstep(0.65, 1.15, cigSec);
    } else if (cigSec < 2.20) {
      puffWeight = 1.0 - smoothstep(1.50, 2.20, cigSec);
      inhaleFactor = (1.0 - smoothstep(1.50, 1.85, cigSec)) * 0.65;
    }
  }
  const exhaleFactor = activeCig
    ? Math.sin(THREE.MathUtils.clamp((cigSec - 1.55) / 1.30, 0, 1) * Math.PI)
    : 0;
  if (rig.cigEmberMat) {
    rig.cigEmberMat.emissiveIntensity =
      1.65 + (puffWeight * 0.55 + inhaleFactor * 1.15) * 2.8 + Math.sin(elapsed * 9 + phase) * 0.25;
  }

  if (rig.ambientSmokeClouds.length > 0) {
    const activeSmoke = rig.activity === 'cigarette' && showProps;
    const basePelvisY = mode === 'seated' ? rig.seatedPelvisY : rig.standingPelvisY;
    for (let a = 0; a < rig.ambientSmokeClouds.length; a++) {
      const amb = rig.ambientSmokeClouds[a];
      amb.visible = activeSmoke;
      if (!activeSmoke) continue;
      const nearZone = a < 2;
      const driftPhase = elapsed * (nearZone ? 0.32 : 0.22) + phase * 1.7 + a * 1.57;
      const radialDist = nearZone ? 0.36 + a * 0.24 : 1.15 + (a - 2) * 0.68;
      amb.position.set(
        Math.sin(driftPhase) * radialDist + wind * (nearZone ? 0.28 : 0.68),
        basePelvisY + (nearZone ? 0.64 + a * 0.22 : 0.88 + (a - 2) * 0.30) + Math.sin(driftPhase * 0.75 + a) * 0.12,
        Math.cos(driftPhase * 0.85) * radialDist * 0.72 + (nearZone ? 0.22 : 0.34)
      );
      const cloudSize = nearZone ? 0.95 + a * 0.32 : 1.75 + (a - 2) * 0.58;
      amb.scale.set(cloudSize, cloudSize * 0.78, 1);
      const pulse = 0.86 + Math.sin(elapsed * 0.9 + a * 1.9 + phase) * 0.14;
      (amb.material as THREE.SpriteMaterial).opacity = (nearZone ? 0.145 : 0.068) * pulse;
    }
  }

  rig.leftHandGrp.rotation.set(0, 0, 0);
  rig.rightHandGrp.rotation.set(0, 0, 0);
  rig.leftHandNormalMesh.visible = true;
  rig.leftHandStrapMesh.visible = false;
  rig.rightHandNormalMesh.visible = true;
  rig.rightHandStrapMesh.visible = false;
  rig.neck.rotation.set(0, 0, 0);
  rig.leftAnkle.rotation.set(0, 0, 0);
  rig.rightAnkle.rotation.set(0, 0, 0);

  const gripStrapWithArm = (sideSign: -1 | 1) => {
    if (sideSign < 0) {
      rig.leftHandNormalMesh.visible = false;
      rig.leftHandStrapMesh.visible = true;
    } else {
      rig.rightHandNormalMesh.visible = false;
      rig.rightHandStrapMesh.visible = true;
    }
    const strapTarget = params.strapTargetLocal ?? {
      x: -sideSign * 0.16,
      y: 1.62,
      z: 0.28,
    };
    solveStrapArmIK(rig, sideSign, strapTarget);
  };

  const applyActivityUpperPose = (isStandingStrap: boolean) => {
    if (rig.activity === 'newspaper' && !isStandingStrap) {
      const pageRustle = Math.sin(elapsed * 1.05 + phase) * 0.018;
      rig.leftShoulder.rotation.set(-0.62 + pageRustle, 0.12, 0.05);
      rig.leftElbow.rotation.set(-1.08, 0, -0.08);
      rig.leftHandGrp.rotation.set(0.12, -0.32, 0.08);

      rig.rightShoulder.rotation.set(-0.62 - pageRustle, -0.12, -0.05);
      rig.rightElbow.rotation.set(-1.08, 0, 0.08);
      rig.rightHandGrp.rotation.set(0.12, 0.32, -0.08);

      const readYaw = naturalGazePlateau(elapsed * 0.36 + phase, 1.8) * 0.11;
      rig.neck.rotation.set(0.08, readYaw * 0.35, 0);
      rig.head.rotation.set(
        0.18 + Math.sin(elapsed * 0.55 + phase) * 0.025,
        readYaw * 0.65,
        Math.sin(elapsed * 0.3 + phase) * 0.025
      );

      if (rig.newspaperProp) {
        const lPalm = computeHandPalmInChest(rig.leftShoulder, rig.leftElbow, _fkV1);
        const rPalm = computeHandPalmInChest(rig.rightShoulder, rig.rightElbow, _fkV2);
        const spanX = Math.max(0.24, Math.abs(rPalm.x - lPalm.x));
        rig.newspaperProp.position.set(
          (lPalm.x + rPalm.x) * 0.5,
          (lPalm.y + rPalm.y) * 0.5 + 0.044,
          (lPalm.z + rPalm.z) * 0.5 + 0.022
        );
        rig.newspaperProp.scale.set((spanX + 0.028) / 0.42, 1.0, 1.0);
        rig.newspaperProp.rotation.set(0.26, 0, pageRustle * 0.65);
      }
      return true;
    }
    if (rig.activity === 'phone') {
      const scrollFlick = Math.sin(elapsed * 2.8 + phase) * 0.018;
      if (isStandingStrap) {
        gripStrapWithArm(-1);
      } else {
        rig.leftShoulder.rotation.set(-0.10 + breath * 1.4, 0.06, 0.045);
        rig.leftElbow.rotation.set(-0.32, 0, -0.06);
        rig.leftHandGrp.rotation.set(0, -0.10, 0);
      }
      rig.rightShoulder.rotation.set(-0.56, -0.28, -0.06);
      rig.rightElbow.rotation.set(-1.32 + scrollFlick, 0, 0.22);
      rig.rightHandGrp.rotation.set(0.14, 0.72, -0.18);
      const glanceUp = Math.max(0, Math.sin(elapsed * 0.32 + phase * 1.7) - 0.72) * 0.65;
      rig.neck.rotation.set(0.10 - glanceUp * 0.4, -0.02, 0);
      rig.head.rotation.set(
        0.22 - glanceUp * 0.75 + Math.sin(elapsed * 0.65 + phase) * 0.022,
        -0.05 + glanceUp * 0.22,
        -0.03
      );
      return true;
    }
    if (rig.activity === 'cigarette') {
      if (isStandingStrap) {
        gripStrapWithArm(-1);
      } else {
        rig.leftShoulder.rotation.set(-0.12 + breath * 1.2, 0.06, 0.048);
        rig.leftElbow.rotation.set(-0.36, 0, -0.06);
      }
      const smokeLook =
        naturalGazePlateau(elapsed * 0.34 + phase, 2.0) * 0.18 * (1 - puffWeight * 0.85);
      rig.neck.rotation.set(-puffWeight * 0.02, smokeLook * 0.35, 0);
      rig.head.rotation.set(0.02 - puffWeight * 0.04, smokeLook * 0.65, 0.02 * (1 - puffWeight));

      if (puffWeight > 0.001) {
        solveCigaretteArmIK(rig, puffWeight);
      } else {
        rig.rightShoulder.rotation.set(-0.36, -0.14, -0.06);
        rig.rightElbow.rotation.set(-1.02, 0, 0.18);
        rig.rightHandGrp.rotation.set(0.06, 0.28, 0.08);
      }
      return true;
    }
    return false;
  };

  if (mode === 'seated') {
    rig.pelvis.position.set(0, rig.seatedPelvisY, 0.04);
    rig.pelvis.rotation.set(-0.08, 0, sway * 0.24);
    rig.coatTailBone.rotation.set(-0.52, 0, clothFlutter * 0.08);

    rig.spine.rotation.set(0.06 + breath, 0, sway * 0.45);
    rig.chest.rotation.set(breath * 0.7, 0, 0);

    const legStyle = vStyle % 3;
    rig.leftHip.rotation.set(-1.46, legStyle === 1 ? -0.12 : 0.06, -0.05);
    rig.leftKnee.rotation.set(1.42, 0, 0);
    rig.leftAnkle.rotation.set(0.04, 0, 0);
    rig.rightHip.rotation.set(-1.46, legStyle === 2 ? 0.12 : -0.06, 0.05);
    rig.rightKnee.rotation.set(1.42, 0, 0);
    rig.rightAnkle.rotation.set(0.04, 0, 0);

    if (!applyActivityUpperPose(false)) {
      const lookYaw = naturalGazePlateau(elapsed * 0.36 + phase, 2.1) * 0.26;
      const lookPitch = naturalGazePlateau(elapsed * 0.24 + phase * 1.4, 1.8) * 0.07;
      rig.neck.rotation.set(lookPitch * 0.35, lookYaw * 0.38, 0);
      rig.head.rotation.set(lookPitch * 0.65, lookYaw * 0.62, Math.sin(elapsed * 0.32 + phase) * 0.035);

      const armVar = vStyle % 3;
      if (armVar === 0) {
        rig.leftShoulder.rotation.set(-0.42, -0.08, 0.05);
        rig.leftElbow.rotation.set(-0.92, 0, -0.12);
        rig.rightShoulder.rotation.set(-0.42, 0.08, -0.05);
        rig.rightElbow.rotation.set(-0.92, 0, 0.12);
      } else if (armVar === 1) {
        rig.leftShoulder.rotation.set(-0.56, -0.18, 0.06);
        rig.leftElbow.rotation.set(-1.38, 0, -0.18);
        rig.rightShoulder.rotation.set(-0.52, 0.18, -0.06);
        rig.rightElbow.rotation.set(-1.34, 0, 0.18);
      } else {
        rig.leftShoulder.rotation.set(-0.34, -0.08, 0.06);
        rig.leftElbow.rotation.set(-0.78, 0, -0.10);
        rig.rightShoulder.rotation.set(-0.5, 0.12, -0.06);
        rig.rightElbow.rotation.set(-1.1, 0, 0.14);
      }
    }
  } else if (mode === 'worker_desk') {
    rig.pelvis.position.set(0, rig.seatedPelvisY + 0.04, 0);
    rig.pelvis.rotation.set(-0.04, 0, 0);
    rig.coatTailBone.rotation.set(-0.36, 0, 0);
    const deskTurn = naturalGazePlateau(elapsed * 0.42 + phase, 2.0) * 0.12;
    rig.spine.rotation.set(0.1 + breath, deskTurn, 0);
    rig.chest.rotation.set(breath, 0, 0);
    rig.neck.rotation.set(0.03, deskTurn * 0.8, 0);
    rig.head.rotation.set(0.05, deskTurn * 1.4, 0);

    const typeMotion = Math.sin(elapsed * 4.8 + phase) * 0.048;
    rig.leftShoulder.rotation.set(-0.74, -0.06, 0.06);
    rig.leftElbow.rotation.set(-0.92 + typeMotion, 0, -0.10);
    rig.rightShoulder.rotation.set(-0.74, 0.06, -0.06);
    rig.rightElbow.rotation.set(-0.92 - typeMotion, 0, 0.10);

    rig.leftHip.rotation.set(-1.38, 0.04, 0);
    rig.leftKnee.rotation.set(1.36, 0, 0);
    rig.rightHip.rotation.set(-1.38, -0.04, 0);
    rig.rightKnee.rotation.set(1.36, 0, 0);
  } else if (mode === 'worker_guide') {
    const wShift = naturalGazePlateau(elapsed * 0.28 + phase, 1.8);
    const rRelax = Math.max(0, -wShift);
    const lRelax = Math.max(0, wShift);
    rig.pelvis.position.set(wShift * 0.022, rig.standingPelvisY - 0.012, 0);
    rig.pelvis.rotation.set(0.01, -wShift * 0.04, -wShift * 0.038);
    rig.coatTailBone.rotation.set(0.08 + Math.abs(clothFlutter) * 0.22 + wind * 0.1, 0, clothFlutter * 0.22);
    const gTurn = naturalGazePlateau(elapsed * 0.48 + phase, 2.0);
    rig.spine.rotation.set(breath, gTurn * 0.12, wShift * 0.032);
    rig.chest.rotation.set(breath * 0.8, 0, wShift * 0.016);
    rig.neck.rotation.set(0, gTurn * 0.09, 0);
    rig.head.rotation.set(0.02, gTurn * 0.18, 0);

    const wave = Math.sin(elapsed * 3.1 + phase) * 0.22;
    rig.rightShoulder.rotation.set(-1.12 + wave, -0.16, -0.28);
    rig.rightElbow.rotation.set(-0.68 + wave * 0.4, 0, 0);
    rig.leftShoulder.rotation.set(-0.12 + breath, 0.08, 0.055);
    rig.leftElbow.rotation.set(-0.34, 0, -0.04);

    rig.leftHip.rotation.set(-0.04 - lRelax * 0.08, -0.06 - lRelax * 0.08, -0.03 + wShift * 0.03);
    rig.leftKnee.rotation.set(0.06 + lRelax * 0.16, 0, 0);
    rig.leftAnkle.rotation.set(-0.02 - lRelax * 0.08, 0, 0);
    rig.rightHip.rotation.set(-0.04 - rRelax * 0.08, 0.06 + rRelax * 0.08, 0.03 + wShift * 0.03);
    rig.rightKnee.rotation.set(0.06 + rRelax * 0.16, 0, 0);
    rig.rightAnkle.rotation.set(-0.02 - rRelax * 0.08, 0, 0);
  } else if (mode === 'standing_strap') {
    const wShift = naturalGazePlateau(elapsed * 0.22 + phase, 1.8) * 0.72;
    const rRelax = Math.max(0, -wShift);
    const lRelax = Math.max(0, wShift);
    rig.pelvis.position.set(wShift * 0.020 + sway * 0.015, rig.standingPelvisY - 0.010, 0);
    rig.pelvis.rotation.set(0.015, -wShift * 0.04, -wShift * 0.035 + sway * 0.32);
    rig.coatTailBone.rotation.set(0.06 + Math.abs(clothFlutter) * 0.2 + wind * 0.08, 0, clothFlutter * 0.22);
    rig.spine.rotation.set(0.01 + breath, wShift * 0.03, wShift * 0.028 + sway * 0.65);
    rig.chest.rotation.set(breath * 0.75, 0, wShift * 0.014);

    rig.leftHip.rotation.set(-0.04 - lRelax * 0.09, -0.07 - lRelax * 0.08, -0.035 + wShift * 0.03);
    rig.leftKnee.rotation.set(0.06 + lRelax * 0.17, 0, 0);
    rig.leftAnkle.rotation.set(-0.02 - lRelax * 0.08, 0, 0);
    rig.rightHip.rotation.set(-0.04 - rRelax * 0.09, 0.07 + rRelax * 0.08, 0.035 + wShift * 0.03);
    rig.rightKnee.rotation.set(0.06 + rRelax * 0.17, 0, 0);
    rig.rightAnkle.rotation.set(-0.02 - rRelax * 0.08, 0, 0);

    if (!applyActivityUpperPose(true)) {
      const lookYaw = naturalGazePlateau(elapsed * 0.34 + phase, 2.2) * 0.28;
      const lookPitch = naturalGazePlateau(elapsed * 0.23 + phase * 1.3, 1.8) * 0.06;
      rig.neck.rotation.set(lookPitch * 0.35, lookYaw * 0.38, -sway * 0.15);
      rig.head.rotation.set(lookPitch * 0.65, lookYaw * 0.62, -sway * 0.22 + wShift * 0.03);
      const useRight = vStyle % 2 === 0;
      if (useRight) {
        gripStrapWithArm(1);
        rig.leftShoulder.rotation.set(-0.10 + sway * 0.32 + breath, 0.06, 0.048);
        rig.leftElbow.rotation.set(-0.32, 0, -0.05);
      } else {
        gripStrapWithArm(-1);
        rig.rightShoulder.rotation.set(-0.10 - sway * 0.32 + breath, -0.06, -0.048);
        rig.rightElbow.rotation.set(-0.32, 0, 0.05);
      }
    }
  } else if (mode === 'standing_idle') {
    const stanceSide = vStyle % 2 === 0 ? 1 : -1;
    const wShift = THREE.MathUtils.clamp(
      stanceSide * 0.42 + naturalGazePlateau(elapsed * 0.24 + phase, 1.9) * 0.62,
      -1,
      1
    );
    const lRelax = Math.max(0, wShift);
    const rRelax = Math.max(0, -wShift);
    const settleDrop = Math.abs(wShift) * 0.015;

    rig.pelvis.position.set(wShift * 0.030, rig.standingPelvisY - settleDrop, 0);
    rig.pelvis.rotation.set(0.015, -wShift * 0.065, -wShift * 0.052);
    rig.coatTailBone.rotation.set(0.08 + Math.abs(clothFlutter) * 0.28 + wind * 0.14, 0, clothFlutter * 0.32 - wShift * 0.04);
    rig.spine.rotation.set(0.012 + breath, wShift * 0.045, wShift * 0.044);
    rig.chest.rotation.set(breath * 0.85, wShift * 0.025, wShift * 0.022);

    rig.leftHip.rotation.set(-0.02 - lRelax * 0.12, -0.07 - lRelax * 0.10, -0.025 + wShift * 0.048);
    rig.leftKnee.rotation.set(0.04 + lRelax * 0.22, 0, 0);
    rig.leftAnkle.rotation.set(-0.02 - lRelax * 0.10, 0, -wShift * 0.02);

    rig.rightHip.rotation.set(-0.02 - rRelax * 0.12, 0.07 + rRelax * 0.10, 0.025 + wShift * 0.048);
    rig.rightKnee.rotation.set(0.04 + rRelax * 0.22, 0, 0);
    rig.rightAnkle.rotation.set(-0.02 - rRelax * 0.10, 0, -wShift * 0.02);

    if (!applyActivityUpperPose(false)) {
      const lookYaw = naturalGazePlateau(elapsed * 0.34 + phase, 2.2) * 0.29;
      const lookPitch = naturalGazePlateau(elapsed * 0.22 + phase * 1.4, 1.8) * 0.065;
      rig.neck.rotation.set(lookPitch * 0.36, lookYaw * 0.38, -wShift * 0.02);
      rig.head.rotation.set(lookPitch * 0.64, lookYaw * 0.62, -wShift * 0.032 + Math.sin(elapsed * 0.28 + phase) * 0.025);

      const idleVar = vStyle % 3;
      if (idleVar === 0) {
        rig.leftShoulder.rotation.set(-0.07 + breath * 1.6, 0.05, 0.042 - wShift * 0.015);
        rig.leftElbow.rotation.set(-0.26 - lRelax * 0.08, 0, -0.05);
        rig.rightShoulder.rotation.set(-0.10 - breath * 1.2, -0.05, -0.042 - wShift * 0.015);
        rig.rightElbow.rotation.set(-0.32 - rRelax * 0.08, 0, 0.05);
      } else if (idleVar === 1) {
        rig.leftShoulder.rotation.set(-0.22 + breath * 1.4, -0.08, 0.048);
        rig.leftElbow.rotation.set(-0.68, 0, -0.12);
        rig.rightShoulder.rotation.set(-0.08 - breath * 1.2, 0.05, -0.042);
        rig.rightElbow.rotation.set(-0.28, 0, 0.05);
      } else {
        rig.leftShoulder.rotation.set(-0.32 + breath * 1.4, -0.14, 0.055);
        rig.leftElbow.rotation.set(-1.12, 0, -0.14);
        rig.rightShoulder.rotation.set(-0.30 - breath * 1.2, 0.14, -0.055);
        rig.rightElbow.rotation.set(-1.08, 0, 0.14);
      }
    }
  } else {
    const w = params.walkCycle ?? elapsed * 6.8 + phase;
    const sinW = Math.tanh(Math.sin(w) * 1.18);
    const cosW = Math.cos(w);
    const doubleBounce = Math.abs(cosW) * 0.028;

    rig.pelvis.position.set(sinW * 0.016, rig.standingPelvisY - 0.016 + doubleBounce, 0);
    rig.pelvis.rotation.set(0.035, sinW * 0.085, -sinW * 0.042);
    rig.coatTailBone.rotation.set(
      0.16 + Math.abs(sinW) * 0.18 + wind * 0.18 + Math.abs(clothFlutter) * 0.24,
      0,
      clothFlutter * 0.3
    );
    rig.spine.rotation.set(0.035 + breath * 0.6, -sinW * 0.11, sinW * 0.034);
    rig.chest.rotation.set(breath * 0.7, -sinW * 0.04, 0);
    const walkLook = naturalGazePlateau(elapsed * 0.42 + phase, 1.9) * 0.14;
    rig.neck.rotation.set(-0.01, walkLook * 0.38, 0);
    rig.head.rotation.set(-0.015, walkLook * 0.62, -sinW * 0.014);

    const lStride = sinW * 0.52;
    const rStride = -sinW * 0.52;
    rig.leftHip.rotation.set(-lStride, -0.03, -0.015 + sinW * 0.018);
    rig.leftKnee.rotation.set(Math.max(0.04, -cosW * 0.64 + 0.11), 0, 0);
    rig.leftAnkle.rotation.set(lStride * 0.28 - Math.max(0, -cosW) * 0.12, 0, 0);

    rig.rightHip.rotation.set(-rStride, 0.03, 0.015 + sinW * 0.018);
    rig.rightKnee.rotation.set(Math.max(0.04, cosW * 0.64 + 0.11), 0, 0);
    rig.rightAnkle.rotation.set(rStride * 0.28 - Math.max(0, cosW) * 0.12, 0, 0);

    rig.leftShoulder.rotation.set(sinW * 0.40 - 0.05, 0.04, 0.048);
    rig.leftElbow.rotation.set(-0.22 - Math.max(0, -sinW) * 0.34, 0, -0.04);
    rig.leftHandGrp.rotation.set(-cosW * 0.10, 0, 0);
    rig.rightShoulder.rotation.set(-sinW * 0.40 - 0.05, -0.04, -0.048);
    rig.rightElbow.rotation.set(-0.22 - Math.max(0, sinW) * 0.34, 0, 0.04);
    rig.rightHandGrp.rotation.set(cosW * 0.10, 0, 0);
  }

  const sidestepYaw = params.sidestepYaw ?? 0;
  if (Math.abs(sidestepYaw) > 0.002) {
    rig.spine.rotation.y += sidestepYaw * 0.45;
    rig.chest.rotation.y += sidestepYaw * 0.55;
    rig.neck.rotation.y -= sidestepYaw * 0.22;
  }
  const nodPitch = params.nodPitch ?? 0;
  if (Math.abs(nodPitch) > 0.002) {
    rig.neck.rotation.x += nodPitch * 0.42;
    rig.head.rotation.x += nodPitch * 0.58;
  }

  if (params.weaponPose === 'aim') {
    rig.rightShoulder.rotation.set(-1.32, 0.08, -0.05);
    rig.rightElbow.rotation.set(-0.24, 0, 0.05);
    rig.rightHandGrp.rotation.set(0.06, 0, 0);
    rig.spine.rotation.y += 0.14;
    rig.head.rotation.y -= 0.10;
  } else if (params.weaponPose === 'ready') {
    rig.rightShoulder.rotation.set(-0.42, 0.06, -0.06);
    rig.rightElbow.rotation.set(-0.62, 0, 0.06);
    rig.rightHandGrp.rotation.set(0.10, 0, 0);
  }

  const upset = THREE.MathUtils.clamp(params.upsetProgress ?? 0, 0, 1);
  if (upset > 0.005) {
    const glareYaw = THREE.MathUtils.clamp(params.upsetLookYaw ?? 0.55, -0.95, 0.95);
    rig.neck.rotation.y = THREE.MathUtils.lerp(rig.neck.rotation.y, glareYaw * 0.36, upset);
    rig.head.rotation.y = THREE.MathUtils.lerp(rig.head.rotation.y, glareYaw * 0.64, upset);
    rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, -0.05, upset);

    const shake = Math.sin(elapsed * 9.5 + phase) * 0.18 * upset;
    if (mode !== 'seated' && rig.activity !== 'newspaper') {
      const canUseLeft = !rig.leftHandStrapMesh.visible;
      if (canUseLeft) {
        rig.leftShoulder.rotation.x = THREE.MathUtils.lerp(rig.leftShoulder.rotation.x, -0.78 + shake * 0.4, upset);
        rig.leftShoulder.rotation.z = THREE.MathUtils.lerp(rig.leftShoulder.rotation.z, 0.18, upset);
        rig.leftElbow.rotation.x = THREE.MathUtils.lerp(rig.leftElbow.rotation.x, -1.28 + shake, upset);
        rig.leftHandGrp.rotation.set(0.24, -0.22, shake * 0.8);
      } else if (rig.activity !== 'cigarette') {
        rig.rightShoulder.rotation.x = THREE.MathUtils.lerp(rig.rightShoulder.rotation.x, -0.78 + shake * 0.4, upset);
        rig.rightShoulder.rotation.z = THREE.MathUtils.lerp(rig.rightShoulder.rotation.z, -0.18, upset);
        rig.rightElbow.rotation.x = THREE.MathUtils.lerp(rig.rightElbow.rotation.x, -1.28 + shake, upset);
        rig.rightHandGrp.rotation.set(0.24, 0.22, -shake * 0.8);
      }
    }
  }

  if (rig.smokePuffs.length > 0) {
    if (activeCig) {
      computeCigarettePointInChest(rig, CIG_EMBER_LOCAL.x, _cigTmpV);
      computeMouthTargetInChest(rig, _cigLipChest);
    }
    for (let s = 0; s < rig.smokePuffs.length; s++) {
      const sp = rig.smokePuffs[s];
      sp.visible = activeCig;
      if (!activeCig) continue;
      const t = (((elapsed * 0.36 + s / rig.smokePuffs.length + phase * 0.2) % 1) + 1) % 1;
      const isExhalePuff = s === 4 && exhaleFactor > 0.08;
      const ox = isExhalePuff ? _cigLipChest.x : _cigTmpV.x;
      const oy = isExhalePuff ? _cigLipChest.y : _cigTmpV.y;
      const oz = isExhalePuff ? _cigLipChest.z + t * 0.26 : _cigTmpV.z + t * 0.10;
      const curlX =
        Math.sin(elapsed * 1.85 + s * 2.1 + t * 4.5 + phase) * (0.04 + t * 0.12) + wind * 0.24 * t;
      const curlZ = Math.cos(elapsed * 1.45 + s * 1.7 + t * 3.2 + phase) * (0.03 + t * 0.08);
      sp.position.set(ox + curlX, oy + t * 0.62, oz + curlZ);
      const sz = (isExhalePuff ? 0.12 : 0.055) + t * (isExhalePuff ? 0.44 : 0.34);
      sp.scale.set(sz, sz, 1);
      const env = Math.sin(t * Math.PI);
      const baseAlpha = isExhalePuff ? 0.28 * exhaleFactor : 0.26 + puffWeight * 0.14;
      (sp.material as THREE.SpriteMaterial).opacity = env * baseAlpha;
    }
  }

  syncMpfbsFromRig(rig);
}
