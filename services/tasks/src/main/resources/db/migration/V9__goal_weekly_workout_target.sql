-- Lets a fitness goal say how many workouts a week it expects. Workout sessions link to a goal from
-- the workouts side (workout_sessions.goal_id); this target is what turns "3 sessions in the last
-- 4 weeks" into a progress percentage. Null = the goal doesn't measure workouts, so linked
-- sessions are shown but don't move its progress.
alter table tasks_schema.goals
  add column weekly_workout_target integer check (weekly_workout_target between 1 and 14);
