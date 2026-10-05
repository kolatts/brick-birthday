import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { clipId, fragmentBases, hashKey, normalizeText, parseManifest, pickClip, wordCues } from '../../src/audio/voices';
import { SPEAKER_IDS, voices } from '../../src/config/voices';
import { sayFragments } from '../../src/audio/speech';

// Vectors produced by scripts/voices/generate.py (hash_key / clip_id). Keep in sync with that file.
const VECTORS: [string, string][] = [
  ['narrator|Hello', '9da1c6847b3bbb79'],
  ['luna|Happy birthday, Luna!', 'd438090bbbcd9f3a'],
  ['mom|Café time ✨', 'bfc62521eb85a2a8'],
  ['fox|', '3370b7b6ceffb407'],
];

describe('voice hash', () => {
  it.each(VECTORS)('matches the Python implementation for %j', (key, expected) => {
    expect(hashKey(key)).toBe(expected);
  });
  it('normalizes whitespace before hashing', () => {
    expect(normalizeText('  Hello \n  world ')).toBe('Hello world');
    expect(clipId('narrator', '  Hello \n  world ')).toBe('70a57758e9484db1');
    expect(clipId('narrator', 'Hello world')).toBe(clipId('narrator', 'Hello   world'));
  });
  it('differs per speaker', () => {
    expect(clipId('mom', 'Hi')).not.toBe(clipId('dad', 'Hi'));
  });
  it('every committed line id matches its speaker and text', () => {
    const lines = JSON.parse(fs.readFileSync('scripts/voices/lines.json', 'utf8')) as { id: string; speaker: never; text: string }[];
    for (const l of lines) expect(clipId(l.speaker, l.text)).toBe(l.id);
  });
});

describe('cast', () => {
  it('has a voice and fallback for every speaker', () => {
    for (const s of SPEAKER_IDS) {
      expect(voices[s].voice).toMatch(/^[a-z]{2}-[A-Z]{2}-\w+Neural$/);
      expect(voices[s].fallback.pitch).toBeGreaterThan(0);
    }
  });
});

describe('manifest', () => {
  it('parses tolerantly', () => {
    const m = parseManifest({ a: { speaker: 'mom', text: 'x', ms: 10, timings: [[0, 0, 1], ['bad'], null] }, b: 5, c: {} });
    expect(Object.keys(m)).toEqual(['a', 'c']);
    expect(m.a.timings).toEqual([[0, 0, 1]]);
    expect(m.c.timings).toEqual([]);
    expect(parseManifest(null)).toEqual({});
    expect(parseManifest('nope')).toEqual({});
  });
});

describe('pickClip', () => {
  const id = clipId('mom', 'Hi there');
  const manifest = parseManifest({ [id]: { timings: [] } });
  it('picks a clip when present', () => {
    expect(pickClip(manifest, 'mom', 'Hi  there').kind).toBe('clip');
  });
  it('falls back with the speaker pitch/rate when missing', () => {
    expect(pickClip(manifest, 'dad', 'Hi there')).toEqual({ kind: 'fallback', ...voices.dad.fallback });
    expect(pickClip(null, 'mom', 'Hi there').kind).toBe('fallback');
  });
  it('lets explicit overrides win on fallback', () => {
    expect(pickClip(null, 'mom', 'x', { pitch: 2 })).toEqual({ kind: 'fallback', pitch: 2, rate: voices.mom.fallback.rate });
  });
});

describe('word cues and fragments', () => {
  it('maps char offsets to word indexes', () => {
    expect(wordCues('Hello big world', [[0, 0, 5], [300, 6, 3], [600, 10, 5]])).toEqual([[0, 0], [300, 1], [600, 2]]);
  });
  it('computes continuous bases across fragments', () => {
    expect(fragmentBases([{ text: 'Once upon' }, { text: 'Luna' }, { text: 'was happy today' }])).toEqual([0, 2, 3]);
  });
  it('sayFragments indexes words continuously under test mode', async () => {
    window.history.pushState({}, '', '/?test=1');
    const seen: [number, string][] = [];
    await sayFragments([{ text: 'Once upon' }, { speaker: 'luna', text: 'a time' }], { onWord: (i, w) => seen.push([i, w]) });
    expect(seen).toEqual([[0, 'Once'], [1, 'upon'], [2, 'a'], [3, 'time']]);
    window.history.pushState({}, '', '/');
  });
});
