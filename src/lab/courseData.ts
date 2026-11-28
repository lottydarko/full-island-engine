import * as THREE from 'three';

export type WallMaterialKind = 'concrete' | 'glass' | 'brick' | 'steel';

export interface CourseBox {
  id: string;
  center: THREE.Vector3;
  halfExtents: THREE.Vector3;
  yawRad: number;
  pitchRad: number;
  runnable: boolean;
  climbable?: boolean;
  materialKind: WallMaterialKind;
  mountBandY?: number;
  zoneLabel?: string;
  // Precomputed trig for zero-GC collision loops
  cosYaw: number;
  sinYaw: number;
  cosPitch: number;
  sinPitch: number;
}

export interface CourseTargetPlate {
  id: string;
  position: THREE.Vector3;
  yawRad: number;
  radius: number;
}

export interface CourseCheckpoint {
  id: string;
  label: string;
  position: THREE.Vector3;
  yawRad: number;
}

function makeBox(
  id: string,
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  opts: {
    yawDeg?: number;
    pitchDeg?: number;
    runnable?: boolean;
    climbable?: boolean;
    material?: WallMaterialKind;
    mountBandY?: number;
    zoneLabel?: string;
  } = {},
): CourseBox {
  const yawRad = THREE.MathUtils.degToRad(opts.yawDeg ?? 0);
  const pitchRad = THREE.MathUtils.degToRad(opts.pitchDeg ?? 0);
  return {
    id,
    center: new THREE.Vector3(cx, cy, cz),
    halfExtents: new THREE.Vector3(w * 0.5, h * 0.5, d * 0.5),
    yawRad,
    pitchRad,
    runnable: opts.runnable ?? false,
    climbable: opts.climbable ?? false,
    materialKind: opts.material ?? 'concrete',
    mountBandY: opts.mountBandY,
    zoneLabel: opts.zoneLabel,
    cosYaw: Math.cos(yawRad),
    sinYaw: Math.sin(yawRad),
    cosPitch: Math.cos(pitchRad),
    sinPitch: Math.sin(pitchRad),
  };
}

export interface WallRunCourseSpec {
  boxes: CourseBox[];
  targets: CourseTargetPlate[];
  checkpoints: CourseCheckpoint[];
  spawnPosition: THREE.Vector3;
  spawnYawRad: number;
  fallRespawnY: number;
}

/**
 * Elevated Kaluga Parkour Circuit:
 * Designed to test mount pickup, angled chaining, the 4-Second Law,
 * Wall Slide -> Power Bounce vertical gain, and a continuous 180-degree loop return.
 */
export function buildWallRunCourseSpec(): WallRunCourseSpec {
  const boxes: CourseBox[] = [
    // -----------------------------------------------------------------------
    // LAUNCH DECK (Start Platform Z: +8 .. -16, Y = 0)
    // -----------------------------------------------------------------------
    makeBox('deck_start', 0, -0.6, -4, 11, 1.2, 24, {
      material: 'concrete',
      zoneLabel: '01 · LAUNCH DECK',
    }),

    // -----------------------------------------------------------------------
    // STAGE 1: Concrete Straight -> Angled Glass Chain
    // -----------------------------------------------------------------------
    makeBox('wall_1a_concrete', -3.6, 3.8, -26.5, 1.2, 8.8, 25, {
      yawDeg: 0,
      runnable: true,
      material: 'concrete',
      mountBandY: 1.8,
      zoneLabel: 'STAGE 1A · CONCRETE',
    }),
    makeBox('wall_1b_glass', 4.8, 4.4, -49.5, 1.0, 9.6, 26, {
      yawDeg: -16,
      runnable: true,
      material: 'glass',
      mountBandY: 2.2,
      zoneLabel: 'STAGE 1B · ANGLED GLASS',
    }),
    // Elevated landing deck + safety return ramp underneath
    makeBox('deck_stage1_end', 0.4, 0.8, -68, 12, 1.2, 14, {
      material: 'steel',
      zoneLabel: 'STAGE 2 ENTRY',
    }),
    makeBox('deck_stage1_safety', 0, -3.4, -42, 18, 1.0, 62, {
      material: 'concrete',
    }),
    makeBox('ramp_stage1_back', 6.8, -1.3, -64, 3.6, 0.8, 18, {
      pitchDeg: 14,
      material: 'steel',
    }),

    // -----------------------------------------------------------------------
    // STAGE 2: Twin Canyon Alternating Chain (Brick / Glass / Concrete)
    // -----------------------------------------------------------------------
    makeBox('wall_2a_brick', -5.4, 4.8, -86, 1.3, 10.2, 22, {
      yawDeg: 10,
      runnable: true,
      material: 'brick',
      mountBandY: 2.6,
      zoneLabel: 'STAGE 2A · BRICK CANYON',
    }),
    makeBox('wall_2b_glass', 5.2, 5.2, -106, 1.0, 10.4, 22, {
      yawDeg: -12,
      runnable: true,
      material: 'glass',
      mountBandY: 2.8,
    }),
    makeBox('wall_2c_concrete', -5.0, 5.4, -126, 1.3, 10.6, 22, {
      yawDeg: 4,
      runnable: true,
      material: 'concrete',
      mountBandY: 3.0,
    }),
    makeBox('wall_2d_brick', 5.0, 5.8, -144, 1.3, 11.0, 20, {
      yawDeg: -8,
      runnable: true,
      material: 'brick',
      mountBandY: 3.2,
    }),
    makeBox('deck_stage2_safety', 0, -3.4, -114, 20, 1.0, 82, {
      material: 'concrete',
    }),
    makeBox('deck_stage2_end', 0, 1.6, -158, 12, 1.2, 14, {
      material: 'steel',
      zoneLabel: 'STAGE 3 · 4-SECOND TOWER',
    }),
    makeBox('ramp_stage2_back', 7.2, -0.9, -152, 3.6, 0.8, 22, {
      pitchDeg: 13,
      material: 'steel',
    }),

    // -----------------------------------------------------------------------
    // STAGE 3: THE 4-SECOND WALL & SLIDE -> POWER BOUNCE VERTICAL CHALLENGE
    // -----------------------------------------------------------------------
    // 38m long slate-concrete wall (~4.0s at sprint speed)
    makeBox('wall_3a_4sec_tower', -4.4, 5.8, -184, 1.6, 15.0, 38, {
      yawDeg: 0,
      runnable: true,
      material: 'concrete',
      mountBandY: 3.6,
      zoneLabel: '4.0s LAW · SLIDE -> JUMP',
    }),
    // Right-side upper catch wall for high chain or double bounce
    makeBox('wall_3b_high_brick', 5.4, 9.2, -198, 1.4, 11.0, 24, {
      yawDeg: -8,
      runnable: true,
      material: 'brick',
      mountBandY: 7.4,
    }),
    // Lower safety deck below 4-Second Tower (catching failed slides safely!)
    makeBox('deck_stage3_safety', 0, -2.4, -188, 22, 1.2, 52, {
      material: 'concrete',
    }),
    makeBox('ramp_stage3_recovery', -7.8, -0.4, -168, 3.6, 0.8, 19, {
      pitchDeg: 12,
      material: 'steel',
    }),
    // HIGH UPPER OVERPASS reached by Slide -> Power Bounce!
    makeBox('deck_stage3_upper', 1.2, 7.6, -214, 14, 1.2, 16, {
      material: 'steel',
      zoneLabel: 'POWER BOUNCE SUMMIT (+7.6m)',
    }),

    // -----------------------------------------------------------------------
    // STAGE 4: 180-DEGREE SWEEPING RETURN LOOP BACK TO LAUNCH DECK
    // -----------------------------------------------------------------------
    makeBox('wall_4a_curve_glass', 14.0, 10.2, -221, 1.0, 10.5, 22, {
      yawDeg: -68,
      runnable: true,
      material: 'glass',
      mountBandY: 9.0,
    }),
    makeBox('wall_4b_curve_brick', 31.0, 9.5, -210, 1.3, 10.5, 24, {
      yawDeg: -130,
      runnable: true,
      material: 'brick',
      mountBandY: 8.2,
    }),
    makeBox('deck_stage4_mid', 38.0, 4.2, -186, 14, 1.2, 20, {
      material: 'steel',
      zoneLabel: 'RETURN EXPRESSWAY',
    }),
    // Long high-speed return corridor along X = +38 back toward Z = 0
    makeBox('wall_4c_return_concrete', 42.5, 7.5, -156, 1.4, 11.0, 34, {
      yawDeg: 180,
      runnable: true,
      material: 'concrete',
      mountBandY: 6.0,
    }),
    makeBox('wall_4d_return_glass', 33.5, 6.8, -118, 1.0, 11.0, 34, {
      yawDeg: 172,
      runnable: true,
      material: 'glass',
      mountBandY: 5.4,
    }),
    makeBox('wall_4e_return_brick', 42.0, 6.0, -78, 1.3, 11.0, 36, {
      yawDeg: 184,
      runnable: true,
      material: 'brick',
      mountBandY: 4.5,
    }),
    makeBox('wall_4f_return_concrete', 31.0, 4.8, -36, 1.4, 10.5, 36, {
      yawDeg: 158,
      runnable: true,
      material: 'concrete',
      mountBandY: 3.4,
    }),
    makeBox('deck_stage4_safety', 38.0, -3.4, -106, 22, 1.2, 178, {
      material: 'concrete',
    }),
    // Final return bridge back onto Start Launch Deck
    makeBox('deck_return_bridge', 18.0, -0.6, -4, 26, 1.2, 12, {
      material: 'steel',
    }),

    // -----------------------------------------------------------------------
    // STAGE 5: DEDICATED ARM-CLIMB & WALL RUN-UP PROVING GROUND (WEST WING)
    // -----------------------------------------------------------------------
    makeBox('bridge_to_armclimb', -15.5, -0.6, -4, 20, 1.2, 8, {
      material: 'steel',
      zoneLabel: 'ARM-CLIMB WING ->',
    }),
    makeBox('deck_5_entry', -32.0, -0.6, -4, 14, 1.2, 16, {
      material: 'steel',
      zoneLabel: '06 · ARM-CLIMB PROVING GROUND',
    }),

    // 5A: Wall Run-Up Ledge Staircase (2.7m -> 6.1m -> 9.8m reachable walls)
    makeBox('runup_5a_step1', -38.5, 1.35, -17.5, 7.2, 2.7, 5.2, {
      runnable: true,
      material: 'concrete',
      mountBandY: 1.5,
      zoneLabel: 'RUN-UP 2.7m',
    }),
    makeBox('runup_5a_step2', -38.5, 3.05, -26.5, 7.2, 6.1, 5.2, {
      runnable: true,
      material: 'brick',
      mountBandY: 4.4,
      zoneLabel: 'RUN-UP 3.4m STEP',
    }),
    makeBox('runup_5a_step3', -38.5, 4.9, -35.5, 7.2, 9.8, 5.2, {
      runnable: true,
      material: 'concrete',
      mountBandY: 7.9,
      zoneLabel: 'RUN-UP 3.7m CREST',
    }),
    makeBox('deck_5a_catwalk', -32.5, 10.4, -30.5, 10, 1.2, 14, {
      material: 'steel',
    }),

    // 5B: Direct approach bridge + Vertical Hand-Over-Hand Climbable Tower (11.0m face)
    makeBox('approach_5b_climb', -26.0, -0.6, -14.8, 5.6, 1.2, 6.2, {
      material: 'steel',
    }),
    makeBox('climb_5b_tower', -26.0, 5.5, -18.5, 6.0, 11.0, 1.6, {
      runnable: true,
      climbable: true,
      material: 'steel',
      mountBandY: 3.5,
      zoneLabel: 'HAND-OVER-HAND TOWER',
    }),
    makeBox('deck_5b_landing', -26.0, 10.4, -23.8, 8.5, 1.2, 9.2, {
      material: 'steel',
    }),

    // 5C: Twin Climbable Traverse Walls & Hand-Over-Hand Chute
    makeBox('climb_5c_traverse', -21.0, 13.0, -45.5, 1.6, 11.5, 22, {
      runnable: true,
      climbable: true,
      material: 'steel',
      mountBandY: 11.5,
      zoneLabel: 'ARM-CLIMB TRAVERSE',
    }),
    makeBox('climb_5d_counter', -31.5, 15.5, -67.5, 1.6, 13.0, 22, {
      runnable: true,
      climbable: true,
      material: 'concrete',
      mountBandY: 13.8,
    }),
    makeBox('climb_5e_summit_wall', -26.0, 16.5, -83.5, 8.6, 14.0, 1.6, {
      runnable: true,
      climbable: true,
      material: 'steel',
      mountBandY: 15.0,
      zoneLabel: 'SUMMIT CHIMNEY',
    }),
    makeBox('deck_5_summit', -26.0, 22.9, -90.5, 13, 1.2, 13, {
      material: 'steel',
      zoneLabel: 'ARM-CLIMB SUMMIT (+23.5m)',
    }),

    // Safety floor & ramp underneath Stage 5 so missed climbs recover cleanly
    makeBox('deck_5_safety', -30.5, -3.2, -52.0, 28, 1.2, 98, {
      material: 'concrete',
    }),
    makeBox('ramp_5_recovery', -32.0, -1.5, -14.5, 4.4, 0.8, 14, {
      pitchDeg: 13,
      material: 'steel',
    }),
  ];

  const targets: CourseTargetPlate[] = [
    { id: 't1', position: new THREE.Vector3(-2.8, 3.2, -28), yawRad: Math.PI * 0.5, radius: 0.65 },
    { id: 't2', position: new THREE.Vector3(3.8, 3.8, -51), yawRad: -Math.PI * 0.5, radius: 0.65 },
    { id: 't3', position: new THREE.Vector3(-4.2, 4.2, -88), yawRad: Math.PI * 0.5, radius: 0.65 },
    { id: 't4', position: new THREE.Vector3(4.0, 4.6, -108), yawRad: -Math.PI * 0.5, radius: 0.65 },
    { id: 't5', position: new THREE.Vector3(-3.3, 4.8, -184), yawRad: Math.PI * 0.5, radius: 0.72 },
    { id: 't6', position: new THREE.Vector3(1.2, 9.6, -220), yawRad: 0, radius: 0.75 },
    { id: 't7', position: new THREE.Vector3(41.4, 6.2, -156), yawRad: -Math.PI * 0.5, radius: 0.7 },
    { id: 't8', position: new THREE.Vector3(34.6, 5.5, -118), yawRad: Math.PI * 0.5, radius: 0.7 },
    { id: 't9', position: new THREE.Vector3(-26.0, 25.2, -96), yawRad: 0, radius: 0.82 },
  ];

  const checkpoints: CourseCheckpoint[] = [
    {
      id: 'cp_start',
      label: '01 · Launch Deck',
      position: new THREE.Vector3(0, 0, 2),
      yawRad: 0,
    },
    {
      id: 'cp_canyon',
      label: '02 · Twin Canyon',
      position: new THREE.Vector3(0.4, 1.4, -68),
      yawRad: 0,
    },
    {
      id: 'cp_tower',
      label: '03 · 4-Second Tower',
      position: new THREE.Vector3(0, 2.2, -158),
      yawRad: 0,
    },
    {
      id: 'cp_summit',
      label: '04 · Bounce Summit',
      position: new THREE.Vector3(1.2, 8.2, -214),
      yawRad: -Math.PI * 0.35,
    },
    {
      id: 'cp_return',
      label: '05 · Return Loop',
      position: new THREE.Vector3(38.0, 4.8, -186),
      yawRad: Math.PI,
    },
    {
      id: 'cp_armclimb',
      label: '06 · Arm-Climb Course',
      position: new THREE.Vector3(-31.0, 0, 0),
      yawRad: 0,
    },
  ];

  return {
    boxes,
    targets,
    checkpoints,
    spawnPosition: new THREE.Vector3(0, 0, 2),
    spawnYawRad: 0,
    fallRespawnY: -18,
  };
}
