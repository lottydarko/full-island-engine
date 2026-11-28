export interface PlayerKitConfig {
  movement: {
    standEyeHeight: number;
    crouchEyeHeight: number;
    slideEyeHeight: number;
    walkSpeed: number;
    sprintSpeed: number;
    crouchSpeed: number;
    crouchAdsSpeed: number;
    adsSpeed: number;
    groundAccel: number;
    groundDecel: number;
    airAccel: number;
    airDrag: number;
    gravity: number;
    jumpVelocity: number;
    /** Athletic knee-bend anticipation load duration before launch (seconds) */
    jumpLoadDuration: number;
    /** Camera downward bend dip while loading jump (meters) */
    jumpLoadEyeDip: number;
    /** Exponential gravity multiplier ramp rate after passing jump apex */
    fallGravityExpRate: number;
    /** Maximum gravity multiplier during fast fall back to ground height */
    fallGravityMaxMult: number;
    footstepDistanceWalk: number;
    footstepDistanceSprint: number;
  };
  slide: {
    boostMultiplier: number;
    minBoostSpeed: number;
    maxSpeed: number;
    minEntrySpeed: number;
    duration: number;
    surgeDuration: number;
    surgeHoldSpeed: number;
    drag: number;
    minCommitTime: number;
    minEndSpeed: number;
    cooldown: number;
    steerRate: number;
    hopSpeedRetention: number;
    hopJumpVelocity: number;
    fovBonus: number;
    sprintFovBonus: number;
    cameraPitch: number;
    cameraRoll: number;
  };
  wallRun: {
    /** Minimum horizontal approach speed (m/s) to mount a runnable wall */
    entryMinSpeed: number;
    /** Maximum entry angle vs wall plane (degrees) — generous pickup cone */
    entryMaxAngleDeg: number;
    /** Horizontal pickup reach beyond player capsule radius (meters) */
    mountReachM: number;
    /** Player collision capsule radius (meters) */
    playerRadiusM: number;
    /** The 4-Second Law: wall run maximum duration before ending into slide/jump */
    maxDurationSec: number;
    /** Initial tangential speed surge multiplier on mount */
    mountSpeedBoost: number;
    /** Minimum tangential run speed on mount (m/s) */
    minRunSpeed: number;
    /** Top speed cap on wall run (m/s) */
    maxRunSpeed: number;
    /** Speed decay rate (m/s per second) across the 4-second wall run */
    speedDecayPerSec: number;
    /** Softened downward gravity while wall-running (m/s²) */
    wallGravity: number;
    /** Upward carry impulse on mount to erase falling momentum */
    mountUpCarry: number;
    /** Outward push speed when jumping off wall run */
    leapOutwardSpeed: number;
    /** Upward velocity when jumping off wall run */
    leapUpVelocity: number;
    /** Forward tangent boost added on wall-run leap */
    leapForwardBoost: number;
    /** Momentary spring-load coil duration (s) before exploding laterally off wall */
    leapLoadDuration: number;
    /** Wall-slide gravity acceleration downward (m/s²) */
    slideGravity: number;
    /** Max downward slide terminal speed (m/s) */
    slideTerminalSpeed: number;
    /** Friction deceleration on forward tangent speed during wall slide */
    slideTangentDrag: number;
    /** POWER BOUNCE: base upward velocity when jumping out of a wall slide */
    slideBounceUpBase: number;
    /** POWER BOUNCE: extra upward velocity gained from downward slide speed conversion */
    slideBounceDownConversion: number;
    /** POWER BOUNCE: outward kick speed from wall */
    slideBounceOutwardSpeed: number;
    /** POWER BOUNCE: forward tangent launch speed */
    slideBounceForwardSpeed: number;
    /** Camera roll angle (radians) away from wall during wall-run */
    cameraRollRad: number;
    /** Camera roll angle (radians) away from wall during wall-slide */
    slideCameraRollRad: number;
    /** Extra FOV surge (degrees) on wall-run & slide bounce */
    fovBonusDeg: number;
    /** Cooldown before re-mounting the exact same wall face (seconds); 0 for other walls */
    sameWallCooldownSec: number;
    /** Maximum wall height above feet (meters) eligible for vertical wall run-up to reach a ledge */
    runUpMaxHeightM: number;
    /** Initial upward velocity impulse on starting a wall run-up (m/s) */
    runUpInitVel: number;
    /** Maximum duration of a vertical wall run-up before gravity reclaims or arm-climb engages (seconds) */
    runUpDurationSec: number;
    /** Upward-and-backwards kick velocity when jumping off a wall run-up or arm climb (m/s) */
    runUpKickBackSpeed: number;
  };
  camera: {
    hipFov: number;
    adsFov: number;
    swordGuardFov: number;
    flashlightFocusFov: number;
    mouseSensitivityHip: number;
    mouseSensitivityAds: number;
    gamepadLookSpeedHip: number;
    gamepadLookSpeedAds: number;
    pitchMin: number;
    pitchMax: number;
  };
  keybinds: {
    forward: string[];
    backward: string[];
    left: string[];
    right: string[];
    sprint: string[];
    jump: string[];
    crouch: string[];
    reload: string[];
    interact: string[];
    flashlight: string[];
    quickMelee: string[];
    adsToggle: string[];
    switchWeapon: string[];
    slots: {
      pistol9mm: string;
      futuristic: string;
      rustSmg: string;
      retroSmg: string;
      rustShotgun: string;
      sword: string;
      flashlight: string;
      unarmed: string;
    };
  };
  gamepad: {
    lookXAxis: number;
    lookYAxis: number;
    moveXAxis: number;
    moveYAxis: number;
    leftDeadzone: number;
    rightDeadzone: number;
    sprintButton: number; // LS click (button 10)
    jumpButton: number; // A (button 0)
    crouchSlideButton: number; // B (button 1)
    reloadInteractButton: number; // X (button 2)
    switchWeaponButton: number; // Y (button 3)
    quickMeleeButton: number; // LB (button 4)
    adsTrigger: number; // LT (button 6)
    fireTrigger: number; // RT (button 7)
    flashlightButtons: number[];
    triggerThreshold: number;
  };
}

export const DEFAULT_PLAYER_CONFIG: PlayerKitConfig = {
  movement: {
    standEyeHeight: 1.66,
    crouchEyeHeight: 1.06,
    slideEyeHeight: 0.78,
    walkSpeed: 5.6,
    sprintSpeed: 9.8,
    crouchSpeed: 3.1,
    crouchAdsSpeed: 2.3,
    adsSpeed: 3.8,
    groundAccel: 15.0,
    groundDecel: 12.0,
    airAccel: 6.4,
    airDrag: 0.22,
    gravity: 21.0,
    jumpVelocity: 10.9,
    jumpLoadDuration: 0.085,
    jumpLoadEyeDip: 0.17,
    fallGravityExpRate: 2.35,
    fallGravityMaxMult: 2.45,
    footstepDistanceWalk: 1.65,
    footstepDistanceSprint: 2.25,
  },
  slide: {
    boostMultiplier: 1.24,
    minBoostSpeed: 10.8,
    maxSpeed: 14.2,
    minEntrySpeed: 6.4,
    duration: 0.92,
    surgeDuration: 0.24,
    surgeHoldSpeed: 11.6,
    drag: 2.8,
    minCommitTime: 0.18,
    minEndSpeed: 3.4,
    cooldown: 0.45,
    steerRate: 4.5,
    hopSpeedRetention: 1.05,
    hopJumpVelocity: 11.4,
    fovBonus: 6.5,
    sprintFovBonus: 4.0,
    cameraPitch: -0.045,
    cameraRoll: 0.065,
  },
  wallRun: {
    entryMinSpeed: 4.2,
    entryMaxAngleDeg: 68,
    mountReachM: 0.42,
    playerRadiusM: 0.42,
    maxDurationSec: 4.0,
    mountSpeedBoost: 1.14,
    minRunSpeed: 10.2,
    maxRunSpeed: 13.6,
    speedDecayPerSec: 0.45,
    wallGravity: 1.35,
    mountUpCarry: 2.2,
    leapOutwardSpeed: 10.6,
    leapUpVelocity: 9.1,
    leapForwardBoost: 3.0,
    leapLoadDuration: 0.075,
    slideGravity: 7.4,
    slideTerminalSpeed: 7.2,
    slideTangentDrag: 2.1,
    slideBounceUpBase: 10.6,
    slideBounceDownConversion: 0.38,
    slideBounceOutwardSpeed: 9.0,
    slideBounceForwardSpeed: 8.6,
    cameraRollRad: 0.22, // ~12.6 degrees crisp wall tilt
    slideCameraRollRad: 0.13, // ~7.5 degrees hang-off tilt
    fovBonusDeg: 6.0,
    sameWallCooldownSec: 0.4,
    runUpMaxHeightM: 4.5,
    runUpInitVel: 6.8,
    runUpDurationSec: 0.92,
    runUpKickBackSpeed: 6.4,
  },
  camera: {
    hipFov: 74,
    adsFov: 56,
    swordGuardFov: 68,
    flashlightFocusFov: 64,
    mouseSensitivityHip: 0.0021,
    mouseSensitivityAds: 0.0013,
    gamepadLookSpeedHip: 2.85,
    gamepadLookSpeedAds: 1.65,
    pitchMin: -1.42,
    pitchMax: 1.42,
  },
  keybinds: {
    forward: ['KeyW', 'ArrowUp'],
    backward: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    sprint: ['ShiftLeft', 'ShiftRight'],
    jump: ['Space'],
    crouch: ['KeyC', 'ControlLeft', 'ControlRight'],
    reload: ['KeyR'],
    interact: ['KeyE'],
    flashlight: ['KeyF'],
    quickMelee: ['KeyV'],
    adsToggle: [],
    switchWeapon: ['KeyQ'],
    slots: {
      pistol9mm: 'Digit1',
      futuristic: 'Digit2',
      rustSmg: 'Digit3',
      retroSmg: 'Digit4',
      rustShotgun: 'Digit5',
      sword: 'Digit6',
      flashlight: 'Digit7',
      unarmed: 'Digit8',
    },
  },
  gamepad: {
    lookXAxis: 2,
    lookYAxis: 3,
    moveXAxis: 0,
    moveYAxis: 1,
    leftDeadzone: 0.16,
    rightDeadzone: 0.14,
    sprintButton: 10, // LS down
    jumpButton: 0, // A
    crouchSlideButton: 1, // B
    reloadInteractButton: 2, // X
    switchWeaponButton: 3, // Y
    quickMeleeButton: 4, // LB
    adsTrigger: 6, // LT
    fireTrigger: 7, // RT
    flashlightButtons: [12, 13], // D-pad Up/Down
    triggerThreshold: 0.35,
  },
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function mergePlayerConfig(
  overrides?: DeepPartial<PlayerKitConfig>,
): PlayerKitConfig {
  if (!overrides) return structuredClone(DEFAULT_PLAYER_CONFIG);
  return {
    movement: { ...DEFAULT_PLAYER_CONFIG.movement, ...(overrides.movement ?? {}) },
    slide: { ...DEFAULT_PLAYER_CONFIG.slide, ...(overrides.slide ?? {}) },
    wallRun: { ...DEFAULT_PLAYER_CONFIG.wallRun, ...(overrides.wallRun ?? {}) },
    camera: { ...DEFAULT_PLAYER_CONFIG.camera, ...(overrides.camera ?? {}) },
    keybinds: {
      ...DEFAULT_PLAYER_CONFIG.keybinds,
      ...(overrides.keybinds ?? {}),
      slots: {
        ...DEFAULT_PLAYER_CONFIG.keybinds.slots,
        ...(overrides.keybinds?.slots ?? {}),
      },
    } as PlayerKitConfig['keybinds'],
    gamepad: {
      ...DEFAULT_PLAYER_CONFIG.gamepad,
      ...(overrides.gamepad ?? {}),
      flashlightButtons: (overrides.gamepad?.flashlightButtons?.filter(
        (b): b is number => typeof b === 'number',
      ) ?? DEFAULT_PLAYER_CONFIG.gamepad.flashlightButtons),
    },
  };
}
