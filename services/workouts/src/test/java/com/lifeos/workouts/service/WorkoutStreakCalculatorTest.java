package com.lifeos.workouts.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class WorkoutStreakCalculatorTest {

  @Test
  void countsConsecutiveWeeksAtOrAboveTargetBackFromTheLatest() {
    // oldest -> newest; current (last) week is good too.
    var streaks = WorkoutStreakCalculator.calculate(List.of(1, 3, 4, 3, 5), 3);

    assertThat(streaks.current()).isEqualTo(4);
    assertThat(streaks.longest()).isEqualTo(4);
  }

  @Test
  void aShortCurrentWeekDoesNotBreakTheStreakYet() {
    // Two good finished weeks, this week only has 1 of 3 so far - still a 2-week streak.
    var streaks = WorkoutStreakCalculator.calculate(List.of(0, 3, 3, 1), 3);

    assertThat(streaks.current()).isEqualTo(2);
  }

  @Test
  void aMissedFinishedWeekResetsTheCurrentStreak() {
    var streaks = WorkoutStreakCalculator.calculate(List.of(3, 3, 3, 1, 3), 3);

    assertThat(streaks.current()).isEqualTo(1);
    assertThat(streaks.longest()).isEqualTo(3);
  }

  @Test
  void longestStreakIsFoundAnywhereInTheWindow() {
    var streaks = WorkoutStreakCalculator.calculate(List.of(4, 4, 4, 4, 0, 0, 3), 3);

    assertThat(streaks.longest()).isEqualTo(4);
    assertThat(streaks.current()).isEqualTo(1);
  }

  @Test
  void noQualifyingWeeksMeansNoStreak() {
    var streaks = WorkoutStreakCalculator.calculate(List.of(0, 1, 2, 0), 3);

    assertThat(streaks.current()).isZero();
    assertThat(streaks.longest()).isZero();
  }

  @Test
  void emptyHistoryIsSafe() {
    var streaks = WorkoutStreakCalculator.calculate(List.of(), 3);

    assertThat(streaks.current()).isZero();
    assertThat(streaks.longest()).isZero();
  }
}
