import { describe, expect, it } from 'vitest';
import { busGain, crossfadeCurve, DUCK_LEVEL, MUSIC_LEVEL, parseMusicManifest } from '../../src/audio/music';
import { trackForScreen } from '../../src/App';

describe('music manifest', () => {
  it('parses valid entries and drops malformed ones', () => {
    const m = parseMusicManifest([
      { id: 'hub', file: 'hub.mp3', ms: 64000, bpm: 108, loop: true },
      { id: 'celebrate', file: 'celebrate.mp3', ms: 7000, bpm: 120, loop: false },
      { id: 'bad' },
      null,
      { file: 'x.mp3' },
    ]);
    expect(Object.keys(m)).toEqual(['hub', 'celebrate']);
    expect(m.hub).toMatchObject({ file: 'hub.mp3', ms: 64000, bpm: 108, loop: true });
    expect(m.celebrate.loop).toBe(false);
  });
  it('tolerates non-array input', () => {
    expect(parseMusicManifest({ nope: 1 })).toEqual({});
    expect(parseMusicManifest(undefined)).toEqual({});
  });
});

describe('crossfade and ducking math', () => {
  it('fades in 0..1 and out 1..0', () => {
    const i = crossfadeCurve(16, 'in');
    const o = crossfadeCurve(16, 'out');
    expect(i[0]).toBeCloseTo(0);
    expect(i[15]).toBeCloseTo(1);
    expect(o[0]).toBeCloseTo(1);
    expect(o[15]).toBeCloseTo(0);
  });
  it('is equal power: in^2 + out^2 = 1 at every step', () => {
    const i = crossfadeCurve(32, 'in');
    const o = crossfadeCurve(32, 'out');
    for (let k = 0; k < 32; k++) expect(i[k] ** 2 + o[k] ** 2).toBeCloseTo(1, 5);
  });
  it('scales by the starting gain when fading out mid-fade', () => {
    expect(crossfadeCurve(8, 'out', 0.5)[0]).toBeCloseTo(0.5);
  });
  it('ducks the bed while narration speaks', () => {
    expect(busGain(false)).toBe(MUSIC_LEVEL);
    expect(busGain(true)).toBe(DUCK_LEVEL);
    expect(DUCK_LEVEL).toBeLessThan(MUSIC_LEVEL);
  });
});

describe('screen to track', () => {
  it('maps screens', () => {
    expect(trackForScreen({ kind: 'title' })).toBe('title');
    expect(trackForScreen({ kind: 'hub' })).toBe('hub');
    expect(trackForScreen({ kind: 'zone', zone: 'story' })).toBe('story');
    expect(trackForScreen({ kind: 'zone', zone: 'woods' })).toBe('woods');
    expect(trackForScreen({ kind: 'challenge', zone: 'woods' })).toBe('challenge');
    expect(trackForScreen({ kind: 'finale' })).toBe('finale');
  });
});
