package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.JobBoard;
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

/** A company whose public career board is scanned for new openings. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "watched_companies", schema = "job_tracker_schema")
public class WatchedCompany {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  String name;

  @Enumerated(EnumType.STRING)
  JobBoard board;

  /** Board-specific address, e.g. {@code figma} (Greenhouse) or {@code adobe/wd5/external} (Workday). */
  String slug;

  String domain;

  boolean alert;

  boolean active;

  @Column(name = "baselined_at")
  Instant baselinedAt;

  @Column(name = "last_fetched_at")
  Instant lastFetchedAt;

  @Column(name = "last_fetch_error")
  String lastFetchError;

  @Column(name = "last_open_count")
  Integer lastOpenCount;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
