import * as THREE from 'three';
import { OutfitStyleType } from './humanCharacter';
import {
  BehaviorArchetype,
  BenchWeaponKind,
  GunHandlingState,
  InteractionPoseAction,
  NpcWeaponClass,
  resolveClassWeapon,
} from './behaviorPoseLayers';

export type VignetteId =
  | 'hold_up'
  | 'surround'
  | 'standoff'
  | 'square_off'
  | 'the_tap'
  | 'the_scavenge'
  | 'the_drive_by'
  | 'the_van_snatch'
  | 'the_tail';

export interface VignetteVariant {
  id: string;
  label: string;
  summary: string;
}

export interface VignetteCastSpec {
  id: string;
  label: string;
  role: string;
  npcClass: NpcWeaponClass;
  archetype: BehaviorArchetype;
  variantIdx: number;
  outfit: OutfitStyleType;
  coatColorHex?: string;
  hasFedora?: boolean;
  weaponKind: BenchWeaponKind;
  hasPepperSpray?: boolean;
  hasCashProp?: boolean;
}

function makeClassCast(
  id: string,
  label: string,
  role: string,
  npcClass: NpcWeaponClass,
  opts: {
    variantIdx: number;
    outfit: OutfitStyleType;
    coatColorHex?: string;
    hasFedora?: boolean;
    hasPepperSpray?: boolean;
    hasCashProp?: boolean;
  }
): VignetteCastSpec {
  const resolved = resolveClassWeapon(npcClass);
  return {
    id,
    label,
    role,
    npcClass,
    archetype: resolved.archetype,
    weaponKind: resolved.weaponKind,
    ...opts,
  };
}

export interface VignetteActorFrame {
  castId: string;
  x: number;
  z: number;
  yaw: number;
  walkSpeed: number;
  gunState: GunHandlingState;
  gunStateProgress: number;
  interaction: InteractionPoseAction;
  interactionProgress: number;
  lookTargetId?: string;
  recoilKick?: number;
  handInPocket?: boolean;
  bloodPoolProgress?: number; // 0..1 deterministic persistent blood pool growth
  lootScatterProgress?: number; // 0..1 deterministic turned-out pockets / dropped scraps
  bagged?: boolean; // black hood over head during kidnap
  hidden?: boolean; // inside van after being thrown in
  yOffset?: number; // vertical lift while hoisted / thrown into van cargo bay
}

export interface VignetteCueEvent {
  id: string;
  timeSec: number;
  kind: 'gunshot' | 'pepper_spray' | 'shove_impact' | 'shoulder_tap' | 'kidnap_hook' | 'blood_hit';
  actorId: string;
  targetId?: string;
}

export interface VignetteBeatInfo {
  name: string;
  description: string;
  speaker?: string;
  line?: string;
  hoodOverlayOpacity?: number;
  blackoutOpacity?: number;
  kidnapHookActive?: boolean;
}

export interface VignetteVehicleFrame {
  id: string;
  label: string;
  vehicleType?: 'sedan' | 'van';
  vanDoorOpen?: number; // 0..1 sliding side cargo door open
  x: number;
  z: number;
  yaw: number;
  speedMps: number;
  pitch: number; // + nose dive on braking, - rear squat on acceleration
  braking: boolean;
  weaponOut: boolean;
  recoilKick?: number;
  stateLabel: string;
}

export interface VignetteDefinition {
  id: VignetteId;
  title: string;
  subtitle: string;
  durationSec: number;
  durationForVariant?: (variantId: string) => number;
  instigationNote: string;
  variants: VignetteVariant[];
  defaultVariantId: string;
  cast: (variantId: string) => VignetteCastSpec[];
  cues: (variantId: string) => VignetteCueEvent[];
  evaluate: (
    variantId: string,
    t: number
  ) => {
    actors: VignetteActorFrame[];
    vehicles?: VignetteVehicleFrame[];
    beat: VignetteBeatInfo;
  };
}

export function getVignetteDuration(def: VignetteDefinition, variantId: string): number {
  return def.durationForVariant ? def.durationForVariant(variantId) : def.durationSec;
}

function clamp01(v: number): number {
  return THREE.MathUtils.clamp(v, 0, 1);
}

function seg(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp01((t - start) / (end - start));
}

function smoothSeg(t: number, start: number, end: number): number {
  const x = seg(t, start, end);
  return x * x * (3 - 2 * x);
}

function yawBetween(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bx - ax, bz - az);
}

function lerpYaw(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * clamp01(t);
}

// =============================================================================
// 1. THE HOLD-UP
// =============================================================================
const HOLD_UP: VignetteDefinition = {
  id: 'hold_up',
  title: 'The Hold-Up',
  subtitle: 'Criminal approaches citizen, weapon out, demand; citizen draws from response set',
  durationSec: 12.0,
  durationForVariant: (variantId) => (variantId === 'fight_back_gun_down' ? 15.5 : 12.0),
  instigationNote: 'OPPORTUNITY (criminal vulnerability read) · REBEL (leather + pistol funding)',
  defaultVariantId: 'comply',
  variants: [
    { id: 'comply', label: 'Comply', summary: 'Hands up, hands over cash, low-ready → holster, robber walks away' },
    { id: 'pepper_spray', label: 'Pepper Spray', summary: 'Woman draws pepper spray; robbery collapses' },
    { id: 'fight_back', label: 'Fight Back (Retreat)', summary: 'Strong male citizen shoves back; robber backs off' },
    {
      id: 'fight_back_gun_down',
      label: 'Fight Back → Gun Down & Scavenge',
      summary: 'Citizen shoves back; robber refuses to walk away, guns him down, reloads, and scavenges the body',
    },
    { id: 'flee', label: 'Flee', summary: 'Citizen pivots and sprints away under warning shot + reload → holster' },
    { id: 'freeze', label: 'Freeze', summary: 'Citizen locks up trembling; robber snatches and bolts' },
    { id: 'rebel_girl', label: 'Rebel Girl Hold-Up', summary: 'Rebel Girl holds up mark and holsters clean' },
  ],
  cast: (variantId) => {
    const isRebel = variantId === 'rebel_girl';
    const isFemaleVic = variantId === 'pepper_spray';
    const isStrongMale = variantId === 'fight_back' || variantId === 'fight_back_gun_down';
    return [
      makeClassCast(
        'criminal',
        isRebel ? 'Rebel Girl' : 'Street Robber',
        isRebel ? 'Rebel Underground' : 'Opportunity Robber',
        isRebel ? 'rebel_girl' : 'gang_robber',
        {
          variantIdx: isRebel ? 5 : 12,
          outfit: isRebel ? 'leather_biker' : 'hoodie_parka',
        }
      ),
      makeClassCast(
        'citizen',
        isFemaleVic ? 'Citizen (Woman)' : isStrongMale ? 'Strong Citizen' : 'Citizen',
        isFemaleVic ? 'Pepper Spray Carry' : isStrongMale ? 'Fight-Back Male' : 'Mark',
        isStrongMale ? 'strong_citizen' : 'civilian',
        {
          variantIdx: isFemaleVic ? 1 : isStrongMale ? 2 : 0,
          outfit: isFemaleVic ? 'cardigan_scarf' : 'puffer_jacket',
          hasPepperSpray: isFemaleVic,
          hasCashProp: true,
        }
      ),
    ];
  },
  cues: (variantId) => {
    if (variantId === 'pepper_spray') {
      return [{ id: 'spray_1', timeSec: 5.35, kind: 'pepper_spray', actorId: 'citizen', targetId: 'criminal' }];
    }
    if (variantId === 'flee') {
      return [{ id: 'shot_warn', timeSec: 5.8, kind: 'gunshot', actorId: 'criminal', targetId: 'citizen' }];
    }
    if (variantId === 'fight_back') {
      return [{ id: 'shove_fight', timeSec: 5.35, kind: 'shove_impact', actorId: 'citizen', targetId: 'criminal' }];
    }
    if (variantId === 'fight_back_gun_down') {
      return [
        { id: 'shove_fight_gd', timeSec: 5.35, kind: 'shove_impact', actorId: 'citizen', targetId: 'criminal' },
        { id: 'gd_shot_1', timeSec: 6.95, kind: 'gunshot', actorId: 'criminal', targetId: 'citizen' },
        { id: 'gd_blood_1', timeSec: 7.0, kind: 'blood_hit', actorId: 'citizen', targetId: 'criminal' },
        { id: 'gd_shot_2', timeSec: 7.3, kind: 'gunshot', actorId: 'criminal', targetId: 'citizen' },
        { id: 'gd_blood_2', timeSec: 7.35, kind: 'blood_hit', actorId: 'citizen', targetId: 'criminal' },
        { id: 'gd_shot_3', timeSec: 7.65, kind: 'gunshot', actorId: 'criminal', targetId: 'citizen' },
        { id: 'gd_blood_3', timeSec: 7.7, kind: 'blood_hit', actorId: 'citizen', targetId: 'criminal' },
      ];
    }
    return [];
  },
  evaluate: (variantId, t) => {
    const isRebel = variantId === 'rebel_girl';
    const citBaseX = -3.8 + smoothSeg(t, 0, 2.8) * 3.1;
    const citBaseZ = 0.2;
    const crimStartX = 4.2;
    const crimStartZ = -1.6;
    const crimStopX = 1.05;
    const crimStopZ = 0.2;

    const appT = smoothSeg(t, 0, 3.0);
    let crimX = THREE.MathUtils.lerp(crimStartX, crimStopX, appT);
    let crimZ = THREE.MathUtils.lerp(crimStartZ, crimStopZ, appT);
    let crimYaw = yawBetween(crimX, crimZ, citBaseX, citBaseZ);
    let crimWalk = t < 2.95 ? 1.55 : 0;
    let crimGun: GunHandlingState = 'holstered';
    let crimGunProg = 0;
    let crimInt: InteractionPoseAction = 'none';
    let crimIntProg = 0;
    let crimRecoil = 0;

    let citX = citBaseX;
    let citZ = citBaseZ;
    let citYaw = t < 2.3 ? Math.PI * 0.5 : lerpYaw(Math.PI * 0.5, yawBetween(citX, citZ, crimX, crimZ), smoothSeg(t, 2.3, 3.1));
    let citWalk = t < 2.5 ? 1.1 : 0;
    const citGun: GunHandlingState = 'unarmed';
    let citInt: InteractionPoseAction = 'none';
    let citIntProg = 0;
    let citBloodPoolProgress = 0;
    let citLootScatterProgress = 0;

    let beat: VignetteBeatInfo = {
      name: '01 · Opportunity Approach',
      description: isRebel
        ? 'Rebel Girl closes in across the pavement, reading an unguarded mark.'
        : 'Robber spots an isolated pedestrian and cuts the angle with impatient gang stride.',
    };

    if (t >= 2.4 && t < 3.6) {
      crimGun = 'draw';
      crimGunProg = seg(t, 2.4, 3.3);
      beat = {
        name: '02 · Draw & Demand',
        description: 'Weapon clears the coat/holster visibly as personal space collapses.',
        speaker: isRebel ? 'Rebel Girl' : 'Robber',
        line: isRebel
          ? 'Keep your voice down. Wallet and coat money — for the underground.'
          : 'Don’t look around. Empty your pockets right now.',
      };
    } else if (t >= 3.6 && t < 5.0) {
      crimGun = 'aim';
      beat = {
        name: '02 · Draw & Demand',
        description: 'Weapon leveled at chest height; citizen reads the threat.',
        speaker: isRebel ? 'Rebel Girl' : 'Robber',
        line: isRebel
          ? 'Keep your voice down. Wallet and coat money — for the underground.'
          : 'Don’t look around. Empty your pockets right now.',
      };
    }

    if (variantId === 'comply' || variantId === 'rebel_girl') {
      if (t >= 3.2 && t < 5.0) {
        citInt = 'hands_up';
      } else if (t >= 5.0 && t < 7.3) {
        citInt = 'comply_give';
        citIntProg = seg(t, 5.0, 7.0);
        crimGun = 'aim';
        beat = {
          name: '03 · Citizen Response: Comply',
          description: 'Citizen surrenders cash with raised hands; compliance avoids escalation.',
          speaker: 'Citizen',
          line: 'Take it — take all of it. Just put that down.',
        };
      } else if (t >= 7.3 && t < 9.3) {
        citInt = 'hands_up';
        if (t < 8.1) {
          crimGun = 'low_ready';
        } else {
          crimGun = 'holster';
          crimGunProg = seg(t, 8.1, 9.2);
        }
        beat = {
          name: '04 · Low-Ready → Holster & Exit',
          description: 'Robber pockets the cash, drops to low-ready, holsters cleanly, and clears the block.',
          speaker: isRebel ? 'Rebel Girl' : 'Robber',
          line: 'Stay facing the wall. Ten seconds.',
        };
      } else if (t >= 9.3) {
        const leaveT = smoothSeg(t, 9.3, 12.0);
        crimX = THREE.MathUtils.lerp(crimStopX, 5.4, leaveT);
        crimZ = THREE.MathUtils.lerp(crimStopZ, -2.0, leaveT);
        crimYaw = yawBetween(crimStopX, crimStopZ, 5.4, -2.0);
        crimWalk = 1.65;
        crimGun = 'holstered';
        citInt = t < 10.6 ? 'hands_up' : 'none';
        beat = {
          name: '04 · De-Escalation & Exit',
          description: 'Robbery concludes without gunfire; citizen survives.',
        };
      }
    } else if (variantId === 'pepper_spray') {
      if (t >= 3.3 && t < 4.9) {
        citInt = 'hands_up';
      } else if (t >= 4.9 && t < 6.8) {
        citInt = 'pepper_spray';
        citIntProg = seg(t, 4.9, 6.6);
        if (t < 5.45) {
          crimGun = 'aim';
        } else {
          crimInt = 'sprayed_stagger';
          crimGun = 'holstered';
          crimX = THREE.MathUtils.lerp(crimStopX, 1.85, smoothSeg(t, 5.45, 6.7));
        }
        beat = {
          name: '03 · Citizen Response: Pepper Spray',
          description: 'Defensive aerosol blast blinds the robber — robbery collapses immediately.',
          speaker: 'Citizen (Woman)',
          line: 'Get away from me!',
        };
      } else if (t >= 6.8) {
        crimInt = 'sprayed_stagger';
        crimGun = 'holstered';
        crimX = 1.85;
        const backT = smoothSeg(t, 6.8, 11.4);
        citX = THREE.MathUtils.lerp(citBaseX, -5.0, backT);
        citZ = THREE.MathUtils.lerp(citBaseZ, 1.6, backT);
        citYaw = yawBetween(citBaseX, citBaseZ, -5.0, 1.6);
        citWalk = 2.6;
        citInt = 'flee';
        beat = {
          name: '04 · Robbery Collapses',
          description: 'Sprayed attacker doubles over rubbing eyes while citizen clears the street.',
          speaker: 'Street Robber',
          line: 'Gah— my eyes! Damn it—!',
        };
      }
    } else if (variantId === 'fight_back') {
      if (t >= 3.3 && t < 4.9) {
        citInt = 'block';
        beat = {
          name: '03 · Citizen Squares Up',
          description: 'Strong male citizen refuses to fold and steps inside the muzzle.',
          speaker: 'Strong Citizen',
          line: 'You’re shaking, kid. Put the piece away.',
        };
      } else if (t >= 4.9 && t < 6.5) {
        const rushT = smoothSeg(t, 4.9, 5.55);
        citX = THREE.MathUtils.lerp(citBaseX, 0.25, rushT);
        citInt = 'fight_back';
        citIntProg = seg(t, 5.1, 6.3);
        if (t < 5.35) {
          crimGun = 'aim';
        } else {
          crimInt = 'shoved_recoil';
          crimIntProg = seg(t, 5.35, 6.4);
          crimGun = 'low_ready';
          crimX = THREE.MathUtils.lerp(crimStopX, 2.3, smoothSeg(t, 5.35, 6.3));
        }
        beat = {
          name: '03 · Citizen Response: Fight Back',
          description: 'Citizen drives a hard shove into the robber’s chest, breaking his aim.',
          speaker: 'Strong Citizen',
          line: 'Get out of my face!',
        };
      } else if (t >= 6.5) {
        citX = 0.25;
        citInt = 'block';
        if (t < 7.6) {
          crimGun = 'low_ready';
        } else if (t < 8.6) {
          crimGun = 'holster';
          crimGunProg = seg(t, 7.6, 8.5);
        } else {
          crimGun = 'holstered';
        }
        const retT = smoothSeg(t, 7.4, 11.4);
        crimX = THREE.MathUtils.lerp(2.3, 5.2, retT);
        crimZ = THREE.MathUtils.lerp(crimStopZ, -1.5, retT);
        crimYaw = t < 8.6 ? yawBetween(crimX, crimZ, citX, citZ) : yawBetween(2.3, crimStopZ, 5.2, -1.5);
        crimWalk = retT > 0 && retT < 1 ? 1.85 : 0;
        crimInt = t < 8.2 ? 'back_down' : 'none';
        beat = {
          name: '04 · Robber Retreats (Crew Remembers)',
          description: 'Beaten robber backs off; crew remembers a resisting mark.',
          speaker: 'Street Robber',
          line: 'Crazy bastard… this isn’t over.',
        };
      }
    } else if (variantId === 'fight_back_gun_down') {
      if (t >= 3.3 && t < 4.9) {
        citInt = 'block';
        beat = {
          name: '03 · Citizen Squares Up',
          description: 'Strong male citizen refuses to fold and steps inside the muzzle.',
          speaker: 'Strong Citizen',
          line: 'You’re shaking, kid. Put the piece away.',
        };
      } else if (t >= 4.9 && t < 6.45) {
        const rushT = smoothSeg(t, 4.9, 5.55);
        citX = THREE.MathUtils.lerp(citBaseX, 0.25, rushT);
        citInt = 'fight_back';
        citIntProg = seg(t, 5.1, 6.3);
        if (t < 5.35) {
          crimGun = 'aim';
        } else {
          crimInt = 'shoved_recoil';
          crimIntProg = seg(t, 5.35, 6.4);
          crimGun = 'low_ready';
          crimX = THREE.MathUtils.lerp(crimStopX, 2.15, smoothSeg(t, 5.35, 6.3));
        }
        beat = {
          name: '03 · Citizen Response: Fight Back',
          description: 'Citizen drives a hard shove into the robber’s chest — this time the robber rolls NOT to walk away.',
          speaker: 'Strong Citizen',
          line: 'Get out of my face!',
        };
      } else if (t >= 6.45 && t < 8.35) {
        citX = 0.25;
        crimX = 2.15;
        if (t < 6.9) {
          crimGun = 'aim';
          citInt = 'block';
        } else if (t < 7.85) {
          crimGun = 'fire';
          const s1 = t >= 6.95 && t < 7.15 ? 1 - (t - 6.95) / 0.2 : 0;
          const s2 = t >= 7.3 && t < 7.5 ? 1 - (t - 7.3) / 0.2 : 0;
          const s3 = t >= 7.65 && t < 7.85 ? 1 - (t - 7.65) / 0.2 : 0;
          crimRecoil = Math.max(s1, s2, s3);
          if (t >= 7.05 && t < 7.75) {
            citInt = 'shoved_recoil';
            citIntProg = seg(t, 7.05, 7.75);
          } else if (t >= 7.75) {
            citInt = 'downed';
          }
        } else {
          crimGun = 'low_ready';
          citInt = 'downed';
        }
        citBloodPoolProgress = smoothSeg(t, 7.65, 14.5) * 0.25;
        beat = {
          name: '04 · Killer Roll: Guns Citizen Down',
          description: 'Criminal refuses to walk away after the shove, levels carbine, and guns the citizen down.',
          speaker: 'Street Robber',
          line: 'Put hands on me?! Stay down!',
        };
      } else if (t >= 8.35) {
        citX = 0.25;
        citInt = 'downed';
        citBloodPoolProgress = smoothSeg(t, 7.65, 14.5);
        if (t < 9.75) {
          // Reload fresh magazine while closing in on the body, then holster onto sling
          const stepT = smoothSeg(t, 8.85, 9.75);
          crimX = THREE.MathUtils.lerp(2.15, citX + 0.62, stepT);
          crimZ = THREE.MathUtils.lerp(crimStopZ, citZ + 0.42, stepT);
          crimYaw = yawBetween(crimX, crimZ, citX + 0.15, citZ);
          crimWalk = stepT > 0 && stepT < 1 ? 1.45 : 0;
          if (t < 9.35) {
            crimGun = 'reload';
            crimGunProg = seg(t, 8.35, 9.35);
          } else if (t < 9.75) {
            crimGun = 'holster';
            crimGunProg = seg(t, 9.35, 9.75);
          } else {
            crimGun = 'holstered';
          }
          beat = {
            name: '05 · Reload → Holster → Close In',
            description: 'Robber swaps in a fresh magazine, slings the carbine, and steps over the downed citizen.',
          };
        } else if (t < 13.55) {
          crimX = citX + 0.62;
          crimZ = citZ + 0.42;
          crimYaw = yawBetween(crimX, crimZ, citX + 0.15, citZ);
          crimWalk = 0;
          crimGun = 'holstered';
          crimInt = 'scavenge_kneel';
          crimIntProg = seg(t, 9.75, 13.55);
          citLootScatterProgress = smoothSeg(t, 10.1, 13.0);
          beat = {
            name: '06 · Real-Time Scavenge (Exposed at Scene)',
            description:
              'Robber kneels over the dead body for nearly 4 seconds, turning coat pockets out and glancing nervously down the street.',
            speaker: 'Street Robber',
            line: 'Hold still… where’d you stash the wallet—',
          };
        } else {
          citLootScatterProgress = 1.0;
          const leaveT = smoothSeg(t, 13.55, 15.5);
          crimX = THREE.MathUtils.lerp(citX + 0.62, 5.6, leaveT);
          crimZ = THREE.MathUtils.lerp(citZ + 0.42, -1.8, leaveT);
          crimYaw = yawBetween(citX + 0.62, citZ + 0.42, 5.6, -1.8);
          crimWalk = 2.95;
          crimGun = 'holstered';
          crimInt = 'flee';
          beat = {
            name: '07 · Looted Body Left Behind',
            description:
              'Robber bolts with the take; the persistent body, turned-out pockets, empty wallet, and blood pool remain on the pavement.',
          };
        }
      }
    } else if (variantId === 'flee') {
      if (t >= 3.2 && t < 4.7) {
        citInt = 'hands_up';
      } else if (t >= 4.7) {
        const runT = smoothSeg(t, 4.7, 11.2);
        citX = THREE.MathUtils.lerp(citBaseX, -7.2, runT);
        citZ = THREE.MathUtils.lerp(citBaseZ, -2.4, runT);
        citYaw = yawBetween(citBaseX, citBaseZ, -7.2, -2.4);
        citWalk = 4.2;
        citInt = 'flee';
        crimYaw = yawBetween(crimX, crimZ, citX, citZ);
        if (t < 6.4) {
          crimGun = t > 5.7 && t < 6.2 ? 'fire' : 'aim';
          crimRecoil = t >= 5.8 && t < 6.05 ? 1 - (t - 5.8) / 0.25 : 0;
        } else if (t < 7.2) {
          crimGun = 'low_ready';
        } else if (t < 8.4) {
          crimGun = 'reload';
          crimGunProg = seg(t, 7.2, 8.4);
        } else if (t < 9.5) {
          crimGun = 'holster';
          crimGunProg = seg(t, 8.4, 9.4);
        } else {
          crimGun = 'holstered';
        }
        beat = {
          name: t < 6.5 ? '03 · Citizen Response: Flee' : '04 · Reload → Holster After Escape',
          description:
            t < 6.5
              ? 'Citizen bolts at full sprint; robber fires a panicked warning round wide.'
              : 'Citizen breaks sightline; robber drops to low-ready, reloads, and slings carbine.',
          speaker: t < 6.6 ? 'Street Robber' : undefined,
          line: t < 6.6 ? 'Hey! Stop running!' : undefined,
        };
      }
    } else if (variantId === 'freeze') {
      if (t >= 3.2 && t < 8.6) {
        citInt = 'freeze';
        if (t >= 5.0 && t < 6.8) {
          const stepT = Math.sin(seg(t, 5.0, 6.8) * Math.PI);
          crimX = THREE.MathUtils.lerp(crimStopX, -0.1, stepT);
          crimGun = 'low_ready';
          crimInt = 'shove';
          crimIntProg = seg(t, 5.3, 6.3);
        } else if (t >= 6.8) {
          crimGun = t < 8.2 ? 'holster' : 'holstered';
          crimGunProg = seg(t, 6.8, 8.0);
        }
        beat = {
          name: '03 · Citizen Response: Freeze',
          description: 'Citizen locks rigid in shock; robber steps in, pockets cash, shoves clear.',
          speaker: 'Street Robber',
          line: 'Smart. Stand right there and don’t breathe.',
        };
      } else if (t >= 8.6) {
        citInt = 'freeze';
        const leaveT = smoothSeg(t, 8.6, 11.8);
        crimX = THREE.MathUtils.lerp(crimStopX, 5.2, leaveT);
        crimYaw = yawBetween(crimStopX, crimStopZ, 5.2, crimStopZ);
        crimWalk = 1.7;
        crimGun = 'holstered';
        beat = {
          name: '04 · Witness Aftermath',
          description: 'Robber departs unhurried while frozen victim remains shaken on the curb.',
        };
      }
    }

    return {
      actors: [
        {
          castId: 'criminal',
          x: crimX,
          z: crimZ,
          yaw: crimYaw,
          walkSpeed: crimWalk,
          gunState: crimGun,
          gunStateProgress: crimGunProg,
          interaction: crimInt,
          interactionProgress: crimIntProg,
          lookTargetId: 'citizen',
          recoilKick: crimRecoil,
        },
        {
          castId: 'citizen',
          x: citX,
          z: citZ,
          yaw: citYaw,
          walkSpeed: citWalk,
          gunState: citGun,
          gunStateProgress: 0,
          interaction: citInt,
          interactionProgress: citIntProg,
          lookTargetId: citInt === 'downed' ? undefined : 'criminal',
          bloodPoolProgress: citBloodPoolProgress,
          lootScatterProgress: citLootScatterProgress,
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 2. THE SURROUND
// =============================================================================
const SURROUND: VignetteDefinition = {
  id: 'surround',
  title: 'The Surround',
  subtitle: 'Gang pack drifts around a mark; botherer shoves; escalation one rung at a time',
  durationSec: 12.5,
  durationForVariant: (variantId) => (variantId === 'escalate_robbery' ? 13.8 : 12.5),
  instigationNote: 'OPPORTUNITY + PACK DRIFT · Hothead vs Calm Crew Member inside one crew',
  defaultVariantId: 'escalate_robbery',
  variants: [
    { id: 'escalate_robbery', label: 'Escalate to Robbery', summary: 'Harassment → shove → warning burst → reload & holster' },
    { id: 'de_escalate', label: 'Stop at Harassment', summary: 'Botherer shoves for dominance, then crew drifts off' },
  ],
  cast: () => [
    makeClassCast('mark', 'Civilian Mark', 'Outnumbered Citizen', 'civilian', {
      variantIdx: 4,
      outfit: 'cardigan_scarf',
    }),
    makeClassCast('botherer', 'Hothead Botherer', 'Gang Hothead (Shove)', 'gang_botherer', {
      variantIdx: 8,
      outfit: 'hoodie_parka',
    }),
    makeClassCast('leader', 'Crew Leader', 'Gang Leader (Armed)', 'gang_member', {
      variantIdx: 14,
      outfit: 'gang_2059',
    }),
    makeClassCast('flanker', 'Calm Member', 'Crew Flanker (Blocks Exit)', 'gang_botherer', {
      variantIdx: 11,
      outfit: 'leather_biker',
    }),
  ],
  cues: (variantId) =>
    variantId === 'escalate_robbery'
      ? [
          { id: 'surround_shove', timeSec: 5.55, kind: 'shove_impact', actorId: 'botherer', targetId: 'mark' },
          { id: 'surround_shot_1', timeSec: 8.65, kind: 'gunshot', actorId: 'leader', targetId: 'mark' },
          { id: 'surround_shot_2', timeSec: 9.0, kind: 'gunshot', actorId: 'leader', targetId: 'mark' },
        ]
      : [{ id: 'surround_shove', timeSec: 5.55, kind: 'shove_impact', actorId: 'botherer', targetId: 'mark' }],
  evaluate: (variantId, t) => {
    const markStartX = -2.2;
    const markStopX = -0.2;
    const mWalkT = smoothSeg(t, 0, 2.8);
    let markX = THREE.MathUtils.lerp(markStartX, markStopX, mWalkT);
    const markZ = 0;
    const markWalk = t < 2.75 ? 1.15 : 0;
    let markInt: InteractionPoseAction = 'none';
    let markIntProg = 0;

    const leadApp = smoothSeg(t, 0.3, 3.3);
    const leadX = THREE.MathUtils.lerp(3.8, 1.35, leadApp);
    const leadZ = THREE.MathUtils.lerp(-1.2, -0.15, leadApp);
    let leadGun: GunHandlingState = 'holstered';
    let leadGunProg = 0;
    let leadInt: InteractionPoseAction = t >= 3.3 && t < 5.0 ? 'block' : 'none';
    let leadRecoil = 0;

    const bothApp = smoothSeg(t, 0.2, 3.6);
    let bothX = THREE.MathUtils.lerp(2.4, 0.72, bothApp);
    let bothZ = THREE.MathUtils.lerp(2.8, 0.95, bothApp);
    let bothInt: InteractionPoseAction = 'none';
    let bothIntProg = 0;

    const flankApp = smoothSeg(t, 0.5, 4.0);
    const flankX = THREE.MathUtils.lerp(1.4, -1.55, flankApp);
    const flankZ = THREE.MathUtils.lerp(-3.2, -0.7, flankApp);
    let flankInt: InteractionPoseAction = t >= 4.0 ? 'block' : 'none';

    let beat: VignetteBeatInfo = {
      name: '01 · Pack Drift',
      description: 'Three crew members peel off from the corner and close the mark’s walking lane.',
    };

    if (t >= 3.0 && t < 5.1) {
      markInt = 'freeze';
      bothInt = 'talk_at';
      beat = {
        name: '02 · Rung 1: Crowd & Block',
        description: 'Leader walls the front path while flanker seals the rear; botherer crowds in.',
        speaker: 'Hothead Botherer',
        line: 'Where do you think you’re walking so fast, friend?',
      };
    } else if (t >= 5.1 && t < 6.8) {
      const lunge = Math.sin(seg(t, 5.1, 6.2) * Math.PI);
      bothX = THREE.MathUtils.lerp(0.72, 0.15, lunge);
      bothZ = THREE.MathUtils.lerp(0.95, 0.28, lunge);
      bothInt = 'shove';
      bothIntProg = seg(t, 5.2, 6.1);
      if (t >= 5.5) {
        markX = THREE.MathUtils.lerp(-0.2, -0.82, smoothSeg(t, 5.5, 6.3));
        markInt = 'shoved_recoil';
        markIntProg = seg(t, 5.5, 6.6);
      }
      beat = {
        name: '03 · Rung 2: Botherer Shoves',
        description: 'Hothead steps inside and drives a hard two-handed shove; calm flanker watches.',
        speaker: 'Hothead Botherer',
        line: 'Look at me when I talk to you!',
      };
    } else if (t >= 6.8) {
      markX = -0.82;
      if (variantId === 'escalate_robbery') {
        if (t < 7.8) {
          leadGun = 'draw';
          leadGunProg = seg(t, 6.8, 7.7);
          markInt = 'hands_up';
        } else if (t < 8.6) {
          leadGun = 'aim';
          markInt = 'hands_up';
        } else if (t < 9.4) {
          leadGun = 'fire';
          const s1 = t >= 8.65 && t < 8.85 ? 1 - (t - 8.65) / 0.2 : 0;
          const s2 = t >= 9.0 && t < 9.2 ? 1 - (t - 9.0) / 0.2 : 0;
          leadRecoil = Math.max(s1, s2);
          markInt = 'freeze';
        } else if (t < 10.3) {
          leadGun = 'low_ready';
          markInt = 'hands_up';
        } else if (t < 12.1) {
          leadGun = 'reload';
          leadGunProg = seg(t, 10.3, 12.0);
          markInt = 'hands_up';
        } else if (t < 13.2) {
          leadGun = 'holster';
          leadGunProg = seg(t, 12.1, 13.1);
          markInt = 'hands_up';
        } else {
          leadGun = 'holstered';
          markInt = 'hands_up';
        }
        beat = {
          name: t < 9.5 ? '04 · Rung 3: Escalate to Robbery' : '05 · Low-Ready → Reload → Holster',
          description:
            t < 9.5
              ? 'Leader draws canted gang pistol, fires two warning shots by the curb, and pins the mark.'
              : 'Leader drops to low-ready, swaps fresh magazine, and holsters the pistol cleanly.',
          speaker: t < 10.5 ? 'Crew Leader' : undefined,
          line: t < 10.5 ? 'Enough noise. Watch and wallet on the ground.' : undefined,
        };
      } else {
        markInt = t < 9.4 ? 'freeze' : 'none';
        bothInt = t < 8.6 ? 'point' : 'none';
        bothIntProg = seg(t, 6.8, 8.5);
        leadInt = 'none';
        flankInt = 'none';
        const driftOut = smoothSeg(t, 8.8, 12.2);
        bothX += driftOut * 3.6;
        bothZ += driftOut * 1.4;
        beat = {
          name: '04 · De-Escalate at Dominance',
          description: 'Botherer got the dominance he wanted; crew laughs it off without drawing iron.',
          speaker: 'Hothead Botherer',
          line: 'Yeah, keep your head down next time.',
        };
      }
    }

    const markYaw = t < 2.8 ? Math.PI * 0.5 : yawBetween(markX, markZ, bothX, bothZ);

    return {
      actors: [
        {
          castId: 'mark',
          x: markX,
          z: markZ,
          yaw: markYaw,
          walkSpeed: markWalk,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: markInt,
          interactionProgress: markIntProg,
          lookTargetId: 'botherer',
        },
        {
          castId: 'botherer',
          x: bothX,
          z: bothZ,
          yaw: yawBetween(bothX, bothZ, markX, markZ),
          walkSpeed: t < 3.5 || (variantId === 'de_escalate' && t > 8.8) ? 1.5 : 0,
          gunState: 'holstered',
          gunStateProgress: 0,
          interaction: bothInt,
          interactionProgress: bothIntProg,
          lookTargetId: 'mark',
        },
        {
          castId: 'leader',
          x: leadX,
          z: leadZ,
          yaw: yawBetween(leadX, leadZ, markX, markZ),
          walkSpeed: t < 3.3 ? 1.35 : 0,
          gunState: leadGun,
          gunStateProgress: leadGunProg,
          interaction: leadInt,
          interactionProgress: 0,
          lookTargetId: 'mark',
          recoilKick: leadRecoil,
        },
        {
          castId: 'flanker',
          x: flankX,
          z: flankZ,
          yaw: yawBetween(flankX, flankZ, markX, markZ),
          walkSpeed: t < 4.0 ? 1.45 : 0,
          gunState: 'holstered',
          gunStateProgress: 0,
          interaction: flankInt,
          interactionProgress: 0,
          lookTargetId: 'mark',
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 3. THE STANDOFF
// =============================================================================
const STANDOFF: VignetteDefinition = {
  id: 'standoff',
  title: 'The Standoff',
  subtitle: 'Both sides armed; robber weighs the mark and can back down',
  durationSec: 12.0,
  durationForVariant: (variantId) => (variantId === 'shootout' ? 13.2 : 12.0),
  instigationNote: 'ARMAMENT MATRIX · Both Armed (calm/weighing robber vs carrying citizen)',
  defaultVariantId: 'back_down',
  variants: [
    { id: 'back_down', label: 'Robber Backs Down', summary: 'Robber weighs the steady mark, lowers gun, holsters, backs away' },
    { id: 'shootout', label: 'Shootout', summary: 'Nerves snap; live bursts, combat kneel-roll, reload & holster' },
  ],
  cast: () => [
    makeClassCast('robber', 'Armed Robber', 'Weighing Mark (Gang)', 'gang_robber', {
      variantIdx: 16,
      outfit: 'gang_2059',
    }),
    makeClassCast('mark', 'Armed Citizen', 'Concealed Carry', 'armed_citizen', {
      variantIdx: 6,
      outfit: 'puffer_jacket',
    }),
  ],
  cues: (variantId) =>
    variantId === 'shootout'
      ? [
          { id: 'st_shot_1', timeSec: 6.45, kind: 'gunshot', actorId: 'robber', targetId: 'mark' },
          { id: 'st_shot_2', timeSec: 6.72, kind: 'gunshot', actorId: 'mark', targetId: 'robber' },
          { id: 'st_shot_3', timeSec: 7.05, kind: 'gunshot', actorId: 'robber', targetId: 'mark' },
          { id: 'st_shot_4', timeSec: 7.35, kind: 'gunshot', actorId: 'mark', targetId: 'robber' },
          { id: 'st_blood', timeSec: 7.4, kind: 'blood_hit', actorId: 'robber', targetId: 'mark' },
        ]
      : [],
  evaluate: (variantId, t) => {
    const appT = smoothSeg(t, 0, 2.5);
    let robX = THREE.MathUtils.lerp(4.0, 1.8, appT);
    let robZ = THREE.MathUtils.lerp(-0.8, 0, appT);
    let robWalk = t < 2.45 ? 1.5 : 0;
    let robGun: GunHandlingState = 'holstered';
    let robGunProg = 0;
    let robInt: InteractionPoseAction = 'none';
    let robRecoil = 0;
    let robBloodPool = 0;

    const markX = -1.8;
    const markZ = 0;
    let markGun: GunHandlingState = 'holstered';
    let markGunProg = 0;
    const markInt: InteractionPoseAction = 'none';
    let markRecoil = 0;

    let beat: VignetteBeatInfo = {
      name: '01 · Demand With Carbine',
      description: 'Robber closes distance and swings carbine off shoulder sling.',
    };

    if (t >= 1.8 && t < 3.0) {
      robGun = 'draw';
      robGunProg = seg(t, 1.8, 2.8);
      beat = {
        name: '01 · Demand With Carbine',
        description: 'Robber draws and levels carbine across the lane.',
        speaker: 'Armed Robber',
        line: 'Hands out of your coat. Now.',
      };
    } else if (t >= 3.0 && t < 4.5) {
      robGun = 'aim';
      markGun = 'draw';
      markGunProg = seg(t, 3.2, 4.15);
      beat = {
        name: '02 · Mark Counter-Draws',
        description: 'Citizen doesn’t flinch — draws concealed pistol cleanly to eye level.',
        speaker: 'Armed Citizen',
        line: 'Wrong coat to try that on.',
      };
    } else if (t >= 4.5 && t < 6.4) {
      robGun = 'aim';
      markGun = 'aim';
      beat = {
        name: '03 · Weighed Standoff',
        description: 'Both sides armed. Robber reads the mark’s steady two-hand stance and calculates the odds.',
        speaker: 'Armed Robber',
        line: '…Easy. Nobody asked for a body.',
      };
    } else if (t >= 6.4) {
      if (variantId === 'back_down') {
        if (t < 9.6) markGun = 'aim';
        else if (t < 10.6) markGun = 'low_ready';
        else {
          markGun = 'holster';
          markGunProg = seg(t, 10.6, 11.7);
        }

        if (t < 7.6) {
          robGun = 'low_ready';
          robInt = 'back_down';
        } else if (t < 8.8) {
          robGun = 'holster';
          robGunProg = seg(t, 7.6, 8.7);
          robInt = 'back_down';
        } else {
          robGun = 'holstered';
          const retT = smoothSeg(t, 8.2, 11.8);
          robX = THREE.MathUtils.lerp(1.8, 4.9, retT);
          robZ = THREE.MathUtils.lerp(0, -1.0, retT);
          robWalk = 1.25;
          robInt = t < 9.5 ? 'back_down' : 'none';
        }
        beat = {
          name: '04 · Robber Backs Down',
          description: 'De-escalation is real: robber lowers gun, shows open palm, holsters, and backs out.',
          speaker: t < 9.2 ? 'Armed Robber' : undefined,
          line: t < 9.2 ? 'Walk on. Forget my face.' : undefined,
        };
      } else {
        robBloodPool = smoothSeg(t, 7.45, 12.8);
        if (t < 7.6) {
          robGun = 'fire';
          markGun = 'fire';
          robRecoil = (t >= 6.45 && t < 6.65) || (t >= 7.05 && t < 7.25) ? 0.9 : 0;
          markRecoil = (t >= 6.72 && t < 6.92) || (t >= 7.35 && t < 7.55) ? 0.9 : 0;
          beat = {
            name: '04 · Exchange of Fire',
            description: 'Standoff breaks into close-range gunfire with shared weapon tracers.',
            speaker: 'Armed Citizen',
            line: 'Drop it!',
          };
        } else if (t < 9.1) {
          markGun = 'kneel_roll';
          markGunProg = seg(t, 7.6, 8.8);
          robInt = 'downed';
          robGun = 'holstered';
          beat = {
            name: '04 · Kneel Roll & Casualty',
            description: 'Citizen executes combat kneel-roll; robber drops to the wet asphalt.',
          };
        } else if (t < 9.9) {
          markGun = 'low_ready';
          robInt = 'downed';
          robGun = 'holstered';
          beat = {
            name: '05 · Low-Ready Check',
            description: 'Citizen holds low-ready over the downed attacker while scanning the block.',
          };
        } else if (t < 11.6) {
          markGun = 'reload';
          markGunProg = seg(t, 9.9, 11.5);
          robInt = 'downed';
          robGun = 'holstered';
          beat = {
            name: '05 · Tactical Reload',
            description: 'Citizen drops spent pistol magazine and seats a fresh one cleanly.',
          };
        } else if (t < 12.6) {
          markGun = 'holster';
          markGunProg = seg(t, 11.6, 12.5);
          robInt = 'downed';
          robGun = 'holstered';
          beat = {
            name: '06 · Holster & Aftermath',
            description: 'Pistol returns to coat holster; body and dark maroon blood pool remain on the pavement.',
          };
        } else {
          markGun = 'holstered';
          robInt = 'downed';
          robGun = 'holstered';
          beat = {
            name: '06 · Aftermath',
            description: 'Body remains on pavement — citizens and robbers both die for real.',
          };
        }
      }
    }

    return {
      actors: [
        {
          castId: 'robber',
          x: robX,
          z: robZ,
          yaw: yawBetween(robX, robZ, markX, markZ),
          walkSpeed: robWalk,
          gunState: robGun,
          gunStateProgress: robGunProg,
          interaction: robInt,
          interactionProgress: 0,
          lookTargetId: robInt === 'downed' ? undefined : 'mark',
          recoilKick: robRecoil,
          bloodPoolProgress: robBloodPool,
        },
        {
          castId: 'mark',
          x: markX,
          z: markZ,
          yaw: yawBetween(markX, markZ, robX, robZ),
          walkSpeed: 0,
          gunState: markGun,
          gunStateProgress: markGunProg,
          interaction: markInt,
          interactionProgress: 0,
          lookTargetId: 'robber',
          recoilKick: markRecoil,
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 4. THE SQUARE-OFF
// =============================================================================
const SQUARE_OFF: VignetteDefinition = {
  id: 'square_off',
  title: 'The Square-Off',
  subtitle: 'Rival gangs fist-fight in the street, then backpedal into opposing concrete cover for a long-range firefight',
  durationSec: 17.5,
  durationForVariant: (variantId) => (variantId === 'street_firefight' ? 17.5 : 13.5),
  instigationNote: 'FACTION · Brawl → Tactical Retreat → Cover-to-Cover Long-Range Firefight (~13m lane)',
  defaultVariantId: 'street_firefight',
  variants: [
    {
      id: 'street_firefight',
      label: 'Brawl → Cover Firefight',
      summary: 'Face-off & fist fight → backpedal drawing weapons → crouch behind opposing barriers for a 13m firefight',
    },
    {
      id: 'skhodka_standoff',
      label: 'Brawl → Cover Standoff',
      summary: 'Fist fight escalates to backing into opposing barriers with guns leveled across the street before separating',
    },
  ],
  cast: () => [
    makeClassCast('gang_a1', 'Red-Trim Crew Lead', 'Rival Gang A (West Cover)', 'gang_leader', {
      variantIdx: 15,
      outfit: 'gang_2059',
    }),
    makeClassCast('gang_a2', 'Red-Trim Flanker', 'Rival Gang A (West Block)', 'gang_member', {
      variantIdx: 10,
      outfit: 'hoodie_parka',
    }),
    makeClassCast('gang_b1', 'Port Brigade Enforcer', 'Rival Crew B (East Cover)', 'mob_enforcer', {
      variantIdx: 20,
      outfit: 'leather_biker',
    }),
    makeClassCast('gang_b2', 'Port Brigade Muscle', 'Rival Crew B (East Block)', 'mob_muscle', {
      variantIdx: 22,
      outfit: 'puffer_jacket',
    }),
  ],
  cues: (variantId) =>
    variantId === 'street_firefight'
      ? [
          { id: 'sq_shove', timeSec: 2.8, kind: 'shove_impact', actorId: 'gang_b1', targetId: 'gang_a1' },
          { id: 'sq_brawl_1', timeSec: 4.15, kind: 'shove_impact', actorId: 'gang_a1', targetId: 'gang_b1' },
          { id: 'sq_brawl_2', timeSec: 5.35, kind: 'shove_impact', actorId: 'gang_b1', targetId: 'gang_a1' },
          { id: 'sq_shot_1', timeSec: 9.25, kind: 'gunshot', actorId: 'gang_a1', targetId: 'gang_b1' },
          { id: 'sq_shot_2', timeSec: 9.52, kind: 'gunshot', actorId: 'gang_a1', targetId: 'gang_b2' },
          { id: 'sq_shot_3', timeSec: 9.78, kind: 'gunshot', actorId: 'gang_b2', targetId: 'gang_a1' },
          { id: 'sq_shot_4', timeSec: 11.15, kind: 'gunshot', actorId: 'gang_b1', targetId: 'gang_a2' },
          { id: 'sq_shot_5', timeSec: 11.28, kind: 'gunshot', actorId: 'gang_a2', targetId: 'gang_b1' },
          { id: 'sq_shot_6', timeSec: 11.55, kind: 'gunshot', actorId: 'gang_a2', targetId: 'gang_b2' },
          { id: 'sq_shot_7', timeSec: 12.02, kind: 'gunshot', actorId: 'gang_b1', targetId: 'gang_a2' },
          { id: 'sq_blood', timeSec: 12.08, kind: 'blood_hit', actorId: 'gang_a2', targetId: 'gang_b1' },
          { id: 'sq_shot_8', timeSec: 13.10, kind: 'gunshot', actorId: 'gang_a1', targetId: 'gang_b1' },
          { id: 'sq_shot_9', timeSec: 13.42, kind: 'gunshot', actorId: 'gang_a1', targetId: 'gang_b2' },
        ]
      : [
          { id: 'sq_shove_so', timeSec: 2.8, kind: 'shove_impact', actorId: 'gang_b1', targetId: 'gang_a1' },
          { id: 'sq_brawl_so', timeSec: 4.15, kind: 'shove_impact', actorId: 'gang_a1', targetId: 'gang_b1' },
        ],
  evaluate: (variantId, t) => {
    const isFirefight = variantId === 'street_firefight';

    // Stage 1 (0..2.35s): Both crews march in from street ends unarmed/holstered to square up
    const meetT = smoothSeg(t, 0, 2.35);
    let a1x = THREE.MathUtils.lerp(-4.0, -0.82, meetT);
    let a1z = THREE.MathUtils.lerp(-0.15, -0.05, meetT);
    let a2x = THREE.MathUtils.lerp(-4.6, -1.25, meetT);
    let a2z = THREE.MathUtils.lerp(1.05, 0.88, meetT);

    let b1x = THREE.MathUtils.lerp(4.0, 0.82, meetT);
    let b1z = THREE.MathUtils.lerp(0.15, -0.05, meetT);
    let b2x = THREE.MathUtils.lerp(4.6, 1.25, meetT);
    let b2z = THREE.MathUtils.lerp(1.05, 0.88, meetT);

    const walkInit = t < 2.30 ? 1.4 : 0;
    let a1Walk = walkInit;
    let a2Walk = walkInit;
    let b1Walk = walkInit;
    let b2Walk = walkInit;

    let a1Gun: GunHandlingState = 'holstered';
    let a2Gun: GunHandlingState = 'holstered';
    let b1Gun: GunHandlingState = 'holstered';
    let b2Gun: GunHandlingState = 'holstered';
    let a1Gp = 0;
    let a2Gp = 0;
    let b1Gp = 0;
    let b2Gp = 0;

    let a1Int: InteractionPoseAction = 'none';
    let a2Int: InteractionPoseAction = 'none';
    let b1Int: InteractionPoseAction = 'none';
    let b2Int: InteractionPoseAction = 'none';
    let a1Ip = 0;
    let a2Ip = 0;
    let b1Ip = 0;
    let b2Ip = 0;

    let a1Recoil = 0;
    let a2Recoil = 0;
    let b1Recoil = 0;
    let b2Recoil = 0;
    let a2BloodPool = 0;

    let a1Yaw = yawBetween(a1x, a1z, b1x, b1z);
    let a2Yaw = yawBetween(a2x, a2z, b2x, b2z);
    let b1Yaw = yawBetween(b1x, b1z, a1x, a1z);
    let b2Yaw = yawBetween(b2x, b2z, a2x, a2z);

    let beat: VignetteBeatInfo = {
      name: '01 · Rival Crews Converge',
      description: 'Street gang & Port Brigade meet on the wet asphalt with weapons slung before tempers boil over.',
    };

    if (t >= 2.35 && t < 3.45) {
      // Stage 2: Verbal showdown -> Enforcer throws opening shove
      const shT = Math.sin(seg(t, 2.45, 3.25) * Math.PI);
      b1x = THREE.MathUtils.lerp(0.82, 0.18, shT);
      b1Int = 'shove';
      b1Ip = seg(t, 2.5, 3.15);
      a1Int = t >= 2.75 ? 'shoved_recoil' : 'point';
      a1Ip = t >= 2.75 ? seg(t, 2.75, 3.42) : seg(t, 2.35, 2.75);
      if (t >= 2.75) {
        a1x = THREE.MathUtils.lerp(-0.82, -1.28, smoothSeg(t, 2.75, 3.35));
      }
      a2Int = 'talk_at';
      b2Int = 'block';
      beat = {
        name: '02 · Turf Shove Ignites Brawl',
        description: 'Enforcer shoves the street lead back while flankers step in squared up.',
        speaker: 'Port Brigade Enforcer',
        line: 'Step off our block or lose your teeth right here.',
      };
    } else if (t >= 3.45 && t < 6.25) {
      // Stage 3: Close-Quarters Fist Fight (both pairs trade punches at clean 0.90–1.00m boxing range)
      const closeIn = smoothSeg(t, 3.45, 3.85);
      a1x = THREE.MathUtils.lerp(-1.28, -0.50, closeIn);
      b1x = THREE.MathUtils.lerp(0.82, 0.48, closeIn);
      a2x = THREE.MathUtils.lerp(-1.25, -0.58, closeIn);
      b2x = THREE.MathUtils.lerp(1.25, 0.56, closeIn);

      if (t < 4.75) {
        a1Int = 'brawl_punch';
        a1Ip = seg(t, 3.60, 4.65);
        b1Int = t < 4.10 ? 'block' : 'shoved_recoil';
        b1Ip = seg(t, 4.10, 4.75);

        b2Int = 'brawl_punch';
        b2Ip = seg(t, 3.70, 4.72);
        a2Int = t < 4.18 ? 'fight_back' : 'shoved_recoil';
        a2Ip = seg(t, 3.75, 4.72);
      } else {
        b1Int = 'brawl_punch';
        b1Ip = seg(t, 4.80, 5.95);
        a1Int = t < 5.30 ? 'fight_back' : 'shoved_recoil';
        a1Ip = seg(t, 4.85, 6.15);

        a2Int = 'brawl_punch';
        a2Ip = seg(t, 4.85, 6.05);
        b2Int = t < 5.45 ? 'block' : 'shoved_recoil';
        b2Ip = seg(t, 5.45, 6.15);
      }
      beat = {
        name: '03 · Street Fist Fight (Hands Up, Guns Slung)',
        description: 'Both crews trade jabs, hooks, and body counters in tight quarters before breaking apart for cover.',
        speaker: 'Red-Trim Crew Lead',
        line: 'Drop him! Break back— grab steel!',
      };
    } else if (t >= 6.25 && t < 8.85) {
      // Stage 4: Smart Tactical Break-Off — Backpedal eyes-on-enemy drawing guns, then sprint to concrete barriers!
      const backU = smoothSeg(t, 6.25, 7.35);
      const sprintU = smoothSeg(t, 7.35, 8.78);
      if (t < 7.35) {
        a1x = THREE.MathUtils.lerp(-0.50, -2.55, backU);
        a1z = THREE.MathUtils.lerp(-0.05, -0.22, backU);
        a2x = THREE.MathUtils.lerp(-0.58, -2.45, backU);
        a2z = THREE.MathUtils.lerp(0.88, 1.25, backU);

        b1x = THREE.MathUtils.lerp(0.48, 2.55, backU);
        b1z = THREE.MathUtils.lerp(-0.05, -0.18, backU);
        b2x = THREE.MathUtils.lerp(0.56, 2.45, backU);
        b2z = THREE.MathUtils.lerp(0.88, 1.25, backU);

        a1Walk = 1.9;
        a2Walk = 1.9;
        b1Walk = 1.85;
        b2Walk = 1.85;
        // Eyes locked forward on rival crew while backpedaling & drawing weapons!
        a1Yaw = yawBetween(a1x, a1z, b1x, b1z);
        a2Yaw = yawBetween(a2x, a2z, b2x, b2z);
        b1Yaw = yawBetween(b1x, b1z, a1x, a1z);
        b2Yaw = yawBetween(b2x, b2z, a2x, a2z);
      } else {
        a1x = THREE.MathUtils.lerp(-2.55, -6.35, sprintU);
        a1z = THREE.MathUtils.lerp(-0.22, -0.45, sprintU);
        a2x = THREE.MathUtils.lerp(-2.45, -6.05, sprintU);
        a2z = THREE.MathUtils.lerp(1.25, 1.75, sprintU);

        b1x = THREE.MathUtils.lerp(2.55, 6.35, sprintU);
        b1z = THREE.MathUtils.lerp(-0.18, -0.35, sprintU);
        b2x = THREE.MathUtils.lerp(2.45, 6.05, sprintU);
        b2z = THREE.MathUtils.lerp(1.25, 1.75, sprintU);

        const spd = sprintU < 0.94 ? 2.85 : 0;
        a1Walk = spd;
        a2Walk = spd;
        b1Walk = spd;
        b2Walk = spd;

        // Turn back toward rival cover as they settle behind barrier
        const turnBack = smoothSeg(t, 8.35, 8.85);
        a1Yaw = lerpYaw(-Math.PI * 0.5, yawBetween(a1x, a1z, b1x, b1z), turnBack);
        a2Yaw = lerpYaw(-Math.PI * 0.5, yawBetween(a2x, a2z, b2x, b2z), turnBack);
        b1Yaw = lerpYaw(Math.PI * 0.5, yawBetween(b1x, b1z, a1x, a1z), turnBack);
        b2Yaw = lerpYaw(Math.PI * 0.5, yawBetween(b2x, b2z, a2x, a2z), turnBack);
        if (sprintU >= 0.88) {
          a1Int = 'cover_crouch';
          a2Int = 'cover_crouch';
          b1Int = 'cover_crouch';
          b2Int = 'cover_crouch';
        }
      }

      // Draw weapons mid-retreat -> low-ready behind cover
      const drawP = seg(t, 6.45, 7.65);
      a1Gun = t < 6.45 ? 'holstered' : t < 7.65 ? 'draw' : 'low_ready';
      a2Gun = t < 6.55 ? 'holstered' : t < 7.75 ? 'draw' : 'low_ready';
      b1Gun = t < 6.50 ? 'holstered' : t < 7.70 ? 'draw' : 'low_ready';
      b2Gun = t < 6.60 ? 'holstered' : t < 7.80 ? 'draw' : 'low_ready';
      a1Gp = drawP;
      a2Gp = seg(t, 6.55, 7.75);
      b1Gp = seg(t, 6.50, 7.70);
      b2Gp = seg(t, 6.60, 7.80);

      beat = {
        name: '04 · Back Up & Bound Into Opposing Cover',
        description: 'Both gangs backpedal eyes-on-threat while drawing firearms, then drop behind West & East concrete barriers.',
      };
    } else if (t >= 8.85) {
      // Stage 5 & 6: Settled behind opposing concrete barriers (~12.7m apart!)
      a1x = -6.35;
      a1z = -0.45;
      a2x = -6.05;
      a2z = 1.75;
      b1x = 6.35;
      b1z = -0.35;
      b2x = 6.05;
      b2z = 1.75;
      a1Walk = 0;
      a2Walk = 0;
      b1Walk = 0;
      b2Walk = 0;
      a1Yaw = yawBetween(a1x, a1z, b1x, b1z);
      a2Yaw = yawBetween(a2x, a2z, b2x, b2z);
      b1Yaw = yawBetween(b1x, b1z, a1x, a1z);
      b2Yaw = yawBetween(b2x, b2z, a2x, a2z);

      a1Int = 'cover_crouch';
      a2Int = 'cover_crouch';
      b1Int = 'cover_crouch';
      b2Int = 'cover_crouch';

      if (isFirefight) {
        a2BloodPool = smoothSeg(t, 12.10, 16.5);

        if (t < 10.75) {
          // Volley 1: Gang Lead (A1) & Mob Shotgunner (B2) pop over concrete barriers to trade long-range fire while A2 & B1 stay ducked
          a1Gun = t < 9.15 ? 'aim' : t < 9.95 ? 'fire' : 'low_ready';
          a1Ip = seg(t, 8.85, 10.1);
          a1Recoil = (t >= 9.25 && t < 9.45) || (t >= 9.52 && t < 9.72) ? 1 : 0;

          b2Gun = t < 9.55 ? 'aim' : t < 10.35 ? 'fire' : 'low_ready';
          b2Ip = seg(t, 9.25, 10.45);
          b2Recoil = t >= 9.78 && t < 10.1 ? 1.15 : 0;

          a2Gun = 'low_ready';
          b1Gun = 'low_ready';
          beat = {
            name: '05 · Long-Distance Cover Firefight (Volley 1)',
            description: 'Carbine & pump shotgun peek over concrete barriers 13m apart while teammates stay ducked behind cover.',
          };
        } else if (t < 12.80) {
          // Volley 2: A1 & B2 duck completely below concrete barrier edge to reload; B1 & A2 pop up to return fire!
          a1Gun = t < 12.45 ? 'reload' : 'low_ready';
          a1Gp = seg(t, 10.75, 12.45);
          b2Gun = t < 12.55 ? 'reload' : 'low_ready';
          b2Gp = seg(t, 10.85, 12.55);

          b1Gun = t < 11.05 ? 'aim' : t < 12.35 ? 'fire' : 'low_ready';
          b1Ip = seg(t, 10.85, 12.4);
          b1Recoil = (t >= 11.15 && t < 11.35) || (t >= 12.02 && t < 12.24) ? 1 : 0;

          if (t < 12.08) {
            a2Gun = t < 11.15 ? 'aim' : 'fire';
            a2Ip = seg(t, 10.90, 12.05);
            a2Recoil = (t >= 11.28 && t < 11.48) || (t >= 11.55 && t < 11.75) ? 1 : 0;
          } else {
            a2Gun = 'holstered';
            a2Int = 'downed';
          }
          beat = {
            name: '06 · Suppress & Reload Rotation (Flanker Hit)',
            description: 'Shooters duck below barriers to reload while partners cover; Port Brigade rifle catches the West flanker.',
          };
        } else if (t < 14.95) {
          // Volley 3: Gang Lead A1 lays heavy suppressive burst from West barrier forcing East crew down into reload/cover
          a2Gun = 'holstered';
          a2Int = 'downed';

          a1Gun = t < 13.02 ? 'aim' : t < 14.15 ? 'fire' : 'low_ready';
          a1Ip = seg(t, 12.85, 14.25);
          a1Recoil = (t >= 13.10 && t < 13.30) || (t >= 13.42 && t < 13.65) ? 1 : 0;

          b1Gun = t < 14.35 ? 'reload' : 'low_ready';
          b1Gp = seg(t, 12.80, 14.35);
          b2Gun = 'low_ready';
          beat = {
            name: '07 · Suppressive Burst Pinning East Cover',
            description: 'Gang Lead pins the East barrier with long-range carbine bursts while surviving mob enforcers reload.',
          };
        } else {
          // Stage 6: Holster behind cover & withdraw down opposite alleys
          a2Gun = 'holstered';
          a2Int = 'downed';
          const outT = smoothSeg(t, 15.65, 17.5);
          const withdrawing = t >= 15.65;
          if (withdrawing) {
            a1Int = 'none';
            b1Int = 'none';
            b2Int = 'none';
            a1x = THREE.MathUtils.lerp(-6.35, -9.2, outT);
            b1x = THREE.MathUtils.lerp(6.35, 9.2, outT);
            b2x = THREE.MathUtils.lerp(6.05, 8.9, outT);
            a1Walk = 2.2;
            b1Walk = 2.1;
            b2Walk = 2.1;
            a1Yaw = -Math.PI * 0.5;
            b1Yaw = Math.PI * 0.5;
            b2Yaw = Math.PI * 0.5;
          }
          a1Gun = t < 15.65 ? 'holster' : 'holstered';
          a1Gp = seg(t, 14.95, 15.65);
          b1Gun = t < 15.65 ? 'holster' : 'holstered';
          b1Gp = seg(t, 14.95, 15.65);
          b2Gun = t < 15.70 ? 'holster' : 'holstered';
          b2Gp = seg(t, 15.0, 15.70);
          beat = {
            name: '08 · Holster Behind Cover & Disengage',
            description: 'Surviving shooters sling rifles from cover and slip out opposite street ends as sirens heat rises.',
          };
        }
      } else {
        // Skhodka Border Standoff variant: brawl -> back into cover with guns leveled across 13m -> holster & withdraw
        if (t < 11.2) {
          a1Gun = 'aim';
          a2Gun = 'aim';
          b1Gun = 'aim';
          b2Gun = 'aim';
          beat = {
            name: '05 · Long-Range Standoff Across Cover',
            description: 'Both crews lock sights over opposing concrete barriers 13m apart without pulling triggers.',
            speaker: 'Port Brigade Enforcer',
            line: 'Hold fire! Take this to the skhodka before the militia rolls up!',
          };
        } else {
          const outT = smoothSeg(t, 11.9, 13.5);
          a1Gun = t < 11.9 ? 'holster' : 'holstered';
          a1Gp = seg(t, 11.2, 11.9);
          a2Gun = t < 11.9 ? 'holster' : 'holstered';
          a2Gp = seg(t, 11.2, 11.9);
          b1Gun = t < 11.9 ? 'holster' : 'holstered';
          b1Gp = seg(t, 11.2, 11.9);
          b2Gun = t < 11.9 ? 'holster' : 'holstered';
          b2Gp = seg(t, 11.2, 11.9);
          if (t >= 11.9) {
            a1Int = 'none';
            a2Int = 'none';
            b1Int = 'none';
            b2Int = 'none';
            a1x = THREE.MathUtils.lerp(-6.35, -8.8, outT);
            a2x = THREE.MathUtils.lerp(-6.05, -8.5, outT);
            b1x = THREE.MathUtils.lerp(6.35, 8.8, outT);
            b2x = THREE.MathUtils.lerp(6.05, 8.5, outT);
            a1Walk = 1.65;
            a2Walk = 1.65;
            b1Walk = 1.55;
            b2Walk = 1.55;
            a1Yaw = -Math.PI * 0.5;
            a2Yaw = -Math.PI * 0.5;
            b1Yaw = Math.PI * 0.5;
            b2Yaw = Math.PI * 0.5;
          }
          beat = {
            name: '06 · Holster & Separate From Cover',
            description: 'Dispute deferred to crew arbitration; fighters slip out opposite ends cleanly.',
          };
        }
      }
    }

    return {
      actors: [
        {
          castId: 'gang_a1',
          x: a1x,
          z: a1z,
          yaw: a1Yaw,
          walkSpeed: a1Walk,
          gunState: a1Gun,
          gunStateProgress: a1Gp,
          interaction: a1Int,
          interactionProgress: a1Ip,
          lookTargetId: a1Walk > 2.0 ? undefined : 'gang_b1',
          recoilKick: a1Recoil,
        },
        {
          castId: 'gang_a2',
          x: a2x,
          z: a2z,
          yaw: a2Yaw,
          walkSpeed: a2Walk,
          gunState: a2Gun,
          gunStateProgress: a2Gp,
          interaction: a2Int,
          interactionProgress: a2Ip,
          lookTargetId: a2Int === 'downed' || a2Walk > 2.0 ? undefined : 'gang_b2',
          recoilKick: a2Recoil,
          bloodPoolProgress: a2BloodPool,
        },
        {
          castId: 'gang_b1',
          x: b1x,
          z: b1z,
          yaw: b1Yaw,
          walkSpeed: b1Walk,
          gunState: b1Gun,
          gunStateProgress: b1Gp,
          interaction: b1Int,
          interactionProgress: b1Ip,
          lookTargetId: b1Walk > 2.0 ? undefined : 'gang_a1',
          recoilKick: b1Recoil,
        },
        {
          castId: 'gang_b2',
          x: b2x,
          z: b2z,
          yaw: b2Yaw,
          walkSpeed: b2Walk,
          gunState: b2Gun,
          gunStateProgress: b2Gp,
          interaction: b2Int,
          interactionProgress: b2Ip,
          lookTargetId: b2Walk > 2.0 ? undefined : 'gang_a2',
          recoilKick: b2Recoil,
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 5. THE TAP
// =============================================================================
const THE_TAP: VignetteDefinition = {
  id: 'the_tap',
  title: 'The Tap',
  subtitle: 'Sleuth crosses street, asks one awkward question, hand lands on shoulder (grab trigger)',
  durationSec: 12.5,
  instigationNote: 'SYSTEM (hidden heat + tail) · No hints, civilian mask until the hand lands',
  defaultVariantId: 'shoulder_grab',
  variants: [
    { id: 'shoulder_grab', label: 'Tap → Grab Trigger', summary: 'Off-screen question → awkward beat → hand lands → kidnap hook' },
    { id: 'casual_probe', label: 'Probe & Release', summary: 'Awkward surveillance question, shoulder tap, sleuth melts back into crowd' },
  ],
  cast: () => [
    makeClassCast('player', 'Player', 'Target (Unaware)', 'civilian', {
      variantIdx: 0,
      outfit: 'hoodie_parka',
    }),
    makeClassCast('sleuth', 'Sleuth (Watcher)', 'Undercover Interruptor', 'undercover_sleuth', {
      variantIdx: 3,
      outfit: 'trench_coat',
      coatColorHex: '#12151b',
      hasFedora: true,
    }),
    makeClassCast('bystander', 'Passerby', 'Crowd Cover', 'civilian', {
      variantIdx: 5,
      outfit: 'puffer_jacket',
    }),
  ],
  cues: (variantId) => [
    { id: 'tap_land', timeSec: 7.3, kind: 'shoulder_tap', actorId: 'sleuth', targetId: 'player' },
    ...(variantId === 'shoulder_grab'
      ? [{ id: 'tap_kidnap', timeSec: 10.6, kind: 'kidnap_hook' as const, actorId: 'sleuth', targetId: 'player' }]
      : []),
  ],
  evaluate: (variantId, t) => {
    const pWalkT = smoothSeg(t, 0, 4.4);
    const pX = THREE.MathUtils.lerp(-3.8, 0.35, pWalkT);
    const pZ = 0.25;
    let pYaw = Math.PI * 0.5;
    const pWalk = t < 4.35 ? 1.25 : 0;
    let pInt: InteractionPoseAction = 'none';
    let pIntProg = 0;

    const byT = seg(t, 0, 12.5);
    const byX = THREE.MathUtils.lerp(5.2, -5.2, byT);
    const byZ = -2.2;

    let slX = -3.8;
    let slZ = -2.6;
    let slYaw = Math.PI * 0.5;
    let slWalk = 1.3;
    let slGun: GunHandlingState = 'holstered';
    let slGunProg = 0;
    let slInt: InteractionPoseAction = 'none';
    let slIntProg = 0;

    if (t < 3.6) {
      const cT = smoothSeg(t, 0, 3.6);
      slX = THREE.MathUtils.lerp(-4.5, -1.05, cT);
      slZ = THREE.MathUtils.lerp(-2.5, -0.35, cT);
      slYaw = yawBetween(slX, slZ, -1.05, -0.35);
      slWalk = 1.45;
    } else if (t < 6.4) {
      const cT = smoothSeg(t, 3.6, 5.2);
      slX = THREE.MathUtils.lerp(-1.05, -0.35, cT);
      slZ = THREE.MathUtils.lerp(-0.35, 0.15, cT);
      slYaw = yawBetween(slX, slZ, pX, pZ);
      slWalk = t < 5.15 ? 1.25 : 0;
      slInt = t >= 5.2 ? 'talk_at' : 'none';
    } else if (t < 9.4) {
      const stepT = smoothSeg(t, 6.4, 7.0);
      slX = THREE.MathUtils.lerp(-0.35, -0.25, stepT);
      slZ = THREE.MathUtils.lerp(0.15, 0.25, stepT);
      slYaw = yawBetween(slX, slZ, pX, pZ);
      slWalk = t < 6.95 ? 0.9 : 0;
      if (t >= 7.0) {
        slInt = 'shoulder_tap';
        slIntProg = seg(t, 7.0, 9.2);
      }
    } else {
      slX = -0.25;
      slZ = 0.25;
      slYaw = yawBetween(slX, slZ, pX, pZ);
      slWalk = 0;
      if (variantId === 'shoulder_grab') {
        if (t < 10.3) {
          slGun = 'draw';
          slGunProg = seg(t, 9.4, 10.2);
        } else {
          slGun = 'aim';
        }
      } else {
        const meltT = smoothSeg(t, 9.6, 12.5);
        slX = THREE.MathUtils.lerp(-0.25, 3.6, meltT);
        slZ = THREE.MathUtils.lerp(0.25, -1.8, meltT);
        slYaw = yawBetween(-0.25, 0.25, 3.6, -1.8);
        slWalk = 1.25;
      }
    }

    if (t >= 4.4 && t < 7.2) {
      pYaw = lerpYaw(Math.PI * 0.5, yawBetween(pX, pZ, slX, slZ), smoothSeg(t, 4.4, 5.25));
    } else if (t >= 7.2 && t < 9.5) {
      pYaw = yawBetween(pX, pZ, slX, slZ);
      if (t >= 7.3 && t < 8.1) {
        pInt = 'shoved_recoil';
        pIntProg = seg(t, 7.3, 8.1) * 0.45;
      }
    } else if (t >= 9.5 && variantId === 'shoulder_grab') {
      pYaw = yawBetween(pX, pZ, slX, slZ);
      pInt = 'hands_up';
    }

    let beat: VignetteBeatInfo = {
      name: '01 · Civilian Camouflage & Tail',
      description: 'Sleuth crosses from the opposite curb matching crowd gait — hands in coat, zero weapon tell.',
    };

    if (t >= 3.8 && t < 6.4) {
      beat = {
        name: '02 · Off-Screen Startup & Awkward Question',
        description: 'First contact begins behind the player’s shoulder; player must turn to see who is speaking.',
        speaker: 'Sleuth',
        line: 'You were at the port yesterday. And the day before. I notice things.',
      };
    } else if (t >= 6.4 && t < 9.4) {
      beat = {
        name: '03 · The Shoulder Tap (Grab Trigger)',
        description: 'Hand rises and lands on the player’s shoulder — stays a second too long. The animation IS the trigger.',
        speaker: 'Sleuth',
        line: 'Wait — one question. Answer honestly and I’ll let go.',
      };
    } else if (t >= 9.4) {
      if (variantId === 'shoulder_grab') {
        const blackOp = smoothSeg(t, 10.6, 11.7) * (1 - smoothSeg(t, 12.1, 12.5) * 0.3);
        const hoodOp = smoothSeg(t, 10.3, 10.8);
        beat = {
          name: '04 · Snap Tell → Kidnap Loading Hook',
          description: 'Civilian mask drops in one snap; shoulder grab transitions straight into bag-over-head blackout.',
          speaker: 'Sleuth',
          line: 'Walk with me. Just to the van.',
          hoodOverlayOpacity: hoodOp,
          blackoutOpacity: blackOp,
          kidnapHookActive: t >= 10.6,
        };
      } else {
        beat = {
          name: '04 · Released Into Crowd',
          description: 'Threshold not yet crossed — sleuth steps back into normal crowd flow, logging the encounter.',
          speaker: 'Sleuth',
          line: 'See you soon. I mean — have a nice day.',
        };
      }
    }

    return {
      actors: [
        {
          castId: 'player',
          x: pX,
          z: pZ,
          yaw: pYaw,
          walkSpeed: pWalk,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: pInt,
          interactionProgress: pIntProg,
          lookTargetId: t >= 4.4 ? 'sleuth' : undefined,
        },
        {
          castId: 'sleuth',
          x: slX,
          z: slZ,
          yaw: slYaw,
          walkSpeed: slWalk,
          gunState: slGun,
          gunStateProgress: slGunProg,
          interaction: slInt,
          interactionProgress: slIntProg,
          lookTargetId: 'player',
          handInPocket: t < 6.8,
        },
        {
          castId: 'bystander',
          x: byX,
          z: byZ,
          yaw: -Math.PI * 0.5,
          walkSpeed: 1.25,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: 'none',
          interactionProgress: 0,
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 6. THE SCAVENGE
// =============================================================================
const THE_SCAVENGE: VignetteDefinition = {
  id: 'the_scavenge',
  title: 'The Scavenge',
  subtitle: 'Citizen resists, criminal rolls NOT to walk away and guns them down; crew scavenges body while exposed',
  durationSec: 16.0,
  instigationNote: 'OPPORTUNITY (Killer Roll) + WITNESSES · Looting takes real time, leaving the crew exposed',
  defaultVariantId: 'fight_back_kill',
  variants: [
    {
      id: 'fight_back_kill',
      label: 'Fight-Back → Kill & Scavenge',
      summary: 'Citizen shoves back; killer refuses to back down, guns him down, reloads, crew loots pockets while exposed',
    },
    {
      id: 'spray_kill',
      label: 'Pepper Spray → Kill & Scavenge',
      summary: 'Woman sprays attacker; killer fires through stinging eyes, reloads, then crew scavenges body',
    },
  ],
  cast: (variantId) => {
    const isSpray = variantId === 'spray_kill';
    return [
      makeClassCast('criminal', 'Killer (Street Crew)', 'Hothead Shooter (Does Not Walk Away)', 'gang_member', {
        variantIdx: 12,
        outfit: 'gang_2059',
      }),
      makeClassCast('scavenger', 'Crew Scavenger', 'Accomplice (Turns Pockets Out)', 'gang_botherer', {
        variantIdx: 8,
        outfit: 'hoodie_parka',
      }),
      makeClassCast(
        'citizen',
        isSpray ? 'Citizen (Woman)' : 'Resisting Citizen',
        isSpray ? 'Pepper Spray Carry (Killed)' : 'Fight-Back Male (Killed)',
        isSpray ? 'civilian' : 'strong_citizen',
        {
          variantIdx: isSpray ? 5 : 2,
          outfit: isSpray ? 'cardigan_scarf' : 'puffer_jacket',
          hasPepperSpray: isSpray,
        }
      ),
      makeClassCast('witness_a', 'Witness (Sidewalk)', 'Freezes → Bolts to Report', 'civilian', {
        variantIdx: 0,
        outfit: 'tailored_blazer',
      }),
      makeClassCast('witness_b', 'Witness (Across Lane)', 'Spots Exposed Crew → Flees', 'civilian', {
        variantIdx: 4,
        outfit: 'puffer_jacket',
      }),
    ];
  },
  cues: (variantId) => {
    const isSpray = variantId === 'spray_kill';
    return [
      isSpray
        ? { id: 'scav_spray', timeSec: 3.15, kind: 'pepper_spray', actorId: 'citizen', targetId: 'criminal' }
        : { id: 'scav_shove', timeSec: 3.15, kind: 'shove_impact', actorId: 'citizen', targetId: 'criminal' },
      { id: 'scav_shot_1', timeSec: 4.85, kind: 'gunshot', actorId: 'criminal', targetId: 'citizen' },
      { id: 'scav_blood_1', timeSec: 4.9, kind: 'blood_hit', actorId: 'citizen', targetId: 'criminal' },
      { id: 'scav_shot_2', timeSec: 5.2, kind: 'gunshot', actorId: 'criminal', targetId: 'citizen' },
      { id: 'scav_blood_2', timeSec: 5.25, kind: 'blood_hit', actorId: 'citizen', targetId: 'criminal' },
      { id: 'scav_shot_3', timeSec: 5.55, kind: 'gunshot', actorId: 'criminal', targetId: 'citizen' },
      { id: 'scav_blood_3', timeSec: 5.6, kind: 'blood_hit', actorId: 'citizen', targetId: 'criminal' },
    ];
  },
  evaluate: (variantId, t) => {
    const isSpray = variantId === 'spray_kill';

    const citApp = smoothSeg(t, 0, 1.8);
    let citX = THREE.MathUtils.lerp(-2.8, -0.55, citApp);
    const citZ = 0.25;
    const citYaw = t < 1.5 ? Math.PI * 0.5 : lerpYaw(Math.PI * 0.5, 0.95, smoothSeg(t, 1.5, 2.2));
    const citWalk = t < 1.75 ? 1.2 : 0;
    let citInt: InteractionPoseAction = 'none';
    let citIntProg = 0;

    const crimApp = smoothSeg(t, 0, 2.0);
    let crimX = THREE.MathUtils.lerp(2.9, 0.85, crimApp);
    let crimZ = THREE.MathUtils.lerp(-0.9, 0.25, crimApp);
    let crimYaw = yawBetween(crimX, crimZ, citX, citZ);
    let crimWalk = t < 1.95 ? 1.55 : 0;
    let crimGun: GunHandlingState = 'holstered';
    let crimGunProg = 0;
    let crimInt: InteractionPoseAction = 'none';
    let crimIntProg = 0;
    let crimRecoil = 0;

    const scavApp = smoothSeg(t, 0.3, 2.4);
    let scavX = THREE.MathUtils.lerp(3.6, 1.9, scavApp);
    let scavZ = THREE.MathUtils.lerp(-1.6, -1.15, scavApp);
    let scavYaw = yawBetween(scavX, scavZ, citX, citZ);
    let scavWalk = t < 2.35 ? 1.35 : 0;
    let scavGun: GunHandlingState = 'holstered';
    const scavGunProg = 0;
    let scavInt: InteractionPoseAction = 'none';
    let scavIntProg = 0;

    const witAWalkInit = smoothSeg(t, 0, 5.1);
    let witAX = THREE.MathUtils.lerp(-5.2, -1.85, witAWalkInit);
    let witAZ = -2.35;
    let witAYaw = Math.PI * 0.5;
    let witAWalk = t < 5.05 ? 1.05 : 0;
    let witAInt: InteractionPoseAction = 'none';

    const witBWalkInit = smoothSeg(t, 0, 5.4);
    let witBX = THREE.MathUtils.lerp(5.2, 2.35, witBWalkInit);
    let witBZ = 2.65;
    let witBYaw = -Math.PI * 0.5;
    let witBWalk = t < 5.35 ? 1.0 : 0;
    let witBInt: InteractionPoseAction = 'none';

    let bloodPoolProgress = 0;
    let lootScatterProgress = 0;

    let beat: VignetteBeatInfo = {
      name: '01 · Hold-Up & Demand',
      description: 'Street crew pins a pedestrian at the curb; criminal draws pistol and demands pockets emptied.',
    };

    if (t >= 1.7 && t < 2.8) {
      crimGun = t < 2.45 ? 'draw' : 'aim';
      crimGunProg = seg(t, 1.7, 2.45);
      citInt = isSpray ? 'hands_up' : 'block';
      beat = {
        name: '01 · Hold-Up & Demand',
        description: isSpray
          ? 'Pistol comes out; woman raises hands slowly while reaching into coat pocket.'
          : 'Pistol comes out; heavy-set citizen holds his ground instead of folding.',
        speaker: 'Killer (Street Crew)',
        line: 'Coat pockets on the asphalt. Move.',
      };
    } else if (t >= 2.8 && t < 4.35) {
      if (isSpray) {
        citInt = 'pepper_spray';
        citIntProg = seg(t, 2.8, 4.1);
        if (t < 3.25) {
          crimGun = 'aim';
        } else {
          crimInt = 'sprayed_stagger';
          crimX = THREE.MathUtils.lerp(0.85, 1.45, smoothSeg(t, 3.25, 4.0));
          crimGun = 'holstered';
        }
        beat = {
          name: '02 · Citizen Resists (Pepper Spray)',
          description: 'She fires an aerosol burst straight at his eyes — normally the robbery collapses here.',
          speaker: 'Citizen (Woman)',
          line: 'Back off!',
        };
      } else {
        const lunge = smoothSeg(t, 2.8, 3.4);
        citX = THREE.MathUtils.lerp(-0.55, 0.12, lunge);
        citInt = 'fight_back';
        citIntProg = seg(t, 2.9, 4.0);
        if (t < 3.15) {
          crimGun = 'aim';
        } else {
          crimInt = 'shoved_recoil';
          crimIntProg = seg(t, 3.15, 4.1);
          crimGun = 'low_ready';
          crimX = THREE.MathUtils.lerp(0.85, 1.75, smoothSeg(t, 3.15, 4.0));
        }
        beat = {
          name: '02 · Citizen Resists (Fight Back)',
          description: 'Citizen steps inside the muzzle and drives a hard shove into the robber’s ribs.',
          speaker: 'Resisting Citizen',
          line: 'Try pressing somebody else!',
        };
      }
    } else if (t >= 4.35 && t < 6.2) {
      citX = isSpray ? -0.55 : 0.12;
      crimX = isSpray ? 1.45 : 1.75;
      if (t < 4.8) {
        crimGun = isSpray ? 'draw' : 'aim';
        crimGunProg = seg(t, 4.35, 4.78);
        citInt = isSpray ? 'pepper_spray' : 'block';
        citIntProg = 1.0;
      } else if (t < 5.75) {
        crimGun = 'fire';
        const shot1 = t >= 4.85 && t < 5.05 ? 1 - (t - 4.85) / 0.2 : 0;
        const shot2 = t >= 5.2 && t < 5.4 ? 1 - (t - 5.2) / 0.2 : 0;
        const shot3 = t >= 5.55 && t < 5.75 ? 1 - (t - 5.55) / 0.2 : 0;
        crimRecoil = Math.max(shot1, shot2, shot3);
        if (t >= 5.0 && t < 5.65) {
          citInt = 'shoved_recoil';
          citIntProg = seg(t, 5.0, 5.65);
        } else if (t >= 5.65) {
          citInt = 'downed';
        }
      } else {
        crimGun = 'low_ready';
        citInt = 'downed';
      }
      bloodPoolProgress = smoothSeg(t, 5.55, 11.5) * 0.25;
      beat = {
        name: '03 · Killer Roll: Refuses to Walk Away',
        description: 'Temperament rolls killer instead of retreat: he snaps the pistol up and guns the citizen down.',
        speaker: 'Killer (Street Crew)',
        line: isSpray ? 'You blind bitch— stay down!' : 'Nobody puts hands on me! Stay down!',
      };
    } else if (t >= 6.2) {
      citX = isSpray ? -0.55 : 0.12;
      citInt = 'downed';
      bloodPoolProgress = smoothSeg(t, 5.55, 12.2);

      if (t < 11.8) {
        const stepIn = smoothSeg(t, 6.2, 6.9);
        scavX = THREE.MathUtils.lerp(1.9, citX + 0.56, stepIn);
        scavZ = THREE.MathUtils.lerp(-1.15, citZ + 0.38, stepIn);
        scavYaw = yawBetween(scavX, scavZ, citX, citZ);
        scavWalk = t < 6.88 ? 1.55 : 0;
        if (t >= 6.9) {
          scavInt = 'scavenge_kneel';
          scavIntProg = seg(t, 6.9, 11.8);
          lootScatterProgress = smoothSeg(t, 7.5, 11.0);
        }

        // Killer drops to low_ready, reloads fresh mag, holsters cleanly while watching witnesses
        crimX = isSpray ? 1.45 : 1.75;
        if (t < 7.2) {
          crimGun = 'low_ready';
        } else if (t < 8.85) {
          crimGun = 'reload';
          crimGunProg = seg(t, 7.2, 8.85);
        } else if (t < 9.95) {
          crimGun = 'holster';
          crimGunProg = seg(t, 8.85, 9.95);
        } else {
          crimGun = 'holstered';
        }
        crimYaw = Math.sin(t * 2.1) * 0.95;

        beat = {
          name: '04 · Real-Time Scavenge (Crew Exposed)',
          description:
            'Accomplice drops to one knee turning pockets out for nearly 5 seconds while killer reloads, holsters, and scans witnesses.',
          speaker: t < 9.4 ? 'Crew Scavenger' : 'Killer (Street Crew)',
          line:
            t < 9.4
              ? 'Check the inner lining— hang on, wallet’s jammed in the coat…'
              : 'Hurry up! Eyes on us across the lane— move!',
        };
      } else {
        lootScatterProgress = 1.0;
        const boltT = smoothSeg(t, 11.8, 15.8);
        crimX = THREE.MathUtils.lerp(isSpray ? 1.45 : 1.75, 5.8, boltT);
        crimZ = THREE.MathUtils.lerp(0.25, -2.0, boltT);
        crimYaw = yawBetween(isSpray ? 1.45 : 1.75, 0.25, 5.8, -2.0);
        crimWalk = 2.95;
        crimGun = 'holstered';

        scavX = THREE.MathUtils.lerp(citX + 0.56, 5.6, boltT);
        scavZ = THREE.MathUtils.lerp(citZ + 0.38, -1.65, boltT);
        scavYaw = yawBetween(citX + 0.56, citZ + 0.38, 5.6, -1.65);
        scavWalk = 3.05;
        scavGun = 'holstered';
        scavInt = 'flee';

        beat = {
          name: '05 · Looted Scene & Witness Heat',
          description:
            'Crew bolts with the take; the persistent body, empty wallet, turned-out pockets, and blood pool stay on the street.',
        };
      }
    }

    if (t >= 4.95 && t < 8.4) {
      witAInt = 'witness_panic';
      witAYaw = yawBetween(witAX, witAZ, citX, citZ);
    } else if (t >= 8.4) {
      const fleeA = smoothSeg(t, 8.4, 13.4);
      witAX = THREE.MathUtils.lerp(-1.85, -6.4, fleeA);
      witAZ = THREE.MathUtils.lerp(-2.35, -3.1, fleeA);
      witAYaw = yawBetween(-1.85, -2.35, -6.4, -3.1);
      witAWalk = fleeA < 1 ? 3.2 : 0;
      witAInt = 'flee';
    }

    if (t >= 5.1 && t < 9.1) {
      witBInt = 'witness_panic';
      witBYaw = yawBetween(witBX, witBZ, citX, citZ);
    } else if (t >= 9.1) {
      const fleeB = smoothSeg(t, 9.1, 14.0);
      witBX = THREE.MathUtils.lerp(2.35, 6.6, fleeB);
      witBZ = THREE.MathUtils.lerp(2.65, 3.4, fleeB);
      witBYaw = yawBetween(2.35, 2.65, 6.6, 3.4);
      witBWalk = fleeB < 1 ? 3.1 : 0;
      witBInt = 'flee';
    }

    return {
      actors: [
        {
          castId: 'criminal',
          x: crimX,
          z: crimZ,
          yaw: crimYaw,
          walkSpeed: crimWalk,
          gunState: crimGun,
          gunStateProgress: crimGunProg,
          interaction: crimInt,
          interactionProgress: crimIntProg,
          lookTargetId: t >= 6.2 && t < 11.8 ? 'witness_b' : 'citizen',
          recoilKick: crimRecoil,
        },
        {
          castId: 'scavenger',
          x: scavX,
          z: scavZ,
          yaw: scavYaw,
          walkSpeed: scavWalk,
          gunState: scavGun,
          gunStateProgress: scavGunProg,
          interaction: scavInt,
          interactionProgress: scavIntProg,
          lookTargetId: 'citizen',
        },
        {
          castId: 'citizen',
          x: citX,
          z: citZ,
          yaw: citYaw,
          walkSpeed: citWalk,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: citInt,
          interactionProgress: citIntProg,
          lookTargetId: citInt === 'downed' ? undefined : 'criminal',
          bloodPoolProgress,
          lootScatterProgress,
        },
        {
          castId: 'witness_a',
          x: witAX,
          z: witAZ,
          yaw: witAYaw,
          walkSpeed: witAWalk,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: witAInt,
          interactionProgress: 0,
          lookTargetId: t < 8.4 ? 'citizen' : undefined,
        },
        {
          castId: 'witness_b',
          x: witBX,
          z: witBZ,
          yaw: witBYaw,
          walkSpeed: witBWalk,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: witBInt,
          interactionProgress: 0,
          lookTargetId: t < 9.1 ? 'scavenger' : undefined,
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 7. THE DRIVE-BY
// =============================================================================
const DRIVE_BY_SHOT_TIMES = [
  5.2, 5.56, 5.92, 6.28, 6.64, 7.0, 7.36, 7.72, 8.08, 8.44, 8.8, 9.15,
] as const;

function evalDriveByCar(t: number): {
  x: number;
  speedMps: number;
  pitch: number;
  braking: boolean;
  weaponOut: boolean;
  recoilKick: number;
  stateLabel: string;
} {
  const vCruise = 6.8;
  const vMatch = 1.25;
  const xAt2 = -8.5825;

  if (t < 2.0) {
    return {
      x: xAt2 - vCruise * (2.0 - t),
      speedMps: vCruise,
      pitch: 0,
      braking: false,
      weaponOut: false,
      recoilKick: 0,
      stateLabel: 'Approaching (~24 km/h)',
    };
  }
  if (t < 3.3) {
    const dt = 1.3;
    const u = (t - 2.0) / dt;
    const speedMps = vCruise - (vCruise - vMatch) * 0.5 * (1 - Math.cos(Math.PI * u));
    const x =
      xAt2 +
      dt * (vCruise * u - (vCruise - vMatch) * 0.5 * (u - Math.sin(Math.PI * u) / Math.PI));
    return {
      x,
      speedMps,
      pitch: 0.034 * Math.sin(u * Math.PI),
      braking: true,
      weaponOut: u > 0.65,
      recoilKick: 0,
      stateLabel: `Braking Down (${Math.round(speedMps * 3.6)} km/h)`,
    };
  }
  if (t < 5.2) {
    const x = -3.35 + vMatch * (t - 3.3);
    return {
      x,
      speedMps: vMatch,
      pitch: 0.009,
      braking: true,
      weaponOut: true,
      recoilKick: 0,
      stateLabel: 'PACE MATCH · THE TELL (4 km/h)',
    };
  }
  if (t < 9.2) {
    const u = (t - 5.2) / 4.0;
    const speedMps = vMatch + 0.55 * u;
    const x = -0.975 + 4.0 * (vMatch * u + 0.55 * 0.5 * u * u);
    let recoilKick = 0;
    for (const st of DRIVE_BY_SHOT_TIMES) {
      if (t >= st && t < st + 0.14) {
        recoilKick = Math.max(recoilKick, 1 - (t - st) / 0.14);
      }
    }
    return {
      x,
      speedMps,
      pitch: 0.004,
      braking: false,
      weaponOut: true,
      recoilKick,
      stateLabel: '4s Burst Firing',
    };
  }

  const s = t - 9.2;
  const accelDur = 3.2;
  const a = 10.0 / accelDur;
  const vStart = 1.8;
  let x: number;
  let speedMps: number;
  if (s < accelDur) {
    x = 5.125 + vStart * s + 0.5 * a * s * s;
    speedMps = vStart + a * s;
  } else {
    x = 5.125 + vStart * accelDur + 0.5 * a * accelDur * accelDur + 11.8 * (s - accelDur);
    speedMps = 11.8;
  }
  return {
    x,
    speedMps,
    pitch: -0.036 * Math.sin(clamp01(s / 2.2) * Math.PI),
    braking: false,
    weaponOut: false,
    recoilKick: 0,
    stateLabel: `Peeling Out (${Math.round(speedMps * 3.6)} km/h)`,
  };
}

const THE_DRIVE_BY: VignetteDefinition = {
  id: 'the_drive_by',
  title: 'The Drive-By',
  subtitle: 'Car catches up, brakes down to match target’s walking pace (the tell), fires one ~4s burst, gone',
  durationSec: 13.5,
  durationForVariant: (variantId) => (variantId === 'rebel_girl_target' ? 13.8 : 13.5),
  instigationNote: 'FACTION / HIT · Watch the slow-down tell: fast approach → brake-light pace match → 4s burst → gone',
  defaultVariantId: 'unarmed_mark',
  variants: [
    {
      id: 'unarmed_mark',
      label: 'Curb Mark (4s Burst)',
      summary: 'Car brakes to match pedestrian pace for 1.9s, fires 4s burst, leaves body in blood pool',
    },
    {
      id: 'rebel_girl_target',
      label: 'Rebel Girl Target (Returns Fire)',
      summary: 'Rebel girl reads the slow-down tell, kneel-rolls at the curb, returns fire, reloads & holsters',
    },
  ],
  cast: (variantId) => {
    const isRebelTarget = variantId === 'rebel_girl_target';
    return [
      makeClassCast(
        'target',
        isRebelTarget ? 'Rebel Girl (Target)' : 'Marked Pedestrian',
        isRebelTarget ? 'Underground Mark (Armed)' : 'Rival / Marked Target',
        isRebelTarget ? 'rebel_girl' : 'civilian',
        {
          variantIdx: isRebelTarget ? 5 : 0,
          outfit: isRebelTarget ? 'leather_biker' : 'puffer_jacket',
        }
      ),
    ];
  },
  cues: (variantId) => {
    const cues: VignetteCueEvent[] = DRIVE_BY_SHOT_TIMES.map((timeSec, idx) => ({
      id: `db_shot_${idx}`,
      timeSec,
      kind: 'gunshot',
      actorId: 'driveby_car',
      targetId: 'target',
    }));
    if (variantId === 'rebel_girl_target') {
      cues.push(
        { id: 'db_blood_rg', timeSec: 6.1, kind: 'blood_hit', actorId: 'target', targetId: 'driveby_car' },
        { id: 'db_rg_ret_1', timeSec: 6.7, kind: 'gunshot', actorId: 'target', targetId: 'driveby_car' },
        { id: 'db_rg_ret_2', timeSec: 7.35, kind: 'gunshot', actorId: 'target', targetId: 'driveby_car' },
        { id: 'db_rg_ret_3', timeSec: 8.15, kind: 'gunshot', actorId: 'target', targetId: 'driveby_car' }
      );
    } else {
      cues.push(
        { id: 'db_blood_1', timeSec: 5.58, kind: 'blood_hit', actorId: 'target', targetId: 'driveby_car' },
        { id: 'db_blood_2', timeSec: 6.02, kind: 'blood_hit', actorId: 'target', targetId: 'driveby_car' },
        { id: 'db_blood_3', timeSec: 6.42, kind: 'blood_hit', actorId: 'target', targetId: 'driveby_car' }
      );
    }
    return cues;
  },
  evaluate: (variantId, t) => {
    const isRebelTarget = variantId === 'rebel_girl_target';
    const car = evalDriveByCar(t);
    const carZ = 0.55;

    const walkSpeedBase = 1.25;
    let tarX = -7.2 + walkSpeedBase * t;
    const tarZ = -2.05;
    let tarYaw = Math.PI * 0.5;
    let tarWalk = walkSpeedBase;
    let tarGun: GunHandlingState = isRebelTarget ? 'holstered' : 'unarmed';
    let tarGunProg = 0;
    let tarInt: InteractionPoseAction = 'none';
    let tarIntProg = 0;
    let tarRecoil = 0;
    let tarLookTarget: string | undefined;
    let bloodPoolProgress = 0;

    if (!isRebelTarget) {
      if (t >= 4.2 && t < 5.2) {
        tarLookTarget = 'driveby_car';
        if (t >= 4.75) {
          tarWalk = 0.55;
          tarX = -7.2 + walkSpeedBase * 4.75 + 0.55 * (t - 4.75);
          tarYaw = lerpYaw(Math.PI * 0.5, yawBetween(tarX, tarZ, car.x, carZ), smoothSeg(t, 4.75, 5.2));
        }
      } else if (t >= 5.2 && t < 6.45) {
        tarX = -7.2 + walkSpeedBase * 4.75 + 0.55 * 0.45 + 0.35 * (t - 5.2);
        tarYaw = yawBetween(tarX, tarZ, car.x, carZ);
        tarWalk = 0;
        tarInt = t < 5.5 ? 'witness_panic' : 'shoved_recoil';
        tarIntProg = seg(t, 5.5, 6.45);
        tarLookTarget = 'driveby_car';
      } else if (t >= 6.45) {
        tarX = -7.2 + walkSpeedBase * 4.75 + 0.55 * 0.45 + 0.35 * 1.25;
        tarYaw = yawBetween(tarX, tarZ, car.x, carZ);
        tarWalk = 0;
        tarInt = 'downed';
        bloodPoolProgress = smoothSeg(t, 6.35, 12.2);
      }
    } else {
      if (t >= 4.1 && t < 5.25) {
        tarLookTarget = 'driveby_car';
        if (t >= 4.55) {
          tarX = -7.2 + walkSpeedBase * 4.55;
          tarWalk = 0;
          tarYaw = lerpYaw(Math.PI * 0.5, yawBetween(tarX, tarZ, car.x, carZ), smoothSeg(t, 4.55, 5.0));
          tarGun = 'draw';
          tarGunProg = seg(t, 4.55, 5.25);
        }
      } else if (t >= 5.25 && t < 6.45) {
        tarX = -7.2 + walkSpeedBase * 4.55;
        tarWalk = 0;
        tarYaw = yawBetween(tarX, tarZ, car.x, carZ);
        tarLookTarget = 'driveby_car';
        tarGun = 'kneel_roll';
        tarGunProg = seg(t, 5.25, 6.3);
      } else if (t >= 6.45 && t < 9.3) {
        tarX = -7.2 + walkSpeedBase * 4.55;
        tarWalk = 0;
        tarYaw = yawBetween(tarX, tarZ, car.x, carZ);
        tarLookTarget = 'driveby_car';
        tarGun = 'fire';
        const r1 = t >= 6.7 && t < 6.9 ? 1 - (t - 6.7) / 0.2 : 0;
        const r2 = t >= 7.35 && t < 7.55 ? 1 - (t - 7.35) / 0.2 : 0;
        const r3 = t >= 8.15 && t < 8.35 ? 1 - (t - 8.15) / 0.2 : 0;
        tarRecoil = Math.max(r1, r2, r3);
        bloodPoolProgress = smoothSeg(t, 6.1, 10.5) * 0.18;
      } else if (t >= 9.3) {
        tarX = -7.2 + walkSpeedBase * 4.55;
        tarWalk = 0;
        tarYaw = yawBetween(tarX, tarZ, car.x, carZ);
        if (t < 10.3) {
          tarGun = 'low_ready';
        } else if (t < 12.1) {
          tarGun = 'reload';
          tarGunProg = seg(t, 10.3, 12.0);
        } else if (t < 13.3) {
          tarGun = 'holster';
          tarGunProg = seg(t, 12.1, 13.2);
        } else {
          tarGun = 'holstered';
        }
        bloodPoolProgress = 0.18;
      }
    }

    let beat: VignetteBeatInfo = {
      name: '01 · Fast Approach From Behind',
      description: 'Target walks calmly along the winter curb (~4.5 km/h) as a dark sedan closes fast down the lane (~24 km/h).',
    };
    if (t >= 2.0 && t < 3.3) {
      beat = {
        name: '02 · The Slow-Down (Brake Lights Flare)',
        description:
          'Car hits the brakes beside the target, nose diving as speed scrubs sharply from 24 km/h down to walking pace.',
      };
    } else if (t >= 3.3 && t < 5.2) {
      beat = {
        name: '03 · Pace Match — THE TELL',
        description:
          'For nearly two seconds before a shot fires, the sedan creeps alongside at exact walking speed — the unmistakable tell.',
        speaker: isRebelTarget ? 'Rebel Girl (Target)' : 'Marked Pedestrian',
        line: isRebelTarget ? 'Wait— why’d that car drop to my speed…' : '…What are you looking at?',
      };
    } else if (t >= 5.2 && t < 9.2) {
      beat = {
        name: '04 · One ~4-Second Burst',
        description: isRebelTarget
          ? 'Automatic burst rips from the side window across 4 seconds; Rebel Girl kneel-rolls and returns pistol fire.'
          : 'Automatic burst rips from the side window across 4 seconds as the car rolls past the collapsing mark.',
      };
    } else if (t >= 9.2) {
      beat = {
        name: '05 · Gone Into the Fog',
        description: isRebelTarget
          ? 'Car floors it out of sight; Rebel Girl drops to low-ready, reloads a fresh mag, and holsters cleanly.'
          : 'Burst cuts, brake lights snap off, car squats and floors it out of sight — leaving only the body and blood pool.',
      };
    }

    return {
      actors: [
        {
          castId: 'target',
          x: tarX,
          z: tarZ,
          yaw: tarYaw,
          walkSpeed: tarWalk,
          gunState: tarGun,
          gunStateProgress: tarGunProg,
          interaction: tarInt,
          interactionProgress: tarIntProg,
          lookTargetId: tarLookTarget,
          recoilKick: tarRecoil,
          handInPocket: !isRebelTarget && t < 4.2,
          bloodPoolProgress,
        },
      ],
      vehicles: [
        {
          id: 'driveby_car',
          label: 'Dark Sedan (Drive-By)',
          vehicleType: 'sedan',
          x: car.x,
          z: carZ,
          yaw: Math.PI * 0.5,
          speedMps: car.speedMps,
          pitch: car.pitch,
          braking: car.braking,
          weaponOut: car.weaponOut,
          recoilKick: car.recoilKick,
          stateLabel: car.stateLabel,
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 8. THE VAN SNATCH (Drive-By Kidnapping of Citizens & Player into Large Black Van)
// =============================================================================
function evalKidnapVan(t: number): {
  x: number;
  speedMps: number;
  pitch: number;
  braking: boolean;
  doorOpen: number;
  stateLabel: string;
} {
  // Van speeds in from x = -12.4, brakes hard to match walking pace (THE TELL: t=1.95..2.95), halts & executes fast 4.7s snatch
  const vCruise = 7.4;
  const vMatch = 1.25;
  if (t < 1.3) {
    const u = smoothSeg(t, 0, 1.3);
    const x = THREE.MathUtils.lerp(-12.4, -5.0, u);
    return {
      x,
      speedMps: vCruise,
      pitch: 0,
      braking: false,
      doorOpen: 0,
      stateLabel: 'Futuristic Black Van Approaching (~27 km/h)',
    };
  }
  if (t < 1.95) {
    const u = smoothSeg(t, 1.3, 1.95);
    const x = THREE.MathUtils.lerp(-5.0, -2.45, u);
    const speedMps = THREE.MathUtils.lerp(vCruise, vMatch, u);
    return {
      x,
      speedMps,
      pitch: 0.04 * Math.sin(u * Math.PI),
      braking: true,
      doorOpen: 0,
      stateLabel: `Braking Down (${Math.round(speedMps * 3.6)} km/h)`,
    };
  }
  if (t < 2.95) {
    // Pace-matching tell: creeps beside target at exact walking speed before sliding door fires open
    const u = (t - 1.95) / 1.0;
    const x = THREE.MathUtils.lerp(-2.45, -0.85, u);
    return {
      x,
      speedMps: vMatch,
      pitch: 0.012,
      braking: true,
      doorOpen: 0,
      stateLabel: 'PACE MATCH · THE TELL (4 km/h)',
    };
  }
  if (t < 7.75) {
    // Fast sliding cargo door (2.95..3.32 open, slams shut 7.22..7.65)
    let doorOpen = 1;
    if (t < 3.32) doorOpen = smoothSeg(t, 2.95, 3.32);
    else if (t >= 7.22) doorOpen = 1 - smoothSeg(t, 7.22, 7.65);
    return {
      x: -0.85,
      speedMps: 0,
      pitch: 0.005,
      braking: true,
      doorOpen,
      stateLabel: doorOpen > 0.35 ? 'Bay Door Open · Fast Curb Snatch' : 'Bay Door Slammed Shut',
    };
  }

  const s = t - 7.75;
  const x = -0.85 + Math.min(28, 2.6 * s * s + 2.2 * s);
  const speedMps = Math.min(15.0, 2.2 + 4.9 * s);
  return {
    x,
    speedMps,
    pitch: -0.036 * Math.sin(clamp01(s / 1.6) * Math.PI),
    braking: false,
    doorOpen: 0,
    stateLabel: `Black Van Peeling Out (${Math.round(speedMps * 3.6)} km/h)`,
  };
}

const THE_VAN_SNATCH: VignetteDefinition = {
  id: 'the_van_snatch',
  title: 'The Van Snatch',
  subtitle: 'Futuristic black van cuts the curb; crew rapidly bags victim or player and throws them inside lit bay',
  durationSec: 11.2,
  instigationNote: 'DRIVE-BY KIDNAP · Fast snatch · Clean arm’s-length grab points · 3rd-person & 1st-person interior van POV',
  defaultVariantId: 'snatch_citizen',
  variants: [
    {
      id: 'snatch_citizen',
      label: 'Snatch Citizen (Van Grab)',
      summary: 'Futuristic black van cuts off pedestrian; cover fires warning burst while grabber bags & pitches them into bay',
    },
    {
      id: 'snatch_player',
      label: 'Snatch Player (3rd Person)',
      summary: 'Black van cuts off player; crew bags player cleanly at arm’s length & throws them inside → blackout hook',
    },
    {
      id: 'snatch_player_fpv',
      label: 'Snatch Player (1st-Person POV)',
      summary: '1st-Person view of being kidnapped: bay door opens, hands rush in, thrown inside lit van bay before door slams shut',
    },
  ],
  cast: (variantId) => {
    const isPlayer = variantId === 'snatch_player' || variantId === 'snatch_player_fpv';
    if (isPlayer) {
      return [
        makeClassCast('victim', 'Player', 'Target (Walks Sidewalk → Bagged)', 'civilian', {
          variantIdx: 0,
          outfit: 'hoodie_parka',
        }),
        makeClassCast('grabber', 'Crew Grabber', 'Snatch Lead (Bag & Hoist)', 'gang_member', {
          variantIdx: 12,
          outfit: 'leather_biker',
        }),
        makeClassCast('cover', 'Enforcer Cover', 'Van Side Cover (Carbine)', 'mob_enforcer', {
          variantIdx: 20,
          outfit: 'puffer_jacket',
        }),
      ];
    }
    return [
      makeClassCast('victim', 'Citizen Mark', 'Target Pedestrian', 'civilian', {
        variantIdx: 4,
        outfit: 'cardigan_scarf',
      }),
      makeClassCast('grabber', 'Crew Grabber', 'Kidnapper (Bag & Throw)', 'gang_member', {
        variantIdx: 12,
        outfit: 'leather_biker',
      }),
      makeClassCast('cover', 'Crew Rifleman', 'Van Side Cover (Warning Burst)', 'gang_robber', {
        variantIdx: 16,
        outfit: 'hoodie_parka',
      }),
      makeClassCast('witness', 'Curb Witness', 'Panics & Bolts', 'civilian', {
        variantIdx: 5,
        outfit: 'tailored_blazer',
      }),
    ];
  },
  cues: (variantId) => {
    const isPlayer = variantId === 'snatch_player' || variantId === 'snatch_player_fpv';
    const cues: VignetteCueEvent[] = [
      { id: 'van_warn_shot_1', timeSec: 3.75, kind: 'gunshot', actorId: 'cover', targetId: isPlayer ? undefined : 'witness' },
      { id: 'van_warn_shot_2', timeSec: 4.02, kind: 'gunshot', actorId: 'cover', targetId: isPlayer ? undefined : 'witness' },
    ];
    if (isPlayer) {
      cues.push({ id: 'van_player_hook', timeSec: 7.45, kind: 'kidnap_hook', actorId: 'grabber', targetId: 'victim' });
    }
    return cues;
  },
  evaluate: (variantId, t) => {
    const isPlayer = variantId === 'snatch_player' || variantId === 'snatch_player_fpv';
    const isFpv = variantId === 'snatch_player_fpv';
    const van = evalKidnapVan(t);
    const vanZ = 0.55;
    // Open side cargo doorway at stopped van.x (-0.85) is centered at world x = -1.20, curb face z = -0.48
    const doorCenterX = -1.20;

    // Victim walks along sidewalk z = -1.78 from x = -4.3 toward x = -1.20 (doorCenterX)
    const walkU = smoothSeg(t, 0, 2.95);
    let vicX = THREE.MathUtils.lerp(-4.3, doorCenterX, walkU);
    let vicZ = -1.78;
    let vicYaw = Math.PI * 0.5;
    let vicWalk = t < 2.88 ? 1.3 : 0;
    let vicInt: InteractionPoseAction = 'none';
    let vicIntProg = 0;
    let vicBagged = false;
    let vicHidden = false;
    let vicY = 0;

    // Grabber & cover wait inside lit van cargo bay until side door rolls open at t = 2.95
    let grabX = van.x - 0.12;
    let grabZ = 0.24;
    let grabYaw = Math.PI;
    let grabWalk = 0;
    let grabGun: GunHandlingState = 'holstered';
    let grabGunProg = 0;
    let grabInt: InteractionPoseAction = 'none';
    let grabIntProg = 0;
    let grabHidden = t < 2.95;

    let covX = van.x - 0.58;
    let covZ = 0.24;
    let covYaw = Math.PI;
    let covWalk = 0;
    let covGun: GunHandlingState = 'holstered';
    let covGunProg = 0;
    const covInt: InteractionPoseAction = 'none';
    let covRecoil = 0;
    let covHidden = t < 2.95;

    // Optional citizen witness walking behind along curb
    let witX = -5.6 + smoothSeg(t, 0, 3.85) * 1.9;
    let witZ = -2.28;
    let witYaw = Math.PI * 0.5;
    let witWalk = t < 3.75 ? 1.05 : 0;
    let witInt: InteractionPoseAction = 'none';

    if (t >= 2.7 && t < 3.05) {
      vicYaw = lerpYaw(Math.PI * 0.5, 0, smoothSeg(t, 2.7, 3.02));
      vicInt = 'freeze';
    }

    // Grabber sprints out of open bay (-1.20, -0.30) to clean arm's reach (-1.20, -1.04 -> 0.74m separation!)
    if (t >= 2.95 && t < 3.68) {
      const out = smoothSeg(t, 2.95, 3.68);
      grabX = doorCenterX;
      grabZ = THREE.MathUtils.lerp(-0.22, -1.04, out);
      grabYaw = yawBetween(grabX, grabZ, vicX, vicZ);
      grabWalk = 2.8;
      grabGun = 'draw';
      grabGunProg = seg(t, 3.0, 3.62);
      vicYaw = yawBetween(vicX, vicZ, grabX, grabZ);
      vicInt = 'hands_up';
    } else if (t >= 3.68 && t < 4.78) {
      grabX = doorCenterX;
      grabZ = -1.04;
      grabYaw = yawBetween(grabX, grabZ, vicX, vicZ);
      if (t < 3.92) {
        grabGun = 'low_ready';
        vicInt = 'hands_up';
      } else if (t < 4.20) {
        grabGun = 'holster';
        grabGunProg = seg(t, 3.92, 4.20);
        vicInt = 'hands_up';
      } else {
        grabGun = 'holstered';
        grabInt = 'bag_over_head';
        grabIntProg = seg(t, 4.20, 4.78);
        vicBagged = t >= 4.44;
        vicInt = t >= 4.44 ? 'kidnap_struggle' : 'hands_up';
      }
    } else if (t >= 4.78 && t < 6.08) {
      // Fast kinetic two-hand haul: victim faces van (+Z), grabber stays 0.72m ahead then steps aside clear of doorframe
      const dragU = smoothSeg(t, 4.78, 6.04);
      vicX = doorCenterX;
      vicZ = THREE.MathUtils.lerp(-1.78, -1.05, dragU);
      vicYaw = 0; // facing van interior cleanly
      vicBagged = true;
      vicInt = 'kidnap_struggle';
      vicY = Math.sin(dragU * Math.PI) * 0.05;

      const stepAsideU = smoothSeg(t, 5.38, 6.04);
      const baseGrabX = doorCenterX;
      const baseGrabZ = vicZ + 0.72;
      grabX = THREE.MathUtils.lerp(baseGrabX, -0.52, stepAsideU);
      grabZ = THREE.MathUtils.lerp(baseGrabZ, -0.78, stepAsideU);
      grabYaw = yawBetween(grabX, grabZ, vicX, vicZ);
      grabWalk = 1.75;
      grabGun = 'holstered';
      grabInt = 'kidnap_carry';
      grabIntProg = dragU;
    } else if (t >= 6.08 && t < 7.52) {
      // Victim hurled headfirst into lit futuristic van bay (-1.20, +0.34, y=+0.44), turning slightly inside bay to see door slam!
      const throwU = smoothSeg(t, 6.08, 6.72);
      vicX = THREE.MathUtils.lerp(doorCenterX, -0.98, smoothSeg(t, 6.45, 7.10));
      vicZ = THREE.MathUtils.lerp(-1.05, 0.36, throwU);
      vicYaw = lerpYaw(0, Math.PI * 0.88, smoothSeg(t, 6.42, 6.95));
      vicBagged = true;
      vicInt = 'thrown_in_van';
      vicIntProg = t < 6.72 ? throwU : 1.0;
      vicY = Math.sin(throwU * Math.PI) * 0.42 + throwU * 0.44;
      if (t >= 6.72) vicY = 0.44;
      vicHidden = t >= 7.52;

      const boardU = smoothSeg(t, 6.68, 7.22);
      grabX = THREE.MathUtils.lerp(-0.52, doorCenterX, boardU);
      grabZ = THREE.MathUtils.lerp(-0.78, 0.22, boardU);
      grabYaw = yawBetween(-0.52, -0.78, doorCenterX, 0.22);
      grabWalk = t >= 6.68 ? 2.6 : 0;
      grabInt = t < 6.58 ? 'kidnap_carry' : 'none';
      grabIntProg = 1.0;
      grabHidden = t >= 7.20;
    } else if (t >= 7.52) {
      vicHidden = true;
      grabHidden = true;
      vicBagged = true;
    }

    // Cover rifleman clears doorway on the left (-2.32, -1.16), fires warning burst, quick reloads/holsters, boards right behind grabber
    if (t >= 2.95 && t < 3.65) {
      const out = smoothSeg(t, 2.95, 3.65);
      covX = THREE.MathUtils.lerp(-1.42, -2.32, out);
      covZ = THREE.MathUtils.lerp(-0.28, -1.16, out);
      covYaw = -Math.PI * 0.65;
      covWalk = 2.75;
      covGun = 'draw';
      covGunProg = seg(t, 3.0, 3.58);
    } else if (t >= 3.65 && t < 7.24) {
      covX = -2.32;
      covZ = -1.16;
      covYaw = -Math.PI * 0.62;
      if (t < 3.74) {
        covGun = 'aim';
      } else if (t < 4.25) {
        covGun = 'fire';
        const s1 = t >= 3.75 && t < 3.93 ? 1 - (t - 3.75) / 0.18 : 0;
        const s2 = t >= 4.02 && t < 4.20 ? 1 - (t - 4.02) / 0.18 : 0;
        covRecoil = Math.max(s1, s2);
      } else if (t < 4.65) {
        covGun = 'low_ready';
      } else if (t < 5.75) {
        covGun = 'reload';
        covGunProg = seg(t, 4.65, 5.75);
      } else if (t < 6.48) {
        covGun = 'holster';
        covGunProg = seg(t, 5.75, 6.48);
      } else {
        covGun = 'holstered';
        const boardU = smoothSeg(t, 6.52, 7.22);
        covX = THREE.MathUtils.lerp(-2.32, doorCenterX - 0.12, boardU);
        covZ = THREE.MathUtils.lerp(-1.16, 0.22, boardU);
        covYaw = yawBetween(-2.32, -1.16, doorCenterX - 0.12, 0.22);
        covWalk = t >= 6.52 ? 2.7 : 0;
        covHidden = t >= 7.20;
      }
    } else if (t >= 7.24) {
      covHidden = true;
    }

    if (!isPlayer) {
      if (t >= 3.75 && t < 4.6) {
        witInt = 'witness_panic';
        witYaw = yawBetween(witX, witZ, vicX, vicZ);
      } else if (t >= 4.6) {
        const flee = smoothSeg(t, 4.6, 8.2);
        witX = THREE.MathUtils.lerp(-3.7, -8.2, flee);
        witZ = THREE.MathUtils.lerp(-2.28, -3.45, flee);
        witYaw = yawBetween(-3.7, -2.28, -8.2, -3.45);
        witWalk = flee < 1 ? 3.5 : 0;
        witInt = 'flee';
      }
    }

    // In 1st-person POV keep the hood peripheral weave translucent (0.42) so the player clearly sees the lit van interior until door seals
    const hoodOp = isPlayer ? smoothSeg(t, 4.44, 4.82) * (isFpv ? 0.42 : 0.72) : 0;

    let beat: VignetteBeatInfo = {
      name: '01 · Curb Approach in Futuristic Black Van',
      description: isFpv
        ? '1st-Person POV: you walk along the winter sidewalk as a dark armored van with cyan LED trim cuts up the lane behind you.'
        : isPlayer
        ? 'Player walks along the winter sidewalk as a futuristic black van cuts across the lane from behind.'
        : 'Citizen walks along the winter curb as a futuristic black van accelerates up the lane.',
    };
    if (t >= 1.3 && t < 2.95) {
      beat = {
        name: '02 · Pace-Match Tell (Same Threat Read as Drive-By)',
        description:
          'Black van brakes hard to match walking pace (~4 km/h) beside the curb before the LED-lit cargo door ever moves.',
      };
    } else if (t >= 2.95 && t < 3.68) {
      beat = {
        name: '02 · Door Slides Open · Lit Interior Exposed',
        description: isFpv
          ? 'Sliding door rolls open revealing the cyan-lit van bay as the grabber rushes straight toward you!'
          : 'Armored side door slides open exposing the lit cargo bay as the kidnap crew pours onto the sidewalk.',
      };
    } else if (t >= 3.68 && t < 4.78) {
      beat = {
        name: '03 · Warning Burst & Clean Bag Over Head',
        description: isFpv
          ? 'Hands rush in at arm’s length and yank a coarse hood over your head, dimming your periphery toward the van.'
          : 'Cover fires warning shots while grabber holds clean 0.74m reach and snaps a black hood over the victim’s head.',
        speaker: 'Crew Grabber',
        line: isPlayer ? 'Bag on. Don’t fight— into the van!' : 'Grab him! Into the bay— MOVE!',
        hoodOverlayOpacity: hoodOp,
      };
    } else if (t >= 4.78 && t < 7.22) {
      beat = {
        name: '04 · Fast Curb Haul & Thrown Inside Van Bay',
        description: isFpv
          ? 'Dragged backward over the illuminated sill and thrown headfirst onto the ribbed floor of the cyan-lit black van!'
          : 'Grabber hauls victim to the open threshold, steps clear of the doorframe, and throws them onto the lit van floor.',
        hoodOverlayOpacity: hoodOp,
      };
    } else if (t >= 7.22) {
      const blackoutOp = isPlayer ? smoothSeg(t, 7.38, 8.35) * (1 - smoothSeg(t, 10.2, 11.2) * 0.15) : 0;
      beat = {
        name: isPlayer ? '05 · Door Slams Shut · Van Peels Out (Kidnap Hook)' : '05 · Door Slams Shut · Black Van Gone',
        description: isPlayer
          ? 'Armored sliding door seals the lit interior into pitch darkness; black van floors it into the winter fog.'
          : 'Cargo door slams shut cleanly; crew is already inside as the black van peels into the fog.',
        hoodOverlayOpacity: hoodOp,
        blackoutOpacity: blackoutOp,
        kidnapHookActive: isPlayer && t >= 7.38,
      };
    }

    const actors: VignetteActorFrame[] = [
      {
        castId: 'victim',
        x: vicX,
        z: vicZ,
        yaw: vicYaw,
        walkSpeed: vicWalk,
        gunState: 'unarmed',
        gunStateProgress: 0,
        interaction: vicInt,
        interactionProgress: vicIntProg,
        lookTargetId: vicBagged || vicHidden ? undefined : 'grabber',
        bagged: vicBagged,
        hidden: vicHidden,
        yOffset: vicY,
      },
      {
        castId: 'grabber',
        x: grabX,
        z: grabZ,
        yaw: grabYaw,
        walkSpeed: grabWalk,
        gunState: grabGun,
        gunStateProgress: grabGunProg,
        interaction: grabInt,
        interactionProgress: grabIntProg,
        lookTargetId: 'victim',
        hidden: grabHidden,
      },
      {
        castId: 'cover',
        x: covX,
        z: covZ,
        yaw: covYaw,
        walkSpeed: covWalk,
        gunState: covGun,
        gunStateProgress: covGunProg,
        interaction: covInt,
        interactionProgress: 0,
        recoilKick: covRecoil,
        hidden: covHidden,
      },
    ];

    if (!isPlayer) {
      actors.push({
        castId: 'witness',
        x: witX,
        z: witZ,
        yaw: witYaw,
        walkSpeed: witWalk,
        gunState: 'unarmed',
        gunStateProgress: 0,
        interaction: witInt,
        interactionProgress: 0,
        lookTargetId: t < 4.6 ? 'victim' : undefined,
      });
    }

    return {
      actors,
      vehicles: [
        {
          id: 'kidnap_van',
          label: 'Futuristic Black Van',
          vehicleType: 'van',
          vanDoorOpen: van.doorOpen,
          x: van.x,
          z: vanZ,
          yaw: Math.PI * 0.5,
          speedMps: van.speedMps,
          pitch: van.pitch,
          braking: van.braking,
          weaponOut: false,
          stateLabel: van.stateLabel,
        },
      ],
      beat,
    };
  },
};

// =============================================================================
// 9. THE TAIL (THE FOLLOW METHODOLOGY — Cover Hug, Occlusion, Queue, Two Turns)
// =============================================================================
const THE_TAIL: VignetteDefinition = {
  id: 'the_tail',
  title: 'The Tail',
  subtitle: 'Sleuth trails behind cover that blocks sightlines, joins bus queue two spots back, reacts to turns',
  durationSec: 15.0,
  instigationNote: 'SYSTEM · THE FOLLOW METHODOLOGY · Only the sleuth wears black trenchcoat + fedora · Hugs solid occluders',
  defaultVariantId: 'quick_turn',
  variants: [
    {
      id: 'quick_turn',
      label: 'Quick-Turn Catch (Mid-Blend)',
      summary: 'Cover hug → queue two places back → waiting hold → player whips around fast, catching sleuth mid-blend',
    },
    {
      id: 'slow_turn',
      label: 'Slow Turn (Finds Nobody)',
      summary: 'Cover hug → queue two places back → slow glance gives sleuth beat to tuck completely behind the poster pillar',
    },
  ],
  cast: () => [
    makeClassCast('player', 'Player', 'Walking Target (Checks Behind)', 'civilian', {
      variantIdx: 0,
      outfit: 'hoodie_parka',
    }),
    makeClassCast('sleuth', 'Watcher (Sleuth)', 'Follows via Cover & Queue', 'undercover_sleuth', {
      variantIdx: 1,
      outfit: 'trench_coat',
      coatColorHex: '#12151b',
      hasFedora: true,
    }),
    makeClassCast('commuter_a', 'Commuter (Front)', 'Front of Bus Queue', 'civilian', {
      variantIdx: 4,
      outfit: 'cardigan_scarf',
    }),
    makeClassCast('commuter_b', 'Commuter (Queue Buffer)', 'Between Player & Watcher', 'civilian', {
      variantIdx: 7,
      outfit: 'puffer_jacket',
    }),
    makeClassCast('crowd_cover', 'Passerby (Sightline Break)', 'Crosses Between Player & Tail', 'civilian', {
      variantIdx: 9,
      outfit: 'tailored_blazer',
    }),
  ],
  cues: () => [],
  evaluate: (variantId, t) => {
    const isQuick = variantId === 'quick_turn';

    // Player walks along curb edge z=-2.18 past Kiosk (-4.4, -3.95) -> curves cleanly to Bus Stop Queue (2.45, -2.72) in front of bench
    let pX = -2.0;
    let pZ = -2.18;
    let pYaw = Math.PI * 0.5;
    let pWalk = 0;
    let pInt: InteractionPoseAction = 'none';
    let pIntProg = 0;

    if (t < 2.4) {
      const u = smoothSeg(t, 0, 2.4);
      pX = THREE.MathUtils.lerp(-2.0, -0.75, u);
      pZ = -2.18;
      pYaw = Math.PI * 0.5;
      pWalk = 0.65;
    } else if (t < 6.7) {
      const u = smoothSeg(t, 2.4, 6.7);
      pX = THREE.MathUtils.lerp(-0.75, 2.45, u);
      pZ = THREE.MathUtils.lerp(-2.18, -2.72, smoothSeg(t, 4.2, 6.7));
      pYaw = u < 0.45 ? Math.PI * 0.5 : lerpYaw(Math.PI * 0.5, yawBetween(-0.75, -2.18, 2.45, -2.72), smoothSeg(t, 4.2, 6.5));
      pWalk = 1.05;
    } else if (t < 10.2) {
      pX = 2.45;
      pZ = -2.72;
      pYaw = Math.PI * 0.5;
      pWalk = 0;
    } else if (t < 13.1) {
      pX = 2.45;
      pZ = -2.72;
      if (isQuick) {
        const snapBack = smoothSeg(t, 10.2, 10.42);
        const returnFwd = smoothSeg(t, 12.1, 12.7);
        pYaw =
          t < 12.1
            ? lerpYaw(Math.PI * 0.5, -Math.PI * 0.52, snapBack)
            : lerpYaw(-Math.PI * 0.52, Math.PI * 0.5, returnFwd);
      } else {
        const slowTurn = smoothSeg(t, 10.2, 11.55);
        const returnFwd = smoothSeg(t, 12.2, 13.0);
        pYaw =
          t < 12.2
            ? lerpYaw(Math.PI * 0.5, -Math.PI * 0.52, slowTurn)
            : lerpYaw(-Math.PI * 0.52, Math.PI * 0.5, returnFwd);
        pInt = 'slow_glance_back';
        pIntProg = seg(t, 10.2, 13.0);
      }
    } else {
      pX = 2.45;
      pZ = -2.72;
      pYaw = Math.PI * 0.5;
    }

    // Crowd body walks west along curb lane z = -2.62, crossing Player & breaking Sleuth's sightline around t = 2.4..3.8
    const crU = smoothSeg(t, 0, 9.5);
    const crX = THREE.MathUtils.lerp(1.4, -6.2, crU);
    const crZ = -2.58;
    const crWalk = t < 9.4 ? 0.95 : 0;

    // Sleuth Follow Methodology with genuine solid-object occlusion & collision-free wall-hugging:
    // Kiosk spans x:[-5.30,-3.50], z:[-4.55,-3.35]; Streetlamp:(-2.6,-3.2); Poster Pillar:(-0.35,-3.55 r=0.46)
    let slX = -5.62;
    let slZ = -4.25;
    let slYaw = Math.PI * 0.45;
    let slWalk = 0;
    let slInt: InteractionPoseAction = 'cover_wall';
    let slIntProg = 0;
    let slLookTarget: string | undefined;

    if (t < 2.25) {
      // Hugs west brick wall of kiosk (-5.62 vs -5.30 wall), directly occluded from Player (-2.0..-0.85, -2.18)
      slX = -5.62;
      slZ = -4.25;
      slYaw = Math.PI * 0.42;
      slWalk = 0;
      slInt = 'cover_wall';
    } else if (t < 5.25) {
      // Circles cleanly NORTH around back of kiosk (z=-4.95) & behind streetlamp (-2.6,-3.2 -> z=-4.15) to Poster Pillar!
      const u = seg(t, 2.25, 5.25);
      if (u < 0.35) {
        const k = smoothSeg(u, 0, 0.35);
        slX = THREE.MathUtils.lerp(-5.62, -4.40, k);
        slZ = THREE.MathUtils.lerp(-4.25, -4.96, k);
      } else if (u < 0.7) {
        const k = smoothSeg(u, 0.35, 0.7);
        slX = THREE.MathUtils.lerp(-4.40, -2.60, k);
        slZ = THREE.MathUtils.lerp(-4.96, -4.25, k);
      } else {
        const k = smoothSeg(u, 0.7, 1.0);
        slX = THREE.MathUtils.lerp(-2.60, -1.16, k);
        slZ = THREE.MathUtils.lerp(-4.25, -3.82, k);
      }
      slYaw = yawBetween(slX, slZ, pX, pZ);
      slWalk = 1.45;
      slInt = 'none';
      slLookTarget = 'player';
    } else if (t < 6.8) {
      // Hugs far-west face of solid Poster Pillar (-1.16, -3.82 -> 0.85m from (-0.35,-3.55)), obstructing Player's sightline!
      slX = -1.16;
      slZ = -3.82;
      slYaw = yawBetween(slX, slZ, -0.35, -3.55);
      slWalk = 0;
      slInt = 'cover_wall';
    } else if (t < 8.6) {
      // Circles cleanly around north edge of Poster Pillar into queue TWO places back at (0.80, -2.72) behind Commuter B (1.55) & Player (2.45)
      const qU = seg(t, 6.8, 8.6);
      if (qU < 0.45) {
        const k = smoothSeg(qU, 0, 0.45);
        slX = THREE.MathUtils.lerp(-1.16, -0.35, k);
        slZ = THREE.MathUtils.lerp(-3.82, -4.32, k);
        slYaw = yawBetween(slX, slZ, 0.8, -2.72);
      } else {
        const k = smoothSeg(qU, 0.45, 1.0);
        slX = THREE.MathUtils.lerp(-0.35, 0.80, k);
        slZ = THREE.MathUtils.lerp(-4.32, -2.72, k);
        slYaw = k < 0.88 ? yawBetween(-0.35, -4.32, 0.80, -2.72) : yawBetween(0.80, -2.72, -0.35, -3.55);
      }
      slWalk = qU < 0.96 ? 1.15 : 0;
      slInt = qU >= 0.96 ? 'cover_poster' : 'none';
    } else {
      if (isQuick) {
        if (t >= 9.9 && t < 11.95) {
          // Steps/leans slightly toward curb edge to peek past Commuter B -> caught locking eyes on Quick Turn!
          const stepOut = smoothSeg(t, 9.9, 10.3) * (1 - smoothSeg(t, 11.55, 11.95));
          slX = THREE.MathUtils.lerp(0.80, 0.88, stepOut);
          slZ = THREE.MathUtils.lerp(-2.72, -2.38, stepOut);
          slYaw = yawBetween(slX, slZ, pX, pZ);
          slWalk = stepOut > 0.05 && stepOut < 0.95 ? 0.6 : 0;
          slInt = 'mid_blend_catch';
          slIntProg = seg(t, 10.15, 11.85);
        } else {
          slX = 0.80;
          slZ = -2.72;
          slYaw = yawBetween(slX, slZ, -0.35, -3.55);
          slWalk = 0;
          slInt = 'cover_poster';
        }
      } else {
        // Slow Turn: Sleuth reads the casual shoulder check early and slips straight behind the Poster Pillar, obstructing Player's view completely!
        if (t < 9.85) {
          slX = 0.80;
          slZ = -2.72;
          slYaw = yawBetween(slX, slZ, -0.35, -3.55);
          slWalk = 0;
          slInt = 'cover_poster';
        } else if (t < 11.35) {
          const hideU = seg(t, 9.85, 11.35);
          if (hideU < 0.5) {
            const k = smoothSeg(hideU, 0, 0.5);
            slX = THREE.MathUtils.lerp(0.80, 0.15, k);
            slZ = THREE.MathUtils.lerp(-2.72, -4.05, k);
          } else {
            const k = smoothSeg(hideU, 0.5, 1.0);
            slX = THREE.MathUtils.lerp(0.15, -1.04, k);
            slZ = THREE.MathUtils.lerp(-4.05, -3.86, k);
          }
          slYaw = yawBetween(slX, slZ, -0.35, -3.55);
          slWalk = 1.45;
          slInt = 'none';
        } else {
          // Hugging far side of Poster Pillar directly along Player (2.45,-2.72) -> Pillar (-0.35,-3.55) ray!
          slX = -1.04;
          slZ = -3.86;
          slYaw = yawBetween(slX, slZ, -0.35, -3.55);
          slWalk = 0;
          slInt = 'cover_wall';
        }
      }
    }

    let beat: VignetteBeatInfo = {
      name: '01 · Wall Hug Behind Kiosk (Obstructed Sightline)',
      description:
        'Sleuth in black trenchcoat & fedora hugs the kiosk wall completely behind its solid mass — zero line-of-sight to the player.',
    };
    if (t >= 2.25 && t < 5.25) {
      beat = {
        name: '02 · Cover Discipline (New Sightline Angle)',
        description:
          'Passing pedestrian crosses the lane to break sightline; sleuth circles behind the kiosk & streetlamp cleanly without clipping.',
      };
    } else if (t >= 5.25 && t < 8.6) {
      beat = {
        name: '03 · Poster Pillar Hug → Queue Two Spots Back',
        description:
          'Sleuth hugs behind the solid poster pillar to stay obscured, then slips into the bus stop queue two places behind the player.',
      };
    } else if (t >= 8.6 && t < 10.2) {
      beat = {
        name: '04 · Waiting Hold (Poster Cover)',
        description:
          'Patient waiting hold two places back in queue; only the sleuth dresses in black trenchcoat and fedora while commuters wear street coats.',
      };
    } else if (t >= 10.2) {
      beat = isQuick
        ? {
            name: '05 · Quick-Turn Catch (Exposed Mid-Blend)',
            description:
              'Player whips around fast! Sleuth stepped out to peek past the commuter and is caught locking eyes mid-blend before snapping back.',
          }
        : {
            name: '05 · Slow Turn Finds Nobody (Pillar Occludes)',
            description:
              'Slow shoulder check gives the sleuth time to slip back and hug the far side of the poster pillar, blocking the player’s line of sight.',
          };
    }

    return {
      actors: [
        {
          castId: 'player',
          x: pX,
          z: pZ,
          yaw: pYaw,
          walkSpeed: pWalk,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: pInt,
          interactionProgress: pIntProg,
          lookTargetId: isQuick && t >= 10.2 && t < 12.1 ? 'sleuth' : undefined,
        },
        {
          castId: 'sleuth',
          x: slX,
          z: slZ,
          yaw: slYaw,
          walkSpeed: slWalk,
          gunState: 'holstered',
          gunStateProgress: 0,
          interaction: slInt,
          interactionProgress: slIntProg,
          lookTargetId: slLookTarget,
          handInPocket: slInt === 'none',
        },
        {
          castId: 'commuter_a',
          x: 3.35,
          z: -2.72,
          yaw: Math.PI * 0.5,
          walkSpeed: 0,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: 'cover_phone',
          interactionProgress: 0,
        },
        {
          castId: 'commuter_b',
          x: 1.55,
          z: -2.72,
          yaw: Math.PI * 0.5,
          walkSpeed: 0,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: 'none',
          interactionProgress: 0,
        },
        {
          castId: 'crowd_cover',
          x: crX,
          z: crZ,
          yaw: -Math.PI * 0.5,
          walkSpeed: crWalk,
          gunState: 'unarmed',
          gunStateProgress: 0,
          interaction: 'none',
          interactionProgress: 0,
        },
      ],
      beat,
    };
  },
};

export const PHASE1_VIGNETTES: readonly VignetteDefinition[] = [
  HOLD_UP,
  SURROUND,
  STANDOFF,
  THE_TAP,
  THE_SCAVENGE,
  THE_DRIVE_BY,
  THE_VAN_SNATCH,
  THE_TAIL,
  SQUARE_OFF,
];

export function getVignetteById(id: VignetteId): VignetteDefinition {
  return PHASE1_VIGNETTES.find((v) => v.id === id) ?? HOLD_UP;
}
