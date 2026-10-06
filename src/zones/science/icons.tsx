import type { CSSProperties, ReactNode } from 'react';

const N = '#1D2A44';

function Svg({ size, children, style }: { size: number | string; children: ReactNode; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 48 48" style={{ width: size, height: size, flex: '0 0 auto', display: 'block', pointerEvents: 'none', ...style }} strokeLinejoin="round" strokeLinecap="round">
      {children}
    </svg>
  );
}
const st = { stroke: N, strokeWidth: 2.6 } as const;

export type SciIconId =
  | 'brick' | 'cork' | 'apple' | 'coin' | 'duck' | 'stone'
  | 'berry' | 'flower' | 'salt' | 'glitter'
  | 'potion' | 'float' | 'rocket' | 'crystal' | 'seed' | 'wand' | 'lamp' | 'can' | 'trowel' | 'fuel';

/** Original sticker-style SVG icons for the lab (no emoji). */
export function SciIcon({ id, size = 40, style }: { id: SciIconId; size?: number | string; style?: CSSProperties }) {
  return <Svg size={size} style={style}>{ART[id]}</Svg>;
}

const ART: Record<SciIconId, ReactNode> = {
  brick: (
    <>
      <rect x="5" y="19" width="38" height="22" rx="4" fill="#E63946" {...st} />
      <rect x="10" y="11" width="9" height="8" rx="2.5" fill="#FF6B76" {...st} />
      <rect x="29" y="11" width="9" height="8" rx="2.5" fill="#FF6B76" {...st} />
      <path d="M10 26q4-3 9-2" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" />
    </>
  ),
  cork: (
    <>
      <path d="M12 8h24l-4 32H16z" fill="#D9A066" {...st} />
      <ellipse cx="24" cy="8" rx="12" ry="3.4" fill="#E8BB86" {...st} />
      <circle cx="21" cy="20" r="1.8" fill="#A9743F" />
      <circle cx="28" cy="28" r="1.6" fill="#A9743F" />
      <circle cx="22" cy="33" r="1.4" fill="#A9743F" />
    </>
  ),
  apple: (
    <>
      <path d="M24 14c-6-5-17-1-16 11 1 10 8 17 16 14 8 3 15-4 16-14 1-12-10-16-16-11z" fill="#E63946" {...st} />
      <path d="M24 14c0-4 1-7 4-9" stroke={N} strokeWidth="3" fill="none" />
      <path d="M26 9c3-4 8-3 9-2-1 4-6 5-9 2z" fill="#46B450" {...st} />
      <path d="M13 22q2-5 6-5" stroke="#fff" strokeWidth="3" fill="none" opacity=".7" />
    </>
  ),
  coin: (
    <>
      <circle cx="24" cy="24" r="17" fill="#FFC933" {...st} />
      <circle cx="24" cy="24" r="11" fill="#FFE27A" stroke={N} strokeWidth="2" />
      <path d="M24 17v14M20 21h6.5a2.5 2.5 0 010 5H21" stroke={N} strokeWidth="2.6" fill="none" />
    </>
  ),
  duck: (
    <>
      <path d="M6 30c0-8 8-10 14-8 2-8 14-8 15 0 2 1 5 1 7 3-3 2-5 2-7 2 0 8-7 12-15 12S6 38 6 30z" fill="#FFD60A" {...st} />
      <path d="M35 17l8 2-8 3z" fill="#FF8A1F" {...st} />
      <circle cx="29" cy="15" r="2" fill={N} />
      <path d="M14 31q6 6 13 0" stroke="#E0B800" strokeWidth="3" fill="none" />
    </>
  ),
  stone: (
    <>
      <path d="M6 33l5-14 12-7 14 5 6 14-8 8H14z" fill="#8B93A0" {...st} />
      <path d="M11 19l12 6 14-8M23 25l-3 14" stroke={N} strokeWidth="2" fill="none" opacity=".5" />
      <path d="M13 24l5-6" stroke="#fff" strokeWidth="3" fill="none" opacity=".6" />
    </>
  ),
  berry: (
    <>
      <circle cx="17" cy="29" r="9" fill="#E63946" {...st} />
      <circle cx="31" cy="29" r="9" fill="#FF4D5C" {...st} />
      <circle cx="24" cy="18" r="9" fill="#E63946" {...st} />
      <path d="M24 9c0-3 2-5 5-5" stroke="#46B450" strokeWidth="3.5" fill="none" />
      <path d="M14 26q2-3 4-2" stroke="#fff" strokeWidth="2.6" fill="none" opacity=".7" />
    </>
  ),
  flower: (
    <>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="24" cy="12" rx="6" ry="9" fill="#3A86FF" {...st} transform={`rotate(${a} 24 24)`} />)}
      <circle cx="24" cy="24" r="6" fill="#FFD60A" {...st} />
    </>
  ),
  salt: (
    <>
      <path d="M13 17h22l2 24H11z" fill="#FFFFFF" {...st} />
      <path d="M15 11h18l2 6H13z" fill="#C5CCD8" {...st} />
      {[[20, 6], [26, 4], [31, 7]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" stroke={N} strokeWidth="1.6" />)}
      <rect x="15" y="25" width="18" height="9" rx="3" fill="#9BD8FF" stroke={N} strokeWidth="2" />
    </>
  ),
  glitter: (
    <>
      <path d="M24 3l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill="#FFD60A" {...st} />
      <path d="M38 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FF8FD0" stroke={N} strokeWidth="2" />
      <path d="M9 32l1.5 3.5 3.5 1.5-3.5 1.5L9 42l-1.5-3.5L4 37l3.5-1.5z" fill="#9BE7FF" stroke={N} strokeWidth="1.8" />
    </>
  ),
  potion: (
    <>
      <path d="M19 5h10v12l11 20a4 4 0 01-3.5 6h-25A4 4 0 018 37l11-20z" fill="#EAF7FF" {...st} />
      <path d="M13 31h22l5 7a3 3 0 01-2.6 4.5H10.6A3 3 0 018 38z" fill="#8B4FD0" stroke={N} strokeWidth="2.4" />
      <circle cx="20" cy="26" r="2.4" fill="#fff" stroke={N} strokeWidth="1.6" />
      <circle cx="29" cy="22" r="1.8" fill="#fff" stroke={N} strokeWidth="1.6" />
    </>
  ),
  float: (
    <>
      <path d="M4 22c5-4 8-4 13 0s8 4 13 0 8-4 14 0v18H4z" fill="#4CB7FF" {...st} />
      <path d="M4 31c5-4 8-4 13 0s8 4 13 0 8-4 14 0" stroke="#fff" strokeWidth="2.6" fill="none" opacity=".7" />
      <path d="M16 20c0-6 5-9 10-6l3 2-2 6z" fill="#FFD60A" {...st} />
      <path d="M31 17l5 1-5 2z" fill="#FF8A1F" stroke={N} strokeWidth="2" />
    </>
  ),
  rocket: (
    <>
      <path d="M24 3c8 6 11 16 9 26H15C13 19 16 9 24 3z" fill="#FFFFFF" {...st} />
      <path d="M24 3c4 3 7 7 8 11H16c1-4 4-8 8-11z" fill="#E63946" stroke={N} strokeWidth="2.4" />
      <circle cx="24" cy="21" r="4.2" fill="#9BE0FF" {...st} />
      <path d="M15 24l-8 10 8 0zM33 24l8 10-8 0z" fill="#3A86FF" {...st} />
      <path d="M19 29h10l-5 14z" fill="#FFB000" {...st} />
    </>
  ),
  crystal: (
    <>
      <path d="M24 3l10 10-4 28H18L14 13z" fill="#CDEBFF" {...st} />
      <path d="M12 21l6 4-3 16H6zM36 21l-6 4 3 16h9z" fill="#E4D3FF" {...st} />
      <path d="M24 3l-3 11 3 27M24 3l3 11-3 27" stroke={N} strokeWidth="1.8" fill="none" opacity=".4" />
      <path d="M18 14l3-4" stroke="#fff" strokeWidth="3" opacity=".8" />
    </>
  ),
  seed: (
    <>
      <path d="M10 42h28l-3-14H13z" fill="#E2763C" {...st} />
      <rect x="8" y="26" width="32" height="6" rx="2" fill="#C85E28" {...st} />
      <path d="M24 26V14" stroke="#46B450" strokeWidth="4" fill="none" />
      <path d="M24 17c-8 0-11-5-11-9 7 0 11 3 11 9zM24 14c0-5 4-8 11-8 0 6-4 9-11 8z" fill="#6BD66B" stroke={N} strokeWidth="2.4" />
    </>
  ),
  wand: (
    <>
      <path d="M10 40L32 18" stroke={N} strokeWidth="9" fill="none" />
      <path d="M10 40L32 18" stroke="#FFE066" strokeWidth="4.4" fill="none" />
      <path d="M35 4l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FFD60A" {...st} />
    </>
  ),
  lamp: (
    <>
      <path d="M12 18l6-12h12l6 12z" fill="#FF5CA8" {...st} />
      <path d="M24 18v10" stroke={N} strokeWidth="3.2" fill="none" />
      <circle cx="24" cy="31" r="6" fill="#FFF3B0" {...st} />
      <path d="M24 42v4M12 38l-3 3M36 38l3 3M8 28H4M44 28h-4" stroke="#FFC933" strokeWidth="3" fill="none" />
    </>
  ),
  can: (
    <>
      <path d="M8 18h24v20a3 3 0 01-3 3H11a3 3 0 01-3-3z" fill="#3A86FF" {...st} />
      <path d="M32 24l11-9" stroke={N} strokeWidth="7" fill="none" />
      <path d="M32 24l11-9" stroke="#3A86FF" strokeWidth="3" fill="none" />
      <path d="M12 18c0-8 12-8 12 0" stroke={N} strokeWidth="3" fill="none" />
      <path d="M43 9v3M40 8l1 3M46 8l-1 3" stroke="#4CB7FF" strokeWidth="2.4" />
    </>
  ),
  trowel: (
    <>
      <path d="M26 24l16 16" stroke={N} strokeWidth="9" fill="none" />
      <path d="M26 24l16 16" stroke="#E63946" strokeWidth="4.4" fill="none" />
      <path d="M6 6l22 8-4 12-12 4z" fill="#C5CCD8" {...st} />
    </>
  ),
  fuel: (
    <>
      <rect x="5" y="20" width="38" height="20" rx="4" fill="#FF8A1F" {...st} />
      <rect x="10" y="13" width="9" height="7" rx="2.5" fill="#FFB35C" {...st} />
      <rect x="29" y="13" width="9" height="7" rx="2.5" fill="#FFB35C" {...st} />
      <path d="M24 24c4 4 5 7 2 11-3 2-8-1-6-5 1 1 2 1 2 0-1-2 0-4 2-6z" fill="#FFD60A" stroke={N} strokeWidth="2" />
    </>
  ),
};

export const FLOAT_ICON: Record<string, SciIconId> = { brick: 'brick', cork: 'cork', apple: 'apple', coin: 'coin', duck: 'duck', stone: 'stone' };
