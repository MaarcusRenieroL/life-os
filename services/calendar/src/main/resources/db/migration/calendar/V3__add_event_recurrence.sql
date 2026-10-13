-- Mirrors services/tasks' V3: a recurring "definition" is an ordinary row in this same table (its
-- own start is the first occurrence); generated occurrences point back via recurring_parent_id.

alter table calendar_schema.events add column recurrence_pattern varchar(20)
  check (recurrence_pattern in ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'));

alter table calendar_schema.events add column recurrence_config jsonb;

alter table calendar_schema.events add column recurrence_end_date date;

alter table calendar_schema.events add column recurrence_paused boolean not null default false;

alter table calendar_schema.events add column recurrence_skipped_dates jsonb;

alter table calendar_schema.events add column recurring_parent_id uuid
  references calendar_schema.events (id) on delete cascade;

create index idx_events_recurring_parent_id on calendar_schema.events (recurring_parent_id);

create index idx_events_recurrence_pattern on calendar_schema.events (recurrence_pattern)
  where recurrence_pattern is not null and recurring_parent_id is null;
