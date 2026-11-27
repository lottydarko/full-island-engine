import * as THREE from 'three';
import {
  CollisionWorld,
  DistrictSignSpec,
  getRoadElevationAt,
  NAMED_MAIN_ROADS,
  ROAD_WAYFINDING_SIGNS,
  SECONDARY_ROUNDABOUTS,
  SIGNALIZED_INTERSECTIONS,
  SignalIntersectionSpec,
} from './mapData';

export type SignalPhase = 'green' | 'amber' | 'red';

export interface IntersectionSignalState {
  ns: SignalPhase;
  ew: SignalPhase;
  pedCrossNS: boolean; // true when pedestrians crossing N-S street (walking E-W) have WALK
  pedCrossEW: boolean; // true when pedestrians crossing E-W street (walking N-S) have WALK
}

export interface InfrastructureHandles {
  root: THREE.Group;
  update: (elapsed: number, nightFactor: number) => void;
  setPowerGridEnabled: (enabled: boolean) => void;
  isPowerGridEnabled: () => boolean;
}

const SIGNAL_CYCLE_SEC = 24.0;

// Deterministic, zero-GC traffic light cycle shared by 3D signals, AI vehicles & crossing PS2 civilians!
export function getIntersectionSignal(
  ix: SignalIntersectionSpec,
  elapsed: number
): IntersectionSignalState {
  const t = ((elapsed + ix.phaseOffset) % SIGNAL_CYCLE_SEC + SIGNAL_CYCLE_SEC) % SIGNAL_CYCLE_SEC;
  if (t < 9.5) {
    return { ns: 'green', ew: 'red', pedCrossNS: false, pedCrossEW: true };
  }
  if (t < 11.4) {
    return { ns: 'amber', ew: 'red', pedCrossNS: false, pedCrossEW: false };
  }
  if (t < 12.0) {
    return { ns: 'red', ew: 'red', pedCrossNS: false, pedCrossEW: false };
  }
  if (t < 21.5) {
    return { ns: 'red', ew: 'green', pedCrossNS: true, pedCrossEW: false };
  }
  if (t < 23.4) {
    return { ns: 'red', ew: 'amber', pedCrossNS: false, pedCrossEW: false };
  }
  return { ns: 'red', ew: 'red', pedCrossNS: false, pedCrossEW: false };
}

// Check if an approaching traffic vehicle faces a RED/AMBER light directly ahead at any signalized intersection
export function isRedLightAhead(
  x: number,
  z: number,
  dirX: number,
  dirZ: number,
  elapsed: number
): boolean {
  const movingNS = Math.abs(dirZ) > Math.abs(dirX);

  for (let i = 0; i < SIGNALIZED_INTERSECTIONS.length; i++) {
    const ix = SIGNALIZED_INTERSECTIONS[i];
    const toX = ix.x - x;
    const toZ = ix.z - z;
    const d2 = toX * toX + toZ * toZ;
    if (d2 > 34 * 34) continue;

    // Distance along travel direction toward intersection center
    const ahead = toX * dirX + toZ * dirZ;
    const stopLine = (movingNS ? ix.halfSpanEW : ix.halfSpanNS) + 2.5;
    if (ahead < stopLine - 1.5 || ahead > stopLine + 14.5) continue;

    // Must actually be lined up with this road
    const side = Math.abs(-toX * dirZ + toZ * dirX);
    if (side > (movingNS ? ix.halfSpanNS : ix.halfSpanEW) + 1.5) continue;

    const state = getIntersectionSignal(ix, elapsed);
    const phase = movingNS ? state.ns : state.ew;
    if (phase === 'red' || (phase === 'amber' && ahead > stopLine + 4.5)) {
      return true;
    }
  }
  return false;
}

function createStreetSignTexture(label: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c2748';
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = '#e2eef8';
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, 502, 86);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 50);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWayfindingSignTexture(spec: DistrictSignSpec): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  const bg =
    spec.kind === 'metro_dir'
      ? '#160b12'
      : spec.kind === 'bus_dir'
      ? '#0a1c34'
      : spec.kind === 'highway'
      ? '#08241d'
      : '#0c1628';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 192);

  // Outer retroreflective border
  ctx.strokeStyle = spec.accent;
  ctx.lineWidth = 7;
  ctx.strokeRect(6, 6, 500, 180);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, 484, 164);

  // Header badge strip
  ctx.fillStyle = spec.accent;
  ctx.fillRect(14, 14, 484, 34);
  ctx.fillStyle = '#070b12';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    spec.kind === 'metro_dir'
      ? 'МЕТРОПОЛИТЕН · METRO STATION DIRECTION'
      : spec.kind === 'bus_dir'
      ? 'ОБЩЕСТВЕННЫЙ ТРАНСПОРТ · BUS TRANSIT'
      : spec.kind === 'highway'
      ? 'НАПРАВЛЕНИЕ · ROADWAY GUIDE'
      : 'РАЙОН ОСТРОВА · DISTRICT BOUNDARY',
    256,
    37
  );

  // Main Cyrillic title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 29px sans-serif';
  ctx.fillText(spec.titleCyr, 256, 92);

  // English label
  ctx.fillStyle = '#bae6fd';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText(spec.titleEng, 256, 128);

  // Subtext (transit numbers / distance)
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(spec.subText, 256, 162);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRoadIconTexture(kind: 'roundabout' | 'speed60' | 'speed80' | 'crosswalk'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  if (kind === 'roundabout') {
    ctx.fillStyle = '#124e9c';
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Three circular arrows
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * Math.PI * 2 + 0.25;
      const a1 = a0 + 1.35;
      ctx.beginPath();
      ctx.arc(64, 64, 30, a0, a1);
      ctx.stroke();
    }
  } else if (kind === 'speed60' || kind === 'speed80') {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'speed60' ? '60' : '80', 64, 67);
  } else {
    // Blue Russian pedestrian crossing sign
    ctx.fillStyle = '#124e9c';
    ctx.fillRect(8, 8, 112, 112);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 108, 108);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 22);
    ctx.lineTo(106, 104);
    ctx.lineTo(22, 104);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(58, 48, 12, 26);
    ctx.beginPath();
    ctx.arc(64, 41, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(42, 86, 44, 6);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface TrafficLightRig {
  ix: SignalIntersectionSpec;
  nsRed: THREE.MeshStandardMaterial;
  nsAmber: THREE.MeshStandardMaterial;
  nsGreen: THREE.MeshStandardMaterial;
  ewRed: THREE.MeshStandardMaterial;
  ewAmber: THREE.MeshStandardMaterial;
  ewGreen: THREE.MeshStandardMaterial;
  pedNSWalk: THREE.MeshStandardMaterial;
  pedEWWalk: THREE.MeshStandardMaterial;
}

export function buildInfrastructureSystem(
  collisionWorld: CollisionWorld
): InfrastructureHandles {
  const root = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({
    color: '#262d36',
    roughness: 0.45,
    metalness: 0.72,
  });
  const housingMat = new THREE.MeshStandardMaterial({
    color: '#12161c',
    roughness: 0.55,
    metalness: 0.35,
  });

  // =========================================================================
  // 1. PAINTED ZEBRA CROSSWALKS + WORKING 4-WAY TRAFFIC LIGHTS + STREET SIGNS
  // =========================================================================
  const zebraTransforms: { x: number; z: number; rotY: number; len: number }[] = [];
  const tactileTransforms: { x: number; z: number; rotY: number; w: number }[] = [];
  const signalRigs: TrafficLightRig[] = [];

  const lensGeo = new THREE.CircleGeometry(0.14, 10);
  const pedBoxGeo = new THREE.BoxGeometry(0.32, 0.56, 0.18);
  const headBoxGeo = new THREE.BoxGeometry(0.42, 1.18, 0.36);

  for (let i = 0; i < SIGNALIZED_INTERSECTIONS.length; i++) {
    const ix = SIGNALIZED_INTERSECTIONS[i];

    // 4 Zebra Crosswalks around intersection (N, S, E, W) + tactile curb ramps
    const spanNS = ix.halfSpanNS;
    const spanEW = ix.halfSpanEW;

    // North & South crosswalks (pedestrians cross E-W across the N-S road)
    for (const sz of [-spanEW - 1.8, spanEW + 1.8]) {
      const stripes = Math.max(5, Math.floor((spanNS * 1.75) / 1.9));
      for (let s = 0; s < stripes; s++) {
        const u = (s / (stripes - 1) - 0.5) * (spanNS * 1.58);
        zebraTransforms.push({ x: ix.x + u, z: ix.z + sz, rotY: 0, len: 3.1 });
      }
      tactileTransforms.push({ x: ix.x - spanNS - 0.55, z: ix.z + sz, rotY: 0, w: 3.0 });
      tactileTransforms.push({ x: ix.x + spanNS + 0.55, z: ix.z + sz, rotY: 0, w: 3.0 });
    }
    // East & West crosswalks (pedestrians cross N-S across the E-W road)
    for (const sx of [-spanNS - 1.8, spanNS + 1.8]) {
      const stripes = Math.max(5, Math.floor((spanEW * 1.75) / 1.9));
      for (let s = 0; s < stripes; s++) {
        const u = (s / (stripes - 1) - 0.5) * (spanEW * 1.58);
        zebraTransforms.push({ x: ix.x + sx, z: ix.z + u, rotY: Math.PI * 0.5, len: 3.1 });
      }
      tactileTransforms.push({ x: ix.x + sx, z: ix.z - spanEW - 0.55, rotY: Math.PI * 0.5, w: 3.0 });
      tactileTransforms.push({ x: ix.x + sx, z: ix.z + spanEW + 0.55, rotY: Math.PI * 0.5, w: 3.0 });
    }

    // Per-intersection animated signal lens materials (1 material shared across matching heads!)
    const mkLens = (hex: string) =>
      new THREE.MeshStandardMaterial({
        color: '#111418',
        emissive: new THREE.Color(hex),
        emissiveIntensity: 0.04,
        roughness: 0.15,
      });

    const rig: TrafficLightRig = {
      ix,
      nsRed: mkLens('#ff2222'),
      nsAmber: mkLens('#ffaa18'),
      nsGreen: mkLens('#18e878'),
      ewRed: mkLens('#ff2222'),
      ewAmber: mkLens('#ffaa18'),
      ewGreen: mkLens('#18e878'),
      pedNSWalk: mkLens('#22e688'),
      pedEWWalk: mkLens('#22e688'),
    };
    signalRigs.push(rig);

    // Street Name Sign Textures mounted high on the intersection corners!
    const nsSignTex = createStreetSignTexture(ix.streetNS);
    const ewSignTex = createStreetSignTexture(ix.streetEW);
    const nsSignMat = new THREE.MeshStandardMaterial({
      map: nsSignTex,
      emissiveMap: nsSignTex,
      emissive: new THREE.Color('#dbeafe'),
      emissiveIntensity: 0.52,
      roughness: 0.35,
    });
    const ewSignMat = new THREE.MeshStandardMaterial({
      map: ewSignTex,
      emissiveMap: ewSignTex,
      emissive: new THREE.Color('#dbeafe'),
      emissiveIntensity: 0.52,
      roughness: 0.35,
    });

    // Place 4 cantilevered signal poles on the 4 sidewalk corners (strictly clear of road lanes!)
    const corners: { dx: number; dz: number; armRot: number; isNSHead: boolean }[] = [
      { dx: spanNS + 1.4, dz: spanEW + 1.4, armRot: Math.PI, isNSHead: true },        // SE corner -> faces Southbound NS
      { dx: -spanNS - 1.4, dz: -spanEW - 1.4, armRot: 0, isNSHead: true },             // NW corner -> faces Northbound NS
      { dx: spanNS + 1.4, dz: -spanEW - 1.4, armRot: -Math.PI * 0.5, isNSHead: false },// NE corner -> faces Eastbound EW
      { dx: -spanNS - 1.4, dz: spanEW + 1.4, armRot: Math.PI * 0.5, isNSHead: false }, // SW corner -> faces Westbound EW
    ];

    for (let cIdx = 0; cIdx < corners.length; cIdx++) {
      const c = corners[cIdx];
      const pg = new THREE.Group();
      pg.position.set(ix.x + c.dx, 0, ix.z + c.dz);
      pg.rotation.y = c.armRot;

      // Vertical mast pole
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 6.4, 8), poleMat);
      mast.position.y = 3.2;
      pg.add(mast);

      // Overhead cantilever arm reaching cleanly out over the lane
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 5.4, 8), poleMat);
      arm.rotation.z = Math.PI * 0.5;
      arm.position.set(-2.5, 6.1, 0);
      pg.add(arm);

      // Vehicle traffic signal head hanging from overhead arm (faces +Z in local frame!)
      const head = new THREE.Mesh(headBoxGeo, housingMat);
      head.position.set(-4.3, 5.55, 0);
      pg.add(head);

      const rMat = c.isNSHead ? rig.nsRed : rig.ewRed;
      const aMat = c.isNSHead ? rig.nsAmber : rig.ewAmber;
      const gMat = c.isNSHead ? rig.nsGreen : rig.ewGreen;

      // Mount dual-facing lenses (front + rear of head so visible from both angles)
      for (const faceZ of [0.185, -0.185]) {
        const faceRotY = faceZ > 0 ? 0 : Math.PI;
        const rMesh = new THREE.Mesh(lensGeo, rMat);
        rMesh.position.set(-4.3, 5.9, faceZ);
        rMesh.rotation.y = faceRotY;
        pg.add(rMesh);

        const aMesh = new THREE.Mesh(lensGeo, aMat);
        aMesh.position.set(-4.3, 5.55, faceZ);
        aMesh.rotation.y = faceRotY;
        pg.add(aMesh);

        const gMesh = new THREE.Mesh(lensGeo, gMat);
        gMesh.position.set(-4.3, 5.2, faceZ);
        gMesh.rotation.y = faceRotY;
        pg.add(gMesh);
      }

      // Pedestrian WALK/WAIT signal box on lower pole facing crosswalk
      const pedBox = new THREE.Mesh(pedBoxGeo, housingMat);
      pedBox.position.set(0, 2.75, 0.22);
      pg.add(pedBox);
      const pedLens = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22, 0.22),
        c.isNSHead ? rig.pedEWWalk : rig.pedNSWalk
      );
      pedLens.position.set(0, 2.75, 0.32);
      pg.add(pedLens);

      // Street Name Plaque mounted along the cantilever arm on 2 diagonal corners
      if (cIdx === 0 || cIdx === 2) {
        const plaque = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 0.48, 0.06),
          c.isNSHead ? nsSignMat : ewSignMat
        );
        plaque.position.set(-1.6, 6.42, 0.02);
        pg.add(plaque);
      }

      root.add(pg);
    }
  }

  // Mid-block avenue & archipelago crosswalks with curb-cut tactile plates
  const midBlockCrosswalks: { x: number; z: number; axis: 'ns' | 'ew'; halfSpan: number }[] = [
    { x: 0, z: -165, axis: 'ns', halfSpan: 11.5 },
    { x: 0, z: 165, axis: 'ns', halfSpan: 11.5 },
    { x: -245, z: 0, axis: 'ew', halfSpan: 10.5 },
    { x: 245, z: 0, axis: 'ew', halfSpan: 10.5 },
    { x: 1190, z: 84, axis: 'ew', halfSpan: 8.5 }, // D7 Institutskaya
    { x: 1595, z: 442, axis: 'ew', halfSpan: 7.5 }, // D8 Quay
  ];
  for (const mc of midBlockCrosswalks) {
    const stripes = Math.max(5, Math.floor((mc.halfSpan * 1.7) / 1.8));
    for (let s = 0; s < stripes; s++) {
      const u = (s / (stripes - 1) - 0.5) * (mc.halfSpan * 1.52);
      if (mc.axis === 'ns') {
        zebraTransforms.push({ x: mc.x + u, z: mc.z, rotY: 0, len: 3.0 });
      } else {
        zebraTransforms.push({ x: mc.x, z: mc.z + u, rotY: Math.PI * 0.5, len: 3.0 });
      }
    }
    if (mc.axis === 'ns') {
      tactileTransforms.push({ x: mc.x - mc.halfSpan - 0.5, z: mc.z, rotY: 0, w: 3.0 });
      tactileTransforms.push({ x: mc.x + mc.halfSpan + 0.5, z: mc.z, rotY: 0, w: 3.0 });
    } else {
      tactileTransforms.push({ x: mc.x, z: mc.z - mc.halfSpan - 0.5, rotY: Math.PI * 0.5, w: 3.0 });
      tactileTransforms.push({ x: mc.x, z: mc.z + mc.halfSpan + 0.5, rotY: Math.PI * 0.5, w: 3.0 });
    }
  }

  // Render ALL zebra crosswalk stripes in a single GPU InstancedMesh!
  const stripeGeo = new THREE.PlaneGeometry(0.68, 1.0);
  stripeGeo.rotateX(-Math.PI * 0.5);
  const stripeMat = new THREE.MeshStandardMaterial({
    color: '#d8dee6',
    roughness: 0.55,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const zebraInst = new THREE.InstancedMesh(stripeGeo, stripeMat, zebraTransforms.length);
  const zDummy = new THREE.Object3D();
  for (let i = 0; i < zebraTransforms.length; i++) {
    const zt = zebraTransforms[i];
    const roadY = getRoadElevationAt(zt.x, zt.z);
    zDummy.position.set(zt.x, Math.max(0.107, roadY + 0.014), zt.z);
    zDummy.rotation.set(0, zt.rotY, 0);
    zDummy.scale.set(1, 1, zt.len);
    zDummy.updateMatrix();
    zebraInst.setMatrixAt(i, zDummy.matrix);
  }
  zebraInst.instanceMatrix.needsUpdate = true;
  zebraInst.receiveShadow = true;
  root.add(zebraInst);

  // Tactile yellow curb-cut plates at crosswalk ends
  if (tactileTransforms.length > 0) {
    const tacGeo = new THREE.PlaneGeometry(0.85, 1.0);
    tacGeo.rotateX(-Math.PI * 0.5);
    const tacMat = new THREE.MeshStandardMaterial({
      color: '#d9a424',
      roughness: 0.65,
      metalness: 0.06,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    const tacInst = new THREE.InstancedMesh(tacGeo, tacMat, tactileTransforms.length);
    for (let i = 0; i < tactileTransforms.length; i++) {
      const tt = tactileTransforms[i];
      const roadY = getRoadElevationAt(tt.x, tt.z);
      zDummy.position.set(tt.x, Math.max(0.158, roadY + 0.074), tt.z);
      zDummy.rotation.set(0, tt.rotY, 0);
      zDummy.scale.set(1, 1, tt.w);
      zDummy.updateMatrix();
      tacInst.setMatrixAt(i, zDummy.matrix);
    }
    tacInst.instanceMatrix.needsUpdate = true;
    root.add(tacInst);
  }

  // =========================================================================
  // 2. DISTRICT GATEWAY, ROADWAY GUIDE, [M] METRO & [A] BUS WAYFINDING SIGNS
  // =========================================================================
  const signGlowMats: THREE.MeshStandardMaterial[] = [];

  for (let i = 0; i < ROAD_WAYFINDING_SIGNS.length; i++) {
    const spec = ROAD_WAYFINDING_SIGNS[i];
    const sg = new THREE.Group();
    sg.position.set(spec.x, 0, spec.z);
    sg.rotation.y = spec.rotY;

    const boardW = spec.kind === 'district' || spec.kind === 'highway' ? 6.2 : 5.2;
    const boardH = spec.kind === 'district' || spec.kind === 'highway' ? 2.35 : 2.0;
    const postH = 4.6;

    // Twin structural steel posts
    for (const px of [-boardW * 0.36, boardW * 0.36]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, postH, 8), poleMat);
      post.position.set(px, postH * 0.5, 0);
      sg.add(post);
    }

    const backBox = new THREE.Mesh(
      new THREE.BoxGeometry(boardW + 0.16, boardH + 0.16, 0.18),
      housingMat
    );
    backBox.position.set(0, postH + boardH * 0.42, 0);
    sg.add(backBox);

    const tex = createWayfindingSignTexture(spec);
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.72,
      roughness: 0.28,
    });
    signGlowMats.push(faceMat);

    // Double-sided so drivers approaching from either direction can read the wayfinding sign!
    const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), faceMat);
    frontFace.position.set(0, postH + boardH * 0.42, 0.1);
    sg.add(frontFace);

    const backFace = new THREE.Mesh(new THREE.PlaneGeometry(boardW, boardH), faceMat);
    backFace.rotation.y = Math.PI;
    backFace.position.set(0, postH + boardH * 0.42, -0.1);
    sg.add(backFace);

    root.add(sg);
    collisionWorld.addBox(spec.x, spec.z, 1.4, 0.6, spec.rotY);
  }

  // =========================================================================
  // 3. RUSSIAN ROUNDABOUT & SPEED-LIMIT ROADSIDE TRAFFIC SIGNS
  // =========================================================================
  const roundaboutTex = createRoadIconTexture('roundabout');
  const speed60Tex = createRoadIconTexture('speed60');
  const speed80Tex = createRoadIconTexture('speed80');
  const crosswalkTex = createRoadIconTexture('crosswalk');

  const mkIconMat = (tex: THREE.CanvasTexture) =>
    new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color('#e2e8f0'),
      emissiveIntensity: 0.48,
      transparent: true,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });

  const rbIconMat = mkIconMat(roundaboutTex);
  const spd60Mat = mkIconMat(speed60Tex);
  const spd80Mat = mkIconMat(speed80Tex);
  const cwIconMat = mkIconMat(crosswalkTex);
  signGlowMats.push(rbIconMat, spd60Mat, spd80Mat, cwIconMat);

  const iconPlane = new THREE.PlaneGeometry(1.15, 1.15);
  const smallPostGeo = new THREE.CylinderGeometry(0.055, 0.065, 3.3, 6);

  const addRoadsideSign = (x: number, z: number, rotY: number, mat: THREE.MeshStandardMaterial) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    const post = new THREE.Mesh(smallPostGeo, poleMat);
    post.position.y = 1.65;
    g.add(post);
    const face = new THREE.Mesh(iconPlane, mat);
    face.position.set(0, 3.05, 0.07);
    g.add(face);
    root.add(g);
  };

  // Roundabout signs around Central Reliquary & all 5 secondary roundabouts
  const allRoundabouts = [
    { x: 0, z: 0, r: 74 },
    ...SECONDARY_ROUNDABOUTS.map((rb) => ({ x: rb.x, z: rb.z, r: rb.radius + 14.5 })),
  ];
  for (let i = 0; i < allRoundabouts.length; i++) {
    const rb = allRoundabouts[i];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.32;
      addRoadsideSign(
        rb.x + Math.cos(a) * rb.r,
        rb.z + Math.sin(a) * rb.r,
        -a + Math.PI * 0.5,
        rbIconMat
      );
    }
  }

  // Speed limit & crosswalk warning signs along cardinal avenues
  for (const offset of [-320, -190, 190, 340]) {
    addRoadsideSign(15.2, offset * 0.72, 0, Math.abs(offset) > 250 ? spd80Mat : spd60Mat);
    addRoadsideSign(-15.2, offset * 0.72, Math.PI, Math.abs(offset) > 250 ? spd80Mat : spd60Mat);
    addRoadsideSign(offset * 0.72, 15.2, Math.PI * 0.5, spd60Mat);
    addRoadsideSign(offset * 0.72, -15.2, -Math.PI * 0.5, cwIconMat);
  }

  // =========================================================================
  // 4. OVERHEAD CYRILLIC / ENGLISH GANTRY SIGNS FOR ALL 24 NAMED MAIN ROADS (RD-01..RD-24)!
  // =========================================================================
  const createRoadGantryTexture = (code: string, cyrillic: string, english: string, districtId: string) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#092238';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#e2eef8';
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, 502, 118);

    // Route code badge on left
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(14, 16, 108, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code, 68, 52);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#fde68a';
    ctx.fillText(districtId, 68, 88);

    // Cyrillic + English road name on right
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(cyrillic, 138, 48);
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(english.toUpperCase(), 138, 88);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  for (let i = 0; i < NAMED_MAIN_ROADS.length; i++) {
    const rd = NAMED_MAIN_ROADS[i];
    const roadY = getRoadElevationAt(rd.gantryX, rd.gantryZ);
    const gantry = new THREE.Group();
    gantry.position.set(rd.gantryX, roadY, rd.gantryZ);
    gantry.rotation.y = rd.gantryYaw;

    const span = 15.5;
    const clearH = 6.9;
    for (const side of [-span * 0.5, span * 0.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, clearH, 6), poleMat);
      col.position.set(side, clearH * 0.5, 0);
      gantry.add(col);
    }
    const truss = new THREE.Mesh(new THREE.BoxGeometry(span + 0.6, 0.34, 0.34), poleMat);
    truss.position.set(0, clearH, 0);
    gantry.add(truss);

    const gTex = createRoadGantryTexture(rd.code, rd.cyrillic, rd.name, rd.districtId);
    const gMat = new THREE.MeshStandardMaterial({
      map: gTex,
      emissiveMap: gTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.65,
      roughness: 0.3,
    });
    signGlowMats.push(gMat);

    const boardFront = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), gMat);
    boardFront.position.set(0, clearH + 0.1, 0.22);
    gantry.add(boardFront);
    const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 1.8), gMat);
    boardBack.rotation.y = Math.PI;
    boardBack.position.set(0, clearH + 0.1, -0.22);
    gantry.add(boardBack);

    root.add(gantry);
  }

  let powerGridEnabled = true;

  const update = (elapsed: number, nightFactor: number) => {
    const gridScale = powerGridEnabled ? 1.0 : 0.04;
    const activeGlow = (2.4 + nightFactor * 1.4) * gridScale;
    const offGlow = 0.02;
    const signIntensity = (0.42 + nightFactor * 0.42) * (powerGridEnabled ? 1.0 : 0.12);

    for (let i = 0; i < signGlowMats.length; i++) {
      signGlowMats[i].emissiveIntensity = signIntensity;
    }

    for (let i = 0; i < signalRigs.length; i++) {
      const rig = signalRigs[i];
      const st = getIntersectionSignal(rig.ix, elapsed);

      rig.nsRed.emissiveIntensity = st.ns === 'red' ? activeGlow : offGlow;
      rig.nsAmber.emissiveIntensity = st.ns === 'amber' ? activeGlow : offGlow;
      rig.nsGreen.emissiveIntensity = st.ns === 'green' ? activeGlow : offGlow;

      rig.ewRed.emissiveIntensity = st.ew === 'red' ? activeGlow : offGlow;
      rig.ewAmber.emissiveIntensity = st.ew === 'amber' ? activeGlow : offGlow;
      rig.ewGreen.emissiveIntensity = st.ew === 'green' ? activeGlow : offGlow;

      rig.pedNSWalk.emissive.setHex(st.pedCrossNS ? 0x22ee88 : 0xff3328);
      rig.pedNSWalk.emissiveIntensity = (1.6 + nightFactor * 0.8) * gridScale;
      rig.pedEWWalk.emissive.setHex(st.pedCrossEW ? 0x22ee88 : 0xff3328);
      rig.pedEWWalk.emissiveIntensity = (1.6 + nightFactor * 0.8) * gridScale;
    }
  };

  return {
    root,
    update,
    setPowerGridEnabled: (enabled: boolean) => {
      powerGridEnabled = enabled;
    },
    isPowerGridEnabled: () => powerGridEnabled,
  };
}
