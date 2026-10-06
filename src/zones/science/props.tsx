import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Avatar } from '../../three/Avatar';
import type { Expression } from '../../types';
import { B, CYL, CYL8, Cy, mat } from '../woods/fx';
import { useLab } from './store';
import type { V3 } from './fx';

export const BENCH_Y = 1.35;

const glassMat = new THREE.MeshStandardMaterial({ color: '#DDF6FF', transparent: true, opacity: 0.28, roughness: 0.08, metalness: 0, depthWrite: false });
const sphereGeo = new THREE.IcosahedronGeometry(1, 1);

export function Glass({ p = [0, 0, 0], s, round }: { p?: V3; s: V3; round?: boolean }) {
  return <mesh geometry={round ? sphereGeo : CYL} material={glassMat} position={p} scale={s} renderOrder={2} />;
}

/** Liquid whose color eases toward `color`; `level` is 0..1 of `h`. */
export function Liquid({ color, r, h, level = 0.6, p = [0, 0, 0], glow = 0 }: { color: string; r: number; h: number; level?: number; p?: V3; glow?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0, emissive: color, emissiveIntensity: glow }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useMemo(() => new THREE.Color(color), [color]);
  useFrame((_, dt) => {
    m.color.lerp(target, Math.min(1, dt * 6));
    m.emissive.copy(m.color);
    m.emissiveIntensity = glow;
    if (ref.current) { ref.current.scale.y = h * level; ref.current.position.y = p[1] + h * level * 0.5; }
  });
  useEffect(() => () => m.dispose(), [m]);
  return <mesh ref={ref} geometry={CYL} material={m} position={[p[0], p[1] + h * level * 0.5, p[2]]} scale={[r, h * level, r]} />;
}

/** A few bubbles that rise and pop in a loop. */
export function BubbleStream({ p = [0, 0, 0], color = '#FFFFFF', h = 1, count = 4, speed = 1 }: { p?: V3; color?: string; h?: number; count?: number; speed?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const m = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }), [color]);
  useFrame(({ clock }) => {
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const t = ((clock.elapsedTime * 0.45 * speed + i / count) % 1);
      mesh.position.set(Math.sin((i + 1) * 2.1 + t * 5) * 0.12, t * h, Math.cos(i * 1.7 + t * 4) * 0.1);
      mesh.scale.setScalar((0.05 + 0.05 * ((i * 37) % 5) / 4) * Math.min(1, (1 - t) * 3) * Math.min(1, t * 5));
    });
  });
  return (
    <group position={p}>
      {Array.from({ length: count }).map((_, i) => <mesh key={i} ref={(o) => { refs.current[i] = o; }} geometry={sphereGeo} material={m} />)}
    </group>
  );
}

/** Round flask: glass bulb + neck + liquid + cork top. */
export function Flask({ p = [0, 0, 0], color, scale = 1, level = 0.55, bubbling = false, glow = 0 }: { p?: V3; color: string; scale?: number; level?: number; bubbling?: boolean; glow?: number }) {
  return (
    <group position={p} scale={scale}>
      <Liquid color={color} r={0.46} h={0.9} level={level} p={[0, 0.06, 0]} glow={glow} />
      <Glass p={[0, 0.5, 0]} s={[0.56, 0.95, 0.56]} />
      <Glass p={[0, 1.2, 0]} s={[0.2, 0.55, 0.2]} />
      <Cy p={[0, 1.5, 0]} s={[0.26, 0.1, 0.26]} c="#E9F4FF" />
      {bubbling && <BubbleStream p={[0, 0.5, 0]} color="#FFFFFF" h={0.8} count={3} />}
    </group>
  );
}

/** Straight beaker. */
export function Beaker({ p = [0, 0, 0], color, scale = 1, level = 0.6, bubbling = false }: { p?: V3; color: string; scale?: number; level?: number; bubbling?: boolean }) {
  return (
    <group position={p} scale={scale}>
      <Liquid color={color} r={0.42} h={1.0} level={level} p={[0, 0.06, 0]} />
      <Glass p={[0, 0.55, 0]} s={[0.46, 1.1, 0.46]} />
      <Cy p={[0, 1.12, 0]} s={[0.5, 0.06, 0.5]} c="#E9F4FF" />
      {bubbling && <BubbleStream p={[0, 0.5, 0]} color="#FFFFFF" h={0.9} count={3} speed={1.2} />}
    </group>
  );
}

const SHELF_COLORS = ['#FF6FB5', '#46D07A', '#FFD60A', '#8B4FD0', '#4CB7FF', '#FF8A1F'];

function Shelf({ x0, x1, y, seed }: { x0: number; x1: number; y: number; seed: number }) {
  const w = x1 - x0;
  const n = Math.max(2, Math.floor(w / 1.15));
  return (
    <group>
      <B p={[(x0 + x1) / 2, y, -3.7]} s={[w, 0.16, 1.0]} c="#E9B872" />
      {Array.from({ length: n }).map((_, i) => {
        const x = x0 + 0.6 + (i * (w - 1.2)) / Math.max(1, n - 1);
        const c = SHELF_COLORS[(i + seed) % SHELF_COLORS.length];
        const tall = (i + seed) % 2 === 0;
        return tall
          ? <Flask key={i} p={[x, y + 0.08, -3.7]} color={c} scale={0.55} level={0.5} bubbling={(i + seed) % 3 === 0} />
          : <Beaker key={i} p={[x, y + 0.08, -3.7]} color={c} scale={0.7} level={0.55} bubbling={(i + seed) % 3 === 1} />;
      })}
    </group>
  );
}

function BenchStuds() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: V3[] = [];
    for (let x = -6; x <= 6.01; x += 0.8) {
      out.push([x, BENCH_Y + 0.14, 1.0]);
      out.push([x, BENCH_Y + 0.14, -0.78]);
    }
    return out;
  }, []);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    spots.forEach((p, i) => { o.position.set(...p); o.scale.set(0.2, 0.09, 0.2); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
    mesh.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return <instancedMesh ref={ref} args={[CYL8, mat('#9FE9CF'), spots.length]} />;
}

/** Desk lamp with a softly glowing bulb. */
export function DeskLamp({ p = [0, 0, 0] }: { p?: V3 }) {
  const bulb = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = bulb.current?.material as THREE.MeshStandardMaterial | undefined;
    if (m) m.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 2.4) * 0.25;
  });
  return (
    <group position={p}>
      <Cy p={[0, 0.07, 0]} s={[0.5, 0.14, 0.5]} c="#3A86FF" />
      <B p={[0, 0.95, 0]} s={[0.12, 1.7, 0.12]} c="#FFD60A" r={[0, 0, 0.12]} />
      <group position={[-0.28, 1.85, 0.2]} rotation={[0.2, 0, -0.5]}>
        <mesh geometry={CYL} material={mat('#FF5CA8')} scale={[0.5, 0.45, 0.5]} />
        <mesh ref={bulb} geometry={sphereGeo} position={[0, -0.28, 0]} scale={0.28}>
          <meshStandardMaterial color="#FFF3B0" emissive="#FFE066" emissiveIntensity={1.6} />
        </mesh>
      </group>
      <pointLight position={[-0.5, 1.5, 0.5]} color="#FFE9A0" intensity={9} distance={7} decay={2} />
    </group>
  );
}

/** Julian at the bench, with chunky goggles on his forehead. */
export function Julian({ p = [-4.7, 1.1, -1.9], expr, wave }: { p?: V3; expr: Expression | null; wave: boolean }) {
  return (
    <group position={p}>
      <Avatar id="julian" scale={0.95} expression={expr ?? undefined} wave={wave} equipped={['labcoat']} interactive />
      <group position={[0, 2.5 * 0.95, -0.02]} scale={0.95} rotation={[-0.35, 0, 0]}>
        <Cy p={[-0.26, 0, 0.44]} s={[0.17, 0.12, 0.17]} c="#2BA6FF" r={[Math.PI / 2, 0, 0]} />
        <Cy p={[0.26, 0, 0.44]} s={[0.17, 0.12, 0.17]} c="#2BA6FF" r={[Math.PI / 2, 0, 0]} />
        <B p={[0, 0, 0.45]} s={[0.2, 0.08, 0.1]} c="#1D2A44" />
        <B p={[0, 0, 0]} s={[1.04, 0.08, 0.98]} c="#1D2A44" />
      </group>
    </group>
  );
}

/** The whole lab: floor, walls, shelves, window, bench, lamp. `neon` flips on the arcade glow. */
export function LabRoom({ lamp = true }: { lamp?: boolean }) {
  const glowAt = useLab((s) => s.ch.glowAt);
  const neon = glowAt > 0;
  const neonRefs = useRef<(THREE.Mesh | null)[]>([]);
  const floorRefs = useRef<(THREE.Mesh | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const floorTiles = useMemo(() => {
    const out: { x: number; z: number; i: number; chk: boolean }[] = [];
    let i = 0;
    for (let gx = 0; gx <= 12; gx++) for (let gz = 0; gz <= 7; gz++) out.push({ x: -9 + gx * 1.5, z: -3.5 + gz * 1.5, i: i++, chk: (gx + gz) % 2 === 0 });
    return out;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    neonRefs.current.forEach((m, i) => {
      if (!m) return;
      const mm = m.material as THREE.MeshStandardMaterial;
      if (!neon) { mm.emissiveIntensity = 0; mm.color.set('#9AD9C8'); return; }
      const c = new THREE.Color().setHSL(((t * 0.3 + i * 0.09) % 1), 1, 0.55);
      mm.color.copy(c); mm.emissive.copy(c); mm.emissiveIntensity = 1.6 + Math.sin(t * 8 + i) * 0.7;
    });
    floorRefs.current.forEach((m, i) => {
      if (!m) return;
      const mm = m.material as THREE.MeshStandardMaterial;
      const t0 = floorTiles[i];
      if (!neon) { mm.emissiveIntensity = 0; mm.color.set(t0.chk ? '#E6F7F0' : '#C8EBDD'); return; }
      const c = new THREE.Color().setHSL(((t * 0.5 + i * 0.07) % 1), 1, 0.5);
      const on = Math.sin(t * 6 + i * 1.3) > -0.2;
      mm.color.copy(on ? c : new THREE.Color('#1D2A44')); mm.emissive.copy(c); mm.emissiveIntensity = on ? 1.3 : 0;
    });
    if (light.current) light.current.intensity = neon ? 14 + Math.sin(t * 9) * 6 : 0;
  });
  return (
    <group>
      {/* floor tiles */}
      {floorTiles.map((t, i) => (
        <mesh key={i} ref={(o) => { floorRefs.current[i] = o; }} position={[t.x, -0.05, t.z]} scale={[1.46, 0.1, 1.46]} geometry={BOX_G}>
          <meshStandardMaterial color={t.chk ? '#E6F7F0' : '#C8EBDD'} roughness={0.7} emissive="#ffffff" emissiveIntensity={0} />
        </mesh>
      ))}
      {/* back wall: mint upper, blue brick wainscot */}
      <B p={[0, 5, -4.3]} s={[30, 10, 0.4]} c="#BFEDE0" />
      <B p={[0, 1.7, -4.05]} s={[30, 3.4, 0.2]} c="#4D9FE8" />
      {[0.55, 1.1, 1.65, 2.2, 2.75].map((y) => <B key={y} p={[0, y, -3.93]} s={[30, 0.05, 0.05]} c="#3578BA" />)}
      <B p={[0, 3.45, -3.9]} s={[30, 0.18, 0.4]} c="#FFFFFF" />
      {/* neon strip lights (dark mint until the arcade glow) */}
      {[-9, -6, -3, 0, 3, 6, 9].map((x, i) => (
        <mesh key={x} ref={(o) => { neonRefs.current[i] = o; }} geometry={BOX_G} position={[x, 7.4, -4.0]} scale={[2.2, 0.16, 0.12]}>
          <meshStandardMaterial color="#9AD9C8" emissive="#ffffff" emissiveIntensity={0} />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, 4, 1]} color="#FF7AF0" intensity={0} distance={18} decay={2} />
      {/* window */}
      <B p={[0.2, 6.0, -4.05]} s={[4.4, 2.6, 0.2]} c="#FFFFFF" />
      <B p={[0.2, 6.0, -3.93]} s={[4.0, 2.2, 0.1]} c="#9BD8FF" />
      <B p={[0.2, 6.0, -3.85]} s={[0.12, 2.2, 0.08]} c="#FFFFFF" />
      <B p={[0.2, 6.0, -3.85]} s={[4.0, 0.12, 0.08]} c="#FFFFFF" />
      <Cy p={[-1.1, 6.5, -3.88]} s={[0.4, 0.05, 0.4]} c="#FFE066" r={[Math.PI / 2, 0, 0]} />
      {/* shelves */}
      <Shelf x0={-9.2} x1={-3.4} y={4.1} seed={0} />
      <Shelf x0={-9.2} x1={-3.4} y={6.0} seed={2} />
      <Shelf x0={3.6} x1={9.2} y={4.1} seed={1} />
      <Shelf x0={3.6} x1={9.2} y={6.0} seed={4} />
      {/* Julian's step stool, hidden behind the bench */}
      <B p={[-4.7, 0.55, -1.9]} s={[2, 1.1, 1.6]} c="#3578BA" />
      {/* bench */}
      <B p={[0, BENCH_Y / 2 - 0.05, 0.1]} s={[12.8, BENCH_Y - 0.1, 2.5]} c="#4D9FE8" />
      {[0.4, 0.8].map((y) => <B key={y} p={[0, y, 1.37]} s={[12.8, 0.05, 0.05]} c="#3578BA" />)}
      <B p={[0, BENCH_Y + 0.02, 0.1]} s={[13.0, 0.18, 2.7]} c="#7AE5BC" />
      <BenchStuds />
      {lamp && <DeskLamp p={[5.4, BENCH_Y + 0.08, -0.2]} />}
    </group>
  );
}
const BOX_G = new THREE.BoxGeometry(1, 1, 1);
