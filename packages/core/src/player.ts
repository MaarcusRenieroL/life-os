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
import type { Dashboard, TrendPoint } from './types';

/** Everything a HUD shows about the player, derived (never stored) from the analytics endpoints. */
export function derivePlayer(trends: TrendPoint[] | undefined, dashboard: Dashboard | undefined, now: Date = new Date()) {
  const days: DayActivity[] = trends ?? [];
  const today = dayKey(now);
  const progress = levelFor(totalXp(days));
  const todayActivity: DayActivity = days.find((d) => d.date === today) ?? { date: today, tasksCompleted: 0, habitPct: null, workouts: 0, mood: null };
  const challenge = challengeFor(today);
  return {
    ready: !!trends || !!dashboard,
    progress,
    rank: rankFor(progress.level),
    streak: streakOf(days, today),
    attributes: attributesFrom(dashboard?.week),
    week: dashboard?.week,
    earnedToday: days.filter((d) => d.date === today).reduce((sum, d) => sum + dayXp(d), 0),
    challenge,
    challengeDone: challengeDone(challenge, todayActivity),
    challengeProgress: challenge.progress(todayActivity),
    achievements: evaluateAchievements(lifetimeStats(days, today, progress.level)),
    heatmap: activityGrid(days, today, 14),
  };
}

export type PlayerState = ReturnType<typeof derivePlayer>;

export const RANK_HEX = { E: '#8a929c', D: '#3ddc97', C: '#35c6e8', B: '#9b7bff', A: '#f2b84b', S: '#ff4fa3' } as const;
export const MEDAL_HEX = ['#b0763c', '#c3c8d0', '#e8c13a', '#7fd8e8'] as const;
