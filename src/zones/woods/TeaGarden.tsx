import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { B, Cone, Cy, mat, popScale, easeOutBack } from './fx';
import { Cat, Dog, FriendModel, Person, faceUrl } from './models';
import {
  TEA_CENTER, TREATS, cupWorldPos, endPour, guestTap, guestWorldPos, guestsFor, replayTeaParty, seatAngle,
  selectTreat, startPour, useWoods, TREE_COUNT,
} from './woodsState';
import { playSting } from '../../audio/engine';
import { GUEST_EMOJI, GUEST_NAMES, type FriendId, type GuestId } from './facts';
import { LEVEL_PERFECT_MAX, LEVEL_PERFECT_MIN, levelAt } from './logic';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { sfx } from '../../audio/engine';
import { say } from '../../audio/speech';
import { Button, palette } from '../../ui/Button';
import { hudButton } from './ui';

type V3 = [number, number, number];
const OPEN_CYL = new THREE.CylinderGeometry(1, 0.78, 1, 14, 1, true);
const cupMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', flatShading: true, side: THREE.DoubleSide });

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
function Chip({ g }: { g: GuestId }) {
  const hasTea = useWoods((s) => !!s.tea[g]);
  const hasTreat = useWoods((s) => !!s.treat[g]);
  const isTarget = useWoods((s) => s.pourTarget === g);
  const pickingTreat = useWoods((s) => s.selectedTreat !== null);
  const [bad, setBad] = useState(false);
  const emoji = GUEST_EMOJI[g];
  const done = hasTea && hasTreat;
  return (
    <button
      type="button"
      data-testid={`guest-${g}`}
      aria-label={GUEST_NAMES[g]}
      onClick={() => guestTap(g)}
      style={{
        position: 'relative', width: 72, height: 72, borderRadius: 24, padding: 0, cursor: 'pointer',
        border: `4px solid ${isTarget && !pickingTreat ? '#FFD60A' : palette.navy}`,
        background: done ? '#C9F7D0' : '#FFF4E0', boxShadow: `0 4px 0 ${palette.navy}`, flex: '0 0 auto',
        outline: isTarget && !pickingTreat ? '3px solid #FF5CA8' : 'none',
      }}
    >
      {emoji || bad ? (
        <span style={{ fontSize: 40, lineHeight: '56px' }}>{emoji ?? GUEST_NAMES[g][0]}</span>
      ) : (
        <img src={faceUrl(g)} alt="" width={56} height={56} style={{ borderRadius: 16, objectFit: 'cover' }} onError={() => setBad(true)} />
      )}
      <span style={{ position: 'absolute', left: -2, right: -2, bottom: -14, display: 'flex', justifyContent: 'center', gap: 2, fontSize: 18 }}>
        <span style={{ opacity: hasTea ? 1 : 0.28 }}>☕</span>
        <span style={{ opacity: hasTreat ? 1 : 0.28 }}>🍪</span>
      </span>
    </button>
  );
}

function BrickIcon({ size = 120 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size * 0.62, animation: 'woods-bounce 0.9s ease-in-out infinite' }}>
      <div style={{ position: 'absolute', inset: 0, top: size * 0.12, background: '#FF5CA8', border: `5px solid ${palette.navy}`, borderRadius: 14 }} />
      {[0.16, 0.5, 0.84].map((x, i) => (
        <div key={i} style={{ position: 'absolute', left: `${x * 100 - 9}%`, top: 0, width: '18%', height: size * 0.18, background: '#FF8FC4', border: `4px solid ${palette.navy}`, borderRadius: 8 }} />
      ))}
    </div>
  );
}

export function TeaHud() {
  const setScreen = useUi((s) => s.setScreen);
  const bricks = useProgress((s) => s.bricks.woods);
  const pouring = useWoods((s) => s.pouring);
  const lastPour = useWoods((s) => s.lastPour);
  const treatChoice = useWoods((s) => s.selectedTreat);
  const celebrating = useWoods((s) => s.celebrating);
  const firstBrick = useWoods((s) => s.firstBrick);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (celebrating) void playSting('celebrate');
  }, [celebrating]);

  // Drive the on-screen meter, and auto-finish (splash!) when the cup overflows.
  useEffect(() => {
    if (!pouring) { setLevel(0); return; }
    let raf = 0;
    const tick = () => {
      const lv = levelAt((performance.now() - pouring.start) / 1000);
      setLevel(lv);
      if (lv >= 1) { endPour(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pouring]);

  useEffect(() => {
    const up = () => endPour();
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const [badge, setBadge] = useState<{ id: number; text: string } | null>(null);
  useEffect(() => {
    if (!lastPour) return;
    const text = lastPour.result === 'perfect' ? 'Perfect!' : lastPour.result === 'splash' ? 'Splash!' : lastPour.result === 'ok' ? 'Nice!' : 'A bit more!';
    setBadge({ id: lastPour.id, text });
    const t = setTimeout(() => setBadge(null), 2200);
    return () => clearTimeout(t);
  }, [lastPour]);

  const guests = guestsFor(TREE_COUNT);
  const pct = (v: number) => `${Math.min(100, (v / 1.0) * 100)}%`;
  return (
    <>
      {/* Pour controls */}
      <div style={{ position: 'absolute', left: 22, bottom: 140, zIndex: 60, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: palette.navy, textShadow: '0 2px 0 #fff' }}>Let go in the green!</div>
        <div data-testid="pour-meter" style={{ width: 150, height: 30, border: `4px solid ${palette.navy}`, borderRadius: 16, background: '#FFF4E0', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct(LEVEL_PERFECT_MIN), width: pct(LEVEL_PERFECT_MAX - LEVEL_PERFECT_MIN), background: '#7AE582' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: pct(level), background: 'rgba(199,119,63,0.85)' }} />
        </div>
        <button
          type="button"
          data-testid="pour-btn"
          onPointerDown={(e) => { e.preventDefault(); startPour(); }}
          style={{ ...hudButton('#FF5CA8'), width: 150, height: 96, fontSize: 24, borderRadius: 30, touchAction: 'none' }}
        >
          🫖 Hold to pour
        </button>
      </div>
      {/* Treats */}
      <div style={{ position: 'absolute', right: 22, bottom: 140, zIndex: 60, display: 'flex', gap: 10 }}>
        {TREATS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={`treat-${t.id}`}
            aria-label={t.label}
            onClick={() => selectTreat(treatChoice === t.id ? null : t.id)}
            style={{ ...hudButton(treatChoice === t.id ? '#FFD60A' : '#FFF4E0'), width: 84, height: 84, fontSize: 44, borderRadius: 28 }}
          >
            {t.emoji}
          </button>
        ))}
      </div>
      {/* Guest bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, zIndex: 60, display: 'flex', justifyContent: 'center', gap: 6, padding: '0 10px' }}>
        {guests.map((g) => <Chip key={g} g={g} />)}
      </div>
      {badge && (
        <div key={badge.id} data-testid="pour-result" style={{ position: 'absolute', left: '50%', top: '38%', transform: 'translate(-50%,-50%)', zIndex: 70, fontSize: 64, fontWeight: 900, color: '#fff', WebkitTextStroke: `3px ${palette.navy}`, textShadow: `0 6px 0 ${palette.navy}`, animation: 'woods-pop 1.4s ease-out forwards', pointerEvents: 'none' }}>
          {badge.text}
        </div>
      )}
      {celebrating && (
        <div data-testid="brick-celebration" style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,0.35)' }}>
          <div style={{ background: palette.cream, border: `5px solid ${palette.navy}`, borderRadius: 36, boxShadow: `0 10px 0 ${palette.navy}`, padding: '28px 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 760 }}>
            <BrickIcon />
            <div data-testid="celebration-text" style={{ fontSize: 44, fontWeight: 900, textAlign: 'center', color: palette.navy }}>
              {firstBrick ? 'You earned a Birthday Brick!' : 'What a lovely tea party!'}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, textAlign: 'center' }}>
              {firstBrick ? 'The whole forest says thank you, Luna!' : 'Everybody is full of tea and giggles.'}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
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

