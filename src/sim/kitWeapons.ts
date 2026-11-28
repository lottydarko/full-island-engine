import * as THREE from 'three';
import type { SharedWeaponId } from './sharedWeapon';

export type KitWeaponVariant = 'player' | 'enemy';

export interface KitWeaponBuildOptions {
  variant?: KitWeaponVariant;
  maxAnisotropy?: number;
  /** Disable embedded THREE.PointLight objects on enemy clones so pooled muzzle lights handle dynamic spill */
  disableInternalLights?: boolean;
}

export interface NormalizedKitWeaponRig {
  weaponId: SharedWeaponId;
  variant: KitWeaponVariant;
  /** Inner kit root (oriented -Z forward before alignment wrapper) */
  kitRoot: THREE.Group;
  /** Outer normalized root (+Z forward, grip centered at (0, -0.038, -0.016)) */
  normalizedRoot: THREE.Group;
  muzzleAnchor: THREE.Object3D;
  handguardAnchor: THREE.Object3D;
  magazineGroup: THREE.Group;
  pumpGroup: THREE.Group | null;
  shellInsertMesh: THREE.Mesh | null;
  ledClusterLocalPos: THREE.Vector3;
  ledCount: number;
  setSlideOffset: (backMeters: number) => void;
  setPumpOffset: (amount01: number) => void;
  setTriggerPull: (amount01: number) => void;
  setMuzzleFlash: (intensity: number) => void;
  setFlashlightOn: (on: boolean) => void;
  setFireGlow: (heat01: number) => void;
  setReloadMagOffset: (ox: number, oy: number, oz: number, rotX?: number, rotZ?: number) => void;
  /** Player ammo/reload LED driver (Green -> Yellow -> Red + arcade rainbow swirl) */
  updateLeds: (ammo: number, maxAmmo: number, isReloading: boolean, elapsed: number) => void;
  /** Enemy detection/aim/fire RED loading-light driver on the exact same kit LED fixtures */
  updateEnemyLeds: (
    ramp: number,
    firePulse: number,
    isReloading: boolean,
    reloadProgress: number,
    elapsed: number,
    phase?: number
  ) => void;
  dispose: () => void;
}

// ============================================================================
// CACHED PROCEDURAL TEXTURES (Generated ONCE globally — zero per-spawn cost)
// ============================================================================

interface GunmetalTexSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  barrelMap: THREE.CanvasTexture;
  barrelNormalMap: THREE.CanvasTexture;
}

interface StippleTexSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

interface RussianMetalTexSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
}

interface OrganicTexSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

let _cachedGunmetal: GunmetalTexSet | null = null;
let _cachedStipple: StippleTexSet | null = null;
const _cachedRusted = new Map<number, RussianMetalTexSet>();
let _cachedWood: OrganicTexSet | null = null;
let _cachedBakelite: OrganicTexSet | null = null;
let _cachedBeamFade: THREE.CanvasTexture | null = null;
let _cachedFlashTex: THREE.CanvasTexture | null = null;

function hash2d(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function makeNormalFromHeight(
  heights: Float32Array,
  size: number,
  strength: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * strength;
      const len = Math.hypot(dx, dy, 1);
      const idx = (y * size + x) * 4;
      d[idx] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function configureTex(tex: THREE.CanvasTexture, aniso: number, srgb = false): THREE.CanvasTexture {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.max(1, Math.min(8, aniso));
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function getGunmetalTextures(aniso: number): GunmetalTexSet {
  if (_cachedGunmetal) return _cachedGunmetal;
  const S = 128;
  const h = new Float32Array(S * S);
  const bh = new Float32Array(S * S);

  const cMap = document.createElement('canvas');
  cMap.width = S;
  cMap.height = S;
  const ctxMap = cMap.getContext('2d')!;
  const imgMap = ctxMap.createImageData(S, S);

  const cRough = document.createElement('canvas');
  cRough.width = S;
  cRough.height = S;
  const ctxRough = cRough.getContext('2d')!;
  const imgRough = ctxRough.createImageData(S, S);

  const cBarrel = document.createElement('canvas');
  cBarrel.width = S;
  cBarrel.height = S;
  const ctxBarrel = cBarrel.getContext('2d')!;
  const imgBarrel = ctxBarrel.createImageData(S, S);

  for (let y = 0; y < S; y++) {
    const brushStreak = (hash2d(0, y, 3) - 0.5) * 0.14;
    for (let x = 0; x < S; x++) {
      const idx = y * S + x;
      const g = hash2d(x, y, 1) * 0.12 + brushStreak + Math.sin(y * 0.9) * 0.04;
      h[idx] = 0.5 + g;
      const v = Math.round(THREE.MathUtils.clamp(210 + g * 95, 165, 245));
      imgMap.data[idx * 4] = v;
      imgMap.data[idx * 4 + 1] = v + 2;
      imgMap.data[idx * 4 + 2] = v + 6;
      imgMap.data[idx * 4 + 3] = 255;

      const rv = Math.round(THREE.MathUtils.clamp(115 + g * 120, 72, 180));
      imgRough.data[idx * 4] = rv;
      imgRough.data[idx * 4 + 1] = rv;
      imgRough.data[idx * 4 + 2] = rv;
      imgRough.data[idx * 4 + 3] = 255;

      const lat = (hash2d(x, y * 0.25, 9) - 0.5) * 0.18 + Math.sin(x * 1.4) * 0.05;
      bh[idx] = 0.5 + lat;
      const bv = Math.round(THREE.MathUtils.clamp(225 + lat * 75, 180, 250));
      imgBarrel.data[idx * 4] = bv;
      imgBarrel.data[idx * 4 + 1] = bv;
      imgBarrel.data[idx * 4 + 2] = bv + 3;
      imgBarrel.data[idx * 4 + 3] = 255;
    }
  }
  ctxMap.putImageData(imgMap, 0, 0);
  ctxRough.putImageData(imgRough, 0, 0);
  ctxBarrel.putImageData(imgBarrel, 0, 0);

  _cachedGunmetal = {
    map: configureTex(new THREE.CanvasTexture(cMap), aniso, true),
    normalMap: configureTex(makeNormalFromHeight(h, S, 1.4), aniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(cRough), aniso),
    barrelMap: configureTex(new THREE.CanvasTexture(cBarrel), aniso, true),
    barrelNormalMap: configureTex(makeNormalFromHeight(bh, S, 1.6), aniso),
  };
  return _cachedGunmetal;
}

function getStippleTextures(aniso: number): StippleTexSet {
  if (_cachedStipple) return _cachedStipple;
  const S = 128;
  const h = new Float32Array(S * S);

  const cMap = document.createElement('canvas');
  cMap.width = S;
  cMap.height = S;
  const ctxMap = cMap.getContext('2d')!;
  const imgMap = ctxMap.createImageData(S, S);

  const cRough = document.createElement('canvas');
  cRough.width = S;
  cRough.height = S;
  const ctxRough = cRough.getContext('2d')!;
  const imgRough = ctxRough.createImageData(S, S);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = y * S + x;
      const cell = Math.sin(x * 1.2) * Math.sin(y * 1.2) * 0.5 + 0.5;
      const grit = hash2d(x, y, 17) * 0.55 + cell * 0.45;
      h[idx] = grit;
      const cVal = Math.round(30 + grit * 26);
      imgMap.data[idx * 4] = cVal;
      imgMap.data[idx * 4 + 1] = cVal + 1;
      imgMap.data[idx * 4 + 2] = cVal + 3;
      imgMap.data[idx * 4 + 3] = 255;

      const rVal = Math.round(170 + grit * 75);
      imgRough.data[idx * 4] = rVal;
      imgRough.data[idx * 4 + 1] = rVal;
      imgRough.data[idx * 4 + 2] = rVal;
      imgRough.data[idx * 4 + 3] = 255;
    }
  }
  ctxMap.putImageData(imgMap, 0, 0);
  ctxRough.putImageData(imgRough, 0, 0);

  _cachedStipple = {
    map: configureTex(new THREE.CanvasTexture(cMap), aniso, true),
    normalMap: configureTex(makeNormalFromHeight(h, S, 2.2), aniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(cRough), aniso),
  };
  return _cachedStipple;
}

function getRustedRussianTextures(aniso: number, seed: number): RussianMetalTexSet {
  const cached = _cachedRusted.get(seed);
  if (cached) return cached;
  const S = 128;
  const h = new Float32Array(S * S);

  const cMap = document.createElement('canvas');
  cMap.width = S;
  cMap.height = S;
  const ctxMap = cMap.getContext('2d')!;
  const imgMap = ctxMap.createImageData(S, S);

  const cRough = document.createElement('canvas');
  cRough.width = S;
  cRough.height = S;
  const ctxRough = cRough.getContext('2d')!;
  const imgRough = ctxRough.createImageData(S, S);

  const cMet = document.createElement('canvas');
  cMet.width = S;
  cMet.height = S;
  const ctxMet = cMet.getContext('2d')!;
  const imgMet = ctxMet.createImageData(S, S);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = y * S + x;
      const n1 = Math.sin(x * 0.14 + seed) * Math.cos(y * 0.16 - seed);
      const n2 = hash2d(x, y, seed * 11) * 0.55;
      const pit = THREE.MathUtils.clamp((n1 * 0.5 + 0.5) * 0.55 + n2 * 0.45, 0, 1);
      h[idx] = 1 - pit * 0.7;

      const rustMask = smoothstepLocal(0.54, 0.88, pit);
      const r = Math.round(THREE.MathUtils.lerp(42, 118, rustMask));
      const g = Math.round(THREE.MathUtils.lerp(45, 58, rustMask));
      const b = Math.round(THREE.MathUtils.lerp(50, 34, rustMask));
      imgMap.data[idx * 4] = r;
      imgMap.data[idx * 4 + 1] = g;
      imgMap.data[idx * 4 + 2] = b;
      imgMap.data[idx * 4 + 3] = 255;

      const rough = Math.round(THREE.MathUtils.lerp(95, 224, rustMask));
      imgRough.data[idx * 4] = rough;
      imgRough.data[idx * 4 + 1] = rough;
      imgRough.data[idx * 4 + 2] = rough;
      imgRough.data[idx * 4 + 3] = 255;

      const met = Math.round(THREE.MathUtils.lerp(235, 92, rustMask));
      imgMet.data[idx * 4] = met;
      imgMet.data[idx * 4 + 1] = met;
      imgMet.data[idx * 4 + 2] = met;
      imgMet.data[idx * 4 + 3] = 255;
    }
  }
  ctxMap.putImageData(imgMap, 0, 0);
  ctxRough.putImageData(imgRough, 0, 0);
  ctxMet.putImageData(imgMet, 0, 0);

  const res: RussianMetalTexSet = {
    map: configureTex(new THREE.CanvasTexture(cMap), aniso, true),
    normalMap: configureTex(makeNormalFromHeight(h, S, 2.0), aniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(cRough), aniso),
    metalnessMap: configureTex(new THREE.CanvasTexture(cMet), aniso),
  };
  _cachedRusted.set(seed, res);
  return res;
}

function getRussianWoodTextures(aniso: number): OrganicTexSet {
  if (_cachedWood) return _cachedWood;
  const S = 128;
  const h = new Float32Array(S * S);

  const cMap = document.createElement('canvas');
  cMap.width = S;
  cMap.height = S;
  const ctxMap = cMap.getContext('2d')!;
  const imgMap = ctxMap.createImageData(S, S);

  const cRough = document.createElement('canvas');
  cRough.width = S;
  cRough.height = S;
  const ctxRough = cRough.getContext('2d')!;
  const imgRough = ctxRough.createImageData(S, S);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = y * S + x;
      const ring = Math.sin(x * 0.28 + Math.sin(y * 0.08) * 2.2) * 0.5 + 0.5;
      const grain = hash2d(x, y * 0.4, 29) * 0.25 + ring * 0.75;
      h[idx] = grain;
      imgMap.data[idx * 4] = Math.round(92 + grain * 58);
      imgMap.data[idx * 4 + 1] = Math.round(52 + grain * 36);
      imgMap.data[idx * 4 + 2] = Math.round(28 + grain * 22);
      imgMap.data[idx * 4 + 3] = 255;

      const rv = Math.round(145 + (1 - grain) * 65);
      imgRough.data[idx * 4] = rv;
      imgRough.data[idx * 4 + 1] = rv;
      imgRough.data[idx * 4 + 2] = rv;
      imgRough.data[idx * 4 + 3] = 255;
    }
  }
  ctxMap.putImageData(imgMap, 0, 0);
  ctxRough.putImageData(imgRough, 0, 0);

  _cachedWood = {
    map: configureTex(new THREE.CanvasTexture(cMap), aniso, true),
    normalMap: configureTex(makeNormalFromHeight(h, S, 1.8), aniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(cRough), aniso),
  };
  return _cachedWood;
}

function getBakeliteTextures(aniso: number): OrganicTexSet {
  if (_cachedBakelite) return _cachedBakelite;
  const S = 128;
  const h = new Float32Array(S * S);

  const cMap = document.createElement('canvas');
  cMap.width = S;
  cMap.height = S;
  const ctxMap = cMap.getContext('2d')!;
  const imgMap = ctxMap.createImageData(S, S);

  const cRough = document.createElement('canvas');
  cRough.width = S;
  cRough.height = S;
  const ctxRough = cRough.getContext('2d')!;
  const imgRough = ctxRough.createImageData(S, S);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = y * S + x;
      const swirl =
        Math.sin(x * 0.16 + y * 0.11 + Math.cos(x * 0.09 - y * 0.14) * 2.4) * 0.5 + 0.5;
      const mottle = swirl * 0.72 + hash2d(x, y, 41) * 0.28;
      h[idx] = mottle;
      imgMap.data[idx * 4] = Math.round(115 + mottle * 68);
      imgMap.data[idx * 4 + 1] = Math.round(38 + mottle * 28);
      imgMap.data[idx * 4 + 2] = Math.round(18 + mottle * 14);
      imgMap.data[idx * 4 + 3] = 255;

      const rv = Math.round(98 + mottle * 62);
      imgRough.data[idx * 4] = rv;
      imgRough.data[idx * 4 + 1] = rv;
      imgRough.data[idx * 4 + 2] = rv;
      imgRough.data[idx * 4 + 3] = 255;
    }
  }
  ctxMap.putImageData(imgMap, 0, 0);
  ctxRough.putImageData(imgRough, 0, 0);

  _cachedBakelite = {
    map: configureTex(new THREE.CanvasTexture(cMap), aniso, true),
    normalMap: configureTex(makeNormalFromHeight(h, S, 1.3), aniso),
    roughnessMap: configureTex(new THREE.CanvasTexture(cRough), aniso),
  };
  return _cachedBakelite;
}

function getSoftBeamFadeTexture(): THREE.CanvasTexture {
  if (_cachedBeamFade) return _cachedBeamFade;
  const w = 16;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.42)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  _cachedBeamFade = new THREE.CanvasTexture(c);
  _cachedBeamFade.wrapS = THREE.ClampToEdgeWrapping;
  _cachedBeamFade.wrapT = THREE.ClampToEdgeWrapping;
  return _cachedBeamFade;
}

function getFlashTexture(): THREE.CanvasTexture {
  if (_cachedFlashTex) return _cachedFlashTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  g.addColorStop(0, 'rgba(255,255,244,1)');
  g.addColorStop(0.28, 'rgba(255,222,126,0.94)');
  g.addColorStop(0.62, 'rgba(255,124,22,0.52)');
  g.addColorStop(1, 'rgba(180,24,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _cachedFlashTex = new THREE.CanvasTexture(c);
  _cachedFlashTex.colorSpace = THREE.SRGBColorSpace;
  return _cachedFlashTex;
}

function smoothstepLocal(e0: number, e1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// ============================================================================
// SHADER & MESH HELPERS (SHARED PROGRAM CACHE KEYS FOR 60 FPS CROWD PERF)
// ============================================================================

function enhanceGunMetalMaterial<T extends THREE.MeshPhysicalMaterial>(
  mat: T,
  _opts: { edgeWear?: number; cavityDepth?: number; sheenColor?: number; sheenStrength?: number } = {}
): T {
  if (_opts.sheenColor !== undefined) {
    mat.sheen = _opts.sheenStrength ?? 0.25;
    mat.sheenRoughness = 0.55;
    mat.sheenColor = new THREE.Color(_opts.sheenColor);
  }
  return mat;
}

function enhanceGunWoodMaterial<T extends THREE.MeshPhysicalMaterial>(mat: T, sheen = 0.2): T {
  mat.sheen = sheen;
  mat.sheenRoughness = 0.72;
  mat.sheenColor = new THREE.Color(0x523828);
  return mat;
}

interface MuzzleFlashRigHandle {
  group: THREE.Group;
  light: THREE.PointLight | null;
  setIntensity: (intensity: number) => void;
  dispose: () => void;
}

function createPhotorealisticMuzzleFlash(opts: {
  profile: 'smg' | 'shotgun';
  scale: number;
  tintHex: number;
  lightRange: number;
  lightIntensity: number;
  enableLight?: boolean;
}): MuzzleFlashRigHandle {
  const group = new THREE.Group();
  group.visible = false;
  const tex = getFlashTexture();

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    color: opts.tintHex,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });

  const finGeo = new THREE.PlaneGeometry(0.18 * opts.scale, 0.26 * opts.scale);
  finGeo.translate(0, 0.11 * opts.scale, 0);

  for (let k = 0; k < 3; k++) {
    const fin = new THREE.Mesh(finGeo, mat);
    fin.rotation.x = -Math.PI * 0.5;
    fin.rotation.y = (k * Math.PI) / 3;
    group.add(fin);
  }

  const coreGeo = new THREE.ConeGeometry(0.052 * opts.scale, 0.22 * opts.scale, 6, 1, true);
  coreGeo.rotateX(-Math.PI * 0.5);
  coreGeo.translate(0, 0, -0.10 * opts.scale);
  const cone = new THREE.Mesh(coreGeo, mat);
  group.add(cone);

  const light =
    opts.enableLight !== false
      ? new THREE.PointLight(opts.tintHex, 0, opts.lightRange, 2)
      : null;
  if (light) group.add(light);

  return {
    group,
    light,
    setIntensity(intensity: number) {
      const i = THREE.MathUtils.clamp(intensity, 0, 1.5);
      group.visible = i > 0.01;
      if (group.visible) {
        mat.opacity = Math.min(1, i);
        const s = 0.72 + i * 0.48;
        group.scale.set(s, s, s);
        group.rotation.z = Math.random() * Math.PI * 2;
      }
      if (light) {
        light.intensity = i * opts.lightIntensity;
      }
    },
    dispose() {
      finGeo.dispose();
      coreGeo.dispose();
      mat.dispose();
    },
  };
}

function createUnderbarrelFlashlight(options: {
  maxAnisotropy: number;
  rustic?: boolean;
  orangeAccent?: boolean;
  scale?: number;
  enemyBlack?: boolean;
}) {
  const { maxAnisotropy, rustic = false, orangeAccent = false, scale = 1.0, enemyBlack = false } = options;
  const group = new THREE.Group();
  group.name = 'UnderbarrelWeaponFlashlight';
  const gunmetal = getGunmetalTextures(maxAnisotropy);
  const beamFadeTex = getSoftBeamFadeTexture();
  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: enemyBlack ? 0x101318 : rustic ? 0x3b2c25 : 0x181c22,
    ...(enemyBlack ? {} : { map: gunmetal.map }),
    normalMap: gunmetal.normalMap,
    normalScale: new THREE.Vector2(rustic ? 1.1 : 0.7, rustic ? 1.1 : 0.7),
    roughnessMap: gunmetal.roughnessMap,
    metalness: enemyBlack ? 0.75 : rustic ? 0.62 : 0.84,
    roughness: enemyBlack ? 0.42 : rustic ? 0.56 : 0.34,
  });

  const accentMat = new THREE.MeshPhysicalMaterial({
    color: enemyBlack ? 0x171b22 : orangeAccent ? 0xff5a10 : rustic ? 0x8d6c3d : 0x2a303a,
    metalness: 0.75,
    roughness: 0.34,
  });

  const reflectorMat = new THREE.MeshStandardMaterial({
    color: enemyBlack ? 0x28303a : 0xe6ecf5,
    metalness: 0.92,
    roughness: 0.14,
  });

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xdce6f2,
    emissive: 0xfff3dc,
    emissiveIntensity: 0,
    roughness: 0.08,
    metalness: 0.1,
  });

  const beamConeMat = new THREE.MeshBasicMaterial({
    color: 0xfff5e4,
    alphaMap: beamFadeTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  disposables.push(bodyMat, accentMat, reflectorMat, lensMat, beamConeMat);

  const clamp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.017, 0.011, 0.030)), bodyMat);
  clamp.position.set(0, 0.0085, 0.002);
  group.add(clamp);

  const body = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0092, 0.0088, 0.062, 16)), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const ring = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0102, 0.0102, 0.006, 16)), accentMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.z = -0.022;
  group.add(ring);

  const bezel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0118, 0.0096, 0.016, 18)), bodyMat);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.z = -0.034;
  group.add(bezel);

  const reflector = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0102, 0.0045, 0.009, 16, 1, true)),
    reflectorMat
  );
  reflector.rotation.x = Math.PI / 2;
  reflector.position.z = -0.038;
  group.add(reflector);

  const lens = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.0102, 16)), lensMat);
  lens.rotation.y = Math.PI;
  lens.position.z = -0.0422;
  group.add(lens);

  const tailCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0082, 0.0076, 0.012, 14)), accentMat);
  tailCap.rotation.x = Math.PI / 2;
  tailCap.position.z = 0.035;
  group.add(tailCap);

  const coneGeo = trackGeo(new THREE.ConeGeometry(0.18, 0.62, 16, 1, true));
  coneGeo.translate(0, -0.31, 0);
  coneGeo.rotateX(Math.PI / 2);
  const beamCone = new THREE.Mesh(coneGeo, beamConeMat);
  beamCone.position.z = -0.043;
  beamCone.visible = false;
  group.add(beamCone);

  group.scale.setScalar(scale);

  return {
    group,
    setOn(on: boolean) {
      lensMat.emissiveIntensity = on ? 6.0 : 0;
      beamCone.visible = on;
      beamConeMat.opacity = on ? 0.075 : 0;
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

// ============================================================================
// SHARED KIT SUB-BUILDERS (Grip, Vacuum Bulbs, 4-LED Rear Panel)
// ============================================================================

function ammoFractionToHue(frac: number): number {
  const f = THREE.MathUtils.clamp(frac, 0, 1);
  return f >= 0.5
    ? THREE.MathUtils.lerp(0.145, 0.36, (f - 0.5) * 2.0)
    : THREE.MathUtils.lerp(0.0, 0.145, f * 2.0);
}

const _enemyDarkRed = new THREE.Color('#160204');
const _enemyKindleRed = new THREE.Color('#8c090e');
const _enemyBlazeRed = new THREE.Color('#ff1c14');
const _enemyEmissiveRed = new THREE.Color('#ff120c');

function driveRedLoadingMaterial(
  mat: THREE.MeshStandardMaterial,
  segStrength: number,
  pulse: number
): void {
  if (segStrength <= 0.02) {
    mat.color.copy(_enemyDarkRed);
    mat.emissive.copy(_enemyEmissiveRed);
    mat.emissiveIntensity = 0;
    return;
  }
  const s = THREE.MathUtils.clamp(segStrength, 0, 1.3);
  if (s < 0.45) {
    mat.color.copy(_enemyDarkRed).lerp(_enemyKindleRed, s / 0.45);
  } else {
    mat.color.copy(_enemyKindleRed).lerp(_enemyBlazeRed, Math.min(1, (s - 0.45) / 0.55));
  }
  mat.emissive.copy(_enemyEmissiveRed);
  mat.emissiveIntensity = (0.45 + Math.pow(s, 1.35) * 4.8) * pulse;
}

function addRearFuturisticLedPanel(
  parent: THREE.Group,
  pos: [number, number, number],
  scale: number,
  housingMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  disposables: Array<{ dispose: () => void }>
) {
  const ledMats: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 4; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7effa8,
      emissive: 0x00ff66,
      emissiveIntensity: 3.4,
      roughness: 0.12,
      metalness: 0.08,
    });
    ledMats.push(mat);
    disposables.push(mat);
  }

  const panel = new THREE.Group();
  panel.position.set(pos[0], pos[1], pos[2]);
  panel.scale.setScalar(scale);

  const archShape = new THREE.Shape();
  archShape.moveTo(-0.0145, -0.0052);
  archShape.lineTo(0.0145, -0.0052);
  archShape.quadraticCurveTo(0.0168, -0.0046, 0.0168, -0.0012);
  archShape.quadraticCurveTo(0.0164, 0.0048, 0.0095, 0.0058);
  archShape.quadraticCurveTo(0, 0.0072, -0.0095, 0.0058);
  archShape.quadraticCurveTo(-0.0164, 0.0048, -0.0168, -0.0012);
  archShape.quadraticCurveTo(-0.0168, -0.0046, -0.0145, -0.0052);
  archShape.closePath();

  const plateGeo = trackGeo(
    new THREE.ExtrudeGeometry(archShape, {
      depth: 0.0032,
      bevelEnabled: true,
      bevelSize: 0.0009,
      bevelThickness: 0.0012,
      bevelSegments: 2,
      curveSegments: 10,
    })
  );
  plateGeo.translate(0, 0, -0.0016);
  panel.add(new THREE.Mesh(plateGeo, housingMat));

  const barGeo = trackGeo(new THREE.CapsuleGeometry(0.0015, 0.0072, 4, 8));
  barGeo.rotateZ(Math.PI / 2);
  const pipGeo = trackGeo(new THREE.SphereGeometry(0.0014, 8, 6));

  const gBar = new THREE.Mesh(barGeo, ledMats[0]);
  gBar.position.set(-0.0072, 0.0018, 0.0022);
  gBar.rotation.z = 0.08;
  panel.add(gBar);

  const gPip = new THREE.Mesh(pipGeo, ledMats[1]);
  gPip.position.set(-0.0072, -0.0024, 0.0022);
  panel.add(gPip);

  const rBar = new THREE.Mesh(barGeo, ledMats[2]);
  rBar.position.set(0.0072, 0.0018, 0.0022);
  rBar.rotation.z = -0.08;
  panel.add(rBar);

  const rPip = new THREE.Mesh(pipGeo, ledMats[3]);
  rPip.position.set(0.0072, -0.0024, 0.0022);
  panel.add(rPip);

  parent.add(panel);

  return {
    ledMats,
    update(frac: number, isEmpty: boolean, isReloading: boolean, elapsed: number) {
      if (isReloading) {
        for (let i = 0; i < 4; i++) {
          const m = ledMats[i];
          const hue = (elapsed * 1.65 - i * 0.22 + 10) % 1.0;
          const chase = 0.5 + 0.5 * Math.sin(elapsed * 16.0 - i * 1.45);
          m.emissive.setHSL(hue, 1.0, 0.52);
          m.color.setHSL(hue, 0.92, 0.76);
          m.emissiveIntensity = 2.0 + chase * 3.0;
        }
        return;
      }
      const hue = ammoFractionToHue(frac);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 13.0);
      const low = frac <= 0.25;
      for (let i = 0; i < 4; i++) {
        const m = ledMats[i];
        m.emissive.setHSL(hue, 1.0, 0.5);
        m.color.setHSL(hue, 0.92, 0.74);
        m.emissiveIntensity = isEmpty ? 1.4 + pulse * 3.4 : low ? 2.4 + pulse * 2.2 : 3.3;
      }
    },
  };
}

function addStandardGripAndTrigger(
  parent: THREE.Group,
  gripMat: THREE.Material,
  metalMat: THREE.Material,
  triggerMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const gripProfile = new THREE.Shape();
  gripProfile.moveTo(0.004, -0.012);
  gripProfile.quadraticCurveTo(0.008, -0.036, 0.014, -0.044);
  gripProfile.quadraticCurveTo(0.017, -0.062, 0.023, -0.073);
  gripProfile.quadraticCurveTo(0.027, -0.088, 0.033, -0.104);
  gripProfile.lineTo(0.081, -0.104);
  gripProfile.quadraticCurveTo(0.076, -0.076, 0.065, -0.048);
  gripProfile.quadraticCurveTo(0.054, -0.028, 0.051, -0.012);
  gripProfile.closePath();

  const gripGeo = trackGeo(
    new THREE.ExtrudeGeometry(gripProfile, {
      depth: 0.024,
      bevelEnabled: true,
      bevelSize: 0.0026,
      bevelThickness: 0.003,
      bevelSegments: 3,
    })
  );
  gripGeo.rotateY(-Math.PI / 2);
  gripGeo.translate(0.012, 0, 0);
  parent.add(new THREE.Mesh(gripGeo, gripMat));

  const guardShape = new THREE.Shape();
  guardShape.moveTo(0.008, -0.012);
  guardShape.lineTo(-0.044, -0.012);
  guardShape.lineTo(-0.047, -0.036);
  guardShape.lineTo(-0.039, -0.040);
  guardShape.lineTo(0.009, -0.040);
  guardShape.lineTo(0.011, -0.034);
  guardShape.lineTo(-0.037, -0.034);
  guardShape.lineTo(-0.039, -0.016);
  guardShape.lineTo(0.008, -0.016);
  guardShape.closePath();

  const guardGeo = trackGeo(
    new THREE.ExtrudeGeometry(guardShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelSize: 0.0008,
      bevelThickness: 0.0008,
      bevelSegments: 2,
    })
  );
  guardGeo.rotateY(-Math.PI / 2);
  guardGeo.translate(0.006, 0, 0);
  parent.add(new THREE.Mesh(guardGeo, metalMat));

  const triggerPivot = new THREE.Group();
  triggerPivot.position.set(0, -0.012, -0.012);
  parent.add(triggerPivot);

  const trig = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.0056, 0.020, 0.0044)), triggerMat);
  trig.position.set(0, -0.010, -0.003);
  trig.rotation.x = 0.16;
  triggerPivot.add(trig);

  return triggerPivot;
}

function createVacuumBulb(
  radius: number,
  length: number,
  glowMat: THREE.MeshStandardMaterial,
  glassMat: THREE.MeshPhysicalMaterial,
  brassMat: THREE.Material,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T
): THREE.Group {
  const g = new THREE.Group();
  const filament = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(radius * 0.42, radius * 0.42, length * 0.78, 8)),
    glowMat
  );
  g.add(filament);

  const glass = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(radius, length * 0.65, 4, 10)),
    glassMat
  );
  glass.renderOrder = 2;
  g.add(glass);

  const capGeo = trackGeo(new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, 0.006, 10));
  for (const cy of [-length * 0.45, length * 0.45]) {
    const cap = new THREE.Mesh(capGeo, brassMat);
    cap.position.y = cy;
    g.add(cap);
  }
  return g;
}

// ============================================================================
// 1. SERVICE CARBINE -> AK-74M "KOBRA-PULSE" (buildRetroSovietSmg)
// ============================================================================

function buildRetroSovietSmgInternal(opts: KitWeaponBuildOptions): NormalizedKitWeaponRig {
  const variant = opts.variant ?? 'player';
  const isEnemy = variant === 'enemy';
  const aniso = opts.maxAnisotropy ?? 4;
  const root = new THREE.Group();
  root.name = isEnemy ? 'EnemyBlackAK74M' : 'PlayerRetroSovietAK74M';

  const rustSet = getRustedRussianTextures(aniso, 3);
  const woodSet = getRussianWoodTextures(aniso);
  const bakeliteSet = getBakeliteTextures(aniso);
  const metalSet = getGunmetalTextures(aniso);

  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const rustedSteelMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x161920 : 0xffffff,
      ...(isEnemy ? {} : { map: rustSet.map, metalnessMap: rustSet.metalnessMap }),
      normalMap: rustSet.normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughnessMap: rustSet.roughnessMap,
      roughness: isEnemy ? 0.44 : 1.0,
      metalness: isEnemy ? 0.80 : 0.94,
    }),
    { sheenColor: isEnemy ? 0x454f5e : 0x90b2d4, sheenStrength: 0.24 }
  );

  const darkMetalMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x0d0f14 : 0x191d22,
      ...(isEnemy ? {} : { map: metalSet.map }),
      normalMap: metalSet.normalMap,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughnessMap: metalSet.roughnessMap,
      metalness: isEnemy ? 0.84 : 0.88,
      roughness: isEnemy ? 0.38 : 0.38,
    })
  );

  const bakeliteMat = enhanceGunWoodMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x14161b : 0xffffff,
      ...(isEnemy ? {} : { map: bakeliteSet.map }),
      normalMap: bakeliteSet.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: bakeliteSet.roughnessMap,
      roughness: isEnemy ? 0.62 : 0.50,
      metalness: isEnemy ? 0.14 : 0.04,
      clearcoat: isEnemy ? 0.12 : 0.40,
    }),
    0.16
  );

  const woodMat = enhanceGunWoodMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x121316 : 0xffffff,
      ...(isEnemy ? {} : { map: woodSet.map }),
      normalMap: woodSet.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: woodSet.roughnessMap,
      roughness: isEnemy ? 0.72 : 0.72,
      metalness: isEnemy ? 0.10 : 0.02,
    }),
    0.18
  );

  const copperMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x1d2128 : 0xb86d3b,
      roughness: 0.36,
      metalness: 0.88,
    })
  );

  const cherenkovMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x160204 : 0xc2ffff,
    emissive: isEnemy ? 0xff120c : 0x14e8ff,
    emissiveIntensity: isEnemy ? 0 : 3.0,
    roughness: 0.12,
    metalness: 0.05,
  });

  const amberLampMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x160204 : 0xffd088,
    emissive: isEnemy ? 0xff120c : 0xff6a12,
    emissiveIntensity: isEnemy ? 0 : 3.2,
    roughness: 0.15,
  });

  const glassTubeMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x261416 : 0xd8f8ff,
    transparent: true,
    opacity: 0.32,
    roughness: 0.08,
    clearcoat: 1.0,
    depthWrite: false,
  });

  const kobraReticleMat = new THREE.MeshBasicMaterial({
    color: isEnemy ? 0xff2218 : 0xff5418,
    transparent: true,
    opacity: isEnemy ? 0.65 : 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const opticLensMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x1c2428 : 0x26424a,
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    clearcoat: 1.0,
    depthWrite: false,
  });

  disposables.push(
    rustedSteelMat,
    darkMetalMat,
    bakeliteMat,
    woodMat,
    copperMat,
    cherenkovMat,
    amberLampMat,
    glassTubeMat,
    kobraReticleMat,
    opticLensMat
  );

  // Stamped AK receiver
  const akRecShape = new THREE.Shape();
  akRecShape.moveTo(-0.0155, -0.014);
  akRecShape.lineTo(0.0155, -0.014);
  akRecShape.quadraticCurveTo(0.0185, -0.0135, 0.0185, -0.007);
  akRecShape.lineTo(0.0185, 0.024);
  akRecShape.quadraticCurveTo(0.0185, 0.0295, 0.0125, 0.0305);
  akRecShape.lineTo(-0.0125, 0.0305);
  akRecShape.quadraticCurveTo(-0.0185, 0.0295, -0.0185, 0.024);
  akRecShape.lineTo(-0.0185, -0.007);
  akRecShape.quadraticCurveTo(-0.0185, -0.0135, -0.0155, -0.014);
  akRecShape.closePath();

  const akRecGeo = trackGeo(
    new THREE.ExtrudeGeometry(akRecShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.0018,
      bevelThickness: 0.0032,
      bevelSegments: 3,
      curveSegments: 10,
    })
  );
  akRecGeo.translate(0, 0, -0.136);
  const receiver = new THREE.Mesh(akRecGeo, rustedSteelMat);
  receiver.castShadow = true;
  root.add(receiver);

  const dustCover = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0176, 0.0184, 0.208, 14, 1, false, -Math.PI * 0.5, Math.PI)),
    rustedSteelMat
  );
  dustCover.rotation.x = Math.PI / 2;
  dustCover.rotation.y = Math.PI / 2;
  dustCover.position.set(0, 0.026, -0.024);
  root.add(dustCover);

  const dustRearDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.0178, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    rustedSteelMat
  );
  dustRearDome.rotation.x = Math.PI / 2;
  dustRearDome.scale.set(1.0, 0.62, 0.85);
  dustRearDome.position.set(0, 0.025, 0.080);
  root.add(dustRearDome);

  const akLatchButton = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.0034, 0.0032, 3, 8)),
    darkMetalMat
  );
  akLatchButton.rotation.z = Math.PI / 2;
  akLatchButton.position.set(0, 0.032, 0.091);
  root.add(akLatchButton);

  // Stock comb
  const akStockShape = new THREE.Shape();
  akStockShape.moveTo(0.072, 0.020);
  akStockShape.quadraticCurveTo(0.106, 0.018, 0.145, 0.008);
  akStockShape.quadraticCurveTo(0.180, 0.0, 0.215, -0.006);
  akStockShape.lineTo(0.215, -0.044);
  akStockShape.quadraticCurveTo(0.155, -0.034, 0.105, -0.020);
  akStockShape.quadraticCurveTo(0.084, -0.014, 0.072, -0.010);
  akStockShape.closePath();
  const akStockGeo = trackGeo(
    new THREE.ExtrudeGeometry(akStockShape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelSize: 0.005,
      bevelThickness: 0.0055,
      bevelSegments: 3,
      curveSegments: 10,
    })
  );
  akStockGeo.rotateY(-Math.PI / 2);
  akStockGeo.translate(0.013, 0, 0);
  root.add(new THREE.Mesh(akStockGeo, bakeliteMat));

  // 4 rear LED panel (light parity: exact same 4 LEDs on enemy!)
  const rearLedPanel = addRearFuturisticLedPanel(
    root,
    [0, 0.020, 0.0915],
    0.9,
    darkMetalMat,
    trackGeo,
    disposables
  );

  for (const rz of [-0.09, -0.04, 0.01, 0.055]) {
    const rib = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.037, 0.004, 0.006)), darkMetalMat);
    rib.position.set(0, 0.038, rz);
    root.add(rib);
  }

  // Barrel & birch handguard
  const woodGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.040, 0.032, 0.135)), woodMat);
  woodGuard.position.set(0, -0.004, -0.195);
  root.add(woodGuard);

  for (const tz of [-0.158, -0.232]) {
    const tape = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.0425, 0.0345, 0.018)), darkMetalMat);
    tape.position.set(0, -0.004, tz);
    root.add(tape);
  }

  const barrel = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0086, 0.0094, 0.165, 12)),
    darkMetalMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.008, -0.295);
  root.add(barrel);

  const gasTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0095, 0.0095, 0.135, 10)),
    rustedSteelMat
  );
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.029, -0.202);
  root.add(gasTube);

  const booster = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.016, 0.0105, 0.046, 14)),
    rustedSteelMat
  );
  booster.rotation.x = Math.PI / 2;
  booster.position.set(0, 0.008, -0.388);
  root.add(booster);

  const frontPostTower = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.014, 0.036, 0.018)),
    rustedSteelMat
  );
  frontPostTower.position.set(0, 0.036, -0.336);
  root.add(frontPostTower);

  // Reciprocating charging handle
  const slideGroup = new THREE.Group();
  root.add(slideGroup);
  const carrier = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.010, 0.016, 0.068)), darkMetalMat);
  carrier.position.set(0.016, 0.018, -0.055);
  slideGroup.add(carrier);
  const handle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.008, 0.011)), rustedSteelMat);
  handle.position.set(0.028, 0.018, -0.072);
  handle.rotation.z = 0.24;
  slideGroup.add(handle);

  // Curved Bakelite Banana Magazine
  const magazineGroup = new THREE.Group();
  magazineGroup.name = 'MagazineMesh';
  root.add(magazineGroup);

  const magShape = new THREE.Shape();
  magShape.moveTo(-0.028, 0);
  magShape.lineTo(0.024, 0);
  magShape.quadraticCurveTo(0.020, -0.075, -0.002, -0.155);
  magShape.lineTo(-0.054, -0.140);
  magShape.quadraticCurveTo(-0.034, -0.070, -0.028, 0);
  magShape.closePath();

  const magGeo = trackGeo(
    new THREE.ExtrudeGeometry(magShape, {
      depth: 0.024,
      bevelEnabled: true,
      bevelSize: 0.0022,
      bevelThickness: 0.0022,
      bevelSegments: 2,
    })
  );
  magGeo.rotateY(-Math.PI / 2);
  magGeo.translate(0.012, -0.014, -0.105);
  magazineGroup.add(new THREE.Mesh(magGeo, bakeliteMat));

  const magFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.029, 0.008, 0.058)),
    rustedSteelMat
  );
  magFloor.position.set(0, -0.162, -0.132);
  magFloor.rotation.x = 0.26;
  magazineGroup.add(magFloor);

  // Twin Cherenkov plasma tubes + diagnostic pod lamps (light parity: exact same 4 LEDs!)
  for (const sx of [-0.0245, 0.0245]) {
    const tube = createVacuumBulb(0.0068, 0.098, cherenkovMat, glassTubeMat, copperMat, trackGeo);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(sx, 0.027, -0.198);
    root.add(tube);

    for (const cz of [-0.158, -0.238]) {
      const clampRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.0082, 0.0018, 6, 12)),
        copperMat
      );
      clampRing.position.set(sx, 0.027, cz);
      root.add(clampRing);
    }
  }

  const rearPod = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.0082, 0.032, 4, 10)),
    rustedSteelMat
  );
  rearPod.rotation.x = Math.PI / 2;
  rearPod.position.set(-0.022, 0.018, 0.058);
  root.add(rearPod);

  const amberJewel = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0046, 10, 8)), amberLampMat);
  amberJewel.position.set(-0.022, 0.022, 0.080);
  root.add(amberJewel);

  const cyanJewel = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0040, 10, 8)), cherenkovMat);
  cyanJewel.position.set(-0.022, 0.013, 0.080);
  root.add(cyanJewel);

  const useLights = !isEnemy && !opts.disableInternalLights;
  const cherenkovLight = useLights ? new THREE.PointLight(0x20e0ff, 0.24, 0.65, 2) : null;
  if (cherenkovLight) {
    cherenkovLight.position.set(-0.045, 0.04, -0.18);
    root.add(cherenkovLight);
  }

  // Hollow Kobra Reflex Optic
  const sightLineY = 0.0685;
  const dovetailArm = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.0068, 0.040, 0.066)),
    rustedSteelMat
  );
  dovetailArm.position.set(-0.021, 0.028, 0.002);
  root.add(dovetailArm);

  const kobraBaseShape = new THREE.Shape();
  kobraBaseShape.moveTo(-0.018, 0.041);
  kobraBaseShape.lineTo(0.014, 0.041);
  kobraBaseShape.quadraticCurveTo(0.017, 0.046, 0.014, 0.053);
  kobraBaseShape.lineTo(-0.016, 0.053);
  kobraBaseShape.quadraticCurveTo(-0.020, 0.047, -0.018, 0.041);
  kobraBaseShape.closePath();

  const kobraBaseGeo = trackGeo(
    new THREE.ExtrudeGeometry(kobraBaseShape, {
      depth: 0.068,
      bevelEnabled: true,
      bevelSize: 0.0012,
      bevelThickness: 0.002,
      bevelSegments: 2,
    })
  );
  kobraBaseGeo.translate(0, 0, -0.032);
  root.add(new THREE.Mesh(kobraBaseGeo, rustedSteelMat));

  const kobraOuter = new THREE.Shape();
  kobraOuter.moveTo(-0.019, -0.015);
  kobraOuter.lineTo(0.019, -0.015);
  kobraOuter.lineTo(0.019, 0.007);
  kobraOuter.quadraticCurveTo(0.019, 0.020, 0.0, 0.020);
  kobraOuter.quadraticCurveTo(-0.019, 0.020, -0.019, 0.007);
  kobraOuter.closePath();
  const kobraHole = new THREE.Path();
  kobraHole.moveTo(-0.014, -0.011);
  kobraHole.lineTo(0.014, -0.011);
  kobraHole.lineTo(0.014, 0.005);
  kobraHole.quadraticCurveTo(0.014, 0.015, 0.0, 0.015);
  kobraHole.quadraticCurveTo(-0.014, 0.015, -0.014, 0.005);
  kobraHole.closePath();
  kobraOuter.holes.push(kobraHole);

  const kobraHoodGeo = trackGeo(
    new THREE.ExtrudeGeometry(kobraOuter, {
      depth: 0.042,
      bevelEnabled: true,
      bevelSize: 0.0012,
      bevelThickness: 0.0012,
      bevelSegments: 2,
    })
  );
  kobraHoodGeo.translate(0, sightLineY, -0.024);
  root.add(new THREE.Mesh(kobraHoodGeo, rustedSteelMat));

  const kLens = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.027, 0.024)), opticLensMat);
  kLens.position.set(0, sightLineY, -0.004);
  kLens.renderOrder = 3;
  root.add(kLens);

  const retGroup = new THREE.Group();
  retGroup.position.set(0, sightLineY, -0.003);
  root.add(retGroup);
  retGroup.add(new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.0013, 10)), kobraReticleMat));
  const hTick = trackGeo(new THREE.PlaneGeometry(0.0052, 0.0008));
  const vTick = trackGeo(new THREE.PlaneGeometry(0.0008, 0.0052));
  const lBar = new THREE.Mesh(hTick, kobraReticleMat);
  lBar.position.set(-0.0062, 0, 0);
  retGroup.add(lBar);
  const rBar = new THREE.Mesh(hTick, kobraReticleMat);
  rBar.position.set(0.0062, 0, 0);
  retGroup.add(rBar);
  const bBar = new THREE.Mesh(vTick, kobraReticleMat);
  bBar.position.set(0, -0.0062, 0);
  retGroup.add(bBar);

  const triggerPivot = addStandardGripAndTrigger(
    root,
    bakeliteMat,
    rustedSteelMat,
    darkMetalMat,
    trackGeo
  );

  const underbarrelLight = createUnderbarrelFlashlight({
    maxAnisotropy: aniso,
    rustic: true,
    scale: 0.92,
    enemyBlack: isEnemy,
  });
  underbarrelLight.group.position.set(0, -0.014, -0.312);
  root.add(underbarrelLight.group);
  disposables.push(underbarrelLight);

  const flashRig = createPhotorealisticMuzzleFlash({
    profile: 'smg',
    scale: 1.05,
    tintHex: 0xffcf94,
    lightRange: 6.4,
    lightIntensity: 8.4,
    enableLight: useLights,
  });
  flashRig.group.position.set(0, 0.008, -0.415);
  root.add(flashRig.group);
  disposables.push(flashRig);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.name = 'MuzzleAnchor';
  muzzleAnchor.position.set(0, 0.008, -0.415);
  root.add(muzzleAnchor);

  const handguardAnchor = new THREE.Object3D();
  handguardAnchor.name = 'HandguardAnchor';
  handguardAnchor.position.set(0, -0.016, -0.198);
  root.add(handguardAnchor);

  // Wrap kit root so normalized space is +Z forward, grip centered at (0, -0.038, -0.016)
  const normalizedRoot = new THREE.Group();
  normalizedRoot.name = isEnemy ? 'EnemyBlackServiceCarbine' : 'SharedServiceCarbine';
  const alignGroup = new THREE.Group();
  alignGroup.rotation.y = Math.PI;
  alignGroup.scale.setScalar(1.08);
  alignGroup.position.set(0, 0.012, 0.026);
  alignGroup.add(root);
  normalizedRoot.add(alignGroup);

  let currentHeat = 0;

  // All 6 enemy LED emitter groups: 4 rear + amber jewel + Cherenkov plasma tubes
  const enemyOrderedMats: THREE.MeshStandardMaterial[] = [
    ...rearLedPanel.ledMats,
    amberLampMat,
    cherenkovMat,
  ];

  // Emit cluster world-ish position inside normalizedRoot (around rear pod + plasma tube top)
  const ledClusterLocalPos = new THREE.Vector3(0.025, 0.042, 0.09);

  return {
    weaponId: 'service_carbine',
    variant,
    kitRoot: root,
    normalizedRoot,
    muzzleAnchor,
    handguardAnchor,
    magazineGroup,
    pumpGroup: null,
    shellInsertMesh: null,
    ledClusterLocalPos,
    ledCount: 8,
    setSlideOffset(backMeters: number) {
      slideGroup.position.z = THREE.MathUtils.clamp(backMeters, 0, 0.07);
    },
    setPumpOffset() {},
    setTriggerPull(amount01: number) {
      triggerPivot.rotation.x = THREE.MathUtils.clamp(amount01, 0, 1) * 0.42;
    },
    setMuzzleFlash(intensity: number) {
      flashRig.setIntensity(intensity);
    },
    setFlashlightOn(on: boolean) {
      underbarrelLight.setOn(on);
    },
    setFireGlow(heat01: number) {
      currentHeat = THREE.MathUtils.clamp(heat01, 0, 1);
      if (!isEnemy) {
        cherenkovMat.emissiveIntensity = 2.6 + currentHeat * 6.4;
        if (cherenkovLight) cherenkovLight.intensity = 0.24 + currentHeat * 1.65;
      }
    },
    setReloadMagOffset(ox: number, oy: number, oz: number, rotX = 0, rotZ = 0) {
      // Transform normalized +Z offset into kit -Z space
      magazineGroup.position.set(-ox, oy, -oz);
      magazineGroup.rotation.set(-rotX, 0, -rotZ);
    },
    updateLeds(ammo: number, maxAmmo: number, isReloading: boolean, elapsed: number) {
      const frac = maxAmmo > 0 ? THREE.MathUtils.clamp(ammo / maxAmmo, 0, 1) : 0;
      const isEmpty = ammo === 0;
      const hum = 0.9 + 0.1 * Math.sin(elapsed * 22);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 13.0);
      rearLedPanel.update(frac, isEmpty, isReloading, elapsed);
      if (isReloading) {
        const h1 = (elapsed * 1.55) % 1.0;
        const h2 = (elapsed * 1.55 + 0.42) % 1.0;
        cherenkovMat.emissive.setHSL(h1, 1.0, 0.52);
        cherenkovMat.color.setHSL(h1, 0.92, 0.78);
        cherenkovMat.emissiveIntensity = 3.2 + pulse * 2.2;
        amberLampMat.emissive.setHSL(h2, 1.0, 0.52);
        amberLampMat.color.setHSL(h2, 0.92, 0.76);
        amberLampMat.emissiveIntensity = 2.6 + (1 - pulse) * 2.6;
        if (cherenkovLight) {
          cherenkovLight.color.setHSL(h1, 1.0, 0.54);
          cherenkovLight.intensity = 0.08 + pulse * 0.05;
        }
        return;
      }
      const ammoHue = ammoFractionToHue(frac);
      cherenkovMat.emissive.setHSL(ammoHue, 1.0, 0.5);
      cherenkovMat.color.setHSL(ammoHue, 0.92, 0.76);
      cherenkovMat.emissiveIntensity = (2.6 + currentHeat * 5.6) * hum;
      amberLampMat.emissive.setHSL(ammoHue, 1.0, 0.5);
      amberLampMat.color.setHSL(ammoHue, 0.92, 0.74);
      amberLampMat.emissiveIntensity =
        isEmpty || frac <= 0.25 ? 2.6 + pulse * 3.0 : 2.6 + currentHeat * 2.2;
      if (cherenkovLight) {
        cherenkovLight.color.setHSL(ammoHue, 1.0, 0.52);
        cherenkovLight.intensity = 0.14 + currentHeat * 1.1;
      }
    },
    updateEnemyLeds(ramp, firePulse, isReloading, reloadProgress, elapsed, phase = 0) {
      const level = THREE.MathUtils.clamp(ramp + firePulse * 0.35, 0, 1.3);
      const pulse = 0.92 + 0.08 * Math.sin(elapsed * 20 + phase * 3.1);
      if (isReloading) {
        // Sequential crimson drain/sweep during reload
        const head = ((reloadProgress * 2.4) % 1) * enemyOrderedMats.length;
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          const dist = Math.abs(i - head);
          const v = Math.max(0.08, 0.65 - dist * 0.25);
          driveRedLoadingMaterial(enemyOrderedMats[i], v, 1.0);
        }
        return;
      }
      if (level <= 0.015) {
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          driveRedLoadingMaterial(enemyOrderedMats[i], 0, 1);
        }
        return;
      }
      if (level >= 0.95) {
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          driveRedLoadingMaterial(enemyOrderedMats[i], Math.min(1.3, level), pulse);
        }
        return;
      }
      // Red loading bar wave during detection / acquire / aim
      const count = enemyOrderedMats.length;
      const fill = level * count;
      for (let i = 0; i < count; i++) {
        const seg = THREE.MathUtils.clamp(fill - i + 0.35, 0, 1);
        driveRedLoadingMaterial(enemyOrderedMats[i], seg * Math.max(0.45, level), pulse);
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

// ============================================================================
// 2. FULL-AUTO CARBINE -> PP-41 "BURIA" DRUM SMG (buildRusticRussianSmg)
// ============================================================================

function buildRusticRussianSmgInternal(opts: KitWeaponBuildOptions): NormalizedKitWeaponRig {
  const variant = opts.variant ?? 'player';
  const isEnemy = variant === 'enemy';
  const aniso = opts.maxAnisotropy ?? 4;
  const root = new THREE.Group();
  root.name = isEnemy ? 'EnemyBlackPP41Drum' : 'PlayerRusticRussianPP41';

  const rustSet = getRustedRussianTextures(aniso, 1);
  const woodSet = getRussianWoodTextures(aniso);
  const metalSet = getGunmetalTextures(aniso);

  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const rustedSteelMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x15181f : 0xffffff,
      ...(isEnemy ? {} : { map: rustSet.map, metalnessMap: rustSet.metalnessMap }),
      normalMap: rustSet.normalMap,
      normalScale: new THREE.Vector2(1.4, 1.4),
      roughnessMap: rustSet.roughnessMap,
      roughness: isEnemy ? 0.44 : 1.0,
      metalness: isEnemy ? 0.80 : 0.92,
    })
  );

  const darkSteelMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x0c0e13 : 0x1e2126,
      ...(isEnemy ? {} : { map: metalSet.map }),
      normalMap: metalSet.normalMap,
      normalScale: new THREE.Vector2(0.95, 0.95),
      roughnessMap: metalSet.roughnessMap,
      metalness: 0.86,
      roughness: 0.40,
    })
  );

  const agedBrassMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x1e222b : 0x9b7a44,
      normalMap: rustSet.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: rustSet.roughnessMap,
      metalness: 0.84,
      roughness: 0.44,
    })
  );

  const birchWoodMat = enhanceGunWoodMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x121317 : 0xffffff,
      ...(isEnemy ? {} : { map: woodSet.map }),
      normalMap: woodSet.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: woodSet.roughnessMap,
      roughness: 0.72,
      metalness: isEnemy ? 0.12 : 0.02,
    }),
    0.18
  );

  const nixieAmberMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x160204 : 0xffc67a,
    emissive: isEnemy ? 0xff120c : 0xff6210,
    emissiveIntensity: isEnemy ? 0 : 3.4,
    roughness: 0.15,
    metalness: 0.05,
  });

  const phosphorGreenMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x160204 : 0xb6ffce,
    emissive: isEnemy ? 0xff120c : 0x22ff6a,
    emissiveIntensity: isEnemy ? 0 : 2.8,
    roughness: 0.15,
    metalness: 0.05,
  });

  const bulbGlassMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x261214 : 0xffe4c4,
    transparent: true,
    opacity: 0.34,
    roughness: 0.08,
    clearcoat: 1.0,
    depthWrite: false,
  });

  const barMats: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 5; i++) {
    const bm = new THREE.MeshStandardMaterial({
      color: isEnemy ? 0x160204 : 0xb2ffc8,
      emissive: isEnemy ? 0xff120c : 0x20ff68,
      emissiveIntensity: isEnemy ? 0 : 2.8,
      roughness: 0.2,
    });
    barMats.push(bm);
    disposables.push(bm);
  }

  disposables.push(
    rustedSteelMat,
    darkSteelMat,
    agedBrassMat,
    birchWoodMat,
    nixieAmberMat,
    phosphorGreenMat,
    bulbGlassMat
  );

  // Receiver Tube + Lower Chassis
  const receiverTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0205, 0.0215, 0.23, 16)),
    rustedSteelMat
  );
  receiverTube.rotation.x = Math.PI / 2;
  receiverTube.position.set(0, 0.015, -0.028);
  receiverTube.castShadow = true;
  root.add(receiverTube);

  const ppLowerShape = new THREE.Shape();
  ppLowerShape.moveTo(-0.014, -0.016);
  ppLowerShape.lineTo(0.014, -0.016);
  ppLowerShape.quadraticCurveTo(0.018, -0.015, 0.018, -0.006);
  ppLowerShape.lineTo(0.018, 0.012);
  ppLowerShape.lineTo(-0.018, 0.012);
  ppLowerShape.lineTo(-0.018, -0.006);
  ppLowerShape.quadraticCurveTo(-0.018, -0.015, -0.014, -0.016);
  ppLowerShape.closePath();

  const lowerGeo = trackGeo(
    new THREE.ExtrudeGeometry(ppLowerShape, {
      depth: 0.205,
      bevelEnabled: true,
      bevelSize: 0.0018,
      bevelThickness: 0.0028,
      bevelSegments: 3,
      curveSegments: 8,
    })
  );
  lowerGeo.translate(0, 0, -0.126);
  root.add(new THREE.Mesh(lowerGeo, rustedSteelMat));

  const rearCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0212, 0.0222, 0.018, 16)),
    darkSteelMat
  );
  rearCap.rotation.x = Math.PI / 2;
  rearCap.position.set(0, 0.015, 0.086);
  root.add(rearCap);

  const rearDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.0212, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    darkSteelMat
  );
  rearDome.rotation.x = Math.PI / 2;
  rearDome.scale.set(1, 0.52, 1);
  rearDome.position.set(0, 0.015, 0.094);
  root.add(rearDome);

  const ppStockShape = new THREE.Shape();
  ppStockShape.moveTo(0.056, 0.006);
  ppStockShape.quadraticCurveTo(0.095, 0.004, 0.132, -0.006);
  ppStockShape.quadraticCurveTo(0.168, -0.016, 0.205, -0.022);
  ppStockShape.lineTo(0.205, -0.056);
  ppStockShape.quadraticCurveTo(0.145, -0.044, 0.098, -0.032);
  ppStockShape.quadraticCurveTo(0.072, -0.024, 0.056, -0.014);
  ppStockShape.closePath();
  const ppStockGeo = trackGeo(
    new THREE.ExtrudeGeometry(ppStockShape, {
      depth: 0.026,
      bevelEnabled: true,
      bevelSize: 0.0055,
      bevelThickness: 0.006,
      bevelSegments: 3,
      curveSegments: 10,
    })
  );
  ppStockGeo.rotateY(-Math.PI / 2);
  ppStockGeo.translate(0.013, 0, 0);
  root.add(new THREE.Mesh(ppStockGeo, birchWoodMat));

  const rearLedPanel = addRearFuturisticLedPanel(
    root,
    [0, 0.020, 0.1025],
    0.92,
    darkSteelMat,
    trackGeo,
    disposables
  );

  const woodFore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.041, 0.030, 0.145)), birchWoodMat);
  woodFore.position.set(0, -0.012, -0.175);
  root.add(woodFore);

  const woodBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.044, 0.033, 0.014)), rustedSteelMat);
  woodBand.position.set(0, -0.011, -0.228);
  root.add(woodBand);

  // Perforated cooling barrel shroud + 6 glowing thermal coils
  const innerBarrel = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0082, 0.0086, 0.25, 12)),
    darkSteelMat
  );
  innerBarrel.rotation.x = Math.PI / 2;
  innerBarrel.position.set(0, 0.016, -0.265);
  root.add(innerBarrel);

  for (let i = 0; i < 6; i++) {
    const coil = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.0112, 0.0022, 6, 14)),
      nixieAmberMat
    );
    coil.position.set(0, 0.016, -0.175 - i * 0.032);
    root.add(coil);
  }

  const ringGeo = trackGeo(new THREE.CylinderGeometry(0.0185, 0.0185, 0.014, 14, 1, true));
  ringGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < 7; i++) {
    const ring = new THREE.Mesh(ringGeo, rustedSteelMat);
    ring.position.set(0, 0.016, -0.158 - i * 0.032);
    root.add(ring);
  }
  const ribGeo = trackGeo(new THREE.BoxGeometry(0.006, 0.0055, 0.215));
  for (let a = 0; a < 4; a++) {
    const ang = (a / 4) * Math.PI * 2 + Math.PI / 4;
    const rib = new THREE.Mesh(ribGeo, rustedSteelMat);
    rib.position.set(Math.cos(ang) * 0.0175, 0.016 + Math.sin(ang) * 0.0175, -0.258);
    rib.rotation.z = ang;
    root.add(rib);
  }

  const muzzleComp = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.019, 0.019, 0.034, 14)),
    rustedSteelMat
  );
  muzzleComp.rotation.x = Math.PI / 2;
  muzzleComp.position.set(0, 0.016, -0.382);
  root.add(muzzleComp);

  // Reciprocating bolt handle
  const slideGroup = new THREE.Group();
  root.add(slideGroup);
  const boltBody = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.064, 10)),
    darkSteelMat
  );
  boltBody.rotation.x = Math.PI / 2;
  boltBody.position.set(0.003, 0.015, -0.055);
  slideGroup.add(boltBody);
  const boltKnob = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0068, 0.0058, 0.022, 10)),
    agedBrassMat
  );
  boltKnob.rotation.z = Math.PI / 2;
  boltKnob.position.set(0.032, 0.016, -0.058);
  slideGroup.add(boltKnob);

  // Iconic 71-Round Circular Drum Magazine!
  const magazineGroup = new THREE.Group();
  magazineGroup.name = 'MagazineMesh';
  root.add(magazineGroup);

  const drumNeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.026, 0.042, 0.034)), rustedSteelMat);
  drumNeck.position.set(0, -0.032, -0.148);
  magazineGroup.add(drumNeck);

  const drumBody = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.064, 0.064, 0.036, 22)),
    rustedSteelMat
  );
  drumBody.rotation.x = Math.PI / 2;
  drumBody.position.set(0, -0.095, -0.148);
  drumBody.castShadow = true;
  magazineGroup.add(drumBody);

  for (const r of [0.052, 0.034]) {
    for (const dz of [-0.0185, 0.0185]) {
      const stampRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(r, 0.0024, 6, 20)),
        darkSteelMat
      );
      stampRing.position.set(0, -0.095, -0.148 + dz);
      magazineGroup.add(stampRing);
    }
  }
  const drumHub = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.042, 12)),
    agedBrassMat
  );
  drumHub.rotation.x = Math.PI / 2;
  drumHub.position.set(0, -0.095, -0.148);
  magazineGroup.add(drumHub);

  // Side Nixie Vacuum Bulb + 5-Bar Telemetry Meter
  const nixieMount = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.014, 0.020, 0.068)), rustedSteelMat);
  nixieMount.position.set(-0.024, 0.016, -0.052);
  root.add(nixieMount);

  const sideBulb = createVacuumBulb(0.0095, 0.046, nixieAmberMat, bulbGlassMat, agedBrassMat, trackGeo);
  sideBulb.rotation.x = Math.PI / 2;
  sideBulb.position.set(-0.032, 0.018, -0.052);
  root.add(sideBulb);

  const meterBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.018, 0.058)), darkSteelMat);
  meterBox.position.set(-0.021, 0.032, 0.036);
  meterBox.rotation.z = 0.25;
  root.add(meterBox);

  for (let i = 0; i < 5; i++) {
    const bar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.004, 0.009, 0.0065)), barMats[i]);
    bar.position.set(-0.0265, 0.033, 0.058 - i * 0.0105);
    bar.rotation.z = 0.25;
    root.add(bar);
  }

  const useLights = !isEnemy && !opts.disableInternalLights;
  const retroGlowLight = useLights ? new THREE.PointLight(0xff741c, 0.22, 0.55, 2) : null;
  if (retroGlowLight) {
    retroGlowLight.position.set(-0.05, 0.03, -0.05);
    root.add(retroGlowLight);
  }

  // Hooded Iron Sights + Glowing Pips
  const sightLineY = 0.0565;
  const ppSightBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.022, 0.018, 0.016)), rustedSteelMat);
  ppSightBase.position.set(0, 0.040, 0.052);
  root.add(ppSightBase);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.005, 0.014, 0.009)), darkSteelMat);
    ear.position.set(sx * 0.0076, 0.054, 0.052);
    root.add(ear);
    const pip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0014, 8, 6)), phosphorGreenMat);
    pip.position.set(sx * 0.0076, 0.0565, 0.0566);
    root.add(pip);
  }

  const frontHood = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.0115, 0.0022, 8, 16)), rustedSteelMat);
  frontHood.position.set(0, sightLineY, -0.372);
  root.add(frontHood);
  const frontPost = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.0024, 0.012, 0.003)), darkSteelMat);
  frontPost.position.set(0, sightLineY - 0.005, -0.372);
  root.add(frontPost);
  const frontPip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.0017, 6, 6)), nixieAmberMat);
  frontPip.position.set(0, sightLineY + 0.0005, -0.370);
  root.add(frontPip);

  const triggerPivot = addStandardGripAndTrigger(
    root,
    birchWoodMat,
    rustedSteelMat,
    darkSteelMat,
    trackGeo
  );

  const underbarrelLight = createUnderbarrelFlashlight({
    maxAnisotropy: aniso,
    rustic: true,
    scale: 0.92,
    enemyBlack: isEnemy,
  });
  underbarrelLight.group.position.set(0, -0.008, -0.315);
  root.add(underbarrelLight.group);
  disposables.push(underbarrelLight);

  const flashRig = createPhotorealisticMuzzleFlash({
    profile: 'smg',
    scale: 1.05,
    tintHex: 0xffb25e,
    lightRange: 6.4,
    lightIntensity: 8.4,
    enableLight: useLights,
  });
  flashRig.group.position.set(0, 0.016, -0.405);
  root.add(flashRig.group);
  disposables.push(flashRig);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.name = 'MuzzleAnchor';
  muzzleAnchor.position.set(0, 0.016, -0.405);
  root.add(muzzleAnchor);

  const handguardAnchor = new THREE.Object3D();
  handguardAnchor.name = 'HandguardAnchor';
  // Seated right on the wooden forend just ahead of the 71-round drum!
  handguardAnchor.position.set(0, -0.022, -0.215);
  root.add(handguardAnchor);

  const normalizedRoot = new THREE.Group();
  normalizedRoot.name = isEnemy ? 'EnemyBlackFullAutoCarbine' : 'SharedFullAutoCarbine';
  const alignGroup = new THREE.Group();
  alignGroup.rotation.y = Math.PI;
  alignGroup.scale.setScalar(1.08);
  alignGroup.position.set(0, 0.012, 0.026);
  alignGroup.add(root);
  normalizedRoot.add(alignGroup);

  let currentHeat = 0;

  // Ordered sequence: 5 telemetry bars -> 4 rear LEDs -> Nixie & thermal coils -> sight pips
  const enemyOrderedMats: THREE.MeshStandardMaterial[] = [
    ...barMats,
    ...rearLedPanel.ledMats,
    nixieAmberMat,
    phosphorGreenMat,
  ];
  const ledClusterLocalPos = new THREE.Vector3(0.028, 0.042, 0.03);

  return {
    weaponId: 'full_auto_carbine',
    variant,
    kitRoot: root,
    normalizedRoot,
    muzzleAnchor,
    handguardAnchor,
    magazineGroup,
    pumpGroup: null,
    shellInsertMesh: null,
    ledClusterLocalPos,
    ledCount: 11,
    setSlideOffset(backMeters: number) {
      slideGroup.position.z = THREE.MathUtils.clamp(backMeters, 0, 0.068);
    },
    setPumpOffset() {},
    setTriggerPull(amount01: number) {
      triggerPivot.rotation.x = THREE.MathUtils.clamp(amount01, 0, 1) * 0.42;
    },
    setMuzzleFlash(intensity: number) {
      flashRig.setIntensity(intensity);
    },
    setFlashlightOn(on: boolean) {
      underbarrelLight.setOn(on);
    },
    setFireGlow(heat01: number) {
      currentHeat = THREE.MathUtils.clamp(heat01, 0, 1);
      if (!isEnemy) {
        nixieAmberMat.emissiveIntensity = 2.6 + currentHeat * 5.8;
        if (retroGlowLight) retroGlowLight.intensity = 0.22 + currentHeat * 1.35;
      }
    },
    setReloadMagOffset(ox: number, oy: number, oz: number, rotX = 0, rotZ = 0) {
      magazineGroup.position.set(-ox, oy, -oz);
      magazineGroup.rotation.set(-rotX, 0, -rotZ);
    },
    updateLeds(ammo: number, maxAmmo: number, isReloading: boolean, elapsed: number) {
      const frac = maxAmmo > 0 ? THREE.MathUtils.clamp(ammo / maxAmmo, 0, 1) : 0;
      const isEmpty = ammo === 0;
      const flicker = 0.88 + 0.12 * Math.sin(elapsed * 29) * Math.sin(elapsed * 7.3);
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 13.0);
      rearLedPanel.update(frac, isEmpty, isReloading, elapsed);
      if (isReloading) {
        const swirlHue = (elapsed * 1.55) % 1.0;
        nixieAmberMat.emissive.setHSL(swirlHue, 1.0, 0.52);
        nixieAmberMat.color.setHSL(swirlHue, 0.92, 0.76);
        nixieAmberMat.emissiveIntensity = 3.2 + pulse * 1.8;
        if (retroGlowLight) {
          retroGlowLight.color.setHSL(swirlHue, 1.0, 0.54);
          retroGlowLight.intensity = 0.08 + pulse * 0.05;
        }
        for (let i = 0; i < barMats.length; i++) {
          const m = barMats[i];
          const h = (elapsed * 1.65 - i * 0.16 + 10) % 1.0;
          const chase = 0.5 + 0.5 * Math.sin(elapsed * 16.0 - i * 1.15);
          m.emissive.setHSL(h, 1.0, 0.52);
          m.color.setHSL(h, 0.92, 0.76);
          m.emissiveIntensity = 1.8 + chase * 3.0;
        }
        return;
      }
      const ammoHue = ammoFractionToHue(frac);
      nixieAmberMat.emissive.setHSL(ammoHue, 1.0, 0.5);
      nixieAmberMat.color.setHSL(ammoHue, 0.92, 0.74);
      nixieAmberMat.emissiveIntensity = (2.6 + currentHeat * 5.2) * flicker;
      if (retroGlowLight) {
        retroGlowLight.color.setHSL(ammoHue, 1.0, 0.52);
        retroGlowLight.intensity = 0.14 + currentHeat * 0.95;
      }
      for (let i = 0; i < barMats.length; i++) {
        const thresh = (i + 0.15) / barMats.length;
        const m = barMats[i];
        if (frac >= thresh) {
          const low = frac <= 0.25;
          m.emissive.setHSL(ammoHue, 1.0, 0.5);
          m.color.setHSL(ammoHue, 0.92, 0.74);
          m.emissiveIntensity = (low ? 2.6 + pulse * 2.0 : 2.9) * flicker;
        } else {
          m.emissive.setHex(0x44140c);
          m.color.setHex(0x522018);
          m.emissiveIntensity = isEmpty ? 0.7 + pulse * 1.4 : 0.32;
        }
      }
    },
    updateEnemyLeds(ramp, firePulse, isReloading, reloadProgress, elapsed, phase = 0) {
      const level = THREE.MathUtils.clamp(ramp + firePulse * 0.35, 0, 1.3);
      const pulse = 0.92 + 0.08 * Math.sin(elapsed * 22 + phase * 3.1);
      if (isReloading) {
        const head = ((reloadProgress * 2.6) % 1) * enemyOrderedMats.length;
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          const dist = Math.abs(i - head);
          driveRedLoadingMaterial(enemyOrderedMats[i], Math.max(0.08, 0.65 - dist * 0.2), 1.0);
        }
        return;
      }
      if (level <= 0.015) {
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          driveRedLoadingMaterial(enemyOrderedMats[i], 0, 1);
        }
        return;
      }
      if (level >= 0.95) {
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          driveRedLoadingMaterial(enemyOrderedMats[i], Math.min(1.3, level), pulse);
        }
        return;
      }
      const count = enemyOrderedMats.length;
      const fill = level * count;
      for (let i = 0; i < count; i++) {
        const seg = THREE.MathUtils.clamp(fill - i + 0.35, 0, 1);
        driveRedLoadingMaterial(enemyOrderedMats[i], seg * Math.max(0.45, level), pulse);
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

// ============================================================================
// 3. PUMP SHOTGUN -> VX-9 TACTICAL COMBAT SHOTGUN (buildFuturisticGun)
// ============================================================================

function buildFuturisticGunInternal(opts: KitWeaponBuildOptions): NormalizedKitWeaponRig {
  const variant = opts.variant ?? 'player';
  const isEnemy = variant === 'enemy';
  const aniso = opts.maxAnisotropy ?? 4;
  const root = new THREE.Group();
  root.name = isEnemy ? 'EnemyBlackVX9Shotgun' : 'PlayerFuturisticVX9Shotgun';

  const stipple = getStippleTextures(aniso);
  const gunmetal = getGunmetalTextures(aniso);
  const disposables: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };

  const cerakoteBlackMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x11141a : 0x191d24,
      ...(isEnemy ? {} : { map: gunmetal.map }),
      normalMap: gunmetal.normalMap,
      normalScale: new THREE.Vector2(0.88, 0.88),
      roughnessMap: gunmetal.roughnessMap,
      metalness: 0.74,
      roughness: isEnemy ? 0.40 : 0.34,
      clearcoat: isEnemy ? 0.14 : 0.32,
    })
  );

  const darkPolymerMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x0a0c10 : 0x111419,
    normalMap: gunmetal.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughnessMap: gunmetal.roughnessMap,
    metalness: 0.14,
    roughness: 0.68,
  });

  const recessedSteelMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0x0a0c10,
      normalMap: gunmetal.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      metalness: 0.86,
      roughness: 0.40,
    })
  );

  const orangeAnodizedMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x181c24 : 0xff5a10,
      emissive: isEnemy ? 0x000000 : 0x260800,
      emissiveIntensity: isEnemy ? 0 : 0.4,
      normalMap: gunmetal.normalMap,
      normalScale: new THREE.Vector2(0.42, 0.42),
      roughnessMap: gunmetal.roughnessMap,
      metalness: isEnemy ? 0.78 : 0.68,
      roughness: isEnemy ? 0.36 : 0.26,
      clearcoat: isEnemy ? 0.18 : 0.62,
    })
  );

  const gripStippleMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? 0x13161c : 0xe6e8ec,
    ...(isEnemy ? {} : { map: stipple.map }),
    normalMap: stipple.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: stipple.roughnessMap,
    metalness: 0.05,
    roughness: 0.84,
  });

  const titaniumMat = enhanceGunMetalMaterial(
    new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x1b2029 : 0xdce2ea,
      ...(isEnemy ? {} : { map: gunmetal.barrelMap }),
      normalMap: gunmetal.barrelNormalMap,
      normalScale: new THREE.Vector2(0.7, 0.7),
      metalness: isEnemy ? 0.88 : 0.96,
      roughness: isEnemy ? 0.32 : 0.19,
    })
  );

  const fireGlowMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x160204 : 0xffa64d,
    emissive: isEnemy ? 0xff120c : 0xff4b00,
    emissiveIntensity: isEnemy ? 0 : 0.75,
    roughness: 0.16,
    metalness: 0.25,
    clearcoat: 0.9,
  });

  const rearLedMats: THREE.MeshPhysicalMaterial[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x160204 : 0x9bffbc,
      emissive: isEnemy ? 0xff120c : 0x16ff62,
      emissiveIntensity: isEnemy ? 0 : 3.4,
      roughness: 0.08,
      metalness: 0.05,
      clearcoat: 1.0,
    });
    rearLedMats.push(m);
    disposables.push(m);
  }

  const barLedMats: THREE.MeshPhysicalMaterial[] = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.MeshPhysicalMaterial({
      color: isEnemy ? 0x160204 : 0x9bffbc,
      emissive: isEnemy ? 0xff120c : 0x16ff62,
      emissiveIntensity: isEnemy ? 0 : 3.2,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    barLedMats.push(m);
    disposables.push(m);
  }

  const opticGlassMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x1c2832 : 0x6ce8ff,
    metalness: 0.12,
    roughness: 0.04,
    transparent: true,
    opacity: 0.14,
    clearcoat: 1.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const redDotMat = new THREE.MeshBasicMaterial({
    color: 0xff1e1e,
    transparent: true,
    opacity: isEnemy ? 0.65 : 0.98,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const shellHullMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x7a1c12 : 0xe63b12,
    roughness: 0.36,
    metalness: 0.12,
  });

  const brassMat = new THREE.MeshPhysicalMaterial({
    color: isEnemy ? 0x3b3528 : 0xd9ad4e,
    metalness: 0.9,
    roughness: 0.25,
  });

  disposables.push(
    cerakoteBlackMat,
    darkPolymerMat,
    recessedSteelMat,
    orangeAnodizedMat,
    gripStippleMat,
    titaniumMat,
    fireGlowMat,
    opticGlassMat,
    redDotMat,
    shellHullMat,
    brassMat
  );

  // Sculpted receiver
  const recW = 0.062;
  const recTop = 0.045;
  const recBot = -0.016;
  const recShape = new THREE.Shape();
  recShape.moveTo(-recW / 2 + 0.01, recBot);
  recShape.lineTo(recW / 2 - 0.01, recBot);
  recShape.quadraticCurveTo(recW / 2, recBot + 0.001, recW / 2, recBot + 0.012);
  recShape.lineTo(recW / 2, recTop - 0.015);
  recShape.quadraticCurveTo(recW / 2, recTop - 0.002, recW / 2 - 0.014, recTop - 0.001);
  recShape.quadraticCurveTo(0, recTop + 0.0032, -recW / 2 + 0.014, recTop - 0.001);
  recShape.quadraticCurveTo(-recW / 2, recTop - 0.002, -recW / 2, recTop - 0.015);
  recShape.lineTo(-recW / 2, recBot + 0.012);
  recShape.quadraticCurveTo(-recW / 2, recBot + 0.001, -recW / 2 + 0.01, recBot);
  recShape.closePath();

  const receiverGeo = trackGeo(
    new THREE.ExtrudeGeometry(recShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.0046,
      bevelSize: 0.0026,
      bevelSegments: 3,
      curveSegments: 10,
    })
  );
  receiverGeo.translate(0, 0, -0.156);
  const receiverMesh = new THREE.Mesh(receiverGeo, cerakoteBlackMat);
  receiverMesh.castShadow = true;
  root.add(receiverMesh);

  // Stock neck
  const stockSideShape = new THREE.Shape();
  stockSideShape.moveTo(0.056, recTop - 0.003);
  stockSideShape.quadraticCurveTo(0.082, recTop - 0.006, 0.108, 0.022);
  stockSideShape.quadraticCurveTo(0.140, 0.008, 0.185, 0.004);
  stockSideShape.lineTo(0.185, -0.032);
  stockSideShape.quadraticCurveTo(0.128, -0.026, 0.088, -0.018);
  stockSideShape.quadraticCurveTo(0.068, -0.015, 0.056, recBot + 0.004);
  stockSideShape.closePath();
  const stockNeckGeo = trackGeo(
    new THREE.ExtrudeGeometry(stockSideShape, {
      depth: 0.036,
      bevelEnabled: true,
      bevelSize: 0.0065,
      bevelThickness: 0.007,
      bevelSegments: 3,
      curveSegments: 10,
    })
  );
  stockNeckGeo.rotateY(-Math.PI / 2);
  stockNeckGeo.translate(0.018, 0, 0);
  root.add(new THREE.Mesh(stockNeckGeo, darkPolymerMat));

  // Rear LEDs + buffer cap
  const bufferCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0108, 0.0122, 0.005, 16)),
    titaniumMat
  );
  bufferCap.rotation.x = Math.PI / 2;
  bufferCap.position.set(0, 0.013, 0.0726);
  root.add(bufferCap);

  const rearLedBezelGeo = trackGeo(new THREE.CapsuleGeometry(0.0026, 0.0086, 3, 8));
  rearLedBezelGeo.rotateZ(Math.PI / 2);
  const rearLedPipeGeo = trackGeo(new THREE.CapsuleGeometry(0.0016, 0.008, 3, 8));
  rearLedPipeGeo.rotateZ(Math.PI / 2);

  const rearLed0 = new THREE.Mesh(rearLedPipeGeo, rearLedMats[0]);
  rearLed0.position.set(-0.0126, 0.0325, 0.0738);
  rearLed0.rotation.z = 0.14;
  root.add(rearLed0);
  const rearLed2 = new THREE.Mesh(rearLedPipeGeo, rearLedMats[2]);
  rearLed2.position.set(0.0126, 0.0325, 0.0738);
  rearLed2.rotation.z = -0.14;
  root.add(rearLed2);

  const sidePipLedGeo = trackGeo(new THREE.CapsuleGeometry(0.0013, 0.0066, 3, 8));
  const rearLed1 = new THREE.Mesh(sidePipLedGeo, rearLedMats[1]);
  rearLed1.position.set(-0.0205, 0.013, 0.0738);
  root.add(rearLed1);
  const rearLed3 = new THREE.Mesh(sidePipLedGeo, rearLedMats[3]);
  rearLed3.position.set(0.0205, 0.013, 0.0738);
  root.add(rearLed3);

  // Side armor + thermal glow strips + 8-segment side LED panel
  for (const side of [-1, 1]) {
    const sideArmor = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.0046, 0.0165, 0.174)),
      orangeAnodizedMat
    );
    sideArmor.position.set(side * (recW / 2 + 0.0042), 0.027, -0.056);
    root.add(sideArmor);

    const channelBezel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.0034, 0.0092, 0.148)),
      recessedSteelMat
    );
    channelBezel.position.set(side * (recW / 2 + 0.0044), 0.011, -0.068);
    root.add(channelBezel);

    const glowStrip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.0026, 0.0052, 0.138)),
      fireGlowMat
    );
    glowStrip.position.set(side * (recW / 2 + 0.0054), 0.011, -0.068);
    root.add(glowStrip);
  }

  const ledPanelBezel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.0046, 0.0185, 0.092)),
    recessedSteelMat
  );
  ledPanelBezel.position.set(-(recW / 2 + 0.0048), -0.001, -0.018);
  root.add(ledPanelBezel);

  for (let i = 0; i < 6; i++) {
    const bar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.0032, 0.0102, 0.0068)),
      barLedMats[i]
    );
    bar.position.set(-(recW / 2 + 0.0062), -0.001, 0.016 - i * 0.0108);
    root.add(bar);
  }
  const sideGreenStrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.0032, 0.0044, 0.024)),
    barLedMats[6]
  );
  sideGreenStrip.position.set(-(recW / 2 + 0.006), 0.0045, 0.044);
  root.add(sideGreenStrip);
  const sideRedStrip = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.0032, 0.0044, 0.024)),
    barLedMats[7]
  );
  sideRedStrip.position.set(-(recW / 2 + 0.006), -0.004, 0.044);
  root.add(sideRedStrip);

  // Bolt carrier + orange charging handle
  const slideGroup = new THREE.Group();
  root.add(slideGroup);
  const boltCarrier = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.009, 0.0155, 0.078)),
    titaniumMat
  );
  boltCarrier.position.set(recW / 2 - 0.001, 0.014, -0.042);
  slideGroup.add(boltCarrier);
  const boltHandle = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0042, 0.0052, 0.018, 10)),
    orangeAnodizedMat
  );
  boltHandle.rotation.z = Math.PI / 2;
  boltHandle.position.set(recW / 2 + 0.0095, 0.014, -0.068);
  slideGroup.add(boltHandle);

  // Over/under barrel + mag tube + vented heatshield shroud
  const upperBarrel = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0156, 0.0164, 0.365, 16)),
    titaniumMat
  );
  upperBarrel.rotation.x = Math.PI / 2;
  upperBarrel.position.set(0, 0.021, -0.330);
  root.add(upperBarrel);

  const magTube = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0148, 0.0148, 0.338, 14)),
    cerakoteBlackMat
  );
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, -0.0125, -0.315);
  root.add(magTube);

  const tubeCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0162, 0.0162, 0.02, 14)),
    orangeAnodizedMat
  );
  tubeCap.rotation.x = Math.PI / 2;
  tubeCap.position.set(0, -0.0125, -0.486);
  root.add(tubeCap);

  const shroudShape = new THREE.Shape();
  shroudShape.moveTo(-0.023, 0.008);
  shroudShape.lineTo(0.023, 0.008);
  shroudShape.quadraticCurveTo(0.027, 0.01, 0.027, 0.02);
  shroudShape.lineTo(0.026, 0.03);
  shroudShape.quadraticCurveTo(0.025, 0.039, 0.014, 0.04);
  shroudShape.quadraticCurveTo(0, 0.0422, -0.014, 0.04);
  shroudShape.quadraticCurveTo(-0.025, 0.039, -0.026, 0.03);
  shroudShape.lineTo(-0.027, 0.02);
  shroudShape.quadraticCurveTo(-0.027, 0.01, -0.023, 0.008);
  shroudShape.closePath();

  const shroudGeo = trackGeo(
    new THREE.ExtrudeGeometry(shroudShape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelSize: 0.0014,
      bevelThickness: 0.0022,
      bevelSegments: 2,
      curveSegments: 8,
    })
  );
  shroudGeo.translate(0, 0, -0.472);
  root.add(new THREE.Mesh(shroudGeo, cerakoteBlackMat));

  for (let i = 0; i < 6; i++) {
    const vz = -0.19 - i * 0.044;
    const topVent = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.024, 0.0034, 0.025)), fireGlowMat);
    topVent.position.set(0, 0.0405, vz);
    root.add(topVent);
    for (const side of [-1, 1]) {
      const sideVent = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.0032, 0.0092, 0.027)), fireGlowMat);
      sideVent.position.set(side * 0.0275, 0.024, vz);
      root.add(sideVent);
    }
  }

  const brakeBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.044, 0.052)), cerakoteBlackMat);
  brakeBox.position.set(0, 0.021, -0.494);
  root.add(brakeBox);
  const brakeCollar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.011, 0.016)), orangeAnodizedMat);
  brakeCollar.position.set(0, 0.021, -0.476);
  root.add(brakeCollar);

  const useLights = !isEnemy && !opts.disableInternalLights;
  const barrelGlowLight = useLights ? new THREE.PointLight(0xff5a10, 0.14, 0.65, 2) : null;
  if (barrelGlowLight) {
    barrelGlowLight.position.set(-0.055, 0.042, -0.24);
    root.add(barrelGlowLight);
  }
  const ledGlowLight = useLights ? new THREE.PointLight(0x24ff66, 0.12, 0.28, 2) : null;
  if (ledGlowLight) {
    ledGlowLight.position.set(-0.052, 0.008, -0.01);
    root.add(ledGlowLight);
  }

  // Sliding Ribbed Pump Forend + Twin Action Bars
  const pumpGroup = new THREE.Group();
  pumpGroup.name = 'PumpForend';
  root.add(pumpGroup);

  const pumpCore = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0305, 0.0318, 0.166, 14)),
    darkPolymerMat
  );
  pumpCore.rotation.x = Math.PI / 2;
  pumpCore.position.set(0, -0.015, -0.295);
  pumpGroup.add(pumpCore);

  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.0316, 0.0028, 6, 14)),
      i === 0 || i === 7 ? orangeAnodizedMat : cerakoteBlackMat
    );
    rib.position.set(0, -0.015, -0.226 - i * 0.0195);
    pumpGroup.add(rib);
  }

  for (const side of [-1, 1]) {
    const pumpBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.0042, 0.0092, 0.142)),
      orangeAnodizedMat
    );
    pumpBar.position.set(side * 0.0318, -0.014, -0.295);
    pumpGroup.add(pumpBar);
    const actionBar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.0042, 0.0062, 0.162)),
      titaniumMat
    );
    actionBar.position.set(side * 0.0255, -0.008, -0.19);
    pumpGroup.add(actionBar);
  }

  // HandguardAnchor parented inside pumpGroup so left hand tracks pump slide automatically!
  const handguardAnchor = new THREE.Object3D();
  handguardAnchor.name = 'HandguardAnchor';
  handguardAnchor.position.set(0, -0.028, -0.295);
  pumpGroup.add(handguardAnchor);

  // Hollow Holo Optic
  const sightLineY = 0.0695;
  const opticBaseY = recTop + 0.0052;
  const deckMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.032, 0.006, 0.054)), cerakoteBlackMat);
  deckMesh.position.set(0, opticBaseY + 0.002, -0.018);
  root.add(deckMesh);

  const hoodZ = -0.016;
  const hoodDepth = 0.032;
  const ow = 0.0215;
  const ohBot = opticBaseY + 0.0035;
  const ohTop = sightLineY + 0.0172;
  const hoodOuter = new THREE.Shape();
  hoodOuter.moveTo(-ow, ohBot);
  hoodOuter.lineTo(ow, ohBot);
  hoodOuter.lineTo(ow + 0.0018, ohBot + 0.009);
  hoodOuter.lineTo(ow - 0.0014, ohTop - 0.0065);
  hoodOuter.lineTo(ow - 0.0075, ohTop);
  hoodOuter.lineTo(-ow + 0.0075, ohTop);
  hoodOuter.lineTo(-ow + 0.0014, ohTop - 0.0065);
  hoodOuter.lineTo(-ow - 0.0018, ohBot + 0.009);
  hoodOuter.closePath();

  const iw = 0.016;
  const ihBot = opticBaseY + 0.0062;
  const ihTop = sightLineY + 0.0132;
  const hoodAperture = new THREE.Path();
  hoodAperture.moveTo(-iw, ihBot + 0.002);
  hoodAperture.lineTo(-iw + 0.0025, ihBot);
  hoodAperture.lineTo(iw - 0.0025, ihBot);
  hoodAperture.lineTo(iw, ihBot + 0.002);
  hoodAperture.lineTo(iw, ihTop - 0.0042);
  hoodAperture.lineTo(iw - 0.0048, ihTop);
  hoodAperture.lineTo(-iw + 0.0048, ihTop);
  hoodAperture.lineTo(-iw, ihTop - 0.0042);
  hoodAperture.closePath();
  hoodOuter.holes.push(hoodAperture);

  const reflexHoodGeo = trackGeo(
    new THREE.ExtrudeGeometry(hoodOuter, {
      depth: hoodDepth,
      bevelEnabled: true,
      bevelThickness: 0.0015,
      bevelSize: 0.001,
      bevelSegments: 2,
    })
  );
  reflexHoodGeo.translate(0, 0, hoodZ - hoodDepth / 2);
  root.add(new THREE.Mesh(reflexHoodGeo, cerakoteBlackMat));

  const glassLens = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(iw * 2.02, ihTop - ihBot)),
    opticGlassMat
  );
  glassLens.position.set(0, (ihTop + ihBot) * 0.5, hoodZ - 0.002);
  root.add(glassLens);

  const retGroup = new THREE.Group();
  retGroup.position.set(0, sightLineY, hoodZ - 0.0015);
  root.add(retGroup);
  retGroup.add(
    new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.0011, 10)), redDotMat),
    new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.0068, 0.0075, 18)), redDotMat)
  );

  // Pistol Grip, Trigger, Reload Shell
  const triggerPivot = addStandardGripAndTrigger(
    root,
    gripStippleMat,
    cerakoteBlackMat,
    orangeAnodizedMat,
    trackGeo
  );

  const magazineGroup = new THREE.Group();
  magazineGroup.name = 'MagazineMesh';
  root.add(magazineGroup);

  const shellInsertMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0096, 0.0096, 0.058, 12)),
    shellHullMat
  );
  shellInsertMesh.rotation.x = Math.PI / 2;
  const shellBrassCap = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.0099, 0.0099, 0.016, 12)),
    brassMat
  );
  shellBrassCap.position.y = -0.024;
  shellInsertMesh.add(shellBrassCap);
  shellInsertMesh.position.set(0, -0.026, -0.075);
  shellInsertMesh.visible = false;
  magazineGroup.add(shellInsertMesh);

  const underbarrelLight = createUnderbarrelFlashlight({
    maxAnisotropy: aniso,
    orangeAccent: true,
    scale: 1.05,
    enemyBlack: isEnemy,
  });
  underbarrelLight.group.position.set(0, -0.036, -0.440);
  root.add(underbarrelLight.group);
  disposables.push(underbarrelLight);

  const flashRig = createPhotorealisticMuzzleFlash({
    profile: 'shotgun',
    scale: 1.15,
    tintHex: 0xffb168,
    lightRange: 8.5,
    lightIntensity: 11.5,
    enableLight: useLights,
  });
  flashRig.group.position.set(0, 0.021, -0.528);
  root.add(flashRig.group);
  disposables.push(flashRig);

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.name = 'MuzzleAnchor';
  muzzleAnchor.position.set(0, 0.021, -0.525);
  root.add(muzzleAnchor);

  const normalizedRoot = new THREE.Group();
  normalizedRoot.name = isEnemy ? 'EnemyBlackPumpShotgun' : 'SharedPumpShotgun';
  const alignGroup = new THREE.Group();
  alignGroup.rotation.y = Math.PI;
  alignGroup.scale.setScalar(1.08);
  alignGroup.position.set(0, 0.012, 0.026);
  alignGroup.add(root);
  normalizedRoot.add(alignGroup);

  let currentFireGlow = 0;
  const enemyOrderedMats: THREE.MeshStandardMaterial[] = [
    ...barLedMats,
    ...rearLedMats,
    fireGlowMat,
  ];
  const ledClusterLocalPos = new THREE.Vector3(0.035, 0.02, 0.04);

  return {
    weaponId: 'pump_shotgun',
    variant,
    kitRoot: root,
    normalizedRoot,
    muzzleAnchor,
    handguardAnchor,
    magazineGroup,
    pumpGroup,
    shellInsertMesh,
    ledClusterLocalPos,
    ledCount: 12,
    setSlideOffset(backMeters: number) {
      slideGroup.position.z = THREE.MathUtils.clamp(backMeters, 0, 0.074);
    },
    setPumpOffset(amount01: number) {
      const p = THREE.MathUtils.clamp(amount01, 0, 1);
      pumpGroup.position.z = p * 0.095;
      slideGroup.position.z = Math.max(slideGroup.position.z, p * 0.072);
    },
    setTriggerPull(amount01: number) {
      triggerPivot.rotation.x = THREE.MathUtils.clamp(amount01, 0, 1) * 0.44;
    },
    setMuzzleFlash(intensity: number) {
      flashRig.setIntensity(intensity);
    },
    setFlashlightOn(on: boolean) {
      underbarrelLight.setOn(on);
    },
    setFireGlow(heat01: number) {
      currentFireGlow = THREE.MathUtils.clamp(heat01, 0, 1);
      if (!isEnemy) {
        fireGlowMat.emissiveIntensity = 0.65 + currentFireGlow * 5.8;
        orangeAnodizedMat.emissiveIntensity = 0.35 + currentHeatFactor(currentFireGlow) * 1.45;
        if (barrelGlowLight) barrelGlowLight.intensity = 0.14 + currentFireGlow * 2.4;
      }
    },
    setReloadMagOffset(ox: number, oy: number, oz: number) {
      // Show & feed 12-gauge shell cleanly into bottom loading port during reload!
      const active = Math.abs(ox) + Math.abs(oy) + Math.abs(oz) > 0.002;
      shellInsertMesh.visible = active;
      if (active) {
        shellInsertMesh.position.set(-ox * 0.35, -0.026 + oy * 0.25, -0.075 - oz * 0.25);
      }
    },
    updateLeds(ammo: number, maxAmmo: number, isReloading: boolean, elapsed: number) {
      const frac = maxAmmo > 0 ? THREE.MathUtils.clamp(ammo / maxAmmo, 0, 1) : 0;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 13.0);
      const slowPulse = 0.78 + 0.22 * Math.sin(elapsed * 3.4);
      if (currentFireGlow > 0.02) {
        fireGlowMat.emissiveIntensity = 0.65 + currentFireGlow * (5.6 + Math.sin(elapsed * 26) * 0.5);
      }
      if (isReloading) {
        for (let i = 0; i < rearLedMats.length; i++) {
          const m = rearLedMats[i];
          const hue = (elapsed * 1.65 - i * 0.22 + 10) % 1.0;
          const chase = 0.5 + 0.5 * Math.sin(elapsed * 16.0 - i * 1.45);
          m.emissive.setHSL(hue, 1.0, 0.52);
          m.color.setHSL(hue, 0.92, 0.76);
          m.emissiveIntensity = 2.0 + chase * 3.0;
        }
        for (let i = 0; i < barLedMats.length; i++) {
          const m = barLedMats[i];
          const swirlHue = (elapsed * 1.65 - i * 0.16 + 10) % 1.0;
          const chase = 0.5 + 0.5 * Math.sin(elapsed * 16.0 - i * 1.05);
          m.emissive.setHSL(swirlHue, 1.0, 0.52);
          m.color.setHSL(swirlHue, 0.92, 0.76);
          m.emissiveIntensity = 1.8 + chase * 2.8;
        }
        if (ledGlowLight) ledGlowLight.intensity = 0.04;
        return;
      }
      const ammoHue = ammoFractionToHue(frac);
      const isEmpty = ammo === 0;
      const isLow = frac <= 0.3;
      for (let i = 0; i < rearLedMats.length; i++) {
        const m = rearLedMats[i];
        m.emissive.setHSL(ammoHue, 1.0, 0.5);
        m.color.setHSL(ammoHue, 0.92, 0.74);
        m.emissiveIntensity = isEmpty
          ? 1.4 + pulse * 3.2
          : isLow
            ? 2.4 + pulse * 2.2
            : 3.1 + slowPulse * 0.3 + currentFireGlow * 1.1;
      }
      if (ledGlowLight) {
        if (currentFireGlow > 0.38) ledGlowLight.color.setHex(0xff6218);
        else ledGlowLight.color.setHSL(ammoHue, 1.0, 0.52);
        ledGlowLight.intensity = isEmpty ? 0.1 + pulse * 0.06 : 0.09 + currentFireGlow * 0.18;
      }
      for (let i = 0; i < 6; i++) {
        const threshold = (i + 0.15) / 6;
        const m = barLedMats[i];
        if (frac >= threshold) {
          m.emissive.setHSL(ammoHue, 1.0, 0.5);
          m.color.setHSL(ammoHue, 0.92, 0.74);
          m.emissiveIntensity = (isLow ? 2.4 + pulse * 2.1 : 3.0) + currentFireGlow * 1.3;
        } else {
          m.emissive.setHSL(0.0, 1.0, 0.45);
          m.color.setHex(0x4a1616);
          m.emissiveIntensity = isEmpty ? 0.8 + pulse * 1.6 : 0.28;
        }
      }
      for (let i = 6; i < barLedMats.length; i++) {
        const m = barLedMats[i];
        m.emissive.setHSL(ammoHue, 1.0, 0.5);
        m.color.setHSL(ammoHue, 0.92, 0.74);
        m.emissiveIntensity = isEmpty
          ? 1.2 + pulse * 2.8
          : (isLow ? 2.4 + pulse * 2.0 : 2.9) + currentFireGlow * 1.2;
      }
    },
    updateEnemyLeds(ramp, firePulse, isReloading, reloadProgress, elapsed, phase = 0) {
      const level = THREE.MathUtils.clamp(ramp + firePulse * 0.35, 0, 1.3);
      const pulse = 0.92 + 0.08 * Math.sin(elapsed * 18 + phase * 3.1);
      if (isReloading) {
        const head = ((reloadProgress * 3.0) % 1) * enemyOrderedMats.length;
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          const dist = Math.abs(i - head);
          driveRedLoadingMaterial(enemyOrderedMats[i], Math.max(0.08, 0.7 - dist * 0.18), 1.0);
        }
        return;
      }
      if (level <= 0.015) {
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          driveRedLoadingMaterial(enemyOrderedMats[i], 0, 1);
        }
        return;
      }
      if (level >= 0.95) {
        for (let i = 0; i < enemyOrderedMats.length; i++) {
          driveRedLoadingMaterial(enemyOrderedMats[i], Math.min(1.3, level), pulse);
        }
        return;
      }
      const count = enemyOrderedMats.length;
      const fill = level * count;
      for (let i = 0; i < count; i++) {
        const seg = THREE.MathUtils.clamp(fill - i + 0.35, 0, 1);
        driveRedLoadingMaterial(enemyOrderedMats[i], seg * Math.max(0.45, level), pulse);
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

function currentHeatFactor(h: number): number {
  return h;
}

// ============================================================================
// PUBLIC UNIFIED ENTRYPOINT FOR BOTH PLAYER & ENEMY ARSENAL WEAPONS
// ============================================================================

export function buildKitWeaponRig(
  weaponId: SharedWeaponId = 'service_carbine',
  options: KitWeaponBuildOptions = {}
): NormalizedKitWeaponRig {
  if (weaponId === 'full_auto_carbine') {
    return buildRusticRussianSmgInternal(options);
  }
  if (weaponId === 'pump_shotgun') {
    return buildFuturisticGunInternal(options);
  }
  return buildRetroSovietSmgInternal(options);
}
