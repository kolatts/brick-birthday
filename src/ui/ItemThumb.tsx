/** Simple inline-SVG thumbnails for wardrobe items, drawn from the same colours the 3D items use. */
const NAVY = '#1D2A44';

function Shapes({ id }: { id: string }) {
  switch (id) {
    case 'bow':
      return (
        <>
          <path d="M32 32 L8 18 Q4 32 8 46 Z" fill="#FF5CA8" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <path d="M32 32 L56 18 Q60 32 56 46 Z" fill="#FF5CA8" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <rect x="26" y="24" width="12" height="16" rx="5" fill="#FF8FC4" stroke={NAVY} strokeWidth="3" />
        </>
      );
    case 'dress':
      return (
        <>
          <path d="M24 8 H40 L42 24 L56 56 H8 L22 24 Z" fill="#FF8FC4" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          {[[22, 44], [34, 50], [44, 42], [30, 34]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.2" fill="#fff" />)}
        </>
      );
    case 'cape':
      return (
        <>
          <path d="M18 8 H46 L58 58 Q32 48 6 58 Z" fill="#E63946" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="32" cy="14" r="5" fill="#FFD60A" stroke={NAVY} strokeWidth="2.5" />
          <path d="M32 26 l2 5 5 .5 -4 3.5 1.2 5 -4.2 -2.8 -4.2 2.8 1.2 -5 -4 -3.5 5 -.5z" fill="#FFD60A" />
        </>
      );
    case 'pethats':
      return (
        <>
          <path d="M32 6 L50 54 H14 Z" fill="#3A86FF" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <path d="M22 32 H42 M18 44 H46" stroke="#FFD60A" strokeWidth="4" />
          <circle cx="32" cy="7" r="5" fill="#FF5CA8" stroke={NAVY} strokeWidth="2.5" />
        </>
      );
    case 'visor':
      return (
        <>
          <path d="M8 34 Q32 10 56 34 L56 42 H8 Z" fill="#E63946" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <path d="M6 42 Q32 62 58 42 Z" fill="#FF6B76" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        </>
      );
    case 'labcoat':
      return (
        <>
          <path d="M20 6 L32 20 L44 6 L58 16 L52 56 H12 L6 16 Z" fill="#FFFFFF" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <path d="M32 20 V56" stroke={NAVY} strokeWidth="2.5" />
          <circle cx="27" cy="32" r="2" fill={NAVY} /><circle cx="27" cy="42" r="2" fill={NAVY} />
        </>
      );
    case 'boots':
      return (
        <>
          <path d="M10 8 H28 V40 L44 44 Q56 46 56 54 H10 Z" fill="#E63946" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
          <rect x="10" y="8" width="18" height="8" fill="#FF6B76" stroke={NAVY} strokeWidth="3" />
          <path d="M10 54 H56" stroke={NAVY} strokeWidth="5" />
        </>
      );
    default:
      // sunglasses
      return (
        <>
          <path d="M4 28 H60" stroke={NAVY} strokeWidth="3" />
          {[18, 46].map((x) => (
            <path key={x} d={`M${x} 18 l3.6 7.4 8 1.2 -5.8 5.6 1.4 8 -7.2 -3.8 -7.2 3.8 1.4 -8 -5.8 -5.6 8 -1.2z`} fill="#3A86FF" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
          ))}
        </>
      );
  }
}

export function ItemThumb({ id, size = 56 }: { id: string; size?: number | string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" width={size} height={size} style={{ flex: '0 0 auto' }}>
      <Shapes id={id} />
    </svg>
  );
}
