// Automation rules: how to read them aloud, and how a rule form maps to the request. Shared by the native apps.
import type { ActionType, AutomationRule, SaveRuleRequest, TriggerType } from './models-extra';

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

export const WEEK_DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const RULE_EVENT_CATEGORIES = ['WORK', 'PERSONAL', 'FOCUS', 'GYM', 'JOB', 'OTHER'];

const entityLabel = (value: unknown) => ENTITY_TYPES.find((e) => e.value === value)?.label.toLowerCase() ?? String(value);

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** A one-line, human reading of a trigger - "When a job application is updated (status is APPLIED)". */
export function describeTrigger(type: TriggerType, config: Record<string, unknown>): string {
  switch (type) {
    case 'ON_CREATE':
    case 'ON_COMPLETE':
    case 'ON_UPDATE': {
      const verb = type === 'ON_CREATE' ? 'created' : type === 'ON_COMPLETE' ? 'completed' : 'updated';
      const conditions = Object.entries((config.conditions as Record<string, unknown> | undefined) ?? {}).filter(([, v]) => String(v).trim() !== '');
      const suffix = conditions.length === 0 ? '' : ` (${conditions.map(([k, v]) => (k === 'titleContains' ? `title contains “${v}”` : `${k} is ${v}`)).join(', ')})`;
      return `When a ${entityLabel(config.entityType)} is ${verb}${suffix}`;
    }
    case 'SCHEDULED': {
      const time = String(config.time ?? '');
      if (config.frequency === 'DAILY') return `Every day at ${time}`;
      if (config.frequency === 'WEEKLY') return `Every ${WEEK_DAYS[Number(config.dayOfWeek)] ?? '?'} at ${time}`;
      return `On the ${ordinal(Number(config.dayOfMonth))} of every month at ${time}`;
    }
    case 'THRESHOLD': {
      const metric = THRESHOLD_METRICS.find((m) => m.value === config.metric);
      return `When ${(metric?.label ?? String(config.metric)).toLowerCase()} ${config.value}${metric?.unit === '%' ? '%' : metric?.unit === '₹' ? ' ₹' : ''}`;
    }
  }
}

/** A one-line reading of an action - "Create a task “Follow up”, due in 7 days". */
export function describeAction(type: ActionType, config: Record<string, unknown>): string {
  switch (type) {
    case 'CREATE_TASK':
      return `Create a task “${config.title}”${config.dueInDays != null ? `, due in ${config.dueInDays} day${Number(config.dueInDays) === 1 ? '' : 's'}` : ''}`;
    case 'CREATE_EVENT':
      return `Create a calendar event “${config.title}”`;
    case 'SEND_NOTIFICATION':
      return `Send a notification “${config.title}”`;
    case 'LINK_ITEMS':
      return 'Link the task to a goal';
    case 'UPDATE_STATUS':
      return `Set its status to ${String(config.status).replace('_', ' ').toLowerCase()}`;
    case 'GENERATE_REPORT':
      return `Generate the ${config.period === 'MONTH' ? 'monthly' : 'weekly'} report`;
  }
}

/** Every field of the rule form as text, so inputs bind to it directly. */
export interface RuleForm {
  name: string;
  description: string;
  trigger: TriggerType;
  action: ActionType;
  t: Record<string, string>;
  a: Record<string, string>;
}

const str = (v: unknown, fallback = '') => (v == null ? fallback : String(v));

export function ruleFormFrom(rule: AutomationRule | null): RuleForm {
  const tc = rule?.triggerConfig ?? { entityType: 'TASK' };
  const conditions = (tc.conditions as Record<string, unknown> | undefined) ?? {};
  const ac = rule?.actionConfig ?? {};
  return {
    name: rule?.name ?? '',
    description: rule?.description ?? '',
    trigger: rule?.triggerType ?? 'ON_CREATE',
    action: rule?.actionType ?? 'SEND_NOTIFICATION',
    t: {
      entityType: str(tc.entityType, 'TASK'), status: str(conditions.status), priority: str(conditions.priority), titleContains: str(conditions.titleContains),
      frequency: str(tc.frequency, 'DAILY'), time: str(tc.time, '09:00'), dayOfWeek: str(tc.dayOfWeek, '1'), dayOfMonth: str(tc.dayOfMonth, '1'),
      metric: str(tc.metric, 'GOAL_PROGRESS_BELOW'), value: str(tc.value, '25'), goalId: str(tc.goalId),
    },
    a: {
      title: str(ac.title), body: str(ac.body), description: str(ac.description), priority: str(ac.priority, 'MEDIUM'), dueInDays: str(ac.dueInDays, '3'),
      goalId: str(ac.goalId), startInDays: str(ac.startInDays, '1'), hour: str(ac.hour, '9'), durationMinutes: str(ac.durationMinutes, '60'),
      category: str(ac.category, 'OTHER'), status: str(ac.status, 'IN_PROGRESS'), period: str(ac.period, 'WEEK'),
    },
  };
}

export function ruleRequestFrom(form: RuleForm): SaveRuleRequest {
  const { trigger, action, t, a } = form;
  const isEvent = trigger === 'ON_CREATE' || trigger === 'ON_COMPLETE' || trigger === 'ON_UPDATE';

  let triggerConfig: Record<string, unknown>;
  if (isEvent) {
    const conditions: Record<string, string> = {};
    if (t.status.trim()) conditions.status = t.status.trim();
    if (t.priority.trim()) conditions.priority = t.priority.trim();
    if (t.titleContains.trim()) conditions.titleContains = t.titleContains.trim();
    triggerConfig = Object.keys(conditions).length ? { entityType: t.entityType, conditions } : { entityType: t.entityType };
  } else if (trigger === 'SCHEDULED') {
    triggerConfig = { frequency: t.frequency, time: t.time };
    if (t.frequency === 'WEEKLY') triggerConfig.dayOfWeek = Number(t.dayOfWeek);
    if (t.frequency === 'MONTHLY') triggerConfig.dayOfMonth = Number(t.dayOfMonth);
  } else {
    triggerConfig = { metric: t.metric, value: Number(t.value) };
    if (t.metric === 'GOAL_PROGRESS_BELOW' && t.goalId) triggerConfig.goalId = t.goalId;
  }

  let actionConfig: Record<string, unknown>;
  switch (action) {
    case 'CREATE_TASK':
      actionConfig = { title: a.title, priority: a.priority, dueInDays: Number(a.dueInDays) };
      if (a.description.trim()) actionConfig.description = a.description;
      if (a.goalId) actionConfig.goalId = a.goalId;
      break;
    case 'CREATE_EVENT':
      actionConfig = { title: a.title, startInDays: Number(a.startInDays), hour: Number(a.hour), durationMinutes: Number(a.durationMinutes), category: a.category };
      break;
    case 'SEND_NOTIFICATION':
      actionConfig = a.body.trim() ? { title: a.title, body: a.body } : { title: a.title };
      break;
    case 'LINK_ITEMS':
      actionConfig = { goalId: a.goalId };
      break;
    case 'UPDATE_STATUS':
      actionConfig = { status: a.status };
      break;
    case 'GENERATE_REPORT':
      actionConfig = { period: a.period };
      break;
  }

  return { name: form.name.trim(), description: form.description.trim() || null, triggerType: trigger, triggerConfig, actionType: action, actionConfig };
}
