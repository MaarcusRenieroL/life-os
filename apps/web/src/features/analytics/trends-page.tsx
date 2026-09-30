import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

import { BarChart, LineChart } from '@/components/charts';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/features/finance/utils';

import { analyticsApi } from './analytics-api';

const RANGES = [
  { value: '30', label: 'Last 30 days', bucket: 'DAY' as const },
  { value: '90', label: 'Last 90 days', bucket: 'WEEK' as const },
  { value: '180', label: 'Last 6 months', bucket: 'WEEK' as const },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <SectionHeading className="mb-3">{title}</SectionHeading>
        {children}
      </CardContent>
    </Card>
  );
}

/** Task completion, habit consistency, weight, spending, mood and workouts over time. Short
 * windows show days; longer ones are bucketed into weeks so the charts stay readable. */
export function AnalyticsTrendsPage() {
  const [range, setRange] = useState('30');
  const option = RANGES.find((r) => r.value === range)!;
  const { data = [], isLoading } = useQuery({
    queryKey: ['analytics', 'trends', range],
    queryFn: () => analyticsApi.trends(Number(range), option.bucket),
  });

  const label = (date: string) => format(parseISO(date), 'MMM d');
  const weekly = option.bucket === 'WEEK';

  const habit = data.filter((p) => p.habitPct != null).map((p) => ({ label: label(p.date), value: p.habitPct as number }));
  const weight = data.filter((p) => p.weightKg != null).map((p) => ({ label: label(p.date), value: p.weightKg as number }));
  const mood = data.filter((p) => p.mood != null).map((p) => ({ label: label(p.date), value: p.mood as number }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="min-w-40" aria-label="Time range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title={`tasks completed${weekly ? ' per week' : ' per day'}`}>
            <BarChart data={data.map((p) => ({ label: label(p.date), value: p.tasksCompleted }))} ariaLabel="Tasks completed" />
          </Panel>
          <Panel title="habit consistency">
            {habit.length < 2 ? <EmptyState message="Not enough habit data yet." /> : <LineChart data={habit} valueFormat={(v) => `${v}%`} ariaLabel="Habit consistency" />}
          </Panel>
          <Panel title={`spending${weekly ? ' per week' : ' per day'}`}>
            <BarChart data={data.map((p) => ({ label: label(p.date), value: Math.round(p.spending) }))} valueFormat={formatINR} ariaLabel="Spending" />
          </Panel>
          <Panel title="weight">
            {weight.length < 2 ? <EmptyState message="Log at least two weigh-ins to see a trend." /> : <LineChart data={weight} valueFormat={(v) => `${v} kg`} ariaLabel="Weight" />}
          </Panel>
          <Panel title="mood">
            {mood.length < 2 ? <EmptyState message="Journal entries with a mood show up here." /> : <LineChart data={mood} valueFormat={(v) => `${v}/5`} ariaLabel="Mood" />}
          </Panel>
          <Panel title="workouts">
            <BarChart data={data.map((p) => ({ label: label(p.date), value: p.workouts }))} ariaLabel="Workouts" />
          </Panel>
        </div>
      )}
    </div>
  );
}
