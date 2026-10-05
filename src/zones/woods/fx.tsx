import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---- shared cached geometry / materials (keeps draw state cheap) -------------------------------
export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const CYL = new THREE.CylinderGeometry(1, 1, 1, 14);
export const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8);
export const CONE4 = new THREE.ConeGeometry(1, 1, 4);

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, opts: { emissive?: string; emissiveIntensity?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 0}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0, ...opts });
    mats.set(key, m);
  }
  return m;
}

type V3 = [number, number, number];

/** A unit-box mesh with size, position and optional rotation. */
export function B({ p = [0, 0, 0], s, c, r, onDown }: { p?: V3; s: V3; c: string; r?: V3; onDown?: () => void }) {
  return <mesh geometry={BOX} material={mat(c)} position={p} scale={s} rotation={r} onPointerDown={onDown} />;
}
/** A unit-cylinder mesh: s = [radius, height, radius]. */
export function Cy({ p = [0, 0, 0], s, c, r, low }: { p?: V3; s: V3; c: string; r?: V3; low?: boolean }) {
  return <mesh geometry={low ? CYL8 : CYL} material={mat(c)} position={p} scale={s} rotation={r} />;
}
export function Cone({ p = [0, 0, 0], s, c, r }: { p?: V3; s: V3; c: string; r?: V3 }) {
  return <mesh geometry={CONE4} material={mat(c)} position={p} scale={s} rotation={r} />;
}

export const easeOutBack = (t: number): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** Scale in 0..~1.1 for a pop-in starting at `start` seconds lasting `dur`. */
export const popScale = (age: number, start: number, dur: number): number => {
  const k = easeOutBack((age - start) / dur);
  return k <= 0 ? 0.0001 : k;
};

// ---- particles ---------------------------------------------------------------------------------
export type FxKind = 'drop' | 'sparkle' | 'splash' | 'confetti';
interface Spawn { kind: FxKind; pos: V3; n: number }
const queue: Spawn[] = [];

/** Emit a burst of particles at a world position. Safe to call from anywhere. */
export function emit(kind: FxKind, pos: V3, n = 12): void {
  if (queue.length < 64) queue.push({ kind, pos, n });
}

const MAX = 320;
const SPARKLE = ['#FFD60A', '#FF8FD0', '#FFFFFF', '#9BE7FF'];
const CONFETTI = ['#FF5CA8', '#FFD60A', '#3A86FF', '#7AE582', '#E63946'];
const SPLASH = ['#C98A52', '#FFE8CC', '#FF8FB8'];

export function Particles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () => ({
      pos: new Float32Array(MAX * 3),
      vel: new Float32Array(MAX * 3),
      life: new Float32Array(MAX),
      max: new Float32Array(MAX),
      size: new Float32Array(MAX),
      grav: new Float32Array(MAX),
      next: 0,
      dummy: new THREE.Object3D(),
      color: new THREE.Color(),
    }),
    [],
  );

  useFrame((_, dtRaw) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(dtRaw, 0.05);
    const d = data;
    while (queue.length) {
      const sp = queue.shift()!;
      for (let k = 0; k < sp.n; k++) {
        const i = d.next;
        d.next = (d.next + 1) % MAX;
        const a = Math.random() * Math.PI * 2;
        const spread = sp.kind === 'drop' ? 0.35 : sp.kind === 'splash' ? 1.4 : sp.kind === 'confetti' ? 2.4 : 1.1;
        const up = sp.kind === 'drop' ? -0.5 - Math.random() : sp.kind === 'splash' ? 2.5 + Math.random() * 2 : sp.kind === 'confetti' ? 4 + Math.random() * 3 : 1 + Math.random() * 2;
        const rr = Math.random() * spread;
        d.pos.set([sp.pos[0] + (sp.kind === 'drop' ? (Math.random() - 0.5) * 0.5 : 0), sp.pos[1] + (sp.kind === 'drop' ? 1.2 : 0), sp.pos[2]], i * 3);
        d.vel.set([Math.cos(a) * rr, up, Math.sin(a) * rr], i * 3);
        d.max[i] = d.life[i] = sp.kind === 'sparkle' ? 0.9 + Math.random() * 0.5 : sp.kind === 'confetti' ? 1.8 + Math.random() : 0.7 + Math.random() * 0.4;
        d.size[i] = sp.kind === 'drop' ? 0.09 : sp.kind === 'splash' ? 0.12 : sp.kind === 'confetti' ? 0.16 : 0.14;
        d.grav[i] = sp.kind === 'sparkle' ? 0.6 : sp.kind === 'confetti' ? 5 : 9;
        const pal = sp.kind === 'drop' ? ['#4CB7FF', '#9BE0FF'] : sp.kind === 'splash' ? SPLASH : sp.kind === 'confetti' ? CONFETTI : SPARKLE;
        mesh.setColorAt(i, d.color.set(pal[Math.floor(Math.random() * pal.length)]));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < MAX; i++) {
      if (d.life[i] > 0) {
        d.life[i] -= dt;
        d.vel[i * 3 + 1] -= d.grav[i] * dt;
        d.pos[i * 3] += d.vel[i * 3] * dt;
        d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt;
        d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
        if (d.pos[i * 3 + 1] < 0.02 && d.vel[i * 3 + 1] < 0) {
          d.pos[i * 3 + 1] = 0.02;
          d.vel[i * 3 + 1] *= -0.25;
        }
      }
      const alive = d.life[i] > 0;
      const k = alive ? Math.min(1, (d.life[i] / d.max[i]) * 2.5) * d.size[i] : 0;
      d.dummy.position.set(d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2]);
      d.dummy.scale.setScalar(k);
      d.dummy.rotation.set(d.life[i] * 7, d.life[i] * 5, 0);
      d.dummy.updateMatrix();
      mesh.setMatrixAt(i, d.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[BOX, undefined, MAX]} frustumCulled={false}>
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
}
