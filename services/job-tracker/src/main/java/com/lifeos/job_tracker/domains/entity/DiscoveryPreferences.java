package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.SeniorityLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
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

/** What the candidate wants to see: keeps a 3,000-opening board down to roles worth scoring. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "discovery_preferences", schema = "job_tracker_schema")
public class DiscoveryPreferences {

  @Id
  @Column(name = "user_id")
  UUID userId;

  /** Title must contain at least one of these (case-insensitive). Empty = no restriction. */
  @Builder.Default
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "title_include_json")
  List<String> titleInclude = new ArrayList<>();

  /** Title containing any of these is dropped before it is ever stored. */
  @Builder.Default
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "title_exclude_json")
  List<String> titleExclude = new ArrayList<>();

  /** Location must contain one of these, or the posting must be remote. Empty = anywhere. */
  @Builder.Default
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "locations_json")
  List<String> locations = new ArrayList<>();

  /** Highest level to apply for. Null = infer from the skill library's years of experience. */
  @Enumerated(EnumType.STRING)
  @Column(name = "max_seniority")
  SeniorityLevel maxSeniority;

  @Column(name = "alert_min_score")
  int alertMinScore;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;

  public static DiscoveryPreferences defaults(UUID userId) {
    return DiscoveryPreferences.builder().userId(userId).alertMinScore(60).build();
  }
}
