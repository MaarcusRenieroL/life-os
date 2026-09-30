import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

import { SectionHeading } from '@/components/section-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/features/finance/utils';

import { analyticsApi } from './analytics-api';
import { AnomalyList } from './anomaly-list';
import { InsightList } from './insight-list';
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

function delta(current: number, previous: number): string {
  const diff = current - previous;
  return diff === 0 ? 'same as last week' : `${diff > 0 ? '+' : ''}${diff} vs last week`;
}

/** The snapshot: today, this week so far, what looks unusual, and patterns worth knowing. */
export function AnalyticsOverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics', 'dashboard'], queryFn: analyticsApi.dashboard });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  const { today, week } = data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <UnavailableNotice modules={data.unavailableModules} />

      <section>
        <SectionHeading className="mb-3">today · {format(parseISO(today.date), 'EEE, MMM d')}</SectionHeading>
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Tasks done" value={String(today.tasksCompleted)} />
            <Stat label="Focus" value={`${today.focusHours} h`} />
            <Stat label="Habits" value={`${today.habitsCompleted}/${today.habitsScheduled}`} />
            <Stat label="Spent" value={formatINR(today.spending)} />
            <Stat label="Workouts" value={String(today.workouts)} />
            <Stat label="Mood" value={today.mood == null ? '—' : `${today.mood}/5`} hint={today.energy == null ? undefined : `energy ${today.energy}/5`} />
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionHeading>this week</SectionHeading>
          <Link to="/analytics/weekly" className="text-xs text-muted-foreground hover:text-foreground">
            Full weekly summary
          </Link>
        </div>
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Tasks done" value={String(week.tasksCompleted)} hint={delta(week.tasksCompleted, week.previousTasksCompleted)} />
            <Stat label="Task completion" value={week.taskCompletionPct == null ? '—' : `${week.taskCompletionPct}%`} hint={`${week.tasksDue} due`} />
            <Stat label="Habits" value={week.habitConsistencyPct == null ? '—' : `${week.habitConsistencyPct}%`} hint="consistency" />
            <Stat label="Focus" value={`${week.focusHours} h`} />
            <Stat label="Workouts" value={String(week.workouts)} hint={`${week.workoutMinutes} min`} />
            <Stat label="Spending" value={formatINR(week.spending)} hint={week.previousSpending == null ? undefined : `last week ${formatINR(week.previousSpending)}`} />
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading className="mb-3">worth a look</SectionHeading>
          <AnomalyList anomalies={data.anomalies} />
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionHeading>patterns</SectionHeading>
            <Link to="/analytics/insights" className="text-xs text-muted-foreground hover:text-foreground">
              All insights
            </Link>
          </div>
          <InsightList insights={data.insights.slice(0, 3)} />
        </section>
      </div>
    </div>
  );
}
