import type { PersonId, ZoneId } from '../types';

export interface Avatar {
  bodyColor: string;
  outfitColor: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  accessory: string;
}

export interface Person {
  id: PersonId;
  displayName: string;
  role: string;
  hostZone: ZoneId | null;
  avatar: Avatar;
  voice: { pitch: number; rate: number };
  birthDate?: string;
  /** Description of real features (from photos) used for portraits and design. */
  notes: string;
}

export const family: Record<PersonId, Person> = {
  luna: {
    id: 'luna',
    displayName: 'Luna',
    role: 'player',
    hostZone: null,
    birthDate: '2019-10-16',
    avatar: { bodyColor: '#FF5CA8', outfitColor: '#FF5CA8', hairStyle: 'wavy-pulled-back', hairColor: '#3B2418', skinTone: '#B98259', accessory: 'sparkly silver tiara' },
    voice: { pitch: 1.5, rate: 1.0 },
    notes: 'Warm medium tan skin, dark brown eyes, dark brown wavy hair often pulled back. Loves pink, red and blue.',
  },
  mom: {
    id: 'mom',
    displayName: 'Mom',
    role: 'mom (Brandy)',
    hostZone: 'story',
    avatar: { bodyColor: '#E63946', outfitColor: '#E63946', hairStyle: 'long-straight', hairColor: '#3B2418', skinTone: '#F5D5BD', accessory: 'sunglasses on head' },
    voice: { pitch: 1.2, rate: 0.95 },
    notes: 'Fair skin, long straight dark brown hair, warm smile, sunglasses often on head.',
  },
  dad: {
    id: 'dad',
    displayName: 'Dad',
    role: 'dad',
    hostZone: 'music',
    avatar: { bodyColor: '#3A86FF', outfitColor: '#3A86FF', hairStyle: 'bald', hairColor: '#2B1B12', skinTone: '#6B4226', accessory: 'guitar' },
    voice: { pitch: 0.7, rate: 0.9 },
    notes: 'Brown skin, bald/shaved head, short dark beard with a bit of gray, big smile. Plays guitar.',
  },
  julian: {
    id: 'julian',
    displayName: 'Julian',
    role: 'older brother',
    hostZone: 'science',
    avatar: { bodyColor: '#7AE582', outfitColor: '#7AE582', hairStyle: 'wavy-short', hairColor: '#A47B52', skinTone: '#F5D5BD', accessory: 'lab goggles' },
    voice: { pitch: 1.0, rate: 1.05 },
    notes: 'Fair skin, light brown wavy hair, small earring, sunglasses on head.',
  },
  darian: {
    id: 'darian',
    displayName: 'Darian',
    role: 'older brother',
    hostZone: 'tennis',
    avatar: { bodyColor: '#FFD60A', outfitColor: '#FFD60A', hairStyle: 'curly-fluffy', hairColor: '#3B2418', skinTone: '#F5D5BD', accessory: 'tennis visor' },
    voice: { pitch: 0.95, rate: 1.1 },
    notes: 'Fair skin, dark brown fluffy curly hair, friendly grin.',
  },
  rudolph: {
    id: 'rudolph',
    displayName: 'Rudolph',
    role: 'dog',
    hostZone: 'woods',
    avatar: { bodyColor: '#9AA0A6', outfitColor: '#C8A97E', hairStyle: 'double-coat', hairColor: '#9AA0A6', skinTone: '#C8A97E', accessory: 'curled fluffy tail' },
    voice: { pitch: 1.3, rate: 1.0 },
    notes: 'Gray-and-tan thick double coat, pointy black-tipped ears, curled fluffy tail, dark eyes. Looks like a Norwegian Elkhound.',
  },
  jinglebells: {
    id: 'jinglebells',
    displayName: 'Jingle Bells',
    role: 'cat',
    hostZone: 'woods',
    avatar: { bodyColor: '#3A2A22', outfitColor: '#8A5A2B', hairStyle: 'long-haired', hairColor: '#2A1E1A', skinTone: '#3A2A22', accessory: 'jingle bell collar' },
    voice: { pitch: 1.8, rate: 1.1 },
    notes: 'Fluffy dark tortoiseshell (black and brown mottled) long-haired cat, green-gold eyes.',
  },
};

export const people: Person[] = Object.values(family);

/** Daddy's note on the title screen. Spoken by `dad` (registered in src/config/copy.ts). */
export const welcomeMessage = {
  heading: 'A note from Daddy',
  body: "Luna, I am so very proud of your creativity, your kindness, and your ambition. I can't wait to see the mark you make on the world.",
  signoff: 'Love, Daddy',
  explainer: 'Beat the minigames to earn Daddy-Daughter Date coupons!',
} as const;

export const finaleMessage = 'TODO: message from Mom and Dad';

export const lunaFacts = {
  loves: ['storytelling', 'science', 'tennis', 'piano and drums', 'tea time (chai lattes)', 'magic', 'dress-up', 'orange chicken'],
  hates: ['forests being cut down', 'broccoli and most vegetables', 'chicken noodle soup'],
  wants: 'a Yorkshire terrier (has to sleep in her own room a month first)',
  pets: { cat: 'Jingle Bells', dog: 'Rudolph' },
  favoriteColors: ['pink', 'red', 'blue'],
  cameos: {
    princessMoon: 'Princess Moon: half fairy, half mermaid, with gold wings, a silver tail, and pink hair',
    babyLady: 'Baby Lady: her small, fluffy dog sister',
    babyJagCottontail: 'Baby Jag Cottontail: a yellow jaguar with black spots and pink hair',
  },
};
