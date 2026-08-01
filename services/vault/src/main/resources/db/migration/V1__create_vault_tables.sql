create schema if not exists vault_schema;

create table vault_schema.vault_master_passwords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  password_hash varchar(255) not null,
  salt varchar(255) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table vault_schema.vault_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title varchar(255) not null,
  content_encrypted text not null,
  iv varchar(255) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_vault_master_passwords_user_id on vault_schema.vault_master_passwords (user_id);
create index idx_vault_entries_user_id on vault_schema.vault_entries (user_id);
