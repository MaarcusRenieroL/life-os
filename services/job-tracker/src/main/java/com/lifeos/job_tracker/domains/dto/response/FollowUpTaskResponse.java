package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.FollowUpTask;
import java.time.Instant;
import java.util.UUID;

public record FollowUpTaskResponse(
    UUID id,
    UUID applicationId,
    String type,
    String title,
    Instant dueDate,
    String status,
    String priority,
    String notes,
    Instant completedAt,
    Instant createdAt) {

  public static FollowUpTaskResponse from(FollowUpTask task) {
    return new FollowUpTaskResponse(
        task.getId(),
        task.getApplicationId(),
        task.getType() == null ? null : task.getType().name(),
        task.getTitle(),
        task.getDueDate(),
        task.getStatus() == null ? null : task.getStatus().name(),
        task.getPriority() == null ? null : task.getPriority().name(),
        task.getNotes(),
        task.getCompletedAt(),
        task.getCreatedAt());
  }
}
