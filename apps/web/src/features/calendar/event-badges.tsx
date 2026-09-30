import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { EVENT_CATEGORY_LABELS, type EventCategory } from './types';

const CATEGORY_CLASSES: Record<EventCategory, string> = {
  WORK: 'border-transparent bg-blue-500 text-white',
  PERSONAL: 'border-transparent bg-violet-500 text-white',
  // Distinct dark cyan per the spec's "color focus blocks distinctly" note.
  FOCUS: 'border-transparent bg-cyan-800 text-white',
  GYM: 'border-transparent bg-emerald-600 text-white',
  JOB: 'border-transparent bg-amber-600 text-white',
  OTHER: 'border-muted-foreground/30 text-muted-foreground',
};

export const CATEGORY_DOT_CLASSES: Record<EventCategory, string> = {
  WORK: 'bg-blue-500',
  PERSONAL: 'bg-violet-500',
  FOCUS: 'bg-cyan-800',
  GYM: 'bg-emerald-600',
  JOB: 'bg-amber-600',
  OTHER: 'bg-muted-foreground',
};

export function CategoryBadge({ category }: { category: EventCategory }) {
  return <Badge className={cn(CATEGORY_CLASSES[category])}>{EVENT_CATEGORY_LABELS[category]}</Badge>;
}

/** Shown on a recurring definition (recurrencePattern set, recurringParentId null) - mirrors
 * tasks' RecurringIcon. */
export function RecurringIcon() {
  return (
    <span title="Repeats" aria-label="Repeats" className="text-xs">
      🔁
    </span>
  );
}
