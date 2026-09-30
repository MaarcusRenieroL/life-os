package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.entity.Goal;
import com.lifeos.tasks.domains.entity.GoalMetric;
import com.lifeos.tasks.domains.entity.GoalMetricEntry;
import com.lifeos.tasks.domains.entity.GoalMilestone;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.GoalStatus;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.integration.HabitStatsClient;
import com.lifeos.tasks.integration.HabitStatsClient.HabitStats;
import com.lifeos.tasks.integration.WorkoutStatsClient;
import com.lifeos.tasks.integration.WorkoutStatsClient.WorkoutStats;
import com.lifeos.tasks.repository.GoalMetricEntryRepository;
import com.lifeos.tasks.repository.GoalMetricRepository;
import com.lifeos.tasks.repository.GoalMilestoneRepository;
import com.lifeos.tasks.repository.TaskRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Gathers everything a set of one user's goals derives progress from - milestones, linked tasks,
 * metrics and their latest entries, linked habits - in one pass (a handful of queries plus one
 * habit-tracker call), then runs each goal through {@link GoalProgressCalculator}. Batch-shaped on
 * purpose: the goals list renders a progress bar per card, so per-goal queries would be an N+1. */
@Component
@RequiredArgsConstructor
public class GoalProgressAssembler {

  /** The calculator's result plus the raw counts the UI labels its chart with. */
  public record GoalProgress(
      GoalProgressCalculator.Result result,
      GoalStatus effectiveStatus,
      int milestonesDone,
      int milestonesTotal,
      int tasksDone,
      int tasksTotal,
      int activeHabits,
      int metricsCount,
      int workoutSessions) {}

  private final TaskRepository taskRepository;
  private final GoalMilestoneRepository milestoneRepository;
  private final GoalMetricRepository metricRepository;
  private final GoalMetricEntryRepository entryRepository;
  private final HabitStatsClient habitStatsClient;
  private final WorkoutStatsClient workoutStatsClient;

  public Map<UUID, GoalProgress> assemble(UUID userId, Collection<Goal> goals) {
    if (goals.isEmpty()) return Map.of();
    LocalDate today = LocalDate.now();

    Map<UUID, List<GoalMilestone>> milestones =
        milestoneRepository.findAllByUserId(userId).stream().collect(Collectors.groupingBy(GoalMilestone::getGoalId));

    // A recurring task's definition row is a template, not work to do - only its generated
    // occurrences (and one-off tasks) count toward a goal.
    Map<UUID, List<Task>> tasks =
        taskRepository.findAllByUserId(userId).stream()
            .filter(t -> t.getGoalId() != null)
            .filter(t -> !(t.getRecurrencePattern() != null && t.getRecurringParentId() == null))
            .collect(Collectors.groupingBy(Task::getGoalId));

    Map<UUID, List<GoalMetric>> metrics =
        metricRepository.findAllByUserId(userId).stream().collect(Collectors.groupingBy(GoalMetric::getGoalId));
    Map<UUID, BigDecimal> latestByMetric = latestValues(userId);

    Map<UUID, HabitStats> habits = habitStatsClient.statsByGoal(userId);
    Map<UUID, WorkoutStats> workouts = workoutStatsClient.statsByGoal(userId);

    Map<UUID, GoalProgress> result = new HashMap<>();
    for (Goal goal : goals) {
      List<GoalMilestone> goalMilestones = milestones.getOrDefault(goal.getId(), List.of());
      List<Task> goalTasks = tasks.getOrDefault(goal.getId(), List.of());
      List<GoalMetric> goalMetrics = metrics.getOrDefault(goal.getId(), List.of());
      HabitStats habit = habits.get(goal.getId());
      WorkoutStats workout = workouts.get(goal.getId());
      int workoutSessions = workout == null ? 0 : workout.sessionsLast28Days();

      int milestonesDone = (int) goalMilestones.stream().filter(m -> m.getCompletedAt() != null).count();
      int tasksDone = (int) goalTasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
      List<Double> fractions =
          goalMetrics.stream()
              .map(
                  m ->
                      GoalProgressCalculator.metricFraction(
                          m.getStartValue(), m.getTargetValue(), latestByMetric.getOrDefault(m.getId(), m.getStartValue())))
              .toList();

      GoalProgressCalculator.Result calculated =
          GoalProgressCalculator.calculate(
              new GoalProgressCalculator.Inputs(
                  goalMilestones.size(),
                  milestonesDone,
                  goalTasks.size(),
                  tasksDone,
                  habit == null ? 0 : habit.activeHabits(),
                  habit == null ? 0 : habit.completions(),
                  habit == null ? 0 : habit.scheduledOccurrences(),
                  fractions,
                  workoutSessions,
                  goal.getWeeklyWorkoutTarget(),
                  effectiveStart(goal),
                  goal.getTargetDate(),
                  today));

      result.put(
          goal.getId(),
          new GoalProgress(
              calculated,
              GoalProgressCalculator.effectiveStatus(goal.getStatus(), calculated),
              milestonesDone,
              goalMilestones.size(),
              tasksDone,
              goalTasks.size(),
              habit == null ? 0 : habit.activeHabits(),
              goalMetrics.size(),
              workoutSessions));
    }
    return result;
  }

  /** Newest entry per metric, ordered by the date it was recorded for (not when it was typed in),
   * so back-filling an old reading doesn't become the "current" value. */
  private Map<UUID, BigDecimal> latestValues(UUID userId) {
    Map<UUID, BigDecimal> latest = new HashMap<>();
    entryRepository.findAllByUserId(userId).stream()
        .sorted(
            Comparator.comparing(GoalMetricEntry::getRecordedOn)
                .thenComparing(GoalMetricEntry::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
        .forEach(entry -> latest.put(entry.getMetricId(), entry.getValue()));
    return latest;
  }

  /** A goal with no explicit start date is measured from the day it was created. */
  static LocalDate effectiveStart(Goal goal) {
    if (goal.getStartDate() != null) return goal.getStartDate();
    return goal.getCreatedAt() == null
        ? LocalDate.now()
        : goal.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
  }
}
