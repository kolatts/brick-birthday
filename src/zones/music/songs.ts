import { HAPPY_BIRTHDAY } from '../../audio/happyBirthday';

export type InstrumentId = 'drums' | 'keyboard' | 'guitar' | 'xylophone';
export const INSTRUMENT_IDS: InstrumentId[] = ['drums', 'keyboard', 'guitar', 'xylophone'];
export const INSTRUMENT_NAMES: Record<InstrumentId, string> = { drums: 'Drums', keyboard: 'Keyboard', guitar: 'Guitar', xylophone: 'Xylophone' };
/** Instruments that can play the Follow-mode songs (8 pitched pads). */
export const FOLLOW_INSTRUMENTS: InstrumentId[] = ['keyboard', 'xylophone'];

// ---- timing grid -------------------------------------------------------------------------------
export const BPM = 100;
export const STEP_S = 60 / BPM / 4; // one 16th note = 0.15 s

/**
 * Snaps a tap time onto the 16th-note grid (anchored at `origin`, all in audio-context seconds).
 * Taps just after a grid line play at once (so they never feel late); taps later in the step wait for
 * the next line. The result is always >= now and never more than half a step (75 ms) away.
 */
export function quantize(now: number, origin: number, step: number = STEP_S): number {
  const phase = (((now - origin) % step) + step) % step;
  return phase <= step / 2 ? now : now + (step - phase);
}

// ---- pads --------------------------------------------------------------------------------------
export interface PadDef {
  label: string;
  color: string;
  /** Scientific pitch for pitched pads (undefined for drums). */
  note?: string;
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Diatonic C-major pitch name for a scale index (0 = C4, 7 = C5, -1 = B3). */
export function diatonic(index: number): string {
  const oct = 4 + Math.floor(index / 7);
  return `${LETTERS[((index % 7) + 7) % 7]}${oct}`;
}
/** Inverse of `diatonic` for natural notes; NaN for anything else. */
export function diatonicIndex(pitch: string): number {
  const m = /^([A-G])(\d)$/.exec(pitch);
  if (!m) return NaN;
  return LETTERS.indexOf(m[1]) + (Number(m[2]) - 4) * 7;
}

export const RAINBOW = ['#E63946', '#FF8C42', '#FFD60A', '#7AE582', '#2EC4B6', '#3A86FF', '#8E6BFF', '#FF5CA8'];

/** The 8-pad C-major window starting at scale index `base` (Jam uses base 0 = C4 to C5). */
export function scalePads(base: number, octaveShift = 0): PadDef[] {
  return RAINBOW.map((color, i) => {
    const note = diatonic(base + i + octaveShift * 7);
    return { label: note.replace(/\d/, ''), color, note };
  });
}

export const DRUM_PADS: PadDef[] = [
  { label: 'Kick', color: '#E63946' },
  { label: 'Snare', color: '#FFD60A' },
  { label: 'Hat', color: '#3A86FF' },
  { label: 'Crash', color: '#7AE582' },
];

/** Six strings tuned to a happy C-major chord so any strum sounds good. */
export const GUITAR_PADS: PadDef[] = ['C3', 'E3', 'G3', 'C4', 'E4', 'G4'].map((note, i) => ({
  label: `String ${i + 1}`,
  color: ['#E63946', '#FF8C42', '#FFD60A', '#7AE582', '#3A86FF', '#8E6BFF'][i],
  note,
}));

export function padsFor(inst: InstrumentId, base = 0): PadDef[] {
  switch (inst) {
    case 'drums': return DRUM_PADS;
    case 'guitar': return GUITAR_PADS;
    case 'keyboard': return scalePads(base);
    case 'xylophone': return scalePads(base, 1);
  }
}

// ---- songs -------------------------------------------------------------------------------------
export interface SongNote {
  /** Pad index 0..7 in the song's 8-key window. */
  pad: number;
  beats: number;
}
export interface Song {
  id: 'happy' | 'island' | 'tea';
  title: string;
  /** Scale index of pad 0 while this song is loaded (keys re-tune to the song). */
  base: number;
  notes: SongNote[];
}

const HB_BASE = diatonicIndex('G4');
const hb: SongNote[] = HAPPY_BIRTHDAY.map((n) => ({ pad: diatonicIndex(n.pitch) - HB_BASE, beats: n.beats }));
const run = (pads: number[], beats: number[] | number): SongNote[] => pads.map((pad, i) => ({ pad, beats: typeof beats === 'number' ? beats : beats[i] }));

export const SONGS: Song[] = [
  { id: 'happy', title: 'Happy Birthday', base: HB_BASE, notes: hb },
  // Bouncy, in 4/4: skip-step-skip.
  { id: 'island', title: 'Island Hop', base: 0, notes: run([0, 2, 4, 2, 4, 5, 4, 2, 4, 7, 5, 4, 2, 1, 0, 0], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1]) },
  // Waltzy, in 3/4: six bars.
  { id: 'tea', title: 'Tea Time Twirl', base: 0, notes: run([4, 2, 0, 2, 4, 7, 5, 4, 2, 1, 3, 5, 4, 2, 1, 0, 2, 0], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2]) },
];
export const songById = (id: Song['id']): Song => SONGS.find((s) => s.id === id)!;

export interface FollowResult {
  correct: boolean;
  step: number;
  done: boolean;
}
/** One tap in Follow mode: the right pad advances, any other pad leaves the step where it is. */
export function followTap(song: Song, step: number, pad: number): FollowResult {
  const want = song.notes[step]?.pad;
  if (want === undefined || pad !== want) return { correct: false, step, done: false };
  const next = step + 1;
  return { correct: true, step: next, done: next >= song.notes.length };
}

// ---- band + completion -------------------------------------------------------------------------
/** The extra family members each instrument adds to the band (Dad is always on stage). */
export const BAND: Record<InstrumentId, ('darian' | 'julian' | 'mom' | 'rudolph' | 'jinglebells')[]> = {
  drums: ['darian'],
  keyboard: ['julian'],
  guitar: ['mom'],
  xylophone: ['rudolph', 'jinglebells'],
};

export const isInstrument = (s: string): s is InstrumentId => (INSTRUMENT_IDS as string[]).includes(s);
export const playedSet = (played: readonly string[]): InstrumentId[] => INSTRUMENT_IDS.filter((i) => played.includes(i));
export const withPlayed = (played: readonly string[], inst: InstrumentId): string[] => (played.includes(inst) ? [...played] : [...played, inst]);
export const allPlayed = (played: readonly string[]): boolean => INSTRUMENT_IDS.every((i) => played.includes(i));
