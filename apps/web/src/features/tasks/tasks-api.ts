import { api, unwrap } from '@/lib/api-client';

import type {
  BulkUpdateTaskRequest,
  CreateTaskRequest,
  SetRecurrenceRequest,
  Task,
  TaskListFilters,
  UpdateTaskRequest,
} from './types';

const baseUrl = '/v1/tasks';

export const tasksApi = {
  list(filters: TaskListFilters = {}): Promise<Task[]> {
    return unwrap(api.get(baseUrl, { params: filters }));
  },

  get(id: string): Promise<Task> {
    return unwrap(api.get(`${baseUrl}/${id}`));
  },

  subtasks(id: string): Promise<Task[]> {
    return unwrap(api.get(`${baseUrl}/${id}/subtasks`));
  },

  create(request: CreateTaskRequest): Promise<Task> {
    return unwrap(api.post(baseUrl, request));
  },

  update(id: string, request: UpdateTaskRequest): Promise<Task> {
    return unwrap(api.put(`${baseUrl}/${id}`, request));
  },

  bulkUpdate(request: BulkUpdateTaskRequest): Promise<Task[]> {
    return unwrap(api.put(`${baseUrl}/bulk`, request));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}`);
  },

  complete(id: string): Promise<Task> {
    return unwrap(api.post(`${baseUrl}/${id}/complete`, {}));
  },

  reopen(id: string): Promise<Task> {
    return unwrap(api.post(`${baseUrl}/${id}/reopen`, {}));
  },

  snooze(id: string, newDueDate: string): Promise<Task> {
    return unwrap(api.post(`${baseUrl}/${id}/snooze`, { newDueDate }));
  },

  duplicate(id: string): Promise<Task> {
    return unwrap(api.post(`${baseUrl}/${id}/duplicate`, {}));
  },

  occurrences(id: string): Promise<Task[]> {
    return unwrap(api.get(`${baseUrl}/${id}/occurrences`));
  },

  setRecurrence(id: string, request: SetRecurrenceRequest): Promise<Task> {
    return unwrap(api.post(`${baseUrl}/${id}/recurrence`, request));
  },

  async stopRecurrence(id: string): Promise<void> {
    await api.delete(`${baseUrl}/${id}/recurrence`);
  },

  pauseRecurrence(id: string): Promise<Task> {
    return unwrap(api.post(`${baseUrl}/${id}/recurrence/pause`, {}));
  },

  resumeRecurrence(id: string): Promise<Task> {
    return unwrap(api.post(`${baseUrl}/${id}/recurrence/resume`, {}));
  },

  async skipOccurrence(id: string, dueDate: string): Promise<void> {
    await api.post(`${baseUrl}/${id}/recurrence/skip`, { dueDate });
  },
};
