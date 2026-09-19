package com.lifeos.habit_tracker.domains.dto.response;

import java.time.LocalDate;
import java.util.List;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/** Everything the analytics dashboard needs, aggregated server-side in a single round trip. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HabitAnalyticsResponse {

  LocalDate windowStart;

  LocalDate windowEnd;

  int weeks;

  /** Oldest week first, so the UI can plot it left-to-right without re-sorting. */
  List<CompletionTrendPointResponse> trend;

  /** Best-performing first; the UI takes the tail for the worst performers. */
  List<HabitPerformanceResponse> habitPerformance;

  /** Always 7 entries, Monday (1) through Sunday (7). */
  List<DayOfWeekPatternResponse> dayOfWeekPattern;

  HealthScoreResponse healthScore;

  /** Habits excluded from {@code trend}/{@code dayOfWeekPattern} because their frequency type
   * (X_PER_WEEK / X_PER_MONTH) doesn't pin completions to particular days. They still count
   * toward {@code habitPerformance} and {@code healthScore}. */
  int habitsExcludedFromDayPatterns;
}
