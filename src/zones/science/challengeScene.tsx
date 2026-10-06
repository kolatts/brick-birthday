import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { B, Cy, mat } from '../woods/fx';
import { emitFx, type V3 } from './fx';
import { Flask } from './props';
import { BT } from './scenes';
import { nowS, useLab } from './store';
import { INGREDIENTS, mix, targetResult } from './logic';

const MX = 1.0;
const TXP = -2.3;
const S = 1.7;
const SPHERE = new THREE.IcosahedronGeometry(1, 1);

/** Funny wrong-mix goo that oozes out of the flask and slides down. */
function Goo({ at }: { at: number }) {
  const g = useRef<THREE.Group>(null);
  const blobs = useMemo(() => [
    { p: [0, 0, 0] as V3, s: 0.62, d: 0 }, { p: [0.28, -0.2, 0.2] as V3, s: 0.4, d: 0.12 }, { p: [-0.3, -0.35, 0.15] as V3, s: 0.36, d: 0.2 },
    { p: [0.1, -0.7, 0.45] as V3, s: 0.3, d: 0.32 }, { p: [-0.1, -1.1, 0.5] as V3, s: 0.26, d: 0.45 }, { p: [0.35, -1.4, 0.4] as V3, s: 0.22, d: 0.6 },
  ], []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = nowS() - at;
    if (g.current) g.current.visible = at > 0 && t < 2.6;
    blobs.forEach((b, i) => {
      const m = refs.current[i];
      if (!m) return;
      const k = Math.max(0, Math.min(1, (t - b.d) / 0.6));
      const wob = 1 + Math.sin(clock.elapsedTime * 9 + i) * 0.06;
      m.scale.setScalar(Math.max(0.0001, b.s * (1 - Math.pow(1 - k, 3)) * wob));
    });
  });
  return (
    <group ref={g} position={[MX, BT + 1.45 * S, 0.25]} visible={false}>
      {blobs.map((b, i) => (
        <mesh key={i} ref={(o) => { refs.current[i] = o; }} geometry={SPHERE} material={mat(i % 2 ? '#7CD33A' : '#5FB82A', { emissive: '#3E8A1A', emissiveIntensity: 0.35 })} position={b.p} scale={0.0001} />
      ))}
    </group>
  );
}

function Pedestal() {
  return (
    <group position={[TXP, BT, 0.3]}>
      <B p={[0, 0.3, 0]} s={[1.5, 0.6, 1.1]} c="#FFD60A" />
      <B p={[0, 0.62, 0]} s={[1.6, 0.08, 1.2]} c="#FFFFFF" />
      {[-0.45, 0.45].map((x) => <Cy key={x} p={[x, 0.7, 0.3]} s={[0.14, 0.06, 0.14]} c="#FFF3B0" />)}
    </group>
  );
}

export function ChallengeScene() {
  const ch = useLab((s) => s.ch);
  const target = ch.targets[Math.min(ch.round, ch.targets.length - 1)];
  const tr = targetResult(target);
  const m = mix(ch.picked);
  const shown = ch.result === 'goo' ? '#8BD65A' : m.color;
  const flaskG = useRef<THREE.Group>(null);
  const tFlask = useRef<THREE.Group>(null);
  const lastCount = useRef(0);
  const sp = useRef(0);

  useEffect(() => {
    if (ch.picked.length > lastCount.current) {
      const last = ch.picked[ch.picked.length - 1];
      emitFx('bubble', [MX, BT + 1.4 * S, 0.25], 8, INGREDIENTS.find((i) => i.id === last)!.color, 0.4);
    }
    lastCount.current = ch.picked.length;
  }, [ch.picked]);
  useEffect(() => {
    if (ch.result === 'goo') emitFx('bubble', [MX, BT + 2.2 * S, 0.25], 40, '#9BEA5A', 0.9);
    if (ch.result === 'ok') {
      emitFx('spark', [MX, BT + 2.0 * S, 0.25], 30, undefined, 1);
      emitFx('confetti', [MX, BT + 2.0 * S, 0.25], 20);
    }
  }, [ch.result, ch.resultAt]);
  useEffect(() => {
    if (ch.won) emitFx('confetti', [0, BT + 2, 0.5], 60);
  }, [ch.won]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (flaskG.current) {
      const goo = ch.result === 'goo' && nowS() - ch.resultAt < 1.2;
      flaskG.current.rotation.z = goo ? Math.sin(t * 40) * 0.07 : 0;
      flaskG.current.scale.setScalar(ch.result === 'ok' ? 1 + Math.sin((nowS() - ch.resultAt) * 14) * 0.05 : 1);
    }
    if (tFlask.current) tFlask.current.position.y = BT + 0.7 + Math.sin(t * 2.2) * 0.06;
    sp.current += dt;
    if (sp.current > 0.14) {
      sp.current = 0;
      if (m.sparkly && ch.picked.length) emitFx('spark', [MX, BT + 1.0 * S, 0.25], 1, undefined, 0.5);
      if (tr.sparkly) emitFx('spark', [TXP, BT + 1.2, 0.3], 1, undefined, 0.35);
    }
  });

  return (
    <group>
      <Pedestal />
      <group ref={tFlask} position={[TXP, BT + 0.7, 0.3]}>
        <Flask color={tr.color} scale={1.0} level={0.7} glow={0.55} />
      </group>
      <group ref={flaskG} position={[MX, 0, 0.25]}>
        <group position={[-MX + MX, 0, 0]}>
          <Flask p={[0, BT, 0]} color={shown} scale={S} level={ch.picked.length ? 0.7 : 0.28} bubbling={ch.picked.length > 0} glow={ch.result === 'ok' ? 0.7 : m.sparkly ? 0.3 : 0.08} />
        </group>
      </group>
      <Goo at={ch.result === 'goo' ? ch.resultAt : 0} />
      {/* ingredient props on the bench */}
      {INGREDIENTS.map((ing, i) => (
        <mesh key={ing.id} geometry={SPHERE} material={mat(ing.color, { emissive: ing.id === 'glitter' ? '#FF8FD0' : undefined, emissiveIntensity: ing.id === 'glitter' ? 0.5 : 0 })} position={[2.9 + (i % 3) * 0.8, BT + 0.22, 0.6 + Math.floor(i / 3) * 0.7]} scale={[0.28, 0.22, 0.28]} />
      ))}
    </group>
  );
}
