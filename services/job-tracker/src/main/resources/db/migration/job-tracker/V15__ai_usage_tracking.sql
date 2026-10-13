-- Self-tracked Claude API spend - one row per completed call, so the home-page usage widget can
-- show real cost without needing the (org-admin-only) Anthropic Usage & Cost Admin API.

create table job_tracker_schema.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  model varchar(60) not null,
  input_tokens integer not null,
  output_tokens integer not null,
  estimated_cost_usd numeric(10, 4),
  created_at timestamptz not null default now()
);

create index ai_usage_log_created_at_idx on job_tracker_schema.ai_usage_log(created_at);
