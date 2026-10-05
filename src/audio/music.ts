import type * as ToneNS from 'tone';

/**
 * Background music beds + one-shot stings. Tracks are pre-generated mp3s in public/music/
 * (see scripts/music/generate.py), decoded to buffers and looped with Tone.Player, which
 * loops gaplessly on iOS Safari (HTMLAudio loop has an audible seam).
 * Mute/volume are applied by the master destination in engine.ts; this file owns relative levels.
 */

export type TrackId = 'title' | 'hub' | 'story' | 'woods' | 'challenge' | 'finale';
export type StingId = 'celebrate';

export interface TrackInfo {
  id: string;
  file: string;
  ms: number;
  bpm: number;
  loop: boolean;
}

export const MUSIC_LEVEL = 0.35; // bed relative to master so narration stays clear
export const DUCK_LEVEL = 0.15; // bed while narration speaks
export const STING_LEVEL = 0.6;
export const CROSSFADE_S = 1;
export const DUCK_RAMP_S = 0.25;

/** Tolerant manifest parse: drops malformed entries instead of throwing. */
export function parseMusicManifest(raw: unknown): Record<string, TrackInfo> {
  const out: Record<string, TrackInfo> = {};
  if (!Array.isArray(raw)) return out;
  for (const v of raw) {
    if (!v || typeof v !== 'object') continue;
    const e = v as Record<string, unknown>;
    if (typeof e.id !== 'string' || typeof e.file !== 'string' || !e.file) continue;
    out[e.id] = {
      id: e.id,
      file: e.file,
      ms: typeof e.ms === 'number' && e.ms > 0 ? e.ms : 0,
      bpm: typeof e.bpm === 'number' && e.bpm > 0 ? e.bpm : 0,
      loop: e.loop !== false,
    };
  }
  return out;
}

/** Equal-power gain curve for one side of a crossfade: `in` rises 0..1, `out` falls 1..0 (scaled by peak). */
export function crossfadeCurve(steps: number, dir: 'in' | 'out', peak = 1): number[] {
  const n = Math.max(2, Math.floor(steps));
  const c = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    c[i] = peak * (dir === 'in' ? Math.sin((t * Math.PI) / 2) : Math.cos((t * Math.PI) / 2));
  }
  return c;
}

/** Target gain of the shared music bus. */
export const busGain = (speaking: boolean): number => (speaking ? DUCK_LEVEL : MUSIC_LEVEL);

const isTest = (): boolean => typeof location !== 'undefined' && new URLSearchParams(location.search).has('test');

// ---- runtime ----------------------------------------------------------------

interface Voice {
  id: string;
  player: ToneNS.Player;
  gain: ToneNS.Gain;
}

let tone: typeof ToneNS | null = null;
let bus: ToneNS.Gain | null = null;
let current: Voice | null = null;
let wanted: string | null = null;
let token = 0;
let speaking = false;
let fallback: { start: () => void; stop: () => void } | null = null;
let manifestP: Promise<Record<string, TrackInfo> | null> | null = null;
const buffers = new Map<string, Promise<ToneNS.ToneAudioBuffer | null>>();

/** Observable for tests/debugging. */
export const musicState = { current: null as string | null, loaded: 0, failed: 0 };

const url = (file: string): string => `${import.meta.env.BASE_URL}music/${file}`;

function loadManifest(): Promise<Record<string, TrackInfo> | null> {
  manifestP ??= (async () => {
    try {
      const res = await fetch(url('manifest.json'));
      return res.ok ? parseMusicManifest(await res.json()) : null;
    } catch {
      return null;
    }
  })();
  return manifestP;
}

function loadBuffer(id: string): Promise<ToneNS.ToneAudioBuffer | null> {
  let p = buffers.get(id);
  if (!p) {
    p = (async () => {
      const m = await loadManifest();
      const info = m?.[id];
      if (!info || !tone) return null;
      try {
        const b = await tone.ToneAudioBuffer.fromUrl(url(info.file));
        musicState.loaded++;
        return b;
      } catch {
        musicState.failed++;
        return null;
      }
    })();
    buffers.set(id, p);
    void p.then((b) => {
      if (!b) buffers.delete(id); // allow a retry later
    });
  }
  return p;
}

/** Called by engine.ts once Tone is started (after the first tap). */
export function attachMusic(t: typeof ToneNS, fb: { start: () => void; stop: () => void }): void {
  tone = t;
  fallback = fb;
  bus = new t.Gain(busGain(speaking)).toDestination();
  if (wanted) void playMusic(wanted);
}

function fadeOutAndDispose(v: Voice): void {
  const t = tone;
  if (!t) return;
  const now = t.now();
  const g = v.gain.gain;
  const from = g.value;
  g.cancelScheduledValues(now);
  g.setValueCurveAtTime(crossfadeCurve(32, 'out', from), now, CROSSFADE_S);
  window.setTimeout(() => {
    try {
      v.player.stop();
      v.player.dispose();
      v.gain.dispose();
    } catch {
      /* ignore */
    }
  }, CROSSFADE_S * 1000 + 100);
}

/** Crossfades (~1 s) to the track and loops it. No-op under ?test=1; before the first tap it starts once unlocked. */
export async function playMusic(id: string): Promise<void> {
  if (isTest()) return;
  wanted = id;
  if (!tone || !bus) return;
  if (current?.id === id) return;
  const my = ++token;
  const buf = await loadBuffer(id);
  if (my !== token || !tone || !bus) return;
  if (!buf) {
    fallback?.start(); // synth loop stands in if the track could not load
    return;
  }
  fallback?.stop();
  const gain = new tone.Gain(0).connect(bus);
  const player = new tone.Player({ url: buf, loop: true }).connect(gain);
  player.start();
  gain.gain.setValueCurveAtTime(crossfadeCurve(32, 'in'), tone.now(), CROSSFADE_S);
  const old = current;
  current = { id, player, gain };
  musicState.current = id;
  if (old) fadeOutAndDispose(old);
}

export function stopMusic(): void {
  wanted = null;
  token++;
  fallback?.stop();
  if (current) fadeOutAndDispose(current);
  current = null;
  musicState.current = null;
}

/** One-shot sting over the bed. */
export async function playSting(id: StingId): Promise<void> {
  if (isTest() || !tone || !bus) return;
  const buf = await loadBuffer(id);
  if (!buf || !tone) return;
  const player = new tone.Player({ url: buf, loop: false, volume: 20 * Math.log10(STING_LEVEL) }).toDestination();
  player.onstop = () => window.setTimeout(() => player.dispose(), 50);
  player.start();
}

/** Ducks the bed while narration speaks. */
export function setSpeaking(s: boolean): void {
  speaking = s;
  if (!tone || !bus) return;
  bus.gain.rampTo(busGain(s), DUCK_RAMP_S);
}
