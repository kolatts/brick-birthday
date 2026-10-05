import type { CouponId } from '../types';
import { couponById } from '../config/coupons';
import { useFamilyPack } from '../state/familyPack';
import { Button } from '../ui/Button';
import { CouponArt } from '../ui/CouponArt';

export const NO_PACK_TEXT = 'Ask a grown-up to load the family pack';
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/** The password for a coupon from the family pack, or null without one. */
export function usePassword(id: CouponId): string | null {
  return useFamilyPack((s) => s.pack?.passwords[id] ?? null);
}

export function Password({ id, size = 84 }: { id: CouponId; size?: number }) {
  const pw = usePassword(id);
  if (!pw) {
    return (
      <div data-testid="coupon-nopack" style={{ fontSize: Math.max(22, size / 3), fontWeight: 800, color: '#1D2A44' }}>
        {NO_PACK_TEXT}
      </div>
    );
  }
  return (
    <div
      data-testid="coupon-password"
      style={{
        fontFamily: MONO, fontWeight: 900, fontSize: size, letterSpacing: '0.08em', color: '#1D2A44', background: '#fff',
        border: '5px dashed #E63946', borderRadius: 24, padding: '4px 28px', lineHeight: 1.15, whiteSpace: 'nowrap',
      }}
    >
      {pw}
    </div>
  );
}

/** Full-screen coupon card shown after the treasure dig (and from the Coupon Box). */
export function CouponCard({ id, onClose }: { id: CouponId; onClose: () => void }) {
  const def = couponById(id);
  return (
    <div
      className="screen center-col"
      data-testid="coupon-card"
      style={{ zIndex: 100, background: 'radial-gradient(circle at 50% 30%, #FFF4E0, #FFB3D6)', gap: 'clamp(6px, 1.6vh, 18px)', padding: 16 }}
    >
      <CouponArt id={id} size={Math.min(240, Math.round(window.innerHeight * 0.28))} />
      <h1 style={{ margin: 0, fontSize: 'clamp(34px, 7vh, 60px)', color: '#E63946', textShadow: '0 3px 0 #1D2A44' }}>{def.title}</h1>
      <p style={{ margin: 0, fontSize: 'clamp(20px, 3.6vh, 32px)', fontWeight: 800 }}>{def.line}</p>
      <Password id={id} size={Math.min(84, Math.round(window.innerWidth / 13))} />
      <p style={{ margin: 0, fontSize: 'clamp(24px, 4.4vh, 40px)', fontWeight: 900, color: '#3A86FF' }}>Show this to Daddy!</p>
      <Button tone="mint" big testId="coupon-close" onClick={onClose}>Close</Button>
    </div>
  );
}
