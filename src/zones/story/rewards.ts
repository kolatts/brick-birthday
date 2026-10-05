import { useProgress } from '../../state/progress';
import type { HeroKind } from './options';

export interface FinishResult {
  /** Bricks earned by this finish (0, 1 or 2). */
  earned: number;
}

/**
 * Called when a story finishes narrating. Brick 1 = first finished story,
 * Brick 2 = a story starring a family member or pet (not a cameo).
 */
export function finishStory(heroKind: HeroKind): FinishResult {
  const p = useProgress.getState();
  let earned = 0;
  if (p.bricks.story < 1) {
    p.earnBrick('story', 1);
    earned++;
  }
  if (heroKind !== 'cameo' && useProgress.getState().bricks.story < 2) {
    useProgress.getState().earnBrick('story', 1);
    earned++;
  }
  useProgress.getState().patch({
    storiesFinished: p.storiesFinished + 1,
    familyHeroStoryDone: p.familyHeroStoryDone || heroKind !== 'cameo',
  });
  return { earned };
}
