import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { EXPERIMENT_IDS, bricksFor } from './logic';
import { completeChallengeNow, finishExperiment } from './store';

/** Test auto-play: finishes all five experiments (both bricks), or the Mystery Potion challenge when on its screen. */
export function autoPlayScience(): void {
  const { screen } = useUi.getState();
  if (screen.kind === 'challenge' && screen.zone === 'science') {
    completeChallengeNow();
    return;
  }
  if (screen.kind === 'zone' && screen.zone === 'science') {
    // Zone is mounted: go through the real completion path so the celebration plays.
    for (const id of EXPERIMENT_IDS) finishExperiment(id);
    return;
  }
  const pr = useProgress.getState();
  pr.patch({ experimentsDone: [...EXPERIMENT_IDS] });
  pr.earnBrick('science', bricksFor(EXPERIMENT_IDS.length));
}
