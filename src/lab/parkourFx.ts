import * as THREE from 'three';

interface PoolParticle {
  active: boolean;
  life: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
}

/**
 * Fixed-capacity InstancedMesh particle pool for wall-slide dust sparks,
 * boot-kick concrete puffs, and weapon bullet impact sparks (zero GC).
 */
export class ParkourFxPool {
  private readonly maxParticles = 96;
  private readonly particles: PoolParticle[] = [];
  private readonly mesh: THREE.InstancedMesh;
  private readonly geo: THREE.BufferGeometry;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly dummy = new THREE.Object3D();
  private readonly tmpColor = new THREE.Color();
  private cursor = 0;

  constructor(scene: THREE.Scene) {
    this.geo = new THREE.DodecahedronGeometry(0.065, 0);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, this.maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 0.4,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        size: 1,
      });
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, this.tmpColor.setHex(0xd6d3d1));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    scene.add(this.mesh);
  }

  public spawnBurst(
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    count: number,
    colorHex: number,
    speed = 3.2,
    size = 0.85,
  ): void {
    this.tmpColor.setHex(colorHex);
    for (let k = 0; k < count; k++) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.maxParticles;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.24 + Math.random() * 0.24;
      p.pos.set(x, y, z);
      p.vel.set(
        nx * speed + (Math.random() - 0.5) * 2.2,
        ny * speed + Math.random() * 1.8,
        nz * speed + (Math.random() - 0.5) * 2.2,
      );
      p.size = size * (0.65 + Math.random() * 0.6);
      this.mesh.setColorAt(this.cursor === 0 ? this.maxParticles - 1 : this.cursor - 1, this.tmpColor);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.dummy.scale.setScalar(0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.vel.y -= 9.5 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const frac = 1 - p.life / p.maxLife;
      this.dummy.position.copy(p.pos);
      this.dummy.scale.setScalar(p.size * frac);
      this.dummy.rotation.set(p.life * 6, p.life * 4, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.mesh.parent?.remove(this.mesh);
    this.geo.dispose();
    this.mat.dispose();
  }
}
