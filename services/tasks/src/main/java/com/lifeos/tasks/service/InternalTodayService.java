package com.lifeos.tasks.service;

import com.lifeos.common.domains.dto.response.TodayItemResponse;
import com.lifeos.tasks.domains.entity.Task;
import com.lifeos.tasks.domains.enums.TaskStatus;
import com.lifeos.tasks.repository.TaskRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Backs the internal {@code /v1/tasks/internal/today} endpoint that core's cross-module Today
 * aggregation calls once per Today-view page load (see {@link
 * com.lifeos.tasks.controller.InternalTodayController}). Returns the shared {@link
 * TodayItemResponse} shape rather than a module-specific DTO, matching every other module's
 * internal Today endpoint.
 */
@Service
@RequiredArgsConstructor
public class InternalTodayService {

  private final TaskRepository taskRepository;

  @Transactional(readOnly = true)
  public List<TodayItemResponse> today(UUID userId) {
    LocalDate today = LocalDate.now();

    return taskRepository.findAllByUserId(userId).stream()
        .filter(t -> t.getStatus() != TaskStatus.DONE)
        .filter(t -> t.getDueDate() != null && !t.getDueDate().isAfter(today))
        .map(t -> toItem(t, today))
        .toList();
  }

  private TodayItemResponse toItem(Task task, LocalDate today) {
    boolean overdue = task.getDueDate().isBefore(today);
    return TodayItemResponse.builder()
        .module("tasks")
        .type(overdue ? "task_overdue" : "task_due")
        .title(task.getTitle())
        .description(task.getDescription())
        .dueAt(dueInstant(task))
        .entityId(task.getId().toString())
        .priority(overdue ? "urgent" : (task.getPriority().name().equals("URGENT") ? "urgent" : "info"))
        .build();
  }

  private Instant dueInstant(Task task) {
    LocalTime time = task.getDueTime() != null ? task.getDueTime() : LocalTime.MAX;
    return task.getDueDate().atTime(time).atZone(ZoneId.systemDefault()).toInstant();
  }
}
