import { dayKey, shiftDay, type CategorizationRule, type FinanceTransaction, type MatchField, type MatchType } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Bars, Empty, ErrorNote, Field, Modal, money, opts, Panel, ProgressRow, Select, Stat } from '../ui';

// ------------------------------------------------------------------ analytics
export function FinanceAnalyticsTab() {
  const api = useApi();
  const categories = useAsync(() => api.finance.categories(), [api]);
  const expense = (categories.data ?? []).filter((c) => c.type === 'EXPENSE' && c.isActive);
  const ids = expense.map((c) => c.id).join(',');
  const comparisons = useAsync(() => (ids ? api.finance.comparisons(ids.split(',')) : Promise.resolve([])), [api, ids]);
  const trends = useAsync(() => api.finance.trends(), [api]);
  const merchants = useAsync(() => api.finance.topMerchants(10), [api]);
  const name = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  const rows = [...(comparisons.data ?? [])].filter((c) => c.currentMonthSpend > 0 || c.lastMonthSpend > 0).sort((a, b) => b.currentMonthSpend - a.currentMonthSpend);
  return (
    <div className="stack">
      <Panel title="Monthly spend">{trends.data?.length ? <Bars rows={trends.data.slice(-12).map((t) => ({ label: t.month, value: t.totalSpend }))} format={(n) => money(n)} /> : <Empty>No history yet.</Empty>}</Panel>
      <div className="grid">
        <Panel title="Categories: this month vs last">
          {rows.length === 0 ? <Empty>No category spending yet.</Empty> : rows.map((c) => <ProgressRow key={c.categoryId} label={name(c.categoryId)} pct={c.lastMonthSpend ? Math.min(100, (c.currentMonthSpend / c.lastMonthSpend) * 100) : 100} right={`${money(c.currentMonthSpend)} (${c.percentageChange > 0 ? '+' : ''}${Math.round(c.percentageChange)}%)`} />)}
        </Panel>
        <Panel title="Top merchants">{merchants.data?.length ? <Bars rows={merchants.data.map((m) => ({ label: m.merchant, value: m.totalSpend }))} format={(n) => money(n)} /> : <Empty>No data yet.</Empty>}</Panel>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ report
const csvCell = (v: unknown) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

/** A report for any date range: totals, spending by category, and the transactions as a CSV file. */
export function ReportTab() {
  const api = useApi();
  const runner = useRunner();
  const [from, setFrom] = useState(shiftDay(dayKey(new Date()), -30));
  const [to, setTo] = useState(dayKey(new Date()));
  const [rows, setRows] = useState<FinanceTransaction[] | null>(null);
  const categories = useAsync(() => api.finance.categories(), [api]);
  const accounts = useAsync(() => api.finance.accounts(), [api]);

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

  function save() {
    const account = (id: string) => accounts.data?.find((a) => a.id === id)?.accountName ?? '';
    const category = (id: string | null) => categories.data?.find((c) => c.id === id)?.name ?? '';
    const lines = ['Date,Description,Amount,Type,Account,Category,Transfer', ...(rows ?? []).map((t) => [t.transactionDate.slice(0, 10), t.description, t.amount, t.type, account(t.accountId), category(t.categoryId), t.isTransfer ? 'yes' : ''].map(csvCell).join(','))];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <Panel title="Date range">
        <form className="row" style={{ gap: 12 }} onSubmit={(e: FormEvent) => { e.preventDefault(); void runner.run(build); }}>
          <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <button className="primary" disabled={runner.busy || from > to}>Build report</button>
        </form>
        {runner.error && <ErrorNote message={runner.error} />}
      </Panel>
      {rows && (
        <>
          <Panel title={`${from} → ${to}`}><div className="stats"><Stat label="Income" value={money(income)} /><Stat label="Spent" value={money(spent)} /><Stat label="Net" value={money(income - spent)} /><Stat label="Transactions" value={rows.length} /></div></Panel>
          <Panel title="Spending by category" action={<button className="ghost" onClick={save}>Save as CSV</button>}>{byCategory.size ? <Bars rows={[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} format={(n) => money(n)} /> : <Empty>No spending in this range.</Empty>}</Panel>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ import
export function ImportTab() {
  const api = useApi();
  const runner = useRunner();
  const accounts = useAsync(() => api.finance.accounts(), [api]);
  const failures = useAsync(() => api.financeTools.importFailures(), [api]);
  const gmail = useAsync(() => api.financeTools.gmailStatus(), [api]);
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    form.append('accountId', accountId);
    if (password) form.append('password', password);
    const r = await api.financeTools.importStatement(form);
    setResult(`Read ${r.rowsParsed} rows, imported ${r.rowsImported}.`);
    await failures.reload();
  }

  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <div className="grid">
        <Panel title="Import a statement">
          <p className="muted">A bank statement (PDF or CSV). Rows already booked from alert emails are skipped.</p>
          <div className="cols">
            <Field label="Into account"><Select value={accountId} onChange={setAccountId} options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.accountName }))} placeholder="Choose…" /></Field>
            <Field label="PDF password (if it has one)"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          </div>
          <input type="file" accept=".pdf,.csv,application/pdf,text/csv" disabled={!accountId || runner.busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void runner.run(() => upload(file)); e.target.value = ''; }} />
          {result && <p className="muted">{result}</p>}
        </Panel>
        <Panel title="Gmail bank alerts">
          <p className="muted">{gmail.data?.connected ? `Connected${gmail.data.email ? ` as ${gmail.data.email}` : ''}${gmail.data.lastRefreshedAt ? ` · checked ${gmail.data.lastRefreshedAt.slice(0, 16).replace('T', ' ')}` : ''}` : 'Not connected. Connect Gmail in Settings → Integrations.'}</p>
          <div className="actions"><button className="ghost" disabled={!gmail.data?.connected || runner.busy} onClick={() => void runner.run(() => api.financeTools.syncAllGmail(), async () => setResult('Reading your mail - new transactions appear in a moment.'))}>Read my mail now</button></div>
        </Panel>
      </div>
      <Panel title={`Waiting for you · ${failures.data?.length ?? 0}`}>
        {failures.data?.length === 0 ? <Empty>Every alert has been booked.</Empty> : (
          <ul className="list">
            {failures.data?.map((f) => (
              <li key={f.id}>
                <span className="grow"><b>{f.subject || f.description || f.reference}</b><div className="muted">{f.reason === 'NO_ACCOUNT' ? 'No matching account' : f.reason === 'UNPARSED' ? 'Could not read it' : 'Error'}{f.amount != null ? ` · ${money(f.amount)}` : ''}</div>{f.detail && <small className="muted">{f.detail}</small>}</span>
                <button className="primary" onClick={() => void runner.run(() => api.financeTools.retryFailure(f.id), failures.reload)}>Retry</button>
                <button className="ghost" onClick={() => void runner.run(() => api.financeTools.dismissFailure(f.id), failures.reload)}>Dismiss</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------------ rules
export function RulesTab() {
  const api = useApi();
  const runner = useRunner();
  const rules = useAsync(() => api.finance.rules(), [api]);
  const categories = useAsync(() => api.finance.categories(), [api]);
  const [adding, setAdding] = useState(false);
  const name = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  return (
    <>
      <div className="row"><span className="grow" /><button className="primary" onClick={() => setAdding(true)}>+ New rule</button></div>
      {rules.error && !rules.data && <ErrorNote message={rules.error} onRetry={rules.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`${rules.data?.length ?? 0} rules`}>
        {rules.data?.length === 0 ? <Empty>No rules yet. A rule files matching transactions under a category automatically.</Empty> : (
          <ul className="list">
            {rules.data?.map((r: CategorizationRule) => (
              <li key={r.id} style={{ opacity: r.isActive ? 1 : 0.5 }}>
                <span className="grow">{r.matchField === 'MERCHANT_NAME' ? 'Merchant' : 'Description'} {r.matchType.toLowerCase()} “{r.matchValue}” → <b>{name(r.categoryId)}</b><div className="muted">priority {r.priority} · used {r.hitCount}×{r.autoLearned ? ' · learned' : ''}</div></span>
                <button className="ghost" onClick={() => void runner.run(() => api.finance.updateRule(r.id, { isActive: !r.isActive }), rules.reload)}>{r.isActive ? 'Pause' : 'Resume'}</button>
                <button className="danger" onClick={() => void runner.run(() => api.finance.deleteRule(r.id), rules.reload)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {adding && <RuleModal categories={categories.data ?? []} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await rules.reload(); }} />}
    </>
  );
}

function RuleModal({ categories, onClose, onSaved }: { categories: { id: string; name: string }[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [field, setField] = useState<MatchField>('MERCHANT_NAME');
  const [type, setType] = useState<MatchType>('CONTAINS');
  const [value, setValue] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('10');
  return (
    <Modal title="New rule" onClose={onClose}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.finance.createRule({ matchField: field, matchType: type, matchValue: value.trim(), categoryId, priority: Number(priority) || 0 }), onSaved); }}>
        <div className="cols">
          <Field label="Match on"><Select value={field} onChange={(v) => v && setField(v)} options={opts(['MERCHANT_NAME', 'DESCRIPTION'] as const)} /></Field>
          <Field label="How"><Select value={type} onChange={(v) => v && setType(v)} options={opts(['CONTAINS', 'EXACT', 'REGEX'] as const)} /></Field>
          <Field label="Text"><input autoFocus value={value} onChange={(e) => setValue(e.target.value)} /></Field>
          <Field label="Category"><Select value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose…" /></Field>
          <Field label="Priority (higher wins)"><input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} /></Field>
        </div>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!value.trim() || !categoryId || runner.busy}>Create rule</button></div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ merchants
export function MerchantsTab() {
  const api = useApi();
  const runner = useRunner();
  const merchants = useAsync(() => api.finance.merchants(), [api]);
  const categories = useAsync(() => api.finance.categories(), [api]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const list = (merchants.data ?? []).filter((m) => !search.trim() || m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const cat = (id: string | null) => categories.data?.find((c) => c.id === id)?.name;
  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search merchants…" />
      {merchants.error && !merchants.data && <ErrorNote message={merchants.error} onRetry={merchants.reload} />}
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`${list.length} merchants`}>
        {list.length === 0 ? <Empty>No merchants yet.</Empty> : (
          <ul className="list">
            {list.map((m) => (
              <li key={m.id} className="clickable" onClick={() => setEditing({ id: m.id, name: m.name })}>
                <span className="grow"><b>{m.name}</b><div className="muted">{m.transactionCount} transactions{cat(m.categoryId) ? ` · ${cat(m.categoryId)}` : ''}{m.averageTransactionAmount != null ? ` · avg ${money(m.averageTransactionAmount)}` : ''}</div></span>
                {!m.isRecognized && <span className="pill warn">new</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {editing && (
        <Modal title="Merchant" onClose={() => setEditing(null)}>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); void runner.run(() => api.financeTools.renameMerchant(editing.id, editing.name.trim()), async () => { setEditing(null); await merchants.reload(); }); }}>
            <Field label="Name"><input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <div className="actions">
              <button type="button" className="danger" onClick={() => void runner.run(() => api.finance.deleteMerchant(editing.id), async () => { setEditing(null); await merchants.reload(); })}>Delete</button>
              <button className="primary" disabled={!editing.name.trim() || runner.busy}>Rename</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
