import { describe, expect, it } from 'vitest';
import { family, people, lunaFacts, finaleMessage } from '../../src/config/family';
import { zones, zoneList, builtZones, brickGoal } from '../../src/config/zones';
import { coupons } from '../../src/config/coupons';
import { COUPON_IDS, PERSON_IDS, ZONE_IDS } from '../../src/types';

describe('family config', () => {
  it('has every person with avatar params and a valid host zone', () => {
    expect(people.map((p) => p.id).sort()).toEqual([...PERSON_IDS].sort());
    for (const p of people) {
      expect(p.id).toBe(Object.keys(family).find((k) => family[k as keyof typeof family] === p));
      expect(p.displayName).toBeTruthy();
      for (const k of ['bodyColor', 'outfitColor', 'hairStyle', 'hairColor', 'skinTone', 'accessory'] as const) {
        expect(p.avatar[k], `${p.id}.${k}`).toBeTruthy();
      }
      expect(p.voice.pitch).toBeGreaterThan(0);
      expect(p.voice.rate).toBeGreaterThan(0);
      if (p.hostZone !== null) expect(ZONE_IDS).toContain(p.hostZone);
    }
  });
  it('luna has a birthDate, others do not need one', () => {
    expect(family.luna.birthDate).toBe('2019-10-16');
    expect(family.luna.hostZone).toBeNull();
  });
  it('dad has the lowest voice pitch; kids are higher', () => {
    expect(family.dad.voice.pitch).toBeLessThan(family.mom.voice.pitch);
    expect(family.luna.voice.pitch).toBeGreaterThan(family.dad.voice.pitch);
  });
  it('has the finale placeholder and facts', () => {
    expect(finaleMessage).toMatch(/TODO/);
    expect(lunaFacts.loves.length).toBeGreaterThan(5);
  });
});

describe('zones and coupons config', () => {
  it('registers all zones with the expected brick counts', () => {
    expect(zoneList.map((z) => z.id)).toEqual(ZONE_IDS);
    expect([zones.story, zones.science, zones.tennis, zones.music, zones.woods].map((z) => z.bricks)).toEqual([2, 2, 1, 1, 1]);
    expect(zones.story.built && zones.woods.built).toBe(true);
    expect(zones.science.built || zones.tennis.built || zones.music.built).toBe(false);
  });
  it('built zones bricks sum to the goal', () => {
    expect(builtZones().reduce((n, z) => n + z.bricks, 0)).toBe(brickGoal());
  });
  it('maps every coupon to a real zone that points back', () => {
    expect(coupons.map((c) => c.id).sort()).toEqual([...COUPON_IDS].sort());
    for (const c of coupons) {
      expect(zones[c.zone]).toBeDefined();
      expect(zones[c.zone].coupon).toBe(c.id);
      expect(c.line).toBe(`Good for one Daddy-Daughter ${c.title} Date!`);
      expect(c.illustration).toBe(`art/coupon-scene-${c.id}.webp`);
      expect(c.icon).toBe(`art/coupon-${c.id}.webp`);
      expect(c.experience).toMatch(/with Daddy$/);
    }
    expect(zones.story.coupon).toBe('movies');
    expect(zones.science.coupon).toBe('videogames');
    expect(zones.tennis.coupon).toBe('shopping');
    expect(zones.woods.coupon).toBe('icecream');
    expect(zones.music.coupon).toBeUndefined();
  });
});
