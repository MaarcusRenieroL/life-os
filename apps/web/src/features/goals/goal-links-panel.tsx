import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/empty-state';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/error';

import { GoalStatusBadge } from './goal-badges';
import { goalsApi } from './goals-api';
import { GOAL_LINK_RELATION_LABELS, type GoalLink, type GoalLinkRelation } from './types';

const RELATIONS: GoalLinkRelation[] = ['BLOCKS', 'BLOCKED_BY', 'SUPPORTS', 'SUPPORTED_BY'];

/** Relationships to other goals. The API stores one directed link (source blocks/supports
 * target); "blocked by" / "supported by" are the same link created from the other goal's side,
 * so picking one here just flips which goal is the source. */
export function GoalLinksPanel({ goalId, links, onChanged }: { goalId: string; links: GoalLink[]; onChanged: () => void }) {
  const [relation, setRelation] = useState<GoalLinkRelation>('SUPPORTS');
  const [otherId, setOtherId] = useState<string | null>(null);

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', 'list', { includeArchived: false, forLinks: true }],
    queryFn: () => goalsApi.list(),
  });
  const options = goals.filter((g) => g.id !== goalId).map((g) => ({ id: g.id, label: g.name }));

  async function add() {
    if (!otherId) return;
    const inbound = relation === 'BLOCKED_BY' || relation === 'SUPPORTED_BY';
    const type = relation === 'BLOCKS' || relation === 'BLOCKED_BY' ? 'BLOCKS' : 'SUPPORTS';
    try {
      if (inbound) await goalsApi.addLink(otherId, goalId, type);
      else await goalsApi.addLink(goalId, otherId, type);
      setOtherId(null);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not link the goals. Please try again.'));
    }
  }

  async function remove(link: GoalLink) {
    try {
      await goalsApi.deleteLink(goalId, link.id);
      onChanged();
    } catch {
      toast.error('Could not remove the link. Please try again.');
    }
  }

  return (
    <div>
      {links.length === 0 ? (
        <EmptyState message="Not linked to any other goal." />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-2 px-3 py-2">
              <span className="w-24 shrink-0 text-xs tracking-wide text-muted-foreground uppercase">
                {GOAL_LINK_RELATION_LABELS[link.relation]}
              </span>
              <RouterLink to={`/goals/${link.otherGoalId}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                {link.otherGoalName}
              </RouterLink>
              <GoalStatusBadge status={link.otherGoalStatus} />
              <Button size="icon" variant="ghost" aria-label={`Remove link to ${link.otherGoalName}`} onClick={() => void remove(link)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-col gap-2">
        <Select value={relation} onValueChange={(v) => setRelation(v as GoalLinkRelation)}>
          <SelectTrigger className="w-full" aria-label="Relationship">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RELATIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {GOAL_LINK_RELATION_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <SearchableSelect options={options} value={otherId} onChange={setOtherId} placeholder="Choose a goal…" searchPlaceholder="Search goals…" />
        </div>
        <Button variant="outline" className="self-start" disabled={!otherId} onClick={() => void add()}>
          <Plus /> Link
        </Button>
      </div>
    </div>
  );
}
