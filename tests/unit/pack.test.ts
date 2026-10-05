import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildPack, listAlbumFiles, loadOrCreatePasswords, passwordsMarkdown } from '../../scripts/pack/build';
import { parseFamilyPack } from '../../src/state/familyPack';
import { COUPON_IDS } from '../../src/types';

let dir: string;
let portrait: string;
let album: string;

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-test-'));
  portrait = path.join(dir, 'luna-happy.png');
  album = path.join(dir, 'album-1.jpg');
  await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 255, g: 100, b: 150, alpha: 0.5 } } }).png().toFile(portrait);
  await sharp({ create: { width: 3200, height: 1000, channels: 3, background: { r: 10, g: 120, b: 200 } } }).jpeg().toFile(album);
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('passwords file', () => {
  it('creates, then stays stable across runs, and renews on request', () => {
    const f = path.join(dir, 'sub', 'pw.json');
    const a = loadOrCreatePasswords(f);
    expect(Object.keys(a).sort()).toEqual([...COUPON_IDS].sort());
    expect(loadOrCreatePasswords(f)).toEqual(a);
    expect(loadOrCreatePasswords(f, { renew: true })).not.toEqual(a);
  });
  it('fills in only missing ids', () => {
    const f = path.join(dir, 'partial.json');
    fs.writeFileSync(f, JSON.stringify({ movies: 'PINK-STAR-42' }));
    const p = loadOrCreatePasswords(f);
    expect(p.movies).toBe('PINK-STAR-42');
    expect(p.icecream).toMatch(/^[A-Z]+-[A-Z]+-\d{2}$/);
  });
  it('renders a cheat sheet row per coupon', () => {
    const md = passwordsMarkdown(loadOrCreatePasswords(path.join(dir, 'pw.json')));
    expect(md.split('\n').filter((l) => l.startsWith('| ') && l.includes('`')).length).toBe(COUPON_IDS.length);
  });
});

describe('buildPack', () => {
  const passwords = { movies: 'PINK-STAR-42', videogames: 'BLUE-MOON-17', shopping: 'GOLD-BEE-55', icecream: 'MINT-PIE-90' };

  it('works with zero portraits and no album', async () => {
    const pack = await buildPack({ portraitFiles: {}, albumFiles: [], passwords });
    expect(pack.portraits).toEqual({});
    expect(pack.album).toEqual([]);
    expect(pack.message).toBeUndefined();
  });

  it('encodes portraits (512px webp, alpha) and album (jpeg <=1600) and passes parseFamilyPack', async () => {
    const missing: string[] = [];
    const pack = await buildPack({
      portraitFiles: { luna: { happy: portrait } },
      albumFiles: [album],
      passwords,
      message: 'Hi Luna',
      onMissing: (id, e) => missing.push(`${id}-${e}`),
    });
    expect(missing).toContain('luna-silly');
    expect(missing).not.toContain('luna-happy');
    const url = pack.portraits.luna!.happy!;
    expect(url.startsWith('data:image/webp;base64,')).toBe(true);
    const meta = await sharp(Buffer.from(url.split(',')[1], 'base64')).metadata();
    expect([meta.width, meta.height, meta.hasAlpha]).toEqual([512, 512, true]);
    const am = await sharp(Buffer.from(pack.album[0].split(',')[1], 'base64')).metadata();
    expect(am.format).toBe('jpeg');
    expect(am.width).toBe(1600);
    expect(() => parseFamilyPack(JSON.parse(JSON.stringify(pack)))).not.toThrow();
    expect(pack.message).toBe('Hi Luna');
  });

  it('lists only image files from an album folder, and tolerates a missing folder', () => {
    expect(listAlbumFiles(path.join(dir, 'nope'))).toEqual([]);
    expect(listAlbumFiles(dir).map((f) => path.basename(f))).toContain('album-1.jpg');
    expect(listAlbumFiles(dir).some((f) => f.endsWith('.json'))).toBe(false);
  });
});
