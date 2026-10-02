import { dayKey, shiftDay, type CategorizationRule, type FinanceTransaction, type MatchField, type MatchType } from '@life-os/core';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Text } from '@/text';

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
export function RulesTab() {
  const api = useApi();
  const runner = useRunner();
  const rules = useAsync(() => api.finance.rules(), api);
  const categories = useAsync(() => api.finance.categories(), api);
  const [adding, setAdding] = useState(false);
  const name = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  return (
    <>
      <Btn label="+ New rule" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {rules.error && !rules.data ? <ErrorNote message={rules.error} onRetry={rules.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`${rules.data?.length ?? 0} rules`}>
        {rules.data?.length === 0 ? <Empty>No rules yet. A rule files matching transactions under a category automatically.</Empty> : rules.data?.map((r: CategorizationRule) => (
          <Row key={r.id}>
            <View style={{ flex: 1, opacity: r.isActive ? 1 : 0.5 }}>
              <Text style={s.body}>{r.matchField === 'MERCHANT_NAME' ? 'Merchant' : 'Description'} {r.matchType.toLowerCase()} “{r.matchValue}” → {name(r.categoryId)}</Text>
              <Muted style={{ fontSize: 11 }}>priority {r.priority} · used {r.hitCount}×{r.autoLearned ? ' · learned' : ''}</Muted>
            </View>
            <Btn kind="ghost" label={r.isActive ? 'Pause' : 'Resume'} onPress={() => void runner.run(() => api.finance.updateRule(r.id, { isActive: !r.isActive }), rules.reload)} style={{ paddingVertical: 4, paddingHorizontal: 8 }} />
            <Btn kind="danger" label="Delete" onPress={() => void runner.run(() => api.finance.deleteRule(r.id), rules.reload)} style={{ paddingVertical: 4, paddingHorizontal: 8 }} />
          </Row>
        ))}
      </Panel>
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
export function MerchantsTab() {
  const api = useApi();
  const runner = useRunner();
  const merchants = useAsync(() => api.finance.merchants(), api);
  const categories = useAsync(() => api.finance.categories(), api);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const list = (merchants.data ?? []).filter((m) => !search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const cat = (id: string | null) => categories.data?.find((c) => c.id === id)?.name;
  return (
    <>
      <Input value={search} onChangeText={setSearch} placeholder="Search merchants…" style={{ marginBottom: 10 }} />
      {merchants.error && !merchants.data ? <ErrorNote message={merchants.error} onRetry={merchants.reload} /> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`${list.length} merchants`}>
        {list.length === 0 ? <Empty>No merchants yet.</Empty> : list.map((m) => (
          <Row key={m.id} onPress={() => setEditing({ id: m.id, name: m.name })}>
            <View style={{ flex: 1 }}><Text style={s.body}>{m.name}</Text><Muted style={{ fontSize: 11 }}>{m.transactionCount} transactions{cat(m.categoryId) ? ` · ${cat(m.categoryId)}` : ''}{m.averageTransactionAmount != null ? ` · avg ${money(m.averageTransactionAmount)}` : ''}</Muted></View>
            {!m.isRecognized ? <Pill label="New" color={C.gold} /> : null}
          </Row>
        ))}
      </Panel>
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
