export type PersonId = 'luna' | 'mom' | 'dad' | 'julian' | 'darian' | 'rudolph' | 'jinglebells';
export type Expression = 'happy' | 'surprised' | 'silly';
export type ZoneId = 'story' | 'science' | 'tennis' | 'music' | 'woods';
export type CouponId = 'movies' | 'videogames' | 'shopping' | 'icecream';
export type Screen =
  | { kind: 'title' }
  | { kind: 'hub' }
  | { kind: 'zone'; zone: ZoneId }
  | { kind: 'challenge'; zone: ZoneId }
  | { kind: 'finale' }
  | { kind: 'grownup' };

export interface FamilyPack {
  schemaVersion: 1;
  portraits: Partial<Record<PersonId, Partial<Record<Expression, string>>>>; // data:image/webp;base64,...
  album: string[]; // data URLs, 1600px max edge
  passwords: Record<CouponId, string>; // WORD-WORD-NN
  message?: string; // finale message from Mom & Dad
}

export const PERSON_IDS: PersonId[] = ['luna', 'mom', 'dad', 'julian', 'darian', 'rudolph', 'jinglebells'];
export const EXPRESSIONS: Expression[] = ['happy', 'surprised', 'silly'];
export const ZONE_IDS: ZoneId[] = ['story', 'science', 'tennis', 'music', 'woods'];
export const COUPON_IDS: CouponId[] = ['movies', 'videogames', 'shopping', 'icecream'];
