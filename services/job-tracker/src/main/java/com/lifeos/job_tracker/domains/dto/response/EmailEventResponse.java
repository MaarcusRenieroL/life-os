package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.EmailEvent;
import java.time.Instant;
import java.util.UUID;

public record EmailEventResponse(
    UUID id,
    String fromAddress,
    String subject,
    String snippet,
    String detectedType,
    String confidence,
    UUID matchedJobId,
    String matchedJobTitle,
    String matchedJobCompany,
    String suggestedStatus,
    int createdJobsCount,
    String status,
    Instant createdAt) {

  public static EmailEventResponse from(EmailEvent event, String matchedJobTitle, String matchedJobCompany) {
    return new EmailEventResponse(
        event.getId(),
        event.getFromAddress(),
        event.getSubject(),
        event.getSnippet(),
        event.getDetectedType() == null ? null : event.getDetectedType().name(),
        event.getConfidence() == null ? null : event.getConfidence().name(),
        event.getMatchedJobId(),
        matchedJobTitle,
        matchedJobCompany,
        event.getSuggestedStatus() == null ? null : event.getSuggestedStatus().name(),
        event.getCreatedJobsCount(),
        event.getStatus() == null ? null : event.getStatus().name(),
        event.getCreatedAt());
  }
}
