import { beforeEach, describe, expect, it } from 'vitest';
import { useCoupons } from '../../src/state/coupons';
import { useProgress } from '../../src/state/progress';

beforeEach(() => {
  useProgress.getState().reset();
  useCoupons.getState().reset();
});

describe('coupon state machine', () => {
  it('is locked until the zone bricks are complete', () => {
    expect(useCoupons.getState().status('movies')).toBe('locked');
    useProgress.getState().earnBrick('story', 1);
    expect(useCoupons.getState().status('movies')).toBe('locked');
    useProgress.getState().earnBrick('story', 1);
    expect(useCoupons.getState().status('movies')).toBe('available');
  });

  it('goes available -> challenge complete -> dug', () => {
    useProgress.getState().unlockAll();
    const c = useCoupons.getState();
    expect(c.status('icecream')).toBe('available');
    c.markChallengeComplete('woods');
    expect(useCoupons.getState().digPending('icecream')).toBe(true);
    expect(useCoupons.getState().status('icecream')).toBe('available');
    useCoupons.getState().markDug('icecream');
    expect(useCoupons.getState().status('icecream')).toBe('dug');
    expect(useCoupons.getState().digPending('icecream')).toBe(false);
  });

  it('never affects bricks', () => {
    const before = JSON.stringify(useProgress.getState().bricks);
    const c = useCoupons.getState();
    c.markChallengeComplete('story');
    c.markDug('movies');
    useCoupons.getState().unlockAllChallenges();
    expect(JSON.stringify(useProgress.getState().bricks)).toBe(before);
    expect(useProgress.getState().goalReached()).toBe(false);
  });

  it('persists in localStorage', () => {
    useCoupons.getState().markDug('movies');
    expect(JSON.parse(localStorage.getItem('brick-birthday:coupons')!).data.dug).toContain('movies');
  });
});
