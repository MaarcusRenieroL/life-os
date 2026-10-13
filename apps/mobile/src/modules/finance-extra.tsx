import { dayKey, shiftDay, type CategorizationRule, type FinanceCategory, type FinanceTransaction, type MatchField, type MatchType, type Merchant } from '@life-os/core';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Text } from '@/text';

import { DataGrid, type Col } from '@/grid/data-grid';
import { Bars, Btn, Chips, DateInput, Empty, Field, Input, money, opts, Pill, Progress, Row, Sheet, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

// ------------------------------------------------------------------ analytics
export function FinanceAnalyticsTab() {
  const api = useApi();
  const categories = useAsync(() => api.finance.categories(), api);
  const expense = (categories.data ?? []).filter((c) => c.type === 'EXPENSE' && c.isActive);
  const ids = expense.map((c) => c.id).join(',');
  const comparisons = useAsync(() => (ids ? api.finance.comparisons(ids.split(',')) : Promise.resolve([])), ids);
  const trends = useAsync(() => api.finance.trends(), api);
  const merchants = useAsync(() => api.finance.topMerchants(10), api);
  const name = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  const rows = [...(comparisons.data ?? [])].filter((c) => c.currentMonthSpend > 0 || c.lastMonthSpend > 0).sort((a, b) => b.currentMonthSpend - a.currentMonthSpend);
  return (
    <>
      <Panel title="Monthly spend">{trends.data?.length ? <Bars rows={trends.data.slice(-12).map((t) => ({ label: t.month, value: t.totalSpend }))} format={(n) => money(n)} /> : <Empty>No history yet.</Empty>}</Panel>
      <Panel title="Categories: this month vs last">
        {rows.length === 0 ? <Empty>No category spending yet.</Empty> : rows.map((c) => (
          <View key={c.categoryId}>
            <Progress label={name(c.categoryId)} pct={c.lastMonthSpend ? Math.min(100, (c.currentMonthSpend / c.lastMonthSpend) * 100) : 100} color={c.difference > 0 ? C.gold : C.accent} right={`${money(c.currentMonthSpend)} (${c.percentageChange > 0 ? '+' : ''}${Math.round(c.percentageChange)}%)`} />
          </View>
        ))}
      </Panel>
      <Panel title="Top merchants">{merchants.data?.length ? <Bars rows={merchants.data.map((m) => ({ label: m.merchant, value: m.totalSpend }))} format={(n) => money(n)} /> : <Empty>No data yet.</Empty>}</Panel>
    </>
  );
}

// ------------------------------------------------------------------ report
const csvCell = (v: unknown) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

/** A report for any date range: totals, spending by category, and the transactions as CSV to share. */
export function ReportTab() {
  const api = useApi();
  const runner = useRunner();
  const [from, setFrom] = useState(shiftDay(dayKey(new Date()), -30));
  const [to, setTo] = useState(dayKey(new Date()));
  const [rows, setRows] = useState<FinanceTransaction[] | null>(null);
  const categories = useAsync(() => api.finance.categories(), api);
  const accounts = useAsync(() => api.finance.accounts(), api);

  async function build() {
    const all: FinanceTransaction[] = [];
    for (let page = 0; page < 20; page += 1) {
      const result = await api.finance.transactions(page, 200);
      all.push(...result.content);
      if (result.last) break;
    }
    setRows(all.filter((t) => t.transactionDate.slice(0, 10) >= from && t.transactionDate.slice(0, 10) <= to && !t.isDuplicate));
  }

  const counted = (rows ?? []).filter((t) => !t.isTransfer);
  const income = counted.filter((t) => t.type === 'CREDIT').reduce((n, t) => n + t.amount, 0);
  const spent = counted.filter((t) => t.type === 'DEBIT').reduce((n, t) => n + t.amount, 0);
  const byCategory = new Map<string, number>();
  for (const t of counted.filter((x) => x.type === 'DEBIT')) {
    const name = categories.data?.find((c) => c.id === t.categoryId)?.name ?? 'Uncategorized';
    byCategory.set(name, (byCategory.get(name) ?? 0) + t.amount);
  }

  async function share() {
    const account = (id: string) => accounts.data?.find((a) => a.id === id)?.accountName ?? '';
    const category = (id: string | null) => categories.data?.find((c) => c.id === id)?.name ?? '';
    const lines = ['Date,Description,Amount,Type,Account,Category,Transfer', ...(rows ?? []).map((t) => [t.transactionDate.slice(0, 10), t.description, t.amount, t.type, account(t.accountId), category(t.categoryId), t.isTransfer ? 'yes' : ''].map(csvCell).join(','))];
    await Share.share({ message: lines.join('\n'), title: `Transactions ${from} to ${to}` });
  }

  return (
    <>
      <Panel title="Date range">
        <Field label="From"><DateInput value={from} onChange={setFrom} /></Field>
        <Field label="To"><DateInput value={to} onChange={setTo} /></Field>
        {runner.error ? <ErrorNote message={runner.error} /> : null}
        <Btn label="Build report" disabled={runner.busy || from > to} onPress={() => void runner.run(build)} />
      </Panel>
      {rows ? (
        <>
          <Panel title={`${from} → ${to}`}><StatGrid><Stat label="Income" value={money(income)} /><Stat label="Spent" value={money(spent)} /><Stat label="Net" value={money(income - spent)} /><Stat label="Transactions" value={rows.length} /></StatGrid></Panel>
          <Panel title="Spending by category">{byCategory.size ? <Bars rows={[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} format={(n) => money(n)} /> : <Empty>No spending in this range.</Empty>}</Panel>
          <Btn kind="ghost" label="Share as CSV" onPress={() => void share()} />
        </>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------ import
export function ImportTab() {
  const api = useApi();
  const runner = useRunner();
  const accounts = useAsync(() => api.finance.accounts(), api);
  const failures = useAsync(() => api.financeTools.importFailures(), api);
  const gmail = useAsync(() => api.financeTools.gmailStatus(), api);
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function pickAndUpload() {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/csv', 'text/comma-separated-values', '*/*'], copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
    form.append('accountId', accountId);
    if (password) form.append('password', password);
    const r = await api.financeTools.importStatement(form);
    setResult(`Read ${r.rowsParsed} rows, imported ${r.rowsImported}.`);
    await failures.reload();
  }

  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Import a statement">
        <Muted style={{ marginBottom: 8 }}>A bank statement (PDF or CSV). Rows already booked from alert emails are skipped.</Muted>
        <Field label="Into account"><Chips value={accountId} onChange={(v) => v && setAccountId(v)} options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.accountName }))} /></Field>
        <Field label="PDF password (if it has one)"><Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" /></Field>
        {result ? <Muted style={{ marginBottom: 8 }}>{result}</Muted> : null}
        <Btn label="Choose a file…" disabled={!accountId || runner.busy} onPress={() => void runner.run(pickAndUpload)} />
      </Panel>
      <Panel title="Gmail bank alerts">
        <Muted style={{ marginBottom: 8 }}>{gmail.data?.connected ? `Connected${gmail.data.email ? ` as ${gmail.data.email}` : ''}${gmail.data.lastRefreshedAt ? ` · checked ${gmail.data.lastRefreshedAt.slice(0, 16).replace('T', ' ')}` : ''}` : 'Not connected. Connect Gmail in Settings → Integrations.'}</Muted>
        <Btn kind="ghost" label="Read my mail now" disabled={!gmail.data?.connected || runner.busy} onPress={() => void runner.run(() => api.financeTools.syncAllGmail(), async () => { setResult('Reading your mail - new transactions appear in a moment.'); })} />
      </Panel>
      <Panel title={`Waiting for you · ${failures.data?.length ?? 0}`}>
        {failures.data?.length === 0 ? <Empty>Every alert has been booked.</Empty> : failures.data?.map((f) => (
          <Row key={f.id}>
            <View style={{ flex: 1 }}>
              <Text style={s.body}>{f.subject || f.description || f.reference}</Text>
              <Muted style={{ fontSize: 11 }}>{f.reason === 'NO_ACCOUNT' ? 'No matching account' : f.reason === 'UNPARSED' ? 'Could not read it' : 'Error'}{f.amount != null ? ` · ${money(f.amount)}` : ''}</Muted>
              {f.detail ? <Muted style={{ fontSize: 11 }}>{f.detail}</Muted> : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Btn label="Retry" onPress={() => void runner.run(() => api.financeTools.retryFailure(f.id), failures.reload)} style={{ paddingVertical: 5, paddingHorizontal: 10 }} />
                <Btn kind="ghost" label="Dismiss" onPress={() => void runner.run(() => api.financeTools.dismissFailure(f.id), failures.reload)} style={{ paddingVertical: 5, paddingHorizontal: 10 }} />
              </View>
            </View>
          </Row>
        ))}
      </Panel>
    </>
  );
}

// ------------------------------------------------------------------ rules
export function RulesTable({ tableId, rules, categories, runner, reload, loading }: { tableId: string; rules: CategorizationRule[]; categories: { id: string; name: string }[]; runner: ReturnType<typeof useRunner>; reload: () => unknown; loading?: boolean }) {
  const api = useApi();
  const name = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Category';
  const columns: Col<CategorizationRule>[] = [
    { id: 'text', title: 'Text', value: (r) => r.matchValue, filter: { type: 'text' }, cell: (r) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>“{r.matchValue}”</Text> },
    { id: 'category', title: 'Category', value: (r) => name(r.categoryId), filter: { type: 'select' } },
    { id: 'active', title: 'Status', value: (r) => (r.isActive ? 'Active' : 'Paused'), filter: { type: 'select' } },
    { id: 'field', title: 'Match on', value: (r) => (r.matchField === 'MERCHANT_NAME' ? 'Merchant' : 'Description'), filter: { type: 'select' } },
    { id: 'how', title: 'How', value: (r) => r.matchType.toLowerCase(), filter: { type: 'select' }, hidden: true },
    { id: 'priority', title: 'Priority', value: (r) => r.priority, align: 'right', filter: { type: 'number' }, hidden: true },
    { id: 'hits', title: 'Used', value: (r) => r.hitCount, align: 'right', aggregate: 'sum', filter: { type: 'number' }, hidden: true },
    { id: 'learned', title: 'Learned', value: (r) => r.autoLearned, filter: { type: 'boolean' }, hidden: true },
  ];
  return (
    <DataGrid
      tableId={tableId}
      data={rules}
      columns={columns}
      getRowId={(r) => r.id}
      loading={loading}
      initialSorting={[{ id: 'priority', desc: true }]}
      emptyMessage="No rules yet. A rule files matching transactions under a category automatically."
      searchPlaceholder="Search rules…"
      exportName="rules"
      dim={(r) => !r.isActive}
      views={[{ id: 'active', name: 'Active', filters: { active: ['Active'] } }, { id: 'paused', name: 'Paused', filters: { active: ['Paused'] } }]}
      rowActions={(r, close) => (
        <>
          <Btn kind="ghost" label={r.isActive ? 'Pause' : 'Resume'} onPress={() => { close(); void runner.run(() => api.finance.updateRule(r.id, { isActive: !r.isActive }), reload); }} />
          <Btn kind="danger" label="Delete" onPress={() => { close(); void runner.run(() => api.finance.deleteRule(r.id), reload); }} />
        </>
      )}
    />
  );
}

export function RulesTab() {
  const api = useApi();
  const runner = useRunner();
  const rules = useAsync(() => api.finance.rules(), api);
  const categories = useAsync(() => api.finance.categories(), api);
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Btn label="+ New rule" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {rules.error && !rules.data ? <ErrorNote message={rules.error} onRetry={rules.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <RulesTable tableId="finance.rules.all" rules={rules.data ?? []} categories={categories.data ?? []} runner={runner} reload={rules.reload} loading={rules.loading && !rules.data} />
      {adding ? <RuleSheet categories={categories.data ?? []} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await rules.reload(); }} /> : null}
    </>
  );
}

function RuleSheet({ categories, onClose, onSaved }: { categories: { id: string; name: string; type: string }[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [field, setField] = useState<MatchField>('MERCHANT_NAME');
  const [type, setType] = useState<MatchType>('CONTAINS');
  const [value, setValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('10');
  return (
    <Sheet title="New rule" onClose={onClose}>
      <Field label="Match on"><Chips value={field} onChange={(v) => v && setField(v)} options={opts(['MERCHANT_NAME', 'DESCRIPTION'] as const)} /></Field>
      <Field label="How"><Chips value={type} onChange={(v) => v && setType(v)} options={opts(['CONTAINS', 'EXACT', 'REGEX'] as const)} /></Field>
      <Field label="Text"><Input value={value} onChangeText={setValue} autoCapitalize="none" /></Field>
      <Field label="Category"><Chips value={categoryId} onChange={(v) => v && setCategoryId(v)} options={categories.map((c) => ({ value: c.id, label: c.name }))} /></Field>
      <Field label="Priority (higher wins)"><Input value={priority} onChangeText={setPriority} keyboardType="numeric" /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Create rule" disabled={!value.trim() || !categoryId || runner.busy} onPress={() => void runner.run(() => api.finance.createRule({ matchField: field, matchType: type, matchValue: value.trim(), categoryId, priority: Number(priority) || 0 }), onSaved)} />
    </Sheet>
  );
}

// ------------------------------------------------------------------ merchants
export function MerchantsTable({ tableId, merchants, categories, loading, onOpen, onDelete }: { tableId: string; merchants: Merchant[]; categories: FinanceCategory[]; loading?: boolean; onOpen?: (m: Merchant) => void; onDelete?: (m: Merchant, close: () => void) => void }) {
  const cat = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '';
  const columns: Col<Merchant>[] = [
    { id: 'name', title: 'Merchant', value: (m) => m.name, filter: { type: 'text' }, cell: (m) => <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{m.name}</Text>{!m.isRecognized ? <Pill label="New" color={C.gold} /> : null}</View> },
    { id: 'category', title: 'Category', value: (m) => cat(m.categoryId) || 'Uncategorized', filter: { type: 'select' } },
    { id: 'txns', title: 'Transactions', value: (m) => m.transactionCount, align: 'right', aggregate: 'sum', filter: { type: 'number' } },
    { id: 'avg', title: 'Average', value: (m) => m.averageTransactionAmount, align: 'right', filter: { type: 'number' }, format: (v) => (v == null || v === '' ? '—' : money(Number(v))) },
    { id: 'last', title: 'Last seen', value: (m) => m.lastTransactionDate ?? '', filter: { type: 'date' }, hidden: true },
    { id: 'recognized', title: 'Recognised', value: (m) => m.isRecognized, filter: { type: 'boolean' }, hidden: true },
  ];
  return (
    <DataGrid
      tableId={tableId}
      data={merchants}
      columns={columns}
      getRowId={(m) => m.id}
      loading={loading}
      initialSorting={[{ id: 'txns', desc: true }]}
      emptyMessage="Merchants appear as transactions are imported."
      searchPlaceholder="Search merchants…"
      exportName="merchants"
      onRowClick={onOpen}
      drawer={!onOpen}
      views={[{ id: 'new', name: 'New', filters: { recognized: ['false'] } }]}
      rowActions={onDelete ? (m, close) => <Btn kind="danger" label="Delete merchant" onPress={() => onDelete(m, close)} /> : undefined}
    />
  );
}

export function MerchantsTab() {
  const api = useApi();
  const runner = useRunner();
  const merchants = useAsync(() => api.finance.merchants(), api);
  const categories = useAsync(() => api.finance.categories(), api);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  return (
    <>
      {merchants.error && !merchants.data ? <ErrorNote message={merchants.error} onRetry={merchants.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <MerchantsTable tableId="finance.merchants.all" merchants={merchants.data ?? []} categories={categories.data ?? []} loading={merchants.loading && !merchants.data} onOpen={(m) => setEditing({ id: m.id, name: m.name })} />
      {editing ? (
        <Sheet title="Merchant" onClose={() => setEditing(null)}>
          <Field label="Name"><Input value={editing.name} onChangeText={(v) => setEditing({ ...editing, name: v })} /></Field>
          <View style={{ gap: 10 }}>
            <Btn label="Rename" disabled={!editing.name.trim() || runner.busy} onPress={() => void runner.run(() => api.financeTools.renameMerchant(editing.id, editing.name.trim()), async () => { setEditing(null); await merchants.reload(); })} />
            <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.finance.deleteMerchant(editing.id), async () => { setEditing(null); await merchants.reload(); })} />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}
