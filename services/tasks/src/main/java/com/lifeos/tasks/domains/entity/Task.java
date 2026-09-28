package com.lifeos.tasks.domains.entity;

import com.lifeos.tasks.domains.enums.LifeArea;
import com.lifeos.tasks.domains.enums.TaskPriority;
import com.lifeos.tasks.domains.enums.TaskRecurrencePattern;
import com.lifeos.tasks.domains.enums.TaskStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "tasks", schema = "tasks_schema")
public class Task {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID userId;

  String title;

  String description;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  TaskStatus status = TaskStatus.TODO;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  TaskPriority priority = TaskPriority.MEDIUM;

  LocalDate dueDate;

  LocalTime dueTime;

  @Builder.Default Boolean allDay = true;

  // A closed enum (Career/Health/Finance/Learning/Relationships/Personal) - see LifeArea's
  // javadoc. Unlike projectId/goalId below, this isn't a lookup-table reference.
  @Enumerated(EnumType.STRING)
  LifeArea area;

  // References tasks_schema.projects/goals - real FKs now that both tables live in this same
  // schema (see Project/Goal's javadocs), unlike calendar's own projectId/goalId, which stay bare
  // cross-service UUIDs since calendar has no local copy of these tables.
  UUID projectId;

  UUID goalId;

  UUID parentTaskId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  List<String> tags;

  Integer estimateMinutes;

  Instant completedAt;

  // A task is "the recurring definition" iff recurrencePattern != null and recurringParentId ==
  // null - its own dueDate is the first occurrence. Deliberately a distinct field from
  // parentTaskId (subtasks) even though both are "a UUID pointing at another Task" - a generated
  // occurrence isn't a subtask and shouldn't show up nested under the definition in the subtasks
  // UI (see subtask-rows.tsx on the frontend, which only ever queries by parentTaskId).
  @Enumerated(EnumType.STRING)
  TaskRecurrencePattern recurrencePattern;

  // Shape depends on recurrencePattern, same convention as habit_tracker_schema.habits'
  // frequency_config:
  //  - WEEKLY: {"daysOfWeek": [1,3,5]}  (ISO day-of-week, 1=Monday..7=Sunday)
  //  - MONTHLY: {"dayOfMonth": 15}
  //  - CUSTOM: {"intervalDays": 3}
  //  - DAILY: unused, may be null
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  Map<String, Object> recurrenceConfig;

  LocalDate recurrenceEndDate;

  @Builder.Default Boolean recurrencePaused = false;

  // Dates the user explicitly skipped (see TaskRecurrenceService#skipOccurrence) - checked by the
  // generator so a skipped date doesn't silently reappear on the next run.
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  List<LocalDate> recurrenceSkippedDates;

  // Set only on a generated occurrence, pointing back at the recurring definition task. Null on
  // both one-off tasks and on the definition task itself.
  UUID recurringParentId;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
