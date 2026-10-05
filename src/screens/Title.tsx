import { useRef } from 'react';
import { celebrationAge, ordinal } from '../config/age';
import { family } from '../config/family';
import { Button } from '../ui/Button';
import { useUi } from '../state/ui';
import { sfx } from '../audio/engine';
import { Canvas } from '@react-three/fiber';
import { Avatar } from '../three/Avatar';
import { Lights } from '../three/Lights';
import { canvasProps } from '../three/Brick';

const LONG_PRESS_MS = 3000;

export function Title() {
  const setScreen = useUi((s) => s.setScreen);
  const timer = useRef<number | null>(null);
  const age = celebrationAge(family.luna.birthDate!);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const start = () => {
    cancel();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setScreen({ kind: 'grownup' });
    }, LONG_PRESS_MS);
  };

  return (
    <div className="screen center-col" style={{ background: 'linear-gradient(#FFB3D6, #FFF4E0)' }} data-testid="title-screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}>
        <div data-testid="title-avatar" style={{ width: 'min(30vw, 400px)', height: 'min(62vh, 560px)', flex: '0 0 auto' }}>
          <Canvas {...canvasProps} camera={{ position: [0, 2.0, 7.2], fov: 34 }} onCreated={({ camera }) => camera.lookAt(0, 1.5, 0)}>
            <Lights />
            <Avatar id="luna" wave wand scale={1.3} rotationY={0.3} />
          </Canvas>
        </div>
        <div className="center-col" style={{ flex: '0 1 auto' }}>
      <h1
        data-testid="title-heading"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ margin: 0, fontSize: 'clamp(34px, 5.2vw, 68px)', color: '#E63946', textShadow: '0 4px 0 #1D2A44', padding: '0 24px' }}
      >
        Happy {ordinal(age)} Birthday, Luna!
      </h1>
      <Button
        big
        tone="blue"
        testId="play-button"
        style={{ fontSize: 64, minHeight: 120, padding: '12px 72px' }}
        onClick={() => {
          sfx('pop');
          setScreen({ kind: 'hub' });
        }}
      >
        Play
      </Button>
        </div>
      </div>
    </div>
  );
}
