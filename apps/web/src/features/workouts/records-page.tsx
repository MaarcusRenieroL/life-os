import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { LineChart } from './charts';
import { EXERCISE_CATEGORY_LABELS } from './types';
import { formatWeight } from './utils';
import { workoutsApi } from './workouts-api';

/** Personal records: the heaviest weight per exercise, with the progression that got there. */
export function RecordsPage() {
  const { data: records = [], isLoading } = useQuery({ queryKey: ['workouts', 'records'], queryFn: workoutsApi.records });
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Personal records</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-48 w-full" />
      ) : records.length === 0 ? (
        <EmptyState className="mt-4" message="Log a workout and your heaviest lifts are tracked here." />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => {
            const expanded = open === record.exerciseId;
            const progression = [...record.history].reverse().map((r) => ({ label: format(parseISO(r.achievedAt), 'MMM d'), value: r.weight }));
            return (
              <Card key={record.exerciseId}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{record.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">{EXERCISE_CATEGORY_LABELS[record.category]}</p>
                    </div>
                    <Trophy className="size-5 text-amber-500" />
                  </div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatWeight(record.best.weight)} <span className="text-sm font-normal text-muted-foreground">× {record.best.reps}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(record.best.achievedAt), 'MMM d, yyyy')}
                    {record.best.sessionId && (
                      <>
                        {' · '}
                        <Link to={`/workouts/session/${record.best.sessionId}`} className="hover:underline">
                          workout
                        </Link>
                      </>
                    )}
                  </p>
                  {record.history.length > 1 && (
                    <>
                      <button type="button" className="self-start text-xs text-muted-foreground hover:text-foreground" onClick={() => setOpen(expanded ? null : record.exerciseId)}>
                        {expanded ? 'Hide' : 'Show'} progression ({record.history.length})
                      </button>
                      {expanded && <LineChart data={progression} height={120} valueFormat={(v) => `${v} kg`} ariaLabel={`${record.exerciseName} progression`} />}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
