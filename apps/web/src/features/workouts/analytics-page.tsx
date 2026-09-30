import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

import { SectionHeading } from '@/components/section-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { BarChart, LineChart } from '@/components/charts';
import { formatVolume } from './utils';
import { workoutsApi } from './workouts-api';

const WEEK_OPTIONS = [8, 12, 26, 52];
const TARGET_KEY = 'life_os_workout_weekly_target';

function loadTarget(): number {
  try {
    const stored = Number(localStorage.getItem(TARGET_KEY));
    return stored >= 1 && stored <= 14 ? stored : 3;
  } catch {
    return 3;
  }
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Consistency (sessions per week vs your target, streak), volume trend, PRs and average session
 * length - one call, bucketed into Monday-start weeks in your timezone. */
export function WorkoutAnalyticsPage() {
  const [weeks, setWeeks] = useState(12);
  const [target, setTarget] = useState(loadTarget);
  const [chart, setChart] = useState<'sessions' | 'volume' | 'minutes'>('sessions');

  const { data, isLoading } = useQuery({ queryKey: ['workouts', 'analytics', weeks, target], queryFn: () => workoutsApi.analytics(weeks, target) });

  function changeTarget(next: number) {
    setTarget(next);
    try {
      localStorage.setItem(TARGET_KEY, String(next));
    } catch {
      // A blocked/full localStorage just means the target isn't remembered - it still applies now.
    }
  }

  const points = (data?.weeks ?? []).map((w) => ({
    label: format(parseISO(w.weekStart), 'MMM d'),
    sessions: w.sessions,
    volume: w.volume,
    minutes: w.minutes,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <div className="flex items-center gap-2">
          <Select value={String(target)} onValueChange={(v) => changeTarget(Number(v))}>
            <SelectTrigger className="min-w-36" aria-label="Weekly target">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / week target
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(weeks)} onValueChange={(v) => setWeeks(Number(v))}>
            <SelectTrigger className="min-w-32" aria-label="Time window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_OPTIONS.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Last {w} weeks
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Sessions" value={String(data.totalSessions)} hint={`${data.sessionsPerWeek} / week`} />
              <Stat label="Avg length" value={`${data.averageDurationMinutes} min`} />
              <Stat label="Records" value={String(data.personalRecords)} hint="new PRs" />
              <Stat label="This week" value={`${data.currentWeekSessions}/${data.weeklyTarget}`} />
              <Stat label="Streak" value={`${data.currentStreakWeeks} wk`} hint="weeks at target" />
              <Stat label="Best streak" value={`${data.longestStreakWeeks} wk`} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <SectionHeading>weekly</SectionHeading>
                <Tabs value={chart} onValueChange={(v) => setChart(v as typeof chart)}>
                  <TabsList>
                    <TabsTrigger value="sessions">Consistency</TabsTrigger>
                    <TabsTrigger value="volume">Volume</TabsTrigger>
                    <TabsTrigger value="minutes">Time</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {chart === 'sessions' && (
                <>
                  <BarChart
                    data={points.map((p) => ({ label: p.label, value: p.sessions }))}
                    reference={data.weeklyTarget}
                    valueFormat={(v) => `${v} session${v === 1 ? '' : 's'}`}
                    ariaLabel="Sessions per week"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Dashed line is your {data.weeklyTarget}-a-week target; full-colour bars met it.</p>
                </>
              )}
              {chart === 'volume' && (
                <LineChart data={points.map((p) => ({ label: p.label, value: Math.round(p.volume) }))} valueFormat={formatVolume} ariaLabel="Weekly volume trend" />
              )}
              {chart === 'minutes' && (
                <BarChart data={points.map((p) => ({ label: p.label, value: p.minutes }))} valueFormat={(v) => `${v} min`} ariaLabel="Training minutes per week" />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
