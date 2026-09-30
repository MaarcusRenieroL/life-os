import { api, unwrap } from '@/lib/api-client';

export type TimeEntryType = 'WORK' | 'BREAK';

export interface TimeEntry {
  id: string;
  taskId: string | null;
  type: TimeEntryType;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
}

export interface TaskTimeSummary {
  taskId: string;
  totalMinutes: number;
}

const baseUrl = '/v1/tasks/time-entries';

export const timeEntryApi = {
  list(params: { from?: string; to?: string; taskId?: string } = {}): Promise<TimeEntry[]> {
    return unwrap(api.get(baseUrl, { params }));
  },

  active(): Promise<TimeEntry | null> {
    return unwrap(api.get(`${baseUrl}/active`));
  },

  summary(params: { from?: string; to?: string } = {}): Promise<TaskTimeSummary[]> {
    return unwrap(api.get(`${baseUrl}/summary`, { params }));
  },

  start(type: TimeEntryType, taskId?: string | null): Promise<TimeEntry> {
    return unwrap(api.post(`${baseUrl}/start`, { type, taskId: taskId ?? null }));
  },

  stop(id: string): Promise<TimeEntry> {
    return unwrap(api.post(`${baseUrl}/${id}/stop`, {}));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },
};
