import { describe, expect, it } from 'vitest';
import {
  LEVEL_OK_MIN, LEVEL_PERFECT_MAX, LEVEL_PERFECT_MIN, ORDERS, POUR_SECONDS, checkPlate, checkSundae, judgePour, levelAt,
} from '../../src/zones/woods/logic';
import { FAMILY_GUESTS, FRIENDS, FRIENDS_THANKS_LINE, GUEST_IDS, GUEST_LINES, GUEST_NAMES, GUEST_WANTS, TREE_FACTS, SPLASH_LINE } from '../../src/zones/woods/facts';
import { guestsFor, isServed, servedGuests, useWoods } from '../../src/zones/woods/woodsState';
import { useProgress } from '../../src/state/progress';

describe('tea pouring', () => {
  it('maps hold time to a clamped level', () => {
    expect(levelAt(0)).toBe(0);
    expect(levelAt(POUR_SECONDS)).toBeCloseTo(1);
    expect(levelAt(99)).toBeLessThanOrEqual(1.4);
  });
  it('judges thresholds', () => {
    expect(judgePour(0.1)).toBe('low');
    expect(judgePour(LEVEL_OK_MIN)).toBe('ok');
    expect(judgePour(LEVEL_PERFECT_MIN - 0.01)).toBe('ok');
    expect(judgePour(LEVEL_PERFECT_MIN)).toBe('perfect');
    expect(judgePour(LEVEL_PERFECT_MAX)).toBe('perfect');
    expect(judgePour(0.99)).toBe('ok');
    expect(judgePour(1)).toBe('splash');
    expect(judgePour(1.3)).toBe('splash');
  });
});

describe('orders', () => {
  it('has 5 orders and the last is a sundae', () => {
    expect(ORDERS).toHaveLength(5);
    expect(ORDERS[4].kind).toBe('sundae');
  });
  it('checks plates as multisets in any tapping order', () => {
    expect(checkPlate(['sugar', 'sugar', 'cake'], ['cake', 'sugar', 'sugar'])).toBe(true);
    expect(checkPlate(['sugar', 'sugar', 'cake'], ['sugar', 'cake'])).toBe(false);
    expect(checkPlate(['sugar', 'sugar', 'cake'], ['sugar', 'cake', 'cake'])).toBe(false);
    expect(checkPlate(['scone', 'honey'], [])).toBe(false);
  });
  it('checks sundae scoop order and cherry', () => {
    const o = ORDERS[4];
    if (o.kind !== 'sundae') throw new Error('expected sundae');
    expect(checkSundae(o, { scoops: [...o.scoops], cherry: true })).toBe(true);
    expect(checkSundae(o, { scoops: [...o.scoops], cherry: false })).toBe(false);
    expect(checkSundae(o, { scoops: [...o.scoops].reverse(), cherry: true })).toBe(false);
    expect(checkSundae(o, { scoops: o.scoops.slice(0, 2), cherry: true })).toBe(false);
  });
  it('every order is solvable by its own items', () => {
    for (const o of ORDERS) {
      if (o.kind === 'plate') expect(checkPlate(o.items, [...o.items])).toBe(true);
    }
  });
});

describe('copy', () => {
  it('has at least 7 tree facts, none with TODO', () => {
    expect(TREE_FACTS.length).toBeGreaterThanOrEqual(7);
    for (const f of TREE_FACTS) {
      expect(f.length).toBeGreaterThan(10);
      expect(f).not.toMatch(/TODO|undefined/);
    }
  });
  it('every family guest has a tea and treat reaction and a name; every guest has a name', () => {
    for (const id of FAMILY_GUESTS) {
      expect(GUEST_LINES[id].tea.length).toBeGreaterThan(3);
      expect(GUEST_LINES[id].treat.length).toBeGreaterThan(3);
    }
    for (const id of GUEST_IDS) expect(GUEST_NAMES[id]).toBeTruthy();
    expect(SPLASH_LINE).toBe('Whoa, a tea tsunami!');
    expect(GUEST_LINES.dad.tea).toMatch(/Chai latte/);
    expect(GUEST_LINES.darian.treat).toMatch(/SNACK/);
    expect(JSON.stringify(GUEST_LINES)).not.toMatch(/broccoli/i);
    expect(FRIENDS_THANKS_LINE).toBe('The forest friends say thank you!');
  });
});

describe('tea party guests', () => {
  it('serves only family and pets, each wanting exactly one thing', () => {
    expect(servedGuests()).toEqual(['luna', 'mom', 'dad', 'julian', 'darian', 'rudolph', 'jinglebells']);
    for (const g of servedGuests()) expect(['tea', 'treat']).toContain(GUEST_WANTS[g]);
    expect(['dad', 'mom', 'jinglebells'].map((g) => GUEST_WANTS[g as 'dad'])).toEqual(['tea', 'tea', 'tea']);
    expect(['julian', 'darian', 'rudolph', 'luna'].map((g) => GUEST_WANTS[g as 'luna'])).toEqual(['treat', 'treat', 'treat', 'treat']);
  });
  it('seats one forest friend per returned tree, but they are never served by hand', () => {
    expect(guestsFor(7)).toHaveLength(7 + FRIENDS.length);
    expect(guestsFor(1)).toHaveLength(8);
    for (const g of guestsFor(7)) expect(GUEST_IDS).toContain(g);
    expect(servedGuests().some((g) => FRIENDS.some((f) => f.id === (g as string)))).toBe(false);
  });
  it('a guest is served once they have their one thing', () => {
    useWoods.setState({ tea: {}, treat: {} });
    expect(isServed('dad')).toBe(false);
    useWoods.setState({ treat: { dad: true } }); // a treat does not serve a tea guest
    expect(isServed('dad')).toBe(false);
    useWoods.setState({ tea: { dad: true } });
    expect(isServed('dad')).toBe(true);
    expect(isServed('fox')).toBe(false);
    useWoods.setState({ tea: {}, treat: {} });
  });
});

describe('progress actions', () => {
  it('plantTree caps at 7 and setTeaPartyDone persists', () => {
    useProgress.getState().reset();
    for (let i = 0; i < 9; i++) useProgress.getState().plantTree();
    expect(useProgress.getState().treesPlanted).toBe(7);
    useProgress.getState().setTeaPartyDone();
    expect(useProgress.getState().teaPartyDone).toBe(true);
    useProgress.getState().reset();
  });
});
