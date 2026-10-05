import type { PersonId } from '../types';
import { family } from '../config/family';
import type { Part } from './merge';

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

/** Everything static on a person: legs, torso, head, hair, accessory, worn closet items. Arms/face are separate. */
export function humanBody(id: PersonId, equipped: string[]): Part[] {
  const a = family[id].avatar;
  const look = LOOKS[id] ?? { pants: '#26407A', shoes: '#fff', legH: 0.5 };
  const d = humanDims(id);
  const P: Part[] = [];
  const has = (k: string) => equipped.includes(k);

  // legs (tapered cylinders), hips block, feet with a toe step
  for (const sx of [-1, 1]) {
    P.push({ k: 'tcyl', p: [sx * 0.2, 0.2 + look.legH / 2, 0], s: [0.17, look.legH + 0.06, 0.2], c: look.pants });
    P.push({ k: 'rbox', p: [sx * 0.2, 0.1, -0.02], s: [0.36, 0.2, 0.4], c: look.shoes, r: 0.08 });
    P.push({ k: 'rbox', p: [sx * 0.2, 0.07, 0.2], s: [0.32, 0.14, 0.3], c: look.shoes, r: 0.06 });
  }
  P.push({ k: 'rbox', p: [0, d.base + 0.02, 0], s: [0.8, 0.2, 0.46], c: look.pants, r: 0.08 });
  // torso: tapered (wide shoulders, narrow waist), lighter printed chest panel with 2x2 studs
  P.push({ k: 'rtap', p: [0, d.torsoY, 0], s: [1.02, d.torsoH, 0.58], c: a.bodyColor, r: 0.2, t: 0.72 });
  P.push({ k: 'rbox', p: [0, d.torsoY + 0.03, 0.27], s: [0.62, 0.5, 0.06], c: lighten(a.bodyColor, 0.28), r: 0.025 });
  const stud = lighten(a.bodyColor, 0.5);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      P.push({ k: 'cyl', p: [sx * 0.15, d.torsoY + sy * 0.12 + 0.03, 0.33], s: [0.075, 0.06, 0.075], c: stud, rot: [Math.PI / 2, 0, 0] });
    }
  }
  // neck + turned cylindrical head with a bevelled rim, ears, and a small top stud
  P.push({ k: 'cyl', p: [0, d.base + d.torsoH + 0.02, 0], s: [0.17, 0.16, 0.17], c: a.skinTone });
  P.push({ k: 'head', p: [0, d.headY, 0], s: [d.headW / 2, d.headH, 0.92], c: a.skinTone, r: 0.18 });
  for (const sx of [-1, 1]) P.push({ k: 'sph', p: [sx * (d.headW / 2 + 0.01), d.headY - 0.02, 0], s: [0.09, 0.13, 0.09], c: a.skinTone });

  const top = d.headY + d.headH / 2;
  const hc = a.hairColor;
  const hcl = lighten(hc, 0.18);
  /** Sculpted hair dome sitting on the skull; its equator stays above the face plate. */
  const dome = (rz = 0.5, y = top - 0.1, z = -0.02) => P.push({ k: 'sph', p: [0, y, z], s: [0.55, 0.4, rz], c: hc });
  switch (a.hairStyle) {
    case 'bald':
      P.push({ k: 'cyl', p: [0, top + 0.04, 0], s: [0.15, 0.08, 0.15], c: a.skinTone });
      P.push({ k: 'sph', p: [0.2, top - 0.03, 0.2], s: [0.14, 0.05, 0.09], c: lighten(a.skinTone, 0.3) }); // sheen
      break;
    case 'wavy-short':
      dome();
      for (let i = 0; i < 4; i++) P.push({ k: 'sph', p: [-0.33 + i * 0.22, top - 0.01, 0.31 - Math.abs(i - 1.5) * 0.04], s: [0.17, 0.15, 0.15], c: hc });
      for (const [x, z] of [[-0.25, -0.1], [0.12, 0.05], [0.3, -0.15], [-0.05, -0.25]] as const) P.push({ k: 'sph', p: [x, top + 0.1, z], s: [0.2, 0.14, 0.2], c: hcl });
      for (const sx of [-1, 1]) P.push({ k: 'sph', p: [sx * 0.5, d.headY + 0.14, -0.05], s: [0.13, 0.24, 0.26], c: hc });
      P.push({ k: 'sph', p: [0, d.headY + 0.02, -0.36], s: [0.5, 0.42, 0.16], c: hc });
      break;
    case 'long-straight':
      dome();
      P.push({ k: 'rbox', p: [0, d.headY - 0.34, -0.43], s: [1.0, 1.5, 0.22], c: hc, r: 0.1 });
      P.push({ k: 'sph', p: [0, d.headY - 1.04, -0.43], s: [0.5, 0.12, 0.12], c: hc });
      for (const sx of [-1, 1]) P.push({ k: 'rbox', p: [sx * 0.52, d.headY - 0.36, -0.12], s: [0.14, 1.1, 0.46], c: hc, r: 0.06 });
      for (let i = 0; i < 4; i++) P.push({ k: 'sph', p: [-0.33 + i * 0.22, top - 0.02, 0.33], s: [0.17, 0.12, 0.13], c: hc });
      break;
    case 'curly-fluffy':
      dome(0.52, top - 0.12);
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2;
        P.push({ k: 'sph', p: [Math.cos(an) * 0.34, top + 0.04, Math.sin(an) * 0.34 - 0.03], s: [0.2, 0.19, 0.2], c: hc });
      }
      for (const [x, z] of [[0, 0], [0.16, 0.1], [-0.16, -0.08]] as const) P.push({ k: 'sph', p: [x, top + 0.14, z], s: [0.2, 0.18, 0.2], c: hcl });
      for (const sx of [-1, 1]) {
        P.push({ k: 'sph', p: [sx * 0.47, d.headY + 0.22, 0.0], s: [0.15, 0.17, 0.2], c: hc });
        P.push({ k: 'sph', p: [sx * 0.47, d.headY + 0.0, -0.12], s: [0.13, 0.17, 0.18], c: hc });
      }
      for (let i = 0; i < 5; i++) P.push({ k: 'sph', p: [-0.36 + i * 0.18, top - 0.02, 0.33], s: [0.13, 0.12, 0.12], c: hc });
      P.push({ k: 'sph', p: [0, d.headY + 0.1, -0.4], s: [0.44, 0.4, 0.15], c: hc });
      break;
    case 'wavy-pulled-back':
    default:
      dome();
      for (let i = 0; i < 4; i++) P.push({ k: 'sph', p: [-0.32 + i * 0.21, top - 0.01, 0.33], s: [0.15, 0.14, 0.13], c: hc });
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          P.push({ k: 'sph', p: [sx * (0.52 + (i % 2) * 0.03), d.headY + 0.2 - i * 0.2, -0.04], s: [0.13, 0.15, 0.22], c: hc });
        }
      }
      P.push({ k: 'sph', p: [0, d.headY - 0.04, -0.38], s: [0.5, 0.46, 0.15], c: hc });
      P.push({ k: 'sph', p: [0, top + 0.1, -0.26], s: [0.22, 0.22, 0.22], c: hcl }); // bun
      break;
  }

  // signature accessory
  const acc = a.accessory.toLowerCase();
  if (acc.includes('tiara')) {
    for (let i = 0; i < 5; i++) {
      const x = -0.3 + i * 0.15;
      P.push({ k: 'cone', p: [x, top + 0.17 - Math.abs(i - 2) * 0.03, 0.12], s: [0.07, 0.22 - Math.abs(i - 2) * 0.03, 0.07], c: '#E4ECF9' });
    }
    P.push({ k: 'box', p: [0, top + 0.07, 0.12], s: [0.7, 0.07, 0.1], c: '#E4ECF9' });
    P.push({ k: 'sph', p: [0, top + 0.1, 0.18], s: [0.07, 0.07, 0.05], c: '#FF3E96' });
  }
  if (acc.includes('sunglasses')) {
    P.push({ k: 'box', p: [0, top + 0.02, -0.05], s: [0.62, 0.04, 0.05], c: '#2B2B33' });
    for (const sx of [-1, 1]) P.push({ k: 'sph', p: [sx * 0.2, top + 0.04, -0.03], s: [0.19, 0.04, 0.13], c: '#1D2A44' });
  }
  if (acc.includes('goggles')) {
    P.push({ k: 'rbox', p: [0, d.headY + 0.32, 0], s: [1.06, 0.12, 0.98], c: '#4B5563', r: 0.05 });
    for (const sx of [-1, 1]) {
      P.push({ k: 'cyl', p: [sx * 0.2, d.headY + 0.34, 0.5], s: [0.17, 0.12, 0.17], c: '#7DE0F0', rot: [Math.PI / 2, 0, 0] });
      P.push({ k: 'cyl', p: [sx * 0.2, d.headY + 0.34, 0.48], s: [0.2, 0.1, 0.2], c: '#4B5563', rot: [Math.PI / 2, 0, 0] });
    }
  }
  if (acc.includes('visor')) {
    P.push({ k: 'rbox', p: [0, d.headY + 0.33, 0], s: [1.08, 0.14, 1.0], c: '#FFFFFF', r: 0.05 });
    P.push({ k: 'box', p: [0, d.headY + 0.31, 0.62], s: [0.9, 0.05, 0.5], c: '#E63946', rot: [-0.12, 0, 0] });
  }
  if (acc.includes('guitar')) {
    const wood = '#E8742A';
    P.push({ k: 'sph', p: [0.0, d.torsoY - 0.3, 0.45], s: [0.34, 0.3, 0.1], c: wood, rot: [0, 0, 0.55] });
    P.push({ k: 'sph', p: [0.2, d.torsoY - 0.06, 0.44], s: [0.22, 0.2, 0.1], c: wood, rot: [0, 0, 0.55] });
    P.push({ k: 'cyl', p: [0.06, d.torsoY - 0.22, 0.56], s: [0.08, 0.04, 0.08], c: '#2B2B33', rot: [Math.PI / 2, 0, 0] });
    P.push({ k: 'box', p: [0.52, d.torsoY + 0.42, 0.44], s: [0.1, 0.95, 0.06], c: '#4A2E1A', rot: [0, 0, -0.62] });
    P.push({ k: 'box', p: [0.78, d.torsoY + 0.82, 0.44], s: [0.14, 0.26, 0.07], c: '#2B2B33', rot: [0, 0, -0.62] });
    P.push({ k: 'box', p: [0, d.torsoY + 0.02, 0.31], s: [1.2, 0.06, 0.04], c: '#1D2A44', rot: [0, 0, 0.78] });
  }

  // closet items (worn by Luna)
  if (has('dress')) {
    P.push({ k: 'tcyl', p: [0, d.base - 0.04, 0], s: [0.68, 0.42, 0.52], c: '#FF9CCB' });
    for (let i = 0; i < 9; i++) {
      const an = (i / 9) * Math.PI * 2;
      P.push({ k: 'sph', p: [Math.cos(an) * 0.62, d.base - 0.1, Math.sin(an) * 0.62], s: [0.06, 0.06, 0.06], c: '#FFFFFF' });
    }
    P.push({ k: 'rtap', p: [0, d.torsoY, 0], s: [1.05, d.torsoH - 0.02, 0.62], c: '#FF9CCB', r: 0.2, t: 0.72 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) P.push({ k: 'cyl', p: [sx * 0.15, d.torsoY + sy * 0.12 + 0.03, 0.34], s: [0.075, 0.06, 0.075], c: '#FFFFFF', rot: [Math.PI / 2, 0, 0] });
  }
  if (has('cape')) {
    P.push({ k: 'box', p: [0, d.torsoY - 0.08, -0.42], s: [1.0, 1.25, 0.07], c: '#7B4BC4', rot: [0.1, 0, 0] });
    P.push({ k: 'rbox', p: [0, d.torsoY + 0.45, -0.05], s: [1.14, 0.18, 0.7], c: '#9B6BE4', r: 0.08 });
    for (const [x, y, sc] of [[-0.25, 0.1, 0.12], [0.22, -0.2, 0.1], [0.05, -0.45, 0.08]] as const) {
      P.push({ k: 'star', p: [x, d.torsoY + y, -0.48], s: [sc, 0.03, 0], c: '#FFD60A', rot: [0, Math.PI, 0] });
    }
  }
  if (has('labcoat')) {
    P.push({ k: 'rtap', p: [0, d.torsoY - 0.1, 0], s: [1.1, d.torsoH + 0.3, 0.64], c: '#FFFFFF', r: 0.2, t: 0.74 });
    P.push({ k: 'box', p: [0, d.torsoY - 0.05, 0.34], s: [0.06, d.torsoH + 0.1, 0.03], c: '#BFD7FF' });
    for (let i = 0; i < 3; i++) P.push({ k: 'sph', p: [0.1, d.torsoY + 0.2 - i * 0.24, 0.35], s: [0.05, 0.05, 0.04], c: '#3A86FF' });
    P.push({ k: 'box', p: [-0.3, d.torsoY - 0.28, 0.34], s: [0.26, 0.2, 0.03], c: '#DCEBFF' });
  }
  if (has('boots')) {
    for (const sx of [-1, 1]) {
      P.push({ k: 'rbox', p: [sx * 0.21, 0.23, 0.06], s: [0.43, 0.46, 0.58], c: '#E63946', r: 0.1 });
      P.push({ k: 'box', p: [sx * 0.21, 0.47, 0.06], s: [0.45, 0.05, 0.6], c: '#FFFFFF' });
    }
  }
  if (has('bow')) {
    const bc = '#FF3E96';
    for (const sx of [-1, 1]) P.push({ k: 'sph', p: [0.3 + sx * 0.17, top + 0.14, 0.12], s: [0.17, 0.14, 0.09], c: bc, rot: [0, 0, sx * 0.3] });
    P.push({ k: 'sph', p: [0.3, top + 0.14, 0.14], s: [0.08, 0.08, 0.08], c: '#C41F72' });
  }
  if (has('visor')) {
    P.push({ k: 'rbox', p: [0, d.headY + 0.33, 0], s: [1.08, 0.14, 1.0], c: '#FFFFFF', r: 0.05 });
    P.push({ k: 'box', p: [0, d.headY + 0.31, 0.62], s: [0.9, 0.05, 0.5], c: '#FF5CA8', rot: [-0.12, 0, 0] });
  }
  if (has('sunglasses')) {
    for (const sx of [-1, 1]) P.push({ k: 'star', p: [sx * 0.26, d.headY + 0.34, d.headD / 2 + 0.04], s: [0.17, 0.05, 0], c: '#3A86FF' });
    P.push({ k: 'box', p: [0, d.headY + 0.33, d.headD / 2 + 0.04], s: [0.2, 0.04, 0.04], c: '#1D2A44' });
  }
  return P;
}

/** One arm (symmetric, hangs from its shoulder pivot): upper arm, bent elbow, forearm and a C-shaped mitten hand. */
export function humanArm(id: PersonId): Part[] {
  const a = family[id].avatar;
  const bend = 0.32;
  const fy = -0.31 - 0.15 * Math.cos(bend);
  const fz = 0.15 * Math.sin(bend);
  return [
    { k: 'sph', p: [0, 0, 0], s: [0.17, 0.17, 0.17], c: a.bodyColor },
    { k: 'tcyl', p: [0, -0.16, 0], s: [0.14, 0.3, 0.16], c: a.bodyColor },
    { k: 'sph', p: [0, -0.31, 0], s: [0.145, 0.145, 0.145], c: a.bodyColor },
    { k: 'tcyl', p: [0, fy, fz], s: [0.13, 0.3, 0.145], c: a.bodyColor, rot: [-bend, 0, 0] },
    { k: 'cyl', p: [0, fy - 0.14, fz + 0.045], s: [0.145, 0.05, 0.145], c: lighten(a.bodyColor, 0.35), rot: [-bend, 0, 0] },
    // C-shaped hand: a torus arc with the opening toward the front
    { k: 'torus', p: [0, fy - 0.24, fz + 0.09], s: [0.11, 0.065, 4.7], c: a.skinTone, rot: [0, Math.PI / 2, -2.0] },
  ];
}

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
    ? { headY: 1.0, headZ: 0.48, headR: 0.4, headH: 0.64, headScaleZ: 0.88, plateW: 0.62, plateH: 0.46, top: 1.32 }
    : { headY: 0.95, headZ: 0.38, headR: 0.36, headH: 0.58, headScaleZ: 0.88, plateW: 0.56, plateH: 0.42, top: 1.24 };
}

export function petBody(id: PersonId, partyHat: boolean): Part[] {
  const a = family[id].avatar;
  const P: Part[] = [];
  const dd = petDims(id);
  const head: Part = { k: 'head', p: [0, dd.headY, dd.headZ], s: [dd.headR, dd.headH, dd.headScaleZ], c: a.bodyColor, r: 0.2 };
  if (id === 'rudolph') {
    const dark = darken(a.bodyColor, 0.28);
    P.push({ k: 'cap', p: [0, 0.55, -0.05], s: [0.33, 0.5, 0], c: a.bodyColor });
    P.push({ k: 'sph', p: [0, 0.5, 0.36], s: [0.27, 0.27, 0.2], c: a.outfitColor });
    for (const sx of [-1, 1]) {
      for (const sz of [0.3, -0.4]) {
        P.push({ k: 'tcyl', p: [sx * 0.2, 0.17, sz], s: [0.1, 0.34, 0.13], c: dark });
        P.push({ k: 'sph', p: [sx * 0.2, 0.06, sz + 0.03], s: [0.13, 0.08, 0.16], c: a.outfitColor });
      }
    }
    P.push(head);
    P.push({ k: 'sph', p: [0, dd.headY - 0.12, dd.headZ + 0.3], s: [0.2, 0.14, 0.12], c: a.outfitColor }); // tapered snout
    for (const sx of [-1, 1]) {
      P.push({ k: 'cone', p: [sx * 0.27, dd.headY + 0.5, dd.headZ - 0.04], s: [0.16, 0.44, 0.1], c: dark, rot: [0, 0, -sx * 0.25] });
      P.push({ k: 'cone', p: [sx * 0.32, dd.headY + 0.62, dd.headZ - 0.04], s: [0.085, 0.22, 0.06], c: '#2B2B33', rot: [0, 0, -sx * 0.25] });
    }
    P.push({ k: 'tcyl', p: [0, 0.8, 0.34], s: [0.3, 0.1, 0.3], c: '#3A86FF', rot: [0.45, 0, 0] });
    P.push({ k: 'sph', p: [0, 0.68, 0.6], s: [0.08, 0.08, 0.04], c: '#FFD60A' });
  } else {
    const patch = '#8A5A2B';
    P.push({ k: 'cap', p: [0, 0.5, -0.05], s: [0.27, 0.4, 0], c: a.bodyColor });
    P.push({ k: 'sph', p: [0.15, 0.68, -0.1], s: [0.16, 0.09, 0.2], c: patch });
    P.push({ k: 'sph', p: [-0.13, 0.5, -0.3], s: [0.14, 0.11, 0.12], c: '#B87A3C' });
    for (const sx of [-1, 1]) {
      for (const sz of [0.2, -0.3]) {
        P.push({ k: 'tcyl', p: [sx * 0.16, 0.16, sz], s: [0.085, 0.32, 0.11], c: sx > 0 ? patch : a.bodyColor });
        P.push({ k: 'sph', p: [sx * 0.16, 0.05, sz + 0.03], s: [0.1, 0.06, 0.12], c: '#E8A0B4' });
      }
    }
    P.push(head);
    // fluffy cheek ruff
    for (const sx of [-1, 1]) P.push({ k: 'sph', p: [sx * 0.3, dd.headY - 0.12, dd.headZ + 0.05], s: [0.13, 0.13, 0.13], c: a.bodyColor });
    for (const sx of [-1, 1]) {
      P.push({ k: 'cone', p: [sx * 0.22, dd.headY + 0.4, dd.headZ - 0.02], s: [0.15, 0.34, 0.09], c: sx > 0 ? patch : a.bodyColor, rot: [0, 0, -sx * 0.2] });
      P.push({ k: 'cone', p: [sx * 0.22, dd.headY + 0.37, dd.headZ + 0.03], s: [0.09, 0.22, 0.05], c: '#F28AA6', rot: [0, 0, -sx * 0.2] });
    }
    P.push({ k: 'tcyl', p: [0, 0.74, 0.3], s: [0.27, 0.08, 0.27], c: '#FF5CA8', rot: [0.4, 0, 0] });
    P.push({ k: 'sph', p: [0, 0.66, 0.54], s: [0.08, 0.08, 0.08], c: '#FFD60A' });
  }
  if (partyHat) {
    P.push({ k: 'cone', p: [0, dd.top + 0.24, dd.headZ - 0.05], s: [0.2, 0.5, 0.2], c: '#FF5CA8', rot: [0.15, 0, 0.1] });
    P.push({ k: 'tcyl', p: [0.0, dd.top + 0.14, dd.headZ - 0.06], s: [0.17, 0.1, 0.14], c: '#FFFFFF', rot: [0.15, 0, 0.1] });
    P.push({ k: 'sph', p: [0.05, dd.top + 0.5, dd.headZ - 0.1], s: [0.09, 0.09, 0.09], c: '#FFD60A' });
  }
  return P;
}

/** The wagging tail (separate mesh so it can animate). Pivot at the rump. */
export function petTail(id: PersonId): Part[] {
  const a = family[id].avatar;
  if (id === 'rudolph') {
    // curled: rises, then curls forward over the back
    return [
      { k: 'sph', p: [0, 0.0, -0.05], s: [0.15, 0.15, 0.15], c: a.bodyColor },
      { k: 'sph', p: [0, 0.14, -0.12], s: [0.17, 0.17, 0.17], c: a.bodyColor },
      { k: 'sph', p: [0, 0.28, -0.08], s: [0.19, 0.19, 0.19], c: a.outfitColor },
      { k: 'sph', p: [0, 0.38, 0.04], s: [0.17, 0.17, 0.17], c: a.bodyColor },
      { k: 'sph', p: [0, 0.34, 0.18], s: [0.14, 0.14, 0.14], c: a.outfitColor },
    ];
  }
  // fluffy: thick plume
  return [
    { k: 'sph', p: [0, 0.0, -0.04], s: [0.12, 0.12, 0.12], c: a.bodyColor },
    { k: 'sph', p: [0, 0.16, -0.1], s: [0.15, 0.17, 0.15], c: '#8A5A2B' },
    { k: 'sph', p: [0, 0.34, -0.13], s: [0.17, 0.2, 0.17], c: a.bodyColor },
    { k: 'sph', p: [0, 0.53, -0.1], s: [0.18, 0.21, 0.18], c: a.bodyColor },
    { k: 'sph', p: [0, 0.72, -0.03], s: [0.15, 0.19, 0.15], c: '#8A5A2B' },
  ];
}

export function petTailPivot(id: PersonId): [number, number, number] {
  return id === 'rudolph' ? [0, 0.7, -0.5] : [0, 0.55, -0.4];
}
