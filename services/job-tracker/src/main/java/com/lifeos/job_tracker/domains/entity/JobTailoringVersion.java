package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.TailoringBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "gaps_vs_jd_json")
  List<String> gapsVsJd;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "inferred_claims_json")
  List<String> inferredClaims;

  @Column(name = "latex_resume")
  String latexResume;

  @Column(name = "fit_score")
  Integer fitScore;

  @Enumerated(EnumType.STRING)
  @Column(name = "based_on")
  TailoringBase basedOn;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
