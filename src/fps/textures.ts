import * as THREE from 'three';

export type SkinToneId = 'light' | 'medium' | 'tan' | 'deep' | 'olive';

export interface SkinPaletteSpec {
  baseHex: string;
  midHex: string;
  shadowHex: string;
  knuckleRedHex: string;
  sheenHex: string;
}

export const SKIN_PALETTES: Record<SkinToneId, SkinPaletteSpec> = {
  light: {
    baseHex: '#d8a88e',
    midHex: '#c48f75',
    shadowHex: '#9d6a56',
    knuckleRedHex: '#b8685c',
    sheenHex: '#f4d2be',
  },
  medium: {
    baseHex: '#c89272',
    midHex: '#b07759',
    shadowHex: '#8a553e',
    knuckleRedHex: '#a35648',
    sheenHex: '#e7b99e',
  },
  tan: {
    baseHex: '#ae7957',
    midHex: '#946142',
    shadowHex: '#70432b',
    knuckleRedHex: '#8b4938',
    sheenHex: '#cfa07e',
  },
  olive: {
    baseHex: '#ba8d68',
    midHex: '#9f7552',
    shadowHex: '#785338',
    knuckleRedHex: '#915744',
    sheenHex: '#d8b28e',
  },
  deep: {
    baseHex: '#6c4734',
    midHex: '#563626',
    shadowHex: '#3d2418',
    knuckleRedHex: '#5c3127',
    sheenHex: '#8c644d',
  },
};

export interface SkinTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface LeatherGloveTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  armorMap: THREE.CanvasTexture;
  armorNormalMap: THREE.CanvasTexture;
  armorRoughnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface LeatherJacketTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

export interface WeaponTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  barrelMap: THREE.CanvasTexture;
  barrelNormalMap: THREE.CanvasTexture;
  metalnessMap?: THREE.CanvasTexture;
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

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function heightBufferToNormalCanvas(
  heights: Float32Array,
  size: number,
  strength: number,
): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dx = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dy = (heights[yp * size + x] - heights[ym * size + x]) * strength;
      let nx = -dx;
      let ny = -dy;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function makeTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAnisotropy: number,
  repeat = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy || 1));
  tex.needsUpdate = true;
  return tex;
}

export function createSkinTextures(
  toneOrAniso: SkinToneId | number = 'medium',
  anisoOrTone: number | SkinToneId = 4,
): SkinTextureSet {
  const toneId: SkinToneId =
    typeof toneOrAniso === 'string'
      ? toneOrAniso
      : typeof anisoOrTone === 'string'
        ? anisoOrTone
        : 'medium';
  const maxAnisotropy: number =
    typeof toneOrAniso === 'number'
      ? toneOrAniso
      : typeof anisoOrTone === 'number'
        ? anisoOrTone
        : 4;
  const size = 256;
  const pal = SKIN_PALETTES[toneId] ?? SKIN_PALETTES.medium;
  const rng = mulberry32(4109);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  const grad = ctxM.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, pal.baseHex);
  grad.addColorStop(0.55, pal.midHex);
  grad.addColorStop(1, pal.shadowHex);
  ctxM.fillStyle = grad;
  ctxM.fillRect(0, 0, size, size);

  ctxR.fillStyle = 'rgb(142,142,142)';
  ctxR.fillRect(0, 0, size, size);

  // Subtle subsurface mottling + micro-pores + fine knuckle crease lines
  for (let i = 0; i < 650; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1.5 + rng() * 6;
    ctxM.fillStyle = i % 3 === 0 ? `${pal.knuckleRedHex}18` : `${pal.shadowHex}12`;
    ctxM.beginPath();
    ctxM.arc(x, y, r, 0, Math.PI * 2);
    ctxM.fill();
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const pore =
        Math.sin(x * 0.65) * Math.cos(y * 0.65) * 0.18 +
        Math.sin((x + y) * 0.28) * 0.1 +
        (rng() - 0.5) * 0.22;
      heights[y * size + x] = pore;
    }
  }

  ctxM.strokeStyle = `${pal.shadowHex}28`;
  ctxM.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const y = (i / 24) * size;
    ctxM.beginPath();
    ctxM.moveTo(0, y);
    ctxM.bezierCurveTo(size * 0.33, y + (rng() - 0.5) * 6, size * 0.66, y + (rng() - 0.5) * 6, size, y);
    ctxM.stroke();
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 1.4);
  const map = makeTex(cMap, true, maxAnisotropy, 1);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 1);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 1);

  return {
    map,
    normalMap,
    roughnessMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function createBlackLeatherGloveTextures(
  maxAnisotropy: number,
): LeatherGloveTextureSet {
  const size = 256;
  const rng = mulberry32(9912);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  ctxM.fillStyle = '#17191e';
  ctxM.fillRect(0, 0, size, size);
  ctxR.fillStyle = 'rgb(126,126,126)';
  ctxR.fillRect(0, 0, size, size);

  // Pebbled full-grain tactical leather cells
  for (let i = 0; i < 2400; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1.2 + rng() * 2.2;
    const shade = 20 + Math.floor(rng() * 18);
    ctxM.fillStyle = `rgb(${shade},${shade + 1},${shade + 4})`;
    ctxM.beginPath();
    ctxM.arc(x, y, r, 0, Math.PI * 2);
    ctxM.fill();

    const rVal = 96 + Math.floor(rng() * 52);
    ctxR.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
    ctxR.beginPath();
    ctxR.arc(x, y, r, 0, Math.PI * 2);
    ctxR.fill();
  }

  // Subtle stitch grid lines
  ctxM.strokeStyle = 'rgba(8, 10, 14, 0.55)';
  ctxM.lineWidth = 1.2;
  for (let i = 32; i < size; i += 64) {
    ctxM.beginPath();
    ctxM.moveTo(0, i);
    ctxM.lineTo(size, i);
    ctxM.stroke();
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain =
        Math.sin(x * 0.95) * Math.sin(y * 0.95) * 0.35 +
        Math.cos(x * 0.42 + y * 0.31) * 0.22 +
        (rng() - 0.5) * 0.25;
      heights[y * size + x] = grain;
    }
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 2.2);
  const map = makeTex(cMap, true, maxAnisotropy, 2);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 2);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 2);

  // Scuffed 2x2 carbon-kevlar knuckle armor maps
  const [aMap, ctxAM] = makeCanvas(128);
  const [aRough, ctxAR] = makeCanvas(128);
  const aHeights = new Float32Array(128 * 128);
  ctxAM.fillStyle = '#181b20';
  ctxAM.fillRect(0, 0, 128, 128);
  ctxAR.fillStyle = 'rgb(142,142,142)';
  ctxAR.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const diag = ((x + y) / 8) % 2 === 0;
      ctxAM.fillStyle = diag ? '#22262d' : '#14171c';
      ctxAM.fillRect(x, y, 7, 7);
      ctxAR.fillStyle = diag ? 'rgb(112,112,112)' : 'rgb(168,168,168)';
      ctxAR.fillRect(x, y, 7, 7);
    }
  }
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const cell = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0) ? 0.32 : -0.24;
      aHeights[y * 128 + x] = cell + (rng() - 0.5) * 0.14;
    }
  }
  const armorNormalC = heightBufferToNormalCanvas(aHeights, 128, 1.8);
  const armorMap = makeTex(aMap, true, maxAnisotropy, 3);
  const armorNormalMap = makeTex(armorNormalC, false, maxAnisotropy, 3);
  const armorRoughnessMap = makeTex(aRough, false, maxAnisotropy, 3);

  return {
    map,
    normalMap,
    roughnessMap,
    armorMap,
    armorNormalMap,
    armorRoughnessMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      armorMap.dispose();
      armorNormalMap.dispose();
      armorRoughnessMap.dispose();
    },
  };
}

export function createBlackLeatherJacketTextures(
  maxAnisotropy: number,
): LeatherJacketTextureSet {
  const size = 256;
  const rng = mulberry32(5521);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  ctxM.fillStyle = '#14171c';
  ctxM.fillRect(0, 0, size, size);
  ctxR.fillStyle = 'rgb(154,154,154)';
  ctxR.fillRect(0, 0, size, size);

  // Ripstop + grained leather jacket sleeve weave
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const v = 18 + Math.floor(rng() * 14);
      ctxM.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctxM.fillRect(x, y, 3, 3);
    }
  }

  // Soft fold creases
  ctxM.strokeStyle = 'rgba(6, 7, 10, 0.5)';
  ctxM.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = rng() * size;
    ctxM.beginPath();
    ctxM.moveTo(0, y);
    ctxM.quadraticCurveTo(size * 0.5, y + (rng() - 0.5) * 20, size, y + (rng() - 0.5) * 8);
    ctxM.stroke();
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const weave =
        ((x % 4 === 0 || y % 4 === 0) ? -0.2 : 0.15) +
        Math.sin(y * 0.16 + Math.sin(x * 0.08) * 1.4) * 0.24 +
        (rng() - 0.5) * 0.16;
      heights[y * size + x] = weave;
    }
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 1.9);
  const map = makeTex(cMap, true, maxAnisotropy, 2);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 2);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 2);

  return {
    map,
    normalMap,
    roughnessMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function createGunmetalTexture(maxAnisotropy: number): WeaponTextureSet {
  const size = 256;
  const rng = mulberry32(7310);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  ctxM.fillStyle = '#333840';
  ctxM.fillRect(0, 0, size, size);
  ctxR.fillStyle = 'rgb(96,96,96)';
  ctxR.fillRect(0, 0, size, size);

  // Fine brushed machining lines
  for (let y = 0; y < size; y++) {
    const streak = (rng() - 0.5) * 16;
    const c = Math.max(24, Math.min(84, Math.round(52 + streak)));
    ctxM.fillStyle = `rgb(${c},${c + 2},${c + 5})`;
    ctxM.fillRect(0, y, size, 1);

    const r = Math.max(60, Math.min(150, Math.round(98 + streak * 1.6)));
    ctxR.fillStyle = `rgb(${r},${r},${r})`;
    ctxR.fillRect(0, y, size, 1);
  }

  for (let y = 0; y < size; y++) {
    const rowJitter = (rng() - 0.5) * 0.3;
    for (let x = 0; x < size; x++) {
      heights[y * size + x] = rowJitter + (rng() - 0.5) * 0.18;
    }
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 1.5);
  const map = makeTex(cMap, true, maxAnisotropy, 2);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 2);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 2);

  return {
    map,
    normalMap,
    roughnessMap,
    barrelMap: map,
    barrelNormalMap: normalMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function createPolymerStippleTextures(maxAnisotropy: number): WeaponTextureSet {
  const size = 256;
  const rng = mulberry32(2804);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  ctxM.fillStyle = '#1b1e24';
  ctxM.fillRect(0, 0, size, size);
  ctxR.fillStyle = 'rgb(165,165,165)';
  ctxR.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const rad = 0.8 + rng() * 1.4;
    const v = 18 + Math.floor(rng() * 20);
    ctxM.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    ctxM.fillRect(x, y, rad, rad);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heights[y * size + x] =
        Math.sin(x * 1.7) * Math.sin(y * 1.7) * 0.35 + (rng() - 0.5) * 0.35;
    }
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 2.3);
  const map = makeTex(cMap, true, maxAnisotropy, 3);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 3);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 3);

  return {
    map,
    normalMap,
    roughnessMap,
    barrelMap: map,
    barrelNormalMap: normalMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function createRustedRussianSteelTextures(
  maxAnisotropy: number,
  variant = 0,
): WeaponTextureSet {
  const size = 256;
  const rng = mulberry32(6610 + variant * 137);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const [cMetal, ctxMet] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  ctxM.fillStyle = '#40454d';
  ctxM.fillRect(0, 0, size, size);
  ctxR.fillStyle = 'rgb(112,112,112)';
  ctxR.fillRect(0, 0, size, size);
  ctxMet.fillStyle = 'rgb(225,225,225)';
  ctxMet.fillRect(0, 0, size, size);

  // Oxide rust patches (high roughness, lower metalness)
  for (let i = 0; i < 240; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 3 + rng() * 14;
    const warm = rng();
    ctxM.fillStyle =
      warm > 0.45 ? 'rgba(104, 54, 30, 0.34)' : 'rgba(68, 42, 28, 0.28)';
    ctxM.beginPath();
    ctxM.arc(x, y, r, 0, Math.PI * 2);
    ctxM.fill();

    ctxR.fillStyle = 'rgba(218, 218, 218, 0.35)';
    ctxR.beginPath();
    ctxR.arc(x, y, r, 0, Math.PI * 2);
    ctxR.fill();

    ctxMet.fillStyle = 'rgba(72, 72, 72, 0.32)';
    ctxMet.beginPath();
    ctxMet.arc(x, y, r, 0, Math.PI * 2);
    ctxMet.fill();
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heights[y * size + x] =
        Math.sin(x * 0.21 + y * 0.13) * 0.25 + (rng() - 0.5) * 0.42;
    }
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 2.1);
  const map = makeTex(cMap, true, maxAnisotropy, 2);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 2);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 2);
  const metalnessMap = makeTex(cMetal, false, maxAnisotropy, 2);

  return {
    map,
    normalMap,
    roughnessMap,
    barrelMap: map,
    barrelNormalMap: normalMap,
    metalnessMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
    },
  };
}

export function createRussianWoodTextures(maxAnisotropy: number): WeaponTextureSet {
  const size = 256;
  const rng = mulberry32(3108);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  ctxM.fillStyle = '#754626';
  ctxM.fillRect(0, 0, size, size);
  ctxR.fillStyle = 'rgb(142,142,142)';
  ctxR.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.14) * 14 + Math.sin(y * 0.42) * 5;
    const tone = Math.round(92 + wave + (rng() - 0.5) * 18);
    ctxM.fillStyle = `rgb(${Math.min(165, tone + 28)},${Math.max(36, tone - 18)},${Math.max(18, tone - 42)})`;
    ctxM.fillRect(0, y, size, 1);

    const r = Math.max(90, Math.min(200, Math.round(138 - wave * 1.5)));
    ctxR.fillStyle = `rgb(${r},${r},${r})`;
    ctxR.fillRect(0, y, size, 1);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heights[y * size + x] =
        Math.sin(y * 0.35 + Math.sin(x * 0.08) * 1.8) * 0.3 + (rng() - 0.5) * 0.12;
    }
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 1.5);
  const map = makeTex(cMap, true, maxAnisotropy, 1);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 1);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 1);

  return {
    map,
    normalMap,
    roughnessMap,
    barrelMap: map,
    barrelNormalMap: normalMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function createSovietBakeliteTextures(maxAnisotropy: number): WeaponTextureSet {
  const size = 256;
  const rng = mulberry32(8421);
  const [cMap, ctxM] = makeCanvas(size);
  const [cRough, ctxR] = makeCanvas(size);
  const heights = new Float32Array(size * size);

  ctxM.fillStyle = '#8b351b';
  ctxM.fillRect(0, 0, size, size);
  ctxR.fillStyle = 'rgb(118,118,118)';
  ctxR.fillRect(0, 0, size, size);

  for (let i = 0; i < 320; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const w = 4 + rng() * 24;
    const h = 1.5 + rng() * 5;
    ctxM.fillStyle =
      i % 2 === 0 ? 'rgba(164, 68, 28, 0.24)' : 'rgba(72, 22, 12, 0.28)';
    ctxM.fillRect(x, y, w, h);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heights[y * size + x] =
        Math.sin(x * 0.18 + y * 0.09) * 0.2 + (rng() - 0.5) * 0.14;
    }
  }

  const normalC = heightBufferToNormalCanvas(heights, size, 1.2);
  const map = makeTex(cMap, true, maxAnisotropy, 1);
  const normalMap = makeTex(normalC, false, maxAnisotropy, 1);
  const roughnessMap = makeTex(cRough, false, maxAnisotropy, 1);

  return {
    map,
    normalMap,
    roughnessMap,
    barrelMap: map,
    barrelNormalMap: normalMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    },
  };
}
