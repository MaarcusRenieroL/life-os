package com.lifeos.job_tracker.domains.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
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

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApplicationResponse {

  UUID id;

  UUID jobId;

  Instant applicationDate;

  String resumeVersion;

  String resumeS3Path;

  Instant resumeGenerationTimestamp;

  String resumeTailoringPrompt;

  String resumeTailoringReasoning;

  @JsonProperty("coverLetterSubmitted")
  boolean coverLetterSubmitted;

  String coverLetterS3Path;

  Integer aiScorePercentage;

  String aiScoreReasoning;

  List<String> aiRecommendedSections;

  List<String> aiInterviewPrepTopics;

  List<String> linkedNoteIds;

  ApplicationStage currentStage;

  String rejectionReason;

  Instant rejectionDate;

  String withdrawnReason;

  Instant withdrawnDate;

  Map<String, Object> offerDetails;

  Instant lastFollowUpDate;

  Instant nextFollowUpDate;

  ApplicationStatus status;

  String notes;

  Instant createdAt;

  Instant updatedAt;
}
