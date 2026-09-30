import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Named reminder offsets. Anything else is a "custom" number of minutes typed in free-form. */
export const REMINDER_PRESETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'At time' },
  { minutes: 15, label: '15 min before' },
  { minutes: 30, label: '30 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
];

interface ReminderFields {
  reminderMinutesBefore: number[];
  customReminderMinutes: string;
}

/**
 * The reminder chooser shared by the task and event forms: tick presets, or add a custom offset.
 * Works on any form state that carries the two reminder fields, updating them through the form's
 * own `patch`.
 */
export function ReminderPicker({ value, patch }: { value: ReminderFields; patch: (change: Partial<ReminderFields>) => void }) {
  const { reminderMinutesBefore: minutes, customReminderMinutes: custom } = value;
  const customOffsets = minutes.filter((m) => !REMINDER_PRESETS.some((p) => p.minutes === m));

  return (
    <div>
      <Label className="mb-1.5 block">Reminders</Label>
      <div className="flex flex-wrap gap-3">
        {REMINDER_PRESETS.map((preset) => (
          <Label key={preset.minutes} className="flex items-center gap-1.5 text-sm font-normal">
            <Checkbox
              checked={minutes.includes(preset.minutes)}
              onCheckedChange={() =>
                patch({ reminderMinutesBefore: minutes.includes(preset.minutes) ? minutes.filter((m) => m !== preset.minutes) : [...minutes, preset.minutes] })
              }
            />
            {preset.label}
          </Label>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="number"
          min={1}
          className="w-32"
          placeholder="Custom (min)"
          value={custom}
          onChange={(e) => patch({ customReminderMinutes: e.target.value })}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!custom}
          onClick={() => {
            const offset = Number(custom);
            if (!offset || minutes.includes(offset)) return;
            patch({ reminderMinutesBefore: [...minutes, offset], customReminderMinutes: '' });
          }}
        >
          Add
        </Button>
        {customOffsets.map((m) => (
          <Badge key={m} variant="outline" className="gap-1">
            {m} min before
            <button onClick={() => patch({ reminderMinutesBefore: minutes.filter((x) => x !== m) })} aria-label={`Remove ${m}-minute reminder`}>
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
