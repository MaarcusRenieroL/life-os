import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { tasksApi } from '@/features/tasks/tasks-api';

/** Tasks with a due date inside [from, to] - the calendar's read side of the tasks/calendar
 * integration point. Shares the ['tasks', ...] query key prefix with the tasks feature's own
 * queries, so completing/editing a task from a calendar chip invalidates both. */
export function useTasksInRange(from: Date, to: Date) {
  const dueFrom = format(from, 'yyyy-MM-dd');
  const dueTo = format(to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['tasks', 'dueRange', dueFrom, dueTo],
    queryFn: () => tasksApi.list({ dueFrom, dueTo }),
  });
}
