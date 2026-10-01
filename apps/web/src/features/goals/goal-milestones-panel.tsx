import { format, parseISO } from 'date-fns';
import { Check, Circle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DatePicker } from '@/components/date-time-picker';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';

import { goalsApi } from './goals-api';
import type { GoalMilestone } from './types';

function MilestoneDialog({
  goalId,
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  goalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GoalMilestone | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset from the milestone being edited each time the dialog opens.
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTitle(editing?.title ?? '');
      setTargetDate(editing?.targetDate ?? null);
    }
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const request = { title: title.trim(), targetDate };
      if (editing) await goalsApi.updateMilestone(goalId, editing.id, request);
      else await goalsApi.addMilestone(goalId, request);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the milestone. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit milestone' : 'New milestone'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="milestone-title">Title</Label>
          <Input id="milestone-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Target date</Label>
          <DatePicker value={targetDate} onChange={setTargetDate} placeholder="No date" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GoalMilestonesPanel({
  goalId,
  milestones,
  onChanged,
}: {
  goalId: string;
  milestones: GoalMilestone[];
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoalMilestone | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  async function toggle(milestone: GoalMilestone) {
    try {
      await goalsApi.updateMilestone(goalId, milestone.id, {
        title: milestone.title,
        targetDate: milestone.targetDate,
        completed: !milestone.completed,
      });
      onChanged();
    } catch {
      toast.error('Could not update the milestone. Please try again.');
    }
  }

  async function remove(milestone: GoalMilestone) {
    if (!(await confirm({ title: `Delete “${milestone.title}”?`, confirmLabel: 'Delete' }))) return;
    try {
      await goalsApi.deleteMilestone(goalId, milestone.id);
      onChanged();
    } catch {
      toast.error('Could not delete the milestone. Please try again.');
    }
  }

  return (
    <div>
      {milestones.length === 0 ? (
        <EmptyState message="No milestones yet - break the goal into checkpoints." />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {milestones.map((milestone) => {
            const overdue =
              !milestone.completed && milestone.targetDate != null && milestone.targetDate < format(new Date(), 'yyyy-MM-dd');
            return (
              <li key={milestone.id} className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => void toggle(milestone)}
                  aria-label={milestone.completed ? `Mark “${milestone.title}” incomplete` : `Complete “${milestone.title}”`}
                  className="text-muted-foreground hover:text-primary"
                >
                  {milestone.completed ? <Check className="size-5 text-primary" /> : <Circle className="size-5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm', milestone.completed && 'text-muted-foreground line-through')}>
                    {milestone.title}
                  </p>
                  {milestone.targetDate && (
                    <p className={cn('text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                      {overdue ? 'Overdue · ' : ''}
                      {format(parseISO(milestone.targetDate), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Edit “${milestone.title}”`}
                  onClick={() => {
                    setEditing(milestone);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Delete “${milestone.title}”`} onClick={() => void remove(milestone)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      >
        <Plus /> Add milestone
      </Button>

      <MilestoneDialog goalId={goalId} open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={onChanged} />
      {dialog}
    </div>
  );
}
