package com.lifeos.core.automation;

import com.lifeos.core.analytics.ModuleData;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Checks a threshold rule's condition against the user's current numbers. */
public final class ThresholdEvaluator {

  private ThresholdEvaluator() {}

  /** What the rule is judged against. Any of these may be null when that module didn't answer -
   * a condition that can't be judged is treated as not met, never as met. */
  public record Data(List<ModuleData.GoalSummary> goals, Integer habitConsistencyPct, BigDecimal weeklySpend, Integer overdueTasks) {}

  public record Result(boolean met, String message) {}

  public static Result evaluate(Map<String, Object> config, Data data) {
    String metric = String.valueOf(config.get("metric"));
    double value = RuleValidator.number(config, "value");

    return switch (metric) {
      case "GOAL_PROGRESS_BELOW" -> goalsBelow(config, data.goals(), (int) value);
      case "HABIT_CONSISTENCY_BELOW" ->
          data.habitConsistencyPct() != null && data.habitConsistencyPct() < value
              ? new Result(true, "Habit consistency over the last two weeks is " + data.habitConsistencyPct() + "%, below your " + (int) value + "% line.")
              : new Result(false, null);
      case "WEEKLY_SPEND_ABOVE" ->
          data.weeklySpend() != null && data.weeklySpend().doubleValue() > value
              ? new Result(true, "You've spent " + data.weeklySpend().setScale(0, java.math.RoundingMode.HALF_UP) + " in the last 7 days, over your " + (long) value + " limit.")
              : new Result(false, null);
      case "OVERDUE_TASKS_ABOVE" ->
          data.overdueTasks() != null && data.overdueTasks() > value
              ? new Result(true, data.overdueTasks() + " tasks are overdue (your limit is " + (int) value + ").")
              : new Result(false, null);
      default -> new Result(false, null);
    };
  }

  private static Result goalsBelow(Map<String, Object> config, List<ModuleData.GoalSummary> goals, int value) {
    if (goals == null) return new Result(false, null);
    UUID only = config.get("goalId") == null ? null : UUID.fromString(String.valueOf(config.get("goalId")));

    List<ModuleData.GoalSummary> behind =
        goals.stream()
            .filter(g -> only == null || only.equals(g.id()))
            .filter(g -> !List.of("COMPLETED", "PAUSED", "ARCHIVED").contains(g.status()))
            .filter(g -> g.progress() != null && g.progress().overallPct() != null && g.progress().overallPct() < value)
            .toList();
    if (behind.isEmpty()) return new Result(false, null);

    String names = behind.stream().map(g -> g.name() + " (" + g.progress().overallPct() + "%)").collect(Collectors.joining(", "));
    return new Result(true, names + (behind.size() == 1 ? " is" : " are") + " below " + value + "%.");
  }
}
