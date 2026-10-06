import type { Expression, PersonId } from '../types';
import { family } from '../config/family';
import type { Part } from './merge';
import { decalEllipse, decalStrip, type Detail, type HeadSpec } from './figureGeometry';
import { darken, isPet } from './avatarParts';

type V3 = [number, number, number];
const NAVY = '#1D2A44';
const mixHex = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
};

/**
 * Simple printed-toy face (flat eye discs with highlights, brows, blush, mouth) as geometry on the head front:
 * the procedural fallback never shows a blank face. Positions are in head-local coordinates, shifted by `p`.
 * The Blender glbs carry richer `Face_<expression>` groups with the same expression names.
 */
export function faceParts(id: PersonId, expr: Expression, spec: HeadSpec, p: V3, d: Detail): Part[] {
  const a = family[id].avatar;
  const out: Part[] = [];
  const ell = (x: number, y: number, rx: number, ry: number, off: number, c: string) =>
    out.push({ k: 'geo', g: decalEllipse(spec, d, x, y, rx, ry, off), p, s: [1, 1, 1], c });
  const strip = (pts: [number, number][], w: number, off: number, c: string) =>
    out.push({ k: 'geo', g: decalStrip(spec, pts, w, off), p, s: [1, 1, 1], c });
  const pet = isPet(id);
  const surprised = expr === 'surprised';
  const silly = expr === 'silly';
  const mouthC = id === 'dad' ? '#C4505A' : '#7A2E2E';
  if (!pet) {
    const rx = surprised ? 0.075 : 0.068, ry = surprised ? 0.105 : 0.088;
    for (const sx of [-1, 1]) {
      const wink = silly && sx === 1;
      if (wink) strip([[0.1, 0.04], [0.17, 0.07], [0.24, 0.04]], 0.013, 0.014, NAVY);
      else {
        ell(sx * 0.17, 0.04, rx, ry, 0.012, NAVY);
        ell(sx * 0.17 + 0.02, 0.04 + ry * 0.4, 0.022, 0.026, 0.02, '#FFFFFF');
      }
      const by = surprised ? 0.24 : 0.19;
      strip(sx > 0 ? [[0.1, by - 0.02], [0.17, by + 0.012], [0.24, by - 0.01]] : [[-0.24, by - 0.01], [-0.17, by + 0.012], [-0.1, by - 0.02]], 0.012, 0.012, darken(a.hairColor, 0.1));
      if (id !== 'dad') ell(sx * 0.29, -0.1, 0.065, 0.04, 0.008, mixHex(a.skinTone, '#FF6F91', 0.5));
      if (id === 'luna') strip(sx > 0 ? [[0.22, 0.08], [0.26, 0.105]] : [[-0.26, 0.105], [-0.22, 0.08]], 0.008, 0.013, NAVY);
    }
    if (surprised) {
      ell(0, -0.17, 0.05, 0.065, 0.012, mouthC);
    } else if (silly) {
      ell(0, -0.16, 0.09, 0.05, 0.012, mouthC);
      ell(0.03, -0.2, 0.04, 0.035, 0.018, '#FF8FA3');
    } else if (id === 'dad') {
      ell(0, -0.17, 0.085, 0.04, 0.045, mouthC);
      ell(0, -0.155, 0.07, 0.016, 0.052, '#FFFFFF');
    } else strip([[-0.1, -0.13], [-0.05, -0.165], [0, -0.175], [0.05, -0.165], [0.1, -0.13]], 0.012, 0.012, mouthC);
  } else {
    const dog = id === 'rudolph';
    const er = surprised ? 0.065 : 0.05;
    for (const sx of [-1, 1]) {
      const x = sx * (dog ? 0.13 : 0.12);
      if (silly && sx === 1) strip([[x - 0.05, 0.07], [x, 0.1], [x + 0.05, 0.07]], 0.012, 0.014, NAVY);
      else {
        ell(x, 0.08, er, er * 1.1, 0.012, dog ? NAVY : '#D7B93E');
        if (!dog) ell(x, 0.08, 0.018, er * 0.95, 0.018, NAVY);
        ell(x + 0.015, 0.1, 0.015, 0.017, 0.022, '#FFFFFF');
      }
    }
    ell(0, -0.1, dog ? 0.17 : 0.13, dog ? 0.12 : 0.09, 0.01, dog ? a.outfitColor : darken(a.outfitColor, 0.25));
    ell(0, dog ? -0.05 : -0.06, dog ? 0.06 : 0.035, dog ? 0.04 : 0.025, 0.026, dog ? '#1E1E24' : '#F28AA6');
    if (surprised) ell(0, -0.19, 0.045, 0.055, 0.02, '#4A1E26');
    else {
      for (const sx of [-1, 1]) strip(sx > 0 ? [[0, -0.12], [0.035, -0.155], [0.07, -0.13]] : [[-0.07, -0.13], [-0.035, -0.155], [0, -0.12]], 0.008, 0.018, '#2B1B12');
      if (silly || (dog && expr === 'happy')) ell(0, -0.2, 0.035, silly ? 0.05 : 0.04, 0.02, '#FF8FA3');
    }
  }
  return out;
}
