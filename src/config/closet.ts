/** What kind of garment it is (drives the wardrobe grouping). */
export type ClosetSlot = 'headwear' | 'eyewear' | 'outerwear' | 'outfit' | 'footwear' | 'pets';

/**
 * Where on the shared figure anchors the item sits. Two items never share an anchor: equipping one that does
 * replaces the other, so nothing clips. Each anchor is fitted in the models (avatarParts.ts / build_figures.py):
 * crown = hair bow on top of the head, brow = visor band + brim, eyes = star glasses, back = cape behind the shoulders,
 * torso = lab coat over body and dress (clears the skirt), waist = dress skirt, feet = boots, pets = party hats.
 */
export type ClosetAnchor = 'crown' | 'brow' | 'eyes' | 'back' | 'torso' | 'waist' | 'feet' | 'pets';

export interface ClosetItem {
  id: string;
  name: string;
  emoji: string;
  slot: ClosetSlot;
  anchor: ClosetAnchor;
  /** Birthday Bricks needed when all 7 bricks exist (1..7). Scaled down when fewer zones are built. */
  unlockAt: number;
}

export const FULL_BRICK_COUNT = 7;

export const closetItems: ClosetItem[] = [
  { id: 'bow', name: 'Big pink hair bow', emoji: '🎀', slot: 'headwear', anchor: 'crown', unlockAt: 1 },
  { id: 'dress', name: 'Polka-dot dress', emoji: '👗', slot: 'outfit', anchor: 'waist', unlockAt: 2 },
  { id: 'cape', name: 'Sparkly cape', emoji: '✨', slot: 'outerwear', anchor: 'back', unlockAt: 3 },
  { id: 'pethats', name: 'Pet party hats', emoji: '🥳', slot: 'pets', anchor: 'pets', unlockAt: 4 },
  { id: 'visor', name: 'Tennis visor', emoji: '🎾', slot: 'headwear', anchor: 'brow', unlockAt: 5 },
  { id: 'labcoat', name: 'Lab coat', emoji: '🥼', slot: 'outerwear', anchor: 'torso', unlockAt: 6 },
  { id: 'boots', name: 'Red rain boots', emoji: '🥾', slot: 'footwear', anchor: 'feet', unlockAt: 7 },
  { id: 'sunglasses', name: 'Blue star sunglasses', emoji: '😎', slot: 'eyewear', anchor: 'eyes', unlockAt: 7 },
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

/** The equipped list after toggling `id`: removes it if worn, otherwise adds it and drops any item sharing its anchor. */
export function toggleEquipped(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((x) => x !== id);
  const item = closetItems.find((i) => i.id === id);
  if (!item) return current;
  const clash = new Set(closetItems.filter((i) => i.anchor === item.anchor).map((i) => i.id));
  return [...current.filter((x) => !clash.has(x)), id];
}

/** Closet items grouped by wardrobe slot, in display order. */
export const closetSlots: ClosetSlot[] = ['headwear', 'eyewear', 'outfit', 'outerwear', 'footwear', 'pets'];
