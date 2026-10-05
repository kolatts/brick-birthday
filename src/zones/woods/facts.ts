import type { PersonId } from '../../types';

/** Short, hopeful, kid-level tree facts. Spoken after each tree grows. */
export const TREE_FACTS: string[] = [
  'Trees breathe in the air we breathe out, and they breathe out fresh oxygen for us. What a team!',
  'A big tree makes cool, comfy shade, so everybody can have a picnic on a sunny day.',
  'Trees are apartment buildings! Birds, squirrels, and bugs all make cozy homes in them.',
  'Leaves catch dusty bits floating in the air, so trees help keep our air clean.',
  'Cities with lots of trees stay cooler in summer, because trees give shade and sip water.',
  'Tree roots hold the soil tight, so the ground stays put when it rains.',
  'Trees drink rain through their roots, then let tiny drops float up to help make new clouds.',
  'One small seed can become a giant tree. And you just helped seven of them grow!',
];

export type FriendId = 'fox' | 'deer' | 'songbird' | 'squirrel' | 'rabbit';
export type GuestId = Exclude<PersonId, 'luna'> | FriendId;

export interface FriendDef {
  id: FriendId;
  name: string;
  emoji: string;
  thanks: string;
  voice: { pitch: number; rate: number };
}

export const FRIENDS: FriendDef[] = [
  { id: 'fox', name: 'Fox', emoji: '🦊', thanks: 'Thank you, Luna! My new home is perfect!', voice: { pitch: 1.6, rate: 1.1 } },
  { id: 'deer', name: 'Deer', emoji: '🦌', thanks: 'Thank you, Luna! The forest feels like home again.', voice: { pitch: 1.4, rate: 0.95 } },
  { id: 'songbird', name: 'Songbird', emoji: '🐦', thanks: 'Tweet-tweet, thank you, Luna! I will sing you a song!', voice: { pitch: 2, rate: 1.2 } },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️', thanks: 'Thank you, Luna! Now I have a place to hide my acorns!', voice: { pitch: 1.9, rate: 1.25 } },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', thanks: 'Thank you, Luna! Hop hop hooray!', voice: { pitch: 1.7, rate: 1.1 } },
];

export const friendForTree = (k: number): FriendDef => FRIENDS[((k % FRIENDS.length) + FRIENDS.length) % FRIENDS.length];
export const factForTree = (k: number): string => TREE_FACTS[((k % TREE_FACTS.length) + TREE_FACTS.length) % TREE_FACTS.length];

export const GUEST_IDS: GuestId[] = ['mom', 'dad', 'julian', 'darian', 'rudolph', 'jinglebells', 'fox', 'deer', 'songbird', 'squirrel', 'rabbit'];

export interface GuestLines {
  /** Said when tea is poured well. */
  tea: string;
  /** Said when a treat is served. */
  treat: string;
}

export const GUEST_LINES: Record<GuestId, GuestLines> = {
  mom: { tea: 'Ahh, just right!', treat: 'A story-time scone!' },
  dad: { tea: 'Chai latte? Now we are talking!', treat: 'Daddy-daughter tea party. Best date ever!' },
  julian: { tea: 'Hmm, ideal tea temperature. Scientific!', treat: 'Is this scientifically the best cookie?' },
  darian: { tea: 'Nice pour! Swish!', treat: 'Game, set, SNACK!' },
  rudolph: { tea: 'Woof! (that means thank you)', treat: 'Woof woof! (this means more please)' },
  jinglebells: { tea: 'Meow. (Warm milk would be better. Kidding.)', treat: 'Purrrfect.' },
  fox: { tea: 'Tea for a fox? Fantastic!', treat: 'Foxy fabulous!' },
  deer: { tea: 'Oh deer, this is lovely!', treat: 'Deer me, delicious!' },
  songbird: { tea: 'Tweet! Sip-sip-sing!', treat: 'Cheep cheep, crumbs for me!' },
  squirrel: { tea: 'Acorn tea? No? Even better!', treat: 'Nuts about this treat!' },
  rabbit: { tea: 'Hop-hop hooray, tea!', treat: 'Better than a carrot! Do not tell the carrots.' },
};

export const SPLASH_LINE = 'Whoa, a tea tsunami!';
export const PERFECT_LINE = 'Perfect!';
export const LOW_LINE = 'A little more, please!';
export const OK_LINE = 'Nice pour!';

export const GUEST_NAMES: Record<GuestId, string> = {
  mom: 'Mom', dad: 'Dad', julian: 'Julian', darian: 'Darian', rudolph: 'Rudolph', jinglebells: 'Jingle Bells',
  fox: 'Fox', deer: 'Deer', songbird: 'Songbird', squirrel: 'Squirrel', rabbit: 'Rabbit',
};

export const GUEST_EMOJI: Partial<Record<GuestId, string>> = Object.fromEntries(FRIENDS.map((f) => [f.id, f.emoji]));

export const PET_LINES = {
  rudolph: { caption: 'Woof woof!', sound: 'Woof!' },
  jinglebells: { caption: 'Meow~ mew!', sound: 'Meow!' },
};
