import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DatePicker } from '@/components/date-time-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/error';

import { GoalProgressBar, GoalStatusBadge } from './goal-badges';
import { goalsApi } from './goals-api';
import type { GoalSummary } from './types';

interface Props {
  goal: GoalSummary | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const FIELDS = [
  { key: 'progressSummary', label: 'Progress summary', placeholder: 'What moved forward since the last review?' },
  { key: 'blockers', label: 'Blockers', placeholder: 'What’s in the way?' },
  { key: 'nextSteps', label: 'Next steps', placeholder: 'What happens before the next review?' },
  { key: 'notes', label: 'Notes', placeholder: 'Anything else worth remembering' },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];
type FormState = Record<FieldKey, string>;

const EMPTY: FormState = { progressSummary: '', blockers: '', nextSteps: '', notes: '' };

/** The review form: a snapshot of where the goal stands right now, plus four free-text prompts.
 * Saving also pushes the next scheduled review out (server-side). */
export function GoalReviewDialog({ goal, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [reviewDate, setReviewDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setForm(EMPTY);
      setReviewDate(null);
    }
  }, [goal]);

  async function submit() {
    if (!goal) return;
    setSaving(true);
    try {
      await goalsApi.submitReview(goal.id, { ...form, reviewDate });
      toast.success('Review saved');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the review. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={goal !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review: {goal?.name}</DialogTitle>
          <DialogDescription>Take a moment to check in on this goal.</DialogDescription>
        </DialogHeader>

        {goal && (
          <div className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <GoalStatusBadge status={goal.status} />
              <span className="text-sm font-semibold tabular-nums">{goal.progress.overallPct}%</span>
            </div>
            <GoalProgressBar pct={goal.progress.overallPct} expectedPct={goal.progress.expectedPct} />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Review date</Label>
          <DatePicker value={reviewDate} onChange={setReviewDate} placeholder="Today" />
        </div>

        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`review-${field.key}`}>{field.label}</Label>
            <Textarea
              id={`review-${field.key}`}
              rows={2}
              value={form[field.key]}
              placeholder={field.placeholder}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            />
          </div>
        ))}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
