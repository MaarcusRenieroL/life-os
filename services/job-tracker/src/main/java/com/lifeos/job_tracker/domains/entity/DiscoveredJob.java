package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.DiscoveredJobStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
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

/** An opening found on a watched company's board. Lives in the inbox until promoted or dismissed. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "discovered_jobs", schema = "job_tracker_schema")
public class DiscoveredJob {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "watched_company_id")
  UUID watchedCompanyId;

  @Column(name = "external_id")
  String externalId;

  String company;

  String title;

  String url;

  String location;

  String description;

  @Column(name = "posted_at")
  Instant postedAt;

  @Column(name = "first_seen_at")
  Instant firstSeenAt;

  @Column(name = "last_seen_at")
  Instant lastSeenAt;

  @Column(name = "closed_at")
  Instant closedAt;

  @Column(name = "fit_score")
  Integer fitScore;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "fit_explanation_json")
  Map<String, Object> fitExplanation;

  @Enumerated(EnumType.STRING)
  DiscoveredJobStatus status;

  @Column(name = "promoted_job_id")
  UUID promotedJobId;

  boolean alerted;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
