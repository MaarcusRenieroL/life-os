package com.lifeos.core.domains.dto.response;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoalOverviewResponse {

  UUID goalId;

  String goalName;

  long totalTasks;

  long completedTasks;

  long activeHabitCount;

  long upcomingEventCount;
}
