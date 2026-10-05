import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ZoneId } from '../types';
import { Builder, rng, type V3 } from './prims';
import { StaticBatch } from './Brick';
import { BRICK_COLORS, CRANE_PIVOT, PLOT_COLORS, candlePos } from './scenery';
import { layout, zoneWorld } from './layout';

function noRaycast(): void {
  /* animated decoration is never a tap target */
}

/* ------------------------------------------------------------------ flags --------- */

const flagGeo = new THREE.BoxGeometry(0.55, 0.3, 0.03);
flagGeo.translate(0.275, 0, 0);

/** A flag waving from a pole top at a zone-local position. */
export function Flag({ zone, local, color, scale = 1, phase = 0 }: { zone: ZoneId; local: V3; color: string; scale?: number; phase?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => zoneWorld(zone, local), [zone, local]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), [color]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime * 4.5 + phase;
    m.rotation.y = Math.sin(t) * 0.45 + 0.2;
    m.rotation.z = Math.sin(t * 0.7) * 0.12;
    m.scale.x = (0.9 + Math.sin(t * 1.3) * 0.1) * scale;
    m.scale.y = scale;
  });
  return <mesh ref={ref} geometry={flagGeo} material={mat} position={pos} raycast={noRaycast} />;
}

/* ---------------------------------------------------------------- bubbles --------- */

const bubbleGeo = new THREE.SphereGeometry(1, 8, 6);

/** Bubbles rising out of a flask (one instanced mesh). */
export function Bubbles({ zone, local, height = 1.2, color = '#9CFFB4', count = 10, radius = 0.25 }: { zone: ZoneId; local: V3; height?: number; color?: string; count?: number; radius?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(() => zoneWorld(zone, local), [zone, local]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, toneMapped: false }), [color]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ph = (t * 0.45 + i / count + (i % 3) * 0.07) % 1;
      const wob = Math.sin(ph * 11 + i * 1.7) * radius;
      dummy.position.set(base[0] + wob, base[1] + ph * height, base[2] + Math.cos(ph * 9 + i) * radius * 0.6);
      dummy.scale.setScalar((0.04 + 0.05 * ((i * 7) % 5) / 4) * (1 - ph * 0.35) * (ph > 0.92 ? (1 - ph) * 12 : 1));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[bubbleGeo, mat, count]} frustumCulled={false} raycast={noRaycast} />;
}

/* ------------------------------------------------------------- tennis ball -------- */

const ballGeo = new THREE.SphereGeometry(0.11, 12, 8);
const ballMat = new THREE.MeshStandardMaterial({ color: '#E9FF3A', roughness: 0.6, emissive: '#6B7A00', emissiveIntensity: 0.3 });

/** A tennis ball that rallies back and forth over the net, bouncing once on each side. */
export function TennisBall() {
  const ref = useRef<THREE.Mesh>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const l = layout.tennis;
  const c = Math.cos(l.ry), s = Math.sin(l.ry);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const lx = Math.sin(t * 1.1) * 1.55;
    const lz = Math.sin(t * 0.55) * 0.35;
    const bounce = Math.abs(Math.sin(t * 2.2));
    const ly = 0.2 + bounce * 0.75;
    m.position.set(l.pos[0] + c * lx + s * lz, l.pos[1] + ly, l.pos[2] - s * lx + c * lz);
    m.rotation.x = t * 6;
    const sh = shadow.current;
    if (sh) {
      sh.position.set(m.position.x, l.pos[1] + 0.15, m.position.z);
      const k = 1 - bounce * 0.5;
      sh.scale.set(k, 1, k);
    }
  });
  return (
    <>
      <mesh ref={ref} geometry={ballGeo} material={ballMat} raycast={noRaycast} />
      <mesh ref={shadow} geometry={shadowDisc} material={shadowDiscMat} raycast={noRaycast} />
    </>
  );
}
const shadowDisc = new THREE.CircleGeometry(0.13, 10);
shadowDisc.rotateX(-Math.PI / 2);
const shadowDiscMat = new THREE.MeshBasicMaterial({ color: '#0B3D1E', transparent: true, opacity: 0.35, depthWrite: false });

/* ---------------------------------------------------------- stage lights ---------- */

const bulbGeo = new THREE.SphereGeometry(1, 10, 8);
const bulbMat = new THREE.MeshBasicMaterial({ toneMapped: false });
const LIGHT_COLORS = ['#FFD60A', '#FF5CA8', '#4FA3FF', '#FFFFFF'].map((c) => new THREE.Color(c));
const OFF = new THREE.Color('#5A3A2A');

/** Star/bulb lights on the music stage arch that blink in a chase pattern. */
export function StageLights() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const list: V3[] = [];
    for (let i = 0; i < 8; i++) list.push(zoneWorld('music', [-1.75 + i * 0.5, 3.3, -0.7]));
    for (let i = 0; i < 5; i++) list.push(zoneWorld('music', [-1.4 + i * 0.7, 0.45, 1.25]));
    for (const [x, y] of [[-0.8, 1.7], [0.9, 2.0], [0.0, 1.2]] as const) list.push(zoneWorld('music', [x, y, -1.0]));
    return list;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    spots.forEach((_, i) => m.setColorAt(i, OFF));
    m.computeBoundingSphere();
  }, [spots]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < spots.length; i++) {
      const on = ((Math.floor(t * 3) + i) % 3) !== 0;
      const col = LIGHT_COLORS[(Math.floor(t * 1.5) + i) % LIGHT_COLORS.length];
      m.setColorAt(i, on ? col : OFF);
      dummy.position.set(spots[i][0], spots[i][1], spots[i][2]);
      dummy.scale.setScalar(on ? 0.1 + Math.sin(t * 8 + i) * 0.015 : 0.07);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[bulbGeo, bulbMat, spots.length]} frustumCulled={false} raycast={noRaycast} />;
}

/* ---------------------------------------------------------------- crane arm ------- */

/** The swinging crane arm over an unbuilt plot, carrying a brick in the zone colour. */
export function CraneArm({ zone }: { zone: ZoneId }) {
  const root = useRef<THREE.Group>(null);
  const hang = useRef<THREE.Group>(null);
  const pos = useMemo(() => zoneWorld(zone, CRANE_PIVOT), [zone]);
  const prims = useMemo(() => {
    const b = new Builder();
    b.box([0.8, 0, 0], [2.6, 0.16, 0.22], '#FFD60A');
    b.box([-1.0, 0, 0], [0.9, 0.46, 0.46], '#2B2B33');
    b.box([-0.2, 0.2, 0], [0.5, 0.2, 0.3], '#FFD60A');
    return b.prims;
  }, []);
  const hung = useMemo(() => {
    const b = new Builder();
    b.box([0, -0.55, 0], [0.04, 1.1, 0.04], '#2B2B33');
    b.box([0, -1.1, 0], [0.12, 0.12, 0.12], '#E63946');
    b.box([0, -1.35, 0], [0.7, 0.34, 0.5], PLOT_COLORS[zone], { studs: 0.25 });
    return b.prims;
  }, [zone]);
  const l = layout[zone];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = root.current;
    if (!g) return;
    g.rotation.y = l.ry + 0.4 + Math.sin(t * 0.45 + l.ry * 3) * 0.8;
    const h = hang.current;
    if (h) {
      h.position.x = 1.9 - Math.sin(t * 0.7) * 0.4;
      h.position.y = Math.sin(t * 1.3) * 0.12;
      h.rotation.z = Math.sin(t * 1.5) * 0.06;
    }
  });
  return (
    <group ref={root} position={pos}>
      <StaticBatch prims={prims} />
      <group ref={hang} position={[1.9, 0, 0]}>
        <StaticBatch prims={hung} />
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- butterflies ------ */

const wingGeo = new THREE.PlaneGeometry(0.2, 0.17);
wingGeo.rotateX(-Math.PI / 2);
wingGeo.translate(0.1, 0, 0);
const wingMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
const FLY_COLORS = ['#FF8C42', '#FF5CA8', '#7FB2FF'].map((c) => new THREE.Color(c));

/** Three tiny butterflies wandering over the island (two flapping wing quads each). */
export function Butterflies() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < 6; i++) m.setColorAt(i, FLY_COLORS[(i >> 1) % 3]);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let k = 0; k < 3; k++) {
      const a = t * (0.22 + k * 0.04) + k * 2.1;
      const x = Math.cos(a) * (3.4 + k * 0.7) + Math.sin(t * 0.7 + k) * 0.5;
      const z = Math.sin(a * 1.13) * (3.0 + k * 0.6);
      const y = 1.1 + Math.sin(t * 1.4 + k * 2) * 0.35 + k * 0.15;
      const dx = -Math.sin(a) * (3.4 + k * 0.7);
      const dz = Math.cos(a * 1.13) * 1.13 * (3.0 + k * 0.6);
      const heading = Math.atan2(dx, dz);
      const flap = 0.15 + Math.abs(Math.sin(t * 16 + k * 3)) * 0.95;
      for (let w = 0; w < 2; w++) {
        const sgn = w === 0 ? 1 : -1;
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, heading + Math.PI / 2, sgn * flap);
        dummy.scale.set(sgn, 1, 1);
        dummy.updateMatrix();
        m.setMatrixAt(k * 2 + w, dummy.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[wingGeo, wingMat, 6]} frustumCulled={false} raycast={noRaycast} />;
}

/* ------------------------------------------------------------- candle flames ------ */

const flameGeo = new THREE.SphereGeometry(1, 8, 6);
const flameMat = new THREE.MeshBasicMaterial({ color: '#FFC83A', toneMapped: false });

/** Flickering flames on the cake candles. */
export function Flames({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spots = useMemo(() => Array.from({ length: count }, (_, i) => candlePos(i, count)), [count]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const f = 1 + Math.sin(t * 13 + i * 2.1) * 0.22 + Math.sin(t * 7.3 + i) * 0.12;
      dummy.position.set(spots[i][0] + Math.sin(t * 9 + i) * 0.01, spots[i][1] + 0.03 * f, spots[i][2]);
      dummy.scale.set(0.055 * (2 - f * 0.6), 0.1 * f, 0.055 * (2 - f * 0.6));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[flameGeo, flameMat, Math.max(1, count)]} frustumCulled={false} raycast={noRaycast} />;
}

/* -------------------------------------------------------- floating bricks --------- */

function FloatGroup({ pos, phase, seed }: { pos: V3; phase: number; seed: number }) {
  const g = useRef<THREE.Group>(null);
  const prims = useMemo(() => {
    const r = rng(seed);
    const b = new Builder();
    const cols = ['#FFFFFF', '#FFF1D6', ...BRICK_COLORS];
    for (let i = 0; i < 4; i++) {
      const w = 0.5 + r() * 0.6;
      b.box([(r() - 0.5) * 1.6, (r() - 0.5) * 0.7, (r() - 0.5) * 1.2], [w, 0.32, 0.42 + r() * 0.3], cols[Math.floor(r() * cols.length)], { studs: 0.25 });
    }
    return b.prims;
  }, [seed]);
  useFrame(({ clock }) => {
    const m = g.current;
    if (!m) return;
    const t = clock.elapsedTime + phase;
    m.position.y = pos[1] + Math.sin(t * 0.9) * 0.35;
    m.rotation.y = Math.sin(t * 0.3) * 0.6;
  });
  return (
    <group ref={g} position={pos}>
      <StaticBatch prims={prims} />
    </group>
  );
}

/** Loose bricks drifting off the island and cloud bricks hovering below it. */
export function FloatingBricks() {
  return (
    <>
      <FloatGroup pos={[-9.5, -2.2, 3]} phase={0} seed={3} />
      <FloatGroup pos={[9.0, -3.2, -3.5]} phase={2} seed={4} />
      <FloatGroup pos={[3.5, -5.5, 9.5]} phase={4} seed={5} />
      <FloatGroup pos={[-4.5, -6.5, -9.5]} phase={1} seed={6} />
      <FloatGroup pos={[8.5, 1.6, 8.5]} phase={3} seed={9} />
    </>
  );
}

/* --------------------------------------------------------- birthday confetti ------ */

const confGeo = new THREE.BoxGeometry(1, 0.5, 0.7);
const confMat = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const CONF = 70;

/** Little confetti bricks drifting down around the island (birthday mode). */
export function ConfettiBricks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: CONF }, () => ({ x: (r() - 0.5) * 24, z: (r() - 0.5) * 24, off: r(), sp: 0.04 + r() * 0.05, s: 0.12 + r() * 0.12, spin: 1 + r() * 3 }));
  }, []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color();
    seeds.forEach((_, i) => m.setColorAt(i, c.set(BRICK_COLORS[i % BRICK_COLORS.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [seeds]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < CONF; i++) {
      const s = seeds[i];
      const ph = (t * s.sp + s.off) % 1;
      dummy.position.set(s.x + Math.sin(t * 0.6 + i) * 0.6, 13 - ph * 17, s.z + Math.cos(t * 0.5 + i) * 0.6);
      dummy.rotation.set(t * s.spin, t * s.spin * 0.6, 0);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[confGeo, confMat, CONF]} frustumCulled={false} raycast={noRaycast} />;
}

/* ------------------------------------------------------------------- sun ---------- */

const sunMat = new THREE.MeshBasicMaterial({ color: '#FFE45C', toneMapped: false, fog: false });
const sunGlowMat = new THREE.MeshBasicMaterial({ color: '#FFF3A0', transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false, fog: false });
const sunGeo = new THREE.SphereGeometry(1, 20, 14);

/** A big friendly sun far behind the island. */
export function Sun() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.2) * 0.02);
  });
  return (
    <group ref={ref} position={[-38, 30, -46]}>
      <mesh geometry={sunGeo} material={sunMat} scale={4} raycast={noRaycast} />
      <mesh geometry={sunGeo} material={sunGlowMat} scale={6.4} raycast={noRaycast} />
    </group>
  );
}
