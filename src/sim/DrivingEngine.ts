import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createTextureLibrary, TextureLibrary } from './textures';
import {
  CollisionWorld,
  findNearbyFrontCarCallRoute,
  findNearestRoadPoint,
  findRoadCallRoute,
  getDistrictAt,
  getRoadElevationAt,
  getRoadNameAt,
  getSurfaceAt,
  getTerrainHeight,
  LANDMARKS,
  SurfaceType,
  Vec2,
  w2m,
} from './mapData';
import {
  FPS_EYE_HEIGHT_M,
  FpsBridge,
  FpsBridgeHooks,
  FpsRayTarget,
} from './fpsBridge';
import { buildCityWorld, CityHandles } from './cityBuilder';
import { buildMetroSystem, MetroSystemHandles } from './metroSystem';
import { buildTrafficSystem, TrafficSystemHandles } from './trafficSystem';
import { createHeroCar, HeadlightMode, HeroCarRig } from './carModel';
import { IcyVehiclePhysics, VehicleInput } from './physics';
import { createEnvironmentSystem, EnvironmentHandles } from './environment';
import { createTireTrailSystem, TireTrailHandles } from './tireTrails';
import { buildPedestrianSystem, PedestrianSystemHandles } from './pedestrianSystem';
import { buildInfrastructureSystem, InfrastructureHandles } from './infrastructureSystem';
import { DrivingAudioEngine } from './audio';
import {
  ArchipelagoCallbacks,
  InteriorRegistry,
  WorldInteractable,
} from './interiors/interiorRegistry';

export type CameraPreset = 'chase' | 'close' | 'hood';

export interface TelemetrySnapshot {
  speedKmh: number;
  gear: string;
  rpm: number;
  health: number;
  surface: SurfaceType;
  district: string;
  roadLabel: string;
  metroHint: string;
  interactPrompt: string;
  actionToast: string;
  gridPowerOnline: boolean;
  timeOfDay: number; // 0..24
  headlights: HeadlightMode;
  cameraPreset: CameraPreset;
  mapX: number; // blueprint coords [-1000..1000]
  mapZ: number;
  headingRad: number;
  carMapX: number;
  carMapZ: number;
  carHeadingRad: number;
  slipRatio: number;
  gamepadConnected: boolean;
  hasDriven: boolean;
  trainMode: boolean;
  trainSpeedKmh: number;
  trainDoorsOpen: boolean;
  trainNextStation: string;
  trainCurrentStation: string;
  trainDistToNextM: number;
  trainSeated: boolean;
  trainCarIndex: number;
  trainPassengerCount: number;
  walkMode: boolean;
  walkPrompt: string;
  nearCar: boolean;
  nearOpenTrainDoor: boolean;
  activeTrafficCount: number;
  pedestrianCount: number;
  paused: boolean;
  carCallActive: boolean;
  carCallPointerAngleRad: number;
  carCallDistM: number;
  carCallBlocked: boolean;
  npcSubtitle: string;
}

// Custom Dark Wet-City Midnight PMREM Environment
// Overhead ceiling kept VERY dark (#050912) with ZERO bright top strips so the player car roof NEVER glares blue!
// Subtle low-to-mid horizontal urban color strips provide quiet dark reflections on car sides & wet asphalt puddles.
function buildDarkCityNightEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#04070e');

  const ceiling = new THREE.Mesh(
    new THREE.SphereGeometry(24, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#060a14', side: THREE.BackSide })
  );
  envScene.add(ceiling);

  // Low-to-mid horizontal city horizon reflections ONLY (no blinding overhead strips!)
  const strips: { pos: [number, number, number]; scale: [number, number, number]; color: string }[] = [
    { pos: [14, 2.4, -5], scale: [0.4, 2.2, 6.0], color: '#4c3820' },
    { pos: [-14, 2.6, 4], scale: [0.4, 2.0, 5.8], color: '#1b475c' },
    { pos: [6, 2.2, 14], scale: [5.0, 1.8, 0.4], color: '#4a1f3a' },
    { pos: [-7, 2.0, -13], scale: [4.6, 1.8, 0.4], color: '#423322' },
    { pos: [0, 3.2, -16], scale: [10.0, 1.0, 0.4], color: '#1f334a' },
  ];
  for (const s of strips) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: s.color })
    );
    m.position.set(s.pos[0], s.pos[1], s.pos[2]);
    m.scale.set(s.scale[0], s.scale[1], s.scale[2]);
    envScene.add(m);
  }

  const tex = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return tex;
}

// Restrained Photorealistic Dark Rain Film Grade + Subtle Occasional Camera Lens Water Droplets/Splashes!
// Zero blinding blue wash, subtle crisp motion hint, and delicate occasional water droplets near screen edges.
const PhotorealRainGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uBlurDir: { value: new THREE.Vector2(0, 0) },
    uBlurStrength: { value: 0.0 },
    uNightFactor: { value: 1.0 },
    uTime: { value: 0.0 },
    uAspect: { value: 1.77 },
    uLensSplashEnable: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uBlurDir;
    uniform float uBlurStrength;
    uniform float uNightFactor;
    uniform float uTime;
    uniform float uAspect;
    uniform float uLensSplashEnable;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Realistic convex dripping raindrop + stick-slip gravity rivulet trail (ZERO hollow O rings!)
    vec3 evalDrippingDrop(vec2 uv, float slotSeed, float period, float time, float aspect) {
      float cycle = floor(time / period + slotSeed);
      float localT = fract(time / period + slotSeed);
      // Active for ~66% of each cycle so droplets gather, surge downward, and slip off naturally
      if (localT > 0.66) return vec3(0.0);
      float life = localT / 0.66;
      float fadeIn = smoothstep(0.0, 0.08, life);
      float fadeOut = 1.0 - smoothstep(0.84, 1.0, life);
      float env = fadeIn * fadeOut;

      float rx = rand(vec2(cycle, slotSeed * 17.3));
      float ry = rand(vec2(cycle + 5.7, slotSeed * 31.1));
      // Keep drops mostly in outer edges & upper margins so center driving focus stays crisp
      float baseX = rx < 0.5 ? (0.04 + rx * 0.56) : (0.68 + (rx - 0.5) * 0.56);
      float startY = 0.72 + ry * 0.25;

      // Stick-slip gravity descent: clings briefly, then accelerates in organic surges!
      float slip = life + sin(life * 15.0 + slotSeed * 9.0) * 0.022;
      float dropTravel = pow(max(0.0, slip), 1.48) * (0.48 + rand(vec2(cycle + 2.3, slotSeed)) * 0.34);
      float headY = startY - dropTravel;

      // Subtle organic sideways meander as water navigates glass surface tension
      float wiggle = sin(headY * 26.0 + cycle * 4.1) * 0.005 + sin(headY * 61.0 + slotSeed * 12.0) * 0.0022;
      float headX = baseX + wiggle;

      // 1. Plump convex refractive teardrop head (wider rounded bottom, tapered upper neck!)
      vec2 dHead = uv - vec2(headX, headY);
      dHead.x *= aspect;
      float rHead = 0.0085 + rand(vec2(cycle + 9.2, slotSeed)) * 0.0065;
      // Pinch width slightly above center so it reads as a real sagging gravity teardrop
      float pinch = 1.0 + clamp(dHead.y / max(rHead * 2.2, 0.001), -0.22, 0.65) * 0.55;
      vec2 shaped = vec2(dHead.x * pinch, dHead.y * 0.76);
      float distH = length(shaped);

      vec2 refr = vec2(0.0);
      float spec = 0.0;

      if (distH < rHead) {
        float dome = sqrt(max(0.0, 1.0 - (distH / rHead) * (distH / rHead)));
        // Strong convex-lens refraction (bends streetlights/city glow realistically inside the bead!)
        refr += (shaped / max(rHead, 0.001)) * dome * 0.024 * env;
        // Tiny realistic lower-right/upper-left specular crescent glint (NEVER a full white ring!)
        vec2 n2 = shaped / max(rHead, 0.001);
        float topGlint = pow(max(0.0, dot(normalize(vec3(n2, dome)), normalize(vec3(-0.35, 0.65, 0.65)))), 14.0);
        float bottomCaustic = smoothstep(0.25, 0.92, -n2.y) * smoothstep(0.98, 0.45, distH / rHead) * 0.22;
        spec += (topGlint * 0.42 + bottomCaustic) * env;
      }

      // 2. Wet gravity rivulet streak + tiny residual micro-beads trailing ABOVE the sliding drop!
      if (uv.y > headY && uv.y < startY && dropTravel > 0.015) {
        float trailFrac = (uv.y - headY) / max(dropTravel, 0.001); // 0 near head, 1 near origin
        float trailWiggle = sin(uv.y * 26.0 + cycle * 4.1) * 0.005 + sin(uv.y * 61.0 + slotSeed * 12.0) * 0.0022;
        float trailX = baseX + trailWiggle;
        float dxTrail = (uv.x - trailX) * aspect;
        float trailRadius = rHead * mix(0.46, 0.14, trailFrac);

        // Continuous thin wet film trail
        if (abs(dxTrail) < trailRadius) {
          float tMask = (1.0 - abs(dxTrail) / max(trailRadius, 0.0005));
          float trailFade = (1.0 - smoothstep(0.15, 1.0, trailFrac)) * env;
          refr += vec2(dxTrail / max(trailRadius, 0.001), -0.2) * tMask * 0.0065 * trailFade;
          spec += pow(tMask, 3.0) * 0.055 * trailFade;
        }

        // 3. Occasional stuck micro-beads left behind along the wet trail!
        float beadGrid = floor(uv.y * 46.0);
        float beadSeed = rand(vec2(beadGrid, cycle + slotSeed * 19.0));
        if (beadSeed > 0.64) {
          float beadY = (beadGrid + 0.5) / 46.0;
          vec2 dBead = uv - vec2(trailX, beadY);
          dBead.x *= aspect;
          float rBead = rHead * (0.28 + (beadSeed - 0.64) * 0.45);
          float distB = length(dBead);
          if (distB < rBead) {
            float bDome = sqrt(max(0.0, 1.0 - (distB / rBead) * (distB / rBead)));
            float bFade = (1.0 - smoothstep(0.3, 1.0, trailFrac)) * env;
            refr += (dBead / max(rBead, 0.001)) * bDome * 0.012 * bFade;
            spec += pow(bDome, 4.0) * 0.11 * bFade;
          }
        }
      }

      return vec3(refr, spec);
    }

    void main() {
      vec2 uv = vUv;
      float dropSpec = 0.0;

      if (uLensSplashEnable > 0.5) {
        vec3 d0 = evalDrippingDrop(uv, 0.07, 4.8, uTime, uAspect);
        vec3 d1 = evalDrippingDrop(uv, 0.23, 5.9, uTime, uAspect);
        vec3 d2 = evalDrippingDrop(uv, 0.41, 6.7, uTime, uAspect);
        vec3 d3 = evalDrippingDrop(uv, 0.59, 7.4, uTime, uAspect);
        vec3 d4 = evalDrippingDrop(uv, 0.77, 8.3, uTime, uAspect);
        vec3 d5 = evalDrippingDrop(uv, 0.91, 9.2, uTime, uAspect);
        vec2 totalRefr = d0.xy + d1.xy + d2.xy + d3.xy + d4.xy + d5.xy;
        uv = clamp(uv - totalRefr, 0.001, 0.999);
        dropSpec = min(0.55, d0.z + d1.z + d2.z + d3.z + d4.z + d5.z);
      }

      // Silky 9-tap slight Gaussian directional blur when panning/turning camera (active in BOTH car & first-person train!)
      vec2 stepUv = uBlurDir * uBlurStrength;
      vec3 col = texture2D(tDiffuse, uv).rgb;
      if (uBlurStrength > 0.00012) {
        col = col * 0.24
          + (texture2D(tDiffuse, clamp(uv + stepUv, 0.001, 0.999)).rgb
           + texture2D(tDiffuse, clamp(uv - stepUv, 0.001, 0.999)).rgb) * 0.17
          + (texture2D(tDiffuse, clamp(uv + stepUv * 2.0, 0.001, 0.999)).rgb
           + texture2D(tDiffuse, clamp(uv - stepUv * 2.0, 0.001, 0.999)).rgb) * 0.11
          + (texture2D(tDiffuse, clamp(uv + stepUv * 3.0, 0.001, 0.999)).rgb
           + texture2D(tDiffuse, clamp(uv - stepUv * 3.0, 0.001, 0.999)).rgb) * 0.06
          + (texture2D(tDiffuse, clamp(uv + stepUv * 4.0, 0.001, 0.999)).rgb
           + texture2D(tDiffuse, clamp(uv - stepUv * 4.0, 0.001, 0.999)).rgb) * 0.04;
      }

      // Delicate optical highlight on dripping raindrop dome (tinted slightly by refracted scene light!)
      col += mix(vec3(0.52, 0.64, 0.78), col * 1.45 + vec3(0.18), 0.5) * dropSpec;

      // Rich dark wet-city cinematic contrast (deep velvety shadows, natural crisp highlights)
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTone = vec3(0.96, 0.98, 1.01);
      vec3 highlightTone = vec3(1.01, 1.00, 0.98);
      vec3 graded = col * mix(shadowTone, highlightTone, smoothstep(0.18, 0.78, luma));

      graded = pow(max(graded, vec3(0.0)), vec3(1.04));

      // Ultra-subtle lens vignette
      vec2 centered = vUv - 0.5;
      float vig = 1.0 - dot(centered, centered) * 0.36;
      graded *= clamp(vig, 0.74, 1.0);

      // Fine organic 35mm night grain
      float grain = (rand(vUv * 512.0 + fract(uTime)) - 0.5) * 0.011;
      graded += vec3(grain);

      gl_FragColor = vec4(max(graded, vec3(0.0)), 1.0);
    }
  `,
};

function detectSoftwareWebGL(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export class DrivingEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private motionPass: ShaderPass | null = null;
  private isSoftwareGl: boolean;

  private textures: TextureLibrary;
  private collisionWorld: CollisionWorld;
  private interiorRegistry: InteriorRegistry;
  private nearestInteractable: WorldInteractable | null = null;
  private actionToast = '';
  private actionToastTimer = 0;
  private gridPowerOnline = true;
  private city: CityHandles;
  private infrastructure: InfrastructureHandles;
  private metro: MetroSystemHandles;
  private traffic: TrafficSystemHandles;
  private car: HeroCarRig;
  private physics: IcyVehiclePhysics;
  private env: EnvironmentHandles;
  private tireTrails: TireTrailHandles;
  private pedestrians: PedestrianSystemHandles;
  private audio: DrivingAudioEngine;

  // Faint live running city reflection CubeCamera on hero car (throttled for 60fps!)
  private carEnvRT: THREE.WebGLCubeRenderTarget | null = null;
  private carCubeCam: THREE.CubeCamera | null = null;
  private envFrameCounter = 0;

  // User-controlled state: Single Unified Rainy Midnight!
  private timeOfDay = 0.5; // 00:30 Deep Rainy Midnight
  private autoCycleTime = false;
  private headlights: HeadlightMode = 'low';
  private cameraPreset: CameraPreset = 'chase';
  private audioMuted = false;
  private trainMode = false;
  private trainSitToggleQueued = false;

  // Seamless First-Person On-Foot Exploration State (Metro Stations + Open City World!)
  private walkMode = false;
  private walkPos = new THREE.Vector3();
  private walkVy = 0;
  private walkYaw = 0;
  private walkBobPhase = 0;
  private walkSpeedKmh = 0;
  private walkOnStationShelter = false;
  private walkStationName = '';
  private walkNearOpenTrainDoor = false;
  private walkNearCar = false;
  private walkJumpQueued = false;
  private walkReboardCooldown = 0;

  // Pause & CRT Menu state (boot paused on START screen)
  private paused = true;
  private renderPausedFrameOnce = true;

  // Spec 3: External FPS engine bridge contract (mode mirroring + hooks)
  private fpsBridge: FpsBridge = { hooks: null, mode: 'driving' };

  // Spec 6: Autonomous Road-Following Car Call state
  private carCallActive = false;
  private carCallPointerVisible = false;
  private carCallBlocked = false;
  private carCallPoints: Vec2[] = [];
  private carCallIdx = 0;
  private carCallStuckTimer = 0;

  // Input state (Keyboard + Xbox Controller + Mouse Orbit)
  private keys = new Set<string>();
  private gamepadConnected = false;
  private prevGamepadButtons: boolean[] = [];
  private hasDriven = false;

  // Free X/Y Camera Orbit & First-Person Metro Look State
  private camOrbitYaw = 0;
  private camOrbitPitch = 0.22;
  private camYawVel = 0;
  private camPitchVel = 0;
  private isPointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Smooth third-person chase camera state & angular velocity tracker
  private camPos = new THREE.Vector3();
  private camLookAt = new THREE.Vector3();
  private prevCamForward = new THREE.Vector3(0, 0, -1);
  private blurVecSmooth = new THREE.Vector2(0, 0);
  private blurStrengthSmooth = 0;

  // Dynamic lifelike driving camera motion state (G-force inertia, horizon bank, suspension spring & impact shake)
  private camPrevForwardSpeed = 0;
  private camPrevVy = 0;
  private camAccelSmooth = 0;
  private camLatGSmooth = 0;
  private camRollSmooth = 0;
  private camShakeEnergy = 0;
  private camSpringY = 0;
  private camSpringYVel = 0;

  // Loop & lifecycle handles
  private frameId = 0;
  private disposed = false;
  private lastTimestamp = 0;
  private elapsed = 0;
  private lastTelemetryEmit = 0;
  private onTelemetry: (t: TelemetrySnapshot) => void;
  private onToggleMap?: () => void;
  private onMapZoomDelta?: (delta: number) => void;
  private onMapLegendNav?: (delta: number) => void;
  private isMapExpandedCheck?: () => boolean;

  // Zero-GC reusable math objects
  private readonly _focusVec = new THREE.Vector3();
  private readonly _desiredCamPos = new THREE.Vector3();
  private readonly _desiredLook = new THREE.Vector3();
  private readonly _curCamFwd = new THREE.Vector3();
  private readonly _camRight = new THREE.Vector3();
  private readonly _camUp = new THREE.Vector3();
  private readonly _deltaFwd = new THREE.Vector3();

  constructor(
    container: HTMLElement,
    onTelemetry: (t: TelemetrySnapshot) => void,
    onToggleMap?: () => void
  ) {
    this.container = container;
    this.onTelemetry = onTelemetry;
    this.onToggleMap = onToggleMap;

    this.isSoftwareGl = detectSoftwareWebGL();

    // 1. Renderer setup (ACES Filmic Tone Mapping + Controlled Dark Exposure!)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 2. Scene + Custom Dark Wet-City Midnight PMREM Environment (ZERO bright top glare!)
    this.scene = new THREE.Scene();
    this.scene.environment = buildDarkCityNightEnv(this.renderer);
    this.scene.environmentIntensity = 0.72;

    // 3. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      58,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.15,
      1900
    );

    // 4. Ultra-Restrained Post-Processing (High threshold 1.45 prevents ANY blinding reflection fireball!)
    if (!this.isSoftwareGl) {
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));

      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.12, // whisper-soft crisp neon & taillight glow ONLY
        0.32,
        1.45  // high threshold guarantees car roof & wet asphalt NEVER bloom into blinding orbs!
      );
      composer.addPass(bloomPass);

      const motionPass = new ShaderPass(PhotorealRainGradeShader);
      motionPass.uniforms.uAspect.value =
        Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
      composer.addPass(motionPass);
      composer.addPass(new OutputPass());

      this.composer = composer;
      this.motionPass = motionPass;
    }

    // 5. Build Procedural PBR Textures, InteriorRegistry, City (+5-Region Archipelago), Infrastructure, Metro (8 Complex Stations), Traffic, Trails, Pedestrians & Hero Car
    this.textures = createTextureLibrary(this.renderer);
    this.collisionWorld = new CollisionWorld();
    this.interiorRegistry = new InteriorRegistry();

    const archipelagoCallbacks: ArchipelagoCallbacks = {
      toggleGridPower: () => {
        this.gridPowerOnline = !this.gridPowerOnline;
        this.city?.setPowerGridEnabled(this.gridPowerOnline);
        this.infrastructure?.setPowerGridEnabled(this.gridPowerOnline);
        return this.gridPowerOnline;
      },
      isGridPowerOnline: () => this.gridPowerOnline,
      teleportPlayer: (x: number, y: number, z: number, yaw?: number) => {
        this.trainMode = false;
        this.metro?.setRiderMode(false, x, z);
        this.walkMode = true;
        this.walkPos.set(x, y, z);
        this.walkVy = 0;
        if (typeof yaw === 'number') this.walkYaw = yaw;
        this.camOrbitYaw = 0;
        this.camOrbitPitch = 0;
        this.fpsBridge.mode = 'onFoot';
        this.fpsBridge.hooks?.onEnterOnFoot(this.walkPos, this.walkYaw);
      },
      drinkCoffee: (stationName: string) => {
        if (this.physics) {
          this.physics.state.health = Math.min(100, this.physics.state.health + 25);
        }
        return `Hot Espresso served at ${stationName} КАФЕ — Warmth & vigor restored!`;
      },
    };

    this.city = buildCityWorld(
      this.textures,
      this.collisionWorld,
      this.interiorRegistry,
      archipelagoCallbacks
    );
    this.scene.add(this.city.root);

    this.infrastructure = buildInfrastructureSystem(this.collisionWorld);
    this.scene.add(this.infrastructure.root);

    this.metro = buildMetroSystem(
      this.textures,
      this.collisionWorld,
      this.interiorRegistry,
      archipelagoCallbacks
    );
    this.scene.add(this.metro.root);

    this.traffic = buildTrafficSystem(this.textures, this.collisionWorld);
    this.scene.add(this.traffic.root);

    this.tireTrails = createTireTrailSystem();
    this.scene.add(this.tireTrails.root);

    this.pedestrians = buildPedestrianSystem(
      this.textures,
      this.metro.getStationInfos(),
      this.collisionWorld
    );
    this.scene.add(this.pedestrians.root);

    this.car = createHeroCar(this.textures, this.isSoftwareGl);
    this.scene.add(this.car.root);

    // Faint live running city reflection CubeCamera on hero car paint & glass (hardware WebGL only)
    if (!this.isSoftwareGl) {
      this.carEnvRT = new THREE.WebGLCubeRenderTarget(128, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
      this.carCubeCam = new THREE.CubeCamera(0.9, 190, this.carEnvRT);
      this.scene.add(this.carCubeCam);
      this.car.setDynamicEnvMap(this.carEnvRT.texture);
    }

    // Start player on the wide smooth black two-lane avenue by Central Reliquary Roundabout
    const startLm = LANDMARKS[0];
    this.physics = new IcyVehiclePhysics(startLm.x, startLm.z, Math.PI * 0.42);
    this.car.root.position.set(startLm.x, 0.088, startLm.z);
    this.car.root.rotation.y = this.physics.state.heading;

    this.env = createEnvironmentSystem(this.scene, this.textures, this.isSoftwareGl);
    this.audio = new DrivingAudioEngine();

    this.snapCameraBehindCar();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.lastTimestamp = performance.now();
    this.tick();
  }

  private snapCameraBehindCar() {
    const s = this.physics.state;
    const dist = 7.4;
    const totalYaw = s.heading + this.camOrbitYaw;
    this.camPos.set(
      s.x + Math.sin(totalYaw) * dist,
      s.y + 2.6,
      s.z + Math.cos(totalYaw) * dist
    );
    this.camLookAt.set(s.x, s.y + 1.12, s.z);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLookAt);
    this.camera.getWorldDirection(this.prevCamForward);
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private handleResize = () => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    if (this.motionPass) {
      this.motionPass.uniforms.uAspect.value = w / h;
    }
  };

  private handleGamepadConnected = () => {
    this.gamepadConnected = true;
    this.audio.start();
  };

  private handleGamepadDisconnected = () => {
    this.gamepadConnected = false;
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.audio.start();
    if (e.button === 0 || e.button === 2) {
      this.isPointerDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isPointerDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.camOrbitYaw -= dx * 0.0085;
    const minP = this.walkMode ? -0.68 : this.trainMode ? -0.42 : -0.06;
    const maxP = this.walkMode ? 0.68 : this.trainMode ? 0.52 : 1.18;
    this.camOrbitPitch = THREE.MathUtils.clamp(
      this.camOrbitPitch + dy * 0.0065,
      minP,
      maxP
    );
  };

  private handlePointerUp = () => {
    this.isPointerDragging = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.paused) return;
    this.audio.start();
    const code = e.code;
    this.keys.add(code);

    if (
      code === 'KeyW' ||
      code === 'KeyA' ||
      code === 'KeyS' ||
      code === 'KeyD' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      this.hasDriven = true;
    }

    if (code === 'KeyL') this.cycleHeadlights();
    else if (code === 'KeyC') this.cycleCameraPreset();
    else if (code === 'KeyR') this.resetToNearestRoad();
    else if (code === 'KeyV') this.recenterCamera();
    else if (code === 'KeyT') this.toggleTrainMode();
    else if (code === 'KeyG') {
      if (this.walkMode) {
        if (this.walkNearCar) this.enterCar();
        else this.setActionToast('Walk to your car, or press E outdoors near a road to call it');
      } else if (this.trainMode) {
        this.setActionToast('Exit the train at a station stop before returning to your car');
      }
    } else if (code === 'KeyF') {
      if (this.walkMode) {
        if (this.walkNearCar) this.enterCar();
        else if (this.walkNearOpenTrainDoor) this.toggleTrainMode();
        else this.setActionToast('Walk back to your car, or press E near a road to call it');
      } else {
        this.stepOutOnFoot();
      }
    } else if (code === 'KeyE') {
      if (this.trainMode) {
        this.trainSitToggleQueued = true;
      } else if (this.walkMode) {
        if (this.nearestInteractable) {
          const msg = this.nearestInteractable.onInteract();
          if (msg) {
            this.setActionToast(msg, 5.5);
          }
        } else if (this.walkNearCar) {
          this.enterCar();
        } else if (this.walkNearOpenTrainDoor) {
          this.toggleTrainMode();
        } else {
          this.callCar();
        }
      }
    } else if (code === 'Space' && this.walkMode) {
      this.walkJumpQueued = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  // =========================================================================
  // PUBLIC CONTROLS API FOR MINIMAL REACT HUD
  // =========================================================================
  public setTimeOfDay(hours: number) {
    this.timeOfDay = ((hours % 24) + 24) % 24;
  }

  public setAutoCycleTime(enabled: boolean) {
    this.autoCycleTime = enabled;
  }

  public setHeadlights(mode: HeadlightMode) {
    this.headlights = mode;
    this.car.setHeadlightMode(mode);
  }

  public cycleHeadlights() {
    const order: HeadlightMode[] = ['off', 'low', 'high'];
    const next = order[(order.indexOf(this.headlights) + 1) % order.length];
    this.setHeadlights(next);
  }

  public setCameraPreset(preset: CameraPreset) {
    this.cameraPreset = preset;
  }

  public cycleCameraPreset() {
    const order: CameraPreset[] = ['chase', 'close', 'hood'];
    this.cameraPreset = order[(order.indexOf(this.cameraPreset) + 1) % order.length];
  }

  public recenterCamera() {
    this.camOrbitYaw = 0;
    this.camOrbitPitch = this.trainMode || this.walkMode ? 0.0 : 0.22;
  }

  public setMuted(muted: boolean) {
    this.audioMuted = muted;
    this.audio.setMuted(muted);
  }

  public setMapCallbacks(cbs: {
    onZoomDelta?: (delta: number) => void;
    onLegendNav?: (delta: number) => void;
    isExpanded?: () => boolean;
  }) {
    this.onMapZoomDelta = cbs.onZoomDelta;
    this.onMapLegendNav = cbs.onLegendNav;
    this.isMapExpandedCheck = cbs.isExpanded;
  }

  private setActionToast(msg: string, duration = 4.2) {
    this.actionToast = msg;
    this.actionToastTimer = duration;
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    this.keys.clear();
    this.isPointerDragging = false;
    this.audio.setPaused(paused);
    this.lastTimestamp = performance.now();
    if (paused) {
      this.renderPausedFrameOnce = true;
    } else {
      this.audio.start();
    }
    this.emitTelemetrySnapshot();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public setFpsBridgeHooks(hooks: FpsBridgeHooks | null) {
    this.fpsBridge.hooks = hooks;
    if (hooks) {
      if (this.trainMode) {
        this.fpsBridge.mode = 'train';
        hooks.onEnterTrain(this.metro.getTrainFrame());
      } else if (this.walkMode) {
        this.fpsBridge.mode = 'onFoot';
        hooks.onEnterOnFoot(this.walkPos, this.walkYaw);
      } else {
        this.fpsBridge.mode = 'driving';
        hooks.onEnterVehicle();
      }
    }
  }

  public getFpsBridge(): FpsBridge {
    return this.fpsBridge;
  }

  public getFpsRayTargets(origin: THREE.Vector3, radiusM: number): FpsRayTarget[] {
    const out: FpsRayTarget[] = [];
    const r2 = radiusM * radiusM;

    const boxes = this.collisionWorld.boxes;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const dx = b.cx - origin.x;
      const dz = b.cz - origin.z;
      const maxD = radiusM + b.radius;
      if (dx * dx + dz * dz > maxD * maxD) continue;
      out.push({
        id: `world_box_${i}`,
        bounds: new THREE.Box3(
          new THREE.Vector3(b.cx - b.radius, -24, b.cz - b.radius),
          new THREE.Vector3(b.cx + b.radius, 48, b.cz + b.radius)
        ),
        kind: 'world',
      });
    }

    const circles = this.collisionWorld.circles;
    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      const dx = c.cx - origin.x;
      const dz = c.cz - origin.z;
      const maxD = radiusM + c.r;
      if (dx * dx + dz * dz > maxD * maxD) continue;
      if (dx * dx + dz * dz > r2 + c.r * c.r) continue;
      out.push({
        id: `world_circle_${i}`,
        bounds: new THREE.Box3(
          new THREE.Vector3(c.cx - c.r, -24, c.cz - c.r),
          new THREE.Vector3(c.cx + c.r, 48, c.cz + c.r)
        ),
        kind: 'world',
      });
    }

    const pedTargets = this.pedestrians.getRayTargets(origin, radiusM);
    for (let i = 0; i < pedTargets.length; i++) out.push(pedTargets[i]);

    const metroTargets = this.metro.getRayTargets(origin, radiusM);
    for (let i = 0; i < metroTargets.length; i++) out.push(metroTargets[i]);

    return out;
  }

  public stepOutOnFoot(): boolean {
    if (this.trainMode) {
      const trState = this.metro.getOperatedTrainState();
      if (!trState.doorsOpen) {
        this.setActionToast('Wait for a station stop with open doors to step out');
        return false;
      }
      const exitPt = this.metro.getPlatformExitPoint();
      this.trainMode = false;
      this.metro.setRiderMode(false, exitPt.pos.x, exitPt.pos.z);
      this.walkMode = true;
      this.walkPos.copy(exitPt.pos);
      this.walkVy = 0;
      this.walkYaw = exitPt.yaw;
      this.walkStationName = exitPt.stationName;
      this.walkOnStationShelter = true;
      this.walkReboardCooldown = 1.5;
      this.camOrbitYaw = 0;
      this.camOrbitPitch = 0;
      this.fpsBridge.mode = 'onFoot';
      this.fpsBridge.hooks?.onEnterOnFoot(this.walkPos, this.walkYaw);
      return true;
    }
    if (!this.walkMode) {
      const s = this.physics.state;
      const rightX = Math.cos(s.heading);
      const rightZ = -Math.sin(s.heading);
      this.walkMode = true;
      this.walkPos.set(s.x - rightX * 2.15, Math.max(0.11, s.y), s.z - rightZ * 2.15);
      this.walkVy = 0;
      this.walkYaw = s.heading + Math.PI;
      this.walkOnStationShelter = false;
      this.walkStationName = '';
      this.walkReboardCooldown = 0.4;
      this.camOrbitYaw = 0;
      this.camOrbitPitch = 0;
      this.fpsBridge.mode = 'onFoot';
      this.fpsBridge.hooks?.onEnterOnFoot(this.walkPos, this.walkYaw);
      return true;
    }
    return false;
  }

  public enterCar() {
    if (this.trainMode) {
      this.trainMode = false;
      const s = this.physics.state;
      this.metro.setRiderMode(false, s.x, s.z);
    }
    this.carCallActive = false;
    this.carCallPointerVisible = false;
    this.carCallBlocked = false;
    this.walkMode = false;
    this.walkOnStationShelter = false;
    this.camOrbitYaw = 0;
    this.camOrbitPitch = 0.22;
    this.fpsBridge.mode = 'driving';
    this.fpsBridge.hooks?.onEnterVehicle();
    this.snapCameraBehindCar();
  }

  public toggleTrainMode(): boolean {
    if (this.trainMode) {
      return this.stepOutOnFoot();
    }
    if (!this.walkMode || !this.walkNearOpenTrainDoor) {
      this.setActionToast('Walk to a station platform while train doors are open to board');
      return false;
    }
    const refX = this.walkPos.x;
    const refZ = this.walkPos.z;
    this.carCallActive = false;
    this.carCallPointerVisible = false;
    this.carCallBlocked = false;
    this.walkMode = false;
    this.walkOnStationShelter = false;
    this.trainMode = true;
    this.metro.setRiderMode(true, refX, refZ);
    this.camOrbitYaw = 0;
    this.camOrbitPitch = 0.0;
    this.trainSitToggleQueued = false;
    this.fpsBridge.mode = 'train';
    this.fpsBridge.hooks?.onEnterTrain(this.metro.getTrainFrame());
    return true;
  }

  public callCar(): boolean {
    if (this.trainMode) {
      this.setActionToast('Cannot call car from inside the train');
      return false;
    }
    if (!this.walkMode) return false;

    const inArkVault =
      this.walkPos.y < -15.0 &&
      Math.abs(this.walkPos.x - 1865) < 13.4 &&
      Math.abs(this.walkPos.z + 475) < 13.4;

    if (this.walkOnStationShelter || inArkVault) {
      this.setActionToast('Step outdoors to call your car');
      return false;
    }

    if (getSurfaceAt(this.walkPos.x, this.walkPos.z) === 'water') {
      this.setActionToast('Move onto dry land near a road to call your car');
      return false;
    }

    const nearestRoad = findNearestRoadPoint(this.walkPos.x, this.walkPos.z);
    if (nearestRoad.dist > 55) {
      this.setActionToast('Too far from any road to call your car');
      return false;
    }

    const lookYaw = this.walkYaw + this.camOrbitYaw;
    const fwdX = Math.sin(lookYaw);
    const fwdZ = Math.cos(lookYaw);
    const frontRoute = findNearbyFrontCarCallRoute(
      this.walkPos.x,
      this.walkPos.z,
      fwdX,
      fwdZ,
      17
    );

    const s = this.physics.state;
    const directDist = Math.hypot(s.x - this.walkPos.x, s.z - this.walkPos.z);
    const existingRoute = findRoadCallRoute(
      s.x,
      s.z,
      frontRoute.stopPoint.x,
      frontRoute.stopPoint.z
    );

    let route = existingRoute;
    const canDriveFromCurrent =
      directDist <= 22 &&
      Math.hypot(s.x - existingRoute.spawnPoint.x, s.z - existingRoute.spawnPoint.z) <= 18;

    if (!canDriveFromCurrent) {
      route = frontRoute;
      this.physics.repair();
      this.physics.teleport(
        route.spawnPoint.x,
        route.spawnPoint.z,
        route.spawnPoint.heading
      );
      const approachSpd = Math.min(11.5, Math.max(5.5, route.totalLengthM * 0.6));
      s.vx = -Math.sin(route.spawnPoint.heading) * approachSpd;
      s.vz = -Math.cos(route.spawnPoint.heading) * approachSpd;
      s.forwardSpeed = approachSpd;
    }

    this.carCallPoints = route.points;
    this.carCallIdx = Math.min(1, Math.max(0, route.points.length - 1));
    this.carCallBlocked = route.blocked;
    this.carCallActive = true;
    this.carCallPointerVisible = true;
    this.carCallStuckTimer = 0;

    if (route.blocked) {
      this.setActionToast('Route partially blocked — car driving to nearest reachable point');
    } else {
      this.setActionToast('Car pulling up');
    }
    return true;
  }

  private stepCarCallAutopilot(dt: number): VehicleInput {
    const s = this.physics.state;
    if (this.carCallPoints.length === 0) {
      this.carCallActive = false;
      return { throttle: 0, brake: 0.6, steer: 0, handbrake: true };
    }

    const stopPt = this.carCallPoints[this.carCallPoints.length - 1];
    const distToStop = Math.hypot(stopPt.x - s.x, stopPt.z - s.z);

    while (
      this.carCallIdx < this.carCallPoints.length - 1 &&
      Math.hypot(
        this.carCallPoints[this.carCallIdx].x - s.x,
        this.carCallPoints[this.carCallIdx].z - s.z
      ) < 7.0
    ) {
      this.carCallIdx++;
    }

    const wp = this.carCallPoints[this.carCallIdx];
    const dx = wp.x - s.x;
    const dz = wp.z - s.z;
    const desiredHeading = Math.atan2(-dx, -dz);
    let err = ((desiredHeading - s.heading + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (err < -Math.PI) err += Math.PI * 2;

    // Slow/brake for ahead traffic agents along path
    const fwdX = -Math.sin(s.heading);
    const fwdZ = -Math.cos(s.heading);
    let obstacleAhead = false;
    const agents = this.traffic.agents;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const adx = a.x - s.x;
      const adz = a.z - s.z;
      const d2 = adx * adx + adz * adz;
      if (d2 > 14 * 14 || d2 < 0.1) continue;
      const d = Math.sqrt(d2);
      const dot = (adx * fwdX + adz * fwdZ) / d;
      if (dot > 0.72) {
        obstacleAhead = true;
        break;
      }
    }

    const curSpeed = Math.hypot(s.vx, s.vz);
    if (distToStop < 3.6 && this.carCallIdx >= this.carCallPoints.length - 1) {
      if (curSpeed < 0.85) {
        this.carCallActive = false;
        this.setActionToast(
          this.carCallBlocked
            ? 'Road blocked ahead — car stopped at nearest reachable point'
            : 'Car pulled up at curb'
        );
      }
      return { throttle: 0, brake: 0.95, steer: 0, handbrake: true };
    }

    if (curSpeed < 0.45 && distToStop > 4.5) {
      this.carCallStuckTimer += dt;
      if (this.carCallStuckTimer > 2.8) {
        this.carCallActive = false;
        this.carCallBlocked = true;
        this.setActionToast('Path blocked ahead — car stopped at nearest reachable point');
        return { throttle: 0, brake: 0.8, steer: 0, handbrake: true };
      }
    } else {
      this.carCallStuckTimer = Math.max(0, this.carCallStuckTimer - dt * 0.5);
    }

    const turnPenalty = Math.abs(err) * 5.2;
    let targetSpd = Math.max(5.5, 16.5 - turnPenalty);
    if (distToStop < 10.5) {
      targetSpd = Math.min(targetSpd, Math.max(2.2, distToStop * 1.1));
    }
    if (obstacleAhead) {
      targetSpd = Math.min(targetSpd, 2.2);
    }

    const steer = THREE.MathUtils.clamp(err * 1.55, -1, 1);
    const spdDiff = targetSpd - s.forwardSpeed;
    let throttle = 0;
    let brake = 0;
    if (spdDiff > 0.35) {
      throttle = THREE.MathUtils.clamp(spdDiff * 0.34, 0.18, 0.92);
    } else if (spdDiff < -0.9) {
      brake = THREE.MathUtils.clamp(-spdDiff * 0.28, 0.15, 0.88);
    }
    return { throttle, brake, steer, handbrake: false };
  }

  public toggleTrainSit() {
    if (this.trainMode) {
      this.trainSitToggleQueued = true;
    }
  }

  public repairCar() {
    this.physics.repair();
  }

  public reseedWorld(): number {
    const s = this.physics.state;
    const seed = this.traffic.reseed(undefined, s.x, s.z);
    this.pedestrians.reseed(seed ^ 0x5a5a5a5a);
    return seed;
  }

  public resetToNearestRoad() {
    if (this.trainMode || this.walkMode) {
      this.setActionToast('Enter your car before resetting it');
      return;
    }
    const s = this.physics.state;
    let nearest = LANDMARKS[0];
    let bestD = Infinity;
    for (const lm of LANDMARKS) {
      const d = Math.hypot(s.x - lm.x, s.z - lm.z);
      if (d < bestD) {
        bestD = d;
        nearest = lm;
      }
    }
    this.physics.repair();
    this.physics.teleport(nearest.x, nearest.z, nearest.spawnHeading);
    this.camOrbitYaw = 0;
    this.snapCameraBehindCar();
  }

  // =========================================================================
  // POLL KEYBOARD + XBOX CONTROLLER
  // =========================================================================
  private sampleInputs(dt: number): VehicleInput {
    let throttle =
      this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0;
    let brake =
      this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0;
    let steer = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;
    let handbrake = this.keys.has('Space');

    if (!this.trainMode && !this.walkMode) {
      if (this.keys.has('KeyQ')) this.camOrbitYaw += 3.0 * dt;
      if (this.keys.has('KeyE')) this.camOrbitYaw -= 3.0 * dt;
    } else {
      if (this.keys.has('KeyQ')) this.camOrbitYaw += 2.6 * dt;
    }

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let activePad: Gamepad | null = null;
    for (let i = 0; i < pads.length; i++) {
      if (pads[i] && pads[i]!.connected) {
        activePad = pads[i];
        break;
      }
    }

    this.gamepadConnected = Boolean(activePad);

    if (activePad) {
      const lx = activePad.axes[0] ?? 0;
      const ly = activePad.axes[1] ?? 0;
      if (Math.abs(lx) > 0.1) {
        const mag = (Math.abs(lx) - 0.1) / 0.9;
        steer = -Math.sign(lx) * Math.pow(mag, 1.35);
        this.hasDriven = true;
      }
      if ((this.trainMode || this.walkMode) && Math.abs(ly) > 0.12) {
        const magY = (Math.abs(ly) - 0.12) / 0.88;
        if (ly < 0) throttle = Math.max(throttle, magY);
        else brake = Math.max(brake, magY);
      }

      const rt = activePad.buttons[7]?.value ?? 0;
      const lt = activePad.buttons[6]?.value ?? 0;
      if (rt > 0.04) {
        throttle = Math.max(throttle, rt);
        this.hasDriven = true;
        this.audio.start();
      }
      if (lt > 0.04) {
        brake = Math.max(brake, lt);
        this.hasDriven = true;
        this.audio.start();
      }

      if (activePad.buttons[0]?.pressed || activePad.buttons[1]?.pressed) {
        handbrake = true;
      }

      const rx = activePad.axes[2] ?? 0;
      const ry = activePad.axes[3] ?? 0;
      const stickDeadzone = 0.09;
      let targetYawVel = 0;
      let targetPitchVel = 0;

      if (Math.abs(rx) > stickDeadzone) {
        const normX = (Math.abs(rx) - stickDeadzone) / (1 - stickDeadzone);
        targetYawVel = -Math.sign(rx) * Math.pow(normX, 1.35) * 4.8;
      }
      if (Math.abs(ry) > stickDeadzone) {
        const normY = (Math.abs(ry) - stickDeadzone) / (1 - stickDeadzone);
        targetPitchVel = Math.sign(ry) * Math.pow(normY, 1.35) * 3.4;
      }

      this.camYawVel = THREE.MathUtils.damp(this.camYawVel, targetYawVel, 16, dt);
      this.camPitchVel = THREE.MathUtils.damp(this.camPitchVel, targetPitchVel, 16, dt);

      const minP = this.walkMode ? -0.68 : this.trainMode ? -0.45 : -0.06;
      const maxP = this.walkMode ? 0.68 : this.trainMode ? 0.55 : 1.18;
      this.camOrbitYaw += this.camYawVel * dt;
      this.camOrbitPitch = THREE.MathUtils.clamp(
        this.camOrbitPitch + this.camPitchVel * dt,
        minP,
        maxP
      );

      const isJustPressed = (idx: number): boolean => {
        const cur = Boolean(activePad!.buttons[idx]?.pressed);
        const prev = Boolean(this.prevGamepadButtons[idx]);
        return cur && !prev;
      };

      if (this.trainMode && isJustPressed(0)) this.trainSitToggleQueued = true;
      if (this.walkMode && isJustPressed(0)) this.walkJumpQueued = true;
      if (isJustPressed(2)) {
        if (this.walkMode) {
          if (this.nearestInteractable) {
            const msg = this.nearestInteractable.onInteract();
            if (msg) this.setActionToast(msg, 5.5);
          } else if (this.walkNearCar) {
            this.enterCar();
          } else if (this.walkNearOpenTrainDoor) {
            this.toggleTrainMode();
          } else {
            this.callCar();
          }
        } else if (!this.trainMode) {
          this.cycleHeadlights();
        }
      }
      if (isJustPressed(3)) this.cycleCameraPreset();
      if (isJustPressed(11)) this.recenterCamera();
      if (isJustPressed(4)) this.onToggleMap?.();
      if (isJustPressed(5)) this.resetToNearestRoad();
      if (isJustPressed(14)) this.onMapZoomDelta?.(-1);
      if (isJustPressed(15)) this.onMapZoomDelta?.(1);
      if (this.isMapExpandedCheck?.()) {
        if (isJustPressed(12)) this.onMapLegendNav?.(-1);
        if (isJustPressed(13)) this.onMapLegendNav?.(1);
      }

      this.prevGamepadButtons = activePad.buttons.map((b) => b.pressed);
    } else {
      this.camYawVel = THREE.MathUtils.damp(this.camYawVel, 0, 12, dt);
      this.camPitchVel = THREE.MathUtils.damp(this.camPitchVel, 0, 12, dt);
    }

    return { throttle, brake, steer, handbrake };
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    if (this.paused) {
      this.lastTimestamp = now;
      if (this.renderPausedFrameOnce) {
        this.renderPausedFrameOnce = false;
        if (this.composer && !this.isSoftwareGl) {
          this.composer.render();
        } else {
          this.renderer.render(this.scene, this.camera);
        }
      }
      if (this.isSoftwareGl) {
        this.afterDraw(this.tick);
      } else {
        this.frameId = requestAnimationFrame(this.tick);
      }
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTimestamp) / 1000));
    this.lastTimestamp = now;
    this.elapsed += dt;

    if (this.autoCycleTime) {
      this.timeOfDay = (this.timeOfDay + dt * 0.028) % 24;
    }

    const input = this.sampleInputs(dt);

    // 1. Step Car Physics (parked when riding/walking, or driven by Spec 6 road-following autopilot when called!)
    const carInput: VehicleInput =
      this.walkMode && this.carCallActive
        ? this.stepCarCallAutopilot(dt)
        : this.trainMode || this.walkMode
        ? { throttle: 0, brake: 0.4, steer: 0, handbrake: true }
        : input;

    this.physics.step(
      dt,
      carInput,
      0.93,
      this.collisionWorld,
      this.traffic.resolvePlayerTrafficCollision
    );

    const s = this.physics.state;

    // 2. Sync Black Hero Car Transform, Flowing Water-Film Mechanics, Damage Visuals & Lamps
    this.car.root.position.set(s.x, s.y, s.z);
    this.car.root.rotation.y = s.heading;
    this.car.setBrakeReverse(s.isBraking, s.isReversing);
    this.car.updateVisuals(
      s.steerAngle,
      s.wheelSpinDelta,
      s.pitch,
      s.roll,
      s.heave,
      this.elapsed,
      s.forwardSpeed,
      s.yawRate * Math.min(24, Math.abs(s.forwardSpeed)) * 0.14
    );
    this.car.applyDamageVisuals(
      s.damageFront,
      s.damageRear,
      s.damageLeft,
      s.damageRight,
      s.health,
      this.elapsed,
      dt
    );

    // 3. Stamp Persistent Wet Grass Tracks & Varied Asphalt Streaks
    this.tireTrails.update(
      s.x,
      s.y,
      s.z,
      s.heading,
      s.forwardSpeed,
      s.slipRatio,
      s.isBraking,
      s.surface
    );

    // 4. Update Walkable 3-Car Autopilot Metro Trains + Rider Walk/Sit/Platform-Exit Controls!
    if (this.trainMode) {
      const walkFwd = input.throttle - input.brake;
      const walkStrafe = input.steer; // +1 left, -1 right in local car coords
      const riderRes = this.metro.updateRiderControls(
        dt,
        walkFwd,
        walkStrafe,
        this.camOrbitYaw,
        this.trainSitToggleQueued
      );
      this.trainSitToggleQueued = false;
      if (riderRes.exitedToPlatform && riderRes.exitWorldPos) {
        this.trainMode = false;
        this.metro.setRiderMode(false, riderRes.exitWorldPos.x, riderRes.exitWorldPos.z);
        this.walkMode = true;
        this.walkPos.copy(riderRes.exitWorldPos);
        this.walkVy = 0;
        this.walkYaw = riderRes.exitYaw ?? 0;
        this.walkStationName = riderRes.stationName ?? 'Metro Station';
        this.walkOnStationShelter = true;
        this.walkReboardCooldown = 1.6;
        this.camOrbitYaw = 0;
        this.camOrbitPitch = 0;
        this.fpsBridge.mode = 'onFoot';
        this.fpsBridge.hooks?.onEnterOnFoot(this.walkPos, this.walkYaw);
      }
    }
    this.metro.update(dt, this.elapsed, this.env.nightFactor);
    const trainState = this.metro.getOperatedTrainState();
    if (this.trainMode && this.fpsBridge.hooks) {
      this.fpsBridge.hooks.updateTrainFrame(this.metro.getTrainFrame());
    }

    // 4b. Step First-Person On-Foot Exploration (Metro Platform -> Escalator Ramp -> Glass Pavilion -> City!)
    if (this.walkMode) {
      this.walkReboardCooldown = Math.max(0, this.walkReboardCooldown - dt);
      const moveFwd = input.throttle - input.brake;
      const moveStrafe = input.steer; // +1 left, -1 right
      const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const walkSpd = sprint ? 7.8 : 4.3;
      const lookYaw = this.walkYaw + this.camOrbitYaw;
      const fwdX = Math.sin(lookYaw);
      const fwdZ = Math.cos(lookYaw);
      const leftX = Math.cos(lookYaw);
      const leftZ = -Math.sin(lookYaw);

      const mag = Math.hypot(moveFwd, moveStrafe);
      let vx = 0;
      let vz = 0;
      if (mag > 0.04) {
        const norm = Math.min(1, mag);
        const nf = moveFwd / mag;
        const ns = moveStrafe / mag;
        vx = (fwdX * nf + leftX * ns) * walkSpd * norm;
        vz = (fwdZ * nf + leftZ * ns) * walkSpd * norm;
        this.walkBobPhase += dt * (sprint ? 13.5 : 9.4) * norm;
      } else {
        this.walkBobPhase = THREE.MathUtils.damp(this.walkBobPhase, 0, 6, dt);
      }
      this.walkSpeedKmh = Math.hypot(vx, vz) * 3.6;

      this.walkPos.x += vx * dt;
      this.walkPos.z += vz * dt;

      // Resolve station platform / inclined escalator ramp / street pavilion vs open-world ground height!
      const stWalk = this.metro.getWalkableStationInfo(this.walkPos.x, this.walkPos.z);
      this.walkOnStationShelter = stWalk.underShelter;
      this.walkStationName = stWalk.stationName;
      this.walkNearOpenTrainDoor = stWalk.nearOpenTrainDoor && this.walkReboardCooldown <= 0;

      let groundY = 0.11;
      const inArkVault =
        this.walkPos.y < -15.0 &&
        Math.abs(this.walkPos.x - 1865) < 13.4 &&
        Math.abs(this.walkPos.z + 475) < 13.4;

      if (inArkVault) {
        groundY = -22.0;
        this.walkPos.x = THREE.MathUtils.clamp(this.walkPos.x, 1852.2, 1877.8);
        this.walkPos.z = THREE.MathUtils.clamp(this.walkPos.z, -487.8, -462.2);
      } else if (stWalk.onStation) {
        groundY = stWalk.floorY;
      } else {
        const surf = getSurfaceAt(this.walkPos.x, this.walkPos.z);
        const isRoad = surf === 'asphalt' || surf === 'puddle';
        groundY = isRoad
          ? getRoadElevationAt(this.walkPos.x, this.walkPos.z) + 0.11
          : Math.max(-8.2, getTerrainHeight(this.walkPos.x, this.walkPos.z) + 0.04);
        const ledge = this.collisionWorld.sampleLedgeHeight(this.walkPos.x, this.walkPos.z);
        if (ledge.height > 0) groundY = Math.max(groundY, groundY + ledge.height);

        // Solid building / pillar collisions when walking at street/island level
        if (this.walkPos.y < groundY + 3.0) {
          const hitCol = this.collisionWorld.resolveCircle(this.walkPos.x, this.walkPos.z, 0.45);
          if (hitCol.hit) {
            this.walkPos.x = hitCol.x;
            this.walkPos.z = hitCol.z;
          }
        }
      }

      if (this.walkJumpQueued && this.walkPos.y <= groundY + 0.12) {
        this.walkVy = 6.2;
      }
      this.walkJumpQueued = false;

      if (this.walkPos.y > groundY + 0.02 || this.walkVy > 0) {
        this.walkVy -= 18.5 * dt;
        this.walkPos.y += this.walkVy * dt;
        if (this.walkPos.y <= groundY) {
          this.walkPos.y = groundY;
          this.walkVy = 0;
        }
      } else {
        this.walkPos.y = THREE.MathUtils.damp(this.walkPos.y, groundY, 16, dt);
      }

      this.walkNearCar = Math.hypot(this.walkPos.x - s.x, this.walkPos.z - s.z) < 5.6;
      if (this.walkNearCar && !this.carCallActive) {
        this.carCallPointerVisible = false;
      }
    }

    // 5. Camera: FIRST-PERSON TRAIN CABIN / FIRST-PERSON ON-FOOT WALK / Car Chase/Hood Camera!
    if (this.trainMode) {
      const targetFov = 64;
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
        this.camera.updateProjectionMatrix();
      }

      // Seated strictly inside the first-person metro interior cabin!
      const railSway = Math.sin(this.elapsed * 3.8) * 0.012 * Math.min(1, Math.abs(trainState.speedKmh) / 60);
      this.camPos.set(
        trainState.eyePos.x,
        trainState.eyePos.y + railSway,
        trainState.eyePos.z
      );

      // Train forward yaw in standard XZ coords (forwardDir is +Z along spline)
      const baseYaw = Math.atan2(trainState.forwardDir.x, trainState.forwardDir.z);
      const lookYaw = baseYaw + this.camOrbitYaw;
      const lookPitch = THREE.MathUtils.clamp(-this.camOrbitPitch, -0.45, 0.45);
      const cosP = Math.cos(lookPitch);
      this._desiredLook.set(
        this.camPos.x + Math.sin(lookYaw) * cosP * 20,
        this.camPos.y + Math.sin(lookPitch) * 20,
        this.camPos.z + Math.cos(lookYaw) * cosP * 20
      );
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this._desiredLook);
      this._focusVec.copy(trainState.worldPos);
    } else if (this.walkMode) {
      const targetFov = 66;
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
        this.camera.updateProjectionMatrix();
      }

      const headBob = Math.sin(this.walkBobPhase) * 0.042;
      this.camPos.set(this.walkPos.x, this.walkPos.y + FPS_EYE_HEIGHT_M + headBob, this.walkPos.z);

      const lookYaw = this.walkYaw + this.camOrbitYaw;
      const lookPitch = THREE.MathUtils.clamp(-this.camOrbitPitch, -0.68, 0.68);
      const cosP = Math.cos(lookPitch);
      this._desiredLook.set(
        this.camPos.x + Math.sin(lookYaw) * cosP * 20,
        this.camPos.y + Math.sin(lookPitch) * 20,
        this.camPos.z + Math.cos(lookYaw) * cosP * 20
      );
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this._desiredLook);
      this._focusVec.copy(this.walkPos);
    } else {
      const speedAbs = Math.abs(s.forwardSpeed);
      const speedRatio = Math.min(1, s.speedKmh / 270);

      // Compute smooth driving inertial cues (throttle surge, brake dive, cornering G-force & impact shock!)
      const rawAccel = THREE.MathUtils.clamp(
        (s.forwardSpeed - this.camPrevForwardSpeed) / Math.max(0.008, dt),
        -28,
        28
      );
      const vyDelta = s.vy - this.camPrevVy;
      this.camPrevForwardSpeed = s.forwardSpeed;
      this.camPrevVy = s.vy;

      // Trigger decaying camera jolt on hard collisions, curb jumps, or heavy suspension landings
      if (Math.abs(rawAccel) > 16.5) {
        this.camShakeEnergy = Math.min(1.0, this.camShakeEnergy + (Math.abs(rawAccel) - 15.5) * 0.042);
      }
      if (vyDelta > 2.3) {
        this.camShakeEnergy = Math.min(1.0, this.camShakeEnergy + (vyDelta - 2.0) * 0.095);
      }
      this.camShakeEnergy *= Math.exp(-5.4 * dt);

      const rawLatG = THREE.MathUtils.clamp(s.yawRate * Math.min(34, speedAbs), -26, 26);
      this.camAccelSmooth = THREE.MathUtils.damp(this.camAccelSmooth, rawAccel, 5.2, dt);
      this.camLatGSmooth = THREE.MathUtils.damp(this.camLatGSmooth, rawLatG, 6.2, dt);

      // Spring-damped vertical road-undulation & suspension heave tracking (weighty cinematic camera float)
      const targetSpringY = s.heave * 1.15 - Math.max(-0.24, Math.min(0.24, s.vy * 0.028));
      this.camSpringYVel += ((targetSpringY - this.camSpringY) * 34.0 - this.camSpringYVel * 6.8) * dt;
      this.camSpringY = THREE.MathUtils.clamp(this.camSpringY + this.camSpringYVel * dt, -0.34, 0.34);

      // Subtle cinematic horizon Dutch-roll banking into turns + subtle road-drift sway
      const targetBank = THREE.MathUtils.clamp(
        -this.camLatGSmooth * 0.00145 + s.roll * 0.24 + Math.sin(this.elapsed * 0.95) * 0.0032 * (0.35 + speedRatio),
        -0.052,
        0.052
      );
      this.camRollSmooth = THREE.MathUtils.damp(this.camRollSmooth, targetBank, 5.8, dt);

      // Organic multi-harmonic handheld/gyro road feel & surface cadence (smooth idle breath -> lively highway cadence!)
      const surfaceRough = s.surface === 'grass' ? 2.15 : s.surface === 'puddle' ? 1.25 : 1.0;
      const moveFactor = Math.min(1, speedAbs / 12);
      const t = this.elapsed;
      const gyroX =
        (Math.sin(t * 1.15) * 0.036 + Math.sin(t * 2.45 + 1.1) * 0.018) * (0.35 + moveFactor * 0.85);
      const gyroY =
        (Math.sin(t * 1.65 + 0.5) * 0.026 + Math.cos(t * 3.1) * 0.012) * (0.35 + moveFactor * 0.85);
      const roadCadenceY =
        (Math.sin(t * (11.5 + speedRatio * 14.0)) * 0.012 +
          Math.sin(t * (19.0 + speedRatio * 18.0) + 1.7) * 0.006) *
        moveFactor *
        surfaceRough;
      const shakeX =
        (Math.sin(t * 47.0) * 0.65 + Math.cos(t * 73.0) * 0.35) * this.camShakeEnergy * 0.16;
      const shakeY =
        (Math.cos(t * 53.0) * 0.65 + Math.sin(t * 81.0) * 0.35) * this.camShakeEnergy * 0.13;

      const accelFovBoost = THREE.MathUtils.clamp(this.camAccelSmooth * 0.28, -2.4, 4.6);
      const targetFov =
        this.cameraPreset === 'hood'
          ? 64 + speedRatio * 10 + accelFovBoost * 0.75
          : 56 + speedRatio * 14 + accelFovBoost;
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5.5, dt);
        this.camera.updateProjectionMatrix();
      }

      if (this.cameraPreset === 'hood') {
        const fwdX = -Math.sin(s.heading);
        const fwdZ = -Math.cos(s.heading);
        const rightX = Math.cos(s.heading);
        const rightZ = -Math.sin(s.heading);
        const headLeanLat = THREE.MathUtils.clamp(-this.camLatGSmooth * 0.0055, -0.09, 0.09);
        const headLeanFwd = THREE.MathUtils.clamp(-this.camAccelSmooth * 0.0052, -0.08, 0.08);
        this.camPos.set(
          s.x + fwdX * (0.45 + headLeanFwd) + rightX * (headLeanLat + shakeX * 0.35),
          s.y + 1.54 + s.heave + this.camSpringY * 0.28 + roadCadenceY * 0.85 + shakeY * 0.35,
          s.z + fwdZ * (0.45 + headLeanFwd) + rightZ * (headLeanLat + shakeX * 0.35)
        );
        const lookYaw = s.heading + this.camOrbitYaw - s.yawRate * 0.055;
        const lookPitch = THREE.MathUtils.clamp(
          this.camOrbitPitch - 0.18 + s.pitch * 0.45 - this.camAccelSmooth * 0.0022,
          -0.45,
          0.55
        );
        this._desiredLook.set(
          this.camPos.x - Math.sin(lookYaw) * Math.cos(lookPitch) * 20,
          this.camPos.y - Math.sin(lookPitch) * 14,
          this.camPos.z - Math.cos(lookYaw) * Math.cos(lookPitch) * 20
        );
        this.camera.position.copy(this.camPos);
        this.camera.lookAt(this._desiredLook);
        this.camera.rotateZ(this.camRollSmooth * 0.85);
      } else {
        const baseDist = this.cameraPreset === 'close' ? 5.5 : 7.4;
        // Pull back smoothly on hard throttle surge, ease in slightly under heavy braking!
        const accelPull = THREE.MathUtils.clamp(this.camAccelSmooth * 0.068, -0.46, 0.88);
        const dist = baseDist + accelPull + speedRatio * 0.48;
        // Dynamic cornering swing lets you feel weight transfer & see the car's sweeping tail during drifts!
        const driftSwing =
          -s.yawRate * 0.165 -
          this.camLatGSmooth * 0.0052 +
          Math.sin(t * 0.85) * 0.011 * (0.25 + moveFactor * 0.75);
        const orbitYaw = s.heading + this.camOrbitYaw + driftSwing;
        const pitch = this.camOrbitPitch + Math.max(-0.025, Math.min(0.032, -this.camAccelSmooth * 0.0014));

        const horizDist = Math.cos(pitch) * dist;
        const vertHeight = Math.sin(pitch) * dist + 1.12 + this.camSpringY * 0.55 + gyroY + roadCadenceY;

        const rightX = Math.cos(orbitYaw);
        const rightZ = -Math.sin(orbitYaw);
        const latOffset = gyroX + shakeX;

        this._desiredCamPos.set(
          s.x + Math.sin(orbitYaw) * horizDist + rightX * latOffset,
          Math.max(s.y + 0.68, s.y + vertHeight + shakeY),
          s.z + Math.cos(orbitYaw) * horizDist + rightZ * latOffset
        );

        // Weighty spring-lag follow (slightly looser laterally/longitudinally so acceleration & turns feel alive!)
        const camLambdaXZ = 10.2 + speedRatio * 2.8;
        const camLambdaY = 9.4;
        this.camPos.x = THREE.MathUtils.damp(this.camPos.x, this._desiredCamPos.x, camLambdaXZ, dt);
        this.camPos.y = THREE.MathUtils.damp(this.camPos.y, this._desiredCamPos.y, camLambdaY, dt);
        this.camPos.z = THREE.MathUtils.damp(this.camPos.z, this._desiredCamPos.z, camLambdaXZ, dt);

        // Look slightly into the corner apex + track vehicle pitch/heave naturally!
        const carRightX = Math.cos(s.heading);
        const carRightZ = -Math.sin(s.heading);
        const apexLead = THREE.MathUtils.clamp(-s.yawRate * 0.68, -0.95, 0.95);
        this._desiredLook.set(
          s.x - Math.sin(s.heading) * (1.75 + speedRatio * 1.15) + carRightX * apexLead + shakeX * 0.32,
          s.y + 1.15 + s.heave * 0.45 + roadCadenceY * 0.65 + shakeY * 0.35,
          s.z - Math.cos(s.heading) * (1.75 + speedRatio * 1.15) + carRightZ * apexLead + shakeX * 0.32
        );
        this.camLookAt.x = THREE.MathUtils.damp(this.camLookAt.x, this._desiredLook.x, 12.8, dt);
        this.camLookAt.y = THREE.MathUtils.damp(this.camLookAt.y, this._desiredLook.y, 12.2, dt);
        this.camLookAt.z = THREE.MathUtils.damp(this.camLookAt.z, this._desiredLook.z, 12.8, dt);

        this.camera.position.copy(this.camPos);
        this.camera.lookAt(this.camLookAt);
        this.camera.rotateZ(this.camRollSmooth);
      }
      this._focusVec.set(s.x, s.y, s.z);
    }

    // 6. Update Darker Midnight Sky, Silky Feathered Rain (dry inside metro cabin & covered station interiors!)
    const nightFactor = this.env.update(
      dt,
      this.elapsed,
      this.timeOfDay,
      this.camera.position,
      this.textures,
      this._focusVec,
      this.trainMode
        ? {
            active: true,
            center: trainState.worldPos,
            forward: trainState.forwardDir,
          }
        : this.walkMode && this.walkOnStationShelter
        ? {
            active: true,
            center: this.walkPos,
            forward: this._curCamFwd,
            stationShelter: true,
          }
        : undefined
    );

    // 7. Update City, Traffic Lights/Crosswalks, Traffic (with movable parked cars!) & PS2 Pedestrians!
    this.city.update(dt, this.elapsed, this._focusVec, nightFactor);
    this.infrastructure.update(this.elapsed, nightFactor);
    this.traffic.update(
      dt,
      this.elapsed,
      this._focusVec.x,
      this._focusVec.z,
      nightFactor,
      this.trainMode || this.walkMode ? 0 : s.vx,
      this.trainMode || this.walkMode ? 0 : s.vz
    );
    this.pedestrians.update(
      dt,
      this.elapsed,
      this.traffic.getBusStopArrivalFlags(),
      this.metro.getStationTrainFlags(),
      this.walkMode && !this.walkOnStationShelter ? this.walkPos : undefined
    );

    // 7b. Faint Live Running City Reflections on the Hero Car (throttled every 3rd frame for smooth 60fps!)
    if (this.carCubeCam && !this.trainMode && !this.isSoftwareGl) {
      this.envFrameCounter = (this.envFrameCounter + 1) % 3;
      if (this.envFrameCounter === 0) {
        this.carCubeCam.position.set(s.x, s.y + 1.18, s.z);
        this.car.root.visible = false;
        this.carCubeCam.update(this.renderer, this.scene);
        this.car.root.visible = true;
      }
    }

    // 8. Update Procedural Audio
    if (!this.audioMuted) {
      if (this.trainMode) {
        const trainRpm = 1050 + Math.abs(trainState.speedKmh) * 24;
        this.audio.update(trainRpm, 0.2, Math.abs(trainState.speedKmh), 0);
      } else if (this.walkMode) {
        this.audio.update(760, 0.02, 0, 0);
      } else {
        this.audio.update(s.rpm, input.throttle, s.speedKmh, s.slipRatio);
      }
    }

    // 9. Slight Gaussian Look-Blur (car, train & on-foot!) + Realistic Dripping Lens Raindrops (dry inside!)
    if (this.motionPass) {
      this.camera.getWorldDirection(this._curCamFwd);
      this._deltaFwd.copy(this._curCamFwd).sub(this.prevCamForward).divideScalar(Math.max(0.008, dt));
      this._camRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
      this._camUp.set(0, 1, 0).applyQuaternion(this.camera.quaternion);

      const rotX = this._deltaFwd.dot(this._camRight);
      const rotY = this._deltaFwd.dot(this._camUp);
      const angSpeed = Math.hypot(rotX, rotY);

      if (angSpeed > 0.05) {
        this.blurVecSmooth.x = THREE.MathUtils.damp(this.blurVecSmooth.x, rotX / angSpeed, 14, dt);
        this.blurVecSmooth.y = THREE.MathUtils.damp(this.blurVecSmooth.y, rotY / angSpeed, 14, dt);
      }

      const isFirstPerson = this.trainMode || this.walkMode;
      const blurGain = isFirstPerson ? 0.00105 : 0.00088;
      const blurThreshold = isFirstPerson ? 0.16 : 0.28;
      const blurCap = isFirstPerson ? 0.0024 : 0.002;
      const targetBlur = THREE.MathUtils.clamp((angSpeed - blurThreshold) * blurGain, 0, blurCap);
      this.blurStrengthSmooth = THREE.MathUtils.damp(this.blurStrengthSmooth, targetBlur, 11, dt);

      this.motionPass.uniforms.uBlurDir.value.copy(this.blurVecSmooth);
      this.motionPass.uniforms.uBlurStrength.value = this.blurStrengthSmooth;
      this.motionPass.uniforms.uNightFactor.value = nightFactor;
      this.motionPass.uniforms.uTime.value = this.elapsed;
      this.motionPass.uniforms.uLensSplashEnable.value =
        this.trainMode || (this.walkMode && this.walkOnStationShelter) ? 0.0 : 1.0;

      this.prevCamForward.copy(this._curCamFwd);
    }

    // 9B. Update 45m Interior Prop Distance Culling & Nearest [E] Interactable!
    const cullX = this.trainMode
      ? trainState.worldPos.x
      : this.walkMode
      ? this.walkPos.x
      : s.x;
    const cullZ = this.trainMode
      ? trainState.worldPos.z
      : this.walkMode
      ? this.walkPos.z
      : s.z;
    this.interiorRegistry.updateCulling(cullX, cullZ);
    this.nearestInteractable = this.walkMode
      ? this.interiorRegistry.findNearestInteractable(
          this.walkPos.x,
          this.walkPos.y + 1.0,
          this.walkPos.z
        )
      : null;
    if (this.actionToastTimer > 0) {
      this.actionToastTimer = Math.max(0, this.actionToastTimer - dt);
      if (this.actionToastTimer <= 0) this.actionToast = '';
    }

    // 10. Render Frame
    if (this.composer && !this.isSoftwareGl) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // 11. Emit Throttled Telemetry to Minimal React HUD
    if (now - this.lastTelemetryEmit > 82) {
      this.lastTelemetryEmit = now;
      this.emitTelemetrySnapshot();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private emitTelemetrySnapshot() {
    const s = this.physics.state;
    const trainState = this.metro.getOperatedTrainState();
    const activeX = this.trainMode
      ? trainState.worldPos.x
      : this.walkMode
      ? this.walkPos.x
      : s.x;
    const activeZ = this.trainMode
      ? trainState.worldPos.z
      : this.walkMode
      ? this.walkPos.z
      : s.z;
    const activeHeading = this.trainMode
      ? Math.atan2(-trainState.forwardDir.x, -trainState.forwardDir.z)
      : this.walkMode
      ? Math.atan2(
          -Math.sin(this.walkYaw + this.camOrbitYaw),
          -Math.cos(this.walkYaw + this.camOrbitYaw)
        )
      : s.heading;

    const roadInfo = getRoadNameAt(activeX, activeZ);
    const roadLabel = roadInfo ? `${roadInfo.code} · ${roadInfo.name}` : '';

    let walkPrompt = '';
    if (this.walkMode) {
      if (this.nearestInteractable) walkPrompt = this.nearestInteractable.prompt;
      else if (this.walkNearCar) walkPrompt = 'Near Car · Press E or G to Drive';
      else if (this.walkNearOpenTrainDoor) walkPrompt = 'Train Boarding · Press E or T to Board';
      else if (this.walkOnStationShelter)
        walkPrompt = `${this.walkStationName || 'Metro Station'} · Explore КАФЕ & Waiting Hall`;
      else walkPrompt = 'On Foot · Press E near road to Call Car';
    }

    let carCallPointerAngleRad = 0;
    let carCallDistM = 0;
    const pointerShowing = this.walkMode && (this.carCallActive || this.carCallPointerVisible);
    if (pointerShowing) {
      const dx = s.x - this.walkPos.x;
      const dz = s.z - this.walkPos.z;
      carCallDistM = Math.round(Math.hypot(dx, dz));
      const lookYaw = this.walkYaw + this.camOrbitYaw;
      const fwdX = Math.sin(lookYaw);
      const fwdZ = Math.cos(lookYaw);
      const rightX = -Math.cos(lookYaw);
      const rightZ = Math.sin(lookYaw);
      carCallPointerAngleRad = Math.atan2(
        dx * rightX + dz * rightZ,
        dx * fwdX + dz * fwdZ
      );
    }

    const activeY = this.trainMode
      ? trainState.eyePos.y
      : this.walkMode
      ? this.walkPos.y
      : s.y;
    const npcSubtitle = this.trainMode
      ? this.metro.getActiveSubtitle(activeX, activeY, activeZ)
      : this.walkMode
      ? this.pedestrians.getActiveSubtitle(activeX, activeY, activeZ) ||
        this.metro.getActiveSubtitle(activeX, activeY, activeZ)
      : '';

    this.onTelemetry({
      speedKmh: this.walkMode ? Math.round(this.walkSpeedKmh) : Math.round(s.speedKmh),
      gear: s.gear,
      rpm: Math.round(s.rpm),
      health: Math.round(s.health),
      surface: s.surface,
      district:
        this.walkMode && this.walkStationName
          ? `${this.walkStationName}`
          : getDistrictAt(activeX, activeZ),
      roadLabel,
      metroHint: this.metro.getNearestTrainStatus(activeX, activeZ),
      interactPrompt: this.nearestInteractable?.prompt ?? '',
      actionToast: this.actionToast,
      gridPowerOnline: this.gridPowerOnline,
      timeOfDay: this.timeOfDay,
      headlights: this.headlights,
      cameraPreset: this.cameraPreset,
      mapX: w2m(activeX),
      mapZ: w2m(activeZ),
      headingRad: activeHeading,
      carMapX: w2m(s.x),
      carMapZ: w2m(s.z),
      carHeadingRad: s.heading,
      slipRatio: s.slipRatio,
      gamepadConnected: this.gamepadConnected,
      hasDriven: this.hasDriven,
      trainMode: this.trainMode,
      trainSpeedKmh: trainState.speedKmh,
      trainDoorsOpen: trainState.doorsOpen,
      trainNextStation: trainState.nextStation,
      trainCurrentStation: trainState.currentStation,
      trainDistToNextM: trainState.distToNextM,
      trainSeated: trainState.seated,
      trainCarIndex: trainState.carIndex,
      trainPassengerCount: trainState.passengerCount,
      walkMode: this.walkMode,
      walkPrompt,
      nearCar: this.walkNearCar,
      nearOpenTrainDoor: this.walkNearOpenTrainDoor,
      activeTrafficCount: this.traffic.agents.length,
      pedestrianCount: this.pedestrians.totalCount,
      paused: this.paused,
      carCallActive: pointerShowing,
      carCallPointerAngleRad,
      carCallDistM,
      carCallBlocked: this.carCallBlocked,
      npcSubtitle,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    this.audio.dispose();
    this.textures.dispose();
    this.carEnvRT?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
