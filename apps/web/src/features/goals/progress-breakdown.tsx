import { cn } from '@/lib/utils';

import type { GoalProgressBreakdown } from './types';

interface Segment {
  key: string;
  label: string;
  pct: number | null;
  detail: string;
  /** Tailwind classes: `bar` for the fill, `text` for the legend value. */
  bar: string;
  text: string;
}

function segments(p: GoalProgressBreakdown): Segment[] {
  return [
    {
      key: 'milestones',
      label: 'Milestones',
      pct: p.milestonePct,
      detail: `${p.milestonesDone} of ${p.milestonesTotal}`,
      bar: 'bg-sky-500',
      text: 'text-sky-600 dark:text-sky-400',
    },
    {
      key: 'tasks',
      label: 'Tasks',
      pct: p.taskPct,
      detail: `${p.tasksDone} of ${p.tasksTotal}`,
      bar: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      key: 'habits',
      label: 'Habits',
      pct: p.habitPct,
      detail: `${p.activeHabits} linked · recent consistency`,
      bar: 'bg-violet-500',
      text: 'text-violet-600 dark:text-violet-400',
    },
    {
      key: 'metrics',
      label: 'Metrics',
      pct: p.metricPct,
      detail: `${p.metricsCount} tracked`,
      bar: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
    },
  ];
}

/** Donut for the overall number, one bar per component. Components with nothing behind them show
 * as "not tracked" rather than a misleading empty 0% bar - see GoalProgressCalculator. Inline
 * SVG like the habit charts; no chart library is installed. */
export function ProgressBreakdown({ progress, className }: { progress: GoalProgressBreakdown; className?: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(100, progress.overallPct) / 100) * circumference;

  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-center', className)}>
      <div className="relative mx-auto size-32 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`Overall progress ${progress.overallPct}%`}>
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-muted" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className="stroke-primary transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{progress.overallPct}%</span>
          {progress.expectedPct != null && (
            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
              {progress.expectedPct}% expected
            </span>
          )}
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-3">
        {segments(progress).map((segment) => (
          <li key={segment.key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium">{segment.label}</span>
              {segment.pct == null ? (
                <span className="text-muted-foreground">not tracked</span>
              ) : (
                <span className={cn('tabular-nums font-semibold', segment.text)}>{segment.pct}%</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              {segment.pct != null && (
                <div className={cn('h-full rounded-full', segment.bar)} style={{ width: `${Math.min(100, segment.pct)}%` }} />
              )}
            </div>
            {segment.pct != null && <p className="mt-0.5 text-[11px] text-muted-foreground">{segment.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
