import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { FlaskConical, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <li key={rule.id}>
              <Card className={rule.enabled ? undefined : 'opacity-60'}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{rule.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {describeTrigger(rule.triggerType, rule.triggerConfig)} → {describeAction(rule.actionType, rule.actionConfig)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {rule.runCount === 0 ? 'Never run' : `Ran ${rule.runCount} time${rule.runCount === 1 ? '' : 's'}`}
                      {rule.lastRunAt && rule.runCount > 0 && ` · last ${formatDistanceToNow(parseISO(rule.lastRunAt), { addSuffix: true })} (${format(parseISO(rule.lastRunAt), 'MMM d, HH:mm')})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={rule.enabled} onCheckedChange={(v) => void toggle(rule, v)} aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`} />
                    <Button size="icon" variant="ghost" aria-label={`Test ${rule.name}`} title="Run once now" onClick={() => void test(rule)}>
                      <FlaskConical className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Edit ${rule.name}`}
                      onClick={() => {
                        setEditing(rule);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${rule.name}`} onClick={() => void remove(rule)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <RuleDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={refresh} />
      {dialog}
    </div>
  );
}
