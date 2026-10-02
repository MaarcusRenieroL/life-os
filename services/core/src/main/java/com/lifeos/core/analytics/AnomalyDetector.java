package com.lifeos.core.analytics;

import com.lifeos.core.analytics.AnalyticsModels.Anomaly;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Finds things worth a second look: a spending day far above normal, a category running hot,
 * habits that have gone quiet, goals past their target date. Pure - it only reads the numbers it
 * is handed - so every rule is unit-testable. Thresholds are deliberately conservative: a false
 * alarm every week teaches people to ignore the panel. */
public final class AnomalyDetector {

  static final int SPIKE_BASELINE_MIN_DAYS = 14;
  /** Days with any spending the baseline needs before a "typical day" means something. */
  static final int SPIKE_BASELINE_MIN_SPENDING_DAYS = 7;
  static final double SPIKE_SIGMAS = 2.5;
  static final double CATEGORY_SPIKE_FACTOR = 2.0;
  static final int HABIT_QUIET_DAYS = 3;
  static final int OVERDUE_TASKS_ALERT = 5;

  private AnomalyDetector() {}

  /** @param spendDays consecutive days oldest to newest, ending today; the last 7 are "recent"
   *     and everything before them is the baseline they're judged against. */
  public static List<Anomaly> detect(
      List<ModuleData.SpendDay> spendDays,
      List<ModuleData.CategorySpend> recentCategories,
      List<ModuleData.CategorySpend> baselineCategoriesPerWeek,
      List<ModuleData.HabitStat> habits,
      List<ModuleData.GoalSummary> goals,
      Integer overdueTasks,
      LocalDate today) {
    List<Anomaly> anomalies = new ArrayList<>();
    if (spendDays != null) anomalies.addAll(spendingSpikes(spendDays));
    if (recentCategories != null && baselineCategoriesPerWeek != null) anomalies.addAll(categorySpikes(recentCategories, baselineCategoriesPerWeek));
    if (habits != null) anomalies.addAll(quietHabits(habits));
    if (goals != null) anomalies.addAll(overdueGoals(goals, today));
    if (overdueTasks != null && overdueTasks >= OVERDUE_TASKS_ALERT) {
      anomalies.add(new Anomaly("OVERDUE_TASKS", "WARN", overdueTasks + " overdue tasks", "Tasks are piling up past their due dates - reschedule or close some."));
    }
    return anomalies;
  }

  static List<Anomaly> spendingSpikes(List<ModuleData.SpendDay> days) {
    if (days.size() <= 7 + SPIKE_BASELINE_MIN_DAYS) return List.of();
    List<ModuleData.SpendDay> baseline = days.subList(0, days.size() - 7);
    List<Double> values = baseline.stream().map(d -> d.spend().doubleValue()).toList();
    // A baseline that is mostly empty days (new account, history just cleared) has no "typical" spending to
    // judge a day against - everything would look like a spike against a zero average.
    if (values.stream().filter(v -> v > 0).count() < SPIKE_BASELINE_MIN_SPENDING_DAYS) return List.of();
    double mean = Statistics.mean(values);
    double std = Statistics.stdDev(values);
    // With a near-flat baseline a couple of rupees would read as "extreme" - require the day to
    // also be meaningfully large in its own right.
    double floor = Math.max(mean * 2, 1);

    List<Anomaly> result = new ArrayList<>();
    for (ModuleData.SpendDay day : days.subList(days.size() - 7, days.size())) {
      double spend = day.spend().doubleValue();
      if (spend > mean + SPIKE_SIGMAS * std && spend >= floor) {
        result.add(
            new Anomaly(
                "SPENDING_SPIKE",
                spend > mean + 2 * SPIKE_SIGMAS * std ? "ALERT" : "WARN",
                "Unusual spending on " + day.date(),
                String.format(Locale.ROOT, "%.0f spent, against a typical %.0f a day.", spend, mean)));
      }
    }
    return result;
  }

  static List<Anomaly> categorySpikes(List<ModuleData.CategorySpend> recentWeek, List<ModuleData.CategorySpend> baselineWeeklyAverage) {
    Map<String, BigDecimal> baseline = baselineWeeklyAverage.stream().collect(Collectors.toMap(ModuleData.CategorySpend::category, ModuleData.CategorySpend::amount, BigDecimal::add));
    List<Anomaly> result = new ArrayList<>();
    for (ModuleData.CategorySpend recent : recentWeek) {
      BigDecimal usual = baseline.get(recent.category());
      // A category with no history isn't a spike, it's new - and tiny amounts aren't worth flagging.
      if (usual == null || usual.signum() == 0) continue;
      if (recent.amount().doubleValue() >= usual.doubleValue() * CATEGORY_SPIKE_FACTOR && recent.amount().doubleValue() >= 500) {
        result.add(
            new Anomaly(
                "CATEGORY_SPIKE",
                "WARN",
                recent.category() + " spending is up",
                String.format(Locale.ROOT, "%.0f this week versus about %.0f a week before.", recent.amount().doubleValue(), usual.doubleValue())));
      }
    }
    return result;
  }

  static List<Anomaly> quietHabits(List<ModuleData.HabitStat> habits) {
    List<Anomaly> result = new ArrayList<>();
    for (ModuleData.HabitStat habit : habits) {
      // Needs enough scheduled days to be a pattern rather than a habit that only just started.
      if (habit.scheduled() < HABIT_QUIET_DAYS) continue;
      boolean neverDone = habit.daysSinceLastCompletion() < 0 || habit.completed() == 0;
      if (neverDone || habit.daysSinceLastCompletion() >= HABIT_QUIET_DAYS) {
        String detail = neverDone ? "Not done at all in this period." : "Last done " + habit.daysSinceLastCompletion() + " days ago.";
        result.add(new Anomaly("MISSED_HABIT", habit.daysSinceLastCompletion() >= 7 || neverDone ? "ALERT" : "WARN", habit.name() + " has gone quiet", detail));
      }
    }
    return result;
  }

  static List<Anomaly> overdueGoals(List<ModuleData.GoalSummary> goals, LocalDate today) {
    List<Anomaly> result = new ArrayList<>();
    for (ModuleData.GoalSummary goal : goals) {
      boolean inFlight = !List.of("COMPLETED", "PAUSED", "ARCHIVED").contains(goal.status());
      if (!inFlight || goal.targetDate() == null || !goal.targetDate().isBefore(today)) continue;
      Integer pct = goal.progress() == null ? null : goal.progress().overallPct();
      result.add(
          new Anomaly(
              "OVERDUE_GOAL",
              "ALERT",
              goal.name() + " is past its target date",
              "Target was " + goal.targetDate() + (pct == null ? "." : ", and it's " + pct + "% done.")));
    }
    return result;
  }
}
