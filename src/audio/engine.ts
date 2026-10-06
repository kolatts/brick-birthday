import { useSettings } from '../state/settings';
import { attachMusic, playMusic as playBed, stopMusic as stopBed, playSting as playOneShot, setSpeaking } from './music';

export type { TrackId, StingId } from './music';
export { setSpeaking };

export type SfxName = 'tap' | 'pop' | 'sparkle' | 'splash' | 'fanfare' | 'oops';

type ToneModule = typeof import('tone');

interface Rig {
  tone: ToneModule;
  blip: import('tone').Synth;
  poly: import('tone').PolySynth;
  noise: import('tone').NoiseSynth;
  music: import('tone').PolySynth;
  seq: import('tone').Sequence | null;
}

let rig: Rig | null = null;
let unlocking: Promise<void> | null = null;
let wantMusic = false;

/** Observable for tests: becomes true only after the first user gesture started audio. */
export const audioState = { unlocked: false };

function applyVolume(): void {
  if (!rig) return;
  const { muted, volume } = useSettings.getState();
  const dest = rig.tone.getDestination();
  dest.mute = muted;
  dest.volume.value = volume <= 0 ? -Infinity : 20 * Math.log10(volume) - 6;
}

const unlockHooks: (() => void)[] = [];
/** Registers a callback run synchronously inside the first-tap gesture (e.g. to unlock other audio elements). */
export function onUnlock(cb: () => void): void {
  unlockHooks.push(cb);
}

/** Lazy: loads Tone.js and starts the audio context. Call from a user gesture. */
export function unlock(): Promise<void> {
  for (const cb of unlockHooks) {
    try {
      cb();
    } catch {
      /* ignore */
    }
  }
  if (unlocking) return unlocking;
  unlocking = (async () => {
    try {
      const tone = await import('tone');
      await tone.start();
      rig = {
        tone,
        blip: new tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.05 } }).toDestination(),
        poly: new tone.PolySynth(tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.6 } }).toDestination(),
        noise: new tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 } }).toDestination(),
        music: new tone.PolySynth(tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.05, decay: 0.4, sustain: 0.2, release: 1.2 } }).toDestination(),
        seq: null,
      };
      rig.music.volume.value = -14;
      audioState.unlocked = true;
      applyVolume();
      attachMusic(tone, { start: startMusic, stop: stopSynth });
      if (wantMusic) startMusic();
    } catch {
      unlocking = null; // allow retry on next tap
    }
  })();
  return unlocking;
}

/** Installs a one-time first-tap listener. Call from main.tsx. */
export function installUnlockOnFirstTap(): void {
  const handler = () => {
    document.removeEventListener('pointerdown', handler, true);
    void unlock();
  };
  document.addEventListener('pointerdown', handler, true);
}

// Tone throws if a synth is triggered twice at the same instant; sounds must never break game state.
let lastSfxAt = 0;
export function sfx(name: SfxName): void {
  if (!rig || useSettings.getState().muted) return;
  try {
    sfxNow(name);
  } catch {
    /* audio glitches are not gameplay errors */
  }
}

function sfxNow(name: SfxName): void {
  const { tone, blip, poly, noise } = rig!;
  // Nudge each trigger strictly after the previous one so back-to-back taps never collide.
  const now = Math.max(tone.now(), lastSfxAt + 0.005);
  lastSfxAt = now;
  switch (name) {
    case 'tap':
      blip.triggerAttackRelease('G5', '32n', now);
      break;
    case 'pop':
      blip.triggerAttackRelease('C6', '16n', now);
      blip.frequency.setValueAtTime(1200, now);
      blip.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      break;
    case 'sparkle':
      ['E6', 'G6', 'C7', 'E7'].forEach((n, i) => poly.triggerAttackRelease(n, '32n', now + i * 0.06));
      break;
    case 'splash':
      noise.triggerAttackRelease('8n', now);
      break;
    case 'fanfare':
      poly.triggerAttackRelease(['C5', 'E5', 'G5'], '8n', now);
      poly.triggerAttackRelease(['E5', 'G5', 'C6'], '8n', now + 0.18);
      poly.triggerAttackRelease(['G5', 'C6', 'E6'], '4n', now + 0.36);
      break;
    case 'oops':
      blip.triggerAttackRelease('E3', '8n', now);
      blip.triggerAttackRelease('C3', '8n', now + 0.15);
      break;
  }
}

const MELODY = ['C4', 'E4', 'G4', 'E4', 'A4', 'G4', 'E4', 'D4', 'C4', 'E4', 'G4', 'C5', 'B4', 'G4', 'A4', 'G4'];

export function startMusic(): void {
  wantMusic = true;
  if (!rig || rig.seq) return;
  const { tone, music } = rig;
  rig.seq = new tone.Sequence((time, note) => {
    if (note) music.triggerAttackRelease(note, '8n', time);
  }, MELODY, '4n');
  tone.getTransport().bpm.value = 84;
  rig.seq.start(0);
  tone.getTransport().start();
}

function stopSynth(): void {
  wantMusic = false;
  if (!rig?.seq) return;
  rig.seq.stop();
  rig.seq.dispose();
  rig.seq = null;
  rig.tone.getTransport().stop();
}

/** Crossfades to a pre-generated music track (falls back to the synth loop if it cannot load). */
export const playMusic = playBed;
export const playSting = playOneShot;

/** Stops the music bed (and the synth fallback). */
export function stopMusic(): void {
  stopBed();
  stopSynth();
}

export function setMuted(muted: boolean): void {
  useSettings.getState().setMuted(muted);
  applyVolume();
}

export function setVolume(volume: number): void {
  useSettings.getState().setVolume(volume);
  applyVolume();
}
