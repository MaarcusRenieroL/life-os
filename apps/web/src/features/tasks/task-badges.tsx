import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type TaskPriority, type TaskStatus } from './types';

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  URGENT: 'border-transparent bg-red-600 text-white',
  HIGH: 'border-transparent bg-orange-500 text-white',
  MEDIUM: 'border-transparent bg-blue-500 text-white',
  LOW: 'border-muted-foreground/30 text-muted-foreground',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge className={cn(PRIORITY_CLASSES[priority])}>{TASK_PRIORITY_LABELS[priority]}</Badge>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={status === 'DONE' ? 'default' : 'outline'}>{TASK_STATUS_LABELS[status]}</Badge>;
}

/** Overdue is derived (dueDate < today && not done), not a stored status, so it's a badge
 * decoration rather than part of TaskStatus. */
export function OverdueBadge() {
  return <Badge className="border-transparent bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Overdue</Badge>;
}

export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'DONE') return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}
