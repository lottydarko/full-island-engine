# POLISH MANIFEST — `lottydarko/open-world-engine`
### Instruction packet for Google AI Studio. Packaged by Muse, 2026-11-26, from the director's kit.
### Every file name, class, and hook below was AUDITED against the actual repository before packaging — build to these seams, not to assumptions.

**Repo:** `lottydarko/open-world-engine` (React + TypeScript + Vite, sim code in `src/sim/`)
**Job:** Five updates — (1) zero-clipping civilians + polite/rude train social behavior, (2) smoker cigarette-to-lips fix, (3) an FPS bridge contract so the director's existing first-person weapon engine plugs into the on-foot and train modes, (4) the 3D floating CRT menu wrapper, (5) map & boarding-flow polish. Items 1 and 2 are the director's two previously CANCELED requests — they land this time.

---

## DIRECTOR'S CORRECTIONS — 2026-11-26 (these OVERRIDE anything below that conflicts)

1. **CONTROLS LAW: do not change the controls.** Every feature in this packet wires into the game's existing control scheme exactly as the current build defines it. No remapped keys, no new keys, no changed bindings — including the menu (it opens through the game's existing pause control) and the car call (it uses the existing interact control, contextually, while on foot).
2. **NO INVENTED TITLES.** The CRT menu carries no made-up names, city names, or decorative titles — plain functional labels only. (An earlier draft's invented city name is struck everywhere it appeared.)
3. **NO TELEPORTATION — to the train, to the car, anywhere.** The "board the train" menu spawn is DELETED. Boarding happens on foot, at a station, through the existing door flow. Getting your car works the new way: Spec 6.
4. **CALL YOUR CAR (Spec 6)** replaces every get-to-the-car shortcut.

---

## 0. AUDITED FILE MAP (verified in-repo)

| File | Verified contents the specs rely on |
|---|---|
| `src/App.tsx` | Mounts the `DrivingEngine` class; consumes `TelemetrySnapshot`. The director's island blueprint is already the in-app map image (`BLUEPRINT_IMAGE_URL`). |
| `src/sim/DrivingEngine.ts` | Class `DrivingEngine`. `TelemetrySnapshot` already carries `walkMode`, `trainMode`, `nearCar`, `nearOpenTrainDoor`, `trainSeated`, `trainCarIndex`, `pedestrianCount` — **on-foot and train-riding modes already exist**. Camera presets: `'chase' \| 'close' \| 'hood'`. Post chain: EffectComposer + bloom. |
| `src/sim/mapData.ts` | Exports `ROADS`/`RoadSegment`, `BUS_STOPS`, `SIGNALIZED_INTERSECTIONS`, `METRO_STATIONS`, `METRO_LOOP_POINTS_3D`, `METRO_TRACK_HEIGHT`, `LANDMARKS`, `BUILDINGS`, `CollisionWorld`, `getTerrainHeight`, `getRoadElevationAt`, `getDistrictAt`, `getRoadNameAt`, `isNearAnyRoad`, `mulberry32`, `ROUNDABOUT_RADIUS`, and **`m2w`/`w2m`** — blueprint coords are **[−1000..1000]** on both axes, converted to world units there. |
| `src/sim/cityBuilder.ts` | `buildCityWorld` → `CityHandles { root, update(dt, elapsed, carPos, nightFactor), setPowerGridEnabled, … }`. Island builders already exist (woodlands, island-2 prison grid, island-3, island-4 harbor). |
| `src/sim/pedestrianSystem.ts` | `buildPedestrianSystem` → `PedestrianSystemHandles { root, totalCount, update(dt, elapsed, busStopArrivals?, metroTrainFlags?), reseed }`. Civilian classes (`executive`, `commuter`, `working_class`, `streetwear_youth`, `elder`, `nightlife_patron`, `student_runner`, `transit_guard`) and roles (`sidewalk`, `crosswalk`, `bus_wait`, `metro_plat`, `metro_street`) already exist. |
| `src/sim/humanCharacter.ts` | `createRiggedHuman` / `applyHumanPose`. `HumanRig` has the full bone set (pelvis→spine→chest→neck→**head Group**, shoulders/elbows/hand groups, hips/knees/ankles, coat/scarf/hair bones) **plus articulated eyelids, eyeballs, and brows**. `CommuterActivityType` already includes `'cigarette'`. `HumanPoseParams.mode` includes `'seated'`, `'standing_strap'`, `'standing_idle'`, `'walking'`. |
| `src/sim/metroSystem.ts` | `buildMetroSystem` → `MetroSystemHandles { root, update(dt, elapsed, nightFactor), updateRiderControls(dt, walkFwd, walkStrafe, lookYawOffset, toggleSit) → RiderControlResult }`. `OperatedTrainState` exposes `worldPos`, **`eyePos`**, `forwardDir`, `seated`, `carIndex` (1..3), `passengerCount`, `doorsOpen`. `RiderControlResult` already returns `exitedToPlatform`, `exitWorldPos`, `exitYaw`, `stationName`. |

**Audit correction to the original kit:** the on-foot/train first-person plumbing is NOT missing — it exists (`walkMode`/`trainMode`, `updateRiderControls`, `OperatedTrainState.eyePos`). Spec 3 therefore attaches the external weapon/viewmodel layer at those existing seams. Do not build a parallel mode system.

---

## SPEC 1 — Zero-clipping civilians, polite train passing, occasional rude bumps
**Files:** `src/sim/pedestrianSystem.ts`, `src/sim/metroSystem.ts`, `src/sim/humanCharacter.ts` (pose layer only)

- **Hard separation:** every civilian/passenger gets a capsule separation radius **r = 0.34 m** with velocity-projected avoidance, enforced in both systems — sidewalk, crosswalk, platform, and inside the cars. Nobody walks through anybody. Add wall/seat/pillar bounds from `CollisionWorld` and the station geometry so bodies never clip seats or pillars either.
- **Polite passing (train):** when two passengers close within **1.1 m** in a car aisle or doorway, both smoothly rotate torso/shoulders **±0.65 rad** (polite sidestep) and play a subtle **head-nod** as they squeeze past. Same courtesy at platform door queues.
- **Rude minority:** tag **~15%** of spawned civilians `personality: 'rude'`. A rude commuter occasionally (per-agent cooldown **~25 s**) walks straight through a tight pass without sidestepping: shoulder-bump impulse **0.18 m** lateral on the bumped civilian, who enters an **`upset`** state for **2.5 s** — annoyed head-turn glare (the rig's eyeballs/brows exist — use them), a frustrated arm gesture, and a brief mutter (subtitle caption is enough; audio optional).
- Keep it cheap: separation checks against near neighbors only, no all-pairs scans; Chromebook frame rate is law.

## SPEC 2 — Smoker: cigarette all the way to the lips
**File:** `src/sim/humanCharacter.ts` (the `'cigarette'` activity in the pose solver)

- Solve the smoking arm (shoulder pitch, elbow bend, wrist rotation) to an **exact mouth target**: compute `mouthTargetLocal` from the rig's head Group (lip height, **0.02 m** offset from the lip surface). The cigarette tip reaches the lips — not the chest, not the chin.
- **Hold 0.85 s** at the lips: ember emissive brightens (inhale), then a small rising **smoke puff** on exhale as the arm lowers smoothly back to rest.
- Proof standard: a still frame at the top of the motion must show tip-at-lips contact. If it hovers, it's wrong.

## SPEC 3 — FPS bridge contract (`src/sim/fpsBridge.ts`, NEW — contract ships with this packet)
**Files:** create `src/sim/fpsBridge.ts`; wire in `src/sim/DrivingEngine.ts` and `src/sim/metroSystem.ts`

- **Do NOT build a new weapon rig or hand model.** The director's existing FPS weapon & first-person engine (from his other build) plugs in through this bridge. The bridge is an interface + mode wiring only.
- Contract (full TypeScript ships as `fpsBridge.ts` in this packet): `FpsBridgeHooks { onEnterOnFoot(spawnPos, yaw), onEnterTrain(trainFrame), onEnterVehicle(), updateTrainFrame(trainFrame), getRayTargets() }`.
- Behavior:
  - Player exits a vehicle (the existing walk-mode path, existing control) → `onEnterOnFoot`: external first-person camera at **eyeHeight 1.68 m** + weapon viewmodel take over.
  - Player rides the metro → `onEnterTrain` / per-frame `updateTrainFrame`: the FPS camera inherits the carriage frame from `OperatedTrainState` (`eyePos`, `forwardDir`, car velocity/yaw delta) — the world moves past the windows, the viewmodel stays steady in the car. **Boarding is physical** — the player walks to a station and boards through the existing door flow (`nearOpenTrainDoor`); the bridge fires when that happens. Nothing teleports the player onto the train.
  - Player steps off (`RiderControlResult.exitedToPlatform`) → stay on foot via `onEnterOnFoot(exitWorldPos, exitYaw)`.
  - Player enters/drives a car → `onEnterVehicle`: bridge deactivates completely; the driving camera (`chase/close/hood`) is **untouched**.
  - `getRayTargets()` exposes nearby colliders/NPCs for the external engine's raycasts (back it with `CollisionWorld` + the pedestrian/metro registries).

## SPEC 4 — 3D floating CRT menu wrapper
**Files:** `src/ui/CrtMenuOverlay.tsx` (NEW), wired in `src/App.tsx`

- A self-contained Three.js overlay: floating vintage fat CRT, dark-grey molded bezel, red power LED, bulged **1024×768** CanvasTexture screen, **inner-glass flowing crimson blood rivulets** + scanlines, oblique three-quarter **row-locking camera (±23° azimuth, flips sides on Left/Right)**, single-pass circular **barrel distortion + RGB glitch shader**.
- Modes: **START** on boot, **PAUSED** via the game's existing pause control (Controls Law — no new binding). While open, `DrivingEngine` updates pause; on launch/resume the overlay hides and **disposes its GPU resources** (Chromebook FPS stays smooth).
- Options — **plain labels only, no invented titles or names**: **ENTER WORLD** (launch/resume), **CRT WARP: ON/OFF**, **AUDIO: ON/OFF** — procedural audio only: 60 Hz transformer hum, static crackle, relay clicks, wet metallic stab on confirm. Keep the synth self-contained in the overlay module. (There is deliberately NO "board train" option — teleportation is banned; see the Corrections.)

## SPEC 5 — Map & boarding-flow polish
**Files:** `src/sim/mapData.ts`, `src/sim/cityBuilder.ts`

- Station platforms: marked **queue lanes** at each `METRO_STATIONS` door position so commuters line up instead of bottlenecking; boarding/exiting zones kept clear of props and pillars.
- Crosswalks: clearance bounds so pedestrian paths (Spec 1 separation) have room to work; keep street/district sightlines clean.
- Data-and-placement changes only — no geometry rebuilds, no changes to `ROADS` topology or the roundabout structure.

## SPEC 6 — Call your car (NEW — replaces all teleport-to-car ideas)
**Files:** `src/sim/DrivingEngine.ts` (mode/call logic), backed by `mapData.ts` (`ROADS`, `isNearAnyRoad`) and the existing traffic/driving systems

- While **on foot**, the player calls their car with the existing interact control (Controls Law — contextual use, no new binding).
- **Proper position required:** the call only works where a car can actually reach — outdoors, on or near a road/curb on the `ROADS` network. Indoors, on the train, in deep forest or water: the call refuses with a short on-screen reason (plain functional text).
- **The car comes to you:** it spawns at the **nearest road point** to the player (nearest `ROADS` segment), then **drives itself along the road network** and pulls up in front of the player, stopping at the nearest reachable curb. Reuse the existing traffic/driving AI for the approach — `physics.ts` stays untouched (DO NOT MODIFY).
- **Pointer:** while the car approaches, an on-screen direction pointer/marker guides the player's eye to the car until it arrives.
- **Blocked path:** if no route reaches the player's curb, the car stops at the nearest reachable road point and the pointer keeps guiding the player to it. The player is never teleported; the car does the traveling.

---

## ⛔ DO NOT MODIFY
- `src/sim/physics.ts` — vehicle physics
- `src/sim/carModel.ts` — vehicle models
- `src/sim/textures.ts` — procedural texture library
- `src/sim/tireTrails.ts` — tire trails
- The **driving camera rig** in `DrivingEngine.ts` (presets + tuning) — the bridge attaches around it, never inside it.

## ACCEPTANCE — report back with:
- [ ] Aisle-pass still or clip: two passengers sidestepping with the nod; a rude bump + upset reaction.
- [ ] Smoker still at the top of the motion: cigarette tip at the lips.
- [ ] Bridge demo: exit car → on-foot FPS active; board the train on foot at a station → FPS steady in a moving car; enter car → driving camera exactly as before.
- [ ] CRT menu: START on boot, pause via the existing pause control, plain labels only (no invented titles), launch disposes cleanly, FPS unchanged in-world.
- [ ] Car call: from a valid roadside position the car spawns at the nearest road, drives the network, and pulls up in front of the player with the pointer guiding; from an invalid position (indoors / on the train) it refuses with a reason. No teleportation anywhere in the build.
- [ ] Controls audit: every binding in the build is identical to before this packet — nothing remapped, nothing added.
- [ ] Frame rate on modest hardware before/after — no regression.
- A short report: what landed per spec, anything stubbed, and the exact files touched (the DO NOT MODIFY list must be untouched).

---

## COPY-PASTE EXECUTION BLOCK — for Google AI Studio (inside `lottydarko/open-world-engine`)

> Work strictly on the `lottydarko/open-world-engine` repository (React + TypeScript + Vite, `src/sim/`). A `polish-manifest.md` accompanies this prompt — it contains the audited file map and the full specs; follow it exactly. **Director's laws, overriding everything: (a) DO NOT change the controls — every feature wires into the existing control scheme, no remapped or new bindings; (b) NO invented titles or names anywhere, plain functional labels only; (c) NO teleportation of the player, ever.** Summary of the updates:
>
> 1. **Civilians & train social spacing** (`pedestrianSystem.ts`, `metroSystem.ts`, `humanCharacter.ts`): hard capsule separation r = 0.34 m + wall/seat bounds so nobody clips; passengers closing within 1.1 m in a train aisle/doorway do a polite ±0.65 rad torso sidestep + head-nod; ~15% of civilians are `personality: 'rude'` — on a ~25 s per-agent cooldown a rude one bumps through (0.18 m impulse) and the bumped civilian shows an `upset` reaction (glare, frustrated gesture, brief mutter caption) for 2.5 s.
> 2. **Smoker fix** (`humanCharacter.ts`): solve the smoking arm to an exact mouth target from the head rig (lip height, 0.02 m offset) so the cigarette tip touches the lips; hold 0.85 s with ember flare + exhale smoke puff, then lower. A still at the top of the motion must show contact.
> 3. **FPS bridge** (new `src/sim/fpsBridge.ts`, contract included in the manifest packet): wire the `FpsBridgeHooks` interface into `DrivingEngine.ts` and `metroSystem.ts` at the EXISTING walk/train mode seams (`walkMode`/`trainMode`, `updateRiderControls`, `OperatedTrainState.eyePos`) so an external first-person weapon engine takes over on foot (eyeHeight 1.68 m) and inside the moving train (inheriting the carriage frame), and fully deactivates in a car. Do NOT build a new weapon rig; do NOT touch the driving camera.
> 4. **3D CRT menu** (new `src/ui/CrtMenuOverlay.tsx`, wired in `src/App.tsx`): floating fat CRT, 1024×768 canvas screen, blood rivulets inside the glass, scanlines, barrel + RGB glitch shader, row-locking camera ±23°; START on boot, PAUSED via the existing pause control; options are PLAIN LABELS ONLY — ENTER WORLD / CRT WARP / AUDIO (procedural hum, crackle, clicks, stab) — no invented titles, and NO board-train option: teleportation is banned, boarding is on foot at stations. Pause the engine while open; dispose GPU resources on launch.
> 5. **Map & boarding flow** (`mapData.ts`, `cityBuilder.ts`): platform queue lanes at metro doors, clear boarding zones, crosswalk clearance. Placement/data only.
> 6. **Call your car** (`DrivingEngine.ts` + `mapData.ts` ROADS + existing traffic/driving AI): on foot, the player calls the car with the existing interact control. Only from a proper position (outdoors, near a reachable road — indoors/on the train it refuses with a plain reason). The car spawns at the nearest road point, drives the road network itself, and pulls up in front of the player; an on-screen pointer guides the player to it; if the route is blocked it stops at the nearest reachable point. The player is never teleported — the car does the traveling.
>
> DO NOT MODIFY: `physics.ts`, `carModel.ts`, `textures.ts`, `tireTrails.ts`, and the driving camera rig in `DrivingEngine.ts`. Preserve all existing driving physics, vehicle models, procedural textures, and character meshes. Report back per the manifest's acceptance list, with stills for the aisle pass, the rude bump, and the smoker's lip contact.
