import * as THREE from 'three';
import { getTerrainHeight, SurfaceType } from './mapData';

export interface TireTrailHandles {
  root: THREE.Group;
  update: (
    carX: number,
    carY: number,
    carZ: number,
    heading: number,
    speedMps: number,
    slipRatio: number,
    isBraking: boolean,
    surface: SurfaceType
  ) => void;
}

// Persistent GPU-Instanced Tire Track & Streak Trail System:
// - On wet grass: leaves deep muddy earth tire ruts behind all 4 wheels (varied mud shades)
// - On wet black asphalt: leaves occasional varied hydroplane water streaks, rubber skids & wet sheen trails
//   varying dynamically in shade, color, width, and intensity!
export function createTireTrailSystem(): TireTrailHandles {
  const root = new THREE.Group();
  const MAX_DECALS = 900;

  const geo = new THREE.PlaneGeometry(0.32, 1.0);
  geo.rotateX(-Math.PI * 0.5);

  const mat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  const mesh = new THREE.InstancedMesh(geo, mat, MAX_DECALS);
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  dummy.position.set(0, -100, 0);
  dummy.scale.set(0.001, 0.001, 0.001);
  dummy.updateMatrix();
  for (let i = 0; i < MAX_DECALS; i++) {
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.setHex(0x111111));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  root.add(mesh);

  // Track previous wheel world positions (FL, FR, RL, RR)
  const wheelLocal: [number, number][] = [
    [-0.88, -1.42],
    [0.88, -1.42],
    [-0.88, 1.38],
    [0.88, 1.38],
  ];
  const prevWheelPos = wheelLocal.map(() => new THREE.Vector2(99999, 99999));
  let cursor = 0;
  let stepCounter = 0;

  // Varied streak palettes for asphalt (dark carbon rubber, wet slate hydroplane, damp grey film, deep oily black)
  const asphaltPalette = [
    0x050608, // deep jet-black rubber skid
    0x121822, // dark wet slate-blue hydroplane channel
    0x1e2630, // glistening damp water-film streak
    0x1b1917, // dark damp road-grime streak
    0x0a0d12, // charcoal tire track
    0x273240, // cool silvery wet tire wake
  ];

  // Varied mud/wet-grass rut palettes
  const grassPalette = [
    0x1e150d, // rich dark rain mud
    0x2a1d12, // damp brown earth rut
    0x16120c, // soaked peat trench
    0x222014, // flattened muddy wet grass
  ];

  const update = (
    carX: number,
    carY: number,
    carZ: number,
    heading: number,
    speedMps: number,
    slipRatio: number,
    isBraking: boolean,
    surface: SurfaceType
  ) => {
    const absSpd = Math.abs(speedMps);
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);

    if (absSpd < 0.8 || surface === 'water') {
      for (let w = 0; w < 4; w++) {
        const lx = wheelLocal[w][0];
        const lz = wheelLocal[w][1];
        prevWheelPos[w].set(
          carX + lx * cosH + lz * sinH,
          carZ - lx * sinH + lz * cosH
        );
      }
      return;
    }

    let dirty = false;
    const isGrass = surface === 'grass';
    const isPuddle = surface === 'puddle';

    // Determine whether to stamp a track on this movement step:
    // - Grass: ALWAYS leaves continuous muddy tire tracks!
    // - Asphalt/Puddle: leaves varied streaks whenever sliding, braking, hitting puddles, OR occasional wet streaks at speed!
    for (let w = 0; w < 4; w++) {
      const lx = wheelLocal[w][0];
      const lz = wheelLocal[w][1];
      const wx = carX + lx * cosH + lz * sinH;
      const wz = carZ - lx * sinH + lz * cosH;

      const prev = prevWheelPos[w];
      const dx = wx - prev.x;
      const dz = wz - prev.y;
      const dist = Math.hypot(dx, dz);

      if (dist > 6.5) {
        // Teleported or first frame
        prev.set(wx, wz);
        continue;
      }

      const minStep = isGrass ? 0.72 : 0.92;
      if (dist >= minStep) {
        stepCounter++;
        const isRear = w >= 2;
        const occasionalPulse =
          Math.sin(stepCounter * 0.17 + w * 1.9) > (isPuddle ? -0.15 : 0.22);
        const shouldStamp =
          isGrass ||
          slipRatio > 0.24 ||
          (isBraking && absSpd > 6.5) ||
          (isPuddle && absSpd > 6.0 && occasionalPulse) ||
          (isRear && absSpd > 11.0 && occasionalPulse);

        if (shouldStamp) {
          const midX = (wx + prev.x) * 0.5;
          const midZ = (wz + prev.y) * 0.5;
          const segAngle = Math.atan2(dx, dz);

          const decalY = isGrass
            ? Math.max(0.03, getTerrainHeight(midX, midZ) + 0.03)
            : Math.max(0.108, carY + 0.016);

          const widthScale = isGrass
            ? 1.15 + ((stepCounter + w) % 3) * 0.14
            : 0.78 + slipRatio * 0.55 + ((stepCounter * 7 + w) % 4) * 0.08;

          dummy.position.set(midX, decalY, midZ);
          dummy.rotation.set(0, segAngle, 0);
          dummy.scale.set(widthScale, 1, dist * 1.16);
          dummy.updateMatrix();
          mesh.setMatrixAt(cursor, dummy.matrix);

          // Varied shade, color & intensity per streak!
          if (isGrass) {
            const hex = grassPalette[(stepCounter + w * 3) % grassPalette.length];
            color.setHex(hex);
            const shade = 0.72 + ((stepCounter * 13 + w * 5) % 10) * 0.055;
            color.multiplyScalar(shade);
          } else {
            const pickIdx =
              slipRatio > 0.42 || isBraking
                ? (stepCounter + w) % 2 // darker rubber skid marks
                : (stepCounter * 3 + w * 2) % asphaltPalette.length;
            color.setHex(asphaltPalette[pickIdx]);
            const intensity =
              0.55 +
              Math.min(0.65, slipRatio * 0.6) +
              ((stepCounter * 11 + w * 7) % 9) * 0.05;
            color.multiplyScalar(intensity);
          }
          mesh.setColorAt(cursor, color);

          cursor = (cursor + 1) % MAX_DECALS;
          dirty = true;
        }
        prev.set(wx, wz);
      }
    }

    if (dirty) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  };

  return { root, update };
}
