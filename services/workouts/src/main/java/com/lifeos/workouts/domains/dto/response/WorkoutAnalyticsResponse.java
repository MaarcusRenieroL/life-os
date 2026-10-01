package com.lifeos.workouts.domains.dto.response;

import java.util.List;

/** Everything the analytics page shows in one round trip. weeks runs oldest to newest and always
 * includes the current (possibly still-in-progress) week as its last point. */
public record WorkoutAnalyticsResponse(
    int weeksRequested,
    int totalSessions,
    double sessionsPerWeek,
    int averageDurationMinutes,
    int personalRecords,
    int currentWeekSessions,
    int weeklyTarget,
    int currentStreakWeeks,
    int longestStreakWeeks,
    List<WeeklyWorkoutPoint> weeks) {}
