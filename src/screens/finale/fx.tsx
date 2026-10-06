import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sfx } from '../../audio/engine';
import { useFinale } from './state';

type V3 = [number, number, number];

// ---- smoke wisps from blown-out candles -----------------------------------------------------------
const SMOKE_MAX = 64;
const smokeQueue: V3[] = [];
export function emitSmoke(p: V3): void {
  if (smokeQueue.length < 40) smokeQueue.push(p);
}

const SPHERE = new THREE.IcosahedronGeometry(1, 1);

/** Instanced grey puffs that drift up, swell and vanish. No per-frame allocation. */
export function Smoke() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(
    () => ({ pos: new Float32Array(SMOKE_MAX * 3), vx: new Float32Array(SMOKE_MAX), vz: new Float32Array(SMOKE_MAX), life: new Float32Array(SMOKE_MAX), next: 0, dummy: new THREE.Object3D() }),
    [],
  );
  useFrame((_, dtRaw) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(dtRaw, 0.05);
    while (smokeQueue.length) {
      const p = smokeQueue.shift()!;
      for (let k = 0; k < 4; k++) {
        const i = d.next;
        d.next = (d.next + 1) % SMOKE_MAX;
        d.pos[i * 3] = p[0] + (Math.random() - 0.5) * 0.08;
        d.pos[i * 3 + 1] = p[1] + k * 0.12;
        d.pos[i * 3 + 2] = p[2] + (Math.random() - 0.5) * 0.08;
        d.vx[i] = (Math.random() - 0.3) * 0.5;
        d.vz[i] = (Math.random() - 0.5) * 0.3;
        d.life[i] = 1.3 + Math.random() * 0.6 - k * 0.1;
      }
    }
    for (let i = 0; i < SMOKE_MAX; i++) {
      const alive = d.life[i] > 0;
      if (alive) {
        d.life[i] -= dt;
        d.pos[i * 3] += d.vx[i] * dt + Math.sin(d.life[i] * 6 + i) * 0.003;
        d.pos[i * 3 + 1] += 0.9 * dt;
        d.pos[i * 3 + 2] += d.vz[i] * dt;
      }
      const t = alive ? Math.max(0, d.life[i]) / 1.5 : 0;
      d.dummy.position.set(d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2]);
      d.dummy.scale.setScalar(alive ? (0.05 + (1 - t) * 0.13) * Math.min(1, t * 3) : 0);
      d.dummy.updateMatrix();
      mesh.setMatrixAt(i, d.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[SPHERE, undefined, SMOKE_MAX]} frustumCulled={false}>
      <meshBasicMaterial color="#E8EAF2" transparent opacity={0.75} depthWrite={false} />
    </instancedMesh>
  );
}

// ---- fireworks ------------------------------------------------------------------------------------
const PER_BURST = 64;
const BURSTS = 6;
const FW_MAX = PER_BURST * BURSTS * 2;
/** Seconds into each cycle at which each burst goes off; then the cycle repeats. */
const BURST_TIMES = [0.3, 1.0, 1.7, 2.5, 3.4, 4.3];
const CYCLE = 5.6;
const SPOTS: V3[] = [
  [-7, 9.2, -9], [7, 9.6, -9], [-4, 10.6, -10], [4.5, 10.8, -10], [-9.5, 8.2, -8], [9.5, 8.4, -8],
];
const PALETTES: string[][] = [
  ['#FFD60A', '#FFF4B0'], ['#FF5CA8', '#FFC0DE'], ['#4CC9FF', '#C8F0FF'], ['#7AE582', '#D6FFD9'], ['#FF8C42', '#FFD8B0'], ['#B388FF', '#E4D6FF'],
];
const FW_GEO = new THREE.IcosahedronGeometry(1, 0);

/** Instanced starburst fireworks over the forest while `phase === 'party'`. Loops until the song ends. */
export function Fireworks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(
    () => ({
      pos: new Float32Array(FW_MAX * 3), vel: new Float32Array(FW_MAX * 3), life: new Float32Array(FW_MAX), max: new Float32Array(FW_MAX), size: new Float32Array(FW_MAX),
      next: 0, fired: 0, dummy: new THREE.Object3D(), color: new THREE.Color(), colored: false,
    }),
    [],
  );
  useFrame((_, dtRaw) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(dtRaw, 0.05);
    const st = useFinale.getState();
    if (st.phase === 'party' && st.partyAt > 0) {
      const elapsed = (performance.now() - st.partyAt) / 1000;
      // fire any bursts whose time has come (virtual burst index n)
      for (;;) {
        const n = d.fired;
        const t = Math.floor(n / BURSTS) * CYCLE + BURST_TIMES[n % BURSTS];
        if (t > elapsed) break;
        d.fired++;
        const spot = SPOTS[(n * 5 + Math.floor(n / BURSTS)) % SPOTS.length];
        const pal = PALETTES[n % PALETTES.length];
        for (let k = 0; k < PER_BURST; k++) {
          const i = d.next;
          d.next = (d.next + 1) % FW_MAX;
          // fibonacci sphere directions
          const y = 1 - (k / (PER_BURST - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const th = k * 2.399963;
          const sp = 4.6 + (k % 3) * 0.8;
          d.pos[i * 3] = spot[0];
          d.pos[i * 3 + 1] = spot[1];
          d.pos[i * 3 + 2] = spot[2];
          d.vel[i * 3] = Math.cos(th) * r * sp;
          d.vel[i * 3 + 1] = y * sp;
          d.vel[i * 3 + 2] = Math.sin(th) * r * sp * 0.5;
          d.max[i] = d.life[i] = 1.5 + (k % 4) * 0.12;
          d.size[i] = k % 5 === 0 ? 0.3 : 0.22;
          mesh.setColorAt(i, d.color.set(pal[k % 2]));
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        sfx('sparkle');
      }
    } else if (d.fired !== 0) {
      d.fired = 0;
    }
    const drag = Math.pow(0.12, dt);
    for (let i = 0; i < FW_MAX; i++) {
      const alive = d.life[i] > 0;
      if (alive) {
        d.life[i] -= dt;
        d.vel[i * 3] *= drag;
        d.vel[i * 3 + 1] = d.vel[i * 3 + 1] * drag - 2.2 * dt;
        d.vel[i * 3 + 2] *= drag;
        d.pos[i * 3] += d.vel[i * 3] * dt;
        d.pos[i * 3 + 1] += d.vel[i * 3 + 1] * dt;
        d.pos[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
      }
      const f = alive ? d.life[i] / d.max[i] : 0;
      const twinkle = 0.75 + 0.25 * Math.sin(d.life[i] * 40 + i);
      d.dummy.position.set(d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2]);
      d.dummy.scale.setScalar(alive ? d.size[i] * Math.min(1, f * 2.2) * twinkle : 0);
      d.dummy.updateMatrix();
      mesh.setMatrixAt(i, d.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[FW_GEO, undefined, FW_MAX]} frustumCulled={false}>
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
}
