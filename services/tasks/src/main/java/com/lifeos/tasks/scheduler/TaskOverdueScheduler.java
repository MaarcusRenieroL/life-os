package com.lifeos.tasks.scheduler;

import com.lifeos.common.events.NotificationEventPublisher;
import com.lifeos.common.events.NotificationEventType;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.repository.TaskRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Separate from TaskReminderScheduler's due-time reminders: this is a once-daily sweep that fires
 * TASK_OVERDUE exactly once per task the day it first has a dueDate in the past, rather than
 * polling for a specific trigger moment. overdueNotifiedAt (not remindersSent) tracks whether it's
 * already fired, and TaskService clears it whenever the task stops being overdue in a way the user
 * caused (dueDate moves, or a DONE task is reopened) so it can fire again later.
 */
@Component
@RequiredArgsConstructor
public class TaskOverdueScheduler {

  private final TaskRepository taskRepository;
  private final NotificationEventPublisher notificationEventPublisher;

  @Scheduled(cron = "${tasks.overdue.sweep.cron:0 15 0 * * *}")
  @Transactional
  public void sweepOverdueTasks() {
    LocalDate today = LocalDate.now();

    for (Task task :
        taskRepository.findAllByDueDateIsNotNullAndOverdueNotifiedAtIsNullAndStatusNot(TaskStatus.DONE)) {
      if (!task.getDueDate().isBefore(today)) continue;

      Map<String, String> metadata = Map.of("taskId", task.getId().toString());
      notificationEventPublisher.publish(
          task.getUserId(),
          NotificationEventType.TASK_OVERDUE,
          task.getTitle(),
          "Overdue since " + task.getDueDate(),
          metadata);
      task.setOverdueNotifiedAt(Instant.now());
      taskRepository.save(task);
    }
  }
}
