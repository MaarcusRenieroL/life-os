package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public record CreateFollowUpTaskRequest(
    @NotBlank String title,
    @NotNull Instant dueDate,
    UUID applicationId,
    TaskPriority priority,
    String notes) {}
