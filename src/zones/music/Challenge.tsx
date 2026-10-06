import { useUi } from '../../state/ui';
import { Button, palette } from '../../ui/Button';
import { f, u } from '../../ui/scale';
import { InstrumentIcon } from './InstrumentIcons';

/** Placeholder until a coupon challenge exists for the Music Stage (see src/config/coupons.ts). */
export function Challenge() {
  const setScreen = useUi((s) => s.setScreen);
  return (
    <div className="screen" data-testid="challenge-screen-music" style={{ background: 'linear-gradient(180deg, #1B1450 0%, #4B2A8A 55%, #C2559F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(10)} 0 ${palette.navy}`, padding: `${u(30)} ${u(48)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(16), maxWidth: u(720), textAlign: 'center', color: palette.navy }}>
        <div style={{ display: 'flex', gap: u(12) }}>
          <InstrumentIcon id="drums" size={56} /><InstrumentIcon id="keyboard" size={56} /><InstrumentIcon id="guitar" size={56} /><InstrumentIcon id="xylophone" size={56} />
        </div>
        <div style={{ fontSize: f(40), fontWeight: 900 }}>No coupon challenge here (yet)!</div>
        <div style={{ fontSize: f(26), fontWeight: 700 }}>Jam instead.</div>
        <div style={{ display: 'flex', gap: u(14), flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button testId="jam-instead" tone="mint" onClick={() => setScreen({ kind: 'zone', zone: 'music' })}>Jam on the stage</Button>
          <Button testId="back-to-island" tone="cream" onClick={() => setScreen({ kind: 'hub' })}>Back to island</Button>
        </div>
      </div>
    </div>
  );
}
