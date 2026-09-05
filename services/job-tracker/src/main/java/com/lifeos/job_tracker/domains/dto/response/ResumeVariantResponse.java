package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.ResumeVariant;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ResumeVariantResponse(
    UUID id,
    String name,
    String description,
    boolean base,
    boolean isPublic,
    String visibility,
    String stylingTemplate,
    String fontFamily,
    String accentColor,
    List<String> sectionOrder,
    UUID sourceResumeId,
    UUID sourceJobListingId,
    List<ResumeSectionResponse> sections,
    Instant createdAt,
    Instant updatedAt) {

  public static ResumeVariantResponse from(ResumeVariant variant) {
    return from(variant, null);
  }

  public static ResumeVariantResponse from(ResumeVariant variant, List<ResumeSectionResponse> sections) {
    return new ResumeVariantResponse(
        variant.getId(),
        variant.getName(),
        variant.getDescription(),
        variant.isBase(),
        variant.isPublic(),
        variant.getVisibility() == null ? null : variant.getVisibility().name(),
        variant.getStylingTemplate() == null ? null : variant.getStylingTemplate().name(),
        variant.getFontFamily(),
        variant.getAccentColor(),
        variant.getSectionOrder(),
        variant.getSourceResumeId(),
        variant.getSourceJobListingId(),
        sections,
        variant.getCreatedAt(),
        variant.getUpdatedAt());
  }
}
