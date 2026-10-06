import type { InstrumentId } from './songs';

const NAVY = '#1D2A44';

/** Flat, chunky instrument pictures drawn as SVG (no emoji, no image files). */
export function InstrumentIcon({ id, size = 40 }: { id: InstrumentId; size?: number | string }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true, style: { flex: 'none' } } as const;
  switch (id) {
    case 'drums':
      return (
        <svg {...common}>
          <ellipse cx="24" cy="18" rx="16" ry="6" fill="#F3F3F3" stroke={NAVY} strokeWidth="3" />
          <path d="M8 18v14c0 3.4 7.2 6 16 6s16-2.6 16-6V18" fill="#E63946" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <path d="M14 7l10 9M34 7l-10 9" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'keyboard':
      return (
        <svg {...common}>
          <rect x="4" y="12" width="40" height="24" rx="3" fill="#F3F3F3" stroke={NAVY} strokeWidth="3" />
          <path d="M14 12v24M24 12v24M34 12v24" stroke={NAVY} strokeWidth="2.5" />
          <rect x="11" y="12" width="6" height="14" fill={NAVY} />
          <rect x="21" y="12" width="6" height="14" fill={NAVY} />
          <rect x="31" y="12" width="6" height="14" fill={NAVY} />
        </svg>
      );
    case 'guitar':
      return (
        <svg {...common}>
          <path d="M31 17L42 6" stroke={NAVY} strokeWidth="9" strokeLinecap="round" />
          <path d="M31 17L42 6" stroke="#6B3A1E" strokeWidth="4" strokeLinecap="round" />
          <circle cx="16" cy="32" r="11" fill="#FF8C42" stroke={NAVY} strokeWidth="3" />
          <circle cx="24" cy="24" r="7" fill="#FF8C42" stroke={NAVY} strokeWidth="3" />
          <circle cx="19" cy="29" r="3.2" fill={NAVY} />
        </svg>
      );
    case 'xylophone':
      return (
        <svg {...common}>
          {['#E63946', '#FFD60A', '#7AE582', '#3A86FF', '#8E6BFF'].map((c, i) => (
            <rect key={c} x={5 + i * 8} y={10 + i * 2} width="6.5" height={28 - i * 3} rx="2" fill={c} stroke={NAVY} strokeWidth="2.5" />
          ))}
        </svg>
      );
  }
}
