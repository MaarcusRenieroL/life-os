import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useConfirmDialog } from '@/components/confirm-dialog';
import { DataGrid } from '@/components/data-table/data-grid';
import { SectionHeading } from '@/components/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { categoryApi } from './category-api';
import { RuleDialog } from './rule-dialog';
import { ruleApi } from './rule-api';
import type { CategorizationRuleResponse } from './types';

function matches(rule: CategorizationRuleResponse, text: string): boolean {
  switch (rule.matchType) {
    case 'EXACT':
      return text.toLowerCase() === rule.matchValue.toLowerCase();
    case 'CONTAINS':
      return text.toLowerCase().includes(rule.matchValue.toLowerCase());
    case 'REGEX':
      try {
        return new RegExp(rule.matchValue, 'i').test(text);
      } catch {
        return false;
      }
  }
}

export function RulesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data: rules = [] } = useQuery({ queryKey: ['finance', 'rules'], queryFn: ruleApi.getRules });
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories, staleTime: 5 * 60_000 });

  const [dialogOpen, setDialogOpen] = useState(!!searchParams.get('matchValue'));
  const [editing, setEditing] = useState<CategorizationRuleResponse | null>(null);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<{ rule: CategorizationRuleResponse; categoryName: string } | 'none' | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const myRules = rules.filter((r) => !r.autoLearned);
  const autoRules = rules.filter((r) => r.autoLearned);
  const totalHits = rules.reduce((s, r) => s + r.hitCount, 0);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'rules'] });
  }

  async function toggle(rule: CategorizationRuleResponse) {
    await ruleApi.updateRule(rule.id, { isActive: !rule.isActive });
    invalidate();
  }

  async function remove(rule: CategorizationRuleResponse) {
    const ok = await confirm({ title: 'Delete this rule?', confirmLabel: 'Delete' });
    if (!ok) return;
    await ruleApi.deleteRule(rule.id);
    invalidate();
  }

  function runTest() {
    // Backend matches rules in priority DESCENDING order (highest wins first).
    const active = [...rules].sort((a, b) => b.priority - a.priority).filter((r) => r.isActive);
    const match = active.find((r) => matches(r, testText));
    if (match) {
      setTestResult({ rule: match, categoryName: categories.find((c) => c.id === match.categoryId)?.name ?? 'Unknown' });
    } else {
      setTestResult('none');
    }
  }

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? 'Unknown';
  }

  function openEdit(rule: CategorizationRuleResponse) {
    setEditing(rule);
    setDialogOpen(true);
  }

  const columns = useMemo<ColumnDef<CategorizationRuleResponse>[]>(
    () => [
      {
        accessorKey: 'priority',
        meta: { title: 'Priority', align: 'right', filter: { type: 'number' } },
      },
      {
        accessorKey: 'matchValue',
        meta: { title: 'Pattern', filter: { type: 'text' } },
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.matchValue}</span>,
      },
      {
        accessorKey: 'matchType',
        meta: { title: 'Match type', filter: { type: 'select' } },
      },
      {
        accessorKey: 'matchField',
        meta: { title: 'Matches on', filter: { type: 'select' } },
      },
      {
        id: 'category',
        accessorFn: (r) => categoryName(r.categoryId),
        meta: { title: 'Category', filter: { type: 'select' } },
      },
      {
        accessorKey: 'hitCount',
        meta: { title: 'Times used', align: 'right', aggregate: 'sum', filter: { type: 'number' } },
      },
      {
        accessorKey: 'isActive',
        meta: { title: 'Active', filter: { type: 'boolean', labels: ['Active', 'Paused'] }, exportValue: (r) => (r.isActive ? 'Yes' : 'No') },
        cell: ({ row }) => (row.original.isActive ? 'Yes' : 'Paused'),
      },
      {
        accessorKey: 'autoLearned',
        meta: { title: 'Created by', filter: { type: 'boolean', labels: ['Auto-learned', 'You'] }, exportValue: (r) => (r.autoLearned ? 'Auto-learned' : 'You') },
        cell: ({ row }) => (row.original.autoLearned ? 'Auto-learned' : 'You'),
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
          <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
            <Switch checked={row.original.isActive} onCheckedChange={() => void toggle(row.original)} />
            <button className="text-primary hover:underline" onClick={() => openEdit(row.original)}>Edit</button>
            <button className="text-destructive hover:underline" onClick={() => void remove(row.original)}>Delete</button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Categorization rules</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>+ New rule</Button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatTile label="Active rules" value={String(rules.filter((r) => r.isActive).length)} />
        <StatTile label="Total matches" value={String(totalHits)} />
        <StatTile label="Rules" value={String(rules.length)} />
      </div>

      <section className="mt-4 hud-panel p-4">
        <SectionHeading>Test a pattern</SectionHeading>
        <div className="mt-2 flex gap-2">
          <Input value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="e.g. SWIGGY BANGALORE" />
          <Button variant="outline" onClick={runTest} disabled={!testText.trim()}>Test</Button>
        </div>
        {testResult && (
          <p className="mt-2 text-sm">
            {testResult === 'none'
              ? 'No active rule matches this text.'
              : `Matched rule "${testResult.rule.matchValue}" (${testResult.rule.matchType} / ${testResult.rule.matchField}) → category ${testResult.categoryName}`}
          </p>
        )}
      </section>

      <RuleTable id="mine" title="My rules" rules={myRules} columns={columns} onEdit={openEdit} />
      <div className="mt-6">
        <RuleTable
          id="auto"
          title="Auto-learned rules"
          subtitle="Created automatically when you correct a transaction's category. Edit or delete freely - if you create the same rule yourself, this one gets replaced by your version."
          rules={autoRules}
          columns={columns}
          onEdit={openEdit}
        />
      </div>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        prefillMatchValue={searchParams.get('matchValue') ?? undefined}
        onSaved={invalidate}
      />
      {dialog}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-panel p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function RuleTable({
  id,
  title,
  subtitle,
  rules,
  columns,
  onEdit,
}: {
  id: string;
  title: string;
  subtitle?: string;
  rules: CategorizationRuleResponse[];
  columns: ColumnDef<CategorizationRuleResponse>[];
  onEdit: (rule: CategorizationRuleResponse) => void;
}) {
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      {subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>}
      <div className="mt-2">
        <DataGrid
          tableId={`finance.rules.${id}`}
          data={rules}
          columns={columns}
          getRowId={(r) => r.id}
          onRowClick={onEdit}
          // Backend matches rules in priority DESCENDING order (highest wins first) - default sort matches.
          initialSorting={[{ id: 'priority', desc: true }]}
          initialVisibility={{ isActive: false, autoLearned: false, createdAt: false }}
          exportName={`rules-${id}`}
          searchPlaceholder="Search rules…"
          emptyMessage="No rules here."
          hidePagination={rules.length <= 10}
        />
      </div>
    </section>
  );
}
