import { describe, expect, it, vi } from 'vitest';
import { PASSWORD_RE, WORDS, cryptoInt, generatePassword, generatePasswords } from '../../scripts/pack/passwords';
import { COUPON_IDS } from '../../src/types';

describe('word list', () => {
  it('is large, unique, uppercase A-Z, 3-8 letters', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    for (const w of WORDS) expect(w).toMatch(/^[A-Z]{3,8}$/);
  });
  it('has no scary or confusable words', () => {
    for (const bad of ['BARE', 'SON', 'KILL', 'DEAD', 'GHOST', 'SNAKE', 'SPIDER', 'MONSTER']) expect(WORDS).not.toContain(bad);
  });
});

describe('generatePassword', () => {
  it('matches WORD-WORD-NN with approved words', () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword();
      expect(p).toMatch(PASSWORD_RE);
      const [a, b, nn] = p.split('-');
      expect(WORDS).toContain(a);
      expect(WORDS).toContain(b);
      expect(a).not.toBe(b);
      expect(Number(nn)).toBeGreaterThanOrEqual(10);
      expect(Number(nn)).toBeLessThanOrEqual(99);
    }
  });
  it('uses the crypto CSPRNG by default', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    generatePassword();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it('cryptoInt stays in range', () => {
    for (let i = 0; i < 500; i++) {
      const n = cryptoInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
    }
  });
});

describe('generatePasswords', () => {
  it('generates one unique password per id', () => {
    const p = generatePasswords(COUPON_IDS);
    expect(Object.keys(p).sort()).toEqual([...COUPON_IDS].sort());
    expect(new Set(Object.values(p)).size).toBe(COUPON_IDS.length);
  });
  it('is stable across re-runs unless renew', () => {
    const first = generatePasswords(COUPON_IDS);
    expect(generatePasswords(COUPON_IDS, first)).toEqual(first);
    const renewed = generatePasswords(COUPON_IDS, first, { renew: true });
    for (const id of COUPON_IDS) expect(renewed[id]).not.toBe(first[id]);
  });
  it('fills only missing ids', () => {
    const p = generatePasswords(COUPON_IDS, { movies: 'PINK-STAR-42' });
    expect(p.movies).toBe('PINK-STAR-42');
    expect(p.icecream).toMatch(PASSWORD_RE);
  });
});
