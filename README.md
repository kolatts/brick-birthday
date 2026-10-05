# Luna's Brick Birthday Island

A personalized, brick-built birthday game for Luna (iPad Safari, landscape, touch only). Client-side only: Vite + React + TypeScript, three.js (react-three-fiber), zustand, Tone.js. Requirements live in `prompt.md`; binding decisions in `docs/ARCHITECTURE.md`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at `http://localhost:5173/` (auto-loads `private/family-pack.json` in dev only) |
| `npm run dev:lan` | Dev server on the LAN, prints a URL and QR code for the iPad |
| `npm run build` / `preview` | Production build / serve it at `http://localhost:4173/brick-birthday/` |
| `npm run typecheck` / `lint` / `test:unit` | tsc, ESLint, Vitest |
| `npm run verify:size` / `verify:privacy` | Gzip JS budget (1.5 MB); privacy scan of git + `dist/` |
| `npm run test:e2e` | Playwright (Chromium + iPad WebKit) against `vite preview` |
| `npm run verify` | All of the above, in order, failing fast |
| `npm run fixtures` | Regenerates the fake family-pack fixture used by tests |
| `npm run pack`, `portraits` | Stubs until milestone 2 |

Add `?test=1` to the URL to expose `window.__game` test hooks and stub speech.

## Privacy model

`photos/` and `private/` are gitignored and must never be committed or bundled. Real faces and coupon passwords reach the iPad only via a **family pack** JSON file imported on the Grown-up screen (long-press the title for 3 seconds); it is stored in IndexedDB on that device. `verify:privacy` fails if git tracks those folders or if `dist/` contains pack data, passwords, API-key patterns or large embedded images. Tests use an obviously fake fixture pack.

## Testing on an iPad

Run `npm run dev:lan`, join the same Wi-Fi, scan the QR code. Audio starts after the first tap; hold the iPad sideways.
