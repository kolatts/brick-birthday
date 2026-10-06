# Luna's Brick Birthday Island

A personalized, brick-built birthday game for Luna (iPad Safari, landscape, touch only). Client-side only: Vite + React + TypeScript, three.js (react-three-fiber), zustand, Tone.js. Requirements live in `prompt.md`; binding decisions in `docs/ARCHITECTURE.md`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at `http://localhost:5173/` |
| `npm run dev:lan` | Dev server on the LAN, prints a URL and QR code for the iPad |
| `npm run build` / `preview` | Production build / serve it at `http://localhost:4173/brick-birthday/` |
| `npm run typecheck` / `lint` / `test:unit` | tsc, ESLint, Vitest |
| `npm run verify:size` / `verify:privacy` | Gzip JS budget (1.5 MB); privacy scan of git + `dist/` |
| `npm run test:e2e` | Playwright (Chromium, iPad WebKit, iPhone WebKit) against `vite preview` |
| `npm run verify` | All of the above, in order, failing fast |
| `npm run faces:build` | Converts `private/portraits/*.png` to committed `public/faces/*.webp` |
| `npm run passwords` | Generates/keeps `src/config/passwords.ts` (+ `private/coupon-passwords.md`); `-- --new-passwords` renews |
| `npm run portraits` | Generates cartoon portrait sources into `private/portraits/` |

Add `?test=1` to the URL to expose `window.__game` test hooks and stub speech.

## Voices

All speech uses pre-generated Azure neural clips in `public/voices/` (same-origin static files), with `speechSynthesis` as fallback. `npm run voices:extract` collects lines into `scripts/voices/lines.json`; `npm run voices:generate` (needs `SPEECH_KEY` in env or gitignored `.env.local`; `-- --dry-run`, `-- --force`) synthesizes missing clips. Contract for other code: `src/audio/README-narration.md`.

## Privacy model

`photos/` and `private/` are gitignored and must never be committed or bundled: they hold the real photos and generation sources. The cartoon faces in `public/faces/` and the coupon passwords in `src/config/passwords.ts` are generated art/plain strings and intentionally public. There is no in-app import and no grown-up screen; `?reset=1` clears progress on a device. `verify:privacy` fails if git tracks `photos/` or `private/`, if `dist/` contains API-key patterns or images over 200 KB, or if any image in `public/` or `dist/` is byte-identical to a file in `photos/`.

## Testing on an iPad

Run `npm run dev:lan`, join the same Wi-Fi, scan the QR code. Audio starts after the first tap; hold the iPad sideways.
