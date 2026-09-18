import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { HabitForm, habitFormToRequest, useHabitFormState, validateHabitForm } from './habit-form';
import { habitsApi } from './habits-api';
import type { Habit } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Habit | null;
  onSaved: (habit: Habit) => void;
}

export function HabitFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [value, setValue] = useHabitFormState(open, editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const validationError = validateHabitForm(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const request = habitFormToRequest(value);
      const habit = editing ? await habitsApi.update(editing.id, request) : await habitsApi.create(request);
      toast.success(editing ? `Updated "${habit.name}"` : `Created "${habit.name}"`);
      onSaved(habit);
      onOpenChange(false);
    } catch {
      toast.error('Could not save the habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit habit' : 'New habit'}</DialogTitle>
        </DialogHeader>
        <HabitForm value={value} onChange={setValue} habit={editing} />
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
