import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { B, Cy, popScale } from './fx';
import { Avatar } from '../../three/Avatar';
import { mergeParts, vertexMat } from '../../three/merge';
import { friendParts } from '../../three/friends';
import type { FriendId, GuestId } from './facts';
import type { PersonId } from '../../types';
import { faceUrl as personFaceUrl } from '../../state/faces';

type V3 = [number, number, number];
const GREENS = ['#3FAE49', '#55C85B', '#80D863'];

// ---- trees -------------------------------------------------------------------------------------
/**
 * Stacked-brick tree. `age` returns seconds since growth began (Infinity = fully grown); each tier
 * appears bottom-up with a bounce.
 */
export function BrickTree({ position, age, scale = 1, hue = 0, rotY = 0 }: { position: V3; age: () => number; scale?: number; hue?: number; rotY?: number }) {
  const parts = useRef<(THREE.Group | null)[]>([]);
  const root = useRef<THREE.Group>(null);
  const colors = GREENS.map((c, i) => (hue === 1 ? ['#2F9E5A', '#45B86A', '#6CCB7F'][i] : c));
  useFrame(() => {
    const a = age();
    const sched: [number, number][] = [[0, 0.35], [0.3, 0.4], [0.58, 0.4], [0.86, 0.4], [1.12, 0.3]];
    parts.current.forEach((g, i) => {
      if (!g) return;
      const k = a === Infinity ? 1 : popScale(a, sched[i][0], sched[i][1]);
      g.scale.set(k, k, k);
      g.visible = k > 0.001;
    });
    if (root.current) root.current.visible = a > 0;
  });
  const ref = (i: number) => (g: THREE.Group | null) => { parts.current[i] = g; };
  return (
    <group ref={root} position={position} scale={scale} rotation={[0, rotY, 0]}>
      <group ref={ref(0)}><B p={[0, 0.55, 0]} s={[0.55, 1.1, 0.55]} c="#8B5A2B" /><B p={[0, 0.12, 0]} s={[0.7, 0.24, 0.7]} c="#7A4E24" /></group>
      <group ref={ref(1)} position={[0, 1.05, 0]}><B p={[0, 0.3, 0]} s={[2.1, 0.6, 2.1]} c={colors[0]} /><Studs y={0.62} half={0.7} c={colors[0]} /></group>
      <group ref={ref(2)} position={[0, 1.65, 0]}><B p={[0, 0.3, 0]} s={[1.6, 0.6, 1.6]} c={colors[1]} /><Studs y={0.62} half={0.45} c={colors[1]} /></group>
      <group ref={ref(3)} position={[0, 2.25, 0]}><B p={[0, 0.3, 0]} s={[1.1, 0.6, 1.1]} c={colors[2]} /></group>
      <group ref={ref(4)} position={[0, 2.85, 0]}><Cy p={[0, 0.1, 0]} s={[0.26, 0.22, 0.26]} c={colors[2]} /></group>
    </group>
  );
}

function Studs({ y, half, c }: { y: number; half: number; c: string }) {
  const pts: V3[] = [[-half, y, -half], [half, y, -half], [-half, y, half], [half, y, half]];
  return <>{pts.map((p, i) => <Cy key={i} p={p} s={[0.2, 0.12, 0.2]} c={c} low />)}</>;
}

// ---- stump + sapling ---------------------------------------------------------------------------
export function StumpSpot({ position, stage, plantedAt, wateredAt }: { position: V3; stage: number; plantedAt: number; wateredAt: number }) {
  const sap = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = sap.current;
    if (!g) return;
    const t = performance.now();
    const born = (t - plantedAt) / 1000;
    const k = stage >= 1 ? popScale(born, 0, 0.4) * (stage >= 2 ? 1.2 : 1) : 0.0001;
    g.scale.setScalar(k);
    const w = (t - wateredAt) / 1000;
    g.rotation.z = w >= 0 && w < 1.6 ? Math.sin(w * 20) * 0.28 * Math.exp(-w * 2.2) : 0;
    g.rotation.x = w >= 0 && w < 1.6 ? Math.cos(w * 17) * 0.12 * Math.exp(-w * 2.2) : 0;
  });
  if (stage >= 3) return null;
  return (
    <group position={position}>
      <Cy p={[0, 0.04, 0]} s={[0.95, 0.08, 0.95]} c={stage >= 2 ? '#5E3A1F' : '#7A4E2D'} low />
      {([[-0.5, 0.2], [0.45, 0.3], [0.1, -0.55], [-0.25, 0.5]] as [number, number][]).map(([x, z], i) => (
        <Cy key={i} p={[x, 0.1, z]} s={[0.12, 0.1, 0.12]} c="#6B4226" low />
      ))}
      {stage === 0 && (
        <group>
          <Cy p={[0, 0.25, 0]} s={[0.42, 0.5, 0.42]} c="#8B5A2B" low />
          <Cy p={[0, 0.51, 0]} s={[0.38, 0.04, 0.38]} c="#D9A66B" low />
          <Cy p={[0, 0.535, 0]} s={[0.22, 0.03, 0.22]} c="#C58E52" low />
        </group>
      )}
      <group ref={sap}>
        <B p={[0, 0.3, 0]} s={[0.1, 0.5, 0.1]} c="#6B8E23" />
        <B p={[-0.2, 0.55, 0]} s={[0.4, 0.1, 0.22]} c="#59C65E" r={[0, 0, 0.5]} />
        <B p={[0.2, 0.62, 0]} s={[0.4, 0.1, 0.22]} c="#6FD46E" r={[0, 0, -0.5]} />
        <B p={[0, 0.78, 0]} s={[0.22, 0.2, 0.22]} c="#7AE582" />
      </group>
    </group>
  );
}

// ---- hosts -------------------------------------------------------------------------------------
type PetProps = { position: V3; rotY?: number; scale?: number; onTap?: () => void; bob?: boolean };

/** Shared pet wrapper: the hub's Avatar (same figure everywhere) plus the zone's hop. */
function PetFigure({ id, position, rotY = 0, scale = 1, onTap, bob = true, k, phase }: PetProps & { id: 'rudolph' | 'jinglebells'; k: number; phase: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current && bob) g.current.position.y = Math.abs(Math.sin(clock.elapsedTime * 3 + phase)) * 0.1;
  });
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale} onPointerDown={onTap}>
      <group ref={g}>
        <Avatar id={id} scale={k} interactive={false} />
      </group>
    </group>
  );
}

/** Rudolph (thin wrapper around the shared Avatar). */
export function Dog(props: PetProps) {
  return <PetFigure {...props} id="rudolph" k={1.35} phase={0} />;
}

/** Jingle Bells (thin wrapper around the shared Avatar). */
export function Cat(props: PetProps) {
  return <PetFigure {...props} id="jinglebells" k={1.3} phase={1} />;
}

// ---- forest friends ----------------------------------------------------------------------------
export function FriendModel({ type }: { type: FriendId }) {
  const geo = useMemo(() => mergeParts(friendParts(type)), [type]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={vertexMat} />;
}

/** A friend hopping from `from` to `to` starting at `bornAt` (ms), then idling. */
export function HoppingFriend({ type, from, to, bornAt, seed = 0 }: { type: FriendId; from: V3; to: V3; bornAt: number; seed?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const o = g.current;
    if (!o) return;
    const age = (performance.now() - bornAt) / 1000;
    if (age < 0) { o.visible = false; return; }
    o.visible = true;
    const u = Math.min(1, age / 1.4);
    o.position.set(from[0] + (to[0] - from[0]) * u, from[1] + (u < 1 ? Math.abs(Math.sin(u * Math.PI * 3)) * 0.7 : 0), from[2] + (to[2] - from[2]) * u);
    if (u >= 1) o.position.y = to[1] + Math.max(0, Math.sin(clock.elapsedTime * 2.2 + seed)) * 0.08;
    o.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]) * (u < 1 ? 1 : 0) + (u >= 1 ? 0.2 * Math.sin(clock.elapsedTime + seed) : 0);
    const s = u < 1 ? 1 : 1;
    o.scale.setScalar(s * 1.1);
  });
  return <group ref={g} visible={false}><FriendModel type={type} /></group>;
}

// ---- people ------------------------------------------------------------------------------------
export const faceUrl = (id: string): string => personFaceUrl(id as PersonId, 'happy');

/** Family member at the table: the shared Avatar (pop-in scale, happy hop). */
export function Person({ id, position, rotY, bornAt, onTap, happy, scale = 1 }: { scale?: number; id: Exclude<GuestId, FriendId | 'rudolph' | 'jinglebells'>; position: V3; rotY: number; bornAt: number; onTap: () => void; happy: boolean }) {
  const g = useRef<THREE.Group>(null);
  const hop = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.scale.setScalar(popScale((performance.now() - bornAt) / 1000, 0, 0.55) * scale);
    if (hop.current) hop.current.position.y = happy ? Math.abs(Math.sin(clock.elapsedTime * 4)) * 0.08 : 0;
  });
  return (
    <group ref={g} position={position} rotation={[0, rotY, 0]} onPointerDown={onTap}>
      <group ref={hop}>
        <Avatar id={id} scale={0.78} interactive={false} wave={happy} />
      </group>
    </group>
  );
}
