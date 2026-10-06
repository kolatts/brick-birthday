import type { CSSProperties } from 'react';

/** Small owned icons (inline SVG) so primary UI never depends on platform emoji. */
export function BrickIcon({ size = 28, color = '#E63946', style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden width={size} height={size * 0.75} viewBox="0 0 40 30" style={{ flex: '0 0 auto', ...style }}>
      <rect x="2" y="10" width="36" height="18" rx="4" fill={color} stroke="#1D2A44" strokeWidth="2.5" />
      <rect x="7" y="3" width="9" height="8" rx="2" fill={color} stroke="#1D2A44" strokeWidth="2.2" />
      <rect x="24" y="3" width="9" height="8" rx="2" fill={color} stroke="#1D2A44" strokeWidth="2.2" />
      <path d="M7 16 Q10 13.5 15 14" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".7" />
    </svg>
  );
}

export function LockIcon({ size = 24, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" style={{ flex: '0 0 auto', ...style }}>
      <path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="#1D2A44" strokeWidth="2.6" strokeLinecap="round" />
      <rect x="4" y="10.5" width="16" height="11" rx="3" fill="#FFD60A" stroke="#1D2A44" strokeWidth="2.2" />
      <circle cx="12" cy="16" r="1.8" fill="#1D2A44" />
    </svg>
  );
}

export function CheckIcon({ size = 24, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" style={{ flex: '0 0 auto', ...style }}>
      <circle cx="12" cy="12" r="10.5" fill="#7AE582" stroke="#1D2A44" strokeWidth="2.2" />
      <path d="M6.8 12.6l3.6 3.6 6.8-7.4" fill="none" stroke="#1D2A44" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
