create table tasks_schema.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  task_id uuid,
  type varchar(20) not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer,
  notes varchar(1000),
  created_at timestamptz not null default now()
);

create index idx_time_entries_user_id on tasks_schema.time_entries (user_id);
create index idx_time_entries_task_id on tasks_schema.time_entries (task_id);
