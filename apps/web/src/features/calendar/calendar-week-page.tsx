import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addWeeks, eachDayOfInterval, endOfWeek, format, isToday, parse, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';

import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import type { Task } from '@/features/tasks/types';
import { cn } from '@/lib/utils';

import { calendarApi } from './calendar-api';
import { DateNavHeader } from './date-nav-header';
import { CategoryBadge } from './event-badges';
import { EventFormDialog } from './event-form-dialog';
import { TaskChip } from './task-chip';
import type { CalendarEvent } from './types';
import { useAnchorDate } from './use-anchor-date';
import { useTasksInRange } from './use-tasks-in-range';

function eventDate(event: CalendarEvent): Date {
  return event.allDay ? parse(event.startDate!, 'yyyy-MM-dd', new Date()) : new Date(event.startAt!);
}

function eventTimeLabel(event: CalendarEvent): string {
  if (event.allDay) return 'All day';
  return event.startAt ? format(new Date(event.startAt), 'HH:mm') : '';
}

// No hourly grid yet - each day is a chronological list rather than a time-axis layout. A true
// hour-by-hour grid with drag-to-reschedule/resize is a reasonable follow-up once this simpler
// week view is validated (same scoping call as the tasks board skipping drag-and-drop).
export function CalendarWeekPage() {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useAnchorDate();
  const anchorDate = parse(anchor, 'yyyy-MM-dd', new Date());

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(anchorDate, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', 'events', weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () => calendarApi.list({ from: weekStart.toISOString(), to: weekEnd.toISOString() }),
  });
  const { data: tasks = [] } = useTasksInRange(weekStart, weekEnd);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(eventDate(event), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    for (const list of map.values()) {
      list.sort((a, b) => eventTimeLabel(a).localeCompare(eventTimeLabel(b)));
    }
    return map;
  }, [events]);

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

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) ?? [];
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div key={key} className={cn('rounded-md border p-2', isToday(day) && 'border-primary')}>
              <div className="mb-2 flex items-center justify-between text-xs font-medium">
                <span>{format(day, 'EEE d')}</span>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => openCreate(key)}>
                  +
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {dayTasks.map((task) => (
                  <TaskChip key={task.id} task={task} onClick={() => openTask(task)} />
                ))}
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    className="flex flex-col items-start gap-0.5 rounded border p-1.5 text-left text-xs hover:bg-muted"
                    onClick={() => openEdit(event)}
                  >
                    <span className="font-medium">{event.title}</span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{eventTimeLabel(event)}</span>
                      <CategoryBadge category={event.category} />
                    </div>
                  </button>
                ))}
                {dayEvents.length === 0 && dayTasks.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">Nothing scheduled.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
