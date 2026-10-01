-- At most one open (ended_at is null) time entry per user - closes a race in
-- TimeEntryService.start() where two concurrent calls could both see "no active entry" and both
-- insert one, after which findByUserIdAndEndedAtIsNull would throw on every future call for that
-- user. A partial unique index lets Postgres itself reject the loser of the race with a
-- DataIntegrityViolationException, which the service now catches and resolves.
create unique index idx_time_entries_one_active_per_user
  on tasks_schema.time_entries (user_id)
  where ended_at is null;
