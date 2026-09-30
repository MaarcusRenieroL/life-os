package com.lifeos.workouts.domains.dto.response;

/** Per-goal numbers the Goals module folds into a fitness goal's progress. */
public record GoalWorkoutStatsResponse(int sessionsLast28Days, int totalSessions) {}
