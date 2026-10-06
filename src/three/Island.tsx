import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ZoneId } from '../types';
import { ZONE_IDS } from '../types';
import { zones } from '../config/zones';
import { StaticBatch } from './Brick';
import { Builder, rng, type V3 } from './prims';
import { BRICK_COLORS, CAKE_STACK, buildScenery } from './scenery';
import { layout } from './layout';
import { Bubbles, ConfettiBricks, CraneArm, Flag, Flames, FloatingBricks, Butterflies, StageLights, TennisBall } from './Anim';

/** Floating island: grass plates, brick cliff, plaza, cake, every zone building (or its crane). 4-8 draw calls total. */
export function Island({ builtKey, totalBricks, candles }: { builtKey: string; totalBricks: number; candles: number }) {
  const prims = useMemo(() => {
    const built = Object.fromEntries(ZONE_IDS.map((z, i) => [z, builtKey[i] === '1'])) as Record<ZoneId, boolean>;
    return buildScenery(built, candles);
  }, [builtKey, candles]);
  const stack = useMemo(() => {
    const b = new Builder();
    for (let i = 0; i < Math.min(totalBricks, CAKE_STACK.length); i++) {
      const s = CAKE_STACK[i];
      b.at(s.p, s.ry, () => {
        b.box([0, 0, 0], [0.4, 0.34, 0.36], BRICK_COLORS[i % BRICK_COLORS.length], { studs: 0.2 });
      });
    }
    return b.prims;
  }, [totalBricks]);
  return (
    <>
      <StaticBatch prims={prims} />
      {stack.length > 0 && <StaticBatch prims={stack} />}
    </>
  );
}

/* ---------------------------------------------------------------- clouds ---------- */

interface CloudPuff {
  x: number; y: number; z: number; r: number; speed: number; ox: number;
}

const cloudGeo = new THREE.SphereGeometry(1, 12, 8);
const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dfeeff', emissiveIntensity: 0.55, roughness: 1 });

/** Drifting clouds below and around the island (single instanced mesh; wraps around). */
export function Clouds() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const puffs = useMemo(() => {
    const r = rng(99);
    const list: CloudPuff[] = [];
    for (let c = 0; c < 12; c++) {
      const a = (c / 12) * Math.PI * 2 + r() * 0.4;
      const rad = 12 + r() * 9;
      const cx = Math.cos(a) * rad;
      const cz = Math.sin(a) * rad;
      const cy = -4 - r() * 5 + (c % 4 === 0 ? 7 + r() * 3 : 0);
      const sp = 0.15 + r() * 0.25;
      const n = 4 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        list.push({ x: cx + (i - n / 2) * 1.2, y: cy + (r() - 0.5) * 0.5 + (i % 2 ? 0.4 : 0), z: cz + (r() - 0.5) * 1.2, r: 1.1 + r() * 0.9 - Math.abs(i - n / 2) * 0.12, speed: sp, ox: 0 });
      }
    }
    return list;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    ref.current?.computeBoundingSphere();
  }, []);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      p.ox += p.speed * d;
      if (p.x + p.ox > 26) p.ox -= 52;
      dummy.position.set(p.x + p.ox, p.y, p.z);
      dummy.scale.set(p.r * 1.25, p.r * 0.8, p.r);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[cloudGeo, cloudMat, puffs.length]} frustumCulled={false} raycast={noRaycast} />;
}

/* -------------------------------------------------------------- balloons ---------- */

const balloonGeo = new THREE.SphereGeometry(1, 14, 10);
const balloonMat = new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.05 });
const stringGeo = new THREE.BoxGeometry(1, 1, 1);
const stringMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
const BALLOON_COUNT = 10;

/** Birthday balloons on strings around the island. */
export function Balloons() {
  const balloons = useRef<THREE.InstancedMesh>(null);
  const strings = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: BALLOON_COUNT }, (_, i) => {
      const a = (i / BALLOON_COUNT) * Math.PI * 2 + 0.3;
      const rad = 8.2 + r() * 1.4;
      return { x: Math.cos(a) * rad, z: Math.sin(a) * rad, h: 3.4 + r() * 2.4, ph: r() * 6 };
    });
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = balloons.current;
    if (!m) return;
    const c = new THREE.Color();
    spots.forEach((_, i) => m.setColorAt(i, c.set(BRICK_COLORS[i % BRICK_COLORS.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [spots]);
  useFrame(({ clock }) => {
    const bm = balloons.current, sm = strings.current;
    if (!bm || !sm) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      const bob = Math.sin(t * 1.3 + s.ph) * 0.25;
      const sway = Math.sin(t * 0.9 + s.ph) * 0.12;
      const by = s.h + bob;
      dummy.position.set(s.x + sway, by, s.z);
      dummy.scale.set(0.38, 0.47, 0.38);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bm.setMatrixAt(i, dummy.matrix);
      const len = by - 0.47;
      dummy.position.set(s.x + sway * 0.5, len / 2 - 0.2, s.z);
      dummy.scale.set(0.02, len + 0.4, 0.02);
      dummy.updateMatrix();
      sm.setMatrixAt(i, dummy.matrix);
    }
    bm.instanceMatrix.needsUpdate = true;
    sm.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={balloons} args={[balloonGeo, balloonMat, BALLOON_COUNT]} frustumCulled={false} raycast={noRaycast} />
      <instancedMesh ref={strings} args={[stringGeo, stringMat, BALLOON_COUNT]} frustumCulled={false} raycast={noRaycast} />
    </>
  );
}

/* ---------------------------------------------------------- zone markers ---------- */

const hitGeo = new THREE.BoxGeometry(1, 1, 1);

interface ZoneMarkersProps {
  onTap: (zone: ZoneId) => void;
}

const _v = new THREE.Vector3();

/**
 * Invisible tap targets over each building plus small map labels. Labels are anchored above their
 * building and nudged apart in screen space each frame so they never collide; on phones the bottom
 * buttons already carry the names, so the labels are hidden.
 */
export function ZoneMarkers({ onTap }: ZoneMarkersProps) {
  // drei <Html> drops the very first instance when mounted in the Canvas's first commit; mount labels a frame later.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const els = useRef<Record<string, HTMLDivElement | null>>({});
  const phone = size.height < 500;
  const anchors = useMemo(
    () => ZONE_IDS.map((z) => ({ z, p: new THREE.Vector3(layout[z].pos[0], zones[z].built ? layout[z].labelY : layout[z].pos[1] + 2.6, layout[z].pos[2]) })),
    [],
  );
  useFrame(() => {
    if (!ready || phone) return;
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const items = anchors
      .map((a) => {
        _v.copy(a.p).project(camera);
        return { z: a.z, x: (_v.x * 0.5 + 0.5) * size.width, y: (-_v.y * 0.5 + 0.5) * size.height, el: els.current[a.z] };
      })
      .filter((i) => i.el)
      .sort((a, b) => b.y - a.y); // lowest on screen keeps its spot; the rest nudge up
    for (const it of items) {
      const el = it.el!;
      const w = el.offsetWidth + 8;
      const h = el.offsetHeight + 6;
      let dy = 0;
      for (let k = 0; k < 8; k++) {
        const r = { x0: it.x - w / 2, x1: it.x + w / 2, y0: it.y + dy - h / 2, y1: it.y + dy + h / 2 };
        const hit = placed.find((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
        if (!hit) break;
        dy = hit.y0 - h / 2 - it.y - 1;
      }
      // keep clear of the top HUD row
      const minY = size.height * 0.14 + h / 2;
      if (it.y + dy < minY) dy = minY - it.y;
      placed.push({ x0: it.x - w / 2, x1: it.x + w / 2, y0: it.y + dy - h / 2, y1: it.y + dy + h / 2 });
      el.style.transform = `translateY(${dy.toFixed(1)}px)`;
    }
  });
  return (
    <>
      {ZONE_IDS.map((z) => {
        const l = layout[z];
        const def = zones[z];
        const tap = (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          onTap(z);
        };
        const p: V3 = [l.pos[0], l.hit[1] / 2, l.pos[2]];
        return (
          <group key={z}>
            <mesh visible={false} geometry={hitGeo} position={p} scale={l.hit} rotation-y={l.ry} onClick={tap} />
            {ready && !phone && (
              <Html position={[l.pos[0], def.built ? l.labelY : l.pos[1] + 2.6, l.pos[2]]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'none' }}>
                <div
                  ref={(el) => void (els.current[z] = el)}
                  data-testid={`label-${z}`}
                  style={{
                    padding: '2px 9px', borderRadius: 10, background: def.built ? 'rgba(29,42,68,0.82)' : 'rgba(90,100,120,0.7)', color: def.built ? '#fff' : '#E4E8F0',
                    fontWeight: 800, fontSize: 14, lineHeight: 1.3, whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: 0.2,
                  }}
                >
                  {def.title}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

function noRaycast(): void {
  /* decoration is never a tap target */
}

/** Everything that moves on the island: flags, bubbles, ball, stage lights, cranes, butterflies, flames, floating bricks. */
export function Life({ builtKey, birthday, candles }: { builtKey: string; birthday: boolean; candles: number }) {
  const built = (z: ZoneId) => builtKey[ZONE_IDS.indexOf(z)] === '1';
  return (
    <>
      <Clouds />
      <FloatingBricks />
      <Butterflies />
      <Flames count={candles} />
      {built('story') && (
        <>
          <Flag zone="story" local={[0, 5.35, 0]} color="#E63946" />
          <Flag zone="story" local={[1.8, 3.5, -0.4]} color="#FFD60A" scale={0.6} phase={1.5} />
        </>
      )}
      {built('science') && (
        <>
          <Bubbles zone="science" local={[2.1, 1.15, 1.0]} height={1.7} radius={0.16} color="#B5FFC8" />
          <Bubbles zone="science" local={[-2.2, 1.15, 1.0]} height={1.7} radius={0.16} color="#FFD3EA" />
          <Bubbles zone="science" local={[0, 1.75, 0.3]} height={0.7} radius={0.2} count={6} color="#E6FFEE" />
        </>
      )}
      {built('tennis') && <TennisBall />}
      {built('music') && <StageLights />}
      {ZONE_IDS.filter((z) => !built(z)).map((z) => (
        <CraneArm key={z} zone={z} />
      ))}
      {birthday && (
        <>
          <Balloons />
          <ConfettiBricks />
        </>
      )}
    </>
  );
}
