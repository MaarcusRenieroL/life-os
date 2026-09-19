package com.lifeos.habit_tracker.domains.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

/**
 * A composite 0-100 habit health score. Every input is a real measurement and every component is
 * returned alongside the total so the UI can explain exactly how the number was reached - no
 * opaque or arbitrary weighting hidden in the backend.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HealthScoreResponse {

  /** Weighted total of the three components below, 0-100. */
  int score;

  /** Completions / scheduled occurrences across every habit in the window, 0-100. */
  int consistencyScore;

  /** Mean of min(currentStreak / 21, 1) across active habits, 0-100. 21 days is the window at
   * which a streak is treated as fully established. */
  int streakScore;

  /** Share of active habits with at least one completion in the last 7 days, 0-100. */
  int engagementScore;

  int consistencyWeightPercent;

  int streakWeightPercent;

  int engagementWeightPercent;

  /** How many habits the score was computed over - 0 means there is nothing to score yet. */
  int habitsCounted;
}
