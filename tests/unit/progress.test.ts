import { beforeEach, describe, expect, it } from 'vitest';
import { PROGRESS_KEY, defaultProgress, load, migrate, useProgress } from '../../src/state/progress';
import { brickGoal, builtZones, zones } from '../../src/config/zones';

beforeEach(() => {
  useProgress.getState().reset();
});

describe('progress store', () => {
  it('clamps bricks to the zone max', () => {
    const s = useProgress.getState();
    s.earnBrick('tennis', 5);
    expect(useProgress.getState().bricks.tennis).toBe(zones.tennis.bricks);
    s.earnBrick('story', 1);
    s.earnBrick('story', 1);
    s.earnBrick('story', 1);
    expect(useProgress.getState().bricks.story).toBe(2);
    s.earnBrick('story', -10);
    expect(useProgress.getState().bricks.story).toBe(0);
  });

  it('brickGoal counts only built zones', () => {
    const expected = builtZones().reduce((n, z) => n + z.bricks, 0);
    expect(brickGoal()).toBe(expected);
    expect(brickGoal()).toBe(7); // story 2 + science 2 + tennis 1 + music 1 + woods 1
  });

  it('goalReached once all built-zone bricks are earned', () => {
    const s = useProgress.getState();
    expect(s.goalReached()).toBe(false);
    s.earnBrick('story', 2);
    s.earnBrick('science', 2);
    s.earnBrick('tennis', 1);
    s.earnBrick('music', 1);
    expect(useProgress.getState().goalReached()).toBe(false);
    s.earnBrick('woods', 1);
    expect(useProgress.getState().goalReached()).toBe(true);
    expect(useProgress.getState().totalBricks()).toBe(7);
  });

  it('unlockAll fills built zones; reset clears', () => {
    useProgress.getState().unlockAll();
    expect(useProgress.getState().goalReached()).toBe(true);
    useProgress.getState().reset();
    expect(useProgress.getState().totalBricks()).toBe(0);
  });

  it('persists to localStorage with version 1', () => {
    useProgress.getState().earnBrick('story', 1);
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)!);
    expect(saved.version).toBe(1);
    expect(load().bricks.story).toBe(1);
  });
});

describe('load / migrate', () => {
  it('returns defaults when nothing is stored', () => {
    expect(load()).toEqual(defaultProgress());
  });
  it('returns defaults for corrupt JSON', () => {
    localStorage.setItem(PROGRESS_KEY, '{not json');
    expect(load()).toEqual(defaultProgress());
  });
  it('returns defaults for wrong version', () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: 99, data: defaultProgress() }));
    expect(load()).toEqual(defaultProgress());
  });
  it.each([
    ['null', null],
    ['array', []],
    ['string', 'hi'],
    ['no data', { version: 1 }],
    ['bad bricks', { version: 1, data: { ...defaultProgress(), bricks: { story: 'x' } } }],
    ['bad field type', { version: 1, data: { ...defaultProgress(), treesPlanted: 'many' } }],
    ['negative', { version: 1, data: { ...defaultProgress(), rallies: -3 } }],
  ])('migrate falls back to defaults for %s', (_n, raw) => {
    expect(migrate(raw)).toEqual(defaultProgress());
  });
  it('accepts a valid save and clamps over-large bricks', () => {
    const data = { ...defaultProgress(), bricks: { ...defaultProgress().bricks, story: 99 }, treesPlanted: 4 };
    const out = migrate({ version: 1, data });
    expect(out.bricks.story).toBe(2);
    expect(out.treesPlanted).toBe(4);
  });
});
