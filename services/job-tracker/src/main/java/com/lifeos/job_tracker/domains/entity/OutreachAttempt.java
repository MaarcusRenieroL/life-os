package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.OutreachChannel;
import com.lifeos.job_tracker.domains.enums.OutreachStatus;
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
@Table(name = "outreach_attempts", schema = "job_tracker_schema")
public class OutreachAttempt {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "application_id")
  UUID applicationId;

  @Enumerated(EnumType.STRING)
  OutreachChannel channel;

  String recipient;

  String subject;

  @Column(name = "message_body")
  String messageBody;

  @Enumerated(EnumType.STRING)
  OutreachStatus status;

  @Column(name = "scheduled_for")
  Instant scheduledFor;

  @Column(name = "sent_at")
  Instant sentAt;

  boolean opened;

  boolean clicked;

  boolean replied;

  @Column(name = "response_date")
  Instant responseDate;

  String error;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
