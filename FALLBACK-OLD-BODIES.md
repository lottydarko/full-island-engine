# FALLBACK — OLD CHARACTERS + FULL WEAPON STATES

This branch is the prepared fallback if the MakeHuman GLB bodies
(muse/combined-2026-11-27 + muse/weapons-on-bodies) don't pass Lotty's
Chromebook test.

## What this is
- Island main @ 9d2b152 (the OLD procedural characters — nothing about
  them was deleted or altered) plus the complete NPC weapon system that
  was built for those bodies on muse/weapons-lab-trace:
  - state chain patrol / draw / aim / fire / low_ready / reload
  - class table: enforcer → full-auto, heavy/brute → pump shotgun,
    guard/gang → service carbine
  - black enemy weapon variations with red charging LED, muzzle flash +
    pooled light spill, pump stroke, reload choreography (mag offsets)
  - per-agent arsenal specs, ammo, reload timers, inline arm IK in
    pedestrianSystem, LED driven by the state machine's ledTarget
- sharedWeapon.ts and fpsWeaponView.ts are byte-identical to main's
  arsenal merge — no stale specs.
- Verified 2026-11-28: tsc --noEmit clean, vite build passes.

## What this branch does NOT have
- The MakeHuman 50-body pool and the GLB dressing system (that's the
  whole point of the fallback).
- The combined package's other assemblies (behavior Phase 1 bench,
  FPS kit hands, wall-run lab wiring, crowd-streaming design) — those
  were assembled on the new-bodies combined branch. If Lotty picks the
  old bodies, the remaining combined steps (wall-run, Xbox controls,
  car entry, behavior systems, stations, crowd streaming) get built on
  THIS line instead.
- The sleuth pistol machinery (it lives in enemyWeapons.ts on
  muse/weapons-on-bodies; the sleuth class arrives with the behavior
  step either way).

## How the switch works
Nothing is merged to main on either path. Lotty tests
muse/weapons-on-bodies (new bodies) against this branch (old bodies),
picks one, and the loser stays on its branch, untouched. The switch is
a checkout/merge decision, not surgery — as long as the pick happens
before the remaining combined steps are built on one body system.
