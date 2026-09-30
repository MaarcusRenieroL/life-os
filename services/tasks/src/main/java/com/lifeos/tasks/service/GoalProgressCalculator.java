package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.enums.GoalStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/** Pure progress/status maths for a goal, kept free of repositories so it's directly unit-testable.
 *
 * <p>A goal's progress is the plain average of whichever of its four components actually have
 * something to measure: milestones done, linked tasks done, linked habits' recent consistency, and
 * custom metrics' distance travelled. A component with nothing behind it (no milestones, no linked
 * tasks...) is left out rather than counted as 0%, so a goal that's only tracked through a metric
 * isn't dragged down by three empty categories. */
public final class GoalProgressCalculator {

  private GoalProgressCalculator() {}

  public record Inputs(
      int milestonesTotal,
      int milestonesDone,
      int tasksTotal,
      int tasksDone,
      int activeHabits,
      int habitCompletions,
      int habitScheduled,
      List<Double> metricFractions,
      LocalDate startDate,
      LocalDate targetDate,
      LocalDate today) {}

  /** Each percentage is null when that component has nothing to measure. expectedPct is null when
   * the goal has no target date, since "how far along should it be by now" needs one. */
  public record Result(
      int overallPct,
      Integer milestonePct,
      Integer taskPct,
      Integer habitPct,
      Integer metricPct,
      Integer expectedPct) {}

  public static Result calculate(Inputs in) {
    Integer milestonePct = in.milestonesTotal() > 0 ? pct(in.milestonesDone(), in.milestonesTotal()) : null;
    Integer taskPct = in.tasksTotal() > 0 ? pct(in.tasksDone(), in.tasksTotal()) : null;
    // Habits linked but nothing scheduled yet (a brand-new habit) is "no data", not "0%".
    Integer habitPct =
        in.activeHabits() > 0 && in.habitScheduled() > 0
            ? Math.min(100, pct(in.habitCompletions(), in.habitScheduled()))
            : null;
    Integer metricPct = null;
    if (in.metricFractions() != null && !in.metricFractions().isEmpty()) {
      double average = in.metricFractions().stream().mapToDouble(Double::doubleValue).average().orElse(0);
      metricPct = (int) Math.round(average * 100);
    }

    List<Integer> present =
        java.util.stream.Stream.of(milestonePct, taskPct, habitPct, metricPct)
            .filter(java.util.Objects::nonNull)
            .toList();
    int overall =
        present.isEmpty() ? 0 : (int) Math.round(present.stream().mapToInt(Integer::intValue).average().orElse(0));

    return new Result(
        overall,
        milestonePct,
        taskPct,
        habitPct,
        metricPct,
        expectedPct(in.startDate(), in.targetDate(), in.today()));
  }

  /** Straight-line share of the start-to-target window that has elapsed, 0-100. */
  static Integer expectedPct(LocalDate start, LocalDate target, LocalDate today) {
    if (target == null) return null;
    if (!today.isBefore(target)) return 100;
    if (start == null || !target.isAfter(start)) return 0;
    if (!today.isAfter(start)) return 0;
    long total = ChronoUnit.DAYS.between(start, target);
    long elapsed = ChronoUnit.DAYS.between(start, today);
    return (int) Math.round(100.0 * elapsed / total);
  }

  /** ON_TRACK once progress has caught up with the share of time used, AT_RISK while it's behind;
   * a goal without a target date has nothing to fall behind and stays ACTIVE. Explicit states
   * (paused/completed/archived) are the user's call and pass through untouched. */
  public static GoalStatus effectiveStatus(GoalStatus stored, Result result) {
    if (!stored.isInFlight()) return stored;
    if (result.expectedPct() == null) return GoalStatus.ACTIVE;
    return result.overallPct() >= result.expectedPct() ? GoalStatus.ON_TRACK : GoalStatus.AT_RISK;
  }

  /** How far a metric has travelled from its start to its target, 0-1. Direction-agnostic: a
   * target below the start (weight loss) is just a negative span, so the same formula covers both
   * directions. A metric whose start equals its target is done exactly when it's at that value. */
  public static double metricFraction(BigDecimal start, BigDecimal target, BigDecimal current) {
    BigDecimal span = target.subtract(start);
    if (span.signum() == 0) return current.compareTo(target) == 0 ? 1.0 : 0.0;
    double fraction = current.subtract(start).divide(span, 6, RoundingMode.HALF_UP).doubleValue();
    return Math.max(0.0, Math.min(1.0, fraction));
  }

  private static int pct(int done, int total) {
    return (int) Math.round(100.0 * done / total);
  }
}
