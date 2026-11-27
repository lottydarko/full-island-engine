import * as THREE from 'three';
import {
  CollisionWorld,
  getDistrictAt,
  getTerrainHeight,
  isNearAnyRoad,
} from './mapData';
import { InteriorRegistry } from './interiors/interiorRegistry';
import { TextureLibrary } from './textures';
import {
  applyHumanPose,
  createRiggedHuman,
  HumanRig,
} from './humanCharacter';
import { worldEventBus, WorldEvent } from './worldEventBus';

export type PoliceConvincedState = 'convinced' | 'wavering' | 'not';
export type PublicPerceptionState = 'matches' | 'drifting' | 'turned';

export interface DistrictPerception {
  districtId: string;
  authorityScore: number; // 0..100 (internal, no HUD bar)
  trustScore: number;     // 0..100 (internal, no HUD bar)
  policeConvinced: PoliceConvincedState;
  publicPerception: PublicPerceptionState;
  lastIncidentKind: string | null;
  lastIncidentAt: number;
}

export interface RadioStationSpec {
  id: string;
  districtId: string;
  signLabel: string; // Plain functional label only (Standing Law)
  x: number;
  y: number;
  z: number;
  rotY: number;
  studioPos: THREE.Vector3;
  hostRig: HumanRig;
  producerRig: HumanRig;
  beaconMat: THREE.MeshStandardMaterial;
  onAirMat: THREE.MeshStandardMaterial;
}

export interface RadioSystemHandles {
  root: THREE.Group;
  stations: RadioStationSpec[];
  update: (
    dt: number,
    elapsed: number,
    focusX: number,
    focusZ: number,
    playerDistrict: string,
    hiddenHeat: number
  ) => void;
  getDistrictPerception: (districtId: string) => DistrictPerception;
  getAllPerceptions: () => DistrictPerception[];
  getPoliceAlertFactor: (districtId: string) => number;
  getActiveBroadcastSubtitle: (
    x: number,
    y: number,
    z: number,
    elapsed: number,
    inVehicle: boolean
  ) => string;
  dispose: () => void;
}

interface StationAnchorConfig {
  id: string;
  districtId: string;
  signLabel: string;
  x: number;
  z: number;
  rotY: number;
}

const STATION_ANCHORS: StationAnchorConfig[] = [
  { id: 'rad_d1', districtId: 'D1', signLabel: 'RADIO NIGHTLIFE', x: -212, z: -136, rotY: 0 },
  { id: 'rad_d2', districtId: 'D2', signLabel: 'RADIO CIVIC CORE', x: 245, z: -148, rotY: 0 },
  { id: 'rad_d3', districtId: 'D3', signLabel: 'RADIO INDUSTRIAL', x: -158, z: 298, rotY: Math.PI },
  { id: 'rad_d4', districtId: 'D4', signLabel: 'RADIO WEST COAST', x: 255, z: 265, rotY: Math.PI * 0.5 },
  { id: 'rad_d7', districtId: 'D7', signLabel: 'RADIO GHETTOS', x: 1164, z: 128, rotY: Math.PI },
  { id: 'rad_d8', districtId: 'D8', signLabel: 'RADIO BLACK MARKET', x: 1598, z: 378, rotY: Math.PI },
  { id: 'rad_d9', districtId: 'D9', signLabel: 'RADIO OLD TOWN', x: 1738, z: -225, rotY: 0 },
  { id: 'rad_d10', districtId: 'D10', signLabel: 'RADIO ELYSIA', x: 2042, z: 318, rotY: -Math.PI * 0.5 },
];

const ALL_DISTRICTS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10'];

function createPlainRadioSignTexture(text: string, subText: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#11161f';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#d4dde8';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#c83228';
  ctx.fillRect(18, 22, 86, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ON AIR', 61, 43);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(text, 120, 48);

  ctx.fillStyle = '#9fb0c4';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(subText, 120, 92);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function classifyConvinced(score: number): PoliceConvincedState {
  if (score >= 66) return 'convinced';
  if (score >= 34) return 'wavering';
  return 'not';
}

function classifyPerception(score: number): PublicPerceptionState {
  if (score >= 66) return 'matches';
  if (score >= 34) return 'drifting';
  return 'turned';
}

/**
 * Builds 8 physical enterable radio stations staffed by rigged NPCs inside glass broadcast booths,
 * plus the per-district Police Convinced / Public Perception loop driven strictly by worldEventBus.
 */
export function buildRadioSystem(
  textures: TextureLibrary,
  collisionWorld: CollisionWorld,
  interiorRegistry: InteriorRegistry
): RadioSystemHandles {
  const root = new THREE.Group();
  root.name = 'RadioStationSystem';

  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWeatheredMap,
    bumpMap: textures.concreteBump,
    bumpScale: 0.08,
    color: '#414854',
    roughness: 0.84,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: '#1b2029',
    roughness: 0.56,
    metalness: 0.35,
  });
  const deskMat = new THREE.MeshStandardMaterial({
    color: '#252b34',
    roughness: 0.48,
    metalness: 0.25,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalkMap,
    color: '#2d333d',
    roughness: 0.78,
  });
  const glassBoothMat = new THREE.MeshPhysicalMaterial({
    color: '#8ab4d8',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const micMetalMat = new THREE.MeshStandardMaterial({
    color: '#b8c4d0',
    roughness: 0.28,
    metalness: 0.85,
  });
  const vuGlowMat = new THREE.MeshStandardMaterial({
    color: '#22c55e',
    emissive: new THREE.Color('#22d3ee'),
    emissiveIntensity: 1.15,
  });

  const stations: RadioStationSpec[] = [];
  const disposableTextures: THREE.Texture[] = [];

  for (let i = 0; i < STATION_ANCHORS.length; i++) {
    const cfg = STATION_ANCHORS[i];
    // Find clear flat ground adjacent to anchor outside any road asphalt
    let sx = cfg.x;
    let sz = cfg.z;
    for (let ring = 0; ring < 8; ring++) {
      const candidateX = cfg.x + (ring === 0 ? 0 : Math.cos(ring * 1.1) * (ring * 6));
      const candidateZ = cfg.z + (ring === 0 ? 0 : Math.sin(ring * 1.1) * (ring * 6));
      if (!isNearAnyRoad(candidateX, candidateZ, 8.5)) {
        const res = collisionWorld.resolveCircle(candidateX, candidateZ, 6.2);
        if (!res.hit && getTerrainHeight(candidateX, candidateZ) >= -0.25) {
          sx = candidateX;
          sz = candidateZ;
          break;
        }
      }
    }
    const sy = Math.max(0.05, getTerrainHeight(sx, sz));

    const bldg = new THREE.Group();
    bldg.name = `RadioStation_${cfg.districtId}`;
    bldg.position.set(sx, sy, sz);
    bldg.rotation.y = cfg.rotY;
    root.add(bldg);

    const w = 11.4;
    const d = 8.6;
    const h = 4.3;

    // Exterior shell (4 walls with south 2.8m doorway opening)
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), floorMat);
    floor.position.y = 0.08;
    bldg.add(floor);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.34, d + 0.4), trimMat);
    roof.position.y = h + 0.14;
    bldg.add(roof);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.42), wallMat);
    backWall.position.set(0, h * 0.5, -d * 0.5 + 0.21);
    bldg.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, d), wallMat);
    leftWall.position.set(-w * 0.5 + 0.21, h * 0.5, 0);
    bldg.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, d), wallMat);
    rightWall.position.set(w * 0.5 - 0.21, h * 0.5, 0);
    bldg.add(rightWall);

    // Front wall flanking 2.8m center doorway + lintel
    const sideFrontW = (w - 2.8) * 0.5;
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(sideFrontW, h, 0.42), wallMat);
    frontL.position.set(-w * 0.5 + sideFrontW * 0.5, h * 0.5, d * 0.5 - 0.21);
    bldg.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(sideFrontW, h, 0.42), wallMat);
    frontR.position.set(w * 0.5 - sideFrontW * 0.5, h * 0.5, d * 0.5 - 0.21);
    bldg.add(frontR);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.35, 0.46), wallMat);
    lintel.position.set(0, h - 0.68, d * 0.5 - 0.21);
    bldg.add(lintel);

    // Plain functional exterior roof signage
    const signTex = createPlainRadioSignTexture(cfg.signLabel, `${cfg.districtId} BROADCAST BOOTH`);
    disposableTextures.push(signTex);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissiveMap: signTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });
    const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), signMat);
    signBoard.position.set(0, h + 1.05, d * 0.5 + 0.05);
    bldg.add(signBoard);

    // Roof broadcast antenna mast + pulsing beacon
    const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 4.2, 6), micMetalMat);
    mastBase.position.set(-3.2, h + 2.3, -1.6);
    bldg.add(mastBase);
    const mastTip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 3.6, 6), micMetalMat);
    mastTip.position.set(-3.2, h + 6.1, -1.6);
    bldg.add(mastTip);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: new THREE.Color('#ef4444'),
      emissiveIntensity: 1.8,
    });
    const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), beaconMat);
    beaconBulb.position.set(-3.2, h + 8.0, -1.6);
    bldg.add(beaconBulb);

    // Register perimeter colliders with south doorway cutout
    interiorRegistry.addEnterableRoomColliders(
      collisionWorld,
      sx,
      sz,
      w,
      d,
      cfg.rotY,
      ['south'],
      2.8,
      0.5
    );

    // Culled Interior Studio Booth + Office + 2 Rigged Staff (visible within 52m)
    const interior = new THREE.Group();
    bldg.add(interior);
    interiorRegistry.registerCullGroup(interior, sx, sz, 52);

    // Studio acoustic ceiling strip lights (emissive bars, lightweight for SwiftShader)
    const ceilingBarMat = new THREE.MeshStandardMaterial({
      color: '#fff3db',
      emissive: new THREE.Color('#ffe2b8'),
      emissiveIntensity: 1.5,
    });
    const lightBar1 = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.32), ceilingBarMat);
    lightBar1.position.set(-2.1, h - 0.12, -1.0);
    interior.add(lightBar1);
    const lightBar2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 0.32), ceilingBarMat);
    lightBar2.position.set(2.3, h - 0.12, -0.4);
    interior.add(lightBar2);

    // Broadcast booth glass partition separating Left studio booth from Right office/control area
    const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.7, 5.2), glassBoothMat);
    boothGlass.position.set(0.35, 1.55, -1.1);
    interior.add(boothGlass);
    const boothFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 5.2), trimMat);
    boothFrame.position.set(0.35, 0.45, -1.1);
    interior.add(boothFrame);

    // Glowing ON AIR box inside studio
    const onAirMat = new THREE.MeshStandardMaterial({
      color: '#dc2626',
      emissive: new THREE.Color('#ef4444'),
      emissiveIntensity: 1.65,
    });
    const onAirSign = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.34, 0.16), onAirMat);
    onAirSign.position.set(-2.2, 3.05, -d * 0.5 + 0.56);
    interior.add(onAirSign);

    // Broadcast desk inside studio booth (Left side: x=-2.3, z=-1.5)
    const studioDesk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.78, 1.1), deskMat);
    studioDesk.position.set(-2.3, 0.52, -1.35);
    interior.add(studioDesk);
    const consoleFace = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.52), vuGlowMat);
    consoleFace.position.set(-2.3, 0.94, -1.25);
    consoleFace.rotation.x = 0.22;
    interior.add(consoleFace);

    // Studio boom arm + condenser microphone facing Host
    const micArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 6), micMetalMat);
    micArm.position.set(-2.25, 1.24, -1.45);
    micArm.rotation.x = 0.48;
    interior.add(micArm);
    const micHead = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.16, 8), micMetalMat);
    micHead.position.set(-2.25, 1.48, -1.62);
    interior.add(micHead);

    // Studio monitor speaker boxes on rear acoustic shelf
    for (const mx of [-3.4, -1.2]) {
      const spk = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.28), trimMat);
      spk.position.set(mx, 1.22, -1.78);
      interior.add(spk);
    }

    // Producer / Engineer office desk (Right side: x=2.5, z=-1.4)
    const officeDesk = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.76, 1.0), deskMat);
    officeDesk.position.set(2.5, 0.50, -1.3);
    interior.add(officeDesk);
    const monitorScreen = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.48, 0.06), vuGlowMat);
    monitorScreen.position.set(2.5, 1.15, -1.1);
    interior.add(monitorScreen);

    // Staffed NPCs using existing humanCharacter.ts rig (zero extra cap impact, culled past 52m)
    const hostRig = createRiggedHuman(
      i * 3 + 1,
      textures,
      i % 2 === 0 ? 'cardigan_scarf' : 'tailored_blazer'
    );
    hostRig.root.position.set(-2.25, 0.18, -2.25);
    hostRig.root.rotation.y = 0; // facing +Z toward mic & front doorway
    interior.add(hostRig.root);

    const producerRig = createRiggedHuman(i * 3 + 2, textures, 'metro_worker');
    producerRig.root.position.set(2.5, 0.18, -2.18);
    producerRig.root.rotation.y = 0;
    interior.add(producerRig.root);

    const cos = Math.cos(cfg.rotY);
    const sin = Math.sin(cfg.rotY);
    const worldStudioX = sx + -2.2 * cos + -1.2 * sin;
    const worldStudioZ = sz - -2.2 * sin + -1.2 * cos;

    stations.push({
      id: cfg.id,
      districtId: cfg.districtId,
      signLabel: cfg.signLabel,
      x: sx,
      y: sy,
      z: sz,
      rotY: cfg.rotY,
      studioPos: new THREE.Vector3(worldStudioX, sy + 0.18, worldStudioZ),
      hostRig,
      producerRig,
      beaconMat,
      onAirMat,
    });
  }

  // --- Per-District Perception Loop ---
  const perceptions = new Map<string, DistrictPerception>();
  for (const dId of ALL_DISTRICTS) {
    perceptions.set(dId, {
      districtId: dId,
      authorityScore: 86,
      trustScore: 84,
      policeConvinced: 'convinced',
      publicPerception: 'matches',
      lastIncidentKind: null,
      lastIncidentAt: -999,
    });
  }

  let simClock = 0;
  function recordIncident(districtId: string, kind: string, authHit: number, trustHit: number) {
    const p = perceptions.get(districtId) ?? perceptions.get('D1')!;
    p.authorityScore = Math.max(0, p.authorityScore - authHit);
    p.trustScore = Math.max(0, p.trustScore - trustHit);
    p.policeConvinced = classifyConvinced(p.authorityScore);
    p.publicPerception = classifyPerception(p.trustScore);
    p.lastIncidentKind = kind;
    p.lastIncidentAt = simClock;
  }

  const unsub = worldEventBus.subscribe((ev: WorldEvent) => {
    if (ev.type === 'gunfire') {
      const d = ev.districtId ?? getDistrictAt(ev.x, ev.z).split(' ')[0].trim();
      const hit = ev.shooterKind === 'shooter' ? 14 : ev.shooterKind === 'player' ? 11 : 8;
      recordIncident(d, `${ev.shooterKind}_gunfire`, hit, hit * 0.9);
    } else if (ev.type === 'chase') {
      const d = getDistrictAt(ev.x, ev.z).split(' ')[0].trim();
      recordIncident(d, `chase_${ev.kind}`, 10, 9);
    } else if (ev.type === 'crime') {
      const sev = ev.severity;
      recordIncident(ev.districtId, ev.kind, 12 + sev * 32, 10 + sev * 34);
    }
  });

  function update(
    dt: number,
    elapsed: number,
    focusX: number,
    focusZ: number,
    playerDistrict: string,
    hiddenHeat: number
  ) {
    simClock = elapsed;
    const safeDt = Math.min(0.1, Math.max(0.001, dt));

    // Gentle quiet-time perception recovery + hiddenHeat narrative pressure
    const curDId = playerDistrict.split(' ')[0].trim();
    perceptions.forEach((p, dId) => {
      if (dId === curDId && hiddenHeat > 45) {
        const drain = ((hiddenHeat - 45) / 55) * 1.4 * safeDt;
        p.authorityScore = Math.max(0, p.authorityScore - drain);
        p.trustScore = Math.max(0, p.trustScore - drain * 0.85);
      } else if (elapsed - p.lastIncidentAt > 18) {
        p.authorityScore = Math.min(92, p.authorityScore + 0.85 * safeDt);
        p.trustScore = Math.min(90, p.trustScore + 0.65 * safeDt);
      }
      p.policeConvinced = classifyConvinced(p.authorityScore);
      p.publicPerception = classifyPerception(p.trustScore);
    });

    // Animate staff & studio lights cleanly for nearby stations
    for (let i = 0; i < stations.length; i++) {
      const st = stations[i];
      st.beaconMat.emissiveIntensity = 0.6 + Math.max(0, Math.sin(elapsed * 2.6 + i)) * 2.1;
      const dx = st.x - focusX;
      const dz = st.z - focusZ;
      if (dx * dx + dz * dz < 58 * 58) {
        const perc = perceptions.get(st.districtId)!;
        st.onAirMat.emissiveIntensity = perc.policeConvinced === 'not' ? 2.4 : 1.5;
        applyHumanPose(st.hostRig, {
          mode: 'worker_desk',
          elapsed,
          phase: i * 1.3,
          windStrength: 0.03,
        });
        applyHumanPose(st.producerRig, {
          mode: 'worker_desk',
          elapsed,
          phase: i * 1.3 + 2.1,
          windStrength: 0.03,
        });
      }
    }
  }

  function getDistrictPerception(districtId: string): DistrictPerception {
    const key = districtId.split(' ')[0].trim();
    return perceptions.get(key) ?? perceptions.get('D1')!;
  }

  function getPoliceAlertFactor(districtId: string): number {
    const p = getDistrictPerception(districtId);
    return Math.max(0, Math.min(1, (100 - p.authorityScore) / 85));
  }

  function getActiveBroadcastSubtitle(
    x: number,
    y: number,
    z: number,
    elapsed: number,
    inVehicle: boolean
  ): string {
    void y;
    const distId = getDistrictAt(x, z).split(' ')[0].trim();
    let activeStation: RadioStationSpec | undefined;
    for (const st of stations) {
      if (Math.hypot(x - st.x, z - st.z) < 11.5) {
        activeStation = st;
        break;
      }
    }
    if (!activeStation && !inVehicle) return '';

    const tuned = activeStation ?? stations.find((s) => s.districtId === distId) ?? stations[0];
    const p = getDistrictPerception(tuned.districtId);
    const beat = Math.floor(elapsed / 12) % 3;

    if (p.policeConvinced === 'not' || p.publicPerception === 'turned') {
      if (beat === 0) {
        return `[${tuned.signLabel}] Urgent bulletin: Precinct assurances have collapsed after ${p.lastIncidentKind ?? 'street violence'}.`;
      }
      if (beat === 1) {
        return `[${tuned.signLabel}] Caller: "Police patrols keep claiming calm, but shots are ringing across ${tuned.districtId}."`;
      }
      return `[${tuned.signLabel}] Dispatch alert: Units moving to full checkpoint readiness in ${tuned.districtId}.`;
    }

    if (p.policeConvinced === 'wavering' || p.publicPerception === 'drifting') {
      if (beat === 0) {
        return `[${tuned.signLabel}] Reports of unverified disturbances in ${tuned.districtId}; officers questioning official quiet.`;
      }
      if (beat === 1) {
        return `[${tuned.signLabel}] Listener line: "Something just kicked off two blocks over — officials aren't saying."`;
      }
      return `[${tuned.signLabel}] ${tuned.districtId} traffic slow near crossings; heightened patrol presence.`;
    }

    if (beat === 0) {
      return `[${tuned.signLabel}] Wet pavement advisory across ${tuned.districtId}; districts reporting routine conditions.`;
    }
    if (beat === 1) {
      return `[${tuned.signLabel}] Harbor freight & rail lines running on schedule; authorities report quiet streets.`;
    }
    return `[${tuned.signLabel}] ${tuned.districtId} overnight bulletin: drive cautiously on elevated bridge approaches.`;
  }

  return {
    root,
    stations,
    update,
    getDistrictPerception,
    getAllPerceptions: () => Array.from(perceptions.values()),
    getPoliceAlertFactor,
    getActiveBroadcastSubtitle,
    dispose: () => {
      unsub();
      disposableTextures.forEach((t) => t.dispose());
    },
  };
}
