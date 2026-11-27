import * as THREE from 'three';
import {
  BUS_STOPS,
  CollisionWorld,
  getTerrainHeight,
  isNearAnyRoad,
  mulberry32,
  ROADS,
  SIGNALIZED_INTERSECTIONS,
  signedLandDistance,
  Vec2,
  w2m,
} from './mapData';
import { isRedLightAhead } from './infrastructureSystem';
import { TextureLibrary } from './textures';

export type TrafficArchetype =
  | 'bus'
  | 'sedan'
  | 'coupe'
  | 'taxi'
  | 'suv'
  | 'pickup'
  | 'van'
  | 'truck'
  | 'armored_truck'
  | 'patrol';

export interface ArmoredTruckState {
  id: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
}

export type TrafficZone = 'urban' | 'residential' | 'industrial' | 'rural' | 'security';
export type ConflictStyle = 'squeeze' | 'cut_corner' | 'inch_push';

interface LaneSegment {
  p0: Vec2;
  p1: Vec2;
  dx: number;
  dz: number;
  len: number;
  dirX: number;
  dirZ: number;
  laneOffset: number;
  kind: string;
  zone: TrafficZone;
  speedLimit: number;
  midX: number;
  midZ: number;
  nextIndices: number[];
}

export interface TrafficAgent {
  id: number;
  archetype: TrafficArchetype;
  homeZone: TrafficZone;
  group: THREE.Group;
  segIdx: number;
  nextSegIdx: number;
  plannedTurn: -1 | 0 | 1;
  segDist: number;
  speed: number;
  cruiseScale: number;
  x: number;
  z: number;
  heading: number;
  radius: number;
  halfW: number;
  halfL: number;
  mass: number;
  dwellTimer: number;
  swerveOffset: number;
  swerveSkill: number;
  // Aggressive / impatient conflict management when player holds up traffic
  conflictStyle: ConflictStyle;
  impatience: number;       // seconds spent blocked by player (0..10)
  passSide: -1 | 1;         // chosen squeeze/cut side around stalled player
  honkFlashTimer: number;   // high-beam anger flash
  // Real 3D rigid-body knockback, two-wheel heel & rollover/tumble physics (ZERO clipping!)
  knockVx: number;
  knockVz: number;
  knockY: number;
  knockVy: number;
  knockYawVel: number;
  knockPitch: number;
  knockPitchVel: number;
  knockRoll: number;
  knockRollVel: number;
  knockTimer: number;
  tumbleActive: boolean;
  tumbleHoldTimer: number;
  braking: boolean;
  brakeMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
  turnLeftMat: THREE.MeshStandardMaterial;
  turnRightMat: THREE.MeshStandardMaterial;
  beaconMat?: THREE.MeshStandardMaterial;
}

export interface TrafficCollisionResult {
  hit: boolean;
  pushX: number;
  pushZ: number;
  nx: number;
  nz: number;
  dvx: number;
  dvz: number;
  impactSpeed: number;
  otherMass: number;
  otherSpeed: number;
  otherVx: number;
  otherVz: number;
  cornerFactor: number;
  hitFront: boolean;
  isParked: boolean;
}

interface ParkedCar {
  id: number;
  archetype: TrafficArchetype;
  group: THREE.Group;
  x: number;
  z: number;
  y: number;
  heading: number;
  vx: number;
  vz: number;
  vy: number;
  yawVel: number;
  pitch: number;
  pitchVel: number;
  roll: number;
  rollVel: number;
  tumbleActive: boolean;
  halfW: number;
  halfL: number;
  mass: number;
  sleeping: boolean;
}

export interface TrafficSystemHandles {
  root: THREE.Group;
  agents: TrafficAgent[];
  sessionSeed: number;
  reseed: (newSeed?: number, playerX?: number, playerZ?: number) => number;
  update: (
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    nightFactor: number,
    playerVx?: number,
    playerVz?: number
  ) => void;
  resolvePlayerTrafficCollision: (
    px: number,
    pz: number,
    playerHeading: number,
    playerVx: number,
    playerVz: number
  ) => TrafficCollisionResult;
  getBusStopArrivalFlags: () => boolean[];
  getArmoredTruckStates: () => ArmoredTruckState[];
}

function classifyTrafficZone(worldX: number, worldZ: number, roadKind: string): TrafficZone {
  const mx = w2m(worldX);
  const mz = w2m(worldZ);
  const radial = Math.hypot(mx, mz);

  if ((mx < -320 && mz > 120 && mz < 580) || (mx > -210 && mx < 160 && mz > 340 && mz < 690)) {
    return 'security';
  }
  if (mx > 180 && mz > 160) {
    return 'industrial';
  }
  if (roadKind === 'coastal' || radial > 635 || (mx < -520 && mz < -420)) {
    return 'rural';
  }
  if (radial < 270 || (mx <= 80 && mz <= 140)) {
    return 'urban';
  }
  return 'residential';
}

function createBusDestinationTex(routeLabel: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c1218';
  ctx.fillRect(0, 0, 256, 48);
  ctx.fillStyle = '#ffaa28';
  ctx.font = 'bold 25px monospace';
  ctx.fillText(routeLabel, 12, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBusStopSignTex(cyrillic: string, routes: string, eng: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#091a32';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 504, 120);

  // Blue Russian [A] bus badge
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(14, 16, 74, 96);
  ctx.fillStyle = '#06101c';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('A', 51, 82);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(cyrillic, 104, 48);
  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(eng, 104, 78);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`МАРШРУТЫ: ${routes}`, 104, 108);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Segment-segment 2D intersection helper to auto-split crossing roads so intersections ALWAYS allow turning!
function segmentIntersectParam(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  dx: number,
  dz: number
): { t: number; u: number } | null {
  const rX = bx - ax;
  const rZ = bz - az;
  const sX = dx - cx;
  const sZ = dz - cz;
  const denom = rX * sZ - rZ * sX;
  if (Math.abs(denom) < 1e-4) return null;
  const qpx = cx - ax;
  const qpz = cz - az;
  const t = (qpx * sZ - qpz * sX) / denom;
  const u = (qpx * rZ - qpz * rX) / denom;
  if (t > 0.04 && t < 0.96 && u > 0.04 && u < 0.96) {
    return { t, u };
  }
  return null;
}

// Build Bidirectional Two-Lane Graph with Intersecting-Road Turning Splits & Brisker City Pace!
function buildBidirectionalLaneNetwork(): LaneSegment[] {
  interface RawEdge {
    a: Vec2;
    b: Vec2;
    width: number;
    kind: string;
    splits: number[];
  }
  const rawEdges: RawEdge[] = [];

  for (let r = 0; r < ROADS.length; r++) {
    const road = ROADS[r];
    if (road.kind === 'ramp') continue;
    const pts = road.points;
    if (pts.length < 2) continue;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
      if (len < 6.0) continue;
      rawEdges.push({ a: pts[i], b: pts[i + 1], width: road.width, kind: road.kind, splits: [] });
    }
  }

  // Detect every road-to-road crossing & split edges cleanly so traffic & roads offer Left/Straight/Right turns!
  for (let i = 0; i < rawEdges.length; i++) {
    const e1 = rawEdges[i];
    if (e1.kind === 'roundabout') continue;
    for (let j = i + 1; j < rawEdges.length; j++) {
      const e2 = rawEdges[j];
      if (e2.kind === 'roundabout') continue;
      const hit = segmentIntersectParam(
        e1.a.x,
        e1.a.z,
        e1.b.x,
        e1.b.z,
        e2.a.x,
        e2.a.z,
        e2.b.x,
        e2.b.z
      );
      if (hit) {
        e1.splits.push(hit.t);
        e2.splits.push(hit.u);
      }
    }
  }

  const segs: LaneSegment[] = [];

  const pushDir = (a: Vec2, b: Vec2, width: number, kind: string) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 6.0) return;
    const dirX = dx / len;
    const dirZ = dz / len;
    const laneOffset = Math.max(2.9, Math.min(5.2, width * 0.24));
    const offX = -dirZ * laneOffset;
    const offZ = dirX * laneOffset;
    const midX = (a.x + b.x) * 0.5 + offX;
    const midZ = (a.z + b.z) * 0.5 + offZ;
    const zone = classifyTrafficZone(midX, midZ, kind);

    // Slightly faster, brisker city flow speeds (m/s)
    let speedLimit = 19.2; // ~69 km/h urban street
    if (kind === 'coastal' || kind === 'bridge') {
      speedLimit = 28.5; // ~103 km/h coastal highway
    } else if (kind === 'avenue') {
      speedLimit = 24.5; // ~88 km/h main avenue
    } else if (kind === 'roundabout') {
      speedLimit = 18.0; // ~65 km/h roundabout flow
    } else if (zone === 'rural') {
      speedLimit = 22.5;
    } else if (zone === 'industrial') {
      speedLimit = 17.5;
    }

    segs.push({
      p0: { x: a.x + offX, z: a.z + offZ },
      p1: { x: b.x + offX, z: b.z + offZ },
      dx,
      dz,
      len,
      dirX,
      dirZ,
      laneOffset,
      kind,
      zone,
      speedLimit,
      midX,
      midZ,
      nextIndices: [],
    });
  };

  for (let i = 0; i < rawEdges.length; i++) {
    const e = rawEdges[i];
    const ts = [0, ...e.splits.sort((u, v) => u - v), 1];
    const cleanTs: number[] = [0];
    for (let k = 1; k < ts.length; k++) {
      if (ts[k] - cleanTs[cleanTs.length - 1] > 0.05) {
        cleanTs.push(ts[k]);
      }
    }
    if (cleanTs[cleanTs.length - 1] < 0.99) cleanTs[cleanTs.length - 1] = 1;

    for (let k = 0; k < cleanTs.length - 1; k++) {
      const t0 = cleanTs[k];
      const t1 = cleanTs[k + 1];
      const pa: Vec2 = { x: e.a.x + (e.b.x - e.a.x) * t0, z: e.a.z + (e.b.z - e.a.z) * t0 };
      const pb: Vec2 = { x: e.a.x + (e.b.x - e.a.x) * t1, z: e.a.z + (e.b.z - e.a.z) * t1 };
      pushDir(pa, pb, e.width, e.kind);
      pushDir(pb, pa, e.width, e.kind);
    }
  }

  for (let i = 0; i < segs.length; i++) {
    const a = segs[i];
    const candidates: { idx: number; score: number }[] = [];

    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue;
      const b = segs[j];
      const dist = Math.hypot(b.p0.x - a.p1.x, b.p0.z - a.p1.z);
      if (dist > 19.5) continue;
      const dot = a.dirX * b.dirX + a.dirZ * b.dirZ;
      if (dot < -0.58) continue;
      candidates.push({ idx: j, score: dist - dot * 5.2 });
    }

    if (candidates.length === 0) {
      for (let j = 0; j < segs.length; j++) {
        if (i === j) continue;
        const b = segs[j];
        const dist = Math.hypot(b.p0.x - a.p1.x, b.p0.z - a.p1.z);
        if (dist <= 24.0) candidates.push({ idx: j, score: dist });
      }
    }

    candidates.sort((u, v) => u.score - v.score);
    for (let k = 0; k < Math.min(4, candidates.length); k++) {
      a.nextIndices.push(candidates[k].idx);
    }
  }

  return segs;
}

interface SharedVehicleGeometries {
  sedanBody: THREE.BufferGeometry;
  sedanCabin: THREE.BufferGeometry;
  coupeBody: THREE.BufferGeometry;
  coupeCabin: THREE.BufferGeometry;
  suvBody: THREE.BufferGeometry;
  suvCabin: THREE.BufferGeometry;
  pickupBody: THREE.BufferGeometry;
  pickupCab: THREE.BufferGeometry;
  vanBody: THREE.BufferGeometry;
  vanGlass: THREE.BufferGeometry;
  truckCab: THREE.BufferGeometry;
  busBody: THREE.BufferGeometry;
  wheelSmall: THREE.BufferGeometry;
  wheelMed: THREE.BufferGeometry;
  wheelLarge: THREE.BufferGeometry;
  rimSmall: THREE.BufferGeometry;
  rimMed: THREE.BufferGeometry;
  rimLarge: THREE.BufferGeometry;
  fenderArchSmall: THREE.BufferGeometry;
  fenderArchMed: THREE.BufferGeometry;
  fenderArchLarge: THREE.BufferGeometry;
  sideMirror: THREE.BufferGeometry;
  platePlane: THREE.BufferGeometry;
  tailHaloPlane: THREE.BufferGeometry;
  shoulderCreaseSedan: THREE.BufferGeometry;
  hoodRidgeSedan: THREE.BufferGeometry;
}

function extrudeCurvedProfile(
  shape: THREE.Shape,
  width: number,
  bevelSize = 0.08,
  bevelThickness = 0.08
): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    curveSegments: 12,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize,
    bevelThickness,
  });
  geo.center();
  geo.rotateY(-Math.PI * 0.5);
  return geo;
}

function buildSharedVehicleGeometries(): SharedVehicleGeometries {
  const sedanS = new THREE.Shape();
  sedanS.moveTo(-2.12, 0.25);
  sedanS.quadraticCurveTo(-2.22, 0.55, -2.06, 0.8);
  sedanS.lineTo(-1.15, 0.85);
  sedanS.lineTo(1.0, 0.84);
  sedanS.bezierCurveTo(1.65, 0.82, 2.08, 0.72, 2.2, 0.48);
  sedanS.quadraticCurveTo(2.22, 0.3, 2.08, 0.25);
  sedanS.lineTo(-2.12, 0.25);

  const sedanC = new THREE.Shape();
  sedanC.moveTo(-1.26, 0);
  sedanC.quadraticCurveTo(-0.88, 0.48, -0.45, 0.52);
  sedanC.lineTo(0.45, 0.52);
  sedanC.quadraticCurveTo(0.86, 0.44, 1.18, 0);
  sedanC.lineTo(-1.26, 0);

  const coupeS = new THREE.Shape();
  coupeS.moveTo(-2.16, 0.22);
  coupeS.quadraticCurveTo(-2.26, 0.52, -2.06, 0.82);
  coupeS.bezierCurveTo(-1.0, 0.88, 0.6, 0.84, 1.45, 0.76);
  coupeS.bezierCurveTo(1.92, 0.7, 2.24, 0.54, 2.24, 0.34);
  coupeS.lineTo(2.12, 0.22);
  coupeS.lineTo(-2.16, 0.22);

  const coupeC = new THREE.Shape();
  coupeC.moveTo(-1.5, 0);
  coupeC.bezierCurveTo(-0.9, 0.44, -0.3, 0.5, 0.25, 0.47);
  coupeC.quadraticCurveTo(0.74, 0.4, 1.14, 0);
  coupeC.lineTo(-1.5, 0);

  const suvS = new THREE.Shape();
  suvS.moveTo(-2.24, 0.34);
  suvS.quadraticCurveTo(-2.34, 0.7, -2.2, 0.96);
  suvS.lineTo(1.05, 0.96);
  suvS.bezierCurveTo(1.75, 0.94, 2.2, 0.82, 2.3, 0.54);
  suvS.quadraticCurveTo(2.3, 0.36, 2.18, 0.34);
  suvS.lineTo(-2.24, 0.34);

  const suvC = new THREE.Shape();
  suvC.moveTo(-1.95, 0);
  suvC.quadraticCurveTo(-1.78, 0.62, -1.45, 0.65);
  suvC.lineTo(0.56, 0.64);
  suvC.quadraticCurveTo(0.95, 0.54, 1.25, 0);
  suvC.lineTo(-1.95, 0);

  const pickupS = new THREE.Shape();
  pickupS.moveTo(-2.46, 0.36);
  pickupS.lineTo(-2.48, 0.98);
  pickupS.lineTo(-0.62, 0.98);
  pickupS.lineTo(1.22, 0.98);
  pickupS.bezierCurveTo(1.9, 0.96, 2.36, 0.86, 2.46, 0.58);
  pickupS.quadraticCurveTo(2.46, 0.38, 2.32, 0.36);
  pickupS.lineTo(-2.46, 0.36);

  const pickupC = new THREE.Shape();
  pickupC.moveTo(-0.56, 0);
  pickupC.lineTo(-0.48, 0.66);
  pickupC.lineTo(0.58, 0.66);
  pickupC.quadraticCurveTo(0.98, 0.54, 1.22, 0);
  pickupC.lineTo(-0.56, 0);

  const vanS = new THREE.Shape();
  vanS.moveTo(-2.36, 0.32);
  vanS.quadraticCurveTo(-2.44, 1.12, -2.32, 1.88);
  vanS.quadraticCurveTo(-2.15, 2.02, 0.95, 2.0);
  vanS.bezierCurveTo(1.62, 1.98, 2.15, 1.56, 2.36, 0.94);
  vanS.quadraticCurveTo(2.46, 0.54, 2.32, 0.32);
  vanS.lineTo(-2.36, 0.32);

  const vanG = new THREE.Shape();
  vanG.moveTo(-2.1, 0);
  vanG.lineTo(-2.05, 0.66);
  vanG.lineTo(1.2, 0.66);
  vanG.quadraticCurveTo(1.68, 0.52, 1.92, 0);
  vanG.lineTo(-2.1, 0);

  const tCabS = new THREE.Shape();
  tCabS.moveTo(-1.12, 0.42);
  tCabS.lineTo(-1.12, 2.52);
  tCabS.quadraticCurveTo(0.45, 2.54, 0.96, 2.36);
  tCabS.bezierCurveTo(1.26, 2.02, 1.32, 1.24, 1.28, 0.52);
  tCabS.lineTo(1.16, 0.42);
  tCabS.lineTo(-1.12, 0.42);

  const busS = new THREE.Shape();
  busS.moveTo(-5.0, 0.44);
  busS.quadraticCurveTo(-5.14, 1.8, -5.0, 3.16);
  busS.quadraticCurveTo(-4.8, 3.3, 4.45, 3.3);
  busS.bezierCurveTo(4.92, 3.24, 5.18, 2.65, 5.2, 1.55);
  busS.quadraticCurveTo(5.18, 0.62, 4.96, 0.44);
  busS.lineTo(-5.0, 0.44);

  const makeCyl = (r: number, w: number) => {
    const g = new THREE.CylinderGeometry(r, r, w, 16);
    g.rotateZ(Math.PI * 0.5);
    return g;
  };

  const makeArch = (r: number, tube: number) => {
    const g = new THREE.TorusGeometry(r, tube, 8, 16, Math.PI);
    g.rotateY(Math.PI * 0.5);
    return g;
  };
  const sideMirror = new THREE.CapsuleGeometry(0.042, 0.11, 4, 8);
  sideMirror.rotateZ(Math.PI * 0.5);
  const shoulderCreaseSedan = new THREE.CapsuleGeometry(0.036, 3.65, 4, 8);
  shoulderCreaseSedan.rotateX(Math.PI * 0.5);
  const hoodRidgeSedan = new THREE.CapsuleGeometry(0.028, 1.05, 4, 8);
  hoodRidgeSedan.rotateX(Math.PI * 0.5);

  return {
    sedanBody: extrudeCurvedProfile(sedanS, 1.66, 0.11, 0.11),
    sedanCabin: extrudeCurvedProfile(sedanC, 1.36, 0.08, 0.08),
    coupeBody: extrudeCurvedProfile(coupeS, 1.72, 0.11, 0.12),
    coupeCabin: extrudeCurvedProfile(coupeC, 1.34, 0.08, 0.08),
    suvBody: extrudeCurvedProfile(suvS, 1.78, 0.11, 0.11),
    suvCabin: extrudeCurvedProfile(suvC, 1.54, 0.08, 0.08),
    pickupBody: extrudeCurvedProfile(pickupS, 1.82, 0.1, 0.1),
    pickupCab: extrudeCurvedProfile(pickupC, 1.58, 0.08, 0.08),
    vanBody: extrudeCurvedProfile(vanS, 1.84, 0.11, 0.11),
    vanGlass: extrudeCurvedProfile(vanG, 1.88, 0.04, 0.04),
    truckCab: extrudeCurvedProfile(tCabS, 2.18, 0.11, 0.11),
    busBody: extrudeCurvedProfile(busS, 2.28, 0.13, 0.13),
    wheelSmall: makeCyl(0.34, 0.25),
    wheelMed: makeCyl(0.4, 0.27),
    wheelLarge: makeCyl(0.5, 0.3),
    rimSmall: makeCyl(0.22, 0.265),
    rimMed: makeCyl(0.26, 0.285),
    rimLarge: makeCyl(0.31, 0.315),
    fenderArchSmall: makeArch(0.41, 0.055),
    fenderArchMed: makeArch(0.47, 0.062),
    fenderArchLarge: makeArch(0.57, 0.072),
    sideMirror,
    platePlane: new THREE.PlaneGeometry(0.46, 0.12),
    tailHaloPlane: new THREE.PlaneGeometry(1.78, 0.56),
    shoulderCreaseSedan,
    hoodRidgeSedan,
  };
}

function getVehicleDimensions(archetype: TrafficArchetype): {
  radius: number;
  halfW: number;
  halfL: number;
  mass: number;
} {
  if (archetype === 'bus') return { radius: 5.2, halfW: 1.34, halfL: 5.25, mass: 6.0 };
  if (archetype === 'armored_truck') return { radius: 3.85, halfW: 1.24, halfL: 3.72, mass: 7.4 };
  if (archetype === 'truck') return { radius: 4.1, halfW: 1.3, halfL: 4.05, mass: 6.8 };
  if (archetype === 'van') return { radius: 2.65, halfW: 1.04, halfL: 2.52, mass: 1.9 };
  if (archetype === 'pickup') return { radius: 2.7, halfW: 1.04, halfL: 2.58, mass: 1.85 };
  if (archetype === 'suv') return { radius: 2.55, halfW: 1.02, halfL: 2.42, mass: 1.8 };
  return { radius: 2.4, halfW: 0.96, halfL: 2.28, mass: 1.25 };
}

function getVehicleRollSpecs(archetype: TrafficArchetype): {
  bodyH: number;
  boundHalfW: number;
  boundHalfL: number;
  cgFactor: number;
} {
  // Exact outer mesh bounds (including cargo boxes, lightbars, bumpers & mirrors) so NO corner ever clips the road
  if (archetype === 'armored_truck') {
    return { bodyH: 2.86, boundHalfW: 1.3, boundHalfL: 3.82, cgFactor: 1.26 };
  }
  if (archetype === 'truck') {
    return { bodyH: 3.12, boundHalfW: 1.38, boundHalfL: 4.12, cgFactor: 1.38 };
  }
  if (archetype === 'bus') {
    return { bodyH: 3.44, boundHalfW: 1.4, boundHalfL: 5.34, cgFactor: 1.22 };
  }
  if (archetype === 'van') {
    return { bodyH: 2.12, boundHalfW: 1.1, boundHalfL: 2.58, cgFactor: 1.18 };
  }
  if (archetype === 'pickup') {
    return { bodyH: 1.8, boundHalfW: 1.08, boundHalfL: 2.64, cgFactor: 1.06 };
  }
  if (archetype === 'suv') {
    return { bodyH: 1.76, boundHalfW: 1.06, boundHalfL: 2.48, cgFactor: 1.04 };
  }
  if (archetype === 'patrol' || archetype === 'taxi') {
    return { bodyH: 1.58, boundHalfW: 1.02, boundHalfL: 2.38, cgFactor: 0.8 };
  }
  if (archetype === 'coupe') {
    return { bodyH: 1.4, boundHalfW: 1.02, boundHalfL: 2.38, cgFactor: 0.72 };
  }
  return { bodyH: 1.48, boundHalfW: 1.02, boundHalfL: 2.38, cgFactor: 0.8 };
}

function getVehicleBaseFloorY(x: number, z: number): number {
  return Math.max(0.095, getTerrainHeight(x, z) + 0.095);
}

function computeRollFloorY(
  roll: number,
  pitch: number,
  halfW: number,
  halfL: number,
  bodyH: number,
  baseFloorY = 0.095
): number {
  const cr = Math.cos(roll);
  const sr = Math.abs(Math.sin(roll));
  const cp = Math.cos(pitch);
  const sp = Math.abs(Math.sin(pitch));
  // Exact YXZ (Ry * Rx * Rz) world-Y minimum across all 8 bounding-box corners
  // spanning lx in [-halfW, +halfW], ly in [0, bodyH], lz in [-halfL, +halfL]:
  //   y(lx, ly, lz) = lx*(sin(roll)*cos(pitch)) + ly*(cos(roll)*cos(pitch)) - lz*sin(pitch)
  const yAxisY = cr * cp;
  const lowestLocalY =
    -halfW * sr * Math.abs(cp) +
    (yAxisY < 0 ? bodyH * yAxisY : 0) -
    halfL * sp;
  const tiltMargin = Math.min(1, sr + sp + Math.max(0, 1 - yAxisY)) * 0.03;
  return baseFloorY - lowestLocalY + tiltMargin;
}

function createTrafficTailHaloMat(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color('#ff1c14') },
      uIntensity: { value: 0.42 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        // Dual soft crimson bloom lobes over left & right taillights + subtle center bar glow
        float leftLobe = exp(-((p.x + 0.58) * (p.x + 0.58) * 5.2 + p.y * p.y * 6.0));
        float rightLobe = exp(-((p.x - 0.58) * (p.x - 0.58) * 5.2 + p.y * p.y * 6.0));
        float centerBar = exp(-(p.x * p.x * 1.4 + p.y * p.y * 12.0)) * 0.34;
        float glow = (leftLobe + rightLobe + centerBar) * uIntensity;
        vec3 col = mix(uColor, vec3(1.0, 0.36, 0.22), clamp(glow * 0.65, 0.0, 0.7));
        gl_FragColor = vec4(col * glow, clamp(glow, 0.0, 0.52));
      }
    `,
  });
}

function buildTrafficVehicleMesh(
  archetype: TrafficArchetype,
  paintHex: string,
  routeBadge: string,
  sharedGeo: SharedVehicleGeometries,
  textures: TextureLibrary,
  sharedTailHaloMat: THREE.ShaderMaterial,
  isParked = false
): {
  group: THREE.Group;
  brakeMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
  turnLeftMat: THREE.MeshStandardMaterial;
  turnRightMat: THREE.MeshStandardMaterial;
  beaconMat?: THREE.MeshStandardMaterial;
  radius: number;
  halfW: number;
  halfL: number;
  mass: number;
} {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const dims = getVehicleDimensions(archetype);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: paintHex,
    map: textures.trafficPaintMap,
    roughnessMap: textures.trafficPaintRoughness,
    bumpMap: textures.trafficPaintBump,
    bumpScale: 0.024,
    roughness: 0.21,
    metalness: 0.64,
    clearcoat: 0.94,
    clearcoatRoughness: 0.095,
    iridescence: 0.16,
    iridescenceIOR: 1.35,
    sheen: 0.14,
    sheenRoughness: 0.55,
    envMapIntensity: 0.9,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    map: textures.tireTreadMap,
    color: '#1e2228',
    roughness: 0.86,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: '#cbd6e2',
    roughness: 0.18,
    metalness: 0.92,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    map: textures.carbonWeaveMap,
    color: '#181c22',
    roughness: 0.44,
    metalness: 0.36,
  });
  const smokedLensMat = new THREE.MeshPhysicalMaterial({
    color: '#20060a',
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    map: textures.licensePlateMap,
    emissiveMap: textures.licensePlateMap,
    emissive: new THREE.Color('#dfe8f2'),
    emissiveIntensity: isParked ? 0.05 : 0.32,
    roughness: 0.35,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0e1824',
    emissive: new THREE.Color('#224b6b'),
    emissiveIntensity: isParked ? 0.04 : 0.22,
    roughness: 0.065,
    metalness: 0.26,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    iridescence: 0.16,
    envMapIntensity: 0.88,
  });

  const warmCabinMat = new THREE.MeshStandardMaterial({
    color: '#e0cfa4',
    emissive: new THREE.Color('#ffbe66'),
    emissiveIntensity: isParked ? 0.05 : 1.05,
    roughness: 0.24,
  });

  const cyberAccentColor =
    archetype === 'taxi'
      ? '#f59e0b'
      : archetype === 'bus'
      ? '#22d3ee'
      : archetype === 'coupe'
      ? '#38e0ff'
      : '#56c2ff';
  const cyberAccentMat = new THREE.MeshStandardMaterial({
    color: '#c8f2ff',
    emissive: new THREE.Color(cyberAccentColor),
    emissiveIntensity: isParked ? 0.06 : 1.15,
    roughness: 0.2,
  });

  const headMat = new THREE.MeshStandardMaterial({
    color: isParked ? '#687482' : '#f5f8ff',
    emissive: new THREE.Color('#eef4ff'),
    emissiveIntensity: isParked ? 0.02 : 2.0,
  });
  const brakeMat = new THREE.MeshStandardMaterial({
    map: textures.tailLightMap,
    emissiveMap: textures.tailLightMap,
    color: '#42060b',
    emissive: new THREE.Color('#ff2218'),
    emissiveIntensity: isParked ? 0.08 : 1.35,
    roughness: 0.14,
    metalness: 0.18,
  });

  const turnLeftMat = new THREE.MeshStandardMaterial({
    color: '#6e3b0a',
    emissive: new THREE.Color('#ff9800'),
    emissiveIntensity: 0.04,
    roughness: 0.2,
  });
  const turnRightMat = new THREE.MeshStandardMaterial({
    color: '#6e3b0a',
    emissive: new THREE.Color('#ff9800'),
    emissiveIntensity: 0.04,
    roughness: 0.2,
  });

  let beaconMat: THREE.MeshStandardMaterial | undefined;

  const addWheelSet = (
    wx: number,
    zPositions: number[],
    wr: number,
    tireGeo: THREE.BufferGeometry,
    rimGeo: THREE.BufferGeometry,
    archGeo: THREE.BufferGeometry
  ) => {
    for (const wz of zPositions) {
      for (const sx of [-wx, wx]) {
        const w = new THREE.Mesh(tireGeo, tireMat);
        w.position.set(sx, wr, wz);
        g.add(w);
        const r = new THREE.Mesh(rimGeo, alloyMat);
        r.position.set(sx, wr, wz);
        g.add(r);
        // Sculpted curved wheel-arch fender flare!
        const arch = new THREE.Mesh(archGeo, bodyMat);
        arch.position.set(sx * 1.03, wr + 0.04, wz);
        g.add(arch);
      }
    }
  };

  const addRearDetailPack = (rearZ: number, tailY: number, plateY: number, widthScale: number) => {
    const plate = new THREE.Mesh(sharedGeo.platePlane, plateMat);
    plate.rotation.y = Math.PI;
    plate.position.set(0, plateY, rearZ - 0.025);
    g.add(plate);
    // Smoked polycarbonate outer taillight bar glass
    const lens = new THREE.Mesh(new THREE.BoxGeometry(1.52 * widthScale, 0.16, 0.05), smokedLensMat);
    lens.position.set(0, tailY, rearZ - 0.02);
    g.add(lens);
    // Soft volumetric rear crimson glow halo on active moving traffic
    if (!isParked) {
      const halo = new THREE.Mesh(sharedGeo.tailHaloPlane, sharedTailHaloMat);
      halo.scale.set(widthScale, 0.92, 1);
      halo.rotation.y = Math.PI;
      halo.position.set(0, tailY, rearZ - 0.11);
      g.add(halo);
    }
  };

  const addSideMirrors = (mx: number, my: number, mz: number) => {
    for (const sx of [-1, 1]) {
      const mirror = new THREE.Mesh(sharedGeo.sideMirror, bodyMat);
      mirror.position.set(sx * mx, my, mz);
      g.add(mirror);
    }
  };

  const addTurnSignals = (
    sxDist: number,
    yFront: number,
    zFront: number,
    yRear: number,
    zRear: number
  ) => {
    if (isParked) return;
    const sigGeo = new THREE.BoxGeometry(0.18, 0.1, 0.08);
    const fl = new THREE.Mesh(sigGeo, turnLeftMat);
    fl.position.set(sxDist, yFront, zFront);
    g.add(fl);
    const rl = new THREE.Mesh(sigGeo, turnLeftMat);
    rl.position.set(sxDist, yRear, zRear);
    g.add(rl);

    const fr = new THREE.Mesh(sigGeo, turnRightMat);
    fr.position.set(-sxDist, yFront, zFront);
    g.add(fr);
    const rr = new THREE.Mesh(sigGeo, turnRightMat);
    rr.position.set(-sxDist, yRear, zRear);
    g.add(rr);
  };

  if (archetype === 'bus') {
    const hull = new THREE.Mesh(sharedGeo.busBody, bodyMat);
    hull.position.y = 1.92;
    g.add(hull);
    const sideGlow = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.09, 9.6), cyberAccentMat);
    sideGlow.position.y = 1.46;
    g.add(sideGlow);
    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(2.53, 1.04, 8.8), warmCabinMat);
    sideWin.position.y = 2.45;
    g.add(sideWin);
    const destTex = createBusDestinationTex(routeBadge);
    const destBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.3),
      new THREE.MeshStandardMaterial({
        map: destTex,
        emissiveMap: destTex,
        emissive: new THREE.Color('#ffaa32'),
        emissiveIntensity: 1.25,
      })
    );
    destBoard.position.set(0, 3.04, 5.22);
    g.add(destBoard);
    for (const sx of [-0.88, 0.88]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.08), headMat);
      hl.position.set(sx, 0.96, 5.26);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.08), brakeMat);
      tl.position.set(sx, 1.15, -5.16);
      g.add(tl);
    }
    addTurnSignals(1.06, 0.96, 5.25, 0.92, -5.16);
    addRearDetailPack(-5.16, 1.15, 0.78, 1.25);
    addSideMirrors(1.36, 2.02, 4.45);
    addWheelSet(1.18, [-3.15, 3.15], 0.5, sharedGeo.wheelLarge, sharedGeo.rimLarge, sharedGeo.fenderArchLarge);
  } else if (archetype === 'truck') {
    const cab = new THREE.Mesh(sharedGeo.truckCab, bodyMat);
    cab.position.set(0, 1.56, 2.52);
    g.add(cab);
    const cabWin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.78, 0.1), glassMat);
    cabWin.position.set(0, 2.02, 3.82);
    g.add(cabWin);
    const visorBar = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.06), cyberAccentMat);
    visorBar.position.set(0, 2.54, 3.74);
    g.add(visorBar);
    const cargoMat = new THREE.MeshStandardMaterial({
      map: textures.truckCargoMap,
      color: '#a8b4be',
      roughness: 0.55,
      metalness: 0.35,
    });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.42, 2.25, 5.25), cargoMat);
    bed.position.set(0, 1.94, -1.32);
    g.add(bed);
    for (const sx of [-0.84, 0.84]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.08), headMat);
      hl.position.set(sx, 0.92, 3.88);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.08), brakeMat);
      tl.position.set(sx, 0.92, -3.98);
      g.add(tl);
    }
    addTurnSignals(1.06, 0.92, 3.86, 0.92, -3.98);
    addRearDetailPack(-3.98, 0.92, 0.68, 1.15);
    addSideMirrors(1.32, 1.95, 3.1);
    addWheelSet(1.15, [-2.75, -1.35, 2.42], 0.5, sharedGeo.wheelLarge, sharedGeo.rimLarge, sharedGeo.fenderArchLarge);
  } else if (archetype === 'armored_truck') {
    const steelArmorMat = new THREE.MeshStandardMaterial({
      color: '#28313d',
      roughness: 0.44,
      metalness: 0.68,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: '#d8b24c',
      roughness: 0.36,
      metalness: 0.4,
    });
    const ramMat = new THREE.MeshStandardMaterial({
      color: '#14181e',
      roughness: 0.65,
      metalness: 0.55,
    });
    // Heavy armored vault box + integrated hood cab
    const vaultHull = new THREE.Mesh(new THREE.BoxGeometry(2.38, 2.02, 5.2), steelArmorMat);
    vaultHull.position.set(0, 1.62, -0.82);
    g.add(vaultHull);
    const cabArmor = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.56, 2.05), steelArmorMat);
    cabArmor.position.set(0, 1.34, 2.48);
    g.add(cabArmor);
    // Narrow armored slit windshield
    const slitGlass = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.42, 0.1), glassMat);
    slitGlass.position.set(0, 1.84, 3.48);
    g.add(slitGlass);
    // Gold/amber security stripes along left/right vault flanks
    for (const sx of [-1.2, 1.2]) {
      const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 4.95), stripeMat);
      sideStripe.position.set(sx, 1.44, -0.82);
      g.add(sideStripe);
    }
    // Reinforced front bull-bar ram
    const frontRam = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.36, 0.22), ramMat);
    frontRam.position.set(0, 0.72, 3.6);
    g.add(frontRam);
    // Double rear vault lock bar & hinges
    const lockBar = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 0.08), alloyMat);
    lockBar.position.set(0, 1.52, -3.44);
    g.add(lockBar);
    const amberBeacon = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.14, 0.22),
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: new THREE.Color('#f59e0b'),
        emissiveIntensity: isParked ? 0.15 : 2.1,
      })
    );
    amberBeacon.position.set(0, 2.7, 1.55);
    g.add(amberBeacon);
    for (const sx of [-0.78, 0.78]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headMat);
      hl.position.set(sx, 1.0, 3.52);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.08), brakeMat);
      tl.position.set(sx, 0.96, -3.44);
      g.add(tl);
    }
    addTurnSignals(1.0, 1.0, 3.5, 0.96, -3.44);
    addRearDetailPack(-3.44, 0.96, 0.66, 1.08);
    addSideMirrors(1.26, 1.72, 2.75);
    addWheelSet(1.1, [-2.2, 2.05], 0.5, sharedGeo.wheelLarge, sharedGeo.rimLarge, sharedGeo.fenderArchLarge);
  } else if (archetype === 'van') {
    const hull = new THREE.Mesh(sharedGeo.vanBody, bodyMat);
    hull.position.y = 1.18;
    g.add(hull);
    const glass = new THREE.Mesh(sharedGeo.vanGlass, glassMat);
    glass.position.set(0, 1.56, 0.22);
    g.add(glass);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.04, 0.06), cyberAccentMat);
    accent.position.set(0, 1.05, 2.48);
    g.add(accent);
    for (const sx of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), headMat);
      hl.position.set(sx, 0.88, 2.48);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.08), brakeMat);
      tl.position.set(sx, 1.02, -2.48);
      g.add(tl);
      const crease = new THREE.Mesh(sharedGeo.shoulderCreaseSedan, bodyMat);
      crease.scale.set(1, 1, 1.12);
      crease.position.set(sx * 1.38, 1.1, -0.05);
      g.add(crease);
    }
    addTurnSignals(0.88, 0.88, 2.46, 0.82, -2.48);
    addRearDetailPack(-2.48, 1.02, 0.66, 1.04);
    addSideMirrors(1.08, 1.38, 1.32);
    addWheelSet(0.96, [-1.42, 1.44], 0.4, sharedGeo.wheelMed, sharedGeo.rimMed, sharedGeo.fenderArchMed);
  } else if (archetype === 'pickup') {
    const hull = new THREE.Mesh(sharedGeo.pickupBody, bodyMat);
    hull.position.y = 0.72;
    g.add(hull);
    const cab = new THREE.Mesh(sharedGeo.pickupCab, glassMat);
    cab.position.set(0, 1.36, 0.35);
    g.add(cab);
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.07, 1.18), bodyMat);
    roofCap.position.set(0, 1.72, 0.14);
    g.add(roofCap);
    const bedLiner = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.12, 1.8), trimMat);
    bedLiner.position.set(0, 1.04, -1.48);
    g.add(bedLiner);
    for (const sx of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.08), headMat);
      hl.position.set(sx, 0.84, 2.54);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.08), brakeMat);
      tl.position.set(sx, 0.86, -2.56);
      g.add(tl);
      const hoodR = new THREE.Mesh(sharedGeo.hoodRidgeSedan, bodyMat);
      hoodR.position.set(sx * 0.56, 1.04, 1.66);
      g.add(hoodR);
    }
    addTurnSignals(0.88, 0.84, 2.52, 0.86, -2.56);
    addRearDetailPack(-2.56, 0.86, 0.56, 1.05);
    addSideMirrors(1.06, 1.24, 0.92);
    addWheelSet(0.95, [-1.52, 1.52], 0.4, sharedGeo.wheelMed, sharedGeo.rimMed, sharedGeo.fenderArchMed);
  } else if (archetype === 'suv') {
    const hull = new THREE.Mesh(sharedGeo.suvBody, bodyMat);
    hull.position.y = 0.7;
    g.add(hull);
    const cabin = new THREE.Mesh(sharedGeo.suvCabin, glassMat);
    cabin.position.set(0, 1.32, -0.3);
    g.add(cabin);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 2.1), bodyMat);
    roof.position.set(0, 1.66, -0.42);
    g.add(roof);
    const rearBar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.055, 0.06), brakeMat);
    rearBar.position.set(0, 0.88, -2.38);
    g.add(rearBar);
    const rearValance = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 0.16), trimMat);
    rearValance.position.set(0, 0.36, -2.34);
    g.add(rearValance);
    for (const sx of [-0.7, 0.7]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), headMat);
      hl.position.set(sx, 0.82, 2.38);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.15, 0.08), brakeMat);
      tl.position.set(sx, 0.88, -2.38);
      g.add(tl);
      const crease = new THREE.Mesh(sharedGeo.shoulderCreaseSedan, bodyMat);
      crease.position.set(sx * 1.4, 0.94, -0.04);
      g.add(crease);
      const hoodR = new THREE.Mesh(sharedGeo.hoodRidgeSedan, bodyMat);
      hoodR.position.set(sx * 0.56, 1.0, 1.54);
      g.add(hoodR);
    }
    addTurnSignals(0.86, 0.82, 2.36, 0.88, -2.38);
    addRearDetailPack(-2.38, 0.88, 0.6, 1.04);
    addSideMirrors(1.04, 1.18, 0.72);
    addWheelSet(0.94, [-1.42, 1.44], 0.4, sharedGeo.wheelMed, sharedGeo.rimMed, sharedGeo.fenderArchMed);
  } else {
    const isCoupe = archetype === 'coupe';
    const isPatrol = archetype === 'patrol';
    const isTaxi = archetype === 'taxi';
    const hull = new THREE.Mesh(isCoupe ? sharedGeo.coupeBody : sharedGeo.sedanBody, bodyMat);
    hull.position.y = 0.6;
    g.add(hull);
    const cabin = new THREE.Mesh(isCoupe ? sharedGeo.coupeCabin : sharedGeo.sedanCabin, glassMat);
    cabin.position.set(0, isCoupe ? 1.07 : 1.12, isCoupe ? -0.18 : -0.14);
    g.add(cabin);
    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(1.28, 0.06, isCoupe ? 1.08 : 1.16),
      bodyMat
    );
    roofCap.position.set(0, isCoupe ? 1.32 : 1.38, -0.18);
    g.add(roofCap);
    // Sculpted front splitter, rear diffuser valance & subtle ducktail trunk lip
    const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.06, 0.24), trimMat);
    frontSplitter.position.set(0, 0.24, 2.22);
    g.add(frontSplitter);
    const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.14, 0.18), trimMat);
    rearDiffuser.position.set(0, 0.3, -2.21);
    g.add(rearDiffuser);
    const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.065, 0.22), bodyMat);
    ducktail.position.set(0, isCoupe ? 0.85 : 0.86, -2.14);
    ducktail.rotation.x = 0.2;
    g.add(ducktail);

    // Sculpted shoulder character creases & twin hood power ridges
    for (const sx of [-1, 1]) {
      const crease = new THREE.Mesh(sharedGeo.shoulderCreaseSedan, bodyMat);
      crease.position.set(sx * (isCoupe ? 0.94 : 0.91), 0.78, -0.02);
      g.add(crease);
      const hoodRidge = new THREE.Mesh(sharedGeo.hoodRidgeSedan, bodyMat);
      hoodRidge.position.set(sx * 0.42, 0.87, 1.38);
      hoodRidge.rotation.x = Math.PI * 0.5 + 0.07;
      g.add(hoodRidge);
    }

    const frontBlade = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.03, 0.05), cyberAccentMat);
    frontBlade.position.set(0, 0.72, 2.3);
    g.add(frontBlade);
    // Continuous OLED lightbar thread on coupes & sedans
    const rearBlade = new THREE.Mesh(
      new THREE.BoxGeometry(isCoupe ? 1.66 : 1.54, isCoupe ? 0.05 : 0.035, 0.05),
      brakeMat
    );
    rearBlade.position.set(0, isCoupe ? 0.76 : 0.73, -2.26);
    g.add(rearBlade);
    if (isPatrol) {
      const blueStripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.88, 0.14, 4.1),
        new THREE.MeshStandardMaterial({ color: '#1b4f9c', roughness: 0.35 })
      );
      blueStripe.position.y = 0.68;
      g.add(blueStripe);
      beaconMat = new THREE.MeshStandardMaterial({
        color: '#2060ff',
        emissive: new THREE.Color('#2878ff'),
        emissiveIntensity: isParked ? 0.1 : 2.2,
      });
      const lightbar = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.13, 0.2), beaconMat);
      lightbar.position.set(0, 1.48, -0.12);
      g.add(lightbar);
    } else if (isTaxi) {
      const taxiSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.15, 0.2),
        new THREE.MeshStandardMaterial({
          color: '#facc15',
          emissive: new THREE.Color('#f59e0b'),
          emissiveIntensity: isParked ? 0.2 : 1.65,
        })
      );
      taxiSign.position.set(0, 1.48, -0.1);
      g.add(taxiSign);
    }
    for (const sx of [-0.64, 0.64]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.11, 0.08), headMat);
      hl.position.set(sx, 0.68, 2.3);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.125, 0.08), brakeMat);
      tl.position.set(sx, 0.73, -2.26);
      g.add(tl);
    }
    const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 0.07), trimMat);
    frontGrille.position.set(0, 0.56, 2.31);
    g.add(frontGrille);
    addTurnSignals(0.84, 0.68, 2.28, 0.73, -2.26);
    addRearDetailPack(-2.26, 0.73, 0.5, 0.96);
    addSideMirrors(0.98, 1.0, 0.58);
    addWheelSet(0.88, [-1.34, 1.38], 0.34, sharedGeo.wheelSmall, sharedGeo.rimSmall, sharedGeo.fenderArchSmall);
  }

  return {
    group: g,
    brakeMat,
    headMat,
    turnLeftMat,
    turnRightMat,
    beaconMat,
    radius: dims.radius,
    halfW: dims.halfW,
    halfL: dims.halfL,
    mass: dims.mass,
  };
}

export function buildTrafficSystem(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld
): TrafficSystemHandles {
  const root = new THREE.Group();
  const laneSegments = buildBidirectionalLaneNetwork();
  const sharedGeo = buildSharedVehicleGeometries();
  const sharedTailHaloMat = createTrafficTailHaloMat();

  let currentSeed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  let rng = mulberry32(currentSeed);

  // =========================================================================
  // 1. 18 UPGRADED PUBLIC BUS STOP SHELTERS (Bilingual Illuminated Signs + Yellow Curb Bays!)
  // Waiting commuters are rendered by the PS2 articulated pedestrian system!
  // =========================================================================
  const shelterSteelMat = new THREE.MeshStandardMaterial({
    color: '#222c36',
    roughness: 0.45,
    metalness: 0.65,
  });
  const shelterGlassMat = new THREE.MeshStandardMaterial({
    color: '#50687d',
    transparent: true,
    opacity: 0.36,
    roughness: 0.14,
  });
  const shelterLightMat = new THREE.MeshStandardMaterial({
    color: '#e0f4ff',
    emissive: new THREE.Color('#7dd3fc'),
    emissiveIntensity: 1.35,
  });
  const busBayPaintMat = new THREE.MeshStandardMaterial({
    color: '#d4a11c',
    roughness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });

  const busStopArrivalFlags: boolean[] = BUS_STOPS.map(() => false);

  for (let i = 0; i < BUS_STOPS.length; i++) {
    const bs = BUS_STOPS[i];
    const sg = new THREE.Group();
    sg.position.set(bs.x, 0, bs.z);
    sg.rotation.y = bs.rotY;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.18, 2.2), shelterSteelMat);
    roof.position.set(0, 2.7, 0);
    sg.add(roof);
    const roofLight = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 0.25), shelterLightMat);
    roofLight.position.set(0, 2.59, 0.2);
    sg.add(roofLight);

    const back = new THREE.Mesh(new THREE.BoxGeometry(5.3, 2.35, 0.08), shelterGlassMat);
    back.position.set(0, 1.35, -0.96);
    sg.add(back);
    for (const px of [-2.6, 0, 2.6]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 0.12), shelterSteelMat);
      post.position.set(px, 1.35, -0.92);
      sg.add(post);
    }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.56), shelterSteelMat);
    bench.position.set(0, 0.52, -0.54);
    sg.add(bench);

    // Bilingual glowing bus stop signboard mounted above shelter roof!
    const stopTex = createBusStopSignTex(bs.cyrillic, bs.routes, bs.name);
    const stopSignMat = new THREE.MeshStandardMaterial({
      map: stopTex,
      emissiveMap: stopTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.75,
      roughness: 0.28,
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.14), stopSignMat);
    signBoard.position.set(0, 3.25, 0.85);
    sg.add(signBoard);

    // Curbside bus bay painted yellow border line
    const bayLine = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 0.22), busBayPaintMat);
    bayLine.rotation.x = -Math.PI * 0.5;
    bayLine.position.set(0, 0.115, 2.25);
    sg.add(bayLine);

    root.add(sg);
    collisionWorld.addBox(bs.x, bs.z, 5.2, 1.9, bs.rotY);
  }

  // =========================================================================
  // 2. ~155 CURVED GLOSSY PARKED CARS ALL OVER THE MAP (Curbsides, Businesses & Side Bays!)
  // Registered as solid OBB colliders in collisionWorld — strictly clear of active lanes!
  // =========================================================================
  const parkedPalette = [
    '#242c38',
    '#4c2226',
    '#1e3346',
    '#66686c',
    '#24362c',
    '#7c8692',
    '#3e243c',
    '#1c242e',
    '#5c5244',
    '#2c343e',
  ];
  const parkedTypes: TrafficArchetype[] = ['sedan', 'sedan', 'coupe', 'suv', 'van', 'pickup'];
  const parkedCars: ParkedCar[] = [];
  const parkRng = mulberry32(991234);

  const tryPlaceParkedCar = (x: number, z: number, heading: number, archetype: TrafficArchetype) => {
    if (parkedCars.length >= 158) return;
    if (signedLandDistance(x, z) < 12) return;
    // Keep strictly clear of signalized intersections & crosswalks!
    for (let k = 0; k < SIGNALIZED_INTERSECTIONS.length; k++) {
      const ix = SIGNALIZED_INTERSECTIONS[k];
      if ((x - ix.x) ** 2 + (z - ix.z) ** 2 < 24 * 24) return;
    }
    // Keep clear of bus stops!
    for (let k = 0; k < BUS_STOPS.length; k++) {
      const bs = BUS_STOPS[k];
      if ((x - bs.x) ** 2 + (z - bs.z) ** 2 < 14 * 14) return;
    }
    // Keep clear of other parked cars!
    for (let k = 0; k < parkedCars.length; k++) {
      if ((x - parkedCars[k].x) ** 2 + (z - parkedCars[k].z) ** 2 < 8.5 * 8.5) return;
    }
    // Ensure not overlapping existing solid building colliders!
    const colTest = collisionWorld.resolveCircle(x, z, 2.0);
    if (colTest.hit) return;

    const paint = parkedPalette[Math.floor(parkRng() * parkedPalette.length)];
    const built = buildTrafficVehicleMesh(
      archetype,
      paint,
      '',
      sharedGeo,
      textures,
      sharedTailHaloMat,
      true
    );
    built.group.position.set(x, 0.095, z);
    built.group.rotation.y = heading;
    root.add(built.group);

    // Dynamic movable parked car — reacts physically to player, traffic cars, buses & domino chain hits!
    parkedCars.push({
      id: parkedCars.length,
      archetype,
      group: built.group,
      x,
      z,
      y: 0.095,
      heading,
      vx: 0,
      vz: 0,
      vy: 0,
      yawVel: 0,
      pitch: 0,
      pitchVel: 0,
      roll: 0,
      rollVel: 0,
      tumbleActive: false,
      halfW: built.halfW,
      halfL: built.halfL,
      mass: built.mass,
      sleeping: true,
    });
  };

  // Curbside parallel street parking along commercial streets, avenues & residential blocks!
  for (let r = 0; r < ROADS.length; r++) {
    const road = ROADS[r];
    if (road.kind === 'roundabout' || road.kind === 'bridge' || road.kind === 'ramp') continue;
    const pts = road.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 36) continue;
      const dirX = dx / len;
      const dirZ = dz / len;
      const nx = -dirZ;
      const nz = dirX;
      // Place neatly along the outer asphalt/curb parking strip (outside the moving lane!)
      const curbDist = road.width * 0.5 - 1.15;
      const step = road.kind === 'street' ? 28 : 44;
      for (let d = 20; d < len - 20; d += step) {
        if (parkRng() > 0.62) continue;
        const side = parkRng() > 0.5 ? 1 : -1;
        const px = a.x + dirX * d + nx * curbDist * side;
        const pz = a.z + dirZ * d + nz * curbDist * side;
        const heading = Math.atan2(dirX * side, dirZ * side);
        const arch = parkedTypes[Math.floor(parkRng() * parkedTypes.length)];
        tryPlaceParkedCar(px, pz, heading, arch);
      }
    }
  }

  // Extra business / apartment side parking bays beside District 1/2/4 hubs
  const parkingLotAnchors: [number, number, number][] = [
    [-265, -190, 0],
    [-375, -310, Math.PI * 0.5],
    [-155, -430, 0],
    [170, -415, 0],
    [280, -560, Math.PI * 0.5],
    [478, -195, 0],
    [420, 230, 0],
    [520, 465, Math.PI * 0.5],
    [-85, 165, 0],
    [145, 115, Math.PI * 0.5],
  ];
  for (let i = 0; i < parkingLotAnchors.length; i++) {
    const [amx, amz, rot] = parkingLotAnchors[i];
    const ax = amx * 0.72;
    const az = amz * 0.72;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    for (let slot = -2; slot <= 2; slot++) {
      const lx = slot * 3.8;
      const wx = ax + lx * cosR;
      const wz = az - lx * sinR;
      if (isNearAnyRoad(wx, wz, 2.0)) continue;
      const arch = parkedTypes[Math.floor(parkRng() * parkedTypes.length)];
      tryPlaceParkedCar(wx, wz, rot, arch);
    }
  }

  // =========================================================================
  // 3. POOLED WIDE SOFT TRAFFIC ILLUMINATION LIGHTS (Faint reflections on cars & buildings!)
  // =========================================================================
  const trafficGlowLights: THREE.PointLight[] = [];
  for (let k = 0; k < 5; k++) {
    const pl = new THREE.PointLight('#b4dcff', 4.6, 32, 1.55);
    pl.position.set(0, -50, 0);
    root.add(pl);
    trafficGlowLights.push(pl);
  }

  const segsByZone: Record<TrafficZone, number[]> = {
    urban: [],
    residential: [],
    industrial: [],
    rural: [],
    security: [],
  };
  const majorSegIndices: number[] = [];

  for (let i = 0; i < laneSegments.length; i++) {
    const seg = laneSegments[i];
    segsByZone[seg.zone].push(i);
    if (
      seg.kind === 'avenue' ||
      seg.kind === 'coastal' ||
      seg.kind === 'roundabout' ||
      seg.kind === 'bridge'
    ) {
      majorSegIndices.push(i);
    }
  }

  // =========================================================================
  // 4. EASIER-FLOWING, BRISKER CITY TRAFFIC FLEET (~92 Well-Spaced Vehicles!)
  // =========================================================================
  const agents: TrafficAgent[] = [];
  const sedanColors = [
    '#34404e',
    '#5e2524',
    '#223b52',
    '#7c7a72',
    '#2c3f34',
    '#8b95a0',
    '#4c2646',
    '#1f3246',
    '#665c4e',
    '#252c36',
  ];
  const coupeColors = ['#182436', '#6c1824', '#163840', '#38224a', '#262b34', '#7a4b14'];
  const suvColors = ['#202730', '#323e48', '#462822', '#283d33', '#525860'];
  const pickupColors = ['#543322', '#2e4030', '#3a4654', '#6b5328', '#3e3a36'];
  const busColors = ['#c4962c', '#22568a', '#a8382e'];
  const busLabels = ['М1 ЦЕНТР', 'М2 КОЛЬЦО', '47 СЕВЕР', '12 ПОРТ', '08 КАЗИНО', '99 ОСТРОВ'];

  const fleetRoster: { archetype: TrafficArchetype; homeZone: TrafficZone }[] = [];
  // Urban Core (28)
  for (let i = 0; i < 6; i++) fleetRoster.push({ archetype: 'bus', homeZone: 'urban' });
  for (let i = 0; i < 6; i++) fleetRoster.push({ archetype: 'taxi', homeZone: 'urban' });
  for (let i = 0; i < 6; i++) fleetRoster.push({ archetype: 'coupe', homeZone: 'urban' });
  for (let i = 0; i < 7; i++) fleetRoster.push({ archetype: 'sedan', homeZone: 'urban' });
  for (let i = 0; i < 3; i++) fleetRoster.push({ archetype: 'van', homeZone: 'urban' });
  // Residential (20)
  for (let i = 0; i < 3; i++) fleetRoster.push({ archetype: 'bus', homeZone: 'residential' });
  for (let i = 0; i < 7; i++) fleetRoster.push({ archetype: 'sedan', homeZone: 'residential' });
  for (let i = 0; i < 6; i++) fleetRoster.push({ archetype: 'suv', homeZone: 'residential' });
  for (let i = 0; i < 2; i++) fleetRoster.push({ archetype: 'taxi', homeZone: 'residential' });
  for (let i = 0; i < 2; i++) fleetRoster.push({ archetype: 'van', homeZone: 'residential' });
  // Industrial (15)
  for (let i = 0; i < 7; i++) fleetRoster.push({ archetype: 'truck', homeZone: 'industrial' });
  for (let i = 0; i < 5; i++) fleetRoster.push({ archetype: 'van', homeZone: 'industrial' });
  for (let i = 0; i < 3; i++) fleetRoster.push({ archetype: 'pickup', homeZone: 'industrial' });
  // Rural / Coastal (17)
  for (let i = 0; i < 6; i++) fleetRoster.push({ archetype: 'pickup', homeZone: 'rural' });
  for (let i = 0; i < 5; i++) fleetRoster.push({ archetype: 'suv', homeZone: 'rural' });
  for (let i = 0; i < 3; i++) fleetRoster.push({ archetype: 'bus', homeZone: 'rural' });
  for (let i = 0; i < 3; i++) fleetRoster.push({ archetype: 'truck', homeZone: 'rural' });
  // Security & Armored Cash Transport (14)
  for (let i = 0; i < 7; i++) fleetRoster.push({ archetype: 'patrol', homeZone: 'security' });
  fleetRoster.push({ archetype: 'armored_truck', homeZone: 'urban' });
  fleetRoster.push({ archetype: 'armored_truck', homeZone: 'industrial' });
  for (let i = 0; i < 3; i++) fleetRoster.push({ archetype: 'suv', homeZone: 'security' });
  for (let i = 0; i < 2; i++) fleetRoster.push({ archetype: 'van', homeZone: 'security' });

  const chooseNextSegmentAndTurn = (
    segIdx: number,
    archetype: TrafficArchetype
  ): { nextIdx: number; turn: -1 | 0 | 1 } => {
    const seg = laneSegments[segIdx];
    if (seg.nextIndices.length === 0) return { nextIdx: -1, turn: 0 };

    const nextIdx =
      archetype === 'bus' || archetype === 'truck' || archetype === 'armored_truck'
        ? seg.nextIndices[0]
        : seg.nextIndices[Math.floor(rng() * seg.nextIndices.length)];

    const nextSeg = laneSegments[nextIdx];
    const cross = seg.dirX * nextSeg.dirZ - seg.dirZ * nextSeg.dirX;
    let turn: -1 | 0 | 1 = 0;
    if (cross > 0.24) turn = 1;
    else if (cross < -0.24) turn = -1;
    return { nextIdx, turn };
  };

  const placeAgentOnSegment = (agent: TrafficAgent, segIdx: number, distFrac: number) => {
    const seg = laneSegments[segIdx];
    const dist = seg.len * distFrac;
    const x = seg.p0.x + seg.dx * distFrac;
    const z = seg.p0.z + seg.dz * distFrac;
    const heading = Math.atan2(seg.dx, seg.dz);

    const plan = chooseNextSegmentAndTurn(segIdx, agent.archetype);
    agent.segIdx = segIdx;
    agent.nextSegIdx = plan.nextIdx;
    agent.plannedTurn = plan.turn;
    agent.segDist = dist;
    agent.x = x;
    agent.z = z;
    agent.heading = heading;
    agent.speed = seg.speedLimit * agent.cruiseScale * 0.88;
    agent.dwellTimer = 0;
    agent.impatience = 0;
    agent.honkFlashTimer = 0;
    agent.knockVx = 0;
    agent.knockVz = 0;
    agent.knockY = 0.095;
    agent.knockVy = 0;
    agent.knockYawVel = 0;
    agent.knockPitch = 0;
    agent.knockPitchVel = 0;
    agent.knockRoll = 0;
    agent.knockRollVel = 0;
    agent.knockTimer = 0;
    agent.tumbleActive = false;
    agent.tumbleHoldTimer = 0;
    agent.group.position.set(x, 0.095, z);
    agent.group.rotation.set(0, heading, 0);
  };

  const reattachToNearestSegment = (agent: TrafficAgent) => {
    let bestIdx = agent.segIdx;
    let bestD2 = Infinity;
    let bestDist = 0;
    for (let i = 0; i < laneSegments.length; i++) {
      const seg = laneSegments[i];
      const dMid2 = (seg.midX - agent.x) ** 2 + (seg.midZ - agent.z) ** 2;
      if (dMid2 > 95 * 95) continue;
      const proj = ((agent.x - seg.p0.x) * seg.dx + (agent.z - seg.p0.z) * seg.dz) / (seg.len * seg.len);
      const t = Math.max(0.05, Math.min(0.95, proj));
      const cx = seg.p0.x + seg.dx * t;
      const cz = seg.p0.z + seg.dz * t;
      const d2 = (cx - agent.x) ** 2 + (cz - agent.z) ** 2;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIdx = i;
        bestDist = t * seg.len;
      }
    }
    agent.segIdx = bestIdx;
    agent.segDist = bestDist;
    const plan = chooseNextSegmentAndTurn(bestIdx, agent.archetype);
    agent.nextSegIdx = plan.nextIdx;
    agent.plannedTurn = plan.turn;
    agent.speed = 2.0;
    agent.swerveOffset = 0;
  };

  const findClearSegment = (
    centerX: number,
    centerZ: number,
    minDist: number,
    maxDist: number,
    preferredZone: TrafficZone | null,
    majorOnly: boolean
  ): number => {
    const zonePool =
      preferredZone && segsByZone[preferredZone].length > 0 ? segsByZone[preferredZone] : null;
    const pool = majorOnly && majorSegIndices.length > 0 ? majorSegIndices : zonePool;
    const poolLen = pool ? pool.length : laneSegments.length;

    for (let tries = 0; tries < 28; tries++) {
      const rawIdx = Math.floor(rng() * poolLen);
      const segIdx = pool ? pool[rawIdx] : rawIdx;
      const seg = laneSegments[segIdx];
      const d = Math.hypot(seg.midX - centerX, seg.midZ - centerZ);
      if (d < minDist || d > maxDist) continue;

      let crowded = false;
      for (let j = 0; j < agents.length; j++) {
        const other = agents[j];
        const od2 = (other.x - seg.midX) ** 2 + (other.z - seg.midZ) ** 2;
        if (od2 < 24 * 24) {
          crowded = true;
          break;
        }
      }
      if (!crowded) return segIdx;
    }

    for (let tries = 0; tries < 20; tries++) {
      const segIdx = Math.floor(rng() * laneSegments.length);
      const seg = laneSegments[segIdx];
      const d = Math.hypot(seg.midX - centerX, seg.midZ - centerZ);
      if (d >= minDist && d <= maxDist) return segIdx;
    }

    const fallbackRaw = Math.floor(rng() * poolLen);
    return pool ? pool[fallbackRaw] : fallbackRaw;
  };

  for (let i = 0; i < fleetRoster.length; i++) {
    const { archetype, homeZone } = fleetRoster[i];
    const paint =
      archetype === 'bus'
        ? busColors[i % busColors.length]
        : archetype === 'patrol'
        ? '#ced8e2'
        : archetype === 'taxi'
        ? '#d4a11c'
        : archetype === 'coupe'
        ? coupeColors[i % coupeColors.length]
        : archetype === 'pickup'
        ? pickupColors[i % pickupColors.length]
        : archetype === 'armored_truck'
        ? '#28313d'
        : archetype === 'truck'
        ? i % 2 === 0
          ? '#9c5222'
          : '#344c3a'
        : archetype === 'van'
        ? '#7d8892'
        : archetype === 'suv'
        ? suvColors[i % suvColors.length]
        : sedanColors[i % sedanColors.length];

    const built = buildTrafficVehicleMesh(
      archetype,
      paint,
      busLabels[i % busLabels.length],
      sharedGeo,
      textures,
      sharedTailHaloMat
    );

    const cruiseScale =
      archetype === 'bus'
        ? 0.85 + rng() * 0.14
        : archetype === 'truck' || archetype === 'armored_truck'
        ? 0.84 + rng() * 0.14
        : archetype === 'coupe' || archetype === 'patrol'
        ? 1.06 + rng() * 0.18
        : 0.94 + rng() * 0.2;

    // Assign realistic human conflict-management temperament when blocked by a stopped player:
    // ~62% average drivers squeeze neatly through the tight gap, ~20% cut a tight corner aggressively, ~18% inch/bump player!
    const rollStyle = rng();
    let conflictStyle: ConflictStyle = 'squeeze';
    if (archetype === 'truck' || archetype === 'armored_truck' || archetype === 'patrol' || archetype === 'pickup') {
      conflictStyle = rollStyle < 0.42 ? 'inch_push' : rollStyle < 0.72 ? 'squeeze' : 'cut_corner';
    } else if (archetype === 'coupe' || archetype === 'taxi') {
      conflictStyle = rollStyle < 0.56 ? 'squeeze' : rollStyle < 0.86 ? 'cut_corner' : 'inch_push';
    } else {
      conflictStyle = rollStyle < 0.66 ? 'squeeze' : rollStyle < 0.84 ? 'cut_corner' : 'inch_push';
    }

    const agent: TrafficAgent = {
      id: i,
      archetype,
      homeZone,
      group: built.group,
      segIdx: 0,
      nextSegIdx: -1,
      plannedTurn: 0,
      segDist: 0,
      speed: 16,
      cruiseScale,
      x: 0,
      z: 0,
      heading: 0,
      radius: built.radius,
      halfW: built.halfW,
      halfL: built.halfL,
      mass: built.mass,
      dwellTimer: 0,
      swerveOffset: 0,
      swerveSkill: 0.55 + rng() * 0.45,
      conflictStyle,
      impatience: 0,
      passSide: rng() > 0.5 ? 1 : -1,
      honkFlashTimer: 0,
      knockVx: 0,
      knockVz: 0,
      knockY: 0.095,
      knockVy: 0,
      knockYawVel: 0,
      knockPitch: 0,
      knockPitchVel: 0,
      knockRoll: 0,
      knockRollVel: 0,
      knockTimer: 0,
      tumbleActive: false,
      tumbleHoldTimer: 0,
      braking: false,
      brakeMat: built.brakeMat,
      headMat: built.headMat,
      turnLeftMat: built.turnLeftMat,
      turnRightMat: built.turnRightMat,
      beaconMat: built.beaconMat,
    };

    const majorOnly = archetype === 'bus' || archetype === 'armored_truck';
    const segIdx =
      homeZone === 'urban'
        ? findClearSegment(0, 45, 28, 280, 'urban', majorOnly)
        : findClearSegment(0, 0, 26, 820, homeZone, majorOnly);

    placeAgentOnSegment(agent, segIdx, 0.14 + rng() * 0.72);
    root.add(built.group);
    agents.push(agent);
  }

  const reseed = (newSeed?: number, playerX = 0, playerZ = 65): number => {
    currentSeed =
      newSeed !== undefined
        ? newSeed >>> 0
        : ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    rng = mulberry32(currentSeed);

    const playerZone = classifyTrafficZone(playerX, playerZ, 'street');
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const majorOnly = a.archetype === 'bus' || a.archetype === 'armored_truck';
      const segIdx =
        a.homeZone === playerZone || i < 36
          ? findClearSegment(playerX, playerZ, 30, 250, a.homeZone, majorOnly)
          : findClearSegment(0, 0, 32, 820, a.homeZone, majorOnly);
      placeAgentOnSegment(a, segIdx, 0.12 + rng() * 0.76);
    }
    return currentSeed;
  };

  let streamClock = 0;
  const nearestIds = [-1, -1, -1, -1, -1];
  const nearestD2s = [Infinity, Infinity, Infinity, Infinity, Infinity];

  const update = (
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    nightFactor: number,
    playerVx = 0,
    playerVz = 0
  ) => {
    const headIntensity = 1.45 + nightFactor * 1.15;
    const playerSpeed = Math.hypot(playerVx, playerVz);
    const playerDirX = playerSpeed > 0.5 ? playerVx / playerSpeed : 0;
    const playerDirZ = playerSpeed > 0.5 ? playerVz / playerSpeed : 0;
    streamClock += dt;
    const doStreamCheck = streamClock > 0.42;
    if (doStreamCheck) streamClock = 0;

    const playerZone = classifyTrafficZone(playerX, playerZ, 'street');

    for (let k = 0; k < 5; k++) {
      nearestIds[k] = -1;
      nearestD2s[k] = Infinity;
    }
    for (let b = 0; b < busStopArrivalFlags.length; b++) {
      busStopArrivalFlags[b] = false;
    }

    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];

      if (a.beaconMat) {
        const pulse = Math.sin(elapsed * 9.0 + a.id * 2.0);
        a.beaconMat.emissive.setHex(pulse > 0 ? 0x2675ff : 0xff2828);
        a.beaconMat.emissiveIntensity = 1.6 + nightFactor * 1.3;
      }

      // =====================================================================
      // A. REAL 3D RIGID-BODY KNOCKBACK, TWO-WHEEL HEEL & ROLLOVER TUMBLE PHYSICS!
      // =====================================================================
      if (a.knockTimer > 0 || a.tumbleActive) {
        if (a.knockTimer > 0) a.knockTimer = Math.max(0, a.knockTimer - dt);

        const specs = getVehicleRollSpecs(a.archetype);
        const preSpd = Math.hypot(a.knockVx, a.knockVz);
        const isRighting = a.tumbleActive && a.tumbleHoldTimer <= 0 && a.knockTimer <= 0 && preSpd < 0.9;

        if (isRighting) {
          const targetUpright = Math.round(a.knockRoll / (Math.PI * 2)) * (Math.PI * 2);
          a.knockRoll = THREE.MathUtils.damp(a.knockRoll, targetUpright, 5.2, dt);
          a.knockRollVel = 0;
          a.knockPitch = THREE.MathUtils.damp(a.knockPitch, 0, 6.2, dt);
          a.knockPitchVel = 0;
          a.knockVx *= Math.exp(-6.0 * dt);
          a.knockVz *= Math.exp(-6.0 * dt);
          const rightBaseY = getVehicleBaseFloorY(a.x, a.z);
          a.knockY = computeRollFloorY(
            a.knockRoll,
            a.knockPitch,
            specs.boundHalfW,
            specs.boundHalfL,
            specs.bodyH,
            rightBaseY
          );
          a.group.position.set(a.x, a.knockY, a.z);
          a.group.rotation.set(a.knockPitch, a.heading, a.knockRoll);
          const hazOn = Math.sin(elapsed * 16.0) > 0;
          a.turnLeftMat.emissiveIntensity = hazOn ? 3.5 : 0.04;
          a.turnRightMat.emissiveIntensity = hazOn ? 3.5 : 0.04;
          if (Math.abs(a.knockRoll - targetUpright) < 0.05) {
            a.tumbleActive = false;
            a.tumbleHoldTimer = 0;
            a.knockTimer = 0;
            a.knockVx = 0;
            a.knockVz = 0;
            a.knockY = rightBaseY;
            a.knockVy = 0;
            a.knockYawVel = 0;
            a.knockPitch = 0;
            a.knockPitchVel = 0;
            a.knockRoll = 0;
            a.knockRollVel = 0;
            a.group.position.set(a.x, rightBaseY, a.z);
            a.group.rotation.set(0, a.heading, 0);
            reattachToNearestSegment(a);
          }
          continue;
        }

        a.x += a.knockVx * dt;
        a.z += a.knockVz * dt;
        a.heading += a.knockYawVel * dt;

        // Vertical ballistic gravity & 3D barrel-roll / pitch angular integration
        a.knockVy -= 20.5 * dt;
        a.knockY += a.knockVy * dt;
        a.knockRoll += a.knockRollVel * dt;
        a.knockPitch = THREE.MathUtils.clamp(a.knockPitch + a.knockPitchVel * dt, -0.58, 0.58);

        const baseFloorY = getVehicleBaseFloorY(a.x, a.z);
        const floorY = computeRollFloorY(
          a.knockRoll,
          a.knockPitch,
          specs.boundHalfW,
          specs.boundHalfL,
          specs.bodyH,
          baseFloorY
        );
        const grounded = a.knockY <= floorY + 0.03;

        if (a.knockY <= floorY) {
          a.knockY = floorY;
          if (a.knockVy < -2.3) {
            // Hard asphalt slam bounce — scrapes chassis & sheds rotational momentum
            const slam = -a.knockVy;
            a.knockVy = slam * 0.27;
            a.knockRollVel *= 0.78;
            a.knockPitchVel = THREE.MathUtils.clamp(
              a.knockPitchVel * 0.55 + (a.knockRollVel > 0 ? 1 : -1) * Math.min(0.65, slam * 0.06),
              -2.2,
              2.2
            );
          } else {
            a.knockVy = 0;
          }
        }

        // Airborne carries momentum; scraping roof/side grinds harder on wet asphalt
        const isOverturned =
          Math.abs(Math.sin(a.knockRoll)) > 0.42 || Math.cos(a.knockRoll) < 0.55;
        const linDrag = !grounded
          ? Math.exp(-0.35 * dt)
          : isOverturned
          ? Math.exp(-3.15 * dt)
          : Math.exp(-2.35 * dt);
        a.knockVx *= linDrag;
        a.knockVz *= linDrag;
        a.knockYawVel *= Math.exp((grounded ? -3.2 : -0.75) * dt);

        // Pitch suspension/gravity damping
        a.knockPitchVel += (-a.knockPitch * 16.0 - a.knockPitchVel * 5.8) * dt;

        // Roll torque: two-wheel heels snap back onto suspension; true tumbles settle onto nearest 90° face!
        if (!a.tumbleActive) {
          a.knockRollVel += (-a.knockRoll * 21.0 - a.knockRollVel * 5.6) * dt;
        } else if (grounded) {
          a.knockRollVel *= Math.exp(-1.55 * dt);
          if (Math.abs(a.knockRollVel) < 3.6) {
            const nearestFace = Math.round(a.knockRoll / (Math.PI * 0.5)) * (Math.PI * 0.5);
            const faceErr = nearestFace - a.knockRoll;
            a.knockRollVel += (faceErr * 15.5 - a.knockRollVel * 4.4) * dt;
          }
        } else {
          a.knockRollVel *= Math.exp(-0.22 * dt);
        }

        // Bounce knocked/tumbling vehicle off buildings / walls — hard lateral slam can secondary-trip a truck/SUV!
        const envHit = collisionWorld.resolveCircle(a.x, a.z, Math.max(a.halfW, 1.35));
        if (envHit.hit) {
          a.x = envHit.x;
          a.z = envHit.z;
          const vn = a.knockVx * envHit.nx + a.knockVz * envHit.nz;
          if (vn < 0) {
            const wallClosing = -vn;
            const cosH = Math.cos(a.heading);
            const sinH = Math.sin(a.heading);
            const sideHit = envHit.nx * cosH - envHit.nz * sinH;
            // Secondary curb/wall trip if sliding fast sideways in a tall vehicle!
            if (
              !a.tumbleActive &&
              wallClosing > 10.5 &&
              Math.abs(sideHit) > 0.52 &&
              specs.cgFactor >= 1.0
            ) {
              const tripSign = sideHit >= 0 ? -1 : 1;
              a.tumbleActive = true;
              a.tumbleHoldTimer = 5.2;
              a.knockRollVel += tripSign * THREE.MathUtils.clamp(2.8 + (wallClosing - 10.0) * 0.25, 2.8, 6.0);
              a.knockVy = Math.max(a.knockVy, Math.min(4.8, 2.1 + (wallClosing - 10.0) * 0.16));
              a.knockTimer = Math.max(a.knockTimer, 3.6);
            }
            a.knockVx -= envHit.nx * vn * 1.42;
            a.knockVz -= envHit.nz * vn * 1.42;
            a.knockYawVel += vn * 0.14;
          }
        }

        const displayRoll = a.tumbleActive
          ? a.knockRoll
          : a.knockRoll + a.knockYawVel * 0.032;
        const finalBaseY = getVehicleBaseFloorY(a.x, a.z);
        const displayFloorY = computeRollFloorY(
          displayRoll,
          a.knockPitch,
          specs.boundHalfW,
          specs.boundHalfL,
          specs.bodyH,
          finalBaseY
        );
        if (a.knockY < displayFloorY) {
          a.knockY = displayFloorY;
        }
        a.group.position.set(a.x, a.knockY, a.z);
        a.group.rotation.set(a.knockPitch, a.heading, displayRoll);
        a.brakeMat.emissiveIntensity = 3.2;
        a.headMat.emissiveIntensity = headIntensity;
        // Hazard blinkers flash while knocked out / overturned!
        const hazOn = Math.sin(elapsed * 16.0) > 0;
        a.turnLeftMat.emissiveIntensity = hazOn ? 3.5 : 0.04;
        a.turnRightMat.emissiveIntensity = hazOn ? 3.5 : 0.04;

        const knockSpd = Math.hypot(a.knockVx, a.knockVz);
        const settled =
          knockSpd < 0.85 &&
          Math.abs(a.knockRollVel) < 0.24 &&
          grounded &&
          Math.abs(a.knockVy) < 0.25;

        if (a.tumbleActive) {
          if (settled) {
            if (isOverturned && a.tumbleHoldTimer > 0) {
              // Hold dramatically overturned on side/roof with hazards blinking!
              a.tumbleHoldTimer -= dt;
            } else if (!isOverturned) {
              // Landed upright back on wheels after a full 360° barrel roll!
              a.tumbleActive = false;
              a.tumbleHoldTimer = 0;
              a.knockTimer = 0;
              a.knockVx = 0;
              a.knockVz = 0;
              a.knockY = finalBaseY;
              a.knockVy = 0;
              a.knockYawVel = 0;
              a.knockPitch = 0;
              a.knockPitchVel = 0;
              a.knockRoll = 0;
              a.knockRollVel = 0;
              a.group.position.set(a.x, finalBaseY, a.z);
              a.group.rotation.set(0, a.heading, 0);
              reattachToNearestSegment(a);
            }
          }
        } else if (a.knockTimer <= 0 && knockSpd < 1.1 && Math.abs(a.knockRoll) < 0.09 && grounded) {
          a.knockTimer = 0;
          a.knockVx = 0;
          a.knockVz = 0;
          a.knockY = finalBaseY;
          a.knockVy = 0;
          a.knockYawVel = 0;
          a.knockPitch = 0;
          a.knockPitchVel = 0;
          a.knockRoll = 0;
          a.knockRollVel = 0;
          a.group.position.set(a.x, finalBaseY, a.z);
          a.group.rotation.set(0, a.heading, 0);
          reattachToNearestSegment(a);
        }
        continue;
      }

      // Dynamic zone-aware proximity streaming
      if (doStreamCheck && a.archetype !== 'bus') {
        const dp = Math.hypot(a.x - playerX, a.z - playerZ);
        if (dp > 340) {
          const zoneMatch = a.homeZone === playerZone ? playerZone : null;
          const newSeg = findClearSegment(playerX, playerZ, 72, 250, zoneMatch, false);
          placeAgentOnSegment(a, newSeg, 0.1 + rng() * 0.75);
          continue;
        }
      }

      const seg = laneSegments[a.segIdx];
      const dirX = seg.dirX;
      const dirZ = seg.dirZ;
      const rightX = -dirZ;
      const rightZ = dirX;
      const desiredCruise = seg.speedLimit * a.cruiseScale;

      let impatientSwerveTarget = 0;
      let isImpatientSignaling: -1 | 0 | 1 = 0;
      let angerFlashing = false;

      if (a.dwellTimer > 0) {
        a.dwellTimer -= dt;
        a.speed = THREE.MathUtils.damp(a.speed, 0, 6.5, dt);
        a.braking = true;
      } else {
        let targetSpeed = desiredCruise;
        a.braking = false;

        const distToEnd = seg.len - a.segDist;
        if (a.plannedTurn !== 0 && distToEnd < 24) {
          targetSpeed = Math.min(targetSpeed, 13.5);
        }

        // Stop smoothly at RED traffic lights!
        if (isRedLightAhead(a.x, a.z, dirX, dirZ, elapsed)) {
          targetSpeed = 0;
          a.braking = true;
        }

        // Buses pause briefly at any of the 18 bus stops (and flag waiting PS2 civilians!)
        if (a.archetype === 'bus') {
          for (let bs = 0; bs < BUS_STOPS.length; bs++) {
            const stop = BUS_STOPS[bs];
            const dStop = Math.hypot(a.x - stop.x, a.z - stop.z);
            if (dStop < 16.0) {
              busStopArrivalFlags[bs] = true;
              if (a.speed > 2.2 && dStop < 11.0 && (Math.floor(elapsed / 24) + a.id + bs) % 3 === 0) {
                a.dwellTimer = 2.4;
                targetSpeed = 0;
                a.braking = true;
                break;
              }
            }
          }
        }

        // ===================================================================
        // B. IMPATIENT & AGGRESSIVE CONFLICT MANAGEMENT WHEN PLAYER BLOCKS ROAD!
        // Average driver squeezes neatly through the tight gap; others cut corners or inch/push!
        // ===================================================================
        const toPx = playerX - a.x;
        const toPz = playerZ - a.z;
        const fwdP = toPx * dirX + toPz * dirZ;
        const signedSideP = toPx * rightX + toPz * rightZ; // + = player on our right, - = player on our left
        const absSideP = Math.abs(signedSideP);

        const isBlockedByPlayer =
          fwdP > -1.0 &&
          fwdP < a.halfL + 19.0 &&
          absSideP < a.halfW + 2.3;

        if (isBlockedByPlayer) {
          if (playerSpeed < 3.6) {
            // Player is sitting/crawling in the lane — driver gets progressively impatient!
            if (a.impatience === 0) {
              // Pick whichever side around the stalled player has the cleaner squeeze gap!
              a.passSide = signedSideP >= 0 ? -1 : 1;
            }
            a.impatience = Math.min(10.0, a.impatience + dt);
          } else {
            a.impatience = Math.max(0, a.impatience - dt * 1.4);
          }

          if (a.impatience < 1.35) {
            // Initial polite braking & waiting
            const factor = Math.max(0, (fwdP - (a.halfL + 4.4)) / 15.0);
            targetSpeed = Math.min(targetSpeed, desiredCruise * factor);
            if (fwdP < a.halfL + 5.8) {
              targetSpeed = 0;
              a.braking = true;
            }
          } else if (a.conflictStyle === 'squeeze') {
            // AVERAGE DRIVER (~62%): Flashes turn signal, creeps & squeezes neatly through the tight space!
            angerFlashing = a.impatience > 1.8 && a.impatience < 3.5;
            isImpatientSignaling = a.passSide > 0 ? 1 : -1;
            const tightGap = a.halfW + 1.65;
            impatientSwerveTarget = a.passSide * Math.min(3.8, tightGap + (signedSideP * a.passSide < 0 ? 0.55 : 0.95));
            const clearedLateral = Math.abs(signedSideP - a.swerveOffset) > a.halfW + 1.45;
            targetSpeed = clearedLateral ? Math.min(desiredCruise, 12.5) : 4.2;
            a.braking = !clearedLateral && fwdP < a.halfL + 4.2;
          } else if (a.conflictStyle === 'cut_corner') {
            // IMPATIENT CORNER-CUTTER (~20%): Swings wide into opposing lane/shoulder & accelerates aggressively!
            angerFlashing = true;
            isImpatientSignaling = a.passSide > 0 ? 1 : -1;
            impatientSwerveTarget = a.passSide * 4.4;
            const clearedLateral = Math.abs(signedSideP - a.swerveOffset) > a.halfW + 1.3;
            targetSpeed = clearedLateral ? Math.min(desiredCruise * 1.15, 17.5) : 5.8;
            a.braking = false;
          } else {
            // AGGRESSIVE INCH-FORWARD / BUMP (~18%): Flashes high beams, inches right up, then shoves the player!
            angerFlashing = true;
            if (a.impatience < 3.6) {
              // Aggressively tailgates / inches right up to player's bumper
              targetSpeed = fwdP > a.halfL + 2.6 ? 4.8 : 0.9;
              a.braking = fwdP < a.halfL + 2.8;
            } else {
              // Lost patience! Drives forward into the player to shove/inconvenience them out of the way!
              targetSpeed = 7.4;
              a.braking = false;
            }
          }
        } else {
          // Decay impatience smoothly once past the stalled player!
          a.impatience = Math.max(0, a.impatience - dt * 1.8);
        }

        // Follow traffic ahead in same lane (and yield gently if an oncoming squeezer temporarily cuts across!)
        for (let j = 0; j < agents.length; j++) {
          if (i === j) continue;
          const b = agents[j];
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const d2 = dx * dx + dz * dz;
          if (d2 > 26 * 26) continue;

          const bSeg = laneSegments[b.segIdx];
          const align = dirX * bSeg.dirX + dirZ * bSeg.dirZ;
          const fwd = dx * dirX + dz * dirZ;
          const side = Math.abs(-dx * dirZ + dz * dirX);

          if (align > 0.35) {
            const minGap = a.halfL + b.halfL + 3.4;
            if (fwd > 0 && fwd < minGap + 12 && side < a.halfW + b.halfW + 0.65) {
              if (fwd < minGap) {
                targetSpeed = 0;
                a.braking = true;
              } else {
                targetSpeed = Math.min(targetSpeed, Math.max(b.speed * 0.96, 2.2));
                a.braking = targetSpeed < a.speed - 1.5;
              }
            }
          } else if (align < -0.5 && Math.abs(b.swerveOffset) > 1.8) {
            // Temporarily inconvenienced oncoming car taps brakes for a squeezing driver!
            if (fwd > 0 && fwd < 20 && side < a.halfW + b.halfW + 0.9) {
              targetSpeed = Math.min(targetSpeed, 4.5);
              a.braking = true;
            }
          }
        }

        a.speed = THREE.MathUtils.damp(
          a.speed,
          targetSpeed,
          targetSpeed < a.speed ? 5.2 : 3.4,
          dt
        );
      }

      a.segDist += a.speed * dt;
      if (a.segDist >= seg.len) {
        const overflow = a.segDist - seg.len;
        if (a.nextSegIdx >= 0) {
          a.segIdx = a.nextSegIdx;
          const nextSeg = laneSegments[a.segIdx];
          a.segDist = Math.min(overflow, nextSeg.len * 0.5);
          const nextPlan = chooseNextSegmentAndTurn(a.segIdx, a.archetype);
          a.nextSegIdx = nextPlan.nextIdx;
          a.plannedTurn = nextPlan.turn;
        } else {
          const newSeg = findClearSegment(
            playerX,
            playerZ,
            65,
            250,
            a.homeZone === playerZone ? playerZone : null,
            a.archetype === 'bus' || a.archetype === 'armored_truck'
          );
          placeAgentOnSegment(a, newSeg, 0.05);
          continue;
        }
      }

      const curSeg = laneSegments[a.segIdx];
      const u = Math.min(1, a.segDist / curSeg.len);
      const baseX = curSeg.p0.x + curSeg.dx * u;
      const baseZ = curSeg.p0.z + curSeg.dz * u;

      // Combine impatient bypass squeeze with subtle high-speed evasive nudge!
      let targetSwerve = impatientSwerveTarget;
      if (targetSwerve === 0 && playerSpeed > 18.0 && a.archetype !== 'bus' && a.archetype !== 'truck') {
        const relX = baseX - playerX;
        const relZ = baseZ - playerZ;
        const dist = Math.hypot(relX, relZ);
        if (dist > 3.0 && dist < 44.0) {
          const alongPlayer = relX * playerDirX + relZ * playerDirZ;
          if (alongPlayer > 2.0 && alongPlayer < 42.0) {
            const crossPlayer = -relX * playerDirZ + relZ * playerDirX;
            if (Math.abs(crossPlayer) < 4.4) {
              const rX = -curSeg.dirZ;
              const rZ = curSeg.dirX;
              const playerSideOnLane = (playerX - baseX) * rX + (playerZ - baseZ) * rZ;
              const awaySign = playerSideOnLane >= 0 ? -1 : 1;
              const urgency = Math.max(0.25, 1.0 - dist / 44.0);
              targetSwerve = awaySign * Math.min(1.32, (0.78 + urgency * 0.54) * a.swerveSkill);
            }
          }
        }
      }

      const swerveLambda = impatientSwerveTarget !== 0 ? 3.2 : targetSwerve !== 0 ? 2.4 : 1.45;
      a.swerveOffset = THREE.MathUtils.damp(a.swerveOffset, targetSwerve, swerveLambda, dt);

      const targetX = baseX + -curSeg.dirZ * a.swerveOffset;
      const targetZ = baseZ + curSeg.dirX * a.swerveOffset;

      a.x = THREE.MathUtils.damp(a.x, targetX, 9.5, dt);
      a.z = THREE.MathUtils.damp(a.z, targetZ, 9.5, dt);

      const swerveYawHint = (targetSwerve - a.swerveOffset) * 0.16;
      const targetHeading = Math.atan2(curSeg.dx, curSeg.dz) - swerveYawHint;
      let diff = targetHeading - a.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      a.heading += diff * Math.min(1, dt * 7.5);

      a.group.position.set(a.x, 0.095, a.z);
      a.group.rotation.set(0, a.heading, 0);
      a.brakeMat.emissiveIntensity = a.braking ? 2.9 : 0.75 + nightFactor * 0.55;

      // Angry high-beam flash when driver is impatient!
      if (angerFlashing) {
        const flashPulse = Math.sin(elapsed * 22.0 + a.id) > 0.25 ? 4.4 : headIntensity;
        a.headMat.emissiveIntensity = flashPulse;
      } else {
        a.headMat.emissiveIntensity = headIntensity;
      }

      const remain = curSeg.len - a.segDist;
      const blinkOn = Math.sin(elapsed * 14.5 + a.id * 1.7) > 0.05;
      const signalLeft =
        isImpatientSignaling === -1 || (a.plannedTurn === -1 && remain < 42) || diff > 0.16;
      const signalRight =
        isImpatientSignaling === 1 || (a.plannedTurn === 1 && remain < 42) || diff < -0.16;

      a.turnLeftMat.emissiveIntensity = signalLeft && blinkOn ? 3.4 : 0.04;
      a.turnRightMat.emissiveIntensity = signalRight && blinkOn ? 3.4 : 0.04;

      const d2p = (a.x - playerX) ** 2 + (a.z - playerZ) ** 2;
      if (d2p < 75 * 75) {
        let worstSlot = -1;
        let worstVal = d2p;
        for (let k = 0; k < 5; k++) {
          if (nearestD2s[k] > worstVal) {
            worstVal = nearestD2s[k];
            worstSlot = k;
          }
        }
        if (worstSlot >= 0) {
          nearestD2s[worstSlot] = d2p;
          nearestIds[worstSlot] = i;
        }
      }
    }

    // =========================================================================
    // C. TRAFFIC / BUS <-> PARKED CAR COLLISIONS (BOTH VEHICLES AFFECTED!)
    // =========================================================================
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const aVx = a.knockTimer > 0 || a.tumbleActive ? a.knockVx : Math.sin(a.heading) * a.speed;
      const aVz = a.knockTimer > 0 || a.tumbleActive ? a.knockVz : Math.cos(a.heading) * a.speed;
      const aSpd = Math.hypot(aVx, aVz);
      if (aSpd < 0.45) continue;

      for (let j = 0; j < parkedCars.length; j++) {
        const p = parkedCars[j];
        const broad = a.halfL + p.halfL + 1.4;
        const dx = p.x - a.x;
        const dz = p.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > broad * broad) continue;

        // Test agent's front & rear circles against parked car's rotated OBB
        const sinH = Math.sin(p.heading);
        const cosH = Math.cos(p.heading);
        const aSin = Math.sin(a.heading);
        const aCos = Math.cos(a.heading);
        const aCircleR = a.halfW * 1.05;
        const aSpan = Math.max(0.8, a.halfL - a.halfW);

        let bestPen = 0;
        let bestNx = 0;
        let bestNz = 0;
        let hitX = a.x;
        let hitZ = a.z;

        for (let c = 0; c < 2; c++) {
          const sign = c === 0 ? 1 : -1;
          const cx = a.x + aSin * aSpan * sign;
          const cz = a.z + aCos * aSpan * sign;
          const rx = cx - p.x;
          const rz = cz - p.z;
          const lx = rx * cosH - rz * sinH;
          const lz = rx * sinH + rz * cosH;
          const clX = Math.max(-p.halfW, Math.min(p.halfW, lx));
          const clZ = Math.max(-p.halfL, Math.min(p.halfL, lz));
          const dfX = lx - clX;
          const dfZ = lz - clZ;
          const dist2 = dfX * dfX + dfZ * dfZ;
          if (dist2 < aCircleR * aCircleR) {
            let lnx = 0;
            let lnz = 0;
            let pen = 0;
            if (dist2 > 1e-6) {
              const d = Math.sqrt(dist2);
              lnx = dfX / d;
              lnz = dfZ / d;
              pen = aCircleR - d;
            } else {
              const penX = p.halfW - Math.abs(lx);
              const penZ = p.halfL - Math.abs(lz);
              if (penX < penZ) {
                lnx = lx >= 0 ? 1 : -1;
                pen = penX + aCircleR;
              } else {
                lnz = lz >= 0 ? 1 : -1;
                pen = penZ + aCircleR;
              }
            }
            if (pen > bestPen) {
              bestPen = pen;
              // Normal pointing parked -> agent
              bestNx = lnx * cosH + lnz * sinH;
              bestNz = -lnx * sinH + lnz * cosH;
              hitX = cx;
              hitZ = cz;
            }
          }
        }

        if (bestPen > 0) {
          const invMA = 1 / a.mass;
          const invMP = 1 / p.mass;
          const invSum = invMA + invMP;
          const sep = bestPen + 0.05;

          a.x += bestNx * sep * (invMA / invSum);
          a.z += bestNz * sep * (invMA / invSum);
          p.x -= bestNx * sep * (invMP / invSum);
          p.z -= bestNz * sep * (invMP / invSum);
          p.sleeping = false;

          const relVx = aVx - p.vx;
          const relVz = aVz - p.vz;
          const relVn = relVx * bestNx + relVz * bestNz;

          if (relVn < 0) {
            const closing = -relVn;
            const e = 0.36;
            const jImp = (-(1 + e) * relVn) / invSum;

            // Blast & spin the parked car proportionally to colliding vehicle mass (buses/trucks punt it hard!)
            p.vx -= bestNx * (jImp * invMP);
            p.vz -= bestNz * (jImp * invMP);
            const armX = hitX - p.x;
            const armZ = hitZ - p.z;
            const torque = (armX * (-bestNz) - armZ * (-bestNx)) * jImp * invMP;
            p.yawVel = THREE.MathUtils.clamp(p.yawVel + torque * 0.28, -7.2, 7.2);
            p.pitchVel = THREE.MathUtils.clamp(p.pitchVel + closing * 0.055, -2.2, 2.2);

            const pSpecs = getVehicleRollSpecs(p.archetype);
            const pSideDot = bestNx * cosH - bestNz * sinH;
            const pAbsSide = Math.abs(pSideDot);
            const pRollSign = pSideDot >= 0 ? 1 : -1;
            const heavyBonus = a.mass >= 4.0 ? 1.24 : 1.0;
            const pStrikeScore = closing * pAbsSide * pSpecs.cgFactor * heavyBonus;

            if (pAbsSide >= 0.48 && closing >= 15.5 && pStrikeScore >= 25.0) {
              const excess = pStrikeScore - 25.0;
              p.tumbleActive = true;
              p.rollVel += pRollSign * THREE.MathUtils.clamp(2.8 + excess * 0.22, 2.8, 7.8);
              p.vy = Math.max(p.vy, THREE.MathUtils.clamp(2.4 + excess * 0.18, 2.4, 6.8));
            } else if (pAbsSide >= 0.45 && pStrikeScore >= 16.0) {
              p.rollVel += pRollSign * THREE.MathUtils.clamp((pStrikeScore - 14.5) * 0.16, 0.7, 2.0);
              p.vy = Math.max(p.vy, 1.15);
            } else if (closing > 7.5 && a.mass >= p.mass * 1.4) {
              p.vy = Math.max(p.vy, Math.min(4.8, (closing - 6.0) * 0.26));
            }

            // Affect the colliding traffic car or bus proportionally too!
            const newAVx = aVx + bestNx * (jImp * invMA);
            const newAVz = aVz + bestNz * (jImp * invMA);
            const massRatio = p.mass / a.mass;
            if (closing > 3.2 && (massRatio > 0.45 || a.knockTimer > 0)) {
              a.knockVx = newAVx;
              a.knockVz = newAVz;
              a.knockYawVel = THREE.MathUtils.clamp(a.knockYawVel - torque * 0.16 * massRatio, -4.5, 4.5);
              a.knockPitch = THREE.MathUtils.clamp(closing * 0.007 * massRatio, 0.02, 0.18);
              a.knockTimer = Math.max(a.knockTimer, Math.min(2.6, 0.9 + closing * 0.06));
              a.speed = 0;
            } else {
              // Heavy bus/truck decelerates noticeably & shudders when shoving a parked car
              a.speed = Math.max(0, a.speed * (1 - Math.min(0.65, 0.18 + massRatio * 0.48)));
              a.dwellTimer = Math.max(a.dwellTimer, 0.35);
            }
          }
          const pHitSpecs = getVehicleRollSpecs(p.archetype);
          const pMinY = computeRollFloorY(
            p.roll,
            p.pitch,
            pHitSpecs.boundHalfW,
            pHitSpecs.boundHalfL,
            pHitSpecs.bodyH,
            getVehicleBaseFloorY(p.x, p.z)
          );
          if (p.y < pMinY) p.y = pMinY;
          p.group.position.set(p.x, p.y, p.z);
          p.group.rotation.set(p.pitch, p.heading, p.roll);

          const aHitSpecs = getVehicleRollSpecs(a.archetype);
          const aBaseY = getVehicleBaseFloorY(a.x, a.z);
          if (a.knockTimer > 0 || a.tumbleActive) {
            const aMinY = computeRollFloorY(
              a.knockRoll,
              a.knockPitch,
              aHitSpecs.boundHalfW,
              aHitSpecs.boundHalfL,
              aHitSpecs.bodyH,
              aBaseY
            );
            if (a.knockY < aMinY) a.knockY = aMinY;
            a.group.position.set(a.x, a.knockY, a.z);
            a.group.rotation.set(a.knockPitch, a.heading, a.knockRoll);
          } else {
            a.group.position.set(a.x, aBaseY, a.z);
          }
        }
      }
    }

    // =========================================================================
    // D. STEP DYNAMIC AWAKE PARKED CARS (Sliding, Air-Hop, Rollover Tumble & Domino Hits!)
    // =========================================================================
    for (let i = 0; i < parkedCars.length; i++) {
      const p = parkedCars[i];
      if (p.sleeping) continue;

      const pSpecs = getVehicleRollSpecs(p.archetype);
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.heading += p.yawVel * dt;

      // Vertical ballistic gravity & 3D roll/pitch integration
      p.vy -= 21.0 * dt;
      p.y += p.vy * dt;
      p.roll += p.rollVel * dt;
      p.pitch = THREE.MathUtils.clamp(p.pitch + p.pitchVel * dt, -0.55, 0.55);

      const pBaseFloorY = getVehicleBaseFloorY(p.x, p.z);
      const pFloorY = computeRollFloorY(
        p.roll,
        p.pitch,
        pSpecs.boundHalfW,
        pSpecs.boundHalfL,
        pSpecs.bodyH,
        pBaseFloorY
      );
      const pGrounded = p.y <= pFloorY + 0.03;

      if (p.y <= pFloorY) {
        p.y = pFloorY;
        if (p.vy < -2.2) {
          const slam = -p.vy;
          p.vy = slam * 0.25;
          p.rollVel *= 0.78;
          p.pitchVel *= 0.55;
        } else {
          p.vy = 0;
        }
      }

      const pOverturned = Math.abs(Math.sin(p.roll)) > 0.42 || Math.cos(p.roll) < 0.55;
      const groundDrag = !pGrounded
        ? Math.exp(-0.38 * dt)
        : pOverturned
        ? Math.exp(-3.35 * dt)
        : Math.exp(-2.85 * dt);
      p.vx *= groundDrag;
      p.vz *= groundDrag;
      p.yawVel *= Math.exp((pGrounded ? -3.2 : -0.7) * dt);

      p.pitchVel += (-p.pitch * 16.0 - p.pitchVel * 5.8) * dt;

      if (!p.tumbleActive) {
        p.rollVel += (-p.roll * 20.0 - p.rollVel * 5.5) * dt;
      } else if (pGrounded) {
        p.rollVel *= Math.exp(-1.55 * dt);
        if (Math.abs(p.rollVel) < 3.4) {
          const nearestFace = Math.round(p.roll / (Math.PI * 0.5)) * (Math.PI * 0.5);
          const faceErr = nearestFace - p.roll;
          p.rollVel += (faceErr * 15.0 - p.rollVel * 4.5) * dt;
        }
      } else {
        p.rollVel *= Math.exp(-0.22 * dt);
      }

      // Bounce off buildings / poles / curbs
      const wallHit = collisionWorld.resolveCircle(p.x, p.z, Math.max(p.halfW, 1.15));
      if (wallHit.hit) {
        p.x = wallHit.x;
        p.z = wallHit.z;
        const vn = p.vx * wallHit.nx + p.vz * wallHit.nz;
        if (vn < 0) {
          p.vx -= wallHit.nx * vn * 1.42;
          p.vz -= wallHit.nz * vn * 1.42;
          p.yawVel += vn * 0.16;
        }
      }

      // Domino chain collision into neighboring parked cars!
      for (let j = 0; j < parkedCars.length; j++) {
        if (i === j) continue;
        const q = parkedCars[j];
        const minR = p.halfW + q.halfW + 0.55;
        const dx = p.x - q.x;
        const dz = p.z - q.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < minR * minR && d2 > 1e-4) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const nz = dz / d;
          const pen = minR - d;
          const invP = 1 / p.mass;
          const invQ = 1 / q.mass;
          const invS = invP + invQ;
          p.x += nx * pen * (invP / invS);
          p.z += nz * pen * (invP / invS);
          q.x -= nx * pen * (invQ / invS);
          q.z -= nz * pen * (invQ / invS);
          q.sleeping = false;

          const rvn = (p.vx - q.vx) * nx + (p.vz - q.vz) * nz;
          if (rvn < 0) {
            const jImp = (-(1 + 0.34) * rvn) / invS;
            p.vx += nx * jImp * invP;
            p.vz += nz * jImp * invP;
            q.vx -= nx * jImp * invQ;
            q.vz -= nz * jImp * invQ;
            q.yawVel += (Math.random() - 0.5) * Math.min(2.5, Math.abs(rvn) * 0.2);
          }
          const qSpecs = getVehicleRollSpecs(q.archetype);
          const qFloorY = computeRollFloorY(
            q.roll,
            q.pitch,
            qSpecs.boundHalfW,
            qSpecs.boundHalfL,
            qSpecs.bodyH,
            getVehicleBaseFloorY(q.x, q.z)
          );
          if (q.y < qFloorY) q.y = qFloorY;
          q.group.position.set(q.x, q.y, q.z);
          q.group.rotation.set(q.pitch, q.heading, q.roll);
        }
      }

      const finalPBaseY = getVehicleBaseFloorY(p.x, p.z);
      const finalPFloorY = computeRollFloorY(
        p.roll,
        p.pitch,
        pSpecs.boundHalfW,
        pSpecs.boundHalfL,
        pSpecs.bodyH,
        finalPBaseY
      );
      if (p.y < finalPFloorY) p.y = finalPFloorY;
      p.group.position.set(p.x, p.y, p.z);
      p.group.rotation.set(p.pitch, p.heading, p.roll);

      const spd2 = p.vx * p.vx + p.vz * p.vz;
      const nearestRestRoll = p.tumbleActive
        ? Math.round(p.roll / (Math.PI * 0.5)) * (Math.PI * 0.5)
        : 0;
      if (
        spd2 < 0.008 &&
        Math.abs(p.yawVel) < 0.05 &&
        pGrounded &&
        Math.abs(p.vy) < 0.06 &&
        Math.abs(p.pitch) < 0.02 &&
        Math.abs(p.pitchVel) < 0.05 &&
        Math.abs(p.rollVel) < 0.06 &&
        Math.abs(p.roll - nearestRestRoll) < 0.03
      ) {
        p.vx = 0;
        p.vz = 0;
        p.vy = 0;
        p.yawVel = 0;
        p.pitch = 0;
        p.pitchVel = 0;
        p.roll = nearestRestRoll;
        p.rollVel = 0;
        p.y = computeRollFloorY(
          p.roll,
          0,
          pSpecs.boundHalfW,
          pSpecs.boundHalfL,
          pSpecs.bodyH,
          finalPBaseY
        );
        p.group.position.set(p.x, p.y, p.z);
        p.group.rotation.set(0, p.heading, p.roll);
        p.sleeping = true;
      }
    }

    for (let k = 0; k < 5; k++) {
      const idx = nearestIds[k];
      const pl = trafficGlowLights[k];
      if (idx >= 0) {
        const a = agents[idx];
        const fx = Math.sin(a.heading);
        const fz = Math.cos(a.heading);
        pl.position.set(a.x + fx * (a.halfL + 1.8), 1.45, a.z + fz * (a.halfL + 1.8));
        if (a.archetype === 'bus') {
          pl.color.setHex(0x88e0ff);
          pl.intensity = 6.0 * (0.4 + nightFactor * 0.6);
        } else if (a.archetype === 'taxi') {
          pl.color.setHex(0xffd488);
          pl.intensity = 4.4 * (0.4 + nightFactor * 0.6);
        } else {
          pl.color.setHex(0xd4e8ff);
          pl.intensity = 4.8 * (0.4 + nightFactor * 0.6);
        }
      } else {
        pl.intensity = 0;
      }
    }
  };

  // =========================================================================
  // EXACT 2-CIRCLE-VS-ROTATED-OBB COLLISION + REAL 2D MOMENTUM TRANSFER!
  // Resolves player against BOTH active traffic/buses AND dynamic movable parked cars!
  // =========================================================================
  const resolvePlayerTrafficCollision = (
    px: number,
    pz: number,
    playerHeading: number,
    playerVx: number,
    playerVz: number
  ): TrafficCollisionResult => {
    let hit = false;
    let totalPushX = 0;
    let totalPushZ = 0;
    let outNx = 0;
    let outNz = 0;
    let outDvx = 0;
    let outDvz = 0;
    let maxImpactSpeed = 0;
    let outOtherMass = 1.25;
    let outOtherSpeed = 0;
    let outOtherVx = 0;
    let outOtherVz = 0;
    let outCornerFactor = 0;
    let outHitFront = true;
    let outIsParked = false;

    // Player car 2-circle hull (front bumper + rear bumper along hero car forward (-sin, -cos))
    const pFwdX = -Math.sin(playerHeading);
    const pFwdZ = -Math.cos(playerHeading);
    const pCircleR = 1.08;
    const mPlayer = 1.2;
    const invMPlayer = 1 / mPlayer;

    const pCirclesX0 = px + pFwdX * 1.25;
    const pCirclesZ0 = pz + pFwdZ * 1.25;
    const pCirclesX1 = px - pFwdX * 1.25;
    const pCirclesZ1 = pz - pFwdZ * 1.25;

    const testAgainstObb = (
      vx: number,
      vz: number,
      vHeading: number,
      vHalfW: number,
      vHalfL: number
    ) => {
      const sinH = Math.sin(vHeading);
      const cosH = Math.cos(vHeading);
      let bestPen = 0;
      let bestNx = 0;
      let bestNz = 0;
      let bestHitX = px;
      let bestHitZ = pz;
      let bestCorner = 0;
      let bestFront = true;

      for (let c = 0; c < 2; c++) {
        const cx = c === 0 ? pCirclesX0 : pCirclesX1;
        const cz = c === 0 ? pCirclesZ0 : pCirclesZ1;
        const rx = cx - vx;
        const rz = cz - vz;

        const lx = rx * cosH - rz * sinH; // local right
        const lz = rx * sinH + rz * cosH; // local forward

        const clampedX = Math.max(-vHalfW, Math.min(vHalfW, lx));
        const clampedZ = Math.max(-vHalfL, Math.min(vHalfL, lz));
        const diffX = lx - clampedX;
        const diffZ = lz - clampedZ;
        const dist2 = diffX * diffX + diffZ * diffZ;

        if (dist2 < pCircleR * pCircleR) {
          let lnx = 0;
          let lnz = 0;
          let pen = 0;
          if (dist2 > 1e-6) {
            const d = Math.sqrt(dist2);
            lnx = diffX / d;
            lnz = diffZ / d;
            pen = pCircleR - d;
          } else {
            const penX = vHalfW - Math.abs(lx);
            const penZ = vHalfL - Math.abs(lz);
            if (penX < penZ) {
              lnx = lx >= 0 ? 1 : -1;
              pen = penX + pCircleR;
            } else {
              lnz = lz >= 0 ? 1 : -1;
              pen = penZ + pCircleR;
            }
          }
          if (pen > bestPen) {
            bestPen = pen;
            bestNx = lnx * cosH + lnz * sinH;
            bestNz = -lnx * sinH + lnz * cosH;
            bestHitX = cx;
            bestHitZ = cz;
            bestCorner = Math.min(
              1,
              (Math.abs(clampedX) / Math.max(0.2, vHalfW)) *
                (Math.abs(clampedZ) / Math.max(0.2, vHalfL)) *
                1.18
            );
            bestFront = c === 0;
          }
        }
      }
      return { bestPen, bestNx, bestNz, bestHitX, bestHitZ, bestCorner, bestFront };
    };

    // 1. Test against active moving traffic vehicles & buses
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const broadR = a.halfL + 3.4;
      const bdx = px - a.x;
      const bdz = pz - a.z;
      if (bdx * bdx + bdz * bdz > broadR * broadR) continue;

      const res = testAgainstObb(a.x, a.z, a.heading, a.halfW, a.halfL);
      if (res.bestPen > 0) {
        hit = true;
        const invMAgent = 1 / a.mass;
        const invSum = invMPlayer + invMAgent;
        const sepTotal = res.bestPen + 0.06;

        totalPushX += res.bestNx * sepTotal * (invMPlayer / invSum);
        totalPushZ += res.bestNz * sepTotal * (invMPlayer / invSum);
        a.x -= res.bestNx * sepTotal * (invMAgent / invSum);
        a.z -= res.bestNz * sepTotal * (invMAgent / invSum);

        const aVx = a.knockTimer > 0 || a.tumbleActive ? a.knockVx : Math.sin(a.heading) * a.speed;
        const aVz = a.knockTimer > 0 || a.tumbleActive ? a.knockVz : Math.cos(a.heading) * a.speed;
        const aSpd = Math.hypot(aVx, aVz);

        const relVx = playerVx - aVx;
        const relVz = playerVz - aVz;
        const relVn = relVx * res.bestNx + relVz * res.bestNz;

        if (relVn < 0) {
          const closingSpeed = -relVn;
          if (closingSpeed >= maxImpactSpeed) {
            maxImpactSpeed = closingSpeed;
            outNx = res.bestNx;
            outNz = res.bestNz;
            outOtherMass = a.mass;
            outOtherSpeed = aSpd;
            outOtherVx = aVx;
            outOtherVz = aVz;
            outCornerFactor = res.bestCorner;
            outHitFront = res.bestFront;
            outIsParked = false;
          }

          const e = a.mass >= 4.5 ? 0.48 : 0.42;
          const jImpulse = (-(1 + e) * relVn) / invSum;

          outDvx += res.bestNx * (jImpulse * invMPlayer);
          outDvz += res.bestNz * (jImpulse * invMPlayer);

          const newAVx = aVx - res.bestNx * (jImpulse * invMAgent);
          const newAVz = aVz - res.bestNz * (jImpulse * invMAgent);

          const armX = res.bestHitX - a.x;
          const armZ = res.bestHitZ - a.z;
          const torque = (armX * (-res.bestNz) - armZ * (-res.bestNx)) * jImpulse * invMAgent;

          if (closingSpeed > 2.2) {
            a.knockVx = newAVx;
            a.knockVz = newAVz;
            a.knockYawVel = THREE.MathUtils.clamp(a.knockYawVel + torque * 0.24, -6.5, 6.5);
            a.knockPitchVel = THREE.MathUtils.clamp(
              a.knockPitchVel + (res.bestFront ? 1 : -1) * closingSpeed * 0.045,
              -2.2,
              2.2
            );

            // Multi-factor conditional rollover / tumble evaluation:
            // Requires high closing speed + clean broadside/oblique alignment + tall CG (trucks/vans/buses/SUVs) + moving tire-trip momentum!
            const specs = getVehicleRollSpecs(a.archetype);
            const cosH = Math.cos(a.heading);
            const sinH = Math.sin(a.heading);
            const sideDot = res.bestNx * cosH - res.bestNz * sinH; // local X normal [-1..1]
            const absSide = Math.abs(sideDot);
            const rollSign = sideDot >= 0 ? 1 : -1; // rolls top AWAY from the impacting car
            const movingTripBonus = 1.0 + Math.min(0.68, aSpd / 16.5);
            const strikeScore = closingSpeed * absSide * specs.cgFactor * movingTripBonus;

            const broadsideTumble = absSide >= 0.46 && closingSpeed >= 14.5 && strikeScore >= 27.5;
            const obliqueCornerFlip =
              res.bestCorner > 0.78 && closingSpeed >= 30.5 && specs.cgFactor >= 0.95 && absSide >= 0.34;

            if (broadsideTumble || obliqueCornerFlip) {
              const excess = Math.max(0, strikeScore - 27.5);
              a.tumbleActive = true;
              a.tumbleHoldTimer = Math.max(a.tumbleHoldTimer, 5.8);
              // Give a realistic lateral shove so heavy trucks carry sideways into their barrel roll!
              const lateralCarry = THREE.MathUtils.clamp(2.4 + excess * 0.16, 2.4, 7.5);
              a.knockVx -= res.bestNx * lateralCarry;
              a.knockVz -= res.bestNz * lateralCarry;
              a.knockRollVel += rollSign * THREE.MathUtils.clamp(2.85 + excess * 0.21, 2.85, 8.2);
              a.knockVy = Math.max(a.knockVy, THREE.MathUtils.clamp(2.4 + excess * 0.19, 2.4, 7.4));
              a.knockPitchVel = THREE.MathUtils.clamp(
                a.knockPitchVel + (res.bestFront ? 1 : -1) * THREE.MathUtils.clamp(0.45 + excess * 0.055, 0.45, 2.0),
                -2.6,
                2.6
              );
              a.knockTimer = Math.max(a.knockTimer, Math.min(6.4, 3.2 + excess * 0.14));
            } else if (absSide >= 0.44 && strikeScore >= 17.0) {
              // Dramatic near-threshold two-wheel heel (~22°–34°) that hangs briefly & slams back onto suspension!
              a.knockRollVel += rollSign * THREE.MathUtils.clamp((strikeScore - 15.5) * 0.17, 0.85, 2.25);
              a.knockVy = Math.max(a.knockVy, THREE.MathUtils.clamp((strikeScore - 16.0) * 0.13, 0.65, 1.85));
              a.knockTimer = Math.max(a.knockTimer, Math.min(4.0, 1.7 + closingSpeed * 0.08));
            } else {
              a.knockTimer = Math.max(a.knockTimer, Math.min(3.8, 1.4 + closingSpeed * 0.08));
            }

            a.speed = 0;
            const hitFloorY = computeRollFloorY(
              a.knockRoll,
              a.knockPitch,
              specs.boundHalfW,
              specs.boundHalfL,
              specs.bodyH,
              getVehicleBaseFloorY(a.x, a.z)
            );
            if (a.knockY < hitFloorY) a.knockY = hitFloorY;
            a.group.position.set(a.x, a.knockY, a.z);
            a.group.rotation.set(a.knockPitch, a.heading, a.knockRoll);
          } else {
            a.speed = 0;
            a.dwellTimer = Math.max(a.dwellTimer, 1.0);
          }
        } else if (maxImpactSpeed === 0) {
          outNx = res.bestNx;
          outNz = res.bestNz;
          outOtherMass = a.mass;
          outOtherSpeed = aSpd;
          outOtherVx = aVx;
          outOtherVz = aVz;
          outCornerFactor = res.bestCorner;
          outHitFront = res.bestFront;
          outIsParked = false;
        }
      }
    }

    // 2. Test against dynamic movable parked cars!
    for (let i = 0; i < parkedCars.length; i++) {
      const p = parkedCars[i];
      const broadR = p.halfL + 3.2;
      const bdx = px - p.x;
      const bdz = pz - p.z;
      if (bdx * bdx + bdz * bdz > broadR * broadR) continue;

      const res = testAgainstObb(p.x, p.z, p.heading, p.halfW, p.halfL);
      if (res.bestPen > 0) {
        hit = true;
        const invMP = 1 / p.mass;
        const invSum = invMPlayer + invMP;
        const sepTotal = res.bestPen + 0.06;

        totalPushX += res.bestNx * sepTotal * (invMPlayer / invSum);
        totalPushZ += res.bestNz * sepTotal * (invMPlayer / invSum);
        p.x -= res.bestNx * sepTotal * (invMP / invSum);
        p.z -= res.bestNz * sepTotal * (invMP / invSum);
        p.sleeping = false;

        const pSpd = Math.hypot(p.vx, p.vz);
        const relVx = playerVx - p.vx;
        const relVz = playerVz - p.vz;
        const relVn = relVx * res.bestNx + relVz * res.bestNz;

        if (relVn < 0) {
          const closingSpeed = -relVn;
          if (closingSpeed >= maxImpactSpeed) {
            maxImpactSpeed = closingSpeed;
            outNx = res.bestNx;
            outNz = res.bestNz;
            outOtherMass = p.mass;
            outOtherSpeed = pSpd;
            outOtherVx = p.vx;
            outOtherVz = p.vz;
            outCornerFactor = res.bestCorner;
            outHitFront = res.bestFront;
            outIsParked = true;
          }

          const e = 0.38;
          const jImpulse = (-(1 + e) * relVn) / invSum;

          outDvx += res.bestNx * (jImpulse * invMPlayer);
          outDvz += res.bestNz * (jImpulse * invMPlayer);

          // Launch, spin & conditionally rollover the parked car on brutal high-speed broadside hits!
          p.vx -= res.bestNx * (jImpulse * invMP);
          p.vz -= res.bestNz * (jImpulse * invMP);
          const armX = res.bestHitX - p.x;
          const armZ = res.bestHitZ - p.z;
          const torque = (armX * (-res.bestNz) - armZ * (-res.bestNx)) * jImpulse * invMP;
          p.yawVel = THREE.MathUtils.clamp(p.yawVel + torque * 0.3, -7.5, 7.5);
          p.pitchVel = THREE.MathUtils.clamp(p.pitchVel + closingSpeed * 0.055, -2.2, 2.2);

          const pSpecs = getVehicleRollSpecs(p.archetype);
          const pCosH = Math.cos(p.heading);
          const pSinH = Math.sin(p.heading);
          const pSideDot = res.bestNx * pCosH - res.bestNz * pSinH;
          const pAbsSide = Math.abs(pSideDot);
          const pRollSign = pSideDot >= 0 ? 1 : -1;
          const pStrikeScore = closingSpeed * pAbsSide * pSpecs.cgFactor;

          if (pAbsSide >= 0.48 && closingSpeed >= 18.0 && pStrikeScore >= 24.5) {
            const excess = pStrikeScore - 24.5;
            p.tumbleActive = true;
            p.rollVel += pRollSign * THREE.MathUtils.clamp(2.9 + excess * 0.22, 2.9, 8.0);
            p.vy = Math.max(p.vy, THREE.MathUtils.clamp(2.5 + excess * 0.18, 2.5, 7.0));
          } else if (pAbsSide >= 0.45 && pStrikeScore >= 15.5) {
            p.rollVel += pRollSign * THREE.MathUtils.clamp((pStrikeScore - 14.0) * 0.17, 0.8, 2.1);
            p.vy = Math.max(p.vy, Math.min(2.2, 0.9 + (pStrikeScore - 15.5) * 0.12));
          } else if (closingSpeed > 8.5) {
            p.vy = Math.max(p.vy, Math.min(4.6, (closingSpeed - 7.5) * 0.22));
          }
        } else if (maxImpactSpeed === 0) {
          outNx = res.bestNx;
          outNz = res.bestNz;
          outOtherMass = p.mass;
          outOtherSpeed = pSpd;
          outOtherVx = p.vx;
          outOtherVz = p.vz;
          outCornerFactor = res.bestCorner;
          outHitFront = res.bestFront;
          outIsParked = true;
        }
        const pSyncSpecs = getVehicleRollSpecs(p.archetype);
        const pSyncFloorY = computeRollFloorY(
          p.roll,
          p.pitch,
          pSyncSpecs.boundHalfW,
          pSyncSpecs.boundHalfL,
          pSyncSpecs.bodyH,
          getVehicleBaseFloorY(p.x, p.z)
        );
        if (p.y < pSyncFloorY) p.y = pSyncFloorY;
        p.group.position.set(p.x, p.y, p.z);
        p.group.rotation.set(p.pitch, p.heading, p.roll);
      }
    }

    return {
      hit,
      pushX: totalPushX,
      pushZ: totalPushZ,
      nx: outNx,
      nz: outNz,
      dvx: outDvx,
      dvz: outDvz,
      impactSpeed: maxImpactSpeed,
      otherMass: outOtherMass,
      otherSpeed: outOtherSpeed,
      otherVx: outOtherVx,
      otherVz: outOtherVz,
      cornerFactor: outCornerFactor,
      hitFront: outHitFront,
      isParked: outIsParked,
    };
  };

  return {
    root,
    agents,
    get sessionSeed() {
      return currentSeed;
    },
    reseed,
    update,
    resolvePlayerTrafficCollision,
    getBusStopArrivalFlags: () => busStopArrivalFlags,
    getArmoredTruckStates: () =>
      agents
        .filter((a) => a.archetype === 'armored_truck')
        .map((a) => ({
          id: a.id,
          x: a.x,
          y: a.group.position.y,
          z: a.z,
          heading: a.heading,
          speed: a.speed,
        })),
  };
}
