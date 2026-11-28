import * as THREE from 'three';

export type MuzzleFlashProfile = 'pistol' | 'smg' | 'shotgun' | 'futuristic';

export interface MuzzleFlashOptions {
  profile?: MuzzleFlashProfile;
  scale?: number;
  colorHex?: number;
  tintHex?: number;
  lightRange?: number;
  lightIntensity?: number;
  maxAnisotropy?: number;
}

export interface PhotorealisticMuzzleFlash {
  group: THREE.Group;
  light: THREE.PointLight;
  setIntensity: (intensity: number) => void;
  dispose: () => void;
}

function createStarburstFlashTexture(
  profile: MuzzleFlashProfile,
  colorHex: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size * 0.5;

  const tint = new THREE.Color(colorHex);
  const r = Math.round(tint.r * 255);
  const g = Math.round(tint.g * 255);
  const b = Math.round(tint.b * 255);

  ctx.clearRect(0, 0, size, size);

  // Outer hot bloom halo
  const halo = ctx.createRadialGradient(half, half, 2, half, half, half * 0.94);
  halo.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  halo.addColorStop(0.18, `rgba(255,244,218,0.92)`);
  halo.addColorStop(0.46, `rgba(${r},${g},${b},0.52)`);
  halo.addColorStop(1.0, `rgba(${r},${g},${b},0.0)`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);

  // Directional gas petals
  const petals = profile === 'shotgun' ? 8 : profile === 'futuristic' ? 6 : 5;
  ctx.save();
  ctx.translate(half, half);
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2 + (i % 2) * 0.14;
    ctx.save();
    ctx.rotate(angle);
    const petalGrad = ctx.createLinearGradient(0, 0, half * 0.92, 0);
    petalGrad.addColorStop(0.0, 'rgba(255,255,255,0.95)');
    petalGrad.addColorStop(0.45, `rgba(${r},${g},${b},0.55)`);
    petalGrad.addColorStop(1.0, `rgba(${r},${g},${b},0.0)`);
    ctx.fillStyle = petalGrad;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(half * 0.48, -22, half * 0.95, 0);
    ctx.quadraticCurveTo(half * 0.48, 22, 0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, Math.max(1, maxAnisotropy || 1));
  tex.needsUpdate = true;
  return tex;
}

export function createPhotorealisticMuzzleFlash(
  opts: MuzzleFlashOptions = {},
): PhotorealisticMuzzleFlash {
  const profile = opts.profile ?? 'pistol';
  const scale = opts.scale ?? 1.0;
  const colorHex = opts.tintHex ?? opts.colorHex ?? 0xffb35a;
  const lightRange = opts.lightRange ?? 4.5 * scale;
  const maxLightIntensity = opts.lightIntensity ?? (profile === 'shotgun' ? 3.8 : 2.6);
  const maxAnisotropy = opts.maxAnisotropy ?? 4;

  const group = new THREE.Group();
  group.visible = false;

  const tex = createStarburstFlashTexture(profile, colorHex, maxAnisotropy);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const geoCross = new THREE.PlaneGeometry(0.24 * scale, 0.24 * scale);
  const frontPlane = new THREE.Mesh(geoCross, mat);
  group.add(frontPlane);

  const geoJet = new THREE.PlaneGeometry(0.18 * scale, 0.34 * scale);
  const jetV = new THREE.Mesh(geoJet, mat);
  jetV.rotation.x = Math.PI / 2;
  jetV.position.z = -0.14 * scale;
  group.add(jetV);

  const jetH = new THREE.Mesh(geoJet, mat);
  jetH.rotation.x = Math.PI / 2;
  jetH.rotation.z = Math.PI / 2;
  jetH.position.z = -0.14 * scale;
  group.add(jetH);

  const light = new THREE.PointLight(colorHex, 0, lightRange, 2);
  light.position.set(0, 0.01, -0.08 * scale);
  group.add(light);

  return {
    group,
    light,
    setIntensity(intensity: number) {
      const i = THREE.MathUtils.clamp(intensity, 0, 1.5);
      if (i <= 0.01) {
        group.visible = false;
        mat.opacity = 0;
        light.intensity = 0;
        return;
      }
      group.visible = true;
      mat.opacity = Math.min(1, i);
      light.intensity = i * maxLightIntensity;
      const jitter = 0.85 + Math.random() * 0.3;
      group.scale.setScalar(jitter * (0.7 + i * 0.45));
      frontPlane.rotation.z = Math.random() * Math.PI * 2;
    },
    dispose() {
      geoCross.dispose();
      geoJet.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}
