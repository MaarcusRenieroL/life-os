import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { formatDuration, formatVolume } from './utils';
import { workoutsApi } from './workouts-api';

/** Every completed workout, newest first. */
export function WorkoutHistoryPage() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['workouts', 'sessions', 'history'],
    queryFn: () => workoutsApi.sessions({ status: 'COMPLETED' }),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-48 w-full" />
      ) : sessions.length === 0 ? (
        <EmptyState className="mt-4" message="Finished workouts show up here." />
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Workout</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Sets</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <Link to={`/workouts/session/${session.id}`} className="font-medium hover:underline">
                    {session.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{session.completedAt ? format(parseISO(session.completedAt), 'EEE, MMM d, yyyy') : ''}</TableCell>
                <TableCell className="tabular-nums">{formatDuration(session.durationSeconds)}</TableCell>
                <TableCell className="text-right tabular-nums">{session.completedSets}</TableCell>
                <TableCell className="text-right tabular-nums">{formatVolume(session.volume)}</TableCell>
                <TableCell className="text-right">
                  {session.prCount > 0 && (
                    <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
                      <Trophy className="size-3" />
                      {session.prCount}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
