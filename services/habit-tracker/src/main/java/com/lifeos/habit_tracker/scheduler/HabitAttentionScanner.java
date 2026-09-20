package com.lifeos.habit_tracker.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.habit_tracker.domains.entity.Habit;
import com.lifeos.habit_tracker.domains.entity.HabitLog;
import com.lifeos.habit_tracker.domains.entity.HabitStreak;
import com.lifeos.habit_tracker.domains.enums.HabitStatus;
import com.lifeos.habit_tracker.repository.HabitLogRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import com.lifeos.habit_tracker.repository.HabitStreakRepository;
import com.lifeos.habit_tracker.service.HabitScheduleService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Daily sweep across every active habit scheduled for today, raising two kinds of
 * notification-pipeline events off the cached {@link HabitStreak} row (never recomputed here -
 * see {@link com.lifeos.habit_tracker.service.StreakService} for the only place that happens).
 *
 * <p>This is distinct from {@link com.lifeos.habit_tracker.service.StreakService#recompute}'s own
 * milestone publish: that one fires on the write path, to the audit trail only
 * ({@code AuditEventType.HABIT_STREAK_MILESTONE}, via {@code HabitEventPublisher}). This scanner
 * fires to the notification pipeline ({@code NotificationEventType}, via {@link
 * NotificationEventPublisher}) so the milestone/at-risk state actually surfaces to the user, not
 * just the audit log.
 *
 * <ul>
 *   <li><b>Streak at risk</b>: the habit has a live streak (current &gt; 0), is scheduled today,
 *       and has no log for today yet. Runs in the morning (see the cron default) so there's still
 *       time in the day to act before the nightly {@link MissedHabitScheduler} would break it.
 *   <li><b>Streak milestone</b>: the cached current streak is exactly 7, 30 or 100. Between two
 *       runs of this once-a-day scan the cached streak only ever moves by +1 (a completion) or
 *       resets to 0 (a miss, via {@link MissedHabitScheduler}), so a habit can only ever be
 *       observed sitting at exactly one of these values for a single day - "fire only when the
 *       value exactly equals a milestone" is therefore enough to avoid re-firing the same
 *       milestone on consecutive days, with no extra "have I already notified for this" state to
 *       track.
 * </ul>
 *
 * <p>Reads are batched per table (habits, streaks, today's logs) rather than issued per habit,
 * since this runs across every user's every active habit once a day.
 */
@Component
@RequiredArgsConstructor
public class HabitAttentionScanner {

  private static final Set<Integer> MILESTONES = Set.of(7, 30, 100);

  private final HabitRepository habitRepository;
  private final HabitStreakRepository habitStreakRepository;
  private final HabitLogRepository habitLogRepository;
  private final HabitScheduleService habitScheduleService;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${habit.attention-scanner.cron:0 0 8 * * *}")
  @Transactional(readOnly = true)
  public void scan() {
    LocalDate today = LocalDate.now();

    List<Habit> scheduledToday =
        habitRepository.findAllByStatus(HabitStatus.ACTIVE).stream()
            .filter(habit -> habitScheduleService.isScheduled(habit, today))
            .toList();

    if (scheduledToday.isEmpty()) {
      return;
    }

    List<UUID> habitIds = scheduledToday.stream().map(Habit::getId).toList();

    Map<UUID, HabitStreak> streaksByHabitId =
        habitStreakRepository.findAllById(habitIds).stream()
            .collect(Collectors.toMap(HabitStreak::getHabitId, streak -> streak));

    Set<UUID> loggedTodayHabitIds =
        habitLogRepository.findAllByHabitIdInAndLogDate(habitIds, today).stream()
            .map(HabitLog::getHabitId)
            .collect(Collectors.toSet());

    for (Habit habit : scheduledToday) {
      HabitStreak streak = streaksByHabitId.get(habit.getId());
      if (streak == null) {
        // Never logged/recomputed yet - nothing to be "at risk" of and no milestone to cross.
        continue;
      }

      int currentStreak = streak.getCurrentStreak();

      if (currentStreak > 0 && !loggedTodayHabitIds.contains(habit.getId())) {
        notificationEventPublisher.publish(
            habit.getUserId(),
            NotificationEventType.HABIT_STREAK_AT_RISK,
            "Don't break your " + currentStreak + "-day streak on " + habit.getName(),
            "You haven't logged it yet today.",
            Map.of(
                "habitId", habit.getId().toString(),
                "currentStreak", String.valueOf(currentStreak)));
      }

      if (MILESTONES.contains(currentStreak)) {
        notificationEventPublisher.publish(
            habit.getUserId(),
            NotificationEventType.HABIT_STREAK_MILESTONE,
            currentStreak + "-day streak on " + habit.getName() + "!",
            "Keep it going.",
            Map.of(
                "habitId", habit.getId().toString(),
                "milestone", String.valueOf(currentStreak)));
      }
    }
  }
}
