import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useProgress } from '../../state/progress';
import { useUi } from '../../state/ui';
import { sfx } from '../../audio/engine';
import { say } from '../../audio/speech';
import { Button, palette } from '../../ui/Button';
import { f, inset, maxDpr, u, ub } from '../../ui/scale';
import { FitFov } from '../../three/FitFov';
import { B, CYL8, Cy, Particles, mat } from './fx';
import { BrickTree, Cat, Dog, HoppingFriend, StumpSpot } from './models';
import { TeaGardenScene, TeaHud } from './TeaGarden';
import { PET_LINES } from './facts';
import {
  STUMP_POS, TEA_CENTER, TREE_COUNT, disposeWoods, guestWorldPos, doWand, doWater, initWoods, showCaption, tapStump, useWoods,
} from './woodsState';
import { SKY, WOODS_CSS, hudButton } from './ui';

type V3 = [number, number, number];

function Ground() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out: V3[] = [];
    for (let x = -15; x <= 15; x += 1.25) {
      for (let z = -13; z <= 18; z += 1.25) {
        if (Math.hypot(x, z * 0.95) > 15) continue;
        if (STUMP_POS.some((p) => Math.hypot(p[0] - x, p[2] - z) < 1.1)) continue;
        if (Math.hypot((x - TEA_CENTER[0]) / 6.2, (z - TEA_CENTER[2]) / 6.0) < 1) continue;
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
  return (
    <group>
      <Cy p={[0, -0.4, 2]} s={[17, 0.8, 17]} c="#8ED06B" />
      <Cy p={[0, -1.3, 2]} s={[16, 1.0, 16]} c="#8B5A2B" />
      <instancedMesh ref={ref} args={[CYL8, mat('#7CC45A'), spots.length]} frustumCulled={false} />
    </group>
  );
}

function Clouds() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.position.x = Math.sin(clock.elapsedTime * 0.05) * 3; });
  const cloud = (x: number, y: number, z: number, s: number, k: number) => (
    <group key={k} position={[x, y, z]} scale={s}>
      <B s={[3, 0.8, 1.4]} c="#FFFFFF" /><B p={[-0.6, 0.55, 0]} s={[1.6, 0.8, 1.2]} c="#FFFFFF" /><B p={[0.9, 0.45, 0]} s={[1.2, 0.7, 1.1]} c="#FFFFFF" />
    </group>
  );
  return <group ref={g}>{[cloud(-9, 8.5, -14, 1, 0), cloud(6, 10, -16, 1.3, 1), cloud(14, 7.5, -12, 0.8, 2), cloud(-16, 6.5, -10, 0.9, 3)]}</group>;
}

const BG_TREES: { p: V3; s: number; h: number }[] = [
  { p: [-8, 0, -3.2], s: 1.2, h: 0 }, { p: [-6.4, 0, -6.2], s: 1.5, h: 1 }, { p: [-3.4, 0, -7.4], s: 1.3, h: 0 },
  { p: [0, 0, -8.4], s: 1.6, h: 1 }, { p: [3.6, 0, -7.4], s: 1.3, h: 0 }, { p: [6.6, 0, -6.2], s: 1.5, h: 1 },
  { p: [8.2, 0, -3], s: 1.2, h: 0 }, { p: [-9.5, 0, 2], s: 1.3, h: 1 }, { p: [9.6, 0, 2.2], s: 1.3, h: 0 },
  { p: [-11, 0, 8], s: 1.4, h: 0 }, { p: [11, 0, 8.5], s: 1.4, h: 1 }, { p: [-9, 0, 13], s: 1.2, h: 1 }, { p: [9.5, 0, 13.5], s: 1.2, h: 0 },
];

function CameraRig() {
  const teaReady = useWoods((s) => s.teaReady);
  const guestTarget = useWoods((s) => s.pourTarget);
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.9, 0.5));
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.2);
    const gx = guestTarget ? guestWorldPos(guestTarget)[0] : 0;
    const pos: V3 = teaReady ? [gx * 0.3, 6.9, 15.6] : [0, 6.4, 10.6];
    const tgt: V3 = teaReady ? [gx * 0.5, 0.3, TEA_CENTER[2] - 1.4] : [0, 1.2, 0.2];
    camera.position.x += (pos[0] - camera.position.x) * k;
    camera.position.y += (pos[1] - camera.position.y) * k;
    camera.position.z += (pos[2] - camera.position.z) * k;
    look.current.x += (tgt[0] - look.current.x) * k;
    look.current.y += (tgt[1] - look.current.y) * k;
    look.current.z += (tgt[2] - look.current.z) * k;
    camera.lookAt(look.current);
  });
  return null;
}

function StumpButton({ i }: { i: number }) {
  const stage = useWoods((s) => s.stage[i]);
  if (stage >= 3) return null;
  const ring = stage === 0 ? '#FFFFFF' : stage === 1 ? '#4CB7FF' : '#FFD60A';
  return (
    <Html position={[STUMP_POS[i][0], 0.5, STUMP_POS[i][2]]} center zIndexRange={[20, 0]}>
      <button
        type="button"
        data-testid={`stump-${i}`}
        aria-label={stage === 0 ? `Bare stump ${i + 1}` : `Sapling ${i + 1}`}
        onClick={() => tapStump(i)}
        style={{ width: ub(84), height: ub(84), borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', padding: u(0), position: 'relative' }}
      >
        <span style={{ position: 'absolute', inset: 0, borderRadius: u(42), border: `${u(5)} dashed ${ring}`, animation: 'woods-pulse 1.6s ease-in-out infinite', pointerEvents: 'none' }} />
      </button>
    </Html>
  );
}

function Stumps() {
  const stage = useWoods((s) => s.stage);
  const plantedAt = useWoods((s) => s.plantedAt);
  const wateredAt = useWoods((s) => s.wateredAt);
  const grownAt = useWoods((s) => s.grownAt);
  const friends = useWoods((s) => s.friends);
  const friendAt = useWoods((s) => s.friendAt);
  const teaReady = useWoods((s) => s.teaReady);
  return (
    <>
      {STUMP_POS.map((p, i) => (
        <group key={i}>
          <StumpSpot position={p} stage={stage[i]} plantedAt={plantedAt[i]} wateredAt={wateredAt[i]} />
          {stage[i] === 3 && <BrickTree position={p} age={() => (performance.now() - grownAt[i]) / 1000} scale={1.1} rotY={i * 0.7} />}
          {friends[i] && !(teaReady && i < 5) && (
            <HoppingFriend type={friends[i]!} from={[p[0], 0, p[2] + 0.7]} to={[p[0] + (i % 2 ? -1.25 : 1.25), 0, p[2] + 1.1]} bornAt={friendAt[i]} seed={i} />
          )}
        </group>
      ))}
    </>
  );
}

function Hosts() {
  const teaReady = useWoods((s) => s.teaReady);
  if (teaReady) return null;
  const bark = () => {
    sfx('tap');
    showCaption('Rudolph', PET_LINES.rudolph.caption, 'talk', 2500);
    void say(PET_LINES.rudolph.sound, { speaker: 'rudolph' });
  };
  const meow = () => {
    sfx('tap');
    showCaption('Jingle Bells', PET_LINES.jinglebells.caption, 'talk', 2500);
    void say(PET_LINES.jinglebells.sound, { speaker: 'jinglebells' });
  };
  return (
    <>
      <Dog position={[-4.7, 0, 2.0]} rotY={0.7} scale={0.85} onTap={bark} />
      <Cat position={[4.7, 0, 2.0]} rotY={-0.7} scale={0.9} onTap={meow} />
    </>
  );
}

function Scene() {
  const [ready, setReady] = useState(false);
  const teaReady = useWoods((s) => s.teaReady);
  useEffect(() => {
    // drei <Html> loses the very first instance mounted in the Canvas's first commit.
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[6, 12, 8]} intensity={1.6} />
      <hemisphereLight args={['#BFE6FF', '#8ED06B', 0.5]} />
      <CameraRig />
      <Clouds />
      <Ground />
      {BG_TREES.map((t, i) => <BrickTree key={i} position={t.p} scale={t.s} hue={t.h} rotY={i} age={() => Infinity} />)}
      <Stumps />
      <Hosts />
      {teaReady && <TeaGardenScene />}
      <Particles />
      {ready && !teaReady && STUMP_POS.map((_, i) => <StumpButton key={i} i={i} />)}
    </>
  );
}

function CaptionBubble() {
  const caption = useWoods((s) => s.caption);
  if (!caption) return null;
  const isFact = caption.kind === 'fact';
  return (
    <div
      key={caption.id}
      data-testid="caption"
      style={{
        position: 'absolute', top: `calc(${inset('top', 12)} + var(--btn-min) + ${u(14)})`, left: '50%', transform: 'translateX(-50%)', zIndex: 80, maxWidth: 'min(820px, 80vw)',
        background: '#fff', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(40), boxShadow: `0 ${u(8)} 0 ${palette.navy}`,
        padding: `${u(14)} ${u(30)}`, textAlign: 'center', color: palette.navy, animation: 'woods-bubble .25s ease-out', pointerEvents: 'none',
      }}
    >
      {caption.kind !== 'hint' && <div style={{ fontSize: f(20), fontWeight: 900, color: isFact ? '#2E8B57' : '#E6007A', letterSpacing: u(1), textTransform: 'uppercase' }}>{caption.who}</div>}
      <div style={{ fontSize: f(isFact ? 30 : 32), fontWeight: 800, lineHeight: 1.25 }}>{caption.text}</div>
    </div>
  );
}

function PlantingHud() {
  const stage = useWoods((s) => s.stage);
  const hasSap = stage.some((x) => x === 1);
  const hasWet = stage.some((x) => x === 2);
  return (
    <>
      <div style={{ position: 'absolute', left: inset('left', 22), bottom: inset('bottom', 24), zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(6) }}>
        <button
          type="button"
          data-testid="water-btn"
          aria-label="Watering can"
          onClick={() => doWater()}
          style={{ ...hudButton('#9BE0FF'), width: ub(104), height: ub(104), borderRadius: '50%', fontSize: f(52), animation: hasSap ? 'woods-ring 1.2s ease-in-out infinite' : undefined }}
        >
          💧
        </button>
        <span style={{ fontWeight: 900, fontSize: f(22), color: palette.navy }}>Water</span>
      </div>
      <div style={{ position: 'absolute', right: inset('right', 22), bottom: inset('bottom', 24), zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(6) }}>
        <button
          type="button"
          data-testid="wand-btn"
          aria-label="Magic wand"
          onClick={() => doWand()}
          style={{ ...hudButton('#FFE65C'), width: ub(112), height: ub(112), borderRadius: '50%', fontSize: f(62), animation: 'woods-glow 1.4s ease-in-out infinite', outline: hasWet ? '6px solid #FF5CA8' : 'none' }}
        >
          ⭐
        </button>
        <span style={{ fontWeight: 900, fontSize: f(22), color: palette.navy }}>Magic wand</span>
      </div>
    </>
  );
}

export function Zone() {
  const setScreen = useUi((s) => s.setScreen);
  const trees = useProgress((s) => s.treesPlanted);
  const bricks = useProgress((s) => s.bricks.woods);
  const teaReady = useWoods((s) => s.teaReady);
  useEffect(() => {
    initWoods();
    return () => disposeWoods();
  }, []);
  return (
    <div className="screen" data-testid="zone-screen-woods" style={{ background: SKY, overflow: 'hidden' }}>
      <style>{WOODS_CSS}</style>
      <Canvas dpr={[1, maxDpr()]} camera={{ position: [0, 6.4, 10.6], fov: 46, near: 0.1, far: 80 }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }} style={{ position: 'absolute', inset: 0 }}>
        <FitFov base={46} />
        <Scene />
      </Canvas>
      <div style={{ position: 'absolute', top: inset('top', 14), left: inset('left', 18), zIndex: 60, display: 'flex', alignItems: 'center', gap: u(10) }}>
        <div data-testid="tree-counter" style={{ background: palette.cream, border: `${u(4)} solid ${palette.navy}`, borderRadius: u(28), boxShadow: `0 ${u(5)} 0 ${palette.navy}`, padding: `${u(8)} ${u(22)}`, fontSize: f(30), fontWeight: 900, color: palette.navy, minHeight: u(64), display: 'flex', alignItems: 'center' }}>
          🌳 {Math.min(trees, TREE_COUNT)}/{TREE_COUNT} trees
        </div>
        {bricks >= 1 && <Button testId="challenge-btn" tone="yellow" onClick={() => setScreen({ kind: 'challenge', zone: 'woods' })}>Tea Party Orders challenge</Button>}
      </div>
      <div style={{ position: 'absolute', top: inset('top', 14), right: inset('right', 18), zIndex: 60 }}>
        <Button testId="back-to-island" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
      </div>
      <CaptionBubble />
      {teaReady ? <TeaHud /> : <PlantingHud />}
    </div>
  );
}
