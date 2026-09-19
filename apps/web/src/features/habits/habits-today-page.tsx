import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

import { DifficultyRating } from './habit-badges';
import { habitsApi } from './habits-api';
import type { TodayHabitEntry } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

function isDone(entry: TodayHabitEntry): boolean {
  return entry.todayLog?.status === 'COMPLETED' || entry.todayLog?.status === 'PARTIAL';
}

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
      queryClient.invalidateQueries({ queryKey: ['habits', 'analytics'] });
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
        className="w-20"
        placeholder={entry.habit.targetUnit ?? 'value'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
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
      queryClient.invalidateQueries({ queryKey: ['habits', 'analytics'] });
    } catch {
      toast.error('Could not log this habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return <Checkbox checked={completed} onCheckedChange={() => void toggle()} disabled={saving} className="size-5" />;
}

function HabitRow({ entry }: { entry: TodayHabitEntry & { currentStreak: number } }) {
  const done = isDone(entry);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        {entry.habit.type === 'COUNT' || entry.habit.type === 'DURATION' ? (
          <CountEntry entry={entry} />
        ) : (
          <BinaryEntry entry={entry} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {entry.habit.icon && <span>{entry.habit.icon}</span>}
            <Link
              to={`/habits/${entry.habit.id}`}
              className="truncate text-sm font-medium hover:underline"
            >
              {entry.habit.name}
            </Link>
            {entry.habit.category && (
              <Badge variant="outline" className="text-[10px]">
                {entry.habit.category}
              </Badge>
            )}
            {entry.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="size-3" />
                {entry.currentStreak}
              </span>
            )}
            <DifficultyRating difficulty={entry.habit.difficulty} />
          </div>
          {entry.habit.why && (
            <p className="truncate text-xs text-muted-foreground italic">{entry.habit.why}</p>
          )}
          {done && entry.todayLog?.value != null && (
            <p className="text-xs text-muted-foreground">
              Logged: {entry.todayLog.value} {entry.habit.targetUnit ?? ''}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
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

  const withStreaks = useMemo(
    () => entries.map((entry) => ({ ...entry, currentStreak: streaksByHabitId.get(entry.habit.id) ?? 0 })),
    [entries, streaksByHabitId],
  );

  const doneCount = withStreaks.filter(isDone).length;
  const total = withStreaks.length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        {!isLoading && total > 0 && (
          <span className="text-sm text-muted-foreground">
            {doneCount} of {total} done
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing due today.{' '}
          <Link to="/habits/list" className="underline">
            Manage your habits
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {withStreaks.map((entry) => (
            <HabitRow key={entry.habit.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
