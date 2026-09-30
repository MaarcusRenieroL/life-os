import { api, unwrap } from '@/lib/api-client';

import type { CalendarEvent, CreateEventRequest, EventListFilters, UpdateEventRequest } from './types';

const baseUrl = '/v1/calendar/events';

export const calendarApi = {
  list(filters: EventListFilters = {}): Promise<CalendarEvent[]> {
    return unwrap(api.get(baseUrl, { params: filters }));
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
};
