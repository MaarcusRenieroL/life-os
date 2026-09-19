package com.lifeos.habit_tracker.domains.dto.response;

import java.time.LocalDate;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * One week of the completion-rate trend. Only day-deterministic habits (DAILY, WEEKLY_DAYS,
 * CUSTOM_INTERVAL) contribute - see HabitAnalyticsService for why X_PER_WEEK/X_PER_MONTH are
 * excluded from the weekly series.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CompletionTrendPointResponse {

  LocalDate weekStart;

  LocalDate weekEnd;

  int completions;

  int scheduledOccurrences;

  /** completions / scheduledOccurrences, 0.0 when nothing was scheduled that week. */
  double score;
}
