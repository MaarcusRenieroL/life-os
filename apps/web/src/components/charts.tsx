import { cn } from '@/lib/utils';

interface Point {
  label: string;
  value: number;
}

/** Inline-SVG charts, like the habits analytics ones - no chart library is installed and these
 * need nothing beyond a hover title. Both read colours from the theme via currentColor/Tailwind
 * stroke/fill classes so they follow light and dark. */

export function BarChart({
  data,
  height = 140,
  valueFormat = (v) => String(v),
  reference,
  className,
  ariaLabel,
}: {
  data: Point[];
  height?: number;
  valueFormat?: (value: number) => string;
  /** A dashed horizontal line, e.g. the weekly target. */
  reference?: number;
  className?: string;
  ariaLabel: string;
}) {
  const width = 640;
  const padding = { top: 12, right: 8, bottom: 22, left: 8 };
  const plotHeight = height - padding.top - padding.bottom;
  const max = Math.max(1, reference ?? 0, ...data.map((d) => d.value));
  const slot = (width - padding.left - padding.right) / Math.max(1, data.length);
  const barWidth = Math.min(36, slot * 0.6);
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      {reference != null && (
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotHeight - (reference / max) * plotHeight}
          y2={padding.top + plotHeight - (reference / max) * plotHeight}
          className="stroke-primary/50"
          strokeDasharray="4 4"
        />
      )}
      {data.map((d, i) => {
        const barHeight = (d.value / max) * plotHeight;
        const x = padding.left + i * slot + (slot - barWidth) / 2;
        const met = reference != null && d.value >= reference;
        return (
          <g key={`${d.label}-${i}`}>
            <rect
              x={x}
              y={padding.top + plotHeight - barHeight}
              width={barWidth}
              height={Math.max(barHeight, d.value > 0 ? 2 : 0)}
              rx="3"
              className={met || reference == null ? 'fill-primary' : 'fill-primary/40'}
            >
              <title>{`${d.label}: ${valueFormat(d.value)}`}</title>
            </rect>
            {i % labelStep === 0 && (
              <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={padding.left} x2={width - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} className="stroke-border" />
    </svg>
  );
}

export function LineChart({
  data,
  height = 160,
  valueFormat = (v) => String(v),
  className,
  ariaLabel,
}: {
  data: Point[];
  height?: number;
  valueFormat?: (value: number) => string;
  className?: string;
  ariaLabel: string;
}) {
  const width = 640;
  const padding = { top: 14, right: 24, bottom: 22, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const x = (i: number) => padding.left + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
  const y = (v: number) => padding.top + plotHeight - ((v - min) / span) * plotHeight;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.value)}`).join(' ');
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('w-full', className)} role="img" aria-label={ariaLabel}>
      {[0, 0.5, 1].map((g) => {
        const value = min + g * span;
        return (
          <g key={g}>
            <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} className="stroke-border" strokeDasharray="2 4" />
            <text x={padding.left - 6} y={y(value) + 3} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {valueFormat(Math.round(value * 10) / 10)}
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={`${d.label}-${i}`}>
          <circle cx={x(i)} cy={y(d.value)} r="3" className="fill-primary">
            <title>{`${d.label}: ${valueFormat(d.value)}`}</title>
          </circle>
          {i % labelStep === 0 && (
            <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
              {d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  /** A Tailwind stroke class, e.g. `stroke-sky-500`. */
  strokeClass: string;
}

/** Ring split into proportional segments, with the total in the middle - the "where does it come
 * from" breakdown. Segments with a zero value are skipped. */
export function DonutChart({
  segments,
  centerLabel,
  size = 140,
  ariaLabel,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
  size?: number;
  ariaLabel: string;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={ariaLabel}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="12" className="stroke-muted" />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const length = (s.value / total) * circumference;
              const circle = (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth="12"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  className={s.strokeClass}
                >
                  <title>{`${s.label}: ${s.value}`}</title>
                </circle>
              );
              offset += length;
              return circle;
            })}
      </svg>
      {centerLabel && <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-semibold tabular-nums">{centerLabel}</div>}
    </div>
  );
}
