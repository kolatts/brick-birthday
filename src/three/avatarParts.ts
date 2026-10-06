import * as THREE from 'three';
import type { PersonId } from '../types';
import { family } from '../config/family';
import type { Part } from './merge';
import {
  arcBand, bandGeometry, jawShellGeometry, brimGeometry, capeGeometry, cHandGeometry, footGeometry, hairCapGeometry, headGeometry,
  headProfile, panelGeometry, pick, profileRadius, skirtGeometry, smooth, studGeometry, taperedTube, torsoGeometry,
  type Detail, type HeadSpec,
} from './figureGeometry';

/** Per-person extras that are not in family.ts (shoe/leg colours, leg length). Colours follow the toy palette. */
interface Look {
  pants: string;
  shoes: string;
  legH: number;
}
const LOOKS: Partial<Record<PersonId, Look>> = {
  luna: { pants: '#FF8FC3', shoes: '#E63C8F', legH: 0.34 },
  mom: { pants: '#FFF1D6', shoes: '#FFD60A', legH: 0.5 },
  dad: { pants: '#1D2A44', shoes: '#6B4423', legH: 0.52 },
  julian: { pants: '#26407A', shoes: '#FFFFFF', legH: 0.48 },
  darian: { pants: '#5B8DEF', shoes: '#E63946', legH: 0.48 },
};

export const PET_IDS: PersonId[] = ['rudolph', 'jinglebells'];
export const isPet = (id: PersonId): boolean => PET_IDS.includes(id);

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
export const lighten = (c: string, t: number): string => mix(c, '#FFFFFF', t);
export const darken = (c: string, t: number): string => mix(c, '#1D2A44', t);

export interface HumanDims {
  base: number;
  torsoH: number;
  torsoY: number;
  headY: number;
  headW: number;
  headH: number;
  headD: number;
  shoulderY: number;
}

export function humanDims(id: PersonId): HumanDims {
  const legH = LOOKS[id]?.legH ?? 0.5;
  const base = 0.2 + legH;
  const torsoH = 0.82;
  const headH = 0.92;
  return {
    base,
    torsoH,
    torsoY: base + torsoH / 2,
    headY: base + torsoH + headH / 2 - 0.05,
    headW: 1.0,
    headH,
    headD: 0.92,
    shoulderY: base + torsoH - 0.16,
  };
}

/** Shared head sculpt for the five people (fuller cheeks, soft rim). */
export const HUMAN_HEAD: HeadSpec = { r: 0.5, h: 0.92, depth: 0.92, bevel: 0.13, topBevel: 0.22, cheek: 0.03, cheekY: -0.2 };
const geo = (g: THREE.BufferGeometry, p: [number, number, number], c: string, rot?: [number, number, number], sc?: [number, number, number]): Part => ({
  k: 'geo', g, p, s: [1, 1, 1], c, rot, sc,
});

/** Everything static on a person: legs, torso, head, hair, accessory, worn closet items. Arms/face are separate. */
export function humanBody(id: PersonId, equipped: string[], d: Detail = 'high'): Part[] {
  const a = family[id].avatar;
  const look = LOOKS[id] ?? { pants: '#26407A', shoes: '#fff', legH: 0.5 };
  const dm = humanDims(id);
  const P: Part[] = [];
  const has = (k: string) => equipped.includes(k);
  const hy = dm.headY;
  const H = HUMAN_HEAD;
  const prof = headProfile(H, 'high');
  const top = H.h / 2; // local top of the skull
  const rAt = (y: number) => profileRadius(prof, y);
  const bodyColor = has('dress') ? '#FF9CCB' : a.bodyColor;

  // ---- legs: bevelled tapering legs, knee bulge, shaped shoes with a toe step and sole groove
  for (const sx of [-1, 1]) {
    P.push({ k: 'rtap', p: [sx * 0.2, 0.2 + look.legH / 2 + 0.03, 0], s: [0.34, look.legH + 0.06, 0.34], c: look.pants, r: 0.12, t: 0.84, seg: 1 });
    P.push(geo(footGeometry(0.34, d), [sx * 0.2, 0, -0.02], look.shoes));
  }
  P.push({ k: 'rbox', p: [0, dm.base + 0.02, 0], s: [0.82, 0.2, 0.46], c: look.pants, r: 0.09, seg: 1 });

  // ---- torso: bevelled rounded trapezoid, inset chest panel with 4 rounded studs, collar ring
  P.push(geo(torsoGeometry(1.02, 0.76, dm.torsoH, 0.58, d), [0, dm.torsoY, 0], bodyColor));
  P.push(geo(panelGeometry(0.62, 0.48, 0.045, d), [0, dm.torsoY + 0.03, 0.285], lighten(bodyColor, 0.28)));
  const stud = lighten(bodyColor, 0.5);
  const studG = studGeometry(0.075, 0.05, d);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) P.push(geo(studG, [sx * 0.15, dm.torsoY + sy * 0.12 + 0.03, 0.305], stud));
  P.push({ k: 'cyl', p: [0, dm.base + dm.torsoH + 0.03, 0], s: [0.16, 0.2, 0.16], c: a.skinTone });
  P.push({ k: 'torus', p: [0, dm.base + dm.torsoH + 0.005, 0], s: [0.2, 0.04, Math.PI * 2], c: lighten(bodyColor, 0.22), rot: [Math.PI / 2, 0, 0], sc: [1, 0.85, 1], seg: 5 });

  // ---- head: lathe sculpt, ears, top stud
  P.push(geo(headGeometry(H, d), [0, hy, 0], a.skinTone));
  for (const sx of [-1, 1]) P.push({ k: 'caps', p: [sx * 0.5, hy - 0.04, 0], s: [0.075, 0.07, 0], c: a.skinTone, sc: [0.7, 1, 1] });
  P.push({ k: 'tcyl', p: [0, hy + top + 0.012, 0], s: [0.1, 0.05, 0.085], c: a.skinTone });

  const hc = a.hairColor;
  const hcl = lighten(hc, 0.16);
  const T = (y: number) => hy + y;
  const lock = (x: number, y: number, z: number, len: number, r: number, rot: [number, number, number], c = hc, sc?: [number, number, number]) =>
    P.push({ k: 'caps', p: [x, T(y), z], s: [r, len, 0], c, rot, sc });
  /** Hairline: height at the forehead, over the ears, and at the nape. */
  const hl = (front: number, side: number, back: number) => (phi: number) => {
    const a = Math.abs(phi);
    return front + (side - front) * smooth(0.75, 1.5, a) + (back - side) * smooth(1.9, 2.7, a);
  };
  const cap = (hairline: (phi: number) => number, thick: number, topThick: number, wave?: { amp: number; around: number; up: number }) =>
    P.push(geo(hairCapGeometry(H, d, { hairline, thick, topThick, wave }), [0, hy, 0], hc));

  switch (a.hairStyle) {
    case 'bald':
      P.push({ k: 'sph', p: [0.13, T(top - 0.035), 0.16], s: [0.13, 0.04, 0.09], c: lighten(a.skinTone, 0.28), rot: [0.3, 0, -0.3] }); // sheen
      // short soft beard hugging the jaw under the face plate, with a salt-and-pepper chin
      P.push(geo(jawShellGeometry(H, d, -0.5, -0.12, 1.3, 0.035), [0, hy, 0], hc));
      P.push({ k: 'sph', p: [0, T(-0.47), 0.38], s: [0.1, 0.04, 0.07], c: mixGray(hc), rot: [0.25, 0, 0] });
      break;
    case 'wavy-short':
      cap(hl(0.27, 0.03, -0.14), 0.04, 0.07, { amp: 0.018, around: 6, up: 14 });
      // soft crown locks rooted in the cap
      for (const [x, z, r] of [[-0.2, -0.05, 0.3], [0.15, 0.0, -0.2], [0.0, -0.22, 0.1], [0.3, -0.15, -0.4]] as const) lock(x, top + 0.02, z, 0.1, 0.085, [0.4, 0, r], hcl);
      P.push({ k: 'torus', p: [-0.51, T(-0.12), 0.04], s: [0.04, 0.012, Math.PI * 2], c: '#FFD60A', rot: [0, Math.PI / 2, 0], seg: 4 }); // earring
      sunglassesUp(P, T(top + 0.08), -0.05, 0.12);
      break;
    case 'long-straight':
      cap(hl(0.25, -0.3, -0.34), 0.045, 0.07, { amp: 0.01, around: 5, up: 9 });
      P.push({ k: 'rtap', p: [0, T(-0.36), -0.4], s: [0.98, 1.5, 0.2], c: hc, r: 0.09, t: 0.86, seg: 1 }); // back drape
      for (const sx of [-1, 1]) lock(sx * 0.53, -0.5, 0.0, 0.75, 0.085, [0.05, 0, sx * 0.06]); // side locks to the shoulder
      sunglassesUp(P, T(top + 0.07), 0.0, 0.1);
      break;
    case 'curly-fluffy': {
      cap(hl(0.22, 0.02, -0.1), 0.05, 0.085, { amp: 0.035, around: 9, up: 17 });
      const curl = (x: number, y: number, z: number, r: number, c = hc) => P.push({ k: 'sph', p: [x, T(y), z], s: [r, r * 0.95, r], c });
      // a smoothed silhouette: overlapping curls whose centres sit inside the cap so they read as one fluffy mass
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2;
        curl(Math.cos(an) * 0.3, top + 0.0, Math.sin(an) * 0.28 - 0.03, 0.17, i % 3 === 0 ? hcl : hc);
      }
      for (const [x, z] of [[0.0, 0.04], [0.14, -0.1], [-0.14, -0.1]] as const) curl(x, top + 0.07, z, 0.17, hcl);
      for (const sx of [-1, 1]) {
        curl(sx * 0.44, 0.25, 0.0, 0.13);
        curl(sx * 0.46, 0.05, -0.1, 0.12);
        curl(sx * 0.3, 0.3, 0.3, 0.1);
      }
      for (let i = 0; i < 4; i++) curl(-0.24 + i * 0.16, 0.27, 0.32 - Math.abs(i - 1.5) * 0.04, 0.09);
      curl(0, 0.05, -0.42, 0.2);
      break;
    }
    case 'wavy-pulled-back':
    default: {
      cap(hl(0.25, 0.1, -0.2), 0.04, 0.065, { amp: 0.014, around: 6, up: 12 });
      // bun + scrunchie
      P.push({ k: 'sph', p: [0, T(top + 0.1), -0.26], s: [0.2, 0.19, 0.2], c: hcl });
      P.push({ k: 'torus', p: [0, T(top + 0.04), -0.24], s: [0.13, 0.035, Math.PI * 2], c: '#FF5CA8', rot: [Math.PI / 2 - 0.5, 0, 0], seg: 4 });
      break;
    }
  }

  // ---- signature accessory
  const acc = a.accessory.toLowerCase();
  if (acc.includes('tiara') && !has('visor') && !has('bow')) tiara(P, hy, d);
  else if (acc.includes('tiara') && has('bow')) tiara(P, hy, d, true);
  if (acc.includes('visor')) visor(P, hy, '#E63946', H, d);
  if (acc.includes('guitar')) guitar(P, dm.torsoY);

  // ---- closet items, slot by slot (see config/closet.ts); each fits the shared anchors: torso, head, shoulders
  if (has('dress')) {
    P.push(geo(skirtGeometry(0.4, 0.66, 0.42, 0.045, 0.78, d), [0, dm.base - 0.03, 0], '#FF9CCB'));
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      const hemY = dm.base - 0.2;
      P.push({ k: 'sph', p: [Math.sin(an) * 0.6, hemY, Math.cos(an) * 0.6 * 0.78], s: [0.04, 0.04, 0.04], c: '#FFFFFF' });
    }
    P.push({ k: 'torus', p: [0, dm.base + 0.16, 0], s: [0.38, 0.03, Math.PI * 2], c: '#FFFFFF', rot: [Math.PI / 2, 0, 0], sc: [1, 0.78, 1] }); // waist sash
  }
  if (has('cape')) {
    const top0 = dm.base + dm.torsoH - 0.02;
    P.push(geo(capeGeometry(0.5, 0.74, 1.0, 0.04, 0.95, 1.15, d), [0, top0 - 0.5, -0.02], '#7B4BC4'));
    P.push({ k: 'torus', p: [0, top0 + 0.0, -0.01], s: [0.4, 0.05, Math.PI * 1.7], c: '#9B6BE4', rot: [Math.PI / 2, 0, Math.PI * 0.65 - Math.PI * 0.35], sc: [1, 0.7, 1] });
    for (const [x, y, sc] of [[-0.2, -0.2, 0.1], [0.22, -0.45, 0.08], [0.02, -0.7, 0.07]] as const) {
      const rz = 0.5 * 0.62 + 0.24 * 0.62 * (-y);
      void rz;
      P.push({ k: 'star', p: [x, top0 + y, -0.02 - (0.5 + 0.24 * -y * 1.0) * 0.95 - 0.03], s: [sc, 0.025, 0], c: '#FFD60A', rot: [0, Math.PI, 0] });
    }
    P.push({ k: 'sph', p: [0, top0 - 0.02, 0.18], s: [0.05, 0.05, 0.04], c: '#FFD60A' });
  }
  if (has('labcoat')) {
    const hemR = has('dress') ? 0.78 : 0.56;
    P.push(geo(torsoGeometry(1.1, 0.92, dm.torsoH + 0.04, 0.8, d), [0, dm.torsoY, 0], '#FFFFFF'));
    P.push(geo(skirtGeometry(0.42, hemR, 0.5, 0.04, has('dress') ? 0.82 : 0.78, d), [0, dm.base - 0.12, 0], '#FFFFFF'));
    P.push({ k: 'rbox', p: [0, dm.torsoY - 0.02, 0.405], s: [0.07, dm.torsoH + 0.3, 0.035], c: '#BFD7FF', r: 0.015 }); // placket
    for (const sx of [-1, 1]) {
      P.push({ k: 'rbox', p: [sx * 0.2, dm.torsoY + 0.32, 0.405], s: [0.2, 0.3, 0.045], c: '#F2F7FF', r: 0.03, rot: [0, 0, sx * -0.55] }); // lapels
      P.push({ k: 'rbox', p: [sx * 0.3, dm.torsoY - 0.25, 0.41], s: [0.26, 0.2, 0.035], c: '#DCEBFF', r: 0.03 }); // pockets
    }
    for (let i = 0; i < 3; i++) P.push({ k: 'sph', p: [0.0, dm.torsoY + 0.15 - i * 0.2, 0.43], s: [0.04, 0.04, 0.025], c: '#3A86FF' });
  }
  if (has('boots')) {
    for (const sx of [-1, 1]) {
      P.push(geo(footGeometry(0.34, d), [sx * 0.2, 0.0, -0.02], '#E63946', undefined, [1.1, 1.25, 1]));
      P.push(geo(footGeometry(0.46, d), [sx * 0.2, -0.02, -0.02], '#FFFFFF', undefined, [1.13, 0.22, 1]));
      P.push({ k: 'rtap', p: [sx * 0.2, 0.34, -0.01], s: [0.4, 0.38, 0.4], c: '#E63946', r: 0.13, t: 0.95 });
      P.push({ k: 'torus', p: [sx * 0.2, 0.5, -0.01], s: [0.185, 0.035, Math.PI * 2], c: '#FFFFFF', rot: [Math.PI / 2, 0, 0] });
    }
  }
  if (has('bow')) {
    const bc = '#FF3E96';
    const bx = 0.28, by = top + 0.09, bz = 0.16;
    for (const sx of [-1, 1]) P.push({ k: 'sph', p: [bx + sx * 0.15, T(by), bz], s: [0.15, 0.12, 0.07], c: bc, rot: [0.2, 0, sx * 0.35] });
    P.push({ k: 'sph', p: [bx, T(by), bz + 0.01], s: [0.07, 0.07, 0.06], c: '#C41F72' });
  }
  if (has('visor') && !acc.includes('visor')) visor(P, hy, '#FF5CA8', H, d);
  if (has('sunglasses')) {
    // star sunglasses on the face at eye level, with temples to the ears
    const zf = rAt(0.04) * H.depth + 0.035;
    for (const sx of [-1, 1]) P.push({ k: 'star', p: [sx * 0.22, T(0.045), zf], s: [0.16, 0.05, 0], c: '#3A86FF', rot: [0, 0, 0] });
    P.push({ k: 'rbox', p: [0, T(0.05), zf], s: [0.16, 0.03, 0.03], c: '#1D2A44', r: 0.012 });
    for (const sx of [-1, 1]) P.push({ k: 'cap', p: [sx * 0.46, T(0.05), zf - 0.22], s: [0.014, 0.4, 0], c: '#1D2A44', rot: [0, sx * -0.1, 0] });
  }
  return P;
}

function mixGray(c: string): string {
  return mix(c, '#9AA0A6', 0.45);
}

function sunglassesUp(P: Part[], y: number, z: number, lift: number): void {
  void lift;
  const frame = '#2B2B33';
  for (const sx of [-1, 1]) {
    P.push({ k: 'sph', p: [sx * 0.19, y, z + 0.1], s: [0.17, 0.045, 0.11], c: '#1D2A44', rot: [-0.25, 0, 0] });
    P.push({ k: 'cap', p: [sx * 0.3, y - 0.01, z - 0.14], s: [0.012, 0.42, 0], c: frame, rot: [-0.25, 0, 0] });
  }
  P.push({ k: 'rbox', p: [0, y + 0.0, z + 0.11], s: [0.16, 0.03, 0.03], c: frame, r: 0.012 });
}

function tiara(P: Part[], hy: number, d: Detail, withBow = false): void {
  const R = 0.4;
  const tilt = -0.38;
  const cy = Math.cos(tilt), sy = Math.sin(tilt);
  const place = (x: number, y: number, z: number): [number, number, number] => [x, hy + 0.1 + y * cy - z * sy, 0.13 + y * sy + z * cy];
  const arc = 2.2;
  P.push({ k: 'geo', g: arcBand(R, 0.026, arc, d), p: place(0, 0, 0), s: [1, 1, 1], c: '#E4ECF9', rot: [tilt, 0, 0] });
  const n = 5;
  for (let i = 0; i < n; i++) {
    const an = Math.PI / 2 + ((i - (n - 1) / 2) / ((n - 1) / 2)) * (arc / 2 - 0.2);
    const x = Math.cos(an) * R, y = Math.sin(an) * R;
    const big = 1 - Math.abs(i - 2) * 0.22;
    P.push({ k: 'cone', p: place(x * 1.0, y + 0.07 * big, 0), s: [0.04, 0.16 * big + 0.04, 0.04], c: '#E4ECF9', rot: [tilt, 0, an - Math.PI / 2] });
  }
  P.push({ k: 'sph', p: place(0, R + 0.01, 0.015), s: [0.05, 0.05, 0.04], c: '#FF3E96' });
  void withBow;
}

function visor(P: Part[], hy: number, brim: string, H: HeadSpec, d: Detail): void {
  P.push({ k: 'geo', g: bandGeometry(H, d, 0.2, 0.37, 0.05), p: [0, hy, 0], s: [1, 1, 1], c: '#FFFFFF' });
  const r = profileRadius(headProfile(H, 'high'), 0.37);
  P.push({ k: 'geo', g: brimGeometry(r + 0.05, 0.34, 0.035, 1.0, d), p: [0, hy + 0.34, 0], s: [1, 1, 1], c: brim, rot: [0.1, 0, 0], sc: [1, 1, H.depth] });
}

function guitar(P: Part[], torsoY: number): void {
  const wood = '#E8742A';
  P.push({ k: 'sph', p: [0.0, torsoY - 0.3, 0.42], s: [0.34, 0.3, 0.1], c: wood, rot: [0, 0, 0.55] });
  P.push({ k: 'sph', p: [0.2, torsoY - 0.06, 0.41], s: [0.22, 0.2, 0.1], c: wood, rot: [0, 0, 0.55] });
  P.push({ k: 'cyl', p: [0.06, torsoY - 0.22, 0.52], s: [0.08, 0.04, 0.08], c: '#2B2B33', rot: [Math.PI / 2, 0, 0] });
  P.push({ k: 'rbox', p: [0.52, torsoY + 0.42, 0.42], s: [0.1, 0.95, 0.06], c: '#4A2E1A', r: 0.02, rot: [0, 0, -0.62] });
  P.push({ k: 'rbox', p: [0.78, torsoY + 0.82, 0.42], s: [0.14, 0.26, 0.07], c: '#2B2B33', r: 0.03, rot: [0, 0, -0.62] });
  P.push({ k: 'rbox', p: [0, torsoY + 0.02, 0.33], s: [1.2, 0.06, 0.04], c: '#1D2A44', r: 0.015, rot: [0, 0, 0.78] });
}

/** One arm (symmetric, hangs from its shoulder pivot): ball shoulder, capsule upper/lower arm, elbow ball, cuff, wrist and a C hand. */
export function humanArm(id: PersonId, d: Detail = 'high', equipped: string[] = []): Part[] {
  const a = family[id].avatar;
  const sleeve = equipped.includes('labcoat') ? '#FFFFFF' : equipped.includes('dress') ? '#FF9CCB' : a.bodyColor;
  const cuff = equipped.includes('labcoat') ? '#BFD7FF' : lighten(sleeve, 0.35);
  const bend = 0.32;
  const L = 0.3;
  const u = new THREE.Vector3(0, -Math.cos(bend), Math.sin(bend));
  const E = new THREE.Vector3(0, -0.31, 0);
  const W = E.clone().addScaledVector(u, L);
  const mid = E.clone().addScaledVector(u, L / 2);
  const hand = W.clone().addScaledVector(u, 0.12);
  const cuffP = W.clone().addScaledVector(u, -0.025);
  const limb = taperedTube([[0, 0, 0], [0, -0.16, 0], [E.x, E.y, E.z], [mid.x, mid.y, mid.z], [W.x, W.y, W.z]], (t) => 0.135 - 0.03 * t - 0.012 * Math.sin(Math.PI * t * 2) ** 2, d);
  return [
    { k: 'sph', p: [0, 0, 0], s: [0.16, 0.16, 0.16], c: sleeve, seg: 10 },
    { k: 'geo', g: limb, p: [0, 0, 0], s: [1, 1, 1], c: sleeve },
    { k: 'tcyl', p: [cuffP.x, cuffP.y, cuffP.z], s: [0.135, 0.06, 0.13], c: cuff, rot: [-bend, 0, 0], seg: 12 },
    { k: 'sph', p: [W.x, W.y - 0.02, W.z + 0.01], s: [0.085, 0.07, 0.085], c: a.skinTone },
    { k: 'geo', g: cHandGeometry(0.115, 0.062, (250 * Math.PI) / 180, d), p: [hand.x, hand.y - 0.1, hand.z + 0.02], s: [1, 1, 1], c: a.skinTone, rot: [-bend, 0, 0] },
  ];
}

// ------------------------------------------------------------------ pets ---------------------------------------------------------

export interface PetDims {
  headY: number;
  headZ: number;
  /** Radius of the turned head the face plate wraps. */
  headR: number;
  headH: number;
  headScaleZ: number;
  plateW: number;
  plateH: number;
  top: number;
}

export function petDims(id: PersonId): PetDims {
  return id === 'rudolph'
    ? { headY: 1.0, headZ: 0.48, headR: 0.4, headH: 0.64, headScaleZ: 0.88, plateW: 0.78, plateH: 0.56, top: 1.32 }
    : { headY: 0.95, headZ: 0.38, headR: 0.36, headH: 0.58, headScaleZ: 0.88, plateW: 0.7, plateH: 0.52, top: 1.24 };
}

export function petHeadSpec(id: PersonId): HeadSpec {
  const p = petDims(id);
  return { r: p.headR, h: p.headH, depth: p.headScaleZ, bevel: 0.29, topBevel: 0.3, cheek: id === 'rudolph' ? 0.02 : 0.035, cheekY: -0.1 };
}

export function petBody(id: PersonId, partyHat: boolean, d: Detail = 'high'): Part[] {
  const a = family[id].avatar;
  const P: Part[] = [];
  const dd = petDims(id);
  const H = petHeadSpec(id);
  const hy = dd.headY, hz = dd.headZ;
  const plateZ = (y: number) => profileRadius(headProfile(H, 'high'), y) * H.depth;
  P.push({ k: 'geo', g: headGeometry(H, d), p: [0, hy, hz], s: [1, 1, 1], c: a.bodyColor });
  if (id === 'rudolph') {
    const dark = darken(a.bodyColor, 0.28);
    P.push({ k: 'cap', p: [0, 0.55, -0.05], s: [0.33, 0.5, 0], c: a.bodyColor });
    for (const sx of [-1, 1]) P.push({ k: 'sph', p: [sx * 0.2, 0.52, -0.42], s: [0.2, 0.25, 0.26], c: a.bodyColor }); // haunches
    P.push({ k: 'caps', p: [0, 0.76, 0.34], s: [0.24, 0.2, 0], c: a.bodyColor, rot: [0.6, 0, 0] }); // neck
    P.push({ k: 'torus', p: [0, 0.74, 0.37], s: [0.22, 0.1, Math.PI * 2], c: a.outfitColor, rot: [-1.0, 0, 0], sc: [1.05, 1, 1.2] }); // thick chest ruff
    for (const sx of [-1, 1]) {
      for (const sz of [0.3, -0.4]) {
        P.push({ k: 'caps', p: [sx * 0.2, 0.19, sz], s: [0.1, 0.1, 0], c: dark });
        P.push({ k: 'sph', p: [sx * 0.2, 0.06, sz + 0.04], s: [0.12, 0.07, 0.16], c: a.outfitColor });
      }
    }
    for (const sx of [-1, 1]) {
      P.push({ k: 'cone', p: [sx * 0.25, hy + 0.4, hz - 0.04], s: [0.15, 0.3, 0.1], c: dark, rot: [0, 0, -sx * 0.25], sc: [1, 1, 0.65] });
      P.push({ k: 'cone', p: [sx * 0.3, hy + 0.5, hz - 0.04], s: [0.072, 0.14, 0.06], c: '#2B2B33', rot: [0, 0, -sx * 0.25], sc: [1, 1, 0.65] });
    }
    // collar + tag
    P.push({ k: 'torus', p: [0, 0.78, 0.4], s: [0.235, 0.032, Math.PI * 2], c: '#3A86FF', rot: [-1.0, 0, 0], sc: [1, 1, 1.05] });
    P.push({ k: 'cyl', p: [0, 0.62, 0.62], s: [0.06, 0.02, 0.06], c: '#FFD60A', rot: [Math.PI / 2 - 0.3, 0, 0] });
  } else {
    const patch = '#8A5A2B';
    P.push({ k: 'cap', p: [0, 0.5, -0.05], s: [0.27, 0.4, 0], c: a.bodyColor });
    for (const sx of [-1, 1]) P.push({ k: 'sph', p: [sx * 0.17, 0.46, -0.3], s: [0.17, 0.2, 0.22], c: sx > 0 ? patch : a.bodyColor });
    P.push({ k: 'sph', p: [0.15, 0.68, -0.1], s: [0.15, 0.08, 0.2], c: patch });
    P.push({ k: 'caps', p: [0, 0.7, 0.26], s: [0.2, 0.15, 0], c: a.bodyColor, rot: [0.55, 0, 0] });
    for (const sx of [-1, 1]) {
      for (const sz of [0.2, -0.3]) {
        P.push({ k: 'caps', p: [sx * 0.16, 0.17, sz], s: [0.085, 0.08, 0], c: sx > 0 ? patch : a.bodyColor });
        P.push({ k: 'sph', p: [sx * 0.16, 0.055, sz + 0.03], s: [0.095, 0.06, 0.12], c: '#E8A0B4' });
      }
    }
    // fluffy cheek ruff: broad flattened tufts blending into the head, plus a ruff collar
    for (const sx of [-1, 1]) P.push({ k: 'sph', p: [sx * 0.3, hy - 0.12, hz + 0.0], s: [0.12, 0.13, 0.2], c: a.bodyColor, rot: [0, sx * 0.3, 0] });
    P.push({ k: 'torus', p: [0, 0.76, 0.33], s: [0.18, 0.09, Math.PI * 2], c: a.bodyColor, rot: [-1.0, 0, 0], sc: [1.1, 1, 1.2] });
    for (const sx of [-1, 1]) {
      P.push({ k: 'cone', p: [sx * 0.22, hy + 0.4, hz - 0.02], s: [0.15, 0.34, 0.09], c: sx > 0 ? patch : a.bodyColor, rot: [0, 0, -sx * 0.2], sc: [1, 1, 0.6] });
      P.push({ k: 'cone', p: [sx * 0.22, hy + 0.37, hz + 0.02], s: [0.09, 0.22, 0.05], c: '#F28AA6', rot: [0, 0, -sx * 0.2], sc: [1, 1, 0.5] }); // inner ear
    }
    // bell collar
    P.push({ k: 'torus', p: [0, 0.73, 0.32], s: [0.2, 0.03, Math.PI * 2], c: '#FF5CA8', rot: [-1.0, 0, 0], sc: [1, 1, 1.1] });
    P.push({ k: 'sph', p: [0, 0.58, 0.52], s: [0.065, 0.065, 0.065], c: '#FFD60A' });
    P.push({ k: 'rbox', p: [0, 0.55, 0.575], s: [0.07, 0.012, 0.012], c: '#A07A00', r: 0.004 });
    // whiskers
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        P.push({ k: 'cyl', p: [sx * 0.2, hy - 0.1 - i * 0.025, hz + plateZ(-0.1) - 0.0], s: [0.004, 0.2, 0.004], c: '#EDE8E0', rot: [0.0, 0, Math.PI / 2 + sx * (i - 1) * 0.18] });
      }
    }
  }
  if (partyHat) {
    P.push({ k: 'cone', p: [0, dd.top + 0.24, hz - 0.05], s: [0.2, 0.5, 0.2], c: '#FF5CA8', rot: [0.15, 0, 0.1] });
    P.push({ k: 'torus', p: [0.0, dd.top + 0.0, hz - 0.045], s: [0.18, 0.035, Math.PI * 2], c: '#FFFFFF', rot: [Math.PI / 2 + 0.15, 0, 0.1] });
    P.push({ k: 'sph', p: [0.05, dd.top + 0.5, hz - 0.1], s: [0.08, 0.08, 0.08], c: '#FFD60A' });
  }
  return P;
}

/** The wagging tail (separate mesh so it can animate). Pivot at the rump. */
export function petTail(id: PersonId, d: Detail = 'high'): Part[] {
  const a = family[id].avatar;
  if (id === 'rudolph') {
    // curled: rises, then curls forward over the back
    const g = taperedTube([[0, 0, 0], [0, 0.1, -0.1], [0, 0.26, -0.13], [0, 0.4, -0.04], [0, 0.42, 0.12], [0, 0.31, 0.22]], (t) => 0.09 + 0.07 * Math.sin(Math.PI * Math.min(1, t * 1.1)) - 0.02 * t, d);
    return [
      { k: 'geo', g, p: [0, 0, 0], s: [1, 1, 1], c: a.bodyColor },
      { k: 'sph', p: [0, 0.31, 0.22], s: [0.08, 0.08, 0.08], c: a.outfitColor },
    ];
  }
  const g = taperedTube([[0, 0, 0], [0, 0.16, -0.08], [0, 0.36, -0.12], [0, 0.56, -0.1], [0, 0.74, -0.02]], (t) => 0.07 + 0.13 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)), d);
  return [
    { k: 'geo', g, p: [0, 0, 0], s: [1, 1, 1], c: a.bodyColor },
    { k: 'sph', p: [0, 0.75, -0.02], s: [0.09, 0.1, 0.09], c: '#8A5A2B' },
  ];
}

export function petTailPivot(id: PersonId): [number, number, number] {
  return id === 'rudolph' ? [0, 0.7, -0.5] : [0, 0.55, -0.4];
}

export { pick };
