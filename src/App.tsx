/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Car,
  Compass,
  MapPin,
  Minus,
  Navigation,
  Plus,
  TrainFront,
  X,
} from 'lucide-react';
import { DrivingEngine, TelemetrySnapshot } from './sim/DrivingEngine';
import { BUS_STOPS, LANDMARKS, METRO_STATIONS, w2m } from './sim/mapData';
import { CrtMenuMode, CrtMenuOverlay } from './ui/CrtMenuOverlay';

const BLUEPRINT_IMAGE_URL =
  '/assets/aistudio/Gemini_Generated_Image_28lsl228lsl228ls_ce269edc.jpeg';

const MAP_ZOOM_LEVELS = [1.0, 1.4, 2.0, 2.8, 3.8, 5.2];
const DEFAULT_MINIMAP_ZOOM_IDX = 3; // 2.8x smaller default radius
const DEFAULT_EXPANDED_ZOOM_IDX = 2; // 2.0x focused radius when inspecting map

type LegendCategory = 'all' | 'stations' | 'districts' | 'bus' | 'car';

interface MapLegendItem {
  id: string;
  category: Exclude<LegendCategory, 'all'>;
  title: string;
  subtitle: string;
  worldX: number; // meters
  worldZ: number; // meters
  leftPct: number;
  topPct: number;
}

function bpToPct(bpX: number, bpZ: number): { leftPct: number; topPct: number } {
  return {
    leftPct: 3.8 + ((bpX + 1000) / 2000) * 92.4,
    topPct: 8.5 + ((bpZ + 1000) / 2000) * 87.0,
  };
}

function worldToPct(worldX: number, worldZ: number): { leftPct: number; topPct: number } {
  return bpToPct(w2m(worldX), w2m(worldZ));
}

const STATIC_LEGENDS: MapLegendItem[] = [
  ...METRO_STATIONS.map((st) => {
    const pos = worldToPct(st.x, st.z);
    return {
      id: `stn_${st.id}`,
      category: 'stations' as const,
      title: `${st.code} · ${st.name}`,
      subtitle: `${st.district} · ${st.zoneKind}`,
      worldX: st.x,
      worldZ: st.z,
      ...pos,
    };
  }),
  ...LANDMARKS.map((lm) => {
    const pos = worldToPct(lm.x, lm.z);
    return {
      id: `lm_${lm.id}`,
      category: 'districts' as const,
      title: lm.label,
      subtitle: 'District Point',
      worldX: lm.x,
      worldZ: lm.z,
      ...pos,
    };
  }),
  ...BUS_STOPS.map((bs) => {
    const pos = worldToPct(bs.x, bs.z);
    return {
      id: `bus_${bs.id}`,
      category: 'bus' as const,
      title: bs.name,
      subtitle: `Bus Routes ${bs.routes}`,
      worldX: bs.x,
      worldZ: bs.z,
      ...pos,
    };
  }),
];

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DrivingEngine | null>(null);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    speedKmh: 0,
    gear: 'N',
    rpm: 860,
    health: 100,
    surface: 'asphalt',
    district: 'D2 · Central Reliquary & Cathedral Core',
    roadLabel: 'RD-05 · Reliquary Ring Boulevard',
    metroHint: '',
    interactPrompt: '',
    actionToast: '',
    gridPowerOnline: true,
    timeOfDay: 0.5,
    headlights: 'low',
    cameraPreset: 'chase',
    mapX: 0,
    mapZ: 96,
    headingRad: Math.PI * 0.42,
    carMapX: 0,
    carMapZ: 96,
    carHeadingRad: Math.PI * 0.42,
    slipRatio: 0,
    gamepadConnected: false,
    hasDriven: false,
    trainMode: false,
    trainSpeedKmh: 0,
    trainDoorsOpen: false,
    trainNextStation: 'Central Terminal',
    trainCurrentStation: '',
    trainDistToNextM: 0,
    trainSeated: false,
    trainCarIndex: 1,
    trainPassengerCount: 66,
    walkMode: false,
    walkPrompt: '',
    nearCar: false,
    nearOpenTrainDoor: false,
    activeTrafficCount: 92,
    pedestrianCount: 314,
    paused: true,
    carCallActive: false,
    carCallPointerAngleRad: 0,
    carCallDistM: 0,
    carCallBlocked: false,
    npcSubtitle: '',
  });

  const [menuMode, setMenuMode] = useState<CrtMenuMode | null>('start');
  const [crtWarp, setCrtWarp] = useState(true);
  const [muted, setMuted] = useState(false);

  // District banner fades in when entering world or changing districts, then fades out moderately quickly
  const [districtVisible, setDistrictVisible] = useState(false);
  const districtFadeTimerRef = useRef<number | null>(null);
  const prevDistrictRef = useRef<string>('');

  // Map zoom (D-pad Left/Right & +/-) + Interactive Map Legend state
  const [mapExpanded, setMapExpanded] = useState(false);
  const [mapImgFailed, setMapImgFailed] = useState(false);
  const [minimapZoomIdx, setMinimapZoomIdx] = useState(DEFAULT_MINIMAP_ZOOM_IDX);
  const [expandedZoomIdx, setExpandedZoomIdx] = useState(DEFAULT_EXPANDED_ZOOM_IDX);
  const [legendCategory, setLegendCategory] = useState<LegendCategory>('all');
  const [selectedLegendId, setSelectedLegendId] = useState<string | null>(null);
  const [mapFocusPct, setMapFocusPct] = useState<{ leftPct: number; topPct: number }>({
    leftPct: 50,
    topPct: 50,
  });
  const dragPanRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startFocusLeft: number;
    startFocusTop: number;
  } | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);

  const menuModeRef = useRef<CrtMenuMode | null>(menuMode);
  menuModeRef.current = menuMode;
  const mapExpandedRef = useRef(mapExpanded);
  mapExpandedRef.current = mapExpanded;

  const carLegendItem: MapLegendItem = useMemo(() => {
    const pos = bpToPct(telemetry.carMapX, telemetry.carMapZ);
    return {
      id: 'car_player',
      category: 'car',
      title: 'Your Car',
      subtitle: telemetry.walkMode ? 'Parked / En Route' : 'Active Vehicle',
      worldX: telemetry.carMapX * 0.72,
      worldZ: telemetry.carMapZ * 0.72,
      ...pos,
    };
  }, [telemetry.carMapX, telemetry.carMapZ, telemetry.walkMode]);

  const allLegends = useMemo(
    () => [carLegendItem, ...STATIC_LEGENDS],
    [carLegendItem]
  );

  const visibleLegends = useMemo(() => {
    if (legendCategory === 'all') return allLegends;
    return allLegends.filter((item) => item.category === legendCategory);
  }, [allLegends, legendCategory]);

  const selectedLegend = useMemo(
    () => allLegends.find((item) => item.id === selectedLegendId) ?? null,
    [allLegends, selectedLegendId]
  );

  const visibleLegendsRef = useRef(visibleLegends);
  visibleLegendsRef.current = visibleLegends;
  const selectedLegendIdRef = useRef(selectedLegendId);
  selectedLegendIdRef.current = selectedLegendId;

  const selectLegendItem = (item: MapLegendItem) => {
    setSelectedLegendId(item.id);
    setMapFocusPct({ leftPct: item.leftPct, topPct: item.topPct });
    setExpandedZoomIdx((idx) => Math.max(idx, 2)); // zoom into at least 2.0x to frame legend clearly
  };

  const stepLegendSelection = (delta: number) => {
    const list = visibleLegendsRef.current;
    if (list.length === 0) return;
    const curIdx = list.findIndex((x) => x.id === selectedLegendIdRef.current);
    const nextIdx =
      curIdx < 0
        ? delta > 0
          ? 0
          : list.length - 1
        : (curIdx + delta + list.length) % list.length;
    selectLegendItem(list[nextIdx]);
  };

  const stepZoom = (delta: number) => {
    if (mapExpandedRef.current) {
      setExpandedZoomIdx((idx) =>
        Math.max(0, Math.min(MAP_ZOOM_LEVELS.length - 1, idx + delta))
      );
    } else {
      setMinimapZoomIdx((idx) =>
        Math.max(0, Math.min(MAP_ZOOM_LEVELS.length - 1, idx + delta))
      );
    }
  };

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const engine = new DrivingEngine(
      el,
      (snap) => setTelemetry(snap),
      () => {
        if (menuModeRef.current === null) {
          setMapExpanded((prev) => !prev);
        }
      }
    );
    engine.setMapCallbacks({
      onZoomDelta: (delta) => stepZoom(delta),
      onLegendNav: (delta) => stepLegendSelection(delta),
      isExpanded: () => mapExpandedRef.current,
    });
    engine.setPaused(menuModeRef.current !== null);
    engineRef.current = engine;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (mapExpandedRef.current) {
          setMapExpanded(false);
        } else if (menuModeRef.current === null) {
          setMenuMode('paused');
        } else if (menuModeRef.current === 'paused') {
          setMenuMode(null);
        }
        return;
      }
      if (menuModeRef.current !== null) return;
      if (e.code === 'KeyM') {
        setMapExpanded((prev) => !prev);
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'BracketRight') {
        stepZoom(1);
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'BracketLeft') {
        stepZoom(-1);
      } else if (mapExpandedRef.current && (e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
        e.preventDefault();
        stepLegendSelection(e.code === 'ArrowDown' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(menuMode !== null);
  }, [menuMode]);

  // Center expanded map cleanly around player when first opened
  useEffect(() => {
    if (mapExpanded) {
      if (!selectedLegendIdRef.current) {
        setMapFocusPct(bpToPct(telemetry.mapX, telemetry.mapZ));
      }
    }
  }, [mapExpanded]);

  // Show district name on world entry or district change, then fade out moderately quickly (~2.2s)
  useEffect(() => {
    if (menuMode !== null) {
      setDistrictVisible(false);
      if (districtFadeTimerRef.current !== null) {
        window.clearTimeout(districtFadeTimerRef.current);
        districtFadeTimerRef.current = null;
      }
      return;
    }

    const districtChanged = telemetry.district !== prevDistrictRef.current;
    if (districtChanged || prevDistrictRef.current === '') {
      prevDistrictRef.current = telemetry.district;
    }
    setDistrictVisible(true);
    if (districtFadeTimerRef.current !== null) {
      window.clearTimeout(districtFadeTimerRef.current);
    }
    districtFadeTimerRef.current = window.setTimeout(() => {
      setDistrictVisible(false);
    }, 2200);

    return () => {
      if (districtFadeTimerRef.current !== null) {
        window.clearTimeout(districtFadeTimerRef.current);
        districtFadeTimerRef.current = null;
      }
    };
  }, [telemetry.district, menuMode]);

  // Re-trigger district badge momentarily right as player resumes from START/PAUSED menu
  useEffect(() => {
    if (menuMode === null) {
      setDistrictVisible(true);
      if (districtFadeTimerRef.current !== null) {
        window.clearTimeout(districtFadeTimerRef.current);
      }
      districtFadeTimerRef.current = window.setTimeout(() => {
        setDistrictVisible(false);
      }, 2200);
    }
  }, [menuMode]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.setMuted(next);
  };

  const playerPct = bpToPct(telemetry.mapX, telemetry.mapZ);
  const carPct = bpToPct(telemetry.carMapX, telemetry.carMapZ);
  const markerDeg = (-telemetry.headingRad * 180) / Math.PI;

  const minimapZoom = MAP_ZOOM_LEVELS[minimapZoomIdx];
  const minimapTxPct = 50 - minimapZoom * playerPct.leftPct;
  const minimapTyPct = 50 - minimapZoom * playerPct.topPct;

  const expandedZoom = MAP_ZOOM_LEVELS[expandedZoomIdx];
  const expandedTxPct = 50 - expandedZoom * mapFocusPct.leftPct;
  const expandedTyPct = 50 - expandedZoom * mapFocusPct.topPct;

  const rpmPct = telemetry.trainMode
    ? Math.min(100, Math.max(4, (Math.abs(telemetry.trainSpeedKmh) / 145) * 100))
    : telemetry.walkMode
    ? Math.min(100, Math.max(6, (telemetry.speedKmh / 30) * 100))
    : Math.min(100, Math.max(8, ((telemetry.rpm - 700) / 6900) * 100));

  const playerWorldX = telemetry.mapX * 0.72;
  const playerWorldZ = telemetry.mapZ * 0.72;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04070e]">
      {/* Dedicated Isolated Full-Viewport WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* TOP-LEFT: District Only — appears on entry/change and fades out moderately quickly */}
      {!menuMode && (
        <div
          className={`pointer-events-none fixed top-5 left-6 z-10 transition-opacity duration-700 ${
            districtVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="text-sm font-semibold tracking-wide text-slate-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)]">
            {telemetry.trainMode
              ? telemetry.trainCurrentStation || telemetry.district
              : telemetry.district}
          </div>
        </div>
      )}

      {/* ON-SCREEN DIRECTIONAL CAR POINTER WHILE CAR PULLS UP */}
      {!menuMode && telemetry.walkMode && telemetry.carCallActive && (
        <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-3.5 py-1.5 rounded bg-slate-950/85 border border-amber-400/55 shadow-lg backdrop-blur-sm">
          <div
            className="w-5 h-5 flex items-center justify-center"
            style={{
              transform: `rotate(${(telemetry.carCallPointerAngleRad * 180) / Math.PI}deg)`,
            }}
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4">
              <polygon points="8,1 14,14 8,11 2,14" fill="#fbbf24" />
            </svg>
          </div>
          <span className="text-xs font-mono-hud tracking-wide text-amber-200">
            CAR · {telemetry.carCallDistM}m{telemetry.carCallBlocked ? ' · NEAREST CURB' : ''}
          </span>
        </div>
      )}

      {/* TRANSIENT NPC SUBTITLE / INTERACTION / TOAST */}
      {!menuMode && (telemetry.interactPrompt || telemetry.actionToast || telemetry.npcSubtitle) && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
          {telemetry.npcSubtitle && (
            <div className="bg-black/80 border border-white/15 px-3.5 py-1.5 text-xs italic tracking-wide text-slate-100 shadow-lg backdrop-blur-sm">
              “{telemetry.npcSubtitle}”
            </div>
          )}
          {telemetry.interactPrompt && (
            <div className="bg-slate-950/85 border border-amber-400/60 px-4 py-2 text-xs font-mono-hud tracking-wide text-amber-200 shadow-lg backdrop-blur-sm">
              {telemetry.interactPrompt}
            </div>
          )}
          {telemetry.actionToast && (
            <div className="bg-slate-950/90 border border-cyan-400/55 px-4 py-2 text-xs font-medium tracking-wide text-cyan-100 shadow-lg backdrop-blur-sm">
              {telemetry.actionToast}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM-LEFT: Zoomable Smaller-Radius Minimap + On-Foot Call Car Button */}
      {!menuMode && (
        <div className="fixed bottom-5 left-5 z-10 flex flex-col items-start gap-2">
          {telemetry.walkMode && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => engineRef.current?.callCar()}
                className="px-3 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-lg transition-colors"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Call Car</span>
              </button>
              {telemetry.nearCar && (
                <button
                  type="button"
                  onClick={() => engineRef.current?.enterCar()}
                  className="px-3 py-1.5 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-lg transition-colors"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Enter Car</span>
                </button>
              )}
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            onClick={() => setMapExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMapExpanded(true);
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              stepZoom(e.deltaY < 0 ? 1 : -1);
            }}
            aria-label="Open Island Blueprint Map"
            className="relative group w-48 h-28 rounded-lg overflow-hidden border border-white/20 bg-[#070d15]/95 shadow-xl cursor-pointer transition-transform duration-150 hover:border-sky-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {/* Player-centered zoomed map canvas */}
            <div
              className="absolute inset-0 origin-top-left transition-transform duration-150 ease-out"
              style={{
                transform: `translate(${minimapTxPct}%, ${minimapTyPct}%) scale(${minimapZoom})`,
              }}
            >
              {!mapImgFailed ? (
                <img
                  src={BLUEPRINT_IMAGE_URL}
                  alt="Island Map"
                  referrerPolicy="no-referrer"
                  onError={() => setMapImgFailed(true)}
                  className="w-full h-full object-fill opacity-85 select-none pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
                  <Compass className="w-5 h-5" />
                </div>
              )}

              {/* Train station pins */}
              {METRO_STATIONS.map((st) => {
                const pos = worldToPct(st.x, st.z);
                return (
                  <div
                    key={st.id}
                    className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-950 pointer-events-none"
                    style={{
                      left: `${pos.leftPct}%`,
                      top: `${pos.topPct}%`,
                      transform: `translate(-50%, -50%) scale(${1 / minimapZoom})`,
                    }}
                  />
                );
              })}

              {/* Car marker when outside vehicle */}
              {(telemetry.walkMode || telemetry.trainMode) && (
                <div
                  className="absolute w-2.5 h-2.5 rounded-sm bg-amber-400 border border-slate-950 pointer-events-none"
                  style={{
                    left: `${carPct.leftPct}%`,
                    top: `${carPct.topPct}%`,
                    transform: `translate(-50%, -50%) scale(${1 / minimapZoom})`,
                  }}
                />
              )}

              {/* Active selected legend target ring */}
              {selectedLegend && (
                <div
                  className="absolute w-4 h-4 rounded-full border-2 border-amber-300 bg-amber-400/25 pointer-events-none"
                  style={{
                    left: `${selectedLegend.leftPct}%`,
                    top: `${selectedLegend.topPct}%`,
                    transform: `translate(-50%, -50%) scale(${1 / minimapZoom})`,
                  }}
                />
              )}

              {/* Player heading marker */}
              <div
                className="absolute w-4 h-4 pointer-events-none"
                style={{
                  left: `${playerPct.leftPct}%`,
                  top: `${playerPct.topPct}%`,
                  transform: `translate(-50%, -50%) scale(${1 / minimapZoom}) rotate(${markerDeg}deg)`,
                }}
              >
                <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-[0_0_4px_rgba(0,0,0,0.95)]">
                  <polygon
                    points="8,1 14,14 8,11 2,14"
                    fill={telemetry.trainMode ? '#22d3ee' : '#38bdf8'}
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>
            </div>

            {/* Subtle zoom controls & zoom badge */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-75 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                aria-label="Zoom out map"
                onClick={(e) => {
                  e.stopPropagation();
                  stepZoom(-1);
                }}
                className="w-5 h-5 rounded bg-black/75 hover:bg-black text-slate-200 flex items-center justify-center border border-white/10"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                aria-label="Zoom in map"
                onClick={(e) => {
                  e.stopPropagation();
                  stepZoom(1);
                }}
                className="w-5 h-5 rounded bg-black/75 hover:bg-black text-slate-200 flex items-center justify-center border border-white/10"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="pointer-events-none absolute bottom-1 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono-hud text-slate-300">
              {minimapZoom.toFixed(1)}×
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT: Minimal Speedometer Only */}
      {!menuMode && (
        <div className="pointer-events-none fixed bottom-5 right-6 z-10 flex flex-col items-end">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-mono-hud text-5xl font-semibold tracking-tight text-slate-50 leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {telemetry.trainMode ? Math.abs(telemetry.trainSpeedKmh) : telemetry.speedKmh}
            </span>
            <span className="text-[11px] font-mono-hud text-slate-400 uppercase tracking-wider">
              km/h
            </span>
          </div>
          <div className="mt-2 w-36 h-1 bg-white/15 rounded-full overflow-hidden">
            <div
              className={`h-full transition-[width] duration-75 ${
                telemetry.trainMode
                  ? 'bg-cyan-400'
                  : telemetry.walkMode
                  ? 'bg-emerald-400'
                  : rpmPct > 86
                  ? 'bg-red-500'
                  : 'bg-slate-100'
              }`}
              style={{ width: `${rpmPct}%` }}
            />
          </div>
        </div>
      )}

      {/* EXPANDED INTERACTIVE MAP & LEGEND SELECTOR */}
      {mapExpanded && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4 md:p-6"
          onClick={() => setMapExpanded(false)}
        >
          <div
            className="relative max-w-6xl w-full rounded-xl overflow-hidden border border-white/15 bg-[#090f17] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#070c12]">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-100">Map</span>
                {selectedLegend && (
                  <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-xs text-amber-200 font-mono-hud">
                    {selectedLegend.title} ·{' '}
                    {Math.round(
                      Math.hypot(
                        selectedLegend.worldX - playerWorldX,
                        selectedLegend.worldZ - playerWorldZ
                      )
                    )}
                    m
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stepZoom(-1)}
                  aria-label="Zoom out"
                  className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-slate-200 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono-hud text-slate-300 w-10 text-center">
                  {expandedZoom.toFixed(1)}×
                </span>
                <button
                  type="button"
                  onClick={() => stepZoom(1)}
                  aria-label="Zoom in"
                  className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-slate-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMapFocusPct(playerPct);
                  }}
                  title="Center on Player"
                  className="ml-1 px-2 py-1 rounded bg-white/5 hover:bg-white/15 text-xs text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapExpanded(false)}
                  aria-label="Close Map"
                  className="ml-1 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body: Zoomable/Pannable Map + Selectable Legend Drawer */}
            <div className="flex flex-col lg:flex-row">
              <div
                ref={mapViewportRef}
                onWheel={(e) => {
                  e.preventDefault();
                  stepZoom(e.deltaY < 0 ? 1 : -1);
                }}
                onPointerDown={(e) => {
                  dragPanRef.current = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    startFocusLeft: mapFocusPct.leftPct,
                    startFocusTop: mapFocusPct.topPct,
                  };
                }}
                onPointerMove={(e) => {
                  const drag = dragPanRef.current;
                  const box = mapViewportRef.current;
                  if (!drag?.active || !box) return;
                  const dxPct = ((e.clientX - drag.startX) / Math.max(1, box.clientWidth)) * (100 / expandedZoom);
                  const dyPct = ((e.clientY - drag.startY) / Math.max(1, box.clientHeight)) * (100 / expandedZoom);
                  setMapFocusPct({
                    leftPct: Math.max(-20, Math.min(220, drag.startFocusLeft - dxPct)),
                    topPct: Math.max(-20, Math.min(130, drag.startFocusTop - dyPct)),
                  });
                }}
                onPointerUp={() => {
                  if (dragPanRef.current) dragPanRef.current.active = false;
                }}
                onPointerLeave={() => {
                  if (dragPanRef.current) dragPanRef.current.active = false;
                }}
                className="relative flex-1 aspect-[16/9] bg-[#060b12] overflow-hidden cursor-grab active:cursor-grabbing select-none"
              >
                <div
                  className="absolute inset-0 origin-top-left transition-transform duration-150 ease-out"
                  style={{
                    transform: `translate(${expandedTxPct}%, ${expandedTyPct}%) scale(${expandedZoom})`,
                  }}
                >
                  <img
                    src={BLUEPRINT_IMAGE_URL}
                    alt="Island Map"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-fill select-none pointer-events-none"
                  />

                  {/* Interactive clickable legend pins */}
                  {visibleLegends.map((item) => {
                    const isSelected = item.id === selectedLegendId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectLegendItem(item);
                        }}
                        title={item.title}
                        className="absolute flex items-center justify-center focus:outline-none"
                        style={{
                          left: `${item.leftPct}%`,
                          top: `${item.topPct}%`,
                          transform: `translate(-50%, -50%) scale(${1 / expandedZoom})`,
                          zIndex: isSelected ? 20 : item.category === 'stations' ? 12 : 8,
                        }}
                      >
                        <span
                          className={`flex items-center justify-center rounded-full border shadow-md transition-transform ${
                            isSelected
                              ? 'w-7 h-7 bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/45 scale-110'
                              : item.category === 'stations'
                              ? 'w-5 h-5 bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 border-white/80'
                              : item.category === 'car'
                              ? 'w-5 h-5 bg-amber-500 text-slate-950 border-white/90'
                              : item.category === 'districts'
                              ? 'w-4 h-4 bg-emerald-400/90 hover:bg-emerald-300 text-slate-950 border-slate-950'
                              : 'w-2.5 h-2.5 bg-slate-300/80 hover:bg-white border-slate-950'
                          }`}
                        >
                          {item.category === 'stations' ? (
                            <TrainFront className="w-3 h-3" />
                          ) : item.category === 'car' ? (
                            <Car className="w-3 h-3" />
                          ) : item.category === 'districts' ? (
                            <MapPin className="w-2.5 h-2.5" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}

                  {/* Player Arrow */}
                  <div
                    className="absolute w-6 h-6 pointer-events-none z-30"
                    style={{
                      left: `${playerPct.leftPct}%`,
                      top: `${playerPct.topPct}%`,
                      transform: `translate(-50%, -50%) scale(${1 / expandedZoom}) rotate(${markerDeg}deg)`,
                    }}
                  >
                    <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-[0_0_6px_rgba(0,0,0,0.95)]">
                      <polygon
                        points="8,1 14,14 8,11 2,14"
                        fill={telemetry.trainMode ? '#22d3ee' : '#38bdf8'}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Sidebar: Scrollable Legend Selector */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#080d14] flex flex-col max-h-64 lg:max-h-[540px]">
                <div className="p-2.5 border-b border-white/10 flex flex-wrap gap-1.5">
                  {(
                    [
                      ['all', 'All'],
                      ['stations', 'Train Stations'],
                      ['districts', 'Districts'],
                      ['bus', 'Bus Stops'],
                      ['car', 'Car'],
                    ] as [LegendCategory, string][]
                  ).map(([cat, label]) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLegendCategory(cat)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                        legendCategory === cat
                          ? 'bg-sky-400 text-slate-950'
                          : 'bg-white/5 hover:bg-white/15 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  {visibleLegends.map((item) => {
                    const active = item.id === selectedLegendId;
                    const distM = Math.round(
                      Math.hypot(item.worldX - playerWorldX, item.worldZ - playerWorldZ)
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectLegendItem(item)}
                        className={`w-full text-left px-2.5 py-2 rounded-md border transition-colors flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-amber-400/15 border-amber-400/60 text-amber-100'
                            : 'bg-white/[0.03] hover:bg-white/10 border-transparent text-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{item.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                        </div>
                        <span className="text-[11px] font-mono-hud text-slate-400 shrink-0">
                          {distM}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D FLOATING CRT MENU (START ON BOOT, PAUSED ON ESC) */}
      {menuMode !== null && (
        <CrtMenuOverlay
          mode={menuMode}
          crtWarp={crtWarp}
          audioEnabled={!muted}
          onEnterWorld={() => setMenuMode(null)}
          onToggleCrtWarp={() => setCrtWarp((w) => !w)}
          onToggleAudio={toggleMute}
        />
      )}
    </div>
  );
}
