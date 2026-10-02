import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { EmptyState } from '@/components/empty-state';
import { DataGrid } from '@/components/data-table/data-grid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { automationApi } from './automation-api';
import type { AutomationExecution } from './types';

const ALL = 'ALL';

/** Every time a rule ran - what triggered it and what it did (or why it failed). */
export function AutomationHistoryPage() {
  const [ruleId, setRuleId] = useState(ALL);
  const { data: rules = [] } = useQuery({ queryKey: ['automation', 'rules'], queryFn: automationApi.rules });
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['automation', 'executions', ruleId],
    queryFn: () => automationApi.executions(ruleId === ALL ? undefined : ruleId),
  });
  const names = useMemo(() => new Map(rules.map((r) => [r.id, r.name])), [rules]);

  const columns = useMemo<ColumnDef<AutomationExecution>[]>(
    () => [
      {
        id: 'status',
        accessorFn: (r) => (r.status === 'SUCCESS' ? 'Succeeded' : 'Failed'),
        meta: { title: 'Result', filter: { type: 'select' } },
        cell: ({ row }) =>
          row.original.status === 'SUCCESS' ? (
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4 text-emerald-500" aria-label="Succeeded" />Succeeded</span>
          ) : (
            <span className="inline-flex items-center gap-1.5"><XCircle className="size-4 text-destructive" aria-label="Failed" />Failed</span>
          ),
      },
      { id: 'rule', accessorFn: (r) => names.get(r.ruleId) ?? 'Deleted rule', meta: { title: 'Rule', filter: { type: 'select' } } },
      { accessorKey: 'message', meta: { title: 'What happened', filter: { type: 'text' } } },
      { accessorKey: 'triggerSummary', meta: { title: 'Trigger', filter: { type: 'text' } }, cell: ({ row }) => row.original.triggerSummary ?? '—' },
      {
        accessorKey: 'executedAt',
        meta: { title: 'When', filter: { type: 'date' }, exportValue: (r) => r.executedAt },
        cell: ({ row }) => format(parseISO(row.original.executedAt), 'MMM d, HH:mm'),
      },
    ],
    [names],
  );

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
        <DataGrid
          tableId="automation.history"
          data={runs}
          columns={columns}
          getRowId={(r) => r.id}
          initialSorting={[{ id: 'executedAt', desc: true }]}
          exportName="automation-history"
          searchPlaceholder="Search runs…"
          mobileCard={(run) => (
            <div className="flex items-start gap-3 rounded-lg border p-3">
              {run.status === 'SUCCESS' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{names.get(run.ruleId) ?? 'Deleted rule'}</p>
                <p className="text-xs text-muted-foreground">{run.message}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{format(parseISO(run.executedAt), 'MMM d, HH:mm')}</span>
            </div>
          )}
        />
      )}
    </div>
  );
}
