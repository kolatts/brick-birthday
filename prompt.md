# Build: "Luna's Brick Birthday Island" — a personalized birthday game

## Context
This is a birthday gift for my daughter Luna, born October 16, 2019, who turns 7 on **October 16, 2026**. That date is a hard deadline. Her party is at a brick-toy theme park, so the world is brick-built.

She loves storytelling, science, tennis (she plays), music (she is learning piano and drums), tea time, magic, and dress-up. She hates forests being cut down. She'll play on an iPad (Safari), often with a grown-up nearby. The tone should be warm, funny, generous, and impossible to fail.

Her favorite color is pink, and red and blue.
She likes chai lattes. She absolutely hates most vegetables like broccoli, but also dislikes chicken noodle soup. She loves orange chicken from Panda express.

Jingle Bells is our cat, Rudolph is our dog. Luna wants a Yorkshire terrier, but has had trouble sleeping in her own room, and we have said she must do this for a month to get one.

Use all of this info to make the game interesting and immersive.

I've also included /photos/



## Before you start
1. Read the image-generation skill (and any other relevant skills) before writing code.
2. **Privacy first.** `photos/` holds labeled real photos of my family. Before doing any other work:
   - Make sure `photos/`, `private/`, and `.env*` are in `.gitignore`.
   - Confirm with `git check-ignore`.
   - Confirm that `git log --all -- photos private` returns nothing. If anything was ever committed, stop and tell me.
3. Inspect the `photos/` filenames to learn the labels. Tell me who you found and which photos map to whom. Ask me if any label is ambiguous.
4. Propose a short file and folder plan, then build in the milestones at the end of this prompt. Verify each milestone before moving on.
5. You should create stylized cartoon artwork with the image generation skill based on these photos to create artwork for the game

## Hard constraints
- **Runtime:** client-side only. No backend, and no network calls at runtime.
- **Stack:** Vite + React + TypeScript, three.js via @react-three/fiber and @react-three/drei, zustand for state, and Tone.js for music and sound. Don't add other libraries without a clear reason. Prefer simple, boring architecture.
- **Hosting:** a public GitHub repo deployed to GitHub Pages via GitHub Actions. Set the Vite `base` correctly.
- **iPad Safari first:**
  - Touch only, with no hover-dependent UI and tap targets of at least 64px.
  - Unlock audio on the first tap.
  - Landscape orientation, with a friendly "turn me sideways" screen in portrait.
  - Hold 60fps on a mid-range iPad: low-poly geometry, instanced bricks, simple lighting, minimal shadows, and capped DPR.
- **Progress:** saved in localStorage.
- **Difficulty:** no timers in the main game, no losing, no fail states. Mistakes are silly, never bad.

## IP rules
- The look is generic "brick-built": studded blocks and chunky blocky figures we design ourselves, but with cartoon faces (similar to LEGO) that match us.
- Do not use the LEGO name, logo, or minifigure likeness. Our figures have their own proportions: a rounder head, a chunkier body, and mitten hands.
- Luna likes Harry Potter and Minnie Mouse, but this game uses NO characters, names, places, creatures, spells, sports, logos, music, or recognizable designs from those or any other franchise, and no lookalike substitutes. All magic and cuteness here is our own original invention. If something starts to resemble a known property, change it until it doesn't.

## Family config: `src/config/family.ts`
For each person, store: id, display name, role, host zone, avatar params (body and outfit colors, hair style and color, one signature accessory), and voice pitch and rate. All personal content lives here, with TODO placeholders for anything unknown.

The family:
- **Luna:** the player. `birthDate: "2019-10-16"`.
  - Compute her age from the birth date; never hardcode 7.
  - The title screen reads "Happy 7th Birthday, Luna!"
  - On October 16th, the hub automatically gets birthday balloons and the pets wear party hats.
- **Mom (Brandy):** hosts the Story Tower.
- **Julian:** older brother, hosts the Science Lab.
- **Darian:** older brother, hosts the Tennis Court.
- **Dad:** hosts the Music Stage and plays guitar.
- **Rudolph and Jingle Bells:** the family pets. They host the Whispering Woods and follow Luna around the hub. Describe them from their photos if they're present; otherwise leave a TODO.

Remaining TODO: a message from Mom and Dad for the finale.

## Illustrated portraits pipeline
Script: `scripts/portraits/generate.ts`, run with tsx.
- Use the OpenAI Images API the way the image-generation skill does, with the key from `OPENAI_API_KEY` in `.env.local`. Never log or commit the key.
- For each person and pet, generate 3 expressions (happy, surprised, silly) using their photos from `photos/` as references.
- Output: 1024px square PNGs with transparent backgrounds, head and shoulders centered inside a circular safe area. Save to `private/portraits/<id>-<expression>.png`.
- Keep one shared style prompt in `scripts/portraits/style.ts`:
  - Bright, friendly, original cartoon portrait style with clean outlines, soft simple shading, and warm colors.
  - Consistent across the whole family.
  - Clearly preserve each person's real features: face shape, skin tone, hair, eye color, glasses, facial hair.
  - Do not imitate any studio's or franchise's style.
- Make the script idempotent: skip existing files unless `--force`. Support `--only=<id>` and `--dry-run` (prints the planned calls and image count). Require `--yes` before generating more than 10 images at once.
- Build a contact sheet at `private/portraits/contact-sheet.html` showing each source photo next to its portraits.
- **Review loop:** view every generated portrait yourself and compare it to the source photo for likeness and style consistency. Regenerate up to 3 times per image. Then give me a list of any you're unsure about.

Separately, generate non-people art (title card, badges, UI icons, coupon illustrations, album frame) into `public/art/`. This art can be committed because it contains no one's likeness.

## Family pack: getting private content to the iPad without putting it in the repo
- `npm run pack` builds `private/family-pack.json`. It contains:
  - The portraits, resized to 512px WebP and base64-encoded.
  - Optional album photos from `photos/album/`, resized to 1600px.
  - The coupon passwords (see Coupons).
  - A schema version number.
- **Grown-up screen:** "Import family pack" opens a file picker and stores the pack in IndexedDB on that device only. "Remove family pack" deletes it.
- **Without a pack:**
  - Avatars show simple default faces that are committed to the repo and don't depict anyone real.
  - Coupons show "Ask a grown-up to load the family pack" in place of a password.
- **Dev only:** in `npm run dev`, auto-load `private/family-pack.json` if it exists. This must never end up in the production build.

## Visual style & 3D
- Build everything procedurally from brick and box primitives with instancing, using a bright toy palette.
- **Avatars:** a chunky brick body plus a flat, slightly rounded face plate that displays the portrait texture. Swap expressions on events: surprised on a miss, happy on earning a brick, silly when tapped.
- Wrap props in a `<Model name fallback>` component so I can swap in .glb files later with no code changes. Keep any .glb under 300 KB.

## Game structure
- **Title screen:** "Happy 7th Birthday, Luna!", Luna's avatar waving, one big Play button.
- **Hub:** a small floating island with a drag-to-rotate camera.
  - Five zone buildings, each with its host waving out front. Tapping a building flies the camera in and opens the zone.
  - A zone that isn't built yet shows "Coming soon!" with a brick construction crane.
  - The pets wander the hub and do tricks when tapped.
  - A brick cake platform in the center shows collected Birthday Bricks.
  - The Coupon Box and the Dress-up Closet also live in the hub.
- **Luna's wand:** a brick wand with a glowing star tip. Tapping in the hub makes sparkles, and each zone has one optional "wand moment."
- **Dress-up Closet:** items such as big hair bows, polka-dot dresses, a sparkly cape, a tennis visor, and a lab coat. Each brick earned unlocks a new item. Pets can wear party hats.
- **Birthday Bricks:** 7 total once every zone exists.
  - Story Tower: 2
  - Science Lab: 2
  - Tennis Court: 1
  - Music Stage: 1
  - Whispering Woods: 1
- **Adaptive goal:** the brick goal counts only zones that are currently built, so the finale is reachable with whatever zones have shipped.
- **Replay:** every zone stays replayable after its bricks are earned.

## Zones (each is its own scene and module)

**1. Story Tower (Mom).** Luna builds a story by picking one tile each for hero, place, problem, and magic power. The game assembles the story from about 40 templates and reads it aloud with speechSynthesis, highlighting each word as it's spoken.
- Hero options: family members, the pets, and gentle cameos from Luna's own storybook series:
  - Princess Moon: half fairy, half mermaid, with gold wings, a silver tail, and pink hair.
  - Baby Lady: her small, fluffy dog sister.
  - Baby Jag Cottontail: a yellow jaguar with black spots and pink hair.
- No villains.
- Brick 1: finish a first story. Brick 2: finish a story with a family member as the hero.
- **Challenge, Movie Night (Movies coupon):** the game shows 4 scene cards from a short story, shuffled. Luna puts them in order (beginning, middle, middle, end), and the story plays back like a little movie with curtains and popcorn. She needs to do 3 different stories. A wrong order plays a silly mixed-up version, then she tries again.

**2. Science Lab (Julian).** Five real experiments that feel like potion-making. Julian gives a kid-level "why" line for each:
- Color-changing potion: red cabbage juice turns pink with lemon and green with baking soda. Luna stirs with her wand.
- Sink or float: predict, then drop the object in.
- Brick rocket: more fuel bricks means a higher launch.
- Crystal growing: a sped-up timelapse she taps along with.
- Seed science: give a seed water, light, and soil, and it sprouts.

Bricks unlock at 2 and 5 experiments.
- **Challenge, Mystery Potion (Video Game Day coupon):** Julian shows a target color, and Luna figures out which ingredients make it. She solves 3 in a row; every wrong mix produces a funny bubbling result. The final potion makes the lab glow like an arcade.

**3. Tennis Court (Darian).** A fixed-camera rally.
- The ball arcs slowly toward Luna. She taps anywhere to swing, with very forgiving timing and auto-aim.
- Darian cheers and makes silly misses.
- 7 rallies earns the brick.
- **Challenge, Super Rally (Shopping coupon):** reach a 15-rally streak with a slightly faster ball. A miss just restarts the count, with Darian cheering, "Again!"

**4. Music Stage (Dad).** Brick drums, keyboard, guitar, and xylophone, built with Tone.js.
- Follow mode: lights show which pad to tap. Songs: "Happy Birthday" plus two original tunes.
- Jam mode: free play, quantized so anything she taps sounds good.
- Each instrument she plays adds a family member to the band. Playing all four earns the brick.
- No challenge or coupon for now. Keep the coupon config flexible so I can add one here later.

**5. Whispering Woods & Tea Garden (Rudolph and Jingle Bells).** Some trees are missing, leaving bare stumps. Never show any chopping.
- Luna plants saplings and waters them, and her wand makes them grow with a pop-and-stack animation.
- Each tree brings back an original forest friend (fox, deer, songbird, squirrel, rabbit), and each one thanks her.
- Short, hopeful spoken facts about why trees matter.
- After 7 trees, a tea garden appears. Luna pours tea (tap-and-hold; overfilling makes a silly splash) and serves treats to the family, the pets, and the forest friends, who each have a funny reaction.
- Finishing the tea party earns the brick.
- **Challenge, Tea Party Orders (Ice Cream coupon):** guests order specific things ("two sugar cubes and a strawberry cake"), and Luna fills 5 orders. The last guest orders an ice cream sundae, which she builds from scoops.

## Daddy-Daughter Coupons
- Coupons live in `src/config/coupons.ts`. Each one has an id, a title, a zone, an illustration, and the line "Good for one Daddy-Daughter ___ Date!"
  - **Movies:** Story Tower
  - **Video Game Day:** Science Lab
  - **Shopping:** Tennis Court
  - **Ice Cream:** Whispering Woods
- **Challenge rules:**
  - A zone's challenge unlocks after that zone's bricks are earned.
  - Challenges are harder than the main game but still have no fail state: unlimited retries and encouraging feedback.
  - Challenges never count toward bricks and never block the finale. They can be done anytime, including after the finale.
- **Buried treasure:** completing a challenge returns Luna to the hub, where a glowing dig spot appears next to that zone's building.
  - Rudolph and Jingle Bells run over and start digging, and Luna taps to help (about 5 taps).
  - A brick treasure chest pops out with confetti, and the coupon card opens full-screen.
  - The card shows a large, easy-to-read password and the line "Show this to Daddy!"
- **Passwords:** generated by `npm run pack` using crypto-random selection from a curated kid-friendly word list.
  - Format: `WORD-WORD-NUMBER`, e.g. `PINK-STAR-42`.
  - Use short, easy, positive words. Never use real names, and avoid any negative, scary, or easily confused words.
  - Passwords stay stable across re-runs unless I pass `--new-passwords`.
  - Write them to `private/coupon-passwords.md` as a cheat sheet for me (gitignored).
- **Coupon Box** (in the hub): a treasure chest holding every earned coupon, each showing its password. Redeemed coupons get a "Redeemed ✓" stamp.

## Finale
1. Everyone gathers at the tea garden table in the replanted forest. If the Woods isn't built, use a brick picnic table in the hub instead.
2. The collected bricks stack into a giant cake with candles equal to Luna's computed age. Luna taps to blow them out.
3. Fireworks, and the family band plays "Happy Birthday."
4. The photo album opens with album photos from the family pack, or a brick family portrait if there are none.
5. End with the message from config.

## Audio & voice
- speechSynthesis for narration, with per-character pitch and rate.
- Tone.js for sound effects and gentle background music, with a mute toggle.

## Grown-up screen
Opened by long-pressing the title for 3 seconds. It includes:
- Reset progress
- Unlock all bricks
- Unlock all challenges
- Import or remove family pack
- Coupons: list each as locked, earned, or redeemed, with a "Mark redeemed" button and undo
- Volume
- Replay finale

## Testing & verification (required — nothing is done until verified)
`npm run verify` runs all of the following in order and fails on the first problem:

1. **Typecheck and lint:** `tsc --noEmit` and ESLint.
2. **Unit tests (Vitest)** covering:
   - The progress store, brick counting, and the adaptive brick goal for built zones.
   - localStorage save, load, and migration, with a safe fallback for corrupt data.
   - Age and ordinal logic from the birth date ("7th," "8th," "11th," "12th," "21st"), and the birthday-only hub decorations.
   - The story generator: every combination renders valid text with no "undefined" or "TODO."
   - Family pack parsing and validation.
   - Config validation: every person has avatar params and a host zone, and every coupon maps to a real zone.
   - The password generator: correct format, word list contains only approved words, crypto randomness, stable across re-runs unless regenerated.
   - Coupon state: locked → challenge available → dug up → redeemed, plus undo. Challenges never affect bricks or the finale.
3. **Production build and size budget.** Fail if the gzipped JS exceeds 1.5 MB.
4. **Privacy checks.** Fail if:
   - git tracks anything under `photos/` or `private/`, or
   - `dist/` contains portrait data, coupon passwords, the string "family-pack," embedded images over 200 KB, or any API key pattern.
5. **E2E tests (Playwright)** against `vite preview` with the real base path. Run two projects: iPad landscape in WebKit with touch enabled, and Chromium. Tests cover:
   - Title loads, then the hub loads, and the canvas actually renders (sampled pixels are not uniform).
   - Portrait orientation shows the rotate screen.
   - Every built zone can be entered by tapping and completed, and unbuilt zones show "Coming soon!" Use real taps where practical. For timing-based games, use a `?test=1` hook (`window.__game`) with helpers like `autoPlay()` that is inert without the flag.
   - Every built zone's challenge can be completed. The dig spot appears, the dig sequence plays, and the coupon card shows the password from the fixture pack. The Coupon Box lists the coupon, and the redeemed stamp works. Without a pack, the fallback text appears.
   - Collecting all available bricks plays the finale and opens the album.
   - Progress survives a reload, and reset clears it.
   - Family pack import through the file chooser works, using a fixture pack with obviously fake generated faces and fake passwords. Never use real photos in tests or fixtures.
   - No console errors, and zero network requests to anything other than localhost.
   - Audio starts only after the first tap. Stub speechSynthesis.
   - Performance smoke test: average frame time in the hub over 5 seconds, in Chromium, as a regression check against a budget.
   - Screenshots of the title, the hub, every zone and challenge, every coupon card, and the finale, saved to `test-results/screens/`. **View these yourself** and check that avatars and faces look right, nothing clips, text is readable at iPad size (especially passwords), and tap targets are visible.

   If headless WebKit can't render WebGL in this environment, tell me. Run the rendering checks in Chromium and keep WebKit for the flow tests.
6. **Real-device testing:** `npm run dev:lan` runs `vite --host` and prints the LAN URL plus a QR code so I can open it on the iPad.

The GitHub Actions workflow runs `verify` before deploying, using the fixture pack. Portrait generation never runs in CI.

## Milestones (hard deadline: October 16, 2026)
Must ship by the birthday, in this order:
0. Generate some art direction **let me review this first before generating more assets**
1. Scaffolding, privacy guard, verify pipeline skeleton, and deploy workflow.
2. Portraits pipeline, contact sheet, and family pack (including coupon passwords).
3. Hub, avatars, family pack import, closet, and Coupon Box.
4. Story Tower end-to-end, including the Movie Night challenge and coupon. **Stop here so I can test on the iPad.**
5. Whispering Woods & Tea Garden, including the Tea Party Orders challenge and coupon.
6. Finale and polish.

Ship after the birthday as "new places on the island":
7. Science Lab, Tennis Court, and Music Stage, one at a time, with their challenges and coupons.

After each milestone:
- Run `npm run verify`.
- View the screenshots.
- Report what passed and anything skipped or stubbed.
- Give me a short manual iPad checklist covering touch feel, audio, smoothness, and coupon readability.