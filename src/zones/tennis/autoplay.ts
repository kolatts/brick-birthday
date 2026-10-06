import { useProgress } from '../../state/progress';
import { useCoupons } from '../../state/coupons';
import { useUi } from '../../state/ui';
import { GOALS } from './logic';
import { winZone } from './game';

/** Test auto-play: earns the brick (7-streak) on the zone, or finishes the 15-streak on the challenge screen. */
export function autoPlayTennis(): void {
  const { screen } = useUi.getState();
  if (screen.kind === 'challenge' && screen.zone === 'tennis') {
    useCoupons.getState().markChallengeComplete('tennis');
    useProgress.getState().patch({ rallies: Math.max(useProgress.getState().rallies, GOALS.challenge) });
    useUi.getState().setScreen({ kind: 'hub' });
    return;
  }
  if (screen.kind === 'zone' && screen.zone === 'tennis') {
    winZone(); // zone is mounted: drive the visible celebration
    return;
  }
  const pr = useProgress.getState();
  pr.patch({ rallies: Math.max(pr.rallies, GOALS.zone) });
  pr.earnBrick('tennis', 1);
}
