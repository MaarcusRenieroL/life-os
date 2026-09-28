package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.TaskPriority;
import com.lifeos.tasks.domains.enums.TaskStatus;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Partial update - every field is optional, service only applies the ones that
// are non-null (same pattern as habit-tracker's UpdateHabitRequest). dueDate/
// dueTime can't be distinguished from "clear this field" this way; use the
// dedicated snooze endpoint to move a due date, and PATCH-like semantics
// aren't otherwise needed for this module's fields.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateTaskRequest {

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
}
