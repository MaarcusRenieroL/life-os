-- The habit form already collects a "why" statement (the motivation behind the
-- habit) and a 1-10 difficulty rating, but V1 has no columns for them, so both
-- were silently dropped on write. These two columns make them persist.

alter table habit_tracker_schema.habits
  add column why text,
  add column difficulty integer;

alter table habit_tracker_schema.habits
  add constraint habits_difficulty_range
    check (difficulty is null or (difficulty between 1 and 10));

-- Analytics aggregates logs by user over a rolling window and, for the
-- reminder-time suggestion, by the hour of logged_at. V1 already indexes
-- (user_id, log_date), which covers the window scan; this one covers the
-- logged_at read of the same rows without touching the table.
create index idx_habit_logs_user_logged_at
  on habit_tracker_schema.habit_logs (user_id, logged_at);
