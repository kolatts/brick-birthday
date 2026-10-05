import { create } from 'zustand';
import { useProgress } from '../../state/progress';
import { sfx } from '../../audio/engine';
import { say } from '../../audio/speech';
import { emit } from './fx';
import {
  FRIENDS, GUEST_IDS, GUEST_LINES, GUEST_NAMES, LOW_LINE, SPLASH_LINE, PERFECT_LINE, OK_LINE,
  factForTree, friendForTree, type FriendId, type GuestId,
} from './facts';
import { judgePour, levelAt } from './logic';

export const TREE_COUNT = 7;
export const LONG_AGO = -1e9;
const nowMs = () => performance.now();
const fast = () => typeof window !== 'undefined' && window.__skipAnim === true;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, fast() ? ms / 8 : ms));

/** Where each stump / tree lives in the clearing. */
export const STUMP_POS: [number, number, number][] = [
  [-4.2, 0, -1.6], [-1.4, 0, -1.9], [1.4, 0, -1.9], [4.2, 0, -1.6],
  [-2.8, 0, 0.9], [0, 0, 0.6], [2.8, 0, 0.9],
];
export const TEA_CENTER: [number, number, number] = [0, 0, 8.2];

export type TreatId = 'cookie' | 'scone' | 'cake';
export const TREATS: { id: TreatId; emoji: string; label: string }[] = [
  { id: 'cookie', emoji: '🍪', label: 'Cookie' },
  { id: 'scone', emoji: '🥐', label: 'Scone' },
  { id: 'cake', emoji: '🍰', label: 'Cake' },
];

/** Guests at the tea party: family, pets, and one of each forest friend that has returned. */
export function guestsFor(trees: number): GuestId[] {
  const friends = FRIENDS.slice(0, Math.min(trees, FRIENDS.length)).map((f) => f.id);
  return [...GUEST_IDS.filter((g) => !FRIENDS.some((f) => f.id === g)), ...friends];
}

export interface Caption { id: number; who: string; text: string; kind: 'talk' | 'fact' | 'hint' }
export type PourResultInfo = { id: number; result: 'low' | 'ok' | 'perfect' | 'splash'; guest: GuestId };

interface WoodsState {
  stage: number[]; // 0 stump, 1 sapling, 2 watered, 3 grown
  plantedAt: number[];
  wateredAt: number[];
  grownAt: number[];
  friends: (FriendId | null)[];
  friendAt: number[];
  active: number;
  caption: Caption | null;
  teaReady: boolean;
  teaStartAt: number;
  // tea party
  tea: Partial<Record<GuestId, boolean>>;
  treat: Partial<Record<GuestId, boolean>>;
  pourTarget: GuestId | null;
  pouring: { start: number } | null;
  selectedTreat: TreatId | null;
  lastPour: PourResultInfo | null;
  celebrating: boolean;
  firstBrick: boolean;
}

const fresh = (): WoodsState => ({
  stage: Array(TREE_COUNT).fill(0), plantedAt: Array(TREE_COUNT).fill(LONG_AGO), wateredAt: Array(TREE_COUNT).fill(LONG_AGO),
  grownAt: Array(TREE_COUNT).fill(LONG_AGO), friends: Array(TREE_COUNT).fill(null), friendAt: Array(TREE_COUNT).fill(LONG_AGO),
  active: -1, caption: null, teaReady: false, teaStartAt: LONG_AGO,
  tea: {}, treat: {}, pourTarget: null, pouring: null, selectedTreat: null, lastPour: null, celebrating: false, firstBrick: false,
});

export const useWoods = create<WoodsState>(() => fresh());

let gen = 0; // bumped on every init, cancels stale async chains
let capId = 0;
let capTimer: ReturnType<typeof setTimeout> | undefined;
const set = useWoods.setState;
const get = useWoods.getState;

function patchArr<T>(arr: T[], i: number, v: T): T[] {
  const a = arr.slice();
  a[i] = v;
  return a;
}

export function showCaption(who: string, text: string, kind: Caption['kind'] = 'talk', ms = 5200): void {
  clearTimeout(capTimer);
  set({ caption: { id: ++capId, who, text, kind } });
  capTimer = setTimeout(() => set({ caption: null }), ms);
}

/** Resets scene state from the persisted tree count. Call on mount. */
export function initWoods(): void {
  gen++;
  clearTimeout(capTimer);
  const n = useProgress.getState().treesPlanted;
  const s = fresh();
  for (let i = 0; i < Math.min(n, TREE_COUNT); i++) {
    s.stage[i] = 3;
    s.friends[i] = friendForTree(i).id;
  }
  s.teaReady = n >= TREE_COUNT;
  s.teaStartAt = s.teaReady ? nowMs() : LONG_AGO;
  set(s);
  if (n < TREE_COUNT) showCaption('Rudolph & Jingle Bells', 'Tap a bare stump to plant a sapling!', 'hint', 9000);
}

export function disposeWoods(): void {
  gen++;
  clearTimeout(capTimer);
  set(fresh());
}

const grownCount = () => get().stage.filter((x) => x === 3).length;

export function tapStump(i: number): void {
  const st = get().stage[i];
  if (st === 0) {
    sfx('pop');
    set({ stage: patchArr(get().stage, i, 1), plantedAt: patchArr(get().plantedAt, i, nowMs()), active: i });
    const p = STUMP_POS[i];
    emit('sparkle', [p[0], 0.5, p[2]], 8);
    showCaption('Hint', 'A sapling! Give it some water.', 'hint', 6000);
  } else if (st === 1) {
    set({ active: i });
    waterStump(i);
  } else if (st === 2) {
    set({ active: i });
    sfx('tap');
    showCaption('Hint', 'It is thirsty no more! Wave the magic wand!', 'hint', 5000);
  }
}

export function waterStump(i: number): void {
  sfx('splash');
  const p = STUMP_POS[i];
  emit('drop', [p[0], 0.4, p[2]], 16);
  set({ stage: patchArr(get().stage, i, 2), wateredAt: patchArr(get().wateredAt, i, nowMs()), active: i });
  showCaption('Hint', 'Splish splash! Now wave the magic wand!', 'hint', 6000);
}

const pick = (stage: number): number => {
  const { active, stage: st } = get();
  if (active >= 0 && st[active] === stage) return active;
  return st.findIndex((x) => x === stage);
};

export function doWater(): void {
  const i = pick(1);
  if (i >= 0) return waterStump(i);
  sfx('tap');
  const any2 = pick(2) >= 0;
  showCaption('Hint', any2 ? 'Already watered! Wave the magic wand!' : 'Tap a bare stump first to plant a sapling.', 'hint', 5000);
}

export function doWand(): void {
  const i = pick(2);
  if (i >= 0) return growTree(i);
  sfx('tap');
  const any1 = pick(1) >= 0;
  showCaption('Hint', any1 ? 'Water the sapling first!' : 'Tap a bare stump first to plant a sapling.', 'hint', 5000);
}

export function growTree(i: number): void {
  const k = grownCount();
  const friend = friendForTree(k);
  sfx('pop');
  setTimeout(() => sfx('sparkle'), 450);
  const p = STUMP_POS[i];
  emit('sparkle', [p[0], 1.6, p[2]], 26);
  setTimeout(() => emit('sparkle', [p[0], 2.6, p[2]], 20), 600);
  set({
    stage: patchArr(get().stage, i, 3), grownAt: patchArr(get().grownAt, i, nowMs()),
    friends: patchArr(get().friends, i, friend.id), friendAt: patchArr(get().friendAt, i, nowMs() + 1400), active: -1,
  });
  useProgress.getState().plantTree();
  void treeCelebration(k);
}

async function treeCelebration(k: number): Promise<void> {
  const my = gen;
  const friend = friendForTree(k);
  await wait(1500);
  if (my !== gen) return;
  showCaption(friend.name, friend.thanks, 'talk', 4600);
  sfx('sparkle');
  void say(friend.thanks, { speaker: friend.id });
  await wait(3600);
  if (my !== gen) return;
  const fact = factForTree(k);
  showCaption('Tree fact', fact, 'fact', 9500);
  void say(fact, { speaker: 'narrator' });
  if (grownCount() >= TREE_COUNT) {
    await wait(9000);
    if (my !== gen) return;
    showCaption('Rudolph & Jingle Bells', 'The forest is back! Time for a tea party!', 'talk', 6000);
    set({ teaReady: true, teaStartAt: nowMs() });
    sfx('fanfare');
  }
}

/** Test/auto-play: every tree grown instantly. */
export function growAllTrees(): void {
  const s = fresh();
  for (let i = 0; i < TREE_COUNT; i++) {
    s.stage[i] = 3;
    s.friends[i] = friendForTree(i).id;
  }
  gen++;
  const keep = get();
  set({ ...keep, stage: s.stage, friends: s.friends, grownAt: s.grownAt, friendAt: s.friendAt, active: -1, teaReady: true, teaStartAt: nowMs() });
  useProgress.getState().patch({ treesPlanted: TREE_COUNT });
}

// ---- tea party -------------------------------------------------------------------------------
const guestList = (): GuestId[] => guestsFor(useProgress.getState().treesPlanted);

export const nextTeaTarget = (): GuestId | null => guestList().find((g) => !get().tea[g]) ?? null;

export function selectTarget(g: GuestId): void {
  sfx('tap');
  set({ pourTarget: g, selectedTreat: null });
}

export function selectTreat(t: TreatId | null): void {
  sfx('tap');
  set({ selectedTreat: t });
  if (t) showCaption('Hint', 'Now tap who gets the treat!', 'hint', 4000);
}

export function startPour(): void {
  if (get().pouring || get().celebrating) return;
  const target = get().pourTarget && !get().tea[get().pourTarget!] ? get().pourTarget : nextTeaTarget();
  if (!target) return;
  sfx('tap');
  set({ pouring: { start: nowMs() }, pourTarget: target, selectedTreat: null });
}

export function endPour(): void {
  const p = get().pouring;
  if (!p) return;
  const target = get().pourTarget;
  const level = levelAt((nowMs() - p.start) / 1000);
  const result = judgePour(level);
  set({ pouring: null });
  if (!target) return;
  const cup = cupWorldPos(target);
  if (result === 'low') {
    sfx('oops');
    set({ lastPour: { id: ++capId, result, guest: target } });
    showCaption('Luna', LOW_LINE, 'hint', 3000);
    return;
  }
  set({ tea: { ...get().tea, [target]: true }, lastPour: { id: ++capId, result, guest: target } });
  const lines = GUEST_LINES[target];
  if (result === 'splash') {
    sfx('splash');
    setTimeout(() => sfx('oops'), 120);
    emit('splash', [cup[0], 1.1, cup[2]], 40);
    showCaption(GUEST_NAMES[target], SPLASH_LINE, 'talk', 4200);
    void say(SPLASH_LINE, { speaker: target });
  } else {
    sfx(result === 'perfect' ? 'sparkle' : 'pop');
    if (result === 'perfect') emit('sparkle', [cup[0], 1.3, cup[2]], 16);
    const text = `${result === 'perfect' ? PERFECT_LINE : OK_LINE} ${lines.tea}`;
    showCaption(GUEST_NAMES[target], text, 'talk', 4200);
    void say(lines.tea, { speaker: target });
  }
  set({ pourTarget: nextTeaTarget() });
  checkDone();
}

export function serveTreat(g: GuestId): void {
  const t = get().selectedTreat;
  if (!t) return selectTarget(g);
  if (get().treat[g]) {
    sfx('tap');
    showCaption(GUEST_NAMES[g], 'I already have a yummy treat, thank you!', 'talk', 3000);
    return;
  }
  sfx('pop');
  const c = cupWorldPos(g);
  emit('sparkle', [c[0], 1.2, c[2]], 12);
  set({ treat: { ...get().treat, [g]: true } });
  const line = GUEST_LINES[g].treat;
  showCaption(GUEST_NAMES[g], line, 'talk', 4200);
  void say(line, { speaker: g });
  checkDone();
}

export function guestTap(g: GuestId): void {
  if (get().selectedTreat) serveTreat(g);
  else selectTarget(g);
}

export const allServed = (): boolean => guestList().every((g) => get().tea[g] && get().treat[g]);

function checkDone(): void {
  if (allServed() && !get().celebrating) finishTeaParty();
}

/** Tea party finished: brick, celebration. Exported for auto-play. */
export function finishTeaParty(): void {
  const pr = useProgress.getState();
  const first = pr.bricks.woods < 1;
  pr.setTeaPartyDone();
  pr.earnBrick('woods', 1);
  set({ celebrating: true, firstBrick: first, pouring: null, selectedTreat: null });
  setTimeout(() => sfx('fanfare'), 500);
  emit('confetti', [0, 2.5, TEA_CENTER[2]], 90);
  setTimeout(() => emit('confetti', [-2, 2.5, TEA_CENTER[2]], 60), 500);
  setTimeout(() => emit('confetti', [2, 2.5, TEA_CENTER[2]], 60), 900);
}

export function serveAll(): void {
  const tea: WoodsState['tea'] = {};
  const treat: WoodsState['treat'] = {};
  for (const g of guestsFor(TREE_COUNT)) {
    tea[g] = true;
    treat[g] = true;
  }
  set({ tea, treat });
}

export function replayTeaParty(): void {
  set({ tea: {}, treat: {}, celebrating: false, pouring: null, selectedTreat: null, lastPour: null, pourTarget: guestsFor(TREE_COUNT)[0] });
  showCaption('Luna', 'Another tea party! Hold the teapot to pour.', 'hint', 5000);
}

// ---- layout of the tea table ------------------------------------------------------------------
export function seatAngle(index: number, count: number): number {
  return count <= 1 ? 0 : -1.7 + (index / (count - 1)) * 3.4;
}
export function guestWorldPos(g: GuestId): [number, number, number] {
  const list = guestsFor(TREE_COUNT);
  const a = seatAngle(Math.max(0, list.indexOf(g)), list.length);
  return [TEA_CENTER[0] + 4.2 * Math.sin(a), 0, TEA_CENTER[2] - 4.2 * Math.cos(a)];
}
export function cupWorldPos(g: GuestId): [number, number, number] {
  const list = guestsFor(TREE_COUNT);
  const idx = Math.max(0, list.indexOf(g));
  const a = seatAngle(idx, list.length);
  return [TEA_CENTER[0] + 1.7 * Math.sin(a), 0.95, TEA_CENTER[2] - 1.7 * Math.cos(a)];
}
