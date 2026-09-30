import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addWeeks, eachDayOfInterval, endOfWeek, format, parse, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import type { Task } from '@/features/tasks/types';

import { calendarApi } from './calendar-api';
import { CalendarTimeGrid } from './calendar-time-grid';
import { DateNavHeader } from './date-nav-header';
import { EventFormDialog } from './event-form-dialog';
import { TaskChip } from './task-chip';
import type { CalendarEvent } from './types';
import { useAnchorDate } from './use-anchor-date';
import { useTasksInRange } from './use-tasks-in-range';

export function CalendarWeekPage() {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useAnchorDate();
  const anchorDate = parse(anchor, 'yyyy-MM-dd', new Date());

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const queryKey = ['calendar', 'events', weekStart.toISOString(), weekEnd.toISOString()];
  const { data: events = [] } = useQuery({
    queryKey,
    queryFn: () => calendarApi.list({ from: weekStart.toISOString(), to: weekEnd.toISOString() }),
  });
  const { data: tasks = [] } = useTasksInRange(weekStart, weekEnd);

  const rescheduleMutation = useMutation({
    mutationFn: ({ event, startAt, endAt }: { event: CalendarEvent; startAt: Date; endAt: Date }) =>
      calendarApi.update(event.id, { startAt: startAt.toISOString(), endAt: endAt.toISOString() }),
    // Optimistic update so the box doesn't snap back to its pre-drag position while the request
    // is in flight - same "smooth drag" expectation as any other calendar UI.
    onMutate: async ({ event, startAt, endAt }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CalendarEvent[]>(queryKey);
      queryClient.setQueryData<CalendarEvent[]>(queryKey, (current) =>
        current?.map((e) => (e.id === event.id ? { ...e, startAt: startAt.toISOString(), endAt: endAt.toISOString() } : e)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error('Failed to reschedule event');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      if (!map.has(task.dueDate)) map.set(task.dueDate, []);
      map.get(task.dueDate)!.push(task);
    }
    return map;
  }, [tasks]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [newEventDate, setNewEventDate] = useState<string>(anchor);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  }

  function openCreate(date: string) {
    setEditing(null);
    setNewEventDate(date);
    setFormOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    setFormOpen(true);
  }

  function openTask(task: Task) {
    setEditingTask(task);
    setTaskFormOpen(true);
  }

  return (
    <div>
      <DateNavHeader
        label={`${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`}
        anchor={anchor}
        onPrev={() => setAnchor(format(addWeeks(anchorDate, -1), 'yyyy-MM-dd'))}
        onNext={() => setAnchor(format(addWeeks(anchorDate, 1), 'yyyy-MM-dd'))}
        onToday={() => setAnchor(new Date().toISOString().slice(0, 10))}
        onJump={setAnchor}
        onNew={() => openCreate(anchor)}
      />

      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>{format(day, 'EEE d')}</span>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => openCreate(key)}>
                  +
                </button>
              </div>
              {dayTasks.map((task) => (
                <TaskChip key={task.id} task={task} onClick={() => openTask(task)} />
              ))}
            </div>
          );
        })}
      </div>

      <CalendarTimeGrid
        days={days}
        events={events}
        onEventClick={openEdit}
        onSlotClick={(day) => openCreate(format(day, 'yyyy-MM-dd'))}
        onEventReschedule={(event, startAt, endAt) => rescheduleMutation.mutate({ event, startAt, endAt })}
      />

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        initialDate={newEventDate}
        onSaved={invalidate}
      />
      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        editing={editingTask}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
      />
    </div>
  );
}
