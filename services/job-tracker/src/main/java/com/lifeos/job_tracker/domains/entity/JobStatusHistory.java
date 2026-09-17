package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.JobStatus;
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

/** One pipeline stage transition for a job - lets analytics compute time spent per stage, which
 * the job_listings row alone can't (it only ever holds the current status). */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "job_status_history", schema = "job_tracker_schema")
public class JobStatusHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "job_id")
  UUID jobId;

  @Column(name = "user_id")
  UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "from_status")
  JobStatus fromStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "to_status")
  JobStatus toStatus;

  @CreationTimestamp
  @Column(name = "changed_at")
  Instant changedAt;
}
