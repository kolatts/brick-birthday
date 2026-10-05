import { create } from 'zustand';
import type { ZoneId } from '../types';
import { ZONE_IDS } from '../types';
import { zones, builtZones, brickGoal } from '../config/zones';

export const PROGRESS_KEY = 'brick-birthday:progress';
export const PROGRESS_VERSION = 1;

export interface ProgressData {
  bricks: Record<ZoneId, number>;
  storiesFinished: number;
  familyHeroStoryDone: boolean;
  experimentsDone: string[];
  rallies: number;
  instrumentsPlayed: string[];
  treesPlanted: number;
  teaPartyDone: boolean;
  closetUnlocked: string[];
  finaleSeen: boolean;
  challengesDone: Record<ZoneId, boolean>;
}

const zoneRecord = <T,>(value: T): Record<ZoneId, T> =>
  Object.fromEntries(ZONE_IDS.map((z) => [z, value])) as Record<ZoneId, T>;

export function defaultProgress(): ProgressData {
  return {
    bricks: zoneRecord(0),
    storiesFinished: 0,
    familyHeroStoryDone: false,
    experimentsDone: [],
    rallies: 0,
    instrumentsPlayed: [],
    treesPlanted: 0,
    teaPartyDone: false,
    closetUnlocked: [],
    finaleSeen: false,
    challengesDone: zoneRecord(false),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Validates a raw parsed object; returns defaults for anything with a wrong shape. */
export function migrate(raw: unknown): ProgressData {
  const d = defaultProgress();
  try {
    if (!isObj(raw) || raw.version !== PROGRESS_VERSION || !isObj(raw.data)) return d;
    const r = raw.data;
    if (!isObj(r.bricks) || !isObj(r.challengesDone)) return d;
    const bricks = zoneRecord(0);
    const challengesDone = zoneRecord(false);
    for (const z of ZONE_IDS) {
      const b = r.bricks[z];
      if (!isCount(b)) return d;
      bricks[z] = Math.min(Math.floor(b), zones[z].bricks);
      const c = r.challengesDone[z];
      if (typeof c !== 'boolean') return d;
      challengesDone[z] = c;
    }
    if (
      !isCount(r.storiesFinished) || typeof r.familyHeroStoryDone !== 'boolean' || !isStrArr(r.experimentsDone) ||
      !isCount(r.rallies) || !isStrArr(r.instrumentsPlayed) || !isCount(r.treesPlanted) ||
      typeof r.teaPartyDone !== 'boolean' || !isStrArr(r.closetUnlocked) || typeof r.finaleSeen !== 'boolean'
    ) return d;
    return {
      bricks, challengesDone,
      storiesFinished: r.storiesFinished, familyHeroStoryDone: r.familyHeroStoryDone,
      experimentsDone: r.experimentsDone, rallies: r.rallies, instrumentsPlayed: r.instrumentsPlayed,
      treesPlanted: r.treesPlanted, teaPartyDone: r.teaPartyDone, closetUnlocked: r.closetUnlocked,
      finaleSeen: r.finaleSeen,
    };
  } catch {
    return d;
  }
}

/** Reads localStorage; never throws. */
export function load(): ProgressData {
  try {
    const text = localStorage.getItem(PROGRESS_KEY);
    if (!text) return defaultProgress();
    return migrate(JSON.parse(text));
  } catch {
    return defaultProgress();
  }
}

function save(data: ProgressData): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ version: PROGRESS_VERSION, data }));
  } catch {
    /* storage unavailable: play on */
  }
}

interface ProgressActions {
  earnBrick: (zone: ZoneId, n?: number) => void;
  setChallengeDone: (zone: ZoneId) => void;
  patch: (p: Partial<ProgressData>) => void;
  totalBricks: () => number;
  goalReached: () => boolean;
  reset: () => void;
  unlockAll: () => void;
  unlockAllChallenges: () => void;
}

export type ProgressState = ProgressData & ProgressActions;

export const useProgress = create<ProgressState>((set, get) => ({
  ...load(),
  earnBrick: (zone, n = 1) =>
    set((s) => ({ bricks: { ...s.bricks, [zone]: Math.max(0, Math.min(zones[zone].bricks, s.bricks[zone] + n)) } })),
  setChallengeDone: (zone) => set((s) => ({ challengesDone: { ...s.challengesDone, [zone]: true } })),
  patch: (p) => set(p),
  totalBricks: () => builtZones().reduce((sum, z) => sum + get().bricks[z.id], 0),
  goalReached: () => get().totalBricks() >= brickGoal(),
  reset: () => set(defaultProgress()),
  unlockAll: () => set((s) => ({ bricks: { ...s.bricks, ...Object.fromEntries(builtZones().map((z) => [z.id, z.bricks])) } })),
  unlockAllChallenges: () => set((s) => ({ challengesDone: { ...s.challengesDone, ...Object.fromEntries(builtZones().map((z) => [z.id, true])) } })),
}));

function snapshot(s: ProgressState): ProgressData {
  return {
    bricks: s.bricks, storiesFinished: s.storiesFinished, familyHeroStoryDone: s.familyHeroStoryDone,
    experimentsDone: s.experimentsDone, rallies: s.rallies, instrumentsPlayed: s.instrumentsPlayed,
    treesPlanted: s.treesPlanted, teaPartyDone: s.teaPartyDone, closetUnlocked: s.closetUnlocked,
    finaleSeen: s.finaleSeen, challengesDone: s.challengesDone,
  };
}

useProgress.subscribe((s) => save(snapshot(s)));
