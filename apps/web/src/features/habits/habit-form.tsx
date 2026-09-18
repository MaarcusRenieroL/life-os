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

import {
  DAY_CODE_TO_ISO,
  DAYS_OF_WEEK,
  HABIT_FREQUENCY_TYPES,
  HABIT_FREQUENCY_TYPE_LABELS,
  HABIT_TYPES,
  HABIT_TYPE_LABELS,
  ISO_TO_DAY_CODE,
  type CreateHabitRequest,
  type DayOfWeek,
  type Habit,
  type HabitFrequencyType,
  type HabitType,
} from './types';

export interface HabitFormValue {
  name: string;
  description: string;
  type: HabitType;
  category: string;
  frequencyType: HabitFrequencyType;
  daysOfWeek: string[];
  timesPerPeriod: string;
  intervalDays: string;
  targetValue: string;
  targetUnit: string;
  startDate: string | null;
  endDate: string | null;
  icon: string;
  color: string;
  priority: string;
}

function emptyValue(): HabitFormValue {
  return {
    name: '',
    description: '',
    type: 'BINARY',
    category: '',
    frequencyType: 'DAILY',
    daysOfWeek: [],
    timesPerPeriod: '',
    intervalDays: '',
    targetValue: '',
    targetUnit: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: null,
    icon: '',
    color: '',
    priority: '',
  };
}

function valueFromHabit(habit: Habit): HabitFormValue {
  const config = habit.frequencyConfig ?? {};
  return {
    name: habit.name,
    description: habit.description ?? '',
    type: habit.type,
    category: habit.category ?? '',
    frequencyType: habit.frequencyType,
    daysOfWeek: Array.isArray(config.daysOfWeek)
      ? (config.daysOfWeek as number[]).map((iso) => ISO_TO_DAY_CODE[iso]).filter((day): day is DayOfWeek => Boolean(day))
      : [],
    timesPerPeriod:
      typeof config.timesPerWeek === 'number'
        ? String(config.timesPerWeek)
        : typeof config.timesPerMonth === 'number'
          ? String(config.timesPerMonth)
          : '',
    intervalDays: typeof config.intervalDays === 'number' ? String(config.intervalDays) : '',
    targetValue: habit.targetValue != null ? String(habit.targetValue) : '',
    targetUnit: habit.targetUnit ?? '',
    startDate: habit.startDate,
    endDate: habit.endDate,
    icon: habit.icon ?? '',
    color: habit.color ?? '',
    priority: habit.priority != null ? String(habit.priority) : '',
  };
}

function buildFrequencyConfig(value: HabitFormValue): Record<string, unknown> {
  switch (value.frequencyType) {
    case 'WEEKLY_DAYS':
      return { daysOfWeek: value.daysOfWeek.map((day) => DAY_CODE_TO_ISO[day as DayOfWeek]) };
    case 'X_PER_WEEK':
      return { timesPerWeek: Number(value.timesPerPeriod) || 0 };
    case 'X_PER_MONTH':
      return { timesPerMonth: Number(value.timesPerPeriod) || 0 };
    case 'CUSTOM_INTERVAL':
      return { intervalDays: Number(value.intervalDays) || 1 };
    case 'DAILY':
    default:
      return {};
  }
}

export function habitFormToRequest(value: HabitFormValue): CreateHabitRequest {
  const hasTarget = value.type === 'COUNT' || value.type === 'DURATION';
  return {
    name: value.name.trim(),
    description: value.description.trim() || null,
    type: value.type,
    category: value.category.trim() || null,
    frequencyType: value.frequencyType,
    frequencyConfig: buildFrequencyConfig(value),
    targetValue: hasTarget && value.targetValue ? Number(value.targetValue) : null,
    targetUnit: hasTarget && value.targetUnit ? value.targetUnit.trim() : null,
    startDate: value.startDate ?? new Date().toISOString().slice(0, 10),
    endDate: value.endDate,
    icon: value.icon.trim() || null,
    color: value.color.trim() || null,
    priority: value.priority ? Number(value.priority) : null,
  };
}

export function validateHabitForm(value: HabitFormValue): string | null {
  if (!value.name.trim()) return 'Name is required.';
  if (!value.type) return 'Type is required.';
  if (!value.frequencyType) return 'Frequency is required.';
  if (!value.startDate) return 'Start date is required.';
  if (value.frequencyType === 'WEEKLY_DAYS' && value.daysOfWeek.length === 0) {
    return 'Pick at least one day of the week.';
  }
  if ((value.frequencyType === 'X_PER_WEEK' || value.frequencyType === 'X_PER_MONTH') && !value.timesPerPeriod) {
    return 'Enter how many times.';
  }
  if (value.frequencyType === 'CUSTOM_INTERVAL' && !value.intervalDays) {
    return 'Enter the interval in days.';
  }
  return null;
}

interface Props {
  habit?: Habit | null;
  onChange: (value: HabitFormValue) => void;
  value: HabitFormValue;
}

/** Pure controlled form body - the caller (a dialog) owns the value, validation call, and submit. */
export function HabitForm({ value, onChange }: Props) {
  function patch(partial: Partial<HabitFormValue>) {
    onChange({ ...value, ...partial });
  }

  const showTargetFields = value.type === 'COUNT' || value.type === 'DURATION';

  function toggleDay(day: string) {
    const set = new Set(value.daysOfWeek);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    patch({ daysOfWeek: Array.from(set) });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Name</Label>
        <Input value={value.name} onChange={(e) => patch({ name: e.target.value })} />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea value={value.description} onChange={(e) => patch({ description: e.target.value })} rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Type</Label>
          <Select value={value.type} onValueChange={(v) => patch({ type: v as HabitType })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HABIT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {HABIT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Input value={value.category} onChange={(e) => patch({ category: e.target.value })} placeholder="e.g. Health" />
        </div>
      </div>

      {showTargetFields && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Target value</Label>
            <Input
              type="number"
              value={value.targetValue}
              onChange={(e) => patch({ targetValue: e.target.value })}
            />
          </div>
          <div>
            <Label>Target unit</Label>
            <Input
              value={value.targetUnit}
              onChange={(e) => patch({ targetUnit: e.target.value })}
              placeholder="e.g. reps, minutes"
            />
          </div>
        </div>
      )}

      <div>
        <Label>Frequency</Label>
        <Select value={value.frequencyType} onValueChange={(v) => patch({ frequencyType: v as HabitFrequencyType })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HABIT_FREQUENCY_TYPES.map((f) => (
              <SelectItem key={f} value={f}>
                {HABIT_FREQUENCY_TYPE_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {value.frequencyType === 'WEEKLY_DAYS' && (
        <div>
          <Label className="mb-1.5 block">Days of the week</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS_OF_WEEK.map((day) => (
              <Label key={day} className="flex items-center gap-1.5 text-sm font-normal">
                <Checkbox checked={value.daysOfWeek.includes(day)} onCheckedChange={() => toggleDay(day)} />
                {day}
              </Label>
            ))}
          </div>
        </div>
      )}

      {(value.frequencyType === 'X_PER_WEEK' || value.frequencyType === 'X_PER_MONTH') && (
        <div>
          <Label>{value.frequencyType === 'X_PER_WEEK' ? 'Times per week' : 'Times per month'}</Label>
          <Input
            type="number"
            min={1}
            value={value.timesPerPeriod}
            onChange={(e) => patch({ timesPerPeriod: e.target.value })}
          />
        </div>
      )}

      {value.frequencyType === 'CUSTOM_INTERVAL' && (
        <div>
          <Label>Repeat every N days</Label>
          <Input
            type="number"
            min={1}
            value={value.intervalDays}
            onChange={(e) => patch({ intervalDays: e.target.value })}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block">Start date</Label>
          <DatePicker value={value.startDate} onChange={(d) => patch({ startDate: d })} />
        </div>
        <div>
          <Label className="mb-1.5 block">End date</Label>
          <DatePicker value={value.endDate} onChange={(d) => patch({ endDate: d })} placeholder="No end date" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Icon</Label>
          <Input value={value.icon} onChange={(e) => patch({ icon: e.target.value })} placeholder="emoji" />
        </div>
        <div>
          <Label>Color</Label>
          <Input value={value.color} onChange={(e) => patch({ color: e.target.value })} placeholder="#22c55e" />
        </div>
        <div>
          <Label>Priority</Label>
          <Input type="number" value={value.priority} onChange={(e) => patch({ priority: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

/** Hook-ish helper for dialogs: resets form state whenever the target habit or open state changes. */
export function useHabitFormState(open: boolean, habit: Habit | null | undefined) {
  const [value, setValue] = useState<HabitFormValue>(emptyValue());

  useEffect(() => {
    if (!open) return;
    setValue(habit ? valueFromHabit(habit) : emptyValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, habit]);

  return [value, setValue] as const;
}
