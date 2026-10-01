import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/date-time-picker';
import { ReminderPicker } from '@/components/reminder-picker';
import { SearchableSelect } from '@/components/searchable-select';
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
  ISO_TO_DAY_CODE,
  LIFE_AREAS,
  LIFE_AREA_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_RECURRENCE_PATTERNS,
  TASK_RECURRENCE_PATTERN_LABELS,
  type CreateTaskRequest,
  type DayOfWeek,
  type LifeArea,
  type SetRecurrenceRequest,
  type Task,
  type TaskPriority,
  type TaskRecurrencePattern,
} from './types';
import { useProjectsAndGoals } from './use-projects-goals';

export interface TaskFormValue {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string;
  area: LifeArea | null;
  projectId: string | null;
  goalId: string | null;
  tags: string;
  estimateMinutes: string;
  /** Not user-editable in the form body - set once at creation time (see "+ Subtask" in
   * task-list.tsx) and carried through untouched on every subsequent edit. */
  parentTaskId: string | null;
  repeat: boolean;
  recurrencePattern: TaskRecurrencePattern;
  recurrenceDaysOfWeek: DayOfWeek[];
  recurrenceDayOfMonth: string;
  recurrenceIntervalDays: string;
  recurrenceEndDate: string | null;
  reminderMinutesBefore: number[];
  customReminderMinutes: string;
}

function emptyValue(parentTaskId: string | null = null): TaskFormValue {
  return {
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: null,
    dueTime: '',
    area: null,
    projectId: null,
    goalId: null,
    tags: '',
    estimateMinutes: '',
    parentTaskId,
    repeat: false,
    recurrencePattern: 'DAILY',
    recurrenceDaysOfWeek: [],
    recurrenceDayOfMonth: '',
    recurrenceIntervalDays: '',
    recurrenceEndDate: null,
    reminderMinutesBefore: [],
    customReminderMinutes: '',
  };
}

function valueFromTask(task: Task): TaskFormValue {
  const config = task.recurrenceConfig ?? {};
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime ? task.dueTime.slice(0, 5) : '',
    area: task.area,
    projectId: task.projectId,
    goalId: task.goalId,
    tags: (task.tags ?? []).join(', '),
    estimateMinutes: task.estimateMinutes != null ? String(task.estimateMinutes) : '',
    parentTaskId: task.parentTaskId,
    repeat: task.recurrencePattern != null,
    recurrencePattern: task.recurrencePattern ?? 'DAILY',
    recurrenceDaysOfWeek: Array.isArray(config.daysOfWeek)
      ? (config.daysOfWeek as number[]).map((iso) => ISO_TO_DAY_CODE[iso]).filter((d): d is DayOfWeek => Boolean(d))
      : [],
    recurrenceDayOfMonth: typeof config.dayOfMonth === 'number' ? String(config.dayOfMonth) : '',
    recurrenceIntervalDays: typeof config.intervalDays === 'number' ? String(config.intervalDays) : '',
    recurrenceEndDate: task.recurrenceEndDate,
    reminderMinutesBefore: task.reminderMinutesBefore ?? [],
    customReminderMinutes: '',
  };
}

/** Built separately from taskFormToRequest since recurrence goes through its own endpoint
 * (POST /v1/tasks/{id}/recurrence), not the task create/update body - see task-form-dialog.tsx. */
export function taskFormToRecurrenceRequest(value: TaskFormValue): SetRecurrenceRequest {
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

export function taskFormToRequest(value: TaskFormValue): CreateTaskRequest {
  return {
    title: value.title.trim(),
    description: value.description.trim() || null,
    priority: value.priority,
    dueDate: value.dueDate,
    dueTime: value.dueDate && value.dueTime ? `${value.dueTime}:00` : null,
    allDay: !(value.dueDate && value.dueTime),
    area: value.area,
    projectId: value.projectId,
    goalId: value.goalId,
    parentTaskId: value.parentTaskId,
    tags: value.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    estimateMinutes: value.estimateMinutes ? Number(value.estimateMinutes) : null,
    reminderMinutesBefore: value.dueTime ? value.reminderMinutesBefore : [],
  };
}

export function validateTaskForm(value: TaskFormValue): string | null {
  if (!value.title.trim()) return 'Title is required.';
  if (value.dueTime && !value.dueDate) return 'Pick a due date before setting a time.';
  if (value.repeat && !value.dueDate) return 'Set a due date before making this task repeat.';
  if (value.repeat && value.recurrencePattern === 'WEEKLY' && value.recurrenceDaysOfWeek.length === 0) {
    return 'Pick at least one day of the week for a weekly repeat.';
  }
  if (value.repeat && value.recurrencePattern === 'CUSTOM' && !value.recurrenceIntervalDays) {
    return 'Enter the repeat interval in days.';
  }
  return null;
}

interface Props {
  value: TaskFormValue;
  onChange: (value: TaskFormValue) => void;
  /** Recurrence can only be set on a recurring definition, not on a generated occurrence (see
   * services/tasks' Task.java javadoc) - the dialog hides this section entirely in that case. */
  hideRecurrence?: boolean;
}

/** Pure controlled form body - the caller (a dialog) owns the value, validation call, and submit. */
export function TaskForm({ value, onChange, hideRecurrence }: Props) {
  const { projectOptions, goalOptions, createProject, createGoal } = useProjectsAndGoals();

  function patch(partial: Partial<TaskFormValue>) {
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
          <Label className="mb-1.5 block">Priority</Label>
          <Select value={value.priority} onValueChange={(v) => patch({ priority: v as TaskPriority })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block">Estimate (minutes)</Label>
          <Input
            type="number"
            min={0}
            value={value.estimateMinutes}
            onChange={(e) => patch({ estimateMinutes: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5 block">Due date</Label>
          <DatePicker value={value.dueDate} onChange={(d) => patch({ dueDate: d, dueTime: d ? value.dueTime : '' })} />
        </div>
        <div>
          <Label className="mb-1.5 block">Time (optional)</Label>
          <Input
            type="time"
            value={value.dueTime}
            disabled={!value.dueDate}
            onChange={(e) => patch({ dueTime: e.target.value })}
          />
        </div>
      </div>

      {value.dueTime && (
        <ReminderPicker value={value} patch={patch} />
      )}

      <div>
        <Label className="mb-1.5 block">Tags</Label>
        <Input
          value={value.tags}
          onChange={(e) => patch({ tags: e.target.value })}
          placeholder="comma, separated, tags"
        />
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
            Repeat this task
          </Label>

          {value.repeat && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <Label className="mb-1.5 block">Frequency</Label>
                <Select
                  value={value.recurrencePattern}
                  onValueChange={(v) => patch({ recurrencePattern: v as TaskRecurrencePattern })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_RECURRENCE_PATTERNS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {TASK_RECURRENCE_PATTERN_LABELS[p]}
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
                    placeholder={value.dueDate ? new Date(value.dueDate).getDate().toString() : undefined}
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

/** Hook-ish helper for dialogs: resets form state whenever the target task or open state changes. */
export function useTaskFormState(open: boolean, task: Task | null | undefined, parentTaskId: string | null = null) {
  const [value, setValue] = useState<TaskFormValue>(emptyValue(parentTaskId));

  useEffect(() => {
    if (!open) return;
    setValue(task ? valueFromTask(task) : emptyValue(parentTaskId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, parentTaskId]);

  return [value, setValue] as const;
}
