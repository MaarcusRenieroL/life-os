import { ACCOUNT_TYPES, dayKey, type AccountType, type BillingCycle, type FinanceAccount, type CategoryType, type FinanceCategory, type TransactionType } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { FinanceAnalyticsTab, ImportTab, MerchantsTab, ReportTab, RulesTab } from '../modules/finance-extra';
import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { Bars, Empty, ErrorNote, Field, Modal, money, opts, Panel, pretty, ProgressRow, Select, Stat, Tabs } from '../ui';

type TabId = 'dashboard' | 'transactions' | 'subscriptions' | 'budgets' | 'analytics' | 'report' | 'import' | 'rules' | 'accounts' | 'categories' | 'merchants';
const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'report', label: 'Report' },
  { id: 'import', label: 'Import' },
  { id: 'rules', label: 'Rules' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'categories', label: 'Categories' },
  { id: 'merchants', label: 'Merchants' },
] as const;

export function FinanceScreen() {
  const [tab, setTab] = useState<TabId>('dashboard');
  return (
    <div className="stack">
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'transactions' && <TransactionsTab />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'budgets' && <BudgetsTab />}
      {tab === 'analytics' && <FinanceAnalyticsTab />}
      {tab === 'report' && <ReportTab />}
      {tab === 'import' && <ImportTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'merchants' && <MerchantsTab />}
    </div>
  );
}

function DashboardTab() {
  const api = useApi();
  const summary = useAsync(() => api.finance.summary(), [api]);
  const overview = useAsync(() => api.finance.overview(), [api]);
  const trends = useAsync(() => api.finance.trends(), [api]);
  const merchants = useAsync(() => api.finance.topMerchants(8), [api]);
  const review = useAsync(() => api.finance.needsReviewCount(), [api]);
  const s = summary.data;
  const o = overview.data;
  if (summary.error && !s) return <ErrorNote message={summary.error} onRetry={summary.reload} />;
  return (
    <div className="stack">
      <Panel title="Safe to spend">
        <div className="stats">
          <Stat label="Safe to spend" value={money(o?.safeToSpend)} sub={o ? `${money(o.safeToSpendPerDay)}/day · ${o.daysLeft} days left` : undefined} />
          <Stat label="Net worth" value={money(o?.netWorth)} />
          <Stat label="Upcoming bills" value={money(o?.upcomingBills)} />
          <Stat label="Spent this cycle" value={money(o?.spentSoFar)} sub={o ? `of ${money(o.expectedIncome)} expected income` : undefined} />
        </div>
      </Panel>
      <Panel title="This month">
        <div className="stats">
          <Stat label="Income" value={money(s?.totalIncome)} />
          <Stat label="Spent" value={money(s?.totalExpenses)} />
          <Stat label="Saved" value={money(s?.savings)} />
          <Stat label="Fixed income" value={money(s?.fixedMonthlyIncome)} />
        </div>
        {(review.data ?? 0) > 0 && <p className="warn">{review.data} transactions need a category.</p>}
      </Panel>
      <div className="grid">
        <Panel title="Monthly spend">{trends.data?.length ? <Bars rows={trends.data.slice(-6).map((t) => ({ label: t.month, value: t.totalSpend }))} format={(n) => money(n)} /> : <Empty>No history yet.</Empty>}</Panel>
        <Panel title="Top merchants">{merchants.data?.length ? <Bars rows={merchants.data.map((m) => ({ label: m.merchant, value: m.totalSpend }))} format={(n) => money(n)} /> : <Empty>No data yet.</Empty>}</Panel>
      </div>
    </div>
  );
}

function TransactionsTab() {
  const api = useApi();
  const runner = useRunner();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'NEEDS_REVIEW' | 'CATEGORIZED' | 'DUPLICATE'>('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const accounts = useAsync(() => api.finance.accounts(), [api]);
  const categories = useAsync(() => api.finance.categories(), [api]);
  const txns = useAsync(() => api.finance.transactions(page, 25, { search: search.trim() || undefined, status: status || undefined }), [api, page, search, status]);
  const accountName = (id: string) => accounts.data?.find((a) => a.id === id)?.accountName ?? '';
  const result = txns.data;

  return (
    <div className="stack">
      <div className="add">
        <input placeholder="Search transactions…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <div style={{ minWidth: 180 }}><Select value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[{ value: 'NEEDS_REVIEW', label: 'Needs review' }, { value: 'CATEGORIZED', label: 'Categorized' }, { value: 'DUPLICATE', label: 'Duplicates' }]} placeholder="All" /></div>
        <button className="primary" onClick={() => setAdding(true)}>+ Add</button>
      </div>
      {runner.error && <ErrorNote message={runner.error} />}
      {txns.error && !result && <ErrorNote message={txns.error} onRetry={txns.reload} />}
      <Panel title={`${result?.totalElements ?? 0} transactions`}>
        {(result?.content.length ?? 0) === 0 && !txns.loading ? <Empty>No transactions match.</Empty> : (
          <ul className="list">{result?.content.map((t) => (
            <li key={t.id}>
              <small className="muted" style={{ width: 82 }}>{t.transactionDate}</small>
              <div className="grow"><div>{t.description}</div><small className="muted">{accountName(t.accountId)}{t.isTransfer ? ' · transfer' : ''}{t.isDuplicate ? ' · duplicate' : ''}</small></div>
              <div style={{ width: 180 }}>
                <Select value={t.categoryId ?? ''} onChange={(v) => void runner.run(() => api.finance.setCategories(t.id, v ? [v] : []), txns.reload)} options={(categories.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} placeholder="Uncategorized" />
              </div>
              <b className={t.type === 'CREDIT' ? 'good' : t.type === 'TRANSFER' ? 'muted' : ''} style={{ width: 100, textAlign: 'right' }}>{t.type === 'CREDIT' ? '+' : t.type === 'DEBIT' ? '−' : ''}{money(t.amount)}</b>
              <button className="link" onClick={() => void runner.run(() => api.finance.deleteTransaction(t.id), txns.reload)}>×</button>
            </li>
          ))}</ul>
        )}
        <div className="row"><button className="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Prev</button><small className="muted">Page {page + 1} of {Math.max(1, result?.totalPages ?? 1)}</small><button className="ghost" disabled={result?.last ?? true} onClick={() => setPage(page + 1)}>Next ›</button></div>
      </Panel>
      {adding && <TransactionForm accounts={accounts.data ?? []} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await txns.reload(); }} />}
    </div>
  );
}

function TransactionForm({ accounts, onClose, onSaved }: { accounts: FinanceAccount[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [accountId, setAccountId] = useState(accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? '');
  const [type, setType] = useState<TransactionType>('DEBIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(dayKey(new Date()));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await runner.run(() => api.finance.createTransaction({ accountId, transactionDate: date, description: description.trim(), amount: Number(amount), type }))) await onSaved();
  }
  return (
    <Modal title="Add transaction" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Description"><input autoFocus value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="cols">
          <Field label="Amount"><input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Type"><Select value={type} onChange={(v) => v && setType(v)} options={[{ value: 'DEBIT', label: 'Expense' }, { value: 'CREDIT', label: 'Income' }]} /></Field>
          <Field label="Account"><Select value={accountId} onChange={setAccountId} options={accounts.map((a) => ({ value: a.id, label: a.accountName }))} /></Field>
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {accounts.length === 0 && <p className="warn">Create an account first.</p>}
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!accountId || !description.trim() || Number(amount) <= 0 || runner.busy}>Add</button></div>
      </form>
    </Modal>
  );
}

function SubscriptionsTab() {
  const api = useApi();
  const runner = useRunner();
  const subs = useAsync(() => api.finance.subscriptions(), [api]);
  const summary = useAsync(() => api.finance.subscriptionSummary(), [api]);
  const [adding, setAdding] = useState(false);
  const reload = async () => { await Promise.all([subs.reload(), summary.reload()]); };
  const s = summary.data;
  return (
    <div className="stack">
      <Panel title="Recurring spend">
        <div className="stats">
          <Stat label="Monthly" value={money(s?.monthlyTotal)} sub={`${s?.activeCount ?? 0} active`} />
          <Stat label="Yearly" value={money(s?.yearlyTotal)} />
          <Stat label="Wasteful" value={money(s?.wastefulMonthly)} sub={`${s?.wastefulCount ?? 0} subs`} />
          <Stat label="Renewing soon" value={money(s?.renewingSoonTotal)} sub={`${s?.renewingSoonCount ?? 0} subs`} />
        </div>
      </Panel>
      <div className="row"><span /><button className="primary" onClick={() => setAdding(true)}>+ Subscription</button></div>
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="Subscriptions">
        {(subs.data ?? []).length === 0 && !subs.loading ? <Empty>No subscriptions tracked.</Empty> : (
          <ul className="list">{(subs.data ?? []).map((x) => (
            <li key={x.id}>
              <div className="grow"><b>{x.name}</b> {x.wasteful && <span className="pill bad">wasteful</span>}<div className="muted">{money(x.amount)} / {x.billingCycle.toLowerCase()} · next {x.nextBillingDate}{x.daysUntilRenewal != null && x.daysUntilRenewal <= 7 ? ` (in ${x.daysUntilRenewal}d)` : ''}</div></div>
              <span className={`pill ${x.status === 'ACTIVE' ? 'good' : ''}`}>{pretty(x.status)}</span>
              {x.status === 'ACTIVE' && <button className="link" onClick={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'log-use'), reload)}>Used it</button>}
              {x.status === 'ACTIVE' && <button className="link" onClick={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'pause'), reload)}>Pause</button>}
              {x.status === 'PAUSED' && <button className="link" onClick={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'resume'), reload)}>Resume</button>}
              {x.status !== 'CANCELLED' && <button className="link" onClick={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'cancel'), reload)}>Cancel</button>}
              <button className="link" onClick={() => void runner.run(() => api.finance.deleteSubscription(x.id), reload)}>Delete</button>
            </li>
          ))}</ul>
        )}
      </Panel>
      {adding && <SubscriptionForm onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await reload(); }} />}
    </div>
  );
}

function SubscriptionForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [next, setNext] = useState(dayKey(new Date()));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await runner.run(() => api.finance.createSubscription({ name: name.trim(), amount: Number(amount), billingCycle: cycle, nextBillingDate: next }))) await onSaved();
  }
  return (
    <Modal title="New subscription" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="cols">
          <Field label="Amount"><input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Billing cycle"><Select value={cycle} onChange={(v) => v && setCycle(v)} options={opts(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const)} /></Field>
          <Field label="Next billing"><input type="date" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        </div>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!name.trim() || Number(amount) <= 0 || runner.busy}>Add</button></div>
      </form>
    </Modal>
  );
}

function BudgetsTab() {
  const api = useApi();
  const runner = useRunner();
  const budgets = useAsync(() => api.finance.budgets(), [api]);
  const categories = useAsync(() => api.finance.categories(), [api]);
  const spend = useAsync(() => (budgets.data?.length ? api.finance.comparisons(budgets.data.map((b) => b.categoryId)) : Promise.resolve([])), [api, budgets.data]);
  const [adding, setAdding] = useState(false);
  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  const total = (budgets.data ?? []).reduce((n, b) => n + b.budgetAmount, 0);
  const spent = (spend.data ?? []).reduce((n, c) => n + c.currentMonthSpend, 0);

  return (
    <div className="stack">
      <Panel title="Budgets this month"><ProgressRow label="Total" pct={total ? (spent / total) * 100 : 0} right={`${money(spent)} of ${money(total)}`} /></Panel>
      <div className="row"><span /><button className="primary" onClick={() => setAdding(true)}>+ Budget</button></div>
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="By category">
        {(budgets.data ?? []).length === 0 && !budgets.loading ? <Empty>No budgets yet.</Empty> : (budgets.data ?? []).map((b) => {
          const used = spend.data?.find((c) => c.categoryId === b.categoryId)?.currentMonthSpend ?? 0;
          const pct = b.budgetAmount ? (used / b.budgetAmount) * 100 : 0;
          return (
            <div key={b.id} className="row">
              <div className="grow"><ProgressRow label={catName(b.categoryId)} pct={pct} right={`${money(used)} / ${money(b.budgetAmount)}${pct > 100 ? ' · over' : ''}`} /></div>
              <button className="link" onClick={() => void runner.run(() => api.finance.deleteBudget(b.id), budgets.reload)}>Delete</button>
            </div>
          );
        })}
      </Panel>
      {adding && <BudgetForm categories={(categories.data ?? []).filter((c) => c.type === 'EXPENSE' && c.isActive)} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await budgets.reload(); }} />}
    </div>
  );
}

function BudgetForm({ categories, onClose, onSaved }: { categories: FinanceCategory[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    const start = new Date(); start.setDate(1);
    if (await runner.run(() => api.finance.createBudget({ categoryId, budgetAmount: Number(amount), period: 'MONTHLY', startDate: dayKey(start), alertThreshold: 80, alertEnabled: true }))) await onSaved();
  }
  return (
    <Modal title="New monthly budget" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Category"><Select value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose…" /></Field>
        <Field label="Monthly amount"><input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!categoryId || Number(amount) <= 0 || runner.busy}>Create</button></div>
      </form>
    </Modal>
  );
}

function AccountsTab() {
  const api = useApi();
  const runner = useRunner();
  const accounts = useAsync(() => api.finance.accounts(), [api]);
  const [adding, setAdding] = useState(false);
  const list = accounts.data ?? [];
  return (
    <div className="stack">
      <div className="row"><span className="muted">Net balance {money(list.reduce((n, a) => n + (a.accountType === 'CREDIT_CARD' ? -Math.abs(a.currentBalance) : a.currentBalance), 0))}</span><button className="primary" onClick={() => setAdding(true)}>+ Account</button></div>
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title={`Accounts · ${list.length}`}>
        {list.length === 0 && !accounts.loading ? <Empty>No accounts yet.</Empty> : (
          <ul className="list">{list.map((a) => (
            <li key={a.id}><div className="grow"><b>{a.accountName}</b> {a.isPrimary && <span className="pill good">primary</span>}<div className="muted">{[a.bankName, pretty(a.accountType), `••${a.accountNumberLastFour}`, `${a.transactionCount} txns`].filter(Boolean).join(' · ')}</div></div><b>{money(a.currentBalance, a.currencyCode)}</b>
              <button className="link" onClick={() => void runner.run(() => api.finance.deleteAccount(a.id), accounts.reload)}>Delete</button></li>
          ))}</ul>
        )}
      </Panel>
      {adding && <AccountForm onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await accounts.reload(); }} />}
    </div>
  );
}

function AccountForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('SAVINGS');
  const [bank, setBank] = useState('');
  const [last4, setLast4] = useState('');
  const [balance, setBalance] = useState('0');
  const [primary, setPrimary] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await runner.run(() => api.finance.createAccount({ accountName: name.trim(), accountType: type, bankName: bank.trim() || undefined, accountNumber: last4, currencyCode: 'INR', currentBalance: Number(balance) || 0, isPrimary: primary }))) await onSaved();
  }
  return (
    <Modal title="New account" onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <Field label="Name"><input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="cols">
          <Field label="Type"><Select value={type} onChange={(v) => v && setType(v)} options={opts(ACCOUNT_TYPES)} /></Field>
          <Field label="Bank"><input value={bank} onChange={(e) => setBank(e.target.value)} /></Field>
          <Field label="Last 4 digits"><input maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label="Opening balance"><input type="number" step="any" value={balance} onChange={(e) => setBalance(e.target.value)} /></Field>
        </div>
        <label className="row" style={{ justifyContent: 'flex-start' }}><input type="checkbox" style={{ width: 'auto' }} checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Primary account</label>
        {runner.error && <ErrorNote message={runner.error} />}
        <div className="actions"><button className="primary" disabled={!name.trim() || last4.length !== 4 || runner.busy}>Create</button></div>
      </form>
    </Modal>
  );
}

function CategoriesTab() {
  const api = useApi();
  const runner = useRunner();
  const categories = useAsync(() => api.finance.categories(), [api]);
  const rules = useAsync(() => api.finance.rules(), [api]);
  const merchants = useAsync(() => api.finance.merchants(), [api]);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [ruleValue, setRuleValue] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const cats = categories.data ?? [];
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const groups = (['EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT'] as const).map((t) => ({ type: t, items: cats.filter((c) => c.type === t) })).filter((g) => g.items.length);
  if (categories.error && !categories.data) return <ErrorNote message={categories.error} onRetry={categories.reload} />;

  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      <Panel title="New category">
        <form className="add" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (n) { setName(''); void runner.run(() => api.finance.createCategory({ name: n, type, displayOrder: cats.length }), categories.reload); } }}>
          <input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ minWidth: 160 }}><Select value={type} onChange={(v) => v && setType(v)} options={opts(['EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT'] as const)} /></div>
          <button className="primary" disabled={!name.trim()}>Add</button>
        </form>
      </Panel>
      {groups.map((g) => (
        <Panel key={g.type} title={`${pretty(g.type)} · ${g.items.length}`}>
          <ul className="list">{g.items.map((c) => (
            <li key={c.id}><span className="grow">{c.icon} {c.name}{!c.isActive && <small className="muted"> (hidden)</small>}</span>
              <button className="link" onClick={() => void runner.run(() => api.finance.updateCategory(c.id, { isActive: !c.isActive }), categories.reload)}>{c.isActive ? 'Hide' : 'Show'}</button>
              <button className="link" onClick={() => void runner.run(() => api.finance.deleteCategory(c.id), categories.reload)}>Delete</button></li>
          ))}</ul>
        </Panel>
      ))}
      <Panel title={`Auto-categorise rules · ${(rules.data ?? []).length}`}>
        <form className="add" onSubmit={(e) => { e.preventDefault(); const v = ruleValue.trim(); if (v && ruleCategory) { setRuleValue(''); void runner.run(() => api.finance.createRule({ categoryId: ruleCategory, matchType: 'CONTAINS', matchField: 'DESCRIPTION', matchValue: v, priority: 100 }), rules.reload); } }}>
          <input placeholder="When the description contains…" value={ruleValue} onChange={(e) => setRuleValue(e.target.value)} />
          <div style={{ minWidth: 200 }}><Select value={ruleCategory} onChange={setRuleCategory} options={cats.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} placeholder="Category…" /></div>
          <button className="primary" disabled={!ruleValue.trim() || !ruleCategory}>Add rule</button>
        </form>
        <ul className="list">{(rules.data ?? []).map((r) => (
          <li key={r.id} className={r.isActive ? '' : 'done'}><span className="grow">{pretty(r.matchField)} {pretty(r.matchType)} “{r.matchValue}” → <b>{catName(r.categoryId)}</b></span><small className="muted">{r.hitCount} hits{r.autoLearned ? ' · learned' : ''}</small>
            <button className="link" onClick={() => void runner.run(() => api.finance.updateRule(r.id, { isActive: !r.isActive }), rules.reload)}>{r.isActive ? 'Disable' : 'Enable'}</button>
            <button className="link" onClick={() => void runner.run(() => api.finance.deleteRule(r.id), rules.reload)}>Delete</button></li>
        ))}</ul>
      </Panel>
      <Panel title={`Merchants · ${(merchants.data ?? []).length}`}>
        {(merchants.data ?? []).length === 0 ? <Empty>Merchants appear as transactions are imported.</Empty> : <ul className="list">{(merchants.data ?? []).map((m) => (
          <li key={m.id}><span className="grow">{m.name}</span><span className="pill">{catName(m.categoryId)}</span><small className="muted">{m.transactionCount} txns · avg {money(m.averageTransactionAmount)}</small><button className="link" onClick={() => void runner.run(() => api.finance.deleteMerchant(m.id), merchants.reload)}>Delete</button></li>
        ))}</ul>}
      </Panel>
    </div>
  );
}
