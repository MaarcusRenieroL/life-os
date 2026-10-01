import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';

import { PriorityBadge, StatusBadge } from './task-badges';
import { tasksApi } from './tasks-api';
import type { Task } from './types';

interface Props {
  parentId: string;
  onEdit: (task: Task) => void;
}

/** Fetches and renders a parent task's subtasks inline, indented under its row - shown only while
 * that row is expanded (see the chevron toggle in TaskList). Independent of whatever filters the
 * parent page applied to its own top-level list, since a subtask's own due date/status may not
 * match those filters. */
export function SubtaskRows({ parentId, onEdit }: Props) {
  const queryClient = useQueryClient();
  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ['tasks', 'subtasks', parentId],
    queryFn: () => tasksApi.subtasks(parentId),
  });

  async function toggleDone(task: Task) {
    try {
      if (task.status === 'DONE') await tasksApi.reopen(task.id);
      else await tasksApi.complete(task.id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Could not update the subtask. Please try again.');
    }
  }

  async function remove(task: Task) {
    try {
      await tasksApi.delete(task.id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch {
      toast.error('Could not delete the subtask. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <TableRow>
        <TableCell />
        <TableCell colSpan={5} className="text-xs text-muted-foreground">
          Loading subtasks…
        </TableCell>
      </TableRow>
    );
  }

  if (subtasks.length === 0) {
    return (
      <TableRow>
        <TableCell />
        <TableCell colSpan={5} className="text-xs text-muted-foreground">
          No subtasks yet.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {subtasks.map((subtask) => (
        <TableRow key={subtask.id} className="bg-muted/30">
          <TableCell>
            <input
              type="checkbox"
              checked={subtask.status === 'DONE'}
              onChange={() => void toggleDone(subtask)}
              aria-label={subtask.status === 'DONE' ? 'Mark as not done' : 'Mark as done'}
            />
          </TableCell>
          <TableCell className="pl-6">
            <button
              className={`text-sm hover:underline ${subtask.status === 'DONE' ? 'text-muted-foreground line-through' : ''}`}
              onClick={() => onEdit(subtask)}
            >
              {subtask.title}
            </button>
          </TableCell>
          <TableCell>
            <PriorityBadge priority={subtask.priority} />
          </TableCell>
          <TableCell>
            <StatusBadge status={subtask.status} />
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">{subtask.dueDate ?? '—'}</TableCell>
          <TableCell className="text-right">
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(subtask)}>
              Delete
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
