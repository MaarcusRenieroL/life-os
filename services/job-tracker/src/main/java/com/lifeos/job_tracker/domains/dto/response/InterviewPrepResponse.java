package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.InterviewPrep;
import java.util.UUID;

public record InterviewPrepResponse(
    UUID id, UUID interviewRoundId, String title, String description, String resourceLink, boolean completed) {

  public static InterviewPrepResponse from(InterviewPrep prep) {
    return new InterviewPrepResponse(
        prep.getId(),
        prep.getInterviewRoundId(),
        prep.getTitle(),
        prep.getDescription(),
        prep.getResourceLink(),
        prep.isCompleted());
  }
}
