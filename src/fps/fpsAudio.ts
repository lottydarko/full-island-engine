import { PlayerSoundEventPayload } from '../fps/soundEvents';

/**
 * Self-contained Web Audio procedural foley & firearm synthesizer
 * for Wall-Run Lab (zero external audio file dependencies).
 */
export class FpsAudioSynth {
  private ctx: AudioContext | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private slideGain: GainNode | null = null;
  private slideFilter: BiquadFilterNode | null = null;
  private slideSource: AudioBufferSourceNode | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.ctx && !this.noiseBuf) {
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 1.5, sr);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
      this.noiseBuf = buf;
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopWallSlideLoop();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durSec: number,
    type: OscillatorType,
    gainPeak: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + durSec);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainPeak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);

    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durSec + 0.02);
  }

  private playFilteredNoise(
    durSec: number,
    filterType: BiquadFilterType,
    freq: number,
    q: number,
    gainPeak: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuf) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;

    const flt = ctx.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.setValueAtTime(freq, t0);
    flt.Q.setValueAtTime(q, t0);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gainPeak, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec);

    src.connect(flt);
    flt.connect(g);
    g.connect(ctx.destination);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + durSec + 0.02);
  }

  public startOrUpdateWallSlideLoop(speed01: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuf || this.muted) return;
    if (!this.slideSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;

      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.value = 1100;
      flt.Q.value = 1.6;

      const g = ctx.createGain();
      g.gain.value = 0.001;

      src.connect(flt);
      flt.connect(g);
      g.connect(ctx.destination);
      src.start();

      this.slideSource = src;
      this.slideFilter = flt;
      this.slideGain = g;
    }
    const clamped = Math.max(0.1, Math.min(1.2, speed01));
    if (this.slideFilter) {
      this.slideFilter.frequency.setTargetAtTime(750 + clamped * 1350, ctx.currentTime, 0.06);
    }
    if (this.slideGain) {
      this.slideGain.gain.setTargetAtTime(0.045 + clamped * 0.075, ctx.currentTime, 0.05);
    }
  }

  public stopWallSlideLoop(): void {
    if (this.slideGain && this.ctx) {
      this.slideGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
    }
    if (this.slideSource) {
      const src = this.slideSource;
      this.slideSource = null;
      this.slideFilter = null;
      this.slideGain = null;
      window.setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // ignore
        }
      }, 90);
    }
  }

  public handleSoundEvent(ev: PlayerSoundEventPayload): void {
    if (this.muted) return;

    switch (ev.event) {
      case 'footstep':
        this.playTone(105, 42, 0.065, 'triangle', 0.07 * ev.intensity);
        this.playFilteredNoise(0.05, 'lowpass', 720, 0.8, 0.045 * ev.intensity);
        break;
      case 'wall_step':
        // Snappier vertical boot-slap against concrete/glass
        this.playTone(155, 58, 0.055, 'triangle', 0.085 * ev.intensity);
        this.playFilteredNoise(0.045, 'bandpass', 1400, 1.4, 0.055 * ev.intensity);
        break;
      case 'wall_mount':
        // Palm & boot catch thud
        this.playTone(130, 48, 0.11, 'sine', 0.15);
        this.playFilteredNoise(0.09, 'bandpass', 950, 1.1, 0.11);
        break;
      case 'wall_leap':
        this.playTone(165, 290, 0.12, 'triangle', 0.09);
        this.playFilteredNoise(0.11, 'highpass', 1100, 0.7, 0.08);
        break;
      case 'wall_slide_start':
        this.startOrUpdateWallSlideLoop(ev.intensity);
        break;
      case 'wall_slide_stop':
      case 'wall_dismount':
        this.stopWallSlideLoop();
        break;
      case 'slide_bounce_jump':
        // Dramatic power-bounce launch whoosh + bass spring
        this.stopWallSlideLoop();
        this.playTone(140, 460, 0.19, 'triangle', 0.16);
        this.playTone(95, 52, 0.16, 'sine', 0.16);
        this.playFilteredNoise(0.16, 'bandpass', 1650, 0.9, 0.11);
        break;
      case 'ledge_grab':
        // Two-handed leather glove thump & palm catch against concrete/steel lip
        this.stopWallSlideLoop();
        this.playTone(145, 54, 0.10, 'sine', 0.16);
        this.playFilteredNoise(0.085, 'bandpass', 1100, 1.0, 0.13);
        break;
      case 'ledge_climb':
        // Jacket rustle + boot heave up onto rooftop
        this.playFilteredNoise(0.22, 'bandpass', 780, 0.95, 0.11);
        this.playTone(115, 190, 0.14, 'triangle', 0.085);
        break;
      case 'ledge_drop':
        this.playFilteredNoise(0.08, 'highpass', 950, 0.9, 0.06);
        break;
      case 'arm_climb_rung':
        // Crisp gloved palm & metal/concrete handhold catch during hand-over-hand climb
        this.playTone(170, 74, 0.055, 'triangle', 0.095 * ev.intensity);
        this.playFilteredNoise(0.048, 'bandpass', 1550, 1.3, 0.075 * ev.intensity);
        break;
      case 'wall_run_up':
        // Energetic vertical kick-off scramble onto wall face
        this.playTone(135, 240, 0.11, 'triangle', 0.11 * ev.intensity);
        this.playFilteredNoise(0.085, 'bandpass', 1200, 1.0, 0.09 * ev.intensity);
        break;
      case 'jump':
        this.playTone(125, 210, 0.1, 'sine', 0.08 * ev.intensity);
        this.playFilteredNoise(0.08, 'highpass', 900, 0.8, 0.05);
        break;
      case 'land':
        this.playTone(95, 36, 0.12, 'sine', 0.14 * ev.intensity);
        this.playFilteredNoise(0.09, 'lowpass', 620, 0.9, 0.08 * ev.intensity);
        break;
      case 'slide':
        this.playFilteredNoise(0.28, 'bandpass', 920, 1.3, 0.11);
        break;
      case 'fire': {
        const isShotgun =
          ev.weaponId === 'futuristic' || ev.weaponId === 'rustShotgun';
        const isSmg = ev.weaponId === 'rustSmg' || ev.weaponId === 'retroSmg';
        if (isShotgun) {
          this.playTone(180, 38, 0.22, 'sawtooth', 0.24);
          this.playFilteredNoise(0.25, 'lowpass', 2200, 0.7, 0.26);
        } else if (isSmg) {
          this.playTone(230, 58, 0.09, 'sawtooth', 0.15);
          this.playFilteredNoise(0.1, 'bandpass', 1800, 0.8, 0.18);
        } else {
          this.playTone(260, 62, 0.11, 'triangle', 0.16);
          this.playFilteredNoise(0.12, 'bandpass', 2100, 0.85, 0.18);
        }
        break;
      }
      case 'dry_fire':
        this.playTone(950, 540, 0.03, 'square', 0.045);
        break;
      case 'pump':
        this.playFilteredNoise(0.08, 'bandpass', 2400, 2.2, 0.09);
        this.playTone(240, 140, 0.06, 'square', 0.05);
        break;
      case 'reload_start':
        this.playTone(360, 220, 0.07, 'triangle', 0.06);
        break;
      case 'reload_end':
        this.playTone(420, 680, 0.08, 'triangle', 0.07);
        break;
      case 'swing':
        this.playFilteredNoise(0.14, 'bandpass', 1450, 1.2, 0.1);
        this.playTone(280, 120, 0.11, 'sine', 0.06);
        break;
      case 'blade_hit':
        this.playTone(720, 340, 0.09, 'sawtooth', 0.09);
        break;
      case 'flashlight_on':
      case 'flashlight_off':
        this.playTone(1350, 980, 0.025, 'square', 0.045);
        break;
      case 'weapon_switch':
      case 'weapon_raise':
        this.playFilteredNoise(0.06, 'highpass', 1800, 1.0, 0.045);
        break;
      default:
        break;
    }
  }

  public dispose(): void {
    this.stopWallSlideLoop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
