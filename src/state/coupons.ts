import { create } from 'zustand';
import type { CouponId } from '../types';
import { COUPON_IDS } from '../types';
import { coupons, couponById } from '../config/coupons';
import { zones } from '../config/zones';
import { useProgress } from './progress';
import type { ZoneId } from '../types';

export const COUPONS_KEY = 'brick-birthday:coupons';
export type CouponStatus = 'locked' | 'available' | 'dug';

interface CouponData {
  /** Challenge finished; a dig spot is waiting in the hub. */
  challengeComplete: CouponId[];
  dug: CouponId[];
}

const empty = (): CouponData => ({ challengeComplete: [], dug: [] });
const idList = (v: unknown): CouponId[] =>
  Array.isArray(v) ? v.filter((x): x is CouponId => COUPON_IDS.includes(x as CouponId)) : [];

export function loadCoupons(): CouponData {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(COUPONS_KEY) ?? 'null');
    if (typeof raw !== 'object' || raw === null || (raw as { version?: unknown }).version !== 1) return empty();
    const d = (raw as { data?: Record<string, unknown> }).data ?? {};
    return { challengeComplete: idList(d.challengeComplete), dug: idList(d.dug) };
  } catch {
    return empty();
  }
}

interface CouponActions {
  /** Challenge for `zone` finished: dig spot appears (does NOT touch bricks). */
  markChallengeComplete: (zone: ZoneId) => void;
  /** Dig sequence finished: the coupon is in the box. */
  markDug: (id: CouponId) => void;
  status: (id: CouponId) => CouponStatus;
  digPending: (id: CouponId) => boolean;
  unlockAllChallenges: () => void;
  reset: () => void;
}

export const useCoupons = create<CouponData & CouponActions>((set, get) => ({
  ...loadCoupons(),
  markChallengeComplete: (zone) => {
    const def = coupons.find((c) => c.zone === zone);
    useProgress.getState().setChallengeDone(zone);
    if (!def) return;
    set((s) => (s.challengeComplete.includes(def.id) ? s : { challengeComplete: [...s.challengeComplete, def.id] }));
  },
  markDug: (id) => set((s) => (s.dug.includes(id) ? s : { dug: [...s.dug, id] })),
  status: (id) => {
    const s = get();
    if (s.dug.includes(id)) return 'dug';
    const zone = couponById(id).zone;
    return useProgress.getState().bricks[zone] >= zones[zone].bricks ? 'available' : 'locked';
  },
  digPending: (id) => get().challengeComplete.includes(id) && !get().dug.includes(id),
  unlockAllChallenges: () => {
    for (const c of coupons) {
      if (zones[c.zone].built) get().markChallengeComplete(c.zone);
    }
  },
  reset: () => set(empty()),
}));

useCoupons.subscribe((s) => {
  try {
    localStorage.setItem(
      COUPONS_KEY,
      JSON.stringify({ version: 1, data: { challengeComplete: s.challengeComplete, dug: s.dug } }),
    );
  } catch {
    /* ignore */
  }
});
