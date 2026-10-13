-- Reminders: each entry in reminder_minutes_before is "fire N minutes before dueDate+dueTime" (0 =
-- at the due time, 1440 = 1 day before). reminders_sent tracks which offsets already fired for the
-- CURRENT due date/time so TaskReminderScheduler never double-fires and TaskService can clear it
-- on reschedule.

alter table tasks_schema.tasks add column reminder_minutes_before jsonb;

alter table tasks_schema.tasks add column reminders_sent jsonb;
