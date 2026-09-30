package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.entity.TimeEntry;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.domains.enums.TimeEntryType;
import com.lifeos.tasks.repository.GoalMilestoneRepository;
import com.lifeos.tasks.repository.TaskRepository;
import com.lifeos.tasks.repository.TimeEntryRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Per-day task numbers for core's analytics: how many tasks were finished, how many were due,
 * and how much focus time (completed WORK sessions) was logged. Recurring-task definitions are
 * templates and are left out, like in goal progress. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TaskStatsService {

  public record Day(LocalDate date, int completed, int due, int focusMinutes) {}

  public record TaskStats(List<Day> days, int overdueOpen, int openTotal, int milestonesCompleted) {}

  private final TaskRepository taskRepository;
  private final TimeEntryRepository timeEntryRepository;
  private final GoalMilestoneRepository milestoneRepository;

  public TaskStats stats(UUID userId, LocalDate from, LocalDate to, ZoneId zone) {
    Map<LocalDate, int[]> byDay = new TreeMap<>();
    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) byDay.put(d, new int[3]);

    LocalDate today = LocalDate.now(zone);
    int overdue = 0;
    int open = 0;
    for (Task task : taskRepository.findAllByUserId(userId)) {
      if (task.getRecurrencePattern() != null && task.getRecurringParentId() == null) continue;
      boolean done = task.getStatus() == TaskStatus.DONE;
      if (!done) {
        open++;
        if (task.getDueDate() != null && task.getDueDate().isBefore(today)) overdue++;
      }
      if (done && task.getCompletedAt() != null) {
        int[] slot = byDay.get(task.getCompletedAt().atZone(zone).toLocalDate());
        if (slot != null) slot[0]++;
      }
      if (task.getDueDate() != null) {
        int[] slot = byDay.get(task.getDueDate());
        if (slot != null) slot[1]++;
      }
    }

    for (TimeEntry entry : timeEntryRepository.findAllByUserId(userId)) {
      if (entry.getType() != TimeEntryType.WORK || entry.getDurationMinutes() == null || entry.getStartedAt() == null) continue;
      int[] slot = byDay.get(entry.getStartedAt().atZone(zone).toLocalDate());
      if (slot != null) slot[2] += entry.getDurationMinutes();
    }

    int milestones =
        (int)
            milestoneRepository.findAllByUserId(userId).stream()
                .filter(m -> m.getCompletedAt() != null)
                .map(m -> m.getCompletedAt().atZone(zone).toLocalDate())
                .filter(d -> !d.isBefore(from) && !d.isAfter(to))
                .count();

    List<Day> days = new ArrayList<>();
    byDay.forEach((date, v) -> days.add(new Day(date, v[0], v[1], v[2])));
    return new TaskStats(days, overdue, open, milestones);
  }
}
