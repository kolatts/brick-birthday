import type { CSSProperties, ReactNode } from 'react';
import { f, u } from './scale';

export const palette = {
  pink: '#FF5CA8',
  red: '#E63946',
  blue: '#3A86FF',
  yellow: '#FFD60A',
  mint: '#7AE582',
  cream: '#FFF4E0',
  navy: '#1D2A44',
} as const;

type Tone = 'pink' | 'red' | 'blue' | 'yellow' | 'mint' | 'cream';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  big?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  testId?: string;
  ariaLabel?: string;
}

export function Button({ children, onClick, tone = 'pink', big = false, disabled, style, testId, ariaLabel }: ButtonProps) {
  const dark = tone === 'yellow' || tone === 'mint' || tone === 'cream';
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 'var(--btn-min)',
        minHeight: big ? `max(calc(var(--btn-min) * 1.3), ${u(96)})` : 'var(--btn-min)',
        padding: big ? `${u(12)} ${u(56)}` : `${u(10)} ${u(28)}`,
        fontSize: big ? f(44) : f(24),
        fontWeight: 800,
        fontFamily: 'inherit',
        color: dark ? palette.navy : '#fff',
        background: palette[tone],
        border: `${u(4)} solid ${palette.navy}`,
        borderRadius: big ? u(40) : u(28),
        boxShadow: `0 ${u(6)} 0 ${palette.navy}`,
        cursor: 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: palette.cream,
        border: `${u(4)} solid ${palette.navy}`,
        borderRadius: u(28),
        boxShadow: `0 ${u(8)} 0 ${palette.navy}`,
        padding: u(24),
        color: palette.navy,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
