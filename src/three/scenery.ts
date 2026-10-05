import type { ZoneId } from '../types';
import { Builder, rng, type Prim } from './prims';
import { CAKE_RADIUS, HALF, LUNA_POS, groundHeight, hostPos, layout, zoneWorld } from './layout';

export const C = {
  pink: '#FF5CA8', pinkLight: '#FF9CC8', pinkDark: '#E03E8C', cream: '#FFF1D6', creamDark: '#F4DDB0', red: '#E63946', redDark: '#B92532',
  blue: '#3A86FF', blueDark: '#2A63CF', blueLight: '#7FB2FF', yellow: '#FFD60A', green: '#4CC95B', greenDark: '#2E9E4A',
  mint: '#7AE582', tan: '#F8D98C', tan2: '#F0C86E', brown: '#8B5A2B', dirt: '#B5793F', white: '#FFFFFF', navy: '#1D2A44', purple: '#5B2D8E',
  gray: '#8A8F98', black: '#2B2B33', glass: '#CBEEFF', orange: '#FF8C42', wood: '#7A4A26',
};
export const BRICK_COLORS = ['#E63946', '#FFD60A', '#3A86FF', '#FF5CA8', '#7AE582', '#FF8C42', '#9B5DE5'];

const GRASS = ['#58D26B', '#4CC95B', '#62D974', '#52CE64'];

function distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Brick-stepped grass/path plates (1x1, 2x2 studs each) plus the layered cliff underneath. */
function ground(b: Builder): void {
  const r = rng(7);
  const entrances: [number, number][] = (Object.keys(layout) as ZoneId[]).map((z) => {
    const p = zoneWorld(z, [0, 0, z === 'music' ? 1.6 : 2.4]);
    return [p[0], p[2]];
  });
  const n = HALF * 2;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < n; k++) {
      const x = -HALF + 0.5 + i;
      const z = -HALF + 0.5 + k;
      const edge = Math.max(Math.abs(x), Math.abs(z));
      if (edge > HALF - 0.4 && Math.abs(x) + Math.abs(z) > HALF * 1.8) continue;
      let path = Math.hypot(x, z) < CAKE_RADIUS + 0.9;
      if (!path) for (const [ex, ez] of entrances) if (distToSeg(x, z, 0, 0, ex, ez) < 0.62) path = true;
      const h = groundHeight(x, z);
      const c = path ? (((i + k) & 1) === 0 ? C.tan : C.tan2) : GRASS[Math.floor(r() * GRASS.length)];
      b.box([x, (h - 0.4) / 2, z], [1, 0.4 + h, 1], c, { studs: true });
    }
  }
  // cliff: strata of 2x2 columns shrinking downwards (cream / tan / pink / brown)
  const strata = [
    ['#F6D8A8', '#E8B87A', '#F2A6C4', '#FFF1D6'],
    ['#E8B87A', '#FFD66B', '#F6D8A8', '#D9A066'],
    ['#D9A066', '#F2A6C4', '#C98B4F', '#FFD66B'],
    ['#C98B4F', '#B87A3C', '#D9A066', '#F2A6C4'],
    ['#B87A3C', '#A66B3C', '#C98B4F', '#8D5A2E'],
    ['#8D5A2E', '#A66B3C', '#B87A3C', '#7A4A26'],
  ];
  let y = -0.4;
  for (let layer = 0; layer < 6; layer++) {
    const cells = Math.max(1, 7 - layer);
    const h = 0.72;
    for (let i = 0; i < cells; i++) {
      for (let k = 0; k < cells; k++) {
        const outer = i === 0 || k === 0 || i === cells - 1 || k === cells - 1;
        if (layer >= 2 && outer && r() < 0.28) continue;
        const x = (i - (cells - 1) / 2) * 2;
        const z = (k - (cells - 1) / 2) * 2;
        const extra = r() * 0.35;
        const cols = strata[layer];
        b.box([x, y - h / 2 - extra / 2, z], [2, h + extra, 2], cols[Math.floor(r() * cols.length)]);
      }
    }
    y -= h;
  }
  b.box([0, y - 0.3, 0], [1.4, 0.6, 1.4], '#7A4A26');
}

function blockedZones(): [number, number, number][] {
  const blocked: [number, number, number][] = [[0, 0, CAKE_RADIUS + 1.2], [LUNA_POS[0], LUNA_POS[2], 1.3]];
  for (const z of Object.keys(layout) as ZoneId[]) {
    const p = zoneWorld(z, [0, 0, 0]);
    blocked.push([p[0], p[2], 3.1]);
    const h = hostPos(z, true);
    blocked.push([h[0], h[2], 1.1]);
  }
  return blocked;
}

/** Flowers, brick flower beds (stud clusters), bushes, rim trees, rocks. */
function decor(b: Builder): void {
  const r = rng(21);
  const blocked = blockedZones();
  const free = (x: number, z: number, m = 0) => !blocked.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br + m);
  const inIsland = (x: number, z: number) => Math.abs(x) + Math.abs(z) < HALF * 1.7 && Math.max(Math.abs(x), Math.abs(z)) < HALF - 0.5;
  const colors = [C.pink, C.yellow, C.white, C.pinkLight, '#B388FF'];

  let placed = 0;
  for (let tries = 0; tries < 600 && placed < 40; tries++) {
    const x = (r() * 2 - 1) * (HALF - 0.6);
    const z = (r() * 2 - 1) * (HALF - 0.6);
    if (!inIsland(x, z) || !free(x, z)) continue;
    placed++;
    const g = groundHeight(x, z);
    b.cyl([x, g + 0.12, z], 0.025, 0.24, C.greenDark);
    b.sph([x, g + 0.3, z], 0.12, colors[Math.floor(r() * colors.length)]);
    b.sph([x, g + 0.33, z], 0.05, C.yellow);
  }
  // flower beds: little studded bricks in pink/yellow
  placed = 0;
  for (let tries = 0; tries < 600 && placed < 16; tries++) {
    const x = (r() * 2 - 1) * (HALF - 0.8);
    const z = (r() * 2 - 1) * (HALF - 0.8);
    if (!inIsland(x, z) || !free(x, z, 0.2)) continue;
    placed++;
    const g = groundHeight(x, z);
    const c1 = r() < 0.5 ? C.pink : C.yellow;
    b.box([x, g + 0.11, z], [0.7, 0.22, 0.46], C.greenDark, { studs: 0.23 });
    b.box([x - 0.12, g + 0.34, z], [0.36, 0.22, 0.36], c1, { studs: 0.18 });
    b.box([x + 0.2, g + 0.3, z + 0.05], [0.3, 0.14, 0.3], c1 === C.pink ? C.yellow : C.pinkLight, { studs: 0.15 });
  }
  // bushes
  placed = 0;
  for (let tries = 0; tries < 600 && placed < 14; tries++) {
    const x = (r() * 2 - 1) * (HALF - 0.5);
    const z = (r() * 2 - 1) * (HALF - 0.5);
    if (!inIsland(x, z) || !free(x, z, 0.3)) continue;
    placed++;
    const g = groundHeight(x, z);
    const s = 0.45 + r() * 0.25;
    b.box([x, g + s / 2, z], [s, s, s], C.greenDark, { studs: 0.22 });
    b.sph([x + s * 0.5, g + s * 0.35, z - s * 0.2], s * 0.35, '#3DB45A');
  }
  // rim trees (tiered brick pines + round trees) around the edge and on the hills
  const treeSpots: [number, number, number][] = [
    [-5.8, -5.5, 1.0], [-5.4, -4.5, 0.8], [5.8, 5.6, 1.0], [5.3, 4.9, 0.8], [-5.6, 5.7, 0.9], [-6.0, -2.7, 0.85], [6.0, 1.4, 0.8], [2.8, -6.1, 0.9], [-2.5, -6.0, 0.8],
    [6.0, -5.0, 0.9], [-0.5, 6.2, 0.8], [3.6, 6.1, 0.85],
  ];
  treeSpots.forEach(([x, z, s], i) => {
    if (!inIsland(x, z) || !free(x, z, -1.2)) return;
    const g = groundHeight(x, z);
    if (i % 3 === 0) {
      b.cyl([x, g + 0.35 * s, z], 0.14 * s, 0.7 * s, C.wood);
      b.sph([x, g + 1.05 * s, z], [0.62 * s, 0.56 * s, 0.62 * s], '#52CE64');
      b.sph([x + 0.22 * s, g + 1.28 * s, z], 0.38 * s, '#6BE07C');
      b.sph([x - 0.3 * s, g + 0.95 * s, z + 0.15 * s], 0.1 * s, C.pinkLight);
    } else {
      pine(b, x, z, s * 0.85, i, g);
    }
  });
  // rocks
  for (const [x, z] of [[-3.2, -5.2], [4.6, 5.3], [6.0, -2.2]] as const) {
    if (!free(x, z, -1)) continue;
    const g = groundHeight(x, z);
    b.box([x, g + 0.14, z], [0.5, 0.28, 0.4], '#B9BEC7', { studs: 0.25 });
    b.box([x + 0.35, g + 0.1, z + 0.1], [0.3, 0.2, 0.3], '#9EA4AE', { studs: 0.15 });
  }
}

function pine(b: Builder, x: number, z: number, s: number, shade: number, g = 0, tiers = 4): void {
  const gcol = ['#2E9E4A', '#3DB45A', '#2A8F44'][shade % 3];
  b.cyl([x, g + 0.3 * s, z], 0.15 * s, 0.6 * s, C.wood);
  for (let i = 0; i < tiers; i++) {
    const w = (1.15 - i * (0.85 / tiers)) * s;
    b.box([x, g + (0.75 + i * 0.4) * s, z], [w, 0.42 * s, w], gcol, { studs: w > 0.6 ? 0.3 * s : false });
  }
  b.box([x, g + (0.75 + tiers * 0.4) * s, z], [0.22 * s, 0.3 * s, 0.22 * s], '#6BE07C');
}

/** Picket fence along an axis-aligned run, plus a sign post. */
function fence(b: Builder, x0: number, z0: number, x1: number, z1: number): void {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.round(len / 0.45));
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    const g = groundHeight(x, z);
    b.box([x, g + 0.27, z], [0.13, 0.54, 0.13], C.white);
    b.box([x, g + 0.56, z], [0.13, 0.08, 0.13], '#FFE4EF');
  }
  const g = groundHeight((x0 + x1) / 2, (z0 + z1) / 2);
  for (const y of [0.18, 0.4]) {
    b.box([(x0 + x1) / 2, g + y, (z0 + z1) / 2], along ? [len, 0.07, 0.05] : [0.05, 0.07, len], '#F4DDB0');
  }
}

function signpost(b: Builder, x: number, z: number): void {
  const g = groundHeight(x, z);
  b.at([x, g, z], 0.5, () => {
    b.box([0, 0.7, 0], [0.14, 1.4, 0.14], C.wood);
    b.sph([0, 1.42, 0], 0.1, C.yellow);
    const boards: [number, number, string, string][] = [[1.15, 0.2, C.pink, C.white], [0.88, -0.45, C.blue, C.white], [0.6, 0.9, C.red, C.cream]];
    boards.forEach(([y, yaw, c1, c2]) => {
      b.at([0, y, 0], yaw, () => {
        b.box([0.4, 0, 0], [0.8, 0.22, 0.06], c1);
        b.box([0.82, 0, 0], [0.12, 0.22, 0.06], c1, { rot: [0, 0, 0] });
        b.box([0.4, 0, 0.035], [0.5, 0.06, 0.02], c2);
      });
    });
  });
}

function cakePlatform(b: Builder, candles: number): void {
  b.cyl([0, 0.09, 0], 2.1, 0.18, C.cream);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.cyl([Math.cos(a) * 1.85, 0.22, Math.sin(a) * 1.85], 0.14, 0.1, BRICK_COLORS[i % BRICK_COLORS.length]);
  }
  b.cyl([0, 0.55, 0], 1.45, 0.74, C.pink);
  for (let i = 0; i < 5; i++) b.cyl([0, 0.3 + i * 0.14, 0], 1.47, 0.03, C.pinkDark);
  b.cyl([0, 0.95, 0], 1.52, 0.14, C.white);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    b.sph([Math.cos(a) * 1.5, 0.9, Math.sin(a) * 1.5], [0.17, 0.2, 0.17], C.white);
  }
  b.cyl([0, 1.25, 0], 1.0, 0.5, '#FFB3D6');
  b.cyl([0, 1.52, 0], 1.05, 0.08, C.white);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.sph([Math.cos(a) * 0.86, 1.62, Math.sin(a) * 0.86], 0.11, i % 2 ? C.red : C.blue);
  }
  for (let i = 0; i < candles; i++) {
    const [x, , z] = candlePos(i, candles);
    b.cyl([x, 1.56 + 0.2, z], 0.045, 0.4, i % 2 ? C.white : C.yellow);
    b.cyl([x, 1.56 + 0.2, z], 0.048, 0.06, C.pink);
    b.cyl([x, 1.56 + 0.34, z], 0.048, 0.06, C.pink);
  }
}

/** World position of the flame above candle i of n (ring on the cake's top tier). */
export function candlePos(i: number, n: number): [number, number, number] {
  const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.4;
  return [Math.cos(a) * 0.88, 1.56 + 0.46, Math.sin(a) * 0.88];
}

/** Under-construction plot: a half-built wall, scaffolding, pallets and the crane mast (the arm swings, see Anim). */
function cranePlot(b: Builder, color: string): void {
  b.box([0, 0.04, 0], [3.4, 0.08, 3.2], '#C9A06B', { studs: true });
  // half-built wall (windows left open)
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      if (row === 1 && i === 2) continue;
      b.box([-1.1 + i * 0.55, 0.27 + row * 0.38, 0.8], [0.54, 0.36, 0.5], row === 1 ? C.cream : color, { studs: true });
    }
  }
  b.box([-1.1, 1.4, 0.8], [0.54, 0.36, 0.5], color, { studs: true });
  b.box([-0.55, 1.4, 0.8], [0.54, 0.36, 0.5], C.yellow, { studs: true });
  // scaffolding
  for (const x of [-1.5, 0.2]) for (const z of [0.5, 1.15]) b.box([x, 0.85, z], [0.07, 1.7, 0.07], '#FFB020');
  for (const y of [0.55, 1.2, 1.7]) {
    b.box([-0.65, y, 0.5], [1.8, 0.06, 0.07], '#FFB020');
    b.box([-0.65, y, 1.15], [1.8, 0.06, 0.07], '#FFB020');
    b.box([-0.65, y + 0.05, 0.83], [1.8, 0.05, 0.7], '#C98B4F');
  }
  // pallets of bricks
  b.box([1.1, 0.14, 1.0], [0.7, 0.2, 0.5], '#9B7B4B');
  b.box([1.1, 0.34, 1.0], [0.64, 0.2, 0.44], C.red, { studs: 0.2 });
  b.box([1.1, 0.54, 1.0], [0.64, 0.2, 0.44], C.yellow, { studs: 0.2 });
  b.box([1.35, 0.14, -0.3], [0.5, 0.2, 0.5], '#9B7B4B');
  b.box([1.35, 0.34, -0.3], [0.44, 0.2, 0.44], C.blue, { studs: 0.22 });
  // traffic cones + warning tape posts
  for (const [x, z] of [[-1.5, 1.5], [0.4, 1.55], [1.6, 0.3]] as const) {
    b.cone([x, 0.2, z], 0.12, 0.3, C.orange);
    b.cyl([x, 0.06, z], 0.15, 0.04, C.orange);
  }
  // crane mast
  b.box([-1.15, 0.18, -0.9], [0.9, 0.2, 0.9], C.yellow, { studs: true });
  for (let i = 0; i < 3; i++) b.box([-1.15, 0.28 + 0.34 + i * 0.6, -0.9], [0.26, 0.6, 0.26], i % 2 ? C.black : C.yellow);
  b.box([-1.15, 2.4, -0.9], [0.5, 0.35, 0.5], C.blue, { studs: true });
  b.box([-1.15, 2.8, -0.9], [0.1, 0.45, 0.1], C.red);
}

/** Local position of the crane's rotating arm pivot (mast top). */
export const CRANE_PIVOT: [number, number, number] = [-1.15, 2.68, -0.9];

function tower(b: Builder): void {
  const door = C.wood;
  const ring = (y: number, rad: number, angles: number[], w: number, h: number, c: string, inner: string) => {
    for (const ang of angles) {
      b.at([Math.sin(ang) * rad, y, Math.cos(ang) * rad], ang, () => {
        b.box([0, 0, 0.02], [w + 0.1, h + 0.1, 0.08], c);
        b.box([0, 0, 0.06], [w, h, 0.05], inner);
        b.cyl([0, h / 2 + 0.05, 0.04], (w + 0.1) / 2, 0.08, c, [Math.PI / 2, 0, 0]);
        b.box([0, -h / 2, 0.08], [w + 0.18, 0.06, 0.1], C.white);
      });
    }
  };
  // tier 1
  b.cyl([0, 0.55, 0], 1.35, 1.1, C.cream);
  for (let i = 0; i < 4; i++) b.cyl([0, 0.2 + i * 0.28, 0], 1.37, 0.06, C.creamDark);
  b.cyl([0, 1.16, 0], 1.5, 0.12, C.pink);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.cyl([Math.cos(a) * 1.35, 1.27, Math.sin(a) * 1.35], 0.13, 0.1, C.pink);
  }
  ring(0.65, 1.34, [0.7, -0.7, 1.5, -1.5], 0.28, 0.42, C.pinkDark, '#FFE9A8');
  // tier 2
  b.cyl([0, 1.72, 0], 1.05, 0.98, C.pink);
  for (let i = 0; i < 3; i++) b.cyl([0, 1.4 + i * 0.32, 0], 1.07, 0.05, C.pinkDark);
  b.cyl([0, 2.26, 0], 1.2, 0.1, C.cream);
  ring(1.75, 1.04, [0.7, -0.7, 1.6, -1.6], 0.26, 0.44, C.cream, '#FFE9A8');
  // balcony with rails
  b.box([0, 1.3, 1.5], [1.1, 0.1, 0.6], C.cream, { studs: 0.22 });
  for (const x of [-0.5, -0.25, 0, 0.25, 0.5]) b.box([x, 1.52, 1.76], [0.06, 0.34, 0.06], C.white);
  b.box([0, 1.7, 1.76], [1.1, 0.06, 0.07], C.pink);
  for (const x of [-0.52, 0.52]) b.box([x, 1.52, 1.5], [0.06, 0.34, 0.06], C.white);
  b.box([0, 1.82, 1.04], [0.44, 0.7, 0.1], C.purple);
  b.cyl([0, 2.17, 1.04], 0.22, 0.1, C.purple, [Math.PI / 2, 0, 0]);
  // tier 3
  b.cyl([0, 2.71, 0], 0.8, 0.8, C.cream);
  for (let i = 0; i < 2; i++) b.cyl([0, 2.5 + i * 0.3, 0], 0.82, 0.05, C.creamDark);
  b.cyl([0, 3.16, 0], 0.95, 0.1, C.pink);
  ring(2.75, 0.79, [0.5, -0.5, 1.4, -1.4], 0.22, 0.38, C.pink, '#FFE9A8');
  // roof + pole
  b.cone([0, 3.9, 0], 1.04, 1.4, C.pinkDark);
  b.cone([0, 3.9, 0], 0.98, 1.36, C.pink);
  for (let i = 0; i < 5; i++) b.cyl([0, 3.4 + i * 0.25, 0], 0.9 - i * 0.17, 0.035, C.pinkDark);
  b.cyl([0, 4.9, 0], 0.03, 0.9, C.cream);
  b.sph([0, 5.37, 0], 0.06, C.yellow);
  // ground-floor door, steps, lanterns
  b.box([0, 0.45, 1.34], [0.62, 0.9, 0.18], door);
  b.cyl([0, 0.9, 1.34], 0.31, 0.18, door, [Math.PI / 2, 0, 0]);
  b.sph([0.2, 0.45, 1.44], 0.04, C.yellow);
  b.box([0, 0.06, 1.85], [1.1, 0.12, 0.5], C.pinkLight, { studs: true });
  for (const x of [-0.6, 0.6]) {
    b.cyl([x, 0.35, 1.65], 0.04, 0.7, C.wood);
    b.sph([x, 0.78, 1.65], 0.1, '#FFE45C');
  }
  // side turret + roof + door
  b.cyl([1.8, 0.9, -0.4], 0.52, 1.8, C.cream);
  for (let i = 0; i < 4; i++) b.cyl([1.8, 0.3 + i * 0.4, -0.4], 0.54, 0.05, C.creamDark);
  b.cyl([1.8, 1.85, -0.4], 0.64, 0.12, C.pink);
  b.cone([1.8, 2.5, -0.4], 0.68, 1.0, C.pink);
  b.cyl([1.8, 3.25, -0.4], 0.025, 0.55, C.cream);
  b.at([1.8 + Math.sin(0.7) * 0.5, 1.15, -0.4 + Math.cos(0.7) * 0.5], 0.7, () => {
    b.box([0, 0, 0.02], [0.28, 0.46, 0.1], C.purple);
    b.box([0, 0, 0.05], [0.18, 0.36, 0.06], '#FFE9A8');
  });
  // garden
  b.box([-1.7, 0.14, 1.5], [0.9, 0.28, 0.5], C.greenDark, { studs: 0.22 });
  b.sph([-1.95, 0.4, 1.5], 0.11, C.pink);
  b.sph([-1.6, 0.42, 1.55], 0.11, C.yellow);
  b.sph([-1.35, 0.4, 1.45], 0.11, C.white);
}

function lab(b: Builder): void {
  b.box([0, 0.75, 0], [3.0, 1.5, 2.2], C.blue, { studs: true });
  for (let i = 0; i < 3; i++) b.box([0, 0.3 + i * 0.5, 1.12], [3.02, 0.05, 0.04], C.blueDark);
  b.box([0, 1.55, 0], [3.2, 0.14, 2.4], C.blueDark);
  b.box([0, 1.75, 0.3], [2.2, 0.3, 1.2], C.blueLight, { studs: true });
  // arch door + windows
  b.box([0, 0.5, 1.12], [0.9, 1.0, 0.1], '#1D3C7A');
  b.cyl([0, 1.0, 1.12], 0.45, 0.1, '#1D3C7A', [Math.PI / 2, 0, 0]);
  b.box([0, 0.5, 1.17], [0.62, 0.9, 0.06], '#2D5BB5');
  for (const sx of [-1, 1]) {
    b.box([sx * 1.1, 0.95, 1.12], [0.5, 0.5, 0.08], C.yellow);
    b.box([sx * 1.1, 0.95, 1.16], [0.5, 0.06, 0.06], C.blueDark);
    b.box([sx * 1.1, 0.95, 1.16], [0.06, 0.5, 0.06], C.blueDark);
    b.box([sx * 1.1, 0.64, 1.18], [0.62, 0.08, 0.14], C.white);
  }
  // glass dome with flask
  b.sph([0, 1.9, 0.3], [0.85, 0.75, 0.85], C.glass);
  b.cyl([0, 1.9, 0.3], 0.88, 0.1, '#9FD4F2');
  b.sph([0, 1.92, 0.3], 0.32, '#5BE37A');
  b.cyl([0, 2.32, 0.3], 0.1, 0.25, C.glass);
  // yellow pipes
  b.cyl([-1.5, 1.9, -0.3], 0.1, 1.0, C.yellow);
  b.cyl([-1.1, 2.35, -0.3], 0.1, 0.9, C.yellow, [0, 0, Math.PI / 2]);
  b.cyl([-0.65, 2.1, -0.3], 0.1, 0.5, C.yellow);
  b.sph([-1.5, 2.4, -0.3], 0.14, C.yellow);
  b.cyl([1.3, 2.0, -0.7], 0.12, 1.2, C.yellow);
  b.cyl([1.0, 2.55, -0.7], 0.12, 0.7, C.yellow, [0, 0, Math.PI / 2]);
  // chimney + antenna
  b.box([1.2, 1.9, -0.5], [0.4, 0.8, 0.4], C.blueDark, { studs: true });
  b.cyl([-1.0, 2.3, 0.6], 0.02, 0.9, C.gray);
  b.sph([-1.0, 2.8, 0.6], 0.07, C.red);
  // annex + two big flasks
  b.box([-2.25, 0.5, -0.4], [1.2, 1.0, 1.2], C.blueDark, { studs: true });
  b.box([2.2, 0.5, -0.4], [1.2, 1.0, 1.2], C.blueDark, { studs: true });
  const flask = (x: number, z: number, liquid: string, hi: string) => {
    b.sph([x, 1.15, z], 0.76, liquid);
    b.sph([x - 0.3, 1.5, z + 0.45], [0.16, 0.24, 0.1], hi);
    b.cyl([x, 2.15, z], 0.23, 0.8, C.glass);
    b.cyl([x, 2.62, z], 0.28, 0.1, C.glass);
    b.cyl([x, 2.02, z], 0.19, 0.5, liquid);
  };
  flask(2.1, 1.0, '#4FD97A', '#C9FFD9');
  flask(-2.2, 1.0, '#FF6FB5', '#FFD3EA');
  // little potions
  for (const [x, z, c] of [[-0.6, 1.7, '#FF5CA8'], [-0.25, 1.85, '#B388FF'], [0.2, 1.75, '#FFD60A']] as const) {
    b.cyl([x, 0.2, z], 0.14, 0.4, C.glass);
    b.sph([x, 0.15, z], 0.16, c);
  }
  b.box([0.8, 0.12, 1.8], [1.4, 0.12, 0.5], C.blueLight, { studs: true });
}

function tennis(b: Builder): void {
  b.box([0, 0.05, 0], [4.6, 0.1, 3.2], '#3FAE5A');
  b.box([0, 0.11, 0], [3.9, 0.04, 2.6], '#2F9B4B');
  const line = (x: number, z: number, w: number, d: number) => b.box([x, 0.14, z], [w, 0.02, d], C.white);
  line(0, 1.3, 3.9, 0.06);
  line(0, -1.3, 3.9, 0.06);
  line(1.95, 0, 0.06, 2.6);
  line(-1.95, 0, 0.06, 2.6);
  line(0, 0.95, 3.9, 0.04);
  line(0, -0.95, 3.9, 0.04);
  line(0, 0, 2.7, 0.04);
  line(1.35, 0, 0.04, 1.9);
  line(-1.35, 0, 0.04, 1.9);
  for (const sz of [-1, 1]) {
    b.box([0, 0.4, sz * 1.38], [0.09, 0.64, 0.09], C.white);
    b.sph([0, 0.74, sz * 1.38], 0.06, C.yellow);
  }
  b.box([0, 0.4, 0], [0.05, 0.32, 2.7], '#EDEDED');
  for (let i = 0; i < 6; i++) b.box([0, 0.27 + (i % 2) * 0.05, -1.2 + i * 0.48], [0.055, 0.06, 0.02], '#C9D2DD');
  b.box([0, 0.58, 0], [0.07, 0.05, 2.8], C.white);
  // racket leaning at the corner + ball bucket
  b.cyl([2.45, 0.55, 1.5], 0.025, 0.7, C.pink, [0, 0, 0.35]);
  b.cyl([2.62, 1.05, 1.5], 0.2, 0.04, C.pink, [Math.PI / 2, 0, 0.35]);
  b.cyl([2.62, 1.05, 1.5], 0.15, 0.05, '#FFE5F1', [Math.PI / 2, 0, 0.35]);
  b.cyl([-2.5, 0.2, 1.5], 0.25, 0.4, C.red);
  for (const [x, z] of [[-2.55, 1.45], [-2.45, 1.55], [-2.5, 1.5]] as const) b.sph([x, 0.44, z], 0.09, C.yellow);
  // umpire chair + corner stud bricks
  b.box([-2.5, 0.8, -0.3], [0.5, 0.1, 0.5], C.blue, { studs: 0.25 });
  for (const [x, z] of [[-2.7, -0.5], [-2.3, -0.5], [-2.7, -0.1], [-2.3, -0.1]] as const) b.box([x, 0.4, z], [0.07, 0.8, 0.07], C.white);
  for (const sx of [-1, 1]) b.box([sx * 2.5, 0.2, -1.5], [0.5, 0.3, 0.5], C.yellow, { studs: true });
  // low hedge behind
  b.box([0, 0.3, -1.75], [4.4, 0.5, 0.3], C.greenDark, { studs: 0.22 });
}

function stage(b: Builder): void {
  b.box([0, 0.18, 0], [3.9, 0.36, 3.1], C.red, { studs: true });
  b.box([0, 0.08, 1.8], [1.5, 0.16, 0.5], C.redDark, { studs: true });
  b.box([0, 0.02, 2.15], [2.0, 0.06, 0.4], C.redDark);
  // back wall + arch frame
  b.box([0, 1.4, -1.25], [3.3, 2.0, 0.35], C.purple);
  for (const sx of [-1, 1]) {
    b.box([sx * 1.8, 1.55, -1.05], [0.5, 2.4, 0.6], C.red, { studs: true });
    b.box([sx * 1.8, 1.55, -0.72], [0.55, 2.3, 0.08], C.redDark);
  }
  b.box([0, 2.95, -1.05], [4.1, 0.5, 0.6], C.red, { studs: true });
  b.cyl([0, 2.5, -1.05], 1.35, 0.6, C.red, [Math.PI / 2, 0, 0]);
  b.cyl([0, 2.5, -1.0], 1.08, 0.62, C.purple, [Math.PI / 2, 0, 0]);
  // speakers
  for (const sx of [-1, 1]) {
    b.box([sx * 2.35, 0.95, 0.4], [0.8, 1.2, 0.7], C.black, { studs: 0.4 });
    b.cyl([sx * 2.35, 1.25, 0.77], 0.22, 0.06, C.gray, [Math.PI / 2, 0, 0]);
    b.cyl([sx * 2.35, 0.7, 0.77], 0.28, 0.06, C.gray, [Math.PI / 2, 0, 0]);
    b.sph([sx * 2.35, 1.25, 0.8], 0.07, C.black);
  }
  // drum kit
  b.cyl([0.3, 0.75, -0.55], 0.4, 0.45, C.red, [Math.PI / 2, 0, 0]);
  b.cyl([0.3, 0.75, -0.33], 0.34, 0.04, C.white, [Math.PI / 2, 0, 0]);
  b.cyl([-0.35, 0.95, -0.6], 0.2, 0.2, C.red);
  b.cyl([0.95, 0.95, -0.6], 0.2, 0.2, C.red);
  b.cyl([-0.35, 0.95, -0.6], 0.2, 0.03, C.white, [0, 0, 0]);
  b.cyl([-0.9, 1.1, -0.55], 0.02, 1.0, C.gray);
  b.cyl([-0.9, 1.65, -0.55], 0.3, 0.025, '#FFD66B');
  b.cyl([1.4, 1.1, -0.55], 0.02, 1.0, C.gray);
  b.cyl([1.4, 1.65, -0.55], 0.3, 0.025, '#FFD66B');
  b.cyl([0.3, 0.52, -0.1], 0.2, 0.2, C.pink);
  // mic stand
  b.cyl([-1.0, 0.9, 1.0], 0.02, 1.1, C.gray);
  b.sph([-1.0, 1.5, 1.0], 0.07, C.black);
  b.box([0, 0.38, 1.2], [3.0, 0.04, 0.05], C.yellow);
  // keyboard stand
  b.box([1.15, 0.7, 0.4], [0.9, 0.06, 0.32], C.black);
  for (const x of [0.8, 1.5]) b.box([x, 0.52, 0.4], [0.05, 0.36, 0.05], C.gray);
  for (let i = 0; i < 6; i++) b.box([0.8 + i * 0.12, 0.74, 0.4], [0.1, 0.02, 0.3], C.white);
}

function woods(b: Builder): void {
  const trunk = C.wood;
  const round = (x: number, z: number, s: number, blossom: boolean) => {
    b.cyl([x, 0.4 * s, z], 0.17 * s, 0.8 * s, trunk);
    b.sph([x, 1.15 * s, z], [0.7 * s, 0.62 * s, 0.7 * s], '#52CE64');
    b.sph([x + 0.25 * s, 1.35 * s, z - 0.1 * s], [0.45 * s, 0.4 * s, 0.45 * s], '#6BE07C');
    if (blossom) for (let i = 0; i < 5; i++) b.sph([x + Math.cos(i * 1.3) * 0.55 * s, 1.1 * s + (i % 2) * 0.25 * s, z + Math.sin(i * 1.3) * 0.55 * s], 0.09 * s, C.pinkLight);
  };
  // tiered brick pines
  const pines: [number, number, number, number][] = ([
    [-1.9, -1.2, 1.2, 5], [-0.8, -2.0, 1.05, 4], [0.7, -2.0, 1.35, 5], [2.1, -1.1, 1.05, 4], [-2.6, 0.1, 0.95, 3], [2.9, 0.2, 0.9, 3], [-2.9, -1.0, 0.8, 3], [3.2, -1.1, 0.85, 4],
  ] as [number, number, number, number][]).map(([x, z, sc, t]) => [x, z, sc * 0.78, t]);
  pines.forEach(([x, z, s, t], i) => pine(b, x, z, s, i, 0, t));
  round(1.9, 0.7, 1.15, true);
  round(-1.1, -0.2, 0.9, true);
  // stumps (never any chopping, just bare spots waiting for saplings)
  for (const [x, z] of [[-1.6, 1.1], [1.2, 1.6], [0.2, -0.6], [2.3, 1.6], [-0.9, 1.8]] as const) {
    b.cyl([x, 0.14, z], 0.3, 0.28, trunk);
    b.cyl([x, 0.285, z], 0.27, 0.03, '#E9C791');
    b.cyl([x, 0.3, z], 0.12, 0.02, '#D4A66A');
  }
  // pink tea table with teapot and cups
  b.cyl([-0.1, 0.22, 0.4], 0.09, 0.44, C.pinkLight);
  b.cyl([-0.1, 0.47, 0.4], 0.62, 0.08, C.pink);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4;
    b.cyl([-0.1 + Math.cos(a) * 0.95, 0.14, 0.4 + Math.sin(a) * 0.95], 0.2, 0.28, C.pinkLight);
  }
  b.sph([-0.1, 0.7, 0.4], 0.2, C.pink);
  b.sph([-0.1, 0.9, 0.4], 0.05, C.yellow);
  b.cone([0.16, 0.74, 0.4], 0.05, 0.22, C.pink, [0, 0, -1.2]);
  b.cyl([-0.32, 0.72, 0.4], 0.025, 0.2, C.pinkDark, [0, 0, 0.6]);
  for (const a of [1.0, 2.6, 4.2]) b.cyl([-0.1 + Math.cos(a) * 0.4, 0.54, 0.4 + Math.sin(a) * 0.4], 0.07, 0.07, C.white);
  // mushrooms + flowers
  for (const [x, z] of [[-2.2, 1.2], [0.9, 2.1], [2.7, 1.2]] as const) {
    b.cyl([x, 0.1, z], 0.05, 0.2, C.cream);
    b.sph([x, 0.22, z], [0.14, 0.09, 0.14], C.red);
    b.sph([x + 0.05, 0.28, z], 0.025, C.white);
  }
}

const BUILDERS: Record<ZoneId, (b: Builder) => void> = { story: tower, science: lab, tennis, music: stage, woods };
export const PLOT_COLORS: Record<ZoneId, string> = { story: C.pink, science: C.blue, tennis: C.green, music: C.red, woods: C.green };

/** All static scenery as instanced primitives (animated bits live in Anim.tsx). */
export function buildScenery(built: Record<ZoneId, boolean>, candles: number): Prim[] {
  const b = new Builder();
  ground(b);
  decor(b);
  cakePlatform(b, candles);
  fence(b, 0.8, 6.25, 3.6, 6.25);
  fence(b, 6.25, 2.2, 6.25, 5.0);
  fence(b, -6.25, 3.0, -6.25, 5.2);
  signpost(b, 2.9, 0.9);
  for (const z of Object.keys(layout) as ZoneId[]) {
    const l = layout[z];
    b.at(l.pos, l.ry, () => {
      if (built[z]) BUILDERS[z](b);
      else cranePlot(b, PLOT_COLORS[z]);
    });
  }
  return b.prims;
}

/** Positions for the pyramid of Birthday Bricks on top of the cake (index = brick number). */
export const CAKE_STACK: { p: [number, number, number]; ry: number }[] = (() => {
  const top = 1.56;
  const h = 0.36;
  const rows: [number, number][] = [
    [-0.42, 0], [0.12, 0], [0.66, 0], [-0.15, 1], [0.39, 1], [0.12, 2], [-0.6, 1],
  ];
  return rows.map(([x, row], i) => ({ p: [x, top + h / 2 + row * h, ((i * 37) % 7) * 0.02 - 0.06] as [number, number, number], ry: ((i % 3) - 1) * 0.12 }));
})();
