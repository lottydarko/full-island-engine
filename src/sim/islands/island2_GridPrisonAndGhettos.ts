import * as THREE from 'three';
import {
  CollisionWorld,
  getRoadElevationAt,
  getTerrainHeight,
  isNearAnyRoad,
  mulberry32,
  signedLandDistance,
} from '../mapData';
import { TextureLibrary } from '../textures';
import { applyHumanPose, createRiggedHuman, HumanRig } from '../humanCharacter';
import {
  ArchipelagoCallbacks,
  InteriorRegistry,
} from '../interiors/interiorRegistry';
import { IslandModuleHandles } from './sector4_WoodlandsAndMountains';

/**
 * Island 2 (D6, D7, D8):
 * - Gate 12 Reinforced Transit Bridge (RD-15, dual road + metro deck, guard gatehouse)
 * - D6 Evergladian High Marshes (marsh water sheets, instanced reeds, plankway pilings)
 * - D7 Forensics Bureau (enterable 4-wall + doorway hall) & 1960s Khrushchevka Ghetto Hills
 * - D8 Industrial Prison, POW Labor Camp (soviet_soldier & pow_prisoner rigs),
 *   spinning Mechanical Turbines, Main Electrical Grid Field ([E] Master Breaker wired to city power!),
 *   enterable Secret Intel Bunker Tunnel, and The Spit Black Market Docks!
 */
export function buildIsland2GridPrisonAndGhettos(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld,
  registry: InteriorRegistry,
  callbacks: ArchipelagoCallbacks
): IslandModuleHandles {
  const root = new THREE.Group();
  const rng = mulberry32(2208);

  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.05,
    color: '#7a828c',
    roughness: 0.84,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: '#2c3540',
    roughness: 0.42,
    metalness: 0.72,
  });
  const rustSteelMat = new THREE.MeshStandardMaterial({
    color: '#4f3a31',
    roughness: 0.68,
    metalness: 0.55,
  });
  const alertRedMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: new THREE.Color('#ff1e2d'),
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });
  const gridStatusMat = new THREE.MeshStandardMaterial({
    color: '#22c55e',
    emissive: new THREE.Color('#22c55e'),
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });

  // =========================================================================
  // 1. GATE 12 REINFORCED TRANSIT BRIDGE (RD-15: x = 515 -> 955, z = 86 road / 102 metro)
  // =========================================================================
  for (let bx = 535; bx <= 935; bx += 38) {
    const deckY = getRoadElevationAt(bx, 86);
    const pierH = deckY + 5.5;
    // Heavy twin concrete piers supporting road + parallel metro rail
    for (const pz of [77, 94, 108]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.6, pierH, 2.4), concreteMat);
      pier.position.set(bx, deckY - pierH * 0.5 - 0.3, pz);
      root.add(pier);
    }
    // Overhead steel truss portal arches across the road deck
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 7.6, 0.85), steelMat);
    postL.position.set(bx, deckY + 3.8, 76.5);
    root.add(postL);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 7.6, 0.85), steelMat);
    postR.position.set(bx, deckY + 3.8, 95.5);
    root.add(postR);
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 20.0), steelMat);
    crossBeam.position.set(bx, deckY + 7.4, 86);
    root.add(crossBeam);

    // Bridge side crash barriers (solid visual rails + edge colliders)
    const railL = new THREE.Mesh(new THREE.BoxGeometry(38.2, 1.15, 0.55), concreteMat);
    railL.position.set(bx, deckY + 0.55, 76.2);
    root.add(railL);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(38.2, 1.15, 0.55), concreteMat);
    railR.position.set(bx, deckY + 0.55, 95.8);
    root.add(railR);
    collisionWorld.addBox(bx, 76.0, 38.2, 0.8, 0);
    collisionWorld.addBox(bx, 96.0, 38.2, 0.8, 0);
  }

  // Gate 12 Security Checkpoint Arch at West Entry (x = 560, z = 86)
  const gateY = getRoadElevationAt(560, 86);
  const gateBooth = new THREE.Mesh(new THREE.BoxGeometry(7.2, 5.2, 4.4), concreteMat);
  gateBooth.position.set(560, gateY + 2.6, 73.2);
  root.add(gateBooth);
  collisionWorld.addBox(560, 73.2, 7.4, 4.6, 0);
  const gateBanner = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 22.0), rustSteelMat);
  gateBanner.position.set(560, gateY + 8.5, 86);
  root.add(gateBanner);
  const gateBeacon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 2.8), alertRedMat);
  gateBeacon.position.set(560, gateY + 9.8, 86);
  root.add(gateBeacon);

  // =========================================================================
  // 2. D6 EVERGLADIAN HIGH MARSHES (z < -180): Water flats & instanced reeds!
  // =========================================================================
  const marshWater = new THREE.Mesh(
    new THREE.PlaneGeometry(540, 310),
    new THREE.MeshStandardMaterial({
      color: '#192a24',
      roughness: 0.24,
      metalness: 0.45,
      transparent: true,
      opacity: 0.76,
    })
  );
  marshWater.rotation.x = -Math.PI * 0.5;
  marshWater.position.set(1235, -0.35, -355);
  root.add(marshWater);

  // Instanced marsh reeds & cypress trunks
  const reedPositions: { x: number; y: number; z: number; s: number }[] = [];
  for (let i = 0; i < 420; i++) {
    const x = 930 + rng() * 590;
    const z = -515 + rng() * 320;
    if (signedLandDistance(x, z) < 12 || isNearAnyRoad(x, z, 11)) continue;
    const y = getTerrainHeight(x, z);
    reedPositions.push({ x, y: Math.max(-0.4, y), z, s: 0.7 + rng() * 0.85 });
  }
  const reedGeo = new THREE.ConeGeometry(0.32, 2.4, 4);
  const reedMat = new THREE.MeshStandardMaterial({
    map: textures.grassGroundMap,
    color: '#2d3f2a',
    roughness: 0.9,
  });
  const reedInst = new THREE.InstancedMesh(reedGeo, reedMat, reedPositions.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < reedPositions.length; i++) {
    const r = reedPositions[i];
    dummy.position.set(r.x, r.y + 1.0 * r.s, r.z);
    dummy.rotation.set(0, i * 0.7, 0);
    dummy.scale.set(r.s, r.s, r.s);
    dummy.updateMatrix();
    reedInst.setMatrixAt(i, dummy.matrix);
  }
  reedInst.instanceMatrix.needsUpdate = true;
  root.add(reedInst);

  // =========================================================================
  // 3. D7 FORENSICS BUREAU (ENTERABLE!) & 1960s SOVIET KHRUSHCHEVKA GHETTOS
  // =========================================================================
  // Enterable Forensics Bureau Hall at (1235, 116) — 4 walls + 3m north doorway!
  const fbX = 1235;
  const fbZ = 120;
  const fbY = getTerrainHeight(fbX, fbZ);
  const fbW = 24;
  const fbD = 16;
  const fbH = 7.5;
  const fbGroup = new THREE.Group();
  fbGroup.position.set(fbX, fbY, fbZ);
  root.add(fbGroup);

  const fbFloor = new THREE.Mesh(
    new THREE.BoxGeometry(fbW, 0.35, fbD),
    new THREE.MeshStandardMaterial({ map: textures.metroFloorMap, roughness: 0.55 })
  );
  fbFloor.position.y = 0.175;
  fbGroup.add(fbFloor);

  const fbWallMat = textures.buildingMaterials.commercial_slate.side;
  const fbWallS = new THREE.Mesh(new THREE.BoxGeometry(fbW, fbH, 0.6), fbWallMat);
  fbWallS.position.set(0, fbH * 0.5, fbD * 0.5);
  fbGroup.add(fbWallS);
  const fbWallW = new THREE.Mesh(new THREE.BoxGeometry(0.6, fbH, fbD), fbWallMat);
  fbWallW.position.set(-fbW * 0.5, fbH * 0.5, 0);
  fbGroup.add(fbWallW);
  const fbWallE = new THREE.Mesh(new THREE.BoxGeometry(0.6, fbH, fbD), fbWallMat);
  fbWallE.position.set(fbW * 0.5, fbH * 0.5, 0);
  fbGroup.add(fbWallE);
  // North facade with 3.2m doorway cutout
  const fbSeg = (fbW - 3.2) * 0.5;
  const fbNL = new THREE.Mesh(new THREE.BoxGeometry(fbSeg, fbH, 0.6), fbWallMat);
  fbNL.position.set(-fbW * 0.5 + fbSeg * 0.5, fbH * 0.5, -fbD * 0.5);
  fbGroup.add(fbNL);
  const fbNR = new THREE.Mesh(new THREE.BoxGeometry(fbSeg, fbH, 0.6), fbWallMat);
  fbNR.position.set(fbW * 0.5 - fbSeg * 0.5, fbH * 0.5, -fbD * 0.5);
  fbGroup.add(fbNR);
  const fbRoof = new THREE.Mesh(new THREE.BoxGeometry(fbW + 0.8, 0.55, fbD + 0.8), concreteMat);
  fbRoof.position.y = fbH + 0.25;
  fbGroup.add(fbRoof);

  // Interior Forensics examination tables & illuminated lightboxes (distance-culled at 45m!)
  const fbProps = new THREE.Group();
  fbGroup.add(fbProps);
  registry.registerCullGroup(fbProps, fbX, fbZ, 45);
  for (const tx of [-5.5, 0, 5.5]) {
    const examTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.92, 1.15), steelMat);
    examTable.position.set(tx, 0.46, 1.5);
    fbProps.add(examTable);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.12, 0.6),
      new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        emissive: new THREE.Color('#7dd3fc'),
        emissiveIntensity: 1.4,
      })
    );
    lamp.position.set(tx, 3.6, 1.5);
    fbProps.add(lamp);
  }
  registry.addEnterableRoomColliders(collisionWorld, fbX, fbZ, fbW, fbD, 0, ['north'], 3.2);

  // 1960s Soviet Khrushchevka Terraced Apartment Blocks around D7 valley & hillside!
  const ghettoSpecs: [number, number, number, number, number, number, keyof TextureLibrary['buildingMaterials']][] = [
    [1045, -45, 34, 14, 17, 0.12, 'panelka_sand'],
    [1140, -95, 38, 14, 19, -0.05, 'panelka_rose'],
    [1265, -75, 36, 14, 16, 0.08, 'panelka_teal'],
    [1415, -55, 40, 15, 21, -0.18, 'panelka_cobalt'],
    [1485, 45, 34, 14, 18, 0.04, 'panelka_sand'],
    [1435, 160, 36, 15, 20, -0.12, 'panelka_rose'],
    [1310, 175, 32, 14, 16, 0.05, 'panelka_teal'],
    [1035, 155, 36, 14, 18, 0.1, 'panelka_cobalt'],
  ];
  for (const [gx, gz, w, d, h, rot, style] of ghettoSpecs) {
    if (isNearAnyRoad(gx, gz, 9)) continue;
    const gy = getTerrainHeight(gx, gz);
    const matSet = textures.buildingMaterials[style];
    const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
      matSet.side,
      matSet.side,
      matSet.roof,
      matSet.roof,
      matSet.side,
      matSet.side,
    ]);
    block.position.set(gx, gy + h * 0.5 - 1.5, gz);
    block.rotation.y = rot;
    root.add(block);
    collisionWorld.addBox(gx, gz, w + 0.5, d + 0.5, rot);
  }

  // =========================================================================
  // 4. D8 INDUSTRIAL PRISON, POW LABOR CAMP, TURBINES & ELECTRICAL GRID FIELD!
  // =========================================================================
  // Prison cellblock perimeter (x = 1005..1145, z = 285..420)
  const prisonBlocks: [number, number, number, number, number][] = [
    [1045, 315, 38, 14, 14],
    [1045, 385, 38, 14, 14],
    [1105, 350, 14, 42, 15],
  ];
  for (const [px, pz, w, d, h] of prisonBlocks) {
    const py = getTerrainHeight(px, pz);
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      textures.buildingMaterials.prison_block.side
    );
    b.position.set(px, py + h * 0.5 - 0.5, pz);
    root.add(b);
    collisionWorld.addBox(px, pz, w, d, 0);
  }

  // Animated Mechanical Turbines (4 spinning industrial wind/steam turbines along RD-20!)
  const turbineRotors: THREE.Object3D[] = [];
  const turbineCoords: [number, number][] = [
    [1220, 355],
    [1265, 355],
    [1310, 355],
    [1355, 355],
  ];
  for (const [tx, tz] of turbineCoords) {
    const ty = getTerrainHeight(tx, tz);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(8.5, 6.2, 12.5), concreteMat);
    housing.position.set(tx, ty + 3.1, tz);
    root.add(housing);
    collisionWorld.addBox(tx, tz, 8.8, 12.8, 0);

    const hub = new THREE.Group();
    hub.position.set(tx, ty + 7.8, tz);
    root.add(hub);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 3.2, 10), steelMat);
    hub.add(shaft);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.28, 1.05), rustSteelMat);
      blade.rotation.y = (b / 4) * Math.PI * 2;
      blade.position.y = 1.1;
      hub.add(blade);
    }
    turbineRotors.push(hub);
  }

  // Main Electrical Grid Field (x = 1220..1385, z = 490..545) + [E] MASTER BREAKER!
  for (let gx = 1230; gx <= 1370; gx += 28) {
    for (const gz of [508, 535]) {
      const gy = getTerrainHeight(gx, gz);
      const transformer = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.8, 3.2), steelMat);
      transformer.position.set(gx, gy + 1.9, gz);
      root.add(transformer);
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 13.5, 6), rustSteelMat);
      pylon.position.set(gx, gy + 6.75, gz);
      root.add(pylon);
      collisionWorld.addBox(gx, gz, 4.6, 3.6, 0);
    }
  }

  // Master Grid Control Console right beside RD-19 Energetikov Highway at (1285, 492)
  const breakerX = 1285;
  const breakerZ = 492;
  const breakerY = getTerrainHeight(breakerX, breakerZ);
  const consoleBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 1.6), steelMat);
  consoleBase.position.set(breakerX, breakerY + 1.1, breakerZ);
  root.add(consoleBase);
  const statusBeacon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.5), gridStatusMat);
  statusBeacon.position.set(breakerX, breakerY + 2.45, breakerZ);
  root.add(statusBeacon);
  collisionWorld.addBox(breakerX, breakerZ, 3.5, 1.8, 0);

  registry.registerInteractable({
    id: 'island2_master_grid_breaker',
    label: 'Archipelago Master Grid Breaker',
    prompt: '[E] Trip / Restore Archipelago Main Electrical Grid',
    x: breakerX,
    y: breakerY + 1.1,
    z: breakerZ - 1.8,
    radius: 3.8,
    kind: 'grid_breaker',
    onInteract: () => {
      const online = callbacks.toggleGridPower();
      return online
        ? 'MAIN ELECTRICAL GRID RESTORED — City streetlamps, traffic signals & neons online!'
        : 'MAIN ELECTRICAL GRID TRIPPED — Citywide blackout initiated across Novaya Kaluga & Island 2!';
    },
  });

  // Enterable Secret Intel Bunker Tunnel beside the Electrical Grid at (1395, 515)
  const bunkX = 1395;
  const bunkZ = 515;
  const bunkY = getTerrainHeight(bunkX, bunkZ);
  const bunkGrp = new THREE.Group();
  bunkGrp.position.set(bunkX, bunkY, bunkZ);
  root.add(bunkGrp);
  const bunkArch = new THREE.Mesh(new THREE.BoxGeometry(9.0, 4.2, 14.0), concreteMat);
  bunkArch.position.set(0, 2.1, 0);
  // Hollow tunnel doorway front + rear arch (walkable straight through!)
  const bLeft = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.0, 14.0), concreteMat);
  bLeft.position.set(-3.2, 2.0, 0);
  const bRight = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.0, 14.0), concreteMat);
  bRight.position.set(3.2, 2.0, 0);
  const bTop = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.0, 14.0), concreteMat);
  bTop.position.set(0, 4.0, 0);
  const bBack = new THREE.Mesh(new THREE.BoxGeometry(9.0, 4.5, 0.8), concreteMat);
  bBack.position.set(0, 2.25, 6.8);
  bunkGrp.add(bLeft, bRight, bTop, bBack);
  bunkArch.geometry.dispose();
  registry.addEnterableRoomColliders(collisionWorld, bunkX, bunkZ, 9.0, 14.0, 0, ['north'], 3.4);

  const intelDesk = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.95, 1.2), steelMat);
  intelDesk.position.set(0, 0.48, 4.2);
  bunkGrp.add(intelDesk);
  const intelLamp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), alertRedMat);
  intelLamp.position.set(0, 3.3, 4.2);
  bunkGrp.add(intelLamp);

  registry.registerInteractable({
    id: 'island2_secret_intel_bunker',
    label: 'Secret Intel Bunker Terminal',
    prompt: '[E] Inspect Classified Zona-9 Stargate & Ark Dossier',
    x: bunkX,
    y: bunkY + 1.0,
    z: bunkZ + 3.0,
    radius: 3.5,
    kind: 'bunker_intel',
    onInteract: () =>
      'CLASSIFIED INTEL: Stargate Peninsula Decoy Barracks (Island 3) conceals an elevator descending to the Sub-Surface Ark Vault.',
  });

  // =========================================================================
  // 5. THE SPIT BLACK MARKET DOCKS (x = 1560..1765, z = 410..475)
  // =========================================================================
  const dockQuay = new THREE.Mesh(new THREE.BoxGeometry(195, 2.6, 38), concreteMat);
  dockQuay.position.set(1665, 0.2, 442);
  root.add(dockQuay);

  // Contraband shipping containers reusing textures.containerMaps!
  for (let c = 0; c < 10; c++) {
    const cx = 1595 + (c % 5) * 28;
    const cz = c < 5 ? 426 : 458;
    const cMat = new THREE.MeshStandardMaterial({
      map: textures.containerMaps[c % textures.containerMaps.length],
      roughness: 0.72,
      metalness: 0.25,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.9, 2.8), cMat);
    box.position.set(cx, 2.95, cz);
    root.add(box);
    collisionWorld.addBox(cx, cz, 12.4, 3.0, 0);
  }

  // Moored smuggling trawler off The Spit tip
  const trawler = new THREE.Group();
  trawler.position.set(1790, -0.5, 442);
  root.add(trawler);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(34, 4.2, 10.5), rustSteelMat);
  hull.position.y = 1.4;
  trawler.add(hull);
  const wheelhouse = new THREE.Mesh(new THREE.BoxGeometry(9.5, 5.2, 7.6), concreteMat);
  wheelhouse.position.set(-8, 5.4, 0);
  trawler.add(wheelhouse);

  // =========================================================================
  // 6. POW LABOR CAMP PRISONERS & SOVIET SOLDIERS (Reusing humanCharacter.ts!)
  // =========================================================================
  const animatedNPCs: {
    rig: HumanRig;
    baseX: number;
    baseZ: number;
    patrolRadius: number;
    speed: number;
    phase: number;
  }[] = [];

  const campSpots: [number, number, 'soviet_soldier' | 'pow_prisoner', number][] = [
    [1090, 345, 'pow_prisoner', 7.5],
    [1120, 365, 'pow_prisoner', 6.5],
    [1155, 345, 'pow_prisoner', 8.0],
    [1135, 390, 'pow_prisoner', 7.0],
    [1080, 395, 'soviet_soldier', 10.0],
    [1175, 375, 'soviet_soldier', 11.0],
    [1255, 488, 'soviet_soldier', 9.0],
    [1645, 442, 'soviet_soldier', 12.0],
  ];

  for (let i = 0; i < campSpots.length; i++) {
    const [nx, nz, outfit, rad] = campSpots[i];
    const rig = createRiggedHuman(6200 + i * 31, textures, outfit, 'none');
    rig.root.position.set(nx, getTerrainHeight(nx, nz), nz);
    root.add(rig.root);
    animatedNPCs.push({
      rig,
      baseX: nx,
      baseZ: nz,
      patrolRadius: rad,
      speed: outfit === 'soviet_soldier' ? 0.34 : 0.22,
      phase: i * 1.45,
    });
  }

  return {
    root,
    update: (dt, elapsed, nightFactor) => {
      const powerOn = callbacks.isGridPowerOnline();
      gridStatusMat.color.set(powerOn ? '#22c55e' : '#ef4444');
      gridStatusMat.emissive.set(powerOn ? '#22c55e' : '#ff1e2d');
      gridStatusMat.emissiveIntensity = powerOn ? 1.8 : 0.8 + Math.sin(elapsed * 8) * 0.6;
      alertRedMat.emissiveIntensity = 1.2 + Math.sin(elapsed * 4.5) * 0.65 + nightFactor * 0.6;

      // Spin mechanical turbines when electrical grid is online (coast slowly when tripped!)
      const rotorSpeed = powerOn ? 1.85 : 0.12;
      for (let i = 0; i < turbineRotors.length; i++) {
        turbineRotors[i].rotation.y += dt * (rotorSpeed + i * 0.08);
      }

      // Patrol POW prisoners & Soviet guards smoothly
      for (let i = 0; i < animatedNPCs.length; i++) {
        const a = animatedNPCs[i];
        const ang = elapsed * a.speed + a.phase;
        const px = a.baseX + Math.cos(ang) * a.patrolRadius;
        const pz = a.baseZ + Math.sin(ang) * a.patrolRadius;
        a.rig.root.position.set(px, getTerrainHeight(px, pz), pz);
        a.rig.root.rotation.y = Math.atan2(-Math.sin(ang), Math.cos(ang));
        applyHumanPose(a.rig, {
          mode: 'walking',
          elapsed,
          phase: a.phase,
          walkCycle: elapsed * (a.speed * 14.0) + a.phase,
          windStrength: 0.45,
        });
      }
    },
  };
}
