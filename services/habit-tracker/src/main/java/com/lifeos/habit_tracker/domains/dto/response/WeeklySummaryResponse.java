package com.lifeos.habit_tracker.domains.dto.response;

import java.time.LocalDate;
import java.util.UUID;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/** A recap of one Monday-Sunday week, for the in-app weekly summary notification. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WeeklySummaryResponse {

  LocalDate weekStart;

  LocalDate weekEnd;

  int completions;

  int scheduledOccurrences;

  double score;

  int missed;

  int skipped;

  /** Days in the week where every scheduled habit was completed. */
  int perfectDays;

  int habitsTracked;

  /** Same week last time round, so the UI can show a trend arrow. */
  double previousWeekScore;

  UUID topHabitId;

  String topHabitName;

  UUID needsAttentionHabitId;

  String needsAttentionHabitName;
}
