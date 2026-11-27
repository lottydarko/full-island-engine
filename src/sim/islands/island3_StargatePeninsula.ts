import * as THREE from 'three';
import {
  CollisionWorld,
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
 * Island 3 (D9 — Stargate Peninsula):
 * - Soviet Soldier Patrol Squads (humanCharacter.ts 'soviet_soldier')
 * - Black Woods (instanced dark gnarled pines around +14m basalt perimeter ridges)
 * - Enterable Decoy Barracks (4-wall + doorway) with [E] Elevator descending into
 *   the gilded Sub-Surface Ark of the Covenant Vault (y = -18m) + Return Elevator!
 * - Rotating Alien Comm Array Dish & Pulsing Basalt Obelisk in the -8m Ark Crater.
 */
export function buildIsland3StargatePeninsula(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld,
  registry: InteriorRegistry,
  callbacks: ArchipelagoCallbacks
): IslandModuleHandles {
  const root = new THREE.Group();
  const rng = mulberry32(3909);

  const basaltMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.08,
    color: '#252930',
    roughness: 0.88,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.05,
    color: '#6b727c',
    roughness: 0.82,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    map: textures.cathedralDomeGoldMap,
    color: '#eab308',
    emissive: new THREE.Color('#b45309'),
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.88,
  });
  const alienGlowMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: new THREE.Color('#00e5ff'),
    emissiveIntensity: 2.2,
    roughness: 0.18,
    metalness: 0.4,
  });
  const elevatorGlowMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 1.6,
    roughness: 0.25,
  });

  // 1. Black Woods — Instanced Dark Pines framing the crater rim & Secrecy Beltway
  const treeList: { x: number; y: number; z: number; s: number; r: number }[] = [];
  let tries = 0;
  while (treeList.length < 240 && tries < 1800) {
    tries++;
    const x = 1665 + rng() * 575;
    const z = -650 + rng() * 545;
    if (signedLandDistance(x, z) < 14 || isNearAnyRoad(x, z, 11)) continue;
    // Keep inner Ark crater open
    if (Math.hypot(x - 1955, z + 370) < 95) continue;
    const y = getTerrainHeight(x, z);
    treeList.push({ x, y, z, s: 0.8 + rng() * 0.85, r: rng() * Math.PI * 2 });
  }
  const trunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.18, 0.34, 4.0, 6),
    new THREE.MeshStandardMaterial({ color: '#1b1715', roughness: 0.94 }),
    treeList.length
  );
  const crownInst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.1, 7.6, 6),
    new THREE.MeshStandardMaterial({ color: '#111d18', roughness: 0.92 }),
    treeList.length
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < treeList.length; i++) {
    const t = treeList[i];
    dummy.position.set(t.x, t.y + 2.0 * t.s, t.z);
    dummy.rotation.set(0, t.r, 0);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, t.y + 5.8 * t.s, t.z);
    dummy.updateMatrix();
    crownInst.setMatrixAt(i, dummy.matrix);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  root.add(trunkInst, crownInst);

  // 2. Enterable Decoy Barracks (x = 1865, z = -475) + [E] Elevator to Sub-Surface Ark Vault!
  const barX = 1865;
  const barZ = -475;
  const barY = getTerrainHeight(barX, barZ);
  const barW = 22;
  const barD = 14;
  const barH = 6.2;
  const barGrp = new THREE.Group();
  barGrp.position.set(barX, barY, barZ);
  root.add(barGrp);

  const bFloor = new THREE.Mesh(
    new THREE.BoxGeometry(barW, 0.35, barD),
    new THREE.MeshStandardMaterial({ map: textures.metroFloorMap, roughness: 0.65 })
  );
  bFloor.position.y = 0.175;
  barGrp.add(bFloor);

  const bWallMat = textures.buildingMaterials.military_bunker.side;
  const bN = new THREE.Mesh(new THREE.BoxGeometry(barW, barH, 0.65), bWallMat);
  bN.position.set(0, barH * 0.5, -barD * 0.5);
  const bW = new THREE.Mesh(new THREE.BoxGeometry(0.65, barH, barD), bWallMat);
  bW.position.set(-barW * 0.5, barH * 0.5, 0);
  const bE = new THREE.Mesh(new THREE.BoxGeometry(0.65, barH, barD), bWallMat);
  bE.position.set(barW * 0.5, barH * 0.5, 0);
  // South wall with 3.2m doorway
  const sSeg = (barW - 3.2) * 0.5;
  const bSL = new THREE.Mesh(new THREE.BoxGeometry(sSeg, barH, 0.65), bWallMat);
  bSL.position.set(-barW * 0.5 + sSeg * 0.5, barH * 0.5, barD * 0.5);
  const bSR = new THREE.Mesh(new THREE.BoxGeometry(sSeg, barH, 0.65), bWallMat);
  bSR.position.set(barW * 0.5 - sSeg * 0.5, barH * 0.5, barD * 0.5);
  const bRoof = new THREE.Mesh(new THREE.BoxGeometry(barW + 0.8, 0.55, barD + 0.8), concreteMat);
  bRoof.position.y = barH + 0.25;
  barGrp.add(bN, bW, bE, bSL, bSR, bRoof);

  // Heavy armored elevator cage inside barracks
  const elevFrame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.4, 3.6), basaltMat);
  elevFrame.position.set(0, 2.2, -3.6);
  barGrp.add(elevFrame);
  const elevBeacon = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.35), elevatorGlowMat);
  elevBeacon.position.set(0, 4.1, -1.7);
  barGrp.add(elevBeacon);

  registry.addEnterableRoomColliders(collisionWorld, barX, barZ, barW, barD, 0, ['south'], 3.2);

  // 3. Sub-Surface Ark of the Covenant Vault directly beneath Decoy Barracks (y = -22m)
  const vaultY = -22.0;
  const vaultGrp = new THREE.Group();
  vaultGrp.position.set(barX, vaultY, barZ);
  root.add(vaultGrp);

  const vFloor = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.6, 28),
    new THREE.MeshStandardMaterial({ map: textures.concreteWeatheredMap, color: '#1b1f26', roughness: 0.45 })
  );
  vFloor.position.y = -0.3;
  vaultGrp.add(vFloor);
  const vCeil = new THREE.Mesh(new THREE.BoxGeometry(28, 0.6, 28), basaltMat);
  vCeil.position.y = 8.4;
  vaultGrp.add(vCeil);
  for (const [wx, wz, bw, bd] of [
    [0, -14, 28, 0.8],
    [0, 14, 28, 0.8],
    [-14, 0, 0.8, 28],
    [14, 0, 0.8, 28],
  ] as [number, number, number, number][]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(bw, 8.6, bd), basaltMat);
    wall.position.set(wx, 4.2, wz);
    vaultGrp.add(wall);
  }
  // Golden Pedestal & Ark of the Covenant Chest + Twin Cherubim Wings
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 3.4), basaltMat);
  pedestal.position.set(0, 0.6, 5.2);
  vaultGrp.add(pedestal);
  const arkChest = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.35, 1.45), goldMat);
  arkChest.position.set(0, 1.88, 5.2);
  vaultGrp.add(arkChest);
  for (const side of [-0.75, 0.75]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.15, 5), goldMat);
    wing.position.set(side, 2.85, 5.2);
    wing.rotation.z = side > 0 ? 0.55 : -0.55;
    vaultGrp.add(wing);
  }
  const arkHalo = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.08, 8, 28),
    alienGlowMat
  );
  arkHalo.position.set(0, 2.4, 5.2);
  vaultGrp.add(arkHalo);

  // Return Elevator Pad inside Vault
  const returnPad = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 3.4), elevatorGlowMat);
  returnPad.position.set(0, 0.14, -8.5);
  vaultGrp.add(returnPad);

  // Wire [E] Down & [E] Up Elevators!
  registry.registerInteractable({
    id: 'stargate_decoy_elevator_down',
    label: 'Decoy Barracks Sub-Surface Lift',
    prompt: '[E] Ride Hidden Elevator Down to Ark of the Covenant Vault (-22m)',
    x: barX,
    y: barY + 1.1,
    z: barZ - 0.6,
    radius: 3.6,
    kind: 'elevator_down',
    onInteract: () => {
      callbacks.teleportPlayer(barX, vaultY + 0.2, barZ - 5.2, Math.PI);
      return 'SUB-SURFACE VAULT REACHED — Ark of the Covenant containment chamber';
    },
  });
  registry.registerInteractable({
    id: 'stargate_vault_elevator_up',
    label: 'Vault Return Elevator',
    prompt: '[E] Ascend Elevator Back to Decoy Barracks Surface',
    x: barX,
    y: vaultY + 1.0,
    z: barZ - 8.5,
    radius: 3.8,
    kind: 'elevator_up',
    onInteract: () => {
      callbacks.teleportPlayer(barX, barY + 0.2, barZ + 2.5, 0);
      return 'Returned to Stargate Peninsula — Decoy Barracks Surface';
    },
  });

  // 4. Alien Comm Array Dish & Stargate Ring Monument inside the -8m Ark Crater (1955, -370)!
  const craterX = 1955;
  const craterZ = -370;
  const craterY = getTerrainHeight(craterX, craterZ);

  const stargateRing = new THREE.Mesh(new THREE.TorusGeometry(11.5, 1.35, 12, 32), basaltMat);
  stargateRing.position.set(craterX, craterY + 12.5, craterZ);
  root.add(stargateRing);
  const portalCore = new THREE.Mesh(
    new THREE.CircleGeometry(10.1, 24),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    })
  );
  portalCore.position.set(craterX, craterY + 12.5, craterZ);
  root.add(portalCore);

  // Rotating Alien Comm Dish Tower on the crater flank (2045, -320)
  const dishX = 2045;
  const dishZ = -320;
  const dishY = getTerrainHeight(dishX, dishZ);
  const dishTower = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.2, 18.0, 8), basaltMat);
  dishTower.position.set(dishX, dishY + 9.0, dishZ);
  root.add(dishTower);
  collisionWorld.addCircle(dishX, dishZ, 3.4);

  const dishPivot = new THREE.Group();
  dishPivot.position.set(dishX, dishY + 18.5, dishZ);
  root.add(dishPivot);
  const dishParabolic = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
    concreteMat
  );
  dishParabolic.rotation.x = Math.PI * 0.65;
  dishPivot.add(dishParabolic);
  const dishEmitter = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), alienGlowMat);
  dishEmitter.position.set(0, 3.4, 4.8);
  dishPivot.add(dishEmitter);

  // 5. Soviet Garrison Patrol Squads around Island 3 (reusing humanCharacter.ts 'soviet_soldier'!)
  const patrols: { rig: HumanRig; cx: number; cz: number; rad: number; spd: number; phase: number }[] = [];
  const patrolCenters: [number, number, number][] = [
    [1865, -452, 11],
    [1955, -415, 16],
    [2015, -370, 14],
    [1925, -310, 13],
    [1795, -375, 12],
    [2080, -455, 15],
  ];
  for (let i = 0; i < patrolCenters.length; i++) {
    const [cx, cz, rad] = patrolCenters[i];
    const rig = createRiggedHuman(7300 + i * 37, textures, 'soviet_soldier', 'none');
    rig.root.position.set(cx, getTerrainHeight(cx, cz), cz);
    root.add(rig.root);
    patrols.push({ rig, cx, cz, rad, spd: 0.36 + (i % 3) * 0.06, phase: i * 1.15 });
  }

  return {
    root,
    update: (dt, elapsed) => {
      dishPivot.rotation.y += dt * 0.42;
      arkHalo.rotation.y += dt * 0.75;
      arkHalo.rotation.x = Math.sin(elapsed * 0.8) * 0.28;
      alienGlowMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 2.8) * 0.65;

      for (let i = 0; i < patrols.length; i++) {
        const p = patrols[i];
        const a = elapsed * p.spd + p.phase;
        const px = p.cx + Math.cos(a) * p.rad;
        const pz = p.cz + Math.sin(a) * p.rad;
        p.rig.root.position.set(px, getTerrainHeight(px, pz), pz);
        p.rig.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        applyHumanPose(p.rig, {
          mode: 'walking',
          elapsed,
          phase: p.phase,
          walkCycle: elapsed * (p.spd * 13.5) + p.phase,
          windStrength: 0.55,
        });
      }
    },
  };
}
