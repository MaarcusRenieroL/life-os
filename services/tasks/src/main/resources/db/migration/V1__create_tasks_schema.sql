-- Tasks module: flat task table with optional self-referencing parent_task_id
-- for subtasks. area_id / project_id / goal_id are deliberately plain uuid
-- columns with no foreign key - they point at rows owned by other
-- services/schemas (or, for area_id, a concept not yet backed by its own
-- table anywhere in this codebase) and this module never joins across schema
-- boundaries, matching habit_tracker_schema.habits' area_id/goal_id convention.

create schema if not exists tasks_schema;

create table tasks_schema.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title varchar(500) not null,
  description text,
  status varchar(20) not null default 'TODO'
    check (status in ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED')),
  priority varchar(10) not null default 'MEDIUM'
    check (priority in ('URGENT', 'HIGH', 'MEDIUM', 'LOW')),
  due_date date,
  due_time time,
  all_day boolean not null default true,
  area_id uuid,
  project_id uuid,
  goal_id uuid,
  parent_task_id uuid references tasks_schema.tasks (id) on delete cascade,
  tags jsonb,
  estimate_minutes integer,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_user_id on tasks_schema.tasks (user_id);
create index idx_tasks_user_status on tasks_schema.tasks (user_id, status);
create index idx_tasks_user_due_date on tasks_schema.tasks (user_id, due_date);
create index idx_tasks_parent_task_id on tasks_schema.tasks (parent_task_id);
