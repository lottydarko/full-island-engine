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

export interface IslandModuleHandles {
  root: THREE.Group;
  update: (dt: number, elapsed: number, nightFactor: number) => void;
}

/**
 * Sector 4 (D5): Snow-Covered Mountains (+28m), Dark Pine Forests,
 * Wind-Swaying Tall Grass Camouflage Zones, and Fortified Watchtower Ridge.
 */
export function buildSector4WoodlandsAndMountains(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld
): IslandModuleHandles {
  const root = new THREE.Group();
  const rng = mulberry32(4404);

  const snowPeakMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.06,
    color: '#dce8f5',
    roughness: 0.86,
    metalness: 0.04,
  });
  const graniteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.08,
    color: '#4c5560',
    roughness: 0.9,
  });
  const watchWoodMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    color: '#4a3a2c',
    roughness: 0.85,
  });
  const searchlightMat = new THREE.MeshStandardMaterial({
    color: '#fff6d6',
    emissive: new THREE.Color('#fde68a'),
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  // 1. Snow-Capped Craggy Mountain Outcrops crowning the +25..+28m ridges
  const peakSpecs: [number, number, number, number][] = [
    [735, -455, 42, 22],
    [860, -320, 34, 18],
    [615, -520, 32, 16],
    [810, -525, 36, 19],
    [705, -345, 28, 14],
  ];
  for (const [px, pz, rad, h] of peakSpecs) {
    const baseY = getTerrainHeight(px, pz) - 3.0;
    const rock = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), graniteMat);
    rock.position.set(px, baseY + h * 0.45, pz);
    rock.rotation.y = rng() * Math.PI;
    root.add(rock);

    const snowCap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.56, h * 0.52, 7), snowPeakMat);
    snowCap.position.set(px, baseY + h * 0.72, pz);
    snowCap.rotation.y = rock.rotation.y;
    root.add(snowCap);
  }

  // 2. Instanced Dark Pine Forest (360 spruce/pine trees, 2 draw calls total!)
  const trunkPositions: { x: number; y: number; z: number; scale: number; rot: number }[] = [];
  let tries = 0;
  while (trunkPositions.length < 340 && tries < 2400) {
    tries++;
    const x = 515 + rng() * 410;
    const z = -595 + rng() * 525;
    if (signedLandDistance(x, z) < 12) continue;
    if (isNearAnyRoad(x, z, 11)) continue;
    const y = getTerrainHeight(x, z);
    if (y < 0.2 || y > 22) continue;
    trunkPositions.push({ x, y, z, scale: 0.78 + rng() * 0.75, rot: rng() * Math.PI * 2 });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 3.8, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#33251a', roughness: 0.92 });
  const pineTrunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkPositions.length);

  const foliageGeo = new THREE.ConeGeometry(2.15, 7.2, 6);
  const foliageMat = new THREE.MeshStandardMaterial({
    map: textures.grassGroundMap,
    color: '#1b3526',
    roughness: 0.88,
  });
  const pineFoliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, trunkPositions.length);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < trunkPositions.length; i++) {
    const p = trunkPositions[i];
    dummy.position.set(p.x, p.y + 1.8 * p.scale, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.set(p.scale, p.scale, p.scale);
    dummy.updateMatrix();
    pineTrunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, p.y + 5.6 * p.scale, p.z);
    dummy.updateMatrix();
    pineFoliageInst.setMatrixAt(i, dummy.matrix);
  }
  pineTrunkInst.instanceMatrix.needsUpdate = true;
  pineFoliageInst.instanceMatrix.needsUpdate = true;
  root.add(pineTrunkInst, pineFoliageInst);

  // 3. Instanced Tall Grass Camouflage Zones (in the -3.5m Sector 4 pine valley & flank slopes)
  const grassPositions: { x: number; y: number; z: number; scale: number; rot: number }[] = [];
  for (let i = 0; i < 650; i++) {
    const x = 575 + rng() * 265;
    const z = -345 + rng() * 245;
    if (signedLandDistance(x, z) < 10 || isNearAnyRoad(x, z, 8.5)) continue;
    const y = getTerrainHeight(x, z);
    if (y < -4.2 || y > 9.5) continue;
    grassPositions.push({ x, y, z, scale: 0.85 + rng() * 0.7, rot: rng() * Math.PI * 2 });
  }
  const grassGeo = new THREE.ConeGeometry(0.42, 1.85, 4);
  const grassMat = new THREE.MeshStandardMaterial({
    map: textures.grassGroundMap,
    color: '#344c2d',
    roughness: 0.9,
  });
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassPositions.length);
  for (let i = 0; i < grassPositions.length; i++) {
    const g = grassPositions[i];
    dummy.position.set(g.x, g.y + 0.8 * g.scale, g.z);
    dummy.rotation.set(0, g.rot, 0);
    dummy.scale.set(g.scale * 1.15, g.scale, g.scale * 1.15);
    dummy.updateMatrix();
    grassInst.setMatrixAt(i, dummy.matrix);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  root.add(grassInst);

  // 4. Fortified Watchtowers with Sweeping Searchlights + Soviet Guards!
  const searchlightHeads: THREE.Object3D[] = [];
  const guards: { rig: HumanRig; phase: number }[] = [];
  const towerCoords: [number, number][] = [
    [665, -495],
    [835, -460],
    [770, -230],
  ];
  for (let i = 0; i < towerCoords.length; i++) {
    const [tx, tz] = towerCoords[i];
    const ty = getTerrainHeight(tx, tz);
    const tower = new THREE.Group();
    tower.position.set(tx, ty, tz);
    root.add(tower);

    // 4 timber/steel legs
    for (const lx of [-2.0, 2.0]) {
      for (const lz of [-2.0, 2.0]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 10.5, 0.38), watchWoodMat);
        leg.position.set(lx, 5.25, lz);
        tower.add(leg);
      }
    }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.45, 5.2), watchWoodMat);
    deck.position.y = 10.4;
    tower.add(deck);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.8, 4), graniteMat);
    roof.position.y = 14.1;
    roof.rotation.y = Math.PI * 0.25;
    tower.add(roof);

    const lampPivot = new THREE.Group();
    lampPivot.position.set(0, 12.1, 0);
    tower.add(lampPivot);
    const lampBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.7), searchlightMat);
    lampBox.position.z = 2.4;
    lampPivot.add(lampBox);
    const beamCone = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, 28, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: '#fef08a',
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beamCone.rotation.x = Math.PI * 0.38;
    beamCone.position.set(0, -6.5, 13.5);
    lampPivot.add(beamCone);
    searchlightHeads.push(lampPivot);

    // Soviet Watchtower Sentry reusing humanCharacter.ts
    const guard = createRiggedHuman(5400 + i * 29, textures, 'soviet_soldier', 'none');
    guard.root.position.set(0, 10.65, 1.2);
    tower.add(guard.root);
    guards.push({ rig: guard, phase: i * 1.9 });

    collisionWorld.addBox(tx, tz, 4.8, 4.8, 0);
  }

  return {
    root,
    update: (_dt, elapsed, nightFactor) => {
      searchlightMat.emissiveIntensity = 0.8 + nightFactor * 1.8;
      for (let i = 0; i < searchlightHeads.length; i++) {
        searchlightHeads[i].rotation.y = Math.sin(elapsed * 0.45 + i * 2.1) * 1.15;
      }
      for (let i = 0; i < guards.length; i++) {
        applyHumanPose(guards[i].rig, {
          mode: 'standing_idle',
          elapsed,
          phase: guards[i].phase,
          windStrength: 0.65,
        });
      }
    },
  };
}
