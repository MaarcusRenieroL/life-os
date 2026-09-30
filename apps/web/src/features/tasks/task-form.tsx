import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/date-time-picker';
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
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type CreateTaskRequest,
  type Task,
  type TaskPriority,
} from './types';

export interface TaskFormValue {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string;
  areaId: string;
  projectId: string;
  goalId: string;
  tags: string;
  estimateMinutes: string;
  /** Not user-editable in the form body - set once at creation time (see "+ Subtask" in
   * task-list.tsx) and carried through untouched on every subsequent edit. */
  parentTaskId: string | null;
}

function emptyValue(parentTaskId: string | null = null): TaskFormValue {
  return {
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: null,
    dueTime: '',
    areaId: '',
    projectId: '',
    goalId: '',
    tags: '',
    estimateMinutes: '',
    parentTaskId,
  };
}

function valueFromTask(task: Task): TaskFormValue {
  return {
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime ? task.dueTime.slice(0, 5) : '',
    areaId: task.areaId ?? '',
    projectId: task.projectId ?? '',
    goalId: task.goalId ?? '',
    tags: (task.tags ?? []).join(', '),
    estimateMinutes: task.estimateMinutes != null ? String(task.estimateMinutes) : '',
    parentTaskId: task.parentTaskId,
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
    areaId: value.areaId.trim() || null,
    projectId: value.projectId.trim() || null,
    goalId: value.goalId.trim() || null,
    parentTaskId: value.parentTaskId,
    tags: value.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    estimateMinutes: value.estimateMinutes ? Number(value.estimateMinutes) : null,
  };
}

export function validateTaskForm(value: TaskFormValue): string | null {
  if (!value.title.trim()) return 'Title is required.';
  if (value.dueTime && !value.dueDate) return 'Pick a due date before setting a time.';
  return null;
}

interface Props {
  value: TaskFormValue;
  onChange: (value: TaskFormValue) => void;
}

/** Pure controlled form body - the caller (a dialog) owns the value, validation call, and submit. */
export function TaskForm({ value, onChange }: Props) {
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
