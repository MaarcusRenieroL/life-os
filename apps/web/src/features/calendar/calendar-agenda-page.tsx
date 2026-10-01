import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parse } from 'date-fns';
import { useMemo, useState } from 'react';

import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import type { Task } from '@/features/tasks/types';

import { CategoryBadge } from './event-badges';
import { calendarApi } from './calendar-api';
import { EventFormDialog } from './event-form-dialog';
import { TaskChip } from './task-chip';
import type { CalendarEvent } from './types';
import { useTasksInRange } from './use-tasks-in-range';

function eventDate(event: CalendarEvent): Date {
  return event.allDay ? parse(event.startDate!, 'yyyy-MM-dd', new Date()) : new Date(event.startAt!);
}

function eventTimeLabel(event: CalendarEvent): string {
  return event.allDay ? 'All day' : event.startAt ? format(new Date(event.startAt), 'HH:mm') : '';
}

const WINDOW_DAYS = 14;

export function CalendarAgendaPage() {
  const queryClient = useQueryClient();
  const from = new Date();
  const to = addDays(from, WINDOW_DAYS);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar', 'events', 'agenda', from.toISOString().slice(0, 10)],
    queryFn: () => calendarApi.list({ from: from.toISOString(), to: to.toISOString() }),
  });
  const { data: tasks = [] } = useTasksInRange(from, to);

  const grouped = useMemo(() => {
    const eventsByDay = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(eventDate(event), 'yyyy-MM-dd');
      if (!eventsByDay.has(key)) eventsByDay.set(key, []);
      eventsByDay.get(key)!.push(event);
    }
    const tasksByDay = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      if (!tasksByDay.has(task.dueDate)) tasksByDay.set(task.dueDate, []);
      tasksByDay.get(task.dueDate)!.push(task);
    }
    const allDays = new Set([...eventsByDay.keys(), ...tasksByDay.keys()]);
    return Array.from(allDays)
      .sort()
      .map((day) => ({
        day,
        events: eventsByDay.get(day) ?? [],
        tasks: tasksByDay.get(day) ?? [],
      }));
  }, [events, tasks]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
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
      <h1 className="text-2xl font-semibold tracking-tight">Agenda (next {WINDOW_DAYS} days)</h1>

      <div className="mt-4 flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing coming up.</p>
        ) : (
          grouped.map(({ day, events: dayEvents, tasks: dayTasks }) => (
            <div key={day}>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {format(parse(day, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d')}
              </h2>
              <div className="flex flex-col gap-2">
                {dayTasks.map((task) => (
                  <TaskChip key={task.id} task={task} onClick={() => openTask(task)} />
                ))}
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    className="flex items-center justify-between rounded-md border p-3 text-left hover:bg-muted"
                    onClick={() => openEdit(event)}
                  >
                    <div>
                      <p className="font-medium">{event.title}</p>
                      {event.location && <p className="text-xs text-muted-foreground">{event.location}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{eventTimeLabel(event)}</span>
                      <CategoryBadge category={event.category} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={invalidate} />
      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        editing={editingTask}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
      />
    </div>
  );
}
