# COMPLETE GRAND ARCHIPELAGO MASTER BLUEPRINT & GOOGLE AI STUDIO KIT — `open-world-engine-main`

**Target Project:** `open-world-engine-main` (`React + TypeScript + Vite` in Google AI Studio)  
**Critical Preservation Rule:** **DO NOT overwrite, delete, or regenerate `src/sim/pedestrianSystem.ts`, `src/sim/humanCharacter.ts`, `src/sim/textures.ts`, `src/sim/carModel.ts`, `src/sim/environment.ts`, or `public/assets/aistudio/*`.** Keep the entire existing pedestrian rig/crowd sheet and all existing graphics intact and model every new island, station complex, subway tunnel, named avenue, soldier, prisoner, and bridge directly on top of them.

---

## 1. Preserved `open-world-engine-main` Assets & Systems (Do Not Replace)

| Existing File in `open-world-engine-main` | What Must Be Saved & Reused As-Is |
| :--- | :--- |
| **`src/sim/humanCharacter.ts` (`142 KB`) & `src/sim/pedestrianSystem.ts` (`36 KB`)** | **Save the entire existing pedestrian character sheet, outfit/limb proportions, and sidewalk crowd AI.** Instantiate new **Soldiers**, **Prisoners**, **Station Commuters**, and **Coffee Baristas** as outfit/behavior presets on this exact same `humanCharacter.ts` rig. |
| **`src/sim/textures.ts` (`82 KB`) & `public/assets/aistudio/*`** | **Save all existing procedural canvas textures and AI Studio reference textures.** Reuse the exact same `CanvasTexture` helpers and `public/assets/aistudio/` assets for all new station halls, subway tunnels, named road signs, 1960s Soviet ghettos, and harbor freighters. |
| **`src/sim/metroSystem.ts` (`78 KB`)** | **Save and extend your existing train/metro engine.** Add the underground tunnel portals, underwater strait tube to Island 2/3, complex station stops, and the **red scrolling LED interior train sign** announcing each arriving station. |
| **`src/sim/cityBuilder.ts` (`74 KB`) & `src/sim/mapData.ts` (`72 KB`)** | Keep the existing Novaya Kaluga urban city aligned as **Island 1 (West)** and append the named roads, district boundaries, undulating hills/valleys, subway portals, and enterable station complexes cleanly without breaking existing spawns. |
| **`src/sim/DrivingEngine.ts`, `physics.ts`, `trafficSystem.ts`, `infrastructureSystem.ts`, `carModel.ts`, `tireTrails.ts`, `audio.ts`** | Keep all driving physics, traffic AI, tire trails, and procedural audio untouched. Hook the Main Electrical Grid Field breaker into `infrastructureSystem.ts`. |

---

## 2. Complete 5-Region Archipelago & Subway Blueprint (Every Sector Preserved)

```
 -1000       -600        -200          0          +200        +600       +1000
 -1000 +-----------+-----------+-----------+-----------+-----------+-----------+
       | [ISLAND 1: NOVAYA KALUGA]   | [ISLAND 2: CENTRAL] | [ISLAND 3: STARGATE]|
  -600 |  D1: Kalinin Nightlife      |   D6: Everglade     |  D9: Soviet Garrison|
       |  [STN-1: SEVERNY VOKZAL]    |   High Marshes      |  [STN-7: ZONA-9     |
  -200 |  D2: Reliquary Core         |---------------------|   BUNKER TERMINAL]  |
       |  [STN-2: SOBORNAYA PLAZA]   |  D7: Forensics &    |  (Sub-Surface Ark)  |
     0 |  ===SUBWAY TUNNEL PORTAL====|  1960s Ghettos      |---------------------|
       |  [SECTOR 4: D5 WOODLANDS]   |  [STN-5: ZAVOD-4]   | [ISLAND 4: ELYSIA]  |
  +200 |===[GATE 12 BRIDGE + RAIL]===|  D8: POW Camp &     | Golden Gate-II Span |
       |  D3: Garrison & Safehouse   |  Electrical Grid    | D10: Elysia Resort  |
  +600 |  [STN-3: GARRISON SOUTH]    |  [STN-6: PRISON     | [STN-8: ELYSIA      |
       |  D4: Railyard & Docks       |   & SPIT DOCKS]     |  & HARBOR TERMINAL] |
 +1000 |  [STN-4: PORT KALUGA]       +---------------------+---------------------+
                                       [SOLITUDE LIGHTHOUSE ON SEA ROCK]
```

---

## 3. Named Main Roads, City Districts & Terrain Elevation (Hills, Valleys & Road Grades)

Every main road is named in `mapData.ts` with overhead Cyrillic/English gantry signs, street-corner markers, and **undulating road elevation (`y` splines)** climbing hills and dipping into valleys:

| District ID & Name | Region | Named Main Roads & Elevation / Grade Profile |
| :--- | :--- | :--- |
| **D1: Kalinin Commercial & Nightlife** | Island 1 (NW) | **Prospekt Kalinina** (Main N–S neon strip, climbs `+6m` terrace ridge) & **Ulitsa Severnaya** (W–E coastal boulevard, dips into `-3m` rain-slicked underpass valley). |
| **D2: Central Reliquary & Cathedral Core** | Island 1 (Center) | **Reliquary Ring Boulevard** (Roundabout crown at `+4m`) & **Sobornaya Avenue** (E–W spine leading into the **Subway Tunnel Portal**). |
| **D3: Bunker Garrison & Reinstach Prison** | Island 1 (SW) | **Garrison Perimeter Road** (`+8m` fortified ridge overlooking Safehouse `38.46778, 90.433`) & **Reinstach Causeway** (descends `-2m` to the SW Mainland Access Bridge). |
| **D4: Industrial Railyard & Shipping Docks** | Island 1 (SE) | **Portovoye Shosse** (Coastal freight corridor, `0m` to `+3m` over rail switches) & ** Zavodskaya Alley**. |
| **D5: Sector 4 Mountains, Woodlands & Tall Grass** | Sector 4 (NW/East of City) | **Pereval Mountain Pass** (Winding switchback climbing `+28m` snow-covered hills & defensive ridges, then dropping into a `-4m` dark pine & tall-grass valley toward Gate 12). |
| **D6: Evergladian High Marshes** | Island 2 (North) | **Bolotny Plankway** (Raised timber/concrete marsh road undulating `+1.5m` to `+5m` above misty reeds and water channels). |
| **D7: Forensics Bureau & 1960s Soviet Ghettos** | Island 2 (Center/East) | **Institutskaya Street** (Forensics Bureau) & **Khrushchevka Ring Road** (Cracked, sunken `-2.5m` valley asphalt flanked by `+7m` terraced 1960s apartment hills). |
| **D8: POW Labor Camp, Grid Field & The Spit** | Island 2 (South/Far East) | **Energetikov Highway** (Passes POW Sector 5 turbines & Main Electrical Grid Field) & **Spit Contraband Quay** (Narrow peninsula road out to the Black Market docks). |
| **D9: Stargate Peninsula Occupation Zone** | Island 3 (NE) | **Secrecy Beltway (Ring-9)** (High-voltage perimeter road climbing `+14m` volcanic basalt ridges around the sunken `-8m` crater housing the sealed **Ark of the Covenant Vault**). |
| **D10: Elysia Luxury Resort & Commercial Harbor** | Island 4 (SE Strait) | **Golden Gate-II Causeway** (Arched suspension span rising `+22m` over shipping lanes) & **Elysia Terraced Promenade** (Spiraling `+18m` hillside boulevard). |

---

## 4. Underground-to-Elevated Subway System & Complex Multi-Zone Stations (`metroSystem.ts`)

### Track Routing (Surface → Underground Tunnel → Strait Crossing → Island Stations)
1. **Elevated / Surface Urban Loop (Island 1):** Runs along **Sobornaya Avenue** and **Portovoye Shosse** (`y = +6.5m` viaduct).
2. **Subterranean Tunnel Section (Island 1 Center → Gate 12 Under-Strait Tube):** Dives via concrete portal ramps down to **`y = -9.5m` underground** beneath **D2 Reliquary Core** and **D5 Sector 4 Mountains**, with lit concrete tunnel ribs, emergency red strobe beacons, and underground station platforms before surfacing onto the **Gate 12 Rail Deck** to reach **Island 2, Island 3, and Island 4**.

### Red Scrolling LED Interior Train Sign (`metroSystem.ts` CanvasTexture)
Inside every subway car (above the sliding doors and bulkhead), render a **bright crimson dot-matrix scrolling LED banner (`#ff1e2d` on `#120406`)** that dynamically reads the train's live state from `metroSystem.ts`:
* **Approaching Station (`< 85m` from platform):**
  `>>> СЛЕДУЮЩАЯ СТАНЦИЯ / NEXT STOP: [STATION CODE] — [STATION NAME] ([DISTRICT]) — ОСТОРОЖНО, ДВЕРИ ЗАКРЫВАЮТСЯ >>>`
* **Docked at Island Arrival Platform (`speed === 0`):**
  `*** ПРИБЫТИЕ / ARRIVING AT: [STATION NAME] — ВЫХОД НА ПЛАТФОРМУ (COFFEE & WAITING HALL) ***`

### 8 Complex Multi-Zone Train Stations (Dedicated Footprint + Coffee Area + Waiting Hall)
Each stop reserves a **`36m × 24m` architectural station footprint** in `mapData.ts` (with 4-wall + doorway cutouts so players can walk straight off the train platform into the station building):
* **Architectural Layout of Every Station Complex:**
  1. **Train Platform & Ticket Turnstiles:** Dual boarding platforms with yellow safety strips, arrival departure boards, and `[E]` ticket gates.
  2. **Warm Lit Coffee Area (`КАФЕ / EXPRESSO KIOSK`):** Glass-fronted station café corner with espresso counter, warm amber pendant lights, menu board, standing tables, and `[E]` **Hot Coffee Pickup** (restores player stamina/warmth in the snow).
  3. **Passenger Waiting Area:** Rows of Soviet wooden/steel bench seating, departure timetable board, newspaper racks, luggage lockers, and `pedestrianSystem.ts` commuters sitting/waiting.

| Stop # | Station Code & Name | Location & Track Elevation | Red LED Scroll Arrival Text |
| :--- | :--- | :--- | :--- |
| **01** | **`STN-1: SEVERNY VOKZAL`** | Island 1 — D1 Kalinin Nightlife (`Surface +0.5m`) | `ARRIVING: STN-1 SEVERNY VOKZAL — KALININ NIGHTLIFE DISTRICT` |
| **02** | **`STN-2: SOBORNAYA METRO (UNDERGROUND)`** | Island 1 — D2 Central Reliquary (`Underground -9.5m`) | `ARRIVING: STN-2 SOBORNAYA UNDERGROUND — CATHEDRAL & PLAZA` |
| **03** | **`STN-3: GARRISON BUNKER TERMINAL`** | Island 1 — D3 Safehouse `38.46778, 90.433` (`Underground -9.5m`) | `ARRIVING: STN-3 GARRISON BUNKER — RESTRICTED MILITARY ZONE` |
| **04** | **`STN-4: PORT KALUGA RAIL HUB`** | Island 1 — D4 Industrial Railyard (`Surface +0.5m`) | `ARRIVING: STN-4 PORT KALUGA — RAILYARD & SHIPPING DOCKS` |
| **05** | **`STN-5: ZAVOD-4 & FORENSICS CENTRAL`** | Island 2 — D7 Forensics & 1960s Ghettos (`Surface +1.0m`) | `ARRIVING: STN-5 ZAVOD-4 CENTRAL — FORENSICS & GHETTO SECTOR` |
| **06** | **`STN-6: ENERGETIKOV & BLACK MARKET QUAY`** | Island 2 — D8 POW Camp, Grid & The Spit (`Surface +1.0m`) | `ARRIVING: STN-6 ENERGETIKOV QUAY — POWER GRID & THE SPIT` |
| **07** | **`STN-7: ZONA-9 STARGATE TERMINAL`** | Island 3 — D9 Stargate Peninsula (`Sub-Surface -6.0m`) | `ARRIVING: STN-7 ZONA-9 TERMINAL — CLASSIFIED OCCUPATION` |
| **08** | **`STN-8: ELYSIA & HARBOR GRAND STATION`** | Island 4 — D10 Elysia Resort & Freight Port (`Elevated +4.0m`) | `ARRIVING: STN-8 ELYSIA GRAND — LUXURY RESORT & PORT` |

---

## 5. Copy-Paste Prompt for Google AI Studio (Saves Existing Pedestrian Sheet & Graphics)

> **Paste this exact prompt into Google AI Studio inside your `open-world-engine-main` project:**
>
> Update our `open-world-engine-main` project (`src/sim/`) to build out the **Complete 5-Region Grand Archipelago**, **Named Main Roads & 10 City Districts**, **Hills, Valleys & Undulating Road Elevation**, **Underground-to-Surface Subway System with Red Scrolling Station LED Signs**, and **8 Complex Train Stations (with Coffee Areas & Waiting Halls)**—**while strictly saving and preserving our existing pedestrian character sheet (`src/sim/humanCharacter.ts` & `src/sim/pedestrianSystem.ts`) and all existing graphics/textures (`src/sim/textures.ts`, `src/sim/cityBuilder.ts`, `src/sim/carModel.ts`, `src/sim/environment.ts`, and `public/assets/aistudio/*`) untouched**:
>
> 1. **Save & Reuse Existing Pedestrian Sheet and Graphics (Do Not Overwrite):**
>    - Keep `src/sim/humanCharacter.ts` (`142 KB`) and `src/sim/pedestrianSystem.ts` (`36 KB`) intact—do not delete or replace the existing pedestrian models, clothing variants, or sidewalk crowd logic. Add **Soviet Soldiers**, **Labor Camp Prisoners**, and **Station Commuters/Baristas** as new outfit/behavior presets using that exact same `humanCharacter.ts` character system.
>    - Keep `src/sim/textures.ts` (`82 KB`), `src/sim/carModel.ts`, `src/sim/environment.ts`, and `public/assets/aistudio/*` intact, and model all new archipelago buildings, station halls, subway tunnels, bridges, and freight ships using those exact existing textures and materials.
>    - Keep our existing Novaya Kaluga city in `src/sim/mapData.ts` and `src/sim/cityBuilder.ts` aligned as **Island 1 (West)** so all current roads, traffic, and driving physics (`DrivingEngine.ts`, `physics.ts`) continue working without regression.
>
> 2. **Named Main Roads, 10 Districts & Terrain Elevation (Hills, Valleys & Road Grades):**
>    - Register all **10 named districts (`D1`–`D10`)** and **named main roads** (*Prospekt Kalinina*, *Ulitsa Severnaya*, *Reliquary Ring Boulevard*, *Sobornaya Avenue*, *Garrison Perimeter Road*, *Portovoye Shosse*, *Pereval Mountain Pass*, *Bolotny Plankway*, *Institutskaya Street*, *Khrushchevka Ring Road*, *Energetikov Highway*, *Secrecy Beltway Ring-9*, and *Golden Gate-II Causeway*) in `mapData.ts` with overhead Cyrillic/English street gantry signs and HUD district/road readouts.
>    - Sculpt **spread-out hills (`+8m` to `+28m`) and valleys (`-2.5m` to `-8m`)** across the islands and apply smooth vertical elevation curves (`y` height grades) to the roads and mountain passes in `cityBuilder.ts` and `physics.ts`.
>
> 3. **Underground-to-Surface Subway System (`metroSystem.ts`), Complex Stations & Red Scrolling LED Display:**
>    - Extend `src/sim/metroSystem.ts` so the subway track runs on elevated/surface viaducts (`+6.5m`), dives through concrete portal ramps into **lit underground tunnels (`y = -9.5m`)** beneath **D2 Reliquary Core** and **D5 Sector 4 Mountains**, and crosses the **Gate 12 Bridge** to serve **Island 2, Island 3, and Island 4**.
>    - Inside every train car, add a **red dot-matrix scrolling LED banner (`#ff1e2d`)** that dynamically updates from `metroSystem.ts` to announce the next/arriving station (`>>> NEXT STOP / ARRIVING AT: STN-1 SEVERNY VOKZAL ... STN-8 ELYSIA GRAND >>>`).
>    - Reserve a **`36m × 24m` architectural footprint** at all **8 island and city stops** (`STN-1` through `STN-8`) and build complex enterable station structures (using 4-wall + `2.6m` doorway cutouts) complete with **boarding platforms, ticket turnstiles, a warm-lit Coffee Area (`КАФЕ` espresso counter, tables & `[E]` hot coffee interactable), and a Passenger Waiting Area (benches, timetable board & waiting commuters)**.
>
> 4. **All 5 Connected Archipelago Regions, Soldiers/Prisoners & Enterable Hero Buildings:**
>    - Build **Island 1 (Novaya Kaluga)**, **Sector 4 (Snow-Covered Mountains, Dark Pine Forests & Tall Grass Camouflage Zones)**, **Island 2 (Gate 12 Bridge, Industrial Prison, POW Labor Camp & Mechanical Turbines wired to `infrastructureSystem.ts`, Main Electrical Grid + Secret Intel Bunker tunnel, Forensics Bureau, High Marshes, 1960s Ghettos & The Spit Black Market Docks)**, **Island 3 (Stargate Peninsula with Soviet Soldier patrols, Decoy Barracks elevator to Sub-Surface Ark of the Covenant Vault, Alien Comm Array & Black Woods)**, and **Island 4 (Golden Gate-II Suspension Bridge to Elysia Luxury Resort, Solitude Lighthouse & Commercial Freight Harbor)**.