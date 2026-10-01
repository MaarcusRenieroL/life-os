import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, ExpandedState } from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { calendarApi } from '@/features/calendar/calendar-api';
import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { isOverdue, OverdueBadge, PriorityBadge, RecurringIcon, StatusBadge } from './task-badges';
import { SubtaskRows } from './subtask-rows';
import { TaskFormDialog } from './task-form-dialog';
import { tasksApi } from './tasks-api';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS, type Task, type TaskPriority, type TaskStatus } from './types';

interface Props {
  tasks: Task[];
  isLoading: boolean;
  emptyMessage: string;
  onEdit: (task: Task) => void;
  /** Extra query keys to invalidate alongside ['tasks'] after a mutation - lets a page also
   * refresh a query keyed differently (e.g. the board page's per-status queries). */
  invalidateKeys?: string[][];
}

/** Shared row-rendering + row actions for every tasks page (Today/Upcoming/List/Completed) - each
 * page differs only in which filters it fetches with, not in how a task row behaves.
 *
 * Subtasks (tasks with a parentTaskId) are never shown as their own top-level row here - they
 * only appear nested under their parent when it's expanded (see SubtaskRows), regardless of
 * whether the calling page's own filters would have matched them. */
export function TaskList({ tasks, isLoading, emptyMessage, onEdit, invalidateKeys = [] }: Props) {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [subtaskParent, setSubtaskParent] = useState<Task | null>(null);
  const [subtaskFormOpen, setSubtaskFormOpen] = useState(false);

  const topLevel = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    for (const key of invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }

  async function toggleDone(task: Task) {
    try {
      if (task.status === 'DONE') await tasksApi.reopen(task.id);
      else await tasksApi.complete(task.id);
      invalidate();
    } catch {
      toast.error('Could not update the task. Please try again.');
    }
  }

  async function snoozeToTomorrow(task: Task) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    try {
      await tasksApi.snooze(task.id, tomorrow.toISOString().slice(0, 10));
      toast.success(`Snoozed "${task.title}" to tomorrow`);
      invalidate();
    } catch {
      toast.error('Could not snooze the task. Please try again.');
    }
  }

  async function togglePause(task: Task) {
    try {
      if (task.recurrencePaused) await tasksApi.resumeRecurrence(task.id);
      else await tasksApi.pauseRecurrence(task.id);
      invalidate();
    } catch {
      toast.error('Could not update the recurrence. Please try again.');
    }
  }

  async function skipNext(task: Task) {
    if (!task.dueDate) return;
    try {
      await tasksApi.skipOccurrence(task.id, task.dueDate);
      toast.success(`Skipped "${task.title}" for ${task.dueDate}`);
      invalidate();
    } catch {
      toast.error('Could not skip this occurrence. Please try again.');
    }
  }

  async function duplicate(task: Task) {
    try {
      await tasksApi.duplicate(task.id);
      toast.success(`Duplicated "${task.title}"`);
      invalidate();
    } catch {
      toast.error('Could not duplicate the task. Please try again.');
    }
  }

  // "Convert task to calendar event" - the tasks-side half of the tasks/calendar integration
  // point (the calendar side is TaskChip, which reads tasks with a due date back into its views).
  // Requires a due date since a calendar event needs a day to land on.
  async function scheduleOnCalendar(task: Task) {
    if (!task.dueDate) {
      toast.error('Set a due date before scheduling this task on the calendar.');
      return;
    }
    try {
      await calendarApi.create({
        title: task.title,
        description: task.description,
        allDay: task.allDay,
        startDate: task.allDay ? task.dueDate : undefined,
        endDate: task.allDay ? task.dueDate : undefined,
        startAt: !task.allDay && task.dueTime ? `${task.dueDate}T${task.dueTime}` : undefined,
        endAt:
          !task.allDay && task.dueTime
            ? new Date(new Date(`${task.dueDate}T${task.dueTime}`).getTime() + 60 * 60 * 1000).toISOString()
            : undefined,
        sourceTaskId: task.id,
      });
      toast.success(`Scheduled "${task.title}" on the calendar`);
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    } catch {
      toast.error('Could not schedule the task. Please try again.');
    }
  }

  async function remove(task: Task) {
    const ok = await confirm({ title: `Delete "${task.title}"? This cannot be undone.`, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await tasksApi.delete(task.id);
      toast.success(`Deleted "${task.title}"`);
      invalidate();
    } catch {
      toast.error('Could not delete the task. Please try again.');
    }
  }

  function openAddSubtask(task: Task) {
    setSubtaskParent(task);
    setSubtaskFormOpen(true);
    setExpanded((prev) => ({ ...(prev === true ? {} : prev), [task.id]: true }));
  }

  async function applyBulkPatch(ids: string[], patch: { status?: TaskStatus; priority?: TaskPriority }, clear: () => void) {
    try {
      await tasksApi.bulkUpdate({ ids, patch });
      toast.success(`Updated ${ids.length} task${ids.length === 1 ? '' : 's'}`);
      clear();
      invalidate();
    } catch {
      toast.error('Could not update the selected tasks. Please try again.');
    }
  }

  async function bulkDelete(ids: string[], clear: () => void) {
    const ok = await confirm({
      title: `Delete ${ids.length} task${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await Promise.all(ids.map((id) => tasksApi.delete(id)));
      toast.success(`Deleted ${ids.length} task${ids.length === 1 ? '' : 's'}`);
      clear();
      invalidate();
    } catch {
      toast.error('Could not delete the selected tasks. Please try again.');
    }
  }

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            aria-label="Toggle subtasks"
          >
            {row.getIsExpanded() ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronRight className="size-3.5 text-muted-foreground" />}
          </button>
        ),
      },
      {
        accessorKey: 'title',
        meta: { title: 'Task', filter: { type: 'text' } },
        cell: ({ row }) => {
          const task = row.original;
          return (
            <>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={task.status === 'DONE'}
                  onChange={() => void toggleDone(task)}
                  aria-label={task.status === 'DONE' ? 'Mark as not done' : 'Mark as done'}
                />
                <button
                  className={`font-medium hover:underline ${task.status === 'DONE' ? 'text-muted-foreground line-through' : ''}`}
                  onClick={() => onEdit(task)}
                >
                  {task.title}
                </button>
                {task.recurrencePattern && <RecurringIcon />}
              </div>
              {task.description && <p className="max-w-72 truncate pl-6 text-xs text-muted-foreground">{task.description}</p>}
            </>
          );
        },
      },
      {
        id: 'priority',
        accessorFn: (t) => TASK_PRIORITY_LABELS[t.priority],
        meta: { title: 'Priority', filter: { type: 'select', options: TASK_PRIORITIES.map((p) => ({ value: TASK_PRIORITY_LABELS[p], label: TASK_PRIORITY_LABELS[p] })) } },
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        id: 'status',
        accessorFn: (t) => TASK_STATUS_LABELS[t.status],
        meta: { title: 'Status', filter: { type: 'select', options: TASK_STATUSES.map((st) => ({ value: TASK_STATUS_LABELS[st], label: TASK_STATUS_LABELS[st] })) } },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'dueDate',
        meta: { title: 'Due', filter: { type: 'date' } },
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {row.original.dueDate ?? '—'}
            {isOverdue(row.original.dueDate, row.original.status) && <OverdueBadge />}
          </div>
        ),
      },
      {
        accessorKey: 'dueTime',
        meta: { title: 'Due time', filter: { type: 'text' } },
        cell: ({ row }) => row.original.dueTime ?? '—',
      },
      {
        accessorKey: 'area',
        meta: { title: 'Life area', filter: { type: 'select' } },
        cell: ({ row }) => row.original.area ?? '—',
      },
      {
        id: 'tags',
        accessorFn: (t) => t.tags ?? [],
        meta: { title: 'Tags', filter: { type: 'select' }, exportValue: (t) => (t.tags ?? []).join('; ') },
        cell: ({ row }) => (row.original.tags?.length ? row.original.tags.join(', ') : '—'),
      },
      {
        accessorKey: 'estimateMinutes',
        meta: { title: 'Estimate (min)', align: 'right', aggregate: 'sum', filter: { type: 'number' } },
        cell: ({ row }) => row.original.estimateMinutes ?? '—',
      },
      {
        id: 'recurring',
        accessorFn: (t) => !!t.recurrencePattern,
        meta: { title: 'Recurring', filter: { type: 'boolean' }, exportValue: (t) => (t.recurrencePattern ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.recurrencePattern ? 'Yes' : '—'),
      },
      {
        accessorKey: 'completedAt',
        meta: { title: 'Completed', filter: { type: 'date' } },
        cell: ({ row }) => row.original.completedAt?.slice(0, 10) ?? '—',
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <div className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => openAddSubtask(task)}>+ Subtask</Button>
              <Button size="sm" variant="ghost" onClick={() => void snoozeToTomorrow(task)}>Snooze</Button>
              {task.recurrencePattern && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => void skipNext(task)}>Skip</Button>
                  <Button size="sm" variant="ghost" onClick={() => void togglePause(task)}>{task.recurrencePaused ? 'Resume' : 'Pause'}</Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => void duplicate(task)}>Duplicate</Button>
              <Button size="sm" variant="ghost" onClick={() => void scheduleOnCalendar(task)}>Schedule</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(task)}>Delete</Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onEdit],
  );

  if (isLoading) {
    return (
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (topLevel.length === 0) {
    return <p className="mt-6 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <>
      <DataGrid
        tableId="tasks.list"
        data={topLevel}
        columns={columns}
        getRowId={(t) => t.id}
        enableSelection
        initialVisibility={{ dueTime: false, area: false, tags: false, estimateMinutes: false, recurring: false, completedAt: false }}
        exportName="tasks"
        searchPlaceholder="Search tasks…"
        expanded={expanded}
        onExpandedChange={setExpanded}
        renderExpanded={(task) => <SubtaskRows parentId={task.id} onEdit={onEdit} />}
        bulkActions={(selectedTasks, clear) => {
          const ids = selectedTasks.map((t) => t.id);
          return (
            <>
              <Select value="" onValueChange={(v) => void applyBulkPatch(ids, { status: v as TaskStatus }, clear)}>
                <SelectTrigger className="min-w-36"><SelectValue placeholder="Set status" /></SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>{TASK_STATUS_LABELS[st]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value="" onValueChange={(v) => void applyBulkPatch(ids, { priority: v as TaskPriority }, clear)}>
                <SelectTrigger className="min-w-36"><SelectValue placeholder="Set priority" /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void bulkDelete(ids, clear)}>
                Delete selected
              </Button>
            </>
          );
        }}
      />
      {dialog}
      <TaskFormDialog
        open={subtaskFormOpen}
        onOpenChange={setSubtaskFormOpen}
        editing={null}
        parentTaskId={subtaskParent?.id ?? null}
        onSaved={() => {
          invalidate();
          if (subtaskParent) queryClient.invalidateQueries({ queryKey: ['tasks', 'subtasks', subtaskParent.id] });
        }}
      />
    </>
  );
}
