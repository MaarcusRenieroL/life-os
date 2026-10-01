import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/error';

import { GoalForm, goalFormToRequest, useGoalFormState, validateGoalForm } from './goal-form';
import { goalsApi } from './goals-api';
import type { GoalSummary } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GoalSummary | null;
  onSaved: (goal: GoalSummary) => void;
}

export function GoalFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [value, setValue] = useGoalFormState(open, editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const validationError = validateGoalForm(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const request = goalFormToRequest(value);
      const goal = editing ? await goalsApi.update(editing.id, request) : await goalsApi.create(request);
      toast.success(editing ? `Updated “${goal.name}”` : `Created “${goal.name}”`);
      onSaved(goal);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the goal. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit goal' : 'New goal'}</DialogTitle>
        </DialogHeader>
        <GoalForm value={value} onChange={setValue} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
