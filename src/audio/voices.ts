import { voices, type SpeakerId } from '../config/voices';

/**
 * Pre-generated narration lookup. MUST match scripts/voices/generate.py:
 * hash = two FNV-1a 32-bit passes (offset basis 2166136261 and 0x9747b28c) over
 * the UTF-8 bytes of `${speaker}|${normalizeText(text)}`, as 16 hex chars.
 */
export function normalizeText(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function fnv1a32(bytes: Uint8Array, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function hashKey(key: string): string {
  const bytes = new TextEncoder().encode(key);
  const a = fnv1a32(bytes, 2166136261);
  const b = fnv1a32(bytes, 0x9747b28c);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

export const clipId = (speaker: SpeakerId, text: string): string => hashKey(`${speaker}|${normalizeText(text)}`);

/** [audioMs, charOffset into normalized text, word length] */
export type Timing = [number, number, number];
export interface ClipEntry {
  speaker?: string;
  text?: string;
  ms?: number;
  timings: Timing[];
}
export type Manifest = Record<string, ClipEntry>;

/** Tolerant parse: drops malformed entries instead of throwing. */
export function parseManifest(raw: unknown): Manifest {
  const out: Manifest = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const e = v as Record<string, unknown>;
    const timings = Array.isArray(e.timings)
      ? (e.timings.filter((t) => Array.isArray(t) && t.length >= 3 && t.slice(0, 3).every((n) => typeof n === 'number')) as Timing[])
      : [];
    out[id] = {
      speaker: typeof e.speaker === 'string' ? e.speaker : undefined,
      text: typeof e.text === 'string' ? e.text : undefined,
      ms: typeof e.ms === 'number' ? e.ms : undefined,
      timings,
    };
  }
  return out;
}

export type Pick =
  | { kind: 'clip'; id: string; entry: ClipEntry }
  | { kind: 'fallback'; pitch: number; rate: number };

/** Chooses the pre-generated clip if the manifest has one, otherwise Web Speech settings. */
export function pickClip(manifest: Manifest | null, speaker: SpeakerId, text: string, override?: { pitch?: number; rate?: number }): Pick {
  const id = clipId(speaker, text);
  const entry = manifest?.[id];
  if (entry) return { kind: 'clip', id, entry };
  const fb = voices[speaker]?.fallback ?? voices.narrator.fallback;
  return { kind: 'fallback', pitch: override?.pitch ?? fb.pitch, rate: override?.rate ?? fb.rate };
}

export interface WordSpan {
  start: number;
  end: number;
  word: string;
}

export function wordSpans(text: string): WordSpan[] {
  const out: WordSpan[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
  return out;
}

/** Maps timing char offsets to whitespace-word indexes: [[audioMs, wordIndex]], deduped, ascending. */
export function wordCues(text: string, timings: Timing[]): [number, number][] {
  const spans = wordSpans(normalizeText(text));
  const cues: [number, number][] = [];
  let last = -1;
  for (const [ms, off] of timings) {
    const idx = spans.findIndex((s) => off >= s.start && off < s.end);
    if (idx > last) {
      cues.push([ms, idx]);
      last = idx;
    }
  }
  return cues;
}

/** Continuous word indexing across fragments: the global index base of each fragment. */
export function fragmentBases(fragments: { text: string }[]): number[] {
  const bases: number[] = [];
  let n = 0;
  for (const f of fragments) {
    bases.push(n);
    n += wordSpans(normalizeText(f.text)).length;
  }
  return bases;
}

let manifest: Manifest | null = null;
let loading: Promise<Manifest | null> | null = null;

/** Fetches voices/manifest.json once (same-origin). Resolves null if unavailable. */
export function loadManifest(): Promise<Manifest | null> {
  if (manifest) return Promise.resolve(manifest);
  if (loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}voices/manifest.json`);
      if (!res.ok) return null;
      manifest = parseManifest(await res.json());
      return manifest;
    } catch {
      return null;
    }
  })();
  return loading;
}

export const getManifest = (): Manifest | null => manifest;
export const clipUrl = (id: string): string => `${import.meta.env.BASE_URL}voices/${id}.mp3`;
