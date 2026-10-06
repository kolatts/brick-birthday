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


## Smooth human sculpt (October 2026)

Human hands are watertight, cupped quad surfaces with asymmetric finger/thumb ends,
a visible notch and Catmull-Clark subdivision level 2. Their palms turn inward;
rounded skin cuffs connect to continuous sleeves with hemispherical shoulders.
Luna's left mitten closes around a gold wand shaft. Both wand and hand are baked
into `ArmMeshL`, so they move together around the unchanged `ArmL` shoulder pivot.

The human torso, legs and shoes use additional subdivision; rounded hip and
shoulder inserts soften the joint transitions. Luna has a 6.5% larger head,
a smooth pulled-back cap and bun, longer lashes, four round studs and a permanent
pink dress hem. Existing `Item_*` overlays and all three geometry expressions
remain available. The pets use the original construction path and their approved
GLBs are not rebuilt by the human-only command below.

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/models/build_figures.py -- --only luna,mom,dad,julian,darian --review test-results/blender
```

Subdivision is evaluated before a human-only mesh reduction pass budgets the
**complete asset** to about 38,500 triangles, including hidden closet items and
all expressions. Face geometry is retained intact; arm meshes receive a larger
share of the budget to protect hand silhouettes. Flat vertex colours, opaque
face materials and the original Draco quantization settings are retained.
The export log reports actual triangulated counts, not polygon counts.

Review renders use the same three-light sheet for every human. Luna additionally
gets `test-results/blender/luna-hands.png`, a close-up of both hands and the wand
contact. Five sculpt/render reviews were performed: continuous hands/proportions,
mesh budget/shoes/wrist clearance, sleeve and dress silhouette, then rounded
shoulder and hem-intersection cleanup, and wrist/shaft clearance refinement.
The first two sheets are retained in
`test-results/blender/pass-1/` and `pass-2/`; final sheets are at the top level.


Final GLB validation (Blender 5.2.2 LTS; counts from exported index accessors):

| Figure | Bytes | Triangles (all expressions and closet items) |
| --- | ---: | ---: |
| Luna | 122,368 | 38,486 |
| Mom | 104,380 | 38,496 |
| Dad | 106,436 | 38,497 |
| Julian | 105,064 | 38,497 |
| Darian | 107,024 | 38,496 |

Verified original `Item_*` names, all expression groups, unchanged shoulder
transforms, Draco on every primitive, and no texture/image payloads. Rudolph and
Jingle Bells match their pre-edit SHA-256 hashes byte for byte.
