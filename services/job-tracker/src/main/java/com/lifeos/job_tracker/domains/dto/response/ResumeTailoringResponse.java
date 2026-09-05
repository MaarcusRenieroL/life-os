package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.ResumeTailoring;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ResumeTailoringResponse(
    UUID id,
    UUID jobListingId,
    UUID applicationId,
    UUID originalVariantId,
    List<Map<String, Object>> tailoredContent,
    String tailoringPrompt,
    boolean pdfAvailable,
    Instant createdAt) {

  public static ResumeTailoringResponse from(ResumeTailoring tailoring) {
    return new ResumeTailoringResponse(
        tailoring.getId(),
        tailoring.getJobListingId(),
        tailoring.getApplicationId(),
        tailoring.getOriginalVariantId(),
        tailoring.getTailoredContent(),
        tailoring.getTailoringPrompt(),
        tailoring.getPdfFileKey() != null,
        tailoring.getCreatedAt());
  }
}
