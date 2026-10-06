import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Avatar } from '../../three/Avatar';
import { Particles, emit } from '../woods/fx';
import { Court, FlowerPot, Racket } from './models';
import { getSim, tickGame, useTennis } from './game';
import { ballPos, rudolph, WINDOW, RUDOLPH_HOME, POT_POS } from './logic';

const ballGeo = new THREE.SphereGeometry(0.22, 16, 12);
const ballMat = new THREE.MeshStandardMaterial({ color: '#D7F700', roughness: 0.55, emissive: '#9AB000', emissiveIntensity: 0.55 });
const seamGeo = new THREE.TorusGeometry(0.2, 0.018, 6, 24);
const seamMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF' });
const shadowGeo = new THREE.CircleGeometry(1, 20);
shadowGeo.rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: '#0B3D1E', transparent: true, opacity: 0.4, depthWrite: false });
const ringGeo = new THREE.RingGeometry(0.55, 0.78, 32);
ringGeo.rotateX(-Math.PI / 2);

const FLOOR = 0.3;

/** Fixed camera behind and above Luna. */
function Camera() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.position.set(0, 7.4, 17.6);
    camera.lookAt(0, 0.5, -1.6);
  }, [camera]);
  return null;
}

const swing = (age: number) => {
  if (age > 0.34) return 0;
  const k = age / 0.34;
  return Math.sin(k * Math.PI);
};

function BallAndFx() {
  const ball = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const trailT = useRef(0);
  useFrame(() => {
    const sim = getSim();
    const b = ballPos(sim);
    if (ball.current) {
      ball.current.position.set(b[0], b[1], b[2]);
      ball.current.rotation.x = sim.clock * 9;
      ball.current.rotation.z = sim.clock * 5;
    }
    if (shadow.current) {
      const h = Math.max(0, b[1] - 0.5);
      const k = Math.max(0.35, 1 - h * 0.18);
      shadow.current.position.set(b[0], FLOOR + 0.03, b[2]);
      shadow.current.scale.set(0.3 * k, 1, 0.3 * k);
    }
    // landing target ring: pulses green while a tap would hit
    const r = ring.current;
    if (r && ringMat.current) {
      const incoming = sim.phase === 'incoming';
      r.visible = incoming;
      if (incoming) {
        const dt = sim.t - sim.flight;
        const inWin = Math.abs(dt) <= WINDOW;
        r.position.set(sim.to[0], FLOOR + 0.04, sim.to[2] + 0.3);
        const s = inWin ? 1.15 + Math.sin(sim.clock * 14) * 0.08 : 0.8 + Math.max(0, -dt - WINDOW) * 0.25;
        r.scale.set(s, 1, s);
        ringMat.current.color.set(inWin ? '#7AE582' : '#FFFFFF');
        ringMat.current.opacity = inWin ? 0.95 : 0.55;
      }
    }
    if (sim.trail && (sim.phase === 'incoming' || sim.phase === 'returning')) {
      trailT.current += 1;
      if (trailT.current % 2 === 0) emit('sparkle', [b[0], b[1], b[2]], 2);
    }
  });
  return (
    <>
      <group ref={ball}>
        <mesh geometry={ballGeo} material={ballMat} />
        <mesh geometry={seamGeo} material={seamMat} rotation={[0.4, 0.9, 0]} scale={1.03} />
      </group>
      <mesh ref={shadow} geometry={shadowGeo} material={shadowMat} />
      <mesh ref={ring} geometry={ringGeo}>
        <meshBasicMaterial ref={ringMat} color="#FFFFFF" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </>
  );
}

function Luna() {
  const g = useRef<THREE.Group>(null);
  const pose = useRef<{ armR: [number, number, number] | null }>({ armR: null });
  const wave = useTennis((s) => s.lunaCheer);
  useFrame((_, dt) => {
    const sim = getSim();
    const target = sim.phase === 'incoming' || sim.phase === 'returning' ? sim.to[0] * 0.8 : 0;
    const tx = sim.phase === 'incoming' ? target : 0;
    if (g.current) g.current.position.x += (tx - g.current.position.x) * Math.min(1, dt * 4);
    const s = swing(sim.clock - sim.lastSwing);
    // Forehand: the whole arm sweeps from behind her hip forward and up, racket in hand.
    pose.current.armR = s > 0 ? [-0.55 - s * 0.6, 0.3 * s, 0.6 - s * 1.5] : wave ? null : [-0.25, 0, 0.45];
  });
  return (
    <group ref={g} position={[0, FLOOR, 7.6]}>
      <Avatar id="luna" scale={1.25} rotationY={Math.PI + 0.28} interactive={false} wave={wave} pose={pose.current} holdRight={<Racket color="#E63946" />} />
    </group>
  );
}

function Darian() {
  const pose = useRef<{ armR: [number, number, number] | null }>({ armR: null });
  const wave = useTennis((s) => s.darianCheer);
  useFrame(() => {
    const sim = getSim();
    const s = sim.phase === 'incoming' && sim.t < 0.34 ? swing(sim.t) : 0;
    pose.current.armR = s > 0 ? [-0.55 - s * 0.6, 0.3 * s, 0.6 - s * 1.5] : wave ? null : [-0.25, 0, 0.45];
  });
  return (
    <group position={[0.2, FLOOR, -7.9]}>
      <Avatar id="darian" scale={1.2} rotationY={0} interactive={false} wave={wave} pose={pose.current} holdRight={<Racket color="#3A86FF" />} />
    </group>
  );
}

function Rudolph() {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const r = rudolph(getSim());
    if (!g.current) return;
    g.current.position.set(r.x, FLOOR + (r.active ? Math.abs(Math.sin(getSim().clock * 14)) * 0.12 : 0), r.z);
    g.current.rotation.y = r.active ? r.facing + Math.PI : -Math.PI / 2 - 0.5;
  });
  return (
    <group ref={g} position={[RUDOLPH_HOME[0], FLOOR, RUDOLPH_HOME[2]]}>
      <Avatar id="rudolph" scale={1.05} interactive={false} />
    </group>
  );
}

function Pot() {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const sim = getSim();
    if (!g.current) return;
    const bonk = sim.phase === 'miss' && sim.missKind === 'pot' && sim.t > 0.5 && sim.t < 1.5;
    g.current.rotation.z = bonk ? Math.sin((sim.t - 0.5) * 22) * 0.35 * Math.max(0, 1.5 - sim.t) : 0;
  });
  return <FlowerPot ref={g} position={[POT_POS[0], FLOOR, POT_POS[2]]} />;
}

export function CourtScene() {
  useFrame((_, dt) => tickGame(dt));
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 14, 8]} intensity={1.7} />
      <hemisphereLight args={['#BFE6FF', '#7ECB6B', 0.55]} />
      <Camera />
      <Court />
      <Darian />
      <Luna />
      <Rudolph />
      <Pot />
      <BallAndFx />
      <Particles />
    </>
  );
}
