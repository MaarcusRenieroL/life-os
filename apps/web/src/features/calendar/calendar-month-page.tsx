import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TaskFormDialog } from '@/features/tasks/task-form-dialog';
import type { Task } from '@/features/tasks/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { calendarApi } from './calendar-api';
import { DateNavHeader } from './date-nav-header';
import { CATEGORY_DOT_CLASSES, RecurringIcon } from './event-badges';
import { EventFormDialog } from './event-form-dialog';
import { downloadEventsIcs } from './ics-export';
import { TaskChip } from './task-chip';
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type CalendarEvent, type EventCategory } from './types';
import { useAnchorDate } from './use-anchor-date';
import { useTasksInRange } from './use-tasks-in-range';

type CategoryFilter = 'ALL' | EventCategory;

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function eventDate(event: CalendarEvent): Date {
  return event.allDay ? parse(event.startDate!, 'yyyy-MM-dd', new Date()) : new Date(event.startAt!);
}

export function CalendarMonthPage() {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useAnchorDate();
  const anchorDate = parse(anchor, 'yyyy-MM-dd', new Date());

  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [hideAllDay, setHideAllDay] = useState(false);
  const [hideWeekends, setHideWeekends] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', 'events', gridStart.toISOString(), gridEnd.toISOString(), categoryFilter],
    queryFn: () =>
      calendarApi.list({
        from: gridStart.toISOString(),
        to: gridEnd.toISOString(),
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
      }),
  });
  const { data: tasks = [] } = useTasksInRange(gridStart, gridEnd);

  const visibleDays = useMemo(() => (hideWeekends ? days.filter((d) => !isWeekend(d)) : days), [days, hideWeekends]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      if (hideAllDay && event.allDay) continue;
      const key = format(eventDate(event), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events, hideAllDay]);

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
        label={format(anchorDate, 'MMMM yyyy')}
        anchor={anchor}
        onPrev={() => setAnchor(format(addMonths(anchorDate, -1), 'yyyy-MM-dd'))}
        onNext={() => setAnchor(format(addMonths(anchorDate, 1), 'yyyy-MM-dd'))}
        onToday={() => setAnchor(new Date().toISOString().slice(0, 10))}
        onJump={setAnchor}
        onNew={() => openCreate(anchor)}
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
          <SelectTrigger className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {EVENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {EVENT_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={hideAllDay ? 'secondary' : 'outline'} onClick={() => setHideAllDay((v) => !v)}>
          Hide all-day
        </Button>
        <Button variant={hideWeekends ? 'secondary' : 'outline'} onClick={() => setHideWeekends((v) => !v)}>
          Hide weekends
        </Button>
        <Button variant="outline" className="ml-auto" onClick={() => downloadEventsIcs(events)}>
          <Download /> Export .ics
        </Button>
      </div>

      <div
        className={cn(
          'mt-4 grid gap-px overflow-hidden rounded-md border bg-border text-xs',
          hideWeekends ? 'grid-cols-5' : 'grid-cols-7',
        )}
      >
        {(hideWeekends ? WEEKDAY_LABELS.slice(0, 5) : WEEKDAY_LABELS).map((label) => (
          <div key={label} className="bg-muted px-2 py-1 text-center font-medium text-muted-foreground">
            {label}
          </div>
        ))}
        {visibleDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(key) ?? [];
          const dayTasks = tasksByDay.get(key) ?? [];
          const shownTasks = Math.min(dayTasks.length, 2);
          const shownEvents = Math.min(dayEvents.length, 3);
          const overflow = dayEvents.length + dayTasks.length - shownTasks - shownEvents;
          return (
            <div
              key={key}
              className={cn(
                'flex min-h-24 flex-col gap-1 bg-background p-1.5',
                !isSameMonth(day, anchorDate) && 'opacity-40',
              )}
              onDoubleClick={() => openCreate(key)}
            >
              <span className={cn('self-end text-[11px]', isToday(day) && 'font-bold text-primary')}>
                {format(day, 'd')}
              </span>
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 2).map((task) => (
                  <TaskChip key={task.id} task={task} onClick={() => openTask(task)} compact />
                ))}
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left hover:bg-muted"
                    onClick={() => openEdit(event)}
                  >
                    <span className={cn('size-1.5 shrink-0 rounded-full', CATEGORY_DOT_CLASSES[event.category])} />
                    <span className="truncate">{event.title}</span>
                    {event.recurrencePattern && <RecurringIcon />}
                  </button>
                ))}
                {overflow > 0 && <span className="text-[10px] text-muted-foreground">+{overflow} more</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Double-click a day to add an event.</p>

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
