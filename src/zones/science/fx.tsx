import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type V3 = [number, number, number];
export type FxKind = 'bubble' | 'smoke' | 'spark' | 'splash' | 'confetti';

interface Spawn { kind: FxKind; pos: V3; n: number; color?: string; spread?: number }
const queue: Spawn[] = [];

/** Emit particles at a world position from anywhere. */
export function emitFx(kind: FxKind, pos: V3, n = 10, color?: string, spread?: number): void {
  if (queue.length < 80) queue.push({ kind, pos, n, color, spread });
}

const MAX = 360;
const SPARK = ['#FFD60A', '#FF8FD0', '#FFFFFF', '#9BE7FF'];
const CONFETTI = ['#FF5CA8', '#FFD60A', '#3A86FF', '#7AE582', '#E63946'];
const SMOKE = ['#FFFFFF', '#E8EEF5', '#FFE9B8', '#FFC27A'];

const GEO = new THREE.IcosahedronGeometry(1, 0);

/** One instanced mesh drives every lab effect: fizz bubbles, rocket smoke, sparkles, splashes, confetti. */
export function Particles() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(
    () => ({
      pos: new Float32Array(MAX * 3), vel: new Float32Array(MAX * 3), life: new Float32Array(MAX), max: new Float32Array(MAX),
      size: new Float32Array(MAX), grav: new Float32Array(MAX), kind: new Uint8Array(MAX), next: 0,
      dummy: new THREE.Object3D(), color: new THREE.Color(),
    }),
    [],
  );
  useFrame((_, dtRaw) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(dtRaw, 0.05);
    while (queue.length) {
      const sp = queue.shift()!;
      for (let k = 0; k < sp.n; k++) {
        const i = d.next;
        d.next = (d.next + 1) % MAX;
        const a = Math.random() * Math.PI * 2;
        const sp0 = sp.spread ?? 0.5;
        let vx: number, vy: number, vz: number, life: number, size: number, grav: number, kind: number;
        let col = sp.color ?? '#FFFFFF';
        if (sp.kind === 'bubble') {
          const r = Math.random() * sp0;
          vx = Math.cos(a) * r * 0.6; vy = 1.6 + Math.random() * 2.2; vz = Math.sin(a) * r * 0.6;
          life = 0.8 + Math.random() * 0.7; size = 0.08 + Math.random() * 0.1; grav = -0.4; kind = 0;
        } else if (sp.kind === 'smoke') {
          vx = (Math.random() - 0.5) * 1.2; vy = -0.6 - Math.random() * 1.2; vz = (Math.random() - 0.5) * 1.2;
          life = 0.9 + Math.random() * 0.7; size = 0.18 + Math.random() * 0.14; grav = -0.4; kind = 1;
          col = sp.color ?? SMOKE[Math.floor(Math.random() * SMOKE.length)];
        } else if (sp.kind === 'spark') {
          const r = Math.random() * sp0 * 2;
          vx = Math.cos(a) * r; vy = 1 + Math.random() * 2.4; vz = Math.sin(a) * r;
          life = 0.8 + Math.random() * 0.6; size = 0.1 + Math.random() * 0.06; grav = 2.2; kind = 2;
          col = sp.color ?? SPARK[Math.floor(Math.random() * SPARK.length)];
        } else if (sp.kind === 'splash') {
          const r = Math.random() * 1.6;
          vx = Math.cos(a) * r; vy = 3 + Math.random() * 3; vz = Math.sin(a) * r;
          life = 0.8 + Math.random() * 0.4; size = 0.1 + Math.random() * 0.07; grav = 11; kind = 3;
        } else {
          const r = Math.random() * 3;
          vx = Math.cos(a) * r; vy = 4 + Math.random() * 4; vz = Math.sin(a) * r * 0.6;
          life = 1.8 + Math.random(); size = 0.16; grav = 6; kind = 2;
          col = CONFETTI[Math.floor(Math.random() * CONFETTI.length)];
        }
        d.pos.set([sp.pos[0] + (Math.random() - 0.5) * sp0 * 0.5, sp.pos[1], sp.pos[2] + (Math.random() - 0.5) * sp0 * 0.5], i * 3);
        d.vel.set([vx, vy, vz], i * 3);
        d.max[i] = d.life[i] = life; d.size[i] = size; d.grav[i] = grav; d.kind[i] = kind;
        mesh.setColorAt(i, d.color.set(col));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < MAX; i++) {
      let s = 0;
      if (d.life[i] > 0) {
        d.life[i] -= dt;
        d.vel[i * 3 + 1] -= d.grav[i] * dt;
        d.pos[i * 3] += d.vel[i * 3] * dt;
        d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt;
        d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
        const f = Math.max(0, d.life[i] / d.max[i]);
        s = d.kind[i] === 1 ? d.size[i] * (1.6 - f * 0.9) * Math.min(1, f * 3) : d.size[i] * Math.min(1, f * 2.5);
      }
      d.dummy.position.set(d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2]);
      d.dummy.scale.setScalar(s);
      d.dummy.rotation.set(d.life[i] * 5, d.life[i] * 4, 0);
      d.dummy.updateMatrix();
      mesh.setMatrixAt(i, d.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[GEO, undefined, MAX]} frustumCulled={false}>
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
}
