import { describe, expect, it } from 'vitest';
import { celebrationAge, computeAge, isBirthday, ordinal } from '../../src/config/age';

const BD = '2019-10-16';

describe('computeAge', () => {
  it('is 6 the day before the 7th birthday and 7 on it', () => {
    expect(computeAge(BD, new Date(2026, 9, 15))).toBe(6);
    expect(computeAge(BD, new Date(2026, 9, 16))).toBe(7);
  });
  it('handles later years', () => {
    expect(computeAge(BD, new Date(2027, 9, 16))).toBe(8);
    expect(computeAge(BD, new Date(2030, 9, 16))).toBe(11);
    expect(computeAge(BD, new Date(2031, 9, 16))).toBe(12);
    expect(computeAge(BD, new Date(2040, 9, 16))).toBe(21);
  });
  it('is not yet incremented earlier in the year', () => {
    expect(computeAge(BD, new Date(2026, 0, 1))).toBe(6);
  });
});

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [7, '7th'], [8, '8th'], [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'], [101, '101st'], [111, '111th'], [112, '112th'], [113, '113th'], [121, '121st'],
  ])('%i -> %s', (n, s) => expect(ordinal(n)).toBe(s));
});

describe('isBirthday', () => {
  it('matches month and day only', () => {
    expect(isBirthday(BD, new Date(2026, 9, 16))).toBe(true);
    expect(isBirthday(BD, new Date(2030, 9, 16))).toBe(true);
    expect(isBirthday(BD, new Date(2026, 9, 15))).toBe(false);
    expect(isBirthday(BD, new Date(2026, 8, 16))).toBe(false);
  });
});

describe('celebrationAge', () => {
  const BD = '2019-10-16';
  it('is the age she turns this year, even before the birthday', () => {
    expect(celebrationAge(BD, new Date(2026, 9, 5))).toBe(7);
    expect(celebrationAge(BD, new Date(2026, 9, 16))).toBe(7);
    expect(celebrationAge(BD, new Date(2026, 11, 31))).toBe(7);
    expect(celebrationAge(BD, new Date(2027, 0, 1))).toBe(8);
  });
});
