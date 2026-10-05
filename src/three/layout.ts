import type { ZoneId } from '../types';
import type { V3 } from './prims';

/** Island half-size (the grass plate is 2*HALF cells wide). */
export const HALF = 7;
/** Default camera azimuth: looking from the +x,+z corner so the island reads as a diamond. */
export const VIEW_AZIMUTH = Math.PI / 4;

const R2 = Math.SQRT2;
/** Screen-space (u right, v up/back) -> world xz for the default camera. */
export const fromScreen = (u: number, v: number): [number, number] => [(u - v) / R2, -(u + v) / R2];

export interface ZoneLayout {
  /** Building centre (ground level). */
  pos: V3;
  /** Yaw: front of the building is +z rotated by ry. */
  ry: number;
  /** Local offset (in building space) where the host stands. */
  host: V3;
  /** Local offset of the buried-treasure dig spot. */
  dig: V3;
  /** Invisible tap box (world-aligned to the building yaw). */
  hit: V3;
  /** Height of the floating name label above ground. */
  labelY: number;
}

const place = (u: number, v: number): V3 => {
  const [x, z] = fromScreen(u, v);
  return [x, 0, z];
};

/** Zones whose ground is raised into a brick-stepped plateau (rim step 0.2, top 0.4). */
const PLATEAU_ZONES: ZoneId[] = ['story', 'science'];
/** Extra low hills (centre x,z, radius). */
export const HILLS: [number, number, number][] = [[-5.6, -5.4, 1.5], [5.7, 5.5, 1.4], [-5.5, 5.6, 1.3]];

const BASE_XZ: Record<ZoneId, [number, number]> = {
  story: [place(-4.0, 3.9)[0], place(-4.0, 3.9)[2]],
  science: [place(3.8, 3.6)[0], place(3.8, 3.6)[2]],
  tennis: [place(4.9, -0.8)[0], place(4.9, -0.8)[2]],
  music: [place(-5.2, -1.6)[0], place(-5.2, -1.6)[2]],
  woods: [place(1.0, -4.8)[0], place(1.0, -4.8)[2]],
};

/** Terrain height at world (x,z): brick-stepped plateaus under the tower and lab, plus a few low hills. */
export function groundHeight(x: number, z: number): number {
  for (const zone of PLATEAU_ZONES) {
    const [px, pz] = BASE_XZ[zone];
    const d = Math.max(Math.abs(x - px), Math.abs(z - pz));
    if (d <= 2.5) return 0.4;
    if (d <= 3.5) return 0.2;
  }
  for (const [hx, hz, hr] of HILLS) {
    const d = Math.max(Math.abs(x - hx), Math.abs(z - hz));
    if (d <= hr * 0.5) return 0.4;
    if (d <= hr) return 0.2;
  }
  return 0;
}

const at = (u: number, v: number): V3 => {
  const [x, z] = fromScreen(u, v);
  return [x, groundHeight(x, z), z];
};

export const layout: Record<ZoneId, ZoneLayout> = {
  story: { pos: at(-4.0, 3.9), ry: 0.8, host: [1.7, 0, 2.3], dig: [2.5, 0, 0.9], hit: [3.2, 5.6, 3.2], labelY: 5.0 },
  science: { pos: at(3.8, 3.6), ry: 0.8, host: [0.2, 0, 2.5], dig: [-2.9, 0, 1.8], hit: [3.6, 3.4, 3.0], labelY: 3.5 },
  tennis: { pos: at(4.9, -0.8), ry: Math.PI / 4, host: [-1.6, 0, 2.3], dig: [2.8, 0, 1.2], hit: [4.2, 1.5, 3.0], labelY: 1.9 },
  music: { pos: at(-5.2, -1.6), ry: 0.95, host: [0.1, 0.35, 0.5], dig: [2.8, 0, 2.0], hit: [3.8, 3.2, 3.0], labelY: 3.9 },
  woods: { pos: at(1.0, -4.8), ry: Math.PI / 4, host: [0, 0, 2.2], dig: [-2.3, 0, 1.0], hit: [4.2, 3.2, 4.0], labelY: 3.2 },
};

/** Local -> world position for a zone. */
export function zoneWorld(zone: ZoneId, local: V3): V3 {
  const l = layout[zone];
  const c = Math.cos(l.ry), s = Math.sin(l.ry);
  const x = l.pos[0] + c * local[0] + s * local[2];
  const z = l.pos[2] - s * local[0] + c * local[2];
  return [x, groundHeight(x, z) + local[1], z];
}

/** Hosts stand clear of the building site while their zone is still under construction. */
export const hostPos = (zone: ZoneId, built = true): V3 => zoneWorld(zone, built ? layout[zone].host : [0.5, 0, 2.6]);
export const digPos = (zone: ZoneId): V3 => zoneWorld(zone, layout[zone].dig);

/** Where Luna stands in the hub (front of the cake plaza). */
export const LUNA_POS: V3 = (() => {
  const [x, z] = fromScreen(-2.0, -2.0);
  return [x, 0, z];
})();

/** Open spots the pets wander between (world xz), tuned to stay clear of buildings. */
export const PET_WAYPOINTS: [number, number][] = [
  [0.0, 4.2], [-1.5, 3.4], [1.8, 4.6], [-3.4, 1.7], [-2.2, -2.0], [2.2, -1.4], [3.2, 1.2], [0.3, -2.7], [-0.4, 2.5], [1.2, 2.6],
];

export const CAKE_RADIUS = 2.2;
export const FACE_CAMERA = 0.8;
