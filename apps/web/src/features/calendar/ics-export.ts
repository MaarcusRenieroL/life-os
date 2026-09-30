import type { CalendarEvent } from './types';

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** yyyyMMdd, for an all-day VEVENT's DTSTART/DTEND (DTEND is exclusive per RFC 5545, so callers
 * pass the day *after* the last all-day date). */
function toIcsDate(isoDate: string): string {
  return isoDate.replaceAll('-', '');
}

/** yyyyMMddTHHmmssZ, for a timed VEVENT's DTSTART/DTEND. */
function toIcsDateTime(isoInstant: string): string {
  return new Date(isoInstant).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function eventToVEvent(event: CalendarEvent): string {
  const lines = ['BEGIN:VEVENT', `UID:${event.id}@lifeos`, `SUMMARY:${escapeIcsText(event.title)}`];

  if (event.allDay && event.startDate) {
    const endExclusive = new Date(event.endDate ?? event.startDate);
    endExclusive.setDate(endExclusive.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(endExclusive.toISOString().slice(0, 10))}`);
  } else if (event.startAt) {
    lines.push(`DTSTART:${toIcsDateTime(event.startAt)}`);
    lines.push(`DTEND:${toIcsDateTime(event.endAt ?? event.startAt)}`);
  }

  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

export function eventsToIcs(events: CalendarEvent[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Life OS//Calendar//EN',
    'CALSCALE:GREGORIAN',
    ...events.map(eventToVEvent),
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadEventsIcs(events: CalendarEvent[], filename = 'calendar-export.ics') {
  const blob = new Blob([eventsToIcs(events)], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
