create table vault_schema.vault_categories (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null,
  name varchar(100) not null,
  color varchar(7),
  created_at timestamptz default now (),
  updated_at timestamptz default now (),
  unique (user_id, name)
);

create index idx_vault_categories_user_id on vault_schema.vault_categories (user_id);

alter table vault_schema.vault_entries add constraint fk_vault_entries_category foreign key (category_id) references vault_schema.vault_categories (id) on delete set null;
