package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.JobTailoringVersion;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JobTailoringVersionResponse(
    UUID id, int version, List<String> improvementPoints, String latexResume, Integer fitScore, Instant createdAt) {

  public static JobTailoringVersionResponse from(JobTailoringVersion entity) {
    return new JobTailoringVersionResponse(
        entity.getId(),
        entity.getVersion(),
        entity.getImprovementPoints(),
        entity.getLatexResume(),
        entity.getFitScore(),
        entity.getCreatedAt());
  }

  public static JobTailoringVersionResponse summary(JobTailoringVersion entity) {
    return new JobTailoringVersionResponse(
        entity.getId(), entity.getVersion(), null, null, entity.getFitScore(), entity.getCreatedAt());
  }
}
