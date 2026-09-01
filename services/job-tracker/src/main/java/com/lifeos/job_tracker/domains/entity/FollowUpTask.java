package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.FollowUpTaskStatus;
import com.lifeos.job_tracker.domains.enums.FollowUpTaskType;
import com.lifeos.job_tracker.domains.enums.TaskPriority;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "follow_up_tasks", schema = "job_tracker_schema")
public class FollowUpTask {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "application_id")
  UUID applicationId;

  @Enumerated(EnumType.STRING)
  FollowUpTaskType type;

  String title;

  @Column(name = "due_date")
  Instant dueDate;

  @Enumerated(EnumType.STRING)
  FollowUpTaskStatus status;

  @Enumerated(EnumType.STRING)
  TaskPriority priority;

  String notes;

  boolean notified;

  @Column(name = "completed_at")
  Instant completedAt;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
