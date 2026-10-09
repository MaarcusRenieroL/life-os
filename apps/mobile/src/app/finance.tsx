import { ACCOUNT_TYPES, dayKey, type AccountType, type BillingCycle, type Budget, type CategoryComparison, type CategoryType, type FinanceAccount, type FinanceCategory, type FinanceTransaction, type Subscription, type TransactionType } from '@life-os/core';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Text } from '@/text';

import { Bars, Btn, Chips, DateInput, Empty, Field, Input, money, opts, Pill, pretty, Progress, Screen, Seg, Sheet, Stat, StatGrid } from '@/kit';
import { DataGrid, type Col } from '@/grid/data-grid';
import { FinanceAnalyticsTab, ImportTab, MerchantsTab, MerchantsTable, ReportTab, RulesTab, RulesTable } from '@/modules/finance-extra';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Panel } from '@/ui';

type TabId = 'dashboard' | 'transactions' | 'subscriptions' | 'budgets' | 'analytics' | 'report' | 'import' | 'rules' | 'accounts' | 'categories' | 'merchants';
const TABS = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'transactions', label: 'Transactions' }, { id: 'subscriptions', label: 'Subscriptions' }, { id: 'budgets', label: 'Budgets' }, { id: 'analytics', label: 'Analytics' }, { id: 'report', label: 'Report' }, { id: 'import', label: 'Import' }, { id: 'rules', label: 'Rules' }, { id: 'accounts', label: 'Accounts' }, { id: 'categories', label: 'Categories' }, { id: 'merchants', label: 'Merchants' }] as const;

export default function Finance() {
  const [tab, setTab] = useState<TabId>('dashboard');
  return (
    <Screen title="Finance">
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'dashboard' ? <Dashboard /> : tab === 'transactions' ? <Transactions /> : tab === 'subscriptions' ? <Subscriptions /> : tab === 'budgets' ? <Budgets /> : tab === 'analytics' ? <FinanceAnalyticsTab /> : tab === 'report' ? <ReportTab /> : tab === 'import' ? <ImportTab /> : tab === 'rules' ? <RulesTab /> : tab === 'accounts' ? <Accounts /> : tab === 'categories' ? <Categories /> : <MerchantsTab />}
    </Screen>
  );
}

function Dashboard() {
  const api = useApi();
  const summary = useAsync(() => api.finance.summary(), api);
  const overview = useAsync(() => api.finance.overview(), api);
  const trends = useAsync(() => api.finance.trends(), api);
  const merchants = useAsync(() => api.finance.topMerchants(8), api);
  const review = useAsync(() => api.finance.needsReviewCount(), api);
  const o = overview.data;
  const sm = summary.data;
  if (summary.error && !sm) return <ErrorNote message={summary.error} onRetry={summary.reload} />;
  return (
    <>
      <Panel title="Safe to spend"><StatGrid>
        <Stat label="Safe to spend" value={money(o?.safeToSpend)} sub={o ? `${money(o.safeToSpendPerDay)}/day · ${o.daysLeft}d left` : undefined} />
        <Stat label="Net worth" value={money(o?.netWorth)} />
        <Stat label="Upcoming bills" value={money(o?.upcomingBills)} />
        <Stat label="Spent this cycle" value={money(o?.spentSoFar)} />
      </StatGrid></Panel>
      <Panel title="This month"><StatGrid><Stat label="Income" value={money(sm?.totalIncome)} /><Stat label="Spent" value={money(sm?.totalExpenses)} /><Stat label="Saved" value={money(sm?.savings)} /><Stat label="Fixed income" value={money(sm?.fixedMonthlyIncome)} /></StatGrid>
        {(review.data ?? 0) > 0 ? <Text style={{ color: C.gold }}>{review.data} transactions need a category.</Text> : null}</Panel>
      <Panel title="Monthly spend">{trends.data?.length ? <Bars rows={trends.data.slice(-6).map((t) => ({ label: t.month, value: t.totalSpend }))} format={(n) => money(n)} /> : <Empty>No history yet.</Empty>}</Panel>
      <Panel title="Top merchants">{merchants.data?.length ? <Bars rows={merchants.data.map((m) => ({ label: m.merchant, value: m.totalSpend }))} format={(n) => money(n)} /> : <Empty>No data yet.</Empty>}</Panel>
    </>
  );
}

function Transactions() {
  const api = useApi();
  const runner = useRunner();
  const [adding, setAdding] = useState(false);
  const accounts = useAsync(() => api.finance.accounts(), api);
  const categories = useAsync(() => api.finance.categories(), api);
  // Everything is loaded and handled on the phone, so filters, sorting and totals cover every row.
  const txns = useAsync(() => api.finance.allTransactions(), api);
  const account = (id: string) => accounts.data?.find((a) => a.id === id)?.accountName ?? '';
  const category = (id: string | null) => categories.data?.find((c) => c.id === id)?.name ?? '';
  const kind = (t: FinanceTransaction) => (t.type === 'CREDIT' ? 'Money in' : t.type === 'DEBIT' ? 'Money out' : 'Transfer');
  const amountText = (t: FinanceTransaction) => `${t.type === 'CREDIT' ? '+' : t.type === 'DEBIT' ? '−' : ''}${money(t.amount)}`;

  const columns: Col<FinanceTransaction>[] = [
    { id: 'description', title: 'Description', value: (t) => t.description, filter: { type: 'text' } },
    { id: 'amount', title: 'Amount', value: (t) => (t.type === 'DEBIT' ? -t.amount : t.type === 'CREDIT' ? t.amount : 0), filter: { type: 'number' }, align: 'right', aggregate: 'sum', format: (v) => money(Number(v)), exportValue: (t) => (t.type === 'DEBIT' ? -t.amount : t.amount), cell: (t) => <Text style={{ color: t.type === 'CREDIT' ? C.accent : t.type === 'TRANSFER' ? C.muted : C.text, fontWeight: '700' }}>{amountText(t)}</Text> },
    { id: 'date', title: 'Date', value: (t) => t.transactionDate, filter: { type: 'date' } },
    { id: 'category', title: 'Category', value: (t) => category(t.categoryId) || 'Uncategorized', filter: { type: 'select' } },
    { id: 'account', title: 'Account', value: (t) => account(t.accountId), filter: { type: 'select' } },
    { id: 'type', title: 'Type', value: kind, filter: { type: 'select' }, hidden: true },
    { id: 'status', title: 'Status', value: (t) => pretty(t.status), filter: { type: 'select' }, hidden: true },
    { id: 'notes', title: 'Notes', value: (t) => t.notes ?? '', hidden: true },
  ];

  return (
    <>
      <Btn label="+ Add transaction" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {txns.error && !txns.data ? <ErrorNote message={txns.error} onRetry={txns.reload} /> : null}
      <DataGrid
        tableId="finance.transactions"
        data={txns.data ?? []}
        columns={columns}
        getRowId={(t) => t.id}
        loading={txns.loading && !txns.data}
        initialSorting={[{ id: 'date', desc: true }]}
        initialPageSize={25}
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
        bulkActions={(rows, clear) => <Btn kind="danger" label={`Delete ${rows.length}`} onPress={() => void runner.run(async () => { for (const t of rows) await api.finance.deleteTransaction(t.id); clear(); }, txns.reload)} style={{ paddingVertical: 6 }} />}
        rowActions={(t, close) => (
          <>
            <Field label="Category"><Chips value={t.categoryId ?? ''} onChange={(v) => { close(); void runner.run(() => api.finance.setCategories(t.id, v ? [v] : []), txns.reload); }} options={(categories.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} clearable /></Field>
            <Btn kind="danger" label="Delete transaction" onPress={() => { close(); void runner.run(() => api.finance.deleteTransaction(t.id), txns.reload); }} />
          </>
        )}
      />
      {adding ? <TransactionSheet accounts={accounts.data ?? []} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await txns.reload(); }} /> : null}
    </>
  );
}

function TransactionSheet({ accounts, onClose, onSaved }: { accounts: FinanceAccount[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [accountId, setAccountId] = useState(accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id ?? '');
  const [type, setType] = useState<TransactionType>('DEBIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(dayKey(new Date()));
  return (
    <Sheet title="Add transaction" onClose={onClose}>
      <Field label="Description"><Input value={description} onChangeText={setDescription} autoFocus /></Field>
      <Field label="Amount"><Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></Field>
      <Field label="Type"><Chips value={type} onChange={(v) => v && setType(v)} options={[{ value: 'DEBIT', label: 'Expense' }, { value: 'CREDIT', label: 'Income' }]} /></Field>
      <Field label="Account"><Chips value={accountId} onChange={(v) => v && setAccountId(v)} options={accounts.map((a) => ({ value: a.id, label: a.accountName }))} /></Field>
      <Field label="Date"><DateInput value={date} onChange={setDate} /></Field>
      {accounts.length === 0 ? <Text style={{ color: C.gold, marginBottom: 8 }}>Create an account first.</Text> : null}
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Add" disabled={!accountId || !description.trim() || Number(amount) <= 0 || runner.busy} onPress={() => void runner.run(() => api.finance.createTransaction({ accountId, transactionDate: date, description: description.trim(), amount: Number(amount), type }), onSaved)} />
    </Sheet>
  );
}

function Subscriptions() {
  const api = useApi();
  const runner = useRunner();
  const subs = useAsync(() => api.finance.subscriptions(), api);
  const summary = useAsync(() => api.finance.subscriptionSummary(), api);
  const [adding, setAdding] = useState(false);
  const reload = async () => { await Promise.all([subs.reload(), summary.reload()]); };
  const sm = summary.data;
  const act = (x: Subscription, action: 'pause' | 'resume' | 'cancel' | 'log-use', close: () => void) => { close(); void runner.run(() => api.finance.subscriptionAction(x.id, action), reload); };

  const columns: Col<Subscription>[] = [
    { id: 'name', title: 'Name', value: (x) => x.name, filter: { type: 'text' }, cell: (x) => <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{x.name}</Text>{x.wasteful ? <Pill label="wasteful" color={C.magenta} /> : null}</View> },
    { id: 'status', title: 'Status', value: (x) => pretty(x.status), filter: { type: 'select' } },
    { id: 'amount', title: 'Amount', value: (x) => x.amount, filter: { type: 'number' }, align: 'right', format: (v) => money(Number(v)) },
    { id: 'cycle', title: 'Cycle', value: (x) => pretty(x.billingCycle), filter: { type: 'select' } },
    { id: 'next', title: 'Next billing', value: (x) => x.nextBillingDate, filter: { type: 'date' }, cell: (x) => <Text style={{ color: C.text, fontSize: 13 }}>{x.nextBillingDate}{x.daysUntilRenewal != null && x.daysUntilRenewal <= 7 ? ` (in ${x.daysUntilRenewal}d)` : ''}</Text> },
    { id: 'monthly', title: 'Per month', value: (x) => x.monthlyCost, filter: { type: 'number' }, align: 'right', aggregate: 'sum', format: (v) => money(Number(v)), hidden: true },
    { id: 'wasteful', title: 'Wasteful', value: (x) => x.wasteful, filter: { type: 'boolean' }, hidden: true },
  ];

  return (
    <>
      <Panel title="Recurring spend"><StatGrid><Stat label="Monthly" value={money(sm?.monthlyTotal)} sub={`${sm?.activeCount ?? 0} active`} /><Stat label="Yearly" value={money(sm?.yearlyTotal)} /><Stat label="Wasteful" value={money(sm?.wastefulMonthly)} sub={`${sm?.wastefulCount ?? 0} subs`} /><Stat label="Renewing soon" value={money(sm?.renewingSoonTotal)} sub={`${sm?.renewingSoonCount ?? 0} subs`} /></StatGrid></Panel>
      <Btn label="+ Subscription" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
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
        rowActions={(x, close) => (
          <>
            {x.status === 'ACTIVE' ? <Btn kind="ghost" label="Used it" onPress={() => act(x, 'log-use', close)} /> : null}
            {x.status === 'ACTIVE' ? <Btn kind="ghost" label="Pause" onPress={() => act(x, 'pause', close)} /> : null}
            {x.status === 'PAUSED' ? <Btn kind="ghost" label="Resume" onPress={() => act(x, 'resume', close)} /> : null}
            {x.status !== 'CANCELLED' ? <Btn kind="ghost" label="Cancel subscription" onPress={() => act(x, 'cancel', close)} /> : null}
            <Btn kind="danger" label="Delete" onPress={() => { close(); void runner.run(() => api.finance.deleteSubscription(x.id), reload); }} />
          </>
        )}
      />
      {adding ? <SubscriptionSheet onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await reload(); }} /> : null}
    </>
  );
}

function SubscriptionSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');
  const [next, setNext] = useState(dayKey(new Date()));
  return (
    <Sheet title="New subscription" onClose={onClose}>
      <Field label="Name"><Input value={name} onChangeText={setName} autoFocus /></Field>
      <Field label="Amount"><Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></Field>
      <Field label="Billing cycle"><Chips value={cycle} onChange={(v) => v && setCycle(v)} options={opts(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const)} /></Field>
      <Field label="Next billing"><DateInput value={next} onChange={setNext} /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Add" disabled={!name.trim() || Number(amount) <= 0 || runner.busy} onPress={() => void runner.run(() => api.finance.createSubscription({ name: name.trim(), amount: Number(amount), billingCycle: cycle, nextBillingDate: next }), onSaved)} />
    </Sheet>
  );
}

function Budgets() {
  const api = useApi();
  const runner = useRunner();
  const budgets = useAsync(() => api.finance.budgets(), api);
  const categories = useAsync(() => api.finance.categories(), api);
  const ids = (budgets.data ?? []).map((b) => b.categoryId).join(',');
  const spend = useAsync(() => (ids ? api.finance.comparisons(ids.split(',')) : Promise.resolve([] as CategoryComparison[])), ids);
  const [adding, setAdding] = useState(false);
  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  const used = (b: Budget) => spend.data?.find((c) => c.categoryId === b.categoryId)?.currentMonthSpend ?? 0;
  const pctOf = (b: Budget) => (b.budgetAmount ? (used(b) / b.budgetAmount) * 100 : 0);
  const total = (budgets.data ?? []).reduce((n, b) => n + b.budgetAmount, 0);
  const spent = (spend.data ?? []).reduce((n, c) => n + c.currentMonthSpend, 0);

  const columns: Col<Budget>[] = [
    { id: 'category', title: 'Category', value: (b) => catName(b.categoryId), filter: { type: 'select' } },
    { id: 'used', title: 'Used', value: (b) => Math.round(pctOf(b)), filter: { type: 'number' }, align: 'right', format: (v) => `${v}%`, cell: (b) => <Text style={{ color: pctOf(b) > 100 ? C.magenta : C.text, fontWeight: '700' }}>{Math.round(pctOf(b))}%{pctOf(b) > 100 ? ' · over' : ''}</Text> },
    { id: 'spent', title: 'Spent', value: used, filter: { type: 'number' }, align: 'right', aggregate: 'sum', format: (v) => money(Number(v)) },
    { id: 'budget', title: 'Budget', value: (b) => b.budgetAmount, filter: { type: 'number' }, align: 'right', aggregate: 'sum', format: (v) => money(Number(v)) },
    { id: 'period', title: 'Period', value: (b) => pretty(b.period), filter: { type: 'select' }, hidden: true },
    { id: 'alert', title: 'Alert at', value: (b) => b.alertThreshold, format: (v) => `${v}%`, hidden: true },
  ];

  return (
    <>
      <Panel title="Budgets this month"><Progress label="Total" pct={total ? (spent / total) * 100 : 0} right={`${money(spent)} of ${money(total)}`} /></Panel>
      <Btn label="+ Budget" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
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
        trailing={(b) => <View style={{ width: 56 }}><Progress label="" pct={pctOf(b)} color={pctOf(b) > 100 ? C.magenta : undefined} right="" /></View>}
        rowActions={(b, close) => <Btn kind="danger" label="Delete budget" onPress={() => { close(); void runner.run(() => api.finance.deleteBudget(b.id), budgets.reload); }} />}
      />
      {adding ? <BudgetSheet categories={(categories.data ?? []).filter((c) => c.type === 'EXPENSE' && c.isActive)} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await budgets.reload(); }} /> : null}
    </>
  );
}

function BudgetSheet({ categories, onClose, onSaved }: { categories: FinanceCategory[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <Sheet title="New monthly budget" onClose={onClose}>
      <Field label="Category"><Chips value={categoryId} onChange={(v) => setCategoryId(v)} options={categories.map((c) => ({ value: c.id, label: c.name }))} /></Field>
      <Field label="Monthly amount"><Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /></Field>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Create" disabled={!categoryId || Number(amount) <= 0 || runner.busy} onPress={() => { const start = new Date(); start.setDate(1); void runner.run(() => api.finance.createBudget({ categoryId, budgetAmount: Number(amount), period: 'MONTHLY', startDate: dayKey(start), alertThreshold: 80, alertEnabled: true }), onSaved); }} />
    </Sheet>
  );
}

function Accounts() {
  const api = useApi();
  const runner = useRunner();
  const accounts = useAsync(() => api.finance.accounts(), api);
  const [adding, setAdding] = useState(false);
  const list = accounts.data ?? [];

  const columns: Col<FinanceAccount>[] = [
    { id: 'name', title: 'Name', value: (a) => a.accountName, filter: { type: 'text' }, cell: (a) => <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{a.accountName}{a.isPrimary ? ' ★' : ''}</Text> },
    { id: 'balance', title: 'Balance', value: (a) => a.currentBalance, filter: { type: 'number' }, align: 'right', format: (v) => money(Number(v)), cell: (a) => <Text style={{ color: C.text, fontWeight: '700' }}>{money(a.currentBalance, a.currencyCode)}</Text> },
    { id: 'type', title: 'Type', value: (a) => pretty(a.accountType), filter: { type: 'select' } },
    { id: 'bank', title: 'Bank', value: (a) => a.bankName ?? '', filter: { type: 'select' } },
    { id: 'number', title: 'Account', value: (a) => `••${a.accountNumberLastFour}`, noSearch: true },
    { id: 'txns', title: 'Transactions', value: (a) => a.transactionCount, align: 'right', filter: { type: 'number' }, hidden: true },
    { id: 'primary', title: 'Primary', value: (a) => a.isPrimary, filter: { type: 'boolean' }, hidden: true },
    { id: 'active', title: 'Active', value: (a) => a.isActive, filter: { type: 'boolean' }, hidden: true },
  ];

  return (
    <>
      <Panel title="Net balance"><Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>{money(list.reduce((n, a) => n + (a.accountType === 'CREDIT_CARD' ? -Math.abs(a.currentBalance) : a.currentBalance), 0))}</Text></Panel>
      <Btn label="+ Account" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
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
        rowActions={(a, close) => <Btn kind="danger" label="Delete account" onPress={() => { close(); void runner.run(() => api.finance.deleteAccount(a.id), accounts.reload); }} />}
      />
      {adding ? <AccountSheet onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await accounts.reload(); }} /> : null}
    </>
  );
}

function AccountSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const api = useApi();
  const runner = useRunner();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('SAVINGS');
  const [bank, setBank] = useState('');
  const [last4, setLast4] = useState('');
  const [balance, setBalance] = useState('0');
  const [primary, setPrimary] = useState(false);
  return (
    <Sheet title="New account" onClose={onClose}>
      <Field label="Name"><Input value={name} onChangeText={setName} autoFocus /></Field>
      <Field label="Type"><Chips value={type} onChange={(v) => v && setType(v)} options={opts(ACCOUNT_TYPES)} /></Field>
      <Field label="Bank"><Input value={bank} onChangeText={setBank} /></Field>
      <Field label="Last 4 digits"><Input value={last4} onChangeText={(v) => setLast4(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={4} /></Field>
      <Field label="Opening balance"><Input value={balance} onChangeText={setBalance} keyboardType="decimal-pad" /></Field>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><Text style={{ color: C.text }}>Primary account</Text><Switch value={primary} onValueChange={setPrimary} trackColor={{ true: C.accent }} /></View>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Btn label="Create" disabled={!name.trim() || last4.length !== 4 || runner.busy} onPress={() => void runner.run(() => api.finance.createAccount({ accountName: name.trim(), accountType: type, bankName: bank.trim() || undefined, accountNumber: last4, currencyCode: 'INR', currentBalance: Number(balance) || 0, isPrimary: primary }), onSaved)} />
    </Sheet>
  );
}

function Categories() {
  const api = useApi();
  const runner = useRunner();
  const categories = useAsync(() => api.finance.categories(), api);
  const rules = useAsync(() => api.finance.rules(), api);
  const merchants = useAsync(() => api.finance.merchants(), api);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [ruleValue, setRuleValue] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const cats = categories.data ?? [];

  const columns: Col<FinanceCategory>[] = [
    { id: 'name', title: 'Name', value: (c) => c.name, filter: { type: 'text' }, cell: (c) => <Text style={{ color: c.isActive ? C.text : C.muted, fontSize: 15, fontWeight: '700' }}>{c.icon} {c.name}</Text> },
    { id: 'type', title: 'Type', value: (c) => pretty(c.type), filter: { type: 'select' } },
    { id: 'active', title: 'Visible', value: (c) => c.isActive, filter: { type: 'boolean', labels: ['Visible', 'Hidden'] } },
  ];

  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="New category">
        <Input value={name} onChangeText={setName} placeholder="Category name" style={{ marginBottom: 10 }} />
        <View style={{ marginBottom: 10 }}><Chips value={type} onChange={(v) => v && setType(v)} options={opts(['EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT'] as const)} /></View>
        <Btn label="Add category" disabled={!name.trim()} onPress={() => { const n = name.trim(); setName(''); void runner.run(() => api.finance.createCategory({ name: n, type, displayOrder: cats.length }), categories.reload); }} />
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
        rowActions={(c, close) => (
          <>
            <Btn kind="ghost" label={c.isActive ? 'Hide' : 'Show'} onPress={() => { close(); void runner.run(() => api.finance.updateCategory(c.id, { isActive: !c.isActive }), categories.reload); }} />
            <Btn kind="danger" label="Delete" onPress={() => { close(); void runner.run(() => api.finance.deleteCategory(c.id), categories.reload); }} />
          </>
        )}
      />
      <View style={{ height: 14 }} />
      <Panel title={`Auto-categorise rules · ${(rules.data ?? []).length}`}>
        <Input value={ruleValue} onChangeText={setRuleValue} placeholder="When the description contains…" autoCapitalize="none" style={{ marginBottom: 10 }} />
        <View style={{ marginBottom: 10 }}><Chips value={ruleCategory} onChange={setRuleCategory} options={cats.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} /></View>
        <Btn kind="ghost" label="Add rule" disabled={!ruleValue.trim() || !ruleCategory} onPress={() => { const v = ruleValue.trim(); setRuleValue(''); void runner.run(() => api.finance.createRule({ categoryId: ruleCategory, matchType: 'CONTAINS', matchField: 'DESCRIPTION', matchValue: v, priority: 100 }), rules.reload); }} style={{ marginBottom: 12 }} />
        <RulesTable tableId="finance.rules.categories" rules={rules.data ?? []} categories={cats} runner={runner} reload={rules.reload} loading={rules.loading && !rules.data} />
      </Panel>
      <Panel title={`Merchants · ${(merchants.data ?? []).length}`}>
        <MerchantsTable tableId="finance.merchants.categories" merchants={merchants.data ?? []} categories={cats} loading={merchants.loading && !merchants.data} onDelete={(m, close) => { close(); void runner.run(() => api.finance.deleteMerchant(m.id), merchants.reload); }} />
      </Panel>
    </>
  );
}
