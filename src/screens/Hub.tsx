import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { CouponId, PersonId, ZoneId } from '../types';
import { ZONE_IDS } from '../types';
import { zones, brickGoal } from '../config/zones';
import { family } from '../config/family';
import { celebrationAge, isBirthday } from '../config/age';
import { useProgress } from '../state/progress';
import { useCoupons } from '../state/coupons';
import { useCloset } from '../state/closet';
import { useUi } from '../state/ui';
import { useSettings } from '../state/settings';
import { Button, Panel, palette } from '../ui/Button';
import { f, inset, u } from '../ui/scale';
import { Confetti } from '../ui/Confetti';
import { BrickIcon } from '../ui/Icons';
import { setMuted, sfx } from '../audio/engine';
import { registerPerf } from '../test/hooks';
import { canvasProps } from '../three/Brick';
import { Lights } from '../three/Lights';
import { CameraRig, type CameraRigHandle } from '../three/CameraRig';
import { Avatar } from '../three/Avatar';
import { Pet } from '../three/Pet';
import { Island, Life, ZoneMarkers } from '../three/Island';
import { Sparkles, emitSparkles } from '../three/Wand';
import { FACE_CAMERA, LUNA_POS, hostPos, layout, VIEW_AZIMUTH } from '../three/layout';
import { DigSpots } from './DigSpot';
import { Closet } from './Closet';
import { CouponBox } from './CouponBox';
import { CouponCard } from './CouponCard';

const HOSTS: { id: PersonId; zone: ZoneId }[] = [
  { id: 'mom', zone: 'story' },
  { id: 'julian', zone: 'science' },
  { id: 'darian', zone: 'tennis' },
  { id: 'dad', zone: 'music' },
];

const CANDLES = Math.min(9, Math.max(1, celebrationAge(family.luna.birthDate!)));
/** ?preview=1 shows every building (not just the built zones) so scenery can be reviewed before the zones ship. */
const PREVIEW_ALL = typeof location !== 'undefined' && new URLSearchParams(location.search).get('preview') === '1';
const BUILT_KEY = ZONE_IDS.map((z) => (zones[z].built || PREVIEW_ALL ? '1' : '0')).join('');

/** Samples frame times + draw calls and flags the scene as ready after a few frames. */
function Probe({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const st = useRef({ buf: new Float32Array(300), i: 0, n: 0, frames: 0, calls: 0, ready: false });
  useEffect(() => {
    registerPerf({
      avgFrameMs: () => {
        const s = st.current;
        if (s.n === 0) return 0;
        let sum = 0;
        for (let k = 0; k < s.n; k++) sum += s.buf[k];
        return sum / s.n;
      },
      drawCalls: () => st.current.calls,
    });
    return () => registerPerf(null);
  }, []);
  useFrame((_, dt) => {
    const s = st.current;
    s.buf[s.i] = dt * 1000;
    s.i = (s.i + 1) % s.buf.length;
    if (s.n < s.buf.length) s.n++;
    s.calls = gl.info.render.calls;
    if (!s.ready && ++s.frames > 3) {
      s.ready = true;
      onReady();
    }
  });
  return null;
}

/** Luna's wand leaves a faint trail of sparkles. */
function WandTrail() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.16) return;
    acc.current = 0;
    const c = Math.cos(FACE_CAMERA), s = Math.sin(FACE_CAMERA);
    const lx = -0.62, lz = 0.78;
    emitSparkles([LUNA_POS[0] + c * lx + s * lz, 1.75 + Math.sin(performance.now() / 300) * 0.05, LUNA_POS[2] - s * lx + c * lz], {
      count: 1, speed: 0.5, gravity: 1.2, size: 0.07, colors: ['#FFF3A0', '#FFFFFF', '#FF9CC8'],
    });
  });
  return null;
}

interface SceneProps {
  rigRef: React.RefObject<CameraRigHandle | null>;
  birthday: boolean;
  petHats: boolean;
  onZone: (z: ZoneId) => void;
  onReady: () => void;
  onConfetti: () => void;
  onDug: (id: CouponId) => void;
  rigEnabled: boolean;
}

function Scene({ rigRef, birthday, petHats, onZone, onReady, onConfetti, onDug, rigEnabled }: SceneProps) {
  const total = useProgress((s) => s.totalBricks());
  const tapGround = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    sfx('sparkle');
    emitSparkles([e.point.x, Math.max(0.2, e.point.y + 0.3), e.point.z], { count: 34 });
  };
  const hats = birthday || petHats;
  return (
    <>
      <Lights />
      <CameraRig apiRef={rigRef} enabled={rigEnabled} azimuth={VIEW_AZIMUTH} target={[0, 0.1, 0]} radius={20} />
      <Island builtKey={BUILT_KEY} totalBricks={total} candles={CANDLES} />
      <Life builtKey={BUILT_KEY} birthday={birthday} candles={CANDLES} />
      <mesh visible={false} position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} onClick={tapGround}>
        <planeGeometry args={[14, 14]} />
      </mesh>
      <ZoneMarkers onTap={onZone} />
      {HOSTS.map((h, i) => {
        const p = hostPos(h.zone, zones[h.zone].built || PREVIEW_ALL);
        return <Avatar key={h.id} id={h.id} wave scale={0.8} position={p} rotationY={FACE_CAMERA} phase={i * 1.3} />;
      })}
      <Avatar id="luna" wand scale={0.8} position={LUNA_POS} rotationY={FACE_CAMERA} phase={0.5} />
      <Pet id="rudolph" start={[2.0, 3.6]} partyHat={hats} seed={1} scale={0.75} />
      <Pet id="jinglebells" start={[-1.0, 3.8]} partyHat={hats} seed={2} scale={0.75} />
      <DigSpots onConfetti={onConfetti} onDug={onDug} />
      <Sparkles global />
      <WandTrail />
      <Probe onReady={onReady} />
    </>
  );
}

const hudBtn = { minWidth: 'var(--btn-min)', minHeight: 'var(--btn-min)', padding: `${u(6)} ${u(18)}` } as const;

export function Hub() {
  const setScreen = useUi((s) => s.setScreen);
  const muted = useSettings((s) => s.muted);
  const total = useProgress((s) => s.totalBricks());
  const bricks = useProgress((s) => s.bricks);
  const finaleSeen = useProgress((s) => s.finaleSeen);
  const goal = brickGoal();
  const goalReached = total >= goal;
  const equipped = useCloset((s) => s.equipped);
  const dug = useCoupons((s) => s.dug);
  const unredeemed = dug.length;

  const [soon, setSoon] = useState<(typeof zones)[ZoneId] | null>(null);
  const [overlay, setOverlay] = useState<'closet' | 'box' | null>(null);
  const [card, setCard] = useState<CouponId | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [ready, setReady] = useState(false);
  const flying = useRef(false);
  const rig = useRef<CameraRigHandle | null>(null);

  const birthday = useMemo(
    () => new URLSearchParams(location.search).get('birthday') === '1' || isBirthday(family.luna.birthDate!),
    [],
  );

  const enter = useCallback(
    (id: ZoneId) => {
      const z = zones[id];
      if (flying.current) return;
      if (!z.built) {
        sfx('oops');
        setSoon(z);
        return;
      }
      sfx('pop');
      flying.current = true;
      const l = layout[id];
      rig.current?.flyTo([l.pos[0], 1.2, l.pos[2]], { radius: 8, azimuth: l.ry, polar: 1.1 }, () => {
        flying.current = false;
        setScreen({ kind: 'zone', zone: id });
      });
    },
    [setScreen],
  );

  const onDug = useCallback((id: CouponId) => setCard(id), []);
  const onConfetti = useCallback(() => setConfetti((n) => n + 1), []);
  const paused = overlay !== null || card !== null;

  return (
    <div className="screen" data-testid="hub-screen" style={{ background: 'radial-gradient(circle at 86% 30%, #FFF6B0 0, #FFE45C 3.5%, rgba(255,228,92,0.35) 6%, rgba(255,228,92,0) 14%), linear-gradient(#4FAEFF 0%, #A9DCFF 55%, #E3F6FF 100%)' }}>
      <Canvas
        {...canvasProps}
        frameloop={paused ? 'never' : 'always'}
        camera={{ position: [10, 12, 14], fov: 38, near: 0.5, far: 140 }}
        data-testid="hub-canvas"
      >
        <Scene
          rigRef={rig}
          birthday={birthday}
          petHats={equipped.includes('pethats')}
          onZone={enter}
          onReady={() => setReady(true)}
          onConfetti={onConfetti}
          onDug={onDug}
          rigEnabled={!paused}
        />
      </Canvas>
      {ready && <div data-testid="hub-ready" style={{ display: 'none' }} data-birthday={birthday} />}

      <div style={{ position: 'absolute', top: inset('top', 12), left: inset('left', 12), display: 'flex', gap: u(12), zIndex: 40, alignItems: 'center' }}>
        <Button tone="cream" testId="home-button" style={hudBtn} onClick={() => setScreen({ kind: 'title' })}>Home</Button>
        <Button tone="cream" testId="mute-button" style={hudBtn} ariaLabel={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</Button>
        <div
          data-testid="brick-counter"
          style={{
            minHeight: 'var(--btn-min)', padding: `0 ${u(18)}`, display: 'flex', alignItems: 'center', gap: u(10), background: 'rgba(255,244,224,0.92)',
            border: `${u(3)} solid ${palette.navy}`, borderRadius: u(32), fontSize: f(22), fontWeight: 900, color: palette.navy, whiteSpace: 'nowrap',
          }}
        >
          <BrickIcon size={32} />
          <span>Birthday Bricks {total} of {goal}</span>
        </div>
      </div>

      <div style={{ position: 'absolute', top: inset('top', 12), right: inset('right', 12), display: 'flex', gap: u(12), zIndex: 40 }}>
        <Button tone="yellow" testId="coupon-box-open" style={{ ...hudBtn, position: 'relative' }} onClick={() => { sfx('tap'); setOverlay('box'); }}>
          🎟️ Coupons
          {unredeemed > 0 && (
            <span style={{ position: 'absolute', top: -10, right: -8, minWidth: 26, height: 26, borderRadius: 13, background: palette.red, color: '#fff', fontSize: 16, lineHeight: '20px', border: `3px solid ${palette.navy}` }}>
              {unredeemed}
            </span>
          )}
        </Button>
        <Button tone="pink" testId="closet-open" style={hudBtn} onClick={() => { sfx('tap'); setOverlay('closet'); }}>👗 Closet</Button>
      </div>

      {goalReached && !finaleSeen && (
        <div style={{ position: 'absolute', bottom: `calc(${inset('bottom', 12)} + ${u(96)})`, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 40, pointerEvents: 'none' }}>
          <Button
            big tone="pink" testId="finale-button"
            style={{ pointerEvents: 'auto', animation: 'finale-pulse 1s ease-in-out infinite' }}
            onClick={() => { sfx('fanfare'); setScreen({ kind: 'finale' }); }}
          >
            🎂 Time for the party!
          </Button>
          <style>{'@keyframes finale-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }'}</style>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: inset('bottom', 10), left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: u(10), zIndex: 40, padding: `0 calc(${u(10)} + var(--sal)) 0 calc(${u(10)} + var(--sar))`, pointerEvents: 'none' }}>
        {ZONE_IDS.map((id) => {
          const z = zones[id];
          const light = id === 'tennis';
          return (
            <button
              key={id}
              type="button"
              data-testid={`zone-${id}`}
              onClick={() => enter(id)}
              style={{
                pointerEvents: 'auto', minWidth: u(150), minHeight: `max(var(--btn-min), ${u(72)})`, padding: `${u(6)} ${u(14)}`, fontFamily: 'inherit', fontWeight: 900, fontSize: f(19), lineHeight: 1.15,
                color: !z.built ? '#6B7488' : light ? palette.navy : '#fff', background: z.built ? z.color : '#D5D9E0', border: `${u(4)} solid ${z.built ? palette.navy : '#9AA3B5'}`, borderRadius: u(24),
                boxShadow: `0 ${u(6)} 0 ${z.built ? palette.navy : '#9AA3B5'}`, cursor: 'pointer', opacity: 1,
                textShadow: !z.built || light ? 'none' : '0 2px 0 rgba(29,42,68,0.55)',
              }}
            >
              {z.title}
              <br />
              {z.built ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: u(6) }}>
                  <BrickIcon size={22} />
                  {bricks[id]}/{z.bricks}
                </span>
              ) : (
                <span aria-label="Coming soon" style={{ fontSize: f(16) }}>🚧</span>
              )}
            </button>
          );
        })}
      </div>

      {confetti > 0 && <Confetti key={confetti} />}

      {soon && (
        <div className="center-col" style={{ position: 'absolute', inset: 0, background: 'rgba(29,42,68,0.45)', zIndex: 70, padding: 'var(--sat) var(--sar) var(--sab) var(--sal)' }} data-testid="coming-soon-panel">
          <Panel style={{ textAlign: 'center', maxWidth: 520 }}>
            <div style={{ fontSize: u(72) }} aria-hidden>🏗️</div>
            <h2 style={{ margin: `0 0 ${u(8)}`, fontSize: f(48) }}>Coming soon!</h2>
            <p style={{ margin: `0 0 ${u(20)}`, fontSize: f(24) }}>The {soon.title} is still being built.</p>
            <Button testId="coming-soon-close" tone="mint" onClick={() => setSoon(null)}>OK!</Button>
          </Panel>
        </div>
      )}

      {overlay === 'closet' && <Closet onClose={() => setOverlay(null)} />}
      {overlay === 'box' && (
        <CouponBox
          onClose={() => setOverlay(null)}
          onOpenCard={(id) => {
            setOverlay(null);
            setCard(id);
          }}
        />
      )}
      {card && <CouponCard id={card} onClose={() => setCard(null)} />}
    </div>
  );
}

