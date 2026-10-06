import type { Screen, ZoneId } from '../types';
import { useProgress } from '../state/progress';
import { useCoupons } from '../state/coupons';
import { useUi } from '../state/ui';
import { zones } from '../config/zones';
import { resetEverything } from '../state/reset';

type AutoPlay = () => void | Promise<void>;
const registry = new Map<ZoneId, AutoPlay>();

/** Zones register their auto-play helper here (used by e2e tests only). */
export function registerAutoPlay(zone: ZoneId, fn: AutoPlay): void {
  registry.set(zone, fn);
}

export interface PerfHooks {
  /** Mean frame time (ms) over the last ~5 s of 3D frames. */
  avgFrameMs: () => number;
  /** Draw calls in the most recent frame. */
  drawCalls: () => number;
}

let perfHooks: PerfHooks | null = null;
/** The hub registers its frame sampler here; exposed as window.__game.perf under ?test=1. */
export function registerPerf(p: PerfHooks | null): void {
  perfHooks = p;
  if (typeof window !== 'undefined' && window.__game) window.__game.perf = p ?? undefined;
}

export interface FinaleHooks {
  /** Jumps to the message card (records finaleSeen). */
  skipToEnd: () => void;
}

let finaleHooks: FinaleHooks | null = null;
/** The finale screen registers its hooks while mounted; exposed as window.__game.finale under ?test=1. Returns an unregister. */
export function registerFinale(h: FinaleHooks): () => void {
  finaleHooks = h;
  if (typeof window !== 'undefined' && window.__game) window.__game.finale = h;
  return () => {
    if (finaleHooks === h) finaleHooks = null;
    if (typeof window !== 'undefined' && window.__game && window.__game.finale === h) window.__game.finale = undefined;
  };
}

export interface GameHooks {
  finale?: FinaleHooks;
  perf?: PerfHooks;
  getState: () => unknown;
  setScreen: (s: Screen) => void;
  autoPlay: (zone: ZoneId) => Promise<void>;
  completeChallenge: (zone: ZoneId) => void;
  skipAnimations: () => void;
  reset: () => void;
  unlockAll: () => void;
}

declare global {
  interface Window {
    __game?: GameHooks;
    __skipAnim?: boolean;
  }
}

/** Installs window.__game only when the URL has ?test=1. Inert otherwise. */
export function installTestHooks(): void {
  if (typeof location === 'undefined' || new URLSearchParams(location.search).get('test') !== '1') return;
  window.__game = {
    getState: () => {
      const p = useProgress.getState();
      const c = useCoupons.getState();
      const { screen } = useUi.getState();
      return {
        screen,
        bricks: p.bricks,
        totalBricks: p.totalBricks(),
        goalReached: p.goalReached(),
        challengesDone: p.challengesDone,
        coupons: { challengeComplete: c.challengeComplete, dug: c.dug },
      };
    },
    setScreen: (s) => useUi.getState().setScreen(s),
    autoPlay: async (zone) => {
      await registry.get(zone)?.();
    },
    completeChallenge: (zone) => {
      if (!zones[zone].built) return;
      useCoupons.getState().markChallengeComplete(zone);
    },
    reset: resetEverything,
    unlockAll: () => {
      useProgress.getState().unlockAll();
    },
    skipAnimations: () => {
      window.__skipAnim = true;
    },
  };
  if (perfHooks) window.__game.perf = perfHooks;
  if (finaleHooks) window.__game.finale = finaleHooks;
}
