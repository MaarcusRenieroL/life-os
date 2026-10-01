import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { LayoutGrid, List as ListIcon, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { tasksApi } from '@/features/tasks/tasks-api';

import { DifficultyRating, StreakBadge } from './habit-badges';
import { HabitFormDialog } from './habit-form-dialog';
import { habitsApi } from './habits-api';
import { HABIT_TYPE_LABELS, type Habit, type HabitStatus } from './types';

type StatusFilter = 'ALL' | HabitStatus;
type ViewMode = 'table' | 'card';

const UNCATEGORIZED = 'Uncategorized';

const LISTED_STATUSES: HabitStatus[] = ['ACTIVE', 'PAUSED'];

export function HabitsListPage() {
  const queryClient = useQueryClient();
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits', 'list'],
    queryFn: () => habitsApi.list(),
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<ViewMode>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['habits'] });
  }

  const categories = useMemo(
    () => Array.from(new Set(habits.map((h) => h.category ?? UNCATEGORIZED))).sort(),
    [habits],
  );

  // One streak request per habit is a waterfall on a page that can list dozens, so the badges come
  // from the analytics aggregate instead - one call that already carries every habit's streaks.
  const { data: analytics } = useQuery({
    queryKey: ['habits', 'analytics', 12],
    queryFn: () => habitsApi.analytics(12),
  });

  const streaksByHabitId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of analytics?.habitPerformance ?? []) {
      map.set(entry.habitId, entry.currentStreak);
    }
    return map;
  }, [analytics]);

  const filtered = useMemo(
    () =>
      habits.filter((h) => {
        if (h.status === 'ARCHIVED') return false;
        if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL' && (h.category ?? UNCATEGORIZED) !== categoryFilter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (
            !h.name.toLowerCase().includes(query) &&
            !h.description?.toLowerCase().includes(query) &&
            !h.why?.toLowerCase().includes(query)
          ) {
            return false;
          }
        }
        return true;
      }),
    [habits, statusFilter, categoryFilter, searchQuery],
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

  // "Auto-create task from habit" integration point - one-directional, same pattern as notes'
  // "Create task from note": creates a standalone task seeded from the habit, no ongoing link.
  async function createTaskFromHabit(habit: Habit) {
    try {
      const task = await tasksApi.create({ title: habit.name, description: habit.why ?? habit.description ?? undefined });
      toast.success(`Created task "${task.title}"`);
    } catch {
      toast.error('Could not create a task from this habit. Please try again.');
    }
  }

  async function deleteHabit(habit: Habit) {
    const ok = await confirm({ title: `Delete "${habit.name}"? This cannot be undone.`, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await habitsApi.delete(habit.id);
      toast.success(`Deleted "${habit.name}"`);
      invalidate();
    } catch {
      toast.error('Could not delete the habit. Please try again.');
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

  const columns = useMemo<ColumnDef<Habit>[]>(
    () => [
      {
        accessorKey: 'name',
        meta: { title: 'Habit', filter: { type: 'text' } },
        cell: ({ row }) => (
          <div>
            <Link to={`/habits/${row.original.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
              {row.original.icon && <span className="mr-1">{row.original.icon}</span>}
              {row.original.name}
            </Link>
            {row.original.why && <p className="max-w-72 truncate text-xs text-muted-foreground">{row.original.why}</p>}
          </div>
        ),
      },
      {
        id: 'category',
        accessorFn: (h) => h.category ?? UNCATEGORIZED,
        meta: { title: 'Category', filter: { type: 'select' } },
      },
      {
        id: 'type',
        accessorFn: (h) => HABIT_TYPE_LABELS[h.type],
        meta: { title: 'Type', filter: { type: 'select' } },
      },
      {
        accessorKey: 'frequencyType',
        meta: { title: 'Frequency', filter: { type: 'select' } },
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.frequencyType}</span>,
      },
      {
        accessorKey: 'difficulty',
        meta: { title: 'Difficulty', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => <DifficultyRating difficulty={row.original.difficulty} />,
      },
      {
        id: 'streak',
        accessorFn: (h) => streaksByHabitId.get(h.id) ?? 0,
        meta: { title: 'Streak (days)', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => <StreakBadge days={streaksByHabitId.get(row.original.id) ?? 0} />,
      },
      {
        accessorKey: 'status',
        meta: { title: 'Status', filter: { type: 'select' } },
        cell: ({ row }) => <Badge variant={row.original.status === 'ACTIVE' ? 'default' : 'outline'}>{row.original.status}</Badge>,
      },
      {
        accessorKey: 'priority',
        meta: { title: 'Priority', align: 'right', filter: { type: 'number' } },
        cell: ({ row }) => row.original.priority ?? '—',
      },
      {
        accessorKey: 'startDate',
        meta: { title: 'Starts', filter: { type: 'date' } },
        cell: ({ row }) => row.original.startDate.slice(0, 10),
      },
      {
        accessorKey: 'endDate',
        meta: { title: 'Ends', filter: { type: 'date' } },
        cell: ({ row }) => row.original.endDate?.slice(0, 10) ?? '—',
      },
      {
        accessorKey: 'createdAt',
        meta: { title: 'Created', filter: { type: 'date' } },
        cell: ({ row }) => row.original.createdAt.slice(0, 10),
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => openEdit(row.original)}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => void togglePause(row.original)}>
              {row.original.status === 'PAUSED' ? 'Resume' : 'Pause'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void createTaskFromHabit(row.original)}>Create task</Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteHabit(row.original)}>Delete</Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streaksByHabitId],
  );

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
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search habits by name, description, or why..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {LISTED_STATUSES.map((s) => (
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
          <Button
            size="icon"
            variant={view === 'table' ? 'secondary' : 'ghost'}
            onClick={() => setView('table')}
            aria-label="Table view"
          >
            <ListIcon className="size-4" />
          </Button>
          <Button
            size="icon"
            variant={view === 'card' ? 'secondary' : 'ghost'}
            onClick={() => setView('card')}
            aria-label="Card view"
          >
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
          {view === 'table' && (
            <DataGrid
              tableId="habits.list"
              data={filtered}
              columns={columns}
              getRowId={(h) => h.id}
              initialSorting={[{ id: 'name', desc: false }]}
              initialVisibility={{ difficulty: false, startDate: false, endDate: false, priority: false, createdAt: false }}
              exportName="habits"
              searchPlaceholder="Search habits…"
              hidePagination={filtered.length <= 10}
            />
          )}
          {grouped.map(([category, categoryHabits]) => (
            <div key={category} className={view === 'table' ? 'hidden' : undefined}>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {category}
              </h2>
              {view === 'table' ? null : (
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
                        {habit.why && (
                          <p className="line-clamp-2 border-l-2 pl-2 text-xs text-muted-foreground italic">
                            {habit.why}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <StreakBadge days={streaksByHabitId.get(habit.id) ?? 0} />
                          <DifficultyRating difficulty={habit.difficulty} />
                        </div>
                        <div className="mt-auto flex items-center gap-1 border-t pt-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(habit)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void togglePause(habit)}>
                            {habit.status === 'PAUSED' ? 'Resume' : 'Pause'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void createTaskFromHabit(habit)}>
                            Create task
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void deleteHabit(habit)}>
                            Delete
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
      {dialog}
    </div>
  );
}
