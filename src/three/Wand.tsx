import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeParts, vertexMat, type Part } from './merge';
import type { V3 } from './prims';

/* ------------------------------------------------------------------ wand ---------- */

const STAR_COLOR = '#FFE45C';
const starMat = new THREE.MeshBasicMaterial({ color: STAR_COLOR, toneMapped: false });
const glowMat = new THREE.MeshBasicMaterial({
  color: '#FFF3A0',
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
  toneMapped: false,
});
const glowGeo = new THREE.SphereGeometry(0.3, 12, 8);

/** Brick wand: pink/white brick stack with a glowing star tip. Points up along +y from its origin. */
export function Wand({ scale = 1 }: { scale?: number }) {
  const handle = useMemo(() => {
    const parts: Part[] = [];
    for (let i = 0; i < 6; i++) {
      parts.push({ k: 'box', p: [0, 0.07 + i * 0.13, 0], s: [0.11, 0.13, 0.11], c: i % 2 ? '#FFFFFF' : '#FF5CA8' });
    }
    parts.push({ k: 'cyl', p: [0, 0.82, 0], s: [0.07, 0.05, 0.07], c: '#FFD60A' });
    return mergeParts(parts);
  }, []);
  const star = useMemo(() => {
    const g = mergeParts([{ k: 'star', p: [0, 0, 0], s: [0.22, 0.08, 0], c: '#FFFFFF' }]);
    g.deleteAttribute('color');
    return g;
  }, []);
  useEffect(
    () => () => {
      handle.dispose();
      star.dispose();
    },
    [handle, star],
  );
  const tip = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = tip.current;
    if (!g) return;
    const s = 1 + Math.sin(t * 5) * 0.12;
    g.scale.set(s, s, s);
    g.rotation.z = Math.sin(t * 2) * 0.15;
  });
  return (
    <group scale={scale}>
      <mesh geometry={handle} material={vertexMat} />
      <group ref={tip} position={[0, 1.05, 0]}>
        <mesh geometry={star} material={starMat} />
        <mesh geometry={glowGeo} material={glowMat} />
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- sparkles --------- */

const PALETTE = ['#FF5CA8', '#FFD60A', '#3A86FF', '#FFFFFF', '#7AE582', '#FF8C42'];

export interface BurstOptions {
  count?: number;
  colors?: string[];
  speed?: number;
  gravity?: number;
  size?: number;
}
type Listener = (at: V3, opts?: BurstOptions) => void;
const listeners = new Set<Listener>();

/** Fire a sparkle burst at a world position in every `<Sparkles global />` pool that is mounted. */
export function emitSparkles(at: V3, opts?: BurstOptions): void {
  listeners.forEach((l) => l(at, opts));
}

/** Returns `burst(at)`: sparkles at the tap point (needs a `<Sparkles global />` pool in the scene). */
export function useSparkles(): (at: V3, opts?: BurstOptions) => void {
  return useCallback((at, opts) => emitSparkles(at, opts), []);
}

interface SparklesProps {
  /** Burst location. With `at`, a burst plays on mount and whenever `burstKey` changes. */
  at?: V3;
  burstKey?: number | string;
  count?: number;
  /** Also answer emitSparkles()/useSparkles() calls. The hub mounts exactly one global pool. */
  global?: boolean;
  /** Pool capacity (<= 200). */
  max?: number;
}

/** Instanced cube sparkles (single draw call, <= 200 particles). Safe to reuse in any zone Canvas. */
export function Sparkles({ at, burstKey, count = 28, global = false, max = 200 }: SparklesProps) {
  const cap = Math.min(200, max);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const st = useMemo(
    () => ({
      pos: new Float32Array(cap * 3),
      vel: new Float32Array(cap * 3),
      life: new Float32Array(cap),
      maxLife: new Float32Array(cap),
      size: new Float32Array(cap),
      spin: new Float32Array(cap),
      grav: new Float32Array(cap),
      cursor: 0,
      alive: 0,
      dummy: new THREE.Object3D(),
      color: new THREE.Color(),
    }),
    [cap],
  );

  const spawn = useCallback(
    (p: V3, o?: BurstOptions) => {
      const m = mesh.current;
      if (!m) return;
      const n = Math.min(cap, o?.count ?? count);
      const colors = o?.colors ?? PALETTE;
      const speed = o?.speed ?? 2.4;
      for (let k = 0; k < n; k++) {
        const i = st.cursor;
        st.cursor = (st.cursor + 1) % cap;
        const a = Math.random() * Math.PI * 2;
        const up = 0.4 + Math.random() * 0.9;
        const sp = speed * (0.4 + Math.random() * 0.8);
        st.pos[i * 3] = p[0];
        st.pos[i * 3 + 1] = p[1];
        st.pos[i * 3 + 2] = p[2];
        st.vel[i * 3] = Math.cos(a) * sp;
        st.vel[i * 3 + 1] = up * sp * 1.2;
        st.vel[i * 3 + 2] = Math.sin(a) * sp;
        st.life[i] = st.maxLife[i] = 0.6 + Math.random() * 0.6;
        st.size[i] = (o?.size ?? 0.11) * (0.6 + Math.random() * 0.8);
        st.spin[i] = Math.random() * 8;
        st.grav[i] = o?.gravity ?? 3.5;
        m.setColorAt(i, st.color.set(colors[(Math.random() * colors.length) | 0]));
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      st.alive = cap;
    },
    [cap, count, st],
  );

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    st.dummy.scale.setScalar(0);
    st.dummy.updateMatrix();
    for (let i = 0; i < cap; i++) {
      m.setMatrixAt(i, st.dummy.matrix);
      m.setColorAt(i, st.color.set('#ffffff'));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cap, st]);

  useEffect(() => {
    if (!global) return;
    listeners.add(spawn);
    return () => {
      listeners.delete(spawn);
    };
  }, [global, spawn]);

  const atKey = at ? `${at[0]},${at[1]},${at[2]}` : '';
  useEffect(() => {
    if (at) spawn(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atKey, burstKey, spawn]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m || st.alive === 0) return;
    const d = Math.min(dt, 0.05);
    let alive = 0;
    const { pos, vel, life, maxLife, size, spin, grav, dummy } = st;
    for (let i = 0; i < cap; i++) {
      const l = life[i];
      if (l <= 0) continue;
      const nl = l - d;
      life[i] = nl;
      if (nl <= 0) {
        dummy.scale.setScalar(0);
        dummy.position.set(0, -50, 0);
      } else {
        alive++;
        vel[i * 3 + 1] -= grav[i] * d;
        pos[i * 3] += vel[i * 3] * d;
        pos[i * 3 + 1] += vel[i * 3 + 1] * d;
        pos[i * 3 + 2] += vel[i * 3 + 2] * d;
        const k = nl / maxLife[i];
        dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        dummy.scale.setScalar(size[i] * (0.3 + k));
        dummy.rotation.set(spin[i] * k, spin[i] * 0.7 * k, 0);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    st.alive = alive;
  });

  return (
    <instancedMesh ref={mesh} args={[sparkGeo, sparkMat, cap]} frustumCulled={false} raycast={noRaycast} renderOrder={5} />
  );
}

const sparkGeo = new THREE.BoxGeometry(1, 1, 1);
const sparkMat = new THREE.MeshBasicMaterial({ toneMapped: false });
function noRaycast(): void {
  /* particles are never tap targets */
}
