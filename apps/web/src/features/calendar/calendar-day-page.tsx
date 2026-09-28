import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, endOfDay, format, parse, startOfDay } from 'date-fns';
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

export function CalendarDayPage() {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useAnchorDate();
  const anchorDate = parse(anchor, 'yyyy-MM-dd', new Date());
  const dayStart = startOfDay(anchorDate);
  const dayEnd = endOfDay(anchorDate);
  const days = useMemo(() => [anchorDate], [anchorDate]);

  const queryKey = ['calendar', 'events', dayStart.toISOString(), dayEnd.toISOString()];
  const { data: events = [] } = useQuery({
    queryKey,
    queryFn: () => calendarApi.list({ from: dayStart.toISOString(), to: dayEnd.toISOString() }),
  });
  const { data: tasks = [] } = useTasksInRange(dayStart, dayEnd);
  const { data: freeSlots = [] } = useQuery({
    queryKey: ['calendar', 'free-slots', anchor],
    queryFn: () => calendarApi.freeSlots(anchor),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ event, startAt, endAt }: { event: CalendarEvent; startAt: Date; endAt: Date }) =>
      calendarApi.update(event.id, { startAt: startAt.toISOString(), endAt: endAt.toISOString() }),
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

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  }

  function openCreate() {
    setEditing(null);
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
        label={format(anchorDate, 'EEEE, MMMM d, yyyy')}
        anchor={anchor}
        onPrev={() => setAnchor(format(addDays(anchorDate, -1), 'yyyy-MM-dd'))}
        onNext={() => setAnchor(format(addDays(anchorDate, 1), 'yyyy-MM-dd'))}
        onToday={() => setAnchor(new Date().toISOString().slice(0, 10))}
        onJump={setAnchor}
        onNew={openCreate}
      />

      {tasks.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskChip key={task.id} task={task} onClick={() => openTask(task)} />
          ))}
        </div>
      )}

      {freeSlots.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Free slots today</p>
          <div className="flex flex-wrap gap-1.5">
            {freeSlots.map((slot) => (
              <button
                key={slot.startAt}
                className="rounded-full border px-2.5 py-1 text-[11px] hover:bg-muted"
                onClick={openCreate}
              >
                {format(new Date(slot.startAt), 'HH:mm')}–{format(new Date(slot.endAt), 'HH:mm')}
                <span className="ml-1 text-muted-foreground">({slot.durationMinutes}m)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <CalendarTimeGrid
        days={days}
        events={events}
        onEventClick={openEdit}
        onSlotClick={openCreate}
        onEventReschedule={(event, startAt, endAt) => rescheduleMutation.mutate({ event, startAt, endAt })}
      />

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        initialDate={anchor}
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
