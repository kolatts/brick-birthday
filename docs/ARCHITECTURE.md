# Luna's Brick Birthday Island — Architecture & File Plan

Source of truth for requirements: `prompt.md` (read it fully before coding). This doc fixes the
shared decisions so parallel work lands consistently. **Do not add libraries** beyond the stack
without a note in a PR message. Keep everything client-side; no runtime network calls.

## Stack

- Vite 6 + React 19 + TypeScript (strict). `base: '/brick-birthday/'` in production, `/` in dev.
- three.js via `@react-three/fiber` + `@react-three/drei`. zustand for state. Tone.js for audio.
- Vitest (unit), Playwright (e2e), ESLint (flat config, typescript-eslint + react-hooks).
- Node 24, npm. Scripts run with `tsx`.
- Deployed to GitHub Pages at `https://kolatts.github.io/brick-birthday/` via `.github/workflows/deploy.yml`.

## Folder plan

```
public/art/                 committed non-people art (title card, badges, icons, coupons, album frame)
public/faces/               committed cartoon faces (generated art, no photos): <id>-<happy|surprised|silly>.webp, built by `npm run faces:build`
src/
  main.tsx, App.tsx         App = Router by screen (title | hub | zone:<id> | finale)
  config/
    family.ts               people + pets: id, displayName, role, hostZone, avatar params, voice {pitch, rate}, birthDate for luna
    zones.ts                ZONE registry: id, title, host, built: boolean, bricks: number, coupon?: CouponId
    coupons.ts              coupon defs: id, title, zone, illustration, line
    age.ts                  computeAge(birthDate, now), ordinal(n), isBirthday(birthDate, now)
  state/
    progress.ts             zustand store: bricks per zone, experiments done, trees planted, etc; brickGoal() = sum bricks of built zones; localStorage persist with versioned migration + corrupt-data fallback
    coupons.ts              coupon state machine: locked -> available -> dug -> redeemed (+ undo); never affects bricks
    faces.ts                faceUrl(id, expression) -> BASE_URL + faces/<id>-<expr>.webp
    reset.ts                resetEverything() + ?reset=1 handling
    settings.ts             mute, volume
    ui.ts                   current screen, orientation, modal state
  audio/
    engine.ts               Tone.js: unlock on first tap, sfx (tap, pop, sparkle, splash, fanfare), bg music loop, mute
    speech.ts               speechSynthesis wrapper with per-character pitch/rate; word-boundary highlighting callback; stubbed under ?test=1
  three/
    Brick.tsx               instanced stud-brick primitives (BrickGrid, BrickBox)
    Avatar.tsx              chunky brick body + face plate (portrait texture from public/faces); expression prop
    Model.tsx               <Model name fallback> wrapper for future .glb swaps
    Island.tsx              hub island geometry
    Pet.tsx                 wandering pets with trick on tap
    Wand.tsx                wand + sparkle particles
    CameraRig.tsx           drag-to-rotate orbit + fly-to-building
  screens/
    Title.tsx               "Happy {ordinal} Birthday, Luna!", waving avatar, Play
    Hub.tsx                 island, 5 buildings, hosts, pets, cake platform, coupon box, closet, dig spots
    Rotate.tsx              portrait "turn me sideways"
    Finale.tsx
    Closet.tsx, CouponBox.tsx, CouponCard.tsx, DigSpot.tsx
  zones/
    story/                  StoryTower.tsx, templates.ts (~40), generator.ts, MovieNight.tsx (challenge)
    woods/                  WhisperingWoods.tsx, TeaGarden.tsx, TeaPartyOrders.tsx (challenge), facts.ts
    science/, tennis/, music/   (milestone 7; until then zones.ts built:false => "Coming soon!" crane)
  ui/                       Button (min 64px), Panel, BigText, Confetti
  test/                     window.__game test hooks (only when ?test=1)
scripts/
  portraits/generate.ts, style.ts, contact-sheet.ts
  pack/passwords-cli.ts     npm run passwords -> src/config/passwords.ts + private/coupon-passwords.md
  faces/build.ts            npm run faces:build -> public/faces/*.webp from private/portraits
  pack/passwords.ts         word list + crypto generator (also imported by unit tests)
  verify/privacy.ts         git-tracked check + dist scan
  verify/size.ts            gzip budget 1.5 MB
  dev-lan.ts                vite --host + QR code
tests/unit/**               vitest
tests/e2e/**                playwright
private/                    gitignored: portrait sources, coupon-passwords.md
photos/                     gitignored: real photos
```

## Shared types (put in `src/types.ts`)

```ts
export type PersonId = 'luna' | 'mom' | 'dad' | 'julian' | 'darian' | 'rudolph' | 'jinglebells';
export type Expression = 'happy' | 'surprised' | 'silly';
export type ZoneId = 'story' | 'science' | 'tennis' | 'music' | 'woods';
export type CouponId = 'movies' | 'videogames' | 'shopping' | 'icecream';
export type Screen = { kind: 'title' } | { kind: 'hub' } | { kind: 'zone'; zone: ZoneId } | { kind: 'challenge'; zone: ZoneId } | { kind: 'finale' };
```

## Conventions

- Tap targets ≥ 64px on iPad, ≥ 52px on phones (`--btn-min`); sizes scale via `--ui-scale` (`src/ui/scale.ts`: `u()`, `f()`, `inset()`), HUDs use safe-area insets; landscape only, no portrait layouts.
- Original rule: tap targets ≥ 64px; no hover UI. Use `onPointerDown` for game taps (touch latency).
- DPR capped at 1.5 (1.25 on phones) via `maxDpr()`; `frameloop="always"` only in 3D screens.
- All game text copy lives in the zone module or `src/config/copy.ts`; nothing hardcodes Luna's age.
- `?test=1` exposes `window.__game` with: `autoPlay(zone)`, `completeChallenge(zone)`, `getState()`, `skipAnimations()`. Inert without the flag.
- Speech + audio stubs are automatic under `?test=1`.
- Progress store version `1`; `migrate(raw)` returns defaults on any throw.
- Zones self-register their brick counts via `zones.ts`; `brickGoal()` = sum of `bricks` for `built` zones.
- Challenge availability = `bricksEarned(zone) >= zones[zone].bricks`.

## Verify pipeline (`npm run verify`)

typecheck → lint → unit → build → size → privacy → e2e. Each is also a separate npm script.
E2E runs against `vite preview --base /brick-birthday/`; projects: `ipad-webkit` (iPad landscape, hasTouch) and `chromium`.
Screenshots → `test-results/screens/*.png`.
