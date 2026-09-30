import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SearchableSelect } from '@/components/searchable-select';
import { DatePicker } from '@/components/date-time-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProjectsAndGoals } from '@/features/tasks/use-projects-goals';

import {
  DAY_CODE_TO_ISO,
  DAYS_OF_WEEK,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  EVENT_RECURRENCE_PATTERNS,
  EVENT_RECURRENCE_PATTERN_LABELS,
  ISO_TO_DAY_CODE,
  LIFE_AREAS,
  LIFE_AREA_LABELS,
  REMINDER_PRESETS,
  type CalendarEvent,
  type CreateEventRequest,
  type DayOfWeek,
  type EventCategory,
  type EventRecurrencePattern,
  type FreeBusy,
  type LifeArea,
  type SetEventRecurrenceRequest,
} from './types';

export interface EventFormValue {
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  allDay: boolean;
  date: string;
  startTime: string;
  endTime: string;
  endDate: string | null;
  freeBusy: FreeBusy;
  area: LifeArea | null;
  projectId: string | null;
  goalId: string | null;
  repeat: boolean;
  recurrencePattern: EventRecurrencePattern;
  recurrenceDaysOfWeek: DayOfWeek[];
  recurrenceDayOfMonth: string;
  recurrenceIntervalDays: string;
  recurrenceEndDate: string | null;
  reminderMinutesBefore: number[];
  customReminderMinutes: string;
}

function defaultTimes(): { startTime: string; endTime: string } {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const start = now.toTimeString().slice(0, 5);
  now.setHours(now.getHours() + 1);
  const end = now.toTimeString().slice(0, 5);
  return { startTime: start, endTime: end };
}

function emptyValue(initialDate?: string): EventFormValue {
  return {
    title: '',
    description: '',
    location: '',
    category: 'OTHER',
    allDay: false,
    date: initialDate ?? new Date().toISOString().slice(0, 10),
    endDate: null,
    freeBusy: 'BUSY',
    area: null,
    projectId: null,
    goalId: null,
    repeat: false,
    recurrencePattern: 'DAILY',
    recurrenceDaysOfWeek: [],
    recurrenceDayOfMonth: '',
    recurrenceIntervalDays: '',
    recurrenceEndDate: null,
    reminderMinutesBefore: [],
    customReminderMinutes: '',
    ...defaultTimes(),
  };
}

function recurrenceFields(event: CalendarEvent) {
  const config = event.recurrenceConfig ?? {};
  return {
    repeat: event.recurrencePattern != null,
    recurrencePattern: event.recurrencePattern ?? ('DAILY' as EventRecurrencePattern),
    recurrenceDaysOfWeek: Array.isArray(config.daysOfWeek)
      ? (config.daysOfWeek as number[]).map((iso) => ISO_TO_DAY_CODE[iso]).filter((d): d is DayOfWeek => Boolean(d))
      : [],
    recurrenceDayOfMonth: typeof config.dayOfMonth === 'number' ? String(config.dayOfMonth) : '',
    recurrenceIntervalDays: typeof config.intervalDays === 'number' ? String(config.intervalDays) : '',
    recurrenceEndDate: event.recurrenceEndDate,
  };
}

function valueFromEvent(event: CalendarEvent): EventFormValue {
  if (event.allDay) {
    return {
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      category: event.category,
      allDay: true,
      date: event.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: event.endDate,
      freeBusy: event.freeBusy,
      area: event.area,
      projectId: event.projectId,
      goalId: event.goalId,
      ...recurrenceFields(event),
      reminderMinutesBefore: [],
      customReminderMinutes: '',
      ...defaultTimes(),
    };
  }
  const start = event.startAt ? new Date(event.startAt) : new Date();
  const end = event.endAt ? new Date(event.endAt) : start;
  return {
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    category: event.category,
    allDay: false,
    date: start.toISOString().slice(0, 10),
    endDate: null,
    freeBusy: event.freeBusy,
    area: event.area,
    projectId: event.projectId,
    goalId: event.goalId,
    ...recurrenceFields(event),
    reminderMinutesBefore: event.reminderMinutesBefore ?? [],
    customReminderMinutes: '',
    startTime: start.toTimeString().slice(0, 5),
    endTime: end.toTimeString().slice(0, 5),
  };
}

/** Built separately from eventFormToRequest since recurrence goes through its own endpoint
 * (POST /v1/calendar/events/{id}/recurrence), not the event create/update body - see
 * event-form-dialog.tsx. */
export function eventFormToRecurrenceRequest(value: EventFormValue): SetEventRecurrenceRequest {
  const config: Record<string, unknown> = {};
  if (value.recurrencePattern === 'WEEKLY' && value.recurrenceDaysOfWeek.length > 0) {
    config.daysOfWeek = value.recurrenceDaysOfWeek.map((d) => DAY_CODE_TO_ISO[d]);
  }
  if (value.recurrencePattern === 'MONTHLY' && value.recurrenceDayOfMonth) {
    config.dayOfMonth = Number(value.recurrenceDayOfMonth);
  }
  if (value.recurrencePattern === 'CUSTOM') {
    config.intervalDays = Number(value.recurrenceIntervalDays) || 1;
  }
  return {
    pattern: value.recurrencePattern,
    config,
    endDate: value.recurrenceEndDate,
  };
}

export function eventFormToRequest(value: EventFormValue): CreateEventRequest {
  if (value.allDay) {
    return {
      title: value.title.trim(),
      description: value.description.trim() || null,
      location: value.location.trim() || null,
      category: value.category,
      allDay: true,
      startDate: value.date,
      endDate: value.endDate ?? value.date,
      freeBusy: value.freeBusy,
      area: value.area,
      projectId: value.projectId,
      goalId: value.goalId,
    };
  }
  const start = new Date(`${value.date}T${value.startTime || '09:00'}:00`);
  const end = new Date(`${value.date}T${value.endTime || '10:00'}:00`);
  return {
    title: value.title.trim(),
    description: value.description.trim() || null,
    location: value.location.trim() || null,
    category: value.category,
    allDay: false,
    startAt: start.toISOString(),
    endAt: (end > start ? end : new Date(start.getTime() + 60 * 60 * 1000)).toISOString(),
    freeBusy: value.freeBusy,
    area: value.area,
    projectId: value.projectId,
    goalId: value.goalId,
    reminderMinutesBefore: value.reminderMinutesBefore,
  };
}

export function validateEventForm(value: EventFormValue): string | null {
  if (!value.title.trim()) return 'Title is required.';
  if (!value.date) return 'Date is required.';
  if (value.repeat && value.recurrencePattern === 'WEEKLY' && value.recurrenceDaysOfWeek.length === 0) {
    return 'Pick at least one day of the week for a weekly repeat.';
  }
  if (value.repeat && value.recurrencePattern === 'CUSTOM' && !value.recurrenceIntervalDays) {
    return 'Enter the repeat interval in days.';
  }
  return null;
}

interface Props {
  value: EventFormValue;
  onChange: (value: EventFormValue) => void;
  /** Recurrence can only be set on a recurring definition, not on a generated occurrence - the
   * dialog hides this section entirely in that case (see event-form-dialog.tsx). */
  hideRecurrence?: boolean;
}

/** Pure controlled form body - the caller (a dialog) owns the value, validation call, and submit. */
export function EventForm({ value, onChange, hideRecurrence }: Props) {
  const { projectOptions, goalOptions, createProject, createGoal } = useProjectsAndGoals();

  function patch(partial: Partial<EventFormValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Label className="mb-1.5 block">Title</Label>
        <Input value={value.title} onChange={(e) => patch({ title: e.target.value })} />
      </div>

      <div>
        <Label className="mb-1.5 block">Description</Label>
        <Textarea value={value.description} onChange={(e) => patch({ description: e.target.value })} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block">Category</Label>
          <Select value={value.category} onValueChange={(v) => patch({ category: v as EventCategory })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {EVENT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Location</Label>
          <Input value={value.location} onChange={(e) => patch({ location: e.target.value })} />
        </div>
      </div>

      <Label className="flex items-center gap-1.5 text-sm font-normal">
        <Checkbox checked={value.allDay} onCheckedChange={(checked) => patch({ allDay: Boolean(checked) })} />
        All-day
      </Label>

      {value.allDay ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block">Start date</Label>
            <DatePicker value={value.date} onChange={(d) => patch({ date: d ?? value.date })} />
          </div>
          <div>
            <Label className="mb-1.5 block">End date</Label>
            <DatePicker value={value.endDate} onChange={(d) => patch({ endDate: d })} placeholder="Same day" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="mb-1.5 block">Date</Label>
            <DatePicker value={value.date} onChange={(d) => patch({ date: d ?? value.date })} />
          </div>
          <div>
            <Label className="mb-1.5 block">Start time</Label>
            <Input type="time" value={value.startTime} onChange={(e) => patch({ startTime: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block">End time</Label>
            <Input type="time" value={value.endTime} onChange={(e) => patch({ endTime: e.target.value })} />
          </div>
        </div>
      )}

      {!value.allDay && (
        <div>
          <Label className="mb-1.5 block">Reminders</Label>
          <div className="flex flex-wrap gap-3">
            {REMINDER_PRESETS.map((preset) => (
              <Label key={preset.minutes} className="flex items-center gap-1.5 text-sm font-normal">
                <Checkbox
                  checked={value.reminderMinutesBefore.includes(preset.minutes)}
                  onCheckedChange={() => {
                    const set = new Set(value.reminderMinutesBefore);
                    if (set.has(preset.minutes)) set.delete(preset.minutes);
                    else set.add(preset.minutes);
                    patch({ reminderMinutesBefore: Array.from(set) });
                  }}
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
              value={value.customReminderMinutes}
              onChange={(e) => patch({ customReminderMinutes: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!value.customReminderMinutes}
              onClick={() => {
                const minutes = Number(value.customReminderMinutes);
                if (!minutes || value.reminderMinutesBefore.includes(minutes)) return;
                patch({
                  reminderMinutesBefore: [...value.reminderMinutesBefore, minutes],
                  customReminderMinutes: '',
                });
              }}
            >
              Add
            </Button>
            {value.reminderMinutesBefore
              .filter((m) => !REMINDER_PRESETS.some((p) => p.minutes === m))
              .map((m) => (
                <Badge key={m} variant="outline" className="gap-1">
                  {m} min before
                  <button
                    onClick={() => patch({ reminderMinutesBefore: value.reminderMinutesBefore.filter((x) => x !== m) })}
                    aria-label={`Remove ${m}-minute reminder`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
          </div>
        </div>
      )}

      <div>
        <Label className="mb-1.5 block">Availability</Label>
        <Select value={value.freeBusy} onValueChange={(v) => patch({ freeBusy: v as FreeBusy })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BUSY">Busy</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="mb-1.5 block">Area</Label>
          <Select
            value={value.area ?? '__none__'}
            onValueChange={(v) => patch({ area: v === '__none__' ? null : (v as LifeArea) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {LIFE_AREAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {LIFE_AREA_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Project</Label>
          <SearchableSelect
            options={projectOptions}
            value={value.projectId}
            onChange={(id) => patch({ projectId: id })}
            onCreate={createProject}
            placeholder="No project"
            searchPlaceholder="Search projects…"
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Goal</Label>
          <SearchableSelect
            options={goalOptions}
            value={value.goalId}
            onChange={(id) => patch({ goalId: id })}
            onCreate={createGoal}
            placeholder="No goal"
            searchPlaceholder="Search goals…"
          />
        </div>
      </div>

      {!hideRecurrence && (
        <div className="rounded-md border p-3">
          <Label className="flex items-center gap-1.5 text-sm font-normal">
            <Checkbox checked={value.repeat} onCheckedChange={(checked) => patch({ repeat: Boolean(checked) })} />
            Repeat this event
          </Label>

          {value.repeat && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <Label className="mb-1.5 block">Frequency</Label>
                <Select
                  value={value.recurrencePattern}
                  onValueChange={(v) => patch({ recurrencePattern: v as EventRecurrencePattern })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_RECURRENCE_PATTERNS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {EVENT_RECURRENCE_PATTERN_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {value.recurrencePattern === 'WEEKLY' && (
                <div>
                  <Label className="mb-1.5 block">Days of the week</Label>
                  <div className="flex flex-wrap gap-3">
                    {DAYS_OF_WEEK.map((day) => (
                      <Label key={day} className="flex items-center gap-1.5 text-sm font-normal">
                        <Checkbox
                          checked={value.recurrenceDaysOfWeek.includes(day)}
                          onCheckedChange={() => {
                            const set = new Set(value.recurrenceDaysOfWeek);
                            if (set.has(day)) set.delete(day);
                            else set.add(day);
                            patch({ recurrenceDaysOfWeek: Array.from(set) });
                          }}
                        />
                        {day}
                      </Label>
                    ))}
                  </div>
                </div>
              )}

              {value.recurrencePattern === 'MONTHLY' && (
                <div>
                  <Label className="mb-1.5 block">Day of month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={value.recurrenceDayOfMonth}
                    onChange={(e) => patch({ recurrenceDayOfMonth: e.target.value })}
                    placeholder={value.date ? new Date(value.date).getDate().toString() : undefined}
                  />
                </div>
              )}

              {value.recurrencePattern === 'CUSTOM' && (
                <div>
                  <Label className="mb-1.5 block">Repeat every N days</Label>
                  <Input
                    type="number"
                    min={1}
                    value={value.recurrenceIntervalDays}
                    onChange={(e) => patch({ recurrenceIntervalDays: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label className="mb-1.5 block">End date</Label>
                <DatePicker
                  value={value.recurrenceEndDate}
                  onChange={(d) => patch({ recurrenceEndDate: d })}
                  placeholder="Never ends"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Hook-ish helper for dialogs: resets form state whenever the target event or open state changes. */
export function useEventFormState(open: boolean, event: CalendarEvent | null | undefined, initialDate?: string) {
  const [value, setValue] = useState<EventFormValue>(emptyValue(initialDate));

  useEffect(() => {
    if (!open) return;
    setValue(event ? valueFromEvent(event) : emptyValue(initialDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event, initialDate]);

  return [value, setValue] as const;
}
