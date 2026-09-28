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

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  allDay: boolean;
  areaId: string | null;
  projectId: string | null;
  goalId: string | null;
  parentTaskId: string | null;
  tags: string[] | null;
  estimateMinutes: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListFilters {
  view?: TaskViewName;
  status?: TaskStatus;
  priority?: TaskPriority;
  areaId?: string;
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
  areaId?: string | null;
  projectId?: string | null;
  goalId?: string | null;
  parentTaskId?: string | null;
  tags?: string[];
  estimateMinutes?: number | null;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest> & { status?: TaskStatus };

export interface BulkUpdateTaskRequest {
  ids: string[];
  patch: UpdateTaskRequest;
}
