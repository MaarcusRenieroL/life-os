create table finance_schema.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references finance_schema.transactions (id) on delete cascade,
  category_id uuid not null references finance_schema.categories (id),
  created_at timestamptz default now(),
  unique (transaction_id, category_id)
);

create index idx_transaction_categories_transaction_id on finance_schema.transaction_categories (transaction_id);
create index idx_transaction_categories_category_id on finance_schema.transaction_categories (category_id);
