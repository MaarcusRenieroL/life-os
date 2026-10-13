alter table finance_schema.transactions
  add column category_id uuid references finance_schema.categories (id),
  add column category_manually_set boolean default false;

create index idx_transactions_category_id on finance_schema.transactions (category_id);
