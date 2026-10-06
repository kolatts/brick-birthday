/** Pure rules for the Science Lab: experiment progression, potion mixing, sink/float, rocket height. */

export const EXPERIMENT_IDS = ['potion', 'float', 'rocket', 'crystal', 'seed'] as const;
export type ExperimentId = (typeof EXPERIMENT_IDS)[number];

export const EXPERIMENT_TITLES: Record<ExperimentId, string> = {
  potion: 'Color potion',
  float: 'Sink or float',
  rocket: 'Brick rocket',
  crystal: 'Grow crystals',
  seed: 'Plant a seed',
};

/** Distinct experiments needed for each Birthday Brick. */
export const BRICK_THRESHOLDS = [2, 5] as const;

export function bricksFor(experimentCount: number): number {
  return BRICK_THRESHOLDS.filter((t) => experimentCount >= t).length;
}

export interface CompleteResult {
  done: string[];
  /** Total bricks the done list is worth. */
  bricks: number;
  /** Bricks newly earned by this completion (vs the bricks already held). */
  gained: number;
  isNew: boolean;
}

/** Records an experiment as done (replays are fine) and says how many bricks that earns. */
export function completeExperiment(done: string[], id: ExperimentId, bricksHeld: number): CompleteResult {
  const isNew = !done.includes(id);
  const next = isNew ? [...done, id] : done;
  const distinct = EXPERIMENT_IDS.filter((e) => next.includes(e)).length;
  const bricks = bricksFor(distinct);
  return { done: next, bricks, gained: Math.max(0, bricks - bricksHeld), isNew };
}

// ---- 1. color-changing potion --------------------------------------------------------------
export type PotionAdd = 'lemon' | 'soda';
export const CABBAGE_COLOR = '#8B4FD0';
export const POTION_RESULT: Record<PotionAdd, { color: string; name: string; why: string }> = {
  lemon: { color: '#FF6FB5', name: 'pink', why: 'Lemon is an acid, and acids turn red cabbage juice pink!' },
  soda: { color: '#46D07A', name: 'green', why: 'Baking soda is a base, and bases turn red cabbage juice green!' },
};

// ---- 2. sink or float ----------------------------------------------------------------------
export type FloatId = 'brick' | 'cork' | 'apple' | 'coin' | 'duck' | 'stone';
export interface FloatItem { id: FloatId; label: string; floats: boolean; why: string }
export const FLOAT_ITEMS: FloatItem[] = [
  { id: 'brick', label: 'Brick', floats: false, why: 'A solid brick is packed heavier than the water around it, so it sinks!' },
  { id: 'cork', label: 'Cork', floats: true, why: 'Cork is full of tiny air pockets, so it is lighter than water and floats!' },
  { id: 'apple', label: 'Apple', floats: true, why: 'Apples have air inside, so they are lighter than water and float!' },
  { id: 'coin', label: 'Coin', floats: false, why: 'A coin is metal, which is packed much heavier than water, so it sinks!' },
  { id: 'duck', label: 'Rubber duck', floats: true, why: 'The duck is hollow and full of air, so it is lighter than water and floats!' },
  { id: 'stone', label: 'Stone', floats: false, why: 'Stones are dense, which means very heavy for their size, so they sink!' },
];
export const floatItem = (id: FloatId): FloatItem => FLOAT_ITEMS.find((i) => i.id === id)!;

// ---- 3. brick rocket -----------------------------------------------------------------------
export const MAX_FUEL = 5;
/** Launch height in world units: more fuel always goes higher. */
export const rocketHeight = (fuel: number): number => 1.2 + Math.max(1, Math.min(MAX_FUEL, fuel)) * 0.95;
export const clampFuel = (n: number): number => Math.max(0, Math.min(MAX_FUEL, Math.floor(n)));

// ---- 4. crystal growing --------------------------------------------------------------------
export const CRYSTAL_TAPS = 6;

// ---- 5. seed science -----------------------------------------------------------------------
export type SeedNeed = 'water' | 'light' | 'soil';
export const SEED_NEEDS: SeedNeed[] = ['water', 'light', 'soil'];
export const seedSprouts = (given: SeedNeed[]): boolean => SEED_NEEDS.every((n) => given.includes(n));

// ---- Mystery Potion mixing -----------------------------------------------------------------
export type Ingredient = 'red' | 'blue' | 'yellow' | 'white' | 'glitter';
export const INGREDIENTS: { id: Ingredient; label: string; color: string }[] = [
  { id: 'red', label: 'Red berry', color: '#E63946' },
  { id: 'blue', label: 'Blue flower', color: '#3A86FF' },
  { id: 'yellow', label: 'Yellow lemon', color: '#FFD60A' },
  { id: 'white', label: 'White salt', color: '#FFFFFF' },
  { id: 'glitter', label: 'Glitter', color: '#FF8FD0' },
];
export const ingredientLabel = (i: Ingredient): string => INGREDIENTS.find((x) => x.id === i)!.label;

export type Hue = 'empty' | 'clear' | 'white' | 'red' | 'blue' | 'yellow' | 'purple' | 'green' | 'orange' | 'muddy';
export interface MixResult { hue: Hue; pastel: boolean; sparkly: boolean; key: string; color: string }

const HUE_HEX: Record<Hue, string> = {
  empty: '#CFE8F2', clear: '#D8F3FF', white: '#F4F6FF', red: '#E63946', blue: '#3A86FF', yellow: '#FFD60A',
  purple: '#8E44D0', green: '#2FBF5B', orange: '#FF8A1F', muddy: '#7A6A3A',
};

function lightenHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * k));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Simple rules: red+blue=purple, blue+yellow=green, red+yellow=orange, +white=pastel, +glitter=sparkly. Order and duplicates never matter. */
export function mix(ingredients: Ingredient[]): MixResult {
  const has = (i: Ingredient) => ingredients.includes(i);
  const r = has('red'), b = has('blue'), y = has('yellow');
  const chroma = [r, b, y].filter(Boolean).length;
  const white = has('white');
  const sparkly = has('glitter');
  let hue: Hue;
  if (ingredients.length === 0) hue = 'empty';
  else if (chroma === 0) hue = white ? 'white' : 'clear';
  else if (chroma === 3) hue = 'muddy';
  else if (chroma === 1) hue = r ? 'red' : b ? 'blue' : 'yellow';
  else hue = r && b ? 'purple' : b && y ? 'green' : 'orange';
  const pastel = white && chroma > 0 && hue !== 'muddy';
  const base = HUE_HEX[hue];
  return { hue, pastel, sparkly, key: `${hue}${pastel ? '-pastel' : ''}${sparkly ? '-sparkly' : ''}`, color: pastel ? lightenHex(base, 0.55) : base };
}

export interface PotionTarget { id: string; name: string; recipe: Ingredient[]; tier: 1 | 2 | 3 }
export const TARGETS: PotionTarget[] = [
  { id: 'purple', name: 'purple', recipe: ['red', 'blue'], tier: 1 },
  { id: 'green', name: 'green', recipe: ['blue', 'yellow'], tier: 1 },
  { id: 'orange', name: 'orange', recipe: ['red', 'yellow'], tier: 1 },
  { id: 'pink', name: 'pastel pink', recipe: ['red', 'white'], tier: 2 },
  { id: 'sky', name: 'pastel blue', recipe: ['blue', 'white'], tier: 2 },
  { id: 'cream', name: 'pastel yellow', recipe: ['yellow', 'white'], tier: 2 },
  { id: 'sparkle-purple', name: 'sparkly purple', recipe: ['red', 'blue', 'glitter'], tier: 3 },
  { id: 'sparkle-green', name: 'sparkly green', recipe: ['blue', 'yellow', 'glitter'], tier: 3 },
  { id: 'sparkle-orange', name: 'sparkly orange', recipe: ['red', 'yellow', 'glitter'], tier: 3 },
];
export const ROUNDS = 3;
export const targetResult = (t: PotionTarget): MixResult => mix(t.recipe);
export const matchesTarget = (picked: Ingredient[], t: PotionTarget): boolean => mix(picked).key === targetResult(t).key;

/** One target per round, easy to fancy (plain mix, pastel, sparkly). `rand` is injectable for tests. */
export function pickTargets(rand: () => number = Math.random): PotionTarget[] {
  return ([1, 2, 3] as const).map((tier) => {
    const pool = TARGETS.filter((t) => t.tier === tier);
    return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
  });
}

export const hintText = (t: PotionTarget): string => `Hint: try ${t.recipe.map((i) => ingredientLabel(i).toLowerCase()).join(' and ')}!`;
