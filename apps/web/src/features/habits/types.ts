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
  /** The user's stated motivation for the habit. */
  why: string | null;
  /** Self-rated 1-10. */
  difficulty: number | null;
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
  why?: string | null;
  difficulty?: number | null;
}

export type UpdateHabitRequest = Partial<CreateHabitRequest>;

export interface CreateHabitReminderRequest {
  reminderTime: string;
  /** ISO day-of-week integers (1=Monday..7=Sunday), matching the backend entity. */
  daysOfWeek?: number[] | null;
  enabled?: boolean;
}

export type UpdateHabitReminderRequest = Partial<CreateHabitReminderRequest>;

// --- Analytics (GET /v1/habits/analytics) -----------------------------------
// Aggregated server-side: every figure needs each habit's whole log history crossed with its
// frequency schedule, which client-side would mean one request per habit per view.

export interface CompletionTrendPoint {
  weekStart: string;
  weekEnd: string;
  completions: number;
  scheduledOccurrences: number;
  /** 0..1 */
  score: number;
}

export interface HabitPerformance {
  habitId: string;
  name: string;
  icon: string | null;
  category: string | null;
  completions: number;
  scheduledOccurrences: number;
  /** 0..1 */
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
}

export interface DayOfWeekPattern {
  /** ISO day of week, 1=Monday..7=Sunday. */
  dayOfWeek: number;
  completions: number;
  scheduledOccurrences: number;
  /** 0..1 */
  score: number;
}

export interface HealthScore {
  /** 0-100, the weighted total of the three components below. */
  score: number;
  consistencyScore: number;
  streakScore: number;
  engagementScore: number;
  consistencyWeightPercent: number;
  streakWeightPercent: number;
  engagementWeightPercent: number;
  habitsCounted: number;
}

export interface HabitAnalytics {
  windowStart: string;
  windowEnd: string;
  weeks: number;
  /** Oldest week first. */
  trend: CompletionTrendPoint[];
  /** Best-performing first. */
  habitPerformance: HabitPerformance[];
  /** Always 7 entries, Monday (1) through Sunday (7). */
  dayOfWeekPattern: DayOfWeekPattern[];
  healthScore: HealthScore;
  /** X_PER_WEEK / X_PER_MONTH habits, which have no per-day schedule and so can't appear in the
   * weekly trend or the day-of-week pattern. They still count toward performance and health. */
  habitsExcludedFromDayPatterns: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  completions: number;
  scheduledOccurrences: number;
  /** 0..1 */
  score: number;
  missed: number;
  skipped: number;
  perfectDays: number;
  habitsTracked: number;
  /** 0..1 */
  previousWeekScore: number;
  topHabitId: string | null;
  topHabitName: string | null;
  needsAttentionHabitId: string | null;
  needsAttentionHabitName: string | null;
}

export interface HourlyLogCount {
  hour: number;
  completions: number;
}

export interface LoggingTimePattern {
  /** Always 24 entries, hour 0 through 23. */
  hourlyCounts: HourlyLogCount[];
  /** "HH:mm[:ss]", or null when there aren't enough logs to suggest one. */
  suggestedReminderTime: string | null;
  sampleSize: number;
  zoneId: string;
}

// --- In-app notifications (GET /v1/habits/notifications) ---------------------
// Derived live on each request - there is no notification table, no read state and no delivery
// channel. In-app only, by design.

export type HabitNotificationType =
  | 'STREAK_AT_RISK'
  | 'STREAK_MILESTONE'
  | 'WEEKLY_SUMMARY'
  | 'REMINDER_SUGGESTION';

export interface HabitNotification {
  /** Content-derived and stable across refreshes - not a database id. */
  id: string;
  type: HabitNotificationType;
  severity: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  habitId: string | null;
  habitName: string | null;
}
