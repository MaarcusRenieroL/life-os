import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/empty-state';
import { workoutsApi } from '@/features/workouts/workouts-api';
import { formatDuration } from '@/features/workouts/utils';

import type { GoalProgressBreakdown } from './types';

/** Completed workouts linked to this goal. Sessions are linked from the workout side (the goal
 * picker when starting or scheduling one); the weekly target that turns them into progress is
 * set on the goal itself. */
export function GoalWorkoutsPanel({ goalId, progress }: { goalId: string; progress: GoalProgressBreakdown }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ['workouts', 'sessions', 'history'],
    queryFn: () => workoutsApi.sessions({ status: 'COMPLETED' }),
  });
  const linked = sessions.filter((s) => s.goalId === goalId);

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        {progress.weeklyWorkoutTarget == null
          ? 'Set “workouts per week” on this goal to have linked workouts count toward its progress.'
          : `${progress.workoutSessions} in the last 4 weeks · target ${progress.weeklyWorkoutTarget} a week`}
      </p>
      {linked.length === 0 ? (
        <EmptyState message="No workouts linked yet - pick this goal when you start or schedule one." />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {linked.slice(0, 6).map((session) => (
            <li key={session.id} className="flex items-center gap-2 px-3 py-2">
              <Dumbbell className="size-4 shrink-0 text-muted-foreground" />
              <Link to={`/workouts/session/${session.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                {session.name}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">
                {session.completedAt ? format(parseISO(session.completedAt), 'MMM d') : ''} · {formatDuration(session.durationSeconds)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
