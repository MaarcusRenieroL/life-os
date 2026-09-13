import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  const { data: categories = [] } = useQuery({ queryKey: ['finance', 'categories'], queryFn: categoryApi.getCategories });

  const [dialogOpen, setDialogOpen] = useState(!!searchParams.get('matchValue'));
  const [editing, setEditing] = useState<CategorizationRuleResponse | null>(null);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<{ rule: CategorizationRuleResponse; categoryName: string } | 'none' | null>(null);

  // Backend matches rules in priority DESCENDING order (highest wins first).
  const sortedRules = useMemo(() => [...rules].sort((a, b) => b.priority - a.priority), [rules]);
  const myRules = sortedRules.filter((r) => !r.autoLearned);
  const autoRules = sortedRules.filter((r) => r.autoLearned);

  const totalHits = rules.reduce((s, r) => s + r.hitCount, 0);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['finance', 'rules'] });
  }

  async function toggle(rule: CategorizationRuleResponse) {
    await ruleApi.updateRule(rule.id, { isActive: !rule.isActive });
    invalidate();
  }

  async function remove(rule: CategorizationRuleResponse) {
    if (!confirm('Delete this rule?')) return;
    await ruleApi.deleteRule(rule.id);
    invalidate();
  }

  function runTest() {
    const active = sortedRules.filter((r) => r.isActive);
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

      <section className="mt-4 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold">Test a pattern</h2>
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

      <RuleTable title="My rules" rules={myRules} categoryName={categoryName} onEdit={(r) => { setEditing(r); setDialogOpen(true); }} onToggle={toggle} onDelete={remove} />
      <div className="mt-6">
        <RuleTable
          title="Auto-learned rules"
          subtitle="Created automatically when you correct a transaction's category. Edit or delete freely - if you create the same rule yourself, this one gets replaced by your version."
          rules={autoRules}
          categoryName={categoryName}
          onEdit={(r) => { setEditing(r); setDialogOpen(true); }}
          onToggle={toggle}
          onDelete={remove}
        />
      </div>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        prefillMatchValue={searchParams.get('matchValue') ?? undefined}
        onSaved={invalidate}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function RuleTable({
  title,
  subtitle,
  rules,
  categoryName,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  rules: CategorizationRuleResponse[];
  categoryName: (id: string) => string;
  onEdit: (rule: CategorizationRuleResponse) => void;
  onToggle: (rule: CategorizationRuleResponse) => void;
  onDelete: (rule: CategorizationRuleResponse) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>}
      <div className="mt-2 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Pattern</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Field</th>
              <th className="px-2 py-2">Category</th>
              <th className="px-2 py-2">Hits</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} className="border-b last:border-b-0">
                <td className="px-2 py-1.5">{r.priority}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{r.matchValue}</td>
                <td className="px-2 py-1.5">{r.matchType}</td>
                <td className="px-2 py-1.5">{r.matchField}</td>
                <td className="px-2 py-1.5">{categoryName(r.categoryId)}</td>
                <td className="px-2 py-1.5">{r.hitCount}</td>
                <td className="flex items-center gap-2 px-2 py-1.5 text-xs">
                  <Switch checked={r.isActive} onCheckedChange={() => onToggle(r)} />
                  <button className="text-primary hover:underline" onClick={() => onEdit(r)}>Edit</button>
                  <button className="text-destructive hover:underline" onClick={() => onDelete(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && <p className="p-3 text-sm text-muted-foreground">No rules here.</p>}
      </div>
    </section>
  );
}
