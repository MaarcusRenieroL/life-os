-- Ledger integrity.
--
-- 1. Balances become derivable: current_balance = opening_balance + net of counted transactions.
--    Until now current_balance was an incrementally maintained number that drifted whenever a
--    transaction was deleted outside the API, merged as a duplicate, or edited twice. The opening
--    balance is back-filled so every account's balance is unchanged by this migration.
alter table finance_schema.accounts
  add column opening_balance decimal(15, 2) not null default 0;

update finance_schema.accounts a
set opening_balance = coalesce(a.current_balance, 0) - coalesce((
  select sum(case t.type when 'CREDIT' then t.amount when 'DEBIT' then -t.amount else 0 end)
  from finance_schema.transactions t
  where t.account_id = a.id and t.is_duplicate = false and t.status <> 'IGNORED'
), 0);

-- 2. Transfers between the user's own accounts: two legs (a debit and a credit) that move balances
--    but are neither spending nor income, so reports and budgets skip them.
alter table finance_schema.transactions
  add column is_transfer boolean not null default false,
  add column transfer_pair_id uuid;

create index idx_transactions_transfer_pair
  on finance_schema.transactions (transfer_pair_id)
  where transfer_pair_id is not null;

-- 3. A budget alert fires once per budget period, not on every transaction after the threshold.
alter table finance_schema.budgets
  add column last_alert_cycle varchar(32);

-- 4. Budgets and the dashboard follow the pay cycle: it starts on the day salary lands (1-28).
alter table finance_schema.user_finance_settings
  add column pay_cycle_start_day integer not null default 1
    check (pay_cycle_start_day between 1 and 28);
