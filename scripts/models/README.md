# Figure models (Blender pipeline)

The figure family (Luna, Mom, Dad, Julian, Darian, Rudolph, Jingle Bells) is modelled parametrically in
`build_figures.py` from `figures.json`. It exports one Draco-compressed `.glb` per figure to `public/models/`.
`src/three/Avatar.tsx` uses a glb when its id is listed in `src/config/models.ts`; the procedural figure
(`avatarParts.ts`) is the automatic fallback while a glb loads or if it fails.

## Commands (Windows)

```powershell
winget install BlenderFoundation.Blender      # once; Blender 4.x or newer (built and tested on 5.2)
npm run models:build                          # all figures
npm run models:build -- --only luna,rudolph   # a subset
```

`npm run models:build` runs `scripts/models/build.ts`, which locates `blender.exe` (the `BLENDER` env var, then
`C:\Program Files\Blender Foundation\*\blender.exe`, then PATH), runs

```
blender --background --python scripts/models/build_figures.py -- --out public/models
```

copies three's Draco decoder to `public/models/draco/` (the app loads it locally, never from a CDN), prints each glb
size and **fails if any glb is over 300 KB**. Then make sure the ids are in `src/config/models.ts`.

Preview on the turntable (dev server or a `?test=1` build):
`/?turntable=luna&test=1&yaw=0.5&equip=dress,cape,boots&expr=happy&wave=1`, `/?turntable=all&test=1`.
`node scripts/models/shot.mjs out.png "turntable=luna&test=1"` screenshots it with Playwright (dev server on :5199).

## Scene contract (what the runtime relies on)

| Node | Meaning |
| --- | --- |
| `Head` (empty at the head centre) | nods; parent of `HeadMesh`, `FacePlate`, `Item_bow`, `Item_visor`, `Item_sunglasses`, `Item_pethats` |
| `ArmL` / `ArmR` (empties at the shoulders) | wave and swing; parents of `ArmMeshL/R` and the `Item_<id>__sleeve*` garments |
| `Tail` (pets) | wags |
| `FacePlate` | curved mesh on the head profile, UV mapped 0..1, placeholder material; the runtime replaces the material with the portrait texture |
| `Item_<id>` / `Item_<id>__<part>` | closet garments, hidden unless the id is equipped (`dress`, `cape`, `labcoat`, `boots`, `bow`, `visor`, `sunglasses`, `pethats`) |
| everything else | vertex coloured (COLOR_0) with the shared material `figure`; the runtime swaps in its molded-plastic material |

Coordinates are the three.js frame (Y up, +Z front) and the glTF is exported with `export_yup=False`, so numbers in
the script equal the numbers in `src/three/avatarParts.ts`.

## IP note

All figures are our own design (round head, chunky body, mitten/C hands). No third-party figure shapes or logos.
