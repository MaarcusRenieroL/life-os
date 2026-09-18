import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { HabitFormDialog } from './habit-form-dialog';
import { HabitReminderForm } from './habit-reminder-form';
import { habitsApi } from './habits-api';
import type { ConsistencyPeriod } from './types';

export function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<ConsistencyPeriod>('week');
  const [editOpen, setEditOpen] = useState(false);

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

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['habits', id, 'logs', 'all'],
    queryFn: () => habitsApi.logs(id!),
    enabled: !!id,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['habits', id] });
  }

  async function deleteLog(logId: string) {
    if (!id) return;
    if (!confirm('Undo this log entry?')) return;
    try {
      await habitsApi.deleteLog(id, logId);
      queryClient.invalidateQueries({ queryKey: ['habits', id, 'logs'] });
    } catch {
      toast.error('Could not undo that log entry.');
    }
  }

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
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={habit.status === 'ACTIVE' ? 'default' : 'outline'}>{habit.status}</Badge>
            {habit.category && <Badge variant="secondary">{habit.category}</Badge>}
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>Edit habit</Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Streak</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6">
            <div>
              <div className="text-2xl font-semibold">{streak?.currentStreak ?? '–'}</div>
              <div className="text-xs text-muted-foreground">Current</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{streak?.longestStreak ?? '–'}</div>
              <div className="text-xs text-muted-foreground">Longest</div>
            </div>
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
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.logDate.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.status}</Badge>
                    </TableCell>
                    <TableCell>{log.value ?? '–'}</TableCell>
                    <TableCell className="max-w-64 truncate">{log.note ?? '–'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteLog(log.id)}>
                        Undo
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <HabitFormDialog open={editOpen} onOpenChange={setEditOpen} editing={habit} onSaved={invalidateAll} />
    </div>
  );
}
