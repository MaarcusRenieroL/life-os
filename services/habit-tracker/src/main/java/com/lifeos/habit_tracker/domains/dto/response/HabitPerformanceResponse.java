package com.lifeos.habit_tracker.domains.dto.response;

import java.util.UUID;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/** One habit's completion rate over the analytics window, for the best/worst ranking. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HabitPerformanceResponse {

  UUID habitId;

  String name;

  String icon;

  String category;

  int completions;

  int scheduledOccurrences;

  /** completions / scheduledOccurrences over the window, 0.0 when nothing was scheduled. */
  double completionRate;

  int currentStreak;

  int longestStreak;
}
