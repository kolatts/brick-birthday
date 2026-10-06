import { useEffect, useState } from 'react';

/**
 * Responsive sizing. `--ui-scale` is 1 on iPad-sized screens and shrinks on phones (set from the
 * viewport height by installUiScale; CSS supplies a vh-based fallback). Use `u()` for lengths and
 * `f()` for font sizes (never below 15px).
 */
export const u = (n: number): string => `calc(${n}px * var(--ui-scale))`;
/** Tap-target length: scaled, but never below the phone minimum (--btn-min). */
export const ub = (n: number): string => `max(var(--btn-min), calc(${n}px * var(--ui-scale)))`;
export const f = (n: number): string => `max(15px, calc(${n}px * var(--ui-scale)))`;
/** Safe-area-aware inset: a base pad plus the notch/home-indicator inset on that side. */
export const inset = (side: 'top' | 'right' | 'bottom' | 'left', n = 14): string => `calc(${u(n)} + env(safe-area-inset-${side}, 0px))`;

export const MIN_SCALE = 0.44;
export const scaleForHeight = (h: number): number => Math.max(MIN_SCALE, Math.min(1, h / 780));
/** Cap the pixel ratio on phones: fill-rate is the bottleneck there. */
export const maxDpr = (): number => Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, typeof innerWidth === 'number' && innerWidth < 900 ? 1.25 : 1.5);
export const isPhone = (): boolean => typeof innerHeight === 'number' && innerHeight < 500;

/** True on short (phone-landscape) viewports; re-evaluates on resize. */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(isPhone());
  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return phone;
}

export function installUiScale(): void {
  const apply = () => document.documentElement.style.setProperty('--ui-scale', String(scaleForHeight(window.innerHeight)));
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
}
