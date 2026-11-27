import * as THREE from 'three';
import {
  CollisionWorld,
  getTerrainHeight,
  isNearAnyRoad,
  METRO_DOOR_QUEUE_LANES,
  METRO_DOOR_STOP_LOCAL_ZS,
  METRO_LOOP_POINTS_3D,
  METRO_STATIONS,
  METRO_TRACK_HEIGHT,
  MetroStationSpec,
} from './mapData';
import { FpsRayTarget, TrainFrame } from './fpsBridge';
import { TextureLibrary } from './textures';
import {
  applyHumanPose,
  CommuterActivityType,
  createRiggedHuman,
  HumanRig,
} from './humanCharacter';
import {
  ArchipelagoCallbacks,
  InteriorRegistry,
} from './interiors/interiorRegistry';
import {
  buildStationComplex,
  StationNPCEntry,
} from './interiors/stationComplexBuilder';

export interface OperatedTrainState {
  active: boolean;
  speedKmh: number;
  doorsOpen: boolean;
  currentStation: string;
  nextStation: string;
  distToNextM: number;
  worldPos: THREE.Vector3;
  eyePos: THREE.Vector3;
  forwardDir: THREE.Vector3;
  seated: boolean;
  nearSeat: boolean;
  carIndex: number; // 1..3
  passengerCount: number;
}

export interface MetroStationRuntimeInfo {
  id: string;
  name: string;
  cyrillic: string;
  platWorldX: number;
  platWorldY: number;
  platWorldZ: number;
  streetX: number;
  streetZ: number;
  yaw: number;
}

export interface RiderControlResult {
  exitedToPlatform: boolean;
  exitWorldPos?: THREE.Vector3;
  exitYaw?: number;
  stationName?: string;
}

export interface WalkableStationInfo {
  onStation: boolean;
  floorY: number;
  underShelter: boolean;
  stationIdx: number;
  stationName: string;
  nearOpenTrainDoor: boolean;
}

export interface MetroSystemHandles {
  root: THREE.Group;
  update: (dt: number, elapsed: number, nightFactor: number) => void;
  updateRiderControls: (
    dt: number,
    walkFwd: number,
    walkStrafe: number,
    lookYawOffset: number,
    toggleSit: boolean
  ) => RiderControlResult;
  getNearestTrainStatus: (x: number, z: number) => string;
  setRiderMode: (active: boolean, playerX: number, playerZ: number) => void;
  getOperatedTrainState: () => OperatedTrainState;
  getTrainFrame: () => TrainFrame;
  getPlatformExitPoint: () => { pos: THREE.Vector3; yaw: number; stationName: string };
  getWalkableStationInfo: (worldX: number, worldZ: number) => WalkableStationInfo;
  getStationInfos: () => MetroStationRuntimeInfo[];
  getStationTrainFlags: () => boolean[];
  getRayTargets: (origin: THREE.Vector3, radiusM: number) => FpsRayTarget[];
  getActiveSubtitle: (x: number, y: number, z: number) => string;
}

interface MetroTrainState {
  group: THREE.Group;
  cars: THREE.Group[];
  t: number;
  speed: number; // spline u/s
  maxSpeed: number;
  dwellTimer: number;
  currentStationIdx: number;
  doorsOpen: boolean;
  headlightMat: THREE.MeshStandardMaterial;
  windowMat: THREE.MeshStandardMaterial;
  neonStripeMat: THREE.MeshStandardMaterial;
}

// Station commuters are now rendered by the PS2 articulated pedestrian system!

function createStationSignTexture(cyrillic: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a131f';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#00d4f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 88);

  ctx.fillStyle = '#ff2a3c';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('M', 22, 68);

  ctx.fillStyle = '#dcebfa';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(cyrillic, 88, 59);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWinterPerson(isWorker: boolean, coatHex: string): THREE.Group {
  const person = new THREE.Group();

  const bootsMat = new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.85 });
  const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.82 });
  const vestMat = new THREE.MeshStandardMaterial({
    color: '#d96212',
    emissive: new THREE.Color('#ff7b1a'),
    emissiveIntensity: 0.25,
    roughness: 0.55,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: '#c8a68e', roughness: 0.75 });
  const hatMat = new THREE.MeshStandardMaterial({
    color: isWorker ? '#d8a61e' : '#22262c',
    roughness: isWorker ? 0.38 : 0.85,
  });

  for (const lx of [-0.11, 0.11]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.78, 0.16), bootsMat);
    leg.position.set(lx, 0.39, 0);
    person.add(leg);
  }
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.26), coatMat);
  torso.position.y = 1.08;
  person.add(torso);

  if (isWorker) {
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.52, 0.29), vestMat);
    vest.position.y = 1.1;
    person.add(vest);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.51, 0.08, 0.31),
      new THREE.MeshStandardMaterial({
        color: '#e0ee9c',
        emissive: new THREE.Color('#c8e860'),
        emissiveIntensity: 0.45,
      })
    );
    stripe.position.y = 1.04;
    person.add(stripe);
  }

  for (const ax of [-0.3, 0.3]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.58, 0.14), coatMat);
    arm.position.set(ax, 1.06, 0);
    person.add(arm);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
  head.position.y = 1.56;
  person.add(head);

  const hat = new THREE.Mesh(
    isWorker
      ? new THREE.CylinderGeometry(0.15, 0.17, 0.12, 8)
      : new THREE.BoxGeometry(0.3, 0.16, 0.26),
    hatMat
  );
  hat.position.y = 1.67;
  person.add(hat);

  return person;
}

// Neo-Soviet Sleek Coastal Ring Metro Car (dark wet blue-steel hull + crisp cyan/magenta LED belt + warm windows)
function createMetroCarMesh(
  isLeadCar: boolean,
  isRearCar: boolean,
  windowMat: THREE.MeshStandardMaterial,
  headlightMat: THREE.MeshStandardMaterial,
  neonStripeMat: THREE.MeshStandardMaterial
): THREE.Group {
  const car = new THREE.Group();
  const len = 14.8;
  const w = 2.8;
  const h = 3.25;

  const lowerBlueMat = new THREE.MeshPhysicalMaterial({
    color: '#1b3854',
    roughness: 0.26,
    metalness: 0.62,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.95,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#2c3642',
    roughness: 0.4,
    metalness: 0.5,
  });
  const bogieMat = new THREE.MeshStandardMaterial({
    color: '#15181c',
    roughness: 0.82,
    metalness: 0.5,
  });

  // Sculpted curved aerodynamic beveled metro car hull (sloped futuristic nose on lead/rear cars!)
  const hullShape = new THREE.Shape();
  const halfL = len * 0.5;
  hullShape.moveTo(-halfL, 0.55);
  if (isRearCar) {
    hullShape.bezierCurveTo(-halfL - 0.5, 1.3, -halfL - 0.35, 2.9, -halfL + 0.55, h + 0.62);
  } else {
    hullShape.lineTo(-halfL, h + 0.62);
  }
  hullShape.lineTo(isLeadCar ? halfL - 0.65 : halfL, h + 0.62);
  if (isLeadCar) {
    hullShape.bezierCurveTo(halfL + 0.38, 3.0, halfL + 0.58, 1.4, halfL + 0.12, 0.55);
  } else {
    hullShape.lineTo(halfL, 0.55);
  }
  hullShape.lineTo(-halfL, 0.55);

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: w - 0.18,
    curveSegments: 12,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.1,
    bevelThickness: 0.1,
  });
  hullGeo.center();
  hullGeo.rotateY(-Math.PI * 0.5);

  const body = new THREE.Mesh(hullGeo, lowerBlueMat);
  body.position.y = h * 0.5 + 0.62;
  car.add(body);

  // Sleek illuminated futuristic transit accent stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.08, 0.2, len - 0.3),
    neonStripeMat
  );
  stripe.position.y = 1.82;
  car.add(stripe);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.82, 0.24, len * 0.88),
    roofMat
  );
  roof.position.y = h + 0.78;
  car.add(roof);

  for (let vz = -4.8; vz <= 4.8; vz += 3.2) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.9), bogieMat);
    vent.position.set(0, h + 1.04, vz);
    car.add(vent);
  }

  for (let wz = -5.4; wz <= 5.4; wz += 2.15) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 1.05, 1.55), windowMat);
    win.position.set(0, 2.78, wz);
    car.add(win);
  }

  for (const bz of [-4.6, 4.6]) {
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 2.4), bogieMat);
    bogie.position.set(0, 0.38, bz);
    car.add(bogie);
  }

  if (isLeadCar) {
    const frontWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.08), windowMat);
    frontWin.position.set(0, 2.78, len * 0.5 + 0.02);
    car.add(frontWin);

    for (const hx of [-0.84, 0.84]) {
      const hl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.1, 10),
        headlightMat
      );
      hl.rotation.x = Math.PI * 0.5;
      hl.position.set(hx, 1.55, len * 0.5 + 0.04);
      car.add(hl);
    }
  }
  if (isRearCar) {
    const tailMat = new THREE.MeshStandardMaterial({
      color: '#9c141a',
      emissive: new THREE.Color('#ff1c24'),
      emissiveIntensity: 1.85,
    });
    for (const hx of [-0.84, 0.84]) {
      const tl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.1, 10),
        tailMat
      );
      tl.rotation.x = Math.PI * 0.5;
      tl.position.set(hx, 1.55, -len * 0.5 - 0.04);
      car.add(tl);
    }
  }

  return car;
}

export function buildMetroSystem(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld,
  registry?: InteriorRegistry,
  callbacks?: ArchipelagoCallbacks
): MetroSystemHandles {
  const root = new THREE.Group();

  // Closed 3D Grand Archipelago Underground-to-Surface Subway Spline (+6.5m/+9.2m viaducts -> -9.5m tunnels!)
  const splinePts = METRO_LOOP_POINTS_3D.map(
    (p) => new THREE.Vector3(p.x, p.y, p.z)
  );
  const trackCurve = new THREE.CatmullRomCurve3(splinePts, true, 'catmullrom', 0.35);
  const trackTotalLenM = trackCurve.getLength();
  const trackSamples = 420;

  // =========================================================================
  // 1. PERIMETER ELEVATED CONCRETE VIADUCT, RAILS & ROAD-SAFE SUPPORT PIERS
  // =========================================================================
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.15,
    color: '#4c545e',
    roughness: 0.72,
  });
  const railSteelMat = new THREE.MeshStandardMaterial({
    color: '#46505a',
    roughness: 0.28,
    metalness: 0.85,
  });
  const viaductNeonMat = new THREE.MeshStandardMaterial({
    color: '#5ec8e8',
    emissive: new THREE.Color('#00c8ee'),
    emissiveIntensity: 1.25,
  });

  const deckHalfW = 2.65;
  const deckPositions: number[] = [];
  const deckNormals: number[] = [];
  const deckIndices: number[] = [];
  const railPositions: number[] = [];
  const railIndices: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3();
  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();

  for (let i = 0; i <= trackSamples; i++) {
    const u = (i % trackSamples) / trackSamples;
    trackCurve.getPointAt(u, pt);
    trackCurve.getTangentAt(u, tan).normalize();
    right.crossVectors(tan, up).normalize();

    deckPositions.push(
      pt.x - right.x * deckHalfW,
      pt.y - 0.2,
      pt.z - right.z * deckHalfW
    );
    deckPositions.push(
      pt.x + right.x * deckHalfW,
      pt.y - 0.2,
      pt.z + right.z * deckHalfW
    );
    deckNormals.push(0, 1, 0, 0, 1, 0);

    railPositions.push(pt.x - right.x * 0.9, pt.y + 0.04, pt.z - right.z * 0.9);
    railPositions.push(pt.x + right.x * 0.9, pt.y + 0.04, pt.z + right.z * 0.9);

    if (i < trackSamples) {
      const b = i * 2;
      deckIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      railIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const deckGeo = new THREE.BufferGeometry();
  deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(deckPositions, 3));
  deckGeo.setAttribute('normal', new THREE.Float32BufferAttribute(deckNormals, 3));
  deckGeo.setIndex(deckIndices);
  const deckMesh = new THREE.Mesh(deckGeo, concreteMat);
  deckMesh.receiveShadow = true;
  root.add(deckMesh);

  const girderGeo = new THREE.TubeGeometry(trackCurve, 220, 1.15, 6, true);
  const girderMesh = new THREE.Mesh(girderGeo, concreteMat);
  girderMesh.position.y = -1.15;
  root.add(girderMesh);

  const neonGuideGeo = new THREE.TubeGeometry(trackCurve, 220, 0.11, 4, true);
  const neonGuide = new THREE.Mesh(neonGuideGeo, viaductNeonMat);
  neonGuide.position.y = -0.35;
  root.add(neonGuide);

  const railGeo = new THREE.BufferGeometry();
  railGeo.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
  railGeo.setIndex(railIndices);
  railGeo.computeVertexNormals();
  root.add(new THREE.Mesh(railGeo, railSteelMat));

  // Road-safe viaduct support piers (ONLY on elevated above-ground viaduct sections, skipping Gate 12 bridge mid-span!)
  const validPierTransforms: { x: number; y: number; z: number; rotY: number; h: number }[] = [];
  const candidatePiers = 128;
  for (let i = 0; i < candidatePiers; i++) {
    const u = i / candidatePiers;
    trackCurve.getPointAt(u, pt);
    trackCurve.getTangentAt(u, tan);
    if (pt.y < 2.2) continue;
    if (pt.x > 525 && pt.x < 945 && Math.abs(pt.z - 102) < 24) continue;
    if (isNearAnyRoad(pt.x, pt.z, 6.5)) continue;
    const gY = Math.min(0, getTerrainHeight(pt.x, pt.z));
    const h = Math.max(2.5, pt.y - gY + 1.5);
    validPierTransforms.push({ x: pt.x, y: pt.y, z: pt.z, rotY: Math.atan2(tan.x, tan.z), h });
  }

  const pierInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.85, 1.0, 1.85),
    concreteMat,
    Math.max(1, validPierTransforms.length)
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < validPierTransforms.length; i++) {
    const vp = validPierTransforms[i];
    dummy.position.set(vp.x, vp.y - vp.h * 0.5 - 0.6, vp.z);
    dummy.rotation.set(0, vp.rotY, 0);
    dummy.scale.set(1, vp.h, 1);
    dummy.updateMatrix();
    pierInst.setMatrixAt(i, dummy.matrix);
    if (vp.y < 14) collisionWorld.addBox(vp.x, vp.z, 2.0, 2.0, vp.rotY);
  }
  pierInst.instanceMatrix.needsUpdate = true;
  pierInst.computeBoundingSphere();
  root.add(pierInst);

  // =========================================================================
  // 1B. LIT UNDERGROUND CONCRETE SUBWAY TUNNEL RIBS, CEILING STRIPS & PORTAL ARCHES!
  // =========================================================================
  const tunnelRingMats = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.08,
    color: '#3c434d',
    roughness: 0.88,
  });
  const tunnelBeaconMat = new THREE.MeshStandardMaterial({
    color: '#ff2436',
    emissive: new THREE.Color('#ff1e2d'),
    emissiveIntensity: 2.0,
    roughness: 0.25,
  });

  const tunnelSamples: { x: number; y: number; z: number; yaw: number; pitch: number; isPortal: boolean }[] = [];
  const totalTunnelCheck = 260;
  let prevUnderground = false;
  for (let i = 0; i < totalTunnelCheck; i++) {
    const u = i / totalTunnelCheck;
    trackCurve.getPointAt(u, pt);
    trackCurve.getTangentAt(u, tan).normalize();
    const under = pt.y < 1.1;
    const isPortal = under !== prevUnderground;
    if (under || isPortal) {
      const yaw = Math.atan2(tan.x, tan.z);
      const pitch = -Math.asin(THREE.MathUtils.clamp(tan.y, -0.5, 0.5));
      tunnelSamples.push({ x: pt.x, y: pt.y, z: pt.z, yaw, pitch, isPortal });
    }
    prevUnderground = under;
  }

  if (tunnelSamples.length > 0) {
    const archGeo = new THREE.TorusGeometry(4.45, 0.58, 6, 12, Math.PI);
    const tunnelArchInst = new THREE.InstancedMesh(archGeo, tunnelRingMats, tunnelSamples.length);
    const tunnelLampInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.45, 0.18, 1.4),
      tunnelBeaconMat,
      tunnelSamples.length
    );
    for (let i = 0; i < tunnelSamples.length; i++) {
      const ts = tunnelSamples[i];
      dummy.position.set(ts.x, ts.y + 0.5, ts.z);
      dummy.rotation.set(ts.pitch, ts.yaw, 0);
      const s = ts.isPortal ? 1.25 : 1.0;
      dummy.scale.set(s, s, ts.isPortal ? 2.6 : 1.8);
      dummy.updateMatrix();
      tunnelArchInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(ts.x, ts.y + 4.45, ts.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tunnelLampInst.setMatrixAt(i, dummy.matrix);
    }
    tunnelArchInst.instanceMatrix.needsUpdate = true;
    tunnelLampInst.instanceMatrix.needsUpdate = true;
    root.add(tunnelArchInst, tunnelLampInst);
  }

  // =========================================================================
  // 2. EIGHT COMPLEX MULTI-ZONE TRAIN STATIONS (STN-1..STN-8, 36m x 24m)
  //    Warm Coffered Platforms + Enterable Coffee Areas (КАФЕ) & Waiting Halls!
  // =========================================================================
  const stationPositions: {
    spec: MetroStationSpec;
    u: number;
    pos: THREE.Vector3;
    tan: THREE.Vector3;
  }[] = [];
  const stationInfos: MetroStationRuntimeInfo[] = [];
  const stationHasTrainFlags: boolean[] = METRO_STATIONS.map(() => false);
  const stationLightMats: THREE.MeshStandardMaterial[] = [];
  const complexStationNpcs: StationNPCEntry[] = [];

  interface StationRiggedActor {
    rig: HumanRig;
    stationIdx: number;
    role: 'booth_worker' | 'platform_guard' | 'platform_bench' | 'platform_waiter';
    baseX: number;
    baseZ: number;
    curX: number;
    curZ: number;
    phase: number;
    personality: 'polite' | 'rude';
    rudeCooldown: number;
    upsetTimer: number;
    upsetLookYaw: number;
    sidestepYaw: number;
    targetSidestep: number;
    nodTimer: number;
    nodCooldown: number;
    bumpX: number;
    bumpZ: number;
    mutterText: string;
  }
  const stationActors: StationRiggedActor[] = [];

  const canopyMat = new THREE.MeshStandardMaterial({
    color: '#1e2732',
    roughness: 0.34,
    metalness: 0.62,
  });
  const archBrassMat = new THREE.MeshStandardMaterial({
    color: '#b89458',
    roughness: 0.34,
    metalness: 0.72,
  });
  const marbleColumnMat = new THREE.MeshStandardMaterial({
    color: '#c9c4ba',
    map: textures.metroWallMap,
    roughness: 0.32,
    metalness: 0.14,
  });
  const stationFloorMat = new THREE.MeshStandardMaterial({
    color: '#343b44',
    map: textures.metroFloorMap,
    roughnessMap: textures.metroFloorRoughness,
    roughness: 0.52,
    metalness: 0.18,
  });
  const benchWoodMat = new THREE.MeshStandardMaterial({
    color: '#5a3b26',
    roughness: 0.58,
    metalness: 0.08,
  });
  const glassScreenMat = new THREE.MeshPhysicalMaterial({
    color: '#1f364a',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const redMetroSignMat = new THREE.MeshStandardMaterial({
    color: '#b81d22',
    emissive: new THREE.Color('#ff2e38'),
    emissiveIntensity: 1.5,
    roughness: 0.3,
  });
  const boothScreenMat = new THREE.MeshStandardMaterial({
    color: '#7dd3fc',
    emissive: new THREE.Color('#38bdf8'),
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });
  const warmLampMat = new THREE.MeshStandardMaterial({
    color: '#fff3da',
    emissive: new THREE.Color('#ffd38c'),
    emissiveIntensity: 1.55,
    roughness: 0.25,
  });
  stationLightMats.push(warmLampMat);

  for (let sIdx = 0; sIdx < METRO_STATIONS.length; sIdx++) {
    const st = METRO_STATIONS[sIdx];
    let bestU = 0;
    let bestD2 = Infinity;
    for (let k = 0; k < 500; k++) {
      const u = k / 500;
      trackCurve.getPointAt(u, pt);
      const d2 = (pt.x - st.x) * (pt.x - st.x) + (pt.z - st.z) * (pt.z - st.z);
      if (d2 < bestD2) {
        bestD2 = d2;
        bestU = u;
      }
    }
    const sPos = trackCurve.getPointAt(bestU);
    const sTan = trackCurve.getTangentAt(bestU).normalize();
    stationPositions.push({ spec: st, u: bestU, pos: sPos, tan: sTan });

    const stGroup = new THREE.Group();
    stGroup.position.copy(sPos);
    stGroup.rotation.y = Math.atan2(sTan.x, sTan.z);

    const sideSign = -1;
    const platLen = 52;

    // Polished terrazzo/granite elevated platform deck (surface sits cleanly at y = +0.36)
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.92, platLen),
      stationFloorMat
    );
    platform.position.set(sideSign * 5.2, -0.1, 0);
    stGroup.add(platform);

    // Tactile amber-gold safety edge tiles along the track edge
    const safetyStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.94, platLen),
      new THREE.MeshStandardMaterial({ color: '#e0ad26', roughness: 0.52 })
    );
    safetyStrip.position.set(sideSign * 2.15, -0.09, 0);
    stGroup.add(safetyStrip);

    // Spec 5: Marked platform queue lanes flanking train doors (leaving central exit corridor clear!)
    const queuePaintMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: new THREE.Color('#0c4a6e'),
      emissiveIntensity: 0.35,
      roughness: 0.5,
    });
    for (let d = 0; d < METRO_DOOR_STOP_LOCAL_ZS.length; d++) {
      const dz = METRO_DOOR_STOP_LOCAL_ZS[d];
      for (const qOff of [-1.05, 1.05]) {
        const lineZ = dz + qOff;
        if (Math.abs(lineZ) > platLen * 0.47) continue;
        const laneStrip = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 0.012, 0.08),
          queuePaintMat
        );
        laneStrip.position.set(sideSign * 3.45, 0.366, lineZ);
        stGroup.add(laneStrip);
      }
    }

    // Rear panoramic glass-and-brass architectural windbreak wall along the back of platform
    const backWallLower = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.15, platLen * 0.96), marbleColumnMat);
    backWallLower.position.set(sideSign * 8.35, 0.94, 0);
    stGroup.add(backWallLower);
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.75, platLen * 0.94), glassScreenMat);
    backGlass.position.set(sideSign * 8.35, 2.85, 0);
    stGroup.add(backGlass);

    // Vaulted coffered modernist canopy roof with curved brass architectural ribs & warm cove lighting!
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(7.6, 0.36, platLen * 0.96),
      canopyMat
    );
    canopy.position.set(sideSign * 5.1, 4.45, 0);
    stGroup.add(canopy);

    // Recessed warm golden cove ceiling panels + cool transit linear strip
    const stripLightMat = new THREE.MeshStandardMaterial({
      color: '#f5ead6',
      emissive: new THREE.Color('#ffdba4'),
      emissiveIntensity: 1.45,
    });
    stationLightMats.push(stripLightMat);
    for (const lx of [-3.6, -6.5]) {
      const lightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.08, platLen * 0.86),
        stripLightMat
      );
      lightBar.position.set(lx, 4.24, 0);
      stGroup.add(lightBar);
    }

    // Fluted neoclassical marble-and-brass station columns + arched ceiling ribs + warm globe sconces!
    for (let cz = -20; cz <= 20; cz += 8.0) {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 4.05, 12),
        marbleColumnMat
      );
      col.position.set(sideSign * 7.4, 2.38, cz);
      stGroup.add(col);

      const capRing = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.24, 12), archBrassMat);
      capRing.position.set(sideSign * 7.4, 4.22, cz);
      stGroup.add(capRing);

      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.28, 12), archBrassMat);
      baseRing.position.set(sideSign * 7.4, 0.5, cz);
      stGroup.add(baseRing);

      // Curved overhead brass arch rib spanning across the platform ceiling
      const rib = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.16, 0.22), archBrassMat);
      rib.position.set(sideSign * 5.0, 4.24, cz);
      stGroup.add(rib);

      // Warm glowing station pendant globe hanging from each arch rib
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), warmLampMat);
      globe.position.set(sideSign * 4.8, 3.92, cz);
      stGroup.add(globe);
    }

    // Warm station hall architectural fill light (so riders looking out at stations see warm, vivid interiors!)
    const hallLight = new THREE.PointLight('#ffe2b8', 7.5, 32, 1.5);
    hallLight.position.set(sideSign * 5.0, 3.6, 0);
    stGroup.add(hallLight);

    // Sculpted Hardwood & Brass Waiting Benches along the platform!
    for (const bz of [-12.5, 12.5]) {
      const bSeat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 3.8), benchWoodMat);
      bSeat.position.set(sideSign * 6.45, 0.84, bz);
      stGroup.add(bSeat);
      const bBack = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 3.8), benchWoodMat);
      bBack.position.set(sideSign * 6.76, 1.12, bz);
      stGroup.add(bBack);
      for (const lz of [-1.45, 1.45]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 8), archBrassMat);
        leg.position.set(sideSign * 6.45, 0.58, bz + lz);
        stGroup.add(leg);
      }
    }

    // Illuminated Glass Station Control / Attendant Booth right on the platform (z = -2.2)!
    const boothGroup = new THREE.Group();
    boothGroup.position.set(sideSign * 6.55, 0.36, -2.0);
    const boothDesk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.02, 3.2), marbleColumnMat);
    boothDesk.position.set(0, 0.51, 0);
    boothGroup.add(boothDesk);
    const boothCounter = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 3.4), archBrassMat);
    boothCounter.position.set(0, 1.04, 0);
    boothGroup.add(boothCounter);
    const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.55, 3.16), glassScreenMat);
    boothGlass.position.set(0, 1.84, 0);
    boothGroup.add(boothGlass);
    const boothRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 3.5), canopyMat);
    boothRoof.position.set(0, 2.66, 0);
    boothGroup.add(boothRoof);
    const boothMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.72), boothScreenMat);
    boothMonitor.position.set(0.42, 1.28, -0.5);
    boothGroup.add(boothMonitor);
    const boothSign = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 2.2), warmLampMat);
    boothSign.position.set(0.98, 2.52, 0);
    boothGroup.add(boothSign);
    stGroup.add(boothGroup);

    // Overhead Cyrillic Station Name Signboards & Digital Arrival Boards
    const signTex = createStationSignTexture(st.cyrillic);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 1.0,
      roughness: 0.28,
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 8.6), signMat);
    signBoard.position.set(sideSign * 8.1, 3.3, 0);
    stGroup.add(signBoard);

    // Hanging Platform Signboard visible directly from inside the train windows!
    for (const sz of [-10, 10]) {
      const hangSign = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 4.2), signMat);
      hangSign.position.set(sideSign * 3.6, 3.62, sz);
      stGroup.add(hangSign);
    }

    const mPylon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), redMetroSignMat);
    mPylon.position.set(sideSign * 8.6, 5.4, 0);
    stGroup.add(mPylon);

    // =======================================================================
    // RIGGED METRO STATION WORKERS & PLATFORM BENCH COMMUTERS (Smooth Curved Bodies!)
    // =======================================================================
    // 1. Uniformed Metro Attendant inside the glowing Control/Ticket Booth!
    const boothWorker = createRiggedHuman(sIdx * 7 + 1, textures, 'metro_worker');
    boothWorker.root.position.set(sideSign * 6.45, 0.36, -2.0);
    boothWorker.root.rotation.y = Math.PI * 0.5; // facing out toward the platform & trains!
    stGroup.add(boothWorker.root);
    stationActors.push({
      rig: boothWorker,
      stationIdx: sIdx,
      role: 'booth_worker',
      baseX: sideSign * 6.45,
      baseZ: -2.0,
      curX: sideSign * 6.45,
      curZ: -2.0,
      phase: sIdx * 1.4,
      personality: 'polite',
      rudeCooldown: 0,
      upsetTimer: 0,
      upsetLookYaw: 0,
      sidestepYaw: 0,
      targetSidestep: 0,
      nodTimer: 0,
      nodCooldown: 0,
      bumpX: 0,
      bumpZ: 0,
      mutterText: '',
    });

    // 2. Uniformed Platform Transit Security / Rail Engineer guiding passengers along safety strip!
    const guardWorker = createRiggedHuman(
      sIdx * 7 + 2,
      textures,
      sIdx % 2 === 0 ? 'transit_security' : 'rail_engineer'
    );
    guardWorker.root.position.set(sideSign * 3.65, 0.36, 4.2);
    guardWorker.root.rotation.y = Math.PI * 0.5;
    stGroup.add(guardWorker.root);
    stationActors.push({
      rig: guardWorker,
      stationIdx: sIdx,
      role: 'platform_guard',
      baseX: sideSign * 3.65,
      baseZ: 4.2,
      curX: sideSign * 3.65,
      curZ: 4.2,
      phase: sIdx * 2.1 + 0.7,
      personality: 'polite',
      rudeCooldown: 0,
      upsetTimer: 0,
      upsetLookYaw: 0,
      sidestepYaw: 0,
      targetSidestep: 0,
      nodTimer: 0,
      nodCooldown: 0,
      bumpX: 0,
      bumpZ: 0,
      mutterText: '',
    });

    // 3. Seated Commuters waiting on the sculpted wooden platform benches (mostly phones + newspapers!)
    const benchCoords = [-13.3, -11.9, 11.8, 13.2];
    const benchActs: CommuterActivityType[] = ['phone', 'newspaper', 'phone', 'phone'];
    for (let b = 0; b < benchCoords.length; b++) {
      const bz = benchCoords[b];
      const sitter = createRiggedHuman(
        sIdx * 11 + b * 3 + 4,
        textures,
        undefined,
        benchActs[(b + sIdx) % benchActs.length]
      );
      sitter.root.position.set(sideSign * 6.32, 0.36, bz);
      sitter.root.rotation.y = Math.PI * 0.5;
      stGroup.add(sitter.root);
      stationActors.push({
        rig: sitter,
        stationIdx: sIdx,
        role: 'platform_bench',
        baseX: sideSign * 6.32,
        baseZ: bz,
        curX: sideSign * 6.32,
        curZ: bz,
        phase: sIdx * 1.9 + b * 2.3,
        personality: 'polite',
        rudeCooldown: 0,
        upsetTimer: 0,
        upsetLookYaw: 0,
        sidestepYaw: 0,
        targetSidestep: 0,
        nodTimer: 0,
        nodCooldown: 0,
        bumpX: 0,
        bumpZ: 0,
        mutterText: '',
      });
    }

    // 4. Standing Platform Commuters neatly aligned in flanking doorway queue lanes (clear central exit corridor!)
    const waiterActs: CommuterActivityType[] = ['phone', 'cigarette', 'phone', 'phone', 'none'];
    for (let w = 0; w < 5; w++) {
      const lane = METRO_DOOR_QUEUE_LANES[(w * 2) % METRO_DOOR_QUEUE_LANES.length];
      const wx = lane.localX;
      const wz = lane.localZ;
      const waiter = createRiggedHuman(
        sIdx * 13 + w * 5 + 7,
        textures,
        undefined,
        waiterActs[(w + sIdx) % waiterActs.length]
      );
      waiter.root.position.set(wx, 0.36, wz);
      waiter.root.rotation.y = Math.PI * 0.5;
      stGroup.add(waiter.root);
      stationActors.push({
        rig: waiter,
        stationIdx: sIdx,
        role: 'platform_waiter',
        baseX: wx,
        baseZ: wz,
        curX: wx,
        curZ: wz,
        phase: sIdx * 2.7 + w * 1.5,
        personality: (w + sIdx) % 7 === 0 ? 'rude' : 'polite',
        rudeCooldown: (w % 4) * 3.0,
        upsetTimer: 0,
        upsetLookYaw: 0,
        sidestepYaw: 0,
        targetSidestep: 0,
        nodTimer: 0,
        nodCooldown: 0,
        bumpX: 0,
        bumpZ: 0,
        mutterText: '',
      });
    }

    // =======================================================================
    // STREET-LEVEL METRO ENTRANCE PAVILION + ESCALATOR BRIDGE + 36m x 24m COMPLEX STATION HALL!
    // =======================================================================
    const entLocalX = sideSign * 14.2;
    const isUndergroundSt = st.zoneKind === 'underground' || st.zoneKind === 'subsurface';
    const groundOffsetY = -sPos.y;
    const entGlassMat = new THREE.MeshStandardMaterial({
      color: '#1b3146',
      emissive: new THREE.Color('#28749c'),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.58,
      roughness: 0.16,
    });

    if (!isUndergroundSt && sPos.y > 2.2) {
      const lobbyBase = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.35, 12.0), stationFloorMat);
      lobbyBase.position.set(entLocalX, groundOffsetY + 0.175, 0);
      stGroup.add(lobbyBase);

      const lobbyRoof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.42, 12.6), canopyMat);
      lobbyRoof.position.set(entLocalX, groundOffsetY + 4.2, 0);
      stGroup.add(lobbyRoof);

      for (const sideZ of [-5.6, 5.6]) {
        const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.7, 0.14), entGlassMat);
        sideGlass.position.set(entLocalX, groundOffsetY + 2.15, sideZ);
        stGroup.add(sideGlass);
      }
      for (const wingZ of [-3.7, 3.7]) {
        const frontWing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.7, 3.8), entGlassMat);
        frontWing.position.set(entLocalX + sideSign * 3.5, groundOffsetY + 2.15, wingZ);
        stGroup.add(frontWing);
      }
      const doorLint = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.9, 3.6), canopyMat);
      doorLint.position.set(entLocalX + sideSign * 3.5, groundOffsetY + 3.55, 0);
      stGroup.add(doorLint);

      for (let tz = -3.0; tz <= 3.0; tz += 1.5) {
        const gate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.24), archBrassMat);
        gate.position.set(entLocalX + 0.8, groundOffsetY + 0.88, tz);
        stGroup.add(gate);
      }

      const streetSign = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.15, 7.6), signMat);
      streetSign.position.set(entLocalX + sideSign * 4.05, groundOffsetY + 3.55, 0);
      stGroup.add(streetSign);

      const totemPole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.2, 8), canopyMat);
      totemPole.position.set(entLocalX + sideSign * 4.6, groundOffsetY + 3.1, 5.6);
      stGroup.add(totemPole);
      const totemCube = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.35), redMetroSignMat);
      totemCube.position.set(entLocalX + sideSign * 4.6, groundOffsetY + 6.4, 5.6);
      stGroup.add(totemCube);

      const stairBridge = new THREE.Mesh(new THREE.BoxGeometry(11.6, 3.2, 3.8), entGlassMat);
      stairBridge.position.set(sideSign * 9.8, groundOffsetY + 4.9, 0);
      stairBridge.rotation.z = sideSign * 0.54;
      stGroup.add(stairBridge);
      const stairFloor = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.38, 4.0), stationFloorMat);
      stairFloor.position.set(sideSign * 9.8, groundOffsetY + 3.45, 0);
      stairFloor.rotation.z = sideSign * 0.54;
      stGroup.add(stairFloor);
    }

    const stYaw = stGroup.rotation.y;

    // Attach Complex 36m x 24m Enterable Station Hall (Coffee Area КАФЕ + Waiting Hall + Barista + [E] Interactables!)
    const complex = buildStationComplex(
      { ...st, x: sPos.x, z: sPos.z, trackY: sPos.y },
      sIdx,
      stYaw + Math.PI * 0.5,
      textures,
      collisionWorld,
      registry,
      callbacks
    );
    root.add(complex.group);
    for (let k = 0; k < complex.npcs.length; k++) {
      complexStationNpcs.push(complex.npcs[k]);
    }
    for (let k = 0; k < complex.emissivePanels.length; k++) {
      stationLightMats.push(complex.emissivePanels[k]);
    }

    const cosY = Math.cos(stYaw);
    const sinY = Math.sin(stYaw);
    const platLocalX = sideSign * 4.8;
    const platWorldX = sPos.x + platLocalX * cosY;
    const platWorldZ = sPos.z - platLocalX * sinY;
    const streetLocalX = entLocalX + sideSign * 4.8;
    const streetX = sPos.x + streetLocalX * cosY;
    const streetZ = sPos.z - streetLocalX * sinY;

    stationInfos.push({
      id: st.id,
      name: `${st.code} · ${st.name}`,
      cyrillic: st.cyrillic,
      platWorldX,
      platWorldY: sPos.y + 0.36,
      platWorldZ,
      streetX,
      streetZ,
      yaw: stYaw,
    });

    root.add(stGroup);
  }

  // =========================================================================
  // 3. FOUR WORKING 3-CAR ARTICULATED OPERABLE METRO TRAINS AROUND THE ISLAND!
  // =========================================================================
  const trains: MetroTrainState[] = [];
  const carSpacingSpline = 15.6 / trackTotalLenM;

  for (let tr = 0; tr < 4; tr++) {
    const trainGroup = new THREE.Group();
    const windowMat = new THREE.MeshStandardMaterial({
      color: '#e0cfa4',
      emissive: new THREE.Color('#ffbe62'),
      emissiveIntensity: 1.2,
      roughness: 0.22,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: '#fff6e0',
      emissive: new THREE.Color('#ffefc4'),
      emissiveIntensity: 1.9,
    });
    const neonStripeMat = new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: new THREE.Color(tr % 2 === 1 ? '#ff4da6' : '#00d4f0'),
      emissiveIntensity: 1.45,
    });

    const cars: THREE.Group[] = [];
    for (let c = 0; c < 3; c++) {
      const carMesh = createMetroCarMesh(
        c === 0,
        c === 2,
        windowMat,
        headlightMat,
        neonStripeMat
      );
      trainGroup.add(carMesh);
      cars.push(carMesh);
    }
    root.add(trainGroup);

    trains.push({
      group: trainGroup,
      cars,
      t: (tr / 4 + 0.04) % 1,
      speed: 0.0072,
      maxSpeed: 0.0095,
      dwellTimer: 0,
      currentStationIdx: -1,
      doorsOpen: false,
      headlightMat,
      windowMat,
      neonStripeMat,
    });
  }

  // Subtle futuristic ambient glow lights carried by the metro trains to softly illuminate viaduct & city!
  const trainGlowLights: THREE.PointLight[] = [];
  for (let tr = 0; tr < 4; tr++) {
    const tLight = new THREE.PointLight(tr % 2 === 1 ? '#ff70b8' : '#40d8ff', 6.5, 36, 1.9);
    root.add(tLight);
    trainGlowLights.push(tLight);
  }

  // =========================================================================
  // 4. PHOTOREALISTIC 3-CAR WALKABLE METRO INTERIOR + ANIMATED DOORS + 28 PS2 CIVILIANS!
  // =========================================================================
  const interiorRoot = new THREE.Group();
  interiorRoot.visible = false;
  root.add(interiorRoot);

  // Photorealistic PBR materials powered by high-res procedural maps from textures.ts
  const cabFloorMat = new THREE.MeshStandardMaterial({
    map: textures.metroFloorMap,
    roughnessMap: textures.metroFloorRoughness,
    roughness: 0.72,
    metalness: 0.16,
  });
  const cabWallMat = new THREE.MeshStandardMaterial({
    map: textures.metroWallMap,
    bumpMap: textures.metroWallBump,
    bumpScale: 0.018,
    roughness: 0.36,
    metalness: 0.28,
  });
  const cabTrimDarkMat = new THREE.MeshStandardMaterial({
    color: '#1b222c',
    roughness: 0.56,
    metalness: 0.35,
  });
  const cabBellowsMat = new THREE.MeshStandardMaterial({
    color: '#141920',
    roughness: 0.88,
    metalness: 0.08,
  });
  const cabSeatMat = new THREE.MeshPhysicalMaterial({
    map: textures.metroSeatMap,
    bumpMap: textures.metroSeatBump,
    bumpScale: 0.036,
    roughness: 0.88,
    metalness: 0.02,
    sheen: 0.76,
    sheenColor: new THREE.Color('#5d8ab8'),
    sheenRoughness: 0.7,
  });
  const cabSeatPipingMat = new THREE.MeshStandardMaterial({
    color: '#101c2c',
    roughness: 0.65,
    metalness: 0.08,
  });
  const cabRailMat = new THREE.MeshStandardMaterial({
    color: '#d4dce6',
    roughness: 0.18,
    metalness: 0.92,
  });
  const cabDoorLeafMat = new THREE.MeshStandardMaterial({
    map: textures.metroWallMap,
    color: '#9aa8b8',
    roughness: 0.32,
    metalness: 0.52,
  });
  const cabCeilingLightMat = new THREE.MeshStandardMaterial({
    color: '#eef7ff',
    emissive: new THREE.Color('#c8e6ff'),
    emissiveIntensity: 1.38,
  });
  const cabWarmAccentMat = new THREE.MeshStandardMaterial({
    color: '#ffe8c2',
    emissive: new THREE.Color('#ffb86c'),
    emissiveIntensity: 0.65,
  });
  const cabWindowGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#0e1b2a',
    roughness: 0.07,
    metalness: 0.05,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  // =========================================================================
  // CLASSIC TRANSIT RED DOT-MATRIX SCROLLING LED STOP-NAME TICKER SYSTEM
  // =========================================================================
  const LED_W = 1024;
  const LED_H = 112;
  const LED_PITCH = 6;
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = LED_W;
  ledCanvas.height = LED_H;
  const ledCtx = ledCanvas.getContext('2d')!;

  // Pre-bake perforated dark LED bezel mask with unlit circular red diode matrix (zero per-frame loop!)
  const ledMaskCanvas = document.createElement('canvas');
  ledMaskCanvas.width = LED_W;
  ledMaskCanvas.height = LED_H;
  const ledMaskCtx = ledMaskCanvas.getContext('2d')!;
  ledMaskCtx.fillStyle = '#070203';
  ledMaskCtx.fillRect(0, 0, LED_W, LED_H);
  ledMaskCtx.globalCompositeOperation = 'destination-out';
  for (let y = 5; y < LED_H - 4; y += LED_PITCH) {
    for (let x = 5; x < LED_W - 4; x += LED_PITCH) {
      ledMaskCtx.beginPath();
      ledMaskCtx.arc(x, y, 2.25, 0, Math.PI * 2);
      ledMaskCtx.fill();
    }
  }
  ledMaskCtx.globalCompositeOperation = 'source-over';
  // Subtle brushed bezel border & top smoked-acrylic glass reflection inside the LED window
  ledMaskCtx.strokeStyle = 'rgba(28, 12, 14, 0.95)';
  ledMaskCtx.lineWidth = 6;
  ledMaskCtx.strokeRect(3, 3, LED_W - 6, LED_H - 6);
  const ledGlassGrad = ledMaskCtx.createLinearGradient(0, 0, 0, LED_H * 0.42);
  ledGlassGrad.addColorStop(0, 'rgba(255, 195, 190, 0.09)');
  ledGlassGrad.addColorStop(1, 'rgba(255, 195, 190, 0.0)');
  ledMaskCtx.fillStyle = ledGlassGrad;
  ledMaskCtx.fillRect(6, 6, LED_W - 12, LED_H * 0.42);

  // Subtle unlit dark-red diode substrate drawn beneath lit letters so blank space looks like real LEDs
  const ledUnlitCanvas = document.createElement('canvas');
  ledUnlitCanvas.width = LED_W;
  ledUnlitCanvas.height = LED_H;
  const ledUnlitCtx = ledUnlitCanvas.getContext('2d')!;
  ledUnlitCtx.fillStyle = '#090203';
  ledUnlitCtx.fillRect(0, 0, LED_W, LED_H);
  ledUnlitCtx.fillStyle = '#240709';
  for (let y = 5; y < LED_H - 4; y += LED_PITCH) {
    for (let x = 5; x < LED_W - 4; x += LED_PITCH) {
      ledUnlitCtx.beginPath();
      ledUnlitCtx.arc(x, y, 1.85, 0, Math.PI * 2);
      ledUnlitCtx.fill();
    }
  }

  const ledTickerTex = new THREE.CanvasTexture(ledCanvas);
  ledTickerTex.colorSpace = THREE.SRGBColorSpace;
  ledTickerTex.minFilter = THREE.LinearFilter;
  ledTickerTex.magFilter = THREE.LinearFilter;
  ledTickerTex.generateMipmaps = false;

  const ledTickerMat = new THREE.MeshStandardMaterial({
    map: ledTickerTex,
    emissiveMap: ledTickerTex,
    emissive: new THREE.Color('#ff2216'),
    emissiveIntensity: 2.15,
    roughness: 0.22,
    metalness: 0.14,
  });

  const ledHousingMat = new THREE.MeshStandardMaterial({
    color: '#0d1016',
    roughness: 0.42,
    metalness: 0.62,
  });

  const ledTrimMat = new THREE.MeshStandardMaterial({
    color: '#252c36',
    roughness: 0.34,
    metalness: 0.72,
  });

  const createLedTickerHousing = (width: number, height: number): THREE.Group => {
    const grp = new THREE.Group();
    const caseDepth = 0.075;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.12, height + 0.08, caseDepth),
      ledHousingMat
    );
    body.position.z = -caseDepth * 0.5;
    grp.add(body);

    // Top & bottom thin brushed aluminum transit bezel rails
    for (const sy of [-1, 1]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.13, 0.016, caseDepth + 0.012),
        ledTrimMat
      );
      rail.position.set(0, sy * (height * 0.5 + 0.036), -caseDepth * 0.45);
      grp.add(rail);
    }

    // Glowing scrolling red dot-matrix LED faceplate
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), ledTickerMat);
    screen.position.z = 0.004;
    grp.add(screen);
    return grp;
  };

  let ledActiveMsg = '';
  let ledMsgWidth = 900;
  let ledScrollPx = 0;
  let ledTickAccum = 0.1;

  const renderLedTickerFrame = (msg: string, forceRedraw = false) => {
    if (msg !== ledActiveMsg) {
      ledActiveMsg = msg;
      ledCtx.font = '700 66px "Courier New", "Lucida Console", monospace';
      ledMsgWidth = Math.max(480, Math.ceil(ledCtx.measureText(ledActiveMsg).width));
      ledScrollPx = 780;
      forceRedraw = true;
    }
    if (!forceRedraw && ledTickAccum < 0.036) return;
    ledTickAccum = 0;

    // 1. Lay down unlit dark-red LED matrix substrate
    ledCtx.drawImage(ledUnlitCanvas, 0, 0);

    // 2. Step text diode-column by diode-column (6px pitch) like real public transit LED tickers!
    const loopSpan = ledMsgWidth + 260;
    const rawOffset = ((ledScrollPx % loopSpan) + loopSpan) % loopSpan;
    const steppedX = LED_W - Math.floor(rawOffset / LED_PITCH) * LED_PITCH;

    ledCtx.save();
    ledCtx.font = '700 66px "Courier New", "Lucida Console", monospace';
    ledCtx.textBaseline = 'middle';

    // Outer crimson LED bloom pass
    ledCtx.shadowColor = '#ff0e06';
    ledCtx.shadowBlur = 16;
    ledCtx.fillStyle = '#ff2214';
    ledCtx.fillText(ledActiveMsg, steppedX, LED_H * 0.53);
    ledCtx.fillText(ledActiveMsg, steppedX + loopSpan, LED_H * 0.53);
    if (steppedX > 0) {
      ledCtx.fillText(ledActiveMsg, steppedX - loopSpan, LED_H * 0.53);
    }

    // Hot red-orange LED core pass for crisp readability from across the car
    ledCtx.shadowBlur = 4;
    ledCtx.fillStyle = '#ff6a52';
    ledCtx.fillText(ledActiveMsg, steppedX, LED_H * 0.53);
    ledCtx.fillText(ledActiveMsg, steppedX + loopSpan, LED_H * 0.53);
    if (steppedX > 0) {
      ledCtx.fillText(ledActiveMsg, steppedX - loopSpan, LED_H * 0.53);
    }
    ledCtx.restore();

    // 3. Stamp perforated dot-matrix LED bezel & top acrylic sheen
    ledCtx.drawImage(ledMaskCanvas, 0, 0);
    ledTickerTex.needsUpdate = true;
  };

  renderLedTickerFrame('NEXT STOP: CENTRAL RELIQUARY  •  RING LINE 1  •  PLEASE HOLD HANDRAILS', true);

  interface DoorLeafPair {
    left: THREE.Mesh;
    right: THREE.Mesh;
    centerZ: number;
  }

  interface StrapHandleAnchor {
    carIdx: number;
    railSide: -1 | 1;
    z: number;
    pivot: THREE.Group;
  }

  const interiorCars: THREE.Group[] = [];
  const interiorDoorPairs: DoorLeafPair[][] = [[], [], []];
  const strapAnchors: StrapHandleAnchor[] = [];
  const STRAP_Z_COORDS = [-5.4, -4.2, -3.0, -1.6, -0.4, 0.8, 2.0, 3.2, 4.4, 5.4];
  const STRAP_DROP_LEN = 0.49; // 2.94m rail -> 2.45m handle bottom (1.57m above 0.88m floor!)
  const DOOR_ZS = [-3.6, 3.6]; // 2 wide station doorways per car (platform is on -X side)
  const CAR_SPACING_M = 15.6;

  // Build 3 fully detailed, seamlessly connected walk-through cars!
  for (let c = 0; c < 3; c++) {
    const carGrp = new THREE.Group();
    const isFrontCar = c === 0;
    const isRearCar = c === 2;

    // Textured non-slip rubberized studded floor + baseboard kickplates
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.12, 14.8), cabFloorMat);
    floorMesh.position.set(0, 0.82, 0);
    carGrp.add(floorMesh);

    // Subtle yellow safety threshold strips at the platform doors (-X side)
    const thresholdMat = new THREE.MeshStandardMaterial({ color: '#d4a11e', roughness: 0.55 });
    for (const dz of DOOR_ZS) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 1.85), thresholdMat);
      strip.position.set(-1.18, 0.89, dz);
      carGrp.add(strip);
    }

    // Curved-look brushed metallic ceiling with central ventilation spine & twin backlit diffuser rails
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.14, 14.8), cabWallMat);
    ceiling.position.set(0, 3.38, 0);
    carGrp.add(ceiling);

    const ventSpine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 14.2), cabTrimDarkMat);
    ventSpine.position.set(0, 3.29, 0);
    carGrp.add(ventSpine);

    for (const lx of [-0.56, 0.56]) {
      const cLight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 13.4), cabCeilingLightMat);
      cLight.position.set(lx, 3.3, 0);
      carGrp.add(cLight);
    }

    // Side walls, wide panoramic windows, animated station doors, quilted longitudinal benches, stanchions & straps
    for (const sx of [-1, 1]) {
      // Upper wall header + backlit route map panels above doors
      const upperHeader = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 14.8), cabWallMat);
      upperHeader.position.set(sx * 1.32, 3.16, 0);
      carGrp.add(upperHeader);

      // Subtle warm-tinted cove molding strip along upper valance
      const coveStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 14.0), cabWarmAccentMat);
      coveStrip.position.set(sx * 1.24, 2.96, 0);
      carGrp.add(coveStrip);

      // Lower side wall segments (skipping the 2 wide doorway openings so doors open cleanly!)
      const wallSegs: [number, number][] = [
        [-7.35, -4.55],
        [-2.65, 2.65],
        [4.55, 7.35],
      ];
      for (const [z0, z1] of wallSegs) {
        const len = z1 - z0;
        const midZ = (z0 + z1) * 0.5;
        const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.94, len), cabWallMat);
        lowerWall.position.set(sx * 1.32, 1.34, midZ);
        carGrp.add(lowerWall);

        // Dark rubber scuff kickplate at floor edge
        const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, len), cabTrimDarkMat);
        kickPlate.position.set(sx * 1.24, 0.97, midZ);
        carGrp.add(kickPlate);

        // Panoramic glass window above lower wall
        const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.16, 1.24), cabWindowGlassMat);
        glassPane.rotation.y = sx > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
        glassPane.position.set(sx * 1.3, 2.38, midZ);
        carGrp.add(glassPane);

        // Window mullion frame
        for (const mz of [z0 + 0.08, z1 - 0.08]) {
          const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.16), cabTrimDarkMat);
          mullion.position.set(sx * 1.32, 2.38, mz);
          carGrp.add(mullion);
        }

        // Plush contoured woven-fabric upholstered passenger seating (individual tufted cushions + bolster rolls!)
        const seatLen = len - 0.34;
        if (seatLen > 1.2) {
          const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.33, seatLen), cabTrimDarkMat);
          seatBase.position.set(sx * 1.04, 1.04, midZ);
          carGrp.add(seatBase);

          const numCushions = Math.max(2, Math.round(seatLen / 0.66));
          const cStep = seatLen / numCushions;
          const cW = cStep - 0.045;
          const bolsterGeo = new THREE.CylinderGeometry(0.068, 0.068, cW, 10);
          bolsterGeo.rotateX(Math.PI * 0.5);
          const headRollGeo = new THREE.CylinderGeometry(0.056, 0.056, cW, 10);
          headRollGeo.rotateX(Math.PI * 0.5);

          for (let ci = 0; ci < numCushions; ci++) {
            const cz = midZ - seatLen * 0.5 + cStep * (ci + 0.5);
            // Plump fabric seat pan
            const pan = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, cW), cabSeatMat);
            pan.position.set(sx * 1.03, 1.27, cz);
            carGrp.add(pan);
            // Soft rounded front thigh bolster roll
            const thighRoll = new THREE.Mesh(bolsterGeo, cabSeatMat);
            thighRoll.position.set(sx * 0.82, 1.27, cz);
            carGrp.add(thighRoll);
            // Ergonomic angled padded lumbar backrest
            const backPad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, cW), cabSeatMat);
            backPad.position.set(sx * 1.2, 1.56, cz);
            backPad.rotation.z = sx * 0.12;
            carGrp.add(backPad);
            // Soft upper headrest cushion roll
            const headRoll = new THREE.Mesh(headRollGeo, cabSeatMat);
            headRoll.position.set(sx * 1.22, 1.84, cz);
            carGrp.add(headRoll);
            // Subtle dark tailored seam piping between cushions
            if (ci < numCushions - 1) {
              const seam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.02), cabSeatPipingMat);
              seam.position.set(sx * 1.0, 1.29, cz + cStep * 0.5);
              carGrp.add(seam);
            }
          }

          // Brushed steel armrests / seat-end dividers next to doorways
          for (const endZ of [midZ - seatLen * 0.5, midZ + seatLen * 0.5]) {
            const divider = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.045), cabTrimDarkMat);
            divider.position.set(sx * 1.02, 1.46, endZ);
            carGrp.add(divider);
            const vertPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.48, 8), cabRailMat);
            vertPole.position.set(sx * 0.78, 2.1, endZ);
            carGrp.add(vertPole);
          }
        }
      }

      // Sliding double station doors at each doorway (platform-side -X animates open at stops!)
      for (const dz of DOOR_ZS) {
        const leafGeo = new THREE.BoxGeometry(0.08, 2.02, 0.92);
        const leftLeaf = new THREE.Mesh(leafGeo, cabDoorLeafMat);
        leftLeaf.position.set(sx * 1.32, 1.89, dz - 0.46);
        carGrp.add(leftLeaf);

        const rightLeaf = new THREE.Mesh(leafGeo, cabDoorLeafMat);
        rightLeaf.position.set(sx * 1.32, 1.89, dz + 0.46);
        carGrp.add(rightLeaf);

        // Classic red dot-matrix scrolling stop-name LED marquee mounted above every doorway header
        const doorLedBoard = createLedTickerHousing(1.66, 0.21);
        doorLedBoard.rotation.order = 'YXZ';
        doorLedBoard.rotation.y = sx > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
        doorLedBoard.rotation.x = 0.08;
        doorLedBoard.position.set(sx * 1.22, 3.09, dz);
        carGrp.add(doorLedBoard);

        if (sx === -1) {
          interiorDoorPairs[c].push({ left: leftLeaf, right: rightLeaf, centerZ: dz });
        }
      }

      // Overhead brushed-steel handrail + ergonomically low, swinging commuter grab straps
      const grabBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 13.4, 8), cabRailMat);
      grabBar.rotation.x = Math.PI * 0.5;
      grabBar.position.set(sx * 0.6, 2.94, 0);
      carGrp.add(grabBar);

      for (let si = 0; si < STRAP_Z_COORDS.length; si++) {
        const sz = STRAP_Z_COORDS[si];
        // Pivot directly on the overhead rail (y=2.94) so straps swing realistically with rail sway!
        const strapPivot = new THREE.Group();
        strapPivot.position.set(sx * 0.6, 2.94, sz);

        // Woven nylon strap webbing hanging down from rail to handle ring
        const strapBand = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.37, 0.034), cabTrimDarkMat);
        strapBand.position.set(0, -0.195, 0);
        strapPivot.add(strapBand);

        // Smooth molded commuter grip ring (center at -0.435 => bottom grip bar at -0.49 => y = 2.45m!)
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.013, 10, 18), cabRailMat);
        loop.rotation.y = Math.PI * 0.5;
        loop.position.set(0, -0.435, 0);
        strapPivot.add(loop);

        carGrp.add(strapPivot);
        strapAnchors.push({
          carIdx: c,
          railSide: sx as -1 | 1,
          z: sz,
          pivot: strapPivot,
        });
      }
    }

    // Center aisle vertical stanchion poles in doorways (classic subway standing hold!)
    for (const dz of DOOR_ZS) {
      const centerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.5, 8), cabRailMat);
      centerPole.position.set(0, 2.1, dz);
      carGrp.add(centerPole);
    }

    // Front bulkhead: panoramic cockpit console on Car 0, wide open gangway archway on Cars 1 & 2!
    if (isFrontCar) {
      const frontDash = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.94, 0.72), cabTrimDarkMat);
      frontDash.position.set(0, 1.34, 7.02);
      carGrp.add(frontDash);

      const frontHeader = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.44, 0.36), cabWallMat);
      frontHeader.position.set(0, 3.16, 7.18);
      carGrp.add(frontHeader);

      const frontLedBoard = createLedTickerHousing(1.88, 0.24);
      frontLedBoard.rotation.order = 'YXZ';
      frontLedBoard.rotation.y = Math.PI;
      frontLedBoard.rotation.x = 0.07;
      frontLedBoard.position.set(0, 3.09, 6.96);
      carGrp.add(frontLedBoard);

      const consoleGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.06, 0.28),
        new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: new THREE.Color('#0ea5e9'),
          emissiveIntensity: 1.25,
        })
      );
      consoleGlow.position.set(0, 1.83, 6.94);
      consoleGlow.rotation.x = 0.25;
      carGrp.add(consoleGlow);
    } else {
      // Open gangway surround frame connecting to car ahead
      for (const sx of [-1, 1]) {
        const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.52, 0.24), cabWallMat);
        frameSide.position.set(sx * 0.98, 2.12, 7.3);
        carGrp.add(frameSide);
      }
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.44, 0.24), cabWallMat);
      frameTop.position.set(0, 3.16, 7.3);
      carGrp.add(frameTop);

      // Classic scrolling red LED stop sign above the front gangway archway (visible down the aisle!)
      const fwdArchLed = createLedTickerHousing(1.36, 0.2);
      fwdArchLed.rotation.order = 'YXZ';
      fwdArchLed.rotation.y = Math.PI;
      fwdArchLed.rotation.x = 0.07;
      fwdArchLed.position.set(0, 3.09, 7.15);
      carGrp.add(fwdArchLed);
    }

    // Rear bulkhead: accordion walk-through gangway on Cars 0 & 1, sealed observation window on Car 2!
    if (isRearCar) {
      const rearLower = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.98, 0.24), cabWallMat);
      rearLower.position.set(0, 1.36, -7.3);
      carGrp.add(rearLower);
      const rearHeader = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.44, 0.24), cabWallMat);
      rearHeader.position.set(0, 3.16, -7.3);
      carGrp.add(rearHeader);
      for (const sx of [-1, 1]) {
        const rearSide = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.5, 0.24), cabWallMat);
        rearSide.position.set(sx * 1.06, 2.38, -7.3);
        carGrp.add(rearSide);
      }

      // Rear observation bulkhead scrolling red LED stop marquee facing forward down Car 2
      const rearLedBoard = createLedTickerHousing(1.88, 0.24);
      rearLedBoard.rotation.order = 'YXZ';
      rearLedBoard.rotation.x = 0.07;
      rearLedBoard.position.set(0, 3.09, -7.15);
      carGrp.add(rearLedBoard);
    } else {
      for (const sx of [-1, 1]) {
        const frameSide = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.52, 0.24), cabWallMat);
        frameSide.position.set(sx * 0.98, 2.12, -7.3);
        carGrp.add(frameSide);
      }
      const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.44, 0.24), cabWallMat);
      frameTop.position.set(0, 3.16, -7.3);
      carGrp.add(frameTop);

      // Classic scrolling red LED stop sign above rear gangway archway facing forward into cabin!
      const rearArchLed = createLedTickerHousing(1.36, 0.2);
      rearArchLed.rotation.order = 'YXZ';
      rearArchLed.rotation.x = 0.07;
      rearArchLed.position.set(0, 3.09, -7.15);
      carGrp.add(rearArchLed);

      // Accordion rubber bellows vestibule bridging gap to trailing car!
      const bellowsFloor = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.1, 1.25), cabBellowsMat);
      bellowsFloor.position.set(0, 0.83, -7.95);
      carGrp.add(bellowsFloor);
      const bellowsRoof = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.1, 1.25), cabBellowsMat);
      bellowsRoof.position.set(0, 2.98, -7.95);
      carGrp.add(bellowsRoof);
      for (const sx of [-1, 1]) {
        const bellowsWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.15, 1.25), cabBellowsMat);
        bellowsWall.position.set(sx * 0.72, 1.9, -7.95);
        carGrp.add(bellowsWall);
      }
    }

    // Balanced warm-neutral overhead cabin lighting (2 fixtures per car so every passenger's face & clothes look photorealistic!)
    for (const lz of [-3.5, 3.5]) {
      const carLight = new THREE.PointLight('#eef4fa', 3.4, 15, 1.45);
      carLight.position.set(0, 2.98, lz);
      carGrp.add(carLight);
    }

    interiorRoot.add(carGrp);
    interiorCars.push(carGrp);
  }

  // =========================================================================
  // 5. 74 LIFELIKE RIGGED HUMAN PASSENGERS (Folded Fabric Drapery, Varied Jackets,
  //    Newspapers, Glowing Phones, Cigarettes, Lively Walking & Boarding/Alighting!)
  // =========================================================================
  interface TrainSeatSlot {
    carIdx: number;
    side: -1 | 1;
    z: number;
    occupiedBy: number;
  }

  const seatSlots: TrainSeatSlot[] = [];
  const SEAT_Z_COORDS = [
    -6.65, -5.95, -5.25, -2.3, -1.65, -1.0, -0.35, 0.3, 0.95, 1.6, 2.25, 5.15, 5.85, 6.55,
  ];
  for (let c = 0; c < 3; c++) {
    for (const side of [-1, 1] as const) {
      for (const sz of SEAT_Z_COORDS) {
        if (c === 0 && sz > 5.8) continue;
        seatSlots.push({ carIdx: c, side, z: sz, occupiedBy: -1 });
      }
    }
  }

  interface StandSpot {
    carIdx: number;
    railSide: -1 | 1;
    strapZ: number;
    strapAnchorIdx: number;
    x: number;
    z: number;
    faceX: number;
    occupiedBy: number;
  }

  // Build every standing spot directly paired with an actual overhead hanging strap handle!
  // Passenger stands at x = railSide * 0.30 facing their own overhead rail (x = railSide * 0.60, +0.30m ahead)!
  const standSpots: StandSpot[] = [];
  for (let c = 0; c < 3; c++) {
    const pairedStraps: [-1 | 1, number][] = [
      [-1, -4.2],
      [1, -3.0],
      [-1, 3.2],
      [1, 4.4],
      [-1, -1.6],
      [1, -0.4],
      [-1, 0.8],
      [1, 2.0],
      [-1, -5.4],
      [1, -5.4],
      [-1, 4.4],
      [1, 5.4],
    ];
    for (const [railSide, strapZ] of pairedStraps) {
      const anchorIdx = strapAnchors.findIndex(
        (a) => a.carIdx === c && a.railSide === railSide && Math.abs(a.z - strapZ) < 0.05
      );
      standSpots.push({
        carIdx: c,
        railSide,
        strapZ,
        strapAnchorIdx: anchorIdx,
        x: railSide * 0.30,
        z: strapZ,
        faceX: railSide,
        occupiedBy: -1,
      });
    }
  }

  interface TrainPassenger {
    rig: HumanRig;
    carIdx: number;
    state: 'seated' | 'standing' | 'strolling' | 'exiting' | 'boarding' | 'offboard';
    seatSlotIdx: number;
    standSlotIdx: number;
    localX: number;
    localZ: number;
    prevLocalX: number;
    prevLocalZ: number;
    targetZ: number;
    yaw: number;
    doorZ: number;
    destStationIdx: number;
    phase: number;
    walkSpeed: number;
    walkCycle: number;
    strollTimer: number;
    variantStyle: number;
    personality: 'polite' | 'rude';
    rudeCooldown: number;
    upsetTimer: number;
    upsetLookYaw: number;
    sidestepYaw: number;
    targetSidestep: number;
    nodTimer: number;
    nodCooldown: number;
    bumpX: number;
    bumpZ: number;
    mutterText: string;
  }

  const PASSENGER_COUNT = 74;
  const passengers: TrainPassenger[] = [];

  for (let i = 0; i < PASSENGER_COUNT; i++) {
    // Rich realistic modern commuter mix: ~50% on glowing smartphones, plus newspapers, cigarettes & relaxed riders!
    let activity: CommuterActivityType = 'none';
    if (i < 48) {
      const r = i % 10;
      if (r === 1 || r === 2 || r === 4 || r === 6 || r === 8) activity = 'phone';
      else if (r === 0 || r === 5) activity = 'newspaper';
      else if (r === 9) activity = 'cigarette';
    } else {
      const r = i % 7;
      if (r === 0 || r === 2 || r === 3 || r === 5) activity = 'phone';
      else if (r === 1) activity = 'cigarette';
    }

    const rig = createRiggedHuman(i + 3, textures, undefined, activity);
    const p: TrainPassenger = {
      rig,
      carIdx: i % 3,
      state: 'seated',
      seatSlotIdx: -1,
      standSlotIdx: -1,
      localX: 0,
      localZ: 0,
      prevLocalX: 0,
      prevLocalZ: 0,
      targetZ: 0,
      yaw: 0,
      doorZ: DOOR_ZS[i % 2],
      destStationIdx: i % METRO_STATIONS.length,
      phase: i * 1.43,
      walkSpeed: 1.32 + (i % 5) * 0.12,
      walkCycle: i * 0.9,
      strollTimer: 6 + (i % 9) * 3.2,
      variantStyle: i,
      personality: i % 7 === 0 ? 'rude' : 'polite',
      rudeCooldown: (i % 5) * 3.5,
      upsetTimer: 0,
      upsetLookYaw: 0,
      sidestepYaw: 0,
      targetSidestep: 0,
      nodTimer: 0,
      nodCooldown: 0,
      bumpX: 0,
      bumpZ: 0,
      mutterText: '',
    };

    if (i < 48) {
      let chosen = -1;
      const startScan = (i * 5) % seatSlots.length;
      for (let k = 0; k < seatSlots.length; k++) {
        const sIdx = (startScan + k) % seatSlots.length;
        if (seatSlots[sIdx].occupiedBy === -1) {
          chosen = sIdx;
          break;
        }
      }
      if (chosen >= 0) {
        const slot = seatSlots[chosen];
        slot.occupiedBy = i;
        p.carIdx = slot.carIdx;
        p.seatSlotIdx = chosen;
        p.state = 'seated';
        p.localX = slot.side * 0.94;
        p.localZ = slot.z;
        p.yaw = slot.side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
        p.doorZ = Math.abs(slot.z - DOOR_ZS[0]) < Math.abs(slot.z - DOOR_ZS[1]) ? DOOR_ZS[0] : DOOR_ZS[1];
      }
    } else if (i < 66) {
      const standIdx = (i - 48) % standSpots.length;
      const spot = standSpots[standIdx];
      if (spot.occupiedBy === -1) {
        spot.occupiedBy = i;
        p.carIdx = spot.carIdx;
        p.standSlotIdx = standIdx;
        p.state = 'standing';
        p.localX = spot.x;
        p.localZ = spot.z;
        p.yaw = spot.faceX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
        p.doorZ = Math.abs(spot.z - DOOR_ZS[0]) < Math.abs(spot.z - DOOR_ZS[1]) ? DOOR_ZS[0] : DOOR_ZS[1];
      } else {
        p.state = 'offboard';
      }
    } else {
      // Reserve 8 commuters ready to board immediately at the very first station stop!
      p.state = 'offboard';
    }

    interiorCars[p.carIdx].add(p.rig.root);
    passengers.push(p);
  }

  // =========================================================================
  // 6. AUTOPILOT FIRST-PERSON RIDER WALKING & SITTING STATE
  // =========================================================================
  let riderActive = false;
  let riddenTrainIdx = 0;
  let riderWalkZ = 1.6; // Continuous coordinate along 3-car train: Car 0 [+6.1..-7.8], Car 1 [-7.8..-23.4], Car 2 [-23.4..-37.8]
  let riderWalkX = 0.0;
  let riderSeated = false;
  let riderSeatSide: -1 | 1 = 1;
  let riderSeatZ = 1.05;
  let riderSeatCarIdx = 0;
  let riderEyeHeight = 2.46; // 2.46m standing, 1.94m seated
  let riderWalkBobPhase = 0;
  let doorOpenAmount = 0; // 0..1 smooth sliding doors
  let lastStationStopHandled = -1;

  const operatedPos = new THREE.Vector3();
  const operatedEyePos = new THREE.Vector3();
  const operatedFwd = new THREE.Vector3(0, 0, 1);
  const prevOperatedPos = new THREE.Vector3();
  const carVelocity = new THREE.Vector3();
  let prevOperatedYaw = 0;
  let carYawRate = 0;
  let hasPrevCarTransform = false;

  const _carPos = new THREE.Vector3();
  const _carTan = new THREE.Vector3();
  const _lookTarget = new THREE.Vector3();
  const _localEyeVec = new THREE.Vector3();
  const _carForward = new THREE.Vector3();
  const _tmpTargetVec = new THREE.Vector3();

  const mapContinuousZToCar = (contZ: number): { carIdx: number; localZ: number } => {
    if (contZ >= -7.8) {
      return { carIdx: 0, localZ: contZ };
    } else if (contZ >= -23.4) {
      return { carIdx: 1, localZ: contZ + CAR_SPACING_M };
    } else {
      return { carIdx: 2, localZ: contZ + CAR_SPACING_M * 2 };
    }
  };

  const findNearestFreeSeat = (carIdx: number, localZ: number, localX: number): number => {
    let bestIdx = -1;
    let bestD = 2.4;
    for (let i = 0; i < seatSlots.length; i++) {
      const slot = seatSlots[i];
      if (slot.carIdx !== carIdx || slot.occupiedBy !== -1) continue;
      const d = Math.hypot(slot.z - localZ, slot.side * 0.85 - localX);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const findNextStation = (u: number): { idx: number; distM: number; currentName: string } => {
    let bestIdx = 0;
    let bestAhead = 2;
    let currentName = '';
    for (let s = 0; s < stationPositions.length; s++) {
      let diff = stationPositions[s].u - u;
      if (diff < 0) diff += 1;
      const distMeters = diff * trackTotalLenM;
      const backDistMeters = (1 - diff) * trackTotalLenM;
      if (distMeters < 26 || backDistMeters < 26) {
        currentName = stationPositions[s].spec.name;
      }
      if (diff > 0.001 && diff < bestAhead) {
        bestAhead = diff;
        bestIdx = s;
      }
    }
    return {
      idx: bestIdx,
      distM: Math.round(bestAhead * trackTotalLenM),
      currentName,
    };
  };

  const setRiderMode = (active: boolean, playerX: number, playerZ: number) => {
    // Restore all 3 exterior car shells on previously ridden train
    if (trains[riddenTrainIdx]) {
      for (let c = 0; c < 3; c++) {
        trains[riddenTrainIdx].cars[c].visible = true;
      }
    }

    riderActive = active;
    interiorRoot.visible = active;

    if (active) {
      let bestIdx = 0;
      let bestD2 = Infinity;
      for (let i = 0; i < trains.length; i++) {
        const pos = trains[i].cars[0].position;
        const d2 = (pos.x - playerX) ** 2 + (pos.z - playerZ) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = i;
        }
      }
      riddenTrainIdx = bestIdx;
      // Hide all 3 solid exterior shells while player walks inside the 3-car connected interior!
      for (let c = 0; c < 3; c++) {
        trains[riddenTrainIdx].cars[c].visible = false;
      }
      // Reset rider standing nicely inside Car 1 facing forward
      riderWalkZ = 2.0;
      riderWalkX = 0.0;
      riderSeated = false;
      riderEyeHeight = 2.46;
      lastStationStopHandled = -1;
    }
  };

  const _exitWorldVec = new THREE.Vector3();

  const updateRiderControls = (
    dt: number,
    walkFwd: number,
    walkStrafe: number,
    lookYawOffset: number,
    toggleSit: boolean
  ): RiderControlResult => {
    if (!riderActive) return { exitedToPlatform: false };

    const { carIdx, localZ } = mapContinuousZToCar(riderWalkZ);
    const tr = trains[riddenTrainIdx];

    // Handle Sit / Stand toggle (KeyE / Xbox A / HUD button)
    if (toggleSit) {
      if (riderSeated) {
        riderSeated = false;
        riderWalkX = riderSeatSide * 0.36;
      } else {
        const seatIdx = findNearestFreeSeat(carIdx, localZ, riderWalkX);
        if (seatIdx >= 0) {
          const slot = seatSlots[seatIdx];
          riderSeated = true;
          riderSeatSide = slot.side;
          riderSeatZ = slot.z;
          riderSeatCarIdx = slot.carIdx;
          riderWalkZ = slot.z - slot.carIdx * CAR_SPACING_M;
          riderWalkX = slot.side * 0.94;
        }
      }
    }

    // Pressing movement keys while seated smoothly stands the player up to walk!
    const moveMag = Math.hypot(walkFwd, walkStrafe);
    if (riderSeated && moveMag > 0.2) {
      riderSeated = false;
      riderWalkX = riderSeatSide * 0.36;
    }

    if (!riderSeated && moveMag > 0.04) {
      const walkSpeed = 2.95; // natural brisk walking pace down the aisle
      // Transform input relative to player's look direction inside the car (lookYawOffset = 0 is +Z forward)
      const sinY = Math.sin(lookYawOffset);
      const cosY = Math.cos(lookYawOffset);
      const dZ = (walkFwd * cosY - walkStrafe * sinY) * walkSpeed * dt;
      const dX = (walkFwd * sinY + walkStrafe * cosY) * walkSpeed * dt;

      riderWalkZ = THREE.MathUtils.clamp(riderWalkZ + dZ, -37.2, 5.9);

      // Check if player is walking straight out of an open sliding doorway onto the station platform!
      const nearOpenDoor =
        tr.doorsOpen &&
        doorOpenAmount > 0.42 &&
        (Math.abs(localZ - DOOR_ZS[0]) < 1.28 || Math.abs(localZ - DOOR_ZS[1]) < 1.28);

      const nextX = riderWalkX + dX;
      if (nearOpenDoor && nextX < -0.58) {
        const activeCar = interiorCars[carIdx] ?? interiorCars[0];
        activeCar.updateMatrixWorld();
        _exitWorldVec.set(-3.1, 0.36, localZ).applyMatrix4(activeCar.matrixWorld);
        const stIdx = tr.currentStationIdx >= 0 ? tr.currentStationIdx : 0;
        const stInfo = stationInfos[stIdx];
        const platY = stInfo ? stInfo.platWorldY : _exitWorldVec.y;
        const exitWorldPos = new THREE.Vector3(_exitWorldVec.x, platY, _exitWorldVec.z);
        const exitYaw = stInfo ? stInfo.yaw - Math.PI * 0.5 : Math.atan2(operatedFwd.x, operatedFwd.z) - Math.PI * 0.5;
        return {
          exitedToPlatform: true,
          exitWorldPos,
          exitYaw,
          stationName: stInfo?.name ?? 'Metro Station',
        };
      }

      // Slightly narrower lateral clearance through the accordion bellows gangways between cars!
      const inGangway =
        (riderWalkZ < -6.9 && riderWalkZ > -8.7) ||
        (riderWalkZ < -22.5 && riderWalkZ > -24.3);
      const maxX = inGangway ? 0.34 : 0.56;
      const minX = nearOpenDoor ? -0.95 : -maxX;
      riderWalkX = THREE.MathUtils.clamp(nextX, minX, maxX);

      // Hard capsule separation (r = 0.34 m) against onboard passengers in the same car so player never clips!
      const afterLoc = mapContinuousZToCar(riderWalkZ);
      let rz = afterLoc.localZ;
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (p.state === 'offboard' || p.state === 'seated' || p.carIdx !== afterLoc.carIdx) continue;
        const dx = riderWalkX - p.localX;
        const dz = rz - p.localZ;
        const d2 = dx * dx + dz * dz;
        const minSep = 0.68;
        if (d2 < minSep * minSep && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = minSep - d;
          const nx = dx / d;
          const nz = dz / d;
          riderWalkX = THREE.MathUtils.clamp(riderWalkX + nx * push, minX, maxX);
          rz += nz * push;
        }
      }
      riderWalkZ = THREE.MathUtils.clamp(rz - afterLoc.carIdx * CAR_SPACING_M, -37.2, 5.9);

      riderWalkBobPhase += dt * 9.6 * Math.min(1, moveMag);
    } else if (!riderSeated) {
      riderWalkBobPhase = THREE.MathUtils.damp(riderWalkBobPhase, 0, 5, dt);
    }

    const targetHeight = riderSeated ? 1.94 : 2.46;
    riderEyeHeight = THREE.MathUtils.damp(riderEyeHeight, targetHeight, 9.5, dt);
    return { exitedToPlatform: false };
  };

  const getOperatedTrainState = (): OperatedTrainState => {
    const tr = trains[riddenTrainIdx];
    const info = findNextStation(tr.t);
    const { carIdx, localZ } = mapContinuousZToCar(riderWalkZ);
    const activeCar = interiorCars[carIdx] ?? interiorCars[0];

    // World position & forward direction of the exact car the player is currently standing/sitting in!
    operatedPos.copy(activeCar.position);
    _carForward.set(0, 0, 1).applyQuaternion(activeCar.quaternion).normalize();
    operatedFwd.copy(_carForward);

    const walkBob = riderSeated ? 0 : Math.sin(riderWalkBobPhase) * 0.032;
    const eyeLocalX = riderSeated ? riderSeatSide * 0.94 : riderWalkX;
    const eyeLocalZ = riderSeated ? riderSeatZ : localZ;
    _localEyeVec.set(eyeLocalX, riderEyeHeight + walkBob, eyeLocalZ);
    operatedEyePos.copy(_localEyeVec).applyMatrix4(activeCar.matrixWorld);

    const activeCount = passengers.reduce((acc, p) => acc + (p.state !== 'offboard' ? 1 : 0), 0);
    const nearSeat = !riderSeated && findNearestFreeSeat(carIdx, localZ, riderWalkX) >= 0;

    return {
      active: riderActive,
      speedKmh: Math.round(tr.speed * trackTotalLenM * 3.6),
      doorsOpen: tr.doorsOpen,
      currentStation: info.currentName,
      nextStation: stationPositions[info.idx]?.spec.name ?? 'Perimeter Ring',
      distToNextM: info.distM,
      worldPos: operatedPos,
      eyePos: operatedEyePos,
      forwardDir: operatedFwd,
      seated: riderSeated,
      nearSeat,
      carIndex: (riderSeated ? riderSeatCarIdx : carIdx) + 1,
      passengerCount: activeCount,
    };
  };

  const getTrainFrame = (): TrainFrame => {
    const st = getOperatedTrainState();
    return {
      eyePos: st.eyePos,
      forwardDir: st.forwardDir,
      velocity: carVelocity,
      yawDeltaPerSec: carYawRate,
      carIndex: st.carIndex,
      seated: st.seated,
    };
  };

  const triggerStationBoardingExchange = (stationIdx: number) => {
    // 1. Passengers whose destination is this station stand up, walk to the sliding doors & step out!
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (
        (p.state === 'seated' || p.state === 'standing' || p.state === 'strolling') &&
        (p.destStationIdx === stationIdx || (i + stationIdx) % 5 === 0)
      ) {
        if (p.seatSlotIdx >= 0) {
          seatSlots[p.seatSlotIdx].occupiedBy = -1;
          p.seatSlotIdx = -1;
        }
        if (p.standSlotIdx >= 0) {
          standSpots[p.standSlotIdx].occupiedBy = -1;
          p.standSlotIdx = -1;
        }
        p.doorZ = Math.abs(p.localZ - DOOR_ZS[0]) < Math.abs(p.localZ - DOOR_ZS[1]) ? DOOR_ZS[0] : DOOR_ZS[1];
        p.state = 'exiting';
      }
    }

    // 2. Waiting platform commuters step inside through the open doors and claim open seats or grab straps!
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (p.state !== 'offboard') continue;

      let assigned = false;
      const preferSeat = (i + stationIdx) % 3 !== 0;
      if (preferSeat) {
        const startIdx = (i * 5 + stationIdx * 7) % seatSlots.length;
        for (let k = 0; k < seatSlots.length; k++) {
          const sIdx = (startIdx + k) % seatSlots.length;
          const slot = seatSlots[sIdx];
          if (slot.occupiedBy !== -1) continue;
          if (
            riderSeated &&
            slot.carIdx === riderSeatCarIdx &&
            slot.side === riderSeatSide &&
            Math.abs(slot.z - riderSeatZ) < 0.65
          ) {
            continue;
          }
          slot.occupiedBy = i;
          p.seatSlotIdx = sIdx;
          p.carIdx = slot.carIdx;
          p.doorZ = Math.abs(slot.z - DOOR_ZS[0]) < Math.abs(slot.z - DOOR_ZS[1]) ? DOOR_ZS[0] : DOOR_ZS[1];
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        for (let k = 0; k < standSpots.length; k++) {
          const stIdx = (i + k) % standSpots.length;
          const spot = standSpots[stIdx];
          if (spot.occupiedBy !== -1) continue;
          spot.occupiedBy = i;
          p.standSlotIdx = stIdx;
          p.carIdx = spot.carIdx;
          p.doorZ = Math.abs(spot.z - DOOR_ZS[0]) < Math.abs(spot.z - DOOR_ZS[1]) ? DOOR_ZS[0] : DOOR_ZS[1];
          assigned = true;
          break;
        }
      }
      if (assigned) {
        if (p.rig.root.parent !== interiorCars[p.carIdx]) {
          interiorCars[p.carIdx].add(p.rig.root);
        }
        p.localX = -2.45;
        p.localZ = p.doorZ + ((i % 3) - 1) * 0.28;
        p.yaw = Math.PI * 0.5;
        p.destStationIdx = (stationIdx + 1 + (i % (METRO_STATIONS.length - 1))) % METRO_STATIONS.length;
        p.state = 'boarding';
        p.rig.root.visible = true;
      }
    }
  };

  const CAB_MUTTERS = [
    'Watch it!',
    'Mind the aisle!',
    'Excuse you.',
    'Hey, watch where you step.',
  ];

  const enforceCarInteriorBounds = (p: TrainPassenger, doorsOpen: boolean) => {
    if (p.state === 'seated' || p.state === 'offboard') return;
    if ((p.state === 'exiting' || p.state === 'boarding') && p.localX < -1.15) return;

    const inDoorway =
      Math.abs(p.localZ - DOOR_ZS[0]) < 0.92 || Math.abs(p.localZ - DOOR_ZS[1]) < 0.92;
    if (inDoorway) {
      const minX = doorsOpen && (p.state === 'exiting' || p.state === 'boarding') ? -2.65 : -0.94;
      p.localX = THREE.MathUtils.clamp(p.localX, minX, 0.94);
    } else {
      p.localX = THREE.MathUtils.clamp(p.localX, -0.46, 0.46);
    }

    // Center doorway stanchion poles at (0, ±3.6): radius 0.04 + 0.34 = 0.38 m
    for (let d = 0; d < DOOR_ZS.length; d++) {
      const dz = p.localZ - DOOR_ZS[d];
      const d2 = p.localX * p.localX + dz * dz;
      if (d2 < 0.38 * 0.38) {
        const dist = Math.max(0.001, Math.sqrt(d2));
        p.localX = (p.localX / dist) * 0.38;
        p.localZ = DOOR_ZS[d] + (dz / dist) * 0.38;
      }
    }

    const maxZ = p.carIdx === 0 ? 6.55 : 7.15;
    const minZ = p.carIdx === 2 ? -6.85 : -7.15;
    p.localZ = THREE.MathUtils.clamp(p.localZ, minZ, maxZ);
  };

  const updateTrainPassengers = (
    dt: number,
    elapsed: number,
    trainSpeedRatio: number,
    doorsOpen: boolean,
    stationIdx: number
  ) => {
    if (doorsOpen && stationIdx >= 0 && stationIdx !== lastStationStopHandled) {
      lastStationStopHandled = stationIdx;
      triggerStationBoardingExchange(stationIdx);
    } else if (!doorsOpen) {
      lastStationStopHandled = -1;
    }

    const railSway = Math.sin(elapsed * 3.1) * 0.048 * trainSpeedRatio;
    const baseStrapSway = railSway * 1.65;
    for (let s = 0; s < strapAnchors.length; s++) {
      const sa = strapAnchors[s];
      sa.pivot.rotation.z =
        baseStrapSway + Math.sin(elapsed * 2.7 + s * 0.9) * 0.025 * (0.3 + trainSpeedRatio);
    }

    const cabinWind = doorsOpen ? 0.62 : 0.20 + trainSpeedRatio * 0.12;
    const strapTargetScratch = { x: 0, y: 1.62, z: 0.30 };

    const playerStandingInAisle = riderActive && !riderSeated;
    const playerCarLoc = mapContinuousZToCar(riderWalkZ);
    const playerCarIdx = playerCarLoc.carIdx;
    const playerLocalZ = playerCarLoc.localZ;

    const dampAngle = (cur: number, target: number, lambda: number, stepDt: number) => {
      let diff = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (diff < -Math.PI) diff += Math.PI * 2;
      return cur + diff * (1 - Math.exp(-lambda * stepDt));
    };

    // Pass 1: Social state timers & clear per-frame target sidestep
    const invDt = 1 / Math.max(0.001, dt);
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (p.state === 'offboard') continue;
      p.prevLocalX = p.localX;
      p.prevLocalZ = p.localZ;
      p.targetSidestep = 0;
      if (p.rudeCooldown > 0) p.rudeCooldown = Math.max(0, p.rudeCooldown - dt);
      if (p.upsetTimer > 0) {
        p.upsetTimer = Math.max(0, p.upsetTimer - dt);
        if (p.upsetTimer <= 0) p.mutterText = '';
      }
      if (p.nodTimer > 0) p.nodTimer = Math.max(0, p.nodTimer - dt);
      if (p.nodCooldown > 0) p.nodCooldown = Math.max(0, p.nodCooldown - dt);
    }

    // Pass 2: Movement / state progression
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (p.state === 'offboard') {
        p.rig.root.visible = false;
        continue;
      }
      p.rig.root.visible = true;

      if (p.state === 'seated') {
        const slot = seatSlots[p.seatSlotIdx];
        p.localX = THREE.MathUtils.damp(p.localX, slot.side * 0.94, 8, dt);
        p.localZ = THREE.MathUtils.damp(p.localZ, slot.z, 8, dt);
        p.yaw = slot.side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
      } else if (p.state === 'standing') {
        const spot = standSpots[p.standSlotIdx];
        const gripArmSide: -1 | 1 =
          p.rig.activity === 'phone' || p.rig.activity === 'cigarette'
            ? -1
            : p.variantStyle % 2 === 0
            ? 1
            : -1;
        const baseX = spot.x;
        const baseZ = spot.strapZ + spot.railSide * gripArmSide * 0.16;
        const baseYaw = spot.faceX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;

        let targetX = baseX;
        let targetZ = baseZ;
        let targetYaw = baseYaw;
        let yieldingAmt = 0;

        if (playerStandingInAisle && p.carIdx === playerCarIdx) {
          const pdx = baseX - riderWalkX;
          const pdz = baseZ - playerLocalZ;
          const dist = Math.hypot(pdx, pdz);
          if (dist < 1.1) {
            p.targetSidestep = (pdz >= 0 ? -1 : 1) * 0.65;
            if (p.nodCooldown <= 0) {
              p.nodTimer = 0.72;
              p.nodCooldown = 3.5;
            }
          }
          if (dist < 1.55) {
            const t = THREE.MathUtils.clamp((1.55 - dist) / 1.05, 0, 1);
            yieldingAmt = t * t * (3 - 2 * t);
            const tuckX = spot.railSide * 0.62;
            const playerOnSameSide =
              Math.sign(riderWalkX) === spot.railSide && Math.abs(riderWalkX) > 0.18;

            if (playerOnSameSide) {
              const zPushDir = pdz >= 0 ? 1 : -1;
              targetX = THREE.MathUtils.lerp(baseX, spot.railSide * 0.56, yieldingAmt);
              targetZ = baseZ + zPushDir * 0.36 * yieldingAmt;
              targetYaw = baseYaw + spot.railSide * zPushDir * 0.52 * yieldingAmt;
            } else {
              const zShift = THREE.MathUtils.clamp(pdz * 0.24, -0.22, 0.22) * yieldingAmt;
              targetX = THREE.MathUtils.lerp(baseX, tuckX, yieldingAmt);
              targetZ = baseZ + zShift;
              const sideTurn = pdz >= 0 ? -0.34 : 0.34;
              targetYaw = baseYaw + spot.railSide * sideTurn * yieldingAmt;
            }
          }
        }

        const moveDamp = yieldingAmt > 0.05 ? 5.6 : 3.8;
        p.localX = THREE.MathUtils.damp(p.localX, targetX, moveDamp, dt);
        p.localZ = THREE.MathUtils.damp(p.localZ, targetZ, moveDamp, dt);
        p.yaw = dampAngle(p.yaw, targetYaw, 5.2, dt);

        p.strollTimer -= dt;
        if (p.strollTimer <= 0 && !doorsOpen && yieldingAmt < 0.1) {
          p.strollTimer = 14 + (i % 7) * 3.5;
          for (let k = 0; k < standSpots.length; k++) {
            const altIdx = (p.standSlotIdx + 1 + k) % standSpots.length;
            const alt = standSpots[altIdx];
            if (alt.carIdx === p.carIdx && alt.occupiedBy === -1) {
              standSpots[p.standSlotIdx].occupiedBy = -1;
              alt.occupiedBy = i;
              p.standSlotIdx = altIdx;
              p.targetZ = alt.z;
              p.state = 'strolling';
              break;
            }
          }
        }
      } else if (p.state === 'strolling') {
        const spot = standSpots[p.standSlotIdx];
        const dz = spot.z - p.localZ;
        let desiredAisleX = 0.0;
        if (playerStandingInAisle && p.carIdx === playerCarIdx) {
          const pdz = p.localZ - playerLocalZ;
          if (Math.abs(pdz) < 1.75) {
            const avoidT = THREE.MathUtils.clamp((1.75 - Math.abs(pdz)) / 1.15, 0, 1);
            const avoidEase = avoidT * avoidT * (3 - 2 * avoidT);
            const avoidSide = riderWalkX >= 0 ? -0.52 : 0.52;
            desiredAisleX = avoidSide * avoidEase;
          }
        }
        if (Math.abs(dz) > 0.16) {
          p.localX = THREE.MathUtils.damp(p.localX, desiredAisleX, 5.5, dt);
          p.localZ += Math.sign(dz) * Math.min(Math.abs(dz), p.walkSpeed * 0.78 * dt);
          p.yaw = dampAngle(p.yaw, dz > 0 ? 0 : Math.PI, 7.5, dt);
          p.walkCycle += dt * p.walkSpeed * 5.2;
        } else {
          const dx = spot.x - p.localX;
          p.localX += Math.sign(dx) * Math.min(Math.abs(dx), p.walkSpeed * 0.75 * dt);
          p.yaw = dampAngle(p.yaw, dx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 7.5, dt);
          p.walkCycle += dt * p.walkSpeed * 5.2;
          if (Math.abs(spot.x - p.localX) < 0.12) {
            p.state = 'standing';
          }
        }
      } else if (p.state === 'exiting') {
        const dz = p.doorZ - p.localZ;
        if (Math.abs(dz) > 0.24 && p.localX > -0.75) {
          p.localX = THREE.MathUtils.damp(p.localX, 0.0, 5.5, dt);
          p.localZ += Math.sign(dz) * Math.min(Math.abs(dz), p.walkSpeed * dt);
          p.yaw = dz > 0 ? 0 : Math.PI;
        } else {
          p.localX -= p.walkSpeed * 0.96 * dt;
          p.yaw = -Math.PI * 0.5;
          if (p.localX < -2.65) {
            p.state = 'offboard';
            p.rig.root.visible = false;
            continue;
          }
        }
        p.walkCycle += dt * p.walkSpeed * 5.8;
      } else if (p.state === 'boarding') {
        const targetX = p.seatSlotIdx >= 0 ? seatSlots[p.seatSlotIdx].side * 0.94 : standSpots[p.standSlotIdx].x;
        const targetZ = p.seatSlotIdx >= 0 ? seatSlots[p.seatSlotIdx].z : standSpots[p.standSlotIdx].z;

        if (p.localX < -0.22) {
          p.localX += p.walkSpeed * 0.96 * dt;
          p.yaw = Math.PI * 0.5;
        } else {
          const dz = targetZ - p.localZ;
          if (Math.abs(dz) > 0.2) {
            p.localX = THREE.MathUtils.damp(p.localX, 0.0, 5, dt);
            p.localZ += Math.sign(dz) * Math.min(Math.abs(dz), p.walkSpeed * dt);
            p.yaw = dz > 0 ? 0 : Math.PI;
          } else {
            const dx = targetX - p.localX;
            p.localX += Math.sign(dx) * Math.min(Math.abs(dx), p.walkSpeed * dt);
            p.yaw = dx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
            if (Math.abs(targetX - p.localX) < 0.14) {
              p.state = p.seatSlotIdx >= 0 ? 'seated' : 'standing';
            }
          }
        }
        p.walkCycle += dt * p.walkSpeed * 5.8;
      }
    }

    // Pass 3: Hard capsule separation (r = 0.34 m => 0.68 m) + polite +/-0.65 rad aisle passing & nod + rude bump!
    const MIN_SEP = 0.68;
    const MIN_SEP2 = MIN_SEP * MIN_SEP;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < passengers.length; i++) {
        const a = passengers[i];
        if (a.state === 'offboard' || a.state === 'seated') continue;

        for (let j = i + 1; j < passengers.length; j++) {
          const b = passengers[j];
          if (b.state === 'offboard' || b.state === 'seated' || a.carIdx !== b.carIdx) continue;

          const dx = b.localX - a.localX;
          const dz = b.localZ - a.localZ;
          const d2 = dx * dx + dz * dz;

          if (pass === 0 && d2 < 1.1 * 1.1) {
            const dist = Math.max(0.001, Math.sqrt(d2));
            const nx = dx / dist;
            const nz = dz / dist;

            // Check if one is rude & ready to barge straight through on ~25s cooldown
            const aMoving = a.state === 'strolling' || a.state === 'boarding' || a.state === 'exiting';
            const bMoving = b.state === 'strolling' || b.state === 'boarding' || b.state === 'exiting';
            if (a.personality === 'rude' && a.rudeCooldown <= 0 && aMoving && dist < 0.92) {
              a.rudeCooldown = 25.0;
              b.bumpX = -nz * 0.18;
              b.bumpZ = nx * 0.18;
              b.upsetTimer = 2.5;
              b.upsetLookYaw = Math.atan2(-dx, -dz) - b.yaw;
              b.mutterText = CAB_MUTTERS[(j + i) % CAB_MUTTERS.length];
            } else if (b.personality === 'rude' && b.rudeCooldown <= 0 && bMoving && dist < 0.92) {
              b.rudeCooldown = 25.0;
              a.bumpX = nz * 0.18;
              a.bumpZ = -nx * 0.18;
              a.upsetTimer = 2.5;
              a.upsetLookYaw = Math.atan2(dx, dz) - a.yaw;
              a.mutterText = CAB_MUTTERS[(i + j) % CAB_MUTTERS.length];
            } else {
              // Polite passing inside aisle/doorway: +/-0.65 rad torso sidestep + head-nod
              const side = nx * Math.cos(a.yaw) - nz * Math.sin(a.yaw) >= 0 ? -1 : 1;
              if (a.personality !== 'rude' || a.rudeCooldown > 0) {
                a.targetSidestep = side * 0.65;
                if (a.nodCooldown <= 0) {
                  a.nodTimer = 0.72;
                  a.nodCooldown = 4.0;
                }
              }
              if (b.personality !== 'rude' || b.rudeCooldown > 0) {
                b.targetSidestep = -side * 0.65;
                if (b.nodCooldown <= 0) {
                  b.nodTimer = 0.72;
                  b.nodCooldown = 4.0;
                }
              }
            }
          }

          if (d2 < MIN_SEP2) {
            const dist = Math.max(0.001, Math.sqrt(d2));
            const nx = dx / dist;
            const nz = dz / dist;
            const push = (MIN_SEP - dist) * 0.5;
            a.localX -= nx * push;
            a.localZ -= nz * push;
            b.localX += nx * push;
            b.localZ += nz * push;
          }
        }

        // Also separate from walking player inside the same car
        if (playerStandingInAisle && a.carIdx === playerCarIdx) {
          const pdx = a.localX - riderWalkX;
          const pdz = a.localZ - playerLocalZ;
          const pd2 = pdx * pdx + pdz * pdz;
          if (pd2 < MIN_SEP2 && pd2 > 1e-6) {
            const pd = Math.sqrt(pd2);
            const push = MIN_SEP - pd;
            a.localX += (pdx / pd) * push;
            a.localZ += (pdz / pd) * push;
          }
        }

        enforceCarInteriorBounds(a, doorsOpen);
      }
    }

    // Pass 4: Apply shoulder-bump impulses, wall bounds & final articulated poses
    const decay = Math.exp(-7.5 * dt);
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (p.state === 'offboard') continue;

      if (p.state !== 'seated') {
        if (Math.abs(p.bumpX) > 0.001 || Math.abs(p.bumpZ) > 0.001) {
          p.localX += p.bumpX * Math.min(1, dt * 11);
          p.localZ += p.bumpZ * Math.min(1, dt * 11);
          p.bumpX *= decay;
          p.bumpZ *= decay;
          enforceCarInteriorBounds(p, doorsOpen);
        }
      }

      p.sidestepYaw = THREE.MathUtils.damp(p.sidestepYaw, p.targetSidestep, 8.5, dt);
      const nodPitch = p.nodTimer > 0 ? Math.sin((p.nodTimer / 0.72) * Math.PI) * 0.24 : 0;
      const upsetProgress = p.upsetTimer > 0 ? Math.min(1, p.upsetTimer / 2.5) : 0;

      p.rig.root.position.set(p.localX, 0.88, p.localZ);
      p.rig.root.rotation.set(0, p.yaw, 0);

      if (p.state === 'seated') {
        applyHumanPose(p.rig, {
          mode: 'seated',
          elapsed,
          phase: p.phase,
          railSway,
          windStrength: cabinWind * 0.72,
          variantStyle: p.variantStyle,
        });
      } else if (p.state === 'standing') {
        const spot = standSpots[p.standSlotIdx];
        const anchor = spot.strapAnchorIdx >= 0 ? strapAnchors[spot.strapAnchorIdx] : null;
        const strapAng = anchor ? anchor.pivot.rotation.z : baseStrapSway;
        const handleCarX = spot.railSide * 0.60 + Math.sin(strapAng) * STRAP_DROP_LEN;
        const handleCarY = 2.94 - Math.cos(strapAng) * STRAP_DROP_LEN;
        const handleCarZ = spot.strapZ;
        const dx = handleCarX - p.localX;
        const dz = handleCarZ - p.localZ;
        const cosY = Math.cos(p.yaw);
        const sinY = Math.sin(p.yaw);
        const invH = 1 / Math.max(0.5, p.rig.heightScale);
        strapTargetScratch.x = (dx * cosY - dz * sinY) * invH;
        strapTargetScratch.y = (handleCarY - 0.88) * invH;
        strapTargetScratch.z = (dx * sinY + dz * cosY) * invH;

        const stepSpeed = Math.hypot(p.localX - p.prevLocalX, p.localZ - p.prevLocalZ) * invDt;
        if (stepSpeed > 0.06) {
          p.walkCycle += dt * Math.min(2.2, stepSpeed) * 5.8;
        }
        const horizDistToStrap = Math.hypot(dx, dz);
        if (stepSpeed > 0.24 && horizDistToStrap > 0.56) {
          applyHumanPose(p.rig, {
            mode: 'walking',
            elapsed,
            phase: p.phase,
            walkCycle: p.walkCycle,
            windStrength: cabinWind + 0.14,
            variantStyle: p.variantStyle,
            sidestepYaw: p.sidestepYaw,
            nodPitch,
            upsetProgress,
            upsetLookYaw: p.upsetLookYaw,
          });
        } else {
          applyHumanPose(p.rig, {
            mode: 'standing_strap',
            elapsed,
            phase: p.phase,
            railSway,
            windStrength: cabinWind + stepSpeed * 0.22,
            variantStyle: p.variantStyle,
            strapTargetLocal: strapTargetScratch,
            sidestepYaw: p.sidestepYaw,
            nodPitch,
            upsetProgress,
            upsetLookYaw: p.upsetLookYaw,
          });
        }
      } else {
        applyHumanPose(p.rig, {
          mode: 'walking',
          elapsed,
          phase: p.phase,
          walkCycle: p.walkCycle,
          windStrength: (p.state === 'exiting' || p.state === 'boarding') && p.localX < -1.1 ? 0.9 : cabinWind + 0.28,
          variantStyle: p.variantStyle,
          sidestepYaw: p.sidestepYaw,
          nodPitch,
          upsetProgress,
          upsetLookYaw: p.upsetLookYaw,
        });
      }
    }
  };

  const update = (dt: number, elapsed: number, nightFactor: number) => {
    const lampBoost = 0.85 + nightFactor * 0.95;
    for (let i = 0; i < stationLightMats.length; i++) {
      stationLightMats[i].emissiveIntensity = lampBoost;
    }
    viaductNeonMat.emissiveIntensity = 0.7 + nightFactor * 0.85;

    const stationHasTrain = METRO_STATIONS.map(() => false);

    for (let trIdx = 0; trIdx < trains.length; trIdx++) {
      const tr = trains[trIdx];
      tr.windowMat.emissiveIntensity = 0.7 + nightFactor * 0.95;
      tr.headlightMat.emissiveIntensity = 1.3 + nightFactor * 0.9;
      tr.neonStripeMat.emissiveIntensity = 0.85 + nightFactor * 0.95;

      // ALL perimeter metro trains run smoothly on 100% AUTOPILOT!
      if (tr.dwellTimer > 0) {
        tr.dwellTimer -= dt;
        tr.speed = THREE.MathUtils.damp(tr.speed, 0, 8, dt);
        tr.doorsOpen = true;
        if (tr.currentStationIdx >= 0) {
          stationHasTrain[tr.currentStationIdx] = true;
        }
        if (tr.dwellTimer <= 0) {
          tr.doorsOpen = false;
          tr.t = (tr.t + 0.0024) % 1;
          tr.currentStationIdx = -1;
        }
      } else {
        tr.doorsOpen = false;
        let targetSpeed = tr.maxSpeed;
        for (let s = 0; s < stationPositions.length; s++) {
          let ahead = stationPositions[s].u - tr.t;
          if (ahead < 0) ahead += 1;
          if (ahead < 0.026 && ahead > 0.001) {
            targetSpeed = Math.max(0.0016, (ahead / 0.026) * tr.maxSpeed);
          }
          if (ahead <= 0.0016) {
            tr.t = stationPositions[s].u;
            tr.speed = 0;
            tr.dwellTimer = 8.0; // generous 8s station dwell for full boarding/alighting exchange!
            tr.doorsOpen = true;
            tr.currentStationIdx = s;
            stationHasTrain[s] = true;
            break;
          }
        }
        if (tr.dwellTimer <= 0) {
          tr.speed = THREE.MathUtils.damp(tr.speed, targetSpeed, 2.4, dt);
          tr.t = (((tr.t + tr.speed * dt) % 1) + 1) % 1;
        }
      }

      for (let c = 0; c < tr.cars.length; c++) {
        let cu = (tr.t - c * carSpacingSpline) % 1;
        if (cu < 0) cu += 1;
        trackCurve.getPointAt(cu, _carPos);
        trackCurve.getTangentAt(cu, _carTan).normalize();

        const carObj = tr.cars[c];
        carObj.position.set(_carPos.x, _carPos.y + 0.08, _carPos.z);
        _lookTarget.copy(carObj.position).add(_carTan);
        carObj.lookAt(_lookTarget);

        if (riderActive && trIdx === riddenTrainIdx) {
          interiorCars[c].position.copy(carObj.position);
          interiorCars[c].quaternion.copy(carObj.quaternion);
          interiorCars[c].updateMatrixWorld();
        }

        if (c === 1) {
          trainGlowLights[trIdx].position.set(_carPos.x, _carPos.y + 2.4, _carPos.z);
          trainGlowLights[trIdx].intensity = 3.2 + nightFactor * 5.2;
        }
      }
    }

    // Platform actors capsule separation & queue social passing (station-local coords)
    for (let sIdx = 0; sIdx < stationPositions.length; sIdx++) {
      // Collect indices of platform actors at this station
      for (let i = 0; i < stationActors.length; i++) {
        const a = stationActors[i];
        if (a.stationIdx !== sIdx) continue;
        a.targetSidestep = 0;
        if (a.rudeCooldown > 0) a.rudeCooldown = Math.max(0, a.rudeCooldown - dt);
        if (a.upsetTimer > 0) {
          a.upsetTimer = Math.max(0, a.upsetTimer - dt);
          if (a.upsetTimer <= 0) a.mutterText = '';
        }
        if (a.nodTimer > 0) a.nodTimer = Math.max(0, a.nodTimer - dt);
        if (a.nodCooldown > 0) a.nodCooldown = Math.max(0, a.nodCooldown - dt);
      }
    }

    // Animate Uniformed Station Workers & Rigged Platform Commuters (with queue lane separation + social passing!)
    const platDecay = Math.exp(-7.5 * dt);
    for (let i = 0; i < stationActors.length; i++) {
      const sa = stationActors[i];
      const trainHere = stationHasTrain[sa.stationIdx];
      if (sa.role === 'booth_worker') {
        applyHumanPose(sa.rig, {
          mode: 'worker_desk',
          elapsed,
          phase: sa.phase,
          windStrength: 0.05,
        });
      } else if (sa.role === 'platform_guard') {
        if (trainHere) {
          sa.curZ = THREE.MathUtils.damp(sa.curZ, sa.baseZ, 4, dt);
          sa.curX = sa.baseX;
          sa.rig.root.position.set(sa.curX, 0.36, sa.curZ);
          sa.rig.root.rotation.y = Math.PI * 0.5;
          applyHumanPose(sa.rig, {
            mode: 'worker_guide',
            elapsed,
            phase: sa.phase,
            windStrength: 0.85,
          });
        } else {
          const patrolOff = Math.sin(elapsed * 0.35 + sa.phase) * 4.5;
          const nextZ = sa.baseZ + patrolOff;
          const dz = nextZ - sa.curZ;
          sa.curZ = nextZ;
          sa.curX = sa.baseX;
          sa.rig.root.position.set(sa.curX, 0.36, sa.curZ);
          sa.rig.root.rotation.y = dz >= 0 ? 0 : Math.PI;
          applyHumanPose(sa.rig, {
            mode: 'walking',
            elapsed,
            phase: sa.phase,
            walkCycle: elapsed * 6.2 + sa.phase,
            windStrength: 0.85,
          });
        }
      } else if (sa.role === 'platform_bench') {
        applyHumanPose(sa.rig, {
          mode: 'seated',
          elapsed,
          phase: sa.phase,
          windStrength: 0.65,
          variantStyle: i,
        });
      } else {
        // Platform waiting commuters stay inside flanking queue lanes and step forward smoothly when train arrives
        const targetX = sa.baseX + (trainHere ? 0.72 : 0);
        const dx = targetX - sa.curX;
        const moving = Math.abs(dx) > 0.05;
        sa.curX = THREE.MathUtils.damp(sa.curX, targetX, 3.2, dt);
        sa.curZ = THREE.MathUtils.damp(sa.curZ, sa.baseZ, 3.2, dt);

        // Enforce 0.68m capsule separation + polite/rude passing against nearby actors on same platform
        for (let j = 0; j < stationActors.length; j++) {
          if (i === j) continue;
          const ob = stationActors[j];
          if (ob.stationIdx !== sa.stationIdx || ob.role === 'booth_worker' || ob.role === 'platform_bench') continue;
          const pdx = sa.curX - ob.curX;
          const pdz = sa.curZ - ob.curZ;
          const d2 = pdx * pdx + pdz * pdz;
          if (d2 < 1.1 * 1.1) {
            const dist = Math.max(0.001, Math.sqrt(d2));
            if (ob.personality === 'rude' && ob.rudeCooldown <= 0 && dist < 0.85) {
              ob.rudeCooldown = 25.0;
              sa.bumpX = (pdz / dist) * 0.18;
              sa.bumpZ = (-pdx / dist) * 0.18;
              sa.upsetTimer = 2.5;
              sa.upsetLookYaw = Math.atan2(-pdx, -pdz) - Math.PI * 0.5;
              sa.mutterText = CAB_MUTTERS[i % CAB_MUTTERS.length];
            } else {
              sa.targetSidestep = (pdz >= 0 ? 1 : -1) * 0.65;
              if (sa.nodCooldown <= 0) {
                sa.nodTimer = 0.72;
                sa.nodCooldown = 4.0;
              }
            }
          }
          if (d2 < 0.68 * 0.68) {
            const dist = Math.max(0.001, Math.sqrt(d2));
            const push = 0.68 - dist;
            sa.curX = THREE.MathUtils.clamp(sa.curX + (pdx / dist) * push, -7.8, -2.5);
            sa.curZ = THREE.MathUtils.clamp(sa.curZ + (pdz / dist) * push, -24.5, 24.5);
          }
        }
        if (Math.abs(sa.bumpX) > 0.001 || Math.abs(sa.bumpZ) > 0.001) {
          sa.curX = THREE.MathUtils.clamp(sa.curX + sa.bumpX * Math.min(1, dt * 11), -7.8, -2.5);
          sa.curZ = THREE.MathUtils.clamp(sa.curZ + sa.bumpZ * Math.min(1, dt * 11), -24.5, 24.5);
          sa.bumpX *= platDecay;
          sa.bumpZ *= platDecay;
        }
        sa.sidestepYaw = THREE.MathUtils.damp(sa.sidestepYaw, sa.targetSidestep, 8.5, dt);
        const nodPitch = sa.nodTimer > 0 ? Math.sin((sa.nodTimer / 0.72) * Math.PI) * 0.24 : 0;
        const upsetProgress = sa.upsetTimer > 0 ? Math.min(1, sa.upsetTimer / 2.5) : 0;

        sa.rig.root.position.set(sa.curX, 0.36, sa.curZ);
        applyHumanPose(sa.rig, {
          mode: moving ? 'walking' : 'standing_idle',
          elapsed,
          phase: sa.phase,
          walkCycle: elapsed * 6.8 + sa.phase,
          windStrength: 0.9,
          variantStyle: i,
          sidestepYaw: sa.sidestepYaw,
          nodPitch,
          upsetProgress,
          upsetLookYaw: sa.upsetLookYaw,
        });
      }
    }

    // Animate Baristas & Waiting Hall commuters inside the 8 Complex Station Halls!
    for (let c = 0; c < complexStationNpcs.length; c++) {
      const npc = complexStationNpcs[c];
      applyHumanPose(npc.rig, {
        mode: npc.mode,
        elapsed,
        phase: npc.phase,
        windStrength: 0.05,
        variantStyle: c,
      });
    }

    // Track carriage linear velocity and yaw rate for FPS bridge camera frame
    if (riderActive) {
      const activeLoc = mapContinuousZToCar(riderWalkZ);
      const activeCar = interiorCars[activeLoc.carIdx] ?? interiorCars[0];
      _carForward.set(0, 0, 1).applyQuaternion(activeCar.quaternion);
      const curYaw = Math.atan2(_carForward.x, _carForward.z);
      if (hasPrevCarTransform && dt > 0.0005) {
        carVelocity
          .copy(activeCar.position)
          .sub(prevOperatedPos)
          .divideScalar(dt);
        let dYaw = ((curYaw - prevOperatedYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (dYaw < -Math.PI) dYaw += Math.PI * 2;
        carYawRate = dYaw / dt;
      } else {
        carVelocity.set(0, 0, 0);
        carYawRate = 0;
        hasPrevCarTransform = true;
      }
      prevOperatedPos.copy(activeCar.position);
      prevOperatedYaw = curYaw;
    } else {
      hasPrevCarTransform = false;
      carVelocity.set(0, 0, 0);
      carYawRate = 0;
    }

    // Animate sliding station doors & 44 rigged onboard passengers when riding!
    if (riderActive) {
      const tr = trains[riddenTrainIdx];
      doorOpenAmount = THREE.MathUtils.damp(doorOpenAmount, tr.doorsOpen ? 1.0 : 0.0, 5.2, dt);
      const slideOffset = doorOpenAmount * 0.86;
      for (let c = 0; c < 3; c++) {
        const pairs = interiorDoorPairs[c];
        for (let d = 0; d < pairs.length; d++) {
          pairs[d].left.position.z = pairs[d].centerZ - 0.46 - slideOffset;
          pairs[d].right.position.z = pairs[d].centerZ + 0.46 + slideOffset;
        }
      }
      const spdRatio = Math.min(1, tr.speed / Math.max(0.001, tr.maxSpeed));
      updateTrainPassengers(dt, elapsed, spdRatio, tr.doorsOpen, tr.currentStationIdx);

      // Animate classic scrolling red dot-matrix LED stop-name signage inside all 3 cars!
      ledScrollPx += dt * 162;
      ledTickAccum += dt;
      ledTickerMat.emissiveIntensity = 2.15 + nightFactor * 0.55;
      const stInfo = findNextStation(tr.t);
      const nextSpec = stationPositions[stInfo.idx]?.spec;
      const nextCode = nextSpec?.code ?? 'STN-1';
      const nextStopName = `${nextCode} ${(nextSpec?.name ?? 'ARCHIPELAGO RING').toUpperCase()}`;
      let ledMsg: string;
      if (tr.doorsOpen && tr.currentStationIdx >= 0) {
        const curSpec = stationPositions[tr.currentStationIdx]?.spec;
        const curStopName = `${curSpec?.code ?? nextCode} ${(curSpec?.name ?? nextStopName).toUpperCase()}`;
        const followingSpec =
          stationPositions[(tr.currentStationIdx + 1) % stationPositions.length]?.spec;
        const followingName = `${followingSpec?.code ?? ''} ${(followingSpec?.name ?? nextStopName).toUpperCase()}`.trim();
        ledMsg = `>>> ARRIVING AT: ${curStopName}  •  DOORS OPEN  •  КАФЕ COFFEE & WAITING HALL ON PLATFORM  •  NEXT STOP: ${followingName} >>>`;
      } else if (stInfo.distM <= 210) {
        const nextCyr = nextSpec?.cyrillic ? ` (${nextSpec.cyrillic.toUpperCase()})` : '';
        ledMsg = `>>> NEXT STOP / ARRIVING AT: ${nextStopName}${nextCyr}  •  DOORS OPEN ON LEFT  •  WATCH THE GAP >>>`;
      } else {
        const nextCyr = nextSpec?.cyrillic ? ` · ${nextSpec.cyrillic.toUpperCase()}` : '';
        const nextDist = nextSpec?.district ? ` · ${nextSpec.district.toUpperCase()}` : '';
        ledMsg = `>>> NEXT STOP: ${nextStopName}${nextCyr}${nextDist}  •  GRAND ARCHIPELAGO SUBWAY LINE  •  HOLD HANDRAILS >>>`;
      }
      renderLedTickerFrame(ledMsg);
    }

    for (let s = 0; s < stationHasTrainFlags.length; s++) {
      stationHasTrainFlags[s] = stationHasTrain[s];
    }
  };

  const getNearestTrainStatus = (x: number, z: number): string => {
    let minD = Infinity;
    let nearestStation = stationPositions[0];
    for (let i = 0; i < stationPositions.length; i++) {
      const sp = stationPositions[i];
      const d = Math.hypot(x - sp.pos.x, z - sp.pos.z);
      if (d < minD) {
        minD = d;
        nearestStation = sp;
      }
    }
    return minD < 120 ? `Ring Metro · ${nearestStation.spec.name}` : '';
  };

  const getPlatformExitPoint = (): { pos: THREE.Vector3; yaw: number; stationName: string } => {
    const tr = trains[riddenTrainIdx];
    let stIdx = tr?.currentStationIdx ?? -1;
    if (stIdx < 0) {
      // Find nearest station to current ridden train
      let bestD2 = Infinity;
      const refPos = operatedPos;
      for (let s = 0; s < stationPositions.length; s++) {
        const sp = stationPositions[s].pos;
        const d2 = (sp.x - refPos.x) ** 2 + (sp.z - refPos.z) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          stIdx = s;
        }
      }
      if (stIdx < 0) stIdx = 0;
    }
    const stInfo = stationInfos[stIdx];
    return {
      pos: new THREE.Vector3(stInfo.platWorldX, stInfo.platWorldY, stInfo.platWorldZ),
      yaw: stInfo.yaw - Math.PI * 0.5,
      stationName: stInfo.name,
    };
  };

  const getWalkableStationInfo = (worldX: number, worldZ: number): WalkableStationInfo => {
    for (let s = 0; s < stationPositions.length; s++) {
      const sp = stationPositions[s];
      const dx = worldX - sp.pos.x;
      const dz = worldZ - sp.pos.z;
      if (dx * dx + dz * dz > 34 * 34) continue;

      const stYaw = stationInfos[s].yaw;
      const cosY = Math.cos(stYaw);
      const sinY = Math.sin(stYaw);
      // Inverse Y-rotation into station local coordinates (platform is along -X)
      const lx = dx * cosY - dz * sinY;
      const lz = dx * sinY + dz * cosY;

      const trainDockedHere = stationHasTrainFlags[s];

      // 1. Platform deck + attached 36m x 24m Concourse Hall (Coffee Area & Waiting Hall!)
      if (lx >= -8.4 && lx <= -1.9 && Math.abs(lz) <= 25.8) {
        const nearDoor =
          trainDockedHere &&
          lx >= -5.2 &&
          lx <= -1.8 &&
          METRO_DOOR_STOP_LOCAL_ZS.some((dz) => Math.abs(lz - dz) < 2.6);
        return {
          onStation: true,
          floorY: sp.pos.y + 0.36,
          underShelter: true,
          stationIdx: s,
          stationName: `${sp.spec.code} · ${sp.spec.name}`,
          nearOpenTrainDoor: nearDoor,
        };
      }

      // 1B. Enterable 36m x 24m Complex Station Concourse Hall (Coffee Area КАФЕ + Waiting Hall on +X side of track!)
      if (lx >= 2.0 && lx <= 24.4 && Math.abs(lz) <= 18.2) {
        return {
          onStation: true,
          floorY: sp.pos.y + 0.85,
          underShelter: true,
          stationIdx: s,
          stationName: `${sp.spec.code} · ${sp.spec.name} (КАФЕ & Waiting Hall)`,
          nearOpenTrainDoor: false,
        };
      }

      // 2. Inclined escalator / stair ramp connecting elevated platform down to street pavilion!
      if (sp.pos.y > 2.2 && lx >= -11.9 && lx < -8.2 && Math.abs(lz) <= 2.35) {
        const t = THREE.MathUtils.clamp((-8.2 - lx) / 3.7, 0, 1);
        const rampY = THREE.MathUtils.lerp(sp.pos.y + 0.36, 0.35, t);
        return {
          onStation: true,
          floorY: rampY,
          underShelter: true,
          stationIdx: s,
          stationName: `${sp.spec.code} · ${sp.spec.name}`,
          nearOpenTrainDoor: false,
        };
      }

      // 3. Street-level glass entrance pavilion (open street doorway on -X side!)
      if (sp.pos.y > 2.2 && lx >= -18.2 && lx < -10.5 && Math.abs(lz) <= 6.0) {
        return {
          onStation: true,
          floorY: 0.35,
          underShelter: true,
          stationIdx: s,
          stationName: `${sp.spec.code} · ${sp.spec.name}`,
          nearOpenTrainDoor: false,
        };
      }
    }

    return {
      onStation: false,
      floorY: 0.11,
      underShelter: false,
      stationIdx: -1,
      stationName: '',
      nearOpenTrainDoor: false,
    };
  };

  const getRayTargets = (origin: THREE.Vector3, radiusM: number): FpsRayTarget[] => {
    const out: FpsRayTarget[] = [];
    const r2 = radiusM * radiusM;
    if (riderActive) {
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (p.state === 'offboard') continue;
        p.rig.root.getWorldPosition(_tmpTargetVec);
        if (_tmpTargetVec.distanceToSquared(origin) > r2) continue;
        const min = new THREE.Vector3(_tmpTargetVec.x - 0.34, _tmpTargetVec.y, _tmpTargetVec.z - 0.34);
        const max = new THREE.Vector3(_tmpTargetVec.x + 0.34, _tmpTargetVec.y + 1.76, _tmpTargetVec.z + 0.34);
        out.push({
          id: `metro_pax_${i}`,
          bounds: new THREE.Box3(min, max),
          kind: 'npc',
          agentId: `metro_pax_${i}`,
        });
      }
    } else {
      for (let i = 0; i < stationActors.length; i++) {
        const sa = stationActors[i];
        sa.rig.root.getWorldPosition(_tmpTargetVec);
        if (_tmpTargetVec.distanceToSquared(origin) > r2) continue;
        const min = new THREE.Vector3(_tmpTargetVec.x - 0.34, _tmpTargetVec.y, _tmpTargetVec.z - 0.34);
        const max = new THREE.Vector3(_tmpTargetVec.x + 0.34, _tmpTargetVec.y + 1.76, _tmpTargetVec.z + 0.34);
        out.push({
          id: `station_actor_${i}`,
          bounds: new THREE.Box3(min, max),
          kind: 'npc',
          agentId: `station_actor_${i}`,
        });
      }
      for (let i = 0; i < complexStationNpcs.length; i++) {
        const npc = complexStationNpcs[i];
        npc.rig.root.getWorldPosition(_tmpTargetVec);
        if (_tmpTargetVec.distanceToSquared(origin) > r2) continue;
        const min = new THREE.Vector3(_tmpTargetVec.x - 0.34, _tmpTargetVec.y, _tmpTargetVec.z - 0.34);
        const max = new THREE.Vector3(_tmpTargetVec.x + 0.34, _tmpTargetVec.y + 1.76, _tmpTargetVec.z + 0.34);
        out.push({
          id: `station_hall_npc_${i}`,
          bounds: new THREE.Box3(min, max),
          kind: 'npc',
          agentId: `station_hall_npc_${i}`,
        });
      }
    }
    return out;
  };

  const getActiveSubtitle = (x: number, _y: number, z: number): string => {
    let bestText = '';
    let bestD2 = 8.5 * 8.5;
    if (riderActive) {
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];
        if (p.state === 'offboard' || p.upsetTimer <= 0 || !p.mutterText) continue;
        p.rig.root.getWorldPosition(_tmpTargetVec);
        const d2 = (_tmpTargetVec.x - x) ** 2 + (_tmpTargetVec.z - z) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestText = p.mutterText;
        }
      }
    } else {
      for (let i = 0; i < stationActors.length; i++) {
        const sa = stationActors[i];
        if (sa.upsetTimer <= 0 || !sa.mutterText) continue;
        sa.rig.root.getWorldPosition(_tmpTargetVec);
        const d2 = (_tmpTargetVec.x - x) ** 2 + (_tmpTargetVec.z - z) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestText = sa.mutterText;
        }
      }
    }
    return bestText;
  };

  return {
    root,
    update,
    updateRiderControls,
    getNearestTrainStatus,
    setRiderMode,
    getOperatedTrainState,
    getTrainFrame,
    getPlatformExitPoint,
    getWalkableStationInfo,
    getStationInfos: () => stationInfos,
    getStationTrainFlags: () => stationHasTrainFlags,
    getRayTargets,
    getActiveSubtitle,
  };
}
