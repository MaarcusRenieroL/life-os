create table vault_schema.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code_hash varchar(255) not null,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index idx_recovery_codes_user_id on vault_schema.recovery_codes (user_id);
