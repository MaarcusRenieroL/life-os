import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { FlaskConical, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { DataGrid } from '@/components/data-table/data-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { getErrorMessage } from '@/lib/error';

import { automationApi } from './automation-api';
import { describeAction, describeTrigger } from './describe';
import { RuleDialog } from './rule-dialog';
import type { AutomationRule } from './types';

/** Your automation rules: what triggers each, what it does, and whether it's on. */
export function AutomationRulesPage() {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);

  const { data: rules = [], isLoading } = useQuery({ queryKey: ['automation', 'rules'], queryFn: automationApi.rules });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['automation'] });
  }

  async function toggle(rule: AutomationRule, enabled: boolean) {
    try {
      await automationApi.setEnabled(rule.id, enabled);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change the rule.'));
    }
  }

  async function test(rule: AutomationRule) {
    try {
      const run = await automationApi.testRule(rule.id);
      if (run.status === 'SUCCESS') toast.success(run.message ?? 'Test run succeeded');
      else toast.error(run.message ?? 'Test run failed');
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not run the rule.'));
    }
  }

  async function remove(rule: AutomationRule) {
    if (!(await confirm({ title: `Delete “${rule.name}”?`, description: 'Its run history is deleted too.', confirmLabel: 'Delete' }))) return;
    try {
      await automationApi.deleteRule(rule.id);
      refresh();
    } catch {
      toast.error('Could not delete the rule.');
    }
  }

  const columns = useMemo<ColumnDef<AutomationRule>[]>(
    () => [
      { accessorKey: 'name', meta: { title: 'Rule', filter: { type: 'text' } }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      {
        accessorKey: 'enabled',
        meta: { title: 'On', filter: { type: 'boolean', labels: ['On', 'Off'] }, exportValue: (r) => (r.enabled ? 'On' : 'Off') },
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch checked={row.original.enabled} onCheckedChange={(v) => void toggle(row.original, v)} aria-label={`${row.original.enabled ? 'Disable' : 'Enable'} ${row.original.name}`} />
          </div>
        ),
      },
      {
        id: 'trigger',
        accessorFn: (r) => describeTrigger(r.triggerType, r.triggerConfig),
        meta: { title: 'When', filter: { type: 'text' } },
      },
      {
        id: 'action',
        accessorFn: (r) => describeAction(r.actionType, r.actionConfig),
        meta: { title: 'Then', filter: { type: 'text' } },
      },
      { accessorKey: 'runCount', meta: { title: 'Runs', align: 'right', aggregate: 'sum', filter: { type: 'number' } } },
      {
        accessorKey: 'lastRunAt',
        meta: { title: 'Last run', filter: { type: 'date' }, exportValue: (r) => r.lastRunAt },
        cell: ({ row }) => (row.original.lastRunAt && row.original.runCount > 0 ? `${formatDistanceToNow(parseISO(row.original.lastRunAt), { addSuffix: true })} (${format(parseISO(row.original.lastRunAt), 'MMM d, HH:mm')})` : 'Never'),
      },
      { accessorKey: 'createdAt', meta: { title: 'Created', filter: { type: 'date' } }, cell: ({ row }) => row.original.createdAt.slice(0, 10) },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        enableSorting: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" aria-label={`Test ${row.original.name}`} title="Run once now" onClick={() => void test(row.original)}><FlaskConical className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`Edit ${row.original.name}`} onClick={() => { setEditing(row.original); setDialogOpen(true); }}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`Delete ${row.original.name}`} onClick={() => void remove(row.original)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Automation</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus /> New rule
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rules.length === 0 ? (
        <div>
          <EmptyState message="No rules yet." />
          <Button variant="link" className="px-0" asChild>
            <Link to="/analytics/templates">
              <Zap className="size-4" /> Start from a template
            </Link>
          </Button>
        </div>
      ) : (
        <DataGrid
          tableId="automation.rules"
          data={rules}
          columns={columns}
          getRowId={(r) => r.id}
          onRowClick={(r) => { setEditing(r); setDialogOpen(true); }}
          initialSorting={[{ id: 'name', desc: false }]}
          initialVisibility={{ createdAt: false }}
          exportName="automation-rules"
          searchPlaceholder="Search rules…"
          hidePagination={rules.length <= 10}
          mobileCard={(rule) => (
            <div className={`rounded-lg border p-3 ${rule.enabled ? '' : 'opacity-60'}`} onClick={() => { setEditing(rule); setDialogOpen(true); }}>
              <p className="font-medium">{rule.name}</p>
              <p className="text-sm text-muted-foreground">{describeTrigger(rule.triggerType, rule.triggerConfig)} → {describeAction(rule.actionType, rule.actionConfig)}</p>
            </div>
          )}
        />
      )}

      <RuleDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={refresh} />
      {dialog}
    </div>
  );
}
