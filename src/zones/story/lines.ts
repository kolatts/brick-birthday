import { bonusSentences } from './options';
import { allStaticFragments, allTitleFragments } from './generator';
import { movieStories } from './movieData';

/** Every line the Story Tower speaks, shared between the UI and the voice clip registry. */
export const MOM_GREETING = "Hi Luna! Let's build a story together.";
export const MOM_STEP_LINES = [
  'Who is our hero today?',
  'Where does our story happen?',
  'Ooh! What silly thing happens?',
  'And what magic power saves the day?',
] as const;
export const MOM_READY = 'Wonderful picks! Ready to hear it?';
export const MOM_AGAIN = 'Again! Who is our hero this time?';
export const MOM_MOVIE_INTRO = 'Movie night! Put the pictures in order: first, middle, middle, last.';
export const MOM_MOVIE_DONE = 'You did it! Something is buried near the Story Tower!';
export const MOM_MOVIE_CHEER = 'Bravo! What a movie! Ready for the next one?';
export const MOM_MOVIE_SILLY = 'Wait... that is not right!';
export const MOM_MOVIE_RETRY = 'Silly movie! Try again, you can do it!';
export const MOM_MOVIE_NEXT = 'Here comes the next story!';

const mom = (text: string) => ({ speaker: 'mom' as const, text });

export const lines: { speaker: 'mom' | 'narrator'; text: string }[] = [
  mom(`${MOM_GREETING} ${MOM_STEP_LINES[0]}`),
  ...MOM_STEP_LINES.map(mom),
  mom(MOM_READY),
  mom(MOM_AGAIN),
  mom(MOM_MOVIE_INTRO),
  mom(MOM_MOVIE_DONE),
  mom(MOM_MOVIE_CHEER),
  mom(MOM_MOVIE_SILLY),
  mom(MOM_MOVIE_RETRY),
  mom(MOM_MOVIE_NEXT),
  ...movieStories.flatMap((s) => s.scenes.map((sc) => mom(sc.line))),
  ...bonusSentences.map((text) => ({ speaker: 'narrator' as const, text })),
  ...allStaticFragments().map((f) => ({ speaker: 'narrator' as const, text: f.text })),
  ...allTitleFragments().map((f) => ({ speaker: 'narrator' as const, text: f.text })),
];
