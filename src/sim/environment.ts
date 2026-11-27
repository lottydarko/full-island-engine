import * as THREE from 'three';
import { getTerrainHeight, isNearAnyRoad } from './mapData';
import { TextureLibrary } from './textures';

export interface TrainRainExclusion {
  active: boolean;
  center: THREE.Vector3;
  forward: THREE.Vector3;
  stationShelter?: boolean;
}

export interface EnvironmentHandles {
  skyMesh: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  fog: THREE.FogExp2;
  nightFactor: number;
  update: (
    dt: number,
    elapsed: number,
    timeOfDayHours: number, // 0..24
    cameraPos: THREE.Vector3,
    textures: TextureLibrary,
    focusPos: THREE.Vector3,
    trainExclusion?: TrainRainExclusion
  ) => number;
}

// Deeper Midnight Stormy Sky Dome Shader (Slightly darker sky with quiet distant horizon haze)
const SKY_VERTEX_SHADER = `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uTime;
  uniform float uCloudCover;
  varying vec3 vWorldDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.08;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(uHorizonColor, uZenithColor, pow(h, 0.48));

    if (dir.y > 0.01) {
      vec2 uv = dir.xz / (dir.y + 0.24) * 1.45 + vec2(uTime * 0.022, uTime * 0.012);
      float c = fbm(uv * 2.1);
      float cloud = smoothstep(0.30, 0.78, c) * uCloudCover;
      vec3 cloudCol = mix(uHorizonColor * 1.18 + vec3(0.012, 0.016, 0.026), uZenithColor * 0.8, 0.5);
      col = mix(col, cloudCol, cloud * 0.74 * smoothstep(0.01, 0.24, dir.y));
    }

    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sunDot, 28.0) * 0.11;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createEnvironmentSystem(
  scene: THREE.Scene,
  textures: TextureLibrary,
  isSoftwareGl: boolean
): EnvironmentHandles {
  // 1. Deeper, Darker Rain-Night Sky Dome
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    uniforms: {
      uZenithColor: { value: new THREE.Color('#02050c') },
      uHorizonColor: { value: new THREE.Color('#080f1c') },
      uSunDir: { value: new THREE.Vector3(-0.4, 0.48, 0.6).normalize() },
      uSunColor: { value: new THREE.Color('#4a6a92') },
      uTime: { value: 0 },
      uCloudCover: { value: 0.92 },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1600, 24, 16), skyMat);
  scene.add(skyMesh);

  // 2. Darker Midnight Wet-City Fog
  const fog = new THREE.FogExp2('#080f1c', 0.0031);
  scene.fog = fog;
  scene.background = fog.color;

  // 3. Balanced Cool Moonlit Key (keeps roads, traffic & sculpted car curves readable beneath the darker sky!)
  const sunLight = new THREE.DirectionalLight('#7fa2cc', 0.44);
  sunLight.castShadow = !isSoftwareGl;
  if (sunLight.castShadow) {
    sunLight.shadow.mapSize.set(1024, 1024);
    const d = 64;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 220;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.025;
  }
  scene.add(sunLight);
  scene.add(sunLight.target);

  // 4. Subtle Dark-City Hemisphere Fill
  const hemiLight = new THREE.HemisphereLight('#2a4262', '#101924', 0.40);
  scene.add(hemiLight);

  // =========================================================================
  // 5. ONE SIGNATURE SILKY ANIMATED RAINFALL (Soft Feathered Instanced Quads!)
  // Prettier, smoother, slightly thicker, more animated, and low opacity (~0.14).
  // ZERO spiky car-body lines, ZERO tire rain balls at the bottom!
  // =========================================================================
  const rainCount = isSoftwareGl ? 380 : 1280;
  const rainSpan = 56;
  const rainHeight = 26;

  // Soft vertical feathered raindrop streak quad (billboarded in Y toward camera)
  const streakGeo = new THREE.PlaneGeometry(0.058, 1.48);
  const streakMat = new THREE.MeshBasicMaterial({
    map: textures.softRainStreakMap,
    color: '#c8d8e8',
    transparent: true,
    opacity: 0.145, // subtle, soft, atmospheric — never harsh or cluttered!
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rainInst = new THREE.InstancedMesh(streakGeo, streakMat, rainCount);
  rainInst.frustumCulled = false;
  scene.add(rainInst);

  interface RainDrop {
    x: number;
    y: number;
    z: number;
    speedVar: number;
    phase: number;
    widthScale: number;
    lenScale: number;
  }
  const drops: RainDrop[] = [];
  for (let i = 0; i < rainCount; i++) {
    drops.push({
      x: (Math.random() - 0.5) * rainSpan,
      y: Math.random() * rainHeight,
      z: (Math.random() - 0.5) * rainSpan,
      speedVar: 0.78 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      widthScale: 0.8 + Math.random() * 0.72,
      lenScale: 0.78 + Math.random() * 0.68,
    });
  }

  // =========================================================================
  // 6. SUBTLE REFLECTIVE GROUND RAINDROP RIPPLES + BARELY VISIBLE WET PUDDLES
  // =========================================================================
  const rippleCount = isSoftwareGl ? 52 : 165;
  const rippleGeo = new THREE.PlaneGeometry(0.62, 0.62);
  rippleGeo.rotateX(-Math.PI * 0.5);
  const rippleMat = new THREE.MeshBasicMaterial({
    map: textures.rippleMap,
    color: '#c2d6ea',
    transparent: true,
    opacity: 0.23, // crisp, barely-reflective raindrop impact glints on dark wet asphalt!
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const rippleInst = new THREE.InstancedMesh(rippleGeo, rippleMat, rippleCount);
  rippleInst.frustumCulled = false;
  scene.add(rippleInst);

  interface RippleSlot {
    x: number;
    y: number;
    z: number;
    age: number;
    life: number;
    maxScale: number;
  }
  const ripples: RippleSlot[] = [];
  for (let i = 0; i < rippleCount; i++) {
    ripples.push({
      x: (Math.random() - 0.5) * 44,
      y: 0.116,
      z: (Math.random() - 0.5) * 44,
      age: Math.random() * 0.45,
      life: 0.34 + Math.random() * 0.24,
      maxScale: 0.72 + Math.random() * 0.9,
    });
  }

  // World-anchored barely visible dark wet puddles on roads & curbs (never slide with camera!)
  const puddleGridRadius = 3; // 7x7 cells around player
  const puddleCellSize = 24;
  const puddleCount = (puddleGridRadius * 2 + 1) * (puddleGridRadius * 2 + 1);
  const puddleGeo = new THREE.PlaneGeometry(1, 1);
  puddleGeo.rotateX(-Math.PI * 0.5);
  const puddleMat = new THREE.MeshStandardMaterial({
    map: textures.puddleMap,
    color: '#223040',
    roughness: 0.08,
    metalness: 0.28,
    envMapIntensity: 0.55,
    transparent: true,
    opacity: 0.15, // barely visible, quiet dark sheen — never bright or distracting!
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const puddleInst = new THREE.InstancedMesh(puddleGeo, puddleMat, puddleCount);
  puddleInst.frustumCulled = false;
  scene.add(puddleInst);
  let lastPuddleCellX = 999999;
  let lastPuddleCellZ = 999999;

  const hash2i = (ix: number, iz: number): number => {
    const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  // Reusable math/color helpers (zero per-frame GC)
  const cNightZenith = new THREE.Color('#02050c');
  const cNightHorizon = new THREE.Color('#080f1c');
  const cDuskZenith = new THREE.Color('#0b1628');
  const cDuskHorizon = new THREE.Color('#1a2538');
  const cOvercastDayZenith = new THREE.Color('#182638');
  const cOvercastDayHorizon = new THREE.Color('#2c3c50');
  const cMoon = new THREE.Color('#7fa2cc');
  const cOvercastSun = new THREE.Color('#a6bdd4');
  const tmpZenith = new THREE.Color();
  const tmpHorizon = new THREE.Color();
  const tmpSunCol = new THREE.Color();
  const tmpGround = new THREE.Color();
  const rainDummy = new THREE.Object3D();
  const rippleDummy = new THREE.Object3D();
  const puddleDummy = new THREE.Object3D();

  const handle: EnvironmentHandles = {
    skyMesh,
    sunLight,
    hemiLight,
    fog,
    nightFactor: 1.0,
    update: (dt, elapsed, timeOfDayHours, cameraPos, texLib, focusPos, trainExclusion) => {
      // 1. Deeper Moody Midnight Sky & Lighting
      const angle = ((timeOfDayHours - 7.0) / 24) * Math.PI * 2;
      const sunElev = Math.sin(angle);
      const sunAz = Math.cos(angle);

      const dayWeight = THREE.MathUtils.smoothstep(sunElev, 0.0, 0.5);
      const duskWeight = Math.exp(-Math.pow((sunElev - 0.04) / 0.18, 2));
      const nightFactor = 1.0 - dayWeight;
      handle.nightFactor = nightFactor;

      tmpZenith.copy(cNightZenith).lerp(cOvercastDayZenith, dayWeight);
      tmpZenith.lerp(cDuskZenith, duskWeight * 0.45);
      tmpHorizon.copy(cNightHorizon).lerp(cOvercastDayHorizon, dayWeight);
      tmpHorizon.lerp(cDuskHorizon, duskWeight * 0.5);

      skyMesh.position.copy(focusPos);
      skyMat.uniforms.uZenithColor.value.copy(tmpZenith);
      skyMat.uniforms.uHorizonColor.value.copy(tmpHorizon);
      skyMat.uniforms.uTime.value = elapsed;

      const isSunUp = sunElev > -0.02;
      const lightElev = isSunUp ? Math.max(0.2, sunElev * 0.6) : Math.max(0.36, -sunElev * 0.55);
      const lx = isSunUp ? sunAz * 0.8 : -sunAz * 0.7;
      const lz = isSunUp ? -0.52 : 0.52;
      skyMat.uniforms.uSunDir.value.set(lx, lightElev, lz).normalize();

      tmpSunCol.copy(cMoon).lerp(cOvercastSun, dayWeight);
      skyMat.uniforms.uSunColor.value.copy(tmpSunCol);

      fog.color.copy(tmpHorizon);
      fog.density = 0.0029 + nightFactor * 0.00035;

      sunLight.position.set(
        focusPos.x + lx * 100,
        focusPos.y + lightElev * 100,
        focusPos.z + lz * 100
      );
      sunLight.target.position.copy(focusPos);
      sunLight.color.copy(tmpSunCol);
      sunLight.intensity = isSunUp ? 0.52 + dayWeight * 0.62 : 0.42 + nightFactor * 0.08;

      hemiLight.color.copy(tmpHorizon).lerp(cMoon, 0.34);
      tmpGround.set('#101924').lerp(new THREE.Color('#243242'), dayWeight);
      hemiLight.groundColor.copy(tmpGround);
      hemiLight.intensity = 0.38 + dayWeight * 0.30;

      const winGlow = 0.22 + nightFactor * 1.15 + duskWeight * 0.3;
      for (let i = 0; i < texLib.emissiveMaterials.length; i++) {
        texLib.emissiveMaterials[i].emissiveIntensity = winGlow;
      }

      // =====================================================================
      // 2. SILKY, SMOOTHER, THICKER, ANIMATED LOW-OPACITY RAINFALL STREAKS
      // (Strict dry-cabin exclusion zone so rain NEVER falls inside the train!)
      // =====================================================================
      const halfR = rainSpan * 0.5;
      const gustX = 2.6 + Math.sin(elapsed * 0.65) * 1.15;
      const gustZ = 1.05 + Math.cos(elapsed * 0.48) * 0.55;
      const baseFall = 25.0;
      const windLean = Math.atan2(gustX, baseFall) * 0.85;

      const exActive = Boolean(trainExclusion?.active);
      const exX = exActive ? trainExclusion!.center.x : 0;
      const exY = exActive ? trainExclusion!.center.y : 0;
      const exZ = exActive ? trainExclusion!.center.z : 0;
      const exFwdX = exActive ? trainExclusion!.forward.x : 0;
      const exFwdZ = exActive ? trainExclusion!.forward.z : 1;
      const exRightX = exFwdZ;
      const exRightZ = -exFwdX;

      for (let i = 0; i < rainCount; i++) {
        const d = drops[i];
        const sway = Math.sin(elapsed * 2.1 + d.phase) * 0.55;
        d.x += (gustX + sway) * d.speedVar * dt;
        d.y -= baseFall * d.speedVar * dt;
        d.z += gustZ * d.speedVar * dt;

        d.x =
          focusPos.x +
          ((((d.x - focusPos.x + halfR) % rainSpan) + rainSpan) % rainSpan) -
          halfR;
        d.z =
          focusPos.z +
          ((((d.z - focusPos.z + halfR) % rainSpan) + rainSpan) % rainSpan) -
          halfR;
        if (d.y < 0.2) d.y += rainHeight;

        if (exActive) {
          const camDist2 = (d.x - cameraPos.x) ** 2 + (d.z - cameraPos.z) ** 2;
          if (trainExclusion!.stationShelter) {
            // Keep metro station platform roof, escalator bridge & glass entrance pavilion dry overhead!
            const inStationShelter =
              camDist2 < 68.0 && d.y > cameraPos.y - 3.5 && d.y < cameraPos.y + 4.8;
            if (inStationShelter) {
              rainDummy.position.set(0, -100, 0);
              rainDummy.scale.set(0.0001, 0.0001, 0.0001);
              rainDummy.updateMatrix();
              rainInst.setMatrixAt(i, rainDummy.matrix);
              continue;
            }
          } else {
            // Keep the entire 3-car train cabin & close camera interior 100% dry!
            const relX = d.x - exX;
            const relZ = d.z - exZ;
            const along = relX * exFwdX + relZ * exFwdZ;
            const across = relX * exRightX + relZ * exRightZ;
            const inTrainBox =
              Math.abs(across) < 2.85 &&
              Math.abs(along) < 38.0 &&
              d.y > exY - 0.8 &&
              d.y < exY + 5.2;
            if (inTrainBox || camDist2 < 6.2) {
              rainDummy.position.set(0, -100, 0);
              rainDummy.scale.set(0.0001, 0.0001, 0.0001);
              rainDummy.updateMatrix();
              rainInst.setMatrixAt(i, rainDummy.matrix);
              continue;
            }
          }
        }

        const faceYaw = Math.atan2(cameraPos.x - d.x, cameraPos.z - d.z);
        rainDummy.position.set(d.x, d.y, d.z);
        rainDummy.rotation.set(0, faceYaw, -windLean);
        rainDummy.scale.set(d.widthScale, d.lenScale, 1);
        rainDummy.updateMatrix();
        rainInst.setMatrixAt(i, rainDummy.matrix);
      }
      rainInst.instanceMatrix.needsUpdate = true;

      // =====================================================================
      // 3. QUIET EXPANDING WATER RIPPLES ON FLOODED STREETS
      // =====================================================================
      const rippleRadius = 28;
      for (let i = 0; i < rippleCount; i++) {
        const rp = ripples[i];
        rp.age += dt;
        if (rp.age >= rp.life) {
          rp.age = 0;
          rp.life = 0.34 + Math.random() * 0.26;
          rp.maxScale = 0.68 + Math.random() * 0.9;
          const a = Math.random() * Math.PI * 2;
          const r = 1.8 + Math.sqrt(Math.random()) * rippleRadius;
          rp.x = focusPos.x + Math.cos(a) * r;
          rp.z = focusPos.z + Math.sin(a) * r;
          rp.y = isNearAnyRoad(rp.x, rp.z, 0.5)
            ? 0.116
            : Math.max(0.05, getTerrainHeight(rp.x, rp.z) + 0.04);
        }

        const t = rp.age / rp.life;
        const scale =
          t < 0.85 ? 0.16 + t * rp.maxScale : (1.0 - (t - 0.85) / 0.15) * rp.maxScale;
        rippleDummy.position.set(rp.x, rp.y, rp.z);
        rippleDummy.rotation.set(0, i * 0.7, 0);
        rippleDummy.scale.set(Math.max(0.01, scale), 1, Math.max(0.01, scale));
        rippleDummy.updateMatrix();
        rippleInst.setMatrixAt(i, rippleDummy.matrix);
      }
      rippleInst.instanceMatrix.needsUpdate = true;

      // =====================================================================
      // 4. BARELY VISIBLE WORLD-ANCHORED DARK WET PUDDLES ON STREETS
      // =====================================================================
      const cx = Math.floor(focusPos.x / puddleCellSize);
      const cz = Math.floor(focusPos.z / puddleCellSize);
      if (cx !== lastPuddleCellX || cz !== lastPuddleCellZ) {
        lastPuddleCellX = cx;
        lastPuddleCellZ = cz;
        let idx = 0;
        for (let gx = cx - puddleGridRadius; gx <= cx + puddleGridRadius; gx++) {
          for (let gz = cz - puddleGridRadius; gz <= cz + puddleGridRadius; gz++) {
            const h1 = hash2i(gx, gz);
            const h2 = hash2i(gx + 17, gz - 31);
            const h3 = hash2i(gx - 53, gz + 11);
            const wx = (gx + 0.15 + h1 * 0.7) * puddleCellSize;
            const wz = (gz + 0.15 + h2 * 0.7) * puddleCellSize;
            const onRoad = isNearAnyRoad(wx, wz, 0.2);
            if (onRoad && h3 > 0.34) {
              const sx = 3.6 + h1 * 4.4;
              const sz = 2.6 + h2 * 3.8;
              puddleDummy.position.set(wx, 0.111, wz);
              puddleDummy.rotation.set(0, h3 * Math.PI * 2, 0);
              puddleDummy.scale.set(sx, 1, sz);
            } else {
              puddleDummy.position.set(0, -100, 0);
              puddleDummy.scale.set(0.001, 0.001, 0.001);
            }
            puddleDummy.updateMatrix();
            puddleInst.setMatrixAt(idx++, puddleDummy.matrix);
          }
        }
        puddleInst.instanceMatrix.needsUpdate = true;
      }

      return nightFactor;
    },
  };

  return handle;
}
