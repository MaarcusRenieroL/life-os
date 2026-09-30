package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.dto.response.ConsistencyResponse;
import com.lifeos.habit_tracker.domains.dto.response.GoalHabitStatsResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Feeds the Goals module: for every goal that has an active linked habit, how consistently those
 * habits have been done lately. "Lately" is this month plus last month rather than just this
 * month, so the first days of a month don't swing a goal's progress to 0% on a single miss. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GoalHabitStatsService {

  private final HabitRepository habitRepository;
  private final ConsistencyService consistencyService;

  public Map<UUID, GoalHabitStatsResponse> statsByGoal(UUID userId) {
    LocalDate today = LocalDate.now();
    Map<UUID, GoalHabitStatsResponse> stats = new HashMap<>();

    for (Habit habit : habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE)) {
      if (habit.getGoalId() == null) continue;

      ConsistencyResponse thisMonth = consistencyService.calculate(habit, "month", today);
      ConsistencyResponse lastMonth = consistencyService.calculate(habit, "month", today.minusMonths(1));

      GoalHabitStatsResponse entry =
          stats.computeIfAbsent(habit.getGoalId(), id -> new GoalHabitStatsResponse());
      entry.setActiveHabits(entry.getActiveHabits() + 1);
      entry.setCompletions(entry.getCompletions() + thisMonth.getCompletions() + lastMonth.getCompletions());
      entry.setScheduledOccurrences(
          entry.getScheduledOccurrences()
              + thisMonth.getScheduledOccurrences()
              + lastMonth.getScheduledOccurrences());
    }
    return stats;
  }
}
