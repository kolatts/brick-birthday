import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { sfx } from '../../audio/engine';
import { say } from '../../audio/speech';
import { Button, palette } from '../../ui/Button';
import { f, inset, maxDpr, u, ub } from '../../ui/scale';
import { Icon, BrickIcon } from '../../ui/Icons';
import { FitFov } from '../../three/FitFov';
import { BASE_URL } from '../../env';
import { CourtScene } from './Scene';
import {
  challengeGo, disposeGame, initGame, startGame, tapGame, toggleWand, useTennis,
} from './game';
import { GOALS, type Mode } from './logic';
import { BRICK_LINE, BURIED_LINE, CHALLENGE_INTRO, WELCOME } from './lines';

const SKY = 'linear-gradient(180deg, #5EBBFF 0%, #A9E0FF 45%, #E8F7FF 75%, #CFF2B8 100%)';

const CSS = `
@keyframes tn-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes tn-glow { 0%,100% { box-shadow: 0 6px 0 #1D2A44, 0 0 14px 4px rgba(255,214,10,.8); } 50% { box-shadow: 0 6px 0 #1D2A44, 0 0 32px 12px rgba(255,236,120,1); } }
@keyframes tn-bubble { 0% { transform: translateX(-50%) translateY(-10px) scale(.9); opacity: 0; } 100% { transform: translateX(-50%); opacity: 1; } }
@keyframes tn-bounce { 0%,100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-14px) rotate(3deg); } }
`;

const panel = {
  background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(10)} 0 ${palette.navy}`,
  padding: `${u(24)} ${u(40)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(14), maxWidth: u(780), color: palette.navy, textAlign: 'center',
} as const;

function Counter({ goal }: { goal: number }) {
  const rally = useTennis((s) => s.rally);
  return (
    <div data-testid="rally-counter" style={{ background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(30), boxShadow: `0 ${u(6)} 0 ${palette.navy}`, padding: `${u(6)} ${u(24)}`, color: palette.navy, minHeight: u(72), display: 'flex', alignItems: 'baseline', gap: u(12) }}>
      <span style={{ fontSize: f(48), fontWeight: 900, lineHeight: 1.2 }}>Rally: {rally}</span>
      <span style={{ fontSize: f(24), fontWeight: 800, opacity: 0.7 }}>/ {goal}</span>
    </div>
  );
}

function Caption() {
  const caption = useTennis((s) => s.caption);
  if (!caption) return null;
  return (
    <div
      key={caption.id}
      data-testid="caption"
      style={{ position: 'absolute', top: inset('top', 14), left: '50%', transform: 'translateX(-50%)', zIndex: 40, background: '#fff', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(8)} 0 ${palette.navy}`, padding: `${u(10)} ${u(28)}`, textAlign: 'center', color: palette.navy, animation: 'tn-bubble .25s ease-out', pointerEvents: 'none', maxWidth: '44vw' }}
    >
      <div style={{ fontSize: f(18), fontWeight: 900, color: '#2F6FE0', letterSpacing: u(1), textTransform: 'uppercase' }}>Darian</div>
      <div style={{ fontSize: f(26), fontWeight: 800, lineHeight: 1.2 }}>{caption.text}</div>
    </div>
  );
}

function Sticker({ size }: { size: number }) {
  return (
    <img
      src={`${BASE_URL}art/coupon-scene-shopping.webp`}
      alt=""
      draggable={false}
      data-testid="coupon-sticker"
      style={{ width: f(size), height: f(size), objectFit: 'contain', borderRadius: u(10), flex: '0 0 auto' }}
    />
  );
}

export function CourtGame({ mode }: { mode: Mode }) {
  const setScreen = useUi((s) => s.setScreen);
  const bricks = useProgress((s) => s.bricks.tennis);
  const celebrating = useTennis((s) => s.celebrating);
  const firstBrick = useTennis((s) => s.firstBrick);
  const started = useTennis((s) => s.started);
  const wand = useTennis((s) => s.wand);
  const challengeDone = useTennis((s) => s.challengeDone);
  const goal = GOALS[mode];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initGame(mode);
    setReady(true);
    if (mode === 'zone') startGame();
    return () => disposeGame();
  }, [mode]);

  const blocked = celebrating || challengeDone || !started;

  return (
    <div className="screen" data-testid={mode === 'zone' ? 'zone-screen-tennis' : 'challenge-screen-tennis'} style={{ background: SKY, overflow: 'hidden', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <style>{CSS}</style>
      <div
        data-testid="court-tap"
        role="button"
        aria-label="Tap anywhere to swing the racket"
        onPointerDown={(e) => { e.preventDefault(); tapGame(); }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Canvas dpr={[1, maxDpr()]} camera={{ position: [0, 7.4, 17.6], fov: 40, near: 0.1, far: 90 }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }}>
          <FitFov base={40} />
          {ready && <CourtScene />}
        </Canvas>
      </div>

      <div style={{ position: 'absolute', top: inset('top', 14), left: inset('left', 18), zIndex: 30, display: 'flex', flexDirection: 'column', gap: u(8), alignItems: 'flex-start', pointerEvents: 'none' }}>
        <Counter goal={goal} />
        <div data-testid="goal-banner" style={{ background: mode === 'challenge' ? palette.yellow : '#fff', border: `${u(4)} solid ${palette.navy}`, borderRadius: u(24), padding: `${u(4)} ${u(16)}`, fontSize: f(20), fontWeight: 800, color: palette.navy, display: 'flex', alignItems: 'center', gap: u(8), maxWidth: u(560) }}>
          {mode === 'challenge' ? <><Sticker size={34} />Coupon challenge: {goal} in a row!</> : <><BrickIcon size={26} />Earn a Birthday Brick: {goal} rallies in a row</>}
        </div>
      </div>

      <div style={{ position: 'absolute', top: inset('top', 14), right: inset('right', 18), zIndex: 50 }}>
        <Button testId="back-to-island" tone="cream" onClick={() => { sfx('tap'); setScreen({ kind: 'hub' }); }}>Back to island</Button>
      </div>

      <Caption />

      {/* bottom bar */}
      <div style={{ position: 'absolute', left: inset('left', 18), right: inset('right', 18), bottom: inset('bottom', 18), zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          {mode === 'zone' && bricks >= 1 && !celebrating && (
            <button
              type="button"
              data-testid="challenge-btn"
              onClick={() => { sfx('tap'); setScreen({ kind: 'challenge', zone: 'tennis' }); }}
              style={{ display: 'flex', alignItems: 'center', gap: u(12), minHeight: 'var(--btn-min)', background: palette.yellow, color: palette.navy, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(28), boxShadow: `0 ${u(6)} 0 ${palette.navy}`, padding: `${u(8)} ${u(20)} ${u(8)} ${u(10)}`, fontFamily: 'inherit', fontSize: f(22), fontWeight: 900, cursor: 'pointer', textAlign: 'left', maxWidth: u(360) }}
            >
              <Sticker size={56} />
              <span>Coupon challenge: win the Shopping coupon!</span>
            </button>
          )}
        </div>
        <div style={{ pointerEvents: 'none', alignSelf: 'center', background: 'rgba(255,255,255,0.85)', border: `${u(4)} solid ${palette.navy}`, borderRadius: u(26), padding: `${u(6)} ${u(22)}`, fontSize: f(26), fontWeight: 900, color: palette.navy, marginBottom: u(6) }} data-testid="hint">
          {WELCOME}
        </div>
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(4) }}>
          <button
            type="button"
            data-testid="wand-btn"
            aria-label="Magic wand: sparkle trail"
            aria-pressed={wand}
            disabled={blocked}
            onClick={() => toggleWand()}
            style={{ width: ub(96), height: ub(96), borderRadius: '50%', background: wand ? '#FF8FD0' : '#FFE65C', color: palette.navy, border: `${u(4)} solid ${palette.navy}`, boxShadow: `0 ${u(6)} 0 ${palette.navy}`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', animation: wand ? 'tn-glow 1s ease-in-out infinite' : undefined, opacity: blocked ? 0.5 : 1 }}
          >
            <Icon id="star" size="66%" />
          </button>
          <span style={{ fontWeight: 900, fontSize: f(18), color: palette.navy, textShadow: '0 0 6px #fff, 0 0 6px #fff' }}>{wand ? 'Sparkle ball!' : 'Sparkles'}</span>
        </div>
      </div>

      {/* challenge intro */}
      {mode === 'challenge' && !started && !challengeDone && (
        <div data-testid="challenge-intro" style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,0.35)' }}>
          <div style={panel}>
            <Sticker size={150} />
            <div style={{ fontSize: f(42), fontWeight: 900, lineHeight: 1.15 }}>{CHALLENGE_INTRO}</div>
            <div style={{ fontSize: f(26), fontWeight: 700 }}>Hit 15 in a row. If the ball gets away, just start again!</div>
            <Button testId="challenge-start" tone="mint" big onClick={() => { sfx('tap'); challengeGo(); }}>Let&apos;s play!</Button>
          </div>
        </div>
      )}

      {/* brick celebration */}
      {celebrating && mode === 'zone' && (
        <div data-testid="brick-celebration" style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,0.35)' }}>
          <div style={panel}>
            <div style={{ animation: 'tn-bounce 1s ease-in-out infinite' }}><BrickIcon size={96} /></div>
            <div data-testid="celebration-text" style={{ fontSize: f(44), fontWeight: 900 }}>{firstBrick ? BRICK_LINE : 'What a rally!'}</div>
            <div style={{ fontSize: f(26), fontWeight: 700 }}>{firstBrick ? 'Seven in a row! Darian is cheering for you.' : 'Seven in a row again! Darian is cheering.'}</div>
            <div style={{ display: 'flex', gap: u(14), flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button testId="replay-rally" tone="mint" onClick={() => { sfx('tap'); void say('Again!', { speaker: 'luna' }); startGame(); }}>Rally again</Button>
              {bricks >= 1 && (
                <Button testId="challenge-btn-celebration" tone="yellow" onClick={() => setScreen({ kind: 'challenge', zone: 'tennis' })} style={{ display: 'flex', alignItems: 'center', gap: u(10) }}>
                  <Sticker size={44} />Coupon challenge
                </Button>
              )}
              <Button testId="back-to-island-celebration" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
            </div>
          </div>
        </div>
      )}

      {/* challenge done */}
      {challengeDone && (
        <div data-testid="challenge-done" style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,0.35)' }}>
          <div style={panel}>
            <div style={{ animation: 'tn-bounce 1s ease-in-out infinite' }}><Icon id="treasure-chest" size={f(110)} /></div>
            <div style={{ fontSize: f(40), fontWeight: 900 }}>Super Rally!</div>
            <div style={{ fontSize: f(32), fontWeight: 800 }}>{BURIED_LINE}</div>
            <Button testId="to-island" tone="mint" big onClick={() => setScreen({ kind: 'hub' })}>To the island!</Button>
          </div>
        </div>
      )}
    </div>
  );
}
