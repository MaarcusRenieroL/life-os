import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Check, Play, Plus, Target, Trash2, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { SearchableSelect } from '@/components/searchable-select';
import { SectionHeading } from '@/components/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { goalsApi } from '@/features/goals/goals-api';
import { getErrorMessage } from '@/lib/error';
import { cn } from '@/lib/utils';

import { GoalSelect, NO_GOAL } from './start-workout-dialogs';
import type { SessionDetail, SessionExercise, SessionSet } from './types';
import { useNow } from './use-now';
import { formatDuration, formatNumber, formatVolume, formatWeight, parseNumber } from './utils';
import { workoutsApi } from './workouts-api';

const DEFAULT_REST_SECONDS = 90;

function SetRow({
  sessionId,
  set,
  editable,
  onSaved,
  onCompleted,
}: {
  sessionId: string;
  set: SessionSet;
  editable: boolean;
  onSaved: (detail: SessionDetail, set: SessionSet) => void;
  onCompleted: (restSeconds: number) => void;
}) {
  // Inputs show what was logged, falling back to the target so "same as planned" is one tap.
  const [reps, setReps] = useState(String(set.actualReps ?? set.targetReps ?? ''));
  const [weight, setWeight] = useState(String(set.actualWeight ?? set.targetWeight ?? ''));
  const [rest, setRest] = useState(String(set.restSeconds ?? ''));
  const [busy, setBusy] = useState(false);

  // Editing a set that's already ticked re-saves it on blur - but only if a value actually
  // changed, so tabbing through or clicking the tick button doesn't fire a redundant save that
  // could race with the click's own request.
  function saveIfChanged() {
    if (!set.completed) return;
    const changed =
      parseNumber(reps) !== set.actualReps || parseNumber(weight) !== set.actualWeight || parseNumber(rest) !== set.restSeconds;
    if (changed) void save(true);
  }

  async function save(completed: boolean) {
    setBusy(true);
    try {
      const detail = await workoutsApi.updateSet(sessionId, set.id, {
        actualReps: parseNumber(reps),
        actualWeight: parseNumber(weight),
        restSeconds: parseNumber(rest),
        completed,
      });
      const updated = detail.exercises.flatMap((e) => e.sets).find((s) => s.id === set.id) ?? set;
      onSaved(detail, updated);
      if (completed && !set.completed) onCompleted(parseNumber(rest) ?? DEFAULT_REST_SECONDS);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the set.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const detail = await workoutsApi.deleteSet(sessionId, set.id);
      onSaved(detail, set);
    } catch {
      toast.error('Could not remove the set.');
    } finally {
      setBusy(false);
    }
  }

  const target =
    set.targetReps != null ? `${set.targetReps}${set.targetWeight != null ? ` × ${formatNumber(set.targetWeight, 2)} kg` : ' reps'}` : '—';

  if (!editable) {
    return (
      <li className="flex items-center justify-between gap-2 text-sm">
        <span className="w-10 text-muted-foreground">Set {set.setNumber}</span>
        <span className="flex-1 tabular-nums">
          {set.actualReps ?? '—'} reps × {formatWeight(set.actualWeight)}
        </span>
        {set.pr && (
          <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
            <Trophy className="size-3" /> PR
          </Badge>
        )}
      </li>
    );
  }

  return (
    <li className={cn('flex flex-wrap items-center gap-2 rounded-md p-1', set.completed && 'bg-primary/5')}>
      <span className="w-10 shrink-0 text-xs text-muted-foreground">Set {set.setNumber}</span>
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground tabular-nums sm:inline" title="Target">
        {target}
      </span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        className="h-9 w-16"
        aria-label={`Set ${set.setNumber} reps`}
        placeholder="reps"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={saveIfChanged}
      />
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        className="h-9 w-20"
        aria-label={`Set ${set.setNumber} weight`}
        placeholder="kg"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={saveIfChanged}
      />
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        className="h-9 w-20"
        aria-label={`Set ${set.setNumber} rest seconds`}
        placeholder="rest s"
        value={rest}
        onChange={(e) => setRest(e.target.value)}
        onBlur={saveIfChanged}
      />
      <Button
        size="icon"
        variant={set.completed ? 'default' : 'outline'}
        disabled={busy}
        aria-label={set.completed ? `Mark set ${set.setNumber} not done` : `Complete set ${set.setNumber}`}
        onClick={() => void save(!set.completed)}
      >
        <Check className="size-4" />
      </Button>
      {set.pr && (
        <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <Trophy className="size-3" /> PR
        </Badge>
      )}
      <Button size="icon" variant="ghost" disabled={busy} aria-label={`Remove set ${set.setNumber}`} onClick={() => void remove()}>
        <X className="size-4" />
      </Button>
    </li>
  );
}

function ExerciseBlock({
  sessionId,
  exercise,
  editable,
  onSaved,
  onCompleted,
}: {
  sessionId: string;
  exercise: SessionExercise;
  editable: boolean;
  onSaved: (detail: SessionDetail, set: SessionSet) => void;
  onCompleted: (restSeconds: number) => void;
}) {
  async function addSet() {
    try {
      const detail = await workoutsApi.addSet(sessionId, exercise.exerciseId);
      onSaved(detail, exercise.sets[exercise.sets.length - 1]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add a set.'));
    }
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="font-medium">{exercise.exerciseName}</p>
          {exercise.previousBest != null && (
            <span className="text-xs text-muted-foreground">Best: {formatWeight(exercise.previousBest)}</span>
          )}
        </div>
        <ul className="flex flex-col gap-1.5">
          {exercise.sets.map((set) => (
            <SetRow
              key={`${set.id}-${set.completed}-${set.actualWeight}-${set.actualReps}`}
              sessionId={sessionId}
              set={set}
              editable={editable}
              onSaved={onSaved}
              onCompleted={onCompleted}
            />
          ))}
        </ul>
        {editable && (
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => void addSet()}>
            <Plus /> Add set
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function RestTimer({ until, onDismiss }: { until: number; onDismiss: () => void }) {
  const now = useNow(250);
  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');

  return (
    <div className="fixed right-4 bottom-4 z-40 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg" role="timer" aria-label="Rest timer">
      <div>
        <p className="text-[10px] tracking-widest text-muted-foreground uppercase">Rest</p>
        <p className="text-2xl font-semibold tabular-nums">
          {remaining === 0 ? 'Go!' : `${minutes}:${seconds}`}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onDismiss}>
        {remaining === 0 ? 'Dismiss' : 'Skip'}
      </Button>
    </div>
  );
}

function FinishDialog({
  open,
  onOpenChange,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finish workout</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Sets you didn’t tick are dropped from the log.</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="finish-notes">Notes</Label>
          <Textarea id="finish-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep going
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void onFinish(notes).finally(() => setSaving(false));
            }}
          >
            {saving ? 'Finishing…' : 'Finish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One workout, in whichever state it's in: a scheduled plan, the live logging screen, or the
 * finished summary. */
export function WorkoutSessionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [finishOpen, setFinishOpen] = useState(false);
  const [restUntil, setRestUntil] = useState<number | null>(null);

  const key = ['workouts', 'session', id];
  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: () => workoutsApi.session(id), enabled: id !== '' });
  const now = useNow(1000, data?.session.status === 'IN_PROGRESS');
  const { data: goals = [] } = useQuery({ queryKey: ['goals', 'list', { forWorkouts: true }], queryFn: () => goalsApi.list() });

  function setDetail(detail: SessionDetail) {
    queryClient.setQueryData(key, detail);
  }

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: ['workouts'] });
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
  }

  function onSetSaved(detail: SessionDetail, set: SessionSet) {
    const before = data?.exercises.flatMap((e) => e.sets).find((s) => s.id === set.id);
    setDetail(detail);
    if (set.pr && !before?.pr) toast.success('New personal record!');
  }

  async function finish(notes: string) {
    try {
      setDetail(await workoutsApi.completeSession(id, notes));
      setFinishOpen(false);
      setRestUntil(null);
      refreshAll();
      toast.success('Workout complete');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not finish the workout.'));
    }
  }

  async function discard() {
    const ok = await confirm({
      title: data?.session.status === 'COMPLETED' ? 'Delete this workout?' : 'Discard this workout?',
      description: 'Its logged sets and any records set during it are removed.',
      confirmLabel: data?.session.status === 'COMPLETED' ? 'Delete' : 'Discard',
    });
    if (!ok) return;
    try {
      await workoutsApi.deleteSession(id);
      refreshAll();
      navigate('/workouts');
    } catch {
      toast.error('Could not delete the workout. Please try again.');
    }
  }

  async function startPlanned() {
    try {
      setDetail(await workoutsApi.startPlanned(id));
      refreshAll();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start the workout.'));
    }
  }

  async function addExercise(exerciseId: string) {
    try {
      setDetail(await workoutsApi.addSet(id, exerciseId));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add the exercise.'));
    }
  }

  async function setGoal(goalId: string) {
    if (!data) return;
    try {
      setDetail(await workoutsApi.updateSession(id, { name: data.session.name, notes: data.session.notes, goalId: goalId === NO_GOAL ? null : goalId }));
      refreshAll();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the workout.'));
    }
  }

  const { data: allExercises = [] } = useQuery({
    queryKey: ['workouts', 'exercises', {}],
    queryFn: () => workoutsApi.exercises(),
    enabled: data?.session.status === 'IN_PROGRESS',
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">This workout couldn’t be found.</p>
        <Button variant="link" className="px-0" asChild>
          <Link to="/workouts">Back to workouts</Link>
        </Button>
      </div>
    );
  }

  const { session, exercises } = data;
  const live = session.status === 'IN_PROGRESS';
  const elapsed = live && session.startedAt ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000)) : session.durationSeconds;
  const goal = goals.find((g) => g.id === session.goalId);
  const usedIds = new Set(exercises.map((e) => e.exerciseId));
  const options = allExercises.filter((e) => !usedIds.has(e.id)).map((e) => ({ id: e.id, label: e.name }));
  const prs = exercises.flatMap((e) => e.sets.filter((s) => s.pr).map((s) => ({ exercise: e.exerciseName, set: s })));

  return (
    <div className="flex flex-col gap-4 pb-16">
      <div>
        <Link to="/workouts" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Workouts
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{session.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={live ? 'default' : 'outline'}>{session.status === 'IN_PROGRESS' ? 'In progress' : session.status === 'PLANNED' ? 'Scheduled' : 'Completed'}</Badge>
              {session.status === 'PLANNED' && session.scheduledFor && <span>{format(parseISO(session.scheduledFor), 'EEE, MMM d · HH:mm')}</span>}
              {session.status === 'COMPLETED' && session.completedAt && <span>{format(parseISO(session.completedAt), 'EEE, MMM d · HH:mm')}</span>}
              {elapsed != null && session.status !== 'PLANNED' && <span className="tabular-nums">{formatDuration(elapsed)}</span>}
              {goal && (
                <Link to={`/goals/${goal.id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                  <Target className="size-3.5" /> {goal.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {session.status === 'PLANNED' && (
              <Button onClick={() => void startPlanned()}>
                <Play /> Start
              </Button>
            )}
            {live && <Button onClick={() => setFinishOpen(true)}>Finish workout</Button>}
            <Button variant="ghost" className="text-destructive" onClick={() => void discard()}>
              <Trash2 /> {session.status === 'COMPLETED' ? 'Delete' : session.status === 'PLANNED' ? 'Cancel' : 'Discard'}
            </Button>
          </div>
        </div>
      </div>

      {session.status !== 'COMPLETED' && (
        <div className="max-w-xs">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Counts toward goal</Label>
          <GoalSelect value={session.goalId ?? NO_GOAL} onChange={(v) => void setGoal(v)} />
        </div>
      )}

      {session.status === 'COMPLETED' && (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
            <Summary label="Duration" value={formatDuration(session.durationSeconds)} />
            <Summary label="Sets" value={String(session.completedSets)} />
            <Summary label="Volume" value={formatVolume(session.volume)} />
            <Summary label="Records" value={String(session.prCount)} />
          </CardContent>
        </Card>
      )}

      {prs.length > 0 && session.status === 'COMPLETED' && (
        <div className="flex flex-wrap gap-2">
          {prs.map(({ exercise, set }) => (
            <Badge key={set.id} variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <Trophy className="size-3" /> {exercise}: {formatWeight(set.actualWeight)} × {set.actualReps}
            </Badge>
          ))}
        </div>
      )}

      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">{live ? 'No exercises yet - add one below.' : 'No sets in this workout.'}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((exercise) => (
            <ExerciseBlock
              key={exercise.exerciseId}
              sessionId={id}
              exercise={exercise}
              editable={live}
              onSaved={onSetSaved}
              onCompleted={(seconds) => seconds > 0 && setRestUntil(Date.now() + seconds * 1000)}
            />
          ))}
        </div>
      )}

      {live && (
        <div className="max-w-sm">
          <SectionHeading className="mb-2">add exercise</SectionHeading>
          <SearchableSelect
            options={options}
            value={null}
            onChange={(exerciseId) => exerciseId && void addExercise(exerciseId)}
            placeholder="Add an exercise…"
            searchPlaceholder="Search exercises…"
          />
        </div>
      )}

      {session.status === 'COMPLETED' && session.notes && (
        <div>
          <SectionHeading className="mb-1">notes</SectionHeading>
          <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}

      {restUntil != null && live && <RestTimer until={restUntil} onDismiss={() => setRestUntil(null)} />}
      <FinishDialog open={finishOpen} onOpenChange={setFinishOpen} onFinish={finish} />
      {dialog}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
