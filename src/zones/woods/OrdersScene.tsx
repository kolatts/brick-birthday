import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { B, Cy, Particles, mat, popScale } from './fx';
import { BrickTree, Cat, Person } from './models';
import type { GuestId } from './facts';
import { scoopById, type ItemId, type Scoop } from './logic';

type V3 = [number, number, number];
const SPH = new THREE.SphereGeometry(1, 16, 12);
const Sphere = ({ p, r, c }: { p: V3; r: number; c: string }) => <mesh geometry={SPH} material={mat(c)} position={p} scale={r} />;

const bounceOut = (x: number): number => {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};

/** Drops in with a bounce; if `leaveAt` is set it wobbles, then hops off the table. */
function Dropper({ bornAt, leaveAt, position, children }: { bornAt: number; leaveAt?: number; position: V3; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = g.current;
    if (!o) return;
    const now = performance.now();
    const age = (now - bornAt) / 1000;
    let y = (1 - bounceOut(Math.min(1, age / 0.7))) * 2.2;
    let x = 0, rz = 0, sc = popScale(age, 0, 0.3);
    if (leaveAt) {
      const t = (now - leaveAt) / 1000;
      if (t >= 0) {
        rz = Math.sin(t * 32) * 0.35 * Math.min(1, t / 0.2);
        if (t > 0.5) {
          const u = Math.min(1, (t - 0.5) / 0.5);
          y += 4 * u * (1 - u) * 1.6;
          x = u * 3.2;
          sc *= 1 - u * 0.9;
        }
      }
    }
    o.position.set(position[0] + x, position[1] + y, position[2]);
    o.rotation.z = rz;
    o.scale.setScalar(sc * 1.25);
  });
  return <group ref={g} position={position}>{children}</group>;
}

function Food({ kind }: { kind: ItemId }) {
  switch (kind) {
    case 'sugar':
      return <group><B p={[0, 0.15, 0]} s={[0.3, 0.3, 0.3]} c="#FFFFFF" />{([[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.08], [0.08, 0.08]] as [number, number][]).map(([x, z], i) => <Cy key={i} p={[x, 0.33, z]} s={[0.05, 0.05, 0.05]} c="#FFFFFF" low />)}</group>;
    case 'lemon':
      return <group><Cy p={[0, 0.05, 0]} s={[0.32, 0.1, 0.32]} c="#FFD60A" /><Cy p={[0, 0.11, 0]} s={[0.25, 0.03, 0.25]} c="#FFF08A" /><B p={[0, 0.13, 0]} s={[0.4, 0.02, 0.04]} c="#FFD60A" /><B p={[0, 0.13, 0]} s={[0.04, 0.02, 0.4]} c="#FFD60A" /></group>;
    case 'milk':
      return <group><Cy p={[0, 0.2, 0]} s={[0.17, 0.4, 0.17]} c="#FFFFFF" /><Cy p={[0, 0.2, 0]} s={[0.18, 0.1, 0.18]} c="#3A86FF" /><B p={[0.2, 0.22, 0]} s={[0.06, 0.2, 0.06]} c="#FFFFFF" /><B p={[0, 0.42, 0.13]} s={[0.1, 0.04, 0.1]} c="#FFFFFF" /></group>;
    case 'cake':
      return <group><B p={[0, 0.12, 0]} s={[0.5, 0.24, 0.4]} c="#FF8FB8" /><B p={[0, 0.26, 0]} s={[0.5, 0.05, 0.4]} c="#FFFFFF" /><Sphere p={[0, 0.34, 0]} r={0.08} c="#E63946" /></group>;
    case 'cookie':
      return <group><Cy p={[0, 0.06, 0]} s={[0.3, 0.12, 0.3]} c="#C98E4A" />{([[0.1, 0.05], [-0.08, 0.1], [-0.05, -0.1]] as [number, number][]).map(([x, z], i) => <B key={i} p={[x, 0.13, z]} s={[0.07, 0.03, 0.07]} c="#4A2A18" />)}</group>;
    case 'scone':
      return <group><Cy p={[0, 0.1, 0]} s={[0.32, 0.2, 0.32]} c="#E2B26B" /><Cy p={[0, 0.24, 0]} s={[0.2, 0.08, 0.2]} c="#F4D79B" /></group>;
    case 'honey':
      return <group><Cy p={[0, 0.18, 0]} s={[0.2, 0.36, 0.2]} c="#F2A413" /><Cy p={[0, 0.4, 0]} s={[0.21, 0.07, 0.21]} c="#8B5A2B" /><B p={[0, 0.2, 0.2]} s={[0.16, 0.12, 0.02]} c="#FFF4E0" /></group>;
  }
}

const PLATE: V3 = [-0.9, 0, 1.1];
const slot = (i: number): V3 => {
  const a = (i / 5) * Math.PI * 2 + 0.5;
  return [PLATE[0] + Math.cos(a) * 0.55, 0.12, PLATE[2] + Math.sin(a) * 0.4];
};

export interface Leaving { items: ItemId[]; scoops: Scoop[]; cherry: boolean; at: number }

function Sundae({ scoops, cherry, leaveAt }: { scoops: Scoop[]; cherry: boolean; leaveAt?: number }) {
  return (
    <group>
      <Cy p={[PLATE[0], 0.08, PLATE[2]]} s={[0.55, 0.08, 0.55]} c="#DDEBFF" />
      <Cy p={[PLATE[0], 0.3, PLATE[2]]} s={[0.1, 0.4, 0.1]} c="#DDEBFF" />
      <Cy p={[PLATE[0], 0.7, PLATE[2]]} s={[0.62, 0.45, 0.62]} c="#C9E3FF" />
      <Cy p={[PLATE[0], 0.55, PLATE[2]]} s={[0.4, 0.1, 0.4]} c="#FF8FB8" />
      {scoops.map((s, i) => (
        <Dropper key={i} bornAt={bornTimes[i] ?? 0} leaveAt={leaveAt} position={[PLATE[0], 0.95 + i * 0.42, PLATE[2]]}>
          <Sphere p={[0, 0, 0]} r={0.36} c={scoopById(s).color} />
        </Dropper>
      ))}
      {cherry && (
        <Dropper bornAt={bornTimes[10] ?? 0} leaveAt={leaveAt} position={[PLATE[0], 0.95 + scoops.length * 0.42 + 0.1, PLATE[2]]}>
          <Sphere p={[0, 0.1, 0]} r={0.16} c="#E63946" /><B p={[0.03, 0.3, 0]} s={[0.03, 0.18, 0.03]} c="#3FAE49" />
        </Dropper>
      )}
    </group>
  );
}
// birth times per added scoop/cherry (module-level so remounts keep the bounce stable)
const bornTimes: Record<number, number> = {};
export function markBorn(key: number): void { bornTimes[key] = performance.now(); }

function Plate({ items, leaveAt, born }: { items: ItemId[]; leaveAt?: number; born: number[] }) {
  return (
    <group>
      <Cy p={[PLATE[0], 0.04, PLATE[2]]} s={[1.15, 0.08, 0.85]} c="#B9DDFF" />
      <Cy p={[PLATE[0], 0.09, PLATE[2]]} s={[0.92, 0.04, 0.68]} c="#8FC4FF" />
      {items.map((it, i) => (
        <Dropper key={i} bornAt={born[i] ?? 0} leaveAt={leaveAt} position={slot(i)}><Food kind={it} /></Dropper>
      ))}
    </group>
  );
}

function Guest({ id, good }: { id: GuestId; good: boolean }) {
  const [bornAt] = useState(() => performance.now());
  const pos: V3 = [2.4, -0.7, -2.6];
  if (id === 'jinglebells') {
    return <group position={pos} scale={1.5}><Cat position={[0, 0, 0]} rotY={-0.25} bob={good} /></group>;
  }
  return <Person id={id as 'mom' | 'dad' | 'julian' | 'darian'} position={pos} rotY={-0.25} bornAt={bornAt} happy={good} onTap={() => undefined} scale={1.5} />;
}

export function OrdersScene({ guest, kind, items, born, scoops, cherry, leaving, good }: {
  guest: GuestId; kind: 'plate' | 'sundae'; items: ItemId[]; born: number[]; scoops: Scoop[]; cherry: boolean; leaving: Leaving | null; good: boolean;
}) {
  useFrame(({ camera }) => {
    camera.position.set(0, 4.4, 8.0);
    camera.lookAt(0.3, 0.8, -0.6);
  });
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 9, 6]} intensity={1.6} />
      <hemisphereLight args={['#BFE6FF', '#FFB7D5', 0.5]} />
      <Cy p={[0, -0.17, -1]} s={[9, 0.3, 6]} c="#FF8FB8" />
      <Cy p={[0, -0.01, -1]} s={[8.4, 0.02, 5.5]} c="#FFB3D1" />
      <Cy p={[0, -1.5, -1]} s={[1.2, 2.4, 1.2]} c="#E63946" />
      <Cy p={[0, -3, 0]} s={[22, 0.5, 22]} c="#8ED06B" />
      {[-9, -5.5, -2.5, 6, 9.5, 12].map((x, i) => <BrickTree key={i} position={[x, -2.7, -9 - (i % 2) * 2]} scale={1.6} hue={i % 2} age={() => Infinity} />)}
      <Guest key={guest} id={guest} good={good} />
      {kind === 'plate' ? (
        <>
          <Plate items={items} born={born} />
          {leaving && <Plate items={leaving.items} born={[]} leaveAt={leaving.at} />}
        </>
      ) : (
        <>
          <Sundae scoops={scoops} cherry={cherry} />
          {leaving && <Sundae scoops={leaving.scoops} cherry={leaving.cherry} leaveAt={leaving.at} />}
        </>
      )}
      <Particles />
    </>
  );
}
