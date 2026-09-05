package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "resume_keyword_matches", schema = "job_tracker_schema")
public class ResumeKeywordMatch {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "resume_variant_id")
  UUID resumeVariantId;

  @Column(name = "job_listing_id")
  UUID jobListingId;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "matched_keywords")
  List<String> matchedKeywords;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "missing_keywords")
  List<String> missingKeywords;

  @Column(name = "keyword_density")
  BigDecimal keywordDensity;

  Integer score;

  @CreationTimestamp
  @Column(name = "analyzed_at")
  Instant analyzedAt;
}
