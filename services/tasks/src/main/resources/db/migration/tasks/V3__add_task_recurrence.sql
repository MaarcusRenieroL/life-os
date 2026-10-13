-- Recurring tasks. A recurring "definition" is a normal row in this same table (its own due_date
-- is the first occurrence); generated occurrences are additional rows pointing back via
-- recurring_parent_id - deliberately not reusing parent_task_id, which already means "subtask
-- parent" and has its own ON DELETE CASCADE semantics that don't apply here.

alter table tasks_schema.tasks add column recurrence_pattern varchar(20)
  check (recurrence_pattern in ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'));

alter table tasks_schema.tasks add column recurrence_config jsonb;

alter table tasks_schema.tasks add column recurrence_end_date date;

alter table tasks_schema.tasks add column recurrence_paused boolean not null default false;

alter table tasks_schema.tasks add column recurrence_skipped_dates jsonb;

alter table tasks_schema.tasks add column recurring_parent_id uuid
  references tasks_schema.tasks (id) on delete cascade;

create index idx_tasks_recurring_parent_id on tasks_schema.tasks (recurring_parent_id);

-- Used by the nightly generator to find active recurring definitions without scanning every task.
create index idx_tasks_recurrence_pattern on tasks_schema.tasks (recurrence_pattern)
  where recurrence_pattern is not null and recurring_parent_id is null;
