import { family } from '../../config/family';
import { celebrationAge } from '../../config/age';
import type { PersonId } from '../../types';
import type { FriendId } from '../../zones/woods/facts';

export type V3 = [number, number, number];
export type GuestKey = PersonId | FriendId;

export const TABLE_Y = 0.96;
export const TIER_WIDTHS = [3.0, 2.1, 1.3];
export const TIER_HEIGHT = 0.5;
export const TIER_COUNT = 3;

/** Number of Birthday Bricks that fly in (one per collected brick, but always enough for 3 tiers). */
export const cakePieceCount = (bricks: number): number => Math.max(3, Math.min(7, bricks));

export interface CakePiece {
  tier: number;
  y: number;
  height: number;
  width: number;
}

/** Splits the 3 tiers into `pieces` stacked layers (bottom to top). */
export function cakePieces(pieces: number): CakePiece[] {
  const per = [0, 0, 0];
  for (let i = 0; i < pieces; i++) per[Math.floor((i * TIER_COUNT) / pieces)]++;
  const out: CakePiece[] = [];
  let y = TABLE_Y;
  per.forEach((n, tier) => {
    for (let k = 0; k < n; k++) {
      const height = TIER_HEIGHT / n;
      out.push({ tier, y: y + height / 2, height, width: TIER_WIDTHS[tier] });
      y += height;
    }
    y += 0.1; // frosting band between tiers
  });
  return out;
}

export const cakeTopY = (pieces: number): number => {
  const l = cakePieces(pieces).at(-1)!;
  return l.y + l.height / 2;
};

/** Candle positions (x, z) on the top tier. */
export function candleOffsets(n: number): [number, number][] {
  if (n <= 1) return [[0, 0]];
  const r = Math.min(0.5, 0.2 + 0.04 * n);
  return Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r] as [number, number]);
}

export const lunaBirthDate = (): string => family.luna.birthDate ?? '2019-10-16';
export const candleCount = (now: Date = new Date()): number => Math.max(1, celebrationAge(lunaBirthDate(), now));

/** "October 16, 2026": the birthday being celebrated this year. */
export function finaleDateLabel(now: Date = new Date()): string {
  const [, m, d] = lunaBirthDate().split('-').map(Number);
  return new Date(now.getFullYear(), m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export interface Seat {
  id: GuestKey;
  /** Where they sit at the tea table. */
  seat: V3;
  seatYaw: number;
  /** Where they stand in the family portrait. */
  line: V3;
  scale: number;
  kind: 'person' | 'pet' | 'friend';
}

const R = 4.0;
/** Luna sits on a little brick throne so she is never hidden behind the cake. */
export const LUNA_SEAT_Y = 1.25;
const arc = (theta: number): V3 => [R * Math.sin(theta), 0, -R * Math.cos(theta)];
const face = (p: V3): number => Math.atan2(-p[0], -p[2]);

const PEOPLE: { id: PersonId; theta: number; line: V3; scale: number; kind: 'person' | 'pet' }[] = [
  { id: 'luna', theta: 0, line: [0, 0, 5.4], scale: 1.05, kind: 'person' },
  { id: 'mom', theta: -0.55, line: [-1.7, 0, 4.0], scale: 0.8, kind: 'person' },
  { id: 'dad', theta: 0.55, line: [1.7, 0, 4.0], scale: 0.8, kind: 'person' },
  { id: 'julian', theta: -1.1, line: [-3.6, 0, 4.2], scale: 0.8, kind: 'person' },
  { id: 'darian', theta: 1.1, line: [3.6, 0, 4.2], scale: 0.8, kind: 'person' },
  { id: 'rudolph', theta: -1.65, line: [-2.2, 0, 5.8], scale: 0.95, kind: 'pet' },
  { id: 'jinglebells', theta: 1.65, line: [2.2, 0, 5.8], scale: 0.92, kind: 'pet' },
];

const FRIENDS: { id: FriendId; seat: V3; line: V3 }[] = [
  { id: 'fox', seat: [-5.2, 0, 3.4], line: [-3.6, 0, 6.6] },
  { id: 'deer', seat: [-3.7, 0, 4.2], line: [-1.8, 0, 7.0] },
  { id: 'songbird', seat: [-2.3, 0, 4.7], line: [0, 0, 7.2] },
  { id: 'squirrel', seat: [2.5, 0, 4.7], line: [1.8, 0, 7.0] },
  { id: 'rabbit', seat: [4.0, 0, 4.2], line: [3.6, 0, 6.6] },
];

export const SEATS: Seat[] = [
  ...PEOPLE.map((p): Seat => {
    const seat = arc(p.theta);
    if (p.id === 'luna') { seat[1] = LUNA_SEAT_Y; seat[2] = -5.2; }
    return { id: p.id, seat, seatYaw: face(seat), line: p.line, scale: p.scale, kind: p.kind };
  }),
  ...FRIENDS.map((f): Seat => ({ id: f.id, seat: f.seat, seatYaw: face(f.seat), line: f.line, scale: 1.1, kind: 'friend' })),
];

export const TABLE_CAM = { pos: [0, 7.4, 14.2] as V3, look: [0, 1.9, -0.6] as V3 };
export const ALBUM_CAM = { pos: [0, 3.6, 17.2] as V3, look: [0, 1.5, 5.3] as V3 };
