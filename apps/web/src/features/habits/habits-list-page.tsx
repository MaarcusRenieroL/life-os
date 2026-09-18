import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, List as ListIcon, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { HabitFormDialog } from './habit-form-dialog';
import { habitsApi } from './habits-api';
import { HABIT_STATUSES, HABIT_TYPE_LABELS, type Habit, type HabitStatus } from './types';

type StatusFilter = 'ALL' | HabitStatus;
type ViewMode = 'table' | 'card';

const UNCATEGORIZED = 'Uncategorized';

export function HabitsListPage() {
  const queryClient = useQueryClient();
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits', 'list'],
    queryFn: () => habitsApi.list(),
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [view, setView] = useState<ViewMode>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['habits'] });
  }

  const categories = useMemo(
    () => Array.from(new Set(habits.map((h) => h.category ?? UNCATEGORIZED))).sort(),
    [habits],
  );

  const filtered = useMemo(
    () =>
      habits.filter((h) => {
        if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && (h.category ?? UNCATEGORIZED) !== categoryFilter) return false;
        return true;
      }),
    [habits, statusFilter, categoryFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Habit[]>();
    for (const habit of filtered) {
      const key = habit.category ?? UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(habit);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function togglePause(habit: Habit) {
    try {
      if (habit.status === 'PAUSED') await habitsApi.resume(habit.id);
      else await habitsApi.pause(habit.id);
      invalidate();
    } catch {
      toast.error('Could not update the habit. Please try again.');
    }
  }

  async function archive(habit: Habit) {
    if (!confirm(`Archive "${habit.name}"?`)) return;
    try {
      await habitsApi.delete(habit.id);
      toast.success(`Archived "${habit.name}"`);
      invalidate();
    } catch {
      toast.error('Could not archive the habit. Please try again.');
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditing(habit);
    setFormOpen(true);
  }

  async function exportCsv() {
    try {
      await habitsApi.exportCsv();
    } catch {
      toast.error('Could not export habits. Please try again.');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void exportCsv()}>
            Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus /> New habit
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {HABIT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant={view === 'table' ? 'secondary' : 'ghost'} onClick={() => setView('table')}>
            <ListIcon className="size-4" />
          </Button>
          <Button size="icon" variant={view === 'card' ? 'secondary' : 'ghost'} onClick={() => setView('card')}>
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No habits here yet.{' '}
          <Button variant="link" className="px-0" onClick={openCreate}>
            Create one
          </Button>
          .
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {grouped.map(([category, categoryHabits]) => (
            <div key={category}>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {category}
              </h2>
              {view === 'table' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryHabits.map((habit) => (
                      <TableRow key={habit.id}>
                        <TableCell>
                          <Link to={`/habits/${habit.id}`} className="font-medium hover:underline">
                            {habit.icon && <span className="mr-1">{habit.icon}</span>}
                            {habit.name}
                          </Link>
                        </TableCell>
                        <TableCell>{HABIT_TYPE_LABELS[habit.type]}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{habit.frequencyType}</TableCell>
                        <TableCell>
                          <Badge variant={habit.status === 'ACTIVE' ? 'default' : 'outline'}>{habit.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(habit)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void togglePause(habit)}>
                            {habit.status === 'PAUSED' ? 'Resume' : 'Pause'}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void archive(habit)}>
                            Archive
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryHabits.map((habit) => (
                    <Card key={habit.id}>
                      <CardContent className="flex flex-col gap-2 py-4">
                        <div className="flex items-center justify-between">
                          <Link to={`/habits/${habit.id}`} className="font-medium hover:underline">
                            {habit.icon && <span className="mr-1">{habit.icon}</span>}
                            {habit.name}
                          </Link>
                          <Badge variant={habit.status === 'ACTIVE' ? 'default' : 'outline'}>{habit.status}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {HABIT_TYPE_LABELS[habit.type]} · {habit.frequencyType}
                        </span>
                        <div className="mt-auto flex items-center gap-1 border-t pt-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(habit)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void togglePause(habit)}>
                            {habit.status === 'PAUSED' ? 'Resume' : 'Pause'}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void archive(habit)}>
                            Archive
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <HabitFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={invalidate} />
    </div>
  );
}
