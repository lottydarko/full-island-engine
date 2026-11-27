// Exact spatial blueprint for "ISLAND DISTRICT 1 & 2: DENSE URBAN ROAD NETWORK"
// Map coordinates on the blueprint run from [-1000, +1000] on X (West->East) and Z (North->South).
// Center (0, 0) is the Central Reliquary Roundabout.
// World scale: 1 blueprint unit = 0.72 meters => ~1.44 km x 1.44 km island world.

export const MAP_SCALE = 0.72;
export const MAP_HALF_EXTENT = 1000 * MAP_SCALE; // 720m

export const m2w = (v: number): number => v * MAP_SCALE;
export const w2m = (v: number): number => v / MAP_SCALE;

export interface Vec2 {
  x: number;
  z: number;
}

export interface RoadSegment {
  id: string;
  code?: string; // RD-01 .. RD-24
  districtId?: string; // D1 .. D10
  name?: string;
  cyrillicName?: string;
  points: Vec2[]; // world meters
  width: number;  // total width in meters
  kind: 'avenue' | 'street' | 'coastal' | 'bridge' | 'ramp' | 'roundabout';
  icyBias?: number;
}

export type BuildingStyle =
  | 'commercial_brick'
  | 'commercial_ochre'
  | 'commercial_mint'
  | 'commercial_burgundy'
  | 'commercial_cream'
  | 'commercial_slate'
  | 'brick_apt_red'
  | 'brick_apt_terracotta'
  | 'brick_apt_dark'
  | 'panelka_grey'
  | 'panelka_sand'
  | 'panelka_teal'
  | 'panelka_rose'
  | 'panelka_cobalt'
  | 'military_bunker'
  | 'prison_block'
  | 'industrial_warehouse'
  | 'dock_shed'
  | 'industrial_concrete';

export type VenueKind =
  | 'none'
  | 'casino'
  | 'arcade'
  | 'computer_library'
  | 'nightlife'
  | 'pharmacy';

export interface BuildingSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rotY: number;
  style: BuildingStyle;
  roofKind: 'flat' | 'mansard' | 'gabled' | 'spire';
  hasStorefront?: boolean;
  venue: VenueKind;
  neonColor?: string;
  seed: number;
}

export interface ColliderBox {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  cos: number;
  sin: number;
  radius: number;
}

export interface MetroStationSpec {
  id: string;
  code: string; // STN-1 .. STN-8
  name: string;
  cyrillic: string;
  district: string;
  x: number;
  z: number;
  trackY: number;
  zoneKind: 'surface' | 'underground' | 'subsurface' | 'elevated';
  footprintW: number; // 36m
  footprintD: number; // 24m
}

export interface Vec3Pt {
  x: number;
  y: number;
  z: number;
}

export interface RoadInfo {
  code: string;
  name: string;
  cyrillic: string;
  districtId: string;
}

export interface BusStopSpec {
  id: string;
  name: string;
  cyrillic: string;
  routes: string;
  x: number;
  z: number;
  rotY: number;
}

export interface SignalIntersectionSpec {
  id: string;
  streetNS: string;
  streetEW: string;
  x: number;
  z: number;
  halfSpanNS: number;
  halfSpanEW: number;
  phaseOffset: number;
}

export interface DistrictSignSpec {
  x: number;
  z: number;
  rotY: number;
  titleCyr: string;
  titleEng: string;
  subText: string;
  accent: string;
  kind: 'district' | 'metro_dir' | 'bus_dir' | 'highway';
}

export interface LandmarkPoint {
  id: string;
  label: string;
  x: number;
  z: number;
  spawnHeading: number;
}

export interface BillboardSpec {
  x: number;
  z: number;
  rotY: number;
  height: number;
  width: number;
  variant: number;
}

export interface PedestrianZoneSpec {
  id: string;
  locationName: string;
  x: number;
  z: number;
  radius: number;
  count: number;
  isWorkerZone?: boolean;
  isGuardZone?: boolean;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Island shoreline polygon in blueprint coordinates [-1000..1000]
const ISLAND_POLY_MAP: [number, number][] = [
  [-835, -250],
  [-775, -525],
  [-650, -695],
  [-465, -805],
  [-245, -870],
  [-40, -860],
  [95, -900],
  [275, -860],
  [455, -785],
  [655, -800],
  [805, -665],
  [865, -425],
  [875, -160],
  [855, 85],
  [820, 315],
  [865, 515],
  [795, 660],
  [655, 770],
  [445, 820],
  [215, 830],
  [120, 745],
  [-60, 775],
  [-245, 790],
  [-465, 755],
  [-645, 710],
  [-735, 565],
  [-815, 385],
  [-885, 160],
  [-880, -40],
];

const MAINLAND_POLY_MAP: [number, number][] = [
  [-1020, 620],
  [-740, 760],
  [-610, 920],
  [-610, 1040],
  [-1040, 1040],
];

export const ISLAND_POLY: Vec2[] = ISLAND_POLY_MAP.map(([x, z]) => ({
  x: m2w(x),
  z: m2w(z),
}));

export const MAINLAND_POLY: Vec2[] = MAINLAND_POLY_MAP.map(([x, z]) => ({
  x: m2w(x),
  z: m2w(z),
}));

function pointInPolygon(x: number, z: number, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const zi = poly[i].z;
    const xj = poly[j].x;
    const zj = poly[j].z;
    const intersect =
      zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToPolygonEdge(x: number, z: number, poly: Vec2[]): number {
  let minD2 = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x;
    const az = poly[j].z;
    const bx = poly[i].x;
    const bz = poly[i].z;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz + 1e-9;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

// =========================================================================
// ARCHIPELAGO ISLAND POLYGONS (World Meters — Preserves Island 1 Untouched!)
// =========================================================================
export const SECTOR4_HIGHLAND_POLY: Vec2[] = [
  { x: 465, z: -560 },
  { x: 690, z: -610 },
  { x: 915, z: -475 },
  { x: 925, z: -150 },
  { x: 760, z: -45 },
  { x: 525, z: -105 },
];

export const ISLAND2_POLY: Vec2[] = [
  { x: 895, z: -510 },
  { x: 1490, z: -535 },
  { x: 1620, z: -260 },
  { x: 1645, z: 225 },
  { x: 1795, z: 395 },
  { x: 1775, z: 485 },
  { x: 1555, z: 580 },
  { x: 965, z: 575 },
  { x: 880, z: 245 },
  { x: 875, z: -185 },
];

export const ISLAND3_STARGATE_POLY: Vec2[] = [
  { x: 1665, z: -655 },
  { x: 2155, z: -670 },
  { x: 2265, z: -415 },
  { x: 2220, z: -110 },
  { x: 1850, z: -75 },
  { x: 1635, z: -260 },
];

export const ISLAND4_ELYSIA_POLY: Vec2[] = [
  { x: 1935, z: 55 },
  { x: 2365, z: 45 },
  { x: 2505, z: 280 },
  { x: 2475, z: 625 },
  { x: 2145, z: 675 },
  { x: 1935, z: 540 },
  { x: 1905, z: 270 },
];

export const LIGHTHOUSE_ROCK_CENTER: Vec2 = { x: 1805, z: 695 };
export const LIGHTHOUSE_ROCK_RADIUS = 44;

export function signedLandDistance(x: number, z: number): number {
  const inIsland = pointInPolygon(x, z, ISLAND_POLY);
  const dIsland = distToPolygonEdge(x, z, ISLAND_POLY);
  let best = inIsland ? dIsland : -dIsland;

  const inMain = pointInPolygon(x, z, MAINLAND_POLY);
  const dMain = distToPolygonEdge(x, z, MAINLAND_POLY);
  best = Math.max(best, inMain ? dMain : -dMain);

  // Fast coarse bounds checks so Island 1 hot loops pay ~zero extra cost!
  if (x > 420 && z < 40) {
    const inS4 = pointInPolygon(x, z, SECTOR4_HIGHLAND_POLY);
    const dS4 = distToPolygonEdge(x, z, SECTOR4_HIGHLAND_POLY);
    best = Math.max(best, inS4 ? dS4 : -dS4);
  }
  if (x > 820 && x < 1860 && z > -600 && z < 650) {
    const inI2 = pointInPolygon(x, z, ISLAND2_POLY);
    const dI2 = distToPolygonEdge(x, z, ISLAND2_POLY);
    best = Math.max(best, inI2 ? dI2 : -dI2);
  }
  if (x > 1580 && z < 20) {
    const inI3 = pointInPolygon(x, z, ISLAND3_STARGATE_POLY);
    const dI3 = distToPolygonEdge(x, z, ISLAND3_STARGATE_POLY);
    best = Math.max(best, inI3 ? dI3 : -dI3);
  }
  if (x > 1860 && z > -20) {
    const inI4 = pointInPolygon(x, z, ISLAND4_ELYSIA_POLY);
    const dI4 = distToPolygonEdge(x, z, ISLAND4_ELYSIA_POLY);
    best = Math.max(best, inI4 ? dI4 : -dI4);
  }
  if (x > 1720 && z > 610) {
    const dLight = LIGHTHOUSE_ROCK_RADIUS - Math.hypot(x - LIGHTHOUSE_ROCK_CENTER.x, z - LIGHTHOUSE_ROCK_CENTER.z);
    best = Math.max(best, dLight);
  }

  return best;
}

function pts(coords: [number, number][]): Vec2[] {
  return coords.map(([x, z]) => ({ x: m2w(x), z: m2w(z) }));
}

function circlePts(cx: number, cz: number, r: number, segments = 48): Vec2[] {
  const arr: Vec2[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    arr.push({ x: m2w(cx + Math.cos(a) * r), z: m2w(cz + Math.sin(a) * r) });
  }
  return arr;
}

export const ROUNDABOUT_RADIUS = m2w(82); // ~59m centerline radius
export const ROUNDABOUT_WIDTH = 26.5;

export interface SecondaryRoundaboutSpec {
  id: string;
  name: string;
  cyrillic: string;
  mx: number;
  mz: number;
  x: number;
  z: number;
  rMap: number;
  radius: number;
  width: number;
}

export const SECONDARY_ROUNDABOUTS: SecondaryRoundaboutSpec[] = [
  {
    id: 'west_garrison_roundabout',
    name: 'West Garrison Roundabout',
    cyrillic: 'ГАРНИЗОННОЕ КОЛЬЦО',
    mx: -430,
    mz: 290,
    x: m2w(-430),
    z: m2w(290),
    rMap: 56,
    radius: m2w(56),
    width: 22.5,
  },
  {
    id: 'ne_sector_roundabout',
    name: 'NE Sector 2 Roundabout',
    cyrillic: 'СЕВЕРО-ВОСТОЧНОЕ КОЛЬЦО',
    mx: 575,
    mz: -420,
    x: m2w(575),
    z: m2w(-420),
    rMap: 54,
    radius: m2w(54),
    width: 22.0,
  },
  {
    id: 'reinstach_roundabout',
    name: 'Reinstach South Roundabout',
    cyrillic: 'КОЛЬЦО РЕЙНШТАХ',
    mx: -135,
    mz: 455,
    x: m2w(-135),
    z: m2w(455),
    rMap: 56,
    radius: m2w(56),
    width: 22.0,
  },
  {
    id: 'railyard_roundabout',
    name: 'Depot-4 Harbor Roundabout',
    cyrillic: 'ПОРТОВОЕ КОЛЬЦО ДЕПО-4',
    mx: 475,
    mz: 290,
    x: m2w(475),
    z: m2w(290),
    rMap: 48,
    radius: m2w(48),
    width: 22.0,
  },
  {
    id: 'mainland_roundabout',
    name: 'Mainland Bridge Turnaround',
    cyrillic: 'МАТЕРИКОВОЕ КОЛЬЦО',
    mx: -835,
    mz: 888,
    x: m2w(-835),
    z: m2w(888),
    rMap: 34,
    radius: m2w(34),
    width: 19.0,
  },
];

// Construct the exact road network matching the blueprint with generous drivable widths
export function buildRoadNetwork(): RoadSegment[] {
  const roads: RoadSegment[] = [];

  // 1. CENTRAL RELIQUARY ROUNDABOUT (0, 0)
  roads.push({
    id: 'central_roundabout',
    points: circlePts(0, 0, 82, 56),
    width: ROUNDABOUT_WIDTH,
    kind: 'roundabout',
    icyBias: 0.28,
  });

  // 2. FOUR CARDINAL ARTERIAL BOULEVARDS
  roads.push({
    id: 'north_avenue',
    points: pts([
      [0, -82],
      [0, -785],
    ]),
    width: 16.5,
    kind: 'avenue',
  });

  roads.push({
    id: 'south_avenue',
    points: pts([
      [0, 82],
      [0, 685],
    ]),
    width: 16.5,
    kind: 'avenue',
  });

  roads.push({
    id: 'east_avenue',
    points: pts([
      [82, 0],
      [695, 0],
    ]),
    width: 16.5,
    kind: 'avenue',
  });

  roads.push({
    id: 'west_avenue',
    points: pts([
      [-82, 0],
      [-760, 0],
    ]),
    width: 16.5,
    kind: 'avenue',
  });

  // 3. FOUR DIAGONAL RADIAL BOULEVARDS (all connected cleanly end-to-end!)
  roads.push({
    id: 'nw_diagonal',
    points: pts([
      [-58, -58],
      [-265, -265],
      [-430, -490],
      [-560, -640],
    ]),
    width: 13.5,
    kind: 'avenue',
  });

  roads.push({
    id: 'ne_diagonal',
    points: pts([
      [58, -58],
      [285, -285],
      [440, -430],
      [521, -420],
    ]),
    width: 13.5,
    kind: 'avenue',
  });

  roads.push({
    id: 'sw_diagonal',
    points: pts([
      [-58, 58],
      [-210, 175],
      [-390, 250],
    ]),
    width: 13.5,
    kind: 'avenue',
  });

  roads.push({
    id: 'se_diagonal',
    points: pts([
      [58, 58],
      [185, 195],
      [235, 290],
      [235, 515],
      [240, 680],
    ]),
    width: 13.5,
    kind: 'avenue',
  });

  // 4. WEST GARRISON ROUNDABOUT + CONNECTED FEEDER ROADS (replaces old isolated interchange loop!)
  roads.push({
    id: 'west_garrison_roundabout',
    points: circlePts(-430, 290, 56, 40),
    width: 22.5,
    kind: 'roundabout',
    icyBias: 0.30,
  });
  roads.push({
    id: 'garrison_north_link',
    points: pts([
      [-430, 0],
      [-430, 234],
    ]),
    width: 14.5,
    kind: 'avenue',
  });
  roads.push({
    id: 'garrison_south_link',
    points: pts([
      [-430, 346],
      [-430, 480],
      [-560, 560],
    ]),
    width: 14.0,
    kind: 'avenue',
  });
  roads.push({
    id: 'garrison_west_link',
    points: pts([
      [-486, 290],
      [-640, 290],
      [-740, 140],
      [-760, 0],
    ]),
    width: 13.5,
    kind: 'coastal',
  });
  roads.push({
    id: 'garrison_east_link',
    points: pts([
      [-374, 290],
      [-135, 290],
      [0, 290],
    ]),
    width: 14.0,
    kind: 'avenue',
  });

  // 5. TINY BRIDGE & MAINLAND ACCESS + TURNAROUND ROUNDABOUT (SW Corner — no dead end!)
  roads.push({
    id: 'tiny_bridge_approach',
    points: pts([
      [-560, 560],
      [-635, 650],
      [-715, 755],
      [-806, 855],
    ]),
    width: 11.5,
    kind: 'bridge',
    icyBias: 0.6,
  });
  roads.push({
    id: 'mainland_roundabout',
    points: circlePts(-835, 888, 34, 32),
    width: 19.0,
    kind: 'roundabout',
    icyBias: 0.42,
  });

  // 6. OUTER COASTAL RING ROAD
  roads.push({
    id: 'north_west_promenade',
    points: pts([
      [-760, 0],
      [-760, -260],
      [-680, -490],
      [-560, -640],
      [-400, -745],
      [-200, -785],
      [0, -785],
    ]),
    width: 13.5,
    kind: 'coastal',
    icyBias: 0.34,
  });

  roads.push({
    id: 'north_east_coastal',
    points: pts([
      [0, -785],
      [140, -820],
      [295, -775],
      [445, -700],
      [605, -690],
      [715, -560],
      [755, -340],
      [740, -140],
      [695, 0],
      [625, 0],
    ]),
    width: 13.5,
    kind: 'coastal',
    icyBias: 0.38,
  });

  roads.push({
    id: 'east_south_coastal',
    points: pts([
      [625, 0],
      [705, 120],
      [765, 290],
      [785, 470],
      [720, 585],
      [540, 655],
      [330, 680],
      [240, 680],
    ]),
    width: 13.0,
    kind: 'coastal',
    icyBias: 0.34,
  });

  roads.push({
    id: 'south_coastal_prison',
    points: pts([
      [240, 680],
      [120, 665],
      [0, 685],
      [-150, 710],
      [-320, 690],
      [-470, 645],
      [-560, 560],
    ]),
    width: 13.0,
    kind: 'coastal',
    icyBias: 0.34,
  });

  // 7. DISTRICT 1 — COMMERCIAL DISTRICT & URBAN NIGHTLIFE GRID (Every street connected end-to-end!)
  const d1HorizZ = [-130, -250, -370, -490, -610, -715];
  const d1LeftX = [-760, -760, -720, -680, -585, -455];
  for (let i = 0; i < d1HorizZ.length; i++) {
    roads.push({
      id: `d1_h_${i}`,
      points: pts([
        [d1LeftX[i], d1HorizZ[i]],
        [0, d1HorizZ[i]],
      ]),
      width: 11.8,
      kind: 'street',
    });
  }
  const d1VertX = [-650, -540, -430, -320, -210, -105];
  const d1TopZ = [-525, -650, -725, -760, -785, -785];
  const d1BotZ = [0, 0, 0, 0, 0, -130];
  for (let i = 0; i < d1VertX.length; i++) {
    roads.push({
      id: `d1_v_${i}`,
      points: pts([
        [d1VertX[i], d1TopZ[i]],
        [d1VertX[i], d1BotZ[i]],
      ]),
      width: 11.8,
      kind: 'street',
    });
  }

  // 8. DISTRICT 2 — RESIDENTIAL SECTORS & PARKS (Fully connected grid — zero abrupt stops!)
  const d2UpperX = [115, 225, 335, 440];
  const d2UpperTopZ = [-805, -790, -750, -700];
  const d2UpperBotZ = [-260, 0, 0, 0];
  for (let i = 0; i < d2UpperX.length; i++) {
    roads.push({
      id: `d2_uv_${i}`,
      points: pts([
        [d2UpperX[i], d2UpperTopZ[i]],
        [d2UpperX[i], d2UpperBotZ[i]],
      ]),
      width: 11.6,
      kind: 'street',
    });
  }
  roads.push({
    id: 'd2_uh_top',
    points: pts([
      [0, -690],
      [605, -690],
    ]),
    width: 12.0,
    kind: 'street',
  });
  roads.push({
    id: 'd2_uh_mid',
    points: pts([
      [0, -510],
      [440, -510],
    ]),
    width: 11.8,
    kind: 'street',
  });
  roads.push({
    id: 'd2_uh_low',
    points: pts([
      [0, -320],
      [440, -320],
    ]),
    width: 12.0,
    kind: 'street',
  });

  const d2LowX = [530, 625];
  for (let i = 0; i < d2LowX.length; i++) {
    roads.push({
      id: `d2_lv_${i}`,
      points: pts([
        [d2LowX[i], -260],
        [d2LowX[i], 0],
      ]),
      width: 11.6,
      kind: 'street',
    });
  }
  roads.push({
    id: 'd2_lh_top',
    points: pts([
      [0, -260],
      [745, -260],
    ]),
    width: 11.8,
    kind: 'street',
  });
  roads.push({
    id: 'd2_lh_mid',
    points: pts([
      [0, -130],
      [740, -130],
    ]),
    width: 11.5,
    kind: 'street',
  });

  // Far NE Sector 2 Roundabout + Connected Avenues (replaces old isolated diamond loop!)
  roads.push({
    id: 'ne_sector_roundabout',
    points: circlePts(575, -420, 54, 40),
    width: 22.0,
    kind: 'roundabout',
    icyBias: 0.28,
  });
  roads.push({
    id: 'ne_rb_west_link',
    points: pts([
      [440, -510],
      [537, -458],
    ]),
    width: 12.2,
    kind: 'street',
  });
  roads.push({
    id: 'ne_rb_south_link',
    points: pts([
      [575, -366],
      [575, -260],
    ]),
    width: 12.2,
    kind: 'street',
  });
  roads.push({
    id: 'ne_rb_east_link',
    points: pts([
      [629, -420],
      [755, -340],
    ]),
    width: 12.5,
    kind: 'street',
  });
  roads.push({
    id: 'ne_rb_north_link',
    points: pts([
      [605, -465],
      [715, -560],
    ]),
    width: 12.5,
    kind: 'street',
  });

  // 9. REINSTACH SOUTH ROUNDABOUT + CONNECTED FEEDER ROADS (replaces old irregular prison loop!)
  roads.push({
    id: 'reinstach_roundabout',
    points: circlePts(-135, 455, 56, 40),
    width: 22.0,
    kind: 'roundabout',
    icyBias: 0.28,
  });
  roads.push({
    id: 'reinstach_north_link',
    points: pts([
      [-135, 290],
      [-135, 399],
    ]),
    width: 12.5,
    kind: 'street',
  });
  roads.push({
    id: 'reinstach_south_link',
    points: pts([
      [-135, 511],
      [-150, 710],
    ]),
    width: 12.5,
    kind: 'street',
  });
  roads.push({
    id: 'reinstach_east_link',
    points: pts([
      [-79, 455],
      [0, 455],
    ]),
    width: 12.5,
    kind: 'street',
  });
  roads.push({
    id: 'reinstach_west_link',
    points: pts([
      [-191, 455],
      [-430, 480],
    ]),
    width: 12.5,
    kind: 'street',
  });

  // 10. DISTRICT 4 — DENSE URBAN ST., DEPOT-4 ROUNDABOUT & INDUSTRIAL RAILYARD / SHIPPING DOCKS
  roads.push({
    id: 'railyard_roundabout',
    points: circlePts(475, 290, 48, 36),
    width: 22.0,
    kind: 'roundabout',
    icyBias: 0.28,
  });
  roads.push({
    id: 'dense_urban_st_west',
    points: pts([
      [0, 290],
      [235, 290],
      [427, 290],
    ]),
    width: 14.0,
    kind: 'avenue',
  });
  roads.push({
    id: 'dense_urban_st_east',
    points: pts([
      [523, 290],
      [765, 290],
    ]),
    width: 14.0,
    kind: 'avenue',
  });
  roads.push({
    id: 'railyard_north_link',
    points: pts([
      [475, 0],
      [475, 242],
    ]),
    width: 13.0,
    kind: 'avenue',
  });
  roads.push({
    id: 'railyard_south_access',
    points: pts([
      [0, 515],
      [235, 515],
      [768, 515],
    ]),
    width: 12.6,
    kind: 'street',
  });
  roads.push({
    id: 'dock_connector',
    points: pts([
      [475, 338],
      [475, 665],
    ]),
    width: 12.6,
    kind: 'street',
  });

  // Generous road widening across every class for fast high-speed jukes and weaving!
  const roadLabels: Record<string, [string, string]> = {
    central_roundabout: ['Reliquary Ring', 'КОЛЬЦО РЕЛИКВАРИЯ'],
    west_garrison_roundabout: ['West Garrison Ring', 'ГАРНИЗОННОЕ КОЛЬЦО'],
    ne_sector_roundabout: ['NE Sector 2 Ring', 'СЕВЕРО-ВОСТ. КОЛЬЦО'],
    reinstach_roundabout: ['Reinstach Ring', 'КОЛЬЦО РЕЙНШТАХ'],
    railyard_roundabout: ['Depot-4 Harbor Ring', 'ПОРТОВОЕ КОЛЬЦО'],
    north_avenue: ['North Prospect', 'СЕВЕРНЫЙ ПРОСПЕКТ'],
    south_avenue: ['South Prospect', 'ЮЖНЫЙ ПРОСПЕКТ'],
    east_avenue: ['Sobornaya Avenue', 'СОБОРНЫЙ ПРОСПЕКТ'],
    west_avenue: ['Prospekt Kalinina', 'ПРОСПЕКТ КАЛИНИНА'],
    nw_diagonal: ['Ulitsa Gagarina', 'УЛИЦА ГАГАРИНА'],
    ne_diagonal: ['Nevsky Boulevard', 'НЕВСКИЙ БУЛЬВАР'],
    sw_diagonal: ['Garrison Perimeter Road', 'ГАРНИЗОННОЕ КОЛЬЦО'],
    se_diagonal: ['Portovoye Shosse', 'ПОРТОВОЕ ШОССЕ'],
    tiny_bridge_approach: ['SW Mainland Access Bridge', 'ЮГО-ЗАПАДНЫЙ МОСТ'],
    north_west_promenade: ['Ulitsa Severnaya', 'УЛИЦА СЕВЕРНАЯ'],
    north_east_coastal: ['Nevsky Boulevard', 'НЕВСКИЙ БУЛЬВАР'],
    east_south_coastal: ['Portovoye Shosse', 'ПОРТОВОЕ ШОССЕ'],
    south_coastal_prison: ['Reinstach Causeway', 'ДАМБА РЕЙНШТАХА'],
    dense_urban_st_west: ['Aptechny Alley', 'АПТЕЧНЫЙ ПЕРЕУЛОК'],
    dense_urban_st_east: ['Zavodskaya Alley', 'ЗАВОДСКАЯ АЛЛЕЯ'],
    railyard_north_link: ['Zavodskaya Alley', 'ЗАВОДСКАЯ АЛЛЕЯ'],
    railyard_south_access: ['Portovoye Shosse', 'ПОРТОВОЕ ШОССЕ'],
    dock_connector: ['Portovoye Shosse', 'ПОРТОВОЕ ШОССЕ'],
    garrison_north_link: ['Garrison Perimeter Road', 'ГАРНИЗОННОЕ КОЛЬЦО'],
    garrison_south_link: ['Reinstach Causeway', 'ДАМБА РЕЙНШТАХА'],
    garrison_west_link: ['Garrison Perimeter Road', 'ГАРНИЗОННОЕ КОЛЬЦО'],
    garrison_east_link: ['Reinstach Causeway', 'ДАМБА РЕЙНШТАХА'],
  };

  // Official RD-01 .. RD-12 code & district tags for Island 1 main roads
  const roadCodeMap: Record<string, [string, string]> = {
    west_avenue: ['RD-01', 'D1'],
    north_west_promenade: ['RD-02', 'D1'],
    nw_diagonal: ['RD-03', 'D1'],
    dense_urban_st_west: ['RD-04', 'D1'],
    central_roundabout: ['RD-05', 'D2'],
    east_avenue: ['RD-06', 'D2'],
    ne_diagonal: ['RD-07', 'D2'],
    north_east_coastal: ['RD-07', 'D2'],
    sw_diagonal: ['RD-08', 'D3'],
    garrison_north_link: ['RD-08', 'D3'],
    garrison_west_link: ['RD-08', 'D3'],
    south_coastal_prison: ['RD-09', 'D3'],
    garrison_south_link: ['RD-09', 'D3'],
    garrison_east_link: ['RD-09', 'D3'],
    tiny_bridge_approach: ['RD-10', 'D3'],
    se_diagonal: ['RD-11', 'D4'],
    east_south_coastal: ['RD-11', 'D4'],
    railyard_south_access: ['RD-11', 'D4'],
    dock_connector: ['RD-11', 'D4'],
    dense_urban_st_east: ['RD-12', 'D4'],
    railyard_north_link: ['RD-12', 'D4'],
  };

  // =========================================================================
  // ARCHIPELAGO NAMED MAIN ROADS RD-13 .. RD-24 (Sector 4, Islands 2, 3 & 4!)
  // =========================================================================
  const rawPts = (coords: [number, number][]): Vec2[] =>
    coords.map(([x, z]) => ({ x, z }));

  const archipelagoRoads: RoadSegment[] = [
    // RD-13: Pereval Mountain Pass (Winding +28m mountain switchback & -4m dark pine valley!)
    {
      id: 'rd_13_pereval_pass',
      code: 'RD-13',
      districtId: 'D5',
      name: 'Pereval Mountain Pass',
      cyrillicName: 'ПЕРЕВАЛ СЕКТОР-4',
      kind: 'avenue',
      width: 18.5,
      icyBias: 0.45,
      points: rawPts([
        [490, -295],
        [565, -355],
        [650, -455],
        [755, -430],
        [835, -330],
        [845, -210],
        [745, -130],
        [595, -60],
        [545, 86],
      ]),
    },
    // RD-14: Watchtower Ridge Trail (High ridge defensive road overlooking Sector 4 peaks)
    {
      id: 'rd_14_watchtower_ridge',
      code: 'RD-14',
      districtId: 'D5',
      name: 'Watchtower Ridge Trail',
      cyrillicName: 'ХРЕБЕТ ВЫШЕК',
      kind: 'street',
      width: 14.5,
      icyBias: 0.52,
      points: rawPts([
        [650, -455],
        [720, -525],
        [845, -480],
        [895, -355],
        [835, -330],
      ]),
    },
    // RD-15: Gate 12 Reinforced Transit Bridge (Connects Island 1 -> Island 2 over shipping strait!)
    {
      id: 'rd_15_gate12_bridge',
      code: 'RD-15',
      districtId: 'D5',
      name: 'Gate 12 Reinforced Transit Bridge',
      cyrillicName: 'МОСТ ВОРОТА-12',
      kind: 'bridge',
      width: 22.0,
      icyBias: 0.36,
      points: rawPts([
        [515, 86],
        [620, 86],
        [735, 86],
        [850, 86],
        [955, 86],
      ]),
    },
    // RD-16: Bolotny Plankway (Raised undulating marsh road across D6 Evergladian High Marshes)
    {
      id: 'rd_16_bolotny_plankway',
      code: 'RD-16',
      districtId: 'D6',
      name: 'Bolotny Plankway',
      cyrillicName: 'БОЛОТНЫЙ НАСТИЛ',
      kind: 'coastal',
      width: 16.5,
      icyBias: 0.58,
      points: rawPts([
        [955, 86],
        [980, -90],
        [1035, -270],
        [1160, -405],
        [1345, -435],
        [1490, -340],
        [1565, -210],
      ]),
    },
    // RD-17: Institutskaya Street (Forensics Bureau main artery across central Island 2)
    {
      id: 'rd_17_institutskaya',
      code: 'RD-17',
      districtId: 'D7',
      name: 'Institutskaya Street',
      cyrillicName: 'ИНСТИТУТСКАЯ УЛИЦА',
      kind: 'avenue',
      width: 21.0,
      icyBias: 0.34,
      points: rawPts([
        [955, 86],
        [1135, 86],
        [1325, 78],
        [1520, 88],
        [1595, 195],
      ]),
    },
    // RD-18: Khrushchevka Ring Road (Cracked sunken -2.5m valley loop flanked by +7m 1960s terraced hills!)
    {
      id: 'rd_18_khrushchevka_ring',
      code: 'RD-18',
      districtId: 'D7',
      name: 'Khrushchevka Ring Road',
      cyrillicName: 'КОЛЬЦО ХРУЩЁВОК',
      kind: 'street',
      width: 17.5,
      icyBias: 0.42,
      points: rawPts([
        [1135, 86],
        [1165, -85],
        [1355, -125],
        [1505, -45],
        [1520, 88],
        [1435, 205],
        [1230, 215],
        [1135, 86],
      ]),
    },
    // RD-19: Energetikov Highway (Industrial Prison, POW Camp & Main Electrical Grid Field!)
    {
      id: 'rd_19_energetikov_hwy',
      code: 'RD-19',
      districtId: 'D8',
      name: 'Energetikov Highway',
      cyrillicName: 'ШОССЕ ЭНЕРГЕТИКОВ',
      kind: 'avenue',
      width: 21.0,
      icyBias: 0.35,
      points: rawPts([
        [1030, 86],
        [1035, 275],
        [1085, 455],
        [1285, 485],
        [1485, 445],
        [1585, 260],
      ]),
    },
    // RD-20: Turbine Service Road (Connects POW Camp turbines & Electrical Grid substation)
    {
      id: 'rd_20_turbine_service',
      code: 'RD-20',
      districtId: 'D8',
      name: 'Turbine Service Road',
      cyrillicName: 'ТУРБИННАЯ ДОРОГА',
      kind: 'street',
      width: 15.5,
      icyBias: 0.4,
      points: rawPts([
        [1035, 275],
        [1225, 315],
        [1395, 335],
        [1485, 445],
      ]),
    },
    // RD-21: Spit Contraband Quay (Narrow peninsula road out to The Spit Black Market Docks)
    {
      id: 'rd_21_spit_quay',
      code: 'RD-21',
      districtId: 'D8',
      name: 'Spit Contraband Quay',
      cyrillicName: 'КОСА · ПРИЧАЛ',
      kind: 'coastal',
      width: 15.0,
      icyBias: 0.46,
      points: rawPts([
        [1485, 445],
        [1625, 442],
        [1745, 435],
      ]),
    },
    // RD-22: Secrecy Beltway Ring-9 (Island 3 Stargate Peninsula +14m basalt perimeter encircling -8m Ark crater!)
    {
      id: 'rd_22_ring9_beltway',
      code: 'RD-22',
      districtId: 'D9',
      name: 'Secrecy Beltway Ring-9',
      cyrillicName: 'КОЛЬЦО СЕКРЕТНОСТИ-9',
      kind: 'avenue',
      width: 19.0,
      icyBias: 0.44,
      points: rawPts([
        [1565, -210],
        [1715, -245],
        [1765, -495],
        [1975, -595],
        [2175, -475],
        [2165, -215],
        [1955, -135],
        [1715, -245],
      ]),
    },
    // RD-23: Golden Gate-II Luxury Causeway (+22m arched crimson suspension bridge to Island 4!)
    {
      id: 'rd_23_golden_gate_2',
      code: 'RD-23',
      districtId: 'D10',
      name: 'Golden Gate-II Luxury Causeway',
      cyrillicName: 'МОСТ ЗОЛОТЫЕ ВОРОТА-II',
      kind: 'bridge',
      width: 23.0,
      icyBias: 0.25,
      points: rawPts([
        [1585, 260],
        [1695, 260],
        [1785, 260],
        [1875, 260],
        [1975, 260],
      ]),
    },
    // RD-24: Elysia Terraced Promenade (Spiraling +18m hillside luxury resort boulevard & Freight Harbor!)
    {
      id: 'rd_24_elysia_promenade',
      code: 'RD-24',
      districtId: 'D10',
      name: 'Elysia Terraced Promenade',
      cyrillicName: 'ПРОМЕНАД ЭЛИЗИИ',
      kind: 'avenue',
      width: 20.5,
      icyBias: 0.22,
      points: rawPts([
        [1975, 260],
        [2115, 165],
        [2315, 145],
        [2425, 295],
        [2385, 515],
        [2175, 585],
        [2005, 485],
        [1975, 260],
      ]),
    },
  ];

  roads.push(...archipelagoRoads);

  for (let i = 0; i < roads.length; i++) {
    const r = roads[i];
    if (r.kind === 'roundabout') r.width = Math.max(r.width, 26.5);
    else if (r.kind === 'avenue') r.width = Math.max(r.width, 20.5);
    else if (r.kind === 'coastal') r.width = Math.max(r.width, 15.5);
    else if (r.kind === 'bridge') r.width = Math.max(r.width, 21.5);
    else if (r.kind === 'street') r.width = Math.max(r.width, 14.5);

    if (!r.name) {
      const lbl = roadLabels[r.id];
      if (lbl) {
        r.name = lbl[0];
        r.cyrillicName = lbl[1];
      } else if (r.id === 'central_roundabout') {
        r.name = 'Reliquary Ring Boulevard';
        r.cyrillicName = 'БУЛЬВАР РЕЛИКВАРИЯ';
      } else if (r.id.startsWith('d1_')) {
        r.code = r.code ?? 'RD-04';
        r.districtId = r.districtId ?? 'D1';
        r.name = `Aptechny Alley · Block ${(i % 8) + 1}`;
        r.cyrillicName = `АПТЕЧНЫЙ ПЕР. ${(i % 8) + 1}`;
      } else if (r.id.startsWith('d2_')) {
        r.code = r.code ?? 'RD-07';
        r.districtId = r.districtId ?? 'D2';
        r.name = `Nevsky Sector St ${(i % 8) + 1}`;
        r.cyrillicName = `НЕВСКАЯ УЛ. ${(i % 8) + 1}`;
      } else {
        r.code = r.code ?? 'RD-05';
        r.districtId = r.districtId ?? 'D2';
        r.name = 'Reliquary Ring Boulevard';
        r.cyrillicName = 'БУЛЬВАР РЕЛИКВАРИЯ';
      }
    }
    const tagged = roadCodeMap[r.id];
    if (tagged) {
      r.code = r.code ?? tagged[0];
      r.districtId = r.districtId ?? tagged[1];
    }
  }

  return roads;
}

export const ROADS: RoadSegment[] = buildRoadNetwork();

// =========================================================================
// COMPLETE 24 NAMED MAIN ROADS DIRECTORY (RD-01 .. RD-24) FOR SIGNAGE & HUD
// =========================================================================
export const NAMED_MAIN_ROADS: {
  code: string;
  name: string;
  cyrillic: string;
  districtId: string;
  gantryX: number;
  gantryZ: number;
  gantryYaw: number;
}[] = [
  { code: 'RD-01', name: 'Prospekt Kalinina', cyrillic: 'ПРОСПЕКТ КАЛИНИНА', districtId: 'D1', gantryX: m2w(-360), gantryZ: m2w(-20), gantryYaw: Math.PI * 0.5 },
  { code: 'RD-02', name: 'Ulitsa Severnaya', cyrillic: 'УЛИЦА СЕВЕРНАЯ', districtId: 'D1', gantryX: m2w(-420), gantryZ: m2w(-520), gantryYaw: 0 },
  { code: 'RD-03', name: 'Ulitsa Gagarina', cyrillic: 'УЛИЦА ГАГАРИНА', districtId: 'D1', gantryX: m2w(-270), gantryZ: m2w(-270), gantryYaw: Math.PI * 0.25 },
  { code: 'RD-04', name: 'Aptechny Alley', cyrillic: 'АПТЕЧНЫЙ ПЕРЕУЛОК', districtId: 'D1', gantryX: m2w(-260), gantryZ: m2w(140), gantryYaw: Math.PI * 0.5 },
  { code: 'RD-05', name: 'Reliquary Ring Boulevard', cyrillic: 'БУЛЬВАР РЕЛИКВАРИЯ', districtId: 'D2', gantryX: m2w(0), gantryZ: m2w(-115), gantryYaw: 0 },
  { code: 'RD-06', name: 'Sobornaya Avenue', cyrillic: 'СОБОРНЫЙ ПРОСПЕКТ', districtId: 'D2', gantryX: m2w(310), gantryZ: m2w(0), gantryYaw: Math.PI * 0.5 },
  { code: 'RD-07', name: 'Nevsky Boulevard', cyrillic: 'НЕВСКИЙ БУЛЬВАР', districtId: 'D2', gantryX: m2w(285), gantryZ: m2w(-285), gantryYaw: -Math.PI * 0.25 },
  { code: 'RD-08', name: 'Garrison Perimeter Road', cyrillic: 'ГАРНИЗОННОЕ КОЛЬЦО', districtId: 'D3', gantryX: m2w(-355), gantryZ: m2w(355), gantryYaw: -Math.PI * 0.25 },
  { code: 'RD-09', name: 'Reinstach Causeway', cyrillic: 'ДАМБА РЕЙНШТАХА', districtId: 'D3', gantryX: m2w(-80), gantryZ: m2w(595), gantryYaw: Math.PI * 0.5 },
  { code: 'RD-10', name: 'SW Mainland Access Bridge', cyrillic: 'ЮГО-ЗАПАДНЫЙ МОСТ', districtId: 'D3', gantryX: m2w(-635), gantryZ: m2w(660), gantryYaw: Math.PI * 0.22 },
  { code: 'RD-11', name: 'Portovoye Shosse', cyrillic: 'ПОРТОВОЕ ШОССЕ', districtId: 'D4', gantryX: m2w(420), gantryZ: m2w(420), gantryYaw: Math.PI * 0.25 },
  { code: 'RD-12', name: 'Zavodskaya Alley', cyrillic: 'ЗАВОДСКАЯ АЛЛЕЯ', districtId: 'D4', gantryX: m2w(360), gantryZ: m2w(180), gantryYaw: Math.PI * 0.5 },
  { code: 'RD-13', name: 'Pereval Mountain Pass', cyrillic: 'ПЕРЕВАЛ СЕКТОР-4', districtId: 'D5', gantryX: 650, gantryZ: -455, gantryYaw: 0.45 },
  { code: 'RD-14', name: 'Watchtower Ridge Trail', cyrillic: 'ХРЕБЕТ ВЫШЕК', districtId: 'D5', gantryX: 780, gantryZ: -502, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-15', name: 'Gate 12 Reinforced Transit Bridge', cyrillic: 'МОСТ ВОРОТА-12', districtId: 'D5', gantryX: 615, gantryZ: 86, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-16', name: 'Bolotny Plankway', cyrillic: 'БОЛОТНЫЙ НАСТИЛ', districtId: 'D6', gantryX: 1160, gantryZ: -405, gantryYaw: Math.PI * 0.42 },
  { code: 'RD-17', name: 'Institutskaya Street', cyrillic: 'ИНСТИТУТСКАЯ УЛИЦА', districtId: 'D7', gantryX: 1190, gantryZ: 84, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-18', name: 'Khrushchevka Ring Road', cyrillic: 'КОЛЬЦО ХРУЩЁВОК', districtId: 'D7', gantryX: 1355, gantryZ: -125, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-19', name: 'Energetikov Highway', cyrillic: 'ШОССЕ ЭНЕРГЕТИКОВ', districtId: 'D8', gantryX: 1210, gantryZ: 472, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-20', name: 'Turbine Service Road', cyrillic: 'ТУРБИННАЯ ДОРОГА', districtId: 'D8', gantryX: 1280, gantryZ: 322, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-21', name: 'Spit Contraband Quay', cyrillic: 'КОСА · ПРИЧАЛ', districtId: 'D8', gantryX: 1625, gantryZ: 442, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-22', name: 'Secrecy Beltway Ring-9', cyrillic: 'КОЛЬЦО СЕКРЕТНОСТИ-9', districtId: 'D9', gantryX: 1975, gantryZ: -595, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-23', name: 'Golden Gate-II Luxury Causeway', cyrillic: 'МОСТ ЗОЛОТЫЕ ВОРОТА-II', districtId: 'D10', gantryX: 1685, gantryZ: 260, gantryYaw: Math.PI * 0.5 },
  { code: 'RD-24', name: 'Elysia Terraced Promenade', cyrillic: 'ПРОМЕНАД ЭЛИЗИИ', districtId: 'D10', gantryX: 2225, gantryZ: 155, gantryYaw: Math.PI * 0.5 },
];

// =========================================================================
// UNDERGROUND-TO-SURFACE GRAND ARCHIPELAGO SUBWAY LOOP (3D ELEVATION!)
// Elevated viaducts (+6.5m) -> Concrete Portal Ramps -> Lit Underground Tunnels (-9.5m)
// -> Gate 12 Strait Crossing (+8.5m) -> Islands 2, 3 (-6.0m) & 4 (+6.5m)!
// =========================================================================
export const METRO_TRACK_HEIGHT = 6.5;

export const METRO_LOOP_POINTS_3D: Vec3Pt[] = [
  // Island 1 North Elevated Viaduct (STN-1 Severny Vokzal)
  { x: -340, y: 6.5, z: -565 },
  { x: -15, y: 6.5, z: -600 },   // STN-1
  { x: 145, y: 5.2, z: -510 },   // Approaching North Portal
  { x: 120, y: -2.5, z: -345 },  // Concrete Portal Ramp Dive!
  // Underground Tunnel (-9.5m) beneath D2 Reliquary Core & D3 Bunker Garrison
  { x: 40, y: -9.5, z: -125 },   // STN-2 Sobornaya Underground
  { x: -115, y: -9.5, z: 95 },
  { x: -265, y: -9.5, z: 295 },  // STN-3 Garrison Bunker Terminal
  { x: -110, y: -9.5, z: 500 },
  { x: 125, y: -2.0, z: 530 },   // South Exit Portal Ramp!
  // Island 1 SE Elevated Viaduct (STN-4 Port Kaluga) -> Gate 12 Bridge (+8.5m)
  { x: 374, y: 6.5, z: 515 },    // STN-4 Port Kaluga Rail Hub
  { x: 540, y: 6.8, z: 335 },
  { x: 565, y: 8.5, z: 102 },    // Gate 12 West Approach (alongside road deck!)
  { x: 740, y: 9.2, z: 102 },    // Gate 12 Mid-Span Strait Crossing!
  { x: 925, y: 5.8, z: 102 },    // Gate 12 East Descent onto Island 2
  // Island 2 Surface Stops (STN-5 Zavod-4 & Forensics -> STN-6 Energetikov Quay)
  { x: 1140, y: 1.5, z: 45 },    // STN-5 Zavod-4 & Forensics Central
  { x: 1165, y: 1.5, z: 265 },
  { x: 1360, y: 1.5, z: 415 },   // STN-6 Energetikov & Black Market Quay
  { x: 1605, y: 4.5, z: 395 },
  // Strait Viaduct to Island 4 Elysia Grand Station (+6.5m)
  { x: 1855, y: 11.5, z: 335 },
  { x: 2160, y: 6.5, z: 310 },   // STN-8 Elysia & Harbor Grand Station
  { x: 2215, y: 4.5, z: 85 },
  // Sub-Surface Strait Tunnel (-6.0m) into Island 3 Stargate Peninsula!
  { x: 2085, y: -3.5, z: -120 },
  { x: 1920, y: -6.0, z: -340 }, // STN-7 Zona-9 Stargate Terminal
  { x: 1620, y: -7.5, z: -425 },
  // Deep Mountain Tunnel (-9.5m) under D5 Sector 4 Mountains back to Island 1!
  { x: 1180, y: -9.5, z: -480 },
  { x: 760, y: -9.5, z: -495 },
  { x: 350, y: -3.0, z: -555 },
];

export const METRO_LOOP_POINTS: Vec2[] = METRO_LOOP_POINTS_3D.map((p) => ({ x: p.x, z: p.z }));

// 8 Complex Multi-Zone Enterable Train Stations (STN-1 through STN-8, 36m x 24m footprints!)
export const METRO_STATIONS: MetroStationSpec[] = [
  {
    id: 'stn_1_severny',
    code: 'STN-1',
    name: 'Severny Vokzal',
    cyrillic: 'СЕВЕРНЫЙ ВОКЗАЛ',
    district: 'D1 Kalinin Nightlife',
    x: -15,
    z: -600,
    trackY: 6.5,
    zoneKind: 'elevated',
    footprintW: 36,
    footprintD: 24,
  },
  {
    id: 'stn_2_sobornaya',
    code: 'STN-2',
    name: 'Sobornaya Metro (Underground)',
    cyrillic: 'СОБОРНАЯ · ПОДЗЕМНАЯ',
    district: 'D2 Central Reliquary',
    x: 40,
    z: -125,
    trackY: -9.5,
    zoneKind: 'underground',
    footprintW: 36,
    footprintD: 24,
  },
  {
    id: 'stn_3_garrison',
    code: 'STN-3',
    name: 'Garrison Bunker Terminal',
    cyrillic: 'ГАРНИЗОН · БУНКЕР',
    district: 'D3 Bunker Garrison',
    x: -265,
    z: 295,
    trackY: -9.5,
    zoneKind: 'underground',
    footprintW: 36,
    footprintD: 24,
  },
  {
    id: 'stn_4_port_kaluga',
    code: 'STN-4',
    name: 'Port Kaluga Rail Hub',
    cyrillic: 'ПОРТ КАЛУГА · ДЕПО-4',
    district: 'D4 Industrial Railyard',
    x: 374,
    z: 515,
    trackY: 6.5,
    zoneKind: 'elevated',
    footprintW: 36,
    footprintD: 24,
  },
  {
    id: 'stn_5_zavod4',
    code: 'STN-5',
    name: 'Zavod-4 & Forensics Central',
    cyrillic: 'ЗАВОД-4 · КРИМИНАЛИСТИКА',
    district: 'D7 Forensics & Ghettos',
    x: 1140,
    z: 45,
    trackY: 1.5,
    zoneKind: 'surface',
    footprintW: 36,
    footprintD: 24,
  },
  {
    id: 'stn_6_energetikov',
    code: 'STN-6',
    name: 'Energetikov & Black Market Quay',
    cyrillic: 'ЭНЕРГЕТИКОВ · КОСА',
    district: 'D8 POW Camp & The Spit',
    x: 1360,
    z: 415,
    trackY: 1.5,
    zoneKind: 'surface',
    footprintW: 36,
    footprintD: 24,
  },
  {
    id: 'stn_7_zona9',
    code: 'STN-7',
    name: 'Zona-9 Stargate Terminal',
    cyrillic: 'ЗОНА-9 · СТАРГЕЙТ',
    district: 'D9 Stargate Peninsula',
    x: 1920,
    z: -340,
    trackY: -6.0,
    zoneKind: 'subsurface',
    footprintW: 36,
    footprintD: 24,
  },
  {
    id: 'stn_8_elysia',
    code: 'STN-8',
    name: 'Elysia & Harbor Grand Station',
    cyrillic: 'ЭЛИЗИЯ · ГАВАНЬ',
    district: 'D10 Elysia Resort & Port',
    x: 2160,
    z: 310,
    trackY: 6.5,
    zoneKind: 'elevated',
    footprintW: 36,
    footprintD: 24,
  },
];

// Distance from point (x, z) to a polyline (open or closed)
export function distToPolyline(
  x: number,
  z: number,
  poly: Vec2[],
  closed = false
): number {
  let minD2 = Infinity;
  const count = closed ? poly.length : poly.length - 1;
  for (let i = 0; i < count; i++) {
    const ax = poly[i].x;
    const az = poly[i].z;
    const next = poly[(i + 1) % poly.length];
    const bx = next.x;
    const bz = next.z;
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz + 1e-9;
    let t = ((x - ax) * dx + (z - az) * dz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const pz = az + t * dz;
    const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

// Strict Metro Track & Station Clearance Check so NO building or tree ever intersects surface tracks!
export function isNearMetroTrack(x: number, z: number, margin: number): boolean {
  for (let i = 0; i < METRO_STATIONS.length; i++) {
    const st = METRO_STATIONS[i];
    if (st.zoneKind === 'underground') continue;
    if (Math.hypot(x - st.x, z - st.z) < margin + 22) return true;
  }
  // Only block Island 1 surface buildings near elevated viaduct sections (not underground tunnels!)
  if (z < -480 || z > 460 || x > 510) {
    if (distToPolyline(x, z, METRO_LOOP_POINTS, true) < margin) return true;
  }
  return false;
}

interface RoadBBox {
  road: RoadSegment;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  halfW: number;
}

const ROAD_BBOXES: RoadBBox[] = ROADS.map((road) => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of road.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const pad = road.width * 0.55 + 2;
  return {
    road,
    minX: minX - pad,
    maxX: maxX + pad,
    minZ: minZ - pad,
    maxZ: maxZ + pad,
    halfW: road.width * 0.5,
  };
});

export type SurfaceType = 'asphalt' | 'puddle' | 'grass' | 'water';

function puddleNoise(x: number, z: number): number {
  const s1 = Math.sin(x * 0.045 + z * 0.032);
  const s2 = Math.cos(x * 0.028 - z * 0.054);
  const s3 = Math.sin((x + z) * 0.092);
  return (s1 * s2 + s3 * 0.5 + 1.5) / 3.0;
}

export function getSurfaceAt(x: number, z: number): SurfaceType {
  let onRoad = false;
  let puddleBias = 0.28;
  for (let i = 0; i < ROAD_BBOXES.length; i++) {
    const rb = ROAD_BBOXES[i];
    if (x < rb.minX || x > rb.maxX || z < rb.minZ || z > rb.maxZ) continue;
    const d = distToPolyline(x, z, rb.road.points);
    if (d <= rb.halfW) {
      onRoad = true;
      puddleBias = Math.max(puddleBias, rb.road.icyBias ?? 0.26);
      if (d > rb.halfW * 0.72) puddleBias += 0.22;
      break;
    }
  }

  if (onRoad) {
    const n = puddleNoise(x, z);
    return n > 1.0 - puddleBias ? 'puddle' : 'asphalt';
  }

  const landD = signedLandDistance(x, z);
  if (landD < -4) return 'water';
  return 'grass';
}

export function isNearAnyRoad(x: number, z: number, extraMargin: number): boolean {
  for (let i = 0; i < ROAD_BBOXES.length; i++) {
    const rb = ROAD_BBOXES[i];
    if (
      x < rb.minX - extraMargin ||
      x > rb.maxX + extraMargin ||
      z < rb.minZ - extraMargin ||
      z > rb.maxZ + extraMargin
    ) {
      continue;
    }
    const d = distToPolyline(x, z, rb.road.points);
    if (d < rb.halfW + extraMargin) return true;
  }
  return false;
}

// Smooth road/bridge vertical elevation profile across all 5 Archipelago regions!
// Island 1 core stays flush at 0.0 so all existing Novaya Kaluga buildings & traffic stay 100% aligned!
export function getRoadElevationAt(x: number, z: number): number {
  // 1. Gate 12 Reinforced Transit Bridge (RD-15): x in [525..945], z near 86 -> smooth arch up to +8.5m!
  if (x >= 515 && x <= 955 && Math.abs(z - 86) < 28) {
    const t = Math.max(0, Math.min(1, (x - 515) / 440));
    const arch = Math.sin(t * Math.PI);
    return arch * arch * 8.5;
  }

  // 2. Golden Gate-II Luxury Suspension Causeway (RD-23): x in [1585..1975], z near 260 -> iconic +22m arch!
  if (x >= 1580 && x <= 1980 && Math.abs(z - 260) < 30) {
    const t = Math.max(0, Math.min(1, (x - 1580) / 400));
    const arch = Math.sin(t * Math.PI);
    return arch * arch * 22.0;
  }

  // 3. Sector 4 Pereval Mountain Pass & Watchtower Ridge (D5): hills up to +26m & -3.5m pine valley!
  if (x > 520 && x < 930 && z < -60 && z > -580) {
    const peak1 = Math.exp(-(((x - 735) * (x - 735)) / 18500 + ((z + 455) * (z + 455)) / 16000)) * 25.5;
    const peak2 = Math.exp(-(((x - 860) * (x - 860)) / 12000 + ((z + 320) * (z + 320)) / 14500)) * 18.0;
    const valley = Math.exp(-(((x - 670) * (x - 670)) / 13000 + ((z + 205) * (z + 205)) / 12000)) * -3.5;
    const edgeFade = Math.max(0, Math.min(1, (x - 520) / 85)) * Math.max(0, Math.min(1, (-60 - z) / 85));
    return (peak1 + peak2 + valley) * edgeFade;
  }

  // 4. Island 2 — Evergladian High Marshes (RD-16 undulating +1.5..+5m), Ghetto sunken valley (-2.5m) & hills (+7m)
  if (x > 880 && x < 1660 && z > -540 && z < 590) {
    // High Marshes undulating plankway
    if (z < -170) {
      const mFade = Math.max(0, Math.min(1, (-170 - z) / 90));
      return (1.6 + Math.sin(x * 0.014) * Math.cos(z * 0.015) * 1.45 + 1.1) * mFade;
    }
    // 1960s Khrushchevka sunken valley around (1335, 35) flanked by terraced hills
    const vDist2 = (x - 1335) * (x - 1335) + (z - 35) * (z - 35);
    if (vDist2 < 240 * 240) {
      const valleyDip = Math.exp(-vDist2 / 14000) * -2.5;
      const hillRing =
        Math.exp(-Math.pow(Math.sqrt(vDist2) - 165, 2) / 2800) * 4.2;
      return valleyDip + hillRing;
    }
    return 0.4;
  }

  // 5. Island 3 — Stargate Peninsula: +14m basalt perimeter ridges circling the sunken -8m Ark crater!
  if (x > 1630 && z < -40) {
    const cx = 1955;
    const cz = -370;
    const r = Math.hypot(x - cx, z - cz);
    const crater = Math.exp(-(r * r) / 11500) * -8.0;
    const ridge = Math.exp(-Math.pow(r - 220, 2) / 8200) * 14.0;
    const causewayFade = Math.max(0, Math.min(1, (x - 1630) / 95));
    return (crater + ridge) * causewayFade;
  }

  // 6. Island 4 — Elysia Terraced Promenade: spiraling +18m luxury resort hillside, descending to flat harbor!
  if (x > 1920 && z > 30) {
    const hillDist2 = (x - 2275) * (x - 2275) + (z - 225) * (z - 225);
    const resortHill = Math.exp(-hillDist2 / 34000) * 17.5;
    const harborFlat = Math.max(0, Math.min(1, (485 - z) / 110));
    return resortHill * harborFlat;
  }

  return 0;
}

export function getTerrainHeight(x: number, z: number): number {
  // Always honor elevated bridge decks (Gate 12 & Golden Gate-II) even right over open water!
  if (x >= 515 && x <= 955 && Math.abs(z - 86) < 16) {
    return getRoadElevationAt(x, z);
  }
  if (x >= 1580 && x <= 1980 && Math.abs(z - 260) < 16) {
    return getRoadElevationAt(x, z);
  }

  const sd = signedLandDistance(x, z);
  if (sd <= -18) return -3.2;
  if (sd < 12) {
    const t = (sd + 18) / 30;
    const smooth = t * t * (3 - 2 * t);
    return -3.2 + smooth * 3.2;
  }

  // Keep Island 1 urban roads flat at 0.0 so Novaya Kaluga has zero road clipping!
  if (x < 520) {
    if (isNearAnyRoad(x, z, 28) || isNearMetroTrack(x, z, 22)) return 0;
    const mx = w2m(x);
    const mz = w2m(z);
    const isWestForest = mx < -675 && mz > 40 && mz < 520;
    const isEastForest = mx > 290 && mx < 700 && mz > 65 && mz < 220;
    const isNECape = mx > 710 && mz < -140;
    if (isWestForest || isEastForest || isNECape) {
      const h =
        (Math.sin(x * 0.018) * Math.cos(z * 0.019) + 1) * 1.35 +
        Math.sin(x * 0.045 - z * 0.03) * 0.35;
      return Math.max(0, h);
    }
    return 0;
  }

  // Archipelago Regions (Sector 4, Island 2, Island 3, Island 4, Lighthouse Rock):
  // Smoothly blend road elevation curves with surrounding sculpted hills (+8..+28m) & valleys (-2.5..-8m)!
  const roadElev = getRoadElevationAt(x, z);
  if (isNearAnyRoad(x, z, 14)) return roadElev;

  const coastBlend = Math.max(0, Math.min(1, (sd - 10) / 38));
  // Sculpted peaks & undulating backcountry terrain outside roads
  let extraRelief = 0;
  if (x > 520 && x < 940 && z < -40) {
    // Sector 4 Snow-Capped Mountains up to +28m!
    extraRelief =
      Math.max(0, Math.sin(x * 0.013) * Math.cos(z * 0.014)) * 6.5 +
      Math.sin(x * 0.031 + z * 0.024) * 1.8;
  } else if (x > 880 && x < 1680 && z > -540 && z < 590) {
    // Island 2: Marshes slightly submerged (-1.2m) off plankway; terraced +7m Ghetto hills!
    if (z < -175) {
      extraRelief = -1.6 + Math.sin(x * 0.025 + z * 0.022) * 0.65;
    } else if (z < 210) {
      extraRelief = (Math.sin(x * 0.016) * Math.cos(z * 0.018) + 0.4) * 2.8;
    } else {
      extraRelief = Math.sin(x * 0.015 - z * 0.014) * 1.4;
    }
  } else if (x > 1630 && z < -40) {
    // Island 3 Stargate volcanic basalt ridges
    extraRelief = Math.sin(x * 0.021) * Math.cos(z * 0.019) * 2.6;
  } else if (x > 1920 && z > 30) {
    // Island 4 Elysia Resort hills
    extraRelief = Math.max(0, Math.sin(x * 0.014 + z * 0.016)) * 2.4;
  } else if (Math.hypot(x - LIGHTHOUSE_ROCK_CENTER.x, z - LIGHTHOUSE_ROCK_CENTER.z) < 46) {
    const r = Math.hypot(x - LIGHTHOUSE_ROCK_CENTER.x, z - LIGHTHOUSE_ROCK_CENTER.z);
    return Math.max(0, (1 - r / 44) * 7.5);
  }

  return (roadElev + extraRelief) * coastBlend;
}

export function getRoadNameAt(x: number, z: number): RoadInfo | null {
  let bestDist = 26;
  let bestRoad: RoadSegment | null = null;
  for (let i = 0; i < ROAD_BBOXES.length; i++) {
    const rb = ROAD_BBOXES[i];
    if (x < rb.minX - 18 || x > rb.maxX + 18 || z < rb.minZ - 18 || z > rb.maxZ + 18) continue;
    const d = distToPolyline(x, z, rb.road.points);
    if (d < rb.halfW + 10 && d < bestDist) {
      bestDist = d;
      bestRoad = rb.road;
    }
  }
  if (!bestRoad) return null;
  return {
    code: bestRoad.code ?? 'RD-05',
    name: bestRoad.name ?? 'Reliquary Ring Boulevard',
    cyrillic: bestRoad.cyrillicName ?? 'БУЛЬВАР РЕЛИКВАРИЯ',
    districtId: bestRoad.districtId ?? 'D2',
  };
}

export function getDistrictAt(x: number, z: number): string {
  // Archipelago Outer Regions (D5 - D10)
  if (Math.hypot(x - LIGHTHOUSE_ROCK_CENTER.x, z - LIGHTHOUSE_ROCK_CENTER.z) < 75) {
    return 'D10 · Solitude Lighthouse · Sea Rock';
  }
  if (x >= 1580 && x <= 1980 && Math.abs(z - 260) < 48) {
    return 'D10 · Golden Gate-II Luxury Causeway';
  }
  if (x > 1900 && z > 20) {
    return z > 460
      ? 'D10 · Elysia Commercial Freight Harbor'
      : 'D10 · Elysia Luxury Resort & Promenade';
  }
  if (x > 1620 && z <= 20) {
    return 'D9 · Stargate Peninsula Occupation Zone';
  }
  if (x >= 520 && x <= 955 && Math.abs(z - 86) < 45) {
    return 'D5 · Gate 12 Reinforced Transit Bridge';
  }
  if (x > 520 && x < 940 && z < -45) {
    return 'D5 · Sector 4 Mountains & Dark Pine Woodlands';
  }
  if (x >= 875 && x <= 1820) {
    if (z < -165) return 'D6 · Evergladian High Marshes';
    if (z <= 215) return 'D7 · Forensics Bureau & 1960s Soviet Ghettos';
    if (x > 1540) return 'D8 · The Spit Black Market Docks';
    return 'D8 · POW Labor Camp & Main Electrical Grid';
  }

  // Island 1 — Novaya Kaluga Districts (D1 - D4)
  const mx = w2m(x);
  const mz = w2m(z);
  const r = Math.hypot(mx, mz);

  if (r < 145) return 'D2 · Central Reliquary & Cathedral Core';
  if (mx < -610 && mz > 590) return 'D3 · SW Mainland Access Bridge';
  if (mx > -280 && mx < 10 && mz > 260 && mz < 660) return 'D3 · Reinstach Prison & Bunker Garrison';
  if (mx < -230 && mx > -660 && mz > 130 && mz < 590) return 'D3 · Bunker Garrison & Safehouse';
  if (mx < -600 && mz > 20 && mz < 520) return 'D5 · Sector 4 Dark Pine Woodlands';
  if (mx > 180 && mz > 240) return 'D4 · Industrial Railyard & Shipping Docks';
  if (mx < 0 && mz <= 120) return 'D1 · Kalinin Commercial & Nightlife';
  if (mx >= 0 && mz <= 240) return 'D2 · Reliquary Core & Residential Sectors';
  return 'D4 · Novaya Kaluga Coastal Ring';
}

export const LANDMARKS: LandmarkPoint[] = [
  {
    id: 'roundabout',
    label: 'D2 · Central Reliquary',
    x: m2w(0),
    z: m2w(96),
    spawnHeading: Math.PI * 0.5,
  },
  {
    id: 'district1',
    label: 'D1 · Kalinin Nightlife',
    x: m2w(-320),
    z: m2w(-370),
    spawnHeading: 0,
  },
  {
    id: 'district2',
    label: 'D2 · Sobornaya Core',
    x: m2w(335),
    z: m2w(-510),
    spawnHeading: Math.PI,
  },
  {
    id: 'bunker',
    label: 'D3 · Bunker Garrison',
    x: m2w(-430),
    z: m2w(480),
    spawnHeading: -Math.PI * 0.25,
  },
  {
    id: 'railyard',
    label: 'D4 · Port Kaluga Docks',
    x: m2w(475),
    z: m2w(290),
    spawnHeading: Math.PI * 0.5,
  },
  {
    id: 'sector4_pass',
    label: 'D5 · Sector 4 Mountain Pass',
    x: 650,
    z: -455,
    spawnHeading: -Math.PI * 0.35,
  },
  {
    id: 'gate12_bridge',
    label: 'RD-15 · Gate 12 Bridge',
    x: 565,
    z: 86,
    spawnHeading: -Math.PI * 0.5,
  },
  {
    id: 'island2_ghettos',
    label: 'D7 · Forensics & 1960s Ghettos',
    x: 1135,
    z: 86,
    spawnHeading: -Math.PI * 0.5,
  },
  {
    id: 'island2_grid',
    label: 'D8 · POW Camp & Electrical Grid',
    x: 1285,
    z: 485,
    spawnHeading: -Math.PI * 0.5,
  },
  {
    id: 'island3_stargate',
    label: 'D9 · Stargate Peninsula',
    x: 1765,
    z: -495,
    spawnHeading: -Math.PI * 0.4,
  },
  {
    id: 'island4_elysia',
    label: 'D10 · Golden Gate-II & Elysia',
    x: 1625,
    z: 260,
    spawnHeading: -Math.PI * 0.5,
  },
];

// =========================================================================
// FULL PUBLIC TRANSPORTATION LOOP: 18 CURBSIDE BUS STOPS CONNECTING ALL 4 DISTRICTS & METRO STATIONS!
// Placed cleanly on curbside sidewalks outside road ribbons (zero road obstruction!)
// =========================================================================
export const BUS_STOPS: BusStopSpec[] = [
  { id: 'bs_1', name: 'Central Reliquary North', cyrillic: 'РЕЛИКВАРИЙ СЕВЕР', routes: 'М1 · 47', x: m2w(21), z: m2w(-170), rotY: -Math.PI * 0.5 },
  { id: 'bs_2', name: 'Commercial · Casino Row', cyrillic: 'ТОРГОВАЯ · КАЗИНО', routes: 'М1 · 08', x: m2w(-430), z: m2w(-347), rotY: 0 },
  { id: 'bs_3', name: 'West Avenue · Market 24/7', cyrillic: 'ЗАПАДНЫЙ ПРОСПЕКТ', routes: 'М2 · 08', x: m2w(-525), z: m2w(-21), rotY: 0 },
  { id: 'bs_4', name: 'District 2 · Parks & Flats', cyrillic: 'СЕКТОР-2 · ПАРКИ', routes: '47 · 99', x: m2w(240), z: m2w(-532), rotY: 0 },
  { id: 'bs_5', name: 'Soviet Monument Plaza', cyrillic: 'ПЛОЩАДЬ МОНУМЕНТА', routes: 'М1 · М2', x: m2w(220), z: m2w(-21), rotY: 0 },
  { id: 'bs_6', name: 'East Avenue · Sector 2', cyrillic: 'ВОСТОЧНЫЙ ПР.', routes: 'М2 · 99', x: m2w(480), z: m2w(21), rotY: Math.PI },
  { id: 'bs_7', name: 'Transit Hub South', cyrillic: 'ТРАНЗИТ ЮГ', routes: 'М1 · 12', x: m2w(-21), z: m2w(195), rotY: Math.PI * 0.5 },
  { id: 'bs_8', name: 'Reinstach Prison Gate', cyrillic: 'РЕЙНШТАХ · ПОСТ', routes: '12 · 99', x: m2w(-21), z: m2w(460), rotY: Math.PI * 0.5 },
  { id: 'bs_9', name: 'Dense Urban St. · Railyard', cyrillic: 'ПЛОТНАЯ · ДЕПО-4', routes: '12 · 47', x: m2w(420), z: m2w(268), rotY: 0 },
  { id: 'bs_10', name: 'Metro Transfer · North Gate', cyrillic: 'МЕТРО СЕВЕРНЫЙ ПОСТ', routes: 'М1 · 47 · [M]', x: m2w(21), z: m2w(-735), rotY: -Math.PI * 0.5 },
  { id: 'bs_11', name: 'Metro Transfer · West Promenade', cyrillic: 'МЕТРО ЗАПАДНАЯ', routes: '08 · 99 · [M]', x: m2w(-738), z: m2w(-215), rotY: -Math.PI * 0.5 },
  { id: 'bs_12', name: 'NE Residential Ring', cyrillic: 'СЕВЕРО-ВОСТ. КВАРТАЛ', routes: '47 · 99', x: m2w(445), z: m2w(-155), rotY: -Math.PI * 0.5 },
  // 6 Additional Metro Transfer & District Loop Stops for full island transit loop!
  { id: 'bs_13', name: 'Metro Transfer · NE Sector 2', cyrillic: 'МЕТРО СЕКТОР-2', routes: '47 · 99 · [M]', x: m2w(722), z: m2w(-505), rotY: Math.PI * 0.5 },
  { id: 'bs_14', name: 'Metro Transfer · East Coast', cyrillic: 'МЕТРО ВОСТОК', routes: 'М2 · 99 · [M]', x: m2w(725), z: m2w(135), rotY: Math.PI * 0.5 },
  { id: 'bs_15', name: 'Metro Transfer · Railyard Docks', cyrillic: 'МЕТРО ДЕПО-4 · ДОКИ', routes: '12 · 99 · [M]', x: m2w(520), z: m2w(658), rotY: Math.PI },
  { id: 'bs_16', name: 'Metro Transfer · South Ferry', cyrillic: 'МЕТРО ЮЖНЫЙ ПАРОМ', routes: '12 · 99 · [M]', x: m2w(-180), z: m2w(685), rotY: Math.PI },
  { id: 'bs_17', name: 'Cyber Arcade · District 1', cyrillic: 'КИБЕР-АРКАДА · Р-1', routes: 'М1 · 08', x: m2w(-210), z: m2w(-228), rotY: Math.PI },
  { id: 'bs_18', name: 'District 3 · Garrison Access', cyrillic: 'РАЙОН-3 · ГАРНИЗОН', routes: 'М2 · 12', x: m2w(-305), z: m2w(21), rotY: Math.PI },
];

// =========================================================================
// SIGNALIZED INTERSECTIONS (WORKING 4-WAY TRAFFIC LIGHTS + ZEBRA CROSSWALKS)
// =========================================================================
export const SIGNALIZED_INTERSECTIONS: SignalIntersectionSpec[] = [
  // Cardinal Avenue Crossings around Central Reliquary
  { id: 'ix_n1', streetNS: 'СЕВЕРНЫЙ ПР. · NORTH AVE', streetEW: 'ТОРГОВАЯ 1 · COMMERCIAL 1', x: m2w(0), z: m2w(-130), halfSpanNS: 14.5, halfSpanEW: 10.5, phaseOffset: 0 },
  { id: 'ix_n2', streetNS: 'СЕВЕРНЫЙ ПР. · NORTH AVE', streetEW: 'ТОРГОВАЯ 2 · COMMERCIAL 2', x: m2w(0), z: m2w(-250), halfSpanNS: 14.5, halfSpanEW: 10.5, phaseOffset: 7 },
  { id: 'ix_n3', streetNS: 'СЕВЕРНЫЙ ПР. · NORTH AVE', streetEW: 'СЕКТОР-2 · SECTOR 2 BLVD', x: m2w(0), z: m2w(-370), halfSpanNS: 14.5, halfSpanEW: 10.5, phaseOffset: 14 },
  { id: 'ix_n4', streetNS: 'СЕВЕРНЫЙ ПР. · NORTH AVE', streetEW: 'ПАРКОВАЯ · PARKWAY', x: m2w(0), z: m2w(-510), halfSpanNS: 14.5, halfSpanEW: 10.5, phaseOffset: 3 },
  { id: 'ix_n5', streetNS: 'СЕВЕРНЫЙ ПР. · NORTH AVE', streetEW: 'СЕВЕРНОЕ КОЛЬЦО · NORTH RING', x: m2w(0), z: m2w(-690), halfSpanNS: 14.5, halfSpanEW: 12.5, phaseOffset: 10 },
  // West Avenue Commercial Corridor
  { id: 'ix_w1', streetNS: 'АЛЛЕЯ КАЗИНО · CASINO ROW', streetEW: 'ЗАПАДНЫЙ ПР. · WEST AVE', x: m2w(-320), z: m2w(0), halfSpanNS: 10.5, halfSpanEW: 14.5, phaseOffset: 4 },
  { id: 'ix_w2', streetNS: 'УЛ. АРКАД · ARCADE ST', streetEW: 'ЗАПАДНЫЙ ПР. · WEST AVE', x: m2w(-540), z: m2w(0), halfSpanNS: 10.5, halfSpanEW: 14.5, phaseOffset: 11 },
  // District 1 Commercial & Nightlife Inner Grid
  { id: 'ix_d1a', streetNS: 'АЛЛЕЯ КАЗИНО · CASINO ROW', streetEW: 'ТОРГОВАЯ 2 · COMMERCIAL 2', x: m2w(-320), z: m2w(-250), halfSpanNS: 10.2, halfSpanEW: 10.2, phaseOffset: 2 },
  { id: 'ix_d1b', streetNS: 'УЛ. АРКАД · ARCADE ST', streetEW: 'ТОРГОВАЯ 3 · COMMERCIAL 3', x: m2w(-430), z: m2w(-370), halfSpanNS: 10.2, halfSpanEW: 10.2, phaseOffset: 9 },
  { id: 'ix_d1c', streetNS: 'УЛ. БИБЛИОТЕК · LIBRARY ST', streetEW: 'ТОРГОВАЯ 2 · COMMERCIAL 2', x: m2w(-210), z: m2w(-250), halfSpanNS: 10.2, halfSpanEW: 10.2, phaseOffset: 15 },
  { id: 'ix_d1d', streetNS: 'ЗАПАДНАЯ УЛ. · WEST ST', streetEW: 'ТОРГОВАЯ 1 · COMMERCIAL 1', x: m2w(-540), z: m2w(-130), halfSpanNS: 10.2, halfSpanEW: 10.2, phaseOffset: 6 },
  // East Avenue & District 2 Residential Sectors
  { id: 'ix_e1', streetNS: 'ЖИЛАЯ 1 · SECTOR 2 ST', streetEW: 'ВОСТОЧНЫЙ ПР. · EAST AVE', x: m2w(320), z: m2w(0), halfSpanNS: 10.5, halfSpanEW: 14.5, phaseOffset: 5 },
  { id: 'ix_e2', streetNS: 'ЖИЛАЯ 3 · SECTOR 2 EAST', streetEW: 'ВОСТОЧНЫЙ ПР. · EAST AVE', x: m2w(530), z: m2w(0), halfSpanNS: 10.5, halfSpanEW: 14.5, phaseOffset: 12 },
  { id: 'ix_d2a', streetNS: 'СЕКТОР-2 ЦЕНТР · PARK ST', streetEW: 'ЖИЛАЯ СЕВЕР · RESID. BLVD', x: m2w(225), z: m2w(-510), halfSpanNS: 10.2, halfSpanEW: 10.2, phaseOffset: 1 },
  { id: 'ix_d2b', streetNS: 'СЕКТОР-2 ВОСТОК · EAST ST', streetEW: 'ЖИЛАЯ ЮГ · SOUTH RES.', x: m2w(425), z: m2w(-260), halfSpanNS: 10.2, halfSpanEW: 10.2, phaseOffset: 8 },
  // South Avenue, Prison & Industrial Railyard (District 4)
  { id: 'ix_s1', streetNS: 'ЮЖНЫЙ ПР. · SOUTH AVE', streetEW: 'ПЛОТНАЯ УЛ. · DENSE URBAN ST', x: m2w(0), z: m2w(290), halfSpanNS: 14.5, halfSpanEW: 14.5, phaseOffset: 6 },
  { id: 'ix_d4a', streetNS: 'ПОРТОВЫЙ ПР. · HARBOR AVE', streetEW: 'ПЛОТНАЯ УЛ. · DENSE URBAN ST', x: m2w(235), z: m2w(290), halfSpanNS: 14.5, halfSpanEW: 14.5, phaseOffset: 13 },
  { id: 'ix_d4b', streetNS: 'ПРИЧАЛЬНЫЙ ПР. · PIER RD', streetEW: 'УЛ. ДЕПО-4 · DEPOT FREIGHT ST', x: m2w(475), z: m2w(515), halfSpanNS: 11.0, halfSpanEW: 11.0, phaseOffset: 4 },
];

// =========================================================================
// DISTRICT GATEWAY SIGNS, ROAD LABELS, METRO TRAIN & BUS WAYFINDING SIGNS
// =========================================================================
export const ROAD_WAYFINDING_SIGNS: DistrictSignSpec[] = [
  // Central Reliquary Roundabout Radial Direction Portals (Tell drivers which avenue leads where!)
  { x: m2w(20), z: m2w(-108), rotY: 0, titleCyr: '↑ РАЙОН 1 · ЦЕНТР · МЕТРО СЕВЕР', titleEng: 'NORTH AVE → DISTRICT 1 & METRO', subText: '[M] СЕВЕРНЫЙ ПОСТ 520m · [A] BUS M1', accent: '#38bdf8', kind: 'highway' },
  { x: m2w(-20), z: m2w(108), rotY: Math.PI, titleCyr: '↑ ЮЖНЫЙ ПР. · РЕЙНШТАХ · ПАРОМ', titleEng: 'SOUTH AVE → REINSTACH & FERRY', subText: '[M] МЕТРО ЮГ 480m · [A] BUS 12', accent: '#f59e0b', kind: 'highway' },
  { x: m2w(112), z: m2w(-20), rotY: -Math.PI * 0.5, titleCyr: '↑ РАЙОН 2 · ПАРКИ · ВОСТОЧНЫЙ БЕРЕГ', titleEng: 'EAST AVE → DISTRICT 2 RESIDENTIAL', subText: '[M] ВОСТОЧНЫЙ БЕРЕГ 490m · [A] BUS M2', accent: '#34d399', kind: 'highway' },
  { x: m2w(-112), z: m2w(20), rotY: Math.PI * 0.5, titleCyr: '↑ РАЙОН 1 · КАЗИНО · ЗАПАДНЫЙ ПР.', titleEng: 'WEST AVE → CASINOS & PROMENADE', subText: '[M] ЗАПАДНЫЙ ПР. 510m · [A] BUS 08', accent: '#ff2e88', kind: 'highway' },

  // District Welcome Portals
  { x: m2w(-160), z: m2w(-24), rotY: Math.PI * 0.5, titleCyr: 'РАЙОН 1 · КОММЕРЦИЯ И НОЧНАЯ ЖИЗНЬ', titleEng: 'DISTRICT 1 · COMMERCIAL & NIGHTLIFE', subText: 'КАЗИНО · АРКАДЫ · КИБЕР-БИБЛИОТЕКИ', accent: '#ff2e88', kind: 'district' },
  { x: m2w(245), z: m2w(-24), rotY: -Math.PI * 0.5, titleCyr: 'РАЙОН 2 · ЖИЛЫЕ КВАРТАЛЫ И ПАРКИ', titleEng: 'DISTRICT 2 · RESIDENTIAL & PARKS', subText: 'КИРПИЧНЫЕ ДОМА · ШКОЛЫ · АВТОБУС 47', accent: '#38bdf8', kind: 'district' },
  { x: m2w(-245), z: m2w(215), rotY: 0.78, titleCyr: 'РАЙОН 3 · ГАРНИЗОН И БУНКЕР', titleEng: 'DISTRICT 3 · MILITARY GARRISON', subText: 'ОХРАНЯЕМАЯ ЗОНА · ПОСТ 3', accent: '#ef4444', kind: 'district' },
  { x: m2w(295), z: m2w(268), rotY: 0, titleCyr: 'РАЙОН 4 · ПЛОТНАЯ УЛ. · ДЕПО И ДОКИ', titleEng: 'DISTRICT 4 · INDUSTRIAL RAILYARD', subText: '[M] МЕТРО ДЕПО-4 → · ПОРТОВЫЕ ДОКИ', accent: '#f59e0b', kind: 'district' },
  { x: m2w(-22), z: m2w(355), rotY: Math.PI, titleCyr: 'РЕЙНШТАХ · ИСПРАВИТЕЛЬНЫЙ СЕКТОР', titleEng: 'PRISON HOLDING FACILITY (REINSTACH)', subText: '[A] АВТОБУС 12 · [M] ЮЖНЫЙ ПАРОМ ↓', accent: '#f97316', kind: 'district' },
  { x: m2w(-575), z: m2w(595), rotY: 0.78, titleCyr: 'МАТЕРИКОВЫЙ МОСТ · ВЫЕЗД С ОСТРОВА', titleEng: 'TINY BRIDGE · MAINLAND ACCESS', subText: 'ОСТОРОЖНО · СКОЛЬЗКИЙ МОСТ', accent: '#38bdf8', kind: 'district' },

  // Metro Train Station Wayfinding Signs (Clear red M + arrow guiding to all 6 perimeter train stations!)
  { x: m2w(22), z: m2w(-615), rotY: 0, titleCyr: '[M] МЕТРО «СЕВЕРНЫЙ ПОСТ» ↑ 150м', titleEng: 'METRO TRAIN STATION AHEAD 150M', subText: 'КОЛЬЦЕВАЯ ЛИНИЯ · АВТОПИЛОТ · [A] ПЕРЕСАДКА', accent: '#ff2e38', kind: 'metro_dir' },
  { x: m2w(-665), z: m2w(-195), rotY: Math.PI * 0.5, titleCyr: '[M] МЕТРО «ЗАПАДНЫЙ ПРОСПЕКТ» ← 110м', titleEng: 'WEST PROMENADE METRO STATION', subText: 'ВХОД С НАБЕРЕЖНОЙ · [A] АВТОБУС 08', accent: '#ff2e38', kind: 'metro_dir' },
  { x: m2w(660), z: m2w(-455), rotY: -Math.PI * 0.25, titleCyr: '[M] МЕТРО «СЕКТОР-2 СЕВЕР» ↗ 120м', titleEng: 'NE SECTOR 2 METRO STATION', subText: 'КОЛЬЦЕВАЯ ЛИНИЯ · [A] АВТОБУС 47', accent: '#ff2e38', kind: 'metro_dir' },
  { x: m2w(655), z: m2w(30), rotY: -Math.PI * 0.5, titleCyr: '[M] МЕТРО «ВОСТОЧНЫЙ БЕРЕГ» → 140м', titleEng: 'EAST COAST METRO STATION', subText: 'ПЕРЕХОД НА ПЛАТФОРМУ · [A] АВТОБУС M2', accent: '#ff2e38', kind: 'metro_dir' },
  { x: m2w(495), z: m2w(565), rotY: Math.PI, titleCyr: '[M] МЕТРО «ДЕПО-4 · ДОКИ» ↓ 110м', titleEng: 'RAILYARD & DOCKS METRO STATION', subText: 'ЭКСПРЕСС КОЛЬЦО · [A] АВТОБУС 12', accent: '#ff2e38', kind: 'metro_dir' },
  { x: m2w(-110), z: m2w(648), rotY: Math.PI, titleCyr: '[M] МЕТРО «РЕЙНШТАХ · ПАРОМ» ↙ 120м', titleEng: 'SOUTH FERRY METRO STATION', subText: 'КОЛЬЦЕВАЯ ЛИНИЯ · [A] АВТОБУС 99', accent: '#ff2e38', kind: 'metro_dir' },

  // Bus Transit Hub Wayfinding Signs
  { x: m2w(-68), z: m2w(135), rotY: 0.65, titleCyr: '[A] АВТОВОКЗАЛ · ТРАНЗИТ ЮГ', titleEng: 'TRANSIT HUB SOUTH · BUS LOOP', subText: 'МАРШРУТЫ М1 · 12 · 99 · ПЕРЕСАДКА', accent: '#0ea5e9', kind: 'bus_dir' },
  { x: m2w(125), z: m2w(95), rotY: -0.55, titleCyr: '[A] АВТОВОКЗАЛ · ТРАНЗИТ ВОСТОК', titleEng: 'TRANSIT HUB EAST · BUS LOOP', subText: 'МАРШРУТЫ М2 · 47 · 99 · К МЕТРО', accent: '#0ea5e9', kind: 'bus_dir' },
  { x: m2w(-340), z: m2w(-232), rotY: 0, titleCyr: '[A] ОСТАНОВКА · КАЗИНО И АРКАДЫ →', titleEng: 'BUS STOP AHEAD · ROUTES M1 / 08', subText: 'КРУГЛОСУТОЧНЫЙ КОЛЬЦЕВОЙ АВТОБУС', accent: '#0ea5e9', kind: 'bus_dir' },
  { x: m2w(205), z: m2w(-492), rotY: Math.PI, titleCyr: '[A] ОСТАНОВКА · СЕКТОР-2 ПАРКИ →', titleEng: 'BUS STOP · ROUTES 47 / 99', subText: 'ПРЯМОЙ РЕЙС ДО СТАНЦИИ МЕТРО', accent: '#0ea5e9', kind: 'bus_dir' },
];

// =========================================================================
// DENSE, RICHLY VARIED CITY BUILDING GENERATION (ZERO ROAD/TRAIN OVERLAPS!)
// =========================================================================
const COMMERCIAL_STYLES: BuildingStyle[] = [
  'commercial_brick',
  'brick_apt_red',
  'commercial_ochre',
  'commercial_mint',
  'brick_apt_terracotta',
  'commercial_burgundy',
  'commercial_cream',
  'brick_apt_dark',
  'commercial_slate',
];

const PANELKA_STYLES: BuildingStyle[] = [
  'brick_apt_red',
  'panelka_grey',
  'brick_apt_terracotta',
  'panelka_sand',
  'brick_apt_dark',
  'panelka_teal',
  'panelka_rose',
  'panelka_cobalt',
];

export function generateCityBuildings(): BuildingSpec[] {
  const rng = mulberry32(19860426);
  const buildings: BuildingSpec[] = [];

  // Tighter urban clustering (buildings can sit shoulder-to-shoulder within 0.4m inside blocks!)
  const overlapsExisting = (x: number, z: number, w: number, d: number): boolean => {
    const r = Math.max(w, d) * 0.42;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const br = Math.max(b.w, b.d) * 0.42;
      if (Math.hypot(x - b.x, z - b.z) < (r + br) * 0.88 + 0.35) return true;
    }
    return false;
  };

  const NEON_PALETTE = [
    '#00e5ff', // futuristic electric cyan
    '#ff2e88', // casino hot magenta
    '#ffb824', // gilded casino amber
    '#3b82f6', // cyber library ice-blue
    '#a855f7', // arcade ultraviolet
    '#10b981', // pharmacy/cyber emerald
    '#ff4d4d', // Russian nightlife crimson
  ];

  const tryPlace = (
    mx: number,
    mz: number,
    w: number,
    d: number,
    h: number,
    rotY: number,
    style: BuildingStyle,
    roofKind: 'flat' | 'mansard' | 'gabled' | 'spire' = 'flat',
    hasStorefront = false,
    venue: VenueKind = 'none',
    neonColor?: string
  ): boolean => {
    const x = m2w(mx);
    const z = m2w(mz);
    const halfDiag = Math.hypot(w, d) * 0.5;

    // 1. Keep safely inside island shoreline
    if (signedLandDistance(x, z) < halfDiag + 7) return false;
    // 2. Keep STRICTLY clear of the perimeter Metro Rail Loop & Stations!
    if (isNearMetroTrack(x, z, halfDiag + 11.5)) return false;
    // 3. Keep clear of Central Roundabout, Secondary Roundabouts & Hero Landmark Plazas
    if (Math.hypot(mx, mz) < 116) return false;
    for (let rIdx = 0; rIdx < SECONDARY_ROUNDABOUTS.length; rIdx++) {
      const rb = SECONDARY_ROUNDABOUTS[rIdx];
      if (Math.hypot(mx - rb.mx, mz - rb.mz) < rb.rMap + 24) return false;
    }
    if (Math.hypot(mx + 140, mz + 72) < 48) return false; // West Cathedral
    if (Math.hypot(mx - 84, mz + 168) < 48) return false; // North Cathedral
    if (Math.hypot(mx - 148, mz + 62) < 42) return false; // Soviet Monument
    if (Math.hypot(mx + 85, mz - 165) < 36) return false; // Transit Hub S
    if (Math.hypot(mx - 145, mz - 115) < 36) return false; // Transit Hub E
    if (Math.hypot(mx + 425, mz - 395) < 40) return false; // Military Helipad/Radar

    // 4. STRICT ROAD CLEARANCE (center + 8 perimeter probes so roads are 100% open & clear!)
    if (isNearAnyRoad(x, z, 4.5)) return false;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const probes: [number, number][] = [
      [-w * 0.5, -d * 0.5],
      [w * 0.5, -d * 0.5],
      [w * 0.5, d * 0.5],
      [-w * 0.5, d * 0.5],
      [0, -d * 0.5],
      [0, d * 0.5],
      [-w * 0.5, 0],
      [w * 0.5, 0],
    ];
    for (const [lx, lz] of probes) {
      const wx = x + lx * cos - lz * sin;
      const wz = z + lx * sin + lz * cos;
      if (isNearAnyRoad(wx, wz, 4.2)) return false;
      if (isNearMetroTrack(wx, wz, 9.5)) return false;
    }

    if (overlapsExisting(x, z, w, d)) return false;

    buildings.push({
      x,
      z,
      w,
      d,
      h,
      rotY,
      style,
      roofKind,
      hasStorefront,
      venue,
      neonColor,
      seed: Math.floor(rng() * 100000),
    });
    return true;
  };

  // --- DISTRICT 1: DENSE COMMERCIAL, CASINOS, ARCADES, COMPUTER LIBRARIES & URBAN NIGHTLIFE ---
  // Tightly bunched 3x2 / 2x2 sub-block clusters with dramatic height stepping (9m shops to 62m neon spires!)
  const d1Cols = [-705, -595, -485, -375, -265, -155, -52];
  const d1Rows = [-65, -190, -310, -430, -550, -662, -748];
  const d1Venues: VenueKind[] = [
    'casino',
    'arcade',
    'computer_library',
    'nightlife',
    'pharmacy',
    'casino',
    'arcade',
    'computer_library',
  ];

  for (let ci = 0; ci < d1Cols.length; ci++) {
    for (let ri = 0; ri < d1Rows.length; ri++) {
      const bx = d1Cols[ci];
      const bz = d1Rows[ri];
      if (bz > -95 && bx > -120) continue;

      // Tightly bunched 6-slot cluster per block so streets feel like real canyonized urban avenues!
      const slots: [number, number, number, number][] = [
        [-28, -28, 17, 17],
        [0, -28, 15, 16],
        [28, -28, 17, 17],
        [-28, 26, 17, 17],
        [0, 26, 15, 16],
        [28, 26, 17, 17],
        [-26, 0, 15, 15],
        [26, 0, 15, 15],
      ];

      for (let s = 0; s < slots.length; s++) {
        const [ox, oz, bw, bd] = slots[s];
        const w = bw + (rng() - 0.3) * 5;
        const d = bd + (rng() - 0.3) * 5;

        // Dramatic skyline height distribution: mix of low shops (10-15m), mid-rise (18-30m), and tall futuristic towers (36-62m)!
        const roll = rng();
        const isDowntownCore = bx > -520 && bz > -580;
        let h: number;
        let roofKind: 'flat' | 'mansard' | 'gabled' | 'spire';
        if (roll > 0.74 && isDowntownCore) {
          h = 38 + rng() * 24; // Towering 38-62m neon skyscraper / Grand Casino Tower!
          roofKind = 'spire';
        } else if (roll > 0.42) {
          h = 20 + rng() * 15; // Mid-rise 20-35m
          roofKind = rng() > 0.5 ? 'mansard' : 'flat';
        } else {
          h = 9.5 + rng() * 9; // Cozy 9.5-18.5m arcade / library / storefront
          roofKind = rng() > 0.4 ? 'mansard' : 'flat';
        }

        const style =
          COMMERCIAL_STYLES[
            (ci * 3 + ri * 5 + s + Math.floor(rng() * 6)) % COMMERCIAL_STYLES.length
          ];
        const venue =
          rng() < 0.62
            ? d1Venues[(ci + ri * 2 + s) % d1Venues.length]
            : 'none';
        const neonColor =
          venue === 'casino'
            ? rng() > 0.5
              ? '#ff2e88'
              : '#ffb824'
            : venue === 'arcade'
            ? rng() > 0.5
              ? '#00e5ff'
              : '#a855f7'
            : venue === 'computer_library'
            ? rng() > 0.5
              ? '#38bdf8'
              : '#10b981'
            : venue === 'pharmacy'
            ? '#10b981'
            : h > 30 || rng() < 0.55
            ? NEON_PALETTE[Math.floor(rng() * NEON_PALETTE.length)]
            : undefined;

        tryPlace(bx + ox, bz + oz, w, d, h, 0, style, roofKind, true, venue, neonColor);
      }

      // Inner courtyard centerpiece tower if space permits
      tryPlace(
        bx,
        bz,
        16 + rng() * 6,
        16 + rng() * 6,
        28 + rng() * 24,
        0,
        COMMERCIAL_STYLES[Math.floor(rng() * COMMERCIAL_STYLES.length)],
        'spire',
        true,
        d1Venues[(ci + ri) % d1Venues.length],
        NEON_PALETTE[(ci + ri) % NEON_PALETTE.length]
      );
    }
  }

  // --- DISTRICT 2: DENSE RESIDENTIAL SECTORS (Varied Height Panelkas + Cyber Libraries & Shops) ---
  const d2UpCols = [58, 170, 280, 388];
  const d2UpRows = [-600, -415];
  for (let ci = 0; ci < d2UpCols.length; ci++) {
    for (let ri = 0; ri < d2UpRows.length; ri++) {
      const bx = d2UpCols[ci];
      const bz = d2UpRows[ri];

      // 3-tier bunched residential towers (varying from 14m to 52m high-rises!)
      for (const slot of [-26, 0, 26]) {
        const w = slot === 0 ? 13 : 15 + rng() * 4;
        const d = slot === 0 ? 22 : 44 + rng() * 14;
        const h =
          slot === 0
            ? 10 + rng() * 12 // low courtyard library/arcade/shop
            : 16 + Math.floor(rng() * 8) * 4.5; // dramatic 16m to 52m stepped residential blocks!
        const style =
          slot === 0
            ? COMMERCIAL_STYLES[(ci + ri) % COMMERCIAL_STYLES.length]
            : PANELKA_STYLES[(ci + ri * 2 + (slot > 0 ? 1 : 0)) % PANELKA_STYLES.length];
        const venue: VenueKind =
          slot === 0
            ? (ci + ri) % 2 === 0
              ? 'computer_library'
              : 'arcade'
            : 'none';
        const neon =
          venue === 'computer_library'
            ? '#38bdf8'
            : venue === 'arcade'
            ? '#a855f7'
            : h > 36
            ? NEON_PALETTE[(ci + ri) % NEON_PALETTE.length]
            : undefined;
        tryPlace(
          bx + slot,
          bz + (slot === 0 ? (ri === 0 ? -24 : 24) : 0),
          w,
          d,
          h,
          0,
          style,
          h > 40 ? 'spire' : 'flat',
          slot === 0,
          venue,
          neon
        );
      }
      // Courtyard south/north infill building
      tryPlace(
        bx,
        bz + (ri === 0 ? 34 : -34),
        16,
        13,
        11 + rng() * 8,
        0,
        'commercial_cream',
        'mansard',
        true,
        'computer_library',
        '#00e5ff'
      );
    }
  }

  // Lower-East residential sectors (x: 320..625, z: -260..0)
  const d2LowCols = [372, 478, 578];
  const d2LowRows = [-195, -65];
  for (let ci = 0; ci < d2LowCols.length; ci++) {
    for (let ri = 0; ri < d2LowRows.length; ri++) {
      const bx = d2LowCols[ci];
      const bz = d2LowRows[ri];
      for (const slot of [-24, 24]) {
        const w = 15 + rng() * 4;
        const d = 36 + rng() * 10;
        const h = 15 + Math.floor(rng() * 7) * 4.5; // 15m..46m varied heights!
        const style =
          PANELKA_STYLES[(ci * 2 + ri + (slot > 0 ? 2 : 0)) % PANELKA_STYLES.length];
        tryPlace(
          bx + slot,
          bz,
          w,
          d,
          h,
          0,
          style,
          h > 36 ? 'spire' : 'flat',
          false,
          'none',
          h > 32 ? '#00e5ff' : undefined
        );
      }
      // Tightly nestled corner shop/arcade between panelka slabs
      tryPlace(
        bx,
        bz + (ri === 0 ? -16 : 16),
        13,
        14,
        10 + rng() * 8,
        0,
        COMMERCIAL_STYLES[(ci + ri * 3) % COMMERCIAL_STYLES.length],
        'mansard',
        true,
        ci % 2 === 0 ? 'arcade' : 'casino',
        ci % 2 === 0 ? '#a855f7' : '#ffb824'
      );
    }
  }

  // Mid Sector 2 & Northern Strip Neon Nightlife / Computer Libraries / High-Rises
  const midSector2Spots: [number, number, number, number, number, BuildingStyle, VenueKind, string][] = [
    [168, -245, 22, 16, 26, 'commercial_ochre', 'casino', '#ffb824'],
    [225, -195, 17, 28, 42, 'panelka_sand', 'computer_library', '#38bdf8'],
    [268, -110, 22, 18, 22, 'commercial_mint', 'arcade', '#00e5ff'],
    [245, -45, 20, 16, 14, 'commercial_slate', 'computer_library', '#10b981'],
    [52, -260, 18, 22, 34, 'panelka_rose', 'nightlife', '#ff2e88'],
    [52, -735, 24, 16, 24, 'panelka_cobalt', 'none', '#00e5ff'],
    [165, -735, 26, 16, 36, 'panelka_teal', 'arcade', '#a855f7'],
    [285, -735, 24, 16, 18, 'panelka_grey', 'none', '#38bdf8'],
    [205, -130, 16, 16, 32, 'commercial_burgundy', 'casino', '#ff2e88'],
    [275, -195, 16, 18, 16, 'commercial_cream', 'computer_library', '#38bdf8'],
  ];
  for (const [mx, mz, w, d, h, st, venue, neon] of midSector2Spots) {
    tryPlace(
      mx,
      mz,
      w,
      d,
      h,
      0,
      st,
      h > 34 ? 'spire' : st.startsWith('commercial') ? 'mansard' : 'flat',
      st.startsWith('commercial') || venue !== 'none',
      venue,
      neon
    );
  }

  // Far NE 45°-rotated Residential Sector blocks (tightly clustered multi-height towers!)
  const neCenter = { x: 575, z: -420 };
  const angle45 = Math.PI * 0.25;
  const localOffsets: [number, number, number, BuildingStyle][] = [
    [-46, -46, 38, 'panelka_grey'],
    [46, -46, 22, 'panelka_cobalt'],
    [-46, 46, 48, 'panelka_sand'],
    [46, 46, 18, 'panelka_rose'],
    [-12, -46, 28, 'panelka_teal'],
    [12, 46, 32, 'panelka_grey'],
    [-46, 0, 15, 'commercial_ochre'],
    [46, 0, 26, 'commercial_slate'],
  ];
  for (const [lx, lz, h, st] of localOffsets) {
    const rx = neCenter.x + lx * Math.cos(angle45) - lz * Math.sin(angle45);
    const rz = neCenter.z + lx * Math.sin(angle45) + lz * Math.cos(angle45);
    tryPlace(
      rx,
      rz,
      16,
      28,
      h,
      angle45,
      st,
      h > 36 ? 'spire' : 'flat',
      st.startsWith('commercial'),
      st.startsWith('commercial') ? 'computer_library' : 'none',
      h > 30 ? '#00e5ff' : undefined
    );
  }

  // --- DISTRICT 3: MILITARY BUNKER GARRISON / OPERATION SITE (SW) ---
  const bunkerSpecs: [number, number, number, number, number, number, BuildingStyle][] = [
    [-465, 285, 30, 20, 11, -0.35, 'military_bunker'],
    [-390, 345, 26, 18, 9, -0.35, 'military_bunker'],
    [-505, 435, 34, 20, 14, 0.25, 'military_bunker'],
    [-345, 465, 26, 20, 16, -0.5, 'military_bunker'],
    [-555, 330, 22, 16, 9, 0.1, 'industrial_concrete'],
    [-435, 515, 28, 14, 8, -0.15, 'military_bunker'],
    [-295, 265, 20, 14, 12, -0.4, 'industrial_concrete'],
    [-525, 245, 22, 16, 10, 0.2, 'military_bunker'],
    [-365, 225, 18, 16, 15, -0.3, 'industrial_concrete'],
  ];
  for (const [bx, bz, w, d, h, rot, st] of bunkerSpecs) {
    tryPlace(bx, bz, w, d, h, rot, st, 'flat', false, 'none', '#ff4d4d');
  }

  // --- PRISON HOLDING FACILITY (REINSTACH) (South-Central) ---
  const prisonSpecs: [number, number, number, number, number, number][] = [
    [-135, 380, 40, 14, 13, 0.35],
    [-110, 455, 44, 15, 18, 0.35],
    [-150, 520, 36, 14, 11, 0.35],
    [-58, 495, 16, 34, 15, 0.0],
    [-185, 445, 14, 26, 12, 0.2],
  ];
  for (const [bx, bz, w, d, h, rot] of prisonSpecs) {
    tryPlace(bx, bz, w, d, h, rot, 'prison_block', 'flat', false, 'none');
  }

  // --- DISTRICT 4: DENSE URBAN ST., INDUSTRIAL RAILYARD & SHIPPING DOCKS (SE) ---
  const industrialSpecs: [number, number, number, number, number, number, BuildingStyle, BuildingSpec['roofKind'], VenueKind, string | undefined][] = [
    [325, 230, 30, 16, 16, 0, 'industrial_warehouse', 'gabled', 'arcade', '#00e5ff'],
    [405, 230, 24, 16, 28, 0, 'commercial_burgundy', 'flat', 'casino', '#ff2e88'],
    [475, 230, 22, 16, 14, 0, 'commercial_slate', 'mansard', 'computer_library', '#38bdf8'],
    [555, 230, 38, 18, 13, 0, 'industrial_warehouse', 'gabled', 'none', undefined],
    [655, 230, 28, 18, 22, 0, 'industrial_concrete', 'flat', 'none', '#ffb824'],
    [345, 575, 44, 20, 15, -0.1, 'industrial_warehouse', 'gabled', 'none', undefined],
    [560, 575, 46, 22, 18, -0.1, 'dock_shed', 'gabled', 'none', '#00e5ff'],
    [670, 540, 30, 18, 12, -0.2, 'dock_shed', 'gabled', 'none', undefined],
    [335, 465, 34, 15, 11, 0, 'industrial_concrete', 'flat', 'none', undefined],
    [565, 465, 36, 15, 14, 0, 'dock_shed', 'gabled', 'none', undefined],
    [675, 355, 26, 18, 24, 0, 'industrial_warehouse', 'gabled', 'none', '#ffb824'],
  ];
  for (const [bx, bz, w, d, h, rot, style, rk, venue, neon] of industrialSpecs) {
    tryPlace(bx, bz, w, d, h, rot, style, rk, venue !== 'none', venue, neon);
  }

  // --- INFILL URBAN QUADRANTS AROUND CENTRAL TRANSIT HUBS & AVENUES (Fill every empty pocket!) ---
  const infillSpots: [number, number, number, number, number, BuildingStyle, VenueKind, string][] = [
    [-165, 105, 22, 16, 28, 'commercial_ochre', 'casino', '#ffb824'],
    [-215, 65, 18, 16, 44, 'commercial_slate', 'computer_library', '#00e5ff'],
    [-265, 65, 20, 16, 18, 'commercial_brick', 'arcade', '#a855f7'],
    [-70, 240, 20, 18, 24, 'commercial_slate', 'arcade', '#00e5ff'],
    [-135, 195, 18, 16, 36, 'commercial_burgundy', 'casino', '#ff2e88'],
    [70, 215, 22, 16, 32, 'commercial_mint', 'computer_library', '#38bdf8'],
    [135, 225, 18, 16, 16, 'commercial_cream', 'nightlife', '#ff2e88'],
    [155, 290, 20, 18, 26, 'panelka_sand', 'arcade', '#a855f7'],
    [75, 345, 18, 24, 40, 'panelka_rose', 'none', '#00e5ff'],
    [135, 425, 20, 20, 18, 'panelka_cobalt', 'computer_library', '#38bdf8'],
    [75, 515, 18, 22, 30, 'panelka_teal', 'none', '#10b981'],
    [135, 575, 22, 18, 14, 'commercial_ochre', 'casino', '#ffb824'],
    [-335, 625, 24, 16, 14, 'industrial_concrete', 'none', '#ff4d4d'],
    [225, 130, 18, 18, 22, 'commercial_brick', 'nightlife', '#ff2e88'],
    [275, 130, 18, 18, 35, 'panelka_cobalt', 'computer_library', '#00e5ff'],
  ];
  for (const [mx, mz, w, d, h, st, venue, neon] of infillSpots) {
    tryPlace(
      mx,
      mz,
      w,
      d,
      h,
      0,
      st,
      h > 35 ? 'spire' : st.startsWith('commercial') ? 'mansard' : 'flat',
      st.startsWith('commercial') || venue !== 'none',
      venue,
      neon
    );
  }

  return buildings;
}

export const BUILDINGS: BuildingSpec[] = generateCityBuildings();

// =========================================================================
// RUSSIAN CYRILLIC NEON BILLBOARD SITES ALL AROUND THE ISLAND
// =========================================================================
function buildBillboardSites(): BillboardSpec[] {
  const candidates: [number, number, number, number, number][] = [
    // Central Reliquary Approaches & Avenues
    [-45, -108, 0.25, 13.5, 11.5],
    [45, -108, -0.25, 13.5, 11.5],
    [-45, 118, Math.PI - 0.2, 13.0, 11.0],
    [48, 124, Math.PI + 0.25, 13.0, 11.0],
    [-118, -32, Math.PI * 0.5, 12.5, 10.5],
    [118, 32, -Math.PI * 0.5, 12.5, 10.5],
    // District 1 Commercial, Casinos, Arcades & Shopping Alleys
    [-260, -108, 0, 14.0, 12.0],
    [-480, -108, 0, 13.5, 11.5],
    [-380, -295, Math.PI * 0.5, 13.5, 11.0],
    [-590, -305, 0, 12.5, 10.5],
    [-255, -430, -Math.PI * 0.5, 14.0, 12.0],
    [-485, -550, 0.2, 13.0, 11.0],
    [-160, -670, 0, 13.5, 11.5],
    [-705, -200, Math.PI * 0.5, 12.5, 10.5],
    // District 2 Residential Sectors & Parks
    [60, -355, -Math.PI * 0.5, 13.0, 11.0],
    [172, -550, 0, 13.0, 11.0],
    [282, -460, Math.PI, 12.5, 10.5],
    [388, -295, 0, 13.5, 11.5],
    [535, -185, -Math.PI * 0.5, 12.5, 10.5],
    [545, -495, Math.PI * 0.25, 13.0, 11.0],
    // District 3 Military Road, Prison & South Avenues
    [-290, 95, 0.4, 12.0, 10.0],
    [-82, 295, -Math.PI * 0.5, 12.5, 10.5],
    [82, 345, Math.PI * 0.5, 13.0, 11.0],
    [-125, 650, Math.PI, 12.5, 10.5],
    // District 4 Dense Urban St., Railyard & Docks
    [350, 262, 0, 13.5, 11.5],
    [595, 262, 0, 13.5, 11.5],
    [435, 550, Math.PI, 13.0, 11.0],
    [695, 420, -Math.PI * 0.5, 12.5, 10.5],
    // Extra Prominent Futuristic & Retrofuturistic Skyline Billboards along Fast Boulevards
    [-34, -230, 0.15, 14.5, 12.5],
    [36, -245, -0.15, 14.5, 12.5],
    [-36, 235, Math.PI - 0.12, 14.0, 12.0],
    [36, 250, Math.PI + 0.12, 14.0, 12.0],
    [-215, -38, Math.PI * 0.5, 14.0, 12.0],
    [220, 38, -Math.PI * 0.5, 14.0, 12.0],
    [-420, 38, -Math.PI * 0.5, 13.5, 11.5],
    [340, -38, Math.PI * 0.5, 14.0, 12.0],
    [-320, -560, 0.18, 14.0, 12.0],
    [245, -340, -0.2, 13.5, 11.5],
    [465, -340, 0.2, 13.5, 11.5],
    [-195, 415, 0.25, 13.5, 11.5],
    [215, 425, -0.25, 13.5, 11.5],
    [580, 95, -Math.PI * 0.5, 14.0, 12.0],
  ];

  const out: BillboardSpec[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const [mx, mz, rotY, height, width] = candidates[i];
    const x = m2w(mx);
    const z = m2w(mz);
    if (isNearAnyRoad(x, z, 2.2)) continue;
    if (isNearMetroTrack(x, z, 8.0)) continue;
    out.push({ x, z, rotY, height, width, variant: i % 16 });
  }
  return out;
}

export const BILLBOARD_SITES: BillboardSpec[] = buildBillboardSites();

// =========================================================================
// LOCATION-ASSIGNED PEDESTRIAN ZONES (Populates EVERY part of the island!)
// =========================================================================
export const PEDESTRIAN_ZONES: PedestrianZoneSpec[] = [
  // Central Reliquary & Cathedrals
  { id: 'pz_reliquary_n', locationName: 'Central Reliquary North Plaza', x: m2w(0), z: m2w(-118), radius: 22, count: 20 },
  { id: 'pz_reliquary_s', locationName: 'Central Reliquary South Plaza', x: m2w(0), z: m2w(122), radius: 22, count: 20 },
  { id: 'pz_west_cath', locationName: 'Western Cathedral Square', x: m2w(-140), z: m2w(-72), radius: 26, count: 18 },
  { id: 'pz_north_cath', locationName: 'Northern Cathedral Square', x: m2w(84), z: m2w(-168), radius: 26, count: 18 },
  { id: 'pz_soviet_mon', locationName: 'Soviet Monument Plaza', x: m2w(148), z: m2w(-62), radius: 24, count: 18 },
  { id: 'pz_transit_s', locationName: 'Transit Hub South', x: m2w(-85), z: m2w(165), radius: 22, count: 18 },
  { id: 'pz_transit_e', locationName: 'Transit Hub East', x: m2w(145), z: m2w(115), radius: 22, count: 18 },
  // District 1 Commercial, Casinos, Arcades & Computer Libraries (Dense nightlife crowds!)
  { id: 'pz_d1_casino_row', locationName: 'District 1 Casino Row', x: m2w(-265), z: m2w(-190), radius: 38, count: 26 },
  { id: 'pz_d1_arcade_strip', locationName: 'District 1 Cyber Arcade Strip', x: m2w(-375), z: m2w(-310), radius: 38, count: 26 },
  { id: 'pz_d1_library_hub', locationName: 'District 1 Computer Library Plaza', x: m2w(-155), z: m2w(-430), radius: 36, count: 24 },
  { id: 'pz_d1_west_shops', locationName: 'District 1 West Shopping Alleys', x: m2w(-595), z: m2w(-190), radius: 36, count: 22 },
  { id: 'pz_d1_nw_promenade', locationName: 'NW Promenade Nightlife', x: m2w(-595), z: m2w(-430), radius: 36, count: 22 },
  { id: 'pz_d1_north_alleys', locationName: 'Northern Shopping Alleys', x: m2w(-375), z: m2w(-662), radius: 36, count: 20 },
  { id: 'pz_d1_checkpoint', locationName: 'Northern Checkpoint', x: m2w(-155), z: m2w(-740), radius: 28, count: 16, isGuardZone: true },
  // District 2 Brick Apartments, Residential Sectors & Parks
  { id: 'pz_d2_apt_nw', locationName: 'Sector 2 Brick Apartments NW', x: m2w(170), z: m2w(-415), radius: 38, count: 24 },
  { id: 'pz_d2_apt_n', locationName: 'Sector 2 Brick Apartments North', x: m2w(280), z: m2w(-600), radius: 38, count: 22 },
  { id: 'pz_d2_park_mid', locationName: 'Sector 2 Central Park Walkways', x: m2w(245), z: m2w(-160), radius: 34, count: 20 },
  { id: 'pz_d2_east_res', locationName: 'Sector 2 Lower East Apartments', x: m2w(478), z: m2w(-195), radius: 38, count: 22 },
  { id: 'pz_d2_east_low', locationName: 'Sector 2 South-East Brick Flats', x: m2w(478), z: m2w(-65), radius: 34, count: 20 },
  { id: 'pz_d2_ne_ring', locationName: 'NE Angled Residential Ring', x: m2w(575), z: m2w(-420), radius: 40, count: 22 },
  // District 3 Military Garrison, Prison Reinstach & South Residentials
  { id: 'pz_d3_bunker', locationName: 'Military Bunker Garrison', x: m2w(-425), z: m2w(395), radius: 38, count: 20, isGuardZone: true },
  { id: 'pz_d3_west_gate', locationName: 'Western Patrol Sector', x: m2w(-520), z: m2w(140), radius: 30, count: 14, isGuardZone: true },
  { id: 'pz_prison', locationName: 'Reinstach Prison Perimeter', x: m2w(-120), z: m2w(455), radius: 38, count: 18, isGuardZone: true },
  { id: 'pz_south_infill', locationName: 'South Avenue Neighborhood', x: m2w(105), z: m2w(425), radius: 36, count: 20 },
  // District 4 Dense Urban St., Railyard & Shipping Docks
  { id: 'pz_d4_urban_st', locationName: 'Dense Urban Street Nightlife', x: m2w(420), z: m2w(230), radius: 36, count: 22 },
  { id: 'pz_d4_railyard', locationName: 'Industrial Railyard Workers', x: m2w(460), z: m2w(460), radius: 42, count: 22, isWorkerZone: true },
  { id: 'pz_d4_docks', locationName: 'Shipping Docks Crew', x: m2w(500), z: m2w(660), radius: 42, count: 20, isWorkerZone: true },
];

// =========================================================================
// FAST SPATIAL COLLISION WORLD
// =========================================================================
export interface LowCircleLedge {
  cx: number;
  cz: number;
  r: number;
  height: number;
}

export interface LowBoxLedge {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  cos: number;
  sin: number;
  radius: number;
  height: number;
}

export class CollisionWorld {
  public readonly boxes: ColliderBox[] = [];
  public readonly circles: { cx: number; cz: number; r: number }[] = [];
  public readonly lowCircleLedges: LowCircleLedge[] = [];
  public readonly lowBoxLedges: LowBoxLedge[] = [];

  addBox(cx: number, cz: number, w: number, d: number, rotY = 0) {
    const hx = w * 0.5;
    const hz = d * 0.5;
    this.boxes.push({
      cx,
      cz,
      hx,
      hz,
      cos: Math.cos(-rotY),
      sin: Math.sin(-rotY),
      radius: Math.hypot(hx, hz),
    });
  }

  addCircle(cx: number, cz: number, r: number) {
    this.circles.push({ cx, cz, r });
  }

  addLowCircleLedge(cx: number, cz: number, r: number, height: number) {
    this.lowCircleLedges.push({ cx, cz, r, height });
  }

  addLowBoxLedge(cx: number, cz: number, w: number, d: number, rotY = 0, height = 0.42) {
    const hx = w * 0.5;
    const hz = d * 0.5;
    this.lowBoxLedges.push({
      cx,
      cz,
      hx,
      hz,
      cos: Math.cos(-rotY),
      sin: Math.sin(-rotY),
      radius: Math.hypot(hx, hz),
      height,
    });
  }

  /**
   * Samples driveable low ledges (curbed plazas, roundabout islands, stepped monuments)
   * that are low enough for the car to drive up and over with a bump / speed-based air launch!
   */
  sampleLedgeHeight(x: number, z: number): { height: number; nx: number; nz: number } {
    let maxH = 0;
    let outNx = 0;
    let outNz = 0;

    for (let i = 0; i < this.lowCircleLedges.length; i++) {
      const lc = this.lowCircleLedges[i];
      const dx = x - lc.cx;
      const dz = z - lc.cz;
      const d2 = dx * dx + dz * dz;
      const rampOuter = lc.r + 0.65;
      if (d2 < rampOuter * rampOuter) {
        const d = Math.sqrt(d2);
        // Smooth chamfered ramp edge over 0.65m so tires roll up naturally at any speed
        const t = d <= lc.r ? 1.0 : Math.max(0, 1.0 - (d - lc.r) / 0.65);
        const h = lc.height * t;
        if (h > maxH) {
          maxH = h;
          if (d > 1e-4) {
            outNx = dx / d;
            outNz = dz / d;
          }
        }
      }
    }

    for (let i = 0; i < this.lowBoxLedges.length; i++) {
      const lb = this.lowBoxLedges[i];
      const dx = x - lb.cx;
      const dz = z - lb.cz;
      const maxR = lb.radius + 0.75;
      if (dx * dx + dz * dz > maxR * maxR) continue;
      const lx = dx * lb.cos - dz * lb.sin;
      const lz = dx * lb.sin + dz * lb.cos;
      const ox = Math.abs(lx) - lb.hx;
      const oz = Math.abs(lz) - lb.hz;
      const outsideDist = Math.max(ox, oz);
      if (outsideDist < 0.65) {
        const t = outsideDist <= 0 ? 1.0 : Math.max(0, 1.0 - outsideDist / 0.65);
        const h = lb.height * t;
        if (h > maxH) {
          maxH = h;
          let lnx = 0;
          let lnz = 0;
          if (ox > oz) lnx = lx >= 0 ? 1 : -1;
          else lnz = lz >= 0 ? 1 : -1;
          outNx = lnx * lb.cos + lnz * lb.sin;
          outNz = -lnx * lb.sin + lnz * lb.cos;
        }
      }
    }

    return { height: maxH, nx: outNx, nz: outNz };
  }

  resolveCircle(
    x: number,
    z: number,
    carRadius: number
  ): { x: number; z: number; hit: boolean; nx: number; nz: number } {
    let px = x;
    let pz = z;
    let hit = false;
    let outNx = 0;
    let outNz = 0;

    // 1. Solid circular barriers (monuments, cathedral cores, tall structures!)
    for (let i = 0; i < this.circles.length; i++) {
      const c = this.circles[i];
      const dx = px - c.cx;
      const dz = pz - c.cz;
      const minD = c.r + carRadius;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD * minD) {
        const d = Math.sqrt(d2);
        const nx = d > 1e-5 ? dx / d : 1;
        const nz = d > 1e-5 ? dz / d : 0;
        const pen = minD - d;
        px += nx * pen;
        pz += nz * pen;
        outNx = nx;
        outNz = nz;
        hit = true;
      }
    }

    // 2. Oriented bounding boxes (buildings, bridge guardrails, parked cars, viaduct piers!)
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      const dx = px - b.cx;
      const dz = pz - b.cz;
      const maxR = b.radius + carRadius;
      if (dx * dx + dz * dz > maxR * maxR) continue;

      const lx = dx * b.cos - dz * b.sin;
      const lz = dx * b.sin + dz * b.cos;

      const clampedX = Math.max(-b.hx, Math.min(b.hx, lx));
      const clampedZ = Math.max(-b.hz, Math.min(b.hz, lz));

      const diffX = lx - clampedX;
      const diffZ = lz - clampedZ;
      const dist2 = diffX * diffX + diffZ * diffZ;

      if (dist2 < carRadius * carRadius) {
        let localNx = 0;
        let localNz = 0;
        let pen = 0;

        if (dist2 > 1e-6) {
          const dist = Math.sqrt(dist2);
          localNx = diffX / dist;
          localNz = diffZ / dist;
          pen = carRadius - dist;
        } else {
          const penX = b.hx - Math.abs(lx);
          const penZ = b.hz - Math.abs(lz);
          if (penX < penZ) {
            localNx = lx >= 0 ? 1 : -1;
            pen = penX + carRadius;
          } else {
            localNz = lz >= 0 ? 1 : -1;
            pen = penZ + carRadius;
          }
        }

        const wNx = localNx * b.cos + localNz * b.sin;
        const wNz = -localNx * b.sin + localNz * b.cos;

        px += wNx * pen;
        pz += wNz * pen;
        outNx = wNx;
        outNz = wNz;
        hit = true;
      }
    }

    const surf = getSurfaceAt(px, pz);
    if (surf === 'water') {
      const d = Math.hypot(px, pz) + 1e-6;
      const nx = -px / d;
      const nz = -pz / d;
      px += nx * 1.4;
      pz += nz * 1.4;
      outNx = nx;
      outNz = nz;
      hit = true;
    }

    return { x: px, z: pz, hit, nx: outNx, nz: outNz };
  }
}

// =========================================================================
// SPEC 5: METRO PLATFORM DOOR QUEUE LANES & CROSSWALK CLEARANCE BOUNDS
// =========================================================================

/** Local Z offsets along the station platform where the 4 sliding train doors align when docked. */
export const METRO_DOOR_STOP_LOCAL_ZS = [-19.2, -12.0, -3.6, 3.6] as const;

export interface MetroQueueSlot {
  doorIdx: number;
  doorLocalZ: number;
  side: -1 | 1; // -1 = aft flank of door, +1 = forward flank of door
  localX: number;
  localZ: number;
  faceLocalX: number; // +1 faces track (+X)
}

/**
 * Marked platform queue lanes flanking each of the 4 train doorway openings.
 * Keeps central doorway exit corridors (|z - doorZ| < 0.85m), columns (x=-7.4),
 * booth (x=-6.55, z=-2.0), and benches (x=-6.45, |z| in [10.6..14.4]) clear.
 */
export const METRO_DOOR_QUEUE_LANES: MetroQueueSlot[] = (() => {
  const slots: MetroQueueSlot[] = [];
  for (let dIdx = 0; dIdx < METRO_DOOR_STOP_LOCAL_ZS.length; dIdx++) {
    const dz = METRO_DOOR_STOP_LOCAL_ZS[dIdx];
    for (const side of [-1, 1] as const) {
      for (let rank = 0; rank < 2; rank++) {
        slots.push({
          doorIdx: dIdx,
          doorLocalZ: dz,
          side,
          localX: -3.28 - rank * 0.92,
          localZ: dz + side * 1.12,
          faceLocalX: 1,
        });
      }
    }
  }
  return slots;
})();

export interface CrosswalkClearanceBox {
  ixId: string;
  cx: number;
  cz: number;
  hx: number;
  hz: number;
}

/** Crosswalk + waiting curb apron clearance boxes around all 18 signalized intersections. */
export const CROSSWALK_CLEARANCE_BOUNDS: CrosswalkClearanceBox[] = (() => {
  const boxes: CrosswalkClearanceBox[] = [];
  for (let i = 0; i < SIGNALIZED_INTERSECTIONS.length; i++) {
    const ix = SIGNALIZED_INTERSECTIONS[i];
    // North & South zebra crosswalks + curb wait aprons
    for (const side of [-1, 1]) {
      boxes.push({
        ixId: ix.id,
        cx: ix.x,
        cz: ix.z + side * (ix.halfSpanEW + 1.8),
        hx: ix.halfSpanNS + 2.8,
        hz: 2.6,
      });
    }
    // East & West zebra crosswalks + curb wait aprons
    for (const side of [-1, 1]) {
      boxes.push({
        ixId: ix.id,
        cx: ix.x + side * (ix.halfSpanNS + 1.8),
        cz: ix.z,
        hx: 2.6,
        hz: ix.halfSpanEW + 2.8,
      });
    }
  }
  return boxes;
})();

export function isInCrosswalkClearance(x: number, z: number, pad = 0): boolean {
  for (let i = 0; i < CROSSWALK_CLEARANCE_BOUNDS.length; i++) {
    const b = CROSSWALK_CLEARANCE_BOUNDS[i];
    if (Math.abs(x - b.cx) <= b.hx + pad && Math.abs(z - b.cz) <= b.hz + pad) {
      return true;
    }
  }
  return false;
}

// =========================================================================
// SPEC 6: ROAD NETWORK GRAPH & CALL-YOUR-CAR ROUTE SOLVER
// =========================================================================

export interface RoadProjection {
  x: number;
  z: number;
  y: number;
  dist: number;
  roadId: string;
  width: number;
  dirX: number;
  dirZ: number;
  edgeIdx: number;
  t: number;
}

interface RoadGraphNode {
  x: number;
  z: number;
  edges: { to: number; dist: number; width: number }[];
}

interface RoadGraphEdge {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  len: number;
  dirX: number;
  dirZ: number;
  width: number;
  roadId: string;
  nodeA: number;
  nodeB: number;
}

interface RoadNavGraph {
  nodes: RoadGraphNode[];
  edges: RoadGraphEdge[];
}

let _cachedRoadNavGraph: RoadNavGraph | null = null;

function segCrossParam(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  dx: number,
  dz: number
): { t: number; u: number } | null {
  const rx = bx - ax;
  const rz = bz - az;
  const sx = dx - cx;
  const sz = dz - cz;
  const denom = rx * sz - rz * sx;
  if (Math.abs(denom) < 1e-4) return null;
  const qpx = cx - ax;
  const qpz = cz - az;
  const t = (qpx * sz - qpz * sx) / denom;
  const u = (qpx * rz - qpz * rx) / denom;
  if (t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98) {
    return { t, u };
  }
  return null;
}

function getRoadNavGraph(): RoadNavGraph {
  if (_cachedRoadNavGraph) return _cachedRoadNavGraph;

  interface RawSeg {
    ax: number;
    az: number;
    bx: number;
    bz: number;
    width: number;
    roadId: string;
    kind: RoadSegment['kind'];
    splits: number[];
  }

  const raw: RawSeg[] = [];
  for (let r = 0; r < ROADS.length; r++) {
    const road = ROADS[r];
    if (road.kind === 'ramp') continue;
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      if (len < 2.0) continue;
      raw.push({
        ax: pts[i].x,
        az: pts[i].z,
        bx: pts[i + 1].x,
        bz: pts[i + 1].z,
        width: road.width,
        roadId: road.id,
        kind: road.kind,
        splits: [],
      });
    }
  }

  // Split at crossings and T-junction endpoints so every connected road & roundabout links up cleanly
  for (let i = 0; i < raw.length; i++) {
    const s1 = raw[i];
    for (let j = i + 1; j < raw.length; j++) {
      const s2 = raw[j];
      const hit = segCrossParam(s1.ax, s1.az, s1.bx, s1.bz, s2.ax, s2.az, s2.bx, s2.bz);
      if (hit) {
        s1.splits.push(hit.t);
        s2.splits.push(hit.u);
      }
    }
  }

  // T-junction endpoint snapping: if a segment endpoint lands on the interior of another segment
  const endpoints: Vec2[] = [];
  for (let i = 0; i < raw.length; i++) {
    endpoints.push({ x: raw[i].ax, z: raw[i].az }, { x: raw[i].bx, z: raw[i].bz });
  }
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const len2 = dx * dx + dz * dz;
    if (len2 < 4) continue;
    const snapR = Math.max(3.5, s.width * 0.45);
    const snapR2 = snapR * snapR;
    for (let p = 0; p < endpoints.length; p++) {
      const pt = endpoints[p];
      const t = ((pt.x - s.ax) * dx + (pt.z - s.az) * dz) / len2;
      if (t <= 0.02 || t >= 0.98) continue;
      const px = s.ax + t * dx;
      const pz = s.az + t * dz;
      const d2 = (pt.x - px) * (pt.x - px) + (pt.z - pz) * (pt.z - pz);
      if (d2 <= snapR2) {
        s.splits.push(t);
      }
    }
  }

  const nodes: RoadGraphNode[] = [];
  const MERGE_TOL2 = 4.2 * 4.2;

  const getOrAddNode = (x: number, z: number): number => {
    let bestIdx = -1;
    let bestD2 = MERGE_TOL2;
    for (let i = 0; i < nodes.length; i++) {
      const dx = nodes[i].x - x;
      const dz = nodes[i].z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) return bestIdx;
    nodes.push({ x, z, edges: [] });
    return nodes.length - 1;
  };

  const edges: RoadGraphEdge[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    const ts = [0, ...s.splits.sort((a, b) => a - b), 1];
    const clean: number[] = [0];
    for (let k = 1; k < ts.length; k++) {
      if (ts[k] - clean[clean.length - 1] > 0.03) clean.push(ts[k]);
    }
    if (clean[clean.length - 1] < 0.99) clean[clean.length - 1] = 1;

    for (let k = 0; k < clean.length - 1; k++) {
      const t0 = clean[k];
      const t1 = clean[k + 1];
      const ax = s.ax + (s.bx - s.ax) * t0;
      const az = s.az + (s.bz - s.az) * t0;
      const bx = s.ax + (s.bx - s.ax) * t1;
      const bz = s.az + (s.bz - s.az) * t1;
      const nA = getOrAddNode(ax, az);
      const nB = getOrAddNode(bx, bz);
      if (nA === nB) continue;
      const pA = nodes[nA];
      const pB = nodes[nB];
      const ex = pB.x - pA.x;
      const ez = pB.z - pA.z;
      const len = Math.hypot(ex, ez);
      if (len < 1.0) continue;

      edges.push({
        ax: pA.x,
        az: pA.z,
        bx: pB.x,
        bz: pB.z,
        len,
        dirX: ex / len,
        dirZ: ez / len,
        width: s.width,
        roadId: s.roadId,
        nodeA: nA,
        nodeB: nB,
      });
      pA.edges.push({ to: nB, dist: len, width: s.width });
      pB.edges.push({ to: nA, dist: len, width: s.width });
    }
  }

  _cachedRoadNavGraph = { nodes, edges };
  return _cachedRoadNavGraph;
}

export function findNearestRoadPoint(x: number, z: number): RoadProjection {
  const graph = getRoadNavGraph();
  let bestD2 = Infinity;
  let bestEdgeIdx = 0;
  let bestT = 0;
  let bestPx = 0;
  let bestPz = 0;

  for (let i = 0; i < graph.edges.length; i++) {
    const e = graph.edges[i];
    const dx = e.bx - e.ax;
    const dz = e.bz - e.az;
    const len2 = dx * dx + dz * dz + 1e-9;
    const t = Math.max(0, Math.min(1, ((x - e.ax) * dx + (z - e.az) * dz) / len2));
    const px = e.ax + t * dx;
    const pz = e.az + t * dz;
    const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d2 < bestD2) {
      bestD2 = d2;
      bestEdgeIdx = i;
      bestT = t;
      bestPx = px;
      bestPz = pz;
    }
  }

  const edge = graph.edges[bestEdgeIdx];
  return {
    x: bestPx,
    z: bestPz,
    y: getRoadElevationAt(bestPx, bestPz),
    dist: Math.sqrt(bestD2),
    roadId: edge.roadId,
    width: edge.width,
    dirX: edge.dirX,
    dirZ: edge.dirZ,
    edgeIdx: bestEdgeIdx,
    t: bestT,
  };
}

export interface RoadCallRouteResult {
  reachable: boolean;
  blocked: boolean;
  points: Vec2[];
  spawnPoint: { x: number; z: number; heading: number };
  stopPoint: Vec2;
  targetRoadDist: number;
  totalLengthM: number;
}

/**
 * Computes a road-following route on the ROADS graph from (startX, startZ) toward
 * the curb nearest (targetX, targetZ). If disconnected/blocked, stops at the nearest
 * reachable road node to (targetX, targetZ).
 */
export function findRoadCallRoute(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number
): RoadCallRouteResult {
  const graph = getRoadNavGraph();
  const startProj = findNearestRoadPoint(startX, startZ);
  const targetProj = findNearestRoadPoint(targetX, targetZ);
  const startEdge = graph.edges[startProj.edgeIdx];
  const targetEdge = graph.edges[targetProj.edgeIdx];

  // Curb pull-up offset toward the player side, keeping tires strictly on road asphalt
  const toPlayerX = targetX - targetProj.x;
  const toPlayerZ = targetZ - targetProj.z;
  const perpX = -targetProj.dirZ;
  const perpZ = targetProj.dirX;
  const sideDot = toPlayerX * perpX + toPlayerZ * perpZ;
  const sideSign = sideDot >= 0 ? 1 : -1;
  const curbShift = Math.min(targetProj.width * 0.28, Math.max(1.8, targetProj.width * 0.22));
  const curbStop: Vec2 = {
    x: targetProj.x + perpX * sideSign * curbShift,
    z: targetProj.z + perpZ * sideSign * curbShift,
  };

  // Same edge: direct short road drive!
  if (startProj.edgeIdx === targetProj.edgeIdx) {
    const dirSign = targetProj.t >= startProj.t ? 1 : -1;
    const hdg = Math.atan2(-targetProj.dirX * dirSign, -targetProj.dirZ * dirSign);
    const pts: Vec2[] = [
      { x: startProj.x, z: startProj.z },
      curbStop,
    ];
    return {
      reachable: true,
      blocked: false,
      points: pts,
      spawnPoint: { x: startProj.x, z: startProj.z, heading: hdg },
      stopPoint: curbStop,
      targetRoadDist: targetProj.dist,
      totalLengthM: Math.hypot(curbStop.x - startProj.x, curbStop.z - startProj.z),
    };
  }

  // Dijkstra from both endpoints of startEdge
  const nNodes = graph.nodes.length;
  const dist = new Float64Array(nNodes);
  const prev = new Int32Array(nNodes);
  const visited = new Uint8Array(nNodes);
  dist.fill(Infinity);
  prev.fill(-1);

  const dStartA = Math.hypot(startEdge.ax - startProj.x, startEdge.az - startProj.z);
  const dStartB = Math.hypot(startEdge.bx - startProj.x, startEdge.bz - startProj.z);
  dist[startEdge.nodeA] = dStartA;
  dist[startEdge.nodeB] = dStartB;

  for (let iter = 0; iter < nNodes; iter++) {
    let u = -1;
    let bestD = Infinity;
    for (let i = 0; i < nNodes; i++) {
      if (!visited[i] && dist[i] < bestD) {
        bestD = dist[i];
        u = i;
      }
    }
    if (u < 0 || bestD === Infinity) break;
    visited[u] = 1;
    const edges = graph.nodes[u].edges;
    for (let k = 0; k < edges.length; k++) {
      const e = edges[k];
      const nd = bestD + e.dist;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        prev[e.to] = u;
      }
    }
  }

  const dTargetA =
    dist[targetEdge.nodeA] +
    Math.hypot(targetEdge.ax - targetProj.x, targetEdge.az - targetProj.z);
  const dTargetB =
    dist[targetEdge.nodeB] +
    Math.hypot(targetEdge.bx - targetProj.x, targetEdge.bz - targetProj.z);
  const bestGoalDist = Math.min(dTargetA, dTargetB);
  const reachable = Number.isFinite(bestGoalDist);

  let endNode = dTargetA <= dTargetB ? targetEdge.nodeA : targetEdge.nodeB;
  if (!reachable) {
    // Pick the nearest reachable node in the car's connected component to targetX, targetZ
    let bestNode = startEdge.nodeA;
    let bestGoalEuclid = Infinity;
    for (let i = 0; i < nNodes; i++) {
      if (!Number.isFinite(dist[i])) continue;
      const nd = Math.hypot(graph.nodes[i].x - targetX, graph.nodes[i].z - targetZ);
      if (nd < bestGoalEuclid) {
        bestGoalEuclid = nd;
        bestNode = i;
      }
    }
    endNode = bestNode;
  }

  const nodeChain: number[] = [];
  let cur = endNode;
  while (cur >= 0) {
    nodeChain.push(cur);
    cur = prev[cur];
  }
  nodeChain.reverse();

  const points: Vec2[] = [{ x: startProj.x, z: startProj.z }];
  for (let i = 0; i < nodeChain.length; i++) {
    const nd = graph.nodes[nodeChain[i]];
    const last = points[points.length - 1];
    if (Math.hypot(nd.x - last.x, nd.z - last.z) > 1.2) {
      points.push({ x: nd.x, z: nd.z });
    }
  }
  if (reachable) {
    const last = points[points.length - 1];
    if (Math.hypot(curbStop.x - last.x, curbStop.z - last.z) > 1.2) {
      points.push(curbStop);
    }
  }

  const first = points[0];
  const nextPt = points[1] ?? curbStop;
  const heading = Math.atan2(-(nextPt.x - first.x), -(nextPt.z - first.z));
  let totalLengthM = 0;
  for (let i = 1; i < points.length; i++) {
    totalLengthM += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  const stopPoint = points[points.length - 1];

  return {
    reachable,
    blocked: !reachable,
    points,
    spawnPoint: { x: first.x, z: first.z, heading },
    stopPoint,
    targetRoadDist: targetProj.dist,
    totalLengthM,
  };
}

/**
 * Picks an upstream spawn point on the connected road network ~45..70m away from (targetX, targetZ)
 * so a distant car spawns on the nearest connected road corridor and drives in along ROADS.
 */
export function findUpstreamRoadSpawn(
  targetX: number,
  targetZ: number,
  desiredDistM = 54
): { x: number; z: number } {
  const graph = getRoadNavGraph();
  const targetProj = findNearestRoadPoint(targetX, targetZ);
  const edge = graph.edges[targetProj.edgeIdx];

  const nNodes = graph.nodes.length;
  const dist = new Float64Array(nNodes);
  const visited = new Uint8Array(nNodes);
  dist.fill(Infinity);
  dist[edge.nodeA] = Math.hypot(edge.ax - targetProj.x, edge.az - targetProj.z);
  dist[edge.nodeB] = Math.hypot(edge.bx - targetProj.x, edge.bz - targetProj.z);

  for (let iter = 0; iter < nNodes; iter++) {
    let u = -1;
    let bestD = Infinity;
    for (let i = 0; i < nNodes; i++) {
      if (!visited[i] && dist[i] < bestD) {
        bestD = dist[i];
        u = i;
      }
    }
    if (u < 0 || bestD === Infinity || bestD > desiredDistM * 2.5) break;
    visited[u] = 1;
    const edges = graph.nodes[u].edges;
    for (let k = 0; k < edges.length; k++) {
      const e = edges[k];
      const nd = bestD + e.dist;
      if (nd < dist[e.to]) dist[e.to] = nd;
    }
  }

  const minNodeDist = desiredDistM < 28 ? 12 : 24;
  let bestNode = edge.nodeA;
  let bestScore = Infinity;
  for (let i = 0; i < nNodes; i++) {
    if (!Number.isFinite(dist[i]) || dist[i] < minNodeDist) continue;
    const score = Math.abs(dist[i] - desiredDistM);
    if (score < bestScore) {
      bestScore = score;
      bestNode = i;
    }
  }

  return { x: graph.nodes[bestNode].x, z: graph.nodes[bestNode].z };
}

/**
 * Picks a nearby upstream road spawn (~14-20m) oriented into the player's forward view
 * so the auto-driven car pulls up almost instantly to a curb directly in front of the player.
 */
export function findNearbyFrontCarCallRoute(
  playerX: number,
  playerZ: number,
  fwdX: number,
  fwdZ: number,
  spawnDistM = 17
): RoadCallRouteResult {
  const graph = getRoadNavGraph();
  const frontProj = findNearestRoadPoint(playerX + fwdX * 10, playerZ + fwdZ * 10);
  const playerProj = findNearestRoadPoint(playerX, playerZ);
  const goalProj = frontProj.dist <= 38 ? frontProj : playerProj;
  const edge = graph.edges[goalProj.edgeIdx];

  const toPlayerX = playerX - goalProj.x;
  const toPlayerZ = playerZ - goalProj.z;
  const perpX = -goalProj.dirZ;
  const perpZ = goalProj.dirX;
  const sideSign = toPlayerX * perpX + toPlayerZ * perpZ >= 0 ? 1 : -1;
  const curbShift = Math.min(goalProj.width * 0.25, 2.2);
  const curbStop: Vec2 = {
    x: goalProj.x + perpX * sideSign * curbShift,
    z: goalProj.z + perpZ * sideSign * curbShift,
  };

  const distToA = goalProj.t * edge.len;
  const distToB = (1 - goalProj.t) * edge.len;
  const candidates: { x: number; z: number; score: number }[] = [];

  if (distToA >= 11) {
    const d = Math.min(spawnDistM, distToA - 0.8);
    const sx = goalProj.x - edge.dirX * d;
    const sz = goalProj.z - edge.dirZ * d;
    const score = (sx - playerX) * fwdX + (sz - playerZ) * fwdZ;
    candidates.push({ x: sx, z: sz, score });
  }
  if (distToB >= 11) {
    const d = Math.min(spawnDistM, distToB - 0.8);
    const sx = goalProj.x + edge.dirX * d;
    const sz = goalProj.z + edge.dirZ * d;
    const score = (sx - playerX) * fwdX + (sz - playerZ) * fwdZ;
    candidates.push({ x: sx, z: sz, score });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const midPt = {
      x: (best.x + curbStop.x) * 0.5,
      z: (best.z + curbStop.z) * 0.5,
    };
    const hdg = Math.atan2(-(curbStop.x - best.x), -(curbStop.z - best.z));
    return {
      reachable: true,
      blocked: false,
      points: [{ x: best.x, z: best.z }, midPt, curbStop],
      spawnPoint: { x: best.x, z: best.z, heading: hdg },
      stopPoint: curbStop,
      targetRoadDist: goalProj.dist,
      totalLengthM: Math.hypot(curbStop.x - best.x, curbStop.z - best.z),
    };
  }

  const upstream = findUpstreamRoadSpawn(goalProj.x, goalProj.z, 19);
  return findRoadCallRoute(upstream.x, upstream.z, goalProj.x, goalProj.z);
}


