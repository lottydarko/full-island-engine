# CROWD + WORLD STREAMING — a lot of people everywhere, loaded only around the player (Nov 27, 2026)

Lotty's ask: "a lot of people everywhere I go" — the city always feels populated — "and only load them in a certain radius of the player, maybe only load a certain amount of world if possible."

## The core trick
The city is never fully alive at once. The player carries a **bubble**; inside the bubble the city is real, outside it the city is data. The population the player *perceives* is unlimited; the population the machine *simulates* is capped and recycled. Nobody can tell, because a person only exists when you can see them.

## The three rings (around the player, distances tunable)
- **RING 1 — FULL (0–90 m):** real agents. Full bodies from the MakeHuman pool, full animation, behavior, dialogue, collision. This is where vignettes, tails, grabs, and conversations can fire.
- **RING 2 — CHEAP (90–220 m):** visible crowd, cheap bodies. Same pool bodies, but low-rate animation (pose updates at 1/3 rate, no fingers/face), no behavior beyond walking a route, no collision except with the ground plane. They read as people from across the street because they ARE people — just thinking slower.
- **RING 3 — GHOST (220–450 m):** silhouettes only. Billboard impostors / the cheapest LOD of the pool bodies, no animation beyond a bob and a heading. Exists so streets never look empty at distance and so Ring 2 never visibly pops in — ghosts fade up into Ring 2 walkers as you approach.

Beyond 450 m: nothing spawned. That district's population exists only as its **density table + saved identities** (see below).

## The pool and the cap
- The 314-agent cap stays — it is the Chromebook budget. Rings share it: ~140 full, ~120 cheap, ~54 ghost slots as the starting split; the split slides with context (a shootout pulls slots into Ring 1; a highway drive stretches Ring 2/3 forward).
- Slots are a **recycling pool**: when an ambient walker leaves Ring 3 behind the player, its slot is freed and reused to spawn a new walker ahead of the player, entering from a doorway, a corner, a metro stair — never visibly materializing in open view. Spawns happen out of line-of-sight or beyond 200 m, always.
- **Density is per-district data** (spawn weights already exist in the wardrobe bible): D1 nightlife packed, D2 central busy, D3 garrison sparse and military, D8 port shift-change surges. The bubble samples the district it is in — "a lot of people everywhere" means everywhere has its own right amount.

## Identity law vs recycling (how both stay true)
- **Ambient crowd recycles freely.** A stranger you passed once owes you nothing; if their slot is reused, a different stranger stands there later. Nobody can prove otherwise — that is the point of a crowd.
- **Persistent people are data, not slots.** Sleuths on your tail, named characters, a robber who fled you, the crew that grabbed you: their identity (bodyId, faceId, outfitId, voiceSeed, state, position, grudge) is saved in a persistent registry when they leave the bubble and restored when you re-enter their radius. A sleuth does NOT despawn at 450 m — he goes dormant as data and is waiting, which is exactly his design: the same faces recur, spread out.
- Rule: recycling may only consume slots whose identity is marked ambient. The registry is small (dozens), the crowd is the pool (hundreds of slots, thousands of faces over a session).

## World streaming (the "certain amount of world" half)
- The island is already districted (D1–D10, five islands + mainland). Build the static world as **per-district groups**: geometry, signage, and colliders grouped by district.
- **Load radius for the world is larger than for people** (you see buildings farther than faces): current district + adjacent districts fully loaded; the next ring of districts loaded as shells (buildings without interiors/colliders); beyond that, skyline silhouettes only (the cityBuilder already knows every building's footprint and height — shells are cheap boxes with the facade textures).
- Streaming is by **player sector crossing**, not per frame: when the player crosses a sector boundary, the ring re-evaluates — load ahead (in the direction of travel first), unload behind. Bridges and the metro are natural load gates: the Gate 12 crossing and a metro ride are where the big swaps hide.
- Interiors (stations, the program facility, shops) are separate scenes already — they load on entry as designed (kidnap loading uses the same door).

## What this buys and what it costs
- Buys: a city that reads as thousands of people on Chromebook hardware; frame cost governed by the bubble, not by the map; density becomes a design dial per district instead of a performance accident.
- Costs: spawn/despawn logic must respect line-of-sight (no pop-in in view — spawns at doors/corners/behind), the persistent registry must be correct (a lost sleuth is a broken promise), and Ring 2/3 animation must be cheap enough to be honest.
- Failure mode to guard: the bubble edge visible as a "dead line" where the city empties — the ghost ring + spawn-at-cover rules exist precisely to hide it. If it still shows, widen Ring 3 before raising the cap.

## Numbers of record (starting values, tune in play)
Full ring 90 m · cheap ring 220 m · ghost ring 450 m · world full-load = current + adjacent districts · slot split 140/120/54 of 314 · spawn LOS rule: never in open view inside 200 m.
