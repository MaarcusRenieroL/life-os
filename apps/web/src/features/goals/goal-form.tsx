import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LIFE_AREAS, LIFE_AREA_LABELS, type LifeArea } from '@/features/tasks/types';

import {
  GOAL_PRIORITIES,
  GOAL_PRIORITY_LABELS,
  GOAL_REVIEW_FREQUENCY_LABELS,
  type GoalReviewFrequency,
  type GoalSummary,
  type SaveGoalRequest,
} from './types';

const NONE = 'NONE';

export interface GoalFormValue {
  name: string;
  description: string;
  area: LifeArea | typeof NONE;
  priority: string;
  startDate: string | null;
  targetDate: string | null;
  reviewFrequency: GoalReviewFrequency | typeof NONE;
  weeklyWorkoutTarget: string;
}

function emptyValue(): GoalFormValue {
  return { name: '', description: '', area: NONE, priority: '3', startDate: null, targetDate: null, reviewFrequency: NONE, weeklyWorkoutTarget: '' };
}

function valueFrom(goal: GoalSummary): GoalFormValue {
  return {
    name: goal.name,
    description: goal.description ?? '',
    area: goal.area ?? NONE,
    priority: String(goal.priority),
    startDate: goal.startDate,
    targetDate: goal.targetDate,
    reviewFrequency: goal.reviewFrequency ?? NONE,
    weeklyWorkoutTarget: goal.progress.weeklyWorkoutTarget == null ? '' : String(goal.progress.weeklyWorkoutTarget),
  };
}

/** Form state that resets whenever the dialog opens - to the goal being edited, or blank. */
export function useGoalFormState(open: boolean, editing: GoalSummary | null) {
  const [value, setValue] = useState<GoalFormValue>(emptyValue);

  useEffect(() => {
    if (open) setValue(editing ? valueFrom(editing) : emptyValue());
  }, [open, editing]);

  return [value, setValue] as const;
}

export function validateGoalForm(value: GoalFormValue): string | null {
  if (!value.name.trim()) return 'Give the goal a name.';
  if (value.startDate && value.targetDate && value.targetDate < value.startDate) {
    return 'The target date can’t be before the start date.';
  }
  if (value.weeklyWorkoutTarget.trim() !== '') {
    const target = Number(value.weeklyWorkoutTarget);
    if (!Number.isInteger(target) || target < 1 || target > 14) return 'Workouts per week must be a whole number from 1 to 14.';
  }
  return null;
}

export function goalFormToRequest(value: GoalFormValue): SaveGoalRequest {
  return {
    name: value.name.trim(),
    description: value.description.trim() || null,
    area: value.area === NONE ? null : value.area,
    priority: Number(value.priority),
    startDate: value.startDate,
    targetDate: value.targetDate,
    reviewFrequency: value.reviewFrequency === NONE ? null : value.reviewFrequency,
    weeklyWorkoutTarget: value.weeklyWorkoutTarget.trim() === '' ? null : Number(value.weeklyWorkoutTarget),
  };
}

export function GoalForm({ value, onChange }: { value: GoalFormValue; onChange: (next: GoalFormValue) => void }) {
  function set<K extends keyof GoalFormValue>(key: K, next: GoalFormValue[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal-name">Name</Label>
        <Input id="goal-name" value={value.name} maxLength={200} onChange={(e) => set('name', e.target.value)} placeholder="Run a half marathon" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal-description">Description</Label>
        <Textarea
          id="goal-description"
          value={value.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Why does this matter? What does done look like?"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Area</Label>
          <Select value={value.area} onValueChange={(v) => set('area', v as GoalFormValue['area'])}>
            <SelectTrigger aria-label="Area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No area</SelectItem>
              {LIFE_AREAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {LIFE_AREA_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Priority</Label>
          <Select value={value.priority} onValueChange={(v) => set('priority', v)}>
            <SelectTrigger aria-label="Priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_PRIORITIES.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  {GOAL_PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Start date</Label>
          <DatePicker value={value.startDate} onChange={(d) => set('startDate', d)} placeholder="Defaults to today" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Target date</Label>
          <DatePicker value={value.targetDate} onChange={(d) => set('targetDate', d)} placeholder="No deadline" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="goal-workouts">Workouts per week</Label>
        <Input
          id="goal-workouts"
          type="number"
          inputMode="numeric"
          min={1}
          max={14}
          value={value.weeklyWorkoutTarget}
          onChange={(e) => set('weeklyWorkoutTarget', e.target.value)}
          placeholder="Optional - for fitness goals"
        />
        <p className="text-xs text-muted-foreground">Workouts you link to this goal count toward its progress against this weekly target.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Scheduled reviews</Label>
        <Select value={value.reviewFrequency} onValueChange={(v) => set('reviewFrequency', v as GoalFormValue['reviewFrequency'])}>
          <SelectTrigger aria-label="Review frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No scheduled reviews</SelectItem>
            {(Object.keys(GOAL_REVIEW_FREQUENCY_LABELS) as GoalReviewFrequency[]).map((f) => (
              <SelectItem key={f} value={f}>
                {GOAL_REVIEW_FREQUENCY_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">You’ll get a notification when a review is due.</p>
      </div>
    </div>
  );
}
