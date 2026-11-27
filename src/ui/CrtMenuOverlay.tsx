import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type CrtMenuMode = 'start' | 'paused';

interface CrtMenuOverlayProps {
  mode: CrtMenuMode;
  crtWarp: boolean;
  audioEnabled: boolean;
  onEnterWorld: () => void;
  onToggleCrtWarp: () => void;
  onToggleAudio: () => void;
}

interface BloodRivulet {
  x: number;
  y: number;
  len: number;
  speed: number;
  width: number;
  wobblePhase: number;
  wobbleFreq: number;
  alpha: number;
  forkOffset: number;
}

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/** Self-contained procedural CRT Web Audio synth (60 Hz hum, crackle, relay clicks, confirm stab). */
class CrtMenuSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humSub: OscillatorNode | null = null;
  private crackleSrc: AudioBufferSourceNode | null = null;
  private enabled = true;
  private started = false;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.24 : 0, this.ctx.currentTime, 0.04);
    }
  }

  public unlock() {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.enabled ? 0.24 : 0;
      master.connect(ctx.destination);
      this.masterGain = master;

      const humOsc = ctx.createOscillator();
      humOsc.type = 'sine';
      humOsc.frequency.value = 60;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.22;
      humOsc.connect(humGain);
      humGain.connect(master);
      humOsc.start();
      this.humOsc = humOsc;

      const humSub = ctx.createOscillator();
      humSub.type = 'triangle';
      humSub.frequency.value = 120;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.05;
      humSub.connect(subGain);
      subGain.connect(master);
      humSub.start();
      this.humSub = humSub;

      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const r = Math.random();
        data[i] = r > 0.996 ? (Math.random() * 2 - 1) * 0.85 : (Math.random() * 2 - 1) * 0.045;
      }
      const crackleSrc = ctx.createBufferSource();
      crackleSrc.buffer = buf;
      crackleSrc.loop = true;

      const crackleFilter = ctx.createBiquadFilter();
      crackleFilter.type = 'bandpass';
      crackleFilter.frequency.value = 2600;
      crackleFilter.Q.value = 0.9;

      const crackleGain = ctx.createGain();
      crackleGain.gain.value = 0.14;

      crackleSrc.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(master);
      crackleSrc.start();
      this.crackleSrc = crackleSrc;

      this.started = true;
    } catch {
      // Ignore blocked audio context
    }
  }

  public playRelayClick(pitchMul = 1.0) {
    this.unlock();
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1180 * pitchMul, now);
      osc.frequency.exponentialRampToValueAtTime(190 * pitchMul, now + 0.032);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.042);
    } catch {
      // ignore
    }
  }

  public playConfirmStab() {
    this.unlock();
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const freqs = [148, 221, 587, 932];
      for (let i = 0; i < freqs.length; i++) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freqs[i], now);
        osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.42, now + 0.13);
        g.gain.setValueAtTime(0.26 / (i + 1), now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // ignore
    }
  }

  public dispose() {
    try {
      this.humOsc?.stop();
      this.humSub?.stop();
      this.crackleSrc?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.masterGain = null;
    this.started = false;
  }
}

const ROW_BANDS: [number, number][] = [
  [0.50, 0.61], // Row 0: ENTER WORLD
  [0.62, 0.73], // Row 1: CRT WARP
  [0.74, 0.85], // Row 2: AUDIO
];

export const CrtMenuOverlay: React.FC<CrtMenuOverlayProps> = ({
  mode,
  crtWarp,
  audioEnabled,
  onEnterWorld,
  onToggleCrtWarp,
  onToggleAudio,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({
    mode,
    crtWarp,
    audioEnabled,
    onEnterWorld,
    onToggleCrtWarp,
    onToggleAudio,
  });
  propsRef.current = {
    mode,
    crtWarp,
    audioEnabled,
    onEnterWorld,
    onToggleCrtWarp,
    onToggleAudio,
  };

  const selectedRowRef = useRef(0);
  const camSideRef = useRef<1 | -1>(1);
  const glitchBurstRef = useRef(1.0);
  const launchingRef = useRef(false);
  const synthRef = useRef<CrtMenuSynth | null>(null);

  useEffect(() => {
    synthRef.current?.setEnabled(audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    launchingRef.current = false;
    selectedRowRef.current = 0;
    camSideRef.current = 1;
    glitchBurstRef.current = 1.0;

    const synth = new CrtMenuSynth();
    synth.setEnabled(propsRef.current.audioEnabled);
    synthRef.current = synth;

    const isSwGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSwGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSwGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(
      Math.max(1, container.clientWidth),
      Math.max(1, container.clientHeight)
    );
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090b10');
    scene.fog = new THREE.FogExp2('#090b10', 0.14);

    const camera = new THREE.PerspectiveCamera(
      40,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      40
    );

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    // Procedural studio reflections so molded casing, bezel chamfers, and screws catch real depth
    const pmremGen = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = track(pmremGen.fromScene(roomEnv, 0.04));
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmremGen.dispose();

    // Relic-void atmospheric backdrop plane (grimy dark depth behind the hovering CRT)
    const voidBackdropCanvas = document.createElement('canvas');
    voidBackdropCanvas.width = 512;
    voidBackdropCanvas.height = 512;
    const vCtx = voidBackdropCanvas.getContext('2d')!;
    const vGrad = vCtx.createRadialGradient(256, 240, 28, 256, 256, 280);
    vGrad.addColorStop(0, '#1e2831');
    vGrad.addColorStop(0.45, '#11161c');
    vGrad.addColorStop(1, '#05070a');
    vCtx.fillStyle = vGrad;
    vCtx.fillRect(0, 0, 512, 512);
    // Faint vertical grime / damp streak atmosphere in the background
    for (let i = 0; i < 42; i++) {
      const gx = (i * 53 + 17) % 512;
      const gw = 4 + (i % 7) * 3;
      vCtx.fillStyle = i % 3 === 0 ? 'rgba(92, 16, 22, 0.08)' : 'rgba(130, 160, 175, 0.045)';
      vCtx.fillRect(gx, 0, gw, 512);
    }
    const voidTex = track(new THREE.CanvasTexture(voidBackdropCanvas));
    voidTex.colorSpace = THREE.SRGBColorSpace;
    const voidBackdrop = new THREE.Mesh(
      track(new THREE.PlaneGeometry(18, 12)),
      track(
        new THREE.MeshBasicMaterial({
          map: voidTex,
          depthWrite: false,
        })
      )
    );
    voidBackdrop.position.set(0, 0, -5.2);
    scene.add(voidBackdrop);

    // Floating atmospheric dust motes drifting in the relic void
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 64;
    dustCanvas.height = 64;
    const dCtx = dustCanvas.getContext('2d')!;
    const dGrad = dCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    dGrad.addColorStop(0, 'rgba(215, 228, 232, 0.85)');
    dGrad.addColorStop(0.5, 'rgba(165, 188, 198, 0.25)');
    dGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    dCtx.fillStyle = dGrad;
    dCtx.fillRect(0, 0, 64, 64);
    const dustTex = track(new THREE.CanvasTexture(dustCanvas));
    dustTex.colorSpace = THREE.SRGBColorSpace;

    const moteCount = 110;
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const s1 = Math.sin(i * 12.9898) * 43758.5453;
      const s2 = Math.sin(i * 78.233 + 1.4) * 28411.19;
      const s3 = Math.sin(i * 39.425 + 2.7) * 19381.73;
      motePos[i * 3] = ((s1 - Math.floor(s1)) - 0.5) * 7.2;
      motePos[i * 3 + 1] = ((s2 - Math.floor(s2)) - 0.5) * 4.8;
      motePos[i * 3 + 2] = -3.4 + (s3 - Math.floor(s3)) * 4.5;
    }
    const moteGeo = track(new THREE.BufferGeometry());
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = track(
      new THREE.PointsMaterial({
        map: dustTex,
        size: 0.075,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const dustPoints = new THREE.Points(moteGeo, moteMat);
    scene.add(dustPoints);

    // 3-point relic lighting + phosphor screen bounce + crimson underglow
    const hemi = new THREE.HemisphereLight('#3c4d5e', '#1a0a0d', 0.72);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#c4d4e6', 1.85);
    keyLight.position.set(2.8, 3.6, 4.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#9c1622', 1.35);
    rimLight.position.set(-4.2, 1.2, -1.8);
    scene.add(rimLight);

    const rightRimLight = new THREE.DirectionalLight('#4a7088', 0.95);
    rightRimLight.position.set(4.0, -1.0, -2.0);
    scene.add(rightRimLight);

    const screenBounce = new THREE.PointLight('#7ee8ca', 1.25, 5.5);
    screenBounce.position.set(0, 0.02, 1.25);
    scene.add(screenBounce);

    const bloodGlow = new THREE.PointLight('#b01420', 0.8, 4.0);
    bloodGlow.position.set(0.6, -0.7, 0.75);
    scene.add(bloodGlow);

    // FLOATING VINTAGE FAT CRT (NO STAND / NO DESK BASE — hovers freely in the void)
    const crtGroup = new THREE.Group();
    scene.add(crtGroup);

    const shellMat = track(
      new THREE.MeshStandardMaterial({
        color: '#343940',
        roughness: 0.58,
        metalness: 0.16,
      })
    );
    const bezelMat = track(
      new THREE.MeshStandardMaterial({
        color: '#1b1f24',
        roughness: 0.42,
        metalness: 0.24,
      })
    );
    const innerLipMat = track(
      new THREE.MeshStandardMaterial({
        color: '#101317',
        roughness: 0.34,
        metalness: 0.32,
      })
    );
    const rearHousingMat = track(
      new THREE.MeshStandardMaterial({
        color: '#252930',
        roughness: 0.70,
        metalness: 0.14,
      })
    );
    const screwMat = track(
      new THREE.MeshStandardMaterial({
        color: '#6b737d',
        roughness: 0.28,
        metalness: 0.85,
      })
    );
    const cableMat = track(
      new THREE.MeshStandardMaterial({
        color: '#141619',
        roughness: 0.82,
        metalness: 0.08,
      })
    );
    const ledMat = track(
      new THREE.MeshStandardMaterial({
        color: '#ff242c',
        emissive: new THREE.Color('#ff1822'),
        emissiveIntensity: 3.2,
        roughness: 0.15,
      })
    );

    // Outer thick cabinet shell + dark tube gasket backing behind recessed bezel
    const outerShell = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.26, 1.82, 0.52)),
      shellMat
    );
    outerShell.position.set(0, 0, -0.22);
    crtGroup.add(outerShell);

    const tubeGasket = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.98, 1.48)),
      track(
        new THREE.MeshBasicMaterial({
          color: '#020304',
          fog: false,
        })
      )
    );
    tubeGasket.position.set(0, 0.02, 0.042);
    crtGroup.add(tubeGasket);

    // Stepped outer-bezel hood framing the deep tube
    const topBezel = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.22, 0.20, 0.28)),
      bezelMat
    );
    topBezel.position.set(0, 0.79, 0.12);
    crtGroup.add(topBezel);

    const botBezel = new THREE.Mesh(
      track(new THREE.BoxGeometry(2.22, 0.24, 0.28)),
      bezelMat
    );
    botBezel.position.set(0, -0.77, 0.12);
    crtGroup.add(botBezel);

    const leftBezel = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.20, 1.40, 0.28)),
      bezelMat
    );
    leftBezel.position.set(-1.01, 0.02, 0.12);
    crtGroup.add(leftBezel);

    const rightBezel = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.20, 1.40, 0.28)),
      bezelMat
    );
    rightBezel.position.set(1.01, 0.02, 0.12);
    crtGroup.add(rightBezel);

    // Recessed inner bezel lip framing the convex CRT glass
    const innerTop = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.88, 0.05, 0.14)),
      innerLipMat
    );
    innerTop.position.set(0, 0.695, 0.16);
    crtGroup.add(innerTop);

    const innerBot = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.88, 0.05, 0.14)),
      innerLipMat
    );
    innerBot.position.set(0, -0.655, 0.16);
    crtGroup.add(innerBot);

    const innerLeft = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.05, 1.38, 0.14)),
      innerLipMat
    );
    innerLeft.position.set(-0.915, 0.02, 0.16);
    crtGroup.add(innerLeft);

    const innerRight = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.05, 1.38, 0.14)),
      innerLipMat
    );
    innerRight.position.set(0.915, 0.02, 0.16);
    crtGroup.add(innerRight);

    // Four machined bezel corner bolts (heavy industrial CRT relic detail)
    const boltGeo = track(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 6));
    const boltCoords: [number, number][] = [
      [-0.99, 0.78],
      [0.99, 0.78],
      [-0.99, -0.77],
      [0.99, -0.77],
    ];
    for (let b = 0; b < boltCoords.length; b++) {
      const bolt = new THREE.Mesh(boltGeo, screwMat);
      bolt.rotation.x = Math.PI * 0.5;
      bolt.position.set(boltCoords[b][0], boltCoords[b][1], 0.265);
      crtGroup.add(bolt);
    }

    // Side molded vent louvers so the +/-23 deg oblique angle shows deep fat CRT hardware
    const louverGeo = track(new THREE.BoxGeometry(0.06, 0.045, 0.34));
    for (let side of [-1, 1]) {
      for (let v = 0; v < 7; v++) {
        const louver = new THREE.Mesh(louverGeo, innerLipMat);
        louver.position.set(side * 1.13, -0.36 + v * 0.12, -0.22);
        crtGroup.add(louver);
      }
    }

    // Fat cathode-ray tapered rear cone + neck + cooling ribs (no desk stand!)
    const rearTaper = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.68, 1.04, 1.08, 8)),
      rearHousingMat
    );
    rearTaper.rotation.x = Math.PI * 0.5;
    rearTaper.rotation.z = Math.PI * 0.125;
    rearTaper.position.set(0, 0.02, -0.96);
    crtGroup.add(rearTaper);

    const tubeNeck = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.30, 0.42, 0.48, 16)),
      rearHousingMat
    );
    tubeNeck.rotation.x = Math.PI * 0.5;
    tubeNeck.position.set(0, 0.02, -1.62);
    crtGroup.add(tubeNeck);

    // Severed coiled power cord dangling freely from underside into the dark void
    const cordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -0.75, -0.45),
      new THREE.Vector3(-0.38, -1.18, -0.42),
      new THREE.Vector3(-0.22, -1.52, -0.28),
      new THREE.Vector3(-0.44, -1.96, -0.18),
      new THREE.Vector3(-0.34, -2.55, -0.26),
    ]);
    const cordMesh = new THREE.Mesh(
      track(new THREE.TubeGeometry(cordCurve, 22, 0.024, 8, false)),
      cableMat
    );
    crtGroup.add(cordMesh);

    // Red power LED + soft additive halo on lower-right molded bezel
    const powerLed = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.028, 12, 10)),
      ledMat
    );
    powerLed.position.set(0.84, -0.77, 0.265);
    crtGroup.add(powerLed);

    const ledHalo = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: dustTex,
          color: '#ff1e28',
          transparent: true,
          opacity: 0.72,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      )
    );
    ledHalo.scale.set(0.22, 0.22, 1);
    ledHalo.position.set(0.84, -0.77, 0.28);
    crtGroup.add(ledHalo);

    // 1024x768 CRT canvas + pre-seeded visible inner-glass flowing crimson blood rivulets
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 1024;
    screenCanvas.height = 768;
    const sCtx = screenCanvas.getContext('2d')!;

    const rivulets: BloodRivulet[] = [];
    for (let i = 0; i < 24; i++) {
      const seed = (i * 0.6180339) % 1;
      const bandX = i < 16
        ? 44 + ((i * 63 + (i % 3) * 21) % 936)
        : 120 + (((i - 16) * 108 + (i % 2) * 34) % 780);
      rivulets.push({
        x: bandX,
        // Pre-seeded throughout [60..760] so crimson blood is immediately visible on boot frame 0!
        y: 95 + seed * 675,
        len: 170 + (i % 5) * 78,
        speed: 28 + (i % 5) * 12,
        width: 5.5 + (i % 4) * 2.2,
        wobblePhase: i * 1.37,
        wobbleFreq: 0.026 + (i % 3) * 0.011,
        alpha: 0.78 + (i % 3) * 0.08,
        forkOffset: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 5),
      });
    }

    const screenTex = track(new THREE.CanvasTexture(screenCanvas));
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.minFilter = THREE.LinearFilter;
    screenTex.magFilter = THREE.LinearFilter;
    screenTex.generateMipmaps = false;
    screenTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // Bulged convex CRT tube screen geometry tucked cleanly into recessed bezel aperture
    const screenGeo = track(new THREE.PlaneGeometry(1.96, 1.46, 36, 28));
    const posAttr = screenGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i) / 0.98;
      const vy = posAttr.getY(i) / 0.73;
      const r2 = Math.min(1.4, vx * vx + vy * vy);
      const bulge = Math.max(0, 1 - r2 * 0.44) * 0.14;
      posAttr.setZ(i, bulge);
    }
    screenGeo.computeVertexNormals();

    // Single-pass circular barrel distortion + readable scanlines + RGB split + glitch slice bursts
    // Includes #include <colorspace_fragment> so linear values output accurately in SRGBColorSpace!
    const crtShaderMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uScreenTex: { value: screenTex },
          uTime: { value: 0 },
          uWarp: { value: propsRef.current.crtWarp ? 1.0 : 0.0 },
          uGlitch: { value: 1.0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPos;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vViewPos = -mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform sampler2D uScreenTex;
          uniform float uTime;
          uniform float uWarp;
          uniform float uGlitch;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPos;

          float hash11(float p) {
            return fract(sin(p * 127.1) * 43758.5453123);
          }

          void main() {
            vec2 centered = vUv * 2.0 - 1.0;
            vec2 uv = vUv;

            // Strong circular barrel distortion filling the bezel aperture with rounded CRT corners
            if (uWarp > 0.5) {
              float r2 = dot(centered, centered);
              vec2 barrel = centered * (0.89 + 0.24 * r2 + 0.09 * r2 * r2);
              uv = barrel * 0.5 + 0.5;
            }

            // Curved CRT tube inner mask (rounded dark rubber bezel transition)
            vec2 q = abs(uv * 2.0 - 1.0) - vec2(0.955, 0.945);
            float tubeMask = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
            if (uv.x < 0.002 || uv.x > 0.998 || uv.y < 0.002 || uv.y > 0.998 || tubeMask > 0.055) {
              gl_FragColor = vec4(0.0005, 0.0007, 0.0009, 1.0);
              #include <colorspace_fragment>
              return;
            }

            // Event-triggered & periodic horizontal glitch slice bursts (clean at rest!)
            float tearOn = step(0.28, uGlitch);
            float burst = smoothstep(0.24, 1.0, uGlitch);
            float sliceBand = floor(uv.y * 28.0);
            float sliceTick = floor(uTime * 16.0);
            float sliceRnd = hash11(sliceTick * 1.73 + sliceBand * 0.41);
            float sliceActive = step(mix(0.95, 0.56, burst), sliceRnd) * tearOn;
            float sliceShift = (hash11(sliceBand + sliceTick * 3.1) - 0.5) * 0.11 * sliceActive * burst;

            // Subtle fine horizontal sync jitter
            float lineBand = floor(uv.y * 130.0);
            float lineActive = step(mix(0.985, 0.78, burst), hash11(floor(uTime * 22.0) + lineBand * 0.19));
            float lineJitter = (hash11(lineBand + uTime * 7.3) - 0.5) * (0.002 + 0.024 * burst) * lineActive;

            vec2 baseUv = vec2(clamp(uv.x + sliceShift + lineJitter, 0.003, 0.997), uv.y);

            // Prominent RGB chromatic aberration on curved glass edges & during glitch bursts
            float radial = dot(centered, centered);
            float chroma = (0.0036 + 0.0052 * radial + 0.020 * sliceActive * burst) * (0.5 + uWarp * 0.5);

            float r = texture2D(uScreenTex, vec2(clamp(baseUv.x + chroma, 0.003, 0.997), baseUv.y)).r;
            float g = texture2D(uScreenTex, baseUv).g;
            float b = texture2D(uScreenTex, vec2(clamp(baseUv.x - chroma, 0.003, 0.997), baseUv.y)).b;
            vec3 col = vec3(r, g, b);

            // Subtle cyan/white phosphor tear highlight only inside active glitch bursts
            float staticGrain = hash11(uv.x * 317.0 + uv.y * 191.0 + uTime * 31.0);
            col += vec3(0.05, 0.07, 0.07) * sliceActive * burst * staticGrain;

            // Crisp readable phosphor raster scanlines
            float scan = 0.75 + 0.25 * sin(uv.y * 230.0 * 3.14159265);
            col *= scan;

            // Curved tube corner edge darkening + Fresnel glass sheen
            float cornerFade = 1.0 - smoothstep(0.0, 0.055, tubeMask);
            float tubeVig = clamp(1.0 - radial * 0.22, 0.36, 1.0) * cornerFade;
            col *= tubeVig;

            vec3 V = normalize(vViewPos);
            float fresnel = pow(max(0.0, 1.0 - max(0.0, dot(vNormal, V))), 2.8);
            col += vec3(0.075, 0.095, 0.105) * fresnel;

            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      })
    );

    const screenMesh = new THREE.Mesh(screenGeo, crtShaderMat);
    screenMesh.position.set(0, 0.02, 0.05);
    crtGroup.add(screenMesh);

    const drawCrtScreen = (dt: number, elapsed: number) => {
      const { mode: curMode, crtWarp: curWarp, audioEnabled: curAudio } =
        propsRef.current;
      const sel = selectedRowRef.current;

      // Dark tinted phosphor glass base (bright enough to contrast clearly against deep casing & crimson blood)
      sCtx.fillStyle = '#0c1316';
      sCtx.fillRect(0, 0, 1024, 768);

      const bgGrad = sCtx.createRadialGradient(512, 370, 80, 512, 384, 620);
      bgGrad.addColorStop(0, 'rgba(34, 60, 64, 0.72)');
      bgGrad.addColorStop(0.65, 'rgba(18, 30, 34, 0.85)');
      bgGrad.addColorStop(1, 'rgba(7, 11, 13, 0.96)');
      sCtx.fillStyle = bgGrad;
      sCtx.fillRect(0, 0, 1024, 768);

      // Subtle CRT perimeter calibration border (visibly curves under circular barrel warp!)
      sCtx.strokeStyle = 'rgba(130, 190, 182, 0.34)';
      sCtx.lineWidth = 3;
      sCtx.strokeRect(30, 28, 964, 712);
      sCtx.strokeStyle = 'rgba(180, 34, 44, 0.32)';
      sCtx.lineWidth = 2;
      sCtx.strokeRect(44, 42, 936, 684);

      // Upper bezel blood seepage pooling down from inside top rim
      const topSeepGrad = sCtx.createLinearGradient(0, 0, 0, 74);
      topSeepGrad.addColorStop(0, 'rgba(175, 14, 24, 0.85)');
      topSeepGrad.addColorStop(0.55, 'rgba(128, 8, 16, 0.45)');
      topSeepGrad.addColorStop(1, 'rgba(80, 4, 10, 0)');
      sCtx.fillStyle = topSeepGrad;
      sCtx.fillRect(0, 0, 1024, 74);

      // LAYER 1: INNER-GLASS FLOWING CRIMSON BLOOD RIVULETS (drawn BEHIND menu text!)
      sCtx.save();
      for (let i = 0; i < rivulets.length; i++) {
        const rv = rivulets[i];
        rv.y += rv.speed * dt;
        if (rv.y - rv.len > 810) {
          rv.y = -20 - (i % 4) * 55;
        }
        const yEnd = rv.y;
        const yStart = rv.y - rv.len;
        if (yEnd < 0 || yStart > 768) continue;

        // Outer dark arterial clot shadow
        const outerGrad = sCtx.createLinearGradient(rv.x, yStart, rv.x, yEnd);
        outerGrad.addColorStop(0, 'rgba(78, 4, 8, 0)');
        outerGrad.addColorStop(0.28, `rgba(116, 8, 16, ${rv.alpha * 0.72})`);
        outerGrad.addColorStop(0.75, `rgba(172, 14, 24, ${rv.alpha * 0.92})`);
        outerGrad.addColorStop(1, `rgba(218, 22, 34, ${Math.min(1, rv.alpha + 0.14)})`);

        sCtx.strokeStyle = outerGrad;
        sCtx.lineWidth = rv.width;
        sCtx.lineCap = 'round';
        sCtx.beginPath();
        const steps = 12;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const py = yStart + (yEnd - yStart) * t;
          const px =
            rv.x +
            Math.sin(py * rv.wobbleFreq + rv.wobblePhase + elapsed * 0.85) * 6.5;
          if (k === 0) sCtx.moveTo(px, py);
          else sCtx.lineTo(px, py);
        }
        sCtx.stroke();

        // Bright inner wet crimson specular vein so blood pops unmistakably on dark glass
        const coreGrad = sCtx.createLinearGradient(rv.x, yStart, rv.x, yEnd);
        coreGrad.addColorStop(0, 'rgba(200, 18, 28, 0)');
        coreGrad.addColorStop(0.5, 'rgba(225, 28, 42, 0.65)');
        coreGrad.addColorStop(1, 'rgba(255, 68, 78, 0.86)');

        sCtx.strokeStyle = coreGrad;
        sCtx.lineWidth = Math.max(2.0, rv.width * 0.36);
        sCtx.beginPath();
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const py = yStart + (yEnd - yStart) * t;
          const px =
            rv.x -
            1.0 +
            Math.sin(py * rv.wobbleFreq + rv.wobblePhase + elapsed * 0.85) * 6.5;
          if (k === 0) sCtx.moveTo(px, py);
          else sCtx.lineTo(px, py);
        }
        sCtx.stroke();

        // Viscous crimson droplet bead at bottom tip of rivulet
        const tipX =
          rv.x +
          Math.sin(yEnd * rv.wobbleFreq + rv.wobblePhase + elapsed * 0.85) * 6.5;
        sCtx.fillStyle = 'rgba(224, 24, 36, 0.96)';
        sCtx.beginPath();
        sCtx.ellipse(tipX, yEnd, rv.width * 0.86, rv.width * 1.18, 0, 0, Math.PI * 2);
        sCtx.fill();
        // Tiny wet glint on droplet bead
        sCtx.fillStyle = 'rgba(255, 155, 160, 0.65)';
        sCtx.beginPath();
        sCtx.arc(tipX - rv.width * 0.24, yEnd - rv.width * 0.28, rv.width * 0.22, 0, Math.PI * 2);
        sCtx.fill();
      }
      sCtx.restore();

      // Subtle translucent dark plate behind text column so typography stays 100% readable over blood
      const panelGrad = sCtx.createRadialGradient(512, 430, 80, 512, 430, 420);
      panelGrad.addColorStop(0, 'rgba(8, 13, 16, 0.42)');
      panelGrad.addColorStop(1, 'rgba(8, 13, 16, 0.08)');
      sCtx.fillStyle = panelGrad;
      sCtx.fillRect(190, 120, 644, 540);

      // LAYER 2: HIGH-CONTRAST PLAIN FUNCTIONAL LABELS (NO invented titles/names!)
      const header = curMode === 'start' ? 'START' : 'PAUSED';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.font = '700 92px "Oxanium", "JetBrains Mono", monospace';
      // Chromatic cyan/crimson phosphor echo + crisp main header
      sCtx.fillStyle = 'rgba(255, 42, 56, 0.48)';
      sCtx.fillText(header, 517, 198);
      sCtx.fillStyle = 'rgba(110, 240, 220, 0.34)';
      sCtx.fillText(header, 507, 194);
      sCtx.fillStyle = '#effcf8';
      sCtx.fillText(header, 512, 196);

      // Crisp horizontal divider bar
      sCtx.fillStyle = 'rgba(176, 224, 218, 0.45)';
      sCtx.fillRect(242, 282, 540, 3);

      // Three plain functional menu rows (NO board-train option!)
      const options = [
        'ENTER WORLD',
        `CRT WARP: ${curWarp ? 'ON' : 'OFF'}`,
        `AUDIO: ${curAudio ? 'ON' : 'OFF'}`,
      ];

      sCtx.font = '700 40px "JetBrains Mono", monospace';
      for (let i = 0; i < options.length; i++) {
        const yCenter = 426 + i * 94;
        const active = i === sel;
        if (active) {
          sCtx.fillStyle = 'rgba(168, 22, 32, 0.62)';
          sCtx.fillRect(232, yCenter - 36, 560, 72);
          sCtx.strokeStyle = 'rgba(255, 86, 94, 0.95)';
          sCtx.lineWidth = 3;
          sCtx.strokeRect(232, yCenter - 36, 560, 72);
          sCtx.fillStyle = 'rgba(255, 70, 82, 0.45)';
          sCtx.fillText(`> ${options[i]} <`, 515, yCenter + 2);
          sCtx.fillStyle = '#ffffff';
          sCtx.fillText(`> ${options[i]} <`, 512, yCenter);
        } else {
          sCtx.fillStyle = 'rgba(10, 16, 18, 0.55)';
          sCtx.fillRect(262, yCenter - 30, 500, 60);
          sCtx.fillStyle = '#c2ded8';
          sCtx.fillText(options[i], 512, yCenter);
        }
      }

      // Plain control guide along bottom of glass
      sCtx.font = '600 22px "JetBrains Mono", monospace';
      sCtx.fillStyle = 'rgba(194, 224, 220, 0.78)';
      sCtx.fillText('W/S SELECT   •   A/D ANGLE   •   ENTER CONFIRM', 512, 694);

      screenTex.needsUpdate = true;
    };

    const activateRow = (rowIdx: number) => {
      if (launchingRef.current) return;
      glitchBurstRef.current = 1.0;
      if (rowIdx === 0) {
        launchingRef.current = true;
        synth.playConfirmStab();
        window.setTimeout(() => {
          propsRef.current.onEnterWorld();
        }, 125);
      } else if (rowIdx === 1) {
        synth.playRelayClick(1.15);
        propsRef.current.onToggleCrtWarp();
      } else if (rowIdx === 2) {
        synth.playRelayClick(0.92);
        propsRef.current.onToggleAudio();
      }
    };

    const selectRow = (nextRow: number) => {
      const clamped = ((nextRow % 3) + 3) % 3;
      if (clamped !== selectedRowRef.current) {
        selectedRowRef.current = clamped;
        // Flip azimuth +/-23 deg on EVERY row transition (including wrap-around 0 <-> 2)
        camSideRef.current = camSideRef.current === 1 ? -1 : 1;
        glitchBurstRef.current = 1.0;
        synth.playRelayClick(1.0 + clamped * 0.06);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      synth.unlock();
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        selectRow(selectedRowRef.current - 1);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        selectRow(selectedRowRef.current + 1);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        if (camSideRef.current !== -1) glitchBurstRef.current = 0.85;
        camSideRef.current = -1;
        synth.playRelayClick(0.82);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        if (camSideRef.current !== 1) glitchBurstRef.current = 0.85;
        camSideRef.current = 1;
        synth.playRelayClick(0.88);
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        activateRow(selectedRowRef.current);
      }
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const pickRowAtPointer = (clientX: number, clientY: number): number => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      ndc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(screenMesh, false);
      if (hits.length === 0 || !hits[0].uv) return -1;
      const topFrac = 1 - hits[0].uv.y;
      for (let i = 0; i < ROW_BANDS.length; i++) {
        if (topFrac >= ROW_BANDS[i][0] && topFrac <= ROW_BANDS[i][1]) {
          return i;
        }
      }
      return -1;
    };

    const onPointerMove = (e: PointerEvent) => {
      const row = pickRowAtPointer(e.clientX, e.clientY);
      if (row >= 0) {
        renderer.domElement.style.cursor = 'pointer';
        selectRow(row);
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      synth.unlock();
      const row = pickRowAtPointer(e.clientX, e.clientY);
      if (row >= 0) {
        selectRow(row);
        activateRow(row);
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Oblique three-quarter row-locking camera (+/- 23 deg = +/- 0.4014257 rad), close relic framing
    const AZIMUTH_RAD = (23 * Math.PI) / 180;
    const CAM_DIST = 2.94;
    let curAzimuth = camSideRef.current * AZIMUTH_RAD;
    let curRowPitch = -0.18;
    let lastTime = performance.now();
    let elapsed = 0;
    let rafId = 0;
    let disposed = false;
    let prevPadButtons: boolean[] = [];
    let padNavCooldown = 0;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          rafId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          rafId = window.setTimeout(cb, 80);
        }
      };
      rafId = window.setTimeout(poll, 5);
    };

    const updateCameraAndUniforms = (rawDt: number, elapsedSec: number) => {
      // Row-locking +/-23 deg azimuth camera with quick responsive settle even at low software-GL FPS
      const targetAz = camSideRef.current * AZIMUTH_RAD;
      curAzimuth += (targetAz - curAzimuth) * (1 - Math.exp(-11.5 * rawDt));

      const targetRowPitch = (selectedRowRef.current - 1) * -0.18;
      curRowPitch += (targetRowPitch - curRowPitch) * (1 - Math.exp(-11.5 * rawDt));

      const camX = Math.sin(curAzimuth) * CAM_DIST;
      const camZ = Math.cos(curAzimuth) * CAM_DIST;
      const camY = 0.08 + curRowPitch + Math.sin(elapsedSec * 0.85) * 0.025;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, curRowPitch * 0.52, -0.02);
      // Slight oblique roll banking toward camera azimuth
      camera.rotateZ(-curAzimuth * 0.055);

      // Decay event glitch burst on wall-clock dt + brief periodic spikes every ~3.6s
      glitchBurstRef.current = Math.max(0, glitchBurstRef.current - rawDt * 2.6);
      const periodicCycle = elapsedSec % 3.6;
      const periodicSpike =
        elapsedSec > 1.2 && periodicCycle < 0.22 ? (1 - periodicCycle / 0.22) * 0.82 : 0;
      crtShaderMat.uniforms.uTime.value = elapsedSec;
      crtShaderMat.uniforms.uWarp.value = propsRef.current.crtWarp ? 1.0 : 0.0;
      crtShaderMat.uniforms.uGlitch.value = Math.max(glitchBurstRef.current, periodicSpike);
      ledMat.emissiveIntensity = 2.6 + Math.sin(elapsedSec * 3.1) * 0.55;
    };

    const animate = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = Math.min(0.25, Math.max(0.001, (now - lastTime) / 1000));
      const dt = Math.min(0.05, rawDt);
      lastTime = now;
      elapsed += rawDt;

      if (padNavCooldown > 0) padNavCooldown = Math.max(0, padNavCooldown - rawDt);
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let pad: Gamepad | null = null;
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i]!.connected) {
          pad = pads[i];
          break;
        }
      }
      if (pad) {
        const ly = pad.axes[1] ?? 0;
        const lx = pad.axes[0] ?? 0;
        const dUp = Boolean(pad.buttons[12]?.pressed);
        const dDown = Boolean(pad.buttons[13]?.pressed);
        const dLeft = Boolean(pad.buttons[14]?.pressed);
        const dRight = Boolean(pad.buttons[15]?.pressed);
        if (padNavCooldown <= 0) {
          if (ly < -0.55 || dUp) {
            selectRow(selectedRowRef.current - 1);
            padNavCooldown = 0.22;
          } else if (ly > 0.55 || dDown) {
            selectRow(selectedRowRef.current + 1);
            padNavCooldown = 0.22;
          } else if (lx < -0.55 || dLeft) {
            camSideRef.current = -1;
            glitchBurstRef.current = 0.85;
            padNavCooldown = 0.22;
          } else if (lx > 0.55 || dRight) {
            camSideRef.current = 1;
            glitchBurstRef.current = 0.85;
            padNavCooldown = 0.22;
          }
        }
        const aCur = Boolean(pad.buttons[0]?.pressed);
        const aPrev = Boolean(prevPadButtons[0]);
        if (aCur && !aPrev) {
          activateRow(selectedRowRef.current);
        }
        prevPadButtons = pad.buttons.map((b) => b.pressed);
      }

      // Floating CRT slow weightless hover bob in the void
      crtGroup.position.y = Math.sin(elapsed * 1.1) * 0.04;
      crtGroup.rotation.x = Math.sin(elapsed * 0.68) * 0.016;
      crtGroup.rotation.z = Math.cos(elapsed * 0.58) * 0.012;
      dustPoints.rotation.y = elapsed * 0.018;

      updateCameraAndUniforms(rawDt, elapsed);
      drawCrtScreen(dt, elapsed);
      renderer.render(scene, camera);
      if (isSwGl) {
        afterDraw(animate);
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    // Position camera and shader uniforms BEFORE initial render so Frame 0 never renders from (0,0,0)
    updateCameraAndUniforms(0, 0);
    drawCrtScreen(0.016, 0);
    if (isSwGl) {
      renderer.render(scene, camera);
      afterDraw(animate);
    } else {
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      synth.dispose();
      synthRef.current = null;
      scene.environment = null;
      for (let i = 0; i < disposables.length; i++) {
        disposables[i].dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#06080b]/92 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'start' ? 'START' : 'PAUSED'}
    >
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
