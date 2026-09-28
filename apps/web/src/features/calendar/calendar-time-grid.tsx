import { addMinutes, differenceInMinutes, format } from 'date-fns';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { CategoryBadge } from './event-badges';
import type { CalendarEvent } from './types';

const HOUR_HEIGHT_PX = 48;
const HOURS = 24;
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;
const SCROLL_TO_HOUR = 7;
// A day column narrower than this reads as an unusable sliver on a phone - a 7-day week view
// scrolls horizontally below this width instead of shrinking columns further. Exported so the
// week page can size its own day-header row's columns identically - see this component's root
// div javadoc-style comment below for why that row lives outside this component.
export const MIN_COLUMN_PX = 72;

interface TimedEvent extends CalendarEvent {
  startAt: string;
  endAt: string;
}

function isTimed(event: CalendarEvent): event is TimedEvent {
  return !event.allDay && event.startAt != null && event.endAt != null;
}

function minutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

// Drag is scoped to vertical movement within a single day column (reschedule the time, not the
// day) - same scoping call as the week page's own "no hourly grid yet" comment this component
// replaces. Cross-day drag would need to track which column the pointer is over and is a
// reasonable follow-up once this is validated.
interface DragState {
  eventId: string;
  dayKey: string;
  mode: 'move' | 'resize-start' | 'resize-end';
  originalStart: Date;
  originalEnd: Date;
  pointerStartY: number;
  previewStart: Date;
  previewEnd: Date;
  moved: boolean;
}

export interface CalendarTimeGridProps {
  days: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (day: Date, hour: number) => void;
  onEventReschedule: (event: CalendarEvent, startAt: Date, endAt: Date) => void;
}

export function CalendarTimeGrid({ days, events, onEventClick, onSlotClick, onEventReschedule }: CalendarTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * HOUR_HEIGHT_PX });
  }, []);

  const timedByDay = useMemo(() => {
    const map = new Map<string, TimedEvent[]>();
    for (const event of events) {
      if (!isTimed(event)) continue;
      const key = format(new Date(event.startAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const allDayEvents = useMemo(() => events.filter((e) => e.allDay), [events]);

  function startDrag(pointerDown: React.PointerEvent, event: TimedEvent, mode: DragState['mode'], dayKey: string) {
    pointerDown.stopPropagation();
    const originalStart = new Date(event.startAt);
    const originalEnd = new Date(event.endAt);

    setDrag({
      eventId: event.id,
      dayKey,
      mode,
      originalStart,
      originalEnd,
      pointerStartY: pointerDown.clientY,
      previewStart: originalStart,
      previewEnd: originalEnd,
      moved: false,
    });

    function onMove(moveEvent: PointerEvent) {
      setDrag((current) => {
        if (!current) return current;
        const deltaMinutes = snapMinutes(Math.round(((moveEvent.clientY - current.pointerStartY) / HOUR_HEIGHT_PX) * 60));
        if (deltaMinutes === 0) return { ...current, moved: current.moved };

        let previewStart = current.originalStart;
        let previewEnd = current.originalEnd;

        if (current.mode === 'move') {
          previewStart = addMinutes(current.originalStart, deltaMinutes);
          previewEnd = addMinutes(current.originalEnd, deltaMinutes);
        } else if (current.mode === 'resize-start') {
          previewStart = addMinutes(current.originalStart, deltaMinutes);
          if (differenceInMinutes(current.originalEnd, previewStart) < MIN_DURATION_MINUTES) {
            previewStart = addMinutes(current.originalEnd, -MIN_DURATION_MINUTES);
          }
        } else {
          previewEnd = addMinutes(current.originalEnd, deltaMinutes);
          if (differenceInMinutes(previewEnd, current.originalStart) < MIN_DURATION_MINUTES) {
            previewEnd = addMinutes(current.originalStart, MIN_DURATION_MINUTES);
          }
        }

        return { ...current, previewStart, previewEnd, moved: true };
      });
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag((current) => {
        if (current?.moved) onEventReschedule(event, current.previewStart, current.previewEnd);
        return null;
      });
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Each day column has a floor of MIN_COLUMN_PX so a 7-day week view stays readable/tappable on
  // a phone instead of squeezing every column down to nothing. This component does NOT own the
  // horizontal scroll itself - the week page has its own day-header row above this grid that
  // needs to scroll in lockstep with it, so the week page wraps both together in one shared
  // overflow-x-auto container using this same minWidth formula (see calendar-week-page.tsx). The
  // day page, which has no such header row, wraps just this component the same way for
  // consistency even though a single day's minWidth never actually overflows a real viewport.
  const minGridWidth = `calc(4rem + ${days.length} * ${MIN_COLUMN_PX}px)`;

  return (
    <div className="rounded-md border" style={{ minWidth: minGridWidth }}>
      {allDayEvents.length > 0 && (
        <div className="grid border-b" style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(${MIN_COLUMN_PX}px, 1fr))` }}>
          <div />
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayAllDay = allDayEvents.filter((e) => e.startDate === key);
            return (
              <div key={key} className="flex flex-col gap-1 border-l p-1">
                {dayAllDay.map((event) => (
                  <button
                    key={event.id}
                    className="truncate rounded bg-muted px-1.5 py-0.5 text-left text-[10px] font-medium hover:bg-muted/80"
                    onClick={() => onEventClick(event)}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div ref={scrollRef} className="max-h-[65vh] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(${MIN_COLUMN_PX}px, 1fr))` }}>
          <div>
            {Array.from({ length: HOURS }).map((_, hour) => (
              <div key={hour} className="relative border-b" style={{ height: HOUR_HEIGHT_PX }}>
                <span className="absolute -top-2 right-1 text-[10px] text-muted-foreground">
                  {format(new Date(2000, 0, 1, hour), 'HH:mm')}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEvents = timedByDay.get(key) ?? [];
            return (
              <div key={key} className="relative border-l" style={{ height: HOUR_HEIGHT_PX * HOURS }}>
                {Array.from({ length: HOURS }).map((_, hour) => (
                  <div
                    key={hour}
                    className="border-b hover:bg-muted/40"
                    style={{ height: HOUR_HEIGHT_PX }}
                    onClick={() => onSlotClick(day, hour)}
                  />
                ))}

                {dayEvents.map((event) => {
                  const isDragging = drag?.eventId === event.id && drag.dayKey === key;
                  const start = isDragging ? drag.previewStart : new Date(event.startAt);
                  const end = isDragging ? drag.previewEnd : new Date(event.endAt);
                  const top = (minutesFromMidnight(start) / 60) * HOUR_HEIGHT_PX;
                  const height = Math.max((differenceInMinutes(end, start) / 60) * HOUR_HEIGHT_PX, 18);

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'absolute right-0.5 left-0.5 flex flex-col overflow-hidden rounded border bg-card px-1.5 py-1 text-left text-[10px] shadow-sm',
                        isDragging && 'z-10 opacity-90 ring-2 ring-primary',
                      )}
                      style={{ top, height }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize touch-none"
                        onPointerDown={(e) => startDrag(e, event, 'resize-start', key)}
                      />
                      <button
                        className="flex-1 cursor-grab touch-none overflow-hidden text-left active:cursor-grabbing"
                        onPointerDown={(e) => startDrag(e, event, 'move', key)}
                        onClick={() => {
                          if (drag) return;
                          onEventClick(event);
                        }}
                      >
                        <span className="block truncate font-medium">{event.title}</span>
                        <span className="block truncate text-muted-foreground">
                          {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                        </span>
                        <CategoryBadge category={event.category} />
                      </button>
                      <div
                        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize touch-none"
                        onPointerDown={(e) => startDrag(e, event, 'resize-end', key)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
