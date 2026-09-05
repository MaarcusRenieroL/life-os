package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.CoverLetterTemplate;
import java.util.Map;
import java.util.UUID;

public record CoverLetterTemplateResponse(
    UUID id,
    String name,
    String description,
    Map<String, Object> contentStructure,
    String tone,
    String style,
    boolean isPublic,
    boolean system) {

  public static CoverLetterTemplateResponse from(CoverLetterTemplate template) {
    return new CoverLetterTemplateResponse(
        template.getId(),
        template.getName(),
        template.getDescription(),
        template.getContentStructure(),
        template.getTone() == null ? null : template.getTone().name(),
        template.getStyle() == null ? null : template.getStyle().name(),
        template.isPublic(),
        template.isSystem());
  }
}
