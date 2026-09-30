import { useQuery } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { GoalStatusBadge } from './goal-badges';
import { goalsApi } from './goals-api';
import type { GoalSummary } from './types';

function dayOf(iso: string) {
  return parseISO(iso);
}

/** Every goal with a target date as a bar from its start to its target, filled to its current
 * progress, against one shared calendar axis with a marker for today - the "am I over-committed
 * next month" view. Goals without a target date have no span to draw and are listed below. */
export function GoalsTimelinePage() {
  const { data: goals = [], isLoading } = useQuery({ queryKey: ['goals', 'list', { timeline: true }], queryFn: () => goalsApi.list() });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const dated = goals.filter((g): g is GoalSummary & { targetDate: string } => g.targetDate != null && g.status !== 'COMPLETED');
  const undated = goals.filter((g) => g.targetDate == null && g.status !== 'COMPLETED');

  if (dated.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        <EmptyState className="mt-4" message="No goals with a target date yet - add one to see it on the timeline." />
      </div>
    );
  }

  const today = new Date();
  const startOf = (g: GoalSummary) => dayOf(g.startDate ?? g.createdAt.slice(0, 10));
  const axisStart = new Date(Math.min(today.getTime(), ...dated.map((g) => startOf(g).getTime())));
  const axisEnd = new Date(Math.max(addDays(today, 30).getTime(), ...dated.map((g) => dayOf(g.targetDate).getTime())));
  const total = Math.max(1, differenceInCalendarDays(axisEnd, axisStart));
  const pos = (d: Date) => (differenceInCalendarDays(d, axisStart) / total) * 100;

  const sorted = [...dated].sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{format(axisStart, 'MMM d, yyyy')}</span>
        <span>{format(axisEnd, 'MMM d, yyyy')}</span>
      </div>

      <div className="relative mt-1 flex flex-col gap-3">
        <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/60" style={{ left: `${pos(today)}%` }}>
          <span className="absolute -top-4 -translate-x-1/2 text-[10px] font-semibold tracking-widest text-primary uppercase">Today</span>
        </div>

        {sorted.map((goal) => {
          const left = pos(startOf(goal));
          const width = Math.max(1.5, pos(dayOf(goal.targetDate)) - left);
          const atRisk = goal.status === 'AT_RISK';
          return (
            <div key={goal.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Link to={`/goals/${goal.id}`} className="truncate text-sm font-medium hover:underline">
                  {goal.name}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <GoalStatusBadge status={goal.status} />
                  {format(dayOf(goal.targetDate), 'MMM d')}
                </span>
              </div>
              <div className="relative h-4 rounded bg-muted/50">
                <div
                  className={cn('absolute inset-y-0 overflow-hidden rounded border', atRisk ? 'border-amber-500/60 bg-amber-500/15' : 'border-primary/50 bg-primary/10')}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${goal.progress.overallPct}% complete`}
                >
                  <div className={cn('h-full', atRisk ? 'bg-amber-500/60' : 'bg-primary/60')} style={{ width: `${goal.progress.overallPct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {undated.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">No target date</h2>
          <ul className="flex flex-wrap gap-2">
            {undated.map((g) => (
              <li key={g.id}>
                <Link to={`/goals/${g.id}`} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
