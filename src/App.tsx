import { Suspense, useEffect } from 'react';
import type { Screen, ZoneId } from './types';
import { useUi, currentOrientation } from './state/ui';
import { useFamilyPack } from './state/familyPack';
import { Title } from './screens/Title';
import { Hub } from './screens/Hub';
import { Rotate } from './screens/Rotate';
import { GrownUp } from './screens/GrownUp';
import { ZonePlaceholder } from './screens/ZonePlaceholder';
import { Button } from './ui/Button';
import { zoneModules } from './zones/registry';
import { playMusic, setSpeaking, type TrackId } from './audio/engine';
import { onSpeaking } from './audio/speech';

/** Which music bed belongs to a screen; null keeps whatever is playing (e.g. the grown-up page). */
export function trackForScreen(screen: Screen): TrackId | null {
  switch (screen.kind) {
    case 'title': return 'title';
    case 'hub': return 'hub';
    case 'zone': return screen.zone === 'story' ? 'story' : screen.zone === 'woods' ? 'woods' : 'hub';
    case 'challenge': return 'challenge';
    case 'finale': return 'finale';
    default: return null;
  }
}

function useMusicForScreen(): void {
  const screen = useUi((s) => s.screen);
  const track = trackForScreen(screen);
  useEffect(() => {
    if (track) void playMusic(track);
  }, [track]);
  useEffect(() => onSpeaking(setSpeaking), []);
}

function FinalePlaceholder() {
  const setScreen = useUi((s) => s.setScreen);
  return (
    <div className="screen center-col" style={{ background: '#FF5CA8' }} data-testid="finale-screen">
      <h1 style={{ fontSize: 56, color: '#fff', margin: 0 }}>Finale (coming soon)</h1>
      <Button tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
    </div>
  );
}

function ZoneRoute({ zone, challenge = false }: { zone: ZoneId; challenge?: boolean }) {
  const mod = zoneModules[zone];
  if (!mod) return <ZonePlaceholder zone={zone} challenge={challenge} />;
  const Comp = challenge ? mod.Challenge : mod.Zone;
  return (
    <Suspense fallback={<div className="screen center-col" style={{ background: '#FFF4E0' }}><h1>Loading...</h1></div>}>
      <Comp />
    </Suspense>
  );
}

export default function App() {
  const screen = useUi((s) => s.screen);
  const orientation = useUi((s) => s.orientation);
  const setOrientation = useUi((s) => s.setOrientation);
  const initPack = useFamilyPack((s) => s.init);
  useMusicForScreen();

  useEffect(() => {
    void initPack();
    const onResize = () => setOrientation(currentOrientation());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    // Safari sometimes skips resize events on rotation; a cheap poll keeps the rotate screen honest.
    const poll = window.setInterval(onResize, 400);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [initPack, setOrientation]);

  return (
    <>
      {screen.kind === 'title' && <Title />}
      {screen.kind === 'hub' && <Hub />}
      {screen.kind === 'zone' && <ZoneRoute zone={screen.zone} />}
      {screen.kind === 'challenge' && <ZoneRoute zone={screen.zone} challenge />}
      {screen.kind === 'finale' && <FinalePlaceholder />}
      {screen.kind === 'grownup' && <GrownUp />}
      {orientation === 'portrait' && <Rotate />}
    </>
  );
}
