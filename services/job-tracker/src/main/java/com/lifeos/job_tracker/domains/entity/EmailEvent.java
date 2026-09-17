package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.Confidence;
import com.lifeos.job_tracker.domains.enums.EmailEventStatus;
import com.lifeos.job_tracker.domains.enums.EmailEventType;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "email_events", schema = "job_tracker_schema")
public class EmailEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "gmail_message_id")
  String gmailMessageId;

  @Column(name = "from_address")
  String fromAddress;

  String subject;

  String snippet;

  @Enumerated(EnumType.STRING)
  @Column(name = "detected_type")
  EmailEventType detectedType;

  @Enumerated(EnumType.STRING)
  Confidence confidence;

  @Column(name = "matched_job_id")
  UUID matchedJobId;

  @Enumerated(EnumType.STRING)
  @Column(name = "suggested_status")
  JobStatus suggestedStatus;

  @Column(name = "created_jobs_count")
  int createdJobsCount;

  @Enumerated(EnumType.STRING)
  EmailEventStatus status;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
