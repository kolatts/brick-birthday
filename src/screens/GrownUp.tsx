import { useRef } from 'react';
import { Button, Panel } from '../ui/Button';
import { useUi } from '../state/ui';
import { useProgress } from '../state/progress';
import { useCoupons, type CouponStatus } from '../state/coupons';
import { useFamilyPack } from '../state/familyPack';
import { useSettings } from '../state/settings';
import { setVolume } from '../audio/engine';
import { coupons } from '../config/coupons';

const LABEL: Record<CouponStatus, string> = {
  locked: 'Locked',
  available: 'Challenge ready',
  dug: 'Earned',
  redeemed: 'Redeemed',
};

export function GrownUp() {
  const setScreen = useUi((s) => s.setScreen);
  const progress = useProgress();
  const couponStore = useCoupons();
  const { pack, error, importFromFile, remove } = useFamilyPack();
  const volume = useSettings((s) => s.volume);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="screen" data-testid="grownup-screen" style={{ background: '#1D2A44', overflowY: 'auto', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: '#FFF4E0', margin: 0 }}>Grown-up screen</h1>
          <Button tone="cream" testId="grownup-back" onClick={() => setScreen({ kind: 'title' })}>Back</Button>
        </div>

        <Panel>
          <h2 style={{ marginTop: 0 }}>Progress</h2>
          <p>Bricks: {progress.totalBricks()} / goal reached: {progress.goalReached() ? 'yes' : 'no'}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button tone="red" testId="reset-progress" onClick={() => {
              if (window.confirm('Reset all progress and coupons?')) { progress.reset(); couponStore.reset(); }
            }}>Reset progress</Button>
            <Button tone="mint" testId="unlock-bricks" onClick={() => progress.unlockAll()}>Unlock all bricks</Button>
            <Button tone="mint" testId="unlock-challenges" onClick={() => couponStore.unlockAllChallenges()}>Unlock all challenges</Button>
            <Button tone="yellow" testId="replay-finale" onClick={() => setScreen({ kind: 'finale' })}>Replay finale</Button>
          </div>
        </Panel>

        <Panel>
          <h2 style={{ marginTop: 0 }}>Family pack</h2>
          <p data-testid="pack-status">{pack ? 'A family pack is loaded on this device.' : 'No family pack loaded.'}</p>
          {error && <p role="alert" style={{ color: '#E63946', fontWeight: 800 }}>{error}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            data-testid="pack-file-input"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFromFile(f);
              e.target.value = '';
            }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button tone="blue" testId="import-pack" onClick={() => fileRef.current?.click()}>Import family pack</Button>
            <Button tone="red" testId="remove-pack" disabled={!pack} onClick={() => void remove()}>Remove family pack</Button>
          </div>
        </Panel>

        <Panel>
          <h2 style={{ marginTop: 0 }}>Coupons</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {coupons.map((c) => {
              const status = couponStore.status(c.id);
              return (
                <div key={c.id} data-testid={`coupon-row-${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <strong style={{ flex: 1, fontSize: 22 }}>{c.title}</strong>
                  <span data-testid={`coupon-status-${c.id}`} style={{ fontSize: 20 }}>{LABEL[status]}</span>
                  {status === 'redeemed' ? (
                    <Button tone="yellow" testId={`undo-${c.id}`} onClick={() => couponStore.undoRedeem(c.id)}>Undo</Button>
                  ) : (
                    <Button tone="pink" testId={`redeem-${c.id}`} disabled={status !== 'dug'} onClick={() => couponStore.redeem(c.id)}>Mark redeemed</Button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h2 style={{ marginTop: 0 }}>Volume</h2>
          <input
            type="range" min={0} max={1} step={0.05} value={volume} aria-label="Volume"
            data-testid="volume-slider"
            style={{ width: '100%', height: 48 }}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </Panel>
      </div>
    </div>
  );
}
