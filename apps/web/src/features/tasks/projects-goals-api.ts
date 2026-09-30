import { api, unwrap } from '@/lib/api-client';

import type { Goal, Project } from './types';

export const projectsApi = {
  list(): Promise<Project[]> {
    return unwrap(api.get('/v1/tasks/projects'));
  },
  create(name: string): Promise<Project> {
    return unwrap(api.post('/v1/tasks/projects', { name }));
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/tasks/projects/${id}`);
  },
};

export const goalsApi = {
  list(): Promise<Goal[]> {
    return unwrap(api.get('/v1/tasks/goals'));
  },
  create(name: string): Promise<Goal> {
    return unwrap(api.post('/v1/tasks/goals', { name }));
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/tasks/goals/${id}`);
  },
};
