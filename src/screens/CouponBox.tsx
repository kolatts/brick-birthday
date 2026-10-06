import type { CouponId } from '../types';
import { coupons, type CouponDef } from '../config/coupons';
import { zones } from '../config/zones';
import { useCoupons } from '../state/coupons';
import { useProgress } from '../state/progress';
import { Button } from '../ui/Button';
import { f, scaleForHeight, u } from '../ui/scale';
import { CouponArt } from '../ui/CouponArt';
import { Icon, LockIcon } from '../ui/Icons';
import { Password } from './CouponCard';

function Item({ c, onOpen }: { c: CouponDef; onOpen: (id: CouponId) => void }) {
  const status = useCoupons((s) => (s.dug.includes(c.id) ? 'dug' : 'open'));
  const pending = useCoupons((s) => s.challengeComplete.includes(c.id) && !s.dug.includes(c.id));
  const zone = zones[c.zone];
  const need = useProgress((s) => Math.max(0, zone.bricks - s.bricks[c.zone]));
  const earned = status !== 'open';
  return (
    <div
      data-testid={`coupon-item-${c.id}`}
      data-status={earned ? status : pending ? 'pending' : 'locked'}
      onClick={earned ? () => onOpen(c.id) : undefined}
      style={{
        position: 'relative', background: earned ? '#FFFBEF' : '#E4E1DA', border: `${u(4)} solid ${earned ? '#1D2A44' : '#A9A59C'}`, borderRadius: u(24),
        boxShadow: earned ? `0 ${u(6)} 0 #1D2A44` : 'none', padding: u(12), display: 'flex', gap: u(12), alignItems: 'center', minHeight: u(150),
        color: earned ? '#1D2A44' : '#5B6070', cursor: earned ? 'pointer' : 'default',
      }}
    >
      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <div style={{ opacity: earned ? 1 : 0.5, filter: earned ? 'none' : 'grayscale(1)' }}>
          <CouponArt id={c.id} size={Math.round(Math.max(64, 130 * scaleForHeight(window.innerHeight)))} />
        </div>
        {!earned && <LockIcon size={36} style={{ position: 'absolute', right: 2, bottom: 2 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: f(28), fontWeight: 900 }}>{c.title}</div>
        {earned ? (
          <Password id={c.id} size={Math.round(Math.max(18, 30 * scaleForHeight(window.innerHeight)))} minHeight={40} />
        ) : pending ? (
          <div style={{ fontSize: f(20), fontWeight: 800 }}>Treasure is buried on the island! Go dig it up!</div>
        ) : (
          <div data-testid={`coupon-how-${c.id}`} data-ready={need === 0} style={{ display: 'flex', flexDirection: 'column', gap: u(6), alignItems: 'flex-start' }}>
            <span style={{ fontSize: f(17), fontWeight: 900, color: zone.color === '#FFD60A' ? '#1D2A44' : '#fff', background: zone.color, border: `${u(3)} solid #1D2A44`, borderRadius: u(16), padding: `${u(1)} ${u(10)}`, textShadow: zone.color === '#FFD60A' ? 'none' : '0 1px 0 rgba(29,42,68,0.6)' }}>
              Win it: {zone.title} Coupon Challenge
            </span>
            <span style={{ fontSize: f(20), fontWeight: 800 }}>
              {!zone.built ? 'Coming soon!' : need === 0 ? 'Ready to play!' : `Earn ${need} more ${need === 1 ? 'brick' : 'bricks'} first`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Treasure chest panel listing all coupons: locked, buried or earned (with password). */
export function CouponBox({ onClose, onOpenCard }: { onClose: () => void; onOpenCard: (id: CouponId) => void }) {
  return (
    <div
      className="screen"
      data-testid="coupon-box"
      style={{ zIndex: 80, background: 'rgba(29,42,68,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `calc(${u(16)} + var(--sat)) calc(${u(16)} + var(--sar)) calc(${u(16)} + var(--sab)) calc(${u(16)} + var(--sal))` }}
    >
      <div
        className="scroll"
        style={{
          width: 'min(1040px, 100%)', maxHeight: `calc(100% - ${u(10)})`, background: '#B5793F', border: `${u(6)} solid #1D2A44`,
          borderRadius: u(32), boxShadow: `0 ${u(10)} 0 #1D2A44`, padding: u(20), display: 'flex', flexDirection: 'column', gap: u(14),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: u(12) }}>
          <h1 style={{ margin: 0, fontSize: f(44), color: '#FFF4E0', textShadow: `0 ${u(3)} 0 #1D2A44` }}><Icon id="treasure-chest" size={f(54)} gap={u(10)} />Treasure Chest</h1>
          <Button tone="cream" testId="coupon-box-close" onClick={onClose}>Close</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${u(440)}), 1fr))`, gap: u(16) }}>
          {coupons.map((c) => (
            <Item key={c.id} c={c} onOpen={onOpenCard} />
          ))}
        </div>
      </div>
    </div>
  );
}
