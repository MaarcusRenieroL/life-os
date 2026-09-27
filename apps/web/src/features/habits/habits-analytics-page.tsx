import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Activity, Flame, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { StreakBadge } from './habit-badges';
import { habitsApi } from './habits-api';
import type { CompletionTrendPoint, DayOfWeekPattern, HabitPerformance, HealthScore } from './types';

const WINDOW_OPTIONS = [8, 12, 26] as const;

// Stable references for the "analytics not loaded yet" fallback, so the useMemo below that
// derives from these doesn't see a new array identity (and re-run its work) on every render.
const EMPTY_PERFORMANCE: HabitPerformance[] = [];
const EMPTY_TREND: CompletionTrendPoint[] = [];

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

const percent = (score: number) => Math.round(score * 100);

/**
 * Area + line chart of the weekly completion rate, drawn as inline SVG on a 0-100 scale. No chart
 * library is installed and this needs no interaction beyond a tooltip, so a hand-rolled path is
 * cheaper than adding a dependency.
 */
function CompletionTrendChart({ trend }: { trend: CompletionTrendPoint[] }) {
  const width = 640;
  const height = 180;
  const padding = { top: 12, right: 8, bottom: 22, left: 30 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (trend.length === 0) {
    return <p className="text-sm text-muted-foreground">No weeks to plot yet.</p>;
  }

  const x = (index: number) =>
    padding.left + (trend.length === 1 ? plotWidth / 2 : (index / (trend.length - 1)) * plotWidth);
  const y = (score: number) => padding.top + plotHeight - score * plotHeight;

  const linePath = trend.map((point, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(point.score)}`).join(' ');
  const areaPath = `${linePath} L ${x(trend.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  // Only label a subset of weeks - at 26 weeks every label would collide.
  const labelStep = Math.max(1, Math.ceil(trend.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Weekly completion rate trend">
      {[0, 0.25, 0.5, 0.75, 1].map((gridline) => (
        <g key={gridline}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(gridline)}
            y2={y(gridline)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text x={0} y={y(gridline) + 3} className="fill-muted-foreground text-[9px]">
            {percent(gridline)}%
          </text>
        </g>
      ))}

      <path d={areaPath} className="fill-primary/15" />
      <path d={linePath} className="stroke-primary" strokeWidth={2} fill="none" strokeLinejoin="round" />

      {trend.map((point, i) => (
        <g key={point.weekStart}>
          <circle cx={x(i)} cy={y(point.score)} r={2.5} className="fill-primary" />
          <title>
            {`Week of ${format(parseISO(point.weekStart), 'd MMM')}: ${point.completions}/${point.scheduledOccurrences} (${percent(point.score)}%)`}
          </title>
          {i % labelStep === 0 && (
            <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[9px]">
              {format(parseISO(point.weekStart), 'd MMM')}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Day-of-week completion rate as a simple bar row, best and worst day called out below. */
function DayOfWeekChart({ pattern }: { pattern: DayOfWeekPattern[] }) {
  const withData = pattern.filter((day) => day.scheduledOccurrences > 0);

  if (withData.length === 0) {
    return <p className="text-sm text-muted-foreground">No scheduled days in this window yet.</p>;
  }

  const best = withData.reduce((a, b) => (b.score > a.score ? b : a));
  const worst = withData.reduce((a, b) => (b.score < a.score ? b : a));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        {pattern.map((day) => (
          <div key={day.dayOfWeek} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-medium tabular-nums">
              {day.scheduledOccurrences > 0 ? `${percent(day.score)}%` : '–'}
            </span>
            <div className="flex h-24 w-full items-end rounded-sm bg-muted">
              <div
                className={cn(
                  'w-full rounded-sm transition-all',
                  day.scheduledOccurrences === 0
                    ? 'bg-transparent'
                    : day.dayOfWeek === best.dayOfWeek
                      ? 'bg-emerald-500'
                      : day.dayOfWeek === worst.dayOfWeek
                        ? 'bg-destructive'
                        : 'bg-primary',
                )}
                style={{ height: `${Math.max(day.score * 100, day.scheduledOccurrences > 0 ? 3 : 0)}%` }}
                title={`${DAY_LABELS[day.dayOfWeek]}: ${day.completions} of ${day.scheduledOccurrences} completed`}
              />
            </div>
            <span className="text-xs text-muted-foreground">{DAY_LABELS[day.dayOfWeek]}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strongest on <span className="font-medium text-foreground">{DAY_LABELS[best.dayOfWeek]}</span> (
        {percent(best.score)}%), weakest on{' '}
        <span className="font-medium text-foreground">{DAY_LABELS[worst.dayOfWeek]}</span> ({percent(worst.score)}
        %).
      </p>
    </div>
  );
}

/** A habit's rank row: name, real completion rate over the window, and its streak badge. */
function PerformanceRow({ entry, tone }: { entry: HabitPerformance; tone: 'good' | 'bad' }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <Link to={`/habits/${entry.habitId}`} className="truncate text-sm font-medium hover:underline">
          {entry.icon && <span className="mr-1">{entry.icon}</span>}
          {entry.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {entry.completions} of {entry.scheduledOccurrences} scheduled
        </p>
      </div>
      <StreakBadge days={entry.currentStreak} />
      <span className="w-10 text-right text-sm font-semibold tabular-nums">{percent(entry.completionRate)}%</span>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full', tone === 'good' ? 'bg-emerald-500' : 'bg-destructive')}
          style={{ width: `${percent(entry.completionRate)}%` }}
        />
      </div>
    </div>
  );
}

/** The composite score with its three components spelled out, so the number is explainable. */
function HealthScoreCard({ health }: { health: HealthScore }) {
  const components = [
    {
      label: 'Consistency',
      value: health.consistencyScore,
      weight: health.consistencyWeightPercent,
      explanation: 'Completions against everything scheduled in this window.',
    },
    {
      label: 'Streaks',
      value: health.streakScore,
      weight: health.streakWeightPercent,
      explanation: 'Average current streak, counted as established at 21 days.',
    },
    {
      label: 'Engagement',
      value: health.engagementScore,
      weight: health.engagementWeightPercent,
      explanation: 'Share of active habits completed at least once in the last 7 days.',
    },
  ];

  const tone =
    health.score >= 80 ? 'text-emerald-500' : health.score >= 50 ? 'text-amber-500' : 'text-destructive';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health score</CardTitle>
        <CardDescription>
          {health.habitsCounted === 0
            ? 'No active habits to score yet.'
            : `A weighted composite across ${health.habitsCounted} active habit${health.habitsCounted === 1 ? '' : 's'}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Activity className={cn('size-8', tone)} />
            <div>
              <div className={cn('text-4xl font-bold tabular-nums', tone)}>{health.score}</div>
              <p className="text-xs text-muted-foreground">out of 100</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {components.map((component) => (
              <div key={component.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {component.label}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({component.weight}% of the score)
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{component.value}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${component.value}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{component.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HabitsAnalyticsPage() {
  const [weeks, setWeeks] = useState<number>(12);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['habits', 'analytics', weeks],
    queryFn: () => habitsApi.analytics(weeks),
  });

  // Hooks must run unconditionally on every render, so this is computed before the loading/empty
  // early return below rather than after it - falls back to empty inputs while analytics is
  // still undefined, which the early return makes moot anyway (this render is discarded).
  const habitPerformance = analytics?.habitPerformance ?? EMPTY_PERFORMANCE;
  const trend = analytics?.trend ?? EMPTY_TREND;

  const {
    best,
    worst,
    overallRate,
    totalCompletions,
    totalScheduled,
    latestWeek,
    weekDelta,
    longestStreak,
    currentBestStreak,
  } = useMemo(() => {
    const ranked = habitPerformance.filter((entry) => entry.scheduledOccurrences > 0);
    const bestRanked = ranked.slice(0, 5);
    // Worst performers, weakest first, skipping any habit already shown as a best performer.
    const worstRanked = ranked
      .slice(-5)
      .reverse()
      .filter((entry) => !bestRanked.some((b) => b.habitId === entry.habitId));

    const totalCompletions = trend.reduce((sum, point) => sum + point.completions, 0);
    const totalScheduled = trend.reduce((sum, point) => sum + point.scheduledOccurrences, 0);

    const latestWeek = trend.at(-1);
    const previousWeek = trend.at(-2);

    return {
      best: bestRanked,
      worst: worstRanked,
      overallRate: totalScheduled > 0 ? totalCompletions / totalScheduled : 0,
      totalCompletions,
      totalScheduled,
      latestWeek,
      weekDelta: latestWeek && previousWeek ? percent(latestWeek.score) - percent(previousWeek.score) : null,
      longestStreak: habitPerformance.reduce((max, entry) => Math.max(max, entry.longestStreak), 0),
      currentBestStreak: habitPerformance.reduce((max, entry) => Math.max(max, entry.currentStreak), 0),
    };
  }, [habitPerformance, trend]);

  if (isLoading || !analytics) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { healthScore, dayOfWeekPattern } = analytics;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(parseISO(analytics.windowStart), 'd MMM yyyy')} –{' '}
            {format(parseISO(analytics.windowEnd), 'd MMM yyyy')}
          </p>
        </div>
        <Tabs value={String(weeks)} onValueChange={(value) => setWeeks(Number(value))}>
          <TabsList>
            {WINDOW_OPTIONS.map((option) => (
              <TabsTrigger key={option} value={String(option)}>
                {option}w
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{percent(overallRate)}%</div>
            <p className="text-xs text-muted-foreground">
              {totalCompletions} of {totalScheduled} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold tabular-nums">{percent(latestWeek?.score ?? 0)}%</div>
              {weekDelta !== null && weekDelta !== 0 && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    weekDelta > 0 ? 'text-emerald-500' : 'text-destructive',
                  )}
                >
                  {weekDelta > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {Math.abs(weekDelta)}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">vs. last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best streak now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold tabular-nums">{currentBestStreak}</div>
              <Flame className="size-4 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground">{longestStreak} days all-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top habit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="truncate text-lg font-semibold">{best[0]?.name ?? '–'}</div>
            <p className="text-xs text-muted-foreground">
              {best[0] ? `${percent(best[0].completionRate)}% completion` : 'Nothing scheduled yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completion rate over time</CardTitle>
          <CardDescription>
            Weekly completions against what was actually scheduled, oldest week first.
            {analytics.habitsExcludedFromDayPatterns > 0 &&
              ` ${analytics.habitsExcludedFromDayPatterns} "X times per week/month" habit${
                analytics.habitsExcludedFromDayPatterns === 1 ? '' : 's'
              } excluded - those have no fixed days to score.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompletionTrendChart trend={trend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Day-of-week patterns</CardTitle>
          <CardDescription>Which days you actually follow through on, across every habit.</CardDescription>
        </CardHeader>
        <CardContent>
          <DayOfWeekChart pattern={dayOfWeekPattern} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Best performing</CardTitle>
            <CardDescription>Ranked by completion rate over this window.</CardDescription>
          </CardHeader>
          <CardContent>
            {best.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled in this window yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {best.map((entry) => (
                  <PerformanceRow key={entry.habitId} entry={entry} tone="good" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Lowest completion rates over this window.</CardDescription>
          </CardHeader>
          <CardContent>
            {worst.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing lagging behind - every habit is already in the ranking above.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {worst.map((entry) => (
                  <PerformanceRow key={entry.habitId} entry={entry} tone="bad" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <HealthScoreCard health={healthScore} />
    </div>
  );
}
