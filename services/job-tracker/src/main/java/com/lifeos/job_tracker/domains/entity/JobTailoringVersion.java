package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
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
import org.hibernate.type.SqlTypes;

/** One snapshot of a tailored resume for a job - a new row every time tailorResume runs, so
 * earlier attempts stay browsable instead of being overwritten. */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "job_tailoring_versions", schema = "job_tracker_schema")
public class JobTailoringVersion {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "job_id")
  UUID jobId;

  @Column(name = "user_id")
  UUID userId;

  int version;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "improvement_points_json")
  List<String> improvementPoints;

  @Column(name = "latex_resume")
  String latexResume;

  @Column(name = "fit_score")
  Integer fitScore;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
