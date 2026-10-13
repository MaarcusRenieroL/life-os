alter table finance_schema.categories
    add column exclude_from_auto_learning boolean not null default false;

create table finance_schema.user_finance_settings (
    user_id uuid primary key,
    monthly_income numeric(14,2),
    updated_at timestamptz not null default now()
);
