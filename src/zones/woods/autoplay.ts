import { useProgress } from '../../state/progress';
import { useCoupons } from '../../state/coupons';
import { useUi } from '../../state/ui';
import { finishTeaParty, growAllTrees, serveAll, TREE_COUNT } from './woodsState';

/** Marks the Tea Party Orders challenge done and returns to the hub (dig spot appears there). */
export function completeOrdersChallenge(): void {
  useCoupons.getState().markChallengeComplete('woods');
  useUi.getState().setScreen({ kind: 'hub' });
}

/** Test auto-play: finishes the Woods (or its challenge when on the challenge screen). */
export function autoPlayWoods(): void {
  const { screen } = useUi.getState();
  if (screen.kind === 'challenge' && screen.zone === 'woods') {
    completeOrdersChallenge();
    return;
  }
  const pr = useProgress.getState();
  if (screen.kind === 'zone' && screen.zone === 'woods') {
    // Zone is mounted: drive the visible scene so the celebration plays.
    growAllTrees();
    serveAll();
    finishTeaParty();
    return;
  }
  pr.patch({ treesPlanted: TREE_COUNT, teaPartyDone: true });
  pr.earnBrick('woods', 1);
}
