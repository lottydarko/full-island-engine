import * as THREE from 'three';
import { BuildingStyle, mulberry32 } from './mapData';

export interface BuildingMaterialSet {
  side: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
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
    util.newspaperMap,
    util.phoneScreenMap,
    metroInt.floorMap,
    metroInt.floorRoughness,
    metroInt.wallMap,
    metroInt.wallBump,
    metroInt.seatMap,
    metroInt.seatBump,
  ];

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
    dispose: () => {
      allTextures.forEach((t) => t.dispose());
      for (const s of styles) {
        buildingMaterials[s].side.map?.dispose();
        buildingMaterials[s].side.emissiveMap?.dispose();
        buildingMaterials[s].side.bumpMap?.dispose();
        buildingMaterials[s].side.dispose();
        buildingMaterials[s].roof.map?.dispose();
        buildingMaterials[s].roof.dispose();
      }
    },
  };
}
