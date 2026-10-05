import type { CSSProperties } from 'react';
import { palette } from '../../ui/Button';

/** Chunky round-ish HUD button style shared by the Woods screens. */
export function hudButton(bg: string): CSSProperties {
  return {
    background: bg,
    color: palette.navy,
    border: `4px solid ${palette.navy}`,
    boxShadow: `0 6px 0 ${palette.navy}`,
    fontFamily: 'inherit',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };
}

export const SKY = 'linear-gradient(180deg, #7CCBFF 0%, #B9E6FF 38%, #FFF0D6 72%, #FFE0EC 100%)';

export const WOODS_CSS = `
@keyframes woods-pulse { 0%,100% { transform: scale(1); opacity: .95; } 50% { transform: scale(1.12); opacity: .6; } }
@keyframes woods-ring { 0%,100% { box-shadow: 0 6px 0 #1D2A44, 0 0 10px 4px rgba(76,183,255,.7); } 50% { box-shadow: 0 6px 0 #1D2A44, 0 0 30px 14px rgba(76,183,255,1); } }
@keyframes woods-glow { 0%,100% { box-shadow: 0 6px 0 #1D2A44, 0 0 18px 6px rgba(255,214,10,.8); } 50% { box-shadow: 0 6px 0 #1D2A44, 0 0 34px 14px rgba(255,236,120,1); } }
@keyframes woods-bounce { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-22px) rotate(4deg); } }
@keyframes woods-pop { 0% { transform: translate(-50%,-50%) scale(.3); opacity: 0; } 20% { transform: translate(-50%,-50%) scale(1.15); opacity: 1; } 70% { transform: translate(-50%,-60%) scale(1); opacity: 1; } 100% { transform: translate(-50%,-90%) scale(1); opacity: 0; } }
@keyframes woods-bubble { 0% { transform: translateY(-12px) scale(.9); opacity: 0; } 100% { transform: none; opacity: 1; } }
`;
