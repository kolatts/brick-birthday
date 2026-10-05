import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { B, Cone, Cy, mat, popScale } from './fx';
import { family } from '../../config/family';
import type { FriendId, GuestId } from './facts';

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
/** Rudolph: gray-and-tan blocky dog with pointy ears and a curled tail. */
export function Dog({ position, rotY = 0, scale = 1, onTap, bob = true }: { position: V3; rotY?: number; scale?: number; onTap?: () => void; bob?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current && bob) g.current.position.y = Math.abs(Math.sin(t * 3)) * 0.12;
    if (tail.current) tail.current.rotation.y = Math.sin(t * 9) * 0.35;
  });
  const gray = '#9AA0A6';
  const tan = '#C8A97E';
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale} onPointerDown={onTap}>
      <group ref={g}>
        <B p={[0, 0.7, 0]} s={[0.8, 0.7, 1.2]} c={gray} />
        <B p={[0, 0.55, 0.15]} s={[0.84, 0.4, 0.7]} c={tan} />
        {([[-0.27, 0.48], [0.27, 0.48], [-0.27, -0.48], [0.27, -0.48]] as [number, number][]).map(([x, z], i) => (
          <B key={i} p={[x, 0.22, z]} s={[0.24, 0.44, 0.26]} c={i < 2 ? tan : gray} />
        ))}
        <B p={[0, 1.25, 0.62]} s={[0.78, 0.7, 0.7]} c={gray} />
        <B p={[0, 1.12, 1.05]} s={[0.46, 0.34, 0.3]} c={tan} />
        <B p={[0, 1.22, 1.22]} s={[0.2, 0.14, 0.1]} c="#222" />
        <B p={[-0.17, 1.4, 0.99]} s={[0.1, 0.1, 0.06]} c="#1D1D1D" />
        <B p={[0.17, 1.4, 0.99]} s={[0.1, 0.1, 0.06]} c="#1D1D1D" />
        <Cone p={[-0.28, 1.78, 0.58]} s={[0.3, 0.46, 0.3]} c="#7C8288" r={[0, Math.PI / 4, 0]} />
        <Cone p={[0.28, 1.78, 0.58]} s={[0.3, 0.46, 0.3]} c="#7C8288" r={[0, Math.PI / 4, 0]} />
        <Cone p={[-0.28, 1.97, 0.58]} s={[0.16, 0.2, 0.16]} c="#222" r={[0, Math.PI / 4, 0]} />
        <Cone p={[0.28, 1.97, 0.58]} s={[0.16, 0.2, 0.16]} c="#222" r={[0, Math.PI / 4, 0]} />
        <group ref={tail} position={[0, 0.95, -0.6]}>
          <B p={[0, 0.0, -0.12]} s={[0.26, 0.26, 0.3]} c={gray} />
          <B p={[0, 0.2, -0.28]} s={[0.26, 0.26, 0.26]} c={tan} />
          <B p={[0, 0.4, -0.12]} s={[0.26, 0.26, 0.3]} c={gray} />
        </group>
      </group>
    </group>
  );
}

/** Jingle Bells: fluffy dark tortoiseshell blocky cat. */
export function Cat({ position, rotY = 0, scale = 1, onTap, bob = true }: { position: V3; rotY?: number; scale?: number; onTap?: () => void; bob?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + 1;
    if (g.current && bob) g.current.position.y = Math.abs(Math.sin(t * 2.4)) * 0.1;
    if (tail.current) tail.current.rotation.z = Math.sin(t * 3) * 0.3;
  });
  const dark = '#3A2A22';
  const brown = '#8A5A2B';
  const orange = '#C77A2E';
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale} onPointerDown={onTap}>
      <group ref={g}>
        <B p={[0, 0.55, 0]} s={[0.8, 0.7, 1.0]} c={dark} />
        <B p={[-0.25, 0.7, -0.1]} s={[0.35, 0.45, 0.5]} c={brown} />
        <B p={[0.3, 0.5, 0.2]} s={[0.25, 0.3, 0.4]} c={orange} />
        {([[-0.25, 0.4], [0.25, 0.4], [-0.25, -0.35], [0.25, -0.35]] as [number, number][]).map(([x, z], i) => (
          <B key={i} p={[x, 0.18, z]} s={[0.26, 0.36, 0.26]} c={i % 2 ? brown : dark} />
        ))}
        <B p={[0, 1.15, 0.5]} s={[0.84, 0.7, 0.66]} c={dark} />
        <B p={[-0.46, 1.05, 0.55]} s={[0.16, 0.3, 0.46]} c={brown} />
        <B p={[0.46, 1.05, 0.55]} s={[0.16, 0.3, 0.46]} c={orange} />
        <B p={[0.12, 1.4, 0.82]} s={[0.3, 0.14, 0.04]} c={orange} />
        <Cone p={[-0.28, 1.62, 0.5]} s={[0.3, 0.36, 0.3]} c={dark} r={[0, Math.PI / 4, 0]} />
        <Cone p={[0.28, 1.62, 0.5]} s={[0.3, 0.36, 0.3]} c={brown} r={[0, Math.PI / 4, 0]} />
        <B p={[-0.2, 1.22, 0.85]} s={[0.18, 0.16, 0.05]} c="#C8E04A" />
        <B p={[0.2, 1.22, 0.85]} s={[0.18, 0.16, 0.05]} c="#C8E04A" />
        <B p={[-0.2, 1.22, 0.88]} s={[0.06, 0.14, 0.04]} c="#111" />
        <B p={[0.2, 1.22, 0.88]} s={[0.06, 0.14, 0.04]} c="#111" />
        <B p={[0, 1.08, 0.86]} s={[0.12, 0.09, 0.05]} c="#FF9EB5" />
        <B p={[0, 0.85, 0.72]} s={[0.76, 0.1, 0.1]} c="#E63946" />
        <B p={[0, 0.76, 0.78]} s={[0.14, 0.14, 0.1]} c="#FFD60A" />
        <group ref={tail} position={[0, 0.75, -0.55]}>
          <B p={[0, 0.1, -0.1]} s={[0.22, 0.22, 0.4]} c={dark} />
          <B p={[0, 0.4, -0.25]} s={[0.22, 0.5, 0.22]} c={brown} />
        </group>
      </group>
    </group>
  );
}

// ---- forest friends ----------------------------------------------------------------------------
export function FriendModel({ type }: { type: FriendId }) {
  switch (type) {
    case 'fox':
      return (
        <group>
          <B p={[0, 0.4, 0]} s={[0.42, 0.4, 0.8]} c="#F28C28" />
          <B p={[0, 0.3, 0.2]} s={[0.44, 0.2, 0.42]} c="#FFF3E0" />
          <B p={[0, 0.72, 0.5]} s={[0.46, 0.4, 0.4]} c="#F28C28" />
          <B p={[0, 0.64, 0.74]} s={[0.24, 0.2, 0.2]} c="#FFF3E0" />
          <B p={[0, 0.7, 0.86]} s={[0.1, 0.08, 0.06]} c="#222" />
          <B p={[-0.11, 0.8, 0.71]} s={[0.07, 0.07, 0.04]} c="#222" />
          <B p={[0.11, 0.8, 0.71]} s={[0.07, 0.07, 0.04]} c="#222" />
          <Cone p={[-0.15, 1.05, 0.5]} s={[0.2, 0.3, 0.2]} c="#F28C28" r={[0, Math.PI / 4, 0]} />
          <Cone p={[0.15, 1.05, 0.5]} s={[0.2, 0.3, 0.2]} c="#F28C28" r={[0, Math.PI / 4, 0]} />
          {([[-0.14, 0.3], [0.14, 0.3], [-0.14, -0.3], [0.14, -0.3]] as [number, number][]).map(([x, z], i) => (
            <B key={i} p={[x, 0.1, z]} s={[0.12, 0.2, 0.14]} c="#3A2A22" />
          ))}
          <B p={[0, 0.5, -0.65]} s={[0.26, 0.26, 0.6]} c="#F28C28" r={[0.4, 0, 0]} />
          <B p={[0, 0.62, -0.95]} s={[0.26, 0.26, 0.2]} c="#FFF3E0" r={[0.4, 0, 0]} />
        </group>
      );
    case 'deer':
      return (
        <group>
          <B p={[0, 0.85, 0]} s={[0.45, 0.5, 0.95]} c="#C68E5A" />
          <B p={[0, 0.75, 0.05]} s={[0.47, 0.25, 0.6]} c="#F1D9B5" />
          {([[-0.15, 0.35], [0.15, 0.35], [-0.15, -0.35], [0.15, -0.35]] as [number, number][]).map(([x, z], i) => (
            <B key={i} p={[x, 0.3, z]} s={[0.12, 0.6, 0.12]} c="#8A5A2B" />
          ))}
          <B p={[0, 1.35, 0.55]} s={[0.2, 0.55, 0.22]} c="#C68E5A" r={[0.3, 0, 0]} />
          <B p={[0, 1.6, 0.72]} s={[0.3, 0.3, 0.4]} c="#C68E5A" />
          <B p={[0, 1.55, 0.95]} s={[0.12, 0.1, 0.06]} c="#222" />
          <B p={[-0.14, 1.68, 0.88]} s={[0.07, 0.07, 0.04]} c="#222" />
          <B p={[0.14, 1.68, 0.88]} s={[0.07, 0.07, 0.04]} c="#222" />
          <B p={[-0.2, 1.82, 0.62]} s={[0.1, 0.18, 0.06]} c="#C68E5A" r={[0, 0, 0.6]} />
          <B p={[0.2, 1.82, 0.62]} s={[0.1, 0.18, 0.06]} c="#C68E5A" r={[0, 0, -0.6]} />
          <B p={[-0.12, 1.98, 0.7]} s={[0.06, 0.3, 0.06]} c="#F5E6C8" r={[0, 0, 0.3]} />
          <B p={[0.12, 1.98, 0.7]} s={[0.06, 0.3, 0.06]} c="#F5E6C8" r={[0, 0, -0.3]} />
          <B p={[0, 0.98, -0.5]} s={[0.14, 0.18, 0.1]} c="#FFF" />
        </group>
      );
    case 'songbird':
      return (
        <group>
          <B p={[0, 0.5, 0]} s={[0.4, 0.38, 0.5]} c="#3A9BFF" />
          <B p={[0, 0.42, 0.1]} s={[0.42, 0.2, 0.3]} c="#FFE8A0" />
          <B p={[0, 0.8, 0.18]} s={[0.32, 0.3, 0.3]} c="#3A9BFF" />
          <Cone p={[0, 0.78, 0.45]} s={[0.12, 0.2, 0.12]} c="#FFB020" r={[Math.PI / 2, Math.PI / 4, 0]} />
          <B p={[-0.1, 0.88, 0.34]} s={[0.06, 0.06, 0.04]} c="#111" />
          <B p={[0.1, 0.88, 0.34]} s={[0.06, 0.06, 0.04]} c="#111" />
          <B p={[-0.25, 0.52, -0.02]} s={[0.08, 0.26, 0.4]} c="#1F6FD6" r={[0, 0, 0.3]} />
          <B p={[0.25, 0.52, -0.02]} s={[0.08, 0.26, 0.4]} c="#1F6FD6" r={[0, 0, -0.3]} />
          <B p={[0, 0.5, -0.4]} s={[0.16, 0.06, 0.4]} c="#1F6FD6" r={[-0.3, 0, 0]} />
          <B p={[-0.08, 0.15, 0]} s={[0.04, 0.3, 0.04]} c="#FFB020" />
          <B p={[0.08, 0.15, 0]} s={[0.04, 0.3, 0.04]} c="#FFB020" />
        </group>
      );
    case 'squirrel':
      return (
        <group>
          <B p={[0, 0.45, 0]} s={[0.4, 0.55, 0.4]} c="#A0622D" />
          <B p={[0, 0.4, 0.14]} s={[0.3, 0.35, 0.2]} c="#F3DDBB" />
          <B p={[0, 0.85, 0.12]} s={[0.36, 0.34, 0.34]} c="#A0622D" />
          <B p={[0, 0.8, 0.31]} s={[0.1, 0.08, 0.06]} c="#222" />
          <B p={[-0.1, 0.92, 0.3]} s={[0.07, 0.07, 0.04]} c="#222" />
          <B p={[0.1, 0.92, 0.3]} s={[0.07, 0.07, 0.04]} c="#222" />
          <Cone p={[-0.12, 1.12, 0.12]} s={[0.14, 0.2, 0.14]} c="#8A4F20" r={[0, Math.PI / 4, 0]} />
          <Cone p={[0.12, 1.12, 0.12]} s={[0.14, 0.2, 0.14]} c="#8A4F20" r={[0, Math.PI / 4, 0]} />
          <B p={[0, 0.55, -0.34]} s={[0.3, 0.8, 0.28]} c="#C27B3C" r={[-0.25, 0, 0]} />
          <B p={[0, 1.0, -0.5]} s={[0.34, 0.3, 0.3]} c="#C27B3C" />
          <Cy p={[0, 0.5, 0.36]} s={[0.1, 0.16, 0.1]} c="#8B5A2B" low />
        </group>
      );
    case 'rabbit':
      return (
        <group>
          <B p={[0, 0.4, 0]} s={[0.45, 0.45, 0.55]} c="#F4F0EA" />
          <B p={[0, 0.78, 0.2]} s={[0.38, 0.34, 0.34]} c="#F4F0EA" />
          <B p={[0, 0.72, 0.38]} s={[0.1, 0.08, 0.05]} c="#FF9EB5" />
          <B p={[-0.1, 0.86, 0.38]} s={[0.07, 0.07, 0.04]} c="#222" />
          <B p={[0.1, 0.86, 0.38]} s={[0.07, 0.07, 0.04]} c="#222" />
          <B p={[-0.1, 1.2, 0.18]} s={[0.12, 0.55, 0.1]} c="#F4F0EA" />
          <B p={[0.1, 1.2, 0.18]} s={[0.12, 0.55, 0.1]} c="#F4F0EA" />
          <B p={[-0.1, 1.2, 0.235]} s={[0.06, 0.4, 0.02]} c="#FFB5C8" />
          <B p={[0.1, 1.2, 0.235]} s={[0.06, 0.4, 0.02]} c="#FFB5C8" />
          <B p={[0, 0.4, -0.35]} s={[0.22, 0.22, 0.22]} c="#FFFFFF" />
          <B p={[-0.16, 0.08, 0.2]} s={[0.14, 0.16, 0.3]} c="#E8E2D8" />
          <B p={[0.16, 0.08, 0.2]} s={[0.14, 0.16, 0.3]} c="#E8E2D8" />
        </group>
      );
  }
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
function useFaceTexture(url: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    let loaded: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        loaded = t;
        if (alive) setTex(t);
      },
      undefined,
      () => { /* default faces are optional; the drawn face stays */ },
    );
    return () => { alive = false; loaded?.dispose(); };
  }, [url]);
  return tex;
}

export const faceUrl = (id: string): string => `${import.meta.env.BASE_URL}faces/default/${id}-happy.webp`;

/** Blocky seated family member: round head, chunky body, mitten hands, face plate. */
export function Person({ id, position, rotY, bornAt, onTap, happy, scale = 1 }: { scale?: number; id: Exclude<GuestId, FriendId | 'rudolph' | 'jinglebells'>; position: V3; rotY: number; bornAt: number; onTap: () => void; happy: boolean }) {
  const av = family[id].avatar;
  const tex = useFaceTexture(faceUrl(id));
  const faceMat = useMemo(() => (tex ? new THREE.MeshBasicMaterial({ map: tex, transparent: true }) : null), [tex]);
  const g = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const k = popScale((performance.now() - bornAt) / 1000, 0, 0.55);
    g.current.scale.setScalar(k * scale);
    if (head.current) head.current.position.y = 1.45 + (happy ? Math.abs(Math.sin(clock.elapsedTime * 4)) * 0.08 : 0);
  });
  return (
    <group ref={g} position={position} rotation={[0, rotY, 0]} onPointerDown={onTap}>
      <B p={[0, 0.2, 0]} s={[0.9, 0.4, 0.9]} c="#5C4A3A" />
      <B p={[0, 0.85, 0]} s={[0.95, 0.9, 0.62]} c={av.outfitColor} />
      <B p={[-0.58, 0.85, 0.12]} s={[0.24, 0.6, 0.3]} c={av.outfitColor} />
      <B p={[0.58, 0.85, 0.12]} s={[0.24, 0.6, 0.3]} c={av.outfitColor} />
      <B p={[-0.58, 0.6, 0.3]} s={[0.26, 0.26, 0.26]} c={av.skinTone} />
      <B p={[0.58, 0.6, 0.3]} s={[0.26, 0.26, 0.26]} c={av.skinTone} />
      <group ref={head} position={[0, 1.45, 0]}>
        <RoundedBox args={[0.95, 0.88, 0.8]} radius={0.2} smoothness={2} material={mat(av.skinTone)} />
        {av.hairStyle !== 'bald' && <B p={[0, 0.42, -0.02]} s={[av.hairStyle.startsWith('curly') ? 1.15 : 1.0, av.hairStyle.startsWith('curly') ? 0.5 : 0.28, 0.86]} c={av.hairColor} />}
        {av.hairStyle.startsWith('long') && <B p={[0, -0.05, -0.38]} s={[1.0, 1.0, 0.16]} c={av.hairColor} />}
        {av.hairStyle.startsWith('wavy') && <B p={[0, 0.22, 0.3]} s={[0.9, 0.18, 0.3]} c={av.hairColor} />}
        {faceMat ? (
          <mesh position={[0, 0, 0.405]} material={faceMat}>
            <planeGeometry args={[0.8, 0.8]} />
          </mesh>
        ) : (
          <>
            <B p={[-0.2, 0.08, 0.4]} s={[0.12, 0.16, 0.05]} c="#1D2A44" />
            <B p={[0.2, 0.08, 0.4]} s={[0.12, 0.16, 0.05]} c="#1D2A44" />
            <B p={[0, -0.18, 0.4]} s={[0.3, 0.07, 0.05]} c="#C0392B" />
            <B p={[-0.3, -0.08, 0.4]} s={[0.1, 0.07, 0.04]} c="#FF9EB5" />
            <B p={[0.3, -0.08, 0.4]} s={[0.1, 0.07, 0.04]} c="#FF9EB5" />
          </>
        )}
        {id === 'mom' && <B p={[0, 0.58, 0.1]} s={[0.7, 0.1, 0.2]} c="#222" />}
        {id === 'julian' && <B p={[0, 0.5, 0.36]} s={[1.0, 0.14, 0.2]} c="#2EC4B6" />}
        {id === 'darian' && <B p={[0, 0.5, 0.52]} s={[0.9, 0.06, 0.45]} c="#FFD60A" />}
      </group>
    </group>
  );
}
