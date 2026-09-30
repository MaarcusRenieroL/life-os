import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import { Clock, Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { type TimeEntryType, timeEntryApi } from './time-entry-api';
import { tasksApi } from './tasks-api';

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

function durationFor(type: TimeEntryType): number {
  return (type === 'WORK' ? WORK_MINUTES : BREAK_MINUTES) * 60;
}

function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** A Pomodoro-style focus timer: the countdown itself is entirely client-side (setInterval), and
 * only phase start/stop boundaries are persisted via time-entry-api - see TimeEntryService's own
 * javadoc for why the split is deliberate. Resumes correctly across a page refresh by computing
 * elapsed time from the active entry's startedAt rather than trusting any client-held countdown
 * state. */
export function PomodoroTimer() {
  const queryClient = useQueryClient();
  const [taskId, setTaskId] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState(durationFor('WORK'));

  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', 'view', 'TODAY'], queryFn: () => tasksApi.list({ view: 'TODAY' }) });
  const { data: active, isLoading } = useQuery({ queryKey: ['tasks', 'time-entries', 'active'], queryFn: timeEntryApi.active });

  const today = new Date();
  const { data: summary = [] } = useQuery({
    queryKey: ['tasks', 'time-entries', 'summary', 'today'],
    queryFn: () => timeEntryApi.summary({ from: startOfDay(today).toISOString(), to: endOfDay(today).toISOString() }),
  });
  const todayMinutes = summary.reduce((sum, s) => sum + s.totalMinutes, 0);

  // Keep the countdown in sync with the server-recorded start time, not a client-only clock -
  // a refresh or a second tab both recompute from the same source of truth.
  useEffect(() => {
    if (!active) {
      setRemainingSeconds(durationFor('WORK'));
      return;
    }
    function tick() {
      const elapsed = (Date.now() - new Date(active!.startedAt).getTime()) / 1000;
      setRemainingSeconds(Math.max(0, durationFor(active!.type) - elapsed));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active]);

  // Phase complete: stop the current entry and auto-advance into the other phase, continuing the
  // work/break cycle until the user explicitly stops the session.
  useEffect(() => {
    if (!active || remainingSeconds > 0) return;
    const nextType: TimeEntryType = active.type === 'WORK' ? 'BREAK' : 'WORK';
    timeEntryApi
      .stop(active.id)
      .then(() => timeEntryApi.start(nextType, nextType === 'WORK' ? taskId || null : null))
      .then(() => {
        toast(nextType === 'BREAK' ? 'Work session done - take a break' : 'Break over - back to work');
        queryClient.invalidateQueries({ queryKey: ['tasks', 'time-entries'] });
      })
      .catch(() => toast.error('Could not advance to the next phase'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, remainingSeconds]);

  async function handleStart() {
    try {
      await timeEntryApi.start('WORK', taskId || null);
      queryClient.invalidateQueries({ queryKey: ['tasks', 'time-entries'] });
    } catch {
      toast.error('Could not start the timer');
    }
  }

  async function handleStop() {
    if (!active) return;
    try {
      await timeEntryApi.stop(active.id);
      queryClient.invalidateQueries({ queryKey: ['tasks', 'time-entries'] });
    } catch {
      toast.error('Could not stop the timer');
    }
  }

  if (isLoading) return null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {active ? (active.type === 'WORK' ? 'Focusing' : 'On a break') : 'Focus timer'}
      </span>
      <span className="font-mono text-4xl font-semibold tabular-nums">{formatClock(remainingSeconds)}</span>

      {!active && (
        <Select value={taskId} onValueChange={setTaskId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="No task (untracked)" />
          </SelectTrigger>
          <SelectContent>
            {tasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-2">
        {active ? (
          <Button variant="outline" onClick={handleStop}>
            <Square /> Stop
          </Button>
        ) : (
          <Button onClick={handleStart}>
            <Play /> Start
          </Button>
        )}
      </div>

      {todayMinutes > 0 && (
        <span className="text-[11px] text-muted-foreground">
          <Clock className="mr-1 inline size-3" />
          {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m focused today
        </span>
      )}
    </div>
  );
}
