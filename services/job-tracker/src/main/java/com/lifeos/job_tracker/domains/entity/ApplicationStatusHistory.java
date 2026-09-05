package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.StatusChangeActor;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "application_status_history", schema = "job_tracker_schema")
public class ApplicationStatusHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "application_id")
  UUID applicationId;

  @Column(name = "old_status")
  String oldStatus;

  @Column(name = "new_status")
  String newStatus;

  String note;

  @CreationTimestamp
  @Column(name = "changed_at")
  Instant changedAt;

  @Enumerated(EnumType.STRING)
  @Column(name = "changed_by")
  StatusChangeActor changedBy;
}
