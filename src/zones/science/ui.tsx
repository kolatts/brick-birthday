import type { CSSProperties, ReactNode } from 'react';
import { BASE_URL } from '../../env';
import { palette } from '../../ui/Button';
import { f, inset, u, ub } from '../../ui/scale';
import { CheckIcon } from '../../ui/Icons';
import { useLab } from './store';

export const LAB_SKY = 'linear-gradient(180deg, #BFEDE0 0%, #DDF7EE 55%, #FFF4E0 100%)';
export const COUPON_IMG = `${BASE_URL}art/coupon-scene-videogames.webp`;

export const SCI_CSS = `
@keyframes sci-pulse { 0%,100% { box-shadow: 0 6px 0 #1D2A44, 0 0 10px 3px rgba(255,214,10,.6); } 50% { box-shadow: 0 6px 0 #1D2A44, 0 0 28px 12px rgba(255,214,10,1); } }
@keyframes sci-bubble { 0% { transform: translateX(-50%) translateY(-12px) scale(.9); opacity: 0; } 100% { transform: translateX(-50%); opacity: 1; } }
@keyframes sci-pop { 0% { transform: translate(-50%,-50%) scale(.4); opacity: 0; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
@keyframes sci-neon { 0%,100% { color: #FFF; text-shadow: 0 0 8px #FF5CA8, 0 0 22px #FF5CA8, 0 0 44px #3A86FF; } 50% { color: #FFE9FF; text-shadow: 0 0 8px #3A86FF, 0 0 24px #3A86FF, 0 0 50px #FF5CA8; } }
@keyframes sci-flash { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.35); } }
.sci-tile { transition: transform .08s; }
.sci-tile:active { transform: translateY(3px); }
`;

/** Chunky round-ish HUD button style. */
export function hudStyle(bg: string): CSSProperties {
  return {
    background: bg, color: palette.navy, border: `${u(4)} solid ${palette.navy}`, boxShadow: `0 ${u(6)} 0 ${palette.navy}`, fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
  };
}

export function Tile({
  testId, label, icon, onClick, bg = '#FFFFFF', selected, pulse, done, dim, wide, onPointerDown, onPointerUp, small,
}: {
  testId: string; label: string; icon: ReactNode; onClick?: () => void; bg?: string; selected?: boolean; pulse?: boolean; done?: boolean; dim?: boolean; wide?: boolean;
  onPointerDown?: () => void; onPointerUp?: () => void; small?: boolean;
}) {
  const sz = small ? 84 : 104;
  return (
    <button
      type="button"
      className="sci-tile"
      data-testid={testId}
      aria-label={label}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        ...hudStyle(bg), flexDirection: 'column', gap: u(2), position: 'relative', minWidth: ub(wide ? sz * 1.5 : sz), minHeight: ub(sz), padding: `${u(6)} ${u(10)}`,
        borderRadius: u(24), opacity: dim ? 0.6 : 1, outline: selected ? `${u(6)} solid #FF5CA8` : 'none', outlineOffset: u(2), animation: pulse ? 'sci-pulse 1.3s ease-in-out infinite' : undefined,
        touchAction: 'none',
      }}
    >
      {icon}
      <span style={{ fontSize: f(small ? 18 : 20), fontWeight: 900, lineHeight: 1.05, textAlign: 'center' }}>{label}</span>
      {done && (
        <span style={{ position: 'absolute', top: u(-10), right: u(-10), background: '#7AE582', border: `${u(3)} solid ${palette.navy}`, borderRadius: '50%', width: u(34), height: u(34), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckIcon size={20} />
        </span>
      )}
    </button>
  );
}

export function Caption() {
  const caption = useLab((s) => s.caption);
  if (!caption) return null;
  return (
    <div
      key={caption.id}
      data-testid="caption"
      style={{
        position: 'absolute', top: `calc(${inset('top', 12)} + var(--btn-min) + ${u(12)})`, left: '50%', transform: 'translateX(-50%)', zIndex: 70, width: 'max-content', maxWidth: 'min(860px, 78vw)',
        background: '#fff', border: `${u(5)} solid ${palette.navy}`, borderRadius: u(36), boxShadow: `0 ${u(8)} 0 ${palette.navy}`, padding: `${u(10)} ${u(28)} ${u(12)}`, textAlign: 'center',
        color: palette.navy, animation: 'sci-bubble .25s ease-out', pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: f(18), fontWeight: 900, color: '#0E9F83', letterSpacing: u(1), textTransform: 'uppercase' }}>Julian</div>
      <div style={{ fontSize: f(30), fontWeight: 800, lineHeight: 1.22 }}>{caption.text}</div>
    </div>
  );
}

/** Bottom HUD panel. */
export function HudPanel({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: inset('bottom', 14), zIndex: 60, width: 'max-content', maxWidth: '96vw',
        background: 'rgba(255,244,224,0.96)', border: `${u(4)} solid ${palette.navy}`, borderRadius: u(30), boxShadow: `0 ${u(8)} 0 ${palette.navy}`, padding: `${u(12)} ${u(18)} ${u(14)}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(8), color: palette.navy,
      }}
    >
      {children}
    </div>
  );
}

export const Row = ({ children, gap = 14 }: { children: ReactNode; gap?: number }) => (
  <div style={{ display: 'flex', gap: u(gap), alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>{children}</div>
);

export function CouponBadge({ size = 46 }: { size?: number }) {
  return <img src={COUPON_IMG} alt="" draggable={false} style={{ width: u(size * 1.5), height: u(size), objectFit: 'cover', borderRadius: u(8), border: `${u(3)} solid ${palette.navy}`, flex: '0 0 auto', pointerEvents: 'none' }} />;
}
