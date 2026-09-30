import { useState } from 'react';
import { toast } from 'sonner';

import { LinkedNotes } from '@/features/notes/linked-notes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { TaskForm, taskFormToRequest, useTaskFormState, validateTaskForm } from './task-form';
import { tasksApi } from './tasks-api';
import type { Task } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Task | null;
  /** Preset when creating a subtask via "+ Subtask" (see task-list.tsx) - not shown as an editable
   * field in the form body. */
  parentTaskId?: string | null;
  onSaved: (task: Task) => void;
}

export function TaskFormDialog({ open, onOpenChange, editing, parentTaskId = null, onSaved }: Props) {
  const [value, setValue] = useTaskFormState(open, editing, parentTaskId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const validationError = validateTaskForm(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const request = taskFormToRequest(value);
      const task = editing ? await tasksApi.update(editing.id, request) : await tasksApi.create(request);
      toast.success(editing ? `Updated "${task.title}"` : `Created "${task.title}"`);
      onSaved(task);
      onOpenChange(false);
    } catch {
      toast.error('Could not save the task. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit task' : parentTaskId ? 'New subtask' : 'New task'}</DialogTitle>
        </DialogHeader>
        <TaskForm value={value} onChange={setValue} />
        {editing && <LinkedNotes moduleType="TASK" moduleId={editing.id} defaultTitle={editing.title} />}
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
