create schema if not exists auth_schema;

create table auth_schema.users (
  id uuid primary key default gen_random_uuid (),
  email varchar(255) unique not null,
  password_hash varchar(255) not null,
  created_at timestamptz default now (),
  updated_at timestamptz default now ()
);

create table auth_schema.device_sessions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth_schema.users (id),
  device_name varchar(255),
  device_type varchar(50),
  created_at timestamptz default now (),
  last_active_at timestamptz default now (),
  revoked_at timestamptz
);

create table auth_schema.refresh_tokens (
  id uuid primary key default gen_random_uuid (),
  device_session_id uuid not null references auth_schema.device_sessions (id),
  token_hash varchar(255) not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz default now ()
);

create table auth_schema.biometric_enrollments (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth_schema.users (id),
  device_id varchar(255),
  public_key text not null,
  type varchar(50),
  created_at timestamptz default now ()
);

create index idx_refresh_tokens_token_hash on auth_schema.refresh_tokens (token_hash);

create index idx_refresh_tokens_device_session_id on auth_schema.refresh_tokens (device_session_id);

create index idx_device_sessions_user_id on auth_schema.device_sessions (user_id);

create index idx_biometric_enrollments_user_id on auth_schema.biometric_enrollments (user_id);
