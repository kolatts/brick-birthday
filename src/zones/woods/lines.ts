import { FRIENDS, GUEST_IDS, GUEST_LINES, PET_LINES, SPLASH_LINE, TREE_FACTS } from './facts';
import { CHALLENGE_DONE_LINE, HAPPY_LINES, ORDERS, WRONG_LINES } from './logic';

export interface Line { speaker: string; text: string }

/** Every static line the Woods speaks aloud (auto-discovered by voices:extract). */
export const lines: Line[] = [
  ...TREE_FACTS.map((text) => ({ speaker: 'narrator', text })),
  ...FRIENDS.map((f) => ({ speaker: f.id, text: f.thanks })),
  { speaker: 'rudolph', text: PET_LINES.rudolph.sound },
  { speaker: 'jinglebells', text: PET_LINES.jinglebells.sound },
  ...GUEST_IDS.flatMap((g) => [
    { speaker: g, text: GUEST_LINES[g].tea },
    { speaker: g, text: GUEST_LINES[g].treat },
    { speaker: g, text: SPLASH_LINE },
  ]),
  { speaker: 'luna', text: 'Another tea party!' },
  ...ORDERS.flatMap((o, i) => [
    { speaker: o.guest, text: o.line },
    ...WRONG_LINES.map((text) => ({ speaker: o.guest, text })),
    { speaker: o.guest, text: HAPPY_LINES[i % HAPPY_LINES.length] },
  ]),
  { speaker: 'narrator', text: CHALLENGE_DONE_LINE },
];
