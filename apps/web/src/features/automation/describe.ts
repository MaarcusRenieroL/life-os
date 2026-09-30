import { ENTITY_TYPES, THRESHOLD_METRICS, type ActionType, type TriggerType } from './types';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function entityLabel(value: unknown): string {
  return ENTITY_TYPES.find((e) => e.value === value)?.label.toLowerCase() ?? String(value);
}

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
      if (config.frequency === 'WEEKLY') return `Every ${DAYS[Number(config.dayOfWeek)] ?? '?'} at ${time}`;
      return `On the ${ordinal(Number(config.dayOfMonth))} of every month at ${time}`;
    }
    case 'THRESHOLD': {
      const metric = THRESHOLD_METRICS.find((m) => m.value === config.metric);
      return `When ${(metric?.label ?? String(config.metric)).toLowerCase()} ${config.value}${metric?.unit === '%' ? '%' : metric?.unit === '₹' ? ' ₹' : ''}`;
    }
  }
}

/** A one-line reading of an action - "Create a task “Follow up: {{title}}”, due in 7 days". */
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
