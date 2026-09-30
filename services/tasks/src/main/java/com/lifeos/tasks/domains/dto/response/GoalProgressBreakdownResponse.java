package com.lifeos.tasks.domains.dto.response;

/** The four progress components with the raw counts behind them, so the UI can label the chart
 * ("3 of 5 milestones") without a second request. A null percentage means that component has
 * nothing to measure for this goal. */
public record GoalProgressBreakdownResponse(
    int overallPct,
    Integer milestonePct,
    Integer taskPct,
    Integer habitPct,
    Integer metricPct,
    Integer workoutPct,
    Integer expectedPct,
    int milestonesDone,
    int milestonesTotal,
    int tasksDone,
    int tasksTotal,
    int activeHabits,
    int metricsCount,
    int workoutSessions,
    Integer weeklyWorkoutTarget) {}
