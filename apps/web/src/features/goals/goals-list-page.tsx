import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LIFE_AREAS, LIFE_AREA_LABELS, type LifeArea } from '@/features/tasks/types';
import { useDebouncedValue } from '@/lib/use-debounced-value';

import { GoalCard } from './goal-card';
import { GoalFormDialog } from './goal-form-dialog';
import { GoalReviewDialog } from './goal-review-dialog';
import { goalsApi } from './goals-api';
import { GOAL_PRIORITIES, GOAL_PRIORITY_LABELS, GOAL_STATUSES, GOAL_STATUS_LABELS, type GoalStatus, type GoalSummary } from './types';

const ALL = 'ALL';

export function GoalsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [area, setArea] = useState<LifeArea | typeof ALL>(ALL);
  const [status, setStatus] = useState<GoalStatus | typeof ALL>(ALL);
  const [priority, setPriority] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [reviewing, setReviewing] = useState<GoalSummary | null>(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  const filters = {
    area: area === ALL ? undefined : area,
    status: status === ALL ? undefined : status,
    priority: priority === ALL ? undefined : Number(priority),
    q: debouncedSearch.trim() || undefined,
  };

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', 'list', filters],
    queryFn: () => goalsApi.list(filters),
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
  }

  const filtered = area !== ALL || status !== ALL || priority !== ALL || debouncedSearch.trim() !== '';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> New goal
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search goals…"
            aria-label="Search goals"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={area} onValueChange={(v) => setArea(v as LifeArea | typeof ALL)}>
          <SelectTrigger className="min-w-36" aria-label="Filter by area">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All areas</SelectItem>
            {LIFE_AREAS.map((a) => (
              <SelectItem key={a} value={a}>
                {LIFE_AREA_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as GoalStatus | typeof ALL)}>
          <SelectTrigger className="min-w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {GOAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {GOAL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="min-w-36" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {GOAL_PRIORITIES.map((p) => (
              <SelectItem key={p} value={String(p)}>
                {GOAL_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="mt-6">
          <EmptyState message={filtered ? 'No goals match those filters.' : 'No goals yet - set the first one.'} />
          {!filtered && (
            <Button variant="link" className="px-0" onClick={() => setFormOpen(true)}>
              Create a goal
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onReview={setReviewing} />
          ))}
        </div>
      )}

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} editing={null} onSaved={invalidate} />
      <GoalReviewDialog goal={reviewing} onOpenChange={(open) => !open && setReviewing(null)} onSaved={invalidate} />
    </div>
  );
}
