export interface Scene {
  /** Sticker icon id (public/art/icons). */
  icon: string;
  line: string;
}

export interface MovieStory {
  id: string;
  title: string;
  /** In correct order: beginning, middle, middle, end. */
  scenes: [Scene, Scene, Scene, Scene];
}

export const movieStories: MovieStory[] = [
  {
    id: 'sleepy-moon',
    title: 'The Sleepy Moon',
    scenes: [
      { icon: 'moon', line: 'The Moon was too sleepy to come up at night.' },
      { icon: 'music-notes', line: 'Luna sang a soft lullaby and played a tiny piano.' },
      { icon: 'yawn', line: 'The Moon stretched, yawned, and rolled out of bed.' },
      { icon: 'star', line: 'The whole sky glowed, and every star said thank you.' },
    ],
  },
  {
    id: 'tea-party-rescue',
    title: 'The Great Tea Party',
    scenes: [
      { icon: 'teapot', line: 'Luna invited all her friends to a fancy tea party.' },
      { icon: 'glitter-pour', line: 'The teapot hiccuped and poured glitter everywhere!' },
      { icon: 'broom', line: 'Rudolph and Jingle Bells helped sweep up the sparkles.' },
      { icon: 'party-popper', line: 'Glitter tea became everyone\'s favorite, and the party sparkled on.' },
    ],
  },
  {
    id: 'puppy-wish',
    title: 'The Puppy Cloud',
    scenes: [
      { icon: 'puppy', line: 'Luna made a wish for a tiny fluffy puppy.' },
      { icon: 'cloud', line: 'A puppy-shaped cloud floated down to say hello.' },
      { icon: 'tennis-ball', line: 'They played tennis with a bouncy star-ball.' },
      { icon: 'sleep', line: 'The cloud waved goodbye, and Luna fell asleep with a smile.' },
    ],
  },
];

