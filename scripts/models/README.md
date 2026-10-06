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
| `Head` (empty at the head centre) | nods; parent of `HeadMesh`, `Face_happy`, `Face_surprised`, `Face_silly`, `Item_bow`, `Item_visor`, `Item_sunglasses`, `Item_pethats` |
| `ArmL` / `ArmR` (empties at the shoulders) | wave and swing; parents of `ArmMeshL/R` and the `Item_<id>__sleeve*` garments |
| `Tail` (pets) | wags |
| `Face_happy` / `Face_surprised` / `Face_silly` | parent empties under `Head`; each contains the complete expression as shallow mesh relief with opaque `FaceInk_*` base-colour materials |
| `Item_<id>` / `Item_<id>__<part>` | closet garments, hidden unless the id is equipped (`dress`, `cape`, `labcoat`, `boots`, `bow`, `visor`, `sunglasses`, `pethats`) |
| body, hair and closet meshes | vertex coloured (COLOR_0) with the shared material `figure`; the runtime swaps in its molded-plastic material |

Coordinates are the three.js frame (Y up, +Z front) and the glTF is exported with `export_yup=False`, so numbers in
the script equal the numbers in `src/three/avatarParts.ts`.

## IP note

All figures are our own design (round head, chunky body, mitten/C hands). No third-party figure shapes or logos.

## Geometry faces and Blender review

Faces contain no images, textures, UVs or alpha blending. Elliptical eyes, white
catchlights, blush and tongues follow the skull curvature; brows, smiles, lashes
and winks are thin mesh tubes. Face meshes use material base colours (no COLOR_0).
The existing body/hair/closet geometry keeps its vertex colours. Skin uses
`skinTone` directly, including Dad #6B4226 and Luna #B98259.

All three expression groups are exported. glTF does not standardize object visibility:
the runtime must select exactly one `Face_*` group before displaying the model.
Do not replace `FaceInk_*` materials with a vertex-colour-only body material.
`FacePlate` and its placeholder image have been removed. Head, arm, tail and
closet node names and transforms are preserved. The generator resets Blender for
every figure, making repeated builds independent of prior scene state.

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/models/build_figures.py -- --review test-results/blender
# Or through the existing wrapper:
npm run models:build -- --review test-results/blender
```

`--review` adds a Blender Cycles PNG per figure, with happy / surprised / silly
columns, front views above and 30-degree turntable views below. Three area lights
illuminate the figures; closet overlays are hidden for review only. Review copies,
camera and lights are created after export and never enter the GLB. Review PNGs
are local artifacts in `test-results/blender/`. The Python exporter itself rejects
any output of 300,000 bytes or more, including direct Blender invocations.
