import { format, parseISO } from 'date-fns';
import { ClipboardCheck } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

import { GoalStatusBadge } from './goal-badges';
import type { GoalReview, GoalSummary } from './types';

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export function GoalReviewsPanel({
  goal,
  reviews,
  onReview,
}: {
  goal: GoalSummary;
  reviews: GoalReview[];
  onReview: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {goal.nextReviewDate
            ? `Next review ${goal.reviewDue ? 'is due now' : `on ${format(parseISO(goal.nextReviewDate), 'MMM d, yyyy')}`}`
            : 'No scheduled reviews - set a cadence by editing the goal.'}
        </p>
        <Button size="sm" variant={goal.reviewDue ? 'default' : 'outline'} onClick={onReview}>
          <ClipboardCheck /> Start review
        </Button>
      </div>

      {reviews.length === 0 ? (
        <EmptyState message="No reviews yet." />
      ) : (
        <ol className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{format(parseISO(review.reviewDate), 'MMM d, yyyy')}</span>
                <span className="flex items-center gap-2">
                  <GoalStatusBadge status={review.statusSnapshot} />
                  <span className="text-sm font-semibold tabular-nums">{review.progressSnapshot}%</span>
                </span>
              </div>
              <dl className="flex flex-col gap-2">
                <Field label="Progress" value={review.progressSummary} />
                <Field label="Blockers" value={review.blockers} />
                <Field label="Next steps" value={review.nextSteps} />
                <Field label="Notes" value={review.notes} />
              </dl>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
