import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { B, CYL8, Cy, Particles, emit, mat, popScale } from '../../zones/woods/fx';
import { BrickTree, FriendModel } from '../../zones/woods/models';
import type { FriendId } from '../../zones/woods/facts';
import { Avatar } from '../../three/Avatar';
import { sfx } from '../../audio/engine';
import { useProgress } from '../../state/progress';
import {
  ALBUM_CAM, LUNA_SEAT_Y, SEATS, TABLE_CAM, TABLE_Y, TIER_WIDTHS, candleOffsets, cakePieceCount, cakePieces, cakeTopY, type Seat, type V3,
} from './layout';
import { Fireworks, Smoke, emitSmoke } from './fx';
import { blowCandles, cakeBuilt, useFinale } from './state';

const PIECE_COLORS = ['#FF5CA8', '#3A86FF', '#FFD60A', '#7AE582', '#E63946', '#B388FF', '#FF8C42'];
const skipAnim = (): boolean => typeof window !== 'undefined' && window.__skipAnim === true;

// ---- camera ---------------------------------------------------------------------------------------
function CameraRig() {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(...TABLE_CAM.look));
  useFrame((_, dt) => {
    const phase = useFinale.getState().phase;
    const cam = phase === 'album' || phase === 'message' ? ALBUM_CAM : TABLE_CAM;
    const k = Math.min(1, dt * 1.8);
    camera.position.x += (cam.pos[0] - camera.position.x) * k;
    camera.position.y += (cam.pos[1] - camera.position.y) * k;
    camera.position.z += (cam.pos[2] - camera.position.z) * k;
    look.current.x += (cam.look[0] - look.current.x) * k;
    look.current.y += (cam.look[1] - look.current.y) * k;
    look.current.z += (cam.look[2] - look.current.z) * k;
    camera.lookAt(look.current);
  });
  return null;
}

// ---- world ----------------------------------------------------------------------------------------
function Ground() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: V3[] = [];
    for (let x = -16; x <= 16; x += 1.25) {
      for (let z = -14; z <= 12; z += 1.25) {
        if (Math.hypot(x, z * 0.95) > 15.5) continue;
        if (Math.hypot(x / 6.4, z / 6.2) < 1) continue;
        out.push([x + ((z * 7) % 3) * 0.05, 0.03, z]);
      }
    }
    return out;
  }, []);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    spots.forEach((p, i) => {
      d.position.set(...p);
      d.scale.set(0.2, 0.14, 0.2);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [spots]);
  const flowers = useMemo(() => {
    const cols = ['#FF5CA8', '#E63946', '#3A86FF', '#FFD60A', '#FFFFFF'];
    return Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2 + 0.2;
      const r = 7.2 + (i % 3) * 0.45;
      return { p: [Math.cos(a) * r, 0, Math.sin(a) * r * 0.85] as V3, c: cols[i % cols.length] };
    });
  }, []);
  return (
    <group>
      <Cy p={[0, -0.4, 1]} s={[18, 0.8, 18]} c="#8ED06B" />
      <Cy p={[0, -1.3, 1]} s={[17, 1.0, 17]} c="#8B5A2B" />
      <instancedMesh ref={ref} args={[CYL8, mat('#7CC45A'), spots.length]} frustumCulled={false} />
      <Cy p={[0, 0.03, 0]} s={[6.5, 0.08, 6.3]} c="#E7C48E" />
      <Cy p={[0, 0.09, 0]} s={[6.1, 0.06, 5.9]} c="#F3DCB4" />
      {flowers.map((f, i) => (
        <group key={i} position={f.p}>
          <B p={[0, 0.2, 0]} s={[0.05, 0.4, 0.05]} c="#3FAE49" />
          <B p={[0, 0.44, 0]} s={[0.22, 0.14, 0.22]} c={f.c} />
          <B p={[0, 0.5, 0]} s={[0.08, 0.06, 0.08]} c="#FFD60A" />
        </group>
      ))}
    </group>
  );
}

const BG_TREES: { p: V3; s: number; h: number }[] = [
  { p: [-9, 0, -4], s: 1.3, h: 0 }, { p: [-6.8, 0, -7], s: 1.6, h: 1 }, { p: [-3.4, 0, -8.6], s: 1.4, h: 0 },
  { p: [0, 0, -9.2], s: 1.7, h: 1 }, { p: [3.6, 0, -8.6], s: 1.4, h: 0 }, { p: [6.8, 0, -7], s: 1.6, h: 1 },
  { p: [9, 0, -4], s: 1.3, h: 0 }, { p: [-11, 0, 0.5], s: 1.5, h: 1 }, { p: [11, 0, 0.8], s: 1.5, h: 0 },
  { p: [-12.5, 0, 5], s: 1.5, h: 0 }, { p: [12.5, 0, 5.4], s: 1.5, h: 1 },
  { p: [-10, 0, -9.5], s: 2.0, h: 0 }, { p: [10, 0, -9.5], s: 2.0, h: 1 }, { p: [-14, 0, -4], s: 2.0, h: 1 }, { p: [14, 0, -4], s: 2.0, h: 0 },
];
const AGE_INF = () => Infinity;

function Moon() {
  return (
    <group position={[-13, 11.5, -16]}>
      <mesh><sphereGeometry args={[1.5, 24, 16]} /><meshBasicMaterial color="#FFF3C4" /></mesh>
      <mesh position={[0.45, 0.3, 1.4]}><sphereGeometry args={[0.35, 12, 8]} /><meshBasicMaterial color="#F4E2A0" /></mesh>
    </group>
  );
}

const BALLOON_COLORS = ['#FF5CA8', '#FFD60A', '#3A86FF', '#E63946', '#7AE582', '#B388FF'];
function Balloons({ x, z, seed }: { x: number; z: number; seed: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + seed) * 0.05;
      g.current.rotation.x = Math.cos(clock.elapsedTime * 0.7 + seed) * 0.04;
    }
  });
  const items = [[-0.5, 3.6, 0], [0.45, 4.1, 0.15], [0.0, 4.5, -0.2], [-0.15, 3.9, 0.4]] as V3[];
  return (
    <group position={[x, 0, z]}>
      <Cy p={[0, 0.08, 0]} s={[0.3, 0.16, 0.3]} c="#FFF4E0" />
      <group ref={g} position={[0, 0.16, 0]}>
        {items.map((p, i) => (
          <group key={i}>
            <B p={[p[0] / 2, p[1] / 2, p[2] / 2]} s={[0.025, p[1], 0.025]} c="#FFFFFF" r={[p[2] * 0.4, 0, -p[0] * 0.28]} />
            <mesh position={p} scale={[0.55, 0.68, 0.55]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color={BALLOON_COLORS[(i + seed) % BALLOON_COLORS.length]} roughness={0.35} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Throne() {
  const [x, , z] = SEATS[0].seat;
  return (
    <group position={[x, 0, z]}>
      <Cy p={[0, LUNA_SEAT_Y / 2, 0]} s={[0.85, LUNA_SEAT_Y, 0.85]} c="#FFD60A" />
      <Cy p={[0, LUNA_SEAT_Y + 0.02, 0]} s={[0.92, 0.08, 0.92]} c="#FF5CA8" />
      <B p={[0, LUNA_SEAT_Y + 1.0, -0.7]} s={[1.5, 2.0, 0.2]} c="#FF5CA8" />
      <B p={[0, LUNA_SEAT_Y + 2.05, -0.7]} s={[1.7, 0.2, 0.26]} c="#FFD60A" />
    </group>
  );
}

function Table() {
  const settings = useMemo(() => [-1.1, -0.55, 0.55, 1.1, -1.65, 1.65, 0].map((a, i) => ({ a: a + Math.PI, c: i % 2 ? '#FF8FB8' : '#FFFFFF' })), []);
  return (
    <group>
      <Cy p={[0, 0.35, 0]} s={[0.8, 0.7, 0.8]} c="#E63946" />
      <Cy p={[0, 0.04, 0]} s={[1.3, 0.08, 1.3]} c="#C22F3B" />
      <Cy p={[0, 0.8, 0]} s={[2.6, 0.16, 2.6]} c="#FFF4E0" />
      <Cy p={[0, 0.9, 0]} s={[2.5, 0.06, 2.5]} c="#FF8FB8" />
      {Array.from({ length: 20 }, (_, i) => (
        <Cy key={i} p={[Math.cos((i / 20) * Math.PI * 2) * 2.3, 0.96, Math.sin((i / 20) * Math.PI * 2) * 2.3]} s={[0.08, 0.05, 0.08]} c={i % 2 ? '#FFD60A' : '#FFFFFF'} low />
      ))}
      {settings.map((s, i) => (
        <group key={i} position={[Math.sin(s.a) * 2.0, 0.96, Math.cos(s.a) * 2.0]}>
          <Cy p={[0, 0.02, 0]} s={[0.3, 0.04, 0.3]} c={s.c} />
          <Cy p={[0.28, 0.08, 0.05]} s={[0.1, 0.16, 0.1]} c="#3A86FF" />
        </group>
      ))}
    </group>
  );
}

// ---- the cake -------------------------------------------------------------------------------------
const FLAME = new THREE.SphereGeometry(0.11, 10, 8);
const FLAME_MAT = new THREE.MeshBasicMaterial({ color: '#FFB020' });
const FLAME_CORE = new THREE.SphereGeometry(0.06, 8, 6);
const FLAME_CORE_MAT = new THREE.MeshBasicMaterial({ color: '#FFF3A0' });

/** The Birthday Bricks fly in one by one, stack into three tiers, then the candles pop on. */
function Cake() {
  const pieceCount = useMemo(() => cakePieceCount(useProgress.getState().totalBricks()), []);
  const pieces = useMemo(() => cakePieces(pieceCount), [pieceCount]);
  const total = useFinale((s) => s.total);
  const topY = cakeTopY(pieceCount);
  const offsets = useMemo(() => candleOffsets(total), [total]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const landed = useRef<boolean[]>(pieces.map(() => false));
  const candles = useRef<(THREE.Group | null)[]>([]);
  const flames = useRef<(THREE.Group | null)[]>([]);
  const glow = useRef<THREE.PointLight>(null);
  const candlesAt = useRef(0);
  const doneRef = useRef(false);
  const bornAt = useRef(performance.now());
  const starts = useMemo<V3[]>(() => pieces.map((_, i) => [(i % 2 ? 1 : -1) * (3.5 + (i % 3) * 1.3), 15 + (i % 2) * 2, -1.5 + (i % 3) * 1.4]), [pieces]);

  // smoke wisps from the candles that just went out
  useEffect(
    () =>
      useFinale.subscribe((s, prev) => {
        if (!s.puff || s.puff === prev.puff) return;
        for (let i = s.puff.from; i < s.puff.to; i++) {
          const o = offsets[i];
          if (o) emitSmoke([o[0], topY + 0.1 + 0.6, o[1]]);
        }
      }),
    [offsets, topY],
  );

  useFrame(({ clock }) => {
    const age = (performance.now() - bornAt.current) / 1000;
    const instant = skipAnim();
    pieces.forEach((pc, i) => {
      const g = groups.current[i];
      if (!g) return;
      const t0 = instant ? -9 : 0.7 + i * 0.62;
      const u = Math.min(1, Math.max(0, (age - t0) / 0.95));
      g.visible = age >= t0;
      if (!g.visible) return;
      const e = u * u;
      const s = starts[i];
      g.position.set(s[0] * (1 - e), pc.y + (s[1] - pc.y) * (1 - e), s[2] * (1 - e));
      g.rotation.set((1 - u) * 3, (1 - u) * 4, 0);
      const grow = 0.45 + 0.55 * u;
      let sy = grow;
      if (u >= 1) {
        const v = Math.min(1, (age - t0 - 0.95) / 0.35);
        sy = 1 - 0.16 * Math.sin(v * Math.PI);
        g.rotation.set(0, 0, 0);
        if (!landed.current[i]) {
          landed.current[i] = true;
          sfx('pop');
          emit('sparkle', [0, pc.y + pc.height / 2, 0], 14);
        }
      }
      g.scale.set(grow, sy, grow);
    });
    if (!doneRef.current && landed.current.length && landed.current.every(Boolean)) {
      doneRef.current = true;
      candlesAt.current = performance.now() + 500;
      setTimeout(cakeBuilt, 500);
    }
    const st = useFinale.getState();
    const lit = st.lit;
    const t = clock.elapsedTime;
    const cAge = candlesAt.current > 0 ? (performance.now() - candlesAt.current) / 1000 : -1;
    candles.current.forEach((c, i) => {
      if (!c) return;
      const k = cAge < 0 ? 0 : popScale(cAge - i * 0.09, 0, 0.45);
      c.scale.setScalar(Math.max(0.0001, k));
      c.visible = k > 0.001;
    });
    flames.current.forEach((fl, i) => {
      if (!fl) return;
      const on = i < lit;
      fl.visible = on;
      if (on) {
        const fk = 1 + Math.sin(t * 17 + i * 2.1) * 0.14 + Math.sin(t * 29 + i) * 0.08;
        fl.scale.set(0.85 + (fk - 1) * 0.6, fk * 1.55, 0.85);
        fl.position.x = Math.sin(t * 7 + i) * 0.012;
      }
    });
    if (glow.current) glow.current.intensity = lit > 0 && cAge > 0 ? 7 + Math.sin(t * 18) * 0.8 : 0;
  });

  const setG = (i: number) => (g: THREE.Group | null) => { groups.current[i] = g; };
  const setCandle = (i: number) => (g: THREE.Group | null) => { candles.current[i] = g; };
  const setFlame = (i: number) => (g: THREE.Group | null) => { flames.current[i] = g; };
  const tierTop = (i: number) => pieces[i + 1]?.tier !== pieces[i].tier;

  return (
    <group onPointerDown={(e) => { e.stopPropagation(); blowCandles(); }}>
      {pieces.map((pc, i) => {
        const n = Math.floor(pc.width / 0.55);
        const col = PIECE_COLORS[i % PIECE_COLORS.length];
        const top = tierTop(i);
        return (
          <group key={i} ref={setG(i)} visible={false}>
            <B s={[pc.width, pc.height, pc.width]} c={col} />
            {top && (
              <>
                <B p={[0, pc.height / 2 + 0.05, 0]} s={[pc.width + 0.12, 0.1, pc.width + 0.12]} c="#FFF4E0" />
                {pc.tier < 2 &&
                  Array.from({ length: n * n }, (_, k) => (
                    <Cy key={k} p={[((k % n) - (n - 1) / 2) * 0.5, pc.height / 2 + 0.14, (Math.floor(k / n) - (n - 1) / 2) * 0.5]} s={[0.15, 0.1, 0.15]} c="#FFF4E0" low />
                  ))}
              </>
            )}
          </group>
        );
      })}
      <group position={[0, topY + 0.1, 0]}>
        {offsets.map((o, i) => (
          <group key={i} ref={setCandle(i)} position={[o[0], 0, o[1]]} visible={false}>
            <Cy p={[0, 0.25, 0]} s={[0.055, 0.5, 0.055]} c={i % 2 ? '#FFFFFF' : '#FF8FB8'} low />
            <Cy p={[0, 0.3, 0]} s={[0.058, 0.1, 0.058]} c={['#3A86FF', '#FFD60A', '#7AE582'][i % 3]} low />
            <group ref={setFlame(i)} position={[0, 0.62, 0]}>
              <mesh geometry={FLAME} material={FLAME_MAT} />
              <mesh geometry={FLAME_CORE} material={FLAME_CORE_MAT} position={[0, -0.03, 0.05]} />
            </group>
          </group>
        ))}
      </group>
      <pointLight ref={glow} position={[0, topY + 0.9, 0.4]} color="#FFC060" intensity={0} distance={9} decay={1.6} />
      {/* invisible, forgiving tap target around the whole cake */}
      <mesh position={[0, (TABLE_Y + topY) / 2 + 0.2, 0]}>
        <cylinderGeometry args={[TIER_WIDTHS[0] * 0.8, TIER_WIDTHS[0] * 0.8, topY - TABLE_Y + 1.2, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---- guests ---------------------------------------------------------------------------------------
const wrap = (a: number): number => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;

function Guest({ s, index, partyHat }: { s: Seat; index: number; partyHat: boolean }) {
  const g = useRef<THREE.Group>(null);
  const hop = useRef<THREE.Group>(null);
  const born = useRef(performance.now() + index * 170);
  const band = useFinale((st) => st.bandOn && !st.frozen);
  const inAlbum = useFinale((st) => st.phase === 'album' || st.phase === 'message');
  const frozen = useFinale((st) => st.frozen);
  useFrame(({ clock }, dt) => {
    const o = g.current;
    if (!o) return;
    const st = useFinale.getState();
    const album = st.phase === 'album' || st.phase === 'message';
    const tp = album ? s.line : s.seat;
    const k = Math.min(1, dt * 2.6);
    o.position.x += (tp[0] - o.position.x) * k;
    o.position.y += (tp[1] - o.position.y) * k;
    o.position.z += (tp[2] - o.position.z) * k;
    o.rotation.y += wrap((album ? 0 : s.seatYaw) - o.rotation.y) * k;
    o.scale.setScalar(Math.max(0.0001, popScale((performance.now() - born.current) / 1000, 0, 0.6)));
    if (hop.current) {
      const dancing = st.bandOn && !st.frozen;
      hop.current.position.y = dancing ? Math.abs(Math.sin(clock.elapsedTime * 4.2 + index * 0.9)) * 0.14 : 0;
      hop.current.rotation.z = dancing ? Math.sin(clock.elapsedTime * 4.2 + index) * 0.05 : 0;
    }
  });
  const isPerson = s.kind === 'person';
  const forced = frozen || (inAlbum && s.id !== 'luna') ? ('happy' as const) : undefined;
  if (s.kind === 'friend') {
    return (
      <group ref={g} position={s.seat} rotation={[0, s.seatYaw, 0]}>
        <group ref={hop} scale={s.scale}><FriendModel type={s.id as FriendId} /></group>
      </group>
    );
  }
  return (
    <group ref={g} position={s.seat} rotation={[0, s.seatYaw, 0]}>
      <group ref={hop}>
        <Avatar id={s.id as never} scale={s.scale} interactive={isPerson} wave={isPerson && band && s.id !== 'dad'} partyHat={partyHat} expression={forced} phase={index * 1.3} />
      </group>
    </group>
  );
}

// ---- scene ----------------------------------------------------------------------------------------
export function Scene() {
  const runId = useFinale((s) => s.runId);
  const phase = useFinale((s) => s.phase);
  useEffect(() => {
    if (phase !== 'party') return;
    const top = cakeTopY(cakePieceCount(useProgress.getState().totalBricks()));
    emit('confetti', [0, top + 1, 0], 90);
    const a = setTimeout(() => emit('confetti', [-3, top, 0], 60), 400);
    const b = setTimeout(() => emit('confetti', [3, top, 0], 60), 800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [phase]);
  return (
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[6, 12, 10]} intensity={1.5} color="#FFE6C0" />
      <hemisphereLight args={['#9DB0FF', '#8ED06B', 0.55]} />
      <CameraRig />
      <Moon />
      <Ground />
      {BG_TREES.map((t, i) => <BrickTree key={i} position={t.p} scale={t.s} hue={t.h} rotY={i} age={AGE_INF} />)}
      <Balloons x={-6.2} z={-1.5} seed={0} />
      <Balloons x={6.2} z={-1.5} seed={2} />
      <Balloons x={-7.2} z={2.8} seed={4} />
      <Balloons x={7.2} z={2.8} seed={1} />
      <Table />
      <Throne />
      <Cake key={runId} />
      {SEATS.map((s, i) => <Guest key={s.id} s={s} index={i} partyHat={s.kind === 'pet'} />)}
      <Smoke key={`smoke${runId}`} />
      <Fireworks key={`fw${runId}`} />
      <Particles />
    </>
  );
}
