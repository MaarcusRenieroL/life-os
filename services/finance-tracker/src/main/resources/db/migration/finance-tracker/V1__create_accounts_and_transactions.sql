create schema if not exists finance_schema;

create table finance_schema.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  account_name varchar(100),
  account_type varchar(50),
  bank_name varchar(100),
  account_number_encrypted text,
  currency_code varchar(3),
  opened_date timestamptz,
  current_balance decimal(15, 2),
  is_active boolean,
  is_primary boolean,
  email_for_alerts varchar(255),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table finance_schema.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references finance_schema.accounts (id),
  user_id uuid not null,
  transaction_date timestamptz,
  description varchar(200),
  amount decimal,
  type varchar(20),
  tags jsonb,
  notes text,
  receipt_url text,
  is_recurring boolean,
  source_type varchar(30),
  source_reference text,
  is_reconciled boolean,
  is_duplicate boolean,
  duplicate_of uuid references finance_schema.transactions (id),
  status varchar(30),
  imported_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_accounts_user_id on finance_schema.accounts (user_id);
create index idx_transactions_user_id on finance_schema.transactions (user_id);
