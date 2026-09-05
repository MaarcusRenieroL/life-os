package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.ResumeTemplate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ResumeTemplateResponse(
    UUID id, String name, String description, Map<String, Object> stylingConfig, List<String> sectionLayout) {

  public static ResumeTemplateResponse from(ResumeTemplate template) {
    return new ResumeTemplateResponse(
        template.getId(),
        template.getName(),
        template.getDescription(),
        template.getStylingConfig(),
        template.getSectionLayout());
  }
}
