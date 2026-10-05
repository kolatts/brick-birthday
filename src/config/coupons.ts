import type { CouponId, ZoneId } from '../types';

export interface CouponDef {
  id: CouponId;
  title: string;
  zone: ZoneId;
  illustration: string;
  line: string;
}

function coupon(id: CouponId, title: string, zone: ZoneId): CouponDef {
  return { id, title, zone, illustration: `art/coupon-${id}.webp`, line: `Good for one Daddy-Daughter ${title} Date!` };
}

// To add a music coupon later: add 'music' to CouponId in types.ts, set `coupon: 'music'` on the zone, and add a line here.
export const coupons: CouponDef[] = [
  coupon('movies', 'Movies', 'story'),
  coupon('videogames', 'Video Game Day', 'science'),
  coupon('shopping', 'Shopping', 'tennis'),
  coupon('icecream', 'Ice Cream', 'woods'),
];

export const couponById = (id: CouponId): CouponDef => coupons.find((c) => c.id === id)!;
