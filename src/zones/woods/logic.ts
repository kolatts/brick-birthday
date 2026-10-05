/** Pure game logic for the Woods: tea pouring and Tea Party Orders. No React, no stores. */

// ---- Tea pouring -----------------------------------------------------------
/** Seconds of holding to fill a cup right to the brim. */
export const POUR_SECONDS = 2.4;
export type PourResult = 'low' | 'ok' | 'perfect' | 'splash';
export const LEVEL_OK_MIN = 0.28;
export const LEVEL_PERFECT_MIN = 0.55;
export const LEVEL_PERFECT_MAX = 0.95;

/** Cup fill level (0..1.4) after holding for `heldSeconds`. 1 = brim; above = overflow. */
export const levelAt = (heldSeconds: number): number => Math.max(0, Math.min(1.4, heldSeconds / POUR_SECONDS));

export function judgePour(level: number): PourResult {
  if (level >= 1) return 'splash';
  if (level >= LEVEL_PERFECT_MIN && level <= LEVEL_PERFECT_MAX) return 'perfect';
  if (level >= LEVEL_OK_MIN) return 'ok';
  return 'low';
}

// ---- Tea Party Orders ------------------------------------------------------
export type ItemId = 'sugar' | 'lemon' | 'milk' | 'cake' | 'cookie' | 'scone' | 'honey';
export const ITEMS: { id: ItemId; label: string; emoji: string }[] = [
  { id: 'sugar', label: 'Sugar cube', emoji: '🧊' },
  { id: 'lemon', label: 'Lemon slice', emoji: '🍋' },
  { id: 'milk', label: 'Milk', emoji: '🥛' },
  { id: 'cake', label: 'Strawberry cake', emoji: '🍰' },
  { id: 'cookie', label: 'Cookie', emoji: '🍪' },
  { id: 'scone', label: 'Scone', emoji: '🥐' },
  { id: 'honey', label: 'Honey', emoji: '🍯' },
];
export const itemById = (id: ItemId) => ITEMS.find((i) => i.id === id)!;

export type Scoop = 'strawberry' | 'vanilla' | 'chocolate' | 'mint';
export const SCOOPS: { id: Scoop; label: string; color: string }[] = [
  { id: 'strawberry', label: 'Strawberry', color: '#FF8FB8' },
  { id: 'vanilla', label: 'Vanilla', color: '#FFF1C2' },
  { id: 'chocolate', label: 'Chocolate', color: '#8B5A3C' },
  { id: 'mint', label: 'Mint', color: '#8FE8C0' },
];
export const scoopById = (id: Scoop) => SCOOPS.find((s) => s.id === id)!;

export type Order =
  | { kind: 'plate'; guest: 'dad' | 'mom' | 'julian' | 'darian'; items: ItemId[]; line: string }
  | { kind: 'sundae'; guest: 'jinglebells'; scoops: [Scoop, Scoop, Scoop]; cherry: true; line: string };

export const ORDERS: Order[] = [
  { kind: 'plate', guest: 'dad', items: ['sugar', 'sugar', 'cake'], line: 'Two sugar cubes and a strawberry cake, please!' },
  { kind: 'plate', guest: 'mom', items: ['scone', 'honey'], line: 'A scone with a drizzle of honey, please!' },
  { kind: 'plate', guest: 'julian', items: ['cookie', 'lemon', 'milk'], line: 'One cookie, one lemon slice, and some milk. For science!' },
  { kind: 'plate', guest: 'darian', items: ['cookie', 'cookie', 'scone'], line: 'Two cookies and a scone. I am hungry from tennis!' },
  { kind: 'sundae', guest: 'jinglebells', scoops: ['vanilla', 'strawberry', 'mint'], cherry: true, line: 'Purr... one sundae: vanilla, strawberry, mint, and a cherry on top!' },
];

const sortedKey = (a: string[]): string => [...a].sort().join('|');

/** A plate matches when it holds exactly the ordered items (any tapping order). */
export function checkPlate(order: ItemId[], plate: ItemId[]): boolean {
  return order.length === plate.length && sortedKey(order) === sortedKey(plate);
}

export interface SundaeBuild {
  scoops: Scoop[];
  cherry: boolean;
}

/** Scoops must match in the order shown, bottom to top, with a cherry on top. */
export function checkSundae(order: { scoops: Scoop[]; cherry: boolean }, built: SundaeBuild): boolean {
  return (
    built.cherry === order.cherry &&
    built.scoops.length === order.scoops.length &&
    built.scoops.every((s, i) => s === order.scoops[i])
  );
}

export const WRONG_LINES = [
  'That is... creative! Try again?',
  'Hmm! That is a very silly plate. Let us try again!',
  'Ooh, a mystery snack! But not quite what I ordered. Again?',
];
export const wrongLine = (attempt: number): string => WRONG_LINES[attempt % WRONG_LINES.length];

export const HAPPY_LINES = ['Yum! Exactly right!', 'Perfect order, Luna!', 'You are the best tea-party host!', 'Delicious! Thank you!', 'A sundae fit for a queen!'];
export const CHALLENGE_DONE_LINE = 'Something is buried near the Whispering Woods…';
