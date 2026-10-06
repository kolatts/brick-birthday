import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { CouponId } from '../types';
import { coupons } from '../config/coupons';
import { useCoupons } from '../state/coupons';
import { StaticBatch } from '../three/Brick';
import { Builder } from '../three/prims';
import { digPos } from '../three/layout';
import { useDig } from '../three/digStore';
import { emitSparkles } from '../three/Wand';
import { Icon } from '../ui/Icons';
import { playSting, sfx } from '../audio/engine';

export const DIG_TAPS = 5;
const DIRT = ['#8B5A2B', '#A66B3C', '#C98B4F', '#6E4524'];

const ringGeo = new THREE.RingGeometry(0.62, 0.86, 28);
ringGeo.rotateX(-Math.PI / 2);
const ringMat = new THREE.MeshBasicMaterial({ color: '#FFE45C', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
const moundGeo = new THREE.SphereGeometry(1, 12, 8);
const moundMat = new THREE.MeshStandardMaterial({ color: '#8B5A2B', roughness: 1 });
const beamGeo = new THREE.CylinderGeometry(0.5, 0.9, 5, 14, 1, true);
const beamMat = new THREE.MeshBasicMaterial({ color: '#FFF3A0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

function Chest() {
  const prims = useMemo(() => {
    const b = new Builder();
    b.box([0, 0.2, 0], [0.9, 0.4, 0.6], '#8B5A2B', { studs: false });
    b.box([0, 0.46, 0], [0.96, 0.14, 0.66], '#B5793F', { studs: 0.3 });
    b.box([0, 0.2, 0.31], [0.16, 0.44, 0.04], '#FFD60A');
    b.box([-0.3, 0.2, 0.31], [0.1, 0.44, 0.04], '#FFD60A');
    b.box([0.3, 0.2, 0.31], [0.1, 0.44, 0.04], '#FFD60A');
    b.sph([0, 0.3, 0.34], 0.07, '#FFD60A');
    return b.prims;
  }, []);
  return <StaticBatch prims={prims} />;
}

interface DigSpotProps {
  id: CouponId;
  onConfetti: () => void;
  onDug: (id: CouponId) => void;
}

/** A glowing buried-treasure spot. Tap ~5 times: pets dig, the chest pops, the coupon is earned. */
function DigSpot({ id, onConfetti, onDug }: DigSpotProps) {
  const zone = coupons.find((c) => c.id === id)!.zone;
  const pos = useMemo(() => digPos(zone), [zone]);
  const [taps, setTaps] = useState(0);
  const [phase, setPhase] = useState<'dig' | 'chest'>('dig');
  const ring = useRef<THREE.Mesh>(null);
  const mound = useRef<THREE.Mesh>(null);
  const chest = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  const timer = useRef<number | null>(null);
  const markDug = useCoupons((s) => s.markDug);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      // never leave the pets standing at a finished hole
      const cur = useDig.getState().spot;
      if (cur?.id === id) useDig.getState().setSpot(null);
    },
    [id],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const r = ring.current;
    if (r) {
      const s = 1 + Math.sin(t * 4) * 0.1;
      r.scale.set(s, 1, s);
      (r.material as THREE.MeshBasicMaterial).opacity = phase === 'dig' ? 0.6 + Math.sin(t * 4) * 0.25 : 0;
    }
    const m = mound.current;
    if (m) {
      const k = 1 - Math.min(taps, DIG_TAPS) / (DIG_TAPS + 1.5);
      m.scale.set(0.55, 0.26 * k + 0.04, 0.55);
      m.position.y = 0.02;
    }
    const c = chest.current;
    if (c && phase === 'chest') {
      if (t0.current < 0) t0.current = t;
      const k = Math.min(1, (t - t0.current) / 0.7);
      const s = k < 1 ? 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2) : 1;
      c.visible = true;
      c.scale.setScalar(Math.max(0.01, s));
      c.position.y = Math.min(1, k) * 0.3;
      c.rotation.y = Math.sin(t * 2) * 0.15;
    }
  });

  const tap = () => {
    if (phase === 'chest') return;
    const n = taps + 1;
    setTaps(n);
    useDig.getState().setSpot({ id, x: pos[0], z: pos[2] });
    sfx('tap');
    emitSparkles([pos[0], 0.3, pos[2]], { count: 12, colors: DIRT, speed: 2, gravity: 8, size: 0.11 });
    if (n >= DIG_TAPS) {
      setPhase('chest');
      t0.current = -1;
      sfx('fanfare');
      sfx('sparkle');
      void playSting('celebrate');
      emitSparkles([pos[0], 0.8, pos[2]], { count: 60, speed: 3.6, size: 0.14 });
      onConfetti();
      timer.current = window.setTimeout(
        () => {
          useDig.getState().setSpot(null);
          markDug(id);
          onDug(id);
        },
        window.__skipAnim ? 250 : 1700,
      );
    }
  };

  const pct = Math.min(1, taps / DIG_TAPS);
  return (
    <group position={pos}>
      <mesh ref={ring} geometry={ringGeo} material={ringMat.clone()} position={[0, 0.06, 0]} raycast={nullRay} />
      <mesh ref={mound} geometry={moundGeo} material={moundMat} raycast={nullRay} />
      {phase === 'dig' && <mesh geometry={beamGeo} material={beamMat} position={[0, 2.5, 0]} raycast={nullRay} />}
      <group ref={chest} visible={false}>
        <Chest />
      </group>
      <Html center position={[0, 1.1, 0]} zIndexRange={[60, 50]}>
        <button
          type="button"
          data-testid={`dig-spot-${id}`}
          aria-label="Dig for treasure"
          onClick={tap}
          style={{
            width: 92, height: 92, borderRadius: '50%', border: '5px solid #1D2A44', background: '#FFE45C', cursor: 'pointer',
            fontSize: 44, boxShadow: '0 0 0 6px rgba(255,228,92,0.55), 0 6px 0 #1D2A44', position: 'relative',
            padding: 0,
          }}
        >
          <svg width="92" height="92" viewBox="0 0 92 92" style={{ position: 'absolute', inset: -5, pointerEvents: 'none' }}>
            <circle cx="46" cy="46" r="42" fill="none" stroke="#E63946" strokeWidth="7" strokeDasharray={`${pct * 264} 264`} strokeLinecap="round" transform="rotate(-90 46 46)" />
          </svg>
          <span aria-hidden style={{ display: 'inline-block', animation: 'bob 1s ease-in-out infinite' }}><Icon id={phase === 'chest' ? 'gift' : 'shovel'} size={56} /></span>
        </button>
      </Html>
    </group>
  );
}

function nullRay(): void {
  /* decoration only: the Html button is the tap target */
}

/** Renders a dig spot next to the building of every coupon whose challenge is done but not yet dug up. */
export function DigSpots({ onConfetti, onDug }: { onConfetti: () => void; onDug: (id: CouponId) => void }) {
  const complete = useCoupons((s) => s.challengeComplete);
  const dug = useCoupons((s) => s.dug);
  const pending = coupons.filter((c) => complete.includes(c.id) && !dug.includes(c.id));
  // drei <Html> drops the very first instance mounted in the Canvas's first commit; wait a frame.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(f);
  }, []);
  if (!ready) return null;
  return (
    <>
      {pending.map((c) => (
        <DigSpot key={c.id} id={c.id} onConfetti={onConfetti} onDug={onDug} />
      ))}
    </>
  );
}
