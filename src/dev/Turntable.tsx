import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import type { Expression, PersonId } from '../types';
import { family } from '../config/family';
import { Avatar } from '../three/Avatar';
import { Lights } from '../three/Lights';
import { canvasProps } from '../three/Brick';
import type { Detail } from '../three/figureGeometry';
import { FriendModel } from '../zones/woods/models';
import type { FriendId } from '../zones/woods/facts';

const FRIENDS: FriendId[] = ['fox', 'deer', 'songbird', 'squirrel', 'rabbit'];

/**
 * Neutral turntable for tuning figures: `?turntable=luna&yaw=0.6&equip=dress,cape&expr=happy&detail=high&wave=1&zoom=1`.
 * `?turntable=all` shows the five people and two pets in a row. Reachable in dev and under ?test=1 builds.
 */
function Stage({ ids, q }: { ids: PersonId[]; q: URLSearchParams }) {
  const yaw = Number(q.get('yaw') ?? 0.5);
  const equip = (q.get('equip') ?? '').split(',').filter(Boolean);
  const expr = (q.get('expr') ?? 'happy') as Expression;
  const detail = (q.get('detail') ?? 'high') as Detail;
  const zoom = Number(q.get('zoom') ?? 1);
  const [spin] = useState(q.get('spin') === '1');
  const n = ids.length;
  return (
    <Canvas {...canvasProps} camera={{ position: [0, 1.7 + (n > 1 ? 0.4 : 0), (n > 1 ? 12.5 : 6.4) / zoom], fov: 30 }} onCreated={(s) => s.camera.lookAt(0, n > 1 ? 1.0 : 1.3, 0)} style={{ background: 'linear-gradient(#cfe8ff,#eaf4ff)' }}>
      <Lights />
      {ids.map((id, i) => (
        <Avatar
          key={id}
          id={id}
          position={[(i - (n - 1) / 2) * 1.8, 0, 0]}
          rotationY={yaw}
          expression={expr}
          equipped={equip}
          detail={detail}
          wave={q.get('wave') === '1'}
          wand={q.get('wand') === '1' && id === 'luna'}
          partyHat={q.get('hat') === '1'}
          interactive={false}
          phase={spin ? 0 : 0}
        />
      ))}
    </Canvas>
  );
}

export function mountTurntable(which: string): void {
  const q = new URLSearchParams(location.search);
  if (which === 'friends') {
    document.body.style.margin = '0';
    const r = document.getElementById('root')!;
    r.style.cssText = 'position:fixed;inset:0';
    createRoot(r).render(
      <Canvas {...canvasProps} camera={{ position: [0, 2, 9], fov: 32 }} onCreated={(s) => s.camera.lookAt(0, 0.9, 0)} style={{ background: 'linear-gradient(#cfe8ff,#eaf4ff)' }}>
        <Lights />
        {FRIENDS.map((f, i) => (
          <group key={f} position={[(i - 2) * 1.9, 0, 0]} rotation-y={Number(q.get('yaw') ?? 0.6)} scale={0.9}>
            <FriendModel type={f} />
          </group>
        ))}
      </Canvas>,
    );
    return;
  }
  const ids = (which === 'all' ? Object.keys(family) : [which]) as PersonId[];
  document.body.style.margin = '0';
  const root = document.getElementById('root')!;
  root.style.cssText = 'position:fixed;inset:0';
  createRoot(root).render(<Stage ids={ids} q={q} />);
}
