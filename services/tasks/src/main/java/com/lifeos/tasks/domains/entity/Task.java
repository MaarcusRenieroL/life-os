package com.lifeos.tasks.domains.entity;

import com.lifeos.tasks.domains.enums.TaskPriority;
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

  // No FK/relationship - stored references to rows owned by other
  // modules/schemas, same convention as habit_tracker_schema.habits'
  // areaId/goalId. areaId in particular has no backing table anywhere in this
  // codebase yet (life areas are still aspirational) - it's a free UUID today.
  UUID areaId;

  UUID projectId;

  UUID goalId;

  UUID parentTaskId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  List<String> tags;

  Integer estimateMinutes;

  Instant completedAt;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
