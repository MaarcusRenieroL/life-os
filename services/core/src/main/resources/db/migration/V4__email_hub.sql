-- Email hub: one row per inbox email the hub has looked at, recording what it was judged to be and
-- what (if anything) it did about it. The row is also the dedupe key - a message id already here is
-- never classified again - and the audit trail behind the inbox page's approve / dismiss / undo.
--
-- Only a short snippet of the body is kept, never the whole email.

create table core_schema.email_hub_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gmail_message_id varchar(200) not null,
  from_address varchar(500),
  subject varchar(1000),
  snippet varchar(600),
  received_at timestamptz,
  category varchar(20) not null
    check (category in ('TASK', 'BILL', 'EVENT', 'SUBSCRIPTION', 'IGNORE')),
  confidence varchar(10),
  summary varchar(500),
  -- The fields extracted for the action, so a review-queue item can be approved as proposed.
  proposal_json jsonb,
  status varchar(20) not null
    check (status in ('APPLIED', 'NEEDS_REVIEW', 'DISMISSED', 'UNDONE', 'IGNORED', 'FAILED')),
  target_module varchar(20),
  target_id varchar(100),
  note varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);

create index idx_email_hub_items_user_status on core_schema.email_hub_items (user_id, status, created_at desc);
