create schema if not exists core_schema;

create table core_schema.user_module_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module_code varchar(10) not null,
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, module_code)
);

create index idx_user_module_settings_user_id on core_schema.user_module_settings (user_id);
