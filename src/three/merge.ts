import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { V3 } from './prims';
import { pick, smoothWeld, type Detail } from './figureGeometry';

export type PartKind = 'box' | 'rbox' | 'sph' | 'cyl' | 'tcyl' | 'cone' | 'star' | 'rtap' | 'cap' | 'caps' | 'torus' | 'geo';

/**
 * A coloured piece of a merged mesh.
 * box/rbox: s = (w,h,d); sph: s = radii; cyl/cone: s = (r,h,r); tcyl: s = (rBottom,h,rTop); star: s = (radius, depth, _).
 * rtap: rounded box tapering to `t` (0..1) of its width at the bottom (shoulders wide, waist narrow).
 * caps: capsule along y, s = (radius, length, _). cap: capsule along z. torus: s = (ringRadius, tube, arcRadians).
 * geo: a prebuilt indexed geometry in `g` (cloned, so builders may share it).
 * `r` is the corner radius for rbox/rtap, `sc` a non-uniform scale applied before `rot`.
 */
export interface Part {
  k: PartKind;
  p: V3;
  s: V3;
  c: string;
  rot?: V3;
  r?: number;
  t?: number;
  /** radial segment override (spheres, capsules). */
  seg?: number;
  sc?: V3;
  g?: THREE.BufferGeometry;
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

function geometryFor(pt: Part, d: Detail): THREE.BufferGeometry {
  switch (pt.k) {
    case 'box':
      return new THREE.BoxGeometry(pt.s[0], pt.s[1], pt.s[2]);
    case 'rbox':
      return new RoundedBoxGeometry(pt.s[0], pt.s[1], pt.s[2], pt.seg ?? pick(d, 2, 1), pt.r ?? 0.12);
    case 'sph': {
      const w = pt.seg ?? pick(d, 8, 6);
      const g = new THREE.SphereGeometry(1, w, Math.max(4, Math.round(w * 0.6)));
      g.scale(pt.s[0], pt.s[1], pt.s[2]);
      return g;
    }
    case 'cyl':
      return new THREE.CylinderGeometry(pt.s[0], pt.s[0], pt.s[1], pt.seg ?? pick(d, 12, 8));
    case 'tcyl':
      return new THREE.CylinderGeometry(pt.s[2], pt.s[0], pt.s[1], pt.seg ?? pick(d, 12, 8));
    case 'cone':
      return new THREE.ConeGeometry(pt.s[0], pt.s[1], pt.seg ?? pick(d, 8, 6));
    case 'rtap': {
      let g: THREE.BufferGeometry = new RoundedBoxGeometry(pt.s[0], pt.s[1], pt.s[2], pt.seg ?? pick(d, 2, 1), pt.r ?? 0.12);
      g.deleteAttribute('uv');
      if (!g.index) g = mergeVertices(g);
      const pos = g.getAttribute('position');
      const t = pt.t ?? 0.8;
      for (let i = 0; i < pos.count; i++) {
        const k = (pos.getY(i) + pt.s[1] / 2) / pt.s[1]; // 0 bottom .. 1 top
        const f = t + (1 - t) * k;
        pos.setX(i, pos.getX(i) * f);
        pos.setZ(i, pos.getZ(i) * (0.9 + 0.1 * k));
      }
      g.computeVertexNormals();
      return g;
    }
    case 'caps':
      return new THREE.CapsuleGeometry(pt.s[0], pt.s[1], (pt.seg ?? 8) > 12 ? 2 : 1, pt.seg ?? pick(d, 8, 6));
    case 'cap': {
      const g = new THREE.CapsuleGeometry(pt.s[0], pt.s[1], pick(d, 5, 2), pt.seg ?? pick(d, 18, 10));
      g.rotateX(Math.PI / 2);
      return g;
    }
    case 'torus':
      return new THREE.TorusGeometry(pt.s[0], pt.s[1], pt.seg ?? pick(d, 6, 4), pick(d, 14, 8), pt.s[2]);
    case 'star': {
      const g = new THREE.ExtrudeGeometry(star(), { depth: pt.s[1], bevelEnabled: false });
      g.translate(0, 0, -pt.s[1] / 2);
      g.scale(pt.s[0], pt.s[0], 1);
      return smoothWeld(g, 0.5);
    }
    case 'geo':
      return pt.g!.clone();
  }
}

const mat = new THREE.Matrix4();
const eul = new THREE.Euler();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3(1, 1, 1);
const pos = new THREE.Vector3();
const col = new THREE.Color();

/** Merges parts into a single vertex-coloured geometry (1 draw call). */
export function mergeParts(parts: Part[], detail: Detail = 'high'): THREE.BufferGeometry {
  const list: THREE.BufferGeometry[] = [];
  for (const pt of parts) {
    let g = geometryFor(pt, detail);
    g.deleteAttribute('uv');
    if (!g.index) g = mergeVertices(g, 1e-4);
    if (pt.rot) {
      eul.set(pt.rot[0], pt.rot[1], pt.rot[2]);
      quat.setFromEuler(eul);
    } else quat.identity();
    pos.set(pt.p[0], pt.p[1], pt.p[2]);
    if (pt.sc) scl.set(pt.sc[0], pt.sc[1], pt.sc[2]);
    else scl.set(1, 1, 1);
    mat.compose(pos, quat, scl);
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

/** Shared molded-plastic figure material: glossy but restrained. envMap (soft studio room) is set by Avatar once a renderer exists. */
export const vertexMat = new THREE.MeshPhysicalMaterial({
  vertexColors: true,
  roughness: 0.36,
  metalness: 0,
  clearcoat: 0.25,
  clearcoatRoughness: 0.4,
  envMapIntensity: 0.4,
});
export const vertexMatFlat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, flatShading: true });
