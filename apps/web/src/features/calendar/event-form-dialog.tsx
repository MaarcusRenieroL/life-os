import { useState } from 'react';
import { toast } from 'sonner';

import { LinkedNotes } from '@/features/notes/linked-notes';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/confirm-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { calendarApi } from './calendar-api';
import { EventForm, eventFormToRecurrenceRequest, eventFormToRequest, useEventFormState, validateEventForm } from './event-form';
import type { CalendarEvent } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CalendarEvent | null;
  /** Prefills the date when creating from a clicked day cell (month/week/day views). */
  initialDate?: string;
  onSaved: (event: CalendarEvent) => void;
}

export function EventFormDialog({ open, onOpenChange, editing, initialDate, onSaved }: Props) {
  const [value, setValue] = useEventFormState(open, editing, initialDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  async function submit() {
    const validationError = validateEventForm(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const request = eventFormToRequest(value);
      let event = editing ? await calendarApi.update(editing.id, request) : await calendarApi.create(request);

      const wasRecurring = editing?.recurrencePattern != null;
      if (value.repeat) {
        event = await calendarApi.setRecurrence(event.id, eventFormToRecurrenceRequest(value));
      } else if (wasRecurring) {
        await calendarApi.stopRecurrence(event.id);
      }

      toast.success(editing ? `Updated "${event.title}"` : `Created "${event.title}"`);
      onSaved(event);
      onOpenChange(false);
    } catch {
      toast.error('Could not save the event. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirm({ title: `Delete "${editing.title}"? This cannot be undone.`, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await calendarApi.delete(editing.id);
      toast.success(`Deleted "${editing.title}"`);
      onSaved(editing);
      onOpenChange(false);
    } catch {
      toast.error('Could not delete the event. Please try again.');
    }
  }

  async function duplicate() {
    if (!editing) return;
    try {
      const copy = await calendarApi.duplicate(editing.id);
      toast.success(`Duplicated "${editing.title}"`);
      onSaved(copy);
      onOpenChange(false);
    } catch {
      toast.error('Could not duplicate the event. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit event' : 'New event'}</DialogTitle>
        </DialogHeader>
        <EventForm value={value} onChange={setValue} hideRecurrence={editing?.recurringParentId != null} />
        {editing && <LinkedNotes moduleType="EVENT" moduleId={editing.id} defaultTitle={editing.title} />}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="sm:justify-between">
          {editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" className="text-destructive" onClick={() => void remove()}>
                Delete
              </Button>
              <Button variant="ghost" onClick={() => void duplicate()}>
                Duplicate
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      {dialog}
    </Dialog>
  );
}
