import type { CSSProperties, ReactNode } from 'react';

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
        minWidth: 64,
        minHeight: big ? 96 : 64,
        padding: big ? '12px 56px' : '10px 28px',
        fontSize: big ? 44 : 24,
        fontWeight: 800,
        fontFamily: 'inherit',
        color: dark ? palette.navy : '#fff',
        background: palette[tone],
        border: `4px solid ${palette.navy}`,
        borderRadius: big ? 40 : 28,
        boxShadow: `0 6px 0 ${palette.navy}`,
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
        border: `4px solid ${palette.navy}`,
        borderRadius: 28,
        boxShadow: `0 8px 0 ${palette.navy}`,
        padding: 24,
        color: palette.navy,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
