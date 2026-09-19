import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PartyPopper } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { DifficultyRating, StreakBadge } from './habit-badges';
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

  const target = entry.habit.targetValue;
  const progress = target ? Math.min(100, Math.round((Number(value || 0) / target) * 100)) : null;

  return (
    <div className="flex flex-col items-end gap-1.5">
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
      {progress != null && (
        <div className="h-1 w-32 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full rounded-full transition-all', progress >= 100 ? 'bg-emerald-500' : 'bg-primary')}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
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

  return (
    <Button
      size="sm"
      variant={completed ? 'secondary' : 'default'}
      className={cn(completed && 'border border-emerald-500/40 text-emerald-600 dark:text-emerald-400')}
      onClick={() => void toggle()}
      disabled={saving}
    >
      {completed ? (
        <>
          <CheckCircle2 className="size-4" />
          {entry.habit.type === 'NEGATIVE' ? 'Avoided' : 'Completed'}
        </>
      ) : entry.habit.type === 'NEGATIVE' ? (
        'Mark avoided'
      ) : (
        'Complete'
      )}
    </Button>
  );
}

function HabitRow({ entry }: { entry: TodayHabitEntry & { currentStreak: number } }) {
  const done = isDone(entry);

  return (
    <Card className={cn('transition-colors', done && 'border-emerald-500/30 bg-emerald-500/[0.03]')}>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border text-lg',
              done ? 'border-emerald-500/30 bg-emerald-500/10' : 'bg-secondary/50',
            )}
          >
            {entry.habit.icon ?? '•'}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                to={`/habits/${entry.habit.id}`}
                className={cn(
                  'truncate text-sm font-medium hover:underline',
                  done && 'text-muted-foreground line-through decoration-emerald-500/50',
                )}
              >
                {entry.habit.name}
              </Link>
              {entry.habit.category && (
                <Badge variant="outline" className="text-[10px]">
                  {entry.habit.category}
                </Badge>
              )}
              <StreakBadge days={entry.currentStreak} />
              <DifficultyRating difficulty={entry.habit.difficulty} />
            </div>
            {entry.habit.why && (
              <span className="truncate text-xs text-muted-foreground italic">{entry.habit.why}</span>
            )}
            {entry.todayLog && (
              <span className="text-xs text-muted-foreground">
                Logged: {entry.todayLog.status}
                {entry.todayLog.value != null ? ` (${entry.todayLog.value} ${entry.habit.targetUnit ?? ''})` : ''}
              </span>
            )}
          </div>
        </div>
        {entry.habit.type === 'COUNT' || entry.habit.type === 'DURATION' ? (
          <CountEntry entry={entry} />
        ) : (
          <BinaryEntry entry={entry} />
        )}
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

  const remaining = withStreaks.filter((entry) => !isDone(entry));
  const completed = withStreaks.filter((entry) => isDone(entry));
  const total = withStreaks.length;
  const donePercent = total > 0 ? Math.round((completed.length / total) * 100) : 0;
  const today = new Date();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {!isLoading && total > 0 && (
          <div className="flex items-center gap-3">
            {donePercent === 100 && <PartyPopper className="size-5 text-amber-500" />}
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">
                {completed.length}
                <span className="text-base font-normal text-muted-foreground">/{total}</span>
              </div>
              <div className="text-xs text-muted-foreground">done today</div>
            </div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full transition-all', donePercent === 100 ? 'bg-emerald-500' : 'bg-primary')}
                style={{ width: `${donePercent}%` }}
              />
            </div>
          </div>
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
        <div className="mt-6 flex flex-col gap-6">
          {remaining.length > 0 && (
            <div className="flex flex-col gap-2">
              {completed.length > 0 && (
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Remaining ({remaining.length})
                </h2>
              )}
              {remaining.map((entry) => (
                <HabitRow key={entry.habit.id} entry={entry} />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Completed ({completed.length})
              </h2>
              {completed.map((entry) => (
                <HabitRow key={entry.habit.id} entry={entry} />
              ))}
            </div>
          )}

          {remaining.length === 0 && (
            <p className="text-sm text-muted-foreground">
              All done for today <PartyPopper className="inline size-4 text-amber-500" />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
