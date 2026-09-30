import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Flag } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { GoalMilestone, GoalSummary } from './types';

interface Point {
  key: string;
  label: string;
  date: string;
  done: boolean;
  kind: 'milestone' | 'target';
}

/** Vertical timeline of a goal's dated milestones ending at its target date, with a marker for
 * today. Undated milestones aren't on a timeline - they're just listed in the milestones panel. */
export function GoalTimeline({ goal, milestones }: { goal: GoalSummary; milestones: GoalMilestone[] }) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const points: Point[] = milestones
    .filter((m): m is GoalMilestone & { targetDate: string } => m.targetDate != null)
    .map((m) => ({ key: m.id, label: m.title, date: m.targetDate, done: m.completed, kind: 'milestone' as const }));

  if (goal.targetDate) {
    points.push({
      key: 'target',
      label: goal.name,
      date: goal.targetDate,
      done: goal.status === 'COMPLETED',
      kind: 'target',
    });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Add dates to milestones or set a target date to see a timeline.</p>;
  }

  // Slot "today" between the points it falls between.
  const insertAt = points.findIndex((p) => p.date > today);
  const items: (Point | 'today')[] = [...points];
  items.splice(insertAt === -1 ? items.length : insertAt, 0, 'today');

  return (
    <ol className="relative ml-2 border-l border-border pl-5">
      {items.map((item) => {
        if (item === 'today') {
          return (
            <li key="today" className="relative -ml-5 mb-4 flex items-center gap-2 pl-5" aria-label="Today">
              <span className="absolute -left-[5px] size-2.5 rounded-full bg-primary ring-4 ring-primary/20" />
              <span className="text-[11px] font-semibold tracking-widest text-primary uppercase">Today</span>
              <span className="h-px flex-1 bg-primary/30" />
            </li>
          );
        }
        const days = differenceInCalendarDays(parseISO(item.date), new Date());
        const late = !item.done && days < 0;
        return (
          <li key={item.key} className="relative mb-4 last:mb-0">
            <span
              className={cn(
                'absolute top-1 -left-[26px] flex size-3 items-center justify-center rounded-full border-2 bg-background',
                item.done ? 'border-primary bg-primary' : late ? 'border-destructive' : 'border-muted-foreground',
                item.kind === 'target' && 'size-4 -left-[27px] top-0.5',
              )}
            >
              {item.kind === 'target' && <Flag className="size-2.5 text-current" />}
            </span>
            <p className={cn('text-sm', item.done && 'text-muted-foreground line-through', item.kind === 'target' && 'font-medium')}>
              {item.kind === 'target' ? `Target: ${item.label}` : item.label}
            </p>
            <p className={cn('text-xs', late ? 'text-destructive' : 'text-muted-foreground')}>
              {format(parseISO(item.date), 'MMM d, yyyy')}
              {!item.done && (days === 0 ? ' · today' : days > 0 ? ` · in ${days}d` : ` · ${-days}d overdue`)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
