-- Generic per-user, per-module key-value settings - superseding the boolean-only model for
-- anything beyond module on/off (which stays on user_module_settings, a distinct concern with
-- its own semantics and cache).
create table core_schema.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  module varchar(50) not null,
  key varchar(100) not null,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module, key)
);

create index idx_user_settings_user_id on core_schema.user_settings (user_id);

-- Materialized notification rows, fed by NotificationEventPublisher via the
-- notification-events Kafka topic (mirrors how batches consumes activity-events for the
-- audit log). requires_ai_fallback_approval/ai_fallback_approved carry the "Ollama failed
-- on a background task, needs sign-off before spending on Claude" flow.
create table core_schema.notifications (
  id uuid primary key,
  user_id uuid not null,
  module varchar(50) not null,
  type varchar(50) not null,
  title varchar(255) not null,
  body text,
  metadata jsonb,
  read boolean not null default false,
  requires_ai_fallback_approval boolean not null default false,
  ai_fallback_approved boolean,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id_created_at on core_schema.notifications (user_id, created_at desc);
create index idx_notifications_user_id_read on core_schema.notifications (user_id, read);
