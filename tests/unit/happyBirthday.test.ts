import { describe, expect, it } from 'vitest';
import {
  BEATS_PER_BAR, HAPPY_BIRTHDAY, HAPPY_BIRTHDAY_BPM, HAPPY_BIRTHDAY_CHORDS, melodySeconds, totalBeats,
} from '../../src/audio/happyBirthday';

const midi = (pitch: string): number => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(pitch)!;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'];
  return 12 * (Number(m[3]) + 1) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
};

describe('Happy Birthday note table', () => {
  it('has the 25 notes of the standard melody', () => {
    expect(HAPPY_BIRTHDAY).toHaveLength(25);
  });
  it('uses valid pitches in a singable range, in C', () => {
    for (const n of HAPPY_BIRTHDAY) {
      expect(n.pitch).toMatch(/^[A-G](#|b)?\d$/);
      expect(midi(n.pitch)).toBeGreaterThanOrEqual(midi('C4'));
      expect(midi(n.pitch)).toBeLessThanOrEqual(midi('G5'));
      expect(n.pitch).not.toMatch(/[#b]/); // C major: naturals only
    }
    expect(HAPPY_BIRTHDAY[0].pitch).toBe('G4');
    expect(HAPPY_BIRTHDAY.at(-1)!.pitch).toBe('C5');
  });
  it('has sane lengths that fill 8 bars of 3/4', () => {
    for (const n of HAPPY_BIRTHDAY) {
      expect(n.beats).toBeGreaterThan(0);
      expect(n.beats).toBeLessThanOrEqual(2);
    }
    expect(totalBeats()).toBe(24);
    expect(HAPPY_BIRTHDAY_CHORDS).toHaveLength(totalBeats() / BEATS_PER_BAR);
  });
  it('lasts about 13 seconds at 110 bpm', () => {
    expect(HAPPY_BIRTHDAY_BPM).toBe(110);
    expect(melodySeconds()).toBeGreaterThan(12);
    expect(melodySeconds()).toBeLessThan(15);
  });
});
