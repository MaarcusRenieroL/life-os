import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { Card, CardContent } from '@/components/ui/card';

import { tasksApi } from './tasks-api';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS } from './types';

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

/** Client-side stats over the full task list - no dedicated analytics endpoint yet (unlike
 * habit-tracker's server-side aggregates), since this is a first pass and the full list is
 * already small enough to fetch and derive from directly. */
export function TasksAnalyticsPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'view', 'PLAIN'],
    queryFn: () => tasksApi.list(),
  });

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const withDueDate = tasks.filter((t) => t.dueDate);
    const overdue = withDueDate.filter((t) => t.status !== 'DONE' && t.dueDate! < today);
    const done = tasks.filter((t) => t.status === 'DONE');

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartIso = weekStart.toISOString().slice(0, 10);
    const dueThisWeek = withDueDate.filter((t) => t.dueDate! >= weekStartIso && t.dueDate! <= today);
    const doneThisWeek = dueThisWeek.filter((t) => t.status === 'DONE');

    const byPriority = new Map(TASK_PRIORITIES.map((p) => [p, 0]));
    const byStatus = new Map(TASK_STATUSES.map((s) => [s, 0]));
    for (const t of tasks) {
      byPriority.set(t.priority, (byPriority.get(t.priority) ?? 0) + 1);
      byStatus.set(t.status, (byStatus.get(t.status) ?? 0) + 1);
    }

    return {
      total: tasks.length,
      completionRate: pct(done.length, tasks.length),
      overdueRate: pct(overdue.length, withDueDate.length),
      overdueCount: overdue.length,
      weekCompletionRate: pct(doneThisWeek.length, dueThisWeek.length),
      byPriority,
      byStatus,
    };
  }, [tasks]);

  if (isLoading) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total tasks" value={String(stats.total)} />
        <StatTile label="Completion rate" value={stats.completionRate} sub="All tasks" />
        <StatTile label="This week" value={stats.weekCompletionRate} sub="Due this week, completed" />
        <StatTile label="Overdue rate" value={stats.overdueRate} sub={`${stats.overdueCount} overdue`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">By priority</h2>
            <div className="flex flex-col gap-2">
              {TASK_PRIORITIES.map((p) => (
                <div key={p} className="flex items-center justify-between text-sm">
                  <span>{TASK_PRIORITY_LABELS[p]}</span>
                  <span className="font-medium">{stats.byPriority.get(p)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">By status</h2>
            <div className="flex flex-col gap-2">
              {TASK_STATUSES.map((s) => (
                <div key={s} className="flex items-center justify-between text-sm">
                  <span>{TASK_STATUS_LABELS[s]}</span>
                  <span className="font-medium">{stats.byStatus.get(s)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
