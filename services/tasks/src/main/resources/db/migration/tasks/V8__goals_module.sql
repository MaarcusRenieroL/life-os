-- Grows the minimal name-only goals lookup (V2) into the full Goals module. Existing rows keep
-- working: every new column is nullable or defaulted, so a goal that was only ever a name in a
-- task/event picker is now simply an ACTIVE, priority-3 goal with no target date.

alter table tasks_schema.goals
  add column description text,
  add column area varchar(20)
    check (area in ('CAREER', 'HEALTH', 'FINANCE', 'LEARNING', 'RELATIONSHIPS', 'PERSONAL')),
  add column priority integer not null default 3 check (priority between 1 and 4),
  add column status varchar(20) not null default 'ACTIVE'
    check (status in ('ACTIVE', 'ON_TRACK', 'AT_RISK', 'PAUSED', 'COMPLETED', 'ARCHIVED')),
  add column start_date date,
  add column target_date date,
  add column review_frequency varchar(20) check (review_frequency in ('BIWEEKLY', 'MONTHLY')),
  add column next_review_date date,
  add column review_notified_for date,
  add column completed_at timestamptz,
  add column updated_at timestamptz not null default now();

create index idx_goals_user_status on tasks_schema.goals (user_id, status);

create table tasks_schema.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references tasks_schema.goals (id) on delete cascade,
  user_id uuid not null,
  title varchar(200) not null,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_goal_milestones_goal_id on tasks_schema.goal_milestones (goal_id);

create table tasks_schema.goal_metrics (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references tasks_schema.goals (id) on delete cascade,
  user_id uuid not null,
  name varchar(120) not null,
  metric_type varchar(20) not null
    check (metric_type in ('WEIGHT', 'SAVINGS', 'COUNT', 'PERCENTAGE', 'HOURS')),
  unit varchar(20),
  start_value numeric(14, 2) not null default 0,
  target_value numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create index idx_goal_metrics_goal_id on tasks_schema.goal_metrics (goal_id);

create table tasks_schema.goal_metric_entries (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references tasks_schema.goal_metrics (id) on delete cascade,
  user_id uuid not null,
  value numeric(14, 2) not null,
  note text,
  recorded_on date not null,
  created_at timestamptz not null default now()
);

create index idx_goal_metric_entries_metric_id on tasks_schema.goal_metric_entries (metric_id, recorded_on desc);

create table tasks_schema.goal_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_goal_id uuid not null references tasks_schema.goals (id) on delete cascade,
  target_goal_id uuid not null references tasks_schema.goals (id) on delete cascade,
  link_type varchar(20) not null check (link_type in ('BLOCKS', 'SUPPORTS')),
  created_at timestamptz not null default now(),
  check (source_goal_id <> target_goal_id),
  unique (source_goal_id, target_goal_id, link_type)
);

create index idx_goal_links_target on tasks_schema.goal_links (target_goal_id);

create table tasks_schema.goal_reviews (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references tasks_schema.goals (id) on delete cascade,
  user_id uuid not null,
  review_date date not null,
  progress_summary text,
  blockers text,
  next_steps text,
  notes text,
  progress_snapshot integer not null,
  status_snapshot varchar(20) not null,
  created_at timestamptz not null default now()
);

create index idx_goal_reviews_goal_id on tasks_schema.goal_reviews (goal_id, review_date desc);
