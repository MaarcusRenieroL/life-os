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
    boolean base,
    UUID tailoredForApplicationId,
    Map<String, Object> parsed,
    Instant createdAt,
    Instant updatedAt) {

  public static ResumeResponse from(Resume resume) {
    return new ResumeResponse(
        resume.getId(),
        resume.getLabel(),
        resume.getFileName(),
        resume.getFileSize(),
        resume.getExtractionStatus() == null ? null : resume.getExtractionStatus().name(),
        resume.getExtractionError(),
        resume.isBase(),
        resume.getTailoredForApplicationId(),
        resume.getParsedJson(),
        resume.getCreatedAt(),
        resume.getUpdatedAt());
  }

  public static ResumeResponse summary(Resume resume) {
    return new ResumeResponse(
        resume.getId(),
        resume.getLabel(),
        resume.getFileName(),
        resume.getFileSize(),
        resume.getExtractionStatus() == null ? null : resume.getExtractionStatus().name(),
        resume.getExtractionError(),
        resume.isBase(),
        resume.getTailoredForApplicationId(),
        null,
        resume.getCreatedAt(),
        resume.getUpdatedAt());
  }
}
