package com.lifeos.habit_tracker.service;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitReminder;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitReminderRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Backs the internal {@code /v1/habits/internal/today} endpoint that core's cross-module Today
 * aggregation calls once per Today-view page load (see {@link
 * com.lifeos.habit_tracker.controller.InternalTodayController}). Returns the shared {@link
 * TodayItemResponse} shape rather than a module-specific DTO, per that class's javadoc.
 *
 * <p>Kept deliberately lean - one query per table (habits, today's logs, reminders), no
 * recomputation of anything StreakService/HabitScheduleService already own - since this is meant
 * to run on every page load, not as a heavy analytics query.
 */
@Service
@RequiredArgsConstructor
public class InternalTodayService {

  // Judgment call: past this time of day, a still-unlogged habit gets flagged "warning" instead
  // of "info" so the frontend can visually nudge the user before the day runs out. A simple
  // fixed cutoff rather than e.g. a per-habit "how late is late" model - the module's other
  // time-of-day heuristics (see HabitReminderScheduler's poll window) are similarly simple.
  private static final LocalTime LATE_IN_DAY_THRESHOLD = LocalTime.of(18, 0);

  private final HabitRepository habitRepository;
  private final HabitLogRepository habitLogRepository;
  private final HabitReminderRepository habitReminderRepository;
  private final HabitScheduleService habitScheduleService;

  @Transactional(readOnly = true)
  public List<TodayItemResponse> today(UUID userId) {
    LocalDate today = LocalDate.now();
    LocalTime now = LocalTime.now();

    List<Habit> scheduledToday =
        habitRepository.findAllByUserIdAndStatus(userId, HabitStatus.ACTIVE).stream()
            .filter(habit -> habitScheduleService.isScheduled(habit, today))
            .toList();

    if (scheduledToday.isEmpty()) {
      return List.of();
    }

    List<UUID> habitIds = scheduledToday.stream().map(Habit::getId).toList();

    Set<UUID> loggedTodayHabitIds =
        habitLogRepository.findAllByHabitIdInAndLogDate(habitIds, today).stream()
            .map(HabitLog::getHabitId)
            .collect(Collectors.toSet());

    Map<UUID, List<HabitReminder>> remindersByHabitId =
        habitReminderRepository.findAllByHabitIdIn(habitIds).stream()
            .filter(HabitReminder::isEnabled)
            .collect(Collectors.groupingBy(HabitReminder::getHabitId));

    List<TodayItemResponse> items = new ArrayList<>();
    int isoDayOfWeek = today.getDayOfWeek().getValue();

    for (Habit habit : scheduledToday) {
      if (!loggedTodayHabitIds.contains(habit.getId())) {
        items.add(habitDueItem(habit, today, now));
      }

      for (HabitReminder reminder : remindersByHabitId.getOrDefault(habit.getId(), List.of())) {
        if (isUpcomingToday(reminder, now, isoDayOfWeek)) {
          items.add(reminderUpcomingItem(habit, reminder, today));
        }
      }
    }

    return items;
  }

  private TodayItemResponse habitDueItem(Habit habit, LocalDate today, LocalTime now) {
    return TodayItemResponse.builder()
        .module("habit-tracker")
        .type("habit_due")
        .title(habit.getName())
        .description(habit.getWhy())
        .dueAt(endOfDay(today))
        .entityId(habit.getId().toString())
        .priority(isLateInDay(now) ? "warning" : "info")
        .build();
  }

  private TodayItemResponse reminderUpcomingItem(Habit habit, HabitReminder reminder, LocalDate today) {
    return TodayItemResponse.builder()
        .module("habit-tracker")
        .type("habit_reminder_upcoming")
        .title("Reminder: " + habit.getName())
        .description(habit.getWhy())
        .dueAt(today.atTime(reminder.getReminderTime()).atZone(ZoneId.systemDefault()).toInstant())
        .entityId(habit.getId().toString())
        .priority("info")
        .build();
  }

  /** Whether an enabled reminder still has time left to fire later today, given "now". */
  boolean isUpcomingToday(HabitReminder reminder, LocalTime now, int isoDayOfWeek) {
    List<Integer> days = reminder.getDaysOfWeek();
    if (days != null && !days.isEmpty() && !days.contains(isoDayOfWeek)) {
      return false;
    }
    LocalTime reminderTime = reminder.getReminderTime();
    return reminderTime != null && reminderTime.isAfter(now);
  }

  /** Package-visible so the "late in the day" cutoff can be unit tested without depending on the
   * wall clock - same pattern as StreakService#isCounted. */
  boolean isLateInDay(LocalTime now) {
    return !now.isBefore(LATE_IN_DAY_THRESHOLD);
  }

  private Instant endOfDay(LocalDate date) {
    return date.atTime(LocalTime.MAX).atZone(ZoneId.systemDefault()).toInstant();
  }
}
