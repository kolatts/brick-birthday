import { useMemo } from 'react';

const COLORS = ['#FF5CA8', '#FFD60A', '#3A86FF', '#7AE582', '#E63946', '#FF8C42', '#B388FF'];

/** CSS/DOM confetti burst. Re-mounts (new key) to replay. Never blocks taps. */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.8 + Math.random() * 1.4,
        size: 8 + Math.random() * 12,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
        drift: (Math.random() - 0.5) * 240,
        round: i % 3 === 0,
      })),
    [count],
  );
  return (
    <div data-testid="confetti" aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 90 }}>
      <style>{`@keyframes confetti-fall { 0% { transform: translate3d(0,-10vh,0) rotate(0deg); opacity: 1; } 100% { transform: translate3d(var(--drift),110vh,0) rotate(720deg); opacity: 1; } }`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', top: 0, left: `${p.left}%`, width: p.size, height: p.round ? p.size : p.size * 0.5,
            background: p.color, borderRadius: p.round ? '50%' : 2, transform: `rotate(${p.rot}deg)`,
            ['--drift' as string]: `${p.drift}px`, animation: `confetti-fall ${p.dur}s ${p.delay}s ease-in forwards`, opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
