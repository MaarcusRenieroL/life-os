import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { DifficultyRating, StreakBadge } from './habit-badges';
import { habitsApi } from './habits-api';
import type { TodayHabitEntry } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

function CountEntry({ entry }: { entry: TodayHabitEntry }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(entry.todayLog?.value != null ? String(entry.todayLog.value) : '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value || saving) return;
    setSaving(true);
    try {
      await habitsApi.upsertLog(entry.habit.id, {
        logDate: todayIso(),
        status: 'COMPLETED',
        value: Number(value),
      });
      queryClient.invalidateQueries({ queryKey: ['habits', 'today'] });
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        className="w-24"
        placeholder={entry.habit.targetUnit ?? 'value'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button size="sm" onClick={() => void submit()} disabled={saving || !value}>
        Log
      </Button>
    </div>
  );
}

function BinaryEntry({ entry }: { entry: TodayHabitEntry }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const completed = entry.todayLog?.status === 'COMPLETED';

  async function toggle() {
    if (saving) return;
    setSaving(true);
    try {
      await habitsApi.upsertLog(entry.habit.id, {
        logDate: todayIso(),
        status: completed ? 'MISSED' : 'COMPLETED',
      });
      queryClient.invalidateQueries({ queryKey: ['habits', 'today'] });
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      size="sm"
      variant={completed ? 'secondary' : 'default'}
      onClick={() => void toggle()}
      disabled={saving}
    >
      {completed ? (entry.habit.type === 'NEGATIVE' ? 'Avoided ✓' : 'Completed ✓') : entry.habit.type === 'NEGATIVE' ? 'Mark avoided' : 'Complete'}
    </Button>
  );
}

export function HabitsTodayPage() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['habits', 'today'],
    queryFn: habitsApi.today,
  });

  // Streak badges come from the analytics aggregate, which already carries every habit's
  // current streak in one call - one /streak request per habit would be an N+1 waterfall on a
  // page that can list dozens of habits.
  const { data: analytics } = useQuery({
    queryKey: ['habits', 'analytics', 12],
    queryFn: () => habitsApi.analytics(12),
  });

  const streaksByHabitId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of analytics?.habitPerformance ?? []) {
      map.set(entry.habitId, entry.currentStreak);
    }
    return map;
  }, [analytics]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing due today.{' '}
          <Link to="/habits/list" className="underline">
            Manage your habits
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {entries.map((entry) => (
            <Card key={entry.habit.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {entry.habit.icon && <span>{entry.habit.icon}</span>}
                    <Link to={`/habits/${entry.habit.id}`} className="truncate text-sm font-medium hover:underline">
                      {entry.habit.name}
                    </Link>
                    {entry.habit.category && <Badge variant="outline">{entry.habit.category}</Badge>}
                    <StreakBadge days={streaksByHabitId.get(entry.habit.id) ?? 0} />
                    <DifficultyRating difficulty={entry.habit.difficulty} />
                  </div>
                  {entry.habit.why && (
                    <span className="truncate text-xs text-muted-foreground italic">{entry.habit.why}</span>
                  )}
                  {entry.todayLog && (
                    <span className="text-xs text-muted-foreground">
                      Logged: {entry.todayLog.status}
                      {entry.todayLog.value != null ? ` (${entry.todayLog.value})` : ''}
                    </span>
                  )}
                </div>
                {entry.habit.type === 'COUNT' || entry.habit.type === 'DURATION' ? (
                  <CountEntry entry={entry} />
                ) : (
                  <BinaryEntry entry={entry} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
