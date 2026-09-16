package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.ReferralStatus;
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
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** A contact the candidate is asking for a referral from at one job's company. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "referrals", schema = "job_tracker_schema")
public class Referral {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "job_id")
  UUID jobId;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "contact_name")
  String contactName;

  @Column(name = "contact_title")
  String contactTitle;

  @Column(name = "contact_linkedin_url")
  String contactLinkedinUrl;

  @Column(name = "contact_email")
  String contactEmail;

  String relationship;

  @Enumerated(EnumType.STRING)
  @Builder.Default
  ReferralStatus status = ReferralStatus.NOT_CONTACTED;

  @Column(name = "draft_message")
  String draftMessage;

  String notes;

  @Column(name = "contacted_at")
  LocalDate contactedAt;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
