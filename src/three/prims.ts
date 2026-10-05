export type V3 = [number, number, number];
export type PrimType = 'box' | 'cyl' | 'cone' | 'sph' | 'stud';

/** One instanced primitive. `s` is the scale vector: box (w,h,d), cyl/cone (r,h,r), sph (rx,ry,rz). */
export interface Prim {
  t: PrimType;
  p: V3;
  s: V3;
  c: string;
  /** Yaw applied to the whole primitive (set by Builder groups). */
  ry: number;
  /** Extra local rotation (x,y,z), applied before `ry`. */
  rot?: V3;
}

export const STUD_PITCH = 0.5;

interface BoxOpts {
  /** true = studs every 0.5 units; a number sets the pitch. */
  studs?: boolean | number;
  rot?: V3;
  /** Stud colour (defaults to the box colour). */
  studColor?: string;
}

/** Collects primitives with a transform stack so scenery can be written in local coordinates. */
export class Builder {
  prims: Prim[] = [];
  private ox = 0;
  private oy = 0;
  private oz = 0;
  private yaw = 0;

  /** Runs `fn` with all primitives offset/rotated (yaw) around the offset point. */
  at(offset: V3, yaw: number, fn: () => void): this {
    const sox = this.ox, soy = this.oy, soz = this.oz, syaw = this.yaw;
    const c = Math.cos(syaw), s = Math.sin(syaw);
    this.ox = sox + c * offset[0] + s * offset[2];
    this.oy = soy + offset[1];
    this.oz = soz - s * offset[0] + c * offset[2];
    this.yaw = syaw + yaw;
    fn();
    this.ox = sox; this.oy = soy; this.oz = soz; this.yaw = syaw;
    return this;
  }

  private push(t: PrimType, p: V3, s: V3, c: string, rot?: V3): void {
    const cs = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    this.prims.push({
      t,
      p: [this.ox + cs * p[0] + sn * p[2], this.oy + p[1], this.oz - sn * p[0] + cs * p[2]],
      s, c, ry: this.yaw, rot,
    });
  }

  /** Box centred at p. */
  box(p: V3, s: V3, c: string, o: BoxOpts = {}): this {
    this.push('box', p, s, c, o.rot);
    if (o.studs && !o.rot) {
      const pitch = typeof o.studs === 'number' ? o.studs : STUD_PITCH;
      const nx = Math.max(1, Math.round(s[0] / pitch));
      const nz = Math.max(1, Math.round(s[2] / pitch));
      const sc = o.studColor ?? c;
      const sr = 0.15 * Math.max(1, pitch / STUD_PITCH);
      for (let i = 0; i < nx; i++) {
        for (let k = 0; k < nz; k++) {
          const x = p[0] - s[0] / 2 + (i + 0.5) * (s[0] / nx);
          const z = p[2] - s[2] / 2 + (k + 0.5) * (s[2] / nz);
          this.push('stud', [x, p[1] + s[1] / 2 + 0.045, z], [sr, 0.09, sr], sc);
        }
      }
    }
    return this;
  }

  /** Upright cylinder centred at p. */
  cyl(p: V3, r: number, h: number, c: string, rot?: V3): this {
    this.push('cyl', p, [r, h, r], c, rot);
    return this;
  }

  cone(p: V3, r: number, h: number, c: string, rot?: V3): this {
    this.push('cone', p, [r, h, r], c, rot);
    return this;
  }

  sph(p: V3, r: number | V3, c: string): this {
    this.push('sph', p, typeof r === 'number' ? [r, r, r] : r, c);
    return this;
  }
}

/** Small deterministic PRNG so scenery is identical every run. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
