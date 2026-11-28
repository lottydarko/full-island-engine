import * as THREE from 'three';
import { CourseBox, CourseTargetPlate, WallRunCourseSpec } from './courseData';
import { createCourseTextures } from './courseTextures';

export interface CourseBuildResult {
  group: THREE.Group;
  hitMeshes: THREE.Object3D[];
  targetMeshes: Map<THREE.Object3D, string>;
  flashTargetHit: (targetId: string) => void;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

/**
 * Builds the 3D Wall-Run Lab parkour circuit meshes, mount zone guide strips,
 * distant Kaluga silhouette skyline spires below the mist deck, and reactive target plates.
 */
export function buildWallRunCourseScene(
  spec: WallRunCourseSpec,
  maxAnisotropy: number,
): CourseBuildResult {
  const group = new THREE.Group();
  group.name = 'WallRunCourse';

  const tex = createCourseTextures(maxAnisotropy);
  const disposables: Array<{ dispose: () => void }> = [tex];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  const concreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd0d6de,
      map: tex.concreteMap,
      normalMap: tex.concreteNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: tex.concreteRoughness,
      roughness: 0.9,
      metalness: 0.06,
    }),
  );

  const brickMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe6dcd6,
      map: tex.brickMap,
      normalMap: tex.brickNormal,
      normalScale: new THREE.Vector2(1.05, 1.05),
      roughnessMap: tex.brickRoughness,
      roughness: 0.92,
      metalness: 0.04,
    }),
  );

  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x8cc6e6,
      map: tex.glassMap,
      roughness: 0.14,
      metalness: 0.25,
      transmission: 0.35,
      transparent: true,
      opacity: 0.82,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.6,
    }),
  );

  const steelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa6b3c2,
      map: tex.steelMap,
      roughnessMap: tex.steelRoughness,
      roughness: 0.56,
      metalness: 0.65,
    }),
  );

  const mountStripeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.mountStripeMap,
      emissive: 0xd97706,
      emissiveIntensity: 0.24,
      roughness: 0.5,
      metalness: 0.1,
    }),
  );

  const frameTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b222c,
      roughness: 0.5,
      metalness: 0.72,
    }),
  );

  const climbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      map: tex.climbMap,
      normalMap: tex.climbNormal,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: tex.climbRoughness,
      roughness: 0.64,
      metalness: 0.42,
    }),
  );

  const climbRailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.32,
      metalness: 0.65,
    }),
  );

  const rungMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.36,
      metalness: 0.85,
    }),
  );

  const hitMeshes: THREE.Object3D[] = [];
  const targetMeshes = new Map<THREE.Object3D, string>();
  const targetHitTimers = new Map<string, number>();
  const targetMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const rungTransforms: Array<{ pos: THREE.Vector3; rotY: number; len: number }> = [];

  const getMat = (box: CourseBox) => {
    if (box.climbable) return climbMat;
    if (box.materialKind === 'glass') return glassMat;
    if (box.materialKind === 'brick') return brickMat;
    if (box.materialKind === 'steel') return steelMat;
    return concreteMat;
  };

  for (const box of spec.boxes) {
    const w = box.halfExtents.x * 2;
    const h = box.halfExtents.y * 2;
    const d = box.halfExtents.z * 2;
    const geo = trackGeo(new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, getMat(box));
    mesh.position.copy(box.center);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = box.yawRad;
    mesh.rotation.x = box.pitchRad;
    mesh.castShadow = box.materialKind !== 'glass';
    mesh.receiveShadow = true;
    mesh.name = box.id;
    group.add(mesh);
    hitMeshes.push(mesh);

    // Architectural steel cap & mount-zone indicator stripe along runnable walls
    if (box.climbable) {
      const capGeo = trackGeo(new THREE.BoxGeometry(w + 0.16, 0.26, d + 0.16));
      const capMesh = new THREE.Mesh(capGeo, climbRailMat);
      capMesh.position.set(0, h * 0.5 + 0.1, 0);
      mesh.add(capMesh);

      // Generate physical 3D steel grip rungs along the broad faces of the climbable wall
      const isXBroad = d >= w;
      const spanLen = isXBroad ? d - 0.6 : w - 0.6;
      const offsetFace = (isXBroad ? w : d) * 0.5 + 0.045;
      for (let ry = -h * 0.5 + 0.75; ry <= h * 0.5 - 0.55; ry += 0.62) {
        for (const fSign of [-1, 1]) {
          const lx = isXBroad ? fSign * offsetFace : 0;
          const lz = isXBroad ? 0 : fSign * offsetFace;
          const wx = box.center.x + lx * box.cosYaw + lz * box.sinYaw;
          const wz = box.center.z - lx * box.sinYaw + lz * box.cosYaw;
          rungTransforms.push({
            pos: new THREE.Vector3(wx, box.center.y + ry, wz),
            rotY: box.yawRad + (isXBroad ? Math.PI * 0.5 : 0),
            len: spanLen,
          });
        }
      }
    } else if (box.runnable) {
      const capGeo = trackGeo(new THREE.BoxGeometry(w + 0.14, 0.26, d + 0.14));
      const capMesh = new THREE.Mesh(capGeo, frameTrimMat);
      capMesh.position.set(0, h * 0.5 + 0.1, 0);
      mesh.add(capMesh);

      const bandLocalY = (box.mountBandY ?? box.center.y) - box.center.y;
      const stripeGeo = trackGeo(new THREE.BoxGeometry(w + 0.04, 0.34, d - 0.8));
      const stripeMesh = new THREE.Mesh(stripeGeo, mountStripeMat);
      stripeMesh.position.set(0, bandLocalY, 0);
      mesh.add(stripeMesh);
    } else if (box.materialKind === 'steel' && box.pitchRad === 0) {
      // Edge safety curb trim on elevated decks
      const trimGeo = trackGeo(new THREE.BoxGeometry(w + 0.08, 0.14, d + 0.08));
      const trim = new THREE.Mesh(trimGeo, frameTrimMat);
      trim.position.set(0, h * 0.5 - 0.05, 0);
      mesh.add(trim);
    }
  }

  // Batch all climbable 3D steel rungs into a single high-FPS InstancedMesh
  if (rungTransforms.length > 0) {
    const rungGeo = trackGeo(new THREE.BoxGeometry(1, 0.055, 0.065));
    const rungInst = new THREE.InstancedMesh(rungGeo, rungMat, rungTransforms.length);
    const rDummy = new THREE.Object3D();
    for (let i = 0; i < rungTransforms.length; i++) {
      const rt = rungTransforms[i];
      rDummy.position.copy(rt.pos);
      rDummy.rotation.set(0, rt.rotY, 0);
      rDummy.scale.set(rt.len, 1, 1);
      rDummy.updateMatrix();
      rungInst.setMatrixAt(i, rDummy.matrix);
    }
    rungInst.instanceMatrix.needsUpdate = true;
    rungInst.computeBoundingSphere();
    group.add(rungInst);
  }

  // Checkpoint beacon pillars (non-colliding edge markers with warm amber / cyan lamps)
  const beaconMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
  );
  const beaconGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 10));
  for (const cp of spec.checkpoints) {
    const post = new THREE.Mesh(beaconGeo, frameTrimMat);
    post.position.set(cp.position.x - 4.4, cp.position.y + 1.1, cp.position.z);
    group.add(post);

    const lamp = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.14, 10, 8)),
      beaconMat,
    );
    lamp.position.set(0, 1.18, 0);
    post.add(lamp);
  }

  // Shootable reactive target plates along wall corridors
  const ringGeo = trackGeo(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 24));
  ringGeo.rotateX(Math.PI / 2);
  for (const t of spec.targets) {
    const tMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd9483b,
        emissive: 0x45120c,
        emissiveIntensity: 0.6,
        roughness: 0.38,
        metalness: 0.28,
      }),
    );
    targetMaterials.set(t.id, tMat);
    const disc = new THREE.Mesh(ringGeo, tMat);
    disc.position.copy(t.position);
    disc.rotation.y = t.yawRad;
    disc.scale.setScalar(t.radius / 0.65);
    group.add(disc);
    hitMeshes.push(disc);
    targetMeshes.set(disc, t.id);
    targetHitTimers.set(t.id, 0);
  }

  // Distant Instanced Kaluga Silhouette Towers poking through the lower mist abyss (-28m below)
  const spireGeo = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const spireMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x16202c,
      roughness: 0.92,
      metalness: 0.1,
    }),
  );
  const spireCount = 56;
  const spires = new THREE.InstancedMesh(spireGeo, spireMat, spireCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < spireCount; i++) {
    const angle = (i / spireCount) * Math.PI * 2;
    const dist = 75 + ((i * 37) % 140);
    const sx = Math.cos(angle) * dist + 14;
    const sz = Math.sin(angle) * dist - 105;
    const w = 10 + ((i * 19) % 18);
    const d = 10 + ((i * 23) % 18);
    const h = 24 + ((i * 41) % 34);
    dummy.position.set(sx, -42 + h * 0.5, sz);
    dummy.scale.set(w, h, d);
    dummy.rotation.y = (i * 0.41) % Math.PI;
    dummy.updateMatrix();
    spires.setMatrixAt(i, dummy.matrix);
  }
  spires.instanceMatrix.needsUpdate = true;
  group.add(spires);

  return {
    group,
    hitMeshes,
    targetMeshes,
    flashTargetHit(targetId: string) {
      targetHitTimers.set(targetId, 0.35);
    },
    update(dt: number, elapsed: number) {
      beaconMat.emissiveIntensity = 1.6 + Math.sin(elapsed * 2.8) * 0.4;
      for (const [id, timer] of targetHitTimers) {
        const mat = targetMaterials.get(id);
        if (!mat) continue;
        if (timer > 0) {
          const next = Math.max(0, timer - dt);
          targetHitTimers.set(id, next);
          const f = next / 0.35;
          mat.emissive.setHex(0xfbbf24);
          mat.emissiveIntensity = 0.6 + f * 3.8;
        } else {
          mat.emissive.setHex(0x45120c);
          mat.emissiveIntensity = 0.6;
        }
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
