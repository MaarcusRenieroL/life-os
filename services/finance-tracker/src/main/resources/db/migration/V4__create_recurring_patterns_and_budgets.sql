create table finance_schema.recurring_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  merchant_id uuid references finance_schema.merchants (id),
  category_id uuid references finance_schema.categories (id),
  average_amount decimal(15, 2),
  frequency varchar(20),
  expected_day_of_cycle int,
  last_transaction_date timestamptz,
  next_expected_date timestamptz,
  variance decimal(6, 2),
  confidence_score decimal(4, 3),
  last_detected_at timestamptz,
  created_at timestamptz default now()
);

create table finance_schema.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null references finance_schema.categories (id),
  budget_amount decimal(15, 2),
  period varchar(20),
  start_date timestamptz,
  end_date timestamptz,
  alert_threshold int,
  alert_enabled boolean,
  notes varchar(500),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_recurring_patterns_user_id on finance_schema.recurring_patterns (user_id);
create index idx_budgets_user_id on finance_schema.budgets (user_id);
