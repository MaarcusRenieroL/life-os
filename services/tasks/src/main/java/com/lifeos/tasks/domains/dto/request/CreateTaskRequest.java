package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.domains.enums.TaskPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateTaskRequest {

  @NotBlank
  @Size(max = 500)
  String title;

  String description;

  TaskPriority priority;

  LocalDate dueDate;

  LocalTime dueTime;

  Boolean allDay;

  LifeArea area;

  UUID projectId;

  UUID goalId;

  UUID parentTaskId;

  List<String> tags;

  Integer estimateMinutes;

  List<Integer> reminderMinutesBefore;
}
