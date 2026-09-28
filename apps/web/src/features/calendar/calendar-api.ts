import { api, unwrap } from '@/lib/api-client';

import type { CalendarEvent, CreateEventRequest, EventListFilters, FreeSlot, SetEventRecurrenceRequest, UpdateEventRequest } from './types';

const baseUrl = '/v1/calendar/events';

export const calendarApi = {
  list(filters: EventListFilters = {}): Promise<CalendarEvent[]> {
    return unwrap(api.get(baseUrl, { params: filters }));
  },

  freeSlots(
    date: string,
    params: { minDurationMinutes?: number; dayStartHour?: number; dayEndHour?: number } = {},
  ): Promise<FreeSlot[]> {
    return unwrap(api.get(`${baseUrl}/free-slots`, { params: { date, ...params } }));
  },

  get(id: string): Promise<CalendarEvent> {
    return unwrap(api.get(`${baseUrl}/${id}`));
  },

  create(request: CreateEventRequest): Promise<CalendarEvent> {
    return unwrap(api.post(baseUrl, request));
  },

  update(id: string, request: UpdateEventRequest): Promise<CalendarEvent> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },

  duplicate(id: string): Promise<CalendarEvent> {
    return unwrap(api.post(`${baseUrl}/${id}/duplicate`, {}));
  },

  occurrences(id: string): Promise<CalendarEvent[]> {
    return unwrap(api.get(`${baseUrl}/${id}/occurrences`));
  },

  setRecurrence(id: string, request: SetEventRecurrenceRequest): Promise<CalendarEvent> {
    return unwrap(api.post(`${baseUrl}/${id}/recurrence`, request));
  },

  async stopRecurrence(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}/recurrence`);
  },

  pauseRecurrence(id: string): Promise<CalendarEvent> {
    return unwrap(api.post(`${baseUrl}/${id}/recurrence/pause`, {}));
  },

  resumeRecurrence(id: string): Promise<CalendarEvent> {
    return unwrap(api.post(`${baseUrl}/${id}/recurrence/resume`, {}));
  },

  async skipOccurrence(id: string, occurrenceDate: string): Promise<void> {
    await api.post(`${baseUrl}/${id}/recurrence/skip`, { occurrenceDate });
  },
};
