package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.entity.Habit;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Single source of truth for "was this habit scheduled on this date", shared by
 * {@link StreakService}, {@link ConsistencyService} and the missed-log scheduler so the three
 * never disagree about what a habit's frequency config means.
 */
@Component
public class HabitScheduleService {

  public boolean isScheduled(Habit habit, LocalDate date) {
    if (date.isBefore(habit.getStartDate())) {
      return false;
    }
    if (habit.getEndDate() != null && date.isAfter(habit.getEndDate())) {
      return false;
    }

    Map<String, Object> config = habit.getFrequencyConfig();

    return switch (habit.getFrequencyType()) {
      case DAILY -> true;
      case WEEKLY_DAYS -> {
        List<Integer> days = extractIntList(config, "daysOfWeek");
        yield days != null && days.contains(date.getDayOfWeek().getValue());
      }
      // X_PER_WEEK/X_PER_MONTH only carry a target count, not *which* days count, so there's no
      // day that can be definitively "missed". This method only decides whether an existing log's
      // date is eligible to be evaluated (used by StreakService over logs the user actually
      // entered) - it always returns true here since any explicit log for these types should
      // count. MissedHabitScheduler deliberately does NOT call this for these frequency types
      // (it would be wrong to auto-generate a MISSED log for a day with no fixed assignment), and
      // ConsistencyService scores these types via the raw target count instead of a day tally.
      case X_PER_WEEK, X_PER_MONTH -> true;
      case CUSTOM_INTERVAL -> {
        Integer intervalDays = extractInt(config, "intervalDays");
        if (intervalDays == null || intervalDays <= 0) {
          yield false;
        }
        long daysSinceStart = ChronoUnit.DAYS.between(habit.getStartDate(), date);
        yield daysSinceStart % intervalDays == 0;
      }
    };
  }

  @SuppressWarnings("unchecked")
  public List<Integer> extractIntList(Map<String, Object> config, String key) {
    if (config == null) {
      return null;
    }
    Object raw = config.get(key);
    if (raw instanceof List<?> list) {
      return list.stream()
          .filter(Number.class::isInstance)
          .map(item -> ((Number) item).intValue())
          .toList();
    }
    return null;
  }

  public Integer extractInt(Map<String, Object> config, String key) {
    if (config == null) {
      return null;
    }
    Object raw = config.get(key);
    if (raw instanceof Number number) {
      return number.intValue();
    }
    return null;
  }
}
