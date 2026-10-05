import { registerAutoPlay } from '../../test/hooks';
import { useUi } from '../../state/ui';
import { generateStory, heroById } from './generator';
import { finishStory } from './rewards';
import { completeMovieNight } from './movie';

export { Zone } from './StoryTower';
export { Challenge } from './MovieNight';

/** Test-mode helper: finishes a story with a family hero (both bricks); finishes the challenge if on it. Store-driven, no clicks. */
registerAutoPlay('story', () => {
  const screen = useUi.getState().screen;
  if (screen.kind === 'challenge' && screen.zone === 'story') {
    completeMovieNight();
    useUi.getState().setScreen({ kind: 'hub' });
    return;
  }
  const picks = { hero: 'mom', place: 'teagarden', problem: 'teapot', power: 'giggle' };
  generateStory(picks);
  finishStory(heroById(picks.hero).kind);
});
