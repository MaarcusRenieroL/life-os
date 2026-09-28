package com.lifeos.tasks.domains.dto.response;

import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/** Tasks-only slice of a goal's progress - core's GoalOverviewService merges this with
 * habit-tracker's and calendar's own per-goal counts into the full cross-module picture, since
 * Goal itself lives in tasks_schema and only tasks can compute a task-completion percentage
 * without a cross-service call. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GoalProgressResponse {

  UUID goalId;

  String goalName;

  long totalTasks;

  long completedTasks;
}
