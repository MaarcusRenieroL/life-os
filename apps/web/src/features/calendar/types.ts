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

/** Mirrors tasks' LifeArea - the same fixed six-category set (see services/calendar's own
 * LifeArea.java, which duplicates services/tasks' rather than sharing it). */
export type LifeArea = 'CAREER' | 'HEALTH' | 'FINANCE' | 'LEARNING' | 'RELATIONSHIPS' | 'PERSONAL';

export const LIFE_AREAS: LifeArea[] = ['CAREER', 'HEALTH', 'FINANCE', 'LEARNING', 'RELATIONSHIPS', 'PERSONAL'];

export const LIFE_AREA_LABELS: Record<LifeArea, string> = {
  CAREER: 'Career',
  HEALTH: 'Health',
  FINANCE: 'Finance',
  LEARNING: 'Learning',
  RELATIONSHIPS: 'Relationships',
  PERSONAL: 'Personal',
};

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
  area: LifeArea | null;
  /** References tasks_schema.projects/goals - see event-form.tsx's use of useProjectsAndGoals
   * (the tasks feature's own hook; calendar has no local copy of these tables). */
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
  area?: LifeArea;
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
  area?: LifeArea | null;
  projectId?: string | null;
  goalId?: string | null;
  sourceTaskId?: string | null;
}

export type UpdateEventRequest = Partial<CreateEventRequest>;
