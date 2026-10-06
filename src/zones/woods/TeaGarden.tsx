import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { B, Cone, Cy, mat, popScale, easeOutBack } from './fx';
import { Cat, Dog, FriendModel, Person, faceUrl } from './models';
import {
  TEA_CENTER, TREATS, cupWorldPos, endPour, giveTreat, guestTap, guestWorldPos, guestsFor, nextTeaTarget, replayTeaParty, seatAngle,
  startPour, stepTarget, useWoods, TREE_COUNT,
} from './woodsState';
import { playSting } from '../../audio/engine';
import { GUEST_EMOJI, GUEST_NAMES, type FriendId, type GuestId } from './facts';
import { LEVEL_PERFECT_MAX, LEVEL_PERFECT_MIN, levelAt } from './logic';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { sfx } from '../../audio/engine';
import { say } from '../../audio/speech';
import { Button, palette } from '../../ui/Button';
import { f, inset, u, ub } from '../../ui/scale';
import { hudButton } from './ui';

type V3 = [number, number, number];
const OPEN_CYL = new THREE.CylinderGeometry(1, 0.78, 1, 14, 1, true);
const cupMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', flatShading: true, side: THREE.DoubleSide });

const RING_CUP = new THREE.RingGeometry(0.2, 0.3, 28);
const RING_CUP_MAT = new THREE.MeshBasicMaterial({ color: '#FFD60A', side: THREE.DoubleSide });
const RING_IN = new THREE.RingGeometry(0.78, 0.98, 36);
const RING_OUT = new THREE.RingGeometry(0.98, 1.1, 36);
const RING_IN_MAT = new THREE.MeshBasicMaterial({ color: '#FFF4E0', side: THREE.DoubleSide });
const RING_OUT_MAT = new THREE.MeshBasicMaterial({ color: '#1D2A44', side: THREE.DoubleSide });

/** Cream-and-navy ring on the ground under the selected guest. */
function SelectRing() {
  const target = useWoods((st) => st.pourTarget);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.scale.setScalar(1.15 + Math.sin(clock.elapsedTime * 4) * 0.06); });
  if (!target) return null;
  const p = guestWorldPos(target);
  return (
    <group position={[p[0], 0.18, p[2]]}>
      <group ref={g}>
        <mesh rotation-x={-Math.PI / 2} geometry={RING_IN} material={RING_IN_MAT} />
        <mesh rotation-x={-Math.PI / 2} geometry={RING_OUT} material={RING_OUT_MAT} />
      </group>
    </group>
  );
}

/** Fill gauge attached to the cup being filled, with a symbol-based "Release!" cue in the success window. */
function CupGauge() {
  const pouring = useWoods((st) => st.pouring);
  const target = useWoods((st) => st.pourTarget);
  const fill = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pouring) return;
    let raf = 0;
    const tick = () => {
      const lv = levelAt((performance.now() - pouring.start) / 1000);
      const inWin = lv >= LEVEL_PERFECT_MIN && lv <= LEVEL_PERFECT_MAX;
      if (fill.current) fill.current.style.height = `${Math.min(100, lv * 100)}%`;
      if (cue.current) {
        cue.current.textContent = lv >= 1 ? '💦 Oops!' : inWin ? '✋ Release!' : lv < LEVEL_PERFECT_MIN ? '⏳ Keep going…' : '⚠ Almost full!';
        cue.current.style.background = inWin ? '#7AE582' : '#FFF4E0';
        cue.current.style.transform = inWin ? 'scale(1.12)' : 'scale(1)';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pouring]);
  if (!pouring || !target) return null;
  const c = cupWorldPos(target);
  const H = 'calc(150px * var(--ui-scale))';
  return (
    <Html position={[c[0] + 0.55, c[1] + 0.9, c[2]]} center zIndexRange={[30, 20]} style={{ pointerEvents: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, color: '#1D2A44', fontWeight: 900 }}>
        <div data-testid="pour-meter" style={{ position: 'relative', width: 'calc(38px * var(--ui-scale))', height: H, border: '4px solid #1D2A44', borderRadius: 16, background: '#FFF4E0', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${LEVEL_PERFECT_MIN * 100}%`, height: `${(LEVEL_PERFECT_MAX - LEVEL_PERFECT_MIN) * 100}%`, background: 'repeating-linear-gradient(45deg,#7AE582,#7AE582 6px,#5CCB68 6px,#5CCB68 12px)', borderTop: '3px solid #1D2A44', borderBottom: '3px solid #1D2A44' }} />
          <div ref={fill} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '0%', background: 'rgba(199,119,63,0.9)' }} />
        </div>
        <div ref={cue} style={{ whiteSpace: 'nowrap', fontSize: 'max(16px, calc(24px * var(--ui-scale)))', padding: '4px 12px', border: '3px solid #1D2A44', borderRadius: 16, background: '#FFF4E0', marginBottom: 4 }}>
          ⏳ Keep going…
        </div>
      </div>
    </Html>
  );
}

function Pop({ bornAt, position, rotY = 0, scale = 1, onTap, children }: { bornAt: number; position: V3; rotY?: number; scale?: number; onTap?: () => void; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const k = popScale((performance.now() - bornAt) / 1000, 0, 0.55) * scale;
    g.current?.scale.setScalar(k);
  });
  return <group ref={g} position={position} rotation={[0, rotY, 0]} onPointerDown={onTap}>{children}</group>;
}

function Cup({ g, filled, isTarget }: { g: GuestId; filled: boolean; isTarget: boolean }) {
  const pos = cupWorldPos(g);
  const liquid = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = liquid.current;
    if (!m) return;
    const { pouring } = useWoods.getState();
    const lv = filled ? 0.8 : isTarget && pouring ? Math.min(1, levelAt((performance.now() - pouring.start) / 1000)) : 0;
    m.scale.set(0.115, Math.max(0.0001, lv * 0.2), 0.115);
    m.position.y = 0.02 + (lv * 0.2) / 2;
  });
  return (
    <group position={pos} scale={1.25}>
      <mesh geometry={OPEN_CYL} material={cupMat} position={[0, 0.11, 0]} scale={[0.14, 0.22, 0.14]} />
      <Cy p={[0, 0.01, 0]} s={[0.1, 0.03, 0.1]} c="#FFFFFF" />
      <mesh ref={liquid} geometry={useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 12), [])} material={mat('#C7773F')} />
      <B p={[0.17, 0.12, 0]} s={[0.08, 0.1, 0.04]} c="#FF8FB8" />
      {isTarget && !filled && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]} geometry={RING_CUP} material={RING_CUP_MAT} />
      )}
    </group>
  );
}

function Treat({ g, kind }: { g: GuestId; kind: string }) {
  const list = guestsFor(TREE_COUNT);
  const a = seatAngle(Math.max(0, list.indexOf(g)), list.length);
  const p: V3 = [TEA_CENTER[0] + 1.1 * Math.sin(a), 0.97, TEA_CENTER[2] - 1.1 * Math.cos(a)];
  return (
    <group position={p}>
      <Cy p={[0, 0.015, 0]} s={[0.17, 0.03, 0.17]} c="#FFF4E0" />
      {kind === 'cookie' && <><Cy p={[0, 0.06, 0]} s={[0.12, 0.05, 0.12]} c="#C98E4A" /><B p={[0.03, 0.09, 0.02]} s={[0.03, 0.02, 0.03]} c="#4A2A18" /><B p={[-0.04, 0.09, -0.03]} s={[0.03, 0.02, 0.03]} c="#4A2A18" /></>}
      {kind === 'scone' && <><B p={[0, 0.07, 0]} s={[0.17, 0.08, 0.14]} c="#E2B26B" /><B p={[0, 0.115, 0]} s={[0.12, 0.03, 0.1]} c="#F4D79B" /></>}
      {kind === 'cake' && <><B p={[0, 0.07, 0]} s={[0.15, 0.1, 0.15]} c="#FF8FB8" /><B p={[0, 0.13, 0]} s={[0.15, 0.03, 0.15]} c="#FFFFFF" /><Cy p={[0, 0.16, 0]} s={[0.03, 0.04, 0.03]} c="#E63946" low /></>}
    </group>
  );
}

function Teapot() {
  const g = useRef<THREE.Group>(null);
  const stream = useRef<THREE.Mesh>(null);
  const rest: V3 = [TEA_CENTER[0], 0.96, TEA_CENTER[2] + 1.0];
  useFrame(({ clock }, dt) => {
    const o = g.current;
    if (!o) return;
    const { pouring, pourTarget } = useWoods.getState();
    const k = Math.min(1, dt * 8);
    if (pouring && pourTarget) {
      const c = cupWorldPos(pourTarget);
      o.position.x += (c[0] + 0.62 - o.position.x) * k;
      o.position.y += (1.55 - o.position.y) * k;
      o.position.z += (c[2] + 0.1 - o.position.z) * k;
      o.rotation.z += (0.55 - o.rotation.z) * k;
      if (stream.current) {
        stream.current.visible = true;
        stream.current.position.set(c[0], 1.38, c[2]);
        stream.current.scale.set(0.05, 0.4, 0.05);
      }
    } else {
      o.position.x += (rest[0] - o.position.x) * k;
      o.position.y += (rest[1] + Math.sin(clock.elapsedTime * 2) * 0.02 - o.position.y) * k;
      o.position.z += (rest[2] - o.position.z) * k;
      o.rotation.z += (0 - o.rotation.z) * k;
      if (stream.current) stream.current.visible = false;
    }
  });
  const pink = '#FF5CA8';
  return (
    <>
      <group ref={g} position={rest} onPointerDown={() => startPour()}>
        <group position={[0, 0.3, 0]} scale={1.15}>
          <RoundedBox args={[0.7, 0.5, 0.5]} radius={0.17} smoothness={2} material={mat(pink)} />
          <B p={[0, 0.0, 0.255]} s={[0.5, 0.1, 0.02]} c="#FFFFFF" />
          <B p={[0, 0.3, 0]} s={[0.4, 0.1, 0.34]} c="#FF8FC4" />
          <Cy p={[0, 0.4, 0]} s={[0.07, 0.1, 0.07]} c="#FFD60A" low />
          <B p={[-0.42, 0.08, 0]} s={[0.26, 0.1, 0.1]} c={pink} r={[0, 0, 0.55]} />
          <B p={[0.4, 0.05, 0]} s={[0.08, 0.34, 0.12]} c="#FF8FC4" />
          <B p={[0.3, 0.2, 0]} s={[0.2, 0.08, 0.12]} c="#FF8FC4" />
          <B p={[0.3, -0.12, 0]} s={[0.2, 0.08, 0.12]} c="#FF8FC4" />
        </group>
      </group>
      <mesh ref={stream} geometry={useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])} material={mat('#C7773F')} visible={false} />
    </>
  );
}

function Table() {
  const [cx, , cz] = TEA_CENTER;
  const studs = useMemo(() => Array.from({ length: 16 }, (_, i) => [Math.cos((i / 16) * Math.PI * 2) * 2.05, Math.sin((i / 16) * Math.PI * 2) * 2.05] as [number, number]), []);
  return (
    <group position={[cx, 0, cz]}>
      <Cy p={[0, 0.35, 0]} s={[0.7, 0.7, 0.7]} c="#E63946" />
      <Cy p={[0, 0.04, 0]} s={[1.1, 0.08, 1.1]} c="#C22F3B" />
      <Cy p={[0, 0.8, 0]} s={[2.35, 0.16, 2.35]} c="#FFF4E0" />
      <Cy p={[0, 0.9, 0]} s={[2.24, 0.06, 2.24]} c="#FF8FB8" />
      {studs.map(([x, z], i) => <Cy key={i} p={[x, 0.96, z]} s={[0.08, 0.05, 0.08]} c={i % 2 ? '#FFD60A' : '#FFFFFF'} low />)}
    </group>
  );
}

function Flowers() {
  const pts = useMemo(() => {
    const out: { p: V3; c: string }[] = [];
    const cols = ['#FF5CA8', '#E63946', '#3A86FF', '#FFD60A', '#FFFFFF'];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + 0.2;
      const r = 7.0 + (i % 3) * 0.4;
      out.push({ p: [TEA_CENTER[0] + Math.cos(a) * r, 0, TEA_CENTER[2] + Math.sin(a) * r * 0.9], c: cols[i % cols.length] });
    }
    return out;
  }, []);
  return <>{pts.map((f, i) => (
    <group key={i} position={f.p}>
      <B p={[0, 0.2, 0]} s={[0.05, 0.4, 0.05]} c="#3FAE49" />
      <B p={[0, 0.44, 0]} s={[0.22, 0.14, 0.22]} c={f.c} />
      <B p={[0, 0.5, 0]} s={[0.08, 0.06, 0.08]} c="#FFD60A" />
    </group>
  ))}</>;
}

function Marker({ g }: { g: GuestId }) {
  const m = useRef<THREE.Group>(null);
  const c = cupWorldPos(g);
  useFrame(({ clock }) => { if (m.current) m.current.position.y = 1.75 + Math.sin(clock.elapsedTime * 5) * 0.1; });
  return <group ref={m} position={[c[0], 1.75, c[2]]} rotation={[Math.PI, 0, 0]}><Cone s={[0.16, 0.3, 0.16]} c="#FFD60A" /></group>;
}

/** The rising tea garden: pad, table, teapot, cups, treats and every guest. */
export function TeaGardenScene() {
  const teaStartAt = useWoods((s) => s.teaStartAt);
  const tea = useWoods((s) => s.tea);
  const treat = useWoods((s) => s.treat);
  const target = useWoods((s) => s.pourTarget);
  const celebrating = useWoods((s) => s.celebrating);
  const rise = useRef<THREE.Group>(null);
  const pad = useRef<THREE.Group>(null);
  const guests = guestsFor(TREE_COUNT);
  useFrame(() => {
    const t = (performance.now() - teaStartAt) / 1000;
    const k = easeOutBack(Math.min(1, t / 1.3));
    if (rise.current) {
      rise.current.position.y = -2.2 * (1 - Math.min(1, t / 1.3));
      rise.current.scale.setScalar(Math.max(0.001, k));
    }
    if (pad.current) pad.current.scale.set(Math.max(0.001, Math.min(1, t / 0.9)), 1, Math.max(0.001, Math.min(1, t / 0.9)));
  });
  const treatKinds = useMemo(() => Object.fromEntries(guests.map((g, i) => [g, TREATS[i % 3].id])), [guests]);
  return (
    <group>
      <group ref={pad} position={[TEA_CENTER[0], 0, TEA_CENTER[2]]}>
        <Cy p={[0, 0.03, 0]} s={[6.4, 0.08, 6.2]} c="#E7C48E" />
        <Cy p={[0, 0.09, 0]} s={[6.0, 0.06, 5.8]} c="#F3DCB4" />
      </group>
      <Flowers />
      <group ref={rise}>
        <group>
          <Table />
          <Teapot />
          {guests.map((g) => (
            <group key={g}>
              <Cup g={g} filled={!!tea[g]} isTarget={target === g} />
              {treat[g] && <Treat g={g} kind={treatKinds[g]} />}
            </group>
          ))}
          {target && !celebrating && <Marker g={target} />}
        </group>
      </group>
      {!celebrating && <SelectRing />}
      {!celebrating && <CupGauge />}
      {guests.map((g, i) => {
        const p = guestWorldPos(g);
        const yaw = Math.atan2(TEA_CENTER[0] - p[0], TEA_CENTER[2] + 0.5 - p[2]);
        const bornAt = teaStartAt + 1300 + i * 170;
        const happy = !!tea[g] && !!treat[g];
        if (g === 'rudolph') return <Pop key={g} bornAt={bornAt} position={p} rotY={yaw} scale={1.1} onTap={() => guestTap(g)}><Dog position={[0, 0, 0]} bob={happy} /></Pop>;
        if (g === 'jinglebells') return <Pop key={g} bornAt={bornAt} position={p} rotY={yaw} scale={1.15} onTap={() => guestTap(g)}><Cat position={[0, 0, 0]} bob={happy} /></Pop>;
        if (g === 'mom' || g === 'dad' || g === 'julian' || g === 'darian') return <Person key={g} scale={1.0} id={g} position={p} rotY={yaw} bornAt={bornAt} happy={happy} onTap={() => guestTap(g)} />;
        return <Pop key={g} bornAt={bornAt} position={p} rotY={yaw} scale={1.35} onTap={() => guestTap(g)}><FriendModel type={g as FriendId} /></Pop>;
      })}
    </group>
  );
}

// ---- HUD -----------------------------------------------------------------------------------------
function GuestFace({ g, size }: { g: GuestId; size: string }) {
  const [bad, setBad] = useState(false);
  const emoji = GUEST_EMOJI[g];
  return emoji || bad ? (
    <span style={{ fontSize: f(36), lineHeight: 1 }}>{emoji ?? GUEST_NAMES[g][0]}</span>
  ) : (
    <img src={faceUrl(g)} alt="" style={{ width: size, height: size, borderRadius: u(16), objectFit: 'cover' }} onError={() => setBad(true)} />
  );
}

function Chip({ g }: { g: GuestId }) {
  const hasTea = useWoods((s) => !!s.tea[g]);
  const hasTreat = useWoods((s) => !!s.treat[g]);
  const isTarget = useWoods((s) => s.pourTarget === g);
  const done = hasTea && hasTreat;
  return (
    <button
      type="button"
      data-testid={`guest-${g}`}
      aria-label={GUEST_NAMES[g]}
      aria-pressed={isTarget}
      onClick={() => guestTap(g)}
      style={{
        position: 'relative', width: ub(66), height: ub(66), borderRadius: u(22), padding: u(0), cursor: 'pointer', flex: '0 0 auto',
        border: `${u(4)} solid ${isTarget ? '#FF5CA8' : palette.navy}`,
        background: done ? '#C9F7D0' : '#FFF4E0', boxShadow: isTarget ? `0 0 0 ${u(4)} #FFD60A` : `0 ${u(3)} 0 ${palette.navy}`,
        transform: isTarget ? 'translateY(-4px) scale(1.06)' : undefined, transition: 'transform .12s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <GuestFace g={g} size="86%" />
      {(hasTea || hasTreat) && (
        <span style={{ position: 'absolute', right: u(-6), top: u(-8), display: 'flex', gap: u(1), fontSize: f(15), background: done ? '#7AE582' : '#fff', border: `${u(2)} solid ${palette.navy}`, borderRadius: u(12), padding: `0 ${u(3)}` }}>
          {done ? '✓' : (<>{hasTea && '☕'}{hasTreat && '🍪'}</>)}
        </span>
      )}
    </button>
  );
}

const arrowBtn: React.CSSProperties = { width: ub(64), height: ub(64), fontSize: f(30), borderRadius: u(24) };

/** One bottom panel: who is selected, what they still need, the treats, and the pour control. */
function ServePanel({ pouring }: { pouring: boolean }) {
  const selected = useWoods((s) => s.pourTarget);
  const tea = useWoods((s) => s.tea);
  const treat = useWoods((s) => s.treat);
  const guests = guestsFor(TREE_COUNT);
  const holdAt = useRef(0);
  const g = selected ?? guests[0];
  const needsTea = !tea[g];
  const needsTreat = !treat[g];

  useEffect(() => {
    if (!selected) useWoods.setState({ pourTarget: nextTeaTarget() ?? guests[0] });
  }, [selected, guests]);

  // Hold-to-pour: letting go after a real hold stops the pour. A quick tap leaves it running; tap again to stop.
  useEffect(() => {
    const up = () => {
      if (holdAt.current && performance.now() - holdAt.current > 380) endPour();
      holdAt.current = 0;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const need = (done: boolean, icon: string, label: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: u(4), opacity: done ? 0.55 : 1, textDecoration: done ? 'line-through' : 'none', fontWeight: 800 }}>
      <span aria-hidden>{icon}</span>{label}{done && <span aria-label="done"> ✓</span>}
    </span>
  );

  return (
    <div
      data-testid="serve-panel"
      style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: inset('bottom', 10), zIndex: 60, width: 'min(96vw, 1040px)',
        background: 'rgba(255,244,224,0.96)', border: `${u(4)} solid ${palette.navy}`, borderRadius: u(30), boxShadow: `0 ${u(6)} 0 ${palette.navy}`,
        padding: u(10), display: 'flex', flexDirection: 'column', gap: u(8),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: u(12) }}>
        <button
          type="button"
          data-testid="pour-btn"
          aria-label={pouring ? 'Release! Stop pouring' : 'Pour tea'}
          onPointerDown={(e) => {
            e.preventDefault();
            if (useWoods.getState().pouring) { endPour(); holdAt.current = 0; return; }
            holdAt.current = performance.now();
            startPour();
          }}
          style={{
            ...hudButton(pouring ? '#FFD60A' : '#FF5CA8'), color: pouring ? palette.navy : '#fff', width: ub(190), height: ub(88), fontSize: f(26), lineHeight: 1.05,
            borderRadius: u(28), touchAction: 'none', flexDirection: 'column', flex: '0 0 auto',
          }}
        >
          {pouring ? '✋ Release!' : '🫖 Pour tea'}
          <span style={{ fontSize: f(15), fontWeight: 700 }}>{pouring ? 'tap or let go' : 'tap or hold'}</span>
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: u(10), minWidth: 0 }}>
          <button type="button" data-testid="guest-prev" aria-label="Previous guest" onClick={() => stepTarget(-1)} style={{ ...hudButton('#FFF4E0'), ...arrowBtn, flex: '0 0 auto' }}>◀</button>
          <div data-testid="selected-guest" style={{ display: 'flex', alignItems: 'center', gap: u(10), minWidth: 0 }}>
            <GuestFace g={g} size={ub(56)} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: f(26), fontWeight: 900 }}>{GUEST_NAMES[g]}</div>
              <div style={{ fontSize: f(19), display: 'flex', gap: u(10), flexWrap: 'wrap' }}>
                {!needsTea && !needsTreat ? <span style={{ fontWeight: 800 }}>All set! ✓</span> : (<>Needs {need(!needsTea, '☕', 'tea')}{need(!needsTreat, '🍪', 'treat')}</>)}
              </div>
            </div>
          </div>
          <button type="button" data-testid="guest-next" aria-label="Next guest" onClick={() => stepTarget(1)} style={{ ...hudButton('#FFF4E0'), ...arrowBtn, flex: '0 0 auto' }}>▶</button>
        </div>
        <div style={{ display: 'flex', gap: u(8), flex: '0 0 auto' }}>
          {TREATS.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`treat-${t.id}`}
              aria-label={`Give ${t.label} to ${GUEST_NAMES[g]}`}
              onClick={() => giveTreat(t.id)}
              style={{ ...hudButton('#FFE3F0'), width: ub(76), height: ub(76), fontSize: f(38), borderRadius: u(24), opacity: needsTreat ? 1 : 0.5 }}
            >
              {t.emoji}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: u(6), paddingTop: u(6), flexWrap: 'nowrap', overflow: 'visible' }}>
        {guests.map((x) => <Chip key={x} g={x} />)}
      </div>
    </div>
  );
}

function BrickIcon({ size = 120 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size * 0.62, animation: 'woods-bounce 0.9s ease-in-out infinite' }}>
      <div style={{ position: 'absolute', inset: 0, top: size * 0.12, background: '#FF5CA8', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(14) }} />
      {[0.16, 0.5, 0.84].map((x, i) => (
        <div key={i} style={{ position: 'absolute', left: `${x * 100 - 9}%`, top: u(0), width: '18%', height: size * 0.18, background: '#FF8FC4', border: `${u(4)} solid ${palette.navy}`, borderRadius: u(8) }} />
      ))}
    </div>
  );
}

export function TeaHud() {
  const setScreen = useUi((s) => s.setScreen);
  const bricks = useProgress((s) => s.bricks.woods);
  const pouring = useWoods((s) => s.pouring);
  const lastPour = useWoods((s) => s.lastPour);
  const celebrating = useWoods((s) => s.celebrating);
  const firstBrick = useWoods((s) => s.firstBrick);

  useEffect(() => {
    if (celebrating) void playSting('celebrate');
  }, [celebrating]);

  // Auto-finish (splash!) when the cup overflows.
  useEffect(() => {
    if (!pouring) return;
    let raf = 0;
    const tick = () => {
      if (levelAt((performance.now() - pouring.start) / 1000) >= 1) { endPour(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pouring]);

  const [badge, setBadge] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!lastPour) return;
    const text = lastPour.result === 'perfect' ? 'Perfect!' : lastPour.result === 'splash' ? 'Splash!' : lastPour.result === 'ok' ? 'Nice!' : 'A bit more!';
    setBadge({ id: lastPour.id, text });
    const t = setTimeout(() => setBadge(null), 2200);
    return () => clearTimeout(t);
  }, [lastPour]);

  return (
    <>
      <ServePanel pouring={!!pouring} />
      {badge && (
        <div key={badge.id} data-testid="pour-result" style={{ position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)', zIndex: 70, fontSize: f(64), fontWeight: 900, color: '#fff', WebkitTextStroke: `${u(3)} ${palette.navy}`, textShadow: `0 ${u(6)} 0 ${palette.navy}`, animation: 'woods-pop 1.4s ease-out forwards', pointerEvents: 'none' }}>
          {badge.text}
        </div>
      )}
      {celebrating && (
        <div data-testid="brick-celebration" style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,0.35)' }}>
          <div style={{ background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(10)} 0 ${palette.navy}`, padding: `${u(28)} ${u(44)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(16), maxWidth: u(760) }}>
            <BrickIcon />
            <div data-testid="celebration-text" style={{ fontSize: f(44), fontWeight: 900, textAlign: 'center', color: palette.navy }}>
              {firstBrick ? 'You earned a Birthday Brick!' : 'What a lovely tea party!'}
            </div>
            <div style={{ fontSize: f(26), fontWeight: 700, textAlign: 'center' }}>
              {firstBrick ? 'The whole forest says thank you, Luna!' : 'Everybody is full of tea and giggles.'}
            </div>
            <div style={{ display: 'flex', gap: u(14), flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button testId="replay-tea" tone="mint" onClick={() => { sfx('tap'); void say('Another tea party!', { speaker: 'luna' }); replayTeaParty(); }}>Tea party again</Button>
              {bricks >= 1 && <Button testId="challenge-btn-celebration" tone="yellow" onClick={() => setScreen({ kind: 'challenge', zone: 'woods' })}>Tea Party Orders challenge</Button>}
              <Button testId="back-to-island-celebration" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

