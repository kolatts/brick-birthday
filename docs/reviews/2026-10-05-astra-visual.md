# Visual review by Codex gpt-6-astra — 2026-10-05

Inputs: title-avatar, closet, hub-scene, woods-tea-garden, story-playing, coupon-card-movies.

**The owner is right about the blockiness, but “more polygons” alone will not fix it.** The figures mix rounded hair, flat face plates, angular clothing, and blunt joints without a consistent sculpting language. Much of the world reads as matte construction geometry; the hair alone gets convincing highlights. That mismatch makes the characters feel assembled from unrelated parts.

Keep the chunky proportions, C-hands, portrait faces, and brick-built environment. Spend geometry on curved silhouettes and molded edges; use lighting and materials to make those surfaces read as premium toys. These are screenshot-based findings, with implementation values suggested as starting points.

**1. Title with avatar — REWORK**

The invitation is clear, but your flagship character is not yet strong enough to carry this much empty space. The face resembles a portrait pasted onto a brown block, and the hair reads as clustered balls.

1. **Rebuild the head and hair as a coherent sculpt.** Use a rounded head with fuller cheeks and a softened jaw. Curve the portrait surface to follow the head, eliminating the visible rectangular lower-face boundary. Replace the disconnected forehead lumps with a continuous hair cap and shaped curls; retain braid detail, but blend its roots into the cap. Use roughly 32–48 radial segments on prominent head curves and smooth normals.
2. **Give the whole figure the same molded-plastic finish.** Bevel torso, cuffs, shoes, and wand edges; soften the shoulder-to-arm transitions while keeping articulation visible. Start body plastic around `roughness: 0.25–0.35`, `metalness: 0`, with restrained clearcoat. Add a broad studio reflection and soft fill so the pink torso feels as dimensional as the hair.
3. **Compose an actual character introduction.** Move the avatar inward and bring it closer to the title/button group. Break the heading deliberately into “Happy 7th Birthday,” and “Luna!” instead of stretching it across one line. Remove the hard offset text shadow. Turn the figure slightly toward Play and keep the wand clear of its face.

**2. Dress-up closet — REWORK**

The central promise is undermined: wearing everything produces clipping and a confused silhouette. Eight identical green cards communicate selection, but almost nothing about the clothes.

1. **Make outfit compatibility explicit in code.** Assign items slots such as `headwear`, `eyewear`, `outerwear`, `outfit`, and `footwear`; define which combinations can coexist. The visor and star glasses need separate, anatomically anchored positions. Give coats clearance over dresses and capes clearance behind shoulders. Fit garment meshes to shared body anchors rather than positioning each accessory independently.
2. **Model garments as shaped shells.** The coat looks like a rigid chest box, the dress like a cone, and the boots like blocks. Add rounded lapels, sleeve cuffs, a softened skirt hem, and shaped boot toes/soles. Give shells thickness and bevels. Add only a few intentional folds—the target is sculpted toy clothing, not cloth simulation.
3. **Turn the selection UI into a wardrobe.** Replace emoji with thumbnails of the actual equipped meshes, rendered at a consistent angle. Use neutral cards, a clear selected outline/check, and category grouping instead of eight saturated green panels. Center the figure vertically in its preview area and reduce the oversized pedestal. Preserve large touch targets while allowing drag-to-rotate inspection.

**3. Island hub — REWORK**

This is the most promising world composition, but it is visually overfilled. Trees, studs, cranes, buildings, labels, characters, and navigation all compete at nearly the same intensity.

1. **Establish destination silhouettes.** Reduce repeated trees and studs along the main paths; preserve detail in destination clusters. Give each activity a distinct landmark visible at this camera distance. The repeated yellow-and-black structures dominate several destinations and obscure their identities—shrink or replace them with activity-specific structures.
2. **Reframe around navigation.** Slightly lower the camera’s downward angle to reveal more façades and faces, then fit the island inside the usable viewport above the bottom controls. Protect the central character and cake from label overlap. Implement screen-space label placement with collision avoidance and consistent anchors; make the world landmark itself a generous tap target.
3. **Consolidate the HUD and recover material depth.** Use the bottom destination controls as the primary navigation and show world labels selectively, rather than repeating five competing labels. Tone down distant foliage and introduce soft contact shadows beneath figures, buildings, and trees. Give brick edges narrow bevel highlights; extra subdivisions on flat brick faces will contribute essentially nothing.

**4. Tea garden — REWORK**

The gathering is charming, but the scene is organized as an inventory display. The camera favors the tabletop over the guests, while the controls scatter attention across three edges.

1. **Seat and stage the guests.** Replace the standing lineup with seated or perched poses arranged around the table. Aim heads and bodies toward the tea activity, with modest asymmetry. Lower and pull back the camera enough to reveal faces and bodies; fade foreground foliage if it obstructs the view. Keep the current guest clearly visible.
2. **Bring animals up to the same sculpting standard.** The deer, fox, bird, squirrel, and rabbit have markedly harsher silhouettes than the cat and dog. Round muzzles, haunches, ears, and limb ends; add recessed eye placement and molded transitions. Use thicker cup rims, curved handles, and a rounded teapot spout so the tea service holds up at this close distance.
3. **Make the serving sequence visible in one place.** Put the selected guest, requested treat, and pour feedback together near the table. Anchor the fill indicator to the receiving cup, supported by a clear “Release!” cue in the success zone. Replace the cramped bottom row with a selected-guest panel and generous previous/next controls, or a scrollable strip. “7/7 trees” should recede once tea serving becomes the current task.

**5. Story tower — REWORK**

The reading panel dominates the scene while making most of its text deliberately hard to read. The character is partly hidden behind a book, and the enormous star consumes space without explaining the result of tapping it.

1. **Show short story beats instead of a full-page transcript.** Display one or two sentences at a time, with a clear next/replay affordance. Keep every visible word readable; indicate narration progress with a highlight or underline instead of fading upcoming text toward the panel color. Remove the duplicate story title inside the panel.
2. **Give the performance room.** Reduce the text area to roughly half the landscape viewport and reserve a clean stage for the figure and props. Bring the camera closer to the character, lower the book below the mouth, and arrange the teapot and magic effect around the action being narrated. The illustration should help explain the sentence.
3. **Make magic contextual and restyle the room.** Place the star close to the object it affects and label the action specifically, such as “Make glitter!” when appropriate. Reduce the brick-wall contrast and floor-stud scale so they stop competing with reading. Add soft key lighting and rounded prop edges to give the stage depth.

**6. Coupon card — POLISH**

This is the clearest screen. The reward hierarchy works, and the illustration has more finish than much of the 3D world. However, the largest element is a test-looking identifier.

1. **Make the experience the reward.** Use “Movie date with Daddy” as the main title and shorten the supporting copy. Reduce the code’s size and place it in a secondary “Show Daddy” area. Keep a prominent celebratory visual above it.
2. **Build a tangible ticket composition.** Put the artwork, title, promise, and code inside one cream ticket/card with subtle depth, generous internal spacing, and restrained perforation details. The current floating stack feels like a generic modal.
3. **Unify the visual language and production states.** Render the reward art from the game’s own polished toy assets, or consistently use this illustrated style throughout all rewards. Remove the hard title shadow, reduce the button’s heavy bottom extrusion, and keep fixture codes such as `TEST-CAKE-11` out of production presentation.

**Prioritized Top 10 across the game**

| Priority | Concrete change | Why it comes first |
|---|---|---|
| **1** | Rebuild the shared head, curved portrait surface, hair cap, and curl attachments. | The character’s face is the emotional center; its current construction is the biggest quality gap. |
| **2** | Create a shared molded-plastic material and lighting setup, tuned on a neutral character turntable. | Consistent broad highlights will improve perceived quality across every model. |
| **3** | Bevel shared torso, limb, hand, shoe, and accessory geometry; smooth curved silhouettes selectively. | Fixes visible blockiness across the cast without inflating every scene mesh. |
| **4** | Introduce wardrobe slots, compatibility rules, and shared fitting anchors. | Clipping defeats both visual quality and the dress-up interaction. |
| **5** | Replace long story pages with readable, illustrated story beats. | Directly improves the central reading experience for ages 6–8. |
| **6** | Simplify hub scenery and establish distinct destination silhouettes. | Children need to recognize where to go before appreciating decorative detail. |
| **7** | Recompose tea serving around a selected guest and cup-local feedback. | Turns scattered controls into a legible action and response. |
| **8** | Standardize camera framing for title, closet, hub, and activity scenes. | Faces, outfits, and interactions should consistently occupy the useful part of the iPad viewport. |
| **9** | Standardize typography, borders, shadows, and selection states; replace core emoji with owned artwork. | Removes the generic UI layer that currently fights the custom world. |
| **10** | Add restrained idle motion and tactile response: gaze, breathing, outfit reveal, button compression, reward animation. | Adds personality once geometry, composition, and interaction are solid. |

**First implementation target:** perfect one undressed character under studio lighting, then validate it on the title and in the closet before propagating changes. Allocate extra polygons to heads, hands, hair, and close-up props; instance repeated scenery and use simpler distant meshes. A premium toy finish comes from intentional curves and readable reflections—not a globally higher polygon count.
