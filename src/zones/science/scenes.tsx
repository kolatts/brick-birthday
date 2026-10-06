import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { B, BOX, CONE4, CYL, Cone, Cy, easeOutBack, mat } from '../woods/fx';
import { emitFx, type V3 } from './fx';
import { BENCH_Y, BubbleStream, Flask, Glass } from './props';
import { nowS, rocketLanded, useLab } from './store';
import { CABBAGE_COLOR, CRYSTAL_TAPS, POTION_RESULT, floatItem, rocketHeight, type FloatId } from './logic';

export const BT = BENCH_Y + 0.11;
const SPHERE = new THREE.IcosahedronGeometry(1, 1);
const sph = (c: string, opts: { emissive?: string; emissiveIntensity?: number } = {}) => mat(c, opts);
const pop = (age: number, dur = 0.5): number => Math.max(0.0001, easeOutBack(age / dur));

function Ball({ p, s, c, emissive, e = 0 }: { p: V3; s: V3 | number; c: string; emissive?: string; e?: number }) {
  return <mesh geometry={SPHERE} material={sph(c, emissive ? { emissive, emissiveIntensity: e } : {})} position={p} scale={s} />;
}

// =================================================================================================
// Menu: a lab bench full of bubbling flasks
// =================================================================================================
export function MenuScene() {
  return (
    <group>
      <Flask p={[-1.2, BT, 0.1]} color="#FF6FB5" scale={1.1} bubbling />
      <Flask p={[0.5, BT, 0.3]} color="#8B4FD0" scale={1.5} bubbling glow={0.25} />
      <Flask p={[2.2, BT, 0.1]} color="#46D07A" scale={1.1} bubbling />
      <Ball p={[3.4, BT + 0.25, 0.6]} s={[0.4, 0.28, 0.4]} c="#FFE23F" />
    </group>
  );
}

// =================================================================================================
// 1. Color potion
// =================================================================================================
const FX = 0.6;
export function PotionScene() {
  const potion = useLab((s) => s.potion);
  const potionAt = useLab((s) => s.potionAt);
  const stirred = useLab((s) => s.stirred);
  const wand = useRef<THREE.Group>(null);
  const ang = useRef(0);
  const sinceFx = useRef(0);
  const color = potion ? POTION_RESULT[potion].color : CABBAGE_COLOR;
  const S = 1.6;
  useFrame((_, dt) => {
    const s = useLab.getState();
    const stirring = s.stirring || nowS() < s.stirUntil;
    ang.current += dt * (stirring ? 11 : 1.4);
    if (wand.current) {
      wand.current.rotation.y = ang.current;
      wand.current.position.y = BT + 1.28 * S + Math.sin(ang.current * 0.5) * (stirring ? 0.05 : 0.02);
    }
    if (stirring) {
      sinceFx.current += dt;
      if (sinceFx.current > 0.12) {
        sinceFx.current = 0;
        emitFx('bubble', [FX, BT + 1.0 * S, 0], 1, '#E9D8FF', 0.25);
      }
    }
  });
  useEffect(() => {
    if (!potion) return;
    emitFx('bubble', [FX, BT + 1.0 * S, 0], 26, '#FFFFFF', 0.5);
    emitFx('spark', [FX, BT + 1.9 * S, 0], 18, undefined, 0.8);
  }, [potion, potionAt]);
  return (
    <group>
      <Flask p={[FX, BT, 0.2]} color={color} scale={S} level={0.62} bubbling={!!potion} glow={potion ? 0.35 : 0.05} />
      <group ref={wand} position={[FX, BT + 1.28 * S, 0.2]}>
        <group rotation={[0, 0, 0.27]}>
          <Cy p={[0, 0.1, 0]} s={[0.06, 2.5, 0.06]} c="#FFE066" />
          <Ball p={[0, 1.5, 0]} s={0.26} c="#FFD60A" emissive="#FFD60A" e={0.9} />
          <B p={[0, 1.5, 0]} s={[0.2, 0.2, 0.2]} c="#FF8FD0" r={[0.6, 0.6, 0]} />
        </group>
      </group>
      <Lemon p={[2.7, BT, 0.7]} pulse={stirred && !potion} />
      <BakingSoda p={[3.9, BT, 0.5]} pulse={stirred && !potion} />
    </group>
  );
}

function usePulse(pulse: boolean) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.scale.setScalar(pulse ? 1 + Math.sin(clock.elapsedTime * 7) * 0.08 : 1); });
  return g;
}
function Lemon({ p, pulse }: { p: V3; pulse: boolean }) {
  const g = usePulse(pulse);
  return (
    <group ref={g} position={p}>
      <Ball p={[0, 0.4, 0]} s={[0.55, 0.42, 0.42]} c="#FFE23F" />
      <Ball p={[0.55, 0.4, 0]} s={[0.1, 0.1, 0.1]} c="#E0B800" />
      <B p={[0.1, 0.84, 0]} s={[0.26, 0.05, 0.14]} c="#46B450" r={[0, 0, 0.5]} />
    </group>
  );
}
function BakingSoda({ p, pulse }: { p: V3; pulse: boolean }) {
  const g = usePulse(pulse);
  return (
    <group ref={g} position={p}>
      <B p={[0, 0.4, 0]} s={[0.8, 0.8, 0.6]} c="#FFFFFF" />
      <B p={[0, 0.45, 0.31]} s={[0.78, 0.3, 0.02]} c="#3A86FF" />
      <B p={[0, 0.85, 0]} s={[0.84, 0.08, 0.64]} c="#E63946" />
    </group>
  );
}

// =================================================================================================
// 2. Sink or float
// =================================================================================================
const TX = 0.7;
const TANK_W = 3.6, TANK_H = 2.5, TANK_D = 1.8;
const WATER_TOP = BT + 1.95;

export function FloatObj({ id }: { id: FloatId }) {
  switch (id) {
    case 'brick':
      return (
        <group>
          <B p={[0, 0, 0]} s={[1.0, 0.55, 0.6]} c="#E63946" />
          <Cy p={[-0.25, 0.32, 0]} s={[0.14, 0.1, 0.14]} c="#FF6B76" />
          <Cy p={[0.25, 0.32, 0]} s={[0.14, 0.1, 0.14]} c="#FF6B76" />
        </group>
      );
    case 'cork':
      return (
        <group>
          <Cy p={[0, 0, 0]} s={[0.3, 0.7, 0.3]} c="#D9A066" r={[0, 0, Math.PI / 2]} />
          <Cy p={[0.36, 0, 0]} s={[0.26, 0.04, 0.26]} c="#C28A52" r={[0, 0, Math.PI / 2]} />
        </group>
      );
    case 'apple':
      return (
        <group>
          <Ball p={[0, 0, 0]} s={0.46} c="#E63946" />
          <B p={[0, 0.5, 0]} s={[0.06, 0.2, 0.06]} c="#7A4A22" />
          <B p={[0.16, 0.56, 0]} s={[0.24, 0.05, 0.12]} c="#46B450" r={[0, 0, 0.4]} />
        </group>
      );
    case 'coin':
      return (
        <group>
          <Cy p={[0, 0, 0]} s={[0.42, 0.07, 0.42]} c="#FFC933" r={[Math.PI / 2, 0, 0]} />
          <Cy p={[0, 0, 0.045]} s={[0.3, 0.02, 0.3]} c="#FFE27A" r={[Math.PI / 2, 0, 0]} />
        </group>
      );
    case 'duck':
      return (
        <group>
          <Ball p={[0, 0, 0]} s={[0.5, 0.36, 0.38]} c="#FFD60A" />
          <Ball p={[0.28, 0.4, 0]} s={0.26} c="#FFD60A" />
          <B p={[0.55, 0.38, 0]} s={[0.22, 0.08, 0.2]} c="#FF8A1F" />
          <Ball p={[0.38, 0.5, 0.15]} s={0.04} c="#1D2A44" />
          <Ball p={[-0.42, 0.14, 0]} s={[0.2, 0.16, 0.14]} c="#FFE766" />
        </group>
      );
    case 'stone':
      return <mesh geometry={new THREE.DodecahedronGeometry(0.4, 0)} material={mat('#8B93A0')} scale={[1, 0.75, 0.85]} />;
  }
}

export function FloatScene() {
  const item = useLab((s) => s.floatItem);
  const dropAt = useLab((s) => s.dropAt);
  const badge = useLab((s) => s.floatBadge);
  const obj = useRef<THREE.Group>(null);
  const splashed = useRef(0);
  const floor = BT + 0.25;
  const floats = item ? floatItem(item).floats : false;
  useFrame(({ clock }) => {
    const g = obj.current;
    if (!g || !item) return;
    const t = nowS() - dropAt;
    const hover = BT + TANK_H + 1.2;
    if (dropAt === 0 || t < 0) {
      g.position.set(TX - 0.2, hover + Math.sin(clock.elapsedTime * 2.4) * 0.08, 0.1);
      g.rotation.set(0, clock.elapsedTime * 0.8, 0);
      return;
    }
    // wait for the guess to land, then drop
    const fallT = Math.max(0, t - 0.5);
    const dur = 0.5;
    if (fallT < dur) {
      const k = fallT / dur;
      g.position.set(TX, hover + (WATER_TOP + 0.1 - hover) * k * k, 0.1);
      g.rotation.set(k * 2, 0.5, k);
      return;
    }
    if (splashed.current !== dropAt) {
      splashed.current = dropAt;
      emitFx('splash', [TX, WATER_TOP, 0.1], 26, '#9BE0FF');
      emitFx('bubble', [TX, WATER_TOP - 0.2, 0.1], 10, '#FFFFFF', 0.5);
    }
    const st = fallT - dur;
    if (floats) {
      const settle = Math.min(1, st * 2);
      g.position.set(TX, WATER_TOP - 0.1 - (1 - settle) * 0.55 + Math.sin(st * 3.2) * 0.07 * settle, 0.1);
      g.rotation.set(0.08 * Math.sin(st * 2.2), 0.5 + st * 0.4, 0.1 * Math.sin(st * 2.8));
    } else {
      const k = Math.min(1, st / 1.3);
      const y = WATER_TOP - (WATER_TOP - floor) * (k * (2 - k));
      g.position.set(TX + Math.sin(st * 4) * 0.1 * (1 - k), y, 0.1);
      g.rotation.set(0.4 * (1 - k), 0.5 + st, 0.3 * Math.sin(st * 3) * (1 - k));
      if (k < 1 && Math.random() < 0.18) emitFx('bubble', [g.position.x, g.position.y + 0.2, 0.1], 1, '#FFFFFF', 0.2);
    }
  });
  return (
    <group>
      {/* tank */}
      <B p={[TX, BT + 0.1, 0.1]} s={[TANK_W + 0.2, 0.2, TANK_D + 0.2]} c="#FFFFFF" />
      <mesh geometry={BOX} position={[TX, BT + 1.0, 0.1]} scale={[TANK_W - 0.1, 1.8, TANK_D - 0.1]} renderOrder={1}>
        <meshStandardMaterial color="#4CB7FF" transparent opacity={0.55} roughness={0.1} depthWrite={false} />
      </mesh>
      <mesh geometry={BOX} position={[TX, WATER_TOP - 0.01, 0.1]} scale={[TANK_W - 0.1, 0.04, TANK_D - 0.1]} renderOrder={3}>
        <meshStandardMaterial color="#CFF0FF" transparent opacity={0.8} />
      </mesh>
      <Glass p={[TX, BT + TANK_H / 2, 0.1 + TANK_D / 2]} s={[0.02, 0.02, 0.02]} />
      <mesh geometry={BOX} position={[TX, BT + TANK_H / 2 + 0.1, 0.1 + TANK_D / 2]} scale={[TANK_W, TANK_H - 0.2, 0.05]} renderOrder={4}>
        <meshStandardMaterial color="#DDF6FF" transparent opacity={0.2} roughness={0.05} depthWrite={false} />
      </mesh>
      {[-1, 1].map((sx) => <B key={sx} p={[TX + sx * (TANK_W / 2), BT + TANK_H / 2, 0.1 + TANK_D / 2]} s={[0.1, TANK_H, 0.1]} c="#FFFFFF" />)}
      <B p={[TX, BT + TANK_H, 0.1 + TANK_D / 2]} s={[TANK_W + 0.1, 0.1, 0.1]} c="#FFFFFF" />
      {item && <group ref={obj} scale={1.15}><FloatObj id={item} /></group>}
      {badge && <BubbleStream p={[TX, WATER_TOP, 0.1]} color="#FFFFFF" h={0.6} count={2} />}
    </group>
  );
}

// =================================================================================================
// 3. Brick rocket
// =================================================================================================
const RX = 0.2;
const FUEL_COLORS = ['#E63946', '#FF8A1F', '#FFD60A', '#46D07A', '#3A86FF'];

function FuelBrick({ i }: { i: number }) {
  const g = useRef<THREE.Group>(null);
  const born = useRef(nowS());
  useFrame(() => { g.current?.scale.setScalar(pop(nowS() - born.current, 0.35)); });
  return (
    <group ref={g} position={[0, 0.3 + i * 0.52, 0]}>
      <B s={[1.0, 0.5, 0.7]} c={FUEL_COLORS[i % FUEL_COLORS.length]} />
      <Cy p={[-0.25, 0.29, 0]} s={[0.15, 0.08, 0.15]} c="#FFFFFF" />
      <Cy p={[0.25, 0.29, 0]} s={[0.15, 0.08, 0.15]} c="#FFFFFF" />
    </group>
  );
}

function Rocket() {
  return (
    <group>
      {/* body: stacked bricks */}
      <B p={[0, 0.5, 0]} s={[1.0, 0.8, 0.9]} c="#FFFFFF" />
      <B p={[0, 1.25, 0]} s={[1.0, 0.7, 0.9]} c="#E63946" />
      <B p={[0, 1.9, 0]} s={[1.0, 0.6, 0.9]} c="#FFFFFF" />
      <Cone p={[0, 2.5, 0]} s={[0.75, 0.95, 0.75]} c="#E63946" r={[0, Math.PI / 4, 0]} />
      <Cy p={[0, 1.25, 0.46]} s={[0.22, 0.06, 0.22]} c="#9BE0FF" r={[Math.PI / 2, 0, 0]} />
      <B p={[-0.7, 0.35, 0]} s={[0.4, 0.8, 0.14]} c="#3A86FF" r={[0, 0, 0.3]} />
      <B p={[0.7, 0.35, 0]} s={[0.4, 0.8, 0.14]} c="#3A86FF" r={[0, 0, -0.3]} />
      <B p={[0, 0.0, 0]} s={[0.5, 0.2, 0.5]} c="#FFB000" />
    </group>
  );
}

export function RocketScene() {
  const fuel = useLab((s) => s.fuel);
  const flying = useLab((s) => s.flying);
  const g = useRef<THREE.Group>(null);
  const chute = useRef(0);
  const chuteG = useRef<THREE.Group>(null);
  const landedAt = useRef(0);
  const phaseRef = useRef<'idle' | 'fly' | 'landed'>('idle');
  const emitT = useRef(0);
  const baseY = BT + 0.25;
  useFrame((_, dt) => {
    const grp = g.current;
    if (!grp) return;
    const s = useLab.getState();
    if (s.flying) {
      phaseRef.current = 'fly';
      const t = nowS() - s.launchAt;
      const H = rocketHeight(s.launchFuel) * 0.8 + 0.6;
      const tUp = 1.0 + s.launchFuel * 0.28;
      const tDown = 3.0;
      const total = tUp + tDown;
      let y: number;
      let tilt: number;
      if (t < 0.5) {
        // countdown shake on the pad
        chute.current = 0;
        grp.position.set(RX + Math.sin(t * 70) * 0.03, baseY, 0.2);
        grp.rotation.set(0, 0, Math.sin(t * 60) * 0.03);
        return;
      }
      const tt = t - 0.5;
      if (tt < tUp) {
        const k = tt / tUp;
        y = H * (1 - (1 - k) * (1 - k));
        tilt = -0.18 * k;
        chute.current = 0;
        emitT.current += dt;
        if (emitT.current > 0.03) {
          emitT.current = 0;
          emitFx('smoke', [grp.position.x, grp.position.y - 0.1, 0.2], 2, undefined, 0.3);
          emitFx('spark', [grp.position.x, grp.position.y - 0.1, 0.2], 1, '#FFB000', 0.3);
        }
      } else if (tt < tUp + tDown) {
        const k = (tt - tUp) / tDown;
        y = H * (1 - (k * k * (3 - 2 * k)));
        tilt = -0.18 * (1 - k) + Math.sin(k * 9) * 0.06 * (1 - k);
        chute.current = Math.min(1, (tt - tUp) / 0.35);
        if (k < 0.2 && Math.random() < 0.3) emitFx('spark', [grp.position.x, grp.position.y + 0.8, 0.2], 1, '#FFFFFF', 0.4);
      } else {
        y = 0; tilt = 0; chute.current = 1;
      }
      const prog = Math.min(1, tt / (tUp + tDown));
      const x = RX + 2.0 * (prog * prog * (3 - 2 * prog));
      grp.position.set(x, baseY + y, 0.2);
      grp.rotation.set(0, 0, tilt);
      if (tt >= total) {
        landedAt.current = nowS();
        phaseRef.current = 'landed';
        emitFx('smoke', [x, baseY + 0.2, 0.2], 10, undefined, 0.8);
        emitFx('confetti', [x, baseY + 1.2, 0.2], 24);
        rocketLanded();
      }
    } else if (phaseRef.current === 'landed' && nowS() - landedAt.current < 1.4) {
      chute.current = Math.max(0, chute.current - dt * 0.6);
      grp.rotation.set(0, 0, 0);
    } else {
      phaseRef.current = 'idle';
      chute.current = 0;
      grp.position.set(RX, baseY, 0.2);
      grp.rotation.set(0, 0, 0);
    }
  });
  useFrame(() => { chuteG.current?.scale.setScalar(Math.max(0.0001, chute.current)); });
  return (
    <group>
      {/* launch pad */}
      <B p={[RX, BT + 0.1, 0.2]} s={[1.8, 0.2, 1.4]} c="#6B7A99" />
      <B p={[RX, BT + 0.22, 0.2]} s={[1.5, 0.08, 1.1]} c="#FFD60A" />
      <group ref={g} position={[RX, baseY, 0.2]}>
        <Rocket />
        <group ref={chuteG} position={[0, 3.3, 0]}>
          <mesh geometry={SPHERE} material={mat('#FF5CA8')} scale={[1.5, 0.85, 1.5]} />
          <mesh geometry={SPHERE} material={mat('#FFD60A')} scale={[0.5, 0.88, 1.52]} />
          {[-1, 1].map((x) => <B key={x} p={[x * 0.55, -1.15, 0]} s={[0.04, 2.1, 0.04]} c="#FFFFFF" r={[0, 0, x * 0.28]} />)}
        </group>
      </group>
      {/* fuel stack */}
      <group position={[-2.1, BT, 0.4]}>
        <B p={[0, 0.04, 0]} s={[1.3, 0.08, 1.0]} c="#6B7A99" />
        {!flying && Array.from({ length: fuel }).map((_, i) => <FuelBrick key={i} i={i} />)}
      </group>
    </group>
  );
}

// =================================================================================================
// 4. Crystal growing
// =================================================================================================
const CX = 0.6;
const JAR_R = 1.0, JAR_H = 2.4;
/** Cluster centers (relative to jar base), one per tap. */
const CLUSTERS: V3[] = [
  [0, 0.4, 0], [0.45, 0.55, 0.2], [-0.5, 0.6, -0.1], [0.05, 1.1, 0.1], [-0.35, 1.35, 0.35], [0.4, 1.55, -0.2],
];
const CRYSTAL_COLORS = ['#FFFFFF', '#CDEBFF', '#E4D3FF', '#FFE0F2'];

function CrystalCluster({ i }: { i: number }) {
  const g = useRef<THREE.Group>(null);
  const born = useRef(nowS());
  const cubes = useMemo(() => {
    let sd = i * 977 + 13;
    const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    return Array.from({ length: 5 }).map((_, k) => ({
      p: [(rnd() - 0.5) * 0.55, (rnd() - 0.2) * 0.5, (rnd() - 0.5) * 0.4] as V3,
      s: 0.14 + rnd() * 0.18,
      r: [rnd() * 3, rnd() * 3, rnd() * 3] as V3,
      c: CRYSTAL_COLORS[(k + i) % CRYSTAL_COLORS.length],
    }));
  }, [i]);
  useEffect(() => {
    const c = CLUSTERS[i];
    emitFx('spark', [CX + c[0], BT + 0.2 + c[1], c[2] + 0.1], 12, undefined, 0.5);
  }, [i]);
  useFrame(() => { g.current?.scale.setScalar(pop(nowS() - born.current, 0.5)); });
  const c = CLUSTERS[i];
  return (
    <group ref={g} position={[c[0], c[1], c[2]]}>
      {cubes.map((q, k) => (
        <mesh key={k} geometry={BOX} position={q.p} rotation={q.r} scale={q.s} material={mat(q.c, { emissive: '#B8E4FF', emissiveIntensity: 0.35 })} />
      ))}
    </group>
  );
}

export function CrystalScene() {
  const n = useLab((s) => s.crystals);
  return (
    <group position={[CX, BT + 0.2, 0.2]}>
      <Cy p={[0, 0.0, 0]} s={[JAR_R + 0.12, 0.1, JAR_R + 0.12]} c="#FFFFFF" />
      <mesh geometry={CYL} position={[0, JAR_H * 0.34, 0]} scale={[JAR_R - 0.05, JAR_H * 0.66, JAR_R - 0.05]} material={new THREE.MeshStandardMaterial({ color: '#7FD3FF', transparent: true, opacity: 0.5, roughness: 0.15, depthWrite: false })} renderOrder={1} />
      <Glass p={[0, JAR_H / 2, 0]} s={[JAR_R, JAR_H, JAR_R]} />
      <Cy p={[0, JAR_H + 0.04, 0]} s={[JAR_R + 0.08, 0.1, JAR_R + 0.08]} c="#FF8A1F" />
      {/* pencil across the top and the string */}
      <Cy p={[0, JAR_H + 0.18, 0]} s={[0.07, 2.5, 0.07]} c="#FFD60A" r={[0, 0, Math.PI / 2]} />
      <Cy p={[0, JAR_H * 0.5 + 0.1, 0]} s={[0.025, JAR_H, 0.025]} c="#F3E3C3" />
      <group>{Array.from({ length: Math.min(n, CRYSTAL_TAPS) }).map((_, i) => <CrystalCluster key={i} i={i} />)}</group>
    </group>
  );
}

// =================================================================================================
// 5. Seed science
// =================================================================================================
const SX = 0.6;

function Sprout({ at }: { at: number }) {
  const parts = useRef<(THREE.Group | null)[]>([]);
  const fired = useRef(false);
  useFrame(() => {
    const t = nowS() - at;
    parts.current.forEach((g, i) => { if (g) g.scale.setScalar(pop(t - i * 0.14, 0.4)); });
    if (t > 0 && !fired.current) { fired.current = true; emitFx('confetti', [SX, BT + 1.6, 0.2], 28); emitFx('spark', [SX, BT + 1.4, 0.2], 20, undefined, 0.8); }
  });
  return (
    <group position={[SX, BT + 0.95, 0.2]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} ref={(o) => { parts.current[i] = o; }} position={[0, i * 0.3, 0]}>
          <B s={[0.2, 0.3, 0.2]} c="#46B450" />
        </group>
      ))}
      <group ref={(o) => { parts.current[4] = o; }} position={[-0.36, 1.1, 0]}><Ball p={[0, 0, 0]} s={[0.45, 0.12, 0.28]} c="#6BD66B" /></group>
      <group ref={(o) => { parts.current[5] = o; }} position={[0.36, 1.1, 0]}><Ball p={[0, 0, 0]} s={[0.45, 0.12, 0.28]} c="#6BD66B" /></group>
      <group ref={(o) => { parts.current[6] = o; }} position={[0, 1.35, 0]}>
        <Ball p={[0, 0, 0]} s={0.2} c="#FF5CA8" emissive="#FF5CA8" e={0.3} />
      </group>
    </group>
  );
}

function WateringCan({ at }: { at: number }) {
  const g = useRef<THREE.Group>(null);
  const done = useRef(0);
  useFrame(() => {
    const t = nowS() - at;
    if (!g.current) return;
    const k = at > 0 ? Math.max(0, Math.min(1, t < 0.5 ? t / 0.5 : t < 1.6 ? 1 : 1 - (t - 1.6) / 0.5)) : 0;
    g.current.visible = k > 0.001;
    g.current.position.set(SX - 1.9 + k * 0.9, BT + 3.2 + Math.sin(t * 6) * 0.03 * k, 0.4);
    g.current.rotation.z = -k * 0.7;
    if (t > 0.45 && t < 1.6 && Math.random() < 0.6) emitFx('splash', [SX - 0.5, BT + 2.7, 0.3], 1, '#4CB7FF');
    if (t > 1.7 && done.current !== at) { done.current = at; }
  });
  return (
    <group ref={g} visible={false}>
      <B s={[1.0, 0.8, 0.6]} c="#3A86FF" />
      <B p={[0.75, 0.15, 0]} s={[0.7, 0.14, 0.14]} c="#3A86FF" r={[0, 0, -0.5]} />
      <B p={[-0.2, 0.55, 0]} s={[0.9, 0.12, 0.12]} c="#1D5FD6" />
    </group>
  );
}

function GrowLamp({ at }: { at: number }) {
  const beam = useRef<THREE.Mesh>(null);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const k = at > 0 ? Math.min(1, (nowS() - at) / 0.5) : 0;
    if (g.current) g.current.position.y = BT + 4.3 - (1 - k) * 0.4;
    if (beam.current) {
      beam.current.visible = k > 0;
      (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.28 * k * (0.9 + Math.sin(clock.elapsedTime * 5) * 0.1);
    }
  });
  return (
    <group ref={g} position={[SX, BT + 4.3, 0.2]}>
      <B p={[0, 0.8, 0]} s={[0.1, 0.8, 0.1]} c="#FFD60A" />
      <mesh geometry={CONE4} material={mat('#FF5CA8')} scale={[0.9, 0.5, 0.9]} rotation={[Math.PI, Math.PI / 4, 0]} position={[0, 0.3, 0]} />
      <mesh geometry={SPHERE} scale={0.2} position={[0, 0.0, 0]}>
        <meshStandardMaterial color="#FFF3B0" emissive="#FFE066" emissiveIntensity={at > 0 ? 2 : 0.2} />
      </mesh>
      <mesh ref={beam} geometry={CONE4} position={[0, -1.6, 0]} scale={[1.7, 3.2, 1.7]} rotation={[Math.PI, Math.PI / 4, 0]} visible={false}>
        <meshBasicMaterial color="#FFF3A0" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function SeedScene() {
  const given = useLab((s) => s.given);
  const givenAt = useLab((s) => s.givenAt);
  const sproutAt = useLab((s) => s.sproutAt);
  const soil = useRef<THREE.Group>(null);
  const seed = useRef<THREE.Group>(null);
  const wet = given.includes('water');
  const hasSoil = given.includes('soil');
  const sprouted = sproutAt > 0;
  useEffect(() => {
    if (hasSoil) emitFx('splash', [SX, BT + 1.0, 0.2], 12, '#7A4A22');
  }, [hasSoil]);
  useEffect(() => {
    if (!wet) return;
    const t = setTimeout(() => emitFx('bubble', [SX, BT + 1.0, 0.2], 8, '#4CB7FF', 0.4), 700);
    return () => clearTimeout(t);
  }, [wet]);
  useFrame(({ clock }) => {
    if (soil.current) soil.current.scale.setScalar(hasSoil ? pop(nowS() - (givenAt.soil ?? 0), 0.5) : 0.0001);
    if (seed.current) {
      seed.current.visible = !sprouted;
      seed.current.position.y = hasSoil ? BT + 1.1 : BT + 1.55 + Math.sin(clock.elapsedTime * 2.5) * 0.08;
      seed.current.rotation.z = hasSoil ? 0.2 : Math.sin(clock.elapsedTime * 1.8) * 0.25;
    }
  });
  return (
    <group>
      {/* pot */}
      <mesh geometry={CYL} material={mat('#E2763C')} position={[SX, BT + 0.55, 0.2]} scale={[0.95, 1.1, 0.95]} />
      <Cy p={[SX, BT + 1.12, 0.2]} s={[1.08, 0.18, 1.08]} c="#C85E28" />
      <Cy p={[SX, BT + 1.03, 0.2]} s={[0.86, 0.1, 0.86]} c={wet ? '#3A2210' : '#5A3A1E'} />
      <group ref={soil} position={[SX, BT + 1.12, 0.2]}>
        <mesh geometry={SPHERE} material={mat(wet ? '#4A2C14' : '#7A4A22')} scale={[0.82, 0.3, 0.82]} />
      </group>
      <group ref={seed} position={[SX, BT + 1.55, 0.2]}>
        <Ball p={[0, 0, 0]} s={[0.2, 0.28, 0.16]} c="#A66A2C" />
      </group>
      <WateringCan at={givenAt.water ?? 0} />
      <GrowLamp at={givenAt.light ?? 0} />
      {sprouted && <Sprout at={sproutAt} />}
      {/* props on the bench: trowel */}
      <group position={[SX + 2.4, BT + 0.1, 0.9]}>
        <B p={[0, 0.0, 0]} s={[0.9, 0.08, 0.35]} c="#9AA6BD" r={[0, 0.3, 0]} />
        <B p={[0.55, 0.05, 0.15]} s={[0.4, 0.14, 0.14]} c="#E63946" r={[0, 0.3, 0]} />
      </group>
    </group>
  );
}

