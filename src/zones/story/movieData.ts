export interface Scene {
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
      { icon: '🌙', line: 'The Moon was too sleepy to come up at night.' },
      { icon: '🎶', line: 'Luna sang a soft lullaby and played a tiny piano.' },
      { icon: '🥱', line: 'The Moon stretched, yawned, and rolled out of bed.' },
      { icon: '🌟', line: 'The whole sky glowed, and every star said thank you.' },
    ],
  },
  {
    id: 'tea-party-rescue',
    title: 'The Great Tea Party',
    scenes: [
      { icon: '🫖', line: 'Luna invited all her friends to a fancy tea party.' },
      { icon: '🫗', line: 'The teapot hiccuped and poured glitter everywhere!' },
      { icon: '🧹', line: 'Rudolph and Jingle Bells helped sweep up the sparkles.' },
      { icon: '🎉', line: 'Glitter tea became everyone\'s favorite, and the party sparkled on.' },
    ],
  },
  {
    id: 'puppy-wish',
    title: 'The Puppy Cloud',
    scenes: [
      { icon: '🐶', line: 'Luna made a wish for a tiny fluffy puppy.' },
      { icon: '☁️', line: 'A puppy-shaped cloud floated down to say hello.' },
      { icon: '🎾', line: 'They played tennis with a bouncy star-ball.' },
      { icon: '😴', line: 'The cloud waved goodbye, and Luna fell asleep with a smile.' },
    ],
  },
];

