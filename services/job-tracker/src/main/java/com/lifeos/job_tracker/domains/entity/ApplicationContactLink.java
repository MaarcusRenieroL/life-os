package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Entity;
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
@Table(name = "application_contact_link", schema = "jobs_schema")
public class ApplicationContactLink {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID applicationId;

  UUID contactId;

  Boolean referralMessageSent;

  String referralMessageContent;

  Instant referralMessageSentDate;

  Boolean referralResponseReceived;

  String referralResponseContent;

  Instant referralResponseDate;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
