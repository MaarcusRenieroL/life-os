package com.lifeos.notes.service;

import java.time.LocalDate;
import java.util.Collection;
import java.util.TreeSet;

/** Consecutive-day journaling streaks. Pure so it's directly unit-testable. */
public final class JournalStreakCalculator {

  private JournalStreakCalculator() {}

  public record Streaks(int current, int longest) {}

  /** The current streak is the run of consecutive days ending today - or yesterday, so it doesn't
   * read as broken in the morning before today's entry has been written. */
  public static Streaks calculate(Collection<LocalDate> entryDates, LocalDate today) {
    TreeSet<LocalDate> days = new TreeSet<>(entryDates);
    if (days.isEmpty()) return new Streaks(0, 0);

    int longest = 0;
    int run = 0;
    LocalDate previous = null;
    for (LocalDate day : days) {
      run = previous != null && previous.plusDays(1).equals(day) ? run + 1 : 1;
      longest = Math.max(longest, run);
      previous = day;
    }

    LocalDate cursor = days.contains(today) ? today : today.minusDays(1);
    int current = 0;
    while (days.contains(cursor)) {
      current++;
      cursor = cursor.minusDays(1);
    }
    return new Streaks(current, longest);
  }
}
