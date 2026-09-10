package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Resume;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ResumeResponse(
    UUID id,
    String label,
    String fileName,
    long fileSize,
    String extractionStatus,
    String extractionError,
    Map<String, Object> parsed,
    Instant createdAt) {

  public static ResumeResponse from(Resume resume) {
    return new ResumeResponse(
        resume.getId(),
        resume.getLabel(),
        resume.getFileName(),
        resume.getFileSize(),
        resume.getExtractionStatus() == null ? null : resume.getExtractionStatus().name(),
        resume.getExtractionError(),
        resume.getParsedJson(),
        resume.getCreatedAt());
  }
}
