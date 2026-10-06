import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Geometry builders for the high-detail figures. Everything returns indexed geometry with smooth normals and no uv. */
export type Detail = 'high' | 'low';
export const pick = <T>(d: Detail, hi: T, lo: T): T => (d === 'high' ? hi : lo);

const V2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** Drops uv, welds duplicate vertices and smooths normals below `crease` radians. */
export function smoothWeld(g: THREE.BufferGeometry, crease = 0.9): THREE.BufferGeometry {
  g.deleteAttribute('uv');
  const c = toCreasedNormals(g, crease);
  c.deleteAttribute('uv');
  g.dispose();
  return mergeVertices(c, 1e-4);
}

/* ------------------------------------------------------------------ head ---------- */

export interface HeadSpec {
  r: number;
  h: number;
  /** z scale of the whole turned head (flatter front-to-back). */
  depth: number;
  bevel: number;
  topBevel: number;
  /** extra radius at mouth height (cheeks). */
  cheek: number;
  cheekY: number;
}

/** Lathe profile (bottom centre -> bottom bevel -> cheeky sides -> soft top rim -> top centre), local to the head centre. */
export function headProfile(s: HeadSpec, d: Detail): THREE.Vector2[] {
  const { r, h, bevel: b, topBevel: tb, cheek, cheekY } = s;
  const pts: THREE.Vector2[] = [V2(0, -h / 2)];
  const nb = pick(d, 2, 1);
  for (let i = 0; i <= nb; i++) {
    const a = -Math.PI / 2 + ((Math.PI / 2) * i) / nb;
    pts.push(V2(r - b + Math.cos(a) * b, -h / 2 + b + Math.sin(a) * b));
  }
  const y0 = -h / 2 + b;
  const y1 = h / 2 - tb;
  const ns = pick(d, 5, 3);
  for (let k = 1; k < ns; k++) {
    const y = y0 + ((y1 - y0) * k) / ns;
    const bump = Math.exp(-(((y - cheekY) / 0.2) ** 2));
    pts.push(V2(r + cheek * bump, y));
  }
  const nt = pick(d, 4, 2);
  for (let i = 0; i <= nt; i++) {
    const a = ((Math.PI / 2) * i) / nt;
    pts.push(V2(r - tb + Math.cos(a) * tb, h / 2 - tb + Math.sin(a) * tb));
  }
  pts.push(V2(0, h / 2));
  return pts;
}

/** Radius of the head profile at local height y (linear along the profile). */
export function profileRadius(pts: THREE.Vector2[], y: number): number {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (y >= a.y - 1e-9 && y <= b.y + 1e-9 && b.y > a.y + 1e-9) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y);
  }
  return pts[pts.length - 1].x;
}

export function headGeometry(s: HeadSpec, d: Detail): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(headProfile(s, d), pick(d, 32, 18));
  g.scale(1, 1, s.depth);
  g.deleteAttribute('uv');
  return g;
}

/** Face plate wrapped on the exact head profile (same radius function, same depth scale) a hair above the skin. */
export function headPlateGeometry(s: HeadSpec, d: Detail, yLo: number, yHi: number, arcW: number, off = 0.01): THREE.BufferGeometry {
  const prof = headProfile(s, d);
  const nx = pick(d, 20, 12);
  const ny = pick(d, 8, 5);
  const pos: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i <= ny; i++) {
    const v = i / ny;
    const y = yLo + (yHi - yLo) * v;
    const rho = profileRadius(prof, y) + off;
    for (let j = 0; j <= nx; j++) {
      const u = j / nx;
      const th = (u - 0.5) * (arcW / s.r);
      pos.push(Math.sin(th) * rho, y, Math.cos(th) * rho * s.depth);
      uv.push(u, v);
    }
  }
  const idx: number[] = [];
  const row = nx + 1;
  for (let i = 0; i < ny; i++) {
    for (let j = 0; j < nx; j++) {
      const a = i * row + j, b = a + row, c = b + 1, e = a + 1;
      idx.push(a, e, b, b, e, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface HairCapOpts {
  /** Hairline height (local y) as a function of the angle around the head, 0 = straight ahead (+z), +-PI = back. */
  hairline: (phi: number) => number;
  thick: number;
  topThick?: number;
  /** Surface ripple (waves / curls): amplitude and frequencies (around, up). */
  wave?: { amp: number; around: number; up: number };
  segs?: number;
  rows?: number;
}

/** Smooth 0..1 ramp. */
export const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * One continuous hair shell hugging the head with a shaped hairline (high at the forehead, dipping at the sides/back):
 * the head profile offset along its normals, resampled per column between the hairline and the crown apex.
 */
export function hairCapGeometry(s: HeadSpec, d: Detail, o: HairCapOpts): THREE.BufferGeometry {
  const src = headProfile(s, 'high').filter((p) => p.y > -s.h / 2 + s.bevel * 0.5);
  const top = o.topThick ?? o.thick;
  const topY = s.h / 2;
  const off: THREE.Vector2[] = src.map((p, i) => {
    const a = src[Math.max(0, i - 1)], b = src[Math.min(src.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, Math.max(0, (p.y + 0.15) / (topY + 0.15)));
    const t = o.thick + (top - o.thick) * k * k;
    return V2(Math.max(0, p.x + (dy / l) * t), p.y + (-dx / l) * t);
  });
  off[off.length - 1].x = 0;
  const cum = [0];
  for (let i = 1; i < off.length; i++) cum.push(cum[i - 1] + off[i].distanceTo(off[i - 1]));
  const at = (sl: number): THREE.Vector2 => {
    for (let i = 1; i < off.length; i++) {
      if (sl <= cum[i] + 1e-9) {
        const u = (sl - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
        return V2(off[i - 1].x + (off[i].x - off[i - 1].x) * u, off[i - 1].y + (off[i].y - off[i - 1].y) * u);
      }
    }
    return off[off.length - 1].clone();
  };
  const sAtY = (y: number): number => {
    for (let i = 1; i < off.length; i++) {
      if (off[i].y >= y && off[i].y > off[i - 1].y) return cum[i - 1] + ((cum[i] - cum[i - 1]) * (y - off[i - 1].y)) / (off[i].y - off[i - 1].y);
    }
    return cum[cum.length - 1] - 0.05;
  };
  const cols = o.segs ?? pick(d, 28, 14);
  const rows = o.rows ?? pick(d, 7, 4);
  const pos: number[] = [];
  const total = cum[cum.length - 1];
  const wv = o.wave;
  for (let c = 0; c < cols; c++) {
    const phi = (c / cols) * Math.PI * 2;
    const phiS = phi > Math.PI ? phi - Math.PI * 2 : phi;
    const s0 = Math.min(total - 0.08, sAtY(o.hairline(phiS)));
    for (let r = 0; r <= rows; r++) {
      const u = r / rows;
      const p = at(s0 + (total - s0) * u);
      let rho = p.x;
      if (wv && p.x > 0.02) rho += wv.amp * Math.sin(wv.around * phi + wv.up * p.y) * Math.min(1, u * 3) * (p.x > 0.1 ? 1 : p.x / 0.1);
      // the first ring tucks into the head surface so the rim blends in
      if (r === 0) rho = Math.max(0, rho - o.thick * 0.85);
      pos.push(Math.sin(phi) * rho, p.y, Math.cos(phi) * rho * s.depth);
    }
  }
  const idx: number[] = [];
  const row = rows + 1;
  for (let c = 0; c < cols; c++) {
    const c1 = (c + 1) % cols;
    for (let r = 0; r < rows; r++) {
      const a = c * row + r, b = c1 * row + r, cc = c1 * row + r + 1, e = c * row + r + 1;
      idx.push(a, b, e, b, cc, e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ torso / feet ---------- */

/** Polygon with rounded corners (quadratic arcs). */
export function roundedShape(pts: THREE.Vector2[], rad: number): THREE.Shape {
  const n = pts.length;
  const sh = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const d1 = a.clone().sub(p), d2 = b.clone().sub(p);
    const l1 = d1.length(), l2 = d2.length();
    d1.normalize();
    d2.normalize();
    const ang = Math.acos(Math.max(-1, Math.min(1, d1.dot(d2))));
    const t = Math.min(rad / Math.tan(ang / 2), l1 / 2, l2 / 2);
    const p1 = p.clone().addScaledVector(d1, t), p2 = p.clone().addScaledVector(d2, t);
    if (i === 0) sh.moveTo(p1.x, p1.y);
    else sh.lineTo(p1.x, p1.y);
    sh.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  sh.closePath();
  return sh;
}

/** Bevelled extrusion centred on the origin; `w,h,depth` are the final outer dimensions (bevel included). */
export function bevelExtrude(pts: THREE.Vector2[], depth: number, bevel: number, rad: number, d: Detail, bevelSeg = pick(d, 4, 2), curveSeg = pick(d, 4, 2)): THREE.BufferGeometry {
  const shape = roundedShape(pts, rad);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: bevelSeg,
    curveSegments: curveSeg,
  });
  g.translate(0, 0, -(depth - 2 * bevel) / 2);
  return smoothWeld(g);
}

/** Rounded trapezoid torso: wide shoulders (w) to narrow waist (wb). */
export function torsoGeometry(w: number, wb: number, h: number, depth: number, d: Detail): THREE.BufferGeometry {
  const pts = [V2(-w / 2, h / 2), V2(-wb / 2, -h / 2), V2(wb / 2, -h / 2), V2(w / 2, h / 2)];
  return bevelExtrude(pts, depth, 0.07, 0.17, d);
}

export function panelGeometry(w: number, h: number, depth: number, d: Detail): THREE.BufferGeometry {
  const pts = [V2(-w / 2, h / 2), V2(-w / 2, -h / 2), V2(w / 2, -h / 2), V2(w / 2, h / 2)];
  return bevelExtrude(pts, depth, 0.016, 0.07, d, pick(d, 2, 1), pick(d, 3, 2));
}

/** Round stud, axis +z. */
export function studGeometry(r: number, h: number, d: Detail): THREE.BufferGeometry {
  const pts = [V2(r, 0), V2(r, h * 0.7), V2(r * 0.8, h * 0.95), V2(r * 0.4, h), V2(0, h)];
  const g = new THREE.LatheGeometry(pts, pick(d, 14, 8));
  g.deleteAttribute('uv');
  g.rotateX(Math.PI / 2);
  return g;
}

/** Side-profile shoe (heel block, toe step, sole groove), extruded across x, centred. Faces +z. */
export function footGeometry(width: number, d: Detail): THREE.BufferGeometry {
  const pts = [
    V2(-0.2, 0), V2(0.02, 0), V2(0.06, 0.035), V2(0.11, 0), V2(0.34, 0), V2(0.4, 0.07),
    V2(0.36, 0.14), V2(0.14, 0.17), V2(0.06, 0.22), V2(-0.16, 0.22), V2(-0.22, 0.14),
  ];
  const g = bevelExtrude(pts, width, 0.04, 0.03, d, pick(d, 2, 1), pick(d, 2, 1));
  g.rotateY(-Math.PI / 2);
  return g;
}

/* ------------------------------------------------------------------ arms ---------- */

/** C-shaped hand: a thick torus arc (sweep ~250 deg) with rounded tips, gap facing +z, centred on the ring centre. */
export function cHandGeometry(R: number, tube: number, sweep: number, d: Detail): THREE.BufferGeometry {
  const radial = pick(d, 8, 6);
  const tubular = pick(d, 12, 8);
  const parts: THREE.BufferGeometry[] = [];
  const torus = new THREE.TorusGeometry(R, tube, radial, tubular, sweep);
  parts.push(torus);
  for (const a of [0, sweep]) {
    const s = new THREE.SphereGeometry(tube, pick(d, 7, 5), pick(d, 5, 4));
    s.translate(Math.cos(a) * R, Math.sin(a) * R, 0);
    parts.push(s);
  }
  const gapCenter = sweep + (Math.PI * 2 - sweep) / 2;
  const out = parts.map((p) => {
    p.rotateZ(Math.PI - gapCenter);
    p.rotateY(Math.PI / 2);
    p.deleteAttribute('uv');
    return p;
  });
  return mergeIndexed(out);
}

export function mergeIndexed(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vc = 0;
  let ic = 0;
  for (const g of list) {
    vc += g.getAttribute('position').count;
    ic += g.index ? g.index.count : g.getAttribute('position').count;
  }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3);
  const idx: number[] = [];
  let vo = 0;
  for (const g of list) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    pos.set(p.array as Float32Array, vo * 3);
    nor.set(n.array as Float32Array, vo * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + vo);
    else for (let i = 0; i < p.count; i++) idx.push(i + vo);
    vo += p.count;
    g.dispose();
  }
  void ic;
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setIndex(idx);
  return m;
}

/* ------------------------------------------------------------------ pets / misc ---------- */

/** Tube along a Catmull-Rom curve with a radius that varies along its length (curled / plume tails). */
export function taperedTube(points: [number, number, number][], radius: (t: number) => number, d: Detail): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const tubular = pick(d, 22, 12);
  const radial = pick(d, 8, 6);
  const frames = curve.computeFrenetFrames(tubular, false);
  const pos: number[] = [];
  const nor: number[] = [];
  const P = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, P);
    const N = frames.normals[i], B = frames.binormals[i];
    const r = radius(t);
    for (let j = 0; j < radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      const nx = Math.cos(v) * N.x + Math.sin(v) * B.x;
      const ny = Math.cos(v) * N.y + Math.sin(v) * B.y;
      const nz = Math.cos(v) * N.z + Math.sin(v) * B.z;
      pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
      nor.push(nx, ny, nz);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial);
      const c = a + radial, e = b + radial;
      idx.push(a, b, c, b, e, c);
    }
  }
  // end caps
  for (const [ring, flip] of [[0, true], [tubular, false]] as const) {
    const t = ring / tubular;
    curve.getPointAt(t, P);
    const tan = frames.tangents[ring];
    const ci = pos.length / 3;
    pos.push(P.x, P.y, P.z);
    const s = flip ? -1 : 1;
    nor.push(tan.x * s, tan.y * s, tan.z * s);
    for (let j = 0; j < radial; j++) {
      const a = ring * radial + j, b = ring * radial + ((j + 1) % radial);
      if (flip) idx.push(ci, b, a);
      else idx.push(ci, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Tapered muzzle pointing +z: a lathe profile turned onto the z axis. */
export function snoutGeometry(len: number, r0: number, r1: number, d: Detail): THREE.BufferGeometry {
  const pts = [V2(0, 0), V2(r0, 0), V2(r0 * 0.9 + r1 * 0.1, len * 0.3), V2(r1 * 1.1, len * 0.8), V2(r1 * 0.7, len * 0.97), V2(0, len)];
  const g = new THREE.LatheGeometry(pts, pick(d, 14, 8));
  g.deleteAttribute('uv');
  g.rotateX(Math.PI / 2);
  return g;
}

/** Soft beard: a partial torus band hugging the jaw (front half), z-scaled like the head and roughened a little. */
export function beardGeometry(R: number, tube: number, arc: number, depth: number, d: Detail): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(R, tube, pick(d, 8, 6), pick(d, 28, 14), arc);
  g.rotateX(Math.PI / 2);
  const p = g.getAttribute('position');
  let cx = 0, cz = 0;
  for (let i = 0; i < p.count; i++) {
    cx += p.getX(i);
    cz += p.getZ(i);
  }
  g.rotateY(-Math.atan2(cx, cz));
  const dims = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 61.7 + z * 37.1 + y * 23.3) * 0.5 + Math.sin(x * 29.3 - z * 51.9) * 0.5;
    const k = 1 + n * 0.12;
    dims.set(x * k, y * (1 + n * 0.08), z * k * depth);
    p.setXYZ(i, dims.x, dims.y, dims.z);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ garments ---------- */

/** Closed lathe shell (outer wall, rounded hem, inner wall) flaring from waist to hem; z-scaled; softened hem. */
export function skirtGeometry(waistR: number, hemR: number, height: number, thick: number, zScale: number, d: Detail): THREE.BufferGeometry {
  const h = height;
  // closed loop, outer wall ascending so normals point outward: inner hem -> rounded hem -> up the outer wall -> down the inner wall
  const pts: THREE.Vector2[] = [
    V2(hemR - thick, -h / 2 + 0.02), V2(hemR - thick * 0.5, -h / 2 - 0.025), V2(hemR + 0.01, -h / 2), V2(hemR, -h / 2 + 0.04),
    V2(waistR + (hemR - waistR) * 0.75, -h * 0.3), V2(waistR + (hemR - waistR) * 0.3, h * 0.15), V2(waistR, h / 2), V2(waistR - thick, h / 2),
  ];
  const g = new THREE.LatheGeometry(pts, pick(d, 32, 16));
  g.scale(1, 1, zScale);
  g.deleteAttribute('uv');
  return g;
}

/** Open back-facing shell (cape): flaring partial lathe of given thickness, centred on -z. */
export function capeGeometry(topR: number, hemR: number, height: number, thick: number, zScale: number, half: number, d: Detail): THREE.BufferGeometry {
  const pts = [V2(hemR - thick, -height / 2), V2(hemR, -height / 2), V2(topR + (hemR - topR) * 0.4, height * 0.1), V2(topR, height / 2), V2(topR - thick, height / 2), V2(topR + (hemR - topR) * 0.4 - thick, height * 0.1)];
  const g = new THREE.LatheGeometry(pts, pick(d, 16, 8), Math.PI - half, half * 2);
  g.scale(1, 1, zScale);
  g.deleteAttribute('uv');
  return g;
}

/** Ring band hugging the head profile between yLo and yHi (visor band, headbands). */
export function bandGeometry(s: HeadSpec, d: Detail, yLo: number, yHi: number, thick: number): THREE.BufferGeometry {
  const prof = headProfile(s, 'high');
  const rLo = profileRadius(prof, yLo), rHi = profileRadius(prof, yHi);
  const pts = [V2(rLo + thick, yLo), V2(rHi + thick, yHi), V2(rHi + 0.004, yHi), V2(rLo + 0.004, yLo)];
  const g = new THREE.LatheGeometry(pts, pick(d, 32, 16));
  g.scale(1, 1, s.depth);
  g.deleteAttribute('uv');
  return g;
}

/** Visor brim: thin curved plate fanning forward (+z), rounded edge. */
export function brimGeometry(r0: number, reach: number, thick: number, half: number, d: Detail): THREE.BufferGeometry {
  const pts = [V2(r0 - 0.04, -thick), V2(r0 + reach, -0.05 - thick), V2(r0 + reach + 0.015, -0.05 - thick * 0.5), V2(r0 + reach, -0.05), V2(r0 - 0.04, 0)];
  const g = new THREE.LatheGeometry(pts, pick(d, 16, 8), -half, half * 2);
  g.deleteAttribute('uv');
  return g;
}

/** Arc of torus lying in the XY plane, centred on +y (tiara / headband). */
export function arcBand(R: number, tube: number, arc: number, d: Detail): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(R, tube, pick(d, 4, 3), pick(d, 14, 8), arc);
  g.rotateZ(Math.PI / 2 - arc / 2);
  g.deleteAttribute('uv');
  return g;
}
