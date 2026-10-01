-- Calendar module: a flat events table. Timed events use start_at/end_at
-- (timestamptz); all-day events use start_date/end_date (date) instead - only
-- one pair is populated per row, selected by all_day. area_id / project_id /
-- goal_id / source_task_id are deliberately plain uuid columns with no
-- foreign key - they point at rows owned by other services/schemas and this
-- module never joins across schema boundaries, matching tasks_schema.tasks'
-- area_id/project_id/goal_id convention.

create schema if not exists calendar_schema;

create table calendar_schema.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title varchar(500) not null,
  description text,
  location varchar(500),
  category varchar(20) not null default 'OTHER'
    check (category in ('WORK', 'PERSONAL', 'FOCUS', 'GYM', 'JOB', 'OTHER')),
  color varchar(20),
  all_day boolean not null default false,
  start_at timestamptz,
  end_at timestamptz,
  start_date date,
  end_date date,
  free_busy varchar(10) not null default 'BUSY'
    check (free_busy in ('FREE', 'BUSY')),
  area_id uuid,
  project_id uuid,
  goal_id uuid,
  source_task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_events_user_id on calendar_schema.events (user_id);
create index idx_events_user_start_at on calendar_schema.events (user_id, start_at);
create index idx_events_user_start_date on calendar_schema.events (user_id, start_date);
