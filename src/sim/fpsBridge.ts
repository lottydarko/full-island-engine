/**
 * fpsBridge.ts — CONTRACT ONLY (no implementation).
 * Packaged by Muse, 2026-11-26, for lottydarko/open-world-engine.
 *
 * Purpose: a clean seam between this world simulation and the director's
 * EXISTING first-person weapon/view engine (from his other build).
 * The bridge never builds weapons, hands, or a camera rig of its own.
 * It only announces mode changes and exposes the frames/targets the
 * external engine needs.
 *
 * Audited seams it attaches to (verified in-repo):
 *  - DrivingEngine: existing walk/train modes (TelemetrySnapshot.walkMode /
 *    trainMode, nearCar, nearOpenTrainDoor) and the existing vehicle-exit
 *    control path. CONTROLS LAW: this bridge never adds or remaps a binding.
 *  - metroSystem: MetroSystemHandles.updateRiderControls(...) and
 *    OperatedTrainState { worldPos, eyePos, forwardDir, seated, carIndex }.
 *  - mapData: CollisionWorld for raycast targets.
 * The driving camera (presets 'chase' | 'close' | 'hood') is never touched.
 */
import * as THREE from 'three';

/** First-person eye height above the floor/ground surface, meters. */
export const FPS_EYE_HEIGHT_M = 1.68;

/** A snapshot of the train carriage frame the FPS camera must inherit. */
export interface TrainFrame {
  /** Carriage eye anchor in world space (from OperatedTrainState.eyePos). */
  eyePos: THREE.Vector3;
  /** Carriage forward direction in world space (OperatedTrainState.forwardDir). */
  forwardDir: THREE.Vector3;
  /** Carriage linear velocity, world space, m/s — the FPS view inherits it. */
  velocity: THREE.Vector3;
  /** Carriage yaw rate, rad/s — applied to the FPS view so the car feels solid. */
  yawDeltaPerSec: number;
  /** Which car the player is in (OperatedTrainState.carIndex, 1..3). */
  carIndex: number;
  /** True while the player is seated (view locked to the seat frame). */
  seated: boolean;
}

/** Something the external weapon engine may raycast against. */
export interface FpsRayTarget {
  /** Stable id of the collider/NPC. */
  id: string;
  /** World-space bounds to test rays against. */
  bounds: THREE.Box3;
  /** 'npc' targets map to a pedestrian/passenger; 'world' is static collision. */
  kind: 'npc' | 'world';
  /** Present when kind === 'npc': the pedestrian system's agent id. */
  agentId?: string;
}

/**
 * Hooks the world calls INTO the external FPS engine.
 * The external engine implements this interface; the world owns the calls.
 */
export interface FpsBridgeHooks {
  /**
   * Player is now on foot (exited a vehicle via the existing control, or
   * stepped off the train onto a platform). Activate the first-person
   * camera at eyeHeight (FPS_EYE_HEIGHT_M) over spawnPos, facing yaw,
   * and show the viewmodel.
   */
  onEnterOnFoot: (spawnPos: THREE.Vector3, yaw: number) => void;

  /**
   * Player is now riding the metro. The FPS camera adopts the carriage
   * frame; from here, updateTrainFrame is called every simulation tick.
   */
  onEnterTrain: (frame: TrainFrame) => void;

  /** Per-tick carriage frame while riding (see onEnterTrain). */
  updateTrainFrame: (frame: TrainFrame) => void;

  /**
   * Player entered a vehicle. Deactivate the first-person viewmodel/camera
   * completely and hand the camera back to the driving rig, untouched.
   */
  onEnterVehicle: () => void;

  /**
   * Nearby raycast targets for the external engine's weapon raycasts.
   * Backed by CollisionWorld + the pedestrian/metro registries.
   * Implementations must return only targets within a sane radius of
   * origin (the caller passes the player's position).
   */
  getRayTargets: (origin: THREE.Vector3, radiusM: number) => FpsRayTarget[];
}

/**
 * Registration point: DrivingEngine holds the active hooks (or null when
 * no external FPS engine is attached — the world must run identically).
 */
export interface FpsBridge {
  hooks: FpsBridgeHooks | null;
  /** Current mode as the bridge sees it; mirrors the engine's own flags. */
  mode: 'driving' | 'onFoot' | 'train';
}
