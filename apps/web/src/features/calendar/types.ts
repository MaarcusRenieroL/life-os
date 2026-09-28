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

export type EventRecurrencePattern = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export const EVENT_RECURRENCE_PATTERNS: EventRecurrencePattern[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];

export const EVENT_RECURRENCE_PATTERN_LABELS: Record<EventRecurrencePattern, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom interval',
};

/** Day-of-week codes for the UI only, matching tasks' own DAYS_OF_WEEK - the API uses ISO
 * day-of-week integers (1=Monday..7=Sunday) for recurrenceConfig.daysOfWeek. */
export const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAY_CODE_TO_ISO: Record<DayOfWeek, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

export const ISO_TO_DAY_CODE: Record<number, DayOfWeek> = Object.fromEntries(
  DAYS_OF_WEEK.map((day) => [DAY_CODE_TO_ISO[day], day]),
) as Record<number, DayOfWeek>;

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
  /** Set on a recurring "definition" event - null on both one-off events and generated
   * occurrences. */
  recurrencePattern: EventRecurrencePattern | null;
  recurrenceConfig: Record<string, unknown> | null;
  recurrenceEndDate: string | null;
  recurrencePaused: boolean;
  recurrenceSkippedDates: string[] | null;
  /** Set only on a generated occurrence, pointing back at the definition event. */
  recurringParentId: string | null;
  /** Each entry is "minutes before startAt" to fire a reminder - only meaningful for a timed
   * event (see services/calendar's EventReminderScheduler). */
  reminderMinutesBefore: number[] | null;
  remindersSent: number[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors tasks' REMINDER_PRESETS. */
export const REMINDER_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'At time' },
  { minutes: 15, label: '15 min before' },
  { minutes: 30, label: '30 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
];

export interface FreeSlot {
  startAt: string;
  endAt: string;
  durationMinutes: number;
}

export interface SetEventRecurrenceRequest {
  pattern: EventRecurrencePattern;
  config?: Record<string, unknown>;
  endDate?: string | null;
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
  reminderMinutesBefore?: number[];
}

export type UpdateEventRequest = Partial<CreateEventRequest>;
