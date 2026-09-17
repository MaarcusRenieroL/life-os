package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.JobTailoringVersion;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JobTailoringVersionResponse(
    UUID id,
    int version,
    List<String> improvementPoints,
    List<String> gapsVsJd,
    List<String> inferredClaims,
    String latexResume,
    Integer fitScore,
    String basedOn,
    Instant createdAt) {

  public static JobTailoringVersionResponse from(JobTailoringVersion entity) {
    return new JobTailoringVersionResponse(
        entity.getId(),
        entity.getVersion(),
        entity.getImprovementPoints(),
        entity.getGapsVsJd(),
        entity.getInferredClaims(),
        entity.getLatexResume(),
        entity.getFitScore(),
        entity.getBasedOn() == null ? null : entity.getBasedOn().name(),
        entity.getCreatedAt());
  }

  public static JobTailoringVersionResponse summary(JobTailoringVersion entity) {
    return new JobTailoringVersionResponse(
        entity.getId(),
        entity.getVersion(),
        null,
        null,
        null,
        null,
        entity.getFitScore(),
        entity.getBasedOn() == null ? null : entity.getBasedOn().name(),
        entity.getCreatedAt());
  }
}
