import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DifficultyRating, MilestoneBadges, nextMilestone } from './habit-badges';
import { HabitFormDialog } from './habit-form-dialog';
import { HabitReminderForm } from './habit-reminder-form';
import { habitsApi } from './habits-api';
import type { ConsistencyPeriod, HabitLog } from './types';

export function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<ConsistencyPeriod>('week');
  const [editOpen, setEditOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const { data: habit, isLoading } = useQuery({
    queryKey: ['habits', id],
    queryFn: () => habitsApi.get(id!),
    enabled: !!id,
  });

  const { data: streak } = useQuery({
    queryKey: ['habits', id, 'streak'],
    queryFn: () => habitsApi.streak(id!),
    enabled: !!id,
  });

  const { data: consistency } = useQuery({
    queryKey: ['habits', id, 'consistency', period],
    queryFn: () => habitsApi.consistency(id!, period),
    enabled: !!id,
  });

  // Bounded to the last 12 months rather than the habit's whole history - the log history table
  // below renders every row unbounded, so a habit tracked for a couple of years was shipping and
  // rendering hundreds of rows on every detail-page open.
  const logsFrom = new Date();
  logsFrom.setFullYear(logsFrom.getFullYear() - 1);
  const logsFromIso = logsFrom.toISOString().slice(0, 10);

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['habits', id, 'logs', logsFromIso],
    queryFn: () => habitsApi.logs(id!, logsFromIso),
    enabled: !!id,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['habits', id] });
  }

  async function deleteLog(logId: string) {
    if (!id) return;
    const ok = await confirm({ title: 'Undo this log entry?', confirmLabel: 'Undo' });
    if (!ok) return;
    try {
      await habitsApi.deleteLog(id, logId);
      queryClient.invalidateQueries({ queryKey: ['habits', id, 'logs'] });
    } catch {
      toast.error('Could not undo that log entry.');
    }
  }

  const logColumns = useMemo<ColumnDef<HabitLog>[]>(
    () => [
      {
        accessorKey: 'logDate',
        meta: { title: 'Date', filter: { type: 'date' } },
        cell: ({ row }) => row.original.logDate.slice(0, 10),
      },
      {
        accessorKey: 'status',
        meta: { title: 'Status', filter: { type: 'select' } },
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'value',
        meta: { title: 'Value', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => row.original.value ?? '–',
      },
      {
        accessorKey: 'note',
        meta: { title: 'Note', filter: { type: 'text' } },
        cell: ({ row }) => <span className="block max-w-64 truncate">{row.original.note ?? '–'}</span>,
      },
      {
        accessorKey: 'failureReason',
        meta: { title: 'Reason it failed', filter: { type: 'text' } },
        cell: ({ row }) => row.original.failureReason ?? '–',
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteLog(row.original.id)}>
              Undo
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  if (isLoading || !habit) {
    return (
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-32 w-full" />
      </div>
    );
  }

  const sortedLogs = [...logs].sort((a, b) => b.logDate.localeCompare(a.logDate));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/habits/list" className="text-xs text-muted-foreground hover:underline">
            ← Back to habits
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {habit.icon && <span className="mr-2">{habit.icon}</span>}
            {habit.name}
          </h1>
          {habit.description && <p className="mt-1 text-sm text-muted-foreground">{habit.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={habit.status === 'ACTIVE' ? 'default' : 'outline'}>{habit.status}</Badge>
            {habit.category && <Badge variant="secondary">{habit.category}</Badge>}
            {habit.difficulty != null && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Difficulty
                <DifficultyRating difficulty={habit.difficulty} />
                <span className="tabular-nums">{habit.difficulty}/10</span>
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>Edit habit</Button>
      </div>

      {habit.why && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Why this matters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="border-l-2 border-primary pl-3 text-sm italic">{habit.why}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Streak</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-semibold">{streak?.currentStreak ?? '–'}</div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{streak?.longestStreak ?? '–'}</div>
                <div className="text-xs text-muted-foreground">Longest</div>
              </div>
            </div>

            {/* Milestones are derived from the streak counts the backend already returns - nothing
                is awarded or stored. */}
            <MilestoneBadges days={streak?.currentStreak ?? 0} />
            {streak != null &&
              (() => {
                const next = nextMilestone(streak.currentStreak);
                return next ? (
                  <p className="text-xs text-muted-foreground">
                    {next.remaining} more day{next.remaining === 1 ? '' : 's'} to the {next.target}-day badge.
                  </p>
                ) : null;
              })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consistency</CardTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as ConsistencyPeriod)}>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {consistency ? (
              <div>
                <div className="text-2xl font-semibold">{Math.round(consistency.score * 100)}%</div>
                <div className="text-xs text-muted-foreground">
                  {consistency.completions} of {consistency.scheduledOccurrences} scheduled
                </div>
              </div>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <HabitReminderForm habitId={habit.id} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Log history</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : sortedLogs.length === 0 ? (
            <EmptyState message="No logs yet." />
          ) : (
            <DataGrid
              tableId="habits.logs"
              data={sortedLogs}
              columns={logColumns}
              getRowId={(l) => l.id}
              initialSorting={[{ id: 'logDate', desc: true }]}
              initialVisibility={{ failureReason: false }}
              exportName="habit-logs"
              searchPlaceholder="Search logs…"
              hidePagination={sortedLogs.length <= 10}
            />
          )}
        </CardContent>
      </Card>

      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} editing={habit} onSaved={invalidateAll} />
      {dialog}
    </div>
  );
}
