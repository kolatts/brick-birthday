import { FAMILY_GUESTS, FRIENDS, FRIENDS_THANKS_LINE, GUEST_LINES, GUEST_WANTS, PET_LINES, SPLASH_LINE, TREE_FACTS } from './facts';
import { CHALLENGE_DONE_LINE, HAPPY_LINES, ORDERS, WRONG_LINES } from './logic';

export interface Line { speaker: string; text: string }

/** Every static line the Woods speaks aloud (auto-discovered by voices:extract). */
export const lines: Line[] = [
  ...TREE_FACTS.map((text) => ({ speaker: 'narrator', text })),
  ...FRIENDS.map((f) => ({ speaker: f.id, text: f.thanks })),
  { speaker: 'rudolph', text: PET_LINES.rudolph.sound },
  { speaker: 'jinglebells', text: PET_LINES.jinglebells.sound },
  // Each family guest only ever says the line for the one thing they want (plus the splash if it is tea).
  ...FAMILY_GUESTS.flatMap((g) => [
    { speaker: g, text: GUEST_LINES[g][GUEST_WANTS[g]] },
    ...(GUEST_WANTS[g] === 'tea' ? [{ speaker: g, text: SPLASH_LINE }] : []),
  ]),
  { speaker: 'narrator', text: FRIENDS_THANKS_LINE },
  { speaker: 'luna', text: 'Another tea party!' },
  ...ORDERS.flatMap((o, i) => [
    { speaker: o.guest, text: o.line },
    ...WRONG_LINES.map((text) => ({ speaker: o.guest, text })),
    { speaker: o.guest, text: HAPPY_LINES[i % HAPPY_LINES.length] },
  ]),
  { speaker: 'narrator', text: CHALLENGE_DONE_LINE },
];
