import { create } from 'zustand';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { sfx, playMusic, stopMusic } from '../../audio/engine';
import { say } from '../../audio/speech';
import { COPY, finale } from '../../config/copy';
import { playHappyBirthday, songSeconds, type BandHandle } from '../../audio/happyBirthday';
import { candleCount } from './layout';

export type Phase = 'build' | 'candles' | 'party' | 'album' | 'message';

interface Puff {
  id: number;
  /** Candle indices [from, to) that just went out. */
  from: number;
  to: number;
}

interface FinaleState {
  phase: Phase;
  runId: number;
  total: number;
  lit: number;
  puff: Puff | null;
  taps: number;
  bandOn: boolean;
  frozen: boolean;
  flashKey: number;
  partyAt: number;
}

export const useFinale = create<FinaleState>(() => ({
  phase: 'build', runId: 0, total: candleCount(), lit: candleCount(), puff: null, taps: 0, bandOn: false, frozen: false, flashKey: 0, partyAt: 0,
}));

const set = useFinale.setState;
const get = useFinale.getState;

let band: BandHandle | null = null;
let partyTimer: ReturnType<typeof setTimeout> | undefined;
let freezeTimer: ReturnType<typeof setTimeout> | undefined;

function stopBand(): void {
  if (partyTimer) clearTimeout(partyTimer);
  partyTimer = undefined;
  band?.stop();
  band = null;
  if (get().bandOn) set({ bandOn: false });
}

/** Begins (or replays) the finale from the bricks flying in. */
export function startFinale(): void {
  stopBand();
  if (freezeTimer) clearTimeout(freezeTimer);
  const n = candleCount();
  set((s) => ({ phase: 'build', runId: s.runId + 1, total: n, lit: n, puff: null, taps: 0, bandOn: false, frozen: false, partyAt: 0 }));
  void playMusic('finale');
  void say(COPY.finaleGather, { speaker: 'narrator' });
}

/** All the bricks have landed: candles pop on and the caption asks Luna to blow. */
export function cakeBuilt(): void {
  if (get().phase !== 'build') return;
  set({ phase: 'candles' });
  void say(COPY.finaleCandles, { speaker: 'narrator' });
}

/** One tap on the cake or the Blow button: puffs out a few candles; the last one starts the party. */
export function blowCandles(): void {
  const s = get();
  if (s.phase !== 'candles' || s.lit <= 0) return;
  const n = Math.min(s.lit, Math.ceil(s.total / 3));
  const from = s.lit - n;
  set({ lit: from, taps: s.taps + 1, puff: { id: (s.puff?.id ?? 0) + 1, from, to: s.lit } });
  sfx('pop');
  if (from === 0) startParty();
}

function startParty(): void {
  set({ phase: 'party', partyAt: performance.now(), bandOn: true });
  sfx('fanfare');
  void say(COPY.finaleFireworks, { speaker: 'narrator' });
  stopMusic(); // the bed steps aside while the family band plays
  void playHappyBirthday().then((h) => {
    if (get().phase !== 'party') h?.stop();
    else band = h;
  });
  partyTimer = setTimeout(goAlbum, (songSeconds() + 1.5) * 1000);
}

function resumeBed(): void {
  void playMusic('finale');
}

export function goAlbum(): void {
  if (get().phase === 'album' || get().phase === 'message') return;
  stopBand();
  resumeBed();
  set({ phase: 'album', lit: 0, bandOn: false });
  void say(COPY.finaleAlbum, { speaker: 'narrator' });
}

export function goMessage(): void {
  if (get().phase === 'message') return;
  stopBand();
  if (get().phase !== 'album') resumeBed();
  set({ phase: 'message', lit: 0, bandOn: false, frozen: false });
  useProgress.getState().patch({ finaleSeen: true });
  void say(COPY.finaleEnd, { speaker: 'narrator' });
}

/** Say cheese: a flash, then everyone holds the pose for 2 seconds. */
export function sayCheese(): void {
  sfx('pop');
  void say(finale.cheese, { speaker: 'narrator' });
  set((s) => ({ frozen: true, flashKey: s.flashKey + 1 }));
  if (freezeTimer) clearTimeout(freezeTimer);
  freezeTimer = setTimeout(() => set({ frozen: false }), 2000);
}

/** Leaving the screen: silence the band and restore a clean state. */
export function stopFinale(): void {
  stopBand();
  if (freezeTimer) clearTimeout(freezeTimer);
  set({ frozen: false, bandOn: false });
}

export function backToIsland(): void {
  stopFinale();
  useUi.getState().setScreen({ kind: 'hub' });
}

/** Test hook: jump straight to the message card (also records finaleSeen). */
export function skipToEnd(): void {
  stopBand();
  set({ phase: 'message', lit: 0, bandOn: false, frozen: false });
  useProgress.getState().patch({ finaleSeen: true });
}
