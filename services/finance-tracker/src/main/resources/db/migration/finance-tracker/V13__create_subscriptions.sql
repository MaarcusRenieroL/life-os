-- Explicit, user-managed subscriptions (Netflix, a gym, a domain renewal...). Distinct from
-- recurring_patterns, which are *detected* from transaction history: a subscription is something
-- the user declared, so it can carry what detection can't know - the billing cycle they signed up
-- for, whether they actually use it, and when to be reminded.
--
-- account_id / category_id are plain uuids (no FK), same convention as the other finance tables
-- that reference accounts/categories by id - a deleted account must not cascade into billing
-- history or block deleting the account.

create table finance_schema.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(200) not null,
  amount decimal(15, 2) not null check (amount > 0),
  billing_cycle varchar(20) not null check (billing_cycle in ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  next_billing_date date not null,
  -- Day of month the first billing landed on. Monthly/yearly cycles re-derive each date from this
  -- anchor instead of adding a month to the previous date, so a subscription that bills on the
  -- 31st goes Jan 31 -> Feb 28 -> Mar 31, not Jan 31 -> Feb 28 -> Mar 28 forever after.
  billing_anchor_day integer not null check (billing_anchor_day between 1 and 31),
  status varchar(20) not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'CANCELLED')),
  account_id uuid,
  category_id uuid,
  auto_create_expense boolean not null default true,
  reminder_days_before integer not null default 3 check (reminder_days_before between 0 and 30),
  -- The next_billing_date a renewal reminder was already sent for, so it fires once per cycle.
  reminder_sent_for date,
  last_billed_on date,
  usage_rating integer check (usage_rating between 1 and 5),
  last_used_on date,
  notes varchar(1000),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user_id on finance_schema.subscriptions (user_id);
create index idx_subscriptions_status_next_billing on finance_schema.subscriptions (status, next_billing_date);
