package com.lifeos.job_tracker.domains.dto.response;

import com.lifeos.job_tracker.domains.entity.Accomplishment;
import java.util.List;
import java.util.UUID;

public record AccomplishmentResponse(
    UUID id, String category, String bulletText, List<String> keywords, int usageCount) {

  public static AccomplishmentResponse from(Accomplishment accomplishment) {
    return new AccomplishmentResponse(
        accomplishment.getId(),
        accomplishment.getCategory(),
        accomplishment.getBulletText(),
        accomplishment.getKeywords(),
        accomplishment.getUsageCount());
  }
}
