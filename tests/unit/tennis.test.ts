import { describe, expect, it } from 'vitest';
import {
  BASE_FLIGHT, GOALS, MIN_FLIGHT, WINDOW, createSim, flightTime, judgeTap, msToArrival, playPerfect, sillyMiss, startSim, stepSim, tapSim,
  type Sim,
} from '../../src/zones/tennis/logic';
import { lines } from '../../src/zones/tennis/lines';

/** Steps until the ball is incoming (a serve has happened). */
function serve(sim: Sim) {
  startSim(sim);
  for (let i = 0; i < 600 && sim.phase !== 'incoming'; i++) stepSim(sim, 1 / 60);
}
const stepTo = (sim: Sim, secondsIntoFlight: number) => {
  while (sim.phase === 'incoming' && sim.t < secondsIntoFlight) stepSim(sim, 1 / 120);
};

describe('hit window', () => {
  it('is a hit within +-0.5 s of arrival', () => {
    expect(judgeTap(0)).toBe('hit');
    expect(judgeTap(WINDOW)).toBe('hit');
    expect(judgeTap(-WINDOW)).toBe('hit');
  });
  it('very early taps are a miss only in a narrow band, otherwise a harmless practice swing', () => {
    expect(judgeTap(-0.6)).toBe('early');
    expect(judgeTap(-1.5)).toBe('swing');
    expect(judgeTap(0.6)).toBe('swing');
  });
  it('tapping 0.4 s before arrival returns the ball', () => {
    const sim = createSim('zone');
    serve(sim);
    stepTo(sim, sim.flight - 0.4);
    const ev = tapSim(sim);
    expect(ev.some((e) => e.type === 'hit')).toBe(true);
    expect(sim.rally).toBe(1);
    expect(sim.phase).toBe('returning');
  });
  it('a tap 0.7 s early is a silly miss that restarts the count', () => {
    const sim = createSim('zone');
    serve(sim);
    sim.rally = 3;
    stepTo(sim, sim.flight - 0.7);
    const ev = tapSim(sim);
    expect(ev.some((e) => e.type === 'miss')).toBe(true);
    expect(sim.rally).toBe(0);
    expect(sim.phase).toBe('miss');
  });
  it('no tap at all misses once the window has passed, then serves again', () => {
    const sim = createSim('zone');
    serve(sim);
    sim.rally = 4;
    const events = [];
    for (let i = 0; i < 60 * 8; i++) events.push(...stepSim(sim, 1 / 60));
    expect(events.some((e) => e.type === 'miss')).toBe(true);
    expect(events.some((e) => e.type === 'missDone')).toBe(true);
    expect(sim.rally).toBe(0);
  });
  it('alternates between the flowerpot and Rudolph fetching', () => {
    const sim = createSim('zone');
    const kinds: string[] = [];
    serve(sim);
    for (let n = 0; n < 4; n++) {
      for (let i = 0; i < 60 * 10; i++) for (const e of stepSim(sim, 1 / 60)) if (e.type === 'miss') kinds.push(e.kind);
    }
    expect(new Set(kinds)).toEqual(new Set(['pot', 'rudolph']));
  });
});

describe('streak counting', () => {
  it('counts one rally per hit and wins at 7 in the zone', () => {
    const sim = createSim('zone');
    const events = playPerfect(sim);
    expect(sim.won).toBe(true);
    expect(sim.rally).toBe(GOALS.zone);
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(GOALS.zone);
    expect(events.filter((e) => e.type === 'win')).toHaveLength(1);
  });
  it('the Super Rally needs 15', () => {
    const sim = createSim('challenge');
    playPerfect(sim);
    expect(sim.rally).toBe(15);
    expect(sim.won).toBe(true);
  });
  it('ignores taps before the game starts and after the win', () => {
    const sim = createSim('zone');
    expect(tapSim(sim)).toEqual([]);
    playPerfect(sim);
    for (let i = 0; i < 200; i++) stepSim(sim, 1 / 60);
    expect(sim.phase).toBe('won');
    expect(tapSim(sim)).toEqual([]);
  });
  it('Darian never fumbles in the challenge or on the first two rallies', () => {
    for (let s = 0; s < 50; s++) {
      expect(sillyMiss('challenge', 5, s)).toBe(false);
      expect(sillyMiss('zone', 1, s)).toBe(false);
    }
    expect([...Array(60)].some((_, s) => sillyMiss('zone', 4, s))).toBe(true);
  });
});

describe('ball speed', () => {
  it('starts near 2.2 s on the zone and gets faster each rally', () => {
    expect(flightTime('zone', 0)).toBeCloseTo(2.2);
    expect(flightTime('zone', 3)).toBeLessThan(flightTime('zone', 2));
  });
  it('never exceeds the speed cap', () => {
    expect(flightTime('zone', 100)).toBe(MIN_FLIGHT.zone);
    expect(flightTime('challenge', 100)).toBe(MIN_FLIGHT.challenge);
  });
  it('the challenge ball is slightly faster than the zone ball', () => {
    expect(BASE_FLIGHT.challenge).toBeLessThan(BASE_FLIGHT.zone);
    expect(flightTime('challenge', 5)).toBeLessThan(flightTime('zone', 5));
  });
  it('reports ms until arrival for tests', () => {
    const sim = createSim('zone');
    expect(msToArrival(sim)).toBe(-1);
    serve(sim);
    expect(msToArrival(sim)).toBeGreaterThan(2000);
    expect(msToArrival(sim)).toBeLessThanOrEqual(2200);
  });
});

describe('narration lines', () => {
  it('has Darian cheers and the encouraging miss line', () => {
    const texts = lines.map((l) => l.text);
    expect(texts).toContain('Woo! Great shot!');
    expect(texts).toContain('Nice try! Again!');
    expect(texts).toContain('Again!');
    expect(lines.every((l) => ['darian', 'narrator', 'luna'].includes(l.speaker))).toBe(true);
  });
});
