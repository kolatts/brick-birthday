import { forwardRef, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

type V3 = [number, number, number];

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 16);
const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8);
const SPH = new THREE.SphereGeometry(1, 16, 12);

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, opts: { emissive?: string; emissiveIntensity?: number; flat?: boolean } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 0}|${opts.flat ?? true}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: opts.flat ?? true, roughness: 0.7, metalness: 0, emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity });
    mats.set(key, m);
  }
  return m;
}

export function Bx({ p = [0, 0, 0], s, c, r }: { p?: V3; s: V3; c: string; r?: V3 }) {
  return <mesh geometry={BOX} material={mat(c)} position={p} scale={s} rotation={r} />;
}
export function Cyl({ p = [0, 0, 0], s, c, r }: { p?: V3; s: V3; c: string; r?: V3 }) {
  return <mesh geometry={CYL} material={mat(c)} position={p} scale={s} rotation={r} />;
}
export function Sph({ p = [0, 0, 0], s, c }: { p?: V3; s: V3 | number; c: string }) {
  return <mesh geometry={SPH} material={mat(c, { flat: false })} position={p} scale={s} />;
}

// ---- court -------------------------------------------------------------------------------------
const HALF_W = 4;
const HALF_L = 9;

/** Studs (little brick bumps) over the court surface, kept clear of the white lines. */
function Studs() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: V3[] = [];
    for (let x = -3.75; x <= 3.76; x += 0.5) for (let z = -8.75; z <= 8.76; z += 0.5) out.push([x, 0.3, z]);
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    spots.forEach((p, i) => {
      d.position.set(...p);
      d.scale.set(0.14, 0.07, 0.14);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return <instancedMesh ref={ref} args={[CYL8, mat('#46B86B'), spots.length]} frustumCulled={false} />;
}

function Lines() {
  const W = '#FFFFFF';
  const y = 0.285;
  const t = 0.1;
  return (
    <group>
      {[-HALF_W, HALF_W, -3, 3].map((x) => <Bx key={x} p={[x, y, 0]} s={[t, 0.04, HALF_L * 2]} c={W} />)}
      {[-HALF_L, HALF_L].map((z) => <Bx key={z} p={[0, y, z]} s={[HALF_W * 2 + t, 0.04, t]} c={W} />)}
      {[-6, 6].map((z) => <Bx key={z} p={[0, y, z]} s={[6, 0.04, t]} c={W} />)}
      <Bx p={[0, y, 0]} s={[t, 0.04, 12]} c={W} />
    </group>
  );
}

function Net() {
  return (
    <group position={[0, 0, 0]}>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Bx p={[sx * 4.5, 0.75, 0]} s={[0.22, 1.5, 0.22]} c="#E63946" />
          <Bx p={[sx * 4.5, 1.55, 0]} s={[0.34, 0.14, 0.34]} c="#FFD60A" />
        </group>
      ))}
      <mesh geometry={BOX} position={[0, 0.72, 0]} scale={[9, 1.0, 0.04]}>
        <meshStandardMaterial color="#1D2A44" transparent opacity={0.42} />
      </mesh>
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((x) => <Bx key={x} p={[x, 0.7, 0]} s={[0.04, 1.0, 0.05]} c="#FFFFFF" />)}
      <Bx p={[0, 1.28, 0]} s={[9, 0.16, 0.12]} c="#FFFFFF" />
      <Bx p={[0, 0.28, 0]} s={[9, 0.06, 0.08]} c="#FFFFFF" />
    </group>
  );
}

function BrickWall({ z, x0, x1, y = 0, h = 0.9, colors }: { z: number; x0: number; x1: number; y?: number; h?: number; colors: string[] }) {
  const n = Math.round((x1 - x0) / 1.2);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[x0 + (i + 0.5) * 1.2, y, z]}>
          <Bx p={[0, h / 2, 0]} s={[1.14, h, 0.8]} c={colors[i % colors.length]} />
          <Bx p={[-0.28, h + 0.07, 0]} s={[0.3, 0.14, 0.3]} c={colors[i % colors.length]} />
          <Bx p={[0.28, h + 0.07, 0]} s={[0.3, 0.14, 0.3]} c={colors[i % colors.length]} />
        </group>
      ))}
    </group>
  );
}

function BrickTree({ p, s = 1 }: { p: V3; s?: number }) {
  return (
    <group position={p} scale={s}>
      <Bx p={[0, 0.7, 0]} s={[0.6, 1.4, 0.6]} c="#8B5A2B" />
      <Bx p={[0, 1.8, 0]} s={[2.1, 1.0, 2.1]} c="#3CAA4E" />
      <Bx p={[0, 2.6, 0]} s={[1.5, 0.8, 1.5]} c="#4BC25E" />
      <Bx p={[0, 3.2, 0]} s={[0.8, 0.5, 0.8]} c="#5CD06E" />
    </group>
  );
}

export function Court() {
  return (
    <group>
      {/* ground */}
      <Bx p={[0, -0.6, 0]} s={[60, 1, 60]} c="#8ED06B" />
      {/* apron (lighter) and court slab */}
      <Bx p={[0, 0.05, 0]} s={[HALF_W * 2 + 3.2, 0.3, HALF_L * 2 + 3.6]} c="#2F8F5B" />
      <Bx p={[0, 0.12, 0]} s={[HALF_W * 2 + 0.4, 0.3, HALF_L * 2 + 0.4]} c="#3BA86B" />
      <Studs />
      <Lines />
      <Net />
      {/* back wall and side fences */}
      <BrickWall z={-12} x0={-16} x1={16} colors={['#E63946', '#FFD60A', '#3A86FF', '#7AE582', '#FF5CA8']} h={1.4} />
      <BrickWall z={-12.8} x0={-16} x1={16} y={1.4} h={0.8} colors={['#FFFFFF', '#FFE9A8']} />
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {Array.from({ length: 16 }, (_, i) => (
            <group key={i} position={[sx * 6.2, 0, -11 + i * 1.3]}>
              <Bx p={[0, 0.4, 0]} s={[0.6, 0.8, 1.1]} c={['#3A86FF', '#FFD60A', '#FF5CA8', '#7AE582'][i % 4]} />
              <Bx p={[0, 0.88, -0.28]} s={[0.26, 0.16, 0.26]} c={['#3A86FF', '#FFD60A', '#FF5CA8', '#7AE582'][i % 4]} />
              <Bx p={[0, 0.88, 0.28]} s={[0.26, 0.16, 0.26]} c={['#3A86FF', '#FFD60A', '#FF5CA8', '#7AE582'][i % 4]} />
            </group>
          ))}
        </group>
      ))}
      {[[-9, -13.5, 1.4], [-5.5, -14, 1.7], [-1.5, -13.8, 1.3], [3, -14.2, 1.8], [7.4, -13.6, 1.4], [11, -14, 1.6], [-13, -14, 1.5], [-8.6, 2, 1.3], [8.6, 4, 1.4], [-9.6, 9, 1.5], [9.6, 10, 1.3]].map((t, i) => (
        <BrickTree key={i} p={[t[0], 0, t[1]]} s={t[2]} />
      ))}
    </group>
  );
}

/** Brick flowerpot with flowers; wiggles when bonked. */
export const FlowerPot = forwardRef<THREE.Group, { position: V3 }>(function FlowerPot({ position }, ref) {
  return (
    <group ref={ref} position={position}>
      <Cyl p={[0, 0.3, 0]} s={[0.45, 0.6, 0.45]} c="#E4572E" />
      <Cyl p={[0, 0.64, 0]} s={[0.55, 0.16, 0.55]} c="#C9431F" />
      <Cyl p={[0, 0.72, 0]} s={[0.4, 0.06, 0.4]} c="#5A3A22" />
      {[[-0.15, 0], [0.18, 0.08], [0, -0.17]].map((o, i) => (
        <group key={i} position={[o[0], 0.75, o[1]]}>
          <Cyl p={[0, 0.25, 0]} s={[0.03, 0.5, 0.03]} c="#2E8B57" />
          <Sph p={[0, 0.55, 0]} s={0.15} c={['#FF5CA8', '#FFD60A', '#FFFFFF'][i]} />
          <Sph p={[0, 0.55, 0.1]} s={0.07} c="#FFB300" />
        </group>
      ))}
    </group>
  );
});

/** A toy racket: handle along +y from the pivot, frame and strings above. */
export function Racket({ color = '#E63946' }: { color?: string }) {
  return (
    <group>
      <Cyl p={[0, 0.28, 0]} s={[0.05, 0.56, 0.05]} c="#1D2A44" />
      <Cyl p={[0, 0.04, 0]} s={[0.075, 0.12, 0.075]} c="#FFD60A" />
      <mesh position={[0, 0.98, 0]} scale={[0.34, 0.44, 0.06]} rotation={[0, 0, 0]}>
        <torusGeometry args={[1, 0.17, 8, 28]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.98, 0]} scale={[0.33, 0.43, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <Bx p={[0, 0.98, 0]} s={[0.02, 0.8, 0.02]} c="#FFFFFF" />
      <Bx p={[0, 0.98, 0]} s={[0.6, 0.02, 0.02]} c="#FFFFFF" />
      <Bx p={[0, 0.58, 0]} s={[0.1, 0.1, 0.07]} c={color} />
    </group>
  );
}
