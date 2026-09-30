package com.lifeos.calendar.scheduler;

import com.lifeos.calendar.domains.entity.Event;
import com.lifeos.calendar.repository.EventRepository;
import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mirrors services/tasks' TaskReminderScheduler exactly - see its javadoc. The one difference:
 * an event's start is already a precise instant (startAt), not a separate date+time pair to
 * combine, so the trigger-moment math is simpler; only timed events (allDay=false) can have
 * reminders, since an all-day event has no specific moment to count backwards from.
 */
@Component
@RequiredArgsConstructor
public class EventReminderScheduler {

  private static final int POLL_WINDOW_MINUTES = 5;
  private static final ZoneId ZONE = ZoneId.systemDefault();

  private final EventRepository eventRepository;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${calendar.reminder.dispatch.cron:0 */5 * * * *}")
  @Transactional
  public void dispatchDueReminders() {
    LocalDateTime now = LocalDateTime.now();

    for (Event event : eventRepository.findAllByStartAtIsNotNullAndReminderMinutesBeforeIsNotNull()) {
      LocalDateTime startMoment = event.getStartAt().atZone(ZONE).toLocalDateTime();
      List<Integer> alreadySent = event.getRemindersSent() != null ? event.getRemindersSent() : List.of();
      List<Integer> newlySent = new ArrayList<>();

      for (Integer minutesBefore : event.getReminderMinutesBefore()) {
        if (alreadySent.contains(minutesBefore)) continue;

        LocalDateTime triggerMoment = startMoment.minusMinutes(minutesBefore);
        if (!isDue(triggerMoment, now)) continue;

        Map<String, String> metadata = Map.of("eventId", event.getId().toString());
        notificationEventPublisher.publish(
            event.getUserId(),
            NotificationEventType.EVENT_STARTING,
            event.getTitle(),
            reminderBody(minutesBefore),
            metadata);
        newlySent.add(minutesBefore);
      }

      if (!newlySent.isEmpty()) {
        List<Integer> updated = new ArrayList<>(alreadySent);
        updated.addAll(newlySent);
        event.setRemindersSent(updated);
        eventRepository.save(event);
      }
    }
  }

  /** Forward-only, half-open window - same reasoning as TaskReminderScheduler.isDue. */
  private boolean isDue(LocalDateTime triggerMoment, LocalDateTime now) {
    long minutesSinceTrigger = Duration.between(triggerMoment, now).toMinutes();
    return minutesSinceTrigger >= 0 && minutesSinceTrigger < POLL_WINDOW_MINUTES;
  }

  private String reminderBody(int minutesBefore) {
    if (minutesBefore <= 0) return "Starting now";
    if (minutesBefore < 60) return "Starting in " + minutesBefore + " minutes";
    if (minutesBefore < 1440) return "Starting in " + (minutesBefore / 60) + " hour(s)";
    return "Starting in " + (minutesBefore / 1440) + " day(s)";
  }
}
