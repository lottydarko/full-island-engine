# ANTIGRAVITY INSTRUCTION PACKET — `open-world-engine` ARCHIPELAGO, SUBWAY & INTERIORS

**Target Repository:** `lottydarko/open-world-engine` (`React + TypeScript + Vite`, `src/sim/` engine architecture)  
**Core Engineering Rule:** **DO NOT rewrite or break your existing TypeScript engine modules** (`DrivingEngine.ts`, `physics.ts`, `trafficSystem.ts`, `metroSystem.ts`, `tireTrails.ts`, `carModel.ts`, `audio.ts`). Every new island, underground subway segment, complex train station (with coffee & waiting areas), named road, hill/valley grade, soldier/prisoner faction, and enterable building must snap into your existing `mapData.ts`, `cityBuilder.ts`, `metroSystem.ts`, `textures.ts`, and `humanCharacter.ts` pipelines.

---

## 1. Existing Repo Architecture Map (`open-world-engine-main/src/sim/`)

| Existing Module | Size | What It Already Handles | How We Extend It Without Breaking Anything |
| :--- | :--- | :--- | :--- |
| **`src/sim/mapData.ts`** | `72 KB` | Road network nodes, district bounds, intersections, spawn points, colliders | Add the **10 Named Districts (`D1`–`D10`)**, **Named Main Roads with elevation (`y`) splines**, **8 Station `36m×24m` footprints**, and **Doorway Cutout Colliders**. |
| **`src/sim/cityBuilder.ts`** | `74 KB` | Building placement, street furniture, landmarks, terrain meshes | Split new island builders into `src/sim/islands/*.ts` and station complexes into `src/sim/interiors/stationComplexBuilder.ts`, called from `cityBuilder.ts` after Island 1 builds. |
| **`src/sim/metroSystem.ts`** | `78 KB` | Train/metro movement, tracks, station stops | Add **underground tunnel portals (`y = -9.5m`)**, cross-island track splines to all **8 stops (`STN-1`–`STN-8`)**, and the **red scrolling LED interior train sign** announcing each arriving station. |
| **`src/sim/textures.ts`** | `82 KB` | Procedural `CanvasTexture` generators | Keep all existing textures untouched; export helper variants (`makeRoadSignTexture`, `makeLedScrollTexture`, `makeSovietGhettoTexture`, `makeStationTileTexture`) on the exact same `CanvasTexture` pipeline. |
| **`src/sim/humanCharacter.ts`** & **`pedestrianSystem.ts`** | `142 KB` + `36 KB` | Rigged PS2 characters, coats/limbs, crowd pathing & flee logic | Reuse `humanCharacter.ts` rig with presets: **`SOLDIER`** (Stargate Peninsula & Prison guards), **`PRISONER`** (POW Labor Camp & Turbines), and **`COMMUTER / BARISTA`** (Station waiting halls & coffee kiosks). |
| **`src/sim/infrastructureSystem.ts`** | `20 KB` | Power grid & streetlamps | Hook the **Main Electrical Grid Field** master breaker (`[E]`) directly into `infrastructureSystem.ts` to toggle city-wide power/streetlamps. |
| **`src/sim/DrivingEngine.ts`** & **`src/App.tsx`** | `52 KB` + `26 KB` | Main simulation loop, vehicle/on-foot state, HUD prompts | Add `interactables[]` proximity check (`[E]` prompt for coffee kiosks, station gates, doors & switches), current **Road/District HUD indicator**, and interior culling (`45m`). |

---

## 2. Piece-by-Piece File Additions (Zero Risk to Existing Code)

```
src/sim/
├── islands/
│   ├── sector4_WoodlandsAndMountains.ts # Pereval Mountain Pass (+28m hills & -4m valleys), watchtowers, dark pine forests & tall grass
│   ├── island2_GridPrisonAndGhettos.ts  # Gate 12 Bridge -> Industrial Prison, POW Labor Camp, Grid Field, Forensics, High Marshes, 1960s Ghettos & Black Market Spit
│   ├── island3_StargatePeninsula.ts     # Soviet Soldier Occupation, Decoy Barracks -> Sub-Surface Ark Vault, Alien Comm Array & Black Woods
│   └── island4_ElysiaAndHarbor.ts       # Golden Gate-II Bridge -> Elysia Luxury Resort, Solitude Lighthouse & Commercial Freight Harbor
└── interiors/
    ├── stationComplexBuilder.ts         # Builds all 8 complex 36m×24m train stations (platforms, coffee areas, waiting halls & LED departure boards)
    └── interiorRegistry.ts              # 4-Wall + Doorway Cutout colliders, pivoting doors & [E] world interactions
```

---

## 3. Named Main Roads, 10 City Districts & Elevation Grades (`mapData.ts`)

1. **Named Roads & Gantry Signage:** Every main artery in `mapData.ts` carries `roadName`, `districtId`, and an elevation height curve `getRoadHeightAt(x, z)`:
   - **Island 1:** *Prospekt Kalinina* (`D1 Kalinin Nightlife`, `+6m` terrace ridge), *Ulitsa Severnaya* (`D1`, `-3m` underpass valley), *Reliquary Ring Boulevard* & *Sobornaya Avenue* (`D2 Reliquary Core`, `+4m` crown), *Garrison Perimeter Road* (`D3 Bunker Garrison`, `+8m` ridge), *Portovoye Shosse* (`D4 Railyard & Docks`, `0m`–`+3m`).
   - **Sector 4:** *Pereval Mountain Pass* (`D5 Mountains & Woodlands`, climbs `+28m` snow hills and dips into `-4m` dark pine & tall-grass valleys).
   - **Island 2:** *Bolotny Plankway* (`D6 Evergladian High Marshes`, `+1.5m`–`+5m`), *Institutskaya Street* & *Khrushchevka Ring Road* (`D7 Forensics & 1960s Ghettos`, `-2.5m` valley road between `+7m` apartment hills), *Energetikov Highway* & *Spit Contraband Quay* (`D8 POW Camp, Grid & Black Market Spit`).
   - **Island 3:** *Secrecy Beltway Ring-9* (`D9 Stargate Peninsula`, `+14m` perimeter ridges circling the sunken `-8m` Ark Vault crater).
   - **Island 4:** *Golden Gate-II Causeway* (`+22m` arched bridge) & *Elysia Terraced Promenade* (`D10 Elysia Luxury Resort & Harbor`, `+18m` hillside loop).
2. **Physics Height Sampling (`physics.ts`):** Query `getTerrainOrRoadHeight(x, z)` so cars, pedestrians, and on-foot players smoothly climb hills, dip through valleys, and cross arched bridges.

---

## 4. Underground Subway, Complex Train Stations & Red Scrolling LED Sign

### Underground-to-Surface Track Profile (`metroSystem.ts`)
- **Surface / Viaduct (`+0.5m` to `+6.5m`):** Serves `STN-1 Severny Vokzal` (D1) and `STN-4 Port Kaluga` (D4).
- **Underground Tunnel (`y = -9.5m`):** Concrete portal ramps dive beneath **D2 Reliquary Core** (`STN-2 Sobornaya Underground`) and **D3 Bunker Garrison** (`STN-3 Garrison Bunker Terminal`), tunneling under **D5 Sector 4 Mountains** with lit concrete ribs and red emergency beacons before emerging across **Gate 12 Bridge** onto **Island 2 (`STN-5`, `STN-6`)**, **Island 3 (`STN-7`)**, and **Island 4 (`STN-8`)**.

### Red Scrolling LED Interior Train Display (`metroSystem.ts`)
Attach an emissive `CanvasTexture` (`512×64`) LED marquee bar inside each train carriage above the doors that scrolls bright red dot-matrix text (`#ff1e2d`) driven by `metroSystem.ts` current route state:
- **Approaching Stop:** `>>> NEXT STOP: [STATION CODE] [STATION NAME] ([DISTRICT]) — STAND CLEAR OF DOORS >>>`
- **Arrived at Island / City Stop:** `*** ARRIVING AT: [STATION NAME] — COFFEE & WAITING HALL ON PLATFORM ***`

### Complex Multi-Zone Station Structures (`stationComplexBuilder.ts`)
Reserve a **`36m × 24m` footprint** at each of the **8 stops (`STN-1` through `STN-8`)** so stations have generous architectural room:
- **Zone A — Boarding Platform & Concourse:** Dual platforms, tactile yellow edge strips, overhead red LED arrival clock, and `[E]` ticket gates.
- **Zone B — Coffee Area (`КАФЕ / STATION ESPRESSO`):** Warm amber-lit glass kiosk, espresso counter, menu board, café tables, Barista NPC (`humanCharacter.ts`), and `[E]` **Drink Hot Coffee** interaction.
- **Zone C — Waiting Area:** Parallel rows of wooden/steel station benches, departure timetable wall, luggage lockers, and seated/standing commuters (`pedestrianSystem.ts`).

---

## 5. Copy-Paste Execution Prompt for Antigravity (Tailored to `lottydarko/open-world-engine`)

> **Paste this exact prompt into Antigravity inside your `open-world-engine` workspace:**
>
> Extend `lottydarko/open-world-engine` (`src/sim/`) to assemble the **Complete 5-Region Grand Archipelago (`Novaya Kaluga 2059`)**, **Named Main Roads & 10 City Districts**, **Spread-Out Hills, Valleys & Road Height Grades**, **Underground-to-Surface Subway System with Red Scrolling Station LED Signs**, and **8 Complex Multi-Zone Train Stations (with Coffee Areas & Waiting Halls)**—strictly preserving and building on top of our existing working TypeScript modules (`DrivingEngine.ts`, `physics.ts`, `trafficSystem.ts`, `metroSystem.ts`, `carModel.ts`, `audio.ts`, `textures.ts`, `humanCharacter.ts`, `pedestrianSystem.ts`):
>
> 1. **Save Existing Pedestrian Sheet, Textures & Engine Modules Intact:**
>    - Keep the existing Novaya Kaluga dense urban city in `mapData.ts` and `cityBuilder.ts` aligned as **Island 1 (West)**, and reuse `textures.ts`, `humanCharacter.ts`, `pedestrianSystem.ts`, `carModel.ts`, and `infrastructureSystem.ts` for all new regions, soldiers, prisoners, and station commuters.
>
> 2. **Named Main Roads, 10 Districts & Hills/Valleys Elevation (`mapData.ts`, `cityBuilder.ts`, `physics.ts`):**
>    - Name every main road (*Prospekt Kalinina*, *Ulitsa Severnaya*, *Reliquary Ring Boulevard*, *Sobornaya Avenue*, *Garrison Perimeter Road*, *Portovoye Shosse*, *Pereval Mountain Pass*, *Bolotny Plankway*, *Institutskaya Street*, *Khrushchevka Ring Road*, *Energetikov Highway*, *Spit Contraband Quay*, *Secrecy Beltway Ring-9*, *Golden Gate-II Causeway*, *Elysia Terraced Promenade*) and define all **10 districts (`D1`–`D10`)** with gantry signs and live HUD road/district readout in `App.tsx`.
>    - Add spread-out **hills (`+8m` to `+28m`) and valleys (`-2.5m` to `-8m`)** across the islands and apply smooth `y` elevation grades to roads and bridges in `physics.ts`.
>
> 3. **Underground Subway, 8 Complex Stations & Red Scrolling Train Sign (`metroSystem.ts` & `stationComplexBuilder.ts`):**
>    - Route the subway track through concrete portal ramps into **lit underground tunnels (`y = -9.5m`)** beneath **D2 Reliquary Core** and **D5 Sector 4 Mountains**, surfacing across **Gate 12 Bridge** to serve **Island 2, Island 3, and Island 4**.
>    - Add a **red dot-matrix scrolling LED sign (`#ff1e2d`)** inside every train car that announces the arriving station (`STN-1 Severny Vokzal`, `STN-2 Sobornaya Underground`, `STN-3 Garrison Bunker`, `STN-4 Port Kaluga`, `STN-5 Zavod-4 Central`, `STN-6 Energetikov & Black Market Quay`, `STN-7 Zona-9 Stargate Terminal`, `STN-8 Elysia & Harbor Grand Station`).
>    - Reserve a **`36m × 24m` footprint** at each of the **8 stops** and build complex enterable station halls (using 4-wall + `2.6m` doorway cutouts) containing **boarding platforms, a warm-lit Coffee Area (`КАФЕ` counter, tables & `[E]` hot coffee interactable), and a Passenger Waiting Area (benches, timetable board & waiting commuters)**.
>
> 4. **All 5 Connected Archipelago Regions, Soldiers/Prisoners & Enterable Hero Buildings (`src/sim/islands/*.ts` & `interiorRegistry.ts`):**
>    - Build **Island 1**, **Sector 4 (Mountains, Dark Pine Forests & Tall Grass)**, **Island 2 (Gate 12 Bridge, Industrial Prison, POW Labor Camp & Turbines wired to `infrastructureSystem.ts`, Main Electrical Grid + Secret Intel Bunker tunnel, Forensics Bureau, High Marshes, 1960s Ghettos & The Spit)**, **Island 3 (Stargate Peninsula with Soviet Soldier patrols, Decoy Barracks elevator to Sub-Surface Ark Vault, Alien Comm Array & Black Woods)**, and **Island 4 (Golden Gate-II Bridge to Elysia Luxury Resort, Solitude Lighthouse & Commercial Freight Harbor)**, distance-culling interior props beyond `45m` for smooth Chromebook performance.