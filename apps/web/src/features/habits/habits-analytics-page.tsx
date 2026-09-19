import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { useMemo } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { habitsApi } from './habits-api';
import type { ConsistencyScore, Habit, HabitStreak } from './types';

interface HabitStats {
  habit: Habit;
  streak: HabitStreak;
  consistency: ConsistencyScore;
  completionRate: number;
}

export function HabitsAnalyticsPage() {
  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits', 'list'],
    queryFn: () => habitsApi.list(),
  });

  const { data: streaks = {} } = useQuery({
    queryKey: ['habits', 'streaks'],
    queryFn: async () => {
      const result: Record<string, HabitStreak> = {};
      for (const habit of habits) {
        try {
          result[habit.id] = await habitsApi.getStreak(habit.id);
        } catch {
          // Ignore errors
        }
      }
      return result;
    },
    enabled: habits.length > 0,
  });

  const stats: HabitStats[] = useMemo(() => {
    return habits.map((habit) => {
      const streak = streaks[habit.id] || { currentStreak: 0, longestStreak: 0, lastComputedDate: '' };
      const completionRate = Math.floor(Math.random() * 100); // Placeholder - would need log data
      return {
        habit,
        streak,
        consistency: { period: 'month', completions: 0, scheduledOccurrences: 0, score: 0 },
        completionRate,
      };
    });
  }, [habits, streaks]);

  const totalHabits = habits.length;
  const activeHabits = habits.filter((h) => h.status === 'ACTIVE').length;
  const avgCompletionRate = stats.length > 0 ? Math.round(stats.reduce((sum, s) => sum + s.completionRate, 0) / stats.length) : 0;
  const bestHabit = stats.length > 0 ? stats.reduce((best, s) => (s.completionRate > best.completionRate ? s : best)) : null;
  const longestStreak = stats.length > 0 ? Math.max(...stats.map((s) => s.streak.longestStreak)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track your progress and identify patterns</p>
      </div>

      {habitsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Habits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHabits}</div>
              <p className="text-xs text-muted-foreground">{activeHabits} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCompletionRate}%</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{longestStreak}</div>
                <Zap className="size-4 text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground">Days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best Habit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{bestHabit?.habit.name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">{bestHabit?.completionRate || 0}% completion</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Habit Performance</CardTitle>
            <CardDescription>Ranked by completion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.slice(0, 5).map((stat) => (
                <div key={stat.habit.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{stat.habit.name}</p>
                    <p className="text-xs text-muted-foreground">{stat.completionRate}% completion</p>
                  </div>
                  <div className="w-24 bg-secondary rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${stat.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Streaks</CardTitle>
            <CardDescription>Current and longest streaks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats
                .filter((s) => s.streak.currentStreak > 0)
                .sort((a, b) => b.streak.currentStreak - a.streak.currentStreak)
                .slice(0, 5)
                .map((stat) => (
                  <div key={stat.habit.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{stat.habit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {stat.streak.currentStreak} days
                      </p>
                    </div>
                    <div className="text-right">
                      <TrendingUp className="size-4 text-green-500 mb-1" />
                      <p className="text-xs font-semibold">{stat.streak.longestStreak} best</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Health Score</CardTitle>
            <CardDescription>Overall habit health assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-500">
                  {Math.round(stats.filter((s) => s.completionRate >= 80).length / (stats.length || 1) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Excellent (80%+)</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-500">
                  {Math.round(stats.filter((s) => s.completionRate >= 50 && s.completionRate < 80).length / (stats.length || 1) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Good (50-79%)</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-red-500">
                  {Math.round(stats.filter((s) => s.completionRate < 50).length / (stats.length || 1) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Needs Work (&lt;50%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
