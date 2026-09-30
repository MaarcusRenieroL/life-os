package com.lifeos.tasks.domains.dto.response;

import com.lifeos.tasks.domains.enums.TaskStatus;
import java.time.LocalDate;
import java.util.UUID;

public record GoalLinkedTaskResponse(UUID id, String title, TaskStatus status, LocalDate dueDate) {}
