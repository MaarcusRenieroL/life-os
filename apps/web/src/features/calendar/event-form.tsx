import { useEffect, useState } from 'react';

import { SearchableSelect } from '@/components/searchable-select';
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
import { useProjectsAndGoals } from '@/features/tasks/use-projects-goals';

import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, LIFE_AREAS, LIFE_AREA_LABELS, type CalendarEvent, type CreateEventRequest, type EventCategory, type FreeBusy, type LifeArea } from './types';

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
      area: event.area,
      projectId: event.projectId,
      goalId: event.goalId,
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
