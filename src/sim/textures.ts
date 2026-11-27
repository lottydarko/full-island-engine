import * as THREE from 'three';
import { BuildingStyle, mulberry32 } from './mapData';

export interface BuildingMaterialSet {
  side: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
}

export type DistrictId = 'D1' | 'D2' | 'D3' | 'D4' | 'D7' | 'D8' | 'D9' | 'D10';

export const KALUGA_DISTRICTS: readonly DistrictId[] = [
  'D1',
  'D2',
  'D3',
  'D4',
  'D7',
  'D8',
  'D9',
  'D10',
] as const;

export interface DistrictBaseWallSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
}

export interface DistrictWindowGridSet {
  litMap: THREE.CanvasTexture;
  unlitMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  litMaterial: THREE.MeshStandardMaterial;
  unlitMaterial: THREE.MeshStandardMaterial;
}

export interface DistrictGroundFloorSet {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
}

export interface DistrictRooflineSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
  roofCapMap: THREE.CanvasTexture;
  roofCapMaterial: THREE.MeshStandardMaterial;
}

export interface DistrictFacadeFamily {
  id: DistrictId;
  name: string;
  cyrillicName: string;
  materialLanguage: string;
  eraNote: string;
  accentHex: string;
  defaultWear: {
    grime: number;
    streaks: number;
    patching: number;
    peeling: number;
  };
  baseWall: DistrictBaseWallSet;
  windowGrid: DistrictWindowGridSet;
  groundFloor: DistrictGroundFloorSet;
  roofline: DistrictRooflineSet;
}

export type WearLayerKind = 'grime' | 'streaks' | 'patching' | 'peeling';

export interface WearLayerAsset {
  kind: WearLayerKind;
  label: string;
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
}

export type WearLayerSet = Record<WearLayerKind, WearLayerAsset>;

export type ReservedSignageKind =
  | 'billboardStandard'
  | 'billboardWide'
  | 'marqueeStrip'
  | 'bladeVertical'
  | 'posterPortrait';

export interface ReservedSignagePanel {
  kind: ReservedSignageKind;
  label: string;
  worldWidth: number;
  worldHeight: number;
  texWidth: number;
  texHeight: number;
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  material: THREE.MeshStandardMaterial;
}

export type ReservedSignageSet = Record<ReservedSignageKind, ReservedSignagePanel>;

export interface TextureLibraryStats {
  legacyTextureCount: number;
  newTextureCount: number;
  totalTextureCount: number;
  estimatedLegacyGpuBytes: number;
  estimatedNewGpuBytes: number;
  estimatedTotalGpuBytes: number;
  tilingMethod: string;
}

export interface TextureLibrary {
  asphaltMap: THREE.CanvasTexture; // Double solid yellow center line (Avenues / Coastal / Roundabout)
  asphaltDottedMap: THREE.CanvasTexture; // Dotted single yellow center line (Neighborhood Streets)
  asphaltRoughness: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  grassGroundMap: THREE.CanvasTexture;
  grassGroundBump: THREE.CanvasTexture;
  sidewalkMap: THREE.CanvasTexture;
  cathedralWallMap: THREE.CanvasTexture;
  cathedralDomeGoldMap: THREE.CanvasTexture;
  cathedralDomeBlueMap: THREE.CanvasTexture;
  concreteWeatheredMap: THREE.CanvasTexture;
  concreteBump: THREE.CanvasTexture;
  containerMaps: THREE.CanvasTexture[];
  carPaintMap: THREE.CanvasTexture;
  carPaintRoughness: THREE.CanvasTexture;
  carBodyBump: THREE.CanvasTexture;
  trafficPaintMap: THREE.CanvasTexture;
  trafficPaintRoughness: THREE.CanvasTexture;
  trafficPaintBump: THREE.CanvasTexture;
  truckCargoMap: THREE.CanvasTexture;
  tireTreadMap: THREE.CanvasTexture;
  licensePlateMap: THREE.CanvasTexture;
  tailLightMap: THREE.CanvasTexture;
  carbonWeaveMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  raindropMap: THREE.CanvasTexture;
  softRainStreakMap: THREE.CanvasTexture;
  rippleMap: THREE.CanvasTexture;
  puddleMap: THREE.CanvasTexture;
  pedClothingMap: THREE.CanvasTexture;
  pedClothingBump: THREE.CanvasTexture;
  pedClothingRoughness: THREE.CanvasTexture;
  pedFaceMap: THREE.CanvasTexture;
  pedFaceSkinMap: THREE.CanvasTexture;
  pedFaceBump: THREE.CanvasTexture;
  pedHairMap: THREE.CanvasTexture;
  pedHairBump: THREE.CanvasTexture;
  pedFabricDenimMap: THREE.CanvasTexture;
  pedFabricDenimBump: THREE.CanvasTexture;
  pedFabricDenimRoughness: THREE.CanvasTexture;
  pedFabricLeatherMap: THREE.CanvasTexture;
  pedFabricLeatherBump: THREE.CanvasTexture;
  pedFabricLeatherRoughness: THREE.CanvasTexture;
  pedFabricKnitMap: THREE.CanvasTexture;
  pedFabricKnitBump: THREE.CanvasTexture;
  pedFabricKnitRoughness: THREE.CanvasTexture;
  pedFaceWeatheredMap: THREE.CanvasTexture;
  pedFaceStreetCloseMap: THREE.CanvasTexture;
  newspaperMap: THREE.CanvasTexture;
  phoneScreenMap: THREE.CanvasTexture;
  metroFloorMap: THREE.CanvasTexture;
  metroFloorRoughness: THREE.CanvasTexture;
  metroWallMap: THREE.CanvasTexture;
  metroWallBump: THREE.CanvasTexture;
  metroSeatMap: THREE.CanvasTexture;
  metroSeatBump: THREE.CanvasTexture;
  buildingMaterials: Record<BuildingStyle, BuildingMaterialSet>;
  emissiveMaterials: THREE.MeshStandardMaterial[];
  // Additive Kaluga 2059 Skin Engine exports:
  districtFamilies: Record<DistrictId, DistrictFacadeFamily>;
  wearLayers: WearLayerSet;
  reservedSignage: ReservedSignageSet;
  textureStats: TextureLibraryStats;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Smooth, Pitch-Black Rain-Flooded Wet Asphalt with Crisp Yellow Double Solid OR Dotted Single Center Lines (ZERO snow!)
function buildAsphaltTextures(anisotropy: number) {
  const size = 512;
  const [cDouble, ctxD] = makeCanvas(size, size);
  const [cDotted, ctxS] = makeCanvas(size, size);
  const [cRough, ctxR] = makeCanvas(size, size);
  const [cBump, ctxB] = makeCanvas(size, size);
  const rng = mulberry32(4201);

  // Smooth dark wet obsidian-black asphalt base
  for (const ctx of [ctxD, ctxS]) {
    ctx.fillStyle = '#0e1116';
    ctx.fillRect(0, 0, size, size);
  }

  // Controlled wet roughness (glossy puddles ~0.22, damp tarmac ~0.46 — rich dark sheen, NEVER blinding mirror!)
  ctxR.fillStyle = '#686868';
  ctxR.fillRect(0, 0, size, size);

  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  // Subtle dark stone aggregate grain
  for (let i = 0; i < 14000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const v = Math.floor(11 + rng() * 18);
    const col = `rgb(${v},${v + 2},${v + 5})`;
    ctxD.fillStyle = col;
    ctxD.fillRect(x, y, 2, 2);
    ctxS.fillStyle = col;
    ctxS.fillRect(x, y, 2, 2);

    const b = Math.floor(116 + rng() * 24);
    ctxB.fillStyle = `rgb(${b},${b},${b})`;
    ctxB.fillRect(x, y, 2, 2);
  }

  // Subtle dark wet tire-track channels in BOTH lanes
  const trackXs = [size * 0.23, size * 0.35, size * 0.65, size * 0.77];
  for (const tx of trackXs) {
    const gr = ctxR.createLinearGradient(tx - 26, 0, tx + 26, 0);
    gr.addColorStop(0, 'rgba(104,104,104,0)');
    gr.addColorStop(0.5, 'rgba(38,38,38,0.82)');
    gr.addColorStop(1, 'rgba(104,104,104,0)');
    ctxR.fillStyle = gr;
    ctxR.fillRect(tx - 26, 0, 52, size);

    for (const ctx of [ctxD, ctxS]) {
      const gc = ctx.createLinearGradient(tx - 24, 0, tx + 24, 0);
      gc.addColorStop(0, 'rgba(6,8,12,0)');
      gc.addColorStop(0.5, 'rgba(5,7,11,0.55)');
      gc.addColorStop(1, 'rgba(6,8,12,0)');
      ctx.fillStyle = gc;
      ctx.fillRect(tx - 24, 0, 48, size);
    }
  }

  // Quiet, glassy dark rainwater puddles with delicate illusionary distant city shimmer
  const shimmerHues = [
    'rgba(48, 128, 165, 0.11)',
    'rgba(165, 112, 54, 0.10)',
    'rgba(142, 58, 108, 0.09)',
    'rgba(78, 108, 145, 0.11)',
  ];
  for (let i = 0; i < 34; i++) {
    const px = size * (0.08 + rng() * 0.84);
    const py = rng() * size;
    const rx = 24 + rng() * 64;
    const ry = 28 + rng() * 88;
    const rot = (rng() - 0.5) * 0.45;
    const g = ctxR.createRadialGradient(px, py, 2, px, py, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(18,18,18,0.96)');
    g.addColorStop(0.65, 'rgba(38,38,38,0.58)');
    g.addColorStop(1, 'rgba(104,104,104,0)');
    ctxR.fillStyle = g;
    ctxR.beginPath();
    ctxR.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
    ctxR.fill();

    // Subtle darkened puddle depth + quiet vertical city-light shimmer streak inside the puddle
    const shimmerCol = shimmerHues[i % shimmerHues.length];
    for (const ctx of [ctxD, ctxS]) {
      const gp = ctx.createRadialGradient(px, py, 2, px, py, Math.max(rx, ry));
      gp.addColorStop(0, 'rgba(3,5,9,0.56)');
      gp.addColorStop(0.75, 'rgba(5,8,13,0.22)');
      gp.addColorStop(1, 'rgba(5,8,13,0)');
      ctx.fillStyle = gp;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();

      const gs = ctx.createLinearGradient(px, py - ry * 0.75, px, py + ry * 0.75);
      gs.addColorStop(0, 'rgba(0,0,0,0)');
      gs.addColorStop(0.5, shimmerCol);
      gs.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gs;
      ctx.fillRect(px - rx * 0.24, py - ry * 0.72, rx * 0.48, ry * 1.44);
    }
  }

  // Dark rainwater gutter strips along outer curbs (no snow!)
  for (const ctx of [ctxD, ctxS]) {
    for (const side of [0, 1]) {
      const grad = ctx.createLinearGradient(
        side === 0 ? 0 : size,
        0,
        side === 0 ? size * 0.08 : size * 0.92,
        0
      );
      grad.addColorStop(0, 'rgba(4,7,12,0.85)');
      grad.addColorStop(1, 'rgba(4,7,12,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(side === 0 ? 0 : size * 0.92, 0, size * 0.08, size);
    }
  }

  // Crisp Solid White Outer Shoulder Lines on BOTH road types
  for (const ctx of [ctxD, ctxS]) {
    ctx.fillStyle = 'rgba(225, 232, 240, 0.85)';
    ctx.fillRect(size * 0.055, 0, 6, size);
    ctx.fillRect(size * 0.945 - 6, 0, 6, size);
  }

  // 1) DOUBLE SOLID BRIGHT YELLOW CENTER LINE (Avenues, Roundabout, Coastal Ring)
  ctxD.fillStyle = 'rgba(246, 198, 28, 0.94)';
  ctxD.fillRect(size * 0.5 - 9, 0, 6, size);
  ctxD.fillRect(size * 0.5 + 3, 0, 6, size);

  // 2) DOTTED SINGLE BRIGHT YELLOW CENTER LINE (Neighborhood & District Streets)
  ctxS.fillStyle = 'rgba(246, 198, 28, 0.94)';
  for (let y = 10; y < size; y += 84) {
    ctxS.fillRect(size * 0.5 - 4, y, 8, 46);
  }

  // Subtle asphalt cracks
  ctxB.strokeStyle = 'rgba(40,40,40,0.65)';
  ctxB.lineWidth = 1.4;
  for (let i = 0; i < 12; i++) {
    let cx = rng() * size;
    let cy = rng() * size;
    ctxB.beginPath();
    ctxB.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += (rng() - 0.5) * 32;
      cy += (rng() - 0.5) * 32;
      ctxB.lineTo(cx, cy);
    }
    ctxB.stroke();
  }

  return {
    doubleMap: finalizeTex(cDouble, true, anisotropy, 1, 1),
    dottedMap: finalizeTex(cDotted, true, anisotropy, 1, 1),
    roughness: finalizeTex(cRough, false, anisotropy, 1, 1),
    bump: finalizeTex(cBump, false, anisotropy, 1, 1),
  };
}

// Rich Dark Rain-Soaked Grass & Damp Earth Terrain (ZERO Snow!)
function buildWetGrassGroundTextures(anisotropy: number) {
  const size = 512;
  const [cCol, ctxC] = makeCanvas(size, size);
  const [cBump, ctxB] = makeCanvas(size, size);
  const rng = mulberry32(9102);

  // Deep rain-drenched Russian dark pine-forest grass & damp soil
  ctxC.fillStyle = '#142016';
  ctxC.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  // Organic damp earth & lush dark wet grass patches
  for (let i = 0; i < 130; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 18 + rng() * 64;
    const isMud = rng() < 0.28;
    const g = ctxC.createRadialGradient(x, y, 2, x, y, r);
    if (isMud) {
      g.addColorStop(0, 'rgba(34,27,20,0.58)');
      g.addColorStop(1, 'rgba(34,27,20,0)');
    } else {
      g.addColorStop(0, 'rgba(26,46,28,0.52)');
      g.addColorStop(1, 'rgba(26,46,28,0)');
    }
    ctxC.fillStyle = g;
    ctxC.beginPath();
    ctxC.arc(x, y, r, 0, Math.PI * 2);
    ctxC.fill();

    const gb = ctxB.createRadialGradient(x, y, 2, x, y, r);
    gb.addColorStop(0, isMud ? 'rgba(65,65,65,0.45)' : 'rgba(165,165,165,0.42)');
    gb.addColorStop(1, 'rgba(128,128,128,0)');
    ctxB.fillStyle = gb;
    ctxB.beginPath();
    ctxB.arc(x, y, r, 0, Math.PI * 2);
    ctxB.fill();
  }

  // Fine dark blades of wet grass
  for (let i = 0; i < 11000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const gVal = Math.floor(24 + rng() * 34);
    ctxC.fillStyle = `rgba(${Math.floor(gVal * 0.65)},${gVal},${Math.floor(gVal * 0.6)},0.48)`;
    ctxC.fillRect(x, y, 2, 3);
  }

  return {
    map: finalizeTex(cCol, true, anisotropy, 36, 36),
    bump: finalizeTex(cBump, false, anisotropy, 36, 36),
  };
}

function buildWeatheredConcrete(anisotropy: number) {
  const size = 256;
  const [cCol, ctxC] = makeCanvas(size, size);
  const [cBump, ctxB] = makeCanvas(size, size);
  const rng = mulberry32(3310);

  ctxC.fillStyle = '#757d85';
  ctxC.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  ctxC.strokeStyle = 'rgba(30,34,38,0.45)';
  ctxC.lineWidth = 2;
  ctxB.strokeStyle = 'rgba(30,30,30,0.8)';
  ctxB.lineWidth = 2;
  for (let i = 0; i <= size; i += 64) {
    ctxC.beginPath();
    ctxC.moveTo(i, 0);
    ctxC.lineTo(i, size);
    ctxC.stroke();
    ctxC.beginPath();
    ctxC.moveTo(0, i);
    ctxC.lineTo(size, i);
    ctxC.stroke();

    ctxB.beginPath();
    ctxB.moveTo(i, 0);
    ctxB.lineTo(i, size);
    ctxB.stroke();
    ctxB.beginPath();
    ctxB.moveTo(0, i);
    ctxB.lineTo(size, i);
    ctxB.stroke();
  }

  for (let i = 0; i < 3500; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const v = Math.floor(90 + rng() * 55);
    ctxC.fillStyle = `rgba(${v},${v + 2},${v + 4},0.35)`;
    ctxC.fillRect(x, y, 2, 2);
  }

  return {
    map: finalizeTex(cCol, true, anisotropy, 2, 2),
    bump: finalizeTex(cBump, false, anisotropy, 2, 2),
  };
}

// 16 Richly Differentiated Russian Architectural Facades (Imperial St. Petersburg, Stalinist Brick, Soviet Panelkas, Brutalist, Industrial)
interface FacadePalette {
  wall: string;
  trim: string;
  seam: string;
  accent?: string;
  rows: number;
  cols: number;
  warmChance: number;
  pattern: 'brick' | 'plaster' | 'panel' | 'corrugated' | 'concrete';
  archedWindows?: boolean;
  balconies?: boolean;
  storefront?: boolean;
}

const FACADE_PALETTES: Record<BuildingStyle, FacadePalette> = {
  commercial_brick: {
    wall: '#784638',
    trim: '#c9bba8',
    seam: '#42251d',
    accent: '#9a5846',
    rows: 6,
    cols: 6,
    warmChance: 0.62,
    pattern: 'brick',
    archedWindows: true,
    storefront: true,
  },
  commercial_ochre: {
    wall: '#b89454', // Classic St. Petersburg Imperial Ochre
    trim: '#e2dcd0',
    seam: '#7d6233',
    accent: '#d2ae6c',
    rows: 5,
    cols: 6,
    warmChance: 0.65,
    pattern: 'plaster',
    archedWindows: true,
    storefront: true,
  },
  commercial_mint: {
    wall: '#6e8c7e', // Heritage Russian Neoclassical Sage/Mint Plaster
    trim: '#dedcd5',
    seam: '#475c52',
    accent: '#87a698',
    rows: 5,
    cols: 5,
    warmChance: 0.58,
    pattern: 'plaster',
    archedWindows: true,
    storefront: true,
  },
  commercial_burgundy: {
    wall: '#643238', // Deep Merchant Terracotta-Burgundy Brick
    trim: '#cbbca9',
    seam: '#381a1e',
    accent: '#804148',
    rows: 6,
    cols: 6,
    warmChance: 0.6,
    pattern: 'brick',
    storefront: true,
  },
  commercial_cream: {
    wall: '#b5ab98', // Stalinist Sandstone/Cream Stucco
    trim: '#ddd6c7',
    seam: '#756e61',
    rows: 6,
    cols: 6,
    warmChance: 0.56,
    pattern: 'plaster',
    storefront: true,
  },
  commercial_slate: {
    wall: '#3a4858', // Northern Baltic Slate-Blue Facade
    trim: '#9aa4ae',
    seam: '#222c36',
    rows: 6,
    cols: 5,
    warmChance: 0.58,
    pattern: 'plaster',
    archedWindows: true,
    storefront: true,
  },
  brick_apt_red: {
    wall: '#6e322a', // Classic Russian Red-Brick Apartment Building
    trim: '#b2a696',
    seam: '#381814',
    accent: '#8a4035',
    rows: 7,
    cols: 7,
    warmChance: 0.56,
    pattern: 'brick',
    balconies: true,
  },
  brick_apt_terracotta: {
    wall: '#844b36', // Warm Terracotta Clay Brick Tenement Flats
    trim: '#bfb4a2',
    seam: '#48281c',
    accent: '#9c5b43',
    rows: 6,
    cols: 7,
    warmChance: 0.52,
    pattern: 'brick',
    balconies: true,
    archedWindows: true,
  },
  brick_apt_dark: {
    wall: '#4a2d29', // Soot-Weathered Dark Brown-Red Brick Apartment Block
    trim: '#8e867c',
    seam: '#241513',
    accent: '#633c36',
    rows: 8,
    cols: 7,
    warmChance: 0.5,
    pattern: 'brick',
    balconies: true,
  },
  panelka_grey: {
    wall: '#7b838a',
    trim: '#5c636a',
    seam: '#43494f',
    rows: 8,
    cols: 8,
    warmChance: 0.44,
    pattern: 'panel',
    balconies: true,
  },
  panelka_sand: {
    wall: '#9f8f72', // Warm Soviet ochre-sandstone prefab panel
    trim: '#756953',
    seam: '#544b3c',
    rows: 8,
    cols: 8,
    warmChance: 0.48,
    pattern: 'panel',
    balconies: true,
  },
  panelka_teal: {
    wall: '#5e797d', // Soviet turquoise-grey ceramic tile panelka
    trim: '#465b5e',
    seam: '#324245',
    rows: 8,
    cols: 8,
    warmChance: 0.45,
    pattern: 'panel',
    balconies: true,
  },
  panelka_rose: {
    wall: '#8c6966', // Faded Soviet dusty-rose brick/panel block
    trim: '#694d4b',
    seam: '#4a3533',
    rows: 7,
    cols: 7,
    warmChance: 0.46,
    pattern: 'panel',
    balconies: true,
  },
  panelka_cobalt: {
    wall: '#68798f', // Soviet blue-white geometric Brezhnevka mosaic
    trim: '#c9d0d8',
    seam: '#424e5e',
    accent: '#3e5d84',
    rows: 9,
    cols: 8,
    warmChance: 0.45,
    pattern: 'panel',
    balconies: true,
  },
  military_bunker: {
    wall: '#545b56',
    trim: '#3a3f3c',
    seam: '#272b28',
    rows: 3,
    cols: 6,
    warmChance: 0.25,
    pattern: 'concrete',
  },
  prison_block: {
    wall: '#5c6166',
    trim: '#3f4348',
    seam: '#2b2e32',
    rows: 5,
    cols: 10,
    warmChance: 0.34,
    pattern: 'concrete',
  },
  industrial_warehouse: {
    wall: '#694034', // Sooty Russian red factory brick
    trim: '#494e54',
    seam: '#331e18',
    rows: 4,
    cols: 6,
    warmChance: 0.4,
    pattern: 'brick',
  },
  dock_shed: {
    wall: '#4d5d6b', // Corrugated maritime steel shed
    trim: '#36424d',
    seam: '#262f38',
    rows: 3,
    cols: 8,
    warmChance: 0.32,
    pattern: 'corrugated',
  },
  industrial_concrete: {
    wall: '#6d706b', // Heavy weathered concrete depot/silo
    trim: '#4c4f4a',
    seam: '#343633',
    rows: 4,
    cols: 6,
    warmChance: 0.3,
    pattern: 'concrete',
  },
};

function buildFacadeMaterial(
  style: BuildingStyle,
  indexSeed: number,
  anisotropy: number,
  emissiveList: THREE.MeshStandardMaterial[]
): BuildingMaterialSet {
  const w = 512;
  const h = 512;
  const [cAlb, ctxA] = makeCanvas(w, h);
  const [cEmi, ctxE] = makeCanvas(w, h);
  const [cBmp, ctxB] = makeCanvas(w, h);
  const rng = mulberry32(1000 + indexSeed * 137);

  const p = FACADE_PALETTES[style];
  ctxA.fillStyle = p.wall;
  ctxA.fillRect(0, 0, w, h);
  ctxE.fillStyle = '#000000';
  ctxE.fillRect(0, 0, w, h);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, w, h);

  // Surface Material Grain & Masonry Pattern
  if (p.pattern === 'brick') {
    for (let y = 0; y < h; y += 8) {
      const offset = (y / 8) % 2 === 0 ? 0 : 12;
      for (let x = -12; x < w; x += 24) {
        const shade = (rng() - 0.5) * 28;
        ctxA.fillStyle = `rgba(${shade > 0 ? 225 : 18}, ${shade > 0 ? 190 : 10}, ${shade > 0 ? 165 : 8}, ${Math.abs(shade) / 120})`;
        ctxA.fillRect(x + offset, y, 22, 6);
      }
      ctxA.fillStyle = 'rgba(28,18,14,0.24)';
      ctxA.fillRect(0, y + 7, w, 1);
      ctxB.fillStyle = 'rgba(52,52,52,0.5)';
      ctxB.fillRect(0, y + 7, w, 1);
    }
  } else if (p.pattern === 'corrugated') {
    for (let x = 0; x < w; x += 8) {
      ctxA.fillStyle = x % 16 === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)';
      ctxA.fillRect(x, 0, 4, h);
      ctxB.fillStyle = x % 16 === 0 ? '#b0b0b0' : '#505050';
      ctxB.fillRect(x, 0, 4, h);
    }
  } else if (p.pattern === 'plaster') {
    // Russian classical stucco with subtle stone rustication on lower floors & pilasters
    for (let i = 0; i < 5500; i++) {
      const x = rng() * w;
      const y = rng() * h;
      ctxA.fillStyle = rng() > 0.5 ? 'rgba(255,252,245,0.08)' : 'rgba(24,22,20,0.08)';
      ctxA.fillRect(x, y, 4, 4);
    }
    // Decorative neoclassical pilasters between window columns
    const colW = w / p.cols;
    for (let c = 0; c <= p.cols; c++) {
      const px = c * colW;
      ctxA.fillStyle = p.trim;
      ctxA.fillRect(px - 4, 0, 8, h);
      ctxB.fillStyle = '#c4c4c4';
      ctxB.fillRect(px - 4, 0, 8, h);
    }
  } else {
    // Concrete / Panelka weathering
    for (let i = 0; i < 6500; i++) {
      const x = rng() * w;
      const y = rng() * h;
      ctxA.fillStyle = rng() > 0.5 ? 'rgba(225,230,235,0.09)' : 'rgba(18,22,26,0.11)';
      ctxA.fillRect(x, y, 3, 3);
    }
  }

  // Horizontal cornices & prefab panel joints
  const rowH = h / p.rows;
  const colW = w / p.cols;
  for (let r = 0; r <= p.rows; r++) {
    const y = Math.floor(r * rowH);
    ctxA.fillStyle = p.seam;
    ctxA.fillRect(0, y, w, 3);
    ctxA.fillStyle = p.trim;
    ctxA.fillRect(0, y + 3, w, p.pattern === 'plaster' ? 6 : 3);
    ctxB.fillStyle = '#363636';
    ctxB.fillRect(0, y, w, 3);
    ctxB.fillStyle = '#b8b8b8';
    ctxB.fillRect(0, y + 3, w, 4);
  }
  if (p.pattern === 'panel' || p.pattern === 'concrete') {
    for (let c = 0; c <= p.cols; c++) {
      const x = Math.floor(c * colW);
      ctxA.fillStyle = p.seam;
      ctxA.fillRect(x, 0, 2, h);
      ctxB.fillStyle = '#3e3e3e';
      ctxB.fillRect(x, 0, 2, h);
    }
  }

  // Soviet Brezhnevka accent stripe for cobalt panelka
  if (style === 'panelka_cobalt' && p.accent) {
    ctxA.fillStyle = p.accent;
    ctxA.fillRect(0, 0, w, rowH * 0.45);
    ctxA.fillRect(0, h - rowH * 1.15, w, rowH * 0.25);
  }

  // Winter rain & soot weathering streaks
  for (let i = 0; i < 38; i++) {
    const sx = rng() * w;
    const sy = Math.floor(rng() * p.rows) * rowH;
    const sh = 18 + rng() * 52;
    const g = ctxA.createLinearGradient(sx, sy, sx, sy + sh);
    g.addColorStop(0, 'rgba(18,22,26,0.34)');
    g.addColorStop(1, 'rgba(18,22,26,0)');
    ctxA.fillStyle = g;
    ctxA.fillRect(sx, sy, 3 + rng() * 7, sh);
  }

  // Windows, Arched Pediments, Balconies, Prison Bars & Glowing Cyrillic Storefronts
  for (let r = 0; r < p.rows; r++) {
    const isGround = r === p.rows - 1;
    for (let c = 0; c < p.cols; c++) {
      const cellX = c * colW;
      const cellY = r * rowH;

      if (isGround && p.storefront) {
        ctxA.fillStyle = '#262b30';
        ctxA.fillRect(cellX + 4, cellY + 6, colW - 8, rowH - 10);

        const litShop = rng() < 0.86;
        ctxA.fillStyle = litShop ? '#8e7c5a' : '#192028';
        ctxA.fillRect(cellX + 8, cellY + 18, colW - 16, rowH - 26);
        if (litShop) {
          ctxE.fillStyle = rng() < 0.72 ? '#ffca82' : '#9ee2ff';
          ctxE.fillRect(cellX + 8, cellY + 18, colW - 16, rowH - 26);
        }

        const signColors = ['#1c5e3a', '#7c241f', '#20446c', '#8a581c', '#5e2b58'];
        const signColor = signColors[(c + indexSeed + Math.floor(rng() * 5)) % signColors.length];
        ctxA.fillStyle = signColor;
        ctxA.fillRect(cellX + 6, cellY + 5, colW - 12, 11);
        ctxE.fillStyle =
          signColor === '#1c5e3a'
            ? '#3ae08c'
            : signColor === '#7c241f'
            ? '#ff6b5a'
            : '#ffd47e';
        ctxE.fillRect(cellX + 10, cellY + 8, colW - 20, 5);
        continue;
      }

      const padX = style === 'prison_block' ? colW * 0.28 : colW * 0.21;
      const padY = style === 'military_bunker' ? rowH * 0.36 : rowH * 0.21;
      const winW = colW - padX * 2;
      const winH = style === 'military_bunker' ? rowH * 0.22 : rowH - padY * 2;
      const wx = cellX + padX;
      const wy = cellY + padY;

      // Decorative window casing / arched pediment
      ctxA.fillStyle = p.trim;
      ctxA.fillRect(wx - 4, wy - 4, winW + 8, winH + 8);
      if (p.archedWindows) {
        ctxA.beginPath();
        ctxA.arc(wx + winW * 0.5, wy, winW * 0.52, Math.PI, 0);
        ctxA.fill();
      }
      // Snow resting on window sill
      ctxA.fillStyle = '#d0dae4';
      ctxA.fillRect(wx - 5, wy + winH + 2, winW + 10, 4);

      // Dark glazed interior
      ctxA.fillStyle = '#17202a';
      ctxA.fillRect(wx, wy, winW, winH);
      ctxB.fillStyle = '#242424';
      ctxB.fillRect(wx, wy, winW, winH);

      if (rng() < p.warmChance) {
        const temp = rng();
        const emiCol =
          temp < 0.62
            ? '#ffb969'
            : temp < 0.85
            ? '#ffe0a8'
            : '#8fc6ea';
        ctxE.fillStyle = emiCol;
        ctxE.fillRect(wx + 2, wy + 2, winW - 4, winH - 4);
        if (rng() < 0.45) {
          ctxE.fillStyle = 'rgba(0,0,0,0.45)';
          ctxE.fillRect(wx + 2, wy + 2, (winW - 4) * 0.35, winH - 4);
        }
        ctxA.fillStyle = '#484339';
        ctxA.fillRect(wx + 2, wy + 2, winW - 4, winH - 4);
      }

      // Mullions / prison bars
      ctxA.fillStyle = '#2b3138';
      ctxE.fillStyle = '#000000';
      if (style === 'prison_block') {
        for (let bx = wx + 5; bx < wx + winW - 3; bx += 6) {
          ctxA.fillRect(bx, wy, 2, winH);
          ctxE.fillRect(bx, wy, 2, winH);
        }
      } else {
        ctxA.fillRect(wx + winW * 0.5 - 1, wy, 2, winH);
        ctxA.fillRect(wx, wy + winH * 0.38, winW, 2);
        ctxE.fillRect(wx + winW * 0.5 - 1, wy, 2, winH);
        ctxE.fillRect(wx, wy + winH * 0.38, winW, 2);
      }

      // Soviet Panelka balconies
      if (p.balconies && c % 2 === 1 && r > 0 && !isGround) {
        ctxA.fillStyle = p.trim;
        ctxA.fillRect(wx - 6, wy + winH * 0.44, winW + 12, winH * 0.62);
        ctxA.fillStyle = '#d4dde8';
        ctxA.fillRect(wx - 6, wy + winH * 0.44, winW + 12, 3);
        ctxE.fillStyle = '#000000';
        ctxE.fillRect(wx - 6, wy + winH * 0.44, winW + 12, winH * 0.62);
        ctxB.fillStyle = '#e0e0e0';
        ctxB.fillRect(wx - 6, wy + winH * 0.44, winW + 12, winH * 0.62);
      }
    }
  }

  // Rain-soaked dark masonry moisture along building base (zero snow!)
  const baseGrad = ctxA.createLinearGradient(0, h - 32, 0, h);
  baseGrad.addColorStop(0, 'rgba(10,14,18,0)');
  baseGrad.addColorStop(1, 'rgba(8,10,14,0.68)');
  ctxA.fillStyle = baseGrad;
  ctxA.fillRect(0, h - 32, w, 32);

  const map = finalizeTex(cAlb, true, anisotropy, 1, 1);
  const emiMap = finalizeTex(cEmi, true, anisotropy, 1, 1);
  const bmpMap = finalizeTex(cBmp, false, anisotropy, 1, 1);

  const sideMat = new THREE.MeshStandardMaterial({
    map,
    emissiveMap: emiMap,
    emissive: new THREE.Color('#ffbe78'),
    emissiveIntensity: 0.85,
    bumpMap: bmpMap,
    bumpScale: 0.36,
    roughness: p.pattern === 'corrugated' ? 0.48 : 0.78,
    metalness: p.pattern === 'corrugated' ? 0.42 : 0.08,
  });
  emissiveList.push(sideMat);

  // Dark rain-drenched tar & gravel rooftop (zero white snow!)
  const [cRoof, ctxRoof] = makeCanvas(256, 256);
  ctxRoof.fillStyle = '#1b1f25';
  ctxRoof.fillRect(0, 0, 256, 256);
  ctxRoof.strokeStyle = 'rgba(42,48,56,0.5)';
  ctxRoof.lineWidth = 4;
  ctxRoof.strokeRect(4, 4, 248, 248);
  for (let i = 0; i < 1200; i++) {
    const v = Math.floor(20 + rng() * 26);
    ctxRoof.fillStyle = `rgba(${v},${v + 2},${v + 5},0.5)`;
    ctxRoof.fillRect(rng() * 256, rng() * 256, 4, 4);
  }
  const roofMap = finalizeTex(cRoof, true, anisotropy, 1, 1);
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofMap,
    roughness: 0.65,
    metalness: 0.12,
  });

  return { side: sideMat, roof: roofMat };
}

function buildCathedralTextures(anisotropy: number) {
  const [cW, ctxW] = makeCanvas(256, 256);
  ctxW.fillStyle = '#c8c2b4';
  ctxW.fillRect(0, 0, 256, 256);
  ctxW.fillStyle = '#8b3c32';
  ctxW.fillRect(0, 12, 256, 16);
  ctxW.fillRect(0, 122, 256, 12);
  ctxW.fillStyle = '#b49246';
  ctxW.fillRect(0, 28, 256, 5);
  for (let x = 22; x < 256; x += 64) {
    ctxW.fillStyle = '#242a34';
    ctxW.fillRect(x, 48, 20, 56);
    ctxW.beginPath();
    ctxW.arc(x + 10, 48, 10, Math.PI, 0);
    ctxW.fill();
    ctxW.strokeStyle = '#d4c9a8';
    ctxW.lineWidth = 3;
    ctxW.strokeRect(x - 2, 48, 24, 56);
  }
  const wallMap = finalizeTex(cW, true, anisotropy, 2, 1);

  const [cG, ctxG] = makeCanvas(256, 256);
  ctxG.fillStyle = '#cfa03a';
  ctxG.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 256; x += 16) {
      ctxG.strokeStyle = 'rgba(110,72,12,0.45)';
      ctxG.beginPath();
      ctxG.arc(x + ((y / 16) % 2) * 8, y, 8, 0, Math.PI);
      ctxG.stroke();
    }
  }
  const domeGoldMap = finalizeTex(cG, true, anisotropy, 3, 3);

  const [cB, ctxB] = makeCanvas(256, 256);
  ctxB.fillStyle = '#1d365c';
  ctxB.fillRect(0, 0, 256, 256);
  ctxB.fillStyle = '#e5bc55';
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 32) {
      ctxB.beginPath();
      ctxB.arc(x + ((y / 32) % 2) * 16, y, 3, 0, Math.PI * 2);
      ctxB.fill();
    }
  }
  const domeBlueMap = finalizeTex(cB, true, anisotropy, 2, 2);

  return { wallMap, domeGoldMap, domeBlueMap };
}

function buildContainerTextures(anisotropy: number): THREE.CanvasTexture[] {
  const colors = ['#7c3128', '#27445e', '#3c533c', '#8c692b'];
  return colors.map((col, idx) => {
    const [c, ctx] = makeCanvas(256, 128);
    const rng = mulberry32(5500 + idx * 17);
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, 256, 128);
    for (let x = 0; x < 256; x += 10) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, 6, 4, 116);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 4, 6, 2, 116);
    }
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = rng() > 0.35 ? 'rgba(92,42,18,0.32)' : 'rgba(200,212,224,0.28)';
      ctx.fillRect(rng() * 256, rng() * 128, 6 + rng() * 18, 4 + rng() * 16);
    }
    ctx.fillStyle = 'rgba(235,235,230,0.68)';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`MSKU ${4012 + idx * 318}`, 16, 30);
    return finalizeTex(c, true, anisotropy, 1, 1);
  });
}

function buildCarTextures(anisotropy: number) {
  const size = 512;
  const [cPaint, ctxP] = makeCanvas(size, size);
  const [cRough, ctxR] = makeCanvas(size, size);
  const rng = mulberry32(7771);

  // Deep Gloss Obsidian Charcoal Metallic Paint (calibrated so sculpted curves shine at night without crushing to flat #000)
  const grad = ctxP.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#18202c');
  grad.addColorStop(0.45, '#11161f');
  grad.addColorStop(0.82, '#161c26');
  grad.addColorStop(1, '#202630');
  ctxP.fillStyle = grad;
  ctxP.fillRect(0, 0, size, size);

  ctxR.fillStyle = '#242424';
  ctxR.fillRect(0, 0, size, size);
  const gradR = ctxR.createLinearGradient(0, size * 0.78, 0, size);
  gradR.addColorStop(0, 'rgba(36,36,36,0)');
  gradR.addColorStop(1, 'rgba(115,115,115,0.55)');
  ctxR.fillStyle = gradR;
  ctxR.fillRect(0, size * 0.78, size, size * 0.22);

  // Ultra-fine metallic charcoal-sapphire pearl flake
  for (let i = 0; i < 8000; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const a = 0.03 + rng() * 0.055;
    ctxP.fillStyle = `rgba(135,170,210,${a})`;
    ctxP.fillRect(x, y, 1.2, 1.2);
  }

  // Subtle wet rain-sheen streaks along clearcoat roughness (organic flow, no chunky dots!)
  for (let i = 0; i < 240; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const len = 10 + rng() * 28;
    ctxR.strokeStyle = 'rgba(10,10,10,0.45)';
    ctxR.lineWidth = 1.1;
    ctxR.beginPath();
    ctxR.moveTo(x, y);
    ctxR.lineTo(x + (rng() - 0.5) * 3, y + len);
    ctxR.stroke();
  }

  // Smooth neutral-white metallic automotive paint map for ALL traffic cars (tinted per-vehicle via material.color!)
  const [cTP, ctxTP] = makeCanvas(256, 256);
  const [cTR, ctxTR] = makeCanvas(256, 256);
  const tGrad = ctxTP.createLinearGradient(0, 0, 0, 256);
  tGrad.addColorStop(0, '#f4f7fa');
  tGrad.addColorStop(0.55, '#dfe5ec');
  tGrad.addColorStop(0.86, '#cfd6de');
  tGrad.addColorStop(1, '#aeb6bf');
  ctxTP.fillStyle = tGrad;
  ctxTP.fillRect(0, 0, 256, 256);
  // Subtle crisp automotive panel seams & trim creases
  ctxTP.strokeStyle = 'rgba(20,26,34,0.22)';
  ctxTP.lineWidth = 2;
  ctxTP.strokeRect(8, 8, 240, 240);
  ctxTP.beginPath();
  ctxTP.moveTo(0, 128);
  ctxTP.lineTo(256, 128);
  ctxTP.stroke();
  for (let i = 0; i < 3200; i++) {
    const v = 215 + Math.floor(rng() * 40);
    ctxTP.fillStyle = `rgba(${v},${v},${v},0.14)`;
    ctxTP.fillRect(rng() * 256, rng() * 256, 1.3, 1.3);
  }

  ctxTR.fillStyle = '#383838';
  ctxTR.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 140; i++) {
    const x = rng() * 256;
    const y = rng() * 256;
    ctxTR.strokeStyle = 'rgba(16,16,16,0.5)';
    ctxTR.lineWidth = 1.2;
    ctxTR.beginPath();
    ctxTR.moveTo(x, y);
    ctxTR.lineTo(x + (rng() - 0.5) * 2, y + 12 + rng() * 24);
    ctxTR.stroke();
  }

  // Ribbed weathered metallic cargo trailer texture for freight trucks
  const [cCargo, ctxCg] = makeCanvas(256, 128);
  ctxCg.fillStyle = '#b8c0c8';
  ctxCg.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 8) {
    ctxCg.fillStyle = 'rgba(0,0,0,0.18)';
    ctxCg.fillRect(x, 6, 3, 116);
    ctxCg.fillStyle = 'rgba(255,255,255,0.12)';
    ctxCg.fillRect(x + 3, 6, 2, 116);
  }
  ctxCg.fillStyle = '#1e2836';
  ctxCg.fillRect(0, 108, 256, 14);
  ctxCg.fillStyle = '#f59e0b';
  for (let x = 10; x < 256; x += 28) {
    ctxCg.fillRect(x, 112, 14, 5);
  }

  const [cTire, ctxT] = makeCanvas(256, 256);
  ctxT.fillStyle = '#181a1d';
  ctxT.fillRect(0, 0, 256, 256);
  ctxT.strokeStyle = '#0c0d0f';
  ctxT.lineWidth = 6;
  for (let y = 0; y < 256; y += 22) {
    ctxT.beginPath();
    ctxT.moveTo(0, y);
    ctxT.lineTo(128, y + 14);
    ctxT.lineTo(256, y);
    ctxT.stroke();
    ctxT.strokeStyle = 'rgba(180,192,205,0.22)';
    ctxT.lineWidth = 2;
    ctxT.beginPath();
    ctxT.moveTo(20, y + 3);
    ctxT.lineTo(128, y + 16);
    ctxT.lineTo(236, y + 3);
    ctxT.stroke();
    ctxT.strokeStyle = '#0c0d0f';
    ctxT.lineWidth = 6;
  }

  const [cPlate, ctxPl] = makeCanvas(256, 64);
  ctxPl.fillStyle = '#e6e8eb';
  ctxPl.fillRect(0, 0, 256, 64);
  ctxPl.strokeStyle = '#111111';
  ctxPl.lineWidth = 4;
  ctxPl.strokeRect(3, 3, 250, 58);
  ctxPl.beginPath();
  ctxPl.moveTo(192, 4);
  ctxPl.lineTo(192, 60);
  ctxPl.stroke();
  ctxPl.fillStyle = '#111111';
  ctxPl.font = 'bold 34px monospace';
  ctxPl.fillText('A 774 MP', 14, 44);
  ctxPl.font = 'bold 24px monospace';
  ctxPl.fillText('78', 204, 30);
  ctxPl.font = 'bold 12px sans-serif';
  ctxPl.fillText('RUS', 198, 52);
  ctxPl.fillStyle = '#ffffff';
  ctxPl.fillRect(228, 39, 18, 4);
  ctxPl.fillStyle = '#1d4ed8';
  ctxPl.fillRect(228, 43, 18, 4);
  ctxPl.fillStyle = '#dc2626';
  ctxPl.fillRect(228, 47, 18, 4);

  // Crisp automotive panel-seam & fine brushed metallic micro-grain bump maps for Hero & Traffic cars!
  const [cCarBump, ctxCB] = makeCanvas(512, 512);
  ctxCB.fillStyle = '#808080';
  ctxCB.fillRect(0, 0, 512, 512);
  // Subtle sculpted panel shutlines & aerodynamic body crease grooves
  ctxCB.strokeStyle = '#3c3c3c';
  ctxCB.lineWidth = 3;
  ctxCB.strokeRect(18, 18, 476, 476);
  ctxCB.beginPath();
  ctxCB.moveTo(0, 170);
  ctxCB.lineTo(512, 170);
  ctxCB.moveTo(0, 342);
  ctxCB.lineTo(512, 342);
  ctxCB.moveTo(256, 0);
  ctxCB.lineTo(256, 512);
  ctxCB.stroke();
  ctxCB.strokeStyle = '#a4a4a4';
  ctxCB.lineWidth = 1.5;
  ctxCB.beginPath();
  ctxCB.moveTo(0, 173);
  ctxCB.lineTo(512, 173);
  ctxCB.moveTo(0, 345);
  ctxCB.lineTo(512, 345);
  ctxCB.stroke();
  for (let i = 0; i < 6500; i++) {
    const v = 120 + Math.floor(rng() * 17);
    ctxCB.fillStyle = `rgb(${v},${v},${v})`;
    ctxCB.fillRect(rng() * 512, rng() * 512, 2, 1);
  }

  const [cTBump, ctxTB] = makeCanvas(256, 256);
  ctxTB.fillStyle = '#808080';
  ctxTB.fillRect(0, 0, 256, 256);
  ctxTB.strokeStyle = '#404040';
  ctxTB.lineWidth = 2.5;
  ctxTB.strokeRect(8, 8, 240, 240);
  ctxTB.beginPath();
  ctxTB.moveTo(0, 128);
  ctxTB.lineTo(256, 128);
  ctxTB.moveTo(128, 0);
  ctxTB.lineTo(128, 256);
  ctxTB.stroke();
  for (let i = 0; i < 2400; i++) {
    const v = 118 + Math.floor(rng() * 20);
    ctxTB.fillStyle = `rgb(${v},${v},${v})`;
    ctxTB.fillRect(rng() * 256, rng() * 256, 2, 1);
  }

  // =========================================================================
  // PHOTOREALISTIC SMOKED OLED TAILLIGHT OPTICS TEXTURE (Multi-cell crimson core + prism ribs!)
  // =========================================================================
  const [cTail, ctxTl] = makeCanvas(256, 64);
  const tlBg = ctxTl.createLinearGradient(0, 0, 0, 64);
  tlBg.addColorStop(0.0, '#180205');
  tlBg.addColorStop(0.22, '#5c060e');
  tlBg.addColorStop(0.5, '#d61420');
  tlBg.addColorStop(0.78, '#5c060e');
  tlBg.addColorStop(1.0, '#140204');
  ctxTl.fillStyle = tlBg;
  ctxTl.fillRect(0, 0, 256, 64);

  // Hot luminous OLED filament core & sculpted crystalline prism ribs
  const coreGrad = ctxTl.createLinearGradient(0, 16, 0, 48);
  coreGrad.addColorStop(0.0, 'rgba(255, 64, 48, 0.0)');
  coreGrad.addColorStop(0.32, 'rgba(255, 86, 52, 0.85)');
  coreGrad.addColorStop(0.5, 'rgba(255, 198, 128, 0.96)');
  coreGrad.addColorStop(0.68, 'rgba(255, 78, 46, 0.85)');
  coreGrad.addColorStop(1.0, 'rgba(255, 40, 32, 0.0)');
  ctxTl.fillStyle = coreGrad;
  ctxTl.fillRect(4, 16, 248, 32);

  // Fine vertical Fresnel lens micro-flutes + sculpted dark divider blades
  for (let x = 0; x < 256; x += 4) {
    ctxTl.fillStyle = x % 8 === 0 ? 'rgba(255,220,190,0.16)' : 'rgba(18,0,4,0.34)';
    ctxTl.fillRect(x, 4, 2, 56);
  }
  for (let seg = 1; seg < 8; seg++) {
    const sx = seg * 32;
    ctxTl.fillStyle = 'rgba(12, 2, 4, 0.72)';
    ctxTl.fillRect(sx - 2, 2, 4, 60);
  }
  // Smoked outer polycarbonate bevel border
  ctxTl.strokeStyle = 'rgba(10, 2, 4, 0.88)';
  ctxTl.lineWidth = 5;
  ctxTl.strokeRect(2.5, 2.5, 251, 59);

  // =========================================================================
  // 2x2 TWILL CARBON FIBER WEAVE TEXTURE (Aero splitters, diffusers, mirrors!)
  // =========================================================================
  const [cCarb, ctxCb] = makeCanvas(128, 128);
  ctxCb.fillStyle = '#11151b';
  ctxCb.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const diag = ((x + y) / 8) % 2 === 0;
      const g = ctxCb.createLinearGradient(x, y, x + 8, y + 8);
      if (diag) {
        g.addColorStop(0, '#2a313c');
        g.addColorStop(0.5, '#191f28');
        g.addColorStop(1, '#0d1015');
      } else {
        g.addColorStop(0, '#0f1318');
        g.addColorStop(0.5, '#222833');
        g.addColorStop(1, '#12161d');
      }
      ctxCb.fillStyle = g;
      ctxCb.fillRect(x, y, 7, 7);
    }
  }

  return {
    paintMap: finalizeTex(cPaint, true, anisotropy, 1, 1),
    paintRoughness: finalizeTex(cRough, false, anisotropy, 1, 1),
    bodyBump: finalizeTex(cCarBump, false, anisotropy, 1, 1),
    trafficPaintMap: finalizeTex(cTP, true, anisotropy, 1, 1),
    trafficPaintRoughness: finalizeTex(cTR, false, anisotropy, 1, 1),
    trafficBump: finalizeTex(cTBump, false, anisotropy, 1, 1),
    truckCargoMap: finalizeTex(cCargo, true, anisotropy, 1, 1),
    tireMap: finalizeTex(cTire, true, anisotropy, 1, 4),
    plateMap: finalizeTex(cPlate, true, anisotropy, 1, 1),
    tailLightMap: finalizeTex(cTail, true, anisotropy, 1, 1),
    carbonWeaveMap: finalizeTex(cCarb, true, anisotropy, 4, 4),
  };
}

function buildUtilitySprites(anisotropy: number) {
  const [cShad, ctxS] = makeCanvas(128, 128);
  const gs = ctxS.createRadialGradient(64, 64, 14, 64, 64, 62);
  gs.addColorStop(0, 'rgba(4,7,11,0.88)');
  gs.addColorStop(0.58, 'rgba(4,7,11,0.52)');
  gs.addColorStop(1, 'rgba(4,7,11,0)');
  ctxS.fillStyle = gs;
  ctxS.fillRect(0, 0, 128, 128);

  // Soft natural water-mist puff sprite (NO hard glowing blue bead!)
  const [cDrop, ctxDr] = makeCanvas(64, 64);
  const gdr = ctxDr.createRadialGradient(32, 32, 1, 32, 32, 30);
  gdr.addColorStop(0, 'rgba(210,224,236,0.42)');
  gdr.addColorStop(0.38, 'rgba(170,188,205,0.22)');
  gdr.addColorStop(0.72, 'rgba(140,160,180,0.08)');
  gdr.addColorStop(1, 'rgba(120,140,160,0)');
  ctxDr.fillStyle = gdr;
  ctxDr.fillRect(0, 0, 64, 64);

  // Crisp delicate reflective water ripple ring (subtle outer crest + tiny wet highlight core)
  const [cRip, ctxRip] = makeCanvas(128, 128);
  ctxRip.strokeStyle = 'rgba(218,232,248,0.68)';
  ctxRip.lineWidth = 2.1;
  ctxRip.beginPath();
  ctxRip.arc(64, 64, 48, 0, Math.PI * 2);
  ctxRip.stroke();
  ctxRip.strokeStyle = 'rgba(182,204,226,0.34)';
  ctxRip.lineWidth = 1.4;
  ctxRip.beginPath();
  ctxRip.arc(64, 64, 32, 0, Math.PI * 2);
  ctxRip.stroke();
  const ripCore = ctxRip.createRadialGradient(64, 64, 1, 64, 64, 14);
  ripCore.addColorStop(0, 'rgba(225,238,252,0.45)');
  ripCore.addColorStop(1, 'rgba(200,220,240,0)');
  ctxRip.fillStyle = ripCore;
  ctxRip.beginPath();
  ctxRip.arc(64, 64, 14, 0, Math.PI * 2);
  ctxRip.fill();

  // Barely-visible organic dark wet puddle silhouette (understated low-reflectivity street puddle!)
  const [cPud, ctxPud] = makeCanvas(256, 256);
  const pudGrad = ctxPud.createRadialGradient(128, 128, 18, 128, 128, 118);
  pudGrad.addColorStop(0.0, 'rgba(130, 152, 178, 0.36)');
  pudGrad.addColorStop(0.45, 'rgba(102, 124, 148, 0.24)');
  pudGrad.addColorStop(0.78, 'rgba(72, 92, 114, 0.08)');
  pudGrad.addColorStop(1.0, 'rgba(40, 56, 74, 0.0)');
  ctxPud.fillStyle = pudGrad;
  ctxPud.beginPath();
  ctxPud.ellipse(128, 128, 116, 92, 0.25, 0, Math.PI * 2);
  ctxPud.fill();
  // Subtle broken sky-streak shimmer across center of puddle
  const streakGrad = ctxPud.createLinearGradient(88, 60, 168, 196);
  streakGrad.addColorStop(0, 'rgba(180,206,232,0)');
  streakGrad.addColorStop(0.5, 'rgba(180,206,232,0.16)');
  streakGrad.addColorStop(1, 'rgba(180,206,232,0)');
  ctxPud.fillStyle = streakGrad;
  ctxPud.fillRect(72, 56, 112, 144);

  // =========================================================================
  // PURE FLOWING FABRIC 1024x1024 WOVEN WOOL/TWILL ALBEDO + BUMP + ROUGHNESS
  // Crisp diagonal twill weave, heather yarn slubs, deep organic cloth folds & tailoring!
  // =========================================================================
  const [cCloth, ctxCl] = makeCanvas(1024, 1024);
  const [cClothB, ctxClB] = makeCanvas(1024, 1024);
  const [cClothR, ctxClR] = makeCanvas(1024, 1024);
  const clRng = mulberry32(41209);

  const clGrad = ctxCl.createLinearGradient(0, 0, 0, 1024);
  clGrad.addColorStop(0.0, '#f4f5f8');
  clGrad.addColorStop(0.28, '#eaedf2');
  clGrad.addColorStop(0.68, '#d4d8e0');
  clGrad.addColorStop(1.0, '#b8bec8');
  ctxCl.fillStyle = clGrad;
  ctxCl.fillRect(0, 0, 1024, 1024);

  ctxClB.fillStyle = '#808080';
  ctxClB.fillRect(0, 0, 1024, 1024);

  // Soft matte cloth base roughness (~0.84 -> #d6d6d6) with subtle woven luster variations
  ctxClR.fillStyle = '#d4d4d4';
  ctxClR.fillRect(0, 0, 1024, 1024);

  // Fine high-density woven warp & weft yarn micro-threads
  for (let y = 0; y < 1024; y += 2) {
    const hi = y % 4 === 0;
    ctxCl.fillStyle = hi ? 'rgba(255,255,255,0.065)' : 'rgba(16,20,28,0.07)';
    ctxCl.fillRect(0, y, 1024, 1);
    ctxClB.fillStyle = hi ? 'rgba(168,168,168,0.34)' : 'rgba(92,92,92,0.34)';
    ctxClB.fillRect(0, y, 1024, 1);
  }
  for (let x = 0; x < 1024; x += 2) {
    const hi = x % 4 === 0;
    ctxCl.fillStyle = hi ? 'rgba(255,255,255,0.045)' : 'rgba(16,20,28,0.05)';
    ctxCl.fillRect(x, 0, 1, 1024);
    ctxClB.fillStyle = hi ? 'rgba(156,156,156,0.26)' : 'rgba(100,100,100,0.26)';
    ctxClB.fillRect(x, 0, 1, 1024);
  }
  // Crisp diagonal wool/gabardine twill weave ribs (albedo + bump + subtle micro-sheen roughness!)
  ctxCl.strokeStyle = 'rgba(255,255,255,0.032)';
  ctxCl.lineWidth = 1.5;
  ctxClB.strokeStyle = 'rgba(182,182,182,0.22)';
  ctxClB.lineWidth = 1.5;
  ctxClR.strokeStyle = 'rgba(188,188,188,0.28)';
  ctxClR.lineWidth = 1.5;
  for (let d = -1024; d < 1024; d += 6) {
    ctxCl.beginPath();
    ctxCl.moveTo(d, 0);
    ctxCl.lineTo(d + 1024, 1024);
    ctxCl.stroke();
    ctxClB.beginPath();
    ctxClB.moveTo(d, 0);
    ctxClB.lineTo(d + 1024, 1024);
    ctxClB.stroke();
    if (d % 12 === 0) {
      ctxClR.beginPath();
      ctxClR.moveTo(d, 0);
      ctxClR.lineTo(d + 1024, 1024);
      ctxClR.stroke();
    }
  }
  // Organic woven heather slub fibers (gives coats tactile woolen depth up close!)
  for (let i = 0; i < 24000; i++) {
    const x = clRng() * 1024;
    const y = clRng() * 1024;
    const hi = clRng() > 0.48;
    const len = 2 + clRng() * 4;
    const horiz = clRng() > 0.5;
    ctxCl.fillStyle = hi ? 'rgba(255,252,248,0.068)' : 'rgba(12,16,24,0.075)';
    ctxCl.fillRect(x, y, horiz ? len : 1.5, horiz ? 1.5 : len);
    ctxClB.fillStyle = hi ? 'rgba(184,184,184,0.32)' : 'rgba(78,78,78,0.32)';
    ctxClB.fillRect(x, y, horiz ? len : 1.5, horiz ? 1.5 : len);
    if (i % 3 === 0) {
      ctxClR.fillStyle = hi ? 'rgba(180,180,180,0.24)' : 'rgba(238,238,238,0.24)';
      ctxClR.fillRect(x, y, 2, 2);
    }
  }

  // Organic multi-scale draped fabric folds & bias tension creases (deep shadowed valleys + soft luminous crests!)
  const drawClothFold = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    depth: number
  ) => {
    const cx = (x0 + x1) * 0.5 + (clRng() - 0.5) * 48;
    const cy = (y0 + y1) * 0.5 + (clRng() - 0.5) * 34;

    ctxCl.save();
    ctxCl.strokeStyle = `rgba(10,14,22,${0.22 * depth})`;
    ctxCl.lineWidth = width;
    ctxCl.lineCap = 'round';
    ctxCl.filter = 'blur(9px)';
    ctxCl.beginPath();
    ctxCl.moveTo(x0, y0);
    ctxCl.quadraticCurveTo(cx, cy, x1, y1);
    ctxCl.stroke();

    ctxCl.strokeStyle = `rgba(255,255,255,${0.14 * depth})`;
    ctxCl.lineWidth = width * 0.56;
    ctxCl.beginPath();
    ctxCl.moveTo(x0 + width * 0.48, y0);
    ctxCl.quadraticCurveTo(cx + width * 0.48, cy, x1 + width * 0.48, y1);
    ctxCl.stroke();
    ctxCl.restore();

    ctxClB.save();
    ctxClB.filter = 'blur(9px)';
    ctxClB.lineCap = 'round';
    ctxClB.strokeStyle = `rgba(28,28,28,${0.72 * depth})`;
    ctxClB.lineWidth = width;
    ctxClB.beginPath();
    ctxClB.moveTo(x0, y0);
    ctxClB.quadraticCurveTo(cx, cy, x1, y1);
    ctxClB.stroke();
    ctxClB.strokeStyle = `rgba(234,234,234,${0.66 * depth})`;
    ctxClB.lineWidth = width * 0.64;
    ctxClB.beginPath();
    ctxClB.moveTo(x0 + width * 0.55, y0);
    ctxClB.quadraticCurveTo(cx + width * 0.55, cy, x1 + width * 0.55, y1);
    ctxClB.stroke();
    ctxClB.restore();

    // Fold valleys are slightly rougher (trapped micro-shadow), fold ridges catch soft cloth sheen!
    ctxClR.save();
    ctxClR.filter = 'blur(8px)';
    ctxClR.lineCap = 'round';
    ctxClR.strokeStyle = `rgba(248,248,248,${0.32 * depth})`;
    ctxClR.lineWidth = width;
    ctxClR.beginPath();
    ctxClR.moveTo(x0, y0);
    ctxClR.quadraticCurveTo(cx, cy, x1, y1);
    ctxClR.stroke();
    ctxClR.strokeStyle = `rgba(176,176,176,${0.28 * depth})`;
    ctxClR.lineWidth = width * 0.55;
    ctxClR.beginPath();
    ctxClR.moveTo(x0 + width * 0.52, y0);
    ctxClR.quadraticCurveTo(cx + width * 0.52, cy, x1 + width * 0.52, y1);
    ctxClR.stroke();
    ctxClR.restore();
  };

  // Vertical hanging gravity drapery pleats along coat/scarf body
  for (let k = 0; k < 14; k++) {
    const fx = 36 + k * 72 + (clRng() - 0.5) * 28;
    drawClothFold(
      fx,
      60 + clRng() * 140,
      fx + (clRng() - 0.5) * 52,
      880 + clRng() * 120,
      24 + clRng() * 20,
      0.74 + clRng() * 0.36
    );
  }
  // Natural elbow/waist/shoulder diagonal fabric tension creases
  for (let k = 0; k < 22; k++) {
    const y = 130 + clRng() * 720;
    const x = 40 + clRng() * 720;
    const dx = 130 + clRng() * 220;
    const dy = (clRng() - 0.5) * 94;
    drawClothFold(x, y, x + dx, y + dy, 15 + clRng() * 15, 0.56 + clRng() * 0.42);
  }

  // Tailored center front jacket placket + double topstitching + subtle buttons & welt pockets
  const placketGrad = ctxCl.createLinearGradient(492, 0, 532, 0);
  placketGrad.addColorStop(0, 'rgba(0,0,0,0)');
  placketGrad.addColorStop(0.5, 'rgba(12,16,24,0.32)');
  placketGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctxCl.fillStyle = placketGrad;
  ctxCl.fillRect(492, 96, 40, 888);
  ctxClB.fillStyle = '#383838';
  ctxClB.fillRect(508, 96, 8, 888);
  ctxClB.fillStyle = '#d0d0d0';
  ctxClB.fillRect(516, 96, 6, 888);

  ctxCl.strokeStyle = 'rgba(244,246,252,0.22)';
  ctxCl.setLineDash([7, 7]);
  ctxCl.lineWidth = 2.2;
  ctxCl.beginPath();
  ctxCl.moveTo(488, 108);
  ctxCl.lineTo(488, 940);
  ctxCl.moveTo(536, 108);
  ctxCl.lineTo(536, 940);
  ctxCl.moveTo(0, 912);
  ctxCl.lineTo(1024, 912);
  ctxCl.stroke();
  ctxCl.setLineDash([]);

  for (const px of [316, 632]) {
    ctxCl.fillStyle = 'rgba(10,14,22,0.26)';
    ctxCl.fillRect(px, 688, 84, 14);
    ctxClB.fillStyle = '#323232';
    ctxClB.fillRect(px, 688, 84, 12);
    ctxClB.fillStyle = '#c8c8c8';
    ctxClB.fillRect(px, 700, 84, 8);
  }

  // =========================================================================
  // ULTRA-HIGH-PRECISION 2048x1024 PHOTOREALISTIC HUMAN FACE TEXTURES
  // Exact spherical (lon, lat) pixel lock matching the 96x72 sculpted 3D head mesh!
  //   px = (0.5 + lon / (2*PI)) * 2048   |   py = (0.5 - lat / PI) * 1024
  // - pedFaceSkinMap: pure photorealistic skin/folds/lips/brows (NO ghost double eyes!)
  //   used by close-up rigged humans who have real 3D clearcoat eyeballs & eyelids!
  // - pedFaceMap: identical skin + exact-aligned painted eyes for 314 distant street pedestrians!
  // =========================================================================
  const FACE_W = 2048;
  const FACE_H = 1024;
  const [cFaceSkin, ctxFS] = makeCanvas(FACE_W, FACE_H);
  const [cFaceB, ctxFB] = makeCanvas(FACE_W, FACE_H);
  const fRng = mulberry32(73319);

  const llX = (lon: number) => (0.5 + lon / (Math.PI * 2)) * FACE_W;
  const llY = (lat: number) => (0.5 - lat / Math.PI) * FACE_H;

  // Multi-zone natural human skin base (warm luminous forehead -> rosy-peach midface -> soft jaw/neck AO)
  const fGrad = ctxFS.createLinearGradient(0, 0, 0, FACE_H);
  fGrad.addColorStop(0.0, '#f3eae2');
  fGrad.addColorStop(0.32, '#f9f1e9');
  fGrad.addColorStop(0.56, '#f3e5db');
  fGrad.addColorStop(0.78, '#e3d0c2');
  fGrad.addColorStop(1.0, '#baa294');
  ctxFS.fillStyle = fGrad;
  ctxFS.fillRect(0, 0, FACE_W, FACE_H);

  ctxFB.fillStyle = '#808080';
  ctxFB.fillRect(0, 0, FACE_W, FACE_H);

  // Ultra-fine high-frequency skin pores, micro-capillaries & organic complexion variation
  for (let i = 0; i < 52000; i++) {
    const x = fRng() * FACE_W;
    const y = fRng() * FACE_H;
    const r = fRng();
    ctxFS.fillStyle =
      r > 0.52
        ? 'rgba(206,144,122,0.055)'
        : r > 0.14
        ? 'rgba(255,248,242,0.05)'
        : 'rgba(164,108,92,0.045)';
    ctxFS.fillRect(x, y, 2, 2);
    const bv = r > 0.5 ? 112 : 144;
    ctxFB.fillStyle = `rgba(${bv},${bv},${bv},0.42)`;
    ctxFB.fillRect(x, y, 2, 2);
  }
  // Extra dense fine skin-pore micro-relief across the nose, cheeks & forehead T-zone!
  for (let i = 0; i < 16000; i++) {
    const x = llX((fRng() - 0.5) * 1.45);
    const y = llY((fRng() - 0.5) * 1.15);
    const pore = fRng() > 0.45 ? 96 : 156;
    ctxFB.fillStyle = `rgba(${pore},${pore},${pore},0.35)`;
    ctxFB.fillRect(x, y, 1.5, 1.5);
  }

  const drawFaceEllipse = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    col0: string,
    col1: string
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, col0);
    g.addColorStop(1, col1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Portrait 3-Zone Subsurface Skin Undertones (warm golden forehead, blood-rich rosy cheeks/nose/ears, cool slate jaw/under-eye!)
  drawFaceEllipse(ctxFS, llX(0), llY(0.36), 195, 76, 'rgba(255,232,196,0.20)', 'rgba(255,232,196,0)');
  drawFaceEllipse(ctxFS, llX(-0.54), llY(-0.14), 118, 68, 'rgba(216,104,94,0.24)', 'rgba(216,104,94,0)');
  drawFaceEllipse(ctxFS, llX(0.54), llY(-0.14), 118, 68, 'rgba(216,104,94,0.24)', 'rgba(216,104,94,0)');
  drawFaceEllipse(ctxFS, llX(0), llY(-0.20), 54, 48, 'rgba(214,116,104,0.20)', 'rgba(214,116,104,0)');
  drawFaceEllipse(ctxFS, llX(0), llY(-0.68), 165, 56, 'rgba(84,104,126,0.14)', 'rgba(84,104,126,0)');
  // Cheekbone specular highlights, forehead boss & chin highlight
  drawFaceEllipse(ctxFS, llX(0), llY(0.38), 140, 48, 'rgba(255,252,246,0.24)', 'rgba(255,252,246,0)');
  drawFaceEllipse(ctxFS, llX(-0.48), llY(-0.08), 76, 30, 'rgba(255,250,244,0.24)', 'rgba(255,250,244,0)');
  drawFaceEllipse(ctxFS, llX(0.48), llY(-0.08), 76, 30, 'rgba(255,250,244,0.24)', 'rgba(255,250,244,0)');
  drawFaceEllipse(ctxFS, llX(0), llY(-0.74), 52, 22, 'rgba(255,250,244,0.20)', 'rgba(255,250,244,0)');
  // Subtle natural freckles scattered softly across nose bridge & upper cheekbones
  for (let fr = 0; fr < 78; fr++) {
    const flon = (fRng() - 0.5) * 1.15;
    const flat = -0.05 - fRng() * 0.22;
    ctxFS.fillStyle = `rgba(146,92,70,${0.07 + fRng() * 0.10})`;
    ctxFS.beginPath();
    ctxFS.arc(llX(flon), llY(flat), 1.2 + fRng() * 1.6, 0, Math.PI * 2);
    ctxFS.fill();
  }

  // Subtle temple hollow & mandibular jawline sculptural ambient shading
  for (const s of [-1, 1]) {
    drawFaceEllipse(ctxFS, llX(s * 0.88), llY(0.18), 72, 118, 'rgba(86,58,48,0.20)', 'rgba(86,58,48,0)');
    drawFaceEllipse(ctxFS, llX(s * 0.64), llY(-0.42), 82, 58, 'rgba(86,56,48,0.16)', 'rgba(86,56,48,0)');
  }

  // Exact-aligned Orbital Shading, Upper Supratarsal Eyelid Crease, Tear Troughs, Crow's Feet & Fine Natural Brow Hairs!
  // Matches 3D eyeball sockets at EXACT lon = ±0.365, lat = +0.032!
  for (const s of [-1, 1]) {
    const ex = llX(s * 0.365);
    const ey = llY(0.032);
    // Soft anatomical orbital shadow (warm bronze-rose lid tone, never heavy raccoon circles!)
    drawFaceEllipse(ctxFS, ex, ey - 8, 66, 38, 'rgba(104,64,54,0.28)', 'rgba(104,64,54,0)');
    // Warm rosy vascular lid blush + inner canthus depth
    drawFaceEllipse(ctxFS, ex - s * 34, ey + 2, 22, 18, 'rgba(112,62,56,0.28)', 'rgba(112,62,56,0)');
    // Brow-bone subtle highlight just below outer brow arch
    drawFaceEllipse(ctxFS, ex + s * 14, llY(0.135), 42, 14, 'rgba(255,250,244,0.22)', 'rgba(255,250,244,0)');

    // Crisp upper supratarsal eyelid fold crease (exact match to 3D sculpted upper eyelid ridge!)
    ctxFS.strokeStyle = 'rgba(78,44,36,0.52)';
    ctxFS.lineWidth = 3.2;
    ctxFS.lineCap = 'round';
    ctxFS.beginPath();
    ctxFS.moveTo(ex - s * 42, ey - 10);
    ctxFS.quadraticCurveTo(ex + s * 2, ey - 32, ex + s * 44, ey - 6);
    ctxFS.stroke();

    ctxFB.strokeStyle = '#363636';
    ctxFB.lineWidth = 4.2;
    ctxFB.lineCap = 'round';
    ctxFB.beginPath();
    ctxFB.moveTo(ex - s * 42, ey - 10);
    ctxFB.quadraticCurveTo(ex + s * 2, ey - 32, ex + s * 44, ey - 6);
    ctxFB.stroke();

    // Soft natural lash-root ambient shadow framing the 3D eyeball aperture
    ctxFS.strokeStyle = 'rgba(42,24,20,0.48)';
    ctxFS.lineWidth = 4.5;
    ctxFS.beginPath();
    ctxFS.moveTo(ex - s * 36, ey + 2);
    ctxFS.quadraticCurveTo(ex, ey - 20, ex + s * 38, ey + 1);
    ctxFS.stroke();
    ctxFS.strokeStyle = 'rgba(84,52,46,0.34)';
    ctxFS.lineWidth = 2.6;
    ctxFS.beginPath();
    ctxFS.moveTo(ex - s * 34, ey + 3);
    ctxFS.quadraticCurveTo(ex, ey + 18, ex + s * 36, ey + 2);
    ctxFS.stroke();

    // Under-eye tear trough crease (soft diagonal contour sweeping outward under lower lid)
    ctxFS.strokeStyle = 'rgba(98,70,74,0.24)';
    ctxFS.lineWidth = 3.4;
    ctxFS.beginPath();
    ctxFS.moveTo(ex - s * 36, ey + 18);
    ctxFS.quadraticCurveTo(ex - s * 4, ey + 34, ex + s * 38, ey + 22);
    ctxFS.stroke();
    ctxFB.strokeStyle = 'rgba(78,78,78,0.52)';
    ctxFB.lineWidth = 4.0;
    ctxFB.beginPath();
    ctxFB.moveTo(ex - s * 36, ey + 18);
    ctxFB.quadraticCurveTo(ex - s * 4, ey + 34, ex + s * 38, ey + 22);
    ctxFB.stroke();

    // Delicate fine crow's feet radiating from outer eye corners
    for (let cf = -1; cf <= 1; cf++) {
      const cx0 = ex + s * 40;
      const cy0 = ey + 2 + cf * 5.0;
      const cx1 = cx0 + s * (24 - Math.abs(cf) * 4);
      const cy1 = cy0 + cf * 11.5;
      ctxFS.strokeStyle = 'rgba(96,58,48,0.22)';
      ctxFS.lineWidth = 1.6;
      ctxFS.beginPath();
      ctxFS.moveTo(cx0, cy0);
      ctxFS.quadraticCurveTo((cx0 + cx1) * 0.5, cy0 + cf * 3.5, cx1, cy1);
      ctxFS.stroke();
      ctxFB.strokeStyle = 'rgba(86,86,86,0.46)';
      ctxFB.lineWidth = 1.9;
      ctxFB.beginPath();
      ctxFB.moveTo(cx0, cy0);
      ctxFB.quadraticCurveTo((cx0 + cx1) * 0.5, cy0 + cf * 3.5, cx1, cy1);
      ctxFB.stroke();
    }

    // Fine natural multi-hair eyebrow bed (68 delicate hairs per brow aligned right at lat = +0.205!)
    const bxStart = llX(s * 0.145);
    const bxEnd = llX(s * 0.605);
    const byBase = llY(0.188);
    for (let h = 0; h < 68; h++) {
      const t = h / 67;
      const bx = THREE.MathUtils.lerp(bxStart, bxEnd, t);
      const arch = Math.sin(Math.pow(t, 0.85) * Math.PI) * 19.5;
      const by = byBase - arch + (fRng() - 0.5) * 4.2;
      const alpha = 0.22 + Math.sin(t * Math.PI) * 0.42;
      ctxFS.strokeStyle = `rgba(38,24,18,${alpha})`;
      ctxFS.lineWidth = 2.0;
      ctxFS.beginPath();
      ctxFS.moveTo(bx, by + 5.5);
      ctxFS.lineTo(bx + s * (4.5 + t * 4.0), by - 6.0 + t * 3.0);
      ctxFS.stroke();
      ctxFB.strokeStyle = 'rgba(202,202,202,0.52)';
      ctxFB.lineWidth = 2.1;
      ctxFB.beginPath();
      ctxFB.moveTo(bx, by + 5.5);
      ctxFB.lineTo(bx + s * (4.5 + t * 4.0), by - 6.0 + t * 3.0);
      ctxFB.stroke();
    }
  }

  // Exact-aligned Sculpted Nose Bridge Highlight, Lateral Planes, Alar Wing Creases & Dark Nostril Recesses!
  // Matches 3D nose tip at lon=0, lat=-0.215 and nostrils at lon=±0.105, lat=-0.255!
  drawFaceEllipse(ctxFS, llX(0), llY(-0.09), 15, 58, 'rgba(255,252,248,0.40)', 'rgba(255,252,248,0)');
  drawFaceEllipse(ctxFS, llX(0), llY(-0.215), 22, 14, 'rgba(255,252,248,0.42)', 'rgba(255,252,248,0)');
  for (const s of [-1, 1]) {
    drawFaceEllipse(ctxFS, llX(s * 0.115), llY(-0.11), 22, 54, 'rgba(96,62,50,0.24)', 'rgba(96,62,50,0)');
    // Crisp alar wing crease where nostril wing tucks into cheek
    ctxFS.strokeStyle = 'rgba(84,48,40,0.42)';
    ctxFS.lineWidth = 3.2;
    ctxFS.beginPath();
    ctxFS.arc(llX(s * 0.135), llY(-0.236), 14, s > 0 ? -0.6 : Math.PI - 0.9, s > 0 ? 1.0 : Math.PI + 0.6);
    ctxFS.stroke();
    ctxFB.strokeStyle = '#3c3c3c';
    ctxFB.lineWidth = 3.8;
    ctxFB.beginPath();
    ctxFB.arc(llX(s * 0.135), llY(-0.236), 14, s > 0 ? -0.6 : Math.PI - 0.9, s > 0 ? 1.0 : Math.PI + 0.6);
    ctxFB.stroke();

    // Realistic shadowed nostril recess
    ctxFS.fillStyle = 'rgba(42,20,16,0.68)';
    ctxFS.beginPath();
    ctxFS.ellipse(llX(s * 0.088), llY(-0.256), 12.5, 6.2, s * 0.24, 0, Math.PI * 2);
    ctxFS.fill();
    ctxFB.fillStyle = '#181818';
    ctxFB.beginPath();
    ctxFB.ellipse(llX(s * 0.088), llY(-0.256), 12.5, 6.2, s * 0.24, 0, Math.PI * 2);
    ctxFB.fill();
  }
  drawFaceEllipse(ctxFS, llX(0), llY(-0.272), 46, 16, 'rgba(84,52,42,0.34)', 'rgba(84,52,42,0)');

  // Twin Sculpted Philtrum Columns + Central Philtrum Dimple (lon = ±0.042, lat = -0.285..-0.385)
  drawFaceEllipse(ctxFS, llX(0), llY(-0.342), 9, 20, 'rgba(104,68,56,0.22)', 'rgba(104,68,56,0)');
  for (const s of [-1, 1]) {
    drawFaceEllipse(ctxFS, llX(s * 0.044), llY(-0.34), 6, 20, 'rgba(255,250,244,0.28)', 'rgba(255,250,244,0)');
    ctxFB.strokeStyle = 'rgba(196,196,196,0.52)';
    ctxFB.lineWidth = 3.2;
    ctxFB.beginPath();
    ctxFB.moveTo(llX(s * 0.036), llY(-0.288));
    ctxFB.lineTo(llX(s * 0.056), llY(-0.388));
    ctxFB.stroke();
  }

  // Exact-aligned Photorealistic Sculpted Lips (mouth corners at lon = ±0.225, parting at lat = -0.445!)
  const mouthL = llX(-0.225);
  const mouthR = llX(0.225);
  const mouthC = llX(0);
  const lipLineY = llY(-0.445);
  const upperBowY = llY(-0.392);
  const upperDipY = llY(-0.412);
  const lowerBotY = llY(-0.522);

  // Subtle upper lip white-roll highlight along Cupid's bow!
  ctxFS.strokeStyle = 'rgba(255,250,245,0.36)';
  ctxFS.lineWidth = 3.0;
  ctxFS.beginPath();
  ctxFS.moveTo(mouthL + 8, lipLineY - 2);
  ctxFS.quadraticCurveTo(llX(-0.075), upperBowY - 3, mouthC, upperDipY - 2);
  ctxFS.quadraticCurveTo(llX(0.075), upperBowY - 3, mouthR - 8, lipLineY - 2);
  ctxFS.stroke();

  const upperLipGrad = ctxFS.createLinearGradient(mouthC, upperBowY, mouthC, lipLineY + 6);
  upperLipGrad.addColorStop(0, 'rgba(162,78,74,0.68)');
  upperLipGrad.addColorStop(1, 'rgba(116,52,50,0.82)');
  ctxFS.fillStyle = upperLipGrad;
  ctxFS.beginPath();
  ctxFS.moveTo(mouthL, lipLineY);
  ctxFS.quadraticCurveTo(llX(-0.075), upperBowY, mouthC, upperDipY);
  ctxFS.quadraticCurveTo(llX(0.075), upperBowY, mouthR, lipLineY);
  ctxFS.quadraticCurveTo(mouthC, lipLineY + 7.5, mouthL, lipLineY);
  ctxFS.closePath();
  ctxFS.fill();

  const lowerLipGrad = ctxFS.createLinearGradient(mouthC, lipLineY, mouthC, lowerBotY);
  lowerLipGrad.addColorStop(0, 'rgba(166,84,78,0.64)');
  lowerLipGrad.addColorStop(0.5, 'rgba(192,108,100,0.62)');
  lowerLipGrad.addColorStop(1, 'rgba(138,70,66,0.34)');
  ctxFS.fillStyle = lowerLipGrad;
  ctxFS.beginPath();
  ctxFS.moveTo(mouthL + 5, lipLineY + 1);
  ctxFS.quadraticCurveTo(mouthC, lowerBotY, mouthR - 5, lipLineY + 1);
  ctxFS.quadraticCurveTo(mouthC, lipLineY + 6, mouthL + 5, lipLineY + 1);
  ctxFS.closePath();
  ctxFS.fill();

  // Crisp vertical lip micro-creases (both albedo & bump!) + glossy moist lower-lip highlight
  for (let lp = -10; lp <= 10; lp++) {
    const lx = mouthC + lp * 6.2;
    const tEdge = 1 - Math.abs(lp) / 11.5;
    const yEnd = lipLineY + 5 + tEdge * 20;
    ctxFS.strokeStyle = 'rgba(104,46,44,0.24)';
    ctxFS.lineWidth = 1.2;
    ctxFS.beginPath();
    ctxFS.moveTo(lx, lipLineY + 2);
    ctxFS.quadraticCurveTo(lx + lp * 0.45, (lipLineY + yEnd) * 0.5, lx, yEnd);
    ctxFS.stroke();

    ctxFB.strokeStyle = 'rgba(84,84,84,0.52)';
    ctxFB.lineWidth = 1.6;
    ctxFB.beginPath();
    ctxFB.moveTo(lx, lipLineY + 2);
    ctxFB.quadraticCurveTo(lx + lp * 0.45, (lipLineY + yEnd) * 0.5, lx, yEnd);
    ctxFB.stroke();
  }
  drawFaceEllipse(ctxFS, mouthC, llY(-0.486), 36, 8.5, 'rgba(255,246,242,0.44)', 'rgba(255,246,242,0)');
  // Lip parting shadow + deep bump seam + oral commissure pockets + labiomental chin crease
  ctxFS.strokeStyle = 'rgba(54,22,20,0.78)';
  ctxFS.lineWidth = 3.2;
  ctxFS.beginPath();
  ctxFS.moveTo(mouthL - 2, lipLineY);
  ctxFS.quadraticCurveTo(mouthC, lipLineY + 6.5, mouthR + 2, lipLineY);
  ctxFS.stroke();
  ctxFB.strokeStyle = '#222222';
  ctxFB.lineWidth = 5.0;
  ctxFB.beginPath();
  ctxFB.moveTo(mouthL - 2, lipLineY);
  ctxFB.quadraticCurveTo(mouthC, lipLineY + 6.5, mouthR + 2, lipLineY);
  ctxFB.stroke();

  drawFaceEllipse(ctxFS, mouthL - 2, lipLineY + 1, 14, 11, 'rgba(68,36,30,0.48)', 'rgba(68,36,30,0)');
  drawFaceEllipse(ctxFS, mouthR + 2, lipLineY + 1, 14, 11, 'rgba(68,36,30,0.48)', 'rgba(68,36,30,0)');
  drawFaceEllipse(ctxFS, mouthC, llY(-0.595), 54, 15, 'rgba(82,50,42,0.36)', 'rgba(82,50,42,0)');
  ctxFB.strokeStyle = 'rgba(68,68,68,0.52)';
  ctxFB.lineWidth = 5.5;
  ctxFB.beginPath();
  ctxFB.moveTo(llX(-0.14), llY(-0.585));
  ctxFB.quadraticCurveTo(mouthC, llY(-0.608), llX(0.14), llY(-0.585));
  ctxFB.stroke();

  // Exact-aligned Nasolabial Smile Folds + Soft Cheek Fullness Rim
  for (const s of [-1, 1]) {
    const x0 = llX(s * 0.155);
    const y0 = llY(-0.238);
    const x1 = llX(s * 0.285);
    const y1 = llY(-0.355);
    const x2 = llX(s * 0.275);
    const y2 = llY(-0.485);

    ctxFS.strokeStyle = 'rgba(92,56,46,0.28)';
    ctxFS.lineWidth = 4.6;
    ctxFS.lineCap = 'round';
    ctxFS.beginPath();
    ctxFS.moveTo(x0, y0);
    ctxFS.quadraticCurveTo(x1, y1, x2, y2);
    ctxFS.stroke();

    ctxFS.strokeStyle = 'rgba(255,248,242,0.16)';
    ctxFS.lineWidth = 5.5;
    ctxFS.beginPath();
    ctxFS.moveTo(x0 + s * 7.5, y0 - 4);
    ctxFS.quadraticCurveTo(x1 + s * 9.0, y1 - 2, x2 + s * 7.5, y2 - 2);
    ctxFS.stroke();

    ctxFB.strokeStyle = 'rgba(66,66,66,0.62)';
    ctxFB.lineWidth = 5.8;
    ctxFB.lineCap = 'round';
    ctxFB.beginPath();
    ctxFB.moveTo(x0, y0);
    ctxFB.quadraticCurveTo(x1, y1, x2, y2);
    ctxFB.stroke();
  }

  // Subtle Horizontal Forehead Expression Lines + Glabella Vertical Lines
  for (let fl = 0; fl < 3; fl++) {
    const fy = llY(0.415 - fl * 0.056);
    ctxFS.strokeStyle = `rgba(96,62,50,${0.15 - fl * 0.025})`;
    ctxFS.lineWidth = 2.0;
    ctxFS.beginPath();
    ctxFS.moveTo(llX(-0.42), fy + 6);
    ctxFS.quadraticCurveTo(llX(0), fy - 7, llX(0.42), fy + 6);
    ctxFS.stroke();

    ctxFB.strokeStyle = 'rgba(86,86,86,0.38)';
    ctxFB.lineWidth = 2.6;
    ctxFB.beginPath();
    ctxFB.moveTo(llX(-0.42), fy + 6);
    ctxFB.quadraticCurveTo(llX(0), fy - 7, llX(0.42), fy + 6);
    ctxFB.stroke();
  }
  for (const s of [-1, 1]) {
    const gx = llX(s * 0.042);
    ctxFS.strokeStyle = 'rgba(92,56,46,0.20)';
    ctxFS.lineWidth = 2.2;
    ctxFS.beginPath();
    ctxFS.moveTo(gx, llY(0.215));
    ctxFS.lineTo(gx, llY(0.135));
    ctxFS.stroke();
    ctxFB.strokeStyle = 'rgba(78,78,78,0.44)';
    ctxFB.lineWidth = 2.8;
    ctxFB.beginPath();
    ctxFB.moveTo(gx, llY(0.215));
    ctxFB.lineTo(gx, llY(0.135));
    ctxFB.stroke();
  }

  // Clone photorealistic skin into cFace (for 314 distant street pedestrians) and paint EXACT-aligned almond eyes!
  const [cFace, ctxF] = makeCanvas(FACE_W, FACE_H);
  ctxF.drawImage(cFaceSkin, 0, 0);
  for (const s of [-1, 1]) {
    const ex = llX(s * 0.365);
    const ey = llY(0.032);
    ctxF.save();
    ctxF.beginPath();
    ctxF.moveTo(ex - s * 36, ey + 2);
    ctxF.quadraticCurveTo(ex, ey - 19, ex + s * 38, ey + 1);
    ctxF.quadraticCurveTo(ex, ey + 17, ex - s * 36, ey + 2);
    ctxF.closePath();
    ctxF.clip();

    const scleraGrad = ctxF.createLinearGradient(ex, ey - 18, ex, ey + 16);
    scleraGrad.addColorStop(0, '#c6c0bc');
    scleraGrad.addColorStop(0.28, '#faf8f5');
    scleraGrad.addColorStop(0.85, '#f2ede8');
    scleraGrad.addColorStop(1, '#d8d0ca');
    ctxF.fillStyle = scleraGrad;
    ctxF.fillRect(ex - 42, ey - 22, 84, 44);

    // Pink inner tear duct caruncle
    ctxF.fillStyle = 'rgba(204,114,108,0.72)';
    ctxF.beginPath();
    ctxF.arc(ex - s * 31, ey + 2.5, 6.2, 0, Math.PI * 2);
    ctxF.fill();

    // Limbal ring + striated iris + pupil + catchlight
    ctxF.fillStyle = '#181a1e';
    ctxF.beginPath();
    ctxF.arc(ex, ey, 16.5, 0, Math.PI * 2);
    ctxF.fill();
    const irisGrad = ctxF.createRadialGradient(ex, ey, 3.5, ex, ey, 14.8);
    irisGrad.addColorStop(0, '#627c90');
    irisGrad.addColorStop(0.55, '#466074');
    irisGrad.addColorStop(0.88, '#263440');
    irisGrad.addColorStop(1, '#161c22');
    ctxF.fillStyle = irisGrad;
    ctxF.beginPath();
    ctxF.arc(ex, ey, 14.8, 0, Math.PI * 2);
    ctxF.fill();
    ctxF.fillStyle = '#08090c';
    ctxF.beginPath();
    ctxF.arc(ex, ey, 6.8, 0, Math.PI * 2);
    ctxF.fill();
    ctxF.fillStyle = 'rgba(255,255,255,0.95)';
    ctxF.beginPath();
    ctxF.arc(ex - 4.5, ey - 4.5, 3.4, 0, Math.PI * 2);
    ctxF.fill();
    ctxF.restore();

    ctxF.strokeStyle = 'rgba(20,13,11,0.90)';
    ctxF.lineWidth = 4.6;
    ctxF.beginPath();
    ctxF.moveTo(ex - s * 36, ey + 2);
    ctxF.quadraticCurveTo(ex, ey - 19, ex + s * 38, ey + 1);
    ctxF.stroke();
  }

  // =========================================================================
  // SILKY ANISOTROPIC MULTI-STRAND HAIR TEXTURE + BUMP MAP (512x512)
  // Thousands of fine layered vertical hair fibers with root depth & natural sheen band!
  // =========================================================================
  const [cHair, ctxH] = makeCanvas(512, 512);
  const [cHairB, ctxHB] = makeCanvas(512, 512);
  const hRng = mulberry32(91357);

  // Base vertical hair gradient (slightly deeper roots at top -> rich mid-shaft -> luminous silk tips)
  const hBase = ctxH.createLinearGradient(0, 0, 0, 512);
  hBase.addColorStop(0.0, '#8d8d92');
  hBase.addColorStop(0.28, '#babac0');
  hBase.addColorStop(0.46, '#dcdce2'); // natural anisotropic hair highlight band
  hBase.addColorStop(0.68, '#b6b6bc');
  hBase.addColorStop(1.0, '#9a9aa0');
  ctxH.fillStyle = hBase;
  ctxH.fillRect(0, 0, 512, 512);

  ctxHB.fillStyle = '#808080';
  ctxHB.fillRect(0, 0, 512, 512);

  // Draw 2,600 fine silky vertical hair strands with subtle organic wave & multi-tone depth
  for (let s = 0; s < 2600; s++) {
    const x0 = hRng() * 512;
    const waveA = (hRng() - 0.5) * 7.0;
    const waveB = (hRng() - 0.5) * 7.0;
    const bright = 115 + Math.floor(hRng() * 135);
    const alpha = 0.16 + hRng() * 0.28;
    ctxH.strokeStyle = `rgba(${bright},${bright},${bright},${alpha})`;
    ctxH.lineWidth = 0.7 + hRng() * 1.4;
    ctxH.beginPath();
    ctxH.moveTo(x0, 0);
    ctxH.bezierCurveTo(x0 + waveA, 170, x0 + waveB, 340, x0 + (waveA + waveB) * 0.25, 512);
    ctxH.stroke();

    const bumpVal = 70 + Math.floor(hRng() * 145);
    ctxHB.strokeStyle = `rgba(${bumpVal},${bumpVal},${bumpVal},0.45)`;
    ctxHB.lineWidth = 0.9 + hRng() * 1.3;
    ctxHB.beginPath();
    ctxHB.moveTo(x0, 0);
    ctxHB.bezierCurveTo(x0 + waveA, 170, x0 + waveB, 340, x0 + (waveA + waveB) * 0.25, 512);
    ctxHB.stroke();
  }
  // Subtle silky horizontal sheen glints across individual fiber clusters
  for (let g = 0; g < 140; g++) {
    const gx = hRng() * 512;
    const gy = 170 + (hRng() - 0.5) * 110;
    ctxH.strokeStyle = `rgba(255,255,255,${0.08 + hRng() * 0.14})`;
    ctxH.lineWidth = 1.1;
    ctxH.beginPath();
    ctxH.moveTo(gx, gy - 16);
    ctxH.lineTo(gx + (hRng() - 0.5) * 3, gy + 16);
    ctxH.stroke();
  }

  // =========================================================================
  // NEWSPAPER BROADSHEET TEXTURE (256x256) & GLOWING SMARTPHONE SCREEN (128x256)
  // =========================================================================
  const [cNews, ctxN] = makeCanvas(256, 256);
  ctxN.fillStyle = '#e5dfd2';
  ctxN.fillRect(0, 0, 256, 256);
  // Subtle newsprint paper grain & center fold shadow
  const foldG = ctxN.createLinearGradient(118, 0, 138, 0);
  foldG.addColorStop(0, 'rgba(0,0,0,0)');
  foldG.addColorStop(0.5, 'rgba(40,35,28,0.28)');
  foldG.addColorStop(1, 'rgba(0,0,0,0)');
  ctxN.fillStyle = foldG;
  ctxN.fillRect(118, 0, 20, 256);
  // Masthead banner on left & right pages
  ctxN.fillStyle = '#1d1d20';
  ctxN.fillRect(10, 12, 108, 16);
  ctxN.fillRect(138, 12, 108, 12);
  ctxN.fillStyle = '#e5dfd2';
  ctxN.font = 'bold 11px serif';
  ctxN.fillText('КРОНСК ВЕСТНИК', 15, 24);
  ctxN.fillStyle = '#242428';
  ctxN.fillRect(10, 32, 108, 2);
  ctxN.fillRect(138, 28, 108, 2);
  // Monochrome editorial photo boxes + dense crisp multi-column text lines
  ctxN.fillStyle = '#525760';
  ctxN.fillRect(14, 42, 62, 54);
  ctxN.fillStyle = '#8b929c';
  ctxN.fillRect(18, 48, 54, 24);
  ctxN.fillStyle = '#484d55';
  ctxN.fillRect(144, 122, 96, 56);
  ctxN.fillStyle = '#2d2d30';
  for (let col = 0; col < 4; col++) {
    const cx = col < 2 ? 14 + col * 54 : 142 + (col - 2) * 54;
    for (let y = 40; y < 242; y += 6) {
      if (col === 0 && y < 102) continue;
      if (col >= 2 && y > 118 && y < 184) continue;
      ctxN.fillRect(cx, y, 44 - ((y * 7 + col * 13) % 10), 2.5);
    }
  }

  const [cPhone, ctxPh] = makeCanvas(128, 256);
  const phGrad = ctxPh.createLinearGradient(0, 0, 0, 256);
  phGrad.addColorStop(0, '#102138');
  phGrad.addColorStop(0.5, '#193558');
  phGrad.addColorStop(1, '#0e1d30');
  ctxPh.fillStyle = phGrad;
  ctxPh.fillRect(0, 0, 128, 256);
  // Top status bar & glowing chat / social feed cards
  ctxPh.fillStyle = '#7dd3fc';
  ctxPh.fillRect(12, 14, 42, 6);
  ctxPh.fillStyle = '#e2f2ff';
  ctxPh.fillRect(92, 14, 22, 6);
  // Photo card
  ctxPh.fillStyle = '#2a5c8a';
  ctxPh.fillRect(12, 36, 104, 68);
  ctxPh.fillStyle = '#f59e0b';
  ctxPh.fillRect(22, 48, 46, 28);
  ctxPh.fillStyle = '#38bdf8';
  ctxPh.fillRect(72, 56, 34, 34);
  // Glowing message bubbles
  ctxPh.fillStyle = '#38bdf8';
  ctxPh.fillRect(36, 120, 80, 24);
  ctxPh.fillStyle = '#d4e8f8';
  ctxPh.fillRect(12, 154, 76, 26);
  ctxPh.fillStyle = '#38bdf8';
  ctxPh.fillRect(42, 190, 74, 22);
  ctxPh.fillStyle = '#94a3b8';
  ctxPh.fillRect(14, 226, 100, 14);

  // Silky, soft-feathered elongated raindrop streak sprite (thicker, smoother, zero jagged 1px lines or hard beads!)
  const [cStreak, ctxSt] = makeCanvas(64, 256);
  const vGrad = ctxSt.createLinearGradient(0, 0, 0, 256);
  vGrad.addColorStop(0.0, 'rgba(185, 208, 228, 0.0)');
  vGrad.addColorStop(0.22, 'rgba(195, 218, 238, 0.35)');
  vGrad.addColorStop(0.68, 'rgba(218, 234, 248, 0.85)');
  vGrad.addColorStop(0.88, 'rgba(232, 242, 252, 0.96)');
  vGrad.addColorStop(1.0, 'rgba(215, 232, 248, 0.0)');
  ctxSt.fillStyle = vGrad;
  ctxSt.fillRect(0, 0, 64, 256);

  // Horizontal Gaussian-like feather mask so edges are silky smooth
  ctxSt.globalCompositeOperation = 'destination-in';
  const hGrad = ctxSt.createLinearGradient(0, 0, 64, 0);
  hGrad.addColorStop(0.0, 'rgba(255,255,255,0)');
  hGrad.addColorStop(0.28, 'rgba(255,255,255,0.45)');
  hGrad.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  hGrad.addColorStop(0.72, 'rgba(255,255,255,0.45)');
  hGrad.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctxSt.fillStyle = hGrad;
  ctxSt.fillRect(0, 0, 64, 256);
  ctxSt.globalCompositeOperation = 'source-over';

  const shadowMap = new THREE.CanvasTexture(cShad);
  shadowMap.anisotropy = anisotropy;
  const raindropMap = new THREE.CanvasTexture(cDrop);
  raindropMap.colorSpace = THREE.SRGBColorSpace;
  const softRainStreakMap = new THREE.CanvasTexture(cStreak);
  softRainStreakMap.colorSpace = THREE.SRGBColorSpace;
  const rippleMap = new THREE.CanvasTexture(cRip);
  rippleMap.colorSpace = THREE.SRGBColorSpace;
  const puddleMap = new THREE.CanvasTexture(cPud);
  puddleMap.colorSpace = THREE.SRGBColorSpace;
  const pedClothingMap = new THREE.CanvasTexture(cCloth);
  pedClothingMap.colorSpace = THREE.SRGBColorSpace;
  pedClothingMap.wrapS = pedClothingMap.wrapT = THREE.RepeatWrapping;
  pedClothingMap.anisotropy = anisotropy;
  const pedClothingBump = new THREE.CanvasTexture(cClothB);
  pedClothingBump.wrapS = pedClothingBump.wrapT = THREE.RepeatWrapping;
  pedClothingBump.anisotropy = anisotropy;
  const pedClothingRoughness = new THREE.CanvasTexture(cClothR);
  pedClothingRoughness.wrapS = pedClothingRoughness.wrapT = THREE.RepeatWrapping;
  pedClothingRoughness.anisotropy = anisotropy;
  const pedFaceMap = new THREE.CanvasTexture(cFace);
  pedFaceMap.colorSpace = THREE.SRGBColorSpace;
  pedFaceMap.anisotropy = anisotropy;
  const pedFaceSkinMap = new THREE.CanvasTexture(cFaceSkin);
  pedFaceSkinMap.colorSpace = THREE.SRGBColorSpace;
  pedFaceSkinMap.anisotropy = anisotropy;
  const pedFaceBump = new THREE.CanvasTexture(cFaceB);
  pedFaceBump.anisotropy = anisotropy;
  const pedHairMap = new THREE.CanvasTexture(cHair);
  pedHairMap.colorSpace = THREE.SRGBColorSpace;
  pedHairMap.wrapS = pedHairMap.wrapT = THREE.RepeatWrapping;
  pedHairMap.anisotropy = anisotropy;
  const pedHairBump = new THREE.CanvasTexture(cHairB);
  pedHairBump.wrapS = pedHairBump.wrapT = THREE.RepeatWrapping;
  pedHairBump.anisotropy = anisotropy;
  const newspaperMap = new THREE.CanvasTexture(cNews);
  newspaperMap.colorSpace = THREE.SRGBColorSpace;
  newspaperMap.anisotropy = anisotropy;
  const phoneScreenMap = new THREE.CanvasTexture(cPhone);
  phoneScreenMap.colorSpace = THREE.SRGBColorSpace;

  // =========================================================================
  // ADDITIVE FABRIC & FACE PUNCH-UP VARIANTS (Denim, Leather, Rib-Knit, Faces)
  // =========================================================================
  const fabRng = mulberry32(44219);
  const mkTiledTex = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    return t;
  };

  // 1. Diagonal Twill Denim (diffuse + bump + roughness)
  const [cDen, ctxDen] = makeCanvas(512, 512);
  const [cDenB, ctxDenB] = makeCanvas(512, 512);
  const [cDenR, ctxDenR] = makeCanvas(512, 512);
  ctxDen.fillStyle = '#d4dbe4';
  ctxDen.fillRect(0, 0, 512, 512);
  ctxDenB.fillStyle = '#808080';
  ctxDenB.fillRect(0, 0, 512, 512);
  ctxDenR.fillStyle = '#dcdcdc';
  ctxDenR.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 3) {
    for (let x = 0; x < 512; x += 3) {
      const diag = ((x + y) / 3) % 4;
      const v = diag === 0 ? 198 : diag === 1 ? 228 : 210 + (fabRng() - 0.5) * 20;
      ctxDen.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
      ctxDen.fillRect(x, y, 3, 3);
      const b = diag === 0 ? 105 : 155 + (fabRng() - 0.5) * 25;
      ctxDenB.fillStyle = `rgb(${b},${b},${b})`;
      ctxDenB.fillRect(x, y, 3, 3);
    }
  }
  // Distressed seam stitching & crease fades
  ctxDen.strokeStyle = 'rgba(235, 198, 128, 0.45)';
  ctxDen.lineWidth = 2;
  ctxDen.setLineDash([7, 4]);
  ctxDen.strokeRect(18, 18, 476, 476);
  ctxDen.setLineDash([]);
  const fadeG = ctxDen.createRadialGradient(256, 260, 20, 256, 260, 175);
  fadeG.addColorStop(0, 'rgba(255,255,255,0.18)');
  fadeG.addColorStop(1, 'rgba(20,28,42,0.14)');
  ctxDen.fillStyle = fadeG;
  ctxDen.fillRect(0, 0, 512, 512);

  const pedFabricDenimMap = mkTiledTex(cDen, true);
  const pedFabricDenimBump = mkTiledTex(cDenB, false);
  const pedFabricDenimRoughness = mkTiledTex(cDenR, false);

  // 2. Pebbled Full-Grain Leather (diffuse + bump + roughness)
  const [cLth, ctxLth] = makeCanvas(512, 512);
  const [cLthB, ctxLthB] = makeCanvas(512, 512);
  const [cLthR, ctxLthR] = makeCanvas(512, 512);
  ctxLth.fillStyle = '#cfcfcf';
  ctxLth.fillRect(0, 0, 512, 512);
  ctxLthB.fillStyle = '#707070';
  ctxLthB.fillRect(0, 0, 512, 512);
  ctxLthR.fillStyle = '#5e5e5e';
  ctxLthR.fillRect(0, 0, 512, 512);
  for (let p = 0; p < 2400; p++) {
    const px = fabRng() * 512;
    const py = fabRng() * 512;
    const pr = 2.2 + fabRng() * 3.8;
    const shade = 185 + Math.floor(fabRng() * 62);
    ctxLth.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctxLth.beginPath();
    ctxLth.arc(px, py, pr, 0, Math.PI * 2);
    ctxLth.fill();
    const bumpS = 140 + Math.floor(fabRng() * 88);
    ctxLthB.fillStyle = `rgb(${bumpS},${bumpS},${bumpS})`;
    ctxLthB.beginPath();
    ctxLthB.arc(px, py, pr * 0.9, 0, Math.PI * 2);
    ctxLthB.fill();
    const rghS = 72 + Math.floor(fabRng() * 64);
    ctxLthR.fillStyle = `rgb(${rghS},${rghS},${rghS})`;
    ctxLthR.beginPath();
    ctxLthR.arc(px, py, pr, 0, Math.PI * 2);
    ctxLthR.fill();
  }
  ctxLth.strokeStyle = 'rgba(28, 28, 32, 0.55)';
  ctxLth.lineWidth = 3;
  ctxLth.strokeRect(8, 8, 496, 496);
  const pedFabricLeatherMap = mkTiledTex(cLth, true);
  const pedFabricLeatherBump = mkTiledTex(cLthB, false);
  const pedFabricLeatherRoughness = mkTiledTex(cLthR, false);

  // 3. Chunky Winter Rib-Knit Wool (diffuse + bump + roughness)
  const [cKnt, ctxKnt] = makeCanvas(512, 512);
  const [cKntB, ctxKntB] = makeCanvas(512, 512);
  const [cKntR, ctxKntR] = makeCanvas(512, 512);
  ctxKnt.fillStyle = '#d0d0d4';
  ctxKnt.fillRect(0, 0, 512, 512);
  ctxKntB.fillStyle = '#808080';
  ctxKntB.fillRect(0, 0, 512, 512);
  ctxKntR.fillStyle = '#f2f2f2';
  ctxKntR.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 8) {
    const rib = (x / 8) % 2 === 0;
    ctxKnt.fillStyle = rib ? 'rgba(242,242,246,0.45)' : 'rgba(130,130,138,0.35)';
    ctxKnt.fillRect(x, 0, 4, 512);
    ctxKntB.fillStyle = rib ? '#b4b4b4' : '#585858';
    ctxKntB.fillRect(x, 0, 4, 512);
    for (let y = 0; y < 512; y += 8) {
      const k = 178 + Math.floor(fabRng() * 68);
      ctxKnt.strokeStyle = `rgb(${k},${k},${k})`;
      ctxKnt.lineWidth = 1.4;
      ctxKnt.beginPath();
      ctxKnt.moveTo(x, y);
      ctxKnt.lineTo(x + 4, y + 6);
      ctxKnt.moveTo(x + 8, y);
      ctxKnt.lineTo(x + 4, y + 6);
      ctxKnt.stroke();
    }
  }
  const pedFabricKnitMap = mkTiledTex(cKnt, true);
  const pedFabricKnitBump = mkTiledTex(cKntB, false);
  const pedFabricKnitRoughness = mkTiledTex(cKntR, false);

  // 4. Additive Rich Character Face Variants layered directly on UV-locked cFaceSkin / cFace
  const [cFaceWth, ctxFW] = makeCanvas(cFaceSkin.width, cFaceSkin.height);
  ctxFW.drawImage(cFaceSkin, 0, 0);
  // Subtle weathered forehead, cheek warmth & nasolabial crease shadow
  const wW = cFaceWth.width;
  const wH = cFaceWth.height;
  const chL = ctxFW.createRadialGradient(wW * 0.43, wH * 0.56, 6, wW * 0.43, wH * 0.56, wW * 0.055);
  chL.addColorStop(0, 'rgba(182, 84, 72, 0.22)');
  chL.addColorStop(1, 'rgba(182, 84, 72, 0)');
  ctxFW.fillStyle = chL;
  ctxFW.fillRect(0, 0, wW, wH);
  const chR = ctxFW.createRadialGradient(wW * 0.57, wH * 0.56, 6, wW * 0.57, wH * 0.56, wW * 0.055);
  chR.addColorStop(0, 'rgba(182, 84, 72, 0.22)');
  chR.addColorStop(1, 'rgba(182, 84, 72, 0)');
  ctxFW.fillStyle = chR;
  ctxFW.fillRect(0, 0, wW, wH);
  // Subtle jaw stubble/character speckles
  for (let st = 0; st < 700; st++) {
    const sx = wW * (0.41 + fabRng() * 0.18);
    const sy = wH * (0.60 + fabRng() * 0.14);
    ctxFW.fillStyle = `rgba(54, 42, 34, ${0.06 + fabRng() * 0.1})`;
    ctxFW.fillRect(sx, sy, 2, 2);
  }
  const pedFaceWeatheredMap = new THREE.CanvasTexture(cFaceWth);
  pedFaceWeatheredMap.colorSpace = THREE.SRGBColorSpace;
  pedFaceWeatheredMap.anisotropy = anisotropy;

  const [cFaceStr, ctxFStr] = makeCanvas(cFace.width, cFace.height);
  ctxFStr.drawImage(cFace, 0, 0);
  const fW = cFaceStr.width;
  const fH = cFaceStr.height;
  const lipShade = ctxFStr.createRadialGradient(fW * 0.5, fH * 0.625, 4, fW * 0.5, fH * 0.625, fW * 0.036);
  lipShade.addColorStop(0, 'rgba(176, 86, 82, 0.24)');
  lipShade.addColorStop(1, 'rgba(176, 86, 82, 0)');
  ctxFStr.fillStyle = lipShade;
  ctxFStr.fillRect(0, 0, fW, fH);
  const pedFaceStreetCloseMap = new THREE.CanvasTexture(cFaceStr);
  pedFaceStreetCloseMap.colorSpace = THREE.SRGBColorSpace;
  pedFaceStreetCloseMap.anisotropy = anisotropy;

  return {
    shadowMap,
    raindropMap,
    softRainStreakMap,
    rippleMap,
    puddleMap,
    pedClothingMap,
    pedClothingBump,
    pedClothingRoughness,
    pedFaceMap,
    pedFaceSkinMap,
    pedFaceBump,
    pedHairMap,
    pedHairBump,
    pedFabricDenimMap,
    pedFabricDenimBump,
    pedFabricDenimRoughness,
    pedFabricLeatherMap,
    pedFabricLeatherBump,
    pedFabricLeatherRoughness,
    pedFabricKnitMap,
    pedFabricKnitBump,
    pedFabricKnitRoughness,
    pedFaceWeatheredMap,
    pedFaceStreetCloseMap,
    newspaperMap,
    phoneScreenMap,
  };
}

// =========================================================================
// PHOTOREALISTIC METRO TRAIN INTERIOR PBR TEXTURES
// Anti-slip speckled rubber flooring with wet rain-boot scuffs, brushed anodized
// composite wall panels with riveted joints & subtle grime, and woven moquette seats!
// =========================================================================
function buildMetroInteriorTextures(anisotropy: number) {
  const rng = mulberry32(88421);

  // 1. Speckled Dark Anti-Slip Transit Floor + Wet Scuffed Roughness Map
  const [cFl, ctxFl] = makeCanvas(512, 512);
  const [cFlR, ctxFlR] = makeCanvas(512, 512);
  ctxFl.fillStyle = '#242930';
  ctxFl.fillRect(0, 0, 512, 512);
  ctxFlR.fillStyle = '#a8a8a8';
  ctxFlR.fillRect(0, 0, 512, 512);

  // Subtle floor panel seams & brushed aluminum threshold edge strips
  ctxFl.fillStyle = '#181c22';
  for (let y = 0; y < 512; y += 128) {
    ctxFl.fillRect(0, y, 512, 3);
  }
  ctxFl.fillStyle = '#4a5460';
  ctxFl.fillRect(0, 0, 26, 512);
  ctxFl.fillRect(486, 0, 26, 512);
  // Subtle worn yellow safety line along side doorways
  ctxFl.fillStyle = 'rgba(202, 162, 48, 0.55)';
  ctxFl.fillRect(28, 0, 10, 512);
  ctxFl.fillRect(474, 0, 10, 512);

  // Dense terrazzo/rubber anti-slip mineral flecks
  for (let i = 0; i < 6200; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const sz = 1 + rng() * 2.2;
    const v = rng();
    ctxFl.fillStyle =
      v > 0.72
        ? 'rgba(145,158,172,0.42)'
        : v > 0.35
        ? 'rgba(18,22,26,0.45)'
        : 'rgba(84,96,110,0.35)';
    ctxFl.fillRect(x, y, sz, sz);
  }

  // Subtle wet rain-tracked glossy scuff marks along center walkway
  for (let i = 0; i < 42; i++) {
    const sx = 80 + rng() * 352;
    const sy = rng() * 512;
    const rx = 18 + rng() * 44;
    const ry = 28 + rng() * 72;
    const gWet = ctxFlR.createRadialGradient(sx, sy, 4, sx, sy, ry);
    gWet.addColorStop(0, 'rgba(32,32,32,0.75)'); // wet glossy spot
    gWet.addColorStop(1, 'rgba(168,168,168,0)');
    ctxFlR.fillStyle = gWet;
    ctxFlR.beginPath();
    ctxFlR.ellipse(sx, sy, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
    ctxFlR.fill();

    ctxFl.fillStyle = 'rgba(12,16,22,0.12)';
    ctxFl.beginPath();
    ctxFl.ellipse(sx, sy, rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2);
    ctxFl.fill();
  }

  // 2. Brushed Composite Metro Wall Panels + Riveted Seams + Bump
  const [cWl, ctxWl] = makeCanvas(512, 512);
  const [cWlB, ctxWlB] = makeCanvas(512, 512);
  const wGrad = ctxWl.createLinearGradient(0, 0, 0, 512);
  wGrad.addColorStop(0, '#cfd6de'); // crisp upper transit panel
  wGrad.addColorStop(0.55, '#b6c0ca');
  wGrad.addColorStop(0.85, '#7e8a96'); // lower scuff-resistant wainscoting
  wGrad.addColorStop(1, '#58626e');
  ctxWl.fillStyle = wGrad;
  ctxWl.fillRect(0, 0, 512, 512);

  ctxWlB.fillStyle = '#808080';
  ctxWlB.fillRect(0, 0, 512, 512);

  // Fine horizontal brushed-metal / composite grain
  for (let y = 0; y < 512; y += 2) {
    const a = 0.02 + rng() * 0.035;
    ctxWl.fillStyle = rng() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(18,24,32,${a})`;
    ctxWl.fillRect(0, y, 512, 1);
  }
  // Vertical panel expansion joints, aluminum molding trim & tiny rivets
  for (let x = 0; x < 512; x += 128) {
    ctxWl.fillStyle = '#3c4550';
    ctxWl.fillRect(x, 0, 4, 512);
    ctxWl.fillStyle = 'rgba(255,255,255,0.22)';
    ctxWl.fillRect(x + 4, 0, 2, 512);
    ctxWlB.fillStyle = '#282828';
    ctxWlB.fillRect(x, 0, 4, 512);

    for (let ry = 24; ry < 512; ry += 64) {
      ctxWl.fillStyle = '#525d6a';
      ctxWl.beginPath();
      ctxWl.arc(x + 12, ry, 2.5, 0, Math.PI * 2);
      ctxWl.fill();
      ctxWlB.fillStyle = '#d0d0d0';
      ctxWlB.beginPath();
      ctxWlB.arc(x + 12, ry, 2.5, 0, Math.PI * 2);
      ctxWlB.fill();
    }
  }
  // Horizontal stainless belt molding & subtle wear patina near lower kickplate
  ctxWl.fillStyle = '#475260';
  ctxWl.fillRect(0, 340, 512, 12);
  ctxWl.fillStyle = 'rgba(225,235,245,0.35)';
  ctxWl.fillRect(0, 342, 512, 3);
  ctxWlB.fillStyle = '#d8d8d8';
  ctxWlB.fillRect(0, 340, 512, 12);

  // 3. Plush Woven Velvet-Moquette Transit Upholstery Fabric (512x512 Albedo + Tufted Cushion Bump!)
  const [cSt, ctxSt] = makeCanvas(512, 512);
  const [cStB, ctxStB] = makeCanvas(512, 512);
  ctxSt.fillStyle = '#203652';
  ctxSt.fillRect(0, 0, 512, 512);
  ctxStB.fillStyle = '#888888';
  ctxStB.fillRect(0, 0, 512, 512);

  // Soft plush wool-moquette geometric chevron/diamond weave pattern
  for (let y = 0; y < 512; y += 16) {
    for (let x = 0; x < 512; x += 16) {
      const alt = ((x + y) / 16) % 2 === 0;
      ctxSt.fillStyle = alt ? 'rgba(66, 134, 186, 0.24)' : 'rgba(14, 26, 44, 0.30)';
      ctxSt.beginPath();
      ctxSt.moveTo(x + 8, y + 1);
      ctxSt.lineTo(x + 15, y + 8);
      ctxSt.lineTo(x + 8, y + 15);
      ctxSt.lineTo(x + 1, y + 8);
      ctxSt.closePath();
      ctxSt.fill();

      if ((x * 3 + y * 5) % 48 === 0) {
        ctxSt.fillStyle = 'rgba(228, 162, 68, 0.38)';
        ctxSt.fillRect(x + 6, y + 6, 4, 4);
      } else if ((x + y * 2) % 64 === 0) {
        ctxSt.fillStyle = 'rgba(84, 198, 224, 0.30)';
        ctxSt.fillRect(x + 4, y + 7, 8, 2.5);
      }
    }
  }
  // Fine plush textile nap & fabric threads on both albedo & bump!
  for (let y = 0; y < 512; y += 2) {
    ctxStB.fillStyle = y % 4 === 0 ? 'rgba(165,165,165,0.28)' : 'rgba(98,98,98,0.28)';
    ctxStB.fillRect(0, y, 512, 1);
  }
  for (let i = 0; i < 8500; i++) {
    const x = rng() * 512;
    const y = rng() * 512;
    const hi = rng() > 0.5;
    ctxSt.fillStyle = hi ? 'rgba(255,255,255,0.055)' : 'rgba(8,14,22,0.08)';
    ctxSt.fillRect(x, y, 2, 2);
    ctxStB.fillStyle = hi ? 'rgba(182,182,182,0.34)' : 'rgba(76,76,76,0.34)';
    ctxStB.fillRect(x, y, 2, 2);
  }
  // Plush upholstered cushion pillow puffs + deep stitched tuft channels & piped borders!
  for (let col = 0; col < 2; col++) {
    const cx = 128 + col * 256;
    const puff = ctxSt.createRadialGradient(cx, 256, 22, cx, 256, 170);
    puff.addColorStop(0, 'rgba(255,255,255,0.12)');
    puff.addColorStop(0.72, 'rgba(255,255,255,0.02)');
    puff.addColorStop(1, 'rgba(8,14,24,0.36)');
    ctxSt.fillStyle = puff;
    ctxSt.fillRect(col * 256, 0, 256, 512);

    const puffB = ctxStB.createRadialGradient(cx, 256, 18, cx, 256, 165);
    puffB.addColorStop(0, 'rgba(235,235,235,0.58)');
    puffB.addColorStop(0.72, 'rgba(145,145,145,0.2)');
    puffB.addColorStop(1, 'rgba(32,32,32,0.68)');
    ctxStB.fillStyle = puffB;
    ctxStB.fillRect(col * 256, 0, 256, 512);

    // Subtle recessed fabric tuft button dimples
    for (const ty of [148, 364]) {
      const dimp = ctxSt.createRadialGradient(cx, ty, 2, cx, ty, 18);
      dimp.addColorStop(0, 'rgba(6,10,18,0.55)');
      dimp.addColorStop(1, 'rgba(6,10,18,0)');
      ctxSt.fillStyle = dimp;
      ctxSt.beginPath();
      ctxSt.arc(cx, ty, 18, 0, Math.PI * 2);
      ctxSt.fill();

      const dimpB = ctxStB.createRadialGradient(cx, ty, 2, cx, ty, 18);
      dimpB.addColorStop(0, 'rgba(20,20,20,0.9)');
      dimpB.addColorStop(1, 'rgba(128,128,128,0)');
      ctxStB.fillStyle = dimpB;
      ctxStB.beginPath();
      ctxStB.arc(cx, ty, 18, 0, Math.PI * 2);
      ctxStB.fill();
    }
  }
  ctxSt.strokeStyle = 'rgba(8, 14, 24, 0.72)';
  ctxSt.lineWidth = 6;
  ctxSt.strokeRect(4, 4, 504, 504);
  ctxSt.beginPath();
  ctxSt.moveTo(256, 0);
  ctxSt.lineTo(256, 512);
  ctxSt.stroke();

  ctxStB.strokeStyle = '#202020';
  ctxStB.lineWidth = 8;
  ctxStB.strokeRect(4, 4, 504, 504);
  ctxStB.beginPath();
  ctxStB.moveTo(256, 0);
  ctxStB.lineTo(256, 512);
  ctxStB.stroke();

  const floorMap = new THREE.CanvasTexture(cFl);
  floorMap.colorSpace = THREE.SRGBColorSpace;
  floorMap.wrapS = floorMap.wrapT = THREE.RepeatWrapping;
  floorMap.repeat.set(1, 5);
  floorMap.anisotropy = anisotropy;

  const floorRoughness = new THREE.CanvasTexture(cFlR);
  floorRoughness.wrapS = floorRoughness.wrapT = THREE.RepeatWrapping;
  floorRoughness.repeat.set(1, 5);

  const wallMap = new THREE.CanvasTexture(cWl);
  wallMap.colorSpace = THREE.SRGBColorSpace;
  wallMap.wrapS = wallMap.wrapT = THREE.RepeatWrapping;
  wallMap.repeat.set(4, 1);
  wallMap.anisotropy = anisotropy;

  const wallBump = new THREE.CanvasTexture(cWlB);
  wallBump.wrapS = wallBump.wrapT = THREE.RepeatWrapping;
  wallBump.repeat.set(4, 1);

  const seatMap = new THREE.CanvasTexture(cSt);
  seatMap.colorSpace = THREE.SRGBColorSpace;
  seatMap.wrapS = seatMap.wrapT = THREE.RepeatWrapping;
  seatMap.repeat.set(1, 1);
  seatMap.anisotropy = anisotropy;

  const seatBump = new THREE.CanvasTexture(cStB);
  seatBump.wrapS = seatBump.wrapT = THREE.RepeatWrapping;
  seatBump.repeat.set(1, 1);
  seatBump.anisotropy = anisotropy;

  return { floorMap, floorRoughness, wallMap, wallBump, seatMap, seatBump };
}

// =============================================================================
// KALUGA 2059 TEXTURE ENGINE — SEAMLESS PROCEDURAL DISTRICT SKIN FAMILIES
// Additive-only architecture: zero external assets, 100% CanvasTexture.
// Tiling method: 2D Periodic Integer-Lattice Value Noise (fBm) + 3x3 Toroidal
// Wrap-Around Stamping so every repeating surface is C1 continuous across UV edges.
// =============================================================================

const TILING_METHOD_DESC =
  'Periodic integer-lattice fBm noise + 3x3 toroidal wrap-around stamping (RepeatWrapping)';

function estimateTextureGpuBytes(tex: THREE.Texture): number {
  const img = tex.image as { width?: number; height?: number } | undefined;
  const w = img?.width ?? 0;
  const h = img?.height ?? 0;
  if (w <= 0 || h <= 0) return 0;
  const baseBytes = w * h * 4; // RGBA8 uncompressed VRAM footprint
  return tex.generateMipmaps ? Math.round((baseBytes * 4) / 3) : baseBytes;
}

function finalizeSeamlessTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  wrapX = true,
  wrapY = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = wrapX ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = wrapY ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a periodic 2D value-noise evaluator wrapping cleanly at periodX, periodY.
 */
function createPeriodicNoise2D(seed: number, periodX: number, periodY: number) {
  const rng = mulberry32(seed);
  const grid = new Float32Array(periodX * periodY);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = rng();
  }
  return (u: number, v: number): number => {
    const gx = ((u * periodX) % periodX + periodX) % periodX;
    const gy = ((v * periodY) % periodY + periodY) % periodY;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = (x0 + 1) % periodX;
    const y1 = (y0 + 1) % periodY;
    const fx = gx - x0;
    const fy = gy - y0;
    // Quintic smoothstep for C2 continuous tile boundaries
    const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const v00 = grid[y0 * periodX + x0];
    const v10 = grid[y0 * periodX + x1];
    const v01 = grid[y1 * periodX + x0];
    const v11 = grid[y1 * periodX + x1];
    const ix0 = v00 + (v10 - v00) * sx;
    const ix1 = v01 + (v11 - v01) * sx;
    return ix0 + (ix1 - ix0) * sy;
  };
}

/**
 * Multi-octave periodic fBm noise in [0, 1], guaranteed seamless at u=0/1 and v=0/1.
 */
function createPeriodicFbm(
  seed: number,
  basePeriodX: number,
  basePeriodY: number,
  octaves = 4
) {
  const layers: Array<(u: number, v: number) => number> = [];
  for (let o = 0; o < octaves; o++) {
    const mult = 1 << o;
    layers.push(
      createPeriodicNoise2D(seed + o * 997, basePeriodX * mult, basePeriodY * mult)
    );
  }
  return (u: number, v: number): number => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += layers[o](u, v) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

/**
 * Stamps any drawing callback across toroidal wrap offsets so shapes straddling tile edges
 * tile seamlessly without hard seams.
 */
function stampWrapped(
  w: number,
  h: number,
  wrapX: boolean,
  wrapY: boolean,
  draw: (ox: number, oy: number) => void
): void {
  const xs = wrapX ? [-w, 0, w] : [0];
  const ys = wrapY ? [-h, 0, h] : [0];
  for (let xi = 0; xi < xs.length; xi++) {
    for (let yi = 0; yi < ys.length; yi++) {
      draw(xs[xi], ys[yi]);
    }
  }
}

/**
 * Renders periodic fBm micro-grain directly into albedo, bump, and roughness canvases
 * so every square pixel of stone, plaster, brick, concrete, or composite tiles seamlessly.
 */
function fillPeriodicSurfaceField(
  ctxAlb: CanvasRenderingContext2D,
  ctxBmp: CanvasRenderingContext2D,
  ctxRgh: CanvasRenderingContext2D,
  seed: number,
  baseRgb: [number, number, number],
  varRgb: [number, number, number],
  baseRough: number,
  varRough: number,
  bumpAmp: number,
  freqX: number,
  freqY: number,
  octaves = 4,
  anisoStretchY = 1
): void {
  const aw = ctxAlb.canvas.width;
  const ah = ctxAlb.canvas.height;
  const bw = ctxBmp.canvas.width;
  const bh = ctxBmp.canvas.height;
  const fbm = createPeriodicFbm(seed, freqX, freqY * anisoStretchY, octaves);
  const fbmFine = createPeriodicNoise2D(seed + 4421, freqX * 8, freqY * 8);

  const imgA = ctxAlb.createImageData(aw, ah);
  const dA = imgA.data;
  for (let y = 0; y < ah; y++) {
    const v = y / ah;
    for (let x = 0; x < aw; x++) {
      const u = x / aw;
      const n = fbm(u, v) * 0.78 + fbmFine(u, v) * 0.22;
      const centered = n - 0.5;
      const idx = (y * aw + x) * 4;
      dA[idx] = Math.max(0, Math.min(255, Math.round(baseRgb[0] + centered * varRgb[0])));
      dA[idx + 1] = Math.max(0, Math.min(255, Math.round(baseRgb[1] + centered * varRgb[1])));
      dA[idx + 2] = Math.max(0, Math.min(255, Math.round(baseRgb[2] + centered * varRgb[2])));
      dA[idx + 3] = 255;
    }
  }
  ctxAlb.putImageData(imgA, 0, 0);

  const imgB = ctxBmp.createImageData(bw, bh);
  const imgR = ctxRgh.createImageData(bw, bh);
  const dB = imgB.data;
  const dR = imgR.data;
  for (let y = 0; y < bh; y++) {
    const v = y / bh;
    for (let x = 0; x < bw; x++) {
      const u = x / bw;
      const n = fbm(u, v) * 0.72 + fbmFine(u, v) * 0.28;
      const centered = n - 0.5;
      const bVal = Math.max(0, Math.min(255, Math.round(128 + centered * bumpAmp)));
      const rVal = Math.max(12, Math.min(250, Math.round((baseRough + centered * varRough) * 255)));
      const idx = (y * bw + x) * 4;
      dB[idx] = dB[idx + 1] = dB[idx + 2] = bVal;
      dB[idx + 3] = 255;
      dR[idx] = dR[idx + 1] = dR[idx + 2] = rVal;
      dR[idx + 3] = 255;
    }
  }
  ctxBmp.putImageData(imgB, 0, 0);
  ctxRgh.putImageData(imgR, 0, 0);
}

interface DistrictSkinConfig {
  id: DistrictId;
  name: string;
  cyrillicName: string;
  materialLanguage: string;
  eraNote: string;
  accentHex: string;
  seed: number;
  baseRgb: [number, number, number];
  varRgb: [number, number, number];
  baseRough: number;
  varRough: number;
  metalness: number;
  bumpScale: number;
  cols: number;
  rows: number;
  litChance: number;
  warmRatio: number;
  warmColors: string[];
  coldColors: string[];
  glassDayColor: string;
  frameColor: string;
  trimColor: string;
  seamColor: string;
  roofDeckRgb: [number, number, number];
  defaultWear: { grime: number; streaks: number; patching: number; peeling: number };
}

const DISTRICT_CONFIGS: Record<DistrictId, DistrictSkinConfig> = {
  D1: {
    id: 'D1',
    name: 'Kalinin Nightlife',
    cyrillicName: 'Д1 · КАЛИНИНСКИЙ НОЧНОЙ',
    materialLanguage: 'Wet dark basalt stone, damp mortar, subtle neon sheen',
    eraNote: '2049 nocturnal club stone under 2059 rain film & runoff',
    accentHex: '#38e8ff',
    seed: 10101,
    baseRgb: [32, 37, 45],
    varRgb: [22, 24, 28],
    baseRough: 0.34,
    varRough: 0.28,
    metalness: 0.16,
    bumpScale: 0.42,
    cols: 4,
    rows: 4,
    litChance: 0.46,
    warmRatio: 0.48,
    warmColors: ['#ff9e4a', '#ff5277', '#ffcb74'],
    coldColors: ['#38e8ff', '#7c9aff', '#d46bff'],
    glassDayColor: '#121a24',
    frameColor: '#1c232d',
    trimColor: '#3a4654',
    seamColor: '#10141b',
    roofDeckRgb: [24, 28, 35],
    defaultWear: { grime: 0.45, streaks: 0.55, patching: 0.1, peeling: 0.12 },
  },
  D2: {
    id: 'D2',
    name: 'Central Reliquary',
    cyrillicName: 'Д2 · ЦЕНТРАЛЬНЫЙ РЕЛИКВАРИЙ',
    materialLanguage: 'Pale sacred limestone, carved pilasters, inlaid 24k gold',
    eraNote: '2049 neo-imperial sanctuary limestone with gentle 2059 cornice patina',
    accentHex: '#e8bf5a',
    seed: 20202,
    baseRgb: [212, 203, 184],
    varRgb: [24, 22, 20],
    baseRough: 0.68,
    varRough: 0.18,
    metalness: 0.12,
    bumpScale: 0.44,
    cols: 4,
    rows: 3,
    litChance: 0.36,
    warmRatio: 0.84,
    warmColors: ['#ffcf7a', '#ffb24c', '#ffe6b0'],
    coldColors: ['#9ec8e8', '#c8dcf0'],
    glassDayColor: '#1d242e',
    frameColor: '#b99645',
    trimColor: '#d9bc6b',
    seamColor: '#8d8370',
    roofDeckRgb: [48, 60, 58],
    defaultWear: { grime: 0.22, streaks: 0.28, patching: 0.05, peeling: 0.06 },
  },
  D3: {
    id: 'D3',
    name: 'Bunker Garrison',
    cyrillicName: 'Д3 · БУНКЕРНЫЙ ГАРНИЗОН',
    materialLanguage: 'Board-formed poured concrete, tie-rods, bolted blast steel',
    eraNote: 'Monolithic fortification concrete streaked by 2059 rust weeping',
    accentHex: '#94a39a',
    seed: 30303,
    baseRgb: [94, 99, 95],
    varRgb: [30, 30, 28],
    baseRough: 0.82,
    varRough: 0.22,
    metalness: 0.22,
    bumpScale: 0.55,
    cols: 4,
    rows: 4,
    litChance: 0.22,
    warmRatio: 0.35,
    warmColors: ['#e59d4a', '#d47438'],
    coldColors: ['#9bd4c8', '#b8d4d8', '#78a89c'],
    glassDayColor: '#141918',
    frameColor: '#373e3c',
    trimColor: '#565f5b',
    seamColor: '#2d322f',
    roofDeckRgb: [54, 58, 56],
    defaultWear: { grime: 0.62, streaks: 0.68, patching: 0.22, peeling: 0.1 },
  },
  D4: {
    id: 'D4',
    name: 'Industrial Railyard',
    cyrillicName: 'Д4 · ПРОМЫШЛЕННОЕ ДЕПО',
    materialLanguage: 'Soot-darkened factory brick, oxidized iron rust, riveted lintels',
    eraNote: 'Imperial masonry blackened by diesel smoke and weeping rust',
    accentHex: '#d97742',
    seed: 40404,
    baseRgb: [116, 62, 49],
    varRgb: [34, 24, 18],
    baseRough: 0.84,
    varRough: 0.2,
    metalness: 0.14,
    bumpScale: 0.58,
    cols: 3,
    rows: 3,
    litChance: 0.34,
    warmRatio: 0.62,
    warmColors: ['#ff9438', '#ffb85c', '#e66c28'],
    coldColors: ['#7cc6d8', '#a6dce8'],
    glassDayColor: '#181c20',
    frameColor: '#2d2928',
    trimColor: '#593b2c',
    seamColor: '#2b1812',
    roofDeckRgb: [38, 34, 34],
    defaultWear: { grime: 0.78, streaks: 0.75, patching: 0.3, peeling: 0.22 },
  },
  D7: {
    id: 'D7',
    name: 'Khrushchevka Blocks',
    cyrillicName: 'Д7 · ЖИЛЫЕ КВАРТАЛЫ',
    materialLanguage: 'Worn painted plaster patched a hundred times over prefab joints',
    eraNote: 'Faded 2049 pastel stucco layered with mismatched 2059 cement patches',
    accentHex: '#c7a47c',
    seed: 70707,
    baseRgb: [164, 152, 132],
    varRgb: [32, 30, 26],
    baseRough: 0.88,
    varRough: 0.16,
    metalness: 0.04,
    bumpScale: 0.46,
    cols: 5,
    rows: 4,
    litChance: 0.35,
    warmRatio: 0.72,
    warmColors: ['#ffc26e', '#ffe09c', '#f5a352'],
    coldColors: ['#8bbde0', '#b4d6ee'],
    glassDayColor: '#1b232c',
    frameColor: '#5d574c',
    trimColor: '#c2b9a8',
    seamColor: '#6b6358',
    roofDeckRgb: [46, 46, 48],
    defaultWear: { grime: 0.58, streaks: 0.52, patching: 0.85, peeling: 0.72 },
  },
  D8: {
    id: 'D8',
    name: 'The Quay & Docks',
    cyrillicName: 'Д8 · ПОРТОВАЯ НАБЕРЕЖНАЯ',
    materialLanguage: 'Salt-weathered marine concrete, white efflorescence, black tar',
    eraNote: 'Battered quay masonry sealed in bitumen pitch and white salt crust',
    accentHex: '#7da6bd',
    seed: 80808,
    baseRgb: [112, 118, 122],
    varRgb: [34, 34, 32],
    baseRough: 0.72,
    varRough: 0.34,
    metalness: 0.14,
    bumpScale: 0.52,
    cols: 4,
    rows: 3,
    litChance: 0.28,
    warmRatio: 0.54,
    warmColors: ['#ffab54', '#e89642'],
    coldColors: ['#84c6dc', '#9ad8e8'],
    glassDayColor: '#152028',
    frameColor: '#313a40',
    trimColor: '#222629',
    seamColor: '#16181a',
    roofDeckRgb: [28, 32, 36],
    defaultWear: { grime: 0.65, streaks: 0.72, patching: 0.38, peeling: 0.42 },
  },
  D9: {
    id: 'D9',
    name: 'Stargate Peninsula',
    cyrillicName: 'Д9 · ПОЛУОСТРОВ СТАРГЕЙТ',
    materialLanguage: 'Clean pale aerospace composite, hairline joints, eerie sterility',
    eraNote: 'Precision 2049 ceramic-polymer shell kept clinically clean in 2059',
    accentHex: '#7de2f5',
    seed: 90909,
    baseRgb: [224, 230, 234],
    varRgb: [10, 10, 10],
    baseRough: 0.34,
    varRough: 0.08,
    metalness: 0.26,
    bumpScale: 0.22,
    cols: 4,
    rows: 4,
    litChance: 0.32,
    warmRatio: 0.1,
    warmColors: ['#e8f2f5'],
    coldColors: ['#9ef0ff', '#dff8ff', '#62d4f5'],
    glassDayColor: '#0e1924',
    frameColor: '#98a6b2',
    trimColor: '#d4dde4',
    seamColor: '#8d99a4',
    roofDeckRgb: [192, 199, 206],
    defaultWear: { grime: 0.04, streaks: 0.05, patching: 0.0, peeling: 0.0 },
  },
  D10: {
    id: 'D10',
    name: 'Elysia Promenade',
    cyrillicName: 'Д10 · ЭЛИЗИЯ 2049',
    materialLanguage: 'Polished white marble stone, reflective glass, brushed champagne gold',
    eraNote: 'Russia 2049 luxury glamour maintained mirror-bright while Kaluga peels',
    accentHex: '#f5cf72',
    seed: 10010,
    baseRgb: [238, 234, 226],
    varRgb: [14, 14, 14],
    baseRough: 0.24,
    varRough: 0.1,
    metalness: 0.24,
    bumpScale: 0.24,
    cols: 4,
    rows: 3,
    litChance: 0.52,
    warmRatio: 0.9,
    warmColors: ['#ffe09e', '#ffcf6e', '#fff0ca'],
    coldColors: ['#d8ebff'],
    glassDayColor: '#1a2736',
    frameColor: '#d4af52',
    trimColor: '#e8c86c',
    seamColor: '#c8bfb0',
    roofDeckRgb: [216, 212, 202],
    defaultWear: { grime: 0.0, streaks: 0.0, patching: 0.0, peeling: 0.0 },
  },
};

/**
 * Draws the district-specific architectural wall pattern seamlessly onto albedo/bump/roughness.
 */
function paintDistrictWallPattern(
  cfg: DistrictSkinConfig,
  ctxA: CanvasRenderingContext2D,
  ctxB: CanvasRenderingContext2D,
  ctxR: CanvasRenderingContext2D,
  w: number,
  h: number,
  rng: () => number,
  wrapY: boolean
): void {
  const bw = ctxB.canvas.width;
  const bh = ctxB.canvas.height;
  const sx = bw / w;
  const sy = bh / h;

  const drawBothRect = (
    x: number,
    y: number,
    rw: number,
    rh: number,
    alb: string | null,
    bmp: string | null,
    rgh: string | null
  ) => {
    if (alb) {
      ctxA.fillStyle = alb;
      ctxA.fillRect(x, y, rw, rh);
    }
    if (bmp) {
      ctxB.fillStyle = bmp;
      ctxB.fillRect(x * sx, y * sy, Math.max(1, rw * sx), Math.max(1, rh * sy));
    }
    if (rgh) {
      ctxR.fillStyle = rgh;
      ctxR.fillRect(x * sx, y * sy, Math.max(1, rw * sx), Math.max(1, rh * sy));
    }
  };

  if (cfg.id === 'D1') {
    // Wet cut basalt/obsidian ashlar blocks with rain-slicked bevels & subtle neon specular bounce
    const courseH = h / 8;
    const blockW = w / 4;
    for (let r = 0; r < 8; r++) {
      const y = r * courseH;
      const shift = (r % 2) * (blockW * 0.5);
      for (let c = -1; c <= 4; c++) {
        const x = c * blockW + shift;
        const delta = (rng() - 0.5) * 18;
        const shade = delta > 0 ? `rgba(110,130,155,${delta / 180})` : `rgba(4,7,12,${-delta / 95})`;
        drawBothRect(x + 2, y + 2, blockW - 4, courseH - 4, shade, null, null);
        // Wet glossy slick patch on stone face
        const rVal = Math.round(46 + rng() * 58);
        drawBothRect(
          x + 3,
          y + 3,
          blockW - 6,
          courseH - 6,
          null,
          null,
          `rgba(${rVal},${rVal},${rVal},0.42)`
        );
      }
      // Recessed wet dark mortar joints
      drawBothRect(0, y, w, 3, 'rgba(7,10,15,0.82)', '#262626', '#282828');
      drawBothRect(0, y + 3, w, 1.5, 'rgba(92,155,190,0.16)', '#b4b4b4', '#1c1c1c');
    }
    for (let r = 0; r < 8; r++) {
      const y = r * courseH;
      const shift = (r % 2) * (blockW * 0.5);
      for (let c = 0; c < 4; c++) {
        const x = (c * blockW + shift) % w;
        drawBothRect(x, y, 2.5, courseH, 'rgba(7,10,15,0.78)', '#2c2c2c', '#262626');
      }
    }
    // Rainwater sheen streaks (toroidally wrapped)
    for (let i = 0; i < 42; i++) {
      const px = rng() * w;
      const py = rng() * h;
      const len = 36 + rng() * 110;
      const width = 3 + rng() * 9;
      const tint =
        i % 3 === 0
          ? 'rgba(56,232,255,0.06)'
          : i % 3 === 1
          ? 'rgba(255,84,132,0.045)'
          : 'rgba(180,210,235,0.05)';
      stampWrapped(w, h, true, wrapY, (ox, oy) => {
        const g = ctxA.createLinearGradient(px + ox, py + oy, px + ox, py + oy + len);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.35, tint);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctxA.fillStyle = g;
        ctxA.fillRect(px + ox, py + oy, width, len);
        ctxR.fillStyle = 'rgba(20,20,20,0.5)';
        ctxR.fillRect((px + ox) * sx, (py + oy) * sy, Math.max(1, width * sx), len * sy);
      });
    }
  } else if (cfg.id === 'D2') {
    // Pale sacred limestone ashlar + neoclassical pilasters + brushed 24k gold inlay friezes
    const courseH = h / 8;
    const blockW = w / 4;
    for (let r = 0; r < 8; r++) {
      const y = r * courseH;
      const shift = (r % 2) * (blockW * 0.5);
      for (let c = -1; c <= 4; c++) {
        const x = c * blockW + shift;
        const warm = (rng() - 0.5) * 20;
        drawBothRect(
          x + 2,
          y + 2,
          blockW - 4,
          courseH - 4,
          warm > 0 ? `rgba(255,248,232,${warm / 140})` : `rgba(118,106,88,${-warm / 150})`,
          null,
          null
        );
      }
      drawBothRect(0, y, w, 2, 'rgba(116,108,92,0.58)', '#4c4c4c', '#b8b8b8');
      drawBothRect(0, y + 2, w, 1.5, 'rgba(255,252,242,0.45)', '#b6b6b6', null);
    }
    for (let r = 0; r < 8; r++) {
      const y = r * courseH;
      const shift = (r % 2) * (blockW * 0.5);
      for (let c = 0; c < 4; c++) {
        const x = (c * blockW + shift) % w;
        drawBothRect(x, y, 2, courseH, 'rgba(116,108,92,0.45)', '#525252', null);
      }
    }
    // Gilded horizontal sacred stringcourse bands (integer periodic positions)
    for (const fy of [0, h * 0.5]) {
      const gGold = ctxA.createLinearGradient(0, fy, 0, fy + 16);
      gGold.addColorStop(0, '#9c782c');
      gGold.addColorStop(0.35, '#eed178');
      gGold.addColorStop(0.65, '#cfa244');
      gGold.addColorStop(1, '#7a5c22');
      ctxA.fillStyle = gGold;
      ctxA.fillRect(0, fy, w, 14);
      drawBothRect(0, fy, w, 14, null, '#dadada', '#383838');
      // Subtle orthodox geometric key pattern inside gold band
      ctxA.fillStyle = 'rgba(72,48,14,0.42)';
      for (let kx = 0; kx < w; kx += 16) {
        ctxA.fillRect(kx + 4, fy + 4, 8, 6);
        ctxA.fillStyle = 'rgba(255,240,185,0.5)';
        ctxA.fillRect(kx + 6, fy + 6, 4, 2);
        ctxA.fillStyle = 'rgba(72,48,14,0.42)';
      }
    }
    // Subtle carved vertical pilasters at quarter-tile intervals
    for (let c = 0; c < 4; c++) {
      const px = c * blockW;
      drawBothRect(px - 6, 0, 12, h, 'rgba(232,224,208,0.42)', '#c6c6c6', '#9e9e9e');
      drawBothRect(px - 2, 0, 4, h, 'rgba(130,120,104,0.22)', '#707070', null);
    }
  } else if (cfg.id === 'D3') {
    // Brutalist board-formed poured concrete + tie-rod holes + bolted steel blast plates
    const boardH = h / 16;
    for (let b = 0; b < 16; b++) {
      const y = b * boardH;
      const shade = (rng() - 0.5) * 24;
      drawBothRect(
        0,
        y,
        w,
        boardH - 1,
        shade > 0 ? `rgba(210,218,212,${shade / 240})` : `rgba(18,22,20,${-shade / 160})`,
        null,
        null
      );
      drawBothRect(0, y, w, 1.5, 'rgba(24,28,26,0.55)', '#404040', '#c8c8c8');
    }
    // Vertical pour seams
    for (let x = 0; x < w; x += w / 2) {
      drawBothRect(x, 0, 4, h, 'rgba(22,26,24,0.72)', '#222222', '#dadada');
    }
    // Horizontal steel blast-plate reinforcement strap
    const strapY = h * 0.44;
    const strapH = h * 0.14;
    drawBothRect(0, strapY, w, strapH, '#414948', '#b8b8b8', '#686868');
    drawBothRect(0, strapY, w, 3, 'rgba(210,220,224,0.28)', '#e0e0e0', null);
    drawBothRect(0, strapY + strapH - 3, w, 3, 'rgba(12,15,14,0.65)', '#222222', null);
    // Tie-rod form holes & steel rivets with subtle weeping stains
    for (let r = 0; r < 4; r++) {
      const cy = (r + 0.5) * (h / 4);
      for (let c = 0; c < 4; c++) {
        const cx = (c + 0.5) * (w / 4);
        ctxA.fillStyle = '#252927';
        ctxA.beginPath();
        ctxA.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctxA.fill();
        ctxB.fillStyle = '#181818';
        ctxB.beginPath();
        ctxB.arc(cx * sx, cy * sy, 4.5 * sx, 0, Math.PI * 2);
        ctxB.fill();
        // Weeping mineral/rust drip under each tie hole (wrapped)
        const dripLen = 22 + rng() * 38;
        stampWrapped(w, h, true, wrapY, (ox, oy) => {
          const gd = ctxA.createLinearGradient(cx + ox, cy + oy + 4, cx + ox, cy + oy + 4 + dripLen);
          gd.addColorStop(0, 'rgba(84,52,32,0.48)');
          gd.addColorStop(1, 'rgba(84,52,32,0)');
          ctxA.fillStyle = gd;
          ctxA.fillRect(cx + ox - 3, cy + oy + 4, 6, dripLen);
        });
      }
    }
    // Rivet bolts along steel blast strap
    for (let x = 16; x < w; x += 32) {
      for (const ry of [strapY + 10, strapY + strapH - 10]) {
        ctxA.fillStyle = '#687170';
        ctxA.beginPath();
        ctxA.arc(x, ry, 3, 0, Math.PI * 2);
        ctxA.fill();
        ctxB.fillStyle = '#e8e8e8';
        ctxB.beginPath();
        ctxB.arc(x * sx, ry * sy, 3 * sx, 0, Math.PI * 2);
        ctxB.fill();
      }
    }
  } else if (cfg.id === 'D4') {
    // Russian factory running-bond red/ochre brick + soot + iron lintel rust cascades
    const brickH = 16; // divides 512 evenly (32 courses)
    const brickW = 32; // divides 512 evenly (16 bricks)
    const rowsCount = Math.round(h / brickH);
    const colsCount = Math.round(w / brickW);
    for (let r = 0; r < rowsCount; r++) {
      const y = r * brickH;
      const offset = (r % 2) * (brickW * 0.5);
      for (let c = -1; c <= colsCount; c++) {
        const x = c * brickW + offset;
        const v = rng();
        const col =
          v < 0.25
            ? 'rgba(58,26,20,0.52)'
            : v < 0.55
            ? 'rgba(138,68,46,0.38)'
            : v < 0.82
            ? 'rgba(104,48,36,0.34)'
            : 'rgba(164,98,64,0.28)';
        drawBothRect(x + 1.5, y + 1.5, brickW - 3, brickH - 3, col, '#a4a4a4', '#d4d4d4');
      }
      // Recessed mortar lines
      drawBothRect(0, y, w, 2, 'rgba(34,26,22,0.72)', '#343434', '#e8e8e8');
    }
    for (let r = 0; r < rowsCount; r++) {
      const y = r * brickH;
      const offset = (r % 2) * (brickW * 0.5);
      for (let c = 0; c < colsCount; c++) {
        const x = (c * brickW + offset) % w;
        drawBothRect(x, y, 2, brickH, 'rgba(34,26,22,0.68)', '#3a3a3a', null);
      }
    }
    // Riveted steel tie-beam strip & cascading iron oxide rust + diesel soot
    const beamY = Math.floor(h * 0.5);
    drawBothRect(0, beamY, w, 14, '#362d2a', '#d0d0d0', '#707070');
    for (let i = 0; i < 36; i++) {
      const rx = rng() * w;
      const ry = rng() < 0.55 ? beamY + 12 : rng() * h;
      const rw = 8 + rng() * 24;
      const rh = 34 + rng() * 110;
      const isRust = rng() < 0.58;
      stampWrapped(w, h, true, wrapY, (ox, oy) => {
        const gr = ctxA.createLinearGradient(rx + ox, ry + oy, rx + ox, ry + oy + rh);
        if (isRust) {
          gr.addColorStop(0, 'rgba(146,56,22,0.56)');
          gr.addColorStop(0.55, 'rgba(116,42,18,0.28)');
          gr.addColorStop(1, 'rgba(92,34,14,0)');
        } else {
          gr.addColorStop(0, 'rgba(14,12,12,0.58)');
          gr.addColorStop(1, 'rgba(14,12,12,0)');
        }
        ctxA.fillStyle = gr;
        ctxA.fillRect(rx + ox, ry + oy, rw, rh);
      });
    }
  } else if (cfg.id === 'D7') {
    // Khrushchevka worn stucco plaster over prefab seams — patched a hundred times!
    const panelW = w / 2;
    const panelH = h / 4;
    for (let r = 0; r < 4; r++) {
      drawBothRect(0, r * panelH, w, 3, 'rgba(66,60,54,0.68)', '#2e2e2e', '#e2e2e2');
    }
    for (let c = 0; c < 2; c++) {
      drawBothRect(c * panelW, 0, 3, h, 'rgba(66,60,54,0.62)', '#323232', null);
    }
    // Older 2049 pastel sage/ochre undercoat patches peeking through
    const patchColors = [
      'rgba(128,136,126,0.65)', // raw grey cement repair
      'rgba(182,174,158,0.58)', // pale gypsum putty patch
      'rgba(136,154,140,0.42)', // faded 2049 Soviet mint paint
      'rgba(176,144,116,0.44)', // weathered ochre stucco patch
      'rgba(112,114,112,0.56)', // dark wet mortar smear
    ];
    for (let i = 0; i < 42; i++) {
      const px = rng() * w;
      const py = rng() * h;
      const pw = 18 + rng() * 68;
      const ph = 14 + rng() * 54;
      const col = patchColors[Math.floor(rng() * patchColors.length)];
      stampWrapped(w, h, true, wrapY, (ox, oy) => {
        ctxA.fillStyle = col;
        ctxA.fillRect(px + ox, py + oy, pw, ph);
        ctxA.strokeStyle = 'rgba(54,48,42,0.34)';
        ctxA.lineWidth = 1.5;
        ctxA.strokeRect(px + ox, py + oy, pw, ph);
        ctxB.fillStyle = rng() > 0.5 ? 'rgba(176,176,176,0.55)' : 'rgba(84,84,84,0.55)';
        ctxB.fillRect((px + ox) * sx, (py + oy) * sy, pw * sx, ph * sy);
      });
    }
    // Hairline plaster cracks (wrapped)
    ctxA.strokeStyle = 'rgba(46,42,38,0.42)';
    ctxA.lineWidth = 1.1;
    for (let i = 0; i < 18; i++) {
      let cx = rng() * w;
      let cy = rng() * h;
      const pts: Array<[number, number]> = [[cx, cy]];
      for (let s = 0; s < 5; s++) {
        cx += (rng() - 0.5) * 34;
        cy += (rng() - 0.5) * 34;
        pts.push([cx, cy]);
      }
      stampWrapped(w, h, true, wrapY, (ox, oy) => {
        ctxA.beginPath();
        ctxA.moveTo(pts[0][0] + ox, pts[0][1] + oy);
        for (let s = 1; s < pts.length; s++) {
          ctxA.lineTo(pts[s][0] + ox, pts[s][1] + oy);
        }
        ctxA.stroke();
      });
    }
  } else if (cfg.id === 'D8') {
    // Salt-weathered marine concrete blocks + white salt crust efflorescence + glossy black tar seams
    const courseH = h / 4;
    const blockW = w / 2;
    for (let r = 0; r < 4; r++) {
      const y = r * courseH;
      // Thick black bitumen tar waterproofing seam
      drawBothRect(0, y, w, 6, 'rgba(16,18,22,0.88)', '#383838', '#262626');
      // White crystalline sea-salt crust bleeding below each seam
      const gSalt = ctxA.createLinearGradient(0, y + 5, 0, y + 34);
      gSalt.addColorStop(0, 'rgba(222,230,234,0.44)');
      gSalt.addColorStop(0.5, 'rgba(205,216,222,0.18)');
      gSalt.addColorStop(1, 'rgba(205,216,222,0)');
      ctxA.fillStyle = gSalt;
      ctxA.fillRect(0, y + 5, w, 30);
    }
    for (let c = 0; c < 2; c++) {
      drawBothRect(c * blockW, 0, 5, h, 'rgba(18,20,24,0.84)', '#303030', '#2a2a2a');
    }
    // Salt crusts & black tar splash smears (toroidally wrapped)
    for (let i = 0; i < 34; i++) {
      const px = rng() * w;
      const py = rng() * h;
      const rx = 14 + rng() * 44;
      const ry = 10 + rng() * 32;
      const isTar = rng() < 0.42;
      stampWrapped(w, h, true, wrapY, (ox, oy) => {
        const g = ctxA.createRadialGradient(px + ox, py + oy, 2, px + ox, py + oy, Math.max(rx, ry));
        if (isTar) {
          g.addColorStop(0, 'rgba(12,14,18,0.72)');
          g.addColorStop(0.7, 'rgba(20,24,28,0.34)');
          g.addColorStop(1, 'rgba(20,24,28,0)');
          ctxR.fillStyle = 'rgba(28,28,28,0.65)';
          ctxR.beginPath();
          ctxR.ellipse((px + ox) * sx, (py + oy) * sy, rx * sx, ry * sy, 0, 0, Math.PI * 2);
          ctxR.fill();
        } else {
          g.addColorStop(0, 'rgba(232,238,242,0.48)');
          g.addColorStop(0.6, 'rgba(210,220,226,0.22)');
          g.addColorStop(1, 'rgba(210,220,226,0)');
          ctxR.fillStyle = 'rgba(235,235,235,0.55)';
          ctxR.beginPath();
          ctxR.ellipse((px + ox) * sx, (py + oy) * sy, rx * sx, ry * sy, 0, 0, Math.PI * 2);
          ctxR.fill();
        }
        ctxA.fillStyle = g;
        ctxA.beginPath();
        ctxA.ellipse(px + ox, py + oy, rx, ry, 0, 0, Math.PI * 2);
        ctxA.fill();
      });
    }
  } else if (cfg.id === 'D9') {
    // Stargate Peninsula — ultra-clean pale aerospace composite panels, surgical shadow-gaps
    const panelW = w / 4;
    const panelH = h / 4;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const px = c * panelW;
        const py = r * panelH;
        const tint = ((r + c) % 2 === 0 ? 1 : -1) * 4;
        drawBothRect(
          px + 2,
          py + 2,
          panelW - 4,
          panelH - 4,
          tint > 0 ? 'rgba(255,255,255,0.16)' : 'rgba(165,180,192,0.14)',
          '#949494',
          '#565656'
        );
        // Microscopic anodized corner fasteners & clean calibration tick
        ctxA.fillStyle = 'rgba(130,145,158,0.55)';
        ctxA.fillRect(px + 8, py + 8, 3, 3);
        ctxA.fillRect(px + panelW - 11, py + 8, 3, 3);
        ctxA.fillRect(px + 8, py + panelH - 11, 3, 3);
        ctxA.fillRect(px + panelW - 11, py + panelH - 11, 3, 3);
        if (r === 1 && c % 2 === 0) {
          ctxA.fillStyle = 'rgba(98,198,224,0.45)';
          ctxA.fillRect(px + 14, py + panelH - 12, 22, 2);
        }
      }
    }
    // Razor-sharp recessed shadow-gap joints
    for (let r = 0; r < 4; r++) {
      drawBothRect(0, r * panelH, w, 2, 'rgba(104,116,128,0.75)', '#282828', '#989898');
      drawBothRect(0, r * panelH + 2, w, 1, 'rgba(255,255,255,0.65)', '#cfcfcf', null);
    }
    for (let c = 0; c < 4; c++) {
      drawBothRect(c * panelW, 0, 2, h, 'rgba(104,116,128,0.75)', '#282828', '#989898');
      drawBothRect(c * panelW + 2, 0, 1, h, 'rgba(255,255,255,0.65)', '#cfcfcf', null);
    }
  } else if (cfg.id === 'D10') {
    // Elysia 2049 — polished white Carrara marble veining + fluted champagne-gold inlay strips
    const veinNoise = createPeriodicFbm(cfg.seed + 551, 3, 3, 4);
    ctxA.save();
    for (let i = 0; i < 16; i++) {
      const startY = rng() * h;
      stampWrapped(w, h, true, wrapY, (ox, oy) => {
        ctxA.strokeStyle = i % 3 === 0 ? 'rgba(202,184,142,0.22)' : 'rgba(168,166,162,0.18)';
        ctxA.lineWidth = 1.2 + (i % 3) * 0.7;
        ctxA.beginPath();
        for (let step = 0; step <= 32; step++) {
          const u = step / 32;
          const x = u * w + ox;
          const v = ((startY / h) + (veinNoise(u, (startY / h) % 1) - 0.5) * 0.25);
          const y = v * h + oy;
          if (step === 0) ctxA.moveTo(x, y);
          else ctxA.lineTo(x, y);
        }
        ctxA.stroke();
      });
    }
    ctxA.restore();

    // Precision polished marble slab seams + brushed champagne-gold art-deco flutes
    const slabH = h / 4;
    const slabW = w / 4;
    for (let r = 0; r < 4; r++) {
      drawBothRect(0, r * slabH, w, 1.5, 'rgba(182,174,160,0.52)', '#585858', '#444444');
    }
    for (let c = 0; c < 4; c++) {
      const x = c * slabW;
      drawBothRect(x, 0, 1.5, h, 'rgba(182,174,160,0.48)', '#585858', '#444444');
      // Gleaming vertical champagne-gold inlay pilaster strip
      const gg = ctxA.createLinearGradient(x + 4, 0, x + 14, 0);
      gg.addColorStop(0, '#b58e38');
      gg.addColorStop(0.5, '#fae094');
      gg.addColorStop(1, '#a88230');
      ctxA.fillStyle = gg;
      ctxA.fillRect(x + 4, 0, 8, h);
      drawBothRect(x + 4, 0, 8, h, null, '#dcdcdc', '#282828');
    }
    // Horizontal champagne-gold belt reveal
    const gh = ctxA.createLinearGradient(0, h * 0.5 - 5, 0, h * 0.5 + 5);
    gh.addColorStop(0, '#a88332');
    gh.addColorStop(0.5, '#ffe8a8');
    gh.addColorStop(1, '#9c772a');
    ctxA.fillStyle = gh;
    ctxA.fillRect(0, h * 0.5 - 5, w, 10);
    drawBothRect(0, h * 0.5 - 5, w, 10, null, '#e4e4e4', '#262626');
  }
}

function buildDistrictFacadeFamily(
  cfg: DistrictSkinConfig,
  anisotropy: number,
  emissiveList: THREE.MeshStandardMaterial[],
  createdTextures: THREE.Texture[]
): DistrictFacadeFamily {
  const track = <T extends THREE.CanvasTexture>(t: T): T => {
    createdTextures.push(t);
    return t;
  };

  // -------------------------------------------------------------------------
  // 1. SEAMLESS BASE WALL (512x512 Albedo, 256x256 Bump, 256x256 Roughness)
  // -------------------------------------------------------------------------
  const [cWallA, ctxWA] = makeCanvas(512, 512);
  const [cWallB, ctxWB] = makeCanvas(256, 256);
  const [cWallR, ctxWR] = makeCanvas(256, 256);
  const wallRng = mulberry32(cfg.seed + 11);

  fillPeriodicSurfaceField(
    ctxWA,
    ctxWB,
    ctxWR,
    cfg.seed + 17,
    cfg.baseRgb,
    cfg.varRgb,
    cfg.baseRough,
    cfg.varRough,
    62,
    cfg.id === 'D9' || cfg.id === 'D10' ? 4 : 6,
    cfg.id === 'D9' || cfg.id === 'D10' ? 4 : 6,
    4
  );
  paintDistrictWallPattern(cfg, ctxWA, ctxWB, ctxWR, 512, 512, wallRng, true);

  const baseWallMap = track(finalizeSeamlessTex(cWallA, true, anisotropy, true, true));
  const baseWallBump = track(finalizeSeamlessTex(cWallB, false, anisotropy, true, true));
  const baseWallRough = track(finalizeSeamlessTex(cWallR, false, anisotropy, true, true));
  const baseWallMat = new THREE.MeshStandardMaterial({
    map: baseWallMap,
    bumpMap: baseWallBump,
    bumpScale: cfg.bumpScale,
    roughnessMap: baseWallRough,
    roughness: 1.0,
    metalness: cfg.metalness,
  });

  // -------------------------------------------------------------------------
  // 2. WINDOW GRID — LIT & UNLIT VARIANTS + EMISSIVE MAP (512x512 seamless)
  // -------------------------------------------------------------------------
  const [cWinLit, ctxWL] = makeCanvas(512, 512);
  const [cWinUnlit, ctxWU] = makeCanvas(512, 512);
  const [cWinEmi, ctxWE] = makeCanvas(512, 512);
  const [cWinB, ctxWinB] = makeCanvas(256, 256);
  const [cWinR, ctxWinR] = makeCanvas(256, 256);
  const winRng = mulberry32(cfg.seed + 233);

  // Start from identical seamless base wall skin so window bays sit organically in the same masonry
  ctxWL.drawImage(cWallA, 0, 0);
  ctxWU.drawImage(cWallA, 0, 0);
  ctxWinB.drawImage(cWallB, 0, 0);
  ctxWinR.drawImage(cWallR, 0, 0);
  ctxWE.fillStyle = '#000000';
  ctxWE.fillRect(0, 0, 512, 512);

  const cellW = 512 / cfg.cols;
  const cellH = 512 / cfg.rows;
  const wbScale = 256 / 512;

  // Horizontal architectural floor slab / lintel stringcourse across each row
  for (let r = 0; r < cfg.rows; r++) {
    const ry = r * cellH;
    for (const ctx of [ctxWL, ctxWU]) {
      ctx.fillStyle = cfg.seamColor;
      ctx.fillRect(0, ry, 512, 3);
      ctx.fillStyle = cfg.trimColor;
      ctx.fillRect(0, ry + 3, 512, cfg.id === 'D2' || cfg.id === 'D10' ? 6 : 3);
    }
    ctxWinB.fillStyle = '#363636';
    ctxWinB.fillRect(0, ry * wbScale, 256, 2);
    ctxWinB.fillStyle = '#d4d4d4';
    ctxWinB.fillRect(0, (ry + 3) * wbScale, 256, 3);
  }

  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      const cx = c * cellW;
      const cy = r * cellH;

      // District-authentic window proportions
      const padX =
        cfg.id === 'D10'
          ? cellW * 0.12
          : cfg.id === 'D9'
          ? cellW * 0.1
          : cfg.id === 'D3'
          ? cellW * 0.16
          : cfg.id === 'D4'
          ? cellW * 0.15
          : cellW * 0.19;
      const padTop =
        cfg.id === 'D3' ? cellH * 0.34 : cfg.id === 'D2' ? cellH * 0.22 : cellH * 0.18;
      const padBot =
        cfg.id === 'D3' ? cellH * 0.32 : cfg.id === 'D10' ? cellH * 0.12 : cellH * 0.18;

      const wx = cx + padX;
      const wy = cy + padTop;
      const ww = cellW - padX * 2;
      const wh = cellH - padTop - padBot;

      const isArched = cfg.id === 'D2' || (cfg.id === 'D10' && r === 0);

      // Outer architectural casing / reveal shadow
      for (const ctx of [ctxWL, ctxWU]) {
        ctx.fillStyle = cfg.frameColor;
        ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
        if (isArched) {
          ctx.beginPath();
          ctx.arc(wx + ww * 0.5, wy, ww * 0.54, Math.PI, 0);
          ctx.fill();
        }
        // Sill ledge + shadow drop underneath
        ctx.fillStyle = cfg.trimColor;
        ctx.fillRect(wx - 6, wy + wh + 2, ww + 12, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.fillRect(wx - 5, wy + wh + 7, ww + 10, 4);
      }

      // Recessed window opening in bump & glossy glazing in roughness
      ctxWinB.fillStyle = '#1e1e1e';
      ctxWinB.fillRect(wx * wbScale, wy * wbScale, ww * wbScale, wh * wbScale);
      ctxWinR.fillStyle = cfg.id === 'D10' || cfg.id === 'D9' ? '#181818' : '#2c2c2c';
      ctxWinR.fillRect(wx * wbScale, wy * wbScale, ww * wbScale, wh * wbScale);

      // Unlit / daytime reflective glazing gradient (subtle sky-to-interior depth)
      const drawUnlitGlass = (ctx: CanvasRenderingContext2D) => {
        const gGlass = ctx.createLinearGradient(wx, wy, wx + ww * 0.4, wy + wh);
        gGlass.addColorStop(0, cfg.id === 'D10' ? '#4f6478' : cfg.id === 'D9' ? '#385266' : '#263442');
        gGlass.addColorStop(0.45, cfg.glassDayColor);
        gGlass.addColorStop(1, '#090e14');
        ctx.fillStyle = gGlass;
        ctx.fillRect(wx, wy, ww, wh);
        if (isArched) {
          ctx.beginPath();
          ctx.arc(wx + ww * 0.5, wy, ww * 0.48, Math.PI, 0);
          ctx.fill();
        }
        // Subtle diagonal sky specular highlight across unlit glass
        ctx.fillStyle =
          cfg.id === 'D10' || cfg.id === 'D9'
            ? 'rgba(220,238,255,0.22)'
            : 'rgba(180,205,228,0.1)';
        ctx.beginPath();
        ctx.moveTo(wx + 2, wy + 2);
        ctx.lineTo(wx + ww * 0.52, wy + 2);
        ctx.lineTo(wx + 2, wy + wh * 0.56);
        ctx.closePath();
        ctx.fill();
      };

      drawUnlitGlass(ctxWU);
      drawUnlitGlass(ctxWL);

      // Living window distribution: some lit warm, some lit cold, most dark!
      const isLit = winRng() < cfg.litChance;
      if (isLit) {
        const isWarm = winRng() < cfg.warmRatio;
        const palette = isWarm ? cfg.warmColors : cfg.coldColors;
        const glowHex = palette[Math.floor(winRng() * palette.length)];
        const intensityAlpha = 0.58 + winRng() * 0.42;

        // Interior depth gradient (ceiling brighter, floor softer + curtains/blinds)
        const gEmi = ctxWE.createLinearGradient(wx, wy, wx, wy + wh);
        gEmi.addColorStop(0, glowHex);
        gEmi.addColorStop(0.75, glowHex);
        gEmi.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctxWE.save();
        ctxWE.globalAlpha = intensityAlpha;
        ctxWE.fillStyle = gEmi;
        ctxWE.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        if (isArched) {
          ctxWE.beginPath();
          ctxWE.arc(wx + ww * 0.5, wy, ww * 0.46, Math.PI, 0);
          ctxWE.fill();
        }
        ctxWE.restore();

        // Warm interior room backing on lit albedo too so lit windows read in dusk/day
        ctxWL.save();
        ctxWL.globalAlpha = 0.65;
        ctxWL.fillStyle = glowHex;
        ctxWL.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        ctxWL.restore();

        // Domestic curtains / Venetian blinds / interior furniture silhouettes
        if (winRng() < 0.65) {
          const blindStyle = winRng();
          ctxWE.fillStyle = 'rgba(0,0,0,0.48)';
          ctxWL.fillStyle = 'rgba(18,22,28,0.45)';
          if (blindStyle < 0.4) {
            // Side drape curtain
            const drapeW = (ww - 4) * (0.28 + winRng() * 0.2);
            const leftSide = winRng() > 0.5;
            const dx = leftSide ? wx + 2 : wx + ww - 2 - drapeW;
            ctxWE.fillRect(dx, wy + 2, drapeW, wh - 4);
            ctxWL.fillRect(dx, wy + 2, drapeW, wh - 4);
          } else if (blindStyle < 0.78) {
            // Partially lowered horizontal blinds
            const blindH = (wh - 4) * (0.25 + winRng() * 0.35);
            ctxWE.fillRect(wx + 2, wy + 2, ww - 4, blindH);
            ctxWL.fillRect(wx + 2, wy + 2, ww - 4, blindH);
          } else {
            // Interior room partition shadow
            ctxWE.fillRect(wx + 2, wy + wh * 0.62, ww - 4, wh * 0.36);
          }
        }
      }

      // District-specific mullions, muntins, armor bars, and balconies
      const drawMullion = (x: number, y: number, mw: number, mh: number) => {
        ctxWL.fillStyle = cfg.frameColor;
        ctxWL.fillRect(x, y, mw, mh);
        ctxWU.fillStyle = cfg.frameColor;
        ctxWU.fillRect(x, y, mw, mh);
        ctxWE.fillStyle = '#000000';
        ctxWE.fillRect(x, y, mw, mh);
      };

      if (cfg.id === 'D4') {
        // Multi-pane industrial factory steel sash (3x3 panes)
        drawMullion(wx + ww * 0.33, wy, 2.5, wh);
        drawMullion(wx + ww * 0.66, wy, 2.5, wh);
        drawMullion(wx, wy + wh * 0.33, ww, 2.5);
        drawMullion(wx, wy + wh * 0.66, ww, 2.5);
      } else if (cfg.id === 'D3') {
        // Bunker vertical blast dividers
        drawMullion(wx + ww * 0.5 - 2, wy, 4, wh);
        drawMullion(wx, wy + wh * 0.5 - 1.5, ww, 3);
      } else if (cfg.id === 'D9') {
        // Ultra-thin aerospace anodized divider
        drawMullion(wx + ww * 0.5 - 1, wy, 2, wh);
      } else if (cfg.id === 'D10') {
        // Fluted champagne-gold curtain-wall mullions
        drawMullion(wx + ww * 0.5 - 1.5, wy, 3, wh);
        drawMullion(wx, wy + wh * 0.28, ww, 3);
      } else {
        // Classic Russian casement + upper transom bar
        drawMullion(wx + ww * 0.5 - 1.5, wy, 3, wh);
        drawMullion(wx, wy + wh * 0.34, ww, 2.5);
      }

      // D7 Khrushchevka recessed concrete balconies on alternating bays
      if (cfg.id === 'D7' && c % 2 === 1) {
        const balY = wy + wh * 0.52;
        const balH = wh * 0.56;
        for (const ctx of [ctxWL, ctxWU]) {
          ctx.fillStyle = '#8b857a';
          ctx.fillRect(wx - 5, balY, ww + 10, balH);
          ctx.fillStyle = '#5c5850';
          ctx.fillRect(wx - 5, balY, ww + 10, 4);
        }
        ctxWE.fillStyle = '#000000';
        ctxWE.fillRect(wx - 5, balY, ww + 10, balH);
        ctxWinB.fillStyle = '#e0e0e0';
        ctxWinB.fillRect((wx - 5) * wbScale, balY * wbScale, (ww + 10) * wbScale, balH * wbScale);
      }
    }
  }

  const winLitMap = track(finalizeSeamlessTex(cWinLit, true, anisotropy, true, true));
  const winUnlitMap = track(finalizeSeamlessTex(cWinUnlit, true, anisotropy, true, true));
  const winEmiMap = track(finalizeSeamlessTex(cWinEmi, true, anisotropy, true, true));
  const winBumpMap = track(finalizeSeamlessTex(cWinB, false, anisotropy, true, true));
  const winRoughMap = track(finalizeSeamlessTex(cWinR, false, anisotropy, true, true));

  const litMaterial = new THREE.MeshStandardMaterial({
    map: winLitMap,
    emissiveMap: winEmiMap,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 1.35,
    bumpMap: winBumpMap,
    bumpScale: cfg.bumpScale,
    roughnessMap: winRoughMap,
    roughness: 1.0,
    metalness: cfg.metalness,
  });
  emissiveList.push(litMaterial);

  const unlitMaterial = new THREE.MeshStandardMaterial({
    map: winUnlitMap,
    emissiveMap: winEmiMap,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.08,
    bumpMap: winBumpMap,
    bumpScale: cfg.bumpScale,
    roughnessMap: winRoughMap,
    roughness: 1.0,
    metalness: cfg.metalness,
  });

  // -------------------------------------------------------------------------
  // 3. GROUND-FLOOR TREATMENT (512x256 horizontally seamless: portals, plinths, shutters)
  // -------------------------------------------------------------------------
  const [cGfA, ctxGfA] = makeCanvas(512, 256);
  const [cGfE, ctxGfE] = makeCanvas(512, 256);
  const [cGfB, ctxGfB] = makeCanvas(256, 128);
  const [cGfR, ctxGfR] = makeCanvas(256, 128);
  const gfRng = mulberry32(cfg.seed + 509);

  // Tile top half of seamless base wall onto ground floor (seamless horizontally!)
  ctxGfA.drawImage(cWallA, 0, 0, 512, 256, 0, 0, 512, 256);
  ctxGfB.drawImage(cWallB, 0, 0, 256, 128, 0, 0, 256, 128);
  ctxGfR.drawImage(cWallR, 0, 0, 256, 128, 0, 0, 256, 128);
  ctxGfE.fillStyle = '#000000';
  ctxGfE.fillRect(0, 0, 512, 256);

  // Upper cornice fascia lintel separating ground floor from upper stories
  ctxGfA.fillStyle = cfg.trimColor;
  ctxGfA.fillRect(0, 0, 512, 18);
  ctxGfA.fillStyle = cfg.seamColor;
  ctxGfA.fillRect(0, 18, 512, 5);
  ctxGfB.fillStyle = '#dedede';
  ctxGfB.fillRect(0, 0, 256, 9);

  // Ground-contact damp splash / stone plinth base skirt
  const plinthH = cfg.id === 'D8' ? 52 : cfg.id === 'D3' ? 42 : 28;
  const gPlinth = ctxGfA.createLinearGradient(0, 256 - plinthH, 0, 256);
  if (cfg.id === 'D8') {
    gPlinth.addColorStop(0, 'rgba(18,22,26,0.2)');
    gPlinth.addColorStop(0.35, 'rgba(14,16,20,0.86)');
    gPlinth.addColorStop(1, 'rgba(8,10,12,0.96)');
  } else if (cfg.id === 'D10') {
    gPlinth.addColorStop(0, 'rgba(218,212,202,0.45)');
    gPlinth.addColorStop(1, 'rgba(176,168,154,0.68)');
  } else if (cfg.id === 'D9') {
    gPlinth.addColorStop(0, 'rgba(156,166,176,0.35)');
    gPlinth.addColorStop(1, 'rgba(116,126,136,0.55)');
  } else {
    gPlinth.addColorStop(0, 'rgba(12,15,18,0)');
    gPlinth.addColorStop(1, 'rgba(10,12,16,0.72)');
  }
  ctxGfA.fillStyle = gPlinth;
  ctxGfA.fillRect(0, 256 - plinthH, 512, plinthH);

  // District-specific ground bays (2 wide bays across 512px -> clean horizontal repeat)
  const bayW = 256;
  for (let b = 0; b < 2; b++) {
    const bx = b * bayW;
    const isDoorBay = b === 0;
    const ox = bx + 24;
    const oy = 46;
    const ow = bayW - 48;
    const oh = 256 - oy;

    // Frame surround
    ctxGfA.fillStyle = cfg.frameColor;
    ctxGfA.fillRect(ox - 8, oy - 8, ow + 16, oh + 8);
    ctxGfB.fillStyle = '#262626';
    ctxGfB.fillRect(ox * 0.5, oy * 0.5, ow * 0.5, oh * 0.5);

    if (cfg.id === 'D3' || cfg.id === 'D4' || cfg.id === 'D8') {
      // Heavy industrial / bunker / quay steel roll-up shutters or armored bulkhead doors
      ctxGfA.fillStyle = cfg.id === 'D4' ? '#3f322c' : cfg.id === 'D8' ? '#2c363e' : '#3a4240';
      ctxGfA.fillRect(ox, oy, ow, oh);
      for (let sy = oy + 8; sy < 252; sy += 12) {
        ctxGfA.fillStyle = 'rgba(0,0,0,0.35)';
        ctxGfA.fillRect(ox, sy, ow, 3);
        ctxGfB.fillStyle = '#505050';
        ctxGfB.fillRect(ox * 0.5, sy * 0.5, ow * 0.5, 1.5);
      }
      // Subtle industrial hazard / bulkhead lamp above portal
      if (cfg.id === 'D3') {
        ctxGfA.fillStyle = '#c49828';
        for (let hx = ox; hx < ox + ow; hx += 22) {
          ctxGfA.fillRect(hx, oy - 7, 10, 5);
        }
      }
      const lampCol = cfg.id === 'D3' ? '#92d8c8' : '#ffaa48';
      ctxGfA.fillStyle = lampCol;
      ctxGfA.fillRect(ox + ow * 0.5 - 16, oy - 18, 32, 7);
      ctxGfE.fillStyle = lampCol;
      ctxGfE.fillRect(ox + ow * 0.5 - 16, oy - 18, 32, 7);
    } else if (cfg.id === 'D7') {
      // Soviet pod'ezd steel entrance door + small frosted transom + weathered basement grate
      if (isDoorBay) {
        ctxGfA.fillStyle = '#38424a';
        ctxGfA.fillRect(ox + 34, oy + 26, ow - 68, oh - 26);
        ctxGfA.fillStyle = '#22282d';
        ctxGfA.fillRect(ox + 38, oy + 32, (ow - 76) * 0.62, oh - 36);
        // Glowing frosted stairwell transom above pod'ezd door
        ctxGfA.fillStyle = '#d8b472';
        ctxGfA.fillRect(ox + 34, oy + 4, ow - 68, 18);
        ctxGfE.fillStyle = '#ffbe68';
        ctxGfE.fillRect(ox + 36, oy + 6, ow - 72, 14);
      } else {
        // Ground-floor residential barred window + concrete sill
        ctxGfA.fillStyle = '#182028';
        ctxGfA.fillRect(ox + 18, oy + 12, ow - 36, 104);
        ctxGfE.fillStyle = gfRng() < 0.7 ? '#ffc472' : '#7cb2d8';
        ctxGfE.fillRect(ox + 22, oy + 16, ow - 44, 96);
        // Security grate bars
        ctxGfA.fillStyle = '#262a2e';
        ctxGfE.fillStyle = '#000000';
        for (let gx = ox + 30; gx < ox + ow - 22; gx += 18) {
          ctxGfA.fillRect(gx, oy + 12, 3, 104);
          ctxGfE.fillRect(gx, oy + 12, 3, 104);
        }
      }
    } else {
      // D1 (Nightlife), D2 (Sacred Portal), D9 (Pressurized Composite Colonnade), D10 (Gold Atrium)
      const gInt = ctxGfA.createLinearGradient(ox, oy, ox, 256);
      const emiHex =
        cfg.id === 'D1'
          ? b === 0
            ? '#ff7a45'
            : '#38e8ff'
          : cfg.id === 'D2'
          ? '#ffd078'
          : cfg.id === 'D9'
          ? '#a8f0ff'
          : '#ffe39e';
      gInt.addColorStop(0, cfg.id === 'D10' ? '#584830' : cfg.id === 'D9' ? '#1c3242' : '#241e1a');
      gInt.addColorStop(1, '#0c1016');
      ctxGfA.fillStyle = gInt;
      ctxGfA.fillRect(ox, oy, ow, oh);

      // Arched portal head for D2 Reliquary
      if (cfg.id === 'D2') {
        ctxGfA.fillStyle = '#221c16';
        ctxGfA.beginPath();
        ctxGfA.arc(ox + ow * 0.5, oy + 24, ow * 0.48, Math.PI, 0);
        ctxGfA.fill();
        ctxGfA.strokeStyle = '#e5c160';
        ctxGfA.lineWidth = 4;
        ctxGfA.stroke();
      }

      // Interior glow
      ctxGfE.save();
      ctxGfE.globalAlpha = cfg.id === 'D1' ? 0.78 : cfg.id === 'D10' ? 0.85 : 0.62;
      ctxGfE.fillStyle = emiHex;
      ctxGfE.fillRect(ox + 6, oy + 8, ow - 12, oh - 16);
      ctxGfE.restore();

      // Glazing mullions & door stile
      ctxGfA.fillStyle = cfg.frameColor;
      ctxGfE.fillStyle = '#000000';
      const midX = ox + ow * 0.5 - 3;
      ctxGfA.fillRect(midX, oy, 6, oh);
      ctxGfE.fillRect(midX, oy, 6, oh);
      ctxGfA.fillRect(ox, oy + 36, ow, 5);
      ctxGfE.fillRect(ox, oy + 36, ow, 5);

      // Glass gloss in roughness map
      ctxGfR.fillStyle = '#1e1e1e';
      ctxGfR.fillRect(ox * 0.5, oy * 0.5, ow * 0.5, oh * 0.5);
    }
  }

  const gfMap = track(finalizeSeamlessTex(cGfA, true, anisotropy, true, false));
  const gfEmiMap = track(finalizeSeamlessTex(cGfE, true, anisotropy, true, false));
  const gfBumpMap = track(finalizeSeamlessTex(cGfB, false, anisotropy, true, false));
  const gfRoughMap = track(finalizeSeamlessTex(cGfR, false, anisotropy, true, false));

  const gfMat = new THREE.MeshStandardMaterial({
    map: gfMap,
    emissiveMap: gfEmiMap,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.95,
    bumpMap: gfBumpMap,
    bumpScale: cfg.bumpScale,
    roughnessMap: gfRoughMap,
    roughness: 1.0,
    metalness: cfg.metalness + 0.06,
  });
  emissiveList.push(gfMat);

  // -------------------------------------------------------------------------
  // 4. ROOFLINE / PARAPET FRIEZE (512x128 horiz seamless) + ROOF CAP (256x256 seamless)
  // -------------------------------------------------------------------------
  const [cParA, ctxPA] = makeCanvas(512, 128);
  const [cParB, ctxPB] = makeCanvas(256, 64);
  const [cParR, ctxPR] = makeCanvas(256, 64);

  ctxPA.drawImage(cWallA, 0, 0, 512, 128, 0, 0, 512, 128);
  ctxPB.drawImage(cWallB, 0, 0, 256, 64, 0, 0, 256, 64);
  ctxPR.drawImage(cWallR, 0, 0, 256, 64, 0, 0, 256, 64);

  // Top coping cap
  ctxPA.fillStyle = cfg.trimColor;
  ctxPA.fillRect(0, 0, 512, 22);
  ctxPA.fillStyle = cfg.seamColor;
  ctxPA.fillRect(0, 22, 512, 8);
  ctxPB.fillStyle = '#e8e8e8';
  ctxPB.fillRect(0, 0, 256, 11);
  ctxPB.fillStyle = '#242424';
  ctxPB.fillRect(0, 11, 256, 4);

  // District-specific cornice / dentil / crenellation / gold frieze treatment
  if (cfg.id === 'D2' || cfg.id === 'D10') {
    // Classical gilded frieze + carved dentil blocks
    const gg = ctxPA.createLinearGradient(0, 32, 0, 58);
    gg.addColorStop(0, '#9c782a');
    gg.addColorStop(0.5, '#fae092');
    gg.addColorStop(1, '#8c6b24');
    ctxPA.fillStyle = gg;
    ctxPA.fillRect(0, 32, 512, 24);
    ctxPR.fillStyle = '#303030';
    ctxPR.fillRect(0, 16, 256, 12);
    for (let x = 0; x < 512; x += 24) {
      ctxPA.fillStyle = cfg.trimColor;
      ctxPA.fillRect(x + 4, 62, 12, 18);
      ctxPB.fillStyle = '#dadada';
      ctxPB.fillRect((x + 4) * 0.5, 31, 6, 9);
    }
  } else if (cfg.id === 'D3') {
    // Heavy bolted steel blast-coping & drain scuppers
    ctxPA.fillStyle = '#3c4342';
    ctxPA.fillRect(0, 0, 512, 38);
    for (let x = 16; x < 512; x += 64) {
      ctxPA.fillStyle = '#1b1f1e';
      ctxPA.fillRect(x, 48, 22, 14);
      ctxPB.fillStyle = '#141414';
      ctxPB.fillRect(x * 0.5, 24, 11, 7);
    }
  } else if (cfg.id === 'D4') {
    // Sawtooth corbelled brick cornice + rusted flashing
    ctxPA.fillStyle = '#5a3220';
    ctxPA.fillRect(0, 0, 512, 20);
    for (let x = 0; x < 512; x += 32) {
      ctxPA.fillStyle = '#4c261c';
      ctxPA.fillRect(x + 4, 24, 16, 20);
      ctxPA.fillStyle = 'rgba(138,52,20,0.45)';
      ctxPA.fillRect(x + 6, 44, 12, 48);
    }
  } else if (cfg.id === 'D9') {
    // Razor-sharp aerospace anodized fascia + subtle cyan status hairline
    ctxPA.fillStyle = '#dce4ea';
    ctxPA.fillRect(0, 0, 512, 34);
    ctxPA.fillStyle = '#7e8e9c';
    ctxPA.fillRect(0, 34, 512, 4);
    ctxPA.fillStyle = 'rgba(98,216,245,0.65)';
    ctxPA.fillRect(0, 44, 512, 3);
  } else if (cfg.id === 'D1') {
    // Dark basalt coping with subtle damp neon-cove underlip
    ctxPA.fillStyle = '#1b222c';
    ctxPA.fillRect(0, 0, 512, 28);
    ctxPA.fillStyle = 'rgba(56,232,255,0.38)';
    ctxPA.fillRect(0, 30, 512, 4);
  } else {
    // D7 / D8 weathered tar flashing & concrete scupper drip marks
    ctxPA.fillStyle = '#202428';
    ctxPA.fillRect(0, 0, 512, 18);
    for (let x = 24; x < 512; x += 64) {
      const gd = ctxPA.createLinearGradient(x, 20, x, 115);
      gd.addColorStop(0, 'rgba(18,20,24,0.62)');
      gd.addColorStop(1, 'rgba(18,20,24,0)');
      ctxPA.fillStyle = gd;
      ctxPA.fillRect(x, 20, 14, 95);
    }
  }

  // Seamless roof deck cap (256x256)
  const [cRoofDeck, ctxRD] = makeCanvas(256, 256);
  const [cRoofDummyB, ctxRDB] = makeCanvas(64, 64);
  const [cRoofDummyR, ctxRDR] = makeCanvas(64, 64);
  fillPeriodicSurfaceField(
    ctxRD,
    ctxRDB,
    ctxRDR,
    cfg.seed + 881,
    cfg.roofDeckRgb,
    [22, 22, 24],
    0.72,
    0.2,
    40,
    6,
    6,
    3
  );
  // Subtle roof membrane seams
  ctxRD.strokeStyle = 'rgba(0,0,0,0.22)';
  ctxRD.lineWidth = 2;
  for (let i = 0; i < 256; i += 64) {
    ctxRD.beginPath();
    ctxRD.moveTo(i, 0);
    ctxRD.lineTo(i, 256);
    ctxRD.stroke();
  }

  const parMap = track(finalizeSeamlessTex(cParA, true, anisotropy, true, false));
  const parBump = track(finalizeSeamlessTex(cParB, false, anisotropy, true, false));
  const parRough = track(finalizeSeamlessTex(cParR, false, anisotropy, true, false));
  const roofCapMap = track(finalizeSeamlessTex(cRoofDeck, true, anisotropy, true, true));

  const parMat = new THREE.MeshStandardMaterial({
    map: parMap,
    bumpMap: parBump,
    bumpScale: cfg.bumpScale * 0.9,
    roughnessMap: parRough,
    roughness: 1.0,
    metalness: cfg.id === 'D2' || cfg.id === 'D10' ? 0.35 : cfg.metalness + 0.08,
  });

  const roofCapMat = new THREE.MeshStandardMaterial({
    map: roofCapMap,
    roughness: cfg.id === 'D9' || cfg.id === 'D10' ? 0.38 : 0.72,
    metalness: cfg.id === 'D9' ? 0.25 : 0.1,
  });

  return {
    id: cfg.id,
    name: cfg.name,
    cyrillicName: cfg.cyrillicName,
    materialLanguage: cfg.materialLanguage,
    eraNote: cfg.eraNote,
    accentHex: cfg.accentHex,
    defaultWear: { ...cfg.defaultWear },
    baseWall: {
      map: baseWallMap,
      bumpMap: baseWallBump,
      roughnessMap: baseWallRough,
      material: baseWallMat,
    },
    windowGrid: {
      litMap: winLitMap,
      unlitMap: winUnlitMap,
      emissiveMap: winEmiMap,
      bumpMap: winBumpMap,
      roughnessMap: winRoughMap,
      litMaterial,
      unlitMaterial,
    },
    groundFloor: {
      map: gfMap,
      emissiveMap: gfEmiMap,
      bumpMap: gfBumpMap,
      roughnessMap: gfRoughMap,
      material: gfMat,
    },
    roofline: {
      map: parMap,
      bumpMap: parBump,
      roughnessMap: parRough,
      material: parMat,
      roofCapMap,
      roofCapMaterial: roofCapMat,
    },
  };
}

/**
 * Builds the 4 shared, seamlessly-tiling procedural wear overlay layers
 * (grime, streaks, patching, peeling) that can overlay any district family.
 */
function buildSharedWearLayers(
  anisotropy: number,
  createdTextures: THREE.Texture[]
): WearLayerSet {
  const track = <T extends THREE.CanvasTexture>(t: T): T => {
    createdTextures.push(t);
    return t;
  };
  const W = 512;
  const H = 512;
  const BW = 256;
  const BH = 256;
  const bs = BW / W;

  const makeOverlayMat = (
    map: THREE.CanvasTexture,
    bumpMap: THREE.CanvasTexture,
    roughness: number,
    bumpScale: number
  ) =>
    new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      roughness,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

  // 1. GRIME — periodic soot, damp pollution & joint-hugging urban grime
  const [cGrime, ctxG] = makeCanvas(W, H);
  const [cGrimeB, ctxGB] = makeCanvas(BW, BH);
  ctxGB.fillStyle = '#808080';
  ctxGB.fillRect(0, 0, BW, BH);
  const fbmGrime = createPeriodicFbm(61001, 4, 4, 4);
  const imgG = ctxG.createImageData(W, H);
  const dG = imgG.data;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    // Periodic cornice/ledge grime accumulation bands
    const ledgeBand = Math.pow(0.5 + 0.5 * Math.cos(v * Math.PI * 8), 3);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const n = fbmGrime(u, v);
      const mask = Math.max(0, Math.min(1, (n - 0.34) * 1.45 + ledgeBand * 0.24));
      const idx = (y * W + x) * 4;
      dG[idx] = 24;
      dG[idx + 1] = 22;
      dG[idx + 2] = 19;
      dG[idx + 3] = Math.round(mask * 195);
    }
  }
  ctxG.putImageData(imgG, 0, 0);
  const grimeMap = track(finalizeSeamlessTex(cGrime, true, anisotropy, true, true));
  const grimeBump = track(finalizeSeamlessTex(cGrimeB, false, anisotropy, true, true));

  // 2. STREAKS — vertical rain-runoff & iron-oxide mineral drip curtains (seamless X & Y)
  const [cStr, ctxS] = makeCanvas(W, H);
  const [cStrB, ctxSB] = makeCanvas(BW, BH);
  ctxSB.fillStyle = '#808080';
  ctxSB.fillRect(0, 0, BW, BH);
  const rngS = mulberry32(62002);
  for (let i = 0; i < 120; i++) {
    const sx = rngS() * W;
    const sy = Math.floor(rngS() * 4) * (H / 4) + (rngS() - 0.5) * 18;
    const sw = 2 + rngS() * 11;
    const sh = 42 + rngS() * 155;
    const isRust = rngS() < 0.34;
    const alpha = 0.22 + rngS() * 0.42;
    stampWrapped(W, H, true, true, (ox, oy) => {
      const g = ctxS.createLinearGradient(sx + ox, sy + oy, sx + ox, sy + oy + sh);
      if (isRust) {
        g.addColorStop(0, `rgba(110,46,20,${alpha})`);
        g.addColorStop(0.55, `rgba(74,34,18,${alpha * 0.55})`);
        g.addColorStop(1, 'rgba(60,28,16,0)');
      } else {
        g.addColorStop(0, `rgba(18,22,26,${alpha})`);
        g.addColorStop(0.6, `rgba(22,26,30,${alpha * 0.45})`);
        g.addColorStop(1, 'rgba(22,26,30,0)');
      }
      ctxS.fillStyle = g;
      ctxS.fillRect(sx + ox, sy + oy, sw, sh);
    });
  }
  const streaksMap = track(finalizeSeamlessTex(cStr, true, anisotropy, true, true));
  const streaksBump = track(finalizeSeamlessTex(cStrB, false, anisotropy, true, true));

  // 3. PATCHING — mismatched troweled cement/plaster repair rectangles (seamless X & Y)
  const [cPat, ctxP] = makeCanvas(W, H);
  const [cPatB, ctxPB] = makeCanvas(BW, BH);
  ctxPB.fillStyle = '#808080';
  ctxPB.fillRect(0, 0, BW, BH);
  const rngP = mulberry32(63003);
  const patchTones = [
    'rgba(136,138,132,0.78)',
    'rgba(168,162,150,0.74)',
    'rgba(108,110,108,0.76)',
    'rgba(150,140,126,0.72)',
  ];
  for (let i = 0; i < 32; i++) {
    const px = rngP() * W;
    const py = rngP() * H;
    const pw = 24 + rngP() * 78;
    const ph = 18 + rngP() * 62;
    const tone = patchTones[Math.floor(rngP() * patchTones.length)];
    stampWrapped(W, H, true, true, (ox, oy) => {
      ctxP.fillStyle = tone;
      ctxP.fillRect(px + ox, py + oy, pw, ph);
      // Trowel edge ridge shadow + highlight
      ctxP.strokeStyle = 'rgba(32,30,28,0.52)';
      ctxP.lineWidth = 2;
      ctxP.strokeRect(px + ox, py + oy, pw, ph);
      ctxP.strokeStyle = 'rgba(220,218,210,0.28)';
      ctxP.lineWidth = 1;
      ctxP.strokeRect(px + ox + 2, py + oy + 2, pw - 4, ph - 4);
      ctxPB.fillStyle = '#b4b4b4';
      ctxPB.fillRect((px + ox) * bs, (py + oy) * bs, pw * bs, ph * bs);
      ctxPB.strokeStyle = '#383838';
      ctxPB.lineWidth = 1.5;
      ctxPB.strokeRect((px + ox) * bs, (py + oy) * bs, pw * bs, ph * bs);
    });
  }
  const patchingMap = track(finalizeSeamlessTex(cPat, true, anisotropy, true, true));
  const patchingBump = track(finalizeSeamlessTex(cPatB, false, anisotropy, true, true));

  // 4. PEELING — delaminating 2059 outer coat flakes revealing rough under-substrate
  const [cPeel, ctxPl] = makeCanvas(W, H);
  const [cPeelB, ctxPlB] = makeCanvas(BW, BH);
  ctxPlB.fillStyle = '#808080';
  ctxPlB.fillRect(0, 0, BW, BH);
  const rngPl = mulberry32(64004);
  for (let i = 0; i < 44; i++) {
    const cx = rngPl() * W;
    const cy = rngPl() * H;
    const rBase = 10 + rngPl() * 26;
    const verts = 6 + Math.floor(rngPl() * 5);
    const poly: Array<[number, number]> = [];
    for (let v = 0; v < verts; v++) {
      const a = (v / verts) * Math.PI * 2;
      const rad = rBase * (0.55 + rngPl() * 0.65);
      poly.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    stampWrapped(W, H, true, true, (ox, oy) => {
      // Exposed rough dark masonry/plaster scar beneath peeled paint
      ctxPl.beginPath();
      ctxPl.moveTo(poly[0][0] + ox, poly[0][1] + oy);
      for (let v = 1; v < poly.length; v++) {
        ctxPl.lineTo(poly[v][0] + ox, poly[v][1] + oy);
      }
      ctxPl.closePath();
      ctxPl.fillStyle = 'rgba(72,66,58,0.82)';
      ctxPl.fill();
      // Dark underside lip shadow + pale curled paint edge
      ctxPl.strokeStyle = 'rgba(20,18,16,0.72)';
      ctxPl.lineWidth = 2.6;
      ctxPl.stroke();
      ctxPl.strokeStyle = 'rgba(224,218,205,0.68)';
      ctxPl.lineWidth = 1.2;
      ctxPl.stroke();

      ctxPlB.beginPath();
      ctxPlB.moveTo((poly[0][0] + ox) * bs, (poly[0][1] + oy) * bs);
      for (let v = 1; v < poly.length; v++) {
        ctxPlB.lineTo((poly[v][0] + ox) * bs, (poly[v][1] + oy) * bs);
      }
      ctxPlB.closePath();
      ctxPlB.fillStyle = '#3c3c3c';
      ctxPlB.fill();
      ctxPlB.strokeStyle = '#e0e0e0';
      ctxPlB.lineWidth = 1.5;
      ctxPlB.stroke();
    });
  }
  const peelingMap = track(finalizeSeamlessTex(cPeel, true, anisotropy, true, true));
  const peelingBump = track(finalizeSeamlessTex(cPeelB, false, anisotropy, true, true));

  return {
    grime: {
      kind: 'grime',
      label: 'Urban Grime',
      map: grimeMap,
      bumpMap: grimeBump,
      material: makeOverlayMat(grimeMap, grimeBump, 0.92, 0.14),
    },
    streaks: {
      kind: 'streaks',
      label: 'Rain & Rust Streaks',
      map: streaksMap,
      bumpMap: streaksBump,
      material: makeOverlayMat(streaksMap, streaksBump, 0.72, 0.12),
    },
    patching: {
      kind: 'patching',
      label: 'Cement Patching',
      map: patchingMap,
      bumpMap: patchingBump,
      material: makeOverlayMat(patchingMap, patchingBump, 0.9, 0.35),
    },
    peeling: {
      kind: 'peeling',
      label: 'Peeling Coat',
      map: peelingMap,
      bumpMap: peelingBump,
      material: makeOverlayMat(peelingMap, peelingBump, 0.88, 0.42),
    },
  };
}

/**
 * Builds blank, emissive-ready RESERVED signage panels sized to the exact
 * aspect ratios used by Kaluga's ad system (billboards, wide banners, marquees,
 * vertical blade signs, and street-level portrait posters).
 */
function buildReservedSignagePanels(
  anisotropy: number,
  emissiveList: THREE.MeshStandardMaterial[],
  createdTextures: THREE.Texture[]
): ReservedSignageSet {
  const track = <T extends THREE.CanvasTexture>(t: T): T => {
    createdTextures.push(t);
    return t;
  };

  const specs: Array<{
    kind: ReservedSignageKind;
    label: string;
    worldWidth: number;
    worldHeight: number;
    texWidth: number;
    texHeight: number;
    tint: string;
    glow: string;
  }> = [
    {
      kind: 'billboardStandard',
      label: 'Standard Billboard (12 × 5m)',
      worldWidth: 12.0,
      worldHeight: 5.0,
      texWidth: 512,
      texHeight: 256,
      tint: '#d9e3ec',
      glow: '#cfe4f5',
    },
    {
      kind: 'billboardWide',
      label: 'Wide Panorama Strip (14 × 4m)',
      worldWidth: 14.0,
      worldHeight: 4.0,
      texWidth: 512,
      texHeight: 128,
      tint: '#e2e6ea',
      glow: '#d8e6f2',
    },
    {
      kind: 'marqueeStrip',
      label: 'Building Marquee (11.5 × 2.6m)',
      worldWidth: 11.5,
      worldHeight: 2.6,
      texWidth: 512,
      texHeight: 128,
      tint: '#e6e0d4',
      glow: '#f2e0be',
    },
    {
      kind: 'bladeVertical',
      label: 'Vertical Corner Blade (1.6 × 8m)',
      worldWidth: 1.6,
      worldHeight: 8.0,
      texWidth: 128,
      texHeight: 512,
      tint: '#d6e6ee',
      glow: '#b4e4f8',
    },
    {
      kind: 'posterPortrait',
      label: 'Street Poster Vitrine (2 × 3m)',
      worldWidth: 2.0,
      worldHeight: 3.0,
      texWidth: 256,
      texHeight: 384,
      tint: '#e4e2dc',
      glow: '#ede4d2',
    },
  ];

  const out = {} as ReservedSignageSet;

  for (const s of specs) {
    const [cAlb, ctxA] = makeCanvas(s.texWidth, s.texHeight);
    const [cEmi, ctxE] = makeCanvas(s.texWidth, s.texHeight);
    const bezel = Math.max(8, Math.round(Math.min(s.texWidth, s.texHeight) * 0.055));

    // Outer anodized housing bezel
    ctxA.fillStyle = '#181d24';
    ctxA.fillRect(0, 0, s.texWidth, s.texHeight);
    ctxE.fillStyle = '#000000';
    ctxE.fillRect(0, 0, s.texWidth, s.texHeight);

    // Blank backlit diffuser screen (strictly reserved — zero ad copy!)
    const ix = bezel;
    const iy = bezel;
    const iw = s.texWidth - bezel * 2;
    const ih = s.texHeight - bezel * 2;

    const gAlb = ctxA.createRadialGradient(
      s.texWidth * 0.5,
      s.texHeight * 0.5,
      Math.min(iw, ih) * 0.1,
      s.texWidth * 0.5,
      s.texHeight * 0.5,
      Math.max(iw, ih) * 0.72
    );
    gAlb.addColorStop(0, s.tint);
    gAlb.addColorStop(0.78, '#b6c0ca');
    gAlb.addColorStop(1, '#848e98');
    ctxA.fillStyle = gAlb;
    ctxA.fillRect(ix, iy, iw, ih);

    // Soft backlit LED tube glow profile in emissive map
    const gEmi = ctxE.createRadialGradient(
      s.texWidth * 0.5,
      s.texHeight * 0.5,
      Math.min(iw, ih) * 0.08,
      s.texWidth * 0.5,
      s.texHeight * 0.5,
      Math.max(iw, ih) * 0.72
    );
    gEmi.addColorStop(0, s.glow);
    gEmi.addColorStop(0.82, '#7d92a6');
    gEmi.addColorStop(1, '#323c48');
    ctxE.fillStyle = gEmi;
    ctxE.fillRect(ix, iy, iw, ih);

    // Subtle internal LED diffuser module seams (so blank panels feel like real hardware)
    ctxA.strokeStyle = 'rgba(20,28,36,0.08)';
    ctxA.lineWidth = 1;
    ctxE.strokeStyle = 'rgba(0,0,0,0.14)';
    ctxE.lineWidth = 1;
    const step = 32;
    for (let x = ix + step; x < ix + iw; x += step) {
      ctxA.beginPath();
      ctxA.moveTo(x, iy);
      ctxA.lineTo(x, iy + ih);
      ctxA.stroke();
      ctxE.beginPath();
      ctxE.moveTo(x, iy);
      ctxE.lineTo(x, iy + ih);
      ctxE.stroke();
    }
    for (let y = iy + step; y < iy + ih; y += step) {
      ctxA.beginPath();
      ctxA.moveTo(ix, y);
      ctxA.lineTo(ix + iw, y);
      ctxA.stroke();
      ctxE.beginPath();
      ctxE.moveTo(ix, y);
      ctxE.lineTo(ix + iw, y);
      ctxE.stroke();
    }

    // Inner thin bezel gasket + corner alignment ticks (no text)
    ctxA.strokeStyle = 'rgba(30,38,48,0.65)';
    ctxA.lineWidth = 2;
    ctxA.strokeRect(ix + 1, iy + 1, iw - 2, ih - 2);
    const tick = 10;
    ctxA.strokeStyle = 'rgba(40,52,64,0.45)';
    ctxA.lineWidth = 1.5;
    const corners: Array<[number, number, number, number]> = [
      [ix + 6, iy + 6, 1, 1],
      [ix + iw - 6, iy + 6, -1, 1],
      [ix + 6, iy + ih - 6, 1, -1],
      [ix + iw - 6, iy + ih - 6, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      ctxA.beginPath();
      ctxA.moveTo(cx, cy + dy * tick);
      ctxA.lineTo(cx, cy);
      ctxA.lineTo(cx + dx * tick, cy);
      ctxA.stroke();
    }

    const map = track(finalizeSeamlessTex(cAlb, true, anisotropy, false, false));
    const emissiveMap = track(finalizeSeamlessTex(cEmi, true, anisotropy, false, false));
    const material = new THREE.MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.72,
      roughness: 0.28,
      metalness: 0.14,
    });
    emissiveList.push(material);

    out[s.kind] = {
      kind: s.kind,
      label: s.label,
      worldWidth: s.worldWidth,
      worldHeight: s.worldHeight,
      texWidth: s.texWidth,
      texHeight: s.texHeight,
      map,
      emissiveMap,
      material,
    };
  }

  return out;
}

export function createTextureLibrary(renderer: THREE.WebGLRenderer): TextureLibrary {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const asphalt = buildAsphaltTextures(anisotropy);
  const grass = buildWetGrassGroundTextures(anisotropy);
  const concrete = buildWeatheredConcrete(anisotropy);
  const cathedral = buildCathedralTextures(anisotropy);
  const containers = buildContainerTextures(anisotropy);
  const car = buildCarTextures(anisotropy);
  const util = buildUtilitySprites(anisotropy);
  const metroInt = buildMetroInteriorTextures(anisotropy);

  const emissiveMaterials: THREE.MeshStandardMaterial[] = [];
  const styles = Object.keys(FACADE_PALETTES) as BuildingStyle[];

  const buildingMaterials = {} as Record<BuildingStyle, BuildingMaterialSet>;
  styles.forEach((s, idx) => {
    buildingMaterials[s] = buildFacadeMaterial(s, idx + 1, anisotropy, emissiveMaterials);
  });

  // Additive Kaluga 2059 Skin Engine families, shared wear layers & reserved signage panels
  const newEngineTextures: THREE.Texture[] = [];
  const districtFamilies = {} as Record<DistrictId, DistrictFacadeFamily>;
  for (const dId of KALUGA_DISTRICTS) {
    districtFamilies[dId] = buildDistrictFacadeFamily(
      DISTRICT_CONFIGS[dId],
      anisotropy,
      emissiveMaterials,
      newEngineTextures
    );
  }
  const wearLayers = buildSharedWearLayers(anisotropy, newEngineTextures);
  const reservedSignage = buildReservedSignagePanels(
    anisotropy,
    emissiveMaterials,
    newEngineTextures
  );

  const allTextures: THREE.Texture[] = [
    asphalt.doubleMap,
    asphalt.dottedMap,
    asphalt.roughness,
    asphalt.bump,
    grass.map,
    grass.bump,
    concrete.map,
    concrete.bump,
    cathedral.wallMap,
    cathedral.domeGoldMap,
    cathedral.domeBlueMap,
    ...containers,
    car.paintMap,
    car.paintRoughness,
    car.bodyBump,
    car.trafficPaintMap,
    car.trafficPaintRoughness,
    car.trafficBump,
    car.truckCargoMap,
    car.tireMap,
    car.plateMap,
    car.tailLightMap,
    car.carbonWeaveMap,
    util.shadowMap,
    util.raindropMap,
    util.softRainStreakMap,
    util.rippleMap,
    util.puddleMap,
    util.pedClothingMap,
    util.pedClothingBump,
    util.pedClothingRoughness,
    util.pedFaceMap,
    util.pedFaceSkinMap,
    util.pedFaceBump,
    util.pedHairMap,
    util.pedHairBump,
    util.pedFabricDenimMap,
    util.pedFabricDenimBump,
    util.pedFabricDenimRoughness,
    util.pedFabricLeatherMap,
    util.pedFabricLeatherBump,
    util.pedFabricLeatherRoughness,
    util.pedFabricKnitMap,
    util.pedFabricKnitBump,
    util.pedFabricKnitRoughness,
    util.pedFaceWeatheredMap,
    util.pedFaceStreetCloseMap,
    util.newspaperMap,
    util.phoneScreenMap,
    metroInt.floorMap,
    metroInt.floorRoughness,
    metroInt.wallMap,
    metroInt.wallBump,
    metroInt.seatMap,
    metroInt.seatBump,
  ];

  // Exact GPU VRAM accounting across legacy + new textures (RGBA8 + mipmap chain)
  const legacyUniqueTextures = new Set<THREE.Texture>(allTextures);
  for (const s of styles) {
    const bm = buildingMaterials[s];
    if (bm.side.map) legacyUniqueTextures.add(bm.side.map);
    if (bm.side.emissiveMap) legacyUniqueTextures.add(bm.side.emissiveMap);
    if (bm.side.bumpMap) legacyUniqueTextures.add(bm.side.bumpMap);
    if (bm.roof.map) legacyUniqueTextures.add(bm.roof.map);
  }
  let estimatedLegacyGpuBytes = 0;
  legacyUniqueTextures.forEach((t) => {
    estimatedLegacyGpuBytes += estimateTextureGpuBytes(t);
  });
  let estimatedNewGpuBytes = 0;
  newEngineTextures.forEach((t) => {
    estimatedNewGpuBytes += estimateTextureGpuBytes(t);
  });

  const textureStats: TextureLibraryStats = {
    legacyTextureCount: legacyUniqueTextures.size,
    newTextureCount: newEngineTextures.length,
    totalTextureCount: legacyUniqueTextures.size + newEngineTextures.length,
    estimatedLegacyGpuBytes,
    estimatedNewGpuBytes,
    estimatedTotalGpuBytes: estimatedLegacyGpuBytes + estimatedNewGpuBytes,
    tilingMethod: TILING_METHOD_DESC,
  };

  return {
    asphaltMap: asphalt.doubleMap,
    asphaltDottedMap: asphalt.dottedMap,
    asphaltRoughness: asphalt.roughness,
    asphaltBump: asphalt.bump,
    grassGroundMap: grass.map,
    grassGroundBump: grass.bump,
    sidewalkMap: concrete.map,
    cathedralWallMap: cathedral.wallMap,
    cathedralDomeGoldMap: cathedral.domeGoldMap,
    cathedralDomeBlueMap: cathedral.domeBlueMap,
    concreteWeatheredMap: concrete.map,
    concreteBump: concrete.bump,
    containerMaps: containers,
    carPaintMap: car.paintMap,
    carPaintRoughness: car.paintRoughness,
    carBodyBump: car.bodyBump,
    trafficPaintMap: car.trafficPaintMap,
    trafficPaintRoughness: car.trafficPaintRoughness,
    trafficPaintBump: car.trafficBump,
    truckCargoMap: car.truckCargoMap,
    tireTreadMap: car.tireMap,
    licensePlateMap: car.plateMap,
    tailLightMap: car.tailLightMap,
    carbonWeaveMap: car.carbonWeaveMap,
    contactShadowMap: util.shadowMap,
    raindropMap: util.raindropMap,
    softRainStreakMap: util.softRainStreakMap,
    rippleMap: util.rippleMap,
    puddleMap: util.puddleMap,
    pedClothingMap: util.pedClothingMap,
    pedClothingBump: util.pedClothingBump,
    pedClothingRoughness: util.pedClothingRoughness,
    pedFaceMap: util.pedFaceMap,
    pedFaceSkinMap: util.pedFaceSkinMap,
    pedFaceBump: util.pedFaceBump,
    pedHairMap: util.pedHairMap,
    pedHairBump: util.pedHairBump,
    pedFabricDenimMap: util.pedFabricDenimMap,
    pedFabricDenimBump: util.pedFabricDenimBump,
    pedFabricDenimRoughness: util.pedFabricDenimRoughness,
    pedFabricLeatherMap: util.pedFabricLeatherMap,
    pedFabricLeatherBump: util.pedFabricLeatherBump,
    pedFabricLeatherRoughness: util.pedFabricLeatherRoughness,
    pedFabricKnitMap: util.pedFabricKnitMap,
    pedFabricKnitBump: util.pedFabricKnitBump,
    pedFabricKnitRoughness: util.pedFabricKnitRoughness,
    pedFaceWeatheredMap: util.pedFaceWeatheredMap,
    pedFaceStreetCloseMap: util.pedFaceStreetCloseMap,
    newspaperMap: util.newspaperMap,
    phoneScreenMap: util.phoneScreenMap,
    metroFloorMap: metroInt.floorMap,
    metroFloorRoughness: metroInt.floorRoughness,
    metroWallMap: metroInt.wallMap,
    metroWallBump: metroInt.wallBump,
    metroSeatMap: metroInt.seatMap,
    metroSeatBump: metroInt.seatBump,
    buildingMaterials,
    emissiveMaterials,
    districtFamilies,
    wearLayers,
    reservedSignage,
    textureStats,
    dispose: () => {
      allTextures.forEach((t) => t.dispose());
      newEngineTextures.forEach((t) => t.dispose());
      for (const s of styles) {
        buildingMaterials[s].side.map?.dispose();
        buildingMaterials[s].side.emissiveMap?.dispose();
        buildingMaterials[s].side.bumpMap?.dispose();
        buildingMaterials[s].side.dispose();
        buildingMaterials[s].roof.map?.dispose();
        buildingMaterials[s].roof.dispose();
      }
      for (const dId of KALUGA_DISTRICTS) {
        const fam = districtFamilies[dId];
        fam.baseWall.material.dispose();
        fam.windowGrid.litMaterial.dispose();
        fam.windowGrid.unlitMaterial.dispose();
        fam.groundFloor.material.dispose();
        fam.roofline.material.dispose();
        fam.roofline.roofCapMaterial.dispose();
      }
      (Object.keys(wearLayers) as WearLayerKind[]).forEach((k) => {
        wearLayers[k].material.dispose();
      });
      (Object.keys(reservedSignage) as ReservedSignageKind[]).forEach((k) => {
        reservedSignage[k].material.dispose();
      });
    },
  };
}
