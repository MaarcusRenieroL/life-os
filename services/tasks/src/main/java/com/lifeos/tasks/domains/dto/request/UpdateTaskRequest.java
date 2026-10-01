package com.lifeos.tasks.domains.dto.request;

import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.domains.enums.TaskPriority;
import com.lifeos.tasks.domains.enums.TaskStatus;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.HashSet;
import java.util.Set;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Partial update. A key that is missing from the JSON leaves that field alone; a key that is present
// with null clears it (so removing a due date, project or goal in the UI actually removes it).
// title, status and priority cannot be cleared, so null there still means "unchanged".
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateTaskRequest {

  @JsonIgnore
  @Getter(AccessLevel.NONE)
  final Set<String> provided = new HashSet<>();

  String title;

  String description;

  TaskStatus status;

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

  /** True when the request body contained this key at all, even as null. */
  public boolean provided(String field) {
    return provided.contains(field);
  }

  public void setTitle(String title) { this.title = title; provided.add("title"); }
  public void setDescription(String description) { this.description = description; provided.add("description"); }
  public void setStatus(TaskStatus status) { this.status = status; provided.add("status"); }
  public void setPriority(TaskPriority priority) { this.priority = priority; provided.add("priority"); }
  public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; provided.add("dueDate"); }
  public void setDueTime(LocalTime dueTime) { this.dueTime = dueTime; provided.add("dueTime"); }
  public void setAllDay(Boolean allDay) { this.allDay = allDay; provided.add("allDay"); }
  public void setArea(LifeArea area) { this.area = area; provided.add("area"); }
  public void setProjectId(UUID projectId) { this.projectId = projectId; provided.add("projectId"); }
  public void setGoalId(UUID goalId) { this.goalId = goalId; provided.add("goalId"); }
  public void setParentTaskId(UUID parentTaskId) { this.parentTaskId = parentTaskId; provided.add("parentTaskId"); }
  public void setTags(List<String> tags) { this.tags = tags; provided.add("tags"); }
  public void setEstimateMinutes(Integer estimateMinutes) { this.estimateMinutes = estimateMinutes; provided.add("estimateMinutes"); }
  public void setReminderMinutesBefore(List<Integer> reminders) { this.reminderMinutesBefore = reminders; provided.add("reminderMinutesBefore"); }
}
