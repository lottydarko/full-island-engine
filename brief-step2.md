# AGY BRIEF — WEAPONS ON THE NEW BODIES (Nov 28, 2026)

## Base
Repo github.com/lottydarko/full-island-engine, branch `muse/combined-2026-11-27` (@ e5e8af4 — the combined package with the character finish merged; tsc clean, build green). Branch off it as `agy/weapons-on-bodies`. Do NOT merge to main — push the branch.

## The job
The new MakeHuman bodies are in and spawning (humanCharacter.ts + pedestrianSystem.ts, merged from agy/character-model-finish). Now arm them.

The NPC weapon-state work exists on branch `origin/muse/weapons-lab-trace` — armed states, hold poses, class-to-weapon assignment — but it was written against the OLD procedural bodies and **conflicts with the new humanCharacter/pedestrianSystem. Do NOT merge that branch.** Read it as the spec of what the states do, and PORT the behavior onto the new GLB body system: same states, same class table, implemented against the new rig and its pose interface.

## Design of record for the guns themselves
The FPS kit is the design of record — shapes and light counts come from the kit, never the blocky presets. `src/sim/kitWeapons.ts` is already in this tree (futuristic gun, pistol, Russian weapons set, sword, flashlight, player kit). The player arsenal is the kit guns. Enemy weapons are VARIATIONS of the player's: black finish, red animated charging glow (loading-light pulse) — red is enemy-only; the player's guns keep their own glow colors. **No tracer lines for anyone** — muzzle flash, light spill, sound, impact only.

## Requirements
- Class table (already in sharedWeapon/fpsWeaponView — do not change ballistics or specs): guards → service carbine; mob enforcers → full-auto; heavy/brute → pump shotgun; sleuths/undercover → holstered pistol.
- The full weapon-state chain on the new bodies: holstered → draw → carry → aim → fire → low-ready → reload → holster. Undercover spawns HOLSTERED; the draw is the tell.
- Per-archetype handling per ARCHETYPE-ANIMATION-STYLES (weapons-lab repo / design docs): police drilled and two-handed; mob one-handed at a walk, unhurried; gang fast and sloppy; undercover — civilian stillness, one snap to perfect stance.
- Weapon meshes attach to the new bodies' hands with a real grip — fingers wrap the actual grip; no floating guns, no clipping through palms. This is judged in stills.
- Zombies, crimeDirector, worldEventBus: untouched.

## Acceptance
- tsc clean, build passes.
- The 4-archetype firing drill on the NEW bodies: all four styles side by side, nameable from silhouette alone.
- Frame cost at the 314 cap with armed agents in scene, reported against the 14.7 ms CPU-update figure from the character finish.
- Proof stills: one per archetype armed, plus one holstered undercover.
- Push `agy/weapons-on-bodies`. No merge.
