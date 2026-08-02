package com.lifeos.job_tracker.domains.entity;

import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "applications", schema = "jobs_schema")
public class Application {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  UUID id;

  UUID jobId;

  UUID userId;

  Instant applicationDate;

  String resumeVersion;

  String resumeS3Path;

  Instant resumeGenerationTimestamp;

  String resumeTailoringPrompt;

  String resumeTailoringReasoning;

  Boolean coverLetterSubmitted;

  String coverLetterS3Path;

  Integer aiScorePercentage;

  String aiScoreReasoning;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> aiRecommendedSections;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> aiInterviewPrepTopics;

  @JdbcTypeCode(SqlTypes.JSON)
  List<String> linkedNoteIds;

  @Enumerated(EnumType.STRING)
  ApplicationStage currentStage;

  String rejectionReason;

  Instant rejectionDate;

  String withdrawnReason;

  Instant withdrawnDate;

  @JdbcTypeCode(SqlTypes.JSON)
  Map<String, Object> offerDetails;

  Instant lastFollowUpDate;

  Instant nextFollowUpDate;

  @Enumerated(EnumType.STRING)
  ApplicationStatus status;

  String notes;

  @CreationTimestamp Instant createdAt;

  @UpdateTimestamp Instant updatedAt;
}
