create table batches_schema.audit_events (
  event_id uuid primary key,
  service varchar(50) not null,
  user_id uuid not null,
  event_type varchar(50) not null,
  description text not null,
  metadata jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_audit_events_user_id on batches_schema.audit_events (user_id);
create index idx_audit_events_user_id_occurred_at on batches_schema.audit_events (user_id, occurred_at desc);
