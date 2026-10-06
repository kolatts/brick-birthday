import { create } from 'zustand';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { sfx, stopMusic, playSting } from '../../audio/engine';
import { say } from '../../audio/speech';
import { emit } from '../woods/fx';
import { BRICK_LINE, FOLLOW_START, JOIN_LINES, SONG_DONE, WELCOME } from './lines';
import { FOLLOW_INSTRUMENTS, INSTRUMENT_IDS, allPlayed, followTap, songById, withPlayed, type InstrumentId, type Song } from './songs';
import { disposeSynth, initSynth, playPad, startBacking, stopBacking } from './synth';

export type Mode = 'jam' | 'follow';
type V3 = [number, number, number];

/** Where each instrument prop sits on the stage (x, y, z). */
export const INSTRUMENT_POS: Record<InstrumentId, V3> = {
  drums: [-4.4, 0.9, 1.7],
  keyboard: [-1.5, 0.9, 1.9],
  guitar: [1.5, 0.9, 1.9],
  xylophone: [4.4, 0.9, 1.7],
};

/** Decaying 0..1 "just hit" energy per instrument; the scene reads it every frame to bob the band. */
export const energy: Record<InstrumentId, number> = { drums: 0, keyboard: 0, guitar: 0, xylophone: 0 };

interface Caption { id: number; who: string; text: string }

interface MusicState {
  instrument: InstrumentId;
  mode: Mode;
  songId: Song['id'];
  step: number;
  /** Incremented on every pad hit so the HUD can flash the pressed pad. */
  hitId: number;
  lastHit: { inst: InstrumentId; pad: number } | null;
  caption: Caption | null;
  celebrating: boolean;
  songDone: Song['id'] | null;
}

const initial: MusicState = {
  instrument: 'drums', mode: 'jam', songId: 'happy', step: 0, hitId: 0, lastHit: null, caption: null, celebrating: false, songDone: null,
};

export const useMusic = create<MusicState>(() => ({ ...initial }));
const get = useMusic.getState;
const set = useMusic.setState;

let capId = 0;
let capTimer: ReturnType<typeof setTimeout> | undefined;
export function caption(who: string, text: string, ms = 3600): void {
  clearTimeout(capTimer);
  set({ caption: { id: ++capId, who, text } });
  capTimer = setTimeout(() => set({ caption: null }), ms);
}

export function initMusic(): void {
  stopMusic(); // the hub bed would fight the instruments
  Object.assign(energy, { drums: 0, keyboard: 0, guitar: 0, xylophone: 0 });
  set({ ...initial });
  caption('Dad', WELCOME, 5200);
  void say(WELCOME, { speaker: 'dad' });
  void initSynth().then(() => {
    if (get().mode === 'jam') startBacking();
  });
}

export function disposeMusic(): void {
  clearTimeout(capTimer);
  disposeSynth();
}

export function setInstrument(inst: InstrumentId): void {
  sfx('tap');
  const patch: Partial<MusicState> = { instrument: inst };
  if (get().mode === 'follow' && !FOLLOW_INSTRUMENTS.includes(inst)) {
    patch.mode = 'jam';
    patch.songDone = null;
    void initSynth().then(startBacking);
  } else if (get().mode === 'follow') {
    patch.step = 0;
    patch.songDone = null;
  }
  set(patch);
}

export function setMode(mode: Mode): void {
  sfx('tap');
  if (mode === get().mode) return;
  if (mode === 'follow') {
    stopBacking();
    const inst = FOLLOW_INSTRUMENTS.includes(get().instrument) ? get().instrument : 'keyboard';
    set({ mode, instrument: inst, step: 0, songDone: null });
    caption('Dad', FOLLOW_START, 4200);
    void say(FOLLOW_START, { speaker: 'dad' });
  } else {
    set({ mode, step: 0, songDone: null });
    void initSynth().then(startBacking);
  }
}

export function selectSong(id: Song['id']): void {
  sfx('tap');
  set({ songId: id, step: 0, songDone: null });
}

export function restartSong(): void {
  set({ step: 0, songDone: null });
}

/** Records that an instrument was played; the fourth distinct one earns the brick. Pure state, no audio. */
export function recordPlay(inst: InstrumentId, announce = true): void {
  const pr = useProgress.getState();
  if (!pr.instrumentsPlayed.includes(inst)) {
    const played = withPlayed(pr.instrumentsPlayed, inst);
    pr.patch({ instrumentsPlayed: played });
    const join = JOIN_LINES.find((l) => l.id === inst);
    if (join && announce && !get().celebrating) {
      const who = join.speaker === 'mom' ? 'Mom' : join.speaker === 'darian' ? 'Darian' : join.speaker === 'julian' ? 'Julian' : 'Rudolph';
      caption(who, join.text, 3200);
      void say(join.text, { speaker: join.speaker as 'mom' });
    }
    if (allPlayed(played) && useProgress.getState().bricks.music < 1) {
      useProgress.getState().earnBrick('music', 1);
      set({ celebrating: true });
      caption('Dad', BRICK_LINE, 6000);
      void say(BRICK_LINE, { speaker: 'dad' });
      setTimeout(() => {
        sfx('fanfare');
        void playSting('celebrate');
      }, 500);
      emit('confetti', [0, 3, 0], 90);
      setTimeout(() => emit('confetti', [-3, 3, 0], 60), 450);
      setTimeout(() => emit('confetti', [3, 3, 0], 60), 800);
    }
  }
}

/** Test auto-play and fallback: marks all four instruments played (earning the brick). */
export function completeBand(): void {
  for (const inst of INSTRUMENT_IDS) recordPlay(inst, false);
}

export function tapPad(pad: number): void {
  const s = get();
  const inst = s.instrument;
  const song = s.mode === 'follow' && FOLLOW_INSTRUMENTS.includes(inst) ? songById(s.songId) : null;
  playPad(inst, pad, song?.base ?? 0);
  energy[inst] = 1;
  const pos = INSTRUMENT_POS[inst];
  emit('sparkle', [pos[0] + (pad - 3.5) * 0.18, pos[1] + 1.2, pos[2]], 5);
  set({ lastHit: { inst, pad }, hitId: s.hitId + 1 });
  recordPlay(inst);
  if (song && !s.songDone) {
    const r = followTap(song, s.step, pad);
    if (r.correct) set({ step: r.step });
    if (r.done) {
      set({ songDone: song.id });
      const text = SONG_DONE[song.id];
      caption('Dad', text, 5000);
      void say(text, { speaker: 'dad' });
      setTimeout(() => sfx('sparkle'), 150);
      emit('confetti', [0, 3, 0], 70);
      emit('sparkle', [pos[0], pos[1] + 1.5, pos[2]], 24);
    }
  }
}

export const backToIsland = (): void => useUi.getState().setScreen({ kind: 'hub' });
