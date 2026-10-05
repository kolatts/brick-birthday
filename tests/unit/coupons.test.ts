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

  it('goes available -> challenge complete -> dug -> redeemed -> undo', () => {
    useProgress.getState().unlockAll();
    const c = useCoupons.getState();
    expect(c.status('icecream')).toBe('available');
    c.markChallengeComplete('woods');
    expect(useCoupons.getState().digPending('icecream')).toBe(true);
    expect(useCoupons.getState().status('icecream')).toBe('available');
    useCoupons.getState().markDug('icecream');
    expect(useCoupons.getState().status('icecream')).toBe('dug');
    expect(useCoupons.getState().digPending('icecream')).toBe(false);
    useCoupons.getState().redeem('icecream');
    expect(useCoupons.getState().status('icecream')).toBe('redeemed');
    useCoupons.getState().undoRedeem('icecream');
    expect(useCoupons.getState().status('icecream')).toBe('dug');
  });

  it('cannot redeem a coupon that was not dug up', () => {
    useProgress.getState().unlockAll();
    useCoupons.getState().redeem('movies');
    expect(useCoupons.getState().status('movies')).toBe('available');
  });

  it('never affects bricks', () => {
    const before = JSON.stringify(useProgress.getState().bricks);
    const c = useCoupons.getState();
    c.markChallengeComplete('story');
    c.markDug('movies');
    useCoupons.getState().redeem('movies');
    useCoupons.getState().undoRedeem('movies');
    useCoupons.getState().unlockAllChallenges();
    expect(JSON.stringify(useProgress.getState().bricks)).toBe(before);
    expect(useProgress.getState().goalReached()).toBe(false);
  });

  it('persists in localStorage', () => {
    useCoupons.getState().markDug('movies');
    expect(JSON.parse(localStorage.getItem('brick-birthday:coupons')!).data.dug).toContain('movies');
  });
});
