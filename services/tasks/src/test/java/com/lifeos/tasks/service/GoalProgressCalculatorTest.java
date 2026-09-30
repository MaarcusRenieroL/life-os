package com.lifeos.tasks.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.tasks.domains.enums.GoalStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class GoalProgressCalculatorTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 6, 15);

  private GoalProgressCalculator.Inputs inputs(
      int msTotal, int msDone, int tasksTotal, int tasksDone, LocalDate start, LocalDate target) {
    return new GoalProgressCalculator.Inputs(msTotal, msDone, tasksTotal, tasksDone, 0, 0, 0, List.of(), start, target, TODAY);
  }

  @Test
  void overallAveragesOnlyComponentsThatHaveSomethingToMeasure() {
    // Milestones 50%, tasks 100% - the empty habit and metric components must not drag it to 37%.
    var result = GoalProgressCalculator.calculate(inputs(4, 2, 2, 2, null, null));

    assertThat(result.milestonePct()).isEqualTo(50);
    assertThat(result.taskPct()).isEqualTo(100);
    assertThat(result.habitPct()).isNull();
    assertThat(result.metricPct()).isNull();
    assertThat(result.overallPct()).isEqualTo(75);
  }

  @Test
  void goalWithNothingLinkedIsZeroPercent() {
    assertThat(GoalProgressCalculator.calculate(inputs(0, 0, 0, 0, null, null)).overallPct()).isZero();
  }

  @Test
  void habitComponentIsCompletionsOverScheduledAndCappedAtOneHundred() {
    var in = new GoalProgressCalculator.Inputs(0, 0, 0, 0, 2, 9, 12, List.of(), null, null, TODAY);
    assertThat(GoalProgressCalculator.calculate(in).habitPct()).isEqualTo(75);

    var overshoot = new GoalProgressCalculator.Inputs(0, 0, 0, 0, 1, 14, 12, List.of(), null, null, TODAY);
    assertThat(GoalProgressCalculator.calculate(overshoot).habitPct()).isEqualTo(100);
  }

  @Test
  void linkedHabitsWithNothingScheduledYetAreNoDataNotZeroPercent() {
    var in = new GoalProgressCalculator.Inputs(2, 2, 0, 0, 1, 0, 0, List.of(), null, null, TODAY);
    var result = GoalProgressCalculator.calculate(in);

    assertThat(result.habitPct()).isNull();
    assertThat(result.overallPct()).isEqualTo(100);
  }

  @Test
  void metricComponentAveragesEveryMetricsFraction() {
    var in = new GoalProgressCalculator.Inputs(0, 0, 0, 0, 0, 0, 0, List.of(0.5, 1.0), null, null, TODAY);
    assertThat(GoalProgressCalculator.calculate(in).metricPct()).isEqualTo(75);
  }

  @Test
  void metricFractionWorksForDecreasingTargets() {
    // Weight loss: 90 -> 80, currently 85 is halfway.
    assertThat(GoalProgressCalculator.metricFraction(bd("90"), bd("80"), bd("85"))).isEqualTo(0.5);
    // Savings: 0 -> 1000, currently 250.
    assertThat(GoalProgressCalculator.metricFraction(bd("0"), bd("1000"), bd("250"))).isEqualTo(0.25);
  }

  @Test
  void metricFractionIsClampedAndHandlesZeroSpan() {
    assertThat(GoalProgressCalculator.metricFraction(bd("0"), bd("10"), bd("15"))).isEqualTo(1.0);
    // Moving the wrong way from the start never goes negative.
    assertThat(GoalProgressCalculator.metricFraction(bd("0"), bd("10"), bd("-3"))).isEqualTo(0.0);
    assertThat(GoalProgressCalculator.metricFraction(bd("5"), bd("5"), bd("5"))).isEqualTo(1.0);
    assertThat(GoalProgressCalculator.metricFraction(bd("5"), bd("5"), bd("4"))).isEqualTo(0.0);
  }

  @Test
  void expectedProgressIsTheElapsedShareOfTheWindow() {
    // Jun 1 -> Jun 30 is 29 days; Jun 15 is 14 days in.
    assertThat(GoalProgressCalculator.expectedPct(LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), TODAY))
        .isEqualTo(48);
  }

  @Test
  void expectedProgressEdgeCases() {
    assertThat(GoalProgressCalculator.expectedPct(null, null, TODAY)).isNull();
    // Past the target date, everything should be done.
    assertThat(GoalProgressCalculator.expectedPct(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 1), TODAY)).isEqualTo(100);
    // Not started yet.
    assertThat(GoalProgressCalculator.expectedPct(LocalDate.of(2026, 7, 1), LocalDate.of(2026, 8, 1), TODAY)).isZero();
  }

  @Test
  void statusIsOnTrackWhenProgressMatchesOrBeatsExpectedAndAtRiskWhenBehind() {
    LocalDate start = LocalDate.of(2026, 6, 1);
    LocalDate target = LocalDate.of(2026, 6, 30); // expected 48% today

    var ahead = GoalProgressCalculator.calculate(inputs(2, 1, 0, 0, start, target)); // 50%
    var behind = GoalProgressCalculator.calculate(inputs(10, 2, 0, 0, start, target)); // 20%

    assertThat(GoalProgressCalculator.effectiveStatus(GoalStatus.ACTIVE, ahead)).isEqualTo(GoalStatus.ON_TRACK);
    assertThat(GoalProgressCalculator.effectiveStatus(GoalStatus.ON_TRACK, behind)).isEqualTo(GoalStatus.AT_RISK);
  }

  @Test
  void overdueUnfinishedGoalIsAtRisk() {
    var result =
        GoalProgressCalculator.calculate(inputs(4, 3, 0, 0, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 1)));
    assertThat(GoalProgressCalculator.effectiveStatus(GoalStatus.ON_TRACK, result)).isEqualTo(GoalStatus.AT_RISK);
  }

  @Test
  void goalWithoutTargetDateStaysActive() {
    var result = GoalProgressCalculator.calculate(inputs(4, 0, 0, 0, null, null));
    assertThat(GoalProgressCalculator.effectiveStatus(GoalStatus.AT_RISK, result)).isEqualTo(GoalStatus.ACTIVE);
  }

  @Test
  void explicitStatesAreNeverOverridden() {
    var result = GoalProgressCalculator.calculate(inputs(10, 0, 0, 0, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 2, 1)));
    for (GoalStatus explicit : List.of(GoalStatus.PAUSED, GoalStatus.COMPLETED, GoalStatus.ARCHIVED)) {
      assertThat(GoalProgressCalculator.effectiveStatus(explicit, result)).isEqualTo(explicit);
    }
  }

  private static BigDecimal bd(String value) {
    return new BigDecimal(value);
  }
}
