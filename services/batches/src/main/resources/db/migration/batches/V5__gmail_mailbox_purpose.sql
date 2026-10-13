-- One connected mailbox per purpose: job mail and bank mail often arrive at different addresses.
-- The existing connection keeps working as the FINANCE mailbox (its address is filled in lazily).
alter table batches_schema.gmail_oauth_tokens
  add column purpose varchar(20) not null default 'FINANCE'
    check (purpose in ('FINANCE', 'JOBS')),
  add column email varchar(320);

alter table batches_schema.gmail_oauth_tokens
  add constraint uq_gmail_oauth_tokens_user_purpose unique (user_id, purpose);
