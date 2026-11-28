import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
} from 'lucide-react';
import {
  BehaviorLabBench,
  BehaviorLabSnapshot,
  BenchCameraPreset,
  BenchTimeOfDay,
} from '../sim/behaviorLabBench';
import {
  getVignetteById,
  PHASE1_VIGNETTES,
  VignetteId,
} from '../sim/behaviorVignettes';

interface BehaviorLabProps {
  onOpenDrivingWorld: () => void;
}

const SPEED_OPTIONS = [0.5, 1.0, 1.5] as const;

export const BehaviorLab: React.FC<BehaviorLabProps> = ({ onOpenDrivingWorld }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const benchRef = useRef<BehaviorLabBench | null>(null);

  const [snap, setSnap] = useState<BehaviorLabSnapshot>({
    vignetteId: 'hold_up',
    variantId: 'comply',
    timeSec: 0,
    durationSec: 12.0,
    playing: true,
    speed: 1.0,
    timeOfDay: 'night',
    cameraPreset: 'two_shot',
    beat: {
      name: '01 · Opportunity Approach',
      description: 'Loading staged scene...',
    },
    actors: [],
    contextLost: false,
  });

  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const bench = new BehaviorLabBench(el, (next) => {
      setSnap(next);
    });
    benchRef.current = bench;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setSnap((cur) => {
          bench.setPlaying(!cur.playing);
          return cur;
        });
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        bench.replay();
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        setSnap((cur) => {
          const nextTod: BenchTimeOfDay = cur.timeOfDay === 'night' ? 'day' : 'night';
          bench.setTimeOfDay(nextTod);
          return cur;
        });
      } else if (e.key >= '1' && e.key <= String(PHASE1_VIGNETTES.length)) {
        const idx = Number(e.key) - 1;
        const v = PHASE1_VIGNETTES[idx];
        if (v) {
          bench.loadVignette(v.id);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      bench.dispose();
      benchRef.current = null;
    };
  }, []);

  const activeDef = getVignetteById(snap.vignetteId);
  const activeVariant =
    activeDef.variants.find((v) => v.id === snap.variantId) ?? activeDef.variants[0];

  const selectVignette = (id: VignetteId) => {
    benchRef.current?.loadVignette(id);
  };

  const selectVariant = (variantId: string) => {
    benchRef.current?.setVariant(variantId);
  };

  const togglePlay = () => {
    if (!benchRef.current) return;
    if (!snap.playing && snap.timeSec >= snap.durationSec - 0.05) {
      benchRef.current.replay();
    } else {
      benchRef.current.setPlaying(!snap.playing);
    }
  };

  const toggleDayNight = () => {
    const next: BenchTimeOfDay = snap.timeOfDay === 'night' ? 'day' : 'night';
    benchRef.current?.setTimeOfDay(next);
  };

  const selectCamera = (preset: BenchCameraPreset) => {
    benchRef.current?.applyCameraPreset(preset);
  };

  const blackout = snap.beat.blackoutOpacity ?? 0;
  const hoodOverlay = snap.beat.hoodOverlayOpacity ?? 0;

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0c1118] text-slate-100 overflow-hidden select-none">
      {/* TOP BAR CONTRACT: 3 zones separated by gap-6..gap-8 */}
      <header className="flex items-center justify-between gap-6 xl:gap-8 px-5 xl:px-6 py-3 border-b border-white/10 bg-[#0d131c] shrink-0 z-20">
        {/* Zone 1: Single text element wordmark */}
        <span className="font-display text-base font-semibold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
          Kaluga Behavior Lab
        </span>

        {/* Zone 2: 9 clean single-line vignette navigation buttons */}
        <nav
          aria-label="Phase 1 Vignettes"
          className="flex items-center gap-2.5 xl:gap-4 overflow-x-auto"
        >
          {PHASE1_VIGNETTES.map((vig, idx) => {
            const active = vig.id === snap.vignetteId;
            return (
              <button
                key={vig.id}
                type="button"
                onClick={() => selectVignette(vig.id)}
                className={`py-1 text-[12px] xl:text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
                  active
                    ? 'text-amber-300 border-amber-400'
                    : 'text-slate-400 border-transparent hover:text-slate-100'
                }`}
              >
                {`${idx + 1}. ${vig.title}`}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenDrivingWorld}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-slate-100 hover:bg-white rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Open Driving World
          </button>
        </div>
      </header>

      {/* FULL-BLEED 3D STAGE */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div
          ref={mountRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* WebGL Context Lost Fallback */}
        {snap.contextLost && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b1016]/95 p-6">
            <div className="max-w-md border border-white/15 bg-[#121923] p-6 rounded-lg text-center">
              <p className="text-base font-semibold text-slate-100">
                Graphics context interrupted
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Waiting for the WebGL viewport to restore or reload the bench stage.
              </p>
            </div>
          </div>
        )}

        {/* Bag-Over-Head Coarse Hood Overlay (dims periphery while letting victim glimpse van interior) */}
        {hoodOverlay > 0.01 && (
          <div
            className="pointer-events-none absolute inset-0 z-14 transition-opacity duration-150"
            style={{
              opacity: hoodOverlay,
              background:
                'radial-gradient(ellipse at center, rgba(12,14,18,0.16) 24%, rgba(6,7,10,0.88) 68%, rgba(2,3,5,0.98) 100%)',
            }}
          />
        )}

        {/* Kidnap Loading Blackout Hook Preview (The Tap & Van Snatch Climax) */}
        {blackout > 0.01 && (
          <div
            className="pointer-events-none absolute inset-0 z-15 flex items-center justify-center bg-black transition-opacity duration-150"
            style={{ opacity: blackout }}
          >
            {blackout > 0.5 && (
              <div className="text-center px-6">
                <p className="font-display text-lg font-semibold tracking-wide text-slate-100">
                  Kidnap Loading Hook Fired
                </p>
                <p className="mt-1.5 text-sm text-slate-400">
                  Bag over head · Cut to black · Forced interrogation scene loads behind blackout
                </p>
              </div>
            )}
          </div>
        )}

        {/* Projected Semantic Actor Labels */}
        {showLabels && !snap.contextLost && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            {snap.actors.map((actor) => {
              if (!actor.visible) return null;
              return (
                <div
                  key={actor.id}
                  className="absolute -translate-x-1/2 -translate-y-full pb-2"
                  style={{
                    left: `${actor.xPct}%`,
                    top: `${actor.yPct}%`,
                  }}
                >
                  <div className="px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/15 text-center shadow-md">
                    <div className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                      {actor.label}
                    </div>
                    <div className="text-[11px] font-mono-hud text-slate-300 whitespace-nowrap">
                      {actor.archetypeLabel}
                      {actor.weaponLabel !== 'Unarmed'
                        ? ` · ${actor.weaponLabel} (${actor.gripLabel})`
                        : ''}
                      {` · ${actor.gunState}`}
                      {actor.interaction !== 'none' ? ` · ${actor.interaction}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Top-Left Scene & Beat Readout */}
        <div className="pointer-events-none absolute top-4 left-5 z-10 max-w-md bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{activeDef.title}</span>
            <span aria-hidden="true">·</span>
            <span>{activeVariant.label}</span>
            <span aria-hidden="true">·</span>
            <span>{snap.timeOfDay === 'day' ? 'Daylight' : 'Night'}</span>
          </div>
          <h1 className="mt-1 text-base font-semibold text-slate-50 leading-snug">
            {snap.beat.name}
          </h1>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            {snap.beat.description}
          </p>
          <p className="mt-2 text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
            {activeDef.instigationNote}
          </p>
        </div>

        {/* Bottom-Center Spoken Dialogue Beat */}
        {snap.beat.line && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 z-20 max-w-xl px-4">
            <div className="bg-black/75 backdrop-blur-sm border border-white/15 rounded-lg px-4 py-2.5 text-center shadow-lg">
              {snap.beat.speaker && (
                <div className="text-[11px] font-medium text-amber-300">
                  {snap.beat.speaker}
                </div>
              )}
              <div className="mt-0.5 text-sm text-slate-100">
                “{snap.beat.line}”
              </div>
            </div>
          </div>
        )}

        {/* Bottom Bench Control Dock */}
        <div className="absolute bottom-4 left-5 right-5 z-20 flex flex-col gap-2.5 bg-[#0d131c]/90 backdrop-blur-md border border-white/12 rounded-lg px-4 py-3 shadow-xl">
          {/* Row 1: Variations + Staging Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Variation Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1 whitespace-nowrap shrink-0">
                Outcome
              </span>
              {activeDef.variants.map((variant) => {
                const selected = variant.id === snap.variantId;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => selectVariant(variant.id)}
                    title={variant.summary}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      selected
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {variant.label}
                  </button>
                );
              })}
            </div>

            {/* Day/Night, Camera Presets, Labels */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-white/5 rounded p-0.5">
                {(['wide', 'two_shot', 'close', 'first_person'] as BenchCameraPreset[]).map((preset) => {
                  const active = snap.cameraPreset === preset;
                  const label =
                    preset === 'wide'
                      ? 'Wide'
                      : preset === 'two_shot'
                      ? 'Two-Shot'
                      : preset === 'close'
                      ? 'Close'
                      : '1st Person';
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => selectCamera(preset)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                        active
                          ? 'bg-slate-200 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {preset === 'wide' && <Camera className="w-3 h-3" />}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={toggleDayNight}
                className="px-3 py-1.5 rounded bg-white/8 hover:bg-white/15 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {snap.timeOfDay === 'night' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-amber-300" />
                    <span>Night</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                    <span>Day</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowLabels((v) => !v)}
                className="px-3 py-1.5 rounded bg-white/8 hover:bg-white/15 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {showLabels ? (
                  <Eye className="w-3.5 h-3.5 text-slate-300" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Labels</span>
              </button>
            </div>
          </div>

          {/* Row 2: Transport + Timeline Scrubber + Speed */}
          <div className="flex items-center gap-3 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={togglePlay}
              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              {snap.playing ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => benchRef.current?.replay()}
              className="px-3 py-1.5 rounded bg-white/8 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>

            <input
              type="range"
              min={0}
              max={snap.durationSec}
              step={0.05}
              value={snap.timeSec}
              aria-label="Vignette timeline"
              onChange={(e) => benchRef.current?.scrubTo(Number(e.target.value))}
              className="sim-slider flex-1 cursor-pointer"
            />

            <span className="font-mono-hud text-xs text-slate-300 tabular-nums whitespace-nowrap shrink-0 w-24 text-right">
              {snap.timeSec.toFixed(1)}s / {snap.durationSec.toFixed(1)}s
            </span>

            <div className="flex items-center bg-white/5 rounded p-0.5 shrink-0">
              {SPEED_OPTIONS.map((sp) => {
                const active = Math.abs(snap.speed - sp) < 0.01;
                return (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => benchRef.current?.setSpeed(sp)}
                    className={`px-2 py-1 rounded text-xs font-mono-hud tabular-nums transition-colors ${
                      active
                        ? 'bg-slate-200 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {sp}×
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
