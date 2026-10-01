package com.lifeos.workouts.service;

import java.util.List;

/** Week-based workout streaks. A "good" week is one with at least `target` completed sessions;
 * a streak is a run of consecutive good weeks. Pure so it's directly unit-testable. */
public final class WorkoutStreakCalculator {

  private WorkoutStreakCalculator() {}

  public record Streaks(int current, int longest) {}

  /** @param sessionsPerWeek oldest first; the LAST entry is the current week, which may still be
   *     in progress. */
  public static Streaks calculate(List<Integer> sessionsPerWeek, int target) {
    int longest = 0;
    int run = 0;
    for (int sessions : sessionsPerWeek) {
      run = sessions >= target ? run + 1 : 0;
      longest = Math.max(longest, run);
    }

    // The current streak counts back from the most recent finished week. The current week only
    // helps - if it's already good it extends the streak, but being short of target mid-week
    // doesn't break it yet.
    int current = 0;
    int last = sessionsPerWeek.size() - 1;
    if (last < 0) return new Streaks(0, 0);
    int i = sessionsPerWeek.get(last) >= target ? last : last - 1;
    for (; i >= 0 && sessionsPerWeek.get(i) >= target; i--) current++;
    return new Streaks(current, longest);
  }
}
