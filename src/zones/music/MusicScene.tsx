import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Avatar } from '../../three/Avatar';
import { useProgress } from '../../state/progress';
import { B, Cy, Particles, mat, popScale } from '../woods/fx';
import { INSTRUMENT_POS, energy, setInstrument, useMusic } from './musicState';
import { BAND, BPM, INSTRUMENT_IDS, RAINBOW, type InstrumentId } from './songs';

type V3 = [number, number, number];

const beatPhase = (t: number): number => (t * BPM) / 60;
/** 1 right on the beat, decaying to 0 before the next. */
const pulseOf = (t: number): number => {
  const f = beatPhase(t) % 1;
  return Math.max(0, 1 - f * 2.4);
};

const STAGE_RED = '#C1272D';
const STAGE_TOP = '#E34B53';
const GOLD = '#FFD60A';
const LIGHT_COLORS = ['#FF5CA8', '#FFD60A', '#4CB7FF', '#7AE582', '#FF8C42', '#B28DFF'];

function starShape(): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}
const STAR_GEO = new THREE.ExtrudeGeometry(starShape(), { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 });
STAR_GEO.translate(0, 0, -0.12);

// ---- stage -------------------------------------------------------------------------------------
function Studs() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: V3[] = [];
    for (let x = -6.6; x <= 6.61; x += 0.55) for (const z of [3.05, 2.5]) out.push([x, 0.86, z]);
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    spots.forEach((p, i) => {
      d.position.set(...p);
      d.scale.set(0.15, 0.1, 0.15);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return <instancedMesh ref={ref} args={[undefined, mat('#F0616A'), spots.length]} frustumCulled={false}><cylinderGeometry args={[1, 1, 1, 10]} /></instancedMesh>;
}

function StageLights() {
  const bulbs = useRef<(THREE.Mesh | null)[]>([]);
  const stars = useRef<(THREE.Mesh | null)[]>([]);
  const bulbPos = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI * (i / 20);
    return [Math.cos(a) * 4.4, 2.1 + Math.sin(a) * 4.4, -2.55] as V3;
  }), []);
  const starPos: V3[] = useMemo(() => [-3.3, -2, -0.7, 0.7, 2, 3.3].map((x) => [x, 2.1 + Math.sqrt(Math.max(0, 3.5 * 3.5 - x * x)) * 0.95 - 0.55, -2.4]), []);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const hot = Math.max(...INSTRUMENT_IDS.map((i) => energy[i]));
    const beat = Math.floor(beatPhase(t));
    bulbs.current.forEach((m, i) => {
      if (!m) return;
      const on = (beat + i) % 3 !== 0;
      const mm = m.material as THREE.MeshStandardMaterial;
      mm.emissive.set(LIGHT_COLORS[(beat + i) % LIGHT_COLORS.length]);
      mm.emissiveIntensity = on ? 1.2 + pulseOf(t) * 1.4 + hot : 0.15;
      m.scale.setScalar(on ? 0.2 + pulseOf(t) * 0.07 + hot * 0.06 : 0.14);
    });
    stars.current.forEach((m, i) => {
      if (!m) return;
      const on = (beat + i) % 2 === 0;
      const mm = m.material as THREE.MeshStandardMaterial;
      mm.emissive.copy(tmp.set(LIGHT_COLORS[(beat * 2 + i) % LIGHT_COLORS.length]));
      mm.emissiveIntensity = on ? 1.4 + pulseOf(t) : 0.35;
      m.rotation.z = Math.sin(t * 1.5 + i) * 0.15;
      m.scale.setScalar(0.5 + (on ? pulseOf(t) * 0.12 + hot * 0.08 : 0));
    });
  });
  return (
    <>
      {bulbPos.map((p, i) => (
        <mesh key={i} ref={(m) => { bulbs.current[i] = m; }} position={p}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#FFFFFF" emissive="#FFD60A" emissiveIntensity={1} />
        </mesh>
      ))}
      {starPos.map((p, i) => (
        <mesh key={i} ref={(m) => { stars.current[i] = m; }} position={p} geometry={STAR_GEO}>
          <meshStandardMaterial color="#FFE65C" emissive="#FFD60A" emissiveIntensity={1} />
        </mesh>
      ))}
    </>
  );
}

function Speaker({ x }: { x: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const hot = Math.max(...INSTRUMENT_IDS.map((i) => energy[i]));
    if (g.current) g.current.scale.setScalar(1 + (pulseOf(t) * 0.025 + hot * 0.035));
  });
  return (
    <group position={[x, 0.8, -1.2]}>
      <group ref={g} position={[0, 1.2, 0]}>
        <B s={[1.5, 2.4, 1.1]} c="#2B2A3D" />
        <Cy p={[0, 0.5, 0.58]} s={[0.4, 0.06, 0.4]} c="#6C6C8A" r={[Math.PI / 2, 0, 0]} />
        <Cy p={[0, 0.5, 0.62]} s={[0.15, 0.06, 0.15]} c="#1A1A28" r={[Math.PI / 2, 0, 0]} />
        <Cy p={[0, -0.45, 0.58]} s={[0.55, 0.06, 0.55]} c="#6C6C8A" r={[Math.PI / 2, 0, 0]} />
        <Cy p={[0, -0.45, 0.62]} s={[0.22, 0.06, 0.22]} c="#1A1A28" r={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

function Stage() {
  return (
    <group>
      {/* platform */}
      <B p={[0, 0.2, 0.3]} s={[15.4, 0.8, 6.6]} c={STAGE_RED} />
      <B p={[0, 0.62, 0.3]} s={[15.6, 0.08, 6.8]} c={STAGE_TOP} />
      <Studs />
      {/* back wall: red pillars and a lintel around a starry blue backdrop */}
      <B p={[0, 3.6, -3.0]} s={[10.4, 6.4, 0.2]} c="#2A2F7A" />
      <B p={[-5.6, 3.7, -2.9]} s={[1.5, 6.6, 0.9]} c={STAGE_RED} />
      <B p={[5.6, 3.7, -2.9]} s={[1.5, 6.6, 0.9]} c={STAGE_RED} />
      {[-5.6, 5.6].flatMap((x) => [0.9, 1.9, 2.9, 3.9, 4.9, 5.9].map((y) => <B key={`${x}-${y}`} p={[x, y + 0.2, -2.42]} s={[1.3, 0.04, 0.02]} c="#8E1B22" />))}
      <B p={[0, 7.1, -2.9]} s={[12.6, 0.8, 0.9]} c={STAGE_RED} />
      {/* arch */}
      <mesh position={[0, 2.1, -2.7]}>
        <torusGeometry args={[4.4, 0.32, 8, 28, Math.PI]} />
        <meshStandardMaterial color={GOLD} flatShading roughness={0.5} />
      </mesh>
      <StageLights />
      <Speaker x={-6.0} />
      <Speaker x={6.0} />
    </group>
  );
}

// ---- instruments -------------------------------------------------------------------------------
function Glow({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const mm = m.material as THREE.MeshBasicMaterial;
    mm.opacity = 0.35 + pulseOf(clock.elapsedTime) * 0.35;
    m.scale.setScalar(1 + pulseOf(clock.elapsedTime) * 0.08);
  });
  return (
    <mesh ref={ref} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.75, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

function Prop({ id, children }: { id: InstrumentId; children: ReactNode }) {
  const active = useMusic((s) => s.instrument === id);
  const g = useRef<THREE.Group>(null);
  const k = useRef(1);
  useFrame((_, dt) => {
    const e = energy[id];
    energy[id] = Math.max(0, e - dt * 3.2);
    const target = (active ? 1.06 : 0.96) + e * 0.12;
    k.current += (target - k.current) * Math.min(1, dt * 14);
    if (g.current) {
      g.current.scale.setScalar(k.current);
      g.current.rotation.z = Math.sin(performance.now() / 90) * e * 0.04;
    }
  });
  const pos = INSTRUMENT_POS[id];
  return (
    <group position={[pos[0], 0.66, pos[2]]} onPointerDown={(e) => { e.stopPropagation(); if (useMusic.getState().instrument !== id) setInstrument(id); }}>
      {active && <Glow color={id === 'drums' ? '#FF8FA0' : id === 'keyboard' ? '#8FD0FF' : id === 'guitar' ? '#FFE680' : '#9BF0B0'} />}
      <group ref={g}>{children}</group>
    </group>
  );
}

function DrumKit() {
  return (
    <group>
      <Cy p={[0, 0.65, -0.55]} s={[0.78, 0.8, 0.78]} c="#FFFFFF" r={[Math.PI / 2, 0, 0]} low />
      <Cy p={[0, 0.65, -0.14]} s={[0.66, 0.06, 0.66]} c="#E63946" r={[Math.PI / 2, 0, 0]} low />
      <Cy p={[0.05, 0.98, 0.35]} s={[0.55, 0.38, 0.55]} c="#E63946" />
      <Cy p={[0.05, 1.19, 0.35]} s={[0.56, 0.03, 0.56]} c="#F3F3F3" />
      <Cy p={[-1.05, 0.5, 0.05]} s={[0.04, 1.0, 0.04]} c="#6C6C8A" />
      <Cy p={[-1.05, 1.02, 0.05]} s={[0.46, 0.04, 0.46]} c={GOLD} />
      <Cy p={[1.1, 0.7, 0.0]} s={[0.04, 1.4, 0.04]} c="#6C6C8A" />
      <Cy p={[1.1, 1.42, 0.0]} s={[0.62, 0.04, 0.62]} c={GOLD} r={[0.15, 0, 0.1]} />
      <Cy p={[-0.65, 0.8, 0.45]} s={[0.35, 0.3, 0.35]} c="#3A86FF" low />
      <Cy p={[0.75, 0.75, 0.48]} s={[0.38, 0.35, 0.38]} c="#3A86FF" low />
    </group>
  );
}

function KeyboardProp() {
  const keys = RAINBOW.map((c, i) => <B key={i} p={[-1.12 + i * 0.32, 0.62, 0.16]} s={[0.28, 0.12, 0.6]} c={c} />);
  return (
    <group>
      <B p={[-0.95, 0.3, 0]} s={[0.12, 0.6, 0.12]} c="#6C6C8A" />
      <B p={[0.95, 0.3, 0]} s={[0.12, 0.6, 0.12]} c="#6C6C8A" />
      <B p={[0, 0.5, 0]} s={[2.9, 0.22, 1.0]} c="#2B2A3D" />
      <B p={[0, 0.82, -0.32]} s={[2.9, 0.36, 0.4]} c="#3A86FF" />
      {keys}
      {[0, 1, 3, 4, 5].map((i) => <B key={i} p={[-0.96 + i * 0.32, 0.72, -0.02]} s={[0.17, 0.12, 0.34]} c="#1A1A28" />)}
    </group>
  );
}

function GuitarProp() {
  return (
    <group rotation={[0, -0.15, -0.12]} scale={0.72}>
      <B p={[-0.5, 0.2, 0]} s={[0.1, 0.4, 0.5]} c="#6C6C8A" />
      <B p={[0.5, 0.2, 0]} s={[0.1, 0.4, 0.5]} c="#6C6C8A" />
      <Cy p={[0, 1.05, 0]} s={[0.62, 0.22, 0.62]} c="#FF8C42" r={[Math.PI / 2, 0, 0]} />
      <Cy p={[0, 1.75, 0]} s={[0.46, 0.22, 0.46]} c="#FF8C42" r={[Math.PI / 2, 0, 0]} />
      <Cy p={[0, 1.4, 0.2]} s={[0.2, 0.03, 0.2]} c="#2B1B12" r={[Math.PI / 2, 0, 0]} />
      <Cy p={[0, 1.4, 0.02]} s={[0.3, 0.02, 0.3]} c="#FF8C42" r={[Math.PI / 2, 0, 0]} />
      <B p={[0, 2.8, 0]} s={[0.17, 1.5, 0.16]} c="#6B3A1E" />
      <B p={[0, 3.62, 0]} s={[0.3, 0.32, 0.14]} c="#2B1B12" />
      {[-0.1, -0.05, 0, 0.05, 0.1].map((x) => <B key={x} p={[x, 2.4, 0.1]} s={[0.012, 2.1, 0.012]} c="#EEEEEE" />)}
    </group>
  );
}

function XylophoneProp() {
  const bars = RAINBOW.map((c, i) => <B key={i} p={[-1.12 + i * 0.32, 0.9 + i * 0.015, 0]} s={[0.28, 0.1, 0.9 - i * 0.07]} c={c} />);
  return (
    <group>
      <B p={[0, 0.78, 0.38]} s={[2.9, 0.08, 0.1]} c="#8B5A2B" />
      <B p={[0, 0.78, -0.38]} s={[2.9, 0.08, 0.1]} c="#8B5A2B" />
      <B p={[-1.3, 0.38, 0]} s={[0.12, 0.76, 0.9]} c="#8B5A2B" />
      <B p={[1.3, 0.38, 0]} s={[0.12, 0.76, 0.9]} c="#8B5A2B" />
      {bars}
      <B p={[1.55, 1.0, 0.7]} s={[0.05, 0.6, 0.05]} c="#F3F3F3" r={[0, 0, 0.5]} />
      <Cy p={[1.74, 1.28, 0.7]} s={[0.1, 0.1, 0.1]} c="#FF5CA8" />
    </group>
  );
}

// ---- the band ----------------------------------------------------------------------------------
const MEMBER_POS: Record<string, { p: V3; s: number; rot: number }> = {
  darian: { p: [-4.4, 0.66, -0.9], s: 0.72, rot: 0.15 },
  julian: { p: [-1.5, 0.66, -0.9], s: 0.72, rot: 0.05 },
  mom: { p: [2.7, 0.66, -0.7], s: 0.72, rot: -0.15 },
  rudolph: { p: [3.6, 0.66, 0.3], s: 0.58, rot: -0.2 },
  jinglebells: { p: [5.3, 0.66, 0.3], s: 0.58, rot: -0.35 },
};
const MEMBER_INST: Record<string, InstrumentId> = { darian: 'drums', julian: 'keyboard', mom: 'guitar', rudolph: 'xylophone', jinglebells: 'xylophone' };

function Member({ id, index, bornAt }: { id: 'darian' | 'julian' | 'mom' | 'rudolph' | 'jinglebells'; index: number; bornAt: number }) {
  const g = useRef<THREE.Group>(null);
  const m = MEMBER_POS[id];
  const inst = MEMBER_INST[id];
  const pet = id === 'rudolph' || id === 'jinglebells';
  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    const t = clock.elapsedTime;
    const age = t - bornAt;
    const s = bornAt < 0 ? 1 : popScale(age, 0, 0.5);
    grp.scale.setScalar(s);
    const bob = Math.abs(Math.sin(beatPhase(t) * Math.PI + index * 0.6)) * (pet ? 0.2 : 0.1) + energy[inst] * 0.25;
    grp.position.y = m.p[1] + bob;
    grp.rotation.z = Math.sin(beatPhase(t) * Math.PI + index) * 0.05;
  });
  return (
    <group ref={g} position={m.p}>
      <Avatar id={id} scale={m.s} rotationY={m.rot} interactive={false} expression="happy" wave={id === 'mom'} phase={index} detail="high" />
    </group>
  );
}

function Band() {
  const played = useProgress((s) => s.instrumentsPlayed);
  const born = useRef(new Map<string, number>());
  const clock = useThree((s) => s.clock);
  const first = useRef(true);
  const [, force] = useState(0);
  useEffect(() => {
    // members already in the band when the zone opens appear at once; new ones pop in
    for (const inst of INSTRUMENT_IDS) {
      if (!played.includes(inst)) continue;
      for (const id of BAND[inst]) {
        if (!born.current.has(id)) born.current.set(id, first.current ? -1 : clock.elapsedTime);
      }
    }
    first.current = false;
    force((n) => n + 1);
  }, [played, clock]);
  const members = INSTRUMENT_IDS.flatMap((i) => BAND[i]);
  return (
    <>
      {members.map((id, i) => (born.current.has(id) ? <Member key={id} id={id} index={i + 1} bornAt={born.current.get(id)!} /> : null))}
    </>
  );
}

function Dad() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const hot = Math.max(...INSTRUMENT_IDS.map((i) => energy[i]));
    if (!g.current) return;
    g.current.position.y = 0.66 + Math.abs(Math.sin(beatPhase(t) * Math.PI)) * 0.08 + hot * 0.12;
    g.current.rotation.z = Math.sin(beatPhase(t) * Math.PI * 0.5) * 0.04;
  });
  return (
    <group ref={g} position={[0, 0.66, -1.5]}>
      <Avatar id="dad" scale={1.0} interactive={false} expression="happy" />
    </group>
  );
}

export function MusicScene() {
  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[4, 10, 9]} intensity={1.7} />
      <hemisphereLight args={['#BFA6FF', '#5A2A55', 0.5]} />
      <Stage />
      <Prop id="drums"><DrumKit /></Prop>
      <Prop id="keyboard"><KeyboardProp /></Prop>
      <Prop id="guitar"><GuitarProp /></Prop>
      <Prop id="xylophone"><XylophoneProp /></Prop>
      <Dad />
      <Band />
      <Particles />
    </>
  );
}

