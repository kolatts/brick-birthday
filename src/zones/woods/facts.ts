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
export type GuestId = PersonId | FriendId;
/** The guests Luna actually serves: family and pets. Forest friends are auto-served. */
export type FamilyGuestId = PersonId;
export type Want = 'tea' | 'treat';

export interface FriendDef {
  id: FriendId;
  name: string;
  /** Sticker icon id (public/art/icons). */
  icon: string;
  thanks: string;
  voice: { pitch: number; rate: number };
}

export const FRIENDS: FriendDef[] = [
  { id: 'fox', name: 'Fox', icon: 'fox', thanks: 'Thank you, Luna! My new home is perfect!', voice: { pitch: 1.6, rate: 1.1 } },
  { id: 'deer', name: 'Deer', icon: 'deer', thanks: 'Thank you, Luna! The forest feels like home again.', voice: { pitch: 1.4, rate: 0.95 } },
  { id: 'songbird', name: 'Songbird', icon: 'songbird', thanks: 'Tweet-tweet, thank you, Luna! I will sing you a song!', voice: { pitch: 2, rate: 1.2 } },
  { id: 'squirrel', name: 'Squirrel', icon: 'squirrel', thanks: 'Thank you, Luna! Now I have a place to hide my acorns!', voice: { pitch: 1.9, rate: 1.25 } },
  { id: 'rabbit', name: 'Rabbit', icon: 'rabbit', thanks: 'Thank you, Luna! Hop hop hooray!', voice: { pitch: 1.7, rate: 1.1 } },
];

export const friendForTree = (k: number): FriendDef => FRIENDS[((k % FRIENDS.length) + FRIENDS.length) % FRIENDS.length];
export const factForTree = (k: number): string => TREE_FACTS[((k % TREE_FACTS.length) + TREE_FACTS.length) % TREE_FACTS.length];

export const FAMILY_GUESTS: FamilyGuestId[] = ['luna', 'mom', 'dad', 'julian', 'darian', 'rudolph', 'jinglebells'];
export const GUEST_IDS: GuestId[] = [...FAMILY_GUESTS, ...FRIENDS.map((f) => f.id)];

/** Each family guest needs exactly ONE thing: tea or a treat (fixed, so it is easy to read). */
export const GUEST_WANTS: Record<FamilyGuestId, Want> = {
  luna: 'treat', mom: 'tea', dad: 'tea', julian: 'treat', darian: 'treat', rudolph: 'treat', jinglebells: 'tea',
};
export const isFamilyGuest = (g: GuestId): g is FamilyGuestId => (FAMILY_GUESTS as GuestId[]).includes(g);

export interface GuestLines {
  /** Said when tea is poured well. */
  tea: string;
  /** Said when a treat is served. */
  treat: string;
}

export const GUEST_LINES: Record<FamilyGuestId, GuestLines> = {
  luna: { tea: 'Mmm, tea for the host too!', treat: 'A treat for the host? Yes, please!' },
  mom: { tea: 'Ahh, just right!', treat: 'A story-time scone!' },
  dad: { tea: 'Chai latte? Now we are talking!', treat: 'Daddy-daughter tea party. Best date ever!' },
  julian: { tea: 'Hmm, ideal tea temperature. Scientific!', treat: 'Is this scientifically the best cookie?' },
  darian: { tea: 'Nice pour! Swish!', treat: 'Game, set, SNACK!' },
  rudolph: { tea: 'Woof! (that means thank you)', treat: 'Woof woof! (this means more please)' },
  jinglebells: { tea: 'Meow. (Warm milk would be better. Kidding.)', treat: 'Purrrfect.' },
};

/** The forest friends are served all at once when the last family guest is happy. */
export const FRIENDS_THANKS_LINE = 'The forest friends say thank you!';

export const SPLASH_LINE = 'Whoa, a tea tsunami!';
export const PERFECT_LINE = 'Perfect!';
export const LOW_LINE = 'A little more, please!';
export const OK_LINE = 'Nice pour!';

export const GUEST_NAMES: Record<GuestId, string> = {
  luna: 'Luna', mom: 'Mom', dad: 'Dad', julian: 'Julian', darian: 'Darian', rudolph: 'Rudolph', jinglebells: 'Jingle Bells',
  fox: 'Fox', deer: 'Deer', songbird: 'Songbird', squirrel: 'Squirrel', rabbit: 'Rabbit',
};

export const GUEST_ICON: Partial<Record<GuestId, string>> = Object.fromEntries(FRIENDS.map((f) => [f.id, f.icon]));

export const PET_LINES = {
  rudolph: { caption: 'Woof woof!', sound: 'Woof!' },
  jinglebells: { caption: 'Meow~ mew!', sound: 'Meow!' },
};
