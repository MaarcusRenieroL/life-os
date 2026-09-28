import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/date-time-picker';
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

import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type CalendarEvent, type CreateEventRequest, type EventCategory, type FreeBusy } from './types';

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
  areaId: string;
  projectId: string;
  goalId: string;
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
    areaId: '',
    projectId: '',
    goalId: '',
    ...defaultTimes(),
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
      areaId: event.areaId ?? '',
      projectId: event.projectId ?? '',
      goalId: event.goalId ?? '',
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
    areaId: event.areaId ?? '',
    projectId: event.projectId ?? '',
    goalId: event.goalId ?? '',
    startTime: start.toTimeString().slice(0, 5),
    endTime: end.toTimeString().slice(0, 5),
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
      areaId: value.areaId.trim() || null,
      projectId: value.projectId.trim() || null,
      goalId: value.goalId.trim() || null,
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
    areaId: value.areaId.trim() || null,
    projectId: value.projectId.trim() || null,
    goalId: value.goalId.trim() || null,
  };
}

export function validateEventForm(value: EventFormValue): string | null {
  if (!value.title.trim()) return 'Title is required.';
  if (!value.date) return 'Date is required.';
  return null;
}

interface Props {
  value: EventFormValue;
  onChange: (value: EventFormValue) => void;
}

/** Pure controlled form body - the caller (a dialog) owns the value, validation call, and submit. */
export function EventForm({ value, onChange }: Props) {
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
          <Label className="mb-1.5 block">Area ID</Label>
          <Input value={value.areaId} onChange={(e) => patch({ areaId: e.target.value })} placeholder="optional" />
        </div>
        <div>
          <Label className="mb-1.5 block">Project ID</Label>
          <Input value={value.projectId} onChange={(e) => patch({ projectId: e.target.value })} placeholder="optional" />
        </div>
        <div>
          <Label className="mb-1.5 block">Goal ID</Label>
          <Input value={value.goalId} onChange={(e) => patch({ goalId: e.target.value })} placeholder="optional" />
        </div>
      </div>
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
