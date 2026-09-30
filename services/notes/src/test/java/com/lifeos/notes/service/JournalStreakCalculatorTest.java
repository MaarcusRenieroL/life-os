package com.lifeos.notes.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class JournalStreakCalculatorTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);

  private LocalDate daysAgo(int n) {
    return TODAY.minusDays(n);
  }

  @Test
  void countsConsecutiveDaysEndingToday() {
    var streaks = JournalStreakCalculator.calculate(List.of(daysAgo(0), daysAgo(1), daysAgo(2)), TODAY);

    assertThat(streaks.current()).isEqualTo(3);
    assertThat(streaks.longest()).isEqualTo(3);
  }

  @Test
  void aStreakEndingYesterdayIsStillAliveBeforeTodaysEntry() {
    var streaks = JournalStreakCalculator.calculate(List.of(daysAgo(1), daysAgo(2)), TODAY);

    assertThat(streaks.current()).isEqualTo(2);
  }

  @Test
  void aGapOfADayBreaksTheCurrentStreakButNotTheLongest() {
    var streaks = JournalStreakCalculator.calculate(List.of(daysAgo(2), daysAgo(3), daysAgo(4), daysAgo(5)), TODAY);

    assertThat(streaks.current()).isZero();
    assertThat(streaks.longest()).isEqualTo(4);
  }

  @Test
  void multipleEntriesOnTheSameDayCountOnce() {
    var streaks = JournalStreakCalculator.calculate(List.of(daysAgo(0), daysAgo(0), daysAgo(1)), TODAY);

    assertThat(streaks.current()).isEqualTo(2);
  }

  @Test
  void noEntriesMeansNoStreak() {
    var streaks = JournalStreakCalculator.calculate(List.of(), TODAY);

    assertThat(streaks.current()).isZero();
    assertThat(streaks.longest()).isZero();
  }
}
