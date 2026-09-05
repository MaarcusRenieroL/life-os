package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.CoverLetterVersion;
import java.time.Instant;
import java.util.UUID;

public record CoverLetterVersionResponse(UUID id, int version, String content, Instant createdAt) {

  public static CoverLetterVersionResponse from(CoverLetterVersion coverLetterVersion) {
    return new CoverLetterVersionResponse(
        coverLetterVersion.getId(),
        coverLetterVersion.getVersion(),
        coverLetterVersion.getContent(),
        coverLetterVersion.getCreatedAt());
  }
}
