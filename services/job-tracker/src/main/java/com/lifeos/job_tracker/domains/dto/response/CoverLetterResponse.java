package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.CoverLetter;
import java.time.Instant;
import java.util.UUID;

public record CoverLetterResponse(
    UUID id,
    UUID applicationId,
    UUID jobListingId,
    UUID resumeVariantId,
    String generatedContent,
    String tone,
    String style,
    boolean customized,
    String templateUsed,
    int version,
    Instant createdAt,
    Instant updatedAt) {

  public static CoverLetterResponse from(CoverLetter coverLetter) {
    return new CoverLetterResponse(
        coverLetter.getId(),
        coverLetter.getApplicationId(),
        coverLetter.getJobListingId(),
        coverLetter.getResumeVariantId(),
        coverLetter.getGeneratedContent(),
        coverLetter.getTone() == null ? null : coverLetter.getTone().name(),
        coverLetter.getStyle() == null ? null : coverLetter.getStyle().name(),
        coverLetter.isCustomized(),
        coverLetter.getTemplateUsed(),
        coverLetter.getVersion(),
        coverLetter.getCreatedAt(),
        coverLetter.getUpdatedAt());
  }
}
