import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { V3 } from './prims';

export type PartKind = 'box' | 'rbox' | 'sph' | 'cyl' | 'tcyl' | 'cone' | 'star';

/**
 * A coloured piece of a merged mesh.
 * box/rbox: s = (w,h,d); sph: s = radii; cyl/cone: s = (r,h,r); tcyl: s = (rBottom,h,rTop); star: s = (radius, depth, _).
 * `r` is the corner radius for rbox.
 */
export interface Part {
  k: PartKind;
  p: V3;
  s: V3;
  c: string;
  rot?: V3;
  r?: number;
}

let starShape: THREE.Shape | null = null;
function star(): THREE.Shape {
  if (starShape) return starShape;
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 1 : 0.45;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  sh.closePath();
  starShape = sh;
  return sh;
}

function geometryFor(pt: Part): THREE.BufferGeometry {
  switch (pt.k) {
    case 'box':
      return new THREE.BoxGeometry(pt.s[0], pt.s[1], pt.s[2]);
    case 'rbox':
      return new RoundedBoxGeometry(pt.s[0], pt.s[1], pt.s[2], 3, pt.r ?? 0.12);
    case 'sph': {
      const g = new THREE.SphereGeometry(1, 14, 10);
      g.scale(pt.s[0], pt.s[1], pt.s[2]);
      return g;
    }
    case 'cyl':
      return new THREE.CylinderGeometry(pt.s[0], pt.s[0], pt.s[1], 12);
    case 'tcyl':
      return new THREE.CylinderGeometry(pt.s[2], pt.s[0], pt.s[1], 14);
    case 'cone':
      return new THREE.ConeGeometry(pt.s[0], pt.s[1], 12);
    case 'star': {
      const g = new THREE.ExtrudeGeometry(star(), { depth: pt.s[1], bevelEnabled: false });
      g.translate(0, 0, -pt.s[1] / 2);
      g.scale(pt.s[0], pt.s[0], 1);
      return g;
    }
  }
}

const mat = new THREE.Matrix4();
const eul = new THREE.Euler();
const quat = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);
const pos = new THREE.Vector3();
const col = new THREE.Color();

/** Merges parts into a single vertex-coloured geometry (1 draw call). */
export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const list: THREE.BufferGeometry[] = [];
  for (const pt of parts) {
    const raw = geometryFor(pt);
    const g = raw.index ? raw.toNonIndexed() : raw;
    g.deleteAttribute('uv');
    if (pt.rot) {
      eul.set(pt.rot[0], pt.rot[1], pt.rot[2]);
      quat.setFromEuler(eul);
    } else quat.identity();
    pos.set(pt.p[0], pt.p[1], pt.p[2]);
    mat.compose(pos, quat, one);
    g.applyMatrix4(mat);
    col.set(pt.c);
    const n = g.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = col.r;
      arr[i * 3 + 1] = col.g;
      arr[i * 3 + 2] = col.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    list.push(g);
  }
  const merged = mergeGeometries(list, false);
  list.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

export const vertexMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 });
export const vertexMatFlat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, flatShading: true });
