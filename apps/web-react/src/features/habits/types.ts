// Mirrors services/habit-tracker's API contract (base path /v1/habits).

export type HabitType = 'BINARY' | 'COUNT' | 'DURATION' | 'NEGATIVE';

export const HABIT_TYPES: HabitType[] = ['BINARY', 'COUNT', 'DURATION', 'NEGATIVE'];

export const HABIT_TYPE_LABELS: Record<HabitType, string> = {
  BINARY: 'Yes / no',
  COUNT: 'Count',
  DURATION: 'Duration',
  NEGATIVE: 'Avoid (negative)',
};

export type HabitFrequencyType = 'DAILY' | 'WEEKLY_DAYS' | 'X_PER_WEEK' | 'X_PER_MONTH' | 'CUSTOM_INTERVAL';

export const HABIT_FREQUENCY_TYPES: HabitFrequencyType[] = [
  'DAILY',
  'WEEKLY_DAYS',
  'X_PER_WEEK',
  'X_PER_MONTH',
  'CUSTOM_INTERVAL',
];

export const HABIT_FREQUENCY_TYPE_LABELS: Record<HabitFrequencyType, string> = {
  DAILY: 'Every day',
  WEEKLY_DAYS: 'Specific days of the week',
  X_PER_WEEK: 'X times per week',
  X_PER_MONTH: 'X times per month',
  CUSTOM_INTERVAL: 'Every N days',
};

export type HabitStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export const HABIT_STATUSES: HabitStatus[] = ['ACTIVE', 'PAUSED', 'ARCHIVED'];

export type HabitLogStatus = 'COMPLETED' | 'SKIPPED' | 'MISSED' | 'PARTIAL';

export const HABIT_LOG_STATUSES: HabitLogStatus[] = ['COMPLETED', 'SKIPPED', 'MISSED', 'PARTIAL'];

/** Day-of-week codes for the UI only. The API uses ISO day-of-week integers (1=Monday..7=Sunday) for
 * both frequencyConfig.daysOfWeek and reminder.daysOfWeek - see DAY_CODE_TO_ISO/ISO_TO_DAY_CODE below. */
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

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: HabitType;
  category: string | null;
  areaId: string | null;
  goalId: string | null;
  frequencyType: HabitFrequencyType;
  frequencyConfig: Record<string, unknown>;
  targetValue: number | null;
  targetUnit: string | null;
  status: HabitStatus;
  startDate: string;
  endDate: string | null;
  icon: string | null;
  color: string | null;
  priority: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  logDate: string;
  status: HabitLogStatus;
  value: number | null;
  failureReason: string | null;
  note: string | null;
  loggedAt: string;
  updatedAt: string;
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastComputedDate: string;
}

export interface HabitReminder {
  id: string;
  habitId: string;
  reminderTime: string;
  /** ISO day-of-week integers (1=Monday..7=Sunday), matching the backend entity. */
  daysOfWeek: number[] | null;
  enabled: boolean;
}

export interface TodayHabitEntry {
  habit: Habit;
  todayLog: HabitLog | null;
}

export type ConsistencyPeriod = 'week' | 'month';

export interface ConsistencyScore {
  period: ConsistencyPeriod;
  completions: number;
  scheduledOccurrences: number;
  score: number;
}

export interface HabitListFilters {
  status?: HabitStatus;
  category?: string;
  areaId?: string;
  goalId?: string;
}

export interface UpsertHabitLogRequest {
  logDate: string;
  status: HabitLogStatus;
  value?: number;
  failureReason?: string;
  note?: string;
}

export interface CreateHabitRequest {
  name: string;
  description?: string | null;
  type: HabitType;
  category?: string | null;
  areaId?: string | null;
  goalId?: string | null;
  frequencyType: HabitFrequencyType;
  frequencyConfig: Record<string, unknown>;
  targetValue?: number | null;
  targetUnit?: string | null;
  startDate: string;
  endDate?: string | null;
  icon?: string | null;
  color?: string | null;
  priority?: number | null;
}

export type UpdateHabitRequest = Partial<CreateHabitRequest>;

export interface CreateHabitReminderRequest {
  reminderTime: string;
  /** ISO day-of-week integers (1=Monday..7=Sunday), matching the backend entity. */
  daysOfWeek?: number[] | null;
  enabled?: boolean;
}

export type UpdateHabitReminderRequest = Partial<CreateHabitReminderRequest>;
