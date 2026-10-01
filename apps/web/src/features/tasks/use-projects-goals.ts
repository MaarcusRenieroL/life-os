import { useQuery, useQueryClient } from '@tanstack/react-query';

import { goalsApi, projectsApi } from './projects-goals-api';

/** Shared by the task form and the calendar event form (calendar has no local copy of these
 * tables - see Event.java's javadoc - so it reads the same lists straight from here). */
export function useProjectsAndGoals() {
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({ queryKey: ['tasks', 'projects'], queryFn: projectsApi.list });
  const { data: goals = [] } = useQuery({ queryKey: ['tasks', 'goals'], queryFn: goalsApi.list });

  async function createProject(name: string) {
    const project = await projectsApi.create(name);
    queryClient.invalidateQueries({ queryKey: ['tasks', 'projects'] });
    return { id: project.id, label: project.name };
  }

  async function createGoal(name: string) {
    const goal = await goalsApi.create(name);
    queryClient.invalidateQueries({ queryKey: ['tasks', 'goals'] });
    return { id: goal.id, label: goal.name };
  }

  return {
    projectOptions: projects.map((p) => ({ id: p.id, label: p.name })),
    goalOptions: goals.map((g) => ({ id: g.id, label: g.name })),
    createProject,
    createGoal,
  };
}
