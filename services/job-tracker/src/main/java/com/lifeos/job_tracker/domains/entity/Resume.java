package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.ProcessingStatus;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "resumes", schema = "job_tracker_schema")
public class Resume {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  @Column(name = "user_id")
  UUID userId;

  String label;

  @Column(name = "file_key")
  String fileKey;

  @Column(name = "file_name")
  String fileName;

  @Column(name = "file_size")
  long fileSize;

  @Column(name = "content_type")
  String contentType;

  @Enumerated(EnumType.STRING)
  @Column(name = "extraction_status")
  ProcessingStatus extractionStatus;

  @Column(name = "extraction_error")
  String extractionError;

  @Column(name = "raw_text")
  String rawText;

  /** Claude's structured extraction: contact block, work history, education, skills. */
  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "parsed_json")
  Map<String, Object> parsedJson;

  @Column(name = "is_base")
  boolean base;

  @Column(name = "tailored_for_application_id")
  UUID tailoredForApplicationId;

  /** The free-text instruction used when regenerating a tailored variant ("make it more technical"). */
  @Column(name = "source_instruction")
  String sourceInstruction;

  @CreationTimestamp
  @Column(name = "created_at")
  Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  Instant updatedAt;
}
