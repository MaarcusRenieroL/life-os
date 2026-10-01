package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.WorkExperience;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record WorkExperienceResponse(
    UUID id,
    String title,
    String company,
    String location,
    LocalDate startDate,
    LocalDate endDate,
    boolean current,
    List<String> bullets,
    int displayOrder) {

  public static WorkExperienceResponse from(WorkExperience entity) {
    return new WorkExperienceResponse(
        entity.getId(),
        entity.getTitle(),
        entity.getCompany(),
        entity.getLocation(),
        entity.getStartDate(),
        entity.getEndDate(),
        entity.isCurrent(),
        entity.getBullets(),
        entity.getDisplayOrder());
  }
}
