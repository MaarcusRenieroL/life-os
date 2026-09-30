package com.lifeos.core.analytics;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** What each module reports for a date range - the wire shapes of their internal daily-stats
 * endpoints, mirrored here. Any module can be missing (null) when it didn't answer; analytics then
 * simply has no numbers from it for that load. */
public final class ModuleData {

  private ModuleData() {}

  public record TaskDay(LocalDate date, int completed, int due, int focusMinutes) {}

  public record TaskStats(List<TaskDay> days, int overdueOpen, int openTotal, int milestonesCompleted) {}

  public record HabitDay(LocalDate date, int scheduled, int completed) {}

  public record HabitStat(UUID habitId, String name, int scheduled, int completed, int daysSinceLastCompletion) {}

  public record HabitStats(List<HabitDay> days, List<HabitStat> habits) {}

  public record SpendDay(LocalDate date, BigDecimal spend, BigDecimal income) {}

  public record CategorySpend(String category, BigDecimal amount) {}

  public record SpendStats(List<SpendDay> days, List<CategorySpend> categories, BigDecimal totalSpend, BigDecimal totalIncome) {}

  public record WorkoutDay(LocalDate date, int sessions, BigDecimal volume, int minutes) {}

  public record WeightPoint(LocalDate date, BigDecimal weightKg) {}

  public record WorkoutStats(List<WorkoutDay> days, List<WeightPoint> weights) {}

  public record JournalDay(LocalDate date, Double mood, Double energy, int entries) {}

  public record JournalStats(int totalEntries, Double averageMood, Double averageEnergy, int currentStreakDays, int longestStreakDays, List<JournalDay> days) {}

  public record ApplicationStats(int saved, int applied, int interviews) {}

  /** The slice of a goal summary analytics needs (the tasks service returns more; extra fields
   * are ignored). progress carries the per-component percentages, null where untracked. */
  public record GoalProgress(Integer overallPct, Integer milestonePct, Integer taskPct, Integer habitPct, Integer metricPct, Integer workoutPct, Integer expectedPct) {}

  public record GoalSummary(UUID id, String name, String status, int priority, LocalDate targetDate, GoalProgress progress) {}

  public record Bundle(
      TaskStats tasks,
      HabitStats habits,
      SpendStats spending,
      WorkoutStats workouts,
      JournalStats journal,
      ApplicationStats applications,
      List<GoalSummary> goals,
      List<String> unavailable) {}
}
