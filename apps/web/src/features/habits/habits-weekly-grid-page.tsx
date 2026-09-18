import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { habitsApi } from './habits-api';
import type { Habit, HabitLog, HabitLogStatus } from './types';

// Click cycles a cell through this order; cycling past MISSED clears the log entirely.
const CYCLE: (HabitLogStatus | null)[] = [null, 'COMPLETED', 'SKIPPED', 'MISSED'];

const STATUS_STYLES: Record<HabitLogStatus, string> = {
  COMPLETED: 'bg-primary text-primary-foreground',
  SKIPPED: 'bg-muted text-muted-foreground',
  MISSED: 'bg-destructive/15 text-destructive',
  PARTIAL: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
};

function weekDays(): Date[] {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function HabitsWeeklyGridPage() {
  const queryClient = useQueryClient();
  const days = weekDays();
  const from = format(days[0], 'yyyy-MM-dd');
  const to = format(days[6], 'yyyy-MM-dd');

  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits', 'list', { status: 'ACTIVE' }],
    queryFn: () => habitsApi.list({ status: 'ACTIVE' }),
  });

  // One logs call per habit for the current week - unavoidable without a bulk
  // "logs for all habits in a range" endpoint in the contract; bounded by the
  // (typically small) number of active habits, run in parallel via useQueries.
  const logQueries = useQueries({
    queries: habits.map((habit) => ({
      queryKey: ['habits', habit.id, 'logs', from, to],
      queryFn: () => habitsApi.logs(habit.id, from, to),
      enabled: habits.length > 0,
    })),
  });

  const logsLoading = logQueries.some((q) => q.isLoading);

  function logsForHabit(habitId: string): HabitLog[] {
    const index = habits.findIndex((h) => h.id === habitId);
    return index >= 0 ? (logQueries[index]?.data ?? []) : [];
  }

  async function cycleCell(habit: Habit, dateIso: string, currentLog: HabitLog | undefined) {
    const currentIndex = currentLog ? CYCLE.indexOf(currentLog.status) : 0;
    const nextStatus = CYCLE[(currentIndex + 1) % CYCLE.length];

    try {
      if (nextStatus === null) {
        if (currentLog) await habitsApi.deleteLog(habit.id, currentLog.id);
      } else {
        await habitsApi.upsertLog(habit.id, { logDate: dateIso, status: nextStatus });
      }
      queryClient.invalidateQueries({ queryKey: ['habits', habit.id, 'logs'] });
    } catch {
      toast.error('Could not update that log. Please try again.');
    }
  }

  const isLoading = habitsLoading || logsLoading;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Weekly grid</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Click a cell to cycle: not logged → completed → skipped → missed → not logged.
      </p>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No active habits to show.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="min-w-40 border-b p-2 text-left font-medium">Habit</th>
                {days.map((day) => (
                  <th key={day.toISOString()} className="border-b p-2 text-center font-medium">
                    <div>{format(day, 'EEE')}</div>
                    <div className="text-xs font-normal text-muted-foreground">{format(day, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((habit) => {
                const logs = logsForHabit(habit.id);
                return (
                  <tr key={habit.id}>
                    <td className="border-b p-2">
                      <Link to={`/habits/${habit.id}`} className="font-medium hover:underline">
                        {habit.icon && <span className="mr-1">{habit.icon}</span>}
                        {habit.name}
                      </Link>
                    </td>
                    {days.map((day) => {
                      const dateIso = format(day, 'yyyy-MM-dd');
                      const log = logs.find((l) => l.logDate.slice(0, 10) === dateIso);
                      return (
                        <td key={dateIso} className="border-b p-2 text-center">
                          <button
                            type="button"
                            onClick={() => void cycleCell(habit, dateIso, log)}
                            className={cn(
                              'mx-auto flex size-8 items-center justify-center rounded-md border transition-colors',
                              log ? STATUS_STYLES[log.status] : 'bg-transparent hover:bg-muted',
                            )}
                            title={log ? log.status : 'Not logged'}
                          >
                            {log?.status === 'COMPLETED' && '✓'}
                            {log?.status === 'SKIPPED' && '–'}
                            {log?.status === 'MISSED' && '✕'}
                            {log?.status === 'PARTIAL' && '½'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
