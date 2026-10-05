export type ClosetSlot = 'head' | 'body' | 'feet' | 'pets';

export interface ClosetItem {
  id: string;
  name: string;
  emoji: string;
  slot: ClosetSlot;
  /** Birthday Bricks needed when all 7 bricks exist (1..7). Scaled down when fewer zones are built. */
  unlockAt: number;
}

export const FULL_BRICK_COUNT = 7;

export const closetItems: ClosetItem[] = [
  { id: 'bow', name: 'Big pink hair bow', emoji: '🎀', slot: 'head', unlockAt: 1 },
  { id: 'dress', name: 'Polka-dot dress', emoji: '👗', slot: 'body', unlockAt: 2 },
  { id: 'cape', name: 'Sparkly cape', emoji: '✨', slot: 'body', unlockAt: 3 },
  { id: 'pethats', name: 'Pet party hats', emoji: '🥳', slot: 'pets', unlockAt: 4 },
  { id: 'visor', name: 'Tennis visor', emoji: '🎾', slot: 'head', unlockAt: 5 },
  { id: 'labcoat', name: 'Lab coat', emoji: '🥼', slot: 'body', unlockAt: 6 },
  { id: 'boots', name: 'Red rain boots', emoji: '🥾', slot: 'feet', unlockAt: 7 },
  { id: 'sunglasses', name: 'Blue star sunglasses', emoji: '😎', slot: 'head', unlockAt: 7 },
];

/** Bricks needed to unlock `item`, scaled to the adaptive goal (so a 3-brick game can still unlock everything). */
export function unlockThreshold(item: ClosetItem, goal: number): number {
  if (goal >= FULL_BRICK_COUNT) return item.unlockAt;
  return Math.max(1, Math.ceil((item.unlockAt * goal) / FULL_BRICK_COUNT));
}

export function isUnlocked(item: ClosetItem, totalBricks: number, goal: number): boolean {
  if (goal > 0 && totalBricks >= goal) return true;
  return totalBricks >= unlockThreshold(item, goal);
}

export function unlockedItems(totalBricks: number, goal: number): ClosetItem[] {
  return closetItems.filter((i) => isUnlocked(i, totalBricks, goal));
}
