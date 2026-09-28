import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { isOverdue, OverdueBadge, PriorityBadge } from '@/features/tasks/task-badges';
import { tasksApi } from '@/features/tasks/tasks-api';
import type { Task } from '@/features/tasks/types';
import { cn } from '@/lib/utils';

/** Renders a task with a due date as a calendar item, alongside real events - the "task with due
 * date appears in calendar" integration point. Deliberately a thin, visually distinct row (not a
 * full event card) so the calendar's own events stay the primary content; editing/completing a
 * task from here reuses the tasks feature's own form dialog rather than a second copy of it.
 *
 * The checkbox and title are separate controls (not a checkbox nested inside a button) since
 * nested interactive elements are invalid HTML and inconsistent across browsers. */
export function TaskChip({ task, onClick, compact = false }: { task: Task; onClick: () => void; compact?: boolean }) {
  const queryClient = useQueryClient();
  const overdue = isOverdue(task.dueDate, task.status);

  async function toggleDone() {
    try {
      if (task.status === 'DONE') await tasksApi.reopen(task.id);
      else await tasksApi.complete(task.id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Could not update the task. Please try again.');
    }
  }

  if (compact) {
    return (
      <div className="flex w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-muted">
        <input
          type="checkbox"
          checked={task.status === 'DONE'}
          onChange={() => void toggleDone()}
          className="size-3 shrink-0"
          aria-label={task.status === 'DONE' ? 'Mark as not done' : 'Mark as done'}
        />
        <span className={cn('size-1.5 shrink-0 rounded-full', overdue ? 'bg-red-500' : 'bg-amber-500')} />
        <button
          className={cn('truncate text-left', task.status === 'DONE' && 'text-muted-foreground line-through')}
          onClick={onClick}
        >
          {task.title}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded border border-dashed p-1.5 text-xs hover:bg-muted">
      <div className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={task.status === 'DONE'}
          onChange={() => void toggleDone()}
          aria-label={task.status === 'DONE' ? 'Mark as not done' : 'Mark as done'}
        />
        <button
          className={cn('text-left font-medium', task.status === 'DONE' && 'text-muted-foreground line-through')}
          onClick={onClick}
        >
          {task.title}
        </button>
      </div>
      <div className="flex items-center gap-1">
        {overdue && <OverdueBadge />}
        <PriorityBadge priority={task.priority} />
      </div>
    </div>
  );
}
