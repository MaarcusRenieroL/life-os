import { ACCOUNT_TYPES, dayKey, type AccountType, type BillingCycle, type CategoryType, type FinanceAccount, type FinanceCategory, type TransactionType } from '@life-os/core';
import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { Bars, Btn, Chips, DateInput, Empty, Field, Input, money, opts, Pill, pretty, Progress, Row, Screen, Seg, Sheet, Stat, StatGrid } from '@/kit';
import { useApi } from '@/lib/session';
import { useAsync, useRunner } from '@/lib/use-async';
import { C } from '@/theme';
import { ErrorNote, Muted, Panel, s } from '@/ui';

type TabId = 'dashboard' | 'transactions' | 'subscriptions' | 'budgets' | 'accounts' | 'categories';
const TABS = [{ id: 'dashboard', label: 'Dashboard' }, { id: 'transactions', label: 'Transactions' }, { id: 'subscriptions', label: 'Subscriptions' }, { id: 'budgets', label: 'Budgets' }, { id: 'accounts', label: 'Accounts' }, { id: 'categories', label: 'Categories' }] as const;

export default function Finance() {
  const [tab, setTab] = useState<TabId>('dashboard');
  return (
    <Screen title="Finance">
      <Seg tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'dashboard' ? <Dashboard /> : tab === 'transactions' ? <Transactions /> : tab === 'subscriptions' ? <Subscriptions /> : tab === 'budgets' ? <Budgets /> : tab === 'accounts' ? <Accounts /> : <Categories />}
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'NEEDS_REVIEW' | 'CATEGORIZED' | 'DUPLICATE'>('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const accounts = useAsync(() => api.finance.accounts(), api);
  const categories = useAsync(() => api.finance.categories(), api);
  const txns = useAsync(() => api.finance.transactions(page, 25, { search: search.trim() || undefined, status: status || undefined }), `${page}|${search}|${status}`);
  const r = txns.data;
  const account = (id: string) => accounts.data?.find((a) => a.id === id)?.accountName ?? '';
  const category = (id: string | null) => categories.data?.find((c) => c.id === id)?.name;
  return (
    <>
      <Input value={search} onChangeText={(v) => { setSearch(v); setPage(0); }} placeholder="Search transactions…" style={{ marginBottom: 10 }} />
      <View style={{ marginBottom: 10 }}><Chips value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={[{ value: 'NEEDS_REVIEW', label: 'Needs review' }, { value: 'CATEGORIZED', label: 'Categorized' }, { value: 'DUPLICATE', label: 'Duplicates' }]} clearable /></View>
      <Btn label="+ Add transaction" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      {txns.error && !r ? <ErrorNote message={txns.error} onRetry={txns.reload} /> : null}
      <Panel title={`${r?.totalElements ?? 0} transactions`}>
        {(r?.content.length ?? 0) === 0 && !txns.loading ? <Empty>No transactions match.</Empty> : r?.content.map((t) => (
          <Row key={t.id} onPress={() => setPicking(t.id)}>
            <View style={{ flex: 1 }}><Text style={s.body}>{t.description}</Text><Muted style={{ fontSize: 11 }}>{t.transactionDate} · {account(t.accountId)} · {category(t.categoryId) ?? 'Uncategorized'}{t.isTransfer ? ' · transfer' : ''}</Muted></View>
            <Text style={{ color: t.type === 'CREDIT' ? C.accent : t.type === 'TRANSFER' ? C.muted : C.text, fontWeight: '700' }}>{t.type === 'CREDIT' ? '+' : t.type === 'DEBIT' ? '−' : ''}{money(t.amount)}</Text>
          </Row>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Btn kind="ghost" label="‹ Prev" disabled={page === 0} onPress={() => setPage(page - 1)} style={{ paddingVertical: 7 }} />
          <Muted>Page {page + 1} of {Math.max(1, r?.totalPages ?? 1)}</Muted>
          <Btn kind="ghost" label="Next ›" disabled={r?.last ?? true} onPress={() => setPage(page + 1)} style={{ paddingVertical: 7 }} />
        </View>
      </Panel>
      {adding ? <TransactionSheet accounts={accounts.data ?? []} onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await txns.reload(); }} /> : null}
      {picking ? (
        <Sheet title="Categorise" onClose={() => setPicking(null)}>
          <Chips value={r?.content.find((t) => t.id === picking)?.categoryId ?? ''} onChange={(v) => { const id = picking; setPicking(null); void runner.run(() => api.finance.setCategories(id, v ? [v] : []), txns.reload); }} options={(categories.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} clearable />
          <Btn kind="danger" label="Delete transaction" onPress={() => { const id = picking; setPicking(null); void runner.run(() => api.finance.deleteTransaction(id), txns.reload); }} style={{ marginTop: 16 }} />
        </Sheet>
      ) : null}
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
  return (
    <>
      <Panel title="Recurring spend"><StatGrid><Stat label="Monthly" value={money(sm?.monthlyTotal)} sub={`${sm?.activeCount ?? 0} active`} /><Stat label="Yearly" value={money(sm?.yearlyTotal)} /><Stat label="Wasteful" value={money(sm?.wastefulMonthly)} sub={`${sm?.wastefulCount ?? 0} subs`} /><Stat label="Renewing soon" value={money(sm?.renewingSoonTotal)} sub={`${sm?.renewingSoonCount ?? 0} subs`} /></StatGrid></Panel>
      <Btn label="+ Subscription" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="Subscriptions">
        {(subs.data ?? []).length === 0 && !subs.loading ? <Empty>No subscriptions tracked.</Empty> : (subs.data ?? []).map((x) => (
          <View key={x.id} style={[s.row, { flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: C.text, fontWeight: '700' }}>{x.name}</Text><View style={{ flexDirection: 'row', gap: 6 }}>{x.wasteful ? <Pill label="wasteful" color={C.magenta} /> : null}<Pill label={x.status} color={x.status === 'ACTIVE' ? C.accent : C.muted} /></View></View>
            <Muted>{money(x.amount)} / {x.billingCycle.toLowerCase()} · next {x.nextBillingDate}{x.daysUntilRenewal != null && x.daysUntilRenewal <= 7 ? ` (in ${x.daysUntilRenewal}d)` : ''}</Muted>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {x.status === 'ACTIVE' ? <Pressable onPress={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'log-use'), reload)}><Text style={{ color: C.accent }}>Used it</Text></Pressable> : null}
              {x.status === 'ACTIVE' ? <Pressable onPress={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'pause'), reload)}><Text style={{ color: C.accent }}>Pause</Text></Pressable> : null}
              {x.status === 'PAUSED' ? <Pressable onPress={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'resume'), reload)}><Text style={{ color: C.accent }}>Resume</Text></Pressable> : null}
              {x.status !== 'CANCELLED' ? <Pressable onPress={() => void runner.run(() => api.finance.subscriptionAction(x.id, 'cancel'), reload)}><Text style={{ color: C.gold }}>Cancel</Text></Pressable> : null}
              <Pressable onPress={() => void runner.run(() => api.finance.deleteSubscription(x.id), reload)}><Text style={{ color: C.magenta }}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
      </Panel>
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
  const spend = useAsync(() => (ids ? api.finance.comparisons(ids.split(',')) : Promise.resolve([])), ids);
  const [adding, setAdding] = useState(false);
  const catName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? 'Category';
  const total = (budgets.data ?? []).reduce((n, b) => n + b.budgetAmount, 0);
  const spent = (spend.data ?? []).reduce((n, c) => n + c.currentMonthSpend, 0);
  return (
    <>
      <Panel title="Budgets this month"><Progress label="Total" pct={total ? (spent / total) * 100 : 0} right={`${money(spent)} of ${money(total)}`} /></Panel>
      <Btn label="+ Budget" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="By category">
        {(budgets.data ?? []).length === 0 && !budgets.loading ? <Empty>No budgets yet.</Empty> : (budgets.data ?? []).map((b) => {
          const used = spend.data?.find((c) => c.categoryId === b.categoryId)?.currentMonthSpend ?? 0;
          const pct = b.budgetAmount ? (used / b.budgetAmount) * 100 : 0;
          return <View key={b.id}><Progress label={catName(b.categoryId)} pct={pct} color={pct > 100 ? C.magenta : undefined} right={`${money(used)} / ${money(b.budgetAmount)}`} /><Pressable onPress={() => void runner.run(() => api.finance.deleteBudget(b.id), budgets.reload)}><Text style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Delete</Text></Pressable></View>;
        })}
      </Panel>
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
  return (
    <>
      <Panel title="Net balance"><Text style={{ color: C.text, fontSize: 24, fontWeight: '700' }}>{money(list.reduce((n, a) => n + (a.accountType === 'CREDIT_CARD' ? -Math.abs(a.currentBalance) : a.currentBalance), 0))}</Text></Panel>
      <Btn label="+ Account" onPress={() => setAdding(true)} style={{ marginBottom: 12 }} />
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title={`Accounts · ${list.length}`}>
        {list.length === 0 && !accounts.loading ? <Empty>No accounts yet.</Empty> : list.map((a) => (
          <Row key={a.id}><View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '700' }}>{a.accountName}{a.isPrimary ? ' ★' : ''}</Text><Muted style={{ fontSize: 11 }}>{[a.bankName, pretty(a.accountType), `••${a.accountNumberLastFour}`].filter(Boolean).join(' · ')}</Muted></View><Text style={{ color: C.text, fontWeight: '700' }}>{money(a.currentBalance, a.currencyCode)}</Text><Pressable onPress={() => void runner.run(() => api.finance.deleteAccount(a.id), accounts.reload)}><Text style={{ color: C.muted }}>✕</Text></Pressable></Row>
        ))}
      </Panel>
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
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? '—';
  const groups = (['EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT'] as const).map((t) => ({ type: t, items: cats.filter((c) => c.type === t) })).filter((g) => g.items.length);
  return (
    <>
      {runner.error ? <ErrorNote message={runner.error} /> : null}
      <Panel title="New category">
        <Input value={name} onChangeText={setName} placeholder="Category name" style={{ marginBottom: 10 }} />
        <View style={{ marginBottom: 10 }}><Chips value={type} onChange={(v) => v && setType(v)} options={opts(['EXPENSE', 'INCOME', 'TRANSFER', 'INVESTMENT'] as const)} /></View>
        <Btn label="Add category" disabled={!name.trim()} onPress={() => { const n = name.trim(); setName(''); void runner.run(() => api.finance.createCategory({ name: n, type, displayOrder: cats.length }), categories.reload); }} />
      </Panel>
      {groups.map((g) => <Panel key={g.type} title={`${pretty(g.type)} · ${g.items.length}`}>{g.items.map((c) => <Row key={c.id}><Text style={[s.body, !c.isActive && { color: C.muted }]}>{c.icon} {c.name}{c.isActive ? '' : ' (hidden)'}</Text><Pressable onPress={() => void runner.run(() => api.finance.updateCategory(c.id, { isActive: !c.isActive }), categories.reload)}><Text style={{ color: C.accent }}>{c.isActive ? 'Hide' : 'Show'}</Text></Pressable><Pressable onPress={() => void runner.run(() => api.finance.deleteCategory(c.id), categories.reload)}><Text style={{ color: C.magenta }}>Delete</Text></Pressable></Row>)}</Panel>)}
      <Panel title={`Auto-categorise rules · ${(rules.data ?? []).length}`}>
        <Input value={ruleValue} onChangeText={setRuleValue} placeholder="When the description contains…" autoCapitalize="none" style={{ marginBottom: 10 }} />
        <View style={{ marginBottom: 10 }}><Chips value={ruleCategory} onChange={setRuleCategory} options={cats.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))} /></View>
        <Btn kind="ghost" label="Add rule" disabled={!ruleValue.trim() || !ruleCategory} onPress={() => { const v = ruleValue.trim(); setRuleValue(''); void runner.run(() => api.finance.createRule({ categoryId: ruleCategory, matchType: 'CONTAINS', matchField: 'DESCRIPTION', matchValue: v, priority: 100 }), rules.reload); }} />
        {(rules.data ?? []).map((r) => <Row key={r.id}><View style={{ flex: 1 }}><Text style={[s.body, !r.isActive && { color: C.muted }]}>“{r.matchValue}” → {catName(r.categoryId)}</Text><Muted style={{ fontSize: 11 }}>{r.hitCount} hits{r.autoLearned ? ' · learned' : ''}</Muted></View><Pressable onPress={() => void runner.run(() => api.finance.updateRule(r.id, { isActive: !r.isActive }), rules.reload)}><Text style={{ color: C.accent }}>{r.isActive ? 'Off' : 'On'}</Text></Pressable><Pressable onPress={() => void runner.run(() => api.finance.deleteRule(r.id), rules.reload)}><Text style={{ color: C.magenta }}>✕</Text></Pressable></Row>)}
      </Panel>
      <Panel title={`Merchants · ${(merchants.data ?? []).length}`}>
        {(merchants.data ?? []).length === 0 ? <Empty>Merchants appear as transactions are imported.</Empty> : (merchants.data ?? []).map((m) => <Row key={m.id}><View style={{ flex: 1 }}><Text style={s.body}>{m.name}</Text><Muted style={{ fontSize: 11 }}>{catName(m.categoryId)} · {m.transactionCount} txns · avg {money(m.averageTransactionAmount)}</Muted></View><Pressable onPress={() => void runner.run(() => api.finance.deleteMerchant(m.id), merchants.reload)}><Text style={{ color: C.muted }}>✕</Text></Pressable></Row>)}
      </Panel>
    </>
  );
}
