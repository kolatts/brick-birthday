import type { CouponId } from '../types';
import { coupons, type CouponDef } from '../config/coupons';
import { zones } from '../config/zones';
import { useCoupons } from '../state/coupons';
import { Button } from '../ui/Button';
import { CouponArt } from '../ui/CouponArt';
import { Password } from './CouponCard';

function Stamp() {
  return (
    <div
      data-testid="redeemed-stamp"
      style={{
        position: 'absolute', top: -16, right: 14, transform: 'rotate(8deg)', border: '5px solid #E63946',
        color: '#E63946', borderRadius: 18, padding: '2px 14px', fontSize: 28, fontWeight: 900, background: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap',
      }}
    >
      Redeemed ✓
    </div>
  );
}

function Item({ c, onOpen }: { c: CouponDef; onOpen: (id: CouponId) => void }) {
  const status = useCoupons((s) => (s.redeemed.includes(c.id) && s.dug.includes(c.id) ? 'redeemed' : s.dug.includes(c.id) ? 'dug' : 'open'));
  const pending = useCoupons((s) => s.challengeComplete.includes(c.id) && !s.dug.includes(c.id));
  const zone = zones[c.zone];
  const earned = status !== 'open';
  return (
    <div
      data-testid={`coupon-item-${c.id}`}
      data-status={earned ? status : pending ? 'pending' : 'locked'}
      onClick={earned ? () => onOpen(c.id) : undefined}
      style={{
        position: 'relative', background: earned ? '#FFFBEF' : '#D6D9DF', border: '4px solid #1D2A44', borderRadius: 24,
        boxShadow: '0 6px 0 #1D2A44', padding: 12, display: 'flex', gap: 12, alignItems: 'center', minHeight: 150,
        filter: earned ? 'none' : 'grayscale(1)', color: '#1D2A44',
      }}
    >
      <div style={{ opacity: earned ? 1 : 0.45 }}>
        <CouponArt id={c.id} size={110} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>{c.title}</div>
        {earned ? (
          <Password id={c.id} size={34} />
        ) : pending ? (
          <div style={{ fontSize: 20, fontWeight: 800 }}>Treasure is buried on the island! Go dig it up!</div>
        ) : (
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            {zone.built ? `🔒 Finish the ${zone.title} challenge!` : `🔒 The ${zone.title} is still being built`}
          </div>
        )}
      </div>
      {status === 'redeemed' && <Stamp />}
    </div>
  );
}

/** Treasure chest panel listing all coupons: locked, buried, earned (with password) or redeemed. */
export function CouponBox({ onClose, onOpenCard }: { onClose: () => void; onOpenCard: (id: CouponId) => void }) {
  return (
    <div
      className="screen"
      data-testid="coupon-box"
      style={{ zIndex: 80, background: 'rgba(29,42,68,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        style={{
          width: 'min(1040px, 100%)', maxHeight: '100%', overflowY: 'auto', background: '#B5793F', border: '6px solid #1D2A44',
          borderRadius: 32, boxShadow: '0 10px 0 #1D2A44', padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 44, color: '#FFF4E0', textShadow: '0 3px 0 #1D2A44' }}>🧰 Treasure Chest</h1>
          <Button tone="cream" testId="coupon-box-close" onClick={onClose}>Close</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 16 }}>
          {coupons.map((c) => (
            <Item key={c.id} c={c} onOpen={onOpenCard} />
          ))}
        </div>
      </div>
    </div>
  );
}
