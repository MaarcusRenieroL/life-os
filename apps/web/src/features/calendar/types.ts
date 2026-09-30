// Mirrors services/calendar's API contract (base path /v1/calendar/events).

export type EventCategory = 'WORK' | 'PERSONAL' | 'FOCUS' | 'GYM' | 'JOB' | 'OTHER';

export const EVENT_CATEGORIES: EventCategory[] = ['WORK', 'PERSONAL', 'FOCUS', 'GYM', 'JOB', 'OTHER'];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  WORK: 'Work',
  PERSONAL: 'Personal',
  FOCUS: 'Focus',
  GYM: 'Gym',
  JOB: 'Job',
  OTHER: 'Other',
};

export type FreeBusy = 'FREE' | 'BUSY';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: EventCategory;
  color: string | null;
  allDay: boolean;
  /** ISO instant, populated when !allDay. */
  startAt: string | null;
  endAt: string | null;
  /** "yyyy-MM-dd", populated when allDay. */
  startDate: string | null;
  endDate: string | null;
  freeBusy: FreeBusy;
  areaId: string | null;
  projectId: string | null;
  goalId: string | null;
  sourceTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventListFilters {
  from?: string;
  to?: string;
  category?: EventCategory;
  areaId?: string;
  projectId?: string;
  goalId?: string;
  q?: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  category?: EventCategory;
  color?: string | null;
  allDay?: boolean;
  startAt?: string | null;
  endAt?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  freeBusy?: FreeBusy;
  areaId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  sourceTaskId?: string | null;
}

export type UpdateEventRequest = Partial<CreateEventRequest>;
