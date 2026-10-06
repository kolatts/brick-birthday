export interface Line { speaker: string; text: string }

export const GOAL = 'Earn a Birthday Brick: play all four instruments';

export const WELCOME = 'Hi Luna! Welcome to the Music Stage. Tap the pads and make some music!';
export const FOLLOW_START = 'Follow the glowing keys, Luna. Tap the lit one!';
export const BRICK_LINE = 'You earned a Birthday Brick! The whole band is so proud of you!';

/** The family member who joins the band the first time Luna plays an instrument. */
export const JOIN_LINES: { id: string; speaker: string; text: string }[] = [
  { id: 'drums', speaker: 'darian', text: 'Boom boom! I am on the drums!' },
  { id: 'keyboard', speaker: 'julian', text: 'Cool keys, Luna! I am on the keyboard!' },
  { id: 'guitar', speaker: 'mom', text: 'Strum strum! I have my tambourine!' },
  { id: 'xylophone', speaker: 'rudolph', text: 'Woof woof! We love the xylophone!' },
];

export const SONG_DONE: Record<string, string> = {
  happy: 'Happy birthday to you! That was beautiful, Luna!',
  island: 'You hopped all the way across Island Hop!',
  tea: 'What a lovely Tea Time Twirl!',
};

/** Every static line the Music Stage speaks aloud (auto-discovered by voices:extract). */
export const lines: Line[] = [
  { speaker: 'dad', text: WELCOME },
  { speaker: 'dad', text: FOLLOW_START },
  { speaker: 'dad', text: BRICK_LINE },
  ...JOIN_LINES.map(({ speaker, text }) => ({ speaker, text })),
  ...Object.values(SONG_DONE).map((text) => ({ speaker: 'dad', text })),
];
