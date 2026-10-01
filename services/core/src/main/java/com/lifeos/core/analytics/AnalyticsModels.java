package com.lifeos.core.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** What the analytics endpoints return. Percentages are 0-100 integers, null when there was
 * nothing to measure (no tasks due, no habits scheduled...) rather than a misleading 0. */
public final class AnalyticsModels {

  private AnalyticsModels() {}

  public record DailySnapshot(
      LocalDate date,
      int tasksCompleted,
      double focusHours,
      int habitsCompleted,
      int habitsScheduled,
      BigDecimal spending,
      int workouts,
      Double mood,
      Double energy) {}

  public record GoalBreakdown(Integer milestone, Integer task, Integer habit, Integer metric, Integer workout, int goalCount) {}

  public record GoalLine(String name, String status, Integer progressPct, Integer expectedPct, LocalDate targetDate) {}

  public record CategoryAmount(String category, BigDecimal amount) {}

  /** One week or one month. previous* fields are the same measure over the immediately preceding
   * period of equal length, for "up/down vs last time" - null when that period had no data. */
  public record PeriodSummary(
      String period,
      LocalDate from,
      LocalDate to,
      int tasksCompleted,
      int tasksDue,
      Integer taskCompletionPct,
      Integer habitConsistencyPct,
      double focusHours,
      int workouts,
      int workoutMinutes,
      BigDecimal spending,
      BigDecimal income,
      BigDecimal previousSpending,
      int previousTasksCompleted,
      int applicationsApplied,
      int applicationsSaved,
      int interviews,
      int journalEntries,
      Double averageMood,
      Double averageEnergy,
      int milestonesCompleted,
      BigDecimal weightChangeKg,
      List<CategoryAmount> spendingByCategory,
      List<GoalLine> goals,
      GoalBreakdown goalBreakdown,
      List<String> unavailableModules) {}

  public record TrendPoint(LocalDate date, int tasksCompleted, Integer habitPct, BigDecimal spending, BigDecimal weightKg, Double mood, int workouts) {}

  public record Anomaly(String type, String severity, String title, String detail) {}

  public record Insight(String title, String detail, double correlation, int sampleSize) {}

  public record Dashboard(
      DailySnapshot today,
      PeriodSummary week,
      List<Anomaly> anomalies,
      List<Insight> insights,
      List<String> unavailableModules) {}
}
