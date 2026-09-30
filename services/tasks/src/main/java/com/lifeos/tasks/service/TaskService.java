package com.lifeos.tasks.service;

import com.lifeos.tasks.domains.dto.request.BulkUpdateTaskRequest;
import com.lifeos.tasks.domains.dto.request.CreateTaskRequest;
import com.lifeos.tasks.domains.dto.request.SnoozeTaskRequest;
import com.lifeos.tasks.domains.dto.request.UpdateTaskRequest;
import com.lifeos.tasks.domains.dto.response.TaskResponse;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.domains.enums.TaskPriority;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.domains.enums.TaskView;
import com.lifeos.tasks.exception.ResourceNotFoundException;
import com.lifeos.tasks.repository.TaskRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class TaskService {

  // Priority sort order for Today/Upcoming/list default sort: Urgent first,
  // matching the feature's 1-4 scale (Urgent, High, Medium, Low).
  private static final List<TaskPriority> PRIORITY_ORDER =
      List.of(TaskPriority.URGENT, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW);

  private final TaskRepository taskRepository;

  @Transactional(readOnly = true)
  public List<TaskResponse> list(
      UUID userId,
      TaskView view,
      TaskStatus status,
      TaskPriority priority,
      LifeArea area,
      UUID projectId,
      UUID goalId,
      String tag,
      String q,
      Integer upcomingDays,
      LocalDate dueFrom,
      LocalDate dueTo) {
    LocalDate today = LocalDate.now();
    TaskView effectiveView = view == null ? TaskView.PLAIN : view;

    List<Task> tasks =
        taskRepository.findAllByUserId(userId).stream()
            .filter(t -> matchesView(t, effectiveView, today, upcomingDays == null ? 7 : upcomingDays))
            .filter(t -> matchesDueRange(t, dueFrom, dueTo))
            .filter(t -> status == null || t.getStatus() == status)
            .filter(t -> priority == null || t.getPriority() == priority)
            .filter(t -> area == null || area == t.getArea())
            .filter(t -> projectId == null || projectId.equals(t.getProjectId()))
            .filter(t -> goalId == null || goalId.equals(t.getGoalId()))
            .filter(t -> tag == null || (t.getTags() != null && t.getTags().contains(tag)))
            .filter(t -> matchesSearch(t, q))
            .sorted(defaultComparator(effectiveView))
            .toList();

    return tasks.stream().map(this::toResponse).toList();
  }

  /** Used by the calendar module to pull tasks with a due date into its own date-range views -
   * independent of `view`, since Calendar wants every task due in a range regardless of whether
   * it's also Today/Upcoming/Overdue from the tasks module's own perspective. */
  private boolean matchesDueRange(Task task, LocalDate dueFrom, LocalDate dueTo) {
    if (dueFrom == null && dueTo == null) return true;
    if (task.getDueDate() == null) return false;
    if (dueFrom != null && task.getDueDate().isBefore(dueFrom)) return false;
    if (dueTo != null && task.getDueDate().isAfter(dueTo)) return false;
    return true;
  }

  private boolean matchesView(Task task, TaskView view, LocalDate today, int upcomingDays) {
    boolean done = task.getStatus() == TaskStatus.DONE;
    return switch (view) {
      case TODAY -> !done && today.equals(task.getDueDate());
      case UPCOMING ->
          !done
              && task.getDueDate() != null
              && task.getDueDate().isAfter(today)
              && !task.getDueDate().isAfter(today.plusDays(upcomingDays));
      case OVERDUE -> !done && task.getDueDate() != null && task.getDueDate().isBefore(today);
      case INBOX ->
          !done && task.getArea() == null && task.getProjectId() == null && task.getGoalId() == null;
      case COMPLETED -> done;
      case PLAIN -> true;
    };
  }

  private boolean matchesSearch(Task task, String q) {
    if (q == null || q.isBlank()) return true;
    String query = q.toLowerCase();
    boolean inTitle = task.getTitle() != null && task.getTitle().toLowerCase().contains(query);
    boolean inDescription =
        task.getDescription() != null && task.getDescription().toLowerCase().contains(query);
    boolean inTags = task.getTags() != null && task.getTags().stream().anyMatch(t -> t.toLowerCase().contains(query));
    return inTitle || inDescription || inTags;
  }

  private Comparator<Task> defaultComparator(TaskView view) {
    if (view == TaskView.COMPLETED) {
      return Comparator.comparing(Task::getCompletedAt, Comparator.nullsLast(Comparator.reverseOrder()));
    }
    return Comparator
        .comparing((Task t) -> t.getDueDate() == null ? LocalDate.MAX : t.getDueDate())
        .thenComparing(t -> PRIORITY_ORDER.indexOf(t.getPriority()));
  }

  @Transactional(readOnly = true)
  public TaskResponse get(UUID userId, UUID id) {
    return toResponse(findOwned(userId, id));
  }

  @Transactional(readOnly = true)
  public Task findOwned(UUID userId, UUID id) {
    return taskRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> ResourceNotFoundException.of("Task", id));
  }

  public TaskResponse create(UUID userId, CreateTaskRequest request) {
    Task task =
        Task.builder()
            .userId(userId)
            .title(request.getTitle())
            .description(request.getDescription())
            .status(TaskStatus.TODO)
            .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
            .dueDate(request.getDueDate())
            .dueTime(request.getDueTime())
            .allDay(request.getAllDay() != null ? request.getAllDay() : request.getDueTime() == null)
            .area(request.getArea())
            .projectId(request.getProjectId())
            .goalId(request.getGoalId())
            .parentTaskId(request.getParentTaskId())
            .tags(request.getTags())
            .estimateMinutes(request.getEstimateMinutes())
            .reminderMinutesBefore(request.getReminderMinutesBefore())
            .build();

    return toResponse(taskRepository.save(task));
  }

  public TaskResponse update(UUID userId, UUID id, UpdateTaskRequest request) {
    Task task = findOwned(userId, id);
    applyUpdate(task, request);
    return toResponse(taskRepository.save(task));
  }

  private void applyUpdate(Task task, UpdateTaskRequest request) {
    if (request.getTitle() != null) task.setTitle(request.getTitle());
    if (request.getDescription() != null) task.setDescription(request.getDescription());
    if (request.getPriority() != null) task.setPriority(request.getPriority());
    // A reschedule should let reminders fire again against the new time - see Task.java's
    // remindersSent javadoc - so clear it whenever either half of the due moment actually moves.
    boolean dueMoved =
        (request.getDueDate() != null && !request.getDueDate().equals(task.getDueDate()))
            || (request.getDueTime() != null && !request.getDueTime().equals(task.getDueTime()));
    if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
    if (request.getDueTime() != null) task.setDueTime(request.getDueTime());
    if (dueMoved) task.setRemindersSent(null);
    if (request.getAllDay() != null) task.setAllDay(request.getAllDay());
    if (request.getArea() != null) task.setArea(request.getArea());
    if (request.getProjectId() != null) task.setProjectId(request.getProjectId());
    if (request.getGoalId() != null) task.setGoalId(request.getGoalId());
    if (request.getParentTaskId() != null) task.setParentTaskId(request.getParentTaskId());
    if (request.getTags() != null) task.setTags(request.getTags());
    if (request.getEstimateMinutes() != null) task.setEstimateMinutes(request.getEstimateMinutes());
    if (request.getReminderMinutesBefore() != null) {
      task.setReminderMinutesBefore(request.getReminderMinutesBefore());
      task.setRemindersSent(null);
    }
    if (request.getStatus() != null) {
      task.setStatus(request.getStatus());
      task.setCompletedAt(request.getStatus() == TaskStatus.DONE ? Instant.now() : null);
    }
  }

  /** Hard delete: removes the task and, via ON DELETE CASCADE, its subtasks. */
  public void delete(UUID userId, UUID id) {
    Task task = findOwned(userId, id);
    taskRepository.delete(task);
  }

  public TaskResponse complete(UUID userId, UUID id) {
    Task task = findOwned(userId, id);
    task.setStatus(TaskStatus.DONE);
    task.setCompletedAt(Instant.now());
    return toResponse(taskRepository.save(task));
  }

  public TaskResponse reopen(UUID userId, UUID id) {
    Task task = findOwned(userId, id);
    task.setStatus(TaskStatus.TODO);
    task.setCompletedAt(null);
    return toResponse(taskRepository.save(task));
  }

  public TaskResponse snooze(UUID userId, UUID id, SnoozeTaskRequest request) {
    Task task = findOwned(userId, id);
    task.setDueDate(request.getNewDueDate());
    task.setRemindersSent(null);
    return toResponse(taskRepository.save(task));
  }

  public TaskResponse duplicate(UUID userId, UUID id) {
    Task original = findOwned(userId, id);
    Task copy =
        Task.builder()
            .userId(userId)
            .title(original.getTitle() + " (copy)")
            .description(original.getDescription())
            .status(TaskStatus.TODO)
            .priority(original.getPriority())
            .dueDate(original.getDueDate())
            .dueTime(original.getDueTime())
            .allDay(original.getAllDay())
            .area(original.getArea())
            .projectId(original.getProjectId())
            .goalId(original.getGoalId())
            .tags(original.getTags())
            .estimateMinutes(original.getEstimateMinutes())
            .reminderMinutesBefore(original.getReminderMinutesBefore())
            .build();
    return toResponse(taskRepository.save(copy));
  }

  /** Applies the same partial-update patch to every owned id in the request; ids the caller
   * doesn't own are skipped rather than failing the whole batch (see BulkUpdateTaskRequest). */
  public List<TaskResponse> bulkUpdate(UUID userId, BulkUpdateTaskRequest request) {
    return request.getIds().stream()
        .flatMap(id -> taskRepository.findByIdAndUserId(id, userId).stream())
        .map(
            task -> {
              applyUpdate(task, request.getPatch());
              return toResponse(taskRepository.save(task));
            })
        .toList();
  }

  @Transactional(readOnly = true)
  public List<TaskResponse> subtasks(UUID userId, UUID parentId) {
    findOwned(userId, parentId);
    return taskRepository.findAllByParentTaskId(parentId).stream()
        .filter(t -> t.getUserId().equals(userId))
        .map(this::toResponse)
        .toList();
  }

  TaskResponse toResponse(Task task) {
    return TaskResponse.builder()
        .id(task.getId())
        .title(task.getTitle())
        .description(task.getDescription())
        .status(task.getStatus())
        .priority(task.getPriority())
        .dueDate(task.getDueDate())
        .dueTime(task.getDueTime())
        .allDay(task.getAllDay())
        .area(task.getArea())
        .projectId(task.getProjectId())
        .goalId(task.getGoalId())
        .parentTaskId(task.getParentTaskId())
        .tags(task.getTags())
        .estimateMinutes(task.getEstimateMinutes())
        .completedAt(task.getCompletedAt())
        .recurrencePattern(task.getRecurrencePattern())
        .recurrenceConfig(task.getRecurrenceConfig())
        .recurrenceEndDate(task.getRecurrenceEndDate())
        .recurrencePaused(task.getRecurrencePaused())
        .recurrenceSkippedDates(task.getRecurrenceSkippedDates())
        .recurringParentId(task.getRecurringParentId())
        .reminderMinutesBefore(task.getReminderMinutesBefore())
        .remindersSent(task.getRemindersSent())
        .createdAt(task.getCreatedAt())
        .updatedAt(task.getUpdatedAt())
        .build();
  }
}
