import { useCoupons } from '../../state/coupons';
import { mulberry32 } from './generator';

import { movieStories, type MovieStory } from './movieData';
export { movieStories };
export type { MovieStory };

export const SCENE_COUNT = 4;
export const STORIES_NEEDED = 3;

/** A shuffle of [0,1,2,3] that is never already in order. */
export function shuffleOrder(seed: number): number[] {
  const rnd = mulberry32(seed);
  const a = [0, 1, 2, 3];
  for (let tries = 0; tries < 20; tries++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.some((v, i) => v !== i)) return a;
  }
  return [1, 0, 3, 2];
}

/** `placed` holds scene indices (correct-order positions) as Luna put them in the 4 slots. */
export function isCorrectOrder(placed: (number | null)[]): boolean {
  return placed.length === SCENE_COUNT && placed.every((v, i) => v === i);
}

export function narrationFor(story: MovieStory, placed: number[]): string[] {
  return placed.map((i) => story.scenes[i].line);
}

/** Marks the challenge done (coupon dig spot appears). Pure store call, used by UI and autoPlay. */
export function completeMovieNight(): void {
  useCoupons.getState().markChallengeComplete('story');
}
