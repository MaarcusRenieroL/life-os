import { useQuery } from '@tanstack/react-query';
import { addMonths, addWeeks, format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { DonutChart } from '@/components/charts';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/features/finance/utils';

import { analyticsApi } from './analytics-api';
import { UnavailableNotice } from './unavailable-notice';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const BREAKDOWN = [
  { key: 'milestone', label: 'Milestones', stroke: 'stroke-sky-500', dot: 'bg-sky-500' },
  { key: 'task', label: 'Tasks', stroke: 'stroke-emerald-500', dot: 'bg-emerald-500' },
  { key: 'habit', label: 'Habits', stroke: 'stroke-violet-500', dot: 'bg-violet-500' },
  { key: 'metric', label: 'Metrics', stroke: 'stroke-amber-500', dot: 'bg-amber-500' },
  { key: 'workout', label: 'Workouts', stroke: 'stroke-rose-500', dot: 'bg-rose-500' },
] as const;

/** One week or one month, with previous/next navigation. */
export function AnalyticsSummaryPage({ period }: { period: 'WEEK' | 'MONTH' }) {
  const [asOf, setAsOf] = useState(() => new Date());
  const asOfIso = format(asOf, 'yyyy-MM-dd');
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'summary', period, asOfIso], queryFn: () => analyticsApi.summary(period, asOfIso) });

  const step = (dir: 1 | -1) => setAsOf(period === 'WEEK' ? addWeeks(asOf, dir) : addMonths(asOf, dir));
  const title = period === 'WEEK' ? 'Weekly summary' : 'Monthly summary';

  const spendDelta = data && data.previousSpending != null ? data.spending - data.previousSpending : null;
  const maxCategory = data ? Math.max(1, ...data.spendingByCategory.map((c) => c.amount)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label={`Previous ${period.toLowerCase()}`} onClick={() => step(-1)}>
            <ChevronLeft />
          </Button>
          <span className="min-w-44 text-center text-sm tabular-nums">
            {data ? `${format(parseISO(data.from), 'MMM d')} – ${format(parseISO(data.to), 'MMM d, yyyy')}` : '…'}
          </span>
          <Button size="icon" variant="outline" aria-label={`Next ${period.toLowerCase()}`} onClick={() => step(1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <UnavailableNotice modules={data.unavailableModules} />
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Tasks done" value={String(data.tasksCompleted)} hint={`${data.taskCompletionPct ?? '—'}${data.taskCompletionPct == null ? '' : '%'} of ${data.tasksDue} due`} />
              <Stat label="Habit consistency" value={data.habitConsistencyPct == null ? '—' : `${data.habitConsistencyPct}%`} />
              <Stat label="Focus" value={`${data.focusHours} h`} />
              <Stat label="Workouts" value={String(data.workouts)} hint={`${data.workoutMinutes} min`} />
              <Stat
                label="Spending"
                value={formatINR(data.spending)}
                hint={spendDelta == null ? undefined : `${spendDelta >= 0 ? '+' : '−'}${formatINR(Math.abs(spendDelta))} vs previous`}
              />
              <Stat label="Income" value={formatINR(data.income)} />
              <Stat label="Applications" value={String(data.applicationsApplied)} hint={`${data.applicationsSaved} saved · ${data.interviews} interviews`} />
              <Stat label="Journal" value={String(data.journalEntries)} hint={data.averageMood == null ? undefined : `mood ${data.averageMood}/5`} />
              <Stat label="Milestones hit" value={String(data.milestonesCompleted)} />
              <Stat label="Weight" value={data.weightChangeKg == null ? '—' : `${data.weightChangeKg > 0 ? '+' : ''}${data.weightChangeKg} kg`} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <SectionHeading className="mb-3">spending by category</SectionHeading>
              {data.spendingByCategory.length === 0 ? (
                <EmptyState message="No spending recorded in this period." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.spendingByCategory.map((c) => (
                    <li key={c.category}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{c.category}</span>
                        <span className="tabular-nums text-muted-foreground">{formatINR(c.amount)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(c.amount / maxCategory) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <SectionHeading className="mb-3">where goal progress comes from</SectionHeading>
              {data.goalBreakdown.goalCount === 0 ? (
                <EmptyState message="No active goals." />
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <DonutChart
                    ariaLabel="Goal progress breakdown"
                    centerLabel={`${data.goalBreakdown.goalCount} goal${data.goalBreakdown.goalCount === 1 ? '' : 's'}`}
                    segments={BREAKDOWN.map((b) => ({ label: b.label, value: data.goalBreakdown[b.key] ?? 0, strokeClass: b.stroke }))}
                  />
                  <ul className="flex flex-1 flex-col gap-1.5 text-xs">
                    {BREAKDOWN.map((b) => (
                      <li key={b.key} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${b.dot}`} />
                          {b.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{data.goalBreakdown[b.key] == null ? 'not tracked' : `${data.goalBreakdown[b.key]}% avg`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {data.goals.length > 0 && (
            <section>
              <SectionHeading className="mb-3">goals</SectionHeading>
              <ul className="flex flex-col divide-y rounded-md border">
                {data.goals.map((g) => (
                  <li key={g.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate">{g.name}</span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      <span>{g.status.replace('_', ' ').toLowerCase()}</span>
                      <span className="w-10 text-right font-semibold text-foreground tabular-nums">{g.progressPct ?? 0}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function AnalyticsWeeklyPage() {
  return <AnalyticsSummaryPage period="WEEK" />;
}

export function AnalyticsMonthlyPage() {
  return <AnalyticsSummaryPage period="MONTH" />;
}
