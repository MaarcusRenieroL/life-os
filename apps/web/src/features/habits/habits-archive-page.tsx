import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { DifficultyRating } from './habit-badges';
import { habitsApi } from './habits-api';
import { HABIT_TYPE_LABELS, type Habit } from './types';

/**
 * Archived habits. Deleting a habit soft-deletes it to ARCHIVED on the backend, so without this
 * view those rows were unreachable - and unrestorable - from the UI. Restoring reuses the existing
 * resume endpoint, which sets the status back to ACTIVE.
 */
export function HabitsArchivePage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data: habits = [], isLoading } = useQuery({
    queryKey: ['habits', 'list', { status: 'ARCHIVED' }],
    queryFn: () => habitsApi.list({ status: 'ARCHIVED' }),
  });

  const filtered = useMemo(() => {
    if (!searchQuery) return habits;
    const query = searchQuery.toLowerCase();
    return habits.filter(
      (habit) =>
        habit.name.toLowerCase().includes(query) ||
        habit.description?.toLowerCase().includes(query) ||
        habit.why?.toLowerCase().includes(query) ||
        habit.category?.toLowerCase().includes(query),
    );
  }, [habits, searchQuery]);

  async function restore(habit: Habit) {
    setRestoringId(habit.id);
    try {
      await habitsApi.resume(habit.id);
      toast.success(`Restored "${habit.name}"`);
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    } catch {
      toast.error('Could not restore the habit. Please try again.');
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Deleted habits are archived rather than removed - their logs and streaks are kept, and
        restoring one makes it active again.
      </p>

      <div className="relative mt-4 max-w-sm">
        <Search className="absolute top-2.5 left-2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search archived habits..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center">
          <Archive className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {habits.length === 0 ? 'Nothing archived.' : 'No archived habits match that search.'}
          </p>
        </div>
      ) : (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((habit) => (
              <TableRow key={habit.id}>
                <TableCell>
                  <Link to={`/habits/${habit.id}`} className="font-medium hover:underline">
                    {habit.icon && <span className="mr-1">{habit.icon}</span>}
                    {habit.name}
                  </Link>
                  {habit.why && (
                    <p className="max-w-80 truncate text-xs text-muted-foreground">{habit.why}</p>
                  )}
                </TableCell>
                <TableCell>
                  {habit.category ? <Badge variant="secondary">{habit.category}</Badge> : '–'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {HABIT_TYPE_LABELS[habit.type]}
                </TableCell>
                <TableCell>
                  <DifficultyRating difficulty={habit.difficulty} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void restore(habit)}
                    disabled={restoringId === habit.id}
                  >
                    {restoringId === habit.id ? 'Restoring…' : 'Restore'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
