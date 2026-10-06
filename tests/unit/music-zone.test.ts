import { beforeEach, describe, expect, it } from 'vitest';
import { HAPPY_BIRTHDAY } from '../../src/audio/happyBirthday';
import { useProgress } from '../../src/state/progress';
import { lines } from '../../src/zones/music/lines';
import { completeBand, recordPlay } from '../../src/zones/music/musicState';
import {
  BAND, INSTRUMENT_IDS, SONGS, STEP_S, allPlayed, diatonic, diatonicIndex, followTap, padsFor, quantize, songById, withPlayed,
} from '../../src/zones/music/songs';

describe('quantize', () => {
  const o = 10;
  it('plays at once just after a grid line', () => {
    expect(quantize(o + 0.03, o)).toBeCloseTo(o + 0.03);
  });
  it('waits for the next grid line late in a step', () => {
    expect(quantize(o + 0.12, o)).toBeCloseTo(o + STEP_S);
  });
  it('never returns the past and never moves more than half a step', () => {
    for (let i = 0; i < 400; i++) {
      const now = o + i * 0.0137;
      const q = quantize(now, o);
      expect(q).toBeGreaterThanOrEqual(now - 1e-9);
      expect(q - now).toBeLessThanOrEqual(STEP_S / 2 + 1e-9);
    }
  });
  it('lands on the grid when it waits', () => {
    const q = quantize(o + 0.13, o);
    expect(((q - o) / STEP_S) % 1).toBeCloseTo(0, 6);
  });
});

describe('pads and scale', () => {
  it('has the requested pad counts', () => {
    expect(padsFor('drums')).toHaveLength(4);
    expect(padsFor('keyboard')).toHaveLength(8);
    expect(padsFor('guitar')).toHaveLength(6);
    expect(padsFor('xylophone')).toHaveLength(8);
  });
  it('names a C-major scale', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(diatonic)).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']);
    expect(diatonicIndex('G5')).toBe(11);
  });
});

describe('songs', () => {
  it('has the three songs with the specified lengths', () => {
    expect(songById('happy').notes).toHaveLength(HAPPY_BIRTHDAY.length);
    expect(songById('island').notes).toHaveLength(16);
    expect(songById('tea').notes).toHaveLength(18);
  });
  it('only uses pads that exist', () => {
    for (const s of SONGS) for (const n of s.notes) {
      expect(Number.isInteger(n.pad)).toBe(true);
      expect(n.pad).toBeGreaterThanOrEqual(0);
      expect(n.pad).toBeLessThan(8);
      expect(n.beats).toBeGreaterThan(0);
    }
  });
  it('Happy Birthday pads re-tune to the original pitches', () => {
    const s = songById('happy');
    const pads = padsFor('keyboard', s.base);
    s.notes.forEach((n, i) => expect(pads[n.pad].note).toBe(HAPPY_BIRTHDAY[i].pitch));
  });
  it('follow: right pad advances, wrong pad does not, last note finishes', () => {
    const s = songById('island');
    expect(followTap(s, 0, (s.notes[0].pad + 1) % 8)).toEqual({ correct: false, step: 0, done: false });
    expect(followTap(s, 0, s.notes[0].pad)).toEqual({ correct: true, step: 1, done: false });
    expect(followTap(s, s.notes.length - 1, s.notes[s.notes.length - 1].pad).done).toBe(true);
  });
});

describe('band completion', () => {
  beforeEach(() => useProgress.getState().reset());
  it('pure helpers track the four instruments', () => {
    let p: string[] = [];
    for (const i of INSTRUMENT_IDS) {
      expect(allPlayed(p)).toBe(false);
      p = withPlayed(p, i);
    }
    expect(allPlayed(p)).toBe(true);
    expect(withPlayed(p, 'drums')).toHaveLength(4);
    expect(Object.keys(BAND).sort()).toEqual([...INSTRUMENT_IDS].sort());
  });
  it('earns the brick only when all four are played', () => {
    for (const i of ['drums', 'keyboard', 'guitar'] as const) recordPlay(i, false);
    expect(useProgress.getState().bricks.music).toBe(0);
    recordPlay('xylophone', false);
    expect(useProgress.getState().bricks.music).toBe(1);
  });
  it('completeBand (auto-play) earns it once', () => {
    completeBand();
    completeBand();
    expect(useProgress.getState().bricks.music).toBe(1);
    expect(useProgress.getState().instrumentsPlayed.sort()).toEqual([...INSTRUMENT_IDS].sort());
  });
});

describe('voice lines', () => {
  it('every line has a speaker and text', () => {
    expect(lines.length).toBeGreaterThan(5);
    for (const l of lines) expect(l.speaker && l.text).toBeTruthy();
  });
});
