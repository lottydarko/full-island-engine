export type PlayerInputSource = 'kbm' | 'gamepad' | 'system';

export const PLAYER_KIT_SOUND_EVENTS = [
  'footstep',
  'jump',
  'land',
  'slide',
  'fire',
  'dry_fire',
  'reload_start',
  'reload_end',
  'pump',
  'swing',
  'blade_hit',
  'weapon_switch',
  'weapon_raise',
  'weapon_lower',
  'flashlight_on',
  'flashlight_off',
  'ads_in',
  'ads_out',
  'wall_mount',
  'wall_step',
  'wall_slide_start',
  'wall_slide_stop',
  'wall_leap',
  'slide_bounce_jump',
  'wall_dismount',
  'ledge_grab',
  'ledge_climb',
  'ledge_drop',
  'arm_climb_rung',
  'wall_run_up',
] as const;

export type PlayerSoundEventName = (typeof PLAYER_KIT_SOUND_EVENTS)[number];

export interface PlayerSoundEventPayload {
  event: PlayerSoundEventName;
  weaponId: string;
  source: PlayerInputSource;
  intensity: number;
  comboStep?: number;
}

export type PlayerSoundEventListener = (payload: PlayerSoundEventPayload) => void;
