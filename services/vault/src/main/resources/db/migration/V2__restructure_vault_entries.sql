drop table if exists vault_schema.vault_entries;

create table vault_schema.vault_entries (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null,
  type varchar(20) not null default 'LOGIN',
  title varchar(255) not null,
  email varchar(255),
  username varchar(255),
  url varchar(2048),
  icon varchar(2048),
  password_encrypted text,
  password_iv varchar(255),
  notes_encrypted text,
  notes_iv varchar(255),
  category_id uuid,
  is_favorite boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz default now (),
  updated_at timestamptz default now ()
);

create index idx_vault_entries_user_id on vault_schema.vault_entries (user_id);

create index idx_vault_entries_user_id_category_id on vault_schema.vault_entries (user_id, category_id);

create index idx_vault_entries_user_id_is_favorite on vault_schema.vault_entries (user_id, is_favorite);
