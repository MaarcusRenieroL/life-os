package com.lifeos.tasks.domains.dto.response;

import com.lifeos.tasks.domains.enums.TaskPriority;
import com.lifeos.tasks.domains.enums.TaskStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TaskResponse {

  UUID id;

  String title;

  String description;

  TaskStatus status;

  TaskPriority priority;

  LocalDate dueDate;

  LocalTime dueTime;

  Boolean allDay;

  UUID areaId;

  UUID projectId;

  UUID goalId;

  UUID parentTaskId;

  List<String> tags;

  Integer estimateMinutes;

  Instant completedAt;

  Instant createdAt;

  Instant updatedAt;
}
