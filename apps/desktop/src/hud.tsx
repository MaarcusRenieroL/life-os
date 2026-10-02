// The website's HUD kit (apps/web/src/features/player/hud.tsx) for the desktop app.
import { RANK_HEX, type AchievementState, type Attribute, type Rank } from '@life-os/core';
import { Flame, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

const HEX = 'polygon(50% 0, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

export function HudPanel({ accent, children, className = '', style }: { accent?: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`panel ${className}`} style={{ ...(accent ? ({ '--hud-accent': accent } as CSSProperties) : null), ...style }}>{children}</section>;
}

export function HudLabel({ children, color }: { children: ReactNode; color?: string }) {
  return <span className="hud-label" style={color ? { color } : undefined}>{children}</span>;
}

export function HudHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="hud-heading">
      <HudLabel color="color-mix(in oklab, var(--foreground) 80%, transparent)">{children}</HudLabel>
      <span className="rule" />
      {aside}
    </div>
  );
}

export function XpBar({ pct, color, height = 8 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="hud-bar" style={{ height, ...(color ? ({ '--bar': color } as CSSProperties) : null) }}>
      <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function LevelBadge({ level, rank, size = 72 }: { level: number | string; rank: Rank; size?: number }) {
  const color = RANK_HEX[rank.letter];
  return (
    <div className="level-badge" style={{ width: size, height: size }} title={`${rank.title} - rank ${rank.letter}`}>
      <div className="hex-edge" style={{ background: color, clipPath: HEX }} />
      <div className="hex-body" style={{ clipPath: HEX }}>
        <span className="hud-label" style={{ color, fontSize: size * 0.11, letterSpacing: '0.18em' }}>LV</span>
        <span className="lv-num text-glow" style={{ color, fontSize: size * 0.36 }}>{level}</span>
      </div>
    </div>
  );
}

export function RankChip({ rank }: { rank: Rank }) {
  const color = RANK_HEX[rank.letter];
  return (
    <span className="rank-chip" style={{ color, borderColor: `color-mix(in oklab, ${color} 45%, transparent)`, background: `color-mix(in oklab, ${color} 10%, transparent)` }}>
      <b>{rank.letter}</b>{rank.title}
    </span>
  );
}

export function StreakFlame({ days, safe }: { days: number; safe: boolean }) {
  const lit = days > 0;
  return (
    <div className="streak" title={safe ? 'Streak secured for today' : lit ? 'Do something today to keep it alive' : 'Start a streak'}>
      <Flame size={24} color={lit ? '#fb923c' : 'color-mix(in oklab, var(--muted-foreground) 40%, transparent)'} fill={lit ? '#fb923c' : 'none'} style={lit && safe ? { filter: 'drop-shadow(0 0 8px rgb(251 146 60 / 70%))' } : undefined} />
      <div><div className="streak-n">{days}</div><HudLabel>day streak</HudLabel></div>
    </div>
  );
}

export function AttributeMeter({ attribute }: { attribute: Attribute }) {
  const { value } = attribute;
  return (
    <div style={{ opacity: value == null ? 0.45 : 1 }} title={attribute.source}>
      <div className="row" style={{ marginBottom: 4 }}><HudLabel color="color-mix(in oklab, var(--foreground) 75%, transparent)">{attribute.key}</HudLabel><b className="num">{value ?? '—'}</b></div>
      <XpBar pct={value ?? 0} />
      <div className="muted" style={{ fontSize: 10, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attribute.label}</div>
    </div>
  );
}

export function AttributeRadar({ attributes, size = 220 }: { attributes: Attribute[]; size?: number }) {
  const c = size / 2;
  const radius = size / 2 - 34;
  const n = attributes.length;
  const point = (i: number, scale: number): [number, number] => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(angle) * radius * scale, c + Math.sin(angle) * radius * scale];
  };
  const ring = (scale: number) => attributes.map((_, i) => point(i, scale).join(',')).join(' ');
  const shape = attributes.map((a, i) => point(i, (a.value ?? 0) / 100).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: 260 }} role="img" aria-label="Attribute radar">
      {[0.25, 0.5, 0.75, 1].map((sc) => <polygon key={sc} points={ring(sc)} fill="none" stroke="var(--border)" strokeWidth={sc === 1 ? 1.2 : 0.7} />)}
      {attributes.map((_, i) => { const [x, y] = point(i, 1); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.7} />; })}
      <polygon points={shape} fill="var(--primary)" fillOpacity={0.18} stroke="var(--primary)" strokeWidth={1.8} style={{ filter: 'drop-shadow(0 0 6px var(--primary))' }} />
      {attributes.map((a, i) => {
        const [x, y] = point(i, (a.value ?? 0) / 100);
        const [lx, ly] = point(i, 1.2);
        return (
          <g key={a.key}>
            <circle cx={x} cy={y} r={2.6} fill={a.value == null ? 'var(--muted-foreground)' : 'var(--primary)'} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="color-mix(in oklab, var(--foreground) 80%, transparent)" style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em' }}>{a.key}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function Stat({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div className="stat-cell">
      <div className="row" style={{ justifyContent: 'flex-start', gap: 6, color: 'var(--muted-foreground)' }}><Icon size={14} /><HudLabel>{label}</HudLabel></div>
      <div className="stat-n">{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11 }}>{sub}</div>}
    </div>
  );
}

export function Medal({ a, size = 44 }: { a: AchievementState; size?: number }) {
  return <div className="medal" style={{ width: size, height: size, borderColor: a.tier > 0 ? 'var(--hud-gold)' : 'var(--border)' }}>★</div>;
}
