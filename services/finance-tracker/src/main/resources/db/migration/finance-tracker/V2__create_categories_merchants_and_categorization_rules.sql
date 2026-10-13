create table finance_schema.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name varchar(100),
  type varchar(50),
  color varchar(7),
  icon varchar(50),
  parent_category_id uuid references finance_schema.categories (id),
  is_active boolean,
  display_order int,
  created_at timestamptz default now()
);

create table finance_schema.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name varchar(150),
  description varchar(500),
  category_id uuid references finance_schema.categories (id),
  logo_url text,
  website text,
  transaction_count int,
  last_transaction_date timestamptz,
  average_transaction_amount decimal(15, 2),
  aliases jsonb,
  is_recognized boolean,
  created_at timestamptz default now()
);

create table finance_schema.categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null references finance_schema.categories (id),
  match_type varchar(20),
  match_field varchar(30),
  match_value text,
  priority int,
  is_active boolean,
  hit_count int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_categories_user_id on finance_schema.categories (user_id);
create index idx_merchants_user_id on finance_schema.merchants (user_id);
create index idx_categorization_rules_user_id on finance_schema.categorization_rules (user_id);
