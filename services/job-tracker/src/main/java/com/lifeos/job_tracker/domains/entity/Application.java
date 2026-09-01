package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.ApplicationMethod;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
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
@Table(name = "applications", schema = "job_tracker_schema")
public class Application {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "job_listing_id")
  UUID jobListingId;

  @Column(name = "resume_id")
  UUID resumeId;

  /** Persisted as its human-readable value via {@code ApplicationStatusConverter}. */
  ApplicationStatus status;

  @Enumerated(EnumType.STRING)
  @Column(name = "application_method")
  ApplicationMethod applicationMethod;

  @Column(name = "application_date")
  Instant applicationDate;

  @Column(name = "cover_letter_text")
  String coverLetterText;

  @Column(name = "custom_message_text")
  String customMessageText;

  @Column(name = "follow_up_reminder_date")
  Instant followUpReminderDate;

  @Column(name = "rejection_reason")
  String rejectionReason;

  String notes;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
