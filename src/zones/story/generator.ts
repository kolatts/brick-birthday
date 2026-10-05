import { bonusSentences, heroes, places, powers, problems, type Hero, type Picks, type Tile } from './options';
import { templates } from './templates';
import type { Fragment } from '../../audio/speech';

export interface Story {
  title: string;
  sentences: string[];
}

/** Small deterministic hash -> uint32. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(list: T[], id: string, key: (t: T) => string): T => list.find((x) => key(x) === id) ?? list[0];

export interface Slots {
  hero: string;
  they: string;
  them: string;
  their: string;
  place: string;
  atPlace: string;
  problem: string;
  power: string;
}

export function slotsFor(h: Hero, place: Tile, problem: Tile, power: Tile): Slots {
  return {
    hero: h.name,
    they: h.they,
    them: h.them,
    their: h.their,
    place: place.text,
    atPlace: place.at ?? `at ${place.text}`,
    problem: problem.text,
    power: power.text,
  };
}

/** Fills {slot} tokens, then capitalises the first letter of the sentence and guarantees end punctuation. */
export function fillSentence(template: string, slots: Slots): string {
  const filled = template
    .replace(/\{(\w+)\}/g, (_m, k: string) => (slots as unknown as Record<string, string>)[k] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const cap = filled.replace(/(^["“]?|[.!?]\s+["“]?)([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase());
  return /[.!?]["”]?$/.test(cap) ? cap : `${cap}.`;
}

export const templateCount = (): number => templates.length;

export function renderTemplate(index: number, slots: Slots): string[] {
  return templates[index].map((t) => fillSentence(t, slots));
}

const titles = [
  '{hero} and the Big Surprise',
  'A Sparkly Day with {hero}',
  'The Tale of {hero}',
  '{hero} Saves the Day',
];

export function defaultSeed(p: Picks): number {
  return hashString(`${p.hero}|${p.place}|${p.problem}|${p.power}`);
}

/** Pure + deterministic: same picks and seed always give the same story. */
export function generateStory(picks: Picks, seed?: number): Story {
  const s = seed ?? defaultSeed(picks);
  const rnd = mulberry32(s);
  const slots = slotsFor(
    pick(heroes, picks.hero, (h) => h.id),
    pick(places, picks.place, (t) => t.id),
    pick(problems, picks.problem, (t) => t.id),
    pick(powers, picks.power, (t) => t.id),
  );
  const t = Math.floor(rnd() * templates.length);
  const title = fillSentence(titles[Math.floor(rnd() * titles.length)], slots).replace(/.$/, '');
  return { title, sentences: renderTemplate(t, slots) };
}

export function bonusSentence(seed: number): string {
  return bonusSentences[Math.floor(mulberry32(seed)() * bonusSentences.length)];
}

export function heroById(id: string): Hero {
  return pick(heroes, id, (h) => h.id);
}

// ---- Fragments: template text and slot values kept apart so clips can be pre-generated ----

const SPEAKER = 'narrator' as const;
const LEAD_PUNCT = /^[.,!?:;"”)\s]+/;

interface Piece {
  slot: boolean;
  text: string;
}

function piecesOf(template: string, slots: Slots): Piece[] {
  return template
    .split(/(\{\w+\})/)
    .filter((p) => p !== '')
    .map((p) => {
      const m = /^\{(\w+)\}$/.exec(p);
      return m ? { slot: true, text: (slots as unknown as Record<string, string>)[m[1]] ?? '' } : { slot: false, text: p };
    });
}

/** Applies the same capitalisation rule as fillSentence, at piece level. */
function capitalisePieces(pieces: Piece[]): Piece[] {
  const joined = pieces.map((p) => p.text).join('');
  const upAt = new Set<number>();
  const re = /(^["“]?|[.!?]\s+["“]?)([a-z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(joined))) upAt.add(m.index + m[1].length);
  let pos = 0;
  return pieces.map((p) => {
    let t = '';
    for (let i = 0; i < p.text.length; i++) t += upAt.has(pos + i) ? p.text[i].toUpperCase() : p.text[i];
    pos += p.text.length;
    return { ...p, text: t };
  });
}

function toFragments(pieces: Piece[]): Fragment[] {
  const out: Fragment[] = [];
  pieces.forEach((p, i) => {
    let text = p.slot ? p.text.trim() : p.text.replace(i === 0 ? /^\s+/ : LEAD_PUNCT, '').trim();
    if (!p.slot) text = text.replace(/^["“]\s*$/, '');
    if (text) out.push({ speaker: SPEAKER, text });
  });
  return out;
}

export function sentenceFragments(template: string, slots: Slots): Fragment[] {
  return toFragments(capitalisePieces(piecesOf(template, slots)));
}

export function storyFragmentsBySentence(picks: Picks, seed?: number): Fragment[][] {
  const s = seed ?? defaultSeed(picks);
  const rnd = mulberry32(s);
  const slots = slotsFor(
    pick(heroes, picks.hero, (h) => h.id),
    pick(places, picks.place, (t) => t.id),
    pick(problems, picks.problem, (t) => t.id),
    pick(powers, picks.power, (t) => t.id),
  );
  const t = Math.floor(rnd() * templates.length);
  return templates[t].map((tpl) => sentenceFragments(tpl, slots));
}

/** The story as an ordered flat list of {speaker, text}; slot values are separate fragments. */
export function storyFragments(picks: Picks, seed?: number): Fragment[] {
  return storyFragmentsBySentence(picks, seed).flat();
}

/** Every fixed template chunk plus every slot value (both capitalisations), for clip pre-generation. */
export function allStaticFragments(): Fragment[] {
  const seen = new Set<string>();
  const out: Fragment[] = [];
  const add = (text: string) => {
    const t = text.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push({ speaker: SPEAKER, text: t });
    }
  };
  const dummy: Slots = { hero: 'x', they: 'x', them: 'x', their: 'x', place: 'x', atPlace: 'x', problem: 'x', power: 'x' };
  for (const tpl of templates.flat()) {
    for (const f of sentenceFragments(tpl, dummy)) if (f.text !== 'x') add(f.text);
  }
  const up = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const slotValues: string[] = [];
  for (const h of heroes) slotValues.push(h.name, h.they, h.them, h.their);
  for (const pl of places) slotValues.push(pl.text, pl.at ?? `at ${pl.text}`);
  for (const t of [...problems, ...powers]) slotValues.push(t.text);
  for (const v of slotValues) {
    add(v);
    add(up(v));
  }
  return out;
}

const titleIndex = (picks: Picks, seed?: number): number => {
  const rnd = mulberry32(seed ?? defaultSeed(picks));
  rnd();
  return Math.floor(rnd() * titles.length);
};

/** Title as fragments: fixed text and the hero name stay separate so they map to clips. */
export function titleFragments(picks: Picks, seed?: number): Fragment[] {
  const slots = slotsFor(
    pick(heroes, picks.hero, (h) => h.id),
    pick(places, picks.place, (t) => t.id),
    pick(problems, picks.problem, (t) => t.id),
    pick(powers, picks.power, (t) => t.id),
  );
  return sentenceFragments(titles[titleIndex(picks, seed)], slots);
}

export function allTitleFragments(): Fragment[] {
  const dummy: Slots = { hero: 'x', they: 'x', them: 'x', their: 'x', place: 'x', atPlace: 'x', problem: 'x', power: 'x' };
  const out: Fragment[] = titles.flatMap((t) => sentenceFragments(t, dummy)).filter((f) => f.text !== 'x');
  for (const h of heroes) out.push({ speaker: 'narrator', text: h.name });
  return out;
}
