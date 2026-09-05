package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.ResumeSection;
import java.util.List;
import java.util.UUID;

public record ResumeSectionResponse(
    UUID id, UUID resumeVariantId, String sectionType, String title, List<Object> content, int sortOrder, boolean hidden) {

  public static ResumeSectionResponse from(ResumeSection section) {
    return new ResumeSectionResponse(
        section.getId(),
        section.getResumeVariantId(),
        section.getSectionType() == null ? null : section.getSectionType().name(),
        section.getTitle(),
        section.getContent(),
        section.getSortOrder(),
        section.isHidden());
  }
}
