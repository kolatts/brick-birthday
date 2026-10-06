import { describe, expect, it } from 'vitest';
import {
  EXPERIMENT_IDS, FLOAT_ITEMS, INGREDIENTS, MAX_FUEL, TARGETS, bricksFor, completeExperiment, matchesTarget, mix, pickTargets, rocketHeight, seedSprouts,
  targetResult, type Ingredient,
} from '../../src/zones/science/logic';
import { lines } from '../../src/zones/science/lines';
import { isSpeakerId } from '../../src/config/voices';

describe('mix rules', () => {
  it('follows the simple color rules', () => {
    expect(mix(['red', 'blue']).hue).toBe('purple');
    expect(mix(['blue', 'yellow']).hue).toBe('green');
    expect(mix(['red', 'yellow']).hue).toBe('orange');
    expect(mix(['red', 'blue', 'yellow']).hue).toBe('muddy');
  });
  it('white makes pastel and glitter makes sparkly, in any order', () => {
    expect(mix(['red', 'white']).pastel).toBe(true);
    expect(mix(['white', 'red']).key).toBe(mix(['red', 'white']).key);
    expect(mix(['red', 'blue', 'glitter']).sparkly).toBe(true);
    expect(mix(['white']).pastel).toBe(false);
    expect(mix(['red']).sparkly).toBe(false);
  });
  it('every target is solvable by its recipe and not by a wrong mix', () => {
    for (const t of TARGETS) {
      expect(matchesTarget(t.recipe, t)).toBe(true);
      expect(matchesTarget([...t.recipe].reverse(), t)).toBe(true);
      const extra = INGREDIENTS.map((i) => i.id).filter((i): i is Ingredient => !t.recipe.includes(i));
      for (const e of extra) expect(matchesTarget([...t.recipe, e], t)).toBe(false);
      expect(matchesTarget([], t)).toBe(false);
    }
  });
  it('picks three increasingly fancy targets', () => {
    const t = pickTargets(() => 0.5);
    expect(t.map((x) => x.tier)).toEqual([1, 2, 3]);
    expect(t.every((x) => targetResult(x).key !== 'empty')).toBe(true);
  });
});

describe('experiment progression', () => {
  it('bricks unlock at 2 and 5 distinct experiments', () => {
    expect([0, 1, 2, 3, 4, 5].map(bricksFor)).toEqual([0, 0, 1, 1, 1, 2]);
  });
  it('earns a brick on the 2nd and 5th distinct experiment, never on replays', () => {
    let done: string[] = [];
    let held = 0;
    const gains: number[] = [];
    for (const id of [...EXPERIMENT_IDS, 'potion' as const, 'seed' as const]) {
      const r = completeExperiment(done, id, held);
      done = r.done;
      held += r.gained;
      gains.push(r.gained);
    }
    expect(gains).toEqual([0, 1, 0, 0, 1, 0, 0]);
    expect(held).toBe(2);
    expect(done).toHaveLength(5);
  });
  it('replaying one experiment many times never earns a brick', () => {
    let done: string[] = [];
    let held = 0;
    for (let i = 0; i < 5; i++) {
      const r = completeExperiment(done, 'potion', held);
      done = r.done;
      held += r.gained;
    }
    expect(held).toBe(0);
  });
});

describe('experiment rules', () => {
  it('more fuel always goes higher', () => {
    for (let f = 1; f < MAX_FUEL; f++) expect(rocketHeight(f + 1)).toBeGreaterThan(rocketHeight(f));
  });
  it('sink or float has both outcomes and a density why', () => {
    expect(FLOAT_ITEMS.some((i) => i.floats)).toBe(true);
    expect(FLOAT_ITEMS.some((i) => !i.floats)).toBe(true);
    for (const i of FLOAT_ITEMS) expect(i.why.length).toBeGreaterThan(20);
  });
  it('a seed sprouts only with water, light and soil', () => {
    expect(seedSprouts(['water', 'light'])).toBe(false);
    expect(seedSprouts(['soil', 'light', 'water'])).toBe(true);
  });
});

describe('science lines', () => {
  it('has real, voiceable lines', () => {
    expect(lines.length).toBeGreaterThan(40);
    for (const l of lines) {
      expect(l.text).not.toMatch(/TODO|undefined|null|\[object/i);
      expect(l.text.trim().length).toBeGreaterThan(3);
      expect(isSpeakerId(l.speaker)).toBe(true);
    }
  });
  it('has no duplicate lines per speaker', () => {
    const keys = lines.map((l) => `${l.speaker}|${l.text}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
