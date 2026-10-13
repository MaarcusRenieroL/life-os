-- Bank alerts and statement rows that could not be turned into a transaction. They used to be logged
-- and dropped (a missing account, a format no parser knew), so money simply went missing from the
-- books. Now they wait here for the user to retry, fix or dismiss them.
create table finance_schema.import_failures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source varchar(20) not null check (source in ('EMAIL_ALERT', 'STATEMENT')),
  reason varchar(20) not null check (reason in ('NO_ACCOUNT', 'UNPARSED', 'ERROR')),
  -- The Gmail message id (or statement row key): one failure per email, however often it is retried.
  reference varchar(255) not null,
  sender varchar(320),
  subject text,
  snippet text,
  -- The parsed alert, when there is one, so it can be replayed once the cause is fixed.
  payload jsonb,
  detail varchar(500),
  status varchar(12) not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, reference)
);

create index idx_import_failures_open on finance_schema.import_failures (user_id, created_at desc)
  where status = 'OPEN';
