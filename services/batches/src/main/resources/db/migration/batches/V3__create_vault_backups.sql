create table batches_schema.vault_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot text not null,
  created_at timestamptz not null default now()
);

create index idx_vault_backups_user_id_created_at on batches_schema.vault_backups (user_id, created_at desc);
