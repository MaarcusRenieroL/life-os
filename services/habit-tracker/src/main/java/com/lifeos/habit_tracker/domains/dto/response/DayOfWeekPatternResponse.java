package com.lifeos.habit_tracker.domains.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * Completion pattern for one day of the week across the whole analytics window, so the UI can show
 * which weekdays the user actually follows through on. Same day-deterministic-habits-only caveat as
 * {@link CompletionTrendPointResponse}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DayOfWeekPatternResponse {

  /** ISO-8601 day of week, 1=Monday..7=Sunday - same convention as frequencyConfig.daysOfWeek. */
  int dayOfWeek;

  int completions;

  int scheduledOccurrences;

  double score;
}
