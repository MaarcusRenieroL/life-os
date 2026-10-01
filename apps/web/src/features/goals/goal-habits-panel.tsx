import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { SearchableSelect } from '@/components/searchable-select';
import { Badge } from '@/components/ui/badge';
import { habitsApi } from '@/features/habits/habits-api';

/** Active habits feeding this goal's progress (their recent completion rate is what the habit
 * component measures). Linking sets the habit's goalId, same as the goal picker on the habit
 * form; unlinking a habit is done from that form, so a habit is never silently orphaned here. */
export function GoalHabitsPanel({ goalId, onChanged }: { goalId: string; onChanged: () => void }) {
  const { data: linked = [], refetch } = useQuery({
    queryKey: ['habits', 'list', { goalId }],
    queryFn: () => habitsApi.list({ goalId }),
  });
  const { data: all = [] } = useQuery({ queryKey: ['habits', 'list'], queryFn: () => habitsApi.list() });

  const linkedIds = new Set(linked.map((h) => h.id));
  const options = all
    .filter((h) => h.status === 'ACTIVE' && !linkedIds.has(h.id))
    .map((h) => ({ id: h.id, label: h.name }));

  async function link(habitId: string) {
    try {
      await habitsApi.update(habitId, { goalId });
      await refetch();
      onChanged();
    } catch {
      toast.error('Could not link the habit. Please try again.');
    }
  }

  return (
    <div>
      {linked.length === 0 ? (
        <EmptyState message="No habits linked yet." />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {linked.map((habit) => (
            <li key={habit.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <Link to={`/habits/${habit.id}`} className="flex min-w-0 items-center gap-2 text-sm hover:underline">
                <Flame className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{habit.name}</span>
              </Link>
              {habit.status !== 'ACTIVE' && <Badge variant="outline">{habit.status}</Badge>}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <SearchableSelect
          options={options}
          value={null}
          onChange={(id) => id && void link(id)}
          placeholder="Link a habit…"
          searchPlaceholder="Search habits…"
          emptyMessage="No habits to link."
        />
      </div>
    </div>
  );
}
