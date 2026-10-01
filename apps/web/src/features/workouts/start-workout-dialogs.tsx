import { useQuery } from '@tanstack/react-query';
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/date-time-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { goalsApi } from '@/features/goals/goals-api';
import { getErrorMessage } from '@/lib/error';

import type { Routine, SessionDetail } from './types';
import { workoutsApi } from './workouts-api';

const NONE = 'NONE';
const BLANK = 'BLANK';

/** "Which goal does this workout count toward?" - goals are served by the tasks service; only
 * goals still in play are offered. */
export function GoalSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: goals = [] } = useQuery({ queryKey: ['goals', 'list', { forWorkouts: true }], queryFn: () => goalsApi.list() });
  const open = goals.filter((g) => g.status !== 'COMPLETED' && g.status !== 'ARCHIVED');

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Goal">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No goal</SelectItem>
        {open.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { NONE as NO_GOAL };

function RoutineSelect({ value, onChange, routines }: { value: string; onChange: (id: string) => void; routines: Routine[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Routine">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BLANK}>Blank workout</SelectItem>
        {routines.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Start a workout now, from a routine or blank, optionally counting toward a goal. */
export function StartWorkoutDialog({
  open,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (detail: SessionDetail) => void;
}) {
  const [routineId, setRoutineId] = useState(BLANK);
  const [name, setName] = useState('');
  const [goalId, setGoalId] = useState(NONE);
  const [saving, setSaving] = useState(false);
  const { data: routines = [] } = useQuery({ queryKey: ['workouts', 'routines'], queryFn: workoutsApi.routines, enabled: open });

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setRoutineId(BLANK);
      setName('');
      setGoalId(NONE);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const detail = await workoutsApi.startSession({
        routineId: routineId === BLANK ? null : routineId,
        name: name.trim() || null,
        goalId: goalId === NONE ? null : goalId,
      });
      onStarted(detail);
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start the workout.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a workout</DialogTitle>
          <DialogDescription>Pick a routine to pre-fill your sets, or start blank and add exercises as you go.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>Routine</Label>
          <RoutineSelect value={routineId} onChange={setRoutineId} routines={routines} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="workout-name">Name</Label>
          <Input id="workout-name" value={name} maxLength={120} placeholder="Defaults to the routine's name" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Counts toward goal</Label>
          <GoalSelect value={goalId} onChange={setGoalId} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? 'Starting…' : 'Start'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultSchedule(): string {
  // Tomorrow at 18:00 - a sensible "after work" default the user then adjusts.
  return setMinutes(setHours(startOfDay(addDays(new Date(), 1)), 18), 0).toISOString();
}

/** Schedule a workout for later - it appears on the calendar as a GYM event. `routine` may be
 * pre-selected (from the routines page) or left null to choose here. */
export function ScheduleWorkoutDialog({
  routine,
  open,
  onOpenChange,
  onScheduled,
}: {
  routine?: Routine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: () => void;
}) {
  const [routineId, setRoutineId] = useState(BLANK);
  const [name, setName] = useState('');
  const [when, setWhen] = useState<string | null>(defaultSchedule());
  const [goalId, setGoalId] = useState(NONE);
  const [saving, setSaving] = useState(false);
  const { data: routines = [] } = useQuery({ queryKey: ['workouts', 'routines'], queryFn: workoutsApi.routines, enabled: open });

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setRoutineId(routine?.id ?? BLANK);
      setName('');
      setWhen(defaultSchedule());
      setGoalId(NONE);
    }
  }

  async function submit() {
    if (!when) return;
    setSaving(true);
    try {
      await workoutsApi.scheduleSession({
        routineId: routineId === BLANK ? null : routineId,
        name: name.trim() || null,
        scheduledFor: when,
        goalId: goalId === NONE ? null : goalId,
      });
      toast.success('Workout scheduled - it’s on your calendar');
      onScheduled();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not schedule the workout.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a workout</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>Routine</Label>
          <RoutineSelect value={routineId} onChange={setRoutineId} routines={routines} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="schedule-name">Name</Label>
          <Input id="schedule-name" value={name} maxLength={120} placeholder="Defaults to the routine's name" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>When</Label>
          <DateTimePicker value={when} onChange={setWhen} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Counts toward goal</Label>
          <GoalSelect value={goalId} onChange={setGoalId} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !when}>
            {saving ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
