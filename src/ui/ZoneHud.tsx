import type { CSSProperties } from 'react';
import type { ZoneId } from '../types';
import { zones } from '../config/zones';
import { couponById } from '../config/coupons';
import { useProgress } from '../state/progress';
import { palette } from './Button';
import { BrickIcon, LockIcon } from './Icons';
import { CouponArt } from './CouponArt';
import { f, u, ub } from './scale';

/**
 * Shared zone HUD pieces so every zone explains the same two things the same way:
 * what earns a Birthday Brick (GoalPill) and what wins a Daddy-Daughter coupon (CouponChallengeButton).
 */

/** Small persistent pill: "Earn a Birthday Brick: <what>". */
export function GoalPill({ text, testId = 'goal-pill', style }: { text: string; testId?: string; style?: CSSProperties }) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: u(8), maxWidth: 'min(46vw, 560px)', padding: `${u(4)} ${u(14)} ${u(4)} ${u(10)}`,
        background: 'rgba(255,244,224,0.94)', border: `${u(3)} solid ${palette.navy}`, borderRadius: u(24), color: palette.navy,
        fontSize: f(17), fontWeight: 800, lineHeight: 1.15, boxShadow: `0 ${u(3)} 0 ${palette.navy}`, ...style,
      }}
    >
      <BrickIcon size={28} />
      <span>Earn a Birthday Brick: {text}</span>
    </div>
  );
}

/** True once the zone's bricks are all earned, i.e. its Coupon Challenge is playable. */
export function useChallengeReady(zone: ZoneId): boolean {
  return useProgress((s) => s.bricks[zone] >= zones[zone].bricks);
}

/** Gold "Coupon Challenge" button with the coupon sticker; disabled ("Earn the bricks first") until the zone's bricks are done. */
export function CouponChallengeButton({ zone, onClick, testId = 'challenge-btn', style }: { zone: ZoneId; onClick: () => void; testId?: string; style?: CSSProperties }) {
  const ready = useChallengeReady(zone);
  const id = zones[zone].coupon;
  if (!id) return null;
  const coupon = couponById(id);
  return (
    <button
      type="button"
      data-testid={testId}
      data-ready={ready}
      disabled={!ready}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: u(10), minHeight: ub(64), padding: `${u(4)} ${u(18)} ${u(4)} ${u(8)}`, fontFamily: 'inherit', textAlign: 'left',
        color: ready ? palette.navy : '#5B6070', background: ready ? 'linear-gradient(#FFE45C, #FFC21A)' : '#D9D6CE',
        border: `${u(4)} solid ${ready ? palette.navy : '#9A968C'}`, borderRadius: u(28), boxShadow: `0 ${u(6)} 0 ${ready ? palette.navy : '#9A968C'}`,
        cursor: ready ? 'pointer' : 'default', ...style,
      }}
    >
      <span style={{ position: 'relative', display: 'inline-flex', filter: ready ? 'none' : 'grayscale(1)', opacity: ready ? 1 : 0.6 }}>
        <CouponArt id={coupon.id} size={Math.round(48)} />
        {!ready && <LockIcon size={22} style={{ position: 'absolute', right: -4, bottom: -2 }} />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12 }}>
        <span style={{ fontSize: f(22), fontWeight: 900 }}>Coupon Challenge</span>
        <span style={{ fontSize: f(16), fontWeight: 800 }}>{ready ? `Win the ${coupon.title} coupon!` : 'Earn the bricks first'}</span>
      </span>
    </button>
  );
}
