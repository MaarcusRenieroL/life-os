package com.lifeos.habit_tracker.domains.dto.response;

import java.time.LocalTime;
import java.util.List;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * When the user actually logs completions, used to suggest a reminder time that matches their real
 * behaviour rather than a hardcoded default.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LoggingTimePatternResponse {

  /** Always 24 entries, hour 0 through 23. */
  List<HourlyLogCountResponse> hourlyCounts;

  /** Top of the hour the user most often logs in. Null when there aren't enough logs to make a
   * meaningful suggestion. */
  LocalTime suggestedReminderTime;

  /** Number of completions the suggestion was derived from. */
  int sampleSize;

  /** IANA zone the hours were bucketed in. */
  String zoneId;
}
