export type PersonId = 'luna' | 'mom' | 'dad' | 'julian' | 'darian' | 'rudolph' | 'jinglebells';
export type Expression = 'happy' | 'surprised' | 'silly';
export type ZoneId = 'story' | 'science' | 'tennis' | 'music' | 'woods';
export type CouponId = 'movies' | 'videogames' | 'shopping' | 'icecream';
export type Screen =
  | { kind: 'title' }
  | { kind: 'hub' }
  | { kind: 'zone'; zone: ZoneId }
  | { kind: 'challenge'; zone: ZoneId }
  | { kind: 'finale' };

export const PERSON_IDS: PersonId[] = ['luna', 'mom', 'dad', 'julian', 'darian', 'rudolph', 'jinglebells'];
export const EXPRESSIONS: Expression[] = ['happy', 'surprised', 'silly'];
export const ZONE_IDS: ZoneId[] = ['story', 'science', 'tennis', 'music', 'woods'];
export const COUPON_IDS: CouponId[] = ['movies', 'videogames', 'shopping', 'icecream'];
