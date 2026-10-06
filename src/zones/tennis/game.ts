import { create } from 'zustand';
import { useProgress } from '../../state/progress';
import { useCoupons } from '../../state/coupons';
import { useUi } from '../../state/ui';
import { setExpression } from '../../state/expressions';
import { sfx as rawSfx, playSting, type SfxName } from '../../audio/engine';
import { say } from '../../audio/speech';
import { emit } from '../woods/fx';
import {
  createSim, startSim, stepSim, tapSim, msToArrival, ballPos, GOALS, type Mode, type Sim, type SimEvent,
} from './logic';
import {
  BRICK_LINE, BURIED_LINE, CHALLENGE_DONE, CHALLENGE_GO, CHEERS, DARIAN_OOPS, DARIAN_OOPS_2, MILESTONES, REPLAY_WIN_LINE, SUPER_AGAIN, TRY_AGAIN,
} from './lines';

/** Tone throws if two sounds start in the same instant; a sound effect must never break the game state. */
function sfx(name: SfxName): void {
  try { rawSfx(name); } catch { /* audio is decoration */ }
}

export interface Caption { id: number; text: string }

interface TennisState {
  mode: Mode;
  rally: number;
  best: number;
  started: boolean;
  caption: Caption | null;
  wand: boolean;
  celebrating: boolean;
  firstBrick: boolean;
  challengeDone: boolean;
  darianCheer: boolean;
  lunaCheer: boolean;
}

const initial = (mode: Mode): TennisState => ({
  mode, rally: 0, best: 0, started: false, caption: null, wand: false, celebrating: false, firstBrick: false,
  challengeDone: false, darianCheer: false, lunaCheer: false,
});

export const useTennis = create<TennisState>(() => initial('zone'));

let sim: Sim = createSim('zone');
let captionId = 0;
let cheerIdx = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();
const later = (ms: number, fn: () => void) => {
  const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
  timers.add(t);
};

export const getSim = (): Sim => sim;
/** Test hook: ms until the ball reaches Luna, -1 when no ball is incoming. */
export const nextArrivalMs = (): number => msToArrival(sim);

function caption(text: string, speaker: 'darian' | 'narrator' | 'luna' = 'darian', speak = true, ms = 2000): void {
  const id = ++captionId;
  useTennis.setState({ caption: { id, text } });
  if (speak) void say(text, { speaker });
  later(ms, () => { if (useTennis.getState().caption?.id === id) useTennis.setState({ caption: null }); });
}

export function initGame(mode: Mode): void {
  disposeGame();
  sim = createSim(mode);
  useTennis.setState(initial(mode));
}

export function disposeGame(): void {
  timers.forEach(clearTimeout);
  timers.clear();
}

/** Starts (or restarts) serving. */
export function startGame(): void {
  startSim(sim);
  useTennis.setState({ started: true, celebrating: false, rally: 0, caption: null });
}

export function toggleWand(): void {
  sfx('sparkle');
  useTennis.setState((s) => ({ wand: !s.wand }));
}

function consumeWand(): void {
  if (useTennis.getState().wand) {
    sim.trail = true;
    useTennis.setState({ wand: false });
  }
}

function onEvent(e: SimEvent): void {
  const st = useTennis.getState();
  switch (e.type) {
    case 'serve':
      consumeWand();
      break;
    case 'swing':
      break;
    case 'hit': {
      sfx('pop');
      const pr = useProgress.getState();
      useTennis.setState({ rally: e.rally, best: Math.max(st.best, e.rally), darianCheer: true });
      if (e.rally > pr.rallies) pr.patch({ rallies: e.rally });
      setExpression('luna', 'happy', 1200);
      setExpression('darian', 'happy', 1200);
      later(1100, () => useTennis.setState({ darianCheer: false }));
      consumeWand();
      if (e.rally < sim.goal) {
        const line = MILESTONES[e.rally] ?? (e.rally % 2 === 1 ? CHEERS[cheerIdx++ % CHEERS.length] : null);
        if (line) caption(line);
      }
      const b = ballPos(sim);
      emit('sparkle', [b[0], b[1], b[2]], 10);
      break;
    }
    case 'darianReturn':
      sfx('tap');
      consumeWand();
      break;
    case 'darianMiss': {
      sfx('oops');
      setExpression('darian', 'silly', 1600);
      caption(cheerIdx++ % 2 === 0 ? DARIAN_OOPS : DARIAN_OOPS_2);
      break;
    }
    case 'miss':
      sfx('oops');
      useTennis.setState({ rally: 0 });
      setExpression('luna', 'surprised', 1800);
      caption(st.mode === 'challenge' ? SUPER_AGAIN : TRY_AGAIN, 'darian', true, 2200);
      break;
    case 'missDone':
      break;
    case 'win':
      later(900, win);
      break;
  }
}

function win(): void {
  if (useTennis.getState().mode === 'challenge') completeChallenge();
  else winZone();
}

/** Seven in a row: earns the brick (once) and shows the celebration. */
export function winZone(): void {
  const pr = useProgress.getState();
  const first = pr.bricks.tennis < 1;
  pr.earnBrick('tennis', 1);
  pr.patch({ rallies: Math.max(pr.rallies, GOALS.zone) });
  useTennis.setState({ celebrating: true, firstBrick: first, rally: GOALS.zone, wand: false });
  sim.won = true;
  sim.phase = 'won';
  setExpression('darian', 'happy', 3000);
  setExpression('luna', 'happy', 3000);
  useTennis.setState({ lunaCheer: true, darianCheer: true });
  sfx('fanfare');
  void playSting('celebrate');
  emit('confetti', [0, 2, 7], 40);
  emit('confetti', [0, 2, -6], 30);
  void say(first ? BRICK_LINE : REPLAY_WIN_LINE, { speaker: first ? 'narrator' : 'darian' });
}

/** Super Rally done: coupon dig spot appears in the hub. */
export function completeChallenge(): void {
  useCoupons.getState().markChallengeComplete('tennis');
  useTennis.setState({ challengeDone: true, rally: GOALS.challenge, lunaCheer: true, darianCheer: true });
  sim.won = true;
  sim.phase = 'won';
  sfx('fanfare');
  void playSting('celebrate');
  emit('confetti', [0, 2, 7], 40);
  emit('confetti', [0, 2, -6], 30);
  void say(CHALLENGE_DONE, { speaker: 'darian' }).then(() => say(BURIED_LINE, { speaker: 'narrator' }));
  later(window.__skipAnim ? 300 : 6500, () => useUi.getState().setScreen({ kind: 'hub' }));
}

export function challengeGo(): void {
  startGame();
  caption(CHALLENGE_GO, 'darian', true, 2200);
}

/** Per-frame update from the scene. */
export function tickGame(dt: number): void {
  for (const e of stepSim(sim, Math.min(dt, 0.05))) onEvent(e);
}

/** A tap on the court. */
export function tapGame(): void {
  if (!useTennis.getState().started || useTennis.getState().celebrating || useTennis.getState().challengeDone) return;
  const evs = tapSim(sim);
  if (evs.length === 1 && evs[0].type === 'swing') sfx('tap'); // practice swing
  for (const e of evs) onEvent(e);
}

export function resetForReplay(): void {
  sim = createSim(useTennis.getState().mode, sim.seed);
  useTennis.setState({ celebrating: false, lunaCheer: false, darianCheer: false, rally: 0, started: true });
  startSim(sim);
}
