package com.lifeos.habit_tracker.domains.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/** Per-goal habit numbers the Goals module folds into a goal's progress: how many active habits
 * are linked to it and how consistently they've been done recently (completions vs scheduled
 * occurrences, summed across every linked habit so a busy habit weighs more than a rare one). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GoalHabitStatsResponse {

  int activeHabits;

  int completions;

  int scheduledOccurrences;
}
