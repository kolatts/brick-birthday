import { describe, expect, it } from 'vitest';
import { closetItems, isUnlocked, unlockedItems, unlockThreshold } from '../../src/config/closet';

const item = (id: string) => closetItems.find((i) => i.id === id)!;

describe('closet unlocks', () => {
  it('has unlock counts between 1 and 7 and unique ids', () => {
    expect(new Set(closetItems.map((i) => i.id)).size).toBe(closetItems.length);
    for (const i of closetItems) {
      expect(i.unlockAt).toBeGreaterThanOrEqual(1);
      expect(i.unlockAt).toBeLessThanOrEqual(7);
    }
  });

  it('with all 7 bricks each item unlocks at its own count', () => {
    expect(isUnlocked(item('bow'), 0, 7)).toBe(false);
    expect(isUnlocked(item('bow'), 1, 7)).toBe(true);
    expect(isUnlocked(item('cape'), 2, 7)).toBe(false);
    expect(isUnlocked(item('cape'), 3, 7)).toBe(true);
    expect(unlockedItems(7, 7)).toHaveLength(closetItems.length);
  });

  it('scales to the adaptive goal so a small game can unlock everything', () => {
    expect(unlockThreshold(item('boots'), 3)).toBe(3);
    expect(unlockedItems(3, 3)).toHaveLength(closetItems.length);
    expect(unlockedItems(0, 3)).toHaveLength(0);
    expect(isUnlocked(item('bow'), 1, 3)).toBe(true);
    expect(isUnlocked(item('sunglasses'), 2, 3)).toBe(false);
  });

  it('is monotonic in bricks earned', () => {
    let prev = 0;
    for (let n = 0; n <= 7; n++) {
      const c = unlockedItems(n, 7).length;
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});
