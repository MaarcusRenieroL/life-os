package com.lifeos.job_tracker.domains.dto.request;

import com.lifeos.job_tracker.domains.enums.ApplicationStage;
import com.lifeos.job_tracker.domains.enums.ApplicationStatus;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

// Covers pipeline-management fields only - AI score/reasoning and resume
// tailoring fields are set by the scoring/tailoring services directly, not
// through this generic update endpoint, so a caller can't silently
// overwrite AI-computed data with a stray PUT.
@Getter
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateApplicationRequest {

  ApplicationStage currentStage;

  ApplicationStatus status;

  Boolean coverLetterSubmitted;

  @Size(max = 500)
  String rejectionReason;

  Instant rejectionDate;

  @Size(max = 500)
  String withdrawnReason;

  Instant withdrawnDate;

  Instant lastFollowUpDate;

  Instant nextFollowUpDate;

  @Size(max = 2000)
  String notes;
}
