import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { PriorityBadge } from './task-badges';
import { TaskFormDialog } from './task-form-dialog';
import { tasksApi } from './tasks-api';
import { TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskStatus } from './types';

// No drag-and-drop yet - each card exposes a "Move to..." action instead. Wiring a DnD library in
// is a reasonable follow-up once the board's basic column/status flow is validated.
export function TasksBoardPage() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'view', 'PLAIN'],
    queryFn: () => tasksApi.list(),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }

  const columns = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>(TASK_STATUSES.map((s) => [s, []]));
    for (const task of tasks) {
      map.get(task.status)?.push(task);
    }
    return map;
  }, [tasks]);

  async function moveTo(task: Task, status: TaskStatus) {
    try {
      if (status === 'DONE') await tasksApi.complete(task.id);
      else await tasksApi.update(task.id, { status });
      invalidate();
    } catch {
      toast.error('Could not move the task. Please try again.');
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setFormOpen(true);
  }

  if (isLoading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Board</h1>
        <Button onClick={openCreate}>
          <Plus /> New task
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TASK_STATUSES.map((status) => (
          <div key={status}>
            <h2 className="mb-2 flex items-center justify-between text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {TASK_STATUS_LABELS[status]}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {columns.get(status)?.length ?? 0}
              </span>
            </h2>
            <div className="flex flex-col gap-2">
              {(columns.get(status) ?? []).map((task) => (
                <Card key={task.id}>
                  <CardContent className="flex flex-col gap-2 py-3">
                    <button className="text-left font-medium hover:underline" onClick={() => openEdit(task)}>
                      {task.title}
                    </button>
                    <div className="flex items-center justify-between">
                      <PriorityBadge priority={task.priority} />
                      {task.dueDate && <span className="text-xs text-muted-foreground">{task.dueDate}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 border-t pt-2">
                      {TASK_STATUSES.filter((s) => s !== status).map((target) => (
                        <Button key={target} size="sm" variant="ghost" onClick={() => void moveTo(task, target)}>
                          → {TASK_STATUS_LABELS[target]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(columns.get(status) ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nothing here.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={invalidate} />
    </div>
  );
}
