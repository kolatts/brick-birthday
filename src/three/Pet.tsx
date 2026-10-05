import { useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { PersonId } from '../types';
import { Avatar } from './Avatar';
import { PET_WAYPOINTS, groundHeight } from './layout';
import { useDig } from './digStore';
import { emitSparkles } from './Wand';
import { setExpression } from '../state/expressions';
import { sfx } from '../audio/engine';
import { rng } from './prims';

const DIRT = ['#8B5A2B', '#A66B3C', '#C98B4F', '#6E4524'];
const hitGeo = new THREE.BoxGeometry(0.95, 1.0, 1.25);

interface PetProps {
  id: PersonId;
  /** Starting world x,z. */
  start: [number, number];
  partyHat?: boolean;
  scale?: number;
  seed?: number;
}

/** A wandering pet: waypoint walk with idle sniffs, spin-jump trick on tap, and runs to dig spots. */
export function Pet({ id, start, partyHat = false, scale = 0.62, seed = 1 }: PetProps) {
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const hopRef = useRef<{ hop: number } | null>(null);
  const rand = useRef(rng(seed * 977));
  const s = useRef({
    x: start[0], z: start[1], tx: start[0], tz: start[1],
    wait: 0.5 + seed * 0.4, heading: 0.6, trick: 0, spin: 0, wp: seed, digT: 0, dirtT: 0, sit: false,
  });

  const nextWaypoint = () => {
    const st = s.current;
    st.wp = (st.wp + 1 + Math.floor(rand.current() * (PET_WAYPOINTS.length - 2))) % PET_WAYPOINTS.length;
    st.tx = PET_WAYPOINTS[st.wp][0] + (rand.current() - 0.5) * 0.6;
    st.tz = PET_WAYPOINTS[st.wp][1] + (rand.current() - 0.5) * 0.6;
  };

  useFrame(({ clock }, rawDt) => {
    const g = root.current;
    const tl = tilt.current;
    if (!g || !tl) return;
    const dt = Math.min(rawDt, 0.05);
    const st = s.current;
    const t = clock.elapsedTime;
    const spot = useDig.getState().spot;

    let speed = 1.15;
    let digging = false;
    if (spot) {
      st.tx = spot.x + (id === 'rudolph' ? 0.55 : -0.55);
      st.tz = spot.z + 0.45;
      speed = 3.6;
      st.wait = 0;
    }
    const dx = st.tx - st.x;
    const dz = st.tz - st.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    if (dist > 0.12 && st.wait <= 0) {
      const step = Math.min(dist, speed * dt);
      st.x += (dx / dist) * step;
      st.z += (dz / dist) * step;
      moving = true;
      const want = Math.atan2(dx, dz);
      let diff = want - st.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      st.heading += diff * Math.min(1, dt * 9);
    } else if (spot) {
      digging = true;
      // face the hole
      const want = Math.atan2(spot.x - st.x, spot.z - st.z);
      let diff = want - st.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      st.heading += diff * Math.min(1, dt * 9);
    } else if (st.wait > 0) {
      st.wait -= dt;
    } else {
      st.wait = 0.8 + rand.current() * 2.6;
      st.sit = rand.current() < 0.45;
      nextWaypoint();
    }

    let y = 0;
    let pitch = 0;
    if (moving) y = Math.abs(Math.sin(t * 11 + seed)) * 0.06;
    else if (digging) {
      pitch = 0.55 + Math.sin(t * 16 + seed) * 0.22;
      y = Math.abs(Math.sin(t * 16 + seed)) * 0.05;
      st.dirtT -= dt;
      if (st.dirtT <= 0 && spot) {
        st.dirtT = 0.22;
        emitSparkles([spot.x, 0.25, spot.z], { count: 7, colors: DIRT, speed: 1.6, gravity: 8, size: 0.1 });
      }
    } else if (st.wait > 0 && !spot) {
      if (st.sit) {
        // sit back on the haunches, tail still wagging
        pitch = -0.38;
        y -= 0.05;
      } else if (st.wait < 1.1) {
        pitch = 0.3 + Math.sin(t * 9 + seed) * 0.12; // idle sniff
      }
    }

    let spin = 0;
    if (st.trick > 0) {
      st.trick = Math.max(0, st.trick - dt);
      const k = 1 - st.trick / 0.9;
      spin = k * Math.PI * 2;
      y += Math.sin(k * Math.PI) * 0.7;
    }

    g.position.set(st.x, y + groundHeight(st.x, st.z), st.z);
    g.rotation.y = st.heading + spin;
    tl.rotation.x = pitch;
  });

  const tap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    s.current.trick = 0.9;
    setExpression(id, 'silly', 1600);
    sfx('pop');
    emitSparkles([s.current.x, 0.9, s.current.z], { count: 10 });
  };

  return (
    <group ref={root} position={[start[0], 0, start[1]]}>
      <group ref={tilt}>
        <Avatar id={id} scale={scale} partyHat={partyHat} interactive={false} hopRef={hopRef} phase={seed * 1.7} />
      </group>
      <mesh visible={false} geometry={hitGeo} position={[0, 0.5, 0.1]} onClick={tap} />
    </group>
  );
}
