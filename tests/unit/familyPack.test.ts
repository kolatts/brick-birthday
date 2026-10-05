import { describe, expect, it } from 'vitest';
import { parseFamilyPack } from '../../src/state/familyPack';

const IMG = 'data:image/webp;base64,UklGRgAAAABXRUJQ';
const valid = () => ({
  schemaVersion: 1,
  portraits: { luna: { happy: IMG, surprised: IMG, silly: IMG }, rudolph: { happy: IMG } },
  album: [IMG, IMG],
  passwords: { movies: 'TEST-CAKE-11', videogames: 'TEST-STAR-22', shopping: 'TEST-MOON-33', icecream: 'TEST-SUN-44' },
  message: 'hi',
});

describe('parseFamilyPack', () => {
  it('accepts a valid pack', () => {
    const p = parseFamilyPack(valid());
    expect(p.schemaVersion).toBe(1);
    expect(p.portraits.luna?.happy).toBe(IMG);
    expect(p.album).toHaveLength(2);
    expect(p.message).toBe('hi');
  });
  it('accepts a pack without message or album entries', () => {
    const v = { ...valid(), album: [] } as Record<string, unknown>;
    delete v.message;
    expect(parseFamilyPack(v).message).toBeUndefined();
  });
  it.each([
    ['non-object', 'x', /JSON object/],
    ['wrong version', { ...valid(), schemaVersion: 2 }, /schemaVersion/],
    ['unknown person', { ...valid(), portraits: { bob: { happy: IMG } } }, /Unknown person id/],
    ['unknown expression', { ...valid(), portraits: { luna: { angry: IMG } } }, /Unknown expression/],
    ['bad portrait data', { ...valid(), portraits: { luna: { happy: 'http://x/y.png' } } }, /data URL/],
    ['bad album', { ...valid(), album: ['nope'] }, /album\[0\]/],
    ['album not array', { ...valid(), album: {} }, /album/],
    ['missing password', { ...valid(), passwords: { movies: 'TEST-CAKE-11' } }, /Missing password/],
    ['bad password format', { ...valid(), passwords: { ...valid().passwords, movies: 'pink-star-42' } }, /WORD-WORD/],
    ['bad message', { ...valid(), message: 5 }, /message/],
  ])('rejects %s with a descriptive error', (_n, input, re) => {
    expect(() => parseFamilyPack(input)).toThrow(re);
  });
});
