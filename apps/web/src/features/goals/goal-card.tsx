import { CalendarClock, ClipboardCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import {
  GoalAreaBadge,
  GoalBlockedBadge,
  GoalPriorityBadge,
  GoalProgressBar,
  GoalStatusBadge,
} from './goal-badges';
import type { GoalSummary } from './types';

function targetLabel(goal: GoalSummary): string | null {
  return goal.targetDate ? format(parseISO(goal.targetDate), 'MMM d, yyyy') : null;
}

export function GoalCard({ goal, onReview }: { goal: GoalSummary; onReview?: (goal: GoalSummary) => void }) {
  const target = targetLabel(goal);

  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/goals/${goal.id}`} className="font-medium leading-snug hover:underline">
            {goal.name}
          </Link>
          <GoalPriorityBadge priority={goal.priority} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <GoalStatusBadge status={goal.status} />
          <GoalAreaBadge area={goal.area} />
          {goal.blocked && <GoalBlockedBadge />}
        </div>

        {goal.description && <p className="line-clamp-2 text-xs text-muted-foreground">{goal.description}</p>}

        <div className="mt-auto flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold tabular-nums">{goal.progress.overallPct}%</span>
          </div>
          <GoalProgressBar pct={goal.progress.overallPct} expectedPct={goal.progress.expectedPct} />
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {target ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              {target}
            </span>
          ) : (
            <span>No target date</span>
          )}
          {goal.reviewDue && onReview && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onReview(goal)}>
              <ClipboardCheck className="size-3.5" />
              Review due
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
