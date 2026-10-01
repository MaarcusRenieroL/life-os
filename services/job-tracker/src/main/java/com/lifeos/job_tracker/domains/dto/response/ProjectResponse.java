package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Project;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProjectResponse(
    UUID id,
    String name,
    String description,
    List<String> techStack,
    String link,
    LocalDate startDate,
    LocalDate endDate,
    List<String> bullets,
    int displayOrder) {

  public static ProjectResponse from(Project entity) {
    return new ProjectResponse(
        entity.getId(),
        entity.getName(),
        entity.getDescription(),
        entity.getTechStack(),
        entity.getLink(),
        entity.getStartDate(),
        entity.getEndDate(),
        entity.getBullets(),
        entity.getDisplayOrder());
  }
}
