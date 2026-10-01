-- Automation: user-defined "when X happens, do Y" rules and a log of every time one ran.
--
-- trigger_config / action_config are jsonb because their shape depends on the type (an event rule
-- has an entity type and conditions, a schedule has a time and day, a threshold has a metric and a
-- value) - RuleValidator checks them on write, so what's stored is always well-formed.

create table core_schema.automation_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(200) not null,
  description varchar(1000),
  enabled boolean not null default true,
  trigger_type varchar(20) not null
    check (trigger_type in ('ON_CREATE', 'ON_COMPLETE', 'ON_UPDATE', 'SCHEDULED', 'THRESHOLD')),
  trigger_config jsonb not null default '{}'::jsonb,
  action_type varchar(30) not null
    check (action_type in ('CREATE_TASK', 'CREATE_EVENT', 'SEND_NOTIFICATION', 'LINK_ITEMS', 'UPDATE_STATUS', 'GENERATE_REPORT')),
  action_config jsonb not null default '{}'::jsonb,
  template_key varchar(60),
  -- Threshold rules fire when the condition becomes true and stay quiet until it has cleared and
  -- come back, so a goal that's behind doesn't notify every 30 minutes.
  threshold_active boolean not null default false,
  last_run_at timestamptz,
  run_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_automation_rules_user_id on core_schema.automation_rules (user_id);
create index idx_automation_rules_enabled_trigger on core_schema.automation_rules (enabled, trigger_type);

create table core_schema.automation_executions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references core_schema.automation_rules (id) on delete cascade,
  user_id uuid not null,
  status varchar(20) not null check (status in ('SUCCESS', 'FAILED')),
  message text,
  trigger_summary varchar(500),
  -- The automation-events event that caused this run, so a redelivered Kafka message can't run a
  -- rule twice. Null for scheduled, threshold and manual runs.
  event_id uuid,
  executed_at timestamptz not null default now()
);

create index idx_automation_executions_rule on core_schema.automation_executions (rule_id, executed_at desc);
create index idx_automation_executions_user on core_schema.automation_executions (user_id, executed_at desc);
create unique index uq_automation_executions_rule_event on core_schema.automation_executions (rule_id, event_id) where event_id is not null;
