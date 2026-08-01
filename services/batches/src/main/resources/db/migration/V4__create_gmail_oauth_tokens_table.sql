create table batches_schema.gmail_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_gmail_oauth_tokens_user_id on batches_schema.gmail_oauth_tokens (user_id);
