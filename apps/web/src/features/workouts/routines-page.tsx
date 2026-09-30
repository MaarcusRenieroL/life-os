import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Copy, Pencil, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/error';

import { RoutineDialog, NewRoutineButton } from './routine-dialog';
import { ScheduleWorkoutDialog } from './start-workout-dialogs';
import type { Routine } from './types';
import { formatNumber } from './utils';
import { workoutsApi } from './workouts-api';

function RoutineSummary({ routine }: { routine: Routine }) {
  if (routine.exercises.length === 0) return <p className="text-xs text-muted-foreground">No exercises yet</p>;
  return (
    <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      {routine.exercises.map((e) => (
        <li key={e.exerciseId} className="flex justify-between gap-2">
          <span className="truncate">{e.exerciseName}</span>
          <span className="shrink-0 tabular-nums">
            {e.targetSets}×{e.targetReps}
            {e.targetWeight != null ? ` @ ${formatNumber(e.targetWeight, 2)}kg` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Your routines, plus the pre-built templates (Push/Pull/Legs, Upper/Lower, Full Body) which you
 * copy into your own routines before using or editing. */
export function RoutinesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirmDialog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [scheduling, setScheduling] = useState<Routine | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const { data: routines = [], isLoading } = useQuery({ queryKey: ['workouts', 'routines'], queryFn: workoutsApi.routines });
  const { data: templates = [] } = useQuery({ queryKey: ['workouts', 'templates'], queryFn: workoutsApi.templates });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['workouts', 'routines'] });
  }

  async function start(routine: Routine) {
    setStarting(routine.id);
    try {
      const detail = await workoutsApi.startSession({ routineId: routine.id });
      void queryClient.invalidateQueries({ queryKey: ['workouts', 'sessions'] });
      navigate(`/workouts/session/${detail.session.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not start the workout.'));
    } finally {
      setStarting(null);
    }
  }

  async function copy(template: Routine) {
    try {
      const created = await workoutsApi.copyTemplate(template.id);
      toast.success(`Added “${created.name}” to your routines`);
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not copy the template.'));
    }
  }

  async function remove(routine: Routine) {
    if (!(await confirm({ title: `Delete “${routine.name}”?`, description: 'Past workouts done from it are kept.', confirmLabel: 'Delete' }))) return;
    try {
      await workoutsApi.deleteRoutine(routine.id);
      invalidate();
    } catch {
      toast.error('Could not delete the routine. Please try again.');
    }
  }

  const groups = new Map<string, Routine[]>();
  for (const template of templates) {
    const key = template.templateGroup ?? 'Other';
    groups.set(key, [...(groups.get(key) ?? []), template]);
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
          <NewRoutineButton
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          />
        </div>

        {isLoading ? (
          <Skeleton className="mt-4 h-40 w-full" />
        ) : routines.length === 0 ? (
          <EmptyState className="mt-4" message="No routines yet - build one, or copy a template below." />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((routine) => (
              <Card key={routine.id}>
                <CardContent className="flex h-full flex-col gap-3 py-4">
                  <div>
                    <p className="font-medium">{routine.name}</p>
                    {routine.description && <p className="text-xs text-muted-foreground">{routine.description}</p>}
                  </div>
                  <RoutineSummary routine={routine} />
                  <div className="mt-auto flex flex-wrap items-center gap-1 border-t pt-2">
                    <Button size="sm" disabled={starting === routine.id || routine.exercises.length === 0} onClick={() => void start(routine)}>
                      <Play /> Start
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setScheduling(routine)}>
                      <CalendarPlus /> Schedule
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${routine.name}`}
                      onClick={() => {
                        setEditing(routine);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${routine.name}`} onClick={() => void remove(routine)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading className="mb-3">templates</SectionHeading>
        <div className="flex flex-col gap-6">
          {[...groups.entries()].map(([group, items]) => (
            <div key={group}>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="flex h-full flex-col gap-3 py-4">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && <p className="text-xs text-muted-foreground">{template.description}</p>}
                      </div>
                      <RoutineSummary routine={template} />
                      <div className="mt-auto border-t pt-2">
                        <Button size="sm" variant="outline" onClick={() => void copy(template)}>
                          <Copy /> Use this template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <RoutineDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={invalidate} />
      <ScheduleWorkoutDialog
        routine={scheduling}
        open={scheduling !== null}
        onOpenChange={(open) => !open && setScheduling(null)}
        onScheduled={() => void queryClient.invalidateQueries({ queryKey: ['workouts', 'sessions'] })}
      />
      {dialog}
    </div>
  );
}
