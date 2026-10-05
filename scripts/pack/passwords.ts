import { WORDS } from './words';
import type { CouponId } from '../../src/types';

export { WORDS };

/** Uniform random integer in [0, max) from the Web Crypto CSPRNG (rejection sampling, no modulo bias). */
export function cryptoInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 0x100000000) throw new RangeError('max out of range');
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export type Rng = (max: number) => number;

/** WORD-WORD-NN, NN in 10..99, two different words. */
export function generatePassword(rng: Rng = cryptoInt): string {
  const a = WORDS[rng(WORDS.length)];
  let b = WORDS[rng(WORDS.length)];
  while (b === a) b = WORDS[rng(WORDS.length)];
  const nn = 10 + rng(90);
  return `${a}-${b}-${nn}`;
}

/** Keeps existing passwords unless `renew`; generates unique passwords for missing ids. */
export function generatePasswords<T extends string = CouponId>(
  ids: readonly T[],
  existing: Partial<Record<T, string>> = {},
  opts: { renew?: boolean; rng?: Rng } = {},
): Record<T, string> {
  const out = {} as Record<T, string>;
  const used = new Set<string>();
  for (const id of ids) {
    const keep = existing[id];
    if (!opts.renew && keep) {
      out[id] = keep;
      used.add(keep);
    }
  }
  for (const id of ids) {
    if (out[id]) continue;
    let p = generatePassword(opts.rng);
    while (used.has(p)) p = generatePassword(opts.rng);
    used.add(p);
    out[id] = p;
  }
  return out;
}
