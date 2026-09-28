package com.lifeos.tasks.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.repository.TaskRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mirrors habit-tracker's HabitReminderScheduler. Polls every 5 minutes; for each task with a due
 * date+time and configured reminders, fires any offset in reminderMinutesBefore whose trigger
 * moment (dueDateTime - offset) just passed, then records it in remindersSent so it never fires
 * twice for the same due moment (see Task.java's javadoc - a reschedule clears remindersSent).
 */
@Component
@RequiredArgsConstructor
public class TaskReminderScheduler {

  private static final int POLL_WINDOW_MINUTES = 5;

  private final TaskRepository taskRepository;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${tasks.reminder.dispatch.cron:0 */5 * * * *}")
  @Transactional
  public void dispatchDueReminders() {
    LocalDateTime now = LocalDateTime.now();

    for (Task task : taskRepository.findAllByDueDateIsNotNullAndDueTimeIsNotNullAndReminderMinutesBeforeIsNotNull()) {
      if (task.getStatus() == TaskStatus.DONE) continue;

      LocalDateTime dueMoment = LocalDateTime.of(task.getDueDate(), task.getDueTime());
      List<Integer> alreadySent = task.getRemindersSent() != null ? task.getRemindersSent() : List.of();
      List<Integer> newlySent = new ArrayList<>();

      for (Integer minutesBefore : task.getReminderMinutesBefore()) {
        if (alreadySent.contains(minutesBefore)) continue;

        LocalDateTime triggerMoment = dueMoment.minusMinutes(minutesBefore);
        if (!isDue(triggerMoment, now)) continue;

        Map<String, String> metadata = Map.of("taskId", task.getId().toString());
        notificationEventPublisher.publish(
            task.getUserId(),
            NotificationEventType.TASK_DUE,
            task.getTitle(),
            reminderBody(minutesBefore),
            metadata);
        newlySent.add(minutesBefore);
      }

      if (!newlySent.isEmpty()) {
        List<Integer> updated = new ArrayList<>(alreadySent);
        updated.addAll(newlySent);
        task.setRemindersSent(updated);
        taskRepository.save(task);
      }
    }
  }

  /** Forward-only, half-open window - same reasoning as HabitReminderScheduler.isDue: fires on
   * exactly the one poll tick that just passed the trigger moment, not every tick before or after
   * it (a symmetric window would double-fire whenever it's >= the poll interval, which it is by
   * design here so a missed tick still catches up). */
  private boolean isDue(LocalDateTime triggerMoment, LocalDateTime now) {
    long minutesSinceTrigger = Duration.between(triggerMoment, now).toMinutes();
    return minutesSinceTrigger >= 0 && minutesSinceTrigger < POLL_WINDOW_MINUTES;
  }

  private String reminderBody(int minutesBefore) {
    if (minutesBefore <= 0) return "Due now";
    if (minutesBefore < 60) return "Due in " + minutesBefore + " minutes";
    if (minutesBefore < 1440) return "Due in " + (minutesBefore / 60) + " hour(s)";
    return "Due in " + (minutesBefore / 1440) + " day(s)";
  }
}
