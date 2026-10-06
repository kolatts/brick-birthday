import { audioState } from './engine';

/** One melody note: scientific pitch plus length in quarter-note beats (the song is in 3/4). */
export interface BirthdayNote {
  pitch: string;
  beats: number;
}

export const HAPPY_BIRTHDAY_BPM = 110;
const p = (pitch: string, beats: number): BirthdayNote => ({ pitch, beats });

/** "Happy Birthday to You" (public domain), in C major: 25 notes, 8 bars of 3 beats. */
export const HAPPY_BIRTHDAY: BirthdayNote[] = [
  // Happy birthday to you
  p('G4', 0.75), p('G4', 0.25), p('A4', 1), p('G4', 1), p('C5', 1), p('B4', 2),
  // Happy birthday to you
  p('G4', 0.75), p('G4', 0.25), p('A4', 1), p('G4', 1), p('D5', 1), p('C5', 2),
  // Happy birthday dear Luna
  p('G4', 0.75), p('G4', 0.25), p('G5', 1), p('E5', 1), p('C5', 1), p('B4', 1), p('A4', 1),
  // Happy birthday to you
  p('F5', 0.75), p('F5', 0.25), p('E5', 1), p('C5', 1), p('D5', 1), p('C5', 2),
];

/** One chord per 3-beat bar (low voicing, plays an oom-pah-pah). */
export const HAPPY_BIRTHDAY_CHORDS: string[][] = [
  ['C3', 'E3', 'G3'], ['G2', 'B2', 'D3'], ['G2', 'B2', 'D3'], ['C3', 'E3', 'G3'],
  ['C3', 'E3', 'G3'], ['C3', 'E3', 'G3'], ['F2', 'A2', 'C3'], ['C3', 'E3', 'G3'],
];

export const BEATS_PER_BAR = 3;

export const totalBeats = (notes: BirthdayNote[] = HAPPY_BIRTHDAY): number => notes.reduce((s, n) => s + n.beats, 0);
export const melodySeconds = (bpm: number = HAPPY_BIRTHDAY_BPM): number => (totalBeats() * 60) / bpm;
/** Song length plus the final chord's ring-out. */
export const songSeconds = (): number => melodySeconds() + 1;

export interface BandHandle {
  stop: () => void;
}

/**
 * Plays the band arrangement (bright lead, oom-pah-pah chords, light kick and hat). Returns null if
 * the audio has not been unlocked by a tap yet, so it is silent (never throws) in tests and before
 * the first gesture.
 */
export async function playHappyBirthday(): Promise<BandHandle | null> {
  if (!audioState.unlocked) return null;
  try {
    const tone = await import('tone');
    if (tone.getContext().state !== 'running') return null;
    const lead = new tone.Synth({ oscillator: { type: 'triangle8' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 } }).toDestination();
    lead.volume.value = -8;
    const chords = new tone.PolySynth(tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.25, sustain: 0.15, release: 0.25 } }).toDestination();
    chords.volume.value = -19;
    const kick = new tone.MembraneSynth({ pitchDecay: 0.04, octaves: 5, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 } }).toDestination();
    kick.volume.value = -14;
    const hat = new tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 } });
    const hatFilter = new tone.Filter(7000, 'highpass').toDestination();
    hat.connect(hatFilter);
    hat.volume.value = -24;

    const sec = 60 / HAPPY_BIRTHDAY_BPM;
    const t0 = tone.now() + 0.15;
    let beat = 0;
    for (const n of HAPPY_BIRTHDAY) {
      lead.triggerAttackRelease(n.pitch, Math.max(0.08, n.beats * sec * 0.9), t0 + beat * sec);
      beat += n.beats;
    }
    HAPPY_BIRTHDAY_CHORDS.forEach((chord, bar) => {
      const b = bar * BEATS_PER_BAR;
      chords.triggerAttackRelease(chord[0], sec * 0.9, t0 + b * sec); // oom
      chords.triggerAttackRelease(chord, sec * 0.5, t0 + (b + 1) * sec); // pah
      chords.triggerAttackRelease(chord, sec * 0.5, t0 + (b + 2) * sec); // pah
      kick.triggerAttackRelease('C1', '8n', t0 + b * sec);
      hat.triggerAttackRelease(0.05, t0 + (b + 1) * sec);
      hat.triggerAttackRelease(0.05, t0 + (b + 2) * sec);
    });
    // final held chord
    const end = t0 + totalBeats() * sec;
    chords.triggerAttackRelease(['C3', 'E3', 'G3', 'C4'], sec * 1.2, end);

    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      for (const n of [lead, chords, kick, hat, hatFilter]) {
        try {
          n.dispose();
        } catch {
          /* ignore */
        }
      }
    };
    const timer = setTimeout(dispose, (songSeconds() + 1.5) * 1000);
    return { stop: () => { clearTimeout(timer); dispose(); } };
  } catch {
    return null;
  }
}
