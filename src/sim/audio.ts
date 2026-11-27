// 100% Procedural Web Audio API Engine, Wet Slush Tire Hiss & Russian Winter Wind Synthesizer

export class DrivingAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private tireGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private muted = false;
  private paused = false;
  private initialized = false;

  public start() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended' && !this.paused) {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted || this.paused ? 0 : 0.28;
      master.connect(ctx.destination);
      this.masterGain = master;

      // 1. Multi-harmonic AWD Boxer/Inline Engine Synthesizer
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 54;

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 27;

      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 240;
      engineFilter.Q.value = 2.6;

      const engineGain = ctx.createGain();
      engineGain.gain.value = 0.22;

      osc1.connect(engineFilter);
      osc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);

      osc1.start();
      osc2.start();
      this.osc1 = osc1;
      this.osc2 = osc2;
      this.engineFilter = engineFilter;
      this.engineGain = engineGain;

      // 2. Shared Filtered White Noise Buffer for Tire Slush/Ice Drift & Winter Rain/Wind
      const bufSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // Tire slush & icy drift friction bed
      const tireNoise = ctx.createBufferSource();
      tireNoise.buffer = noiseBuf;
      tireNoise.loop = true;

      const tireFilter = ctx.createBiquadFilter();
      tireFilter.type = 'bandpass';
      tireFilter.frequency.value = 900;
      tireFilter.Q.value = 1.1;

      const tireGain = ctx.createGain();
      tireGain.gain.value = 0.0;

      tireNoise.connect(tireFilter);
      tireFilter.connect(tireGain);
      tireGain.connect(master);
      tireNoise.start();
      this.tireFilter = tireFilter;
      this.tireGain = tireGain;

      // Cold Russian winter wind & sleet patter ambience
      const windNoise = ctx.createBufferSource();
      windNoise.buffer = noiseBuf;
      windNoise.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 460;

      const windGain = ctx.createGain();
      windGain.gain.value = 0.08;

      windNoise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windNoise.start();
      this.windGain = windGain;

      this.initialized = true;
    } catch {
      // Ignore Web Audio errors on restricted devices
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted || this.paused ? 0 : 0.28,
        this.ctx.currentTime,
        0.05
      );
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted || this.paused ? 0 : 0.28,
        this.ctx.currentTime,
        0.03
      );
      if (paused && this.ctx.state === 'running') {
        void this.ctx.suspend();
      } else if (!paused && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    }
  }

  public update(rpm: number, throttle: number, speedKmh: number, slipRatio: number) {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    const baseFreq = 32 + (rpm / 6800) * 145;
    this.osc1?.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.osc2?.frequency.setTargetAtTime(baseFreq * 0.502, now, 0.04);
    this.engineFilter?.frequency.setTargetAtTime(
      170 + (rpm / 6800) * 620 + throttle * 380,
      now,
      0.05
    );
    this.engineGain?.gain.setTargetAtTime(0.16 + throttle * 0.14, now, 0.06);

    // Wet slush hiss + heightened icy drift scrape
    const speedNorm = Math.min(1, speedKmh / 90);
    const tireVol = speedNorm * 0.11 + slipRatio * 0.24;
    this.tireGain?.gain.setTargetAtTime(tireVol, now, 0.05);
    this.tireFilter?.frequency.setTargetAtTime(
      680 + speedNorm * 900 + slipRatio * 850,
      now,
      0.06
    );

    this.windGain?.gain.setTargetAtTime(0.06 + speedNorm * 0.09, now, 0.1);
  }

  public dispose() {
    try {
      this.osc1?.stop();
      this.osc2?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.initialized = false;
  }

  /** Procedural punchy gunshot transient for shared weapon (carbine) */
  public playGunshot(distanceM = 0) {
    if (this.muted || this.paused) return;
    if (!this.initialized) this.start();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const atten = Math.max(0.04, 1 / (1 + distanceM * 0.085));

      // Sharp crack noise burst
      const len = Math.floor(ctx.sampleRate * 0.14);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.028));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1400 - Math.min(750, distanceM * 14), now);
      bp.Q.value = 0.85;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.45 * atten, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      src.connect(bp);
      bp.connect(g);
      g.connect(this.masterGain);
      src.start(now);

      // Low mechanical thump
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.32 * atten, now);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(og);
      og.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.095);
    } catch {
      // ignore audio glitch
    }
  }
}
