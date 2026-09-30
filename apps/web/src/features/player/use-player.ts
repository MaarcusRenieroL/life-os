import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { analyticsApi } from '@/features/analytics/analytics-api';

import {
  activityGrid,
  attributesFrom,
  challengeDone,
  challengeFor,
  dayKey,
  dayXp,
  evaluateAchievements,
  levelFor,
  lifetimeStats,
  rankFor,
  streakOf,
  totalXp,
  type DayActivity,
} from './player-model';

/** A year of days: the window "lifetime" XP is measured over. */
const WINDOW_DAYS = 365;

/**
 * Everything the HUD shows about the player, derived from the analytics endpoints. Modules that are
 * down simply contribute nothing (analytics already degrades that way), so the HUD never blocks a page.
 */
export function usePlayer() {
  const trends = useQuery({
    queryKey: ['player', 'trends', WINDOW_DAYS],
    queryFn: () => analyticsApi.trends(WINDOW_DAYS, 'DAY'),
    staleTime: 5 * 60_000,
    retry: false,
    throwOnError: false,
  });
  const dashboard = useQuery({
    queryKey: ['player', 'dashboard'],
    queryFn: analyticsApi.dashboard,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });

  return useMemo(() => {
    const days: DayActivity[] = trends.data ?? [];
    const today = dayKey(new Date());
    const progress = levelFor(totalXp(days));
    const earnedToday = days.filter((d) => d.date === today).reduce((sum, d) => sum + dayXp(d), 0);
    const todayActivity: DayActivity = days.find((d) => d.date === today) ?? { date: today, tasksCompleted: 0, habitPct: null, workouts: 0, mood: null };
    const challenge = challengeFor(today);
    const achievements = evaluateAchievements(lifetimeStats(days, today, progress.level));
    return {
      loading: trends.isLoading || dashboard.isLoading,
      /** True once at least one call has answered; false means the HUD has nothing real to show. */
      ready: !!trends.data || !!dashboard.data,
      progress,
      rank: rankFor(progress.level),
      streak: streakOf(days, today),
      attributes: attributesFrom(dashboard.data?.week),
      today: dashboard.data?.today,
      week: dashboard.data?.week,
      earnedToday,
      challenge,
      challengeDone: challengeDone(challenge, todayActivity),
      challengeProgress: challenge.progress(todayActivity),
      achievements,
      heatmap: activityGrid(days, today, 14),
      insights: dashboard.data?.insights ?? [],
      anomalies: dashboard.data?.anomalies ?? [],
    };
  }, [trends.data, trends.isLoading, dashboard.data, dashboard.isLoading]);
}
