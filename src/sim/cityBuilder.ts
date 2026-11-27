import * as THREE from 'three';
import {
  BILLBOARD_SITES,
  BUILDINGS,
  BuildingSpec,
  CollisionWorld,
  getRoadElevationAt,
  getTerrainHeight,
  isInCrosswalkClearance,
  isNearAnyRoad,
  isNearMetroTrack,
  m2w,
  mulberry32,
  ROADS,
  RoadSegment,
  ROUNDABOUT_RADIUS,
  SECONDARY_ROUNDABOUTS,
  signedLandDistance,
  Vec2,
  VenueKind,
} from './mapData';
import { TextureLibrary } from './textures';
import {
  ArchipelagoCallbacks,
  InteriorRegistry,
} from './interiors/interiorRegistry';
import { buildSector4WoodlandsAndMountains } from './islands/sector4_WoodlandsAndMountains';
import { buildIsland2GridPrisonAndGhettos } from './islands/island2_GridPrisonAndGhettos';
import { buildIsland3StargatePeninsula } from './islands/island3_StargatePeninsula';
import { buildIsland4ElysiaAndHarbor } from './islands/island4_ElysiaAndHarbor';

export interface CityHandles {
  root: THREE.Group;
  radarDish: THREE.Object3D;
  beaconLights: THREE.MeshStandardMaterial[];
  streetLampBulbsMat: THREE.MeshStandardMaterial;
  streetLightPositions: THREE.Vector3[];
  pooledStreetLights: THREE.PointLight[];
  oceanMat: THREE.MeshPhysicalMaterial;
  setPowerGridEnabled: (enabled: boolean) => void;
  update: (
    dt: number,
    elapsed: number,
    carPos: THREE.Vector3,
    nightFactor: number
  ) => void;
}

// Create crisp, luminous futuristic Neon Signboard textures for Casinos, Arcades, Computer Libraries & Nightlife
function createNeonSignMaterial(
  venue: VenueKind,
  variant: number,
  neonMats: THREE.MeshStandardMaterial[]
): THREE.MeshStandardMaterial {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  const specs: Record<
    Exclude<VenueKind, 'none'>,
    { bg: string; border: string; text: string; sub: string; glow: string }[]
  > = {
    casino: [
      {
        bg: '#1c0814',
        border: '#ff2e88',
        text: 'КАЗИНО · РОЯЛЬ',
        sub: 'CASINO GRAND 24/7',
        glow: '#ff4da6',
      },
      {
        bg: '#1c1205',
        border: '#ffb824',
        text: 'CASINO · ЗВЕЗДА',
        sub: 'VIP JACKPOT LOUNGE',
        glow: '#ffcc4d',
      },
    ],
    arcade: [
      {
        bg: '#081224',
        border: '#00e5ff',
        text: 'CYBER ARCADE',
        sub: 'АРКАДА · ИГРЫ 24/7',
        glow: '#38f2ff',
      },
      {
        bg: '#170a28',
        border: '#c084fc',
        text: 'НЕОН АРКАДА',
        sub: 'RETRO · VR · PINBALL',
        glow: '#d8b4fe',
      },
    ],
    computer_library: [
      {
        bg: '#061824',
        border: '#38bdf8',
        text: 'COMPUTER LIBRARY',
        sub: 'КИБЕР-БИБЛИОТЕКА · NET',
        glow: '#7dd3fc',
      },
      {
        bg: '#061c18',
        border: '#10b981',
        text: 'НЕЙРО-АРХИВ 24/7',
        sub: 'DATA TERMINAL · CAFE',
        glow: '#34d399',
      },
    ],
    nightlife: [
      {
        bg: '#1c0818',
        border: '#f43f5e',
        text: 'КЛУБ · СЕВЕР',
        sub: 'NEON LOUNGE · BAR',
        glow: '#fb7185',
      },
      {
        bg: '#0c1026',
        border: '#60a5fa',
        text: 'НЕОН БАР · 24/7',
        sub: 'NIGHTLIFE DISTRICT 1',
        glow: '#93c5fd',
      },
    ],
    pharmacy: [
      {
        bg: '#061a12',
        border: '#10b981',
        text: '+ АПТЕКА 24/7',
        sub: 'ПРОДУКТЫ · СЕРВИС',
        glow: '#34d399',
      },
    ],
  };

  const list = specs[venue === 'none' ? 'nightlife' : venue];
  const pick = list[variant % list.length];

  ctx.fillStyle = pick.bg;
  ctx.fillRect(0, 0, 512, 128);

  // Double neon tube border
  ctx.strokeStyle = pick.border;
  ctx.lineWidth = 7;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, 488, 104);

  // Luminous typography
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = pick.glow;
  ctx.shadowBlur = 14;
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pick.text, 256, 66);

  ctx.shadowBlur = 8;
  ctx.fillStyle = pick.glow;
  ctx.font = 'bold 20px monospace';
  ctx.fillText(pick.sub, 256, 102);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });
  neonMats.push(mat);
  return mat;
}

// 16 Vector-Illustrated Russian Futuristic & Soviet Retrofuturistic Billboards!
function createRussianBillboardMaterial(
  variant: number,
  neonMats: THREE.MeshStandardMaterial[]
): THREE.MeshStandardMaterial {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  type ArtKind =
    | 'rocket'
    | 'cosmonaut'
    | 'hovercar'
    | 'skyline'
    | 'cybereye'
    | 'sputnik'
    | 'monorail'
    | 'helix'
    | 'constructivist'
    | 'radio'
    | 'arcade'
    | 'casino'
    | 'cafe'
    | 'polar'
    | 'crane'
    | 'terminal';

  const ads: {
    bg1: string;
    bg2: string;
    border: string;
    accent: string;
    title: string;
    sub: string;
    tag: string;
    art: ArtKind;
    retro?: boolean;
  }[] = [
    { bg1: '#140812', bg2: '#35101a', border: '#ff4848', accent: '#ffd27d', title: 'КОСМОС · 2084', sub: 'МЕЖПЛАНЕТНЫЕ РЕЙСЫ «ЗАРЯ»', tag: 'РЕТРО-БУДУЩЕЕ', art: 'rocket', retro: true },
    { bg1: '#051424', bg2: '#0b2c4a', border: '#00e5ff', accent: '#80f3ff', title: 'КИБЕР-АРКАДА', sub: 'НЕОН ГОЛОГРАММЫ · VR АРЕНА', tag: 'ОТКРЫТО 24/7', art: 'arcade' },
    { bg1: '#171008', bg2: '#341e0c', border: '#f5a623', accent: '#ffe19c', title: 'АЭРО-АВТО «ВОЛГА»', sub: 'ТУРБО-ПРИВОД НОВОГО ВЕКА', tag: 'ТЕСТ-ДРАЙВ', art: 'hovercar', retro: true },
    { bg1: '#0b0820', bg2: '#221044', border: '#c084fc', accent: '#f0abfc', title: 'НЕЙРО-ЗРЕНИЕ', sub: 'ОПТИКА БУДУЩЕГО · СЕКТОР 1', tag: 'КЛИНИКА 2090', art: 'cybereye' },
    { bg1: '#1a0a0a', bg2: '#381210', border: '#ef4444', accent: '#fcd34d', title: 'ВПЕРЁД К ЗВЁЗДАМ!', sub: 'ОРБИТАЛЬНАЯ СТАНЦИЯ «МИР-9»', tag: 'СССР-ФУТУРО', art: 'cosmonaut', retro: true },
    { bg1: '#081124', bg2: '#13244a', border: '#38bdf8', accent: '#bae6fd', title: 'МАГЛЕВ КОЛЬЦО', sub: 'АВТОПИЛОТ ВОКРУГ ОСТРОВА', tag: 'ЛИНИЯ М1', art: 'monorail' },
    { bg1: '#150616', bg2: '#320b28', border: '#ff2e88', accent: '#ff8cc2', title: 'КАЗИНО «ЗВЕЗДА»', sub: 'НЕОН ДЖЕКПОТ · ВХОД 18+', tag: 'ВИП ЗАЛ', art: 'casino' },
    { bg1: '#071b16', bg2: '#0e3328', border: '#10b981', accent: '#6ee7b7', title: 'БИО-АПТЕКА «ЛУЧ»', sub: 'ГЕННАЯ ТЕРАПИЯ И ВИТАМИНЫ', tag: 'МЕД-СЕКТОР', art: 'helix' },
    { bg1: '#18100a', bg2: '#321b0f', border: '#f97316', accent: '#fed7aa', title: 'ЭНЕРГИЯ АТОМА', sub: 'СВЕТ В КАЖДЫЙ КВАРТАЛ!', tag: 'ПЛАКАТ 1978', art: 'constructivist', retro: true },
    { bg1: '#110a24', bg2: '#26144a', border: '#a855f7', accent: '#e9d5ff', title: 'РАДИО КРОНСК FM', sub: 'НОЧНОЙ СИНТВЕЙВ · 104.8', tag: 'ПРЯМОЙ ЭФИР', art: 'radio' },
    { bg1: '#061322', bg2: '#102840', border: '#22d3ee', accent: '#a5f3fc', title: 'СПУТНИК-СВЯЗЬ', sub: 'КВАНТОВЫЙ ИНТЕРНЕТ СЕТИ', tag: 'ОРБИТА', art: 'sputnik', retro: true },
    { bg1: '#140b1c', bg2: '#2c1438', border: '#f43f5e', accent: '#fda4af', title: 'НОЧНОЙ МЕГАПОЛИС', sub: 'НЕОНОВЫЕ КВАРТАЛЫ ОСТРОВА', tag: 'СЕКТОР 01', art: 'skyline' },
    { bg1: '#1c1108', bg2: '#331e0e', border: '#fb923c', accent: '#fde68a', title: 'АВТО-КАФЕ «ОРБИТА»', sub: 'ГОРЯЧИЙ КОФЕ И ПЕЛЬМЕНИ', tag: 'У ДОРОГИ 24Ч', art: 'cafe', retro: true },
    { bg1: '#081826', bg2: '#12314c', border: '#60a5fa', accent: '#bfdbfe', title: 'ОТЕЛЬ «ПОЛЯРНАЯ»', sub: 'ПАНОРАМНЫЕ ЛЮКСЫ У ЗАЛИВА', tag: 'БРОНЬ 24/7', art: 'polar' },
    { bg1: '#1c0c0a', bg2: '#341612', border: '#f59e0b', accent: '#fde047', title: 'ПОРТ-ЛОГИСТИКА', sub: 'АВТОНОМНЫЕ ДОКИ СЕКТОРА 4', tag: 'ГРУЗ-ЭКСПРЕСС', art: 'crane' },
    { bg1: '#061c1d', bg2: '#0c3438', border: '#2dd4bf', accent: '#99f6e4', title: 'НЕЙРО-БИБЛИОТЕКА', sub: 'АРХИВ ЗНАНИЙ И ТЕРМИНАЛЫ', tag: 'ДОСТУП 24Ч', art: 'terminal' },
  ];
  const ad = ads[variant % ads.length];

  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, ad.bg1);
  grad.addColorStop(1, ad.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle retro halftone rays OR futuristic horizon grid background
  if (ad.retro) {
    ctx.save();
    ctx.translate(104, 134);
    for (let r = 0; r < 14; r++) {
      const a = (r / 14) * Math.PI * 2;
      ctx.fillStyle = r % 2 === 0 ? 'rgba(255,215,130,0.065)' : 'rgba(255,70,50,0.04)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 440, a, a + 0.22);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1.5;
    for (let y = 152; y < 256; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    for (let x = -120; x < 640; x += 44) {
      ctx.beginPath();
      ctx.moveTo(256 + (x - 256) * 0.22, 152);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
  }

  // Left-side custom vector futuristic / retrofuturistic illustration panel (x: 26..176, y: 26..230)
  ctx.save();
  ctx.beginPath();
  ctx.rect(24, 24, 146, 208);
  ctx.clip();
  ctx.fillStyle = 'rgba(6, 10, 18, 0.48)';
  ctx.fillRect(24, 24, 146, 208);

  const cx = 97;
  const cy = 128;

  if (ad.art === 'rocket') {
    // Saturn ring planet + ascending retro Soviet silver rocket
    ctx.strokeStyle = ad.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx + 12, cy - 36, 48, 12, -0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d9483b';
    ctx.beginPath();
    ctx.arc(cx + 12, cy - 36, 22, 0, Math.PI * 2);
    ctx.fill();
    // Rocket flame
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy + 54);
    ctx.lineTo(cx - 50, cy + 92);
    ctx.lineTo(cx - 10, cy + 66);
    ctx.fill();
    // Rocket hull
    ctx.save();
    ctx.translate(cx - 4, cy + 12);
    ctx.rotate(0.55);
    ctx.fillStyle = '#e5eef8';
    ctx.beginPath();
    ctx.moveTo(0, -56);
    ctx.quadraticCurveTo(18, -14, 14, 42);
    ctx.lineTo(-14, 42);
    ctx.quadraticCurveTo(-18, -14, 0, -56);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -56);
    ctx.lineTo(10, -28);
    ctx.lineTo(-10, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, -4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (ad.art === 'cosmonaut') {
    // Retrofuturistic Soviet Cosmonaut Helmet with golden star visor reflection
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
    // Gold reflective visor
    const vg = ctx.createLinearGradient(cx - 32, cy - 26, cx + 32, cy + 20);
    vg.addColorStop(0, '#0f172a');
    vg.addColorStop(0.5, '#fbbf24');
    vg.addColorStop(1, '#dc2626');
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, 32, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    // Red stripe + star on helmet crown
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(cx - 26, cy - 38, 52, 8);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', cx, cy - 28);
  } else if (ad.art === 'hovercar') {
    // Retrofuturistic chrome hover-sedan floating over neon road beams
    ctx.strokeStyle = ad.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 44, 58, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy + 16);
    ctx.quadraticCurveTo(cx - 38, cy - 28, cx + 8, cy - 26);
    ctx.quadraticCurveTo(cx + 46, cy - 24, cx + 60, cy + 14);
    ctx.lineTo(cx + 52, cy + 28);
    ctx.lineTo(cx - 52, cy + 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.ellipse(cx - 30, cy + 28, 15, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 30, cy + 28, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx - 28, cy + 2);
    ctx.lineTo(cx - 10, cy - 18);
    ctx.lineTo(cx + 24, cy - 16);
    ctx.lineTo(cx + 36, cy + 2);
    ctx.closePath();
    ctx.fill();
  } else if (ad.art === 'cybereye') {
    // Futuristic glowing holographic cyber-eye
    ctx.strokeStyle = ad.border;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 58, cy);
    ctx.quadraticCurveTo(cx, cy - 48, cx + 58, cy);
    ctx.quadraticCurveTo(cx, cy + 48, cx - 58, cy);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f0abfc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0.3, 5.2);
    ctx.stroke();
    ctx.fillStyle = '#0b0820';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (ad.art === 'monorail') {
    // Sleek futuristic maglev nose over glowing viaduct arch
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(26, cy + 52);
    ctx.quadraticCurveTo(cx, cy + 12, 170, cy + 24);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(32, cy + 36);
    ctx.lineTo(132, cy - 22);
    ctx.quadraticCurveTo(156, cy - 18, 150, cy + 12);
    ctx.lineTo(42, cy + 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(72, cy - 2, 58, 10);
  } else if (ad.art === 'helix') {
    // Glowing bio-pharmacy double helix
    for (let y = -68; y <= 68; y += 12) {
      const a = y * 0.065;
      const x1 = cx + Math.sin(a) * 34;
      const x2 = cx - Math.sin(a) * 34;
      ctx.strokeStyle = 'rgba(110, 231, 183, 0.55)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, cy + y);
      ctx.lineTo(x2, cy + y);
      ctx.stroke();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x1, cy + y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x2, cy + y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (ad.art === 'constructivist') {
    // Soviet Constructivist Atomic Orbitals & Geometric Red Star
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 3;
    for (let r = 0; r < 3; r++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((r * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 56, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', cx, cy + 9);
  } else if (ad.art === 'sputnik') {
    // Retro Sputnik satellite with 4 swept antennas
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3;
    for (const dy of [-28, -10, 10, 28]) {
      ctx.beginPath();
      ctx.moveTo(cx + 12, cy);
      ctx.lineTo(cx - 56, cy + dy * 1.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx + 18, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(cx + 10, cy - 6, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (ad.art === 'radio') {
    // Retro-synth Shukhov radio broadcast tower + concentric waves
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    for (let r = 16; r <= 48; r += 16) {
      ctx.beginPath();
      ctx.arc(cx, cy - 42, r, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 42);
    ctx.lineTo(cx - 32, cy + 72);
    ctx.moveTo(cx, cy - 42);
    ctx.lineTo(cx + 32, cy + 72);
    ctx.moveTo(cx - 22, cy + 28);
    ctx.lineTo(cx + 22, cy + 28);
    ctx.moveTo(cx - 14, cy - 4);
    ctx.lineTo(cx + 14, cy - 4);
    ctx.stroke();
  } else if (ad.art === 'skyline' || ad.art === 'polar') {
    // Futuristic Synthwave Neon Sun + Spire Skyline
    const sg = ctx.createLinearGradient(cx, cy - 52, cx, cy + 16);
    sg.addColorStop(0, ad.accent);
    sg.addColorStop(1, ad.border);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(cx, cy - 12, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#090d18';
    const bars = [
      [-52, 12, 22, 74],
      [-26, -18, 20, 104],
      [-2, -40, 24, 126],
      [26, -6, 22, 92],
    ];
    for (const [bx, by, bw, bh] of bars) {
      ctx.fillRect(cx + bx, cy + by, bw, bh);
      ctx.fillStyle = ad.accent;
      for (let wy = by + 8; wy < by + bh - 12; wy += 12) {
        ctx.fillRect(cx + bx + 4, cy + wy, bw - 8, 4);
      }
      ctx.fillStyle = '#090d18';
    }
  } else if (ad.art === 'casino') {
    // Glowing Neon Faceted Diamond + Orbit Ring
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 54);
    ctx.lineTo(cx + 46, cy - 10);
    ctx.lineTo(cx, cy + 56);
    ctx.lineTo(cx - 46, cy - 10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,46,136,0.28)';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 46, cy - 10);
    ctx.lineTo(cx + 46, cy - 10);
    ctx.moveTo(cx, cy - 54);
    ctx.lineTo(cx, cy + 56);
    ctx.stroke();
  } else if (ad.art === 'arcade') {
    // Glowing Neon Arcade Joystick + Cyber Visor Grid
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(cx - 42, cy + 28, 84, 24);
    ctx.strokeStyle = '#7ceeff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 28);
    ctx.lineTo(cx, cy - 22);
    ctx.stroke();
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.arc(cx, cy - 28, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(cx + 26, cy + 24, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (ad.art === 'cafe') {
    // Steaming Retro Cosmic Coffee Cup & Saucer
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 3.5;
    for (const sx of [-18, 0, 18]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx, cy - 14);
      ctx.quadraticCurveTo(cx + sx + 10, cy - 34, cx + sx - 4, cy - 54);
      ctx.stroke();
    }
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 34, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(cx - 44, cy + 40, 88, 7);
  } else if (ad.art === 'crane') {
    // Industrial Port Gantry Crane & Glowing Cargo Pod
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy + 68);
    ctx.lineTo(cx - 24, cy - 42);
    ctx.lineTo(cx + 52, cy - 42);
    ctx.moveTo(cx + 22, cy - 42);
    ctx.lineTo(cx + 22, cy + 16);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx + 2, cy + 16, 40, 26);
  } else {
    // Cyber Terminal Hologram Screen & Code Lines
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - 46, cy - 42, 92, 68);
    ctx.fillStyle = '#99f6e4';
    for (let ly = -28; ly <= 12; ly += 12) {
      ctx.fillRect(cx - 36, cy + ly, 42 + ((ly * 13) & 31), 5);
    }
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(cx - 28, cy + 36, 56, 8);
  }
  ctx.restore();

  // Illustration frame divider
  ctx.strokeStyle = ad.border;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 146, 208);

  // Outer Luminous Frame
  ctx.strokeStyle = ad.border;
  ctx.lineWidth = 9;
  ctx.strokeRect(7, 7, 498, 242);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(16, 16, 480, 224);

  // Right-side Russian Cyrillic Typography Panel (x: 184..486)
  ctx.fillStyle = ad.border;
  ctx.fillRect(190, 32, 166, 28);
  ctx.fillStyle = '#080c12';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(ad.tag, 200, 51);

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = ad.border;
  ctx.shadowBlur = 14;
  ctx.font = 'bold 31px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(ad.title, 190, 126, 296);

  ctx.shadowBlur = 5;
  ctx.fillStyle = ad.accent;
  ctx.font = 'bold 17px monospace';
  ctx.fillText(ad.sub, 190, 174, 296);

  // Subtle decorative tech footer bar
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(190, 204, 284, 3);
  ctx.fillStyle = ad.border;
  ctx.fillRect(190, 204, 92, 3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    emissiveMap: tex,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 1.28,
    roughness: 0.28,
  });
  neonMats.push(mat);
  return mat;
}

// Extrude a ribbon strip along a polyline following smooth terrain/bridge elevation grades!
function createRoadRibbonGeometry(
  rawPoints: Vec2[],
  width: number,
  yOffset: number,
  uvRepeatMeters = 14
): THREE.BufferGeometry {
  // Subdivide any long segment (> 18m) in the archipelago region so bridge arches & mountain passes curve smoothly!
  const points: Vec2[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    const cur = rawPoints[i];
    points.push(cur);
    if (i < rawPoints.length - 1) {
      const nxt = rawPoints[i + 1];
      const segLen = Math.hypot(nxt.x - cur.x, nxt.z - cur.z);
      if (segLen > 18 && (cur.x > 480 || nxt.x > 480)) {
        const steps = Math.min(28, Math.ceil(segLen / 14));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          points.push({
            x: cur.x + (nxt.x - cur.x) * t,
            z: cur.z + (nxt.z - cur.z) * t,
          });
        }
      }
    }
  }

  const halfW = width * 0.5;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let accumDist = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      accumDist += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    }

    let tx = 0;
    let tz = 0;
    if (i === 0) {
      tx = points[1].x - p.x;
      tz = points[1].z - p.z;
    } else if (i === points.length - 1) {
      tx = p.x - points[i - 1].x;
      tz = p.z - points[i - 1].z;
    } else {
      const dx1 = p.x - points[i - 1].x;
      const dz1 = p.z - points[i - 1].z;
      const l1 = Math.hypot(dx1, dz1) + 1e-6;
      const dx2 = points[i + 1].x - p.x;
      const dz2 = points[i + 1].z - p.z;
      const l2 = Math.hypot(dx2, dz2) + 1e-6;
      tx = dx1 / l1 + dx2 / l2;
      tz = dz1 / l1 + dz2 / l2;
    }
    const tLen = Math.hypot(tx, tz) + 1e-6;
    tx /= tLen;
    tz /= tLen;

    const rx = -tz;
    const rz = tx;
    const lx = p.x - rx * halfW;
    const lz = p.z - rz * halfW;
    const rpx = p.x + rx * halfW;
    const rpz = p.z + rz * halfW;
    const centerElev = getRoadElevationAt(p.x, p.z);

    positions.push(lx, centerElev + yOffset, lz);
    positions.push(rpx, centerElev + yOffset, rpz);

    const v = accumDist / uvRepeatMeters;
    uvs.push(0, v, 1, v);

    if (i < points.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a continuous raised concrete sidewalk slab + vertical granite curb lip on one side of a road,
 * skipping quads inside intersection/crosswalk clearances so cross-streets stay cleanly unobstructed.
 */
function createRaisedSidewalkGeometry(
  rawPoints: Vec2[],
  roadWidth: number,
  yTopOffset: number,
  yCurbBottom: number,
  walkWidth: number,
  side: -1 | 1,
  uvRepeatMeters = 10
): THREE.BufferGeometry {
  const points: Vec2[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    const cur = rawPoints[i];
    if (i > 0) {
      const prev = rawPoints[i - 1];
      const segLen = Math.hypot(cur.x - prev.x, cur.z - prev.z);
      if (segLen > 12) {
        const steps = Math.ceil(segLen / 10);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          points.push({
            x: prev.x + (cur.x - prev.x) * t,
            z: prev.z + (cur.z - prev.z) * t,
          });
        }
      }
    }
    points.push(cur);
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const innerOff = roadWidth * 0.5 + 0.12;
  const outerOff = innerOff + walkWidth;
  let accumDist = 0;

  const pushVert = (x: number, y: number, z: number, u: number, v: number) => {
    positions.push(x, y, z);
    uvs.push(u, v);
  };

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.4) continue;

    const nx = (-dz / len) * side;
    const nz = (dx / len) * side;

    const midCenterOff = (innerOff + outerOff) * 0.5;
    const mx = (p0.x + p1.x) * 0.5 + nx * midCenterOff;
    const mz = (p0.z + p1.z) * 0.5 + nz * midCenterOff;
    if (isInCrosswalkClearance(mx, mz, 2.2)) {
      accumDist += len;
      continue;
    }

    const elev0 = getRoadElevationAt(p0.x, p0.z);
    const elev1 = getRoadElevationAt(p1.x, p1.z);
    const yTop0 = elev0 + yTopOffset;
    const yBot0 = elev0 + yCurbBottom;
    const yTop1 = elev1 + yTopOffset;
    const yBot1 = elev1 + yCurbBottom;

    const v0 = accumDist / uvRepeatMeters;
    const v1 = (accumDist + len) / uvRepeatMeters;
    accumDist += len;

    const ix0 = p0.x + nx * innerOff;
    const iz0 = p0.z + nz * innerOff;
    const ox0 = p0.x + nx * outerOff;
    const oz0 = p0.z + nz * outerOff;

    const ix1 = p1.x + nx * innerOff;
    const iz1 = p1.z + nz * innerOff;
    const ox1 = p1.x + nx * outerOff;
    const oz1 = p1.z + nz * outerOff;

    // 1. Vertical curb lip facing road (4 verts)
    const cBase = positions.length / 3;
    pushVert(ix0, yBot0, iz0, 0, v0);
    pushVert(ix0, yTop0, iz0, 0.1, v0);
    pushVert(ix1, yBot1, iz1, 0, v1);
    pushVert(ix1, yTop1, iz1, 0.1, v1);
    if (side > 0) {
      indices.push(cBase, cBase + 2, cBase + 1, cBase + 1, cBase + 2, cBase + 3);
    } else {
      indices.push(cBase, cBase + 1, cBase + 2, cBase + 1, cBase + 3, cBase + 2);
    }

    // 2. Top raised concrete walkway slab (4 verts)
    const tBase = positions.length / 3;
    pushVert(ix0, yTop0, iz0, 0, v0);
    pushVert(ox0, yTop0, oz0, 1, v0);
    pushVert(ix1, yTop1, iz1, 0, v1);
    pushVert(ox1, yTop1, oz1, 1, v1);
    if (side > 0) {
      indices.push(tBase, tBase + 2, tBase + 1, tBase + 1, tBase + 2, tBase + 3);
    } else {
      indices.push(tBase, tBase + 1, tBase + 2, tBase + 1, tBase + 3, tBase + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Ornate Russian Orthodox Onion-Dome Cathedral
function createOrthodoxCathedral(
  scale: number,
  textures: TextureLibrary,
  isCentralReliquary: boolean
): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.cathedralWallMap,
    roughness: 0.78,
    metalness: 0.08,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    color: '#9aa0a6',
    roughness: 0.85,
  });
  const roofSnowMat = new THREE.MeshStandardMaterial({
    color: '#20262e',
    roughness: 0.55,
    metalness: 0.25,
  });
  const goldDomeMat = new THREE.MeshStandardMaterial({
    map: textures.cathedralDomeGoldMap,
    color: '#f0c456',
    roughness: 0.24,
    metalness: 0.86,
    envMapIntensity: 1.5,
  });
  const blueDomeMat = new THREE.MeshStandardMaterial({
    map: textures.cathedralDomeBlueMap,
    color: '#34588a',
    roughness: 0.32,
    metalness: 0.55,
    envMapIntensity: 1.35,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: '#ffdfaa',
    emissive: new THREE.Color('#ffaa44'),
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  const baseRadius = (isCentralReliquary ? 24 : 13) * scale;
  const plinth1 = new THREE.Mesh(
    new THREE.CylinderGeometry(baseRadius, baseRadius * 1.08, 1.4 * scale, 8),
    plinthMat
  );
  plinth1.position.y = 0.7 * scale;
  plinth1.receiveShadow = true;
  group.add(plinth1);

  const naveW = (isCentralReliquary ? 20 : 12) * scale;
  const naveH = (isCentralReliquary ? 15 : 10) * scale;
  const nave1 = new THREE.Mesh(new THREE.BoxGeometry(naveW, naveH, naveW * 0.65), stoneMat);
  nave1.position.y = 1.4 * scale + naveH * 0.5;
  nave1.castShadow = true;
  nave1.receiveShadow = true;
  group.add(nave1);

  const nave2 = new THREE.Mesh(new THREE.BoxGeometry(naveW * 0.65, naveH, naveW), stoneMat);
  nave2.position.y = 1.4 * scale + naveH * 0.5;
  nave2.castShadow = true;
  nave2.receiveShadow = true;
  group.add(nave2);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(naveW * 0.96, 0.8 * scale, naveW * 0.96),
    roofSnowMat
  );
  roof.position.y = 1.4 * scale + naveH + 0.4 * scale;
  group.add(roof);

  const domePoints: THREE.Vector2[] = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.72, 0.12),
    new THREE.Vector2(1.06, 0.48),
    new THREE.Vector2(0.96, 0.92),
    new THREE.Vector2(0.55, 1.32),
    new THREE.Vector2(0.22, 1.62),
    new THREE.Vector2(0.05, 1.98),
    new THREE.Vector2(0.01, 2.25),
  ];
  const onionGeo = new THREE.LatheGeometry(domePoints, 18);

  const addTower = (
    tx: number,
    tz: number,
    drumR: number,
    drumH: number,
    domeScale: number,
    useGold: boolean
  ) => {
    const baseY = 1.4 * scale + naveH;
    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(drumR, drumR * 1.05, drumH, 12),
      stoneMat
    );
    drum.position.set(tx, baseY + drumH * 0.5, tz);
    drum.castShadow = true;
    group.add(drum);

    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(drumR * 0.94, drumR * 0.94, drumH * 0.25, 12),
      warmGlowMat
    );
    lantern.position.set(tx, baseY + drumH * 0.65, tz);
    group.add(lantern);

    const dome = new THREE.Mesh(onionGeo, useGold ? goldDomeMat : blueDomeMat);
    dome.scale.setScalar(domeScale);
    dome.position.set(tx, baseY + drumH - 0.2 * scale, tz);
    dome.castShadow = true;
    group.add(dome);

    const crossBaseY = baseY + drumH + domeScale * 2.22;
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 3.2 * scale, 6),
      goldDomeMat
    );
    spire.position.set(tx, crossBaseY + 1.5 * scale, tz);
    group.add(spire);
    const crossBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4 * scale, 0.14 * scale, 0.14 * scale),
      goldDomeMat
    );
    crossBar.position.set(tx, crossBaseY + 2.1 * scale, tz);
    group.add(crossBar);
  };

  addTower(
    0,
    0,
    (isCentralReliquary ? 5.2 : 3.2) * scale,
    (isCentralReliquary ? 11.5 : 7) * scale,
    (isCentralReliquary ? 5.4 : 3.2) * scale,
    true
  );

  const off = (isCentralReliquary ? 7.6 : 4.2) * scale;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addTower(
        sx * off,
        sz * off,
        (isCentralReliquary ? 2.8 : 1.8) * scale,
        (isCentralReliquary ? 7.2 : 4.5) * scale,
        (isCentralReliquary ? 3.0 : 1.9) * scale,
        !isCentralReliquary
      );
    }
  }

  return group;
}

// Build a single detailed textured urban building with varied rooflines, futuristic neon accents, and Casino/Arcade/Computer Library marquees
function createBuildingMesh(
  spec: BuildingSpec,
  textures: TextureLibrary,
  rng: () => number,
  neonSignPool: Record<Exclude<VenueKind, 'none'>, THREE.MeshStandardMaterial[]>,
  neonTubeCache: Map<string, THREE.MeshStandardMaterial>,
  neonAnimatedMats: THREE.MeshStandardMaterial[]
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  group.rotation.y = spec.rotY;

  const mats = textures.buildingMaterials[spec.style];

  const mainGeo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
  const uv = mainGeo.attributes.uv;
  const repeatY = Math.max(1, Math.round(spec.h / 10));
  const repeatX = Math.max(1, Math.round(Math.max(spec.w, spec.d) / 13));
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * repeatX, uv.getY(i) * repeatY);
  }

  const mainMesh = new THREE.Mesh(mainGeo, [
    mats.side,
    mats.side,
    mats.roof,
    mats.roof,
    mats.side,
    mats.side,
  ]);
  mainMesh.position.y = spec.h * 0.5;
  mainMesh.castShadow = spec.h > 16;
  mainMesh.receiveShadow = true;
  group.add(mainMesh);

  const parapetMat = new THREE.MeshStandardMaterial({
    color: spec.style.startsWith('commercial') ? '#9e9585' : '#656c74',
    roughness: 0.85,
  });

  // Architectural Roofline Diversity (Flat, Mansard Historic Russian Roof, Gabled Industrial, or Futuristic Stepped Spire!)
  if (spec.roofKind === 'mansard') {
    const mansardMat = new THREE.MeshStandardMaterial({
      color: rng() > 0.5 ? '#354844' : '#3a424c', // classic copper-patina or slate-iron St. Petersburg roof
      roughness: 0.62,
      metalness: 0.35,
    });
    const mansard = new THREE.Mesh(
      new THREE.CylinderGeometry(
        Math.min(spec.w, spec.d) * 0.52,
        Math.min(spec.w, spec.d) * 0.72,
        2.6,
        4
      ),
      mansardMat
    );
    mansard.rotation.y = Math.PI * 0.25;
    mansard.scale.set(
      spec.w / Math.min(spec.w, spec.d),
      1,
      spec.d / Math.min(spec.w, spec.d)
    );
    mansard.position.y = spec.h + 1.3;
    group.add(mansard);
  } else if (spec.roofKind === 'gabled') {
    const gableMat = new THREE.MeshStandardMaterial({
      color: '#525b63',
      roughness: 0.72,
      metalness: 0.4,
    });
    const ridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, spec.d * 0.58, spec.w, 3),
      gableMat
    );
    ridge.rotation.z = Math.PI * 0.5;
    ridge.position.y = spec.h + spec.d * 0.16;
    group.add(ridge);
  } else if (spec.roofKind === 'spire') {
    // Stepped Neo-Futuristic / Stalinist Skyscraper Crown + Glowing Antenna Spire!
    const tier1 = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w * 0.74, 4.2, spec.d * 0.74),
      mats.side
    );
    tier1.position.y = spec.h + 2.1;
    group.add(tier1);

    const tier2 = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w * 0.44, 3.8, spec.d * 0.44),
      parapetMat
    );
    tier2.position.y = spec.h + 6.1;
    group.add(tier2);

    const spireMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.45, 9.5, 6),
      parapetMat
    );
    spireMast.position.y = spec.h + 12.6;
    group.add(spireMast);
  } else {
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.65, 0.75, spec.d + 0.65),
      parapetMat
    );
    parapet.position.y = spec.h + 0.25;
    group.add(parapet);

    const snowCap = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.35, 0.22, spec.d + 0.35),
      mats.roof
    );
    snowCap.position.y = spec.h + 0.72;
    group.add(snowCap);
  }

  // =========================================================================
  // FUTURISTIC NEON ACCENT LIGHTS, CASINO MARQUEES, ARCADES & COMPUTER LIBRARIES!
  // =========================================================================
  if (spec.neonColor) {
    let tubeMat = neonTubeCache.get(spec.neonColor);
    if (!tubeMat) {
      tubeMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: new THREE.Color(spec.neonColor),
        emissiveIntensity: 3.0,
        roughness: 0.15,
      });
      neonTubeCache.set(spec.neonColor, tubeMat);
      neonAnimatedMats.push(tubeMat);
    }

    // Glowing futuristic horizontal rooftop neon crown band
    const crownBand = new THREE.Mesh(
      new THREE.BoxGeometry(spec.w + 0.38, 0.32, spec.d + 0.38),
      tubeMat
    );
    crownBand.position.y = spec.h - 0.5;
    group.add(crownBand);

    // Tall skyscrapers & casinos/arcades get sleek vertical futuristic LED edge strips!
    if (spec.h > 24 || spec.venue === 'casino' || spec.venue === 'arcade' || spec.venue === 'computer_library') {
      const stripH = spec.h * 0.78;
      for (const sx of [-1, 1]) {
        const edgeRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, stripH, 0.24),
          tubeMat
        );
        edgeRail.position.set(
          sx * (spec.w * 0.5 + 0.08),
          spec.h * 0.52,
          spec.d * 0.5 + 0.08
        );
        group.add(edgeRail);
      }
    }
  }

  // Luminous Venue Marquee Signboards (Casinos, Arcades, Computer Libraries, Nightlife, Pharmacy)
  if (spec.venue !== 'none') {
    const pool = neonSignPool[spec.venue];
    const signMat = pool[spec.seed % pool.length];
    const signW = Math.min(spec.w * 0.82, 11.5);
    const signH = 2.6;

    // Front & back glowing marquee boards at ground/second-story level
    const signFront = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.28), signMat);
    signFront.position.set(0, Math.min(spec.h - 2.5, 5.4), spec.d * 0.5 + 0.22);
    group.add(signFront);

    // Tall rooftop billboard marquee on Casinos, Arcades & Computer Libraries!
    if (spec.venue === 'casino' || spec.venue === 'arcade' || spec.venue === 'computer_library') {
      const roofSign = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(spec.w * 0.9, 13.5), 3.1, 0.32),
        signMat
      );
      roofSign.position.set(0, spec.h + 2.2, spec.d * 0.5 - 0.5);
      group.add(roofSign);

      // Vertical futuristic blade sign projecting slightly off building corner
      const bladeW = 1.6;
      const bladeH = Math.min(spec.h * 0.42, 8.2);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, bladeH, bladeW), signMat);
      blade.position.set(spec.w * 0.5 + 0.85, Math.min(spec.h * 0.6, 12.5), spec.d * 0.3);
      group.add(blade);
    }
  }

  // =========================================================================
  // DISTINCT GROUND-FLOOR STOREFRONT & FLUSH-WITH-GROUND FRONT DOOR ON EVERY BUILDING!
  // Verified for 100% of buildings: door bottom sits flush at y = 0.0!
  // =========================================================================
  const storefrontColors = ['#182430', '#2c1820', '#162822', '#262018', '#1e1c2e', '#242a30'];
  const doorColors = ['#3b2416', '#1c2836', '#3d1c20', '#203028', '#2a2d34', '#462c1c'];
  const sfTrimColor = storefrontColors[spec.seed % storefrontColors.length];
  const doorColor = doorColors[(spec.seed * 3) % doorColors.length];
  const isBrickApt = spec.style.startsWith('brick_apt');
  const isCommercial = spec.hasStorefront || spec.venue !== 'none' || spec.style.startsWith('commercial');

  const sfFrameMat = new THREE.MeshStandardMaterial({
    color: isBrickApt ? '#2a1c18' : sfTrimColor,
    roughness: 0.58,
    metalness: 0.28,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: doorColor,
    roughness: 0.45,
    metalness: 0.32,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: '#d8b464',
    roughness: 0.25,
    metalness: 0.85,
  });
  const glassGlowHex =
    spec.venue === 'casino'
      ? '#ff6ea8'
      : spec.venue === 'arcade'
      ? '#38e8ff'
      : spec.venue === 'computer_library'
      ? '#60a5fa'
      : spec.venue === 'pharmacy'
      ? '#34d399'
      : isCommercial
      ? '#ffca82'
      : '#c4a878';
  const shopWindowMat = new THREE.MeshStandardMaterial({
    color: '#1b2634',
    emissive: new THREE.Color(glassGlowHex),
    emissiveIntensity: isCommercial ? 0.88 : 0.42,
    roughness: 0.16,
    metalness: 0.25,
  });

  // Ground-floor base facade fascia band flush with ground (y = 0..3.4m)
  const baseBandH = Math.min(3.4, spec.h * 0.45);
  const baseBand = new THREE.Mesh(
    new THREE.BoxGeometry(spec.w + 0.16, baseBandH, spec.d + 0.16),
    sfFrameMat
  );
  baseBand.position.y = baseBandH * 0.5;
  group.add(baseBand);

  // Place ground-flush storefront doors & illuminated shop windows on Front (+Z) and Back (-Z) facades
  const doorW = isCommercial ? 2.15 : 1.55;
  const doorH = 2.45; // Top at y=2.45, bottom STRICTLY flush with ground at y=0.0!
  for (const faceSign of [1, -1]) {
    const fz = faceSign * (spec.d * 0.5 + 0.12);

    // Outer door jamb casing seated strictly at y = 0.0
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(doorW + 0.36, doorH + 0.22, 0.22),
      sfFrameMat
    );
    doorFrame.position.set(0, (doorH + 0.22) * 0.5, fz);
    group.add(doorFrame);

    // Actual front door leaf flush with ground (bottom = 0.0, center = doorH * 0.5)
    const doorLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.12),
      doorMat
    );
    doorLeaf.position.set(0, doorH * 0.5, fz + faceSign * 0.08);
    group.add(doorLeaf);

    // Glass upper door inset + brass door handle
    const doorGlass = new THREE.Mesh(
      new THREE.BoxGeometry(doorW * 0.64, doorH * 0.46, 0.06),
      shopWindowMat
    );
    doorGlass.position.set(0, doorH * 0.64, fz + faceSign * 0.13);
    group.add(doorGlass);

    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.28, 0.08),
      handleMat
    );
    doorHandle.position.set(doorW * 0.32, 1.08, fz + faceSign * 0.16);
    group.add(doorHandle);

    // Subtle rain-wet granite doorstep threshold flush at ground level (y = 0.025)
    const doorstep = new THREE.Mesh(
      new THREE.BoxGeometry(doorW + 0.7, 0.05, 0.55),
      parapetMat
    );
    doorstep.position.set(0, 0.025, fz + faceSign * 0.26);
    group.add(doorstep);

    // Warm entryway overhead rain canopy / porch hood above front door
    const porchHood = new THREE.Mesh(
      new THREE.BoxGeometry(isCommercial ? spec.w + 0.7 : doorW + 1.4, 0.24, isCommercial ? 1.1 : 1.0),
      sfFrameMat
    );
    porchHood.position.set(0, doorH + 0.34, fz + faceSign * 0.42);
    group.add(porchHood);

    // Flanking storefront display windows on wide enough facades (sill at 0.55m above ground)
    const sideSpace = spec.w * 0.5 - doorW * 0.5 - 1.0;
    if (sideSpace > 1.6) {
      const winW = Math.min(sideSpace * 0.78, 3.6);
      const winH = isCommercial ? 2.15 : 1.55;
      const winY = isCommercial ? 0.55 + winH * 0.5 : 1.15 + winH * 0.5;
      for (const sx of [-1, 1]) {
        const wx = sx * (doorW * 0.5 + 0.65 + winW * 0.5);
        const shopWin = new THREE.Mesh(
          new THREE.BoxGeometry(winW, winH, 0.12),
          shopWindowMat
        );
        shopWin.position.set(wx, winY, fz + faceSign * 0.06);
        group.add(shopWin);
      }
    }
  }

  return group;
}

export function buildCityWorld(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld,
  registry?: InteriorRegistry,
  callbacks?: ArchipelagoCallbacks
): CityHandles {
  const root = new THREE.Group();
  const rng = mulberry32(20261126);
  const beaconLights: THREE.MeshStandardMaterial[] = [];
  const neonAnimatedMats: THREE.MeshStandardMaterial[] = [];
  const neonTubeCache = new Map<string, THREE.MeshStandardMaterial>();

  // Pre-build reusable glowing Neon Venue Signboard Materials
  const neonSignPool: Record<Exclude<VenueKind, 'none'>, THREE.MeshStandardMaterial[]> = {
    casino: [
      createNeonSignMaterial('casino', 0, neonAnimatedMats),
      createNeonSignMaterial('casino', 1, neonAnimatedMats),
    ],
    arcade: [
      createNeonSignMaterial('arcade', 0, neonAnimatedMats),
      createNeonSignMaterial('arcade', 1, neonAnimatedMats),
    ],
    computer_library: [
      createNeonSignMaterial('computer_library', 0, neonAnimatedMats),
      createNeonSignMaterial('computer_library', 1, neonAnimatedMats),
    ],
    nightlife: [
      createNeonSignMaterial('nightlife', 0, neonAnimatedMats),
      createNeonSignMaterial('nightlife', 1, neonAnimatedMats),
    ],
    pharmacy: [createNeonSignMaterial('pharmacy', 0, neonAnimatedMats)],
  };

  // =========================================================================
  // 1. DARK ICY BALTIC / NORTHERN SEA OCEAN PLANE (Expanded for Full 5-Region Archipelago!)
  // =========================================================================
  const oceanGeo = new THREE.PlaneGeometry(7600, 5600, 1, 1);
  oceanGeo.rotateX(-Math.PI * 0.5);
  const oceanMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0c1b29'),
    roughness: 0.18,
    metalness: 0.25,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.25,
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.set(900, -2.2, 0);
  ocean.receiveShadow = true;
  root.add(ocean);

  // =========================================================================
  // 2. ISLAND 1 (NOVAYA KALUGA — UNTOUCHED!) + ARCHIPELAGO HILLS & VALLEYS TERRAIN MESH
  // =========================================================================
  const terrainSize = 1800;
  const segs = 128;
  const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs);
  terrainGeo.rotateX(-Math.PI * 0.5);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    // Avoid double-overlapping Archipelago terrain east of x=520
    posAttr.setY(i, vx > 525 ? -3.4 : getTerrainHeight(vx, vz));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.grassGroundMap,
    bumpMap: textures.grassGroundBump,
    bumpScale: 0.28,
    color: '#9eb2a0',
    roughness: 0.78,
    metalness: 0.04,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  root.add(terrain);

  // Sculpted Grand Archipelago East Terrain (Sector 4 Mountains +28m, Island 2 Marshes/Valleys, Island 3 Crater -8m, Island 4 Resort +18m)
  const archW = 2240;
  const archD = 1640;
  const archOffsetX = 1600;
  const archGeo = new THREE.PlaneGeometry(archW, archD, 136, 104);
  archGeo.rotateX(-Math.PI * 0.5);
  const archPos = archGeo.attributes.position;
  for (let i = 0; i < archPos.count; i++) {
    const wx = archPos.getX(i) + archOffsetX;
    const wz = archPos.getZ(i);
    // Keep open water under Gate 12 & Golden Gate-II bridges depressed so bridges span cleanly over water!
    const sd = signedLandDistance(wx, wz);
    const h = sd <= -10 ? -3.4 : getTerrainHeight(wx, wz);
    archPos.setY(i, h);
  }
  archGeo.computeVertexNormals();
  const archTerrain = new THREE.Mesh(archGeo, terrainMat);
  archTerrain.position.x = archOffsetX;
  archTerrain.receiveShadow = true;
  root.add(archTerrain);

  // =========================================================================
  // 3. CRYSTAL-CLEAR SMOOTH BLACK TWO-LANE WET ASPHALT ROADS (DOUBLE YELLOW & DOTTED YELLOW!)
  // =========================================================================
  const asphaltDoubleYellowMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltMap,
    roughnessMap: textures.asphaltRoughness,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.06,
    roughness: 0.36,
    metalness: 0.24,
    envMapIntensity: 0.84,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const asphaltDottedYellowMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltDottedMap,
    roughnessMap: textures.asphaltRoughness,
    bumpMap: textures.asphaltBump,
    bumpScale: 0.06,
    roughness: 0.36,
    metalness: 0.24,
    envMapIntensity: 0.84,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalkMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.12,
    color: '#3c434d',
    roughness: 0.76,
    metalness: 0.06,
  });

  const roadGroup = new THREE.Group();
  const buildRoadSet = (seg: RoadSegment, idx: number) => {
    const baseY =
      seg.kind === 'roundabout'
        ? 0.095
        : seg.kind === 'bridge'
        ? 0.1
        : seg.kind === 'avenue'
        ? 0.084
        : seg.kind === 'coastal'
        ? 0.076
        : 0.064 + (idx % 4) * 0.002;

    if (seg.kind !== 'bridge' && seg.kind !== 'ramp') {
      // Base continuous concrete apron underneath intersection corners
      const curbGeo = createRoadRibbonGeometry(
        seg.points,
        seg.width + 6.8,
        0.032,
        10
      );
      const curbMesh = new THREE.Mesh(curbGeo, sidewalkMat);
      curbMesh.receiveShadow = true;
      roadGroup.add(curbMesh);

      // True raised 3.2m concrete sidewalks + vertical curb lips cleanly outside road asphalt
      for (const side of [-1, 1] as const) {
        const swGeo = createRaisedSidewalkGeometry(
          seg.points,
          seg.width,
          baseY + 0.072,
          baseY - 0.025,
          3.2,
          side,
          10
        );
        if (swGeo.attributes.position.count > 0) {
          const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
          swMesh.receiveShadow = true;
          roadGroup.add(swMesh);
        }
      }
    }

    const useDoubleYellow = seg.kind !== 'street';
    const roadGeo = createRoadRibbonGeometry(seg.points, seg.width, baseY, 16);
    const roadMesh = new THREE.Mesh(
      roadGeo,
      useDoubleYellow ? asphaltDoubleYellowMat : asphaltDottedYellowMat
    );
    roadMesh.receiveShadow = true;
    roadGroup.add(roadMesh);
  };

  ROADS.forEach((seg, idx) => buildRoadSet(seg, idx));
  root.add(roadGroup);

  // =========================================================================
  // 4. TINY BRIDGE STRUCTURE (SW Mainland Access)
  // =========================================================================
  const bridgeStart = new THREE.Vector3(m2w(-585), 0, m2w(590));
  const bridgeEnd = new THREE.Vector3(m2w(-745), 0, m2w(790));
  const bridgeMid = bridgeStart.clone().add(bridgeEnd).multiplyScalar(0.5);
  const bridgeLen = bridgeStart.distanceTo(bridgeEnd);
  const bridgeAngle = Math.atan2(
    bridgeEnd.x - bridgeStart.x,
    bridgeEnd.z - bridgeStart.z
  );

  const concreteMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.2,
    roughness: 0.85,
  });

  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(bridgeMid.x, 0, bridgeMid.z);
  bridgeGroup.rotation.y = bridgeAngle;

  const bridgeDeck = new THREE.Mesh(
    new THREE.BoxGeometry(13.2, 1.1, bridgeLen),
    concreteMat
  );
  bridgeDeck.position.y = -0.5;
  bridgeGroup.add(bridgeDeck);

  const cosBr = Math.cos(bridgeAngle);
  const sinBr = Math.sin(bridgeAngle);
  for (const sx of [-10.5, 10.5]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 1.15, bridgeLen),
      concreteMat
    );
    rail.position.set(sx, 0.6, 0);
    rail.castShadow = true;
    bridgeGroup.add(rail);
    // Solid OBB collider along each bridge guardrail so player bounces cleanly instead of clipping!
    collisionWorld.addBox(
      bridgeMid.x + sx * cosBr,
      bridgeMid.z - sx * sinBr,
      0.85,
      bridgeLen,
      bridgeAngle
    );
  }
  for (let pz = -bridgeLen * 0.4; pz <= bridgeLen * 0.4; pz += 24) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(20.0, 5.5, 2.2), concreteMat);
    pier.position.set(0, -3.2, pz);
    bridgeGroup.add(pier);
  }
  root.add(bridgeGroup);

  // =========================================================================
  // 5. HERO LANDMARKS (1:1 WITH BLUEPRINT CALLOUTS)
  // =========================================================================

  // 5A. CENTRAL RELIQUARY ROUNDABOUT PLAZA (Driveable chamfered stone curb ledge + solid inner Grand Cathedral!)
  const plazaRadius = ROUNDABOUT_RADIUS - 13.6; // leaves full 26.5m roundabout roadway outside the curb!
  const centralPlaza = new THREE.Mesh(
    new THREE.CylinderGeometry(plazaRadius, plazaRadius + 1.1, 0.42, 48),
    sidewalkMat
  );
  centralPlaza.position.y = 0.21;
  centralPlaza.receiveShadow = true;
  root.add(centralPlaza);

  const railSteelMat = new THREE.MeshStandardMaterial({
    color: '#252e38',
    roughness: 0.42,
    metalness: 0.72,
  });

  // Low beveled granite curb trim + flush glowing cyan guide rim (cars can jump right up onto the plaza!)
  const centralCurbRim = new THREE.Mesh(
    new THREE.TorusGeometry(plazaRadius - 0.05, 0.14, 8, 64),
    railSteelMat
  );
  centralCurbRim.rotation.x = Math.PI * 0.5;
  centralCurbRim.position.y = 0.36;
  root.add(centralCurbRim);

  const reliquaryRingMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    emissive: new THREE.Color('#00c8f0'),
    emissiveIntensity: 1.35,
  });
  neonAnimatedMats.push(reliquaryRingMat);
  const reliquaryRing = new THREE.Mesh(
    new THREE.TorusGeometry(plazaRadius - 0.08, 0.075, 6, 64),
    reliquaryRingMat
  );
  reliquaryRing.rotation.x = Math.PI * 0.5;
  reliquaryRing.position.y = 0.46;
  root.add(reliquaryRing);

  const reliquary = createOrthodoxCathedral(1.15, textures, true);
  reliquary.position.set(0, 0.42, 0);
  root.add(reliquary);
  // Outer plaza curb is a driveable low ledge (bump & air launch at speed); central cathedral walls stay solid!
  collisionWorld.addLowCircleLedge(0, 0, plazaRadius + 0.35, 0.42);
  collisionWorld.addCircle(0, 0, 14.5);

  // 5A-2. SECONDARY ROUNDABOUT CURBED CENTER ISLANDS (Driveable low granite ledges + solid central pylon!)
  const rbGrassMat = new THREE.MeshStandardMaterial({
    map: textures.grassGroundMap,
    color: '#526858',
    roughness: 0.85,
  });
  const rbAmberTrimMat = new THREE.MeshStandardMaterial({
    color: '#fde68a',
    emissive: new THREE.Color('#f59e0b'),
    emissiveIntensity: 1.25,
  });
  neonAnimatedMats.push(rbAmberTrimMat);

  for (let rIdx = 0; rIdx < SECONDARY_ROUNDABOUTS.length; rIdx++) {
    const rb = SECONDARY_ROUNDABOUTS[rIdx];
    const islandR = Math.max(10.5, rb.radius - rb.width * 0.52);
    const rbGroup = new THREE.Group();
    rbGroup.position.set(rb.x, 0, rb.z);

    // Beveled driveable granite/concrete curb rim
    const curbBase = new THREE.Mesh(
      new THREE.CylinderGeometry(islandR, islandR + 0.95, 0.4, 36),
      sidewalkMat
    );
    curbBase.position.y = 0.2;
    curbBase.receiveShadow = true;
    rbGroup.add(curbBase);

    // Landscaped wet dark grass lawn inside roundabout
    const lawn = new THREE.Mesh(
      new THREE.CylinderGeometry(islandR - 1.1, islandR - 0.9, 0.44, 32),
      rbGrassMat
    );
    lawn.position.y = 0.22;
    rbGroup.add(lawn);

    // Low chamfered curb rim + flush amber/cyan glowing guide trim (jumpable at speed!)
    const rail = new THREE.Mesh(
      new THREE.TorusGeometry(islandR - 0.08, 0.12, 8, 40),
      railSteelMat
    );
    rail.rotation.x = Math.PI * 0.5;
    rail.position.y = 0.35;
    rbGroup.add(rail);

    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(islandR - 0.1, 0.065, 6, 40),
      rIdx % 2 === 0 ? reliquaryRingMat : rbAmberTrimMat
    );
    trim.rotation.x = Math.PI * 0.5;
    trim.position.y = 0.45;
    rbGroup.add(trim);

    // Central modernist Soviet-futurist pylon & ring monument so each roundabout is an iconic landmark!
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 1.4, 8), concreteMat);
    plinth.position.y = 1.1;
    rbGroup.add(plinth);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.15, 11.5, 6), railSteelMat);
    spire.position.y = 7.4;
    rbGroup.add(spire);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.12, 8, 24),
      rIdx % 2 === 0 ? reliquaryRingMat : rbAmberTrimMat
    );
    halo.position.y = 10.6;
    halo.rotation.x = 0.35;
    rbGroup.add(halo);

    root.add(rbGroup);
    // Low island ledge is driveable with bump & air launch; tall central pylon stays solid!
    collisionWorld.addLowCircleLedge(rb.x, rb.z, islandR + 0.3, 0.42);
    collisionWorld.addCircle(rb.x, rb.z, 3.5);
  }

  // 5B. WESTERN & NORTHERN ONION-DOME CATHEDRALS
  const westCathX = m2w(-140);
  const westCathZ = m2w(-72);
  const westCath = createOrthodoxCathedral(0.92, textures, false);
  westCath.position.set(westCathX, 0, westCathZ);
  root.add(westCath);
  collisionWorld.addBox(westCathX, westCathZ, 24, 24, 0);

  const northCathX = m2w(84);
  const northCathZ = m2w(-168);
  const northCath = createOrthodoxCathedral(0.95, textures, false);
  northCath.position.set(northCathX, 0, northCathZ);
  root.add(northCath);
  collisionWorld.addBox(northCathX, northCathZ, 24, 24, 0);

  // 5C. SOVIET MONUMENT PLAZA (Driveable outer stepped granite plinth + solid tall inner obelisk pedestal!)
  const monX = m2w(148);
  const monZ = m2w(-62);
  const monGroup = new THREE.Group();
  monGroup.position.set(monX, 0, monZ);
  const graniteMat = new THREE.MeshStandardMaterial({
    color: '#4d4644',
    roughness: 0.45,
    metalness: 0.25,
  });
  const redStarMat = new THREE.MeshStandardMaterial({
    color: '#a8181c',
    emissive: new THREE.Color('#ff2428'),
    emissiveIntensity: 2.2,
    roughness: 0.3,
  });
  neonAnimatedMats.push(redStarMat);
  const monBase1 = new THREE.Mesh(new THREE.BoxGeometry(22, 0.56, 22), graniteMat);
  monBase1.position.y = 0.28;
  monGroup.add(monBase1);
  const monBase2 = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, 12), graniteMat);
  monBase2.position.y = 1.66;
  monGroup.add(monBase2);
  const obelisk = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 3.6, 26, 4),
    concreteMat
  );
  obelisk.rotation.y = Math.PI * 0.25;
  obelisk.position.y = 14.8;
  obelisk.castShadow = true;
  monGroup.add(obelisk);
  const starEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), redStarMat);
  starEmblem.position.y = 29.1;
  monGroup.add(starEmblem);
  root.add(monGroup);
  collisionWorld.addLowBoxLedge(monX, monZ, 22, 22, 0, 0.56);
  collisionWorld.addBox(monX, monZ, 12.2, 12.2, 0);

  // 5D. TRANSIT HUB PAVILIONS (South [-85, 165] & East [145, 115] from blueprint!)
  const transitHubs: [number, number, number][] = [
    [-85, 165, 0.65],
    [145, 115, -0.55],
  ];
  const hubCanopyMat = new THREE.MeshStandardMaterial({
    color: '#344454',
    roughness: 0.55,
    metalness: 0.55,
  });
  for (const [hx, hz, rot] of transitHubs) {
    const tg = new THREE.Group();
    tg.position.set(m2w(hx), 0, m2w(hz));
    tg.rotation.y = rot;
    const base = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 16), sidewalkMat);
    base.position.y = 0.25;
    tg.add(base);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 0.9, 14), hubCanopyMat);
    roof.position.y = 5.4;
    roof.castShadow = true;
    tg.add(roof);
    const neonEdge = new THREE.Mesh(
      new THREE.BoxGeometry(22.4, 0.25, 14.4),
      reliquaryRingMat
    );
    neonEdge.position.y = 5.0;
    tg.add(neonEdge);
    for (const px of [-9, 0, 9]) {
      for (const pz of [-5, 5]) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.38, 5.2, 8),
          concreteMat
        );
        col.position.set(px, 2.7, pz);
        tg.add(col);
      }
    }
    root.add(tg);
    collisionWorld.addBox(m2w(hx), m2w(hz), 22, 14, rot);
  }

  // 5E. MILITARY BUNKER GARRISON & ROTATING RADAR (District 3)
  const radarX = m2w(-425);
  const radarZ = m2w(395);
  const padMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 14.5, 0.35, 24),
    concreteMat
  );
  padMesh.position.set(radarX, 0.18, radarZ);
  root.add(padMesh);
  const starPad = new THREE.Mesh(
    new THREE.CylinderGeometry(5.5, 5.5, 0.39, 5),
    new THREE.MeshStandardMaterial({ color: '#8f2020', roughness: 0.75 })
  );
  starPad.position.set(radarX, 0.2, radarZ);
  root.add(starPad);

  const towerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 3.4, 24, 6),
    concreteMat
  );
  towerBase.position.set(radarX - 20, 12, radarZ - 14);
  towerBase.castShadow = true;
  root.add(towerBase);

  const radarDish = new THREE.Group();
  radarDish.position.set(radarX - 20, 25.5, radarZ - 14);
  const dishSteel = new THREE.MeshStandardMaterial({
    color: '#7f8992',
    roughness: 0.45,
    metalness: 0.7,
  });
  radarDish.add(new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.2, 0.7), dishSteel));
  const beaconMat = new THREE.MeshStandardMaterial({
    color: '#ff2020',
    emissive: new THREE.Color('#ff1818'),
    emissiveIntensity: 3.5,
  });
  beaconLights.push(beaconMat);
  const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), beaconMat);
  beaconBulb.position.y = 2.1;
  radarDish.add(beaconBulb);
  root.add(radarDish);
  collisionWorld.addBox(radarX - 20, radarZ - 14, 7, 7, 0);

  // 5F. PRISON HOLDING FACILITY (REINSTACH) WATCHTOWERS (Strictly clear of all roadways & roundabout!)
  const prisonTowers: [number, number][] = [
    [-232, 355],
    [-44, 355],
    [-228, 565],
    [-46, 585],
  ];
  for (const [tx, tz] of prisonTowers) {
    const wx = m2w(tx);
    const wz = m2w(tz);
    if (isNearAnyRoad(wx, wz, 8.5) || isNearMetroTrack(wx, wz, 10)) continue;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(3.6, 13, 3.6), concreteMat);
    leg.position.set(wx, 6.5, wz);
    leg.castShadow = true;
    root.add(leg);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.2, 5.4), concreteMat);
    cab.position.set(wx, 14.2, wz);
    root.add(cab);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 1.2),
      new THREE.MeshStandardMaterial({
        color: '#fff4d2',
        emissive: new THREE.Color('#ffd88a'),
        emissiveIntensity: 2.5,
      })
    );
    lamp.position.set(wx, 13.6, wz);
    root.add(lamp);
    collisionWorld.addBox(wx, wz, 4.5, 4.5, 0);
  }

  // 5G. COASTAL DEFENSE BATTERIES (East & South)
  const batterySites: [number, number, number][] = [
    [740, 35, Math.PI * 0.5],
    [-195, 695, Math.PI],
  ];
  const gunSteelMat = new THREE.MeshStandardMaterial({
    color: '#32383e',
    roughness: 0.45,
    metalness: 0.78,
  });
  for (const [bx, bz, yaw] of batterySites) {
    const wx = m2w(bx);
    const wz = m2w(bz);
    if (isNearAnyRoad(wx, wz, 14) || isNearMetroTrack(wx, wz, 14)) continue;
    const g = new THREE.Group();
    g.position.set(wx, 0, wz);
    g.rotation.y = yaw;
    const casemate = new THREE.Mesh(
      new THREE.CylinderGeometry(10, 12.5, 5.2, 12),
      concreteMat
    );
    casemate.position.y = 2.6;
    casemate.castShadow = true;
    g.add(casemate);
    const turret = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.0, 7.8), gunSteelMat);
    turret.position.y = 6.7;
    g.add(turret);
    for (const gx of [-1.4, 1.4]) {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.55, 13.5, 10),
        gunSteelMat
      );
      barrel.rotation.x = Math.PI * 0.5 - 0.18;
      barrel.position.set(gx, 7.5, 7.2);
      g.add(barrel);
    }
    root.add(g);
    collisionWorld.addBox(wx, wz, 22, 22, 0);
  }

  // 5H. INDUSTRIAL RAILYARD, SILOS & SHIPPING DOCKS (District 4)
  const dockPiers: [number, number, number][] = [
    [320, 755, -0.22],
    [435, 765, -0.22],
    [550, 755, -0.22],
    [665, 720, -0.28],
  ];
  const craneRedMat = new THREE.MeshStandardMaterial({
    color: '#8f3028',
    roughness: 0.55,
    metalness: 0.5,
  });
  for (const [px, pz, rot] of dockPiers) {
    const pg = new THREE.Group();
    pg.position.set(m2w(px), 0, m2w(pz));
    pg.rotation.y = rot;
    const pierSlab = new THREE.Mesh(new THREE.BoxGeometry(22, 3.2, 68), concreteMat);
    pierSlab.position.y = -1.3;
    pierSlab.receiveShadow = true;
    pg.add(pierSlab);

    for (const sx of [-7, 7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 24, 1.8), craneRedMat);
      leg.position.set(sx, 12, 16);
      leg.castShadow = true;
      pg.add(leg);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(17, 2.2, 3.4), craneRedMat);
    crossBeam.position.set(0, 23.5, 16);
    pg.add(crossBeam);
    const jib = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 34), craneRedMat);
    jib.position.set(0, 25, 22);
    pg.add(jib);
    root.add(pg);
  }

  // Railyard Tracks & Parked Freight Railcars (strictly clear of roads!)
  const railMat = new THREE.MeshStandardMaterial({
    color: '#464b50',
    roughness: 0.45,
    metalness: 0.78,
  });
  const railCarColors = ['#5c3228', '#33463c', '#3d4752', '#705832'];
  const trackMapZs = [355, 385, 415, 445];
  for (let t = 0; t < trackMapZs.length; t++) {
    const wz = m2w(trackMapZs[t]);
    const trackLen = m2w(360);
    const trackCenter = m2w(495);
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(trackLen, 0.16, 0.22), railMat);
    rail1.position.set(trackCenter, 0.06, wz - 0.85);
    root.add(rail1);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(trackLen, 0.16, 0.22), railMat);
    rail2.position.set(trackCenter, 0.06, wz + 0.85);
    root.add(rail2);

    const carMat = new THREE.MeshStandardMaterial({
      color: railCarColors[t % railCarColors.length],
      roughness: 0.72,
      metalness: 0.35,
    });
    for (let c = 0; c < 4; c++) {
      const cx = m2w(315 + c * 92 + (t % 2) * 28);
      if (isNearAnyRoad(cx, wz, 11) || isNearMetroTrack(cx, wz, 11)) continue;
      const boxcar = new THREE.Mesh(new THREE.BoxGeometry(15, 3.8, 3.1), carMat);
      boxcar.position.set(cx, 2.15, wz);
      boxcar.castShadow = true;
      root.add(boxcar);
      collisionWorld.addBox(cx, wz, 15.5, 3.4, 0);
    }
  }

  // Stacked Shipping Containers along Docks (strictly off roads!)
  const containerGeo = new THREE.BoxGeometry(12, 2.8, 2.6);
  const containerMats = textures.containerMaps.map(
    (m) =>
      new THREE.MeshStandardMaterial({
        map: m,
        roughness: 0.65,
        metalness: 0.38,
      })
  );
  for (let i = 0; i < 32; i++) {
    const cx = m2w(300 + (i % 8) * 52);
    const cz = m2w(595 + Math.floor(i / 8) * 16);
    if (isNearAnyRoad(cx, cz, 10) || isNearMetroTrack(cx, cz, 10)) continue;
    const stackH = 1 + (i % 3);
    for (let s = 0; s < stackH; s++) {
      const cm = new THREE.Mesh(
        containerGeo,
        containerMats[(i + s) % containerMats.length]
      );
      cm.position.set(cx, 1.4 + s * 2.82, cz);
      cm.castShadow = s === stackH - 1;
      root.add(cm);
    }
    collisionWorld.addBox(cx, cz, 12.2, 2.8, 0);
  }

  // 5I. CHECKPOINT GANTRIES (Wide span clearing the entire drivable road!)
  const checkpoints: [number, number, number][] = [
    [-200, -785, 0],
    [0, -765, Math.PI * 0.5],
    [-760, -200, Math.PI * 0.5],
    [-685, 715, -Math.PI * 0.25],
  ];
  const stripeRedMat = new THREE.MeshStandardMaterial({
    color: '#b82424',
    emissive: new THREE.Color('#ff2828'),
    emissiveIntensity: 0.9,
    roughness: 0.5,
  });
  for (const [cx, cz, rot] of checkpoints) {
    const cg = new THREE.Group();
    cg.position.set(m2w(cx), 0, m2w(cz));
    cg.rotation.y = rot;
    const booth = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.2, 3.2), concreteMat);
    booth.position.set(10.8, 1.6, 0);
    cg.add(booth);
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 6.8, 8), gunSteelMat);
    postL.position.set(-9.4, 3.4, 0);
    cg.add(postL);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 6.8, 8), gunSteelMat);
    postR.position.set(9.4, 3.4, 0);
    cg.add(postR);
    const header = new THREE.Mesh(new THREE.BoxGeometry(19.4, 0.95, 0.45), stripeRedMat);
    header.position.set(0, 6.4, 0);
    cg.add(header);
    root.add(cg);
  }

  // =========================================================================
  // 6. ALL DENSELY BUNCHED TEXTURED BUILDINGS WITH VARIED HEIGHTS & NEON VENUES
  // =========================================================================
  const bldgGroup = new THREE.Group();
  for (let i = 0; i < BUILDINGS.length; i++) {
    const spec = BUILDINGS[i];
    bldgGroup.add(
      createBuildingMesh(
        spec,
        textures,
        rng,
        neonSignPool,
        neonTubeCache,
        neonAnimatedMats
      )
    );
    collisionWorld.addBox(spec.x, spec.z, spec.w + 0.5, spec.d + 0.5, spec.rotY);
  }
  root.add(bldgGroup);

  // =========================================================================
  // 6B. LARGE ILLUMINATED RUSSIAN CYRILLIC NEON BILLBOARDS ALL AROUND THE CITY!
  // =========================================================================
  const billboardMats: THREE.MeshStandardMaterial[] = [];
  for (let v = 0; v < 16; v++) {
    billboardMats.push(createRussianBillboardMaterial(v, neonAnimatedMats));
  }
  const steelTrussMat = new THREE.MeshStandardMaterial({
    color: '#20262e',
    roughness: 0.55,
    metalness: 0.72,
  });
  for (let i = 0; i < BILLBOARD_SITES.length; i++) {
    const bb = BILLBOARD_SITES[i];
    const bg = new THREE.Group();
    bg.position.set(bb.x, 0, bb.z);
    bg.rotation.y = bb.rotY;

    const mastH = bb.height - 2.6;
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.44, mastH, 8),
      steelTrussMat
    );
    mast.position.y = mastH * 0.5;
    bg.add(mast);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(bb.width + 0.5, 5.4, 0.48),
      steelTrussMat
    );
    frame.position.y = bb.height;
    bg.add(frame);

    const frontFace = new THREE.Mesh(
      new THREE.PlaneGeometry(bb.width, 5.0),
      billboardMats[bb.variant % billboardMats.length]
    );
    frontFace.position.set(0, bb.height, 0.27);
    bg.add(frontFace);

    const backFace = new THREE.Mesh(
      new THREE.PlaneGeometry(bb.width, 5.0),
      billboardMats[(bb.variant + 5) % billboardMats.length]
    );
    backFace.rotation.y = Math.PI;
    backFace.position.set(0, bb.height, -0.27);
    bg.add(backFace);

    root.add(bg);
    collisionWorld.addBox(bb.x, bb.z, 1.4, 1.4, 0);
  }

  // =========================================================================
  // 7. DENSE RAIN-SOAKED DARK PINE FORESTS & PARK TREES (ZERO SNOW!)
  // =========================================================================
  const treePositions: { x: number; y: number; z: number; scale: number; rot: number }[] = [];

  const treeZones: { xMin: number; xMax: number; zMin: number; zMax: number; count: number }[] = [
    { xMin: -840, xMax: -540, zMin: 20, zMax: 540, count: 230 },
    { xMin: 210, xMax: 760, zMin: 20, zMax: 270, count: 230 },
    { xMin: 140, xMax: 520, zMin: -560, zMax: -80, count: 165 },
    { xMin: 20, xMax: 225, zMin: 240, zMax: 660, count: 150 },
    { xMin: -610, xMax: -220, zMin: 40, zMax: 580, count: 130 },
    { xMin: 580, xMax: 810, zMin: -660, zMax: -120, count: 120 },
    { xMin: -540, xMax: -220, zMin: 560, zMax: 720, count: 95 },
    { xMin: -720, xMax: 620, zMin: -740, zMax: 220, count: 140 },
  ];

  for (const zone of treeZones) {
    for (let i = 0; i < zone.count; i++) {
      const mx = zone.xMin + rng() * (zone.xMax - zone.xMin);
      const mz = zone.zMin + rng() * (zone.zMax - zone.zMin);
      const wx = m2w(mx);
      const wz = m2w(mz);
      if (signedLandDistance(wx, wz) < 10) continue;
      if (isNearAnyRoad(wx, wz, 7.8)) continue;
      if (isNearMetroTrack(wx, wz, 10.5)) continue;
      if (isInCrosswalkClearance(wx, wz, 1.4)) continue;
      let blocked = false;
      for (let b = 0; b < collisionWorld.boxes.length; b++) {
        const box = collisionWorld.boxes[b];
        if (Math.hypot(wx - box.cx, wz - box.cz) < box.radius + 3.8) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      treePositions.push({
        x: wx,
        y: getTerrainHeight(wx, wz),
        z: wz,
        scale: 0.72 + rng() * 0.78,
        rot: rng() * Math.PI * 2,
      });
    }
  }

  const treeCount = treePositions.length;
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#2b1f18', roughness: 0.92 });
  const pineDarkMat = new THREE.MeshStandardMaterial({ color: '#102116', roughness: 0.85 });
  const pineTopMat = new THREE.MeshStandardMaterial({ color: '#162c1e', roughness: 0.82 });

  const trunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.28, 0.42, 3.2, 6),
    trunkMat,
    treeCount
  );
  const tier1Inst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.6, 5.8, 7),
    pineDarkMat,
    treeCount
  );
  const tier2Inst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.9, 4.8, 7),
    pineTopMat,
    treeCount
  );

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < treeCount; i++) {
    const tp = treePositions[i];
    const s = tp.scale;

    dummy.position.set(tp.x, tp.y + 1.5 * s, tp.z);
    dummy.rotation.set(0, tp.rot, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tp.x, tp.y + 4.8 * s, tp.z);
    dummy.updateMatrix();
    tier1Inst.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.37 + (rng() - 0.5) * 0.04, 0.32, 0.1 + rng() * 0.05);
    tier1Inst.setColorAt(i, tint);

    dummy.position.set(tp.x, tp.y + 7.6 * s, tp.z);
    dummy.updateMatrix();
    tier2Inst.setMatrixAt(i, dummy.matrix);
    tint.setHSL(0.38 + (rng() - 0.5) * 0.04, 0.3, 0.13 + rng() * 0.06);
    tier2Inst.setColorAt(i, tint);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  tier1Inst.instanceMatrix.needsUpdate = true;
  tier2Inst.instanceMatrix.needsUpdate = true;
  if (tier1Inst.instanceColor) tier1Inst.instanceColor.needsUpdate = true;
  if (tier2Inst.instanceColor) tier2Inst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  tier1Inst.computeBoundingSphere();
  tier2Inst.computeBoundingSphere();
  root.add(trunkInst, tier1Inst, tier2Inst);

  // =========================================================================
  // 8. FUTURISTIC NEON-ACCENTED STREETLAMPS + POOLED DYNAMIC NIGHT LIGHTS
  // =========================================================================
  const streetLightPositions: THREE.Vector3[] = [];
  const lampTransforms: { x: number; z: number; rotY: number; isNeon: boolean }[] = [];

  for (const seg of ROADS) {
    if (
      seg.kind !== 'avenue' &&
      seg.kind !== 'roundabout' &&
      seg.kind !== 'coastal'
    ) {
      continue;
    }
    const step = seg.kind === 'roundabout' ? 26 : 42;
    let accum = step * 0.5;
    for (let i = 0; i < seg.points.length - 1; i++) {
      const a = seg.points[i];
      const b = seg.points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1) continue;
      const tx = dx / dist;
      const tz = dz / dist;
      const rx = -tz;
      const rz = tx;
      const rotY = Math.atan2(rx, rz);

      while (accum < dist) {
        const px = a.x + tx * accum;
        const pz = a.z + tz * accum;
        const offset = seg.width * 0.5 + 1.8;
        const lx = px + rx * offset;
        const lz = pz + rz * offset;
        // Never drop a streetlight pole in the middle of a crossing street or crosswalk!
        if (!isNearAnyRoad(lx, lz, 0.5) && !isInCrosswalkClearance(lx, lz, 0.8)) {
          const isNeon = lx < 120 && lz < 140; // downtown/commercial futuristic LED lamps
          lampTransforms.push({ x: lx, z: lz, rotY, isNeon });
          streetLightPositions.push(new THREE.Vector3(lx - rx * 1.8, 7.6, lz - rz * 1.8));
        }
        accum += step;
      }
      accum -= dist;
    }
  }

  const poleMat = new THREE.MeshStandardMaterial({
    color: '#2c333b',
    roughness: 0.52,
    metalness: 0.72,
  });
  const streetLampBulbsMat = new THREE.MeshStandardMaterial({
    color: '#eef8ff',
    emissive: new THREE.Color('#ffbd66'),
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });
  const neonTrimLampMat = new THREE.MeshStandardMaterial({
    color: '#a5f3fc',
    emissive: new THREE.Color('#00d8ff'),
    emissiveIntensity: 2.6,
  });
  neonAnimatedMats.push(neonTrimLampMat);

  const poleInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.17, 8.4, 6),
    poleMat,
    lampTransforms.length
  );
  const armInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 0.14, 2.3),
    poleMat,
    lampTransforms.length
  );
  const bulbInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.45, 0.18, 0.9),
    streetLampBulbsMat,
    lampTransforms.length
  );
  const neonStripInst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.14, 2.4, 0.14),
    neonTrimLampMat,
    lampTransforms.length
  );

  for (let i = 0; i < lampTransforms.length; i++) {
    const lt = lampTransforms[i];
    dummy.position.set(lt.x, 4.2, lt.z);
    dummy.rotation.set(0, lt.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(i, dummy.matrix);

    const armOffX = -Math.sin(lt.rotY) * 1.1;
    const armOffZ = -Math.cos(lt.rotY) * 1.1;
    dummy.position.set(lt.x + armOffX, 8.3, lt.z + armOffZ);
    dummy.updateMatrix();
    armInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(lt.x + armOffX * 1.85, 8.15, lt.z + armOffZ * 1.85);
    dummy.updateMatrix();
    bulbInst.setMatrixAt(i, dummy.matrix);

    // Futuristic vertical cyan LED strip on downtown poles
    dummy.position.set(lt.x, 5.4, lt.z);
    dummy.scale.set(1, lt.isNeon ? 1 : 0.001, 1);
    dummy.updateMatrix();
    neonStripInst.setMatrixAt(i, dummy.matrix);
  }
  poleInst.instanceMatrix.needsUpdate = true;
  armInst.instanceMatrix.needsUpdate = true;
  bulbInst.instanceMatrix.needsUpdate = true;
  neonStripInst.instanceMatrix.needsUpdate = true;
  poleInst.computeBoundingSphere();
  armInst.computeBoundingSphere();
  bulbInst.computeBoundingSphere();
  neonStripInst.computeBoundingSphere();
  root.add(poleInst, armInst, bulbInst, neonStripInst);

  // 4 proximity-pooled street lights — calibrated realistic night warmth & neon cyan (ZERO blinding glare!)
  const pooledStreetLights: THREE.PointLight[] = [];
  for (let i = 0; i < 4; i++) {
    const col = i === 0 || i === 2 ? '#ffaa4a' : '#3cb4ff';
    const pl = new THREE.PointLight(col, 0, 32, 2.0);
    pl.position.set(0, 7.6, 0);
    root.add(pl);
    pooledStreetLights.push(pl);
  }

  // =========================================================================
  // 12. MODULAR GRAND ARCHIPELAGO OUTER REGIONS (Sector 4, Island 2, Island 3, Island 4!)
  // =========================================================================
  const effectiveRegistry = registry ?? new InteriorRegistry();
  const effectiveCallbacks: ArchipelagoCallbacks = callbacks ?? {
    toggleGridPower: () => true,
    isGridPowerOnline: () => true,
    teleportPlayer: () => {},
    drinkCoffee: (s) => `Hot espresso served at ${s}`,
  };

  const sector4Mod = buildSector4WoodlandsAndMountains(textures, collisionWorld);
  const island2Mod = buildIsland2GridPrisonAndGhettos(
    textures,
    collisionWorld,
    effectiveRegistry,
    effectiveCallbacks
  );
  const island3Mod = buildIsland3StargatePeninsula(
    textures,
    collisionWorld,
    effectiveRegistry,
    effectiveCallbacks
  );
  const island4Mod = buildIsland4ElysiaAndHarbor(
    textures,
    collisionWorld,
    effectiveRegistry
  );
  root.add(sector4Mod.root, island2Mod.root, island3Mod.root, island4Mod.root);

  let powerGridOnline = true;
  const bestIndices = [0, 0, 0, 0];
  const bestDists = [Infinity, Infinity, Infinity, Infinity];

  const update = (
    dt: number,
    elapsed: number,
    carPos: THREE.Vector3,
    nightFactor: number
  ) => {
    radarDish.rotation.y += dt * 0.65;

    sector4Mod.update(dt, elapsed, nightFactor);
    island2Mod.update(dt, elapsed, nightFactor);
    island3Mod.update(dt, elapsed, nightFactor);
    island4Mod.update(dt, elapsed, nightFactor);

    const gridScale = powerGridOnline ? 1.0 : 0.08;
    const blink = (Math.sin(elapsed * 4.0) > 0.2 ? 2.4 : 0.2) * (powerGridOnline ? 1.0 : 0.45);
    for (let i = 0; i < beaconLights.length; i++) {
      beaconLights[i].emissiveIntensity = blink;
    }

    // Crisp, rich neon glow contrasting cleanly against the dark rainy night sky (dims during Grid Blackout!)
    const neonGlow = (0.95 + nightFactor * 0.65) * gridScale;
    for (let i = 0; i < neonAnimatedMats.length; i++) {
      neonAnimatedMats[i].emissiveIntensity = neonGlow;
    }

    streetLampBulbsMat.emissiveIntensity = (0.3 + nightFactor * 1.1) * gridScale;

    if (powerGridOnline && nightFactor > 0.06 && streetLightPositions.length >= 4) {
      bestDists[0] = bestDists[1] = bestDists[2] = bestDists[3] = Infinity;
      for (let i = 0; i < streetLightPositions.length; i++) {
        const p = streetLightPositions[i];
        const dx = p.x - carPos.x;
        const dz = p.z - carPos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestDists[3]) {
          let slot = 3;
          while (slot > 0 && d2 < bestDists[slot - 1]) {
            bestDists[slot] = bestDists[slot - 1];
            bestIndices[slot] = bestIndices[slot - 1];
            slot--;
          }
          bestDists[slot] = d2;
          bestIndices[slot] = i;
        }
      }
      const intensity = nightFactor * 5.8;
      for (let k = 0; k < 4; k++) {
        pooledStreetLights[k].position.copy(streetLightPositions[bestIndices[k]]);
        pooledStreetLights[k].intensity = intensity;
      }
    } else {
      for (let k = 0; k < 4; k++) {
        pooledStreetLights[k].intensity = 0;
      }
    }
  };

  return {
    root,
    radarDish,
    beaconLights,
    streetLampBulbsMat,
    streetLightPositions,
    pooledStreetLights,
    oceanMat,
    setPowerGridEnabled: (enabled: boolean) => {
      powerGridOnline = enabled;
    },
    update,
  };
}
