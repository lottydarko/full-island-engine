import * as THREE from 'three';
import {
  CollisionWorld,
  getTerrainHeight,
  MetroStationSpec,
} from '../mapData';
import { TextureLibrary } from '../textures';
import {
  applyHumanPose,
  createRiggedHuman,
  HumanRig,
} from '../humanCharacter';
import {
  ArchipelagoCallbacks,
  InteriorRegistry,
} from './interiorRegistry';

export interface StationNPCEntry {
  rig: HumanRig;
  mode: 'seated' | 'standing_idle' | 'worker_desk';
  phase: number;
}

export interface StationComplexBuildResult {
  group: THREE.Group;
  npcs: StationNPCEntry[];
  emissivePanels: THREE.MeshStandardMaterial[];
}

function createCafeSignTexture(stationCode: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1d120c';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 502, 118);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('КАФЕ · КОФЕЙНЯ · COFFEE', 256, 48);

  ctx.fillStyle = '#fb923c';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`${stationCode} · ESPRESSO · ЧАЙ · ПИРОЖКИ · 24/7`, 256, 94);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTimetableTexture(st: MetroStationSpec): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#090e16';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 502, 246);

  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(10, 10, 492, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`РАСПИСАНИЕ · ${st.code} ${st.cyrillic}`, 22, 38);

  const lines = [
    'STN-1  СЕВЕРНЫЙ ВОКЗАЛ        02 MIN   [ON TIME]',
    'STN-2  СОБОРНАЯ ПОДЗЕМНАЯ     04 MIN   [DEEP -9.5m]',
    'STN-3  ГАРНИЗОН · БУНКЕР      06 MIN   [DEEP -9.5m]',
    'STN-4  ПОРТ КАЛУГА · ДЕПО-4   09 MIN   [GATE 12]',
    'STN-5  ЗАВОД-4 · КРИМИНАЛИСТ. 12 MIN   [ISLAND 2]',
    'STN-6  ЭНЕРГЕТИКОВ · КОСА     15 MIN   [ISLAND 2]',
    'STN-7  ЗОНА-9 · СТАРГЕЙТ      19 MIN   [RESTRICTED]',
    'STN-8  ЭЛИЗИЯ · ГАВАНЬ        23 MIN   [ISLAND 4]',
  ];

  ctx.font = 'bold 14px monospace';
  for (let i = 0; i < lines.length; i++) {
    const isSelf = lines[i].startsWith(st.code);
    ctx.fillStyle = isSelf ? '#ff3b4a' : i % 2 === 0 ? '#f8fafc' : '#cbd5e1';
    ctx.fillText(lines[i], 20, 78 + i * 22);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createUndergroundPavilionSign(st: MetroStationSpec): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c1522';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#ff2a3c';
  ctx.lineWidth = 6;
  ctx.strokeRect(5, 5, 502, 118);

  ctx.fillStyle = '#ff2a3c';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('M', 22, 86);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${st.code} · ${st.cyrillic}`, 98, 52);

  ctx.fillStyle = '#93c5fd';
  ctx.font = 'bold 19px monospace';
  ctx.fillText(`${st.name.toUpperCase()} · [E] ESCALATOR`, 98, 92);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a complete 36m x 24m multi-zone enterable train station structure:
 * - Boarding platform alongside track (x: -18..+18, z: +2.1..+7.5)
 * - Enterable 4-wall + 2.8m doorway concourse hall (x: -17..+17, z: +7.5..+24.0)
 * - Warm amber-lit Coffee Area (КАФЕ) with espresso counter, tables, barista & [E] Coffee interactable
 * - Passenger Waiting Hall with benches, Soviet departure timetable, ticket turnstiles & commuters
 * - For underground/subsurface stations: arched concrete cavern shell + street-level [M] entrance pavilion with [E] escalator!
 */
export function buildStationComplex(
  st: MetroStationSpec,
  stationIndex: number,
  yaw: number,
  textures: TextureLibrary,
  collisionWorld: CollisionWorld,
  registry?: InteriorRegistry,
  callbacks?: ArchipelagoCallbacks
): StationComplexBuildResult {
  const group = new THREE.Group();
  group.position.set(st.x, st.trackY, st.z);
  group.rotation.y = yaw;

  const npcs: StationNPCEntry[] = [];
  const emissivePanels: THREE.MeshStandardMaterial[] = [];

  const isUnderground = st.zoneKind === 'underground' || st.zoneKind === 'subsurface';
  const isElysia = st.code === 'STN-8';

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const toWorld = (lx: number, ly: number, lz: number) => ({
    x: st.x + lx * cosY + lz * sinY,
    y: st.trackY + ly,
    z: st.z - lx * sinY + lz * cosY,
  });

  // Materials strictly reusing existing TextureLibrary maps!
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.04,
    color: isElysia ? '#d8d4ca' : '#858d96',
    roughness: 0.78,
  });
  const hallFloorMat = new THREE.MeshStandardMaterial({
    map: textures.metroFloorMap,
    roughnessMap: textures.metroFloorRoughness,
    color: isElysia ? '#d5cbb8' : '#7b8590',
    roughness: 0.48,
    metalness: 0.14,
  });
  const hallWallMat = new THREE.MeshStandardMaterial({
    map: textures.metroWallMap,
    bumpMap: textures.metroWallBump,
    bumpScale: 0.03,
    color: isElysia ? '#e8e2d5' : '#96a0ab',
    roughness: 0.65,
  });
  const trimSteelMat = new THREE.MeshStandardMaterial({
    color: isElysia ? '#b08d57' : '#2b3440',
    roughness: 0.36,
    metalness: 0.74,
  });
  const warmWoodMat = new THREE.MeshStandardMaterial({
    map: textures.metroSeatMap,
    bumpMap: textures.metroSeatBump,
    bumpScale: 0.02,
    color: '#6b4226',
    roughness: 0.62,
  });
  const cafeWarmMat = new THREE.MeshStandardMaterial({
    color: '#ffcf86',
    emissive: new THREE.Color('#ff9d3b'),
    emissiveIntensity: 1.5,
    roughness: 0.25,
  });
  emissivePanels.push(cafeWarmMat);

  const hallLampMat = new THREE.MeshStandardMaterial({
    color: '#e2f1ff',
    emissive: new THREE.Color(isUnderground ? '#cfe8ff' : '#d8eeff'),
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  emissivePanels.push(hallLampMat);

  const redLedMat = new THREE.MeshStandardMaterial({
    color: '#ff2436',
    emissive: new THREE.Color('#ff1e2d'),
    emissiveIntensity: 2.1,
    roughness: 0.2,
  });
  emissivePanels.push(redLedMat);

  const safetyYellowMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    emissive: new THREE.Color('#ca8a04'),
    emissiveIntensity: 0.35,
    roughness: 0.55,
  });

  // =========================================================================
  // 1. 36m x 24m ARCHITECTURAL BASE SLAB (z: +2.05..+24.05, x: -18..+18)
  // =========================================================================
  const platformH = 0.85;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(36, 0.9, 22.0), hallFloorMat);
  slab.position.set(0, platformH - 0.45, 13.05);
  slab.receiveShadow = true;
  group.add(slab);

  // Tactile yellow safety edge along the track side
  const yellowLine = new THREE.Mesh(new THREE.BoxGeometry(35.8, 0.04, 0.36), safetyYellowMat);
  yellowLine.position.set(0, platformH + 0.02, 2.38);
  group.add(yellowLine);

  // Support columns under elevated stations down to ground
  if (!isUnderground && st.trackY > 2.2) {
    const colH = Math.max(2.0, st.trackY + 1.2);
    for (const cx of [-15, -5, 5, 15]) {
      for (const cz of [4.8, 13.5, 21.8]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(1.15, colH, 1.15), concreteMat);
        col.position.set(cx, -colH * 0.5 + 0.4, cz);
        group.add(col);
      }
    }
  }

  // =========================================================================
  // 2. ENTERABLE STATION CONCOURSE HALL (34m x 14.5m, z: +8.8..+23.3)
  //    4 walls with generous 3.2m wide doorway cutouts to platform & exterior!
  // =========================================================================
  const hallW = 34.0;
  const hallD = 14.5;
  const hallH = 5.2;
  const hallZ = 16.05; // spans z = 8.8 .. 23.3
  const wallY = platformH + hallH * 0.5;
  const doorW = 3.6;

  // Front wall facing platform (z = 8.8) — wide twin concourse portals
  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(11.0, hallH, 0.45), hallWallMat);
  frontLeft.position.set(-11.5, wallY, 8.8);
  group.add(frontLeft);
  const frontMid = new THREE.Mesh(new THREE.BoxGeometry(4.8, hallH, 0.45), hallWallMat);
  frontMid.position.set(0, wallY, 8.8);
  group.add(frontMid);
  const frontRight = new THREE.Mesh(new THREE.BoxGeometry(11.0, hallH, 0.45), hallWallMat);
  frontRight.position.set(11.5, wallY, 8.8);
  group.add(frontRight);
  // Transom lintels over the two 3.6m doorways
  for (const dx of [-4.2, 4.2]) {
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, 1.4, 0.55), trimSteelMat);
    lintel.position.set(dx, platformH + hallH - 0.7, 8.8);
    group.add(lintel);
  }

  // Back wall (z = 23.3) — central 3.6m street/exit entrance cutout
  const backSegW = (hallW - doorW) * 0.5;
  const backLeft = new THREE.Mesh(new THREE.BoxGeometry(backSegW, hallH, 0.5), concreteMat);
  backLeft.position.set(-hallW * 0.5 + backSegW * 0.5, wallY, 23.3);
  group.add(backLeft);
  const backRight = new THREE.Mesh(new THREE.BoxGeometry(backSegW, hallH, 0.5), concreteMat);
  backRight.position.set(hallW * 0.5 - backSegW * 0.5, wallY, 23.3);
  group.add(backRight);
  const backLintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, 1.4, 0.6), trimSteelMat);
  backLintel.position.set(0, platformH + hallH - 0.7, 23.3);
  group.add(backLintel);

  // Side walls (x = -17 and x = +17)
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, hallH, hallD), concreteMat);
  westWall.position.set(-hallW * 0.5, wallY, hallZ);
  group.add(westWall);
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, hallH, hallD), concreteMat);
  eastWall.position.set(hallW * 0.5, wallY, hallZ);
  group.add(eastWall);

  // Sweeping vaulted roof spanning platform + concourse hall (36.8m x 22.8m)
  const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(36.8, 0.5, 22.8), concreteMat);
  roofSlab.position.set(0, platformH + hallH + 0.25, 13.0);
  group.add(roofSlab);

  // Structural canopy ribs & glowing overhead ceiling light tubes
  for (let rx = -15; rx <= 15; rx += 6) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 22.2), trimSteelMat);
    rib.position.set(rx, platformH + hallH - 0.15, 13.0);
    group.add(rib);

    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 18.0), hallLampMat);
    tube.position.set(rx + 2.8, platformH + hallH - 0.12, 12.8);
    group.add(tube);
  }

  // Register 4-wall + doorway colliders for surface stations so players can walk right in!
  if (registry && !isUnderground && st.trackY < 2.5) {
    const hallCenterWorld = toWorld(0, 0, hallZ);
    registry.addEnterableRoomColliders(
      collisionWorld,
      hallCenterWorld.x,
      hallCenterWorld.z,
      hallW,
      hallD,
      yaw,
      ['north', 'south'],
      doorW,
      0.6
    );
  }

  // =========================================================================
  // 3. UNDERGROUND CAVERN ARCH SHELL + SURFACE STREET PAVILION (STN-2, 3, 7)
  // =========================================================================
  if (isUnderground) {
    // Vaulted ribbed underground cavern arching cleanly over track + platform
    const cavernMat = new THREE.MeshStandardMaterial({
      map: textures.concreteWeatheredMap,
      bumpMap: textures.concreteBump,
      bumpScale: 0.05,
      color: '#4e5660',
      roughness: 0.88,
      side: THREE.BackSide,
    });
    const cavernGeo = new THREE.CylinderGeometry(14.5, 14.5, 42, 16, 1, true, 0, Math.PI);
    cavernGeo.rotateZ(Math.PI * 0.5);
    cavernGeo.rotateX(-Math.PI * 0.5);
    const cavern = new THREE.Mesh(cavernGeo, cavernMat);
    cavern.position.set(0, 0.5, 8.5);
    group.add(cavern);

    // Opposite-side concrete tunnel retention wall behind track
    const backRetain = new THREE.Mesh(new THREE.BoxGeometry(42, 8.5, 0.8), concreteMat);
    backRetain.position.set(0, 3.8, -3.2);
    group.add(backRetain);

    // Street-level Soviet Metro Pavilion directly above (z = +18 local, terrain height)
    const surfPt = toWorld(0, 0, 18);
    const surfY = getTerrainHeight(surfPt.x, surfPt.z);
    const localSurfY = surfY - st.trackY;

    const pavGrp = new THREE.Group();
    pavGrp.position.set(0, localSurfY, 18);
    group.add(pavGrp);

    const pavBase = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.4, 8.2), concreteMat);
    pavBase.position.y = 0.2;
    pavGrp.add(pavBase);

    const pavRoof = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.55, 9.0), concreteMat);
    pavRoof.position.y = 4.35;
    pavGrp.add(pavRoof);

    for (const px of [-4.8, 4.8]) {
      for (const pz of [-3.6, 3.6]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), trimSteelMat);
        pillar.position.set(px, 2.1, pz);
        pavGrp.add(pillar);
      }
    }

    const pavSignTex = createUndergroundPavilionSign(st);
    const pavSignMat = new THREE.MeshStandardMaterial({
      map: pavSignTex,
      emissiveMap: pavSignTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.72,
      roughness: 0.35,
    });
    const pavSign = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 1.8), pavSignMat);
    pavSign.position.set(0, 3.4, 4.55);
    pavGrp.add(pavSign);
    const pavSignBack = pavSign.clone();
    pavSignBack.rotation.y = Math.PI;
    pavSignBack.position.z = -4.55;
    pavGrp.add(pavSignBack);

    // Interactive [E] Escalator Down (at surface pavilion) & [E] Escalator Up (inside underground hall)
    if (registry && callbacks) {
      const downPos = toWorld(0, localSurfY + 0.9, 18);
      const upPos = toWorld(0, platformH + 0.9, 20.8);
      registry.registerInteractable({
        id: `metro_esc_down_${st.code}`,
        label: `${st.code} Underground Escalator`,
        prompt: `[E] Descend Escalator to ${st.code} ${st.name} (${st.trackY.toFixed(1)}m)`,
        x: downPos.x,
        y: downPos.y,
        z: downPos.z,
        radius: 4.5,
        kind: 'elevator_down',
        onInteract: () => {
          callbacks.teleportPlayer(upPos.x, st.trackY + platformH + 0.1, upPos.z, yaw + Math.PI);
          return `Descended into ${st.code} ${st.name} — Coffee Hall & Platform open`;
        },
      });
      registry.registerInteractable({
        id: `metro_esc_up_${st.code}`,
        label: `${st.code} Street Exit Escalator`,
        prompt: `[E] Ride Escalator Up to Street Level (${st.district})`,
        x: upPos.x,
        y: upPos.y,
        z: upPos.z,
        radius: 4.0,
        kind: 'elevator_up',
        onInteract: () => {
          const exitPos = toWorld(0, 0, 23.5);
          const exitY = getTerrainHeight(exitPos.x, exitPos.z);
          callbacks.teleportPlayer(exitPos.x, exitY + 0.1, exitPos.z, yaw);
          return `Exited ${st.code} to ${st.district} street level`;
        },
      });
    }
  }

  // =========================================================================
  // 4. INTERIOR DETAIL PROPS (Distance-culled at 45m for 60 fps Chromebook!)
  // =========================================================================
  const propsGroup = new THREE.Group();
  group.add(propsGroup);
  if (registry) {
    const hallCenter = toWorld(0, 0, 15.5);
    registry.registerCullGroup(propsGroup, hallCenter.x, hallCenter.z, 48);
  }

  // --- ZONE A (West Wing: x = -15.5..-3.5, z = 10.5..22.0): WARM-LIT COFFEE AREA (КАФЕ) ---
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.08, 1.35), warmWoodMat);
  counterBase.position.set(-10.5, platformH + 0.54, 19.6);
  propsGroup.add(counterBase);

  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(7.85, 0.1, 1.55),
    new THREE.MeshStandardMaterial({ color: '#d6cfc2', roughness: 0.3, metalness: 0.1 })
  );
  counterTop.position.set(-10.5, platformH + 1.12, 19.6);
  propsGroup.add(counterTop);

  // Espresso machine & pastry glass display case
  const espresso = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.68, 0.62), trimSteelMat);
  espresso.position.set(-12.4, platformH + 1.5, 19.55);
  propsGroup.add(espresso);

  const pastryGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.55, 0.68),
    new THREE.MeshStandardMaterial({
      color: '#fde68a',
      emissive: new THREE.Color('#f59e0b'),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.68,
      roughness: 0.15,
    })
  );
  pastryGlass.position.set(-8.6, platformH + 1.44, 19.55);
  propsGroup.add(pastryGlass);

  // Illuminated КАФЕ header sign & 3 warm amber pendant lamps
  const cafeTex = createCafeSignTexture(st.code);
  const cafeSignMat = new THREE.MeshStandardMaterial({
    map: cafeTex,
    emissiveMap: cafeTex,
    emissive: new THREE.Color('#ffdfb0'),
    emissiveIntensity: 0.88,
    roughness: 0.3,
  });
  const cafeSign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.45), cafeSignMat);
  cafeSign.position.set(-10.5, platformH + 3.45, 22.95);
  cafeSign.rotation.y = Math.PI;
  propsGroup.add(cafeSign);

  for (const px of [-13.0, -10.5, -8.0]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), trimSteelMat);
    cord.position.set(px, platformH + 4.2, 19.2);
    propsGroup.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.24, 10), cafeWarmMat);
    shade.position.set(px, platformH + 3.4, 19.2);
    propsGroup.add(shade);
  }

  // Café bistro tables & chairs
  const tableCoords: [number, number][] = [
    [-13.5, 13.0],
    [-9.5, 13.0],
    [-13.5, 16.2],
    [-9.5, 16.2],
  ];
  for (const [tx, tz] of tableCoords) {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.24, 0.78, 8), trimSteelMat);
    ped.position.set(tx, platformH + 0.39, tz);
    propsGroup.add(ped);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 12), warmWoodMat);
    top.position.set(tx, platformH + 0.8, tz);
    propsGroup.add(top);
    // Warm coffee cup on table
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.042, 0.11, 8),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
    );
    cup.position.set(tx + 0.18, platformH + 0.88, tz - 0.1);
    propsGroup.add(cup);

    for (const side of [-0.88, 0.88]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.44), warmWoodMat);
      seat.position.set(tx + side, platformH + 0.46, tz);
      propsGroup.add(seat);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.38), trimSteelMat);
      leg.position.set(tx + side, platformH + 0.23, tz);
      propsGroup.add(leg);
    }
  }

  // Barista NPC behind the counter using the EXACT existing humanCharacter.ts rig!
  const barista = createRiggedHuman(
    9100 + stationIndex * 37,
    textures,
    'station_barista',
    'none'
  );
  barista.root.position.set(-10.6, platformH, 21.0);
  barista.root.rotation.y = Math.PI;
  propsGroup.add(barista.root);
  npcs.push({ rig: barista, mode: 'worker_desk', phase: stationIndex * 1.1 });

  // Register [E] Order Hot Coffee interactable
  if (registry && callbacks) {
    const cafePos = toWorld(-10.5, platformH + 1.0, 18.2);
    registry.registerInteractable({
      id: `station_coffee_${st.code}`,
      label: `${st.code} Station Cafe`,
      prompt: `[E] Order Hot Espresso at ${st.code} КАФЕ`,
      x: cafePos.x,
      y: cafePos.y,
      z: cafePos.z,
      radius: 3.4,
      kind: 'coffee',
      onInteract: () => callbacks.drinkCoffee(`${st.code} ${st.name}`),
    });
  }

  // --- ZONE B (Center: x = -3.2..+3.2, z = 10.6..15.5): TICKET TURNSTILES ---
  for (let t = -2.4; t <= 2.4; t += 1.2) {
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.05, 1.25), trimSteelMat);
    gate.position.set(t, platformH + 0.525, 11.4);
    propsGroup.add(gate);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.18),
      new THREE.MeshStandardMaterial({
        color: '#22c55e',
        emissive: new THREE.Color('#22c55e'),
        emissiveIntensity: 1.8,
      })
    );
    led.position.set(t, platformH + 1.08, 11.4);
    propsGroup.add(led);
  }
  if (registry) {
    const turnPos = toWorld(0, platformH + 1.0, 12.2);
    registry.registerInteractable({
      id: `station_turnstile_${st.code}`,
      label: `${st.code} Ticket Barrier`,
      prompt: `[E] Validate Archipelago Metro Pass at ${st.code}`,
      x: turnPos.x,
      y: turnPos.y,
      z: turnPos.z,
      radius: 3.2,
      kind: 'turnstile',
      onInteract: () => `Pass validated — Welcome to ${st.code} ${st.name} (${st.district})`,
    });
  }

  // --- ZONE C (East Wing: x = +3.5..+15.5, z = 10.5..22.0): PASSENGER WAITING AREA ---
  const ttTex = createTimetableTexture(st);
  const ttMat = new THREE.MeshStandardMaterial({
    map: ttTex,
    emissiveMap: ttTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.72,
    roughness: 0.32,
  });
  const timetableBoard = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.2), ttMat);
  timetableBoard.position.set(10.4, platformH + 2.6, 22.92);
  timetableBoard.rotation.y = Math.PI;
  propsGroup.add(timetableBoard);

  // Waiting rows of benches + luggage lockers
  for (const bz of [13.2, 17.0]) {
    for (const bx of [6.8, 12.8]) {
      const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 0.62), warmWoodMat);
      benchSeat.position.set(bx, platformH + 0.48, bz);
      propsGroup.add(benchSeat);
      const benchBack = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.48, 0.08), warmWoodMat);
      benchBack.position.set(bx, platformH + 0.76, bz + 0.28);
      propsGroup.add(benchBack);
      for (const lx of [-1.5, 1.5]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.56), trimSteelMat);
        leg.position.set(bx + lx, platformH + 0.24, bz);
        propsGroup.add(leg);
      }
    }
  }

  // Storage lockers along east wall
  const lockers = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.2, 5.2), trimSteelMat);
  lockers.position.set(16.25, platformH + 1.1, 16.0);
  propsGroup.add(lockers);

  // Overhead platform red dot-matrix station sign facing tracks
  const platBanner = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.82, 0.28), trimSteelMat);
  platBanner.position.set(0, platformH + 3.85, 4.6);
  propsGroup.add(platBanner);
  const platLedStrip = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 0.56), redLedMat);
  platLedStrip.position.set(0, platformH + 3.85, 4.44);
  platLedStrip.rotation.y = Math.PI;
  propsGroup.add(platLedStrip);

  // 2 Waiting Commuters per station using existing humanCharacter.ts!
  const c1 = createRiggedHuman(9400 + stationIndex * 41, textures, undefined, 'newspaper');
  c1.root.position.set(6.4, platformH, 13.05);
  c1.root.rotation.y = Math.PI;
  propsGroup.add(c1.root);
  npcs.push({ rig: c1, mode: 'seated', phase: stationIndex * 1.7 + 0.3 });

  const c2 = createRiggedHuman(9700 + stationIndex * 53, textures, undefined, 'phone');
  c2.root.position.set(12.6, platformH, 16.85);
  c2.root.rotation.y = Math.PI;
  propsGroup.add(c2.root);
  npcs.push({ rig: c2, mode: 'seated', phase: stationIndex * 2.1 + 0.8 });

  // Initial pose so first frame looks natural
  for (let i = 0; i < npcs.length; i++) {
    applyHumanPose(npcs[i].rig, {
      mode: npcs[i].mode,
      elapsed: 0,
      phase: npcs[i].phase,
      windStrength: 0.04,
    });
  }

  return { group, npcs, emissivePanels };
}
