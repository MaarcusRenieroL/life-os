package com.lifeos.core.analytics;

import com.lifeos.core.analytics.AnalyticsModels.CategoryAmount;
import com.lifeos.core.analytics.AnalyticsModels.DailySnapshot;
import com.lifeos.core.analytics.AnalyticsModels.GoalBreakdown;
import com.lifeos.core.analytics.AnalyticsModels.GoalLine;
import com.lifeos.core.analytics.AnalyticsModels.PeriodSummary;
import com.lifeos.core.analytics.AnalyticsModels.TrendPoint;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Turns what the modules reported into the numbers the analytics pages show. Pure: it takes the
 * already-fetched {@link ModuleData.Bundle}, so every formula here is unit-testable and a module
 * being down is just a null it copes with. */
public final class AnalyticsCalculator {

  private AnalyticsCalculator() {}

  public static DailySnapshot daily(ModuleData.Bundle bundle, LocalDate date) {
    ModuleData.TaskDay task = bundle.tasks() == null ? null : bundle.tasks().days().stream().filter(d -> d.date().equals(date)).findFirst().orElse(null);
    ModuleData.HabitDay habit = bundle.habits() == null ? null : bundle.habits().days().stream().filter(d -> d.date().equals(date)).findFirst().orElse(null);
    ModuleData.SpendDay spend = bundle.spending() == null ? null : bundle.spending().days().stream().filter(d -> d.date().equals(date)).findFirst().orElse(null);
    ModuleData.WorkoutDay workout = bundle.workouts() == null ? null : bundle.workouts().days().stream().filter(d -> d.date().equals(date)).findFirst().orElse(null);
    ModuleData.JournalDay journal = bundle.journal() == null ? null : bundle.journal().days().stream().filter(d -> d.date().equals(date)).findFirst().orElse(null);

    return new DailySnapshot(
        date,
        task == null ? 0 : task.completed(),
        task == null ? 0 : round1(task.focusMinutes() / 60.0),
        habit == null ? 0 : habit.completed(),
        habit == null ? 0 : habit.scheduled(),
        spend == null ? BigDecimal.ZERO : spend.spend(),
        workout == null ? 0 : workout.sessions(),
        journal == null ? null : journal.mood(),
        journal == null ? null : journal.energy());
  }

  /** The Monday-start week containing `date`. */
  public static LocalDate weekStart(LocalDate date) {
    return date.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
  }

  public static PeriodSummary summary(String period, LocalDate from, LocalDate to, ModuleData.Bundle current, ModuleData.Bundle previous) {
    int tasksCompleted = current.tasks() == null ? 0 : current.tasks().days().stream().mapToInt(ModuleData.TaskDay::completed).sum();
    int tasksDue = current.tasks() == null ? 0 : current.tasks().days().stream().mapToInt(ModuleData.TaskDay::due).sum();
    int focusMinutes = current.tasks() == null ? 0 : current.tasks().days().stream().mapToInt(ModuleData.TaskDay::focusMinutes).sum();
    int habitScheduled = current.habits() == null ? 0 : current.habits().days().stream().mapToInt(ModuleData.HabitDay::scheduled).sum();
    int habitDone = current.habits() == null ? 0 : current.habits().days().stream().mapToInt(ModuleData.HabitDay::completed).sum();

    int workouts = current.workouts() == null ? 0 : current.workouts().days().stream().mapToInt(ModuleData.WorkoutDay::sessions).sum();
    int workoutMinutes = current.workouts() == null ? 0 : current.workouts().days().stream().mapToInt(ModuleData.WorkoutDay::minutes).sum();

    BigDecimal weightChange = null;
    if (current.workouts() != null && current.workouts().weights().size() >= 2) {
      List<ModuleData.WeightPoint> w = current.workouts().weights();
      weightChange = w.get(w.size() - 1).weightKg().subtract(w.get(0).weightKg()).setScale(1, RoundingMode.HALF_UP);
    }

    List<CategoryAmount> categories =
        current.spending() == null
            ? List.of()
            : current.spending().categories().stream().limit(6).map(c -> new CategoryAmount(c.category(), c.amount())).toList();

    List<GoalLine> goals =
        current.goals() == null
            ? List.of()
            : current.goals().stream()
                .map(g -> new GoalLine(g.name(), g.status(), g.progress() == null ? null : g.progress().overallPct(), g.progress() == null ? null : g.progress().expectedPct(), g.targetDate()))
                .toList();

    return new PeriodSummary(
        period,
        from,
        to,
        tasksCompleted,
        tasksDue,
        tasksDue == 0 ? null : Math.min(100, (int) Math.round(100.0 * tasksCompleted / tasksDue)),
        habitScheduled == 0 ? null : (int) Math.round(100.0 * habitDone / habitScheduled),
        round1(focusMinutes / 60.0),
        workouts,
        workoutMinutes,
        current.spending() == null ? BigDecimal.ZERO : current.spending().totalSpend(),
        current.spending() == null ? BigDecimal.ZERO : current.spending().totalIncome(),
        previous == null || previous.spending() == null ? null : previous.spending().totalSpend(),
        previous == null || previous.tasks() == null ? 0 : previous.tasks().days().stream().mapToInt(ModuleData.TaskDay::completed).sum(),
        current.applications() == null ? 0 : current.applications().applied(),
        current.applications() == null ? 0 : current.applications().saved(),
        current.applications() == null ? 0 : current.applications().interviews(),
        current.journal() == null ? 0 : current.journal().totalEntries(),
        current.journal() == null ? null : current.journal().averageMood(),
        current.journal() == null ? null : current.journal().averageEnergy(),
        current.tasks() == null ? 0 : current.tasks().milestonesCompleted(),
        weightChange,
        categories,
        goals,
        goalBreakdown(current.goals()),
        current.unavailable());
  }

  /** The average of each progress component across every goal that measures it - the data behind
   * the "where is goal progress coming from" pie. */
  public static GoalBreakdown goalBreakdown(List<ModuleData.GoalSummary> goals) {
    if (goals == null || goals.isEmpty()) return new GoalBreakdown(null, null, null, null, null, 0);
    List<ModuleData.GoalSummary> active = goals.stream().filter(g -> g.progress() != null && !List.of("COMPLETED", "ARCHIVED").contains(g.status())).toList();
    return new GoalBreakdown(
        average(active, ModuleData.GoalProgress::milestonePct),
        average(active, ModuleData.GoalProgress::taskPct),
        average(active, ModuleData.GoalProgress::habitPct),
        average(active, ModuleData.GoalProgress::metricPct),
        average(active, ModuleData.GoalProgress::workoutPct),
        active.size());
  }

  /** One point per day over the bundle's range. */
  public static List<TrendPoint> trend(ModuleData.Bundle bundle, LocalDate from, LocalDate to) {
    Map<LocalDate, ModuleData.HabitDay> habits = index(bundle.habits() == null ? List.of() : bundle.habits().days(), ModuleData.HabitDay::date);
    Map<LocalDate, ModuleData.TaskDay> tasks = index(bundle.tasks() == null ? List.of() : bundle.tasks().days(), ModuleData.TaskDay::date);
    Map<LocalDate, ModuleData.SpendDay> spend = index(bundle.spending() == null ? List.of() : bundle.spending().days(), ModuleData.SpendDay::date);
    Map<LocalDate, ModuleData.WorkoutDay> workouts = index(bundle.workouts() == null ? List.of() : bundle.workouts().days(), ModuleData.WorkoutDay::date);
    Map<LocalDate, ModuleData.JournalDay> journal = index(bundle.journal() == null ? List.of() : bundle.journal().days(), ModuleData.JournalDay::date);
    Map<LocalDate, BigDecimal> weights = new TreeMap<>();
    if (bundle.workouts() != null) bundle.workouts().weights().forEach(w -> weights.put(w.date(), w.weightKg()));

    List<TrendPoint> points = new ArrayList<>();
    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
      ModuleData.HabitDay h = habits.get(d);
      points.add(
          new TrendPoint(
              d,
              tasks.containsKey(d) ? tasks.get(d).completed() : 0,
              h == null || h.scheduled() == 0 ? null : (int) Math.round(100.0 * h.completed() / h.scheduled()),
              spend.containsKey(d) ? spend.get(d).spend() : BigDecimal.ZERO,
              weights.get(d),
              journal.containsKey(d) ? journal.get(d).mood() : null,
              workouts.containsKey(d) ? workouts.get(d).sessions() : 0));
    }
    return points;
  }

  /** Collapses daily points into Monday-start weeks: tasks/spending/workouts summed, habit % as a
   * ratio of the week's scheduled to done (via the daily percentages' mean), the last weigh-in of
   * the week, and the average mood. */
  public static List<TrendPoint> weekly(List<TrendPoint> daily) {
    Map<LocalDate, List<TrendPoint>> byWeek = daily.stream().collect(Collectors.groupingBy(p -> weekStart(p.date()), TreeMap::new, Collectors.toList()));
    List<TrendPoint> weeks = new ArrayList<>();
    byWeek.forEach(
        (week, points) -> {
          List<Integer> habitPcts = points.stream().map(TrendPoint::habitPct).filter(Objects::nonNull).toList();
          List<Double> moods = points.stream().map(TrendPoint::mood).filter(Objects::nonNull).toList();
          BigDecimal lastWeight = points.stream().map(TrendPoint::weightKg).filter(Objects::nonNull).reduce((a, b) -> b).orElse(null);
          weeks.add(
              new TrendPoint(
                  week,
                  points.stream().mapToInt(TrendPoint::tasksCompleted).sum(),
                  habitPcts.isEmpty() ? null : (int) Math.round(habitPcts.stream().mapToInt(Integer::intValue).average().orElse(0)),
                  points.stream().map(TrendPoint::spending).reduce(BigDecimal.ZERO, BigDecimal::add),
                  lastWeight,
                  moods.isEmpty() ? null : Math.round(Statistics.mean(moods) * 10) / 10.0,
                  points.stream().mapToInt(TrendPoint::workouts).sum()));
        });
    return weeks;
  }

  /** Per-day rows for InsightFinder, from a bundle spanning the analysis window. */
  public static List<InsightFinder.Day> insightDays(ModuleData.Bundle bundle, LocalDate from, LocalDate to) {
    Map<LocalDate, ModuleData.HabitDay> habits = index(bundle.habits() == null ? List.of() : bundle.habits().days(), ModuleData.HabitDay::date);
    Map<LocalDate, ModuleData.TaskDay> tasks = index(bundle.tasks() == null ? List.of() : bundle.tasks().days(), ModuleData.TaskDay::date);
    Map<LocalDate, ModuleData.WorkoutDay> workouts = index(bundle.workouts() == null ? List.of() : bundle.workouts().days(), ModuleData.WorkoutDay::date);
    Map<LocalDate, ModuleData.JournalDay> journal = index(bundle.journal() == null ? List.of() : bundle.journal().days(), ModuleData.JournalDay::date);

    List<InsightFinder.Day> days = new ArrayList<>();
    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
      ModuleData.JournalDay j = journal.get(d);
      ModuleData.HabitDay h = habits.get(d);
      ModuleData.TaskDay t = tasks.get(d);
      ModuleData.WorkoutDay w = workouts.get(d);
      days.add(
          new InsightFinder.Day(
              j == null ? null : j.mood(),
              j == null ? null : j.energy(),
              t == null ? null : (double) t.completed(),
              t == null ? null : (double) t.focusMinutes(),
              h == null || h.scheduled() == 0 ? null : 100.0 * h.completed() / h.scheduled(),
              w == null ? null : (w.sessions() > 0 ? 1.0 : 0.0)));
    }
    return days;
  }

  private static Integer average(List<ModuleData.GoalSummary> goals, Function<ModuleData.GoalProgress, Integer> component) {
    List<Integer> values = goals.stream().map(g -> component.apply(g.progress())).filter(Objects::nonNull).toList();
    return values.isEmpty() ? null : (int) Math.round(values.stream().mapToInt(Integer::intValue).average().orElse(0));
  }

  private static <T> Map<LocalDate, T> index(List<T> items, Function<T, LocalDate> date) {
    return items.stream().collect(Collectors.toMap(date, i -> i, (a, b) -> a));
  }

  private static double round1(double v) {
    return Math.round(v * 10) / 10.0;
  }
}
