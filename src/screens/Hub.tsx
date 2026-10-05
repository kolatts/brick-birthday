import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { zoneList, type ZoneDef } from '../config/zones';
import { useProgress } from '../state/progress';
import { useUi } from '../state/ui';
import { Button, Panel } from '../ui/Button';
import { setMuted, sfx, startMusic, stopMusic } from '../audio/engine';
import { useSettings } from '../state/settings';

function Building({ zone, angle, onTap }: { zone: ZoneDef; angle: number; onTap: (z: ZoneDef) => void }) {
  const r = 3.4;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const bricks = useProgress((s) => s.bricks[zone.id]);
  return (
    <group position={[x, 0.5, z]} onClick={(e) => { e.stopPropagation(); onTap(zone); }}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.4, 1.2, 1.4]} />
        <meshStandardMaterial color={zone.color} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[1.6, 0.4, 1.6]} />
        <meshStandardMaterial color="#FFF4E0" />
      </mesh>
      <Html center position={[0, 2.3, 0]} zIndexRange={[10, 0]}>
        <button
          type="button"
          data-testid={`zone-${zone.id}`}
          onClick={() => onTap(zone)}
          style={{
            minWidth: 96, minHeight: 64, padding: '8px 16px', fontSize: 20, fontWeight: 800, fontFamily: 'inherit',
            background: '#FFF4E0', color: '#1D2A44', border: '3px solid #1D2A44', borderRadius: 20, whiteSpace: 'nowrap',
          }}
        >
          {zone.title}
          {zone.built ? ` ${bricks}/${zone.bricks}` : ' 🏗'}
        </button>
      </Html>
    </group>
  );
}

function Island({ onTap }: { onTap: (z: ZoneDef) => void }) {
  // drei <Html> drops the very first instance when mounted in the Canvas's first commit; mount labels a frame later.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[5.2, 4.6, 1.2, 32]} />
        <meshStandardMaterial color="#7AE582" />
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <cylinderGeometry args={[4.6, 3.2, 1, 32]} />
        <meshStandardMaterial color="#B5651D" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.0, 1.1, 0.5, 24]} />
        <meshStandardMaterial color="#FF5CA8" />
      </mesh>
      {ready && zoneList.map((z, i) => (
        <Building key={z.id} zone={z} angle={(i / zoneList.length) * Math.PI * 2 + 0.4} onTap={onTap} />
      ))}
    </>
  );
}

export function Hub() {
  const setScreen = useUi((s) => s.setScreen);
  const muted = useSettings((s) => s.muted);
  const [soon, setSoon] = useState<ZoneDef | null>(null);

  useEffect(() => {
    startMusic();
    return () => stopMusic();
  }, []);

  const tap = (z: ZoneDef) => {
    if (!z.built) {
      sfx('oops');
      setSoon(z);
      return;
    }
    sfx('pop');
    setScreen({ kind: 'zone', zone: z.id });
  };

  return (
    <div className="screen" data-testid="hub-screen" style={{ background: 'linear-gradient(#8ED1FC, #E3F6FF)' }}>
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{ position: [7, 6, 9], fov: 45 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        data-testid="hub-canvas"
      >
        <color attach="background" args={['#8ED1FC']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[6, 10, 4]} intensity={1.6} />
        <Island onTap={tap} />
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.6} maxPolarAngle={1.3} />
      </Canvas>

      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 12 }}>
        <Button tone="cream" testId="home-button" onClick={() => setScreen({ kind: 'title' })}>Home</Button>
        <Button tone="cream" testId="mute-button" ariaLabel={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</Button>
      </div>

      {soon && (
        <div className="center-col" style={{ position: 'absolute', inset: 0, background: 'rgba(29,42,68,0.45)' }} data-testid="coming-soon-panel">
          <Panel style={{ textAlign: 'center', maxWidth: 520 }}>
            <div style={{ fontSize: 72 }} aria-hidden>🏗️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 48 }}>Coming soon!</h2>
            <p style={{ margin: '0 0 20px', fontSize: 24 }}>The {soon.title} is still being built.</p>
            <Button testId="coming-soon-close" tone="mint" onClick={() => setSoon(null)}>OK!</Button>
          </Panel>
        </div>
      )}
    </div>
  );
}
