package com.lifeos.habit_tracker.scheduler;

import com.lifeos.common.events.AuditEventType;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.habit_tracker.domains.entity.HabitReminder;
import com.lifeos.habit_tracker.publisher.HabitEventPublisher;
import com.lifeos.habit_tracker.repository.HabitReminderRepository;
import com.lifeos.habit_tracker.repository.HabitRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Polls enabled reminders and publishes a {@code HABIT_REMINDER_DUE} event for any whose time (±
 * the poll window) and configured days-of-week match "now". Runs every 5 minutes by default - fine
 * grained enough for a reminder without polling every minute.
 *
 * <p>Publishes to both the audit trail (activity-events, via HabitEventPublisher - a durable
 * record that this reminder fired) and the notification pipeline (notification-events, via
 * NotificationEventPublisher - what actually surfaces in the bell/Today view). These were
 * previously the same publish call, which is why this used to be a dead end: activity-events has
 * no delivery consumer, it's an audit log. Notification delivery now exists (core consumes
 * notification-events into the notifications table), so this is the fix for the TODO that used
 * to live here.
 */
@Component
@RequiredArgsConstructor
public class HabitReminderScheduler {

  private static final int POLL_WINDOW_MINUTES = 5;

  private final HabitReminderRepository habitReminderRepository;
  private final HabitRepository habitRepository;
  private final HabitEventPublisher habitEventPublisher;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${habit.reminder.dispatch.cron:0 */5 * * * *}")
  @Transactional(readOnly = true)
  public void dispatchDueReminders() {
    LocalDateTime now = LocalDateTime.now();
    LocalTime nowTime = now.toLocalTime();
    int isoDayOfWeek = now.getDayOfWeek().getValue();

    List<HabitReminder> reminders = habitReminderRepository.findAllByEnabledTrue();
    for (HabitReminder reminder : reminders) {
      if (!isDue(reminder, nowTime, isoDayOfWeek)) {
        continue;
      }

      habitRepository
          .findById(reminder.getHabitId())
          .ifPresent(
              habit -> {
                Map<String, String> metadata =
                    Map.of(
                        "habitId", habit.getId().toString(),
                        "reminderId", reminder.getId().toString());

                habitEventPublisher.publish(
                    habit.getUserId(), AuditEventType.HABIT_REMINDER_DUE, "Habit reminder due", metadata);

                notificationEventPublisher.publish(
                    habit.getUserId(),
                    NotificationEventType.HABIT_REMINDER_DUE,
                    "Time for " + habit.getName(),
                    habit.getWhy(),
                    metadata);
              });
    }
  }

  private boolean isDue(HabitReminder reminder, LocalTime nowTime, int isoDayOfWeek) {
    List<Integer> days = reminder.getDaysOfWeek();
    if (days != null && !days.isEmpty() && !days.contains(isoDayOfWeek)) {
      return false;
    }

    // Forward-only, half-open window: fires on exactly the one cron tick that just passed the
    // reminder's time, not the ticks before or after it. A symmetric +/- window here would double-
    // or triple-fire the same reminder across consecutive ticks whenever the window is >= the cron
    // interval (both default to 5 minutes).
    long minutesSinceReminder = Duration.between(reminder.getReminderTime(), nowTime).toMinutes();
    return minutesSinceReminder >= 0 && minutesSinceReminder < POLL_WINDOW_MINUTES;
  }
}
