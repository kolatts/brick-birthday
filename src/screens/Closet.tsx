import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { closetItems, closetSlots, isUnlocked, unlockThreshold, type ClosetSlot } from '../config/closet';
import { closetLockedLine } from '../config/copy';
import { brickGoal } from '../config/zones';
import { useProgress } from '../state/progress';
import { useCloset } from '../state/closet';
import { Button, palette } from '../ui/Button';
import { f, u, ub } from '../ui/scale';
import { CheckIcon, LockIcon } from '../ui/Icons';
import { ItemThumb } from '../ui/ItemThumb';
import { Avatar } from '../three/Avatar';
import { Lights } from '../three/Lights';
import { FitFov } from '../three/FitFov';
import { canvasProps } from '../three/Brick';
import { sfx } from '../audio/engine';
import { say } from '../audio/speech';

const SLOT_LABEL: Record<ClosetSlot, string> = {
  headwear: 'Head',
  eyewear: 'Eyes',
  outfit: 'Outfit',
  outerwear: 'Outerwear',
  footwear: 'Feet',
  pets: 'Pets',
};

function Turntable({ petHats }: { petHats: boolean }) {
  const g = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.4;
  });
  return (
    <group ref={g}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.5, 1.6, 0.24, 24]} />
        <meshStandardMaterial color="#FF9CC8" />
      </mesh>
      <Avatar id="luna" scale={1.05} wave wand />
      {petHats && (
        <>
          <Avatar id="rudolph" scale={0.5} partyHat position={[-1.25, 0, 1.35]} rotationY={0.5} interactive={false} />
          <Avatar id="jinglebells" scale={0.5} partyHat position={[1.25, 0, 1.35]} rotationY={-0.5} interactive={false} phase={1} />
        </>
      )}
    </group>
  );
}

/** Dress-up closet: Luna on a turntable plus wardrobe cards, grouped by slot, that unlock with Birthday Bricks. */
export function Closet({ onClose }: { onClose: () => void }) {
  const total = useProgress((s) => s.totalBricks());
  const goal = brickGoal();
  const equipped = useCloset((s) => s.equipped);
  const toggle = useCloset((s) => s.toggle);
  const [hint, setHint] = useState<string | null>(null);
  return (
    <div className="screen" data-testid="closet" style={{ zIndex: 80, background: 'linear-gradient(#FFB3D6, #FFF4E0)', display: 'flex', paddingLeft: 'var(--sal)', paddingRight: 'var(--sar)' }}>
      <div style={{ flex: '0 0 40%', position: 'relative' }}>
        <Canvas {...canvasProps} camera={{ position: [0, 2.9, 11], fov: 38 }} onCreated={({ camera }) => camera.lookAt(0, 1.35, 0)}>
          <FitFov base={38} />
          <Lights />
          <Turntable petHats={equipped.includes('pethats')} />
        </Canvas>
      </div>
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, padding: `calc(${u(18)} + var(--sat)) ${u(20)} calc(${u(12)} + var(--sab))`, display: 'flex', flexDirection: 'column', gap: u(10) }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: u(12) }}>
          <div>
            <h1 style={{ margin: 0, fontSize: f(40), color: '#E63946' }}>Dress-up Closet</h1>
            <div data-testid="closet-bricks" style={{ fontSize: f(20), fontWeight: 800 }}>You have {total} of {goal} Birthday Bricks</div>
          </div>
          <Button tone="cream" testId="closet-close" onClick={onClose}>Done</Button>
        </div>
        {hint && (
          <div data-testid="closet-hint" role="status" style={{ background: '#FFE9A8', border: `${u(3)} solid ${palette.navy}`, borderRadius: u(20), padding: `${u(8)} ${u(14)}`, fontSize: f(20), fontWeight: 800 }}>
            {hint}
          </div>
        )}
        <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: u(10), paddingBottom: u(24) }}>
        {closetSlots.map((slot) => {
          const items = closetItems.filter((i) => i.slot === slot);
          if (!items.length) return null;
          return (
            <section key={slot} aria-label={SLOT_LABEL[slot]}>
              <h2 style={{ margin: `${u(4)} 0 ${u(6)}`, fontSize: f(22), color: palette.navy, opacity: 0.8 }}>{SLOT_LABEL[slot]}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${u(230)}, 1fr))`, gap: u(12) }}>
                {items.map((it) => {
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
                          setHint(`Earn ${need} Birthday ${need === 1 ? 'Brick' : 'Bricks'} in the Story Tower or the Whispering Woods.`);
                          void say(closetLockedLine(need), { speaker: 'narrator' });
                          return;
                        }
                        setHint(null);
                        sfx(on ? 'tap' : 'sparkle');
                        toggle(it.id);
                      }}
                      style={{
                        position: 'relative', minHeight: `max(var(--btn-min), ${u(84)})`, padding: `${u(8)} ${u(12)}`, borderRadius: u(22), fontFamily: 'inherit', textAlign: 'left',
                        border: on ? `${u(5)} solid ${palette.blue}` : open ? `${u(3)} solid ${palette.navy}` : `${u(3)} solid #B8BDC9`,
                        boxShadow: on ? `0 ${u(4)} 0 ${palette.blue}` : open ? `0 ${u(4)} 0 ${palette.navy}` : 'none',
                        background: open ? '#FFFBEF' : '#ECEEF2', color: open ? palette.navy : '#6B7488', fontWeight: 800, fontSize: f(19),
                        display: 'flex', alignItems: 'center', gap: u(12), cursor: 'pointer',
                      }}
                    >
                      <span style={{ position: 'relative', display: 'inline-flex' }}>
                        <span style={{ filter: open ? 'none' : 'grayscale(0.4)', opacity: open ? 1 : 0.75, display: 'inline-flex' }}>
                          <ItemThumb id={it.id} size={ub(56)} />
                        </span>
                        {!open && <LockIcon size={24} style={{ position: 'absolute', right: -6, bottom: -4 }} />}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: u(2), minWidth: 0, flex: 1 }}>
                        <span>{it.name}</span>
                        <span style={{ fontSize: f(16), fontWeight: 700 }}>{open ? (on ? 'On' : 'Tap to wear') : `Earn ${need} Birthday ${need === 1 ? 'Brick' : 'Bricks'}`}</span>
                      </span>
                      {on && <CheckIcon size={28} />}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
        </div>
      </div>
    </div>
  );
}
