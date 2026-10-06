import type { CouponId } from '../types';
import { couponById } from '../config/coupons';
import { passwords } from '../config/passwords';
import { Button, palette } from '../ui/Button';
import { f, u } from '../ui/scale';
import { CouponArt } from '../ui/CouponArt';

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export function Password({ id, size = 84, minHeight = 56 }: { id: CouponId; size?: number; minHeight?: number }) {
  return (
    <div
      data-testid="coupon-password"
      style={{
        fontFamily: MONO, fontWeight: 900, fontSize: size, letterSpacing: '0.1em', color: '#1D2A44', background: '#fff',
        border: `${u(4)} dashed #E63946`, borderRadius: u(20), padding: `${u(6)} ${u(20)}`, lineHeight: 1.15, whiteSpace: 'nowrap',
        minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {passwords[id]}
    </div>
  );
}

/** Full-screen coupon card shown after the treasure dig: one cream ticket, scene art, the promise, then the password strip. */
export function CouponCard({ id, onClose }: { id: CouponId; onClose: () => void }) {
  const def = couponById(id);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const artSize = Math.min(vw * 0.36, vh * 0.62, 340);
  const colW = Math.min(vw * 0.94 - artSize - 60, 600);
  const pwSize = Math.max(18, Math.min(60, Math.floor(colW / 11.5)));
  return (
    <div
      className="screen center-col"
      data-testid="coupon-card"
      style={{ zIndex: 100, background: 'radial-gradient(circle at 50% 30%, #FFF4E0, #FFB3D6)', padding: 'calc(var(--pad) + var(--sat)) calc(var(--pad) + var(--sar)) calc(var(--pad) + var(--sab)) calc(var(--pad) + var(--sal))' }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: u(24), background: palette.cream, border: `${u(5)} solid ${palette.navy}`, borderRadius: u(32),
          boxShadow: `0 ${u(8)} 0 ${palette.navy}`, padding: u(22), maxWidth: '96vw', maxHeight: '100%',
        }}
      >
        <CouponArt id={id} size={Math.round(artSize)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.6vh, 14px)', alignItems: 'stretch', textAlign: 'center', width: colW, minWidth: 0 }}>
          <h1 data-testid="coupon-title" style={{ margin: 0, fontSize: 'clamp(22px, 5.6vh, 44px)', color: '#E63946' }}>{def.experience}</h1>
          <p style={{ margin: 0, fontSize: 'clamp(16px, 3vh, 26px)', fontWeight: 800 }}>{def.line}</p>
          <div style={{ background: '#FFE9F3', borderRadius: u(22), padding: u(12), display: 'flex', flexDirection: 'column', gap: u(8) }}>
            <div style={{ fontSize: f(20), fontWeight: 900, color: '#2F6FE0' }}>Show this to Daddy!</div>
            <Password id={id} size={pwSize} />
          </div>
          <Button tone="mint" testId="coupon-close" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
