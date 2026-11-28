import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRiggedHuman, HumanRig } from './humanCharacter';
import { createTextureLibrary, TextureLibrary } from './textures';
import { createSharedWeaponMesh, SharedWeaponFxPool } from './sharedWeapon';
import {
  applyBehaviorPose,
  ARCHETYPE_PROFILES,
  attachBenchActorGear,
  BenchActorAttachments,
  getGripDisplayLabel,
  getWeaponDisplayLabel,
  GunHandlingState,
  InteractionPoseAction,
  resolveClassWeapon,
} from './behaviorPoseLayers';
import {
  buildSharedVehicleGeometries,
  buildTrafficVehicleMesh,
  createTrafficTailHaloMat,
} from './trafficSystem';
import {
  getVignetteById,
  getVignetteDuration,
  VignetteBeatInfo,
  VignetteCastSpec,
  VignetteCueEvent,
  VignetteId,
  VignetteVehicleFrame,
} from './behaviorVignettes';

export type BenchTimeOfDay = 'day' | 'night';
export type BenchCameraPreset = 'wide' | 'two_shot' | 'close' | 'first_person';

export interface BenchProjectedActorTag {
  id: string;
  label: string;
  role: string;
  archetypeLabel: string;
  weaponLabel: string;
  gripLabel: string;
  gunState: GunHandlingState;
  interaction: InteractionPoseAction;
  xPct: number;
  yPct: number;
  visible: boolean;
}

export interface BehaviorLabSnapshot {
  vignetteId: VignetteId;
  variantId: string;
  timeSec: number;
  durationSec: number;
  playing: boolean;
  speed: number;
  timeOfDay: BenchTimeOfDay;
  cameraPreset: BenchCameraPreset;
  beat: VignetteBeatInfo;
  actors: BenchProjectedActorTag[];
  contextLost: boolean;
}

interface StagedActor {
  spec: VignetteCastSpec;
  rig: HumanRig;
  gear: BenchActorAttachments;
  ringMesh: THREE.Mesh;
  x: number;
  z: number;
  yaw: number;
}

interface SprayParticle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface BloodParticle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

function createMistTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255, 165, 65, 0.92)');
  g.addColorStop(0.55, 'rgba(235, 110, 35, 0.45)');
  g.addColorStop(1, 'rgba(210, 80, 20, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBloodParticleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 48;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(24, 24, 2, 24, 24, 22);
  g.addColorStop(0, 'rgba(78, 6, 12, 0.98)');
  g.addColorStop(0.55, 'rgba(54, 4, 8, 0.85)');
  g.addColorStop(1, 'rgba(38, 2, 5, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 48, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSnowflakeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 14);
  g.addColorStop(0, 'rgba(235, 244, 255, 0.9)');
  g.addColorStop(0.6, 'rgba(210, 228, 248, 0.35)');
  g.addColorStop(1, 'rgba(210, 228, 248, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function normalizeAngleDiff(target: number, current: number): number {
  let d = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class BehaviorLabBench {
  private container: HTMLElement;
  private onSnapshot: (snap: BehaviorLabSnapshot) => void;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: TextureLibrary;
  private fxPool: SharedWeaponFxPool;
  private stageRoot = new THREE.Group();

  // Lighting refs for smooth day/night transition
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private lampLight: THREE.PointLight;
  private lampBulbMat: THREE.MeshStandardMaterial;
  private skyBgDay = new THREE.Color('#8ea2b6');
  private skyBgNight = new THREE.Color('#09101a');
  private fogDay = new THREE.Color('#95a7b8');
  private fogNight = new THREE.Color('#09101a');
  private dayBlend = 0; // 0 = night, 1 = day

  // Snow, spray, blood & scavenge props FX
  private snowPoints: THREE.Points;
  private snowPositions: Float32Array;
  private sprayParticles: SprayParticle[] = [];
  private mistTex: THREE.CanvasTexture;
  private bloodParticles: BloodParticle[] = [];
  private bloodTex: THREE.CanvasTexture;
  private bloodPoolMesh: THREE.Mesh;
  private lootScatterGroup: THREE.Group;

  // Vignette state
  private vignetteId: VignetteId = 'hold_up';
  private variantId = 'comply';
  private timeSec = 0;
  private prevEvalTimeSec = 0;
  private playing = true;
  private speed = 1.0;
  private timeOfDay: BenchTimeOfDay = 'night';
  private cameraPreset: BenchCameraPreset = 'two_shot';
  private firedCueIds = new Set<string>();
  private contextLost = false;

  // Cast
  private stagedActors: StagedActor[] = [];
  private actorMap = new Map<string, StagedActor>();

  // Drive-By vehicle rigs (sedan + large black van reused from trafficSystem)
  private driveByCarRoot: THREE.Group;
  private driveByCarTilt: THREE.Group;
  private driveByBrakeMat: THREE.MeshStandardMaterial;
  private driveByHeadMat: THREE.MeshStandardMaterial;
  private driveByTailHaloMat: THREE.ShaderMaterial;
  private driveByHeadlight: THREE.SpotLight;
  private driveByWindowGun: THREE.Group;
  private driveByMuzzleAnchor: THREE.Object3D;

  private vanRoot!: THREE.Group;
  private vanTilt!: THREE.Group;
  private vanBrakeMat!: THREE.MeshStandardMaterial;
  private vanHeadMat!: THREE.MeshStandardMaterial;
  private vanTrimLedMat!: THREE.MeshStandardMaterial;
  private vanBayLedMat!: THREE.MeshStandardMaterial;
  private vanBayLight!: THREE.PointLight;
  private vanTailHaloMat!: THREE.ShaderMaterial;
  private vanHeadlight!: THREE.SpotLight;
  private vanSlidingDoor!: THREE.Group;

  private tailCoverGroup: THREE.Group;
  private squareOffCoverGroup: THREE.Group;
  private latestVehicleFrame: VignetteVehicleFrame | null = null;

  // Zero-GC scratch buffers for collision solver & 1st-person eye camera
  private _colX: number[] = [];
  private _colZ: number[] = [];
  private _colHidden: boolean[] = [];
  private _colSkipActorPair: boolean[] = [];
  private _colY: number[] = [];
  private _fpvEyeLocal = new THREE.Vector3(0, 0.085, 0.09);
  private _fpvLookLocal = new THREE.Vector3(0, 0.04, 2.8);
  private _fpvEyeWorld = new THREE.Vector3();
  private _fpvLookWorld = new THREE.Vector3();

  // Camera orbit state
  private orbitYaw = 0.24;
  private orbitPitch = 0.22;
  private orbitDist = 6.2;
  private targetOrbitYaw = 0.24;
  private targetOrbitPitch = 0.22;
  private targetOrbitDist = 6.2;
  private camFocus = new THREE.Vector3(0, 1.08, 0);
  private dragging = false;
  private dragLastX = 0;
  private dragLastY = 0;

  private rafId = 0;
  private lastNow = performance.now();
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private disposables: { dispose: () => void }[] = [];
  private lastUiEmitAt = 0;

  private _projVec = new THREE.Vector3();
  private _muzzlePos = new THREE.Vector3();
  private _targetPos = new THREE.Vector3();
  private _shotDir = new THREE.Vector3();
  private _focusTarget = new THREE.Vector3();

  constructor(container: HTMLElement, onSnapshot: (snap: BehaviorLabSnapshot) => void) {
    this.container = container;
    this.onSnapshot = onSnapshot;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(
      Math.max(1, container.clientWidth),
      Math.max(1, container.clientHeight)
    );
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this.skyBgNight.clone();
    this.scene.fog = new THREE.FogExp2('#09101a', 0.032);

    this.camera = new THREE.PerspectiveCamera(
      42,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      90
    );

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = envRT.texture;
    this.disposables.push(envRT);
    roomEnv.dispose();
    pmrem.dispose();

    // Lights (calibrated three-point + sodium streetlamp)
    this.hemiLight = new THREE.HemisphereLight('#476282', '#171d26', 0.65);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#b4cae6', 1.15);
    this.keyLight.position.set(7, 11, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 28;
    this.keyLight.shadow.camera.left = -9;
    this.keyLight.shadow.camera.right = 9;
    this.keyLight.shadow.camera.top = 9;
    this.keyLight.shadow.camera.bottom = -9;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight('#6088b4', 0.85);
    this.rimLight.position.set(-7, 5, -6);
    this.scene.add(this.rimLight);

    this.lampLight = new THREE.PointLight('#f5a644', 3.4, 16, 1.4);
    this.lampLight.position.set(-2.6, 4.35, -2.5);
    this.lampLight.castShadow = false;
    this.scene.add(this.lampLight);

    this.textures = createTextureLibrary(this.renderer);
    this.fxPool = new SharedWeaponFxPool(28);
    this.scene.add(this.fxPool.root);
    this.scene.add(this.stageRoot);

    this.mistTex = createMistTexture();
    this.bloodTex = createBloodParticleTexture();
    this.disposables.push(this.mistTex, this.bloodTex);

    // Persistent growing dark maroon blood pool mesh on wet asphalt
    const poolGeo = new THREE.CircleGeometry(1, 28);
    poolGeo.rotateX(-Math.PI * 0.5);
    const poolMat = new THREE.MeshStandardMaterial({
      color: '#3e050a',
      roughness: 0.14,
      metalness: 0.08,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });
    this.bloodPoolMesh = new THREE.Mesh(poolGeo, poolMat);
    this.bloodPoolMesh.position.set(0, 0.013, 0);
    this.bloodPoolMesh.visible = false;
    this.stageRoot.add(this.bloodPoolMesh);
    this.disposables.push(poolGeo, poolMat);

    // Turned-out pockets / dropped empty wallet & paper scraps for The Scavenge
    this.lootScatterGroup = this.buildLootScatterGroup();
    this.lootScatterGroup.visible = false;
    this.stageRoot.add(this.lootScatterGroup);

    // Drive-By dark Kaluga sedan rig (from trafficSystem)
    const sharedVehGeo = buildSharedVehicleGeometries();
    this.driveByTailHaloMat = createTrafficTailHaloMat();
    this.disposables.push(
      ...Object.values(sharedVehGeo),
      this.driveByTailHaloMat
    );
    const builtCar = buildTrafficVehicleMesh(
      'sedan',
      '#151922',
      'KAL',
      sharedVehGeo,
      this.textures,
      this.driveByTailHaloMat,
      false,
      0
    );
    this.driveByBrakeMat = builtCar.brakeMat;
    this.driveByHeadMat = builtCar.headMat;
    const seenCarMats = new Set<THREE.Material>();
    builtCar.group.traverse((obj) => {
      const m = (obj as THREE.Mesh).material;
      if (Array.isArray(m)) {
        for (const sub of m) {
          if (sub && !seenCarMats.has(sub)) {
            seenCarMats.add(sub);
            this.disposables.push(sub);
          }
        }
      } else if (m && !seenCarMats.has(m)) {
        seenCarMats.add(m);
        this.disposables.push(m);
      }
    });
    this.driveByCarRoot = new THREE.Group();
    this.driveByCarTilt = new THREE.Group();
    this.driveByCarTilt.add(builtCar.group);
    this.driveByCarRoot.add(this.driveByCarTilt);

    // Shared full-auto carbine protruding from right (+X) passenger window facing curb target
    this.driveByWindowGun = new THREE.Group();
    this.driveByWindowGun.position.set(0.84, 1.02, -0.05);
    const carbineMesh = createSharedWeaponMesh(0.86, 'full_auto_carbine');
    carbineMesh.rotation.y = Math.PI * 0.5;
    this.driveByWindowGun.add(carbineMesh);
    const carbineMuzzle = carbineMesh.getObjectByName('MuzzleAnchor');
    if (carbineMuzzle) {
      this.driveByMuzzleAnchor = carbineMuzzle;
    } else {
      this.driveByMuzzleAnchor = new THREE.Object3D();
      this.driveByMuzzleAnchor.position.set(0.45, 0.02, 0);
      this.driveByWindowGun.add(this.driveByMuzzleAnchor);
    }
    carbineMesh.traverse((obj) => {
      const m = (obj as THREE.Mesh).material;
      if (m && !Array.isArray(m)) this.disposables.push(m);
      if ((obj as THREE.Mesh).geometry) this.disposables.push((obj as THREE.Mesh).geometry);
    });
    this.driveByWindowGun.visible = false;
    this.driveByCarTilt.add(this.driveByWindowGun);

    // Forward headlight cone/spill light (shadow-free for 60fps performance)
    this.driveByHeadlight = new THREE.SpotLight('#e2efff', 18, 36, Math.PI * 0.28, 0.85, 1.4);
    this.driveByHeadlight.position.set(0, 0.72, 2.3);
    const hlTarget = new THREE.Object3D();
    hlTarget.position.set(0, -0.35, 22);
    this.driveByCarTilt.add(hlTarget);
    this.driveByHeadlight.target = hlTarget;
    this.driveByHeadlight.castShadow = false;
    this.driveByCarTilt.add(this.driveByHeadlight);

    this.driveByCarRoot.visible = false;
    this.stageRoot.add(this.driveByCarRoot);

    // Detailed Futuristic Black Van rig with real openable sliding door, interior bay & subtle LED glow
    this.buildFuturisticVan();

    // Build Kaluga street bench stage + Tail cover props + Square-Off opposing firefight cover barriers
    this.lampBulbMat = this.buildStageGeometry();
    this.tailCoverGroup = this.buildTailCoverProps();
    this.tailCoverGroup.visible = false;
    this.stageRoot.add(this.tailCoverGroup);
    this.squareOffCoverGroup = this.buildSquareOffCoverProps();
    this.squareOffCoverGroup.visible = false;
    this.stageRoot.add(this.squareOffCoverGroup);

    // Falling snow particles
    const snowCount = 260;
    this.snowPositions = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * 22;
      this.snowPositions[i * 3 + 1] = Math.random() * 8;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    const snowTex = createSnowflakeTexture();
    const snowMat = new THREE.PointsMaterial({
      map: snowTex,
      size: 0.11,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.disposables.push(snowGeo, snowTex, snowMat);
    this.snowPoints = new THREE.Points(snowGeo, snowMat);
    this.scene.add(this.snowPoints);

    // Spray particle pool
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.mistTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.disposables.push(mat);
      this.sprayParticles.push({
        sprite,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.7,
      });
    }

    // Dark maroon blood burst particle pool
    for (let i = 0; i < 30; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.bloodTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.disposables.push(mat);
      this.bloodParticles.push({
        sprite,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0.55,
      });
    }

    // Bind pointer orbit + wheel zoom + context loss
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('webglcontextlost', this.onContextLost);
    dom.addEventListener('webglcontextrestored', this.onContextRestored);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    // Load default vignette
    this.loadVignette('hold_up', 'comply');
    this.applyCameraPreset('two_shot', true);
    this.animate();
  }

  private buildFuturisticVan(): void {
    // Procedural armor-plate panel & ribbed interior steel deck textures
    const armorCanvas = document.createElement('canvas');
    armorCanvas.width = 256;
    armorCanvas.height = 256;
    const actx = armorCanvas.getContext('2d')!;
    actx.fillStyle = '#11151d';
    actx.fillRect(0, 0, 256, 256);
    actx.strokeStyle = 'rgba(130, 165, 210, 0.14)';
    actx.lineWidth = 2;
    for (let p = 0; p < 256; p += 64) {
      actx.strokeRect(p + 2, 2, 60, 124);
      actx.strokeRect(p + 2, 130, 60, 124);
    }
    actx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 12; y < 256; y += 64) {
      for (let x = 10; x < 256; x += 32) {
        actx.fillRect(x, y, 2, 2);
      }
    }
    const armorTex = new THREE.CanvasTexture(armorCanvas);
    armorTex.wrapS = THREE.RepeatWrapping;
    armorTex.wrapT = THREE.RepeatWrapping;
    armorTex.repeat.set(2, 2);
    armorTex.colorSpace = THREE.SRGBColorSpace;

    const ribCanvas = document.createElement('canvas');
    ribCanvas.width = 256;
    ribCanvas.height = 256;
    const rctx = ribCanvas.getContext('2d')!;
    rctx.fillStyle = '#1b2029';
    rctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      rctx.fillStyle = '#252c38';
      rctx.fillRect(0, y, 256, 6);
      rctx.fillStyle = '#0f1319';
      rctx.fillRect(0, y + 6, 256, 3);
    }
    rctx.strokeStyle = 'rgba(72, 185, 235, 0.12)';
    rctx.lineWidth = 1;
    rctx.strokeRect(8, 8, 240, 240);
    const ribTex = new THREE.CanvasTexture(ribCanvas);
    ribTex.wrapS = THREE.RepeatWrapping;
    ribTex.wrapT = THREE.RepeatWrapping;
    ribTex.repeat.set(3, 4);
    ribTex.colorSpace = THREE.SRGBColorSpace;

    const shellMat = new THREE.MeshStandardMaterial({
      color: '#131720',
      map: armorTex,
      roughnessMap: this.textures.trafficPaintRoughness,
      bumpMap: this.textures.trafficPaintBump,
      bumpScale: 0.008,
      roughness: 0.34,
      metalness: 0.68,
    });
    const trimDarkMat = new THREE.MeshStandardMaterial({
      color: '#0b0d13',
      map: this.textures.carbonWeaveMap,
      roughness: 0.48,
      metalness: 0.52,
    });
    const interiorWallMat = new THREE.MeshStandardMaterial({
      color: '#232934',
      map: ribTex,
      roughness: 0.58,
      metalness: 0.45,
      side: THREE.DoubleSide,
    });
    const interiorFloorMat = new THREE.MeshStandardMaterial({
      color: '#1c212b',
      map: ribTex,
      roughness: 0.44,
      metalness: 0.62,
    });
    const padBenchMat = new THREE.MeshStandardMaterial({
      color: '#181a20',
      roughness: 0.85,
      metalness: 0.08,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#0a1524',
      roughness: 0.08,
      metalness: 0.12,
      transmission: 0.18,
      transparent: true,
      opacity: 0.88,
    });
    this.vanHeadMat = new THREE.MeshStandardMaterial({
      color: '#d8f2ff',
      emissive: new THREE.Color('#9ee2ff'),
      emissiveIntensity: 2.2,
      roughness: 0.15,
    });
    this.vanBrakeMat = new THREE.MeshStandardMaterial({
      color: '#e11d48',
      emissive: new THREE.Color('#ff1e42'),
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    this.vanTrimLedMat = new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: new THREE.Color('#22d3ee'),
      emissiveIntensity: 1.45,
      roughness: 0.2,
    });
    this.vanBayLedMat = new THREE.MeshStandardMaterial({
      color: '#bae6fd',
      emissive: new THREE.Color('#38bdf8'),
      emissiveIntensity: 1.55,
      roughness: 0.22,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: '#15171c',
      map: this.textures.tireTreadMap,
      roughness: 0.82,
      metalness: 0.05,
    });
    const alloyMat = new THREE.MeshStandardMaterial({
      color: '#303846',
      roughness: 0.3,
      metalness: 0.85,
    });
    const plateMat = new THREE.MeshStandardMaterial({
      map: this.textures.licensePlateMap,
      roughness: 0.5,
      metalness: 0.2,
    });

    this.vanTailHaloMat = createTrafficTailHaloMat();
    this.disposables.push(
      armorTex,
      ribTex,
      shellMat,
      trimDarkMat,
      interiorWallMat,
      interiorFloorMat,
      padBenchMat,
      glassMat,
      this.vanHeadMat,
      this.vanBrakeMat,
      this.vanTrimLedMat,
      this.vanBayLedMat,
      tireMat,
      alloyMat,
      plateMat,
      this.vanTailHaloMat
    );

    this.vanRoot = new THREE.Group();
    this.vanTilt = new THREE.Group();
    const g = new THREE.Group();

    const addBox = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: THREE.Material,
      cast = true
    ): THREE.Mesh => {
      const geo = new THREE.BoxGeometry(w, h, d);
      this.disposables.push(geo);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };

    // Lower armored chassis deck & side rocker skirts (y: 0.26..0.44)
    addBox(g, 2.02, 0.18, 4.92, 0, 0.35, -0.05, trimDarkMat, true);
    // Ribbed interior cargo floor visible cleanly from open door & 1st-person POV
    addBox(g, 1.94, 0.03, 3.52, 0, 0.455, -0.71, interiorFloorMat, false);

    // Front cab & angled futuristic nose (+Z: 1.04..2.42)
    addBox(g, 2.04, 0.68, 1.15, 0, 0.78, 1.62, shellMat, true);
    const hoodGeo = new THREE.BoxGeometry(1.96, 0.36, 0.72);
    this.disposables.push(hoodGeo);
    const hood = new THREE.Mesh(hoodGeo, shellMat);
    hood.position.set(0, 0.98, 1.98);
    hood.rotation.x = 0.26;
    hood.castShadow = true;
    g.add(hood);
    // Front bull-bar / splitter bumper
    addBox(g, 2.08, 0.24, 0.22, 0, 0.42, 2.34, trimDarkMat, true);
    // Angled dark windshield + stealth roof brow
    const wsGeo = new THREE.BoxGeometry(1.86, 0.78, 0.06);
    this.disposables.push(wsGeo);
    const ws = new THREE.Mesh(wsGeo, glassMat);
    ws.position.set(0, 1.48, 1.56);
    ws.rotation.x = -0.44;
    g.add(ws);
    addBox(g, 1.98, 0.34, 0.78, 0, 1.88, 1.12, shellMat, true);
    // Cab side doors (+X & -X) with recessed glass
    addBox(g, 0.08, 0.72, 0.92, 1.01, 1.46, 1.18, glassMat, false);
    addBox(g, 0.08, 0.72, 0.92, -1.01, 1.46, 1.18, glassMat, false);
    addBox(g, 0.09, 0.74, 0.94, 1.01, 0.78, 1.18, shellMat, true);
    addBox(g, 0.09, 0.74, 0.94, -1.01, 0.78, 1.18, shellMat, true);

    // Hollow cargo bay exterior + interior lined walls (lz: -2.47..+1.05, width: 2.04)
    // Left wall (-X solid)
    addBox(g, 0.06, 1.64, 3.54, -1.01, 1.26, -0.71, shellMat, true);
    addBox(g, 0.03, 1.54, 3.46, -0.96, 1.24, -0.71, interiorWallMat, false);
    // Rear twin doors (lz = -2.46)
    addBox(g, 0.99, 1.64, 0.07, -0.505, 1.26, -2.46, shellMat, true);
    addBox(g, 0.99, 1.64, 0.07, 0.505, 1.26, -2.46, shellMat, true);
    addBox(g, 1.9, 1.54, 0.03, 0, 1.24, -2.41, interiorWallMat, false);
    // Roof shell + interior steel ceiling ribs
    addBox(g, 2.04, 0.10, 3.62, 0, 2.06, -0.71, shellMat, true);
    for (let rz = -2.1; rz <= 0.75; rz += 0.7) {
      addBox(g, 1.9, 0.05, 0.08, 0, 1.99, rz, trimDarkMat, false);
    }
    // Interior cab-to-bay bulkhead partition + dim backlit dash grille (lz = +1.03)
    addBox(g, 1.94, 1.56, 0.06, 0, 1.25, 1.03, trimDarkMat, true);
    addBox(g, 0.95, 0.42, 0.02, 0, 1.52, 0.99, interiorWallMat, false);
    // Right (+X) wall frames around genuine open doorway (doorway gap: lz = -1.02 .. +0.32, width = 1.34m!)
    // Rear right quarter panel (lz: -2.47 .. -1.02)
    addBox(g, 0.07, 1.64, 1.45, 1.01, 1.26, -1.745, shellMat, true);
    addBox(g, 0.03, 1.54, 1.38, 0.96, 1.24, -1.73, interiorWallMat, false);
    // Forward B-pillar between cab & doorway (lz: +0.32 .. +1.05)
    addBox(g, 0.07, 1.64, 0.74, 1.01, 1.26, 0.685, shellMat, true);
    addBox(g, 0.03, 1.54, 0.68, 0.96, 1.24, 0.68, interiorWallMat, false);
    // Doorway top header rail (ly: 1.88..2.06)
    addBox(g, 0.08, 0.18, 1.36, 1.01, 1.97, -0.35, shellMat, true);

    // Interior cargo bay furnishings (wheel-well housings + left-side bench + grab handle)
    addBox(g, 0.34, 0.34, 0.78, -0.79, 0.62, -1.35, trimDarkMat, false);
    addBox(g, 0.34, 0.34, 0.78, 0.79, 0.62, -1.35, trimDarkMat, false);
    // Tactical side utility bench along left interior wall
    addBox(g, 0.42, 0.12, 1.95, -0.73, 0.82, -0.35, padBenchMat, false);
    addBox(g, 0.06, 0.36, 1.95, -0.92, 1.12, -0.35, padBenchMat, false);

    // Subtle Futuristic LED Glows:
    // 1. Slim dual ice-cyan LED headlight blades & subtle grille accent
    addBox(g, 0.44, 0.055, 0.06, -0.68, 0.80, 2.24, this.vanHeadMat, false);
    addBox(g, 0.44, 0.055, 0.06, 0.68, 0.80, 2.24, this.vanHeadMat, false);
    addBox(g, 0.72, 0.024, 0.04, 0, 0.72, 2.25, this.vanTrimLedMat, false);
    // 2. Subtle cyan lower rocker-sill LED strips + doorway threshold LED accent
    addBox(g, 0.025, 0.026, 3.85, 1.045, 0.32, -0.32, this.vanTrimLedMat, false);
    addBox(g, 0.025, 0.026, 3.85, -1.045, 0.32, -0.32, this.vanTrimLedMat, false);
    // 3. Two slim interior ceiling LED light strips illuminating cargo bay walls & ribbed floor
    addBox(g, 0.07, 0.025, 2.55, -0.42, 1.99, -0.70, this.vanBayLedMat, false);
    addBox(g, 0.07, 0.025, 2.55, 0.42, 1.99, -0.70, this.vanBayLedMat, false);
    // 4. Vertical crimson LED brake blades + plate on rear doors
    addBox(g, 0.07, 0.82, 0.05, -0.92, 1.08, -2.49, this.vanBrakeMat, false);
    addBox(g, 0.07, 0.82, 0.05, 0.92, 1.08, -2.49, this.vanBrakeMat, false);
    addBox(g, 0.46, 0.14, 0.02, 0, 0.62, -2.50, plateMat, false);
    const haloGeo = new THREE.PlaneGeometry(0.65, 0.65);
    this.disposables.push(haloGeo);
    for (const sx of [-0.92, 0.92]) {
      const h = new THREE.Mesh(haloGeo, this.vanTailHaloMat);
      h.position.set(sx, 1.08, -2.53);
      h.rotation.y = Math.PI;
      g.add(h);
    }

    // Animated futuristic sliding cargo door (+X doorway: lz = -0.35, width 1.38m)
    this.vanSlidingDoor = new THREE.Group();
    addBox(this.vanSlidingDoor, 0.06, 1.44, 1.38, 0, 1.16, 0, shellMat, true);
    addBox(this.vanSlidingDoor, 0.025, 1.34, 1.28, -0.028, 1.16, 0, interiorWallMat, false);
    // Armored door rib + flush dark handle + hairline cyan LED track indicator
    addBox(this.vanSlidingDoor, 0.02, 0.08, 1.24, 0.032, 0.92, 0, trimDarkMat, false);
    addBox(this.vanSlidingDoor, 0.03, 0.04, 0.22, 0.04, 1.08, 0.44, alloyMat, false);
    addBox(this.vanSlidingDoor, 0.022, 0.022, 1.16, 0.036, 0.56, 0, this.vanTrimLedMat, false);
    this.vanSlidingDoor.position.set(1.03, 0, -0.35);
    g.add(this.vanSlidingDoor);

    // 4 detailed tires + gunmetal alloy 6-spoke wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 22);
    wheelGeo.rotateZ(Math.PI * 0.5);
    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.275, 12);
    rimGeo.rotateZ(Math.PI * 0.5);
    const hubCapGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.29, 8);
    hubCapGeo.rotateZ(Math.PI * 0.5);
    this.disposables.push(wheelGeo, rimGeo, hubCapGeo);
    const wheelCoords: [number, number][] = [
      [-0.96, 1.56],
      [0.96, 1.56],
      [-0.96, -1.35],
      [0.96, -1.35],
    ];
    for (const [wx, wz] of wheelCoords) {
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.position.set(wx, 0.38, wz);
      tire.castShadow = true;
      g.add(tire);
      const rim = new THREE.Mesh(rimGeo, alloyMat);
      rim.position.set(wx, 0.38, wz);
      g.add(rim);
      const hub = new THREE.Mesh(hubCapGeo, this.vanTrimLedMat);
      hub.position.set(wx, 0.38, wz);
      g.add(hub);
    }

    // Shadowless interior cargo bay light + forward headlight spotlight (Chromebook 60fps safe)
    this.vanBayLight = new THREE.PointLight('#64cfff', 1.4, 4.8, 1.5);
    this.vanBayLight.position.set(0.15, 1.72, -0.35);
    this.vanBayLight.castShadow = false;
    g.add(this.vanBayLight);

    this.vanHeadlight = new THREE.SpotLight('#d8f0ff', 18, 36, Math.PI * 0.28, 0.85, 1.4);
    this.vanHeadlight.position.set(0, 0.80, 2.32);
    const vanHlTarget = new THREE.Object3D();
    vanHlTarget.position.set(0, -0.35, 22);
    g.add(vanHlTarget);
    this.vanHeadlight.target = vanHlTarget;
    this.vanHeadlight.castShadow = false;
    g.add(this.vanHeadlight);

    this.vanTilt.add(g);
    this.vanRoot.add(this.vanTilt);
    this.vanRoot.visible = false;
    this.stageRoot.add(this.vanRoot);
  }

  private buildLootScatterGroup(): THREE.Group {
    const g = new THREE.Group();
    const walletMat = new THREE.MeshStandardMaterial({ color: '#2b1e16', roughness: 0.78 });
    const pocketMat = new THREE.MeshStandardMaterial({ color: '#b4bcc8', roughness: 0.9 });
    const paperMat = new THREE.MeshStandardMaterial({ color: '#d7dce3', roughness: 0.85 });
    const walletGeo = new THREE.BoxGeometry(0.11, 0.018, 0.075);
    const flapGeo = new THREE.BoxGeometry(0.09, 0.014, 0.065);
    const paperGeo = new THREE.BoxGeometry(0.08, 0.004, 0.055);
    this.disposables.push(walletMat, pocketMat, paperMat, walletGeo, flapGeo, paperGeo);

    // Splayed open empty wallet
    const walletL = new THREE.Mesh(walletGeo, walletMat);
    walletL.position.set(0.28, 0.018, 0.24);
    walletL.rotation.set(0, 0.42, 0);
    g.add(walletL);

    // Turned-out coat/trouser pocket lining flaps beside victim's hips
    const pocketL = new THREE.Mesh(flapGeo, pocketMat);
    pocketL.position.set(-0.22, 0.14, 0.21);
    pocketL.rotation.set(0.35, -0.4, 0.18);
    g.add(pocketL);

    const pocketR = new THREE.Mesh(flapGeo, pocketMat);
    pocketR.position.set(0.19, 0.13, -0.24);
    pocketR.rotation.set(-0.3, 0.55, -0.2);
    g.add(pocketR);

    // Dropped receipt / transit pass papers
    const paper1 = new THREE.Mesh(paperGeo, paperMat);
    paper1.position.set(0.42, 0.016, 0.12);
    paper1.rotation.y = -0.65;
    g.add(paper1);

    const paper2 = new THREE.Mesh(paperGeo, paperMat);
    paper2.position.set(0.18, 0.016, 0.36);
    paper2.rotation.y = 1.1;
    g.add(paper2);

    return g;
  }

  private buildStageGeometry(): THREE.MeshStandardMaterial {
    // Wet winter Kaluga asphalt road + curb + sidewalk stage
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.textures.asphaltDottedMap,
      roughnessMap: this.textures.asphaltRoughness,
      bumpMap: this.textures.asphaltBump,
      bumpScale: 0.018,
      roughness: 0.48,
      metalness: 0.12,
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: this.textures.sidewalkMap,
      roughness: 0.86,
      metalness: 0.04,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: '#6b727d',
      roughness: 0.88,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: '#d9e3ee',
      roughness: 0.92,
      metalness: 0.02,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: '#20262f',
      roughness: 0.45,
      metalness: 0.65,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: '#4e3c30',
      roughness: 0.85,
    });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: '#ffcf7d',
      emissive: new THREE.Color('#ffaa38'),
      emissiveIntensity: 2.2,
      roughness: 0.25,
    });
    this.disposables.push(roadMat, sidewalkMat, curbMat, snowMat, metalMat, woodMat, bulbMat);

    // Main asphalt lane
    const road = new THREE.Mesh(new THREE.PlaneGeometry(36, 26), roadMat);
    road.rotation.x = -Math.PI * 0.5;
    road.receiveShadow = true;
    this.stageRoot.add(road);

    // Raised winter sidewalk along north (-Z) edge
    const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(36, 0.14, 7.5), sidewalkMat);
    sidewalk.position.set(0, 0.05, -6.2);
    sidewalk.receiveShadow = true;
    this.stageRoot.add(sidewalk);

    // Subtle snow drifts at curb & far background
    const snowBank = new THREE.Mesh(new THREE.BoxGeometry(36, 0.08, 1.1), snowMat);
    snowBank.position.set(0, 0.03, -2.55);
    snowBank.receiveShadow = true;
    this.stageRoot.add(snowBank);

    // Soviet concrete bollards along curb
    const bollardGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.72, 10);
    this.disposables.push(bollardGeo);
    for (const bx of [-5.2, 0.4, 5.4]) {
      const bollard = new THREE.Mesh(bollardGeo, curbMat);
      bollard.position.set(bx, 0.4, -2.95);
      bollard.castShadow = true;
      bollard.receiveShadow = true;
      this.stageRoot.add(bollard);
    }

    // Streetlamp post
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.6, 10), metalMat);
    pole.position.set(-2.6, 2.3, -3.2);
    pole.castShadow = true;
    this.stageRoot.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.95), metalMat);
    arm.position.set(-2.6, 4.52, -2.78);
    this.stageRoot.add(arm);

    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.36), metalMat);
    lampHead.position.set(-2.6, 4.48, -2.42);
    this.stageRoot.add(lampHead);

    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.28), bulbMat);
    bulb.position.set(-2.6, 4.42, -2.42);
    this.stageRoot.add(bulb);

    // Park / bus-stop bench on sidewalk
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.48), woodMat);
    benchSeat.position.set(2.4, 0.48, -3.55);
    benchSeat.castShadow = true;
    benchSeat.receiveShadow = true;
    this.stageRoot.add(benchSeat);

    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.42, 0.05), woodMat);
    benchBack.position.set(2.4, 0.72, -3.76);
    benchBack.rotation.x = -0.14;
    benchBack.castShadow = true;
    this.stageRoot.add(benchBack);

    for (const lx of [1.7, 3.1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.44), metalMat);
      leg.position.set(lx, 0.24, -3.55);
      this.stageRoot.add(leg);
    }

    // Subtle background Soviet building silhouette wall so actors frame against winter concrete
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.concreteWeatheredMap,
      bumpMap: this.textures.concreteBump,
      bumpScale: 0.025,
      roughness: 0.9,
    });
    this.disposables.push(wallMat);
    const backFacade = new THREE.Mesh(new THREE.BoxGeometry(28, 9.5, 2.2), wallMat);
    backFacade.position.set(0, 4.75, -10.8);
    backFacade.receiveShadow = true;
    this.stageRoot.add(backFacade);

    return bulbMat;
  }

  private buildTailCoverProps(): THREE.Group {
    const g = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: '#27303b', roughness: 0.52, metalness: 0.55 });
    const kioskMat = new THREE.MeshStandardMaterial({ color: '#394654', roughness: 0.72, metalness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#88a4be',
      roughness: 0.18,
      metalness: 0.15,
      transparent: true,
      opacity: 0.42,
    });
    const signMat = new THREE.MeshStandardMaterial({
      color: '#dce5f0',
      emissive: new THREE.Color('#86a2c4'),
      emissiveIntensity: 0.45,
      roughness: 0.45,
    });
    const posterTex = new THREE.TextureLoader().load('/assets/ads/posters/bus02_nebo_poster.webp');
    posterTex.colorSpace = THREE.SRGBColorSpace;
    const posterMat = new THREE.MeshStandardMaterial({
      map: posterTex,
      roughness: 0.65,
    });
    this.disposables.push(steelMat, kioskMat, glassMat, signMat, posterTex, posterMat);

    // 1. Street Newspaper / Transit Kiosk (-4.4, 0, -3.95; body x:[-5.30,-3.50], z:[-4.55,-3.35])
    const kioskBody = new THREE.Mesh(new THREE.BoxGeometry(1.80, 2.35, 1.20), kioskMat);
    kioskBody.position.set(-4.4, 1.24, -3.95);
    kioskBody.castShadow = true;
    kioskBody.receiveShadow = true;
    g.add(kioskBody);
    const kioskRoof = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.12, 1.50), steelMat);
    kioskRoof.position.set(-4.4, 2.46, -3.90);
    kioskRoof.castShadow = true;
    g.add(kioskRoof);
    const kioskWin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 0.04), signMat);
    kioskWin.position.set(-4.4, 1.48, -3.34);
    g.add(kioskWin);

    // 2. Cylindrical Kaluga Poster Pillar (-0.35, 0, -3.55; radius 0.46) with real ad poster art
    const pillarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.22, 20), steelMat);
    pillarBase.position.set(-0.35, 0.18, -3.55);
    g.add(pillarBase);
    const pillarDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 1.85, 24), posterMat);
    pillarDrum.position.set(-0.35, 1.2, -3.55);
    pillarDrum.castShadow = true;
    pillarDrum.receiveShadow = true;
    g.add(pillarDrum);
    const pillarCap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.14, 20), steelMat);
    pillarCap.position.set(-0.35, 2.18, -3.55);
    g.add(pillarCap);

    // 3. Bus Stop Shelter (2.4, 0, -4.25) framing the sidewalk queue at z = -3.35
    const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 1.45), steelMat);
    shelterRoof.position.set(2.4, 2.38, -4.25);
    shelterRoof.castShadow = true;
    g.add(shelterRoof);
    const shelterBack = new THREE.Mesh(new THREE.BoxGeometry(3.15, 2.1, 0.06), glassMat);
    shelterBack.position.set(2.4, 1.25, -4.85);
    g.add(shelterBack);
    for (const px of [0.82, 2.4, 3.98]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.3, 8), steelMat);
      post.position.set(px, 1.2, -4.85);
      post.castShadow = true;
      g.add(post);
    }
    const stopSign = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.06), signMat);
    stopSign.position.set(4.15, 2.05, -3.75);
    g.add(stopSign);

    return g;
  }

  private buildSquareOffCoverProps(): THREE.Group {
    const g = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#525b66',
      map: this.textures.concreteWeatheredMap,
      bumpMap: this.textures.concreteBump,
      bumpScale: 0.02,
      roughness: 0.88,
      metalness: 0.06,
    });
    const steelBoxMat = new THREE.MeshStandardMaterial({
      color: '#252d36',
      roughness: 0.56,
      metalness: 0.58,
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: '#a36b22',
      roughness: 0.65,
      metalness: 0.15,
    });
    this.disposables.push(concreteMat, steelBoxMat, hazardMat);

    const addBarrier = (cx: number, cz: number, w: number, h: number, d: number, isSteelBlock: boolean) => {
      const baseGeo = new THREE.BoxGeometry(w, h, d);
      const capGeo = new THREE.BoxGeometry(w * 0.82, 0.12, d * 0.94);
      const trimGeo = new THREE.BoxGeometry(w + 0.02, 0.08, d + 0.02);
      this.disposables.push(baseGeo, capGeo, trimGeo);

      const base = new THREE.Mesh(baseGeo, isSteelBlock ? steelBoxMat : concreteMat);
      base.position.set(cx, h * 0.5, cz);
      base.castShadow = true;
      base.receiveShadow = true;
      g.add(base);

      const cap = new THREE.Mesh(capGeo, isSteelBlock ? concreteMat : steelBoxMat);
      cap.position.set(cx, h + 0.06, cz);
      cap.castShadow = true;
      cap.receiveShadow = true;
      g.add(cap);

      const trim = new THREE.Mesh(trimGeo, hazardMat);
      trim.position.set(cx, h * 0.82, cz);
      g.add(trim);
    };

    // West Flank Cover (Gang A: Red-Trim Crew at -6.35, -0.45 and -6.05, +1.75)
    addBarrier(-5.65, -0.45, 0.62, 0.96, 1.85, false);
    addBarrier(-5.35, 1.75, 0.66, 0.98, 1.50, true);

    // East Flank Cover (Crew B: Port Brigade at +6.35, -0.35 and +6.05, +1.75)
    addBarrier(5.65, -0.35, 0.62, 0.96, 1.85, false);
    addBarrier(5.35, 1.75, 0.66, 0.98, 1.50, true);

    return g;
  }

  public loadVignette(vignetteId: VignetteId, variantId?: string): void {
    const def = getVignetteById(vignetteId);
    this.vignetteId = def.id;
    this.variantId =
      variantId && def.variants.some((v) => v.id === variantId)
        ? variantId
        : def.defaultVariantId;

    // Clear old actors
    for (const actor of this.stagedActors) {
      this.stageRoot.remove(actor.rig.root);
      this.stageRoot.remove(actor.ringMesh);
      actor.ringMesh.geometry.dispose();
      (actor.ringMesh.material as THREE.Material).dispose();
    }
    this.stagedActors = [];
    this.actorMap.clear();

    const castSpecs = def.cast(this.variantId);
    const ringGeo = new THREE.RingGeometry(0.38, 0.43, 28);
    ringGeo.rotateX(-Math.PI * 0.5);

    for (let i = 0; i < castSpecs.length; i++) {
      const spec = castSpecs[i];
      const rig = createRiggedHuman(spec.variantIdx, this.textures, spec.outfit, 'none');
      if (spec.coatColorHex) {
        const jacketMesh = rig.root.children.find(
          (c): c is THREE.SkinnedMesh => (c as THREE.SkinnedMesh).isSkinnedMesh
        );
        const coatMat = jacketMesh?.material as THREE.MeshPhysicalMaterial | undefined;
        if (coatMat && coatMat.color) {
          coatMat.color.set(spec.coatColorHex);
          if (coatMat.sheenColor) {
            coatMat.sheenColor.set(spec.coatColorHex).lerp(new THREE.Color('#8ea2b8'), 0.22);
          }
        }
      }
      rig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      const gear = attachBenchActorGear(rig, spec.weaponKind, {
        hasPepperSpray: spec.hasPepperSpray,
        hasCashProp: spec.hasCashProp,
        hasFedora: spec.hasFedora,
      });

      const ringColor =
        spec.archetype === 'undercover'
          ? '#38bdf8'
          : spec.archetype === 'gang' || spec.archetype === 'rebel_girl'
          ? '#f87171'
          : spec.archetype === 'mob'
          ? '#fbbf24'
          : '#94a3b8';

      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo.clone(), ringMat);
      ringMesh.position.set(0, 0.015, 0);

      this.stageRoot.add(rig.root);
      this.stageRoot.add(ringMesh);

      const staged: StagedActor = {
        spec,
        rig,
        gear,
        ringMesh,
        x: 0,
        z: 0,
        yaw: 0,
      };
      this.stagedActors.push(staged);
      this.actorMap.set(spec.id, staged);
    }
    ringGeo.dispose();

    this.tailCoverGroup.visible = def.id === 'the_tail';
    this.squareOffCoverGroup.visible = def.id === 'square_off';
    if (this.variantId === 'snatch_player_fpv') {
      this.applyCameraPreset('first_person', true);
    } else if (
      def.id === 'the_drive_by' ||
      def.id === 'the_van_snatch' ||
      def.id === 'the_tail' ||
      def.id === 'square_off'
    ) {
      this.applyCameraPreset('wide', true);
    } else if (this.cameraPreset === 'first_person') {
      this.applyCameraPreset('two_shot', true);
    }

    this.replay();
  }

  public setVariant(variantId: string): void {
    this.loadVignette(this.vignetteId, variantId);
  }

  public replay(): void {
    this.timeSec = 0;
    this.prevEvalTimeSec = -0.001;
    this.firedCueIds.clear();
    for (const sp of this.sprayParticles) {
      sp.life = 0;
      sp.sprite.visible = false;
    }
    for (const bp of this.bloodParticles) {
      bp.life = 0;
      bp.sprite.visible = false;
    }
    this.playing = true;
    this.evaluateAt(0, true);
    this.emitSnapshot(true);
  }

  public setPlaying(playing: boolean): void {
    this.playing = playing;
    this.emitSnapshot(true);
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
    this.emitSnapshot(true);
  }

  public scrubTo(timeSec: number): void {
    const def = getVignetteById(this.vignetteId);
    const dur = getVignetteDuration(def, this.variantId);
    const clamped = THREE.MathUtils.clamp(timeSec, 0, dur);
    this.timeSec = clamped;
    this.prevEvalTimeSec = clamped;
    this.firedCueIds.clear();
    for (const cue of def.cues(this.variantId)) {
      if (cue.timeSec <= clamped) {
        this.firedCueIds.add(cue.id);
      }
    }
    this.evaluateAt(clamped, false);
    this.emitSnapshot(true);
  }

  public setTimeOfDay(mode: BenchTimeOfDay): void {
    this.timeOfDay = mode;
    this.emitSnapshot(true);
  }

  public applyCameraPreset(preset: BenchCameraPreset, immediate = false): void {
    this.cameraPreset = preset;
    if (preset === 'wide') {
      if (this.vignetteId === 'square_off') {
        this.targetOrbitYaw = 0.08;
        this.targetOrbitPitch = 0.24;
        this.targetOrbitDist = 11.8;
      } else {
        this.targetOrbitYaw = 0.14;
        this.targetOrbitPitch = 0.28;
        this.targetOrbitDist = 9.2;
      }
    } else if (preset === 'two_shot') {
      this.targetOrbitYaw = 0.24;
      this.targetOrbitPitch = 0.21;
      this.targetOrbitDist = 5.6;
    } else if (preset === 'close') {
      this.targetOrbitYaw = 0.42;
      this.targetOrbitPitch = 0.15;
      this.targetOrbitDist = 3.15;
    }
    if (immediate) {
      this.orbitYaw = this.targetOrbitYaw;
      this.orbitPitch = this.targetOrbitPitch;
      this.orbitDist = this.targetOrbitDist;
    }
    this.emitSnapshot(true);
  }

  private triggerCueFx(cue: VignetteCueEvent): void {
    const actor = this.actorMap.get(cue.actorId);
    const target = cue.targetId ? this.actorMap.get(cue.targetId) : undefined;
    const isCarShooter = cue.actorId === 'driveby_car';
    const isCarTarget = cue.targetId === 'driveby_car';
    if (!actor && !isCarShooter) return;

    if (cue.kind === 'gunshot') {
      if (isCarShooter) {
        this.driveByCarRoot.updateMatrixWorld(true);
        this.driveByMuzzleAnchor.getWorldPosition(this._muzzlePos);
        if (target) {
          this._targetPos.set(
            target.x + (Math.random() - 0.5) * 0.45,
            0.95 + Math.random() * 0.35,
            target.z + (Math.random() - 0.5) * 0.35
          );
        } else {
          this._targetPos.set(this._muzzlePos.x, 1.0, this._muzzlePos.z - 6);
        }
        this.fxPool.spawnShot(this._muzzlePos, this._targetPos, true);
        return;
      }

      if (!actor) return;
      actor.rig.root.updateMatrixWorld(true);
      if (actor.gear.muzzleAnchor) {
        actor.gear.muzzleAnchor.getWorldPosition(this._muzzlePos);
      } else {
        this._muzzlePos.set(actor.x, 1.32, actor.z);
      }
      if (isCarTarget && this.latestVehicleFrame) {
        this._targetPos.set(
          this.latestVehicleFrame.x + (Math.random() - 0.5) * 0.7,
          0.95 + Math.random() * 0.25,
          this.latestVehicleFrame.z
        );
      } else if (target) {
        this._targetPos.set(target.x + (Math.random() - 0.5) * 0.4, 1.15, target.z + (Math.random() - 0.5) * 0.4);
      } else {
        this._targetPos.set(
          this._muzzlePos.x + Math.sin(actor.yaw) * 12,
          this._muzzlePos.y - 0.1,
          this._muzzlePos.z + Math.cos(actor.yaw) * 12
        );
      }
      this.fxPool.spawnShot(this._muzzlePos, this._targetPos, true);
      return;
    }

    if (!actor) return;

    if (cue.kind === 'pepper_spray') {
      actor.rig.root.updateMatrixWorld(true);
      if (actor.gear.sprayNozzle) {
        actor.gear.sprayNozzle.getWorldPosition(this._muzzlePos);
      } else {
        this._muzzlePos.set(actor.x, 1.32, actor.z);
      }
      if (target) {
        this._shotDir.set(target.x - this._muzzlePos.x, 0.12, target.z - this._muzzlePos.z).normalize();
      } else {
        this._shotDir.set(Math.sin(actor.yaw), 0.1, Math.cos(actor.yaw)).normalize();
      }
      for (let i = 0; i < this.sprayParticles.length; i++) {
        const sp = this.sprayParticles[i];
        sp.sprite.position.copy(this._muzzlePos);
        sp.sprite.scale.setScalar(0.14);
        sp.sprite.visible = true;
        sp.vel
          .copy(this._shotDir)
          .multiplyScalar(3.2 + Math.random() * 2.2)
          .add(new THREE.Vector3((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.9));
        sp.life = 0.65;
        sp.maxLife = 0.65;
      }
    } else if (cue.kind === 'blood_hit') {
      // Dark maroon gunshot impact burst (10 pooled droplets per round)
      const hitX = actor.x;
      const hitZ = actor.z;
      const shooterDirX = target ? Math.sign(actor.x - target.x) || 1 : 1;
      let spawned = 0;
      for (let i = 0; i < this.bloodParticles.length && spawned < 10; i++) {
        const bp = this.bloodParticles[i];
        if (bp.life > 0) continue;
        bp.sprite.position.set(
          hitX + (Math.random() - 0.5) * 0.12,
          1.12 + (Math.random() - 0.5) * 0.24,
          hitZ + (Math.random() - 0.5) * 0.12
        );
        const s = 0.06 + Math.random() * 0.08;
        bp.sprite.scale.set(s, s, 1);
        bp.sprite.visible = true;
        bp.vel.set(
          shooterDirX * (1.2 + Math.random() * 2.4) + (Math.random() - 0.5) * 1.4,
          0.6 + Math.random() * 1.9,
          (Math.random() - 0.5) * 1.8
        );
        bp.maxLife = 0.42 + Math.random() * 0.25;
        bp.life = bp.maxLife;
        spawned++;
      }
    }
  }

  private latestBeat: VignetteBeatInfo = {
    name: '',
    description: '',
  };

  private latestActorTags: BenchProjectedActorTag[] = [];

  private evaluateAt(t: number, fireCues: boolean): void {
    const def = getVignetteById(this.vignetteId);
    const res = def.evaluate(this.variantId, t);
    this.latestBeat = res.beat;

    if (fireCues) {
      for (const cue of def.cues(this.variantId)) {
        if (!this.firedCueIds.has(cue.id) && t >= cue.timeSec && this.prevEvalTimeSec < cue.timeSec) {
          this.firedCueIds.add(cue.id);
          this.triggerCueFx(cue);
        }
      }
    }
    this.prevEvalTimeSec = t;

    const frameById = new Map(res.actors.map((a) => [a.castId, a]));
    const centralActors = res.actors.filter((a) => !a.hidden && Math.abs(a.x) < 5.5 && Math.abs(a.z) < 4.5);
    const focusActors = centralActors.length > 0 ? centralActors : res.actors;
    const centerSumX = focusActors.reduce((acc, a) => acc + a.x, 0);
    const centerSumZ = focusActors.reduce((acc, a) => acc + a.z, 0);
    const count = Math.max(1, focusActors.length);
    this._focusTarget.set(
      centerSumX / count,
      1.02,
      res.vehicles && res.vehicles.length > 0
        ? -0.6
        : def.id === 'the_tail'
        ? -2.9
        : centerSumZ / count
    );
    this.camFocus.lerp(this._focusTarget, 0.16);

    // Update Drive-By sedan or Large Black Van if active in this vignette
    const carFrame = res.vehicles?.[0] ?? null;
    this.latestVehicleFrame = carFrame;
    if (carFrame) {
      const isVan = carFrame.vehicleType === 'van';
      this.driveByCarRoot.visible = !isVan;
      this.vanRoot.visible = isVan;
      if (isVan) {
        this.vanRoot.position.set(carFrame.x, 0.02, carFrame.z);
        this.vanRoot.rotation.set(0, carFrame.yaw, 0);
        this.vanTilt.rotation.x = carFrame.pitch;
        this.vanBrakeMat.emissiveIntensity = carFrame.braking ? 4.2 : 1.35;
        this.vanTailHaloMat.uniforms.uIntensity.value = carFrame.braking ? 0.82 : 0.28;
        this.vanHeadMat.emissiveIntensity = THREE.MathUtils.lerp(2.6, 0.55, this.dayBlend);
        this.vanTrimLedMat.emissiveIntensity = THREE.MathUtils.lerp(1.65, 0.55, this.dayBlend);
        const openAmt = THREE.MathUtils.clamp(carFrame.vanDoorOpen ?? 0, 0, 1);
        this.vanBayLedMat.emissiveIntensity = THREE.MathUtils.lerp(1.3, 2.35, openAmt);
        this.vanBayLight.intensity = THREE.MathUtils.lerp(1.35, 3.6, openAmt);
        this.vanHeadlight.intensity = THREE.MathUtils.lerp(22, 1.5, this.dayBlend);
        this.vanSlidingDoor.position.set(
          THREE.MathUtils.lerp(1.03, 1.09, Math.min(1, openAmt * 3)),
          0,
          THREE.MathUtils.lerp(-0.35, -1.68, openAmt)
        );
      } else {
        this.driveByCarRoot.position.set(carFrame.x, 0.02, carFrame.z);
        this.driveByCarRoot.rotation.set(0, carFrame.yaw, 0);
        this.driveByCarTilt.rotation.x = carFrame.pitch;
        this.driveByBrakeMat.emissiveIntensity = carFrame.braking ? 4.2 : 1.15;
        this.driveByTailHaloMat.uniforms.uIntensity.value = carFrame.braking ? 0.78 : 0.25;
        this.driveByWindowGun.visible = carFrame.weaponOut;
        const rk = carFrame.recoilKick ?? 0;
        this.driveByWindowGun.position.x = 0.84 - rk * 0.045;
        this.driveByHeadMat.emissiveIntensity = THREE.MathUtils.lerp(2.4, 0.45, this.dayBlend);
        this.driveByHeadlight.intensity = THREE.MathUtils.lerp(22, 1.5, this.dayBlend);
      }
    } else {
      this.driveByCarRoot.visible = false;
      this.vanRoot.visible = false;
    }

    // Zero-GC stage collision physics (props, vehicles w/ doorway corridor, & actor-to-actor separation)
    const countActors = this.stagedActors.length;
    while (this._colX.length < countActors) {
      this._colX.push(0);
      this._colZ.push(0);
      this._colHidden.push(false);
      this._colSkipActorPair.push(false);
      this._colY.push(0);
    }
    for (let i = 0; i < countActors; i++) {
      const staged = this.stagedActors[i];
      const frame = frameById.get(staged.spec.id);
      if (!frame) {
        this._colHidden[i] = true;
        continue;
      }
      this._colX[i] = frame.x;
      this._colZ[i] = frame.z;
      this._colHidden[i] = !!frame.hidden;
      this._colY[i] = frame.yOffset ?? 0;
      this._colSkipActorPair[i] =
        !!frame.hidden ||
        frame.interaction === 'downed' ||
        frame.interaction === 'thrown_in_van';
    }
    this.resolveStageCollisions(countActors, carFrame);

    // Deterministic persistent dark maroon blood pool + turned-out pocket scraps
    let poolActor: typeof res.actors[number] | undefined;
    let lootActor: typeof res.actors[number] | undefined;
    for (const f of res.actors) {
      if ((f.bloodPoolProgress ?? 0) > 0.005) poolActor = f;
      if ((f.lootScatterProgress ?? 0) > 0.005) lootActor = f;
    }
    if (poolActor && (poolActor.bloodPoolProgress ?? 0) > 0.005) {
      const p = poolActor.bloodPoolProgress!;
      const rad = THREE.MathUtils.lerp(0.14, 0.95, p);
      this.bloodPoolMesh.visible = true;
      this.bloodPoolMesh.position.set(poolActor.x, 0.013, poolActor.z);
      this.bloodPoolMesh.scale.set(rad, 1, rad * 0.84);
    } else {
      this.bloodPoolMesh.visible = false;
    }
    if (lootActor && (lootActor.lootScatterProgress ?? 0) > 0.005) {
      const lp = lootActor.lootScatterProgress!;
      this.lootScatterGroup.visible = true;
      this.lootScatterGroup.position.set(lootActor.x, 0.01, lootActor.z);
      this.lootScatterGroup.scale.setScalar(THREE.MathUtils.clamp(lp * 1.4, 0.2, 1));
    } else {
      this.lootScatterGroup.visible = false;
    }

    for (let i = 0; i < this.stagedActors.length; i++) {
      const staged = this.stagedActors[i];
      const frame = frameById.get(staged.spec.id);
      if (!frame) continue;
      staged.x = this._colX[i];
      staged.z = this._colZ[i];
      staged.yaw = frame.yaw;

      const isHidden = !!frame.hidden;
      staged.rig.root.visible = !isHidden;
      staged.ringMesh.visible = !isHidden;
      staged.rig.root.position.set(staged.x, 0.02 + (frame.yOffset ?? 0), staged.z);
      staged.rig.root.rotation.set(0, frame.yaw, 0);
      staged.ringMesh.position.set(staged.x, 0.02, staged.z);
      if (isHidden) continue;

      let lookYaw = 0;
      if (frame.lookTargetId) {
        const partner = frameById.get(frame.lookTargetId);
        if (partner) {
          const desired = Math.atan2(partner.x - staged.x, partner.z - staged.z);
          lookYaw = normalizeAngleDiff(desired, frame.yaw);
        } else if (frame.lookTargetId === 'driveby_car' && carFrame) {
          const desired = Math.atan2(carFrame.x - staged.x, carFrame.z - staged.z);
          lookYaw = normalizeAngleDiff(desired, frame.yaw);
        }
      }

      applyBehaviorPose(
        staged.rig,
        {
          archetype: staged.spec.archetype,
          baseMode: 'standing_idle',
          elapsed: t + 1.2,
          phase: i * 1.37,
          walkSpeed: frame.walkSpeed,
          gunState: frame.gunState,
          gunStateProgress: frame.gunStateProgress,
          interaction: frame.interaction,
          interactionProgress: frame.interactionProgress,
          lookYaw,
          recoilKick: frame.recoilKick,
          handInPocket: frame.handInPocket,
          bagged: frame.bagged,
        },
        staged.gear
      );
    }
  }

  private pushOutCircle(idx: number, cx: number, cz: number, minR: number): void {
    const dx = this._colX[idx] - cx;
    const dz = this._colZ[idx] - cz;
    const dSq = dx * dx + dz * dz;
    if (dSq < minR * minR) {
      const d = Math.sqrt(dSq);
      if (d > 1e-4) {
        const push = minR - d;
        this._colX[idx] += (dx / d) * push;
        this._colZ[idx] += (dz / d) * push;
      } else {
        this._colZ[idx] = cz - minR;
      }
    }
  }

  private pushOutAABB(
    idx: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    r: number
  ): void {
    const x = this._colX[idx];
    const z = this._colZ[idx];
    const exMinX = minX - r;
    const exMaxX = maxX + r;
    const exMinZ = minZ - r;
    const exMaxZ = maxZ + r;
    if (x > exMinX && x < exMaxX && z > exMinZ && z < exMaxZ) {
      const penL = x - exMinX;
      const penR = exMaxX - x;
      const penB = z - exMinZ;
      const penT = exMaxZ - z;
      const m = Math.min(penL, penR, penB, penT);
      if (m === penL) this._colX[idx] = exMinX;
      else if (m === penR) this._colX[idx] = exMaxX;
      else if (m === penB) this._colZ[idx] = exMinZ;
      else this._colZ[idx] = exMaxZ;
    }
  }

  private resolveStageCollisions(count: number, carFrame: VignetteVehicleFrame | null): void {
    const r = 0.26;
    const minPair = 0.54;

    // 1. Static Kaluga street props & Tail cover obstacles
    for (let i = 0; i < count; i++) {
      if (this._colHidden[i]) continue;
      if (this._colZ[i] < -9.45) this._colZ[i] = -9.45;
      // Bollards & streetlamp pole
      this.pushOutCircle(i, -5.2, -2.95, 0.14 + r);
      this.pushOutCircle(i, 0.4, -2.95, 0.14 + r);
      this.pushOutCircle(i, 5.4, -2.95, 0.14 + r);
      this.pushOutCircle(i, -2.6, -3.2, 0.11 + r);
      // Park bench AABB
      this.pushOutAABB(i, 1.52, 3.28, -3.80, -3.30, r);

      if (this.vignetteId === 'the_tail') {
        // Kiosk body (-4.4, -3.95, size 1.80 x 1.20)
        this.pushOutAABB(i, -5.30, -3.50, -4.55, -3.35, r);
        // Cylindrical Poster Pillar (-0.35, -3.55, radius 0.46)
        this.pushOutCircle(i, -0.35, -3.55, 0.46 + r);
        // Bus Shelter Back wall & Stop Sign
        this.pushOutAABB(i, 0.80, 4.00, -4.92, -4.76, r);
        this.pushOutCircle(i, 4.15, -3.75, 0.09 + r);
      } else if (this.vignetteId === 'square_off') {
        // West Flank Cover Barriers
        this.pushOutAABB(i, -5.96, -5.34, -1.38, 0.48, r);
        this.pushOutAABB(i, -5.68, -5.02, 1.00, 2.50, r);
        // East Flank Cover Barriers
        this.pushOutAABB(i, 5.34, 5.96, -1.28, 0.58, r);
        this.pushOutAABB(i, 5.02, 5.68, 1.00, 2.50, r);
      }

      // Active vehicle hull collision (respecting open sliding doorway corridor for cargo bay)
      if (carFrame) {
        const isVan = carFrame.vehicleType === 'van';
        if (isVan) {
          const doorOpen = (carFrame.vanDoorOpen ?? 0) > 0.35;
          const inDoorCorridor =
            doorOpen &&
            this._colX[i] >= carFrame.x - 1.02 &&
            this._colX[i] <= carFrame.x + 0.32 &&
            this._colZ[i] >= carFrame.z - 1.35 &&
            this._colZ[i] <= carFrame.z + 0.85;
          if (!inDoorCorridor) {
            this.pushOutAABB(i, carFrame.x - 2.50, carFrame.x + 2.40, carFrame.z - 1.04, carFrame.z + 1.04, r);
          } else {
            // Clamp safely inside hollow cargo bay bulkhead & rear wall
            if (this._colZ[i] > carFrame.z + 0.72) this._colZ[i] = carFrame.z + 0.72;
          }
        } else {
          this.pushOutAABB(i, carFrame.x - 2.35, carFrame.x + 2.35, carFrame.z - 0.96, carFrame.z + 0.96, r);
        }
      }
    }

    // 2. Actor-to-actor solid separation (prevents meshing without disrupting grab poses >= 0.70m)
    for (let i = 0; i < count; i++) {
      if (this._colSkipActorPair[i]) continue;
      for (let j = i + 1; j < count; j++) {
        if (this._colSkipActorPair[j]) continue;
        if (Math.abs(this._colY[i] - this._colY[j]) > 0.35) continue;
        const dx = this._colX[j] - this._colX[i];
        const dz = this._colZ[j] - this._colZ[i];
        const dSq = dx * dx + dz * dz;
        if (dSq < minPair * minPair && dSq > 1e-6) {
          const d = Math.sqrt(dSq);
          const halfPush = (minPair - d) * 0.5;
          const nx = dx / d;
          const nz = dz / d;
          this._colX[i] -= nx * halfPush;
          this._colZ[i] -= nz * halfPush;
          this._colX[j] += nx * halfPush;
          this._colZ[j] += nz * halfPush;
        }
      }
    }
  }

  private updateProjectedTags(): void {
    const def = getVignetteById(this.vignetteId);
    const res = def.evaluate(this.variantId, this.timeSec);
    const frameById = new Map(res.actors.map((a) => [a.castId, a]));

    const fpvActor = this.getFpvSubjectActor();
    const tags: BenchProjectedActorTag[] = [];
    for (const staged of this.stagedActors) {
      const frame = frameById.get(staged.spec.id);
      if (frame?.hidden) continue;
      if (this.cameraPreset === 'first_person' && staged === fpvActor) continue;
      const yLift = frame?.yOffset ?? 0;
      this._projVec.set(staged.x, 1.88 * staged.rig.heightScale + yLift, staged.z);
      this._projVec.project(this.camera);
      const visible = this._projVec.z > -1 && this._projVec.z < 1;
      const classWeapon = resolveClassWeapon(staged.spec.npcClass);
      tags.push({
        id: staged.spec.id,
        label: staged.spec.label,
        role: staged.spec.role,
        archetypeLabel: ARCHETYPE_PROFILES[staged.spec.archetype].label,
        weaponLabel: getWeaponDisplayLabel(classWeapon.weaponKind),
        gripLabel: getGripDisplayLabel(staged.spec.archetype, classWeapon.weaponKind),
        gunState: frame?.gunState ?? 'unarmed',
        interaction: frame?.interaction ?? 'none',
        xPct: (this._projVec.x * 0.5 + 0.5) * 100,
        yPct: (-this._projVec.y * 0.5 + 0.5) * 100,
        visible,
      });
    }
    if (res.vehicles && res.vehicles.length > 0) {
      for (const veh of res.vehicles) {
        const isVan = veh.vehicleType === 'van';
        this._projVec.set(veh.x, isVan ? 2.15 : 1.68, veh.z);
        this._projVec.project(this.camera);
        const visible =
          this._projVec.z > -1 &&
          this._projVec.z < 1 &&
          this._projVec.x >= -1.05 &&
          this._projVec.x <= 1.05;
        tags.push({
          id: veh.id,
          label: veh.label,
          role: isVan ? 'Kidnap Van Crew' : 'Drive-By Crew',
          archetypeLabel: veh.stateLabel,
          weaponLabel: isVan ? 'Cargo Bay' : 'Full-Auto Carbine',
          gripLabel: isVan ? 'Side Snatch' : 'Window Spray',
          gunState: veh.weaponOut ? 'fire' : 'unarmed',
          interaction: 'none',
          xPct: (this._projVec.x * 0.5 + 0.5) * 100,
          yPct: (-this._projVec.y * 0.5 + 0.5) * 100,
          visible,
        });
      }
    }
    this.latestActorTags = tags;
  }

  private animate = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastNow) / 1000));
    this.lastNow = now;

    const def = getVignetteById(this.vignetteId);
    const dur = getVignetteDuration(def, this.variantId);
    if (this.playing) {
      this.timeSec += dt * this.speed;
      if (this.timeSec >= dur) {
        this.timeSec = dur;
        this.playing = false;
        this.evaluateAt(this.timeSec, true);
        this.emitSnapshot(true);
      } else {
        this.evaluateAt(this.timeSec, true);
      }
    } else {
      this.evaluateAt(this.timeSec, false);
    }

    // Smooth day/night lighting transition
    const targetDay = this.timeOfDay === 'day' ? 1 : 0;
    this.dayBlend += (targetDay - this.dayBlend) * (1 - Math.exp(-6.0 * dt));
    const b = this.dayBlend;
    const bg = this.skyBgNight.clone().lerp(this.skyBgDay, b);
    this.scene.background = bg;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.fogNight).lerp(this.fogDay, b);
      this.scene.fog.density = THREE.MathUtils.lerp(0.032, 0.018, b);
    }
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.65, 1.35, b);
    this.keyLight.intensity = THREE.MathUtils.lerp(1.15, 2.05, b);
    this.keyLight.color.set('#b4cae6').lerp(new THREE.Color('#fff7eb'), b);
    this.rimLight.intensity = THREE.MathUtils.lerp(0.85, 0.5, b);
    this.lampLight.intensity = THREE.MathUtils.lerp(3.6, 0.2, b);
    this.lampBulbMat.emissiveIntensity = THREE.MathUtils.lerp(2.4, 0.25, b);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(1.06, 1.0, b);

    // Snowfall drift
    for (let i = 0; i < this.snowPositions.length; i += 3) {
      this.snowPositions[i] += Math.sin(now * 0.001 + i) * 0.22 * dt;
      this.snowPositions[i + 1] -= 0.85 * dt;
      if (this.snowPositions[i + 1] < 0) {
        this.snowPositions[i + 1] = 8.0;
      }
    }
    this.snowPoints.geometry.attributes.position.needsUpdate = true;

    // Spray mist update
    for (const sp of this.sprayParticles) {
      if (sp.life <= 0) continue;
      sp.life -= dt;
      if (sp.life <= 0) {
        sp.sprite.visible = false;
      } else {
        const p = 1 - sp.life / sp.maxLife;
        sp.sprite.position.addScaledVector(sp.vel, dt);
        sp.vel.multiplyScalar(Math.max(0, 1 - 2.6 * dt));
        const sc = 0.15 + p * 0.65;
        sp.sprite.scale.set(sc, sc, 1);
        (sp.sprite.material as THREE.SpriteMaterial).opacity = Math.sin((1 - p) * Math.PI * 0.5) * 0.72;
      }
    }

    // Dark maroon blood burst particles update
    for (const bp of this.bloodParticles) {
      if (bp.life <= 0) continue;
      bp.life -= dt;
      if (bp.life <= 0) {
        bp.sprite.visible = false;
      } else {
        const p = 1 - bp.life / bp.maxLife;
        bp.vel.y -= 9.8 * dt;
        bp.sprite.position.addScaledVector(bp.vel, dt);
        if (bp.sprite.position.y < 0.025) {
          bp.sprite.position.y = 0.025;
          bp.vel.x *= 0.4;
          bp.vel.z *= 0.4;
          bp.vel.y = 0;
        }
        (bp.sprite.material as THREE.SpriteMaterial).opacity = (1 - p * p) * 0.92;
      }
    }

    this.fxPool.update(dt);

    // Restore head visibility across cast before checking 1st-person POV
    const fpvActor = this.cameraPreset === 'first_person' ? this.getFpvSubjectActor() : undefined;
    for (const actor of this.stagedActors) {
      const isFpvSubject = actor === fpvActor && actor.rig.root.visible;
      actor.rig.head.visible = !isFpvSubject;
      if (isFpvSubject) actor.ringMesh.visible = false;
    }

    const desiredNear = fpvActor ? 0.05 : 0.1;
    if (Math.abs(this.camera.near - desiredNear) > 0.005) {
      this.camera.near = desiredNear;
      this.camera.updateProjectionMatrix();
    }

    if (fpvActor) {
      if (fpvActor.rig.root.visible) {
        fpvActor.rig.root.updateMatrixWorld(true);
        this._fpvEyeWorld.copy(this._fpvEyeLocal).applyMatrix4(fpvActor.rig.head.matrixWorld);
        this._fpvLookWorld.copy(this._fpvLookLocal).applyMatrix4(fpvActor.rig.head.matrixWorld);
      } else if (this.vanRoot.visible) {
        // Victim already sealed inside van bay: keep camera inside the moving van bay looking toward closed door
        this._fpvEyeWorld.set(this.vanRoot.position.x - 0.15, 0.92, this.vanRoot.position.z + 0.12);
        this._fpvLookWorld.set(this.vanRoot.position.x - 0.35, 0.96, this.vanRoot.position.z - 0.85);
      }
      this.camera.position.copy(this._fpvEyeWorld);
      this.camera.lookAt(this._fpvLookWorld);
    } else {
      // Smooth camera orbit damping
      const k = 1 - Math.exp(-10 * dt);
      this.orbitYaw += (this.targetOrbitYaw - this.orbitYaw) * k;
      this.orbitPitch += (this.targetOrbitPitch - this.orbitPitch) * k;
      this.orbitDist += (this.targetOrbitDist - this.orbitDist) * k;

      const cx = this.camFocus.x + Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;
      const cy = this.camFocus.y + Math.sin(this.orbitPitch) * this.orbitDist;
      const cz = this.camFocus.z + Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.orbitDist;
      this.camera.position.set(cx, Math.max(0.45, cy), cz);
      this.camera.lookAt(this.camFocus);
    }

    this.updateProjectedTags();
    this.renderer.render(this.scene, this.camera);

    if (now - this.lastUiEmitAt >= 48) {
      this.lastUiEmitAt = now;
      this.emitSnapshot(false);
    }
  };

  private getFpvSubjectActor(): StagedActor | undefined {
    return (
      this.actorMap.get('player') ??
      this.actorMap.get('victim') ??
      this.actorMap.get('mark') ??
      this.actorMap.get('sleuth') ??
      this.actorMap.get('robber_lead') ??
      this.stagedActors[0]
    );
  }

  private emitSnapshot(force: boolean): void {
    const def = getVignetteById(this.vignetteId);
    if (force) {
      this.updateProjectedTags();
    }
    this.onSnapshot({
      vignetteId: this.vignetteId,
      variantId: this.variantId,
      timeSec: this.timeSec,
      durationSec: getVignetteDuration(def, this.variantId),
      playing: this.playing,
      speed: this.speed,
      timeOfDay: this.timeOfDay,
      cameraPreset: this.cameraPreset,
      beat: this.latestBeat,
      actors: this.latestActorTags,
      contextLost: this.contextLost,
    });
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.dragLastX = e.clientX;
    this.dragLastY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.dragLastX;
    const dy = e.clientY - this.dragLastY;
    this.dragLastX = e.clientX;
    this.dragLastY = e.clientY;
    this.targetOrbitYaw -= dx * 0.008;
    this.targetOrbitPitch = THREE.MathUtils.clamp(this.targetOrbitPitch + dy * 0.006, 0.04, 1.05);
  };

  private onPointerUp = () => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.targetOrbitDist = THREE.MathUtils.clamp(this.targetOrbitDist + e.deltaY * 0.005, 2.2, 14.0);
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    this.emitSnapshot(true);
  };

  private onContextRestored = () => {
    this.contextLost = false;
    this.emitSnapshot(true);
  };

  private handleResize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    dom.removeEventListener('webglcontextrestored', this.onContextRestored);

    for (const actor of this.stagedActors) {
      this.stageRoot.remove(actor.rig.root);
      this.stageRoot.remove(actor.ringMesh);
      actor.ringMesh.geometry.dispose();
      (actor.ringMesh.material as THREE.Material).dispose();
    }
    this.stagedActors = [];
    this.actorMap.clear();

    for (const d of this.disposables) {
      d.dispose();
    }
    this.textures.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
