package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.SetRecurrenceRequest;
import com.lifeos.tasks.domains.dto.response.TaskResponse;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.TaskRecurrencePattern;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.exception.InvalidRequestException;
import com.lifeos.tasks.repository.TaskRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Owns everything about a task being recurring. A "definition" is an ordinary row in
 * tasks_schema.tasks - recurrencePattern set, recurringParentId null, its own dueDate is the
 * first occurrence. Generated occurrences are additional rows with recurringParentId pointing
 * back at the definition and recurrencePattern null (an occurrence doesn't itself recur).
 *
 * <p>The horizon is deliberately short (30 days) and regenerated daily (see
 * TaskRecurrenceScheduler) rather than materializing every occurrence up front, so an infinite
 * (no recurrenceEndDate) recurring task doesn't need special-casing anywhere - it just always has
 * "the next 30 days" of occurrences on disk.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TaskRecurrenceService {

  private static final int GENERATION_HORIZON_DAYS = 30;

  private final TaskRepository taskRepository;
  private final TaskService taskService;

  public TaskResponse setRecurrence(UUID userId, UUID taskId, SetRecurrenceRequest request) {
    Task task = taskService.findOwned(userId, taskId);
    if (task.getRecurringParentId() != null) {
      throw new InvalidRequestException("Cannot make a generated occurrence itself recurring.");
    }
    if (task.getDueDate() == null) {
      throw new InvalidRequestException("Set a due date before making this task recurring.");
    }
    validateConfig(request.getPattern(), request.getConfig());

    task.setRecurrencePattern(request.getPattern());
    task.setRecurrenceConfig(request.getConfig());
    task.setRecurrenceEndDate(request.getEndDate());
    task.setRecurrencePaused(false);
    task.setRecurrenceSkippedDates(null);
    Task saved = taskRepository.save(task);

    // Clear out anything from a previous pattern before regenerating under the new one.
    deleteFutureOccurrences(saved.getId());
    generateOccurrences(saved);

    return taskService.toResponse(saved);
  }

  public void stopRecurrence(UUID userId, UUID taskId) {
    Task task = taskService.findOwned(userId, taskId);
    requireIsDefinition(task);
    task.setRecurrencePattern(null);
    task.setRecurrenceConfig(null);
    task.setRecurrenceEndDate(null);
    task.setRecurrenceSkippedDates(null);
    taskRepository.save(task);
    deleteFutureOccurrences(task.getId());
  }

  public TaskResponse pause(UUID userId, UUID taskId) {
    Task task = taskService.findOwned(userId, taskId);
    requireIsDefinition(task);
    task.setRecurrencePaused(true);
    return taskService.toResponse(taskRepository.save(task));
  }

  public TaskResponse resume(UUID userId, UUID taskId) {
    Task task = taskService.findOwned(userId, taskId);
    requireIsDefinition(task);
    task.setRecurrencePaused(false);
    Task saved = taskRepository.save(task);
    generateOccurrences(saved);
    return taskService.toResponse(saved);
  }

  /** Skips one occurrence date: deletes the generated row for that date (if it exists yet) and
   * records the date so the next generator run doesn't recreate it. */
  public void skipOccurrence(UUID userId, UUID taskId, LocalDate dueDate) {
    Task task = taskService.findOwned(userId, taskId);
    requireIsDefinition(task);

    List<LocalDate> skipped = new ArrayList<>(
        task.getRecurrenceSkippedDates() != null ? task.getRecurrenceSkippedDates() : List.of());
    if (!skipped.contains(dueDate)) {
      skipped.add(dueDate);
    }
    task.setRecurrenceSkippedDates(skipped);
    taskRepository.save(task);

    taskRepository.findAllByRecurringParentId(task.getId()).stream()
        .filter(occurrence -> dueDate.equals(occurrence.getDueDate()) && occurrence.getStatus() != TaskStatus.DONE)
        .forEach(taskRepository::delete);
  }

  @Transactional(readOnly = true)
  public List<TaskResponse> occurrences(UUID userId, UUID taskId) {
    Task task = taskService.findOwned(userId, taskId);
    requireIsDefinition(task);
    return taskRepository.findAllByRecurringParentId(task.getId()).stream()
        .filter(t -> t.getUserId().equals(userId))
        .sorted((a, b) -> {
          if (a.getDueDate() == null) return 1;
          if (b.getDueDate() == null) return -1;
          return a.getDueDate().compareTo(b.getDueDate());
        })
        .map(taskService::toResponse)
        .toList();
  }

  /** Generates any missing occurrences for every active (not paused, not ended) recurring
   * definition, out to the horizon - called both right after setRecurrence/resume and by the
   * nightly scheduler. Idempotent: an occurrence already on disk for a given date is never
   * duplicated. */
  public void generateOccurrencesForAllDefinitions() {
    LocalDate horizon = LocalDate.now().plusDays(GENERATION_HORIZON_DAYS);
    for (Task definition : taskRepository.findAllByRecurrencePatternIsNotNullAndRecurringParentIdIsNull()) {
      if (Boolean.TRUE.equals(definition.getRecurrencePaused())) continue;
      generateOccurrences(definition, horizon);
    }
  }

  private void generateOccurrences(Task definition) {
    generateOccurrences(definition, LocalDate.now().plusDays(GENERATION_HORIZON_DAYS));
  }

  private void generateOccurrences(Task definition, LocalDate horizon) {
    LocalDate cursor = definition.getDueDate().plusDays(1);
    LocalDate endDate = definition.getRecurrenceEndDate();
    LocalDate effectiveHorizon = endDate != null && endDate.isBefore(horizon) ? endDate : horizon;
    if (cursor.isAfter(effectiveHorizon)) return;

    Set<LocalDate> existing =
        taskRepository.findAllByRecurringParentId(definition.getId()).stream()
            .map(Task::getDueDate)
            .collect(java.util.stream.Collectors.toSet());
    Set<LocalDate> skipped =
        definition.getRecurrenceSkippedDates() != null
            ? Set.copyOf(definition.getRecurrenceSkippedDates())
            : Set.of();

    List<Task> toCreate = new ArrayList<>();
    while (!cursor.isAfter(effectiveHorizon)) {
      if (matchesPattern(definition, cursor) && !existing.contains(cursor) && !skipped.contains(cursor)) {
        toCreate.add(occurrenceFrom(definition, cursor));
      }
      cursor = cursor.plusDays(1);
    }
    if (!toCreate.isEmpty()) {
      taskRepository.saveAll(toCreate);
    }
  }

  private boolean matchesPattern(Task definition, LocalDate date) {
    Map<String, Object> config = definition.getRecurrenceConfig();
    return switch (definition.getRecurrencePattern()) {
      case DAILY -> true;
      case WEEKLY -> {
        List<?> rawDays = config != null ? (List<?>) config.get("daysOfWeek") : null;
        if (rawDays == null || rawDays.isEmpty()) yield date.getDayOfWeek().getValue() == definition.getDueDate().getDayOfWeek().getValue();
        yield rawDays.stream().anyMatch(d -> ((Number) d).intValue() == date.getDayOfWeek().getValue());
      }
      case MONTHLY -> {
        Integer dayOfMonth = config != null && config.get("dayOfMonth") != null
            ? ((Number) config.get("dayOfMonth")).intValue()
            : definition.getDueDate().getDayOfMonth();
        int clamped = Math.min(dayOfMonth, date.lengthOfMonth());
        yield date.getDayOfMonth() == clamped;
      }
      case CUSTOM -> {
        int intervalDays = config != null && config.get("intervalDays") != null
            ? ((Number) config.get("intervalDays")).intValue()
            : 1;
        if (intervalDays < 1) yield false;
        long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(definition.getDueDate(), date);
        yield daysBetween % intervalDays == 0;
      }
    };
  }

  private Task occurrenceFrom(Task definition, LocalDate dueDate) {
    return Task.builder()
        .userId(definition.getUserId())
        .title(definition.getTitle())
        .description(definition.getDescription())
        .status(TaskStatus.TODO)
        .priority(definition.getPriority())
        .dueDate(dueDate)
        .dueTime(definition.getDueTime())
        .allDay(definition.getAllDay())
        .area(definition.getArea())
        .projectId(definition.getProjectId())
        .goalId(definition.getGoalId())
        .tags(definition.getTags())
        .estimateMinutes(definition.getEstimateMinutes())
        .recurringParentId(definition.getId())
        .build();
  }

  private void deleteFutureOccurrences(UUID definitionId) {
    LocalDate today = LocalDate.now();
    List<Task> future =
        taskRepository.findAllByRecurringParentId(definitionId).stream()
            .filter(t -> t.getStatus() != TaskStatus.DONE)
            .filter(t -> t.getDueDate() == null || !t.getDueDate().isBefore(today))
            .toList();
    taskRepository.deleteAll(future);
  }

  private void requireIsDefinition(Task task) {
    if (task.getRecurrencePattern() == null || task.getRecurringParentId() != null) {
      throw new InvalidRequestException("This task isn't a recurring definition.");
    }
  }

  private void validateConfig(TaskRecurrencePattern pattern, Map<String, Object> config) {
    if (pattern == TaskRecurrencePattern.CUSTOM
        && (config == null || !(config.get("intervalDays") instanceof Number))) {
      throw new InvalidRequestException("CUSTOM recurrence needs a numeric intervalDays in config.");
    }
  }
}
