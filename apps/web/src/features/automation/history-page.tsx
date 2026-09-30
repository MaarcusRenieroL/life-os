import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { automationApi } from './automation-api';

const ALL = 'ALL';

/** Every time a rule ran - what triggered it and what it did (or why it failed). */
export function AutomationHistoryPage() {
  const [ruleId, setRuleId] = useState(ALL);
  const { data: rules = [] } = useQuery({ queryKey: ['automation', 'rules'], queryFn: automationApi.rules });
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['automation', 'executions', ruleId],
    queryFn: () => automationApi.executions(ruleId === ALL ? undefined : ruleId),
  });
  const names = new Map(rules.map((r) => [r.id, r.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Run history</h1>
        <Select value={ruleId} onValueChange={setRuleId}>
          <SelectTrigger className="min-w-48" aria-label="Filter by rule">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All rules</SelectItem>
            {rules.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : runs.length === 0 ? (
        <EmptyState message="Nothing has run yet." />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {runs.map((run) => (
            <li key={run.id} className="flex items-start gap-3 px-3 py-2.5">
              {run.status === 'SUCCESS' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-label="Succeeded" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Failed" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{names.get(run.ruleId) ?? 'Deleted rule'}</p>
                <p className="text-xs text-muted-foreground">{run.message}</p>
                {run.triggerSummary && <p className="text-xs text-muted-foreground/70">Trigger: {run.triggerSummary}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{format(parseISO(run.executedAt), 'MMM d, HH:mm')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
