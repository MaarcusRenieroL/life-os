import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { habitsApi } from './habits-api';
import { DAY_CODE_TO_ISO, DAYS_OF_WEEK, ISO_TO_DAY_CODE, type DayOfWeek, type HabitReminder } from './types';

function emptyDraft() {
  // Deliberate exception to the Calendar+Popover date-picker rule: there is no shadcn
  // time-picker primitive installed here, and building one is out of scope for this
  // module - a plain <input type="time"> is used for reminder times only.
  return { reminderTime: '09:00', daysOfWeek: [] as string[], enabled: true };
}

function ReminderRow({ habitId, reminder }: { habitId: string; reminder: HabitReminder }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['habits', habitId, 'reminders'] });
  }

  async function toggleEnabled() {
    setSaving(true);
    try {
      await habitsApi.updateReminder(habitId, reminder.id, { enabled: !reminder.enabled });
      invalidate();
    } catch {
      toast.error('Could not update the reminder.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this reminder?')) return;
    try {
      await habitsApi.deleteReminder(habitId, reminder.id);
      invalidate();
    } catch {
      toast.error('Could not delete the reminder.');
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{reminder.reminderTime}</span>
        <span className="text-xs text-muted-foreground">
          {reminder.daysOfWeek && reminder.daysOfWeek.length > 0
            ? reminder.daysOfWeek.map((iso) => ISO_TO_DAY_CODE[iso]).join(', ')
            : 'Every day'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={reminder.enabled} onCheckedChange={() => void toggleEnabled()} disabled={saving} />
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove()}>
          Delete
        </Button>
      </div>
    </div>
  );
}

export function HabitReminderForm({ habitId }: { habitId: string }) {
  const queryClient = useQueryClient();
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['habits', habitId, 'reminders'],
    queryFn: () => habitsApi.reminders(habitId),
  });

  // Derived from when the user actually logs completions, not a hardcoded default. Purely a
  // suggestion - it prefills the draft time, it doesn't change how reminders are scheduled.
  const { data: loggingTimes } = useQuery({
    queryKey: ['habits', 'analytics', 'logging-times'],
    queryFn: habitsApi.loggingTimes,
  });

  const [draft, setDraft] = useState(emptyDraft());
  const [creating, setCreating] = useState(false);

  const suggestedTime = loggingTimes?.suggestedReminderTime?.slice(0, 5) ?? null;

  function toggleDay(day: string) {
    setDraft((d) => ({
      ...d,
      daysOfWeek: d.daysOfWeek.includes(day) ? d.daysOfWeek.filter((x) => x !== day) : [...d.daysOfWeek, day],
    }));
  }

  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      await habitsApi.createReminder(habitId, {
        reminderTime: draft.reminderTime,
        daysOfWeek:
          draft.daysOfWeek.length > 0
            ? draft.daysOfWeek.map((day) => DAY_CODE_TO_ISO[day as DayOfWeek])
            : null,
        enabled: draft.enabled,
      });
      setDraft(emptyDraft());
      queryClient.invalidateQueries({ queryKey: ['habits', habitId, 'reminders'] });
    } catch {
      toast.error('Could not create the reminder.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reminders…</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reminders set.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.id} habitId={habitId} reminder={reminder} />
          ))}
        </div>
      )}

      <div className="rounded-md border p-3">
        <Label className="mb-1.5 block text-xs font-medium uppercase text-muted-foreground">New reminder</Label>
        <div className="flex flex-wrap items-center gap-3">
          {/* Deliberate exception: no shadcn time-picker primitive is installed, so a native
              time input is used here instead of the Calendar+Popover pattern. */}
          <input
            type="time"
            value={draft.reminderTime}
            onChange={(e) => setDraft((d) => ({ ...d, reminderTime: e.target.value }))}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <Label key={day} className="flex items-center gap-1 text-xs font-normal">
                <Checkbox checked={draft.daysOfWeek.includes(day)} onCheckedChange={() => toggleDay(day)} />
                {day}
              </Label>
            ))}
          </div>
          <Button size="sm" onClick={() => void create()} disabled={creating}>
            Add reminder
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Leave days unchecked to repeat every day.</p>
        {suggestedTime && suggestedTime !== draft.reminderTime && (
          <p className="mt-1 text-xs text-muted-foreground">
            You log most completions around {suggestedTime} ({loggingTimes?.sampleSize} logs in the last 90
            days).{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setDraft((d) => ({ ...d, reminderTime: suggestedTime }))}
            >
              Use {suggestedTime}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
