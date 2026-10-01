import { AlertTriangle, Ban, CheckCircle2, CircleDot, PauseCircle, TrendingUp, Archive } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { LIFE_AREA_LABELS, type LifeArea } from '@/features/tasks/types';
import { cn } from '@/lib/utils';

import { GOAL_PRIORITY_LABELS, GOAL_STATUS_LABELS, type GoalStatus } from './types';

const STATUS_STYLES: Record<GoalStatus, { classes: string; icon: typeof CircleDot }> = {
  ACTIVE: { classes: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400', icon: CircleDot },
  ON_TRACK: { classes: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', icon: TrendingUp },
  AT_RISK: { classes: 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400', icon: AlertTriangle },
  PAUSED: { classes: 'border-border bg-muted text-muted-foreground', icon: PauseCircle },
  COMPLETED: { classes: 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-400', icon: CheckCircle2 },
  ARCHIVED: { classes: 'border-border bg-muted/50 text-muted-foreground', icon: Archive },
};

export function GoalStatusBadge({ status, className }: { status: GoalStatus; className?: string }) {
  const { classes, icon: Icon } = STATUS_STYLES[status];
  return (
    <Badge variant="outline" className={cn('gap-1', classes, className)}>
      <Icon className="size-3" />
      {GOAL_STATUS_LABELS[status]}
    </Badge>
  );
}

const PRIORITY_CLASSES: Record<number, string> = {
  1: 'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-400',
  2: 'border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-400',
  3: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400',
  4: 'border-border bg-muted text-muted-foreground',
};

export function GoalPriorityBadge({ priority, className }: { priority: number; className?: string }) {
  return (
    <Badge variant="outline" className={cn(PRIORITY_CLASSES[priority] ?? PRIORITY_CLASSES[3], className)}>
      P{priority}
      <span className="sr-only"> {GOAL_PRIORITY_LABELS[priority]}</span>
    </Badge>
  );
}

export function GoalAreaBadge({ area, className }: { area: LifeArea | null; className?: string }) {
  if (!area) return null;
  return (
    <Badge variant="outline" className={cn('text-muted-foreground', className)}>
      {LIFE_AREA_LABELS[area]}
    </Badge>
  );
}

export function GoalBlockedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400', className)}
      title="Another goal that blocks this one isn't finished yet"
    >
      <Ban className="size-3" />
      Blocked
    </Badge>
  );
}

/** Thin bar with an optional tick where progress "should" be by now - being left of the tick is
 * exactly what makes a goal AT_RISK, so the bar shows the reason for the badge. */
export function GoalProgressBar({
  pct,
  expectedPct,
  className,
}: {
  pct: number;
  expectedPct?: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Goal progress"
    >
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
      {expectedPct != null && expectedPct > 0 && expectedPct < 100 && (
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/60"
          style={{ left: `${expectedPct}%` }}
          title={`Expected by now: ${expectedPct}%`}
        />
      )}
    </div>
  );
}
