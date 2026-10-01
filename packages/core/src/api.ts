import type { Client } from './client';
import { dayKey } from './player-model';
import type { Dashboard, TodayItem, TrendPoint } from './types';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: string | null;
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

export interface HabitLog {
  id: string;
  logDate: string;
  status: string;
}

export interface TodayHabitEntry {
  habit: Habit;
  todayLog: HabitLog | null;
}

export interface QuickCaptureResult {
  [key: string]: unknown;
}

export interface JobSummary {
  id: string;
  title: string;
  company: string;
  status: string | null;
  fitScore: number | null;
  createdAt: string;
  appliedAt: string | null;
}

export interface FinanceSummary {
  totalIncome: number | null;
  totalExpenses: number | null;
  savings: number;
  fixedMonthlyIncome: number | null;
}

/** The slice of the backend the native apps use. */
export function createApis(client: Client) {
  return {
    today: () => client.get<TodayItem[]>('/v1/core/today'),
    trends: (days = 365) => client.get<TrendPoint[]>('/v1/core/analytics/trends', { days, bucket: 'DAY' }),
    dashboard: () => client.get<Dashboard>('/v1/core/analytics/dashboard'),
    quickCapture: (text: string) => client.post<QuickCaptureResult>('/v1/core/quick-capture', { text, useClaudeFallback: false }),

    tasks: {
      list: (view?: string) => client.get<Task[]>('/v1/tasks', { view }),
      create: (title: string, dueDate?: string) => client.post<Task>('/v1/tasks', { title, dueDate: dueDate ?? null }),
      complete: (id: string) => client.post<Task>(`/v1/tasks/${id}/complete`),
      reopen: (id: string) => client.post<Task>(`/v1/tasks/${id}/reopen`),
    },

    habits: {
      today: () => client.get<TodayHabitEntry[]>('/v1/habits/today'),
      complete: (habitId: string) => client.post<HabitLog>(`/v1/habits/${habitId}/logs`, { logDate: dayKey(new Date()), status: 'COMPLETED' }),
    },

    jobs: { list: () => client.get<JobSummary[]>('/v1/jobs') },
    finance: { summary: () => client.get<FinanceSummary>('/v1/finance/analytics/dashboard') },
  };
}

export type Apis = ReturnType<typeof createApis>;
