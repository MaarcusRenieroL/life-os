package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.dto.response.ConsistencyResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.enums.FrequencyType;
import com.lifeos.habit_tracker.exception.InvalidRequestException;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Computes a point-in-time consistency score for a period ("week" or "month"): completions /
 * scheduledOccurrences. This is read-only/on-demand - unlike streaks, nothing caches it.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConsistencyService {

  private final HabitLogRepository habitLogRepository;
  private final HabitScheduleService habitScheduleService;
  private final StreakService streakService;

  public ConsistencyResponse calculate(Habit habit, String period, LocalDate referenceDate) {
    LocalDate reference = referenceDate != null ? referenceDate : LocalDate.now();
    LocalDate periodStart;
    LocalDate periodEnd;

    switch (period.toLowerCase()) {
      case "week" -> {
        periodStart = reference.with(DayOfWeek.MONDAY);
        periodEnd = periodStart.plusDays(6);
      }
      case "month" -> {
        periodStart = reference.withDayOfMonth(1);
        periodEnd = periodStart.plusMonths(1).minusDays(1);
      }
      default -> throw new InvalidRequestException("period must be 'week' or 'month'");
    }

    LocalDate today = LocalDate.now();
    LocalDate effectiveStart = maxDate(periodStart, habit.getStartDate());
    LocalDate effectiveEnd = minDate(periodEnd, today);
    if (habit.getEndDate() != null) {
      effectiveEnd = minDate(effectiveEnd, habit.getEndDate());
    }

    if (effectiveStart.isAfter(effectiveEnd)) {
      return ConsistencyResponse.builder()
          .habitId(habit.getId())
          .period(period.toLowerCase())
          .periodStart(periodStart)
          .periodEnd(periodEnd)
          .completions(0)
          .scheduledOccurrences(0)
          .score(0)
          .build();
    }

    List<HabitLog> logs =
        habitLogRepository.findAllByHabitIdAndLogDateBetweenOrderByLogDateAsc(
            habit.getId(), effectiveStart, effectiveEnd);
    Map<LocalDate, HabitLog> byDate = logs.stream().collect(
        java.util.stream.Collectors.toMap(HabitLog::getLogDate, l -> l, (a, b) -> a));

    int scheduledOccurrences;
    int completions;

    if (habit.getFrequencyType() == FrequencyType.X_PER_WEEK
        || habit.getFrequencyType() == FrequencyType.X_PER_MONTH) {
      // Per spec: for these frequency types there's no fixed day-of-week
      // assignment, so "scheduled" means the raw target count itself rather
      // than a day tally.
      // TODO(maarcus): X_PER_WEEK/X_PER_MONTH don't specify which days count
      // toward the target, so this simply counts every completion in the
      // (possibly partial, if the period is clipped by start/end date or
      // "today") window against the full period target - it doesn't prorate
      // the target for a clipped period.
      String key = habit.getFrequencyType() == FrequencyType.X_PER_WEEK ? "timesPerWeek" : "timesPerMonth";
      Integer target = habitScheduleService.extractInt(habit.getFrequencyConfig(), key);
      scheduledOccurrences = target != null ? target : 0;
      completions = 0;
      for (HabitLog log : logs) {
        if (streakService.isCounted(habit, log)) {
          completions++;
        }
      }
    } else {
      int scheduledCount = 0;
      int completedCount = 0;
      for (LocalDate date = effectiveStart; !date.isAfter(effectiveEnd); date = date.plusDays(1)) {
        if (!habitScheduleService.isScheduled(habit, date)) {
          continue;
        }
        scheduledCount++;
        HabitLog log = byDate.get(date);
        if (log != null && streakService.isCounted(habit, log)) {
          completedCount++;
        }
      }
      scheduledOccurrences = scheduledCount;
      completions = completedCount;
    }

    double score = scheduledOccurrences > 0 ? (double) completions / scheduledOccurrences : 0.0;

    return ConsistencyResponse.builder()
        .habitId(habit.getId())
        .period(period.toLowerCase())
        .periodStart(periodStart)
        .periodEnd(periodEnd)
        .completions(completions)
        .scheduledOccurrences(scheduledOccurrences)
        .score(score)
        .build();
  }

  private LocalDate maxDate(LocalDate a, LocalDate b) {
    return a.isAfter(b) ? a : b;
  }

  private LocalDate minDate(LocalDate a, LocalDate b) {
    return a.isBefore(b) ? a : b;
  }
}
