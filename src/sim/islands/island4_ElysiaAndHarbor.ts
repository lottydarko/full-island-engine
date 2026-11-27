import * as THREE from 'three';
import {
  CollisionWorld,
  getRoadElevationAt,
  getTerrainHeight,
  LIGHTHOUSE_ROCK_CENTER,
  mulberry32,
} from '../mapData';
import { TextureLibrary } from '../textures';
import { InteriorRegistry } from '../interiors/interiorRegistry';
import { IslandModuleHandles } from './sector4_WoodlandsAndMountains';

/**
 * Island 4 (D10 — Elysia & Commercial Freight Harbor):
 * - Iconic crimson Golden Gate-II Luxury Suspension Bridge (RD-23: +22m arch, twin Art-Deco towers & cables)
 * - Elysia Luxury Resort (+18m terraced marble/glass pavilion, glowing resort pool, grand promenade)
 * - Offshore Solitude Lighthouse on Sea Rock (1805, 695) with rotating spotlight beam
 * - Commercial Freight Harbor (gantry cranes, stacked shipping containers, moored cargo freighters)
 */
export function buildIsland4ElysiaAndHarbor(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld,
  registry: InteriorRegistry
): IslandModuleHandles {
  const root = new THREE.Group();
  const rng = mulberry32(4104);

  const ggRedMat = new THREE.MeshStandardMaterial({
    color: '#b83227',
    roughness: 0.44,
    metalness: 0.58,
  });
  const cableMat = new THREE.MeshStandardMaterial({
    color: '#9c2c24',
    roughness: 0.48,
    metalness: 0.65,
  });
  const marbleMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    color: '#ebe4d6',
    roughness: 0.35,
    metalness: 0.08,
  });
  const warmGlassMat = new THREE.MeshStandardMaterial({
    color: '#ffdf9e',
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 0.85,
    roughness: 0.16,
    metalness: 0.45,
  });
  const poolGlowMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: new THREE.Color('#0ea5e9'),
    emissiveIntensity: 0.95,
    roughness: 0.12,
  });
  const craneYellowMat = new THREE.MeshStandardMaterial({
    color: '#d97706',
    roughness: 0.48,
    metalness: 0.62,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: '#2d3744',
    roughness: 0.45,
    metalness: 0.7,
  });

  // =========================================================================
  // 1. GOLDEN GATE-II SUSPENSION BRIDGE (RD-23: x = 1580 -> 1980, z = 260, +22m arch)
  // =========================================================================
  const towerXs = [1695, 1865];
  const towerTopY = 58.0;

  for (const tx of towerXs) {
    for (const tz of [249.5, 270.5]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(3.4, towerTopY + 8, 3.4), ggRedMat);
      col.position.set(tx, (towerTopY - 8) * 0.5, tz);
      root.add(col);
    }
    // Art-Deco horizontal cross struts
    for (const sy of [26, 39, 51, 57]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 23.0), ggRedMat);
      strut.position.set(tx, sy, 260);
      root.add(strut);
    }
    // Aviation red warning beacons atop towers
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 8, 8),
      new THREE.MeshStandardMaterial({
        color: '#ff2436',
        emissive: new THREE.Color('#ff1e2d'),
        emissiveIntensity: 2.4,
      })
    );
    beacon.position.set(tx, towerTopY + 1.0, 260);
    root.add(beacon);
  }

  // Sweeping catenary main cables + vertical suspender cables along both bridge sides
  const segCount = 24;
  for (const sideZ of [250.2, 269.8]) {
    const cablePts: THREE.Vector3[] = [];
    for (let i = 0; i <= segCount; i++) {
      const frac = i / segCount;
      const x = 1580 + frac * 400;
      let cy = 6;
      if (x <= 1695) {
        const u = (x - 1580) / 115;
        cy = 4 + u * u * (towerTopY - 4);
      } else if (x <= 1865) {
        const u = (x - 1780) / 85;
        cy = 24.5 + u * u * (towerTopY - 24.5);
      } else {
        const u = (1980 - x) / 115;
        cy = 4 + u * u * (towerTopY - 4);
      }
      cablePts.push(new THREE.Vector3(x, cy, sideZ));

      // Vertical suspender cable down to deck
      const deckY = getRoadElevationAt(x, 260);
      if (cy > deckY + 2.0 && i % 2 === 0) {
        const len = cy - deckY;
        const susp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 5), cableMat);
        susp.position.set(x, deckY + len * 0.5, sideZ);
        root.add(susp);
      }
    }
    const curve = new THREE.CatmullRomCurve3(cablePts);
    const mainCable = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.42, 6, false), cableMat);
    root.add(mainCable);
  }

  // Deck underside girder ribs & side rails
  for (let bx = 1595; bx <= 1965; bx += 20) {
    const dy = getRoadElevationAt(bx, 260);
    const under = new THREE.Mesh(new THREE.BoxGeometry(20.4, 1.4, 19.6), ggRedMat);
    under.position.set(bx, dy - 0.85, 260);
    root.add(under);
    for (const rz of [250.3, 269.7]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(20.4, 1.15, 0.45), ggRedMat);
      rail.position.set(bx, dy + 0.55, rz);
      root.add(rail);
      collisionWorld.addBox(bx, rz, 20.4, 0.75, 0);
    }
  }

  // =========================================================================
  // 2. ELYSIA LUXURY RESORT (+18m Terraced Pavilion, Glowing Pool & Villas)
  // =========================================================================
  const resX = 2275;
  const resZ = 225;
  const resY = getTerrainHeight(resX, resZ);
  const resort = new THREE.Group();
  resort.position.set(resX, resY, resZ);
  root.add(resort);

  // Terraced marble podiums
  const terrace1 = new THREE.Mesh(new THREE.BoxGeometry(64, 3.2, 48), marbleMat);
  terrace1.position.y = 0.6;
  resort.add(terrace1);
  const terrace2 = new THREE.Mesh(new THREE.BoxGeometry(46, 3.4, 32), marbleMat);
  terrace2.position.y = 3.8;
  resort.add(terrace2);

  // Grand illuminated resort hotel tower + sky lounge crown
  const hotelCore = new THREE.Mesh(new THREE.BoxGeometry(36, 18.0, 20), marbleMat);
  hotelCore.position.set(0, 14.0, -4);
  resort.add(hotelCore);
  const glassBand = new THREE.Mesh(new THREE.BoxGeometry(36.6, 13.5, 20.6), warmGlassMat);
  glassBand.position.set(0, 14.2, -4);
  resort.add(glassBand);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(40, 1.8, 24), marbleMat);
  crown.position.set(0, 23.6, -4);
  resort.add(crown);

  // Glowing infinity pool on front terrace
  const pool = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 10), poolGlowMat);
  pool.position.set(0, 5.6, 10.5);
  resort.add(pool);

  collisionWorld.addBox(resX, resZ - 4, 37, 21, 0);

  // Coastal luxury villas along Elysia Terraced Promenade
  const villaCoords: [number, number][] = [
    [2110, 155],
    [2395, 165],
    [2415, 295],
    [2065, 365],
  ];
  for (const [vx, vz] of villaCoords) {
    const vy = getTerrainHeight(vx, vz);
    const vBase = new THREE.Mesh(new THREE.BoxGeometry(16, 7.5, 12), marbleMat);
    vBase.position.set(vx, vy + 3.5, vz);
    root.add(vBase);
    const vWin = new THREE.Mesh(new THREE.BoxGeometry(16.3, 3.8, 12.3), warmGlassMat);
    vWin.position.set(vx, vy + 4.0, vz);
    root.add(vWin);
    collisionWorld.addBox(vx, vz, 16.4, 12.4, 0);
  }

  // =========================================================================
  // 3. OFFSHORE SOLITUDE LIGHTHOUSE ON SEA ROCK (1805, 695)
  // =========================================================================
  const lx = LIGHTHOUSE_ROCK_CENTER.x;
  const lz = LIGHTHOUSE_ROCK_CENTER.z;
  const ly = getTerrainHeight(lx, lz);
  const lhTower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.4, 28, 12), marbleMat);
  lhTower.position.set(lx, ly + 13.5, lz);
  root.add(lhTower);
  const lhStripe = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.55, 6.2, 12), ggRedMat);
  lhStripe.position.set(lx, ly + 16.5, lz);
  root.add(lhStripe);
  collisionWorld.addCircle(lx, lz, 4.6);

  const lhBeaconPivot = new THREE.Group();
  lhBeaconPivot.position.set(lx, ly + 28.5, lz);
  root.add(lhBeaconPivot);
  const lhLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 2.4, 10),
    new THREE.MeshStandardMaterial({
      color: '#fffbeb',
      emissive: new THREE.Color('#fef08a'),
      emissiveIntensity: 3.2,
    })
  );
  lhBeaconPivot.add(lhLamp);

  // Twin sweeping volumetric lighthouse beams
  const beamMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
    transparent: true,
    opacity: 0.11,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const dir of [-1, 1]) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(9.5, 78, 12, 1, true), beamMat);
    beam.rotation.z = dir * Math.PI * 0.5;
    beam.position.x = dir * 39;
    lhBeaconPivot.add(beam);
  }

  // =========================================================================
  // 4. COMMERCIAL FREIGHT HARBOR (South Island 4: z = 520..665)
  // =========================================================================
  const harborProps = new THREE.Group();
  root.add(harborProps);
  registry.registerCullGroup(harborProps, 2240, 585, 220);

  // 3 Tall Container Gantry Cranes along the deepwater quay
  for (const cx of [2085, 2215, 2345]) {
    const crane = new THREE.Group();
    crane.position.set(cx, 0.5, 620);
    root.add(crane);
    for (const lx2 of [-6.5, 6.5]) {
      for (const lz2 of [-5.0, 5.0]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 24, 1.1), craneYellowMat);
        leg.position.set(lx2, 12, lz2);
        crane.add(leg);
      }
    }
    const boom = new THREE.Mesh(new THREE.BoxGeometry(15.0, 2.2, 42.0), craneYellowMat);
    boom.position.set(0, 24.5, 8.0);
    crane.add(boom);
    collisionWorld.addBox(cx, 620, 14.5, 11.5, 0);
  }

  // Stacked shipping containers reusing existing textures.containerMaps!
  for (let i = 0; i < 24; i++) {
    const col = i % 8;
    const row = Math.floor(i / 8);
    const bx = 2045 + col * 42 + (rng() - 0.5) * 4;
    const bz = 545 + row * 18;
    const tiers = 1 + (i % 3);
    for (let t = 0; t < tiers; t++) {
      const cMat = new THREE.MeshStandardMaterial({
        map: textures.containerMaps[(i + t) % textures.containerMaps.length],
        roughness: 0.7,
        metalness: 0.25,
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(12.2, 2.9, 2.8), cMat);
      box.position.set(bx, 1.65 + t * 2.92, bz);
      harborProps.add(box);
    }
    collisionWorld.addBox(bx, bz, 12.4, 3.0, 0);
  }

  // 2 Moored Commercial Cargo Freight Ships off the Southern Quay
  for (const fx of [2145, 2320]) {
    const ship = new THREE.Group();
    ship.position.set(fx, -0.5, 695);
    root.add(ship);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(82, 8.2, 18.5), steelMat);
    hull.position.y = 3.2;
    ship.add(hull);
    const redWaterline = new THREE.Mesh(new THREE.BoxGeometry(82.4, 2.2, 18.8), ggRedMat);
    redWaterline.position.y = 0.2;
    ship.add(redWaterline);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 13.5, 15.5), marbleMat);
    bridge.position.set(-28, 12.2, 0);
    ship.add(bridge);
    // Cargo deck containers
    for (let k = 0; k < 4; k++) {
      const deckCargo = new THREE.Mesh(
        new THREE.BoxGeometry(12.2, 5.6, 13.0),
        new THREE.MeshStandardMaterial({
          map: textures.containerMaps[k % textures.containerMaps.length],
          roughness: 0.72,
        })
      );
      deckCargo.position.set(-6 + k * 14.2, 9.8, 0);
      ship.add(deckCargo);
    }
  }

  return {
    root,
    update: (dt, _elapsed, nightFactor) => {
      lhBeaconPivot.rotation.y += dt * 0.75;
      warmGlassMat.emissiveIntensity = 0.45 + nightFactor * 1.15;
      poolGlowMat.emissiveIntensity = 0.55 + nightFactor * 1.0;
    },
  };
}
