import type { CouponId, ZoneId } from '../types';

export interface CouponDef {
  id: CouponId;
  title: string;
  zone: ZoneId;
  /** Hero scene (Daddy and Luna on the date), used on the coupon card and the title row. */
  illustration: string;
  /** Small brick-object icon for Coupon Box tiles. */
  icon: string;
  /** The coupon phrased as an experience, e.g. "Movie date with Daddy". */
  experience: string;
  line: string;
}

function coupon(id: CouponId, title: string, zone: ZoneId, experience: string): CouponDef {
  return { id, title, zone, experience, illustration: `art/coupon-scene-${id}.webp`, icon: `art/coupon-${id}.webp`, line: `Good for one Daddy-Daughter ${title} Date!` };
}

// To add a music coupon later: add 'music' to CouponId in types.ts, set `coupon: 'music'` on the zone, and add a line here.
export const coupons: CouponDef[] = [
  coupon('movies', 'Movies', 'story', 'Movie date with Daddy'),
  coupon('videogames', 'Video Game Day', 'science', 'Video game date with Daddy'),
  coupon('shopping', 'Shopping', 'tennis', 'Shopping date with Daddy'),
  coupon('icecream', 'Ice Cream', 'woods', 'Ice cream date with Daddy'),
];

export const couponById = (id: CouponId): CouponDef => coupons.find((c) => c.id === id)!;
