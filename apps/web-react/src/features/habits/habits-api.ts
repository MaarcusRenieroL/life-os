import { api, unwrap } from '@/lib/api-client';
import { downloadViaBlob } from '@/features/notes/utils/file-download';

import type {
  ConsistencyPeriod,
  ConsistencyScore,
  CreateHabitReminderRequest,
  CreateHabitRequest,
  Habit,
  HabitListFilters,
  HabitLog,
  HabitReminder,
  HabitStreak,
  TodayHabitEntry,
  UpdateHabitReminderRequest,
  UpdateHabitRequest,
  UpsertHabitLogRequest,
} from './types';

const baseUrl = '/v1/habits';

export const habitsApi = {
  list(filters: HabitListFilters = {}): Promise<Habit[]> {
    return unwrap(api.get(baseUrl, { params: filters }));
  },

  get(id: string): Promise<Habit> {
    return unwrap(api.get(`${baseUrl}/${id}`));
  },

  create(request: CreateHabitRequest): Promise<Habit> {
    return unwrap(api.post(baseUrl, request));
  },

  update(id: string, request: UpdateHabitRequest): Promise<Habit> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },

  async delete(id: string): Promise<void> {
    // Soft-delete: the backend archives the habit rather than removing it.
    await api.delete(`${baseUrl}/${id}`);
  },

  pause(id: string): Promise<Habit> {
    return unwrap(api.post(`${baseUrl}/${id}/pause`, {}));
  },

  resume(id: string): Promise<Habit> {
    return unwrap(api.post(`${baseUrl}/${id}/resume`, {}));
  },

  today(): Promise<TodayHabitEntry[]> {
    return unwrap(api.get(`${baseUrl}/today`));
  },

  streak(id: string): Promise<HabitStreak> {
    return unwrap(api.get(`${baseUrl}/${id}/streak`));
  },

  consistency(id: string, period: ConsistencyPeriod): Promise<ConsistencyScore> {
    return unwrap(api.get(`${baseUrl}/${id}/consistency`, { params: { period } }));
  },

  upsertLog(habitId: string, request: UpsertHabitLogRequest): Promise<HabitLog> {
    return unwrap(api.post(`${baseUrl}/${habitId}/logs`, request));
  },

  logs(habitId: string, from?: string, to?: string): Promise<HabitLog[]> {
    return unwrap(api.get(`${baseUrl}/${habitId}/logs`, { params: { from, to } }));
  },

  updateLog(habitId: string, logId: string, request: Partial<UpsertHabitLogRequest>): Promise<HabitLog> {
    return unwrap(api.put(`${baseUrl}/${habitId}/logs/${logId}`, request));
  },

  async deleteLog(habitId: string, logId: string): Promise<void> {
    await api.delete(`${baseUrl}/${habitId}/logs/${logId}`);
  },

  // A plain window.open/<a href> would bypass the axios interceptor and hit this
  // authenticated endpoint with no Authorization header - downloadViaBlob (already used by the
  // notes feature for the same reason) fetches through `api` and saves the blob manually instead.
  exportCsv(from?: string, to?: string): Promise<void> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return downloadViaBlob(`${baseUrl}/export${query ? `?${query}` : ''}`, 'habits-export.csv');
  },

  reminders(habitId: string): Promise<HabitReminder[]> {
    return unwrap(api.get(`${baseUrl}/${habitId}/reminders`));
  },

  createReminder(habitId: string, request: CreateHabitReminderRequest): Promise<HabitReminder> {
    return unwrap(api.post(`${baseUrl}/${habitId}/reminders`, request));
  },

  getReminder(habitId: string, reminderId: string): Promise<HabitReminder> {
    return unwrap(api.get(`${baseUrl}/${habitId}/reminders/${reminderId}`));
  },

  updateReminder(
    habitId: string,
    reminderId: string,
    request: UpdateHabitReminderRequest,
  ): Promise<HabitReminder> {
    return unwrap(api.put(`${baseUrl}/${habitId}/reminders/${reminderId}`, request));
  },

  async deleteReminder(habitId: string, reminderId: string): Promise<void> {
    await api.delete(`${baseUrl}/${habitId}/reminders/${reminderId}`);
  },
};
