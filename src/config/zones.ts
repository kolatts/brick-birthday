import type { CouponId, ZoneId } from '../types';
import { ZONE_IDS } from '../types';

export interface ZoneDef {
  id: ZoneId;
  title: string;
  host: string;
  built: boolean;
  bricks: number;
  coupon?: CouponId;
  color: string;
}

export const zones: Record<ZoneId, ZoneDef> = {
  story: { id: 'story', title: 'Story Tower', host: 'mom', built: true, bricks: 2, coupon: 'movies', color: '#E63946' },
  science: { id: 'science', title: 'Science Lab', host: 'julian', built: true, bricks: 2, coupon: 'videogames', color: '#7AE582' },
  tennis: { id: 'tennis', title: 'Tennis Court', host: 'darian', built: true, bricks: 1, coupon: 'shopping', color: '#FFD60A' },
  music: { id: 'music', title: 'Music Stage', host: 'dad', built: true, bricks: 1, color: '#3A86FF' },
  woods: { id: 'woods', title: 'Whispering Woods', host: 'rudolph', built: true, bricks: 1, coupon: 'icecream', color: '#2E8B57' },
};

export const zoneList: ZoneDef[] = ZONE_IDS.map((id) => zones[id]);

export function builtZones(): ZoneDef[] {
  return zoneList.filter((z) => z.built);
}

/** Total bricks needed for the finale: only built zones count. */
export function brickGoal(): number {
  return builtZones().reduce((sum, z) => sum + z.bricks, 0);
}

export function zoneForCoupon(coupon: CouponId): ZoneId | undefined {
  return zoneList.find((z) => z.coupon === coupon)?.id;
}
