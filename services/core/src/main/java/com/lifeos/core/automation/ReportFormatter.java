package com.lifeos.core.automation;

import com.lifeos.core.analytics.AnalyticsModels.PeriodSummary;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** Renders a period summary as the plain-text body of a report notification. */
public final class ReportFormatter {

  private ReportFormatter() {}

  public static String title(PeriodSummary s) {
    return ("MONTH".equals(s.period()) ? "Monthly review: " : "Weekly review: ") + s.from() + " to " + s.to();
  }

  public static String body(PeriodSummary s) {
    List<String> lines = new ArrayList<>();
    lines.add("Tasks: " + s.tasksCompleted() + " done" + (s.taskCompletionPct() == null ? "" : " (" + s.taskCompletionPct() + "% of those due)") + comparison(s.tasksCompleted(), s.previousTasksCompleted()));
    if (s.habitConsistencyPct() != null) lines.add("Habits: " + s.habitConsistencyPct() + "% consistency");
    if (s.focusHours() > 0) lines.add("Focus: " + s.focusHours() + " h");
    if (s.workouts() > 0) lines.add("Workouts: " + s.workouts() + " (" + s.workoutMinutes() + " min)");
    lines.add("Spending: " + s.spending().setScale(0, java.math.RoundingMode.HALF_UP) + spendComparison(s.spending(), s.previousSpending()));
    if (s.applicationsApplied() > 0 || s.interviews() > 0) lines.add("Job search: " + s.applicationsApplied() + " applied, " + s.interviews() + " interviews");
    if (s.journalEntries() > 0) lines.add("Journal: " + s.journalEntries() + " entries" + (s.averageMood() == null ? "" : ", average mood " + s.averageMood() + "/5"));
    if (s.milestonesCompleted() > 0) lines.add("Milestones hit: " + s.milestonesCompleted());
    if (s.weightChangeKg() != null) lines.add("Weight: " + (s.weightChangeKg().signum() > 0 ? "+" : "") + s.weightChangeKg() + " kg");
    if (!s.unavailableModules().isEmpty()) lines.add("(No data from: " + String.join(", ", s.unavailableModules()) + ")");
    return String.join("\n", lines);
  }

  private static String comparison(int current, int previous) {
    if (previous == 0 && current == 0) return "";
    int diff = current - previous;
    return diff == 0 ? ", same as last time" : ", " + (diff > 0 ? "up " : "down ") + Math.abs(diff) + " on last time";
  }

  private static String spendComparison(BigDecimal current, BigDecimal previous) {
    if (previous == null || previous.signum() == 0) return "";
    BigDecimal diff = current.subtract(previous).setScale(0, java.math.RoundingMode.HALF_UP);
    if (diff.signum() == 0) return ", same as last time";
    return ", " + (diff.signum() > 0 ? "up " : "down ") + diff.abs() + " on last time";
  }
}
