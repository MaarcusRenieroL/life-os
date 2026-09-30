import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CalendarPlus, Dumbbell, Play, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/error';

import { ScheduleWorkoutDialog, StartWorkoutDialog } from './start-workout-dialogs';
import type { SessionSummary } from './types';
import { useNow } from './use-now';
import { formatDuration, formatVolume } from './utils';
import { workoutsApi } from './workouts-api';

function SessionRow({ session, children }: { session: SessionSummary; children?: React.ReactNode }) {
  const when = session.completedAt ?? session.scheduledFor ?? session.startedAt;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <Link to={`/workouts/session/${session.id}`} className="block truncate text-sm font-medium hover:underline">
          {session.name}
        </Link>
        <p className="text-xs text-muted-foreground">
          {when ? format(parseISO(when), 'EEE, MMM d · HH:mm') : ''}
          {session.status === 'COMPLETED' && ` · ${formatDuration(session.durationSeconds)} · ${session.completedSets} sets · ${formatVolume(session.volume)}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {session.prCount > 0 && (
          <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <Trophy className="size-3" />
            {session.prCount} PR{session.prCount === 1 ? '' : 's'}
          </Badge>
        )}
        {children}
      </div>
    </li>
  );
}

function InProgressBanner({ session }: { session: SessionSummary }) {
  const now = useNow();
  const elapsed = session.startedAt ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000)) : 0;
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-xs tracking-widest text-primary uppercase">Workout in progress</p>
          <p className="text-lg font-semibold">{session.name}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatDuration(elapsed)} · {session.completedSets}/{session.totalSets} sets
          </p>
        </div>
        <Button asChild>
          <Link to={`/workouts/session/${session.id}`}>
            <Dumbbell /> Resume
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function WorkoutsTodayPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirmDialog();
  const [startOpen, setStartOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { data: current, isLoading } = useQuery({ queryKey: ['workouts', 'sessions', 'current'], queryFn: workoutsApi.currentSession });
  const { data: planned = [] } = useQuery({ queryKey: ['workouts', 'sessions', 'planned'], queryFn: () => workoutsApi.sessions({ status: 'PLANNED' }) });
  const { data: recent = [] } = useQuery({ queryKey: ['workouts', 'sessions', 'recent'], queryFn: () => workoutsApi.sessions({ status: 'COMPLETED' }) });
  const { data: analytics } = useQuery({ queryKey: ['workouts', 'analytics', 12, 3], queryFn: () => workoutsApi.analytics(12, 3) });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['workouts'] });
  }

  async function startPlanned(session: SessionSummary) {
    try {
      const detail = await workoutsApi.startPlanned(session.id);
      refresh();
      navigate(`/workouts/session/${detail.session.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start the workout.'));
    }
  }

  async function cancelPlanned(session: SessionSummary) {
    if (!(await confirm({ title: `Cancel “${session.name}”?`, description: 'It’s removed from your calendar too.', confirmLabel: 'Cancel workout' }))) return;
    try {
      await workoutsApi.deleteSession(session.id);
      refresh();
    } catch {
      toast.error('Could not cancel the workout. Please try again.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScheduleOpen(true)}>
            <CalendarPlus /> Schedule
          </Button>
          <Button onClick={() => setStartOpen(true)} disabled={!!current}>
            <Play /> Start workout
          </Button>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-24 w-full" /> : current && <InProgressBanner session={current.session} />}

      {analytics && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <Stat label="This week" value={`${analytics.currentWeekSessions}/${analytics.weeklyTarget}`} hint="sessions" />
            <Stat label="Streak" value={String(analytics.currentStreakWeeks)} hint={analytics.currentStreakWeeks === 1 ? 'week' : 'weeks'} />
            <Stat label="Avg / week" value={String(analytics.sessionsPerWeek)} hint="last 12 weeks" />
            <Stat label="Records" value={String(analytics.personalRecords)} hint="last 12 weeks" />
          </CardContent>
        </Card>
      )}

      <section>
        <SectionHeading className="mb-3">scheduled</SectionHeading>
        {planned.length === 0 ? (
          <EmptyState message="Nothing scheduled - plan a workout and it shows up on your calendar." />
        ) : (
          <ul className="flex flex-col gap-2">
            {planned.map((session) => (
              <SessionRow key={session.id} session={session}>
                <Button size="sm" disabled={!!current} onClick={() => void startPlanned(session)}>
                  <Play /> Start
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Cancel ${session.name}`} onClick={() => void cancelPlanned(session)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </SessionRow>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <SectionHeading>recent</SectionHeading>
          <Link to="/workouts/history" className="text-xs text-muted-foreground hover:text-foreground">
            All history
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState message="No workouts logged yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.slice(0, 5).map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </ul>
        )}
      </section>

      <StartWorkoutDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        onStarted={(detail) => {
          refresh();
          navigate(`/workouts/session/${detail.session.id}`);
        }}
      />
      <ScheduleWorkoutDialog open={scheduleOpen} onOpenChange={setScheduleOpen} onScheduled={refresh} />
      {dialog}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
