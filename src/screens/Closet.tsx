import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { closetItems, isUnlocked, unlockThreshold } from '../config/closet';
import { brickGoal } from '../config/zones';
import { useProgress } from '../state/progress';
import { useCloset } from '../state/closet';
import { Button } from '../ui/Button';
import { Avatar } from '../three/Avatar';
import { Lights } from '../three/Lights';
import { canvasProps } from '../three/Brick';
import { sfx } from '../audio/engine';

function Turntable() {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.5;
  });
  return (
    <group ref={g}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.5, 1.6, 0.24, 24]} />
        <meshStandardMaterial color="#FF9CC8" />
      </mesh>
      <Avatar id="luna" scale={1.15} wave wand />
    </group>
  );
}

/** Dress-up closet: Luna on a turntable plus a grid of items that unlock with Birthday Bricks. */
export function Closet({ onClose }: { onClose: () => void }) {
  const total = useProgress((s) => s.totalBricks());
  const goal = brickGoal();
  const equipped = useCloset((s) => s.equipped);
  const toggle = useCloset((s) => s.toggle);
  return (
    <div className="screen" data-testid="closet" style={{ zIndex: 80, background: 'linear-gradient(#FFB3D6, #FFF4E0)', display: 'flex' }}>
      <div style={{ flex: '0 0 42%', position: 'relative' }}>
        <Canvas {...canvasProps} camera={{ position: [0, 2.6, 9.2], fov: 38 }} onCreated={({ camera }) => camera.lookAt(0, 1.45, 0)}>
          <Lights />
          <Turntable />
        </Canvas>
      </div>
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 42, color: '#E63946', textShadow: '0 3px 0 #1D2A44' }}>Dress-up Closet</h1>
          <Button tone="cream" testId="closet-close" onClick={onClose}>Done</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
          {closetItems.map((it) => {
            const open = isUnlocked(it, total, goal);
            const on = equipped.includes(it.id);
            const need = unlockThreshold(it, goal);
            return (
              <button
                key={it.id}
                type="button"
                data-testid={`closet-item-${it.id}`}
                data-locked={!open}
                data-equipped={on}
                aria-pressed={on}
                onClick={() => {
                  if (!open) {
                    sfx('oops');
                    return;
                  }
                  sfx(on ? 'tap' : 'sparkle');
                  toggle(it.id);
                }}
                style={{
                  minHeight: 112, padding: 10, borderRadius: 24, border: '4px solid #1D2A44', boxShadow: '0 6px 0 #1D2A44',
                  background: !open ? '#D6D9DF' : on ? '#7AE582' : '#FFFBEF', color: '#1D2A44', fontFamily: 'inherit',
                  fontWeight: 800, fontSize: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  cursor: 'pointer', filter: open ? 'none' : 'grayscale(1)',
                }}
              >
                <span style={{ fontSize: 40 }} aria-hidden>{open ? it.emoji : '🧱'}</span>
                <span>{it.name}</span>
                <span style={{ fontSize: 16 }}>{open ? (on ? 'Wearing!' : 'Tap to wear') : `🔒 ${need} brick${need > 1 ? 's' : ''}`}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
