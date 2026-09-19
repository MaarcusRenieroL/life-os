-- Habit tracker module: habits, their daily/periodic logs, a derived streak
-- cache (recomputed on log write, not read), and optional reminders.
-- area_id / goal_id are deliberately plain uuid columns with no foreign key -
-- they point at rows owned by other services/schemas and this module never
-- joins across schema boundaries.

create schema if not exists habit_tracker_schema;

create table habit_tracker_schema.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name varchar(500) not null,
  description text,
  type varchar(20) not null
    check (type in ('BINARY', 'COUNT', 'DURATION', 'NEGATIVE')),
  category varchar(255),
  area_id uuid,
  goal_id uuid,
  frequency_type varchar(20) not null
    check (frequency_type in ('DAILY', 'WEEKLY_DAYS', 'X_PER_WEEK', 'X_PER_MONTH', 'CUSTOM_INTERVAL')),
  frequency_config jsonb,
  target_value numeric,
  target_unit varchar(50),
  status varchar(20) not null default 'ACTIVE'
    check (status in ('ACTIVE', 'PAUSED', 'ARCHIVED')),
  start_date date not null,
  end_date date,
  icon varchar(50),
  color varchar(20),
  priority integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_habits_user_id on habit_tracker_schema.habits (user_id);
create index idx_habits_user_status on habit_tracker_schema.habits (user_id, status);

create table habit_tracker_schema.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habit_tracker_schema.habits (id) on delete cascade,
  user_id uuid not null,
  log_date date not null,
  status varchar(20) not null
    check (status in ('COMPLETED', 'SKIPPED', 'MISSED', 'PARTIAL')),
  value numeric,
  failure_reason text,
  note text,
  logged_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index idx_habit_logs_habit_id on habit_tracker_schema.habit_logs (habit_id);
create index idx_habit_logs_user_id on habit_tracker_schema.habit_logs (user_id);
create index idx_habit_logs_user_date on habit_tracker_schema.habit_logs (user_id, log_date);

-- One row per habit, recomputed by StreakService whenever a log for that
-- habit is created/updated/deleted. Never recomputed on a plain GET.
create table habit_tracker_schema.habit_streaks (
  habit_id uuid primary key references habit_tracker_schema.habits (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_computed_date date
);

create table habit_tracker_schema.habit_reminders (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habit_tracker_schema.habits (id) on delete cascade,
  reminder_time time not null,
  days_of_week jsonb,
  enabled boolean not null default true
);

create index idx_habit_reminders_habit_id on habit_tracker_schema.habit_reminders (habit_id);
create index idx_habit_reminders_enabled on habit_tracker_schema.habit_reminders (enabled);
