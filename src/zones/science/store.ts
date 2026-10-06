import { create } from 'zustand';
import { say } from '../../audio/speech';
import { sfx } from '../../audio/engine';
import { useProgress } from '../../state/progress';
import { useCoupons } from '../../state/coupons';
import { useUi } from '../../state/ui';
import type { Expression } from '../../types';
import {
  CRYSTAL_TAPS, MAX_FUEL, ROUNDS, SEED_NEEDS, clampFuel, completeExperiment, floatItem, hintText, matchesTarget, pickTargets, seedSprouts,
  type ExperimentId, type FloatId, type Ingredient, type PotionAdd, type PotionTarget, type SeedNeed,
} from './logic';
import * as L from './lines';

export type Mode = 'menu' | ExperimentId;

export interface Caption { id: number; text: string }

export interface Lab {
  mode: Mode;
  caption: Caption | null;
  julianExpr: Expression | null;
  julianWave: boolean;
  /** Bricks to show in the celebration panel (null = hidden). */
  celebrate: number | null;
  // potion
  stirring: boolean;
  stirUntil: number;
  stirred: boolean;
  potion: PotionAdd | null;
  potionAt: number;
  // sink or float
  floatItem: FloatId | null;
  guess: 'sink' | 'float' | null;
  dropAt: number;
  floatBadge: string | null;
  // rocket
  fuel: number;
  launchFuel: number;
  launchAt: number;
  flying: boolean;
  // crystals
  crystals: number;
  crystalAt: number;
  // seed
  given: SeedNeed[];
  givenAt: Partial<Record<SeedNeed, number>>;
  sproutAt: number;
  // challenge
  ch: ChallengeState;
}

export interface ChallengeState {
  started: boolean;
  round: number;
  targets: PotionTarget[];
  picked: Ingredient[];
  wrongs: number;
  /** 'ok' = brew matched, 'goo' = funny wrong mix, null = idle. */
  result: 'ok' | 'goo' | null;
  resultAt: number;
  glowAt: number;
  won: boolean;
}

const newChallenge = (): ChallengeState => ({ started: false, round: 0, targets: pickTargets(), picked: [], wrongs: 0, result: null, resultAt: 0, glowAt: 0, won: false });

const initial = (): Lab => ({
  mode: 'menu', caption: null, julianExpr: null, julianWave: false, celebrate: null,
  stirring: false, stirUntil: 0, stirred: false, potion: null, potionAt: 0,
  floatItem: null, guess: null, dropAt: 0, floatBadge: null,
  fuel: 0, launchFuel: 0, launchAt: 0, flying: false,
  crystals: 0, crystalAt: 0,
  given: [], givenAt: {}, sproutAt: 0,
  ch: newChallenge(),
});

export const useLab = create<Lab>(() => initial());
const set = useLab.setState;
const get = useLab.getState;

export const nowS = (): number => performance.now() / 1000;

// ---- timers (cleared when the zone unmounts) -------------------------------------------------
const timers = new Set<ReturnType<typeof setTimeout>>();
function later(ms: number, fn: () => void): void {
  const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
  timers.add(t);
}
export function disposeLab(): void {
  timers.forEach(clearTimeout);
  timers.clear();
  set(initial());
}
export function initLab(): void {
  set(initial());
}

let captionId = 0;
/** Big caption plus Julian's voice. */
export function julianSay(text: string): void {
  set({ caption: { id: ++captionId, text } });
  void say(text, { speaker: 'julian' });
}
const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length];

export function setJulian(expr: Expression | null, ms = 1600, wave = false): void {
  set({ julianExpr: expr, julianWave: wave });
  if (expr || wave) later(ms, () => set({ julianExpr: null, julianWave: false }));
}

// ---- progression ----------------------------------------------------------------------------
let celebrateTimer: ReturnType<typeof setTimeout> | null = null;

/** Marks an experiment done; earns the 2nd/5th-distinct-experiment bricks and schedules the celebration. */
export function finishExperiment(id: ExperimentId, celebrateDelayMs = 2600): void {
  const pr = useProgress.getState();
  const res = completeExperiment(pr.experimentsDone, id, pr.bricks.science);
  if (res.isNew) pr.patch({ experimentsDone: res.done });
  if (res.gained > 0) {
    pr.earnBrick('science', res.gained);
    sfx('fanfare');
    if (celebrateTimer) clearTimeout(celebrateTimer);
    celebrateTimer = setTimeout(() => {
      celebrateTimer = null;
      set({ celebrate: useProgress.getState().bricks.science });
    }, celebrateDelayMs);
    timers.add(celebrateTimer);
  }
}

export function closeCelebration(): void {
  set({ celebrate: null });
  backToMenu();
}

// ---- navigation inside the lab --------------------------------------------------------------
export function enterExperiment(id: ExperimentId): void {
  set({ ...initial(), mode: id, ch: get().ch, julianExpr: null });
  sfx('tap');
  const intro: Record<ExperimentId, string> = { potion: L.POTION_INTRO, float: L.FLOAT_INTRO, rocket: L.ROCKET_INTRO, crystal: L.CRYSTAL_INTRO, seed: L.SEED_INTRO };
  julianSay(intro[id]);
}

export function backToMenu(): void {
  const first = get().caption === null;
  set({ ...initial(), ch: get().ch });
  julianSay(first ? L.WELCOME : L.MENU_AGAIN);
}

// ---- 1. potion ------------------------------------------------------------------------------
export function stirStart(): void {
  set({ stirring: true });
}
export function stirEnd(): void {
  const wasStirred = get().stirred;
  set({ stirring: false, stirUntil: nowS() + 0.9, stirred: true });
  if (!wasStirred) { sfx('pop'); julianSay(L.POTION_STIRRED); }
}
export function addPotion(kind: PotionAdd): void {
  const s = get();
  if (!s.stirred) { julianSay(L.POTION_BEAKER); return; }
  set({ potion: kind, potionAt: nowS() });
  sfx('splash');
  setTimeout(() => sfx('sparkle'), 120);
  setJulian('surprised', 1500, true);
  julianSay(kind === 'lemon' ? L.POTION_PINK : L.POTION_GREEN);
  finishExperiment('potion');
}
export function resetPotion(): void {
  set({ potion: null, stirred: false, stirUntil: 0 });
  julianSay(L.POTION_MORE);
}

// ---- 2. sink or float -----------------------------------------------------------------------
export function pickFloat(id: FloatId): void {
  sfx('tap');
  set({ floatItem: id, guess: null, dropAt: 0, floatBadge: null });
}
export function guessFloat(g: 'sink' | 'float'): void {
  const s = get();
  if (!s.floatItem) { julianSay(L.FLOAT_PICK_FIRST); return; }
  if (s.guess && nowS() - s.dropAt < 5) return;
  const item = floatItem(s.floatItem);
  set({ guess: g, dropAt: nowS(), floatBadge: null });
  sfx('pop');
  julianSay(pick(L.FLOAT_GUESS, g === 'sink' ? 0 : 1));
  later(2300, () => {
    if (get().floatItem !== item.id) return;
    set({ floatBadge: item.floats ? 'It floats!' : 'It sinks!' });
    setJulian(g === (item.floats ? 'float' : 'sink') ? 'silly' : 'surprised', 1600, true);
    julianSay(item.why);
    finishExperiment('float');
  });
}

// ---- 3. rocket ------------------------------------------------------------------------------
export function addFuel(): void {
  const s = get();
  if (s.flying) return;
  if (s.fuel >= MAX_FUEL) { sfx('tap'); return; }
  sfx('pop');
  set({ fuel: clampFuel(s.fuel + 1) });
}
export function launchRocket(): void {
  const s = get();
  if (s.flying) return;
  if (s.fuel < 1) { julianSay(L.ROCKET_FIRST); return; }
  set({ flying: true, launchFuel: s.fuel, launchAt: nowS() });
  sfx('fanfare');
  julianSay(L.ROCKET_LAUNCH[s.fuel - 1]);
}
export function rocketLanded(): void {
  if (!get().flying) return;
  set({ flying: false, fuel: 0 });
  sfx('sparkle');
  setJulian('silly', 1600, true);
  julianSay(L.ROCKET_WHY);
  finishExperiment('rocket');
}

// ---- 4. crystals ----------------------------------------------------------------------------
export function growCrystals(): void {
  const s = get();
  if (s.crystals >= CRYSTAL_TAPS) {
    set({ crystals: 0, crystalAt: 0 });
    julianSay(L.CRYSTAL_INTRO);
    return;
  }
  const n = s.crystals + 1;
  set({ crystals: n, crystalAt: nowS() });
  sfx('sparkle');
  if (n >= CRYSTAL_TAPS) {
    setJulian('surprised', 1600, true);
    julianSay(L.CRYSTAL_WHY);
    finishExperiment('crystal');
  } else {
    julianSay(pick(L.CRYSTAL_TAP, n - 1));
  }
}

// ---- 5. seed --------------------------------------------------------------------------------
export function giveSeed(need: SeedNeed): void {
  const s = get();
  if (s.given.includes(need) || s.sproutAt > 0) return;
  const given = [...s.given, need];
  set({ given, givenAt: { ...s.givenAt, [need]: nowS() } });
  sfx(need === 'water' ? 'splash' : 'pop');
  if (seedSprouts(given)) {
    set({ sproutAt: nowS() + 0.3 });
    later(500, () => sfx('sparkle'));
    setJulian('surprised', 1800, true);
    julianSay(L.SEED_WHY);
    finishExperiment('seed');
  } else {
    julianSay(given.length === 2 ? L.SEED_NEEDS_MORE : L.SEED_GOT[need]);
  }
}
export function resetSeed(): void {
  set({ given: [], givenAt: {}, sproutAt: 0 });
  julianSay(L.SEED_INTRO);
}

// ---- Mystery Potion challenge ---------------------------------------------------------------
const patchCh = (p: Partial<ChallengeState>): void => set({ ch: { ...get().ch, ...p } });

export function startChallenge(): void {
  set({ ch: { ...newChallenge(), started: true } });
  sfx('pop');
  julianSay(L.targetIntro(get().ch.targets[0].name));
}
export function togglePick(i: Ingredient): void {
  const ch = get().ch;
  if (ch.won || !ch.started) return;
  sfx('tap');
  // Tapping during the happy pause after a match starts the next potion right away.
  const base = ch.result === 'ok' ? [] : ch.picked;
  const picked = base.includes(i) ? base.filter((x) => x !== i) : [...base, i];
  patchCh({ picked, result: null });
}
export function clearPicks(): void {
  patchCh({ picked: [], result: null });
}
export function brew(): void {
  const ch = get().ch;
  if (ch.won || !ch.started) return;
  if (ch.picked.length === 0) { julianSay(L.CHALLENGE_PICK_SOMETHING); return; }
  const target = ch.targets[ch.round];
  if (matchesTarget(ch.picked, target)) {
    const round = ch.round + 1;
    sfx('sparkle');
    setJulian('silly', 1800, true);
    if (round >= ROUNDS) {
      patchCh({ result: 'ok', resultAt: nowS(), round, glowAt: nowS(), won: true });
      useCoupons.getState().markChallengeComplete('science');
      later(300, () => sfx('fanfare'));
      julianSay(L.CHALLENGE_WIN);
    } else {
      patchCh({ result: 'ok', resultAt: nowS(), round, wrongs: 0 });
      julianSay(pick(L.CHALLENGE_NEXT, round - 1));
      later(1900, () => {
        if (get().ch.result === 'ok') patchCh({ picked: [], result: null });
        julianSay(L.targetIntro(get().ch.targets[get().ch.round].name));
      });
    }
  } else {
    const wrongs = ch.wrongs + 1;
    patchCh({ result: 'goo', resultAt: nowS(), wrongs });
    sfx('oops');
    later(200, () => sfx('splash'));
    setJulian('surprised', 1800);
    julianSay(pick(L.CHALLENGE_GOO, wrongs - 1));
    later(2300, () => {
      if (get().ch.result !== 'goo') return;
      patchCh({ result: null, picked: [] });
      if (wrongs >= 2) julianSay(hintText(target));
    });
  }
}

export function completeChallengeNow(): void {
  useCoupons.getState().markChallengeComplete('science');
  useUi.getState().setScreen({ kind: 'hub' });
}

export const ALL_SEED_NEEDS = SEED_NEEDS;
