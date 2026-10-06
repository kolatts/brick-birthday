import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { sfx } from '../../audio/engine';
import { playSting } from '../../audio/engine';
import { Button, palette } from '../../ui/Button';
import { BrickIcon, Icon } from '../../ui/Icons';
import { f, inset, maxDpr, u, ub } from '../../ui/scale';
import { FitFov } from '../../three/FitFov';
import { Julian, LabRoom } from './props';
import { Particles } from './fx';
import { CrystalScene, FloatScene, MenuScene, PotionScene, RocketScene, SeedScene } from './scenes';
import { SciIcon } from './icons';
import {
  EXPERIMENT_IDS, EXPERIMENT_TITLES, FLOAT_ITEMS, CRYSTAL_TAPS, MAX_FUEL, type ExperimentId,
} from './logic';
import {
  addFuel, addPotion, backToMenu, closeCelebration, disposeLab, enterExperiment, giveSeed, growCrystals, guessFloat, initLab, launchRocket, pickFloat, resetPotion, resetSeed, stirEnd, stirStart, useLab, backToMenu as toMenu,
} from './store';
import { Caption, CouponBadge, HudPanel, LAB_SKY, Row, SCI_CSS, Tile } from './ui';
import { CHALLENGE_TITLE } from './lines';

export function CameraRig() {
  const { camera } = useThree();
  const k = useRef(0);
  useFrame(({ clock }, dt) => {
    const s = useLab.getState();
    // Pull back and tilt up while the rocket is flying so the whole arc stays in frame.
    k.current += ((s.mode === 'rocket' && s.flying ? 1 : 0) - k.current) * Math.min(1, dt * 2.5);
    camera.position.set(Math.sin(clock.elapsedTime * 0.25) * 0.25, 4.6 + k.current * 1.2, 12.5 + k.current * 4.5);
    camera.lookAt(0.2, 2.4 + k.current * 1.6, 0);
  });
  return null;
}

export function JulianFigure() {
  const expr = useLab((s) => s.julianExpr);
  const wave = useLab((s) => s.julianWave);
  return <Julian expr={expr} wave={wave} />;
}

export function LabLights() {
  return (
    <>
      <ambientLight intensity={1.05} />
      <directionalLight position={[5, 10, 8]} intensity={1.7} />
      <hemisphereLight args={['#E6FFF7', '#9AD9C8', 0.55]} />
    </>
  );
}

function Scene() {
  const mode = useLab((s) => s.mode);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  void ready;
  return (
    <>
      <LabLights />
      <CameraRig />
      <LabRoom lamp={mode !== 'seed'} />
      <JulianFigure />
      {mode === 'menu' && <MenuScene />}
      {mode === 'potion' && <PotionScene />}
      {mode === 'float' && <FloatScene />}
      {mode === 'rocket' && <RocketScene />}
      {mode === 'crystal' && <CrystalScene />}
      {mode === 'seed' && <SeedScene />}
      <Particles />
    </>
  );
}

export function LabCanvas({ children }: { children: React.ReactNode }) {
  return (
    <Canvas
      dpr={[1, maxDpr()]}
      camera={{ position: [0, 4.6, 12.5], fov: 44, near: 0.1, far: 80 }}
      gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true, toneMapping: THREE.NoToneMapping }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <FitFov base={44} />
      {children}
    </Canvas>
  );
}

// ---- HUD pieces ----------------------------------------------------------------------------------
const TILE_ICON: Record<ExperimentId, React.ReactNode> = {
  potion: <SciIcon id="potion" size={u(52)} />,
  float: <SciIcon id="float" size={u(52)} />,
  rocket: <SciIcon id="rocket" size={u(52)} />,
  crystal: <SciIcon id="crystal" size={u(52)} />,
  seed: <SciIcon id="seed" size={u(52)} />,
};

function MenuHud() {
  const done = useProgress((s) => s.experimentsDone);
  const bricks = useProgress((s) => s.bricks.science);
  const setScreen = useUi((s) => s.setScreen);
  return (
    <HudPanel testId="menu-hud">
      <div style={{ fontSize: f(24), fontWeight: 900, display: 'flex', alignItems: 'center', gap: u(10), textAlign: 'center' }}>
        <BrickIcon size={28} />
        Earn Birthday Bricks: 2 experiments for the 1st, 5 for the 2nd!
      </div>
      <Row>
        {EXPERIMENT_IDS.map((id) => (
          <Tile key={id} testId={`exp-${id}`} label={EXPERIMENT_TITLES[id]} icon={TILE_ICON[id]} onClick={() => enterExperiment(id)} done={done.includes(id)} bg={done.includes(id) ? '#E9FFF1' : '#FFFFFF'} />
        ))}
        {bricks >= 2 && (
          <button
            type="button"
            data-testid="challenge-btn"
            onClick={() => { sfx('tap'); setScreen({ kind: 'challenge', zone: 'science' }); }}
            style={{
              fontFamily: 'inherit', fontWeight: 900, color: palette.navy, background: palette.yellow, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(24), boxShadow: `0 ${u(6)} 0 ${palette.navy}`,
              minHeight: ub(104), maxWidth: u(300), padding: `${u(8)} ${u(14)}`, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(4), fontSize: f(19), lineHeight: 1.1,
              animation: 'sci-pulse 1.6s ease-in-out infinite',
            }}
          >
            <CouponBadge size={40} />
            {CHALLENGE_TITLE}
          </button>
        )}
      </Row>
    </HudPanel>
  );
}

function PotionHud() {
  const stirred = useLab((s) => s.stirred);
  const stirring = useLab((s) => s.stirring);
  const potion = useLab((s) => s.potion);
  return (
    <HudPanel testId="potion-hud">
      <Row gap={16}>
        <Tile
          testId="stir-btn"
          label={stirring ? 'Stirring!' : 'Hold to stir'}
          icon={<SciIcon id="wand" size={u(52)} />}
          bg="#E6D4FF"
          wide
          pulse={!stirred}
          onPointerDown={stirStart}
          onPointerUp={() => { if (useLab.getState().stirring) stirEnd(); }}
        />
        <Tile testId="ing-lemon" label="Lemon" icon={<Icon id="lemon" size={u(52)} />} bg="#FFF3A0" onClick={() => addPotion('lemon')} dim={!stirred} pulse={stirred && !potion} />
        <Tile testId="ing-soda" label="Baking soda" icon={<SciIcon id="salt" size={u(52)} />} bg="#D6F5FF" onClick={() => addPotion('soda')} dim={!stirred} pulse={stirred && !potion} />
        {potion && <Tile testId="potion-reset" label="Reset potion" icon={<Icon id="replay" size={u(52)} />} bg="#E9FFF1" onClick={resetPotion} />}
      </Row>
    </HudPanel>
  );
}

function FloatHud() {
  const item = useLab((s) => s.floatItem);
  const guess = useLab((s) => s.guess);
  const badge = useLab((s) => s.floatBadge);
  return (
    <HudPanel testId="float-hud">
      <Row gap={10}>
        {FLOAT_ITEMS.map((i) => (
          <Tile key={i.id} small testId={`obj-${i.id}`} label={i.label} icon={<SciIcon id={i.id} size={u(46)} />} selected={item === i.id} onClick={() => pickFloat(i.id)} />
        ))}
      </Row>
      <Row gap={18}>
        <Button testId="guess-sink" tone="blue" big onClick={() => guessFloat('sink')} style={{ minHeight: ub(78), fontSize: f(34), padding: `${u(6)} ${u(36)}` }}>Sink</Button>
        <div data-testid="float-badge" style={{ minWidth: u(190), textAlign: 'center', fontSize: f(34), fontWeight: 900, color: '#0E9F83' }}>{badge ?? (guess ? '...' : '')}</div>
        <Button testId="guess-float" tone="mint" big onClick={() => guessFloat('float')} style={{ minHeight: ub(78), fontSize: f(34), padding: `${u(6)} ${u(36)}` }}>Float</Button>
      </Row>
    </HudPanel>
  );
}

function RocketHud() {
  const fuel = useLab((s) => s.fuel);
  const flying = useLab((s) => s.flying);
  return (
    <HudPanel testId="rocket-hud">
      <Row gap={18}>
        <Tile testId="fuel-add" wide label={`Add fuel brick (${fuel}/${MAX_FUEL})`} icon={<SciIcon id="fuel" size={u(52)} />} bg="#FFE0B3" onClick={addFuel} dim={flying} pulse={fuel === 0} />
        <Button testId="launch-btn" tone="red" big onClick={launchRocket} disabled={flying} style={{ fontSize: f(40), minHeight: ub(104), padding: `${u(8)} ${u(40)}` }}>
          <SciIcon id="rocket" size={u(54)} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: u(10) }} />
          LAUNCH
        </Button>
      </Row>
    </HudPanel>
  );
}

function CrystalHud() {
  const n = useLab((s) => s.crystals);
  const full = n >= CRYSTAL_TAPS;
  return (
    <HudPanel testId="crystal-hud">
      <div data-testid="crystal-day" style={{ fontSize: f(26), fontWeight: 900 }}>{full ? 'The jar is full of crystals!' : `Day ${n + 1} of ${CRYSTAL_TAPS}`}</div>
      <div style={{ display: 'flex', gap: u(8) }}>
        {Array.from({ length: CRYSTAL_TAPS }).map((_, i) => (
          <span key={i} style={{ width: u(22), height: u(22), borderRadius: u(6), background: i < n ? '#9BD8FF' : '#fff', border: `${u(3)} solid ${palette.navy}`, transform: 'rotate(45deg)' }} />
        ))}
      </div>
      <Tile testId="grow-btn" wide label={full ? 'Grow again' : 'Tap to grow!'} icon={<SciIcon id="crystal" size={u(52)} />} bg="#E4D3FF" onClick={growCrystals} pulse={!full} />
    </HudPanel>
  );
}

function SeedHud() {
  const given = useLab((s) => s.given);
  const sprouted = useLab((s) => s.sproutAt > 0);
  return (
    <HudPanel testId="seed-hud">
      <Row gap={16}>
        <Tile testId="seed-water" label="Water" icon={<SciIcon id="can" size={u(52)} />} bg="#D6F5FF" onClick={() => giveSeed('water')} done={given.includes('water')} pulse={!given.includes('water') && !sprouted} />
        <Tile testId="seed-light" label="Light" icon={<SciIcon id="lamp" size={u(52)} />} bg="#FFF3A0" onClick={() => giveSeed('light')} done={given.includes('light')} pulse={!given.includes('light') && !sprouted} />
        <Tile testId="seed-soil" label="Soil" icon={<Icon id="shovel" size={u(52)} />} bg="#F2D9BC" onClick={() => giveSeed('soil')} done={given.includes('soil')} pulse={!given.includes('soil') && !sprouted} />
        {sprouted && <Tile testId="seed-again" label="Again" icon={<Icon id="replay" size={u(52)} />} bg="#E9FFF1" onClick={resetSeed} />}
      </Row>
    </HudPanel>
  );
}

function ExperimentHud({ mode }: { mode: ExperimentId }) {
  switch (mode) {
    case 'potion': return <PotionHud />;
    case 'float': return <FloatHud />;
    case 'rocket': return <RocketHud />;
    case 'crystal': return <CrystalHud />;
    case 'seed': return <SeedHud />;
  }
}

export function BrickCelebration({ count, children }: { count: number; children: React.ReactNode }) {
  useEffect(() => { void playSting('celebrate'); }, []);
  return (
    <div data-testid="brick-celebration" role="status" style={{ position: 'absolute', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(29,42,68,0.38)' }}>
      <div style={{ background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(10)} 0 ${palette.navy}`, padding: `${u(24)} ${u(40)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(14), maxWidth: u(780), animation: 'sci-pop .4s ease-out' }}>
        <div style={{ display: 'flex', gap: u(12) }}>{Array.from({ length: count }).map((_, i) => <BrickIcon key={i} size={64} />)}</div>
        <div data-testid="celebration-text" style={{ fontSize: f(44), fontWeight: 900, textAlign: 'center', color: palette.navy }}>You earned a Birthday Brick!</div>
        <div style={{ fontSize: f(26), fontWeight: 700, textAlign: 'center' }}>{count >= 2 ? 'Two bricks from the lab. Julian is so proud!' : 'Two experiments done. Julian is proud!'}</div>
        <Row>{children}</Row>
      </div>
    </div>
  );
}

export function Zone() {
  const setScreen = useUi((s) => s.setScreen);
  const mode = useLab((s) => s.mode);
  const celebrate = useLab((s) => s.celebrate);
  const done = useProgress((s) => s.experimentsDone);
  const bricks = useProgress((s) => s.bricks.science);
  useEffect(() => {
    initLab();
    toMenu();
    return () => disposeLab();
  }, []);
  return (
    <div className="screen" data-testid="zone-screen-science" style={{ background: LAB_SKY, overflow: 'hidden' }}>
      <style>{SCI_CSS}</style>
      <LabCanvas><Scene /></LabCanvas>
      <div style={{ position: 'absolute', top: inset('top', 14), left: inset('left', 18), zIndex: 60, display: 'flex', alignItems: 'center', gap: u(10) }}>
        <div data-testid="experiment-counter" style={{ background: palette.cream, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(28), boxShadow: `0 ${u(5)} 0 ${palette.navy}`, padding: `${u(8)} ${u(20)}`, fontSize: f(26), fontWeight: 900, color: palette.navy, minHeight: 'var(--btn-min)', display: 'flex', alignItems: 'center', gap: u(10) }}>
          <BrickIcon size={30} />
          {Math.min(done.length, 5)}/5 experiments
          <span style={{ fontSize: f(20), fontWeight: 800, color: '#C9304A' }}>{bricks}/2 bricks</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: inset('top', 14), right: inset('right', 18), zIndex: 60 }}>
        {mode === 'menu'
          ? <Button testId="back-to-island" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
          : <Button testId="back-to-lab" tone="cream" onClick={() => backToMenu()}>More experiments</Button>}
      </div>
      <Caption />
      {mode === 'menu' ? <MenuHud /> : <ExperimentHud mode={mode} />}
      {celebrate !== null && (
        <BrickCelebration count={celebrate}>
          <Button testId="keep-going" tone="mint" onClick={closeCelebration}>Keep experimenting</Button>
          {bricks >= 2 && (
            <button type="button" data-testid="challenge-btn-celebration" onClick={() => setScreen({ kind: 'challenge', zone: 'science' })} style={{ fontFamily: 'inherit', fontWeight: 900, color: palette.navy, background: palette.yellow, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(28), boxShadow: `0 ${u(6)} 0 ${palette.navy}`, padding: `${u(8)} ${u(18)}`, minHeight: ub(88), cursor: 'pointer', display: 'flex', alignItems: 'center', gap: u(12), fontSize: f(22), maxWidth: u(420), textAlign: 'left', lineHeight: 1.1 }}>
              <CouponBadge size={44} />
              {CHALLENGE_TITLE}
            </button>
          )}
          <Button testId="back-to-island-celebration" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
        </BrickCelebration>
      )}
    </div>
  );
}
