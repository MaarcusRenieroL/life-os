import { Flame } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { Attribute, Rank } from './player-model';
import { RANK_COLOR } from './player-theme';

const HEX = 'polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

export function HudPanel({
  accent,
  interactive,
  className,
  children,
  style,
}: {
  /** Any CSS colour; defaults to the primary green. Tints the corner brackets and hover glow. */
  accent?: string;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn('hud-panel', className)}
      data-interactive={interactive ? '' : undefined}
      style={{ ...(accent ? ({ '--hud-accent': accent } as CSSProperties) : null), ...style }}
    >
      {children}
    </div>
  );
}

export function HudLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('hud-label', className)}>{children}</span>;
}

/** A framed section title with a rule running off to the right. */
export function HudHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <HudLabel className="text-foreground/80">{children}</HudLabel>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      {aside}
    </div>
  );
}

export function XpBar({ pct, color, className }: { pct: number; color?: string; className?: string }) {
  return (
    <div
      className={cn('hud-bar', className)}
      style={color ? ({ '--bar': color } as CSSProperties) : undefined}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** The player's level inside a hexagon whose colour is their rank. */
export function LevelBadge({ level, rank, size = 72 }: { level: number; rank: Rank; size?: number }) {
  const color = RANK_COLOR[rank.letter];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${rank.title} - rank ${rank.letter}`}>
      <div className="absolute inset-0 animate-hud-pulse" style={{ background: color, clipPath: HEX, opacity: 0.55 }} />
      <div className="absolute inset-[2px] flex flex-col items-center justify-center bg-card" style={{ clipPath: HEX }}>
        <span className="hud-label" style={{ color, fontSize: size * 0.11, letterSpacing: '0.18em' }}>
          LV
        </span>
        <span className="font-display font-bold tabular-nums leading-none text-glow" style={{ color, fontSize: size * 0.36 }}>
          {level}
        </span>
      </div>
    </div>
  );
}

export function RankChip({ rank }: { rank: Rank }) {
  const color = RANK_COLOR[rank.letter];
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2 py-0.5 font-display text-[11px] font-semibold tracking-widest uppercase"
      style={{ color, borderColor: `color-mix(in oklab, ${color} 45%, transparent)`, background: `color-mix(in oklab, ${color} 10%, transparent)` }}
    >
      <b className="text-sm leading-none">{rank.letter}</b>
      {rank.title}
    </span>
  );
}

export function StreakFlame({ days, safe }: { days: number; safe: boolean }) {
  const lit = days > 0;
  return (
    <div className="flex items-center gap-2" title={safe ? 'Streak secured for today' : lit ? 'Do something today to keep it alive' : 'Start a streak'}>
      <Flame
        className={cn('size-6', lit ? 'text-orange-400' : 'text-muted-foreground/40', lit && safe && 'animate-hud-flame drop-shadow-[0_0_8px_oklch(0.75_0.18_55/70%)]')}
        fill={lit ? 'currentColor' : 'none'}
      />
      <div className="leading-none">
        <div className="font-display text-xl font-bold tabular-nums">{days}</div>
        <div className="hud-label mt-0.5" style={{ fontSize: '0.55rem' }}>
          day streak
        </div>
      </div>
    </div>
  );
}

/** One attribute as a labelled meter. `null` means "no data this week", drawn dim rather than as a fake zero. */
export function AttributeMeter({ attribute, color }: { attribute: Attribute; color?: string }) {
  const { value } = attribute;
  return (
    <div title={attribute.source} className={cn(value == null && 'opacity-45')}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="hud-label text-foreground/75">{attribute.key}</span>
        <span className="font-display text-sm font-semibold tabular-nums">{value ?? '—'}</span>
      </div>
      <XpBar pct={value ?? 0} color={color} />
      <div className="mt-1 truncate text-[10px] text-muted-foreground/70">{attribute.label}</div>
    </div>
  );
}

/** Seven attributes as a radar polygon. Pure SVG, no chart library. */
export function AttributeRadar({ attributes, size = 220 }: { attributes: Attribute[]; size?: number }) {
  const c = size / 2;
  const radius = size / 2 - 34;
  const n = attributes.length;
  const point = (i: number, scale: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(angle) * radius * scale, c + Math.sin(angle) * radius * scale] as const;
  };
  const ring = (scale: number) => attributes.map((_, i) => point(i, scale).join(',')).join(' ');
  const shape = attributes.map((a, i) => point(i, (a.value ?? 0) / 100).join(',')).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[260px]" role="img" aria-label="Attribute radar">
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={ring(s)} fill="none" stroke="currentColor" className="text-border" strokeWidth={s === 1 ? 1.2 : 0.7} />
      ))}
      {attributes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth={0.7} />;
      })}
      <polygon points={shape} fill="var(--primary)" fillOpacity={0.18} stroke="var(--primary)" strokeWidth={1.8} style={{ filter: 'drop-shadow(0 0 6px var(--primary))' }} />
      {attributes.map((a, i) => {
        const [x, y] = point(i, (a.value ?? 0) / 100);
        const [lx, ly] = point(i, 1.2);
        return (
          <g key={a.key}>
            <circle cx={x} cy={y} r={2.6} fill={a.value == null ? 'var(--muted-foreground)' : 'var(--primary)'} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-foreground/80" style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em' }}>
              {a.key}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** "+15 XP" rising from where a quest was cleared. Mount it, it animates once, then it's invisible. */
export function XpPop({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cn('pointer-events-none absolute font-display text-sm font-bold text-hud-gold text-glow animate-hud-float', className)}>
      +{amount} XP
    </span>
  );
}
