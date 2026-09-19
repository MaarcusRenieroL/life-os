package com.lifeos.habit_tracker.service;

import com.lifeos.habit_tracker.domains.dto.response.HabitNotificationResponse;
import com.lifeos.habit_tracker.domains.dto.response.LoggingTimePatternResponse;
import com.lifeos.habit_tracker.domains.dto.response.WeeklySummaryResponse;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import com.lifeos.habit_tracker.domains.enums.NotificationType;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitReminderRepository;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds the in-app notification feed. Everything here is derived live from habits, logs, streaks
 * and reminders on each request - there is no notification table, no read/unread state and no
 * delivery channel. In-app only, by design.
 *
 * <p>Computing it server-side keeps it to a handful of queries; the equivalent in the browser would
 * be a streak fetch and a log fetch per habit before anything could be rendered.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HabitNotificationService {

  /** Streak lengths worth celebrating. Mirrored by the web UI's badge thresholds. */
  private static final List<Integer> MILESTONES = List.of(3, 7, 14, 30, 60, 100, 365);

  private static final DateTimeFormatter WEEK_LABEL = DateTimeFormatter.ofPattern("d MMM");

  private final HabitLogRepository habitLogRepository;
  private final HabitReminderRepository habitReminderRepository;
  private final HabitScheduleService habitScheduleService;
  private final StreakService streakService;
  private final HabitAnalyticsService habitAnalyticsService;

  public List<HabitNotificationResponse> notifications(UUID userId, String zoneId) {
    LocalDate today = LocalDate.now();
    List<Habit> active = habitAnalyticsService.activeHabits(userId);
    Map<UUID, HabitStreak> streaks = habitAnalyticsService.streaksByHabit(active);

    List<Habit> dueToday =
        active.stream().filter(h -> habitScheduleService.isScheduled(h, today)).toList();
    Map<UUID, HabitLog> todayLogs =
        dueToday.isEmpty()
            ? Map.of()
            : habitLogRepository
                .findAllByHabitIdInAndLogDate(dueToday.stream().map(Habit::getId).toList(), today)
                .stream()
                .collect(Collectors.toMap(HabitLog::getHabitId, l -> l, (a, b) -> a));

    List<HabitNotificationResponse> notifications = new ArrayList<>();
    notifications.addAll(streakAtRisk(dueToday, todayLogs, streaks, today));
    notifications.addAll(milestones(active, streaks));
    weeklySummary(userId).ifPresent(notifications::add);
    reminderSuggestion(userId, active, zoneId).ifPresent(notifications::add);
    return notifications;
  }

  /**
   * Habits carrying a live streak that are scheduled today and haven't been logged yet - the one
   * case where acting before midnight actually matters.
   */
  private List<HabitNotificationResponse> streakAtRisk(
      List<Habit> dueToday,
      Map<UUID, HabitLog> todayLogs,
      Map<UUID, HabitStreak> streaks,
      LocalDate today) {
    List<HabitNotificationResponse> result = new ArrayList<>();

    for (Habit habit : dueToday) {
      HabitStreak streak = streaks.get(habit.getId());
      if (streak == null || streak.getCurrentStreak() <= 0) {
        continue;
      }
      HabitLog log = todayLogs.get(habit.getId());
      if (log != null && streakService.isCounted(habit, log)) {
        continue;
      }

      result.add(
          HabitNotificationResponse.builder()
              .id("streak-at-risk:" + habit.getId() + ":" + today)
              .type(NotificationType.STREAK_AT_RISK)
              .severity("warning")
              .title(streak.getCurrentStreak() + "-day streak at risk")
              .message(
                  "\"%s\" is due today and isn't logged yet. Log it to keep the streak alive."
                      .formatted(habit.getName()))
              .habitId(habit.getId())
              .habitName(habit.getName())
              .build());
    }

    // Longest streak first: that's the one with the most to lose.
    result.sort(
        (a, b) ->
            Integer.compare(
                streaks.get(b.getHabitId()).getCurrentStreak(),
                streaks.get(a.getHabitId()).getCurrentStreak()));
    return result;
  }

  /** A current streak sitting exactly on a threshold, so it's called out the day it's reached. */
  private List<HabitNotificationResponse> milestones(
      List<Habit> habits, Map<UUID, HabitStreak> streaks) {
    Set<Integer> thresholds = new HashSet<>(MILESTONES);
    List<HabitNotificationResponse> result = new ArrayList<>();

    for (Habit habit : habits) {
      HabitStreak streak = streaks.get(habit.getId());
      if (streak == null || !thresholds.contains(streak.getCurrentStreak())) {
        continue;
      }
      result.add(
          HabitNotificationResponse.builder()
              .id("milestone:" + habit.getId() + ":" + streak.getCurrentStreak())
              .type(NotificationType.STREAK_MILESTONE)
              .severity("success")
              .title(streak.getCurrentStreak() + "-day streak")
              .message("\"%s\" just hit %d days in a row.".formatted(habit.getName(), streak.getCurrentStreak()))
              .habitId(habit.getId())
              .habitName(habit.getName())
              .build());
    }
    return result;
  }

  /** Recap of the week just gone, shown once the current week has started. */
  private java.util.Optional<HabitNotificationResponse> weeklySummary(UUID userId) {
    WeeklySummaryResponse summary =
        habitAnalyticsService.weeklySummary(userId, LocalDate.now().minusWeeks(1));
    if (summary.getScheduledOccurrences() == 0) {
      return java.util.Optional.empty();
    }

    int percent = (int) Math.round(summary.getScore() * 100);
    int previousPercent = (int) Math.round(summary.getPreviousWeekScore() * 100);
    String direction =
        percent > previousPercent
            ? "up from %d%%".formatted(previousPercent)
            : percent < previousPercent
                ? "down from %d%%".formatted(previousPercent)
                : "level with the week before";

    StringBuilder message = new StringBuilder();
    message.append(
        "%d of %d completed (%d%%), %s. %d perfect day%s."
            .formatted(
                summary.getCompletions(),
                summary.getScheduledOccurrences(),
                percent,
                direction,
                summary.getPerfectDays(),
                summary.getPerfectDays() == 1 ? "" : "s"));
    if (summary.getTopHabitName() != null) {
      message.append(" Best: \"%s\".".formatted(summary.getTopHabitName()));
    }
    if (summary.getNeedsAttentionHabitName() != null) {
      message.append(" Needs attention: \"%s\".".formatted(summary.getNeedsAttentionHabitName()));
    }

    return java.util.Optional.of(
        HabitNotificationResponse.builder()
            .id("weekly-summary:" + summary.getWeekStart())
            .type(NotificationType.WEEKLY_SUMMARY)
            .severity("info")
            .title(
                "Week of %s - %s"
                    .formatted(
                        summary.getWeekStart().format(WEEK_LABEL),
                        summary.getWeekEnd().format(WEEK_LABEL)))
            .message(message.toString())
            .build());
  }

  /**
   * If the user has active habits with no reminder at all, and enough logging history to see when
   * they actually log, suggest that hour. A suggestion only - nothing schedules itself off it.
   */
  private java.util.Optional<HabitNotificationResponse> reminderSuggestion(
      UUID userId, List<Habit> active, String zoneId) {
    Set<UUID> habitsWithReminders =
        habitReminderRepository
            .findAllByHabitIdIn(active.stream().map(Habit::getId).toList())
            .stream()
            .map(reminder -> reminder.getHabitId())
            .collect(Collectors.toSet());
    List<Habit> withoutReminders =
        active.stream().filter(habit -> !habitsWithReminders.contains(habit.getId())).toList();
    if (withoutReminders.isEmpty()) {
      return java.util.Optional.empty();
    }

    LoggingTimePatternResponse pattern = habitAnalyticsService.loggingTimes(userId, zoneId);
    if (pattern.getSuggestedReminderTime() == null) {
      return java.util.Optional.empty();
    }

    String time = pattern.getSuggestedReminderTime().toString();
    return java.util.Optional.of(
        HabitNotificationResponse.builder()
            .id("reminder-suggestion:" + time + ":" + withoutReminders.size())
            .type(NotificationType.REMINDER_SUGGESTION)
            .severity("info")
            .title("Try a reminder at " + time)
            .message(
                "You log most completions around %s. %d active habit%s no reminder set."
                    .formatted(
                        time,
                        withoutReminders.size(),
                        withoutReminders.size() == 1 ? " has" : "s have"))
            .habitId(withoutReminders.getFirst().getId())
            .habitName(withoutReminders.getFirst().getName())
            .build());
  }
}
