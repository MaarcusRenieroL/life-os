import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { GoalStatusBadge } from './goal-badges';
import { GoalReviewDialog } from './goal-review-dialog';
import { goalsApi } from './goals-api';
import type { GoalSummary } from './types';

/** Every goal on a review schedule, due ones first - the place to run this fortnight's reviews. */
export function GoalsReviewsPage() {
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState<GoalSummary | null>(null);
  const { data: goals = [], isLoading } = useQuery({ queryKey: ['goals', 'list', { reviews: true }], queryFn: () => goalsApi.list() });

  const scheduled = goals
    .filter((g) => g.nextReviewDate != null && g.status !== 'COMPLETED' && g.status !== 'PAUSED')
    .sort((a, b) => a.nextReviewDate!.localeCompare(b.nextReviewDate!));
  const due = scheduled.filter((g) => g.reviewDue);
  const upcoming = scheduled.filter((g) => !g.reviewDue);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
  }

  function Row({ goal }: { goal: GoalSummary }) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <Link to={`/goals/${goal.id}`} className="block truncate text-sm font-medium hover:underline">
              {goal.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {goal.reviewDue ? 'Due since' : 'Next review'} {format(parseISO(goal.nextReviewDate!), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <GoalStatusBadge status={goal.status} />
            <span className="w-10 text-right text-sm font-semibold tabular-nums">{goal.progress.overallPct}%</span>
            <Button size="sm" variant={goal.reviewDue ? 'default' : 'outline'} onClick={() => setReviewing(goal)}>
              <ClipboardCheck /> Review
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
      {isLoading ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : scheduled.length === 0 ? (
        <EmptyState className="mt-4" message="No goals are on a review schedule - pick a cadence when editing a goal." />
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Due now ({due.length})</h2>
            {due.length === 0 ? (
              <EmptyState message="Nothing due - you’re up to date." />
            ) : (
              <div className="flex flex-col gap-2">
                {due.map((g) => (
                  <Row key={g.id} goal={g} />
                ))}
              </div>
            )}
          </section>
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Upcoming</h2>
              <div className="flex flex-col gap-2">
                {upcoming.map((g) => (
                  <Row key={g.id} goal={g} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
      <GoalReviewDialog goal={reviewing} onOpenChange={(open) => !open && setReviewing(null)} onSaved={refresh} />
    </div>
  );
}
