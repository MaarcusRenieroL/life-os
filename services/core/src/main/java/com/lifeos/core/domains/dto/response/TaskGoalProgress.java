package com.lifeos.core.domains.dto.response;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Mirrors tasks' own GoalProgressResponse shape exactly, for deserializing its
 * /v1/tasks/internal/goal-progress response - kept as its own class (rather than reusing
 * GoalOverviewResponse for both the wire shape and the merged result) because Jackson 3's
 * implicit all-args-constructor creator resolution passes `null` for any field missing from the
 * JSON, which blows up on GoalOverviewResponse's extra `long` fields (activeHabitCount,
 * upcomingEventCount) that tasks' response never includes. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskGoalProgress {

  UUID goalId;

  String goalName;

  long totalTasks;

  long completedTasks;
}
