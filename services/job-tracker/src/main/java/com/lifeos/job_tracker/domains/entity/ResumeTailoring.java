package com.lifeos.job_tracker.domains.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
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
import org.hibernate.type.SqlTypes;

/**
 * One AI tailoring run against a job listing. Every run is kept (not overwritten) so the same job
 * with a different instruction produces a separate record.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "resume_tailorings", schema = "job_tracker_schema")
public class ResumeTailoring {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  @Column(name = "job_listing_id")
  UUID jobListingId;

  @Column(name = "application_id")
  UUID applicationId;

  @Column(name = "original_variant_id")
  UUID originalVariantId;

  /** The tailored sections, same shape as {@code resume_sections.content} but one list per section. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "tailored_content")
  List<Map<String, Object>> tailoredContent;

  @Column(name = "tailoring_prompt")
  String tailoringPrompt;

  @Column(name = "pdf_file_key")
  String pdfFileKey;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;
}
