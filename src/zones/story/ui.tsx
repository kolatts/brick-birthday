import type { CSSProperties, ReactNode } from 'react';
import { palette } from '../../ui/Button';
import { f, u } from '../../ui/scale';
import { sfx, type SfxName } from '../../audio/engine';

/** Tone throws if two blips start at the same instant (fast taps); a missed blip must never block a tap. */
export function safeSfx(name: SfxName): void {
  try {
    sfx(name);
  } catch {
    /* ignore */
  }
}

export const motion = `
@keyframes st-pop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
@keyframes st-bounce { 0%,100% { transform: translateY(0) rotate(-4deg) } 50% { transform: translateY(-22px) rotate(4deg) } }
@keyframes st-glow { 0%,100% { box-shadow: 0 6px 0 #1D2A44, 0 0 0 0 rgba(255,214,10,.9) } 50% { box-shadow: 0 6px 0 #1D2A44, 0 0 0 18px rgba(255,214,10,0) } }
@keyframes st-burst { 0% { transform: translate(0,0) scale(.3); opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(1.4) rotate(200deg); opacity: 0 } }
@keyframes st-curtain-l { to { transform: translateX(-102%) } }
@keyframes st-curtain-r { to { transform: translateX(102%) } }
@keyframes st-popcorn { 0% { transform: translateY(0) } 50% { transform: translateY(-60px) rotate(25deg) } 100% { transform: translateY(0) } }
@keyframes st-wiggle { 0%,100% { transform: rotate(-3deg) } 50% { transform: rotate(3deg) } }
.st-tile { transition: transform .12s; }
.st-tile:active { transform: translateY(4px) scale(.98) !important; }
`;

/** Warm pink tower backdrop, all inline SVG + CSS: no images, no 3D. */
export function Backdrop({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div
      className="screen"
      data-testid={testId}
      style={{
        background: 'linear-gradient(180deg, #FFD3E6 0%, #FF9CC8 55%, #FF5CA8 100%)',
        overflow: 'hidden',
        color: palette.navy,
      }}
    >
      <style>{motion}</style>
      <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
    </div>
  );
}

/** Small DOM name label for Mom; her 3D brick figure sits in the scene. */
export function MomPortrait() {
  return (
    <div
      data-testid="mom-portrait"
      style={{
        flex: '0 0 auto',
        background: palette.red,
        color: '#fff',
        fontWeight: 900,
        fontSize: f(30),
        padding: `${u(10)} ${u(22)}`,
        borderRadius: u(26),
        border: `${u(4)} solid ${palette.navy}`,
        boxShadow: `0 ${u(6)} 0 ${palette.navy}`,
      }}
    >
      Mom
    </div>
  );
}

/** Soft translucent panel so DOM tiles stay readable over the 3D scene. */
export const softPanel: CSSProperties = {
  background: 'rgba(255, 244, 224, 0.62)',
  border: '4px solid rgba(29, 42, 68, 0.35)',
  borderRadius: u(32),
  backdropFilter: 'blur(3px)',
};

export function Bubble({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        background: '#FFF4E0',
        border: `${u(4)} solid ${palette.navy}`,
        borderRadius: u(28),
        boxShadow: `0 ${u(6)} 0 ${palette.navy}`,
        padding: `${u(14)} ${u(24)}`,
        fontSize: f(30),
        fontWeight: 800,
        lineHeight: 1.25,
      }}
    >
      {children}
    </div>
  );
}
