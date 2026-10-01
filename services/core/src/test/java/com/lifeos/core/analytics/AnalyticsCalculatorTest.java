package com.lifeos.core.analytics;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifeos.core.analytics.AnalyticsModels.PeriodSummary;
import com.lifeos.core.analytics.AnalyticsModels.TrendPoint;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AnalyticsCalculatorTest {

  private static final LocalDate MON = LocalDate.of(2026, 9, 28);

  private ModuleData.Bundle bundle(
      ModuleData.TaskStats tasks, ModuleData.HabitStats habits, ModuleData.SpendStats spend, ModuleData.WorkoutStats workouts, ModuleData.JournalStats journal, List<ModuleData.GoalSummary> goals) {
    return new ModuleData.Bundle(tasks, habits, spend, workouts, journal, new ModuleData.ApplicationStats(3, 2, 1), goals, List.of());
  }

  private ModuleData.Bundle full() {
    return bundle(
        new ModuleData.TaskStats(List.of(new ModuleData.TaskDay(MON, 3, 4, 90), new ModuleData.TaskDay(MON.plusDays(1), 2, 4, 30)), 1, 6, 2),
        new ModuleData.HabitStats(List.of(new ModuleData.HabitDay(MON, 4, 3), new ModuleData.HabitDay(MON.plusDays(1), 4, 1)), List.of()),
        new ModuleData.SpendStats(
            List.of(new ModuleData.SpendDay(MON, BigDecimal.valueOf(100), BigDecimal.ZERO), new ModuleData.SpendDay(MON.plusDays(1), BigDecimal.valueOf(250), BigDecimal.valueOf(1000))),
            List.of(new ModuleData.CategorySpend("Food", BigDecimal.valueOf(300)), new ModuleData.CategorySpend("Fuel", BigDecimal.valueOf(50))),
            BigDecimal.valueOf(350),
            BigDecimal.valueOf(1000)),
        new ModuleData.WorkoutStats(
            List.of(new ModuleData.WorkoutDay(MON, 1, BigDecimal.valueOf(5000), 55), new ModuleData.WorkoutDay(MON.plusDays(1), 0, BigDecimal.ZERO, 0)),
            List.of(new ModuleData.WeightPoint(MON, new BigDecimal("84.0")), new ModuleData.WeightPoint(MON.plusDays(1), new BigDecimal("83.4")))),
        new ModuleData.JournalStats(2, 4.0, 3.5, 2, 5, List.of(new ModuleData.JournalDay(MON, 4.0, 3.0, 1), new ModuleData.JournalDay(MON.plusDays(1), 4.0, 4.0, 1))),
        List.of());
  }

  @Test
  void weekStartIsTheMondayOfThatWeek() {
    assertThat(AnalyticsCalculator.weekStart(LocalDate.of(2026, 9, 30))).isEqualTo(MON);
    assertThat(AnalyticsCalculator.weekStart(MON)).isEqualTo(MON);
    assertThat(AnalyticsCalculator.weekStart(LocalDate.of(2026, 10, 4))).isEqualTo(MON);
  }

  @Test
  void summaryTotalsEachModuleAndComputesPercentages() {
    PeriodSummary s = AnalyticsCalculator.summary("WEEK", MON, MON.plusDays(6), full(), null);

    assertThat(s.tasksCompleted()).isEqualTo(5);
    assertThat(s.tasksDue()).isEqualTo(8);
    assertThat(s.taskCompletionPct()).isEqualTo(63);
    assertThat(s.habitConsistencyPct()).isEqualTo(50);
    assertThat(s.focusHours()).isEqualTo(2.0);
    assertThat(s.workouts()).isEqualTo(1);
    assertThat(s.workoutMinutes()).isEqualTo(55);
    assertThat(s.spending()).isEqualByComparingTo("350");
    assertThat(s.income()).isEqualByComparingTo("1000");
    assertThat(s.applicationsApplied()).isEqualTo(2);
    assertThat(s.interviews()).isEqualTo(1);
    assertThat(s.journalEntries()).isEqualTo(2);
    assertThat(s.averageMood()).isEqualTo(4.0);
    assertThat(s.milestonesCompleted()).isEqualTo(2);
    assertThat(s.weightChangeKg()).isEqualByComparingTo("-0.6");
    assertThat(s.spendingByCategory()).extracting(AnalyticsModels.CategoryAmount::category).containsExactly("Food", "Fuel");
  }

  @Test
  void percentagesAreNullWhenThereWasNothingToMeasure() {
    ModuleData.Bundle empty = bundle(new ModuleData.TaskStats(List.of(new ModuleData.TaskDay(MON, 2, 0, 0)), 0, 0, 0), new ModuleData.HabitStats(List.of(new ModuleData.HabitDay(MON, 0, 0)), List.of()), null, null, null, null);

    PeriodSummary s = AnalyticsCalculator.summary("WEEK", MON, MON.plusDays(6), empty, null);

    assertThat(s.taskCompletionPct()).isNull();
    assertThat(s.habitConsistencyPct()).isNull();
  }

  @Test
  void taskCompletionIsCappedAtOneHundred() {
    ModuleData.Bundle over = bundle(new ModuleData.TaskStats(List.of(new ModuleData.TaskDay(MON, 9, 3, 0)), 0, 0, 0), null, null, null, null, null);

    assertThat(AnalyticsCalculator.summary("WEEK", MON, MON.plusDays(6), over, null).taskCompletionPct()).isEqualTo(100);
  }

  @Test
  void unavailableModulesCountAsZeroAndAreReported() {
    ModuleData.Bundle down = new ModuleData.Bundle(null, null, null, null, null, null, null, List.of("tasks", "finance"));

    PeriodSummary s = AnalyticsCalculator.summary("WEEK", MON, MON.plusDays(6), down, null);

    assertThat(s.tasksCompleted()).isZero();
    assertThat(s.spending()).isEqualByComparingTo("0");
    assertThat(s.unavailableModules()).containsExactly("tasks", "finance");
  }

  @Test
  void previousPeriodFeedsTheComparison() {
    ModuleData.Bundle previous = bundle(new ModuleData.TaskStats(List.of(new ModuleData.TaskDay(MON.minusWeeks(1), 7, 7, 0)), 0, 0, 0), null, new ModuleData.SpendStats(List.of(), List.of(), BigDecimal.valueOf(900), BigDecimal.ZERO), null, null, null);

    PeriodSummary s = AnalyticsCalculator.summary("WEEK", MON, MON.plusDays(6), full(), previous);

    assertThat(s.previousSpending()).isEqualByComparingTo("900");
    assertThat(s.previousTasksCompleted()).isEqualTo(7);
  }

  private ModuleData.GoalSummary goal(String status, Integer milestone, Integer task, Integer habit, Integer metric, Integer workout) {
    return new ModuleData.GoalSummary(UUID.randomUUID(), "G", status, 2, null, new ModuleData.GoalProgress(50, milestone, task, habit, metric, workout, null));
  }

  @Test
  void goalBreakdownAveragesEachComponentOverGoalsThatMeasureItAndSkipsFinishedOnes() {
    var breakdown =
        AnalyticsCalculator.goalBreakdown(
            List.of(goal("ON_TRACK", 100, 50, null, null, null), goal("AT_RISK", 50, null, 80, null, null), goal("COMPLETED", 0, 0, 0, 0, 0), goal("ARCHIVED", 0, 0, 0, 0, 0)));

    assertThat(breakdown.goalCount()).isEqualTo(2);
    assertThat(breakdown.milestone()).isEqualTo(75);
    assertThat(breakdown.task()).isEqualTo(50);
    assertThat(breakdown.habit()).isEqualTo(80);
    assertThat(breakdown.metric()).isNull();
    assertThat(breakdown.workout()).isNull();
  }

  @Test
  void trendHasOnePointPerDayWithGapsAsNullsAndZeros() {
    List<TrendPoint> points = AnalyticsCalculator.trend(full(), MON, MON.plusDays(2));

    assertThat(points).hasSize(3);
    assertThat(points.get(0).tasksCompleted()).isEqualTo(3);
    assertThat(points.get(0).habitPct()).isEqualTo(75);
    assertThat(points.get(1).habitPct()).isEqualTo(25);
    assertThat(points.get(0).weightKg()).isEqualByComparingTo("84.0");
    assertThat(points.get(2).habitPct()).isNull();
    assertThat(points.get(2).tasksCompleted()).isZero();
    assertThat(points.get(2).spending()).isEqualByComparingTo("0");
    assertThat(points.get(2).mood()).isNull();
  }

  @Test
  void weeklyBucketingSumsCountsAveragesPercentagesAndKeepsTheLastWeighIn() {
    List<TrendPoint> daily = AnalyticsCalculator.trend(full(), MON, MON.plusDays(13));

    List<TrendPoint> weeks = AnalyticsCalculator.weekly(daily);

    assertThat(weeks).hasSize(2);
    assertThat(weeks.get(0).date()).isEqualTo(MON);
    assertThat(weeks.get(0).tasksCompleted()).isEqualTo(5);
    assertThat(weeks.get(0).habitPct()).isEqualTo(50);
    assertThat(weeks.get(0).spending()).isEqualByComparingTo("350");
    assertThat(weeks.get(0).weightKg()).isEqualByComparingTo("83.4");
    assertThat(weeks.get(0).workouts()).isEqualTo(1);
    assertThat(weeks.get(1).tasksCompleted()).isZero();
    assertThat(weeks.get(1).weightKg()).isNull();
  }

  @Test
  void dailySnapshotPullsTheRightDayFromEachModule() {
    var snapshot = AnalyticsCalculator.daily(full(), MON);

    assertThat(snapshot.tasksCompleted()).isEqualTo(3);
    assertThat(snapshot.focusHours()).isEqualTo(1.5);
    assertThat(snapshot.habitsCompleted()).isEqualTo(3);
    assertThat(snapshot.habitsScheduled()).isEqualTo(4);
    assertThat(snapshot.spending()).isEqualByComparingTo("100");
    assertThat(snapshot.workouts()).isEqualTo(1);
    assertThat(snapshot.mood()).isEqualTo(4.0);
    assertThat(snapshot.energy()).isEqualTo(3.0);
  }

  @Test
  void insightDaysMarkWorkoutDaysAndSkipModulesThatAreDown() {
    var days = AnalyticsCalculator.insightDays(full(), MON, MON.plusDays(1));

    assertThat(days.get(0).workedOut()).isEqualTo(1.0);
    assertThat(days.get(1).workedOut()).isEqualTo(0.0);
    assertThat(days.get(0).habitPct()).isEqualTo(75.0);

    var noWorkouts = AnalyticsCalculator.insightDays(new ModuleData.Bundle(null, null, null, null, null, null, null, List.of()), MON, MON);
    assertThat(noWorkouts.get(0).workedOut()).isNull();
    assertThat(noWorkouts.get(0).mood()).isNull();
  }
}
