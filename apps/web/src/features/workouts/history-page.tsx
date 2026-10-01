import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DataGrid } from '@/components/data-table/data-grid';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import type { SessionSummary } from './types';
import { formatDuration, formatVolume } from './utils';
import { workoutsApi } from './workouts-api';

/** Every completed workout, newest first. */
export function WorkoutHistoryPage() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['workouts', 'sessions', 'history'],
    queryFn: () => workoutsApi.sessions({ status: 'COMPLETED' }),
  });

  const navigate = useNavigate();
  const columns = useMemo<ColumnDef<SessionSummary>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { title: 'Workout', filter: { type: 'text' } },
        cell: ({ row }) => (
          <Link to={`/workouts/session/${row.original.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'completedAt',
        meta: { title: 'Date', filter: { type: 'date' } },
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.completedAt ? format(parseISO(row.original.completedAt), 'EEE, MMM d, yyyy') : ''}</span>
        ),
      },
      {
        accessorKey: 'durationSeconds',
        meta: { title: 'Duration', align: 'right', filter: { type: 'number' }, exportValue: (w) => formatDuration(w.durationSeconds) },
        cell: ({ row }) => formatDuration(row.original.durationSeconds),
      },
      {
        accessorKey: 'completedSets',
        meta: { title: 'Sets', align: 'right', aggregate: 'sum', filter: { type: 'number' } },
      },
      {
        accessorKey: 'volume',
        meta: { title: 'Volume', align: 'right', aggregate: 'sum', format: (v) => formatVolume(Number(v)), filter: { type: 'number' } },
        cell: ({ row }) => formatVolume(row.original.volume),
      },
      {
        accessorKey: 'prCount',
        meta: { title: 'Personal records', align: 'right', aggregate: 'sum', filter: { type: 'number' } },
        cell: ({ row }) =>
          row.original.prCount > 0 ? (
            <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <Trophy className="size-3" />
              {row.original.prCount}
            </Badge>
          ) : (
            '—'
          ),
      },
    ],
    [],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-48 w-full" />
      ) : sessions.length === 0 ? (
        <EmptyState className="mt-4" message="Finished workouts show up here." />
      ) : (
        <div className="mt-4">
          <DataGrid
            tableId="workouts.history"
            data={sessions}
            columns={columns}
            getRowId={(w) => w.id}
            onRowClick={(w) => navigate(`/workouts/session/${w.id}`)}
            initialSorting={[{ id: 'completedAt', desc: true }]}
            initialVisibility={{ prCount: false }}
            exportName="workout-history"
            searchPlaceholder="Search workouts…"
            hidePagination={sessions.length <= 10}
          />
        </div>
      )}
    </div>
  );
}
