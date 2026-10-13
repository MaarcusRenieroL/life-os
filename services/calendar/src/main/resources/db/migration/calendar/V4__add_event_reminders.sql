-- Mirrors services/tasks' V4: each entry in reminder_minutes_before is "fire N minutes before
-- startAt" (0 = at start time, 1440 = 1 day before). reminders_sent tracks which offsets already
-- fired for the CURRENT start time so EventReminderScheduler never double-fires and EventService
-- clears it on reschedule.

alter table calendar_schema.events add column reminder_minutes_before jsonb;

alter table calendar_schema.events add column reminders_sent jsonb;
