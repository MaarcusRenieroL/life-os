import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { calendarApi } from '@/features/calendar/calendar-api';
import { useConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [subtaskParent, setSubtaskParent] = useState<Task | null>(null);
  const [subtaskFormOpen, setSubtaskFormOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<TaskStatus | ''>('');
  const [bulkPriority, setBulkPriority] = useState<TaskPriority | ''>('');

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

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddSubtask(task: Task) {
    setSubtaskParent(task);
    setSubtaskFormOpen(true);
    setExpanded((prev) => new Set(prev).add(task.id));
  }

  async function applyBulkPatch(patch: { status?: TaskStatus; priority?: TaskPriority }) {
    try {
      await tasksApi.bulkUpdate({ ids: Array.from(selected), patch });
      toast.success(`Updated ${selected.size} task${selected.size === 1 ? '' : 's'}`);
      setSelected(new Set());
      setBulkStatus('');
      setBulkPriority('');
      invalidate();
    } catch {
      toast.error('Could not update the selected tasks. Please try again.');
    }
  }

  async function bulkDelete() {
    const ok = await confirm({
      title: `Delete ${selected.size} task${selected.size === 1 ? '' : 's'}? This cannot be undone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await Promise.all(Array.from(selected).map((id) => tasksApi.delete(id)));
      toast.success(`Deleted ${selected.size} task${selected.size === 1 ? '' : 's'}`);
      setSelected(new Set());
      invalidate();
    } catch {
      toast.error('Could not delete the selected tasks. Please try again.');
    }
  }

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
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 p-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Select value={bulkStatus} onValueChange={(v) => applyBulkPatch({ status: v as TaskStatus })}>
            <SelectTrigger className="min-w-36">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bulkPriority} onValueChange={(v) => applyBulkPatch({ priority: v as TaskPriority })}>
            <SelectTrigger className="min-w-36">
              <SelectValue placeholder="Set priority" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void bulkDelete()}>
            Delete selected
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topLevel.map((task) => (
            <Fragment key={task.id}>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleExpanded(task.id)} aria-label="Toggle subtasks">
                      {expanded.has(task.id) ? (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <input
                      type="checkbox"
                      checked={selected.has(task.id)}
                      onChange={() => toggleSelected(task.id)}
                      aria-label="Select task"
                    />
                  </div>
                </TableCell>
                <TableCell>
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
                  {task.description && (
                    <p className="max-w-72 truncate pl-6 text-xs text-muted-foreground">{task.description}</p>
                  )}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={task.priority} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={task.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {task.dueDate ?? '—'}
                    {isOverdue(task.dueDate, task.status) && <OverdueBadge />}
                  </div>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(task)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openAddSubtask(task)}>
                    + Subtask
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void snoozeToTomorrow(task)}>
                    Snooze
                  </Button>
                  {task.recurrencePattern && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => void skipNext(task)}>
                        Skip
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void togglePause(task)}>
                        {task.recurrencePaused ? 'Resume' : 'Pause'}
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void duplicate(task)}>
                    Duplicate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void scheduleOnCalendar(task)}>
                    Schedule
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(task)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
              {expanded.has(task.id) && <SubtaskRows parentId={task.id} onEdit={onEdit} />}
            </Fragment>
          ))}
        </TableBody>
      </Table>
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
