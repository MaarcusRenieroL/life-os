import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/error';
import { useDebouncedValue } from '@/lib/use-debounced-value';

import { workoutsApi } from './workouts-api';
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXERCISE_CATEGORIES,
  EXERCISE_CATEGORY_LABELS,
  type Equipment,
  type ExerciseCategory,
} from './types';

const ALL = 'ALL';

function NewExerciseDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('CHEST');
  const [equipment, setEquipment] = useState<Equipment>('BARBELL');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName('');
      setCategory('CHEST');
      setEquipment('BARBELL');
      setInstructions('');
    }
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await workoutsApi.createExercise({ name: name.trim(), category, equipment, instructions: instructions.trim() || null });
      toast.success(`Added “${name.trim()}”`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add the exercise. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New exercise</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exercise-name">Name</Label>
          <Input id="exercise-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExerciseCategory)}>
              <SelectTrigger aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EXERCISE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Equipment</Label>
            <Select value={equipment} onValueChange={(v) => setEquipment(v as Equipment)}>
              <SelectTrigger aria-label="Equipment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT.map((e) => (
                  <SelectItem key={e} value={e}>
                    {EQUIPMENT_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="exercise-instructions">Notes</Label>
          <Textarea id="exercise-instructions" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Cues, setup, variations…" />
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

/** The searchable exercise library - the seeded built-ins plus your own custom ones. */
export function ExercisesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | typeof ALL>(ALL);
  const [equipment, setEquipment] = useState<Equipment | typeof ALL>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();
  const debounced = useDebouncedValue(search, 250);

  const filters = {
    q: debounced.trim() || undefined,
    category: category === ALL ? undefined : category,
    equipment: equipment === ALL ? undefined : equipment,
  };
  const { data: exercises = [], isLoading } = useQuery({ queryKey: ['workouts', 'exercises', filters], queryFn: () => workoutsApi.exercises(filters) });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['workouts', 'exercises'] });
  }

  async function remove(id: string, name: string) {
    if (!(await confirm({ title: `Delete “${name}”?`, confirmLabel: 'Delete' }))) return;
    try {
      await workoutsApi.deleteExercise(id);
      invalidate();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the exercise.'));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Exercises</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> New exercise
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search exercises…" aria-label="Search exercises" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as ExerciseCategory | typeof ALL)}>
          <SelectTrigger className="min-w-36" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {EXERCISE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {EXERCISE_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={equipment} onValueChange={(v) => setEquipment(v as Equipment | typeof ALL)}>
          <SelectTrigger className="min-w-36" aria-label="Filter by equipment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All equipment</SelectItem>
            {EQUIPMENT.map((e) => (
              <SelectItem key={e} value={e}>
                {EQUIPMENT_LABELS[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <EmptyState className="mt-6" message="No exercises match those filters." />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{exercise.name}</p>
                <p className="text-xs text-muted-foreground">
                  {EXERCISE_CATEGORY_LABELS[exercise.category]} · {EQUIPMENT_LABELS[exercise.equipment]}
                </p>
              </div>
              {exercise.custom && (
                <span className="flex shrink-0 items-center gap-1">
                  <Badge variant="outline">Custom</Badge>
                  <Button size="icon" variant="ghost" aria-label={`Delete ${exercise.name}`} onClick={() => void remove(exercise.id, exercise.name)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <NewExerciseDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={invalidate} />
      {dialog}
    </div>
  );
}
