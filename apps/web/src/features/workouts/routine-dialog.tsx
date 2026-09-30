import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/error';

import type { Routine } from './types';
import { parseNumber } from './utils';
import { workoutsApi } from './workouts-api';

interface Row {
  exerciseId: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  rest: string;
}

/** Create or edit a routine: a name plus an ordered list of exercises with target sets, reps,
 * weight and rest. Saving replaces the routine's whole exercise list in the order shown. */
export function RoutineDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Routine | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: exercises = [] } = useQuery({ queryKey: ['workouts', 'exercises', {}], queryFn: () => workoutsApi.exercises(), enabled: open });

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? '');
      setDescription(editing?.description ?? '');
      setRows(
        (editing?.exercises ?? []).map((e) => ({
          exerciseId: e.exerciseId,
          name: e.exerciseName,
          sets: String(e.targetSets),
          reps: String(e.targetReps),
          weight: e.targetWeight == null ? '' : String(e.targetWeight),
          rest: String(e.restSeconds),
        })),
      );
    }
  }

  const usedIds = new Set(rows.map((r) => r.exerciseId));
  const options = exercises.filter((e) => !usedIds.has(e.id)).map((e) => ({ id: e.id, label: e.name }));

  function patch(index: number, change: Partial<Row>) {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const request = {
        name: name.trim(),
        description: description.trim() || null,
        exercises: rows.map((row) => ({
          exerciseId: row.exerciseId,
          targetSets: parseNumber(row.sets) ?? undefined,
          targetReps: parseNumber(row.reps) ?? undefined,
          targetWeight: parseNumber(row.weight),
          restSeconds: parseNumber(row.rest) ?? undefined,
        })),
      };
      if (editing) await workoutsApi.updateRoutine(editing.id, request);
      else await workoutsApi.createRoutine(request);
      toast.success(editing ? 'Routine updated' : 'Routine created');
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the routine. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit routine' : 'New routine'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="routine-name">Name</Label>
          <Input id="routine-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Push day" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="routine-description">Description</Label>
          <Textarea id="routine-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Exercises</Label>
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No exercises yet.</p>}
          {rows.map((row, index) => (
            <div key={row.exerciseId} className="rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {index + 1}. {row.name}
                </span>
                <span className="flex shrink-0">
                  <Button size="icon" variant="ghost" aria-label={`Move ${row.name} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Move ${row.name} down`} disabled={index === rows.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Remove ${row.name}`} onClick={() => setRows(rows.filter((_, i) => i !== index))}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(
                  [
                    ['sets', 'Sets', '1'],
                    ['reps', 'Reps', '1'],
                    ['weight', 'Weight (kg)', 'any'],
                    ['rest', 'Rest (s)', '5'],
                  ] as const
                ).map(([key, label, step]) => (
                  <div key={key} className="flex flex-col gap-1">
                    <Label className="text-[11px] text-muted-foreground">{label}</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={step}
                      aria-label={`${row.name} ${label}`}
                      value={row[key]}
                      onChange={(e) => patch(index, { [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <SearchableSelect
            options={options}
            value={null}
            onChange={(id) => {
              const exercise = exercises.find((e) => e.id === id);
              if (exercise) setRows([...rows, { exerciseId: exercise.id, name: exercise.name, sets: '3', reps: '10', weight: '', rest: '90' }]);
            }}
            placeholder="Add an exercise…"
            searchPlaceholder="Search exercises…"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewRoutineButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <Plus /> New routine
    </Button>
  );
}
