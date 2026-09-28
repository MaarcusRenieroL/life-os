import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, endOfDay, format, parse, startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';

import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import type { Task } from '@/features/tasks/types';

import { CategoryBadge } from './event-badges';
import { calendarApi } from './calendar-api';
import { DateNavHeader } from './date-nav-header';
import { EventFormDialog } from './event-form-dialog';
import { TaskChip } from './task-chip';
import type { CalendarEvent } from './types';
import { useAnchorDate } from './use-anchor-date';
import { useTasksInRange } from './use-tasks-in-range';

function eventTimeLabel(event: CalendarEvent): string {
  if (event.allDay) return 'All day';
  const start = event.startAt ? format(new Date(event.startAt), 'HH:mm') : '';
  const end = event.endAt ? format(new Date(event.endAt), 'HH:mm') : '';
  return end ? `${start} – ${end}` : start;
}

export function CalendarDayPage() {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useAnchorDate();
  const anchorDate = parse(anchor, 'yyyy-MM-dd', new Date());
  const dayStart = startOfDay(anchorDate);
  const dayEnd = endOfDay(anchorDate);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar', 'events', dayStart.toISOString(), dayEnd.toISOString()],
    queryFn: () => calendarApi.list({ from: dayStart.toISOString(), to: dayEnd.toISOString() }),
  });
  const { data: tasks = [] } = useTasksInRange(dayStart, dayEnd);

  const sorted = useMemo(
    () => [...events].sort((a, b) => Number(b.allDay) - Number(a.allDay) || eventTimeLabel(a).localeCompare(eventTimeLabel(b))),
    [events],
  );

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

      <div className="mt-4 flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskChip key={task.id} task={task} onClick={() => openTask(task)} />
        ))}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sorted.length === 0 && tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
        ) : (
          sorted.map((event) => (
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
          ))
        )}
      </div>

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
