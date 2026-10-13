import { ACCOUNT_TYPES, dayKey, type AccountType, type BillingCycle, type Budget, type CategoryComparison, type FinanceAccount, type CategoryType, type FinanceCategory, type FinanceTransaction, type Subscription, type TransactionType } from '@life-os/core';
import { useState, type FormEvent } from 'react';

import { FinanceAnalyticsTab, ImportTab, MerchantsTab, ReportTab, RulesTab } from '../modules/finance-extra';
import { intentTab, useNavIntent } from '../lib/nav';
import { useApi } from '../lib/session';
import { useAsync, useRunner } from '../lib/use-async';
import { DataGrid, type Col } from '../grid/data-grid';
import { MerchantsTable, RulesTable } from '../modules/finance-extra';
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
  const intent = useNavIntent('finance');
  const [tab, setTab] = useState<TabId>(() => intentTab(intent, TABS, 'dashboard'));
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
  const [adding, setAdding] = useState(false);
  const accounts = useAsync(() => api.finance.accounts(), [api]);
  const categories = useAsync(() => api.finance.categories(), [api]);
  // Everything is loaded and handled here, so filters, sorting and totals cover every row, not one page.
  const txns = useAsync(() => api.finance.allTransactions(), [api]);
  const accountName = (id: string) => accounts.data?.find((a) => a.id === id)?.accountName ?? '';
  const categoryName = (id: string | null) => categories.data?.find((c) => c.id === id)?.name ?? '';
  const kind = (t: FinanceTransaction) => (t.type === 'CREDIT' ? 'Money in' : t.type === 'DEBIT' ? 'Money out' : 'Transfer');

  const columns: Col<FinanceTransaction>[] = [
    { id: 'date', title: 'Date', value: (t) => t.transactionDate, filter: { type: 'date' } },
    {
      id: 'description', title: 'Description', value: (t) => t.description, filter: { type: 'text' },
      cell: (t) => <div><div>{t.description}</div>{(t.isTransfer || t.isDuplicate) && <small className="muted">{t.isTransfer ? 'transfer' : ''}{t.isTransfer && t.isDuplicate ? ' · ' : ''}{t.isDuplicate ? 'duplicate' : ''}</small>}</div>,
    },
    { id: 'account', title: 'Account', value: (t) => accountName(t.accountId), filter: { type: 'select' } },
    {
      id: 'category', title: 'Category', value: (t) => categoryName(t.categoryId) || 'Uncategorized', filter: { type: 'select' },
      cell: (t) => (
        <div style={{ minWidth: 150 }}>
          <Select value={t.categoryId ?? ''} onChange={(v) => void runner.run(() => api.finance.setCategories(t.id, v ? [v] : []), txns.reload)} options={(categories.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} placeholder="Uncategorized" />
        </div>
      ),
    },
    { id: 'type', title: 'Type', value: kind, filter: { type: 'select' } },
    { id: 'status', title: 'Status', value: (t) => pretty(t.status), filter: { type: 'select' } },
    {
      id: 'amount', title: 'Amount', value: (t) => (t.type === 'DEBIT' ? -t.amount : t.type === 'CREDIT' ? t.amount : 0), filter: { type: 'number' }, align: 'right', aggregate: 'sum',
      format: (v) => money(Number(v)),
      cell: (t) => <b className={t.type === 'CREDIT' ? 'good' : t.type === 'TRANSFER' ? 'muted' : ''}>{t.type === 'CREDIT' ? '+' : t.type === 'DEBIT' ? '−' : ''}{money(t.amount)}</b>,
      exportValue: (t) => (t.type === 'DEBIT' ? -t.amount : t.amount),
    },
    { id: 'notes', title: 'Notes', value: (t) => t.notes ?? '', hidden: true },
  ];

  return (
    <div className="stack">
      {runner.error && <ErrorNote message={runner.error} />}
      {txns.error && !txns.data && <ErrorNote message={txns.error} onRetry={txns.reload} />}
      <DataGrid
        tableId="finance.transactions"
        data={txns.data ?? []}
        columns={columns}
        getRowId={(t) => t.id}
        loading={txns.loading && !txns.data}
        initialSorting={[{ id: 'date', desc: true }]}
        searchPlaceholder="Search transactions…"
        emptyMessage="No transactions found."
        exportName="transactions"
        selectable
        views={[
          { id: 'review', name: 'Needs review', filters: { status: ['Needs review'] } },
          { id: 'duplicates', name: 'Duplicates', filters: { status: ['Duplicate'] } },
          { id: 'out', name: 'Money out', filters: { type: ['Money out'] } },
          { id: 'in', name: 'Money in', filters: { type: ['Money in'] } },
        ]}
        bulkActions={(rows, clear) => (
          <button className="link" onClick={() => { if (confirm(`Delete ${rows.length} transactions?`)) void runner.run(async () => { for (const t of rows) await api.finance.deleteTransaction(t.id); clear(); }, txns.reload); }}>Delete</button>
        )}
        rowActions={(t) => <button className="link" onClick={() => void runner.run(() => api.finance.deleteTransaction(t.id), txns.reload)}>Delete</button>}
        toolbarEnd={<button className="primary g-btn" onClick={() => setAdding(true)}>+ Add</button>}
      />
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
  const act = (x: Subscription, action: 'pause' | 'resume' | 'cancel' | 'log-use') => void runner.run(() => api.finance.subscriptionAction(x.id, action), reload);

  const columns: Col<Subscription>[] = [
    { id: 'name', title: 'Name', value: (x) => x.name, filter: { type: 'text' }, cell: (x) => <span><b>{x.name}</b> {x.wasteful && <span className="g-chip danger">wasteful</span>}</span> },
    { id: 'amount', title: 'Amount', value: (x) => x.amount, filter: { type: 'number' }, align: 'right', format: (v) => money(Number(v)) },
    { id: 'cycle', title: 'Cycle', value: (x) => pretty(x.billingCycle), filter: { type: 'select' } },
    { id: 'monthly', title: 'Per month', value: (x) => x.monthlyCost, align: 'right', aggregate: 'sum', filter: { type: 'number' }, format: (v) => money(Number(v)) },
    { id: 'next', title: 'Next billing', value: (x) => x.nextBillingDate, filter: { type: 'date' }, cell: (x) => <span>{x.nextBillingDate}{x.daysUntilRenewal != null && x.daysUntilRenewal <= 7 ? <small className="warn"> in {x.daysUntilRenewal}d</small> : null}</span> },
    { id: 'status', title: 'Status', value: (x) => pretty(x.status), filter: { type: 'select' } },
    { id: 'wasteful', title: 'Wasteful', value: (x) => x.wasteful, filter: { type: 'boolean' }, hidden: true },
  ];

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
      {runner.error && <ErrorNote message={runner.error} />}
      <DataGrid
        tableId="finance.subscriptions"
        data={subs.data ?? []}
        columns={columns}
        getRowId={(x) => x.id}
        loading={subs.loading && !subs.data}
        initialSorting={[{ id: 'next', desc: false }]}
        emptyMessage="No subscriptions tracked."
        searchPlaceholder="Search subscriptions…"
        exportName="subscriptions"
        views={[{ id: 'active', name: 'Active', filters: { status: ['Active'] } }, { id: 'wasteful', name: 'Wasteful', filters: { wasteful: ['true'] } }]}
        rowActions={(x) => (
          <>
            {x.status === 'ACTIVE' && <button className="link" onClick={() => act(x, 'log-use')}>Used it</button>}
            {x.status === 'ACTIVE' && <button className="link" onClick={() => act(x, 'pause')}>Pause</button>}
            {x.status === 'PAUSED' && <button className="link" onClick={() => act(x, 'resume')}>Resume</button>}
            {x.status !== 'CANCELLED' && <button className="link" onClick={() => act(x, 'cancel')}>Cancel</button>}
            <button className="link" onClick={() => void runner.run(() => api.finance.deleteSubscription(x.id), reload)}>Delete</button>
          </>
        )}
        toolbarEnd={<button className="primary g-btn" onClick={() => setAdding(true)}>+ Subscription</button>}
      />
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
  const spend = useAsync(() => (budgets.data?.length ? api.finance.comparisons(budgets.data.map((b) => b.categoryId)) : Promise.resolve([] as CategoryComparison[])), [api, budgets.data]);
  const [adding, setAdding] = useState(false);
  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  const used = (b: Budget) => spend.data?.find((c) => c.categoryId === b.categoryId)?.currentMonthSpend ?? 0;
  const total = (budgets.data ?? []).reduce((n, b) => n + b.budgetAmount, 0);
  const spent = (spend.data ?? []).reduce((n, c) => n + c.currentMonthSpend, 0);
  const pctOf = (b: Budget) => (b.budgetAmount ? (used(b) / b.budgetAmount) * 100 : 0);

  const columns: Col<Budget>[] = [
    { id: 'category', title: 'Category', value: (b) => catName(b.categoryId), filter: { type: 'select' } },
    { id: 'budget', title: 'Budget', value: (b) => b.budgetAmount, filter: { type: 'number' }, align: 'right', aggregate: 'sum', format: (v) => money(Number(v)) },
    { id: 'spent', title: 'Spent', value: used, filter: { type: 'number' }, align: 'right', aggregate: 'sum', format: (v) => money(Number(v)) },
    { id: 'used', title: 'Used', value: (b) => Math.round(pctOf(b)), filter: { type: 'number' }, cell: (b) => <div style={{ minWidth: 160 }}><ProgressRow label="" pct={pctOf(b)} right={`${Math.round(pctOf(b))}%${pctOf(b) > 100 ? ' · over' : ''}`} /></div> },
    { id: 'period', title: 'Period', value: (b) => pretty(b.period), filter: { type: 'select' } },
    { id: 'alert', title: 'Alert at', value: (b) => b.alertThreshold, format: (v) => `${v}%`, hidden: true },
  ];

  return (
    <div className="stack">
      <Panel title="Budgets this month"><ProgressRow label="Total" pct={total ? (spent / total) * 100 : 0} right={`${money(spent)} of ${money(total)}`} /></Panel>
      {runner.error && <ErrorNote message={runner.error} />}
      <DataGrid
        tableId="finance.budgets"
        data={budgets.data ?? []}
        columns={columns}
        getRowId={(b) => b.id}
        loading={budgets.loading && !budgets.data}
        initialSorting={[{ id: 'used', desc: true }]}
        emptyMessage="No budgets yet."
        searchPlaceholder="Search budgets…"
        exportName="budgets"
        views={[{ id: 'over', name: 'Over 80%', filters: { used: ['80', ''] } }]}
        rowActions={(b) => <button className="link" onClick={() => void runner.run(() => api.finance.deleteBudget(b.id), budgets.reload)}>Delete</button>}
        toolbarEnd={<button className="primary g-btn" onClick={() => setAdding(true)}>+ Budget</button>}
      />
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

  const columns: Col<FinanceAccount>[] = [
    { id: 'name', title: 'Name', value: (a) => a.accountName, filter: { type: 'text' }, cell: (a) => <span><b>{a.accountName}</b> {a.isPrimary && <span className="g-chip success">primary</span>}</span> },
    { id: 'type', title: 'Type', value: (a) => pretty(a.accountType), filter: { type: 'select' } },
    { id: 'bank', title: 'Bank', value: (a) => a.bankName ?? '', filter: { type: 'select' } },
    { id: 'number', title: 'Account', value: (a) => `••${a.accountNumberLastFour}`, noSearch: true },
    { id: 'balance', title: 'Balance', value: (a) => a.currentBalance, filter: { type: 'number' }, align: 'right', cell: (a) => <b>{money(a.currentBalance, a.currencyCode)}</b>, format: (v) => money(Number(v)) },
    { id: 'txns', title: 'Transactions', value: (a) => a.transactionCount, align: 'right', filter: { type: 'number' } },
    { id: 'primary', title: 'Primary', value: (a) => a.isPrimary, filter: { type: 'boolean' }, hidden: true },
    { id: 'active', title: 'Active', value: (a) => a.isActive, filter: { type: 'boolean' }, hidden: true },
  ];

  return (
    <div className="stack">
      <div className="row"><span className="muted">Net balance {money(list.reduce((n, a) => n + (a.accountType === 'CREDIT_CARD' ? -Math.abs(a.currentBalance) : a.currentBalance), 0))}</span></div>
      {runner.error && <ErrorNote message={runner.error} />}
      <DataGrid
        tableId="finance.accounts"
        data={list}
        columns={columns}
        getRowId={(a) => a.id}
        loading={accounts.loading && !accounts.data}
        initialSorting={[{ id: 'balance', desc: true }]}
        emptyMessage="No accounts yet."
        searchPlaceholder="Search accounts…"
        exportName="accounts"
        rowActions={(a) => <button className="link" onClick={() => void runner.run(() => api.finance.deleteAccount(a.id), accounts.reload)}>Delete</button>}
        toolbarEnd={<button className="primary g-btn" onClick={() => setAdding(true)}>+ Account</button>}
      />
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
  if (categories.error && !categories.data) return <ErrorNote message={categories.error} onRetry={categories.reload} />;

  const columns: Col<FinanceCategory>[] = [
    { id: 'name', title: 'Name', value: (c) => c.name, filter: { type: 'text' }, cell: (c) => <span>{c.icon} {c.name}</span> },
    { id: 'type', title: 'Type', value: (c) => pretty(c.type), filter: { type: 'select' } },
    { id: 'active', title: 'Visible', value: (c) => c.isActive, filter: { type: 'boolean', labels: ['Visible', 'Hidden'] }, cell: (c) => (c.isActive ? 'Yes' : <span className="muted">Hidden</span>) },
  ];

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
      <DataGrid
        tableId="finance.categories"
        data={cats}
        columns={columns}
        getRowId={(c) => c.id}
        loading={categories.loading && !categories.data}
        initialSorting={[{ id: 'type', desc: false }, { id: 'name', desc: false }]}
        emptyMessage="No categories yet."
        searchPlaceholder="Search categories…"
        exportName="categories"
        views={[{ id: 'expense', name: 'Expense', filters: { type: ['Expense'] } }, { id: 'income', name: 'Income', filters: { type: ['Income'] } }, { id: 'hidden', name: 'Hidden', filters: { active: ['false'] } }]}
        rowActions={(c) => (
          <>
            <button className="link" onClick={() => void runner.run(() => api.finance.updateCategory(c.id, { isActive: !c.isActive }), categories.reload)}>{c.isActive ? 'Hide' : 'Show'}</button>
            <button className="link" onClick={() => void runner.run(() => api.finance.deleteCategory(c.id), categories.reload)}>Delete</button>
          </>
        )}
      />
      <Panel title={`Auto-categorise rules · ${(rules.data ?? []).length}`}>
        <form className="add" onSubmit={(e) => { e.preventDefault(); const v = ruleValue.trim(); if (v && ruleCategory) { setRuleValue(''); void runner.run(() => api.finance.createRule({ categoryId: ruleCategory, matchType: 'CONTAINS', matchField: 'DESCRIPTION', matchValue: v, priority: 100 }), rules.reload); } }}>
          <input placeholder="When the description contains…" value={ruleValue} onChange={(e) => setRuleValue(e.target.value)} />
          <div style={{ minWidth: 200 }}><Select value={ruleCategory} onChange={setRuleCategory} options={cats.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} placeholder="Category…" /></div>
          <button className="primary" disabled={!ruleValue.trim() || !ruleCategory}>Add rule</button>
        </form>
        <RulesTable tableId="finance.rules.categories" rules={rules.data ?? []} categories={cats} runner={runner} reload={rules.reload} loading={rules.loading && !rules.data} />
      </Panel>
      <Panel title={`Merchants · ${(merchants.data ?? []).length}`}>
        <MerchantsTable tableId="finance.merchants.categories" merchants={merchants.data ?? []} categories={cats} loading={merchants.loading && !merchants.data} onOpen={undefined} onDelete={(m) => void runner.run(() => api.finance.deleteMerchant(m.id), merchants.reload)} />
      </Panel>
    </div>
  );
}
