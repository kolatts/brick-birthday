import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Builder, type Prim, type PrimType, type V3 } from './prims';
import { maxDpr } from '../ui/scale';

/** Shared unit geometries (scaled per instance). Low-poly on purpose. */
const geos: Record<PrimType, THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 14),
  sph: new THREE.SphereGeometry(1, 14, 10),
  stud: new THREE.CylinderGeometry(1, 1, 1, 8),
};
const mats: Record<PrimType, THREE.Material> = {
  box: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 }),
  cyl: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 }),
  cone: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0, flatShading: true }),
  sph: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 }),
  stud: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 }),
};
const TYPES: PrimType[] = ['box', 'cyl', 'cone', 'sph', 'stud'];

function Inst({ type, prims }: { type: PrimType; prims: Prim[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    const qy = new THREE.Quaternion();
    const ql = new THREE.Quaternion();
    const eu = new THREE.Euler();
    const up = new THREE.Vector3(0, 1, 0);
    prims.forEach((pr, i) => {
      d.position.set(pr.p[0], pr.p[1], pr.p[2]);
      qy.setFromAxisAngle(up, pr.ry);
      if (pr.rot) {
        eu.set(pr.rot[0], pr.rot[1], pr.rot[2]);
        ql.setFromEuler(eu);
        d.quaternion.copy(qy).multiply(ql);
      } else d.quaternion.copy(qy);
      d.scale.set(pr.s[0], pr.s[1], pr.s[2]);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, col.set(pr.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    m.computeBoundingBox();
  }, [prims]);
  // Static decoration is never a tap target: skip raycasting entirely.
  return <instancedMesh key={prims.length} ref={ref} args={[geos[type], mats[type], prims.length]} raycast={noRaycast} />;
}

function noRaycast(): void {
  /* intentionally empty */
}

/** Renders any number of primitives in at most 4 draw calls. Static: matrices are written once. */
export function StaticBatch({ prims }: { prims: Prim[] }) {
  const groups = useMemo(() => {
    const g: Record<PrimType, Prim[]> = { box: [], cyl: [], cone: [], sph: [], stud: [] };
    for (const p of prims) g[p.t].push(p);
    return g;
  }, [prims]);
  return <>{TYPES.map((t) => (groups[t].length ? <Inst key={t} type={t} prims={groups[t]} /> : null))}</>;
}

interface BrickBoxProps {
  size: V3;
  color: string;
  position?: V3;
  rotationY?: number;
  /** Stud pitch; true = 0.5. */
  studs?: boolean | number;
}

/** A single studded brick (box + instanced stud cylinders). Origin at the centre of the brick. */
export function BrickBox({ size, color, position = [0, 0, 0], rotationY = 0, studs = true }: BrickBoxProps) {
  const prims = useMemo(() => new Builder().box([0, 0, 0], size, color, { studs }).prims, [size, color, studs]);
  return (
    <group position={position} rotation-y={rotationY}>
      <StaticBatch prims={prims} />
    </group>
  );
}

interface BrickGridProps {
  cols: number;
  rows: number;
  /** Plate edge length. */
  cell?: number;
  height?: number;
  colors: string[];
  position?: V3;
}

/** A ground plate made of 1-cell plates (each with 2x2 studs) with a gentle colour mix. Centred on its position. */
export function BrickGrid({ cols, rows, cell = 1, height = 0.4, colors, position = [0, 0, 0] }: BrickGridProps) {
  const prims = useMemo(() => {
    const b = new Builder();
    for (let i = 0; i < cols; i++) {
      for (let k = 0; k < rows; k++) {
        const c = colors[(i * 7 + k * 13) % colors.length];
        b.box([(i - (cols - 1) / 2) * cell, -height / 2, (k - (rows - 1) / 2) * cell], [cell, height, cell], c, { studs: true });
      }
    }
    return b.prims;
  }, [cols, rows, cell, height, colors]);
  return (
    <group position={position}>
      <StaticBatch prims={prims} />
    </group>
  );
}

/** Shared canvas props: capped DPR, preserved buffer for screenshots, iPad-friendly GL options. */
export const canvasProps = {
  dpr: [1, maxDpr()] as [number, number],
  frameloop: 'always' as const,
  flat: true,
  gl: { preserveDrawingBuffer: true, antialias: true, powerPreference: 'high-performance' as const },
};
