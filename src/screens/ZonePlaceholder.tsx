import type { ZoneId } from '../types';
import { zones } from '../config/zones';
import { useUi } from '../state/ui';
import { Button } from '../ui/Button';

export function ZonePlaceholder({ zone, challenge = false }: { zone: ZoneId; challenge?: boolean }) {
  const setScreen = useUi((s) => s.setScreen);
  const def = zones[zone];
  return (
    <div className="screen center-col" style={{ background: def.color }} data-testid={`zone-screen-${zone}`}>
      <h1 style={{ margin: 0, fontSize: 56, color: '#fff', textShadow: '0 4px 0 #1D2A44' }}>
        {def.title}
        {challenge ? ' Challenge' : ''}
      </h1>
      <p style={{ margin: 0, fontSize: 28, color: '#1D2A44', fontWeight: 700 }}>Placeholder: this place is being built!</p>
      <Button testId="back-to-island" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>
        Back to island
      </Button>
    </div>
  );
}
