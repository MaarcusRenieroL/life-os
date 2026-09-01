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
@Table(name = "referrals", schema = "job_tracker_schema")
public class Referral {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "application_id")
  UUID applicationId;

  @Column(name = "contact_id")
  UUID contactId;

  @Column(name = "outreach_date")
  Instant outreachDate;

  @Column(name = "message_sent")
  String messageSent;

  @Column(name = "response_received")
  boolean responseReceived;

  @Column(name = "response_date")
  Instant responseDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "referral_status")
  ReferralStatus referralStatus;

  @Column(name = "follow_up_date")
  Instant followUpDate;

  String notes;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
