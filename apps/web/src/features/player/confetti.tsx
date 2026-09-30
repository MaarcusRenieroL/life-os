import { useMemo } from 'react';

const COLORS = ['var(--primary)', 'var(--hud-cyan)', 'var(--hud-violet)', 'var(--hud-gold)', 'var(--hud-magenta)'];

/**
 * A one-shot burst of squares flying out of the centre of its parent. Pure CSS (see `hud-confetti` in
 * index.css); mount it when something is worth celebrating and it plays once. The pieces are fixed
 * per mount, so re-renders don't re-roll them.
 */
export function Confetti({ pieces = 28 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2 + (i % 3) * 0.3;
        const distance = 90 + ((i * 37) % 110);
        return {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rot: (i * 53) % 360,
          color: COLORS[i % COLORS.length],
          delay: (i % 5) * 30,
          size: 5 + (i % 3) * 2,
        };
      }),
    [pieces],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="absolute top-1/2 left-1/2 animate-hud-confetti"
          style={{
            width: b.size,
            height: b.size,
            background: b.color,
            animationDelay: `${b.delay}ms`,
            ['--x' as string]: `${b.x}px`,
            ['--y' as string]: `${b.y}px`,
            ['--r' as string]: `${b.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
