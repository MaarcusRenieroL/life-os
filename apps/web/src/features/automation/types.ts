// Mirrors core's automation API (/v1/core/automation).

export type TriggerType = 'ON_CREATE' | 'ON_COMPLETE' | 'ON_UPDATE' | 'SCHEDULED' | 'THRESHOLD';
export type ActionType = 'CREATE_TASK' | 'CREATE_EVENT' | 'SEND_NOTIFICATION' | 'LINK_ITEMS' | 'UPDATE_STATUS' | 'GENERATE_REPORT';

export const TRIGGER_TYPES: { value: TriggerType; label: string; hint: string }[] = [
  { value: 'ON_CREATE', label: 'When something is created', hint: 'A task, goal or job application is added' },
  { value: 'ON_COMPLETE', label: 'When something is completed', hint: 'A task, goal or habit is finished' },
  { value: 'ON_UPDATE', label: 'When something changes', hint: 'A status or field is updated' },
  { value: 'SCHEDULED', label: 'On a schedule', hint: 'Daily, weekly or monthly at a set time' },
  { value: 'THRESHOLD', label: 'When a number crosses a line', hint: 'Goal progress drops, spending rises...' },
];

export const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: 'CREATE_TASK', label: 'Create a task' },
  { value: 'CREATE_EVENT', label: 'Create a calendar event' },
  { value: 'SEND_NOTIFICATION', label: 'Send a notification' },
  { value: 'LINK_ITEMS', label: 'Link the task to a goal' },
  { value: 'UPDATE_STATUS', label: 'Update the item’s status' },
  { value: 'GENERATE_REPORT', label: 'Generate a report' },
];

export const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: 'TASK', label: 'Task' },
  { value: 'GOAL', label: 'Goal' },
  { value: 'JOB_APPLICATION', label: 'Job application' },
  { value: 'HABIT', label: 'Habit' },
];

export const THRESHOLD_METRICS: { value: string; label: string; unit: string }[] = [
  { value: 'GOAL_PROGRESS_BELOW', label: 'A goal’s progress is below', unit: '%' },
  { value: 'HABIT_CONSISTENCY_BELOW', label: 'Habit consistency (2 weeks) is below', unit: '%' },
  { value: 'WEEKLY_SPEND_ABOVE', label: 'Spending in the last 7 days is above', unit: '₹' },
  { value: 'OVERDUE_TASKS_ABOVE', label: 'Overdue tasks are more than', unit: 'tasks' },
];

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
  templateKey: string | null;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  status: 'SUCCESS' | 'FAILED';
  message: string | null;
  triggerSummary: string | null;
  executedAt: string;
}

export interface AutomationTemplate {
  key: string;
  name: string;
  description: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
}

export interface SaveRuleRequest {
  name: string;
  description?: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
  enabled?: boolean;
}
