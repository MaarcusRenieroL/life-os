// Mirrors services/tasks' API contract (base path /v1/tasks).

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export const TASK_PRIORITIES: TaskPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

/** Server-side list-shaping presets - see TaskView on the backend. PLAIN (the default when
 * omitted) applies no view-specific date/inbox shaping, just the explicit filters alongside it. */
export type TaskViewName = 'PLAIN' | 'TODAY' | 'UPCOMING' | 'OVERDUE' | 'INBOX' | 'COMPLETED';

/** The fixed six life categories from the product spec - a closed set, not a user-managed lookup
 * like Project/Goal (see ./projects-goals-api.ts for those). */
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

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  createdAt: string;
}

export type TaskRecurrencePattern = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export const TASK_RECURRENCE_PATTERNS: TaskRecurrencePattern[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];

export const TASK_RECURRENCE_PATTERN_LABELS: Record<TaskRecurrencePattern, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  CUSTOM: 'Custom interval',
};

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  allDay: boolean;
  area: LifeArea | null;
  projectId: string | null;
  goalId: string | null;
  parentTaskId: string | null;
  tags: string[] | null;
  estimateMinutes: number | null;
  completedAt: string | null;
  /** Set on a recurring "definition" task (see services/tasks' Task.java javadoc) - null on both
   * one-off tasks and on generated occurrences. */
  recurrencePattern: TaskRecurrencePattern | null;
  recurrenceConfig: Record<string, unknown> | null;
  recurrenceEndDate: string | null;
  recurrencePaused: boolean;
  recurrenceSkippedDates: string[] | null;
  /** Set only on a generated occurrence, pointing back at the definition task. */
  recurringParentId: string | null;
  /** Each entry is "minutes before dueDate+dueTime" to fire a reminder (0 = at the due time, 1440
   * = 1 day before) - requires dueTime, see services/tasks' TaskReminderScheduler. */
  reminderMinutesBefore: number[] | null;
  remindersSent: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetRecurrenceRequest {
  pattern: TaskRecurrencePattern;
  config?: Record<string, unknown>;
  endDate?: string | null;
}

/** Day-of-week codes for the UI only, matching habits' own DAYS_OF_WEEK - the API uses ISO
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

export interface TaskListFilters {
  view?: TaskViewName;
  status?: TaskStatus;
  priority?: TaskPriority;
  area?: LifeArea;
  projectId?: string;
  goalId?: string;
  tag?: string;
  q?: string;
  upcomingDays?: number;
  /** "yyyy-MM-dd" - used by the calendar views to pull tasks due within a displayed date range,
   * independent of `view` (see TaskService.matchesDueRange on the backend). */
  dueFrom?: string;
  dueTo?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  dueTime?: string | null;
  allDay?: boolean;
  area?: LifeArea | null;
  projectId?: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
  tags?: string[];
  estimateMinutes?: number | null;
  reminderMinutesBefore?: number[];
}

export type UpdateTaskRequest = Partial<CreateTaskRequest> & { status?: TaskStatus };

export interface BulkUpdateTaskRequest {
  ids: string[];
  patch: UpdateTaskRequest;
}
