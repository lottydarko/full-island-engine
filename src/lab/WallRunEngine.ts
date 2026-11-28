import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FpsAudioSynth } from '../fps/fpsAudio';
import {
  createPlayerKit,
  PlayerKit,
  PlayerKitState,
  PlayerWeaponId,
} from '../fps/playerKit';
import { buildWallRunCourseSpec, WallMaterialKind } from './courseData';
import { ParkourFxPool } from './parkourFx';
import { buildWallRunCourseScene, CourseBuildResult } from './WallRunCourse';

export interface WallRunTelemetry extends PlayerKitState {
  fps: number;
  frameMs: number;
}

export class WallRunEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private course: CourseBuildResult;
  private fxPool: ParkourFxPool;
  private audio: FpsAudioSynth;
  private player: PlayerKit;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private isSoftwareGl = false;
  private rafId: number | null = null;
  private lastTimeMs = 0;
  private fpsAccumTime = 0;
  private fpsFrames = 0;
  private liveFps = 60;
  private liveFrameMs = 16.7;
  private disposed = false;

  private onTelemetry: (snap: WallRunTelemetry) => void;

  constructor(
    container: HTMLElement,
    onTelemetry: (snap: WallRunTelemetry) => void,
  ) {
    this.container = container;
    this.onTelemetry = onTelemetry;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Detect software WebGL (SwiftShader / llvmpipe) to cap shadow resolution & pixelRatio safely
    const gl = this.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    this.isSoftwareGl = /swiftshader|llvmpipe|software|mesa/i.test(rendererStr);

    const dpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x16212d);
    this.scene.fog = new THREE.FogExp2(0x16212d, 0.0072);

    this.camera = new THREE.PerspectiveCamera(74, width / height, 0.08, 360);

    // PMREM procedural studio/sky environment on all devices so metals, glass, and leather read crisply
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Motivated directional low sun + atmospheric sky/mist hemisphere fill
    this.hemiLight = new THREE.HemisphereLight(0xaec6df, 0x1e2733, 0.65);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0da, 1.85);
    this.sunLight.position.set(42, 68, 28);
    this.sunLight.castShadow = true;
    const shadowSize = this.isSoftwareGl ? 512 : 1024;
    this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 160;
    const d = 55;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0008;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const maxAniso = this.isSoftwareGl
      ? 1
      : Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const courseSpec = buildWallRunCourseSpec();
    this.course = buildWallRunCourseScene(courseSpec, maxAniso);
    this.scene.add(this.course.group);

    this.fxPool = new ParkourFxPool(this.scene);
    this.audio = new FpsAudioSynth();

    this.player = createPlayerKit({
      scene: this.scene,
      camera: this.camera,
      domElement: this.renderer.domElement,
      courseSpec,
      maxAnisotropy: maxAniso,
      initialWeapon: 'pistol9mm',
      shootableMeshes: this.course.hitMeshes,
      onSoundEvent: (ev) => this.audio.handleSoundEvent(ev),
      onBulletHit: (point, normal, hitObj) => {
        const targetId = this.course.targetMeshes.get(hitObj);
        if (targetId) {
          this.course.flashTargetHit(targetId);
          this.fxPool.spawnBurst(
            point.x,
            point.y,
            point.z,
            normal.x,
            normal.y,
            normal.z,
            12,
            0xfbbf24,
            4.5,
            1.1,
          );
        } else {
          this.fxPool.spawnBurst(
            point.x,
            point.y,
            point.z,
            normal.x,
            normal.y,
            normal.z,
            6,
            0xd6d3d1,
            3.2,
            0.75,
          );
        }
      },
      onWallSlideParticle: (x, y, z, nx, nz, mat: WallMaterialKind) => {
        const hex =
          mat === 'brick' ? 0xc2654c : mat === 'glass' ? 0x93c5fd : 0xcbd5e1;
        this.fxPool.spawnBurst(x, y, z, nx, 0.35, nz, 3, hex, 2.2, 0.65);
      },
      onStateChange: (state) => {
        if (state.parkourState === 'wallSlide') {
          this.audio.startOrUpdateWallSlideLoop(
            Math.min(1, state.wallSlideTimer * 0.6 + 0.25),
          );
        }
        this.onTelemetry({
          ...state,
          fps: this.liveFps,
          frameMs: this.liveFrameMs,
        });
      },
    });

    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('mousedown', this.unlockAudio);
    window.addEventListener('keydown', this.unlockAudio);

    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  private unlockAudio = () => {
    this.audio.unlock();
  };

  private onResize = () => {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const dpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
  };

  private scheduleNextFrame = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.tick);
  };

  private tick = (nowMs: number) => {
    if (this.disposed) return;
    const rawDt = Math.max(0.001, (nowMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = nowMs;

    this.fpsAccumTime += rawDt;
    this.fpsFrames += 1;
    if (this.fpsAccumTime >= 0.4) {
      this.liveFps = Math.round(this.fpsFrames / this.fpsAccumTime);
      this.liveFrameMs = Number(((this.fpsAccumTime / this.fpsFrames) * 1000).toFixed(1));
      this.fpsAccumTime = 0;
      this.fpsFrames = 0;
    }

    const dt = Math.min(0.05, rawDt);
    this.player.update(dt);
    this.course.update(dt, nowMs / 1000);
    this.fxPool.update(dt);

    // Track directional sun shadow box around player
    const camPos = this.camera.position;
    this.sunLight.position.set(camPos.x + 36, camPos.y + 60, camPos.z + 24);
    this.sunLight.target.position.set(camPos.x, camPos.y - 4, camPos.z - 8);
    this.sunLight.target.updateMatrixWorld();

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      window.setTimeout(this.scheduleNextFrame, 0);
    } else {
      this.scheduleNextFrame();
    }
  };

  public switchWeapon(id: PlayerWeaponId) {
    this.player.switchWeapon(id, 'kbm');
  }

  public respawn(checkpointIndex?: number) {
    this.player.respawnAtCheckpoint(checkpointIndex);
  }

  public setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  public requestPointerLock() {
    this.audio.unlock();
    this.player.requestPointerLock();
  }

  public dispose() {
    this.disposed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('mousedown', this.unlockAudio);
    window.removeEventListener('keydown', this.unlockAudio);
    this.player.dispose();
    this.course.dispose();
    this.fxPool.dispose();
    this.audio.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
