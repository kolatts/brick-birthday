# Visual review (gpt-6-astra) — 2026-10-06T22:01:21.609Z

Images: finale-cake-ipad-webkit.png, finale-message-ipad-webkit.png, hub-scene-ipad-webkit.png, music-stage-ipad-webkit.png, science-lab-ipad-webkit.png, story-playing-ipad-webkit.png, tennis-court-ipad-webkit.png, title-avatar-ipad-webkit.png, woods-tea-garden-ipad-webkit.png

The world has a recognizable palette and a warm personal premise. The biggest obstacle to a premium finish is hierarchy: oversized interface panels frequently hide the characters and activities, while the 3D scenes vary between glossy toys and flat geometric placeholders.

These judgments are based on the screenshots. Actual CSS tap sizes, animation, speech behavior, and contrast measurements need runtime verification; image pixels alone cannot establish a 64px touch target.

**1. `finale-cake-ipad-webkit.png` — POLISH: A readable celebration, but the interface steals the cake’s moment.**

1. **Rebalance the composition.** Reduce the instruction panel’s height by roughly one-third and use “Make a wish!” with a smaller “Tap to blow out a candle.” Move the camera closer to the cake and family; keep the full cake base inside the space between the instruction and action button.
2. **Make the cake look deliberately constructed.** The tiers resemble striped rectangular boxes. Add shallow bevels, visible connecting studs, rounded icing pieces, and candle holders. Separate the yellow flames from the yellow candle bodies with orange flame cores and restrained emissive light.
3. **Stage the guests.** Turn foreground animals inward toward the cake and reduce the deer’s dominance. Its thin legs and elongated neck clash with the chunky figures. Thicken its limbs, shorten the neck, and add soft contact shadows under every guest.

**Accessibility / kid usability:** “7 left” feels like a task counter at the emotional climax. Use “7 candles glowing,” then celebratory feedback per tap. Let tapping the cake perform the same action as the large button; avoid requiring seven precisely timed taps.

**2. `finale-message-ipad-webkit.png` — POLISH: The message is legible, but its density makes the ending feel like a reading assignment.**

1. **Edit and restyle the message.** Keep the complete text available, but present three short paragraphs at regular or medium weight. Reserve heavy weight for the heading and signature. Left-align the body inside a narrower text column.
2. **Restore the birthday scene.** Reduce the card’s footprint and reposition the camera so Luna and her parents remain visible beside or above it. The current background is mostly empty ground and cropped scenery; the gray disk at the top edge looks accidental.
3. **Establish an action hierarchy.** Make “Back to the island” the primary button, “Read it to me” secondary, and “Play it again” tertiary. Use a shared button height, smaller shadows, and more breathing room above the action row.

**Accessibility / kid usability:** “Play it again” is ambiguous: the message, finale, or entire game? Label the actual outcome—such as “Celebrate again.” Narration should expose a clear stop/pause state and must not compete with background music.

**3. `hub-scene-ipad-webkit.png` — REWORK: The island is appealing, but too many competing navigation layers obscure it.**

1. **Clear the island silhouette.** Compact the top toolbar and replace the persistent bottom tutorial strip with a short, dismissible onboarding prompt. Reserve explicit screen space for navigation so the bottom destination row does not cover the island’s foreground.
2. **Connect labels to destinations.** Anchor each destination label to a stable building marker and resolve overlap in screen space. “Whispering Woods” currently sits across the central cake/trees, making its destination unclear. Give the selected destination a matching outline or animated marker.
3. **Simplify destination cards.** Use destination name, brick progress, and one small challenge-status badge. The current coupon text and tiny gray portraits create dense, repetitive cards; rebalance card widths so longer names do not dictate the entire row.

**Accessibility / kid usability:** The floating labels look much smaller than the surrounding controls and may be undersized if independently tappable. Give each marker a minimum 64 CSS px hit area. Simplify the brick-versus-coupon explanation into two steps shown when relevant.

**4. `music-stage-ipad-webkit.png` — REWORK: Good pad affordances, but the welcome panel hides the performer and much of the activity.**

1. **Move Dad’s dialogue out of the center.** Place a compact speech bubble beside his head, with one short sentence and an explicit dismiss/continue action. Keep his face, hands, and guitar visible.
2. **Reframe the stage around the instruments.** Pull the camera back slightly or adjust instrument positions so the drum kit and xylophone clear the edges. Reduce the large empty red stage fascia and allocate that height to the performer and instrument silhouettes.
3. **Upgrade the instrument construction.** Bevel keyboard edges, thicken xylophone bars, add rounded drum rims, and use consistent plastic roughness plus broad highlights. The guitar’s flat silhouette and the keyboard’s rectangular block construction currently read as programmer art.

**Accessibility / kid usability:** “Jam” and “Follow” do not explain their consequences. Use “Free play” and “Copy the rhythm,” with visual demonstrations. Pair “Kick,” “Snare,” “Hat,” and “Crash” with drum-part illustrations; do not assume a child knows those names.

**5. `science-lab-ipad-webkit.png` — POLISH: The experiments are easy to find, but the lab feels flat and underoccupied.**

1. **Recover vertical space.** Reduce the welcome bubble to a compact line near Julian and move the camera closer to the work surface. The large blank cabinet front consumes space that could show the experiment.
2. **Fix the container materials.** Give vessels readable rims, a visible liquid surface, and stronger silhouette separation. Reduce overlapping transparency; use a lightweight translucent material if needed for iPad performance. The current vessels look like ghosted stacked cylinders.
3. **Make the bench an intentional setup.** Arrange Julian, three vessels, and the active experiment in a tighter working group. Round the lamp shade edges, improve its attachment to the stand, and add contact shadows beneath the lemon and equipment.

**Accessibility / kid usability:** “0/5 experiments,” “0/2 bricks,” and the two reward thresholds ask children to decode several progress systems. Lead with “Try 2 experiments to earn a brick,” then update the instruction after the first reward. Keep completion marks on individual experiment cards.

**6. `story-playing-ipad-webkit.png` — REWORK: Readable text overwhelms the scene that should bring the story to life.**

1. **Show shorter story beats.** Present one or two sentences at a time in a smaller text panel, using medium-weight type and shorter line lengths. Coordinate the visible text with narration; retain manual advancement.
2. **Stage the described action.** Enlarge Mom and move the teapot beside her within the clear scene area. Animate the teapot tilt and a short glitter pour for this beat. The current static table props do little to illustrate the text.
3. **Unify the controls.** Place Replay, Pause, Next, and the contextual magic action in one consistent lower control region. Reduce the reward banner and avoid letting “Make magic!” float as a separate, competing navigation system.

**Accessibility / kid usability:** The relationship between “Next” and “Make magic!” is unclear. Indicate whether magic is optional and never block progress on discovering it. Offer narration without requiring fluent reading, and make replay clearly mean “Replay this part.”

**7. `tennis-court-ipad-webkit.png` — POLISH: The activity reads immediately, but the player blocks the most important play space.**

1. **Improve ball visibility through camera placement.** Raise the camera and offset it slightly behind Luna’s shoulder, or reduce her screen footprint. Keep the ball’s approach corridor visible above and beside her head.
2. **Simplify the court surface.** Remove raised studs from the main playing rectangle or make them very shallow and low contrast. Keep prominent studs on the perimeter; the current repeated geometry competes with the tiny ball and court markings.
3. **Emphasize the ball and swing.** Increase the ball’s screen-space size, add a dark outline or contrasting halo, and use a short optional trail. Move the flowerpot away from the play corridor and show clear racket anticipation and hit feedback.

**Accessibility / kid usability:** “7 rallies in a row” implies a potentially frustrating reset condition. Preserve earned progress or provide generous assisted returns. Ensure tapping navigation or Sparkles does not also swing, and show timing through motion and shape rather than color alone.

**8. `title-avatar-ipad-webkit.png` — POLISH: A strong personal welcome, weakened by an overloaded avatar and competing reading demands.**

1. **Simplify the initial outfit.** Start with one head accessory and one handheld prop. The crown, visor, glasses, face decoration, and shoulder elements overlap enough to hide Luna’s expression. Add accessory-slot compatibility rules to prevent intersecting geometry.
2. **Rebalance the three columns.** Move the birthday heading higher, enlarge the avatar’s presence slightly, and shorten the Daddy card. Preserve Play as the strongest action while reducing the large unused upper-left area.
3. **Clarify the rewards preview.** Replace the four small desaturated illustrations and padlocks with a concise “Win special days with Daddy” preview using fewer, larger images. Put the full locked collection behind the Coupons screen.

**Accessibility / kid usability:** “Beat the Coupon Challenges” introduces unexplained terminology before play. Use concrete language and explain challenges later. Keep the note’s narration optional, with a clear playing state and a way to stop it.

**9. `woods-tea-garden-ipad-webkit.png` — REWORK: A charming premise, but crowding and unclear targeting make serving difficult to understand.**

1. **Restage the guest circle.** Increase the table’s world-space radius or spread guests across two arcs. Normalize animal scale relative to the family: the dog and cat currently dominate, while several figures overlap. Aim every face toward the table or active interaction.
2. **Link selection to the world.** Highlight the selected guest and their cup together, then move the teapot toward that cup when pouring. Replace or soften Luna’s large floor ring, which resembles a movement marker more than a serving indicator.
3. **Simplify the serving tray.** Group the selected guest, their request, and the matching action together. Enlarge request icons, label the treat choices, and give the portrait strip more spacing. Remove the redundant cookie icon plus generic “a treat” wording in favor of the exact request.

**Accessibility / kid usability:** The portrait request badges are very small; they should be informational, not separate tap targets. Verify portrait and arrow controls meet 64 CSS px. Make one tap pour a complete serving, with holding as an optional playful interaction.

**Top 10 across the game, in priority order**

1. **Stop UI panels hiding the activity.** Define shared safe regions for dialogue, objectives, controls, and the 3D focal subject.
2. **Reduce reading load.** One immediate instruction per activity; short story beats; narration controls available where text matters.
3. **Clarify progression.** Separate earning birthday bricks from unlocking date coupons, and explain each at the point of action.
4. **Protect “impossible to fail.”** Use assisted tennis returns, retained progress, forgiving timing, and no punitive resets.
5. **Make interaction targets unmistakable.** Use consistent selected states and connect UI selections to highlighted world objects.
6. **Standardize camera framing.** Keep faces, hands, props, and activity trajectories visible across supported iPad aspect ratios.
7. **Create a shared toy-material treatment.** Consistent bevels, broad plastic highlights, nonmetallic materials, and soft contact shadows.
8. **Unify typography and component sizing.** Heavy display type for short headings; calmer body text; shared borders, radii, and shadow depths.
9. **Resolve silhouette and proportion problems.** Accessory collisions, thin animal limbs, oversized pets, and crowded guest groupings need explicit geometry/layout rules.
10. **Verify touch and sensory usability on-device.** Check 64 CSS px targets, edge spacing, speech/music mixing, visible playback states, and reduced-motion alternatives.

**Overall visual consistency:** The palette and navy-outlined controls already tie the screens together. The main inconsistency is finish: glossy character heads coexist with flat props, faceted animals, translucent lab geometry, and detailed illustrated portraits. Keep those media, but give each a consistent role—3D toys in the world, illustrated portraits in the interface—and unify lighting, proportions, framing, and component scale. The game needs less interface dominance and more intentional staging, rather than more decoration.


<!-- stderr -->
Reading prompt from stdin...
2026-10-06T21:59:42.287046Z ERROR codex_core::session::session: failed to load skill C:\Users\kolat\.codex\plugins\cache\kolatts-marketplace\sunny\2.5.1\skills\commit\SKILL.md: missing YAML frontmatter delimited by ---
OpenAI Codex v0.159.1
--------
workdir: C:\Code\brick-birthday
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: low
reasoning summaries: none
session id: 01a1133a-c72a-70d2-ad67-7beec64d89b9
--------
user
You are a senior art director and UX lead for a premium children's game (ages 6-8, iPad Safari, touch only).
These screenshots are from "Luna's Brick Birthday Island", a personalised birthday game built with React Three Fiber:
a brick-built toy world with original chunky figures (round heads, tapered torsos, C-hands; NOT a copy of any brand) that
carry cartoon portrait face plates. Style target: glossy toy plastic, bright palette (pink #FF5CA8, red #E63946, blue #3A86FF,
yellow #FFD60A, mint #7AE582, cream #FFF4E0, navy #1D2A44), warm, funny, impossible to fail.

Review EVERY image (named in order: finale-cake-ipad-webkit.png, finale-message-ipad-webkit.png, hub-scene-ipad-webkit.png, music-stage-ipad-webkit.png, science-lab-ipad-webkit.png, story-playing-ipad-webkit.png, tennis-court-ipad-webkit.png, title-avatar-ipad-webkit.png, woods-tea-garden-ipad-webkit.png). For each, give:
1. A one-line verdict (ship / polish / rework).
2. The 3 most valuable concrete fixes, each phrased so a developer can act in code (geometry, materials, lighting, camera,
   layout, typography, spacing, colour, motion). Call out anything that looks like programmer art, clipping, unreadable text,
   tap targets that look under 64px, muddy lighting, flat shading, odd proportions, or empty composition.
3. Any accessibility/kid-usability problem.
Then finish with a prioritised "Top 10 across the game" list and a short note on overall visual consistency.
Be specific and critical; praise only what is genuinely good. Do not modify any files.
warning: loading hooks from both C:\Users\kolat\.codex\hooks.json and C:\Users\kolat\.codex\config.toml; prefer a single representation for this layer
warning: clamping SessionEnd hook timeout to 3s in C:\Users\kolat\.codex\hooks.json
hook: SessionStart
hook: SessionStart
hook: SessionStart Completed
hook: SessionStart Completed
codex
I’ll review all nine screens for art direction and touch usability, using the design-critique skill to structure the feedback.
hook: PreToolUse
hook: PreToolUse Completed
exec
"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command "Get-Content -LiteralPath 'C:/Users/kolat/.codex/plugins/cache/claude-cowork/design/1.1.0/skills/design-critique/SKILL.md'" in C:\Code\brick-birthday
 succeeded in 80ms:
---
name: design-critique
description: Evaluate designs for usability, visual hierarchy, consistency, and adherence to design principles. Trigger with "what do you think of this design", "give me feedback on", "critique this", "review this mockup", or when the user shares a design and asks for opinions.
---

# Design Critique

Provide structured, actionable design feedback.

## Critique Framework

### 1. First Impression (2 seconds)
- What draws the eye first? Is that correct?
- What's the emotional reaction?
- Is the purpose immediately clear?

### 2. Usability
- Can the user accomplish their goal?
- Is the navigation intuitive?
- Are interactive elements obvious?
- Are there unnecessary steps?

### 3. Visual Hierarchy
- Is there a clear reading order?
- Are the right elements emphasized?
- Is whitespace used effectively?
- Is typography creating the right hierarchy?

### 4. Consistency
- Does it follow the design system?
- Are spacing, colors, and typography consistent?
- Do similar elements behave similarly?

### 5. Accessibility
- Color contrast ratios
- Touch target sizes
- Text readability
- Alternative text for images

## How to Give Feedback

- **Be specific**: "The CTA competes with the navigation" not "the layout is confusing"
- **Explain why**: Connect feedback to design principles or user needs
- **Suggest alternatives**: Don't just identify problems, propose solutions
- **Acknowledge what works**: Good feedback includes positive observations
- **Match the stage**: Early exploration gets different feedback than final polish

hook: PostToolUse
hook: PostToolUse Completed
codex
The world has a recognizable palette and a warm personal premise. The biggest obstacle to a premium finish is hierarchy: oversized interface panels frequently hide the characters and activities, while the 3D scenes vary between glossy toys and flat geometric placeholders.

These judgments are based on the screenshots. Actual CSS tap sizes, animation, speech behavior, and contrast measurements need runtime verification; image pixels alone cannot establish a 64px touch target.

**1. `finale-cake-ipad-webkit.png` — POLISH: A readable celebration, but the interface steals the cake’s moment.**

1. **Rebalance the composition.** Reduce the instruction panel’s height by roughly one-third and use “Make a wish!” with a smaller “Tap to blow out a candle.” Move the camera closer to the cake and family; keep the full cake base inside the space between the instruction and action button.
2. **Make the cake look deliberately constructed.** The tiers resemble striped rectangular boxes. Add shallow bevels, visible connecting studs, rounded icing pieces, and candle holders. Separate the yellow flames from the yellow candle bodies with orange flame cores and restrained emissive light.
3. **Stage the guests.** Turn foreground animals inward toward the cake and reduce the deer’s dominance. Its thin legs and elongated neck clash with the chunky figures. Thicken its limbs, shorten the neck, and add soft contact shadows under every guest.

**Accessibility / kid usability:** “7 left” feels like a task counter at the emotional climax. Use “7 candles glowing,” then celebratory feedback per tap. Let tapping the cake perform the same action as the large button; avoid requiring seven precisely timed taps.

**2. `finale-message-ipad-webkit.png` — POLISH: The message is legible, but its density makes the ending feel like a reading assignment.**

1. **Edit and restyle the message.** Keep the complete text available, but present three short paragraphs at regular or medium weight. Reserve heavy weight for the heading and signature. Left-align the body inside a narrower text column.
2. **Restore the birthday scene.** Reduce the card’s footprint and reposition the camera so Luna and her parents remain visible beside or above it. The current background is mostly empty ground and cropped scenery; the gray disk at the top edge looks accidental.
3. **Establish an action hierarchy.** Make “Back to the island” the primary button, “Read it to me” secondary, and “Play it again” tertiary. Use a shared button height, smaller shadows, and more breathing room above the action row.

**Accessibility / kid usability:** “Play it again” is ambiguous: the message, finale, or entire game? Label the actual outcome—such as “Celebrate again.” Narration should expose a clear stop/pause state and must not compete with background music.

**3. `hub-scene-ipad-webkit.png` — REWORK: The island is appealing, but too many competing navigation layers obscure it.**

1. **Clear the island silhouette.** Compact the top toolbar and replace the persistent bottom tutorial strip with a short, dismissible onboarding prompt. Reserve explicit screen space for navigation so the bottom destination row does not cover the island’s foreground.
2. **Connect labels to destinations.** Anchor each destination label to a stable building marker and resolve overlap in screen space. “Whispering Woods” currently sits across the central cake/trees, making its destination unclear. Give the selected destination a matching outline or animated marker.
3. **Simplify destination cards.** Use destination name, brick progress, and one small challenge-status badge. The current coupon text and tiny gray portraits create dense, repetitive cards; rebalance card widths so longer names do not dictate the entire row.

**Accessibility / kid usability:** The floating labels look much smaller than the surrounding controls and may be undersized if independently tappable. Give each marker a minimum 64 CSS px hit area. Simplify the brick-versus-coupon explanation into two steps shown when relevant.

**4. `music-stage-ipad-webkit.png` — REWORK: Good pad affordances, but the welcome panel hides the performer and much of the activity.**

1. **Move Dad’s dialogue out of the center.** Place a compact speech bubble beside his head, with one short sentence and an explicit dismiss/continue action. Keep his face, hands, and guitar visible.
2. **Reframe the stage around the instruments.** Pull the camera back slightly or adjust instrument positions so the drum kit and xylophone clear the edges. Reduce the large empty red stage fascia and allocate that height to the performer and instrument silhouettes.
3. **Upgrade the instrument construction.** Bevel keyboard edges, thicken xylophone bars, add rounded drum rims, and use consistent plastic roughness plus broad highlights. The guitar’s flat silhouette and the keyboard’s rectangular block construction currently read as programmer art.

**Accessibility / kid usability:** “Jam” and “Follow” do not explain their consequences. Use “Free play” and “Copy the rhythm,” with visual demonstrations. Pair “Kick,” “Snare,” “Hat,” and “Crash” with drum-part illustrations; do not assume a child knows those names.

**5. `science-lab-ipad-webkit.png` — POLISH: The experiments are easy to find, but the lab feels flat and underoccupied.**

1. **Recover vertical space.** Reduce the welcome bubble to a compact line near Julian and move the camera closer to the work surface. The large blank cabinet front consumes space that could show the experiment.
2. **Fix the container materials.** Give vessels readable rims, a visible liquid surface, and stronger silhouette separation. Reduce overlapping transparency; use a lightweight translucent material if needed for iPad performance. The current vessels look like ghosted stacked cylinders.
3. **Make the bench an intentional setup.** Arrange Julian, three vessels, and the active experiment in a tighter working group. Round the lamp shade edges, improve its attachment to the stand, and add contact shadows beneath the lemon and equipment.

**Accessibility / kid usability:** “0/5 experiments,” “0/2 bricks,” and the two reward thresholds ask children to decode several progress systems. Lead with “Try 2 experiments to earn a brick,” then update the instruction after the first reward. Keep completion marks on individual experiment cards.

**6. `story-playing-ipad-webkit.png` — REWORK: Readable text overwhelms the scene that should bring the story to life.**

1. **Show shorter story beats.** Present one or two sentences at a time in a smaller text panel, using medium-weight type and shorter line lengths. Coordinate the visible text with narration; retain manual advancement.
2. **Stage the described action.** Enlarge Mom and move the teapot beside her within the clear scene area. Animate the teapot tilt and a short glitter pour for this beat. The current static table props do little to illustrate the text.
3. **Unify the controls.** Place Replay, Pause, Next, and the contextual magic action in one consistent lower control region. Reduce the reward banner and avoid letting “Make magic!” float as a separate, competing navigation system.

**Accessibility / kid usability:** The relationship between “Next” and “Make magic!” is unclear. Indicate whether magic is optional and never block progress on discovering it. Offer narration without requiring fluent reading, and make replay clearly mean “Replay this part.”

**7. `tennis-court-ipad-webkit.png` — POLISH: The activity reads immediately, but the player blocks the most important play space.**

1. **Improve ball visibility through camera placement.** Raise the camera and offset it slightly behind Luna’s shoulder, or reduce her screen footprint. Keep the ball’s approach corridor visible above and beside her head.
2. **Simplify the court surface.** Remove raised studs from the main playing rectangle or make them very shallow and low contrast. Keep prominent studs on the perimeter; the current repeated geometry competes with the tiny ball and court markings.
3. **Emphasize the ball and swing.** Increase the ball’s screen-space size, add a dark outline or contrasting halo, and use a short optional trail. Move the flowerpot away from the play corridor and show clear racket anticipation and hit feedback.

**Accessibility / kid usability:** “7 rallies in a row” implies a potentially frustrating reset condition. Preserve earned progress or provide generous assisted returns. Ensure tapping navigation or Sparkles does not also swing, and show timing through motion and shape rather than color alone.

**8. `title-avatar-ipad-webkit.png` — POLISH: A strong personal welcome, weakened by an overloaded avatar and competing reading demands.**

1. **Simplify the initial outfit.** Start with one head accessory and one handheld prop. The crown, visor, glasses, face decoration, and shoulder elements overlap enough to hide Luna’s expression. Add accessory-slot compatibility rules to prevent intersecting geometry.
2. **Rebalance the three columns.** Move the birthday heading higher, enlarge the avatar’s presence slightly, and shorten the Daddy card. Preserve Play as the strongest action while reducing the large unused upper-left area.
3. **Clarify the rewards preview.** Replace the four small desaturated illustrations and padlocks with a concise “Win special days with Daddy” preview using fewer, larger images. Put the full locked collection behind the Coupons screen.

**Accessibility / kid usability:** “Beat the Coupon Challenges” introduces unexplained terminology before play. Use concrete language and explain challenges later. Keep the note’s narration optional, with a clear playing state and a way to stop it.

**9. `woods-tea-garden-ipad-webkit.png` — REWORK: A charming premise, but crowding and unclear targeting make serving difficult to understand.**

1. **Restage the guest circle.** Increase the table’s world-space radius or spread guests across two arcs. Normalize animal scale relative to the family: the dog and cat currently dominate, while several figures overlap. Aim every face toward the table or active interaction.
2. **Link selection to the world.** Highlight the selected guest and their cup together, then move the teapot toward that cup when pouring. Replace or soften Luna’s large floor ring, which resembles a movement marker more than a serving indicator.
3. **Simplify the serving tray.** Group the selected guest, their request, and the matching action together. Enlarge request icons, label the treat choices, and give the portrait strip more spacing. Remove the redundant cookie icon plus generic “a treat” wording in favor of the exact request.

**Accessibility / kid usability:** The portrait request badges are very small; they should be informational, not separate tap targets. Verify portrait and arrow controls meet 64 CSS px. Make one tap pour a complete serving, with holding as an optional playful interaction.

**Top 10 across the game, in priority order**

1. **Stop UI panels hiding the activity.** Define shared safe regions for dialogue, objectives, controls, and the 3D focal subject.
2. **Reduce reading load.** One immediate instruction per activity; short story beats; narration controls available where text matters.
3. **Clarify progression.** Separate earning birthday bricks from unlocking date coupons, and explain each at the point of action.
4. **Protect “impossible to fail.”** Use assisted tennis returns, retained progress, forgiving timing, and no punitive resets.
5. **Make interaction targets unmistakable.** Use consistent selected states and connect UI selections to highlighted world objects.
6. **Standardize camera framing.** Keep faces, hands, props, and activity trajectories visible across supported iPad aspect ratios.
7. **Create a shared toy-material treatment.** Consistent bevels, broad plastic highlights, nonmetallic materials, and soft contact shadows.
8. **Unify typography and component sizing.** Heavy display type for short headings; calmer body text; shared borders, radii, and shadow depths.
9. **Resolve silhouette and proportion problems.** Accessory collisions, thin animal limbs, oversized pets, and crowded guest groupings need explicit geometry/layout rules.
10. **Verify touch and sensory usability on-device.** Check 64 CSS px targets, edge spacing, speech/music mixing, visible playback states, and reduced-motion alternatives.

**Overall visual consistency:** The palette and navy-outlined controls already tie the screens together. The main inconsistency is finish: glossy character heads coexist with flat props, faceted animals, translucent lab geometry, and detailed illustrated portraits. Keep those media, but give each a consistent role—3D toys in the world, illustrated portraits in the interface—and unify lighting, proportions, framing, and component scale. The game needs less interface dominance and more intentional staging, rather than more decoration.
hook: Stop
hook: Stop
hook: Stop Completed
hook: Stop Completed
tokens used
38,169

