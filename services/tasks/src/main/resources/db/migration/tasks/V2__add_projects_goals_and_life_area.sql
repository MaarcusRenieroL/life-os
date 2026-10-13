-- Real, named lookups for "link to project" / "link to goal" (replacing the raw-UUID text
-- fields the first pass shipped with) and a closed enum for "area" (the fixed Career/Health/
-- Finance/Learning/Relationships/Personal set from the product spec, not a user-managed table).

create table tasks_schema.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(200) not null,
  created_at timestamptz not null default now()
);

create index idx_projects_user_id on tasks_schema.projects (user_id);

create table tasks_schema.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(200) not null,
  created_at timestamptz not null default now()
);

create index idx_goals_user_id on tasks_schema.goals (user_id);

alter table tasks_schema.tasks drop column area_id;

alter table tasks_schema.tasks add column area varchar(20)
  check (area in ('CAREER', 'HEALTH', 'FINANCE', 'LEARNING', 'RELATIONSHIPS', 'PERSONAL'));

-- project_id/goal_id already existed as bare uuid columns (no earlier data to worry about) - now
-- that projects/goals live in this same schema, give them real FK constraints.
alter table tasks_schema.tasks
  add constraint fk_tasks_project_id foreign key (project_id) references tasks_schema.projects (id) on delete set null;

alter table tasks_schema.tasks
  add constraint fk_tasks_goal_id foreign key (goal_id) references tasks_schema.goals (id) on delete set null;
