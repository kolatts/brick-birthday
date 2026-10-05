import { useState } from 'react';
import type { CouponId } from '../types';
import { couponById } from '../config/coupons';

const FALLBACK: Record<CouponId, { bg: string; icon: string }> = {
  movies: { bg: '#E63946', icon: '🍿' },
  videogames: { bg: '#3A86FF', icon: '🎮' },
  shopping: { bg: '#FF5CA8', icon: '🛍️' },
  icecream: { bg: '#7AE582', icon: '🍨' },
};

/** Coupon illustration (brick-built art from public/art); tiny inline SVG stand-in if the image is missing. */
export function CouponArt({ id, size = 220 }: { id: CouponId; size?: number }) {
  const [failed, setFailed] = useState(false);
  const fb = FALLBACK[id];
  if (failed) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={couponById(id).title} data-testid={`coupon-art-${id}`}>
        <rect x="6" y="14" width="88" height="72" rx="14" fill={fb.bg} stroke="#1D2A44" strokeWidth="4" />
        <text x="50" y="66" fontSize="44" textAnchor="middle">{fb.icon}</text>
      </svg>
    );
  }
  return (
    <img
      data-testid={`coupon-art-${id}`}
      src={`${import.meta.env.BASE_URL}${couponById(id).illustration}`}
      alt={couponById(id).title}
      width={size}
      height={size}
      draggable={false}
      onError={() => setFailed(true)}
      style={{ objectFit: 'contain', width: size, height: size }}
    />
  );
}
